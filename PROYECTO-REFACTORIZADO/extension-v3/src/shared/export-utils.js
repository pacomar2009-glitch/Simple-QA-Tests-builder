/**
 * Export Utils - MVP Version (US#92 Simplificado)
 * 
 * Funcionalidades:
 * - ✅ Crear ZIP con casos en formato JSON
 * - ✅ Incluir README con instrucciones
 * - ✅ Metadata de exportación
 * - ❌ Anonimización (requiere US#122 - IA Agéntica)
 * - ❌ Generación Playwright .spec.ts (requiere US#122)
 * - ❌ Generación CSV Jira (requiere US#122)
 * 
 * @version MVP 1.0 - Simple JSON Export
 */

import JSZip from 'jszip';

export class ExportUtils {
  /**
   * Crear ZIP con casos exportados
   * @param {Object} exportData - Datos de exportData() de CasesQueueManager
   * @returns {Promise<Blob>} - Blob del ZIP generado
   */
  static async createZIP(exportData) {
    const zip = new JSZip();
    
    // 1. Archivo principal: cases.json
    zip.file('cases.json', JSON.stringify(exportData.cases, null, 2));
    
    // 2. Metadata de exportación
    const metadata = {
      exportedAt: exportData.exportedAt,
      totalCases: exportData.stats.total,
      completedCases: exportData.stats.completed,
      recordingCases: exportData.stats.recording,
      draftCases: exportData.stats.draft,
      pausedCases: exportData.stats.paused,
      version: '1.0.0-mvp',
      format: 'json',
      note: 'MVP Export - Anonimización y tests Playwright pendientes de US#122'
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    
    // 3. README con instrucciones
    const readme = this.generateREADME(exportData.stats);
    zip.file('README.md', readme);
    
    // 4. Casos individuales en carpeta (opcional para inspección)
    const casesFolder = zip.folder('cases');
    exportData.cases.forEach((caso, index) => {
      const filename = `case-${caso.number || index + 1}-${caso.name.replace(/\s+/g, '-')}.json`;
      casesFolder.file(filename, JSON.stringify(caso, null, 2));
    });
    
    // Generar ZIP
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });
    
    return zipBlob;
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

## 📁 Estructura de Archivos

\`\`\`
.
├── cases.json           # Todos los casos en un solo archivo
├── metadata.json        # Metadata de exportación
├── README.md            # Este archivo
└── cases/              # Casos individuales (opcional)
    ├── case-1-*.json
    ├── case-2-*.json
    └── ...
\`\`\`

## 📋 Formato de Casos (cases.json)

Cada caso incluye:
- \`id\`: Identificador único
- \`number\`: Número de caso (#1, #2, ...)
- \`name\`: Nombre descriptivo
- \`description\`: Descripción del caso
- \`status\`: Estado (draft, recording, completed, paused)
- \`steps\`: Array de pasos capturados
  - Cada paso tiene: tipo, selector, timestamp, URL, etc.
- \`createdAt\`: Fecha de creación
- \`completedAt\`: Fecha de completado (si aplica)
- \`duration\`: Duración en ms (si completado)

## 🚀 Próximas Versiones (Roadmap)

### Version 2.0 - Con IA Agéntica (US#122)
- ✅ Anonimización automática de datos sensibles
- ✅ Generación de tests Playwright .spec.ts
- ✅ Generación de CSV para Jira
- ✅ Self-healing de selectores
- ✅ Validación multi-viewport

## 🔧 Uso de los Datos Exportados

### Opción 1: Inspección Manual
1. Abrir \`cases.json\` para ver todos los casos
2. Revisar cada caso en \`cases/\` individualmente
3. Analizar steps para entender el flujo

### Opción 2: Importar en Herramienta Custom
\`\`\`javascript
const casesData = require('./cases.json');
casesData.forEach(caso => {
  console.log(\`Caso #\${caso.number}: \${caso.name}\`);
  console.log(\`  Pasos: \${caso.steps.length}\`);
  console.log(\`  Estado: \${caso.status}\`);
});
\`\`\`

### Opción 3: Esperar US#122 para Export Completo
Este export MVP solo incluye JSON crudo. Para tests ejecutables:
- Esperar implementación de US#122 (IA Agéntica)
- Export incluirá .spec.ts Playwright + CSV Jira
- Datos anonimizados automáticamente

## ⚠️ Notas Importantes

- **Datos sensibles**: Este MVP NO anonimiza datos. Revisar antes de compartir.
- **Tests automatizados**: Generación de .spec.ts requiere US#122.
- **CSV Jira**: Generación de formato Jira requiere US#122.

## 📞 Soporte

Para más información sobre el proyecto:
- Issues: https://github.com/pacomar2009-glitch/Simple-QA-Tests-builder/issues
- US#92: Export ZIP (este feature)
- US#122: IA Agéntica (anonimización + tests)

---

**Exportado**: ${new Date().toISOString()}
**Versión**: 1.0.0-mvp
`;
  }
  
  /**
   * Generar nombre de archivo para descarga
   */
  static generateFilename() {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19); // YYYY-MM-DDTHH-MM-SS
    return `test-cases-export-${timestamp}.zip`;
  }
  
  /**
   * Validar datos de exportación antes de crear ZIP
   */
  static validateExportData(exportData) {
    if (!exportData || typeof exportData !== 'object') {
      throw new Error('Export data inválido');
    }
    
    if (!Array.isArray(exportData.cases)) {
      throw new Error('Export data debe contener array de casos');
    }
    
    if (!exportData.stats || typeof exportData.stats !== 'object') {
      throw new Error('Export data debe contener stats');
    }
    
    if (!exportData.exportedAt) {
      throw new Error('Export data debe contener exportedAt timestamp');
    }
    
    return true;
  }
  
  /**
   * Función principal de export (usada desde background)
   */
  static async exportCases(exportData) {
    // Validar datos
    this.validateExportData(exportData);
    
    // Crear ZIP
    const zipBlob = await this.createZIP(exportData);
    
    // Generar nombre de archivo
    const filename = this.generateFilename();
    
    return {
      blob: zipBlob,
      filename: filename,
      size: zipBlob.size,
      timestamp: exportData.exportedAt
    };
  }
}
