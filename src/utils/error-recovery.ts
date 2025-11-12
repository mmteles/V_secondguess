import { logger } from './logger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface FallbackConfig<T> {
  fallbackFunction: () => Promise<T>;
  fallbackOnErrors?: string[];
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryMechanism {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts || 3,
      baseDelay: config.baseDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      backoffMultiplier: config.backoffMultiplier || 2,
      retryableErrors: config.retryableErrors || [
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'NETWORK_ERROR',
        'SERVICE_UNAVAILABLE'
      ]
    };
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...customConfig };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        logger.debug('Executing operation with retry', {
          operationName,
          attempt,
          maxAttempts: config.maxAttempts
        });

        const result = await operation();
        
        if (attempt > 1) {
          logger.info('Operation succeeded after retry', {
            operationName,
            attempt,
            totalAttempts: attempt
          });
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        
        logger.warn('Operation failed', {
          operationName,
          attempt,
          maxAttempts: config.maxAttempts,
          error: lastError.message,
          errorCode: (lastError as any).code
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError, config.retryableErrors)) {
          logger.info('Error is not retryable, failing immediately', {
            operationName,
            error: lastError.message,
            errorCode: (lastError as any).code
          });
          throw lastError;
        }

        // Don't delay after the last attempt
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt, config);
          
          logger.debug('Waiting before retry', {
            operationName,
            attempt,
            delay
          });

          await this.sleep(delay);
        }
      }
    }

    logger.error('Operation failed after all retry attempts', {
      operationName,
      totalAttempts: config.maxAttempts,
      finalError: lastError!.message
    });

    throw lastError!;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, retryableErrors?: string[]): boolean {
    if (!retryableErrors) return true;

    const errorCode = (error as any).code;
    const errorMessage = error.message.toUpperCase();

    return retryableErrors.some(retryableError => 
      errorCode === retryableError || 
      errorMessage.includes(retryableError.toUpperCase())
    );
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime?: Date;
  private successCount = 0;

  constructor(private name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod || 300000 // 5 minutes
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        
        logger.info('Circuit breaker transitioning to HALF_OPEN', {
          circuitBreaker: this.name
        });
      } else {
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        (error as any).code = 'CIRCUIT_BREAKER_OPEN';
        throw error;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      // If we've had enough successes, close the circuit
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
        this.successCount = 0;
        
        logger.info('Circuit breaker closed after successful recovery', {
          circuitBreaker: this.name
        });
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'HALF_OPEN') {
      // If we fail in half-open state, go back to open
      this.state = 'OPEN';
      
      logger.warn('Circuit breaker reopened after failure in HALF_OPEN state', {
        circuitBreaker: this.name
      });
      
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Open the circuit if we've exceeded the failure threshold
      this.state = 'OPEN';
      
      logger.error('Circuit breaker opened due to failure threshold exceeded', {
        circuitBreaker: this.name,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold
      });
    }
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  /**
   * Get current circuit breaker state
   */
  getState(): { state: string; failureCount: number; lastFailureTime?: Date } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    
    logger.info('Circuit breaker manually reset', {
      circuitBreaker: this.name
    });
  }
}

/**
 * Fallback mechanism
 */
export class FallbackMechanism<T> {
  constructor(private config: FallbackConfig<T>) {}

  /**
   * Execute operation with fallback
   */
  async execute(
    primaryOperation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await primaryOperation();
      
    } catch (error) {
      const shouldUseFallback = this.shouldUseFallback(error as Error);
      
      if (shouldUseFallback) {
        logger.warn('Primary operation failed, using fallback', {
          operationName,
          error: (error as Error).message,
          errorCode: (error as any).code
        });

        try {
          const fallbackResult = await this.config.fallbackFunction();
          
          logger.info('Fallback operation succeeded', {
            operationName
          });

          return fallbackResult;

        } catch (fallbackError) {
          logger.error('Fallback operation also failed', {
            operationName,
            primaryError: (error as Error).message,
            fallbackError: (fallbackError as Error).message
          });

          // Throw the original error, not the fallback error
          throw error;
        }
      } else {
        logger.debug('Error not eligible for fallback', {
          operationName,
          error: (error as Error).message,
          errorCode: (error as any).code
        });

        throw error;
      }
    }
  }

  /**
   * Check if error should trigger fallback
   */
  private shouldUseFallback(error: Error): boolean {
    if (!this.config.fallbackOnErrors) return true;

    const errorCode = (error as any).code;
    const errorMessage = error.message.toUpperCase();

    return this.config.fallbackOnErrors.some(fallbackError => 
      errorCode === fallbackError || 
      errorMessage.includes(fallbackError.toUpperCase())
    );
  }
}

/**
 * Combined error recovery utility
 */
export class ErrorRecovery {
  private retryMechanism: RetryMechanism;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private fallbacks = new Map<string, FallbackMechanism<any>>();

  constructor(defaultRetryConfig?: Partial<RetryConfig>) {
    this.retryMechanism = new RetryMechanism(defaultRetryConfig);
  }

  /**
   * Execute operation with full error recovery (retry + circuit breaker + fallback)
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      retry?: Partial<RetryConfig>;
      circuitBreaker?: { name: string; config?: Partial<CircuitBreakerConfig> };
      fallback?: FallbackConfig<T>;
    } = {}
  ): Promise<T> {
    let wrappedOperation = operation;

    // Wrap with circuit breaker if specified
    if (options.circuitBreaker) {
      const circuitBreaker = this.getOrCreateCircuitBreaker(
        options.circuitBreaker.name,
        options.circuitBreaker.config
      );
      
      wrappedOperation = () => circuitBreaker.execute(operation);
    }

    // Wrap with fallback if specified
    if (options.fallback) {
      const fallbackMechanism = new FallbackMechanism(options.fallback);
      const currentOperation = wrappedOperation;
      wrappedOperation = () => fallbackMechanism.execute(currentOperation, operationName);
    }

    // Execute with retry
    return this.retryMechanism.execute(wrappedOperation, operationName, options.retry);
  }

  /**
   * Get or create circuit breaker
   */
  private getOrCreateCircuitBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    let circuitBreaker = this.circuitBreakers.get(name);
    
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker(name, config);
      this.circuitBreakers.set(name, circuitBreaker);
    }
    
    return circuitBreaker;
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(name: string) {
    const circuitBreaker = this.circuitBreakers.get(name);
    return circuitBreaker ? circuitBreaker.getState() : null;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(name: string): void {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (circuitBreaker) {
      circuitBreaker.reset();
    }
  }

  /**
   * Get all circuit breaker states
   */
  getAllCircuitBreakerStates(): Record<string, any> {
    const states: Record<string, any> = {};
    
    for (const [name, circuitBreaker] of this.circuitBreakers.entries()) {
      states[name] = circuitBreaker.getState();
    }
    
    return states;
  }
}

// Export singleton instance
export const errorRecovery = new ErrorRecovery();