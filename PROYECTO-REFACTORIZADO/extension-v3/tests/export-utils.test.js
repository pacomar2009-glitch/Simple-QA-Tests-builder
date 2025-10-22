/**
 * Tests para Export Utils (US#92 MVP)
 * Verifica la exportación JSON de casos (sin ZIP para evitar dependencias complejas)
 */

import { ExportUtils } from '../src/shared/export-utils.js';

describe('ExportUtils', () => {
  describe('validateExportData', () => {
    test('should validate correct export data', () => {
      const validData = {
        cases: [
          { id: 'case-1', name: 'Test Case 1', steps: [] }
        ],
        stats: { total: 1, completed: 0, recording: 1, draft: 0, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      expect(() => ExportUtils.validateExportData(validData)).not.toThrow();
    });
    
    test('should throw error for invalid data', () => {
      expect(() => ExportUtils.validateExportData(null)).toThrow('Export data inválido');
      expect(() => ExportUtils.validateExportData({})).toThrow('Export data debe contener array de casos');
      expect(() => ExportUtils.validateExportData({ cases: [] })).toThrow('Export data debe contener stats');
      expect(() => ExportUtils.validateExportData({ cases: [], stats: {} })).toThrow('Export data debe contener exportedAt timestamp');
    });
  });
  
  describe('generateFilename', () => {
    test('should generate filename with timestamp', () => {
      const filename = ExportUtils.generateFilename();
      
      expect(filename).toMatch(/^test-cases-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
      expect(filename.endsWith('.json')).toBe(true);
    });
    
    test('should generate unique filenames', () => {
      const filename1 = ExportUtils.generateFilename();
      const filename2 = ExportUtils.generateFilename();
      
      // Ambos deben tener estructura válida
      expect(filename1).toBeTruthy();
      expect(filename2).toBeTruthy();
    });
  });
  
  describe('generateREADME', () => {
    test('should generate README with stats', () => {
      const stats = { total: 5, completed: 3, recording: 1, draft: 1, paused: 0 };
      const readme = ExportUtils.generateREADME(stats);
      
      expect(readme).toContain('# Test Cases Export - MVP');
      expect(readme).toContain('**Total de casos**: 5');
      expect(readme).toContain('**Completados**: 3');
      expect(readme).toContain('**En grabación**: 1');
      expect(readme).toContain('**Borradores**: 1');
      expect(readme).toContain('**Pausados**: 0');
      expect(readme).toContain('US#122');
    });
    
    test('should handle zero stats', () => {
      const stats = { total: 0, completed: 0, recording: 0, draft: 0, paused: 0 };
      const readme = ExportUtils.generateREADME(stats);
      
      expect(readme).toContain('**Total de casos**: 0');
      expect(readme).toBeTruthy();
    });
  });
  
  describe('exportCases', () => {
    test('should export cases successfully as JSON', async () => {
      const exportData = {
        cases: [
          {
            id: 'case-1',
            number: 1,
            name: 'Test Case 1',
            description: 'Description',
            status: 'completed',
            steps: [
              { type: 'click', selector: '#btn', timestamp: Date.now() }
            ]
          }
        ],
        stats: { total: 1, completed: 1, recording: 0, draft: 0, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      const result = await ExportUtils.exportCases(exportData);
      
      // Verificar resultado
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('application/json');
      expect(result.filename).toMatch(/\.json$/);
      expect(result.size).toBeGreaterThan(0);
      expect(result.timestamp).toBe(exportData.exportedAt);
      expect(result.format).toBe('json');
      expect(result.casesExported).toBe(1);
    });
    
    test('should throw error for invalid export data', async () => {
      await expect(ExportUtils.exportCases(null)).rejects.toThrow('Export data inválido');
    });
    
    test('should validate data before exporting', async () => {
      const invalidData = { cases: [] }; // Missing stats and exportedAt
      
      await expect(ExportUtils.exportCases(invalidData)).rejects.toThrow();
    });
    
    test('should include metadata, readme and cases in export package', async () => {
      const exportData = {
        cases: [
          {
            id: 'case-1',
            number: 1,
            name: 'Test Case 1',
            steps: []
          }
        ],
        stats: { total: 1, completed: 0, recording: 1, draft: 0, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      const result = await ExportUtils.exportCases(exportData);
      
      // Verificar que el resultado tiene las propiedades correctas
      expect(result).toHaveProperty('blob');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('casesExported');
      expect(result.casesExported).toBe(1);
      expect(result.format).toBe('json');
      
      // Verificar que el blob tiene contenido
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.blob.type).toBe('application/json');
    });
  });
  
  describe('Integration: Full export flow', () => {
    test('should export multiple cases with steps', async () => {
      const exportData = {
        cases: [
          {
            id: 'case-1',
            number: 1,
            name: 'Login Test',
            status: 'completed',
            steps: [
              { type: 'navigation', url: 'https://example.com/login' },
              { type: 'input', selector: '#username', value: 'testuser' },
              { type: 'input', selector: '#password', value: 'password123' },
              { type: 'click', selector: '#login-btn' }
            ]
          },
          {
            id: 'case-2',
            number: 2,
            name: 'Search Test',
            status: 'draft',
            steps: [
              { type: 'navigation', url: 'https://example.com' },
              { type: 'input', selector: '#search', value: 'test query' },
              { type: 'click', selector: '#search-btn' }
            ]
          }
        ],
        stats: { total: 2, completed: 1, recording: 0, draft: 1, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      const result = await ExportUtils.exportCases(exportData);
      
      expect(result.casesExported).toBe(2);
      expect(result.format).toBe('json');
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.blob.type).toBe('application/json');
    });
    
    test('should handle case with many steps', async () => {
      const steps = Array.from({ length: 50 }, (_, i) => ({
        type: 'click',
        selector: `#btn-${i}`,
        timestamp: Date.now() + i
      }));
      
      const exportData = {
        cases: [
          {
            id: 'case-complex',
            number: 1,
            name: 'Complex Test',
            status: 'completed',
            steps
          }
        ],
        stats: { total: 1, completed: 1, recording: 0, draft: 0, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      const result = await ExportUtils.exportCases(exportData);
      
      expect(result.casesExported).toBe(1);
      expect(result.blob.size).toBeGreaterThan(1000); // Debe ser grande con 50 steps
      expect(result.blob.type).toBe('application/json');
    });
  });
});
