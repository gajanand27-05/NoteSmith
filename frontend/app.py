from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests
import streamlit as st

from _api import API_URL, health, list_pdfs, ollama_status

st.set_page_config(
    page_title="NoteSmith",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("NoteSmith")
st.caption("AI Study Companion - Turn PDFs into exam-ready preparation.")

with st.sidebar:
    st.header("Status")
    h = health()
    st.write("Backend:", "online" if h else "offline")
    o = ollama_status()
    if o:
        st.write("Ollama:", "online" if o["available"] else "offline")
        if o["available"]:
            st.write(f"Chat: `{o['chat_model']}`")
            st.write(f"Embed: `{o['embed_model']}`")
            if not o["chat_model_pulled"]:
                st.warning(
                    f"Chat model not pulled. Run:\n`ollama pull {o['chat_model']}`"
                )
            if not o["embed_model_pulled"]:
                st.warning(
                    f"Embed model not pulled. Run:\n`ollama pull {o['embed_model']}`"
                )
    else:
        st.write("Ollama: unknown")
    st.divider()
    st.caption(f"API: {API_URL}")

st.subheader("Dashboard")
pdfs = list_pdfs() if h else []
c1, c2, c3 = st.columns(3)
c1.metric("PDFs uploaded", len(pdfs))
c2.metric("Total chunks", sum(p.get("chunk_count", 0) for p in pdfs))
c3.metric("Total pages", sum(p.get("page_count", 0) for p in pdfs))

st.divider()
st.subheader("Get started")
col1, col2, col3 = st.columns(3)
col4, col5, col6 = st.columns(3)
col7, col8, col9 = st.columns(3)
with col1:
    st.markdown("**1. Upload**")
    st.write("Add your notes, syllabus, or question papers.")
    st.page_link("pages/1_Upload.py", label="Go to Upload")
with col2:
    st.markdown("**2. Summarize**")
    st.write("Get 1-page, 2-page, or 5-page summaries.")
    st.page_link("pages/2_Summarize.py", label="Go to Summarize")
with col3:
    st.markdown("**3. Ask**")
    st.write("Get exam-style answers from your notes.")
    st.page_link("pages/3_QA.py", label="Go to Q&A")
with col4:
    st.markdown("**4. Questions**")
    st.write("Generate 2, 5, 10-mark exam questions.")
    st.page_link("pages/4_Questions.py", label="Go to Questions")
with col5:
    st.markdown("**5. Flashcards**")
    st.write("Auto-generated study cards with flip UI.")
    st.page_link("pages/5_Flashcards.py", label="Go to Flashcards")
with col6:
    st.markdown("**6. Quiz**")
    st.write("MCQ self-test with score and review.")
    st.page_link("pages/6_Quiz.py", label="Go to Quiz")
with col7:
    st.markdown("**7. Tutor**")
    st.write("Explain concepts at 6 depth levels.")
    st.page_link("pages/10_Tutor.py", label="Go to Tutor")
with col8:
    st.markdown("**8. Paper Analyzer**")
    st.write("Topic frequency + predicted questions from past papers.")
    st.page_link("pages/7_Paper_Analyzer.py", label="Go to Paper Analyzer")

if not pdfs:
    st.divider()
    st.subheader("First time?")
    st.markdown(
        """
1. Make sure Ollama is running: `ollama serve`
2. Pull the models:
   - `ollama pull llama3.1:8b`
   - `ollama pull nomic-embed-text`
3. Run `setup.bat` once to create the environment.
4. Start the backend: `run_backend.bat`
5. Start the frontend: `run_frontend.bat`
6. Open http://localhost:8501
"""
    )
