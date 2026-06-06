from fastapi import APIRouter, HTTPException

from app.db import database
from app.models.schemas import SummaryRequest, SummaryResponse
from app.services import summarizer

router = APIRouter()


@router.post("", response_model=SummaryResponse)
def summarize(req: SummaryRequest) -> SummaryResponse:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        summary = summarizer.summarize_pdf(req.pdf_id, req.length)
    except FileNotFoundError:
        raise HTTPException(404, "PDF not found")
    except Exception as e:
        raise HTTPException(500, f"Summarization failed: {e}")
    return SummaryResponse(pdf_id=req.pdf_id, length=req.length, summary=summary)
