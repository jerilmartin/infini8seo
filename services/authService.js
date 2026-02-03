import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { initializeNewUser } from './subscriptionService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'infini8seo-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Initialize Supabase Admin client for auth
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabaseAdmin = null;

export const initAuthClient = () => {
    if (!supabaseUrl || !supabaseServiceKey) {
        logger.warn('Supabase credentials not found for auth');
        return null;
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    return supabaseAdmin;
};

export const getAuthClient = () => {
    if (!supabaseAdmin) {
        initAuthClient();
    }
    return supabaseAdmin;
};

/**
 * Generate JWT token for a user
 */
export const generateToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar: user.user_metadata?.avatar_url,
        provider: user.app_metadata?.provider || 'google'
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Get Google OAuth URL from Supabase
 */
export const getGoogleAuthUrl = async (redirectUrl) => {
    const supabase = getAuthClient();
    if (!supabase) {
        throw new Error('Auth client not initialized');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });

    if (error) {
        logger.error('Error generating OAuth URL:', error);
        throw error;
    }

    return data.url;
};

/**
 * Exchange auth code for session
 */
export const exchangeCodeForSession = async (code) => {
    const supabase = getAuthClient();
    if (!supabase) {
        throw new Error('Auth client not initialized');
    }

    try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            logger.error('Error exchanging code for session:', error);
            throw error;
        }

        // Initialize user profile if new user
        if (data.user) {
            try {
                await initializeNewUser(
                    data.user.id,
                    data.user.email,
                    data.user.user_metadata?.full_name,
                    data.user.user_metadata?.avatar_url
                );
            } catch (initError) {
                logger.warn('User profile initialization failed (may already exist):', initError.message);
            }
        }

        return data;
    } catch (err) {
        logger.error('Exception in exchangeCodeForSession:', err);
        throw err;
    }
};

/**
 * Get user by ID using service role
 */
export const getUserById = async (userId) => {
    const supabase = getAuthClient();
    if (!supabase) {
        throw new Error('Auth client not initialized');
    }

    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
        logger.error('Error getting user by ID:', error);
        throw error;
    }

    return data.user;
};

/**
 * Get user by Supabase access token
 */
export const getUserFromSupabaseToken = async (accessToken) => {
    const supabase = getAuthClient();
    if (!supabase) {
        throw new Error('Auth client not initialized');
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error) {
        throw error;
    }

    return user;
};

/**
 * Auth middleware for Express routes
 */
export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            req.userId = null;
            return next();
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (decoded) {
            req.user = decoded;
            req.userId = decoded.userId;
        } else {
            req.user = null;
            req.userId = null;
        }

        next();
    } catch (error) {
        logger.error('Auth middleware error:', error.message);
        req.user = null;
        req.userId = null;
        next();
    }
};

/**
 * Require auth middleware - returns 401 if not authenticated
 */
export const requireAuth = (req, res, next) => {
    if (!req.user || !req.userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }
    next();
};

export default {
    initAuthClient,
    getAuthClient,
    generateToken,
    verifyToken,
    getGoogleAuthUrl,
    exchangeCodeForSession,
    getUserFromSupabaseToken,
    getUserById,
    authMiddleware,
    requireAuth
};
