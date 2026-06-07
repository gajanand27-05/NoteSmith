from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import streamlit as st

from _api import (
    explain_concept,
    generate_flashcards,
    generate_quiz,
    get_weak_topics,
    health,
    list_pdfs,
    record_flashcard_result,
    record_quiz_result,
    record_tutor_log,
)

st.set_page_config(
    page_title="Study Loop - NoteSmith", page_icon=None, layout="wide"
)

st.title("Study Loop")
st.caption(
    "Find your weak topics, drill them with flashcards and quizzes, "
    "ask the tutor to explain what you missed, and watch the loop tighten."
)

if not health():
    st.error("Backend is offline. Start it with `run_backend.bat`.")
    st.stop()

pdfs = list_pdfs()
if not pdfs:
    st.info("Upload a PDF first.")
    st.stop()

options = {f"{p['original_name']}  -  {p['page_count']}p": p["id"] for p in pdfs}
preselect = st.query_params.get("pdf_id")
default_index = 0
if preselect and preselect in options.values():
    default_index = list(options.values()).index(preselect)
label = st.selectbox(
    "Select a PDF", list(options.keys()), index=default_index
)
pdf_id = options[label]

if "loop_drill_topic" not in st.session_state:
    st.session_state.loop_drill_topic = None
if "loop_quiz" not in st.session_state:
    st.session_state.loop_quiz = None
if "loop_quiz_answers" not in st.session_state:
    st.session_state.loop_quiz_answers = {}
if "loop_quiz_submitted" not in st.session_state:
    st.session_state.loop_quiz_submitted = set()
if "loop_quiz_finished" not in st.session_state:
    st.session_state.loop_quiz_finished = False
if "loop_cards" not in st.session_state:
    st.session_state.loop_cards = None
if "loop_card_idx" not in st.session_state:
    st.session_state.loop_card_idx = 0
if "loop_recorded" not in st.session_state:
    st.session_state.loop_recorded = False


def reset_drill() -> None:
    st.session_state.loop_quiz = None
    st.session_state.loop_quiz_answers = {}
    st.session_state.loop_quiz_submitted = set()
    st.session_state.loop_quiz_finished = False
    st.session_state.loop_cards = None
    st.session_state.loop_card_idx = 0
    st.session_state.loop_drill_topic = None
    st.session_state.loop_recorded = False


st.divider()
st.subheader("Where you stand")

weak = get_weak_topics(pdf_id, days=30)
if weak is None:
    st.stop()

overall = weak.get("overall")
topics = weak.get("topics", [])

if overall is None:
    st.info(
        "No history yet. Drill a topic below to start building your weakness map."
    )
else:
    c1, c2, c3 = st.columns(3)
    acc = overall["accuracy"] * 100
    c1.metric("Overall accuracy", f"{acc:.0f}%")
    c2.metric("Total attempts", overall["attempts"])
    c3.metric("Topics tracked", overall["topic_count"])

    if topics:
        df = pd.DataFrame(
            [
                {
                    "Topic": t["topic"] or "(overall)",
                    "Accuracy": f"{t['accuracy'] * 100:.0f}%",
                    "Attempts": t["attempts"],
                    "Quiz": t["quiz_count"],
                    "Flashcards": t["flashcard_count"],
                }
                for t in topics
            ]
        )
        st.dataframe(df, use_container_width=True, hide_index=True)
        st.bar_chart(
            pd.DataFrame(
                {
                    "topic": [t["topic"] or "(overall)" for t in topics],
                    "accuracy": [t["accuracy"] for t in topics],
                }
            ).set_index("topic")
        )
    else:
        st.caption("No topic-tagged attempts yet. Pass `topic=...` when drilling to populate this.")

st.divider()
st.subheader("Drill a weak topic")

if topics:
    weak_topics = [t["topic"] for t in topics if t["topic"] is not None][:5]
    if weak_topics:
        cols = st.columns(len(weak_topics) + 1)
        for i, t in enumerate(weak_topics):
            if cols[i].button(t, key=f"drill_{t}", use_container_width=True):
                st.session_state.loop_drill_topic = t
        if cols[-1].button("Overall", key="drill_overall", use_container_width=True):
            st.session_state.loop_drill_topic = None
        st.caption(
            f"Currently drilling: "
            f"`{st.session_state.loop_drill_topic or '(no topic filter)'}`"
        )
    else:
        st.caption("No topic-tagged data yet - drilling will apply no topic filter.")
else:
    st.caption("No data yet - drilling will apply no topic filter.")

topic = st.session_state.loop_drill_topic
c1, c2, c3 = st.columns(3)
with c1:
    quiz_count = st.slider("Quiz questions", 3, 15, 5, key="loop_quiz_count")
with c2:
    fc_count = st.slider("Flashcards", 5, 30, 10, key="loop_fc_count", step=5)
with c3:
    difficulty = st.select_slider(
        "Difficulty", options=["easy", "medium", "hard"], value="medium", key="loop_diff"
    )

c1, c2, c3 = st.columns(3)
quiz_go = c1.button(
    "Start weak-topic quiz", type="primary", use_container_width=True
)
fc_go = c2.button(
    "Start weak-topic flashcards", use_container_width=True
)
reset_go = c3.button("Reset drill state", use_container_width=True)

if reset_go:
    reset_drill()
    st.rerun()

if quiz_go:
    with st.spinner(
        f"Generating {quiz_count} {difficulty} MCQs"
        f"{' on ' + topic if topic else ''}..."
    ):
        result = generate_quiz(
            pdf_id, quiz_count, difficulty, topic
        )
    if result and result.get("questions"):
        st.session_state.loop_quiz = {
            "questions": result["questions"],
            "topic": topic,
            "difficulty": difficulty,
        }
        st.session_state.loop_quiz_answers = {}
        st.session_state.loop_quiz_submitted = set()
        st.session_state.loop_quiz_finished = False
        st.session_state.loop_recorded = False
        st.session_state.loop_cards = None
    else:
        st.warning("Quiz generation failed. Try again with a different topic or count.")

if fc_go:
    with st.spinner(
        f"Generating {fc_count} flashcards"
        f"{' on ' + topic if topic else ''}..."
    ):
        result = generate_flashcards(pdf_id, fc_count, topic)
    if result and result.get("flashcards"):
        st.session_state.loop_cards = result["flashcards"]
        st.session_state.loop_card_idx = 0
        st.session_state.loop_quiz = None
        st.session_state.loop_recorded = False
    else:
        st.warning("Flashcard generation failed. Try a different topic or count.")


quiz = st.session_state.loop_quiz
if quiz:
    st.divider()
    questions = quiz["questions"]
    total = len(questions)
    submitted_qs = st.session_state.loop_quiz_submitted

    if st.session_state.loop_quiz_finished:
        score = sum(
            1
            for i, q in enumerate(questions)
            if st.session_state.loop_quiz_answers.get(i) == q["correct"]
        )
        st.subheader(f"Quiz result: {score} / {total}")
        st.progress(score / total if total else 0)

        if not st.session_state.loop_recorded:
            record_quiz_result(pdf_id, score, total, topic=quiz["topic"])
            st.session_state.loop_recorded = True

        with st.expander("Review", expanded=False):
            for i, q in enumerate(questions):
                user = st.session_state.loop_quiz_answers.get(i, "(no answer)")
                ok = user == q["correct"]
                st.markdown(
                    f"**Q{i+1}. {'Correct' if ok else 'Wrong'}** - your answer: "
                    f"`{user}`, correct: `{q['correct']}`"
                )
                st.caption(q["question"])
                if q.get("explanation"):
                    st.caption(f"Why: {q['explanation']}")

        if st.button("Refresh weakness", type="primary"):
            st.rerun()
    else:
        st.subheader("Answer the quiz")
        for i, q in enumerate(questions):
            with st.container(border=True):
                st.markdown(f"**Q{i+1}.** {q['question']}")
                option_labels = [
                    f"{opt['label']}. {opt['text']}" for opt in q["options"]
                ]
                selected = st.radio(
                    "Choose one:",
                    option_labels,
                    key=f"loop_q_{i}",
                    label_visibility="collapsed",
                )
                if i in submitted_qs:
                    user_label = st.session_state.loop_quiz_answers.get(i, "")
                    correct_label = q["correct"]
                    if user_label == correct_label:
                        st.success(f"Correct: {correct_label}")
                    else:
                        st.error(
                            f"You picked {user_label}, correct is {correct_label}"
                        )
                    if q.get("explanation"):
                        st.info(f"Why: {q['explanation']}")
                else:
                    if st.button(
                        "Submit",
                        key=f"loop_submit_{i}",
                        disabled=not selected,
                    ):
                        user_label = selected.split(".", 1)[0].strip()
                        st.session_state.loop_quiz_answers[i] = user_label
                        st.session_state.loop_quiz_submitted.add(i)
                        st.rerun()

        all_done = len(submitted_qs) == total
        if all_done:
            if st.button("See result and update weakness", type="primary"):
                st.session_state.loop_quiz_finished = True
                st.rerun()


cards = st.session_state.loop_cards
if cards:
    st.divider()
    idx = st.session_state.loop_card_idx
    total = len(cards)
    if idx >= total:
        st.success("Deck done!")
        if st.button("Refresh weakness", type="primary"):
            st.rerun()
    else:
        card = cards[idx]
        st.progress((idx + 1) / total)
        st.caption(f"Card {idx + 1} of {total}")
        with st.container(border=True):
            st.markdown(f"**Front:** {card['front']}")
            if st.button("Reveal", key=f"loop_reveal_{idx}"):
                st.session_state[f"loop_show_{idx}"] = True
            if st.session_state.get(f"loop_show_{idx}"):
                st.success(card["back"])
                c1, c2 = st.columns(2)
                if c1.button("I knew it", key=f"loop_knew_{idx}", use_container_width=True):
                    record_flashcard_result(pdf_id, card["number"] - 1, True, topic=topic)
                    st.session_state.loop_card_idx = idx + 1
                    st.rerun()
                if c2.button(
                    "Didn't know", key=f"loop_dk_{idx}", use_container_width=True
                ):
                    record_flashcard_result(pdf_id, card["number"] - 1, False, topic=topic)
                    st.session_state.loop_card_idx = idx + 1
                    st.rerun()


st.divider()
st.subheader("Ask the tutor to explain")
c1, c2 = st.columns([3, 1])
with c1:
    concept = st.text_input(
        "Concept to explain",
        value=st.session_state.loop_drill_topic or "",
        placeholder="e.g., Backpropagation, Tokenization",
        key="loop_concept",
    )
with c2:
    level = st.selectbox(
        "Level",
        options=[
            "kid",
            "school",
            "high_school",
            "college",
            "engineering",
            "interview",
        ],
        index=3,
        key="loop_level",
    )

if st.button("Explain", type="primary") and concept.strip():
    with st.spinner(f"Explaining '{concept}' at {level} level..."):
        result = explain_concept(concept.strip(), level, pdf_id=pdf_id)
    if result:
        record_tutor_log(concept.strip(), level, pdf_id=pdf_id)
        st.markdown(result.get("explanation", ""))
        if result.get("example"):
            st.info(f"**Example:** {result['example']}")
        if result.get("follow_ups"):
            st.caption("Follow-ups: " + " | ".join(result["follow_ups"]))
