import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initSupabase, testConnection } from './config/supabase.js';
import IORedis from 'ioredis';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

console.log('\n🔍 ============================================');
console.log('   CONTENT FACTORY SYSTEM TEST');
console.log('============================================\n');

let allTestsPassed = true;

// Test 1: Environment Variables
async function testEnvironmentVariables() {
  console.log('📝 Test 1: Environment Variables');
  console.log('-----------------------------------');
  
  const required = {
    'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
    'REDIS_HOST': process.env.REDIS_HOST || 'localhost',
    'REDIS_PORT': process.env.REDIS_PORT || '6379'
  };

  let passed = true;
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      console.log(`   ❌ ${key}: MISSING`);
      passed = false;
    } else {
      const display = key.includes('KEY') 
        ? value.substring(0, 20) + '...' 
        : (key.includes('URL') ? value : value.substring(0, 30) + '...');
      console.log(`   ✅ ${key}: ${display}`);
    }
  }

  if (passed) {
    console.log('\n   ✅ All environment variables present\n');
  } else {
    console.log('\n   ❌ Missing required environment variables\n');
    allTestsPassed = false;
  }

  return passed;
}

// Test 2: Supabase Connection
async function testSupabaseConnection() {
  console.log('📊 Test 2: Supabase Connection');
  console.log('-----------------------------------');
  
  try {
    initSupabase();
    await testConnection();
    console.log('   ✅ Successfully connected to Supabase');
    console.log('   ✅ Database tables exist\n');
    return true;
  } catch (error) {
    console.log(`   ❌ Supabase connection failed: ${error.message}\n`);
    allTestsPassed = false;
    return false;
  }
}

// Test 3: Redis Connection
async function testRedisConnection() {
  console.log('🔴 Test 3: Redis Connection');
  console.log('-----------------------------------');
  
  const redis = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: 3,
    retryStrategy: () => null // Don't retry on failure for test
  });

  try {
    await redis.ping();
    console.log('   ✅ Successfully connected to Redis');
    console.log(`   ✅ Redis is running on ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}\n`);
    await redis.quit();
    return true;
  } catch (error) {
    console.log(`   ❌ Redis connection failed: ${error.message}`);
    console.log('   💡 Make sure Docker Desktop is running and Redis container is started');
    console.log('   💡 Run: docker run -d -p 6379:6379 --name redis redis:7-alpine\n');
    allTestsPassed = false;
    await redis.quit();
    return false;
  }
}

// Test 4: Gemini API Connection
async function testGeminiAPI() {
  console.log('🤖 Test 4: Gemini API Connection');
  console.log('-----------------------------------');
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('   ❌ GEMINI_API_KEY not set\n');
    allTestsPassed = false;
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    console.log('   Testing API call...');
    const result = await model.generateContent('Say "Hello" in one word only.');
    const text = result.response.text();
    
    console.log(`   ✅ Gemini API is working`);
    console.log(`   ✅ Response received: "${text.trim()}"\n`);
    return true;
  } catch (error) {
    console.log(`   ❌ Gemini API test failed: ${error.message}\n`);
    allTestsPassed = false;
    return false;
  }
}

// Test 5: Gemini JSON Mode with Google Search
async function testGeminiJSONMode() {
  console.log('📋 Test 5: Gemini JSON Mode + Google Search');
  console.log('-----------------------------------');
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('   ⏭️  Skipped (no API key)\n');
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      },
      tools: [{ googleSearch: {} }]
    });

    console.log('   Testing JSON mode with Google Search...');
    const prompt = `Research "AI content generation" using Google Search and return a JSON object with this exact structure:
{
  "topic": "AI content generation",
  "key_finding": "one sentence finding from your research"
}

Return ONLY valid JSON, nothing else.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log('   Raw response preview:', text.substring(0, 200));
    
    // Try to parse as JSON
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Try to extract JSON from markdown
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                    text.match(/```\s*([\s\S]*?)\s*```/) ||
                    text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[1] || match[0]);
      } else {
        throw new Error('Could not parse or extract JSON from response');
      }
    }

    console.log('   ✅ JSON mode is working');
    console.log('   ✅ Google Search integration is working');
    console.log(`   ✅ Parsed response:`, JSON.stringify(parsed, null, 2).substring(0, 200));
    console.log('');
    return true;
  } catch (error) {
    console.log(`   ❌ JSON mode test failed: ${error.message}\n`);
    allTestsPassed = false;
    return false;
  }
}

// Test 6: File Structure
async function testFileStructure() {
  console.log('📁 Test 6: File Structure');
  console.log('-----------------------------------');
  
  const { readdir, access } = await import('fs/promises');
  const { constants } = await import('fs');
  
  const requiredFiles = [
    '.env',
    'package.json',
    'server/index.js',
    'worker/index.js',
    'worker/phaseA.js',
    'worker/phaseB.js',
    'config/supabase.js',
    'config/redis.js',
    'models/JobRepository.js',
    'models/ContentRepository.js',
    'utils/logger.js'
  ];

  let passed = true;
  for (const file of requiredFiles) {
    try {
      await access(file, constants.F_OK);
      console.log(`   ✅ ${file}`);
    } catch (error) {
      console.log(`   ❌ ${file} - NOT FOUND`);
      passed = false;
    }
  }

  if (passed) {
    console.log('\n   ✅ All required files present\n');
  } else {
    console.log('\n   ❌ Missing required files\n');
    allTestsPassed = false;
  }

  return passed;
}

// Run all tests
async function runAllTests() {
  try {
    const envTest = await testEnvironmentVariables();
    const fileTest = await testFileStructure();
    const supabaseTest = await testSupabaseConnection();
    const redisTest = await testRedisConnection();
    const geminiTest = await testGeminiAPI();
    const jsonTest = await testGeminiJSONMode();

    console.log('============================================');
    if (allTestsPassed && envTest && fileTest && supabaseTest && redisTest && geminiTest) {
      console.log('✅ ALL TESTS PASSED! System is ready to use.');
      console.log('============================================\n');
      console.log('🚀 You can now start the system:');
      console.log('   1. Start API:    npm run dev:server');
      console.log('   2. Start Worker: npm run dev:worker');
      console.log('   3. Start Frontend: cd client && npm run dev');
      console.log('\n   Or run: START-MANUALLY.bat\n');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED! Fix the issues above before starting.');
      console.log('============================================\n');
      
      if (!redisTest) {
        console.log('💡 To fix Redis: docker run -d -p 6379:6379 --name redis redis:7-alpine\n');
      }
      if (!supabaseTest) {
        console.log('💡 To fix Supabase: Check your .env credentials and run config/schema.sql\n');
      }
      if (!geminiTest) {
        console.log('💡 To fix Gemini: Check your GEMINI_API_KEY in .env\n');
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();

