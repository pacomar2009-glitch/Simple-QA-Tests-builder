/**
 * Manual Test Generator - Creates human-readable test cases from MCP data
 * 
 * Generates: Gherkin features, test case documents, step-by-step guides
 */

/**
 * Generates Gherkin feature file from MCP data
 * @param {Object} mcpData - MCP formatted test data
 * @param {Object} options - Generation options
 * @returns {string} Gherkin feature file content
 */
export function generateGherkinFeature(mcpData, options = {}) {
  const {
    language = 'en',
    includeComments = true,
    scenarioType = 'Scenario'
  } = options;
  
  const keywords = getGherkinKeywords(language);
  const feature = generateFeatureHeader(mcpData, keywords, includeComments);
  const scenario = generateScenario(mcpData, keywords, scenarioType);
  
  return `${feature}\n\n${scenario}`;
}

/**
 * Generates test case document in markdown format
 * @param {Object} mcpData - MCP formatted test data
 * @param {Object} options - Generation options
 * @returns {string} Markdown test case document
 */
export function generateTestCaseDocument(mcpData, options = {}) {
  const {
    includeMetadata = true,
    includeScreenshots = true,
    includeExpectedResults = true,
    format = 'markdown'
  } = options;
  
  if (format === 'markdown') {
    return generateMarkdownTestCase(mcpData, options);
  } else if (format === 'jira') {
    return generateJiraTestCase(mcpData, options);
  } else {
    return generatePlainTextTestCase(mcpData, options);
  }
}

/**
 * Generates step-by-step manual test guide
 * @param {Object} mcpData - MCP formatted test data
 * @returns {string} Step-by-step guide
 */
export function generateStepByStepGuide(mcpData) {
  const steps = mcpData.steps || [];
  const assertions = mcpData.assertions || [];
  
  let guide = `# Manual Test Guide: ${mcpData.testTitle}\n\n`;
  guide += `**Test URL:** ${mcpData.url}\n\n`;
  
  if (mcpData.instructions) {
    guide += `**Instructions:** ${mcpData.instructions}\n\n`;
  }
  
  guide += `## Prerequisites\n`;
  guide += `- [ ] Browser is open and ready\n`;
  guide += `- [ ] No existing session data interferes with the test\n`;
  guide += `- [ ] Network connection is stable\n\n`;
  
  guide += `## Test Steps\n\n`;
  
  steps.forEach((step, index) => {
    const stepNumber = index + 1;
    const description = convertStepToHumanReadable(step);
    const expectedResult = getExpectedResultForStep(step, assertions);
    
    guide += `### Step ${stepNumber}\n`;
    guide += `**Action:** ${description.action}\n`;
    if (description.details) {
      guide += `**Details:** ${description.details}\n`;
    }
    if (expectedResult) {
      guide += `**Expected Result:** ${expectedResult}\n`;
    }
    guide += `**Status:** [ ] Pass [ ] Fail\n`;
    guide += `**Notes:** ________________\n\n`;
  });
  
  if (assertions.length > 0) {
    guide += `## Final Verification\n\n`;
    assertions.forEach((assertion, index) => {
      guide += `${index + 1}. ${convertAssertionToHumanReadable(assertion)}\n`;
    });
    guide += `\n`;
  }
  
  guide += `## Test Result\n`;
  guide += `- [ ] **PASS** - All steps completed successfully\n`;
  guide += `- [ ] **FAIL** - One or more steps failed\n`;
  guide += `- [ ] **BLOCKED** - Cannot complete due to external issues\n\n`;
  guide += `**Tester:** ________________\n`;
  guide += `**Date:** ________________\n`;
  guide += `**Browser/Version:** ________________\n`;
  guide += `**Comments:**\n`;
  guide += `_________________________________\n`;
  guide += `_________________________________\n`;
  
  return guide;
}

/**
 * Converts MCP step to human-readable description
 */
function convertStepToHumanReadable(step) {
  const { action, selector, value, options = {} } = step;
  
  switch (action) {
    case 'goto':
      return {
        action: `Navigate to ${value}`,
        details: 'Wait for the page to fully load'
      };
      
    case 'click':
      const elementDesc = getElementDescriptionFromSelector(selector);
      return {
        action: `Click on ${elementDesc}`,
        details: options.description
      };
      
    case 'fill':
      const fieldDesc = getElementDescriptionFromSelector(selector);
      const maskedValue = value === '***MASKED***' ? '[SENSITIVE DATA]' : value;
      return {
        action: `Enter "${maskedValue}" into ${fieldDesc}`,
        details: options.clear ? 'Clear the field first' : undefined
      };
      
    case 'press':
      return {
        action: `Press ${value} key`,
        details: selector ? `While focused on ${getElementDescriptionFromSelector(selector)}` : undefined
      };
      
    case 'waitFor':
      return {
        action: 'Wait for element or condition',
        details: options.description || `Wait for ${selector || 'condition'}`
      };
      
    default:
      return {
        action: `Perform ${action}`,
        details: options.description
      };
  }
}

/**
 * Converts assertion to human-readable verification
 */
function convertAssertionToHumanReadable(assertion) {
  const { type, selector, expected, description } = assertion;
  
  if (description) {
    return description;
  }
  
  const elementDesc = getElementDescriptionFromSelector(selector);
  
  switch (type) {
    case 'visible':
      return `Verify that ${elementDesc} is visible on the page`;
      
    case 'hidden':
      return `Verify that ${elementDesc} is not visible on the page`;
      
    case 'text':
      return `Verify that ${elementDesc} contains the text "${expected}"`;
      
    case 'value':
      return `Verify that ${elementDesc} has the value "${expected}"`;
      
    case 'urlIncludes':
      return `Verify that the page URL contains "${expected}"`;
      
    case 'titleContains':
      return `Verify that the page title contains "${expected}"`;
      
    default:
      return `Verify ${type} condition for ${elementDesc}`;
  }
}

/**
 * Gets Gherkin keywords for different languages
 */
function getGherkinKeywords(language) {
  const keywords = {
    en: {
      feature: 'Feature',
      scenario: 'Scenario',
      given: 'Given',
      when: 'When',
      then: 'Then',
      and: 'And',
      but: 'But'
    },
    es: {
      feature: 'Característica',
      scenario: 'Escenario',
      given: 'Dado',
      when: 'Cuando',
      then: 'Entonces',
      and: 'Y',
      but: 'Pero'
    }
  };
  
  return keywords[language] || keywords.en;
}

/**
 * Generates Gherkin feature header
 */
function generateFeatureHeader(mcpData, keywords, includeComments) {
  let header = '';
  
  if (includeComments) {
    header += `# Generated from MCP data at ${mcpData.metadata?.generatedAt || new Date().toISOString()}\n`;
    header += `# Original URL: ${mcpData.url}\n`;
    if (mcpData.instructions) {
      header += `# Instructions: ${mcpData.instructions}\n`;
    }
    header += '\n';
  }
  
  header += `${keywords.feature}: ${mcpData.testTitle}\n`;
  header += `  As a user\n`;
  header += `  I want to test the functionality of ${new URL(mcpData.url).hostname}\n`;
  header += `  So that I can ensure it works correctly`;
  
  return header;
}

/**
 * Generates Gherkin scenario
 */
function generateScenario(mcpData, keywords, scenarioType) {
  const steps = mcpData.steps || [];
  const assertions = mcpData.assertions || [];
  
  let scenario = `  ${scenarioType}: Test basic functionality\n`;
  
  // Given steps (setup)
  const gotoStep = steps.find(s => s.action === 'goto');
  if (gotoStep) {
    scenario += `    ${keywords.given} I navigate to "${gotoStep.value}"\n`;
  }
  
  // When steps (actions)
  const actionSteps = steps.filter(s => s.action !== 'goto');
  actionSteps.forEach((step, index) => {
    const keyword = index === 0 ? keywords.when : keywords.and;
    const description = convertStepToGherkinStep(step);
    scenario += `    ${keyword} ${description}\n`;
  });
  
  // Then steps (assertions)
  assertions.forEach((assertion, index) => {
    const keyword = index === 0 ? keywords.then : keywords.and;
    const description = convertAssertionToGherkinStep(assertion);
    scenario += `    ${keyword} ${description}\n`;
  });
  
  // If no explicit assertions, add a general one
  if (assertions.length === 0) {
    scenario += `    ${keywords.then} the action should complete successfully\n`;
  }
  
  return scenario;
}

/**
 * Converts MCP step to Gherkin step
 */
function convertStepToGherkinStep(step) {
  const { action, selector, value } = step;
  
  switch (action) {
    case 'click':
      return `I click on the element "${getElementDescriptionFromSelector(selector)}"`;
      
    case 'fill':
      const maskedValue = value === '***MASKED***' ? '[SENSITIVE DATA]' : value;
      return `I enter "${maskedValue}" into the field "${getElementDescriptionFromSelector(selector)}"`;
      
    case 'press':
      return `I press the "${value}" key`;
      
    default:
      return `I ${action} on "${getElementDescriptionFromSelector(selector) || 'element'}"`;
  }
}

/**
 * Converts assertion to Gherkin step
 */
function convertAssertionToGherkinStep(assertion) {
  const { type, expected } = assertion;
  
  switch (type) {
    case 'visible':
      return 'the element should be visible';
      
    case 'urlIncludes':
      return `the URL should contain "${expected}"`;
      
    case 'text':
      return `the element should contain the text "${expected}"`;
      
    default:
      return `the ${type} condition should be satisfied`;
  }
}

/**
 * Extracts human-readable description from CSS selector
 */
function getElementDescriptionFromSelector(selector) {
  if (!selector) return 'element';
  
  // Extract ID
  const idMatch = selector.match(/#([^.\s\[]+)/);
  if (idMatch) {
    return `element with ID "${idMatch[1]}"`;
  }
  
  // Extract data-testid
  const testIdMatch = selector.match(/\[data-testid=["']([^"']+)["']\]/);
  if (testIdMatch) {
    return `element with test ID "${testIdMatch[1]}"`;
  }
  
  // Extract tag name
  const tagMatch = selector.match(/^([a-zA-Z]+)/);
  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase();
    if (tag === 'button') return 'button';
    if (tag === 'input') return 'input field';
    if (tag === 'a') return 'link';
    if (tag === 'img') return 'image';
    return `${tag} element`;
  }
  
  return 'element';
}

/**
 * Generates markdown test case document
 */
function generateMarkdownTestCase(mcpData, options) {
  let doc = `# Test Case: ${mcpData.testTitle}\n\n`;
  
  if (options.includeMetadata) {
    doc += `## Test Information\n`;
    doc += `- **Test ID:** TC-${Date.now()}\n`;
    doc += `- **Created:** ${mcpData.metadata?.generatedAt || new Date().toISOString()}\n`;
    doc += `- **URL:** ${mcpData.url}\n`;
    doc += `- **Type:** Functional Test\n`;
    doc += `- **Priority:** Medium\n\n`;
  }
  
  if (mcpData.instructions) {
    doc += `## Test Objective\n${mcpData.instructions}\n\n`;
  }
  
  doc += `## Prerequisites\n`;
  doc += `- Browser is available and functional\n`;
  doc += `- Internet connection is available\n`;
  doc += `- Target application is accessible\n\n`;
  
  doc += `## Test Steps\n\n`;
  doc += `| Step | Action | Expected Result |\n`;
  doc += `|------|--------|----------------|\n`;
  
  mcpData.steps.forEach((step, index) => {
    const description = convertStepToHumanReadable(step);
    const expected = getExpectedResultForStep(step, mcpData.assertions) || 'Action completes successfully';
    doc += `| ${index + 1} | ${description.action} | ${expected} |\n`;
  });
  
  if (mcpData.assertions.length > 0) {
    doc += `\n## Verification Points\n\n`;
    mcpData.assertions.forEach((assertion, index) => {
      doc += `${index + 1}. ${convertAssertionToHumanReadable(assertion)}\n`;
    });
  }
  
  doc += `\n## Test Data\n`;
  doc += `- Test URL: ${mcpData.url}\n`;
  doc += `- Browser: Any modern browser\n`;
  doc += `- Environment: Production/Staging\n\n`;
  
  doc += `## Expected Result\n`;
  doc += `All test steps should execute successfully without errors.\n\n`;
  
  doc += `## Actual Result\n`;
  doc += `_To be filled during test execution_\n\n`;
  
  doc += `## Status\n`;
  doc += `- [ ] Pass\n`;
  doc += `- [ ] Fail\n`;
  doc += `- [ ] Blocked\n\n`;
  
  doc += `## Notes\n`;
  doc += `_Additional comments or observations_\n`;
  
  return doc;
}

/**
 * Generates JIRA-compatible test case
 */
function generateJiraTestCase(mcpData, options) {
  let jira = `h1. ${mcpData.testTitle}\n\n`;
  
  jira += `h2. Test Information\n`;
  jira += `* *Test Type:* Functional\n`;
  jira += `* *URL:* ${mcpData.url}\n`;
  jira += `* *Created:* ${mcpData.metadata?.generatedAt || new Date().toISOString()}\n\n`;
  
  if (mcpData.instructions) {
    jira += `h2. Objective\n${mcpData.instructions}\n\n`;
  }
  
  jira += `h2. Prerequisites\n`;
  jira += `* Browser is available\n`;
  jira += `* Target application is accessible\n\n`;
  
  jira += `h2. Test Steps\n`;
  jira += `|| Step || Action || Expected Result ||\n`;
  
  mcpData.steps.forEach((step, index) => {
    const description = convertStepToHumanReadable(step);
    const expected = getExpectedResultForStep(step, mcpData.assertions) || 'Action completes';
    jira += `| ${index + 1} | ${description.action} | ${expected} |\n`;
  });
  
  jira += `\nh2. Expected Result\nAll steps execute successfully.\n\n`;
  jira += `h2. Actual Result\n_To be updated during execution_\n`;
  
  return jira;
}

/**
 * Gets expected result for a specific step
 */
function getExpectedResultForStep(step, assertions) {
  if (!assertions) return null;
  
  const relatedAssertion = assertions.find(a => 
    a.selector === step.selector || 
    (step.action === 'goto' && a.type === 'urlIncludes')
  );
  
  if (relatedAssertion) {
    return convertAssertionToHumanReadable(relatedAssertion);
  }
  
  return null;
}