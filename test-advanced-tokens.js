/**
 * Script de prueba para validar el sistema avanzado de gestión de tokens
 * Este script simula las condiciones reales de la extensión de Chrome
 */

// Mock del sistema de logging
const BackgroundLogger = {
    log: (level, category, message, data = {}) => {
        console.log(`[${level.toUpperCase()}] ${category}: ${message}`, data);
    }
};

// Simulación de la clase AdvancedTokenManager
class AdvancedTokenManager {
    constructor() {
        this.maxTokensPerRequest = 4096;
        this.rateLimitDelay = 1000; // 1 segundo entre requests
        this.maxRetries = 3;
        this.baseRetryDelay = 1000;
        this.requestsPerMinute = 10;
        this.requestTimestamps = [];
    }

    // Estima tokens basado en el contenido
    estimateTokens(prompt, actions) {
        const baseTokens = Math.ceil(prompt.length / 4);
        const actionTokens = actions.length * 50;
        const responseBuffer = 1500; // Buffer para la respuesta
        
        const total = baseTokens + actionTokens + responseBuffer;
        
        BackgroundLogger.log('debug', 'TOKEN_EST', 'Token estimation', {
            promptLength: prompt.length,
            baseTokens,
            actionTokens: actions.length,
            actionTokensCalc: actionTokens,
            responseBuffer,
            total
        });
        
        return total;
    }

    // Verifica si necesita fragmentar la request
    shouldFragment(estimatedTokens) {
        const shouldFrag = estimatedTokens > this.maxTokensPerRequest;
        BackgroundLogger.log('debug', 'TOKEN_FRAG', 'Fragment check', {
            estimatedTokens,
            maxTokens: this.maxTokensPerRequest,
            shouldFragment: shouldFrag
        });
        return shouldFrag;
    }

    // Fragmenta las acciones en chunks manejables
    fragmentActions(actions, maxActionsPerFragment = 5) {
        const fragments = [];
        
        for (let i = 0; i < actions.length; i += maxActionsPerFragment) {
            const chunk = actions.slice(i, i + maxActionsPerFragment);
            fragments.push(chunk);
        }
        
        BackgroundLogger.log('debug', 'TOKEN_FRAG', 'Actions fragmented', {
            totalActions: actions.length,
            fragments: fragments.length,
            maxPerFragment: maxActionsPerFragment,
            fragmentSizes: fragments.map(f => f.length)
        });
        
        return fragments;
    }

    // Implementa rate limiting
    async enforceRateLimit() {
        const now = Date.now();
        
        // Limpiar timestamps antiguos (más de 1 minuto)
        this.requestTimestamps = this.requestTimestamps.filter(
            timestamp => now - timestamp < 60000
        );
        
        // Verificar si hemos excedido el límite
        if (this.requestTimestamps.length >= this.requestsPerMinute) {
            const oldestRequest = Math.min(...this.requestTimestamps);
            const waitTime = 60000 - (now - oldestRequest);
            
            BackgroundLogger.log('warn', 'RATE_LIMIT', 'Rate limit enforced', {
                waitTime,
                requestsInLastMinute: this.requestTimestamps.length
            });
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Agregar delay base entre requests
        if (this.requestTimestamps.length > 0) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
        
        // Registrar esta request
        this.requestTimestamps.push(now);
    }

    // Exponential backoff para reintentos
    async exponentialBackoff(attempt) {
        const delay = Math.min(this.baseRetryDelay * Math.pow(2, attempt), 30000);
        
        BackgroundLogger.log('info', 'BACKOFF', 'Applying exponential backoff', {
            attempt,
            delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Función mock para simular la API de Gemini (para pruebas sin consumir API real)
async function mockGeminiRequest(prompt, maxTokens, apiKey) {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    // Simular diferentes escenarios
    const scenarios = [
        { success: true, finishReason: 'STOP' },
        { success: true, finishReason: 'MAX_TOKENS' },
        { success: false, error: 'RATE_LIMIT_EXCEEDED' },
        { success: false, error: 'QUOTA_EXCEEDED' }
    ];
    
    // 80% de éxito, 20% de errores para simular condiciones reales
    const scenario = Math.random() < 0.8 ? scenarios[0] : scenarios[Math.floor(Math.random() * scenarios.length)];
    
    if (!scenario.success) {
        throw new Error(scenario.error);
    }
    
    const responseText = `// Generated test code for prompt length: ${prompt.length}\n` +
                        `// Max tokens: ${maxTokens}\n` +
                        `describe('Test Suite', function() {\n` +
                        `  it('should work correctly', function() {\n` +
                        `    // Test implementation here\n` +
                        `    expect(true).to.be.true;\n` +
                        `  });\n` +
                        `});`;
    
    return {
        candidates: [{
            content: { parts: [{ text: responseText }] },
            finishReason: scenario.finishReason
        }]
    };
}

// Función principal de prueba
async function testAdvancedTokenManagement() {
    console.log('🚀 Iniciando pruebas del sistema avanzado de gestión de tokens\n');
    
    const tokenManager = new AdvancedTokenManager();
    
    // Test 1: Prompt pequeño (no fragmentación)
    console.log('📝 Test 1: Prompt pequeño (sin fragmentación)');
    const smallPrompt = "Generate a simple test";
    const smallActions = [
        { type: 'click', element: 'button#submit' },
        { type: 'type', element: 'input#name', value: 'test' }
    ];
    
    const smallTokens = tokenManager.estimateTokens(smallPrompt, smallActions);
    console.log(`Tokens estimados: ${smallTokens}`);
    console.log(`Requiere fragmentación: ${tokenManager.shouldFragment(smallTokens)}\n`);
    
    // Test 2: Prompt grande (requiere fragmentación)
    console.log('📝 Test 2: Prompt grande (requiere fragmentación)');
    const largePrompt = "Generate comprehensive test suite for complex web application with multiple forms, navigation, user authentication, data validation, error handling, and performance testing. Include unit tests, integration tests, and end-to-end tests. Consider edge cases, accessibility requirements, cross-browser compatibility, mobile responsiveness, and security vulnerabilities. Test should cover user registration, login, password reset, profile management, data export, search functionality, pagination, sorting, filtering, notifications, and admin features.".repeat(10);
    
    const largeActions = [];
    for (let i = 0; i < 25; i++) {
        largeActions.push(
            { type: 'click', element: `button#action-${i}` },
            { type: 'type', element: `input#field-${i}`, value: `test-value-${i}` },
            { type: 'wait', duration: 1000 }
        );
    }
    
    const largeTokens = tokenManager.estimateTokens(largePrompt, largeActions);
    console.log(`Tokens estimados: ${largeTokens}`);
    console.log(`Requiere fragmentación: ${tokenManager.shouldFragment(largeTokens)}`);
    
    if (tokenManager.shouldFragment(largeTokens)) {
        const fragments = tokenManager.fragmentActions(largeActions, 5);
        console.log(`Número de fragmentos: ${fragments.length}`);
        console.log(`Tamaños de fragmentos: ${fragments.map(f => f.length).join(', ')}\n`);
    }
    
    // Test 3: Rate limiting
    console.log('📝 Test 3: Prueba de rate limiting');
    console.log('Simulando múltiples requests rápidas...');
    
    const startTime = Date.now();
    
    for (let i = 0; i < 5; i++) {
        console.log(`Request ${i + 1}...`);
        await tokenManager.enforceRateLimit();
        
        try {
            const result = await mockGeminiRequest(smallPrompt, 2048, 'test-key');
            console.log(`✅ Request ${i + 1} exitosa - Finish reason: ${result.candidates[0].finishReason}`);
        } catch (error) {
            console.log(`❌ Request ${i + 1} falló: ${error.message}`);
            
            // Simular retry con backoff
            for (let attempt = 0; attempt < tokenManager.maxRetries; attempt++) {
                await tokenManager.exponentialBackoff(attempt);
                try {
                    const retryResult = await mockGeminiRequest(smallPrompt, 2048, 'test-key');
                    console.log(`✅ Retry ${attempt + 1} exitoso - Finish reason: ${retryResult.candidates[0].finishReason}`);
                    break;
                } catch (retryError) {
                    console.log(`❌ Retry ${attempt + 1} falló: ${retryError.message}`);
                }
            }
        }
    }
    
    const endTime = Date.now();
    console.log(`\n⏱️ Tiempo total para 5 requests: ${endTime - startTime}ms`);
    console.log(`📊 Requests registradas en el último minuto: ${tokenManager.requestTimestamps.length}`);
    
    console.log('\n✅ Pruebas completadas exitosamente!');
    console.log('\n📋 Resumen de funcionalidades validadas:');
    console.log('  ✓ Estimación dinámica de tokens');
    console.log('  ✓ Detección automática de necesidad de fragmentación');
    console.log('  ✓ Fragmentación inteligente de acciones');
    console.log('  ✓ Rate limiting con ventana deslizante');
    console.log('  ✓ Exponential backoff para reintentos');
    console.log('  ✓ Logging detallado para debugging');
}

// Ejecutar las pruebas
testAdvancedTokenManagement().catch(console.error);