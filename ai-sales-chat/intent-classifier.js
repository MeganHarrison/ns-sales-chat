/**
 * Intent Classifier Module
 * 
 * Uses Claude to classify user intent into categories:
 * - FACTUAL: Questions needing specific information
 * - EMOTIONAL: Personal struggles, motivation requests
 * - OBJECTION: Expressing doubt or hesitation
 * - READY_TO_BUY: Clear buying signals
 * - CASUAL: Small talk, greetings
 */

export async function classifyIntent(userMessage, conversationHistory, anthropicApiKey) {
  const systemPrompt = `You are an intent classifier for Nutrition Solutions sales chat.

Analyze the user's message and classify it into one of these categories:

**FACTUAL** - Questions needing specific information:
- Product details ("What's included?", "How much does it cost?")
- Policies ("What's your refund policy?", "Do you ship to Canada?")
- Logistics ("How long for delivery?", "When do I get access?")
- Program specifics ("What workouts?", "What kind of meal plans?")

**EMOTIONAL** - Personal struggles, sharing their story:
- Expressing frustration ("I've tried everything")
- Sharing pain points ("I hate how I look")
- Seeking motivation ("I don't know if I can do this")
- Opening up about struggles ("My health is declining")

**OBJECTION** - Expressing doubt, concern, or hesitation:
- Price concerns ("That's expensive", "I can't afford that")
- Time concerns ("I'm too busy", "I travel a lot")
- Skepticism ("Does this really work?", "Sounds too good to be true")
- Past failures ("I've tried everything before")
- Not ready ("I'll think about it", "Maybe next month")

**READY_TO_BUY** - Clear buying signals:
- Asking how to start ("How do I sign up?", "What's the next step?")
- Payment questions ("Do you accept PayPal?", "Can I pay monthly?")
- Booking intent ("When can we schedule?", "I'm ready")
- Closing questions ("What happens after I purchase?")

**CASUAL** - Small talk, greetings, off-topic:
- Greetings ("Hi", "Hello", "Hey there")
- Pleasantries ("How are you?", "Thanks!")
- Off-topic ("What's the weather?", random chat)

**IMPORTANT:**
- Consider conversation context (history)
- Look for emotional undertones even in factual questions
- Detect hidden objections in seemingly casual questions
- High urgency if multiple buying signals in conversation

Return JSON ONLY (no other text):
{
  "intent": "FACTUAL|EMOTIONAL|OBJECTION|READY_TO_BUY|CASUAL",
  "confidence": 0.0-1.0,
  "specific_type": "more specific classification",
  "urgency": "low|medium|high",
  "reasoning": "brief explanation (1 sentence)"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.3, // Lower temp for more consistent classification
        system: systemPrompt,
        messages: [
          // Include last 4 messages for context
          ...conversationHistory.slice(-4),
          {
            role: 'user',
            content: `Classify this message: "${userMessage}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.content[0].text;

    // Parse JSON response
    // Handle cases where Claude might add markdown formatting
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from Claude response:', rawText);
      // Return default classification
      return {
        intent: 'FACTUAL',
        confidence: 0.5,
        specific_type: 'unknown',
        urgency: 'medium',
        reasoning: 'Classification failed, defaulted to FACTUAL',
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate result
    const validIntents = ['FACTUAL', 'EMOTIONAL', 'OBJECTION', 'READY_TO_BUY', 'CASUAL'];
    if (!validIntents.includes(result.intent)) {
      console.warn(`Invalid intent "${result.intent}", defaulting to FACTUAL`);
      result.intent = 'FACTUAL';
    }

    return result;
  } catch (error) {
    console.error('Intent classification error:', error);
    // Return safe default
    return {
      intent: 'FACTUAL',
      confidence: 0.5,
      specific_type: 'error_occurred',
      urgency: 'medium',
      reasoning: 'Error during classification, defaulted to FACTUAL',
    };
  }
}

/**
 * Helper: Detect if user is showing buying signals (for progressive profiling)
 */
export function detectBuyingSignals(userMessage) {
  const buyingPhrases = [
    'how do i sign up',
    'how do i start',
    'how do i join',
    'what\'s the next step',
    'how do i purchase',
    'how do i pay',
    'i\'m ready',
    'let\'s do this',
    'sign me up',
    'where do i buy',
    'take my money',
    'i\'m in',
    'i want to start',
    'when can i start',
  ];

  const lowerMessage = userMessage.toLowerCase();
  return buyingPhrases.some(phrase => lowerMessage.includes(phrase));
}

/**
 * Helper: Detect objection type for better testimonial matching
 */
export function detectObjectionType(userMessage) {
  const lowerMessage = userMessage.toLowerCase();

  const objectionPatterns = {
    price: ['expensive', 'afford', 'cost', 'price', 'cheap', 'money', 'budget'],
    time: ['busy', 'time', 'schedule', 'travel', 'work', 'hours'],
    skepticism: ['really work', 'prove', 'scam', 'too good', 'legit', 'trust'],
    past_failures: ['tried', 'failed', 'nothing works', 'before', 'didn\'t work'],
    health: ['injury', 'health', 'condition', 'medical', 'pain', 'doctor'],
    age: ['too old', 'age', 'older', 'senior'],
    not_ready: ['think about', 'maybe', 'later', 'next month', 'not sure'],
  };

  const detected = [];
  for (const [type, keywords] of Object.entries(objectionPatterns)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      detected.push(type);
    }
  }

  return detected;
}

/**
 * Helper: Calculate user engagement score based on message
 */
export function calculateEngagementScore(userMessage) {
  const length = userMessage.trim().split(/\s+/).length;
  let score = 5; // Default

  // Long messages = high engagement
  if (length > 50) score = 10;
  else if (length > 30) score = 9;
  else if (length > 20) score = 8;
  else if (length > 10) score = 7;
  else if (length > 5) score = 6;
  else if (length <= 2) score = 3; // Very short = low engagement

  // Question marks indicate engagement
  const questions = (userMessage.match(/\?/g) || []).length;
  score += Math.min(questions, 2); // +1 or +2

  // Exclamation marks indicate emotion/excitement
  const exclamations = (userMessage.match(/!/g) || []).length;
  score += Math.min(exclamations, 1); // +1

  return Math.min(score, 10); // Cap at 10
}
