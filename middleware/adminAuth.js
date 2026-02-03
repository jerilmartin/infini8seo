import UserRepository from '../models/UserRepository.js';
import logger from '../utils/logger.js';

/**
 * Admin Authentication Middleware
 * Checks if the authenticated user has admin role
 * 
 * SECURITY: Admin role can ONLY be set via Supabase SQL, never through API
 */
export async function requireAdmin(req, res, next) {
    try {
        // First check if user is authenticated
        if (!req.userId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        // Check if user has admin role
        const user = await UserRepository.findById(req.userId);

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found'
            });
        }

        if (user.role !== 'admin') {
            logger.warn(`Non-admin user ${user.email} attempted to access admin endpoint`);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required'
            });
        }

        // User is admin, attach to request
        req.isAdmin = true;
        req.adminUser = user;
        
        logger.info(`Admin ${user.email} accessing admin endpoint: ${req.method} ${req.path}`);
        next();
    } catch (error) {
        logger.error('Admin auth middleware error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to verify admin status'
        });
    }
}

export default requireAdmin;
