@echo off
cd /d "%~dp0"
echo Starting Event Booking Platform Services...
echo.

IF EXIST backend\.env (
    echo Loading variables from backend\.env...
    for /f "usebackq tokens=1,* delims==" %%A in (`type "backend\.env" ^| findstr /v "^#" ^| findstr /v "^$"`) do (
        set "%%A=%%B"
    )
)

if "%GEMINI_API_KEY%"=="" (
    echo ERROR: GEMINI_API_KEY is not configured
    exit /b 1
)

echo [1] Starting Gateway Service on port 8080...
start "Gateway" cmd /k "cd backend && java -jar gateway-service/target/gateway-service-0.0.1-SNAPSHOT.jar"
ping 127.0.0.1 -n 4 > nul

echo [2] Starting Auth Service on port 8081...
start "Auth" cmd /k "cd backend && java -jar auth-service/target/auth-service-0.0.1-SNAPSHOT.jar"
ping 127.0.0.1 -n 4 > nul

echo [3] Starting Event Service on port 8082...
start "Event" cmd /k "cd backend && java -jar event-service/target/event-service-0.0.1-SNAPSHOT.jar"
ping 127.0.0.1 -n 4 > nul

echo [4] Starting Booking Service on port 8083...
start "Booking" cmd /k "cd backend && java -jar booking-service/target/booking-service-0.0.1-SNAPSHOT.jar"
ping 127.0.0.1 -n 4 > nul

echo [5] Starting AI Service (LangGraph RAG) on port 8001...
start "AI Service" cmd /k "cd ai-service && pip install -r requirements.txt && set AI_SERVICE_INTERNAL_TOKEN=super-secret-dev-token && set SPRING_AI_GATEWAY_URL=http://localhost:8081 && set QDRANT_URL=http://localhost:6333 && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
ping 127.0.0.1 -n 4 > nul

echo [6] Starting Frontend on port 5173...
start "Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo All services are starting in separate windows!
echo Frontend: http://localhost:5173
echo Gateway: http://localhost:8080
echo.
pause
