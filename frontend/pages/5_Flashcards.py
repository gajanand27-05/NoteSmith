from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import streamlit as st

from _api import generate_flashcards, health, list_pdfs

st.set_page_config(
    page_title="Flashcards - NoteSmith", page_icon=None, layout="wide"
)

st.title("Flashcards")
st.caption("Auto-generated study cards from any uploaded PDF. Click 'Reveal' to flip.")

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

c1, c2 = st.columns([1, 2])
with c1:
    count = st.slider("Number of cards", 5, 50, 20, step=5)
with c2:
    topic = st.text_input(
        "Focus on a specific topic (optional)",
        placeholder="e.g., tokenization, POS tagging, parsing",
    )

st.caption(
    "Front: short term or question. Back: 1-3 sentence definition or explanation."
)

if st.button("Generate flashcards", type="primary"):
    with st.spinner(
        f"Generating {count} flashcards... this can take 1-3 minutes on a local model."
    ):
        result = generate_flashcards(
            pdf_id, count, topic.strip() or None
        )
    if result:
        st.session_state["last_f_pdf"] = pdf_id
        st.session_state["last_f_count"] = count
        st.session_state["last_f_topic"] = topic
        st.session_state["last_f"] = result

same_context = (
    "last_f" in st.session_state
    and st.session_state.get("last_f_pdf") == pdf_id
    and st.session_state.get("last_f_count") == count
    and st.session_state.get("last_f_topic") == topic
)
if same_context:
    result = st.session_state["last_f"]
    st.divider()
    cards = result.get("flashcards", [])
    st.subheader(f"{len(cards)} cards")

    if not cards:
        st.warning(
            "The AI did not follow the expected F/B format. "
            "Open the raw output below to copy the cards manually."
        )
        if result.get("raw_output"):
            with st.expander("Raw AI output"):
                st.text(result["raw_output"])
        if st.button("Re-run with raw output included"):
            with st.spinner("Re-running..."):
                debug_result = generate_flashcards(
                    pdf_id, count, topic.strip() or None, include_raw=True
                )
            if debug_result:
                st.session_state["last_f"] = debug_result
                st.rerun()
    else:
        if "flipped" not in st.session_state:
            st.session_state.flipped = {}

        cols_per_row = 2
        for i, card in enumerate(cards):
            if i % cols_per_row == 0:
                cols = st.columns(cols_per_row)
            col = cols[i % cols_per_row]
            is_flipped = st.session_state.flipped.get(i, False)
            with col.container(border=True, height=220):
                st.markdown(f"**Card {card['number']}**")
                if is_flipped:
                    st.info(card["front"])
                    st.markdown("---")
                    st.success(card["back"])
                else:
                    st.warning(card["front"])
                    st.caption("(Click to reveal)")
                btn_label = "Hide" if is_flipped else "Reveal"
                if st.button(btn_label, key=f"flip_{i}", use_container_width=True):
                    st.session_state.flipped[i] = not is_flipped
                    st.rerun()

        c1, c2 = st.columns(2)

        md_lines = [f"# Flashcards - {selected['original_name']}", ""]
        for card in cards:
            md_lines.append(f"**Card {card['number']}**")
            md_lines.append("")
            md_lines.append(f"- **Front:** {card['front']}")
            md_lines.append(f"- **Back:** {card['back']}")
            md_lines.append("")
        c1.download_button(
            "Download as .md",
            data="\n".join(md_lines),
            file_name=f"{selected['original_name'].rsplit('.', 1)[0]}_flashcards.md",
            mime="text/markdown",
            use_container_width=True,
        )

        csv_lines = ["front,back"]
        for card in cards:
            front = card["front"].replace('"', '""')
            back = card["back"].replace('"', '""')
            csv_lines.append(f'"{front}","{back}"')
        c2.download_button(
            "Download as .csv (Anki-friendly)",
            data="\n".join(csv_lines),
            file_name=f"{selected['original_name'].rsplit('.', 1)[0]}_flashcards.csv",
            mime="text/csv",
            use_container_width=True,
        )
