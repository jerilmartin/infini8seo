import dotenv from 'dotenv';
import { initSupabase, getSupabase } from '../config/supabase.js';
import logger from '../utils/logger.js';

dotenv.config();

/**
 * Auto-cleanup script for Supabase
 * Deletes jobs and contents older than 7 days
 * Run this script weekly via cron or scheduler
 */
async function cleanupOldData() {
  try {
    logger.info('Starting auto-cleanup of old data...');
    
    initSupabase();
    const supabase = getSupabase();
    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();
    
    logger.info(`Deleting data older than: ${cutoffDate}`);
    
    // Step 1: Find old jobs
    const { data: oldJobs, error: findError } = await supabase
      .from('jobs')
      .select('id, created_at, niche')
      .lt('created_at', cutoffDate);
    
    if (findError) {
      throw new Error(`Failed to find old jobs: ${findError.message}`);
    }
    
    if (!oldJobs || oldJobs.length === 0) {
      logger.info('No old jobs found to delete');
      return;
    }
    
    logger.info(`Found ${oldJobs.length} jobs older than 7 days`);
    
    // Step 2: Delete old jobs (CASCADE will auto-delete associated contents)
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .lt('created_at', cutoffDate);
    
    if (deleteError) {
      throw new Error(`Failed to delete old jobs: ${deleteError.message}`);
    }
    
    logger.info(`Successfully deleted ${oldJobs.length} jobs and their associated content`);
    logger.info('Auto-cleanup completed successfully');
    
  } catch (error) {
    logger.error('Auto-cleanup failed:', error.message);
    throw error;
  }
}

// Run cleanup
cleanupOldData()
  .then(() => {
    logger.info('Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Cleanup script failed:', error);
    process.exit(1);
  });
