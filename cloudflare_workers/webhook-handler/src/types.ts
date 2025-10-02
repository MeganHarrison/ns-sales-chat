/**
 * TypeScript interfaces for Keap webhook handling
 */

export interface Env {
  SYNC_COORDINATOR: Fetcher;
  KEAP_WEBHOOK_SECRET: string;
  ENVIRONMENT: string;
}

export interface KeapWebhookEvent {
  eventKey: string;
  eventType: string;
  objectKeys: string[];
  objectType: string;
  apiUrl: string;
}

export interface ProcessedWebhookEvent {
  eventKey: string;
  eventType: string;
  objectKeys: string[];
  objectType: string;
  apiUrl: string;
  receivedAt: number;
  keapAccountId?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  eventKey?: string;
  error?: string;
}

/**
 * Keap webhook event types that we handle
 */
export enum KeapEventType {
  // Contact events
  CONTACT_ADD = 'contact.add',
  CONTACT_EDIT = 'contact.edit',
  CONTACT_DELETE = 'contact.delete',
  
  // Order events
  ORDER_ADD = 'order.add',
  ORDER_EDIT = 'order.edit',
  ORDER_DELETE = 'order.delete',
  
  // Tag events
  CONTACT_TAG_ADD = 'contactGroup.applied',
  CONTACT_TAG_REMOVE = 'contactGroup.removed',
  
  // Subscription events
  SUBSCRIPTION_ADD = 'recurringOrder.add',
  SUBSCRIPTION_EDIT = 'recurringOrder.edit',
  SUBSCRIPTION_DELETE = 'recurringOrder.delete',
}

/**
 * Webhook processing status
 */
export enum WebhookStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}