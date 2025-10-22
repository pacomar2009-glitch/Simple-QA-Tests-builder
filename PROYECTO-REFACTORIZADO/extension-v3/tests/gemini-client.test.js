/**
 * Tests para Gemini AI Client (US#121)
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { GeminiAIClient } from '../src/ai-ligera/gemini-client.js';

describe('GeminiAIClient', () => {
  let client;
  
  beforeEach(() => {
    client = new GeminiAIClient();
    // Mock chrome.storage
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
  });
  
  describe('Initialization', () => {
    test('should create instance without API key', () => {
      expect(client).toBeDefined();
      expect(client.isInitialized).toBe(false);
      expect(client.apiKey).toBeNull();
    });
    
    test('should initialize with valid API key', async () => {
      const apiKey = 'AIzaSyTest123';
      const result = await client.initialize(apiKey);
      
      expect(result).toBe(true);
      expect(client.isInitialized).toBe(true);
      expect(client.apiKey).toBe(apiKey);
    });
    
    test('should reject invalid API key', async () => {
      const result = await client.initialize('');
      
      expect(result).toBe(false);
      expect(client.isInitialized).toBe(false);
    });
    
    test('should use correct model', () => {
      expect(client.model).toBe('gemini-2.0-flash-exp'); // Gemini 2.0 Flash Experimental (DEFAULT)
      expect(client.baseURL).toBe('https://generativelanguage.googleapis.com/v1beta'); // v1beta para modelos experimentales
    });
  });
  
  describe('Cache Management', () => {
    test('should generate cache key correctly', () => {
      const elementData = {
        tagName: 'BUTTON',
        id: 'login-btn',
        dataTestId: 'login-button',
        name: ''
      };
      
      const key = client.getCacheKey(elementData);
      expect(key).toBe('BUTTON-login-btn-login-button');
    });
    
    test('should handle missing attributes in cache key', () => {
      const elementData = {
        tagName: 'DIV',
        id: '',
        dataTestId: '',
        name: ''
      };
      
      const key = client.getCacheKey(elementData);
      expect(key).toBe('DIV');
    });
    
    test('should add items to cache', () => {
      const key = 'test-key';
      const value = { test: 'data' };
      
      client.addToCache(key, value);
      
      expect(client.analysisCache.get(key)).toEqual(value);
    });
    
    test('should respect max cache size', () => {
      client.maxCacheSize = 3;
      
      client.addToCache('key1', { data: 1 });
      client.addToCache('key2', { data: 2 });
      client.addToCache('key3', { data: 3 });
      client.addToCache('key4', { data: 4 }); // Should evict key1
      
      expect(client.analysisCache.size).toBe(3);
      expect(client.analysisCache.has('key1')).toBe(false);
      expect(client.analysisCache.has('key4')).toBe(true);
    });
  });
  
  describe('Fallback Analysis', () => {
    test('should generate fallback analysis without API key', () => {
      const elementData = {
        tagName: 'BUTTON',
        id: 'submit-btn',
        dataTestId: 'submit-button',
        ariaLabel: 'Submit form',
        textContent: 'Submit',
        type: 'submit'
      };
      
      const pageContext = {
        url: 'https://example.com/form',
        title: 'Contact Form'
      };
      
      const analysis = client.fallbackAnalysis(elementData, pageContext);
      
      expect(analysis).toBeDefined();
      expect(analysis.source).toBe('fallback-rules');
      expect(analysis.model).toBe('heuristic');
      expect(analysis.selectorPreRanking).toBeInstanceOf(Array);
      expect(analysis.selectorPreRanking.length).toBeGreaterThan(0);
    });
    
    test('should prioritize data-testid in fallback', () => {
      const elementData = {
        tagName: 'BUTTON',
        dataTestId: 'login-button',
        id: 'login-btn',
        ariaLabel: '',
        name: ''
      };
      
      const analysis = client.fallbackAnalysis(elementData, {});
      
      expect(analysis.selectorPreRanking[0].selector).toBe('[data-testid="login-button"]');
      expect(analysis.selectorPreRanking[0].score).toBe(100);
    });
    
    test('should detect form submission intent', () => {
      const elementData = {
        tagName: 'BUTTON',
        type: 'submit',
        textContent: 'Send'
      };
      
      const analysis = client.fallbackAnalysis(elementData, {});
      
      expect(analysis.intent).toBe('form_submission');
    });
    
    test('should detect navigation intent', () => {
      const elementData = {
        tagName: 'A',
        href: 'https://example.com/page',
        textContent: 'Go to page'
      };
      
      const analysis = client.fallbackAnalysis(elementData, {});
      
      expect(analysis.intent).toBe('navigation');
    });
    
    test('should detect authentication intent', () => {
      const elementData = {
        tagName: 'BUTTON',
        textContent: 'Sign In',
        type: 'button'
      };
      
      const analysis = client.fallbackAnalysis(elementData, {});
      
      expect(analysis.intent).toBe('authentication');
    });
    
    test('should detect target="_blank"', () => {
      const elementData = {
        tagName: 'A',
        target: '_blank',
        href: 'https://example.com'
      };
      
      const analysis = client.fallbackAnalysis(elementData, {});
      
      expect(analysis.opensNewTab).toBe(true);
    });
  });
  
  describe('Pre-Analysis', () => {
    test('should use fallback when not initialized', async () => {
      const elementData = {
        tagName: 'BUTTON',
        id: 'test-btn'
      };
      
      const pageContext = {
        url: 'https://example.com'
      };
      
      const analysis = await client.preAnalyzeElement(elementData, pageContext);
      
      expect(analysis.source).toBe('fallback-rules');
    });
    
    test('should use cache for repeated elements', async () => {
      const elementData = {
        tagName: 'BUTTON',
        id: 'test-btn',
        dataTestId: 'test'
      };
      
      const pageContext = { url: 'https://example.com' };
      
      // First call - should add to cache
      const analysis1 = await client.preAnalyzeElement(elementData, pageContext);
      
      // Second call - should use cache
      const analysis2 = await client.preAnalyzeElement(elementData, pageContext);
      
      expect(analysis1).toEqual(analysis2);
    });
  });
  
  describe('Cache Stats', () => {
    test('should provide cache statistics', () => {
      client.addToCache('key1', { data: 1 });
      client.addToCache('key2', { data: 2 });
      
      const stats = client.getCacheStats();
      
      // Nueva estructura con métricas detalladas
      expect(stats.cache.size).toBe(2);
      expect(stats.cache.maxSize).toBe(client.maxCacheSize);
      expect(stats.performance).toBeDefined();
      expect(stats.summary).toBeDefined();
    });
  });
  
  describe('Cache Clear', () => {
    test('should clear all cache', () => {
      client.addToCache('key1', { data: 1 });
      client.addToCache('key2', { data: 2 });
      
      client.clearCache();
      
      expect(client.analysisCache.size).toBe(0);
    });
  });
});
