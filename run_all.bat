@echo off
setlocal
cd /d %~dp0

echo === Starting NoteSmith (2 terminals) ===
echo.

echo [1/3] Starting Ollama in background...
start /B ollama serve
timeout /t 3 >nul

echo [2/3] Starting Backend on http://localhost:8000...
call venv\Scripts\activate
start /B uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir backend
timeout /t 3 >nul

echo [3/3] Starting Frontend on http://localhost:8501...
streamlit run frontend/app.py

endlocal