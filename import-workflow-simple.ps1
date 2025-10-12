# Script para importar workflow a n8n
Write-Host "Importando workflow TestBuilder a n8n..." -ForegroundColor Green

# Verificar que n8n este ejecutandose
try {
    Invoke-WebRequest -Uri "http://localhost:5678" -Method GET -TimeoutSec 5 | Out-Null
    Write-Host "n8n esta ejecutandose en puerto 5678" -ForegroundColor Green
}
catch {
    Write-Host "Error: n8n no esta accesible en puerto 5678" -ForegroundColor Red
    Write-Host "Ejecuta: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Verificar archivo JSON
if (-not (Test-Path "testbuilder-workflow.json")) {
    Write-Host "Error: No se encuentra testbuilder-workflow.json" -ForegroundColor Red
    exit 1
}

Write-Host "Archivo workflow encontrado: testbuilder-workflow.json" -ForegroundColor Blue

Write-Host ""
Write-Host "PASOS PARA IMPORTAR EL WORKFLOW:" -ForegroundColor Yellow
Write-Host "1. Abre http://localhost:5678 en tu navegador"
Write-Host "2. Completa el setup inicial si es necesario"
Write-Host "3. Ve a Workflows en el menu lateral"
Write-Host "4. Haz clic en Import from file"
Write-Host "5. Selecciona: testbuilder-workflow.json"
Write-Host "6. Activa el workflow con el toggle Active"

Write-Host ""
Write-Host "Abriendo n8n en el navegador..." -ForegroundColor Green
Start-Process "http://localhost:5678"

Write-Host ""
Write-Host "El workflow incluye:" -ForegroundColor Cyan
Write-Host "- Webhook endpoint: /webhook/testbuilder-capture"
Write-Host "- Generacion de tests Playwright"
Write-Host "- Generacion de tests manuales CSV"
Write-Host "- Integracion con Gemini AI"

Write-Host ""
Write-Host "Webhook disponible en:" -ForegroundColor Green
Write-Host "http://localhost:5678/webhook/testbuilder-capture" -ForegroundColor Cyan