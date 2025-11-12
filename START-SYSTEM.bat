@echo off
echo ========================================
echo   CONTENT FACTORY - SYSTEM STARTUP
echo ========================================
echo.

REM Test system first
echo [1/4] Testing system configuration...
echo.
call npm test

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   SYSTEM TEST FAILED!
    echo ========================================
    echo.
    echo Please fix the errors above before starting.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ALL TESTS PASSED! Starting services...
echo ========================================
echo.
echo [2/4] Starting API Server...
start "Content Factory API" cmd /k "npm run dev:server"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Worker...
start "Content Factory Worker" cmd /k "npm run dev:worker"
timeout /t 3 /nobreak >nul

echo [4/4] Starting Frontend...
start "Content Factory Frontend" cmd /k "cd client && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ALL SERVICES STARTED!
echo ========================================
echo.
echo Three terminal windows have opened:
echo   1. API Server (port 3001)
echo   2. Worker (background processing)
echo   3. Frontend (port 3000)
echo.
echo Wait 10 seconds, then open:
echo   http://localhost:3000
echo.
echo To stop all services, close the three terminal windows.
echo.
pause

