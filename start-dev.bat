@echo off
cd /d "%~dp0"
echo Starting Nexora Development Services...
echo.

echo [1] Starting Auth Service (Spring Boot) on port 8081...
start "Auth Service" cmd /k "cd backend && powershell -ExecutionPolicy Bypass -File .\run_backend.ps1"
ping 127.0.0.1 -n 10 > nul

echo [2] Starting AI Service (Python) on port 8002...
start "AI Service" cmd /k "cd ai-service && powershell -ExecutionPolicy Bypass -File .\run_ai.ps1"
ping 127.0.0.1 -n 5 > nul

echo [3] Starting Frontend on port 5173...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services are starting in separate windows!
echo Frontend: http://localhost:5173
echo.

