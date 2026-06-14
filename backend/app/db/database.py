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
            """
            CREATE TABLE IF NOT EXISTS mastery_events (
                id TEXT PRIMARY KEY,
                pdf_id TEXT NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                correct INTEGER DEFAULT NULL,
                score REAL DEFAULT 0.0,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()

def create_mastery_event(
    pdf_id: str,
    event_type: str,
    correct: int | None = None,
    score: float = 0.0,
) -> dict:
    event_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO mastery_events (id, pdf_id, event_type, correct, score, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (event_id, pdf_id, event_type, correct, score, created_at),
        )
        conn.commit()
    return {
        "id": event_id,
        "pdf_id": pdf_id,
        "event_type": event_type,
        "correct": correct,
        "score": score,
        "created_at": created_at,
    }

def get_mastery_events(pdf_id: str, days: int = 30) -> list[dict]:
    cutoff = datetime.utcnow().isoformat()  # we'll filter in Python
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM mastery_events WHERE pdf_id = ? ORDER BY created_at DESC",
            (pdf_id,),
        ).fetchall()
    return [dict(r) for r in rows]

def get_all_mastery_summary() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT pdf_id, event_type, COUNT(*) as total, AVG(COALESCE(score, 0)) as avg_score "
            "FROM mastery_events GROUP BY pdf_id, event_type ORDER BY pdf_id"
        ).fetchall()
    return [dict(r) for r in rows]

def delete_mastery_events(pdf_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM mastery_events WHERE pdf_id = ?", (pdf_id,))
        conn.commit()

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
        rows = conn.execute(
            "SELECT * FROM pdfs ORDER BY created_at DESC, id DESC"
        ).fetchall()
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
        conn.execute("DELETE FROM mastery_events WHERE pdf_id = ?", (pdf_id,))
        conn.execute("DELETE FROM pdfs WHERE id = ?", (pdf_id,))
        conn.commit()
    return row
