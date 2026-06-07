from app.core.llm import llm


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return llm.embed(texts)


def embed_query(text: str) -> list[float]:
    return llm.embed(text)[0]
