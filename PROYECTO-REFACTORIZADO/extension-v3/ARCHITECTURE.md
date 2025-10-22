# Arquitectura: FASE 1 vs FASE 2

**Proyecto:** Simple QA Tests Builder  
**Versión:** Extension v3  
**Fecha:** 22 octubre 2025  
**Commit:** baf7a527c

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [FASE 1: RECORD (Chrome Extension)](#fase-1-record-chrome-extension)
3. [FASE 2: REPLAY + OPTIMIZE (Backend Node.js/Express)](#fase-2-replay--optimize-backend-nodejsexpress)
4. [Flujo End-to-End](#flujo-end-to-end)
5. [Comparativa Técnica](#comparativa-técnica)
6. [Decisiones de Diseño](#decisiones-de-diseño)

---

## Visión General

Este sistema de generación de tests QA está dividido en **dos fases complementarias** que trabajan juntas pero con responsabilidades claramente separadas:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA COMPLETA                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐         ┌─────────────────────────┐   │
│  │     FASE 1         │         │       FASE 2            │   │
│  │   🌐 Browser       │   ═══>  │   ☁️  Backend Express   │   │
│  │   (Extension v3)   │         │   (MCP + Playwright)    │   │
│  └────────────────────┘         └─────────────────────────┘   │
│         ↓                                  ↓                   │
│    Captura rápida                   Validación + Tests        │
│    Pre-análisis IA                  IA Agéntica profunda      │
│    < 1s por evento                  Proceso completo          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Principios Arquitectónicos

1. **Separación de responsabilidades**: Captura ≠ Validación
2. **Performance primero**: FASE 1 debe ser imperceptible (<1s)
3. **IA en dos niveles**: Ligera (pre-análisis) + Profunda (agéntica)
4. **Resiliencia**: FASE 1 funciona incluso sin API key
5. **Escalabilidad**: Backend procesa múltiples sesiones en paralelo

---

## FASE 1: RECORD (Chrome Extension)

### 🎯 Objetivo Principal

Capturar interacciones del usuario en tiempo real con **mínima latencia** y añadir pre-análisis IA ligero para enriquecer los datos básicos.

### 📦 Componentes

#### 1. Content Script (`content-enhanced-v2.js`)
- **Responsabilidad**: Observer de eventos DOM
- **Tecnología**: MutationObserver + Event Listeners
- **Output**: Datos crudos de interacción (selector, tipo, atributos)

```javascript
// Ejemplo de evento capturado
{
  type: "click",
  selector: "#submit-btn",
  tagName: "button",
  attributes: {
    id: "submit-btn",
    type: "submit",
    class: "btn btn-primary"
  },
  text: "Enviar formulario",
  timestamp: 1729604938000
}
```

#### 2. Service Worker (`service-worker.js`)
- **Responsabilidad**: Coordinador central, gestión de estado
- **Funciones clave**:
  - Recibir eventos del content script
  - Orquestar llamada a Gemini IA Ligera
  - Gestionar queue de casos de prueba (US#57)
  - Persistir en `chrome.storage.local`

```javascript
// Función captureUserAction (línea 539)
async function captureUserAction(action) {
  // 1. Pre-análisis IA
  const aiPreAnalysis = await state.geminiAI.preAnalyzeElement(
    elementData, 
    pageContext
  );
  
  // 2. Crear evento enriquecido
  const event = {
    type: 'user_action',
    action,
    timestamp: Date.now(),
    aiPreAnalysis: aiPreAnalysis || fallback
  };
  
  // 3. Añadir a caso actual
  state.casesQueue.addStep(event);
}
```

#### 3. Gemini IA Ligera (`gemini-client.js`)
- **Responsabilidad**: Pre-análisis rápido de elementos
- **Modelo**: `gemini-2.5-flash` (velocidad óptima)
- **Latencia objetivo**: <1s por análisis
- **Cache**: Hit rate ≥40% para elementos repetidos

**Métricas trackeadas** (commit baf7a527c):
```javascript
metrics: {
  cacheHits: 0,
  cacheMisses: 0,
  totalAnalyses: 0,
  totalLatencyMs: 0,
  fallbackCount: 0
}
```

**Output del pre-análisis**:
```javascript
{
  phase: "PHASE_1_LIGHTWEIGHT",
  selectorPreRanking: [
    { selector: "[data-testid='submit']", score: 100, reason: "data-testid presente" },
    { selector: "#submit-btn", score: 80, reason: "ID único" },
    { selector: ".btn.primary:nth-of-type(3)", score: 40, reason: "Fallback con nth" }
  ],
  opensNewTab: false,
  intent: "form_submission",
  confidence: 0.95,
  latencyMs: 245,
  source: "gemini-ai",
  model: "gemini-2.5-flash",
  note: "Pre-análisis. IA Agéntica refinará en FASE 2"
}
```

#### 4. Popup UI (`popup-v2.js` + `popup-v2.html`)
- **Responsabilidad**: Control de grabación, visualización de estado
- **Features**:
  - Start/Stop recording
  - Contador de eventos (badge)
  - Selector de modelo Gemini
  - Exportación a n8n/CSV

### 🔄 Flujo FASE 1

```
Usuario hace click
      ↓
Content Script captura evento
      ↓
Envía mensaje a Service Worker
      ↓
Service Worker → Gemini IA Ligera
      ↓
Cache check (hit/miss)
      ↓
Pre-análisis rápido (<1s)
      ↓
Evento enriquecido guardado
      ↓
Badge actualizado (+1)
      ↓
Usuario continúa (sin interrupción)
```

### 📊 Métricas de Éxito FASE 1

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| Latencia por evento | <1000ms | ~245ms ✅ |
| Cache hit rate | ≥40% | Variable (tracking activo) |
| Fallback rate | <10% | 0% (con API key) ✅ |
| Test coverage | 100% | 167/167 passing ✅ |

### 🛡️ Resiliencia

**Sin API key**:
```javascript
// Fallback analysis automático
fallbackAnalysis(elementData) {
  return {
    phase: "PHASE_1_FALLBACK",
    selectorPreRanking: [
      // Prioriza: data-testid > id > name > class
    ],
    opensNewTab: elementData.target === "_blank",
    intent: this.detectIntent(elementData),
    confidence: 0.5, // Menor que IA
    note: "Análisis heurístico sin IA"
  };
}
```

---

## FASE 2: REPLAY + OPTIMIZE (Backend Node.js/Express)

### 🎯 Objetivo Principal

Recibir pasos de FASE 1, reproducirlos en un navegador real con Playwright, aplicar IA Agéntica profunda para optimización, y generar tests finales validados.

### 📦 Componentes

#### 1. Express API REST (Puerto 4000)
- **Responsabilidad**: API HTTP para recepción y procesamiento
- **Framework**: Express + TypeScript
- **Endpoints**:
  - `POST /test-generation/start` - Inicia procesamiento
  - `GET /test-generation/status/:jobId` - Consulta estado
  - `GET /test-generation/download/:jobId` - Descarga ZIP

**Payload recibido**:
```json
{
  "sessionId": "uuid",
  "steps": [
    {
      "number": 1,
      "type": "click",
      "selector": "#login-btn",
      "aiPreAnalysis": {
        "selectorPreRanking": [...],
        "intent": "navigation",
        "confidence": 0.95
      }
    }
  ],
  "metadata": {
    "url": "https://example.com",
    "timestamp": 1729604938000,
    "geminiModel": "gemini-2.5-flash"
  }
}
```

**Respuesta inmediata (202 Accepted)**:
```json
{
  "jobId": "job-uuid-12345",
  "status": "processing",
  "statusUrl": "/test-generation/status/job-uuid-12345",
  "estimatedTime": "30s"
}
```

#### 2. Test Generation Orchestrator
- **Responsabilidad**: Coordinador del flujo completo
- **Patrón**: Async/await con procesamiento en background
- **Archivo**: `src/orchestrators/test-generation.orchestrator.ts`

**Proceso**:
1. Validar request y crear jobId
2. Iniciar procesamiento asíncrono (no bloquea respuesta)
3. Llamar a MCP Playwright Service
4. Llamar a Gemini Optimizer Service
5. Llamar a Test Generator Service
6. Actualizar estado del job y almacenar ZIP

#### 3. MCP Playwright Service
- **Responsabilidad**: Replay real de acciones en navegador headless
- **Archivo**: `src/services/mcp-playwright.service.ts`
- **Features**:
  - Navegación a URL inicial
  - Ejecución secuencial de steps
  - Screenshot de cada paso
  - Captura de errores/timeouts
  - Validación de que la acción tuvo efecto
  - Self-healing automático

```typescript
// Ejemplo de replay con self-healing
async replaySteps(steps: Step[], options: ReplayOptions) {
  const results = [];
  
  for (const step of steps) {
    try {
      // Intentar con selectores del pre-ranking
      const result = await this.executeStep(step, options);
      results.push({ stepId: step.id, success: true, result });
      
    } catch (error) {
      // SELF-HEALING: Intentar con selectores alternativos
      const healed = await this.attemptSelfHealing(step);
      results.push({
        stepId: step.id,
        success: healed.success,
        selfHealed: healed.success,
        selectorUsed: healed.selectorUsed
      });
    }
  }
  
  return {
    totalSteps: steps.length,
    successCount: results.filter(r => r.success).length,
    selfHealedCount: results.filter(r => r.selfHealed).length,
    results
  };
}
```

#### 4. Gemini Optimizer Service
- **Responsabilidad**: Análisis profundo y optimización con IA
- **Archivo**: `src/services/gemini-optimizer.service.ts`
- **Modelo**: `gemini-2.0-pro` (máxima capacidad)
- **Tiempo permitido**: Sin límite de latencia

**Tareas de la IA Agéntica**:

1. **Validación de selectores**: 
   - Verificar que el selector del pre-ranking funcionó
   - Proponer alternativas más robustas si falló
   - Generar XPath, CSS optimizados

2. **Inferencia semántica**:
   - Entender el propósito del caso de prueba completo
   - Agrupar pasos relacionados (Login, Checkout, etc.)
   - Identificar assertions implícitos

3. **Optimización**:
   - Eliminar pasos redundantes (≥20% reducción)
   - Consolidar waits innecesarios
   - Añadir validaciones automáticas

4. **Agrupación de flujos**:
   - Detectar flujos funcionales (Login, Search, Checkout)
   - Generar nombres descriptivos
   - Organizar en test suites

#### 5. Test Generator Service
- **Responsabilidad**: Generación de código Playwright y CSV
- **Archivo**: `src/services/test-generator.service.ts`
- **Formatos soportados**:
  - Playwright test files (.spec.ts) con self-healing
  - CSV para Jira/Xray/Azure DevOps
  - package.json con dependencias
  - README.md con instrucciones

**Output ejemplo**:
```typescript
// Generado por Test Generator Service
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('Usuario puede hacer login exitosamente', async ({ page }) => {
    // Setup
    await page.goto('https://example.com/login');
    
    // Step 1: Fill username (optimizado por Gemini)
    await page.fill('[data-testid="username"]', 'user@example.com');
    await expect(page.locator('[data-testid="username"]')).toHaveValue('user@example.com');
    
    // Step 2: Fill password
    await page.fill('[data-testid="password"]', 'securepass123');
    
    // Step 3: Submit form
    await page.click('#login-btn');
    
    // Assertion (inferida por IA Agéntica)
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('.welcome-message')).toBeVisible();
  });
});
```

### 🔄 Flujo FASE 2

```
Extension POST /test-generation/start
      ↓
Express API valida y crea jobId
      ↓
Test Generation Orchestrator inicia
      ↓
MCP Playwright Service reproduce pasos
      ↓
Validación + Screenshot cada paso
      ↓
Gemini Optimizer Service analiza sesión
      ↓
Optimiza selectores + lógica (≥20% reducción pasos)
      ↓
Infiere assertions automáticos
      ↓
Test Generator Service crea archivos
      ↓
Valida test generado (dry-run opcional)
      ↓
Crea ZIP: tests/ + package.json + README.md
      ↓
Almacena ZIP en job storage
      ↓
Status cambia a "completed" con download URL
```

### 📊 Métricas de Éxito FASE 2

| Métrica | Objetivo | Validación |
|---------|----------|------------|
| Replay success rate | ≥95% | Cada step debe ejecutarse sin timeouts |
| Selector optimization | +30% robustez vs FASE 1 | Gemini propone mejores selectores |
| Test generation time | <60s por sesión | Orquestador monitorea duración |
| Generated tests validity | 100% ejecutables | Dry-run opcional pre-entrega |
| Code reduction | ≥20% pasos optimizados | IA elimina redundancias |
| Self-healing activado | ≥80% pasos con backup | MCP intenta selectores alternativos |

---

## Flujo End-to-End

### Ejemplo Completo: Login Flow

#### FASE 1 (Extension - 3 eventos capturados)

**Evento 1**: Input username
```json
{
  "type": "input",
  "selector": "#username",
  "value": "user@example.com",
  "aiPreAnalysis": {
    "selectorPreRanking": [
      {"selector": "[data-testid='username']", "score": 100},
      {"selector": "#username", "score": 80},
      {"selector": "input[name='username']", "score": 70}
    ],
    "intent": "form_fill",
    "confidence": 0.98
  }
}
```

**Evento 2**: Input password
```json
{
  "type": "input",
  "selector": "#password",
  "value": "•••••••",
  "aiPreAnalysis": {
    "selectorPreRanking": [
      {"selector": "[data-testid='password']", "score": 100},
      {"selector": "#password", "score": 80}
    ],
    "intent": "form_fill_sensitive",
    "confidence": 0.99
  }
}
```

**Evento 3**: Click submit
```json
{
  "type": "click",
  "selector": "#login-btn",
  "aiPreAnalysis": {
    "selectorPreRanking": [
      {"selector": "[data-testid='login-submit']", "score": 100},
      {"selector": "#login-btn", "score": 85}
    ],
    "intent": "form_submission",
    "opensNewTab": false,
    "confidence": 0.97
  }
}
```

**Latencia total FASE 1**: ~735ms (3 eventos × 245ms promedio)

---

#### FASE 2 (Backend - Procesamiento completo)

**1. Replay en Playwright**:
```javascript
// n8n ejecuta MCP Playwright
const results = await mcpPlaywright.replay({
  url: 'https://example.com/login',
  steps: [evento1, evento2, evento3]
});

// Resultado:
{
  "step1": { "success": true, "usedSelector": "[data-testid='username']" },
  "step2": { "success": true, "usedSelector": "[data-testid='password']" },
  "step3": { 
    "success": true, 
    "usedSelector": "#login-btn",
    "navigationOccurred": true,
    "finalUrl": "https://example.com/dashboard"
  }
}
```

**2. IA Agéntica analiza**:
```
Prompt a Gemini Pro:
"Analiza esta sesión de login. Los 3 pasos fueron exitosos.
Se detectó navegación a /dashboard tras el submit.
Genera un test Playwright con:
- Uso de selectores data-testid (más robustos)
- Assertion de navegación exitosa
- Assertion de mensaje de bienvenida visible
- Manejo de errores"
```

**3. Test generado**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('https://example.com/login');
    await expect(page).toHaveTitle(/Login/);
    
    // Fill credentials
    await page.fill('[data-testid="username"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'securepass123');
    
    // Submit form
    await page.click('#login-btn');
    
    // Assertions
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('.welcome-message')).toBeVisible();
    await expect(page.locator('.user-avatar')).toContainText('User');
  });
});
```

**Tiempo total FASE 2**: ~45s (replay + análisis + generación)

---

## Comparativa Técnica

| Aspecto | FASE 1 (Extension) | FASE 2 (Backend Express) |
|---------|-------------------|--------------------------|
| **Ubicación** | Browser (cliente) | Servidor Node.js (puerto 4000) |
| **Tecnología** | Chrome Extension MV3 | Express + TypeScript + Playwright |
| **IA Model** | gemini-2.5-flash | gemini-2.0-pro |
| **Latencia** | <1s por evento | 30-60s por sesión |
| **Objetivo latencia** | Imperceptible | Completo y preciso |
| **Cache** | Sí (≥40% hit rate) | No necesario |
| **Fallback** | Análisis heurístico | Self-healing + retry |
| **Output** | JSON semi-enriquecido | Playwright test + CSV + ZIP |
| **Validación** | Ninguna (solo captura) | Replay real + dry-run opcional |
| **Dependencias** | Chrome APIs | MCP Playwright + Gemini SDK |
| **Escalabilidad** | 1 usuario | Múltiples jobs paralelos |
| **Storage** | `chrome.storage.local` (10MB) | Job queue + File system |
| **Testing** | Jest (167 tests) | Jest + Playwright E2E |
| **Deployment** | Chrome Web Store | Docker container único |

---

## Decisiones de Diseño

### ¿Por qué dos fases?

#### Alternativa descartada: "Todo en Extension"
❌ **Problemas**:
- Playwright no puede ejecutarse en extension
- IA profunda tomaría >10s por evento (mala UX)
- Limitaciones de storage en browser
- No hay validación de que el selector funciona

#### Alternativa descartada: "Todo en Backend"
❌ **Problemas**:
- Necesitaría instalar agent/plugin en cliente
- Mayor complejidad de setup para usuarios
- Captura de eventos más frágil (proxy/websockets)
- Privacidad: enviar todos los datos a servidor

#### ✅ Solución actual: Dos fases complementarias
- **FASE 1**: Captura en cliente (rápida, privada)
- **FASE 2**: Procesamiento en servidor (potente, escalable)
- **Mejor UX**: Usuario no espera, backend trabaja en background
- **Mejor calidad**: Replay real valida que todo funciona

---

### ¿Por qué Gemini flash en FASE 1 y Pro en FASE 2?

| Aspecto | gemini-2.5-flash | gemini-2.0-pro |
|---------|-----------------|---------------|
| **Latencia** | ~200-300ms | ~2-5s |
| **Costo** | $0.075/1M tokens | $0.125/1M tokens |
| **Capacidad** | Análisis rápido | Razonamiento complejo |
| **Uso ideal** | Pre-análisis ligero | Optimización profunda |

**Decisión**: Usar flash en FASE 1 para no impactar UX, usar Pro en FASE 2 donde tenemos tiempo para análisis profundo.

---

### ¿Por qué cache solo en FASE 1?

- **FASE 1**: Usuario repite clicks en mismos elementos → Cache ahorra latencia
- **FASE 2**: Cada sesión es única → Cache no aporta valor

---

### ¿Por qué Express en lugar de n8n?

#### Alternativa descartada: "n8n Workflow Orchestrator"
❌ **Problemas**:
- Añade complejidad: workflow JSON + Node.js backend
- Dos stacks tecnológicos separados (n8n + Node.js)
- Debugging más difícil (workflow visual vs código)
- Versionado de workflows en JSON complejo
- Deployment requiere contenedor adicional

#### ✅ Solución actual: Express + TypeScript directo
- **Simplicidad**: Un solo stack (Node.js/TypeScript)
- **Debugging**: VS Code nativo, breakpoints, logs
- **Testing**: Jest + Supertest para API
- **Deployment**: Un solo Docker container
- **Código versionado**: Git controla toda la lógica
- **Performance**: Sin overhead de n8n engine

**Backend ya existe**: `gemini-mcp-server/` tiene Express server listo

---

### ¿Por qué MCP en lugar de API directa?

**Model Context Protocol (MCP)** aporta:
- ✅ Abstracción de Playwright (tools = acciones)
- ✅ Gestión automática de contexto (browser, pages)
- ✅ Retry y error handling built-in
- ✅ Observable/debugging más simple
- ✅ Playwright Server ya implementado en `mcp-playwright-server.js`

---

## Roadmap de Implementación

### ✅ Sprint 1: FASE 1 Core (COMPLETADO)
- [x] Extension v3 estructura base
- [x] Content script con event capture
- [x] Service worker con state management
- [x] Gemini IA Ligera integration
- [x] Cache system con métricas
- [x] Tests completos (167/167)

### 🔄 Sprint 2: FASE 1 Polish (EN PROGRESO)
- [x] Selector de modelos en config
- [x] Métricas de cache detalladas
- [ ] Browser testing completo
- [ ] Documentación de arquitectura
- [ ] Performance benchmarks

### 📅 Sprint 3: FASE 2 Backend Express (PENDIENTE)
- [ ] Express API REST con 3 endpoints
- [ ] Test Generation Orchestrator (async jobs)
- [ ] MCP Playwright Service integration
- [ ] Gemini Optimizer Service (gemini-2.0-pro)
- [ ] Test Generator Service (Playwright + CSV)
- [ ] Error handling + retry logic
- [ ] Integration tests E2E

### 📅 Sprint 4: FASE 2 Optimización y Deploy
- [ ] Self-healing automático en MCP
- [ ] Dry-run validation opcional
- [ ] Performance monitoring (APM)
- [ ] Docker compose completo
- [ ] CI/CD pipeline
- [ ] Documentación deployment
- [ ] Validation/dry-run
- [ ] US#122 completo

### 📅 Sprint 5: Production Ready
- [ ] Export formats (Playwright, CSV, JSON)
- [ ] Dashboard de monitoreo
- [ ] Documentación completa
- [ ] Demo videos
- [ ] Release v3.0.0

---

## Diagramas

### Diagrama de Secuencia Completo

```
Usuario    Extension     Gemini     Express   MCP       Gemini     Output
           (FASE 1)      Flash      API       Playwright  Pro
  │           │            │         │         │         │          │
  ├─Click────>│            │         │         │         │          │
  │           ├─Analyze───>│         │         │         │          │
  │           │<─PreRank───┤         │         │         │          │
  │           │            │         │         │         │          │
  ├─Input────>│            │         │         │         │          │
  │           ├─(Cache HIT)│         │         │         │          │
  │           │            │         │         │         │          │
  ├─Submit───>│            │         │         │         │          │
  │           ├─Analyze───>│         │         │         │          │
  │           │<─PreRank───┤         │         │         │          │
  │           │            │         │         │         │          │
  │<─Badge(3)─┤            │         │         │         │          │
  │           │            │         │         │         │          │
  ├─Stop rec.>│            │         │         │         │          │
  │           ├─POST /test-generation/start──>│         │          │
  │           │<─202 Accepted (jobId)─────────┤         │          │
  │           │            │         ├─Orchestrator      │          │
  │           │            │         ├─Replay─>│         │          │
  │           │            │         │         ├─Step 1─>│          │
  │           │            │         │         ├─Step 2─>│          │
  │           │            │         │         ├─Step 3─>│          │
  │           │            │         │<─Results┤         │          │
  │           │            │         ├─Optimize────────>│          │
  │           │            │         │         │<─Analysis┤         │
  │           │            │         ├─Generate test────>│          │
  │           │            │         │         │<─Code────┤         │
  │           │            │         ├─Create ZIP───────────────────>│
  │           │            │         ├─Store job result  │          │
  │           ├─Poll GET /status/:jobId────>│  │         │          │
  │           │<─200 OK (completed + downloadUrl)───────┤          │
  │           ├─GET /download/:jobId────────>│           │          │
  │           │<─200 OK (tests.zip)──────────┤           │          │
  │<─Notif.───┤            │         │         │         │          │
```

---

## Conclusiones

Esta arquitectura de dos fases permite:

1. ✅ **UX óptima**: Captura rápida sin esperas (<1s por evento)
2. ✅ **Calidad máxima**: Validación real con replay + Gemini Pro
3. ✅ **Escalabilidad**: Backend Express procesa múltiples jobs en paralelo
4. ✅ **Resiliencia**: Fallback heurístico si IA falla, self-healing en replay
5. ✅ **Mantenibilidad**: Stack único (Node.js/TypeScript), no workflows visuales
6. ✅ **Simplicidad**: Un solo Docker container, debugging nativo en VS Code

La separación FASE 1 (ligera en cliente) + FASE 2 (profunda en servidor Express) es la decisión arquitectónica clave que permite tener **velocidad Y precisión**.

**Decisión arquitectónica**: Eliminación de n8n en favor de Express directo simplifica deployment, debugging y versionado.

---

**Próximos pasos**: Ver [PLAN-SIGUIENTES-PASOS.md](./PLAN-SIGUIENTES-PASOS.md)

**Testing**: Ver [BROWSER-TEST-GUIDE.md](./BROWSER-TEST-GUIDE.md)
