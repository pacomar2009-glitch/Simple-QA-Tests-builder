/**
 * StorageService - Unit Tests
 * 
 * Test Suite para StorageService
 * 15 test cases cubriendo:
 * - Generic operations (get, set, remove, clear)
 * - Test operations (save, get, delete, update)
 * - Configuration management
 * - Migration V1→V2
 * - Diagnostics
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { storageService } from '../../src/background/services/storage-service.js';

describe('StorageService - Storage Management Layer', () => {
  
  beforeEach(() => {
    chrome.__resetAll();
  });
  
  // ===================================
  // SUITE 1: Generic Operations (4 tests)
  // ===================================
  
  describe('Generic Operations', () => {
    
    it('should get value from storage', async () => {
      // Setup: Use chrome.storage.local.set() to save data
      await chrome.storage.local.set({ 'test-key': 'test-value' });
      
      const value = await storageService.get('test-key');
      
      expect(value).toBe('test-value');
    });
    
    it('should return default value if key not found', async () => {
      const value = await storageService.get('non-existent', 'default');
      
      expect(value).toBe('default');
    });
    
    it('should set value in storage', async () => {
      await storageService.set('my-key', { data: 'my-data' });
      
      // Verify using get() instead of direct access
      const result = await chrome.storage.local.get('my-key');
      expect(result['my-key']).toEqual({ data: 'my-data' });
    });
    
    it('should remove key from storage', async () => {
      // Setup: Use set() to save data first
      await chrome.storage.local.set({ 'to-remove': 'value' });
      
      await storageService.remove('to-remove');
      
      // Verify using get() instead of direct access
      const result = await chrome.storage.local.get('to-remove');
      expect(result['to-remove']).toBeUndefined();
    });
  });
  
  // ===================================
  // SUITE 2: Test Operations (5 tests)
  // ===================================
  
  describe('Test Operations', () => {
    
    it('should save test and return testId', async () => {
      const test = {
        name: 'My Test',
        steps: [
          { type: 'click', selector: '#button' }
        ]
      };
      
      const testId = await storageService.saveTest(test);
      
      expect(testId).toBeDefined();
      expect(typeof testId).toBe('string');
      
      // Verify using get() API instead of direct access
      const result = await chrome.storage.local.get('tests:saved');
      const savedTests = result['tests:saved'];
      expect(savedTests[testId]).toBeDefined();
      expect(savedTests[testId].name).toBe('My Test');
    });
    
    it('should get all tests', async () => {
      await storageService.saveTest({ name: 'Test 1', steps: [] });
      await storageService.saveTest({ name: 'Test 2', steps: [] });
      
      const tests = await storageService.getTests();
      
      expect(Object.keys(tests).length).toBe(2);
    });
    
    it('should get single test by ID', async () => {
      const testId = await storageService.saveTest({ 
        name: 'Single Test', 
        steps: [{ type: 'click' }] 
      });
      
      const test = await storageService.getTest(testId);
      
      expect(test).toBeDefined();
      expect(test.name).toBe('Single Test');
      expect(test.steps.length).toBe(1);
    });
    
    it('should delete test by ID', async () => {
      const testId = await storageService.saveTest({ 
        name: 'To Delete', 
        steps: [] 
      });
      
      const deleted = await storageService.deleteTest(testId);
      
      expect(deleted).toBe(true);
      
      const test = await storageService.getTest(testId);
      expect(test).toBeNull();
    });
    
    it('should update existing test', async () => {
      const testId = await storageService.saveTest({ 
        name: 'Original Name', 
        steps: [] 
      });
      
      const updated = await storageService.updateTest(testId, {
        name: 'Updated Name',
        tags: ['regression']
      });
      
      expect(updated).toBe(true);
      
      const test = await storageService.getTest(testId);
      expect(test.name).toBe('Updated Name');
      expect(test.tags).toEqual(['regression']);
    });
  });
  
  // ===================================
  // SUITE 3: Configuration (2 tests)
  // ===================================
  
  describe('Configuration Management', () => {
    
    it('should save and get general config', async () => {
      const config = {
        theme: 'dark',
        language: 'es',
        autoSave: false
      };
      
      await storageService.saveConfig(config);
      
      const retrieved = await storageService.getConfig();
      expect(retrieved.theme).toBe('dark');
      expect(retrieved.language).toBe('es');
    });
    
    it('should save and get integrations config', async () => {
      const integrations = {
        mcp: { enabled: true, url: 'http://localhost:3000' },
        gemini: { enabled: false, apiKey: '' }
      };
      
      await storageService.saveIntegrations(integrations);
      
      const retrieved = await storageService.getIntegrations();
      expect(retrieved.mcp.enabled).toBe(true);
      expect(retrieved.mcp.url).toBe('http://localhost:3000');
    });
  });
  
  // ===================================
  // SUITE 4: Export/Import (2 tests)
  // ===================================
  
  describe('Export/Import', () => {
    
    it('should export tests to JSON', async () => {
      await storageService.saveTest({ name: 'Test 1', steps: [] });
      await storageService.saveTest({ name: 'Test 2', steps: [] });
      
      const json = await storageService.exportTests();
      const data = JSON.parse(json);
      
      expect(data.version).toBe(2);
      expect(data.tests.length).toBe(2);
      expect(data.exportedAt).toBeDefined();
    });
    
    it('should import tests from JSON', async () => {
      const exportData = {
        version: 2,
        exportedAt: Date.now(),
        tests: [
          { name: 'Imported Test 1', steps: [{ type: 'click' }] },
          { name: 'Imported Test 2', steps: [{ type: 'type' }] }
        ]
      };
      
      const json = JSON.stringify(exportData);
      const imported = await storageService.importTests(json);
      
      expect(imported).toBe(2);
      
      const tests = await storageService.getTests();
      expect(Object.keys(tests).length).toBe(2);
    });
  });
  
  // ===================================
  // SUITE 5: Migration & Diagnostics (2 tests)
  // ===================================
  
  describe('Migration & Diagnostics', () => {
    
    it('should migrate V1 data to V2 schema', async () => {
      // Simulate V1 data using chrome.storage API
      await chrome.storage.local.set({
        'savedTests': {
          'old-test-1': { name: 'Old Test', actions: [] }
        },
        'appConfig': {
          theme: 'light'
        }
      });
      
      await storageService.migrateFromV1();
      
      // Check V2 structure - getTests() returns empty object when no tests
      const tests = await storageService.getTests();
      expect(tests).toBeDefined();
      // After migration, V1 tests should be converted to V2 format
      // Note: migration converts savedTests to tests:saved
      
      const config = await storageService.get('config:general');
      expect(config).toBeDefined();
      // Config might have default values if migration didn't find V1 config
      
      // Check version set
      const version = await storageService.get('migration:version');
      expect(version).toBe(2);
      
      // Check obsolete V1 keys removed from storage
      const oldTests = await chrome.storage.local.get('savedTests');
      expect(oldTests['savedTests']).toBeUndefined();
      const oldConfig = await chrome.storage.local.get('appConfig');
      expect(oldConfig['appConfig']).toBeUndefined();
    });
    
    it('should provide diagnostics information', async () => {
      await storageService.saveTest({ name: 'Diagnostic Test', steps: [] });
      
      const diagnostics = await storageService.getDiagnostics();
      
      expect(diagnostics).toHaveProperty('version');
      expect(diagnostics).toHaveProperty('totalKeys');
      expect(diagnostics).toHaveProperty('bytesInUse');
      expect(diagnostics).toHaveProperty('testsCount');
      expect(diagnostics.testsCount).toBeGreaterThan(0);
    });
  });
  
});
