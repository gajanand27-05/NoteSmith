import pytest

from app.models.schemas import TutorRequest, TutorResponse
from app.services.tutor import (
    FOLLOWUP_PROMPT,
    LEVEL_PROMPTS,
    _parse_example,
    _parse_follow_ups,
)


def test_level_prompts_have_all_six_levels():
    expected = {
        "kid",
        "school",
        "high_school",
        "college",
        "engineering",
        "interview",
    }
    assert set(LEVEL_PROMPTS.keys()) == expected
    for level, prompt in LEVEL_PROMPTS.items():
        assert len(prompt) > 40, f"{level} prompt is too short"


def test_level_prompts_are_distinct():
    prompts = list(LEVEL_PROMPTS.values())
    assert len(set(prompts)) == len(prompts), "Level prompts are not unique"


def test_parse_example_with_delimiter():
    raw = "This is the explanation.\n\nEXAMPLE: A simple example here."
    explanation, example = _parse_example(raw)
    assert "explanation" in explanation.lower()
    assert "simple example" in example.lower()


def test_parse_example_without_delimiter():
    raw = "Just an explanation with no example marker."
    explanation, example = _parse_example(raw)
    assert explanation == raw
    assert example == ""


def test_parse_example_case_insensitive():
    raw = "Explanation.\nexample: lowercase marker."
    explanation, example = _parse_example(raw)
    assert "explanation" in explanation.lower()
    assert "lowercase" in example.lower()


def test_parse_follow_ups_numbered_list():
    raw = "1. What is X?\n2. How does Y work?\n3. Why use Z?"
    out = _parse_follow_ups(raw)
    assert len(out) == 3
    assert out[0] == "What is X?"
    assert out[1] == "How does Y work?"
    assert out[2] == "Why use Z?"


def test_parse_follow_ups_with_dot_format():
    raw = "1) First question\n2) Second question\n3) Third question"
    out = _parse_follow_ups(raw)
    assert len(out) == 3
    assert out[0] == "First question"


def test_parse_follow_ups_caps_at_three_with_distinct():
    raw = "1. Q1\n2. Q2\n3. Q3\n4. Q4"
    out = _parse_follow_ups(raw)
    assert len(out) == 3
    assert out == ["Q1", "Q2", "Q3"]


def test_parse_follow_ups_dedupes_duplicates():
    raw = "1. Q1\n2. Q2\n3. Q2\n4. Q3"
    out = _parse_follow_ups(raw)
    assert out == ["Q1", "Q2", "Q3"]


def test_parse_follow_ups_all_duplicates_returns_one():
    raw = "1. Q\n2. Q\n3. Q"
    out = _parse_follow_ups(raw)
    assert out == ["Q"]


def test_parse_follow_ups_empty():
    assert _parse_follow_ups("") == []
    assert _parse_follow_ups("No numbered list here") == []


def test_followup_prompt_includes_concept_and_level():
    prompt = FOLLOWUP_PROMPT.format(
        concept="Bayes Theorem", level="college", explanation="Some text."
    )
    assert "Bayes Theorem" in prompt
    assert "college" in prompt


def test_schema_request_accepts_all_levels():
    for level in ("kid", "school", "high_school", "college", "engineering", "interview"):
        req = TutorRequest(concept="x", level=level)
        assert req.level == level


def test_schema_request_rejects_invalid_level():
    with pytest.raises(Exception):
        TutorRequest(concept="x", level="invalid")


def test_schema_request_concept_required_and_bounded():
    with pytest.raises(Exception):
        TutorRequest(concept="", level="college")
    with pytest.raises(Exception):
        TutorRequest(concept="a" * 201, level="college")
    TutorRequest(concept="OK", level="college")


def test_schema_request_pdf_id_optional():
    req = TutorRequest(concept="x", level="college")
    assert req.pdf_id is None
    req2 = TutorRequest(concept="x", level="college", pdf_id="abc")
    assert req2.pdf_id == "abc"


def test_schema_request_includes_defaults():
    req = TutorRequest(concept="x", level="college")
    assert req.include_example is True
    assert req.include_follow_ups is True


def test_schema_response_defaults():
    r = TutorResponse(concept="x", level="college", explanation="text")
    assert r.example == ""
    assert r.follow_ups == []
