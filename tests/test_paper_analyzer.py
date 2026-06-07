import json

import pytest

from app.models.schemas import (
    PaperAnalysisRequest,
    PaperAnalysisResponse,
    PaperInfo,
    PaperQuestion,
    PredictedQuestion,
    TopicFrequency,
)
from app.services.paper_analyzer import (
    build_extract_prompt,
    build_normalize_prompt,
    build_predict_prompt,
    compute_frequencies,
    compute_trend,
    normalize_topics,
    parse_extracted_questions,
    parse_predictions,
)


def test_parse_extracted_questions_well_formed():
    raw = (
        "Q1. Define tokenization.\n"
        "MARKS: 2\n"
        "TOPIC: Tokenization\n\n"
        "Q2. Explain POS tagging with examples.\n"
        "MARKS: 5\n"
        "TOPIC: POS Tagging\n"
    )
    out = parse_extracted_questions(raw, year=2024)
    assert len(out) == 2
    assert out[0]["number"] == 1
    assert "tokenization" in out[0]["text"].lower()
    assert out[0]["marks"] == 2
    assert out[0]["topic"] == "Tokenization"
    assert out[0]["year"] == 2024
    assert out[1]["topic"] == "POS Tagging"


def test_parse_extracted_questions_handles_trailing():
    raw = "Q1. Test question\nMARKS: 5\nTOPIC: Testing"
    out = parse_extracted_questions(raw, year=None)
    assert len(out) == 1
    assert out[0]["topic"] == "Testing"
    assert out[0]["year"] is None


def test_parse_extracted_questions_skips_zero_sentinel():
    raw = "Q0. dummy\nMARKS: 0\nTOPIC: dummy\nQ1. Real\nMARKS: 5\nTOPIC: Real"
    out = parse_extracted_questions(raw, year=None)
    assert len(out) == 1
    assert out[0]["number"] == 1


def test_parse_extracted_questions_drops_missing_topic():
    raw = "Q1. Test\nMARKS: 5\n"
    out = parse_extracted_questions(raw, year=None)
    assert out == []


def test_parse_predictions_well_formed():
    raw = (
        "P1. Discuss backpropagation in detail.\n"
        "TOPIC: Backpropagation\n"
        "CONFIDENCE: 0.85\n"
        "MARKS: 10\n"
        "REASONING: Tested in 3 of 4 papers.\n\n"
        "P2. What is tokenization?\n"
        "TOPIC: Tokenization\n"
        "CONFIDENCE: 0.7\n"
        "MARKS: 2\n"
        "REASONING: Very common definitional topic.\n"
    )
    out = parse_predictions(raw)
    assert len(out) == 2
    assert out[0]["topic"] == "Backpropagation"
    assert out[0]["confidence"] == pytest.approx(0.85)
    assert out[0]["marks"] == 10
    assert "Tested" in out[0]["reasoning"]
    assert out[1]["marks"] == 2


def test_parse_predictions_empty():
    assert parse_predictions("") == []


def test_parse_predictions_clamps_confidence_to_unit_interval():
    raw = (
        "P1. Q\nTOPIC: T\nCONFIDENCE: 1.5\nMARKS: 5\nREASONING: r\n"
        "P2. Q2\nTOPIC: T2\nCONFIDENCE: -0.2\nMARKS: 5\nREASONING: r\n"
    )
    out = parse_predictions(raw)
    assert all(0.0 <= p["confidence"] <= 1.0 for p in out)


def test_compute_trend_rising():
    counts = [(2020, 1), (2021, 1), (2022, 3), (2023, 4)]
    assert compute_trend(counts) == "rising"


def test_compute_trend_falling():
    counts = [(2020, 5), (2021, 4), (2022, 1), (2023, 1)]
    assert compute_trend(counts) == "falling"


def test_compute_trend_stable():
    counts = [(2020, 2), (2021, 2), (2022, 2)]
    assert compute_trend(counts) == "stable"


def test_compute_trend_single_year_returns_stable():
    assert compute_trend([(2024, 3)]) == "stable"


def test_compute_trend_empty_returns_stable():
    assert compute_trend([]) == "stable"


def test_compute_frequencies_aggregates_and_sorts():
    papers = [
        {
            "pdf_id": "p1",
            "year": 2023,
            "questions": [
                {"number": 1, "text": "a", "marks": 5, "topic": "POS Tagging", "year": 2023},
                {"number": 2, "text": "b", "marks": 5, "topic": "Tokenization", "year": 2023},
            ],
        },
        {
            "pdf_id": "p2",
            "year": 2024,
            "questions": [
                {"number": 1, "text": "c", "marks": 5, "topic": "POS Tagging", "year": 2024},
                {"number": 2, "text": "d", "marks": 5, "topic": "POS Tagging", "year": 2024},
            ],
        },
    ]
    out = compute_frequencies(papers)
    assert out[0]["topic"] == "POS Tagging"
    assert out[0]["count"] == 3
    assert sorted(out[0]["years"]) == [2023, 2024]
    assert sorted(out[0]["paper_ids"]) == ["p1", "p2"]
    assert out[1]["topic"] == "Tokenization"
    assert out[1]["count"] == 1


def test_normalize_topics_returns_identity_on_empty():
    assert normalize_topics([]) == {}


def test_normalize_topics_returns_identity_on_single_topic(monkeypatch):
    monkeypatch.setattr(
        "app.services.paper_analyzer.llm.generate_text",
        lambda p: '{"POS Tagging": "POS Tagging"}',
    )
    out = normalize_topics(["POS Tagging"])
    assert out == {"POS Tagging": "POS Tagging"}


def test_normalize_topics_parses_json(monkeypatch):
    monkeypatch.setattr(
        "app.services.paper_analyzer.llm.generate_text",
        lambda p: '{"POS Tagging": "POS Tagging", "Part-of-Speech Tagging": "POS Tagging"}',
    )
    out = normalize_topics(["POS Tagging", "Part-of-Speech Tagging"])
    assert out == {
        "POS Tagging": "POS Tagging",
        "Part-of-Speech Tagging": "POS Tagging",
    }


def test_normalize_topics_falls_back_on_bad_json(monkeypatch):
    monkeypatch.setattr(
        "app.services.paper_analyzer.llm.generate_text",
        lambda p: "this is not json",
    )
    out = normalize_topics(["A", "B"])
    assert out == {"A": "A", "B": "B"}


def test_build_extract_prompt_includes_text():
    p = build_extract_prompt("Some paper text here.", year=2024)
    assert "Some paper text here" in p
    assert "2024" in p
    assert "Q1." in p
    assert "MARKS:" in p
    assert "TOPIC:" in p


def test_build_extract_prompt_no_year_omits_year_phrase():
    p = build_extract_prompt("text", year=None)
    assert "from year" not in p


def test_build_normalize_prompt_includes_topics():
    p = build_normalize_prompt(["POS Tagging", "Part-of-Speech Tagging"])
    assert "POS Tagging" in p
    assert "Part-of-Speech Tagging" in p


def test_build_predict_prompt_includes_target_year_and_topics():
    topics = [
        {"topic": "POS Tagging", "count": 4, "years": [2023, 2024], "trend": "rising", "paper_ids": ["p1"]},
    ]
    p = build_predict_prompt(topics, num=5, target_year=2026, paper_count=2)
    assert "2026" in p
    assert "POS Tagging" in p
    assert "P1." in p
    assert "CONFIDENCE:" in p


def test_schema_request_requires_at_least_two_pdfs():
    with pytest.raises(Exception):
        PaperAnalysisRequest(pdf_ids=["only_one"])


def test_schema_request_accepts_two_or_more():
    PaperAnalysisRequest(pdf_ids=["a", "b"])
    PaperAnalysisRequest(pdf_ids=["a", "b", "c"])


def test_schema_request_caps_at_ten():
    with pytest.raises(Exception):
        PaperAnalysisRequest(pdf_ids=[f"p{i}" for i in range(11)])


def test_schema_request_years_optional():
    r = PaperAnalysisRequest(pdf_ids=["a", "b"])
    assert r.years is None


def test_schema_request_num_predictions_bounds():
    PaperAnalysisRequest(pdf_ids=["a", "b"], num_predictions=1)
    PaperAnalysisRequest(pdf_ids=["a", "b"], num_predictions=15)
    with pytest.raises(Exception):
        PaperAnalysisRequest(pdf_ids=["a", "b"], num_predictions=0)
    with pytest.raises(Exception):
        PaperAnalysisRequest(pdf_ids=["a", "b"], num_predictions=16)


def test_schema_response_serializes():
    r = PaperAnalysisResponse(
        papers=[],
        topics=[],
        predicted=[],
        target_year=2026,
    )
    body = r.model_dump()
    assert body["target_year"] == 2026
    assert body["papers"] == []


def test_schema_paper_question_serializes():
    q = PaperQuestion(number=1, text="q", marks=5, topic="T", year=2024)
    assert q.year == 2024


def test_schema_topic_frequency_serializes():
    t = TopicFrequency(
        topic="T", count=3, years=[2023, 2024], paper_ids=["p1", "p2"], trend="rising"
    )
    assert t.trend == "rising"


def test_schema_predicted_question_confidence_bounds():
    PredictedQuestion(
        number=1, question="q", topic="T", confidence=0.0, reasoning="r", marks=5
    )
    PredictedQuestion(
        number=1, question="q", topic="T", confidence=1.0, reasoning="r", marks=5
    )
    with pytest.raises(Exception):
        PredictedQuestion(
            number=1, question="q", topic="T", confidence=1.5, reasoning="r", marks=5
        )
    with pytest.raises(Exception):
        PredictedQuestion(
            number=1, question="q", topic="T", confidence=-0.1, reasoning="r", marks=5
        )
