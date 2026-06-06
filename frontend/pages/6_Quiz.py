from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import streamlit as st

from _api import generate_quiz, health, list_pdfs

st.set_page_config(
    page_title="Quiz - NoteSmith", page_icon=None, layout="wide"
)

st.title("Quiz Mode")
st.caption("MCQ-based self-test with instant feedback and a final score.")

if "quiz" not in st.session_state:
    st.session_state.quiz = None
if "quiz_answers" not in st.session_state:
    st.session_state.quiz_answers = {}
if "quiz_submitted" not in st.session_state:
    st.session_state.quiz_submitted = set()
if "quiz_finished" not in st.session_state:
    st.session_state.quiz_finished = False
if "quiz_current" not in st.session_state:
    st.session_state.quiz_current = 0


def reset_quiz() -> None:
    st.session_state.quiz = None
    st.session_state.quiz_answers = {}
    st.session_state.quiz_submitted = set()
    st.session_state.quiz_finished = False
    st.session_state.quiz_current = 0


if not health():
    st.error("Backend is offline. Start it with `run_backend.bat`.")
    st.stop()

pdfs = list_pdfs()
if not pdfs:
    st.info("No PDFs uploaded yet. Go to the Upload page first.")
    st.stop()

if st.session_state.quiz is None:
    st.subheader("Set up a new quiz")
    options = {f"{p['original_name']}  -  {p['page_count']}p": p["id"] for p in pdfs}
    label = st.selectbox("Select a PDF", list(options.keys()))
    pdf_id = options[label]

    c1, c2, c3 = st.columns(3)
    with c1:
        count = st.slider("Number of questions", 3, 30, 10, step=1)
    with c2:
        difficulty = st.select_slider(
            "Difficulty",
            options=["easy", "medium", "hard"],
            value="medium",
            help="Easy = recall, Medium = apply, Hard = analyze",
        )
    with c3:
        topic = st.text_input(
            "Topic (optional)",
            placeholder="e.g., parsing, tokenization",
            label_visibility="visible",
        )

    if st.button("Generate quiz", type="primary"):
        with st.spinner(
            f"Generating {count} {difficulty} MCQs... this can take 1-3 minutes on a local model."
        ):
            result = generate_quiz(
                pdf_id, count, difficulty, topic.strip() or None
            )
        if result:
            qs = result.get("questions", [])
            if not qs:
                st.warning("No questions parsed. Check raw output.")
                if result.get("raw_output"):
                    with st.expander("Raw AI output"):
                        st.text(result["raw_output"])
            else:
                st.session_state.quiz = {
                    "pdf_id": pdf_id,
                    "questions": qs,
                    "difficulty": difficulty,
                    "topic": topic,
                    "raw_output": result.get("raw_output", ""),
                }
                reset_quiz_soft()
                st.rerun()
    st.stop()


def reset_quiz_soft() -> None:
    st.session_state.quiz_answers = {}
    st.session_state.quiz_submitted = set()
    st.session_state.quiz_finished = False
    st.session_state.quiz_current = 0


reset_quiz_soft()

quiz = st.session_state.quiz
questions = quiz["questions"]
total = len(questions)
current = st.session_state.quiz_current

if st.session_state.quiz_finished:
    st.divider()
    score = sum(
        1
        for i, q in enumerate(questions)
        if st.session_state.quiz_answers.get(i) == q["correct"]
    )
    pct = (score / total) * 100
    st.subheader("Final score")
    c1, c2, c3 = st.columns(3)
    c1.metric("Score", f"{score} / {total}")
    c2.metric("Percentage", f"{pct:.0f}%")
    if pct >= 80:
        c3.success("Excellent")
    elif pct >= 60:
        c3.warning("Good, room to improve")
    else:
        c3.error("Needs more revision")

    st.divider()
    st.subheader("Review")
    for i, q in enumerate(questions):
        user = st.session_state.quiz_answers.get(i, "(no answer)")
        ok = user == q["correct"]
        with st.expander(
            f"Q{i+1}. {'Correct' if ok else 'Wrong'} - your answer: {user}, correct: {q['correct']}"
        ):
            st.markdown(q["question"])
            for opt in q["options"]:
                marker = ""
                if opt["label"] == q["correct"]:
                    marker = " (correct)"
                if opt["label"] == user and not ok:
                    marker = " (your answer)"
                st.markdown(f"- **{opt['label']}.** {opt['text']}{marker}")
            if q.get("explanation"):
                st.info(q["explanation"])

    c1, c2 = st.columns(2)
    if c1.button("Start a new quiz", type="primary", use_container_width=True):
        reset_quiz()
        st.rerun()
    if c2.button("Download quiz (.md)", use_container_width=True):
        lines = [f"# Quiz - {quiz.get('topic') or 'Untitled'}", ""]
        for i, q in enumerate(questions):
            user = st.session_state.quiz_answers.get(i, "(no answer)")
            ok = "Correct" if user == q["correct"] else "Wrong"
            lines.append(f"**Q{i+1}.** {q['question']}")
            for opt in q["options"]:
                mark = " (correct)" if opt["label"] == q["correct"] else ""
                lines.append(f"- {opt['label']}. {opt['text']}{mark}")
            lines.append(f"*Your answer: {user} - {ok}*")
            if q.get("explanation"):
                lines.append(f"*Explanation:* {q['explanation']}")
            lines.append("")
        st.download_button(
            "Download review.md",
            data="\n".join(lines),
            file_name="quiz_review.md",
            mime="text/markdown",
            use_container_width=True,
        )
    st.stop()


st.progress((current + 1) / total)
header_cols = st.columns([3, 1])
header_cols[0].markdown(
    f"**Question {current + 1} of {total}**  -  Difficulty: `{quiz['difficulty']}`"
)
header_cols[1].markdown(
    f"**Score so far:** {sum(1 for i in st.session_state.quiz_answers if i in st.session_state.quiz_submitted and questions[i]['correct'] == st.session_state.quiz_answers.get(i))} / {len(st.session_state.quiz_submitted)}"
)

q = questions[current]
st.markdown(f"### {q['question']}")

option_labels = [f"{opt['label']}. {opt['text']}" for opt in q["options"]]
selected = st.radio(
    "Choose one:",
    option_labels,
    key=f"radio_{current}_{quiz['pdf_id']}",
    label_visibility="collapsed",
)

if current in st.session_state.quiz_submitted:
    user_label = st.session_state.quiz_answers.get(current, "")
    correct_label = q["correct"]
    if user_label == correct_label:
        st.success(f"Correct! The answer is {correct_label}.")
    else:
        st.error(f"Not quite. You picked {user_label}, correct is {correct_label}.")
    if q.get("explanation"):
        st.info(f"**Why:** {q['explanation']}")

    nav_cols = st.columns([1, 1, 4])
    if current < total - 1:
        if nav_cols[0].button("Next question", type="primary"):
            st.session_state.quiz_current += 1
            st.rerun()
    else:
        if nav_cols[0].button("See results", type="primary"):
            st.session_state.quiz_finished = True
            st.rerun()
    if nav_cols[1].button("Quit quiz"):
        reset_quiz()
        st.rerun()
else:
    nav_cols = st.columns([1, 1, 4])
    if nav_cols[0].button("Submit answer", type="primary", disabled=not selected):
        user_label = selected.split(".", 1)[0].strip()
        st.session_state.quiz_answers[current] = user_label
        st.session_state.quiz_submitted.add(current)
        st.rerun()
    if nav_cols[1].button("Quit quiz"):
        reset_quiz()
        st.rerun()
