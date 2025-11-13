import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSupabase, testConnection } from '../config/supabase.js';
import { createContentQueue } from '../config/redis.js';
import logger from '../utils/logger.js';
import JobRepository from '../models/JobRepository.js';
import ContentRepository from '../models/ContentRepository.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_TOTAL_BLOGS = 50;
const BLOG_TYPES = ['functional', 'transactional', 'commercial', 'informational'];

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Initialize queue
let contentQueue;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'Content Factory API'
  });
});

// ============================================
// ENDPOINT 1: POST /api/generate-content
// Job Initiation - Validates input, creates job, enqueues task
// ============================================
app.post('/api/generate-content', async (req, res) => {
  try {
    const {
      niche,
      valuePropositions,
      tone,
      totalBlogs,
      blogTypeAllocations
    } = req.body;

    // Input validation
    if (!niche || !niche.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Business niche is required and cannot be empty'
      });
    }

    if (!valuePropositions || !Array.isArray(valuePropositions) || valuePropositions.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'At least one value proposition is required'
      });
    }

    if (!tone || !['professional', 'conversational', 'authoritative', 'friendly', 'technical', 'casual'].includes(tone)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Valid tone is required (professional, conversational, authoritative, friendly, technical, casual)'
      });
    }

    const sanitizedTotalBlogs = parseInt(totalBlogs, 10);
    if (
      Number.isNaN(sanitizedTotalBlogs) ||
      sanitizedTotalBlogs < 1 ||
      sanitizedTotalBlogs > MAX_TOTAL_BLOGS
    ) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `totalBlogs must be a number between 1 and ${MAX_TOTAL_BLOGS}`
      });
    }

    if (
      !blogTypeAllocations ||
      typeof blogTypeAllocations !== 'object' ||
      Array.isArray(blogTypeAllocations)
    ) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'blogTypeAllocations must be an object with blog type counts'
      });
    }

    const sanitizedAllocations = {};
    let allocationSum = 0;

    for (const type of BLOG_TYPES) {
      const value = parseInt(blogTypeAllocations[type], 10) || 0;
      if (value < 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Blog type allocations cannot be negative'
        });
      }
      sanitizedAllocations[type] = value;
      allocationSum += value;
    }

    if (allocationSum !== sanitizedTotalBlogs) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Sum of blog type allocations must equal totalBlogs'
      });
    }

    // Sanitize value propositions
    const sanitizedValueProps = valuePropositions
      .filter(prop => prop && prop.trim())
      .map(prop => prop.trim())
      .slice(0, 10); // Limit to 10 value propositions

    if (sanitizedValueProps.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'At least one valid value proposition is required'
      });
    }

    logger.info(`Creating new content generation job for niche: ${niche}`);

    // Create Job in Supabase
    const job = await JobRepository.create({
      niche: niche.trim(),
      valuePropositions: sanitizedValueProps,
      tone: tone.toLowerCase(),
      totalBlogs: sanitizedTotalBlogs,
      blogTypeAllocations: sanitizedAllocations
    });

    logger.info(`Job created with ID: ${job.id}`);

    // Enqueue job to BullMQ
    await contentQueue.add(
      'generate-content',
      {
        jobId: job.id,
        niche: job.niche,
        valuePropositions: job.value_propositions,
        tone: job.tone,
        totalBlogs: job.total_blogs || sanitizedTotalBlogs,
        blogTypeAllocations: job.blog_type_allocations || sanitizedAllocations
      },
      {
        jobId: job.id, // Use Supabase UUID as BullMQ job ID for tracking
        priority: 1,
        timeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 300000 // 5 minutes default
      }
    );

    logger.info(`Job ${job.id} enqueued successfully`);

    // Return 202 Accepted with jobId
    res.status(202).json({
      success: true,
      message: 'Content generation job initiated successfully',
      jobId: job.id,
      status: job.status,
      totalBlogs: job.total_blogs || sanitizedTotalBlogs,
      blogTypeAllocations: job.blog_type_allocations || sanitizedAllocations,
      estimatedTimeMinutes: 15 // Rough estimate for 50 blog posts
    });

  } catch (error) {
    logger.error('Error in /api/generate-content:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initiate content generation job',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// ENDPOINT 2: GET /api/status/:jobId
// Polling Endpoint - Returns current job status and progress
// ============================================
app.get('/api/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Validate jobId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!jobId.match(uuidRegex)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid job ID format'
      });
    }

    // Query Job from Supabase
    const job = await JobRepository.findById(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    // Calculate estimated time remaining (rough estimate)
    let estimatedSecondsRemaining = null;
    const totalBlogsForJob = job.total_blogs || MAX_TOTAL_BLOGS;

    if (job.status === 'RESEARCHING') {
      estimatedSecondsRemaining = 60; // Research phase ~1 minute
    } else if (job.status === 'GENERATING') {
      const remainingContent = Math.max(0, totalBlogsForJob - (job.total_content_generated || 0));
      estimatedSecondsRemaining = remainingContent * 10; // ~10 seconds per blog post
    }

    // Build response
    const response = {
      jobId: job.id,
      niche: job.niche,
      status: job.status,
      progress: job.progress,
      totalContentGenerated: job.total_content_generated || 0,
      totalBlogs: totalBlogsForJob,
      blogTypeAllocations: job.blog_type_allocations || null,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at
    };

    // Add phase-specific data
    if (job.status === 'RESEARCH_COMPLETE' || job.status === 'GENERATING' || job.status === 'COMPLETE') {
      response.scenariosGenerated = job.scenarios?.length || 0;
    }

    if (job.status === 'FAILED') {
      response.errorMessage = job.error_message;
    }

    if (estimatedSecondsRemaining !== null) {
      response.estimatedSecondsRemaining = estimatedSecondsRemaining;
    }

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in /api/status/:jobId:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve job status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// ENDPOINT 3: GET /api/content/:jobId
// Result Retrieval - Returns all 50 generated blog posts
// ============================================
app.get('/api/content/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Validate jobId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!jobId.match(uuidRegex)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid job ID format'
      });
    }

    // Check if job exists and is complete
    const job = await JobRepository.findById(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    if (job.status !== 'COMPLETE') {
      return res.status(400).json({
        error: 'Job Not Complete',
        message: `Job is currently in ${job.status} status. Content is only available when status is COMPLETE.`,
        currentStatus: job.status
      });
    }

    // Retrieve all content for this job
    const content = await ContentRepository.getByJobId(jobId);

    if (!content || content.length === 0) {
      return res.status(404).json({
        error: 'Content Not Found',
        message: 'No content found for this job'
      });
    }

    // Calculate statistics (use snake_case as returned from database)
    const stats = {
      totalPosts: content.length,
      avgWordCount: content.length > 0 
        ? Math.round(
            content.reduce((sum, post) => sum + (post.word_count || 0), 0) / content.length
          )
        : 0,
      totalWords: content.reduce((sum, post) => sum + (post.word_count || 0), 0),
      avgGenerationTimeMs: content.filter(p => p.generation_time_ms).length > 0
        ? Math.round(
            content
              .filter(p => p.generation_time_ms)
              .reduce((sum, post) => sum + (post.generation_time_ms || 0), 0) /
            content.filter(p => p.generation_time_ms).length
          )
        : 0
    };

    // Return complete content
    res.status(200).json({
      success: true,
      jobId: job.id,
      niche: job.niche,
      tone: job.tone,
      totalBlogs: job.total_blogs || content.length,
      blogTypeAllocations: job.blog_type_allocations || null,
      completedAt: job.completed_at,
      stats,
      content: content.map(post => ({
        scenarioId: post.scenario_id,
        title: post.blog_title,
        personaArchetype: post.persona_archetype,
        keywords: post.keywords,
        content: post.blog_content,
        wordCount: post.word_count,
        slug: post.slug,
        metaDescription: post.meta_description,
        blogType: post.blog_type,
        sourceScenarioId: post.source_scenario_id
      }))
    });

  } catch (error) {
    logger.error('Error in /api/content/:jobId:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve content',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// Additional Utility Endpoints
// ============================================

// Get job summary (lightweight version for listings)
app.get('/api/jobs', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    const filters = status ? { status } : {};
    
    const { data: jobs, count: total } = await JobRepository.find(filters, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy: 'created_at',
      order: 'desc'
    });

    res.status(200).json({
      success: true,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      jobs
    });

  } catch (error) {
    logger.error('Error in /api/jobs:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve jobs'
    });
  }
});

// Delete a job and its content
app.delete('/api/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!jobId.match(uuidRegex)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid job ID format'
      });
    }

    const job = await JobRepository.findById(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    // Delete associated content (CASCADE delete handles this in PostgreSQL, but we can be explicit)
    await ContentRepository.deleteByJobId(jobId);

    // Delete job
    await JobRepository.delete(jobId);

    logger.info(`Job ${jobId} and associated content deleted`);

    res.status(200).json({
      success: true,
      message: 'Job and associated content deleted successfully'
    });

  } catch (error) {
    logger.error('Error in DELETE /api/job/:jobId:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete job'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// Server Initialization
// ============================================
const startServer = async () => {
  try {
    // Initialize Supabase
    initSupabase();
    await testConnection();

    // Initialize BullMQ Queue
    contentQueue = createContentQueue();
    logger.info('BullMQ queue initialized');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Content Factory API Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  if (contentQueue) {
    await contentQueue.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  if (contentQueue) {
    await contentQueue.close();
  }
  process.exit(0);
});

// Start the server
startServer();

export default app;

