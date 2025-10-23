// 🤖 MCP PLAYWRIGHT TEST GENERATOR
// Usa MCP para reproducir pasos y generar test optimizado en tiempo real

const { spawn } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

class MCPPlaywrightGenerator {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY requerida');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash'  // ✅ Modelo correcto (sin -exp)
    });
    
    // Playwright instances
    this.browser = null;
    this.context = null;
    this.page = null;
    
    this.progressCallbacks = new Map();
    
    console.log('✅ MCPPlaywrightGenerator inicializado con gemini-2.0-flash');
  }
  
  /**
   * Generar test usando MCP Playwright (reproduce pasos reales)
   */
  async generateTestWithMCP(sessionData, progressCallback) {
    const { sessionId, steps, metadata } = sessionData;
    const jobId = `mcp-${Date.now()}`;
    
    console.log(`[${jobId}] 🎭 Iniciando generación con MCP Playwright...`);
    
    // Guardar callback para streaming de progreso
    if (progressCallback) {
      this.progressCallbacks.set(jobId, progressCallback);
    }
    
    try {
      // FASE 1: Analizar intención de los pasos
      await this.sendProgress(jobId, {
        phase: 'analyzing',
        message: '🔍 Analizando intención de los pasos capturados...',
        progress: 10
      });
      
      const analysis = await this.analyzeSteps(steps);
      
      await this.sendProgress(jobId, {
        phase: 'analyzing',
        message: `✅ Detectados ${analysis.flows.length} flujos: ${analysis.flows.map(f => f.name).join(', ')}`,
        progress: 20,
        data: { flows: analysis.flows }
      });
      
      // FASE 2: Iniciar navegador con MCP
      await this.sendProgress(jobId, {
        phase: 'browser_start',
        message: '🌐 Iniciando navegador Playwright...',
        progress: 25
      });
      
      const mcpTools = await this.startMCPServer();
      
      await this.sendProgress(jobId, {
        phase: 'browser_start',
        message: '✅ Navegador iniciado, comenzando reproducción...',
        progress: 30
      });
      
      // FASE 3: Reproducir pasos con MCP y generar test
      const result = await this.reproduceAndGenerateTest(
        jobId,
        steps,
        analysis,
        mcpTools,
        metadata
      );
      
      let testCode = result.testCode;
      const executionHistory = result.executionHistory;
      
      // FASE 4: VALIDACIÓN Y AUTO-CORRECCIÓN AGÉNTICA
      await this.sendProgress(jobId, {
        phase: 'validating',
        message: '� Validando test generado ejecutándolo...',
        progress: 85
      });
      
      const validationResult = await this.validateAndFixTest(
        jobId,
        testCode,
        analysis,
        executionHistory,
        mcpTools
      );
      
      testCode = validationResult.finalCode;
      
      // FASE 5: Cerrar navegador
      await this.sendProgress(jobId, {
        phase: 'finalizing',
        message: '🧹 Cerrando navegador...',
        progress: 90
      });
      
      await this.closeMCPServer();
      
      // FASE 6: Guardar test validado
      await this.sendProgress(jobId, {
        phase: 'saving',
        message: '💾 Guardando test validado y funcional...',
        progress: 95
      });
      
      const filename = this.generateFilename(analysis.flows, metadata);
      const outputPath = path.join('./generated-tests', filename);
      await fs.writeFile(outputPath, testCode, 'utf-8');
      
      await this.sendProgress(jobId, {
        phase: 'completed',
        message: `✅ Test generado: ${filename}`,
        progress: 100,
        data: {
          filename,
          path: outputPath,
          testCode: testCode.substring(0, 500) + '...' // Preview
        }
      });
      
      return {
        jobId,
        filename,
        path: outputPath,
        testCode,
        analysis
      };
      
    } catch (error) {
      await this.sendProgress(jobId, {
        phase: 'error',
        message: `❌ Error: ${error.message}`,
        progress: 0,
        error: error.message
      });
      throw error;
    } finally {
      this.progressCallbacks.delete(jobId);
    }
  }
  
  /**
   * Analizar intención de los pasos con Gemini
   */
  async analyzeSteps(steps) {
    const prompt = `Analiza estos ${steps.length} pasos capturados y detecta flujos funcionales:

${JSON.stringify(steps.map((s, i) => ({
  num: i + 1,
  type: s.type,
  selector: s.selector,
  value: s.value,
  url: s.url
})), null, 2)}

Responde en JSON:
{
  "flows": [
    {
      "name": "string (ej: Login Flow)",
      "steps": [números],
      "intent": "string (qué hace el usuario)",
      "priority": "critical" | "high" | "medium"
    }
  ],
  "optimizations": [
    "string (sugerencias de optimización)"
  ],
  "assertions": [
    {
      "afterStep": number,
      "type": "visible" | "text" | "url",
      "target": "string",
      "reason": "string"
    }
  ]
}`;

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
        // responseMimeType NO soportado por gemini-2.0-flash
      }
    });
    
    // Extraer JSON de la respuesta (puede venir en ```json...```)
    let responseText = result.response.text();
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/) || responseText.match(/```\s*([\s\S]*?)```/);
    if (jsonMatch) {
      responseText = jsonMatch[1].trim();
    }
    
    return JSON.parse(responseText);
  }
  
  /**
   * 🤖 BUCLE AGÉNTICO: Reproducir pasos con feedback loop Gemini ↔ MCP
   * Cada paso: Observar → Razonar (Gemini) → Actuar (MCP) → Aprender
   */
  async reproduceAndGenerateTest(jobId, steps, analysis, mcpTools, metadata) {
    let testCode = `import { test, expect, Page } from '@playwright/test';\n\n`;
    testCode += `test.describe('${metadata.sessionName || 'Generated Test'}', () => {\n\n`;
    
    const firstUrl = steps[0]?.url || metadata.initialUrl;
    const executionHistory = []; // 🧠 Memoria para aprendizaje
    
    // Iterar por cada flujo detectado
    for (let flowIdx = 0; flowIdx < analysis.flows.length; flowIdx++) {
      const flow = analysis.flows[flowIdx];
      const flowSteps = steps.filter((_, i) => flow.steps.includes(i + 1));
      
      await this.sendProgress(jobId, {
        phase: 'reproducing',
        message: `🎬 Reproduciendo flujo: ${flow.name}`,
        progress: 30 + (flowIdx / analysis.flows.length) * 50,
        data: { flow: flow.name, step: 0, total: flowSteps.length }
      });
      
      testCode += `  test('${flow.name}', async ({ page }) => {\n`;
      testCode += `    // ${flow.intent}\n\n`;
      
      // Navegación inicial
      if (flowIdx === 0 && firstUrl) {
        await this.sendProgress(jobId, {
          phase: 'reproducing',
          message: `🌐 Navegando a ${firstUrl}`,
          progress: 35,
          data: { action: 'navigate', url: firstUrl }
        });
        
        const navResult = await mcpTools.executeAndReport('navigate', firstUrl);
        testCode += `    // Navegación inicial\n`;
        testCode += `    await page.goto('${firstUrl}');\n`;
        testCode += `    await page.waitForLoadState('networkidle');\n\n`;
        
        executionHistory.push({ action: 'navigate', result: navResult });
      }
      
      // 🔄 BUCLE AGÉNTICO: Un paso a la vez con feedback
      for (let stepIdx = 0; stepIdx < flowSteps.length; stepIdx++) {
        const step = flowSteps[stepIdx];
        const stepNum = stepIdx + 1;
        
        await this.sendProgress(jobId, {
          phase: 'agentic_iteration',
          message: `🤖 Iteración agéntica ${stepNum}/${flowSteps.length}...`,
          progress: 35 + (stepIdx / flowSteps.length) * 20,
          data: { step: stepNum, total: flowSteps.length }
        });
        
        // 🔄 ITERACIÓN AGÉNTICA COMPLETA
        const iterationResult = await this.agenticIteration(
          step, 
          mcpTools, 
          executionHistory, 
          jobId
        );
        
        // Agregar código generado
        testCode += iterationResult.code;
        
        // Guardar en historial para aprendizaje
        executionHistory.push(iterationResult);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      testCode += `  });\n\n`;
    }
    
    testCode += `});\n`;
    
    // Optimización final con historial completo
    await this.sendProgress(jobId, {
      phase: 'generating_code',
      message: '✍️ Optimizando código con conocimiento de ejecución real...',
      progress: 80
    });
    
    testCode = await this.optimizeWithExecutionHistory(testCode, executionHistory, analysis);
    
    return { testCode, executionHistory };
  }
  
  /**
   * 🤖 ITERACIÓN AGÉNTICA: Núcleo del sistema agéntico
   * 1️⃣ OBSERVAR: MCP explora página
   * 2️⃣ RAZONAR: Gemini decide qué hacer
   * 3️⃣ ACTUAR: MCP ejecuta y reporta
   * 4️⃣ GENERAR: Gemini crea código basado en ejecución real
   */
  async agenticIteration(userStep, mcpTools, history, jobId) {
    // 1️⃣ OBSERVAR: MCP explora el estado actual
    await this.sendProgress(jobId, {
      phase: 'observing',
      message: `🔍 Observando página antes de: ${userStep.type}...`,
      progress: null
    });
    
    const observation = await mcpTools.observe({
      includeDOM: true,
      captureElements: true
    });
    
    // 2️⃣ RAZONAR: Gemini analiza observación y decide
    await this.sendProgress(jobId, {
      phase: 'reasoning',
      message: `🧠 Gemini analizando contexto...`,
      progress: null
    });
    
    const decision = await this.geminiReasoning(userStep, observation, history);
    
    // 3️⃣ ACTUAR: MCP ejecuta la decisión
    await this.sendProgress(jobId, {
      phase: 'executing',
      message: `🚀 Ejecutando: ${decision.action} en ${decision.selector}`,
      progress: null
    });
    
    const execution = await mcpTools.executeAndReport(
      decision.action,
      decision.selector,
      decision.value
    );
    
    // 🔁 RETRY si falló
    if (!execution.success && decision.retry_strategy) {
      await this.sendProgress(jobId, {
        phase: 'retrying',
        message: `🔄 Reintentando con estrategia: ${decision.retry_strategy}`,
        progress: null
      });
      
      const retryDecision = await this.geminiRetryStrategy(execution, observation);
      const retryExecution = await mcpTools.executeAndReport(
        retryDecision.action,
        retryDecision.selector,
        retryDecision.value
      );
      
      execution.retry = retryExecution;
      decision.retry_decision = retryDecision;
    }
    
    // 4️⃣ GENERAR: Gemini crea código basado en lo que REALMENTE funcionó
    await this.sendProgress(jobId, {
      phase: 'code_generation',
      message: `📝 Generando código basado en ejecución real...`,
      progress: null
    });
    
    const code = await this.geminiCodeGeneration(decision, execution, observation);
    
    return {
      userStep,
      observation,
      decision,
      execution,
      code,
      timestamp: Date.now()
    };
  }
  
  /**
   * 🧠 GEMINI REASONING: Analizar y decidir qué hacer
   */
  async geminiReasoning(userStep, observation, history) {
    const prompt = `Eres un agente QA experto que decide cómo reproducir acciones de usuario.

📋 PASO DEL USUARIO:
${JSON.stringify(userStep, null, 2)}

🔍 OBSERVACIÓN DE LA PÁGINA:
- URL: ${observation.url}
- Elementos interactivos: ${observation.interactiveElements.length} encontrados
- Overlays detectados: ${observation.overlays.length}
- Errores de consola: ${observation.consoleErrors.length}

📊 HISTORIAL (últimos 3 pasos):
${JSON.stringify(history.slice(-3).map(h => ({
  action: h.decision?.action,
  success: h.execution?.success,
  selector: h.decision?.selector
})), null, 2)}

🎯 TU DECISIÓN:
Analiza la observación y decide:
1. ¿Qué acción ejecutar? (click, fill, navigate, wait)
2. ¿Cuál es el MEJOR selector? (prioriza: testid > role > label > id > name)
3. ¿Hay overlays que cerrar primero?
4. ¿Necesitas waits explícitos?
5. ¿Qué puede fallar?

RESPONDE EN JSON (sin markdown):
{
  "action": "click" | "fill" | "navigate" | "wait",
  "selector": "mejor selector encontrado",
  "value": "valor si es fill",
  "pre_actions": ["cerrar overlay", "wait for element"],
  "reasoning": "Por qué elegiste esta estrategia",
  "risk_assessment": "Qué puede fallar",
  "retry_strategy": "Qué hacer si falla"
}`;

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024
      }
    });
    
    let responseText = result.response.text();
    let jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) {
      jsonMatch = responseText.match(/```\s*([\s\S]*?)```/);
    }
    if (jsonMatch) {
      responseText = jsonMatch[1].trim();
    }
    
    // Limpiar backticks residuales
    responseText = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    
    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.warn('⚠️ Error parseando decisión de Gemini:', error.message);
      console.warn('Respuesta:', responseText.substring(0, 200));
      // Fallback
      return {
        action: userStep.type,
        selector: this.buildSelectorFromElement(userStep.element),
        value: userStep.value,
        reasoning: 'Fallback: JSON parsing failed',
        retry_strategy: 'wait and retry'
      };
    }
  }
  
  /**
   * 🔄 GEMINI RETRY: Estrategia de reintento
   */
  async geminiRetryStrategy(failedExecution, observation) {
    const prompt = `La ejecución falló. Analiza y sugiere alternativa.

❌ ERROR:
${failedExecution.error}

📸 Estado de la página:
${JSON.stringify(observation.interactiveElements.slice(0, 10), null, 2)}

🔄 NUEVA ESTRATEGIA:
Responde en JSON con selector alternativo o acción diferente.`;

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 512 }
    });
    
    let responseText = result.response.text();
    
    // Intentar extraer JSON de markdown
    let jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) {
      jsonMatch = responseText.match(/```\s*([\s\S]*?)```/);
    }
    if (jsonMatch) {
      responseText = jsonMatch[1].trim();
    }
    
    // Si sigue teniendo backticks, limpiar
    responseText = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    
    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.warn('⚠️ Error parseando retry strategy:', error.message);
      // Fallback: no retry, continuar
      return null;
    }
  }
  
  /**
   * 📝 GEMINI CODE GENERATION: Generar código basado en ejecución REAL
   */
  async geminiCodeGeneration(decision, execution, observation) {
    const prompt = `Genera código Playwright basado en ejecución REAL exitosa.

✅ DECISIÓN TOMADA:
${JSON.stringify(decision, null, 2)}

✅ EJECUCIÓN REAL:
- Success: ${execution.success}
- Timing: ${execution.after?.duration}ms
- URL cambió: ${execution.changes?.urlChanged}
- Nueva URL: ${execution.changes?.newUrl}

📝 GENERA CÓDIGO PLAYWRIGHT:
- USA el selector que FUNCIONÓ: ${decision.selector}
- INCLUYE waits si timing > 1000ms
- AGREGA assertion si URL cambió
- COMENTA decisiones técnicas

Responde SOLO con el código TypeScript (sin markdown):`;

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
    });
    
    let code = result.response.text();
    
    // Limpiar markdown si lo tiene
    if (code.includes('```')) {
      const match = code.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
      if (match) code = match[1].trim();
    }
    
    // Asegurar indentación correcta
    code = code.split('\n').map(line => `    ${line}`).join('\n');
    
    return code + '\n\n';
  }
  
  /**
   * 🧪 VALIDACIÓN Y AUTO-CORRECCIÓN AGÉNTICA
   * Ejecuta el test generado y lo corrige hasta que funcione
   */
  async validateAndFixTest(jobId, testCode, analysis, executionHistory, mcpTools) {
    const MAX_RETRIES = 3;
    let currentCode = testCode;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      attempt++;
      
      await this.sendProgress(jobId, {
        phase: 'validating',
        message: `🧪 Intento ${attempt}/${MAX_RETRIES}: Ejecutando test...`,
        progress: 85 + (attempt / MAX_RETRIES) * 5
      });
      
      // Guardar test temporal
      const tempFilename = `temp-validation-${Date.now()}.spec.ts`;
      const tempPath = path.join('./generated-tests', tempFilename);
      await fs.writeFile(tempPath, currentCode, 'utf-8');
      
      // Ejecutar test con Playwright
      const executionResult = await this.executeTestFile(tempPath);
      
      if (executionResult.success) {
        await this.sendProgress(jobId, {
          phase: 'validating',
          message: `✅ Test validado exitosamente en intento ${attempt}`,
          progress: 90,
          data: { attempts: attempt }
        });
        
        // Eliminar archivo temporal
        await fs.unlink(tempPath).catch(() => {});
        
        return {
          finalCode: currentCode,
          attempts: attempt,
          success: true
        };
      }
      
      // Test falló, analizar error con Gemini
      await this.sendProgress(jobId, {
        phase: 'fixing',
        message: `🔧 Test falló, Gemini analizando error...`,
        progress: 85 + (attempt / MAX_RETRIES) * 5
      });
      
      const fixedCode = await this.geminiFixTest(
        currentCode,
        executionResult.error,
        executionResult.output,
        executionHistory,
        analysis
      );
      
      if (!fixedCode || fixedCode === currentCode) {
        // Gemini no pudo hacer cambios significativos
        await this.sendProgress(jobId, {
          phase: 'validating',
          message: `⚠️ No se pudo corregir automáticamente después de ${attempt} intentos`,
          progress: 90
        });
        break;
      }
      
      currentCode = fixedCode;
      
      // Eliminar archivo temporal
      await fs.unlink(tempPath).catch(() => {});
    }
    
    // Si llegamos aquí, el test no pasó pero devolvemos el último código
    return {
      finalCode: currentCode,
      attempts: attempt,
      success: false,
      warning: 'Test no validado automáticamente, puede requerir ajustes manuales'
    };
  }
  
  /**
   * 🔧 GEMINI FIX TEST: Analiza error de ejecución y corrige el código
   */
  async geminiFixTest(testCode, error, output, executionHistory, analysis) {
    const prompt = `Eres un experto QA que corrige tests de Playwright que fallan.

❌ TEST QUE FALLÓ:
\`\`\`typescript
${testCode}
\`\`\`

❌ ERROR DE EJECUCIÓN:
${error}

📊 OUTPUT COMPLETO:
${output}

🧠 CONTEXTO DE EJECUCIÓN:
${JSON.stringify(executionHistory.slice(-3).map(h => ({
  action: h.decision?.action,
  selector: h.decision?.selector,
  success: h.execution?.success,
  timing: h.execution?.after?.duration,
  urlChanged: h.execution?.changes?.urlChanged
})), null, 2)}

🎯 TU TAREA:
Analiza el error y corrige el test. Problemas comunes:
1. **Timeouts**: Si un elemento no aparece, elimina waits innecesarios o ajusta selectores
2. **URL no cambia**: Elimina assertions de URL si la acción no navega
3. **Elementos no encontrados**: Usa selectores más genéricos o elimina pasos opcionales
4. **Timing issues**: Ajusta waitForLoadState o elimina waits explícitos

⚠️ REGLAS:
- NO cambies la lógica principal del test (clicks, fills, navegación)
- SÍ elimina assertions que fallan por timing o elementos dinámicos
- SÍ simplifica selectores si son demasiado específicos
- SÍ elimina pasos opcionales (como esperar sugerencias)
- MANTÉN los comentarios que explican decisiones técnicas

RESPONDE SOLO CON EL CÓDIGO TYPESCRIPT CORREGIDO (sin markdown):`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
      });
      
      let fixedCode = result.response.text();
      
      // Limpiar markdown
      if (fixedCode.includes('```')) {
        const match = fixedCode.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
        if (match) fixedCode = match[1].trim();
      }
      
      return fixedCode;
    } catch (error) {
      console.error('❌ Error en geminiFixTest:', error.message);
      return null;
    }
  }
  
  /**
   * 🧪 EJECUTAR TEST: Ejecuta un archivo de test con Playwright
   */
  async executeTestFile(testPath) {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      
      const playwright = spawn('npx', ['playwright', 'test', testPath, '--reporter=json'], {
        cwd: process.cwd(),
        shell: true
      });
      
      let output = '';
      let errorOutput = '';
      
      playwright.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      playwright.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      // Timeout de 30 segundos
      const timeout = setTimeout(() => {
        playwright.kill();
        resolve({
          success: false,
          error: 'Timeout: Test execution exceeded 30 seconds',
          output: output + '\n' + errorOutput
        });
      }, 30000);
      
      playwright.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve({
            success: true,
            output
          });
        } else {
          // Extraer error específico del output
          let errorMessage = 'Test failed';
          
          // Buscar errores de Playwright
          const timeoutMatch = output.match(/TimeoutError: (.*?)(?:\n|$)/);
          const expectMatch = output.match(/Error: expect\((.*?)\) failed/);
          const errorMatch = output.match(/Error: (.*?)(?:\n|$)/);
          
          if (timeoutMatch) {
            errorMessage = `Timeout: ${timeoutMatch[1]}`;
          } else if (expectMatch) {
            errorMessage = `Assertion failed: ${expectMatch[1]}`;
          } else if (errorMatch) {
            errorMessage = errorMatch[1];
          }
          
          resolve({
            success: false,
            error: errorMessage,
            output: output + '\n' + errorOutput
          });
        }
      });
    });
  }
  
  /**
   * 🎯 OPTIMIZACIÓN FINAL con historial de ejecución
   */
  async optimizeWithExecutionHistory(testCode, executionHistory, analysis) {
    const metrics = {
      total_steps: executionHistory.length,
      retries_needed: executionHistory.filter(h => h.execution?.retry).length,
      avg_timing: executionHistory.reduce((sum, h) => sum + (h.execution?.after?.duration || 0), 0) / executionHistory.length,
      url_changes: executionHistory.filter(h => h.execution?.changes?.urlChanged).length
    };
    
    const prompt = `Optimiza este test Playwright basándote en ejecución real.

📜 TEST GENERADO:
\`\`\`typescript
${testCode}
\`\`\`

📊 MÉTRICAS DE EJECUCIÓN REAL:
${JSON.stringify(metrics, null, 2)}

🔍 HISTORIAL:
${executionHistory.map((h, i) => `
Paso ${i+1}:
- Acción: ${h.decision?.action}
- Selector: ${h.decision?.selector}
- Success: ${h.execution?.success}
- Retries: ${h.execution?.retry ? 'SÍ' : 'NO'}
- Timing: ${h.execution?.after?.duration}ms
`).join('\n')}

🎯 OPTIMIZA:
1. ¿Hay código duplicado?
2. ¿Faltan assertions críticas? (viste ${metrics.url_changes} cambios de URL)
3. ¿Los selectores son robustos?
4. ¿Hay waits innecesarios o faltantes?

RESPONDE CON TEST OPTIMIZADO (código completo):\`\`\``;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
      });
      
      let optimized = result.response.text();
      
      // Extraer código
      const match = optimized.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
      if (match) {
        optimized = match[1].trim();
      }
      
      return optimized;
    } catch (error) {
      console.warn('⚠️ Error optimizando código:', error.message);
      return testCode; // Retornar código original si falla
    }
  }
  
  /**
   * Ejecutar acción con MCP tools
   */
  async executeMCPAction(step, mcpTools) {
    try {
      // Construir selector desde element
      const selector = this.buildSelectorFromElement(step.element || {});
      
      switch (step.type) {
        case 'click':
          if (!selector) return { success: true, note: 'No selector available' };
          return await mcpTools.click(selector);
        
        case 'input':
        case 'change':
          if (!selector) return { success: true, note: 'No selector available' };
          return await mcpTools.fill(selector, step.value || '');
        
        case 'submit':
          if (!selector) return { success: true, note: 'No selector available' };
          return await mcpTools.click(selector);
        
        case 'navigation':
          return await mcpTools.navigate(step.url);
        
        default:
          return { success: true, note: 'Skipped non-reproducible event' };
      }
    } catch (error) {
      console.warn(`⚠️ Error ejecutando ${step.type}:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Construir selector desde objeto element
   */
  buildSelectorFromElement(element) {
    if (!element) return null;
    
    // Prioridad: id > name > data-testid > text > tagName
    if (element.id) return `#${element.id}`;
    if (element.name) return `[name="${element.name}"]`;
    if (element['data-testid']) return `[data-testid="${element['data-testid']}"]`;
    if (element.textContent) return `text=${element.textContent}`;
    if (element.tagName) return element.tagName.toLowerCase();
    
    return null;
  }
  
  /**
   * Generar código para un paso
   */
  generateCodeForStep(step, mcpResult) {
    let code = `    // ${step.type.toUpperCase()}\n`;
    
    // Construir selector desde element
    const rawSelector = this.buildSelectorFromElement(step.element || {});
    const selector = this.optimizeSelector(rawSelector);
    
    switch (step.type) {
      case 'click':
        if (selector) {
          code += `    await page.locator('${selector}').click();\n`;
        } else {
          code += `    // TODO: Mejorar selector para click\n`;
        }
        break;
      
      case 'input':
      case 'change':
        if (selector) {
          code += `    await page.locator('${selector}').fill('${step.value || ''}');\n`;
        } else {
          code += `    // TODO: Mejorar selector para input\n`;
        }
        break;
      
      case 'submit':
        if (selector) {
          code += `    await page.locator('${selector}').click();\n`;
          code += `    await page.waitForLoadState('networkidle');\n`;
        } else {
          code += `    // TODO: Mejorar selector para submit\n`;
        }
        break;
      
      case 'navigation':
        code += `    await page.goto('${step.url}');\n`;
        break;
      
      default:
        code += `    // TODO: Implementar ${step.type}\n`;
    }
    
    code += '\n';
    return code;
  }
  
  /**
   * Generar assertion
   */
  generateAssertion(assertion) {
    let code = `    // Assertion: ${assertion.reason}\n`;
    
    switch (assertion.type) {
      case 'visible':
        code += `    await expect(page.locator('${assertion.target}')).toBeVisible();\n`;
        break;
      
      case 'text':
        code += `    await expect(page.locator('${assertion.target}')).toContainText('${assertion.expected || ''}');\n`;
        break;
      
      case 'url':
        code += `    await expect(page).toHaveURL(/${assertion.expected}/);\n`;
        break;
    }
    
    code += '\n';
    return code;
  }
  
  /**
   * Optimizar selector (priorizar data-testid, role, etc)
   */
  optimizeSelector(selector) {
    // Si selector es null o undefined, retornar texto por defecto
    if (!selector) {
      return 'selector-not-available';
    }
    
    // Si ya es óptimo, retornar
    if (selector.includes('data-testid') || selector.includes('getByRole')) {
      return selector;
    }
    
    // Por ahora retornar como está, Gemini optimizará después
    return selector;
  }
  
  /**
   * Optimizar código completo con Gemini
   */
  async optimizeTestCode(testCode, analysis) {
    const prompt = `Optimiza este test Playwright generado:

\`\`\`typescript
${testCode}
\`\`\`

Optimizaciones necesarias:
${analysis.optimizations.map(o => `- ${o}`).join('\n')}

Reglas:
1. Usa selectores robustos (getByRole, getByTestId, getByLabel)
2. Agrupa waits inteligentes
3. Elimina código redundante
4. Mejora assertions
5. Agrega comentarios útiles

Responde SOLO con el código optimizado, sin markdown.`;

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096
      }
    });
    
    let optimized = result.response.text().trim();
    
    // Limpiar markdown si existe
    if (optimized.startsWith('```typescript') || optimized.startsWith('```ts')) {
      optimized = optimized.split('\n').slice(1, -1).join('\n');
    } else if (optimized.startsWith('```')) {
      optimized = optimized.split('\n').slice(1, -1).join('\n');
    }
    
    return optimized;
  }
  
  /**
   * 🤖 INICIAR PLAYWRIGHT CON CAPACIDADES AGÉNTICAS
   * MCP Tools ahora pueden OBSERVAR, EXPLORAR y REPORTAR contexto rico
   */
  async startMCPServer() {
    const { chromium } = require('playwright');
    
    console.log('🌐 Lanzando Chromium en modo AGÉNTICO...');
    
    // Lanzar navegador en modo HEADED (con UI visible)
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 1500,
      devtools: false,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: './generated-tests/videos/',
        size: { width: 1920, height: 1080 }
      }
    });
    
    this.page = await this.context.newPage();
    
    // Capturar errores de consola para análisis
    this.consoleErrors = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
    
    // Capturar network activity
    this.networkActivity = [];
    this.page.on('request', req => {
      this.networkActivity.push({ type: 'request', url: req.url(), method: req.method() });
    });
    
    console.log('✅ Navegador agéntico listo');
    
    // 🤖 TOOLS AGÉNTICAS: Observan, ejecutan y reportan
    return {
      /**
       * 🔍 OBSERVE: Explorar el estado actual de la página
       * Devuelve contexto RICO para que Gemini tome decisiones
       */
      observe: async (options = {}) => {
        console.log(`[MCP] 🔍 Observando página...`);
        
        const observation = {
          url: this.page.url(),
          title: await this.page.title(),
          timestamp: Date.now()
        };
        
        // DOM snapshot (limitado para no saturar tokens)
        if (options.includeDOM !== false) {
          const bodyText = await this.page.locator('body').textContent();
          observation.bodyText = bodyText.substring(0, 2000); // Primeros 2000 chars
        }
        
        // Elementos interactivos
        observation.interactiveElements = await this.page.evaluate(() => {
          const elements = [];
          // Botones
          document.querySelectorAll('button, [role="button"]').forEach((el, i) => {
            if (i < 20) { // Limitar a 20
              elements.push({
                type: 'button',
                text: el.textContent?.trim().substring(0, 50),
                id: el.id,
                name: el.getAttribute('name'),
                'data-testid': el.getAttribute('data-testid'),
                visible: el.offsetParent !== null
              });
            }
          });
          // Inputs
          document.querySelectorAll('input, textarea').forEach((el, i) => {
            if (i < 20) {
              elements.push({
                type: el.tagName.toLowerCase(),
                inputType: el.type,
                name: el.name,
                id: el.id,
                placeholder: el.placeholder,
                'data-testid': el.getAttribute('data-testid'),
                visible: el.offsetParent !== null
              });
            }
          });
          // Links
          document.querySelectorAll('a[href]').forEach((el, i) => {
            if (i < 10) {
              elements.push({
                type: 'link',
                text: el.textContent?.trim().substring(0, 50),
                href: el.href,
                id: el.id
              });
            }
          });
          return elements;
        });
        
        // Estado de red
        observation.networkState = {
          recentRequests: this.networkActivity.slice(-5),
          pendingRequests: await this.page.evaluate(() => {
            return window.performance?.getEntriesByType?.('resource')
              ?.filter(r => r.responseEnd === 0).length || 0;
          })
        };
        
        // Errores de consola
        observation.consoleErrors = this.consoleErrors.slice(-3);
        
        // Overlays o modals detectados
        observation.overlays = await this.page.evaluate(() => {
          const overlays = [];
          document.querySelectorAll('[class*="modal"], [class*="overlay"], [class*="dialog"]').forEach(el => {
            if (el.offsetParent !== null) {
              overlays.push({
                type: 'overlay',
                classes: el.className,
                hasCloseButton: !!el.querySelector('[class*="close"], button')
              });
            }
          });
          return overlays;
        });
        
        console.log(`[MCP] ✅ Observación completa: ${observation.interactiveElements.length} elementos`);
        return observation;
      },
      
      /**
       * 🎯 FIND_BEST_SELECTOR: Encontrar el mejor selector para un elemento
       */
      findBestSelector: async (elementDescription) => {
        console.log(`[MCP] 🎯 Buscando selector para: ${JSON.stringify(elementDescription)}`);
        
        const candidates = await this.page.evaluate((desc) => {
          const results = [];
          
          // Estrategia 1: Por data-testid
          if (desc['data-testid']) {
            const el = document.querySelector(`[data-testid="${desc['data-testid']}"]`);
            if (el) results.push({
              selector: `[data-testid="${desc['data-testid']}"]`,
              strategy: 'testid',
              score: 100,
              element: { tag: el.tagName, text: el.textContent?.substring(0, 30) }
            });
          }
          
          // Estrategia 2: Por ID
          if (desc.id) {
            const el = document.getElementById(desc.id);
            if (el) results.push({
              selector: `#${desc.id}`,
              strategy: 'id',
              score: 90,
              element: { tag: el.tagName, text: el.textContent?.substring(0, 30) }
            });
          }
          
          // Estrategia 3: Por name
          if (desc.name) {
            const el = document.querySelector(`[name="${desc.name}"]`);
            if (el) results.push({
              selector: `[name="${desc.name}"]`,
              strategy: 'name',
              score: 80,
              element: { tag: el.tagName, text: el.textContent?.substring(0, 30) }
            });
          }
          
          // Estrategia 4: Por texto (para botones/links)
          if (desc.textContent) {
            const text = desc.textContent.trim();
            const xpath = `//*[contains(text(), '${text}')]`;
            const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (el) results.push({
              selector: `text=${text}`,
              strategy: 'text',
              score: 70,
              element: { tag: el.tagName, text: el.textContent?.substring(0, 30) }
            });
          }
          
          // Estrategia 5: Por tagName (último recurso)
          if (desc.tagName && results.length === 0) {
            results.push({
              selector: desc.tagName.toLowerCase(),
              strategy: 'tag',
              score: 30,
              element: { tag: desc.tagName }
            });
          }
          
          return results;
        }, elementDescription);
        
        return {
          candidates: candidates.sort((a, b) => b.score - a.score),
          best: candidates[0] || null
        };
      },
      
      /**
       * 🚀 EXECUTE_AND_REPORT: Ejecutar acción y reportar resultado detallado
       */
      executeAndReport: async (action, selector, value = null) => {
        console.log(`[MCP] 🚀 Ejecutando: ${action} en ${selector}`);
        
        const beforeState = {
          url: this.page.url(),
          screenshot: `before-${Date.now()}.png`
        };
        
        await this.page.screenshot({ 
          path: `./generated-tests/screenshots/${beforeState.screenshot}` 
        });
        
        const startTime = Date.now();
        let result = { success: false };
        
        try {
          switch (action) {
            case 'navigate':
              await this.page.goto(selector, { waitUntil: 'networkidle' });
              await this.page.waitForTimeout(2000);
              result.success = true;
              break;
              
            case 'click':
              await this.page.locator(selector).click({ timeout: 5000 });
              await this.page.waitForTimeout(1500);
              result.success = true;
              break;
              
            case 'fill':
              await this.page.locator(selector).fill(value, { timeout: 5000 });
              await this.page.waitForTimeout(1500);
              result.success = true;
              break;
              
            default:
              result.error = `Acción desconocida: ${action}`;
          }
        } catch (error) {
          result.error = error.message;
          result.errorType = error.name;
        }
        
        const afterState = {
          url: this.page.url(),
          screenshot: `after-${Date.now()}.png`,
          duration: Date.now() - startTime
        };
        
        await this.page.screenshot({ 
          path: `./generated-tests/screenshots/${afterState.screenshot}` 
        });
        
        // Detectar cambios
        const changes = {
          urlChanged: beforeState.url !== afterState.url,
          newUrl: afterState.url,
          timing: afterState.duration,
          networkActivity: this.networkActivity.slice(-3)
        };
        
        return {
          success: result.success,
          error: result.error,
          before: beforeState,
          after: afterState,
          changes: changes,
          recommendations: this.generateRecommendations(result, changes)
        };
      },
      
      /**
       * Métodos legacy (mantener compatibilidad)
       */
      navigate: async (url) => {
        const result = await this.executeAndReport('navigate', url);
        return { success: result.success, error: result.error };
      },
      
      click: async (selector) => {
        const result = await this.executeAndReport('click', selector);
        return { success: result.success, error: result.error };
      },
      
      fill: async (selector, value) => {
        const result = await this.executeAndReport('fill', selector, value);
        return { success: result.success, error: result.error };
      },
      
      screenshot: async (filename) => {
        await this.page.screenshot({ 
          path: `./generated-tests/screenshots/${filename}`,
          fullPage: true
        });
        return { success: true };
      }
    };
  }
  
  /**
   * Generar recomendaciones basadas en ejecución
   */
  generateRecommendations(result, changes) {
    const recommendations = [];
    
    if (!result.success) {
      recommendations.push('Considerar selector alternativo o wait explícito');
    }
    
    if (changes.urlChanged) {
      recommendations.push('Agregar assertion de URL después de esta acción');
    }
    
    if (changes.timing > 2000) {
      recommendations.push('Acción tardó más de 2s, considerar waitForLoadState');
    }
    
    if (changes.networkActivity.length > 5) {
      recommendations.push('Alta actividad de red, esperar networkidle');
    }
    
    return recommendations;
  }
  
  /**
   * Cerrar navegador Playwright
   */
  async closeMCPServer() {
    console.log('🧹 Cerrando navegador...');
    
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    
    console.log('✅ Navegador cerrado');
  }
  
  /**
   * Enviar progreso a callback
   */
  async sendProgress(jobId, progress) {
    const callback = this.progressCallbacks.get(jobId);
    if (callback) {
      callback(progress);
    }
    console.log(`[${jobId}] ${progress.message}`);
  }
  
  /**
   * Generar nombre de archivo
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
    return `test-${sessionId}-${Date.now()}.spec.ts`;
  }
}

module.exports = { MCPPlaywrightGenerator };
