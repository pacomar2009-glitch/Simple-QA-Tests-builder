// ===================================
// 🚀 TEST LAUNCHER - Iniciar captura en ventana aislada
// ===================================

// Sitios predefinidos populares
const POPULAR_SITES = [
  { icon: '🔍', name: 'Google', url: 'https://www.google.com' },
  { icon: '🛒', name: 'Amazon', url: 'https://www.amazon.com' },
  { icon: '📚', name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { icon: '💻', name: 'GitHub', url: 'https://github.com' },
  { icon: '📺', name: 'YouTube', url: 'https://www.youtube.com' },
  { icon: '📱', name: 'Twitter/X', url: 'https://twitter.com' },
  { icon: '💼', name: 'LinkedIn', url: 'https://www.linkedin.com' },
  { icon: '📖', name: 'Reddit', url: 'https://www.reddit.com' },
];

// Estado
let selectedUrl = '';
let selectedSiteIndex = -1;

// Elementos DOM (se inicializan en DOMContentLoaded)
let urlInput, urlStatus, errorMessage, suggestionsGrid, customUrlBtn, launchBtn, launchText;
let optIncognito, optFullscreen, optAutostart;

// ===================================
// 🎨 Renderizar sitios sugeridos
// ===================================
function renderSuggestions() {
  suggestionsGrid.innerHTML = POPULAR_SITES.map((site, index) => `
    <div class="suggestion-card" data-index="${index}">
      <div class="suggestion-icon">${site.icon}</div>
      <div class="suggestion-name">${site.name}</div>
      <div class="suggestion-url">${new URL(site.url).hostname}</div>
    </div>
  `).join('');

  // Event listeners
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.dataset.index);
      selectSite(index);
    });
  });
}

// ===================================
// 🎯 Seleccionar sitio predefinido
// ===================================
function selectSite(index) {
  selectedSiteIndex = index;
  const site = POPULAR_SITES[index];
  selectedUrl = site.url;
  
  // Actualizar UI
  urlInput.value = site.url;
  validateUrl(site.url);
  
  // Marcar como seleccionado
  document.querySelectorAll('.suggestion-card').forEach((card, i) => {
    card.classList.toggle('selected', i === index);
  });
}

// ===================================
// ✅ Validar URL
// ===================================
function validateUrl(url) {
  // Limpiar error previo
  errorMessage.classList.remove('show');
  urlInput.classList.remove('valid', 'invalid');
  urlStatus.textContent = '';

  if (!url) {
    launchBtn.disabled = true;
    return false;
  }

  try {
    const urlObj = new URL(url);
    
    // Validar protocolo
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      showError('La URL debe comenzar con http:// o https://');
      urlInput.classList.add('invalid');
      urlStatus.textContent = '❌';
      launchBtn.disabled = true;
      return false;
    }

    // Validar hostname
    if (!urlObj.hostname || urlObj.hostname === 'localhost') {
      showError('Por favor, usa un dominio válido (no localhost)');
      urlInput.classList.add('invalid');
      urlStatus.textContent = '❌';
      launchBtn.disabled = true;
      return false;
    }

    // URL válida
    selectedUrl = url;
    urlInput.classList.add('valid');
    urlStatus.textContent = '✅';
    launchBtn.disabled = false;
    return true;

  } catch (e) {
    showError('URL inválida. Formato esperado: https://www.example.com');
    urlInput.classList.add('invalid');
    urlStatus.textContent = '❌';
    launchBtn.disabled = true;
    return false;
  }
}

// ===================================
// ⚠️ Mostrar error
// ===================================
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  
  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 5000);
}

// ===================================
// 🚀 Iniciar captura
// ===================================
async function launchTest() {
  if (!selectedUrl || launchBtn.disabled) return;

  // Actualizar UI
  launchBtn.disabled = true;
  launchText.innerHTML = '<div class="spinner"></div> Abriendo ventana...';

  // Preparar opciones
  const options = {
    url: selectedUrl,
    incognito: optIncognito.checked,
    fullscreen: optFullscreen.checked,
    autostart: optAutostart.checked
  };

  try {
    // Enviar mensaje a background para abrir ventana aislada
    const response = await chrome.runtime.sendMessage({
      action: 'launchIsolatedTest',
      options: options
    });

    if (response.success) {
      console.log('✅ Ventana aislada creada:', response.windowId);
      
      // Mostrar confirmación
      launchText.innerHTML = '✅ Ventana abierta - Captura iniciada';
      
      // Cerrar launcher después de 2s
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      throw new Error(response.error || 'Error desconocido');
    }

  } catch (error) {
    console.error('❌ Error al iniciar test:', error);
    showError(`Error: ${error.message}`);
    
    // Restaurar botón
    launchBtn.disabled = false;
    launchText.textContent = '🚀 Iniciar Captura en Ventana Limpia';
  }
}

// ===================================
// 🎬 Inicialización
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Test Launcher inicializado');
  
  // Inicializar elementos DOM
  urlInput = document.getElementById('url-input');
  urlStatus = document.getElementById('url-status');
  errorMessage = document.getElementById('error-message');
  suggestionsGrid = document.getElementById('suggestions-grid');
  customUrlBtn = document.getElementById('custom-url-btn');
  launchBtn = document.getElementById('launch-btn');
  launchText = document.getElementById('launch-text');
  optIncognito = document.getElementById('opt-incognito');
  optFullscreen = document.getElementById('opt-fullscreen');
  optAutostart = document.getElementById('opt-autostart');
  
  // Verificar que todos los elementos existen
  if (!urlInput || !launchBtn || !optIncognito || !optFullscreen || !optAutostart) {
    console.error('❌ Error: No se pudieron encontrar todos los elementos DOM');
    return;
  }
  
  // Renderizar sitios sugeridos
  renderSuggestions();
  
  // Event Listeners
  setupEventListeners();
  
  // Cargar opciones guardadas
  loadSavedOptions();
  
  // Auto-focus en input
  urlInput.focus();

  // Cargar última URL usada
  chrome.storage.local.get(['lastTestUrl'], (data) => {
    if (data.lastTestUrl) {
      urlInput.value = data.lastTestUrl;
      validateUrl(data.lastTestUrl);
    }
  });
});

// ===================================
// 🎧 Configurar Event Listeners
// ===================================
function setupEventListeners() {
  // Input de URL manual
  urlInput.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    
    // Deseleccionar sitios predefinidos
    selectedSiteIndex = -1;
    document.querySelectorAll('.suggestion-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    // Validar
    validateUrl(url);
  });

  // Enter en el input
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !launchBtn.disabled) {
      launchTest();
    }
  });

  // Botón de URL personalizada
  customUrlBtn.addEventListener('click', () => {
    urlInput.focus();
    urlInput.select();
  });

  // Botón de launch
  launchBtn.addEventListener('click', launchTest);

  // Guardar opciones al cambiar
  [optIncognito, optFullscreen, optAutostart].forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      chrome.storage.local.set({
        launcherOptions: {
          incognito: optIncognito.checked,
          fullscreen: optFullscreen.checked,
          autostart: optAutostart.checked
        }
      });
    });
  });
}

// ===================================
// 💾 Cargar opciones guardadas
// ===================================
function loadSavedOptions() {
  chrome.storage.local.get(['launcherOptions'], (data) => {
    if (data.launcherOptions) {
      optIncognito.checked = data.launcherOptions.incognito ?? true;
      optFullscreen.checked = data.launcherOptions.fullscreen ?? false;
      optAutostart.checked = data.launcherOptions.autostart ?? true;
    }
  });
}
