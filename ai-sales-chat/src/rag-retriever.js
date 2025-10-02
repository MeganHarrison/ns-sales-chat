/**
 * RAG Retriever Module
 * 
 * Performs semantic search over the knowledge base using:
 * - OpenAI embeddings (text-embedding-3-large)
 * - Supabase pgvector for similarity search
 */

/**
 * Retrieve relevant documents using vector similarity search
 * 
 * @param {string} query - User's question or message
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of relevant documents with similarity scores
 */
export async function retrieveRelevantDocs(query, options = {}) {
  const {
    supabaseUrl,
    supabaseKey,
    openaiApiKey,
    limit = 5,
    contentTypes = ['faq', 'product', 'policy', 'objection'],
    minSimilarity = 0.7,
    category = null, // Optional category filter
  } = options;

  try {
    // Step 1: Generate embedding for query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: query.substring(0, 8000), // Limit to 8k chars
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Step 2: Vector similarity search in Supabase
    const { data, error } = await callSupabaseRPC(
      supabaseUrl,
      supabaseKey,
      'match_documents',
      {
        query_embedding: queryEmbedding,
        match_threshold: minSimilarity,
        match_count: limit,
        filter_content_types: contentTypes,
        filter_category: category,
      }
    );

    if (error) {
      console.error('Supabase RPC error:', error);
      return [];
    }

    // Step 3: Return results with metadata
    return (data || []).map(doc => ({
      id: doc.id,
      content: doc.content,
      type: doc.content_type,
      title: doc.title,
      category: doc.category,
      metadata: doc.metadata,
      similarity: doc.similarity,
    }));
  } catch (error) {
    console.error('RAG retrieval error:', error);
    return [];
  }
}

/**
 * Smart retrieval strategy based on intent
 * 
 * @param {string} query - User's message
 * @param {string} intent - Detected intent (FACTUAL, OBJECTION, etc.)
 * @param {Object} options - Configuration options
 * @returns {Array} - Relevant documents
 */
export async function smartRetrieve(query, intent, options = {}) {
  let contentTypes = ['faq', 'product', 'policy'];
  let limit = 5;
  let minSimilarity = 0.7;

  // Adjust retrieval strategy based on intent
  switch (intent) {
    case 'FACTUAL':
      // Prioritize FAQs and products
      contentTypes = ['faq', 'product', 'policy'];
      limit = 5;
      minSimilarity = 0.75; // Higher threshold for facts
      break;

    case 'OBJECTION':
      // Prioritize objection handlers
      contentTypes = ['objection', 'policy', 'faq'];
      limit = 3;
      minSimilarity = 0.7;
      break;

    case 'EMOTIONAL':
      // Don't retrieve much - let intelligence handle it
      contentTypes = ['policy']; // Just guarantees/support info
      limit = 2;
      minSimilarity = 0.8;
      break;

    case 'READY_TO_BUY':
      // Product info and checkout details
      contentTypes = ['product', 'policy'];
      limit = 3;
      minSimilarity = 0.75;
      break;

    case 'CASUAL':
      // Minimal retrieval
      return [];

    default:
      // Default to factual strategy
      contentTypes = ['faq', 'product', 'policy'];
      limit = 5;
      minSimilarity = 0.7;
  }

  return retrieveRelevantDocs(query, {
    ...options,
    contentTypes,
    limit,
    minSimilarity,
  });
}

/**
 * Helper: Call Supabase RPC function
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
      const errorText = await response.text();
      throw new Error(`Supabase RPC failed: ${response.status} ${errorText}`);
    }

    return { data: await response.json(), error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

/**
 * Helper: Format retrieved docs for AI context
 */
export function formatDocsForContext(docs) {
  if (!docs || docs.length === 0) {
    return '';
  }

  return docs
    .map((doc, index) => {
      return `[Document ${index + 1}] (${doc.type}, similarity: ${doc.similarity.toFixed(2)})
Title: ${doc.title}
Content: ${doc.content}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Helper: Extract relevant product IDs from retrieved docs
 */
export function extractProductIds(docs) {
  return docs
    .filter(doc => doc.type === 'product' && doc.metadata?.product_id)
    .map(doc => doc.metadata.product_id);
}

/**
 * Helper: Check if specific information was found
 */
export function hasRelevantInfo(docs, minSimilarity = 0.75) {
  return docs.some(doc => doc.similarity >= minSimilarity);
}

/**
 * Query expansion for better retrieval
 * Expands user query with related terms
 */
export function expandQuery(query, intent) {
  const expansions = {
    FACTUAL: {
      price: ['price', 'cost', 'pricing', 'how much', 'payment'],
      program: ['program', 'plan', 'included', 'what do i get', 'features'],
      results: ['results', 'outcomes', 'transformation', 'lose weight', 'success'],
    },
    OBJECTION: {
      time: ['busy', 'time', 'schedule', 'flexible', 'hours per week'],
      money: ['expensive', 'afford', 'cost', 'payment plan', 'discount'],
      skepticism: ['work', 'legit', 'scam', 'proof', 'guarantee'],
    },
  };

  // Simple keyword detection and expansion
  const lowerQuery = query.toLowerCase();
  let expandedTerms = [query];

  if (expansions[intent]) {
    for (const [concept, keywords] of Object.entries(expansions[intent])) {
      if (keywords.some(kw => lowerQuery.includes(kw))) {
        expandedTerms.push(...keywords);
      }
    }
  }

  return [...new Set(expandedTerms)].join(' ');
}

/**
 * Test function for development
 */
export async function testRAG() {
  const testQueries = [
    { query: 'How much does the program cost?', intent: 'FACTUAL' },
    { query: 'I don\'t have time', intent: 'OBJECTION' },
    { query: 'What\'s included in your program?', intent: 'FACTUAL' },
  ];

  console.log('🧪 Testing RAG Retrieval\n');

  for (const test of testQueries) {
    console.log(`Query: "${test.query}" (${test.intent})`);
    const docs = await smartRetrieve(test.query, test.intent, {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    });

    console.log(`  Found ${docs.length} documents`);
    docs.forEach((doc, i) => {
      console.log(`    ${i + 1}. ${doc.title} (${doc.similarity.toFixed(2)})`);
    });
    console.log('');
  }
}
