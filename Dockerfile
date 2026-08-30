# ============================================
# iSketch Clásico - Dockerfile
# ======================================
# Uso: docker build -t isketch-server .
#      docker run -p 3000:3000 -e PORT=3000 isketch-server
# ============================================

FROM node:20-alpine

# Working directory
WORKDIR /app

# Copy package files first (better Docker layer caching)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY server.js ./
COPY public/ ./public/
COPY .env.example ./

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:$PORT/api/geoip', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the server
CMD ["node", "server.js"]