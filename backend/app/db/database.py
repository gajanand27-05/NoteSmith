import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from app.config import settings

DB_PATH = Path(settings.upload_dir).parent / "notesmith.db"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS pdfs (
                id TEXT PRIMARY KEY,
                original_name TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                page_count INTEGER NOT NULL,
                chunk_count INTEGER DEFAULT 0,
                char_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def create_pdf(
    pdf_id: str,
    original_name: str,
    stored_path: str,
    page_count: int,
) -> dict:
    created_at = datetime.utcnow().isoformat()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO pdfs (id, original_name, stored_path, page_count, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (pdf_id, original_name, stored_path, page_count, created_at),
        )
        conn.commit()
    row = get_pdf(pdf_id)
    assert row is not None
    return row


def get_pdf(pdf_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM pdfs WHERE id = ?", (pdf_id,)).fetchone()
    return dict(row) if row else None


def list_pdfs() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM pdfs ORDER BY created_at DESC").fetchall()
    return [dict(r) for r in rows]


def update_pdf_stats(pdf_id: str, chunk_count: int, char_count: int) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE pdfs SET chunk_count = ?, char_count = ? WHERE id = ?",
            (chunk_count, char_count, pdf_id),
        )
        conn.commit()


def delete_pdf(pdf_id: str) -> dict | None:
    row = get_pdf(pdf_id)
    if not row:
        return None
    with _connect() as conn:
        conn.execute("DELETE FROM pdfs WHERE id = ?", (pdf_id,))
        conn.commit()
    return row
