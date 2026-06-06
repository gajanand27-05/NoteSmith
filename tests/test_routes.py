import socket
from contextlib import closing

import pytest
from fastapi.testclient import TestClient


def _port_free(host: str, port: int) -> bool:
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        try:
            sock.bind((host, port))
            return True
        except OSError:
            return False


@pytest.fixture(scope="module")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_root_endpoint(client):
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "running"
    assert "name" in body
    assert body["docs"] == "/docs"


def test_health_endpoint(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_ollama_status_shape(client):
    r = client.get("/api/ollama/status")
    assert r.status_code == 200
    body = r.json()
    for key in ("available", "base_url", "chat_model", "embed_model", "models"):
        assert key in body


def test_list_pdfs_empty_or_returns_list(client):
    r = client.get("/api/pdfs")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_get_nonexistent_pdf_404(client):
    r = client.get("/api/pdfs/nonexistent_id")
    assert r.status_code == 404


def test_upload_non_pdf_400(client):
    r = client.post(
        "/api/pdfs/upload",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 400


def test_qa_on_nonexistent_pdf_404(client):
    r = client.post(
        "/api/qa",
        json={"pdf_id": "nope", "question": "What?"},
    )
    assert r.status_code == 404


def test_summarize_on_nonexistent_pdf_404(client):
    r = client.post(
        "/api/summarize",
        json={"pdf_id": "nope", "length": "short"},
    )
    assert r.status_code == 404


def test_questions_invalid_marks_422(client):
    r = client.post(
        "/api/questions/generate",
        json={"pdf_id": "x", "marks": 7, "count": 3},
    )
    assert r.status_code == 422


def test_questions_invalid_count_422(client):
    r = client.post(
        "/api/questions/generate",
        json={"pdf_id": "x", "marks": 5, "count": 0},
    )
    assert r.status_code == 422
    r = client.post(
        "/api/questions/generate",
        json={"pdf_id": "x", "marks": 5, "count": 99},
    )
    assert r.status_code == 422


def test_questions_nonexistent_pdf_404(client):
    r = client.post(
        "/api/questions/generate",
        json={"pdf_id": "nope", "marks": 5, "count": 3},
    )
    assert r.status_code == 404


def test_questions_generate_with_mocked_llm(client, monkeypatch):
    from app.api.routes import questions as questions_route
    from app.db import database

    database.init_db()
    database.create_pdf("qmock1", "qtest.pdf", "/tmp/qtest.pdf", 1)

    def fake_generate(pdf_id, marks, count, topic=None):
        return (
            [
                {
                    "number": 1,
                    "marks": marks,
                    "question": "What is NLP?",
                    "answer": "Natural Language Processing.",
                    "topic": "",
                }
            ],
            "Q1. What is NLP?\nA1. Natural Language Processing.",
        )

    monkeypatch.setattr(
        questions_route.question_gen, "generate", fake_generate
    )

    r = client.post(
        "/api/questions/generate",
        json={"pdf_id": "qmock1", "marks": 2, "count": 1},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["marks"] == 2
    assert len(body["questions"]) == 1
    assert body["questions"][0]["question"] == "What is NLP?"
    assert body["raw_output"] == ""


def test_questions_include_raw_returns_text(client, monkeypatch):
    from app.api.routes import questions as questions_route
    from app.db import database

    database.init_db()
    database.create_pdf("qmock2", "qtest2.pdf", "/tmp/qtest2.pdf", 1)

    def fake_generate(pdf_id, marks, count, topic=None):
        return (
            [],
            "Q1. Freeform without A1.",
        )

    monkeypatch.setattr(
        questions_route.question_gen, "generate", fake_generate
    )

    r = client.post(
        "/api/questions/generate",
        json={"pdf_id": "qmock2", "marks": 5, "count": 1, "include_raw": True},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["questions"] == []
    assert "Freeform" in body["raw_output"]
