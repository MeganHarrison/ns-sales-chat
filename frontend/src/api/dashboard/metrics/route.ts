import { NextRequest, NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const data = await getDashboardMetrics()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error - dashboard metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    )
  }
}