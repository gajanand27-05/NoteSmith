from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import streamlit as st

from _api import delete_pdf, health, list_pdfs, ollama_status, upload_pdf

st.set_page_config(page_title="Upload - NoteSmith", page_icon=None, layout="wide")

st.title("Upload PDF")

h = health()
if not h:
    st.error("Backend is offline. Start it with `run_backend.bat`.")
    st.stop()

o = ollama_status()
if o and not o.get("available"):
    st.error("Ollama is offline. Start it with `ollama serve`.")
    st.stop()
if o and not o.get("chat_model_pulled"):
    st.warning(f"Chat model missing. Run: `ollama pull {o['chat_model']}`")
if o and not o.get("embed_model_pulled"):
    st.warning(f"Embed model missing. Run: `ollama pull {o['embed_model']}`")

st.subheader("Add a new PDF")
uploaded = st.file_uploader(
    "Choose a PDF (max 50 MB)",
    type=["pdf"],
    help="Notes, syllabus, or question paper.",
)

if uploaded:
    st.write(f"Selected: **{uploaded.name}** ({uploaded.size / 1024:.1f} KB)")
    if st.button("Upload and index", type="primary"):
        with st.spinner("Extracting text, chunking, and embedding... this can take a minute for large PDFs."):
            result = upload_pdf(uploaded)
        if result:
            st.success(result.get("message", "Uploaded"))
            st.cache_data.clear()
            st.rerun()

st.divider()
st.subheader("Your library")

pdfs = list_pdfs()
if not pdfs:
    st.info("No PDFs uploaded yet. Upload one above to get started.")
else:
    for p in pdfs:
        with st.container(border=True):
            cols = st.columns([5, 1, 1, 1, 1])
            cols[0].markdown(f"**{p['original_name']}**")
            cols[0].caption(f"id: `{p['id']}` - uploaded {p['created_at'][:19]}")
            cols[1].metric("Pages", p["page_count"])
            cols[2].metric("Chunks", p.get("chunk_count", 0))
            cols[3].metric("Chars", f"{p.get('char_count', 0):,}")
            if cols[4].button("Delete", key=f"del_{p['id']}"):
                if delete_pdf(p["id"]):
                    st.cache_data.clear()
                    st.rerun()
