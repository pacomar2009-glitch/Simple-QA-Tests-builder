// 🎯 TEST GENERATION ORCHESTRATOR
// Procesa sesiones completas en SINGLE-PASS con AdaptiveTokenManager

const { AdaptiveTokenManager } = require('../ai/adaptive-token-manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class TestGenerationOrchestrator {
  constructor() {
    // Integrar Adaptive Token Manager
    this.tokenManager = new AdaptiveTokenManager('gemini-2.0-flash-exp');
    
    // Gemini AI Client
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp'
    });
    
    // Estado de jobs
    this.jobs = new Map();
    
    console.log('✅ TestGenerationOrchestrator inicializado con AdaptiveTokenManager');
  }
  
  /**
   * Iniciar procesamiento de sesión
   */
  async startTestGeneration(sessionData) {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { sessionId, steps, metadata = {} } = sessionData;
    
    console.log(`[${jobId}] Iniciando procesamiento de sesión: ${sessionId}`);
    console.log(`[${jobId}] Eventos recibidos: ${steps.length}`);
    
    // Registrar job
    this.jobs.set(jobId, {
      id: jobId,
      sessionId,
      status: 'processing',
      progress: 0,
      startedAt: Date.now(),
      stepsCount: steps.length
    });
    
    // Procesar asíncronamente
    this.processSession(jobId, { sessionId, steps, metadata })
      .catch(error => {
        console.error(`[${jobId}] ❌ Error:`, error);
        this.jobs.set(jobId, {
          ...this.jobs.get(jobId),
          status: 'failed',
          error: error.message,
          completedAt: Date.now()
        });
      });
    
    return jobId;
  }
  
  /**
   * Procesar sesión con estrategia adaptativa
   */
  async processSession(jobId, sessionData) {
    const { sessionId, steps, metadata } = sessionData;
    
    try {
      // PASO 1: Calcular estrategia con Adaptive Token Manager
      console.log(`[${jobId}] 📊 Calculando estrategia de procesamiento...`);
      
      const strategy = this.tokenManager.calculateStrategy(steps);
      
      console.log(`[${jobId}] Estrategia: ${strategy.type}`);
      console.log(`[${jobId}] Batches: ${strategy.batches.length}`);
      console.log(`[${jobId}] Tokens estimados: ${strategy.estimatedTokens}`);
      console.log(`[${jobId}] Latencia estimada: ${strategy.estimatedLatency}s`);
      
      this.updateProgress(jobId, 10, 'Estrategia calculada');
      
      // PASO 2: Procesar según estrategia
      let result;
      
      if (strategy.type === 'SINGLE_PASS') {
        console.log(`[${jobId}] ✅ Usando SINGLE_PASS (óptimo)`);
        result = await this.processSinglePass(jobId, steps, metadata);
      } else {
        console.log(`[${jobId}] 📦 Usando FRAGMENTED (sesión grande)`);
        result = await this.processFragmented(jobId, strategy.batches, metadata);
      }
      
      // PASO 3: Guardar resultado
      this.jobs.set(jobId, {
        ...this.jobs.get(jobId),
        status: 'completed',
        progress: 100,
        completedAt: Date.now(),
        result: {
          ...result,
          strategy: strategy.type,
          originalStepsCount: steps.length,
          optimizedStepsCount: result.optimizedSteps?.length || 0,
          savings: {
            apiCalls: 1, // Single-pass siempre usa 1 llamada por batch
            tokensUsed: result.tokensUsed,
            latency: result.latency
          }
        }
      });
      
      console.log(`[${jobId}] ✅ Procesamiento completado`);
      
    } catch (error) {
      console.error(`[${jobId}] ❌ Error en processSession:`, error);
      throw error;
    }
  }
  
  /**
   * Procesar en single-pass (óptimo)
   */
  async processSinglePass(jobId, steps, metadata) {
    console.log(`[${jobId}] 🚀 Procesando ${steps.length} eventos en 1 llamada...`);
    
    // Verificar rate limits
    const canProceed = this.tokenManager.canMakeRequest();
    if (!canProceed.allowed) {
      const waitTime = canProceed.waitTime;
      console.log(`[${jobId}] ⏳ Rate limit alcanzado, esperando ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.updateProgress(jobId, 30, 'Analizando con Gemini (single-pass)...');
    
    // Construir prompt con contexto completo
    const prompt = this.buildSessionPrompt(steps, metadata);
    
    // Calcular tokens óptimos de salida
    const optimalOutputTokens = this.tokenManager.calculateOptimalOutputTokens(steps);
    
    console.log(`[${jobId}] 📝 Input: ${steps.length} eventos`);
    console.log(`[${jobId}] 🎯 Output tokens: ${optimalOutputTokens} (adaptativo)`);
    
    // Llamada única a Gemini
    const startTime = Date.now();
    
    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: optimalOutputTokens,
        responseMimeType: 'application/json'
      }
    });
    
    const latency = Date.now() - startTime;
    
    // Extraer respuesta
    const response = result.response;
    const analysisText = response.text();
    const analysis = JSON.parse(analysisText);
    
    // Registrar uso real
    const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
    this.tokenManager.recordUsage(tokensUsed, latency);
    
    console.log(`[${jobId}] ✅ Gemini respondió en ${latency}ms`);
    console.log(`[${jobId}] 📊 Tokens usados: ${tokensUsed}`);
    console.log(`[${jobId}] 🎯 Pasos optimizados: ${analysis.optimizedSteps?.length || 0}`);
    
    this.updateProgress(jobId, 90, 'Análisis completado');
    
    return {
      optimizedSteps: analysis.optimizedSteps || [],
      flows: analysis.flows || [],
      selectors: analysis.selectors || [],
      assertions: analysis.assertions || [],
      tokensUsed,
      latency,
      apiCalls: 1
    };
  }
  
  /**
   * Procesar fragmentado (para sesiones muy grandes)
   */
  async processFragmented(jobId, batches, metadata) {
    console.log(`[${jobId}] 📦 Procesando ${batches.length} batches fragmentados...`);
    
    const allResults = [];
    let totalTokens = 0;
    let totalLatency = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNum = i + 1;
      
      console.log(`[${jobId}] Batch ${batchNum}/${batches.length}: ${batch.length} eventos`);
      
      const batchResult = await this.processSinglePass(
        jobId,
        batch,
        { ...metadata, batchNumber: batchNum }
      );
      
      allResults.push(batchResult);
      totalTokens += batchResult.tokensUsed;
      totalLatency += batchResult.latency;
      
      const progress = 30 + ((batchNum / batches.length) * 60);
      this.updateProgress(jobId, progress, `Batch ${batchNum}/${batches.length} completado`);
      
      // Esperar si es necesario por rate limits
      if (i < batches.length - 1) {
        await this.waitIfNeeded();
      }
    }
    
    // Consolidar resultados
    const consolidated = {
      optimizedSteps: allResults.flatMap(r => r.optimizedSteps),
      flows: allResults.flatMap(r => r.flows),
      selectors: allResults.flatMap(r => r.selectors),
      assertions: allResults.flatMap(r => r.assertions),
      tokensUsed: totalTokens,
      latency: totalLatency,
      apiCalls: batches.length
    };
    
    console.log(`[${jobId}] ✅ Todos los batches procesados`);
    console.log(`[${jobId}] 📊 Total tokens: ${totalTokens}`);
    console.log(`[${jobId}] ⏱️  Total latency: ${totalLatency}ms`);
    
    return consolidated;
  }
  
  /**
   * Construir prompt con contexto completo de sesión
   */
  buildSessionPrompt(steps, metadata) {
    return `Analiza esta sesión de usuario completa (${steps.length} eventos):

CONTEXTO DE SESIÓN:
${JSON.stringify(metadata, null, 2)}

EVENTOS CAPTURADOS:
${JSON.stringify(steps.map((step, idx) => ({
  numero: idx + 1,
  tipo: step.type,
  elemento: {
    tag: step.target?.tagName,
    id: step.target?.id,
    texto: step.target?.textContent?.substring(0, 50),
    dataTestId: step.target?.dataTestId
  },
  valor: step.value,
  url: step.pageContext?.url,
  timestamp: step.timestamp
})), null, 2)}

TAREAS (ANÁLISIS COMPLETO):

1. **Optimizar flujo**: Elimina pasos redundantes o de debug
2. **Identificar flujos funcionales**: Agrupa eventos por intención (login, búsqueda, checkout, etc)
3. **Generar selectores robustos**: Prioriza data-testid, id, aria-label
4. **Detectar assertions críticas**: ¿Qué validar en cada paso?
5. **Calcular métricas**: Reducción de pasos, cobertura

OUTPUT (JSON estricto):
{
  "optimizedSteps": [
    {
      "stepNumber": number,
      "action": "click" | "fill" | "navigate" | "wait",
      "selector": "string (más robusto)",
      "value": "string | null",
      "description": "string",
      "flowId": "string"
    }
  ],
  "flows": [
    {
      "id": "string",
      "name": "string (ej: Login Flow)",
      "steps": [numbers],
      "priority": "critical" | "high" | "medium",
      "estimatedDuration": "string"
    }
  ],
  "selectors": [
    {
      "element": "string",
      "recommended": "string",
      "alternatives": ["string"],
      "reasoning": "string"
    }
  ],
  "assertions": [
    {
      "stepNumber": number,
      "type": "visible" | "text" | "url" | "enabled",
      "target": "string",
      "expected": "string",
      "critical": boolean
    }
  ],
  "metrics": {
    "originalSteps": ${steps.length},
    "optimizedSteps": number,
    "reductionRate": "percentage",
    "flowsIdentified": number,
    "assertionsAdded": number
  }
}`;
  }
  
  /**
   * Esperar si rate limits requieren delay
   */
  async waitIfNeeded() {
    const canProceed = this.tokenManager.canMakeRequest();
    if (!canProceed.allowed) {
      console.log(`⏳ Rate limit: esperando ${canProceed.waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, canProceed.waitTime));
    }
  }
  
  /**
   * Actualizar progreso de job
   */
  updateProgress(jobId, progress, message) {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.set(jobId, {
        ...job,
        progress: Math.round(progress),
        currentPhase: message
      });
    }
  }
  
  /**
   * Obtener estado de job
   */
  getJobStatus(jobId) {
    return this.jobs.get(jobId) || null;
  }
  
  /**
   * Obtener estadísticas del token manager
   */
  getTokenManagerStats() {
    return this.tokenManager.getStats();
  }
}

module.exports = { TestGenerationOrchestrator };
