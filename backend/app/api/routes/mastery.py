from fastapi import APIRouter, HTTPException

from app.db import database
from app.models.schemas import MasteryEventRequest, MasteryEventResponse, RecommendationsResponse
from app.services import mastery as mastery_service

router = APIRouter()


@router.post("/event", response_model=MasteryEventResponse)
def record_event(req: MasteryEventRequest) -> MasteryEventResponse:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")

    score = req.score if req.score is not None else (1.0 if req.correct else 0.0)
    correct_int = 1 if req.correct else 0 if req.correct is False else None

    event = mastery_service.record_and_recompute(
        pdf_id=req.pdf_id,
        event_type=req.event_type,
        topic_id=req.topic_id,
        correct=correct_int,
        score=score,
        metadata=req.metadata or {},
    )
    return MasteryEventResponse(
        id=event["id"],
        pdf_id=event["pdf_id"],
        topic_id=event.get("topic_id"),
        event_type=event["event_type"],
        correct=event["correct"],
        score=event["score"],
        metadata=event.get("metadata") or {},
        created_at=event["created_at"],
    )


@router.get("/{pdf_id}")
def get_pdf_mastery(pdf_id: str) -> dict:
    if not database.get_pdf(pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        return mastery_service.compute_pdf_mastery(pdf_id)
    except Exception as e:
        raise HTTPException(500, f"Failed to compute mastery: {e}")


@router.get("/summary/all")
def get_mastery_summary() -> list[dict]:
    try:
        return mastery_service.compute_all_mastery(use_cache=True)
    except Exception as e:
        raise HTTPException(500, f"Failed to compute mastery summary: {e}")


@router.get("/weak/all")
def get_weak_topics() -> list[dict]:
    try:
        all_mastery = mastery_service.compute_all_mastery(use_cache=True)
        all_mastery.sort(key=lambda d: d["mastery_score"])
        return all_mastery
    except Exception as e:
        raise HTTPException(500, f"Failed to compute weak topics: {e}")


@router.get("/recommendations/all", response_model=RecommendationsResponse)
def get_recommendations() -> RecommendationsResponse:
    try:
        recs = mastery_service.compute_recommendations()
        return RecommendationsResponse(recommendations=recs)
    except Exception as e:
        raise HTTPException(500, f"Failed to compute recommendations: {e}")
