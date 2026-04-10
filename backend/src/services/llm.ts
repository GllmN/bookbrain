import { config } from "../config/index.js";
import type { SearchResult } from "../models/types.js";

const CLAUDE_MODEL = "claude-sonnet-4-6";

interface LLMResponse {
  answer: string;
  model: string;
}

// ── Prompt builders ───────────────────────────────

function buildContext(context: SearchResult[]): string {
  return context
    .map((r, i) => `[Source ${i + 1}: "${r.bookTitle}" by ${r.author}${r.chapter ? `, ${r.chapter}` : ""}]\n${r.content}`)
    .join("\n\n---\n\n");
}

function buildPrompts(question: string, context: SearchResult[]): { system: string; user: string } {
  return {
    system: `Tu es BookBrain, un assistant expert qui répond aux questions en se basant UNIQUEMENT sur les extraits de livres fournis.

Règles:
- Réponds en te basant sur le contexte fourni
- Cite tes sources avec [Source N]
- Si le contexte ne contient pas la réponse, dis-le clairement
- Réponds dans la langue de la question
- Sois précis et concis`,
    user: `Contexte (extraits de livres):\n${buildContext(context)}\n\nQuestion: ${question}`,
  };
}

// ── Non-streaming ─────────────────────────────────

export async function generateAnswer(
  question: string,
  context: SearchResult[],
  history: { role: "user" | "assistant"; content: string }[] = [],
  model?: string
): Promise<LLMResponse> {
  const { system, user } = buildPrompts(question, context);
  const useAnthropic = model ? model.startsWith("claude-") : config.llmProvider === "anthropic";
  if (useAnthropic) return callClaude(system, user, history, model);
  return callOllama(system, user, history, model);
}

async function callOllama(
  system: string,
  prompt: string,
  history: { role: string; content: string }[],
  model?: string
): Promise<LLMResponse> {
  const resolvedModel = model ?? config.ollama.model;
  const messages = [{ role: "system", content: system }, ...history, { role: "user", content: prompt }];

  const res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: resolvedModel, messages, stream: false }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
  const data = (await res.json()) as any;
  return { answer: data.message?.content ?? "", model: resolvedModel };
}

async function callClaude(
  system: string,
  prompt: string,
  history: { role: string; content: string }[],
  model?: string
): Promise<LLMResponse> {
  const resolvedModel = model ?? CLAUDE_MODEL;
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: resolvedModel, max_tokens: 2048, system, messages }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.statusText}`);
  const data = (await res.json()) as any;
  return { answer: data.content?.[0]?.text ?? "", model: resolvedModel };
}

// ── Streaming ─────────────────────────────────────

export async function* streamAnswer(
  question: string,
  context: SearchResult[],
  history: { role: "user" | "assistant"; content: string }[] = [],
  model?: string
): AsyncGenerator<string> {
  const { system, user } = buildPrompts(question, context);
  const useAnthropic = model ? model.startsWith("claude-") : config.llmProvider === "anthropic";
  if (useAnthropic) {
    yield* streamClaude(system, user, history, model);
  } else {
    yield* streamOllama(system, user, history, model);
  }
}

async function* streamOllama(
  system: string,
  prompt: string,
  history: { role: string; content: string }[],
  model?: string
): AsyncGenerator<string> {
  const resolvedModel = model ?? config.ollama.model;
  const messages = [{ role: "system", content: system }, ...history, { role: "user", content: prompt }];

  const res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: resolvedModel, messages, stream: true }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Ollama error ${res.status}: ${errBody}`);
  }

  if (!res.body) throw new Error("Ollama response has no body");

  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (!data.done && data.message?.content) {
          yield data.message.content as string;
        }
      } catch {
        // ignore malformed line
      }
    }
  }
}

async function* streamClaude(
  system: string,
  prompt: string,
  history: { role: string; content: string }[],
  model?: string
): AsyncGenerator<string> {
  const resolvedModel = model ?? CLAUDE_MODEL;
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: prompt },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: resolvedModel, max_tokens: 2048, system, messages, stream: true }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.statusText}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          yield parsed.delta.text as string;
        }
      } catch {
        // ignore malformed SSE line
      }
    }
  }
}
