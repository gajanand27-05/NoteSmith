@echo off
setlocal
cd /d %~dp0

if not exist venv (
    echo Virtual environment not found. Run setup.bat first.
    exit /b 1
)

call venv\Scripts\activate
echo Starting NoteSmith frontend on http://localhost:8501
streamlit run frontend/app.py
endlocal
