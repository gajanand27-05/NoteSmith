from app.core import embeddings
from app.core.vector_store import vector_store


def retrieve(pdf_id: str, query: str, top_k: int = 5) -> list[dict]:
    emb = embeddings.embed_query(query)
    return vector_store.query_by_embedding(pdf_id, emb, top_k=top_k)
