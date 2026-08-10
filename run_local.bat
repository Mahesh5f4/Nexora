@echo off
title EventHub Local Microservices Runner
cls
echo =====================================================================
echo    🌌 EventHub: Distributed Event Booking Platform Local Runner
echo =====================================================================
echo.
echo [1/5] Starting Gateway Service on port 8080...
start "Gateway Service (Port 8080)" cmd /k "cd backend && java -jar gateway-service/target/gateway-service-0.0.1-SNAPSHOT.jar"

echo [2/5] Starting Auth Service on port 8081...
start "Auth Service (Port 8081)" cmd /k "cd backend && java -jar auth-service/target/auth-service-0.0.1-SNAPSHOT.jar"

echo [3/5] Starting Event Service on port 8082...
start "Event Service (Port 8082)" cmd /k "cd backend && java -jar event-service/target/event-service-0.0.1-SNAPSHOT.jar"

echo [4/5] Starting Booking Service on port 8083...
start "Booking Service (Port 8083)" cmd /k "cd backend && java -jar booking-service/target/booking-service-0.0.1-SNAPSHOT.jar"

echo [5/5] Starting React Frontend on port 5173...
start "React Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo    🚀 All services have been launched in separate, persistent windows!
echo    - Frontend client is running on: http://localhost:5173
echo    - API Gateway router is running on: http://localhost:8080
echo =====================================================================
echo.
pause
