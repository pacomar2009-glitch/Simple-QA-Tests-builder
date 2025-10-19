// ===================================
// 🔢 BADGE MANAGER - Sistema de Badge para Extensión
// ===================================
// Gestión centralizada del badge del icono de la extensión
// Muestra contador de pasos capturados con estados visuales claros

console.log('🔢 [BadgeManager] Inicializando Badge Manager...');

/**
 * Badge Manager - Gestión del badge de la extensión
 * Responsable de actualizar el icono con contador y estados visuales
 */
export class BadgeManager {
  /**
   * Estados visuales del badge
   */
  static STATES = {
    IDLE: {
      color: '#9E9E9E',       // Gris
      description: 'Sin actividad'
    },
    RECORDING: {
      color: '#4CAF50',       // Verde
      description: 'Grabación activa'
    },
    COMPLETE: {
      color: '#2196F3',       // Azul
      description: 'Captura completada'
    },
    ERROR: {
      color: '#F44336',       // Rojo
      description: 'Error en captura'
    }
  };
  
  constructor() {
    this.currentState = 'IDLE';
    this.currentCount = 0;
    console.log('🔢 [BadgeManager] Badge Manager creado');
  }
  
  // ===================================
  // ACTUALIZACIÓN DE BADGE
  // ===================================
  
  /**
   * Actualiza el badge del icono de la extensión con el número de pasos capturados
   * @param {number} count - Número de pasos a mostrar
   * @param {string} state - Estado visual (IDLE, RECORDING, COMPLETE, ERROR)
   */
  updateBadge(count = 0, state = null) {
    this.currentCount = count;
    if (state) {
      this.currentState = state;
    }
    
    const displayText = this.getDisplayText(count);
    const badgeColor = BadgeManager.STATES[this.currentState]?.color || '#9E9E9E';
    
    console.log(`🔢 [BadgeManager] Actualizando badge: "${displayText}" (${this.currentState}, ${badgeColor})`);
    
    try {
      // 🔥 CRÍTICO: Actualizar badge GLOBALMENTE (sin tabId)
      chrome.action.setBadgeText({ text: displayText });
      chrome.action.setBadgeBackgroundColor({ color: badgeColor });
      
      // 🔥 TAMBIÉN actualizar en CADA TAB individual (para incógnito)
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ [BadgeManager] Error consultando tabs:', chrome.runtime.lastError);
          return;
        }
        
        tabs.forEach(tab => {
          try {
            chrome.action.setBadgeText({ 
              text: displayText,
              tabId: tab.id 
            });
            chrome.action.setBadgeBackgroundColor({ 
              color: badgeColor,
              tabId: tab.id 
            });
          } catch (err) {
            // Tab puede estar cerrado, ignorar error silenciosamente
          }
        });
        
        console.log(`✅ [BadgeManager] Badge actualizado: ${displayText} en ${tabs.length} tabs`);
      });
    } catch (error) {
      console.error('❌ [BadgeManager] Error actualizando badge:', error);
    }
  }
  
  /**
   * Actualiza solo el contador (mantiene estado actual)
   * @param {number} count - Número de pasos
   */
  updateCount(count) {
    this.updateBadge(count, this.currentState);
  }
  
  /**
   * Actualiza solo el estado (mantiene contador actual)
   * @param {string} state - Estado visual
   */
  setState(state) {
    if (!BadgeManager.STATES[state]) {
      console.warn(`⚠️ [BadgeManager] Estado inválido: ${state}`);
      return;
    }
    
    this.updateBadge(this.currentCount, state);
  }
  
  /**
   * Establece estado de grabación activa
   * @param {boolean} isRecording - ¿Está grabando?
   */
  setRecording(isRecording) {
    const newState = isRecording ? 'RECORDING' : 'COMPLETE';
    this.setState(newState);
  }
  
  /**
   * Establece estado de error
   * @param {boolean} hasError - ¿Hay error?
   */
  setError(hasError) {
    if (hasError) {
      this.setState('ERROR');
    } else {
      this.setState('IDLE');
    }
  }
  
  // ===================================
  // LIMPIEZA
  // ===================================
  
  /**
   * Limpia el badge (usado cuando se detiene la grabación y se limpia)
   */
  clearBadge() {
    console.log('🗑️ [BadgeManager] Limpiando badge...');
    
    try {
      // Limpiar globalmente
      chrome.action.setBadgeText({ text: '' });
      
      // Limpiar en todas las tabs
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ [BadgeManager] Error consultando tabs:', chrome.runtime.lastError);
          return;
        }
        
        tabs.forEach(tab => {
          try {
            chrome.action.setBadgeText({ text: '', tabId: tab.id });
          } catch (err) {
            // Ignorar si tab cerrado
          }
        });
        
        console.log(`✅ [BadgeManager] Badge limpiado en ${tabs.length} tabs`);
      });
    } catch (error) {
      console.error('❌ [BadgeManager] Error limpiando badge:', error);
    }
  }
  
  /**
   * Resetea el badge a estado inicial (0 en IDLE)
   */
  reset() {
    console.log('🔄 [BadgeManager] Reseteando badge a estado inicial...');
    this.currentCount = 0;
    this.currentState = 'IDLE';
    this.updateBadge(0, 'IDLE');
  }
  
  // ===================================
  // HELPERS PRIVADOS
  // ===================================
  
  /**
   * Obtiene el texto a mostrar en el badge
   * @private
   * @param {number} count - Contador
   * @returns {string} Texto para badge
   */
  getDisplayText(count) {
    if (count === 0) {
      // Mostrar "0" siempre (requisito: badge siempre visible desde 0)
      return '0';
    } else if (count > 999) {
      // Máximo 999+ para no sobrecargar badge
      return '999+';
    } else {
      return count.toString();
    }
  }
  
  /**
   * Obtiene estado y contador actuales
   * @returns {Object} { state, count, color, description }
   */
  getStatus() {
    const stateInfo = BadgeManager.STATES[this.currentState];
    return {
      state: this.currentState,
      count: this.currentCount,
      color: stateInfo.color,
      description: stateInfo.description,
      displayText: this.getDisplayText(this.currentCount)
    };
  }
}

// ===================================
// SINGLETON INSTANCE
// ===================================

/**
 * Instancia única del BadgeManager
 * @type {BadgeManager}
 */
export const badgeManager = new BadgeManager();

// Inicializar badge en estado IDLE con 0
if (typeof chrome !== 'undefined' && chrome.action) {
  console.log('🔢 [BadgeManager] Inicializando badge con estado IDLE...');
  badgeManager.reset();
}

// Exportar clase e instancia
export default badgeManager;

console.log('✅ [BadgeManager] Módulo cargado correctamente');
