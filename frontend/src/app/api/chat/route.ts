import { NextRequest, NextResponse } from 'next/server';

// Get the Cloudflare Worker URL from environment
const WORKER_URL = process.env.NEXT_PUBLIC_NUTRITION_CHAT_WORKER_URL ||
  'http://localhost:8787'; // Default to local development

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, session_id } = body;

    if (!message || !session_id) {
      return NextResponse.json(
        { error: 'Missing message or session_id' },
        { status: 400 }
      );
    }

    // Forward the request to the Cloudflare Worker
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        session_id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Worker error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get response from chat service' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}