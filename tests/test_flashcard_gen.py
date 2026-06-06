import pytest

from app.models.schemas import (
    Flashcard,
    FlashcardRequest,
    FlashcardResponse,
)
from app.services.flashcard_gen import (
    build_prompt,
    parse_flashcards,
)


def test_parse_flashcards_well_formed():
    raw = (
        "F1. What is tokenization?\n"
        "B1. Tokenization splits text into smaller units called tokens.\n\n"
        "F2. Define stemming.\n"
        "B2. Stemming reduces a word to its root form by chopping off suffixes.\n"
    )
    out = parse_flashcards(raw)
    assert len(out) == 2
    assert out[0]["number"] == 1
    assert "tokenization" in out[0]["front"].lower()
    assert "tokens" in out[0]["back"]
    assert out[1]["number"] == 2
    assert "stemming" in out[1]["front"].lower()


def test_parse_flashcards_handles_trailing_no_next():
    raw = "F1. Define NLP.\nB1. Natural Language Processing."
    out = parse_flashcards(raw)
    assert len(out) == 1
    assert "NLP" in out[0]["front"]


def test_parse_flashcards_empty():
    assert parse_flashcards("") == []
    assert parse_flashcards("random text without format") == []


def test_parse_flashcards_skips_zero_sentinel():
    raw = "F0. dummy\nB0. dummy\nF1. Real front\nB1. Real back"
    out = parse_flashcards(raw)
    assert len(out) == 1
    assert out[0]["number"] == 1


def test_build_prompt_includes_count_and_notes():
    prompt = build_prompt("Notes about NLP.", count=15, topic=None)
    assert "15" in prompt
    assert "Notes about NLP" in prompt
    assert "F1." in prompt and "B1." in prompt
    assert "F2." in prompt and "B2." in prompt
    assert "and so on" in prompt


def test_build_prompt_includes_topic_when_given():
    prompt = build_prompt("notes", count=10, topic="parsing")
    assert "parsing" in prompt


def test_build_prompt_no_topic_clause_when_none():
    prompt = build_prompt("notes", count=10, topic=None)
    assert "Focus all cards" not in prompt


def test_schema_request_count_bounds():
    FlashcardRequest(pdf_id="x", count=5)
    FlashcardRequest(pdf_id="x", count=50)
    with pytest.raises(Exception):
        FlashcardRequest(pdf_id="x", count=4)
    with pytest.raises(Exception):
        FlashcardRequest(pdf_id="x", count=51)


def test_schema_request_topic_optional():
    req = FlashcardRequest(pdf_id="x", count=10)
    assert req.topic is None
    req2 = FlashcardRequest(pdf_id="x", count=10, topic="POS tagging")
    assert req2.topic == "POS tagging"


def test_schema_request_include_raw_default_false():
    req = FlashcardRequest(pdf_id="x", count=10)
    assert req.include_raw is False


def test_schema_response_defaults_raw_output_to_empty():
    r = FlashcardResponse(pdf_id="x", flashcards=[])
    assert r.raw_output == ""


def test_schema_flashcard_serializes_correctly():
    c = Flashcard(number=1, front="term", back="definition")
    assert c.number == 1
    assert c.topic == ""
