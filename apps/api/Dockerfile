# ==============================================
# MeetAnalyzer API - NestJS Production Build
# ==============================================

# Multi-stage build para optimizar tamaño
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Instalar dependencias
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma/schema.prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

# Builder stage
FROM base AS builder
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma/schema.prisma ./prisma/
COPY apps/api ./apps/api
COPY libs ./libs

# Instalar todas las dependencias (incluyendo dev)
RUN npm ci

# Generar Prisma Client
RUN cd apps/api && npm run db:generate

# Build de la aplicación
RUN cd apps/api && npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copiar prisma schema para client
COPY --chown=nestjs:nodejs prisma ./prisma

# Copiar build output
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json

# Cambiar a usuario no-root
USER nestjs

# Configurar variables de entorno
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando para iniciar la aplicación
CMD ["node", "apps/api/dist/main.js"]