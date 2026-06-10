# NoteSmith - Project Notes (for AI assistant)

## Owner
- Name: Gajanand Dhayagode
- GitHub: https://github.com/gajanand27-05/NoteSmith
- Username: gajanand27-05
- Email: gajanandvd2005@gmail.com

## Workflow rules
1. Build a feature only when the user explicitly asks.
2. After building, test it (pytest preferred, plus runtime smoke test).
3. Commit and push to the GitHub repo above after EVERY change.
4. After committing, give the user a complete report:
   - What was built
   - What it does
   - How it works
   - How to use it

## Git config (local to this repo only)
- user.name: Gajanand Dhayagode
- user.email: gajanandvd2005@gmail.com

## Commit message style
- Imperative mood, short subject (<= 60 chars)
- Optional body with details
- Examples: `Add question generator with 2/5/10-mark variants`, `Fix chunker overlap bug`

## Tech stack
- Backend: FastAPI, Pydantic, SQLite, ChromaDB, pypdf
- AI: Ollama (gemma4:12b chat, nomic-embed-text embeddings)
- Frontend: Streamlit multi-page
- Tests: pytest

## Project layout
- backend/app/ - FastAPI app
- frontend/ - Streamlit app (multi-page under pages/)
- data/ - uploads and ChromaDB persistence
- tests/ - pytest tests
- setup.bat, run_backend.bat, run_frontend.bat - Windows scripts
