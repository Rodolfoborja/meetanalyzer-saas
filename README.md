# 🎙️ MeetAnalyzer SaaS

Plataforma SaaS multi-tenant para análisis inteligente de reuniones virtuales con transcripción automática, análisis de IA y métricas de participación.

## ✨ Características

- 🏢 **Multi-tenant** - Organizaciones aisladas con subdomains
- 🔐 **Google OAuth** - Autenticación segura
- 📝 **Transcripción** - Con identificación de hablantes (AssemblyAI)
- 🤖 **Análisis IA** - GPT-4, Claude, Gemini Pro
- 💳 **Billing** - Planes con Stripe
- 📊 **Métricas** - Participación y oratoria
- 📁 **Storage** - S3/MinIO para archivos
- 📧 **Email** - Notificaciones con Resend
- 🚀 **Jobs** - Background processing con BullMQ

## 🏗️ Arquitectura

```
meetanalyzer-saas/
├── apps/
│   ├── api/              # NestJS Backend (puerto 4000)
│   │   ├── src/
│   │   │   ├── auth/     # Autenticación OAuth
│   │   │   ├── meetings/ # Gestión de reuniones
│   │   │   ├── transcription/ # Transcripción IA
│   │   │   ├── analysis/ # Análisis de contenido
│   │   │   ├── billing/  # Stripe integration
│   │   │   └── storage/  # S3/MinIO files
│   │   └── Dockerfile
│   ├── web/              # React Dashboard (puerto 3000)
│   │   ├── src/
│   │   │   ├── pages/    # Páginas principales
│   │   │   ├── components/ # Componentes reutilizables
│   │   │   ├── stores/   # State management (Zustand)
│   │   │   └── lib/      # Utilidades
│   │   └── Dockerfile
│   └── landing/          # Astro Landing Page (TODO)
├── libs/
│   ├── shared/           # Types y schemas compartidos
│   ├── ui/               # Componentes UI base
│   └── api-client/       # Cliente API
├── prisma/               # Database schema
├── docker/               # Docker configurations
│   ├── README.md         # Docker documentation
│   └── dev.sh            # Development script
├── .github/workflows/    # CI/CD pipelines
│   ├── ci.yml           # Lint, test, build
│   └── deploy.yml       # Production deploy
├── docker-compose.yml    # Service orchestration
└── Makefile             # Development commands
```

## 🚀 Quick Start

### Opción 1: Docker (Recomendado)

```bash
# Clonar variables de entorno
cp .env.example .env

# Editar .env con tus credenciales

# Iniciar todos los servicios
make start
# o directamente: docker-compose up --build -d

# URLs disponibles:
# Web App: http://localhost:3000
# API: http://localhost:4000
# Redis: localhost:6379
```

### Opción 2: Desarrollo Nativo

#### Requisitos
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Configurar base de datos
npm run db:push

# Iniciar servicios en paralelo
npm run dev       # Ambos servicios
# o separados:
npm run dev:api   # Backend (puerto 4000)
npm run dev:web   # Frontend (puerto 5173)
```

### Comandos Disponibles

```bash
# Development
make setup        # Setup inicial del proyecto
make dev          # Desarrollo nativo
make start        # Docker containers
make stop         # Parar containers
make restart      # Reiniciar containers

# Database
make migrate      # Ejecutar migraciones
make studio       # Abrir Prisma Studio

# Debugging
make logs         # Ver todos los logs
make logs-api     # Logs solo del API
make status       # Estado de servicios
make shell-api    # Shell en container API

# Building
make build        # Build nativo
make docker-build # Build Docker images
```

## ⚙️ Configuración

### Variables de Entorno

Ver `.env.example` para la lista completa. Variables principales:

```env
# 🗄️ Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@localhost:5432/meetanalyzer

# 🔐 Authentication
JWT_SECRET=generate-with-openssl-rand-base64-32
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 🌐 URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# 🤖 AI Services
ASSEMBLYAI_API_KEY=your-assemblyai-key
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# 💳 Billing
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 📧 Email
RESEND_API_KEY=your-resend-key
EMAIL_FROM=MeetAnalyzer <noreply@yourdomain.com>

# 📁 Storage
S3_ENDPOINT=https://your-minio-endpoint.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=meetanalyzer
```

### Para Dokploy (Producción)

```env
# 🐋 Docker ports
API_PORT=4000
WEB_PORT=3000

# 🔴 Redis (interno en docker-compose)
REDIS_HOST=redis
REDIS_PORT=6379

# 🗄️ PostgreSQL (externo en Dokploy)
DATABASE_URL=postgresql://user:pass@dokploy-postgres:5432/meetanalyzer

# 📁 MinIO (externo en Dokploy)
S3_ENDPOINT=https://minio.yourdomain.com
```

## 📡 API Reference

### 🔐 Authentication
```http
GET /api/auth/google           # Iniciar OAuth flow
GET /api/auth/google/callback  # OAuth callback
GET /api/auth/me               # Usuario autenticado
POST /api/auth/logout          # Cerrar sesión
```

### 🏢 Organizations
```http
GET /api/organizations/current    # Organización actual
PATCH /api/organizations/current  # Actualizar organización
GET /api/organizations/members    # Listar miembros
POST /api/organizations/invite    # Invitar miembro
```

### 📝 Meetings
```http
GET /api/meetings                 # Listar reuniones
POST /api/meetings                # Crear reunión
GET /api/meetings/:id             # Obtener reunión
PATCH /api/meetings/:id           # Actualizar reunión
DELETE /api/meetings/:id          # Eliminar reunión
POST /api/meetings/:id/process    # Procesar transcripción
GET /api/meetings/:id/analysis    # Obtener análisis
```

### 💳 Billing
```http
GET /api/billing/subscription     # Suscripción actual
POST /api/billing/checkout        # Crear checkout session
POST /api/billing/portal          # Portal de cliente
GET /api/billing/usage            # Uso actual
```

### 📁 Storage
```http
POST /api/storage/upload          # Subir archivo
GET /api/storage/:id              # Descargar archivo
DELETE /api/storage/:id           # Eliminar archivo
```

## 💳 Planes de Suscripción

| Plan | Precio | Minutos/mes | Usuarios | Transcripción | Análisis IA |
|------|--------|-------------|----------|---------------|-------------|
| **Free** | $0 | 60 | 1 | ✅ Básica | ❌ |
| **Starter** | $19 | 300 | 5 | ✅ Avanzada | ✅ Básico |
| **Pro** | $49 | 1000 | 20 | ✅ Premium | ✅ Avanzado |
| **Enterprise** | Custom | Ilimitado | Ilimitado | ✅ Premium | ✅ Custom |

## 🛠️ Stack Tecnológico

### Backend (API)
- **NestJS** - Framework Node.js
- **Prisma** - ORM con PostgreSQL
- **BullMQ** - Job processing con Redis
- **Passport** - Autenticación OAuth
- **Stripe** - Procesamiento de pagos
- **AssemblyAI** - Transcripción de audio
- **OpenAI/Anthropic** - Análisis con IA
- **AWS S3/MinIO** - Storage de archivos
- **Resend** - Email transaccional

### Frontend (Web)
- **React 18** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Radix UI** - Componentes accesibles
- **Zustand** - State management
- **Framer Motion** - Animaciones
- **React Router** - Client-side routing

### DevOps & Deploy
- **Docker** - Containerización
- **GitHub Actions** - CI/CD
- **Dokploy** - Deployment platform
- **PostgreSQL** - Base de datos principal
- **Redis** - Cache y job queue
- **Nginx** - Web server (frontend)

## 🚀 Deployment

### Desarrollo Local

```bash
# Con Docker
make start

# Sin Docker
make setup-dev && npm run dev
```

### Producción en Dokploy

1. **Setup del servidor:**
```bash
# En tu VPS con Dokploy
mkdir -p /home/user/meetanalyzer-saas
cd /home/user/meetanalyzer-saas
```

2. **Configurar variables:**
```bash
# Copiar y editar .env
cp .env.example .env
nano .env  # Configurar para producción
```

3. **Deploy manual:**
```bash
# Pull de la última versión
git pull origin main
docker-compose pull
docker-compose up -d
```

4. **Deploy automático:**
   - Configurar secrets en GitHub:
     - `DOKPLOY_HOST`, `DOKPLOY_USER`, `DOKPLOY_SSH_KEY`
     - `FRONTEND_URL`, `BACKEND_URL`
   - Trigger manual del workflow `Deploy to Production`

### GitHub Actions Secrets

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `DOKPLOY_HOST` | IP del servidor | `123.45.67.89` |
| `DOKPLOY_USER` | Usuario SSH | `ubuntu` |
| `DOKPLOY_SSH_KEY` | Clave privada SSH | `-----BEGIN OPENSSH...` |
| `FRONTEND_URL` | URL del frontend | `https://meetanalyzer.com` |
| `BACKEND_URL` | URL del API | `https://api.meetanalyzer.com` |

## 🧪 Testing

```bash
# Ejecutar tests
make test            # Todos los tests
npm run test:api     # Solo API
npm run test:web     # Solo frontend

# Coverage
npm run test:coverage

# E2E tests (TODO)
npm run test:e2e
```

## 🐛 Troubleshooting

### Problemas Comunes

**Container no inicia:**
```bash
make logs           # Ver todos los logs
make logs-api       # Logs específicos del API
```

**Error de conexión a la DB:**
- Verificar `DATABASE_URL` en `.env`
- Comprobar que PostgreSQL esté ejecutándose
- Ejecutar migraciones: `make migrate`

**Error con Redis:**
```bash
make logs-redis     # Ver logs de Redis
make shell-api      # Verificar conectividad desde API
# En el shell: redis-cli -h redis ping
```

**Build failure:**
```bash
# Limpiar cache
docker system prune -f
make clean
make start
```

### Comandos de Debug

```bash
# Entrar a containers
make shell-api      # Shell en API container
make shell-web      # Shell en web container

# Verificar recursos
docker stats        # Uso de CPU/memoria

# Ver configuración
make env           # Info del entorno
docker-compose config  # Verificar compose file
```

## 📖 Documentación Adicional

- [Docker Setup](./docker/README.md) - Guía completa de Docker
- [API Docs](./apps/api/README.md) - Documentación del backend
- [Web Docs](./apps/web/README.md) - Documentación del frontend

## 🤝 Contribuir

1. Fork el repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Add nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.
