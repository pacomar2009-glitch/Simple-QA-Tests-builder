/**
 * Export Utils - MVP Version (US#92 Simplificado)
 * 
 * Funcionalidades:
 * - ✅ Exportar JSON con casos y metadata
 * - ✅ Incluir README con instrucciones
 * - ✅ Validación de datos
 * - ❌ Anonimización (requiere US#122 - IA Agéntica)
 * - ❌ Generación Playwright .spec.ts (requiere US#122)
 * - ❌ Generación CSV Jira (requiere US#122)
 * 
 * @version MVP 1.0 - Simple JSON Export
 * 
 * NOTA: Exporta JSON directo sin ZIP para evitar problemas con JSZip en Chrome Extension.
 * La generación de ZIP se puede hacer externamente o en versión futura con bundler.
 */

export class ExportUtils {
  /**
   * Exportar casos como JSON completo
   * @param {Object} exportData - Datos de exportData() de CasesQueueManager
   * @returns {Promise<Object>} - {blob, filename, size, timestamp, format}
   */
  static async exportCases(exportData) {
    this.validateExportData(exportData);
    
    // Crear objeto completo de exportación
    const exportPackage = {
      metadata: {
        exportedAt: exportData.exportedAt,
        totalCases: exportData.stats.total,
        completedCases: exportData.stats.completed,
        recordingCases: exportData.stats.recording,
        draftCases: exportData.stats.draft,
        pausedCases: exportData.stats.paused,
        version: '1.0.0-mvp',
        format: 'json',
        note: 'MVP Export - Anonimización y tests Playwright pendientes de US#122'
      },
      readme: this.generateREADME(exportData.stats),
      cases: exportData.cases
    };
    
    // Crear Blob JSON
    const jsonString = JSON.stringify(exportPackage, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = this.generateFilename();
    
    return {
      blob,
      filename,
      size: blob.size,
      timestamp: exportData.exportedAt,
      format: 'json',
      casesExported: exportData.cases.length
    };
  }
  
  /**
   * Validar datos de exportación
   */
  static validateExportData(exportData) {
    if (!exportData || typeof exportData !== 'object') {
      throw new Error('Export data inválido');
    }
    
    if (!Array.isArray(exportData.cases)) {
      throw new Error('Export data debe contener array de casos');
    }
    
    if (!exportData.stats) {
      throw new Error('Export data debe contener stats');
    }
    
    if (!exportData.exportedAt) {
      throw new Error('Export data debe contener exportedAt timestamp');
    }
  }
  
  /**
   * Generar nombre de archivo con timestamp
   */
  static generateFilename() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `test-cases-export-${timestamp}.json`;
  }
  
  /**
   * Generar README con instrucciones
   */
  static generateREADME(stats) {
    return `# Test Cases Export - MVP

## 📊 Estadísticas de Exportación

- **Total de casos**: ${stats.total}
- **Completados**: ${stats.completed}
- **En grabación**: ${stats.recording}
- **Borradores**: ${stats.draft}
- **Pausados**: ${stats.paused}

## 📋 Formato de Exportación

Este archivo JSON contiene:

### 1. Metadata
- exportedAt: Timestamp de exportación
- totalCases, completedCases, etc.: Estadísticas
- version: Versión de formato (1.0.0-mvp)
- format: Formato del archivo (json)

### 2. README
- Este texto de instrucciones

### 3. Cases (Array)
Cada caso incluye:
- id: Identificador único
- number: Número de caso (#1, #2, ...)
- name: Nombre descriptivo
- description: Descripción del caso
- status: Estado (draft, recording, completed, paused)
- priority: Prioridad (low, medium, high, critical)
- steps: Array de pasos capturados

### Estructura de Steps
Cada step tiene:
- type: Tipo de evento (click, input, navigation, etc.)
- selector: Selector del elemento
- value: Valor (para inputs)
- url: URL de la página
- timestamp: Momento de captura
- Otros campos según tipo de evento

## 🚀 Próximas Versiones (US#122 - IA Agéntica)

Este es un **MVP simplificado**. La versión completa incluirá:

### ✅ Anonimización Automática
- Detección de datos sensibles (emails, contraseñas, tarjetas)
- Reemplazo automático con valores fake
- Gemini IA para análisis contextual

### ✅ Generación de Tests Playwright
- Archivos .spec.ts listos para ejecutar
- Self-healing selectors con fallbacks
- Validaciones automáticas
- Page Object patterns

### ✅ Exportación Multi-formato
- Playwright .spec.ts
- CSV para Jira Test Management
- JSON con estructura mejorada

### ✅ Validación Multi-viewport
- Tests para desktop/tablet/mobile
- Responsive testing automático

## 📝 Uso del Export

### Opción 1: Importar en código
const exportData = require('./test-cases-export-YYYY-MM-DD.json');
console.log(exportData.metadata);
console.log(exportData.cases);

### Opción 2: Procesamiento manual
- Abrir archivo en editor JSON
- Revisar casos en cases array
- Usar para documentación o análisis

### Opción 3: Esperar US#122
- La versión completa con IA generará tests ejecutables
- Anonimización automática de datos sensibles
- Exportación optimizada

## ⚠️ Notas Importantes

- **SIN anonimización**: Revisar antes de compartir (puede contener datos sensibles)
- **SIN validación**: Selectores no están validados con Playwright real
- **Formato MVP**: Estructura básica que será mejorada en US#122

## 🔗 Referencias

- User Story: US#92 (Export MVP)
- Dependencia: US#122 (IA Agéntica con MCP Playwright)
- Repositorio: Simple-QA-Tests-builder
`;
  }
}
