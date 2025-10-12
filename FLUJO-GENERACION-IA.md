#  Flujo de Entradas y Salidas - Generación IA

##  COMPROBACIÓN INSTRUCCIONES COPILOT
**Este archivo MD ha sido verificado y contiene contenido válido.**

##  Arquitectura del Sistema de Generación

`
            
    POPUP.JS        BACKGROUND.JS    GEMINI API        RESPUESTA     
   (Frontend)           (Service Worker)     (IA Generativa)       (Test Code)    
            
`

##  FASE 1: INICIACIÓN DEL FLUJO (Popup.js)

###  **Entrada desde Usuario:**
El usuario hace clic en uno de estos botones:
1. " Generate with AI" 
2. " Export Playwright"
3. " Export Manual CSV"

###  **Procesamiento en Popup:**
- Valida que hay acciones grabadas
- Envía mensaje al background script
- Especifica el tipo de export (playwright/manual)

###  **Salida hacia Background:**
Mensaje JSON con action='generateTest', exportType, actions y customInstructions

##  FASE 2: PROCESAMIENTO (Background.js)

###  Entrada desde Popup:
- Recibe request con action='generateTest'
- Valida que hay acciones para procesar
- Recupera configuración de IA y API key

###  Procesamiento de Configuración:
- Configura endpoint Gemini: gemini-2.5-flash:generateContent
- Construye prompt MCP específico según exportType
- Aplica sistema de gestión avanzada de tokens

###  Construcción del Prompt MCP:
- Incluye requerimientos obligatorios de MCP
- Agrega acciones capturadas con timestamps
- Determina formato según exportType (CSV vs Playwright)

###  Salida hacia Gemini API:
- JSON con contents, parts y generationConfig
- maxOutputTokens: 4096, temperature: 0.7

---

##  FASE 3: PROCESAMIENTO IA (Gemini API)

###  Entrada desde Background:
- URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
- Headers: Content-Type y x-goog-api-key
- Body: Prompt MCP + Configuración de tokens

###  Procesamiento por Gemini:
1. Análisis del prompt MCP
2. Interpretación de acciones grabadas
3. Selección de formato (CSV vs Playwright)
4. Generación de código según especificaciones
5. Aplicación de buenas prácticas

###  Salida desde Gemini:
- JSON con candidates array
- content.parts[0].text contiene el código generado
- finishReason: "STOP" o "MAX_TOKENS"

---

##  FASE 4: RETORNO AL BACKGROUND (Background.js)

###  Entrada desde Gemini:
- Response JSON con candidates
- Extracción del texto generado
- Validación de formato y contenido

###  Procesamiento de Respuesta:
- Aplicar logging con BackgroundLogger
- Validar que response.candidates existe
- Extraer código del test de parts[0].text

###  Salida hacia Popup:
- success: true/false
- test: código generado
- metadata: tokensUsed, fragmentsUsed, exportType

---

##  FASE 5: FINALIZACIÓN (Popup.js)

###  Entrada desde Background:
- Response con success y test content
- Metadatos de optimización si disponibles

###  Procesamiento de Respuesta:
- Mostrar resultado en textarea del UI
- Disparar descarga automática del archivo
- Actualizar notificaciones al usuario

###  Salida al Usuario:
1. Notificación visual de éxito/error
2. Código de test mostrado en textarea
3. Descarga automática del archivo (.ts o .csv)
4. Métricas de optimización si disponibles

---

##  FORMATOS DE DATOS POR FASE

### Formato 1: Acciones Grabadas (AppState)
`javascript
{
  type: "click|type|navigation",
  selector: ".css-selector",
  value: "input value",
  timestamp: 1697000000000,
  elementInfo: { tagName, className, textContent }
}
`

### Formato 2: Request Message (Popup  Background)
`javascript
{
  action: "generateTest",
  exportType: "playwright|manual",
  actions: [...recordedActions],
  customInstructions: "string"
}
`

### Formato 3: Response Final (Background  Popup)
`javascript
{
  success: true,
  test: "CÓDIGO_GENERADO",
  metadata: { tokensUsed, fragmentsUsed, exportType }
}
`

---

##  PUNTOS DE CONTROL Y LOGS

### Logging en cada fase:
- POPUP: console.log con [POPUP] prefix
- BACKGROUND: BackgroundLogger.log con componentes
- GEMINI API: BackgroundLogger success/error tracking
- RESPONSE: UI.showNotification para usuario

### Validaciones en cada nodo:
1. Popup: Validar acciones grabadas > 0
2. Background: Validar API key configurada
3. Gemini: Validar response.candidates existe
4. Return: Validar contenido del test generado

---

##  RESUMEN EJECUTIVO

### Flujo Principal:
USUARIO  POPUP.JS  BACKGROUND.JS  GEMINI API  POPUP.JS  USUARIO

### Puntos Clave:
- Entrada: Click determina exportType (playwright/manual)
- Procesamiento: Background construye prompt MCP específico
- IA: Gemini procesa según especificaciones MCP
- Salida: Código listo para usar se presenta al usuario

### Diferencias por Export Type:
| Export Type | Formato Output | Archivo |
|-------------|---------------|---------|
| playwright  | TypeScript    | .spec.ts |
| manual      | CSV           | .csv     |

