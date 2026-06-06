import re
from pathlib import Path

from app.core.llm import llm
from app.core.pdf_processor import PDFProcessor
from app.db import database

QUESTION_PATTERN = re.compile(
    r"Q(\d+)\.\s*(.+?)\s*\nA\1\.\s*(.+?)(?=\n\s*Q\d+\.|$)",
    re.DOTALL,
)

MARK_INSTRUCTIONS = {
    2: (
        "2-mark questions: short, definitional. "
        "Phrases like 'Define X', 'What is Y', 'List the types of Z'. "
        "Answers should be 30-50 words."
    ),
    5: (
        "5-mark questions: explain a concept, list with brief explanations, "
        "or compare two things. Answers should be 80-120 words with bullet points."
    ),
    10: (
        "10-mark questions: detailed discussion with sub-points, "
        "diagrams or algorithms described in words, and examples. "
        "Answers should be 200-300 words with clear structure "
        "(Introduction, Body, Conclusion)."
    ),
}

MAX_TEXT_CHARS = 12000


def parse_questions(text: str, marks: int) -> list[dict]:
    haystack = text + "\nQ0."
    matches = QUESTION_PATTERN.findall(haystack)
    out: list[dict] = []
    for num, q, a in matches:
        n = int(num)
        if n == 0:
            continue
        out.append(
            {
                "number": n,
                "marks": marks,
                "question": q.strip(),
                "answer": a.strip(),
                "topic": "",
            }
        )
    return out


def build_prompt(text: str, marks: int, count: int, topic: str | None) -> str:
    instructions = MARK_INSTRUCTIONS[marks]
    topic_clause = (
        f" Focus all questions on the topic: {topic}." if topic else ""
    )
    return (
        f"You are an exam paper setter. Based ONLY on the study notes below, "
        f"generate exactly {count} exam-style questions worth {marks} marks each.{topic_clause}\n\n"
        f"{instructions}\n\n"
        f"Format each question and its answer EXACTLY as:\n"
        f"Q1. <question text>\n"
        f"A1. <answer text>\n"
        f"Q2. <question text>\n"
        f"A2. <answer text>\n"
        f"...and so on for all {count} questions.\n\n"
        f"Use information that is present in the notes. "
        f"Do not invent facts. If the notes are insufficient for the full count, "
        f"write as many as you can.\n\n"
        f"NOTES:\n{text}\n\n"
        f"QUESTIONS:\n"
    )


def generate(
    pdf_id: str, marks: int, count: int, topic: str | None = None
) -> tuple[list[dict], str]:
    row = database.get_pdf(pdf_id)
    if not row:
        raise FileNotFoundError(f"PDF {pdf_id} not found")

    text = PDFProcessor.extract_text(Path(row["stored_path"]))
    if not text.strip():
        raise ValueError("PDF contains no extractable text")

    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS] + "\n\n[...truncated for length...]"

    prompt = build_prompt(text, marks, count, topic)
    raw = llm.generate_text(prompt)
    questions = parse_questions(raw, marks)
    return questions, raw
