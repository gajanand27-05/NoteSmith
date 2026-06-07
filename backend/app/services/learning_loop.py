from datetime import datetime, timedelta, timezone

from app.db import supabase

DEFAULT_LOOKBACK_DAYS = 30
RECENT_WEIGHT = 2
RECENT_WINDOW_DAYS = 7


def _parse_ts(ts: str) -> datetime:
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    return datetime.fromisoformat(ts)


def _is_configured() -> bool:
    return supabase.is_configured()


def record_quiz_attempt(pdf_id: str, topic: str | None, score: int, total: int) -> dict:
    if not _is_configured():
        raise RuntimeError("Supabase not configured")
    if total <= 0 or score < 0 or score > total:
        raise ValueError("invalid score/total")
    client = supabase.get_client()
    res = (
        client.table("quiz_attempts")
        .insert(
            {
                "pdf_id": pdf_id,
                "topic": topic,
                "score": score,
                "total": total,
            }
        )
        .execute()
    )
    return res.data[0] if res.data else {}


def record_flashcard_review(
    pdf_id: str, topic: str | None, card_index: int, correct: bool
) -> dict:
    if not _is_configured():
        raise RuntimeError("Supabase not configured")
    if card_index < 0:
        raise ValueError("card_index must be >= 0")
    client = supabase.get_client()
    res = (
        client.table("flashcard_reviews")
        .insert(
            {
                "pdf_id": pdf_id,
                "topic": topic,
                "card_index": card_index,
                "correct": correct,
            }
        )
        .execute()
    )
    return res.data[0] if res.data else {}


def record_tutor_session(
    pdf_id: str | None, concept: str, level: str
) -> dict:
    if not _is_configured():
        raise RuntimeError("Supabase not configured")
    if not concept or not level:
        raise ValueError("concept and level are required")
    client = supabase.get_client()
    res = (
        client.table("tutor_sessions")
        .insert(
            {
                "pdf_id": pdf_id,
                "concept": concept,
                "level": level,
            }
        )
        .execute()
    )
    return res.data[0] if res.data else {}


def compute_weak_topics(
    pdf_id: str, days: int = DEFAULT_LOOKBACK_DAYS
) -> list[dict]:
    """Per-topic weakness from quiz attempts + flashcard reviews within
    the last `days` days. Recent (last 7 days) rows count 2x.

    Returns a list of {topic, accuracy, weakness, attempts, quiz_count, flashcard_count}
    sorted by weakness desc, then attempts desc. Topics with no data are excluded.
    """
    if not _is_configured():
        return []
    client = supabase.get_client()
    quiz = (
        client.table("quiz_attempts")
        .select("topic,score,total,ts")
        .eq("pdf_id", pdf_id)
        .execute()
    )
    fc = (
        client.table("flashcard_reviews")
        .select("topic,correct,ts")
        .eq("pdf_id", pdf_id)
        .execute()
    )

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=RECENT_WINDOW_DAYS)

    stats: dict[str, dict] = {}
    for r in quiz.data or []:
        try:
            ts = _parse_ts(r["ts"])
        except Exception:
            continue
        if ts < cutoff:
            continue
        t = r.get("topic") or "_overall"
        s = stats.setdefault(
            t, {"correct": 0.0, "total": 0.0, "quiz_count": 0, "flashcard_count": 0}
        )
        weight = RECENT_WEIGHT if ts >= recent_cutoff else 1
        s["correct"] += float(r["score"]) * weight
        s["total"] += float(r["total"]) * weight
        s["quiz_count"] += 1

    for r in fc.data or []:
        try:
            ts = _parse_ts(r["ts"])
        except Exception:
            continue
        if ts < cutoff:
            continue
        t = r.get("topic") or "_overall"
        s = stats.setdefault(
            t, {"correct": 0.0, "total": 0.0, "quiz_count": 0, "flashcard_count": 0}
        )
        weight = RECENT_WEIGHT if ts >= recent_cutoff else 1
        s["correct"] += (1.0 if r["correct"] else 0.0) * weight
        s["total"] += weight
        s["flashcard_count"] += 1

    out: list[dict] = []
    for topic, s in stats.items():
        if s["total"] <= 0:
            continue
        accuracy = s["correct"] / s["total"]
        out.append(
            {
                "topic": None if topic == "_overall" else topic,
                "accuracy": round(accuracy, 4),
                "weakness": round(1 - accuracy, 4),
                "attempts": int(s["quiz_count"] + s["flashcard_count"]),
                "quiz_count": s["quiz_count"],
                "flashcard_count": s["flashcard_count"],
            }
        )
    out.sort(key=lambda x: (-x["weakness"], -x["attempts"], x["topic"] or ""))
    return out


def get_overall_weakness(pdf_id: str, days: int = DEFAULT_LOOKBACK_DAYS) -> dict | None:
    """Single number for a PDF (across all topics)."""
    topics = compute_weak_topics(pdf_id, days=days)
    if not topics:
        return None
    total_correct = sum(t["accuracy"] * t["attempts"] for t in topics)
    total_attempts = sum(t["attempts"] for t in topics)
    if total_attempts == 0:
        return None
    accuracy = total_correct / total_attempts
    return {
        "pdf_id": pdf_id,
        "accuracy": round(accuracy, 4),
        "weakness": round(1 - accuracy, 4),
        "attempts": total_attempts,
        "topic_count": len(topics),
    }
