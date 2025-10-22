# Guía de Prueba en Navegador - Extension v3

**Fecha:** 22 octubre 2025  
**Objetivo:** Validar métricas de cache y pre-análisis IA en entorno real

---

## 📋 Pre-requisitos

1. ✅ Chrome/Edge en modo desarrollador
2. ✅ API Key de Gemini configurada
3. ✅ Extension v3 compilada

---

## 🚀 Paso 1: Cargar Extension

### Opción A: Desde VS Code
```bash
# Terminal en extension-v3/
npm run build
```

### Opción B: Manual
1. Abrir `chrome://extensions/`
2. Activar "Modo de desarrollador" (esquina superior derecha)
3. Click "Cargar extensión sin empaquetar"
4. Seleccionar: `C:\WARE-LOA\ITprojects\Tests-Analytics\PROYECTO-REFACTORIZADO\extension-v3\`

---

## 🔧 Paso 2: Configurar API Key

1. Click en el icono de la extensión en la barra de herramientas
2. Click en "⚙️ Configurar"
3. Pegar API Key: `AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24`
4. Seleccionar modelo: `gemini-2.5-flash` (por defecto)
5. Click "Guardar"
6. Verificar mensaje: "✅ Configuración guardada"

---

## 🧪 Paso 3: Prueba de 10 Acciones

### Abrir DevTools Console
```javascript
// Monitorear métricas en tiempo real
chrome.runtime.sendMessage({ type: 'GET_GEMINI_STATS' }, (response) => {
  console.log('📊 ESTADÍSTICAS ACTUALES:');
  console.table(response.stats);
});
```

### Secuencia de Prueba (sitio recomendado: example.com)

1. **Click en link** → Verifica: `aiPreAnalysis.intent = "navigation"`
2. **Input en campo texto** → Verifica: `aiPreAnalysis` tiene `selectorPreRanking`
3. **Click en botón** → Verifica: `latencyMs < 1000`
4. **Segundo click en mismo botón** → Verifica: `⚡ Cache HIT` en console
5. **Click en otro link** → Verifica: `cacheMisses++`
6. **Input en mismo campo** → Verifica: `Cache HIT`
7. **Click en checkbox** → Nuevo análisis
8. **Click en dropdown** → Nuevo análisis
9. **Submit formulario** → Verifica: `intent = "form_submission"`
10. **Click en link target="_blank"** → Verifica: `opensNewTab = true`

---

## 📊 Paso 4: Validar Métricas

### Después de 10 acciones, ejecutar en Console:

```javascript
// Obtener estadísticas completas
chrome.runtime.sendMessage({ type: 'GET_GEMINI_STATS' }, (response) => {
  if (response.success) {
    const stats = response.stats;
    
    console.log('═══════════════════════════════════════');
    console.log('📊 REPORTE DE MÉTRICAS - EXTENSION V3');
    console.log('═══════════════════════════════════════');
    
    console.log('\n🗂️  CACHE:');
    console.log(`   Tamaño: ${stats.cache.size}/${stats.cache.maxSize}`);
    console.log(`   Hits: ${stats.cache.hits}`);
    console.log(`   Misses: ${stats.cache.misses}`);
    console.log(`   Hit Rate: ${stats.cache.hitRate}`);
    
    console.log('\n⚡ RENDIMIENTO:');
    console.log(`   Total análisis: ${stats.performance.totalAnalyses}`);
    console.log(`   Latencia promedio: ${stats.performance.averageLatencyMs}ms`);
    console.log(`   Latencia total: ${stats.performance.totalLatencyMs}ms`);
    console.log(`   Fallbacks: ${stats.performance.fallbackCount}`);
    
    console.log('\n📈 RESUMEN:');
    console.log(`   IA activa: ${stats.summary.aiPowered} análisis`);
    console.log(`   Fallback usado: ${stats.summary.fallbackUsed} análisis`);
    console.log(`   Eficiencia cache: ${stats.summary.cacheEfficiency}`);
    console.log(`   Meta ≥40%: ${stats.summary.targetMet}`);
    
    console.log('\n═══════════════════════════════════════');
    
    // Validaciones automáticas
    const hitRate = parseFloat(stats.cache.hitRate);
    const avgLatency = parseFloat(stats.performance.averageLatencyMs);
    
    console.log('\n✅ VALIDACIONES:');
    console.log(`   Cache hit rate ≥40%: ${hitRate >= 40 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Latencia <1000ms: ${avgLatency < 1000 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Sin fallbacks: ${stats.performance.fallbackCount === 0 ? '✅ PASS' : '⚠️  WARNING'}`);
    console.log(`   Total análisis ≥10: ${stats.performance.totalAnalyses >= 10 ? '✅ PASS' : '❌ FAIL'}`);
    
  } else {
    console.error('❌ Error obteniendo stats:', response.error);
  }
});
```

---

## 🎯 Criterios de Éxito

### Métricas Obligatorias
- [ ] **Cache hit rate:** ≥40% después de 10 acciones
- [ ] **Latencia promedio:** <1000ms
- [ ] **Total análisis:** 10 (uno por acción)
- [ ] **aiPreAnalysis presente:** En los 10 eventos capturados

### Funcionalidad Esperada
- [ ] Primer click en elemento → Cache MISS
- [ ] Segundo click en mismo elemento → Cache HIT
- [ ] Console muestra: `⚡ Cache HIT - Hit rate: X%`
- [ ] Pre-análisis incluye: `selectorPreRanking`, `opensNewTab`, `intent`
- [ ] Fallback count = 0 (si API key válida)

---

## 🔍 Paso 5: Inspeccionar Eventos Capturados

```javascript
// Ver eventos completos con aiPreAnalysis
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
  console.log('📦 ESTADO COMPLETO:');
  console.log(`   Grabando: ${response.state.isRecording}`);
  console.log(`   Eventos: ${response.state.eventsCount}`);
  console.log(`   Gemini activo: ${response.state.geminiEnabled}`);
  console.log(`   Stats inline:`, response.state.geminiStats);
});

// Ver último evento capturado
chrome.storage.local.get('capturedEvents', (result) => {
  const events = result.capturedEvents || [];
  const lastEvent = events[events.length - 1];
  
  console.log('\n🎬 ÚLTIMO EVENTO CAPTURADO:');
  console.log('Tipo:', lastEvent.action.type);
  console.log('Selector:', lastEvent.action.selector);
  console.log('\n🤖 AI PRE-ANÁLISIS:');
  console.log(lastEvent.aiPreAnalysis);
});
```

---

## 📸 Paso 6: Captura de Evidencias

### Screenshot de Console con:
1. Mensaje "✅ Pre-análisis completado en Xms"
2. Mensaje "⚡ Cache HIT - Hit rate: X%"
3. Reporte completo de métricas
4. Validaciones todas en ✅ PASS

### Archivo JSON de evidencia:
```javascript
// Exportar datos de prueba
chrome.runtime.sendMessage({ type: 'GET_GEMINI_STATS' }, (response) => {
  const evidencia = {
    fecha: new Date().toISOString(),
    commit: 'baf7a527c',
    branch: 'feat/extension-v3-clean',
    stats: response.stats,
    validaciones: {
      cacheHitRate: parseFloat(response.stats.cache.hitRate) >= 40,
      latenciaPromedio: parseFloat(response.stats.performance.averageLatencyMs) < 1000,
      sinFallbacks: response.stats.performance.fallbackCount === 0,
      totalAnalisis: response.stats.performance.totalAnalyses >= 10
    }
  };
  
  console.log('💾 EVIDENCIA:', JSON.stringify(evidencia, null, 2));
  
  // Copiar al portapapeles
  copy(JSON.stringify(evidencia, null, 2));
  console.log('✅ Evidencia copiada al portapapeles');
});
```

---

## 🐛 Troubleshooting

### Problema: "Gemini no disponible"
**Solución:**
1. Verificar API key en configuración
2. Revisar console: `chrome.runtime.sendMessage({type:'GET_STATE'}, console.log)`
3. Confirmar `geminiEnabled: true`

### Problema: Cache hit rate = 0%
**Causa:** No hay elementos repetidos
**Solución:** Click 2 veces en el mismo botón/link

### Problema: Latencia >1000ms
**Causa:** Red lenta o API Gemini sobrecargada
**Solución:** Esperar y reintentar, verificar conexión

### Problema: fallbackCount > 0
**Causa:** API key inválida o expirada
**Solución:** Regenerar API key en Google AI Studio

---

## 📝 Registro de Resultados

**Fecha de prueba:** _________________  
**Tester:** _________________  
**Commit:** `baf7a527c`

### Resultados:
- Cache hit rate: _____%
- Latencia promedio: _____ms
- Total análisis: _____
- Fallbacks: _____
- Todas validaciones: [ ] PASS / [ ] FAIL

### Notas adicionales:
_______________________________________
_______________________________________
_______________________________________

---

## ✅ Checklist Final

- [ ] Extension cargada sin errores
- [ ] API key configurada
- [ ] 10 acciones realizadas
- [ ] Métricas validadas (≥40% hit rate)
- [ ] aiPreAnalysis presente en todos los eventos
- [ ] Screenshots capturados
- [ ] JSON de evidencia guardado
- [ ] Resultados documentados

**Estado:** [ ] TODO / [ ] IN PROGRESS / [ ] COMPLETED
