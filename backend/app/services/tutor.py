import re

from app.core import retriever
from app.core.llm import llm
from app.db import database

LEVEL_PROMPTS = {
    "kid": (
        "You are a friendly teacher explaining to a curious 8-year-old child. "
        "Use very simple words. Use one fun analogy from everyday life "
        "(toys, food, animals, games). No jargon. No formulas. "
        "Maximum 3 short sentences. End with a one-line summary."
    ),
    "school": (
        "You are a teacher explaining to a middle-school student (age 12-15). "
        "Use plain language. Give one concrete example they can relate to "
        "(school, sports, daily life). You may introduce a technical term "
        "but immediately explain it in simple words. Maximum 5 sentences. "
        "Optional simple formula or diagram description."
    ),
    "high_school": (
        "You are a teacher explaining to a high-school student (age 16-18). "
        "Use proper technical terms with brief definitions. Include the formula "
        "or rule if applicable. Give one worked example. Mention one common "
        "mistake students make. Maximum 8 sentences."
    ),
    "college": (
        "You are a lecturer explaining to a college undergraduate. "
        "Use full technical language. Cover the formal definition, the "
        "underlying formula or algorithm, and one worked example. "
        "Mention one related concept. Aim for about 150 words. "
        "Use precise terminology."
    ),
    "engineering": (
        "You are explaining to a working engineer or senior practitioner. "
        "Use precise technical language. Cover: the formal definition, the "
        "math or algorithm, common pitfalls in implementation, one real-world "
        "use case, and one optimization or alternative approach. "
        "Aim for about 250 words."
    ),
    "interview": (
        "You are prepping a candidate for a technical interview. Be concise. "
        "Cover: the definition, how it works internally, time and space complexity "
        "if relevant, and 2-3 common interview follow-up questions. "
        "Use bullet points. About 100-150 words. "
        "Highlight common pitfalls the interviewer will probe."
    ),
}

FOLLOWUP_PROMPT = (
    "Given this explanation of '{concept}' at the {level} level:\n\n"
    "{explanation}\n\n"
    "List exactly 3 logical follow-up questions a student at this level "
    "might naturally ask next. Format as a numbered list, one per line, "
    "no other text:\n"
    "1. <question>\n"
    "2. <question>\n"
    "3. <question>\n"
)

EXAMPLE_SPLIT = re.compile(r"\bEXAMPLE:\s*", re.IGNORECASE)
FOLLOWUP_LINE = re.compile(r"^\s*(\d+)[\.)]\s*(.+?)\s*$", re.MULTILINE)


def _parse_example(full: str) -> tuple[str, str]:
    parts = EXAMPLE_SPLIT.split(full, maxsplit=1)
    explanation = parts[0].strip()
    example = parts[1].strip() if len(parts) > 1 else ""
    return explanation, example


def _parse_follow_ups(text: str) -> list[str]:
    out: list[str] = []
    for m in FOLLOWUP_LINE.finditer(text):
        q = m.group(2).strip()
        if q and q not in out:
            out.append(q)
        if len(out) >= 3:
            break
    return out


def _retrieve_context(pdf_id: str, concept: str) -> str:
    row = database.get_pdf(pdf_id)
    if not row:
        return ""
    chunks = retriever.retrieve(pdf_id, concept, top_k=3)
    if not chunks:
        return ""
    return "\n\n---\n\n".join(c["text"] for c in chunks)


def explain(
    concept: str,
    level: str,
    pdf_id: str | None = None,
    include_example: bool = True,
    include_follow_ups: bool = True,
) -> dict:
    if level not in LEVEL_PROMPTS:
        raise ValueError(f"Unknown level: {level}")

    context = _retrieve_context(pdf_id, concept) if pdf_id else ""

    user_parts = [f"Explain this concept: {concept}"]
    if include_example:
        user_parts.append(
            "Format your response as:\n"
            "<the explanation, 2-4 short paragraphs>\n"
            "EXAMPLE: <one concrete example, 1-2 sentences>"
        )
    if context:
        user_parts.append(
            f"Use the following context from the user's notes to ground your answer:\n\n{context}"
        )
    user_message = "\n\n".join(user_parts)

    messages = [
        {"role": "system", "content": LEVEL_PROMPTS[level]},
        {"role": "user", "content": user_message},
    ]
    raw = llm.chat_text(messages)
    explanation, example = _parse_example(raw) if include_example else (raw, "")

    follow_ups: list[str] = []
    if include_follow_ups:
        fu_prompt = FOLLOWUP_PROMPT.format(
            concept=concept, level=level, explanation=raw
        )
        fu_raw = llm.generate_text(fu_prompt)
        follow_ups = _parse_follow_ups(fu_raw)

    return {
        "concept": concept,
        "level": level,
        "explanation": explanation,
        "example": example,
        "follow_ups": follow_ups,
    }
