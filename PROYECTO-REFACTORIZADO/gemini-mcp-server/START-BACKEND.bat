@echo off
echo ========================================
echo  TestBuilder Backend - Quick Start
echo ========================================
echo.

REM Verificar si .env existe
if not exist ".env" (
    echo [ERROR] Archivo .env no encontrado
    echo.
    echo Por favor crea .env con:
    echo   GEMINI_API_KEY=tu_api_key_aqui
    echo   PORT=4000
    echo.
    pause
    exit /b 1
)

REM Verificar si node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Error instalando dependencias
        pause
        exit /b 1
    )
)

echo [INFO] Iniciando backend en puerto 4000...
echo.
echo Backend disponible en: http://localhost:4000
echo Presiona Ctrl+C para detener
echo.

call npm start
