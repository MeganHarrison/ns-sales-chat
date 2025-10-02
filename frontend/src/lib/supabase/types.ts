export type Database = {
  public: {
    Tables: {
      sync_contacts: {
        Row: {
          id: string
          keap_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          tags: any | null
          custom_fields: any | null
          keap_created_date: string | null
          keap_last_updated: string | null
          last_synced_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          keap_id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          tags?: any | null
          custom_fields?: any | null
          keap_created_date?: string | null
          keap_last_updated?: string | null
          last_synced_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          keap_id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          tags?: any | null
          custom_fields?: any | null
          keap_created_date?: string | null
          keap_last_updated?: string | null
          last_synced_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      sync_orders: {
        Row: {
          id: string
          keap_id: string
          contact_keap_id: string
          order_title: string | null
          order_total: number | null
          order_status: string | null
          order_date: string | null
          products: any | null
          keap_created_date: string | null
          keap_last_updated: string | null
          last_synced_at: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      sync_tags: {
        Row: {
          id: string
          keap_id: string
          name: string
          description: string | null
          category: string | null
          keap_created_date: string | null
          keap_last_updated: string | null
          last_synced_at: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      sync_subscriptions: {
        Row: {
          id: string
          keap_id: string
          contact_keap_id: string
          product_id: string | null
          status: string
          frequency: string | null
          amount: number | null
          next_charge_date: string | null
          keap_created_date: string | null
          keap_last_updated: string | null
          last_synced_at: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      sync_status: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          keap_id: string
          supabase_id: string | null
          last_synced_at: string
          sync_direction: string
          conflict_status: string
          sync_attempts: number | null
          last_error: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      sync_conflicts: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          keap_data: any
          supabase_data: any
          conflict_fields: any
          resolution_strategy: string
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
    }
    Functions: {
      get_sync_statistics: {
        Args: {}
        Returns: any
      }
      get_sync_health_metrics: {
        Args: {}
        Returns: any
      }
      get_recent_sync_activities: {
        Args: { limit_param?: number }
        Returns: Array<{
          entity_type: string
          entity_id: string
          keap_id: string
          last_synced_at: string
          sync_direction: string
          conflict_status: string
          last_error: string | null
        }>
      }
    }
  }
}