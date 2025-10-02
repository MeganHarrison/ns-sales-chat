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