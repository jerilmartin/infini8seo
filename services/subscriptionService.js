import UserRepository from '../models/UserRepository.js';
import logger from '../utils/logger.js';

/**
 * Subscription Service - Handles subscription logic and credit management
 */

/**
 * Initialize new user with free tier
 */
export async function initializeNewUser(userId, email, fullName = null, avatarUrl = null) {
    try {
        const user = await UserRepository.upsert({
            id: userId,
            email,
            full_name: fullName,
            avatar_url: avatarUrl
        });

        logger.info(`Initialized new user: ${email} with 10 free credits`);
        return user;
    } catch (error) {
        logger.error('Failed to initialize new user:', error);
        throw error;
    }
}

/**
 * Check if user can perform action (has enough credits)
 */
export async function canPerformAction(userId, actionType, actionParams = {}) {
    try {
        const user = await UserRepository.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        let requiredCredits = 0;

        if (actionType === 'blog_generation') {
            const blogCount = actionParams.totalBlogs || 0;
            requiredCredits = UserRepository.calculateBlogCredits(blogCount);
            
            // Check credits first - if user has enough credits, allow regardless of tier
            const hasEnoughCredits = user.credits_remaining >= requiredCredits;
            
            if (!hasEnoughCredits) {
                return {
                    allowed: false,
                    reason: 'Insufficient credits. Purchase more credits or upgrade your plan.',
                    requiredCredits,
                    availableCredits: user.credits_remaining,
                    subscriptionTier: user.subscription_tier
                };
            }
            
            // Only enforce tier limits if user doesn't have enough credits
            // Free tier can only generate max 2 blogs (unless they have bonus credits)
            if (user.subscription_tier === 'free' && blogCount > 2 && user.credits_remaining <= 10) {
                return {
                    allowed: false,
                    reason: 'Free tier limited to 2 blogs. Upgrade to Starter ($9) for more.',
                    requiredCredits,
                    availableCredits: user.credits_remaining,
                    subscriptionTier: user.subscription_tier
                };
            }

            return {
                allowed: true,
                reason: null,
                requiredCredits,
                availableCredits: user.credits_remaining,
                subscriptionTier: user.subscription_tier
            };
        } else if (actionType === 'seo_scan') {
            requiredCredits = 20;
            
            // Check credits first
            const hasEnoughCredits = user.credits_remaining >= requiredCredits;
            
            if (!hasEnoughCredits) {
                return {
                    allowed: false,
                    reason: 'Insufficient credits. Purchase more credits or upgrade your plan.',
                    requiredCredits,
                    availableCredits: user.credits_remaining,
                    subscriptionTier: user.subscription_tier
                };
            }
            
            // Free tier cannot use SEO scans (unless they have bonus credits)
            if (user.subscription_tier === 'free' && user.credits_remaining <= 10) {
                return {
                    allowed: false,
                    reason: 'Site insights not available on free tier. Upgrade to Starter ($9).',
                    requiredCredits,
                    availableCredits: user.credits_remaining,
                    subscriptionTier: user.subscription_tier
                };
            }

            return {
                allowed: true,
                reason: null,
                requiredCredits,
                availableCredits: user.credits_remaining,
                subscriptionTier: user.subscription_tier
            };
        }

        return {
            allowed: false,
            reason: 'Invalid action type',
            requiredCredits: 0,
            availableCredits: user.credits_remaining,
            subscriptionTier: user.subscription_tier
        };
    } catch (error) {
        logger.error('canPerformAction failed:', error);
        throw error;
    }
}

/**
 * Deduct credits for an action
 */
export async function deductCreditsForAction(userId, actionType, actionParams = {}) {
    try {
        let amount = 0;
        let description = '';
        let entityType = '';
        let entityId = actionParams.entityId || null;

        if (actionType === 'blog_generation') {
            const blogCount = actionParams.totalBlogs || 0;
            amount = UserRepository.calculateBlogCredits(blogCount);
            description = `Generated ${blogCount} blog posts`;
            entityType = 'job';
        } else if (actionType === 'seo_scan') {
            amount = 20;
            description = `Site insight analysis for ${actionParams.url || 'website'}`;
            entityType = 'seo_scan';
        }

        const success = await UserRepository.deductCredits(
            userId,
            amount,
            entityType,
            entityId,
            description
        );

        if (!success) {
            throw new Error('Failed to deduct credits');
        }

        return {
            success: true,
            creditsDeducted: amount,
            description
        };
    } catch (error) {
        logger.error('deductCreditsForAction failed:', error);
        throw error;
    }
}

/**
 * Upgrade user subscription
 */
export async function upgradeSubscription(userId, tier, paymentData) {
    try {
        const tierDetails = UserRepository.getSubscriptionTierDetails(tier);
        
        if (!tierDetails || tier === 'free') {
            throw new Error('Invalid subscription tier');
        }

        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

        // Update user subscription
        const user = await UserRepository.updateSubscription(userId, {
            tier,
            status: 'active',
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            credits_granted: tierDetails.credits
        });

        // Create subscription record
        await UserRepository.createSubscription({
            user_id: userId,
            tier,
            status: 'active',
            amount_paid: tierDetails.price,
            currency: tierDetails.currency,
            credits_granted: tierDetails.credits,
            payment_provider: paymentData.provider || 'stripe',
            payment_id: paymentData.payment_id || null,
            payment_status: 'completed',
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            metadata: paymentData.metadata || {}
        });

        // Update payment info if provided
        if (paymentData.customer_id || paymentData.last4) {
            await UserRepository.updatePaymentInfo(userId, {
                stripe_customer_id: paymentData.provider === 'stripe' ? paymentData.customer_id : null,
                razorpay_customer_id: paymentData.provider === 'razorpay' ? paymentData.customer_id : null,
                last4: paymentData.last4 || null,
                brand: paymentData.brand || null
            });
        }

        logger.info(`User ${userId} upgraded to ${tier} tier`);

        return {
            success: true,
            user,
            tier: tierDetails
        };
    } catch (error) {
        logger.error('upgradeSubscription failed:', error);
        throw error;
    }
}

/**
 * Cancel subscription (user keeps credits until expiry)
 */
export async function cancelSubscription(userId) {
    try {
        const user = await UserRepository.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        if (user.subscription_tier === 'free') {
            throw new Error('No active subscription to cancel');
        }

        // Update subscription status to cancelled
        const { data, error } = await UserRepository.supabase
            .from('users')
            .update({
                subscription_status: 'cancelled',
                subscription_cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        logger.info(`User ${userId} cancelled subscription. Credits valid until ${user.subscription_expires_at}`);

        return {
            success: true,
            message: 'Subscription cancelled. You can continue using your credits until the end of the billing period.',
            expiresAt: user.subscription_expires_at
        };
    } catch (error) {
        logger.error('cancelSubscription failed:', error);
        throw error;
    }
}

/**
 * Get user subscription status
 */
export async function getSubscriptionStatus(userId) {
    try {
        const user = await UserRepository.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        const tierDetails = UserRepository.getSubscriptionTierDetails(user.subscription_tier);
        
        // Check if subscription expired
        let isExpired = false;
        if (user.subscription_expires_at) {
            isExpired = new Date(user.subscription_expires_at) < new Date();
        }

        return {
            tier: user.subscription_tier,
            status: isExpired ? 'expired' : user.subscription_status,
            creditsRemaining: user.credits_remaining,
            creditsTotal: user.credits_total,
            creditsUsed: user.credits_used,
            expiresAt: user.subscription_expires_at,
            cancelledAt: user.subscription_cancelled_at,
            tierDetails,
            isExpired
        };
    } catch (error) {
        logger.error('getSubscriptionStatus failed:', error);
        throw error;
    }
}

/**
 * Get pricing plans
 */
export function getPricingPlans() {
    return {
        free: {
            name: 'Free',
            price: 0,
            currency: 'USD',
            credits: 10,
            features: [
                '2 blogs (test quality)',
                'No site insights',
                'AIO-optimized content',
                'Markdown export'
            ],
            limitations: [
                'Max 2 blogs per job',
                'No site analysis'
            ]
        },
        starter: {
            name: 'Starter',
            price: 9,
            priceINR: 750,
            currency: 'USD',
            credits: 120,
            features: [
                '20 blogs + 1 site insight',
                'OR 40 blogs total',
                'OR 6 site insights',
                'Full AIO optimization',
                'Keyword highlighting',
                'Unsplash images',
                'Comprehensive SEO reports'
            ],
            bestFor: 'Bloggers & freelancers',
            popular: true
        },
        pro: {
            name: 'Pro',
            price: 19,
            priceINR: 1600,
            currency: 'USD',
            credits: 400,
            features: [
                '60 blogs + 5 site insights',
                'OR 120 blogs total',
                'OR 20 site insights',
                'Everything in Starter',
                'Bulk generation',
                'Priority processing',
                'Advanced SEO insights'
            ],
            bestFor: 'Agencies & power users'
        }
    };
}

/**
 * Calculate credit cost preview
 */
export function calculateCreditCost(actionType, params = {}) {
    if (actionType === 'blog_generation') {
        const blogCount = params.totalBlogs || 0;
        return {
            type: 'blog_generation',
            quantity: blogCount,
            credits: UserRepository.calculateBlogCredits(blogCount),
            breakdown: blogCount <= 10 
                ? `${blogCount} blogs × 5 credits = ${blogCount * 5} credits`
                : blogCount <= 30
                ? `${blogCount} blogs × 4 credits = ${blogCount * 4} credits`
                : `${blogCount} blogs × 3 credits = ${blogCount * 3} credits`
        };
    } else if (actionType === 'seo_scan') {
        return {
            type: 'seo_scan',
            quantity: 1,
            credits: 20,
            breakdown: '1 site insight = 20 credits'
        };
    }

    return null;
}

export default {
    initializeNewUser,
    canPerformAction,
    deductCreditsForAction,
    upgradeSubscription,
    cancelSubscription,
    getSubscriptionStatus,
    getPricingPlans,
    calculateCreditCost
};
