from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import streamlit as st

from _api import explain_concept, health, list_pdfs

st.set_page_config(
    page_title="Tutor - NoteSmith", page_icon=None, layout="wide"
)

st.title("AI Tutor")
st.caption("Explain any concept at 6 different depths - from kid to interview.")

LEVELS = [
    ("kid", "Kid (age 8-10)", "Simple words, one fun analogy, no jargon"),
    ("school", "School (age 12-15)", "Plain language, one relatable example"),
    ("high_school", "High School (age 16-18)", "Technical terms with formulas"),
    ("college", "College", "Full technical, formal definition, ~150 words"),
    ("engineering", "Engineering", "Precise, edge cases, ~250 words"),
    ("interview", "Interview", "Concise, key points, common pitfalls"),
]

if not health():
    st.error("Backend is offline. Start it with `run_backend.bat`.")
    st.stop()

pdfs = list_pdfs()

with st.form("tutor_form", clear_on_submit=False):
    c1, c2 = st.columns([2, 1])
    with c1:
        concept = st.text_input(
            "Concept to explain",
            placeholder="e.g., Bayes Theorem, Backpropagation, Tokenization",
        )
    with c2:
        use_pdf = st.checkbox(
            "Ground in a PDF",
            value=False,
            disabled=not pdfs,
            help="Use uploaded notes to ground the explanation",
        )

    if use_pdf and pdfs:
        options = {f"{p['original_name']}  -  {p['page_count']}p": p["id"] for p in pdfs}
        pdf_label = st.selectbox("Select PDF", list(options.keys()))
        pdf_id = options[pdf_label]
    else:
        pdf_id = None

    level_labels = [label for _, label, _ in LEVELS]
    level_choice = st.select_slider(
        "Explanation level",
        options=level_labels,
        value="College",
    )
    level_key = next(k for k, label, _ in LEVELS if label == level_choice)
    level_desc = next(desc for k, label, desc in LEVELS if label == level_choice)
    st.caption(f"_{level_desc}_")

    c1, c2, c3 = st.columns(3)
    with c1:
        include_example = st.checkbox("Include example", value=True)
    with c2:
        include_follow_ups = st.checkbox("Suggest follow-ups", value=True)
    with c3:
        submitted = st.form_submit_button("Explain", type="primary", use_container_width=True)

if submitted and concept.strip():
    with st.spinner(f"Explaining '{concept}' at {level_key} level..."):
        result = explain_concept(
            concept.strip(),
            level_key,
            pdf_id=pdf_id,
            include_example=include_example,
            include_follow_ups=include_follow_ups,
        )
    if result:
        st.session_state["last_t_concept"] = concept
        st.session_state["last_t_level"] = level_key
        st.session_state["last_t"] = result

if "last_t" in st.session_state:
    result = st.session_state["last_t"]
    st.divider()
    st.subheader(f"{result['concept']} - {result['level'].replace('_', ' ').title()}")

    with st.container(border=True):
        st.markdown(result["explanation"])

    if result.get("example"):
        with st.container(border=True):
            st.markdown("**Example**")
            st.info(result["example"])

    if result.get("follow_ups"):
        st.divider()
        st.subheader("Want to go deeper?")
        cols = st.columns(len(result["follow_ups"]))
        for i, fu in enumerate(result["follow_ups"]):
            with cols[i].container(border=True):
                st.markdown(f"**{fu}**")
                if st.button("Ask", key=f"fu_{i}", use_container_width=True):
                    st.session_state["last_t_concept"] = fu
                    st.rerun()
        st.caption("Click 'Ask' to use a follow-up as the next concept.")
