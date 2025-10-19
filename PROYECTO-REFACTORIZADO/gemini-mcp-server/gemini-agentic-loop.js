// 🤖 GEMINI AGENTIC LOOP - Loop agéntico VERDADERO con MCP
// Gemini observa → piensa → actúa → aprende en ciclo continuo

require('dotenv').config();
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_ITERATIONS = 50; // Máximo de iteraciones del loop
const MAX_ERRORS = 5; // Máximo de errores consecutivos

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY no configurado');
  process.exit(1);
}

// 🧠 Cliente Gemini con function calling
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

class GeminiAgenticLoop {
  constructor() {
    this.mcpClient = null;
    this.availableTools = [];
    this.conversationHistory = [];
    this.sessionId = `session-${Date.now()}`;
    this.iterations = 0;
    this.consecutiveErrors = 0;
    this.goalCompleted = false;
    this.executionLog = [];
    this.testSteps = []; // 🧪 NUEVO: Acumular pasos para generar test Playwright
    this.initialUrl = null; // 🌐 NUEVO: URL inicial del flujo
  }

  // 🔧 INICIALIZAR CONEXIÓN MCP
  async initializeMCP() {
    console.log('🔧 Iniciando conexión MCP con Playwright Server...');

    // Usar path absoluto desde el módulo actual
    const currentDir = __dirname || path.dirname(require.main.filename) || process.cwd();
    const serverPath = path.resolve(currentDir, 'mcp-playwright-server.js');

    console.log('📂 Current dir:', currentDir);
    console.log('📂 Server path:', serverPath);

    // Usar StdioClientTransport con command y args (según MCP SDK)
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: process.env
    });

    this.mcpClient = new Client(
      {
        name: 'gemini-agentic-client',
        version: '2.0.0'
      },
      {
        capabilities: {}
      }
    );

    await this.mcpClient.connect(transport);

    // Obtener lista de herramientas disponibles
    const toolsResponse = await this.mcpClient.listTools({});

    this.availableTools = toolsResponse.tools;
    console.log(`✅ MCP conectado. ${this.availableTools.length} herramientas disponibles`);

    return this.availableTools;
  }

  // 🎯 EJECUTAR LOOP AGÉNTICO
  async runAgenticLoop(userGoal, options = {}) {
    const {
      headless = false,
      maxIterations = MAX_ITERATIONS,
      verbose = true
    } = options;

    console.log('\n🚀 === INICIANDO LOOP AGÉNTICO VERDADERO ===');
    console.log(`🎯 Objetivo: ${userGoal}`);
    console.log(`🔄 Max iteraciones: ${maxIterations}`);
    console.log(`👁️  Modo: ${headless ? 'Headless' : 'Visual'}`);

    try {
      // 1. Inicializar MCP
      await this.initializeMCP();

      // 2. Iniciar navegador a través de MCP
      await this.callMCPTool('browser_start', {
        headless,
        sessionId: this.sessionId
      });

      this.executionLog.push({
        action: 'browser_start',
        timestamp: new Date().toISOString(),
        success: true
      });

      // 3. LOOP AGÉNTICO PRINCIPAL
      while (this.iterations < maxIterations && !this.goalCompleted) {
        this.iterations++;
        console.log(`\n📍 === ITERACIÓN ${this.iterations} ===`);

        try {
          // A. OBSERVAR - Capturar estado actual
          const observation = await this.observe();

          if (verbose) {
            console.log('👁️  Observación capturada');
          }

          // B. PENSAR - Gemini decide qué hacer
          const decision = await this.think(userGoal, observation);

          if (verbose) {
            console.log(`🧠 Decisión: ${decision.action || 'unknown'}`);
            console.log(`💭 Razón: ${decision.reasoning}`);
          }

          // C. VERIFICAR SI COMPLETÓ
          if (decision.goalCompleted) {
            console.log('✅ Gemini reporta objetivo completado');
            this.goalCompleted = true;
            break;
          }

          // D. ACTUAR - Ejecutar decisión vía MCP
          const actionResult = await this.act(decision);

          if (verbose) {
            console.log(`✅ Acción ejecutada: ${decision.action}`);
          }

          // E. APRENDER - Registrar resultado
          this.learn(decision, actionResult, observation);

          // Resetear contador de errores
          this.consecutiveErrors = 0;

          // Pausa entre iteraciones
          await this.sleep(500);

        } catch (iterationError) {
          console.error(`⚠️  Error en iteración ${this.iterations}:`, iterationError.message);

          this.consecutiveErrors++;
          this.executionLog.push({
            iteration: this.iterations,
            error: iterationError.message,
            timestamp: new Date().toISOString()
          });

          if (this.consecutiveErrors >= MAX_ERRORS) {
            console.error('❌ Demasiados errores consecutivos. Abortando.');
            break;
          }

          // Continuar con siguiente iteración
          await this.sleep(1000);
        }
      }

      // 4. CAPTURAR ESTADO FINAL
      const finalObservation = await this.observe();

      console.log('\n🏁 === LOOP AGÉNTICO COMPLETADO ===');
      console.log(`📊 Iteraciones: ${this.iterations}`);
      console.log(`✅ Objetivo completado: ${this.goalCompleted ? 'SÍ' : 'NO'}`);
      console.log(`🧪 Pasos registrados para test: ${this.testSteps.length}`);

      return {
        success: this.goalCompleted,
        iterations: this.iterations,
        executionLog: this.executionLog,
        finalState: finalObservation,
        conversationHistory: this.conversationHistory,
        testSteps: this.testSteps, // 🧪 NUEVO: Pasos para generar el test
        initialUrl: this.initialUrl // 🌐 NUEVO: URL inicial del flujo
      };

    } catch (error) {
      console.error('💥 Error fatal en loop agéntico:', error);
      throw error;

    } finally {
      // 5. CERRAR NAVEGADOR
      try {
        await this.callMCPTool('browser_close', {});
      } catch (e) {
        console.warn('⚠️  Error cerrando navegador:', e.message);
      }
    }
  }

  // 👁️ OBSERVAR - Captura estado actual completo
  async observe() {
    try {
      // 1. Capturar contexto textual
      const contextResult = await this.callMCPTool('get_page_context', {
        includeHTML: true
      });

      const contextText = contextResult.content.find(c => c.type === 'text')?.text || '{}';
      const context = JSON.parse(contextText.split('📊 Contexto de la página:\n\n')[1] || '{}');

      // 2. Capturar screenshot
      const screenshotResult = await this.callMCPTool('screenshot', {
        fullPage: false
      });

      const screenshot = screenshotResult.content.find(c => c.type === 'image');

      return {
        context,
        screenshot: screenshot ? {
          data: screenshot.data,
          mimeType: screenshot.mimeType
        } : null,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.warn('⚠️  Error en observación:', error.message);
      return {
        context: { error: error.message },
        screenshot: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 🧠 PENSAR - Gemini analiza y decide usando Function Calling
  async think(userGoal, observation) {
    try {
      // Construir herramientas en formato Gemini Function Calling
      const geminiTools = this.availableTools
        .filter(t => !['browser_start', 'browser_close'].includes(t.name)) // Excluir control de browser
        .map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }));

      // Preparar contenido multimodal (texto + imagen)
      const parts = [
        {
          text: this.buildPrompt(userGoal, observation)
        }
      ];

      // Agregar screenshot si está disponible
      if (observation.screenshot) {
        parts.push({
          inlineData: {
            mimeType: observation.screenshot.mimeType,
            data: observation.screenshot.data
          }
        });
      }

      // Modelo con function calling
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2000
        },
        tools: [{
          functionDeclarations: geminiTools
        }]
      });

      // Crear chat con historial
      const chat = model.startChat({
        history: this.conversationHistory
      });

      const result = await chat.sendMessage(parts);
      const response = result.response;

      // Registrar en historial
      this.conversationHistory.push({
        role: 'user',
        parts
      });
      this.conversationHistory.push({
        role: 'model',
        parts: response.candidates[0].content.parts
      });

      // Verificar si Gemini hizo un function call
      // Los function calls están en los parts de la respuesta
      const responseParts = response.candidates[0]?.content?.parts || [];
      const functionCall = responseParts.find(p => p.functionCall);

      if (functionCall && functionCall.functionCall) {
        return {
          action: functionCall.functionCall.name,
          arguments: functionCall.functionCall.args || {},
          reasoning: 'Function call from Gemini',
          goalCompleted: false
        };
      }

      // Si no hay function call, parsear respuesta de texto
      const textResponse = response.text();

      // Verificar si indica completitud
      if (
        textResponse.toLowerCase().includes('objetivo completado') ||
        textResponse.toLowerCase().includes('tarea completada') ||
        textResponse.toLowerCase().includes('goal completed')
      ) {
        return {
          action: 'complete',
          reasoning: textResponse,
          goalCompleted: true
        };
      }

      // Si no puede decidir, hacer wait
      return {
        action: 'wait',
        arguments: { milliseconds: 1000 },
        reasoning: textResponse,
        goalCompleted: false
      };

    } catch (error) {
      console.error('❌ Error en pensamiento Gemini:', error);
      throw new Error(`Think error: ${error.message}`);
    }
  }

  // 🎬 ACTUAR - Ejecutar decisión vía MCP
  async act(decision) {
    const { action, arguments: args } = decision;

    if (action === 'complete') {
      return { success: true, message: 'Goal completed' };
    }

    try {
      const result = await this.callMCPTool(action, args || {});

      this.executionLog.push({
        iteration: this.iterations,
        action,
        arguments: args,
        result: 'success',
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      console.error(`❌ Error ejecutando ${action}:`, error.message);

      this.executionLog.push({
        iteration: this.iterations,
        action,
        arguments: args,
        result: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  // 📚 APRENDER - Registrar resultado para próxima iteración
  learn(decision, actionResult, observation) {
    // El aprendizaje ocurre implícitamente a través del historial de conversación
    // En lugar de agregar functionResponse (no soportado por Gemini API),
    // agregamos el resultado como un mensaje de modelo con texto plano

    if (decision.action !== 'complete') {
      const resultText = actionResult.content
        ?.map(c => c.text || '')
        .join('\n') || 'Acción ejecutada';

      // Agregar resultado como mensaje del modelo
      this.conversationHistory.push({
        role: 'model',
        parts: [{
          text: `Resultado de ${decision.action}: ${resultText}`
        }]
      });

      // 🧪 NUEVO: Acumular paso para generación del test
      if (decision.action !== 'wait' && decision.action !== 'screenshot' && decision.action !== 'get_page_context') {
        const testStep = {
          action: decision.action,
          selector: decision.arguments?.selector,
          value: decision.arguments?.text || decision.arguments?.url,
          comment: decision.reasoning || `Ejecutar ${decision.action}`,
          assertion: this.inferAssertion(decision, actionResult, observation),
          timestamp: new Date().toISOString()
        };
        
        this.testSteps.push(testStep);
        console.log(`🧪 Test step agregado: ${decision.action} (Total: ${this.testSteps.length})`);
      }
    }
  }

  // 🔍 NUEVO: Inferir assertion apropiada según el contexto de la acción
  inferAssertion(decision, actionResult, observation) {
    const { action, arguments: args } = decision;
    const { context } = observation;
    
    try {
      if (action === 'navigate') {
        // Capturar URL inicial si es la primera navegación
        if (!this.initialUrl && args.url) {
          this.initialUrl = args.url;
        }
        return `await expect(page).toHaveURL('${args.url}');`;
      } 
      
      if (action === 'click') {
        // Si es un botón de submit, esperar cambio de estado
        if (args.selector?.includes('submit') || args.selector?.includes('button[type="submit"]')) {
          return `await page.waitForLoadState('networkidle');\n    // Validar que se procesó el formulario`;
        }
        // Si es un link, podría cambiar de página
        if (context.links?.some(l => l.selector === args.selector)) {
          return `await page.waitForLoadState('domcontentloaded');`;
        }
        return `await expect(page.locator('${args.selector}')).toBeVisible();`;
      }
      
      if (action === 'type') {
        // Validar que el texto se ingresó correctamente
        return `await expect(page.locator('${args.selector}')).toHaveValue('${args.text}');`;
      }
      
      if (action === 'find_elements') {
        return `// Elementos encontrados: ${args.selector}`;
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️  Error infiriendo assertion: ${error.message}`);
      return null;
    }
  }

  // 🔧 LLAMAR HERRAMIENTA MCP
  async callMCPTool(toolName, args) {
    try {
      // Llamar sin resultSchema - usar el default del SDK
      const result = await this.mcpClient.callTool(
        {
          name: toolName,
          arguments: args
        },
        undefined, // No pasar resultSchema, usar default
        { timeout: 30000 }
      );

      return result;

    } catch (error) {
      throw new Error(`MCP tool ${toolName} failed: ${error.message}`);
    }
  }

  // 📝 CONSTRUIR PROMPT PARA GEMINI
  buildPrompt(userGoal, observation) {
    const { context } = observation;

    return `Eres un EXPERTO EN TESTING AUTOMATIZADO con Playwright. Tu misión es ANALIZAR un flujo web capturado y GENERAR un test automático robusto.

🎯 OBJETIVO DEL TEST:
${userGoal}

📊 ESTADO ACTUAL DE LA PÁGINA:
- URL: ${context.url || 'unknown'}
- Título: ${context.title || 'unknown'}
- Formularios: ${context.formCount || 0}
- Inputs disponibles: ${context.inputs?.length || 0}
- Botones disponibles: ${context.buttons?.length || 0}
- Links disponibles: ${context.links?.length || 0}

🔍 ELEMENTOS INTERACTIVOS DETECTADOS:
${JSON.stringify({ 
  inputs: context.inputs?.slice(0, 10), 
  buttons: context.buttons?.slice(0, 10), 
  links: context.links?.slice(0, 5) 
}, null, 2)}

📄 TEXTO VISIBLE EN PÁGINA (primeros 800 caracteres):
${context.visibleText?.slice(0, 800) || 'No hay texto visible'}

🔄 TU PROCESO DE ANÁLISIS (Metodología Agéntica):
1. 👁️  OBSERVA: Analiza el screenshot y elementos de la página actual
2. 🔍 IDENTIFICA: Detecta elementos críticos, validaciones necesarias, estados de la app
3. 🎬 REPRODUCE: Ejecuta el SIGUIENTE PASO del flujo usando las herramientas MCP
4. ✅ VALIDA: Verifica que el paso se ejecutó correctamente
5. 📝 DOCUMENTA: El sistema registrará automáticamente assertions para el test final

✨ CRITERIOS DE CALIDAD DEL TEST:
- **Selectores robustos**: Prioridad: data-testid > aria-label > role > id > class
- **Esperas explícitas**: Usa waitForSelector, waitForLoadState('networkidle')
- **Assertions contextuales**: expect(page).toHaveURL, toHaveText, toBeVisible
- **Manejo de estados dinámicos**: Loading spinners, modals, notifications
- **Validaciones negativas**: Cuando aplique, elementos que NO deben estar

🛠️ HERRAMIENTAS MCP DISPONIBLES:
- **navigate**: Ir a URLs (usa para navegar)
- **click**: Interactuar con elementos (botones, links)
- **type**: Llenar campos de texto
- **find_elements**: Buscar selectores robustos en la página (¡ÚSALO antes de cada acción!)
- **get_page_context**: Obtener estado actualizado de la página
- **screenshot**: Para análisis visual detallado
- **evaluate**: Ejecutar JavaScript (obtener data-testid, aria-labels, roles)
- **wait**: Esperas explícitas

📋 INSTRUCCIONES ESPECÍFICAS:
✓ Antes de cada acción importante, usa **find_elements** para verificar el selector correcto
✓ Si encuentras **data-testid**, ÚSALO (es el selector más robusto)
✓ Si ves un loading spinner o loader, espera a que desaparezca con **wait**
✓ Después de submit de formulario, valida mensajes de éxito/error o cambio de URL
✓ Si es un flujo de login, valida dashboard o mensaje de bienvenida
✓ Si ves elementos dinámicos (modals, dropdowns), maneja sus estados

🔢 ESTADO DE EJECUCIÓN:
- Iteración actual: ${this.iterations}
- Pasos registrados para el test: ${this.testSteps.length}
- URL inicial capturada: ${this.initialUrl || 'No definida aún'}

❓ SIGUIENTE PASO: 
Analiza el contexto actual y decide qué acción tomar para avanzar en la reproducción del flujo. 
Recuerda: solo UNA acción por iteración. Usa las FUNCTION CALLS para ejecutar.

Si ya completaste todos los pasos del flujo capturado, responde con texto indicando "Objetivo completado".`;
  }

  // 💤 UTILIDAD: Sleep
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 🎯 FUNCIÓN DE EXPORTACIÓN PARA USAR EN OTROS MÓDULOS
async function runGeminiAgent(goal, options = {}) {
  const agent = new GeminiAgenticLoop();
  return await agent.runAgenticLoop(goal, options);
}

module.exports = {
  GeminiAgenticLoop,
  runGeminiAgent
};

// 🧪 TESTING DIRECTO
if (require.main === module) {
  (async () => {
    try {
      const goal = process.argv[2] || 'Navega a https://example.com y captura el título de la página';

      console.log('🧪 Modo de testing directo');
      console.log(`🎯 Objetivo: ${goal}`);

      const result = await runGeminiAgent(goal, {
        headless: false,
        verbose: true
      });

      console.log('\n📊 === RESULTADO FINAL ===');
      console.log(JSON.stringify(result, null, 2));

      process.exit(result.success ? 0 : 1);

    } catch (error) {
      console.error('💥 Error:', error);
      process.exit(1);
    }
  })();
}
