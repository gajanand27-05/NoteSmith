from fastapi import APIRouter

from app.services import weekly_intel

router = APIRouter()


@router.get("/weekly")
def get_weekly_report():
    return weekly_intel.generate_weekly_report()
