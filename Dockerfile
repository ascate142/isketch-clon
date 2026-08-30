# ============================================
# iSketch Clásico - Dockerfile para Fly.io
# ============================================
# Uso: fly deploy
# ============================================

FROM node:20-alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Working directory
WORKDIR /app

# Copiar package files primero (mejor caché de capas Docker)
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --omit=dev && npm cache clean --force

# Copiar código fuente
COPY server.js ./
COPY public/ ./public/
COPY .env.example ./

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Exponer el puerto (Fly.io usa PORT=8080)
EXPOSE 8080

# Health check de Fly.io
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/api/geoip || exit 1

# Iniciar el servidor
CMD ["node", "server.js"]