import { NextResponse } from 'next/server';
import { KeapClientEnhanced } from '@/lib/keap/keap-client-enhanced';

export async function GET() {
  try {
    const apiKey = process.env.KEAP_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' }, { status: 500 });
    }

    const client = new KeapClientEnhanced({
      apiKey: apiKey,
      baseUrl: 'https://api.infusionsoft.com/crm/rest',
      version: 'v1',
      debug: true
    });

    // Try to fetch raw data from different endpoints
    const debugInfo: any = {};

    // Test contacts endpoint
    try {
      const contactsResponse = await fetch('https://api.infusionsoft.com/crm/rest/v1/contacts?limit=10', {
        headers: {
          'X-Keap-API-Key': apiKey,
          'Accept': 'application/json'
        }
      });
      const contactsData = await contactsResponse.json();
      debugInfo.contacts = {
        status: contactsResponse.status,
        data: contactsData,
        count: contactsData.contacts?.length || 0
      };
    } catch (e) {
      debugInfo.contacts = { error: e.message };
    }

    // Test orders endpoint
    try {
      const ordersResponse = await fetch('https://api.infusionsoft.com/crm/rest/v1/orders?limit=10', {
        headers: {
          'X-Keap-API-Key': apiKey,
          'Accept': 'application/json'
        }
      });
      const ordersData = await ordersResponse.json();
      debugInfo.orders = {
        status: ordersResponse.status,
        data: ordersData,
        count: ordersData.orders?.length || 0
      };
    } catch (e) {
      debugInfo.orders = { error: e.message };
    }

    // Test with client
    try {
      const clientContacts = await client.getContacts({ limit: 5 });
      debugInfo.clientContacts = {
        items: clientContacts.items?.length || 0,
        count: clientContacts.count || 0,
        data: clientContacts
      };
    } catch (e) {
      debugInfo.clientContacts = { error: e.message };
    }

    try {
      const clientOrders = await client.getOrders({ limit: 5 });
      debugInfo.clientOrders = {
        items: clientOrders.items?.length || 0,
        count: clientOrders.count || 0,
        data: clientOrders
      };
    } catch (e) {
      debugInfo.clientOrders = { error: e.message };
    }

    return NextResponse.json({
      success: true,
      apiKey: `${apiKey.substring(0, 10)}...`,
      debugInfo
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}