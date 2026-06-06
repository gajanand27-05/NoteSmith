from fastapi import APIRouter, HTTPException

from app.db import database
from app.models.schemas import TutorRequest, TutorResponse
from app.services import tutor

router = APIRouter()


@router.post("/explain", response_model=TutorResponse)
def explain(req: TutorRequest) -> TutorResponse:
    if req.pdf_id and not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        result = tutor.explain(
            concept=req.concept,
            level=req.level,
            pdf_id=req.pdf_id,
            include_example=req.include_example,
            include_follow_ups=req.include_follow_ups,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Tutor failed: {e}")
    return TutorResponse(**result)
