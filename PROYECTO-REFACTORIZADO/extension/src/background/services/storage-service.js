//
// =====================================================================
// StorageService - Service Layer para Gestión de Almacenamiento
// =====================================================================
// 
// Propósito:
//   Abstracción completa de chrome.storage.local con operaciones
//   de alto nivel para gestión de tests y datos de extensión.
//
// Responsabilidades:
//   - Abstracción de chrome.storage.local
//   - Operaciones CRUD para tests guardados
//   - Gestión de configuración de extensión
//   - Migration de versiones anteriores (V1 → V2)
//   - Validación y sanitización de datos
//   - Error handling robusto
//
// Arquitectura:
//   - Wrapper de chrome.storage API
//   - Operaciones atómicas y transaccionales
//   - Type-safe operations con validación
//   - Auto-migration en primera carga
//
// Uso:
//   import { storageService } from './services/storage-service.js';
//   
//   await storageService.saveTest(test);
//   const tests = await storageService.getTests();
//   await storageService.deleteTest(testId);
//
// Storage Schema V2:
//   {
//     'store:state': { ... },           // Store state (gestionado por Store)
//     'tests:saved': { testId: test },  // Tests guardados
//     'config:general': { ... },        // Configuración general
//     'config:integrations': { ... },   // Config de integraciones
//     'migration:version': 2            // Versión de schema
//   }
//
// =====================================================================

/**
 * StorageService - Gestión centralizada de almacenamiento
 * 
 * Proporciona abstracción completa de chrome.storage.local con
 * operaciones de alto nivel para tests y configuración.
 */
class StorageService {
  constructor() {
    console.log('💾 [StorageService] Initializing...');
    
    // Namespaces para organización
    this.NAMESPACES = {
      STORE: 'store',
      TESTS: 'tests',
      CONFIG: 'config',
      MIGRATION: 'migration'
    };
    
    // Keys específicas
    this.KEYS = {
      STORE_STATE: 'store:state',
      TESTS_SAVED: 'tests:saved',
      CONFIG_GENERAL: 'config:general',
      CONFIG_INTEGRATIONS: 'config:integrations',
      MIGRATION_VERSION: 'migration:version'
    };
    
    // Current schema version
    this.CURRENT_VERSION = 2;
    
    // Auto-inicialización
    this._initialize();
    
    console.log('✅ [StorageService] Initialized successfully');
  }
  
  /**
   * Inicializa el servicio y ejecuta migrations si es necesario
   * @private
   */
  async _initialize() {
    try {
      const version = await this.get(this.KEYS.MIGRATION_VERSION);
      
      if (!version || version < this.CURRENT_VERSION) {
        console.log(`🔄 [StorageService] Migration needed: v${version || 1} → v${this.CURRENT_VERSION}`);
        await this.migrateFromV1();
      } else {
        console.log(`✅ [StorageService] Storage schema up to date: v${version}`);
      }
    } catch (error) {
      console.error('❌ [StorageService] Initialization error:', error);
    }
  }
  
  // ===================================
  // API PÚBLICA - Generic Operations
  // ===================================
  
  /**
   * Obtiene un valor del storage
   * @template T
   * @param {string} key - Clave a obtener
   * @param {T} [defaultValue] - Valor por defecto si no existe
   * @returns {Promise<T>}
   */
  async get(key, defaultValue = null) {
    try {
      const result = await chrome.storage.local.get(key);
      const value = result[key];
      
      if (value === undefined) {
        console.log(`📭 [StorageService] Key '${key}' not found, returning default`);
        return defaultValue;
      }
      
      console.log(`📬 [StorageService] Retrieved '${key}':`, typeof value);
      return value;
    } catch (error) {
      console.error(`❌ [StorageService] Error getting '${key}':`, error);
      return defaultValue;
    }
  }
  
  /**
   * Guarda un valor en el storage
   * @template T
   * @param {string} key - Clave a guardar
   * @param {T} value - Valor a guardar
   * @returns {Promise<void>}
   */
  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      console.log(`💾 [StorageService] Saved '${key}':`, typeof value);
    } catch (error) {
      console.error(`❌ [StorageService] Error saving '${key}':`, error);
      throw error;
    }
  }
  
  /**
   * Elimina una clave del storage
   * @param {string} key - Clave a eliminar
   * @returns {Promise<void>}
   */
  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
      console.log(`🗑️  [StorageService] Removed '${key}'`);
    } catch (error) {
      console.error(`❌ [StorageService] Error removing '${key}':`, error);
      throw error;
    }
  }
  
  /**
   * Limpia todo el storage (¡CUIDADO!)
   * @returns {Promise<void>}
   */
  async clear() {
    console.warn('⚠️  [StorageService] CLEAR called - This will remove ALL data');
    try {
      await chrome.storage.local.clear();
      console.log('✅ [StorageService] Storage cleared');
    } catch (error) {
      console.error('❌ [StorageService] Error clearing storage:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene todas las claves del storage
   * @returns {Promise<string[]>}
   */
  async getAllKeys() {
    try {
      const all = await chrome.storage.local.get(null);
      const keys = Object.keys(all);
      console.log(`📋 [StorageService] Found ${keys.length} keys`);
      return keys;
    } catch (error) {
      console.error('❌ [StorageService] Error getting all keys:', error);
      return [];
    }
  }
  
  /**
   * Obtiene el tamaño usado del storage en bytes
   * @returns {Promise<number>}
   */
  async getBytesInUse() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse(null);
      console.log(`📊 [StorageService] Storage usage: ${bytesInUse} bytes (${(bytesInUse / 1024).toFixed(2)} KB)`);
      return bytesInUse;
    } catch (error) {
      console.error('❌ [StorageService] Error getting bytes in use:', error);
      return 0;
    }
  }
  
  // ===================================
  // API PÚBLICA - Test Operations
  // ===================================
  
  /**
   * Guarda un test
   * @param {Object} test - Test a guardar
   * @returns {Promise<string>} ID del test guardado
   */
  async saveTest(test) {
    console.log('💾 [StorageService] Saving test:', test.name);
    
    // Validar test
    if (!test.name || !test.steps || !Array.isArray(test.steps)) {
      throw new Error('Invalid test: must have name and steps array');
    }
    
    // Generar ID si no existe
    const testId = test.id || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const testToSave = {
      ...test,
      id: testId,
      savedAt: test.savedAt || Date.now(),
      updatedAt: Date.now()
    };
    
    // Obtener tests existentes
    const tests = await this.getTests();
    
    // Agregar o actualizar test
    tests[testId] = testToSave;
    
    // Guardar
    await this.set(this.KEYS.TESTS_SAVED, tests);
    
    console.log(`✅ [StorageService] Test saved: ${testId}`);
    return testId;
  }
  
  /**
   * Obtiene todos los tests guardados
   * @param {Object} [filters] - Filtros opcionales
   * @returns {Promise<Object>} Map de tests { testId: test }
   */
  async getTests(filters = {}) {
    console.log('📂 [StorageService] Getting tests...');
    
    const tests = await this.get(this.KEYS.TESTS_SAVED, {});
    
    // Aplicar filtros si existen
    let filtered = Object.values(tests);
    
    if (filters.name) {
      filtered = filtered.filter(t => t.name.toLowerCase().includes(filters.name.toLowerCase()));
    }
    
    if (filters.tag) {
      filtered = filtered.filter(t => t.tags && t.tags.includes(filters.tag));
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(t => t.savedAt >= filters.dateFrom);
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(t => t.savedAt <= filters.dateTo);
    }
    
    // Convertir de vuelta a map
    const result = {};
    filtered.forEach(test => {
      result[test.id] = test;
    });
    
    console.log(`✅ [StorageService] Found ${Object.keys(result).length} tests`);
    return result;
  }
  
  /**
   * Obtiene un test por ID
   * @param {string} testId - ID del test
   * @returns {Promise<Object|null>}
   */
  async getTest(testId) {
    console.log('📄 [StorageService] Getting test:', testId);
    
    const tests = await this.get(this.KEYS.TESTS_SAVED, {});
    const test = tests[testId];
    
    if (!test) {
      console.log(`⚠️  [StorageService] Test not found: ${testId}`);
      return null;
    }
    
    console.log(`✅ [StorageService] Test found: ${test.name}`);
    return test;
  }
  
  /**
   * Elimina un test
   * @param {string} testId - ID del test a eliminar
   * @returns {Promise<boolean>} true si se eliminó, false si no existía
   */
  async deleteTest(testId) {
    console.log('🗑️  [StorageService] Deleting test:', testId);
    
    const tests = await this.get(this.KEYS.TESTS_SAVED, {});
    
    if (!tests[testId]) {
      console.log(`⚠️  [StorageService] Test not found: ${testId}`);
      return false;
    }
    
    delete tests[testId];
    await this.set(this.KEYS.TESTS_SAVED, tests);
    
    console.log(`✅ [StorageService] Test deleted: ${testId}`);
    return true;
  }
  
  /**
   * Actualiza un test existente
   * @param {string} testId - ID del test
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<boolean>}
   */
  async updateTest(testId, updates) {
    console.log('✏️  [StorageService] Updating test:', testId);
    
    const tests = await this.get(this.KEYS.TESTS_SAVED, {});
    
    if (!tests[testId]) {
      console.log(`⚠️  [StorageService] Test not found: ${testId}`);
      return false;
    }
    
    tests[testId] = {
      ...tests[testId],
      ...updates,
      updatedAt: Date.now()
    };
    
    await this.set(this.KEYS.TESTS_SAVED, tests);
    
    console.log(`✅ [StorageService] Test updated: ${testId}`);
    return true;
  }
  
  /**
   * Exporta todos los tests a JSON
   * @returns {Promise<string>} JSON string
   */
  async exportTests() {
    console.log('📤 [StorageService] Exporting tests...');
    
    const tests = await this.getTests();
    const exported = {
      version: this.CURRENT_VERSION,
      exportedAt: Date.now(),
      tests: Object.values(tests)
    };
    
    const json = JSON.stringify(exported, null, 2);
    console.log(`✅ [StorageService] Exported ${exported.tests.length} tests`);
    return json;
  }
  
  /**
   * Importa tests desde JSON
   * @param {string} json - JSON string con tests
   * @returns {Promise<number>} Número de tests importados
   */
  async importTests(json) {
    console.log('📥 [StorageService] Importing tests...');
    
    try {
      const data = JSON.parse(json);
      
      if (!data.tests || !Array.isArray(data.tests)) {
        throw new Error('Invalid import format: missing tests array');
      }
      
      const tests = await this.get(this.KEYS.TESTS_SAVED, {});
      let imported = 0;
      
      for (const test of data.tests) {
        // Generar nuevo ID para evitar conflictos
        const newId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        tests[newId] = {
          ...test,
          id: newId,
          importedAt: Date.now()
        };
        imported++;
      }
      
      await this.set(this.KEYS.TESTS_SAVED, tests);
      
      console.log(`✅ [StorageService] Imported ${imported} tests`);
      return imported;
    } catch (error) {
      console.error('❌ [StorageService] Error importing tests:', error);
      throw error;
    }
  }
  
  // ===================================
  // API PÚBLICA - Configuration
  // ===================================
  
  /**
   * Guarda configuración general
   * @param {Object} config - Configuración a guardar
   * @returns {Promise<void>}
   */
  async saveConfig(config) {
    console.log('⚙️  [StorageService] Saving general config');
    await this.set(this.KEYS.CONFIG_GENERAL, config);
  }
  
  /**
   * Obtiene configuración general
   * @returns {Promise<Object>}
   */
  async getConfig() {
    console.log('⚙️  [StorageService] Getting general config');
    return await this.get(this.KEYS.CONFIG_GENERAL, {
      theme: 'light',
      language: 'en',
      autoSave: true,
      notifications: true
    });
  }
  
  /**
   * Guarda configuración de integraciones
   * @param {Object} integrations - Config de integraciones
   * @returns {Promise<void>}
   */
  async saveIntegrations(integrations) {
    console.log('🔌 [StorageService] Saving integrations config');
    await this.set(this.KEYS.CONFIG_INTEGRATIONS, integrations);
  }
  
  /**
   * Obtiene configuración de integraciones
   * @returns {Promise<Object>}
   */
  async getIntegrations() {
    console.log('🔌 [StorageService] Getting integrations config');
    return await this.get(this.KEYS.CONFIG_INTEGRATIONS, {
      mcp: { enabled: false, url: '' },
      gemini: { enabled: false, apiKey: '' },
      n8n: { enabled: false, webhookUrl: '' }
    });
  }
  
  // ===================================
  // API PÚBLICA - Migration
  // ===================================
  
  /**
   * Migra datos de V1 a V2
   * @returns {Promise<void>}
   */
  async migrateFromV1() {
    console.log('🔄 [StorageService] Starting migration V1 → V2...');
    
    try {
      // Obtener todos los datos actuales
      const allData = await chrome.storage.local.get(null);
      
      // Detectar si hay datos V1
      const hasV1Data = allData.savedTests || allData.recordingActive || allData.sessionData;
      
      if (!hasV1Data) {
        console.log('✅ [StorageService] No V1 data found, setting V2 schema');
        await this.set(this.KEYS.MIGRATION_VERSION, this.CURRENT_VERSION);
        return;
      }
      
      console.log('📦 [StorageService] V1 data detected, migrating...');
      
      // Migrar tests guardados
      if (allData.savedTests) {
        console.log('📂 [StorageService] Migrating savedTests...');
        const v1Tests = allData.savedTests;
        const v2Tests = {};
        
        Object.keys(v1Tests).forEach(key => {
          const test = v1Tests[key];
          v2Tests[key] = {
            ...test,
            migratedFrom: 'v1',
            migratedAt: Date.now()
          };
        });
        
        await this.set(this.KEYS.TESTS_SAVED, v2Tests);
        await this.remove('savedTests');
        console.log(`✅ [StorageService] Migrated ${Object.keys(v2Tests).length} tests`);
      }
      
      // Migrar configuración
      if (allData.appConfig) {
        console.log('⚙️  [StorageService] Migrating appConfig...');
        await this.set(this.KEYS.CONFIG_GENERAL, allData.appConfig);
        await this.remove('appConfig');
      }
      
      // Limpiar claves obsoletas
      const obsoleteKeys = ['recordingActive', 'sessionData', 'globalState', 'capturedSteps'];
      for (const key of obsoleteKeys) {
        if (allData[key]) {
          await this.remove(key);
          console.log(`🗑️  [StorageService] Removed obsolete key: ${key}`);
        }
      }
      
      // Marcar versión actual
      await this.set(this.KEYS.MIGRATION_VERSION, this.CURRENT_VERSION);
      
      console.log('✅ [StorageService] Migration completed successfully');
    } catch (error) {
      console.error('❌ [StorageService] Migration failed:', error);
      throw error;
    }
  }
  
  // ===================================
  // API PÚBLICA - Diagnostics
  // ===================================
  
  /**
   * Obtiene información de diagnóstico del storage
   * @returns {Promise<Object>}
   */
  async getDiagnostics() {
    console.log('🔍 [StorageService] Running diagnostics...');
    
    const keys = await this.getAllKeys();
    const bytesInUse = await this.getBytesInUse();
    const tests = await this.getTests();
    const config = await this.getConfig();
    const version = await this.get(this.KEYS.MIGRATION_VERSION);
    
    const diagnostics = {
      version,
      totalKeys: keys.length,
      bytesInUse,
      kilobytesInUse: (bytesInUse / 1024).toFixed(2),
      megabytesInUse: (bytesInUse / 1024 / 1024).toFixed(2),
      testsCount: Object.keys(tests).length,
      hasConfig: Object.keys(config).length > 0,
      keys: keys.sort(),
      timestamp: Date.now()
    };
    
    console.log('📊 [StorageService] Diagnostics:', diagnostics);
    return diagnostics;
  }
}

// ===================================
// SINGLETON EXPORT
// ===================================

export const storageService = new StorageService();

// Auto-inicialización
console.log('✅ [StorageService] Module loaded and singleton created');

export default storageService;
