import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config/index.js";
import type { IngestStatus } from "../models/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, "../../scripts");

const idle: IngestStatus = { running: false, total: 0, processed: 0, skipped: 0, failed: 0, errors: [] };
let currentStatus: IngestStatus = { ...idle };

export function getIngestStatus(): IngestStatus {
  return currentStatus;
}

export function runIngestion(force: boolean = false): Promise<IngestStatus> {
  // Prevent concurrent runs
  if (currentStatus.running) return Promise.resolve(currentStatus);

  currentStatus = { running: true, total: 0, processed: 0, skipped: 0, failed: 0, errors: [] };

  return new Promise((resolve) => {
    const args = [
      path.join(SCRIPTS_DIR, "ingest.py"),
      "--input", config.libraryPath,
      "--db", config.sqlitePath,
      "--json",
      "--stream",
      ...(force ? ["--force"] : []),
    ];

    const child = spawn("python3", args, { cwd: SCRIPTS_DIR });

    let buffer = "";

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";   // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);

          if (msg.type === "start") {
            currentStatus.total = msg.total ?? 0;

          } else if (msg.type === "progress") {
            currentStatus.currentFile = msg.file;
            if (msg.status === "ok")      currentStatus.processed++;
            else if (msg.status === "skipped") currentStatus.skipped++;
            else if (msg.status === "failed") {
              currentStatus.failed++;
              currentStatus.errors.push({ file: msg.file, error: msg.error ?? "unknown" });
            }

          } else if (msg.type === "done") {
            currentStatus.running = false;
            currentStatus.currentFile = undefined;
          }
        } catch {
          // Non-JSON line (rich console output) — ignore
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      console.warn("[ingest] stderr:", chunk.toString());
    });

    child.on("close", () => {
      currentStatus.running = false;
      currentStatus.currentFile = undefined;
      resolve(currentStatus);
    });

    child.on("error", (err) => {
      currentStatus.running = false;
      currentStatus.failed++;
      currentStatus.errors.push({ file: "pipeline", error: err.message });
      resolve(currentStatus);
    });
  });
}
