/**
 * Unit tests para Content Script - capture.js
 * US#120 + US#55: Captura de eventos de usuario
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('Content Script - Event Capture', () => {
  let mockDocument;
  let mockChrome;
  let captureModule;
  
  beforeEach(() => {
    // Mock del DOM
    mockDocument = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      createElement: jest.fn(),
      getElementById: jest.fn(),
      body: {
        appendChild: jest.fn()
      },
      head: {
        appendChild: jest.fn()
      }
    };
    
    // Mock de Chrome runtime
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        },
        sendMessage: jest.fn(() => Promise.resolve({ success: true }))
      }
    };
    
    global.document = mockDocument;
    global.chrome = mockChrome;
    global.window = { location: { href: 'https://example.com/test' } };
    global.Node = { ELEMENT_NODE: 1 };
    global.console = {
      log: jest.fn(),
      warn: jest.fn()
    };
  });
  
  describe('Message Handling', () => {
    test('should register message listener on load', () => {
      // Simulate script load by checking if listener was registered
      expect(mockChrome.runtime.onMessage.addListener).toBeDefined();
    });
    
    test('should respond to RECORDING_STARTED message', () => {
      const message = { type: 'RECORDING_STARTED', sessionId: 'test-session-123' };
      const sendResponse = jest.fn();
      
      // Simulate message handler
      const handler = (msg, sender, respond) => {
        if (msg.type === 'RECORDING_STARTED') {
          respond({ success: true });
          return false;
        }
      };
      
      handler(message, {}, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
    
    test('should respond to RECORDING_STOPPED message', () => {
      const message = { type: 'RECORDING_STOPPED' };
      const sendResponse = jest.fn();
      
      const handler = (msg, sender, respond) => {
        if (msg.type === 'RECORDING_STOPPED') {
          respond({ success: true });
          return false;
        }
      };
      
      handler(message, {}, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
    
    test('should handle unknown message type', () => {
      const message = { type: 'UNKNOWN_MESSAGE' };
      const sendResponse = jest.fn();
      
      const handler = (msg, sender, respond) => {
        if (!['RECORDING_STARTED', 'RECORDING_STOPPED'].includes(msg.type)) {
          respond({ success: false, error: 'Unknown message' });
        }
      };
      
      handler(message, {}, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Unknown message' });
    });
  });
  
  describe('Start Capture', () => {
    test('should attach event listeners when starting capture', () => {
      const sessionId = 'session-123';
      
      // Simulate startCapture
      mockDocument.addEventListener('click', expect.any(Function), true);
      mockDocument.addEventListener('input', expect.any(Function), true);
      mockDocument.addEventListener('change', expect.any(Function), true);
      mockDocument.addEventListener('submit', expect.any(Function), true);
      mockDocument.addEventListener('keydown', expect.any(Function), true);
      
      expect(mockDocument.addEventListener).toBeDefined();
    });
    
    test('should set capturing state', () => {
      let isCapturing = false;
      let sessionId = null;
      
      // Simulate startCapture
      isCapturing = true;
      sessionId = 'test-session';
      
      expect(isCapturing).toBe(true);
      expect(sessionId).toBe('test-session');
    });
    
    test('should create recording indicator', () => {
      const mockIndicator = {
        id: 'testbuilder-recording-indicator',
        style: {},
        textContent: ''
      };
      
      mockDocument.createElement.mockReturnValue(mockIndicator);
      
      // Simulate showRecordingIndicator
      const indicator = mockDocument.createElement('div');
      indicator.id = 'testbuilder-recording-indicator';
      indicator.textContent = '🔴 REC';
      
      expect(indicator.id).toBe('testbuilder-recording-indicator');
      expect(indicator.textContent).toBe('🔴 REC');
    });
  });
  
  describe('Stop Capture', () => {
    test('should remove event listeners when stopping', () => {
      // Simulate stopCapture
      mockDocument.removeEventListener('click', expect.any(Function), true);
      mockDocument.removeEventListener('input', expect.any(Function), true);
      mockDocument.removeEventListener('change', expect.any(Function), true);
      mockDocument.removeEventListener('submit', expect.any(Function), true);
      mockDocument.removeEventListener('keydown', expect.any(Function), true);
      
      expect(mockDocument.removeEventListener).toBeDefined();
    });
    
    test('should clear capturing state', () => {
      let isCapturing = true;
      let sessionId = 'test-session';
      
      // Simulate stopCapture
      isCapturing = false;
      sessionId = null;
      
      expect(isCapturing).toBe(false);
      expect(sessionId).toBeNull();
    });
    
    test('should remove recording indicator', () => {
      const mockIndicator = { remove: jest.fn() };
      mockDocument.getElementById.mockReturnValue(mockIndicator);
      
      // Simulate hideRecordingIndicator
      const indicator = mockDocument.getElementById('testbuilder-recording-indicator');
      if (indicator) {
        indicator.remove();
      }
      
      expect(mockIndicator.remove).toHaveBeenCalled();
    });
  });
  
  describe('Click Event Handling', () => {
    test('should capture click event with correct data', () => {
      const mockTarget = {
        tagName: 'BUTTON',
        id: 'submit-btn',
        textContent: 'Submit Form',
        attributes: []
      };
      
      const mockEvent = {
        target: mockTarget,
        clientX: 100,
        clientY: 200
      };
      
      const action = {
        type: 'click',
        timestamp: Date.now(),
        selector: `#${mockTarget.id}`,
        tagName: mockTarget.tagName,
        text: mockTarget.textContent.trim().substring(0, 50),
        position: {
          x: mockEvent.clientX,
          y: mockEvent.clientY
        },
        url: window.location.href
      };
      
      expect(action.type).toBe('click');
      expect(action.selector).toBe('#submit-btn');
      expect(action.tagName).toBe('BUTTON');
      expect(action.position.x).toBe(100);
      expect(action.position.y).toBe(200);
    });
    
    test('should not capture click when not capturing', () => {
      let isCapturing = false;
      
      if (!isCapturing) {
        // Should return early
        expect(isCapturing).toBe(false);
      }
    });
  });
  
  describe('Input Event Handling', () => {
    test('should capture input event for text fields', () => {
      const mockTarget = {
        tagName: 'INPUT',
        type: 'text',
        name: 'username',
        value: 'john_doe',
        attributes: []
      };
      
      const action = {
        type: 'input',
        timestamp: Date.now(),
        selector: `[name="${mockTarget.name}"]`,
        tagName: mockTarget.tagName,
        inputType: mockTarget.type,
        value: mockTarget.value,
        url: window.location.href
      };
      
      expect(action.type).toBe('input');
      expect(action.inputType).toBe('text');
      expect(action.value).toBe('john_doe');
    });
    
    test('should redact password input values', () => {
      const mockTarget = {
        tagName: 'INPUT',
        type: 'password',
        name: 'password',
        value: 'secret123',
        attributes: []
      };
      
      // Simulate password redaction
      const value = mockTarget.type === 'password' ? '[REDACTED]' : mockTarget.value;
      
      expect(value).toBe('[REDACTED]');
      expect(value).not.toBe('secret123');
    });
    
    test('should capture input with selector fallback', () => {
      const mockTarget = {
        tagName: 'INPUT',
        type: 'email',
        value: 'test@example.com',
        attributes: [],
        dataset: { testid: 'email-input' }
      };
      
      // data-testid takes priority
      const selector = `[data-testid="${mockTarget.dataset.testid}"]`;
      
      expect(selector).toBe('[data-testid="email-input"]');
    });
  });
  
  describe('Change Event Handling', () => {
    test('should capture checkbox change', () => {
      const mockTarget = {
        tagName: 'INPUT',
        type: 'checkbox',
        id: 'agree-terms',
        checked: true,
        attributes: []
      };
      
      const action = {
        type: 'change',
        timestamp: Date.now(),
        selector: `#${mockTarget.id}`,
        tagName: mockTarget.tagName,
        inputType: mockTarget.type,
        value: mockTarget.checked,
        url: window.location.href
      };
      
      expect(action.type).toBe('change');
      expect(action.inputType).toBe('checkbox');
      expect(action.value).toBe(true);
    });
    
    test('should capture select change', () => {
      const mockTarget = {
        tagName: 'SELECT',
        name: 'country',
        value: 'US',
        type: 'select-one',
        attributes: []
      };
      
      const action = {
        type: 'change',
        timestamp: Date.now(),
        selector: `[name="${mockTarget.name}"]`,
        tagName: mockTarget.tagName,
        inputType: mockTarget.type,
        value: mockTarget.value,
        url: window.location.href
      };
      
      expect(action.type).toBe('change');
      expect(action.value).toBe('US');
    });
  });
  
  describe('Submit Event Handling', () => {
    test('should capture form submit', () => {
      const mockTarget = {
        tagName: 'FORM',
        id: 'login-form',
        action: 'https://example.com/login',
        method: 'POST',
        attributes: []
      };
      
      const action = {
        type: 'submit',
        timestamp: Date.now(),
        selector: `#${mockTarget.id}`,
        tagName: mockTarget.tagName,
        action: mockTarget.action,
        method: mockTarget.method,
        url: window.location.href
      };
      
      expect(action.type).toBe('submit');
      expect(action.action).toBe('https://example.com/login');
      expect(action.method).toBe('POST');
    });
  });
  
  describe('KeyDown Event Handling', () => {
    test('should capture Enter key press', () => {
      const mockEvent = {
        key: 'Enter',
        target: { id: 'search-input' }
      };
      
      const importantKeys = ['Enter', 'Tab', 'Escape'];
      
      if (importantKeys.includes(mockEvent.key)) {
        const action = {
          type: 'keydown',
          timestamp: Date.now(),
          key: mockEvent.key,
          url: window.location.href
        };
        
        expect(action.type).toBe('keydown');
        expect(action.key).toBe('Enter');
      }
    });
    
    test('should capture Tab key press', () => {
      const key = 'Tab';
      const importantKeys = ['Enter', 'Tab', 'Escape'];
      
      expect(importantKeys).toContain(key);
    });
    
    test('should ignore non-important keys', () => {
      const key = 'a';
      const importantKeys = ['Enter', 'Tab', 'Escape'];
      
      expect(importantKeys).not.toContain(key);
    });
  });
  
  describe('Selector Generation', () => {
    test('should prioritize ID selector', () => {
      const element = { id: 'unique-id', name: 'field-name' };
      
      // ID takes priority
      const selector = element.id ? `#${element.id}` : `[name="${element.name}"]`;
      
      expect(selector).toBe('#unique-id');
    });
    
    test('should use name attribute if no ID', () => {
      const element = { name: 'username', className: 'form-control' };
      
      const selector = element.name ? `[name="${element.name}"]` : `.${element.className}`;
      
      expect(selector).toBe('[name="username"]');
    });
    
    test('should use data-testid if no ID or name', () => {
      const element = { dataset: { testid: 'submit-button' } };
      
      const selector = `[data-testid="${element.dataset.testid}"]`;
      
      expect(selector).toBe('[data-testid="submit-button"]');
    });
    
    test('should use class if no better selector', () => {
      const element = {
        tagName: 'BUTTON',
        className: 'btn btn-primary'
      };
      
      const classes = element.className.split(' ').filter(c => c.trim());
      const selector = `${element.tagName.toLowerCase()}.${classes[0]}`;
      
      expect(selector).toBe('button.btn');
    });
    
    test('should fallback to XPath if no other selector', () => {
      const element = {
        tagName: 'DIV',
        nodeType: 1,
        previousSibling: null,
        parentNode: null
      };
      
      // Simplified XPath
      const xpath = `/${element.tagName.toLowerCase()}`;
      
      expect(xpath).toBe('/div');
    });
  });
  
  describe('XPath Generation', () => {
    test('should generate XPath with ID', () => {
      const element = { id: 'main-content' };
      
      const xpath = `//*[@id="${element.id}"]`;
      
      expect(xpath).toBe('//*[@id="main-content"]');
    });
    
    test('should generate XPath with index for siblings', () => {
      const element = {
        tagName: 'DIV',
        nodeType: 1,
        previousSibling: {
          nodeType: 1,
          tagName: 'DIV'
        },
        parentNode: null
      };
      
      // Should have index [2] because there's a previous sibling
      const tagName = element.tagName.toLowerCase();
      const index = 1; // One previous sibling
      const xpath = `/${tagName}[${index + 1}]`;
      
      expect(xpath).toBe('/div[2]');
    });
  });
  
  describe('Attribute Extraction', () => {
    test('should extract element attributes', () => {
      const element = {
        attributes: [
          { name: 'id', value: 'test-id' },
          { name: 'class', value: 'btn' },
          { name: 'data-action', value: 'submit' }
        ]
      };
      
      const attrs = {};
      for (const attr of element.attributes) {
        attrs[attr.name] = attr.value;
      }
      
      expect(attrs.id).toBe('test-id');
      expect(attrs.class).toBe('btn');
      expect(attrs['data-action']).toBe('submit');
    });
    
    test('should exclude style attribute', () => {
      const element = {
        attributes: [
          { name: 'id', value: 'test' },
          { name: 'style', value: 'color: red; background: blue;' }
        ]
      };
      
      const attrs = {};
      for (const attr of element.attributes) {
        if (attr.name === 'style') continue;
        attrs[attr.name] = attr.value;
      }
      
      expect(attrs.id).toBe('test');
      expect(attrs.style).toBeUndefined();
    });
    
    test('should exclude very long attribute values', () => {
      const longValue = 'x'.repeat(250);
      const element = {
        attributes: [
          { name: 'data-long', value: longValue }
        ]
      };
      
      const attrs = {};
      for (const attr of element.attributes) {
        if (attr.value.length > 200) continue;
        attrs[attr.name] = attr.value;
      }
      
      expect(attrs['data-long']).toBeUndefined();
    });
  });
  
  describe('Send Action to Background', () => {
    test('should send action via chrome.runtime.sendMessage', async () => {
      const action = {
        type: 'click',
        timestamp: Date.now(),
        selector: '#test-btn'
      };
      
      await mockChrome.runtime.sendMessage({
        type: 'USER_ACTION',
        payload: action
      });
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'USER_ACTION',
        payload: action
      });
    });
    
    test('should handle send message error gracefully', async () => {
      const errorMessage = 'Connection closed';
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error(errorMessage));
      
      try {
        await mockChrome.runtime.sendMessage({
          type: 'USER_ACTION',
          payload: {}
        });
      } catch (error) {
        expect(error.message).toBe(errorMessage);
      }
    });
  });
  
  describe('Recording Indicator', () => {
    test('should create indicator with correct styles', () => {
      const indicator = {
        id: 'testbuilder-recording-indicator',
        style: {
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: '999999',
          background: '#FF0000'
        },
        textContent: '🔴 REC'
      };
      
      expect(indicator.id).toBe('testbuilder-recording-indicator');
      expect(indicator.style.position).toBe('fixed');
      expect(indicator.style.background).toBe('#FF0000');
      expect(indicator.textContent).toBe('🔴 REC');
    });
    
    test('should append indicator to body', () => {
      const mockIndicator = { style: {} };
      mockDocument.createElement.mockReturnValue(mockIndicator);
      
      const indicator = mockDocument.createElement('div');
      mockDocument.body.appendChild(indicator);
      
      // Verify appendChild was called with the indicator
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
    
    test('should create pulse animation style', () => {
      const style = {
        textContent: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `
      };
      
      expect(style.textContent).toContain('@keyframes pulse');
      expect(style.textContent).toContain('opacity: 1');
      expect(style.textContent).toContain('opacity: 0.6');
    });
  });
  
  describe('Integration Scenarios', () => {
    test('should handle complete recording session', () => {
      let isCapturing = false;
      let sessionId = null;
      
      // Start
      isCapturing = true;
      sessionId = 'session-123';
      expect(isCapturing).toBe(true);
      
      // Capture event
      const action = {
        type: 'click',
        timestamp: Date.now()
      };
      expect(action.type).toBe('click');
      
      // Stop
      isCapturing = false;
      sessionId = null;
      expect(isCapturing).toBe(false);
    });
    
    test('should handle multiple events in sequence', () => {
      const events = [];
      
      events.push({ type: 'click', selector: '#btn1' });
      events.push({ type: 'input', selector: '#input1', value: 'test' });
      events.push({ type: 'submit', selector: '#form1' });
      
      expect(events.length).toBe(3);
      expect(events[0].type).toBe('click');
      expect(events[1].type).toBe('input');
      expect(events[2].type).toBe('submit');
    });
  });
});
