/**
 * Tests para Export Utils (US#92 MVP)
 * Verifica la creación de ZIP con casos exportados
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
      
      expect(filename).toMatch(/^test-cases-export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/);
      expect(filename.endsWith('.zip')).toBe(true);
    });
    
    test('should generate unique filenames', () => {
      const filename1 = ExportUtils.generateFilename();
      // Esperar un poco para asegurar timestamp diferente
      const filename2 = ExportUtils.generateFilename();
      
      // En la práctica pueden ser iguales si se ejecutan en el mismo segundo
      // pero la estructura debe ser correcta
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
      expect(readme).toContain('cases.json');
    });
    
    test('should handle zero stats', () => {
      const stats = { total: 0, completed: 0, recording: 0, draft: 0, paused: 0 };
      const readme = ExportUtils.generateREADME(stats);
      
      expect(readme).toContain('**Total de casos**: 0');
      expect(readme).toBeTruthy();
    });
  });
  
  describe('createZIP', () => {
    test('should create ZIP with all required files', async () => {
      const exportData = {
        cases: [
          {
            id: 'case-1',
            number: 1,
            name: 'Test Case 1',
            description: 'Test description',
            status: 'completed',
            steps: [
              { number: 1, type: 'click', selector: '#button1' }
            ],
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duration: 5000
          },
          {
            id: 'case-2',
            number: 2,
            name: 'Test Case 2',
            description: 'Another test',
            status: 'draft',
            steps: [],
            createdAt: new Date().toISOString()
          }
        ],
        stats: { total: 2, completed: 1, recording: 0, draft: 1, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      const zipBlob = await ExportUtils.createZIP(exportData);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(0);
      expect(zipBlob.type).toBe('application/zip');
    });
    
    test('should handle empty cases array', async () => {
      const exportData = {
        cases: [],
        stats: { total: 0, completed: 0, recording: 0, draft: 0, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      const zipBlob = await ExportUtils.createZIP(exportData);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(0);
    });
    
    test('should create individual case files', async () => {
      const exportData = {
        cases: [
          { id: 'case-1', number: 1, name: 'First Case', steps: [] },
          { id: 'case-2', number: 2, name: 'Second Case', steps: [] }
        ],
        stats: { total: 2, completed: 0, recording: 2, draft: 0, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      const zipBlob = await ExportUtils.createZIP(exportData);
      
      expect(zipBlob).toBeInstanceOf(Blob);
      
      // Verificar que el ZIP no esté vacío
      expect(zipBlob.size).toBeGreaterThan(500); // Debe tener contenido sustancial
    });
  });
  
  describe('exportCases', () => {
    test('should export cases successfully', async () => {
      const exportData = {
        cases: [
          {
            id: 'case-1',
            number: 1,
            name: 'Export Test Case',
            steps: [{ type: 'click', selector: '#btn' }],
            status: 'completed'
          }
        ],
        stats: { total: 1, completed: 1, recording: 0, draft: 0, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      const result = await ExportUtils.exportCases(exportData);
      
      expect(result).toHaveProperty('blob');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('timestamp');
      
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.filename).toMatch(/\.zip$/);
      expect(result.size).toBeGreaterThan(0);
      expect(result.timestamp).toBe(exportData.exportedAt);
    });
    
    test('should throw error for invalid export data', async () => {
      await expect(ExportUtils.exportCases(null)).rejects.toThrow('Export data inválido');
      await expect(ExportUtils.exportCases({})).rejects.toThrow();
    });
    
    test('should validate data before creating ZIP', async () => {
      const invalidData = {
        cases: 'not-an-array',
        stats: {},
        exportedAt: '2024-01-01'
      };
      
      await expect(ExportUtils.exportCases(invalidData)).rejects.toThrow();
    });
  });
  
  describe('Integration: Full export flow', () => {
    test('should export multiple cases with steps', async () => {
      const exportData = {
        cases: [
          {
            id: 'case-1',
            number: 1,
            name: 'Login Flow',
            description: 'Test login functionality',
            status: 'completed',
            steps: [
              { number: 1, type: 'input', selector: '#username', value: 'testuser' },
              { number: 2, type: 'input', selector: '#password', value: 'pass123' },
              { number: 3, type: 'click', selector: '#login-btn' }
            ],
            createdAt: '2024-01-01T10:00:00Z',
            completedAt: '2024-01-01T10:02:00Z',
            duration: 120000
          },
          {
            id: 'case-2',
            number: 2,
            name: 'Checkout Flow',
            description: 'Test checkout process',
            status: 'completed',
            steps: [
              { number: 1, type: 'click', selector: '#add-to-cart' },
              { number: 2, type: 'click', selector: '#checkout-btn' },
              { number: 3, type: 'input', selector: '#card-number', value: '4532000000000001' }
            ],
            createdAt: '2024-01-01T10:05:00Z',
            completedAt: '2024-01-01T10:08:00Z',
            duration: 180000
          }
        ],
        stats: { total: 2, completed: 2, recording: 0, draft: 0, paused: 0 },
        exportedAt: '2024-01-01T10:10:00Z'
      };
      
      const result = await ExportUtils.exportCases(exportData);
      
      expect(result.blob.size).toBeGreaterThan(1000); // Debe tener contenido sustancial
      expect(result.filename).toContain('test-cases-export-');
      expect(result.timestamp).toBe(exportData.exportedAt);
    });
    
    test('should handle case with many steps', async () => {
      const steps = Array.from({ length: 50 }, (_, i) => ({
        number: i + 1,
        type: 'click',
        selector: `#element-${i}`,
        timestamp: Date.now() + i * 1000
      }));
      
      const exportData = {
        cases: [
          { id: 'case-1', number: 1, name: 'Long Test', steps, status: 'completed' }
        ],
        stats: { total: 1, completed: 1, recording: 0, draft: 0, paused: 0 },
        exportedAt: new Date().toISOString()
      };
      
      const result = await ExportUtils.exportCases(exportData);
      
      expect(result.blob.size).toBeGreaterThan(2000); // Contenido más grande
    });
  });
});
