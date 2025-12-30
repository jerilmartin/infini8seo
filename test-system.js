import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initSupabase, testConnection } from './config/supabase.js';
import IORedis from 'ioredis';

dotenv.config();

console.log('\n============================================');
console.log('   CONTENT FACTORY SYSTEM TEST');
console.log('============================================\n');

let allTestsPassed = true;

async function testEnvironmentVariables() {
  console.log('Test 1: Environment Variables');
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
      console.log(`   [FAIL] ${key}: MISSING`);
      passed = false;
    } else {
      const display = key.includes('KEY') 
        ? value.substring(0, 20) + '...' 
        : (key.includes('URL') ? value : value.substring(0, 30) + '...');
      console.log(`   [OK] ${key}: ${display}`);
    }
  }

  if (passed) {
    console.log('\n   [OK] All environment variables present\n');
  } else {
    console.log('\n   [FAIL] Missing required environment variables\n');
    allTestsPassed = false;
  }

  return passed;
}

async function testSupabaseConnection() {
  console.log('Test 2: Supabase Connection');
  console.log('-----------------------------------');
  
  try {
    initSupabase();
    await testConnection();
    console.log('   [OK] Successfully connected to Supabase');
    console.log('   [OK] Database tables exist\n');
    return true;
  } catch (error) {
    console.log(`   [FAIL] Supabase connection failed: ${error.message}\n`);
    allTestsPassed = false;
    return false;
  }
}

async function testRedisConnection() {
  console.log('Test 3: Redis Connection');
  console.log('-----------------------------------');
  
  const redis = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: 3,
    retryStrategy: () => null
  });

  try {
    await redis.ping();
    console.log('   [OK] Successfully connected to Redis');
    console.log(`   [OK] Redis is running on ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}\n`);
    await redis.quit();
    return true;
  } catch (error) {
    console.log(`   [FAIL] Redis connection failed: ${error.message}`);
    console.log('   [TIP] Make sure Docker Desktop is running and Redis container is started');
    console.log('   [TIP] Run: docker run -d -p 6379:6379 --name redis redis:7-alpine\n');
    allTestsPassed = false;
    await redis.quit();
    return false;
  }
}

async function testGeminiAPI() {
  console.log('Test 4: Gemini API Connection');
  console.log('-----------------------------------');
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('   [FAIL] GEMINI_API_KEY not set\n');
    allTestsPassed = false;
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    console.log('   Testing API call...');
    const result = await model.generateContent('Say "Hello" in one word only.');
    const text = result.response.text();
    
    console.log(`   [OK] Gemini API is working`);
    console.log(`   [OK] Response received: "${text.trim()}"\n`);
    return true;
  } catch (error) {
    console.log(`   [FAIL] Gemini API test failed: ${error.message}\n`);
    allTestsPassed = false;
    return false;
  }
}

async function testFileStructure() {
  console.log('Test 5: File Structure');
  console.log('-----------------------------------');
  
  const { access } = await import('fs/promises');
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
      console.log(`   [OK] ${file}`);
    } catch (error) {
      console.log(`   [FAIL] ${file} - NOT FOUND`);
      passed = false;
    }
  }

  if (passed) {
    console.log('\n   [OK] All required files present\n');
  } else {
    console.log('\n   [FAIL] Missing required files\n');
    allTestsPassed = false;
  }

  return passed;
}

async function runAllTests() {
  try {
    const envTest = await testEnvironmentVariables();
    const fileTest = await testFileStructure();
    const supabaseTest = await testSupabaseConnection();
    const redisTest = await testRedisConnection();
    const geminiTest = await testGeminiAPI();

    console.log('============================================');
    if (allTestsPassed && envTest && fileTest && supabaseTest && redisTest && geminiTest) {
      console.log('[OK] ALL TESTS PASSED - System is ready to use.');
      console.log('============================================\n');
      console.log('You can now start the system:');
      console.log('   1. Start API:    npm run dev:server');
      console.log('   2. Start Worker: npm run dev:worker');
      console.log('   3. Start Frontend: cd client && npm run dev');
      console.log('\n   Or use Docker: docker-compose up -d\n');
      process.exit(0);
    } else {
      console.log('[FAIL] SOME TESTS FAILED - Fix the issues above before starting.');
      console.log('============================================\n');
      
      if (!redisTest) {
        console.log('[TIP] To fix Redis: docker run -d -p 6379:6379 --name redis redis:7-alpine\n');
      }
      if (!supabaseTest) {
        console.log('[TIP] To fix Supabase: Check your .env credentials and run config/schema.sql\n');
      }
      if (!geminiTest) {
        console.log('[TIP] To fix Gemini: Check your GEMINI_API_KEY in .env\n');
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('[FAIL] Test suite failed:', error);
    process.exit(1);
  }
}

runAllTests();
