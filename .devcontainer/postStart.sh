#!/bin/bash
# Script para configurar n8n tras iniciar el devcontainer
set -e

# Crear directorio de datos si no existe
mkdir -p /workspace/n8n-data

# Variables de entorno para persistencia y seguridad
export N8N_USER_FOLDER="/workspace/n8n-data"
export DB_TYPE="sqlite"
export DB_SQLITE_DATABASE="/workspace/n8n-data/database.sqlite"
export N8N_PORT="5678"
export N8N_ENCRYPTION_KEY="TestsAnalytics2025SecureKey123456789"
export GEMINI_API_KEY="AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24"

# Inicia n8n en segundo plano
nohup n8n start > /workspace/n8n-data/n8n.log 2>&1 &

# Espera y ejecuta la inicialización automática de usuario y workflow
sleep 15
/workspace/.devcontainer/init-n8n.sh
