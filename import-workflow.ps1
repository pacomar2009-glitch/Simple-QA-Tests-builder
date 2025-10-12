# Script para importar workflow a n8n
# Uso: .\import-workflow.ps1

Write-Host "🚀 Importando workflow TestBuilder a n8n..." -ForegroundColor Green

# Verificar que n8n esté ejecutándose
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5678" -Method GET -TimeoutSec 5
    Write-Host "✅ n8n está ejecutándose en puerto 5678" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error: n8n no está accesible en puerto 5678" -ForegroundColor Red
    Write-Host "Ejecuta: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Verificar que el archivo JSON existe
if (-not (Test-Path "testbuilder-workflow.json")) {
    Write-Host "❌ Error: No se encuentra testbuilder-workflow.json" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Archivo workflow encontrado: testbuilder-workflow.json" -ForegroundColor Blue

# Instrucciones para importar manualmente
Write-Host "`n🔧 PASOS PARA IMPORTAR EL WORKFLOW:" -ForegroundColor Yellow
Write-Host "1. Abre http://localhost:5678 en tu navegador" -ForegroundColor White
Write-Host "2. Si es la primera vez, completa el setup inicial" -ForegroundColor White
Write-Host "3. Ve a 'Workflows' en el menú lateral" -ForegroundColor White
Write-Host "4. Haz clic en 'Import from file' o el botón '+'" -ForegroundColor White
Write-Host "5. Selecciona el archivo: testbuilder-workflow.json" -ForegroundColor White
Write-Host "6. El workflow 'TestBuilder Analytics Workflow' aparecerá" -ForegroundColor White
Write-Host "7. Activa el workflow usando el toggle 'Active'" -ForegroundColor White

Write-Host "`n🌐 Abriendo n8n en el navegador..." -ForegroundColor Green
Start-Process "http://localhost:5678"

Write-Host "`n✨ El workflow incluye:" -ForegroundColor Cyan
Write-Host "  • Webhook endpoint: /webhook/testbuilder-capture" -ForegroundColor White
Write-Host "  • Generación de tests Playwright" -ForegroundColor White
Write-Host "  • Generación de tests manuales CSV" -ForegroundColor White
Write-Host "  • Integración con Gemini AI" -ForegroundColor White
Write-Host "  • Validación y análisis de datos" -ForegroundColor White

Write-Host "`n📋 Para configurar credenciales:" -ForegroundColor Yellow
Write-Host "1. Ve a 'Credentials' en n8n" -ForegroundColor White
Write-Host "2. Crea credencial 'HTTP Query Auth'" -ForegroundColor White
Write-Host "3. Nombre: geminiApi" -ForegroundColor White
Write-Host "4. Query Parameter Name: key" -ForegroundColor White
Write-Host "5. Value: Tu API key de Gemini" -ForegroundColor White

Write-Host "`n🎯 Una vez importado, el webhook estará disponible en:" -ForegroundColor Green
Write-Host "http://localhost:5678/webhook/testbuilder-capture" -ForegroundColor Cyan