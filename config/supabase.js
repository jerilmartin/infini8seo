import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

let supabase = null;

/**
 * Initialize Supabase client
 */
export const initSupabase = () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required in environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });

    logger.info('✅ Supabase client initialized successfully');
    logger.info(`Connected to: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}`);

    return supabase;
  } catch (error) {
    logger.error('❌ Supabase initialization failed:', error.message);
    throw error;
  }
};

/**
 * Get Supabase client instance
 */
export const getSupabase = () => {
  if (!supabase) {
    return initSupabase();
  }
  return supabase;
};

/**
 * Test database connection
 */
export const testConnection = async () => {
  try {
    const client = getSupabase();
    const { data, error } = await client.from('jobs').select('count').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned is fine
        logger.info('✅ Supabase connection test successful');
        return true;
      } else if (error.code === 'PGRST205') {
        // Table doesn't exist
        logger.error('❌ Database tables not found!');
        logger.error('📝 You need to run the SQL migration:');
        logger.error('   1. Go to Supabase Dashboard → SQL Editor');
        logger.error('   2. Copy contents of config/schema.sql');
        logger.error('   3. Paste and click RUN');
        logger.error(`   Error: ${error.message}`);
        throw new Error('Database tables not created. Run config/schema.sql in Supabase SQL Editor');
      } else {
        throw error;
      }
    }
    
    logger.info('✅ Supabase connection test successful');
    return true;
  } catch (error) {
    logger.error('❌ Supabase connection test failed:', error.message);
    throw error;
  }
};

export default {
  initSupabase,
  getSupabase,
  testConnection
};

