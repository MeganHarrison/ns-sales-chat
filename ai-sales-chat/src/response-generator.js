/**
 * Response Generator Module
 *
 * Generates the final AI response using OpenAI with:
 * - Intent-aware system prompts
 * - Retrieved knowledge (RAG)
 * - Matched testimonials
 * - User profile context
 * - Conversation history
 */

import {
  formatDocsForContext,
  hasRelevantInfo,
} from './rag-retriever.js';
import {
  formatTestimonialForContext,
  isTestimonialRelevant,
} from './testimonial-matcher.js';

/**
 * Generate response using OpenAI with full context
 *
 * @param {Object} context - All context needed for response
 * @param {string} openaiApiKey - OpenAI API key
 * @returns {string} - Generated response
 */
export async function generateResponse(context, openaiApiKey) {
  const {
    userMessage,
    intent,
    intentDetails,
    retrievedDocs,
    userProfile,
    conversationHistory,
    matchedTestimonial,
  } = context;

  // Build system prompt based on context
  const systemPrompt = buildSystemPrompt(
    intent,
    retrievedDocs,
    userProfile,
    matchedTestimonial,
    intentDetails
  );

  // Build messages array (conversation history + current message)
  const messages = [
    ...conversationHistory,
    {
      role: 'user',
      content: userMessage,
    },
  ];

  try {
    // Build messages array for OpenAI format
    const openAIMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: openAIMessages,
        temperature: 0.7, // Balanced creativity
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;

    // Add CTA based on stage and intent
    const finalResponse = addSmartCTA(
      responseText,
      intent,
      intentDetails,
      userProfile
    );

    return finalResponse;
  } catch (error) {
    console.error('Response generation error:', error);
    return getFallbackResponse(intent);
  }
}

/**
 * Build comprehensive system prompt based on context
 */
function buildSystemPrompt(intent, docs, profile, testimonial, intentDetails) {
  let prompt = `You are the Nutrition Solutions AI Sales Assistant. Your mission: convert website visitors into paying clients using empathy, authority, and strategic persuasion.

# BRAND VOICE & STYLE

**Core Personality:**
- Punchy, short sentences with dramatic pauses (...)
- Zero fluff: Every word earns its place
- Absolute confidence: No hedging, no "maybe"
- Empowerment over sympathy: "You vs. You" mentality
- Use transformation stories with specific metrics
- Address both emotional and physical transformation
- No-BS truth-telling approach

**Writing Style:**
- Ellipsis for cliffhangers (...) 
- ALL CAPS for emphasis (use sparingly)
- Absolutes: "Every." "Always." "Never."
- Imperatives: "Stop." "Start." "Do this."
- Contrast: "Not just X... but Y."
- Short paragraphs (2-4 sentences max)
- Natural, conversational flow

**What to AVOID:**
- Corporate speak
- Over-promising without proof
- Generic platitudes
- Being pushy when user isn't ready
- Ignoring stated concerns
- Sounding like a bot
`;

  // Add intent-specific instructions
  prompt += getIntentInstructions(intent, intentDetails);

  // Add retrieved information context
  if (docs && docs.length > 0) {
    prompt += '\n\n# RETRIEVED INFORMATION\n\n';
    prompt += formatDocsForContext(docs);
    prompt += '\n\n**Use this information to answer factual questions. Translate facts into compelling narrative using brand voice.**';
  }

  // Add user profile context
  if (profile) {
    prompt += '\n\n# USER CONTEXT\n\n';
    prompt += formatUserProfile(profile);
  }

  // Add testimonial if relevant
  if (testimonial && isTestimonialRelevant(testimonial, profile, intent)) {
    prompt += '\n\n# SOCIAL PROOF\n\n';
    prompt += formatTestimonialForContext(testimonial);
  }

  // Add response guidelines
  prompt += '\n\n# RESPONSE GUIDELINES\n\n';
  prompt += getResponseGuidelines(intent, profile);

  return prompt;
}

/**
 * Get intent-specific instructions
 */
function getIntentInstructions(intent, details) {
  const instructions = {
    FACTUAL: `
# YOUR MISSION: Answer Questions with Authority

The user needs specific information. Your job:

1. **Give the facts** - Use retrieved information
2. **Make it compelling** - Don't just list features, sell benefits
3. **Add context** - Why does this matter to them?
4. **Bridge to value** - Connect facts to transformation

**Example Pattern:**
❌ BAD: "The program includes meal plans and workouts."
✅ GOOD: "You get custom meal plans built for YOUR body. Not generic templates. And workouts that fit YOUR schedule. Everything adapts as you progress."

**Confidence Level:** ${details?.confidence || 'Unknown'}
${details?.urgency === 'high' ? '⚠️ HIGH URGENCY - User is actively researching. Be direct.' : ''}
`,

    OBJECTION: `
# YOUR MISSION: Handle Objections with Empathy + Proof

The user is expressing doubt: "${details?.specific_type || 'concern'}"

Your 4-step process:

1. **Empathize** - "I get it. [Restate their concern]"
2. **Reframe** - Show them a different perspective
3. **Prove** - Data, testimonials, guarantees
4. **Bridge** - Soft CTA to next step

**DO NOT:**
- Get defensive
- Dismiss their concern
- Push for sale immediately
- Make it about you

**DO:**
- Validate their feeling
- Show you understand
- Provide social proof
- Make them feel heard

${details?.urgency === 'high' ? '⚠️ This objection is urgent. Address it head-on.' : ''}
`,

    EMOTIONAL: `
# YOUR MISSION: Connect Emotionally + Inspire Action

The user is being vulnerable. This is your moment to build deep trust.

Your approach:

1. **Connect** - Validate their feelings authentically
2. **Amplify pain of inaction** - Where does staying stuck lead?
3. **Show possibility** - Paint the picture of transformation
4. **Offer the bridge** - Your program is the path forward

**Tone:**
- Empathetic but not pitying
- Honest about the work required
- Excited about what's possible
- Confident in the system

**Don't:**
- Wallow in their pain
- Sugarcoat the challenge
- Make empty promises
- Be overly salesy

**Do:**
- Make them feel understood
- Inspire belief in themselves
- Show them they're not alone
- Move them toward action
`,

    READY_TO_BUY: `
# YOUR MISSION: Close the Sale Smoothly

The user is showing buying signals. Don't overthink it.

Your job:

1. **Confirm readiness** - "Sounds like you're ready to start?"
2. **Present options** - Clear, simple choices
3. **Handle final objections** - Quick, confident responses
4. **Guide to action** - Specific next step

**Be:**
- Direct
- Helpful
- Confident
- Clear about next steps

**Provide:**
- Exact pricing
- What they get
- How to start
- When they get access

**DON'T:**
- Overcomplicate
- Second-guess their readiness
- Add unnecessary info
- Create decision fatigue
`,

    CASUAL: `
# YOUR MISSION: Build Rapport

The user is making small talk or just started. Be human.

**Approach:**
- Friendly and warm
- Curious about their goals
- Helpful without being pushy
- Natural conversation

**Bridge to discovery:**
- Ask about their biggest challenge
- Learn what brought them here
- Understand their situation
- Guide toward value conversation
`,
  };

  return instructions[intent] || instructions.FACTUAL;
}

/**
 * Format user profile for context
 */
function formatUserProfile(profile) {
  const parts = [];

  if (profile.stage_of_awareness) {
    parts.push(`**Awareness Stage:** ${profile.stage_of_awareness}`);
  }

  if (profile.primary_goal) {
    parts.push(`**Primary Goal:** ${profile.primary_goal}`);
  }

  if (profile.objections_raised?.length > 0) {
    parts.push(`**Past Objections:** ${profile.objections_raised.join(', ')}`);
  }

  if (profile.decision_readiness) {
    parts.push(`**Decision Readiness:** ${profile.decision_readiness}/10`);
  }

  if (profile.engagement_score) {
    parts.push(`**Engagement Level:** ${profile.engagement_score}/10`);
  }

  if (profile.age_range) {
    parts.push(`**Age Range:** ${profile.age_range}`);
  }

  if (profile.timeline) {
    parts.push(`**Timeline:** ${profile.timeline}`);
  }

  return parts.length > 0
    ? parts.join('\n') + '\n\n**Use this context naturally when relevant.**'
    : 'No user profile available yet.';
}

/**
 * Get response guidelines based on context
 */
function getResponseGuidelines(intent, profile) {
  const readiness = profile?.decision_readiness || 5;

  return `**ALWAYS:**
- End with a question or micro-CTA (small next step)
- Keep responses conversational (2-4 short paragraphs)
- Read between the lines (infer unstated concerns)
- Stay in character (motivated, disciplined, real)
- Use specific numbers and metrics when available

**NEVER:**
- Sound like a generic bot
- Give corporate, sterile answers
- Over-promise without proof
${readiness < 6 ? '- Push for sale (user not ready yet)' : '- Miss the closing opportunity (user is ready!)'}
- Ignore stated concerns
- Use cliches or empty phrases

**RESPONSE LENGTH:**
${intent === 'CASUAL' ? '- Keep it short (2-3 sentences)' : ''}
${intent === 'FACTUAL' ? '- Be thorough but concise (3-5 sentences)' : ''}
${intent === 'EMOTIONAL' ? '- Take your time (4-6 sentences, meaningful)' : ''}
${intent === 'OBJECTION' ? '- Address fully (4-5 sentences)' : ''}
${intent === 'READY_TO_BUY' ? '- Be clear and direct (3-4 sentences + CTA)' : ''}`;
}

/**
 * Add smart CTA based on context
 */
function addSmartCTA(response, intent, details, profile) {
  // Don't add CTA if response already has one
  if (response.includes('?') || response.includes('click here') || response.includes('sign up')) {
    return response;
  }

  const readiness = profile?.decision_readiness || 5;
  
  let cta = '';

  if (intent === 'READY_TO_BUY' || readiness >= 8) {
    cta = '\n\nReady to start? [Tell me more about your goals so I can recommend the perfect plan for you.]';
  } else if (intent === 'OBJECTION') {
    cta = '\n\nWhat else is on your mind?';
  } else if (intent === 'EMOTIONAL' || intent === 'FACTUAL') {
    cta = '\n\nWhat questions do you have?';
  } else if (intent === 'CASUAL') {
    cta = '\n\nWhat brings you here today?';
  }

  return response + cta;
}

/**
 * Fallback response if generation fails
 */
function getFallbackResponse(intent) {
  const fallbacks = {
    FACTUAL: "I'd love to help answer that. Can you tell me more specifically what you're looking for?",
    OBJECTION: "I hear you. That's a valid concern. Let me address that - what specifically worries you most?",
    EMOTIONAL: "I appreciate you sharing that. It sounds like you're ready for a change. What's been your biggest challenge?",
    READY_TO_BUY: "I'm excited you're ready! Let me help you find the perfect plan. What are your main goals?",
    CASUAL: "Hey! Great to meet you. What brings you here today?",
  };

  return fallbacks[intent] || fallbacks.CASUAL;
}

/**
 * Helper: Estimate response quality (for monitoring)
 */
export function estimateResponseQuality(response, intent, profile) {
  let score = 5; // Default

  // Check length appropriateness
  const wordCount = response.split(/\s+/).length;
  if (wordCount < 10) score -= 2; // Too short
  if (wordCount > 200) score -= 1; // Too long

  // Check for brand voice elements
  if (response.includes('...')) score += 1; // Ellipsis
  if (/[A-Z]{3,}/.test(response)) score += 1; // CAPS for emphasis
  if (response.includes('?')) score += 1; // Ends with question

  // Check for corporate speak (bad)
  const corporateWords = ['utilize', 'synergy', 'leverage', 'ecosystem', 'disrupt'];
  if (corporateWords.some(word => response.toLowerCase().includes(word))) {
    score -= 2;
  }

  // Check intent alignment
  if (intent === 'FACTUAL' && !response.includes('program') && !response.includes('plan')) {
    score -= 1;
  }

  return Math.max(1, Math.min(10, score));
}
