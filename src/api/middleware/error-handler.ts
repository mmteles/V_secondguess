import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { ApiError } from '../types/api-types';

/**
 * Global error handling middleware
 * Should be the last middleware in the chain
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Unhandled error in API:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    userId: req.user?.id
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let apiError: ApiError;
  let statusCode = 500;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    apiError = {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: isDevelopment ? error.message : 'Invalid request data',
      timestamp: new Date().toISOString()
    };
    statusCode = 400;
  } else if (error.name === 'UnauthorizedError') {
    apiError = {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      details: isDevelopment ? error.message : 'Access denied',
      timestamp: new Date().toISOString()
    };
    statusCode = 401;
  } else if (error.name === 'ForbiddenError') {
    apiError = {
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
      details: isDevelopment ? error.message : 'Access forbidden',
      timestamp: new Date().toISOString()
    };
    statusCode = 403;
  } else if (error.name === 'NotFoundError') {
    apiError = {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      details: isDevelopment ? error.message : 'The requested resource was not found',
      timestamp: new Date().toISOString()
    };
    statusCode = 404;
  } else if (error.name === 'ConflictError') {
    apiError = {
      code: 'CONFLICT',
      message: 'Resource conflict',
      details: isDevelopment ? error.message : 'The request conflicts with the current state',
      timestamp: new Date().toISOString()
    };
    statusCode = 409;
  } else {
    // Generic internal server error
    apiError = {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: isDevelopment ? error.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };
    statusCode = 500;
  }

  res.status(statusCode).json({ error: apiError });
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const apiError: ApiError = {
    code: 'ROUTE_NOT_FOUND',
    message: 'API endpoint not found',
    details: `The endpoint ${req.method} ${req.path} does not exist`,
    timestamp: new Date().toISOString()
  };
  
  logger.warn('API route not found:', {
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id
  });
  
  res.status(404).json({ error: apiError });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}