# Script para abrir Chrome con Extension v3 cargada
# Uso: .\open-extension-browser.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Extension v3 - Browser Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ruta de la extensión
$extensionPath = $PSScriptRoot
Write-Host "Extension path: $extensionPath" -ForegroundColor Yellow

# Buscar Chrome
$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$chromePath = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromePath = $path
        break
    }
}

if (-not $chromePath) {
    Write-Host "Chrome no encontrado. Intentando con Edge..." -ForegroundColor Yellow
    $edgePath = "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe"
    if (Test-Path $edgePath) {
        $chromePath = $edgePath
        Write-Host "Edge encontrado: $edgePath" -ForegroundColor Green
    }
}

if (-not $chromePath) {
    Write-Host "ERROR: No se encontro Chrome ni Edge" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalacion manual:" -ForegroundColor Yellow
    Write-Host "1. Abre Chrome/Edge" -ForegroundColor White
    Write-Host "2. Ve a chrome://extensions/" -ForegroundColor White
    Write-Host "3. Activa 'Modo de desarrollador'" -ForegroundColor White
    Write-Host "4. Click 'Cargar extension sin empaquetar'" -ForegroundColor White
    Write-Host "5. Selecciona: $extensionPath" -ForegroundColor White
    Write-Host ""
    Pause
    exit 1
}

Write-Host "Browser encontrado: $chromePath" -ForegroundColor Green
Write-Host ""

# Verificar archivos críticos
$criticalFiles = @(
    "manifest.json",
    "popup.html",
    "icon.png",
    "src\background\service-worker.js"
)

$allFilesExist = $true
foreach ($file in $criticalFiles) {
    $filePath = Join-Path $extensionPath $file
    if (Test-Path $filePath) {
        Write-Host "  OK: $file" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: $file no encontrado" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "ERROR: Faltan archivos criticos" -ForegroundColor Red
    Pause
    exit 1
}

Write-Host ""
Write-Host "Abriendo browser con extension cargada..." -ForegroundColor Cyan
Write-Host ""

# Crear perfil temporal para testing
$tempProfile = Join-Path $env:TEMP "chrome-extension-test-profile"
if (-not (Test-Path $tempProfile)) {
    New-Item -ItemType Directory -Path $tempProfile | Out-Null
}

# Abrir Chrome con la extensión cargada
Start-Process -FilePath $chromePath -ArgumentList @(
    "--load-extension=$extensionPath",
    "--user-data-dir=$tempProfile",
    "--no-first-run",
    "--no-default-browser-check",
    "https://example.com"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Browser abierto con extension!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siguiente pasos:" -ForegroundColor Yellow
Write-Host "1. Abre DevTools (F12)" -ForegroundColor White
Write-Host "2. Ve a la pestana Console" -ForegroundColor White
Write-Host "3. Copia/pega el contenido de: test-metrics-console.js" -ForegroundColor White
Write-Host "4. Ejecuta: testMetrics()" -ForegroundColor White
Write-Host "5. Realiza 10 acciones en la pagina" -ForegroundColor White
Write-Host "6. Ejecuta: testMetrics() nuevamente" -ForegroundColor White
Write-Host "7. Ejecuta: exportEvidence()" -ForegroundColor White
Write-Host ""
Write-Host "Ver guia completa: QUICK-START.md" -ForegroundColor Cyan
Write-Host ""
