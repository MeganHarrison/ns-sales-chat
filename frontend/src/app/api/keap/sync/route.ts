import { NextRequest, NextResponse } from 'next/server';
import { KeapSyncService } from '@/lib/keap/sync-service';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const keapApiKey = process.env.KEAP_API_KEY;

    if (!supabaseUrl || !supabaseKey || !keapApiKey) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { type = 'incremental', since } = body;

    const syncService = new KeapSyncService(
      supabaseUrl,
      supabaseKey,
      keapApiKey
    );

    let result;

    switch (type) {
      case 'full':
        result = await syncService.performInitialSync();
        break;

      case 'incremental':
        const sinceDate = since ? new Date(since) : undefined;
        result = await syncService.performIncrementalSync(sinceDate);
        break;

      case 'contact':
        if (!body.keapId) {
          return NextResponse.json(
            { error: 'keapId is required for contact sync' },
            { status: 400 }
          );
        }
        await syncService.syncContact(body.keapId);
        result = {
          success: true,
          message: `Contact ${body.keapId} synced successfully`,
        };
        break;

      default:
        return NextResponse.json(
          { error: `Invalid sync type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Sync API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform sync',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const keapApiKey = process.env.KEAP_API_KEY;

    if (!supabaseUrl || !supabaseKey || !keapApiKey) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    const syncService = new KeapSyncService(
      supabaseUrl,
      supabaseKey,
      keapApiKey
    );

    const stats = await syncService.getSyncStatistics();

    return NextResponse.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Sync Stats Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get sync statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}