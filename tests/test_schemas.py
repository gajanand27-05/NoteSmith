import pytest
from pydantic import ValidationError

from app.models.schemas import (
    PDFInfo,
    QARequest,
    QAResponse,
    QASource,
    SummaryRequest,
    SummaryResponse,
    UploadResponse,
)


def test_pdf_info_valid():
    info = PDFInfo(
        id="abc123",
        original_name="unit1.pdf",
        page_count=12,
        chunk_count=24,
        char_count=8000,
        created_at="2026-06-06T10:00:00",
    )
    assert info.id == "abc123"
    assert info.page_count == 12


def test_summary_request_accepts_valid_lengths():
    for length in ("short", "medium", "long"):
        req = SummaryRequest(pdf_id="x", length=length)
        assert req.length == length


def test_summary_request_rejects_bad_length():
    with pytest.raises(ValidationError):
        SummaryRequest(pdf_id="x", length="xl")


def test_summary_response_roundtrip():
    r = SummaryResponse(pdf_id="x", length="medium", summary="Hello world.")
    assert r.summary == "Hello world."
    assert r.length == "medium"


def test_qa_request_top_k_bounds():
    QARequest(pdf_id="x", question="q", top_k=1)
    QARequest(pdf_id="x", question="q", top_k=20)
    with pytest.raises(ValidationError):
        QARequest(pdf_id="x", question="q", top_k=0)
    with pytest.raises(ValidationError):
        QARequest(pdf_id="x", question="q", top_k=21)


def test_qa_response_with_sources():
    src = QASource(text="snippet", distance=0.123, metadata={"page": 1})
    r = QAResponse(
        pdf_id="x",
        question="What is X?",
        answer="X is ...",
        sources=[src],
    )
    assert r.sources[0].distance == pytest.approx(0.123)
    assert r.sources[0].metadata == {"page": 1}


def test_upload_response_defaults_message():
    info = PDFInfo(
        id="a",
        original_name="f.pdf",
        page_count=1,
        chunk_count=0,
        char_count=0,
        created_at="now",
    )
    r = UploadResponse(pdf=info)
    assert r.message == "Uploaded and indexed"
