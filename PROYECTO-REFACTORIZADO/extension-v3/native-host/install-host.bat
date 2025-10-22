@echo off
echo ========================================
echo  TestBuilder Native Host - Instalacion
echo ========================================
echo.

REM Obtener la ruta actual
set CURRENT_DIR=%~dp0
set MANIFEST_PATH=%CURRENT_DIR%com.testbuilder.native_host.json

REM Registrar en el registro de Windows
echo [INFO] Registrando native messaging host...
echo.

REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.testbuilder.native_host" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

if errorlevel 1 (
    echo [ERROR] Error registrando el host
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Native messaging host instalado correctamente
echo.
echo Ubicacion del manifest: %MANIFEST_PATH%
echo.
echo IMPORTANTE:
echo 1. Carga la extension en Chrome
echo 2. Copia el Extension ID
echo 3. Edita com.testbuilder.native_host.json
echo 4. Reemplaza YOUR_EXTENSION_ID_HERE con tu ID real
echo.
pause
