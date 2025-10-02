// Template for Next.js API Routes - Copy to frontend_nextjs/src/app/api/

// ===============================================================
// /api/dashboard/metrics/route.ts
// ===============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const metrics = await getDashboardMetrics()
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Dashboard metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    )
  }
}

// ===============================================================
// /api/dashboard/trends/route.ts  
// ===============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSyncTrendData } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Number(searchParams.get('days')) || 7
    
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days parameter must be between 1 and 365' },
        { status: 400 }
      )
    }

    const trends = await getSyncTrendData(days)
    return NextResponse.json(trends)
  } catch (error) {
    console.error('Dashboard trends error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trend data' },
      { status: 500 }
    )
  }
}

// ===============================================================
// /api/dashboard/health/route.ts
// ===============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getSyncHealthData } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const healthData = await getSyncHealthData()
    return NextResponse.json(healthData)
  } catch (error) {
    console.error('Dashboard health error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health data' },
      { status: 500 }
    )
  }
}

// ===============================================================
// /api/dashboard/activities/route.ts
// ===============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getRecentSyncActivities } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit')) || 20
    
    const activities = await getRecentSyncActivities(limit)
    return NextResponse.json(activities)
  } catch (error) {
    console.error('Dashboard activities error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// ===============================================================
// /api/dashboard/conflicts/route.ts
// ===============================================================
import { NextRequest, NextResponse } from 'next/server'
import { getPendingConflicts } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const conflicts = await getPendingConflicts()
    return NextResponse.json(conflicts)
  } catch (error) {
    console.error('Dashboard conflicts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conflicts' },
      { status: 500 }
    )
  }
}

// ===============================================================
// /api/sync/trigger/route.ts
// ===============================================================
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keapAccountId, syncType = 'all' } = body

    if (!keapAccountId) {
      return NextResponse.json(
        { error: 'keapAccountId is required' },
        { status: 400 }
      )
    }

    // Call Cloudflare Worker to trigger sync
    const workerUrl = process.env.SYNC_WORKER_URL
    if (!workerUrl) {
      throw new Error('SYNC_WORKER_URL not configured')
    }

    const response = await fetch(`${workerUrl}/sync/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SYNC_WORKER_AUTH_TOKEN}`
      },
      body: JSON.stringify({ keapAccountId, syncType })
    })

    if (!response.ok) {
      throw new Error(`Sync trigger failed: ${response.status}`)
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Sync trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    )
  }
}

// ===============================================================
// /api/sync/status/route.ts
// ===============================================================
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Call Cloudflare Worker for sync status
    const workerUrl = process.env.SYNC_WORKER_URL
    if (!workerUrl) {
      throw new Error('SYNC_WORKER_URL not configured')
    }

    const response = await fetch(`${workerUrl}/sync/status`, {
      headers: {
        'Authorization': `Bearer ${process.env.SYNC_WORKER_AUTH_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error(`Status fetch failed: ${response.status}`)
    }

    const status = await response.json()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}

// ===============================================================
// /api/keap/test-connection/route.ts
// ===============================================================
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken } = body

    if (!accessToken) {
      return NextResponse.json(
        { error: 'accessToken is required' },
        { status: 400 }
      )
    }

    // Test Keap API connection
    const keapResponse = await fetch('https://api.infusionsoft.com/crm/rest/v1/contacts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!keapResponse.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Keap API error: ${keapResponse.status}` 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Keap API connection successful'
    })
  } catch (error) {
    console.error('Keap connection test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test Keap connection' 
      },
      { status: 500 }
    )
  }
}