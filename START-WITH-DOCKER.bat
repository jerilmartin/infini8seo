@echo off
echo ========================================
echo Content Factory - Docker Start
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed or not running!
    echo.
    echo Please:
    echo 1. Install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    echo 2. Start Docker Desktop
    echo 3. Run this script again
    echo.
    echo Or use: START-MANUALLY.bat (doesn't require Docker)
    echo.
    pause
    exit /b 1
)

echo ✅ Docker is installed
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo ✅ Docker is running
echo.

echo Starting all services with Docker Compose...
echo This will start:
echo   - MongoDB
echo   - Redis
echo   - API Server
echo   - Worker Process
echo   - Frontend
echo.

docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ All services started successfully!
    echo ========================================
    echo.
    echo API Server:  http://localhost:3001/health
    echo Frontend:    http://localhost:3000
    echo.
    echo Wait 15-20 seconds for all services to start...
    timeout /t 10 >nul
    
    echo.
    echo View logs with: docker-compose logs -f
    echo Stop services with: docker-compose down
    echo.
    
    echo Opening browser...
    start http://localhost:3000
    
    echo.
    echo ========================================
    echo Service Status
    echo ========================================
    docker-compose ps
    echo.
) else (
    echo.
    echo ❌ Failed to start services!
    echo.
    echo Try: START-MANUALLY.bat instead
    echo.
)

pause

