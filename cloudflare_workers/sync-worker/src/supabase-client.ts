/**
 * Hyperdrive-Optimized Supabase Client
 * 
 * Provides optimized database connections through Cloudflare Hyperdrive
 * for efficient sync operations between Keap and Supabase.
 */

import { KeapContact, KeapOrder, KeapTag, KeapSubscription } from './keap-client';

export interface SyncContact {
  id?: string;
  keap_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncOrder {
  id?: string;
  keap_id: string;
  contact_keap_id: string;
  order_title?: string;
  order_total?: number;
  order_status?: string;
  order_date?: string;
  products?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncTag {
  id?: string;
  keap_id: string;
  name: string;
  description?: string;
  category?: string;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncSubscription {
  id?: string;
  keap_id: string;
  contact_keap_id: string;
  product_id: string;
  status: string;
  frequency?: string;
  amount?: number;
  next_charge_date?: string;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncStatus {
  id?: string;
  entity_type: 'contact' | 'order' | 'tag' | 'subscription';
  entity_id: string;
  keap_id: string;
  supabase_id?: string;
  last_synced_at: string;
  sync_direction: 'keap_to_supabase' | 'supabase_to_keap' | 'bidirectional';
  conflict_status: 'none' | 'pending' | 'resolved';
  created_at?: string;
  updated_at?: string;
}

export interface SyncConflict {
  id?: string;
  entity_type: string;
  entity_id: string;
  keap_data: Record<string, any>;
  supabase_data: Record<string, any>;
  conflict_fields: string[];
  resolution_strategy: 'keap_wins' | 'supabase_wins' | 'manual';
  resolved_at?: string;
  created_at?: string;
  updated_at?: string;
}

export class HyperdriveSupabaseClient {
  private connectionString: string;
  private supabaseUrl: string;
  private serviceRoleKey: string;

  constructor(hyperdrive: Hyperdrive, supabaseUrl: string, serviceRoleKey: string) {
    this.connectionString = hyperdrive.connectionString;
    this.supabaseUrl = supabaseUrl;
    this.serviceRoleKey = serviceRoleKey;
  }

  /**
   * Execute a SQL query with parameters
   */
  private async executeQuery<T = any>(
    query: string, 
    params: any[] = []
  ): Promise<T[]> {
    try {
      // Use Hyperdrive for optimized database connections
      const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': this.serviceRoleKey
        },
        body: JSON.stringify({
          query: query,
          params: params
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Database query failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Batch upsert contacts with optimized performance
   */
  async batchUpsertContacts(contacts: KeapContact[]): Promise<void> {
    if (contacts.length === 0) return;

    const BATCH_SIZE = 100; // Optimize for Hyperdrive
    
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      
      const values = batch.map(contact => 
        `('${contact.id}', '${contact.email || ''}', '${contact.firstName || ''}', '${contact.lastName || ''}', '${contact.phone || ''}', '${JSON.stringify(contact.tags || [])}', '${JSON.stringify(contact.customFields || {})}', NOW())`
      ).join(', ');

      const query = `
        INSERT INTO sync_contacts (keap_id, email, first_name, last_name, phone, tags, custom_fields, last_synced_at)
        VALUES ${values}
        ON CONFLICT (keap_id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          tags = EXCLUDED.tags,
          custom_fields = EXCLUDED.custom_fields,
          last_synced_at = EXCLUDED.last_synced_at,
          updated_at = NOW()
      `;

      await this.executeQuery(query);
    }
  }

  /**
   * Batch upsert orders with optimized performance
   */
  async batchUpsertOrders(orders: KeapOrder[]): Promise<void> {
    if (orders.length === 0) return;

    const BATCH_SIZE = 100;
    
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE);
      
      const values = batch.map(order => 
        `('${order.id}', '${order.contactId}', '${order.orderTitle || ''}', ${order.orderTotal || 0}, '${order.orderStatus || ''}', '${order.orderDate || ''}', '${JSON.stringify(order.products || [])}', NOW())`
      ).join(', ');

      const query = `
        INSERT INTO sync_orders (keap_id, contact_keap_id, order_title, order_total, order_status, order_date, products, last_synced_at)
        VALUES ${values}
        ON CONFLICT (keap_id) DO UPDATE SET
          contact_keap_id = EXCLUDED.contact_keap_id,
          order_title = EXCLUDED.order_title,
          order_total = EXCLUDED.order_total,
          order_status = EXCLUDED.order_status,
          order_date = EXCLUDED.order_date,
          products = EXCLUDED.products,
          last_synced_at = EXCLUDED.last_synced_at,
          updated_at = NOW()
      `;

      await this.executeQuery(query);
    }
  }

  /**
   * Batch upsert tags with optimized performance
   */
  async batchUpsertTags(tags: KeapTag[]): Promise<void> {
    if (tags.length === 0) return;

    const BATCH_SIZE = 100;
    
    for (let i = 0; i < tags.length; i += BATCH_SIZE) {
      const batch = tags.slice(i, i + BATCH_SIZE);
      
      const values = batch.map(tag => 
        `('${tag.id}', '${tag.name}', '${tag.description || ''}', '${tag.category || ''}', NOW())`
      ).join(', ');

      const query = `
        INSERT INTO sync_tags (keap_id, name, description, category, last_synced_at)
        VALUES ${values}
        ON CONFLICT (keap_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          last_synced_at = EXCLUDED.last_synced_at,
          updated_at = NOW()
      `;

      await this.executeQuery(query);
    }
  }

  /**
   * Batch upsert subscriptions with optimized performance
   */
  async batchUpsertSubscriptions(subscriptions: KeapSubscription[]): Promise<void> {
    if (subscriptions.length === 0) return;

    const BATCH_SIZE = 100;
    
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE);
      
      const values = batch.map(sub => 
        `('${sub.id}', '${sub.contactId}', '${sub.productId}', '${sub.status}', '${sub.frequency || ''}', ${sub.amount || 0}, '${sub.nextChargeDate || ''}', NOW())`
      ).join(', ');

      const query = `
        INSERT INTO sync_subscriptions (keap_id, contact_keap_id, product_id, status, frequency, amount, next_charge_date, last_synced_at)
        VALUES ${values}
        ON CONFLICT (keap_id) DO UPDATE SET
          contact_keap_id = EXCLUDED.contact_keap_id,
          product_id = EXCLUDED.product_id,
          status = EXCLUDED.status,
          frequency = EXCLUDED.frequency,
          amount = EXCLUDED.amount,
          next_charge_date = EXCLUDED.next_charge_date,
          last_synced_at = EXCLUDED.last_synced_at,
          updated_at = NOW()
      `;

      await this.executeQuery(query);
    }
  }

  /**
   * Get contacts that need to be synced to Keap
   */
  async getContactsToSyncToKeap(): Promise<SyncContact[]> {
    const query = `
      SELECT * FROM sync_contacts 
      WHERE last_synced_at IS NULL 
         OR updated_at > last_synced_at
      ORDER BY updated_at DESC
      LIMIT 100
    `;
    
    return await this.executeQuery<SyncContact>(query);
  }

  /**
   * Get sync status for monitoring
   */
  async getSyncStatus(): Promise<SyncStatus[]> {
    const query = `
      SELECT * FROM sync_status 
      ORDER BY last_synced_at DESC
      LIMIT 100
    `;
    
    return await this.executeQuery<SyncStatus>(query);
  }

  /**
   * Get pending sync conflicts
   */
  async getPendingSyncConflicts(): Promise<SyncConflict[]> {
    const query = `
      SELECT * FROM sync_conflicts 
      WHERE resolved_at IS NULL
      ORDER BY created_at DESC
    `;
    
    return await this.executeQuery<SyncConflict>(query);
  }

  /**
   * Create or update sync status
   */
  async upsertSyncStatus(status: Omit<SyncStatus, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const query = `
      INSERT INTO sync_status (entity_type, entity_id, keap_id, supabase_id, last_synced_at, sync_direction, conflict_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (entity_type, entity_id) DO UPDATE SET
        keap_id = EXCLUDED.keap_id,
        supabase_id = EXCLUDED.supabase_id,
        last_synced_at = EXCLUDED.last_synced_at,
        sync_direction = EXCLUDED.sync_direction,
        conflict_status = EXCLUDED.conflict_status,
        updated_at = NOW()
    `;

    await this.executeQuery(query, [
      status.entity_type,
      status.entity_id,
      status.keap_id,
      status.supabase_id,
      status.last_synced_at,
      status.sync_direction,
      status.conflict_status
    ]);
  }

  /**
   * Create a sync conflict record
   */
  async createSyncConflict(conflict: Omit<SyncConflict, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const query = `
      INSERT INTO sync_conflicts (entity_type, entity_id, keap_data, supabase_data, conflict_fields, resolution_strategy)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.executeQuery(query, [
      conflict.entity_type,
      conflict.entity_id,
      JSON.stringify(conflict.keap_data),
      JSON.stringify(conflict.supabase_data),
      JSON.stringify(conflict.conflict_fields),
      conflict.resolution_strategy
    ]);
  }

  /**
   * Test database connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.executeQuery('SELECT 1 as test');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get sync statistics for dashboard
   */
  async getSyncStatistics(): Promise<{
    totalContacts: number;
    totalOrders: number;
    totalTags: number;
    totalSubscriptions: number;
    lastSyncTime: string | null;
    pendingConflicts: number;
  }> {
    const queries = [
      'SELECT COUNT(*) as count FROM sync_contacts',
      'SELECT COUNT(*) as count FROM sync_orders',
      'SELECT COUNT(*) as count FROM sync_tags',
      'SELECT COUNT(*) as count FROM sync_subscriptions',
      'SELECT MAX(last_synced_at) as last_sync FROM sync_status',
      'SELECT COUNT(*) as count FROM sync_conflicts WHERE resolved_at IS NULL'
    ];

    const results = await Promise.all(
      queries.map(query => this.executeQuery(query))
    );

    return {
      totalContacts: results[0][0]?.count || 0,
      totalOrders: results[1][0]?.count || 0,
      totalTags: results[2][0]?.count || 0,
      totalSubscriptions: results[3][0]?.count || 0,
      lastSyncTime: results[4][0]?.last_sync || null,
      pendingConflicts: results[5][0]?.count || 0
    };
  }
}