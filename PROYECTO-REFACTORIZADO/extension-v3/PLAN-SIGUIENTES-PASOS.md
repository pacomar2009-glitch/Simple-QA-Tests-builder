# Plan de Siguientes Pasos - Extension v3

**Fecha:** 22 octubre 2025  
**Commit actual:** `3f341300e` - feat: Add model selector dropdown and fix runtime errors  
**Branch:** `feat/extension-v3-clean`

---

## ✅ Completado Recientemente

### Sprint Actual - Gemini IA Ligera (US#121)

1. **Selector de Modelos en Configuración** ✅
   - Dropdown con 4 modelos Gemini 2.x validados
   - Guardado/carga en `chrome.storage.sync.geminiModel`
   - Integración completa: config.js → service-worker.js → gemini-client.js

2. **Fix Runtime Error Critical** ✅
   - Error: `Cannot read properties of undefined (reading '0')`
   - Solución: Null checks completos en línea 184
   - Prevención de crashes en `preAnalyzeElement()`

3. **Tests Validados** ✅
   - 167/167 tests pasando
   - Coverage: 100% en componentes críticos

---

## 🎯 Próximos 5 Pasos Prioritarios

### Paso 1: Integrar Pre-análisis en Captura (2 horas)
**Archivos a modificar:**
- `src/background/service-worker.js`
- Método: `captureUserAction()` o equivalente

**Cambios requeridos:**
```javascript
// En service-worker.js - Al capturar evento
async function captureUserAction(event) {
  // ... código existente ...
  
  // NUEVO: Pre-análisis IA
  const preAnalysis = await state.geminiAI.preAnalyzeElement(
    elementData,
    { url: event.pageUrl, title: event.pageTitle }
  );
  
  const step = {
    id: generateId(),
    timestamp: Date.now(),
    type: event.type,
    target: elementData,
    
    // NUEVO: Campo aiPreAnalysis
    aiPreAnalysis: {
      selectorPreRanking: preAnalysis.selectorPreRanking,
      opensNewTab: preAnalysis.opensNewTab,
      intent: preAnalysis.intent,
      note: 'Pre-análisis. IA Agéntica refinará en FASE 2',
      phase: 'PHASE_1_LIGHTWEIGHT'
    }
  };
  
  // Guardar paso con pre-análisis
  saveCapturedStep(step);
}
```

**Validación:**
- Console.log debe mostrar `aiPreAnalysis` en cada paso
- Verificar latencia <1s por evento

---

### Paso 2: Implementar Cache de Análisis (1 hora)
**Archivo:** `src/ai-ligera/gemini-client.js`

**Cambios requeridos:**
```javascript
// Ya existe this.analysisCache = new Map()
// Optimizar getCacheKey() para mejor hit rate

getCacheKey(elementData) {
  // Mejorar para detectar elementos similares
  return `${elementData.tagName}-${elementData.type}-${elementData.role || 'none'}`;
}

// Agregar estadísticas
getCacheStats() {
  return {
    size: this.analysisCache.size,
    maxSize: this.maxCacheSize,
    // Calcular hit rate con contador interno
  };
}
```

**Métricas objetivo:**
- Cache hit rate: ≥40%
- Tamaño máximo: 100 entradas

---

### Paso 3: Prueba en Navegador Real (1 hora)
**Proceso:**
1. Cargar extensión en `chrome://extensions/`
2. Configurar API key y modelo en settings
3. Grabar sesión de 10 pasos en web de prueba
4. Abrir DevTools → Console
5. Verificar logs:
   ```
   ✅ Paso capturado con IA pre-análisis: {...}
   aiPreAnalysis: {
     selectorPreRanking: [...],
     opensNewTab: false,
     intent: "form_submission"
   }
   ```

**Checklist:**
- [ ] Cada paso tiene campo `aiPreAnalysis`
- [ ] Pre-análisis toma <1s por evento
- [ ] No hay errores en console
- [ ] Cache funciona (observar logs de hit/miss)

---

### Paso 4: Medir y Documentar Latencia (30 min)
**Archivo:** `src/ai-ligera/gemini-client.js`

**Agregar timestamps:**
```javascript
async preAnalyzeElement(elementData, pageContext) {
  const startTime = performance.now();
  
  // ... análisis ...
  
  const duration = performance.now() - startTime;
  console.log(`⏱️ Pre-análisis completado en ${duration.toFixed(2)}ms`);
  
  return {
    ...analysis,
    _metadata: { analysisTime: duration }
  };
}
```

**Documentar en README:**
- Latencia promedio observada
- Comparación con/sin cache
- Recomendaciones de optimización

---

### Paso 5: Preparar Integración con Backend Express (FASE 2)
**Archivo a crear:** `INTEGRACION-BACKEND.md`

**Contenido:**
```markdown
# Integración Backend Node.js/Express (FASE 2)

## Endpoint Backend
POST http://localhost:4000/test-generation/start

## Formato de Payload
{
  "sessionId": "session-1729600000000",
  "steps": [
    {
      "id": "step-001",
      "timestamp": 1729600001000,
      "type": "click",
      "target": { ... },
      "aiPreAnalysis": { ... },  // ← FASE 1
      "pageContext": { ... }
    }
  ],
  "metadata": {
    "phase": "PHASE_1_RECORDED",
    "nextPhase": "PHASE_2_AGENTIC_REPLAY",
    "browser": "Chrome",
    "extensionVersion": "0.1.0"
  }
}

## Respuesta Esperada (202 Accepted)
{
  "jobId": "job-uuid-12345",
  "status": "processing",
  "statusUrl": "/test-generation/status/job-uuid-12345",
  "estimatedTime": "30s"
}

## Consultar Estado
GET http://localhost:4000/test-generation/status/job-uuid-12345

## Descargar Tests Generados
GET http://localhost:4000/test-generation/download/job-uuid-12345
```

---

## 📊 Estado de Issues GitHub

### US#121 - Gemini IA Ligera (EN PROGRESO) 🟡
- **Completado:** 70%
- **Bloqueadores:** Ninguno
- **Próximo hito:** Integración con captura (Paso 1)
- [Ver issue](https://github.com/pacomar2009-glitch/Simple-QA-Tests-builder/issues/121)

### US#122 - IA Agéntica Backend Node.js (PENDIENTE) ⏳
- **Status:** Arquitectura actualizada (sin n8n), implementación en Sprint 3
- **Tecnología:** Node.js/Express + TypeScript
- **Dependencias:** US#120, US#121
- **Prioridad:** CRÍTICA (Cerebro del sistema)
- [Ver issue](https://github.com/pacomar2009-glitch/Simple-QA-Tests-builder/issues/122)

---

## 🗓️ Timeline Estimado

| Paso | Duración | Inicio | Fin |
|------|----------|--------|-----|
| Paso 1: Integrar pre-análisis | 2h | Hoy | Hoy |
| Paso 2: Cache optimizado | 1h | Hoy | Hoy |
| Paso 3: Prueba browser | 1h | Mañana | Mañana |
| Paso 4: Medir latencia | 30min | Mañana | Mañana |
| Paso 5: Doc backend | 1h | Mañana | Mañana |

**Total estimado:** 5.5 horas de desarrollo

---

## 🔧 Comandos Útiles

### Ejecutar Tests
```bash
cd extension-v3
npm test
```

### Ver Coverage
```bash
npm test -- --coverage
```

### Cargar Extensión en Chrome
1. Abrir `chrome://extensions/`
2. Activar "Modo de desarrollador"
3. "Cargar extensión sin empaquetar"
4. Seleccionar carpeta `extension-v3/`

### Ver Logs de Service Worker
1. `chrome://extensions/`
2. Click en "service worker" debajo de la extensión
3. Abrir DevTools → Console

---

## 📚 Documentación de Referencia

### Gemini API
- [Modelos disponibles](https://ai.google.dev/gemini-api/docs/models/gemini)
- [API v1 (estable)](https://ai.google.dev/api/rest/v1/models)
- Modelo recomendado: `gemini-2.5-flash`

### Chrome Extension APIs
- [chrome.storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [chrome.runtime](https://developer.chrome.com/docs/extensions/reference/api/runtime)
- [Service Workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)

### Tests
- [Jest](https://jestjs.io/docs/getting-started)
- Tests actuales: 167 passing
- Coverage: 100% en módulos críticos

---

## 💡 Notas Importantes

### Gemini 1.5 → 2.x Migration
- **Todos los modelos 1.5.x están deprecados**
- HTTP 404 en cualquier petición a modelos 1.5
- Migración obligatoria a familia 2.x
- API v1 es más estable que v1beta

### Modelos Validados (Con API Key Real)
1. ✅ `gemini-2.5-flash` (v1) - **Recomendado**
2. ✅ `gemini-2.0-flash` (v1)
3. ✅ `gemini-2.0-flash-lite` (v1)
4. ✅ `gemini-flash-latest` (v1beta)

### Scripts de Validación Creados
- `test-gemini-models.js` - Lista modelos disponibles
- `test-gemini-2x.js` - Prueba con API key real
- `test-integration.js` - Validación HTTP 200

---

## 🚀 Cuando Todo Esté Completo

### Checklist Final US#121
- [ ] Pre-análisis integrado en captura
- [ ] Cache funcionando (≥40% hit rate)
- [ ] Latencia <1s validada
- [ ] Pruebas en browser exitosas
- [ ] Pasos con `aiPreAnalysis` enviados a backend
- [ ] Documentación publicada
- [ ] Commit y push a GitHub

### Siguiente US#122 (Sprint 3)
- Backend Node.js/Express con Test Generation Orchestrator
- MCP Playwright Service para replay
- Gemini IA Optimizer Service para optimización profunda
- Test Generator Service para Playwright + CSV
- API REST con 3 endpoints (start, status, download)

---

_Última actualización: 22 octubre 2025_
_Mantenedor: @loa-maker_
