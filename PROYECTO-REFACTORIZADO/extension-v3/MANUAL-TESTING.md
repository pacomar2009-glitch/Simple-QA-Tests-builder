# 🧪 Manual de Pruebas - Extension v3.0

## Fecha: 22 de Octubre, 2025
## Versión: 3.0.0
## Branch: feat/extension-v3-clean

---

## 📋 Checklist de Pruebas

### ✅ Pre-requisitos
- [ ] Extension cargada en Chrome (chrome://extensions/)
- [ ] Modo Desarrollador activado
- [ ] Service Worker activo (verificar en chrome://extensions/)
- [ ] Abrir test-page.html en navegador

---

## 🎯 Pruebas de Captura de Eventos

### 1. ✅ Click Simple
**Objetivo**: Verificar que se capturan clicks normales

**Pasos**:
1. Abrir popup extensión
2. Click "Iniciar Grabación"
3. Click en botón "Click Simple" en test-page.html
4. Verificar badge incrementa: #1
5. Abrir DevTools Console y buscar: `✅ Acción enviada: click`

**Resultado Esperado**:
- Log en console: `📝 Acción capturada (RAW - sin IA): click`
- Badge muestra: `#1`

---

### 2. ✅ Doble Click
**Objetivo**: Verificar que se capturan dobles clicks

**Pasos**:
1. Doble click en botón "Doble Click"
2. Verificar log en console

**Resultado Esperado**:
- Log en console: `✅ Acción enviada: dblclick`

---

### 3. ✅ Click Derecho (Context Menu)
**Objetivo**: Verificar que se captura el menú contextual

**Pasos**:
1. Click derecho en botón "Click Derecho"
2. Verificar log en console

**Resultado Esperado**:
- Log en console: `✅ Acción enviada: contextmenu`

---

### 4. ⌨️ Input Events
**Objetivo**: Verificar que se capturan cambios en inputs

**Pasos**:
1. Escribir en campo "Username": `testuser`
2. Escribir en campo "Password": `pass123`
3. Escribir en campo "Email": `test@example.com`
4. Verificar logs en console

**Resultado Esperado**:
- Múltiples logs: `✅ Acción enviada: input`
- Cada letra genera evento input

---

### 5. 📝 Change Events
**Objetivo**: Verificar eventos de cambio en selects

**Pasos**:
1. Abrir dropdown "Selecciona un país"
2. Seleccionar "España"
3. Verificar log en console

**Resultado Esperado**:
- Log en console: `✅ Acción enviada: change`

---

### 6. 🎯 Focus y Blur
**Objetivo**: Verificar que se capturan focus/blur

**Pasos**:
1. Click en "Focus campo 1"
2. Verificar log: `✅ Acción enviada: focus`
3. Click fuera del campo (blur)
4. Verificar log: `✅ Acción enviada: blur`

**Resultado Esperado**:
- 2 eventos capturados: focus y blur

---

### 7. 📜 Scroll
**Objetivo**: Verificar que se captura scroll con debounce (500ms)

**Pasos**:
1. Hacer scroll rápido en la caja de scroll
2. Esperar 500ms
3. Verificar log en console

**Resultado Esperado**:
- Log en console: `✅ Acción enviada: scroll`
- Solo 1 evento después de detenerse (debounced)

---

### 8. 🎯 Hover (Mouseover)
**Objetivo**: Verificar que se captura hover con throttle (1000ms)

**Pasos**:
1. Pasar mouse sobre botón "Hover sobre mí"
2. Esperar 1 segundo
3. Verificar log en console

**Resultado Esperado**:
- Log en console: `✅ Acción enviada: hover`
- Throttled: máximo 1 evento por segundo

---

### 9. 🖱️ Drag & Drop
**Objetivo**: Verificar que se capturan eventos de arrastrar

**Pasos**:
1. Arrastrar elemento azul "Arrastra este elemento"
2. Verificar log: `✅ Acción enviada: dragstart`
3. Soltar en zona amarilla "Suelta aquí"
4. Verificar log: `✅ Acción enviada: drop`

**Resultado Esperado**:
- 2 eventos: dragstart y drop

---

### 10. ⌨️ Keyboard Events
**Objetivo**: Verificar que se capturan teclas importantes

**Pasos**:
1. Click en campo "Presiona Enter, Tab o Escape"
2. Presionar Enter
3. Verificar log: `✅ Acción enviada: keydown`
4. Presionar Tab
5. Presionar Escape

**Resultado Esperado**:
- 3 eventos keydown capturados

---

### 11. 📦 Submit
**Objetivo**: Verificar que se captura submit de formulario

**Pasos**:
1. Llenar campos del formulario
2. Click en botón "Submit"
3. Verificar log en console

**Resultado Esperado**:
- Log en console: `✅ Acción enviada: submit` (si hay form)
- O: `✅ Acción enviada: click` (si es botón simple)

---

## 🔄 Pruebas de Flujo Completo

### ✅ Test E2E: Captura Completa
**Objetivo**: Verificar flujo completo de captura

**Pasos**:
1. Abrir popup → "Iniciar Grabación"
2. Realizar secuencia:
   - Click simple
   - Escribir en input
   - Cambiar select
   - Scroll
   - Hover
   - Drag & Drop
3. Click "Detener Grabación"
4. Verificar badge: #1
5. Click "Exportar JSON"
6. Revisar archivo descargado

**Resultado Esperado**:
- JSON contiene:
  - `metadata.totalCases: 1`
  - `cases[0].steps: [...]` con todos los eventos
  - `cases[0].status: "completed"`

---

### ✅ Test: Múltiples Casos
**Objetivo**: Verificar captura de múltiples casos

**Pasos**:
1. Iniciar grabación → Caso #1 → 3 clicks → Detener
2. Iniciar grabación → Caso #2 → 2 inputs → Detener
3. Iniciar grabación → Caso #3 → 1 scroll → Detener
4. Exportar JSON

**Resultado Esperado**:
- JSON contiene:
  - `metadata.totalCases: 3`
  - Caso #1 con 3 steps
  - Caso #2 con 2 steps
  - Caso #3 con 1 step

---

### ✅ Test: Clear/Reset
**Objetivo**: Verificar botón limpiar casos

**Pasos**:
1. Crear 2 casos con eventos
2. Click "🗑️ Limpiar Casos"
3. Confirmar en diálogo
4. Verificar badge desaparece
5. Exportar JSON

**Resultado Esperado**:
- Badge vacío
- JSON: `metadata.totalCases: 0`
- Próxima grabación será Caso #1 nuevamente

---

## 🐛 Pruebas de Errores y Edge Cases

### ⚠️ Test: Navegación entre páginas
**Objetivo**: Verificar que content script sobrevive navegación

**Pasos**:
1. Iniciar grabación en test-page.html
2. Capturar 2 clicks
3. Navegar a otra URL (ej: google.com)
4. Capturar 1 click más
5. Detener grabación

**Resultado Esperado**:
- 3 steps capturados en total
- URLs diferentes en cada step

---

### ⚠️ Test: Doble inyección del content script
**Objetivo**: Verificar que no se duplica el content script

**Pasos**:
1. Iniciar grabación
2. Recargar página (F5)
3. Verificar console NO muestra: `⚠️ Content Script ya cargado`
4. Capturar eventos normalmente

**Resultado Esperado**:
- No errores de duplicación
- Eventos capturados correctamente

---

### ⚠️ Test: Quota Exceeded Prevention
**Objetivo**: Verificar que no se excede cuota de storage

**Pasos**:
1. Crear 10 casos con 50 eventos cada uno
2. Verificar NO aparece error: `Resource::kQuotaBytes quota exceeded`
3. Verificar storage solo guarda últimos 5 casos

**Resultado Esperado**:
- Sin errores de cuota
- Storage comprimido: solo últimos 5 casos

---

## 📊 Métricas de Éxito

### ✅ Eventos Capturados (Total: 13 tipos)
- [x] click
- [x] dblclick
- [x] contextmenu
- [x] input
- [x] change
- [x] submit
- [x] keydown
- [x] scroll (debounced 500ms)
- [x] hover/mouseover (throttled 1000ms)
- [x] focus
- [x] blur
- [x] dragstart
- [x] drop

### ✅ Performance
- **Eventos por acción**: 1-3 (NO 90+ como antes)
- **Debugger**: DISABLED (no más 170+ eventos)
- **Storage**: Comprimido (últimos 5 casos)
- **Quota exceeded**: SOLVED ✅

### ✅ Funcionalidades
- [x] Iniciar/Detener grabación
- [x] Badge con número de caso
- [x] Export JSON
- [x] Clear/Reset casos
- [x] Config API key manual
- [x] Captura RAW (sin IA)

---

## 🚀 Próximos Pasos (Después de Pruebas)

1. **E2E con Backend** (pendiente):
   - Iniciar backend: `cd gemini-mcp-server && npm start`
   - POST session JSON a: `http://localhost:4000/test-generation/start`
   - Verificar Single-Pass AI processing
   - Validar test Playwright generado

2. **Medir Savings Reales**:
   - Capturar sesión de 10 eventos
   - Contar API calls: debe ser 1 (no 11)
   - Medir latencia: <20s (no 90s)
   - Documentar ahorros

3. **Cerrar Issue #123**:
   - Commit final con métricas
   - Actualizar README
   - Cerrar issue con resumen

---

## 📝 Notas

- **DevTools Console**: Fundamental para debug
- **Badge**: Indica número de caso actual (#1, #2, etc.)
- **REC Indicator**: Dot rojo en esquina superior derecha
- **US#124**: Extensión solo captura, NO procesa con IA
- **US#125**: Backend procesa con Single-Pass AI

---

## ✅ Resultados de Tests Automatizados

```bash
Test Suites: 9 passed, 9 total
Tests:       194 passed, 194 total
Time:        7.237 s
```

**Tests incluyen**:
- AdaptiveTokenManager (27 tests)
- CasesQueueManager (27 tests)
- CasesQueue Integration (21 tests)
- GeminiClient (18 tests)
- Popup (11 tests)
- Export Utils
- Service Worker
- Capture

---

## 🎯 Criterios de Aprobación

- [x] 194 tests automatizados pasan ✅
- [ ] 13 tipos de eventos capturados manualmente
- [ ] No errores de quota exceeded
- [ ] No errores de runtime en console
- [ ] Export JSON funciona correctamente
- [ ] Clear/Reset funciona
- [ ] API key configurable manualmente

---

**Testeador**: _________________
**Fecha**: 22/10/2025
**Versión**: 3.0.0
**Resultado**: ⏳ PENDIENTE
