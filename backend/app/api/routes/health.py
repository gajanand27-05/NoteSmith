from fastapi import APIRouter

from app.core.llm import llm

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/ollama/status")
def ollama_status() -> dict:
    available = llm.is_available()
    models = llm.list_models() if available else []
    return {
        "available": available,
        "base_url": llm.base_url,
        "chat_model": llm.chat_model,
        "embed_model": llm.embed_model,
        "chat_model_pulled": llm.has_model(llm.chat_model),
        "embed_model_pulled": llm.has_model(llm.embed_model),
        "models": models,
    }
