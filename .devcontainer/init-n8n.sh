#!/bin/bash
# Script para crear usuario admin y workflow de ejemplo en n8n
set -e

N8N_URL="http://localhost:5678"
ADMIN_EMAIL="admin@testsanalytics.local"
ADMIN_PASS="TestsAnalytics2025!"

echo "Esperando a que n8n esté listo..."

# Espera a que n8n esté listo
for i in {1..60}; do
  if curl -s "$N8N_URL/rest/login" >/dev/null 2>&1; then
    echo "n8n está respondiendo!"
    break
  fi
  sleep 3
done

echo "Creando usuario admin..."

# Crea usuario admin si no existe
curl -s -X POST "$N8N_URL/rest/owner/setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASS'","firstName":"Tests","lastName":"Analytics"}' || true

echo "Realizando login..."

# Login y obtiene cookie
COOKIE=$(curl -s -c - -X POST "$N8N_URL/rest/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASS'"}' | grep -o 'n8n_auth_token[^;]*')

echo "Creando workflow de ejemplo..."

# Crea workflow de ejemplo
curl -s -b "$COOKIE" -X POST "$N8N_URL/api/workflows" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tests Analytics Workflow",
    "active": false,
    "nodes": [{
      "parameters": {"functionCode": "return [{json: {mensaje: \"¡Workflow creado automáticamente!\", timestamp: new Date().toISOString()}}];"},
      "name": "Función de Prueba",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [450, 300]
    }],
    "connections": {}
  }'

echo "Setup completado: n8n disponible en http://localhost:5678"
echo "Usuario: $ADMIN_EMAIL"
echo "Contraseña: $ADMIN_PASS"
