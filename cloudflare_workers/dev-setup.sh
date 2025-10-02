#!/bin/bash

# Development Setup Script for Cloudflare Workers
# This script sets up local development environment and testing

set -e

echo "🔧 Setting up development environment for Cloudflare Workers..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to install dependencies for a worker
install_worker_deps() {
    local worker_dir=$1
    local worker_name=$2
    
    print_status "Installing dependencies for $worker_name"
    cd "$worker_dir"
    
    if [ ! -f "package.json" ]; then
        print_error "No package.json found in $worker_dir"
        return 1
    fi
    
    npm install
    print_success "Dependencies installed for $worker_name"
    cd - > /dev/null
}

# Function to start development server for a worker
start_dev_server() {
    local worker_dir=$1
    local worker_name=$2
    local port=${3:-8787}
    
    print_status "Starting development server for $worker_name on port $port"
    cd "$worker_dir"
    
    # Check if wrangler.toml exists
    if [ ! -f "wrangler.toml" ]; then
        print_error "No wrangler.toml found in $worker_dir"
        return 1
    fi
    
    # Start development server in background
    wrangler dev --port $port --local &
    DEV_PID=$!
    
    echo "$DEV_PID" > "../.$worker_name.dev.pid"
    print_success "Development server started for $worker_name (PID: $DEV_PID)"
    cd - > /dev/null
}

# Function to run tests for a worker
run_worker_tests() {
    local worker_dir=$1
    local worker_name=$2
    
    print_status "Running tests for $worker_name"
    cd "$worker_dir"
    
    if ! npm run test 2>/dev/null; then
        print_warning "No tests found or tests failed for $worker_name"
    else
        print_success "Tests passed for $worker_name"
    fi
    
    cd - > /dev/null
}

# Function to stop development servers
stop_dev_servers() {
    print_status "Stopping development servers..."
    
    for pidfile in .*.dev.pid; do
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile")
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                print_success "Stopped development server (PID: $pid)"
            fi
            rm "$pidfile"
        fi
    done
}

# Function to validate environment setup
validate_environment() {
    print_status "Validating development environment..."
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler CLI is not installed. Install with: npm install -g wrangler"
        return 1
    fi
    
    # Check if user is logged in
    if ! wrangler whoami &> /dev/null; then
        print_warning "Not logged in to Cloudflare. Run 'wrangler login' before deploying."
    fi
    
    # Check for .env file
    if [ ! -f ".env" ]; then
        print_warning "No .env file found. Copy .env.example to .env and configure your values."
    fi
    
    print_success "Environment validation complete"
}

# Function to create development KV namespaces
create_dev_resources() {
    print_status "Creating development resources..."
    
    # Check if already logged in
    if ! wrangler whoami &> /dev/null; then
        print_error "Please login to Cloudflare first: wrangler login"
        return 1
    fi
    
    # Create preview KV namespaces for development
    print_status "Creating development KV namespace..."
    wrangler kv:namespace create "sync-cache-dev" --preview false
    
    print_success "Development resources created"
}

# Main development setup function
setup_development() {
    echo ""
    print_status "Starting development environment setup..."
    echo ""
    
    # Validate environment
    validate_environment
    
    # Install dependencies for all workers
    install_worker_deps "sync-coordinator" "sync-coordinator"
    install_worker_deps "sync-worker" "sync-worker"  
    install_worker_deps "webhook-handler" "webhook-handler"
    
    echo ""
    print_success "Development environment setup complete!"
    echo ""
    echo "Available commands:"
    echo "  ./dev-setup.sh start-all     - Start all development servers"
    echo "  ./dev-setup.sh test-all      - Run tests for all workers"
    echo "  ./dev-setup.sh stop-all      - Stop all development servers"
    echo "  ./dev-setup.sh create-dev    - Create development resources"
    echo ""
}

# Handle command line arguments
case "${1:-setup}" in
    "setup")
        setup_development
        ;;
    "start-all")
        print_status "Starting all development servers..."
        start_dev_server "sync-coordinator" "sync-coordinator" 8787
        sleep 2
        start_dev_server "sync-worker" "sync-worker" 8788
        sleep 2
        start_dev_server "webhook-handler" "webhook-handler" 8789
        
        echo ""
        print_success "All development servers started!"
        echo "  🔄 Sync Coordinator: http://localhost:8787"
        echo "  ⚡ Sync Worker: http://localhost:8788"
        echo "  🪝 Webhook Handler: http://localhost:8789"
        echo ""
        echo "To stop servers: ./dev-setup.sh stop-all"
        ;;
    "test-all")
        print_status "Running tests for all workers..."
        run_worker_tests "sync-coordinator" "sync-coordinator"
        run_worker_tests "sync-worker" "sync-worker"
        run_worker_tests "webhook-handler" "webhook-handler"
        ;;
    "stop-all")
        stop_dev_servers
        ;;
    "create-dev")
        create_dev_resources
        ;;
    "clean")
        print_status "Cleaning development environment..."
        stop_dev_servers
        rm -rf sync-coordinator/node_modules
        rm -rf sync-worker/node_modules
        rm -rf webhook-handler/node_modules
        print_success "Development environment cleaned"
        ;;
    *)
        echo "Usage: $0 {setup|start-all|test-all|stop-all|create-dev|clean}"
        echo ""
        echo "Commands:"
        echo "  setup     - Install dependencies and validate environment (default)"
        echo "  start-all - Start development servers for all workers"
        echo "  test-all  - Run tests for all workers"
        echo "  stop-all  - Stop all development servers"
        echo "  create-dev- Create development KV namespaces"
        echo "  clean     - Remove node_modules and stop servers"
        exit 1
        ;;
esac