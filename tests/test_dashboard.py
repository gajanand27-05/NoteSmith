from datetime import datetime, timedelta, timezone

import pytest

from app.services import dashboard as dashboard_svc
from app.services import learning_loop


NOW = datetime.now(timezone.utc)


def _ts(days_ago: float) -> str:
    dt = NOW - timedelta(days=days_ago)
    return dt.isoformat().replace("+00:00", "Z")


class _FakeTable:
    def __init__(self, rows: list[dict] | None = None) -> None:
        self.rows = rows or []

    def select(self, *_a, **_kw):
        return self

    def eq(self, *_a, **_kw):
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
        return _Res(self.rows)


class _FakeClient:
    def __init__(self, tables: dict[str, _FakeTable]) -> None:
        self._tables = tables

    def table(self, name: str) -> _FakeTable:
        return self._tables[name]


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(learning_loop.supabase, "is_configured", lambda: True)


def test_recency_factor_none_returns_zero():
    assert dashboard_svc._recency_factor(None) == 0.0


def test_recency_factor_today_is_one():
    assert dashboard_svc._recency_factor(0) == pytest.approx(1.0)


def test_recency_factor_half_life_is_half():
    assert dashboard_svc._recency_factor(14) == pytest.approx(0.5)


def test_classify_trend_new_when_no_data():
    assert dashboard_svc._classify_trend(None, None) == "new"


def test_classify_trend_new_when_only_recent():
    assert dashboard_svc._classify_trend(0.8, None) == "new"


def test_classify_trend_improving():
    assert dashboard_svc._classify_trend(0.7, 0.5) == "improving"


def test_classify_trend_declining():
    assert dashboard_svc._classify_trend(0.4, 0.7) == "declining"


def test_classify_trend_stable():
    assert dashboard_svc._classify_trend(0.55, 0.5) == "stable"


def test_days_since_returns_zero_for_now():
    assert dashboard_svc._days_since(NOW.isoformat().replace("+00:00", "Z")) == 0


def test_days_since_returns_none_for_none():
    assert dashboard_svc._days_since(None) is None


def test_days_since_handles_garbage():
    assert dashboard_svc._days_since("not-a-date") is None


def test_pdf_dashboard_no_data_returns_empty_shape(configured, monkeypatch):
    monkeypatch.setattr(learning_loop, "get_overall_weakness", lambda *a, **kw: None)
    monkeypatch.setattr(learning_loop, "compute_weak_topics", lambda *a, **kw: [])
    monkeypatch.setattr(
        learning_loop,
        "get_activity_counts",
        lambda *a, **kw: {
            "quiz_attempts": 0,
            "flashcard_reviews": 0,
            "tutor_sessions": 0,
        },
    )
    monkeypatch.setattr(learning_loop, "get_last_activity", lambda *a, **kw: None)
    monkeypatch.setattr(learning_loop, "get_accuracy_in_window", lambda *a, **kw: None)
    d = dashboard_svc.get_pdf_dashboard("p1", days=30)
    assert d["pdf_id"] == "p1"
    assert d["mastery"] is None
    assert d["readiness"] is None
    assert d["trend"] == "new"
    assert d["topics"] == []


def test_pdf_dashboard_computes_mastery_readiness_trend(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop,
        "get_overall_weakness",
        lambda *a, **kw: {
            "pdf_id": "p1",
            "accuracy": 0.8,
            "weakness": 0.2,
            "attempts": 10,
            "topic_count": 3,
        },
    )
    monkeypatch.setattr(
        learning_loop,
        "compute_weak_topics",
        lambda *a, **kw: [
            {"topic": "POS", "accuracy": 0.9, "weakness": 0.1, "attempts": 5,
             "quiz_count": 2, "flashcard_count": 3},
            {"topic": "NER", "accuracy": 0.7, "weakness": 0.3, "attempts": 5,
             "quiz_count": 3, "flashcard_count": 2},
        ],
    )
    monkeypatch.setattr(
        learning_loop,
        "get_activity_counts",
        lambda *a, **kw: {
            "quiz_attempts": 3,
            "flashcard_reviews": 5,
            "tutor_sessions": 2,
        },
    )
    monkeypatch.setattr(
        learning_loop, "get_last_activity", lambda *a, **kw: _ts(1)
    )

    def fake_acc(pdf_id, start_days_ago, end_days_ago=0):
        if end_days_ago == 0:
            return 0.8
        return None

    monkeypatch.setattr(learning_loop, "get_accuracy_in_window", fake_acc)

    d = dashboard_svc.get_pdf_dashboard("p1", days=30)
    assert d["mastery"] == 0.8
    assert 0.0 < d["readiness"] < 0.8
    assert d["days_since_last"] == 1
    assert d["trend"] == "new"
    assert len(d["topics"]) == 2
    assert d["topics"][0]["topic"] == "NER"
    assert d["topics"][0]["mastery"] == 0.7
    assert d["quiz_attempts"] == 3
    assert d["tutor_sessions"] == 2


def test_pdf_dashboard_trend_improving(configured, monkeypatch):
    monkeypatch.setattr(
        learning_loop,
        "get_overall_weakness",
        lambda *a, **kw: {
            "pdf_id": "p1",
            "accuracy": 0.6,
            "weakness": 0.4,
            "attempts": 10,
            "topic_count": 1,
        },
    )
    monkeypatch.setattr(learning_loop, "compute_weak_topics", lambda *a, **kw: [])
    monkeypatch.setattr(
        learning_loop,
        "get_activity_counts",
        lambda *a, **kw: {"quiz_attempts": 0, "flashcard_reviews": 0, "tutor_sessions": 0},
    )
    monkeypatch.setattr(learning_loop, "get_last_activity", lambda *a, **kw: _ts(1))

    def fake_acc(pdf_id, start_days_ago, end_days_ago=0):
        if end_days_ago == 0:
            return 0.8
        return 0.5

    monkeypatch.setattr(learning_loop, "get_accuracy_in_window", fake_acc)
    d = dashboard_svc.get_pdf_dashboard("p1", days=30)
    assert d["trend"] == "improving"


def test_overall_dashboard_empty_catalog(configured, monkeypatch):
    monkeypatch.setattr(dashboard_svc.database, "list_pdfs", lambda: [])
    monkeypatch.setattr(
        learning_loop, "get_streak", lambda *a, **kw: {"current": 0, "best": 0}
    )
    d = dashboard_svc.get_overall_dashboard(days=30)
    assert d["mastery"] is None
    assert d["readiness"] is None
    assert d["pdf_count"] == 0
    assert d["active_pdfs"] == 0
    assert d["total_attempts"] == 0
    assert d["pdfs"] == []


def test_overall_dashboard_aggregates_across_pdfs(configured, monkeypatch):
    pdfs = [
        {"id": "p1", "original_name": "a.pdf", "page_count": 5, "stored_path": "/tmp/a",
         "chunk_count": 0, "char_count": 0, "created_at": "2024-01-01T00:00:00Z"},
        {"id": "p2", "original_name": "b.pdf", "page_count": 7, "stored_path": "/tmp/b",
         "chunk_count": 0, "char_count": 0, "created_at": "2024-01-02T00:00:00Z"},
    ]
    monkeypatch.setattr(dashboard_svc.database, "list_pdfs", lambda: pdfs)

    def fake_pdf_dashboard(pdf_id, days=30):
        if pdf_id == "p1":
            return {
                "pdf_id": "p1",
                "mastery": 0.9,
                "readiness": 0.8,
                "attempts": 10,
                "topics_covered": 3,
                "last_activity": _ts(1),
                "days_since_last": 1,
                "trend": "stable",
                "topics": [],
                "quiz_attempts": 3,
                "flashcard_reviews": 7,
                "tutor_sessions": 0,
            }
        return {
            "pdf_id": "p2",
            "mastery": 0.5,
            "readiness": 0.4,
            "attempts": 4,
            "topics_covered": 2,
            "last_activity": _ts(20),
            "days_since_last": 20,
            "trend": "declining",
            "topics": [],
            "quiz_attempts": 2,
            "flashcard_reviews": 2,
            "tutor_sessions": 0,
        }

    monkeypatch.setattr(dashboard_svc, "get_pdf_dashboard", fake_pdf_dashboard)
    monkeypatch.setattr(
        learning_loop,
        "get_streak",
        lambda *a, **kw: {"current": 3, "best": 5, "today_active": True, "last_active": _ts(0)},
    )
    d = dashboard_svc.get_overall_dashboard(days=30)
    assert d["pdf_count"] == 2
    assert d["pdfs_with_data"] == 2
    assert d["active_pdfs"] == 1
    assert d["total_attempts"] == 14
    assert d["streak"]["current"] == 3
    weighted = (0.9 * 10 + 0.5 * 4) / 14
    assert d["mastery"] == round(weighted, 4)
    assert d["pdfs"][0]["pdf_id"] == "p1"
    assert d["pdfs"][1]["pdf_id"] == "p2"


def test_overall_dashboard_no_data_yields_none_aggregate(configured, monkeypatch):
    pdfs = [
        {"id": "p1", "original_name": "a.pdf", "page_count": 5, "stored_path": "/tmp/a",
         "chunk_count": 0, "char_count": 0, "created_at": "2024-01-01T00:00:00Z"},
    ]
    monkeypatch.setattr(dashboard_svc.database, "list_pdfs", lambda: pdfs)
    monkeypatch.setattr(
        dashboard_svc,
        "get_pdf_dashboard",
        lambda *a, **kw: {
            "pdf_id": "p1",
            "mastery": None,
            "readiness": None,
            "attempts": 0,
            "topics_covered": 0,
            "last_activity": None,
            "days_since_last": None,
            "trend": "new",
            "topics": [],
            "quiz_attempts": 0,
            "flashcard_reviews": 0,
            "tutor_sessions": 0,
        },
    )
    monkeypatch.setattr(
        learning_loop, "get_streak", lambda *a, **kw: {"current": 0, "best": 0}
    )
    d = dashboard_svc.get_overall_dashboard(days=30)
    assert d["mastery"] is None
    assert d["readiness"] is None
    assert d["active_pdfs"] == 0
