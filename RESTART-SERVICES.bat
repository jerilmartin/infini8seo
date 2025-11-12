@echo off
echo ========================================
echo   RESTARTING ALL SERVICES
echo ========================================
echo.

echo [1/3] Stopping existing services...
taskkill /F /FI "WINDOWTITLE eq Content Factory*" 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Starting API Server...
start "Content Factory API" cmd /k "cd /d %~dp0 && npm run dev:server"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Worker...
start "Content Factory Worker" cmd /k "cd /d %~dp0 && npm run dev:worker"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   ALL SERVICES RESTARTED!
echo ========================================
echo.
echo API Server: Running on port 3001
echo Worker: Processing jobs with LATEST code
echo Frontend: Should already be running on port 3000
echo.
echo If frontend is not running:
echo   cd client
echo   npm run dev
echo.
pause

