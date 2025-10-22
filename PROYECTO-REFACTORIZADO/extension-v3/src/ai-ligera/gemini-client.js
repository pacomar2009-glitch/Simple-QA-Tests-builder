/**
 * US#121 - Gemini IA Ligera: Cliente para pre-análisis rápido
 * 
 * ARQUITECTURA FASE 1 (Extensión):
 * - Pre-ranking de selectores (inicial, no definitivo)
 * - Detección básica de flujo de ventanas (_blank)
 * - Clasificación rápida de intenciones
 * 
 * LÍMITES:
 * - Análisis en <1s por evento (no bloquea captura)
 * - Max 300 tokens de respuesta
 * - Cache para elementos similares
 * - Fallback sin API key funcional
 * 
 * FASE 2 (Backend): IA Agéntica refinará estos resultados con:
 * - Replay con MCP Playwright
 * - Análisis semántico profundo
 * - Agrupación y optimización de flujo
 */

import { AdaptiveTokenManager } from './adaptive-token-manager.js';

export class GeminiAIClient {
  constructor() {
    this.apiKey = null;
    this.model = 'gemini-2.0-flash-exp'; // Modelo con mejores límites para extensión
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    this.analysisCache = new Map();
    this.maxCacheSize = 100;
    this.isInitialized = false;
    
    // 🧠 NUEVO: Adaptive Token Manager con límites Google
    this.tokenManager = new AdaptiveTokenManager();
    this.tokenManager.setModel(this.model);
    
    // 📊 Métricas de cache y rendimiento
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalAnalyses: 0,
      totalLatencyMs: 0,
      fallbackCount: 0,
      rateLimitHits: 0,
      tokensUsed: 0
    };
    
    console.log('🤖 Gemini IA Ligera creada con Adaptive Token Manager');
  }
  
  /**
   * Inicializa cliente con API key
   */
  async initialize(apiKey) {
    if (!apiKey || apiKey.trim() === '') {
      console.warn('⚠️ No hay API key de Gemini, usando modo fallback');
      this.isInitialized = false;
      return false;
    }
    
    // Cargar modelo desde storage si está disponible
    try {
      const result = await chrome.storage.sync.get(['geminiModel']);
      if (result.geminiModel) {
        this.model = result.geminiModel;
        console.log(`✅ Modelo cargado desde configuración: ${this.model}`);
      }
    } catch (error) {
      console.warn('⚠️ No se pudo cargar modelo desde storage, usando default:', error);
    }
    
    this.apiKey = apiKey;
    this.isInitialized = true;
    console.log('✅ Gemini IA Ligera inicializada con API key');
    return true;
  }

  /**
   * Test de conexión real con Gemini API
   * Hace una petición HTTP real para validar si la API key funciona
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async testConnection() {
    if (!this.apiKey || this.apiKey.trim() === '') {
      return { success: false, error: 'No hay API key configurada' };
    }

    try {
      const url = `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'test' }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Error desconocido';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error?.message || errorMsg;
        } catch (e) {
          errorMsg = response.statusText || errorMsg;
        }

        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorMsg}` 
        };
      }

      const data = await response.json();
      
      // Verificar que la respuesta tiene la estructura esperada
      if (!data.candidates || !Array.isArray(data.candidates)) {
        return { 
          success: false, 
          error: 'Respuesta inválida de Gemini API' 
        };
      }

      console.log('✅ Test de conexión Gemini exitoso');
      return { success: true };

    } catch (error) {
      console.error('❌ Error en test de conexión Gemini:', error);
      return { 
        success: false, 
        error: error.message || 'Error de red o CORS' 
      };
    }
  }
  
  /**
   * Pre-análisis ligero de un elemento capturado (FASE 1)
   * 
   * @param {Object} elementData - Datos del elemento capturado
   * @param {Object} pageContext - Contexto de la página
   * @returns {Promise<Object>} - Pre-análisis básico
   */
  async preAnalyzeElement(elementData, pageContext) {
    const startTime = Date.now();
    this.metrics.totalAnalyses++;
    
    // Si no hay API key, usar fallback
    if (!this.isInitialized || !this.apiKey) {
      console.log('🔄 Usando fallback analysis (sin API key)');
      this.metrics.fallbackCount++;
      return this.fallbackAnalysis(elementData, pageContext);
    }
    
    // Verificar cache
    const cacheKey = this.getCacheKey(elementData);
    if (this.analysisCache.has(cacheKey)) {
      const cachedResult = this.analysisCache.get(cacheKey);
      const latency = Date.now() - startTime;
      this.metrics.cacheHits++;
      this.metrics.totalLatencyMs += latency;
      console.log(`⚡ Cache HIT para ${cacheKey} (${latency}ms) - Hit rate: ${this.getCacheHitRate()}%`);
      return cachedResult;
    }
    
    // 🧠 NUEVO: Verificar límites de rate con Adaptive Token Manager
    const mockEvent = {
      type: 'click',
      target: elementData,
      pageContext: pageContext
    };
    
    const estimation = this.tokenManager.estimateTokens([mockEvent]);
    const canProceed = this.tokenManager.checkLimits(estimation, this.model);
    
    if (!canProceed.allowed) {
      console.warn(`⚠️ Rate limit alcanzado: ${canProceed.reason}`);
      console.warn(`⏱️ Retry after: ${canProceed.retryAfter}s`);
      this.metrics.rateLimitHits++;
      this.metrics.fallbackCount++;
      
      // Usar fallback cuando se excede rate limit
      return this.fallbackAnalysis(elementData, pageContext);
    }
    
    // Cache MISS - necesitamos llamar a Gemini
    this.metrics.cacheMisses++;
    
    // Construir prompt ligero
    const prompt = this.buildLightweightPrompt(elementData, pageContext);
    
    // 🧠 Calcular tokens óptimos de salida según complejidad del input
    const optimalOutputTokens = this.tokenManager.calculateOptimalOutputTokens(estimation);
    
    console.log(`📊 Tokens: input ~${estimation.totalTokens}, output ${optimalOutputTokens}`);
    
    try {
      const response = await fetch(
        `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.0, // Determinístico para JSON consistente
              maxOutputTokens: optimalOutputTokens, // 🧠 ADAPTATIVO (antes fijo en 800)
              topP: 0.95,
              topK: 40,
              candidateCount: 1, // Solo una respuesta
              responseModalities: ["TEXT"] // Solo texto, no otros formatos
            },
            // CRÍTICO: Deshabilitar modo "thinking" para no desperdiciar tokens
            systemInstruction: {
              parts: [{ text: "Responde SOLO con JSON válido. NO expliques tu razonamiento." }]
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_NONE'
              }
            ]
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error HTTP de Gemini:', response.status, errorText);
        return this.fallbackAnalysis(elementData, pageContext);
      }
      
      const result = await response.json();
      
      // Validar respuesta con chequeos completos
      if (!result.candidates || result.candidates.length === 0) {
        console.error('❌ Respuesta vacía de Gemini:', JSON.stringify(result, null, 2));
        
        // Verificar si hay error de safety
        if (result.promptFeedback && result.promptFeedback.blockReason) {
          console.error('🚫 Gemini bloqueó el prompt:', result.promptFeedback.blockReason);
        }
        
        return this.fallbackAnalysis(elementData, pageContext);
      }
      
      // Validar estructura del candidato antes de acceder
      const candidate = result.candidates[0];
      
      // Chequear finishReason para detectar bloqueos o límites
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('⚠️ Gemini finalizó con razón:', candidate.finishReason);
        
        if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
          console.error('🚫 Respuesta bloqueada por safety o recitación');
          return this.fallbackAnalysis(elementData, pageContext);
        }
        
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.error('🚫 MAX_TOKENS alcanzado - respuesta incompleta');
          console.error('Token usage:', result.usageMetadata);
          this.metrics.fallbackCount++;
          return this.fallbackAnalysis(elementData, pageContext);
        }
      }
      
      if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('❌ Estructura de respuesta inválida de Gemini');
        console.error('Candidate recibido:', JSON.stringify(candidate, null, 2));
        console.error('Respuesta completa:', JSON.stringify(result, null, 2));
        return this.fallbackAnalysis(elementData, pageContext);
      }
      
      const analysisText = candidate.content.parts[0].text;
      
      // Limpiar y extraer JSON de la respuesta
      let analysis;
      try {
        analysis = this.extractAndParseJSON(analysisText);
      } catch (parseError) {
        console.error('❌ Error parseando JSON de Gemini:', parseError.message);
        console.error('Texto recibido:', analysisText);
        this.metrics.fallbackCount++;
        return this.fallbackAnalysis(elementData, pageContext);
      }
      
      // Validar que el análisis tiene campos requeridos
      if (!this.validateAnalysis(analysis)) {
        console.error('❌ Análisis de Gemini incompleto:', analysis);
        this.metrics.fallbackCount++;
        return this.fallbackAnalysis(elementData, pageContext);
      }
      
      // Enriquecer con metadata
      const latency = Date.now() - startTime;
      analysis.source = 'gemini-ai';
      analysis.model = this.model;
      analysis.latencyMs = latency;
      analysis.phase = 'PHASE_1_LIGHTWEIGHT';
      analysis.note = 'Pre-análisis. IA Agéntica refinará en FASE 2';
      
      // 🧠 Registrar uso de tokens en Token Manager
      const tokensUsed = result.usageMetadata?.totalTokenCount || estimation.totalTokens;
      this.tokenManager.recordUsage(tokensUsed);
      this.metrics.tokensUsed += tokensUsed;
      
      // Registrar métricas
      this.metrics.totalLatencyMs += latency;
      
      // Guardar en cache
      this.addToCache(cacheKey, analysis);
      
      console.log(`✅ Pre-análisis Gemini completo (${latency}ms, ${tokensUsed} tokens) - Promedio: ${this.getAverageLatency()}ms`);
      return analysis;
      
    } catch (error) {
      console.error('❌ Error en análisis Gemini ligero:', error);
      this.metrics.fallbackCount++;
      return this.fallbackAnalysis(elementData, pageContext);
    }
  }
  
  /**
   * Construye prompt simplificado para análisis rápido (FASE 1)
   * OPTIMIZADO: Máximo 200 tokens para evitar MAX_TOKENS
   */
  buildLightweightPrompt(elementData, pageContext) {
    // Prompt ultra-compacto: priorizar info crítica
    const tag = elementData.tagName || '?';
    const text = (elementData.textContent || '').substring(0, 25);
    const attrs = [];
    
    if (elementData.dataTestId) attrs.push(`data-testid="${elementData.dataTestId}"`);
    if (elementData.id) attrs.push(`id="${elementData.id}"`);
    if (elementData.ariaLabel) attrs.push(`aria="${elementData.ariaLabel.substring(0, 20)}"`);
    if (elementData.type) attrs.push(`type="${elementData.type}"`);
    if (elementData.target === '_blank') attrs.push('target="_blank"');
    
    return `Analiza elemento web. SOLO JSON, sin texto.

<${tag}${attrs.length ? ' ' + attrs.slice(0, 3).join(' ') : ''}>${text}</${tag}>
URL: ${pageContext.url.substring(0, 40)}

Responde:
{"selectorPreRanking":[{"selector":"css","score":0.9}],"opensNewTab":${elementData.target === '_blank'},"intent":"accion"}`;
  }
  
  /**
   * Análisis fallback sin IA (cuando no hay API key o falla Gemini)
   */
  fallbackAnalysis(elementData, pageContext) {
    const selectors = [];
    
    // Prioridad según US#56
    if (elementData.dataTestId) {
      selectors.push({
        selector: `[data-testid="${elementData.dataTestId}"]`,
        score: 100,
        reason: 'data-testid (testing best practice)'
      });
    }
    
    if (elementData.id) {
      selectors.push({
        selector: `#${elementData.id}`,
        score: 90,
        reason: 'ID único'
      });
    }
    
    if (elementData.ariaLabel) {
      selectors.push({
        selector: `[aria-label="${elementData.ariaLabel}"]`,
        score: 85,
        reason: 'aria-label (accesibilidad)'
      });
    }
    
    if (elementData.name) {
      selectors.push({
        selector: `[name="${elementData.name}"]`,
        score: 80,
        reason: 'name attribute'
      });
    }
    
    // Intención básica por tipo de elemento
    let intent = 'ui_interaction';
    if (elementData.tagName === 'BUTTON' && elementData.type === 'submit') {
      intent = 'form_submission';
    } else if (elementData.tagName === 'A' && elementData.href) {
      intent = 'navigation';
    } else if (elementData.type === 'text' || elementData.type === 'email' || elementData.type === 'password') {
      intent = 'data_entry';
    }
    
    // Detectar login/logout
    const text = (elementData.textContent || '').toLowerCase();
    if (text.includes('login') || text.includes('sign in') || text.includes('logout')) {
      intent = 'authentication';
    }
    
    return {
      selectorPreRanking: selectors.slice(0, 3),
      opensNewTab: elementData.target === '_blank',
      intent: intent,
      confidence: 60, // Confianza media para fallback
      source: 'fallback-rules',
      model: 'heuristic',
      latencyMs: 0,
      phase: 'PHASE_1_LIGHTWEIGHT',
      note: 'Análisis sin IA. Requiere refinamiento en FASE 2'
    };
  }
  
  /**
   * Genera clave de cache para elemento
   */
  getCacheKey(elementData) {
    // Cache por combinación de atributos únicos
    const parts = [
      elementData.tagName || '',
      elementData.id || '',
      elementData.dataTestId || '',
      elementData.name || ''
    ];
    return parts.filter(p => p).join('-') || 'unknown';
  }
  
  /**
   * Añade resultado al cache (con límite de tamaño)
   */
  addToCache(key, value) {
    // Si cache está lleno, eliminar entradas antiguas (FIFO)
    if (this.analysisCache.size >= this.maxCacheSize) {
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
    
    this.analysisCache.set(key, value);
  }
  
  /**
   * Extrae y parsea JSON de texto que puede contener markdown o texto adicional
   */
  extractAndParseJSON(text) {
    // Paso 1: Limpiar markdown code blocks
    let cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // Paso 2: Buscar JSON entre llaves
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON válido en la respuesta');
    }
    
    cleaned = jsonMatch[0];
    
    // Paso 3: Intentar parsear
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Paso 4: Intentar reparar JSON común (comillas simples, trailing commas, etc)
      const repaired = cleaned
        .replace(/'/g, '"')  // Comillas simples a dobles
        .replace(/,(\s*[}\]])/g, '$1')  // Eliminar trailing commas
        .replace(/(\w+):/g, '"$1":');  // Agregar comillas a keys sin comillas
      
      try {
        return JSON.parse(repaired);
      } catch (e2) {
        throw new Error(`JSON inválido: ${e2.message}`);
      }
    }
  }
  
  /**
   * Valida que el análisis de Gemini tiene todos los campos requeridos
   */
  validateAnalysis(analysis) {
    if (!analysis || typeof analysis !== 'object') {
      return false;
    }
    
    // Campos obligatorios
    const required = ['selectorPreRanking', 'opensNewTab', 'intent'];
    for (const field of required) {
      if (!(field in analysis)) {
        console.warn(`⚠️ Campo faltante en análisis: ${field}`);
        return false;
      }
    }
    
    // Validar selectorPreRanking es array no vacío
    if (!Array.isArray(analysis.selectorPreRanking) || analysis.selectorPreRanking.length === 0) {
      console.warn('⚠️ selectorPreRanking debe ser array no vacío');
      return false;
    }
    
    // Validar cada selector tiene campos necesarios
    for (const sel of analysis.selectorPreRanking) {
      if (!sel.selector || typeof sel.score !== 'number') {
        console.warn('⚠️ Selector inválido en preRanking:', sel);
        return false;
      }
    }
    
    // Validar opensNewTab es boolean
    if (typeof analysis.opensNewTab !== 'boolean') {
      console.warn('⚠️ opensNewTab debe ser boolean');
      return false;
    }
    
    // Validar intent es string no vacío
    if (typeof analysis.intent !== 'string' || analysis.intent.trim() === '') {
      console.warn('⚠️ intent debe ser string no vacío');
      return false;
    }
    
    return true;
  }
  
  /**
   * Limpia cache (útil entre sesiones)
   */
  clearCache() {
    this.analysisCache.clear();
    console.log('🗑️ Cache de análisis limpiado');
  }
  
  /**
   * Calcula hit rate del cache en porcentaje
   */
  getCacheHitRate() {
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalCacheRequests === 0) return 0;
    return ((this.metrics.cacheHits / totalCacheRequests) * 100).toFixed(1);
  }
  
  /**
   * Calcula latencia promedio en ms
   */
  getAverageLatency() {
    if (this.metrics.totalAnalyses === 0) return 0;
    return (this.metrics.totalLatencyMs / this.metrics.totalAnalyses).toFixed(2);
  }
  
  /**
   * Estadísticas completas de rendimiento
   */
  getCacheStats() {
    const tokenStats = this.tokenManager.getUsageStats();
    
    return {
      cache: {
        size: this.analysisCache.size,
        maxSize: this.maxCacheSize,
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: `${this.getCacheHitRate()}%`
      },
      performance: {
        totalAnalyses: this.metrics.totalAnalyses,
        averageLatencyMs: this.getAverageLatency(),
        totalLatencyMs: this.metrics.totalLatencyMs,
        fallbackCount: this.metrics.fallbackCount,
        rateLimitHits: this.metrics.rateLimitHits,
        tokensUsed: this.metrics.tokensUsed
      },
      tokenManagement: {
        model: tokenStats.currentModel,
        limits: {
          rpm: `${tokenStats.usage.minute.requests}/${tokenStats.limits.rpm}`,
          tpm: `${tokenStats.usage.minute.tokens}/${tokenStats.limits.tpm}`,
          rpd: `${tokenStats.usage.day.requests}/${tokenStats.limits.rpd}`
        },
        remaining: {
          requests: tokenStats.usage.minute.remainingRequests,
          tokens: tokenStats.usage.minute.remainingTokens
        }
      },
      summary: {
        aiPowered: this.metrics.totalAnalyses - this.metrics.fallbackCount,
        fallbackUsed: this.metrics.fallbackCount,
        cacheEfficiency: `${this.getCacheHitRate()}% hit rate`,
        targetMet: parseFloat(this.getCacheHitRate()) >= 40 ? '✅' : '⚠️',
        rateLimitStatus: this.metrics.rateLimitHits === 0 ? '✅ OK' : `⚠️ ${this.metrics.rateLimitHits} hits`
      }
    };
  }
  
  /**
   * Log de estadísticas en consola (útil para debugging)
   */
  logStats() {
    const stats = this.getCacheStats();
    console.log('📊 === GEMINI IA LIGERA - ESTADÍSTICAS ===');
    console.log(`Cache: ${stats.cache.hits} hits, ${stats.cache.misses} misses (${stats.cache.hitRate} hit rate)`);
    console.log(`Rendimiento: ${stats.performance.totalAnalyses} análisis, ${stats.performance.averageLatencyMs}ms promedio`);
    console.log(`AI vs Fallback: ${stats.summary.aiPowered} IA / ${stats.summary.fallbackUsed} fallback`);
    console.log(`Rate Limits: ${stats.summary.rateLimitStatus}`);
    console.log(`Tokens: ${stats.performance.tokensUsed} usados`);
    console.log(`Límites actuales: RPM ${stats.tokenManagement.limits.rpm}, TPM ${stats.tokenManagement.limits.tpm}`);
    console.log(`Meta ≥40% cache hit: ${stats.summary.targetMet}`);
    console.log('==========================================');
    
    // Log adicional del Token Manager
    this.tokenManager.logStats();
  }
}
