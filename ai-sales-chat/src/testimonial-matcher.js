/**
 * Testimonial Matcher Module
 * 
 * Intelligently matches testimonials to user context based on:
 * - Demographics (age, location, occupation)
 * - Objections overcome
 * - Goals achieved
 * - Semantic similarity to user's story
 */

/**
 * Match the best testimonial to user's profile and current context
 * 
 * @param {Object} userProfile - User profile from database
 * @param {string} currentMessage - User's current message
 * @param {Object} options - Configuration options
 * @returns {Object|null} - Matched testimonial or null
 */
export async function matchTestimonial(userProfile, currentMessage, options = {}) {
  const {
    supabaseUrl,
    supabaseKey,
    openaiApiKey,
    intent = null,
  } = options;

  try {
    // Strategy 1: Objection-based matching (most powerful)
    if (userProfile?.objections_raised?.length > 0) {
      const testimonial = await matchByObjections(
        userProfile.objections_raised,
        supabaseUrl,
        supabaseKey
      );
      if (testimonial) {
        console.log('✓ Matched by objections:', testimonial.client_name);
        return testimonial;
      }
    }

    // Strategy 2: Demographic + goal matching
    if (userProfile?.age_range || userProfile?.primary_goal) {
      const testimonial = await matchByDemographics(
        userProfile,
        supabaseUrl,
        supabaseKey
      );
      if (testimonial) {
        console.log('✓ Matched by demographics:', testimonial.client_name);
        return testimonial;
      }
    }

    // Strategy 3: Semantic matching on current message (fallback)
    if (currentMessage && openaiApiKey) {
      const testimonial = await matchBySemanticSimilarity(
        currentMessage,
        userProfile,
        supabaseUrl,
        supabaseKey,
        openaiApiKey
      );
      if (testimonial) {
        console.log('✓ Matched by semantic similarity:', testimonial.client_name);
        return testimonial;
      }
    }

    // Strategy 4: Intent-based default testimonial
    if (intent) {
      const testimonial = await getDefaultTestimonial(
        intent,
        supabaseUrl,
        supabaseKey
      );
      if (testimonial) {
        console.log('✓ Using default testimonial for intent:', testimonial.client_name);
        return testimonial;
      }
    }

    console.log('⚠ No testimonial match found');
    return null;
  } catch (error) {
    console.error('Testimonial matching error:', error);
    return null;
  }
}

/**
 * Strategy 1: Match by objections overcome
 */
async function matchByObjections(userObjections, supabaseUrl, supabaseKey) {
  try {
    const { data, error } = await callSupabase(
      supabaseUrl,
      supabaseKey,
      'testimonials',
      {
        select: '*',
        order: 'created_at.desc',
        limit: 10,
      }
    );

    if (error || !data) return null;

    // Find testimonial that overcame the most matching objections
    let bestMatch = null;
    let maxMatches = 0;

    for (const testimonial of data) {
      if (!testimonial.objections_overcome) continue;

      const matches = userObjections.filter(obj =>
        testimonial.objections_overcome.includes(obj)
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = testimonial;
      }
    }

    return maxMatches > 0 ? bestMatch : null;
  } catch (error) {
    console.error('Objection matching error:', error);
    return null;
  }
}

/**
 * Strategy 2: Match by demographics (age, goals)
 */
async function matchByDemographics(userProfile, supabaseUrl, supabaseKey) {
  try {
    const { data, error } = await callSupabase(
      supabaseUrl,
      supabaseKey,
      'testimonials',
      {
        select: '*',
        order: 'created_at.desc',
        limit: 20,
      }
    );

    if (error || !data) return null;

    // Calculate demographic similarity score
    const scored = data.map(testimonial => {
      let score = 0;

      // Age matching
      if (userProfile.age_range && testimonial.age) {
        const [minAge, maxAge] = userProfile.age_range.split('-').map(Number);
        if (testimonial.age >= minAge && testimonial.age <= maxAge) {
          score += 3;
        }
      }

      // Goal matching
      if (userProfile.primary_goal && testimonial.goals_achieved) {
        if (testimonial.goals_achieved.includes(userProfile.primary_goal)) {
          score += 5;
        }
      }

      // Occupation similarity (if available)
      if (userProfile.occupation && testimonial.occupation) {
        if (testimonial.occupation.toLowerCase().includes(userProfile.occupation.toLowerCase())) {
          score += 2;
        }
      }

      return { testimonial, score };
    });

    // Return best match if score > 0
    const best = scored.sort((a, b) => b.score - a.score)[0];
    return best?.score > 0 ? best.testimonial : null;
  } catch (error) {
    console.error('Demographic matching error:', error);
    return null;
  }
}

/**
 * Strategy 3: Semantic similarity matching
 */
async function matchBySemanticSimilarity(
  userMessage,
  userProfile,
  supabaseUrl,
  supabaseKey,
  openaiApiKey
) {
  try {
    // Build search query from user context
    const query = buildSemanticQuery(userMessage, userProfile);

    // Generate embedding
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) return null;

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Call Supabase RPC for vector search
    const { data, error } = await callSupabaseRPC(
      supabaseUrl,
      supabaseKey,
      'match_testimonials',
      {
        query_embedding: queryEmbedding,
        match_count: 1,
      }
    );

    if (error || !data || data.length === 0) return null;

    return data[0];
  } catch (error) {
    console.error('Semantic matching error:', error);
    return null;
  }
}

/**
 * Strategy 4: Get default testimonial based on intent
 */
async function getDefaultTestimonial(intent, supabaseUrl, supabaseKey) {
  try {
    // Get most versatile testimonial (multiple objections overcome)
    const { data, error } = await callSupabase(
      supabaseUrl,
      supabaseKey,
      'testimonials',
      {
        select: '*',
        order: 'created_at.desc',
        limit: 5,
      }
    );

    if (error || !data) return null;

    // Find testimonial with most objections overcome
    const sorted = data.sort((a, b) => {
      const aCount = a.objections_overcome?.length || 0;
      const bCount = b.objections_overcome?.length || 0;
      return bCount - aCount;
    });

    return sorted[0] || null;
  } catch (error) {
    console.error('Default testimonial error:', error);
    return null;
  }
}

/**
 * Helper: Build semantic search query from user context
 */
function buildSemanticQuery(userMessage, userProfile) {
  let parts = [userMessage];

  if (userProfile?.age_range) {
    parts.push(`${userProfile.age_range} years old`);
  }

  if (userProfile?.primary_goal) {
    parts.push(`wants to ${userProfile.primary_goal}`);
  }

  if (userProfile?.objections_raised?.length > 0) {
    parts.push(`struggles with ${userProfile.objections_raised.join(', ')}`);
  }

  return parts.join('. ');
}

/**
 * Helper: Format testimonial for AI context
 */
export function formatTestimonialForContext(testimonial) {
  if (!testimonial) return '';

  return `RELEVANT SUCCESS STORY:
${testimonial.client_name}, ${testimonial.age}, ${testimonial.location}
${testimonial.occupation ? `Occupation: ${testimonial.occupation}` : ''}

Starting Point: ${testimonial.starting_point}
Results: ${testimonial.results} (${testimonial.timeframe})

"${testimonial.quote}"

What they overcame: ${testimonial.objections_overcome?.join(', ') || 'N/A'}
Goals achieved: ${testimonial.goals_achieved?.join(', ') || 'N/A'}

${testimonial.image_url ? `[Image available: ${testimonial.image_url}]` : ''}

Use this story strategically if it helps:
1. Build credibility
2. Show what's possible
3. Address similar objections
4. Create emotional connection`;
}

/**
 * Helper: Check if testimonial is relevant to current context
 */
export function isTestimonialRelevant(testimonial, userProfile, intent) {
  if (!testimonial) return false;

  // Always relevant for EMOTIONAL and OBJECTION intents
  if (intent === 'EMOTIONAL' || intent === 'OBJECTION') return true;

  // Check if testimonial matches user profile
  if (userProfile?.objections_raised?.length > 0) {
    const hasMatchingObjection = userProfile.objections_raised.some(obj =>
      testimonial.objections_overcome?.includes(obj)
    );
    if (hasMatchingObjection) return true;
  }

  if (userProfile?.primary_goal) {
    if (testimonial.goals_achieved?.includes(userProfile.primary_goal)) {
      return true;
    }
  }

  // Default: use testimonial if READY_TO_BUY (social proof helps close)
  return intent === 'READY_TO_BUY';
}

/**
 * Helper: Call Supabase REST API
 */
async function callSupabase(supabaseUrl, supabaseKey, table, params) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${table}?${queryString}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    return { data: await response.json(), error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

/**
 * Helper: Call Supabase RPC
 */
async function callSupabaseRPC(supabaseUrl, supabaseKey, functionName, params) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/${functionName}`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase RPC error: ${response.status}`);
    }

    return { data: await response.json(), error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}
