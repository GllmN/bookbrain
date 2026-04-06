import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  chroma: {
    host: process.env.CHROMA_HOST || "localhost",
    port: parseInt(process.env.CHROMA_PORT || "8000", 10),
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "mistral",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  },
  llmProvider: (process.env.LLM_PROVIDER || "ollama") as "ollama" | "anthropic",
  libraryPath: path.resolve(__dirname, "../../", process.env.LIBRARY_PATH || "../library"),
  sqlitePath: path.resolve(__dirname, "../", process.env.SQLITE_PATH || "./bookbrain.db"),
} as const;
