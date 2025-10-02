# Keap API Documentation & Integration

This directory contains comprehensive documentation and tools for integrating with the Keap (Infusionsoft) REST API v2.

## 📁 Directory Structure

```
docs/keap-api/
├── keap.json              # OpenAPI specification
├── keap-api-docs.html     # Main documentation hub
├── swagger-ui.html        # Interactive API testing interface
├── redoc.html            # Beautiful API documentation
└── KEAP_API_README.md    # Integration guide
```

## 🚀 Quick Start

### View Documentation

#### Option 1: Local Server (Recommended)
```bash
cd docs/keap-api
python -m http.server 8080
# Visit: http://localhost:8080/keap-api-docs.html
```

#### Option 2: Direct File Access
Open any of these files directly in your browser:
- `keap-api-docs.html` - Both viewers in tabs
- `swagger-ui.html` - Interactive testing
- `redoc.html` - Clean documentation

### Integration Files

The TypeScript integration files are located in `cloudflare_workers/`:
- `keap-types.ts` - Complete TypeScript types
- `keap-client-enhanced.ts` - API client with caching & retry
- `keap-utils.ts` - 60+ utility functions
- `keap-examples.ts` - Implementation examples

## 🔑 Testing Live API

1. Open `swagger-ui.html`
2. Click "Authorize" button
3. Enter your Keap API key
4. Test any endpoint with "Try it out"

## 📚 Documentation Types

### Swagger UI
- ✅ Interactive API testing
- ✅ Try endpoints directly
- ✅ Generate code samples
- ✅ Authentication testing

### Redoc
- ✅ Beautiful documentation
- ✅ Better mobile experience
- ✅ Deep linking support
- ✅ Advanced search

## 🛠️ Integration Usage

```typescript
import { KeapClientEnhanced } from '../../cloudflare_workers/keap-client-enhanced';
import * as utils from '../../cloudflare_workers/keap-utils';

const client = new KeapClientEnhanced({
  apiKey: process.env.KEAP_API_KEY!,
  enableCache: true
});

// Get contacts
const contacts = await client.getContacts();

// Calculate MRR
const subscriptions = await client.getSubscriptions();
const mrr = utils.calculateMRR(subscriptions.items);
```

## 🔗 Resources

- [Keap Developer Portal](https://developer.infusionsoft.com/)
- [API Documentation](https://developer.infusionsoft.com/docs/rest/)
- [Integration Guide](./KEAP_API_README.md)

## 📝 Notes

- The OpenAPI spec (`keap.json`) contains all API endpoints, schemas, and examples
- Documentation viewers automatically load the spec from the same directory
- TypeScript types are auto-generated from the OpenAPI specification patterns
- All tools support both API Key and OAuth authentication methods