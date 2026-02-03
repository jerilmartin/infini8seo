import { getSupabase } from '../config/supabase.js';
import logger from '../utils/logger.js';

/**
 * User Repository - Handles user profiles, subscriptions, and credits
 */
class UserRepository {
    constructor() {
        this.table = 'users';
        this._supabase = null;
    }

    get supabase() {
        if (!this._supabase) {
            try {
                this._supabase = getSupabase();
            } catch (error) {
                logger.error('Failed to initialize Supabase client in UserRepository:', error.message);
                throw new Error(`Database connection failed: ${error.message}`);
            }
        }
        return this._supabase;
    }

    /**
     * Create or update user profile
     */
    async upsert(userData) {
        try {
            const { data, error } = await this.supabase
                .from(this.table)
                .upsert({
                    id: userData.id,
                    email: userData.email,
                    full_name: userData.full_name || null,
                    avatar_url: userData.avatar_url || null,
                    last_login_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                })
                .select()
                .single();

            if (error) {
                logger.error('Error upserting user:', error);
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('UserRepository.upsert failed:', error);
            throw error;
        }
    }

    /**
     * Find user by ID
     */
    async findById(userId) {
        const { data, error } = await this.supabase
            .from(this.table)
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            logger.error('Error finding user:', error);
            throw error;
        }

        return data;
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        const { data, error } = await this.supabase
            .from(this.table)
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            logger.error('Error finding user by email:', error);
            throw error;
        }

        return data;
    }

    /**
     * Get user credits
     */
    async getCredits(userId) {
        const { data, error } = await this.supabase
            .from(this.table)
            .select('credits_remaining, credits_total, credits_used, subscription_tier')
            .eq('id', userId)
            .single();

        if (error) {
            logger.error('Error getting user credits:', error);
            throw error;
        }

        return data;
    }

    /**
     * Check if user has enough credits
     */
    async hasEnoughCredits(userId, requiredCredits) {
        try {
            const { data, error } = await this.supabase
                .rpc('check_user_credits', {
                    p_user_id: userId,
                    p_required_credits: requiredCredits
                });

            if (error) {
                logger.error('Error checking credits:', error);
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('hasEnoughCredits failed:', error);
            throw error;
        }
    }

    /**
     * Deduct credits from user
     */
    async deductCredits(userId, amount, entityType, entityId, description) {
        try {
            const { data, error } = await this.supabase
                .rpc('deduct_credits', {
                    p_user_id: userId,
                    p_amount: amount,
                    p_entity_type: entityType,
                    p_entity_id: entityId,
                    p_description: description
                });

            if (error) {
                logger.error('Error deducting credits:', error);
                throw error;
            }

            if (!data) {
                throw new Error('Insufficient credits');
            }

            logger.info(`Deducted ${amount} credits from user ${userId}`);
            return true;
        } catch (error) {
            logger.error('deductCredits failed:', error);
            throw error;
        }
    }

    /**
     * Add credits to user
     */
    async addCredits(userId, amount, type, description) {
        try {
            const { data, error } = await this.supabase
                .rpc('add_credits', {
                    p_user_id: userId,
                    p_amount: amount,
                    p_type: type,
                    p_description: description
                });

            if (error) {
                logger.error('Error adding credits:', error);
                throw error;
            }

            logger.info(`Added ${amount} credits to user ${userId}`);
            return true;
        } catch (error) {
            logger.error('addCredits failed:', error);
            throw error;
        }
    }

    /**
     * Calculate credit cost for blog generation
     */
    calculateBlogCredits(blogCount) {
        if (blogCount <= 10) {
            return blogCount * 5;
        } else if (blogCount <= 30) {
            return blogCount * 4;
        } else {
            return blogCount * 3;
        }
    }

    /**
     * Update subscription
     */
    async updateSubscription(userId, subscriptionData) {
        try {
            const { data, error } = await this.supabase
                .from(this.table)
                .update({
                    subscription_tier: subscriptionData.tier,
                    subscription_status: subscriptionData.status,
                    subscription_started_at: subscriptionData.started_at,
                    subscription_expires_at: subscriptionData.expires_at,
                    credits_remaining: subscriptionData.credits_granted,
                    credits_total: subscriptionData.credits_granted,
                    credits_reset_at: subscriptionData.expires_at,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                logger.error('Error updating subscription:', error);
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('updateSubscription failed:', error);
            throw error;
        }
    }

    /**
     * Get user's credit transactions
     */
    async getCreditTransactions(userId, limit = 50, offset = 0) {
        const { data, error, count } = await this.supabase
            .from('credit_transactions')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            logger.error('Error getting credit transactions:', error);
            throw error;
        }

        return { data, count };
    }

    /**
     * Get user's subscriptions
     */
    async getSubscriptions(userId) {
        const { data, error } = await this.supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error getting subscriptions:', error);
            throw error;
        }

        return data;
    }

    /**
     * Create subscription record
     */
    async createSubscription(subscriptionData) {
        try {
            const { data, error } = await this.supabase
                .from('subscriptions')
                .insert([subscriptionData])
                .select()
                .single();

            if (error) {
                logger.error('Error creating subscription:', error);
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('createSubscription failed:', error);
            throw error;
        }
    }

    /**
     * Update user payment info
     */
    async updatePaymentInfo(userId, paymentData) {
        try {
            const { data, error } = await this.supabase
                .from(this.table)
                .update({
                    stripe_customer_id: paymentData.stripe_customer_id || null,
                    razorpay_customer_id: paymentData.razorpay_customer_id || null,
                    payment_method_last4: paymentData.last4 || null,
                    payment_method_brand: paymentData.brand || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                logger.error('Error updating payment info:', error);
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('updatePaymentInfo failed:', error);
            throw error;
        }
    }

    /**
     * Get subscription tier details
     */
    getSubscriptionTierDetails(tier) {
        const tiers = {
            free: {
                name: 'Free',
                credits: 10,
                price: 0,
                currency: 'USD',
                features: ['2 blogs', 'No SEO scans', 'Test quality']
            },
            starter: {
                name: 'Starter',
                credits: 120,
                price: 9,
                currency: 'USD',
                features: ['20 blogs + 1 SEO scan', 'OR 40 blogs', 'OR 6 SEO scans']
            },
            pro: {
                name: 'Pro',
                credits: 400,
                price: 19,
                currency: 'USD',
                features: ['60 blogs + 5 SEO scans', 'OR 120 blogs', 'OR 20 SEO scans']
            }
        };

        return tiers[tier] || tiers.free;
    }
}

export default new UserRepository();
