// 🌐 SERVIDOR EXPRESS PARA GEMINI AGÉNTICO MCP
// Expone el loop agéntico como API REST para integraciones (n8n, etc.)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
    
    const { sessionId, steps, metadata = {} } = req.body;
    
    console.log('📋 Datos extraídos:', { 
      sessionId: sessionId?.substring(0, 20), 
      stepsCount: steps?.length,
      metadataKeys: Object.keys(metadata)
    });
    
    try {
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
      'POST /agent/run',
      'POST /test-generation/start',
      'POST /test-generation/mcp-generate',
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
