import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.core.chunker import chunk_text
from app.core.embeddings import embed_texts
from app.core.llm import llm
from app.core.pdf_processor import PDFProcessor
from app.core.vector_store import vector_store
from app.db import database
from app.models.schemas import PDFInfo, UploadResponse

router = APIRouter()

ALLOWED_EXT = {".pdf"}
MAX_BYTES = 50 * 1024 * 1024


def _to_info(row: dict) -> PDFInfo:
    return PDFInfo(
        id=row["id"],
        original_name=row["original_name"],
        page_count=row["page_count"],
        chunk_count=row.get("chunk_count", 0),
        char_count=row.get("char_count", 0),
        created_at=row["created_at"],
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(400, "No filename provided")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Unsupported file type: {ext}. Only PDF allowed.")

    if not llm.is_available():
        raise HTTPException(503, "Ollama is not running. Start it with `ollama serve`.")

    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Empty file")
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            413, f"File too large. Max {MAX_BYTES // (1024 * 1024)} MB."
        )

    pdf_id = uuid.uuid4().hex[:12]
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_path = upload_dir / f"{pdf_id}{ext}"

    async with aiofiles.open(stored_path, "wb") as out:
        await out.write(contents)

    try:
        text = PDFProcessor.extract_text(stored_path)
        pages = PDFProcessor.page_count(stored_path)
    except Exception as e:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(400, f"Failed to read PDF: {e}")

    if not text.strip():
        stored_path.unlink(missing_ok=True)
        raise HTTPException(
            400, "PDF contains no extractable text (scanned/image-only PDF)."
        )

    chunks = chunk_text(text)
    chunk_embeddings = embed_texts(chunks)
    try:
        vector_store.add_chunks(pdf_id, chunks, embeddings=chunk_embeddings)
    except Exception as e:
        stored_path.unlink(missing_ok=True)
        vector_store.delete_pdf(pdf_id)
        raise HTTPException(500, f"Failed to index PDF: {e}")

    database.create_pdf(file.filename, str(stored_path), pages)
    database.update_pdf_stats(pdf_id, len(chunks), len(text))
    record = database.get_pdf(pdf_id)
    assert record is not None

    return UploadResponse(
        pdf=_to_info(record),
        message=f"Uploaded, extracted {pages} pages, indexed {len(chunks)} chunks",
    )


@router.get("", response_model=list[PDFInfo])
def list_uploaded() -> list[PDFInfo]:
    return [_to_info(r) for r in database.list_pdfs()]


@router.get("/{pdf_id}", response_model=PDFInfo)
def get_one(pdf_id: str) -> PDFInfo:
    row = database.get_pdf(pdf_id)
    if not row:
        raise HTTPException(404, "PDF not found")
    return _to_info(row)


@router.delete("/{pdf_id}")
def remove(pdf_id: str) -> dict:
    row = database.get_pdf(pdf_id)
    if not row:
        raise HTTPException(404, "PDF not found")
    Path(row["stored_path"]).unlink(missing_ok=True)
    vector_store.delete_pdf(pdf_id)
    database.delete_pdf(pdf_id)
    return {"deleted": pdf_id}
