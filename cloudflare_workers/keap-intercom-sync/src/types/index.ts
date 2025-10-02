/**
 * Type definitions for Keap-Intercom sync worker
 */

export interface Env {
  INTERCOM_ACCESS_TOKEN: string;
  KEAP_API_KEY: string;
  KEAP_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  ENVIRONMENT: string;
}

// Intercom Types
export interface IntercomContact {
  type: 'contact';
  id: string;
  external_id?: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  role: 'user' | 'lead';
  signed_up_at?: number;
  last_seen_at?: number;
  owner_id?: number;
  unsubscribed_from_emails?: boolean;
  custom_attributes?: Record<string, any>;
  created_at?: number;
  updated_at?: number;
}

export interface IntercomContactUpdate {
  role?: 'user' | 'lead';
  external_id?: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  signed_up_at?: number;
  last_seen_at?: number;
  owner_id?: number;
  unsubscribed_from_emails?: boolean;
  custom_attributes?: Record<string, any>;
}

export interface IntercomSearchResponse {
  type: 'list';
  total_count: number;
  pages: {
    type: 'pages';
    page: number;
    per_page: number;
    total_pages: number;
  };
  data: IntercomContact[];
}

// Keap Types
export interface KeapContact {
  id: number;
  email_addresses?: Array<{
    email: string;
    field: string;
  }>;
  phone_numbers?: Array<{
    number: string;
    field: string;
  }>;
  given_name?: string;
  family_name?: string;
  owner_id?: number;
  custom_fields?: Array<{
    id: number;
    content: any;
  }>;
}

export interface KeapWebhookEvent {
  event_key: string;
  object_keys: {
    contactId?: number;
    objectKeys?: Array<{
      objectType: string;
      id: number;
    }>;
  };
}

// Sync Status Types
export interface SyncLog {
  id?: string;
  keap_contact_id: string;
  intercom_contact_id?: string;
  sync_status: 'pending' | 'synced' | 'failed' | 'skipped';
  sync_direction: 'keap_to_intercom' | 'intercom_to_keap';
  error_message?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContactMatchResult {
  matched: boolean;
  intercom_contact?: IntercomContact;
  match_method?: 'email' | 'phone' | 'external_id';
}
