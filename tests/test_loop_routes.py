from app.api.routes import loop as loop_route


def test_loop_quiz_result_unconfigured_returns_503(client, monkeypatch):
    from app.services import learning_loop

    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: False)
    r = client.post(
        "/api/loop/quiz-result",
        json={"pdf_id": "p1", "score": 1, "total": 2, "topic": None},
    )
    assert r.status_code == 503


def test_loop_quiz_result_validates_score_bounds(client):
    r = client.post(
        "/api/loop/quiz-result",
        json={"pdf_id": "p1", "score": -1, "total": 2},
    )
    assert r.status_code == 422
    r = client.post(
        "/api/loop/quiz-result",
        json={"pdf_id": "p1", "score": 3, "total": 2},
    )
    assert r.status_code == 422
    r = client.post(
        "/api/loop/quiz-result",
        json={"pdf_id": "p1", "score": 1, "total": 0},
    )
    assert r.status_code == 422


def test_loop_quiz_result_rejects_score_exceeding_total(client, monkeypatch):
    from app.services import learning_loop

    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: True)

    def fake_record(pdf_id, topic, score, total):
        return {"id": 1}

    monkeypatch.setattr(learning_loop, "record_quiz_attempt", fake_record)
    r = client.post(
        "/api/loop/quiz-result",
        json={"pdf_id": "p1", "score": 5, "total": 3},
    )
    assert r.status_code == 422


def test_loop_quiz_result_records_and_returns_id(client, monkeypatch):
    from app.services import learning_loop

    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: True)

    def fake_record(pdf_id, topic, score, total):
        return {"id": 42}

    monkeypatch.setattr(learning_loop, "record_quiz_attempt", fake_record)
    r = client.post(
        "/api/loop/quiz-result",
        json={"pdf_id": "p1", "score": 3, "total": 5, "topic": "T"},
    )
    assert r.status_code == 200
    assert r.json() == {"recorded": True, "id": 42}


def test_loop_flashcard_result_unconfigured_returns_503(client, monkeypatch):
    from app.services import learning_loop

    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: False)
    r = client.post(
        "/api/loop/flashcard-result",
        json={"pdf_id": "p1", "card_index": 0, "correct": True},
    )
    assert r.status_code == 503


def test_loop_flashcard_result_validates_card_index(client):
    r = client.post(
        "/api/loop/flashcard-result",
        json={"pdf_id": "p1", "card_index": -1, "correct": True},
    )
    assert r.status_code == 422


def test_loop_flashcard_result_records(client, monkeypatch):
    from app.services import learning_loop

    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: True)

    def fake_record(pdf_id, topic, card_index, correct):
        return {"id": 7}

    monkeypatch.setattr(learning_loop, "record_flashcard_review", fake_record)
    r = client.post(
        "/api/loop/flashcard-result",
        json={"pdf_id": "p1", "card_index": 3, "correct": False, "topic": "T"},
    )
    assert r.status_code == 200
    assert r.json() == {"recorded": True, "id": 7}


def test_loop_tutor_log_records(client, monkeypatch):
    from app.services import learning_loop

    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: True)

    def fake_record(pdf_id, concept, level):
        return {"id": 11}

    monkeypatch.setattr(learning_loop, "record_tutor_session", fake_record)
    r = client.post(
        "/api/loop/tutor-log",
        json={"concept": "Bayes", "level": "college", "pdf_id": "p1"},
    )
    assert r.status_code == 200
    assert r.json() == {"recorded": True, "id": 11}


def test_loop_tutor_log_validates_concept(client):
    r = client.post(
        "/api/loop/tutor-log",
        json={"concept": "", "level": "college"},
    )
    assert r.status_code == 422


def test_loop_tutor_log_validates_concept_length(client):
    r = client.post(
        "/api/loop/tutor-log",
        json={"concept": "x" * 201, "level": "college"},
    )
    assert r.status_code == 422


def test_loop_weak_topics_returns_payload(client, monkeypatch):
    from app.services import learning_loop

    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: True)
    monkeypatch.setattr(
        learning_loop,
        "compute_weak_topics",
        lambda pdf_id, days=30: [
            {"topic": "A", "accuracy": 0.5, "weakness": 0.5, "attempts": 2,
             "quiz_count": 1, "flashcard_count": 1}
        ],
    )
    monkeypatch.setattr(
        learning_loop,
        "get_overall_weakness",
        lambda pdf_id, days=30: {"pdf_id": pdf_id, "accuracy": 0.5, "weakness": 0.5,
                                 "attempts": 2, "topic_count": 1},
    )
    r = client.get("/api/loop/weak-topics/p1")
    assert r.status_code == 200
    body = r.json()
    assert body["pdf_id"] == "p1"
    assert body["days"] == 30
    assert body["overall"]["accuracy"] == 0.5
    assert body["topics"][0]["topic"] == "A"


def test_loop_weak_topics_validates_days_bounds(client):
    r = client.get("/api/loop/weak-topics/p1", params={"days": 0})
    assert r.status_code == 422
    r = client.get("/api/loop/weak-topics/p1", params={"days": 1000})
    assert r.status_code == 422


def test_loop_weak_topics_handles_empty_history(client, monkeypatch):
    from app.services import learning_loop

    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: True)
    monkeypatch.setattr(learning_loop, "compute_weak_topics", lambda *a, **kw: [])
    monkeypatch.setattr(learning_loop, "get_overall_weakness", lambda *a, **kw: None)
    r = client.get("/api/loop/weak-topics/p1")
    assert r.status_code == 200
    body = r.json()
    assert body["overall"] is None
    assert body["topics"] == []
