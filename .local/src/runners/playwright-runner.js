/**
 * Playwright Test Runner - Executes generated Playwright tests
 * 
 * Handles test execution, artifact collection, and result reporting
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Executes Playwright tests and manages artifacts
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution results
 */
export async function runPlaywrightTests(options = {}) {
  const {
    testFile,
    jobId,
    config = {},
    outputDir = './runs',
    timeout = 30000,
    headed = false,
    browsers = ['chromium'],
    retries = 1
  } = options;
  
  try {
    // Setup execution environment
    const runDir = path.join(outputDir, jobId);
    await ensureDirectory(runDir);
    
    // Prepare test execution
    const testConfig = await prepareTestExecution(testFile, runDir, config);
    
    // Execute tests
    const results = await executeTests({
      testFile: testConfig.testFile,
      configFile: testConfig.configFile,
      outputDir: runDir,
      headed,
      browsers,
      retries,
      timeout
    });
    
    // Collect artifacts
    const artifacts = await collectArtifacts(runDir, jobId);
    
    // Generate report
    const report = await generateExecutionReport(results, artifacts, options);
    
    return {
      success: results.exitCode === 0,
      exitCode: results.exitCode,
      stdout: results.stdout,
      stderr: results.stderr,
      artifacts,
      report,
      runDir
    };
    
  } catch (error) {
    console.error('Test execution failed:', error);
    return {
      success: false,
      error: error.message,
      artifacts: [],
      report: null
    };
  }
}

/**
 * Prepares test execution environment
 */
async function prepareTestExecution(testFile, runDir, config) {
  // Copy test file to run directory
  const testFileName = path.basename(testFile);
  const runTestFile = path.join(runDir, testFileName);
  await fs.copyFile(testFile, runTestFile);
  
  // Generate playwright config for this run
  const configContent = generateRunConfig(config, runDir);
  const configFile = path.join(runDir, 'playwright.config.js');
  await fs.writeFile(configFile, configContent);
  
  // Create test directories
  await ensureDirectory(path.join(runDir, 'test-results'));
  await ensureDirectory(path.join(runDir, 'playwright-report'));
  await ensureDirectory(path.join(runDir, 'traces'));
  await ensureDirectory(path.join(runDir, 'screenshots'));
  
  return {
    testFile: runTestFile,
    configFile
  };
}

/**
 * Executes Playwright tests with specified configuration
 */
async function executeTests(options) {
  const {
    testFile,
    configFile,
    outputDir,
    headed,
    browsers,
    retries,
    timeout
  } = options;
  
  return new Promise((resolve) => {
    const args = [
      'test',
      testFile,
      `--config=${configFile}`,
      `--reporter=json`,
      `--output-dir=${path.join(outputDir, 'test-results')}`,
      `--retries=${retries}`,
      `--timeout=${timeout}`
    ];
    
    if (headed) {
      args.push('--headed');
    }
    
    // Add browser projects
    browsers.forEach(browser => {
      args.push(`--project=${browser}`);
    });
    
    console.log('Executing Playwright with args:', args);
    
    const child = spawn('npx', ['playwright', ...args], {
      cwd: outputDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(output);
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(output);
    });
    
    child.on('close', (exitCode) => {
      resolve({
        exitCode,
        stdout,
        stderr
      });
    });
    
    child.on('error', (error) => {
      console.error('Failed to start Playwright:', error);
      resolve({
        exitCode: 1,
        stdout,
        stderr: stderr + '\n' + error.message
      });
    });
  });
}

/**
 * Collects test artifacts (screenshots, traces, videos, reports)
 */
async function collectArtifacts(runDir, jobId) {
  const artifacts = [];
  
  try {
    // Collect screenshots
    const screenshotDir = path.join(runDir, 'test-results');
    if (await directoryExists(screenshotDir)) {
      const screenshots = await collectFiles(screenshotDir, /\.(png|jpg|jpeg)$/);
      artifacts.push(...screenshots.map(file => ({
        type: 'screenshot',
        path: file,
        relativePath: path.relative(runDir, file),
        size: 0 // Will be filled later
      })));
    }
    
    // Collect traces
    const traceDir = path.join(runDir, 'test-results');
    if (await directoryExists(traceDir)) {
      const traces = await collectFiles(traceDir, /\.zip$/);
      artifacts.push(...traces.map(file => ({
        type: 'trace',
        path: file,
        relativePath: path.relative(runDir, file),
        size: 0
      })));
    }
    
    // Collect videos
    const videoDir = path.join(runDir, 'test-results');
    if (await directoryExists(videoDir)) {
      const videos = await collectFiles(videoDir, /\.(mp4|webm)$/);
      artifacts.push(...videos.map(file => ({
        type: 'video',
        path: file,
        relativePath: path.relative(runDir, file),
        size: 0
      })));
    }
    
    // Collect HTML report
    const reportPath = path.join(runDir, 'playwright-report', 'index.html');
    if (await fileExists(reportPath)) {
      artifacts.push({
        type: 'report',
        path: reportPath,
        relativePath: 'playwright-report/index.html',
        size: 0
      });
    }
    
    // Collect JSON results
    const resultsPath = path.join(runDir, 'test-results', 'results.json');
    if (await fileExists(resultsPath)) {
      artifacts.push({
        type: 'results',
        path: resultsPath,
        relativePath: 'test-results/results.json',
        size: 0
      });
    }
    
    // Fill file sizes
    for (const artifact of artifacts) {
      try {
        const stats = await fs.stat(artifact.path);
        artifact.size = stats.size;
        artifact.created = stats.ctime;
        artifact.modified = stats.mtime;
      } catch (error) {
        console.warn(`Failed to get stats for ${artifact.path}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Failed to collect artifacts:', error);
  }
  
  return artifacts;
}

/**
 * Generates execution report
 */
async function generateExecutionReport(results, artifacts, options) {
  const report = {
    jobId: options.jobId,
    testFile: options.testFile,
    executedAt: new Date().toISOString(),
    success: results.exitCode === 0,
    exitCode: results.exitCode,
    configuration: {
      headed: options.headed || false,
      browsers: options.browsers || ['chromium'],
      retries: options.retries || 1,
      timeout: options.timeout || 30000
    },
    artifacts: artifacts.map(a => ({
      type: a.type,
      path: a.relativePath,
      size: a.size,
      created: a.created
    })),
    summary: {
      totalArtifacts: artifacts.length,
      screenshots: artifacts.filter(a => a.type === 'screenshot').length,
      traces: artifacts.filter(a => a.type === 'trace').length,
      videos: artifacts.filter(a => a.type === 'video').length
    }
  };
  
  // Try to parse JSON results if available
  try {
    const resultsFile = artifacts.find(a => a.type === 'results');
    if (resultsFile && await fileExists(resultsFile.path)) {
      const resultsData = await fs.readFile(resultsFile.path, 'utf8');
      const parsedResults = JSON.parse(resultsData);
      
      report.testResults = {
        suites: parsedResults.suites?.length || 0,
        tests: parsedResults.tests?.length || 0,
        passed: parsedResults.tests?.filter(t => t.outcome === 'expected').length || 0,
        failed: parsedResults.tests?.filter(t => t.outcome === 'unexpected').length || 0,
        skipped: parsedResults.tests?.filter(t => t.outcome === 'skipped').length || 0
      };
    }
  } catch (error) {
    console.warn('Failed to parse test results:', error);
  }
  
  return report;
}

/**
 * Generates Playwright configuration for a specific run
 */
function generateRunConfig(config, runDir) {
  const defaultConfig = {
    testDir: runDir,
    fullyParallel: false,
    retries: 1,
    workers: 1,
    timeout: 30000,
    use: {
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure'
    },
    projects: [
      { name: 'chromium', use: { channel: 'chrome' } }
    ]
  };
  
  const mergedConfig = { ...defaultConfig, ...config };
  
  return `
import { defineConfig } from '@playwright/test';

export default defineConfig(${JSON.stringify(mergedConfig, null, 2)});
`;
}

/**
 * Utility functions
 */
async function ensureDirectory(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function directoryExists(dir) {
  try {
    const stats = await fs.stat(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(file) {
  try {
    const stats = await fs.stat(file);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function collectFiles(dir, pattern) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await collectFiles(fullPath, pattern);
        files.push(...subFiles);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Failed to read directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * Kills any running Playwright processes
 */
export async function killPlaywrightProcesses() {
  return new Promise((resolve) => {
    const killCommand = process.platform === 'win32' 
      ? 'taskkill /F /IM playwright.exe /T'
      : 'pkill -f playwright';
    
    const child = spawn(killCommand, [], { shell: true });
    
    child.on('close', () => {
      resolve();
    });
    
    child.on('error', () => {
      resolve(); // Don't fail if kill fails
    });
  });
}

/**
 * Checks if Playwright is installed and browsers are available
 */
export async function checkPlaywrightInstallation() {
  return new Promise((resolve) => {
    const child = spawn('npx', ['playwright', '--version'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({
          installed: true,
          version: stdout.trim()
        });
      } else {
        resolve({
          installed: false,
          error: 'Playwright not found'
        });
      }
    });
    
    child.on('error', (error) => {
      resolve({
        installed: false,
        error: error.message
      });
    });
  });
}