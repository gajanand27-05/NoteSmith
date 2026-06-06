@echo off
setlocal
cd /d %~dp0

if not exist venv (
    echo Virtual environment not found. Run setup.bat first.
    exit /b 1
)

call venv\Scripts\activate
echo Starting NoteSmith backend on http://localhost:8000
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir backend
endlocal
