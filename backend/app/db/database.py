import json
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
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pdfs (
                id TEXT PRIMARY KEY,
                original_name TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                page_count INTEGER NOT NULL,
                chunk_count INTEGER DEFAULT 0,
                char_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS mastery_events (
                id TEXT PRIMARY KEY,
                pdf_id TEXT NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
                topic_id TEXT,
                event_type TEXT NOT NULL,
                correct INTEGER DEFAULT NULL,
                score REAL DEFAULT 0.0,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL
            )
        """)
        # Migration: recreate mastery_scores if it has old single-column PK
        cols = conn.execute("PRAGMA table_info(mastery_scores)").fetchall()
        old_single_pk = any(r[5] == 1 and r[1] == "pdf_id" for r in cols) and not any(r[5] == 2 for r in cols)
        if old_single_pk:
            conn.execute("DROP TABLE IF EXISTS mastery_scores")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS mastery_scores (
                pdf_id TEXT NOT NULL,
                topic_id TEXT,
                mastery REAL DEFAULT 0.0,
                total_events INTEGER DEFAULT 0,
                breakdown TEXT DEFAULT '{}',
                updated_at TEXT NOT NULL,
                PRIMARY KEY (pdf_id, topic_id),
                FOREIGN KEY (pdf_id) REFERENCES pdfs(id) ON DELETE CASCADE
            )
        """)
        conn.commit()


# ─── PDF CRUD ────────────────────────────────────────────────────────────────

def create_pdf(pdf_id: str, original_name: str, stored_path: str, page_count: int) -> dict:
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
        conn.execute("DELETE FROM mastery_scores WHERE pdf_id = ?", (pdf_id,))
        conn.execute("DELETE FROM mastery_events WHERE pdf_id = ?", (pdf_id,))
        conn.execute("DELETE FROM pdfs WHERE id = ?", (pdf_id,))
        conn.commit()
    return row


# ─── Mastery Events ───────────────────────────────────────────────────────────

def create_mastery_event(
    pdf_id: str,
    event_type: str,
    topic_id: str | None = None,
    correct: int | None = None,
    score: float = 0.0,
    metadata: dict | None = None,
) -> dict:
    event_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    meta_json = json.dumps(metadata or {})
    with _connect() as conn:
        conn.execute(
            "INSERT INTO mastery_events (id, pdf_id, topic_id, event_type, correct, score, metadata, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (event_id, pdf_id, topic_id, event_type, correct, score, meta_json, created_at),
        )
        conn.commit()
    return {
        "id": event_id,
        "pdf_id": pdf_id,
        "topic_id": topic_id,
        "event_type": event_type,
        "correct": correct,
        "score": score,
        "metadata": metadata or {},
        "created_at": created_at,
    }


def get_mastery_events(pdf_id: str, days: int | None = None) -> list[dict]:
    with _connect() as conn:
        if days:
            cutoff = datetime.utcnow().isoformat()
            rows = conn.execute(
                "SELECT * FROM mastery_events WHERE pdf_id = ? ORDER BY created_at DESC",
                (pdf_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM mastery_events WHERE pdf_id = ? ORDER BY created_at DESC",
                (pdf_id,),
            ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["metadata"] = json.loads(d.get("metadata", "{}"))
        except (json.JSONDecodeError, TypeError):
            d["metadata"] = {}
        result.append(d)
    return result


def get_all_events(days: int | None = None) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM mastery_events ORDER BY created_at DESC"
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["metadata"] = json.loads(d.get("metadata", "{}"))
        except (json.JSONDecodeError, TypeError):
            d["metadata"] = {}
        result.append(d)
    return result


def delete_mastery_events(pdf_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM mastery_events WHERE pdf_id = ?", (pdf_id,))
        conn.commit()


# ─── Mastery Scores (cached) ─────────────────────────────────────────────────

def upsert_mastery_score(
    pdf_id: str,
    topic_id: str | None,
    mastery: float,
    total_events: int,
    breakdown: dict,
) -> None:
    updated_at = datetime.utcnow().isoformat()
    breakdown_json = json.dumps(breakdown)
    with _connect() as conn:
        conn.execute(
            "INSERT INTO mastery_scores (pdf_id, topic_id, mastery, total_events, breakdown, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(pdf_id, topic_id) DO UPDATE SET "
            "mastery = excluded.mastery, total_events = excluded.total_events, "
            "breakdown = excluded.breakdown, updated_at = excluded.updated_at",
            (pdf_id, topic_id, mastery, total_events, breakdown_json, updated_at),
        )
        conn.commit()


def get_mastery_score(pdf_id: str, topic_id: str | None = None) -> dict | None:
    with _connect() as conn:
        if topic_id:
            row = conn.execute(
                "SELECT * FROM mastery_scores WHERE pdf_id = ? AND topic_id = ?",
                (pdf_id, topic_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM mastery_scores WHERE pdf_id = ? AND topic_id IS NULL",
                (pdf_id,),
            ).fetchone()
    if row:
        d = dict(row)
        try:
            d["breakdown"] = json.loads(d.get("breakdown", "{}"))
        except (json.JSONDecodeError, TypeError):
            d["breakdown"] = {}
        return d
    return None


def list_mastery_scores() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM mastery_scores ORDER BY mastery ASC"
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["breakdown"] = json.loads(d.get("breakdown", "{}"))
        except (json.JSONDecodeError, TypeError):
            d["breakdown"] = {}
        result.append(d)
    return result


def delete_mastery_scores(pdf_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM mastery_scores WHERE pdf_id = ?", (pdf_id,))
        conn.commit()
