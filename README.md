# 🎙️ MeetAnalyzer SaaS

Plataforma SaaS multi-tenant para análisis inteligente de reuniones virtuales.

## ✨ Características

- 🏢 **Multi-tenant** - Organizaciones aisladas con subdomains
- 🔐 **Google OAuth** - Autenticación segura
- 📝 **Transcripción** - Con identificación de hablantes
- 🤖 **Análisis IA** - GPT-4, Claude, Gemini
- 💳 **Billing** - Planes con Stripe
- 📊 **Métricas** - Participación y oratoria

## 📁 Estructura

```
meetanalyzer-saas/
├── apps/
│   ├── api/          # NestJS Backend
│   ├── web/          # React Dashboard
│   └── landing/      # Astro Landing (TODO)
├── libs/
│   ├── shared/       # Types compartidos
│   └── ui/           # Componentes UI
├── prisma/           # Schema DB
└── docker/           # Docker configs
```

## 🚀 Quick Start

### Requisitos
- Node.js 20+
- PostgreSQL 15+
- Redis

### Desarrollo

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Base de datos
cd apps/api && npm run db:push

# Iniciar backend (puerto 4000)
npm run dev:api

# Iniciar frontend (puerto 5173)
npm run dev:web
```

### Variables de Entorno

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/meetanalyzer

# Auth
JWT_SECRET=your-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:5173

# Services
ASSEMBLYAI_API_KEY=your-key
STRIPE_SECRET_KEY=your-key
RESEND_API_KEY=your-key
```

## 📡 API

### Auth
- `GET /api/auth/google` - Iniciar OAuth
- `GET /api/auth/google/callback` - Callback
- `GET /api/auth/me` - Usuario actual

### Organizations
- `GET /api/organizations/current` - Org actual
- `PATCH /api/organizations/current` - Actualizar

### Meetings
- `GET /api/meetings` - Listar
- `POST /api/meetings` - Crear
- `POST /api/meetings/:id/process` - Procesar

## 💳 Planes

| Plan | Precio | Minutos | Usuarios |
|------|--------|---------|----------|
| Free | $0 | 60/mes | 1 |
| Starter | $19/mes | 300/mes | 5 |
| Pro | $49/mes | 1000/mes | 20 |
| Enterprise | Custom | Ilimitado | Ilimitado |

## 🐳 Docker

```bash
docker-compose up -d
```

## 📝 Licencia

MIT
