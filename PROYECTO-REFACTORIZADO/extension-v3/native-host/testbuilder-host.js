#!/usr/bin/env node

/**
 * Native Messaging Host para TestBuilder
 * Permite a la extensión ejecutar comandos del sistema
 */

const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// Native messaging usa stdin/stdout para comunicación
process.stdin.on('readable', () => {
  let input = [];
  let chunk;

  // Leer el mensaje
  while ((chunk = process.stdin.read()) !== null) {
    input.push(chunk);
  }

  if (input.length === 0) return;

  const buffer = Buffer.concat(input);
  
  // Los primeros 4 bytes son el tamaño del mensaje
  const messageLength = buffer.readUInt32LE(0);
  const messageString = buffer.toString('utf8', 4, 4 + messageLength);
  
  try {
    const message = JSON.parse(messageString);
    handleMessage(message);
  } catch (error) {
    sendResponse({ error: error.message });
  }
});

function handleMessage(message) {
  const { command, args } = message;

  switch (command) {
    case 'start_backend':
      startBackend();
      break;
    
    case 'check_backend':
      checkBackend();
      break;
    
    default:
      sendResponse({ error: 'Unknown command' });
  }
}

function startBackend() {
  const backendPath = path.join(__dirname, '..', 'gemini-mcp-server');
  const isWindows = process.platform === 'win32';
  
  try {
    const child = spawn(
      isWindows ? 'cmd' : 'sh',
      isWindows ? ['/c', 'npm', 'start'] : ['-c', 'npm start'],
      {
        cwd: backendPath,
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      }
    );

    child.unref(); // Permitir que el proceso continúe después de que el host termine

    sendResponse({ 
      success: true, 
      message: 'Backend starting',
      pid: child.pid 
    });

  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

function checkBackend() {
  const http = require('http');
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/health',
    method: 'GET',
    timeout: 2000
  };

  const req = http.request(options, (res) => {
    sendResponse({ 
      success: true, 
      online: res.statusCode === 200 
    });
  });

  req.on('error', () => {
    sendResponse({ 
      success: true, 
      online: false 
    });
  });

  req.on('timeout', () => {
    req.destroy();
    sendResponse({ 
      success: true, 
      online: false 
    });
  });

  req.end();
}

function sendResponse(response) {
  const message = JSON.stringify(response);
  const buffer = Buffer.from(message);
  
  // Escribir tamaño (4 bytes) + mensaje
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  
  process.stdout.write(header);
  process.stdout.write(buffer);
}

// Manejar cierre limpio
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
