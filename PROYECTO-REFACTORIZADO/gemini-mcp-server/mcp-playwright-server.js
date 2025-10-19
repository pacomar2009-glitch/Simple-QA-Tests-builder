// 🔧 MCP PLAYWRIGHT SERVER - Servidor de herramientas MCP verdadero
// Expone herramientas de Playwright a través del protocolo MCP estándar

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { chromium } = require('playwright');

// 🌐 Estado del navegador persistente
let browserState = {
  browser: null,
  context: null,
  page: null,
  sessionId: null,
  lastScreenshot: null
};

// 🔧 SERVIDOR MCP
const server = new Server(
  {
    name: 'playwright-automation',
    version: '2.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// 📋 DEFINICIÓN DE HERRAMIENTAS MCP
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'browser_start',
        description: 'Inicia una sesión de navegador persistente. DEBE llamarse antes de cualquier otra acción.',
        inputSchema: {
          type: 'object',
          properties: {
            headless: {
              type: 'boolean',
              description: 'Si el navegador debe ejecutarse sin interfaz visual',
              default: false
            },
            sessionId: {
              type: 'string',
              description: 'ID único para esta sesión de navegación'
            }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'browser_close',
        description: 'Cierra la sesión de navegador actual y limpia recursos',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'navigate',
        description: 'Navega a una URL específica',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL completa a la que navegar (debe incluir protocolo http:// o https://)'
            },
            waitUntil: {
              type: 'string',
              enum: ['load', 'domcontentloaded', 'networkidle'],
              description: 'Condición de espera antes de continuar',
              default: 'domcontentloaded'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'click',
        description: 'Hace clic en un elemento de la página',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Selector CSS o texto del elemento a clickear (ej: "button", "text=Login", "#submit")'
            },
            timeout: {
              type: 'number',
              description: 'Timeout en milisegundos para encontrar el elemento',
              default: 10000
            }
          },
          required: ['selector']
        }
      },
      {
        name: 'type',
        description: 'Escribe texto en un campo de entrada',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Selector del campo de entrada'
            },
            text: {
              type: 'string',
              description: 'Texto a escribir'
            },
            clear: {
              type: 'boolean',
              description: 'Limpiar campo antes de escribir',
              default: true
            }
          },
          required: ['selector', 'text']
        }
      },
      {
        name: 'screenshot',
        description: 'Captura una imagen de la página actual para análisis visual',
        inputSchema: {
          type: 'object',
          properties: {
            fullPage: {
              type: 'boolean',
              description: 'Capturar página completa o solo viewport visible',
              default: false
            }
          }
        }
      },
      {
        name: 'get_page_context',
        description: 'Obtiene información detallada del estado actual de la página (URL, título, elementos visibles, formularios)',
        inputSchema: {
          type: 'object',
          properties: {
            includeHTML: {
              type: 'boolean',
              description: 'Incluir HTML simplificado de elementos interactivos',
              default: true
            }
          }
        }
      },
      {
        name: 'wait',
        description: 'Espera un tiempo específico o hasta que se cumpla una condición',
        inputSchema: {
          type: 'object',
          properties: {
            milliseconds: {
              type: 'number',
              description: 'Milisegundos a esperar'
            },
            selector: {
              type: 'string',
              description: 'Selector de elemento a esperar (alternativo a milliseconds)'
            }
          }
        }
      },
      {
        name: 'evaluate',
        description: 'Ejecuta código JavaScript en el contexto de la página',
        inputSchema: {
          type: 'object',
          properties: {
            script: {
              type: 'string',
              description: 'Código JavaScript a ejecutar'
            }
          },
          required: ['script']
        }
      },
      {
        name: 'find_elements',
        description: 'Busca elementos en la página y retorna información sobre ellos',
        inputSchema: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: 'Selector para buscar elementos'
            }
          },
          required: ['selector']
        }
      },
      {
        name: 'handle_dialog',
        description: 'Acepta o rechaza un diálogo (alert, confirm, prompt)',
        inputSchema: {
          type: 'object',
          properties: {
            accept: {
              type: 'boolean',
              description: 'True para aceptar, false para rechazar',
              default: true
            },
            promptText: {
              type: 'string',
              description: 'Texto a ingresar si es un prompt'
            }
          }
        }
      }
    ]
  };
});

// 🎯 IMPLEMENTACIÓN DE HERRAMIENTAS
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'browser_start':
        return await handleBrowserStart(args);

      case 'browser_close':
        return await handleBrowserClose();

      case 'navigate':
        return await handleNavigate(args);

      case 'click':
        return await handleClick(args);

      case 'type':
        return await handleType(args);

      case 'screenshot':
        return await handleScreenshot(args);

      case 'get_page_context':
        return await handleGetPageContext(args);

      case 'wait':
        return await handleWait(args);

      case 'evaluate':
        return await handleEvaluate(args);

      case 'find_elements':
        return await handleFindElements(args);

      case 'handle_dialog':
        return await handleDialog(args);

      default:
        throw new Error(`Herramienta desconocida: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error en ${name}: ${error.message}\n\nStack: ${error.stack}`
        }
      ],
      isError: true
    };
  }
});

// 🔧 IMPLEMENTACIONES DE CADA HERRAMIENTA

async function handleBrowserStart(args) {
  const { headless = false, sessionId } = args;

  // Cerrar sesión anterior si existe
  if (browserState.browser) {
    await browserState.browser.close();
  }

  browserState.browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 500,
    args: headless ? [] : ['--start-maximized']
  });

  browserState.context = await browserState.browser.newContext({
    viewport: headless ? { width: 1920, height: 1080 } : null
  });

  browserState.page = await browserState.context.newPage();
  browserState.sessionId = sessionId;

  // Configurar listeners para diálogos
  browserState.page.on('dialog', async dialog => {
    console.log(`Dialog detected: ${dialog.type()} - ${dialog.message()}`);
    await dialog.accept();
  });

  return {
    content: [
      {
        type: 'text',
        text: `✅ Navegador iniciado exitosamente\nSesión ID: ${sessionId}\nModo: ${headless ? 'Headless' : 'Visual'}`
      }
    ]
  };
}

async function handleBrowserClose() {
  if (browserState.browser) {
    await browserState.browser.close();
    const sessionId = browserState.sessionId;
    browserState = {
      browser: null,
      context: null,
      page: null,
      sessionId: null,
      lastScreenshot: null
    };
    return {
      content: [
        {
          type: 'text',
          text: `✅ Navegador cerrado (Sesión: ${sessionId})`
        }
      ]
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: '⚠️ No hay navegador activo para cerrar'
      }
    ]
  };
}

async function handleNavigate(args) {
  ensureBrowser();
  const { url, waitUntil = 'domcontentloaded' } = args;

  await browserState.page.goto(url, { waitUntil, timeout: 30000 });

  const currentUrl = browserState.page.url();
  const title = await browserState.page.title();

  return {
    content: [
      {
        type: 'text',
        text: `✅ Navegación exitosa\nURL: ${currentUrl}\nTítulo: ${title}`
      }
    ]
  };
}

async function handleClick(args) {
  ensureBrowser();
  const { selector, timeout = 10000 } = args;

  await browserState.page.waitForSelector(selector, { timeout, state: 'visible' });
  await browserState.page.click(selector, { timeout });

  return {
    content: [
      {
        type: 'text',
        text: `✅ Click exitoso en: ${selector}`
      }
    ]
  };
}

async function handleType(args) {
  ensureBrowser();
  const { selector, text, clear = true } = args;

  await browserState.page.waitForSelector(selector, { timeout: 10000, state: 'visible' });

  if (clear) {
    await browserState.page.fill(selector, text);
  } else {
    await browserState.page.type(selector, text);
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ Texto ingresado en ${selector}: "${text}"`
      }
    ]
  };
}

async function handleScreenshot(args) {
  ensureBrowser();
  const { fullPage = false } = args;

  const screenshot = await browserState.page.screenshot({
    fullPage,
    type: 'png'
  });

  browserState.lastScreenshot = screenshot;
  const base64 = screenshot.toString('base64');

  return {
    content: [
      {
        type: 'image',
        data: base64,
        mimeType: 'image/png'
      },
      {
        type: 'text',
        text: `📸 Screenshot capturado (${fullPage ? 'página completa' : 'viewport'})`
      }
    ]
  };
}

async function handleGetPageContext(args) {
  ensureBrowser();
  const { includeHTML = true } = args;

  const context = await browserState.page.evaluate((includeHTML) => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
      tag: el.tagName.toLowerCase(),
      type: el.type || 'text',
      name: el.name || '',
      id: el.id || '',
      placeholder: el.placeholder || '',
      value: el.value || '',
      selector: generateSelector(el)
    }));

    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]')).map(el => ({
      tag: el.tagName.toLowerCase(),
      text: el.innerText || el.value || '',
      type: el.type || '',
      selector: generateSelector(el)
    }));

    const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 20).map(el => ({
      text: el.innerText.trim(),
      href: el.href,
      selector: generateSelector(el)
    }));

    function generateSelector(el) {
      if (el.id) return `#${el.id}`;
      if (el.name) return `[name="${el.name}"]`;
      if (el.className) return `.${Array.from(el.classList).join('.')}`;
      return el.tagName.toLowerCase();
    }

    return {
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      visibleText: document.body?.innerText?.slice(0, 1000) || '',
      inputs,
      buttons,
      links,
      hasForm: document.querySelectorAll('form').length > 0,
      formCount: document.querySelectorAll('form').length
    };
  }, includeHTML);

  return {
    content: [
      {
        type: 'text',
        text: `📊 Contexto de la página:\n\n${JSON.stringify(context, null, 2)}`
      }
    ]
  };
}

async function handleWait(args) {
  ensureBrowser();
  const { milliseconds, selector } = args;

  if (selector) {
    await browserState.page.waitForSelector(selector, { timeout: 30000 });
    return {
      content: [
        {
          type: 'text',
          text: `✅ Elemento aparecido: ${selector}`
        }
      ]
    };
  } else if (milliseconds) {
    await browserState.page.waitForTimeout(milliseconds);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Esperado ${milliseconds}ms`
        }
      ]
    };
  }

  throw new Error('Debe especificar milliseconds o selector');
}

async function handleEvaluate(args) {
  ensureBrowser();
  const { script } = args;

  const result = await browserState.page.evaluate((scriptStr) => {
    return eval(scriptStr);
  }, script);

  return {
    content: [
      {
        type: 'text',
        text: `✅ Script ejecutado\nResultado: ${JSON.stringify(result, null, 2)}`
      }
    ]
  };
}

async function handleFindElements(args) {
  ensureBrowser();
  const { selector } = args;

  const elements = await browserState.page.evaluate((sel) => {
    const found = Array.from(document.querySelectorAll(sel));
    return found.slice(0, 10).map((el, idx) => ({
      index: idx,
      tag: el.tagName.toLowerCase(),
      text: el.innerText?.slice(0, 100) || '',
      id: el.id || '',
      className: el.className || '',
      visible: el.offsetParent !== null
    }));
  }, selector);

  return {
    content: [
      {
        type: 'text',
        text: `🔍 Encontrados ${elements.length} elementos para "${selector}":\n\n${JSON.stringify(elements, null, 2)}`
      }
    ]
  };
}

async function handleDialog(args) {
  ensureBrowser();
  const { accept = true, promptText } = args;

  // Configurar handler para el próximo diálogo
  browserState.page.once('dialog', async dialog => {
    if (accept) {
      await dialog.accept(promptText);
    } else {
      await dialog.dismiss();
    }
  });

  return {
    content: [
      {
        type: 'text',
        text: `✅ Handler de diálogo configurado (${accept ? 'aceptar' : 'rechazar'})`
      }
    ]
  };
}

// 🛡️ UTILIDADES
function ensureBrowser() {
  if (!browserState.page) {
    throw new Error('No hay navegador activo. Llama primero a browser_start');
  }
}

// 🚀 INICIAR SERVIDOR MCP
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('🔧 MCP Playwright Server iniciado');
  console.error('📡 Esperando conexiones via stdio...');
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});