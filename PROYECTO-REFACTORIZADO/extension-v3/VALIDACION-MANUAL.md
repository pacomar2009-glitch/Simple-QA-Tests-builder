# Validación Manual Chrome Extension
**Fecha**: 2025-10-22  
**Issue**: US#92 + Persistencia Badge  
**Branch**: feat/extension-v3-clean  
**Commit**: 760447814

---

## 🔧 Preparación

### Cargar Extensión:
1. Abre Chrome (modo normal, no incognito)
2. Navega a: `chrome://extensions/`
3. Activa **Modo de desarrollador** (esquina superior derecha)
4. Clic en **Cargar extensión sin empaquetar**
5. Selecciona carpeta:
   ```
   c:\WARE-LOA\ITprojects\Tests-Analytics\PROYECTO-REFACTORIZADO\extension-v3
   ```

---

## ✅ TEST 1: Export JSON - US#92 Corregido

**Objetivo**: Validar que export funciona SIN errores JSZip

### Pasos:
1. Abre el popup de la extensión
2. Clic en **Start Recording**
3. Navega a `https://example.com`
4. Haz 2-3 clicks en la página
5. Vuelve al popup, clic en **Stop Recording**
6. Verifica: **Casos totales: 1**
7. Clic en botón verde **Download JSON**

### Validaciones:
- [ ] Se abre diálogo de descarga
- [ ] Archivo: `test-cases-export-YYYY-MM-DDTHH-MM-SS.json`
- [ ] Tamaño: > 500 bytes
- [ ] Contenido: JSON válido con estructura `{metadata, readme, cases}`
- [ ] NO aparece error: `Failed to resolve module specifier "jszip"`
- [ ] NO aparece error: `CSP violation`

### Contenido JSON Esperado:
```json
{
  "metadata": {
    "exportedAt": "2025-10-22T...",
    "totalCases": 1,
    "completedCases": 1,
    "version": "1.0.0-mvp",
    "format": "json"
  },
  "readme": "# Test Cases Export - MVP\n...",
  "cases": [
    {
      "id": "case-...",
      "number": 1,
      "name": "...",
      "steps": [...]
    }
  ]
}
```

---

## ✅ TEST 2: Persistencia Badge entre Pestañas

**Objetivo**: Validar que badge se mantiene al cambiar pestañas

### Pasos:
1. Abre popup, clic **Start Recording**
2. **Observa badge** en icono extensión (debe mostrar #1)
3. Navega a `https://example.com`
4. **Validar**: Badge sigue mostrando #1
5. Abre **nueva pestaña** (Ctrl+T)
6. **Validar**: Badge muestra #1 en nueva pestaña
7. Navega a `https://github.com` en nueva pestaña
8. **Validar**: Badge persiste con #1
9. Cambia entre pestañas (Ctrl+Tab)
10. **Validar**: Badge siempre muestra #1
11. Vuelve al popup, clic **Stop Recording**
12. **Validar**: Badge desaparece o cambia

### Validaciones:
- [ ] Badge muestra #1 al iniciar grabación
- [ ] Badge persiste al navegar en misma pestaña
- [ ] Badge persiste al abrir nueva pestaña
- [ ] Badge persiste al cambiar entre pestañas
- [ ] Badge se actualiza al detener grabación

---

## ✅ TEST 3: Badge con Múltiples Casos

**Objetivo**: Validar numeración correcta de badge

### Pasos:
1. **Start Recording** (caso #1)
2. **Validar**: Badge muestra #1
3. **Stop Recording**
4. **Start Recording** nuevo caso (caso #2)
5. **Validar**: Badge muestra #2
6. Navega entre pestañas
7. **Validar**: Badge siempre muestra #2

### Validaciones:
- [ ] Badge muestra número de caso correcto
- [ ] Badge se actualiza al cambiar de caso
- [ ] Badge persiste con número correcto entre pestañas

---

## ✅ TEST 4: Consola de Errores

**Objetivo**: Verificar que NO hay errores JavaScript

### Pasos:
1. Abre **DevTools** (F12)
2. Ve a pestaña **Console**
3. Realiza TEST 1, 2 y 3
4. **Validar**: NO aparecen errores rojos

### Errores a verificar NO existan:
- [ ] NO `Failed to resolve module specifier "jszip"`
- [ ] NO `CSP violation`
- [ ] NO `Uncaught TypeError`
- [ ] NO `chrome.downloads error`

### Background Service Worker:
1. Ve a `chrome://extensions/`
2. Busca extensión, clic en **service worker**
3. Se abre DevTools del background
4. **Validar**: Console sin errores rojos

---

## 📊 Checklist Final

### Export JSON (US#92):
- [ ] Descarga funciona
- [ ] Archivo .json válido
- [ ] Sin errores JSZip
- [ ] Sin errores CSP

### Persistencia Badge:
- [ ] Badge visible al grabar
- [ ] Persiste entre pestañas
- [ ] Muestra número correcto
- [ ] Se actualiza correctamente

### Estabilidad:
- [ ] Sin errores en console
- [ ] Sin errores en background service worker
- [ ] Extension carga correctamente

---

## 🐛 Reporte de Problemas

Si encuentras errores, documenta:

1. **Descripción del error**
2. **Pasos para reproducir**
3. **Mensaje de error exacto** (screenshot o copy/paste)
4. **Pestaña donde ocurre** (popup, content, background)
5. **Browser console logs**

---

## ✅ Resultado Esperado

**ÉXITO si**:
- ✅ Export JSON descarga correctamente
- ✅ JSON tiene estructura válida
- ✅ Badge persiste entre navegación
- ✅ Sin errores de JSZip o CSP
- ✅ Console limpia de errores

**FALLA si**:
- ❌ Error "Failed to resolve module specifier"
- ❌ Error "CSP violation"
- ❌ Badge desaparece al cambiar pestaña
- ❌ Export no descarga archivo
- ❌ Cualquier error rojo en console

---

## 📝 Próximos Pasos

**Si validación EXITOSA**:
1. Comentar en issue #92 con resultados
2. Cerrar US#92 MVP como completado
3. Continuar con siguiente US

**Si validación FALLIDA**:
1. Documentar errores específicos
2. Crear fix urgente
3. Re-validar

---

**Validador**: [Tu nombre]  
**Fecha validación**: ___________  
**Resultado**: [ ] ÉXITO  [ ] FALLA  
**Notas**: _________________________________
