import pytest

from app.core.chunker import chunk_text


def test_empty_text_returns_empty_list():
    assert chunk_text("") == []
    assert chunk_text("   \n\n  ") == []


def test_short_text_single_chunk():
    text = "This is a short note about tokenization."
    out = chunk_text(text, chunk_size=1000, overlap=200)
    assert out == [text]


def test_long_text_produces_multiple_chunks():
    text = ("Sentence one. " * 300).strip()
    out = chunk_text(text, chunk_size=500, overlap=100)
    assert len(out) >= 2
    for c in out:
        assert c.strip()
        assert len(c) <= 1000


def test_overlap_smaller_than_chunk_size_required():
    with pytest.raises(ValueError):
        chunk_text("Some text.", chunk_size=100, overlap=100)


def test_preserves_words_no_mid_word_breaks():
    text = "alpha beta gamma delta epsilon zeta eta theta " * 50
    out = chunk_text(text, chunk_size=200, overlap=40)
    for chunk in out:
        for word in chunk.split():
            assert word.isalpha(), f"Word got broken: {word!r} in chunk {chunk!r}"


def test_covers_full_text():
    text = "Hello world. " * 200
    chunks = chunk_text(text, chunk_size=300, overlap=50)
    reconstructed = " ".join(chunks).replace("\n", " ")
    for word in ["Hello", "world."]:
        assert word in reconstructed
