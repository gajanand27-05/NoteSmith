from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse

from app.core import rag_pipeline
from app.db import database
from app.models.schemas import QARequest, QAResponse, QASource
from app.services import mastery as mastery_service

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

    background_tasks.add_task(record_qa_event, req.pdf_id, req.topic_id)

    return StreamingResponse(
        rag_pipeline.answer_question_stream(req.pdf_id, req.question, req.top_k),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
