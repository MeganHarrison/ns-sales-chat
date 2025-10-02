/**
 * Test Script for RAG Retrieval
 * 
 * Tests semantic search functionality to ensure:
 * 1. Embeddings are being generated correctly
 * 2. Vector search is working
 * 3. Results are relevant
 * 
 * Usage:
 *   node scripts/test-search.js
 */

import dotenv from 'dotenv';
import { smartRetrieve } from '../src/rag-retriever.js';
import { classifyIntent } from '../src/intent-classifier.js';

dotenv.config();

const testQueries = [
  {
    query: 'How much does the program cost?',
    expectedIntent: 'FACTUAL',
    expectedDocs: ['pricing', 'product'],
  },
  {
    query: "I don't have time for this",
    expectedIntent: 'OBJECTION',
    expectedDocs: ['objection', 'time'],
  },
  {
    query: "What's included in your program?",
    expectedIntent: 'FACTUAL',
    expectedDocs: ['product', 'faq'],
  },
  {
    query: "I've tried everything and nothing works",
    expectedIntent: 'EMOTIONAL',
    expectedDocs: ['objection', 'testimonial'],
  },
  {
    query: 'How do I sign up?',
    expectedIntent: 'READY_TO_BUY',
    expectedDocs: ['product', 'policy'],
  },
  {
    query: 'Do you offer a money-back guarantee?',
    expectedIntent: 'FACTUAL',
    expectedDocs: ['policy', 'guarantee'],
  },
];

async function runTests() {
  console.log('🧪 Testing RAG Retrieval System\n');
  console.log('Configuration:');
  console.log(`  Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`  OpenAI Model: text-embedding-3-large`);
  console.log(`  Claude Model: claude-sonnet-4-20250514\n`);

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Missing required environment variables!');
    console.error('Required: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY');
    process.exit(1);
  }

  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST ${i + 1}/${testQueries.length}: "${test.query}"`);
    console.log('='.repeat(80));

    try {
      // Step 1: Classify intent
      console.log('\n1️⃣ Classifying intent...');
      const intentResult = await classifyIntent(
        test.query,
        [],
        process.env.ANTHROPIC_API_KEY
      );

      console.log(`   Intent: ${intentResult.intent}`);
      console.log(`   Confidence: ${intentResult.confidence}`);
      console.log(`   Specific Type: ${intentResult.specific_type}`);
      console.log(`   Reasoning: ${intentResult.reasoning}`);

      const intentMatch = intentResult.intent === test.expectedIntent;
      console.log(`   ${intentMatch ? '✓' : '✗'} Intent ${intentMatch ? 'matches' : 'does not match'} expected: ${test.expectedIntent}`);

      // Step 2: Retrieve docs
      console.log('\n2️⃣ Retrieving documents...');
      const docs = await smartRetrieve(test.query, intentResult.intent, {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_ANON_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
      });

      console.log(`   Found ${docs.length} documents\n`);

      if (docs.length === 0) {
        console.log('   ⚠️  No documents retrieved (may indicate empty database)');
      } else {
        docs.forEach((doc, idx) => {
          console.log(`   📄 Document ${idx + 1}:`);
          console.log(`      Type: ${doc.type}`);
          console.log(`      Title: ${doc.title}`);
          console.log(`      Category: ${doc.category}`);
          console.log(`      Similarity: ${doc.similarity.toFixed(3)}`);
          console.log(`      Content: ${doc.content.substring(0, 150)}...`);
          console.log('');
        });
      }

      // Step 3: Check relevance
      console.log('3️⃣ Checking relevance...');
      const hasExpectedDocs = test.expectedDocs.some(expectedType =>
        docs.some(doc =>
          doc.type === expectedType ||
          doc.category?.toLowerCase().includes(expectedType.toLowerCase()) ||
          doc.title?.toLowerCase().includes(expectedType.toLowerCase())
        )
      );

      console.log(`   ${hasExpectedDocs ? '✓' : '✗'} ${hasExpectedDocs ? 'Contains' : 'Missing'} expected doc types: ${test.expectedDocs.join(', ')}`);

      // Overall test result
      const testPassed = intentMatch && (docs.length > 0 || intentResult.intent === 'CASUAL');
      if (testPassed) {
        passCount++;
        console.log('\n✅ TEST PASSED');
      } else {
        failCount++;
        console.log('\n❌ TEST FAILED');
      }
    } catch (error) {
      failCount++;
      console.error('\n❌ TEST FAILED WITH ERROR:', error.message);
    }
  }

  // Final summary
  console.log('\n\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passCount}/${testQueries.length}`);
  console.log(`❌ Failed: ${failCount}/${testQueries.length}`);
  console.log(`📊 Success Rate: ${((passCount / testQueries.length) * 100).toFixed(1)}%`);

  if (passCount === testQueries.length) {
    console.log('\n🎉 All tests passed! System is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    if (failCount === testQueries.length) {
      console.log('\n💡 If ALL tests failed, check:');
      console.log('   1. Is your Supabase database populated? Run: node scripts/ingest-data.js');
      console.log('   2. Are your API keys correct in .env?');
      console.log('   3. Is the match_documents function created in Supabase?');
    }
  }

  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
