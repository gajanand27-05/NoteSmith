from collections import Counter
from datetime import datetime, timedelta

from app.db import database
from app.services import mastery as mastery_service

DAYS = 7


def _compute_quiz_accuracy(events: list[dict]) -> float | None:
    quiz_events = [e for e in events if e["event_type"] == "QUIZ"]
    if not quiz_events:
        return None
    total = len(quiz_events)
    correct = sum(1 for e in quiz_events if e.get("correct") == 1)
    return round(correct / total, 4) if total > 0 else None


def generate_weekly_report() -> dict:
    all_events = database.get_all_events()
    cutoff = datetime.utcnow() - timedelta(days=DAYS)

    # Filter last 7 days
    recent_events = []
    for e in all_events:
        try:
            ts = datetime.fromisoformat(e["created_at"])
            if ts >= cutoff:
                recent_events.append(e)
        except (ValueError, TypeError):
            continue

    # Daily activity for heatmap
    day_counts = Counter()
    event_type_counts = Counter()
    for e in recent_events:
        try:
            ts = datetime.fromisoformat(e["created_at"])
            day_label = ts.strftime("%a").lower()  # mon, tue, etc.
            day_counts[day_label] += 1
            event_type_counts[e["event_type"]] += 1
        except (ValueError, TypeError):
            continue

    # Build 7-day heatmap (Mon-Sun)
    today_idx = datetime.utcnow().weekday()  # Mon=0
    day_order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    heatmap = []
    for i in range(7):
        day = day_order[(today_idx - (6 - i)) % 7]
        heatmap.append({
            "day": day,
            "count": day_counts.get(day, 0),
        })

    # Mastery growth (compare all docs now vs 7 days ago)
    all_mastery = mastery_service.compute_all_mastery(use_cache=True)
    docs_with_events = set(e["pdf_id"] for e in recent_events)

    scores = [d["mastery_score"] for d in all_mastery]
    avg_mastery = round(sum(scores) / len(scores), 1) if scores else 0.0

    strongest = max(all_mastery, key=lambda d: d["mastery_score"]) if all_mastery else None
    weakest = min(all_mastery, key=lambda d: d["mastery_score"]) if all_mastery else None

    # Compute prior period mastery for growth
    prior_cutoff = cutoff - timedelta(days=DAYS)
    prior_events = []
    for e in all_events:
        try:
            ts = datetime.fromisoformat(e["created_at"])
            if prior_cutoff <= ts < cutoff:
                prior_events.append(e)
        except (ValueError, TypeError):
            continue

    mastery_growth = None
    if len(recent_events) > 0 and len(prior_events) > 0:
        # Average score comparison
        recent_scores = [e.get("score", 0) or 0 for e in recent_events]
        prior_scores = [e.get("score", 0) or 0 for e in prior_events]
        recent_avg = sum(recent_scores) / len(recent_scores) if recent_scores else 0
        prior_avg = sum(prior_scores) / len(prior_scores) if prior_scores else 0
        mastery_growth = round(recent_avg - prior_avg, 4)

    quiz_accuracy = _compute_quiz_accuracy(recent_events)

    # Activity breakdown
    activity_breakdown = {
        etype: count
        for etype, count in sorted(event_type_counts.items(), key=lambda x: -x[1])
    }

    return {
        "period_days": DAYS,
        "period_label": "Last 7 Days",
        "total_events": len(recent_events),
        "active_docs": len(docs_with_events),
        "avg_mastery": avg_mastery,
        "mastery_growth": mastery_growth,
        "strongest_topic": {
            "pdf_id": strongest["pdf_id"],
            "pdf_name": strongest["pdf_name"],
            "mastery": strongest["mastery_score"],
        } if strongest else None,
        "weakest_topic": {
            "pdf_id": weakest["pdf_id"],
            "pdf_name": weakest["pdf_name"],
            "mastery": weakest["mastery_score"],
        } if weakest else None,
        "quiz_accuracy": quiz_accuracy,
        "heatmap": heatmap,
        "activity_breakdown": activity_breakdown,
    }
