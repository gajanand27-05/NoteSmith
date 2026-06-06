from fastapi import APIRouter, HTTPException

from app.db import database
from app.models.schemas import QuizRequest, QuizResponse
from app.services import quiz_gen

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
