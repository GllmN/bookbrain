import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";
import { searchChunks, deleteBookChunks, getCollectionStats } from "../services/vectorStore.js";
import { generateAnswer, streamAnswer } from "../services/llm.js";
import { config } from "../config/index.js";
import {
  getAllBooks, getBookById, deleteBook,
  getAllSessions, getSessionById, insertSession, updateSession, deleteSession, clearAllSessions,
} from "../services/database.js";
import { runIngestion, getIngestStatus } from "../services/ingest.js";
import { AppError } from "../utils/errors.js";
import type { ApiResponse, HistorySession } from "../models/types.js";

export const router = Router();

// ── Multer — upload vers library/ ─────────────────
const bookUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(config.libraryPath, { recursive: true });
      cb(null, config.libraryPath);
    },
    filename: (_req, file, cb) => {
      // Browsers encode filenames in latin1; decode to UTF-8
      const name = Buffer.from(file.originalname, "latin1").toString("utf8");
      cb(null, name);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".epub" || ext === ".pdf") cb(null, true);
    else cb(new Error(`Type de fichier non supporté : ${ext}`));
  },
  limits: { fileSize: 300 * 1024 * 1024, files: 100 }, // 300 MB / fichier, 100 fichiers max
});

// Wraps async route handlers so Express 4 catches rejections
const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

// ── Books ─────────────────────────────────────────

router.get("/books", wrap(async (_req, res) => {
  const books = getAllBooks();
  const stats = await getCollectionStats();
  res.json({ success: true, data: { books, totalChunks: stats.count } } satisfies ApiResponse);
}));

router.get("/books/:id", wrap(async (req, res) => {
  const book = getBookById(req.params.id);
  if (!book) {
    res.status(404).json({ success: false, error: "Book not found" } satisfies ApiResponse);
    return;
  }
  res.json({ success: true, data: book } satisfies ApiResponse);
}));

router.delete("/books/:id", wrap(async (req, res) => {
  const book = getBookById(req.params.id);
  if (!book) {
    res.status(404).json({ success: false, error: "Book not found" } satisfies ApiResponse);
    return;
  }
  await deleteBookChunks(book.id);
  deleteBook(book.id);
  res.json({ success: true, data: { deleted: book.id } } satisfies ApiResponse);
}));

// ── Search ────────────────────────────────────────

const searchSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(50).optional().default(10),
  bookIds: z.array(z.string()).optional(),
});

router.post("/search", wrap(async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }

  const start = Date.now();
  const { query, limit, bookIds } = parsed.data;
  const results = await searchChunks(query, limit, bookIds);

  res.json({
    success: true,
    data: { results, query, took: Date.now() - start },
  } satisfies ApiResponse);
}));

// ── Models ────────────────────────────────────────

router.get("/models", wrap(async (_req, res) => {
  const models: { id: string; name: string; provider: "ollama" | "anthropic" }[] = [];

  try {
    const r = await fetch(`${config.ollama.baseUrl}/api/tags`);
    if (r.ok) {
      const data = (await r.json()) as { models: { name: string }[] };
      for (const m of data.models ?? []) {
        if (!m.name.includes("embed")) {
          models.push({ id: m.name, name: m.name, provider: "ollama" });
        }
      }
    }
  } catch { /* Ollama unreachable */ }

  if (config.anthropic.apiKey) {
    models.push({ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic" });
  }

  const current = config.llmProvider === "anthropic" ? "claude-sonnet-4-6" : config.ollama.model;
  res.json({ success: true, data: { models, current } } satisfies ApiResponse);
}));

// ── Ask (RAG Q&A) ────────────────────────────────

const askSchema = z.object({
  question: z.string().min(1).max(2000),
  bookIds: z.array(z.string()).optional(),
  model: z.string().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional()
    .default([]),
});

router.post("/ask", wrap(async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }

  const { question, bookIds, history, model: requestedModel } = parsed.data;

  // 1. Retrieve relevant chunks
  const sources = await searchChunks(question, 8, bookIds);
  if (sources.length === 0) {
    res.json({
      success: true,
      data: {
        answer: "Je n'ai trouvé aucun passage pertinent dans tes livres pour cette question.",
        sources: [],
        model: "none",
      },
    } satisfies ApiResponse);
    return;
  }

  // 2. Generate answer with LLM
  const { answer, model } = await generateAnswer(question, sources, history, requestedModel);

  res.json({
    success: true,
    data: { answer, sources, model },
  } satisfies ApiResponse);
}));

// ── Ask streaming (SSE) ───────────────────────────

router.post("/ask/stream", async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let cancelled = false;
  res.on("close", () => { cancelled = true; });

  try {
    const { question, bookIds, history, model: requestedModel } = parsed.data;
    const sources = await searchChunks(question, 8, bookIds);

    if (sources.length === 0) {
      send({ type: "done", answer: "Je n'ai trouvé aucun passage pertinent dans tes livres pour cette question.", sources: [], model: "none" });
    } else {
      send({ type: "sources", sources });

      for await (const token of streamAnswer(question, sources, history, requestedModel)) {
        if (cancelled) break;
        send({ type: "token", content: token });
      }

      if (!cancelled) {
        const model = requestedModel ?? (config.llmProvider === "anthropic" ? "claude-sonnet-4-6" : config.ollama.model);
        send({ type: "done", model });
      }
    }
  } catch (err: any) {
    send({ type: "error", message: err.message ?? "Streaming error" });
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

// ── History ───────────────────────────────────────

const createSessionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["ask", "search"]),
  title: z.string().min(1).max(200),
  createdAt: z.string(),
});

const patchSessionSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    sources: z.array(z.any()).optional(),
    timestamp: z.string(),
  })).optional(),
  searchResults: z.array(z.any()).optional(),
  searchTook: z.number().optional(),
});

router.get("/history", wrap(async (_req, res) => {
  const sessions = getAllSessions();
  res.json({ success: true, data: { sessions } } satisfies ApiResponse);
}));

router.post("/history", wrap(async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }
  const session: HistorySession = { ...parsed.data, messages: parsed.data.type === "ask" ? [] : undefined };
  insertSession(session);
  res.status(201).json({ success: true, data: session } satisfies ApiResponse);
}));

router.patch("/history/:id", wrap(async (req, res) => {
  const session = getSessionById(req.params.id);
  if (!session) {
    res.status(404).json({ success: false, error: "Session not found" } satisfies ApiResponse);
    return;
  }
  const parsed = patchSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message } satisfies ApiResponse);
    return;
  }
  updateSession(req.params.id, parsed.data);
  res.json({ success: true, data: { updated: req.params.id } } satisfies ApiResponse);
}));

router.delete("/history/:id", wrap(async (req, res) => {
  const deleted = deleteSession(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: "Session not found" } satisfies ApiResponse);
    return;
  }
  res.json({ success: true, data: { deleted: req.params.id } } satisfies ApiResponse);
}));

router.delete("/history", wrap(async (_req, res) => {
  clearAllSessions();
  res.json({ success: true, data: { cleared: true } } satisfies ApiResponse);
}));

// ── Upload books ──────────────────────────────────

router.post("/books/upload", bookUpload.array("files", 100), wrap(async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) {
    res.status(400).json({ success: false, error: "Aucun fichier reçu" } satisfies ApiResponse);
    return;
  }
  // Trigger ingestion on new files only (force=false skips already-indexed books)
  runIngestion(false).catch(console.error);
  res.json({
    success: true,
    data: {
      uploaded: files.length,
      files: files.map(f => Buffer.from(f.originalname, "latin1").toString("utf8")),
    },
  } satisfies ApiResponse);
}));

// ── Ingest ────────────────────────────────────────

router.post("/ingest", wrap(async (req, res) => {
  const force = req.body?.force === true;
  // Run async — return immediately
  runIngestion(force).catch(console.error);
  res.json({ success: true, data: { message: "Ingestion started" } } satisfies ApiResponse);
}));

router.get("/ingest/status", (_req, res) => {
  const status = getIngestStatus();
  res.json({ success: true, data: status } satisfies ApiResponse);
});
