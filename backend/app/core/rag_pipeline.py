from app.core import retriever
from app.core.llm import llm

SYSTEM_PROMPT = (
    "You are NoteSmith, a study assistant. Answer the student's question using ONLY "
    "the provided notes. If the answer is not in the notes, say clearly that it is not "
    "covered. Be clear, accurate, and exam-ready. Use bullet points when listing items."
)


def answer_question(pdf_id: str, question: str, top_k: int = 5) -> dict:
    chunks = retriever.retrieve(pdf_id, question, top_k=top_k)
    if not chunks:
        return {
            "answer": "No relevant content found in the uploaded notes.",
            "sources": [],
        }

    context_parts = [f"[Excerpt {i}]\n{c['text']}" for i, c in enumerate(chunks, 1)]
    context = "\n\n---\n\n".join(context_parts)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"NOTES FROM THE STUDENT'S PDF:\n{context}\n\n"
                f"QUESTION: {question}\n\n"
                "ANSWER:"
            ),
        },
    ]
    answer = llm.chat_text(messages)
    return {"answer": answer, "sources": chunks}
