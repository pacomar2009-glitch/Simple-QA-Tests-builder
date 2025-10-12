/**
 * Port Manager - Detecta y resuelve conflictos de puerto automáticamente
 */

class MCPPortManager {
  constructor() {
    this.defaultPort = 3000;
    this.maxPortRange = 3010; // Intentar puertos 3000-3010
    this.currentPort = this.defaultPort;
  }

  /**
   * Encontrar puerto disponible automáticamente
   */
  async findAvailablePort() {
    console.log('🔍 [PORT-MGR] Searching for available port...');
    
    for (let port = this.defaultPort; port <= this.maxPortRange; port++) {
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        this.currentPort = port;
        console.log(`✅ [PORT-MGR] Found available port: ${port}`);
        return port;
      } else {
        console.log(`⚠️ [PORT-MGR] Port ${port} is occupied`);
      }
    }
    
    throw new Error(`No available ports found in range ${this.defaultPort}-${this.maxPortRange}`);
  }

  /**
   * Verificar si un puerto está disponible
   */
  async isPortAvailable(port) {
    try {
      // Intentar conectar al puerto
      const response = await fetch(`http://localhost:${port}/api/health`, {
        method: 'GET',
        timeout: 3000
      });
      
      // Si responde, el puerto está ocupado (pero podría ser nuestro servidor)
      const data = await response.json();
      if (data.status === 'healthy' && data.service === 'mcp-test-generator') {
        console.log(`✅ [PORT-MGR] Port ${port} has our MCP service running`);
        return true; // Es nuestro servidor, podemos usarlo
      } else {
        console.log(`❌ [PORT-MGR] Port ${port} occupied by other service`);
        return false; // Otro servicio está usando el puerto
      }
    } catch (error) {
      // Si no puede conectar, el puerto está libre
      console.log(`✅ [PORT-MGR] Port ${port} appears to be free`);
      return true;
    }
  }

  /**
   * Obtener configuración dinámica de puerto
   */
  async getDynamicConfig() {
    const availablePort = await this.findAvailablePort();
    
    return {
      port: availablePort,
      endpoint: `http://localhost:${availablePort}`,
      healthCheck: `http://localhost:${availablePort}/api/health`,
      generateEndpoint: `http://localhost:${availablePort}/api/generate`
    };
  }

  /**
   * Actualizar configuración del cliente MCP
   */
  async updateMCPClientConfig() {
    try {
      const config = await this.getDynamicConfig();
      
      // Actualizar configuración global si existe
      if (typeof window !== 'undefined' && window.TESTBUILDER_CONFIG) {
        window.TESTBUILDER_CONFIG.MCP.ENDPOINT = config.endpoint;
        console.log(`🔄 [PORT-MGR] Updated MCP endpoint to: ${config.endpoint}`);
      }
      
      // Actualizar cliente MCP si existe
      if (typeof window !== 'undefined' && window.mcpService) {
        window.mcpService.baseUrl = config.endpoint;
        console.log(`🔄 [PORT-MGR] Updated MCP service baseUrl to: ${config.endpoint}`);
      }
      
      return config;
    } catch (error) {
      console.error('❌ [PORT-MGR] Failed to update MCP config:', error);
      throw error;
    }
  }

  /**
   * Generar script de inicio con puerto dinámico
   */
  generateStartScript(port) {
    return `
# Auto-generated start script with dynamic port
$env:PORT = "${port}"
Write-Host "🚀 Starting MCP Server on port ${port}..."
Write-Host "📍 Endpoint: http://localhost:${port}"
Write-Host "🔗 Health Check: http://localhost:${port}/api/health"
Write-Host ""

cd "c:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local"

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..."
    npm install
}

# Start server with dynamic port
node src/server.js
`;
  }

  /**
   * Detectar conflictos específicos conocidos
   */
  async detectKnownConflicts() {
    const knownServices = [
      { port: 3000, name: 'React Development Server', solution: 'Use PORT=3001 for React' },
      { port: 3000, name: 'Next.js Development Server', solution: 'Use next dev -p 3001' },
      { port: 3000, name: 'Vite Development Server', solution: 'Use vite --port 3001' },
      { port: 3000, name: 'Express.js Server', solution: 'Change Express server port' }
    ];

    const conflicts = [];
    
    for (const service of knownServices) {
      const isOccupied = !(await this.isPortAvailable(service.port));
      if (isOccupied) {
        conflicts.push(service);
      }
    }

    if (conflicts.length > 0) {
      console.log('⚠️ [PORT-MGR] Detected potential conflicts:', conflicts);
      this.suggestSolutions(conflicts);
    }

    return conflicts;
  }

  /**
   * Sugerir soluciones para conflictos
   */
  suggestSolutions(conflicts) {
    console.log('💡 [PORT-MGR] Suggested solutions:');
    conflicts.forEach(conflict => {
      console.log(`   - ${conflict.name}: ${conflict.solution}`);
    });
  }

  /**
   * Obtener puerto actual
   */
  getCurrentPort() {
    return this.currentPort;
  }

  /**
   * Resetear a puerto por defecto
   */
  reset() {
    this.currentPort = this.defaultPort;
  }
}

// Instancia global del port manager
const mcpPortManager = new MCPPortManager();

// Export para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MCPPortManager, mcpPortManager };
}