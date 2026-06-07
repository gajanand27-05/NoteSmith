import socket
from contextlib import closing

import pytest


def _port_free(host: str, port: int) -> bool:
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        try:
            sock.bind((host, port))
            return True
        except OSError:
            return False


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


def test_flashcards_invalid_count_422(client):
    r = client.post(
        "/api/flashcards/generate",
        json={"pdf_id": "x", "count": 2},
    )
    assert r.status_code == 422
    r = client.post(
        "/api/flashcards/generate",
        json={"pdf_id": "x", "count": 100},
    )
    assert r.status_code == 422


def test_flashcards_nonexistent_pdf_404(client):
    r = client.post(
        "/api/flashcards/generate",
        json={"pdf_id": "nope", "count": 10},
    )
    assert r.status_code == 404


def test_flashcards_generate_with_mocked_llm(client, monkeypatch):
    from app.api.routes import flashcards as flashcards_route
    from app.db import database

    database.init_db()
    database.create_pdf("fmock1", "ftest.pdf", "/tmp/ftest.pdf", 1)

    def fake_generate(pdf_id, count, topic=None):
        return (
            [
                {
                    "number": 1,
                    "front": "What is NLP?",
                    "back": "Natural Language Processing.",
                    "topic": "",
                },
                {
                    "number": 2,
                    "front": "Define token.",
                    "back": "A token is a unit of text.",
                    "topic": "",
                },
            ],
            "F1. What is NLP?\nB1. Natural Language Processing.\nF2. Define token.\nB2. A unit of text.",
        )

    monkeypatch.setattr(
        flashcards_route.flashcard_gen, "generate", fake_generate
    )

    r = client.post(
        "/api/flashcards/generate",
        json={"pdf_id": "fmock1", "count": 5},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["flashcards"]) == 2
    assert body["flashcards"][0]["front"] == "What is NLP?"
    assert body["raw_output"] == ""


def test_flashcards_include_raw_returns_text(client, monkeypatch):
    from app.api.routes import flashcards as flashcards_route
    from app.db import database

    database.init_db()
    database.create_pdf("fmock2", "ftest2.pdf", "/tmp/ftest2.pdf", 1)

    def fake_generate(pdf_id, count, topic=None):
        return (
            [],
            "F1. Freeform without B1.",
        )

    monkeypatch.setattr(
        flashcards_route.flashcard_gen, "generate", fake_generate
    )

    r = client.post(
        "/api/flashcards/generate",
        json={"pdf_id": "fmock2", "count": 5, "include_raw": True},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["flashcards"] == []
    assert "Freeform" in body["raw_output"]


def test_quiz_invalid_count_422(client):
    r = client.post(
        "/api/quiz/generate",
        json={"pdf_id": "x", "count": 2},
    )
    assert r.status_code == 422
    r = client.post(
        "/api/quiz/generate",
        json={"pdf_id": "x", "count": 50},
    )
    assert r.status_code == 422


def test_quiz_invalid_difficulty_422(client):
    r = client.post(
        "/api/quiz/generate",
        json={"pdf_id": "x", "count": 5, "difficulty": "impossible"},
    )
    assert r.status_code == 422


def test_quiz_nonexistent_pdf_404(client):
    r = client.post(
        "/api/quiz/generate",
        json={"pdf_id": "nope", "count": 5},
    )
    assert r.status_code == 404


def test_quiz_generate_with_mocked_llm(client, monkeypatch):
    from app.api.routes import quiz as quiz_route
    from app.db import database

    database.init_db()
    database.create_pdf("qzmock1", "qztest.pdf", "/tmp/qztest.pdf", 1)

    def fake_generate(pdf_id, count, difficulty="medium", topic=None):
        return (
            [
                {
                    "number": 1,
                    "question": "What is NLP?",
                    "options": [
                        {"label": "A", "text": "A language"},
                        {"label": "B", "text": "Natural Language Processing"},
                        {"label": "C", "text": "A library"},
                        {"label": "D", "text": "A database"},
                    ],
                    "correct": "B",
                    "explanation": "NLP stands for Natural Language Processing.",
                }
            ],
            "raw",
        )

    monkeypatch.setattr(
        quiz_route.quiz_gen, "generate", fake_generate
    )

    r = client.post(
        "/api/quiz/generate",
        json={"pdf_id": "qzmock1", "count": 3, "difficulty": "easy"},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["questions"]) == 1
    assert body["questions"][0]["correct"] == "B"
    assert body["questions"][0]["options"][1]["text"] == "Natural Language Processing"
    assert body["raw_output"] == ""


def test_quiz_include_raw_returns_text(client, monkeypatch):
    from app.api.routes import quiz as quiz_route
    from app.db import database

    database.init_db()
    database.create_pdf("qzmock2", "qztest2.pdf", "/tmp/qztest2.pdf", 1)

    def fake_generate(pdf_id, count, difficulty="medium", topic=None):
        return (
            [],
            "Q1. Freeform without options.",
        )

    monkeypatch.setattr(
        quiz_route.quiz_gen, "generate", fake_generate
    )

    r = client.post(
        "/api/quiz/generate",
        json={"pdf_id": "qzmock2", "count": 5, "include_raw": True},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["questions"] == []
    assert "Freeform" in body["raw_output"]


def test_tutor_invalid_level_422(client):
    r = client.post(
        "/api/tutor/explain",
        json={"concept": "Bayes Theorem", "level": "wizard"},
    )
    assert r.status_code == 422


def test_tutor_concept_required_422(client):
    r = client.post(
        "/api/tutor/explain",
        json={"level": "college"},
    )
    assert r.status_code == 422


def test_tutor_concept_too_long_422(client):
    r = client.post(
        "/api/tutor/explain",
        json={"concept": "x" * 201, "level": "college"},
    )
    assert r.status_code == 422


def test_tutor_explain_with_mocked_service(client, monkeypatch):
    from app.api.routes import tutor as tutor_route

    def fake_explain(concept, level, pdf_id=None, include_example=True, include_follow_ups=True):
        return {
            "concept": concept,
            "level": level,
            "explanation": f"Simple explanation of {concept}.",
            "example": "An example.",
            "follow_ups": ["Follow-up 1?", "Follow-up 2?", "Follow-up 3?"],
        }

    monkeypatch.setattr(tutor_route.tutor, "explain", fake_explain)

    r = client.post(
        "/api/tutor/explain",
        json={"concept": "Bayes Theorem", "level": "college"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["concept"] == "Bayes Theorem"
    assert body["level"] == "college"
    assert "Bayes Theorem" in body["explanation"]
    assert body["example"] == "An example."
    assert len(body["follow_ups"]) == 3


def test_tutor_explain_with_missing_pdf_404(client, monkeypatch):
    from app.api.routes import tutor as tutor_route

    def fake_explain(concept, level, pdf_id=None, include_example=True, include_follow_ups=True):
        from app.db import database
        if not database.get_pdf(pdf_id):
            raise HTTPException(404, "PDF not found")
        return {
            "concept": concept,
            "level": level,
            "explanation": "x",
            "example": "",
            "follow_ups": [],
        }

    monkeypatch.setattr(tutor_route.tutor, "explain", fake_explain)

    r = client.post(
        "/api/tutor/explain",
        json={"concept": "Tokenization", "level": "kid", "pdf_id": "nonexistent"},
    )
    assert r.status_code == 404


def test_papers_analyze_requires_two_pdfs_422(client):
    r = client.post(
        "/api/papers/analyze",
        json={"pdf_ids": ["only_one"]},
    )
    assert r.status_code == 422


def test_papers_analyze_caps_at_ten_422(client):
    r = client.post(
        "/api/papers/analyze",
        json={"pdf_ids": [f"p{i}" for i in range(11)]},
    )
    assert r.status_code == 422


def test_papers_analyze_num_predictions_bounds_422(client):
    r = client.post(
        "/api/papers/analyze",
        json={"pdf_ids": ["a", "b"], "num_predictions": 0},
    )
    assert r.status_code == 422
    r = client.post(
        "/api/papers/analyze",
        json={"pdf_ids": ["a", "b"], "num_predictions": 20},
    )
    assert r.status_code == 422


def test_papers_analyze_with_mocked_service(client, monkeypatch):
    from app.api.routes import papers as papers_route

    def fake_analyze(pdf_ids, years=None, target_year=None, num_predictions=5):
        return {
            "papers": [
                {
                    "pdf_id": "p1",
                    "filename": "qp1.pdf",
                    "year": 2024,
                    "question_count": 2,
                    "questions": [
                        {"number": 1, "text": "Q1", "marks": 5, "topic": "T", "year": 2024},
                    ],
                },
                {
                    "pdf_id": "p2",
                    "filename": "qp2.pdf",
                    "year": 2025,
                    "question_count": 1,
                    "questions": [],
                },
            ],
            "topics": [
                {
                    "topic": "T",
                    "count": 1,
                    "years": [2024],
                    "paper_ids": ["p1"],
                    "trend": "stable",
                }
            ],
            "predicted": [
                {
                    "number": 1,
                    "question": "Predicted?",
                    "topic": "T",
                    "confidence": 0.8,
                    "reasoning": "Common topic",
                    "marks": 5,
                }
            ],
            "target_year": 2026,
        }

    monkeypatch.setattr(papers_route.paper_analyzer, "analyze_papers", fake_analyze)

    r = client.post(
        "/api/papers/analyze",
        json={"pdf_ids": ["p1", "p2"], "years": [2024, 2025], "target_year": 2026},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["target_year"] == 2026
    assert len(body["papers"]) == 2
    assert body["papers"][0]["filename"] == "qp1.pdf"
    assert len(body["topics"]) == 1
    assert body["topics"][0]["topic"] == "T"
    assert len(body["predicted"]) == 1
    assert body["predicted"][0]["confidence"] == 0.8


def test_papers_analyze_service_value_error_400(client, monkeypatch):
    from app.api.routes import papers as papers_route

    def fake_analyze(pdf_ids, years=None, target_year=None, num_predictions=5):
        raise ValueError("Need at least 2 question papers")

    monkeypatch.setattr(papers_route.paper_analyzer, "analyze_papers", fake_analyze)

    r = client.post(
        "/api/papers/analyze",
        json={"pdf_ids": ["a", "b"]},
    )
    assert r.status_code == 400
