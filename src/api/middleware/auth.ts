import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { AuthenticatedUser, ApiError } from '../types/api-types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT tokens and sets user context
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error: ApiError = {
        code: 'MISSING_AUTH_TOKEN',
        message: 'Authorization token is required',
        timestamp: new Date().toISOString()
      };
      res.status(401).json({ error });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // TODO: Implement actual JWT validation
    // For now, we'll use a simple mock validation
    if (token === 'mock-valid-token') {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'user@example.com',
        roles: ['user']
      };
      
      req.user = user;
      logger.debug('User authenticated successfully', { userId: user.id });
      next();
    } else {
      const error: ApiError = {
        code: 'INVALID_AUTH_TOKEN',
        message: 'Invalid or expired authorization token',
        timestamp: new Date().toISOString()
      };
      res.status(401).json({ error });
    }
    
  } catch (error) {
    logger.error('Authentication error:', error);
    const apiError: ApiError = {
      code: 'AUTH_ERROR',
      message: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json({ error: apiError });
  }
};

/**
 * Authorization middleware factory
 * Checks if user has required roles
 */
export const requireRoles = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error: ApiError = {
        code: 'USER_NOT_AUTHENTICATED',
        message: 'User must be authenticated',
        timestamp: new Date().toISOString()
      };
      res.status(401).json({ error });
      return;
    }
    
    const hasRequiredRole = requiredRoles.some(role => req.user!.roles.includes(role));
    
    if (!hasRequiredRole) {
      const error: ApiError = {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'User does not have required permissions',
        details: `Required roles: ${requiredRoles.join(', ')}`,
        timestamp: new Date().toISOString()
      };
      res.status(403).json({ error });
      return;
    }
    
    next();
  };
};

/**
 * Optional authentication middleware
 * Sets user context if token is provided, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // TODO: Implement actual JWT validation
      if (token === 'mock-valid-token') {
        const user: AuthenticatedUser = {
          id: 'user-123',
          email: 'user@example.com',
          roles: ['user']
        };
        
        req.user = user;
        logger.debug('User authenticated successfully (optional)', { userId: user.id });
      }
    }
    
    next();
    
  } catch (error) {
    logger.error('Optional authentication error:', error);
    // Don't fail the request for optional auth errors
    next();
  }
};