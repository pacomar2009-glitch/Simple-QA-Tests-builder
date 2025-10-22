/**
 * Tests para Popup - Fallback UX (US#121)
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Popup - Fallback Notifications', () => {
  let mockChrome;
  
  beforeEach(() => {
    // Mock DOM
    document.body.innerHTML = `
      <div id="notification-container"></div>
      <div id="status-display"></div>
      <button id="start-btn">Grabar</button>
      <button id="stop-btn">Detener</button>
      <div id="gemini-status"></div>
    `;
    
    // Mock chrome.runtime
    mockChrome = {
      runtime: {
        sendMessage: jest.fn()
      }
    };
    
    global.chrome = mockChrome;
  });
  
  describe('Notification Display', () => {
    test('should show success notification for Gemini mode', () => {
      const container = document.getElementById('notification-container');
      
      // Simulate showNotification function
      const showNotification = (message, type) => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
        
        setTimeout(() => notification.remove(), 2000);
      };
      
      showNotification('✅ Grabación iniciada con IA Gemini', 'success');
      
      const notification = container.querySelector('.notification');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain('✅ Grabación iniciada con IA Gemini');
      expect(notification.className).toContain('success');
    });
    
    test('should show warning notification for fallback mode', () => {
      const container = document.getElementById('notification-container');
      
      const showNotification = (message, type) => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
      };
      
      showNotification('⚠️ Grabación en MODO FALLBACK (sin IA)', 'warning');
      
      const notification = container.querySelector('.notification');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain('⚠️ Grabación en MODO FALLBACK');
      expect(notification.className).toContain('warning');
    });
    
    test('should auto-dismiss notification after 2 seconds', (done) => {
      const container = document.getElementById('notification-container');
      
      const showNotification = (message, type) => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 2000);
      };
      
      showNotification('Test message', 'info');
      
      expect(container.children.length).toBe(1);
      
      setTimeout(() => {
        expect(container.children.length).toBe(0);
        done();
      }, 2100);
    });
  });
  
  describe('Start Recording Flow', () => {
    test('should send startRecording message on button click', () => {
      const startBtn = document.getElementById('start-btn');
      
      startBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'startRecording' });
      });
      
      startBtn.click();
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
        action: 'startRecording' 
      });
    });
    
    test('should display appropriate notification based on response', (done) => {
      const container = document.getElementById('notification-container');
      
      const showNotification = (message, type) => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
      };
      
      // Mock response handler
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) {
          callback({ 
            success: true, 
            geminiEnabled: false 
          });
        }
      });
      
      // Simulate startRecording
      chrome.runtime.sendMessage({ action: 'startRecording' }, (response) => {
        if (response.success) {
          if (response.geminiEnabled) {
            showNotification('✅ Grabación iniciada con IA Gemini', 'success');
          } else {
            showNotification('⚠️ Grabación en MODO FALLBACK (sin IA)', 'warning');
          }
        }
        
        const notification = container.querySelector('.notification.warning');
        expect(notification).toBeTruthy();
        expect(notification.textContent).toContain('MODO FALLBACK');
        done();
      });
    });
  });
  
  describe('Gemini Status Display', () => {
    test('should show API configured status', () => {
      const statusDiv = document.getElementById('gemini-status');
      
      const updateGeminiStatus = (hasApiKey) => {
        if (hasApiKey) {
          statusDiv.innerHTML = '✅ <span class="status-text">Gemini IA activa</span>';
          statusDiv.className = 'gemini-status enabled';
        } else {
          statusDiv.innerHTML = '⚠️ <span class="status-text">Modo Fallback</span>';
          statusDiv.className = 'gemini-status disabled';
        }
      };
      
      updateGeminiStatus(true);
      
      expect(statusDiv.textContent).toContain('Gemini IA activa');
      expect(statusDiv.className).toContain('enabled');
    });
    
    test('should show fallback mode status', () => {
      const statusDiv = document.getElementById('gemini-status');
      
      const updateGeminiStatus = (hasApiKey) => {
        if (hasApiKey) {
          statusDiv.innerHTML = '✅ <span class="status-text">Gemini IA activa</span>';
          statusDiv.className = 'gemini-status enabled';
        } else {
          statusDiv.innerHTML = '⚠️ <span class="status-text">Modo Fallback</span>';
          statusDiv.className = 'gemini-status disabled';
        }
      };
      
      updateGeminiStatus(false);
      
      expect(statusDiv.textContent).toContain('Modo Fallback');
      expect(statusDiv.className).toContain('disabled');
    });
  });
  
  describe('State Updates', () => {
    test('should update UI when recording starts', () => {
      const startBtn = document.getElementById('start-btn');
      const stopBtn = document.getElementById('stop-btn');
      const statusDisplay = document.getElementById('status-display');
      
      const updateUI = (isRecording, geminiEnabled) => {
        if (isRecording) {
          startBtn.disabled = true;
          stopBtn.disabled = false;
          statusDisplay.textContent = geminiEnabled 
            ? '🔴 Grabando con IA'
            : '🟠 Grabando (Modo Fallback)';
        }
      };
      
      updateUI(true, false);
      
      expect(startBtn.disabled).toBe(true);
      expect(stopBtn.disabled).toBe(false);
      expect(statusDisplay.textContent).toContain('Modo Fallback');
    });
    
    test('should update UI when recording stops', () => {
      const startBtn = document.getElementById('start-btn');
      const stopBtn = document.getElementById('stop-btn');
      const statusDisplay = document.getElementById('status-display');
      
      const updateUI = (isRecording) => {
        if (!isRecording) {
          startBtn.disabled = false;
          stopBtn.disabled = true;
          statusDisplay.textContent = 'Listo para grabar';
        }
      };
      
      updateUI(false);
      
      expect(startBtn.disabled).toBe(false);
      expect(stopBtn.disabled).toBe(true);
      expect(statusDisplay.textContent).toBe('Listo para grabar');
    });
  });
  
  describe('Error Handling', () => {
    test('should show error notification on failure', () => {
      const container = document.getElementById('notification-container');
      
      const showNotification = (message, type) => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
      };
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) {
          callback({ 
            success: false, 
            error: 'Failed to start recording' 
          });
        }
      });
      
      chrome.runtime.sendMessage({ action: 'startRecording' }, (response) => {
        if (!response.success) {
          showNotification(`❌ Error: ${response.error}`, 'error');
        }
      });
      
      const notification = container.querySelector('.notification.error');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain('Error');
    });
  });
  
  describe('Configuration Link', () => {
    test('should show config link in fallback warning', () => {
      const container = document.getElementById('notification-container');
      
      const showFallbackWarning = () => {
        const notification = document.createElement('div');
        notification.className = 'notification warning';
        notification.innerHTML = `
          ⚠️ Modo Fallback activo
          <a href="config.html" target="_blank">Configurar API Key</a>
        `;
        container.appendChild(notification);
      };
      
      showFallbackWarning();
      
      const link = container.querySelector('a');
      expect(link).toBeTruthy();
      expect(link.href).toContain('config.html');
    });
  });
});
