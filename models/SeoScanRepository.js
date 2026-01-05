import { getSupabase } from '../config/supabase.js';
import logger from '../utils/logger.js';

/**
 * SeoScan Repository - Handles all database operations for seo_scans table
 */
class SeoScanRepository {
    constructor() {
        this.table = 'seo_scans';
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
                logger.error('Failed to initialize Supabase client in SeoScanRepository:', error.message);
                throw new Error(`Database connection failed: ${error.message}`);
            }
        }
        return this._supabase;
    }

    /**
     * Create a new SEO scan
     */
    async create(scanData) {
        try {
            if (!scanData.url || !scanData.domain) {
                throw new Error('Missing required fields: url, domain');
            }

            const { data, error } = await this.supabase
                .from(this.table)
                .insert([{
                    url: scanData.url,
                    domain: scanData.domain,
                    status: 'ENQUEUED',
                    progress: 0,
                    current_step: 'Initializing',
                    data_source: scanData.dataSource || 'manual_serp',
                    started_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                logger.error('Error creating SEO scan:', error);
                throw new Error(`Failed to create SEO scan: ${error.message}`);
            }

            logger.info(`SEO scan created successfully: ${data.id}`);
            return data;
        } catch (error) {
            logger.error('SeoScanRepository.create failed:', error);
            throw error;
        }
    }

    /**
     * Find scan by ID
     */
    async findById(scanId) {
        const { data, error } = await this.supabase
            .from(this.table)
            .select('*')
            .eq('id', scanId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            logger.error('Error finding SEO scan:', error);
            throw error;
        }

        return data;
    }

    /**
     * Update scan
     */
    async update(scanId, updates) {
        const { data, error } = await this.supabase
            .from(this.table)
            .update(updates)
            .eq('id', scanId)
            .select()
            .single();

        if (error) {
            logger.error('Error updating SEO scan:', error);
            throw error;
        }

        return data;
    }

    /**
     * Update scan progress and step
     */
    async updateProgress(scanId, progress, currentStep) {
        return await this.update(scanId, {
            progress,
            current_step: currentStep
        });
    }

    /**
     * Mark scan as failed
     */
    async markAsFailed(scanId, errorMessage) {
        return await this.update(scanId, {
            status: 'FAILED',
            error_message: errorMessage,
            completed_at: new Date().toISOString()
        });
    }

    /**
     * Mark scan as complete with results
     */
    async markAsComplete(scanId, results) {
        return await this.update(scanId, {
            status: 'COMPLETE',
            progress: 100,
            current_step: 'Complete',
            results,
            completed_at: new Date().toISOString()
        });
    }

    /**
     * Update status
     */
    async updateStatus(scanId, status, progress = null) {
        const updates = { status };
        if (progress !== null) {
            updates.progress = progress;
        }
        return await this.update(scanId, updates);
    }

    /**
     * Find scans with filters
     */
    async find(filters = {}, options = {}) {
        let query = this.supabase.from(this.table).select('*');

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.domain) {
            query = query.ilike('domain', `%${filters.domain}%`);
        }

        const orderBy = options.orderBy || 'created_at';
        const order = options.order || 'desc';
        query = query.order(orderBy, { ascending: order === 'asc' });

        if (options.limit) {
            query = query.limit(options.limit);
        }
        if (options.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
        }

        const { data, error, count } = await query;

        if (error) {
            logger.error('Error finding SEO scans:', error);
            throw error;
        }

        return { data, count };
    }

    /**
     * Delete scan
     */
    async delete(scanId) {
        const { error } = await this.supabase
            .from(this.table)
            .delete()
            .eq('id', scanId);

        if (error) {
            logger.error('Error deleting SEO scan:', error);
            throw error;
        }

        return true;
    }
}

export default new SeoScanRepository();
