// Keap Webhook Handler for Real-time Updates
// This file handles incoming webhooks from Keap to keep Supabase data synchronized

export interface KeapWebhookPayload {
  event_key: string;
  object_keys: Array<{
    apiUrl: string;
    id: string | number;
    timestamp: string;
  }>;
}

export class KeapWebhookHandler {
  private supabaseUrl: string;
  private supabaseKey: string;
  private keapServiceKey: string;

  constructor(config: {
    supabaseUrl: string;
    supabaseKey: string;
    keapServiceKey: string;
  }) {
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
    this.keapServiceKey = config.keapServiceKey;
  }

  async handleWebhook(payload: KeapWebhookPayload): Promise<void> {
    console.log('Processing Keap webhook:', payload.event_key);

    switch (payload.event_key) {
      case 'contact.add':
      case 'contact.edit':
        await this.syncContact(payload.object_keys[0].id);
        break;

      case 'contact.delete':
        await this.deleteContact(payload.object_keys[0].id);
        break;

      case 'order.add':
      case 'order.edit':
        await this.syncOrder(payload.object_keys[0].id);
        break;

      case 'order.delete':
        await this.deleteOrder(payload.object_keys[0].id);
        break;

      case 'subscription.add':
      case 'subscription.edit':
        await this.syncSubscription(payload.object_keys[0].id);
        break;

      case 'subscription.delete':
        await this.deleteSubscription(payload.object_keys[0].id);
        break;

      case 'product.add':
      case 'product.edit':
        await this.syncProduct(payload.object_keys[0].id);
        break;

      case 'product.delete':
        await this.deleteProduct(payload.object_keys[0].id);
        break;

      default:
        console.log('Unhandled webhook event:', payload.event_key);
    }
  }

  private async syncContact(contactId: string | number): Promise<void> {
    try {
      // Fetch updated contact from Keap
      const contactResponse = await fetch(`https://api.infusionsoft.com/crm/rest/v1/contacts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${this.keapServiceKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!contactResponse.ok) {
        throw new Error(`Failed to fetch contact ${contactId}: ${contactResponse.status}`);
      }

      const contact = await contactResponse.json();

      // Transform for Supabase
      const supabaseCustomer = {
        keap_contact_id: contact.id?.toString(),
        email: contact.email_addresses?.[0]?.email || null,
        first_name: contact.given_name || contact.first_name || '',
        last_name: contact.family_name || contact.last_name || '',
        company_name: contact.company?.company_name || '',
        phone: contact.phone_numbers?.[0]?.number || null,
        date_created: contact.date_created || new Date().toISOString(),
        last_updated: new Date().toISOString(), // Use current time for webhook update
        tag_ids: contact.tag_ids || [],
        custom_fields: contact.custom_fields || {},
        addresses: contact.addresses || []
      };

      // Upsert to Supabase
      const supabaseResponse = await fetch(`${this.supabaseUrl}/rest/v1/keap_customers`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([supabaseCustomer])
      });

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        throw new Error(`Failed to sync contact to Supabase: ${errorText}`);
      }

      console.log(`Successfully synced contact ${contactId} to Supabase`);
    } catch (error) {
      console.error(`Error syncing contact ${contactId}:`, error);
      throw error;
    }
  }

  private async deleteContact(contactId: string | number): Promise<void> {
    try {
      const supabaseResponse = await fetch(
        `${this.supabaseUrl}/rest/v1/keap_customers?keap_contact_id=eq.${contactId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        throw new Error(`Failed to delete contact from Supabase: ${errorText}`);
      }

      console.log(`Successfully deleted contact ${contactId} from Supabase`);
    } catch (error) {
      console.error(`Error deleting contact ${contactId}:`, error);
      throw error;
    }
  }

  private async syncOrder(orderId: string | number): Promise<void> {
    try {
      // Fetch updated order from Keap
      const orderResponse = await fetch(`https://api.infusionsoft.com/crm/rest/v1/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${this.keapServiceKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!orderResponse.ok) {
        throw new Error(`Failed to fetch order ${orderId}: ${orderResponse.status}`);
      }

      const order = await orderResponse.json();

      // Transform for Supabase
      const supabaseOrder = {
        keap_order_id: order.id?.toString(),
        title: order.title || order.order_title || 'No Title',
        status: order.status || order.payment_status || 'unknown',
        total: parseFloat(order.total || order.order_total || 0),
        order_type: order.order_type || 'standard',
        creation_date: order.creation_date || order.order_date || new Date().toISOString(),
        order_date: order.order_date || order.creation_date || new Date().toISOString(),
        contact: order.contact || {
          id: order.contact_id,
          email: 'unknown@example.com',
          first_name: 'Unknown',
          last_name: 'Customer',
          company_name: ''
        },
        order_items: order.order_items || [],
        shipping_information: order.shipping_information || null,
        updated_at: new Date().toISOString()
      };

      // Upsert to Supabase
      const supabaseResponse = await fetch(`${this.supabaseUrl}/rest/v1/keap_orders`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([supabaseOrder])
      });

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        throw new Error(`Failed to sync order to Supabase: ${errorText}`);
      }

      console.log(`Successfully synced order ${orderId} to Supabase`);
    } catch (error) {
      console.error(`Error syncing order ${orderId}:`, error);
      throw error;
    }
  }

  private async deleteOrder(orderId: string | number): Promise<void> {
    try {
      const supabaseResponse = await fetch(
        `${this.supabaseUrl}/rest/v1/keap_orders?keap_order_id=eq.${orderId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        throw new Error(`Failed to delete order from Supabase: ${errorText}`);
      }

      console.log(`Successfully deleted order ${orderId} from Supabase`);
    } catch (error) {
      console.error(`Error deleting order ${orderId}:`, error);
      throw error;
    }
  }

  private async syncSubscription(subscriptionId: string | number): Promise<void> {
    try {
      // Fetch updated subscription from Keap
      const subResponse = await fetch(`https://api.infusionsoft.com/crm/rest/v1/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${this.keapServiceKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!subResponse.ok) {
        throw new Error(`Failed to fetch subscription ${subscriptionId}: ${subResponse.status}`);
      }

      const sub = await subResponse.json();

      // Transform for Supabase
      const supabaseSubscription = {
        keap_subscription_id: sub.id?.toString(),
        contact_id: sub.contact_id?.toString() || '',
        product_id: sub.product_id?.toString() || '',
        program_id: sub.program_id?.toString() || '',
        billing_cycle: sub.billing_cycle || sub.cycle || '',
        frequency: sub.frequency || 1,
        billing_amount: parseFloat(sub.billing_amount || sub.subscription_plan?.price || 0),
        status: sub.status || 'UNKNOWN',
        start_date: sub.start_date || sub.next_bill_date || new Date().toISOString(),
        end_date: sub.end_date || null,
        next_bill_date: sub.next_bill_date || null,
        payment_gateway: sub.payment_gateway?.name || '',
        credit_card_id: sub.credit_card_id?.toString() || '',
        auto_charge: sub.auto_charge !== false,
        subscription_plan_id: sub.subscription_plan_id?.toString() || '',
        updated_at: new Date().toISOString()
      };

      // Upsert to Supabase
      const supabaseResponse = await fetch(`${this.supabaseUrl}/rest/v1/keap_subscriptions`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([supabaseSubscription])
      });

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        throw new Error(`Failed to sync subscription to Supabase: ${errorText}`);
      }

      console.log(`Successfully synced subscription ${subscriptionId} to Supabase`);
    } catch (error) {
      console.error(`Error syncing subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  private async deleteSubscription(subscriptionId: string | number): Promise<void> {
    try {
      const supabaseResponse = await fetch(
        `${this.supabaseUrl}/rest/v1/keap_subscriptions?keap_subscription_id=eq.${subscriptionId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        throw new Error(`Failed to delete subscription from Supabase: ${errorText}`);
      }

      console.log(`Successfully deleted subscription ${subscriptionId} from Supabase`);
    } catch (error) {
      console.error(`Error deleting subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  private async syncProduct(productId: string | number): Promise<void> {
    try {
      // Fetch updated product from Keap
      const productResponse = await fetch(`https://api.infusionsoft.com/crm/rest/v1/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${this.keapServiceKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!productResponse.ok) {
        throw new Error(`Failed to fetch product ${productId}: ${productResponse.status}`);
      }

      const product = await productResponse.json();

      // Transform for Supabase
      const supabaseProduct = {
        keap_product_id: product.id?.toString(),
        product_name: product.product_name || product.name || 'Unknown Product',
        product_desc: product.product_desc || product.description || '',
        product_price: parseFloat(product.product_price || product.price || 0),
        product_short_desc: product.product_short_desc || '',
        subscription_only: product.subscription_only || false,
        sku: product.sku || '',
        status: product.status || 1,
        subscription_plans: product.subscription_plans || [],
        product_options: product.product_options || [],
        updated_at: new Date().toISOString()
      };

      // Upsert to Supabase
      const supabaseResponse = await fetch(`${this.supabaseUrl}/rest/v1/keap_products`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([supabaseProduct])
      });

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        throw new Error(`Failed to sync product to Supabase: ${errorText}`);
      }

      console.log(`Successfully synced product ${productId} to Supabase`);
    } catch (error) {
      console.error(`Error syncing product ${productId}:`, error);
      throw error;
    }
  }

  private async deleteProduct(productId: string | number): Promise<void> {
    try {
      const supabaseResponse = await fetch(
        `${this.supabaseUrl}/rest/v1/keap_products?keap_product_id=eq.${productId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        throw new Error(`Failed to delete product from Supabase: ${errorText}`);
      }

      console.log(`Successfully deleted product ${productId} from Supabase`);
    } catch (error) {
      console.error(`Error deleting product ${productId}:`, error);
      throw error;
    }
  }
}

// Function to register webhooks with Keap
export async function registerKeapWebhooks(serviceAccountKey: string, webhookUrl: string): Promise<any> {
  const eventKeys = [
    'contact.add',
    'contact.edit',
    'contact.delete',
    'order.add',
    'order.edit',
    'order.delete',
    'subscription.add',
    'subscription.edit',
    'subscription.delete',
    'product.add',
    'product.edit',
    'product.delete'
  ];

  const webhooks = [];

  for (const eventKey of eventKeys) {
    try {
      const response = await fetch('https://api.infusionsoft.com/crm/rest/v1/hooks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceAccountKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventKey: eventKey,
          hookUrl: webhookUrl
        })
      });

      if (response.ok) {
        const webhook = await response.json();
        webhooks.push(webhook);
        console.log(`Registered webhook for ${eventKey}`);
      } else {
        const errorText = await response.text();
        console.error(`Failed to register webhook for ${eventKey}: ${errorText}`);
      }
    } catch (error) {
      console.error(`Error registering webhook for ${eventKey}:`, error);
    }
  }

  return webhooks;
}

// Function to verify webhook signature (important for security)
export function verifyKeapWebhookSignature(payload: string, signature: string, secret: string): boolean {
  // Keap uses HMAC-SHA256 for webhook signatures
  // This is a placeholder - actual implementation would use crypto library
  // const hmac = crypto.createHmac('sha256', secret);
  // hmac.update(payload);
  // const expectedSignature = hmac.digest('hex');
  // return signature === expectedSignature;

  // For now, return true (implement actual verification in production)
  return true;
}