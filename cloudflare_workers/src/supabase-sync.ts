import { createClient } from '@supabase/supabase-js';

export interface SupabaseOrder {
  keap_order_id: string;
  title: string;
  status: string;
  total: number;
  order_type: string;
  creation_date: string;
  order_date: string;
  contact: any;
  order_items: any[];
  shipping_information?: any;
}

export class SupabaseSync {
  private supabase: any;

  constructor(url: string, serviceKey: string) {
    this.supabase = createClient(url, serviceKey);
  }

  async createOrdersTable() {
    // First check if table exists
    const { data: tables } = await this.supabase
      .rpc('get_tables', { schema_name: 'public' })
      .select('table_name');

    if (tables?.some((t: any) => t.table_name === 'keap_orders')) {
      console.log('Table keap_orders already exists');
      return { success: true, message: 'Table already exists' };
    }

    // Create table using SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS keap_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        keap_order_id TEXT UNIQUE NOT NULL,
        title TEXT,
        status TEXT,
        total DECIMAL(10,2),
        order_type TEXT,
        creation_date TIMESTAMP WITH TIME ZONE,
        order_date TIMESTAMP WITH TIME ZONE,
        contact JSONB,
        order_items JSONB DEFAULT '[]'::JSONB,
        shipping_information JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_keap_orders_keap_id ON keap_orders(keap_order_id);
      CREATE INDEX IF NOT EXISTS idx_keap_orders_status ON keap_orders(status);
      CREATE INDEX IF NOT EXISTS idx_keap_orders_date ON keap_orders(order_date);
    `;

    const { error } = await this.supabase.rpc('exec_sql', { sql: createTableSQL });

    if (error) {
      throw new Error(`Failed to create table: ${JSON.stringify(error)}`);
    }

    return { success: true, message: 'Table created successfully' };
  }

  async syncOrders(orders: SupabaseOrder[]) {
    // First ensure table exists
    await this.createOrdersTable();

    // Upsert orders
    const { data, error } = await this.supabase
      .from('keap_orders')
      .upsert(orders, {
        onConflict: 'keap_order_id',
        returning: 'minimal'
      });

    if (error) {
      throw new Error(`Failed to sync orders: ${JSON.stringify(error)}`);
    }

    return {
      success: true,
      synced: orders.length,
      data
    };
  }

  async getOrders(limit = 100) {
    const { data, error } = await this.supabase
      .from('keap_orders')
      .select('*')
      .order('order_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch orders: ${JSON.stringify(error)}`);
    }

    return data;
  }
}