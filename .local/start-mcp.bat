@echo off
echo 🚀 TestBuilder MCP - Auto-Recovery Start System
echo.

cd /d "c:\WARE-LOA\ITprojects\Tests-Analytics\.local"

echo � System Diagnostics...
echo Project Directory: %cd%
echo.

echo 📦 Checking dependencies...
if not exist "node_modules" (
    echo ⚠️  Node modules not found, installing...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ npm install failed!
        pause
        exit /b 1
    )
) else (
    echo ✅ Node modules found
)

echo 🔍 Checking for port conflicts...
netstat -an | findstr :3000 > nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Port 3000 may be in use by another process
    echo 💡 The system will automatically find an available port
) else (
    echo ✅ Port 3000 appears to be available
)

echo 🎭 Verifying Playwright installation...
if not exist "node_modules\.bin\playwright" (
    echo ⚠️  Playwright not found, installing browsers...
    call npx playwright install --with-deps
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Playwright install failed!
        pause
        exit /b 1
    )
) else (
    echo ✅ Playwright found
)

echo.
echo 🌐 Starting MCP Test Generator Server...
echo ✅ Auto-Recovery: ENABLED
echo ✅ Port Detection: ENABLED  
echo ✅ Dependency Check: ENABLED
echo ✅ Error Recovery: ENABLED
echo.
echo 📋 Server will be available at: http://localhost:3000
echo 🔧 Extension directory: .local\extension\
echo.
echo 📖 To load Chrome Extension:
echo    1. Open Chrome → chrome://extensions/
echo    2. Enable 'Developer mode'
echo    3. Click 'Load unpacked extension'
echo    4. Select folder: %cd%\extension
echo.
echo 🛑 Press Ctrl+C to stop the server
echo.

REM Start with error recovery
:START_SERVER
node src/server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Server crashed with exit code %ERRORLEVEL%
    echo 🔄 Attempting restart in 5 seconds...
    timeout /t 5 /nobreak > nul
    goto START_SERVER
)

echo.
echo 🛑 Server stopped gracefully
pause