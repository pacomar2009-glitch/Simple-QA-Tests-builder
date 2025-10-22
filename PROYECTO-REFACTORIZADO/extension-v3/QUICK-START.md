# 🚀 Quick Start - Extension v3

**Tiempo estimado:** 10 minutos  
**Objetivo:** Validar métricas de cache en browser real

---

## Paso 1: Cargar Extension (2 min)

### En Chrome/Edge:

1. Abre el navegador
2. Ve a: `chrome://extensions/`
3. Activa **"Modo de desarrollador"** (toggle arriba a la derecha)
4. Click en **"Cargar extensión sin empaquetar"**
5. Selecciona esta carpeta: 
   ```
   C:\WARE-LOA\ITprojects\Tests-Analytics\PROYECTO-REFACTORIZADO\extension-v3
   ```
6. ✅ Deberías ver: **"TestBuilder Agéntico v3 - US#120"**

**Si hay errores:** 
- Verifica que `manifest.json` existe en la carpeta
- Refresca la extensión (icono de refresh en la tarjeta)

---

## Paso 2: Configurar API Key (1 min)

1. Click en el icono de puzzle 🧩 en la barra de Chrome
2. Busca "TestBuilder Agéntico v3"
3. Click en el icono de la extensión
4. En el popup, click **"⚙️ Configurar"**
5. Pega esta API Key:
   ```
   AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24
   ```
6. Modelo: Deja **"gemini-2.5-flash"** (por defecto)
7. Click **"Guardar"**
8. ✅ Verifica el mensaje: **"Configuración guardada correctamente"**

---

## Paso 3: Abrir Console y Cargar Script (2 min)

1. Ve a cualquier página web (ej: `https://example.com`)
2. Abre **DevTools** (F12 o Ctrl+Shift+I)
3. Ve a la pestaña **"Console"**
4. Abre el archivo: `test-metrics-console.js`
5. **Copia TODO el contenido** del archivo
6. **Pega** en la Console
7. Presiona **Enter**
8. ✅ Deberías ver:
   ```
   ═══════════════════════════════════════════════════════
     SCRIPT DE VALIDACIÓN CARGADO ✅
   ═══════════════════════════════════════════════════════
   
   Comandos disponibles:
     testMetrics()        - Ejecutar validación completa
     exportEvidence()     - Exportar JSON de evidencia
     resetMetrics()       - Reiniciar métricas y cache
   
   💡 Ejecuta: testMetrics()
   ```

---

## Paso 4: Iniciar Grabación (30 seg)

1. En el popup de la extensión, click **"Iniciar Grabación"**
2. ✅ El badge debería mostrar "0"
3. En la Console, ejecuta:
   ```javascript
   testMetrics()
   ```
4. Verifica que sale:
   - 📡 ESTADO DE LA EXTENSIÓN
   - 🎙️ Grabando: ✅ SÍ
   - 🤖 Gemini activo: ✅ SÍ

---

## Paso 5: Realizar 10 Acciones (3 min)

Realiza estas acciones en la página (ej: example.com):

1. **Click en "More information..."** (link)
2. **Click nuevamente en el mismo link** ← Esto debería dar Cache HIT
3. **Click en el logo** (volver a home)
4. **Click en "More information..."** otra vez ← Cache HIT
5. **Scroll down**
6. **Click en otro link** (si hay)
7. **Click en el logo nuevamente**
8. **Click en "More information..."** tercera vez ← Cache HIT
9. **Hover sobre cualquier elemento**
10. **Click en el logo** última vez

**En la Console deberías ver:**
```
📝 Acción capturada (iniciando pre-análisis): click
⚡ Cache HIT - Hit rate: 33.3%
✅ Pre-análisis completado en 245ms
⚡ Cache HIT - Hit rate: 50.0%
⚡ Cache HIT - Hit rate: 60.0%
...
```

---

## Paso 6: Validar Métricas (2 min)

1. En la Console, ejecuta:
   ```javascript
   testMetrics()
   ```

2. **Verifica estas secciones:**

### 📡 ESTADO DE LA EXTENSIÓN
- ✅ Grabando: SÍ
- ✅ Eventos capturados: ≥10
- ✅ Gemini activo: SÍ
- ✅ Cache size: >0

### 📊 MÉTRICAS DE GEMINI IA
- 🗂️ **CACHE:**
  - Hit rate: **Debe ser ≥40%** (si repetiste clicks)
  - Hits: >0
  - Misses: >0

- ⚡ **RENDIMIENTO:**
  - Total análisis: ≥10
  - Latencia promedio: **<1000ms** (objetivo: ~250ms)
  - Fallbacks: **0** (si API key funciona)

- 📈 **RESUMEN:**
  - Meta cumplida: **✅** (si hit rate ≥40%)

### 🎯 VALIDACIÓN DE CRITERIOS
```
✅ Cache hit rate ≥40%: 60.0%
✅ Latencia promedio <1000ms: 245ms
✅ Total análisis ≥10: 12
✅ Sin fallbacks: SÍ
```

### 🎬 ÚLTIMOS EVENTOS CAPTURADOS
- Verifica que cada evento tenga:
  - 🤖 IA: PHASE_1_LIGHTWEIGHT
  - Intent: navigation / form_submission / etc.
  - Opens new tab: true/false
  - Latency: <1000ms

---

## Paso 7: Exportar Evidencia (1 min)

1. En la Console, ejecuta:
   ```javascript
   exportEvidence()
   ```

2. Copia el JSON que aparece

3. Pega en un archivo nuevo: `EVIDENCIA-BROWSER-TEST.json`

4. **Estructura esperada:**
   ```json
   {
     "fecha": "2025-10-22T...",
     "commit": "baf7a527c",
     "branch": "feat/extension-v3-clean",
     "stats": {
       "cache": {
         "hitRate": "60.0%"
       },
       "performance": {
         "averageLatencyMs": "245.50"
       }
     },
     "validaciones": {
       "cacheHitRate": true,
       "latenciaPromedio": true,
       "sinFallbacks": true,
       "totalAnalisis": true
     }
   }
   ```

---

## ✅ Criterios de Éxito

Marca cada uno que se cumpla:

- [ ] Extension cargada sin errores en chrome://extensions/
- [ ] API key configurada y guardada
- [ ] Gemini activo: ✅ en testMetrics()
- [ ] 10+ eventos capturados
- [ ] Cache hit rate ≥40%
- [ ] Latencia promedio <1000ms
- [ ] Sin fallbacks (fallbackCount: 0)
- [ ] Todos los eventos tienen aiPreAnalysis
- [ ] JSON de evidencia exportado
- [ ] Todas validaciones en ✅ PASS

---

## 🐛 Troubleshooting

### ❌ "Extension error: Failed to load"
**Solución:** Verifica que la carpeta tenga todos los archivos:
```
extension-v3/
├── manifest.json
├── popup.html
├── icon.png
└── src/
    ├── background/service-worker.js
    └── content/capture.js
```

### ❌ "Gemini no activo"
**Solución:** 
1. Ve a configuración de la extensión
2. Verifica que la API key esté guardada
3. Recarga la extensión (chrome://extensions/ → botón refresh)

### ❌ "Cache hit rate = 0%"
**Causa:** No repetiste ninguna acción
**Solución:** Click 3 veces en el MISMO elemento

### ❌ "Latencia >1000ms"
**Causa:** Red lenta o API sobrecargada
**Solución:** 
1. Verifica tu conexión a internet
2. Reintenta en unos minutos
3. Si persiste, verifica que la API key sea válida

### ❌ "fallbackCount > 0"
**Causa:** API key inválida o expirada
**Solución:** Regenera la API key en Google AI Studio

---

## 🎯 Siguiente Paso

Una vez que TODAS las validaciones estén en ✅:

1. Commitea el archivo de evidencia:
   ```bash
   git add EVIDENCIA-BROWSER-TEST.json
   git commit -m "test: Add browser validation evidence"
   git push
   ```

2. Actualiza el todo list:
   - [x] Probar extensión en navegador → COMPLETADO

3. Continúa con: **US#122 - IA Agéntica (FASE 2)**
   - Lee `ARCHITECTURE.md` sección FASE 2
   - Revisa `gemini-mcp-server/` código existente
   - Planifica integración

---

**Tiempo total:** ~10 minutos  
**Dificultad:** Baja  
**Prerequisitos:** Chrome/Edge instalado

¡Éxito! 🚀
