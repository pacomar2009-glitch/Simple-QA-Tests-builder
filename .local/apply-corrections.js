// Script para aplicar todas las correcciones sin fallbacks
import fs from 'fs';
import path from 'path';

console.log('🔧 Aplicando correcciones completas sin fallbacks...');

// Leer el archivo original sin fallbacks
const originalPath = 'extension/background.js.manual-backup';
const targetPath = 'extension/background.js';

try {
  let content = fs.readFileSync(originalPath, 'utf8');
  
  console.log('📝 Aplicando correcciones de API Gemini...');
  
  // Corregir todos los endpoints de Gemini
  content = content.replace(
    /gemini-1\.5-flash-latest/g,
    'gemini-2.5-flash'
  );
  
  console.log('🔗 Corregir endpoints MCP...');
  
  // Corregir endpoints MCP (si existen)
  content = content.replace(
    /localhost:3001\/generate/g,
    'localhost:3001/api/generate'
  );
  
  content = content.replace(
    /localhost:3001\/recording\/start/g,
    'localhost:3001/api/generate'
  );
  
  content = content.replace(
    /localhost:3001\/playwright\/generate/g,
    'localhost:3001/api/generate'
  );
  
  content = content.replace(
    /localhost:3001\/playwright\/reproduce/g,
    'localhost:3001/api/generate'
  );
  
  console.log('✅ Aplicando archivo corregido...');
  
  fs.writeFileSync(targetPath, content, 'utf8');
  
  console.log('🎉 Correcciones aplicadas exitosamente!');
  console.log('📋 Resumen:');
  console.log('   - API Gemini corregida a gemini-2.5-flash');
  console.log('   - Endpoints MCP corregidos a /api/generate');
  console.log('   - Implementación sin fallbacks preservada');
  
} catch (error) {
  console.error('❌ Error aplicando correcciones:', error.message);
}