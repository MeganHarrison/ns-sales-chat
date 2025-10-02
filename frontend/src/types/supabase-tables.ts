export type Database = {
  public: {
    Tables: {
      keap_tags: {
        Row: {
          id: string
          keap_id: string
          name: string
          description: string | null
          category: string | null
          created_date: string | null
          last_updated: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          keap_id: string
          name: string
          description?: string | null
          category?: string | null
          created_date?: string | null
          last_updated?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          keap_id?: string
          name?: string
          description?: string | null
          category?: string | null
          created_date?: string | null
          last_updated?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      request_offs: {
        Row: {
          id: string
          employee_name: string
          request_date: string
          start_date: string
          end_date: string
          reason: string | null
          status: 'pending' | 'approved' | 'rejected'
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_name: string
          request_date: string
          start_date: string
          end_date: string
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_name?: string
          request_date?: string
          start_date?: string
          end_date?: string
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cancellations: {
        Row: {
          id: string
          order_id: string | null
          subscription_id: string | null
          customer_name: string
          customer_email: string
          cancellation_date: string
          reason: string | null
          status: 'pending' | 'processed' | 'refunded'
          refund_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          subscription_id?: string | null
          customer_name: string
          customer_email: string
          cancellation_date: string
          reason?: string | null
          status?: 'pending' | 'processed' | 'refunded'
          refund_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          subscription_id?: string | null
          customer_name?: string
          customer_email?: string
          cancellation_date?: string
          reason?: string | null
          status?: 'pending' | 'processed' | 'refunded'
          refund_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
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
          created_at: string
          updated_at: string
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
          created_at?: string
          updated_at?: string
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
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          keap_id: string
          contact_keap_id: string
          product_id: string | null
          product_name: string | null
          status: string
          frequency: string | null
          amount: number | null
          next_charge_date: string | null
          keap_created_date: string | null
          keap_last_updated: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          keap_id: string
          contact_keap_id: string
          product_id?: string | null
          product_name?: string | null
          status: string
          frequency?: string | null
          amount?: number | null
          next_charge_date?: string | null
          keap_created_date?: string | null
          keap_last_updated?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          keap_id?: string
          contact_keap_id?: string
          product_id?: string | null
          product_name?: string | null
          status?: string
          frequency?: string | null
          amount?: number | null
          next_charge_date?: string | null
          keap_created_date?: string | null
          keap_last_updated?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          keap_id: string
          contact_keap_id: string
          order_title: string | null
          order_total: number | null
          order_status: string | null
          order_date: string | null
          products: any | null
          shipping_info: any | null
          keap_created_date: string | null
          keap_last_updated: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          keap_id: string
          contact_keap_id: string
          order_title?: string | null
          order_total?: number | null
          order_status?: string | null
          order_date?: string | null
          products?: any | null
          shipping_info?: any | null
          keap_created_date?: string | null
          keap_last_updated?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          keap_id?: string
          contact_keap_id?: string
          order_title?: string | null
          order_total?: number | null
          order_status?: string | null
          order_date?: string | null
          products?: any | null
          shipping_info?: any | null
          keap_created_date?: string | null
          keap_last_updated?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          description: string | null
          file_url: string | null
          file_type: string | null
          file_size: number | null
          category: string | null
          tags: string[] | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          file_url?: string | null
          file_type?: string | null
          file_size?: number | null
          category?: string | null
          tags?: string[] | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          file_url?: string | null
          file_type?: string | null
          file_size?: number | null
          category?: string | null
          tags?: string[] | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          keap_id: string | null
          name: string
          sku: string | null
          price: number | null
          description: string | null
          category: string | null
          status: 'active' | 'inactive' | 'discontinued'
          stock_quantity: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          keap_id?: string | null
          name: string
          sku?: string | null
          price?: number | null
          description?: string | null
          category?: string | null
          status?: 'active' | 'inactive' | 'discontinued'
          stock_quantity?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          keap_id?: string | null
          name?: string
          sku?: string | null
          price?: number | null
          description?: string | null
          category?: string | null
          status?: 'active' | 'inactive' | 'discontinued'
          stock_quantity?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          name: string
          type: string
          url: string | null
          description: string | null
          category: string | null
          tags: string[] | null
          is_active: boolean
          access_level: 'public' | 'restricted' | 'private'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          url?: string | null
          description?: string | null
          category?: string | null
          tags?: string[] | null
          is_active?: boolean
          access_level?: 'public' | 'restricted' | 'private'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          url?: string | null
          description?: string | null
          category?: string | null
          tags?: string[] | null
          is_active?: boolean
          access_level?: 'public' | 'restricted' | 'private'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']