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
