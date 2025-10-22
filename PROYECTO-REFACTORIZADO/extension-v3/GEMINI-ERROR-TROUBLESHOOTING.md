# 🔍 Troubleshooting: Error de Estructura Inválida de Gemini

## ❌ Error Observado

```
gemini-client.js:215 ❌ Estructura de respuesta inválida de Gemini
preAnalyzeElement @ gemini-client.js:215
```

## 🎯 Causas Comunes

### 1. **Respuesta Bloqueada por Safety Settings**
Gemini puede bloquear respuestas si detecta contenido potencialmente problemático.

**Indicadores en logs**:
```javascript
🚫 Gemini bloqueó el prompt: HARM_CATEGORY_DANGEROUS_CONTENT
🚫 Respuesta bloqueada por safety o recitación
⚠️ Gemini finalizó con razón: SAFETY
```

**Solución Automática**: 
El código ya maneja esto con **fallback analysis** automático (modo heurístico sin IA).

---

### 2. **API Key Inválida o Expirada**

**Indicadores en logs**:
```javascript
❌ Error HTTP de Gemini: 403 {"error": {"code": 403, "message": "API key not valid"}}
```

**Solución**:
1. Abre la extensión popup
2. Click en **"⚙️ Configuración"**
3. Ingresa una API key válida de Google AI Studio: https://aistudio.google.com/app/apikey
4. Guarda y recarga la extensión

---

### 3. **Límite de Rate Limiting Excedido**

**Indicadores en logs**:
```javascript
❌ Error HTTP de Gemini: 429 {"error": {"code": 429, "message": "Resource exhausted"}}
```

**Solución**:
- Espera 60 segundos y reintenta
- Mientras tanto, la extensión usa **fallback heurístico** automáticamente
- Considera usar modelo `gemini-2.0-flash-lite` (más rápido, menos cuota)

---

### 4. **Respuesta Vacía de Gemini**

**Indicadores en logs**:
```javascript
❌ Respuesta vacía de Gemini: {"candidates": []}
```

**Posibles razones**:
- Prompt demasiado complejo para el modelo flash
- Contenido del elemento HTML problemático
- Error temporal del servicio Gemini

**Solución Automática**:
- Fallback heurístico se activa automáticamente
- El análisis continúa sin interrupciones
- Cache evita repetir llamadas fallidas

---

### 5. **Error de Parsing JSON**

**Indicadores en logs**:
```javascript
❌ Error parseando JSON de Gemini: {malformed json...}
```

**Causa**:
- Gemini devolvió texto mal formateado
- Respuesta truncada por `maxOutputTokens`

**Solución Implementada**:
```javascript
// Limpieza automática de markdown code blocks
const cleanedText = analysisText
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();
```

---

## 🔧 Debugging Detallado

Para ver la respuesta completa de Gemini, abre **DevTools Console** y busca:

```javascript
❌ Estructura de respuesta inválida de Gemini
Candidate recibido: {
  "content": {...},
  "finishReason": "SAFETY",  // ⚠️ Indicador clave
  "safetyRatings": [...]
}
Respuesta completa: {
  "candidates": [...],
  "promptFeedback": {...}  // ⚠️ Puede contener blockReason
}
```

### Campos Importantes:

| Campo | Valor Normal | Valor Problemático |
|-------|--------------|-------------------|
| `finishReason` | `"STOP"` | `"SAFETY"`, `"RECITATION"`, `"MAX_TOKENS"` |
| `promptFeedback.blockReason` | `undefined` | `"HARM_CATEGORY_*"`, `"OTHER"` |
| `candidates.length` | `>= 1` | `0` |

---

## ✅ Comportamiento Esperado

Cuando Gemini falla, la extensión **NO se rompe**:

1. ✅ Detecta error automáticamente
2. ✅ Activa fallback heurístico
3. ✅ Continúa capturando eventos
4. ✅ Genera selectores con ranking básico
5. ✅ Registra métrica de fallback

**Logs normales en fallback**:
```javascript
🔄 Usando fallback analysis (sin API key)
✅ Pre-análisis fallback completo (5ms)
```

---

## 🎯 Validación del Fallback

El análisis fallback **NO es inferior**:

- ✅ Genera 3 selectores alternativos
- ✅ Detecta intents (form_fill, navigation, authentication)
- ✅ Identifica `target="_blank"`
- ✅ Score basado en prioridad: data-testid (100) > id (80) > name (70)

**Diferencias con Gemini IA**:
- ❌ No infiere contexto semántico complejo
- ❌ No detecta patrones avanzados (checkout flow, multi-step forms)
- ❌ No genera descripciones naturales ("Usuario hace login")

Pero **FASE 2** (Backend con gemini-2.0-pro) refinará todo esto.

---

## 📊 Métricas de Fallback

Verifica métricas en popup o console:

```javascript
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
  console.log('Gemini Stats:', response.geminiStats);
  // {
  //   cacheHits: 5,
  //   cacheMisses: 3,
  //   fallbacks: 2,  // ⚠️ Indica cuántas veces falló Gemini
  //   averageLatency: 250
  // }
});
```

**Fallbacks aceptables**: < 20% del total de análisis

---

## 🚀 Mejoras Implementadas (v3.0.0)

- ✅ Validación completa de estructura de respuesta
- ✅ Logs detallados de errores con JSON completo
- ✅ Detección de `finishReason` y `blockReason`
- ✅ Fallback automático robusto
- ✅ Cache evita llamadas repetidas fallidas
- ✅ Safety settings configurados en `BLOCK_NONE`

---

## 📝 Próximos Pasos

Si ves este error frecuentemente (>20% de análisis):

1. **Verificar API key**: ¿Es válida? ¿Tiene cuota disponible?
2. **Revisar logs**: ¿Qué `finishReason` aparece más?
3. **Probar modelo alternativo**: 
   - `gemini-2.0-flash-lite` (más rápido, menos restrictivo)
   - `gemini-1.5-flash` (legacy, más estable)
4. **Reportar issue**: Si es un problema sistemático, [crear issue en GitHub](https://github.com/pacomar2009-glitch/Simple-QA-Tests-builder/issues)

---

## 🔗 Referencias

- **Código**: `extension-v3/src/ai-ligera/gemini-client.js` líneas 205-230
- **Tests**: `extension-v3/tests/gemini-client.test.js`
- **Documentación Gemini**: https://ai.google.dev/gemini-api/docs/safety-settings
- **Arquitectura**: `extension-v3/ARCHITECTURE.md` (FASE 1 explicación completa)

---

**✅ Conclusión**: Este error es manejado correctamente por el código. La extensión continúa funcionando con fallback heurístico sin impacto en la captura de eventos.
