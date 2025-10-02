import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Sample tags data for testing
    const sampleTags = [
      {
        id: '1',
        keap_id: 'TAG001',
        name: 'VIP Customer',
        description: 'High-value customers with repeat purchases',
        category: 'Customer Status',
        created_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        contact_count: 150
      },
      {
        id: '2',
        keap_id: 'TAG002',
        name: 'Newsletter Subscriber',
        description: 'Subscribed to weekly newsletter',
        category: 'Email Marketing',
        created_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        contact_count: 523
      },
      {
        id: '3',
        keap_id: 'TAG003',
        name: 'Product Launch Interest',
        description: 'Interested in upcoming product launches',
        category: 'Marketing',
        created_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        contact_count: 89
      },
      {
        id: '4',
        keap_id: 'TAG004',
        name: 'Support Ticket Open',
        description: 'Has an open support ticket',
        category: 'Support',
        created_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        contact_count: 12
      },
      {
        id: '5',
        keap_id: 'TAG005',
        name: 'Referral Partner',
        description: 'Active referral partner',
        category: 'Partnership',
        created_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        contact_count: 34
      }
    ]

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${sampleTags.length} tags`,
      tags: sampleTags
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      lastSync: new Date().toISOString(),
      status: 'ready',
      tagCount: 5
    })

  } catch (error) {
    console.error('Status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}