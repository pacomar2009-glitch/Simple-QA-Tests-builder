# 🚀 TestBuilder Agéntico v3 - Extension

Extensión Chrome con arquitectura agéntica implementando HU del MVP.

## 📋 User Stories Implementadas

### ✅ **US#120** - Extensión Base + MCP Chrome DevTools (COMPLETADO)
- **Archivos**: `manifest.json`, `src/background/service-worker.js`, `devtools.html`
- **Features**:
  - ✅ Chrome Debugger API integrado
  - ✅ Captura de eventos Network, Page, DOM
  - ✅ Service Worker con gestión de estado
  - ✅ Badge visual "REC" durante grabación
  - ✅ Storage de sesiones completadas

### ✅ **US#55** - Captura DOM Exhaustiva (COMPLETADO)
- **Archivos**: `src/content/capture.js`
- **Features**:
  - ✅ Captura de clicks, inputs, changes, submit, keydown
  - ✅ Generación de selectores CSS (id, name, data-testid, clase, XPath)
  - ✅ Atributos del elemento capturados
  - ✅ Anonimización de passwords (no captura valores)
  - ✅ Indicador visual "🔴 REC" en página

### ✅ **US#56** - Ranking de Selectores (COMPLETADO)
- **Implementación**: `src/content/capture.js` → `generateSelector()`
- **Priorización**:
  1. **ID** (#id) - Más específico
  2. **Name** ([name="..."])
  3. **Data-testid** ([data-testid="..."]) - Testing best practice
  4. **Clase única** (tag.class)
  5. **XPath** - Fallback

### ✅ **US#121** - IA Ligera Gemini Flash (COMPLETADO)
- **Status**: ✅ Implementado
- **Archivos**: 
  - `src/ai-ligera/gemini-client.js` - Cliente Gemini API
  - `config.html` + `config.js` - Configuración API key
- **Features**:
  - ✅ Pre-análisis con Gemini Flash 8B (<1s)
  - ✅ Pre-ranking de selectores (top 3)
  - ✅ Detección de flujo de ventanas (_blank)
  - ✅ Clasificación de intenciones (form, navigation, auth, search, etc.)
  - ✅ Cache de análisis (evita duplicados)
  - ✅ Fallback sin API key (100% funcional)
  - ✅ Max 300 tokens por análisis
  - ✅ **Notificaciones explícitas** cuando está en modo fallback:
    - Badge "FB" (naranja) vs "REC" (rojo)
    - Notificación Chrome al iniciar grabación
    - Mensaje en popup durante grabación

### 🔄 **US#57** - Cola de Casos UI (PRÓXIMO)
- **Status**: Pendiente
- **Features**: Múltiples casos, últimos 3 visibles, contador total

## 🧪 Instalación Local

```bash
# 1. Instalar dependencias (opcional, no requerido para extensión)
npm install

# 2. Cargar en Chrome
# - Abrir chrome://extensions/
# - Activar "Modo de desarrollador"
# - Click "Cargar extensión sin empaquetar"
# - Seleccionar carpeta: extension-v3/

# 3. (US#121) Configurar Gemini API Key (opcional)
# - Click en icono de extensión → "Configurar API Key"
# - Obtener API key gratis: https://aistudio.google.com/apikey
# - Ingresar API key y guardar
# - Sin API key: La extensión usa fallback (análisis básico sin IA)

# 4. Probar funcionalidad
# - Abrir cualquier página web
# - Click en icono de extensión en toolbar
# - Click "🔴 Grabar"
# - Interactuar con la página (clicks, inputs, etc.)
# - Click "⏹️ Detener"
# - Ver consola del Service Worker (chrome://extensions/ → "Inspeccionar vistas: Service Worker")
# - Verificar eventos con aiPreAnalysis (US#121)
```

## 📂 Estructura

```
extension-v3/
├── manifest.json                    # Manifest v3 con permisos debugger
├── popup.html                        # UI principal
├── popup.js                          # Controlador popup
├── config.html                       # US#121: Config Gemini API
├── config.js                         # US#121: Script config
├── devtools.html                     # DevTools page (MCP)
├── icon.png                          # Icono
├── src/
│   ├── background/
│   │   └── service-worker.js         # US#120 + US#121: MCP + Gemini
│   ├── content/
│   │   └── capture.js                # US#55 + US#56: Captura eventos
│   ├── ai-ligera/                    # US#121: IA Ligera
│   │   └── gemini-client.js          # Cliente Gemini Flash 8B
│   ├── ai-ligera/                    # US#121: (próximo)
│   └── shared/                       # Código compartido
└── tests/                            # Tests unitarios (TDD)
```

## 🎯 Próximos Pasos

1. **US#121** - IA Ligera Gemini Flash (<1s)
   - Integrar `@google/generative-ai`
   - Pre-análisis en tiempo real
   - Clasificación semántica

2. **US#57** - Cola de Casos UI
   - Modal "Agregar Nuevo Caso"
   - Últimos 3 casos visibles
   - Contador total

3. **Conexión Backend**
   - Enviar sesiones a `gemini-mcp-server/`
   - US#122: Loop agéntico (reproduce + valida + genera)

## 🐛 Debug

### Ver logs del Service Worker
```
chrome://extensions/ → TestBuilder → "Inspeccionar vistas: Service Worker"
```

### Ver logs del Content Script
```
F12 en página web → Console
```

### Ver eventos capturados
```javascript
// En Service Worker console:
chrome.storage.local.get(null, console.log)
```

## ✅ Testing US#120

1. **Grabar sesión**:
   - Abrir https://www.example.com
   - Click icono extensión → "🔴 Grabar"
   - Ver badge "REC" en icono
   - Ver indicador "🔴 REC" en página
   - Click en elementos de la página
   - Llenar inputs
   - Click "⏹️ Detener"

2. **Verificar captura**:
   - Abrir Service Worker console
   - Ver logs: "📝 Acción capturada: click"
   - Ver en storage: `chrome.storage.local.get(null, console.log)`

3. **Verificar MCP Chrome DevTools**:
   - Ver logs: "🔗 Adjuntando Chrome Debugger"
   - Ver logs: "📡 Debugger Event: Network.requestWillBeSent"

## 📝 Commit Guidelines

```bash
# Formato de commits:
feat(US#XXX): Descripción corta

- ✅ Feature 1
- ✅ Feature 2
- 🔄 Pendiente: Feature 3
```

## 🔗 Referencias

- **Issues GitHub**: https://github.com/pacomar2009-glitch/Simple-QA-Tests-builder
- **US#120**: https://github.com/pacomar2009-glitch/Simple-QA-Tests-builder/issues/120
- **US#55**: https://github.com/pacomar2009-glitch/Simple-QA-Tests-builder/issues/55
- **US#56**: https://github.com/pacomar2009-glitch/Simple-QA-Tests-builder/issues/56

---

**Versión**: 3.0.0  
**Fecha**: 22 Oct 2025  
**Estado**: ✅ US#120, US#55, US#56 COMPLETADOS | 🔄 US#121 PRÓXIMO
