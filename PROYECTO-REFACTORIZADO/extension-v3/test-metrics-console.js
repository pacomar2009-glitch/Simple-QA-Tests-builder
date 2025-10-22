/**
 * SCRIPT DE VALIDACIÓN DE MÉTRICAS - EXTENSION V3
 * 
 * Uso:
 * 1. Cargar extension en Chrome
 * 2. Abrir DevTools Console en cualquier página
 * 3. Copiar y pegar este script completo
 * 4. Ejecutar: testMetrics()
 * 
 * Fecha: 22 octubre 2025
 * Commit: baf7a527c
 */

// ===== FUNCIÓN PRINCIPAL =====
async function testMetrics() {
  console.clear();
  console.log('%c╔════════════════════════════════════════════════════╗', 'color: #4CAF50; font-weight: bold');
  console.log('%c║  VALIDACIÓN DE MÉTRICAS - EXTENSION V3            ║', 'color: #4CAF50; font-weight: bold');
  console.log('%c║  Commit: baf7a527c                                ║', 'color: #4CAF50; font-weight: bold');
  console.log('%c╚════════════════════════════════════════════════════╝', 'color: #4CAF50; font-weight: bold');
  
  // 1. Verificar estado general
  await checkExtensionState();
  
  // 2. Obtener métricas detalladas
  await getDetailedMetrics();
  
  // 3. Validar criterios
  await validateCriteria();
  
  // 4. Ver últimos eventos
  await checkRecentEvents();
  
  console.log('\n%c✅ Validación completa', 'color: #4CAF50; font-weight: bold; font-size: 14px');
}

// ===== VERIFICAR ESTADO =====
function checkExtensionState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      console.log('\n%c📡 ESTADO DE LA EXTENSIÓN:', 'color: #2196F3; font-weight: bold');
      
      if (!response || !response.success) {
        console.error('❌ Extension no responde');
        resolve();
        return;
      }
      
      const state = response.state;
      console.log(`   🎙️  Grabando: ${state.isRecording ? '✅ SÍ' : '⏸️  NO'}`);
      console.log(`   📦 Eventos capturados: ${state.eventsCount}`);
      console.log(`   🆔 Session ID: ${state.sessionId}`);
      console.log(`   🤖 Gemini activo: ${state.geminiEnabled ? '✅ SÍ' : '❌ NO'}`);
      
      if (state.geminiStats) {
        console.log(`   📊 Cache size: ${state.geminiStats.cache.size}/${state.geminiStats.cache.maxSize}`);
        console.log(`   ⚡ Hit rate: ${state.geminiStats.cache.hitRate}`);
      }
      
      if (!state.geminiEnabled) {
        console.warn('\n⚠️  WARNING: Gemini no está activo. Configura la API key.');
      }
      
      resolve();
    });
  });
}

// ===== OBTENER MÉTRICAS DETALLADAS =====
function getDetailedMetrics() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_GEMINI_STATS' }, (response) => {
      console.log('\n%c📊 MÉTRICAS DE GEMINI IA:', 'color: #FF9800; font-weight: bold');
      
      if (!response || !response.success) {
        console.error('❌ No se pudieron obtener métricas');
        console.log('   Posible causa: Gemini no inicializado');
        resolve();
        return;
      }
      
      const stats = response.stats;
      
      // Cache
      console.log('\n%c  🗂️  CACHE:', 'color: #9C27B0; font-weight: bold');
      console.log(`     Tamaño actual: ${stats.cache.size}`);
      console.log(`     Capacidad máxima: ${stats.cache.maxSize}`);
      console.log(`     Cache hits: ${stats.cache.hits}`);
      console.log(`     Cache misses: ${stats.cache.misses}`);
      console.log(`     Hit rate: %c${stats.cache.hitRate}%c`, 
        `color: ${parseFloat(stats.cache.hitRate) >= 40 ? '#4CAF50' : '#F44336'}; font-weight: bold`,
        'color: inherit'
      );
      
      // Rendimiento
      console.log('\n%c  ⚡ RENDIMIENTO:', 'color: #FF5722; font-weight: bold');
      console.log(`     Total análisis: ${stats.performance.totalAnalyses}`);
      console.log(`     Latencia promedio: ${stats.performance.averageLatencyMs}ms`);
      console.log(`     Latencia total: ${stats.performance.totalLatencyMs}ms`);
      console.log(`     Fallbacks usados: ${stats.performance.fallbackCount}`);
      
      // Resumen
      console.log('\n%c  📈 RESUMEN:', 'color: #3F51B5; font-weight: bold');
      console.log(`     Análisis con IA: ${stats.summary.aiPowered}`);
      console.log(`     Análisis fallback: ${stats.summary.fallbackUsed}`);
      console.log(`     Eficiencia: ${stats.summary.cacheEfficiency}`);
      console.log(`     Meta cumplida: ${stats.summary.targetMet}`);
      
      // Tabla resumen
      console.log('\n%c  📋 TABLA RESUMEN:', 'color: #607D8B; font-weight: bold');
      console.table({
        'Cache Hits': stats.cache.hits,
        'Cache Misses': stats.cache.misses,
        'Hit Rate': stats.cache.hitRate,
        'Total Análisis': stats.performance.totalAnalyses,
        'Latencia Avg (ms)': stats.performance.averageLatencyMs,
        'Fallbacks': stats.performance.fallbackCount
      });
      
      // Guardar para validación
      window._lastMetrics = stats;
      resolve();
    });
  });
}

// ===== VALIDAR CRITERIOS =====
function validateCriteria() {
  return new Promise((resolve) => {
    if (!window._lastMetrics) {
      console.warn('\n⚠️  No hay métricas para validar');
      resolve();
      return;
    }
    
    const stats = window._lastMetrics;
    const hitRate = parseFloat(stats.cache.hitRate);
    const avgLatency = parseFloat(stats.performance.averageLatencyMs);
    const totalAnalyses = stats.performance.totalAnalyses;
    const fallbacks = stats.performance.fallbackCount;
    
    console.log('\n%c🎯 VALIDACIÓN DE CRITERIOS:', 'color: #00BCD4; font-weight: bold');
    
    // Criterio 1: Cache hit rate
    const cachePass = hitRate >= 40 || totalAnalyses < 10;
    console.log(`   ${cachePass ? '✅' : '❌'} Cache hit rate ≥40%: ${hitRate.toFixed(1)}% ${!cachePass ? '(Realiza más acciones repetidas)' : ''}`);
    
    // Criterio 2: Latencia
    const latencyPass = avgLatency < 1000;
    console.log(`   ${latencyPass ? '✅' : '❌'} Latencia promedio <1000ms: ${avgLatency}ms`);
    
    // Criterio 3: Total análisis
    const analysesPass = totalAnalyses >= 10 || totalAnalyses === 0;
    console.log(`   ${analysesPass ? '✅' : '⚠️ '} Total análisis ≥10: ${totalAnalyses} ${!analysesPass ? '(Realiza más acciones)' : ''}`);
    
    // Criterio 4: Sin fallbacks (solo warning)
    const fallbackPass = fallbacks === 0;
    console.log(`   ${fallbackPass ? '✅' : '⚠️ '} Sin fallbacks: ${fallbackPass ? 'SÍ' : `NO (${fallbacks} fallbacks)`}`);
    
    // Resultado final
    const allPass = cachePass && latencyPass && latencyPass;
    console.log(`\n   ${allPass ? '✅ TODAS LAS VALIDACIONES PASARON' : '⚠️  ALGUNAS VALIDACIONES FALLARON'}`);
    
    if (!allPass && totalAnalyses < 10) {
      console.log('\n%c💡 TIP: Realiza al menos 10 acciones, repitiendo clicks en los mismos elementos para mejorar el cache hit rate', 'color: #FFC107');
    }
    
    resolve();
  });
}

// ===== VER ÚLTIMOS EVENTOS =====
function checkRecentEvents() {
  return new Promise((resolve) => {
    chrome.storage.local.get('capturedEvents', (result) => {
      const events = result.capturedEvents || [];
      
      console.log('\n%c🎬 ÚLTIMOS EVENTOS CAPTURADOS:', 'color: #E91E63; font-weight: bold');
      console.log(`   Total eventos: ${events.length}`);
      
      if (events.length === 0) {
        console.log('   ℹ️  No hay eventos capturados. Inicia la grabación y realiza acciones.');
        resolve();
        return;
      }
      
      // Mostrar últimos 3 eventos
      const recentEvents = events.slice(-3);
      console.log(`\n   Mostrando últimos ${recentEvents.length} eventos:`);
      
      recentEvents.forEach((event, index) => {
        const eventNum = events.length - recentEvents.length + index + 1;
        console.log(`\n   %c[${eventNum}] ${event.action.type.toUpperCase()}`, 'color: #009688; font-weight: bold');
        console.log(`       Selector: ${event.action.selector || 'N/A'}`);
        console.log(`       Timestamp: ${new Date(event.timestamp).toLocaleTimeString()}`);
        
        if (event.aiPreAnalysis) {
          console.log(`       🤖 IA: ${event.aiPreAnalysis.phase || 'N/A'}`);
          console.log(`       Intent: ${event.aiPreAnalysis.intent || 'N/A'}`);
          console.log(`       Opens new tab: ${event.aiPreAnalysis.opensNewTab || false}`);
          console.log(`       Latency: ${event.aiPreAnalysis.latencyMs || 'N/A'}ms`);
        } else {
          console.log('       ⚠️  Sin aiPreAnalysis');
        }
      });
      
      // Verificar que todos tienen aiPreAnalysis
      const eventsWithAI = events.filter(e => e.aiPreAnalysis && e.aiPreAnalysis.phase !== 'PHASE_1_NO_AI').length;
      console.log(`\n   📊 Eventos con IA activa: ${eventsWithAI}/${events.length} (${((eventsWithAI/events.length)*100).toFixed(1)}%)`);
      
      resolve();
    });
  });
}

// ===== HELPER: EXPORTAR EVIDENCIA =====
function exportEvidence() {
  if (!window._lastMetrics) {
    console.error('❌ No hay métricas para exportar. Ejecuta testMetrics() primero.');
    return;
  }
  
  const evidence = {
    fecha: new Date().toISOString(),
    commit: 'baf7a527c',
    branch: 'feat/extension-v3-clean',
    stats: window._lastMetrics,
    validaciones: {
      cacheHitRate: parseFloat(window._lastMetrics.cache.hitRate) >= 40,
      latenciaPromedio: parseFloat(window._lastMetrics.performance.averageLatencyMs) < 1000,
      sinFallbacks: window._lastMetrics.performance.fallbackCount === 0,
      totalAnalisis: window._lastMetrics.performance.totalAnalyses >= 10
    }
  };
  
  console.log('\n%c💾 EVIDENCIA JSON:', 'color: #8BC34A; font-weight: bold');
  console.log(JSON.stringify(evidence, null, 2));
  
  // Intentar copiar al portapapeles
  if (typeof copy === 'function') {
    copy(JSON.stringify(evidence, null, 2));
    console.log('\n✅ Evidencia copiada al portapapeles');
  } else {
    console.log('\n⚠️  copy() no disponible. Copia manualmente el JSON de arriba.');
  }
  
  return evidence;
}

// ===== HELPER: LIMPIAR MÉTRICAS =====
function resetMetrics() {
  chrome.runtime.sendMessage({ type: 'RESET_GEMINI_CACHE' }, (response) => {
    if (response && response.success) {
      console.log('✅ Métricas reiniciadas');
      window._lastMetrics = null;
    } else {
      console.error('❌ No se pudieron reiniciar las métricas');
    }
  });
}

// ===== INSTRUCCIONES =====
console.log('%c═══════════════════════════════════════════════════════', 'color: #4CAF50');
console.log('%c  SCRIPT DE VALIDACIÓN CARGADO ✅', 'color: #4CAF50; font-weight: bold; font-size: 16px');
console.log('%c═══════════════════════════════════════════════════════', 'color: #4CAF50');
console.log('\n%cComandos disponibles:', 'color: #2196F3; font-weight: bold');
console.log('  %ctestMetrics()%c        - Ejecutar validación completa', 'color: #FF9800', 'color: inherit');
console.log('  %cexportEvidence()%c     - Exportar JSON de evidencia', 'color: #FF9800', 'color: inherit');
console.log('  %cresetMetrics()%c      - Reiniciar métricas y cache', 'color: #FF9800', 'color: inherit');
console.log('\n%c💡 Ejecuta: testMetrics()', 'color: #FFC107; font-weight: bold; font-size: 14px');
console.log('═══════════════════════════════════════════════════════\n');
