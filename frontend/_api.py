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


def clear_caches() -> None:
    health.clear()
    ollama_status.clear()
    list_pdfs.clear()
