# 📋 Análisis del Estilo de Test Case Preferido

## 🔍 Análisis Detallado del Formato

### Estructura Identificada:

1. **Título**: "Test X - Título descriptivo del objetivo"
2. **Descripción**: Una línea clara explicando el propósito funcional del test
3. **Pasos numerados** con formato específico:
   - Acción clara y específica
   - **RE:** (Resultado Esperado) inmediatamente después

### 📝 Elementos Específicos del Estilo:

#### **Título:**
- Formato: "Test [número] - [Descripción funcional]"
- Enfoque en funcionalidad de negocio, no técnica
- Ejemplo: "Comprobación de cierre de caso automático"

#### **Descripción:**
- Una sola línea explicativa
- Contexto funcional específico
- Mención de reglas de negocio (ej: "cuando el campo TFIN se informa como S")

#### **Pasos:**
- Numeración secuencial simple (1, 2, 3, 4...)
- Acción específica y detallada
- **RE:** como marcador fijo para resultado esperado
- Lenguaje funcional orientado al usuario final

### 🎯 Características del Lenguaje:

1. **Terminología de negocio**: "portal Siniestros", "usuario tramitador", "caso de siniestros"
2. **Acciones específicas**: "Seleccionar del listado", "Realizar una llamada entrante"
3. **Validaciones concretas**: "estado cerrado", "fecha de cierre rellenada"
4. **Flujo orientado al usuario**: Simula comportamiento real del usuario

### 🔧 Diferencias con el formato actual:

| Aspecto | Formato Actual | Formato Deseado |
|---------|----------------|-----------------|
| Título | "Verificar carga de página" | "Test 1 - Comprobación de cierre de caso automático" |
| Descripción | Técnica/genérica | Funcional/específica con reglas de negocio |
| Pasos | "1. Navegar a URL" | "1. Acceder al portal Siniestros con usuario tramitador" |
| Resultados | "La página se carga..." | "RE: Se accede correctamente y se muestra la pantalla" |
| Enfoque | Técnico/UI | Funcional/Negocio |

## ⚙️ REQUERIMIENTOS PARA COPILOT

### 📌 **Estructura de Test Case Obligatoria:**

```text
Test [número]

Título: [Descripción funcional específica]

Descripción
[Una línea explicando el propósito funcional con contexto de negocio]

Pasos:
1. [Acción específica orientada al usuario]
   RE: [Resultado esperado concreto]

2. [Siguiente acción en la secuencia]
   RE: [Resultado esperado correspondiente]

[...continuar numeración...]
```

### 🎯 **Reglas de Redacción:**

#### **Para Títulos:**
- OBLIGATORIO: Iniciar con "Test [número]"
- Usar terminología de dominio de negocio
- Enfocar en el objetivo funcional, no en la implementación técnica
- Ejemplos:
  - ✅ "Test 1 - Validación de login con credenciales correctas"
  - ❌ "Verificar campos de formulario de login"

#### **Para Descripciones:**
- Una sola línea explicativa
- Incluir contexto específico de la regla de negocio
- Mencionar condiciones específicas o flujos de trabajo
- Ejemplos:
  - ✅ "Verificación del comportamiento del sistema cuando un usuario introduce credenciales válidas en el portal de empleados"
  - ❌ "Probar el formulario de login"

#### **Para Pasos:**
- Numeración simple y secuencial
- Usar **"RE:"** como marcador fijo para resultado esperado
- Acciones orientadas al usuario final, no técnicas
- Incluir contexto específico (usuarios, roles, datos)
- Ejemplos:
  - ✅ "1. Acceder al portal de empleados con usuario administrador y navegar a la sección de gestión de usuarios"
  - ❌ "1. Navegar a la URL del sistema"

#### **Para Resultados Esperados:**
- Usar siempre **"RE:"** como prefijo
- Describir el comportamiento esperado específico
- Incluir elementos visuales o de estado que deben verificarse
- Ejemplos:
  - ✅ "RE: Se muestra la pantalla principal del dashboard con el menú de opciones habilitado"
  - ❌ "RE: La página se carga correctamente"

### 🏢 **Adaptación al Dominio de Negocio:**

#### **Terminología Específica:**
- Usar nombres reales de aplicaciones/sistemas
- Incluir roles de usuario específicos
- Mencionar campos, estados y procesos de negocio
- Referenciar flujos de trabajo reales

#### **Contexto Funcional:**
- Simular escenarios reales de uso
- Incluir condiciones previas específicas
- Describir impactos en el negocio
- Validar reglas de negocio específicas

### 🔄 **Flujo de Generación Sugerido:**

1. **Identificar el objetivo funcional** del test
2. **Asignar número de test** secuencial
3. **Crear título** enfocado en funcionalidad de negocio
4. **Escribir descripción** con contexto específico
5. **Desglosar pasos** orientados al usuario
6. **Definir resultados esperados** concretos con "RE:"

### 📋 **Template Base:**

```text
Test [AUTO_INCREMENT]

Título: [OBJETIVO_FUNCIONAL_ESPECIFICO]

Descripción
[CONTEXTO_NEGOCIO_Y_REGLA_FUNCIONAL]

Pasos:
1. [ACCION_USUARIO_CON_CONTEXTO]
   RE: [RESULTADO_VISUAL_O_FUNCIONAL_ESPERADO]

2. [SIGUIENTE_ACCION_EN_FLUJO]
   RE: [VALIDACION_ESPECIFICA_CORRESPONDIENTE]

[...CONTINUAR_SECUENCIA_LOGICA...]
```

### ⚠️ **Restricciones:**

- NO usar terminología técnica en pasos de usuario
- NO describir implementación, solo comportamiento
- NO usar "verificar" sin contexto específico
- SÍ incluir datos, usuarios y contexto real
- SÍ orientar a flujos de trabajo reales
- SÍ usar terminología del dominio de negocio

## 🎯 Ejemplo de Transformación:

### ❌ Formato Actual:

```text
Verificar formulario de login
Descripción: Validar que el formulario funciona correctamente
1. Navegar a la página de login
   Resultado esperado: La página se carga
2. Introducir credenciales
   Resultado esperado: Los campos aceptan texto
```

### ✅ Formato Deseado:

```text
Test 1

Título: Validación de acceso al portal de empleados con credenciales correctas

Descripción
Verificación del comportamiento del sistema cuando un empleado activo introduce sus credenciales válidas en el portal corporativo

Pasos:
1. Acceder al portal de empleados desde la intranet corporativa con rol de empleado estándar
   RE: Se muestra la pantalla de login con los campos Usuario y Contraseña habilitados

2. Introducir credenciales de un empleado activo (usuario: emp001, contraseña válida)
   RE: Los campos aceptan la información y se muestra el botón "Iniciar Sesión" habilitado

3. Hacer clic en el botón "Iniciar Sesión"
   RE: Se accede correctamente al dashboard principal mostrando el menú de opciones del empleado
```