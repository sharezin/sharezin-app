#!/bin/bash
# Script para controlar builds na Vercel (usado como ignoreCommand)
# Apenas a branch master/main fará build, outras branches serão ignoradas
#
# Lógica do ignoreCommand:
# - exit 0 = IGNORAR build (não fazer build)
# - exit 1 = PROSSEGUIR com build (fazer build)

BRANCH="${VERCEL_GIT_COMMIT_REF:-unknown}"

echo "🔍 Verificando branch: $BRANCH"

# Verificar se é a branch principal (master ou main)
if [[ "$BRANCH" == "master" ]] || [[ "$BRANCH" == "main" ]]; then
  echo "✅ - Build autorizado para branch: $BRANCH"
  exit 1;  # Não ignorar = fazer build
else
  echo "🛑 - Build ignorado para branch: $BRANCH"
  echo "ℹ️  - Apenas as branches 'master' ou 'main' podem fazer build"
  exit 0;  # Ignorar = não fazer build
fi
