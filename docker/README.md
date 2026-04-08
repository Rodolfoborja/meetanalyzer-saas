# 🐋 Docker Configuration - MeetAnalyzer SaaS

Este directorio contiene la configuración Docker para MeetAnalyzer SaaS, optimizada para ser usada con Dokploy.

## 📁 Estructura

```
├── apps/
│   ├── api/Dockerfile          # NestJS API container
│   └── web/Dockerfile          # React/Vite web container
├── docker-compose.yml          # Orquestación de servicios
└── docker/
    └── README.md               # Esta documentación
```

## 🚀 Quick Start

### Desarrollo Local

```bash
# 1. Clonar variables de entorno
cp .env.example .env

# 2. Configurar variables para desarrollo local
# Editar .env y cambiar URLs a localhost

# 3. Construir y ejecutar
docker-compose up --build -d

# 4. Verificar servicios
docker-compose ps
docker-compose logs -f
```

### URLs de desarrollo:
- **Web App**: http://localhost:3000
- **API**: http://localhost:4000
- **Redis**: localhost:6379

## 🏗️ Arquitectura

### Servicios Incluidos

- **`api`**: Backend NestJS (Puerto 4000)
- **`web`**: Frontend React/Vite (Puerto 3000) 
- **`redis`**: Cache y queue jobs (Puerto 6379)

### Servicios Externos (Dokploy)

- **PostgreSQL**: Base de datos principal
- **MinIO**: Almacenamiento de archivos

## 📋 Variables de Entorno

### Requeridas para Docker

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `API_PORT` | Puerto del API | `4000` |
| `WEB_PORT` | Puerto del frontend | `3000` |
| `REDIS_PORT` | Puerto de Redis | `6379` |
| `DATABASE_URL` | URL de PostgreSQL | `postgresql://user:pass@host:5432/db` |

### Para Producción (Dokploy)

```bash
# URLs de producción
FRONTEND_URL=https://meetanalyzer.com
BACKEND_URL=https://api.meetanalyzer.com

# Database externo
DATABASE_URL=postgresql://user:pass@dokploy-postgres:5432/meetanalyzer

# Redis interno
REDIS_HOST=redis
REDIS_PORT=6379

# Storage externo
S3_ENDPOINT=https://minio.yourdomain.com
```

## 🔧 Comandos Útiles

### Gestión de Containers

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f api

# Reconstruir un servicio
docker-compose up --build api

# Parar todos los servicios
docker-compose down

# Limpiar volúmenes (⚠️ elimina datos)
docker-compose down -v
```

### Debugging

```bash
# Entrar a un container
docker-compose exec api sh
docker-compose exec web sh

# Ver estadísticas de recursos
docker stats

# Ver procesos en containers
docker-compose top
```

### Gestión de Imágenes

```bash
# Limpiar imágenes no usadas
docker image prune -f

# Ver tamaño de imágenes
docker images

# Eliminar todo (⚠️ cuidado)
docker system prune -a
```

## 📊 Monitoreo

### Health Checks

Los containers incluyen health checks automáticos:

```bash
# Ver estado de salud
docker-compose ps

# Logs de health check
docker inspect --format='{{.State.Health.Status}}' meetanalyzer-api
```

### Logs

```bash
# Ver todos los logs
docker-compose logs

# Filtrar por servicio y nivel
docker-compose logs api | grep ERROR
```

## 🚢 Deploy en Dokploy

### 1. Preparar Servidor

```bash
# En el servidor Dokploy
mkdir -p /home/user/meetanalyzer-saas
cd /home/user/meetanalyzer-saas
```

### 2. Configurar Variables

```bash
# Copiar y configurar .env
cp .env.example .env
nano .env  # Configurar para producción
```

### 3. Deploy Manual

```bash
# Pull de imágenes
docker-compose pull

# Deploy
docker-compose up -d

# Verificar
docker-compose ps
```

### 4. Deploy Automático (GitHub Actions)

El workflow `.github/workflows/deploy.yml` automatiza el deploy cuando se ejecuta manualmente desde GitHub.

#### Secrets requeridos:

| Secret | Descripción |
|--------|-------------|
| `DOKPLOY_HOST` | IP del servidor |
| `DOKPLOY_USER` | Usuario SSH |
| `DOKPLOY_SSH_KEY` | Clave privada SSH |
| `DOKPLOY_PORT` | Puerto SSH (default: 22) |
| `FRONTEND_URL` | URL del frontend |
| `BACKEND_URL` | URL del API |

## 🔒 Seguridad

### Buenas Prácticas

- ✅ Multi-stage builds para optimizar tamaño
- ✅ Usuarios no-root en containers
- ✅ Health checks configurados
- ✅ Secrets via variables de entorno
- ✅ Redes internas para comunicación entre servicios
- ✅ Volúmenes persistentes para datos

### Actualizaciones de Seguridad

```bash
# Actualizar imágenes base
docker-compose pull
docker-compose up -d --force-recreate

# Escanear vulnerabilidades (requiere herramientas adicionales)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image meetanalyzer-api:latest
```

## 🐛 Troubleshooting

### Problemas Comunes

**Container no inicia:**
```bash
docker-compose logs <service_name>
```

**Database connection error:**
- Verificar `DATABASE_URL` en `.env`
- Confirmar que PostgreSQL está ejecutándose
- Comprobar conectividad de red

**Redis connection error:**
- Verificar que Redis está ejecutándose: `docker-compose logs redis`
- Comprobar variables `REDIS_HOST` y `REDIS_PORT`

**Build failure:**
```bash
# Limpiar cache de build
docker builder prune

# Build sin cache
docker-compose build --no-cache
```

## 📖 Referencias

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dokploy Documentation](https://dokploy.com/docs)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/dockerfile)
- [Vite Docker Guide](https://vitejs.dev/guide/build.html#docker)