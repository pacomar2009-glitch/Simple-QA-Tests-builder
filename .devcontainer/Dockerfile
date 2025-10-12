FROM node:22-bullseye

# Instala n8n globalmente
RUN npm install -g n8n@latest

# Crea carpeta de datos persistente
RUN mkdir -p /workspace/n8n-data

WORKDIR /workspace

# Expone el puerto de n8n
EXPOSE 5678

CMD ["n8n", "start", "--tunnel"]
