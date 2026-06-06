from pathlib import Path

from app.core.chunker import chunk_text
from app.core.llm import llm
from app.core.pdf_processor import PDFProcessor
from app.db import database

LENGTH_TARGETS = {
    "short": 250,
    "medium": 700,
    "long": 1500,
}

MAP_CHUNK_SIZE = 3000
MAP_CHUNK_OVERLAP = 200


def _summarize_chunk(text: str, target_words: int) -> str:
    prompt = (
        f"Summarize the following study notes into roughly {target_words} words. "
        "Use clear bullet points. Cover all key concepts, definitions, and important details. "
        "Preserve technical terms, formulas, and named algorithms. "
        "Do not add information that is not in the notes.\n\n"
        f"NOTES:\n{text}\n\n"
        "SUMMARY:"
    )
    return llm.generate_text(prompt)


def _combine_summaries(partials: list[str], target_words: int) -> str:
    combined = "\n\n".join(partials)
    prompt = (
        f"Combine the following partial summaries into a single coherent summary of "
        f"approximately {target_words} words. Use clear bullet points grouped by topic. "
        "Remove duplicates. Preserve all key terms and definitions.\n\n"
        f"PARTIAL SUMMARIES:\n{combined}\n\n"
        "FINAL SUMMARY:"
    )
    return llm.generate_text(prompt)


def summarize_pdf(pdf_id: str, length: str) -> str:
    target = LENGTH_TARGETS.get(length, LENGTH_TARGETS["medium"])

    row = database.get_pdf(pdf_id)
    if not row:
        raise FileNotFoundError(f"PDF {pdf_id} not found")

    text = PDFProcessor.extract_text(Path(row["stored_path"]))
    if not text.strip():
        return "No extractable text in this PDF."

    if len(text) <= MAP_CHUNK_SIZE:
        return _summarize_chunk(text, target)

    chunks = chunk_text(text, chunk_size=MAP_CHUNK_SIZE, overlap=MAP_CHUNK_OVERLAP)
    if not chunks:
        return "Could not chunk the document."

    per_chunk = max(target // max(len(chunks), 1) + 50, 100)
    partials = [_summarize_chunk(c, per_chunk) for c in chunks]
    return _combine_summaries(partials, target)
