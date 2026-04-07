"""
BookBrain — Embedding generation via Ollama (nomic-embed-text).

Uses /api/embed (Ollama ≥ 0.1.31) which accepts a batch of texts in one request,
instead of calling /api/embeddings once per text.
"""

import os
import requests

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = "nomic-embed-text"


def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Generate embeddings for a list of texts using Ollama (batched)."""
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = requests.post(
            f"{OLLAMA_URL}/api/embed",
            json={"model": MODEL_NAME, "input": batch},
            timeout=120,
        )
        response.raise_for_status()
        embeddings.extend(response.json()["embeddings"])
    return embeddings
