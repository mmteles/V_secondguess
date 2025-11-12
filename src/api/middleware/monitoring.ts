import { Request, Response, NextFunction } from 'express';
import { systemMonitor } from '../../utils/system-monitor';
import { logger, logRequest, logPerformance } from '../../utils/logger';

// Extend Request interface to include monitoring data
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      requestId?: string;
    }
  }
}

/**
 * Request tracking middleware
 * Tracks all incoming requests for monitoring and analytics
 */
export function requestTrackingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  req.requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();

  // Track the request
  systemMonitor.trackRequest();

  // Log request start
  logger.debug('Request started', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - (req.startTime || Date.now());
    const userId = (req as any).user?.id;

    // Log request completion
    logRequest(req.method, req.url, res.statusCode, duration, userId);

    // Log performance metric
    logPerformance(`${req.method} ${req.route?.path || req.url}`, duration, {
      requestId: req.requestId,
      statusCode: res.statusCode,
      userId
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}

/**
 * Error tracking middleware
 * Captures and logs errors for monitoring
 */
export function errorTrackingMiddleware(error: Error, req: Request, res: Response, next: NextFunction): void {
  const duration = Date.now() - (req.startTime || Date.now());
  const userId = (req as any).user?.id;

  // Log error with context
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode || 500,
    duration,
    userId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });

  // Track error in performance metrics
  logPerformance(`${req.method} ${req.route?.path || req.url}`, duration, {
    requestId: req.requestId,
    statusCode: res.statusCode || 500,
    userId,
    error: true
  });

  next(error);
}

/**
 * Session tracking middleware
 * Tracks session lifecycle for monitoring
 */
export function sessionTrackingMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Track session creation
  if (req.method === 'POST' && req.url.includes('/sessions')) {
    const originalSend = res.send;
    
    res.send = function(body: any) {
      if (res.statusCode === 201 && body) {
        try {
          const responseData = typeof body === 'string' ? JSON.parse(body) : body;
          if (responseData.sessionId) {
            systemMonitor.trackSession(responseData.sessionId, 'start');
            
            logger.info('Session created', {
              sessionId: responseData.sessionId,
              userId: responseData.userId,
              requestId: req.requestId
            });
          }
        } catch (error) {
          logger.warn('Failed to parse session creation response', { 
            error: (error as Error).message,
            requestId: req.requestId
          });
        }
      }
      
      return originalSend.call(this, body);
    };
  }

  // Track session deletion
  if (req.method === 'DELETE' && req.url.includes('/sessions/')) {
    const sessionId = req.params.sessionId || req.url.split('/sessions/')[1];
    
    if (sessionId) {
      const originalSend = res.send;
      
      res.send = function(body: any) {
        if (res.statusCode === 204) {
          systemMonitor.trackSession(sessionId, 'end');
          
          logger.info('Session ended', {
            sessionId,
            requestId: req.requestId
          });
        }
        
        return originalSend.call(this, body);
      };
    }
  }

  next();
}

/**
 * Health check middleware
 * Provides basic health information in response headers
 */
export function healthHeaderMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Add health information to response headers
  res.set({
    'X-Service-Status': 'operational',
    'X-Request-ID': req.requestId || 'unknown',
    'X-Response-Time': '0' // Will be updated by response middleware
  });

  // Update response time header when response is sent
  const originalSend = res.send;
  
  res.send = function(body: any) {
    const responseTime = Date.now() - (req.startTime || Date.now());
    res.set('X-Response-Time', responseTime.toString());
    
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Rate limiting monitoring middleware
 * Tracks rate limiting events for monitoring
 */
export function rateLimitMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if request was rate limited
  const originalStatus = res.status;
  
  res.status = function(code: number) {
    if (code === 429) {
      logger.warn('Rate limit exceeded', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    return originalStatus.call(this, code);
  };

  next();
}

/**
 * Service call monitoring middleware
 * Tracks service calls made during request processing
 */
export function serviceCallMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Store request context for service calls
  (req as any).monitoringContext = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    startTime: req.startTime
  };

  next();
}

/**
 * Memory monitoring middleware
 * Tracks memory usage during request processing
 */
export function memoryMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const initialMemory = process.memoryUsage();
  
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const finalMemory = process.memoryUsage();
    const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
    
    if (memoryDelta > 1024 * 1024) { // Log if memory increased by more than 1MB
      logger.debug('High memory usage during request', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        memoryDelta,
        initialMemory: initialMemory.heapUsed,
        finalMemory: finalMemory.heapUsed
      });
    }
    
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}

/**
 * Comprehensive monitoring middleware
 * Combines multiple monitoring aspects
 */
export function comprehensiveMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  requestTrackingMiddleware(req, res, () => {
    sessionTrackingMiddleware(req, res, () => {
      healthHeaderMiddleware(req, res, () => {
        rateLimitMonitoringMiddleware(req, res, () => {
          serviceCallMonitoringMiddleware(req, res, () => {
            memoryMonitoringMiddleware(req, res, next);
          });
        });
      });
    });
  });
}

/**
 * Monitoring middleware for specific routes
 */
export function routeSpecificMonitoring(routeName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    const originalSend = res.send;
    
    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      
      logPerformance(`route:${routeName}`, duration, {
        requestId: req.requestId,
        statusCode: res.statusCode,
        method: req.method,
        routeName
      });
      
      return originalSend.call(this, body);
    };

    next();
  };
}