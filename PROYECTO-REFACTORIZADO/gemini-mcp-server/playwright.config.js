// 🎭 Configuración de Playwright para gemini-mcp-playwright-runner
// Optimizado para ejecución en contenedor Docker con modo HEAD (visible)

module.exports = {
  // Configuración de test runners
  testDir: './tests',
  timeout: 30 * 1000, // 30 segundos por test
  expect: {
    timeout: 5000 // 5 segundos para assertions
  },
  
  // Ejecución de tests
  fullyParallel: false, // Ejecutar tests secuencialmente para mejor control
  forbidOnly: !!process.env.CI, // Evitar .only en CI
  retries: process.env.CI ? 2 : 0, // Reintentos en CI
  workers: 1, // Un solo worker para contenedor
  
  // Reporter
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  // Configuración global de Playwright
  use: {
    // Navegador y viewport
    headless: false, // ¡MODO VISIBLE!
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Tiempos de espera
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Screenshots y videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Configuración de red
    acceptDownloads: true,
    
    // Configuración de contexto
    contextOptions: {
      // Permisos para el navegador
      permissions: ['notifications'],
      
      // User agent
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PlaywrightRunner/1.0.0'
    }
  },

  // Configuración específica por navegador
  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        headless: false, // Asegurar modo HEAD
        launchOptions: {
          // Argumentos para contenedor Docker
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--window-size=1280,720',
            '--start-maximized'
          ],
          
          // Configuración adicional para GUI en Docker
          env: {
            DISPLAY: process.env.DISPLAY || ':0'
          },
          
          // Velocidad de ejecución
          slowMo: 100 // Ralentizar para mejor visualización
        }
      }
    }
  ],

  // Configuración de servidor de desarrollo (opcional)
  webServer: {
    command: 'echo "No web server needed for external testing"',
    port: 3000,
    reuseExistingServer: !process.env.CI
  },

  // Directorios de salida
  outputDir: 'test-results/',
  
  // Configuración global de expect
  expect: {
    // Tiempo de espera para assertions
    timeout: 5000,
    
    // Configuración de screenshots para comparación
    toHaveScreenshot: { 
      mode: 'css',
      animations: 'disabled'
    },
    
    // Configuración para comparación de texto
    toMatchSnapshot: { 
      maxDiffPixels: 100 
    }
  }
};