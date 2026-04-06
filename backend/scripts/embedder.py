"""
BookBrain — Embedding generation via Ollama (nomic-embed-text v2).
"""

import os
import requests

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = "nomic-embed-text"


def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Generate embeddings for a list of texts using Ollama."""
    embeddings = []
    for text in texts:
        response = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": MODEL_NAME, "prompt": text},
            timeout=30,
        )
        response.raise_for_status()
        embeddings.append(response.json()["embedding"])
    return embeddings
