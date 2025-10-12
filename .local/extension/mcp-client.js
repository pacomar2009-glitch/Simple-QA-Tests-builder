// MCP Service Configuration for Chrome Extension with Auto-Recovery
const MCP_CONFIG = {
  LOCAL_ENDPOINT: 'http://localhost:3000',
  ENDPOINTS: {
    GENERATE: '/api/generate',
    STATUS: '/api/status',
    HEALTH: '/api/health'
  },
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  AUTO_RECOVERY: true,
  HEALTH_CHECK_INTERVAL: 30000 // 30 seconds
};

/**
 * Enhanced MCP Service Client with Auto-Recovery
 */
class MCPServiceClient {
  constructor() {
    this.baseUrl = MCP_CONFIG.LOCAL_ENDPOINT;
    this.timeout = MCP_CONFIG.TIMEOUT;
    this.maxRetries = MCP_CONFIG.MAX_RETRIES;
    this.isHealthy = false;
    this.healthCheckInterval = null;
    this.autoRecoveryEnabled = MCP_CONFIG.AUTO_RECOVERY;
    
    // Initialize auto-recovery components
    this.initializeAutoRecovery();
  }

  /**
   * Initialize auto-recovery system
   */
  async initializeAutoRecovery() {
    console.log('🛡️ [MCP] Initializing auto-recovery system...');
    
    // Load auto-recovery modules
    try {
      // Auto-manager for server startup
      if (typeof mcpAutoManager !== 'undefined') {
        await mcpAutoManager.initialize();
      }
      
      // Port manager for conflict resolution
      if (typeof mcpPortManager !== 'undefined') {
        await mcpPortManager.updateMCPClientConfig();
      }
      
      // Dependency manager for missing deps
      if (typeof mcpDependencyManager !== 'undefined') {
        const depsOk = await mcpDependencyManager.checkAllDependencies();
        if (!depsOk) {
          console.warn('⚠️ [MCP] Dependencies check failed, some features may not work');
        }
      }
      
      // Start continuous health monitoring
      this.startHealthMonitoring();
      
      console.log('✅ [MCP] Auto-recovery system initialized');
      
    } catch (error) {
      console.error('❌ [MCP] Auto-recovery initialization failed:', error);
    }
  }

  /**
   * Start continuous health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      const wasHealthy = this.isHealthy;
      this.isHealthy = await this.checkHealth();
      
      // Status change detection
      if (wasHealthy && !this.isHealthy) {
        console.warn('⚠️ [MCP] Service became unhealthy, attempting recovery...');
        await this.attemptRecovery();
      } else if (!wasHealthy && this.isHealthy) {
        console.log('✅ [MCP] Service recovered successfully');
      }
    }, MCP_CONFIG.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Attempt automatic recovery
   */
  async attemptRecovery() {
    console.log('🔄 [MCP] Attempting automatic recovery...');
    
    try {
      // 1. Check and resolve port conflicts
      if (typeof mcpPortManager !== 'undefined') {
        await mcpPortManager.detectKnownConflicts();
        const newConfig = await mcpPortManager.getDynamicConfig();
        this.baseUrl = newConfig.endpoint;
      }
      
      // 2. Attempt server auto-start
      if (typeof mcpAutoManager !== 'undefined') {
        await mcpAutoManager.autoStartServer();
      }
      
      // 3. Verify recovery
      await this.delay(5000); // Wait for server to start
      const recovered = await this.checkHealth();
      
      if (recovered) {
        console.log('✅ [MCP] Auto-recovery successful');
        return true;
      } else {
        console.warn('⚠️ [MCP] Auto-recovery failed, fallback mode will be used');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [MCP] Recovery attempt failed:', error);
      return false;
    }
  }

  /**
   * Enhanced health check with detailed diagnostics
   */
  async checkHealth() {
    try {
      const response = await this.makeRequest('GET', MCP_CONFIG.ENDPOINTS.HEALTH);
      
      if (response && response.status) {
        // Analyze detailed health metrics
        const isHealthy = response.status === 'healthy' || response.healthScore > 50;
        
        if (!isHealthy && response.healthScore) {
          console.warn(`⚠️ [MCP] Service degraded (score: ${response.healthScore}):`, response);
        }
        
        return isHealthy;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [MCP] Health check failed:', error);
      return false;
    }
  }

  /**
   * Send captured actions to MCP service for test generation
   */
  async generateTest(testData) {
    try {
      console.log('🚀 [MCP] Sending test data to service:', testData);
      
      const payload = {
        url: testData.url || window.location.href,
        steps: testData.actions || testData.steps || [],
        instructions: testData.instructions || '',
        sessionId: testData.sessionId,
        timestamp: new Date().toISOString()
      };

      const response = await this.makeRequest('POST', MCP_CONFIG.ENDPOINTS.GENERATE, payload);
      
      console.log('✅ [MCP] Test generation response:', response);
      return response;
      
    } catch (error) {
      console.error('❌ [MCP] Test generation failed:', error);
      throw new Error(`Failed to generate test: ${error.message}`);
    }
  }

  /**
   * Get test generation status
   */
  async getStatus(jobId) {
    try {
      const response = await this.makeRequest('GET', `${MCP_CONFIG.ENDPOINTS.STATUS}/${jobId}`);
      return response;
    } catch (error) {
      console.error('❌ [MCP] Status check failed:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(method, endpoint, data = null, retryCount = 0) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      options.signal = controller.signal;
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Retry logic for network errors
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        console.warn(`⚠️ [MCP] Request failed, retrying (${retryCount + 1}/${this.maxRetries}):`, error.message);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.makeRequest(method, endpoint, data, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    return error.name === 'AbortError' || 
           error.message.includes('Failed to fetch') ||
           error.message.includes('Network error');
  }

  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global MCP service instance
const mcpService = new MCPServiceClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MCPServiceClient, mcpService, MCP_CONFIG };
}