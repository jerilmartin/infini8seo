@echo off
echo ========================================
echo Content Factory - Manual Start
echo ========================================
echo.
echo This will open 3 windows:
echo 1. API Server (port 3001)
echo 2. Worker Process
echo 3. Frontend (port 3000)
echo.
echo Press any key to continue...
pause >nul

echo Starting services...
echo.

REM Start API Server
start "Content Factory - API Server" cmd /k "cd /d %~dp0 && npm run dev:server"
timeout /t 2 >nul

REM Start Worker
start "Content Factory - Worker" cmd /k "cd /d %~dp0 && npm run dev:worker"
timeout /t 2 >nul

REM Start Frontend
start "Content Factory - Frontend" cmd /k "cd /d %~dp0\client && npm run dev"
timeout /t 3 >nul

echo.
echo ========================================
echo ✅ All services started!
echo ========================================
echo.
echo API Server:  http://localhost:3001/health
echo Frontend:    http://localhost:3000
echo.
echo Wait 10-15 seconds for services to start, then:
timeout /t 5 >nul

echo.
echo Opening browser...
start http://localhost:3000

echo.
echo ========================================
echo Service Windows Opened:
echo ========================================
echo 1. API Server (keep this running)
echo 2. Worker Process (keep this running)
echo 3. Frontend (keep this running)
echo.
echo To stop: Close all service windows
echo.
pause

