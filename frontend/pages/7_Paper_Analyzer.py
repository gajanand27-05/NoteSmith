from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import streamlit as st

from _api import analyze_papers, health, list_pdfs

st.set_page_config(
    page_title="Paper Analyzer - NoteSmith", page_icon=None, layout="wide"
)

st.title("Previous Year Paper Analyzer")
st.caption(
    "Upload 2+ question papers, get topic frequency, trends, and predicted questions."
)

if not health():
    st.error("Backend is offline. Start it with `run_backend.bat`.")
    st.stop()

pdfs = list_pdfs()
if not pdfs:
    st.info("Upload question papers on the Upload page first.")
    st.stop()

st.subheader("Select question papers")
st.caption("Pick 2 or more papers. Add a year tag to each (helps compute trends).")

selected = st.multiselect(
    "Question papers",
    options=pdfs,
    format_func=lambda p: f"{p['original_name']}  -  {p['page_count']}p",
    key="paper_select",
)

years: list[int] = []
if selected:
    cols = st.columns(min(len(selected), 4))
    for i, p in enumerate(selected):
        with cols[i % len(cols)]:
            y = st.number_input(
                f"Year for {p['original_name'][:20]}",
                min_value=1990,
                max_value=datetime.now().year + 1,
                value=2024,
                step=1,
                key=f"year_{p['id']}",
            )
            years.append(int(y))

c1, c2, c3 = st.columns(3)
with c1:
    target_year = st.number_input(
        "Target year (for predictions)",
        min_value=datetime.now().year,
        max_value=datetime.now().year + 5,
        value=datetime.now().year,
        step=1,
    )
with c2:
    num_predictions = st.slider("Number of predictions", 1, 15, 5)
with c3:
    go = st.button(
        "Analyze papers",
        type="primary",
        disabled=len(selected) < 2,
        use_container_width=True,
    )

if go and len(selected) >= 2:
    pdf_ids = [p["id"] for p in selected]
    with st.spinner(
        f"Analyzing {len(pdf_ids)} papers... extracting questions, normalizing topics, predicting. This can take 2-4 minutes."
    ):
        result = analyze_papers(pdf_ids, years=years, target_year=int(target_year), num_predictions=num_predictions)
    if result:
        st.session_state["last_papers_pdf_ids"] = pdf_ids
        st.session_state["last_papers_years"] = years
        st.session_state["last_papers_target"] = int(target_year)
        st.session_state["last_papers_num"] = num_predictions
        st.session_state["last_papers"] = result

same = (
    "last_papers" in st.session_state
    and st.session_state.get("last_papers_pdf_ids") == [p["id"] for p in selected]
    and st.session_state.get("last_papers_years") == years
    and st.session_state.get("last_papers_target") == int(target_year)
    and st.session_state.get("last_papers_num") == num_predictions
)
if same:
    result = st.session_state["last_papers"]
    st.divider()

    papers = result.get("papers", [])
    topics = result.get("topics", [])
    predicted = result.get("predicted", [])

    st.subheader(f"Papers analyzed: {len(papers)}")
    with st.expander("Paper details", expanded=False):
        for p in papers:
            st.markdown(
                f"- **{p['filename']}** - year: `{p.get('year') or 'unknown'}` - "
                f"{p['question_count']} questions extracted"
            )

    st.subheader("Topic frequency")
    if not topics:
        st.warning("No topics extracted.")
    else:
        df = pd.DataFrame(
            [
                {
                    "Topic": t["topic"],
                    "Count": t["count"],
                    "Years": ", ".join(str(y) for y in t["years"]) or "-",
                    "Trend": t["trend"],
                    "Papers": len(t["paper_ids"]),
                }
                for t in topics
            ]
        )
        st.dataframe(df, use_container_width=True, hide_index=True)

        trend_counts = pd.Series([t["trend"] for t in topics]).value_counts()
        st.bar_chart(trend_counts)

    st.subheader(f"Predicted questions for {result.get('target_year', target_year)}")
    if not predicted:
        st.warning("No predictions generated.")
    else:
        for pred in predicted:
            with st.container(border=True):
                badge = (
                    "HIGH" if pred["confidence"] >= 0.75
                    else "MEDIUM" if pred["confidence"] >= 0.5
                    else "LOW"
                )
                st.markdown(
                    f"**P{pred['number']}. ({pred['marks']} marks)** {pred['question']}  "
                    f"`{badge} ({pred['confidence']:.2f})`"
                )
                st.caption(f"Topic: {pred['topic']}")
                if pred.get("reasoning"):
                    st.caption(f"Why: {pred['reasoning']}")

    md_lines = [f"# Paper Analysis - target year {result.get('target_year')}", ""]
    md_lines.append("## Topic Frequency")
    for t in topics:
        md_lines.append(
            f"- **{t['topic']}** - {t['count']} times - years: {t['years']} - trend: {t['trend']}"
        )
    md_lines.append("")
    md_lines.append(f"## Predicted Questions ({result.get('target_year')})")
    for p in predicted:
        md_lines.append(
            f"**P{p['number']}. ({p['marks']} marks)** {p['question']}"
        )
        md_lines.append(f"  - Topic: {p['topic']}")
        md_lines.append(f"  - Confidence: {p['confidence']:.2f}")
        md_lines.append(f"  - Why: {p['reasoning']}")
        md_lines.append("")
    c1, c2 = st.columns(2)
    c1.download_button(
        "Download analysis (.md)",
        data="\n".join(md_lines),
        file_name=f"paper_analysis_{result.get('target_year')}.md",
        mime="text/markdown",
        use_container_width=True,
    )
    c2.download_button(
        "Download full (.json)",
        data=__import__("json").dumps(result, indent=2),
        file_name=f"paper_analysis_{result.get('target_year')}.json",
        mime="application/json",
        use_container_width=True,
    )
