/**
 * Tests para TestGenerationOrchestrator (Issue #125)
 * Pruebas de lógica de single-pass y fragmented processing
 */

const { TestGenerationOrchestrator } = require('../src/orchestrators/test-generation-orchestrator');

// Mock de Gemini AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(JSON.stringify({
            optimizations: ['Test optimization'],
            flows: [{ name: 'Test flow', steps: [1, 2] }],
            selectors: { element1: 'button#submit' },
            assertions: ['expect(page.title()).toBe("Test")']
          }))
        }
      })
    })
  }))
}));

describe('TestGenerationOrchestrator - Issue #125', () => {
  let orchestrator;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    orchestrator = new TestGenerationOrchestrator();
  });

  describe('startTestGeneration', () => {
    it('debe rechazar sesiones sin steps', async () => {
      const sessionData = { steps: [], metadata: {} };
      
      await expect(orchestrator.startTestGeneration(sessionData))
        .rejects.toThrow('La sesión debe contener al menos 1 step');
    });

    it('debe rechazar sesiones con más de 1000 steps', async () => {
      const sessionData = { 
        steps: new Array(1001).fill({ type: 'click' }), 
        metadata: {} 
      };
      
      await expect(orchestrator.startTestGeneration(sessionData))
        .rejects.toThrow('Máximo 1000 steps permitidos');
    });

    it('debe generar jobId válido para sesión válida', async () => {
      const sessionData = { 
        steps: [{ type: 'click', element: { selector: '#btn' } }], 
        metadata: { url: 'http://example.com' } 
      };
      
      const jobId = await orchestrator.startTestGeneration(sessionData);
      
      expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/);
    });

    it('debe inicializar job con estado "processing"', async () => {
      const sessionData = { 
        steps: [{ type: 'click' }], 
        metadata: {} 
      };
      
      const jobId = await orchestrator.startTestGeneration(sessionData);
      const status = orchestrator.getJobStatus(jobId);
      
      expect(status).toMatchObject({
        status: 'processing',
        progress: expect.any(Number)
      });
    });
  });

  describe('buildSessionPrompt', () => {
    it('debe construir prompt con steps y metadata', () => {
      const steps = [
        { type: 'click', element: { tagName: 'button' } },
        { type: 'input', value: 'test@example.com' }
      ];
      const metadata = { url: 'http://example.com', title: 'Test Page' };
      
      const prompt = orchestrator.buildSessionPrompt(steps, metadata);
      
      expect(prompt).toContain('SINGLE-PASS TEST GENERATION');
      expect(prompt).toContain('http://example.com');
      expect(prompt).toContain('Test Page');
      expect(prompt).toContain('"type": "click"');
      expect(prompt).toContain('test@example.com');
    });

    it('debe incluir secciones de análisis requeridas', () => {
      const steps = [{ type: 'click' }];
      const metadata = {};
      
      const prompt = orchestrator.buildSessionPrompt(steps, metadata);
      
      expect(prompt).toContain('optimizations');
      expect(prompt).toContain('flows');
      expect(prompt).toContain('selectors');
      expect(prompt).toContain('assertions');
    });
  });

  describe('getJobStatus', () => {
    it('debe retornar null para jobId inexistente', () => {
      const status = orchestrator.getJobStatus('non-existent-job');
      expect(status).toBeNull();
    });

    it('debe retornar estado completo de job existente', async () => {
      const sessionData = { 
        steps: [{ type: 'click' }], 
        metadata: {} 
      };
      
      const jobId = await orchestrator.startTestGeneration(sessionData);
      const status = orchestrator.getJobStatus(jobId);
      
      expect(status).toHaveProperty('jobId', jobId);
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('createdAt');
    });
  });

  describe('getTokenManagerStats', () => {
    it('debe retornar estadísticas del token manager', () => {
      const stats = orchestrator.getTokenManagerStats();
      
      expect(stats).toHaveProperty('limits');
      expect(stats).toHaveProperty('usage');
      expect(stats).toHaveProperty('nextResetTime');
    });

    it('debe incluir límites de RPM, TPM, RPD', () => {
      const stats = orchestrator.getTokenManagerStats();
      
      expect(stats.limits).toHaveProperty('requestsPerMinute');
      expect(stats.limits).toHaveProperty('tokensPerMinute');
      expect(stats.limits).toHaveProperty('requestsPerDay');
    });
  });

  describe('Integración: procesamiento completo', () => {
    it('debe procesar sesión pequeña en modo SINGLE_PASS', async () => {
      const sessionData = { 
        steps: new Array(5).fill({ type: 'click', element: { selector: '#btn' } }), 
        metadata: { url: 'http://example.com' } 
      };
      
      const jobId = await orchestrator.startTestGeneration(sessionData);
      
      // Esperar un poco para que el procesamiento termine
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = orchestrator.getJobStatus(jobId);
      expect(status.status).toMatch(/processing|completed/);
    }, 10000);

    it('debe calcular strategy correctamente según tamaño', async () => {
      const smallSession = { 
        steps: new Array(5).fill({ type: 'click' }), 
        metadata: {} 
      };
      
      const jobId = await orchestrator.startTestGeneration(smallSession);
      const status = orchestrator.getJobStatus(jobId);
      
      expect(status.strategy).toBeDefined();
    });
  });
});

describe('TestGenerationOrchestrator - Cobertura adicional', () => {
  let orchestrator;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    orchestrator = new TestGenerationOrchestrator();
  });

  it('debe manejar errores en procesamiento', async () => {
    // Mock que lanza error
    orchestrator.model.generateContent = jest.fn().mockRejectedValue(new Error('API Error'));
    
    const sessionData = { 
      steps: [{ type: 'click' }], 
      metadata: {} 
    };
    
    const jobId = await orchestrator.startTestGeneration(sessionData);
    
    // Esperar procesamiento
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const status = orchestrator.getJobStatus(jobId);
    expect(status.status).toBe('failed');
    expect(status.error).toContain('API Error');
  });

  it('debe validar estructura de sessionData', async () => {
    await expect(orchestrator.startTestGeneration(null))
      .rejects.toThrow();
    
    await expect(orchestrator.startTestGeneration({}))
      .rejects.toThrow();
    
    await expect(orchestrator.startTestGeneration({ steps: 'invalid' }))
      .rejects.toThrow();
  });
});
