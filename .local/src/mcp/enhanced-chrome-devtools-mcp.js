/**
 * Enhanced Chrome DevTools MCP - Captura Inteligente y Consolidación
 * Resuelve ineficiencias del sistema anterior
 */

export class EnhancedChromeDevToolsMCP {
  constructor() {
    this.rawSteps = [];
    this.consolidatedSteps = [];
    this.context = {
      currentForm: null,
      searchInProgress: false,
      lastFillTarget: null
    };
  }

  /**
   * Consolida pasos capturados eliminando ineficiencias
   */
  consolidateSteps(rawSteps) {
    const consolidated = [];
    let i = 0;
    
    while (i < rawSteps.length) {
      const step = rawSteps[i];
      
      switch (step.type) {
        case 'fill':
          // Consolidar múltiples fills en el mismo campo
          const fillResult = this.consolidateFills(rawSteps, i);
          consolidated.push(fillResult.step);
          i = fillResult.nextIndex;
          break;
          
        case 'click':
          // Eliminar clicks duplicados
          const clickResult = this.consolidateClicks(rawSteps, i);
          consolidated.push(clickResult.step);
          i = clickResult.nextIndex;
          break;
          
        case 'navigation':
          // Mantener navegaciones tal como están
          consolidated.push(this.enhanceStep(step));
          i++;
          break;
          
        default:
          consolidated.push(this.enhanceStep(step));
          i++;
      }
    }
    
    return consolidated;
  }

  /**
   * Consolida múltiples operaciones fill en el mismo campo
   */
  consolidateFills(steps, startIndex) {
    const firstStep = steps[startIndex];
    let lastValue = firstStep.value;
    let nextIndex = startIndex + 1;
    
    // Buscar fills consecutivos en el mismo selector
    while (nextIndex < steps.length) {
      const nextStep = steps[nextIndex];
      
      if (nextStep.type === 'fill' && 
          this.isSameElement(firstStep.selector, nextStep.selector)) {
        lastValue = nextStep.value; // Tomar el valor final
        nextIndex++;
      } else {
        break;
      }
    }
    
    // Crear paso consolidado
    const consolidatedStep = {
      ...firstStep,
      value: lastValue,
      intent: this.detectFillIntent(firstStep, lastValue),
      consolidatedFrom: nextIndex - startIndex,
      robust: true,
      selector: this.optimizeSelector(firstStep.selector, firstStep.element)
    };
    
    return { step: consolidatedStep, nextIndex };
  }

  /**
   * Elimina clicks duplicados innecesarios
   */
  consolidateClicks(steps, startIndex) {
    const firstStep = steps[startIndex];
    let nextIndex = startIndex + 1;
    let clickCount = 1;
    
    // Contar clicks consecutivos en el mismo elemento
    while (nextIndex < steps.length && nextIndex < startIndex + 3) { // Máximo 3 clicks seguidos
      const nextStep = steps[nextIndex];
      
      if (nextStep.type === 'click' && 
          this.isSameElement(firstStep.selector, nextStep.selector) &&
          (nextStep.timestamp - firstStep.timestamp) < 2000) { // Dentro de 2 segundos
        clickCount++;
        nextIndex++;
      } else {
        break;
      }
    }
    
    // Decidir si es click simple, doble click o acción específica
    const consolidatedStep = {
      ...firstStep,
      clickType: clickCount === 1 ? 'single' : 'double',
      intent: this.detectClickIntent(firstStep, clickCount),
      consolidatedFrom: clickCount,
      robust: true,
      selector: this.optimizeSelector(firstStep.selector, firstStep.element)
    };
    
    return { step: consolidatedStep, nextIndex };
  }

  /**
   * Detecta la intención de una operación fill
   */
  detectFillIntent(step, value) {
    const selector = step.selector?.toLowerCase() || '';
    const elementType = step.element?.type?.toLowerCase() || '';
    
    // Detectar búsqueda
    if (selector.includes('search') || 
        selector.includes('query') ||
        elementType === 'search') {
      return 'search';
    }
    
    // Detectar email
    if (elementType === 'email' || 
        selector.includes('email') ||
        value.includes('@')) {
      return 'email_input';
    }
    
    // Detectar URL
    if (value.startsWith('http') || value.includes('www.')) {
      return 'url_input';
    }
    
    // Detectar nombre de empresa
    if (selector.includes('company') || selector.includes('empresa')) {
      return 'company_search';
    }
    
    return 'text_input';
  }

  /**
   * Detecta la intención de un click
   */
  detectClickIntent(step, clickCount) {
    const selector = step.selector?.toLowerCase() || '';
    const elementType = step.element?.tagName?.toLowerCase() || '';
    
    // Detectar botón
    if (elementType === 'button' || selector.includes('button')) {
      return clickCount > 1 ? 'button_double_click' : 'button_click';
    }
    
    // Detectar link
    if (elementType === 'a' || selector.includes('link')) {
      return 'link_click';
    }
    
    // Detectar dropdown/select
    if (selector.includes('select') || selector.includes('dropdown')) {
      return 'dropdown_open';
    }
    
    // Detectar resultado de búsqueda
    if (selector.includes('result') || selector.includes('option')) {
      return 'search_result_select';
    }
    
    return 'element_click';
  }

  /**
   * Optimiza selectores para máxima robustez
   */
  optimizeSelector(originalSelector, element) {
    const strategies = [];
    
    // Estrategia 1: data-testid (máxima prioridad)
    if (element?.attributes?.['data-testid']) {
      strategies.push(`[data-testid="${element.attributes['data-testid']}"]`);
    }
    
    // Estrategia 2: ID único
    if (element?.id && !element.id.includes('random') && !element.id.includes('uuid')) {
      strategies.push(`#${element.id}`);
    }
    
    // Estrategia 3: name attribute
    if (element?.name) {
      strategies.push(`[name="${element.name}"]`);
    }
    
    // Estrategia 4: aria-label
    if (element?.attributes?.['aria-label']) {
      strategies.push(`[aria-label="${element.attributes['aria-label']}"]`);
    }
    
    // Estrategia 5: placeholder
    if (element?.attributes?.placeholder) {
      strategies.push(`[placeholder="${element.attributes.placeholder}"]`);
    }
    
    // Estrategia 6: clase CSS estable (sin hashes)
    if (element?.className) {
      const stableClasses = element.className.split(' ')
        .filter(cls => !cls.includes('__') && !cls.match(/[a-z]+[A-Z]/))
        .filter(cls => cls.length > 2);
      
      if (stableClasses.length > 0) {
        strategies.push(`.${stableClasses[0]}`);
      }
    }
    
    // Estrategia 7: texto visible (para links y botones)
    if (element?.textContent && element.textContent.trim().length < 50) {
      const text = element.textContent.trim();
      strategies.push(`text="${text}"`);
    }
    
    // Retornar el mejor selector o el original como fallback
    return strategies.length > 0 ? strategies[0] : originalSelector;
  }

  /**
   * Verifica si dos selectores apuntan al mismo elemento
   */
  isSameElement(selector1, selector2) {
    // Normalizar selectores para comparación
    const normalize = (sel) => sel?.replace(/\s+/g, ' ').trim().toLowerCase();
    return normalize(selector1) === normalize(selector2);
  }

  /**
   * Mejora un paso individual con metadata adicional
   */
  enhanceStep(step) {
    return {
      ...step,
      enhanced: true,
      timestamp: step.timestamp || new Date().toISOString(),
      robust: true,
      intent: step.intent || this.detectGenericIntent(step),
      selector: this.optimizeSelector(step.selector, step.element)
    };
  }

  /**
   * Detecta intención genérica para otros tipos de pasos
   */
  detectGenericIntent(step) {
    switch (step.type) {
      case 'navigation':
        return 'page_navigation';
      case 'scroll':
        return 'page_scroll';
      case 'wait':
        return 'ui_wait';
      default:
        return 'user_interaction';
    }
  }

  /**
   * Procesa pasos capturados aplicando toda la lógica de optimización
   */
  processRawSteps(rawSteps) {
    console.log(`🔄 Processing ${rawSteps.length} raw steps...`);
    
    // Paso 1: Consolidar pasos ineficientes
    const consolidated = this.consolidateSteps(rawSteps);
    
    // Paso 2: Detectar patrones de alto nivel
    const patterns = this.detectHighLevelPatterns(consolidated);
    
    // Paso 3: Optimizar secuencias
    const optimized = this.optimizeSequences(consolidated, patterns);
    
    console.log(`✅ Processed: ${rawSteps.length} → ${optimized.length} steps (${Math.round((1 - optimized.length/rawSteps.length) * 100)}% reduction)`);
    
    return {
      originalCount: rawSteps.length,
      optimizedCount: optimized.length,
      reductionPercent: Math.round((1 - optimized.length/rawSteps.length) * 100),
      steps: optimized,
      patterns: patterns
    };
  }

  /**
   * Detecta patrones de alto nivel en las interacciones
   */
  detectHighLevelPatterns(steps) {
    const patterns = [];
    
    // Patrón: Búsqueda con selección
    for (let i = 0; i < steps.length - 1; i++) {
      const current = steps[i];
      const next = steps[i + 1];
      
      if (current.intent === 'search' || current.intent === 'company_search') {
        if (next.intent === 'search_result_select') {
          patterns.push({
            type: 'search_and_select',
            steps: [i, i + 1],
            searchTerm: current.value,
            description: `Search for "${current.value}" and select result`
          });
        }
      }
    }
    
    // Patrón: Formulario completo
    const formSteps = [];
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].intent?.includes('input') || steps[i].intent === 'search') {
        formSteps.push(i);
      }
    }
    
    if (formSteps.length > 1) {
      patterns.push({
        type: 'form_completion',
        steps: formSteps,
        description: `Complete form with ${formSteps.length} fields`
      });
    }
    
    return patterns;
  }

  /**
   * Optimiza secuencias basado en patrones detectados
   */
  optimizeSequences(steps, patterns) {
    // Por ahora retornar los pasos como están
    // En el futuro se pueden crear "macro-acciones" basadas en patrones
    return steps;
  }

  /**
   * Exporta pasos optimizados para Playwright MCP
   */
  exportForPlaywrightMCP() {
    const processed = this.processRawSteps(this.rawSteps);
    
    return {
      format: 'enhanced-mcp-v1',
      source: 'enhanced-chrome-devtools',
      optimization: {
        originalSteps: processed.originalCount,
        optimizedSteps: processed.optimizedCount,
        reductionPercent: processed.reductionPercent
      },
      patterns: processed.patterns,
      steps: processed.steps,
      timestamp: new Date().toISOString()
    };
  }
}

// Instancia global mejorada
export const enhancedChromeDevToolsMCP = new EnhancedChromeDevToolsMCP();