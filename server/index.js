import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSupabase, testConnection } from '../config/supabase.js';
import { createContentQueue } from '../config/redis.js';
import logger from '../utils/logger.js';
import JobRepository from '../models/JobRepository.js';
import ContentRepository from '../models/ContentRepository.js';
import SeoScanRepository from '../models/SeoScanRepository.js';
import {
  initAuthClient,
  authMiddleware,
  generateToken,
  getGoogleAuthUrl,
  exchangeCodeForSession,
  getUserFromSupabaseToken,
  verifyToken
} from '../services/authService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_TOTAL_BLOGS = 50;
const BLOG_TYPES = ['functional', 'transactional', 'commercial', 'informational'];
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Apply auth middleware to all routes
app.use(authMiddleware);

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

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * POST /api/auth/exchange-token
 * Exchange Supabase access token for backend JWT
 */
app.post('/api/auth/exchange-token', async (req, res) => {
  try {
    const { supabaseAccessToken } = req.body;

    if (!supabaseAccessToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Supabase access token is required'
      });
    }

    // Get user from Supabase token
    const user = await getUserFromSupabaseToken(supabaseAccessToken);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Supabase token'
      });
    }

    // Generate our own JWT token
    const token = generateToken(user);

    logger.info(`Token exchanged for user: ${user.email} (${user.id})`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar: user.user_metadata?.avatar_url
      }
    });
  } catch (error) {
    logger.error('Token exchange error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to exchange token'
    });
  }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth - returns the OAuth URL
 */
app.get('/api/auth/google', async (req, res) => {
  try {
    const callbackUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/auth/callback`;
    const authUrl = await getGoogleAuthUrl(callbackUrl);

    res.json({
      success: true,
      url: authUrl
    });
  } catch (error) {
    logger.error('Error initiating Google OAuth:', error);
    res.status(500).json({
      error: 'Authentication Error',
      message: 'Failed to initiate Google login'
    });
  }
});

/**
 * GET /api/auth/callback
 * OAuth callback - exchanges code for session and redirects to frontend
 */
app.get('/api/auth/callback', async (req, res) => {
  try {
    const { code, error: authError, error_description } = req.query;

    logger.info('OAuth callback received:', { 
      hasCode: !!code, 
      authError, 
      error_description,
      queryKeys: Object.keys(req.query)
    });

    if (authError) {
      logger.error('OAuth error:', authError, error_description);
      return res.redirect(`${FRONTEND_URL}/login?error=auth_failed&details=${encodeURIComponent(error_description || authError)}`);
    }

    if (!code) {
      logger.error('No authorization code received. Query params:', req.query);
      return res.redirect(`${FRONTEND_URL}/login?error=no_code`);
    }

    // Exchange code for session
    logger.info('Exchanging code for session...');
    const { session, user } = await exchangeCodeForSession(code);

    if (!user) {
      logger.error('No user returned from session exchange');
      return res.redirect(`${FRONTEND_URL}/login?error=no_user`);
    }

    // Generate our own JWT token
    const token = generateToken(user);

    logger.info(`User authenticated successfully: ${user.email} (${user.id})`);

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/success?token=${token}`);
  } catch (error) {
    logger.error('OAuth callback error:', error.message, error.stack);
    res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Not authenticated'
    });
  }

  res.json({
    success: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      avatar: req.user.avatar,
      provider: req.user.provider
    }
  });
});

/**
 * POST /api/auth/logout
 * Logout user (client should clear token)
 */
app.post('/api/auth/logout', (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * POST /api/auth/verify
 * Verify a token is valid
 */
app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Token is required'
    });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }

  res.json({
    success: true,
    valid: true,
    user: {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      avatar: decoded.avatar
    }
  });
});

// ============================================================================
// CONTENT GENERATION ROUTES
// ============================================================================

/**
 * POST /api/generate-content
 * Job Initiation - Validates input, creates job, enqueues task
 */
app.post('/api/generate-content', async (req, res) => {
  try {
    const {
      niche,
      valuePropositions,
      tone,
      totalBlogs,
      blogTypeAllocations,
      targetWordCount
    } = req.body;

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

    const sanitizedValueProps = valuePropositions
      .filter(prop => prop && prop.trim())
      .map(prop => prop.trim())
      .slice(0, 10);

    if (sanitizedValueProps.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'At least one valid value proposition is required'
      });
    }

    const sanitizedWordCount = parseInt(targetWordCount, 10);
    if (
      Number.isNaN(sanitizedWordCount) ||
      sanitizedWordCount < 500 ||
      sanitizedWordCount > 2500
    ) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'targetWordCount must be a number between 500 and 2500'
      });
    }

    logger.info(`Creating new content generation job for niche: ${niche}${req.userId ? ' for user ' + req.userId : ''}`);

    const job = await JobRepository.create({
      niche: niche.trim(),
      valuePropositions: sanitizedValueProps,
      tone: tone.toLowerCase(),
      totalBlogs: sanitizedTotalBlogs,
      blogTypeAllocations: sanitizedAllocations,
      targetWordCount: sanitizedWordCount,
      userId: req.userId // Associate job with authenticated user
    });

    logger.info(`Job created with ID: ${job.id}`);

    await contentQueue.add(
      'generate-content',
      {
        jobId: job.id,
        niche: job.niche,
        valuePropositions: job.value_propositions,
        tone: job.tone,
        totalBlogs: job.total_blogs || sanitizedTotalBlogs,
        blogTypeAllocations: job.blog_type_allocations || sanitizedAllocations,
        targetWordCount: job.target_word_count || sanitizedWordCount
      },
      {
        jobId: job.id,
        priority: 1,
        timeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 300000
      }
    );

    logger.info(`Job ${job.id} enqueued successfully`);

    res.status(202).json({
      success: true,
      message: 'Content generation job initiated successfully',
      jobId: job.id,
      status: job.status,
      totalBlogs: job.total_blogs || sanitizedTotalBlogs,
      blogTypeAllocations: job.blog_type_allocations || sanitizedAllocations,
      estimatedTimeMinutes: 15
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

/**
 * GET /api/status/:jobId
 * Polling Endpoint - Returns current job status and progress
 */
app.get('/api/status/:jobId', async (req, res) => {
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

    let estimatedSecondsRemaining = null;
    const totalBlogsForJob = job.total_blogs || MAX_TOTAL_BLOGS;

    if (job.status === 'RESEARCHING') {
      estimatedSecondsRemaining = 60;
    } else if (job.status === 'GENERATING') {
      const remainingContent = Math.max(0, totalBlogsForJob - (job.total_content_generated || 0));
      estimatedSecondsRemaining = remainingContent * 10;
    }

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

    if (job.status === 'RESEARCH_COMPLETE' || job.status === 'GENERATING' || job.status === 'COMPLETE') {
      response.scenariosGenerated = job.scenarios?.length || 0;
    }

    if (job.status === 'FAILED') {
      response.errorMessage = job.error_message;
    }

    if (estimatedSecondsRemaining !== null) {
      response.estimatedSecondsRemaining = estimatedSecondsRemaining;
    }

    // Include generated titles for live preview
    if (job.status === 'GENERATING' || job.status === 'COMPLETE') {
      try {
        const contents = await ContentRepository.getByJobId(jobId);
        response.generatedTitles = contents.map(c => ({
          title: c.blog_title,
          type: c.persona_archetype || 'Article'
        }));
      } catch (err) {
        logger.warn('Could not fetch generated titles:', err.message);
        response.generatedTitles = [];
      }
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

/**
 * GET /api/content/:jobId
 * Result Retrieval - Returns all generated blog posts
 */
app.get('/api/content/:jobId', async (req, res) => {
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

    if (job.status !== 'COMPLETE') {
      return res.status(400).json({
        error: 'Job Not Complete',
        message: `Job is currently in ${job.status} status. Content is only available when status is COMPLETE.`,
        currentStatus: job.status
      });
    }

    const content = await ContentRepository.getByJobId(jobId);

    if (!content || content.length === 0) {
      return res.status(404).json({
        error: 'Content Not Found',
        message: 'No content found for this job'
      });
    }

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

/**
 * GET /api/jobs
 * List all jobs with optional filtering
 */
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

/**
 * DELETE /api/job/:jobId
 * Delete a job and its content
 */
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

    await ContentRepository.deleteByJobId(jobId);
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

// =============================================================================
// SEO SCANNER ENDPOINTS
// =============================================================================

/**
 * POST /api/scan-seo
 * Initiate an SEO scan for a URL
 */
app.post('/api/scan-seo', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'URL is required and cannot be empty'
      });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid URL format'
      });
    }

    const domain = parsedUrl.hostname.replace(/^www\./, '');

    logger.info(`Creating new SEO scan for: ${domain}${req.userId ? ' for user ' + req.userId : ''}`);

    const scan = await SeoScanRepository.create({
      url: parsedUrl.href,
      domain,
      userId: req.userId // Associate scan with authenticated user
    });

    logger.info(`SEO scan created with ID: ${scan.id}`);

    await contentQueue.add(
      'scan-seo',
      {
        scanId: scan.id,
        url: parsedUrl.href
      },
      {
        jobId: scan.id,
        priority: 1,
        timeout: 180000 // 3 minutes timeout
      }
    );

    logger.info(`SEO scan ${scan.id} enqueued successfully`);

    res.status(202).json({
      success: true,
      message: 'SEO scan initiated successfully',
      scanId: scan.id,
      domain,
      status: scan.status,
      estimatedTimeSeconds: 60
    });

  } catch (error) {
    logger.error('Error in /api/scan-seo:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initiate SEO scan',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/seo-scan/:scanId
 * Get SEO scan status and results
 */
app.get('/api/seo-scan/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!scanId.match(uuidRegex)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid scan ID format'
      });
    }

    const scan = await SeoScanRepository.findById(scanId);

    if (!scan) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Scan not found'
      });
    }

    const response = {
      scanId: scan.id,
      url: scan.url,
      domain: scan.domain,
      status: scan.status,
      progress: scan.progress,
      currentStep: scan.current_step,
      dataSource: scan.data_source,
      createdAt: scan.created_at,
      startedAt: scan.started_at,
      completedAt: scan.completed_at
    };

    if (scan.status === 'COMPLETE' && scan.results) {
      response.results = scan.results;
    }

    if (scan.status === 'FAILED') {
      response.errorMessage = scan.error_message;
    }

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in /api/seo-scan/:scanId:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve scan status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/seo-scans
 * List all SEO scans
 */
app.get('/api/seo-scans', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    const filters = status ? { status } : {};

    const { data: scans, count: total } = await SeoScanRepository.find(filters, {
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
      scans
    });

  } catch (error) {
    logger.error('Error in /api/seo-scans:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve scans'
    });
  }
});

/**
 * DELETE /api/seo-scan/:scanId
 * Delete an SEO scan
 */
app.delete('/api/seo-scan/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!scanId.match(uuidRegex)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid scan ID format'
      });
    }

    const scan = await SeoScanRepository.findById(scanId);

    if (!scan) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Scan not found'
      });
    }

    await SeoScanRepository.delete(scanId);

    logger.info(`SEO scan ${scanId} deleted`);

    res.status(200).json({
      success: true,
      message: 'SEO scan deleted successfully'
    });

  } catch (error) {
    logger.error('Error in DELETE /api/seo-scan/:scanId:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete scan'
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

/**
 * Server Initialization
 */
const startServer = async () => {
  try {
    initSupabase();
    await testConnection();

    // Initialize auth client
    initAuthClient();
    logger.info('Auth service initialized');

    contentQueue = createContentQueue();
    logger.info('BullMQ queue initialized');

    app.listen(PORT, () => {
      logger.info(`Content Factory API Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

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

startServer();

export default app;
