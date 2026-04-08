#!/bin/bash

# ==============================================
# MeetAnalyzer SaaS - Development Script
# ==============================================
# Script para facilitar el desarrollo local con Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if docker-compose is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Use 'docker compose' if available, otherwise 'docker-compose'
    if command -v docker compose &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi
}

# Setup environment file
setup_env() {
    if [ ! -f .env ]; then
        log_info "Creating .env file from .env.example..."
        cp .env.example .env
        log_success ".env file created"
        log_warning "Please configure your environment variables in .env"
    else
        log_info ".env file already exists"
    fi
}

# Function to start services
start() {
    log_info "Starting MeetAnalyzer services..."
    
    setup_env
    
    log_info "Building and starting containers..."
    $DOCKER_COMPOSE up --build -d
    
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    if $DOCKER_COMPOSE ps | grep -q "Up"; then
        log_success "Services started successfully!"
        log_info "Web App: http://localhost:3000"
        log_info "API: http://localhost:4000"
        log_info "Redis: localhost:6379"
    else
        log_error "Some services failed to start"
        $DOCKER_COMPOSE logs
        exit 1
    fi
}

# Function to stop services
stop() {
    log_info "Stopping MeetAnalyzer services..."
    $DOCKER_COMPOSE down
    log_success "Services stopped"
}

# Function to restart services
restart() {
    log_info "Restarting MeetAnalyzer services..."
    stop
    start
}

# Function to show logs
logs() {
    if [ -n "$2" ]; then
        log_info "Showing logs for service: $2"
        $DOCKER_COMPOSE logs -f "$2"
    else
        log_info "Showing logs for all services"
        $DOCKER_COMPOSE logs -f
    fi
}

# Function to show status
status() {
    log_info "Service status:"
    $DOCKER_COMPOSE ps
    
    echo ""
    log_info "Container stats:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | head -4
}

# Function to clean up
clean() {
    log_warning "This will remove all containers, volumes, and images"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up..."
        $DOCKER_COMPOSE down -v --remove-orphans
        docker system prune -f
        log_success "Cleanup completed"
    else
        log_info "Cleanup cancelled"
    fi
}

# Function to rebuild specific service
rebuild() {
    if [ -n "$2" ]; then
        log_info "Rebuilding service: $2"
        $DOCKER_COMPOSE up --build -d "$2"
        log_success "Service $2 rebuilt"
    else
        log_error "Please specify a service: api, web, or redis"
        exit 1
    fi
}

# Function to enter container shell
shell() {
    if [ -n "$2" ]; then
        log_info "Opening shell in service: $2"
        $DOCKER_COMPOSE exec "$2" sh
    else
        log_error "Please specify a service: api, web, or redis"
        exit 1
    fi
}

# Function to run database migrations
migrate() {
    log_info "Running database migrations..."
    $DOCKER_COMPOSE exec api npm run db:migrate
    log_success "Migrations completed"
}

# Function to open Prisma Studio
studio() {
    log_info "Opening Prisma Studio..."
    $DOCKER_COMPOSE exec api npm run db:studio
}

# Function to show help
help() {
    echo "MeetAnalyzer SaaS - Development Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start              Start all services"
    echo "  stop               Stop all services"
    echo "  restart            Restart all services"
    echo "  logs [service]     Show logs (all or specific service)"
    echo "  status             Show service status and stats"
    echo "  clean              Clean up containers, volumes, and images"
    echo "  rebuild [service]  Rebuild specific service"
    echo "  shell [service]    Open shell in service container"
    echo "  migrate            Run database migrations"
    echo "  studio             Open Prisma Studio"
    echo "  help               Show this help message"
    echo ""
    echo "Services: api, web, redis"
    echo ""
    echo "Examples:"
    echo "  $0 start           # Start all services"
    echo "  $0 logs api        # Show API logs"
    echo "  $0 rebuild web     # Rebuild web service"
    echo "  $0 shell api       # Open shell in API container"
}

# Main script logic
main() {
    check_docker
    
    case "${1:-help}" in
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        logs)
            logs "$@"
            ;;
        status)
            status
            ;;
        clean)
            clean
            ;;
        rebuild)
            rebuild "$@"
            ;;
        shell)
            shell "$@"
            ;;
        migrate)
            migrate
            ;;
        studio)
            studio
            ;;
        help|--help|-h)
            help
            ;;
        *)
            log_error "Unknown command: $1"
            help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"