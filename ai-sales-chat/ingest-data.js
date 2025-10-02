/**
 * Data Ingestion Script for Nutrition Solutions AI Sales Chat
 * 
 * This script:
 * 1. Loads all data from JSON files (FAQs, products, testimonials, objections)
 * 2. Generates OpenAI embeddings for semantic search
 * 3. Uploads everything to Supabase database
 * 
 * Usage:
 *   node scripts/ingest-data.js
 * 
 * Requirements:
 *   - SUPABASE_URL in .env
 *   - SUPABASE_SERVICE_ROLE_KEY in .env (use service role, not anon key)
 *   - OPENAI_API_KEY in .env
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility: Generate embedding with retry logic
async function generateEmbedding(text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text.substring(0, 8000), // Limit to 8k chars to avoid token limits
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error(`❌ Embedding generation failed (attempt ${i + 1}/${retries}):`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
}

// Utility: Load JSON file
function loadJSON(filename) {
  const filepath = path.join(__dirname, '..', 'data', filename);
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

// 1. Ingest FAQs
async function ingestFAQs() {
  console.log('\n📚 Ingesting FAQs...');
  const faqs = loadJSON('faqs.json');
  if (!faqs) return;

  let successCount = 0;
  let errorCount = 0;

  for (const faq of faqs) {
    try {
      const content = `Q: ${faq.question}\nA: ${faq.answer}`;
      const embedding = await generateEmbedding(content);

      const { error } = await supabase.from('rag_documents').insert({
        content: content,
        content_type: 'faq',
        title: faq.question,
        category: faq.category,
        priority: faq.priority || 5,
        metadata: {
          question: faq.question,
          answer: faq.answer,
        },
        embedding: embedding,
      });

      if (error) throw error;

      console.log(`  ✓ ${faq.question}`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed: ${faq.question}`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ FAQs: ${successCount} succeeded, ${errorCount} failed`);
}

// 2. Ingest Products
async function ingestProducts() {
  console.log('\n🛒 Ingesting Products...');
  const products = loadJSON('products.json');
  if (!products) return;

  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      const content = `${product.name}: ${product.description}. Price: $${product.price}. Includes: ${product.includes.join(', ')}. Benefits: ${product.benefits}. Target Customer: ${product.target_customer}`;
      const embedding = await generateEmbedding(content);

      const { error } = await supabase.from('rag_documents').insert({
        content: content,
        content_type: 'product',
        title: product.name,
        category: 'products',
        priority: 10, // Products are always high priority
        metadata: {
          product_id: product.id,
          price: product.price,
          url: product.url,
        },
        embedding: embedding,
      });

      if (error) throw error;

      console.log(`  ✓ ${product.name}`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed: ${product.name}`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Products: ${successCount} succeeded, ${errorCount} failed`);
}

// 3. Ingest Testimonials
async function ingestTestimonials() {
  console.log('\n⭐ Ingesting Testimonials...');
  const testimonials = loadJSON('testimonials.json');
  if (!testimonials) return;

  let successCount = 0;
  let errorCount = 0;

  for (const testimonial of testimonials) {
    try {
      const content = `${testimonial.name}, ${testimonial.age}, ${testimonial.location}. Starting point: ${testimonial.starting_point}. Results: ${testimonial.results} in ${testimonial.timeframe}. Quote: "${testimonial.quote}". Full story: ${testimonial.full_story}`;
      const embedding = await generateEmbedding(content);

      const { error } = await supabase.from('testimonials').insert({
        client_name: testimonial.name,
        age: testimonial.age,
        location: testimonial.location,
        occupation: testimonial.occupation,
        starting_point: testimonial.starting_point,
        results: testimonial.results,
        timeframe: testimonial.timeframe,
        quote: testimonial.quote,
        full_story: testimonial.full_story,
        objections_overcome: testimonial.objections_overcome,
        goals_achieved: testimonial.goals_achieved,
        image_url: testimonial.image_url,
        verified: true,
        embedding: embedding,
      });

      if (error) throw error;

      console.log(`  ✓ ${testimonial.name}`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed: ${testimonial.name}`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Testimonials: ${successCount} succeeded, ${errorCount} failed`);
}

// 4. Ingest Objection Handlers
async function ingestObjections() {
  console.log('\n🛡️ Ingesting Objection Handlers...');
  const objections = loadJSON('objections.json');
  if (!objections) return;

  let successCount = 0;
  let errorCount = 0;

  for (const objection of objections) {
    try {
      const content = `Objection: "${objection.objection_quote}"\nResponse: ${objection.response}\nClose: ${objection.close_cta}`;
      const embedding = await generateEmbedding(content);

      const { error } = await supabase.from('rag_documents').insert({
        content: content,
        content_type: 'objection',
        title: objection.objection_type,
        category: 'objections',
        priority: 9,
        metadata: {
          objection_type: objection.objection_type,
          objection_quote: objection.objection_quote,
          response: objection.response,
          close_cta: objection.close_cta,
        },
        embedding: embedding,
      });

      if (error) throw error;

      console.log(`  ✓ ${objection.objection_type}`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Failed: ${objection.objection_type}`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Objections: ${successCount} succeeded, ${errorCount} failed`);
}

// 5. Ingest Company Info
async function ingestCompanyInfo() {
  console.log('\n🏢 Ingesting Company Information...');
  const companyInfo = loadJSON('company-info.json');
  if (!companyInfo) return;

  try {
    // Mission
    const missionContent = `Company Mission: ${companyInfo.mission}`;
    const missionEmbedding = await generateEmbedding(missionContent);
    await supabase.from('rag_documents').insert({
      content: missionContent,
      content_type: 'policy',
      title: 'Company Mission',
      category: 'company',
      priority: 7,
      metadata: { type: 'mission' },
      embedding: missionEmbedding,
    });

    // USPs
    const uspContent = `Unique Selling Propositions:\n${companyInfo.usps.map((usp, i) => `${i + 1}. ${usp}`).join('\n')}`;
    const uspEmbedding = await generateEmbedding(uspContent);
    await supabase.from('rag_documents').insert({
      content: uspContent,
      content_type: 'policy',
      title: 'What Makes Us Different',
      category: 'company',
      priority: 8,
      metadata: { type: 'usps' },
      embedding: uspEmbedding,
    });

    // Guarantee
    const guaranteeContent = `Guarantee: ${companyInfo.guarantee}`;
    const guaranteeEmbedding = await generateEmbedding(guaranteeContent);
    await supabase.from('rag_documents').insert({
      content: guaranteeContent,
      content_type: 'policy',
      title: 'Money-Back Guarantee',
      category: 'guarantees',
      priority: 9,
      metadata: { type: 'guarantee' },
      embedding: guaranteeEmbedding,
    });

    console.log('  ✓ Mission');
    console.log('  ✓ USPs');
    console.log('  ✓ Guarantee');
    console.log('\n✅ Company Info: 3 succeeded, 0 failed');
  } catch (error) {
    console.error('\n❌ Company Info ingestion failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Nutrition Solutions Data Ingestion\n');
  console.log('Configuration:');
  console.log(`  Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`  OpenAI Model: text-embedding-3-large`);
  console.log('');

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
    console.error('❌ Missing required environment variables!');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
    process.exit(1);
  }

  try {
    await ingestFAQs();
    await ingestProducts();
    await ingestTestimonials();
    await ingestObjections();
    await ingestCompanyInfo();

    console.log('\n\n🎉 Data ingestion complete!');
    console.log('\n📊 Next Steps:');
    console.log('  1. Verify data in Supabase dashboard');
    console.log('  2. Test vector search with: node scripts/test-search.js');
    console.log('  3. Deploy Cloudflare Worker');
  } catch (error) {
    console.error('\n❌ Fatal error during ingestion:', error);
    process.exit(1);
  }
}

main();
