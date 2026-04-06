import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config/index.js";
import type { IngestStatus } from "../models/types.js";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, "../../scripts");

let currentStatus: IngestStatus | null = null;

export function getIngestStatus(): IngestStatus | null {
  return currentStatus;
}

export async function runIngestion(force: boolean = false): Promise<IngestStatus> {
  currentStatus = { total: 0, processed: 0, failed: 0, errors: [] };

  const forceFlag = force ? "--force" : "";
  const cmd = `python3 ${path.join(SCRIPTS_DIR, "ingest.py")} --input "${config.libraryPath}" ${forceFlag} --json`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 600_000, // 10 min max
      cwd: SCRIPTS_DIR,
    });

    if (stderr) console.warn("[ingest] stderr:", stderr);

    // Parse JSON output from Python script
    const result = JSON.parse(stdout.trim());
    currentStatus = {
      total: result.total ?? 0,
      processed: result.processed ?? 0,
      failed: result.failed ?? 0,
      errors: result.errors ?? [],
    };
  } catch (err: any) {
    currentStatus.failed++;
    currentStatus.errors.push({
      file: "pipeline",
      error: err.message ?? "Unknown error",
    });
  }

  return currentStatus;
}
