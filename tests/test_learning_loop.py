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

    def gte(self, *_a, **_kw):
        return self

    def lte(self, *_a, **_kw):
        return self

    def order(self, *_a, **_kw):
        return self

    def limit(self, *_a, **_kw):
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


def _make_client(**tables: _FakeTable) -> _FakeClient:
    base = {"quiz_attempts": _FakeTable(), "flashcard_reviews": _FakeTable(), "tutor_sessions": _FakeTable()}
    base.update(tables)
    return _FakeClient(base)


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: True)
    monkeypatch.setattr(learning_loop.supabase, "is_ready", lambda: True)


@pytest.fixture
def unconfigured(monkeypatch):
    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: False)


def test_record_quiz_attempt_inserts_row(configured, monkeypatch):
    table = _FakeTable()
    monkeypatch.setattr(
        learning_loop.supabase, "get_client", lambda: _make_client(quiz_attempts=table)
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
        learning_loop.supabase, "get_client", lambda: _make_client(quiz_attempts=table)
    )
    learning_loop.record_quiz_attempt("p1", None, 0, 3)
    assert table.last_insert["topic"] is None


def test_record_quiz_attempt_rejects_invalid_score(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop.supabase, "get_client", lambda: _make_client(quiz_attempts=_FakeTable())
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
        lambda: _make_client(flashcard_reviews=table),
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
        lambda: _make_client(flashcard_reviews=_FakeTable()),
    )
    with pytest.raises(ValueError):
        learning_loop.record_flashcard_review("p1", None, -1, True)


def test_record_tutor_session_inserts_row(configured, monkeypatch):
    table = _FakeTable()
    monkeypatch.setattr(
        learning_loop.supabase, "get_client", lambda: _make_client(tutor_sessions=table)
    )
    out = learning_loop.record_tutor_session("p1", "Backprop", "college")
    assert table.last_insert == {
        "pdf_id": "p1",
        "concept": "Backprop",
        "level": "college",
    }


def test_record_tutor_session_rejects_empty(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop.supabase, "get_client", lambda: _make_client(tutor_sessions=_FakeTable())
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
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=fc),
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
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=fc),
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
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
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
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
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
        lambda: _make_client(
            quiz_attempts=quiz_recent, flashcard_reviews=_FakeTable()
        ),
    )
    out_recent = learning_loop.compute_weak_topics("p1", days=30)
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(
            quiz_attempts=quiz_old, flashcard_reviews=_FakeTable()
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
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
    )
    out = learning_loop.compute_weak_topics("p1", days=30)
    topics = {t["topic"] for t in out}
    assert "A" not in topics
    assert "B" in topics


def test_get_overall_weakness_returns_none_when_empty(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(
            quiz_attempts=_FakeTable(), flashcard_reviews=_FakeTable()
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
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
    )
    out = learning_loop.get_overall_weakness("p1")
    assert out is not None
    assert out["pdf_id"] == "p1"
    assert out["attempts"] == 2
    assert out["topic_count"] == 2
    assert 0.0 < out["accuracy"] < 1.0


def test_get_streak_empty_when_unconfigured(unconfigured):
    assert learning_loop.get_streak() == {"current": 0, "best": 0, "today_active": False, "last_active": None}


def test_get_streak_empty_when_no_data(configured, monkeypatch):
    monkeypatch.setattr(learning_loop, "get_activity_days", lambda *a, **kw: set())
    out = learning_loop.get_streak()
    assert out["current"] == 0
    assert out["best"] == 0
    assert out["today_active"] is False


def test_get_streak_counts_consecutive_days(configured, monkeypatch):
    from datetime import date, timedelta

    today = datetime.now(timezone.utc).date()
    days = {today, today - timedelta(days=1), today - timedelta(days=2)}
    monkeypatch.setattr(learning_loop, "get_activity_days", lambda *a, **kw: days)
    out = learning_loop.get_streak()
    assert out["current"] == 3
    assert out["best"] == 3
    assert out["today_active"] is True


def test_get_streak_falls_back_to_yesterday_if_today_quiet(configured, monkeypatch):
    from datetime import date, timedelta

    today = datetime.now(timezone.utc).date()
    days = {today - timedelta(days=1), today - timedelta(days=2)}
    monkeypatch.setattr(learning_loop, "get_activity_days", lambda *a, **kw: days)
    out = learning_loop.get_streak()
    assert out["current"] == 2
    assert out["today_active"] is False


def test_get_streak_zero_if_gap_before_yesterday(configured, monkeypatch):
    from datetime import date, timedelta

    today = datetime.now(timezone.utc).date()
    days = {today - timedelta(days=3), today - timedelta(days=4)}
    monkeypatch.setattr(learning_loop, "get_activity_days", lambda *a, **kw: days)
    out = learning_loop.get_streak()
    assert out["current"] == 0
    assert out["best"] == 2


def test_get_streak_detects_longest_run(configured, monkeypatch):
    from datetime import date, timedelta

    today = datetime.now(timezone.utc).date()
    days = {
        today,
        today - timedelta(days=1),
        today - timedelta(days=2),
        today - timedelta(days=10),
        today - timedelta(days=11),
        today - timedelta(days=12),
    }
    monkeypatch.setattr(learning_loop, "get_activity_days", lambda *a, **kw: days)
    out = learning_loop.get_streak()
    assert out["current"] == 3
    assert out["best"] == 3


def test_get_activity_counts_unconfigured(unconfigured):
    out = learning_loop.get_activity_counts("p1")
    assert out == {"quiz_attempts": 0, "flashcard_reviews": 0, "tutor_sessions": 0}


def test_get_last_activity_returns_most_recent(configured, monkeypatch):
    quiz = _FakeTable(rows=[{"ts": _ts(2)}])
    fc = _FakeTable(rows=[{"ts": _ts(1)}])
    tutor = _FakeTable(rows=[{"ts": _ts(3)}])
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _FakeClient(
            {"quiz_attempts": quiz, "flashcard_reviews": fc, "tutor_sessions": tutor}
        ),
    )
    out = learning_loop.get_last_activity("p1")
    assert out is not None
    parsed = learning_loop._parse_ts(out)
    assert (datetime.now(timezone.utc) - parsed).total_seconds() < 86400 * 4


def test_get_last_activity_unconfigured(unconfigured):
    assert learning_loop.get_last_activity("p1") is None


def test_get_accuracy_in_window_aggregates(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"score": 3, "total": 4},
            {"score": 2, "total": 2},
        ]
    )
    fc = _FakeTable(rows=[{"correct": True}, {"correct": False}])
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=fc),
    )
    out = learning_loop.get_accuracy_in_window("p1", start_days_ago=7, end_days_ago=0)
    assert out is not None
    # Quiz: (3+2)=5 correct, (4+2)=6 total, weight 1.0 -> 5/6
    # Flashcard: 1 correct, 2 total, weight 0.6 -> 0.6/1.2
    # Combined: (5+0.6)/(6+1.2) = 5.6/7.2
    expected = (5.0 * 1.0 + 1.0 * 0.6) / (6.0 * 1.0 + 2.0 * 0.6)
    assert out == pytest.approx(expected)


def test_get_accuracy_in_window_none_when_empty(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(
            quiz_attempts=_FakeTable(), flashcard_reviews=_FakeTable()
        ),
    )
    assert learning_loop.get_accuracy_in_window("p1", start_days_ago=7, end_days_ago=0) is None


def test_get_accuracy_in_window_unconfigured(unconfigured):
    assert learning_loop.get_accuracy_in_window("p1", 7) is None


def test_compute_topic_improvement_unconfigured(unconfigured):
    assert learning_loop.compute_topic_improvement("p1") == []


def test_compute_topic_improvement_returns_positive_deltas_only(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "A", "score": 5, "total": 5, "ts": _ts(1)},
            {"topic": "A", "score": 0, "total": 5, "ts": _ts(15)},
            {"topic": "B", "score": 5, "total": 5, "ts": _ts(15)},
            {"topic": "B", "score": 0, "total": 5, "ts": _ts(1)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
    )
    out = learning_loop.compute_topic_improvement("p1")
    assert len(out) == 1
    assert out[0]["topic"] == "A"
    assert out[0]["improvement"] == pytest.approx(1.0)
    assert out[0]["prior_accuracy"] == 0.0
    assert out[0]["recent_accuracy"] == 1.0


def test_compute_topic_improvement_drops_one_sided_topics(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "A", "score": 5, "total": 5, "ts": _ts(1)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
    )
    out = learning_loop.compute_topic_improvement("p1")
    assert out == []


def test_compute_topic_improvement_sorts_by_delta(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "small", "score": 1, "total": 2, "ts": _ts(1)},
            {"topic": "small", "score": 0, "total": 2, "ts": _ts(15)},
            {"topic": "big", "score": 2, "total": 2, "ts": _ts(1)},
            {"topic": "big", "score": 1, "total": 2, "ts": _ts(15)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
    )
    out = learning_loop.compute_topic_improvement("p1")
    assert [t["topic"] for t in out] == ["big", "small"]
    assert out[0]["improvement"] == pytest.approx(0.5)
    assert out[1]["improvement"] == pytest.approx(0.5)


def test_compute_most_neglected_unconfigured(unconfigured):
    assert learning_loop.compute_most_neglected_topics("p1") == []


def test_compute_most_neglected_ranks_by_recency(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "fresh", "score": 1, "total": 1, "ts": _ts(1)},
            {"topic": "fresh", "score": 1, "total": 1, "ts": _ts(1)},
            {"topic": "stale", "score": 1, "total": 1, "ts": _ts(30)},
            {"topic": "stale", "score": 1, "total": 1, "ts": _ts(30)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
    )
    out = learning_loop.compute_most_neglected_topics("p1", days=60, min_attempts=2)
    assert len(out) == 2
    assert out[0]["topic"] == "stale"
    assert out[0]["days_since_last"] >= 28
    assert out[1]["topic"] == "fresh"
    assert out[1]["days_since_last"] <= 2


def test_compute_most_neglected_drops_below_min_attempts(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[{"topic": "A", "score": 1, "total": 1, "ts": _ts(30)}]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
    )
    out = learning_loop.compute_most_neglected_topics("p1", days=60, min_attempts=2)
    assert out == []


def test_compute_most_neglected_reports_actual_gap(configured, monkeypatch):
    quiz = _FakeTable(
        rows=[
            {"topic": "A", "score": 1, "total": 1, "ts": _ts(50)},
            {"topic": "A", "score": 1, "total": 1, "ts": _ts(55)},
        ]
    )
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(quiz_attempts=quiz, flashcard_reviews=_FakeTable()),
    )
    out = learning_loop.compute_most_neglected_topics("p1", days=60, min_attempts=2)
    assert 49 <= out[0]["days_since_last"] <= 50


def test_compute_most_neglected_caps_gap_at_window_when_no_recent(
    configured, monkeypatch
):
    monkeypatch.setattr(
        learning_loop.supabase,
        "get_client",
        lambda: _make_client(
            quiz_attempts=_FakeTable(), flashcard_reviews=_FakeTable()
        ),
    )
    out = learning_loop.compute_most_neglected_topics("p1", days=60, min_attempts=2)
    assert out == []
