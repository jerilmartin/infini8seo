import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { initSupabase, testConnection } from '../config/supabase.js';
import { createWorkerConnection, QUEUE_NAME } from '../config/redis.js';
import logger from '../utils/logger.js';
import JobRepository from '../models/JobRepository.js';
import ContentRepository from '../models/ContentRepository.js';
import { executePhaseA } from './phaseA.js';
import { executePhaseB } from './phaseB.js';

// Load environment variables
dotenv.config();

let worker;

// ============================================
// Main Job Processor
// ============================================
const processContentGenerationJob = async (job) => {
  const { jobId, niche, valuePropositions, tone, totalBlogs: payloadTotalBlogs, blogTypeAllocations: payloadAllocations, targetWordCount: payloadWordCount } = job.data;
  
  logger.info(`🚀 Starting content generation job: ${jobId}`);
  logger.info(`Niche: ${niche}, Tone: ${tone}`);

  try {
    // Fetch the job document from Supabase
    const jobDoc = await JobRepository.findById(jobId);
    
    if (!jobDoc) {
      throw new Error(`Job document not found in database: ${jobId}`);
    }

    const totalBlogs = payloadTotalBlogs || jobDoc.total_blogs || 50;
    const blogTypeAllocations = payloadAllocations || jobDoc.blog_type_allocations || null;
    const targetWordCount = payloadWordCount || jobDoc.target_word_count || 1200;

    // ============================================
    // PHASE A: Deep Research (Scenario Generation)
    // ============================================
    logger.info(`📊 Phase A: Starting deep research for job ${jobId}`);
    
    await JobRepository.updateStatus(jobId, 'RESEARCHING', 5);

    // Update BullMQ job progress
    await job.updateProgress(5);

    const scenarios = await executePhaseA({
      niche,
      valuePropositions,
      tone,
      totalBlogs,
      blogTypeAllocations
    });

    logger.info(`✅ Phase A Complete: Generated ${scenarios.length} scenarios`);

    // Save scenarios to job document
    await JobRepository.updateScenarios(jobId, scenarios);

    await job.updateProgress(20);

    // ============================================
    // PHASE B: Content Generation (Mass Production)
    // ============================================
    logger.info(`✍️ Phase B: Starting content generation for job ${jobId}`);
    
    await JobRepository.updateStatus(jobId, 'GENERATING', 25);

    await job.updateProgress(25);

    // Execute Phase B with progress callback
    const progressCallback = async (completed, total) => {
      const progressPercent = 25 + Math.floor((completed / total) * 70); // 25% to 95%
      await JobRepository.update(jobId, {
        progress: progressPercent,
        total_content_generated: completed
      });
      await job.updateProgress(progressPercent);
      
      logger.info(`Progress: ${completed}/${total} blog posts generated (${progressPercent}%)`);
    };

    await executePhaseB({
      jobId,
      scenarios,
      niche,
      valuePropositions,
      tone,
      totalBlogs,
      blogTypeAllocations,
      targetWordCount,
      progressCallback
    });

    logger.info(`✅ Phase B Complete: Generated ${totalBlogs} blog posts`);

    // ============================================
    // Finalization
    // ============================================
    await JobRepository.markAsComplete(jobId);
    await job.updateProgress(100);

    logger.info(`🎉 Job ${jobId} completed successfully!`);

    return {
      success: true,
      jobId,
      scenariosGenerated: scenarios.length,
      contentGenerated: totalBlogs
    };

  } catch (error) {
    logger.error(`❌ Job ${jobId} failed:`, error);

    // Update job status to FAILED
    try {
      await JobRepository.markAsFailed(jobId, error.message);
    } catch (updateError) {
      logger.error('Failed to update job status:', updateError);
    }

    throw error; // Re-throw to let BullMQ handle retries
  }
};

// ============================================
// Worker Initialization
// ============================================
const startWorker = async () => {
  try {
    // Initialize Supabase
    initSupabase();
    await testConnection();
    logger.info('Worker: Supabase connected');

    // Create BullMQ Worker
    worker = new Worker(
      QUEUE_NAME,
      processContentGenerationJob,
      {
        connection: createWorkerConnection(),
        concurrency: 1, // Process one job at a time (each job generates 50 posts concurrently)
        limiter: {
          max: 10, // Maximum 10 jobs per duration
          duration: 60000 // Per minute
        },
        settings: {
          stalledInterval: 30000,
          maxStalledCount: 2
        }
      }
    );

    // Worker event handlers
    worker.on('completed', (job, result) => {
      logger.info(`✅ Job ${job.id} completed successfully`, result);
    });

    worker.on('failed', (job, error) => {
      logger.error(`❌ Job ${job?.id} failed:`, error.message);
    });

    worker.on('active', (job) => {
      logger.info(`⚙️ Job ${job.id} is now active`);
    });

    worker.on('stalled', (jobId) => {
      logger.warn(`⚠️ Job ${jobId} has stalled`);
    });

    worker.on('error', (error) => {
      logger.error('Worker error:', error);
    });

    logger.info('🔧 Content Factory Worker started successfully');
    logger.info(`Listening on queue: ${QUEUE_NAME}`);
    logger.info(`Concurrency: 1 job at a time`);

  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
};

// ============================================
// Graceful Shutdown
// ============================================
const shutdown = async () => {
  logger.info('🛑 Worker shutting down gracefully...');
  
  try {
    if (worker) {
      await worker.close();
      logger.info('Worker closed successfully');
    }
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the worker
startWorker();

export default worker;

