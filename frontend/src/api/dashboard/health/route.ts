import { NextRequest, NextResponse } from 'next/server'
import { getSyncHealthData } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const data = await getSyncHealthData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error - sync health:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync health data' },
      { status: 500 }
    )
  }
}