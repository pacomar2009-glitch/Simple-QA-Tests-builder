/**
 * MCP Converter - Transforms captured browser events to standardized MCP format
 * 
 * Input: Raw events from Chrome extension
 * Output: Normalized MCP JSON with actions and assertions
 */

/**
 * Converts raw browser events to MCP (Model Context Protocol) format
 * @param {Object} input - Raw input from extension
 * @param {string} input.url - Target URL
 * @param {Array} input.steps - Array of captured steps
 * @param {string} input.instructions - Optional user instructions
 * @returns {Object} MCP formatted test data
 */
export function convertToMCP({ url, steps, instructions = '' }) {
  const mcpSteps = [];
  const assertions = [];
  
  // Always start with navigation
  mcpSteps.push({
    action: 'goto',
    selector: null,
    value: url,
    options: {
      waitUntil: 'networkidle'
    }
  });
  
  // Process each captured step
  steps.forEach((step, index) => {
    const mcpStep = convertStepToMCP(step, index);
    if (mcpStep) {
      mcpSteps.push(mcpStep);
      
      // Add implicit assertions for certain actions
      const implicitAssertion = generateImplicitAssertion(step);
      if (implicitAssertion) {
        assertions.push(implicitAssertion);
      }
    }
  });
  
  // Generate test title from URL and actions
  const testTitle = generateTestTitle(url, steps);
  
  return {
    testTitle,
    url,
    instructions,
    steps: mcpSteps,
    assertions,
    metadata: {
      originalStepCount: steps.length,
      mcpStepCount: mcpSteps.length,
      assertionCount: assertions.length,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Converts a single captured step to MCP format
 */
function convertStepToMCP(step, index) {
  const { type, selector, value, meta = {} } = step;
  
  switch (type) {
    case 'click':
      return {
        action: 'click',
        selector: optimizeSelector(selector),
        value: null,
        options: {
          timeout: 5000,
          description: `Click on ${getElementDescription(selector, meta)}`
        }
      };
      
    case 'input':
    case 'change':
      // Mask sensitive data
      const maskedValue = maskSensitiveValue(value, selector, meta);
      return {
        action: 'fill',
        selector: optimizeSelector(selector),
        value: maskedValue,
        options: {
          timeout: 5000,
          clear: true,
          description: `Fill ${getElementDescription(selector, meta)} with "${maskedValue}"`
        }
      };
      
    case 'keydown':
    case 'keypress':
      if (meta.key && ['Enter', 'Tab', 'Escape'].includes(meta.key)) {
        return {
          action: 'press',
          selector: optimizeSelector(selector),
          value: meta.key,
          options: {
            timeout: 5000,
            description: `Press ${meta.key} key`
          }
        };
      }
      return null; // Skip other key events
      
    case 'submit':
      return {
        action: 'click',
        selector: optimizeSelector(selector) || 'button[type="submit"]',
        value: null,
        options: {
          timeout: 5000,
          description: 'Submit form'
        }
      };
      
    case 'navigation':
      if (meta.url && meta.url !== step.url) {
        return {
          action: 'goto',
          selector: null,
          value: meta.url,
          options: {
            waitUntil: 'networkidle',
            description: `Navigate to ${meta.url}`
          }
        };
      }
      return null;
      
    default:
      console.warn(`Unknown step type: ${type}`);
      return null;
  }
}

/**
 * Optimizes CSS selectors for better stability
 */
function optimizeSelector(selector) {
  if (!selector) return null;
  
  // Priority order: ID > data-testid > name > class + tag
  const element = selector;
  
  // If it's already a good selector, return as-is
  if (element.startsWith('#') || element.includes('[data-testid')) {
    return element;
  }
  
  // Try to improve the selector
  try {
    // Extract meaningful parts
    const parts = element.split(' ');
    const lastPart = parts[parts.length - 1];
    
    // If the last part has an ID or specific attribute, use it
    if (lastPart.includes('#') || lastPart.includes('[')) {
      return lastPart;
    }
    
    // Otherwise, return the original selector
    return element;
  } catch (error) {
    console.warn('Failed to optimize selector:', selector, error);
    return selector;
  }
}

/**
 * Masks sensitive values in form inputs
 */
function maskSensitiveValue(value, selector, meta) {
  if (!value) return value;
  
  // Check for password fields
  const sensitivePatterns = [
    /password/i,
    /passwd/i,
    /pwd/i,
    /secret/i,
    /token/i,
    /api[_-]?key/i,
    /auth/i
  ];
  
  const selectorLower = (selector || '').toLowerCase();
  const typeLower = (meta.inputType || '').toLowerCase();
  
  if (typeLower === 'password' || 
      sensitivePatterns.some(pattern => pattern.test(selectorLower))) {
    return '***MASKED***';
  }
  
  // Mask potential credit card numbers
  if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(value)) {
    return '****-****-****-1234';
  }
  
  // Mask potential emails in certain contexts
  if (selectorLower.includes('email') && value.includes('@')) {
    const [local, domain] = value.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  }
  
  return value;
}

/**
 * Generates human-readable description for an element
 */
function getElementDescription(selector, meta) {
  if (!selector) return 'element';
  
  // Extract meaningful text from selector
  if (selector.includes('#')) {
    const id = selector.match(/#([^.\s]+)/)?.[1];
    if (id) return `element with id "${id}"`;
  }
  
  if (meta.text) {
    return `"${meta.text.substring(0, 30)}${meta.text.length > 30 ? '...' : ''}"`;
  }
  
  if (meta.placeholder) {
    return `field with placeholder "${meta.placeholder}"`;
  }
  
  if (selector.includes('button')) {
    return 'button';
  }
  
  if (selector.includes('input')) {
    return 'input field';
  }
  
  return 'element';
}

/**
 * Generates implicit assertions for certain actions
 */
function generateImplicitAssertion(step) {
  const { type, selector, meta = {} } = step;
  
  switch (type) {
    case 'click':
      // For buttons, assert they are visible and clickable
      if (selector && (selector.includes('button') || meta.tagName === 'BUTTON')) {
        return {
          type: 'visible',
          selector: optimizeSelector(selector),
          expected: true,
          description: 'Button should be visible and clickable'
        };
      }
      break;
      
    case 'input':
      // For form inputs, assert the field accepts the value
      if (selector && step.value) {
        return {
          type: 'value',
          selector: optimizeSelector(selector),
          expected: maskSensitiveValue(step.value, selector, meta),
          description: 'Input field should contain the entered value'
        };
      }
      break;
      
    case 'navigation':
      // For navigation, assert the URL changed
      if (meta.url) {
        return {
          type: 'urlIncludes',
          selector: null,
          expected: new URL(meta.url).pathname,
          description: 'URL should include the expected path'
        };
      }
      break;
  }
  
  return null;
}

/**
 * Generates a meaningful test title from URL and actions
 */
function generateTestTitle(url, steps) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const actionTypes = [...new Set(steps.map(s => s.type))];
    
    // Create a descriptive title based on actions
    const actionDescriptions = {
      'click': 'clicking',
      'input': 'filling forms',
      'navigation': 'navigating',
      'submit': 'submitting',
      'keypress': 'keyboard interaction'
    };
    
    const actions = actionTypes
      .map(type => actionDescriptions[type] || type)
      .join(' and ');
    
    return `Test ${domain} - ${actions}`;
  } catch (error) {
    return `Generated test for ${url}`;
  }
}

/**
 * Validates MCP format
 */
export function validateMCP(mcpData) {
  const errors = [];
  
  if (!mcpData.testTitle) {
    errors.push('Missing testTitle');
  }
  
  if (!mcpData.url) {
    errors.push('Missing url');
  }
  
  if (!Array.isArray(mcpData.steps)) {
    errors.push('steps must be an array');
  } else {
    mcpData.steps.forEach((step, index) => {
      if (!step.action) {
        errors.push(`Step ${index}: missing action`);
      }
      
      if (!['goto', 'click', 'fill', 'press', 'waitFor', 'assert'].includes(step.action)) {
        errors.push(`Step ${index}: invalid action "${step.action}"`);
      }
    });
  }
  
  if (!Array.isArray(mcpData.assertions)) {
    errors.push('assertions must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}