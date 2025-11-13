import { getSupabase } from '../config/supabase.js';
import logger from '../utils/logger.js';

/**
 * Job Repository - Handles all database operations for jobs table
 */
class JobRepository {
  constructor() {
    this.table = 'jobs';
    this._supabase = null;
  }

  /**
   * Get Supabase client (lazy initialization)
   */
  get supabase() {
    if (!this._supabase) {
      try {
        this._supabase = getSupabase();
      } catch (error) {
        logger.error('Failed to initialize Supabase client in JobRepository:', error.message);
        throw new Error(`Database connection failed: ${error.message}`);
      }
    }
    return this._supabase;
  }

  /**
   * Create a new job
   */
  async create(jobData) {
    try {
      if (!jobData.niche || !jobData.valuePropositions || !jobData.tone) {
        throw new Error('Missing required fields: niche, valuePropositions, tone');
      }

      if (typeof jobData.totalBlogs !== 'number') {
        throw new Error('Missing required field: totalBlogs');
      }

      const { data, error } = await this.supabase
        .from(this.table)
        .insert([{
          niche: jobData.niche,
          value_propositions: jobData.valuePropositions,
          tone: jobData.tone,
          total_blogs: jobData.totalBlogs,
          blog_type_allocations: jobData.blogTypeAllocations || null,
          status: 'ENQUEUED',
          progress: 0,
          started_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating job:', error);
        throw new Error(`Failed to create job: ${error.message}`);
      }

      logger.info(`Job created successfully: ${data.id}`);
      return data;
    } catch (error) {
      logger.error('JobRepository.create failed:', error);
      throw error;
    }
  }

  /**
   * Find job by ID
   */
  async findById(jobId) {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      logger.error('Error finding job:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update job
   */
  async update(jobId, updates) {
    const { data, error} = await this.supabase
      .from(this.table)
      .update(updates)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating job:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId, increment) {
    const job = await this.findById(jobId);
    if (!job) throw new Error('Job not found');

    const newProgress = Math.min(100, job.progress + increment);
    return await this.update(jobId, { progress: newProgress });
  }

  /**
   * Mark job as failed
   */
  async markAsFailed(jobId, errorMessage) {
    return await this.update(jobId, {
      status: 'FAILED',
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Mark job as complete
   */
  async markAsComplete(jobId) {
    return await this.update(jobId, {
      status: 'COMPLETE',
      progress: 100,
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Update scenarios (Phase A completion)
   */
  async updateScenarios(jobId, scenarios) {
    return await this.update(jobId, {
      scenarios: scenarios,
      status: 'RESEARCH_COMPLETE',
      progress: 20
    });
  }

  /**
   * Update status
   */
  async updateStatus(jobId, status, progress = null) {
    const updates = { status };
    if (progress !== null) {
      updates.progress = progress;
    }
    return await this.update(jobId, updates);
  }

  /**
   * Increment total content generated
   */
  async incrementContentGenerated(jobId) {
    const job = await this.findById(jobId);
    if (!job) throw new Error('Job not found');

    return await this.update(jobId, {
      total_content_generated: (job.total_content_generated || 0) + 1
    });
  }

  /**
   * Find jobs with filters
   */
  async find(filters = {}, options = {}) {
    let query = this.supabase.from(this.table).select('*');

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.niche) {
      query = query.ilike('niche', `%${filters.niche}%`);
    }

    // Apply sorting
    const orderBy = options.orderBy || 'created_at';
    const order = options.order || 'desc';
    query = query.order(orderBy, { ascending: order === 'asc' });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error finding jobs:', error);
      throw error;
    }

    return { data, count };
  }

  /**
   * Count jobs
   */
  async count(filters = {}) {
    let query = this.supabase.from(this.table).select('*', { count: 'exact', head: true });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { count, error } = await query;

    if (error) {
      logger.error('Error counting jobs:', error);
      throw error;
    }

    return count;
  }

  /**
   * Delete job
   */
  async delete(jobId) {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq('id', jobId);

    if (error) {
      logger.error('Error deleting job:', error);
      throw error;
    }

    return true;
  }
}

export default new JobRepository();

