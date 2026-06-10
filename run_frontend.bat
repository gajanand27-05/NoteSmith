@echo off
setlocal
cd /d %~dp0

if not exist venv (
    echo Virtual environment not found. Run setup.bat first.
    exit /b 1
)

echo Starting NoteSmith frontend on http://localhost:3000
cd frontend
npm run dev
endlocal
