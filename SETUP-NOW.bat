@echo off
echo.
echo ========================================================================
echo   CONTENT FACTORY - FINAL SETUP (2 Minutes!)
echo ========================================================================
echo.
echo You're almost there! Just need 2 things:
echo.
echo ========================================================================
echo   STEP 1: GET MONGODB ATLAS (FREE - Takes 2 minutes)
echo ========================================================================
echo.
echo 1. Open this link in your browser:
echo    https://www.mongodb.com/cloud/atlas
echo.
echo 2. Click "Try Free" and sign up
echo.
echo 3. Create a FREE M0 Cluster (no credit card needed)
echo.
echo 4. Click "Connect" then "Connect your application"
echo.
echo 5. Choose: Driver = Node.js
echo.
echo 6. Copy the connection string (looks like this):
echo    mongodb+srv://username:^<password^>@cluster.mongodb.net/
echo.
echo 7. REPLACE ^<password^> with your actual password!
echo.
echo 8. ADD /content-factory before the ?
echo.
echo    Final format:
echo    mongodb+srv://user:pass@cluster.mongodb.net/content-factory?retryWrites=true
echo.
pause
echo.
echo ========================================================================
echo   STEP 2: GET GEMINI API KEY (FREE - Takes 1 minute)
echo ========================================================================
echo.
echo 1. Open this link:
echo    https://aistudio.google.com/app/apikey
echo.
echo 2. Sign in with Google
echo.
echo 3. Click "Create API Key"
echo.
echo 4. Copy the key (starts with: AIzaSy...)
echo.
pause
echo.
echo ========================================================================
echo   STEP 3: UPDATE .ENV FILE
echo ========================================================================
echo.
echo Opening .env file in notepad...
echo.
timeout /t 2 >nul
notepad .env
echo.
echo In the .env file, update these two lines:
echo.
echo   MONGODB_URI=paste_your_mongodb_connection_string_here
echo   GEMINI_API_KEY=paste_your_api_key_here
echo.
echo Then SAVE and CLOSE notepad.
echo.
pause
echo.
echo ========================================================================
echo   STARTING APPLICATION...
echo ========================================================================
echo.
echo Starting services in 3 separate windows...
echo.

REM Start API Server
start "Content Factory - API Server" cmd /k "cd /d %~dp0 && npm run dev:server"
timeout /t 3 >nul

REM Start Worker
start "Content Factory - Worker" cmd /k "cd /d %~dp0 && npm run dev:worker"
timeout /t 3 >nul

REM Start Frontend
start "Content Factory - Frontend" cmd /k "cd /d %~dp0\client && npm run dev"
timeout /t 5 >nul

echo.
echo ========================================================================
echo   OPENING BROWSER...
echo ========================================================================
echo.
timeout /t 3 >nul
start http://localhost:3000

echo.
echo ========================================================================
echo   ALL DONE!
echo ========================================================================
echo.
echo   Frontend:  http://localhost:3000
echo   API:       http://localhost:3001/health
echo.
echo Three windows are now running:
echo   1. API Server
echo   2. Worker Process
echo   3. Frontend
echo.
echo Keep all three windows open!
echo.
echo If you see connection errors, make sure you:
echo   1. Added correct MongoDB URI to .env
echo   2. Added correct Gemini API key to .env
echo   3. Restarted the services
echo.
pause

