import { NextRequest, NextResponse } from 'next/server';
import { KeapClientEnhanced } from '@/lib/keap/keap-client-enhanced';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.KEAP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Keap API key not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const since = searchParams.get('since') || undefined;
    const until = searchParams.get('until') || undefined;
    const status = searchParams.get('status') || undefined;

    const client = new KeapClientEnhanced({
      apiKey: apiKey,
      enableCache: true,
      debug: true,
      baseUrl: 'https://api.infusionsoft.com/crm/rest',
      version: 'v1' // Use v1 for API key authentication
    });

    const response = await client.getOrders({
      limit,
      offset,
      since,
      until,
      status: status as any
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Keap API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}