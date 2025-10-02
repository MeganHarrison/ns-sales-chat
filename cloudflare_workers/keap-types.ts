/**
 * Comprehensive TypeScript Types for Keap REST API v2
 * Based on official Keap/Infusionsoft API documentation
 * Generated for use across Cloudflare Workers, Next.js, and Node.js projects
 */

// ============================================
// Core Types & Enums
// ============================================

export enum KeapContactType {
  PERSON = 'PERSON',
  COMPANY = 'COMPANY',
  OTHER = 'OTHER'
}

export enum KeapLifecycleStage {
  LEAD = 'LEAD',
  PROSPECT = 'PROSPECT',
  CUSTOMER = 'CUSTOMER',
  PAST_CUSTOMER = 'PAST_CUSTOMER',
  EVANGELIST = 'EVANGELIST'
}

export enum KeapOrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PAID = 'PAID',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export enum KeapSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CANCELED = 'CANCELED',
  PAUSED = 'PAUSED',
  OVERDUE = 'OVERDUE'
}

export enum KeapPaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  VOIDED = 'VOIDED'
}

export enum KeapBillingCycle {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUALLY = 'SEMI_ANNUALLY',
  ANNUALLY = 'ANNUALLY',
  ONE_TIME = 'ONE_TIME'
}

export enum KeapTaskStatus {
  INCOMPLETE = 'INCOMPLETE',
  COMPLETE = 'COMPLETE',
  IN_PROGRESS = 'IN_PROGRESS',
  CANCELED = 'CANCELED'
}

export enum KeapNoteType {
  NOTE = 'NOTE',
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  TASK = 'TASK',
  FAX = 'FAX',
  LETTER = 'LETTER',
  OTHER = 'OTHER'
}

// ============================================
// Common Types
// ============================================

export interface KeapMoney {
  amount: number;
  currency_code: string;
  formatted_amount: string;
}

export interface KeapAddress {
  id?: string;
  line1?: string;
  line2?: string;
  locality?: string;  // City
  region?: string;    // State/Province
  postal_code?: string;
  country_code?: string;
  zip_code?: string;
  zip_four?: string;
}

export interface KeapPhoneNumber {
  id?: string;
  extension?: string;
  number: string;
  type?: 'MOBILE' | 'WORK' | 'HOME' | 'FAX' | 'OTHER';
  is_primary?: boolean;
}

export interface KeapEmailAddress {
  id?: string;
  email: string;
  is_opted_in?: boolean;
  opt_in_reason?: string;
  is_primary?: boolean;
}

export interface KeapSocialAccount {
  id?: string;
  name?: string;
  type?: 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'INSTAGRAM' | 'OTHER';
  url?: string;
}

export interface KeapCustomField {
  id: string;
  content: any;
  field_name?: string;
  field_type?: string;
}

// ============================================
// Contact Types
// ============================================

export interface KeapContact {
  id: string;
  email_addresses?: KeapEmailAddress[];
  phone_numbers?: KeapPhoneNumber[];
  addresses?: KeapAddress[];
  social_accounts?: KeapSocialAccount[];

  // Basic Info
  given_name?: string;
  middle_name?: string;
  family_name?: string;
  preferred_name?: string;
  suffix?: string;
  job_title?: string;
  company_name?: string;

  // Contact Type & Stage
  contact_type?: KeapContactType;
  lifecycle_stage?: KeapLifecycleStage;
  source_type?: string;

  // Important Dates
  birthday?: string;
  anniversary?: string;
  date_created: string;
  last_updated: string;

  // Relationships
  company_id?: string;
  owner_id?: string;

  // Tags & Custom Fields
  tag_ids?: number[];
  custom_fields?: KeapCustomField[];

  // Marketing
  lead_source?: string;
  website?: string;
  opt_in_reason?: string;

  // Scoring
  score?: number;
  lead_score?: number;
}

// ============================================
// Product Types
// ============================================

export interface KeapProduct {
  id: string;
  name: string;
  description?: string;
  price?: number;
  sku?: string;
  active: boolean;
  product_category?: string;
  product_type?: 'PHYSICAL' | 'DIGITAL' | 'SERVICE' | 'SUBSCRIPTION';

  // Pricing
  cost?: number;
  taxable?: boolean;
  tax_category?: string;

  // Inventory
  track_inventory?: boolean;
  inventory_count?: number;
  low_inventory_threshold?: number;

  // Subscription
  subscription_plan_id?: string;
  billing_cycle?: KeapBillingCycle;
  trial_period_days?: number;

  // Images
  image_url?: string;
  thumbnail_url?: string;

  // Metadata
  date_created?: string;
  last_updated?: string;
  custom_fields?: KeapCustomField[];
}

// ============================================
// Order Types
// ============================================

export interface KeapOrderItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: KeapMoney;
  discount?: KeapMoney;
  tax?: KeapMoney;
  subtotal?: KeapMoney;
  product: {
    id: string;
    name: string;
    description?: string;
    sku?: string;
  };
}

export interface KeapOrder {
  id: string;
  title?: string;
  status: KeapOrderStatus;
  order_number?: string;

  // Totals
  total: KeapMoney;
  subtotal?: KeapMoney;
  total_discount?: KeapMoney;
  total_tax?: KeapMoney;
  shipping_total?: KeapMoney;

  // Dates
  order_date: string;
  creation_time: string;
  modification_time?: string;
  completion_time?: string;

  // Contact
  contact: {
    id: string;
    email: string;
    given_name?: string;
    family_name?: string;
    company_name?: string;
  };

  // Items
  order_items: KeapOrderItem[];

  // Billing & Shipping
  billing_address?: KeapAddress;
  shipping_address?: KeapAddress;

  // Payment
  payment_method?: string;
  payment_status?: KeapPaymentStatus;
  payment_date?: string;

  // Additional
  notes?: string;
  source?: string;
  lead_affiliate_id?: string;
  sales_affiliate_id?: string;
  custom_fields?: KeapCustomField[];
}

// ============================================
// Subscription Types
// ============================================

export interface KeapSubscription {
  id: string;
  contact_id: string;
  product_id?: string;
  subscription_plan_id?: string;

  // Status
  status: KeapSubscriptionStatus;
  active: boolean;

  // Billing
  billing_amount: number;
  billing_cycle: KeapBillingCycle;
  billing_frequency?: number;
  payment_method_id?: string;

  // Dates
  start_date: string;
  next_bill_date?: string;
  end_date?: string;
  last_bill_date?: string;
  paid_thru_date?: string;

  // Trial
  trial_end_date?: string;
  in_trial?: boolean;

  // Pause
  pause_until?: string;
  pause_reason?: string;

  // Cancellation
  cancel_date?: string;
  cancel_reason?: string;

  // Additional
  quantity?: number;
  auto_renew?: boolean;
  cycles_completed?: number;
  max_cycles?: number;
  custom_fields?: KeapCustomField[];
}

// ============================================
// Payment & Transaction Types
// ============================================

export interface KeapPayment {
  id: string;
  amount: KeapMoney;
  status: KeapPaymentStatus;
  payment_date: string;
  payment_method: string;

  // References
  contact_id: string;
  order_id?: string;
  invoice_id?: string;
  subscription_id?: string;

  // Details
  gateway?: string;
  gateway_transaction_id?: string;
  last_four?: string;
  card_type?: string;

  // Refunds
  refunded_amount?: KeapMoney;
  refund_date?: string;
  refund_reason?: string;

  // Additional
  notes?: string;
  applied_date?: string;
  custom_fields?: KeapCustomField[];
}

export interface KeapInvoice {
  id: string;
  invoice_number: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOIDED';

  // Amounts
  total: KeapMoney;
  subtotal?: KeapMoney;
  tax_total?: KeapMoney;
  discount_total?: KeapMoney;
  amount_paid?: KeapMoney;
  balance_due?: KeapMoney;

  // Dates
  invoice_date: string;
  due_date?: string;
  paid_date?: string;

  // References
  contact_id: string;
  order_id?: string;

  // Line Items
  line_items?: KeapOrderItem[];

  // Additional
  notes?: string;
  terms?: string;
  custom_fields?: KeapCustomField[];
}

// ============================================
// Tag & Category Types
// ============================================

export interface KeapTag {
  id: number;
  name: string;
  category?: string;
  description?: string;
  contact_count?: number;
  date_created?: string;
}

export interface KeapTagCategory {
  id: number;
  name: string;
  description?: string;
  tag_count?: number;
}

// ============================================
// Task & Activity Types
// ============================================

export interface KeapTask {
  id: string;
  title: string;
  description?: string;
  status: KeapTaskStatus;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  // Assignment
  contact_id?: string;
  user_id?: string;

  // Dates
  due_date?: string;
  completed_date?: string;
  reminder_date?: string;
  date_created: string;
  last_updated: string;

  // Additional
  completion_percent?: number;
  custom_fields?: KeapCustomField[];
}

export interface KeapNote {
  id: string;
  body: string;
  title?: string;
  type?: KeapNoteType;

  // References
  contact_id: string;
  user_id?: string;

  // Dates
  date_created: string;
  last_updated?: string;

  // Additional
  attachments?: KeapAttachment[];
  custom_fields?: KeapCustomField[];
}

export interface KeapAppointment {
  id: string;
  title: string;
  description?: string;
  location?: string;

  // Time
  start_date: string;
  end_date: string;
  all_day?: boolean;

  // Attendees
  contact_ids?: string[];
  user_ids?: string[];

  // Reminder
  reminder_minutes?: number;

  // Additional
  date_created: string;
  last_updated?: string;
  custom_fields?: KeapCustomField[];
}

// ============================================
// Campaign & Email Types
// ============================================

export interface KeapCampaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'READY' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

  // Stats
  active_contact_count?: number;
  completed_contact_count?: number;

  // Goals
  goals?: KeapCampaignGoal[];
  sequences?: KeapCampaignSequence[];

  // Dates
  date_created: string;
  last_updated?: string;
  published_date?: string;
}

export interface KeapCampaignGoal {
  id: string;
  name: string;
  type: string;
  achieved_count?: number;
}

export interface KeapCampaignSequence {
  id: string;
  name: string;
  active_contact_count?: number;
}

export interface KeapEmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content?: string;
  text_content?: string;

  // Settings
  from_address?: string;
  reply_to_address?: string;

  // Stats
  sent_count?: number;
  open_count?: number;
  click_count?: number;

  // Dates
  date_created: string;
  last_updated?: string;
}

// ============================================
// Company & User Types
// ============================================

export interface KeapCompany {
  id: string;
  name: string;
  website?: string;
  industry?: string;

  // Contact Info
  email_address?: string;
  phone_number?: string;
  fax_number?: string;

  // Address
  address?: KeapAddress;

  // Stats
  employee_count?: number;
  annual_revenue?: number;

  // Relationships
  parent_company_id?: string;
  owner_id?: string;

  // Dates
  date_created: string;
  last_updated?: string;
  custom_fields?: KeapCustomField[];
}

export interface KeapUser {
  id: string;
  email: string;
  given_name: string;
  family_name: string;

  // Access
  active: boolean;
  admin: boolean;
  partner: boolean;

  // Dates
  date_created: string;
  last_login?: string;
}

// ============================================
// File & Attachment Types
// ============================================

export interface KeapFile {
  id: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  download_url?: string;

  // References
  contact_id?: string;

  // Dates
  date_created: string;
  last_updated?: string;
}

export interface KeapAttachment {
  id: string;
  file_id: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
}

// ============================================
// Webhook Types
// ============================================

export interface KeapWebhook {
  id: string;
  hook_url: string;
  event_key: string;
  status: 'ACTIVE' | 'INACTIVE' | 'FAILED';

  // Config
  verify_ssl?: boolean;
  secret_key?: string;

  // Stats
  consecutive_failures?: number;
  last_success?: string;
  last_failure?: string;

  // Dates
  date_created: string;
  last_updated?: string;
}

export interface KeapWebhookEvent {
  event_key: string;
  object_type: string;
  object_id: string;
  timestamp: string;
  data: any;
}

// ============================================
// API Response Types
// ============================================

export interface KeapListResponse<T> {
  items: T[];
  count: number;
  next?: string;
  previous?: string;
  sync_token?: string;
}

export interface KeapError {
  message: string;
  code?: string;
  details?: any;
}

export interface KeapApiResponse<T> {
  data?: T;
  error?: KeapError;
  success: boolean;
}

// ============================================
// Query & Filter Types
// ============================================

export interface KeapQueryOptions {
  limit?: number;
  offset?: number;
  order?: string;
  order_direction?: 'ascending' | 'descending';
  since?: string;
  until?: string;
  search_term?: string;
  fields?: string[];
}

export interface KeapContactQuery extends KeapQueryOptions {
  email?: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  tag_id?: number;
  lifecycle_stage?: KeapLifecycleStage;
  source_type?: string;
  owner_id?: string;
}

export interface KeapOrderQuery extends KeapQueryOptions {
  contact_id?: string;
  status?: KeapOrderStatus;
  product_id?: string;
  since?: string;
  until?: string;
  paid?: boolean;
}

export interface KeapSubscriptionQuery extends KeapQueryOptions {
  contact_id?: string;
  product_id?: string;
  status?: KeapSubscriptionStatus;
  active?: boolean;
}

// ============================================
// Batch Operation Types
// ============================================

export interface KeapBatchRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: any;
  headers?: Record<string, string>;
}

export interface KeapBatchResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

export interface KeapBatchResult {
  requests: KeapBatchRequest[];
  responses: KeapBatchResponse[];
}

// ============================================
// OAuth Types
// ============================================

export interface KeapOAuthToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface KeapOAuthConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope?: string;
}

// ============================================
// Utility Types
// ============================================

export type KeapID = string | number;

export type KeapDateTime = string; // ISO 8601 format

export type KeapDate = string; // YYYY-MM-DD format

export interface KeapPaginationParams {
  limit?: number;
  offset?: number;
  next_page_token?: string;
}

export interface KeapSortParams {
  order_by?: string;
  order_direction?: 'asc' | 'desc';
}

export interface KeapExpandParams {
  expand?: string[];
  fields?: string[];
}

// Type guards
export function isKeapError(obj: any): obj is KeapError {
  return obj && typeof obj.message === 'string';
}

export function isKeapContact(obj: any): obj is KeapContact {
  return obj && typeof obj.id === 'string' && typeof obj.date_created === 'string';
}

export function isKeapOrder(obj: any): obj is KeapOrder {
  return obj && typeof obj.id === 'string' && obj.total && typeof obj.order_date === 'string';
}

// Export type collections for convenience
export type KeapEntity =
  | KeapContact
  | KeapOrder
  | KeapProduct
  | KeapSubscription
  | KeapPayment
  | KeapInvoice
  | KeapCompany
  | KeapTask
  | KeapNote
  | KeapAppointment;

export type KeapEntityType =
  | 'contact'
  | 'order'
  | 'product'
  | 'subscription'
  | 'payment'
  | 'invoice'
  | 'company'
  | 'task'
  | 'note'
  | 'appointment';