/**
 * Tests para Adaptive Token Manager
 * Valida gestión inteligente de tokens con límites de Google Gemini
 */

import { AdaptiveTokenManager } from '../src/ai-ligera/adaptive-token-manager.js';

describe('AdaptiveTokenManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = new AdaptiveTokenManager();
  });
  
  describe('Inicialización', () => {
    test('Debe inicializar con modelo por defecto', () => {
      expect(manager.currentModel).toBe('gemini-2.0-flash-exp');
      expect(manager.modelLimits['gemini-2.0-flash-exp']).toBeDefined();
    });
    
    test('Debe tener límites correctos para gemini-2.0-flash-exp', () => {
      const limits = manager.modelLimits['gemini-2.0-flash-exp'];
      expect(limits.maxInputTokens).toBe(1048576);
      expect(limits.maxOutputTokens).toBe(8192);
      expect(limits.rpm).toBe(15);
      expect(limits.tpm).toBe(1000000);
    });
    
    test('Debe permitir cambiar modelo', () => {
      manager.setModel('gemini-1.5-pro');
      expect(manager.currentModel).toBe('gemini-1.5-pro');
    });
    
    test('Debe rechazar modelo desconocido', () => {
      expect(() => manager.setModel('gemini-unknown')).toThrow();
    });
  });
  
  describe('Estimación de Tokens', () => {
    test('Debe estimar tokens para evento simple', () => {
      const events = [{
        type: 'click',
        target: {
          tagName: 'button',
          id: 'submit-btn',
          textContent: 'Submit'
        },
        pageContext: { url: 'https://test.com' }
      }];
      
      const estimation = manager.estimateTokens(events);
      expect(estimation.totalTokens).toBeGreaterThan(200); // Base + evento
      expect(estimation.averagePerEvent).toBeGreaterThan(0);
    });
    
    test('Debe estimar más tokens para evento complejo', () => {
      const simpleEvent = [{
        type: 'click',
        target: { tagName: 'button' }
      }];
      
      const complexEvent = [{
        type: 'input',
        target: {
          tagName: 'input',
          shadowDOM: true,
          iframeContext: {}
        },
        value: 'a'.repeat(150), // Texto largo
        domSnapshot: { nodes: 1500 }
      }];
      
      const simpleEstimation = manager.estimateTokens(simpleEvent);
      const complexEstimation = manager.estimateTokens(complexEvent);
      
      expect(complexEstimation.totalTokens).toBeGreaterThan(simpleEstimation.totalTokens);
    });
    
    test('Debe escalar con número de eventos', () => {
      const oneEvent = [{ type: 'click', target: { tagName: 'button', id: 'test' } }];
      const tenEvents = Array(10).fill({ 
        type: 'click', 
        target: { tagName: 'button', id: 'test' },
        pageContext: { url: 'https://test.com' }
      });
      
      const oneEstimation = manager.estimateTokens(oneEvent);
      const tenEstimation = manager.estimateTokens(tenEvents);
      
      // Debe crecer con más eventos (no necesariamente lineal por base prompt compartido)
      expect(tenEstimation.totalTokens).toBeGreaterThan(oneEstimation.totalTokens * 2);
    });
  });
  
  describe('Cálculo de Output Tokens Óptimo', () => {
    test('Debe calcular output proporcional al input', () => {
      const smallInput = { totalTokens: 500 };
      const largeInput = { totalTokens: 5000 };
      
      const smallOutput = manager.calculateOptimalOutputTokens(smallInput);
      const largeOutput = manager.calculateOptimalOutputTokens(largeInput);
      
      expect(largeOutput).toBeGreaterThan(smallOutput);
    });
    
    test('Debe respetar mínimo de 300 tokens', () => {
      const tinyInput = { totalTokens: 50 };
      const output = manager.calculateOptimalOutputTokens(tinyInput);
      
      expect(output).toBeGreaterThanOrEqual(300);
    });
    
    test('Debe respetar máximo de 8192 tokens', () => {
      const hugeInput = { totalTokens: 100000 };
      const output = manager.calculateOptimalOutputTokens(hugeInput);
      
      expect(output).toBeLessThanOrEqual(8192);
    });
  });
  
  describe('Estrategia de Procesamiento', () => {
    test('Debe usar SINGLE_PASS para eventos pequeños', () => {
      const events = Array(10).fill({
        type: 'click',
        target: { tagName: 'button' }
      });
      
      const strategy = manager.calculateStrategy(events);
      
      expect(strategy.strategy).toBe('SINGLE_PASS');
      expect(strategy.batches).toHaveLength(1);
      expect(strategy.batches[0]).toHaveLength(10);
    });
    
    test('Debe fragmentar cuando excede límite de tokens', () => {
      // Calcular cuántos eventos necesitamos para exceder 80% del límite
      // Límite: 1,048,576 tokens * 0.8 = 838,860 tokens
      // Por evento complejo: ~250 tokens
      // Necesitamos: 838,860 / 250 = ~3,355 eventos
      
      const largeEvents = Array(4000).fill({
        type: 'input',
        target: {
          tagName: 'textarea',
          shadowDOM: true,
          iframeContext: {}
        },
        value: 'a'.repeat(500),
        domSnapshot: { nodes: 5000 }
      });
      
      // Estimar primero
      const estimation = manager.estimateTokens(largeEvents);
      
      // Si excede 80% del límite, debe fragmentar
      if (estimation.totalTokens > 1048576 * 0.8) {
        const strategy = manager.calculateStrategy(largeEvents);
        
        if (strategy.strategy !== 'RATE_LIMITED') {
          expect(strategy.strategy).toBe('FRAGMENTED');
          expect(strategy.batches.length).toBeGreaterThan(1);
        } else {
          // Si hay rate limit, es comportamiento esperado
          expect(strategy.reason).toBeDefined();
        }
      } else {
        // Si no excede, verificar que use SINGLE_PASS
        const strategy = manager.calculateStrategy(largeEvents);
        expect(['SINGLE_PASS', 'RATE_LIMITED']).toContain(strategy.strategy);
      }
    });
    
    test('Debe incluir métricas de latencia estimada', () => {
      const events = [{ type: 'click', target: {} }];
      const strategy = manager.calculateStrategy(events);
      
      expect(strategy.metrics.expectedLatency).toBeGreaterThan(0);
    });
  });
  
  describe('Verificación de Límites', () => {
    test('Debe permitir request cuando no hay uso previo', () => {
      const estimation = { totalTokens: 500 };
      const check = manager.checkLimits(estimation, 'gemini-2.0-flash-exp');
      
      expect(check.allowed).toBe(true);
      expect(check.remainingRPM).toBe(15);
      expect(check.remainingTPM).toBe(1000000);
    });
    
    test('Debe bloquear cuando se excede RPM', () => {
      const estimation = { totalTokens: 100 };
      
      // Simular 15 requests (límite)
      for (let i = 0; i < 15; i++) {
        manager.recordUsage(100);
      }
      
      const check = manager.checkLimits(estimation, 'gemini-2.0-flash-exp');
      
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('RPM_EXCEEDED');
      expect(check.retryAfter).toBeGreaterThan(0);
    });
    
    test('Debe bloquear cuando se excede TPM', () => {
      const estimation = { totalTokens: 100000 };
      
      // Simular uso cercano al límite
      manager.recordUsage(950000);
      
      const check = manager.checkLimits(estimation, 'gemini-2.0-flash-exp');
      
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('TPM_EXCEEDED');
    });
    
    test('Debe resetear ventana de minuto después de 60s', () => {
      const estimation = { totalTokens: 100 };
      
      // Llenar límite
      for (let i = 0; i < 15; i++) {
        manager.recordUsage(100);
      }
      
      // Simular paso de 61 segundos
      manager.usage.currentMinute.windowStart = Date.now() - 61000;
      
      const check = manager.checkLimits(estimation, 'gemini-2.0-flash-exp');
      
      expect(check.allowed).toBe(true);
    });
  });
  
  describe('Fragmentación Semántica', () => {
    test('Debe agrupar eventos por contexto', () => {
      const events = [
        { type: 'input', target: { type: 'email' }, pageContext: { url: '/login' } },
        { type: 'input', target: { type: 'password' }, pageContext: { url: '/login' } },
        { type: 'click', target: {}, pageContext: { url: '/checkout' } },
        { type: 'click', target: {}, pageContext: { url: '/checkout' } }
      ];
      
      const batches = manager.fragmentBySemantic(events, 500);
      
      // Debe crear batches separados por contexto (AUTH vs CHECKOUT)
      expect(batches.length).toBeGreaterThan(1);
    });
    
    test('Debe detectar contexto AUTH correctamente', () => {
      const authEvent = {
        type: 'input',
        target: { type: 'email' },
        pageContext: { url: 'https://test.com/login' }
      };
      
      const context = manager.detectContext(authEvent);
      expect(context).toBe('AUTH');
    });
    
    test('Debe detectar contexto CHECKOUT correctamente', () => {
      const checkoutEvent = {
        type: 'click',
        target: {},
        pageContext: { url: 'https://test.com/checkout' }
      };
      
      const context = manager.detectContext(checkoutEvent);
      expect(context).toBe('CHECKOUT');
    });
  });
  
  describe('Tracking de Uso', () => {
    test('Debe registrar uso de tokens', () => {
      manager.recordUsage(500);
      
      const stats = manager.getUsageStats();
      expect(stats.usage.minute.requests).toBe(1);
      expect(stats.usage.minute.tokens).toBe(500);
    });
    
    test('Debe mantener historial limitado', () => {
      // Registrar 150 requests
      for (let i = 0; i < 150; i++) {
        manager.recordUsage(100);
      }
      
      expect(manager.usage.history.length).toBeLessThanOrEqual(100);
    });
    
    test('Debe calcular tokens restantes correctamente', () => {
      manager.recordUsage(5000);
      
      const stats = manager.getUsageStats();
      expect(stats.usage.minute.remainingTokens).toBe(1000000 - 5000);
    });
  });
  
  describe('Estimación de Latencia', () => {
    test('Debe estimar latencia razonablemente', () => {
      const latency = manager.estimateLatency(1000);
      
      // ~1s para 1000 tokens + 2s overhead = ~3s
      expect(latency).toBeGreaterThan(2);
      expect(latency).toBeLessThan(5);
    });
    
    test('Debe incrementar latencia con múltiples batches', () => {
      const singleBatch = manager.estimateLatency(1000, 1);
      const tripleBatch = manager.estimateLatency(1000, 3);
      
      expect(tripleBatch).toBeGreaterThan(singleBatch);
    });
  });
  
  describe('Estadísticas', () => {
    test('Debe retornar estadísticas completas', () => {
      manager.recordUsage(500);
      
      const stats = manager.getUsageStats();
      
      expect(stats.currentModel).toBeDefined();
      expect(stats.limits).toBeDefined();
      expect(stats.usage.minute).toBeDefined();
      expect(stats.usage.day).toBeDefined();
    });
    
    test('Debe mostrar logs sin errores', () => {
      // Mock console.log
      const originalLog = console.log;
      console.log = jest.fn();
      
      manager.logStats();
      
      expect(console.log).toHaveBeenCalled();
      
      console.log = originalLog;
    });
  });
});
