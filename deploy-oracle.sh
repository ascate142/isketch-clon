#!/bin/bash
# ============================================
# iSketch Clásico - Script de Despliegue a Oracle Cloud
# ============================================
# Uso: ./deploy-oracle.sh <ip-publica> <usuario>
# Ejemplo: ./deploy-oracle.sh 123.45.67.89 opc
# ============================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Error: Faltan parámetros${NC}"
    echo "Uso: $0 <ip-publica> <usuario>"
    echo "Ejemplo: $0 123.45.67.89 opc"
    exit 1
fi

IP="$1"
USER="$2"
APP_DIR="/home/$USER/isketch"

echo -e "${GREEN}🚀 Desplegando iSketch a Oracle Cloud...${NC}"
echo "IP: $IP"
echo "Usuario: $USER"

# Crear directorio en el servidor
echo -e "${YELLOW}📁 Creando directorio en el servidor...${NC}"
ssh "$USER@$IP" "mkdir -p $APP_DIR"

# Copiar archivos necesarios
echo -e "${YELLOW}📤 Subiendo archivos...${NC}"
scp Dockerfile docker-compose.yml server.js package.json package-lock.json .env.example "$USER@$IP:$APP_DIR/" 2>/dev/null || true

# Copiar carpeta public (excluyendo node_modules)
echo -e "${YELLOW}📂 Sincronizando carpeta public...${NC}"
rsync -avz --exclude='node_modules' public/ "$USER@$IP:$APP_DIR/public/"

# Instalar dependencias y desplegar
echo -e "${YELLOW}🐳 Iniciando contenedor Docker...${NC}"
ssh "$USER@$IP" << 'ENDSSH'
cd /home/opc/isketch

# Detener contenedor existente si hay
docker-compose down 2>/dev/null || true

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️ Por favor edita .env con tus valores antes de reiniciar"
fi

# Iniciar el contenedor
docker-compose up -d --build

# Mostrar logs
echo -e "\n${GREEN}✅ Despliegue completado!${NC}"
echo "Logs del contenedor:"
docker-compose logs --tail=20
ENDSSH

echo -e "${GREEN}✨ Despliegue finalizado!${NC}"
echo "Accede a tu servidor en: http://$IP:3000"