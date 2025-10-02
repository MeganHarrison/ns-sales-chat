---
name: 🚀 Feature Request
about: Migrate from Vite to Next.js and Build Real-time Dashboard
title: "[Feature] Migrate Frontend to Next.js 14 with Real-time Dashboard and Sync Admin Interface"
labels: enhancement, frontend, migration, dashboard
assignees: '@claude'
---

## Problem Statement
The current frontend uses Vite React which lacks the server-side rendering, API routes, and middleware capabilities needed for our enterprise sync dashboard. We need to migrate to Next.js 14 with App Router to enable:
- Server-side data fetching for dashboard KPIs
- Secure API routes for sync operations
- Real-time updates via Supabase subscriptions
- Server Components for improved performance
- Built-in authentication middleware
- Better SEO and initial load performance

The current Vite setup cannot provide the production-ready features required for a business-critical sync monitoring and administration interface.

## Proposed Solution
Complete migration to Next.js 14 with a comprehensive dashboard and sync administration interface:

### 1. **Next.js Project Setup**
   - Initialize Next.js 14 with App Router
   - Configure TypeScript, Tailwind CSS, and shadcn/ui
   - Migrate existing components from Vite
   - Setup Supabase client for Next.js environment

### 2. **Dashboard Implementation**
   - Real-time KPI monitoring (contacts, orders, subscriptions)
   - Interactive charts using Recharts
   - Sync status monitoring with live updates
   - Data tables with filtering and search
   - Export functionality for reports

### 3. **Sync Administration Interface**
   - Manual sync triggers
   - Conflict resolution UI
   - Sync configuration management
   - Audit log viewer
   - System health monitoring

### 4. **Server Components & API Routes**
   - Server Components for data fetching
   - API routes for sync operations
   - Middleware for authentication
   - Server Actions for mutations

## Technical Requirements

### Directory Structure
```
frontend_nextjs/
├── app/                        # Next.js App Router
│   ├── (auth)/                # Auth group
│   │   ├── login/
│   │   └── callback/
│   ├── dashboard/             # Main dashboard
│   │   ├── page.tsx          # Dashboard home
│   │   ├── layout.tsx        # Dashboard layout
│   │   ├── contacts/         # Contacts view
│   │   ├── orders/           # Orders view
│   │   └── analytics/        # Analytics view
│   ├── sync-admin/           # Admin interface
│   │   ├── page.tsx          # Admin dashboard
│   │   ├── conflicts/        # Conflict resolution
│   │   ├── settings/         # Sync settings
│   │   └── logs/             # Audit logs
│   ├── api/                  # API routes
│   │   ├── dashboard/
│   │   │   ├── kpis/route.ts
│   │   │   └── charts/route.ts
│   │   ├── sync/
│   │   │   ├── trigger/route.ts
│   │   │   └── status/route.ts
│   │   └── auth/
│   │       └── keap/
│   │           └── callback/route.ts
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   └── globals.css           # Global styles
├── components/
│   ├── dashboard/
│   │   ├── SyncStatus.tsx    # Live sync status
│   │   ├── KpiCard.tsx       # KPI display cards
│   │   ├── KpiCharts.tsx     # Business metrics charts
│   │   ├── DataTable.tsx     # Reusable data table
│   │   └── DateRangePicker.tsx
│   ├── sync/
│   │   ├── ConflictResolver.tsx
│   │   ├── SyncSettings.tsx
│   │   ├── SyncTrigger.tsx
│   │   └── AuditLog.tsx
│   └── ui/                   # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── table.tsx
├── lib/
│   ├── supabase.ts           # Supabase client setup
│   ├── keap-sync.ts          # Sync API client
│   ├── dashboard-queries.ts  # Data fetching functions
│   ├── realtime.ts           # Real-time subscriptions
│   └── utils.ts              # Utility functions
├── hooks/
│   ├── use-sync-status.ts    # Sync status hook
│   ├── use-realtime.ts       # Real-time data hook
│   └── use-dashboard-data.ts # Dashboard data hook
└── types/
    ├── database.types.ts      # Supabase types
    ├── dashboard.types.ts     # Dashboard types
    └── sync.types.ts          # Sync types
```

### Key Components Implementation

#### Dashboard Layout (app/dashboard/layout.tsx)
```typescript
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <DashboardHeader />
        {children}
      </main>
    </div>
  )
}
```

#### KPI Dashboard (app/dashboard/page.tsx)
```typescript
export default async function DashboardPage() {
  // Server Component - fetch data server-side
  const kpis = await getKPIs()
  const syncStatus = await getSyncStatus()

  return (
    <div className="space-y-6">
      <KpiGrid kpis={kpis} />
      <SyncStatus status={syncStatus} />
      <DashboardCharts />
      <RecentActivity />
    </div>
  )
}
```

#### Real-time Sync Status Component
```typescript
'use client'

export function SyncStatus({ initialStatus }: Props) {
  const status = useRealtimeSyncStatus(initialStatus)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <StatusCard
            entity="Contacts"
            status={status.contacts}
            lastSync={status.contactsLastSync}
          />
          {/* Other status cards */}
        </div>
      </CardContent>
    </Card>
  )
}
```

## Migration Strategy

### Phase 1: Setup & Component Migration
1. Initialize Next.js project with TypeScript
2. Setup Tailwind CSS and shadcn/ui
3. Migrate Supabase client configuration
4. Port existing React components
5. Update environment variables (VITE_* → NEXT_PUBLIC_*)

### Phase 2: Dashboard Implementation
1. Create dashboard layout and navigation
2. Implement KPI cards and charts
3. Add real-time sync status monitoring
4. Build data tables with filtering
5. Add export functionality

### Phase 3: Admin Interface
1. Create sync administration pages
2. Implement conflict resolution UI
3. Add sync configuration management
4. Build audit log viewer
5. Add manual sync triggers

### Phase 4: API Routes & Integration
1. Create API routes for dashboard data
2. Implement sync control endpoints
3. Add authentication middleware
4. Setup Server Actions for mutations
5. Integrate with Cloudflare Workers

## Acceptance Criteria
- [ ] Next.js 14 project initialized with App Router
- [ ] All existing components migrated from Vite
- [ ] Environment variables updated to Next.js format
- [ ] Dashboard displays real-time KPIs
- [ ] Charts update dynamically with new data
- [ ] Sync status shows live updates via Supabase subscriptions
- [ ] Data tables support sorting, filtering, and pagination
- [ ] Export functionality generates CSV/PDF reports
- [ ] Conflict resolver allows manual resolution
- [ ] Sync settings can be configured through UI
- [ ] Audit logs show detailed sync history
- [ ] Manual sync can be triggered from dashboard
- [ ] Authentication middleware protects all routes
- [ ] Server Components used for data fetching
- [ ] API routes handle all sync operations
- [ ] Build passes with no TypeScript errors
- [ ] Lighthouse score > 90 for performance

## Performance Requirements
- Initial page load < 2 seconds
- Time to Interactive < 3 seconds
- First Contentful Paint < 1 second
- Real-time updates < 100ms latency
- Chart rendering < 500ms
- Data table pagination < 200ms

## Testing Approach

### Unit Tests
```typescript
// Test dashboard components
// Test data transformation utilities
// Test real-time hooks
// Test API route handlers
```

### E2E Tests
```typescript
// Test dashboard navigation
// Test real-time updates
// Test sync operations
// Test conflict resolution flow
// Test data export
```

## Key Migration Considerations

### Environment Variables
```diff
- import.meta.env.VITE_SUPABASE_URL
+ process.env.NEXT_PUBLIC_SUPABASE_URL

- import.meta.env.VITE_SUPABASE_ANON_KEY
+ process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Component Updates
```typescript
// Add 'use client' directive for interactive components
'use client'

// Update imports for Next.js
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
```

### Supabase Client Setup
```typescript
// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

// For client components
export const supabase = createClientComponentClient()

// For server components
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

## UI/UX Requirements
- Responsive design for desktop and tablet
- Dark mode support
- Accessible (WCAG 2.1 AA compliant)
- Loading states for all async operations
- Error boundaries for graceful error handling
- Toast notifications for user feedback
- Skeleton screens while loading

## Dependencies
- `next`: 14.x
- `react`: 18.x
- `@supabase/auth-helpers-nextjs`: Latest
- `recharts`: For charts
- `@tanstack/react-table`: For data tables
- `tailwindcss`: 3.x
- `@radix-ui/*`: UI primitives
- `lucide-react`: Icons
- `date-fns`: Date formatting
- `zod`: Schema validation

## Related PRs/Issues
- Depends on: Cloudflare Workers OAuth implementation
- Depends on: Database schema for sync tables
- Blocks: Production deployment
- Related to: Sync service integration

## Additional Context
This migration is critical for providing a production-ready interface for monitoring and managing the Keap-Supabase sync system. The Next.js App Router provides the server-side capabilities needed for secure, performant dashboard operations while maintaining excellent developer experience.

## References
- [Next.js 14 App Router Documentation](https://nextjs.org/docs/app)
- [Supabase Next.js Guide](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Recharts Examples](https://recharts.org/en-US/examples)