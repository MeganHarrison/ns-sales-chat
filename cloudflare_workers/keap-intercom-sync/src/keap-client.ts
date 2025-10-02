/**
 * Keap API Client
 * Handles Keap API operations for contact retrieval
 */

import type { KeapContact } from './types';

export type { KeapContact };

export class KeapClient {
  private readonly baseUrl = 'https://api.infusionsoft.com/crm/rest/v1';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Keap API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get a contact by ID from Keap
   */
  async getContact(contactId: number): Promise<KeapContact> {
    return this.makeRequest<KeapContact>('GET', `/contacts/${contactId}`);
  }

  /**
   * Search for a contact by email in Keap
   */
  async searchContactByEmail(email: string): Promise<KeapContact | null> {
    try {
      const response = await this.makeRequest<{ contacts: KeapContact[] }>(
        'GET',
        `/contacts?email=${encodeURIComponent(email)}`
      );
      return response.contacts && response.contacts.length > 0 ? response.contacts[0] : null;
    } catch (error) {
      console.error('Error searching contact by email:', error);
      return null;
    }
  }

  /**
   * Create a new contact in Keap
   */
  async createContact(data: Record<string, unknown>): Promise<KeapContact> {
    return this.makeRequest<KeapContact>('POST', '/contacts', data);
  }

  /**
   * Update an existing contact in Keap
   */
  async updateContact(
    contactId: number,
    data: Record<string, unknown>
  ): Promise<KeapContact> {
    return this.makeRequest<KeapContact>('PATCH', `/contacts/${contactId}`, data);
  }

  /**
   * Extract contact information for Intercom sync
   */
  extractContactData(keapContact: KeapContact): {
    email?: string;
    phone?: string;
    name?: string;
    customAttributes?: Record<string, any>;
  } {
    const primaryEmail = keapContact.email_addresses?.find(
      (e) => e.field === 'EMAIL1'
    )?.email;

    const primaryPhone = keapContact.phone_numbers?.find(
      (p) => p.field === 'PHONE1'
    )?.number;

    const name = [keapContact.given_name, keapContact.family_name]
      .filter(Boolean)
      .join(' ');

    const customAttributes: Record<string, any> = {
      keap_contact_id: keapContact.id.toString(),
      keap_owner_id: keapContact.owner_id,
    };

    // Add custom fields if present
    if (keapContact.custom_fields) {
      keapContact.custom_fields.forEach((field) => {
        customAttributes[`keap_custom_${field.id}`] = field.content;
      });
    }

    return {
      email: primaryEmail,
      phone: primaryPhone,
      name: name || undefined,
      customAttributes,
    };
  }
}
