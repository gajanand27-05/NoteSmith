import pytest

from app.db import database


@pytest.fixture(autouse=True)
def _clean_db():
    database.init_db()
    with database._connect() as conn:
        conn.execute("DELETE FROM pdfs")
        conn.commit()
    yield


def test_init_db_creates_table():
    database.init_db()
    with database._connect() as conn:
        row = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='pdfs'"
        ).fetchone()
    assert row is not None
    assert row["name"] == "pdfs"


def test_create_and_get_pdf():
    database.init_db()
    pdf_id = "test001"
    rec = database.create_pdf(
        pdf_id=pdf_id,
        original_name="lecture.pdf",
        stored_path="/tmp/lecture.pdf",
        page_count=10,
    )
    assert rec["id"] == pdf_id
    assert rec["original_name"] == "lecture.pdf"
    assert rec["page_count"] == 10
    assert rec["chunk_count"] == 0

    got = database.get_pdf(pdf_id)
    assert got is not None
    assert got["id"] == pdf_id


def test_get_pdf_missing_returns_none():
    database.init_db()
    assert database.get_pdf("doesnotexist") is None


def test_list_pdfs_sorted_descending():
    database.init_db()
    database.create_pdf("id1", "a.pdf", "/tmp/a.pdf", 1)
    database.create_pdf("id2", "b.pdf", "/tmp/b.pdf", 2)
    database.create_pdf("id3", "c.pdf", "/tmp/c.pdf", 3)
    rows = database.list_pdfs()
    assert len(rows) == 3
    assert rows[0]["id"] == "id3"
    assert rows[-1]["id"] == "id1"


def test_update_pdf_stats():
    database.init_db()
    database.create_pdf("id1", "a.pdf", "/tmp/a.pdf", 1)
    database.update_pdf_stats("id1", chunk_count=15, char_count=1234)
    got = database.get_pdf("id1")
    assert got["chunk_count"] == 15
    assert got["char_count"] == 1234


def test_delete_pdf_removes_row():
    database.init_db()
    database.create_pdf("id1", "a.pdf", "/tmp/a.pdf", 1)
    deleted = database.delete_pdf("id1")
    assert deleted is not None
    assert database.get_pdf("id1") is None
