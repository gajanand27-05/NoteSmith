import pytest

from app.models.schemas import (
    QuizOption,
    QuizQuestion,
    QuizRequest,
    QuizResponse,
)
from app.services.quiz_gen import (
    DIFFICULTY_INSTRUCTIONS,
    build_prompt,
    parse_quiz,
)


def test_parse_quiz_well_formed():
    raw = (
        "Q1. What is tokenization?\n"
        "A. Removing stop words from text\n"
        "B. Splitting text into tokens\n"
        "C. Converting text to lowercase\n"
        "D. Translating text to another language\n"
        "ANSWER: B\n"
        "EXPLANATION: Tokenization breaks text into smaller units called tokens.\n\n"
        "Q2. Which is a stemming algorithm?\n"
        "A. SVM\n"
        "B. Naive Bayes\n"
        "C. Porter\n"
        "D. K-means\n"
        "ANSWER: C\n"
        "EXPLANATION: Porter is a well-known stemming algorithm.\n"
    )
    out = parse_quiz(raw)
    assert len(out) == 2
    assert out[0]["number"] == 1
    assert "tokenization" in out[0]["question"].lower()
    assert len(out[0]["options"]) == 4
    assert out[0]["options"][0]["label"] == "A"
    assert out[0]["options"][1]["label"] == "B"
    assert out[0]["correct"] == "B"
    assert "tokens" in out[0]["explanation"]
    assert out[1]["correct"] == "C"


def test_parse_quiz_handles_missing_explanation():
    raw = (
        "Q1. What is NLP?\n"
        "A. A language\n"
        "B. Natural Language Processing\n"
        "C. A library\n"
        "D. A database\n"
        "ANSWER: B\n"
    )
    out = parse_quiz(raw)
    assert len(out) == 1
    assert out[0]["correct"] == "B"
    assert out[0]["explanation"] == ""


def test_parse_quiz_drops_questions_without_all_options():
    raw = (
        "Q1. Broken question\n"
        "A. Only one option\n"
        "B. second\n"
        "ANSWER: A\n"
    )
    out = parse_quiz(raw)
    assert out == []


def test_parse_quiz_drops_questions_with_bad_answer():
    raw = (
        "Q1. Test\n"
        "A. opt a\n"
        "B. opt b\n"
        "C. opt c\n"
        "D. opt d\n"
        "ANSWER: Z\n"
    )
    out = parse_quiz(raw)
    assert out == []


def test_parse_quiz_empty():
    assert parse_quiz("") == []


def test_parse_quiz_skips_zero_sentinel():
    raw = (
        "Q0. dummy\n"
        "A. a\nB. b\nC. c\nD. d\n"
        "ANSWER: A\n"
        "Q1. Real question\n"
        "A. a1\nB. b1\nC. c1\nD. d1\n"
        "ANSWER: D\n"
    )
    out = parse_quiz(raw)
    assert len(out) == 1
    assert out[0]["number"] == 1


def test_build_prompt_includes_count_difficulty_notes():
    prompt = build_prompt("NLP notes.", count=5, difficulty="hard", topic=None)
    assert "5" in prompt
    assert "hard" in prompt.lower()
    assert "NLP notes" in prompt
    assert "Q1." in prompt
    assert "ANSWER:" in prompt
    assert "EXPLANATION:" in prompt


def test_build_prompt_includes_topic_when_given():
    prompt = build_prompt("notes", count=3, difficulty="easy", topic="POS tagging")
    assert "POS tagging" in prompt


def test_build_prompt_no_topic_clause_when_none():
    prompt = build_prompt("notes", count=3, difficulty="easy", topic=None)
    assert "Focus all questions" not in prompt


def test_difficulty_instructions_have_all_levels():
    for d in ("easy", "medium", "hard"):
        assert d in DIFFICULTY_INSTRUCTIONS
        assert len(DIFFICULTY_INSTRUCTIONS[d]) > 20


def test_schema_request_count_bounds():
    QuizRequest(pdf_id="x", count=3)
    QuizRequest(pdf_id="x", count=30)
    with pytest.raises(Exception):
        QuizRequest(pdf_id="x", count=2)
    with pytest.raises(Exception):
        QuizRequest(pdf_id="x", count=31)


def test_schema_request_difficulty_validates():
    QuizRequest(pdf_id="x", count=5, difficulty="easy")
    QuizRequest(pdf_id="x", count=5, difficulty="medium")
    QuizRequest(pdf_id="x", count=5, difficulty="hard")
    with pytest.raises(Exception):
        QuizRequest(pdf_id="x", count=5, difficulty="impossible")


def test_schema_request_topic_optional():
    req = QuizRequest(pdf_id="x", count=5)
    assert req.topic is None


def test_schema_response_defaults_raw_output_to_empty():
    r = QuizResponse(pdf_id="x", questions=[])
    assert r.raw_output == ""


def test_schema_quiz_option_serializes():
    o = QuizOption(label="A", text="option text")
    assert o.label == "A"
    assert o.text == "option text"


def test_schema_quiz_question_serializes():
    q = QuizQuestion(
        number=1,
        question="q?",
        options=[
            QuizOption(label="A", text="a"),
            QuizOption(label="B", text="b"),
            QuizOption(label="C", text="c"),
            QuizOption(label="D", text="d"),
        ],
        correct="A",
        explanation="because",
    )
    assert q.correct == "A"
    assert len(q.options) == 4
