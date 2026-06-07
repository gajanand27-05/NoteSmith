from fastapi import APIRouter, HTTPException, Query

from app.db import database
from app.services import dashboard

router = APIRouter()


@router.get("/overall")
def get_overall(days: int = Query(default=30, ge=1, le=365)) -> dict:
    try:
        return dashboard.get_overall_dashboard(days=days)
    except Exception as e:
        raise HTTPException(500, f"Failed to compute overall dashboard: {e}")


@router.get("/pdf/{pdf_id}")
def get_pdf(pdf_id: str, days: int = Query(default=30, ge=1, le=365)) -> dict:
    if not database.get_pdf(pdf_id):
        raise HTTPException(404, "PDF not found")
    try:
        return dashboard.get_pdf_dashboard(pdf_id, days=days)
    except Exception as e:
        raise HTTPException(500, f"Failed to compute PDF dashboard: {e}")
