import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface KeapWebhookEvent {
  event_key: string;
  object_type: string;
  object_id: string | number;
  data: any;
  timestamp: string;
}

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const webhookSecret = process.env.KEAP_WEBHOOK_SECRET;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('X-Keap-Signature') || '';

    const rawBody = await request.text();
    let event: KeapWebhookEvent;

    try {
      event = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from('keap_sync_logs')
      .insert({
        sync_type: 'webhook',
        entity_type: event.object_type,
        entity_id: String(event.object_id),
        keap_id: String(event.object_id),
        operation: 'update',
        status: 'success',
        changes: event.data,
        created_at: new Date().toISOString(),
      });

    switch (event.event_key) {
      case 'contact.add':
        await handleContactAdd(supabase, event);
        break;

      case 'contact.edit':
        await handleContactEdit(supabase, event);
        break;

      case 'contact.delete':
        await handleContactDelete(supabase, event);
        break;

      case 'contactTag.applied':
        await handleTagApplied(supabase, event);
        break;

      case 'contactTag.removed':
        await handleTagRemoved(supabase, event);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.event_key}`);
    }

    return NextResponse.json({
      success: true,
      event: event.event_key,
      objectId: event.object_id,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleContactAdd(
  supabase: any,
  event: KeapWebhookEvent
): Promise<void> {
  const contactData = event.data;

  const contact = {
    keap_id: String(event.object_id),
    email: contactData.email_addresses?.[0]?.email || null,
    given_name: contactData.given_name || null,
    family_name: contactData.family_name || null,
    company_name: contactData.company_name || null,
    lifecycle_stage: contactData.lifecycle_stage || null,
    tags: contactData.tags || [],
    tag_ids: contactData.tag_ids || [],
    custom_fields: contactData.custom_fields || {},
    date_created: contactData.date_created || new Date().toISOString(),
    last_updated: contactData.last_updated || new Date().toISOString(),
    keap_last_updated: contactData.last_updated || new Date().toISOString(),
    sync_status: 'synced',
    sync_last_success: new Date().toISOString(),
  };

  await supabase
    .from('keap_contacts')
    .upsert(contact, {
      onConflict: 'keap_id',
    });
}

async function handleContactEdit(
  supabase: any,
  event: KeapWebhookEvent
): Promise<void> {
  const contactData = event.data;

  await supabase
    .from('keap_contacts')
    .update({
      email: contactData.email_addresses?.[0]?.email || null,
      given_name: contactData.given_name || null,
      family_name: contactData.family_name || null,
      company_name: contactData.company_name || null,
      lifecycle_stage: contactData.lifecycle_stage || null,
      tags: contactData.tags || [],
      tag_ids: contactData.tag_ids || [],
      custom_fields: contactData.custom_fields || {},
      last_updated: contactData.last_updated || new Date().toISOString(),
      keap_last_updated: contactData.last_updated || new Date().toISOString(),
      sync_status: 'synced',
      sync_last_success: new Date().toISOString(),
    })
    .eq('keap_id', String(event.object_id));
}

async function handleContactDelete(
  supabase: any,
  event: KeapWebhookEvent
): Promise<void> {
  await supabase
    .from('keap_contacts')
    .update({
      sync_status: 'deleted',
      sync_last_success: new Date().toISOString(),
    })
    .eq('keap_id', String(event.object_id));
}

async function handleTagApplied(
  supabase: any,
  event: KeapWebhookEvent
): Promise<void> {
  const { contact_id, tag_id, tag_name } = event.data;

  const { data: contact } = await supabase
    .from('keap_contacts')
    .select('id, tags, tag_ids')
    .eq('keap_id', String(contact_id))
    .single();

  if (contact) {
    const tags = contact.tags || [];
    const tagIds = contact.tag_ids || [];

    if (!tagIds.includes(tag_id)) {
      tags.push({ id: tag_id, name: tag_name });
      tagIds.push(tag_id);

      await supabase
        .from('keap_contacts')
        .update({
          tags,
          tag_ids: tagIds,
          sync_last_success: new Date().toISOString(),
        })
        .eq('keap_id', String(contact_id));

      await supabase
        .from('keap_contact_tags')
        .upsert({
          contact_id: contact.id,
          tag_id: tag_id,
          tag_name: tag_name,
          applied_at: new Date().toISOString(),
        });
    }

    const activeClientTags = ['Active Client', 'active client', 'Active client'];
    if (activeClientTags.includes(tag_name)) {
      await supabase
        .from('keap_sync_logs')
        .insert({
          sync_type: 'webhook',
          entity_type: 'contact',
          entity_id: contact.id,
          keap_id: String(contact_id),
          operation: 'update',
          status: 'success',
          changes: {
            event: 'active_client_added',
            tag_name: tag_name,
            tag_id: tag_id,
          },
          created_at: new Date().toISOString(),
        });
    }
  }
}

async function handleTagRemoved(
  supabase: any,
  event: KeapWebhookEvent
): Promise<void> {
  const { contact_id, tag_id, tag_name } = event.data;

  const { data: contact } = await supabase
    .from('keap_contacts')
    .select('id, tags, tag_ids')
    .eq('keap_id', String(contact_id))
    .single();

  if (contact) {
    const tags = (contact.tags || []).filter((t: any) => t.id !== tag_id);
    const tagIds = (contact.tag_ids || []).filter((id: number) => id !== tag_id);

    await supabase
      .from('keap_contacts')
      .update({
        tags,
        tag_ids: tagIds,
        sync_last_success: new Date().toISOString(),
      })
      .eq('keap_id', String(contact_id));

    await supabase
      .from('keap_contact_tags')
      .delete()
      .eq('contact_id', contact.id)
      .eq('tag_id', tag_id);

    const activeClientTags = ['Active Client', 'active client', 'Active client'];
    if (activeClientTags.includes(tag_name)) {
      await supabase
        .from('keap_sync_logs')
        .insert({
          sync_type: 'webhook',
          entity_type: 'contact',
          entity_id: contact.id,
          keap_id: String(contact_id),
          operation: 'update',
          status: 'success',
          changes: {
            event: 'active_client_removed',
            tag_name: tag_name,
            tag_id: tag_id,
          },
          created_at: new Date().toISOString(),
        });
    }
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Keap webhook endpoint is ready',
    timestamp: new Date().toISOString(),
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/keap/webhook`,
  });
}