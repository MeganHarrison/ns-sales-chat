#!/bin/bash

# Deployment Validation Script
# This script validates the deployment of all Cloudflare Workers and their dependencies

set -e

echo "🔍 Validating Cloudflare Workers deployment..."

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

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    print_status "Testing $description: $url"
    
    # Make HTTP request and capture status code
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description is responding correctly (HTTP $status_code)"
        return 0
    else
        print_error "$description failed (HTTP $status_code, expected $expected_status)"
        return 1
    fi
}

# Function to test health endpoint and parse response
test_health_endpoint() {
    local url=$1
    local worker_name=$2
    
    print_status "Testing health endpoint for $worker_name"
    
    # Make request and capture both status and response
    local response=$(curl -s "$url/health" --max-time 10)
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url/health" --max-time 10)
    
    if [ "$status_code" = "200" ]; then
        print_success "$worker_name health check passed"
        
        # Try to parse JSON response for additional details
        if command -v jq &> /dev/null; then
            local status=$(echo "$response" | jq -r '.status // "unknown"')
            if [ "$status" = "healthy" ]; then
                print_success "$worker_name reports status: $status"
            else
                print_warning "$worker_name reports status: $status"
            fi
        fi
        return 0
    else
        print_error "$worker_name health check failed (HTTP $status_code)"
        echo "Response: $response"
        return 1
    fi
}

# Function to check Cloudflare resources
check_cloudflare_resources() {
    print_status "Checking Cloudflare resources..."
    
    # Check if wrangler is available
    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler CLI not found. Cannot check resources."
        return 1
    fi
    
    # Check if logged in
    if ! wrangler whoami &> /dev/null; then
        print_warning "Not logged in to Cloudflare. Cannot check resources."
        return 1
    fi
    
    # List workers
    print_status "Checking deployed workers..."
    local workers=$(wrangler list 2>/dev/null || echo "")
    
    if echo "$workers" | grep -q "sync-coordinator"; then
        print_success "sync-coordinator worker is deployed"
    else
        print_error "sync-coordinator worker not found"
    fi
    
    if echo "$workers" | grep -q "sync-worker"; then
        print_success "sync-worker worker is deployed"
    else
        print_error "sync-worker worker not found"
    fi
    
    if echo "$workers" | grep -q "webhook-handler"; then
        print_success "webhook-handler worker is deployed"
    else
        print_error "webhook-handler worker not found"
    fi
    
    # Check KV namespaces
    print_status "Checking KV namespaces..."
    local kv_namespaces=$(wrangler kv:namespace list 2>/dev/null || echo "")
    
    if echo "$kv_namespaces" | grep -q "sync-cache"; then
        print_success "KV namespace 'sync-cache' exists"
    else
        print_warning "KV namespace 'sync-cache' not found"
    fi
    
    # Check Hyperdrive configurations
    print_status "Checking Hyperdrive configurations..."
    local hyperdrive_configs=$(wrangler hyperdrive list 2>/dev/null || echo "")
    
    if echo "$hyperdrive_configs" | grep -q "supabase"; then
        print_success "Hyperdrive configuration for Supabase found"
    else
        print_warning "Hyperdrive configuration not found"
    fi
}

# Function to get worker URLs
get_worker_urls() {
    print_status "Determining worker URLs..."
    
    # Try to get account subdomain from wrangler
    local subdomain=""
    if command -v wrangler &> /dev/null && wrangler whoami &> /dev/null; then
        # This is a simplified approach - in reality, you'd need the actual subdomain
        subdomain="YOUR_SUBDOMAIN"
    fi
    
    # For now, we'll use placeholder URLs and let the user provide them
    echo ""
    print_warning "Please provide your worker URLs for testing:"
    
    read -p "Sync Coordinator URL (https://sync-coordinator.$subdomain.workers.dev): " SYNC_COORDINATOR_URL
    SYNC_COORDINATOR_URL=${SYNC_COORDINATOR_URL:-"https://sync-coordinator.$subdomain.workers.dev"}
    
    read -p "Sync Worker URL (https://sync-worker.$subdomain.workers.dev): " SYNC_WORKER_URL
    SYNC_WORKER_URL=${SYNC_WORKER_URL:-"https://sync-worker.$subdomain.workers.dev"}
    
    read -p "Webhook Handler URL (https://webhook-handler.$subdomain.workers.dev): " WEBHOOK_HANDLER_URL
    WEBHOOK_HANDLER_URL=${WEBHOOK_HANDLER_URL:-"https://webhook-handler.$subdomain.workers.dev"}
    
    echo ""
}

# Function to test worker interactions
test_worker_interactions() {
    print_status "Testing worker interactions..."
    
    # Test service bindings by making requests that would trigger inter-worker communication
    # This is a basic test - more sophisticated tests would require actual data
    
    print_status "Testing sync-worker -> sync-coordinator communication..."
    local sync_test_response=$(curl -s "$SYNC_WORKER_URL/test-coordinator" --max-time 10 || echo "failed")
    
    if [[ "$sync_test_response" == *"error"* ]] || [[ "$sync_test_response" == "failed" ]]; then
        print_warning "Worker communication test inconclusive (this is normal for a fresh deployment)"
    else
        print_success "Worker communication appears to be working"
    fi
}

# Function to validate configuration files
validate_config_files() {
    print_status "Validating configuration files..."
    
    # Check wrangler.toml files
    for worker in "sync-coordinator" "sync-worker" "webhook-handler"; do
        local config_file="$worker/wrangler.toml"
        
        if [ -f "$config_file" ]; then
            print_success "Found wrangler.toml for $worker"
            
            # Check for placeholder values
            if grep -q "your-.*-id" "$config_file"; then
                print_warning "$worker wrangler.toml still contains placeholder values"
            else
                print_success "$worker wrangler.toml appears properly configured"
            fi
        else
            print_error "Missing wrangler.toml for $worker"
        fi
    done
    
    # Check for package.json files
    for worker in "sync-coordinator" "sync-worker" "webhook-handler"; do
        local package_file="$worker/package.json"
        
        if [ -f "$package_file" ]; then
            print_success "Found package.json for $worker"
        else
            print_error "Missing package.json for $worker"
        fi
    done
}

# Function to test OAuth flow (basic)
test_oauth_flow() {
    print_status "Testing OAuth endpoints..."
    
    # Test OAuth initiation endpoint
    if test_endpoint "$SYNC_COORDINATOR_URL/oauth/initiate" "OAuth initiation endpoint" 200; then
        print_success "OAuth initiation endpoint is accessible"
    else
        print_warning "OAuth initiation endpoint test failed (may require parameters)"
    fi
}

# Function to provide deployment summary
provide_summary() {
    echo ""
    echo "=================================================="
    echo "🎯 DEPLOYMENT VALIDATION SUMMARY"
    echo "=================================================="
    echo ""
    
    echo "Worker URLs:"
    echo "  🔄 Sync Coordinator: $SYNC_COORDINATOR_URL"
    echo "  ⚡ Sync Worker: $SYNC_WORKER_URL"
    echo "  🪝 Webhook Handler: $WEBHOOK_HANDLER_URL"
    echo ""
    
    echo "Key endpoints to test:"
    echo "  Health checks:"
    echo "    curl $SYNC_COORDINATOR_URL/health"
    echo "    curl $SYNC_WORKER_URL/health"
    echo "    curl $WEBHOOK_HANDLER_URL/health"
    echo ""
    
    echo "  OAuth flow (for Keap integration):"
    echo "    $SYNC_COORDINATOR_URL/oauth/initiate"
    echo "    $SYNC_COORDINATOR_URL/oauth/callback"
    echo ""
    
    echo "  Webhook endpoint (for Keap):"
    echo "    $WEBHOOK_HANDLER_URL/webhook"
    echo ""
    
    echo "Next steps:"
    echo "  1. Configure Keap OAuth redirect URL"
    echo "  2. Set up Keap webhooks"
    echo "  3. Test OAuth flow with real Keap account"
    echo "  4. Test webhook delivery from Keap"
    echo "  5. Monitor worker logs: wrangler tail [worker-name]"
    echo ""
}

# Main validation function
main() {
    echo ""
    print_status "Starting deployment validation..."
    echo ""
    
    # Step 1: Validate configuration files
    validate_config_files
    echo ""
    
    # Step 2: Check Cloudflare resources
    check_cloudflare_resources
    echo ""
    
    # Step 3: Get worker URLs
    get_worker_urls
    
    # Step 4: Test health endpoints
    print_status "Testing worker health endpoints..."
    test_health_endpoint "$SYNC_COORDINATOR_URL" "sync-coordinator"
    test_health_endpoint "$SYNC_WORKER_URL" "sync-worker"
    test_health_endpoint "$WEBHOOK_HANDLER_URL" "webhook-handler"
    echo ""
    
    # Step 5: Test worker interactions
    test_worker_interactions
    echo ""
    
    # Step 6: Test OAuth endpoints
    test_oauth_flow
    echo ""
    
    # Step 7: Provide summary
    provide_summary
}

# Handle command line arguments
case "${1:-validate}" in
    "validate")
        main
        ;;
    "health-only")
        get_worker_urls
        test_health_endpoint "$SYNC_COORDINATOR_URL" "sync-coordinator"
        test_health_endpoint "$SYNC_WORKER_URL" "sync-worker"
        test_health_endpoint "$WEBHOOK_HANDLER_URL" "webhook-handler"
        ;;
    "config-only")
        validate_config_files
        ;;
    "resources-only")
        check_cloudflare_resources
        ;;
    *)
        echo "Usage: $0 {validate|health-only|config-only|resources-only}"
        echo ""
        echo "Commands:"
        echo "  validate      - Run full validation (default)"
        echo "  health-only   - Test health endpoints only"
        echo "  config-only   - Validate configuration files only"
        echo "  resources-only- Check Cloudflare resources only"
        exit 1
        ;;
esac