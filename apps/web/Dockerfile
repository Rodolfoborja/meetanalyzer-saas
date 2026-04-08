# ==============================================
# MeetAnalyzer Web - React/Vite Production Build
# ==============================================

# Multi-stage build para optimizar tamaño
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Instalar dependencias
FROM base AS deps
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci --only=production && npm cache clean --force

# Builder stage
FROM base AS builder
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/web ./apps/web
COPY libs ./libs

# Instalar todas las dependencias (incluyendo dev)
RUN npm ci

# Build de la aplicación
RUN cd apps/web && npm run build

# Production stage - usar nginx para servir archivos estáticos
FROM nginx:alpine AS runner

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs reactuser

# Configuración de nginx
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Configuración personalizada de nginx para SPA
RUN echo 'server { \
    listen 3000; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
    \
    # Handle client-side routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Security headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
}' > /etc/nginx/conf.d/default.conf

# Configurar permisos
RUN chown -R reactuser:nodejs /usr/share/nginx/html
RUN chown -R reactuser:nodejs /var/cache/nginx

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Usar usuario no-root y iniciar nginx
USER reactuser
CMD ["nginx", "-g", "daemon off;"]