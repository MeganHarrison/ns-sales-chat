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