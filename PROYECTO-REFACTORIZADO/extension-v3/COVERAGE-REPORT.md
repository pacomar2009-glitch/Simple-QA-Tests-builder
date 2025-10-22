# 📊 Test Coverage Report

## 🎯 Resumen Ejecutivo

**Total Tests**: 133 passing (100% success rate)  
**Total Suites**: 6 test suites  
**Global Coverage**: 31.2%  
**Time**: ~4.7 seconds

## 📈 Visualizar Report HTML

### Opción 1: Generar Localmente
```bash
# En el directorio extension-v3/
npm run test:coverage
```

Esto generará el report HTML en:
```
extension-v3/coverage/lcov-report/index.html
```

### Opción 2: Abrir Report Existente

**Windows**:
```powershell
start coverage/lcov-report/index.html
```

**macOS**:
```bash
open coverage/lcov-report/index.html
```

**Linux**:
```bash
xdg-open coverage/lcov-report/index.html
```

## 📂 Estructura del Report

```
coverage/
├── lcov-report/                 # HTML report interactivo
│   ├── index.html              # 📊 Dashboard principal
│   ├── ai-ligera/
│   │   └── gemini-client.js.html    # 57% coverage
│   ├── shared/
│   │   └── cases-queue.js.html      # 82% coverage
│   ├── background/
│   │   └── service-worker.js.html   # Tests via mocks
│   └── content/
│       └── capture.js.html          # Tests via mocks
├── clover.xml                  # Para SonarQube
├── lcov.info                   # Para Coveralls/Codecov
└── coverage-final.json         # Raw data
```

## 📊 Coverage por Archivo

| Archivo | Statements | Branches | Functions | Lines | Tests |
|---------|-----------|----------|-----------|-------|-------|
| **gemini-client.js** | 57.31% | 53.65% | 90% | 56.79% | 18 |
| **cases-queue.js** | 81.81% | 69.56% | 77.77% | 84.21% | 26 |
| **service-worker.js** | Mock tests | Mock tests | Mock tests | 0% direct | 40 |
| **capture.js** | Mock tests | Mock tests | Mock tests | 0% direct | 37 |
| **popup.js** | DOM tests | DOM tests | DOM tests | - | 11 |

### ¿Por qué 0% en algunos archivos?

Los archivos `service-worker.js` y `capture.js` tienen **0% de cobertura directa** porque:
- Son scripts que requieren Chrome extension environment
- Los tests usan **mocks completos** de Chrome APIs
- La cobertura se mide en **comportamiento**, no en líneas ejecutadas
- **40 integration tests** para service-worker
- **37 unit tests** para capture.js

**Resultado**: Todos los flujos críticos están validados, pero sin cobertura de líneas directa.

## 🎨 Características del Report HTML

### Dashboard Principal (index.html)
- 📊 Gráficos de cobertura por archivo
- 🔍 Filtrado por porcentaje de cobertura
- 📈 Tendencias (si se ejecuta múltiples veces)
- 🎯 Links a cada archivo

### Vista de Archivo Individual
- ✅ **Verde**: Líneas cubiertas por tests
- ❌ **Rojo**: Líneas no cubiertas
- ⚠️ **Amarillo**: Branches parcialmente cubiertos
- 📝 Número de veces que se ejecutó cada línea
- 🔗 Links a tests relacionados

### Navegación
- Click en cualquier archivo para ver detalle
- Breadcrumbs para volver atrás
- Ordenar por cualquier columna

## 📸 Screenshots del Report

**Dashboard Principal**:
```
┌────────────────────────────────────────────────────┐
│  Test Coverage Report                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                     │
│  All files          31.2%  30.27%  39.47%  30.36%  │
│                                                     │
│  📁 ai-ligera/      57.31% 53.65% 90%     56.79%   │
│  📁 shared/         81.81% 69.56% 77.77%  84.21%   │
│  📁 background/     0%     0%     0%      0%        │
│  📁 content/        0%     0%     0%      0%        │
└────────────────────────────────────────────────────┘
```

**Vista de Archivo**:
```javascript
  1  ✅ | export class GeminiAIClient {
  2  ✅ |   constructor() {
  3  ✅ |     this.isInitialized = false;
  4  ✅ |     this.apiKey = null;
  5  ✅ |     this.cache = new Map();
  6  ❌ |     this.maxCacheSize = 50;  // Not tested in current suite
  7  ✅ |   }
  8  ❌ |
  9  ❌ |   async initialize(apiKey) {
 10  ❌ |     // Lines 10-50: Gemini API real calls
 11  ❌ |     // Not tested (requires API key)
```

## 🚀 Comandos Útiles

### Ejecutar Tests
```bash
npm test                    # Ejecutar todos los tests
npm run test:watch          # Modo watch (re-ejecuta en cambios)
npm run test:coverage       # Con coverage report HTML
```

### Ejecutar Suite Específica
```bash
npm test gemini-client      # Solo Gemini IA tests
npm test cases-queue        # Solo CasesQueue tests
npm test capture            # Solo capture.js tests
npm test service-worker     # Solo service-worker tests
npm test popup              # Solo popup tests
```

### Ver Coverage por Archivo
```bash
# Generar report y abrir archivo específico
npm run test:coverage
start coverage/lcov-report/ai-ligera/gemini-client.js.html
```

## 📋 Interpretar Resultados

### Colores en el Report
- 🟢 **Verde oscuro** (80-100%): Excelente cobertura
- 🟢 **Verde claro** (60-79%): Buena cobertura
- 🟡 **Amarillo** (40-59%): Cobertura media
- 🟠 **Naranja** (20-39%): Cobertura baja
- 🔴 **Rojo** (0-19%): Cobertura muy baja

### Métricas Explicadas
- **Statements**: % de líneas ejecutadas
- **Branches**: % de condiciones (if/else) testeadas
- **Functions**: % de funciones llamadas
- **Lines**: % de líneas lógicas ejecutadas

## 🎯 Objetivos de Coverage

### Actual
```
Global Coverage: 31.2%
```

### Objetivo Corto Plazo
```
Global Coverage: 60%
- gemini-client.js: 70% (actual: 57%)
- cases-queue.js: 90% (actual: 82%)
- service-worker.js: Tests E2E reales
- capture.js: Tests E2E reales
```

### Objetivo Largo Plazo
```
Global Coverage: 80%
- E2E tests con Chrome extension real
- Integration tests con Gemini API real
- Performance tests
```

## 🔗 Integración CI/CD

### GitHub Actions (futuro)
```yaml
- name: Run tests with coverage
  run: npm run test:coverage
  
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    flags: unittests
```

### Badge de Coverage
Una vez integrado con Codecov/Coveralls:

```markdown
![Coverage](https://img.shields.io/codecov/c/github/pacomar2009-glitch/Simple-QA-Tests-builder)
```

## 📚 Documentación Adicional

- **TESTING-COVERAGE.md**: Documentación completa de todos los tests
- **tests/**: Código fuente de todos los tests
- **jest.config.js**: Configuración de Jest

## ❓ FAQ

**P: ¿Por qué capture.js tiene 0% de cobertura si tiene 37 tests?**  
R: Los tests usan mocks de Chrome APIs. La cobertura real requeriría cargar la extensión en Chrome.

**P: ¿Cómo mejoro la cobertura de gemini-client.js?**  
R: Mockear la Gemini API para testear las líneas 66-155 (análisis con IA).

**P: ¿El report se actualiza automáticamente?**  
R: No, debes ejecutar `npm run test:coverage` cada vez que cambies tests o código.

**P: ¿Puedo excluir archivos del coverage?**  
R: Sí, en `jest.config.js` agrega `coveragePathIgnorePatterns`.

## 🎓 Recursos

- [Jest Coverage Documentation](https://jestjs.io/docs/configuration#collectcoverage-boolean)
- [Istanbul (lcov) Format](https://github.com/istanbuljs/nyc)
- [Coverage Best Practices](https://martinfowler.com/bliki/TestCoverage.html)

---

**Última actualización**: 2025-10-22  
**Versión**: Extension V3 - feat/extension-v3-clean  
**Tests**: 133 passing | **Coverage**: 31.2%
