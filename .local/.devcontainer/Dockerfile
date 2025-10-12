FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Create necessary directories
RUN mkdir -p runs artifacts logs

# Set permissions
RUN chown -R node:node /workspace

USER node