from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import streamlit as st

from _api import ask_question, health, list_pdfs

st.set_page_config(page_title="Q&A - NoteSmith", page_icon=None, layout="wide")

st.title("Ask Your Notes")
st.caption("Get exam-style answers generated from your PDF. Sources are shown below.")

if not health():
    st.error("Backend is offline. Start it with `run_backend.bat`.")
    st.stop()

pdfs = list_pdfs()
if not pdfs:
    st.info("No PDFs uploaded yet. Go to the Upload page first.")
    st.stop()

options = {f"{p['original_name']}  -  {p['page_count']}p": p["id"] for p in pdfs}
label = st.selectbox("Select a PDF", list(options.keys()))
pdf_id = options[label]

top_k = st.slider(
    "Chunks to retrieve",
    min_value=3,
    max_value=10,
    value=5,
    help="More chunks = broader context, slower. 5 is a good default.",
)

st.subheader("Your question")
examples = [
    "Explain POS tagging for 10 marks.",
    "What is tokenization? Give an example.",
    "Summarize the NLP pipeline.",
    "List the steps in text preprocessing.",
    "Define stemming and lemmatization with examples.",
]
ex_choice = st.selectbox("Examples (click to use)", ["-"] + examples)
default_q = "" if ex_choice == "-" else ex_choice
question = st.text_input("Question", value=default_q, placeholder="Type your question here...")

col1, col2 = st.columns([1, 5])
if col1.button("Ask", type="primary") and question.strip():
    with st.spinner("Retrieving relevant chunks and generating answer..."):
        result = ask_question(pdf_id, question, top_k)
    if result:
        st.session_state["last_qa_pdf"] = pdf_id
        st.session_state["last_qa"] = result

if col2.button("Clear"):
    for k in ("last_qa", "last_qa_pdf"):
        st.session_state.pop(k, None)
    st.rerun()

if (
    "last_qa" in st.session_state
    and st.session_state.get("last_qa_pdf") == pdf_id
):
    result = st.session_state["last_qa"]
    st.divider()
    st.subheader("Answer")
    st.markdown(result["answer"])
    if result.get("sources"):
        with st.expander(f"Sources ({len(result['sources'])} chunks used)"):
            for i, s in enumerate(result["sources"], 1):
                st.markdown(f"**Excerpt {i}** - relevance distance: `{s['distance']:.3f}`")
                st.caption(s["text"])
                if i < len(result["sources"]):
                    st.divider()
