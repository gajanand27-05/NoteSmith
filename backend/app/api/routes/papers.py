from fastapi import APIRouter, HTTPException

from app.models.schemas import PaperAnalysisRequest, PaperAnalysisResponse
from app.services import paper_analyzer

router = APIRouter()


@router.post("/analyze", response_model=PaperAnalysisResponse)
def analyze(req: PaperAnalysisRequest) -> PaperAnalysisResponse:
    try:
        result = paper_analyzer.analyze_papers(
            req.pdf_ids,
            years=req.years,
            target_year=req.target_year,
            num_predictions=req.num_predictions,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")

    return PaperAnalysisResponse(**result)
