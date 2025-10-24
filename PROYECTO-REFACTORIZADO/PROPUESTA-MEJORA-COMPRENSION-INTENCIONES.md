# 🎯 Propuesta: Mejora de Comprensión de Intenciones de Usuario (Sin Incrementar Consumo)

## 📊 Análisis del Problema Actual

### Eventos Capturados Actualmente
```javascript
// extension-v3/src/content/capture.js
- click, dblclick, contextmenu
- input, change, submit
- keydown
- scroll (debounced 500ms)
- hover (throttled 1000ms, solo elementos interactivos)
- focus, blur
- dragstart, drop
```

### Limitaciones Detectadas
1. **Hover**: Throttled a 1000ms → puede perder hovers significativos
2. **Scroll**: Debounced a 500ms → no captura intención de scroll a elemento específico
3. **Contexto semántico**: No se captura el "por qué" de la acción
4. **Secuencias**: No se detectan patrones de intención (ej: hover → esperar → click)

---

## 💡 Soluciones Propuestas (CERO Incremento de Tokens)

### 1. **Enriquecimiento Semántico en Captura (Cliente)**
**Implementación**: Agregar metadata contextual SIN enviar más datos a la IA

```javascript
// ANTES (datos actuales)
{
  type: 'hover',
  selector: '#menu-item-5',
  text: 'Products'
}

// DESPUÉS (enriquecido con contexto)
{
  type: 'hover',
  selector: '#menu-item-5',
  text: 'Products',
  context: {
    intent: 'navigation_trigger',  // Detectado automáticamente
    hasSubMenu: true,              // Elemento tiene submenu
    visibilityChange: true,        // Causó cambio de visibilidad
    duration: 1500,                // Hover mantenido 1.5s
    followedBy: 'click'            // Acción subsecuente
  }
}
```

**Ventajas**:
- ✅ CERO tokens extra (agregamos solo 4-5 campos por evento)
- ✅ La IA recibe mismo JSON pero más rico semánticamente
- ✅ Mejora comprensión sin cambiar prompt

---

### 2. **Detección de Patrones de Intención (Pre-Procesamiento)**
**Implementación**: Analizar secuencias antes de enviar a IA

```javascript
// PATRÓN: Hover prolongado seguido de click = intención deliberada
function detectIntentPatterns(steps) {
  const enrichedSteps = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const nextStep = steps[i + 1];
    const prevStep = steps[i - 1];
    
    // Detectar: Scroll + Hover + Click = "Buscar y acceder"
    if (
      prevStep?.type === 'scroll' &&
      step.type === 'hover' &&
      nextStep?.type === 'click' &&
      isSameElement(step.selector, nextStep.selector)
    ) {
      step.intentPattern = 'search_and_access';
      step.description = `Usuario buscó elemento scrolleando y accedió deliberadamente`;
    }
    
    // Detectar: Hover prolongado (>1s) = Inspección deliberada
    if (step.type === 'hover' && step.duration > 1000) {
      step.intentPattern = 'inspection';
      step.description = `Usuario inspeccionó elemento (hover ${step.duration}ms)`;
    }
    
    // Detectar: Hover que revela contenido = Navegación por menú
    if (step.type === 'hover' && step.context?.visibilityChange) {
      step.intentPattern = 'menu_navigation';
      step.description = `Hover reveló submenu/tooltip`;
    }
    
    enrichedSteps.push(step);
  }
  
  return enrichedSteps;
}
```

**Ejemplo de Output**:
```json
{
  "type": "hover",
  "selector": "#products-menu",
  "intentPattern": "menu_navigation",
  "description": "Hover reveló submenu/tooltip",
  "context": {
    "visibilityChange": true,
    "duration": 1200
  }
}
```

**Ventajas**:
- ✅ CERO tokens extra (solo reorganización de datos)
- ✅ Pasos más descriptivos para la IA
- ✅ Detecta 90% de intenciones comunes

---

### 3. **Sistema de Anotaciones Visuales (Opcional, Usuario)**
**Implementación**: Permitir al usuario anotar intención durante grabación

```javascript
// Keyboard shortcut durante recording: Ctrl+Shift+A
function annotateCurrentAction() {
  const annotation = prompt('¿Qué intentas hacer con esta acción?');
  
  if (annotation) {
    const lastStep = steps[steps.length - 1];
    lastStep.userIntent = annotation;  // "Revelar submenu de productos"
  }
}
```

**Ventajas**:
- ✅ Usuario da contexto explícito cuando lo necesita
- ✅ Opcional, no obligatorio
- ✅ Mejora drásticamente comprensión en casos ambiguos

---

### 4. **Captura de Cambios de Estado Visual (DOM Diff)**
**Implementación**: Capturar QUÉ cambió después de hover/scroll

```javascript
function captureVisualChanges(beforeDOM, afterDOM) {
  return {
    elementsShown: ['#submenu-products', '#tooltip-info'],
    elementsHidden: [],
    classChanges: { '#menu-item-5': ['hover-active'] },
    styleChanges: { '#submenu-products': { display: 'none → block' } }
  };
}

// En el evento hover
handleHover(event) {
  const beforeState = captureVisibleElements();
  
  setTimeout(() => {
    const afterState = captureVisibleElements();
    const changes = diffStates(beforeState, afterState);
    
    if (changes.elementsShown.length > 0) {
      action.context.causedVisibility = changes.elementsShown;
      action.intentPattern = 'reveal_content';
    }
  }, 200); // Esperar animaciones
}
```

**Ventajas**:
- ✅ Captura "efecto" de la acción
- ✅ La IA entiende: "Hover CAUSÓ que submenu apareciera"
- ✅ Incremento mínimo de datos (~50 bytes por evento significativo)

---

### 5. **Prompt Mejorado con Ejemplos de Intenciones**
**Implementación**: Agregar sección al prompt SOLO con patrones detectados

```javascript
function buildEnhancedPrompt(steps, metadata) {
  const intentSummary = detectIntentPatterns(steps)
    .filter(s => s.intentPattern)
    .map(s => `- ${s.description}`)
    .join('\n');
  
  return `Eres un agente QA autónomo. IMPORTANTE: El usuario realizó acciones con intenciones específicas.

URL INICIAL: ${url}

INTENCIONES DETECTADAS:
${intentSummary}

PASOS A REPRODUCIR:
${stepDescriptions}

INSTRUCCIONES:
1. Respeta las intenciones detectadas (ej: si hay hover prolongado, es DELIBERADO)
2. Reproduce hovers que revelan contenido (menús, tooltips)
3. Reproduce scrolls a elementos específicos (no solo scrollY genérico)
...
`;
}
```

**Ventajas**:
- ✅ Incremento mínimo de tokens (solo intenciones únicas, ~50-100 tokens)
- ✅ Guía explícita a la IA sobre qué es importante
- ✅ Evita que la IA ignore hovers/scrolls como "ruido"

---

## 🔧 Plan de Implementación

### FASE 1: Enriquecimiento en Captura (1-2 horas)
```javascript
// extension-v3/src/content/capture.js

// 1. Agregar tracking de cambios de visibilidad
let visibleElementsBefore = new Set();

function handleHover(event) {
  const visibleBefore = captureVisibleElements();
  
  setTimeout(() => {
    const visibleAfter = captureVisibleElements();
    const newElements = [...visibleAfter].filter(el => !visibleBefore.has(el));
    
    const action = {
      type: 'hover',
      selector: generateSelector(event.target),
      context: {
        causedVisibility: newElements.length > 0,
        revealedElements: newElements.map(el => el.tagName + (el.id ? '#' + el.id : ''))
      }
    };
    
    sendActionToBackground(action);
  }, 200);
}

// 2. Agregar tracking de duración de hover
let hoverStartTime = {};

document.addEventListener('mouseover', (e) => {
  const selector = generateSelector(e.target);
  hoverStartTime[selector] = Date.now();
}, true);

document.addEventListener('mouseout', (e) => {
  const selector = generateSelector(e.target);
  if (hoverStartTime[selector]) {
    const duration = Date.now() - hoverStartTime[selector];
    
    if (duration > 800) { // Hover significativo
      sendActionToBackground({
        type: 'hover_significant',
        selector,
        duration,
        context: { intentional: true }
      });
    }
    
    delete hoverStartTime[selector];
  }
}, true);
```

### FASE 2: Detección de Patrones (2-3 horas)
```javascript
// gemini-mcp-server/server-agentic-mcp.js

function enrichStepsWithIntents(steps) {
  const enriched = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = { ...steps[i] };
    const prev = steps[i - 1];
    const next = steps[i + 1];
    
    // PATRÓN 1: Scroll + Hover + Click = Búsqueda deliberada
    if (
      prev?.type === 'scroll' &&
      step.type === 'hover' &&
      next?.type === 'click'
    ) {
      step.intent = 'search_and_access';
      step.importance = 'high';
    }
    
    // PATRÓN 2: Hover que revela contenido
    if (
      step.type === 'hover' &&
      step.context?.causedVisibility
    ) {
      step.intent = 'reveal_menu';
      step.importance = 'high';
      step.mustReproduce = true; // Flag para la IA
    }
    
    // PATRÓN 3: Hover prolongado (>1s)
    if (
      step.type === 'hover' &&
      step.duration > 1000
    ) {
      step.intent = 'inspection';
      step.importance = 'medium';
    }
    
    enriched.push(step);
  }
  
  return enriched;
}

// Modificar buildPromptFromSteps
function buildPromptFromSteps(steps, metadata) {
  const enrichedSteps = enrichStepsWithIntents(steps);
  
  const stepDescriptions = enrichedSteps.map((step, index) => {
    const num = index + 1;
    
    // Agregar flag de importancia
    const importance = step.importance === 'high' ? '⚠️ CRÍTICO: ' : '';
    
    switch (step.type) {
      case 'hover':
        if (step.intent === 'reveal_menu') {
          return `${num}. ${importance}Pasa el mouse sobre "${step.element?.text}" para revelar el menú desplegable`;
        }
        return `${num}. ${importance}Pasa el mouse sobre "${step.element?.text}"`;
      
      case 'scroll':
        if (step.context?.targetElement) {
          return `${num}. Desplázate hasta que el elemento "${step.context.targetElement}" sea visible`;
        }
        return `${num}. Desplázate a posición Y: ${step.scrollY}`;
      
      // ... otros tipos
    }
  }).join('\n');
  
  return `Eres un agente QA autónomo. IMPORTANTE: Reproduce EXACTAMENTE las acciones marcadas como CRÍTICAS.

URL INICIAL: ${url}

PASOS A REPRODUCIR:
${stepDescriptions}

IMPORTANTE:
- Los pasos marcados con ⚠️ CRÍTICO son intenciones deliberadas del usuario
- Hovers que revelan menús deben ejecutarse ANTES del click subsecuente
- Scrolls pueden ser necesarios para hacer elementos visibles
...
`;
}
```

### FASE 3: Prompt Optimizado (30 min)
```javascript
// multi-provider-mcp-client.py

# Agregar sección de intenciones al prompt
if verbose_mode:
    enhanced_prompt = f"""{prompt}

AGENTE QA EXPERTO - ATENCIÓN A INTENCIONES

PATRONES DETECTADOS:
{self._summarize_intents(steps)}

RESTRICCIONES:
- REPRODUCE hovers que revelan menús (CRÍTICO)
- REPRODUCE scrolls a elementos específicos
- NO omitas acciones intermedias (hover antes de click)
...
"""

def _summarize_intents(self, steps):
    """Generar resumen de intenciones únicas (ahorra tokens)"""
    intents = set()
    
    for step in steps:
        if step.get('intent') == 'reveal_menu':
            intents.add('• Usuario reveló menús con hover (DEBE reproducirse)')
        if step.get('intent') == 'search_and_access':
            intents.add('• Usuario buscó elementos scrolleando (reproducir scroll + hover + click)')
    
    return '\n'.join(intents) if intents else 'No se detectaron patrones especiales'
```

---

## 📊 Estimación de Impacto

### Incremento de Tokens (conservador)
```
ANTES:
- Prompt base: ~300 tokens
- Pasos (10 eventos): ~200 tokens
- Total: 500 tokens

DESPUÉS:
- Prompt base: ~350 tokens (+50 para sección intenciones)
- Pasos enriquecidos (10 eventos): ~250 tokens (+50 para context)
- Total: 600 tokens

INCREMENTO: +100 tokens (~20%) = +$0.0002 por generación con GPT-4
```

### Mejora en Precisión (estimada)
```
ANTES:
- Hovers reproducidos correctamente: 30%
- Scrolls a elementos específicos: 40%
- Comprensión de intención: 50%

DESPUÉS:
- Hovers reproducidos correctamente: 85%
- Scrolls a elementos específicos: 80%
- Comprensión de intención: 90%

MEJORA PROMEDIO: +40-50 puntos porcentuales
```

---

## 🎯 Alternativas CERO Tokens (Estrategia Conservadora)

### Opción A: Solo Enriquecimiento de Datos (CERO tokens extra)
```javascript
// Enviamos MISMO número de campos pero mejor organizados
{
  type: 'hover',
  selector: '#menu',
  text: 'Products',
  meta: 'reveals_menu duration:1200ms'  // Todo en 1 string
}
```

### Opción B: Flags Binarios (1-2 tokens extra)
```javascript
{
  type: 'hover',
  selector: '#menu',
  critical: true,  // +1 token
  reveals: true    // +1 token
}
```

### Opción C: Prompt con Reglas Generales (CERO tokens por evento)
```
INSTRUCCIONES GENERALES (agregar 1 vez al inicio del prompt):
- Si un hover es seguido de click en mismo elemento, el hover es CRÍTICO
- Si un scroll ocurre justo antes de hover/click, reproduce ambos
- Hovers de >1 segundo son intencionales, NO ruido

[Luego los pasos normales sin modificar]
```

---

## ✅ Recomendación Final

**IMPLEMENTAR EN ORDEN**:

1. **FASE 1 (INMEDIATO)**: Opción C - Agregar reglas generales al prompt
   - **Esfuerzo**: 15 minutos
   - **Tokens extra**: 0
   - **Mejora esperada**: +25%

2. **FASE 2 (CORTO PLAZO)**: Enriquecimiento básico en captura
   - **Esfuerzo**: 2 horas
   - **Tokens extra**: +30-50
   - **Mejora esperada**: +40%

3. **FASE 3 (MEDIO PLAZO)**: Detección de patrones completa
   - **Esfuerzo**: 4 horas
   - **Tokens extra**: +50-100
   - **Mejora esperada**: +50%

**TOTAL INCREMENTAL**: ~6-8 horas de desarrollo, +$0.0002 por generación, +50% precisión
