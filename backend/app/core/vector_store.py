from pathlib import Path

import chromadb

from app.config import settings


class VectorStore:
    def __init__(self, persist_dir: str | None = None) -> None:
        self.persist_dir = persist_dir or settings.chroma_persist_dir
        Path(self.persist_dir).mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=self.persist_dir)

    @staticmethod
    def _collection_name(pdf_id: str) -> str:
        safe = "".join(c for c in pdf_id if c.isalnum() or c in ("_", "-"))
        return f"pdf_{safe}"

    def add_chunks(
        self,
        pdf_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict] | None = None,
    ) -> int:
        if not chunks:
            return 0
        collection = self._client.get_or_create_collection(
            name=self._collection_name(pdf_id),
            metadata={"hnsw:space": "cosine"},
        )
        ids = [f"{pdf_id}_{i}" for i in range(len(chunks))]
        collection.add(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas or [{"source": pdf_id} for _ in chunks],
        )
        return len(chunks)

    def query_by_embedding(
        self,
        pdf_id: str,
        embedding: list[float],
        top_k: int = 5,
    ) -> list[dict]:
        collection = self._client.get_or_create_collection(
            name=self._collection_name(pdf_id),
            metadata={"hnsw:space": "cosine"},
        )
        result = collection.query(query_embeddings=[embedding], n_results=top_k)
        docs = (result.get("documents") or [[]])[0] or []
        metas = (result.get("metadatas") or [[]])[0] or []
        dists = (result.get("distances") or [[]])[0] or []
        return [
            {"text": d, "metadata": m, "distance": dist}
            for d, m, dist in zip(docs, metas, dists)
        ]

    def delete_pdf(self, pdf_id: str) -> None:
        try:
            self._client.delete_collection(self._collection_name(pdf_id))
        except Exception:
            pass


vector_store = VectorStore()
