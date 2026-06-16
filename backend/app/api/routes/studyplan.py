from fastapi import APIRouter, Query

from app.services import study_plan

router = APIRouter()


@router.get("/plan")
def get_study_plan(
    pdf_id: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
):
    return study_plan.generate_plan(pdf_id=pdf_id, limit=limit)
