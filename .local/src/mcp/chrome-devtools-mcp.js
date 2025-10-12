/**
 * MCP Chrome DevTools - Captura robusta de pasos del usuario
 * Integra con Chrome DevTools Protocol para detectar interacciones precisas
 */

export class ChromeDevToolsMCP {
  constructor() {
    this.capturedSteps = [];
    this.isCapturing = false;
    this.tabId = null;
    this.debuggeeId = null;
  }

  /**
   * Inicia la captura robusta usando Chrome DevTools Protocol
   */
  async startCapture(tabId) {
    this.tabId = tabId;
    this.debuggeeId = { tabId: tabId };
    this.capturedSteps = [];
    this.isCapturing = true;

    try {
      // Adjuntar debugger
      await chrome.debugger.attach(this.debuggeeId, "1.3");
      
      // Habilitar dominios necesarios
      await chrome.debugger.sendCommand(this.debuggeeId, "Runtime.enable");
      await chrome.debugger.sendCommand(this.debuggeeId, "DOM.enable");
      await chrome.debugger.sendCommand(this.debuggeeId, "Input.enable");
      await chrome.debugger.sendCommand(this.debuggeeId, "Page.enable");
      
      // Escuchar eventos de input
      chrome.debugger.onEvent.addListener(this.handleDevToolsEvent.bind(this));
      
      console.log('🔍 Chrome DevTools MCP: Capture started for tab', tabId);
      
      return { success: true, message: 'Captura robusta iniciada con Chrome DevTools' };
    } catch (error) {
      console.error('❌ Chrome DevTools MCP Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Maneja eventos del Chrome DevTools Protocol
   */
  handleDevToolsEvent(debuggeeId, method, params) {
    if (!this.isCapturing || debuggeeId.tabId !== this.tabId) return;

    switch (method) {
      case 'Input.dispatchMouseEvent':
        this.captureMouseEvent(params);
        break;
      case 'Input.dispatchKeyEvent':
        this.captureKeyEvent(params);
        break;
      case 'Page.frameNavigated':
        this.captureNavigation(params);
        break;
      case 'DOM.documentUpdated':
        this.captureDOMChange(params);
        break;
    }
  }

  /**
   * Captura eventos de mouse con contexto completo
   */
  async captureMouseEvent(params) {
    try {
      // Obtener elemento en las coordenadas
      const nodeInfo = await chrome.debugger.sendCommand(this.debuggeeId, "DOM.getNodeForLocation", {
        x: params.x,
        y: params.y
      });

      if (nodeInfo.nodeId) {
        const attributes = await chrome.debugger.sendCommand(this.debuggeeId, "DOM.getAttributes", {
          nodeId: nodeInfo.nodeId
        });

        const step = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          type: 'click',
          method: 'mouse',
          coordinates: { x: params.x, y: params.y },
          element: {
            nodeId: nodeInfo.nodeId,
            attributes: attributes.attributes,
            selector: this.generateRobustSelector(attributes.attributes),
            tagName: await this.getTagName(nodeInfo.nodeId)
          },
          context: {
            url: await this.getCurrentURL(),
            viewport: await this.getViewportInfo()
          }
        };

        this.capturedSteps.push(step);
        console.log('🖱️ Mouse event captured:', step);
      }
    } catch (error) {
      console.error('Error capturing mouse event:', error);
    }
  }

  /**
   * Captura eventos de teclado con contexto
   */
  async captureKeyEvent(params) {
    if (params.type === 'keyDown' && params.key) {
      const step = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'type',
        method: 'keyboard',
        key: params.key,
        text: params.text || '',
        modifiers: params.modifiers || 0,
        context: {
          url: await this.getCurrentURL(),
          activeElement: await this.getActiveElement()
        }
      };

      this.capturedSteps.push(step);
      console.log('⌨️ Key event captured:', step);
    }
  }

  /**
   * Captura navegación
   */
  async captureNavigation(params) {
    const step = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'navigation',
      method: 'page',
      url: params.frame.url,
      title: await this.getPageTitle(),
      context: {
        loaderId: params.frame.loaderId,
        frameId: params.frame.id
      }
    };

    this.capturedSteps.push(step);
    console.log('🧭 Navigation captured:', step);
  }

  /**
   * Genera selector robusto basado en múltiples estrategias
   */
  generateRobustSelector(attributes) {
    const attrArray = attributes || [];
    const attrMap = {};
    
    for (let i = 0; i < attrArray.length; i += 2) {
      attrMap[attrArray[i]] = attrArray[i + 1];
    }

    // Estrategia de selección por prioridad
    if (attrMap.id) {
      return `#${attrMap.id}`;
    }
    
    if (attrMap['data-testid']) {
      return `[data-testid="${attrMap['data-testid']}"]`;
    }
    
    if (attrMap['data-cy']) {
      return `[data-cy="${attrMap['data-cy']}"]`;
    }
    
    if (attrMap.class) {
      const classes = attrMap.class.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    if (attrMap.name) {
      return `[name="${attrMap.name}"]`;
    }
    
    // Fallback a selector por atributos
    return this.buildAttributeSelector(attrMap);
  }

  /**
   * Construye selector por atributos como fallback
   */
  buildAttributeSelector(attrMap) {
    const priorityAttrs = ['type', 'role', 'aria-label', 'placeholder'];
    
    for (const attr of priorityAttrs) {
      if (attrMap[attr]) {
        return `[${attr}="${attrMap[attr]}"]`;
      }
    }
    
    return '[data-captured="true"]'; // Fallback genérico
  }

  /**
   * Obtiene información auxiliar del DOM
   */
  async getTagName(nodeId) {
    try {
      const result = await chrome.debugger.sendCommand(this.debuggeeId, "DOM.describeNode", {
        nodeId: nodeId
      });
      return result.node.nodeName.toLowerCase();
    } catch (error) {
      return 'unknown';
    }
  }

  async getCurrentURL() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0]?.url || '';
    } catch (error) {
      return '';
    }
  }

  async getPageTitle() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0]?.title || '';
    } catch (error) {
      return '';
    }
  }

  async getViewportInfo() {
    try {
      const result = await chrome.debugger.sendCommand(this.debuggeeId, "Runtime.evaluate", {
        expression: `({
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY
        })`
      });
      return result.result.value;
    } catch (error) {
      return { width: 0, height: 0, scrollX: 0, scrollY: 0 };
    }
  }

  async getActiveElement() {
    try {
      const result = await chrome.debugger.sendCommand(this.debuggeeId, "Runtime.evaluate", {
        expression: `(function() {
          const el = document.activeElement;
          return {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            type: el.type || null
          };
        })()`
      });
      return result.result.value;
    } catch (error) {
      return null;
    }
  }

  /**
   * Detiene la captura y desconecta debugger
   */
  async stopCapture() {
    this.isCapturing = false;
    
    try {
      if (this.debuggeeId) {
        await chrome.debugger.detach(this.debuggeeId);
      }
      chrome.debugger.onEvent.removeListener(this.handleDevToolsEvent);
      
      console.log('🛑 Chrome DevTools MCP: Capture stopped');
      return { 
        success: true, 
        stepsCount: this.capturedSteps.length,
        steps: this.capturedSteps 
      };
    } catch (error) {
      console.error('Error stopping capture:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene los pasos capturados en formato MCP estándar
   */
  getMCPSteps() {
    return {
      format: 'mcp-steps-v1',
      captureMethod: 'chrome-devtools',
      timestamp: new Date().toISOString(),
      steps: this.capturedSteps.map(step => ({
        ...step,
        mcpCompliant: true,
        robustSelector: true
      }))
    };
  }

  /**
   * Exporta pasos en formato compatible con Playwright MCP
   */
  exportForPlaywrightMCP() {
    return {
      format: 'playwright-mcp-compatible',
      source: 'chrome-devtools-mcp',
      timestamp: new Date().toISOString(),
      actions: this.capturedSteps.map(step => ({
        type: step.type,
        selector: step.element?.selector || step.context?.activeElement?.tagName,
        value: step.text || step.key || '',
        coordinates: step.coordinates,
        url: step.url || step.context?.url,
        metadata: {
          timestamp: step.timestamp,
          method: step.method,
          robust: true,
          devtools: true
        }
      }))
    };
  }
}

// Instancia global del MCP
export const chromeDevToolsMCP = new ChromeDevToolsMCP();