from app.config import settings


def _split_preserving_words(text: str, chunk_size: int) -> list[str]:
    parts: list[str] = []
    remaining = text
    while len(remaining) > chunk_size:
        window = remaining[:chunk_size]
        cut = max(window.rfind(". "), window.rfind(".\n"), window.rfind(" "))
        if cut < chunk_size * 0.5:
            cut = chunk_size
        parts.append(remaining[: cut + 1].strip())
        remaining = remaining[cut + 1 :].lstrip()
    if remaining.strip():
        parts.append(remaining.strip())
    return parts


def chunk_text(
    text: str,
    chunk_size: int | None = None,
    overlap: int | None = None,
) -> list[str]:
    chunk_size = chunk_size or settings.chunk_size
    overlap = overlap or settings.chunk_overlap
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")

    text = text.strip()
    if not text:
        return []

    raw_chunks = _split_preserving_words(text, chunk_size)
    if not raw_chunks:
        return []

    if overlap <= 0 or len(raw_chunks) == 1:
        return raw_chunks

    out: list[str] = [raw_chunks[0]]
    for i in range(1, len(raw_chunks)):
        prev = raw_chunks[i - 1]
        cur = raw_chunks[i]
        tail = prev[-overlap:] if len(prev) > overlap else prev
        merged = f"{tail}\n{cur}".strip()
        out.append(merged)
    return out
