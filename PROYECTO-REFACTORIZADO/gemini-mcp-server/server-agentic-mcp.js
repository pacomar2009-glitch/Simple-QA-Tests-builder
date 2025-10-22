// 🌐 SERVIDOR EXPRESS PARA GEMINI AGÉNTICO MCP
// Expone el loop agéntico como API REST para integraciones (n8n, etc.)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runGeminiAgent } = require('./gemini-agentic-loop');
const { TestGenerationOrchestrator } = require('./src/orchestrators/test-generation-orchestrator');
const { MCPPlaywrightGenerator } = require('./src/generators/mcp-playwright-generator');

const app = express();
const PORT = process.env.PORT || 4000;

// Inicializar orchestrator (issue #125)
const testOrchestrator = new TestGenerationOrchestrator();

// Inicializar MCP Generator
const mcpGenerator = new MCPPlaywrightGenerator(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 🎯 ENDPOINT PRINCIPAL - Ejecutar Agente
app.post('/agent/run', async (req, res) => {
  const startTime = Date.now();
  console.log('\n🚀 === NUEVA SOLICITUD DE AGENTE ===');

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

// � NUEVO: ENDPOINT SINGLE-PASS TEST GENERATION (Issue #125)
app.post('/test-generation/start', async (req, res) => {
  const startTime = Date.now();
  console.log('\n🎯 === NUEVA SOLICITUD DE TEST GENERATION (SINGLE-PASS) ===');
  
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

//  ENDPOINT DE SALUD
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Gemini Agéntico MCP v3.0 + Single-Pass Test Generation',
    timestamp: new Date().toISOString(),
    capabilities: [
      'True Agentic Loop (Observe → Think → Act → Learn)',
      'MCP Protocol Integration',
      'Gemini Function Calling',
      'Visual Context (Screenshots)',
      'Persistent Browser Sessions',
      'Error Recovery',
      '✨ NEW: Single-Pass Test Generation (Issue #125)',
      '✨ NEW: Adaptive Token Manager',
      '✨ NEW: Rate Limiting (RPM/TPM/RPD)',
      '✨ NEW: Semantic Fragmentation'
    ],
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    singlePassEnabled: true
  });
});

// 📋 ENDPOINT DE INFORMACIÓN
app.get('/', (req, res) => {
  res.json({
    service: 'Gemini Agéntico MCP v2.0',
    description: 'Sistema agéntico verdadero: Gemini usa MCP para controlar Playwright',
    architecture: {
      mcp_server: 'Playwright tools exposed via MCP protocol',
      agentic_loop: 'Gemini observes → thinks → acts → learns in continuous cycle',
      function_calling: 'Gemini uses native function calling to invoke MCP tools',
      visual_context: 'Screenshots sent to Gemini for visual analysis'
    },
    endpoints: [
      {
        method: 'POST',
        path: '/agent/run',
        description: 'Ejecutar agente con un objetivo',
        body: {
          goal: 'string (requerido) - Objetivo en lenguaje natural',
          options: {
            headless: 'boolean - Ejecutar navegador sin UI',
            maxIterations: 'number - Máximo de iteraciones',
            verbose: 'boolean - Logging detallado'
          }
        }
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Estado del servicio'
      },
      {
        method: 'GET',
        path: '/',
        description: 'Información del servicio'
      }
    ],
    examples: [
      {
        description: 'Búsqueda simple',
        request: {
          goal: 'Navega a google.com y busca "Model Context Protocol"',
          options: { headless: false }
        }
      },
      {
        description: 'Completar formulario',
        request: {
          goal: 'Navega a example.com/contact, llena el formulario con nombre "Test User" y email "test@example.com", y envíalo',
          options: { headless: false, maxIterations: 20 }
        }
      },
      {
        description: 'Extracción de datos',
        request: {
          goal: 'Navega a news.ycombinator.com y dame los títulos de los primeros 5 posts',
          options: { headless: true }
        }
      }
    ]
  });
});

// 🚫 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    availableEndpoints: [
      'POST /agent/run',
      'GET /health',
      'GET /'
    ]
  });
});

// 🎭 ENDPOINT MCP PLAYWRIGHT TEST GENERATION (con streaming)
app.post('/test-generation/mcp-generate', async (req, res) => {
  console.log('\n🎭 === NUEVA SOLICITUD MCP TEST GENERATION ===');
  
  // Configurar SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  const { sessionId, steps, metadata = {} } = req.body;
  
  try {
    // Callback para streaming de progreso
    const progressCallback = (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    };
    
    // Generar test con MCP
    const result = await mcpGenerator.generateTestWithMCP({
      sessionId,
      steps,
      metadata
    }, progressCallback);
    
    // Enviar resultado final
    res.write(`data: ${JSON.stringify({
      phase: 'completed',
      message: '✅ Test generado exitosamente',
      progress: 100,
      result
    })}\n\n`);
    
    res.end();
    
  } catch (error) {
    console.error('💥 Error en MCP generation:', error);
    res.write(`data: ${JSON.stringify({
      phase: 'error',
      message: error.message,
      progress: 0
    })}\n\n`);
    res.end();
  }
});

// 💥 Error Handler Global
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
  console.log('\n🎉 ========================================');
  console.log('🤖 GEMINI MCP v3.0 + SINGLE-PASS TEST GEN');
  console.log('========================================');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`📋 Info: http://localhost:${PORT}/`);
  console.log('\n🚀 ENDPOINTS DISPONIBLES:');
  console.log(`   POST   /agent/run              - Agente loop completo`);
  console.log(`   POST   /test-generation/start  - ✨ Single-Pass Test Gen (Issue #125)`);
  console.log(`   POST   /test-generation/mcp-generate - 🎭 MCP Test Gen con streaming (SSE)`);
  console.log(`   GET    /test-generation/status/:jobId - Status de job`);
  console.log(`   GET    /test-generation/stats  - Token manager stats`);
  console.log('========================================\n');
  console.log('✅ Sistema listo:');
  console.log('   • Agente MCP loop');
  console.log('   • Single-Pass Test Generation');
  console.log('   • Adaptive Token Manager');
  console.log('\n💡 Ejemplo Single-Pass:');
  console.log(`
curl -X POST http://localhost:${PORT}/test-generation/start \\
  -H "Content-Type: application/json" \\
  -d '{
    "steps": [
      { "type": "click", "element": { "tagName": "button", "text": "Login" } },
      { "type": "input", "element": { "name": "email" }, "value": "test@example.com" }
    ],
    "metadata": { "url": "https://example.com", "title": "Test Page" }
  }'

# Luego consultar el status:
curl http://localhost:${PORT}/test-generation/status/:jobId
  `);
});

// 🛑 Manejo de señales
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
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
