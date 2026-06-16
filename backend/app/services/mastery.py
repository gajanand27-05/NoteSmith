import json
from datetime import datetime, timedelta

from app.db import database

WEIGHTS = {
    "QUIZ": 0.45,
    "FLASHCARD": 0.30,
    "TUTOR": 0.10,
    "QA": 0.05,
    "STUDY": 0.10,
    "PAPER_ANALYZER": 0.05,
}


def _time_decay(days_old: int) -> float:
    if days_old <= 7:
        return 1.0
    if days_old <= 30:
        return 0.8
    if days_old <= 90:
        return 0.5
    return 0.2


TREND_DAYS = 7


def _compute_score(events: list[dict]) -> tuple[float, int, dict]:
    weighted_sum = 0.0
    weight_total = 0.0
    breakdown = {}
    now = datetime.utcnow()

    for ev in events:
        etype = ev["event_type"]
        w = WEIGHTS.get(etype, 0.05)
        created = datetime.fromisoformat(ev["created_at"])
        days_old = (now - created).days
        decay = _time_decay(days_old)
        effective_weight = w * decay
        score = float(ev["score"]) if ev["score"] is not None else 0.0
        weighted_sum += score * effective_weight
        weight_total += effective_weight
        breakdown[etype] = breakdown.get(etype, 0) + 1

    mastery = round(weighted_sum / weight_total, 4) if weight_total > 0 else 0.0
    scaled = round(mastery * 100)
    return scaled, len(events), breakdown


def _compute_trend(events: list[dict]) -> float:
    now = datetime.utcnow()
    cutoff = now - timedelta(days=TREND_DAYS)

    old_events = [e for e in events if datetime.fromisoformat(e["created_at"]) < cutoff]
    if not old_events:
        return 0.0

    old_score, _, _ = _compute_score(old_events)
    all_score, _, _ = _compute_score(events)
    return round(all_score - old_score, 1)


def _upsert_cached(pdf_id: str, topic_id: str | None, mastery: float, total: int, breakdown: dict) -> None:
    database.upsert_mastery_score(
        pdf_id=pdf_id,
        topic_id=topic_id,
        mastery=mastery,
        total_events=total,
        breakdown=breakdown,
    )


def record_and_recompute(
    pdf_id: str,
    event_type: str,
    topic_id: str | None = None,
    correct: int | None = None,
    score: float = 0.0,
    metadata: dict | None = None,
) -> dict:
    event = database.create_mastery_event(
        pdf_id=pdf_id,
        event_type=event_type,
        topic_id=topic_id,
        correct=correct,
        score=score,
        metadata=metadata,
    )
    # Recompute and cache overall PDF mastery
    pdf_events = database.get_mastery_events(pdf_id)
    mastery, total, breakdown = _compute_score(pdf_events)
    _upsert_cached(pdf_id, topic_id=None, mastery=mastery, total=total, breakdown=breakdown)

    # Recompute and cache topic-level mastery if topic_id provided
    if topic_id:
        topic_events = [e for e in pdf_events if e.get("topic_id") == topic_id]
        t_mastery, t_total, t_breakdown = _compute_score(topic_events)
        _upsert_cached(pdf_id, topic_id=topic_id, mastery=t_mastery, total=t_total, breakdown=t_breakdown)

    return event


def compute_pdf_mastery(pdf_id: str) -> dict:
    pdf = database.get_pdf(pdf_id)
    if not pdf:
        return {"pdf_id": pdf_id, "pdf_name": "", "mastery_score": 0.0, "trend": 0.0, "total_events": 0, "breakdown": {}}

    events = database.get_mastery_events(pdf_id)
    if not events:
        return {
            "pdf_id": pdf_id,
            "pdf_name": pdf["original_name"],
            "mastery_score": 0.0,
            "trend": 0.0,
            "total_events": 0,
            "breakdown": {},
            "topic_id": None,
            "topic_name": None,
        }

    mastery, total, breakdown = _compute_score(events)
    trend = _compute_trend(events)
    return {
        "pdf_id": pdf_id,
        "pdf_name": pdf["original_name"],
        "mastery_score": mastery,
        "trend": trend,
        "total_events": total,
        "breakdown": breakdown,
        "topic_id": None,
        "topic_name": None,
    }


def _compute_empty_mastery(pdf_id: str, pdf_name: str = "") -> dict:
    return {
        "pdf_id": pdf_id,
        "pdf_name": pdf_name,
        "mastery_score": 0.0,
        "trend": 0.0,
        "total_events": 0,
        "breakdown": {},
        "topic_id": None,
        "topic_name": None,
    }


def compute_all_mastery(use_cache: bool = True) -> list[dict]:
    if use_cache:
        cached = database.list_mastery_scores()
        pdf_cache = [c for c in cached if c.get("topic_id") is None]
        pdf_map = {p["id"]: p["original_name"] for p in database.list_pdfs()}
        results = []
        seen = set()
        for c in pdf_cache:
            pid = c["pdf_id"]
            seen.add(pid)
            events = database.get_mastery_events(pid)
            trend = _compute_trend(events) if events else 0.0
            breakdown = c.get("breakdown", {})
            if isinstance(breakdown, str):
                try:
                    breakdown = json.loads(breakdown)
                except (json.JSONDecodeError, TypeError):
                    breakdown = {}
            results.append({
                "pdf_id": pid,
                "pdf_name": pdf_map.get(pid, "Unknown"),
                "mastery_score": c["mastery"],
                "trend": trend,
                "total_events": c.get("total_events", 0),
                "breakdown": breakdown,
                "topic_id": None,
                "topic_name": None,
            })
        for pid, name in pdf_map.items():
            if pid not in seen:
                results.append(_compute_empty_mastery(pid, name))
        return results

    pdfs = database.list_pdfs()
    results = []
    for pdf in pdfs:
        results.append(compute_pdf_mastery(pdf["id"]))
    return results


def compute_recommendations() -> list[dict]:
    scores = database.list_mastery_scores()
    pdfs = {p["id"]: p["original_name"] for p in database.list_pdfs()}
    recommendations = []

    doc_scores = [s for s in scores if s.get("topic_id") is None]
    for s in doc_scores:
        mastery = s["mastery"]
        name = pdfs.get(s["pdf_id"], "Unknown")
        breakdown = s.get("breakdown", {})

        if isinstance(breakdown, str):
            try:
                breakdown = json.loads(breakdown)
            except (json.JSONDecodeError, TypeError):
                breakdown = {}

        quiz_count = breakdown.get("QUIZ", 0)
        flashcard_count = breakdown.get("FLASHCARD", 0)

        if mastery < 30:
            reason = f"Low overall mastery ({mastery}%)"
            if quiz_count > 0:
                reason += f" across {quiz_count} quiz attempt(s)"
            else:
                reason += " — try a quiz to gauge understanding"
        elif mastery < 50:
            reason = f"Building foundation at {mastery}%"
            if flashcard_count < 3:
                reason += " — reinforce with flashcards"
            else:
                reason += " — keep practicing with quizzes"
        elif quiz_count == 0:
            reason = f"Some familiarity ({mastery}%) but no quiz attempts yet"
        else:
            continue

        recommendations.append({
            "pdf_id": s["pdf_id"],
            "pdf_name": name,
            "topic": None,
            "mastery": mastery,
            "reason": reason,
        })

    # Also recommend topic-level weaknesses
    topic_scores = [s for s in scores if s.get("topic_id") is not None]
    for s in topic_scores:
        mastery = s["mastery"]
        if mastery >= 50:
            continue
        name = pdfs.get(s["pdf_id"], "Unknown")
        recommendations.append({
            "pdf_id": s["pdf_id"],
            "pdf_name": name,
            "topic": s["topic_id"],
            "mastery": mastery,
            "reason": f"Weak topic: {s['topic_id']} at {mastery}%",
        })

    recommendations.sort(key=lambda r: r["mastery"])
    return recommendations[:10]
