@echo off
setlocal
cd /d %~dp0

echo === Starting NoteSmith Backend + Frontend ===
echo.

if not exist venv (
    echo Virtual environment not found. Run setup.bat first.
    exit /b 1
)

call venv\Scripts\activate

echo Starting Backend on http://localhost:8000...
start "NoteSmith Backend" cmd /k "cd /d %~dp0 && call venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir backend"

timeout /t 4 >nul

echo Starting Frontend on http://localhost:8501...
start "NoteSmith Frontend" cmd /k "cd /d %~dp0 && call venv\Scripts\activate && streamlit run frontend/app.py --server.port 8501"

echo.
echo Both services starting in separate windows.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:8501
echo.
echo NOTE: Ollama must run separately in its own terminal:
echo       ollama serve

endlocal