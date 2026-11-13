@echo off
setlocal enabledelayedexpansion
title Import Trained Model into Ollama

echo =======================================================
echo          EngiBot - Import Trained Model into Ollama
echo =======================================================
echo.

:: Check if Ollama CLI is installed
where ollama >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ollama command line is not found in your PATH!
    echo Please install Ollama from: https://ollama.com/download
    echo After installing, restart this script.
    echo.
    pause
    exit /b 1
)

:: Change directory to models folder
cd /d "%~dp0"

echo Scanning for .gguf files in: %~dp0
set count=0
for %%f in (*.gguf) do (
    set /a count+=1
    set "file_!count!=%%f"
    echo   [!count!] %%f
)

if %count% EQU 0 (
    echo [INFO] No .gguf file found in "%~dp0".
    echo.
    echo Please copy or move your trained .gguf file into:
    echo   %~dp0
    echo.
    set /p "manual_file=Or enter the full path to your .gguf file: "
    if "!manual_file!"=="" (
        echo No file specified. Exiting.
        pause
        exit /b 1
    )
    set "GGUF_FILE=!manual_file!"
) else (
    echo.
    set /p "choice=Select file number [1-%count%] or press Enter for [1]: "
    if "!choice!"=="" set "choice=1"
    for %%i in (!choice!) do set "GGUF_FILE=!file_%%i!"
)

echo.
echo Selected model file: !GGUF_FILE!
echo.

set /p "MODEL_NAME=Enter name for your Ollama model [default: engibot-model]: "
if "!MODEL_NAME!"=="" set "MODEL_NAME=engibot-model"

echo.
echo Creating temporary Modelfile for !MODEL_NAME!...
(
    echo FROM "!GGUF_FILE!"
    echo PARAMETER temperature 0.7
    echo PARAMETER top_p 0.9
    echo PARAMETER repeat_penalty 1.1
    echo PARAMETER stop "<|im_end|>"
    echo PARAMETER stop "<end_of_turn>"
    echo PARAMETER stop "</s>"
    echo SYSTEM """You are EngiBot, an expert AI Engineering Assistant specializing in Computer Science, Civil, Electronics, Electrical, and Mechanical Engineering."""
) > "%~dp0TempModelfile"

echo.
echo Running: ollama create !MODEL_NAME! -f TempModelfile ...
ollama create !MODEL_NAME! -f "%~dp0TempModelfile"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =======================================================
    echo [SUCCESS] Model "!MODEL_NAME!" created successfully in Ollama!
    echo =======================================================
    echo.
    echo Next steps:
    echo 1. Ensure Ollama is running ('ollama serve')
    echo 2. Your backend is configured to use "!MODEL_NAME!"
    echo 3. Start EngiBot with start.bat!
    del "%~dp0TempModelfile" >nul 2>nul
) else (
    echo.
    echo [FAILED] Failed to create model in Ollama.
    echo Please ensure Ollama is installed and running ('ollama serve').
)

echo.
pause
