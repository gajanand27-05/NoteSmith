import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse

from app.core import rag_pipeline
from app.db import database
from app.models.schemas import QARequest, QAResponse, QASource
from app.services import mastery as mastery_service

logger = logging.getLogger(__name__)

router = APIRouter()


def record_qa_event(pdf_id: str, topic_id: str | None = None) -> None:
    mastery_service.record_and_recompute(
        pdf_id=pdf_id,
        event_type="QA",
        topic_id=topic_id,
        correct=None,
        score=0.5,
        metadata={"question": "qa_session"},
    )


@router.post("", response_model=QAResponse)
def ask(req: QARequest, background_tasks: BackgroundTasks) -> QAResponse:
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        result = rag_pipeline.answer_question(req.pdf_id, req.question, req.top_k)
        background_tasks.add_task(record_qa_event, req.pdf_id, req.topic_id)
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


@router.post("/stream")
async def ask_stream(req: QARequest, background_tasks: BackgroundTasks):
    if not database.get_pdf(req.pdf_id):
        raise HTTPException(404, "PDF not found")

    # Capture mastery before Q&A event
    before = mastery_service.compute_pdf_mastery(req.pdf_id)
    before_score = before.get("mastery_score", 0.0)

    # Record mastery event synchronously so it's available when stream ends
    try:
        record_qa_event(req.pdf_id, req.topic_id)
    except Exception as e:
        logger.warning("Failed to record QA mastery event: %s", e)

    after = mastery_service.compute_pdf_mastery(req.pdf_id)
    after_score = after.get("mastery_score", 0.0)

    mastery_update = {
        "before": round(before_score, 1),
        "after": round(after_score, 1),
        "delta": round(after_score - before_score, 1),
    }

    return StreamingResponse(
        rag_pipeline.answer_question_stream(req.pdf_id, req.question, req.top_k, mastery_update=mastery_update),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
