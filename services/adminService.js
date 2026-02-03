import UserRepository from '../models/UserRepository.js';
import logger from '../utils/logger.js';

/**
 * Admin Service - Admin-only operations
 * 
 * SECURITY: These functions should only be called from admin-protected endpoints
 */

/**
 * Grant bonus credits to a user
 */
export async function grantBonusCredits(userId, amount, reason, adminEmail) {
    try {
        const user = await UserRepository.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        const success = await UserRepository.addCredits(
            userId,
            amount,
            'bonus',
            `Admin bonus: ${reason} (granted by ${adminEmail})`
        );

        if (!success) {
            throw new Error('Failed to grant credits');
        }

        logger.info(`Admin ${adminEmail} granted ${amount} bonus credits to ${user.email}. Reason: ${reason}`);

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                creditsRemaining: user.credits_remaining + amount
            },
            creditsGranted: amount,
            reason
        };
    } catch (error) {
        logger.error('grantBonusCredits failed:', error);
        throw error;
    }
}

/**
 * Get all users with filters
 */
export async function getAllUsers(filters = {}) {
    try {
        const { tier, status, search, limit = 50, offset = 0 } = filters;

        let query = UserRepository.supabase
            .from('users')
            .select('id, email, full_name, role, subscription_tier, subscription_status, credits_remaining, credits_total, created_at, last_login_at')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (tier) {
            query = query.eq('subscription_tier', tier);
        }

        if (status) {
            query = query.eq('subscription_status', status);
        }

        if (search) {
            query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            throw error;
        }

        return {
            users: data,
            total: count,
            limit,
            offset
        };
    } catch (error) {
        logger.error('getAllUsers failed:', error);
        throw error;
    }
}

/**
 * Get user details with full transaction history
 */
export async function getUserDetails(userId) {
    try {
        const user = await UserRepository.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        // Get transaction history
        const { data: transactions, error: txError } = await UserRepository.supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (txError) {
            throw txError;
        }

        // Get subscription history
        const { data: subscriptions, error: subError } = await UserRepository.supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (subError) {
            throw subError;
        }

        return {
            user,
            transactions,
            subscriptions
        };
    } catch (error) {
        logger.error('getUserDetails failed:', error);
        throw error;
    }
}

/**
 * Get platform statistics
 */
export async function getPlatformStats() {
    try {
        // Total users by tier
        const { data: tierStats, error: tierError } = await UserRepository.supabase
            .from('users')
            .select('subscription_tier')
            .then(result => {
                if (result.error) throw result.error;
                
                const stats = result.data.reduce((acc, user) => {
                    acc[user.subscription_tier] = (acc[user.subscription_tier] || 0) + 1;
                    return acc;
                }, {});
                
                return { data: stats, error: null };
            });

        if (tierError) throw tierError;

        // Total credits used
        const { data: creditStats, error: creditError } = await UserRepository.supabase
            .from('users')
            .select('credits_used, credits_remaining')
            .then(result => {
                if (result.error) throw result.error;
                
                const totalUsed = result.data.reduce((sum, u) => sum + (u.credits_used || 0), 0);
                const totalRemaining = result.data.reduce((sum, u) => sum + (u.credits_remaining || 0), 0);
                
                return { 
                    data: { totalUsed, totalRemaining, totalAllocated: totalUsed + totalRemaining },
                    error: null 
                };
            });

        if (creditError) throw creditError;

        // Total revenue (from subscriptions table)
        const { data: revenueData, error: revenueError } = await UserRepository.supabase
            .from('subscriptions')
            .select('amount_paid, currency')
            .eq('payment_status', 'completed')
            .then(result => {
                if (result.error) throw result.error;
                
                const revenue = result.data.reduce((acc, sub) => {
                    const currency = sub.currency || 'USD';
                    acc[currency] = (acc[currency] || 0) + parseFloat(sub.amount_paid || 0);
                    return acc;
                }, {});
                
                return { data: revenue, error: null };
            });

        if (revenueError) throw revenueError;

        // Active subscriptions
        const { count: activeCount, error: activeError } = await UserRepository.supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .in('subscription_tier', ['starter', 'pro'])
            .eq('subscription_status', 'active');

        if (activeError) throw activeError;

        return {
            usersByTier: tierStats,
            credits: creditStats,
            revenue: revenueData,
            activeSubscriptions: activeCount,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        logger.error('getPlatformStats failed:', error);
        throw error;
    }
}

/**
 * Manually adjust user credits (for refunds, corrections)
 */
export async function adjustUserCredits(userId, amount, reason, adminEmail) {
    try {
        const user = await UserRepository.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        const type = amount > 0 ? 'credit' : 'debit';
        const absAmount = Math.abs(amount);

        let success;
        if (amount > 0) {
            success = await UserRepository.addCredits(
                userId,
                absAmount,
                'manual',
                `Manual adjustment: ${reason} (by ${adminEmail})`
            );
        } else {
            success = await UserRepository.deductCredits(
                userId,
                absAmount,
                'manual',
                null,
                `Manual adjustment: ${reason} (by ${adminEmail})`
            );
        }

        if (!success) {
            throw new Error('Failed to adjust credits');
        }

        logger.info(`Admin ${adminEmail} adjusted credits for ${user.email} by ${amount}. Reason: ${reason}`);

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email
            },
            adjustment: amount,
            reason
        };
    } catch (error) {
        logger.error('adjustUserCredits failed:', error);
        throw error;
    }
}

export default {
    grantBonusCredits,
    getAllUsers,
    getUserDetails,
    getPlatformStats,
    adjustUserCredits
};
