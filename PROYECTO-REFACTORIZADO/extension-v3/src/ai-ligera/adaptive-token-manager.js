/**
 * ==========================================
 * ADAPTIVE TOKEN MANAGER
 * ==========================================
 * 
 * Gestión inteligente de tokens para Gemini API
 * respetando límites de Google y optimizando uso
 * 
 * LÍMITES OFICIALES GOOGLE GEMINI:
 * 
 * gemini-2.0-flash-exp (Free Tier):
 * - Input: 1,048,576 tokens (~1M)
 * - Output: 8,192 tokens (~8K)
 * - RPM: 15 requests/minute
 * - RPD: 1,500 requests/day
 * - TPM: 1,000,000 tokens/minute
 * 
 * gemini-1.5-pro (Free Tier):
 * - Input: 2,097,152 tokens (~2M)
 * - Output: 8,192 tokens (~8K)
 * - RPM: 2 requests/minute
 * - RPD: 50 requests/day
 * - TPM: 32,000 tokens/minute
 * 
 * @author Expert Developer
 * @date 2025-10-22
 */

export class AdaptiveTokenManager {
  constructor() {
    // Límites por modelo
    this.modelLimits = {
      'gemini-2.0-flash-exp': {
        maxInputTokens: 1048576,
        maxOutputTokens: 8192,
        rpm: 15,
        rpd: 1500,
        tpm: 1000000,
        costPerToken: 0 // Free tier
      },
      'gemini-1.5-pro': {
        maxInputTokens: 2097152,
        maxOutputTokens: 8192,
        rpm: 2,
        rpd: 50,
        tpm: 32000,
        costPerToken: 0 // Free tier
      }
    };
    
    // Tracking de uso
    this.usage = {
      currentMinute: {
        requests: 0,
        tokens: 0,
        windowStart: Date.now()
      },
      currentDay: {
        requests: 0,
        tokens: 0,
        windowStart: Date.now()
      },
      history: []
    };
    
    // Configuración por defecto
    this.currentModel = 'gemini-2.0-flash-exp';
    
    console.log('✅ Adaptive Token Manager inicializado');
  }
  
  // ==========================================
  // ESTRATEGIA ADAPTATIVA DE TOKENS
  // ==========================================
  
  /**
   * Calcula estrategia óptima para procesar eventos
   * @param {Array} events - Array de eventos capturados
   * @param {Object} options - Opciones de configuración
   * @returns {Object} Estrategia con batches y límites
   */
  calculateStrategy(events, options = {}) {
    const model = options.model || this.currentModel;
    const limits = this.modelLimits[model];
    
    if (!limits) {
      throw new Error(`Modelo desconocido: ${model}`);
    }
    
    // 1. Estimar tokens necesarios
    const estimation = this.estimateTokens(events);
    
    // 2. Verificar límites actuales
    const canProcess = this.checkLimits(estimation, model);
    
    if (!canProcess.allowed) {
      return {
        strategy: 'RATE_LIMITED',
        reason: canProcess.reason,
        retryAfter: canProcess.retryAfter,
        estimation
      };
    }
    
    // 3. Decidir estrategia basada en tamaño
    if (estimation.totalTokens <= limits.maxInputTokens * 0.8) {
      // Estrategia 1: Single-pass (óptimo)
      return {
        strategy: 'SINGLE_PASS',
        batches: [events],
        tokensPerBatch: [estimation.totalTokens],
        outputTokens: this.calculateOptimalOutputTokens(estimation),
        estimation,
        metrics: {
          expectedLatency: this.estimateLatency(estimation.totalTokens),
          expectedCost: 0 // Free tier
        }
      };
    } else {
      // Estrategia 2: Fragmentación inteligente
      const batches = this.fragmentBySemantic(events, limits.maxInputTokens * 0.8);
      
      return {
        strategy: 'FRAGMENTED',
        batches: batches,
        tokensPerBatch: batches.map(batch => this.estimateTokens(batch).totalTokens),
        outputTokens: this.calculateOptimalOutputTokens(estimation, batches.length),
        estimation,
        metrics: {
          expectedLatency: this.estimateLatency(estimation.totalTokens, batches.length),
          expectedCost: 0, // Free tier
          batchCount: batches.length
        }
      };
    }
  }
  
  // ==========================================
  // ESTIMACIÓN DE TOKENS
  // ==========================================
  
  /**
   * Estima tokens necesarios para procesar eventos
   * Basado en análisis empírico de Gemini tokenization
   */
  estimateTokens(events) {
    const basePromptTokens = 200; // Prompt system + instructions
    const tokensPerEvent = {
      // Tokens por tipo de evento
      click: 80,        // Tag + atributos + contexto
      input: 120,       // + valor input
      navigation: 60,   // Solo URL + título
      form: 150,        // Múltiples campos
      drag: 100,        // Coordenadas + elementos
      hover: 70         // Similar a click
    };
    
    let totalTokens = basePromptTokens;
    
    events.forEach(event => {
      const eventType = event.type || 'click';
      const baseTokens = tokensPerEvent[eventType] || 80;
      
      // Ajustes por complejidad
      let complexity = 1.0;
      
      if (event.target?.shadowDOM) complexity += 0.2;
      if (event.target?.iframeContext) complexity += 0.3;
      if (event.domSnapshot?.nodes > 1000) complexity += 0.1;
      if (event.value?.length > 100) complexity += 0.5;
      
      totalTokens += Math.ceil(baseTokens * complexity);
    });
    
    // Overhead de JSON structure
    totalTokens += events.length * 10;
    
    return {
      totalTokens,
      basePromptTokens,
      eventsTokens: totalTokens - basePromptTokens,
      averagePerEvent: Math.ceil((totalTokens - basePromptTokens) / events.length),
      breakdown: {
        prompt: basePromptTokens,
        events: totalTokens - basePromptTokens,
        overhead: events.length * 10
      }
    };
  }
  
  /**
   * Calcula tokens óptimos de salida según input
   */
  calculateOptimalOutputTokens(estimation, batchCount = 1) {
    const model = this.currentModel;
    const limits = this.modelLimits[model];
    
    // Fórmula heurística basada en ratio input/output observado
    // En promedio: output = 15-20% del input para generation tasks
    const baseOutput = Math.ceil(estimation.totalTokens * 0.18);
    
    // Ajustar por número de batches (más batches = más output por batch)
    const batchAdjustment = 1 + (batchCount - 1) * 0.1;
    
    // Mínimo razonable
    const minOutput = 300;
    
    // Máximo permitido por modelo
    const maxOutput = limits.maxOutputTokens;
    
    const optimal = Math.max(minOutput, Math.min(maxOutput, baseOutput * batchAdjustment));
    
    return Math.ceil(optimal);
  }
  
  // ==========================================
  // VERIFICACIÓN DE LÍMITES
  // ==========================================
  
  /**
   * Verifica si podemos hacer la request respetando rate limits
   */
  checkLimits(estimation, model) {
    const limits = this.modelLimits[model];
    const now = Date.now();
    
    // Resetear ventanas si pasó el tiempo
    this.resetWindowsIfNeeded(now);
    
    // 1. Check RPM (Requests Per Minute)
    if (this.usage.currentMinute.requests >= limits.rpm) {
      const waitTime = 60000 - (now - this.usage.currentMinute.windowStart);
      return {
        allowed: false,
        reason: 'RPM_EXCEEDED',
        limit: limits.rpm,
        current: this.usage.currentMinute.requests,
        retryAfter: Math.ceil(waitTime / 1000)
      };
    }
    
    // 2. Check RPD (Requests Per Day)
    if (this.usage.currentDay.requests >= limits.rpd) {
      const waitTime = 86400000 - (now - this.usage.currentDay.windowStart);
      return {
        allowed: false,
        reason: 'RPD_EXCEEDED',
        limit: limits.rpd,
        current: this.usage.currentDay.requests,
        retryAfter: Math.ceil(waitTime / 1000)
      };
    }
    
    // 3. Check TPM (Tokens Per Minute)
    const projectedTokens = this.usage.currentMinute.tokens + estimation.totalTokens;
    if (projectedTokens > limits.tpm) {
      const waitTime = 60000 - (now - this.usage.currentMinute.windowStart);
      return {
        allowed: false,
        reason: 'TPM_EXCEEDED',
        limit: limits.tpm,
        current: this.usage.currentMinute.tokens,
        projected: projectedTokens,
        retryAfter: Math.ceil(waitTime / 1000)
      };
    }
    
    // 4. Check input size
    if (estimation.totalTokens > limits.maxInputTokens) {
      return {
        allowed: false,
        reason: 'INPUT_TOO_LARGE',
        limit: limits.maxInputTokens,
        current: estimation.totalTokens,
        suggestion: 'Use FRAGMENTED strategy'
      };
    }
    
    return {
      allowed: true,
      remainingRPM: limits.rpm - this.usage.currentMinute.requests,
      remainingRPD: limits.rpd - this.usage.currentDay.requests,
      remainingTPM: limits.tpm - this.usage.currentMinute.tokens
    };
  }
  
  /**
   * Resetea ventanas de tiempo si expiraron
   */
  resetWindowsIfNeeded(now) {
    // Resetear ventana de minuto
    if (now - this.usage.currentMinute.windowStart >= 60000) {
      this.usage.currentMinute = {
        requests: 0,
        tokens: 0,
        windowStart: now
      };
    }
    
    // Resetear ventana de día
    if (now - this.usage.currentDay.windowStart >= 86400000) {
      this.usage.currentDay = {
        requests: 0,
        tokens: 0,
        windowStart: now
      };
    }
  }
  
  // ==========================================
  // FRAGMENTACIÓN SEMÁNTICA
  // ==========================================
  
  /**
   * Fragmenta eventos por cohesión semántica, no aleatoriamente
   */
  fragmentBySemantic(events, maxTokensPerBatch) {
    const batches = [];
    let currentBatch = [];
    let currentTokens = 200; // Base prompt
    let currentContext = null;
    
    for (const event of events) {
      const eventTokens = this.estimateTokens([event]).totalTokens - 200;
      const eventContext = this.detectContext(event);
      
      // Decisión 1: Cambio de contexto semántico
      if (currentContext && currentContext !== eventContext && currentBatch.length > 0) {
        batches.push([...currentBatch]);
        currentBatch = [event];
        currentTokens = 200 + eventTokens;
        currentContext = eventContext;
        continue;
      }
      
      // Decisión 2: Límite de tokens
      if (currentTokens + eventTokens > maxTokensPerBatch) {
        if (currentBatch.length > 0) {
          batches.push([...currentBatch]);
        }
        currentBatch = [event];
        currentTokens = 200 + eventTokens;
        currentContext = eventContext;
        continue;
      }
      
      // Agregar al batch actual
      currentBatch.push(event);
      currentTokens += eventTokens;
      if (!currentContext) currentContext = eventContext;
    }
    
    // Último batch
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    return batches;
  }
  
  /**
   * Detecta contexto semántico del evento
   */
  detectContext(event) {
    const url = event.pageContext?.url || '';
    const target = event.target || {};
    
    // Patrones comunes
    if (url.includes('/login') || url.includes('/auth')) return 'AUTH';
    if (url.includes('/checkout') || url.includes('/cart')) return 'CHECKOUT';
    if (url.includes('/search') || target.type === 'search') return 'SEARCH';
    if (url.includes('/profile') || url.includes('/account')) return 'PROFILE';
    if (event.type === 'input' && target.type === 'email') return 'AUTH';
    if (event.type === 'input' && target.type === 'password') return 'AUTH';
    if (event.type === 'form') return 'FORM_SUBMISSION';
    if (event.type === 'navigation') return 'NAVIGATION';
    
    return 'GENERAL';
  }
  
  // ==========================================
  // TRACKING DE USO
  // ==========================================
  
  /**
   * Registra uso de tokens después de request
   */
  recordUsage(tokensUsed) {
    const now = Date.now();
    this.resetWindowsIfNeeded(now);
    
    this.usage.currentMinute.requests++;
    this.usage.currentMinute.tokens += tokensUsed;
    
    this.usage.currentDay.requests++;
    this.usage.currentDay.tokens += tokensUsed;
    
    this.usage.history.push({
      timestamp: now,
      tokens: tokensUsed,
      model: this.currentModel
    });
    
    // Mantener solo últimas 100 entries
    if (this.usage.history.length > 100) {
      this.usage.history.shift();
    }
  }
  
  // ==========================================
  // UTILIDADES
  // ==========================================
  
  /**
   * Estima latencia basada en tokens
   */
  estimateLatency(tokens, batchCount = 1) {
    // Gemini 2.0 Flash: ~1000 tokens/second
    // Gemini 1.5 Pro: ~500 tokens/second
    
    const model = this.currentModel;
    const tokensPerSecond = model.includes('flash') ? 1000 : 500;
    
    const processingTime = (tokens / tokensPerSecond) * batchCount;
    const networkOverhead = 2; // 2 segundos overhead
    
    return Math.ceil(processingTime + networkOverhead);
  }
  
  /**
   * Obtiene estadísticas de uso
   */
  getUsageStats() {
    const model = this.modelLimits[this.currentModel];
    
    return {
      currentModel: this.currentModel,
      limits: model,
      usage: {
        minute: {
          requests: this.usage.currentMinute.requests,
          tokens: this.usage.currentMinute.tokens,
          remainingRequests: model.rpm - this.usage.currentMinute.requests,
          remainingTokens: model.tpm - this.usage.currentMinute.tokens
        },
        day: {
          requests: this.usage.currentDay.requests,
          tokens: this.usage.currentDay.tokens,
          remainingRequests: model.rpd - this.usage.currentDay.requests
        },
        history: this.usage.history.slice(-10) // Últimas 10 requests
      }
    };
  }
  
  /**
   * Cambia modelo actual
   */
  setModel(modelName) {
    if (!this.modelLimits[modelName]) {
      throw new Error(`Modelo no soportado: ${modelName}`);
    }
    this.currentModel = modelName;
    console.log(`🔄 Modelo cambiado a: ${modelName}`);
  }
  
  /**
   * Logs de estadísticas
   */
  logStats() {
    const stats = this.getUsageStats();
    
    console.group('📊 Adaptive Token Manager Stats');
    console.log(`Modelo actual: ${stats.currentModel}`);
    console.log(`RPM: ${stats.usage.minute.requests}/${stats.limits.rpm} (${stats.usage.minute.remainingRequests} restantes)`);
    console.log(`TPM: ${stats.usage.minute.tokens}/${stats.limits.tpm} (${stats.usage.minute.remainingTokens} restantes)`);
    console.log(`RPD: ${stats.usage.day.requests}/${stats.limits.rpd} (${stats.usage.day.remainingRequests} restantes)`);
    console.groupEnd();
  }
}
