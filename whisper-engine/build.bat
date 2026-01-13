@echo off
REM ScriptGrab Whisper Engine - Windows Build Script
REM This script builds the whisper-engine as a standalone executable

echo ============================================
echo ScriptGrab Whisper Engine Build Script
echo ============================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)

REM Check if PyInstaller is available
python -m PyInstaller --version >nul 2>&1
if errorlevel 1 (
    echo PyInstaller not found. Installing...
    pip install pyinstaller
)

REM Run the build script
echo.
echo Starting build...
echo.
python build.py %*

if errorlevel 1 (
    echo.
    echo Build failed!
    exit /b 1
)

echo.
echo Build completed successfully!
pause
