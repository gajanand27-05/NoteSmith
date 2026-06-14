from datetime import datetime, timedelta

from app.db import database

WEIGHTS = {
    "quiz_attempt": 0.40,
    "flashcard_review": 0.25,
    "qa_asked": 0.15,
    "study_session": 0.20,
}


def _time_decay(created_at: str) -> float:
    created = datetime.fromisoformat(created_at)
    days_old = (datetime.utcnow() - created).days
    if days_old <= 7:
        return 1.0
    if days_old <= 30:
        return 0.8
    if days_old <= 90:
        return 0.5
    return 0.2


def compute_pdf_mastery(pdf_id: str) -> dict:
    pdf = database.get_pdf(pdf_id)
    if not pdf:
        return {"pdf_id": pdf_id, "mastery_score": 0.0, "total_events": 0, "breakdown": {}}

    events = database.get_mastery_events(pdf_id)
    if not events:
        return {
            "pdf_id": pdf_id,
            "pdf_name": pdf["original_name"],
            "mastery_score": 0.0,
            "total_events": 0,
            "breakdown": {},
        }

    weighted_sum = 0.0
    weight_total = 0.0
    breakdown = {}

    for ev in events:
        etype = ev["event_type"]
        w = WEIGHTS.get(etype, 0.1)
        decay = _time_decay(ev["created_at"])
        effective_weight = w * decay
        score = ev["score"] if ev["score"] is not None else 0.0
        weighted_sum += score * effective_weight
        weight_total += effective_weight
        breakdown[etype] = breakdown.get(etype, 0) + 1

    score = round(weighted_sum / weight_total, 4) if weight_total > 0 else 0.0
    scaled = round(score * 100)

    return {
        "pdf_id": pdf_id,
        "pdf_name": pdf["original_name"],
        "mastery_score": scaled,
        "total_events": len(events),
        "breakdown": breakdown,
    }


def compute_all_mastery() -> list[dict]:
    pdfs = database.list_pdfs()
    results = []
    for pdf in pdfs:
        results.append(compute_pdf_mastery(pdf["id"]))
    return results
