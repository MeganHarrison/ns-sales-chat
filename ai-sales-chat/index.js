/**
 * Nutrition Solutions AI Sales Chat - Main Cloudflare Worker
 * 
 * This is the main API endpoint that:
 * 1. Receives user messages
 * 2. Manages sessions and conversation state
 * 3. Orchestrates intent classification, RAG retrieval, and response generation
 * 4. Logs everything to Supabase for analytics
 * 5. Progressively builds user profiles
 */

import { classifyIntent, detectObjectionType, calculateEngagementScore } from './intent-classifier.js';
import { smartRetrieve } from './rag-retriever.js';
import { matchTestimonial } from './testimonial-matcher.js';
import { generateResponse, estimateResponseQuality } from './response-generator.js';

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      // Parse request
      const { message, session_id } = await request.json();

      if (!message || !session_id) {
        return jsonResponse({ error: 'Missing message or session_id' }, 400, corsHeaders);
      }

      // Initialize Supabase client (using REST API)
      const supabase = {
        url: env.SUPABASE_URL,
        key: env.SUPABASE_ANON_KEY,
      };

      console.log(`📨 New message from session: ${session_id}`);

      // STEP 1: Get or create conversation
      let conversation = await getConversation(supabase, session_id);
      if (!conversation) {
        conversation = await createConversation(supabase, session_id);
        console.log('✓ Created new conversation');
      } else {
        console.log('✓ Retrieved existing conversation');
      }

      // STEP 2: Get conversation history
      const history = await getConversationHistory(supabase, conversation.id);
      console.log(`✓ Loaded ${history.length} previous messages`);

      // STEP 3: Get or create user profile
      let userProfile = await getUserProfile(supabase, session_id);
      if (!userProfile) {
        userProfile = await createUserProfile(supabase, session_id);
        console.log('✓ Created new user profile');
      } else {
        console.log('✓ Retrieved user profile');
      }

      // STEP 4: Classify intent
      console.log('🤖 Classifying intent...');
      const intentResult = await classifyIntent(
        message,
        history,
        env.ANTHROPIC_API_KEY
      );
      console.log(`✓ Intent: ${intentResult.intent} (confidence: ${intentResult.confidence})`);

      // STEP 5: Retrieve relevant docs if needed
      let retrievedDocs = [];
      if (intentResult.intent === 'FACTUAL' || intentResult.intent === 'OBJECTION') {
        console.log('📚 Retrieving knowledge...');
        retrievedDocs = await smartRetrieve(message, intentResult.intent, {
          supabaseUrl: env.SUPABASE_URL,
          supabaseKey: env.SUPABASE_ANON_KEY,
          openaiApiKey: env.OPENAI_API_KEY,
        });
        console.log(`✓ Retrieved ${retrievedDocs.length} documents`);
      }

      // STEP 6: Match testimonial if relevant
      let testimonial = null;
      if (intentResult.intent === 'OBJECTION' || intentResult.intent === 'EMOTIONAL') {
        console.log('⭐ Matching testimonial...');
        testimonial = await matchTestimonial(userProfile, message, {
          supabaseUrl: env.SUPABASE_URL,
          supabaseKey: env.SUPABASE_ANON_KEY,
          openaiApiKey: env.OPENAI_API_KEY,
          intent: intentResult.intent,
        });
        if (testimonial) {
          console.log(`✓ Matched: ${testimonial.client_name}`);
        }
      }

      // STEP 7: Generate response
      console.log('💬 Generating response...');
      const responseText = await generateResponse(
        {
          userMessage: message,
          intent: intentResult.intent,
          intentDetails: intentResult,
          retrievedDocs,
          userProfile,
          conversationHistory: history,
          matchedTestimonial: testimonial,
        },
        env.ANTHROPIC_API_KEY
      );
      console.log('✓ Response generated');

      // STEP 8: Log messages to database
      await logMessage(supabase, conversation.id, 'user', message, {
        intent_detected: intentResult.intent,
        retrieval_used: retrievedDocs.length > 0,
        documents_retrieved: retrievedDocs.map(d => d.id),
      });

      const responseQuality = estimateResponseQuality(
        responseText,
        intentResult.intent,
        userProfile
      );

      await logMessage(supabase, conversation.id, 'assistant', responseText, {
        retrieval_used: retrievedDocs.length > 0,
        documents_retrieved: retrievedDocs.map(d => d.id),
        sentiment_score: responseQuality / 10, // Convert to 0-1 scale
      });

      console.log('✓ Logged messages');

      // STEP 9: Update user profile (progressive profiling)
      await updateUserProfile(
        supabase,
        session_id,
        message,
        intentResult,
        userProfile
      );
      console.log('✓ Updated user profile');

      // STEP 10: Update conversation timestamp
      await updateConversation(supabase, conversation.id);

      // STEP 11: Return response
      return jsonResponse(
        {
          message: responseText,
          intent: intentResult.intent,
          confidence: intentResult.confidence,
          session_id: session_id,
        },
        200,
        corsHeaders
      );
    } catch (error) {
      console.error('❌ Error:', error);
      return jsonResponse(
        {
          error: 'Internal server error',
          message: "I'm having a moment. Can you try that again?",
        },
        500,
        corsHeaders
      );
    }
  },
};

// =============================================================================
// DATABASE HELPERS
// =============================================================================

async function callSupabase(supabase, endpoint, options = {}) {
  const { method = 'GET', body = null, query = {} } = options;

  const queryString = new URLSearchParams(query).toString();
  const url = `${supabase.url}/rest/v1/${endpoint}${queryString ? `?${queryString}` : ''}`;

  const fetchOptions = {
    method,
    headers: {
      'apikey': supabase.key,
      'Authorization': `Bearer ${supabase.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function getConversation(supabase, sessionId) {
  const data = await callSupabase(supabase, 'conversations', {
    query: {
      session_id: `eq.${sessionId}`,
      select: '*',
      limit: 1,
    },
  });
  return data?.[0] || null;
}

async function createConversation(supabase, sessionId) {
  const data = await callSupabase(supabase, 'conversations', {
    method: 'POST',
    body: {
      session_id: sessionId,
      status: 'active',
      started_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    },
  });
  return data?.[0];
}

async function updateConversation(supabase, conversationId) {
  await callSupabase(supabase, 'conversations', {
    method: 'PATCH',
    body: { last_message_at: new Date().toISOString() },
    query: { id: `eq.${conversationId}` },
  });
}

async function getConversationHistory(supabase, conversationId, limit = 10) {
  const data = await callSupabase(supabase, 'messages', {
    query: {
      conversation_id: `eq.${conversationId}`,
      select: 'role,content',
      order: 'timestamp.asc',
      limit: limit,
    },
  });
  return data || [];
}

async function logMessage(supabase, conversationId, role, content, metadata = {}) {
  await callSupabase(supabase, 'messages', {
    method: 'POST',
    body: {
      conversation_id: conversationId,
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  });
}

async function getUserProfile(supabase, sessionId) {
  const data = await callSupabase(supabase, 'user_profiles', {
    query: {
      session_id: `eq.${sessionId}`,
      select: '*',
      limit: 1,
    },
  });
  return data?.[0] || null;
}

async function createUserProfile(supabase, sessionId) {
  const data = await callSupabase(supabase, 'user_profiles', {
    method: 'POST',
    body: {
      session_id: sessionId,
      stage_of_awareness: 'unaware',
      decision_readiness: 5,
      engagement_score: 5,
      objections_raised: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  return data?.[0];
}

async function updateUserProfile(supabase, sessionId, message, intentResult, currentProfile) {
  // Extract objections if present
  const objections = detectObjectionType(message);
  const allObjections = [
    ...new Set([...(currentProfile.objections_raised || []), ...objections]),
  ];

  // Calculate engagement
  const engagement = calculateEngagementScore(message);

  // Determine stage of awareness
  let stage = currentProfile.stage_of_awareness || 'unaware';
  if (intentResult.intent === 'READY_TO_BUY') stage = 'most_aware';
  else if (intentResult.intent === 'OBJECTION') stage = 'solution_aware';
  else if (intentResult.intent === 'FACTUAL') stage = 'product_aware';
  else if (intentResult.intent === 'EMOTIONAL') stage = 'problem_aware';

  // Update decision readiness based on intent and urgency
  let readiness = currentProfile.decision_readiness || 5;
  if (intentResult.intent === 'READY_TO_BUY') readiness = Math.min(10, readiness + 2);
  else if (intentResult.urgency === 'high') readiness = Math.min(10, readiness + 1);
  else if (intentResult.intent === 'OBJECTION') readiness = Math.max(1, readiness - 1);

  await callSupabase(supabase, 'user_profiles', {
    method: 'PATCH',
    body: {
      objections_raised: allObjections,
      stage_of_awareness: stage,
      decision_readiness: readiness,
      engagement_score: engagement,
      updated_at: new Date().toISOString(),
    },
    query: { session_id: `eq.${sessionId}` },
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
  });
}
