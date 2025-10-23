# ===================================
# 🧪 TEST: SSE UI Feedback
# ===================================
# Prueba el flujo completo de SSE desde el backend hasta la UI

Write-Host "`n🎯 TEST SSE UI FEEDBACK" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Datos de prueba
$sessionId = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$steps = @(
    @{
        type = "click"
        selector = "#search-button"
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        url = "https://www.google.com"
        element = @{
            tagName = "button"
            id = "search-button"
            text = "Buscar"
        }
    },
    @{
        type = "input"
        selector = "#search-input"
        value = "test query"
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        url = "https://www.google.com"
        element = @{
            tagName = "input"
            id = "search-input"
            type = "text"
        }
    }
)

$body = @{
    sessionId = $sessionId
    steps = $steps
    metadata = @{
        timestamp = (Get-Date).Ticks
        version = "v2-agentic-test"
        totalSteps = $steps.Count
    }
} | ConvertTo-Json -Depth 10

Write-Host "`n📦 Payload preparado:" -ForegroundColor Yellow
Write-Host "  Session ID: $sessionId" -ForegroundColor Gray
Write-Host "  Steps: $($steps.Count)" -ForegroundColor Gray
Write-Host ""

$url = "http://localhost:4000/test-generation/mcp-generate"

Write-Host "📡 Enviando POST a: $url" -ForegroundColor Cyan
Write-Host ""

# ====================
# IMPORTANTE: PowerShell NO soporta SSE nativamente
# Este script solo verifica que el endpoint responda
# ====================
Write-Host "⚠️  NOTA: PowerShell no soporta SSE nativo" -ForegroundColor Yellow
Write-Host "   Para probar SSE completo, usar:" -ForegroundColor Yellow
Write-Host "   1. Extensión Chrome (popup-v2.js)" -ForegroundColor Yellow
Write-Host "   2. Browser DevTools (fetch con ReadableStream)" -ForegroundColor Yellow
Write-Host "   3. Node.js script con EventSource polyfill" -ForegroundColor Yellow
Write-Host ""

try {
    # Usar Invoke-WebRequest con headers SSE
    Write-Host "🚀 Iniciando conexión SSE..." -ForegroundColor Green
    Write-Host ""
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    # PowerShell no puede procesar SSE stream, pero podemos verificar que inicie
    $response = Invoke-WebRequest -Uri $url `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -Headers @{
            "Accept" = "text/event-stream"
            "Cache-Control" = "no-cache"
        } `
        -UseBasicParsing `
        -TimeoutSec 60 # Esperar hasta 60 segundos
    
    $stopwatch.Stop()
    
    Write-Host "✅ Respuesta recibida después de $($stopwatch.Elapsed.TotalSeconds)s" -ForegroundColor Green
    Write-Host ""
    Write-Host "📄 Headers de respuesta:" -ForegroundColor Cyan
    $response.Headers.GetEnumerator() | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor Gray
    }
    Write-Host ""
    
    if ($response.Content) {
        Write-Host "📝 Contenido (primeros 500 chars):" -ForegroundColor Cyan
        $content = $response.Content
        if ($content.Length -gt 500) {
            $content = $content.Substring(0, 500) + "..."
        }
        Write-Host $content -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ ERROR:" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        Write-Host "📄 Detalles de respuesta:" -ForegroundColor Yellow
        Write-Host "  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Gray
        Write-Host "  Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Gray
    }
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "🏁 TEST COMPLETADO" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. ✅ Backend responde en puerto 4000" -ForegroundColor Green
Write-Host "  2. 🔄 Probar desde Chrome DevTools:" -ForegroundColor Yellow
Write-Host ""
Write-Host "     // Pegá esto en DevTools Console:" -ForegroundColor Gray
Write-Host '     fetch("http://localhost:4000/test-generation/mcp-generate", {' -ForegroundColor Gray
Write-Host '       method: "POST",' -ForegroundColor Gray
Write-Host '       headers: { "Content-Type": "application/json" },' -ForegroundColor Gray
Write-Host "       body: JSON.stringify($body)" -ForegroundColor Gray
Write-Host "     }).then(async (res) => {" -ForegroundColor Gray
Write-Host "       const reader = res.body.getReader();" -ForegroundColor Gray
Write-Host "       const decoder = new TextDecoder();" -ForegroundColor Gray
Write-Host "       while (true) {" -ForegroundColor Gray
Write-Host "         const {done, value} = await reader.read();" -ForegroundColor Gray
Write-Host "         if (done) break;" -ForegroundColor Gray
Write-Host "         console.log(decoder.decode(value));" -ForegroundColor Gray
Write-Host "       }" -ForegroundColor Gray
Write-Host "     });" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. 🎨 Cargar extensión y probar con UI real" -ForegroundColor Yellow
Write-Host ""
