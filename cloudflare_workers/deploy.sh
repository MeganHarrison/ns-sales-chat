#!/bin/bash

# Cloudflare Workers Deployment Script
# This script sets up all required Cloudflare resources and deploys the Keap-Supabase sync system

set -e  # Exit on any error

echo "🚀 Starting Cloudflare Workers deployment for Keap-Supabase sync system..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    print_error "You are not logged in to Cloudflare. Please run:"
    echo "wrangler login"
    exit 1
fi

print_success "Wrangler CLI is ready!"

# Function to create KV namespace
create_kv_namespace() {
    local name=$1
    local description=$2
    
    print_status "Creating KV namespace: $name"
    
    # Check if namespace already exists
    if wrangler kv:namespace list | grep -q "\"title\":\"$name\""; then
        print_warning "KV namespace '$name' already exists, skipping creation"
        # Get the existing namespace ID
        wrangler kv:namespace list | grep -A1 "\"title\":\"$name\"" | grep "\"id\":" | cut -d'"' -f4
    else
        # Create new namespace
        local result=$(wrangler kv:namespace create "$name" --preview false)
        echo "$result" | grep "id" | cut -d'"' -f4
    fi
}

# Function to create Hyperdrive configuration
create_hyperdrive_config() {
    local name=$1
    local supabase_url=$2
    
    print_status "Creating Hyperdrive configuration: $name"
    
    # Extract hostname from Supabase URL
    local hostname=$(echo "$supabase_url" | sed 's|.*://||' | cut -d'/' -f1)
    
    # Check if Hyperdrive config already exists
    if wrangler hyperdrive list | grep -q "$name"; then
        print_warning "Hyperdrive config '$name' already exists, skipping creation"
        # Get existing config ID
        wrangler hyperdrive list | grep "$name" | awk '{print $1}'
    else
        # Create new Hyperdrive config
        local result=$(wrangler hyperdrive create "$name" --connection-string "postgresql://user:pass@$hostname:5432/postgres")
        echo "$result" | grep "hyperdrive_id" | cut -d'"' -f4
    fi
}

# Function to deploy a worker
deploy_worker() {
    local worker_dir=$1
    local worker_name=$2
    
    print_status "Deploying worker: $worker_name"
    
    cd "$worker_dir"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies for $worker_name"
        npm install
    fi
    
    # Deploy the worker
    wrangler deploy
    
    print_success "Worker $worker_name deployed successfully!"
    cd - > /dev/null
}

# Main deployment process
main() {
    echo ""
    print_status "Starting resource creation and deployment process..."
    echo ""
    
    # Prompt for required environment variables
    if [ -z "$SUPABASE_URL" ]; then
        read -p "Enter your Supabase URL: " SUPABASE_URL
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        read -s -p "Enter your Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
        echo ""
    fi
    
    if [ -z "$KEAP_CLIENT_ID" ]; then
        read -p "Enter your Keap Client ID: " KEAP_CLIENT_ID
    fi
    
    if [ -z "$KEAP_CLIENT_SECRET" ]; then
        read -s -p "Enter your Keap Client Secret: " KEAP_CLIENT_SECRET
        echo ""
    fi
    
    if [ -z "$KEAP_WEBHOOK_SECRET" ]; then
        read -s -p "Enter your Keap Webhook Secret: " KEAP_WEBHOOK_SECRET
        echo ""
    fi
    
    # Step 1: Create KV Namespace
    print_status "Step 1: Creating KV namespace for sync cache..."
    KV_ID=$(create_kv_namespace "sync-cache" "KV namespace for Keap-Supabase sync metadata caching")
    KV_PREVIEW_ID=$(create_kv_namespace "sync-cache-preview" "Preview KV namespace for Keap-Supabase sync metadata caching")
    print_success "KV namespace created with ID: $KV_ID"
    
    # Step 2: Create Hyperdrive configuration
    print_status "Step 2: Creating Hyperdrive configuration for Supabase..."
    HYPERDRIVE_ID=$(create_hyperdrive_config "supabase-hyperdrive" "$SUPABASE_URL")
    print_success "Hyperdrive configuration created with ID: $HYPERDRIVE_ID"
    
    # Step 3: Update wrangler.toml files with real IDs
    print_status "Step 3: Updating wrangler.toml files with actual resource IDs..."
    
    # Update sync-worker wrangler.toml
    sed -i.bak "s/your-hyperdrive-config-id/$HYPERDRIVE_ID/g" sync-worker/wrangler.toml
    sed -i.bak "s/your-kv-namespace-id/$KV_ID/g" sync-worker/wrangler.toml
    sed -i.bak "s/your-kv-namespace-preview-id/$KV_PREVIEW_ID/g" sync-worker/wrangler.toml
    sed -i.bak "s/your-production-kv-namespace-id/$KV_ID/g" sync-worker/wrangler.toml
    sed -i.bak "s/your-production-hyperdrive-config-id/$HYPERDRIVE_ID/g" sync-worker/wrangler.toml
    
    # Update sync-coordinator wrangler.toml
    sed -i.bak "s/your-hyperdrive-config-id/$HYPERDRIVE_ID/g" sync-coordinator/wrangler.toml
    sed -i.bak "s/your-kv-namespace-id/$KV_ID/g" sync-coordinator/wrangler.toml
    sed -i.bak "s/your-kv-namespace-preview-id/$KV_PREVIEW_ID/g" sync-coordinator/wrangler.toml
    sed -i.bak "s/your-production-kv-namespace-id/$KV_ID/g" sync-coordinator/wrangler.toml
    sed -i.bak "s/your-production-hyperdrive-config-id/$HYPERDRIVE_ID/g" sync-coordinator/wrangler.toml
    
    print_success "Wrangler.toml files updated with resource IDs"
    
    # Step 4: Set secrets for all workers
    print_status "Step 4: Setting up secrets and environment variables..."
    
    # Set secrets for sync-worker
    echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL --name sync-worker
    echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name sync-worker
    
    # Set secrets for sync-coordinator
    echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL --name sync-coordinator
    echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name sync-coordinator
    echo "$KEAP_CLIENT_ID" | wrangler secret put KEAP_CLIENT_ID --name sync-coordinator
    echo "$KEAP_CLIENT_SECRET" | wrangler secret put KEAP_CLIENT_SECRET --name sync-coordinator
    
    # Set secrets for webhook-handler
    echo "$KEAP_WEBHOOK_SECRET" | wrangler secret put KEAP_WEBHOOK_SECRET --name webhook-handler
    
    print_success "Secrets configured for all workers"
    
    # Step 5: Deploy workers in correct order
    print_status "Step 5: Deploying workers..."
    
    # Deploy sync-coordinator first (required by other workers)
    deploy_worker "sync-coordinator" "sync-coordinator"
    
    # Deploy sync-worker
    deploy_worker "sync-worker" "sync-worker"
    
    # Deploy webhook-handler
    deploy_worker "webhook-handler" "webhook-handler"
    
    # Step 6: Test deployments
    print_status "Step 6: Testing worker deployments..."
    
    # Get worker URLs and test health endpoints
    SYNC_COORDINATOR_URL=$(wrangler whoami | grep -o "https://sync-coordinator\.[^.]*\.workers\.dev" || echo "https://sync-coordinator.YOUR_SUBDOMAIN.workers.dev")
    SYNC_WORKER_URL=$(wrangler whoami | grep -o "https://sync-worker\.[^.]*\.workers\.dev" || echo "https://sync-worker.YOUR_SUBDOMAIN.workers.dev")
    WEBHOOK_HANDLER_URL=$(wrangler whoami | grep -o "https://webhook-handler\.[^.]*\.workers\.dev" || echo "https://webhook-handler.YOUR_SUBDOMAIN.workers.dev")
    
    echo ""
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "Worker URLs:"
    echo "  🔄 Sync Coordinator: $SYNC_COORDINATOR_URL"
    echo "  ⚡ Sync Worker: $SYNC_WORKER_URL"
    echo "  🪝 Webhook Handler: $WEBHOOK_HANDLER_URL"
    echo ""
    echo "Next steps:"
    echo "  1. Test health endpoints: curl \$WORKER_URL/health"
    echo "  2. Configure Keap webhook URL: $WEBHOOK_HANDLER_URL/webhook"
    echo "  3. Set up OAuth flow using: $SYNC_COORDINATOR_URL/oauth"
    echo "  4. Monitor logs: wrangler tail \$WORKER_NAME"
    echo ""
    print_warning "Save these URLs - you'll need them for Keap configuration!"
}

# Run main function
main "$@"