/**
 * Keap API Utility Functions
 * Helper functions for common operations and data transformations
 */

import {
  KeapContact,
  KeapOrder,
  KeapSubscription,
  KeapProduct,
  KeapPayment,
  KeapTag,
  KeapMoney,
  KeapOrderStatus,
  KeapSubscriptionStatus,
  KeapLifecycleStage,
  KeapBillingCycle,
  KeapListResponse,
} from './keap-types';
import { KeapClientEnhanced } from './keap-client-enhanced';

// ============================================
// Data Transformation Utilities
// ============================================

/**
 * Format money object to display string
 */
export function formatMoney(money: KeapMoney): string {
  return money.formatted_amount || `${money.currency_code} ${money.amount.toFixed(2)}`;
}

/**
 * Parse money string to KeapMoney object
 */
export function parseMoney(amount: number | string, currencyCode: string = 'USD'): KeapMoney {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return {
    amount: numAmount,
    currency_code: currencyCode,
    formatted_amount: `$${numAmount.toFixed(2)}`,
  };
}

/**
 * Format contact full name
 */
export function formatContactName(contact: KeapContact): string {
  const parts = [
    contact.given_name,
    contact.middle_name,
    contact.family_name,
  ].filter(Boolean);

  return parts.join(' ') || contact.email_addresses?.[0]?.email || 'Unknown Contact';
}

/**
 * Get primary email from contact
 */
export function getContactPrimaryEmail(contact: KeapContact): string | undefined {
  if (!contact.email_addresses?.length) return undefined;

  const primary = contact.email_addresses.find(e => e.is_primary);
  return primary?.email || contact.email_addresses[0].email;
}

/**
 * Get primary phone from contact
 */
export function getContactPrimaryPhone(contact: KeapContact): string | undefined {
  if (!contact.phone_numbers?.length) return undefined;

  const primary = contact.phone_numbers.find(p => p.is_primary);
  return primary?.number || contact.phone_numbers[0].number;
}

// ============================================
// Date Utilities
// ============================================

/**
 * Calculate next billing date for subscription
 */
export function calculateNextBillingDate(
  startDate: string,
  billingCycle: KeapBillingCycle,
  cyclesCompleted: number = 0
): Date {
  const date = new Date(startDate);

  switch (billingCycle) {
    case KeapBillingCycle.WEEKLY:
      date.setDate(date.getDate() + (7 * (cyclesCompleted + 1)));
      break;
    case KeapBillingCycle.MONTHLY:
      date.setMonth(date.getMonth() + (cyclesCompleted + 1));
      break;
    case KeapBillingCycle.QUARTERLY:
      date.setMonth(date.getMonth() + (3 * (cyclesCompleted + 1)));
      break;
    case KeapBillingCycle.SEMI_ANNUALLY:
      date.setMonth(date.getMonth() + (6 * (cyclesCompleted + 1)));
      break;
    case KeapBillingCycle.ANNUALLY:
      date.setFullYear(date.getFullYear() + (cyclesCompleted + 1));
      break;
  }

  return date;
}

/**
 * Calculate days until date
 */
export function daysUntil(date: string | Date): number {
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format date for Keap API (YYYY-MM-DD)
 */
export function formatKeapDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format datetime for Keap API (ISO 8601)
 */
export function formatKeapDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

// ============================================
// Filtering & Search Utilities
// ============================================

/**
 * Filter orders by date range
 */
export function filterOrdersByDateRange(
  orders: KeapOrder[],
  startDate: Date,
  endDate: Date
): KeapOrder[] {
  return orders.filter(order => {
    const orderDate = new Date(order.order_date);
    return orderDate >= startDate && orderDate <= endDate;
  });
}

/**
 * Filter active subscriptions
 */
export function filterActiveSubscriptions(subscriptions: KeapSubscription[]): KeapSubscription[] {
  return subscriptions.filter(sub =>
    sub.status === KeapSubscriptionStatus.ACTIVE && sub.active
  );
}

/**
 * Filter contacts by lifecycle stage
 */
export function filterContactsByStage(
  contacts: KeapContact[],
  stage: KeapLifecycleStage
): KeapContact[] {
  return contacts.filter(contact => contact.lifecycle_stage === stage);
}

/**
 * Search contacts by text
 */
export function searchContacts(contacts: KeapContact[], searchTerm: string): KeapContact[] {
  const term = searchTerm.toLowerCase();
  return contacts.filter(contact => {
    const name = formatContactName(contact).toLowerCase();
    const email = getContactPrimaryEmail(contact)?.toLowerCase() || '';
    const company = contact.company_name?.toLowerCase() || '';

    return name.includes(term) || email.includes(term) || company.includes(term);
  });
}

// ============================================
// Aggregation Utilities
// ============================================

/**
 * Calculate total revenue from orders
 */
export function calculateTotalRevenue(orders: KeapOrder[]): number {
  return orders.reduce((total, order) => {
    if (order.status === KeapOrderStatus.PAID) {
      return total + (order.total.amount || 0);
    }
    return total;
  }, 0);
}

/**
 * Calculate monthly recurring revenue (MRR)
 */
export function calculateMRR(subscriptions: KeapSubscription[]): number {
  return subscriptions.reduce((mrr, sub) => {
    if (sub.status !== KeapSubscriptionStatus.ACTIVE) return mrr;

    let monthlyAmount = 0;
    switch (sub.billing_cycle) {
      case KeapBillingCycle.WEEKLY:
        monthlyAmount = sub.billing_amount * 4.33; // Average weeks per month
        break;
      case KeapBillingCycle.MONTHLY:
        monthlyAmount = sub.billing_amount;
        break;
      case KeapBillingCycle.QUARTERLY:
        monthlyAmount = sub.billing_amount / 3;
        break;
      case KeapBillingCycle.SEMI_ANNUALLY:
        monthlyAmount = sub.billing_amount / 6;
        break;
      case KeapBillingCycle.ANNUALLY:
        monthlyAmount = sub.billing_amount / 12;
        break;
    }

    return mrr + monthlyAmount;
  }, 0);
}

/**
 * Get order statistics
 */
export function getOrderStats(orders: KeapOrder[]) {
  const stats = {
    total: orders.length,
    paid: 0,
    pending: 0,
    refunded: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  };

  orders.forEach(order => {
    switch (order.status) {
      case KeapOrderStatus.PAID:
        stats.paid++;
        stats.totalRevenue += order.total.amount;
        break;
      case KeapOrderStatus.DRAFT:
      case KeapOrderStatus.SENT:
        stats.pending++;
        break;
      case KeapOrderStatus.REFUNDED:
      case KeapOrderStatus.PARTIALLY_REFUNDED:
        stats.refunded++;
        break;
    }
  });

  stats.averageOrderValue = stats.paid > 0 ? stats.totalRevenue / stats.paid : 0;

  return stats;
}

/**
 * Get subscription churn rate
 */
export function calculateChurnRate(
  subscriptions: KeapSubscription[],
  periodDays: number = 30
): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);

  const canceledInPeriod = subscriptions.filter(sub => {
    if (sub.cancel_date && new Date(sub.cancel_date) >= cutoffDate) {
      return true;
    }
    return false;
  }).length;

  const activeAtStart = subscriptions.filter(sub => {
    const startDate = new Date(sub.start_date);
    return startDate < cutoffDate && sub.status === KeapSubscriptionStatus.ACTIVE;
  }).length;

  if (activeAtStart === 0) return 0;

  return (canceledInPeriod / activeAtStart) * 100;
}

// ============================================
// Batch Operations Utilities
// ============================================

/**
 * Batch update contact tags
 */
export async function batchUpdateContactTags(
  client: KeapClientEnhanced,
  contactIds: string[],
  tagIds: number[],
  operation: 'add' | 'remove'
): Promise<void> {
  const requests = contactIds.flatMap(contactId =>
    tagIds.map(tagId => ({
      method: operation === 'add' ? 'POST' : 'DELETE',
      path: operation === 'add'
        ? `/contacts/${contactId}/tags`
        : `/contacts/${contactId}/tags/${tagId}`,
      body: operation === 'add' ? { tagId } : undefined,
    }))
  );

  // Process in batches of 25 (Keap's typical batch limit)
  for (let i = 0; i < requests.length; i += 25) {
    const batch = requests.slice(i, i + 25);
    await client.batch(batch);
  }
}

/**
 * Fetch all pages of a paginated resource
 */
export async function fetchAllPages<T>(
  fetchFn: (offset: number) => Promise<KeapListResponse<T>>,
  limit: number = 100
): Promise<T[]> {
  const allItems: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchFn(offset);
    allItems.push(...response.items);

    if (allItems.length >= response.count) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return allItems;
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  // Remove non-digits and check length
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Validate required contact fields
 */
export function validateContact(contact: Partial<KeapContact>): string[] {
  const errors: string[] = [];

  if (!contact.given_name && !contact.family_name && !contact.company_name) {
    errors.push('Contact must have either a name or company name');
  }

  if (contact.email_addresses?.length) {
    contact.email_addresses.forEach((email, index) => {
      if (!isValidEmail(email.email)) {
        errors.push(`Invalid email at index ${index}: ${email.email}`);
      }
    });
  }

  if (contact.phone_numbers?.length) {
    contact.phone_numbers.forEach((phone, index) => {
      if (!isValidPhone(phone.number)) {
        errors.push(`Invalid phone at index ${index}: ${phone.number}`);
      }
    });
  }

  return errors;
}

// ============================================
// Sync Utilities
// ============================================

/**
 * Compare and get differences between two contacts
 */
export function getContactDifferences(
  oldContact: KeapContact,
  newContact: KeapContact
): Partial<KeapContact> {
  const differences: Partial<KeapContact> = {};

  // Compare simple fields
  const fields: (keyof KeapContact)[] = [
    'given_name',
    'family_name',
    'middle_name',
    'job_title',
    'company_name',
    'lifecycle_stage',
  ];

  fields.forEach(field => {
    if (oldContact[field] !== newContact[field]) {
      (differences as any)[field] = newContact[field];
    }
  });

  // Compare email addresses
  const oldPrimaryEmail = getContactPrimaryEmail(oldContact);
  const newPrimaryEmail = getContactPrimaryEmail(newContact);
  if (oldPrimaryEmail !== newPrimaryEmail) {
    differences.email_addresses = newContact.email_addresses;
  }

  // Compare phone numbers
  const oldPrimaryPhone = getContactPrimaryPhone(oldContact);
  const newPrimaryPhone = getContactPrimaryPhone(newContact);
  if (oldPrimaryPhone !== newPrimaryPhone) {
    differences.phone_numbers = newContact.phone_numbers;
  }

  return differences;
}

/**
 * Merge duplicate contacts
 */
export async function mergeContacts(
  client: KeapClientEnhanced,
  primaryContactId: string,
  duplicateContactIds: string[]
): Promise<KeapContact> {
  // Get all contacts
  const [primary, ...duplicates] = await Promise.all([
    client.getContact(primaryContactId),
    ...duplicateContactIds.map(id => client.getContact(id)),
  ]);

  // Merge data into primary
  const merged: Partial<KeapContact> = { ...primary };

  // Merge tags
  const allTags = new Set(primary.tag_ids || []);
  duplicates.forEach(dup => {
    (dup.tag_ids || []).forEach(tag => allTags.add(tag));
  });
  merged.tag_ids = Array.from(allTags);

  // Merge custom fields
  const customFields = { ...(primary.custom_fields || {}) };
  duplicates.forEach(dup => {
    Object.assign(customFields, dup.custom_fields || {});
  });
  merged.custom_fields = Object.entries(customFields).map(([id, content]) => ({ id, content }));

  // Update primary contact
  const updated = await client.updateContact(primaryContactId, merged);

  // Delete duplicates
  await Promise.all(duplicateContactIds.map(id => client.deleteContact(id)));

  return updated;
}

// ============================================
// Reporting Utilities
// ============================================

/**
 * Generate revenue report by month
 */
export function generateMonthlyRevenueReport(orders: KeapOrder[]) {
  const reportMap = new Map<string, { count: number; revenue: number }>();

  orders
    .filter(order => order.status === KeapOrderStatus.PAID)
    .forEach(order => {
      const month = order.order_date.substring(0, 7); // YYYY-MM
      const existing = reportMap.get(month) || { count: 0, revenue: 0 };

      existing.count++;
      existing.revenue += order.total.amount;

      reportMap.set(month, existing);
    });

  return Array.from(reportMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}

/**
 * Generate contact growth report
 */
export function generateContactGrowthReport(contacts: KeapContact[]) {
  const reportMap = new Map<string, { new: number; total: number }>();
  const sortedContacts = [...contacts].sort((a, b) =>
    a.date_created.localeCompare(b.date_created)
  );

  let runningTotal = 0;
  sortedContacts.forEach(contact => {
    const month = contact.date_created.substring(0, 7); // YYYY-MM
    const existing = reportMap.get(month) || { new: 0, total: 0 };

    existing.new++;
    runningTotal++;
    existing.total = runningTotal;

    reportMap.set(month, existing);
  });

  return Array.from(reportMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}

/**
 * Get product performance metrics
 */
export function getProductPerformance(
  orders: KeapOrder[],
  products: KeapProduct[]
): Map<string, { product: KeapProduct; quantity: number; revenue: number }> {
  const performanceMap = new Map();

  products.forEach(product => {
    performanceMap.set(product.id, {
      product,
      quantity: 0,
      revenue: 0,
    });
  });

  orders
    .filter(order => order.status === KeapOrderStatus.PAID)
    .forEach(order => {
      order.order_items.forEach(item => {
        const existing = performanceMap.get(item.product.id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.price.amount * item.quantity;
        }
      });
    });

  return performanceMap;
}

// ============================================
// Export Utilities
// ============================================

/**
 * Export contacts to CSV format
 */
export function exportContactsToCSV(contacts: KeapContact[]): string {
  const headers = [
    'ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'Lifecycle Stage',
    'Created Date',
  ];

  const rows = contacts.map(contact => [
    contact.id,
    contact.given_name || '',
    contact.family_name || '',
    getContactPrimaryEmail(contact) || '',
    getContactPrimaryPhone(contact) || '',
    contact.company_name || '',
    contact.lifecycle_stage || '',
    contact.date_created,
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
}

/**
 * Export orders to CSV format
 */
export function exportOrdersToCSV(orders: KeapOrder[]): string {
  const headers = [
    'Order ID',
    'Order Number',
    'Status',
    'Customer Name',
    'Customer Email',
    'Total',
    'Currency',
    'Order Date',
  ];

  const rows = orders.map(order => [
    order.id,
    order.order_number || '',
    order.status,
    `${order.contact.given_name || ''} ${order.contact.family_name || ''}`.trim(),
    order.contact.email,
    order.total.amount.toString(),
    order.total.currency_code,
    order.order_date,
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
}

// ============================================
// Type Guards & Type Narrowing
// ============================================

/**
 * Check if subscription is active and billable
 */
export function isSubscriptionBillable(subscription: KeapSubscription): boolean {
  return (
    subscription.status === KeapSubscriptionStatus.ACTIVE &&
    subscription.active &&
    !subscription.pause_until &&
    !!subscription.next_bill_date
  );
}

/**
 * Check if order needs fulfillment
 */
export function orderNeedsFulfillment(order: KeapOrder): boolean {
  return order.status === KeapOrderStatus.PAID &&
    order.order_items.some(item => {
      const product = item.product as any;
      return product.product_type === 'PHYSICAL';
    });
}

/**
 * Check if contact is qualified lead
 */
export function isQualifiedLead(contact: KeapContact): boolean {
  return (
    contact.lifecycle_stage === KeapLifecycleStage.LEAD &&
    !!getContactPrimaryEmail(contact) &&
    (contact.lead_score || 0) >= 50
  );
}