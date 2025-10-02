import { NextRequest, NextResponse } from 'next/server'
import { getSyncTrendData } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '7')
    
    const data = await getSyncTrendData(days)
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error - sync trends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync trend data' },
      { status: 500 }
    )
  }
}