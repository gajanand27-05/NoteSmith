import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

from app.core.llm import llm
from app.core.pdf_processor import PDFProcessor
from app.db import database

QUESTION_LINE = re.compile(r"^Q(\d+)\.\s*(.+?)\s*$", re.MULTILINE)
MARKS_LINE = re.compile(r"^MARKS:\s*(\d+)", re.MULTILINE)
TOPIC_LINE = re.compile(r"^TOPIC:\s*(.+?)\s*$", re.MULTILINE)
PRED_LINE = re.compile(r"^P(\d+)\.\s*(.+?)\s*$", re.MULTILINE)
PRED_FIELD = re.compile(
    r"^(TOPIC|CONFIDENCE|MARKS|REASONING):\s*(.+?)\s*$", re.MULTILINE
)
JSON_OBJECT = re.compile(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", re.DOTALL)

MAX_TEXT_CHARS = 16000


def parse_extracted_questions(text: str, year: int | None) -> list[dict]:
    parts = re.split(r"(?=^Q\d+\.\s)", text, flags=re.MULTILINE)
    parts.append("Q0. dummy")

    out: list[dict] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        m = re.match(r"^Q(\d+)\.\s*(.+?)(?=\nMARKS:|\Z)", part, re.DOTALL)
        if not m:
            continue
        num = int(m.group(1))
        if num == 0:
            continue
        question_text = m.group(2).strip()
        body = part[m.end():]

        marks_m = MARKS_LINE.search(body)
        marks = int(marks_m.group(1)) if marks_m else 0

        topic_m = TOPIC_LINE.search(body)
        topic = topic_m.group(1).strip() if topic_m else ""

        if question_text and topic:
            out.append(
                {
                    "number": num,
                    "text": question_text,
                    "marks": marks,
                    "topic": topic,
                    "year": year,
                }
            )
    return out


def parse_predictions(text: str) -> list[dict]:
    parts = re.split(r"(?=^P\d+\.\s)", text, flags=re.MULTILINE)
    parts.append("P0. dummy")

    out: list[dict] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        m = re.match(r"^P(\d+)\.\s*(.+?)(?=\n(?:TOPIC|CONFIDENCE|MARKS|REASONING):|\Z)", part, re.DOTALL)
        if not m:
            continue
        num = int(m.group(1))
        if num == 0:
            continue
        question_text = m.group(2).strip()
        body = part[m.end():]

        fields: dict[str, str] = {}
        for fm in PRED_FIELD.finditer(body):
            fields[fm.group(1).lower()] = fm.group(2).strip()

        try:
            confidence = float(fields.get("confidence", "0"))
        except ValueError:
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        try:
            marks = int(fields.get("marks", "0"))
        except ValueError:
            marks = 0

        if question_text and fields.get("topic"):
            out.append(
                {
                    "number": num,
                    "question": question_text,
                    "topic": fields["topic"],
                    "confidence": confidence,
                    "reasoning": fields.get("reasoning", ""),
                    "marks": marks,
                }
            )
    return out


def build_extract_prompt(text: str, year: int | None) -> str:
    year_str = f" from year {year}" if year else ""
    return (
        f"You are extracting exam questions from a question paper{year_str}.\n\n"
        f"For each question, return:\n"
        f"- number: question number (1, 2, 3, ...)\n"
        f"- text: the question text (clean, no marks info, no 'Q1.' prefix)\n"
        f"- marks: the marks awarded (typical values: 2, 5, 10, 15, 20)\n"
        f"- topic: the subject topic this question tests "
        f"(e.g., 'POS tagging', 'Parsing', 'Backpropagation'). "
        f"Use 1-3 word topic names.\n\n"
        f"If a question has sub-parts (a, b, c), treat it as one question "
        f"with the total marks.\n\n"
        f"Format each question EXACTLY as:\n"
        f"Q1. <question text>\n"
        f"MARKS: <number>\n"
        f"TOPIC: <topic>\n\n"
        f"Q2. <question text>\n"
        f"MARKS: <number>\n"
        f"TOPIC: <topic>\n\n"
        f"...and so on for every question in the paper.\n\n"
        f"QUESTION PAPER TEXT:\n{text}\n\n"
        f"EXTRACTED QUESTIONS:\n"
    )


def build_normalize_prompt(topics: list[str]) -> str:
    return (
        "You are normalizing topic names from exam questions. Different phrasings "
        "of the same topic should map to one canonical short name (1-3 words). "
        "Be aggressive in merging variants and abbreviations.\n\n"
        "Examples of merges:\n"
        "- 'POS Tagging' and 'Part-of-Speech Tagging' -> 'POS Tagging'\n"
        "- 'Tokenization' and 'Tokenisation' and 'Word Tokenization' -> 'Tokenization'\n"
        "- 'Backpropagation' and 'Back-propagation' and 'Back Prop' -> 'Backpropagation'\n\n"
        "Raw topics:\n"
        + "\n".join(f"- {t}" for t in topics)
        + "\n\nReturn a JSON object where each key is a raw topic and each value is its canonical name. "
        "Output ONLY the JSON object, no other text.\n\nJSON:"
    )


def normalize_topics(topics: list[str]) -> dict[str, str]:
    if not topics:
        return {}
    unique = list(dict.fromkeys(topics))
    if len(unique) == 1:
        return {unique[0]: unique[0]}
    prompt = build_normalize_prompt(unique)
    raw = llm.generate_text(prompt)
    match = JSON_OBJECT.search(raw)
    if not match:
        return {t: t for t in unique}
    try:
        result = json.loads(match.group(0))
    except json.JSONDecodeError:
        return {t: t for t in unique}
    out = {t: str(result.get(t, t)).strip() or t for t in unique}
    return out


def compute_trend(years_with_counts: list[tuple[int, int]]) -> str:
    if not years_with_counts:
        return "stable"
    years = sorted({y for y, _ in years_with_counts})
    if len(years) < 2:
        return "stable"

    year_counts = dict(years_with_counts)
    counts = [year_counts.get(y, 0) for y in range(years[0], years[-1] + 1)]

    mid = len(counts) // 2
    first_mean = sum(counts[:mid]) / max(mid, 1)
    second_mean = sum(counts[mid:]) / max(len(counts) - mid, 1)

    if second_mean > first_mean * 1.5 and second_mean > first_mean:
        return "rising"
    if first_mean > second_mean * 1.5 and first_mean > second_mean:
        return "falling"
    return "stable"


def compute_frequencies(
    papers: list[dict],
) -> list[dict]:
    topic_data: dict[str, dict] = {}
    for paper in papers:
        for q in paper["questions"]:
            t = q["topic"]
            entry = topic_data.setdefault(
                t,
                {"count": 0, "years": [], "paper_ids": []},
            )
            entry["count"] += 1
            if q.get("year") is not None and q["year"] not in entry["years"]:
                entry["years"].append(q["year"])
            if paper["pdf_id"] not in entry["paper_ids"]:
                entry["paper_ids"].append(paper["pdf_id"])

    out: list[dict] = []
    for topic, data in topic_data.items():
        if data["years"]:
            year_counts = [
                (y, sum(1 for p in papers for q in p["questions"]
                        if q["topic"] == topic and q.get("year") == y))
                for y in data["years"]
            ]
        else:
            year_counts = []
        out.append(
            {
                "topic": topic,
                "count": data["count"],
                "years": sorted(data["years"]),
                "paper_ids": data["paper_ids"],
                "trend": compute_trend(year_counts),
            }
        )
    out.sort(key=lambda x: (-x["count"], x["topic"]))
    return out


def build_predict_prompt(
    topics: list[dict], num: int, target_year: int, paper_count: int
) -> str:
    topic_lines = "\n".join(
        f"- {t['topic']}: {t['count']} times, years={t['years']}, trend={t['trend']}"
        for t in topics
    )
    return (
        f"You are predicting exam questions for the upcoming {target_year} exam, "
        f"based on {paper_count} previous question papers.\n\n"
        f"Topic frequency (most tested first):\n{topic_lines}\n\n"
        f"Generate exactly {num} likely questions. For each, choose a high-frequency "
        f"or rising-trend topic. The question style should match typical exam questions "
        f"for that topic.\n\n"
        f"Format each prediction EXACTLY as:\n"
        f"P1. <question text>\n"
        f"TOPIC: <topic>\n"
        f"CONFIDENCE: <0.0-1.0, higher for more frequently tested topics>\n"
        f"MARKS: <typical marks for this topic, e.g., 5 or 10>\n"
        f"REASONING: <one short sentence explaining why this is likely>\n\n"
        f"P2. <question text>\n"
        f"...and so on for all {num} predictions.\n\n"
        f"PREDICTIONS:\n"
    )


def extract_paper_questions(
    pdf_id: str, year: int | None
) -> tuple[list[dict], str | None]:
    row = database.get_pdf(pdf_id)
    if not row:
        return [], "PDF not found"
    text = PDFProcessor.extract_text(Path(row["stored_path"]))
    if not text.strip():
        return [], "No extractable text"
    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS] + "\n\n[...truncated...]"
    prompt = build_extract_prompt(text, year)
    raw = llm.generate_text(prompt)
    questions = parse_extracted_questions(raw, year)
    return questions, None


def analyze_papers(
    pdf_ids: list[str],
    years: list[int] | None = None,
    target_year: int | None = None,
    num_predictions: int = 5,
) -> dict:
    if len(pdf_ids) < 2:
        raise ValueError("Need at least 2 question papers to analyze")
    if years and len(years) != len(pdf_ids):
        raise ValueError("years list must match pdf_ids length")

    target_year = target_year or datetime.now().year
    year_for_id = (
        {pid: y for pid, y in zip(pdf_ids, years)} if years else {}
    )

    papers_out: list[dict] = []
    all_topic_questions: list[dict] = []

    for pdf_id in pdf_ids:
        row = database.get_pdf(pdf_id)
        if not row:
            continue
        year = year_for_id.get(pdf_id)
        questions, err = extract_paper_questions(pdf_id, year)
        if err:
            continue
        papers_out.append(
            {
                "pdf_id": pdf_id,
                "filename": row["original_name"],
                "year": year,
                "questions": questions,
            }
        )
        for q in questions:
            all_topic_questions.append(q)

    if len(papers_out) < 2:
        raise ValueError("Could not extract questions from at least 2 papers")

    raw_topics = [q["topic"] for q in all_topic_questions]
    canonical_map = normalize_topics(raw_topics)
    for paper in papers_out:
        for q in paper["questions"]:
            q["topic"] = canonical_map.get(q["topic"], q["topic"])

    topics = compute_frequencies(papers_out)

    predict_prompt = build_predict_prompt(
        topics[:20], num_predictions, target_year, len(papers_out)
    )
    raw_predictions = llm.generate_text(predict_prompt)
    predicted = parse_predictions(raw_predictions)

    return {
        "papers": [
            {
                "pdf_id": p["pdf_id"],
                "filename": p["filename"],
                "year": p["year"],
                "question_count": len(p["questions"]),
                "questions": p["questions"],
            }
            for p in papers_out
        ],
        "topics": topics,
        "predicted": predicted,
        "target_year": target_year,
    }
