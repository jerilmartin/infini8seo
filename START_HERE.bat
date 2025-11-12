@echo off
echo ========================================
echo Content Factory - Quick Setup Check
echo ========================================
echo.

echo Checking Node.js installation...
node --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is installed
echo.

echo Checking npm installation...
npm --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed!
    pause
    exit /b 1
)
echo ✅ npm is installed
echo.

echo Checking .env file...
if exist .env (
    echo ✅ .env file exists
    echo.
    echo ⚠️  IMPORTANT: Please verify these settings in .env:
    echo    1. MONGODB_URI - Your MongoDB connection string
    echo    2. GEMINI_API_KEY - Your Google Gemini API key
    echo.
    findstr /C:"your_gemini_api_key_here" .env >nul
    if %ERRORLEVEL% EQU 0 (
        echo ⚠️  WARNING: Gemini API key is still the placeholder!
        echo    Get your API key from: https://aistudio.google.com/app/apikey
        echo.
    )
    findstr /C:"mongodb://localhost:27017" .env >nul
    if %ERRORLEVEL% EQU 0 (
        echo ⚠️  INFO: Using local MongoDB (localhost)
        echo    Or get MongoDB Atlas from: https://www.mongodb.com/cloud/atlas
        echo.
    )
) else (
    echo ❌ .env file not found!
    echo Creating .env from template...
    copy .env.example .env
)

echo Checking client/.env.local file...
if exist client\.env.local (
    echo ✅ client/.env.local exists
) else (
    echo Creating client/.env.local...
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 > client\.env.local
    echo ✅ Created client/.env.local
)
echo.

echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Edit .env file with your credentials:
echo    - MONGODB_URI (MongoDB Atlas or local)
echo    - GEMINI_API_KEY (from Google AI Studio)
echo.
echo 2. Choose how to run:
echo.
echo    OPTION A: Run with Docker (Easiest)
echo    ► START-WITH-DOCKER.bat
echo.
echo    OPTION B: Run manually (No Docker needed)
echo    ► START-MANUALLY.bat
echo.
echo 3. Open browser to http://localhost:3000
echo.
echo ========================================
echo.
pause

