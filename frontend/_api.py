import os

import requests
import streamlit as st

API_URL = os.environ.get("NOTESMITH_API_URL", "http://localhost:8000")


def _request_error(e: requests.HTTPError) -> str:
    try:
        detail = e.response.json().get("detail")
        if detail:
            return str(detail)
    except Exception:
        pass
    return str(e)


@st.cache_data(ttl=2)
def health() -> dict | None:
    try:
        r = requests.get(f"{API_URL}/api/health", timeout=3)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


@st.cache_data(ttl=2)
def ollama_status() -> dict | None:
    try:
        r = requests.get(f"{API_URL}/api/ollama/status", timeout=3)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def list_pdfs() -> list[dict]:
    try:
        r = requests.get(f"{API_URL}/api/pdfs", timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.error(f"Failed to list PDFs: {_request_error(e)}")
        return []
    except Exception as e:
        st.error(f"Backend unreachable: {e}")
        return []


def upload_pdf(file) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/pdfs/upload",
            files={"file": (file.name, file.getvalue(), "application/pdf")},
            timeout=600,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.error(f"Upload failed: {_request_error(e)}")
        return None
    except Exception as e:
        st.error(f"Upload failed: {e}")
        return None


def delete_pdf(pdf_id: str) -> bool:
    try:
        r = requests.delete(f"{API_URL}/api/pdfs/{pdf_id}", timeout=10)
        r.raise_for_status()
        return True
    except requests.HTTPError as e:
        st.error(f"Delete failed: {_request_error(e)}")
        return False
    except Exception as e:
        st.error(f"Delete failed: {e}")
        return False


def summarize(pdf_id: str, length: str) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/summarize",
            json={"pdf_id": pdf_id, "length": length},
            timeout=600,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.error(f"Summarization failed: {_request_error(e)}")
        return None
    except Exception as e:
        st.error(f"Summarization failed: {e}")
        return None


def ask_question(pdf_id: str, question: str, top_k: int = 5) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/qa",
            json={"pdf_id": pdf_id, "question": question, "top_k": top_k},
            timeout=300,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.error(f"Q&A failed: {_request_error(e)}")
        return None
    except Exception as e:
        st.error(f"Q&A failed: {e}")
        return None


def generate_questions(
    pdf_id: str,
    marks: int,
    count: int,
    topic: str | None = None,
    include_raw: bool = False,
) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/questions/generate",
            json={
                "pdf_id": pdf_id,
                "marks": marks,
                "count": count,
                "topic": topic,
                "include_raw": include_raw,
            },
            timeout=600,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.error(f"Question generation failed: {_request_error(e)}")
        return None
    except Exception as e:
        st.error(f"Question generation failed: {e}")
        return None


def generate_flashcards(
    pdf_id: str,
    count: int,
    topic: str | None = None,
    include_raw: bool = False,
) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/flashcards/generate",
            json={
                "pdf_id": pdf_id,
                "count": count,
                "topic": topic,
                "include_raw": include_raw,
            },
            timeout=600,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.error(f"Flashcard generation failed: {_request_error(e)}")
        return None
    except Exception as e:
        st.error(f"Flashcard generation failed: {e}")
        return None


def generate_quiz(
    pdf_id: str,
    count: int,
    difficulty: str = "medium",
    topic: str | None = None,
    include_raw: bool = False,
) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/quiz/generate",
            json={
                "pdf_id": pdf_id,
                "count": count,
                "difficulty": difficulty,
                "topic": topic,
                "include_raw": include_raw,
            },
            timeout=600,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.error(f"Quiz generation failed: {_request_error(e)}")
        return None
    except Exception as e:
        st.error(f"Quiz generation failed: {e}")
        return None


def explain_concept(
    concept: str,
    level: str,
    pdf_id: str | None = None,
    include_example: bool = True,
    include_follow_ups: bool = True,
) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/tutor/explain",
            json={
                "concept": concept,
                "level": level,
                "pdf_id": pdf_id,
                "include_example": include_example,
                "include_follow_ups": include_follow_ups,
            },
            timeout=300,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.error(f"Tutor failed: {_request_error(e)}")
        return None
    except Exception as e:
        st.error(f"Tutor failed: {e}")
        return None


def analyze_papers(
    pdf_ids: list[str],
    years: list[int] | None = None,
    target_year: int | None = None,
    num_predictions: int = 5,
) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/papers/analyze",
            json={
                "pdf_ids": pdf_ids,
                "years": years,
                "target_year": target_year,
                "num_predictions": num_predictions,
            },
            timeout=600,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.error(f"Paper analysis failed: {_request_error(e)}")
        return None
    except Exception as e:
        st.error(f"Paper analysis failed: {e}")
        return None


def record_quiz_result(
    pdf_id: str, score: int, total: int, topic: str | None = None
) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/loop/quiz-result",
            json={
                "pdf_id": pdf_id,
                "score": score,
                "total": total,
                "topic": topic,
            },
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.warning(f"Could not record quiz result: {_request_error(e)}")
        return None
    except Exception as e:
        st.warning(f"Could not record quiz result: {e}")
        return None


def record_flashcard_result(
    pdf_id: str,
    card_index: int,
    correct: bool,
    topic: str | None = None,
) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/loop/flashcard-result",
            json={
                "pdf_id": pdf_id,
                "card_index": card_index,
                "correct": correct,
                "topic": topic,
            },
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        st.warning(f"Could not record flashcard review: {_request_error(e)}")
        return None
    except Exception as e:
        st.warning(f"Could not record flashcard review: {e}")
        return None


def record_tutor_log(
    concept: str, level: str, pdf_id: str | None = None
) -> dict | None:
    try:
        r = requests.post(
            f"{API_URL}/api/loop/tutor-log",
            json={
                "concept": concept,
                "level": level,
                "pdf_id": pdf_id,
            },
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError:
        return None
    except Exception:
        return None


def get_weak_topics(pdf_id: str, days: int = 30) -> dict | None:
    try:
        r = requests.get(
            f"{API_URL}/api/loop/weak-topics/{pdf_id}",
            params={"days": days},
            timeout=15,
        )
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 503:
            st.warning(
                "Study Loop history is disabled: Supabase is not configured."
            )
        else:
            st.warning(f"Could not load weakness data: {_request_error(e)}")
        return None
    except Exception as e:
        st.warning(f"Could not load weakness data: {e}")
        return None


def clear_caches() -> None:
    health.clear()
    ollama_status.clear()
    list_pdfs.clear()
