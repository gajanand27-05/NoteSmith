from fastapi import APIRouter, HTTPException

from app.db import database
from app.models.schemas import QuestionRequest, QuestionResponse
from app.services import question_gen

router = APIRouter()


@router.post("/generate", response_model=QuestionResponse)
def generate(req: QuestionRequest) -> QuestionResponse:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        questions, raw = question_gen.generate(
            req.pdf_id, req.marks, req.count, req.topic
        )
    except FileNotFoundError:
        raise HTTPException(404, "PDF not found")
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Question generation failed: {e}")

    return QuestionResponse(
        pdf_id=req.pdf_id,
        marks=req.marks,
        questions=questions,
        raw_output=raw if req.include_raw else "",
    )
