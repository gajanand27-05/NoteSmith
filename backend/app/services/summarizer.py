import logging
from pathlib import Path

from app.core.chunker import chunk_text
from app.core.llm import llm
from app.core.pdf_processor import PDFProcessor
from app.db import database

logger = logging.getLogger(__name__)

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
    try:
        return llm.generate_text(prompt)
    except Exception as e:
        logger.error("LLM generate_text failed: %s", e, exc_info=True)
        raise


def _combine_summaries(partials: list[str], target_words: int) -> str:
    combined = "\n\n".join(partials)
    prompt = (
        f"Combine the following partial summaries into a single coherent summary of "
        f"approximately {target_words} words. Use clear bullet points grouped by topic. "
        "Remove duplicates. Preserve all key terms and definitions.\n\n"
        f"PARTIAL SUMMARIES:\n{combined}\n\n"
        "FINAL SUMMARY:"
    )
    try:
        return llm.generate_text(prompt)
    except Exception as e:
        logger.error("Combining summaries failed: %s", e, exc_info=True)
        raise


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

    logger.info("Summarizing PDF %s in %d chunks using %s...", pdf_id, len(chunks), llm.chat_model)
    per_chunk = max(target // max(len(chunks), 1) + 50, 100)
    partials = []
    for i, c in enumerate(chunks, 1):
        logger.info("  -> Processing chunk %d/%d...", i, len(chunks))
        try:
            partials.append(_summarize_chunk(c, per_chunk))
        except Exception as e:
            logger.error("Chunk %d/%d failed: %s", i, len(chunks), e)
            raise
        
    logger.info("Combining %d partial summaries into final result...", len(chunks))
    return _combine_summaries(partials, target)
