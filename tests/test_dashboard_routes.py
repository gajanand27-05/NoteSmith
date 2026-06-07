import pytest


def test_overall_dashboard_returns_payload(client, monkeypatch):
    from app.api.routes import dashboard as dashboard_route
    from app.services import dashboard

    monkeypatch.setattr(
        dashboard,
        "get_overall_dashboard",
        lambda days=30: {
            "mastery": 0.72,
            "readiness": 0.65,
            "pdf_count": 2,
            "pdfs_with_data": 1,
            "active_pdfs": 1,
            "total_attempts": 14,
            "streak": {"current": 5, "best": 7, "today_active": False, "last_active": "2026-06-06"},
            "pdfs": [],
        },
    )
    r = client.get("/api/dashboard/overall")
    assert r.status_code == 200
    body = r.json()
    assert body["mastery"] == 0.72
    assert body["readiness"] == 0.65
    assert body["streak"]["current"] == 5
    assert body["total_attempts"] == 14


def test_overall_dashboard_validates_days(client):
    r = client.get("/api/dashboard/overall", params={"days": 0})
    assert r.status_code == 422
    r = client.get("/api/dashboard/overall", params={"days": 1000})
    assert r.status_code == 422


def test_overall_dashboard_returns_500_on_error(client, monkeypatch):
    from app.services import dashboard

    def boom(days=30):
        raise RuntimeError("kaboom")

    monkeypatch.setattr(dashboard, "get_overall_dashboard", boom)
    r = client.get("/api/dashboard/overall")
    assert r.status_code == 500


def test_pdf_dashboard_404_when_pdf_missing(client, monkeypatch):
    from app.db import database

    monkeypatch.setattr(database, "get_pdf", lambda pid: None)
    r = client.get("/api/dashboard/pdf/nonexistent")
    assert r.status_code == 404


def test_pdf_dashboard_returns_payload(client, monkeypatch):
    from app.db import database
    from app.services import dashboard

    monkeypatch.setattr(
        database,
        "get_pdf",
        lambda pid: {"id": pid, "original_name": "x.pdf", "page_count": 1, "stored_path": "/x",
                     "chunk_count": 0, "char_count": 0, "created_at": "2024-01-01"},
    )
    monkeypatch.setattr(
        dashboard,
        "get_pdf_dashboard",
        lambda pdf_id, days=30: {
            "pdf_id": pdf_id,
            "mastery": 0.8,
            "readiness": 0.6,
            "attempts": 10,
            "topics_covered": 3,
            "last_activity": "2026-06-06T00:00:00Z",
            "days_since_last": 1,
            "trend": "improving",
            "topics": [
                {"topic": "POS", "mastery": 0.4, "attempts": 5, "weakness": 0.6},
            ],
            "quiz_attempts": 2,
            "flashcard_reviews": 8,
            "tutor_sessions": 0,
        },
    )
    r = client.get("/api/dashboard/pdf/p1")
    assert r.status_code == 200
    body = r.json()
    assert body["mastery"] == 0.8
    assert body["trend"] == "improving"
    assert body["topics"][0]["topic"] == "POS"


def test_pdf_dashboard_validates_days(client, monkeypatch):
    from app.db import database

    monkeypatch.setattr(
        database,
        "get_pdf",
        lambda pid: {"id": pid, "original_name": "x.pdf", "page_count": 1, "stored_path": "/x",
                     "chunk_count": 0, "char_count": 0, "created_at": "2024-01-01"},
    )
    r = client.get("/api/dashboard/pdf/p1", params={"days": 0})
    assert r.status_code == 422
    r = client.get("/api/dashboard/pdf/p1", params={"days": 999})
    assert r.status_code == 422
