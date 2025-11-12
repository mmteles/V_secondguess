import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { ApiError } from '../types/api-types';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */
class MemoryRateLimitStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      const entry = this.store[key];
      if (entry && entry.resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const resetTime = now + windowMs;

    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 1,
        resetTime
      };
    } else {
      this.store[key].count++;
    }

    return this.store[key];
  }

  decrement(key: string): void {
    if (this.store[key]) {
      this.store[key].count = Math.max(0, this.store[key].count - 1);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store = {};
  }
}

const defaultStore = new MemoryRateLimitStore();

/**
 * Rate limiting middleware factory
 */
export const rateLimit = (config: RateLimitConfig) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Generate key based on IP and user ID (if authenticated)
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userId = req.user?.id || 'anonymous';
      const key = `${ip}:${userId}`;

      const { count, resetTime } = defaultStore.increment(key, windowMs);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - count).toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString()
      });

      if (count > maxRequests) {
        logger.warn('Rate limit exceeded:', {
          key,
          count,
          maxRequests,
          path: req.path,
          method: req.method,
          userId: req.user?.id
        });

        const apiError: ApiError = {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          details: `Request limit of ${maxRequests} per ${windowMs / 1000} seconds exceeded`,
          timestamp: new Date().toISOString()
        };

        res.status(429).json({ error: apiError });
        return;
      }

      // Handle response to potentially skip counting
      const originalSend = res.send;
      res.send = function(body) {
        const statusCode = res.statusCode;
        const shouldSkip = 
          (skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400);

        if (shouldSkip) {
          // Decrement count if we should skip this request
          defaultStore.decrement(key);
        }

        return originalSend.call(this, body);
      };

      next();

    } catch (error) {
      logger.error('Rate limiter error:', error);
      // Don't fail the request due to rate limiter errors
      next();
    }
  };
};

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later'
  },

  // Strict rate limit for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
  },

  // Rate limit for conversation input (more lenient for real-time interaction)
  conversation: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many conversation requests, please slow down'
  },

  // Rate limit for SOP generation (resource intensive)
  sopGeneration: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
    message: 'Too many SOP generation requests, please wait before generating more SOPs'
  },

  // Rate limit for document exports
  export: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 20,
    message: 'Too many export requests, please wait before exporting more documents'
  }
};

/**
 * Cleanup function for graceful shutdown
 */
export const cleanupRateLimiter = (): void => {
  defaultStore.destroy();
};