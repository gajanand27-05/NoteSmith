from datetime import datetime, timezone

from app.db import database
from app.services import learning_loop

RECENT_HALF_LIFE_DAYS = 14
TREND_WINDOW_DAYS = 7
TREND_LOOKBACK_DAYS = 30
TREND_IMPROVE_RATIO = 1.10
TREND_DECLINE_RATIO = 0.90
ACTIVE_WINDOW_DAYS = 7


def _recency_factor(days_since_last) -> float:
    if days_since_last is None:
        return 0.0
    return 0.5 ** (days_since_last / RECENT_HALF_LIFE_DAYS)


def _days_since(ts_iso: str | None) -> int | None:
    if not ts_iso:
        return None
    try:
        ts = learning_loop._parse_ts(ts_iso)
    except Exception:
        return None
    delta = datetime.now(timezone.utc) - ts
    return max(0, int(delta.total_seconds() // 86400))


def _classify_trend(recent: float | None, prior: float | None) -> str:
    if recent is None or prior is None:
        return "new"
    if prior == 0:
        return "improving" if recent > 0 else "stable"
    if recent > prior * TREND_IMPROVE_RATIO:
        return "improving"
    if recent < prior * TREND_DECLINE_RATIO:
        return "declining"
    return "stable"


def get_pdf_dashboard(pdf_id: str, days: int = 30) -> dict:
    """Per-PDF dashboard: mastery, readiness, trend, topic breakdown,
    activity counts, last activity. Always returns a dict (with None
    fields) so the UI can render a card even when there's no data."""
    overall = learning_loop.get_overall_weakness(pdf_id, days=days)
    topics = learning_loop.compute_weak_topics(pdf_id, days=days)
    counts = learning_loop.get_activity_counts(pdf_id, days=days)
    last = learning_loop.get_last_activity(pdf_id)

    if overall is None:
        return {
            "pdf_id": pdf_id,
            "mastery": None,
            "readiness": None,
            "attempts": 0,
            "topics_covered": 0,
            "last_activity": last,
            "days_since_last": _days_since(last),
            "trend": "new",
            "topics": [],
            "quiz_attempts": counts["quiz_attempts"],
            "flashcard_reviews": counts["flashcard_reviews"],
            "tutor_sessions": counts["tutor_sessions"],
        }

    days_since = _days_since(last)
    mastery = overall["accuracy"]
    readiness = round(mastery * _recency_factor(days_since), 4)

    recent = learning_loop.get_accuracy_in_window(
        pdf_id, start_days_ago=TREND_WINDOW_DAYS, end_days_ago=0
    )
    prior = learning_loop.get_accuracy_in_window(
        pdf_id,
        start_days_ago=TREND_LOOKBACK_DAYS,
        end_days_ago=TREND_WINDOW_DAYS,
    )
    trend = _classify_trend(recent, prior)

    topic_breakdown = sorted(
        [
            {
                "topic": t["topic"] or "(overall)",
                "mastery": t["accuracy"],
                "attempts": t["attempts"],
                "weakness": t["weakness"],
            }
            for t in topics
        ],
        key=lambda x: x["mastery"],
    )

    return {
        "pdf_id": pdf_id,
        "mastery": mastery,
        "readiness": readiness,
        "attempts": overall["attempts"],
        "topics_covered": overall["topic_count"],
        "last_activity": last,
        "days_since_last": days_since,
        "trend": trend,
        "topics": topic_breakdown,
        "quiz_attempts": counts["quiz_attempts"],
        "flashcard_reviews": counts["flashcard_reviews"],
        "tutor_sessions": counts["tutor_sessions"],
    }


def get_overall_dashboard(days: int = 30) -> dict:
    """Aggregated dashboard across every PDF in the local catalog."""
    pdfs = database.list_pdfs()
    pdf_dashboards: list[dict] = []
    for p in pdfs:
        d = get_pdf_dashboard(p["id"], days=days)
        d["filename"] = p["original_name"]
        d["page_count"] = p.get("page_count", 0)
        pdf_dashboards.append(d)

    pdf_dashboards.sort(
        key=lambda x: (
            -(x["readiness"] if x["readiness"] is not None else -1),
            x["filename"],
        )
    )

    with_data = [d for d in pdf_dashboards if d["mastery"] is not None]
    total_attempts = sum(d["attempts"] for d in with_data)
    if total_attempts > 0:
        weighted_mastery = sum(
            (d["mastery"] or 0) * d["attempts"] for d in with_data
        ) / total_attempts
        weighted_readiness = sum(
            (d["readiness"] or 0) * d["attempts"] for d in with_data
        ) / total_attempts
    else:
        weighted_mastery = None
        weighted_readiness = None

    active = sum(
        1
        for d in pdf_dashboards
        if d.get("days_since_last") is not None
        and d["days_since_last"] <= ACTIVE_WINDOW_DAYS
    )

    streak = learning_loop.get_streak(pdf_id=None)
    return {
        "mastery": (
            round(weighted_mastery, 4) if weighted_mastery is not None else None
        ),
        "readiness": (
            round(weighted_readiness, 4) if weighted_readiness is not None else None
        ),
        "pdf_count": len(pdfs),
        "pdfs_with_data": len(with_data),
        "active_pdfs": active,
        "total_attempts": total_attempts,
        "streak": streak,
        "pdfs": pdf_dashboards,
    }
