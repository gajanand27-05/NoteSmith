import logging
from typing import Any

from supabase import Client, create_client

from app.config import settings

logger = logging.getLogger(__name__)

SCHEMA_STATEMENTS: list[str] = [
    """
    create table if not exists quiz_attempts (
        id bigserial primary key,
        pdf_id text not null,
        topic text,
        score int not null,
        total int not null,
        ts timestamptz not null default now()
    )
    """,
    """
    create index if not exists quiz_attempts_pdf_topic_ts
        on quiz_attempts (pdf_id, topic, ts desc)
    """,
    """
    create table if not exists flashcard_reviews (
        id bigserial primary key,
        pdf_id text not null,
        topic text,
        card_index int not null,
        correct bool not null,
        ts timestamptz not null default now()
    )
    """,
    """
    create index if not exists flashcard_reviews_pdf_topic_ts
        on flashcard_reviews (pdf_id, topic, ts desc)
    """,
    """
    create table if not exists tutor_sessions (
        id bigserial primary key,
        pdf_id text,
        concept text not null,
        level text not null,
        ts timestamptz not null default now()
    )
    """,
    """
    create index if not exists tutor_sessions_pdf_ts
        on tutor_sessions (pdf_id, ts desc)
    """,
]


_is_reachable = False

def is_configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_role_key)

def is_ready() -> bool:
    return is_configured() and _is_reachable

def get_client() -> Client | None:
    if not is_configured():
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)

def init_schema() -> bool:
    """Create tables/indexes if missing. Uses the direct Postgres URL
    (psycopg2) because the Supabase REST client cannot run DDL.

    Returns True if schema was ensured, False otherwise.
    """
    if not settings.supabase_db_url:
        logger.warning(
            "SUPABASE_DB_URL is not set - skipping auto table creation. "
            "Set it in .env to enable Study Loop history."
        )
        return False
    try:
        import psycopg2
    except ImportError:
        logger.error("psycopg2 not installed")
        return False
    try:
        conn = psycopg2.connect(settings.supabase_db_url)
        conn.autocommit = True
        with conn.cursor() as cur:
            for stmt in SCHEMA_STATEMENTS:
                cur.execute(stmt)
        conn.close()
        logger.info("Supabase schema ensured (%d statements)", len(SCHEMA_STATEMENTS))
        return True
    except Exception as e:
        logger.error("Failed to ensure Supabase schema: %s", e)
        return False

def init_supabase() -> dict[str, Any]:
    """Called on FastAPI startup. Returns a status dict for logging."""
    global _is_reachable
    status: dict[str, Any] = {
        "configured": is_configured(),
        "schema_ready": False,
    }
    if not is_configured():
        logger.warning(
            "Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). "
            "Study Loop history will be disabled."
        )
        return status
    status["schema_ready"] = init_schema()
    try:
        client = get_client()
        client.table("quiz_attempts").select("id").limit(1).execute()
        status["reachable"] = True
        _is_reachable = True
    except Exception as e:
        status["reachable"] = False
        _is_reachable = False
        status["error"] = str(e)
        logger.error("Supabase client cannot reach tables: %s", e)
    return status
