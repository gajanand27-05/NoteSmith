from typing import Literal

from pydantic import BaseModel, Field


class PDFInfo(BaseModel):
    id: str
    original_name: str
    page_count: int
    chunk_count: int = 0
    char_count: int = 0
    created_at: str


class UploadResponse(BaseModel):
    pdf: PDFInfo
    message: str = "Uploaded and indexed"


class SummaryRequest(BaseModel):
    pdf_id: str
    length: str = Field(default="medium", pattern="^(short|medium|long)$")


class SummaryResponse(BaseModel):
    pdf_id: str
    length: str
    summary: str


class QARequest(BaseModel):
    pdf_id: str
    question: str
    top_k: int = Field(default=5, ge=1, le=20)
    topic_id: str | None = None


class QASource(BaseModel):
    text: str
    distance: float
    metadata: dict = {}


class QAResponse(BaseModel):
    pdf_id: str
    question: str
    answer: str
    sources: list[QASource] = []


class Question(BaseModel):
    number: int
    marks: int
    question: str
    answer: str
    topic: str = ""


class QuestionRequest(BaseModel):
    pdf_id: str
    marks: Literal[2, 5, 10]
    count: int = Field(default=5, ge=1, le=15)
    topic: str | None = None
    include_raw: bool = False


class QuestionResponse(BaseModel):
    pdf_id: str
    marks: int
    questions: list[Question]
    raw_output: str = ""


class Flashcard(BaseModel):
    number: int
    front: str
    back: str
    topic: str = ""


class FlashcardRequest(BaseModel):
    pdf_id: str
    count: int = Field(default=20, ge=5, le=50)
    topic: str | None = None
    include_raw: bool = False


class FlashcardResponse(BaseModel):
    pdf_id: str
    flashcards: list[Flashcard]
    raw_output: str = ""


class QuizOption(BaseModel):
    label: str
    text: str


class QuizQuestion(BaseModel):
    number: int
    question: str
    options: list[QuizOption]
    correct: str
    explanation: str = ""


class QuizRequest(BaseModel):
    pdf_id: str
    count: int = Field(default=10, ge=3, le=30)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    topic: str | None = None
    include_raw: bool = False


class QuizResponse(BaseModel):
    pdf_id: str
    questions: list[QuizQuestion]
    raw_output: str = ""


class TutorRequest(BaseModel):
    concept: str = Field(min_length=1, max_length=200)
    level: Literal["kid", "school", "high_school", "college", "engineering", "interview"]
    pdf_id: str | None = None
    include_example: bool = True
    include_follow_ups: bool = True


class TutorResponse(BaseModel):
    concept: str
    level: str
    explanation: str
    example: str = ""
    follow_ups: list[str] = []


class PaperQuestion(BaseModel):
    number: int
    text: str
    marks: int
    topic: str
    year: int | None = None


class PaperInfo(BaseModel):
    pdf_id: str
    filename: str
    year: int | None = None
    question_count: int = 0
    questions: list[PaperQuestion] = []


class TopicFrequency(BaseModel):
    topic: str
    count: int
    years: list[int]
    paper_ids: list[str]
    trend: str


class PredictedQuestion(BaseModel):
    number: int
    question: str
    topic: str
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    marks: int


class PaperAnalysisRequest(BaseModel):
    pdf_ids: list[str] = Field(min_length=2, max_length=10)
    years: list[int] | None = None
    target_year: int | None = None
    num_predictions: int = Field(default=5, ge=1, le=15)


class PaperAnalysisResponse(BaseModel):
    papers: list[PaperInfo]
    topics: list[TopicFrequency]
    predicted: list[PredictedQuestion]
    target_year: int


# ─── Mastery Tracking ────────────────────────────────────────────────────────

EVENT_TYPES = Literal["QUIZ", "FLASHCARD", "QA", "TUTOR", "STUDY", "PAPER_ANALYZER"]


class MasteryEventRequest(BaseModel):
    pdf_id: str
    event_type: EVENT_TYPES
    topic_id: str | None = None
    correct: bool | None = None
    score: float | None = Field(default=None, ge=0.0, le=1.0)
    metadata: dict | None = None


class MasteryEventResponse(BaseModel):
    id: str
    pdf_id: str
    topic_id: str | None = None
    event_type: str
    correct: int | None = None
    score: float
    metadata: dict = {}
    created_at: str


class DocMastery(BaseModel):
    pdf_id: str
    pdf_name: str
    mastery_score: float
    total_events: int
    breakdown: dict[str, int] = {}
    topic_id: str | None = None
    topic_name: str | None = None


class MasterySummaryResponse(BaseModel):
    documents: list[DocMastery]


class Recommendation(BaseModel):
    pdf_id: str
    pdf_name: str
    topic: str | None = None
    mastery: float
    reason: str


class RecommendationsResponse(BaseModel):
    recommendations: list[Recommendation]
