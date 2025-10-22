# 🚀 Native Messaging Host - Auto-Start Backend

Este componente permite que la extensión arranque automáticamente el backend Node.js sin intervención manual.

## 📋 ¿Qué es Native Messaging?

Native Messaging es una API de Chrome que permite a las extensiones comunicarse con aplicaciones nativas del sistema operativo. Usamos esto para ejecutar comandos de PowerShell/CMD para arrancar el backend.

## ⚡ Instalación Rápida (Windows)

### Paso 1: Instalar el Native Host

```powershell
cd extension-v3/native-host
.\install-host.bat
```

Esto registra el native messaging host en el registro de Windows.

### Paso 2: Obtener Extension ID

1. Abre Chrome
2. Ve a `chrome://extensions`
3. Activa "Modo de desarrollador" (esquina superior derecha)
4. Click en "Cargar extensión sin empaquetar"
5. Selecciona la carpeta `extension-v3`
6. **Copia el Extension ID** (ej: `abcdefghijklmnopqrstuvwxyz123456`)

### Paso 3: Configurar el Manifest

Edita `com.testbuilder.native_host.json`:

```json
{
  "name": "com.testbuilder.native_host",
  "description": "TestBuilder Native Messaging Host",
  "path": "C:\\WARE-LOA\\ITprojects\\Tests-Analytics\\PROYECTO-REFACTORIZADO\\extension-v3\\native-host\\testbuilder-host.js",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://TU_EXTENSION_ID_AQUI/"
  ]
}
```

**Importante:** Reemplaza `TU_EXTENSION_ID_AQUI` con el ID real de tu extensión.

### Paso 4: Verificar Instalación

Abre DevTools Console de la extensión:
1. Click derecho en el ícono de la extensión
2. "Inspeccionar popup"
3. Ve a Console
4. Deberías ver logs como:
   ```
   🚀 Intentando arrancar backend con native messaging...
   ✅ Backend arrancado via native host, PID: 12345
   ```

## 🔧 Arquitectura

```
Extension Popup
    ↓
autoStartBackend()
    ↓
chrome.runtime.sendNativeMessage('com.testbuilder.native_host', ...)
    ↓
testbuilder-host.js (Node.js)
    ↓
spawn('cmd', ['/c', 'npm', 'start'])
    ↓
Backend arranca en puerto 4000 ✅
```

## 📝 Comandos Disponibles

El native host soporta estos comandos:

### 1. start_backend

Arranca el backend en gemini-mcp-server:

```javascript
chrome.runtime.sendNativeMessage(
  'com.testbuilder.native_host',
  { command: 'start_backend' },
  (response) => {
    console.log(response); 
    // { success: true, message: 'Backend starting', pid: 12345 }
  }
);
```

### 2. check_backend

Verifica si el backend está corriendo:

```javascript
chrome.runtime.sendNativeMessage(
  'com.testbuilder.native_host',
  { command: 'check_backend' },
  (response) => {
    console.log(response); 
    // { success: true, online: true }
  }
);
```

## 🐛 Troubleshooting

### Error: "Specified native messaging host not found"

**Causa:** El manifest no está registrado correctamente.

**Solución:**
1. Verifica que ejecutaste `install-host.bat`
2. Verifica en el registro:
   ```powershell
   reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.testbuilder.native_host"
   ```
3. Debe mostrar la ruta al manifest

### Error: "Access to the specified native messaging host is forbidden"

**Causa:** El Extension ID no coincide con el configurado en el manifest.

**Solución:**
1. Verifica el Extension ID en `chrome://extensions`
2. Actualiza `allowed_origins` en `com.testbuilder.native_host.json`
3. **Importante:** No olvides la barra final `/`
   ```json
   "allowed_origins": ["chrome-extension://abc123/"]
   ```

### Error: "Native host has exited"

**Causa:** Node.js no está en PATH o testbuilder-host.js tiene errores.

**Solución:**
1. Verifica que Node.js está instalado: `node --version`
2. Verifica que la ruta en el manifest es correcta
3. Prueba ejecutar manualmente:
   ```powershell
   node testbuilder-host.js
   ```

### Backend no arranca

**Causa:** La ruta al backend es incorrecta o npm no está disponible.

**Solución:**
1. Verifica que `gemini-mcp-server/` existe
2. Verifica que tiene `package.json`
3. Ejecuta manualmente para verificar:
   ```powershell
   cd gemini-mcp-server
   npm start
   ```

## 🔒 Seguridad

**¿Es seguro?**

Sí. El native messaging host:
- ✅ Solo puede ser llamado por la extensión con el ID configurado
- ✅ No tiene acceso a internet (excepto localhost)
- ✅ Solo ejecuta comandos predefinidos (start_backend, check_backend)
- ✅ Corre con los mismos permisos que el usuario

**Limitaciones:**
- Solo funciona en el dispositivo donde está instalado
- Requiere Node.js instalado
- Requiere configuración manual inicial

## 🚀 Flujo con Auto-Start

### Sin Native Host (Fallback):

```
Usuario → Click "Generar Test"
    ↓
Backend offline
    ↓
Muestra diálogo
    ↓
Usuario debe iniciar manualmente
```

### Con Native Host (Automático):

```
Usuario → Click "Generar Test"
    ↓
Backend offline
    ↓
Native host arranca backend automáticamente
    ↓
Espera 15s máximo
    ↓
Backend listo → Genera test ✅
```

## 📚 Referencias

- [Chrome Native Messaging Docs](https://developer.chrome.com/docs/apps/nativeMessaging/)
- [Native Messaging Protocol](https://developer.chrome.com/docs/extensions/mv3/nativeMessaging/#native-messaging-host-protocol)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)

## 🆘 Soporte

Si tienes problemas:

1. Verifica logs en DevTools Console
2. Ejecuta `install-host.bat` como administrador
3. Verifica Extension ID coincide
4. Prueba arrancar backend manualmente primero

---

**¿Instalado?** ✅ Ahora el backend arrancará automáticamente cuando hagas click en "Generar Test".
