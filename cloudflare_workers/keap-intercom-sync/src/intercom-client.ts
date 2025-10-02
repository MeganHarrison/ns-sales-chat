/**
 * Intercom API Client
 * Handles all Intercom API operations for contact management
 */

import type {
  IntercomContact,
  IntercomContactUpdate,
  IntercomSearchResponse,
} from './types';

export class IntercomClient {
  private readonly baseUrl = 'https://api.intercom.io';
  private readonly accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
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
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Intercom-Version': '2.11',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Intercom API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Search for a contact by email
   */
  async searchContactByEmail(email: string): Promise<IntercomContact | null> {
    try {
      const response = await this.makeRequest<IntercomSearchResponse>(
        'POST',
        '/contacts/search',
        {
          query: {
            field: 'email',
            operator: '=',
            value: email,
          },
        }
      );

      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Error searching contact by email:', error);
      return null;
    }
  }

  /**
   * Get a contact by Intercom ID
   */
  async getContact(contactId: string): Promise<IntercomContact> {
    return this.makeRequest<IntercomContact>('GET', `/contacts/${contactId}`);
  }

  /**
   * Get a contact by external ID (Keap contact ID)
   */
  async getContactByExternalId(
    externalId: string
  ): Promise<IntercomContact | null> {
    try {
      return await this.makeRequest<IntercomContact>(
        'GET',
        `/contacts?external_id=${externalId}`
      );
    } catch (error) {
      console.error('Error getting contact by external ID:', error);
      return null;
    }
  }

  /**
   * Create a new contact in Intercom
   */
  async createContact(
    data: Partial<IntercomContactUpdate> & { email: string }
  ): Promise<IntercomContact> {
    return this.makeRequest<IntercomContact>('POST', '/contacts', {
      role: 'user',
      ...data,
    });
  }

  /**
   * Update an existing contact
   * This is the key method for setting external_id to Keap contact ID
   */
  async updateContact(
    contactId: string,
    data: IntercomContactUpdate
  ): Promise<IntercomContact> {
    return this.makeRequest<IntercomContact>(
      'PUT',
      `/contacts/${contactId}`,
      data
    );
  }

  /**
   * Update contact with Keap contact ID as external_id
   */
  async linkKeapContact(
    intercomContactId: string,
    keapContactId: string,
    additionalData?: Partial<IntercomContactUpdate>
  ): Promise<IntercomContact> {
    return this.updateContact(intercomContactId, {
      role: 'user', // Required for external_id
      external_id: keapContactId,
      ...additionalData,
    });
  }

  /**
   * Find or create a contact, then link to Keap
   */
  async syncKeapContact(
    email: string,
    keapContactId: string,
    contactData: Partial<IntercomContactUpdate>
  ): Promise<{
    contact: IntercomContact;
    action: 'created' | 'updated' | 'linked';
  }> {
    // First, try to find existing contact by email
    let contact = await this.searchContactByEmail(email);

    if (contact) {
      // Contact exists, update it with Keap ID
      const updated = await this.linkKeapContact(
        contact.id,
        keapContactId,
        contactData
      );
      return {
        contact: updated,
        action: contact.external_id ? 'updated' : 'linked',
      };
    }

    // No existing contact, create new one with Keap ID
    const newContact = await this.createContact({
      email,
      external_id: keapContactId,
      role: 'user',
      ...contactData,
    });

    return {
      contact: newContact,
      action: 'created',
    };
  }
}
