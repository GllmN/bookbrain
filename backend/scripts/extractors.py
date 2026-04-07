"""
BookBrain — Text extractors for PDF and EPUB files.
"""

from pathlib import Path
from dataclasses import dataclass

import fitz  # pymupdf
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup


@dataclass
class ExtractedChapter:
    title: str
    content: str
    page: int | None = None


def extract_pdf(file_path: Path) -> list[ExtractedChapter]:
    """Extract text from a PDF, grouped by bookmarks/chapters if available."""
    doc = fitz.open(str(file_path))
    toc = doc.get_toc()  # [[level, title, page], ...]

    if toc:
        # Group pages by chapter
        chapters: list[ExtractedChapter] = []
        for i, (level, title, page) in enumerate(toc):
            if level > 2:
                continue
            start = page - 1  # 0-indexed
            end = (toc[i + 1][2] - 1) if i + 1 < len(toc) else len(doc)
            text = ""
            for p in range(start, min(end, len(doc))):
                text += doc[p].get_text()
            if text.strip():
                chapters.append(ExtractedChapter(title=title, content=text.strip(), page=page))
        if chapters:
            doc.close()
            return chapters
        # TOC present but no text extracted — fall through to flat extraction

    result = _extract_pdf_flat(doc, file_path)
    doc.close()
    return result


def _extract_pdf_flat(doc: fitz.Document, file_path: Path) -> list[ExtractedChapter]:
    """Fallback: extract all text as a single chapter."""
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    return [ExtractedChapter(
        title=file_path.stem,
        content=full_text.strip(),
        page=1,
    )]


def extract_epub(file_path: Path) -> list[ExtractedChapter]:
    """Extract text from an EPUB, one chapter per document item."""
    book = epub.read_epub(str(file_path), options={"ignore_ncx": True})
    chapters: list[ExtractedChapter] = []

    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), "lxml")

        # Try to find a heading for the chapter title
        heading = soup.find(["h1", "h2", "h3"])
        title = heading.get_text(strip=True) if heading else item.get_name()

        text = soup.get_text(separator="\n", strip=True)
        if len(text) > 50:  # skip near-empty chapters
            chapters.append(ExtractedChapter(title=title, content=text))

    return chapters


def extract_file(file_path: Path) -> list[ExtractedChapter]:
    """Auto-detect format and extract."""
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return extract_pdf(file_path)
    elif suffix == ".epub":
        return extract_epub(file_path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")
