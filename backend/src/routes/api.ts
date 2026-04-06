import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { searchChunks, deleteBookChunks, getCollectionStats } from "../services/vectorStore.js";
import { generateAnswer } from "../services/llm.js";
import { getAllBooks, getBookById, deleteBook } from "../services/database.js";
import { runIngestion, getIngestStatus } from "../services/ingest.js";
import { AppError } from "../utils/errors.js";
import type { ApiResponse } from "../models/types.js";

export const router = Router();

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

// ── Ask (RAG Q&A) ────────────────────────────────

const askSchema = z.object({
  question: z.string().min(1).max(2000),
  bookIds: z.array(z.string()).optional(),
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

  const { question, bookIds, history } = parsed.data;

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
  const { answer, model } = await generateAnswer(question, sources, history);

  res.json({
    success: true,
    data: { answer, sources, model },
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
