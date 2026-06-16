from app.services import mastery as mastery_service


RECOMMENDED_ACTIONS = {
    "high": ["flashcards", "quiz", "tutor"],
    "medium": ["quiz", "flashcards", "tutor"],
    "low": ["quiz", "tutor"],
}


def _compute_risk(mastery_score: float) -> str:
    if mastery_score < 30:
        return "high"
    if mastery_score < 60:
        return "medium"
    return "low"


def _compute_target(mastery_score: float) -> int:
    if mastery_score < 30:
        return 50
    if mastery_score < 50:
        return 65
    if mastery_score < 70:
        return 80
    return min(100, mastery_score + 15)


def generate_plan(pdf_id: str | None = None, limit: int = 10) -> dict:
    all_mastery = mastery_service.compute_all_mastery(use_cache=True)

    if not all_mastery:
        return {
            "plan": None,
            "queue": [],
            "message": "Upload a document and start studying to get a study plan.",
        }

    all_mastery.sort(key=lambda d: d["mastery_score"])

    if pdf_id:
        target = next(
            (d for d in all_mastery if d["pdf_id"] == pdf_id), all_mastery[0]
        )
    else:
        target = all_mastery[0]

    risk = _compute_risk(target["mastery_score"])
    recommended = RECOMMENDED_ACTIONS.get(risk, ["flashcards", "quiz", "tutor"])

    # Build learning queue
    queue = []
    for d in all_mastery[:limit]:
        d_risk = _compute_risk(d["mastery_score"])
        d_recommended = RECOMMENDED_ACTIONS.get(d_risk, ["flashcards", "quiz"])
        queue.append(
            {
                "pdf_id": d["pdf_id"],
                "pdf_name": d["pdf_name"],
                "mastery": d["mastery_score"],
                "trend": d.get("trend", 0),
                "risk": d_risk,
                "recommended_actions": d_recommended,
                "total_events": d.get("total_events", 0),
            }
        )

    plan = {
        "pdf_id": target["pdf_id"],
        "pdf_name": target["pdf_name"],
        "mastery": target["mastery_score"],
        "trend": target.get("trend", 0),
        "risk": risk,
        "target": _compute_target(target["mastery_score"]),
        "recommended_actions": recommended,
        "total_events": target.get("total_events", 0),
    }

    return {
        "plan": plan,
        "queue": queue,
        "message": None,
    }
