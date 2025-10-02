import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KeapClientEnhanced } from './keap-client-enhanced';
import {
  KeapContact,
  KeapTag,
  KeapListResponse,
} from './keap-types';

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  keapId: string;
  error: string;
  details?: any;
}

export interface SyncConfig {
  batchSize: number;
  syncEnabled: boolean;
  webhookEnabled: boolean;
  activeClientTags: string[];
}

export interface SupabaseContact {
  id?: string;
  keap_id: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  lifecycle_stage?: string;
  lead_score?: number;
  tags: any[];
  tag_ids: number[];
  custom_fields: any;
  is_active_client?: boolean;
  phone_numbers?: any[];
  addresses?: any[];
  date_created?: string;
  last_updated?: string;
  keap_last_updated?: string;
  sync_status: 'pending' | 'synced' | 'failed' | 'skipped';
  sync_last_attempt?: string;
  sync_last_success?: string;
  sync_error?: string;
}

export class KeapSyncService {
  private supabase: SupabaseClient;
  private keapClient: KeapClientEnhanced;
  private config: SyncConfig;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    keapApiKey: string,
    config?: Partial<SyncConfig>
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.keapClient = new KeapClientEnhanced({
      apiKey: keapApiKey,
      baseUrl: 'https://api.infusionsoft.com/crm/rest',
      version: 'v1',
      enableCache: false,
    });

    this.config = {
      batchSize: 100,
      syncEnabled: true,
      webhookEnabled: false,
      activeClientTags: ['Active Client', 'active client', 'Active client'],
      ...config,
    };
  }

  async performInitialSync(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0,
    };

    try {
      await this.logSyncEvent('full', 'contact', null, null, 'create', 'success', {
        message: 'Initial sync started',
      });

      const countResponse = await this.keapClient.getContacts({ limit: 1 });
      const totalContacts = countResponse.count || 0;

      console.log(`Starting initial sync of ${totalContacts} contacts...`);

      let offset = 0;
      while (offset < totalContacts) {
        try {
          const response = await this.keapClient.getContacts({
            limit: this.config.batchSize,
            offset,
          });

          if (!response.items || response.items.length === 0) {
            break;
          }

          const batchResult = await this.processBatch(response.items, 'create');

          result.totalProcessed += batchResult.processed;
          result.created += batchResult.created;
          result.updated += batchResult.updated;
          result.failed += batchResult.failed;
          result.skipped += batchResult.skipped;
          result.errors.push(...batchResult.errors);

          offset += this.config.batchSize;

          const progress = Math.round((offset / totalContacts) * 100);
          console.log(`Sync progress: ${progress}% (${offset}/${totalContacts})`);

          await this.delay(100);
        } catch (batchError) {
          console.error(`Failed to process batch at offset ${offset}:`, batchError);
          result.errors.push({
            keapId: `batch-${offset}`,
            error: batchError instanceof Error ? batchError.message : 'Unknown error',
          });
        }
      }

      await this.updateSyncConfig('last_full_sync', new Date().toISOString());

      result.duration = Date.now() - startTime;
      console.log(`Initial sync completed in ${result.duration}ms`);

    } catch (error) {
      result.success = false;
      result.errors.push({
        keapId: 'initial-sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    await this.logSyncEvent('full', 'contact', null, null, 'create',
      result.success ? 'success' : 'failed',
      {
        result,
        duration_ms: result.duration,
      },
      result.success ? null : 'Initial sync failed',
      null,
      result.duration
    );

    return result;
  }

  async performIncrementalSync(since?: Date): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0,
    };

    try {
      if (!since) {
        const config = await this.getSyncConfig('last_incremental_sync');
        since = config ? new Date(config) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      console.log(`Starting incremental sync since ${since.toISOString()}...`);

      const response = await this.keapClient.getContacts({
        limit: 1000,
        since: since.toISOString(),
      });

      if (response.items && response.items.length > 0) {
        const batchResult = await this.processBatch(response.items, 'update');

        result.totalProcessed = batchResult.processed;
        result.created = batchResult.created;
        result.updated = batchResult.updated;
        result.failed = batchResult.failed;
        result.skipped = batchResult.skipped;
        result.errors = batchResult.errors;
      }

      await this.updateSyncConfig('last_incremental_sync', new Date().toISOString());

      result.duration = Date.now() - startTime;
      console.log(`Incremental sync completed in ${result.duration}ms`);

    } catch (error) {
      result.success = false;
      result.errors.push({
        keapId: 'incremental-sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    await this.logSyncEvent('incremental', 'contact', null, null, 'update',
      result.success ? 'success' : 'failed',
      {
        since: since?.toISOString(),
        result,
      },
      result.success ? null : 'Incremental sync failed',
      null,
      result.duration
    );

    return result;
  }

  async syncContact(keapId: string): Promise<void> {
    try {
      const contact = await this.keapClient.getContact(keapId);
      await this.upsertContact(contact);
    } catch (error) {
      console.error(`Failed to sync contact ${keapId}:`, error);
      throw error;
    }
  }

  private async processBatch(
    contacts: KeapContact[],
    operation: 'create' | 'update'
  ): Promise<{
    processed: number;
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    errors: SyncError[];
  }> {
    const result = {
      processed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as SyncError[],
    };

    for (const contact of contacts) {
      try {
        const { isNew, isUpdated } = await this.upsertContact(contact);

        result.processed++;
        if (isNew) {
          result.created++;
        } else if (isUpdated) {
          result.updated++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          keapId: contact.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        });

        await this.logSyncEvent('manual', 'contact', contact.id, contact.id, operation, 'failed',
          { contact },
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    return result;
  }

  private async upsertContact(keapContact: KeapContact): Promise<{ isNew: boolean; isUpdated: boolean }> {
    try {
      const supabaseContact = this.transformContact(keapContact);

      const { data: existing, error: fetchError } = await this.supabase
        .from('keap_contacts')
        .select('id, keap_last_updated')
        .eq('keap_id', supabaseContact.keap_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let isNew = false;
      let isUpdated = false;

      if (!existing) {
        const { error: insertError } = await this.supabase
          .from('keap_contacts')
          .insert(supabaseContact);

        if (insertError) throw insertError;
        isNew = true;

        await this.logSyncEvent('manual', 'contact', keapContact.id, keapContact.id, 'create', 'success', {
          contact: supabaseContact,
        });
      } else {
        const existingDate = existing.keap_last_updated ? new Date(existing.keap_last_updated) : new Date(0);
        const newDate = keapContact.last_updated ? new Date(keapContact.last_updated) : new Date();

        if (newDate > existingDate) {
          const { error: updateError } = await this.supabase
            .from('keap_contacts')
            .update({
              ...supabaseContact,
              sync_last_success: new Date().toISOString(),
            })
            .eq('keap_id', supabaseContact.keap_id);

          if (updateError) throw updateError;
          isUpdated = true;

          await this.checkForTagChanges(existing.id, keapContact);

          await this.logSyncEvent('manual', 'contact', keapContact.id, keapContact.id, 'update', 'success', {
            changes: {
              old: existing,
              new: supabaseContact,
            },
          });
        }
      }

      await this.syncContactTags(supabaseContact.keap_id, keapContact.tag_ids || []);

      return { isNew, isUpdated };
    } catch (error) {
      console.error(`Failed to upsert contact ${keapContact.id}:`, error);
      throw error;
    }
  }

  private transformContact(keapContact: KeapContact): SupabaseContact {
    const tags = keapContact.tags || [];

    return {
      keap_id: keapContact.id,
      email: keapContact.email_addresses?.[0]?.email || null,
      given_name: keapContact.given_name || null,
      family_name: keapContact.family_name || null,
      company_name: keapContact.company_name || null,
      lifecycle_stage: keapContact.lifecycle_stage || null,
      lead_score: keapContact.lead_score || null,
      tags: tags,
      tag_ids: keapContact.tag_ids || [],
      custom_fields: keapContact.custom_fields || {},
      phone_numbers: keapContact.phone_numbers || [],
      addresses: keapContact.addresses || [],
      date_created: keapContact.date_created || null,
      last_updated: keapContact.last_updated || null,
      keap_last_updated: keapContact.last_updated || null,
      sync_status: 'synced',
      sync_last_attempt: new Date().toISOString(),
      sync_last_success: new Date().toISOString(),
      sync_error: null,
    };
  }

  private async checkForTagChanges(contactId: string, newContact: KeapContact): Promise<void> {
    try {
      const { data: currentContact } = await this.supabase
        .from('keap_contacts')
        .select('tags, tag_ids')
        .eq('id', contactId)
        .single();

      if (!currentContact) return;

      const currentTagIds = new Set(currentContact.tag_ids || []);
      const newTagIds = new Set(newContact.tag_ids || []);

      const addedTags: number[] = [];
      const removedTags: number[] = [];

      for (const tagId of newTagIds) {
        if (!currentTagIds.has(tagId)) {
          addedTags.push(tagId);
        }
      }

      for (const tagId of currentTagIds) {
        if (!newTagIds.has(tagId)) {
          removedTags.push(tagId);
        }
      }

      if (addedTags.length > 0 || removedTags.length > 0) {
        const changes: any = {};

        if (addedTags.length > 0) {
          changes.added_tags = addedTags;
        }

        if (removedTags.length > 0) {
          changes.removed_tags = removedTags;
        }

        await this.logSyncEvent('webhook', 'contact', contactId, newContact.id, 'update', 'success', changes);
      }
    } catch (error) {
      console.error('Failed to check tag changes:', error);
    }
  }

  private async syncContactTags(keapId: string, tagIds: number[]): Promise<void> {
    try {
      const { data: contact } = await this.supabase
        .from('keap_contacts')
        .select('id')
        .eq('keap_id', keapId)
        .single();

      if (!contact) return;

      await this.supabase
        .from('keap_contact_tags')
        .delete()
        .eq('contact_id', contact.id);

      if (tagIds.length > 0) {
        const tagRelations = tagIds.map(tagId => ({
          contact_id: contact.id,
          tag_id: tagId,
          applied_at: new Date().toISOString(),
        }));

        await this.supabase
          .from('keap_contact_tags')
          .insert(tagRelations);
      }
    } catch (error) {
      console.error(`Failed to sync tags for contact ${keapId}:`, error);
    }
  }

  private async getSyncConfig(key: string): Promise<any> {
    try {
      const { data } = await this.supabase
        .from('keap_sync_config')
        .select('config_value')
        .eq('config_key', key)
        .single();

      return data?.config_value;
    } catch (error) {
      console.error(`Failed to get config ${key}:`, error);
      return null;
    }
  }

  private async updateSyncConfig(key: string, value: any): Promise<void> {
    try {
      await this.supabase
        .from('keap_sync_config')
        .upsert({
          config_key: key,
          config_value: value,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error(`Failed to update config ${key}:`, error);
    }
  }

  private async logSyncEvent(
    syncType: string,
    entityType: string,
    entityId: string | null,
    keapId: string | null,
    operation: string,
    status: string,
    changes?: any,
    errorMessage?: string | null,
    errorDetails?: any,
    duration?: number
  ): Promise<void> {
    try {
      await this.supabase
        .from('keap_sync_logs')
        .insert({
          sync_type: syncType,
          entity_type: entityType,
          entity_id: entityId,
          keap_id: keapId,
          operation: operation,
          status: status,
          changes: changes || null,
          error_message: errorMessage || null,
          error_details: errorDetails || null,
          duration_ms: duration || null,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log sync event:', error);
    }
  }

  async getSyncStatistics(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_sync_statistics');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get sync statistics:', error);
      return null;
    }
  }

  async getActiveClients(): Promise<SupabaseContact[]> {
    try {
      const { data, error } = await this.supabase
        .from('active_clients')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get active clients:', error);
      return [];
    }
  }

  async getClientStatusChanges(days: number = 7): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('client_status_changes')
        .select('*')
        .gte('changed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get client status changes:', error);
      return [];
    }
  }

  async cleanOldSyncLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('clean_old_sync_logs', { days_to_keep: daysToKeep });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Failed to clean old sync logs:', error);
      return 0;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}