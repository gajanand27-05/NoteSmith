from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core import rag_pipeline
from app.db import database
from app.models.schemas import QARequest, QAResponse, QASource

router = APIRouter()


def record_qa_event(pdf_id: str) -> None:
    database.create_mastery_event(
        pdf_id=pdf_id,
        event_type="qa_asked",
        correct=None,
        score=0.5,
    )


@router.post("", response_model=QAResponse)
def ask(req: QARequest, background_tasks: BackgroundTasks) -> QAResponse:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        result = rag_pipeline.answer_question(req.pdf_id, req.question, req.top_k)
        background_tasks.add_task(record_qa_event, req.pdf_id)
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
