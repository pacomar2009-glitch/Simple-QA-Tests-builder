# Test completo del sistema agentico con auto-correccion

Write-Host "`n=== INICIANDO TEST DEL SISTEMA AGENTICO ===" -ForegroundColor Cyan
Write-Host "Fases que veras:" -ForegroundColor Yellow
Write-Host "  1. OBSERVING - MCP explora la pagina" -ForegroundColor Green
Write-Host "  2. REASONING - Gemini analiza y decide" -ForegroundColor Green
Write-Host "  3. EXECUTING - MCP ejecuta accion" -ForegroundColor Green
Write-Host "  4. CODE_GENERATION - Gemini genera codigo desde ejecucion real" -ForegroundColor Green
Write-Host "  5. VALIDATING - Sistema ejecuta test generado" -ForegroundColor Green
Write-Host "  6. FIXING - Si falla, Gemini corrige (hasta 3 intentos)`n" -ForegroundColor Green

$payload = @{
    sessionId = "agentic-complete-$(Get-Date -Format 'yyyyMMddHHmmss')"
    steps = @(
        @{
            type = "click"
            url = "https://www.google.com"
            timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
            element = @{
                tagName = "TEXTAREA"
                id = "APjFqb"
                name = "q"
            }
        },
        @{
            type = "input"
            url = "https://www.google.com"
            timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds() + 1000
            element = @{
                tagName = "TEXTAREA"
                id = "APjFqb"
                name = "q"
            }
            value = "Playwright testing"
        }
    )
    metadata = @{
        sessionName = "Agentic Complete Test"
        initialUrl = "https://www.google.com"
        description = "Test completo con auto-correccion"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Enviando request..." -ForegroundColor Yellow

try {
    # Timeout de 300 segundos (5 minutos) para dar tiempo a validacion y correccion
    $response = Invoke-WebRequest -Uri "http://localhost:4000/test-generation/mcp-generate" `
                                   -Method POST `
                                   -Headers @{"Content-Type"="application/json"} `
                                   -Body $payload `
                                   -TimeoutSec 300
    
    Write-Host "`n=== RESPUESTA COMPLETA ===" -ForegroundColor Cyan
    
    # Procesar SSE y colorear segun fase
    $lines = $response.Content -split "`n"
    foreach ($line in $lines) {
        if ($line -match "data: (.+)") {
            $data = $matches[1] | ConvertFrom-Json
            
            $phase = $data.phase
            $message = $data.message
            
            switch ($phase) {
                "observing" { 
                    Write-Host "[OBSERVAR] $message" -ForegroundColor Cyan 
                }
                "reasoning" { 
                    Write-Host "[RAZONAR] $message" -ForegroundColor Magenta 
                }
                "executing" { 
                    Write-Host "[EJECUTAR] $message" -ForegroundColor Yellow 
                }
                "retrying" { 
                    Write-Host "[RETRY] $message" -ForegroundColor DarkYellow 
                }
                "code_generation" { 
                    Write-Host "[GENERAR] $message" -ForegroundColor Green 
                }
                "validating" { 
                    Write-Host "[VALIDAR] $message" -ForegroundColor Blue 
                }
                "fixing" { 
                    Write-Host "[CORREGIR] $message" -ForegroundColor Red 
                }
                "completed" { 
                    Write-Host "[COMPLETADO] $message" -ForegroundColor Green 
                    if ($data.data.filename) {
                        Write-Host "`nTest generado: $($data.data.filename)" -ForegroundColor Green
                    }
                }
                default { 
                    Write-Host "  $message" -ForegroundColor White 
                }
            }
        }
    }
    
    Write-Host "`n=== TEST AGENTICO COMPLETADO ===" -ForegroundColor Green
    
} catch {
    Write-Host "`n=== ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
