import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { initSupabase, testConnection } from '../config/supabase.js';
import { createWorkerConnection, QUEUE_NAME } from '../config/redis.js';
import logger from '../utils/logger.js';
import JobRepository from '../models/JobRepository.js';
import SeoScanRepository from '../models/SeoScanRepository.js';
import { executePhaseA } from './phaseA.js';
import { executePhaseB } from './phaseB.js';
import { executeSeoScanV2 } from './seoScanV2.js';

dotenv.config();

let worker;

/**
 * Content Generation Job Processor
 */
const processContentGenerationJob = async (job) => {
  const { jobId, niche, valuePropositions, tone, totalBlogs: payloadTotalBlogs, blogTypeAllocations: payloadAllocations, targetWordCount: payloadWordCount } = job.data;

  logger.info(`Starting content generation job: ${jobId}`);
  logger.info(`Niche: ${niche}, Tone: ${tone}`);

  try {
    const jobDoc = await JobRepository.findById(jobId);

    if (!jobDoc) {
      throw new Error(`Job document not found in database: ${jobId}`);
    }

    const totalBlogs = payloadTotalBlogs || jobDoc.total_blogs || 50;
    const blogTypeAllocations = payloadAllocations || jobDoc.blog_type_allocations || null;
    const targetWordCount = payloadWordCount || jobDoc.target_word_count || 1200;

    // Phase A: Deep Research (Scenario Generation)
    logger.info(`Phase A: Starting deep research for job ${jobId}`);

    await JobRepository.updateStatus(jobId, 'RESEARCHING', 5);
    await job.updateProgress(5);

    const scenarios = await executePhaseA({
      niche,
      valuePropositions,
      tone,
      totalBlogs,
      blogTypeAllocations
    });

    logger.info(`Phase A Complete: Generated ${scenarios.length} scenarios`);

    await JobRepository.updateScenarios(jobId, scenarios);
    await job.updateProgress(20);

    // Phase B: Content Generation (Mass Production)
    logger.info(`Phase B: Starting content generation for job ${jobId}`);

    await JobRepository.updateStatus(jobId, 'GENERATING', 25);
    await job.updateProgress(25);

    const progressCallback = async (completed, total) => {
      const progressPercent = 25 + Math.floor((completed / total) * 70);
      await JobRepository.update(jobId, {
        progress: progressPercent,
        total_content_generated: completed
      });
      await job.updateProgress(progressPercent);

      logger.info(`Progress: ${completed}/${total} blog posts generated (${progressPercent}%)`);
    };

    const results = await executePhaseB({
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

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info(`Phase B Complete: ${successCount} successful, ${failureCount} failed`);

    // Calculate credits to refund for failed blogs
    let creditsToRefund = 0;
    if (failureCount > 0) {
      // Calculate per-blog credit cost
      const totalCreditsCost = jobDoc.credits_cost || 0;
      const perBlogCost = totalBlogs > 0 ? totalCreditsCost / totalBlogs : 0;
      creditsToRefund = Math.floor(perBlogCost * failureCount);
      
      logger.info(`Refunding ${creditsToRefund} credits for ${failureCount} failed blogs`);
      
      // Refund credits if there were failures
      if (creditsToRefund > 0 && jobDoc.user_id) {
        try {
          const UserRepository = (await import('../models/UserRepository.js')).default;
          await UserRepository.addCredits(
            jobDoc.user_id,
            creditsToRefund,
            'job',
            jobId,
            `Auto-refund for ${failureCount} failed blog(s) in job ${jobId}`
          );
          logger.info(`Successfully refunded ${creditsToRefund} credits to user ${jobDoc.user_id}`);
        } catch (refundError) {
          logger.error('Failed to refund credits:', refundError);
        }
      }
    }

    // Mark job as complete even with partial failures
    const finalStatus = failureCount === totalBlogs ? 'FAILED' : 
                       failureCount > 0 ? 'PARTIAL_COMPLETE' : 'COMPLETE';
    
    await JobRepository.update(jobId, {
      status: finalStatus,
      progress: 100,
      completed_at: new Date().toISOString(),
      total_content_generated: successCount,
      failed_content_count: failureCount,
      credits_refunded: creditsToRefund
    });
    
    await job.updateProgress(100);

    logger.info(`Job ${jobId} completed with status: ${finalStatus}`);

    return {
      success: successCount > 0,
      jobId,
      scenariosGenerated: scenarios.length,
      contentGenerated: successCount,
      contentFailed: failureCount,
      creditsRefunded: creditsToRefund,
      status: finalStatus
    };

  } catch (error) {
    logger.error(`Job ${jobId} failed:`, error);

    try {
      await JobRepository.markAsFailed(jobId, error.message);
    } catch (updateError) {
      logger.error('Failed to update job status:', updateError);
    }

    throw error;
  }
};

/**
 * SEO Scan Job Processor
 */
const processSeoScanJob = async (job) => {
  const { scanId, url } = job.data;

  logger.info(`Starting SEO scan job (V2): ${scanId}`);
  logger.info(`URL: ${url}`);

  try {
    const results = await executeSeoScanV2({ scanId, url });

    logger.info(`SEO Scan ${scanId} completed successfully`);

    return {
      success: true,
      scanId,
      healthScore: results.health_score
    };

  } catch (error) {
    logger.error(`SEO Scan ${scanId} failed:`, error);
    throw error;
  }
};

/**
 * Job Router - Routes jobs to appropriate processor
 */
const processJob = async (job) => {
  const jobType = job.name;

  switch (jobType) {
    case 'generate-content':
      return await processContentGenerationJob(job);

    case 'scan-seo':
      return await processSeoScanJob(job);

    default:
      logger.warn(`Unknown job type: ${jobType}`);
      throw new Error(`Unknown job type: ${jobType}`);
  }
};


/**
 * Worker Initialization
 */
const startWorker = async () => {
  try {
    initSupabase();
    await testConnection();
    logger.info('Worker: Supabase connected');

    worker = new Worker(
      QUEUE_NAME,
      processJob,
      {
        connection: createWorkerConnection(),
        concurrency: 1,
        limiter: {
          max: 10,
          duration: 60000
        },
        settings: {
          stalledInterval: 30000,
          maxStalledCount: 2
        }
      }
    );

    worker.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed successfully`, result);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed:`, error.message);
    });

    worker.on('active', (job) => {
      logger.info(`Job ${job.id} is now active`);
    });

    worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} has stalled`);
    });

    worker.on('error', (error) => {
      logger.error('Worker error:', error);
    });

    logger.info('Content Factory Worker started successfully');
    logger.info(`Listening on queue: ${QUEUE_NAME}`);
    logger.info(`Concurrency: 1 job at a time`);

  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
};

/**
 * Graceful Shutdown
 */
const shutdown = async () => {
  logger.info('Worker shutting down gracefully...');

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

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startWorker();

export default worker;
