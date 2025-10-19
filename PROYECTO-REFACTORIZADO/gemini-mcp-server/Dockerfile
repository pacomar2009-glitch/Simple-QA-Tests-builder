# 🎭 Dockerfile para gemini-mcp-playwright-runner
# Microservicio que ejecuta Playwright en modo HEAD (visible) con integración Gemini MCP

FROM node:20-bullseye

# Actualizar repositorios y instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    # Dependencias gráficas para GUI
    xvfb \
    x11vnc \
    fluxbox \
    wmctrl \
    dbus-x11 \
    xauth \
    # Librerías necesarias para Chromium
    libnss3 \
    libxss1 \
    libasound2 \
    libxrandr2 \
    libatk1.0-0 \
    libgtk-3-0 \
    libdrm2 \
    libgbm1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    # Herramientas adicionales
    wget \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de Node.js
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm install

# Instalar navegadores de Playwright (incluido Chromium)
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Verificar instalación de MCP
RUN node -e "console.log('MCP SDK version:', require('@modelcontextprotocol/sdk/package.json').version)"
RUN node -e "console.log('Playwright MCP version:', require('@playwright/mcp/package.json').version)"

# Copiar código fuente
COPY . .

# Crear directorio para X11 socket
RUN mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix

# Variables de entorno para GUI
ENV DISPLAY=:0
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production

# Script de inicio que prepara X11 y lanza la aplicación
RUN echo '#!/bin/bash\n\
# Configurar X11 forwarding\n\
if [ ! -z "$DISPLAY" ]; then\n\
    echo "🖥️  X11 Display configurado en: $DISPLAY"\n\
else\n\
    echo "⚠️  DISPLAY no configurado, usando :0"\n\
    export DISPLAY=:0\n\
fi\n\
\n\
# Verificar conexión X11\n\
if xhost > /dev/null 2>&1; then\n\
    echo "✅ Conexión X11 disponible"\n\
else\n\
    echo "⚠️  Conexión X11 no disponible, continuando..."\n\
fi\n\
\n\
# Lanzar aplicación\n\
echo "🚀 Iniciando gemini-mcp-playwright-runner..."\n\
exec node run.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Exponer puerto de la API
EXPOSE 4000

# Comando de inicio
CMD ["/app/start.sh"]