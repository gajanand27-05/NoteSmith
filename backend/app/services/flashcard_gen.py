import re
from pathlib import Path

from app.core.llm import llm
from app.core.pdf_processor import PDFProcessor
from app.db import database

FLASHCARD_PATTERN = re.compile(
    r"F(\d+)\.\s*(.+?)\s*\nB\1\.\s*(.+?)(?=\n\s*F\d+\.|$)",
    re.DOTALL,
)

MAX_TEXT_CHARS = 12000


def parse_flashcards(text: str) -> list[dict]:
    haystack = text + "\nF0."
    matches = FLASHCARD_PATTERN.findall(haystack)
    out: list[dict] = []
    for num, front, back in matches:
        n = int(num)
        if n == 0:
            continue
        out.append(
            {
                "number": n,
                "front": front.strip(),
                "back": back.strip(),
                "topic": "",
            }
        )
    return out


def build_prompt(text: str, count: int, topic: str | None) -> str:
    topic_clause = (
        f" Focus all cards on the topic: {topic}." if topic else ""
    )
    return (
        f"You are creating study flashcards for an exam. From the notes below, "
        f"extract exactly {count} of the most important terms, concepts, definitions, "
        f"or facts that a student should memorize.{topic_clause}\n\n"
        f"For each card:\n"
        f"- Front: a short question, term, or prompt (5-15 words)\n"
        f"- Back: a clear definition, explanation, or fact (1-3 sentences, 20-60 words)\n\n"
        f"Format each card EXACTLY as:\n"
        f"F1. <front text>\n"
        f"B1. <back text>\n"
        f"F2. <front text>\n"
        f"B2. <back text>\n"
        f"...and so on for all {count} cards.\n\n"
        f"Cards should cover diverse material, not repeat the same fact. "
        f"Use information that is present in the notes. Do not invent facts. "
        f"If the notes are insufficient for the full count, write as many as you can.\n\n"
        f"NOTES:\n{text}\n\n"
        f"FLASHCARDS:\n"
    )


def generate(
    pdf_id: str, count: int, topic: str | None = None
) -> tuple[list[dict], str]:
    row = database.get_pdf(pdf_id)
    if not row:
        raise FileNotFoundError(f"PDF {pdf_id} not found")

    text = PDFProcessor.extract_text(Path(row["stored_path"]))
    if not text.strip():
        raise ValueError("PDF contains no extractable text")

    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS] + "\n\n[...truncated for length...]"

    prompt = build_prompt(text, count, topic)
    raw = llm.generate_text(prompt)
    cards = parse_flashcards(raw)
    return cards, raw
