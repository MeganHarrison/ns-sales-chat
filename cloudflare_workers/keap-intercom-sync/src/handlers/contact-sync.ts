/**
 * Contact Sync Logic
 * Bidirectional synchronization between Keap and Intercom
 */

import type { Env, IntercomContact, SyncLog } from '../types';
import { KeapClient, KeapContact } from '../keap-client';
import { IntercomClient } from '../intercom-client';

interface SyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'linked' | 'failed';
  intercomContact?: IntercomContact;
  keapContact?: KeapContact;
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
 * Sync an Intercom contact to Keap
 * PRIMARY SYNC DIRECTION: Intercom → Keap
 * This is triggered when a user/contact is created or updated in Intercom
 */
export async function syncContactToKeap(
  intercomContactId: string,
  email: string,
  name?: string,
  phone?: string,
  keapClient?: KeapClient,
  intercomClient?: IntercomClient,
  env?: Env
): Promise<SyncResult> {
  try {
    if (!keapClient || !intercomClient || !env) {
      throw new Error('Required clients and env not provided');
    }

    // 1. Fetch full contact details from Intercom if needed
    console.log(`Processing Intercom contact ${intercomContactId}`);

    if (!email) {
      console.warn(
        `Intercom contact ${intercomContactId} has no email, skipping sync`
      );
      return {
        success: false,
        action: 'failed',
        error: 'No email address found',
      };
    }

    // 2. Search for existing contact in Keap by email
    console.log(`Searching for contact with email ${email} in Keap`);
    const existingKeapContact = await keapClient.searchContactByEmail(email);

    let keapContact: KeapContact;
    let action: 'created' | 'updated' | 'linked';

    if (existingKeapContact) {
      // Contact exists - update it
      console.log(`Updating existing Keap contact ${existingKeapContact.id}`);

      const updateData: Record<string, unknown> = {};
      if (name) updateData.given_name = name.split(' ')[0];
      if (name && name.includes(' ')) updateData.family_name = name.split(' ').slice(1).join(' ');
      if (phone) updateData.phone = phone;

      keapContact = await keapClient.updateContact(
        existingKeapContact.id,
        updateData
      );
      action = 'updated';
    } else {
      // Contact doesn't exist - create it
      console.log(`Creating new Keap contact for ${email}`);

      const createData: Record<string, unknown> = {
        email_addresses: [{ email, field: 'EMAIL1' }],
      };

      if (name) {
        createData.given_name = name.split(' ')[0];
        if (name.includes(' ')) {
          createData.family_name = name.split(' ').slice(1).join(' ');
        }
      }

      if (phone) {
        createData.phone_numbers = [{ number: phone, field: 'PHONE1' }];
      }

      keapContact = await keapClient.createContact(createData);
      action = 'created';
    }

    // 3. Link Intercom contact with Keap contact ID
    console.log(`Linking Intercom contact ${intercomContactId} with Keap contact ${keapContact.id}`);
    const linkedContact = await intercomClient.linkKeapContact(intercomContactId, keapContact.id.toString());
    console.log(`✅ Successfully linked! Intercom external_id is now: ${linkedContact.external_id}`);

    // 4. Log the sync to Supabase
    await logSync(
      {
        keap_contact_id: keapContact.id.toString(),
        intercom_contact_id: intercomContactId,
        sync_status: 'synced',
        sync_direction: 'intercom_to_keap',
        synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      env
    );

    console.log(
      `Successfully ${action} contact in Keap: ${keapContact.id}`
    );

    return {
      success: true,
      action,
      keapContact,
    };
  } catch (error) {
    console.error(`Error syncing Intercom contact ${intercomContactId} to Keap:`, error);

    // Log failure to Supabase
    if (env) {
      await logSync(
        {
          intercom_contact_id: intercomContactId,
          sync_status: 'failed',
          sync_direction: 'intercom_to_keap',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        env
      );
    }

    return {
      success: false,
      action: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
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
