import { NextResponse } from 'next/server';
import { KeapClientEnhanced } from '@/lib/keap/keap-client-enhanced';

export async function GET() {
  try {
    const apiKey = process.env.KEAP_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Keap API key not configured',
        instructions: 'Please add KEAP_API_KEY to your .env.local file',
        envVars: Object.keys(process.env).filter(k => k.includes('KEAP'))
      }, { status: 500 });
    }

    // Try a direct API call first to debug
    try {
      const testResponse = await fetch('https://api.infusionsoft.com/crm/rest/v1/account/profile', {
        headers: {
          'X-Keap-API-Key': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const responseText = await testResponse.text();
      console.log('Test response status:', testResponse.status);
      console.log('Test response:', responseText);

      if (testResponse.ok) {
        // Now try with the client
        const client = new KeapClientEnhanced({
          apiKey: apiKey,
          debug: true,
          baseUrl: 'https://api.infusionsoft.com/crm/rest',
          version: 'v1' // Try v1 first
        });

        const contacts = await client.getContacts({ limit: 5 });

        return NextResponse.json({
          success: true,
          message: 'Successfully connected to Keap API',
          sample_contacts: contacts.items?.length || 0,
          api_key_masked: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
        });
      } else {
        let errorMessage = 'Failed to connect';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }

        return NextResponse.json({
          success: false,
          error: errorMessage,
          status: testResponse.status,
          instructions: 'Please verify your API key is correct and has not expired',
          api_key_masked: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
        }, { status: testResponse.status });
      }
    } catch (fetchError) {
      console.error('Direct fetch error:', fetchError);

      return NextResponse.json({
        success: false,
        error: 'Network error when connecting to Keap API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        instructions: 'Check if your API key is valid and not expired'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Keap Test Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      instructions: 'Check the server logs for more details'
    }, { status: 500 });
  }
}