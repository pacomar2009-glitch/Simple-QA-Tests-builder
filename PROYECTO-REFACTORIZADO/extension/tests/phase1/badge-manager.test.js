/**
 * BadgeManager - Unit Tests
 * 
 * Test Suite para BadgeManager
 * 15 test cases cubriendo:
 * - Estados visuales (IDLE, RECORDING, COMPLETE, ERROR)
 * - Actualización de badge (global + per-tab)
 * - Display text formatting
 * - Reset y cleanup
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { badgeManager } from '../../src/badge/badge-manager.js';

describe('BadgeManager - Badge State Management', () => {
  
  beforeEach(() => {
    chrome.__resetAll();
    badgeManager.reset();
  });
  
  // ===================================
  // SUITE 1: Estados Visuales (4 tests)
  // ===================================
  
  describe('Visual States', () => {
    
    it('should initialize with IDLE state', () => {
      const status = badgeManager.getStatus();
      
      expect(status.state).toBe('IDLE');
      expect(status.count).toBe(0);
    });
    
    it('should set RECORDING state (green)', async () => {
      await badgeManager.setState('RECORDING');
      
      const status = badgeManager.getStatus();
      expect(status.state).toBe('RECORDING');
      
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#4CAF50' })
      );
    });
    
    it('should set COMPLETE state (blue)', async () => {
      await badgeManager.setState('COMPLETE');
      
      const status = badgeManager.getStatus();
      expect(status.state).toBe('COMPLETE');
      
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#2196F3' })
      );
    });
    
    it('should set ERROR state (red)', async () => {
      await badgeManager.setState('ERROR');
      
      const status = badgeManager.getStatus();
      expect(status.state).toBe('ERROR');
      
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#F44336' })
      );
    });
  });
  
  // ===================================
  // SUITE 2: Update Operations (5 tests)
  // ===================================
  
  describe('Update Operations', () => {
    
    it('should update badge with count and state', async () => {
      await badgeManager.updateBadge(5, 'RECORDING');
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        expect.objectContaining({ text: '5' })
      );
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#4CAF50' })
      );
    });
    
    it('should update only count, keeping current state', async () => {
      await badgeManager.setState('RECORDING');
      chrome.action.setBadgeBackgroundColor.mockClear();
      
      await badgeManager.updateCount(10);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        expect.objectContaining({ text: '10' })
      );
      
      const status = badgeManager.getStatus();
      expect(status.state).toBe('RECORDING');
    });
    
    it('should call chrome.action APIs for global and per-tab updates', async () => {
      // Mock tabs query to return 2 tabs
      chrome.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example1.com' },
        { id: 2, url: 'https://example2.com' }
      ]);
      
      await badgeManager.updateBadge(3, 'RECORDING');
      
      // Global update
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3' });
      
      // Per-tab updates (for incognito support)
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ 
        text: '3', 
        tabId: 1 
      });
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ 
        text: '3', 
        tabId: 2 
      });
    });
    
    it('should use setRecording helper to toggle recording state', async () => {
      await badgeManager.setRecording(true);
      
      let status = badgeManager.getStatus();
      expect(status.state).toBe('RECORDING');
      
      await badgeManager.setRecording(false);
      
      status = badgeManager.getStatus();
      expect(status.state).toBe('IDLE');
    });
    
    it('should use setError helper to toggle error state', async () => {
      await badgeManager.setError(true);
      
      let status = badgeManager.getStatus();
      expect(status.state).toBe('ERROR');
      
      await badgeManager.setError(false);
      
      status = badgeManager.getStatus();
      expect(status.state).toBe('IDLE');
    });
  });
  
  // ===================================
  // SUITE 3: Display Text (3 tests)
  // ===================================
  
  describe('Display Text Formatting', () => {
    
    it('should always show "0" minimum (never empty)', async () => {
      await badgeManager.updateCount(0);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        expect.objectContaining({ text: '0' })
      );
    });
    
    it('should display numbers 1-999 as-is', async () => {
      await badgeManager.updateCount(42);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        expect.objectContaining({ text: '42' })
      );
      
      await badgeManager.updateCount(999);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        expect.objectContaining({ text: '999' })
      );
    });
    
    it('should display "999+" for numbers >= 1000', async () => {
      await badgeManager.updateCount(1000);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        expect.objectContaining({ text: '999+' })
      );
      
      await badgeManager.updateCount(5000);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        expect.objectContaining({ text: '999+' })
      );
    });
  });
  
  // ===================================
  // SUITE 4: Reset & Cleanup (3 tests)
  // ===================================
  
  describe('Reset & Cleanup', () => {
    
    it('should clear badge (empty text, no color)', async () => {
      // Set some state first
      await badgeManager.updateBadge(10, 'RECORDING');
      
      // Clear
      await badgeManager.clearBadge();
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ 
        color: '#000000' 
      });
    });
    
    it('should reset to IDLE state with "0" count', async () => {
      // Set recording state
      await badgeManager.updateBadge(25, 'RECORDING');
      
      // Reset
      await badgeManager.reset();
      
      const status = badgeManager.getStatus();
      expect(status.state).toBe('IDLE');
      expect(status.count).toBe(0);
      
      // Should show "0"
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith(
        expect.objectContaining({ text: '0' })
      );
    });
    
    it('should preserve state across multiple updates', async () => {
      await badgeManager.updateBadge(1, 'RECORDING');
      await badgeManager.updateCount(2);
      await badgeManager.updateCount(3);
      
      const status = badgeManager.getStatus();
      expect(status.count).toBe(3);
      expect(status.state).toBe('RECORDING');
    });
  });
  
});
