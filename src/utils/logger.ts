import winston from 'winston';
import { getConfig } from './config';

/**
 * Logger utility for the AI Voice SOP Agent
 */

const config = getConfig();

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(logColors);

// Create logger transports
const transports: winston.transport[] = [];

// Console transport
if (config.logging.console.enabled) {
  transports.push(
    new winston.transports.Console({
      level: config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        config.logging.console.colorize ? winston.format.colorize() : winston.format.uncolorize(),
        config.logging.format === 'json' 
          ? winston.format.json()
          : winston.format.simple()
      )
    })
  );
}

// File transport
if (config.logging.file.enabled) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.file.path,
      level: config.logging.level,
      maxsize: parseSize(config.logging.file.maxSize),
      maxFiles: config.logging.file.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  levels: logLevels,
  level: config.logging.level,
  transports,
  exitOnError: false
});

/**
 * Parse size string to bytes
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    k: 1024,
    m: 1024 * 1024,
    g: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+)([bkmg]?)$/);
  if (!match) {
    return 10 * 1024 * 1024; // Default 10MB
  }

  const value = parseInt(match[1] || '10');
  const unit = match[2] || 'b';
  
  return value * (units[unit] || 1);
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, any>): winston.Logger {
  return logger.child(context);
}

/**
 * Log performance metrics
 */
export function logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
  logger.info('Performance metric', {
    operation,
    duration,
    unit: 'ms',
    ...metadata
  });
}

/**
 * Log API requests
 */
export function logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
  logger.info('API Request', {
    method,
    url,
    statusCode,
    duration,
    userId,
    type: 'api_request'
  });
}

/**
 * Log conversation events
 */
export function logConversation(sessionId: string, event: string, metadata?: Record<string, any>): void {
  logger.info('Conversation event', {
    sessionId,
    event,
    type: 'conversation',
    ...metadata
  });
}

/**
 * Log SOP generation events
 */
export function logSOPGeneration(sopId: string, event: string, metadata?: Record<string, any>): void {
  logger.info('SOP generation event', {
    sopId,
    event,
    type: 'sop_generation',
    ...metadata
  });
}

/**
 * Log audio processing events
 */
export function logAudioProcessing(sessionId: string, event: string, metadata?: Record<string, any>): void {
  logger.info('Audio processing event', {
    sessionId,
    event,
    type: 'audio_processing',
    ...metadata
  });
}

/**
 * Log validation events
 */
export function logValidation(entityType: string, entityId: string, result: boolean, errors?: string[]): void {
  logger.info('Validation event', {
    entityType,
    entityId,
    result,
    errors,
    type: 'validation'
  });
}

/**
 * Log security events
 */
export function logSecurity(event: string, userId?: string, metadata?: Record<string, any>): void {
  logger.warn('Security event', {
    event,
    userId,
    type: 'security',
    ...metadata
  });
}

/**
 * Log errors with context
 */
export function logError(error: Error, context?: Record<string, any>): void {
  logger.error('Application error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    type: 'error',
    ...context
  });
}

/**
 * Log system startup events
 */
export function logSystemStartup(component: string, metadata?: Record<string, any>): void {
  logger.info('System component started', {
    component,
    type: 'system_startup',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log system shutdown events
 */
export function logSystemShutdown(component: string, metadata?: Record<string, any>): void {
  logger.info('System component shutdown', {
    component,
    type: 'system_shutdown',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log configuration changes
 */
export function logConfigChange(component: string, changes: Record<string, any>, userId?: string): void {
  logger.info('Configuration changed', {
    component,
    changes,
    userId,
    type: 'config_change',
    timestamp: new Date().toISOString()
  });
}

/**
 * Log resource usage
 */
export function logResourceUsage(resource: string, usage: number, threshold?: number, metadata?: Record<string, any>): void {
  const level = threshold && usage > threshold ? 'warn' : 'info';
  
  logger.log(level, 'Resource usage', {
    resource,
    usage,
    threshold,
    type: 'resource_usage',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log business events
 */
export function logBusinessEvent(event: string, entityId: string, entityType: string, metadata?: Record<string, any>): void {
  logger.info('Business event', {
    event,
    entityId,
    entityType,
    type: 'business_event',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log integration events
 */
export function logIntegration(service: string, operation: string, success: boolean, duration?: number, metadata?: Record<string, any>): void {
  const level = success ? 'info' : 'error';
  
  logger.log(level, 'External integration', {
    service,
    operation,
    success,
    duration,
    type: 'integration',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log data processing events
 */
export function logDataProcessing(operation: string, recordCount: number, duration: number, metadata?: Record<string, any>): void {
  logger.info('Data processing', {
    operation,
    recordCount,
    duration,
    type: 'data_processing',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log cache events
 */
export function logCache(operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear', key: string, metadata?: Record<string, any>): void {
  logger.debug('Cache operation', {
    operation,
    key,
    type: 'cache',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log file operations
 */
export function logFileOperation(operation: string, filePath: string, success: boolean, size?: number, metadata?: Record<string, any>): void {
  const level = success ? 'info' : 'error';
  
  logger.log(level, 'File operation', {
    operation,
    filePath,
    success,
    size,
    type: 'file_operation',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log database operations
 */
export function logDatabase(operation: string, table: string, duration: number, recordCount?: number, metadata?: Record<string, any>): void {
  logger.info('Database operation', {
    operation,
    table,
    duration,
    recordCount,
    type: 'database',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Create structured logger for specific components
 */
export function createComponentLogger(componentName: string): winston.Logger {
  return createChildLogger({ component: componentName });
}

/**
 * Log critical system failures
 */
export function logCriticalFailure(
  failureType: string, 
  component: string, 
  description: string, 
  metadata?: Record<string, any>
): void {
  logger.error('Critical system failure', {
    failureType,
    component,
    description,
    type: 'critical_failure',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log system health status changes
 */
export function logHealthStatusChange(
  component: string, 
  previousStatus: string, 
  currentStatus: string, 
  metadata?: Record<string, any>
): void {
  const level = currentStatus === 'unhealthy' ? 'error' : 
               currentStatus === 'degraded' ? 'warn' : 'info';
  
  logger.log(level, 'Health status changed', {
    component,
    previousStatus,
    currentStatus,
    type: 'health_status_change',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log monitoring dashboard events
 */
export function logDashboardEvent(event: string, metadata?: Record<string, any>): void {
  logger.info('Dashboard event', {
    event,
    type: 'dashboard_event',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log alert lifecycle events
 */
export function logAlertLifecycle(
  alertId: string, 
  event: 'created' | 'escalated' | 'resolved' | 'acknowledged', 
  metadata?: Record<string, any>
): void {
  const level = event === 'created' ? 'warn' : 'info';
  
  logger.log(level, 'Alert lifecycle event', {
    alertId,
    event,
    type: 'alert_lifecycle',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log service dependency failures
 */
export function logServiceDependencyFailure(
  service: string, 
  dependency: string, 
  failureReason: string, 
  metadata?: Record<string, any>
): void {
  logger.error('Service dependency failure', {
    service,
    dependency,
    failureReason,
    type: 'dependency_failure',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * Log system recovery events
 */
export function logSystemRecovery(
  component: string, 
  recoveryAction: string, 
  success: boolean, 
  metadata?: Record<string, any>
): void {
  const level = success ? 'info' : 'error';
  
  logger.log(level, 'System recovery attempt', {
    component,
    recoveryAction,
    success,
    type: 'system_recovery',
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

// Export default logger
export default logger;