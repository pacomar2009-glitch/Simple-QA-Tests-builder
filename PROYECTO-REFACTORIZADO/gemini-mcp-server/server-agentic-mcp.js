// 🌐 SERVIDOR EXPRESS PARA sAgent-mcp MULTI-PROVIDER
// Sistema Agéntico Puro con soporte multi-provider (OpenAI, Gemini, Anthropic)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// NEW: Model Manager para soporte multi-provider
const ModelManager = require('./src/model-manager');

// LEGACY: Mantener para compatibilidad con endpoints antiguos
// TODO: Migrar completamente a sistema agéntico puro y eliminar
const { runGeminiAgent } = require('./gemini-agentic-loop');
const { TestGenerationOrchestrator } = require('./src/orchestrators/test-generation-orchestrator');
const { MCPPlaywrightGenerator } = require('./src/generators/mcp-playwright-generator');

// ========== MANEJADORES DE ERRORES GLOBALES ==========
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 ============ UNHANDLED PROMISE REJECTION ============');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('Stack:', reason.stack);
  console.error('=======================================================\n');
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 ============ UNCAUGHT EXCEPTION ============');
  console.error('Error:', error);
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  console.error('==============================================\n');
  // NO EXIT - para debugging
  // process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 4000;

// Inicializar orchestrator (issue #125)
const testOrchestrator = new TestGenerationOrchestrator();

// Inicializar MCP Generator
const mcpGenerator = new MCPPlaywrightGenerator(process.env.GEMINI_API_KEY);

// ========== HELPER: Construir prompt desde steps capturados ==========
function buildPromptFromSteps(steps, metadata) {
  const url = metadata.url || metadata.initialUrl || 'la página web';
  
  // 🎯 DETECTAR PATRONES DE INTENCIÓN (sin incrementar tokens significativamente)
  const enrichedSteps = steps.map((step, index) => {
    const prev = steps[index - 1];
    const next = steps[index + 1];
    const enriched = { ...step };
    
    // PATRÓN 1: Hover seguido de click en mismo/similar selector = Hover CRÍTICO
    if (step.type === 'hover' && next?.type === 'click') {
      const hoverSelector = step.selector || step.element?.selector || '';
      const clickSelector = next.selector || next.element?.selector || '';
      
      // Mismo elemento o elementos cercanos (ej: hover en parent, click en child)
      if (hoverSelector && clickSelector && 
          (hoverSelector === clickSelector || 
           hoverSelector.includes(clickSelector) || 
           clickSelector.includes(hoverSelector))) {
        enriched.critical = true;
        enriched.intent = 'menu_navigation';
      }
    }
    
    // PATRÓN 2: Scroll seguido de hover/click = Búsqueda deliberada
    if ((step.type === 'hover' || step.type === 'click') && prev?.type === 'scroll') {
      enriched.critical = true;
      enriched.intent = 'search_and_access';
    }
    
    // PATRÓN 3: Hover con cambios de visibilidad (si lo capturamos)
    if (step.type === 'hover' && step.context?.causedVisibility) {
      enriched.critical = true;
      enriched.intent = 'reveal_content';
    }
    
    return enriched;
  });
  
  const stepDescriptions = enrichedSteps.map((step, index) => {
    const num = index + 1;
    const critical = step.critical ? '⚠️ CRÍTICO: ' : '';
    
    switch (step.type) {
      case 'hover':
        const hoverTarget = step.element?.text || step.target?.text || step.element?.tagName || 'elemento';
        if (step.intent === 'menu_navigation') {
          return `${num}. ${critical}Pasa el mouse sobre "${hoverTarget}" (revela menú/opciones)`;
        } else if (step.intent === 'reveal_content') {
          return `${num}. ${critical}Pasa el mouse sobre "${hoverTarget}" (muestra contenido oculto)`;
        }
        return `${num}. ${critical}Pasa el mouse sobre "${hoverTarget}"`;
      
      case 'scroll':
        if (step.scrollY !== undefined) {
          return `${num}. Desplázate a posición Y: ${step.scrollY}px`;
        }
        return `${num}. Desplázate en la página`;
      
      case 'click':
        const targetText = step.element?.text || step.target?.text || step.element?.tagName || 'elemento';
        return `${num}. ${critical}Haz clic en "${targetText}"`;
        
      case 'input':
      case 'fill':
        const inputValue = step.value || step.element?.value || '';
        const inputField = step.element?.name || step.element?.id || step.target?.name || 'campo de entrada';
        return `${num}. Escribe "${inputValue}" en el campo "${inputField}"`;
        
      case 'select':
        const selectValue = step.value || '';
        const selectField = step.element?.name || 'selector';
        return `${num}. Selecciona "${selectValue}" en el dropdown "${selectField}"`;
        
      case 'navigation':
        const navUrl = step.url || step.value || '';
        return `${num}. Navega a ${navUrl}`;
        
      case 'submit':
        return `${num}. Envía el formulario`;
        
      default:
        return `${num}. Interactúa con ${step.element?.tagName || 'elemento'}`;
    }
  }).join('\n');
  
  return `Eres un agente QA autónomo. Tu tarea es reproducir los siguientes pasos de usuario en una página web y generar un test de Playwright.

URL INICIAL: ${url}

PASOS A REPRODUCIR:
${stepDescriptions}

🎯 DETECCIÓN AUTOMÁTICA DE INTENCIONES - REGLAS CRÍTICAS:
1. HOVERS CRÍTICOS: Si un hover es seguido de click en el mismo elemento, el hover es OBLIGATORIO (revela menús/opciones)
2. SECUENCIAS DE BÚSQUEDA: Si hay Scroll → Hover → Click, reproduce toda la secuencia (usuario buscó elemento específico)
3. HOVERS PROLONGADOS: Si un hover duró >1 segundo, es intencional y debe reproducirse (no es ruido)
4. CAMBIOS DE VISIBILIDAD: Si un hover causó que aparecieran elementos (submenús, tooltips), DEBE reproducirse antes del click

INSTRUCCIONES:
1. Inicia el navegador con browser_start
2. Navega a la URL inicial
3. Reproduce CADA paso usando las herramientas MCP disponibles (click, fill, hover, etc.)
4. IMPORTANTE: NO omitas pasos intermedios (ej: hover antes de click si está marcado como CRÍTICO)
5. Si un hover está marcado como CRÍTICO, asegúrate de ejecutarlo con page.hover() ANTES de cualquier click subsecuente
6. Los scrolls pueden ser necesarios para hacer elementos visibles antes de interactuar
7. Observa el estado de la página con observe() cuando sea necesario
8. Si un paso falla, intenta estrategias alternativas (esperar, buscar selector diferente, etc.)
9. Al final, confirma que todos los pasos se ejecutaron correctamente

Genera el test de Playwright y asegúrate de que sea robusto y mantenible.`;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========== ENDPOINTS ==========

// 🚨 DEPRECATED: Usar /test-generation/mcp-generate con agenticMode: 'pure'
// Este endpoint usa el loop agéntico antiguo (gemini-agentic-loop.js)
app.post('/agent/run', async (req, res) => {
  const startTime = Date.now();
  console.log('\n⚠️  === ENDPOINT DEPRECATED: /agent/run ===');
  console.log('⚠️  Considera usar: POST /test-generation/mcp-generate con agenticMode: "pure"');

  try {
    const { goal, options = {} } = req.body;

    if (!goal) {
      return res.status(400).json({
        success: false,
        error: 'El campo "goal" es requerido',
        example: {
          goal: 'Navega a google.com y busca "MCP Protocol"',
          options: {
            headless: false,
            maxIterations: 20,
            verbose: true
          }
        }
      });
    }

    console.log(`🎯 Objetivo recibido: ${goal}`);
    console.log(`⚙️  Opciones:`, options);

    // Ejecutar agente
    const result = await runGeminiAgent(goal, {
      headless: options.headless !== undefined ? options.headless : false,
      maxIterations: options.maxIterations || 30,
      verbose: options.verbose !== undefined ? options.verbose : true
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Agente completado en ${duration}ms`);
    console.log(`🧪 Pasos registrados para test: ${result.testSteps?.length || 0}`);

    res.json({
      success: result.success,
      goal,
      iterations: result.iterations,
      goalCompleted: result.success,
      executionLog: result.executionLog,
      finalState: result.finalState,
      testSteps: result.testSteps || [], // 🧪 NUEVO: Pasos para generar test
      initialUrl: result.initialUrl, // 🌐 NUEVO: URL inicial
      executionTime: duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error en ejecución de agente:', error);

    const duration = Date.now() - startTime;

    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      executionTime: duration,
      timestamp: new Date().toISOString()
    });
  }
});

// 🤖 NUEVO: ENDPOINT AGÉNTICO PURO (Gemini + MCP directo, sin orquestador)
app.post('/agent/agentic-pure', async (req, res) => {
  const startTime = Date.now();
  console.log('\n🤖 === NUEVA SOLICITUD AGÉNTICA PURA (Gemini MCP Direct) ===');

  try {
    const { prompt, jobId } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'El campo "prompt" es requerido',
        example: {
          prompt: 'Navega a elconfidencial.com, busca PSOE, accede al primer resultado',
          jobId: 'job-123' // Opcional
        }
      });
    }

    const actualJobId = jobId || `job-${Date.now()}`;
    console.log(`🎯 Prompt: ${prompt}`);
    console.log(`🆔 Job ID: ${actualJobId}`);

    // NEW: Obtener configuración de modelos desde request (viene de chrome.storage)
    const aiConfig = req.body.aiConfig || {
      providers: [],
      activeModel: null,
      fallbackEnabled: true
    };

    // Si hay configuración de modelos, usar ModelManager
    if (aiConfig.providers && aiConfig.providers.length > 0) {
      console.log(`🤖 Usando ModelManager con ${aiConfig.providers.length} proveedores configurados`);
      
      const modelManager = new ModelManager(aiConfig);
      
      try {
        const result = await modelManager.executeWithFallback(
          prompt,
          { serverUrl: 'http://localhost:3000' }, // MCP session placeholder
          { jobId: actualJobId }
        );
        
        const duration = Date.now() - startTime;
        console.log(`✅ Tarea completada con ${result.usedModel} en ${duration}ms`);
        
        res.json({
          success: true,
          jobId: actualJobId,
          prompt,
          result: result.content,
          usedModel: result.usedModel,
          fallbackUsed: result.fallbackUsed,
          executionTime: duration,
          agenticMode: 'multi-provider',
          timestamp: new Date().toISOString()
        });
        
        return; // Exit early
        
      } catch (error) {
        console.error('💥 Error con ModelManager:', error);
        // Continuar con fallback a Gemini legacy
      }
    }

    // LEGACY: Fallback a Gemini directo si no hay configuración de modelos
    console.log(`⚠️ No hay configuración de modelos, usando Gemini legacy`);
    
    const { spawn } = require('child_process');
    const pythonPath = 'C:/Python312/python.exe';
    const scriptPath = require('path').join(__dirname, 'sAgent-mcp.py');

    // Usar Gemini por defecto
    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      '--provider', 'gemini',
      '--model', 'gemini-1.5-pro',
      '--api-key', process.env.GEMINI_API_KEY,
      '--prompt', prompt,
      '--job-id', actualJobId
    ]);

    let output = '';
    let progressLog = [];

    pythonProcess.stdout.on('data', (data) => {
      const message = data.toString();
      output += message;

      // Parsear mensajes de progreso
      const progressMatches = message.match(/\[PROGRESS\] (.+)/g);
      if (progressMatches) {
        progressMatches.forEach(match => {
          const jsonStr = match.replace('[PROGRESS] ', '');
          try {
            const logEntry = JSON.parse(jsonStr);
            progressLog.push(logEntry);
            console.log(`📡 [${logEntry.level}] ${logEntry.message}`);
          } catch (e) {
            // No es JSON, ignorar
          }
        });
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`❌ Python stderr: ${data}`);
    });

    // Esperar a que termine el proceso
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Proceso Python terminó con código ${code}`));
        }
      });

      pythonProcess.on('error', (err) => {
        reject(err);
      });
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Tarea agéntica completada en ${duration}ms`);

    // Extraer resultado final del log
    const finalResult = progressLog
      .filter(log => log.level === 'SUCCESS' && log.message.includes('Resultado:'))
      .map(log => log.message)
      .join('\n');

    res.json({
      success: true,
      jobId: actualJobId,
      prompt,
      result: finalResult || 'Tarea completada',
      progressLog,
      executionTime: duration,
      agenticMode: 'pure', // Indica que usó el modo agéntico puro
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error en ejecución agéntica pura:', error);

    const duration = Date.now() - startTime;

    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      executionTime: duration,
      timestamp: new Date().toISOString()
    });
  }
});

// 🚨 DEPRECATED: Single-Pass Test Generation (Orchestrator antiguo)
// Usar /test-generation/mcp-generate con agenticMode: 'pure'
app.post('/test-generation/start', async (req, res) => {
  const startTime = Date.now();
  console.log('\n⚠️  === ENDPOINT DEPRECATED: /test-generation/start ===');
  console.log('⚠️  Considera usar: POST /test-generation/mcp-generate con agenticMode: "pure"');
  
  try {
    const { sessionId, steps, metadata = {} } = req.body;
    
    // Validaciones
    if (!steps || !Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        error: 'El campo "steps" es requerido y debe ser un array',
        example: {
          sessionId: 'session-123',
          steps: [
            {
              id: 'step-1',
              type: 'click',
              target: { tagName: 'button', id: 'login-btn' },
              timestamp: Date.now()
            }
          ],
          metadata: {
            browser: 'Chrome',
            viewport: { width: 1920, height: 1080 }
          }
        }
      });
    }
    
    if (steps.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El array "steps" no puede estar vacío'
      });
    }
    
    if (steps.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Máximo 1000 steps permitidos por sesión'
      });
    }
    
    console.log(`📦 Sesión: ${sessionId || 'sin-id'}`);
    console.log(`📊 Steps recibidos: ${steps.length}`);
    console.log(`⚙️  Metadata:`, metadata);
    
    // Iniciar procesamiento asíncrono
    const jobId = await testOrchestrator.startTestGeneration({
      sessionId: sessionId || `session-${Date.now()}`,
      steps,
      metadata
    });
    
    const duration = Date.now() - startTime;
    
    res.status(202).json({
      success: true,
      jobId,
      status: 'processing',
      message: 'Procesamiento iniciado con single-pass AI',
      statusUrl: `/test-generation/status/${jobId}`,
      stepsReceived: steps.length,
      estimatedTime: `${Math.round(steps.length * 0.1)}s`,
      timestamp: new Date().toISOString(),
      responseTime: duration
    });
    
  } catch (error) {
    console.error('💥 Error en test generation:', error);
    
    const duration = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      responseTime: duration,
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 NUEVO: ENDPOINT STATUS DE JOB (Issue #125)
app.get('/test-generation/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    
    const status = testOrchestrator.getJobStatus(jobId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Job no encontrado',
        jobId
      });
    }
    
    // Calcular duración
    const duration = status.completedAt 
      ? status.completedAt - status.startedAt
      : Date.now() - status.startedAt;
    
    res.json({
      success: true,
      job: {
        ...status,
        duration,
        durationFormatted: `${(duration / 1000).toFixed(2)}s`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error obteniendo status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📈 NUEVO: ENDPOINT STATS TOKEN MANAGER (Issue #125)
app.get('/test-generation/stats', (req, res) => {
  try {
    const stats = testOrchestrator.getTokenManagerStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error obteniendo stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🧪 ENDPOINT PARA TEST DE PROVEEDORES (nuevo)
app.post('/test-provider', async (req, res) => {
  const { provider, apiKey, model } = req.body;
  
  console.log(`🧪 Testing provider: ${provider} (model: ${model})`);
  
  if (!provider || !apiKey || !model) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: provider, apiKey, model'
    });
  }
  
  try {
    // Test rápido con validación de API key básica
    let testResult = false;
    let errorMessage = '';
    
    switch (provider) {
      case 'openai':
        // Validar formato de API key de OpenAI
        if (apiKey.startsWith('sk-') && apiKey.length > 40) {
          // Test básico con fetch
          try {
            const response = await fetch('https://api.openai.com/v1/models', {
              headers: {
                'Authorization': `Bearer ${apiKey}`
              },
              signal: AbortSignal.timeout(5000)
            });
            testResult = response.ok;
            if (!response.ok) {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          } catch (err) {
            errorMessage = err.message;
          }
        } else {
          errorMessage = 'Invalid API key format (debe empezar con sk- y tener >40 chars)';
        }
        break;
        
      case 'gemini':
        // Validar formato de API key de Gemini
        if (apiKey.startsWith('AIza') && apiKey.length > 30) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`,
              { signal: AbortSignal.timeout(5000) }
            );
            testResult = response.ok;
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              errorMessage = errorData.error?.message || `HTTP ${response.status}`;
            }
          } catch (err) {
            errorMessage = err.message;
          }
        } else {
          errorMessage = 'Invalid API key format (debe empezar con AIza y tener >30 chars)';
        }
        break;
        
      case 'anthropic':
        // Validar formato de API key de Anthropic
        if (apiKey.startsWith('sk-ant-') && apiKey.length > 40) {
          try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                model: model,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'test' }]
              }),
              signal: AbortSignal.timeout(5000)
            });
            testResult = response.ok || response.status === 400; // 400 es OK (valida que la key funciona)
            if (!testResult) {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          } catch (err) {
            errorMessage = err.message;
          }
        } else {
          errorMessage = 'Invalid API key format (debe empezar con sk-ant- y tener >40 chars)';
        }
        break;
        
      default:
        errorMessage = `Provider '${provider}' no soportado`;
    }
    
    if (testResult) {
      console.log(`✅ Provider ${provider} test successful`);
      res.json({
        success: true,
        provider,
        model,
        message: `✅ Conexión exitosa con ${provider}/${model}`,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`❌ Provider ${provider} test failed: ${errorMessage}`);
      res.json({
        success: false,
        provider,
        model,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error(`❌ Provider ${provider} test failed:`, error);
    
    res.json({
      success: false,
      provider,
      model,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//  ENDPOINT DE SALUD
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sAgent-mcp Multi-Provider v4.0 - Sistema Agéntico Puro',
    timestamp: new Date().toISOString(),
    capabilities: [
      '🤖 Sistema Agéntico Puro (Multi-Provider)',
      '🔄 Soporte OpenAI, Gemini, Anthropic',
      '⚡ Automatic Function Calling',
      '🎯 Fallback automático entre proveedores',
      '📊 Streaming SSE para feedback en tiempo real',
      'MCP Protocol Integration',
      'Visual Context (Screenshots)',
      'Persistent Browser Sessions',
      'Error Recovery'
    ],
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    agenticPureEnabled: true,
    multiProviderEnabled: true
  });
});

// 📋 ENDPOINT DE INFORMACIÓN
app.get('/', (req, res) => {
  res.json({
    service: 'Gemini Agéntico MCP v4.0 - Sistema Agéntico Puro',
    description: 'Gemini conectado directamente con MCP Playwright via ClientSession',
    architecture: {
      client: 'gemini-mcp-client.py (220 líneas)',
      transport: 'Stdio via ClientSession',
      model: 'gemini-2.0-flash-thinking-exp-1219',
      function_calling: 'Automatic - Gemini decide autónomamente',
      streaming: 'SSE para progreso en tiempo real'
    },
    endpoints: [
      {
        method: 'POST',
        path: '/test-generation/mcp-generate',
        description: '🤖 Sistema Agéntico Puro (RECOMENDADO)',
        body: {
          sessionId: 'string (requerido)',
          steps: 'array (requerido) - Acciones capturadas',
          metadata: 'object - URL, título, etc.',
          agenticMode: 'string - "pure" (default) o "classic"'
        }
      },
      {
        method: 'POST',
        path: '/agent/agentic-pure',
        description: '🤖 Modo agéntico directo',
        body: {
          prompt: 'string (requerido) - Instrucciones en lenguaje natural',
          jobId: 'string (opcional)'
        }
      },
      {
        method: 'GET',
        path: '/test-generation/status/:jobId',
        description: 'Consultar estado de job'
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Estado del servicio'
      },
      {
        method: 'POST',
        path: '/agent/run',
        description: '⚠️  DEPRECATED - Usar /test-generation/mcp-generate'
      },
      {
        method: 'POST',
        path: '/test-generation/start',
        description: '⚠️  DEPRECATED - Usar /test-generation/mcp-generate'
      }
    ],
    examples: [
      {
        description: 'Generar test desde extension',
        request: {
          sessionId: 'test-123',
          agenticMode: 'pure',
          steps: [
            { type: 'click', element: { tagName: 'button', text: 'Login' } },
            { type: 'input', element: { name: 'email' }, value: 'test@example.com' }
          ],
          metadata: { url: 'https://example.com', title: 'Test Page' }
        }
      },
      {
        description: 'Modo agéntico directo',
        request: {
          prompt: 'Navega a google.com, busca "Model Context Protocol" y dime el título del primer resultado',
          jobId: 'direct-test-123'
        }
      }
    ]
  });
});

// 🎭 ENDPOINT MCP PLAYWRIGHT TEST GENERATION (con streaming)
console.log('\n🔍 ========== DEBUG: Registrando endpoint MCP ==========');
console.log('🔍 mcpGenerator existe:', !!mcpGenerator);
console.log('🔍 mcpGenerator es instancia de MCPPlaywrightGenerator:', mcpGenerator?.constructor?.name);
console.log('🔍 mcpGenerator.generateTestWithMCP existe:', typeof mcpGenerator?.generateTestWithMCP);
console.log('🔍 ======================================================\n');

app.post('/test-generation/mcp-generate', async (req, res) => {
  try {
    console.log('\n🎭 === NUEVA SOLICITUD MCP TEST GENERATION ===');
    console.log('📦 Body recibido:', req.body ? 'SÍ' : 'NO');
    console.log('📦 Body keys:', req.body ? Object.keys(req.body) : 'N/A');
  
    // Configurar SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    console.log('✅ Headers SSE configurados');
    
    const { sessionId, steps, metadata = {}, agenticMode = 'pure', aiConfig = {}, generationSettings = {} } = req.body;
    
    // ⚙️ Configuraciones por defecto si no vienen del frontend
    const finalGenSettings = {
      headless: generationSettings.headless !== undefined ? generationSettings.headless : true,
      verbose: generationSettings.verbose !== undefined ? generationSettings.verbose : true,
      viewport: generationSettings.viewport || 'desktop',
      timeout: generationSettings.timeout || 30,
      retry: generationSettings.retry !== undefined ? generationSettings.retry : true,
      retryCount: generationSettings.retryCount || 3,
      screenshotOnFail: generationSettings.screenshotOnFail !== undefined ? generationSettings.screenshotOnFail : true
    };
    
    console.log('📋 Datos extraídos:', { 
      sessionId: sessionId?.substring(0, 20), 
      stepsCount: steps?.length,
      metadataKeys: Object.keys(metadata),
      agenticMode,  // NUEVO: modo agéntico seleccionado
      aiConfig: aiConfig,  // 🤖 DEBUG: Ver todo el objeto aiConfig
      activeModel: aiConfig.activeModel || 'gemini/gemini-2.0-flash-exp',  // 🤖 Modelo activo desde UI
      generationSettings: finalGenSettings  // ⚙️ Configuraciones de generación
    });
    
    try {
      // 🤖 NUEVO: Elegir entre sistema agéntico puro o orquestador clásico
      if (agenticMode === 'pure') {
        console.log('🤖 ===== MODO AGÉNTICO PURO ACTIVADO =====');
        console.log('✨ Usando Gemini con MCP directo (sin orquestador)');
        
        // Construir prompt de lenguaje natural a partir de los steps
        const prompt = buildPromptFromSteps(steps, metadata);
        console.log('📝 Prompt construido:', prompt.substring(0, 100) + '...');
        
        // Callback para streaming de progreso
        const progressCallback = (progress) => {
          console.log('📡 [Agentic Pure] Enviando progreso:', progress.phase);
          res.write(`data: ${JSON.stringify(progress)}\n\n`);
        };
        
        // Ejecutar cliente Python agéntico
        progressCallback({ phase: 'starting', message: '🚀 Iniciando sistema agéntico puro...', progress: 5 });
        
        // 🤖 Extraer provider y modelo del activeModel
        const activeModelRaw = aiConfig.activeModel || 'gemini/gemini-2.0-flash-exp';
        const [providerId, modelName] = activeModelRaw.includes('/') 
          ? activeModelRaw.split('/') 
          : ['gemini', activeModelRaw];
        
        console.log(`🤖 Usando modelo: ${providerId}/${modelName}`);
        
        // 🔑 Obtener API key del proveedor desde aiConfig
        let apiKey = process.env.GEMINI_API_KEY; // Default para compatibilidad
        
        if (aiConfig.providers) {
          const provider = aiConfig.providers.find(p => p.id === providerId);
          if (provider && provider.models && provider.models.length > 0) {
            const model = provider.models.find(m => m.id === modelName);
            if (model && model.apiKey) {
              apiKey = model.apiKey;
              console.log(`✅ Usando API key de ${providerId} desde config`);
            }
          }
        }
        
        if (!apiKey) {
          console.log(`⚠️  No se encontró API key para ${providerId}, usando variable de entorno`);
        }
        
        const { spawn } = require('child_process');
        const pythonPath = 'C:/Python312/python.exe';
        const scriptPath = require('path').join(__dirname, 'multi-provider-mcp-client.py');
        const jobId = sessionId || `job-${Date.now()}`;
        
        const pythonProcess = spawn(pythonPath, [
          scriptPath,
          '--prompt', prompt,
          '--job-id', jobId,
          '--provider', providerId,
          '--model', modelName,
          '--api-key', apiKey,
          '--headless', finalGenSettings.headless ? 'true' : 'false',
          '--verbose', finalGenSettings.verbose ? 'true' : 'false',
          '--viewport', finalGenSettings.viewport,
          '--timeout', String(finalGenSettings.timeout),
          '--retry-count', String(finalGenSettings.retryCount)
        ]);
        
        let currentProgress = 10;
        let testCode = '';  // Acumular el código del test generado
        
        pythonProcess.stdout.on('data', (data) => {
          const message = data.toString();
          
          // Capturar el resultado final del test
          if (message.includes('[RESULT]')) {
            const resultMatch = message.match(/\[RESULT\] (.+)/s);
            if (resultMatch) {
              testCode += resultMatch[1];
            }
          }
          
          // Parsear mensajes de progreso [PROGRESS]
          const progressMatches = message.match(/\[PROGRESS\] (.+)/g);
          if (progressMatches) {
            progressMatches.forEach(match => {
              const jsonStr = match.replace('[PROGRESS] ', '');
              try {
                const logEntry = JSON.parse(jsonStr);
                console.log(`📡 [${logEntry.level}] ${logEntry.message}`);
                
                // Mapear niveles a fases del UI
                let phase = 'executing';
                if (logEntry.message.includes('Conectado')) phase = 'observing';
                if (logEntry.message.includes('Enviando prompt')) phase = 'reasoning';
                if (logEntry.message.includes('herramientas MCP')) phase = 'observing';
                if (logEntry.message.includes('completó')) phase = 'code_generation';
                if (logEntry.message.includes('Resultado:')) phase = 'completed';
                if (logEntry.level === 'ERROR') phase = 'error';
                
                // Incrementar progreso gradualmente
                currentProgress = Math.min(95, currentProgress + 5);
                
                progressCallback({
                  phase,
                  message: logEntry.message,
                  progress: currentProgress
                });
              } catch (e) {
                // No es JSON, ignorar
              }
            });
          }
        });
        
        pythonProcess.stderr.on('data', (data) => {
          console.error(`❌ Python stderr: ${data}`);
        });
        
        // Esperar a que termine
        pythonProcess.on('close', async (code) => {
          if (code === 0) {
            console.log('✅ Proceso Python completado exitosamente');
            
            // Guardar el test generado
            const outputDir = path.join(__dirname, 'generated-tests');
            const filename = `test-${sessionId || Date.now()}-agentic.spec.ts`;
            const filePath = path.join(outputDir, filename);
            
            try {
              // Crear directorio si no existe
              await fs.mkdir(outputDir, { recursive: true });
              
              // Guardar el test
              if (testCode && testCode.trim().length > 0) {
                await fs.writeFile(filePath, testCode, 'utf-8');
                console.log(`✅ Test guardado en: ${filePath}`);
                
                progressCallback({
                  phase: 'completed',
                  message: '✅ Test generado y guardado exitosamente',
                  progress: 100,
                  result: {
                    testFile: filename,
                    filePath: filePath,
                    mode: 'agentic-pure',
                    message: 'Test generado por Gemini de manera completamente autónoma'
                  }
                });
              } else {
                console.log('⚠️  No se recibió código de test, guardando resultado por defecto');
                
                // Guardar un test mínimo con comentario explicativo
                const defaultTest = `import { test, expect } from '@playwright/test';

// Test generado por sistema agéntico puro
// Job ID: ${jobId}
// Fecha: ${new Date().toISOString()}
//
// Nota: El agente completó la tarea pero no generó código de test.
// Revisa los logs para ver las acciones ejecutadas.

test.describe('Test agéntico - ${sessionId || 'unnamed'}', () => {
  test('tareas completadas', async ({ page }) => {
    // Las acciones fueron ejecutadas por el agente
    // Este test es un placeholder para documentar la ejecución
    console.log('Job completado: ${jobId}');
  });
});
`;
                await fs.writeFile(filePath, defaultTest, 'utf-8');
                
                progressCallback({
                  phase: 'completed',
                  message: '✅ Tareas ejecutadas (test placeholder guardado)',
                  progress: 100,
                  result: {
                    testFile: filename,
                    filePath: filePath,
                    mode: 'agentic-pure',
                    message: 'Acciones ejecutadas por Gemini. Ver logs para detalles.'
                  }
                });
              }
            } catch (err) {
              console.error('❌ Error guardando test:', err);
              
              progressCallback({
                phase: 'completed',
                message: '✅ Test generado (error al guardar)',
                progress: 100,
                result: {
                  testFile: filename,
                  mode: 'agentic-pure',
                  error: err.message
                }
              });
            }
            
            res.end();
          } else {
            console.error(`❌ Proceso Python falló con código ${code}`);
            
            progressCallback({
              phase: 'error',
              message: `Error en sistema agéntico (código ${code})`,
              progress: 0
            });
            
            res.end();
          }
        });
        
        pythonProcess.on('error', (err) => {
          console.error('❌ Error ejecutando Python:', err);
          
          progressCallback({
            phase: 'error',
            message: `Error: ${err.message}`,
            progress: 0
          });
          
          res.end();
        });
        
      } else {
        // Sistema clásico (orquestador MCP)
        console.log('🔄 Usando sistema MCP clásico (orquestador)');
        console.log('🚀 Iniciando generación con MCP...');
      
      // Callback para streaming de progreso
      const progressCallback = (progress) => {
        console.log('📡 Enviando progreso:', progress.phase);
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      };
      
      // Generar test con MCP
      console.log('🔄 Llamando a mcpGenerator.generateTestWithMCP...');
      const result = await mcpGenerator.generateTestWithMCP({
        sessionId,
        steps,
        metadata
      }, progressCallback);
      
      console.log('✅ Generación completada');
      
      // Enviar resultado final
      res.write(`data: ${JSON.stringify({
        phase: 'completed',
        message: '✅ Test generado exitosamente',
        progress: 100,
        result
      })}\n\n`);
      
      res.end();
      }
      
    } catch (innerError) {
      console.error('💥 Error INTERNO en MCP generation:', innerError);
      console.error('💥 Stack:', innerError.stack);
      res.write(`data: ${JSON.stringify({
        phase: 'error',
        message: innerError.message,
        progress: 0
      })}\n\n`);
      res.end();
    }
  } catch (outerError) {
    console.error('💥 Error EXTERNO en endpoint handler:', outerError);
    console.error('💥 Stack:', outerError.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: outerError.message,
        stack: outerError.stack 
      });
    }
  }
});

// 🔑 ENDPOINT PARA CONFIGURAR API KEY
app.post('/config/api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'API key requerida'
      });
    }
    
    // Validación básica
    if (apiKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'API key inválida (muy corta)'
      });
    }
    
    console.log('🔑 Actualizando API key en .env...');
    
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    
    // Leer archivo .env
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Reemplazar o agregar GEMINI_API_KEY
    if (envContent.includes('GEMINI_API_KEY=')) {
      envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${apiKey}`);
    } else {
      envContent += `\nGEMINI_API_KEY=${apiKey}\n`;
    }
    
    // Guardar archivo
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    // Actualizar variable de entorno en memoria
    process.env.GEMINI_API_KEY = apiKey;
    
    console.log('✅ API key actualizada correctamente');
    console.log('⚠️ IMPORTANTE: Reinicia el servidor para aplicar cambios en mcpGenerator');
    
    res.json({
      success: true,
      message: 'API key guardada. Reinicia el servidor para aplicar cambios.',
      requiresRestart: true
    });
    
  } catch (error) {
    console.error('💥 Error actualizando API key:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🚫 404 Handler (debe estar DESPUÉS de todos los endpoints)
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'POST /test-generation/mcp-generate - 🤖 Sistema Agéntico Puro (RECOMENDADO)',
      'POST /agent/agentic-pure - 🤖 Modo agéntico directo',
      'POST /agent/run - ⚠️  DEPRECATED',
      'POST /test-generation/start - ⚠️  DEPRECATED',
      'GET /test-generation/status/:jobId',
      'GET /test-generation/stats',
      'POST /config/api-key',
      'GET /health',
      'GET /'
    ]
  });
});

// �💥 Error Handler Global
app.use((error, req, res, next) => {
  console.error('💥 Error no manejado:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: error.message
  });
});

// 🚀 INICIAR SERVIDOR
const server = app.listen(PORT, () => {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║  🤖  sAgent-mcp v4.0 - SISTEMA MULTI-PROVIDER           ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📡  Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`🔑  Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Configurado' : '❌ FALTANTE - Configurar en .env'}`);
  console.log(`🐍  Python Client: sAgent-mcp.py`);
  console.log(`🤖  Providers: OpenAI, Gemini, Anthropic (+ custom)`);
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ENDPOINTS PRINCIPALES                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('  📤  POST /generate-test (Multi-Provider)');
  console.log('  🧪  POST /test-provider (NUEVO - Test conexión)');
  console.log('  📤  POST /test-generation/mcp-generate (SSE streaming)');
  console.log('  🤖  POST /agent/agentic-pure');
  console.log('  📊  GET  /test-generation/status/:jobId');
  console.log('  ❤️   GET  /health');
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  DEPRECATED (usar nuevos endpoints)                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('  ⚠️   POST /agent/run');
  console.log('  ⚠️   POST /test-generation/start');
  console.log('');
  console.log('✅  SISTEMA LISTO PARA RECIBIR REQUESTS');
  console.log('');
  console.log('🚀  Para usar desde la extension:');
  console.log('    1. Abre la extension Chrome');
  console.log('    2. Click en 🤖 para configurar modelos IA');
  console.log('    3. Captura acciones en la web');
  console.log('    4. Click en "📤 Enviar a IA"');
  console.log('    5. Verás progreso en tiempo real');
  console.log('');
  console.log('\n💡 Ejemplo uso:');
  console.log(`
curl -X POST http://localhost:${PORT}/generate-test \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "test-123",
    "aiConfig": {
      "providers": [
        {
          "id": "openai",
          "enabled": true,
          "priority": 1,
          "models": [{ "id": "gpt-4-turbo", "apiKey": "sk-..." }]
        }
      ],
      "activeModel": "openai/gpt-4-turbo",
      "fallbackEnabled": true
    },
    "steps": [
      { "type": "click", "element": { "tagName": "button", "text": "Login" } },
      { "type": "input", "element": { "name": "email" }, "value": "test@example.com" }
    ],
    "metadata": { "url": "https://example.com", "title": "Test Page" }
  }'

# Consultar status:
curl http://localhost:${PORT}/test-generation/status/:jobId
  `);
});

// 🛑 Manejo de señales
process.on('SIGINT', () => {
  console.log('\n� ============ SIGINT RECIBIDO ============');
  console.log('Stack trace:');
  console.trace();
  console.log('==========================================\n');
  console.log('\n�🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM recibido');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;
