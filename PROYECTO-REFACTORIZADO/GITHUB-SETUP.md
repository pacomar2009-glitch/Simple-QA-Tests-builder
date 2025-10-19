# GitHub Project Setup Script

Este documento contiene los comandos y estructura para configurar el proyecto Tests Analytics en GitHub con todas las releases, épicas e issues.

## 🎯 Configuración de Milestones (Releases)

```json
{
  "milestones": [
    {
      "title": "R0: Fundamentos técnicos y arquitectura base",
      "description": "Infraestructura base, CI/CD, backend, seguridad inicial.",
      "due_on": "2025-11-16T00:00:00Z",
      "state": "open"
    },
    {
      "title": "R1: MVP local Dev (Recorder + Test Generator)",
      "description": "Flujo completo local: grabar → generar test → ejecutar visible.",
      "due_on": "2025-12-14T00:00:00Z",
      "state": "open"
    },
    {
      "title": "R2: Web Hobby App (Cloudless + IA ligera)",
      "description": "Versión PWA accesible, tematizable y sin instalación.",
      "due_on": "2026-01-25T00:00:00Z",
      "state": "open"
    },
    {
      "title": "R3: Framework modular + Traducción multi-motor",
      "description": "Framework QA profesional + exportación a Cypress/Selenium.",
      "due_on": "2026-03-07T00:00:00Z",
      "state": "open"
    },
    {
      "title": "R4: IA avanzada + Accesibilidad total",
      "description": "IA semántica y refactorización automática de tests.",
      "due_on": "2026-04-18T00:00:00Z",
      "state": "open"
    },
    {
      "title": "R5: Cloud Business (SaaS colaborativo)",
      "description": "Multiusuario, roles, pagos y CI/CD.",
      "due_on": "2026-06-13T00:00:00Z",
      "state": "open"
    },
    {
      "title": "R6: Enterprise: Integraciones, Monitorización y Auditoría",
      "description": "Integraciones corporativas, SSO, observabilidad y compliance.",
      "due_on": "2026-08-22T00:00:00Z",
      "state": "open"
    },
    {
      "title": "R7: Marketplace + Academia + Consultoría",
      "description": "Ecosistema completo de negocio y comunidad QA global.",
      "due_on": "2026-10-17T00:00:00Z",
      "state": "open"
    }
  ]
}
```

## 🏷️ Labels del Proyecto

```json
{
  "labels": [
    {"name": "epic", "color": "6f42c1", "description": "Epic - Large feature or initiative"},
    {"name": "backend", "color": "0052cc", "description": "Backend development"},
    {"name": "frontend", "color": "1d76db", "description": "Frontend development"},
    {"name": "devops", "color": "0e8a16", "description": "DevOps and infrastructure"},
    {"name": "security", "color": "d93f0b", "description": "Security related"},
    {"name": "ai", "color": "f9d0c4", "description": "AI and machine learning"},
    {"name": "testing", "color": "c2e0c6", "description": "Testing and QA"},
    {"name": "documentation", "color": "0075ca", "description": "Documentation"},
    {"name": "bug", "color": "d73a49", "description": "Bug report"},
    {"name": "enhancement", "color": "a2eeef", "description": "New feature or request"},
    {"name": "priority-high", "color": "b60205", "description": "High priority"},
    {"name": "priority-medium", "color": "fbca04", "description": "Medium priority"},
    {"name": "priority-low", "color": "0e8a16", "description": "Low priority"}
  ]
}
```

## 📋 Issues para Épicas

### EP0-ARCH: Arquitectura backend, base de datos y servicios

```json
{
  "title": "EP0-ARCH: Arquitectura backend, base de datos y servicios",
  "body": "## 📝 Descripción\nDefinir arquitectura modular (Node + PostgreSQL + Prisma + API REST/GraphQL). Configurar entornos dev/staging/prod, roles, seguridad inicial y estructura de datos.\n\n## 🎯 Objetivos\n- [ ] Diseñar arquitectura backend modular\n- [ ] Configurar PostgreSQL + Prisma ORM\n- [ ] Implementar API REST/GraphQL\n- [ ] Configurar entornos (dev/staging/prod)\n- [ ] Definir estructura de datos inicial\n- [ ] Configurar Docker containers\n\n## 📋 Tareas (User Stories)\n1. **Como desarrollador, quiero una arquitectura backend escalable**\n2. **Como administrador, quiero entornos separados para desarrollo y producción**\n3. **Como desarrollador, quiero APIs bien documentadas y tipadas**\n\n## ⏱️ Timeline\nSemanas 1-4\n\n## 🔗 Release\nR0 - Fundamentos técnicos y arquitectura base",
  "labels": ["epic", "backend", "devops", "priority-high"],
  "milestone": "R0: Fundamentos técnicos y arquitectura base"
}
```

### EP0-SEC: Seguridad y autenticación

```json
{
  "title": "EP0-SEC: Seguridad y autenticación",
  "body": "## 📝 Descripción\nImplementar OAuth2, JWT, roles iniciales y buenas prácticas (hashing, CSRF, CORS).\n\n## 🎯 Objetivos\n- [ ] Implementar OAuth2 authentication\n- [ ] Configurar JWT tokens\n- [ ] Definir sistema de roles inicial\n- [ ] Implementar buenas prácticas de seguridad\n- [ ] Configurar CORS y CSRF protection\n- [ ] Hashing de passwords\n\n## 📋 Tareas (User Stories)\n1. **Como usuario, quiero autenticarme de forma segura**\n2. **Como administrador, quiero gestionar roles y permisos**\n3. **Como desarrollador, quiero APIs protegidas contra ataques comunes**\n\n## ⏱️ Timeline\nSemanas 1-4\n\n## 🔗 Release\nR0 - Fundamentos técnicos y arquitectura base",
  "labels": ["epic", "security", "backend", "priority-high"],
  "milestone": "R0: Fundamentos técnicos y arquitectura base"
}
```

### EP1-REC: Extensión Chrome Recorder

```json
{
  "title": "EP1-REC: Extensión Chrome Recorder",
  "body": "## 📝 Descripción\nCaptura DOM events, metadatos y control visual (grabar, pausar, detener). Envío a API local (Webhook / n8n).\n\n## 🎯 Objetivos\n- [ ] Mejorar captura de DOM events\n- [ ] Implementar controles visuales (grabar/pausar/detener)\n- [ ] Capturar metadatos de interacciones\n- [ ] Integrar envío a API local\n- [ ] Optimizar performance de grabación\n- [ ] Testing en diferentes tipos de páginas web\n\n## 📋 Tareas (User Stories)\n1. **Como tester, quiero grabar mis interacciones web fácilmente**\n2. **Como usuario, quiero controlar la grabación visualmente**\n3. **Como desarrollador, quiero que los datos se envíen automáticamente**\n\n## ⏱️ Timeline\nSemanas 5-8\n\n## 🔗 Release\nR1 - MVP local Dev",
  "labels": ["epic", "frontend", "testing", "priority-high"],
  "milestone": "R1: MVP local Dev (Recorder + Test Generator)"
}
```

### EP1-GEN: Generador de tests Playwright

```json
{
  "title": "EP1-GEN: Generador de tests Playwright",
  "body": "## 📝 Descripción\nConversión JSON → .spec.ts + framework básico, incluyendo fixtures y config TS.\n\n## 🎯 Objetivos\n- [ ] Desarrollar parser JSON → Playwright TypeScript\n- [ ] Generar fixtures reutilizables\n- [ ] Crear configuración TypeScript automática\n- [ ] Implementar Page Object Model básico\n- [ ] Optimizar tests generados\n- [ ] Validar sintaxis y ejecutabilidad\n\n## 📋 Tareas (User Stories)\n1. **Como tester, quiero convertir grabaciones en tests ejecutables**\n2. **Como desarrollador, quiero tests con buenas prácticas**\n3. **Como QA, quiero tests mantenibles y escalables**\n\n## ⏱️ Timeline\nSemanas 5-8\n\n## 🔗 Release\nR1 - MVP local Dev",
  "labels": ["epic", "backend", "testing", "priority-high"],
  "milestone": "R1: MVP local Dev (Recorder + Test Generator)"
}
```

## 🚀 Comandos de Configuración

### Usar GitHub CLI para crear milestones:
```bash
# Instalar GitHub CLI si no está instalado
# Autenticar: gh auth login

# Crear milestones
gh api repos/LoaQA/Tests-Analytics/milestones -f title="R0: Fundamentos técnicos y arquitectura base" -f description="Infraestructura base, CI/CD, backend, seguridad inicial." -f due_on="2025-11-16T00:00:00Z"

gh api repos/LoaQA/Tests-Analytics/milestones -f title="R1: MVP local Dev (Recorder + Test Generator)" -f description="Flujo completo local: grabar → generar test → ejecutar visible." -f due_on="2025-12-14T00:00:00Z"

# ... (repetir para todos los milestones)
```

### Crear labels:
```bash
gh label create "epic" --color "6f42c1" --description "Epic - Large feature or initiative"
gh label create "backend" --color "0052cc" --description "Backend development"
gh label create "frontend" --color "1d76db" --description "Frontend development"
# ... (repetir para todos los labels)
```

### Crear issues:
```bash
gh issue create --title "EP0-ARCH: Arquitectura backend, base de datos y servicios" --body-file epic-arch.md --label "epic,backend,devops,priority-high" --milestone "R0: Fundamentos técnicos y arquitectura base"
```

## 📈 Próximos Pasos

1. **✅ Crear repositorio** - Ya existe: https://github.com/LoaQA/Tests-Analytics
2. **🔄 Configurar milestones** - Usar comandos GitHub CLI arriba
3. **🏷️ Crear labels** - Usar comandos GitHub CLI arriba  
4. **📋 Crear issues para épicas** - Usar comandos GitHub CLI arriba
5. **📊 Configurar Project Board** - Via GitHub web interface
6. **🔗 Conectar issues con milestones** - Automático con comandos CLI

---
*Setup Guide actualizado: Octubre 19, 2025*