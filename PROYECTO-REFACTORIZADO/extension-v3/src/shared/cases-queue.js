/**
 * US#57 - Cola de Casos: Gestor de múltiples casos de prueba
 * 
 * RESPONSABILIDADES:
 * - ✅ Gestionar cola de casos (CRUD)
 * - ✅ Últimos 3 casos visibles + contador total
 * - ✅ Persistencia en chrome.storage.local
 * - ✅ Cambio de caso sin cerrar popup
 * - ❌ NO implementa export ZIP (delegado a US#92)
 */

export class CasesQueueManager {
  constructor() {
    this.cases = [];
    this.currentCaseId = null;
    this.initialized = false;
  }
  
  /**
   * Inicializar desde storage
   */
  async initialize() {
    if (this.initialized) return;
    
    const data = await chrome.storage.local.get(['casesQueue', 'currentCaseId']);
    this.cases = data.casesQueue || [];
    this.currentCaseId = data.currentCaseId || null;
    this.initialized = true;
    
    console.log(`📋 Cola de casos cargada: ${this.cases.length} casos`);
  }
  
  /**
   * Crear nuevo caso de prueba
   */
  async addNewCase(caseData) {
    const newCase = {
      id: `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: this.cases.length + 1,
      name: caseData.name || `Caso ${this.cases.length + 1}`,
      description: caseData.description || '',
      initialUrl: caseData.url || '',
      status: 'draft', // draft, recording, paused, completed
      steps: [],
      metadata: {
        createdAt: new Date().toISOString(),
        startedAt: null,
        pausedAt: null,
        completedAt: null,
        duration: 0 // milisegundos
      },
      aiAnalysis: null // Se llena al completar
    };
    
    this.cases.push(newCase);
    await this.save();
    
    console.log(`✅ Caso creado: #${newCase.number} - ${newCase.name}`);
    return newCase;
  }
  
  /**
   * Obtener caso actual (el que se está grabando)
   */
  getCurrentCase() {
    if (!this.currentCaseId) return null;
    return this.cases.find(c => c.id === this.currentCaseId) || null;
  }
  
  /**
   * Iniciar grabación de un caso
   */
  async startRecordingCase(caseId) {
    const caseItem = this.cases.find(c => c.id === caseId);
    if (!caseItem) {
      console.error(`❌ Caso no encontrado: ${caseId}`);
      return false;
    }
    
    // Pausar caso actual si existe
    if (this.currentCaseId && this.currentCaseId !== caseId) {
      await this.pauseCurrentCase();
    }
    
    // Activar nuevo caso
    this.currentCaseId = caseId;
    caseItem.status = 'recording';
    
    if (!caseItem.metadata.startedAt) {
      caseItem.metadata.startedAt = new Date().toISOString();
    }
    
    await this.save();
    
    console.log(`▶️ Grabando caso: #${caseItem.number} - ${caseItem.name}`);
    return true;
  }
  
  /**
   * Pausar caso actual
   */
  async pauseCurrentCase() {
    const currentCase = this.getCurrentCase();
    if (!currentCase) return false;
    
    currentCase.status = 'paused';
    currentCase.metadata.pausedAt = new Date().toISOString();
    
    // Calcular duración acumulada
    if (currentCase.metadata.startedAt) {
      const start = new Date(currentCase.metadata.startedAt).getTime();
      const now = Date.now();
      currentCase.metadata.duration += (now - start);
    }
    
    await this.save();
    
    console.log(`⏸️ Caso pausado: #${currentCase.number}`);
    return true;
  }
  
  /**
   * Reanudar caso pausado
   */
  async resumeCurrentCase() {
    const currentCase = this.getCurrentCase();
    if (!currentCase) return false;
    
    currentCase.status = 'recording';
    currentCase.metadata.startedAt = new Date().toISOString(); // Reiniciar timer
    currentCase.metadata.pausedAt = null;
    
    await this.save();
    
    console.log(`▶️ Caso reanudado: #${currentCase.number}`);
    return true;
  }
  
  /**
   * Detener caso actual y marcarlo como completado
   */
  async stopCurrentCase(aiAnalysis = null) {
    const currentCase = this.getCurrentCase();
    if (!currentCase) return false;
    
    currentCase.status = 'completed';
    currentCase.metadata.completedAt = new Date().toISOString();
    
    // Calcular duración final
    if (currentCase.metadata.startedAt) {
      const start = new Date(currentCase.metadata.startedAt).getTime();
      const now = Date.now();
      currentCase.metadata.duration += (now - start);
    }
    
    // Guardar análisis IA si existe
    if (aiAnalysis) {
      currentCase.aiAnalysis = aiAnalysis;
    }
    
    this.currentCaseId = null;
    await this.save();
    
    console.log(`⏹️ Caso completado: #${currentCase.number} - ${currentCase.steps.length} pasos`);
    return true;
  }
  
  /**
   * Añadir paso al caso actual
   */
  async addStepToCurrentCase(stepData) {
    const currentCase = this.getCurrentCase();
    if (!currentCase) {
      console.warn('⚠️ No hay caso activo para añadir paso');
      return false;
    }
    
    currentCase.steps.push(stepData);
    await this.save();
    
    return true;
  }
  
  /**
   * Obtener últimos N casos (para mostrar en popup)
   */
  getRecentCases(limit = 3) {
    return this.cases
      .slice(-limit)
      .reverse(); // Más reciente primero
  }
  
  /**
   * Obtener todos los casos
   */
  getAllCases() {
    return [...this.cases];
  }
  
  /**
   * Obtener caso por ID
   */
  getCaseById(caseId) {
    return this.cases.find(c => c.id === caseId) || null;
  }
  
  /**
   * Eliminar caso
   */
  async deleteCase(caseId) {
    const index = this.cases.findIndex(c => c.id === caseId);
    if (index === -1) return false;
    
    const deletedCase = this.cases.splice(index, 1)[0];
    
    // Si era el caso actual, limpiarlo
    if (this.currentCaseId === caseId) {
      this.currentCaseId = null;
    }
    
    // Renumerar casos
    this.cases.forEach((c, i) => {
      c.number = i + 1;
    });
    
    await this.save();
    
    console.log(`🗑️ Caso eliminado: ${deletedCase.name}`);
    return true;
  }
  
  /**
   * Obtener estadísticas
   */
  getStats() {
    const total = this.cases.length;
    const completed = this.cases.filter(c => c.status === 'completed').length;
    const recording = this.cases.filter(c => c.status === 'recording').length;
    const paused = this.cases.filter(c => c.status === 'paused').length;
    const draft = this.cases.filter(c => c.status === 'draft').length;
    
    const totalSteps = this.cases.reduce((sum, c) => sum + c.steps.length, 0);
    
    return {
      total,
      completed,
      recording,
      paused,
      draft,
      totalSteps
    };
  }
  
  /**
   * Persistir en storage (OPTIMIZADO - evita quota exceeded)
   */
  async save() {
    try {
      // ✅ LIMITAR: Solo guardar últimos 5 casos (evita quota exceeded)
      const casesToSave = this.cases.slice(-5);
      
      // ✅ COMPRIMIR: Remover campos pesados de steps
      const compressedCases = casesToSave.map(c => ({
        ...c,
        steps: c.steps.map(s => ({
          number: s.number,
          type: s.type,
          selector: s.selector,
          value: s.value,
          text: s.text?.substring(0, 100), // Limitar texto
          url: s.url,
          timestamp: s.timestamp
          // Removemos: attributes, position, pageTitle (pesados)
        }))
      }));
      
      await chrome.storage.local.set({
        casesQueue: compressedCases,
        currentCaseId: this.currentCaseId
      });
    } catch (error) {
      console.error('❌ Error guardando casos (quota exceeded?):', error.message);
      // Si falla, intentar guardar solo el caso actual
      try {
        const currentCase = this.cases.find(c => c.id === this.currentCaseId);
        if (currentCase) {
          await chrome.storage.local.set({
            casesQueue: [currentCase],
            currentCaseId: this.currentCaseId
          });
        }
      } catch (retryError) {
        console.error('❌ Falló retry de guardado:', retryError.message);
      }
    }
  }
  
  /**
   * Limpiar todos los casos (DANGER)
   */
  async clearAllCases() {
    this.cases = [];
    this.currentCaseId = null;
    await this.save();
    console.log('🗑️ Todos los casos eliminados');
  }
  
  /**
   * Exportar datos de cola (para US#92)
   */
  exportData() {
    return {
      cases: this.cases,
      currentCaseId: this.currentCaseId,
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
  }
}
