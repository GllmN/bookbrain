import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { router } from "./routes/api.js";
import { AppError } from "./utils/errors.js";

const app = express();

// ── Middleware ─────────────────────────────────────
app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json({ limit: "10mb" }));

// ── Routes ────────────────────────────────────────
app.use("/api", router);

// ── Health ────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", provider: config.llmProvider });
});

// ── Error handler ─────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  const status = err instanceof AppError ? err.statusCode : 500;
  res.status(status).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// ── Start ─────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\n🧠 BookBrain API running on http://localhost:${config.port}`);
  console.log(`   LLM provider: ${config.llmProvider}`);
  console.log(`   Library path: ${config.libraryPath}\n`);
});
