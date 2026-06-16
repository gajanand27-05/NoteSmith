from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from app.services import report_gen

router = APIRouter()


@router.get("/mastery", response_class=PlainTextResponse)
def mastery_report():
    return report_gen.generate_mastery_report()


@router.get("/weekly", response_class=PlainTextResponse)
def weekly_summary():
    return report_gen.generate_weekly_summary()


@router.get("/full", response_class=PlainTextResponse)
def full_report():
    return report_gen.generate_full_report()
