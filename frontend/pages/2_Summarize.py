from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import streamlit as st

from _api import health, list_pdfs, summarize

st.set_page_config(page_title="Summarize - NoteSmith", page_icon=None, layout="wide")

st.title("Smart Notes - Summarize")
st.caption("Generate 1-page, 2-page, or 5-page summaries from any uploaded PDF.")

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
selected = next(p for p in pdfs if p["id"] == pdf_id)
st.caption(
    f"{selected.get('chunk_count', 0)} chunks - {selected.get('char_count', 0):,} characters"
)

length = st.radio(
    "Summary length",
    ["short", "medium", "long"],
    index=1,
    horizontal=True,
    help="short=1-page revision card (~250 words), medium=2-3 page study notes (~700), long=5-page detailed (~1500)",
)

if st.button("Generate summary", type="primary"):
    with st.spinner(
        f"Summarizing into a {length} version... this can take 1-3 minutes on a local model."
    ):
        result = summarize(pdf_id, length)
    if result:
        st.session_state["last_summary_pdf"] = pdf_id
        st.session_state["last_summary"] = result

if "last_summary" in st.session_state and st.session_state.get("last_summary_pdf") == pdf_id:
    result = st.session_state["last_summary"]
    st.divider()
    st.subheader(f"Summary ({result['length']})")
    st.text_area("Output", result["summary"], height=500)
    safe_name = selected["original_name"].rsplit(".", 1)[0]
    st.download_button(
        "Download as .txt",
        data=result["summary"],
        file_name=f"{safe_name}_{result['length']}.txt",
        mime="text/plain",
    )
