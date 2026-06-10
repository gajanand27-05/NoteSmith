@echo off
setlocal
cd /d %~dp0

echo === NoteSmith Setup ===

where python >nul 2>nul
if errorlevel 1 (
    echo Python is not installed or not on PATH.
    echo Install Python 3.10+ from https://www.python.org/downloads/
    exit /b 1
)

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment.
        exit /b 1
    )
)

call venv\Scripts\activate
echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install dependencies.
    exit /b 1
)

if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env >nul
)

echo === Setup complete ===
echo Next steps:
echo   1. Make sure Ollama is running: ollama serve
echo   2. Pull models:
echo        ollama pull gemma4:12b
echo        ollama pull nomic-embed-text
echo   3. Start backend:  run_backend.bat
echo   4. Start frontend: run_frontend.bat
endlocal
