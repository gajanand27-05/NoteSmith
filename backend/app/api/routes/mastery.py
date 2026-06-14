from fastapi import APIRouter, HTTPException

from app.db import database
from app.models.schemas import MasteryEventRequest, MasteryEventResponse
from app.services import mastery as mastery_service

router = APIRouter()


@router.post("/event", response_model=MasteryEventResponse)
def record_event(req: MasteryEventRequest) -> MasteryEventResponse:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")

    # Normalize score: use correct field if score not provided
    score = req.score if req.score is not None else (1.0 if req.correct else 0.0)
    correct_int = 1 if req.correct else 0 if req.correct is False else None

    row = database.create_mastery_event(
        pdf_id=req.pdf_id,
        event_type=req.event_type,
        correct=correct_int,
        score=score,
    )
    return MasteryEventResponse(**row)


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
        return mastery_service.compute_all_mastery()
    except Exception as e:
        raise HTTPException(500, f"Failed to compute mastery summary: {e}")


@router.get("/weak/all")
def get_weak_topics() -> list[dict]:
    try:
        all_mastery = mastery_service.compute_all_mastery()
        all_mastery.sort(key=lambda d: d["mastery_score"])
        return all_mastery
    except Exception as e:
        raise HTTPException(500, f"Failed to compute weak topics: {e}")
