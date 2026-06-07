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


def get_activity_counts(pdf_id: str, days: int = DEFAULT_LOOKBACK_DAYS) -> dict:
    """Counts of quiz attempts, flashcard reviews, and tutor sessions
    for this PDF within the lookback window. Includes only rows whose
    ts is within the window."""
    if not _is_configured():
        return {"quiz_attempts": 0, "flashcard_reviews": 0, "tutor_sessions": 0}
    client = supabase.get_client()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    quiz = (
        client.table("quiz_attempts")
        .select("id", count="exact")
        .eq("pdf_id", pdf_id)
        .gte("ts", cutoff)
        .execute()
    )
    fc = (
        client.table("flashcard_reviews")
        .select("id", count="exact")
        .eq("pdf_id", pdf_id)
        .gte("ts", cutoff)
        .execute()
    )
    tutor = (
        client.table("tutor_sessions")
        .select("id", count="exact")
        .eq("pdf_id", pdf_id)
        .gte("ts", cutoff)
        .execute()
    )
    return {
        "quiz_attempts": getattr(quiz, "count", None) or len(quiz.data or []),
        "flashcard_reviews": getattr(fc, "count", None) or len(fc.data or []),
        "tutor_sessions": getattr(tutor, "count", None) or len(tutor.data or []),
    }


def get_last_activity(pdf_id: str) -> str | None:
    """Most recent timestamp across quiz_attempts, flashcard_reviews,
    and tutor_sessions for this PDF. Returns ISO-8601 string or None."""
    if not _is_configured():
        return None
    client = supabase.get_client()
    latest: datetime | None = None
    for table in ("quiz_attempts", "flashcard_reviews", "tutor_sessions"):
        try:
            res = (
                client.table(table)
                .select("ts")
                .eq("pdf_id", pdf_id)
                .order("ts", desc=True)
                .limit(1)
                .execute()
            )
        except Exception:
            continue
        rows = res.data or []
        if not rows:
            continue
        try:
            ts = _parse_ts(rows[0]["ts"])
        except Exception:
            continue
        if latest is None or ts > latest:
            latest = ts
    return latest.isoformat() if latest else None


def get_accuracy_in_window(
    pdf_id: str, start_days_ago: int, end_days_ago: int = 0
) -> float | None:
    """Accuracy (0-1) across all tracked activity for this PDF in the
    window (start_days_ago, end_days_ago]. None if no data."""
    if not _is_configured():
        return None
    client = supabase.get_client()
    now = datetime.now(timezone.utc)
    start_iso = (now - timedelta(days=start_days_ago)).isoformat()
    end_iso = (now - timedelta(days=end_days_ago)).isoformat()

    correct = 0.0
    total = 0.0

    quiz = (
        client.table("quiz_attempts")
        .select("score,total")
        .eq("pdf_id", pdf_id)
        .gte("ts", start_iso)
        .lte("ts", end_iso)
        .execute()
    )
    for r in quiz.data or []:
        correct += float(r["score"])
        total += float(r["total"])

    fc = (
        client.table("flashcard_reviews")
        .select("correct")
        .eq("pdf_id", pdf_id)
        .gte("ts", start_iso)
        .lte("ts", end_iso)
        .execute()
    )
    for r in fc.data or []:
        correct += 1.0 if r["correct"] else 0.0
        total += 1.0

    if total == 0:
        return None
    return correct / total


def get_activity_days(
    pdf_id: str | None = None, lookback_days: int = 365
) -> set:
    """Set of date objects (UTC) on which this PDF (or all PDFs if None)
    had any tracked activity in the lookback window."""
    if not _is_configured():
        return set()
    client = supabase.get_client()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).isoformat()
    days: set = set()
    for table in ("quiz_attempts", "flashcard_reviews", "tutor_sessions"):
        q = client.table(table).select("ts").gte("ts", cutoff)
        if pdf_id is not None and table != "tutor_sessions":
            q = q.eq("pdf_id", pdf_id)
        elif pdf_id is not None and table == "tutor_sessions":
            q = q.eq("pdf_id", pdf_id)
        try:
            res = q.execute()
        except Exception:
            continue
        for r in res.data or []:
            try:
                ts = _parse_ts(r["ts"])
                days.add(ts.date())
            except Exception:
                continue
    return days


def get_streak(pdf_id: str | None = None, lookback_days: int = 365) -> dict:
    """Current and best streak of consecutive days with activity.

    A 'day' has activity if any row in quiz_attempts, flashcard_reviews,
    or tutor_sessions has a ts in that UTC day.

    Current streak: ends today (if today active) or yesterday (if today
    is a gap but yesterday was active). If neither today nor yesterday
    had activity, current streak is 0.

    Best streak: longest consecutive run found in the lookback window.
    """
    days = get_activity_days(pdf_id=pdf_id, lookback_days=lookback_days)
    if not days:
        return {"current": 0, "best": 0, "today_active": False, "last_active": None}

    today = datetime.now(timezone.utc).date()
    today_active = today in days

    current = 0
    if today_active:
        cursor = today
    else:
        if (today - timedelta(days=1)) in days:
            cursor = today - timedelta(days=1)
        else:
            cursor = None
    while cursor is not None and cursor in days:
        current += 1
        cursor -= timedelta(days=1)

    best = 0
    run = 0
    prev: object = None
    for d in sorted(days):
        if prev is None or (d - prev).days == 1:
            run += 1
        else:
            run = 1
        if run > best:
            best = run
        prev = d

    return {
        "current": current,
        "best": best,
        "today_active": today_active,
        "last_active": max(days).isoformat(),
    }


def compute_topic_improvement(
    pdf_id: str,
    recent_days: int = 7,
    prior_days: int = 30,
) -> list[dict]:
    """Per-topic accuracy delta between the recent window and the prior
    window. Only topics with activity in BOTH windows and a positive
    improvement are returned. Sorted by improvement desc.

    A topic needs at least one quiz attempt or flashcard review in each
    window for the delta to be meaningful.
    """
    if not _is_configured():
        return []
    client = supabase.get_client()
    now = datetime.now(timezone.utc)
    prior_start = (now - timedelta(days=prior_days)).isoformat()

    quiz = (
        client.table("quiz_attempts")
        .select("topic,score,total,ts")
        .eq("pdf_id", pdf_id)
        .gte("ts", prior_start)
        .execute()
    )
    fc = (
        client.table("flashcard_reviews")
        .select("topic,correct,ts")
        .eq("pdf_id", pdf_id)
        .gte("ts", prior_start)
        .execute()
    )

    recent_cutoff = now - timedelta(days=recent_days)

    by_topic: dict[str, dict] = {}

    def _acc(s: dict, kind: str, correct: float, total: float) -> None:
        s[f"{kind}_correct"] += correct
        s[f"{kind}_total"] += total

    for r in quiz.data or []:
        try:
            ts = _parse_ts(r["ts"])
        except Exception:
            continue
        t = r.get("topic") or "_overall"
        s = by_topic.setdefault(
            t,
            {
                "recent_correct": 0.0,
                "recent_total": 0.0,
                "prior_correct": 0.0,
                "prior_total": 0.0,
            },
        )
        kind = "recent" if ts >= recent_cutoff else "prior"
        _acc(s, kind, float(r["score"]), float(r["total"]))

    for r in fc.data or []:
        try:
            ts = _parse_ts(r["ts"])
        except Exception:
            continue
        t = r.get("topic") or "_overall"
        s = by_topic.setdefault(
            t,
            {
                "recent_correct": 0.0,
                "recent_total": 0.0,
                "prior_correct": 0.0,
                "prior_total": 0.0,
            },
        )
        kind = "recent" if ts >= recent_cutoff else "prior"
        _acc(s, kind, 1.0 if r["correct"] else 0.0, 1.0)

    out: list[dict] = []
    for topic, s in by_topic.items():
        if s["recent_total"] <= 0 or s["prior_total"] <= 0:
            continue
        recent_acc = s["recent_correct"] / s["recent_total"]
        prior_acc = s["prior_correct"] / s["prior_total"]
        delta = recent_acc - prior_acc
        if delta <= 0:
            continue
        out.append(
            {
                "topic": None if topic == "_overall" else topic,
                "recent_accuracy": round(recent_acc, 4),
                "prior_accuracy": round(prior_acc, 4),
                "improvement": round(delta, 4),
                "recent_attempts": int(s["recent_total"]),
                "prior_attempts": int(s["prior_total"]),
            }
        )
    out.sort(key=lambda x: (-x["improvement"], x["topic"] or ""))
    return out


def compute_most_neglected_topics(
    pdf_id: str,
    days: int = 60,
    min_attempts: int = 2,
) -> list[dict]:
    """For each topic with at least `min_attempts` total attempts, find
    the most recent activity timestamp and compute the gap in days.

    Returns topics sorted by `days_since_last` desc (most neglected
    first). Topics with no activity in the `days` window are included
    with `last_activity` = None and `days_since_last` capped at `days`.

    This is the input the Study Planner will use to schedule revision
    for stale topics before they rot.
    """
    if not _is_configured():
        return []
    client = supabase.get_client()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    now = datetime.now(timezone.utc)

    quiz = (
        client.table("quiz_attempts")
        .select("topic,ts")
        .eq("pdf_id", pdf_id)
        .gte("ts", cutoff)
        .execute()
    )
    fc = (
        client.table("flashcard_reviews")
        .select("topic,ts")
        .eq("pdf_id", pdf_id)
        .gte("ts", cutoff)
        .execute()
    )

    by_topic: dict[str, dict] = {}
    for r in quiz.data or []:
        try:
            ts = _parse_ts(r["ts"])
        except Exception:
            continue
        t = r.get("topic") or "_overall"
        s = by_topic.setdefault(t, {"attempts": 0, "last_ts": None})
        s["attempts"] += 1
        if s["last_ts"] is None or ts > s["last_ts"]:
            s["last_ts"] = ts
    for r in fc.data or []:
        try:
            ts = _parse_ts(r["ts"])
        except Exception:
            continue
        t = r.get("topic") or "_overall"
        s = by_topic.setdefault(t, {"attempts": 0, "last_ts": None})
        s["attempts"] += 1
        if s["last_ts"] is None or ts > s["last_ts"]:
            s["last_ts"] = ts

    out: list[dict] = []
    for topic, s in by_topic.items():
        if s["attempts"] < min_attempts:
            continue
        if s["last_ts"] is None:
            days_since = days
        else:
            raw = int((now - s["last_ts"]).total_seconds() // 86400)
            days_since = min(days, max(0, raw))
        out.append(
            {
                "topic": None if topic == "_overall" else topic,
                "last_activity": (
                    s["last_ts"].isoformat() if s["last_ts"] else None
                ),
                "days_since_last": days_since,
                "total_attempts": s["attempts"],
            }
        )
    out.sort(key=lambda x: (-x["days_since_last"], x["topic"] or ""))
    return out
