from pydantic import BaseModel

from fastapi import APIRouter, HTTPException

from app.db import database
from app.models.schemas import FlashcardRequest, FlashcardResponse
from app.services import flashcard_gen
from app.services import mastery as mastery_service


class FlashcardReviewRequest(BaseModel):
    pdf_id: str
    card_number: int
    correct: bool
    confidence: str | None = None
    topic_id: str | None = None

router = APIRouter()


@router.post("/generate", response_model=FlashcardResponse)
def generate(req: FlashcardRequest) -> FlashcardResponse:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        cards, raw = flashcard_gen.generate(req.pdf_id, req.count, req.topic)
    except FileNotFoundError:
        raise HTTPException(404, "PDF not found")
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Flashcard generation failed: {e}")

    return FlashcardResponse(
        pdf_id=req.pdf_id,
        flashcards=cards,
        raw_output=raw if req.include_raw else "",
    )


@router.post("/review")
def review_flashcard(req: FlashcardReviewRequest) -> dict:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    score = 1.0 if req.correct else 0.0
    metadata = {
        "card_number": req.card_number,
        "confidence": req.confidence,
    }
    event = mastery_service.record_and_recompute(
        pdf_id=req.pdf_id,
        event_type="FLASHCARD",
        topic_id=req.topic_id,
        correct=1 if req.correct else 0,
        score=score,
        metadata=metadata,
    )
    return {"status": "recorded", "event": event}
