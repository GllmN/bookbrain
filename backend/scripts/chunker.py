"""
BookBrain — Text chunking with token-aware splitting.
"""

from dataclasses import dataclass
from langchain_text_splitters import RecursiveCharacterTextSplitter
import tiktoken


@dataclass
class Chunk:
    text: str
    chapter: str
    chunk_index: int
    page: int | None = None


def chunk_chapters(
    chapters: list,  # list[ExtractedChapter]
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> list[Chunk]:
    """Split chapters into token-aware chunks."""
    tokenizer = tiktoken.get_encoding("cl100k_base")

    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        encoding_name="cl100k_base",
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    all_chunks: list[Chunk] = []
    idx = 0

    for chapter in chapters:
        texts = splitter.split_text(chapter.content)
        for text in texts:
            all_chunks.append(Chunk(
                text=text,
                chapter=chapter.title,
                chunk_index=idx,
                page=chapter.page,
            ))
            idx += 1

    return all_chunks
