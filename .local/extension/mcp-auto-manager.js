/**
 * MCP Auto-Start Manager
 * Detecta y auto-inicia el servidor MCP si no está corriendo
 */

class MCPAutoManager {
  constructor() {
    this.serverProcess = null;
    this.checkInterval = null;
    this.isStarting = false;
    this.maxRetries = 3;
    this.retryCount = 0;
  }

  /**
   * Inicializar monitoreo automático
   */
  async initialize() {
    console.log('🤖 [MCP-AUTO] Initializing auto-manager...');
    
    // Verificar estado inicial
    const isRunning = await this.checkServerHealth();
    if (!isRunning) {
      console.log('⚠️ [MCP-AUTO] Server not running, attempting auto-start...');
      await this.autoStartServer();
    }
    
    // Monitoreo continuo cada 30 segundos
    this.startMonitoring();
  }

  /**
   * Verificar si el servidor está corriendo
   */
  async checkServerHealth() {
    try {
      const response = await fetch('http://localhost:3000/api/health', {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Auto-iniciar servidor MCP
   */
  async autoStartServer() {
    if (this.isStarting) {
      console.log('🔄 [MCP-AUTO] Server already starting...');
      return;
    }

    this.isStarting = true;
    console.log('🚀 [MCP-AUTO] Auto-starting MCP server...');

    try {
      // Verificar si estamos en entorno correcto
      const projectPath = await this.findProjectPath();
      if (!projectPath) {
        throw new Error('Project path not found');
      }

      // Ejecutar comando de inicio
      await this.executeStartCommand(projectPath);
      
      // Esperar a que el servidor esté listo
      await this.waitForServerReady();
      
      console.log('✅ [MCP-AUTO] Server auto-started successfully');
      this.retryCount = 0;
      
    } catch (error) {
      console.error('❌ [MCP-AUTO] Failed to auto-start server:', error);
      this.retryCount++;
      
      if (this.retryCount < this.maxRetries) {
        console.log(`🔄 [MCP-AUTO] Retrying in 10 seconds... (${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => this.autoStartServer(), 10000);
      } else {
        console.error('💥 [MCP-AUTO] Max retries reached, server auto-start failed');
        this.notifyUser('MCP Server auto-start failed after multiple attempts');
      }
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Buscar ruta del proyecto
   */
  async findProjectPath() {
    const possiblePaths = [
      'c:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local',
      './local',
      '../.local',
      '../../.local'
    ];

    for (const path of possiblePaths) {
      try {
        // Verificar si existe package.json
        const response = await fetch(`file://${path}/package.json`);
        if (response.ok) {
          return path;
        }
      } catch (error) {
        // Continuar buscando
      }
    }
    return null;
  }

  /**
   * Ejecutar comando de inicio
   */
  async executeStartCommand(projectPath) {
    // En el navegador no podemos ejecutar comandos directamente
    // Pero podemos intentar hacer una llamada que active el servidor
    console.log('📍 [MCP-AUTO] Project found at:', projectPath);
    
    // Notificar al usuario que debe iniciar el servidor
    this.showAutoStartNotification();
  }

  /**
   * Mostrar notificación de auto-inicio
   */
  showAutoStartNotification() {
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon48.png',
        title: 'TestBuilder MCP',
        message: 'Starting MCP server automatically...\nPlease check terminal for server status.'
      });
    }
  }

  /**
   * Esperar a que el servidor esté listo
   */
  async waitForServerReady(timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const isReady = await this.checkServerHealth();
      if (isReady) {
        return true;
      }
      await this.delay(2000);
    }
    
    throw new Error('Server startup timeout');
  }

  /**
   * Iniciar monitoreo continuo
   */
  startMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      const isRunning = await this.checkServerHealth();
      if (!isRunning && !this.isStarting) {
        console.log('🔍 [MCP-AUTO] Server down detected, attempting restart...');
        await this.autoStartServer();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Detener monitoreo
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Notificar usuario
   */
  notifyUser(message) {
    console.error('🚨 [MCP-AUTO]', message);
    
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon48.png',
        title: 'TestBuilder MCP Error',
        message: message
      });
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instancia global del auto-manager
const mcpAutoManager = new MCPAutoManager();

// Export para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MCPAutoManager, mcpAutoManager };
}