import re
from pathlib import Path

from app.core.llm import llm
from app.core.pdf_processor import PDFProcessor
from app.db import database

DIFFICULTY_INSTRUCTIONS = {
    "easy": (
        "Easy: factual recall and definitions. "
        "Phrases like 'What is X?', 'Which of the following is the definition of Y?'. "
        "Distractors should be clearly wrong to a student who read the notes."
    ),
    "medium": (
        "Medium: application and comparison. "
        "Phrases like 'Which of the following is true about X?', 'What is the main difference between X and Y?'. "
        "Distractors should be plausible but incorrect."
    ),
    "hard": (
        "Hard: analysis and edge cases. "
        "Phrases like 'Which would happen if...?', 'What is the most likely reason...?', 'Which statement is FALSE?'. "
        "Distractors should be subtle, requiring real understanding to reject."
    ),
}

MAX_TEXT_CHARS = 12000

OPTION_PATTERN = re.compile(
    r"^([A-D])\.\s*(.+?)\s*$", re.MULTILINE
)
ANSWER_PATTERN = re.compile(r"ANSWER:\s*([A-D])")
EXPLANATION_PATTERN = re.compile(
    r"EXPLANATION:\s*(.+?)(?=\nQ\d+\.|\Z)", re.DOTALL
)
QUESTION_START = re.compile(r"^Q(\d+)\.\s*(.+?)(?=\n[A-D]\.|\Z)", re.DOTALL | re.MULTILINE)


def parse_quiz(text: str) -> list[dict]:
    parts = re.split(r"(?=^Q\d+\.\s)", text, flags=re.MULTILINE)
    parts.append("Q0. dummy")

    out: list[dict] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        head = QUESTION_START.match(part)
        if not head:
            continue
        num = int(head.group(1))
        if num == 0:
            continue
        question_text = head.group(2).strip()
        body = part[head.end():]

        options: dict[str, str] = {}
        for m in OPTION_PATTERN.finditer(body):
            options[m.group(1)] = m.group(2).strip()

        ans_m = ANSWER_PATTERN.search(body)
        correct = ans_m.group(1) if ans_m else ""

        exp_m = EXPLANATION_PATTERN.search(body)
        explanation = exp_m.group(1).strip() if exp_m else ""

        if len(options) != 4 or correct not in ("A", "B", "C", "D"):
            continue

        out.append(
            {
                "number": num,
                "question": question_text,
                "options": [
                    {"label": l, "text": options[l]} for l in "ABCD"
                ],
                "correct": correct,
                "explanation": explanation,
            }
        )
    return out


def build_prompt(
    text: str, count: int, difficulty: str, topic: str | None
) -> str:
    diff_instr = DIFFICULTY_INSTRUCTIONS[difficulty]
    topic_clause = (
        f" Focus all questions on the topic: {topic}." if topic else ""
    )
    return (
        f"You are a quiz master. Based ONLY on the notes below, generate exactly {count} "
        f"multiple-choice questions at {difficulty} difficulty.{topic_clause}\n\n"
        f"{diff_instr}\n\n"
        f"For each question provide exactly 4 options (A, B, C, D), with one correct answer, "
        f"and a brief explanation of why the correct answer is right.\n\n"
        f"Format each question EXACTLY as:\n"
        f"Q1. <question text>\n"
        f"A. <option A text>\n"
        f"B. <option B text>\n"
        f"C. <option C text>\n"
        f"D. <option D text>\n"
        f"ANSWER: <A|B|C|D>\n"
        f"EXPLANATION: <1-2 sentence explanation>\n\n"
        f"Q2. <question text>\n"
        f"...and so on for all {count} questions.\n\n"
        f"Distractors must be plausible but incorrect. Do not invent facts not in the notes. "
        f"If the notes are insufficient, write as many questions as you can.\n\n"
        f"NOTES:\n{text}\n\n"
        f"QUIZ:\n"
    )


def generate(
    pdf_id: str,
    count: int,
    difficulty: str = "medium",
    topic: str | None = None,
) -> tuple[list[dict], str]:
    row = database.get_pdf(pdf_id)
    if not row:
        raise FileNotFoundError(f"PDF {pdf_id} not found")

    text = PDFProcessor.extract_text(Path(row["stored_path"]))
    if not text.strip():
        raise ValueError("PDF contains no extractable text")

    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS] + "\n\n[...truncated for length...]"

    prompt = build_prompt(text, count, difficulty, topic)
    raw = llm.generate_text(prompt)
    questions = parse_quiz(raw)
    return questions, raw
