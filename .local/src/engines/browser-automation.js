/**
 * Browser Automation Engine - Integra MCP Browser para reproducir navegación
 * 
 * Este motor reproduce automáticamente los pasos capturados por la extensión,
 * navega en tiempo real y captura selectores robustos para generar tests.
 */

import { chromium } from 'playwright';

export class BrowserAutomationEngine {
  constructor() {
    this.browser = null;
    this.page = null;
    this.currentSteps = [];
    this.capturedElements = [];
  }

  /**
   * Inicia el navegador y prepara la automatización
   */
  async initialize() {
    this.browser = await chromium.launch({
      headless: false, // Para ver la navegación en tiempo real
      slowMo: 500 // Pausa entre acciones para mejor captura
    });
    
    this.page = await this.browser.newPage();
    
    // Configurar captura de eventos
    await this.setupEventCapture();
    
    console.log('🚀 Browser Automation Engine initialized');
  }

  /**
   * Configura la captura de eventos del navegador
   */
  async setupEventCapture() {
    // Capturar cambios de URL
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page.mainFrame()) {
        console.log(`📍 Navigated to: ${frame.url()}`);
      }
    });

    // Capturar errores de consola
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });
  }

  /**
   * Reproduce los pasos capturados por la extensión
   */
  async reproduceSteps(capturedSteps, startUrl) {
    console.log(`🎬 Starting reproduction of ${capturedSteps.length} steps from ${startUrl}`);
    
    // Navegar a la URL inicial
    await this.page.goto(startUrl);
    await this.page.waitForLoadState('networkidle');
    
    // Capturar estado inicial
    await this.capturePageState('initial');

    for (let i = 0; i < capturedSteps.length; i++) {
      const step = capturedSteps[i];
      console.log(`🔄 Executing step ${i + 1}: ${step.type}`);
      
      try {
        await this.executeStep(step);
        await this.page.waitForTimeout(1000); // Pausa entre pasos
        await this.capturePageState(`step_${i + 1}`);
      } catch (error) {
        console.error(`❌ Error executing step ${i + 1}:`, error);
        // Continuar con el siguiente paso
      }
    }

    console.log('✅ Step reproduction completed');
    return this.capturedElements;
  }

  /**
   * Ejecuta un paso individual
   */
  async executeStep(step) {
    const { type, selector, value, text } = step;

    switch (type) {
      case 'click':
        await this.performClick(selector, text);
        break;
        
      case 'fill':
      case 'type':
        await this.performType(selector, value);
        break;
        
      case 'navigate':
        await this.performNavigation(selector);
        break;
        
      case 'select':
        await this.performSelect(selector, value);
        break;
        
      case 'scroll':
        await this.performScroll();
        break;
        
      default:
        console.log(`⚠️ Unknown step type: ${type}`);
    }
  }

  /**
   * Realiza un clic y captura información del elemento
   */
  async performClick(selector, text) {
    try {
      let element;
      
      // Intentar múltiples estrategias de selección
      if (text) {
        // Buscar por texto
        element = await this.page.getByText(text).first();
      } else if (selector) {
        // Buscar por selector CSS
        element = await this.page.locator(selector).first();
      }

      if (element) {
        // Capturar información del elemento antes del clic
        const elementInfo = await this.captureElementInfo(element);
        
        // Realizar el clic
        await element.click();
        
        // Guardar información capturada
        this.capturedElements.push({
          action: 'click',
          elementInfo,
          robustSelectors: await this.generateRobustSelectors(element)
        });
        
        console.log(`✅ Clicked element: ${elementInfo.tagName}${elementInfo.id ? '#' + elementInfo.id : ''}`);
      }
    } catch (error) {
      console.error(`❌ Click failed:`, error);
      throw error;
    }
  }

  /**
   * Realiza escritura en un campo
   */
  async performType(selector, value) {
    try {
      const element = await this.page.locator(selector).first();
      
      // Capturar información del elemento
      const elementInfo = await this.captureElementInfo(element);
      
      // Limpiar y escribir
      await element.clear();
      await element.fill(value);
      
      this.capturedElements.push({
        action: 'fill',
        elementInfo,
        value,
        robustSelectors: await this.generateRobustSelectors(element)
      });
      
      console.log(`✅ Filled element with: ${value}`);
    } catch (error) {
      console.error(`❌ Type failed:`, error);
      throw error;
    }
  }

  /**
   * Realiza navegación
   */
  async performNavigation(url) {
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    
    this.capturedElements.push({
      action: 'navigate',
      url: this.page.url()
    });
    
    console.log(`✅ Navigated to: ${this.page.url()}`);
  }

  /**
   * Captura información detallada de un elemento
   */
  async captureElementInfo(element) {
    return await element.evaluate((el) => {
      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id,
        className: el.className,
        textContent: el.textContent?.trim().substring(0, 50),
        placeholder: el.placeholder,
        type: el.type,
        name: el.name,
        ariaLabel: el.getAttribute('aria-label'),
        title: el.title,
        href: el.href,
        boundingBox: el.getBoundingClientRect()
      };
    });
  }

  /**
   * Genera selectores robustos para un elemento
   */
  async generateRobustSelectors(element) {
    const selectors = [];
    
    const elementInfo = await this.captureElementInfo(element);
    
    // Selector por ID (más robusto)
    if (elementInfo.id) {
      selectors.push({
        type: 'id',
        selector: `#${elementInfo.id}`,
        priority: 1
      });
    }

    // Selector por texto (muy robusto para botones/links)
    if (elementInfo.textContent) {
      selectors.push({
        type: 'text',
        selector: `text="${elementInfo.textContent}"`,
        priority: 2
      });
    }

    // Selector por aria-label
    if (elementInfo.ariaLabel) {
      selectors.push({
        type: 'aria',
        selector: `[aria-label="${elementInfo.ariaLabel}"]`,
        priority: 2
      });
    }

    // Selector por placeholder
    if (elementInfo.placeholder) {
      selectors.push({
        type: 'placeholder',
        selector: `[placeholder="${elementInfo.placeholder}"]`,
        priority: 3
      });
    }

    // Selector por role
    if (elementInfo.tagName === 'button') {
      selectors.push({
        type: 'role',
        selector: `button`,
        priority: 4
      });
    }

    return selectors.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Captura el estado actual de la página
   */
  async capturePageState(stepName) {
    const snapshot = {
      step: stepName,
      url: this.page.url(),
      title: await this.page.title(),
      timestamp: new Date().toISOString(),
      viewport: await this.page.viewportSize(),
      elements: await this.getAllInteractableElements()
    };

    this.currentSteps.push(snapshot);
    return snapshot;
  }

  /**
   * Obtiene todos los elementos interactuables de la página
   */
  async getAllInteractableElements() {
    return await this.page.evaluate(() => {
      const elements = [];
      const interactable = document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [tabindex]'
      );
      
      interactable.forEach((el, index) => {
        if (el.offsetParent !== null) { // Solo elementos visibles
          elements.push({
            index,
            tagName: el.tagName.toLowerCase(),
            id: el.id,
            className: el.className,
            textContent: el.textContent?.trim().substring(0, 30),
            type: el.type,
            name: el.name,
            href: el.href,
            ariaLabel: el.getAttribute('aria-label')
          });
        }
      });
      
      return elements.slice(0, 20); // Limitar a 20 elementos
    });
  }

  /**
   * Genera test manual legible
   */
  generateManualTest() {
    const steps = this.capturedElements.map((capture, index) => {
      switch (capture.action) {
        case 'click':
          return `${index + 1}. Click on "${capture.elementInfo.textContent || capture.elementInfo.tagName}"`;
        case 'fill':
          return `${index + 1}. Enter "${capture.value}" in ${capture.elementInfo.placeholder || 'field'}`;
        case 'navigate':
          return `${index + 1}. Navigate to ${capture.url}`;
        default:
          return `${index + 1}. ${capture.action}`;
      }
    });

    return {
      title: 'Manual Test Case',
      description: 'Test case generated from automated browser navigation',
      steps,
      expectedResults: 'User should successfully complete the workflow'
    };
  }

  /**
   * Genera test automatizado de Playwright
   */
  generateAutomatedTest() {
    const testSteps = this.capturedElements.map((capture) => {
      const bestSelector = capture.robustSelectors?.[0];
      
      switch (capture.action) {
        case 'click':
          if (bestSelector?.type === 'text') {
            return `  await page.getByText('${capture.elementInfo.textContent}').click();`;
          } else if (bestSelector?.type === 'id') {
            return `  await page.locator('${bestSelector.selector}').click();`;
          } else {
            return `  await page.locator('${capture.elementInfo.tagName}').first().click();`;
          }
          
        case 'fill':
          if (bestSelector?.type === 'placeholder') {
            return `  await page.getByPlaceholder('${capture.elementInfo.placeholder}').fill('${capture.value}');`;
          } else {
            return `  await page.locator('${bestSelector?.selector || 'input'}').fill('${capture.value}');`;
          }
          
        case 'navigate':
          return `  await page.goto('${capture.url}');`;
          
        default:
          return `  // ${capture.action}`;
      }
    });

    return `import { test, expect } from '@playwright/test';

test('Generated Test Case', async ({ page }) => {
${testSteps.join('\n')}
  
  // Add assertions as needed
  await expect(page).toHaveURL(/.*login.*/);
});`;
  }

  /**
   * Cierra el navegador
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🛑 Browser closed');
    }
  }
}