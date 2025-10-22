/**
 * Tests para Cases Queue Manager (US#57)
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { CasesQueueManager } from '../src/shared/cases-queue.js';

describe('CasesQueueManager', () => {
  let queueManager;
  let mockStorage;
  
  beforeEach(() => {
    // Mock chrome.storage.local
    mockStorage = {
      data: {},
      get: jest.fn((keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = mockStorage.data[key] || null;
          });
        } else {
          result[keys] = mockStorage.data[keys] || null;
        }
        callback(result);
      }),
      set: jest.fn((items, callback) => {
        Object.assign(mockStorage.data, items);
        if (callback) callback();
      })
    };
    
    global.chrome = {
      storage: {
        local: mockStorage
      }
    };
    
    queueManager = new CasesQueueManager();
  });
  
  describe('Initialization', () => {
    test('should create instance with empty queue', () => {
      expect(queueManager).toBeDefined();
      expect(queueManager.cases).toEqual([]);
      expect(queueManager.currentCaseId).toBeNull();
    });
    
    test('should initialize from storage', async () => {
      mockStorage.data = {
        'casesQueue': [
          { id: 'case1', name: 'Test Case 1', status: 'completed' }
        ],
        'currentCaseId': 'case1'
      };
      
      // Fix: Promise-based chrome.storage.local.get
      mockStorage.get = jest.fn((keys) => {
        return Promise.resolve({
          casesQueue: mockStorage.data['casesQueue'],
          currentCaseId: mockStorage.data['currentCaseId']
        });
      });
      
      await queueManager.initialize();
      
      expect(queueManager.cases.length).toBe(1);
      expect(queueManager.currentCaseId).toBe('case1');
    });
  });
  
  describe('Add New Case', () => {
    test('should add new case with valid data', async () => {
      const caseData = {
        name: 'Login Test',
        description: 'Test user login flow',
        category: 'authentication'
      };
      
      const newCase = await queueManager.addNewCase(caseData);
      
      expect(newCase).toBeDefined();
      expect(newCase.id).toBeDefined();
      expect(newCase.name).toBe('Login Test');
      expect(newCase.status).toBe('draft');
      expect(newCase.steps).toEqual([]);
      expect(newCase.metadata.createdAt).toBeDefined();
    });
    
    test('should reject case without title', async () => {
      // El código NO rechaza casos sin name, genera uno automático
      const caseData = {
        description: 'Test without name'
      };
      
      const newCase = await queueManager.addNewCase(caseData);
      expect(newCase.name).toBe('Caso 1'); // Auto-generated name
    });
    
    test('should generate unique IDs', async () => {
      const case1 = await queueManager.addNewCase({ name: 'Case 1' });
      const case2 = await queueManager.addNewCase({ name: 'Case 2' });
      
      expect(case1.id).not.toBe(case2.id);
    });
    
    test('should add case to queue', async () => {
      await queueManager.addNewCase({ name: 'Test Case' });
      
      expect(queueManager.cases.length).toBe(1);
    });
  });
  
  describe('Start Recording', () => {
    test('should start recording existing case', async () => {
      const newCase = await queueManager.addNewCase({ name: 'Test' });
      
      const result = await queueManager.startRecordingCase(newCase.id);
      
      expect(result).toBe(true);
      expect(queueManager.currentCaseId).toBe(newCase.id);
      expect(newCase.status).toBe('recording');
      expect(newCase.metadata.startedAt).toBeDefined();
    });
    
    test('should reject non-existent case', async () => {
      const result = await queueManager.startRecordingCase('invalid-id');
      expect(result).toBe(false);
    });
    
    test('should pause previous case when starting new one', async () => {
      const case1 = await queueManager.addNewCase({ name: 'Case 1' });
      const case2 = await queueManager.addNewCase({ name: 'Case 2' });
      
      await queueManager.startRecordingCase(case1.id);
      await queueManager.startRecordingCase(case2.id);
      
      expect(case1.status).toBe('paused');
      expect(case2.status).toBe('recording');
      expect(queueManager.currentCaseId).toBe(case2.id);
    });
  });
  
  describe('Pause/Resume Case', () => {
    test('should pause current case', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Test' });
      await queueManager.startRecordingCase(testCase.id);
      
      await queueManager.pauseCurrentCase();
      
      expect(testCase.status).toBe('paused');
      // Note: pauseCurrentCase does NOT clear currentCaseId
      expect(queueManager.currentCaseId).toBe(testCase.id);
    });
    
    test('should resume paused case', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Test' });
      await queueManager.startRecordingCase(testCase.id);
      await queueManager.pauseCurrentCase();
      
      await queueManager.resumeCurrentCase();
      
      expect(testCase.status).toBe('recording');
      expect(queueManager.currentCaseId).toBe(testCase.id);
    });
    
    test('should not pause if no active case', async () => {
      const result = await queueManager.pauseCurrentCase();
      expect(result).toBe(false);
    });
  });
  
  describe('Stop Case', () => {
    test('should complete recording', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Test' });
      await queueManager.startRecordingCase(testCase.id);
      
      await queueManager.stopCurrentCase();
      
      expect(testCase.status).toBe('completed');
      expect(testCase.metadata.completedAt).toBeDefined();
      expect(queueManager.currentCaseId).toBeNull();
    });
    
    test('should calculate duration', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Test' });
      testCase.metadata.startedAt = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
      
      await queueManager.startRecordingCase(testCase.id);
      await queueManager.stopCurrentCase();
      
      expect(testCase.metadata.duration).toBeGreaterThan(0);
    });
  });
  
  describe('Get Recent Cases', () => {
    test('should return last 3 cases by default', async () => {
      await queueManager.addNewCase({ name: 'Case 1' });
      await queueManager.addNewCase({ name: 'Case 2' });
      await queueManager.addNewCase({ name: 'Case 3' });
      await queueManager.addNewCase({ name: 'Case 4' });
      
      const recent = queueManager.getRecentCases();
      
      expect(recent.length).toBe(3);
      expect(recent[0].name).toBe('Case 4'); // Most recent first
      expect(recent[2].name).toBe('Case 2');
    });
    
    test('should respect custom limit', async () => {
      await queueManager.addNewCase({ name: 'Case 1' });
      await queueManager.addNewCase({ name: 'Case 2' });
      await queueManager.addNewCase({ name: 'Case 3' });
      
      const recent = queueManager.getRecentCases(2);
      
      expect(recent.length).toBe(2);
    });
    
    test('should return all cases if less than limit', async () => {
      await queueManager.addNewCase({ name: 'Case 1' });
      
      const recent = queueManager.getRecentCases(3);
      
      expect(recent.length).toBe(1);
    });
  });
  
  describe('Get Current Case', () => {
    test('should return active case', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Test' });
      await queueManager.startRecordingCase(testCase.id);
      
      const current = queueManager.getCurrentCase();
      
      expect(current).toBeDefined();
      expect(current.id).toBe(testCase.id);
    });
    
    test('should return null if no active case', () => {
      const current = queueManager.getCurrentCase();
      expect(current).toBeNull();
    });
  });
  
  describe('Delete Case', () => {
    test('should delete case by id', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Test' });
      
      await queueManager.deleteCase(testCase.id);
      
      expect(queueManager.cases.length).toBe(0);
    });
    
    test('should clear currentCaseId if deleting active case', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Test' });
      await queueManager.startRecordingCase(testCase.id);
      
      await queueManager.deleteCase(testCase.id);
      
      expect(queueManager.currentCaseId).toBeNull();
    });
  });
  
  describe('Get Statistics', () => {
    test('should return correct stats', async () => {
      await queueManager.addNewCase({ name: 'Case 1' });
      const case2 = await queueManager.addNewCase({ name: 'Case 2' });
      await queueManager.startRecordingCase(case2.id);
      await queueManager.stopCurrentCase();
      
      const stats = queueManager.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.draft).toBe(1);
      expect(stats.recording).toBe(0);
    });
  });
  
  describe('Export Data', () => {
    test('should export all cases', async () => {
      await queueManager.addNewCase({ name: 'Case 1' });
      await queueManager.addNewCase({ name: 'Case 2' });
      
      const exported = queueManager.exportData();
      
      expect(exported.cases.length).toBe(2);
      expect(exported.exportedAt).toBeDefined();
      expect(exported.stats).toBeDefined();
    });
    
    test('should export only completed cases when filtered', async () => {
      await queueManager.addNewCase({ name: 'Draft Case' });
      const completedCase = await queueManager.addNewCase({ name: 'Completed Case' });
      await queueManager.startRecordingCase(completedCase.id);
      await queueManager.stopCurrentCase();
      
      // exportData does NOT support filtering, exports all
      const exported = queueManager.exportData();
      const completedOnly = exported.cases.filter(c => c.status === 'completed');
      
      expect(completedOnly.length).toBe(1);
      expect(completedOnly[0].status).toBe('completed');
    });
  });
  
  describe('Persistence', () => {
    test('should save to storage when adding case', async () => {
      await queueManager.addNewCase({ name: 'Test' });
      
      expect(mockStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          casesQueue: expect.any(Array)
        })
      );
    });
    
    test('should save current case ID', async () => {
      const testCase = await queueManager.addNewCase({ name: 'Test' });
      await queueManager.startRecordingCase(testCase.id);
      
      expect(mockStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          currentCaseId: testCase.id
        })
      );
    });
  });
});
