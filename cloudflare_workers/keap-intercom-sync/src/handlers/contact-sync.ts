/**
 * Contact Sync Logic
 * Synchronizes contacts from Keap to Intercom
 */

import type { Env, IntercomContact, SyncLog } from '../types';
import { KeapClient } from '../keap-client';
import { IntercomClient } from '../intercom-client';

interface SyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'linked' | 'failed';
  intercomContact?: IntercomContact;
  error?: string;
}

/**
 * Sync a Keap contact to Intercom
 * This is the main function that orchestrates the sync process
 */
export async function syncContactToIntercom(
  keapContactId: number,
  keapClient: KeapClient,
  intercomClient: IntercomClient,
  env: Env
): Promise<SyncResult> {
  try {
    // 1. Fetch contact from Keap
    console.log(`Fetching Keap contact ${keapContactId}`);
    const keapContact = await keapClient.getContact(keapContactId);

    // 2. Extract contact data
    const contactData = keapClient.extractContactData(keapContact);

    if (!contactData.email) {
      console.warn(
        `Keap contact ${keapContactId} has no email, skipping sync`
      );
      return {
        success: false,
        action: 'failed',
        error: 'No email address found',
      };
    }

    // 3. Sync to Intercom (find or create, then link with Keap ID)
    console.log(`Syncing contact ${contactData.email} to Intercom`);
    const { contact, action } = await intercomClient.syncKeapContact(
      contactData.email,
      keapContactId.toString(),
      {
        name: contactData.name,
        phone: contactData.phone,
        custom_attributes: contactData.customAttributes,
      }
    );

    // 4. Log the sync to Supabase
    await logSync(
      {
        keap_contact_id: keapContactId.toString(),
        intercom_contact_id: contact.id,
        sync_status: 'synced',
        sync_direction: 'keap_to_intercom',
        synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      env
    );

    console.log(
      `Successfully ${action} contact in Intercom: ${contact.id}`
    );

    return {
      success: true,
      action,
      intercomContact: contact,
    };
  } catch (error) {
    console.error(`Error syncing contact ${keapContactId}:`, error);

    // Log failure to Supabase
    await logSync(
      {
        keap_contact_id: keapContactId.toString(),
        sync_status: 'failed',
        sync_direction: 'keap_to_intercom',
        error_message:
          error instanceof Error ? error.message : 'Unknown error',
        synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      env
    );

    return {
      success: false,
      action: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log sync operation to Supabase
 */
async function logSync(log: SyncLog, env: Env): Promise<void> {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/keap_intercom_sync_logs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(log),
      }
    );

    if (!response.ok) {
      console.error('Failed to log sync to Supabase:', await response.text());
    }
  } catch (error) {
    console.error('Error logging sync:', error);
    // Don't throw - logging failure shouldn't break the sync
  }
}

/**
 * Batch sync multiple contacts
 */
export async function batchSyncContacts(
  keapContactIds: number[],
  keapClient: KeapClient,
  intercomClient: IntercomClient,
  env: Env
): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: SyncResult[];
}> {
  const results: SyncResult[] = [];

  for (const contactId of keapContactIds) {
    const result = await syncContactToIntercom(
      contactId,
      keapClient,
      intercomClient,
      env
    );
    results.push(result);

    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: keapContactIds.length,
    succeeded,
    failed,
    results,
  };
}
