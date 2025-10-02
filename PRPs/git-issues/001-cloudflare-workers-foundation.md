---
name: 🚀 Feature Request
about: Cloudflare Workers Foundation with OAuth Management
title: "[Feature] Implement Cloudflare Workers Infrastructure with Durable Objects for OAuth Token Management"
labels: enhancement, infrastructure, critical
assignees: '@claude'
---

## Problem Statement
We need a robust edge computing infrastructure using Cloudflare Workers to handle OAuth token management, sync coordination, and webhook processing for the Keap-Supabase bidirectional sync system. The current architecture lacks the distributed state management and edge optimization required for reliable OAuth token lifecycle management and real-time sync operations.

Without proper OAuth token management, the system will face:
- Token expiry failures causing sync disruptions
- Lost refresh tokens due to improper rotation handling
- Race conditions in concurrent sync operations
- Inefficient database connections from edge locations
- Lack of centralized state management for sync coordination

## Proposed Solution
Implement a complete Cloudflare Workers infrastructure with:

### 1. **Durable Objects for OAuth Token Management**
   - Create `SyncCoordinator` Durable Object class for centralized token storage
   - Implement automatic token refresh mechanism (every 21 hours)
   - Handle Keap's refresh token rotation properly
   - Store tokens with strong consistency guarantees

### 2. **KV Namespaces for Caching**
   - Configure KV namespace for sync metadata caching
   - Store sync configurations and state information
   - Cache frequently accessed data for performance

### 3. **Hyperdrive Integration**
   - Setup Hyperdrive binding for optimized Supabase connections
   - Reduce database connection latency from edge locations
   - Implement connection pooling for efficiency

### 4. **OAuth2 Flow Implementation**
   - Complete authorization flow with state validation
   - Code-for-token exchange mechanism
   - Automatic refresh before token expiry
   - Proper error handling and retry logic

## Technical Requirements

### Directory Structure
```
cloudflare_workers/
├── sync-coordinator/
│   ├── src/
│   │   ├── index.ts           # Main Worker entry point
│   │   ├── sync-coordinator.ts # Durable Object class
│   │   ├── keap-oauth.ts      # OAuth2 implementation
│   │   ├── types.ts           # TypeScript interfaces
│   │   └── utils.ts           # Helper functions
│   ├── wrangler.toml          # Worker configuration
│   ├── package.json
│   └── tsconfig.json
```

### Wrangler Configuration
```toml
name = "sync-coordinator"
compatibility_date = "2024-01-15"
main = "src/index.ts"

[[durable_objects.bindings]]
name = "SYNC_COORDINATOR"
class_name = "SyncCoordinator"

[[kv_namespaces]]
binding = "SYNC_CACHE"
id = "to-be-configured"

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "to-be-configured"

[vars]
KEAP_REDIRECT_URI = "https://your-app.com/api/auth/keap/callback"
```

### Key Implementation Details

#### Durable Object Class Structure
```typescript
export class SyncCoordinator implements DurableObject {
  private storage: DurableObjectStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    this.storage = ctx.storage;
  }

  async getValidToken(keapAccountId: string): Promise<string>
  async refreshToken(keapAccountId: string, refreshToken: string): Promise<void>
  async scheduleTokenRefresh(keapAccountId: string): Promise<void>
  async processWebhookEvent(eventType: string, objectKeys: string[]): Promise<void>
}
```

#### OAuth Token Storage Schema
```typescript
interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  keapAccountId: string;
  lastRefreshed: number;
  refreshScheduled: boolean;
}
```

## Critical Keap OAuth Requirements
- **Authorization URL**: `https://accounts.infusionsoft.com/app/oauth/authorize`
- **Token Endpoint**: `https://api.infusionsoft.com/token`
- **Scope**: Must be `"full"` (only supported scope)
- **Refresh Token Rotation**: New refresh token issued with each refresh - MUST store new token
- **Token Expiry**: Refresh tokens expire after 45 days if unused
- **Automatic Refresh**: Implement refresh every 21 hours to prevent expiry
- **Authentication Header**: `Authorization: Basic base64(client_id:client_secret)` for refresh

## Environment Variables Required
```env
KEAP_CLIENT_ID=your_client_id
KEAP_CLIENT_SECRET=your_client_secret
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Acceptance Criteria
- [ ] Wrangler CLI installed and authenticated with Cloudflare account
- [ ] Durable Object successfully stores and retrieves OAuth tokens
- [ ] OAuth2 authorization flow completes with state validation
- [ ] Code-for-token exchange works correctly
- [ ] Automatic token refresh triggers before expiry
- [ ] New refresh tokens are properly stored after rotation
- [ ] KV namespace accessible for metadata caching
- [ ] Hyperdrive binding configured for Supabase connections
- [ ] Error handling for token failures with retry logic
- [ ] Comprehensive logging for debugging OAuth issues
- [ ] Unit tests for OAuth manager with >80% coverage
- [ ] Integration test confirming end-to-end OAuth flow

## Testing Approach

### Unit Tests
```typescript
// Test OAuth URL generation
// Test token refresh logic
// Test state validation
// Test HMAC signature generation
// Test error handling and retries
```

### Integration Tests
```bash
# Test OAuth initiation
curl -X POST https://sync-coordinator.workers.dev/oauth/initiate \
  -d '{"keap_account_id": "test-account"}'

# Verify Durable Object storage
wrangler tail sync-coordinator --format pretty

# Test token retrieval
curl -X GET https://sync-coordinator.workers.dev/oauth/token/test-account
```

## Security Considerations
- Store all credentials in environment variables
- Validate state parameter to prevent CSRF attacks
- Use crypto.subtle for secure operations
- Implement rate limiting for OAuth endpoints
- Sanitize logs to avoid exposing tokens
- Use HTTPS for all redirect URLs

## Performance Requirements
- Token refresh must complete within 5 seconds
- Durable Object operations < 50ms p99 latency
- KV cache hits > 95% for metadata
- Hyperdrive must reduce DB latency by >50%

## Dependencies
- `@cloudflare/workers-types`: TypeScript types for Workers
- `wrangler`: Cloudflare Workers CLI
- `vitest`: Testing framework
- `miniflare`: Local Workers development

## Related PRs/Issues
- Depends on: Database schema setup for sync tables
- Blocks: Webhook handler implementation
- Related to: Sync worker development

## Additional Context
This is the foundational infrastructure for the entire sync system. Without proper OAuth token management through Durable Objects, the system cannot maintain reliable connections to Keap's API. The use of Cloudflare's edge computing ensures low latency and high availability for critical sync operations.

## References
- [Cloudflare Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Keap OAuth2 Documentation](https://developer.infusionsoft.com/authentication/)
- [Cloudflare KV Storage](https://developers.cloudflare.com/kv/)
- [Hyperdrive Database Connections](https://developers.cloudflare.com/workers/databases/connecting-to-databases/)