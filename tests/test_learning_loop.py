from datetime import datetime, timedelta, timezone

import pytest

from app.services import learning_loop


NOW = datetime.now(timezone.utc)


def _ts(days_ago: float) -> str:
    dt = NOW - timedelta(days=days_ago)
    return dt.isoformat().replace("+00:00", "Z")


class _FakeTable:
    def __init__(self, rows: list[dict] | None = None) -> None:
        self.rows = rows or []
        self.last_insert: dict | None = None
        self.last_filters: list = []

    def insert(self, payload: dict):
        self.last_insert = payload
        return self

    def select(self, *_a, **_kw):
        return self

    def eq(self, key, value):
        self.last_filters.append((key, value))
        return self

    def execute(self):
        class _Res:
            def __init__(self, data):
                self.data = data
        if self.last_insert is not None:
            return _Res([{"id": 1, **self.last_insert}])
        return _Res(self.rows)


class _FakeClient:
    def __init__(self, tables: dict[str, _FakeTable]) -> None:
        self._tables = tables

    def table(self, name: str) -> _FakeTable:
        return self._tables[name]


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: True)


@pytest.fixture
def unconfigured(monkeypatch):
    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: False)


def test_record_quiz_attempt_inserts_row(configured, monkeypatch):
    table = _FakeTable()
    monkeypatch.setattr(
        learning_loop.supabase, "get_client", lambda: _FakeClient({"quiz_attempts": table})
    )
    out = learning_loop.record_quiz_attempt("p1", "T", 4, 5)
    assert out["id"] == 1
    assert table.last_insert == {
        "pdf_id": "p1",
        "topic": "T",
        "score": 4,
        "total": 5,
    }


def test_record_quiz_attempt_null_topic(configured, monkeypatch):
    table = _FakeTable()
    monkeypatch.setattr(
        learning_loop.supabase, "get_client", lambda: _FakeClient({"quiz_attempts": table})
    )
    learning_loop.record_quiz_attempt("p1", None, 0, 3)
    assert table.last_insert["topic"] is None


def test_record_quiz_attempt_rejects_invalid_score(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop.supabase, "get_client", lambda: _FakeClient({"quiz_attempts": _FakeTable()})
    )
    with pytest.raises(ValueError):
        learning_loop.record_quiz_attempt("p1", None, -1, 5)
    with pytest.raises(ValueError):
        learning_loop.record_quiz_attempt("p1", None, 6, 5)
    with pytest.raises(ValueError):
        learning_loop.record_quiz_attempt("p1", None, 1, 0)


def test_record_quiz_attempt_raises_when_unconfigured(unconfigured):
    with pytest.raises(RuntimeError):
        learning_loop.record_quiz_attempt("p1", None, 1, 2)


def test_record_flashcard_review_inserts_row(configured, monkeypatch):
    table = _FakeTable()
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient({"flashcard_reviews": table}),
    )
    out = learning_loop.record_flashcard_review("p1", "T", 3, True)
    assert table.last_insert == {
        "pdf_id": "p1",
        "topic": "T",
        "card_index": 3,
        "correct": True,
    }


def test_record_flashcard_review_rejects_negative_index(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient({"flashcard_reviews": _FakeTable()}),
    )
    with pytest.raises(ValueError):
        learning_loop.record_flashcard_review("p1", None, -1, True)


def test_record_tutor_session_inserts_row(configured, monkeypatch):
    table = _FakeTable()
    monkeypatch.setattr(
        learning_loop.supabase, "get_client", lambda: _FakeClient({"tutor_sessions": table})
    )
    out = learning_loop.record_tutor_session("p1", "Backprop", "college")
    assert table.last_insert == {
        "pdf_id": "p1",
        "concept": "Backprop",
        "level": "college",
    }


def test_record_tutor_session_rejects_empty(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop.supabase, "get_client", lambda: _FakeClient({"tutor_sessions": _FakeTable()})
    )
    with pytest.raises(ValueError):
        learning_loop.record_tutor_session("p1", "", "college")
    with pytest.raises(ValueError):
        learning_loop.record_tutor_session("p1", "x", "")


def test_compute_weak_topics_empty_when_unconfigured(unconfigured):
    assert learning_loop.compute_weak_topics("p1") == []


def test_compute_weak_topics_aggregates_quiz_and_flashcards(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "POS Tagging", "score": 1, "total": 2, "ts": _ts(1)},
            {"topic": "POS Tagging", "score": 2, "total": 3, "ts": _ts(2)},
            {"topic": "Parsing", "score": 0, "total": 1, "ts": _ts(5)},
        ]
    )
    fc = _FakeTable(
        rows=[
            {"topic": "POS Tagging", "correct": True, "ts": _ts(1)},
            {"topic": "POS Tagging", "correct": False, "ts": _ts(20)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient({"quiz_attempts": quiz, "flashcard_reviews": fc}),
    )
    out = learning_loop.compute_weak_topics("p1", days=30)
    by_topic = {t["topic"]: t for t in out}
    assert "POS Tagging" in by_topic
    assert "Parsing" in by_topic
    pos = by_topic["POS Tagging"]
    assert pos["quiz_count"] == 2
    assert pos["flashcard_count"] == 2
    assert pos["attempts"] == 4
    pos_acc = pos["accuracy"]
    assert 0.0 <= pos_acc <= 1.0
    assert pos["weakness"] == round(1 - pos_acc, 4)
    parsing = by_topic["Parsing"]
    assert parsing["accuracy"] == 0.0
    assert parsing["weakness"] == 1.0


def test_compute_weak_topics_drops_rows_outside_window(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "A", "score": 0, "total": 1, "ts": _ts(40)},
            {"topic": "A", "score": 1, "total": 1, "ts": _ts(1)},
        ]
    )
    fc = _FakeTable(rows=[])
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient({"quiz_attempts": quiz, "flashcard_reviews": fc}),
    )
    out = learning_loop.compute_weak_topics("p1", days=30)
    assert len(out) == 1
    assert out[0]["topic"] == "A"
    assert out[0]["accuracy"] == 1.0


def test_compute_weak_topics_sorts_by_weakness_desc(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "weak", "score": 0, "total": 1, "ts": _ts(1)},
            {"topic": "strong", "score": 1, "total": 1, "ts": _ts(1)},
            {"topic": "medium", "score": 1, "total": 2, "ts": _ts(1)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient({"quiz_attempts": quiz, "flashcard_reviews": _FakeTable()}),
    )
    out = learning_loop.compute_weak_topics("p1", days=30)
    assert [t["topic"] for t in out] == ["weak", "medium", "strong"]


def test_compute_weak_topics_treats_null_topic_as_overall(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": None, "score": 1, "total": 2, "ts": _ts(1)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient({"quiz_attempts": quiz, "flashcard_reviews": _FakeTable()}),
    )
    out = learning_loop.compute_weak_topics("p1", days=30)
    assert len(out) == 1
    assert out[0]["topic"] is None
    assert out[0]["accuracy"] == 0.5


def test_compute_weak_topics_recent_rows_get_double_weight(configured, monkeypatch):
    quiz_old = _FakeTable(
        rows=[
            {"topic": "T", "score": 0, "total": 2, "ts": _ts(20)},
        ]
    )
    quiz_recent = _FakeTable(
        rows=[
            {"topic": "T", "score": 2, "total": 2, "ts": _ts(2)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient(
            {"quiz_attempts": quiz_recent, "flashcard_reviews": _FakeTable()}
        ),
    )
    out_recent = learning_loop.compute_weak_topics("p1", days=30)
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient(
            {"quiz_attempts": quiz_old, "flashcard_reviews": _FakeTable()}
        ),
    )
    out_old = learning_loop.compute_weak_topics("p1", days=30)
    assert out_recent[0]["accuracy"] > out_old[0]["accuracy"]


def test_compute_weak_topics_handles_bad_timestamp_gracefully(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "A", "score": 1, "total": 1, "ts": "not-a-date"},
            {"topic": "B", "score": 1, "total": 1, "ts": _ts(1)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient({"quiz_attempts": quiz, "flashcard_reviews": _FakeTable()}),
    )
    out = learning_loop.compute_weak_topics("p1", days=30)
    topics = {t["topic"] for t in out}
    assert "A" not in topics
    assert "B" in topics


def test_get_overall_weakness_returns_none_when_empty(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient(
            {"quiz_attempts": _FakeTable(), "flashcard_reviews": _FakeTable()}
        ),
    )
    assert learning_loop.get_overall_weakness("p1") is None


def test_get_overall_weakness_aggregates(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "A", "score": 2, "total": 4, "ts": _ts(1)},
            {"topic": "B", "score": 4, "total": 4, "ts": _ts(1)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient({"quiz_attempts": quiz, "flashcard_reviews": _FakeTable()}),
    )
    out = learning_loop.get_overall_weakness("p1")
    assert out is not None
    assert out["pdf_id"] == "p1"
    assert out["attempts"] == 2
    assert out["topic_count"] == 2
    assert 0.0 < out["accuracy"] < 1.0
