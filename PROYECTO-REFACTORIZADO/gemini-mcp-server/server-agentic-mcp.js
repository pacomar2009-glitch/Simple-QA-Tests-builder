// 🌐 SERVIDOR EXPRESS PARA GEMINI AGÉNTICO MCP
// Expone el loop agéntico como API REST para integraciones (n8n, etc.)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runGeminiAgent } = require('./gemini-agentic-loop');

const app = express();
const PORT = process.env.PORT || 4000;

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

// 🏥 ENDPOINT DE SALUD
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Gemini Agéntico MCP v2.0',
    timestamp: new Date().toISOString(),
    capabilities: [
      'True Agentic Loop (Observe → Think → Act → Learn)',
      'MCP Protocol Integration',
      'Gemini Function Calling',
      'Visual Context (Screenshots)',
      'Persistent Browser Sessions',
      'Error Recovery'
    ],
    geminiConfigured: !!process.env.GEMINI_API_KEY
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
  console.log('🤖 GEMINI AGÉNTICO MCP v2.0 - INICIADO');
  console.log('========================================');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Configurado' : '❌ Faltante'}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`📋 Info: http://localhost:${PORT}/`);
  console.log(`🚀 Endpoint: POST http://localhost:${PORT}/agent/run`);
  console.log('========================================\n');
  console.log('✅ Sistema listo para recibir objetivos agénticos');
  console.log('📖 Documentación completa en http://localhost:' + PORT);
  console.log('\n💡 Ejemplo de uso:');
  console.log(`
curl -X POST http://localhost:${PORT}/agent/run \\
  -H "Content-Type: application/json" \\
  -d '{
    "goal": "Navega a example.com y captura el título",
    "options": { "headless": false }
  }'
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
