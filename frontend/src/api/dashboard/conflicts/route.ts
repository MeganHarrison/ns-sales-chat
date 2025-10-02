import { NextRequest, NextResponse } from 'next/server'
import { getPendingConflicts } from '@/lib/dashboard-queries'

export async function GET(request: NextRequest) {
  try {
    const data = await getPendingConflicts()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error - pending conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending conflicts' },
      { status: 500 }
    )
  }
}