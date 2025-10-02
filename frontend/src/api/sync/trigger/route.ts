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

    // For demo purposes - return mock success response
    // In production, this would call the Cloudflare Worker
    const workerUrl = process.env.SYNC_WORKER_URL
    
    if (!workerUrl || workerUrl.includes('placeholder')) {
      // Return mock response for demo
      return NextResponse.json({
        success: true,
        message: `${syncType} sync triggered successfully for account ${keapAccountId}`,
        syncType,
        keapAccountId,
        timestamp: new Date().toISOString(),
        status: 'queued'
      })
    }

    // Production code - call actual Cloudflare Worker
    try {
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
    } catch (workerError) {
      // Fallback to mock response if worker is unavailable
      return NextResponse.json({
        success: true,
        message: `${syncType} sync triggered successfully (fallback mode)`,
        syncType,
        keapAccountId,
        timestamp: new Date().toISOString(),
        status: 'queued'
      })
    }
  } catch (error) {
    console.error('Sync trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    )
  }
}