# Nutrition Solutions AI Chat Integration Guide

## Overview
The AI Sales Chat system is now integrated with the Next.js frontend application. It provides an intelligent chat interface powered by OpenAI GPT-4 for handling customer inquiries about nutrition programs.

## Architecture

```
Frontend (Next.js)
    ↓
/api/chat Route
    ↓
Cloudflare Worker
    ↓
OpenAI + Supabase
```

## Setup Instructions

### 1. Environment Configuration

Add to your `frontend/.env.local`:
```env
# Nutrition Chat Worker URL
# For local development:
NEXT_PUBLIC_NUTRITION_CHAT_WORKER_URL=http://localhost:8787

# For production:
NEXT_PUBLIC_NUTRITION_CHAT_WORKER_URL=https://nutrition-solutions-chat.YOUR-SUBDOMAIN.workers.dev
```

### 2. Deploy the Cloudflare Worker

First, ensure the AI chat worker is deployed:

```bash
cd ai-sales-chat

# Configure secrets
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY

# Deploy to Cloudflare
npm run deploy
```

### 3. Access the Chat Interface

The chat is available at:
- **Direct Page**: `/nutrition-chat`
- **API Endpoint**: `/api/chat`

Navigate to http://localhost:3000/nutrition-chat to test the chat interface.

## Features

### Chat Component (`/components/nutrition-chat.tsx`)
- Real-time messaging interface
- Session management with unique IDs
- Loading states and error handling
- Intent classification display
- Responsive design

### API Route (`/api/chat/route.ts`)
- Proxies requests to Cloudflare Worker
- Handles CORS
- Error handling and logging
- Session persistence

### Chat Page (`/nutrition-chat/page.tsx`)
- Full-page chat experience
- Feature highlights
- Professional UI/UX

## Usage

### Basic Implementation
```tsx
import { NutritionChat } from '@/components/nutrition-chat';

export default function MyPage() {
  return <NutritionChat />;
}
```

### API Usage
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'What meal plans do you offer?',
    session_id: 'unique-session-id'
  }),
});

const data = await response.json();
console.log(data.message); // AI response
console.log(data.intent);  // Intent classification
```

## Testing

### Local Development
1. Start the Cloudflare Worker:
```bash
cd ai-sales-chat
npm run dev
```

2. Start the Next.js frontend:
```bash
cd frontend
npm run dev
```

3. Visit: http://localhost:3000/nutrition-chat

### Test Scenarios
- **Factual Questions**: "What's included in your program?"
- **Price Objections**: "That's too expensive"
- **Emotional Support**: "I've tried everything and nothing works"
- **Ready to Buy**: "How do I sign up?"
- **General Chat**: "Hello, how are you?"

## Customization

### Styling
The chat component uses Tailwind CSS. Modify colors in:
- `frontend/src/components/nutrition-chat.tsx`
- Gradient: `from-purple-600 to-indigo-600`
- Primary color: `purple-600`

### Initial Message
Edit the welcome message in `nutrition-chat.tsx`:
```tsx
const [messages, setMessages] = useState<Message[]>([
  {
    id: '1',
    role: 'assistant',
    content: "Your custom welcome message here",
    timestamp: new Date(),
  },
]);
```

### Session Management
Sessions are automatically generated with format:
```
session-{timestamp}-{random}
```

## Troubleshooting

### "Failed to get response from chat service"
- Check Cloudflare Worker is deployed
- Verify environment variable: `NEXT_PUBLIC_NUTRITION_CHAT_WORKER_URL`
- Check Worker logs: `npx wrangler tail`

### CORS Issues
- Ensure Worker returns proper CORS headers
- API route handles OPTIONS requests

### No Response
- Verify OpenAI API key is set in Worker
- Check Supabase connection
- Review Worker logs for errors

## Monitoring

### Cloudflare Dashboard
Monitor at: https://dash.cloudflare.com
- Request count
- Error rate
- Response times

### Supabase Analytics
View conversation data:
```sql
SELECT * FROM conversations
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Security Notes
- API keys are stored as Cloudflare secrets
- Session IDs are generated client-side
- No PII is logged unnecessarily
- Rate limiting should be implemented for production

## Support
For issues, check:
1. Cloudflare Worker logs: `npx wrangler tail`
2. Browser console for frontend errors
3. Network tab for API responses
4. Supabase logs for database errors