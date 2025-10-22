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

export class GeminiAIClient {
  constructor() {
    this.apiKey = null;
    this.model = 'gemini-2.5-flash'; // Gemini 2.5 Flash - API v1 (VALIDADO)
    this.baseURL = 'https://generativelanguage.googleapis.com/v1'; // API v1 estable
    this.analysisCache = new Map();
    this.maxCacheSize = 100;
    this.isInitialized = false;
    
    console.log('🤖 Gemini IA Ligera creada (esperando API key)');
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
    
    // Si no hay API key, usar fallback
    if (!this.isInitialized || !this.apiKey) {
      console.log('🔄 Usando fallback analysis (sin API key)');
      return this.fallbackAnalysis(elementData, pageContext);
    }
    
    // Verificar cache
    const cacheKey = this.getCacheKey(elementData);
    if (this.analysisCache.has(cacheKey)) {
      const cachedResult = this.analysisCache.get(cacheKey);
      console.log(`⚡ Cache HIT para ${cacheKey} (${Date.now() - startTime}ms)`);
      return cachedResult;
    }
    
    // Construir prompt ligero
    const prompt = this.buildLightweightPrompt(elementData, pageContext);
    
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
              temperature: 0.1, // Muy baja para respuestas consistentes
              maxOutputTokens: 300, // Límite bajo para respuesta rápida
              topP: 0.8,
              topK: 10
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
        console.error('❌ Respuesta vacía de Gemini');
        return this.fallbackAnalysis(elementData, pageContext);
      }
      
      // Validar estructura del candidato antes de acceder
      const candidate = result.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('❌ Estructura de respuesta inválida de Gemini');
        return this.fallbackAnalysis(elementData, pageContext);
      }
      
      const analysisText = candidate.content.parts[0].text;
      
      // Limpiar markdown code blocks si existen
      const cleanedText = analysisText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      let analysis;
      try {
        analysis = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('❌ Error parseando JSON de Gemini:', cleanedText);
        return this.fallbackAnalysis(elementData, pageContext);
      }
      
      // Enriquecer con metadata
      analysis.source = 'gemini-ai';
      analysis.model = this.model;
      analysis.latencyMs = Date.now() - startTime;
      analysis.phase = 'PHASE_1_LIGHTWEIGHT';
      analysis.note = 'Pre-análisis. IA Agéntica refinará en FASE 2';
      
      // Guardar en cache
      this.addToCache(cacheKey, analysis);
      
      console.log(`✅ Pre-análisis Gemini completo (${analysis.latencyMs}ms)`);
      return analysis;
      
    } catch (error) {
      console.error('❌ Error en análisis Gemini ligero:', error);
      return this.fallbackAnalysis(elementData, pageContext);
    }
  }
  
  /**
   * Construye prompt simplificado para análisis rápido (FASE 1)
   */
  buildLightweightPrompt(elementData, pageContext) {
    return `Análisis RÁPIDO de evento de usuario (pre-análisis FASE 1):

ELEMENTO CAPTURADO:
- Tag: ${elementData.tagName || 'N/A'}
- ID: ${elementData.id || 'N/A'}
- data-testid: ${elementData.dataTestId || 'N/A'}
- aria-label: ${elementData.ariaLabel || 'N/A'}
- Text: ${(elementData.textContent || '').substring(0, 100) || 'N/A'}
- Href: ${elementData.href || 'N/A'}
- Target: ${elementData.target || 'N/A'}
- Type: ${elementData.type || 'N/A'}
- Name: ${elementData.name || 'N/A'}

CONTEXTO PÁGINA:
- URL: ${pageContext.url || 'N/A'}
- Title: ${pageContext.title || 'N/A'}

TAREAS (RESPUESTAS BREVES):

1. **Pre-ranking selectores** (top 3 más robustos):
   Analiza atributos disponibles y ordena por robustez (score 0-100).
   Prioridad: data-testid > id > aria-label > name > text único

2. **Flujo ventanas**:
   ¿Este elemento abre nueva pestaña? (target="_blank" o similar)

3. **Intención**:
   Clasifica la acción del usuario en UNA de estas categorías:
   - form_submission (enviar formulario)
   - navigation (ir a otra página)
   - authentication (login/logout)
   - search (buscar contenido)
   - data_entry (ingresar datos)
   - ui_interaction (toggle, expand, etc)

OUTPUT (JSON estricto, SIN explicaciones adicionales):
{
  "selectorPreRanking": [
    { "selector": "string CSS selector", "score": 0-100, "reason": "breve" }
  ],
  "opensNewTab": true/false,
  "intent": "string (una de las categorías)",
  "confidence": 0-100
}`;
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
   * Limpia cache (útil entre sesiones)
   */
  clearCache() {
    this.analysisCache.clear();
    console.log('🗑️ Cache de análisis limpiado');
  }
  
  /**
   * Estadísticas de cache
   */
  getCacheStats() {
    return {
      size: this.analysisCache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}
