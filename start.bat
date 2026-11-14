@echo off
setlocal
cd /d "%~dp0"
title EngiBot Launcher

echo =======================================================
echo          Starting Engineering Chatbot (EngiBot)
echo =======================================================
echo.

echo.
echo Cleaning up any old running servers on ports 8000 and 5173...
powershell -Command "Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

:: 1. Check if Ollama is installed
where ollama >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [1/3] Checking Ollama local engine...
    curl -s http://localhost:11434/api/tags >nul 2>nul
    if errorlevel 1 (
        echo       Starting Ollama in background...
        start /min "Ollama Engine" ollama serve
    ) else (
        echo       Local Ollama is active.
    )
) else (
    echo [1/3] Ollama not installed - using Cloud AI models.
)

echo.
echo [2/3] Starting Backend Server on http://127.0.0.1:8000...
start "EngiBot Backend (FastAPI)" /d "%~dp0backend" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo [3/3] Starting Frontend Server on http://localhost:5173...
start "EngiBot Frontend (Vite)" /d "%~dp0" cmd /k "npm run dev"

echo.
echo =======================================================
echo  Both servers are launching in separate windows!
echo  Open your browser at: http://localhost:5173
echo  Do NOT close the EngiBot Backend window while using!
echo =======================================================
echo.
ping 127.0.0.1 -n 4 >nul
