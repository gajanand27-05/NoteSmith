from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import streamlit as st

from _api import get_dashboard_overall, health, list_pdfs

st.set_page_config(
    page_title="Dashboard - NoteSmith", page_icon=None, layout="wide"
)

st.title("Current State")
st.caption(
    "Your mastery, readiness, and learning streak - computed from every "
    "quiz, flashcard, and tutor session you've logged."
)

if not health():
    st.error("Backend is offline. Start it with `run_backend.bat`.")
    st.stop()

days = st.sidebar.slider("Lookback window (days)", 7, 180, 30, step=7)

data = get_dashboard_overall(days=days)
if data is None:
    st.stop()

mastery = data.get("mastery")
readiness = data.get("readiness")
streak = data.get("streak", {}) or {}
pdf_count = data.get("pdf_count", 0)
active_pdfs = data.get("active_pdfs", 0)
total_attempts = data.get("total_attempts", 0)


def _pct(v):
    return f"{v * 100:.0f}%" if v is not None else "-"


def _mastery_color(v: float | None) -> str:
    if v is None:
        return "off"
    if v >= 0.8:
        return "normal"
    if v >= 0.6:
        return "normal"
    if v >= 0.4:
        return "normal"
    return "off"


st.divider()
m_col, r_col, s_col, p_col = st.columns(4)

with m_col:
    st.metric(
        "Overall Mastery",
        _pct(mastery),
        help="Weighted accuracy across all tracked activity in the window.",
    )
    if mastery is not None:
        st.progress(mastery)

with r_col:
    st.metric(
        "Overall Readiness",
        _pct(readiness),
        help="Mastery decayed by time since last activity (14-day half-life).",
    )
    if readiness is not None:
        st.progress(readiness)

with s_col:
    current = streak.get("current", 0)
    best = streak.get("best", 0)
    today = streak.get("today_active", False)
    label = f"{current} day" if current == 1 else f"{current} days"
    st.metric("Current Streak", label, help="Consecutive UTC days with activity.")
    if best > 0 and best != current:
        st.caption(f"Best: {best} days")
    if today:
        st.caption("Today active")
    else:
        st.caption("No activity today")

with p_col:
    st.metric("Active PDFs", f"{active_pdfs} / {pdf_count}")
    st.caption(f"{total_attempts} attempts in window")


pdfs = data.get("pdfs", [])
if not pdfs:
    st.info("No PDFs uploaded yet.")
    st.stop()


st.divider()
st.subheader("Per-PDF breakdown")


def _trend_badge(trend: str) -> str:
    return {
        "improving": "Improving",
        "declining": "Declining",
        "stable": "Stable",
        "new": "New",
    }.get(trend, trend or "-")


def _days_label(d):
    if d is None:
        return "never"
    if d == 0:
        return "today"
    if d == 1:
        return "yesterday"
    return f"{d} days ago"


for d in pdfs:
    pdf_id = d["pdf_id"]
    filename = d.get("filename", pdf_id)
    with st.container(border=True):
        head_cols = st.columns([3, 1, 1, 1])
        with head_cols[0]:
            st.markdown(f"**{filename}**")
            st.caption(
                f"Last activity: {_days_label(d.get('days_since_last'))}  -  "
                f"trend: {_trend_badge(d.get('trend'))}"
            )
        with head_cols[1]:
            st.metric("Mastery", _pct(d.get("mastery")))
        with head_cols[2]:
            st.metric("Readiness", _pct(d.get("readiness")))
        with head_cols[3]:
            st.metric(
                "Topics",
                d.get("topics_covered", 0),
                help="Topics with at least one attempt in the window.",
            )

        topics = d.get("topics", []) or []
        if topics:
            st.markdown("**Topic Breakdown**")
            for t in topics:
                cols = st.columns([3, 1])
                with cols[0]:
                    label = t["topic"] if t["topic"] else "(overall)"
                    st.markdown(f"`{label}`")
                    st.progress(t["mastery"])
                with cols[1]:
                    st.caption(
                        f"{t['mastery'] * 100:.0f}%  -  {t['attempts']} attempts"
                    )
        else:
            st.caption(
                "No topic-tagged data yet. Pass a topic when drilling to populate this."
            )

        foot_cols = st.columns([2, 2, 1])
        with foot_cols[0]:
            st.caption(
                f"Quiz: {d.get('quiz_attempts', 0)}  -  "
                f"Flashcards: {d.get('flashcard_reviews', 0)}  -  "
                f"Tutor: {d.get('tutor_sessions', 0)}"
            )
        with foot_cols[1]:
            weak_count = sum(1 for t in topics if t["mastery"] < 0.6)
            if weak_count > 0:
                st.caption(f"{weak_count} weak topic(s) below 60%")
            else:
                st.caption("All practiced topics at or above 60%")
        with foot_cols[2]:
            if st.button(
                "Drill",
                key=f"drill_{pdf_id}",
                use_container_width=True,
                type="primary",
            ):
                st.query_params["pdf_id"] = pdf_id
                st.switch_page("pages/0_Study_Loop.py")
