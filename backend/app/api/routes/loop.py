from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import learning_loop

router = APIRouter()


class QuizResultRequest(BaseModel):
    pdf_id: str = Field(min_length=1)
    topic: str | None = None
    score: int = Field(ge=0)
    total: int = Field(ge=1)


class FlashcardResultRequest(BaseModel):
    pdf_id: str = Field(min_length=1)
    topic: str | None = None
    card_index: int = Field(ge=0)
    correct: bool


class TutorLogRequest(BaseModel):
    concept: str = Field(min_length=1, max_length=200)
    level: str = Field(min_length=1, max_length=50)
    pdf_id: str | None = None


@router.post("/quiz-result")
def post_quiz_result(req: QuizResultRequest) -> dict:
    if req.score > req.total:
        raise HTTPException(422, "score cannot exceed total")
    try:
        row = learning_loop.record_quiz_attempt(
            req.pdf_id, req.topic, req.score, req.total
        )
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to record quiz attempt: {e}")
    return {"recorded": True, "id": row.get("id")}


@router.post("/flashcard-result")
def post_flashcard_result(req: FlashcardResultRequest) -> dict:
    try:
        row = learning_loop.record_flashcard_review(
            req.pdf_id, req.topic, req.card_index, req.correct
        )
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to record flashcard review: {e}")
    return {"recorded": True, "id": row.get("id")}


@router.post("/tutor-log")
def post_tutor_log(req: TutorLogRequest) -> dict:
    try:
        row = learning_loop.record_tutor_session(
            req.pdf_id, req.concept, req.level
        )
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to log tutor session: {e}")
    return {"recorded": True, "id": row.get("id")}


@router.get("/weak-topics/{pdf_id}")
def get_weak_topics(
    pdf_id: str,
    days: int = Query(default=30, ge=1, le=365),
) -> dict:
    try:
        topics = learning_loop.compute_weak_topics(pdf_id, days=days)
        overall = learning_loop.get_overall_weakness(pdf_id, days=days)
    except Exception as e:
        raise HTTPException(500, f"Failed to compute weak topics: {e}")
    return {
        "pdf_id": pdf_id,
        "days": days,
        "overall": overall,
        "topics": topics,
    }
