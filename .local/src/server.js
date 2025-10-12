import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

import { convertToMCP, validateMCP } from './engines/mcp-converter.js';
import { generateGherkinFeature, generateTestCaseDocument, generateStepByStepGuide } from './generators/manual.js';
import { generatePlaywrightTest, generatePlaywrightConfig } from './engines/mcp-to-pw.js';
import { runPlaywrightTests, checkPlaywrightInstallation } from './runners/playwright-runner.js';
import { BrowserAutomationEngine } from './engines/browser-automation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Port management functions
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000, endPort = 3010) {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${endPort}`);
}

// 🛡️ ERROR PREVENTION & RECOVERY SYSTEM
class MCPErrorRecovery {
  constructor() {
    this.errorCount = 0;
    this.lastError = null;
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
  }

  setupGlobalErrorHandlers() {
    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 [ERROR-RECOVERY] Unhandled Promise Rejection:', reason);
      this.handleCriticalError('unhandledRejection', reason);
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('🚨 [ERROR-RECOVERY] Uncaught Exception:', error);
      this.handleCriticalError('uncaughtException', error);
    });

    // Graceful shutdown signals
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  handleCriticalError(type, error) {
    this.errorCount++;
    this.lastError = { type, error, timestamp: new Date().toISOString() };

    console.error(`💥 [ERROR-RECOVERY] Critical error #${this.errorCount}:`, {
      type,
      message: error.message,
      stack: error.stack
    });

    if (this.recoveryAttempts < this.maxRecoveryAttempts) {
      this.attemptRecovery();
    } else {
      console.error('❌ [ERROR-RECOVERY] Max recovery attempts reached, shutting down gracefully');
      this.gracefulShutdown('maxRecoveryReached');
    }
  }

  attemptRecovery() {
    this.recoveryAttempts++;
    console.log(`🔄 [ERROR-RECOVERY] Attempting recovery #${this.recoveryAttempts}...`);

    setTimeout(() => {
      try {
        // Reset error state
        this.errorCount = Math.max(0, this.errorCount - 1);
        console.log('✅ [ERROR-RECOVERY] Recovery attempt completed');
      } catch (recoveryError) {
        console.error('❌ [ERROR-RECOVERY] Recovery failed:', recoveryError);
      }
    }, 5000);
  }

  gracefulShutdown(reason) {
    console.log(`🛑 [ERROR-RECOVERY] Graceful shutdown initiated: ${reason}`);
    
    // Close server connections
    if (global.mcpServer) {
      global.mcpServer.close(() => {
        console.log('✅ [ERROR-RECOVERY] Server closed successfully');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }

  getErrorStats() {
    return {
      errorCount: this.errorCount,
      lastError: this.lastError,
      recoveryAttempts: this.recoveryAttempts,
      uptime: process.uptime()
    };
  }
}

// Initialize error recovery system
const errorRecovery = new MCPErrorRecovery();
errorRecovery.setupGlobalErrorHandlers();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));

// Static file serving for artifacts and runs
app.use('/artifacts', express.static(path.join(projectRoot, 'artifacts')));
app.use('/runs', express.static(path.join(projectRoot, 'runs')));

// Utility functions
async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function saveJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function loadJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load JSON from ${filePath}: ${error.message}`);
  }
}

// API Routes

/**
 * POST /generate
 * Receives captured steps and generates all test artifacts
 * 
 * Body: {
 *   url: string,
 *   steps: Array<{type, selector, value, meta}>,
 *   instructions?: string,
 *   sessionId?: string
 * }
 * 
 * Returns: {
 *   jobId: string,
 *   statusUrl: string,
 *   status: 'processing' | 'completed' | 'failed'
 * }
 */
app.post('/api/generate', async (req, res) => {
  const jobId = uuidv4();
  const timestamp = new Date().toISOString();
  
  console.log(`🚀 [${jobId}] Starting ENHANCED test generation with browser automation for ${req.body.url}`);
  
  try {
    const { url, steps, instructions = '', sessionId } = req.body;
    
    // Validate input
    if (!url || !steps || !Array.isArray(steps)) {
      return res.status(400).json({
        error: 'Invalid input: url and steps array are required',
        jobId
      });
    }
    
    if (steps.length === 0) {
      return res.status(400).json({
        error: 'No steps provided for test generation',
        jobId
      });
    }

    // Create job directories
    const jobDir = path.join(projectRoot, 'runs', jobId);
    const artifactsDir = path.join(projectRoot, 'artifacts', jobId);
    const manualDir = path.join(artifactsDir, 'manual');
    
    await ensureDir(jobDir);
    await ensureDir(artifactsDir);
    await ensureDir(manualDir);

    // Save original input
    const originalInput = {
      jobId,
      timestamp,
      sessionId,
      url,
      steps,
      instructions,
      metadata: {
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin
      }
    };
    
    await saveJSON(path.join(jobDir, 'input.json'), originalInput);

    // ✨ NUEVA FUNCIONALIDAD: Browser Automation
    console.log(`🎬 [${jobId}] Initializing browser automation...`);
    const automationEngine = new BrowserAutomationEngine();
    
    let enhancedSteps = [];
    let manualTest = null;
    let automatedTest = null;
    
    try {
      // Inicializar navegador
      await automationEngine.initialize();
      
      // Reproducir pasos y capturar información robusta
      console.log(`🔄 [${jobId}] Reproducing ${steps.length} captured steps...`);
      enhancedSteps = await automationEngine.reproduceSteps(steps, url);
      
      // Generar test manual
      console.log(`📋 [${jobId}] Generating manual test...`);
      manualTest = automationEngine.generateManualTest();
      
      // Generar test automatizado
      console.log(`🤖 [${jobId}] Generating automated test...`);
      automatedTest = automationEngine.generateAutomatedTest();
      
      console.log(`✅ [${jobId}] Browser automation completed successfully`);
      
    } catch (automationError) {
      console.error(`❌ [${jobId}] Browser automation failed:`, automationError);
      // Continuar con generación tradicional como fallback
    } finally {
      await automationEngine.cleanup();
    }

    // Si browser automation funcionó, usar resultados mejorados
    if (enhancedSteps.length > 0 && automatedTest) {
      console.log(`🎯 [${jobId}] Using enhanced browser automation results`);
      
      // Guardar tests generados
      await fs.writeFile(
        path.join(artifactsDir, 'manual-test.txt'),
        `${manualTest.title}\n\n${manualTest.description}\n\nSteps:\n${manualTest.steps.join('\n')}\n\nExpected Results:\n${manualTest.expectedResults}`,
        'utf8'
      );
      
      await fs.writeFile(
        path.join(jobDir, 'test.spec.ts'),
        automatedTest,
        'utf8'
      );

      // Respuesta exitosa con optimización
      return res.status(200).json({
        success: true,
        jobId,
        content: automatedTest,
        fileName: `enhanced-test-${jobId}.spec.ts`,
        optimization: {
          originalSteps: steps.length,
          optimizedSteps: enhancedSteps.length,
          efficiencyGain: Math.round(((steps.length - enhancedSteps.length) / steps.length) * 100),
          patternsDetected: ['Browser automation', 'Robust selectors', 'Real-time capture'],
          method: 'Enhanced Browser Automation'
        },
        artifacts: {
          manualTest: `/artifacts/${jobId}/manual-test.txt`,
          automatedTest: `/runs/${jobId}/test.spec.ts`,
          jobStatus: `/status/${jobId}`
        },
        statusUrl: `/status/${jobId}`
      });
    }

    // Fallback: Generación tradicional MCP
    console.log(`🔄 [${jobId}] Using traditional MCP generation as fallback`);
    
    // Step 1: Convert to MCP format
    console.log(`📝 [${jobId}] Converting to MCP format...`);
    const mcpData = convertToMCP({ url, steps, instructions });
    
    // Validate MCP data
    const validation = validateMCP(mcpData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid MCP data generated',
        validation: validation.errors,
        jobId
      });
    }
    
    await saveJSON(path.join(jobDir, 'mcp.json'), mcpData);
    
    // Step 2: Generate manual test artifacts
    console.log(`📚 [${jobId}] Generating manual test artifacts...`);
    
    // Generate Gherkin feature
    const gherkinFeature = generateGherkinFeature(mcpData, {
      language: 'en',
      includeComments: true
    });
    
    // Generate test case document
    const testCaseDoc = generateTestCaseDocument(mcpData, {
      format: 'markdown',
      includeMetadata: true,
      includeScreenshots: true
    });
    
    // Generate step-by-step guide
    const stepGuide = generateStepByStepGuide(mcpData);
    
    // Generate JIRA format
    const jiraTestCase = generateTestCaseDocument(mcpData, {
      format: 'jira'
    });
    
    // Save manual artifacts
    await fs.writeFile(
      path.join(manualDir, `${jobId}.feature`),
      gherkinFeature,
      'utf8'
    );
    
    await fs.writeFile(
      path.join(manualDir, 'test-case.md'),
      testCaseDoc,
      'utf8'
    );
    
    await fs.writeFile(
      path.join(manualDir, 'step-guide.md'),
      stepGuide,
      'utf8'
    );
    
    await fs.writeFile(
      path.join(manualDir, 'jira-test-case.txt'),
      jiraTestCase,
      'utf8'
    );
    
    // Step 3: Generate Playwright test spec
    console.log(`🎭 [${jobId}] Generating Playwright test...`);
    const playwrightCode = generatePlaywrightTest(mcpData, {
      useTypeScript: true,
      includeTrace: true,
      includeScreenshots: true,
      timeout: 30000
    });
    
    const playwrightConfig = generatePlaywrightConfig({
      baseURL: new URL(url).origin,
      browsers: ['chromium'],
      headless: true,
      workers: 1,
      timeout: 30000
    });
    
    await fs.writeFile(
      path.join(jobDir, 'test.spec.ts'),
      playwrightCode,
      'utf8'
    );
    
    await fs.writeFile(
      path.join(jobDir, 'playwright.config.js'),
      playwrightConfig,
      'utf8'
    );
    
    // Step 4: Run Playwright test
    console.log(`🧪 [${jobId}] Running Playwright test...`);
    const testResults = await runPlaywrightTests({
      testFile: path.join(jobDir, 'test.spec.ts'),
      jobId,
      outputDir: path.join(projectRoot, 'runs'),
      timeout: 30000,
      headed: false,
      browsers: ['chromium'],
      retries: 1
    });
    
    // Step 5: Save job status
    const jobStatus = {
      jobId,
      status: testResults.success ? 'completed' : 'failed',
      timestamp,
      url,
      stepCount: steps.length,
      mcpSteps: mcpData.steps.length,
      assertionCount: mcpData.assertions.length,
      results: {
        success: testResults.success,
        exitCode: testResults.exitCode,
        artifacts: testResults.artifacts,
        runDir: testResults.runDir
      },
      links: {
        // Manual artifacts
        gherkin: `/artifacts/${jobId}/manual/${jobId}.feature`,
        testCase: `/artifacts/${jobId}/manual/test-case.md`,
        stepGuide: `/artifacts/${jobId}/manual/step-guide.md`,
        jiraCase: `/artifacts/${jobId}/manual/jira-test-case.txt`,
        
        // Generated code
        playwrightSpec: `/runs/${jobId}/test.spec.ts`,
        playwrightConfig: `/runs/${jobId}/playwright.config.js`,
        mcp: `/runs/${jobId}/mcp.json`,
        
        // Execution results
        executionReport: testResults.report ? `/runs/${jobId}/execution-report.json` : null,
        htmlReport: testResults.artifacts?.find(a => a.type === 'report') 
          ? `/runs/${jobId}/${testResults.artifacts.find(a => a.type === 'report').relativePath}` 
          : null,
        traces: testResults.artifacts?.filter(a => a.type === 'trace').map(a => 
          `/runs/${jobId}/${a.relativePath}`
        ) || [],
        screenshots: testResults.artifacts?.filter(a => a.type === 'screenshot').map(a => 
          `/runs/${jobId}/${a.relativePath}`
        ) || []
      }
    };
    
    await saveJSON(path.join(jobDir, 'status.json'), jobStatus);
    
    console.log(`✅ [${jobId}] Test generation completed successfully`);
    
    res.json({
      jobId,
      statusUrl: `/status/${jobId}`,
      status: jobStatus.status,
      links: jobStatus.links
    });
    
  } catch (error) {
    console.error(`❌ [${jobId}] Test generation failed:`, error);
    
    // Save error status
    const errorStatus = {
      jobId,
      status: 'failed',
      timestamp,
      error: error.message,
      stack: error.stack
    };
    
    try {
      const jobDir = path.join(projectRoot, 'runs', jobId);
      await ensureDir(jobDir);
      await saveJSON(path.join(jobDir, 'status.json'), errorStatus);
    } catch (saveError) {
      console.error(`Failed to save error status for job ${jobId}:`, saveError);
    }
    
    res.status(500).json({
      error: 'Test generation failed',
      jobId,
      details: error.message
    });
  }
});

/**
 * GET /
 * Root endpoint - MCP Test Generator API information
 */
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Test Generator API',
    version: '1.0.0',
    description: 'Local MCP Test Generator - Chrome Extension + Node Service + Playwright Runner',
    endpoints: {
      'POST /api/generate': 'Generate test from captured steps',
      'GET /api/status/:id': 'Get job status and artifacts',
      'GET /api/jobs': 'List all jobs',
      'POST /api/jobs/:id/rerun': 'Re-run existing test',
      'GET /api/health': 'Server health check'
    },
    documentation: 'See README.md for complete usage guide',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/health
 * Enhanced health check with system diagnostics and error recovery
 */
app.get('/api/health', async (req, res) => {
  try {
    const playwrightStatus = await checkPlaywrightInstallation();
    
    // System diagnostics
    const systemInfo = {
      status: 'healthy',
      service: 'mcp-test-generator',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      
      // Detailed health metrics
      memory: process.memoryUsage(),
      
      // Component health
      playwright: playwrightStatus,
      
      // Error recovery stats
      errorStats: errorRecovery.getErrorStats(),
      
      // Directory status
      directories: {
        runs: path.join(projectRoot, 'runs'),
        artifacts: path.join(projectRoot, 'artifacts'),
        project: projectRoot
      },
      
      // Dependencies check
      dependencies: await checkDependencies()
    };

    // Determine overall health status
    const healthScore = calculateHealthScore(systemInfo);
    systemInfo.healthScore = healthScore;
    systemInfo.status = healthScore > 80 ? 'healthy' : healthScore > 50 ? 'degraded' : 'unhealthy';

    res.json(systemInfo);
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      service: 'mcp-test-generator',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Check system dependencies
 */
async function checkDependencies() {
  const deps = ['express', 'cors', 'morgan', 'uuid'];
  const status = {};
  
  for (const dep of deps) {
    try {
      require.resolve(dep);
      status[dep] = { available: true, error: null };
    } catch (error) {
      status[dep] = { available: false, error: error.message };
    }
  }
  
  return status;
}

/**
 * Calculate overall health score
 */
function calculateHealthScore(systemInfo) {
  let score = 100;
  
  // Deduct points for issues
  if (!systemInfo.playwright.installed) score -= 20;
  if (systemInfo.errorStats.errorCount > 0) score -= (systemInfo.errorStats.errorCount * 10);
  if (systemInfo.memory.heapUsed > 500 * 1024 * 1024) score -= 10; // 500MB threshold
  if (systemInfo.uptime < 60) score -= 5; // Recently restarted
  
  // Check dependencies
  const depFailures = Object.values(systemInfo.dependencies).filter(dep => !dep.available).length;
  score -= (depFailures * 15);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * GET /status/:jobId
 * Returns the current status and links for a job
 */
app.get('/api/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const statusFile = path.join(projectRoot, 'runs', jobId, 'status.json');
    const status = await loadJSON(statusFile);
    
    res.json(status);
  } catch (error) {
    console.error(`Failed to load status for job ${jobId}:`, error);
    res.status(404).json({
      error: 'Job not found',
      jobId
    });
  }
});

/**
 * GET /jobs
 * Lists all available jobs with their status
 */
app.get('/api/jobs', async (req, res) => {
  try {
    const runsDir = path.join(projectRoot, 'runs');
    const jobDirs = await fs.readdir(runsDir);
    
    const jobs = await Promise.all(
      jobDirs.map(async (jobId) => {
        try {
          const statusFile = path.join(runsDir, jobId, 'status.json');
          const status = await loadJSON(statusFile);
          return {
            jobId,
            status: status.status,
            timestamp: status.timestamp,
            url: status.url,
            stepCount: status.stepCount
          };
        } catch {
          return {
            jobId,
            status: 'unknown',
            timestamp: null,
            url: null,
            stepCount: 0
          };
        }
      })
    );
    
    // Sort by timestamp, newest first
    jobs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    
    res.json({ jobs });
  } catch (error) {
    console.error('Failed to list jobs:', error);
    res.status(500).json({
      error: 'Failed to list jobs',
      details: error.message
    });
  }
});

/**
 * POST /jobs/:jobId/rerun
 * Re-runs the Playwright test for an existing job
 */
app.post('/api/jobs/:jobId/rerun', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    console.log(`🔄 [${jobId}] Re-running Playwright test...`);
    
    const jobDir = path.join(projectRoot, 'runs', jobId);
    const artifactsDir = path.join(projectRoot, 'artifacts', jobId);
    
    // Verify job exists
    const statusFile = path.join(jobDir, 'status.json');
    const originalStatus = await loadJSON(statusFile);
    
    // Re-run the test
    const testResults = await runPlaywrightTest(jobId, jobDir, artifactsDir);
    
    // Update status
    const updatedStatus = {
      ...originalStatus,
      status: testResults.success ? 'completed' : 'failed',
      lastRerun: new Date().toISOString(),
      results: testResults,
      links: {
        ...originalStatus.links,
        trace: testResults.traceFile ? `/artifacts/${jobId}/${path.basename(testResults.traceFile)}` : null,
        report: testResults.reportDir ? `/artifacts/${jobId}/playwright-report/index.html` : null,
        screenshots: testResults.screenshots || []
      }
    };
    
    await saveJSON(statusFile, updatedStatus);
    
    console.log(`✅ [${jobId}] Test re-run completed`);
    
    res.json({
      jobId,
      status: updatedStatus.status,
      results: testResults,
      links: updatedStatus.links
    });
    
  } catch (error) {
    console.error(`❌ [${jobId}] Test re-run failed:`, error);
    res.status(500).json({
      error: 'Test re-run failed',
      jobId,
      details: error.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    directories: {
      runs: path.join(projectRoot, 'runs'),
      artifacts: path.join(projectRoot, 'artifacts')
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server with auto port detection
async function startServer() {
  try {
    const PORT = await findAvailablePort(3000, 3010);
    
    app.listen(PORT, () => {
      console.log(`🚀 MCP Test Generator Server running on http://localhost:${PORT}`);
      console.log(`📁 Project root: ${projectRoot}`);
      console.log(`📊 Artifacts: ${path.join(projectRoot, 'artifacts')}`);
      console.log(`🏃 Runs: ${path.join(projectRoot, 'runs')}`);
      console.log(`\n🔗 API Endpoints:`);
      console.log(`   POST /generate     - Generate test from captured steps`);
      console.log(`   GET  /status/:id   - Get job status and artifacts`);
      console.log(`   GET  /jobs         - List all jobs`);
      console.log(`   POST /jobs/:id/rerun - Re-run existing test`);
      console.log(`   GET  /health       - Server health check`);
      
      // Write the actual port being used to a config file for the extension
      const configData = {
        serverPort: PORT,
        serverUrl: `http://localhost:${PORT}`,
        lastStarted: new Date().toISOString()
      };
      
      fs.writeFile(
        path.join(projectRoot, 'extension', 'server-config.json'),
        JSON.stringify(configData, null, 2)
      ).catch(err => {
        console.log(`⚠️  Could not write server config: ${err.message}`);
      });
    });
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;