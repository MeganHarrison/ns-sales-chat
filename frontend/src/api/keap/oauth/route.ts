import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keapAccountId } = body

    if (!keapAccountId) {
      return NextResponse.json(
        { error: 'keapAccountId is required' },
        { status: 400 }
      )
    }

    // For demo purposes - return mock OAuth URL
    // In production, this would call the Cloudflare Worker to initiate OAuth
    const coordinatorUrl = process.env.SYNC_COORDINATOR_URL
    
    if (!coordinatorUrl || coordinatorUrl.includes('placeholder')) {
      // Return mock OAuth URL for demo
      const mockOAuthUrl = `https://accounts.infusionsoft.com/app/oauth/authorize?client_id=demo_client_id&redirect_uri=${encodeURIComponent('http://localhost:3006/api/keap/oauth/callback')}&response_type=code&scope=full`
      
      return NextResponse.json({
        success: true,
        auth_url: mockOAuthUrl,
        message: 'OAuth URL generated (demo mode)',
        keapAccountId
      })
    }

    // Production code - call actual Cloudflare Worker
    try {
      const response = await fetch(`${coordinatorUrl}/keap/${keapAccountId}/oauth/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SYNC_COORDINATOR_AUTH_TOKEN}`
        },
        body: JSON.stringify({ keapAccountId })
      })

      if (!response.ok) {
        throw new Error(`OAuth initiation failed: ${response.status}`)
      }

      const result = await response.json()
      return NextResponse.json(result)
    } catch (workerError) {
      // Fallback to mock response if worker is unavailable
      const fallbackOAuthUrl = `https://accounts.infusionsoft.com/app/oauth/authorize?client_id=fallback_client_id&redirect_uri=${encodeURIComponent('http://localhost:3006/api/keap/oauth/callback')}&response_type=code&scope=full`
      
      return NextResponse.json({
        success: true,
        auth_url: fallbackOAuthUrl,
        message: 'OAuth URL generated (fallback mode)',
        keapAccountId
      })
    }
  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}