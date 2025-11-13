import { getSupabase } from '../config/supabase.js';
import logger from '../utils/logger.js';

/**
 * Content Repository - Handles all database operations for contents table
 */
class ContentRepository {
  constructor() {
    this.table = 'contents';
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
        logger.error('Failed to initialize Supabase client in ContentRepository:', error.message);
        throw new Error(`Database connection failed: ${error.message}`);
      }
    }
    return this._supabase;
  }

  /**
   * Create new content
   */
  async create(contentData) {
    try {
      // Validate required fields
      if (!contentData.jobId || !contentData.scenarioId || !contentData.blogTitle || !contentData.blogContent) {
        throw new Error('Missing required content fields');
      }

      // Generate slug from title
      const slug = this.generateSlug(contentData.blogTitle);
      
      // Generate meta description
      const metaDescription = this.generateMetaDescription(contentData.blogContent);

      // Calculate word count if not provided
      const wordCount = contentData.wordCount || this.countWords(contentData.blogContent);
      const characterCount = contentData.blogContent.length;

      const { data, error } = await this.supabase
        .from(this.table)
        .insert([{
          job_id: contentData.jobId,
          scenario_id: contentData.scenarioId,
          blog_title: contentData.blogTitle,
          persona_archetype: contentData.personaArchetype,
          keywords: contentData.keywords || [],
          blog_content: contentData.blogContent,
          word_count: wordCount,
          character_count: characterCount,
          meta_description: metaDescription,
          slug: slug,
          generation_time_ms: contentData.generationTimeMs,
          model_used: contentData.modelUsed || 'gemini-2.5-flash',
          image_urls: contentData.imageUrls || null,
          status: 'COMPLETED'
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating content:', error);
        throw new Error(`Failed to create content: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('ContentRepository.create failed:', error);
      throw error;
    }
  }

  /**
   * Create failed content record
   */
  async createFailed(contentData) {
    const { data, error } = await this.supabase
      .from(this.table)
      .insert([{
        job_id: contentData.jobId,
        scenario_id: contentData.scenarioId,
        blog_title: contentData.blogTitle,
        persona_archetype: contentData.personaArchetype,
        keywords: contentData.keywords || [],
        blog_content: '',
        word_count: 0,
        blog_type: contentData.blogType || null,
        image_urls: contentData.imageUrls || null,
        status: 'FAILED',
        error_message: contentData.errorMessage
      }])
      .select()
      .single();

    if (error) {
      logger.error('Error creating failed content record:', error);
      // Don't throw - this is just for logging
    }

    return data;
  }

  /**
   * Find content by ID
   */
  async findById(contentId) {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', contentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Error finding content:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get all content for a job
   */
  async getByJobId(jobId) {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'COMPLETED')
      .order('scenario_id', { ascending: true });

    if (error) {
      logger.error('Error getting content by job ID:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get job statistics
   */
  async getJobStats(jobId) {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('status, word_count, generation_time_ms')
      .eq('job_id', jobId);

    if (error) {
      logger.error('Error getting job stats:', error);
      throw error;
    }

    // Calculate statistics
    const stats = {
      total: data.length,
      completed: data.filter(c => c.status === 'COMPLETED').length,
      failed: data.filter(c => c.status === 'FAILED').length,
      avgWordCount: 0,
      avgGenerationTime: 0
    };

    const completed = data.filter(c => c.status === 'COMPLETED');
    if (completed.length > 0) {
      stats.avgWordCount = Math.round(
        completed.reduce((sum, c) => sum + c.word_count, 0) / completed.length
      );
      
      const withTime = completed.filter(c => c.generation_time_ms);
      if (withTime.length > 0) {
        stats.avgGenerationTime = Math.round(
          withTime.reduce((sum, c) => sum + c.generation_time_ms, 0) / withTime.length
        );
      }
    }

    return stats;
  }

  /**
   * Delete all content for a job
   */
  async deleteByJobId(jobId) {
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq('job_id', jobId);

    if (error) {
      logger.error('Error deleting content:', error);
      throw error;
    }

    return true;
  }

  /**
   * Count words in text
   */
  countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Generate slug from title
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 500);
  }

  /**
   * Generate meta description from content
   */
  generateMetaDescription(content) {
    if (!content) return '';
    
    // Remove markdown syntax
    const plainText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/[*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .trim();
    
    return plainText.substring(0, 150).trim() + '...';
  }
}

export default new ContentRepository();

