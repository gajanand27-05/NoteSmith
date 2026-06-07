from fastapi import APIRouter, HTTPException

from app.core import rag_pipeline
from app.db import database
from app.models.schemas import QARequest, QAResponse, QASource

router = APIRouter()


@router.post("", response_model=QAResponse)
def ask(req: QARequest) -> QAResponse:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        result = rag_pipeline.answer_question(req.pdf_id, req.question, req.top_k)
    except Exception as e:
        raise HTTPException(500, f"Q&A failed: {e}")
    sources = [
        QASource(
            text=s.get("text", ""),
            distance=float(s.get("distance", 0.0)),
            metadata=s.get("metadata") or {},
        )
        for s in result.get("sources", [])
    ]
    return QAResponse(
        pdf_id=req.pdf_id,
        question=req.question,
        answer=result.get("answer", ""),
        sources=sources,
    )
