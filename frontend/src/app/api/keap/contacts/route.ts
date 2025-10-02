import { NextRequest, NextResponse } from 'next/server';
import { KeapClientEnhanced } from '@/lib/keap/keap-client-enhanced';

export async function GET(request: NextRequest) {
  try {
    // Get API key from environment variable (server-side only)
    const apiKey = process.env.KEAP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Keap API key not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || undefined;
    const lifecycle_stage = searchParams.get('lifecycle_stage') || undefined;

    // Initialize Keap client
    const client = new KeapClientEnhanced({
      apiKey: apiKey,
      enableCache: true,
      cacheTTL: 300000, // 5 minutes
      debug: true,
      baseUrl: 'https://api.infusionsoft.com/crm/rest',
      version: 'v1' // Use v1 for API key authentication
    });

    // Fetch contacts from Keap
    const response = await client.getContacts({
      limit,
      offset,
      search_term: search,
      lifecycle_stage: lifecycle_stage as any
    });

    // Return successful response
    return NextResponse.json(response);

  } catch (error) {
    console.error('Keap API Error:', error);

    // Return error response with details
    return NextResponse.json(
      {
        error: 'Failed to fetch contacts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}