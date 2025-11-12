import { logger } from './logger';

export interface ServiceCall {
  serviceName: string;
  methodName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}

export interface ServiceMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  lastCall?: Date;
  errorRate: number;
}

/**
 * Service monitoring utility
 * Tracks service calls, performance metrics, and error rates
 */
export class ServiceMonitor {
  private activeCalls = new Map<string, ServiceCall>();
  private callHistory: ServiceCall[] = [];
  private metrics = new Map<string, ServiceMetrics>();
  private maxHistorySize = 1000;

  /**
   * Start monitoring a service call
   */
  startCall(serviceName: string, methodName: string, metadata?: Record<string, any>): string {
    const callId = `${serviceName}.${methodName}.${Date.now()}.${Math.random()}`;
    
    const serviceCall: ServiceCall = {
      serviceName,
      methodName,
      startTime: Date.now(),
      ...(metadata && { metadata })
    };

    this.activeCalls.set(callId, serviceCall);

    logger.debug('Service call started', {
      callId,
      serviceName,
      methodName,
      metadata
    });

    return callId;
  }

  /**
   * End monitoring a service call with success
   */
  endCall(callId: string, result?: any): void {
    const serviceCall = this.activeCalls.get(callId);
    
    if (!serviceCall) {
      logger.warn('Attempted to end unknown service call', { callId });
      return;
    }

    serviceCall.endTime = Date.now();
    serviceCall.duration = serviceCall.endTime - serviceCall.startTime;
    serviceCall.success = true;

    this.completeCall(callId, serviceCall);

    logger.debug('Service call completed successfully', {
      callId,
      serviceName: serviceCall.serviceName,
      methodName: serviceCall.methodName,
      duration: serviceCall.duration,
      result: result ? 'present' : 'none'
    });
  }

  /**
   * End monitoring a service call with error
   */
  endCallWithError(callId: string, error: Error): void {
    const serviceCall = this.activeCalls.get(callId);
    
    if (!serviceCall) {
      logger.warn('Attempted to end unknown service call with error', { callId, error: error.message });
      return;
    }

    serviceCall.endTime = Date.now();
    serviceCall.duration = serviceCall.endTime - serviceCall.startTime;
    serviceCall.success = false;
    serviceCall.error = error;

    this.completeCall(callId, serviceCall);

    logger.error('Service call failed', {
      callId,
      serviceName: serviceCall.serviceName,
      methodName: serviceCall.methodName,
      duration: serviceCall.duration,
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * Complete a service call and update metrics
   */
  private completeCall(callId: string, serviceCall: ServiceCall): void {
    // Remove from active calls
    this.activeCalls.delete(callId);

    // Add to history
    this.callHistory.push(serviceCall);

    // Trim history if needed
    if (this.callHistory.length > this.maxHistorySize) {
      this.callHistory = this.callHistory.slice(-this.maxHistorySize);
    }

    // Update metrics
    this.updateMetrics(serviceCall);
  }

  /**
   * Update service metrics
   */
  private updateMetrics(serviceCall: ServiceCall): void {
    const serviceKey = `${serviceCall.serviceName}.${serviceCall.methodName}`;
    
    let metrics = this.metrics.get(serviceKey);
    
    if (!metrics) {
      metrics = {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        errorRate: 0
      };
    }

    metrics.totalCalls++;
    metrics.lastCall = new Date();

    if (serviceCall.success) {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }

    // Update average response time
    if (serviceCall.duration) {
      metrics.averageResponseTime = 
        (metrics.averageResponseTime * (metrics.totalCalls - 1) + serviceCall.duration) / metrics.totalCalls;
    }

    // Update error rate
    metrics.errorRate = metrics.failedCalls / metrics.totalCalls;

    this.metrics.set(serviceKey, metrics);
  }

  /**
   * Get metrics for a specific service method
   */
  getServiceMetrics(serviceName: string, methodName?: string): ServiceMetrics | Map<string, ServiceMetrics> {
    if (methodName) {
      const serviceKey = `${serviceName}.${methodName}`;
      return this.metrics.get(serviceKey) || {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        errorRate: 0
      };
    }

    // Return all metrics for the service
    const serviceMetrics = new Map<string, ServiceMetrics>();
    
    for (const [key, metrics] of this.metrics.entries()) {
      if (key.startsWith(`${serviceName}.`)) {
        const methodName = key.substring(serviceName.length + 1);
        serviceMetrics.set(methodName, metrics);
      }
    }

    return serviceMetrics;
  }

  /**
   * Get all service metrics
   */
  getAllMetrics(): Map<string, ServiceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get active calls
   */
  getActiveCalls(): ServiceCall[] {
    return Array.from(this.activeCalls.values());
  }

  /**
   * Get call history
   */
  getCallHistory(limit?: number): ServiceCall[] {
    if (limit) {
      return this.callHistory.slice(-limit);
    }
    return [...this.callHistory];
  }

  /**
   * Get service health summary
   */
  getHealthSummary(): {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    activeCalls: number;
  } {
    const serviceNames = new Set<string>();
    let healthyServices = 0;
    let degradedServices = 0;
    let unhealthyServices = 0;

    for (const [key, metrics] of this.metrics.entries()) {
      const keyServiceName = key.split('.')[0];
      if (keyServiceName) {
        serviceNames.add(keyServiceName);
      }

      // Determine service health based on error rate and recent activity
      const recentActivity = metrics.lastCall && 
        (Date.now() - metrics.lastCall.getTime()) < 5 * 60 * 1000; // 5 minutes

      if (!recentActivity) {
        // No recent activity - could be healthy if no errors, or unknown
        continue;
      }

      if (metrics.errorRate === 0) {
        healthyServices++;
      } else if (metrics.errorRate < 0.1) { // Less than 10% error rate
        degradedServices++;
      } else {
        unhealthyServices++;
      }
    }

    return {
      totalServices: serviceNames.size,
      healthyServices,
      degradedServices,
      unhealthyServices,
      activeCalls: this.activeCalls.size
    };
  }

  /**
   * Clear all metrics and history
   */
  reset(): void {
    this.activeCalls.clear();
    this.callHistory = [];
    this.metrics.clear();
    
    logger.info('Service monitor reset completed');
  }
}

/**
 * Service call decorator
 * Automatically monitors service method calls
 */
export function monitorServiceCall(serviceName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const callId = serviceMonitor.startCall(serviceName, propertyName, {
        argsCount: args.length,
        timestamp: new Date().toISOString()
      });

      try {
        const result = await method.apply(this, args);
        serviceMonitor.endCall(callId, result);
        return result;
      } catch (error) {
        serviceMonitor.endCallWithError(callId, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

// Export singleton instance
export const serviceMonitor = new ServiceMonitor();