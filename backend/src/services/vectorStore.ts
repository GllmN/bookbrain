import { ChromaClient, type EmbeddingFunction } from "chromadb";
import { config } from "../config/index.js";
import type { SearchResult } from "../models/types.js";

const COLLECTION_NAME = "bookbrain_chunks";
const EMBED_MODEL = "nomic-embed-text";

// Stub: ChromaDB requires an EmbeddingFunction even when we always pass
// pre-computed embeddings via queryEmbeddings. This stub is never actually called.
const noopEmbedder: EmbeddingFunction = {
  generate: (_texts: string[]): Promise<number[][]> =>
    Promise.reject(new Error("noopEmbedder.generate should never be called")),
};

let client: ChromaClient;

function getClient(): ChromaClient {
  if (!client) {
    client = new ChromaClient({
      host: config.chroma.host,
      port: config.chroma.port,
    });
  }
  return client;
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${config.ollama.baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!response.ok) throw new Error(`Ollama embed failed: ${response.statusText}`);
  const data = (await response.json()) as { embedding: number[] };
  return data.embedding;
}

export async function searchChunks(
  queryText: string,
  limit: number = 10,
  bookIds?: string[]
): Promise<SearchResult[]> {
  const chroma = getClient();
  const collection = await chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: noopEmbedder,
  });

  const queryEmbedding = await getEmbedding(queryText);
  const whereFilter = bookIds?.length ? { book_id: { $in: bookIds } } : undefined;

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: limit,
    where: whereFilter as any,
  });

  if (!results.ids[0]) return [];

  return results.ids[0].map((id, i) => ({
    chunkId: id,
    bookId: (results.metadatas[0][i] as any)?.book_id ?? "",
    bookTitle: (results.metadatas[0][i] as any)?.book_title ?? "",
    author: (results.metadatas[0][i] as any)?.author ?? "",
    chapter: (results.metadatas[0][i] as any)?.chapter,
    content: results.documents[0][i] ?? "",
    score: results.distances ? 1 - (results.distances[0][i] ?? 0) : 0,
    page: (results.metadatas[0][i] as any)?.page,
  }));
}

export async function deleteBookChunks(bookId: string): Promise<void> {
  const chroma = getClient();
  const collection = await chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: noopEmbedder,
  });
  await collection.delete({ where: { book_id: bookId } as any });
}

export async function getCollectionStats(): Promise<{ count: number }> {
  try {
    const chroma = getClient();
    const collection = await chroma.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: noopEmbedder,
    });
    return { count: await collection.count() };
  } catch {
    return { count: 0 };
  }
}
