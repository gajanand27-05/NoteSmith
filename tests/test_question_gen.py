import pytest

from app.models.schemas import (
    Question,
    QuestionRequest,
    QuestionResponse,
)
from app.services.question_gen import (
    MARK_INSTRUCTIONS,
    build_prompt,
    parse_questions,
)


def test_parse_questions_well_formed():
    raw = (
        "Q1. Define tokenization.\n"
        "A1. Tokenization is the process of splitting text into smaller "
        "units called tokens, which can be words, subwords, or characters.\n\n"
        "Q2. What is stemming?\n"
        "A2. Stemming reduces a word to its root form by chopping off "
        'suffixes. For example, "running" becomes "run".\n'
    )
    out = parse_questions(raw, marks=2)
    assert len(out) == 2
    assert out[0]["number"] == 1
    assert "tokenization" in out[0]["question"].lower()
    assert "tokens" in out[0]["answer"]
    assert out[0]["marks"] == 2
    assert out[1]["number"] == 2
    assert out[1]["marks"] == 2


def test_parse_questions_handles_trailing_no_next():
    raw = "Q1. What is NLP?\nA1. NLP stands for Natural Language Processing."
    out = parse_questions(raw, marks=2)
    assert len(out) == 1
    assert out[0]["question"].startswith("What is NLP?")
    assert "Natural Language Processing" in out[0]["answer"]


def test_parse_questions_empty():
    assert parse_questions("", marks=5) == []
    assert parse_questions("Just some text without the format", marks=5) == []


def test_parse_questions_skips_zero_sentinel():
    raw = "Q0. dummy\nA0. dummy\nQ1. Real question\nA1. Real answer"
    out = parse_questions(raw, marks=2)
    assert len(out) == 1
    assert out[0]["number"] == 1


def test_build_prompt_includes_count_marks_and_notes():
    prompt = build_prompt("Sample notes about NLP.", marks=5, count=3, topic=None)
    assert "3" in prompt
    assert "5" in prompt
    assert "Sample notes" in prompt
    assert "Q1." in prompt and "A1." in prompt
    assert "Q2." in prompt and "A2." in prompt
    assert "and so on" in prompt


def test_build_prompt_includes_topic_when_given():
    prompt = build_prompt("notes", marks=2, count=2, topic="parsing")
    assert "parsing" in prompt


def test_build_prompt_no_topic_clause_when_none():
    prompt = build_prompt("notes", marks=2, count=2, topic=None)
    assert "Focus all questions" not in prompt


def test_mark_instructions_have_all_levels():
    for m in (2, 5, 10):
        assert m in MARK_INSTRUCTIONS
        assert "words" in MARK_INSTRUCTIONS[m]


def test_schema_request_accepts_valid_marks():
    for m in (2, 5, 10):
        req = QuestionRequest(pdf_id="x", marks=m, count=5)
        assert req.marks == m


def test_schema_request_rejects_invalid_marks():
    with pytest.raises(Exception):
        QuestionRequest(pdf_id="x", marks=3)
    with pytest.raises(Exception):
        QuestionRequest(pdf_id="x", marks=7)
    with pytest.raises(Exception):
        QuestionRequest(pdf_id="x", marks=0)


def test_schema_request_count_bounds():
    QuestionRequest(pdf_id="x", marks=2, count=1)
    QuestionRequest(pdf_id="x", marks=2, count=15)
    with pytest.raises(Exception):
        QuestionRequest(pdf_id="x", marks=2, count=0)
    with pytest.raises(Exception):
        QuestionRequest(pdf_id="x", marks=2, count=16)


def test_schema_request_topic_optional():
    req = QuestionRequest(pdf_id="x", marks=5)
    assert req.topic is None
    req2 = QuestionRequest(pdf_id="x", marks=5, topic="POS tagging")
    assert req2.topic == "POS tagging"


def test_schema_response_defaults_raw_output_to_empty():
    r = QuestionResponse(pdf_id="x", marks=5, questions=[])
    assert r.raw_output == ""


def test_schema_question_serializes_correctly():
    q = Question(number=1, marks=5, question="What is X?", answer="X is ...")
    assert q.number == 1
    assert q.topic == ""
