import { config } from "../config/index.js";
import type { SearchResult } from "../models/types.js";

interface LLMResponse {
  answer: string;
  model: string;
}

export async function generateAnswer(
  question: string,
  context: SearchResult[],
  history: { role: "user" | "assistant"; content: string }[] = []
): Promise<LLMResponse> {
  const contextText = context
    .map((r, i) => `[Source ${i + 1}: "${r.bookTitle}" by ${r.author}${r.chapter ? `, ${r.chapter}` : ""}]\n${r.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `Tu es BookBrain, un assistant expert qui répond aux questions en se basant UNIQUEMENT sur les extraits de livres fournis.

Règles:
- Réponds en te basant sur le contexte fourni
- Cite tes sources avec [Source N]
- Si le contexte ne contient pas la réponse, dis-le clairement
- Réponds dans la langue de la question
- Sois précis et concis`;

  const userPrompt = `Contexte (extraits de livres):
${contextText}

Question: ${question}`;

  if (config.llmProvider === "anthropic") {
    return callClaude(systemPrompt, userPrompt, history);
  }
  return callOllama(systemPrompt, userPrompt, history);
}

async function callOllama(
  system: string,
  prompt: string,
  history: { role: string; content: string }[]
): Promise<LLMResponse> {
  const messages = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: prompt },
  ];

  const res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollama.model,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
  const data = (await res.json()) as any;

  return {
    answer: data.message?.content ?? "",
    model: config.ollama.model,
  };
}

async function callClaude(
  system: string,
  prompt: string,
  history: { role: string; content: string }[]
): Promise<LLMResponse> {
  const model = "claude-sonnet-4-20250514";

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
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system,
      messages,
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.statusText}`);
  const data = (await res.json()) as any;

  return {
    answer: data.content?.[0]?.text ?? "",
    model,
  };
}
