#!/bin/bash

# =================================================================
# Complete Testing Scripts for Keap-Supabase Sync System
# =================================================================
# Run these scripts to validate the entire system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =================================================================
# Test Environment Setup
# =================================================================
setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Check required environment variables
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "KEAP_CLIENT_ID"
        "KEAP_CLIENT_SECRET"
        "SYNC_WORKER_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_info "Environment variables validated ✓"
    
    # Check if services are running
    check_services
}

check_services() {
    log_info "Checking service availability..."
    
    # Check Supabase connection
    if curl -s "$SUPABASE_URL/rest/v1/" > /dev/null; then
        log_info "Supabase connection ✓"
    else
        log_error "Supabase connection failed"
        exit 1
    fi
    
    # Check Cloudflare Workers
    if [ -n "$SYNC_WORKER_URL" ]; then
        if curl -s "$SYNC_WORKER_URL/health" > /dev/null; then
            log_info "Sync Worker connection ✓"
        else
            log_warn "Sync Worker connection failed (may not be deployed yet)"
        fi
    fi
}

# =================================================================
# Database Testing
# =================================================================
test_database() {
    log_info "Testing database functions..."
    
    # Test database connection and functions
    cat << EOF > test_db_functions.sql
-- Test all sync-related database functions
SELECT 'Testing get_sync_statistics()' as test_name;
SELECT * FROM get_sync_statistics();

SELECT 'Testing get_sync_health_metrics()' as test_name;
SELECT * FROM get_sync_health_metrics();

SELECT 'Testing get_recent_sync_activities()' as test_name;
SELECT * FROM get_recent_sync_activities(10);

-- Test table structures
SELECT 'Testing sync_contacts table' as test_name;
SELECT COUNT(*) FROM sync_contacts;

SELECT 'Testing sync_orders table' as test_name;
SELECT COUNT(*) FROM sync_orders;

SELECT 'Testing sync_tags table' as test_name;
SELECT COUNT(*) FROM sync_tags;

SELECT 'Testing sync_status table' as test_name;
SELECT COUNT(*) FROM sync_status;

-- Test RLS policies
SELECT 'Testing RLS policies' as test_name;
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'sync_%';
EOF

    # Execute database tests (requires psql or supabase CLI)
    if command -v supabase &> /dev/null; then
        supabase db reset --linked
        psql "$DATABASE_URL" -f test_db_functions.sql
        log_info "Database function tests ✓"
    else
        log_warn "Supabase CLI not found, skipping database tests"
    fi
    
    rm -f test_db_functions.sql
}

# =================================================================
# API Testing
# =================================================================
test_api_endpoints() {
    log_info "Testing API endpoints..."
    
    local base_url="http://localhost:3000"
    
    # Test dashboard metrics endpoint
    test_endpoint() {
        local endpoint=$1
        local expected_status=${2:-200}
        
        log_info "Testing $endpoint"
        
        local response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$base_url$endpoint")
        
        if [ "$response" -eq "$expected_status" ]; then
            log_info "$endpoint ✓"
        else
            log_error "$endpoint returned status $response, expected $expected_status"
            cat /tmp/response.json
            return 1
        fi
    }
    
    # Test all API endpoints
    test_endpoint "/api/dashboard/metrics"
    test_endpoint "/api/dashboard/trends?days=7"
    test_endpoint "/api/dashboard/health"
    test_endpoint "/api/dashboard/activities"
    test_endpoint "/api/dashboard/conflicts"
    test_endpoint "/api/sync/status"
    
    # Test error handling
    test_endpoint "/api/dashboard/trends?days=invalid" 400
    
    log_info "API endpoint tests ✓"
}

# =================================================================
# Cloudflare Workers Testing
# =================================================================
test_cloudflare_workers() {
    log_info "Testing Cloudflare Workers..."
    
    # Change to worker directory and run tests
    for worker_dir in cloudflare_workers/*/; do
        if [ -d "$worker_dir" ]; then
            worker_name=$(basename "$worker_dir")
            log_info "Testing $worker_name worker..."
            
            cd "$worker_dir"
            
            # Install dependencies
            npm install
            
            # Run tests
            if npm run test; then
                log_info "$worker_name tests ✓"
            else
                log_error "$worker_name tests failed"
                return 1
            fi
            
            cd - > /dev/null
        fi
    done
}

# =================================================================
# Frontend Testing
# =================================================================
test_frontend() {
    log_info "Testing frontend..."
    
    cd frontend_nextjs
    
    # Install dependencies
    npm install
    
    # Run type checking
    if npm run type-check; then
        log_info "TypeScript compilation ✓"
    else
        log_error "TypeScript compilation failed"
        return 1
    fi
    
    # Run linting
    if npm run lint; then
        log_info "ESLint checks ✓"
    else
        log_error "ESLint checks failed"
        return 1
    fi
    
    # Build production version
    if npm run build; then
        log_info "Production build ✓"
    else
        log_error "Production build failed"
        return 1
    fi
    
    cd - > /dev/null
}

# =================================================================
# E2E Testing
# =================================================================
test_e2e() {
    log_info "Running E2E tests..."
    
    cd frontend_nextjs
    
    # Start development server in background
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to start
    sleep 10
    
    # Run Playwright tests
    if npx playwright test; then
        log_info "E2E tests ✓"
    else
        log_error "E2E tests failed"
        kill $DEV_PID
        return 1
    fi
    
    # Stop development server
    kill $DEV_PID
    
    cd - > /dev/null
}

# =================================================================
# Integration Testing
# =================================================================
test_integration() {
    log_info "Running integration tests..."
    
    # Test complete sync workflow
    test_sync_workflow() {
        log_info "Testing complete sync workflow..."
        
        # This would test:
        # 1. Trigger sync via API
        # 2. Verify data appears in database
        # 3. Check dashboard displays updated data
        # 4. Verify sync status tracking
        
        # For now, just test the API trigger
        local response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"keapAccountId":"test-account","syncType":"contacts"}' \
            "http://localhost:3000/api/sync/trigger")
        
        if echo "$response" | grep -q "success"; then
            log_info "Sync trigger ✓"
        else
            log_error "Sync trigger failed: $response"
            return 1
        fi
    }
    
    test_sync_workflow
}

# =================================================================
# Docker Testing
# =================================================================
test_docker_deployment() {
    log_info "Testing Docker deployment..."
    
    # Build and start containers
    docker-compose down -v
    
    if docker-compose up --build -d; then
        log_info "Docker containers started ✓"
    else
        log_error "Docker containers failed to start"
        return 1
    fi
    
    # Wait for services to be ready
    sleep 30
    
    # Test health endpoints
    if curl -s http://localhost:3000/api/dashboard/metrics > /dev/null; then
        log_info "Frontend container ✓"
    else
        log_error "Frontend container health check failed"
    fi
    
    # Show container status
    docker-compose ps
    
    # Cleanup
    docker-compose down
}

# =================================================================
# Performance Testing
# =================================================================
test_performance() {
    log_info "Running performance tests..."
    
    # Use Apache Bench to test API performance
    if command -v ab &> /dev/null; then
        log_info "Testing API performance with Apache Bench..."
        
        # Test dashboard metrics endpoint
        ab -n 100 -c 10 http://localhost:3000/api/dashboard/metrics
        
        log_info "Performance test completed ✓"
    else
        log_warn "Apache Bench not found, skipping performance tests"
    fi
}

# =================================================================
# Main Test Runner
# =================================================================
run_all_tests() {
    log_info "Starting comprehensive test suite..."
    
    # Setup
    setup_test_environment
    
    # Database tests
    test_database
    
    # Frontend tests
    test_frontend
    
    # Worker tests
    test_cloudflare_workers
    
    # API tests (requires running server)
    log_info "Starting development server for API tests..."
    cd frontend_nextjs
    npm run dev &
    DEV_PID=$!
    sleep 10
    cd - > /dev/null
    
    test_api_endpoints
    test_integration
    
    # E2E tests (will start its own server)
    kill $DEV_PID
    test_e2e
    
    # Docker tests
    test_docker_deployment
    
    # Performance tests (requires running server)
    cd frontend_nextjs
    npm run dev &
    DEV_PID=$!
    sleep 10
    cd - > /dev/null
    
    test_performance
    
    kill $DEV_PID
    
    log_info "All tests completed successfully! ✅"
}

# =================================================================
# Script Arguments
# =================================================================
case "${1:-all}" in
    "setup")
        setup_test_environment
        ;;
    "database" | "db")
        test_database
        ;;
    "api")
        test_api_endpoints
        ;;
    "workers")
        test_cloudflare_workers
        ;;
    "frontend")
        test_frontend
        ;;
    "e2e")
        test_e2e
        ;;
    "integration")
        test_integration
        ;;
    "docker")
        test_docker_deployment
        ;;
    "performance")
        test_performance
        ;;
    "all")
        run_all_tests
        ;;
    *)
        echo "Usage: $0 {setup|database|api|workers|frontend|e2e|integration|docker|performance|all}"
        echo ""
        echo "Available test suites:"
        echo "  setup       - Setup test environment and check prerequisites"
        echo "  database    - Test database functions and schema"
        echo "  api         - Test API endpoints"
        echo "  workers     - Test Cloudflare Workers"
        echo "  frontend    - Test frontend build and linting"
        echo "  e2e         - Run Playwright end-to-end tests"
        echo "  integration - Test complete workflows"
        echo "  docker      - Test Docker deployment"
        echo "  performance - Run performance tests"
        echo "  all         - Run all tests (default)"
        exit 1
        ;;
esac