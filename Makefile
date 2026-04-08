# ==============================================
# MeetAnalyzer SaaS - Development Makefile
# ==============================================

.PHONY: help install dev build start stop restart logs status clean shell migrate studio docker-build docker-push

# Default target
help: ## Show this help message
	@echo "MeetAnalyzer SaaS - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ==============================================
# Development Commands
# ==============================================

install: ## Install dependencies for all workspaces
	npm ci

dev: ## Start development mode (without Docker)
	npm run dev

build: ## Build all applications
	npm run build

test: ## Run tests for all applications
	npm run test

lint: ## Run linting for all applications
	npm run lint

# ==============================================
# Docker Commands
# ==============================================

start: ## Start all services with Docker
	./docker/dev.sh start

stop: ## Stop all Docker services
	./docker/dev.sh stop

restart: ## Restart all Docker services
	./docker/dev.sh restart

logs: ## Show logs from all services
	./docker/dev.sh logs

status: ## Show status of Docker services
	./docker/dev.sh status

clean: ## Clean up Docker containers and images
	./docker/dev.sh clean

# ==============================================
# Service-specific Commands
# ==============================================

logs-api: ## Show API logs
	./docker/dev.sh logs api

logs-web: ## Show web logs
	./docker/dev.sh logs web

logs-redis: ## Show Redis logs
	./docker/dev.sh logs redis

shell-api: ## Open shell in API container
	./docker/dev.sh shell api

shell-web: ## Open shell in web container
	./docker/dev.sh shell web

rebuild-api: ## Rebuild API container
	./docker/dev.sh rebuild api

rebuild-web: ## Rebuild web container
	./docker/dev.sh rebuild web

# ==============================================
# Database Commands
# ==============================================

migrate: ## Run database migrations
	./docker/dev.sh migrate

studio: ## Open Prisma Studio
	./docker/dev.sh studio

db-push: ## Push Prisma schema to database
	npm run db:push

db-reset: ## Reset database (⚠️  destructive)
	npm run db:migrate reset

# ==============================================
# Production Build Commands
# ==============================================

docker-build: ## Build Docker images for production
	docker build -t meetanalyzer-api -f apps/api/Dockerfile .
	docker build -t meetanalyzer-web -f apps/web/Dockerfile .

docker-push: ## Push Docker images to registry (requires login)
	docker tag meetanalyzer-api ghcr.io/username/meetanalyzer-api:latest
	docker tag meetanalyzer-web ghcr.io/username/meetanalyzer-web:latest
	docker push ghcr.io/username/meetanalyzer-api:latest
	docker push ghcr.io/username/meetanalyzer-web:latest

# ==============================================
# Setup Commands
# ==============================================

setup: ## Initial project setup
	@echo "Setting up MeetAnalyzer SaaS..."
	npm ci
	cp .env.example .env
	@echo "✅ Setup complete!"
	@echo "🔧 Please configure your .env file"
	@echo "🚀 Run 'make start' to start the application"

setup-dev: ## Setup for development (native)
	@echo "Setting up development environment..."
	npm ci
	cp .env.example .env
	@echo "✅ Development setup complete!"
	@echo "🔧 Please configure your .env file"
	@echo "🚀 Run 'make dev' to start development mode"

# ==============================================
# CI/CD Commands
# ==============================================

ci: ## Run CI pipeline locally
	npm run lint
	npm run build
	npm run test

check: ## Run all checks (lint, build, test)
	make lint
	make build
	make test

# ==============================================
# Utility Commands
# ==============================================

env: ## Show environment info
	@echo "Node version: $(shell node --version)"
	@echo "NPM version: $(shell npm --version)"
	@echo "Docker version: $(shell docker --version)"
	@echo "Docker Compose version: $(shell docker-compose --version || docker compose version)"

update: ## Update all dependencies
	npm update --workspaces

audit: ## Audit dependencies for security issues
	npm audit

fix: ## Fix dependency vulnerabilities
	npm audit fix