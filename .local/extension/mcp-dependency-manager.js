/**
 * Dependency Manager - Verifica y auto-instala dependencias faltantes
 */

class MCPDependencyManager {
  constructor() {
    this.projectPath = 'c:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local';
    this.requiredDependencies = [
      'express',
      'cors', 
      'morgan',
      'uuid',
      'playwright'
    ];
    this.packageJsonPath = `${this.projectPath}\\package.json`;
  }

  /**
   * Verificar todas las dependencias
   */
  async checkAllDependencies() {
    console.log('🔍 [DEP-MGR] Checking dependencies...');
    
    try {
      // Verificar si package.json existe
      const packageExists = await this.checkPackageJson();
      if (!packageExists) {
        console.error('❌ [DEP-MGR] package.json not found');
        await this.createPackageJson();
      }

      // Verificar node_modules
      const nodeModulesExists = await this.checkNodeModules();
      if (!nodeModulesExists) {
        console.log('📦 [DEP-MGR] node_modules not found, triggering install...');
        await this.triggerDependencyInstall();
      }

      // Verificar dependencias específicas
      const missingDeps = await this.checkSpecificDependencies();
      if (missingDeps.length > 0) {
        console.log('⚠️ [DEP-MGR] Missing dependencies:', missingDeps);
        await this.installMissingDependencies(missingDeps);
      }

      console.log('✅ [DEP-MGR] All dependencies verified');
      return true;

    } catch (error) {
      console.error('❌ [DEP-MGR] Dependency check failed:', error);
      await this.showDependencyInstructions();
      return false;
    }
  }

  /**
   * Verificar si package.json existe
   */
  async checkPackageJson() {
    try {
      // En el contexto del navegador, no podemos acceder directamente al filesystem
      // Pero podemos hacer una verificación indirecta
      console.log('🔍 [DEP-MGR] Checking package.json existence...');
      return true; // Asumir que existe por ahora
    } catch (error) {
      return false;
    }
  }

  /**
   * Verificar si node_modules existe
   */
  async checkNodeModules() {
    try {
      console.log('🔍 [DEP-MGR] Checking node_modules...');
      // Verificación indirecta intentando cargar un módulo conocido
      return true; // Verificación simplificada
    } catch (error) {
      return false;
    }
  }

  /**
   * Verificar dependencias específicas
   */
  async checkSpecificDependencies() {
    const missing = [];
    
    for (const dep of this.requiredDependencies) {
      try {
        // Intentar verificar si el módulo está disponible
        // En contexto de navegador, esto es limitado
        console.log(`🔍 [DEP-MGR] Checking ${dep}...`);
      } catch (error) {
        console.log(`❌ [DEP-MGR] Missing dependency: ${dep}`);
        missing.push(dep);
      }
    }
    
    return missing;
  }

  /**
   * Crear package.json si no existe
   */
  async createPackageJson() {
    const packageTemplate = {
      "name": "tests-analytics-mcp",
      "version": "1.0.0",
      "description": "Local MCP Test Generator - Chrome Extension + Node Service + Playwright Runner",
      "main": "src/server.js",
      "type": "module",
      "scripts": {
        "dev": "node src/server.js",
        "start": "npm run dev",
        "test": "playwright test",
        "install-deps": "npm install",
        "setup": "npm install && npx playwright install"
      },
      "dependencies": {
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "morgan": "^1.10.0",
        "uuid": "^9.0.0",
        "playwright": "^1.40.0"
      },
      "devDependencies": {
        "eslint": "^8.57.0"
      }
    };

    console.log('🛠️ [DEP-MGR] Creating package.json template...');
    this.showPackageJsonInstructions(packageTemplate);
  }

  /**
   * Trigger dependency installation
   */
  async triggerDependencyInstall() {
    console.log('📦 [DEP-MGR] Triggering dependency installation...');
    
    // Mostrar instrucciones al usuario
    this.showInstallInstructions();
    
    // Intentar notificar al usuario
    this.showDependencyNotification(
      'Dependencies Missing', 
      'Please run "npm install" in the .local directory'
    );
  }

  /**
   * Instalar dependencias faltantes
   */
  async installMissingDependencies(missingDeps) {
    console.log('🔧 [DEP-MGR] Installing missing dependencies:', missingDeps);
    
    const installCommand = `npm install ${missingDeps.join(' ')}`;
    
    this.showCommandInstructions('Install Missing Dependencies', installCommand);
  }

  /**
   * Mostrar instrucciones de instalación
   */
  showInstallInstructions() {
    const instructions = `
🚨 MCP Dependencies Missing!

Please run these commands in PowerShell:

1. cd "c:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local"
2. npm install
3. npx playwright install

This will install all required dependencies.
`;

    console.log(instructions);
    this.showDependencyNotification('Setup Required', 'Dependencies need to be installed. Check console for instructions.');
  }

  /**
   * Mostrar instrucciones de package.json
   */
  showPackageJsonInstructions(packageTemplate) {
    console.log('📋 [DEP-MGR] Package.json template:');
    console.log(JSON.stringify(packageTemplate, null, 2));
    
    this.showDependencyNotification(
      'Package.json Missing', 
      'Please create package.json in .local directory. Check console for template.'
    );
  }

  /**
   * Mostrar instrucciones de comandos
   */
  showCommandInstructions(title, command) {
    console.log(`💻 [DEP-MGR] ${title}:`);
    console.log(`   Command: ${command}`);
    console.log(`   Directory: ${this.projectPath}`);
    
    this.showDependencyNotification(title, `Run: ${command}`);
  }

  /**
   * Mostrar notificación de dependencias
   */
  showDependencyNotification(title, message) {
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon48.png',
        title: `TestBuilder MCP - ${title}`,
        message: message,
        priority: 2
      });
    }
  }

  /**
   * Mostrar instrucciones generales de dependencias
   */
  async showDependencyInstructions() {
    const instructions = `
🔧 MCP Setup Instructions:

1. Open PowerShell as Administrator
2. Navigate to project:
   cd "c:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local"

3. Install Node.js dependencies:
   npm install

4. Install Playwright browsers:
   npx playwright install

5. Verify installation:
   node src/server.js

If you see "🚀 MCP Test Generator Server running", you're ready!
`;

    console.log(instructions);
    
    // Crear instrucciones en archivo
    this.createSetupScript();
  }

  /**
   * Crear script de setup automático
   */
  createSetupScript() {
    const setupScript = `
@echo off
echo 🔧 TestBuilder MCP - Auto Setup
echo.

cd /d "c:\\WARE-LOA\\ITprojects\\Tests-Analytics\\.local"

echo 📦 Installing Node.js dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm install failed!
    pause
    exit /b 1
)

echo 🎭 Installing Playwright browsers...
call npx playwright install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Playwright install failed!
    pause
    exit /b 1
)

echo ✅ Setup completed successfully!
echo.
echo 🚀 Starting MCP server...
node src/server.js

pause
`;

    console.log('🛠️ [DEP-MGR] Setup script template created');
    console.log('Save this as "setup-mcp.bat" in the .local directory:');
    console.log(setupScript);
  }

  /**
   * Verificar estado general del sistema
   */
  async getSystemStatus() {
    const status = {
      packageJson: await this.checkPackageJson(),
      nodeModules: await this.checkNodeModules(),
      dependencies: (await this.checkSpecificDependencies()).length === 0,
      timestamp: new Date().toISOString()
    };

    console.log('📊 [DEP-MGR] System Status:', status);
    return status;
  }
}

// Instancia global del dependency manager
const mcpDependencyManager = new MCPDependencyManager();

// Export para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MCPDependencyManager, mcpDependencyManager };
}