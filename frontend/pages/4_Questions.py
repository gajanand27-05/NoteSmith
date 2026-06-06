from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import streamlit as st

from _api import generate_questions, health, list_pdfs

st.set_page_config(
    page_title="Questions - NoteSmith", page_icon=None, layout="wide"
)

st.title("Question Generator")
st.caption("Generate 2, 5, or 10-mark exam questions from any uploaded PDF.")

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

c1, c2 = st.columns(2)
with c1:
    marks = st.radio(
        "Marks per question",
        [2, 5, 10],
        index=1,
        horizontal=True,
        help="2 = short/definitional, 5 = explain, 10 = detailed discussion",
    )
with c2:
    count = st.slider("Number of questions", 1, 15, 5)

topic = st.text_input(
    "Focus on a specific topic (optional)",
    placeholder="e.g., POS tagging, parsing, tokenization",
)

hints = {
    2: "2-mark: short, definitional. Answers ~30-50 words.",
    5: "5-mark: explain or list. Answers ~80-120 words, use bullets.",
    10: "10-mark: detailed discussion. Answers ~200-300 words, structured.",
}
st.caption(hints[marks])

if st.button("Generate questions", type="primary"):
    with st.spinner(
        f"Generating {count} x {marks}-mark questions... this can take 1-3 minutes on a local model."
    ):
        result = generate_questions(
            pdf_id, marks, count, topic.strip() or None
        )
    if result:
        st.session_state["last_q_pdf"] = pdf_id
        st.session_state["last_q_marks"] = marks
        st.session_state["last_q_count"] = count
        st.session_state["last_q_topic"] = topic
        st.session_state["last_q"] = result

same_context = (
    "last_q" in st.session_state
    and st.session_state.get("last_q_pdf") == pdf_id
    and st.session_state.get("last_q_marks") == marks
    and st.session_state.get("last_q_count") == count
    and st.session_state.get("last_q_topic") == topic
)
if same_context:
    result = st.session_state["last_q"]
    st.divider()
    qs = result.get("questions", [])
    st.subheader(f"{len(qs)} questions parsed")
    if not qs:
        st.warning(
            "The AI did not follow the expected Q/A format. Try again, "
            "or open the raw output below to copy the questions manually."
        )
        if result.get("raw_output"):
            with st.expander("Raw AI output"):
                st.text(result["raw_output"])
        if st.button("Re-run with raw output included"):
            with st.spinner("Re-running..."):
                debug_result = generate_questions(
                    pdf_id, marks, count, topic.strip() or None, include_raw=True
                )
            if debug_result:
                st.session_state["last_q"] = debug_result
                st.rerun()
    else:
        for q in qs:
            with st.container(border=True):
                st.markdown(
                    f"**Q{q['number']}. ({q['marks']} marks)** {q['question']}"
                )
                with st.expander("Show answer"):
                    st.write(q["answer"])

        md_lines = [
            f"# {marks}-Mark Questions - {selected['original_name']}",
            "",
        ]
        for q in qs:
            md_lines.append(f"**Q{q['number']}. ({q['marks']} marks)** {q['question']}")
            md_lines.append("")
            md_lines.append(f"*Answer:* {q['answer']}")
            md_lines.append("")
            md_lines.append("---")
            md_lines.append("")
        st.download_button(
            "Download as .md",
            data="\n".join(md_lines),
            file_name=f"{selected['original_name'].rsplit('.', 1)[0]}_q{marks}.md",
            mime="text/markdown",
        )
