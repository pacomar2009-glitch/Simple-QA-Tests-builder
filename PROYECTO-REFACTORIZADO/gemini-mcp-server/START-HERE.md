# 🚀 TestBuilder Backend - Inicio Rápido

## ⚡ Inicio Rápido (Windows)

```powershell
# Ejecuta el script de inicio automático
.\START-BACKEND.bat
```

El script verificará:
- ✅ Archivo `.env` existe con `GEMINI_API_KEY`
- ✅ Dependencias instaladas (`node_modules`)
- ✅ Puerto 4000 disponible

## 📋 Inicio Manual

### 1. Configurar Variables de Entorno

Crea archivo `.env` en esta carpeta:

```env
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
PORT=4000
NODE_ENV=development
```

**Obtener API Key:**
1. Ve a https://aistudio.google.com/app/apikey
2. Crea nuevo proyecto o usa existente
3. Genera API Key
4. Copia y pega en `.env`

### 2. Instalar Dependencias

```powershell
npm install
```

Dependencias principales:
- `express` 4.18.2 - Servidor HTTP
- `@google/generative-ai` - Gemini API
- `playwright` - Automatización de navegador
- `cors`, `dotenv` - Configuración

### 3. Iniciar Servidor

```powershell
npm start
```

Deberías ver:
```
🚀 Server listening on http://localhost:4000
📡 Endpoints disponibles:
  - POST /test-generation/mcp-generate (SSE)
  - POST /test-generation/start
  - GET  /status/:jobId
  - GET  /health
```

## 🧪 Verificar que Funciona

### Test 1: Health Check

```powershell
curl http://localhost:4000/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "uptime": 45.123
}
```

### Test 2: Verificar Gemini API

```powershell
# El backend mostrará en consola al iniciar:
# ✅ Gemini API key configurada
```

Si ves `❌ GEMINI_API_KEY no configurado`, revisa tu `.env`

## 📡 Endpoints Disponibles

### 1. POST `/test-generation/mcp-generate` (SSE Stream)

**Descripción:** Genera test Playwright usando MCP Agent
**Método:** POST
**Content-Type:** application/json
**Accept:** text/event-stream

**Request Body:**
```json
{
  "sessionId": "case-1234567890",
  "steps": [
    {
      "id": "evt-001",
      "type": "click",
      "timestamp": 1234567890,
      "target": {
        "selector": "#login-button",
        "tagName": "button",
        "textContent": "Login"
      }
    }
  ],
  "metadata": {
    "sessionName": "Login Flow Test",
    "initialUrl": "https://example.com/login",
    "description": "Test de flujo de login"
  }
}
```

**Response Stream (SSE):**
```
data: {"phase":"init","message":"Iniciando generación...","progress":0}

data: {"phase":"analyzing","message":"Analizando 5 eventos...","progress":20}

data: {"phase":"generating","message":"Generando código Playwright...","progress":60}

data: {"phase":"complete","progress":100,"data":{"filename":"test-case-1234567890.spec.ts","path":"./generated-tests/test-case-1234567890.spec.ts"}}
```

### 2. POST `/test-generation/start`

**Descripción:** Inicia generación de test (sin streaming)
**Returns:** `jobId` para consultar status después

### 3. GET `/status/:jobId`

**Descripción:** Consulta status de generación en progreso
**Returns:** `{ status, progress, result }`

### 4. GET `/health`

**Descripción:** Health check del servidor
**Returns:** `{ status: "ok", timestamp, uptime }`

## 🎭 Flujo Completo de Uso

### Desde la Extensión:

1. **Capturar Eventos**
   - Abre la extensión (popup)
   - Click "▶️ Iniciar Captura"
   - Realiza acciones en la página
   - Click "⏹️ Detener"

2. **Generar Test**
   - Verifica stats: "✅ Completados: 1"
   - Click "🎭 Generar Test Playwright"
   - Observa progreso en tiempo real
   - Test guardado en `generated-tests/`

3. **Ejecutar Test**
   ```powershell
   cd generated-tests
   npx playwright test test-case-*.spec.ts
   ```

## 🔧 Troubleshooting

### Error: "Backend no disponible"

**Problema:** Extensión no puede conectar con backend

**Soluciones:**
```powershell
# 1. Verifica que el servidor esté corriendo
netstat -ano | findstr :4000

# 2. Verifica health endpoint
curl http://localhost:4000/health

# 3. Revisa logs del servidor
# (en la terminal donde corre npm start)

# 4. Reinicia el servidor
# Ctrl+C para detener
npm start
```

### Error: "GEMINI_API_KEY no configurado"

**Problema:** API key no está en `.env` o es inválida

**Soluciones:**
```powershell
# 1. Verifica que .env existe
ls .env

# 2. Verifica contenido
cat .env

# 3. Debe contener:
# GEMINI_API_KEY=AIza...

# 4. Reinicia servidor después de cambiar .env
```

### Error: "Port 4000 already in use"

**Problema:** Otro proceso usa puerto 4000

**Soluciones:**
```powershell
# 1. Encuentra el proceso
netstat -ano | findstr :4000

# 2. Mata el proceso (reemplaza PID)
taskkill /PID <numero_PID> /F

# 3. O usa otro puerto en .env:
# PORT=4001
```

### Tests Generados No Ejecutan

**Problema:** Playwright test falla

**Soluciones:**
```powershell
# 1. Instala Playwright browsers
npx playwright install

# 2. Verifica sintaxis del test
npx playwright test --list

# 3. Ejecuta en modo debug
npx playwright test --debug

# 4. Revisa selectors en el test
# Puede que la página haya cambiado
```

## 📊 Logs y Debugging

### Logs del Backend

El servidor muestra logs estructurados:

```
[job-abc123] 🎬 Iniciando generación de test...
[job-abc123] 📊 Análisis: 5 eventos capturados
[job-abc123] 🎭 Generando test Playwright...
[job-abc123] ✅ Test generado: test-case-1234567890.spec.ts
```

### Logs de la Extensión

Abre DevTools en el popup:
- Click derecho en popup
- "Inspeccionar"
- Ve a Console

Logs importantes:
```
📦 Export response: {success: true, cases: Array(1)}
📝 Caso seleccionado: Caso 1 - Pasos: 5
🔌 Conectando con backend...
📊 Progress: 20% - Analizando eventos...
✅ Test generado exitosamente
```

## 🎯 Arquitectura

```
Extension (Popup)
    ↓ EXPORT_CASES
Service Worker
    ↓ exportData(true)
Cases Queue
    ↓ POST /test-generation/mcp-generate
Backend Server (Express)
    ↓ orchestrator.processSession()
TestGenerationOrchestrator
    ├─→ analyzeSession() [Gemini]
    └─→ generateTest() [PlaywrightTestGenerator]
        ↓ saveTest()
generated-tests/
    └─→ test-case-*.spec.ts
```

## 📚 Recursos

- **Gemini API Docs:** https://ai.google.dev/docs
- **Playwright Docs:** https://playwright.dev
- **MCP Protocol:** https://modelcontextprotocol.io
- **Express SSE:** https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

## 🆘 Soporte

Si encuentras problemas:

1. **Revisa logs** en backend y extensión
2. **Verifica .env** tiene GEMINI_API_KEY válido
3. **Prueba health endpoint** con curl
4. **Revisa casos exportados** en extension logs
5. **Abre issue** en GitHub con logs completos

---

**¿Backend corriendo?** ✅ Ahora puedes usar la extensión para generar tests automáticamente.
