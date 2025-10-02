#!/bin/bash

# Quick Deployment Test Script
# This script performs basic validation that deployment files are properly set up

set -e

echo "🧪 Testing Cloudflare Workers deployment setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test counter
TESTS_RUN=0
TESTS_PASSED=0

run_test() {
    local description="$1"
    local command="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    print_status "$description"
    
    if eval "$command" &>/dev/null; then
        print_success "$description"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "$description"
        return 1
    fi
}

echo ""
print_status "Running deployment setup tests..."
echo ""

# Test 1: Check required files exist
run_test "Check deploy.sh exists and is executable" "[ -x deploy.sh ]"
run_test "Check dev-setup.sh exists and is executable" "[ -x dev-setup.sh ]"
run_test "Check validate-deployment.sh exists and is executable" "[ -x validate-deployment.sh ]"
run_test "Check .env.example exists" "[ -f .env.example ]"
run_test "Check manual-setup.md exists" "[ -f manual-setup.md ]"
run_test "Check README.md exists" "[ -f README.md ]"

# Test 2: Check worker directories and files
for worker in "sync-coordinator" "sync-worker" "webhook-handler"; do
    run_test "Check $worker directory exists" "[ -d $worker ]"
    run_test "Check $worker/wrangler.toml exists" "[ -f $worker/wrangler.toml ]"
    run_test "Check $worker/package.json exists" "[ -f $worker/package.json ]"
    run_test "Check $worker/src directory exists" "[ -d $worker/src ]"
    run_test "Check $worker/src/index.ts exists" "[ -f $worker/src/index.ts ]"
done

# Test 3: Check wrangler.toml configuration
print_status "Validating wrangler.toml configurations..."

# Check sync-coordinator configuration
run_test "sync-coordinator has durable object binding" "grep -q 'durable_objects.bindings' sync-coordinator/wrangler.toml"
run_test "sync-coordinator has KV binding" "grep -q 'kv_namespaces' sync-coordinator/wrangler.toml"
run_test "sync-coordinator has hyperdrive binding" "grep -q 'hyperdrive' sync-coordinator/wrangler.toml"

# Check sync-worker configuration
run_test "sync-worker has service binding" "grep -q 'services' sync-worker/wrangler.toml"
run_test "sync-worker has cron trigger" "grep -q 'triggers' sync-worker/wrangler.toml"
run_test "sync-worker has hyperdrive binding" "grep -q 'hyperdrive' sync-worker/wrangler.toml"

# Check webhook-handler configuration
run_test "webhook-handler has service binding" "grep -q 'services' webhook-handler/wrangler.toml"

# Test 4: Check package.json dependencies
print_status "Validating package.json files..."

for worker in "sync-coordinator" "sync-worker" "webhook-handler"; do
    run_test "$worker has wrangler dependency" "grep -q '\"wrangler\"' $worker/package.json"
    run_test "$worker has typescript dependency" "grep -q '\"typescript\"' $worker/package.json"
    run_test "$worker has vitest dependency" "grep -q '\"vitest\"' $worker/package.json"
done

# Test 5: Check TypeScript files for basic structure
print_status "Validating TypeScript source files..."

for worker in "sync-coordinator" "sync-worker" "webhook-handler"; do
    run_test "$worker index.ts has export default" "grep -q 'export default' $worker/src/index.ts"
    run_test "$worker index.ts has Env type" "grep -q 'Env' $worker/src/index.ts"
    run_test "$worker index.ts has fetch handler" "grep -q 'fetch.*Request.*Response' $worker/src/index.ts"
done

# Test 6: Validate script permissions and syntax
print_status "Validating deployment scripts..."

run_test "deploy.sh has correct shebang" "head -1 deploy.sh | grep -q '#!/bin/bash'"
run_test "dev-setup.sh has correct shebang" "head -1 dev-setup.sh | grep -q '#!/bin/bash'"
run_test "validate-deployment.sh has correct shebang" "head -1 validate-deployment.sh | grep -q '#!/bin/bash'"

# Basic syntax check for bash scripts (if bash is available)
if command -v bash &> /dev/null; then
    run_test "deploy.sh syntax check" "bash -n deploy.sh"
    run_test "dev-setup.sh syntax check" "bash -n dev-setup.sh"
    run_test "validate-deployment.sh syntax check" "bash -n validate-deployment.sh"
fi

# Test 7: Check for security issues
print_status "Checking for security issues..."

run_test "No hardcoded secrets in wrangler.toml files" "! grep -r 'secret.*=' */wrangler.toml"
run_test "No hardcoded API keys in source files" "! grep -r 'api.*key.*=' */src/"
run_test "No .env files committed" "! find . -name '.env' -not -path './node_modules/*'"

echo ""
echo "=================================================="
echo "🎯 TEST SUMMARY"
echo "=================================================="
echo ""
echo "Tests run: $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $((TESTS_RUN - TESTS_PASSED))"
echo ""

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    print_success "All tests passed! Deployment setup is ready."
    echo ""
    echo "Next steps:"
    echo "  1. Copy .env.example to .env and configure your values"
    echo "  2. Run ./deploy.sh to deploy to Cloudflare"
    echo "  3. Run ./validate-deployment.sh to verify deployment"
    echo ""
    exit 0
else
    print_error "Some tests failed. Please review the output above."
    echo ""
    echo "Common fixes:"
    echo "  - Ensure all required files are present"
    echo "  - Check file permissions (chmod +x *.sh)"
    echo "  - Verify wrangler.toml configurations"
    echo ""
    exit 1
fi