import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import { initSupabase, testConnection } from '../config/supabase.js';
import { createContentQueue } from '../config/redis.js';
import logger from '../utils/logger.js';
import JobRepository from '../models/JobRepository.js';
import ContentRepository from '../models/ContentRepository.js';
import SeoScanRepository from '../models/SeoScanRepository.js';
import UserRepository from '../models/UserRepository.js';
import {
  initAuthClient,
  authMiddleware,
  generateToken,
  getGoogleAuthUrl,
  exchangeCodeForSession,
  getUserFromSupabaseToken,
  verifyToken
} from '../services/authService.js';
import subscriptionService from '../services/subscriptionService.js';
import adminService from '../services/adminService.js';
import contentLibraryService from '../services/contentLibraryService.js';
import requireAdmin from '../middleware/adminAuth.js';

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

    // Initialize user in our database (creates user record with 10 free credits if new)
    await subscriptionService.initializeNewUser(
      user.id,
      user.email,
      user.user_metadata?.full_name || user.email?.split('@')[0],
      user.user_metadata?.avatar_url
    );

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

    // Initialize user in our database (creates user record with 10 free credits if new)
    await subscriptionService.initializeNewUser(
      user.id,
      user.email,
      user.user_metadata?.full_name || user.email?.split('@')[0],
      user.user_metadata?.avatar_url
    );

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
app.get('/api/auth/me', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Not authenticated'
    });
  }

  // Try to initialize user if they don't exist (for existing sessions)
  try {
    await subscriptionService.initializeNewUser(
      req.user.userId,
      req.user.email,
      req.user.name,
      req.user.avatar
    );
  } catch (error) {
    // Ignore if user already exists
    logger.debug('User initialization skipped (may already exist)');
  }

  // Get user role from database
  let userRole = 'user';
  try {
    const dbUser = await UserRepository.findById(req.user.userId);
    if (dbUser) {
      userRole = dbUser.role || 'user';
    }
  } catch (error) {
    logger.warn('Could not fetch user role:', error);
  }

  res.json({
    success: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      avatar: req.user.avatar,
      provider: req.user.provider,
      role: userRole
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
// SUBSCRIPTION & CREDITS ROUTES
// ============================================================================

/**
 * GET /api/subscription/status
 * Get current user's subscription status and credits
 */
app.get('/api/subscription/status', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const status = await subscriptionService.getSubscriptionStatus(req.userId);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error('Error in /api/subscription/status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve subscription status'
    });
  }
});

/**
 * GET /api/subscription/pricing
 * Get available pricing plans
 */
app.get('/api/subscription/pricing', (req, res) => {
  try {
    const plans = subscriptionService.getPricingPlans();

    res.json({
      success: true,
      plans
    });
  } catch (error) {
    logger.error('Error in /api/subscription/pricing:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve pricing plans'
    });
  }
});

/**
 * POST /api/subscription/calculate-cost
 * Calculate credit cost for an action
 */
app.post('/api/subscription/calculate-cost', (req, res) => {
  try {
    const { actionType, params } = req.body;

    if (!actionType) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'actionType is required'
      });
    }

    const cost = subscriptionService.calculateCreditCost(actionType, params);

    if (!cost) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid action type'
      });
    }

    res.json({
      success: true,
      ...cost
    });
  } catch (error) {
    logger.error('Error in /api/subscription/calculate-cost:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to calculate cost'
    });
  }
});

/**
 * GET /api/subscription/transactions
 * Get user's credit transaction history
 */
app.get('/api/subscription/transactions', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { limit = 50, offset = 0 } = req.query;

    const { data: transactions, count } = await UserRepository.getCreditTransactions(
      req.userId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      transactions,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error in /api/subscription/transactions:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve transactions'
    });
  }
});

/**
 * POST /api/subscription/upgrade
 * Upgrade user subscription (placeholder for payment integration)
 */
app.post('/api/subscription/upgrade', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { tier, paymentData } = req.body;

    if (!tier || !['starter', 'pro'].includes(tier)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Valid tier is required (starter or pro)'
      });
    }

    // TODO: Integrate with Stripe/Razorpay payment processing here
    // For now, this is a placeholder that assumes payment is successful

    const result = await subscriptionService.upgradeSubscription(
      req.userId,
      tier,
      paymentData || {}
    );

    res.json({
      success: true,
      message: `Successfully upgraded to ${tier} tier`,
      ...result
    });
  } catch (error) {
    logger.error('Error in /api/subscription/upgrade:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upgrade subscription',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel user subscription
 */
app.post('/api/subscription/cancel', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const result = await subscriptionService.cancelSubscription(req.userId);

    res.json(result);
  } catch (error) {
    logger.error('Error in /api/subscription/cancel:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to cancel subscription'
    });
  }
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

    // Authentication check
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to generate content'
      });
    }

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

    // Check if user can perform this action (credits + tier limits)
    const canPerform = await subscriptionService.canPerformAction(req.userId, 'blog_generation', {
      totalBlogs: sanitizedTotalBlogs
    });

    if (!canPerform.allowed) {
      return res.status(403).json({
        error: 'Insufficient Credits',
        message: canPerform.reason,
        requiredCredits: canPerform.requiredCredits,
        availableCredits: canPerform.availableCredits,
        subscriptionTier: canPerform.subscriptionTier
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

    logger.info(`Creating new content generation job for niche: ${niche} for user ${req.userId}`);

    // Calculate credit cost
    const creditCost = UserRepository.calculateBlogCredits(sanitizedTotalBlogs);

    const job = await JobRepository.create({
      niche: niche.trim(),
      valuePropositions: sanitizedValueProps,
      tone: tone.toLowerCase(),
      totalBlogs: sanitizedTotalBlogs,
      blogTypeAllocations: sanitizedAllocations,
      targetWordCount: sanitizedWordCount,
      userId: req.userId,
      creditsCost: creditCost
    });

    logger.info(`Job created with ID: ${job.id}, cost: ${creditCost} credits`);

    // Deduct credits
    try {
      await subscriptionService.deductCreditsForAction(req.userId, 'blog_generation', {
        totalBlogs: sanitizedTotalBlogs,
        entityId: job.id
      });
    } catch (creditError) {
      // Rollback job creation if credit deduction fails
      await JobRepository.delete(job.id);
      throw creditError;
    }

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
      creditsDeducted: creditCost,
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
        
        // If no content yet but we have scenarios, show scenario titles as preview
        if (response.generatedTitles.length === 0 && job.scenarios && job.scenarios.length > 0) {
          response.generatedTitles = job.scenarios.slice(0, 15).map(s => ({
            title: s.blog_topic_headline,
            type: s.persona_archetype || 'Article'
          }));
        }
      } catch (err) {
        logger.warn('Could not fetch generated titles:', err.message);
        response.generatedTitles = [];
        
        // Fallback to scenarios if available
        if (job.scenarios && job.scenarios.length > 0) {
          response.generatedTitles = job.scenarios.slice(0, 15).map(s => ({
            title: s.blog_topic_headline,
            type: s.persona_archetype || 'Article'
          }));
        }
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

    if (job.status !== 'COMPLETE' && job.status !== 'PARTIAL_COMPLETE') {
      return res.status(400).json({
        error: 'Job Not Complete',
        message: `Job is currently in ${job.status} status. Content is only available when status is COMPLETE or PARTIAL_COMPLETE.`,
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
      status: job.status,
      failedCount: job.failed_content_count || 0,
      creditsRefunded: job.credits_refunded || 0,
      stats,
      content: content.map(post => ({
        contentId: post.id,
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
 * GET /api/content/:jobId/export/bulk
 * Export all content as ZIP (with MD or DOCX format)
 */
app.get('/api/content/:jobId/export/bulk', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { format = 'md' } = req.query; // 'md' or 'docx'

    const exportService = (await import('../services/exportService.js')).default;

    const job = await JobRepository.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const content = await ContentRepository.getByJobId(jobId);
    if (!content || content.length === 0) {
      return res.status(404).json({ error: 'No content found' });
    }

    const archive = exportService.createZipArchive();
    
    // Set response headers
    const filename = `${job.niche.replace(/\s+/g, '-').toLowerCase()}-content.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe archive to response
    archive.pipe(res);

    // Add each blog post to archive
    for (const post of content) {
      const safeFilename = exportService.generateSafeFilename(post.blog_title, format);
      
      if (format === 'docx') {
        const docxBuffer = await exportService.markdownToDocx(post.blog_title, post.blog_content);
        exportService.addFileToArchive(archive, docxBuffer, safeFilename);
      } else {
        const mdContent = `# ${post.blog_title}\n\n${post.blog_content}`;
        exportService.addFileToArchive(archive, mdContent, safeFilename);
      }
    }

    // Finalize archive
    await archive.finalize();

  } catch (error) {
    logger.error('Error in bulk export:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Export failed', message: error.message });
    }
  }
});

/**
 * GET /api/content/:contentId/export
 * Export single content as MD or DOCX
 */
app.get('/api/content/:contentId/export', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { format = 'md' } = req.query; // 'md' or 'docx'

    const exportService = (await import('../services/exportService.js')).default;

    const content = await ContentRepository.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const safeFilename = exportService.generateSafeFilename(content.blog_title, format);

    if (format === 'docx') {
      const docxBuffer = await exportService.markdownToDocx(content.blog_title, content.blog_content);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.send(docxBuffer);
    } else {
      const mdContent = `# ${content.blog_title}\n\n${content.blog_content}`;
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.send(mdContent);
    }

  } catch (error) {
    logger.error('Error in single export:', error);
    res.status(500).json({ error: 'Export failed', message: error.message });
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

    // Authentication check
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to perform SEO scans'
      });
    }

    if (!url || !url.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'URL is required and cannot be empty'
      });
    }

    // Check if user can perform this action (credits + tier limits)
    const canPerform = await subscriptionService.canPerformAction(req.userId, 'seo_scan');

    if (!canPerform.allowed) {
      return res.status(403).json({
        error: 'Insufficient Credits',
        message: canPerform.reason,
        requiredCredits: canPerform.requiredCredits,
        availableCredits: canPerform.availableCredits,
        subscriptionTier: canPerform.subscriptionTier
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

    logger.info(`Creating new SEO scan for: ${domain} for user ${req.userId}`);

    const scan = await SeoScanRepository.create({
      url: parsedUrl.href,
      domain,
      userId: req.userId,
      creditsCost: 20
    });

    logger.info(`SEO scan created with ID: ${scan.id}`);

    // Deduct credits
    try {
      await subscriptionService.deductCreditsForAction(req.userId, 'seo_scan', {
        url: parsedUrl.href,
        entityId: scan.id
      });
    } catch (creditError) {
      // Rollback scan creation if credit deduction fails
      await SeoScanRepository.delete(scan.id);
      throw creditError;
    }

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
      creditsDeducted: 20,
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

// ============================================================================
// CONTENT LIBRARY ROUTES
// ============================================================================

/**
 * POST /api/library/save
 * Save a blog to user's library
 */
app.post('/api/library/save', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { contentId, tags, notes, isFavorite } = req.body;

    if (!contentId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'contentId is required'
      });
    }

    const result = await contentLibraryService.saveBlog(req.userId, contentId, {
      tags: tags || [],
      notes: notes || '',
      isFavorite: isFavorite || false
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in /api/library/save:', error);
    
    if (error.message.includes('already saved')) {
      return res.status(409).json({
        error: 'Conflict',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save blog to library'
    });
  }
});

/**
 * DELETE /api/library/unsave/:contentId
 * Remove a blog from user's library
 */
app.delete('/api/library/unsave/:contentId', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { contentId } = req.params;

    const result = await contentLibraryService.unsaveBlog(req.userId, contentId);

    res.json(result);
  } catch (error) {
    logger.error('Error in /api/library/unsave:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove blog from library'
    });
  }
});

/**
 * GET /api/library
 * Get all saved blogs for the authenticated user
 */
app.get('/api/library', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const {
      limit = 50,
      offset = 0,
      tags,
      isFavorite,
      search,
      sortBy = 'saved_at',
      sortOrder = 'desc'
    } = req.query;

    const result = await contentLibraryService.getSavedBlogs(req.userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      tags: tags ? tags.split(',') : null,
      isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : null,
      search,
      sortBy,
      sortOrder
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in /api/library:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve saved blogs'
    });
  }
});

/**
 * GET /api/library/check/:contentId
 * Check if a specific blog is saved
 */
app.get('/api/library/check/:contentId', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { contentId } = req.params;

    const result = await contentLibraryService.isBlogSaved(req.userId, contentId);

    res.json(result);
  } catch (error) {
    logger.error('Error in /api/library/check:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check saved status'
    });
  }
});

/**
 * POST /api/library/check-multiple
 * Check if multiple blogs are saved (bulk check)
 */
app.post('/api/library/check-multiple', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { contentIds } = req.body;

    if (!contentIds || !Array.isArray(contentIds)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'contentIds array is required'
      });
    }

    const result = await contentLibraryService.checkMultipleSaved(req.userId, contentIds);

    res.json(result);
  } catch (error) {
    logger.error('Error in /api/library/check-multiple:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check saved status'
    });
  }
});

/**
 * PATCH /api/library/update/:contentId
 * Update saved blog metadata (tags, notes, favorite)
 */
app.patch('/api/library/update/:contentId', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { contentId } = req.params;
    const { tags, notes, isFavorite } = req.body;

    const result = await contentLibraryService.updateSavedBlog(req.userId, contentId, {
      tags,
      notes,
      isFavorite
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in /api/library/update:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update saved blog'
    });
  }
});

/**
 * GET /api/library/stats
 * Get library statistics for the user
 */
app.get('/api/library/stats', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const result = await contentLibraryService.getLibraryStats(req.userId);

    res.json(result);
  } catch (error) {
    logger.error('Error in /api/library/stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve library statistics'
    });
  }
});

// ============================================================================
// ADMIN ROUTES (Protected)
// ============================================================================

/**
 * GET /api/admin/stats
 * Get platform statistics (admin only)
 */
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await adminService.getPlatformStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error in /api/admin/stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve platform statistics'
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users with filters (admin only)
 */
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { tier, status, search, limit, offset } = req.query;
    
    const result = await adminService.getAllUsers({
      tier,
      status,
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error in /api/admin/users:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve users'
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get detailed user information (admin only)
 */
app.get('/api/admin/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const details = await adminService.getUserDetails(userId);
    
    res.json({
      success: true,
      ...details
    });
  } catch (error) {
    logger.error('Error in /api/admin/users/:userId:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve user details'
    });
  }
});

/**
 * POST /api/admin/users/:userId/grant-credits
 * Grant bonus credits to a user (admin only)
 */
app.post('/api/admin/users/:userId/grant-credits', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount must be a positive number'
      });
    }
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Reason is required'
      });
    }
    
    const result = await adminService.grantBonusCredits(
      userId,
      amount,
      reason,
      req.adminUser.email
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error in /api/admin/users/:userId/grant-credits:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to grant credits'
    });
  }
});

/**
 * POST /api/admin/users/:userId/adjust-credits
 * Manually adjust user credits (admin only)
 */
app.post('/api/admin/users/:userId/adjust-credits', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    
    if (!amount || amount === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount must be a non-zero number'
      });
    }
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Reason is required'
      });
    }
    
    const result = await adminService.adjustUserCredits(
      userId,
      amount,
      reason,
      req.adminUser.email
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error in /api/admin/users/:userId/adjust-credits:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to adjust credits'
    });
  }
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

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

    // Small delay to allow Redis connection to establish
    await new Promise(resolve => setTimeout(resolve, 100));
    logger.info('Starting HTTP server...');

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
