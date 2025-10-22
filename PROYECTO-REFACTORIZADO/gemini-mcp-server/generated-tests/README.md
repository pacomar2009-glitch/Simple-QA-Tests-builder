# 🎭 Generated Playwright Tests

Este directorio contiene tests Playwright generados automáticamente por el **TestGenerationOrchestrator** a partir de sesiones de usuario capturadas por la extensión.

## 📋 Características

- **Lenguaje**: TypeScript
- **Framework**: Playwright
- **Generación**: Gemini AI (Single-Pass)
- **Selectores**: Robustos (data-testid, role, aria-label)
- **Assertions**: Críticas identificadas automáticamente

## 🚀 Cómo Usar

### 1. Instalar dependencias de Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Ejecutar un test generado

```bash
npx playwright test generated-tests/login-flow.spec.ts
```

### 3. Ejecutar todos los tests

```bash
npx playwright test generated-tests/
```

### 4. Ejecutar con UI mode (debugging)

```bash
npx playwright test generated-tests/login-flow.spec.ts --ui
```

### 5. Generar reporte HTML

```bash
npx playwright test generated-tests/
npx playwright show-report
```

## 📁 Estructura de Tests Generados

Cada test incluye:

- **Imports**: `@playwright/test`
- **Describe**: Agrupa tests por sesión
- **Test**: Implementa flujo completo
- **Selectores**: Priorizados por robustez
- **Assertions**: Validaciones críticas
- **Comentarios**: Explican intención de cada paso

## 🎯 Ejemplo de Test Generado

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  
  test('should login successfully with valid credentials', async ({ page }) => {
    // Navegación inicial
    await page.goto('https://example.com/login');
    
    // Esperar carga de formulario
    await expect(page.getByTestId('login-form')).toBeVisible();
    
    // Completar credenciales
    await page.getByTestId('username-input').fill('testuser');
    await page.getByTestId('password-input').fill('password123');
    
    // Submit
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Validar redirección
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText('Welcome back')).toBeVisible();
  });
});
```

## 🔧 Personalización

Los tests generados son **base funcional**. Puedes:

1. **Agregar más assertions**
2. **Extraer Page Objects**
3. **Añadir fixtures**
4. **Configurar timeouts**
5. **Agregar hooks (beforeEach, afterEach)**

## 📊 Métricas

Cada test incluye metadata de generación:

- Tokens usados
- Latencia de generación
- Pasos originales vs optimizados
- Flujos identificados
- Assertions agregadas

## ⚠️ Notas Importantes

- **Tests son punto de partida**: Revisa y ajusta según necesidades
- **Selectores pueden cambiar**: Verifica en aplicación real
- **Assertions son sugeridas**: Agrega más validaciones críticas
- **No committear**: Este directorio está en `.gitignore`

## 🐛 Troubleshooting

### "Element not found"
- Verifica que selectores existen en app
- Usa `--headed` para debugging visual
- Revisa timeouts

### "Test timeout"
- Incrementa timeout: `test.setTimeout(60000)`
- Verifica carga de página lenta
- Usa `--debug` para inspección

### "Assertion failed"
- Valida estado esperado de app
- Revisa datos de test
- Usa `await page.pause()` para debugging

## 📚 Referencias

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/test-assertions)

---

**Generado por**: TestGenerationOrchestrator  
**Fecha**: Octubre 2025  
**Versión**: 2.0.0
