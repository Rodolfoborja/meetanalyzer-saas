# ==============================================
# Romelly AI API - NestJS Production Build
# ==============================================

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat openssl

# Copiar archivos de dependencias
COPY package.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm install

# Generar Prisma Client
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# ==============================================
# Production stage
# ==============================================
FROM node:20-alpine AS runner
WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache libc6-compat openssl

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copiar dependencias de producción
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Regenerar Prisma Client para el runtime
RUN npx prisma generate

# Configurar permisos
RUN chown -R nestjs:nodejs /app

# Cambiar a usuario no-root
USER nestjs

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
