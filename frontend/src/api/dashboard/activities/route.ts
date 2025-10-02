import { NextRequest, NextResponse } from 'next/server'
import { getRecentSyncActivities } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    
    const data = await getRecentSyncActivities(limit)
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error - recent activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activities' },
      { status: 500 }
    )
  }
}