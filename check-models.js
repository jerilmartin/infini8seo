import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('\n🔍 Checking Available Gemini Models\n');
console.log('='.repeat(60));

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // List all available models
    const models = await genAI.listModels();
    
    console.log('\n✅ Available Models:\n');
    
    for (const model of models) {
      console.log(`📦 ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Description: ${model.description}`);
      console.log(`   Supported: ${model.supportedGenerationMethods.join(', ')}`);
      
      // Check for Google Search support
      if (model.name.includes('pro') || model.name.includes('exp')) {
        console.log(`   ⭐ PREMIUM MODEL`);
      }
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log('\nRecommended models for high-quality content:');
    console.log('  - For research (Phase A): Use latest exp/pro model with search');
    console.log('  - For content (Phase B): Use latest exp/pro model');
    
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
  }
}

listModels();

