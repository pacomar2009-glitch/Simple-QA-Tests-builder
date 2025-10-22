/**
 * US#57 - CasesQueueManager Integration Tests
 * 
 * Pruebas de integración que verifican:
 * - Creación automática de casos al iniciar grabación
 * - Vinculación de steps con casos actuales
 * - Cambio entre casos sin cerrar popup
 * - Persistencia de múltiples casos
 * - Badge actualizado con número de caso
 * - Casos completados con análisis IA
 */

import { CasesQueueManager } from '../src/shared/cases-queue.js';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

describe('CasesQueueManager - Integration with Service Worker', () => {
  let queueManager;
  
  beforeEach(async () => {
    // Reset mocks
    chrome.storage.local.get.mockReset();
    chrome.storage.local.set.mockReset();
    
    // Mock storage responses
    chrome.storage.local.get.mockResolvedValue({
      casesQueue: [],
      currentCaseId: null
    });
    chrome.storage.local.set.mockResolvedValue();
    
    // Create fresh instance
    queueManager = new CasesQueueManager();
    await queueManager.initialize();
  });
  
  describe('Case Creation on Recording Start', () => {
    test('should create new case automatically when recording starts', async () => {
      // Simulate recording start
      const newCase = await queueManager.addNewCase({
        name: 'Caso 1',
        url: 'https://example.com',
        description: 'Test case'
      });
      
      expect(newCase).toMatchObject({
        number: 1,
        name: 'Caso 1',
        initialUrl: 'https://example.com',
        status: 'draft',
        steps: []
      });
      
      expect(newCase.id).toMatch(/^case-/);
      expect(newCase.metadata.createdAt).toBeTruthy();
    });
    
    test('should start recording new case after creation', async () => {
      const newCase = await queueManager.addNewCase({
        name: 'Caso Auto',
        url: 'https://test.com'
      });
      
      const started = await queueManager.startRecordingCase(newCase.id);
      
      expect(started).toBe(true);
      expect(queueManager.currentCaseId).toBe(newCase.id);
      
      const currentCase = queueManager.getCurrentCase();
      expect(currentCase.status).toBe('recording');
      expect(currentCase.metadata.startedAt).toBeTruthy();
    });
    
    test('should assign sequential case numbers', async () => {
      const case1 = await queueManager.addNewCase({ name: 'Case 1' });
      const case2 = await queueManager.addNewCase({ name: 'Case 2' });
      const case3 = await queueManager.addNewCase({ name: 'Case 3' });
      
      expect(case1.number).toBe(1);
      expect(case2.number).toBe(2);
      expect(case3.number).toBe(3);
    });
  });
  
  describe('Steps Management', () => {
    test('should add step to current case', async () => {
      // Create and start case
      const testCase = await queueManager.addNewCase({ name: 'Test Case' });
      await queueManager.startRecordingCase(testCase.id);
      
      // Add step (simulating captureUserAction)
      const stepData = {
        number: 1,
        type: 'click',
        selector: '#button',
        tagName: 'BUTTON',
        timestamp: Date.now()
      };
      
      const added = await queueManager.addStepToCurrentCase(stepData);
      
      expect(added).toBe(true);
      
      const currentCase = queueManager.getCurrentCase();
      expect(currentCase.steps).toHaveLength(1);
      expect(currentCase.steps[0]).toMatchObject({
        type: 'click',
        selector: '#button'
      });
    });
    
    test('should accumulate multiple steps in sequence', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Multi-Step Case' });
      await queueManager.startRecordingCase(testCase.id);
      
      // Simulate capturing 5 user actions
      for (let i = 1; i <= 5; i++) {
        await queueManager.addStepToCurrentCase({
          number: i,
          type: i % 2 === 0 ? 'input' : 'click',
          selector: `#element-${i}`,
          timestamp: Date.now() + i
        });
      }
      
      const currentCase = queueManager.getCurrentCase();
      expect(currentCase.steps).toHaveLength(5);
      expect(currentCase.steps[0].type).toBe('click');
      expect(currentCase.steps[1].type).toBe('input');
    });
    
    test('should not add step if no current case', async () => {
      // No case started
      const added = await queueManager.addStepToCurrentCase({
        type: 'click',
        selector: '#btn'
      });
      
      expect(added).toBe(false);
    });
    
    test('should preserve step with AI pre-analysis', async () => {
      const testCase = await queueManager.addNewCase({ name: 'AI Case' });
      await queueManager.startRecordingCase(testCase.id);
      
      const stepWithAI = {
        number: 1,
        type: 'click',
        selector: '#submit',
        aiPreAnalysis: {
          intent: 'form_submission',
          actionType: 'submit',
          latencyMs: 45
        }
      };
      
      await queueManager.addStepToCurrentCase(stepWithAI);
      
      const currentCase = queueManager.getCurrentCase();
      expect(currentCase.steps[0].aiPreAnalysis).toMatchObject({
        intent: 'form_submission',
        latencyMs: 45
      });
    });
  });
  
  describe('Case Switching', () => {
    test('should pause current case when switching to another', async () => {
      // Create two cases
      const case1 = await queueManager.addNewCase({ name: 'Case 1' });
      const case2 = await queueManager.addNewCase({ name: 'Case 2' });
      
      // Start case 1
      await queueManager.startRecordingCase(case1.id);
      await queueManager.addStepToCurrentCase({ type: 'click', number: 1 });
      
      // Switch to case 2 (should pause case 1)
      await queueManager.startRecordingCase(case2.id);
      
      // Verify case 1 was paused
      const pausedCase = queueManager.getCaseById(case1.id);
      expect(pausedCase.status).toBe('paused');
      expect(pausedCase.metadata.pausedAt).toBeTruthy();
      
      // Verify case 2 is now current
      expect(queueManager.currentCaseId).toBe(case2.id);
      const currentCase = queueManager.getCurrentCase();
      expect(currentCase.status).toBe('recording');
      expect(currentCase.id).toBe(case2.id);
    });
    
    test('should resume paused case', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Resume Case' });
      await queueManager.startRecordingCase(testCase.id);
      
      // Pause
      await queueManager.pauseCurrentCase();
      let caseState = queueManager.getCurrentCase();
      expect(caseState.status).toBe('paused');
      
      // Resume
      await queueManager.resumeCurrentCase();
      caseState = queueManager.getCurrentCase();
      expect(caseState.status).toBe('recording');
      expect(caseState.metadata.pausedAt).toBeNull();
    });
    
    test('should maintain separate step collections per case', async () => {
      const case1 = await queueManager.addNewCase({ name: 'Case 1' });
      const case2 = await queueManager.addNewCase({ name: 'Case 2' });
      
      // Record 3 steps in case 1
      await queueManager.startRecordingCase(case1.id);
      await queueManager.addStepToCurrentCase({ type: 'click', number: 1 });
      await queueManager.addStepToCurrentCase({ type: 'input', number: 2 });
      await queueManager.addStepToCurrentCase({ type: 'submit', number: 3 });
      
      // Switch to case 2 and record 2 steps
      await queueManager.startRecordingCase(case2.id);
      await queueManager.addStepToCurrentCase({ type: 'click', number: 1 });
      await queueManager.addStepToCurrentCase({ type: 'click', number: 2 });
      
      // Verify separate collections
      const finalCase1 = queueManager.getCaseById(case1.id);
      const finalCase2 = queueManager.getCaseById(case2.id);
      
      expect(finalCase1.steps).toHaveLength(3);
      expect(finalCase2.steps).toHaveLength(2);
    });
  });
  
  describe('Case Completion', () => {
    test('should mark case as completed when recording stops', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Complete Case' });
      await queueManager.startRecordingCase(testCase.id);
      
      // Add some steps
      await queueManager.addStepToCurrentCase({ type: 'click', number: 1 });
      await queueManager.addStepToCurrentCase({ type: 'input', number: 2 });
      
      // Stop recording
      const stopped = await queueManager.stopCurrentCase();
      
      expect(stopped).toBe(true);
      
      const completedCase = queueManager.getCaseById(testCase.id);
      expect(completedCase.status).toBe('completed');
      expect(completedCase.metadata.completedAt).toBeTruthy();
      expect(queueManager.currentCaseId).toBeNull();
    });
    
    test('should save AI analysis when completing case', async () => {
      const testCase = await queueManager.addNewCase({ name: 'AI Analyzed Case' });
      await queueManager.startRecordingCase(testCase.id);
      
      // Simulate AI analysis result
      const aiAnalysis = {
        testName: 'User Login Flow',
        description: 'Complete login scenario',
        assertions: [
          'Should display login form',
          'Should validate credentials',
          'Should redirect to dashboard'
        ],
        confidence: 0.95
      };
      
      await queueManager.stopCurrentCase(aiAnalysis);
      
      const completedCase = queueManager.getCaseById(testCase.id);
      expect(completedCase.aiAnalysis).toMatchObject(aiAnalysis);
      expect(completedCase.aiAnalysis.confidence).toBe(0.95);
    });
    
    test('should calculate duration correctly', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Timed Case' });
      await queueManager.startRecordingCase(testCase.id);
      
      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await queueManager.stopCurrentCase();
      
      const completedCase = queueManager.getCaseById(testCase.id);
      expect(completedCase.metadata.duration).toBeGreaterThan(90); // At least 90ms
      expect(completedCase.metadata.duration).toBeLessThan(200); // Less than 200ms
    });
  });
  
  describe('Multiple Cases Management', () => {
    test('should persist multiple cases in storage', async () => {
      await queueManager.addNewCase({ name: 'Case 1' });
      await queueManager.addNewCase({ name: 'Case 2' });
      await queueManager.addNewCase({ name: 'Case 3' });
      
      // Verify save was called with all cases
      const lastCall = chrome.storage.local.set.mock.calls[chrome.storage.local.set.mock.calls.length - 1][0];
      
      expect(lastCall.casesQueue).toHaveLength(3);
      expect(lastCall.casesQueue[0].name).toBe('Case 1');
      expect(lastCall.casesQueue[2].name).toBe('Case 3');
    });
    
    test('should get recent cases (last 3)', async () => {
      // Create 5 cases
      for (let i = 1; i <= 5; i++) {
        await queueManager.addNewCase({ name: `Case ${i}` });
      }
      
      const recentCases = queueManager.getRecentCases(3);
      
      expect(recentCases).toHaveLength(3);
      // Most recent first (reversed order)
      expect(recentCases[0].name).toBe('Case 5');
      expect(recentCases[1].name).toBe('Case 4');
      expect(recentCases[2].name).toBe('Case 3');
    });
    
    test('should delete case and renumber remaining cases', async () => {
      const case1 = await queueManager.addNewCase({ name: 'Case 1' });
      const case2 = await queueManager.addNewCase({ name: 'Case 2' });
      const case3 = await queueManager.addNewCase({ name: 'Case 3' });
      
      // Delete case 2
      await queueManager.deleteCase(case2.id);
      
      const remaining = queueManager.getAllCases();
      expect(remaining).toHaveLength(2);
      
      // Verify renumbering
      const updatedCase1 = queueManager.getCaseById(case1.id);
      const updatedCase3 = queueManager.getCaseById(case3.id);
      
      expect(updatedCase1.number).toBe(1);
      expect(updatedCase3.number).toBe(2); // Renumbered from 3 to 2
    });
    
    test('should clear current case ID if deleted case was active', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Active Case' });
      await queueManager.startRecordingCase(testCase.id);
      
      expect(queueManager.currentCaseId).toBe(testCase.id);
      
      // Delete active case
      await queueManager.deleteCase(testCase.id);
      
      expect(queueManager.currentCaseId).toBeNull();
    });
  });
  
  describe('Queue Statistics', () => {
    test('should calculate accurate stats', async () => {
      // Create cases with different statuses
      const case1 = await queueManager.addNewCase({ name: 'Draft Case' }); // draft
      
      const case2 = await queueManager.addNewCase({ name: 'Recording Case' });
      await queueManager.startRecordingCase(case2.id);
      await queueManager.addStepToCurrentCase({ type: 'click', number: 1 });
      await queueManager.addStepToCurrentCase({ type: 'input', number: 2 });
      // Still recording
      
      const case3 = await queueManager.addNewCase({ name: 'Completed Case' });
      await queueManager.startRecordingCase(case3.id);
      await queueManager.addStepToCurrentCase({ type: 'click', number: 1 });
      await queueManager.stopCurrentCase();
      
      // Resume recording case2
      await queueManager.startRecordingCase(case2.id);
      
      const stats = queueManager.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.draft).toBe(1);
      expect(stats.recording).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.paused).toBe(0);
      expect(stats.totalSteps).toBe(3); // 2 from case2 + 1 from case3
    });
    
    test('should export complete queue data', async () => {
      await queueManager.addNewCase({ name: 'Export Case 1' });
      await queueManager.addNewCase({ name: 'Export Case 2' });
      
      const exportData = queueManager.exportData();
      
      expect(exportData.cases).toHaveLength(2);
      expect(exportData.stats).toBeDefined();
      expect(exportData.stats.total).toBe(2);
      expect(exportData.exportedAt).toBeTruthy();
      expect(exportData.currentCaseId).toBeNull();
    });
  });
  
  describe('Badge Integration', () => {
    test('should provide case number for badge display', async () => {
      const case1 = await queueManager.addNewCase({ name: 'Badge Test 1' });
      const case2 = await queueManager.addNewCase({ name: 'Badge Test 2' });
      const case3 = await queueManager.addNewCase({ name: 'Badge Test 3' });
      
      await queueManager.startRecordingCase(case2.id);
      
      const currentCase = queueManager.getCurrentCase();
      
      // Badge should show "#2"
      expect(currentCase.number).toBe(2);
      expect(`#${currentCase.number}`).toBe('#2');
    });
  });
  
  describe('Persistence and Recovery', () => {
    test('should load existing cases from storage on initialize', async () => {
      // Simulate storage with existing data
      const existingCases = [
        {
          id: 'case-existing-1',
          number: 1,
          name: 'Existing Case 1',
          status: 'completed',
          steps: [{ type: 'click' }, { type: 'input' }],
          metadata: { createdAt: '2025-01-01T00:00:00Z' }
        },
        {
          id: 'case-existing-2',
          number: 2,
          name: 'Existing Case 2',
          status: 'draft',
          steps: [],
          metadata: { createdAt: '2025-01-02T00:00:00Z' }
        }
      ];
      
      chrome.storage.local.get.mockResolvedValue({
        casesQueue: existingCases,
        currentCaseId: 'case-existing-1'
      });
      
      // Create new instance and initialize
      const newManager = new CasesQueueManager();
      await newManager.initialize();
      
      expect(newManager.cases).toHaveLength(2);
      expect(newManager.currentCaseId).toBe('case-existing-1');
      expect(newManager.getCaseById('case-existing-1').name).toBe('Existing Case 1');
    });
    
    test('should preserve case state across service worker restarts', async () => {
      // First session: create and start case
      const case1 = await queueManager.addNewCase({ name: 'Persistent Case' });
      await queueManager.startRecordingCase(case1.id);
      await queueManager.addStepToCurrentCase({ type: 'click', number: 1 });
      
      const savedData = chrome.storage.local.set.mock.calls[chrome.storage.local.set.mock.calls.length - 1][0];
      
      // Simulate service worker restart
      chrome.storage.local.get.mockResolvedValue(savedData);
      
      const newManager = new CasesQueueManager();
      await newManager.initialize();
      
      // Verify state restored
      expect(newManager.currentCaseId).toBe(case1.id);
      const restoredCase = newManager.getCurrentCase();
      expect(restoredCase.steps).toHaveLength(1);
      expect(restoredCase.status).toBe('recording');
    });
  });
});
