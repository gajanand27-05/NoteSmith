from pydantic import BaseModel

from fastapi import APIRouter, HTTPException

from app.db import database
from app.models.schemas import QuizRequest, QuizResponse
from app.services import quiz_gen
from app.services import mastery as mastery_service


class QuizSubmitRequest(BaseModel):
    pdf_id: str
    question_number: int
    correct: bool
    topic_id: str | None = None

router = APIRouter()


@router.post("/generate", response_model=QuizResponse)
def generate(req: QuizRequest) -> QuizResponse:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        questions, raw = quiz_gen.generate(
            req.pdf_id, req.count, req.difficulty, req.topic
        )
    except FileNotFoundError:
        raise HTTPException(404, "PDF not found")
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Quiz generation failed: {e}")

    return QuizResponse(
        pdf_id=req.pdf_id,
        questions=questions,
        raw_output=raw if req.include_raw else "",
    )


@router.post("/submit")
def submit_quiz_answer(req: QuizSubmitRequest) -> dict:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    score = 1.0 if req.correct else 0.0
    event = mastery_service.record_and_recompute(
        pdf_id=req.pdf_id,
        event_type="QUIZ",
        topic_id=req.topic_id,
        correct=1 if req.correct else 0,
        score=score,
        metadata={"question_number": req.question_number},
    )
    return {"status": "recorded", "event": event}
