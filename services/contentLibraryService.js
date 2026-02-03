import { getSupabase } from '../config/supabase.js';
import logger from '../utils/logger.js';

/**
 * Content Library Service
 * Handles saving, retrieving, and managing user's saved blog content
 */
class ContentLibraryService {
  /**
   * Get Supabase client
   */
  get supabase() {
    return getSupabase();
  }

  /**
   * Save a blog to user's library
   */
  async saveBlog(userId, contentId, options = {}) {
    try {
      const { tags = [], notes = '', isFavorite = false } = options;

      const { data, error } = await this.supabase
        .from('saved_contents')
        .insert({
          user_id: userId,
          content_id: contentId,
          tags,
          notes,
          is_favorite: isFavorite
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('This blog is already saved to your library');
        }
        throw error;
      }

      logger.info(`User ${userId} saved content ${contentId} to library`);

      return {
        success: true,
        savedContent: data
      };
    } catch (error) {
      logger.error('Error saving blog to library:', error);
      throw error;
    }
  }

  /**
   * Remove a blog from user's library
   */
  async unsaveBlog(userId, contentId) {
    try {
      const { error } = await this.supabase
        .from('saved_contents')
        .delete()
        .eq('user_id', userId)
        .eq('content_id', contentId);

      if (error) throw error;

      logger.info(`User ${userId} removed content ${contentId} from library`);

      return {
        success: true,
        message: 'Blog removed from library'
      };
    } catch (error) {
      logger.error('Error removing blog from library:', error);
      throw error;
    }
  }

  /**
   * Get all saved blogs for a user with full content details
   */
  async getSavedBlogs(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        tags = null,
        isFavorite = null,
        search = null,
        sortBy = 'saved_at',
        sortOrder = 'desc'
      } = options;

      let query = this.supabase
        .from('saved_contents')
        .select(`
          id,
          content_id,
          tags,
          notes,
          is_favorite,
          saved_at,
          updated_at,
          contents (
            id,
            job_id,
            blog_title,
            persona_archetype,
            keywords,
            blog_content,
            word_count,
            meta_description,
            slug,
            blog_type,
            created_at,
            image_urls
          )
        `, { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      if (isFavorite !== null) {
        query = query.eq('is_favorite', isFavorite);
      }

      if (search) {
        // Search in blog title through the joined contents table
        query = query.ilike('contents.blog_title', `%${search}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        savedBlogs: data || [],
        total: count || 0,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error fetching saved blogs:', error);
      throw error;
    }
  }

  /**
   * Check if a blog is saved by user
   */
  async isBlogSaved(userId, contentId) {
    try {
      const { data, error } = await this.supabase
        .from('saved_contents')
        .select('id')
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return {
        isSaved: !!data
      };
    } catch (error) {
      logger.error('Error checking if blog is saved:', error);
      throw error;
    }
  }

  /**
   * Update saved blog metadata (tags, notes, favorite status)
   */
  async updateSavedBlog(userId, contentId, updates = {}) {
    try {
      const { tags, notes, isFavorite } = updates;

      const updateData = {};
      if (tags !== undefined) updateData.tags = tags;
      if (notes !== undefined) updateData.notes = notes;
      if (isFavorite !== undefined) updateData.is_favorite = isFavorite;

      const { data, error } = await this.supabase
        .from('saved_contents')
        .update(updateData)
        .eq('user_id', userId)
        .eq('content_id', contentId)
        .select()
        .single();

      if (error) throw error;

      logger.info(`User ${userId} updated saved content ${contentId}`);

      return {
        success: true,
        savedContent: data
      };
    } catch (error) {
      logger.error('Error updating saved blog:', error);
      throw error;
    }
  }

  /**
   * Get library statistics for a user
   */
  async getLibraryStats(userId) {
    try {
      // Get total saved count
      const { count: totalSaved, error: countError } = await this.supabase
        .from('saved_contents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) throw countError;

      // Get favorites count
      const { count: favoritesCount, error: favError } = await this.supabase
        .from('saved_contents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_favorite', true);

      if (favError) throw favError;

      // Get all tags
      const { data: tagsData, error: tagsError } = await this.supabase
        .from('saved_contents')
        .select('tags')
        .eq('user_id', userId);

      if (tagsError) throw tagsError;

      // Flatten and count unique tags
      const allTags = tagsData.flatMap(item => item.tags || []);
      const uniqueTags = [...new Set(allTags)];

      return {
        success: true,
        stats: {
          totalSaved: totalSaved || 0,
          favoritesCount: favoritesCount || 0,
          uniqueTags: uniqueTags.length,
          tags: uniqueTags
        }
      };
    } catch (error) {
      logger.error('Error fetching library stats:', error);
      throw error;
    }
  }

  /**
   * Bulk check if multiple blogs are saved
   */
  async checkMultipleSaved(userId, contentIds) {
    try {
      const { data, error } = await this.supabase
        .from('saved_contents')
        .select('content_id')
        .eq('user_id', userId)
        .in('content_id', contentIds);

      if (error) throw error;

      const savedIds = new Set(data.map(item => item.content_id));
      const result = {};
      
      contentIds.forEach(id => {
        result[id] = savedIds.has(id);
      });

      return {
        success: true,
        savedStatus: result
      };
    } catch (error) {
      logger.error('Error checking multiple saved blogs:', error);
      throw error;
    }
  }
}

export default new ContentLibraryService();
