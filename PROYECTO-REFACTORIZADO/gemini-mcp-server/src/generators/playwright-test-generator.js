// 🤖 PLAYWRIGHT TEST GENERATOR
// Usa Gemini + MCP Playwright para generar tests .spec.ts ejecutables

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

class PlaywrightTestGenerator {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY requerida para PlaywrightTestGenerator');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp'
    });
    
    console.log('✅ PlaywrightTestGenerator inicializado');
  }
  
  /**
   * Generar test Playwright a partir de análisis optimizado
   */
  async generateTest(analysisResult, metadata = {}) {
    const { optimizedSteps, flows, selectors, assertions } = analysisResult;
    
    console.log(`🎯 Generando test Playwright para ${optimizedSteps.length} pasos optimizados...`);
    
    // Construir prompt para generación de código
    const prompt = this.buildTestGenerationPrompt(
      optimizedSteps,
      flows,
      selectors,
      assertions,
      metadata
    );
    
    // Generar código con Gemini
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Muy bajo para código preciso
        maxOutputTokens: 4096
      }
    });
    
    const testCode = result.response.text();
    
    // Limpiar markdown code blocks si existen
    let cleanCode = testCode.trim();
    if (cleanCode.startsWith('```typescript') || cleanCode.startsWith('```ts')) {
      cleanCode = cleanCode.split('\n').slice(1, -1).join('\n');
    } else if (cleanCode.startsWith('```')) {
      cleanCode = cleanCode.split('\n').slice(1, -1).join('\n');
    }
    
    console.log('✅ Test Playwright generado');
    
    return {
      code: cleanCode,
      filename: this.generateFilename(flows, metadata),
      language: 'typescript',
      framework: 'playwright',
      tokensUsed: result.response.usageMetadata?.totalTokenCount || 0
    };
  }
  
  /**
   * Construir prompt para generación de código Playwright
   */
  buildTestGenerationPrompt(steps, flows, selectors, assertions, metadata) {
    return `Genera un test de Playwright en TypeScript COMPLETO y EJECUTABLE basado en este análisis:

## PASOS OPTIMIZADOS (${steps.length} acciones):
${JSON.stringify(steps, null, 2)}

## FLUJOS IDENTIFICADOS (${flows.length} flujos):
${JSON.stringify(flows, null, 2)}

## SELECTORES RECOMENDADOS:
${JSON.stringify(selectors, null, 2)}

## ASSERTIONS CRÍTICAS:
${JSON.stringify(assertions, null, 2)}

## METADATA DE SESIÓN:
${JSON.stringify(metadata, null, 2)}

---

## REQUISITOS ESTRICTOS:

1. **Archivo completo**: Imports + describe + test + expects
2. **Selectores robustos**: Usa data-testid primero, luego role, texto, CSS
3. **Assertions explícitas**: Todas las validaciones en assertions[]
4. **Manejo de errores**: try-catch para acciones críticas
5. **Waits inteligentes**: await expect(locator).toBeVisible() antes de interactuar
6. **Comentarios útiles**: Explica el propósito de cada sección
7. **Best practices**: Page Object si hay múltiples flujos
8. **TypeScript types**: Usa tipos correctos de Playwright

## ESTRUCTURA ESPERADA:

\`\`\`typescript
import { test, expect, Page } from '@playwright/test';

test.describe('${metadata.sessionName || 'User Session Test'}', () => {
  
  test('${flows[0]?.name || 'Complete User Flow'}', async ({ page }) => {
    // PASO 1: Navegación inicial
    await page.goto('URL_INICIAL');
    
    // PASO 2: Esperar carga
    await expect(page.locator('SELECTOR_PRINCIPAL')).toBeVisible();
    
    // PASO 3-N: Acciones del flujo
    // ... generar basado en optimizedSteps
    
    // ASSERTIONS FINALES
    // ... generar basado en assertions[]
  });
  
  // Tests adicionales si hay múltiples flows
});
\`\`\`

## NOTAS IMPORTANTES:

- **NO uses selectores frágiles** (ej: nth-child, posiciones)
- **SÍ usa**: data-testid, role, text, aria-label
- **Agrupa acciones relacionadas** con comentarios claros
- **Valida estado** antes de cada interacción crítica
- **Usa Page Object** si hay más de 3 flujos
- **Timeouts razonables**: 5s para acciones normales, 10s para navegación

Genera SOLO el código TypeScript, sin explicaciones adicionales.`;
  }
  
  /**
   * Generar nombre de archivo basado en flujos
   */
  generateFilename(flows, metadata) {
    if (flows && flows.length > 0) {
      const mainFlow = flows[0];
      const flowName = mainFlow.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return `${flowName}.spec.ts`;
    }
    
    const sessionId = metadata.sessionId || 'session';
    const timestamp = Date.now();
    return `test-${sessionId}-${timestamp}.spec.ts`;
  }
  
  /**
   * Guardar test en disco
   */
  async saveTest(testResult, outputDir = './generated-tests') {
    // Crear directorio si no existe
    await fs.mkdir(outputDir, { recursive: true });
    
    // Ruta completa
    const filePath = path.join(outputDir, testResult.filename);
    
    // Guardar archivo
    await fs.writeFile(filePath, testResult.code, 'utf-8');
    
    console.log(`💾 Test guardado en: ${filePath}`);
    
    return {
      path: filePath,
      filename: testResult.filename,
      size: testResult.code.length
    };
  }
  
  /**
   * Generar y guardar test completo (método todo-en-uno)
   */
  async generateAndSave(analysisResult, metadata = {}, outputDir = './generated-tests') {
    // Generar código
    const testResult = await this.generateTest(analysisResult, metadata);
    
    // Guardar en disco
    const saveResult = await this.saveTest(testResult, outputDir);
    
    return {
      ...testResult,
      saved: saveResult
    };
  }
}

module.exports = { PlaywrightTestGenerator };
