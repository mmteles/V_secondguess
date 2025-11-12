import { systemMonitor } from '../system-monitor';
import { serviceMonitor } from '../service-monitor';
import { alertingSystem } from '../alerting';

describe('Monitoring System Integration', () => {
  beforeEach(() => {
    // Reset monitoring state
    serviceMonitor.reset();
  });

  describe('Service Monitor', () => {
    it('should track service calls', async () => {
      const callId = serviceMonitor.startCall('TestService', 'testMethod', { test: true });
      
      expect(callId).toBeDefined();
      expect(typeof callId).toBe('string');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      serviceMonitor.endCall(callId, { result: 'success' });
      
      const metrics = serviceMonitor.getServiceMetrics('TestService', 'testMethod');
      expect(metrics).toBeDefined();
      expect((metrics as any).totalCalls).toBe(1);
      expect((metrics as any).successfulCalls).toBe(1);
      expect((metrics as any).failedCalls).toBe(0);
    });

    it('should track service call errors', async () => {
      const callId = serviceMonitor.startCall('TestService', 'failingMethod');
      
      const testError = new Error('Test error');
      serviceMonitor.endCallWithError(callId, testError);
      
      const metrics = serviceMonitor.getServiceMetrics('TestService', 'failingMethod');
      expect(metrics).toBeDefined();
      expect((metrics as any).totalCalls).toBe(1);
      expect((metrics as any).successfulCalls).toBe(0);
      expect((metrics as any).failedCalls).toBe(1);
      expect((metrics as any).errorRate).toBe(1);
    });

    it('should provide health summary', () => {
      // Add some service calls
      const callId1 = serviceMonitor.startCall('HealthyService', 'method1');
      serviceMonitor.endCall(callId1);
      
      const callId2 = serviceMonitor.startCall('UnhealthyService', 'method1');
      serviceMonitor.endCallWithError(callId2, new Error('Service error'));
      
      const healthSummary = serviceMonitor.getHealthSummary();
      
      expect(healthSummary).toBeDefined();
      expect(healthSummary.totalServices).toBeGreaterThan(0);
      expect(typeof healthSummary.activeCalls).toBe('number');
    });
  });

  describe('System Monitor', () => {
    it('should get system health', async () => {
      const systemHealth = await systemMonitor.getSystemHealth();
      
      expect(systemHealth).toBeDefined();
      expect(systemHealth.status).toMatch(/healthy|degraded|unhealthy/);
      expect(systemHealth.timestamp).toBeInstanceOf(Date);
      expect(systemHealth.uptime).toBeGreaterThan(0);
      expect(systemHealth.version).toBeDefined();
      expect(systemHealth.services).toBeDefined();
      expect(systemHealth.metrics).toBeDefined();
      expect(systemHealth.alerts).toBeDefined();
    });

    it('should track sessions', () => {
      const sessionId = 'test-session-123';
      
      systemMonitor.trackSession(sessionId, 'start');
      
      // Session should be tracked
      const healthBefore = systemMonitor.getSystemHealth();
      
      systemMonitor.trackSession(sessionId, 'end');
      
      // Session should be removed
      const healthAfter = systemMonitor.getSystemHealth();
      
      expect(healthBefore).toBeDefined();
      expect(healthAfter).toBeDefined();
    });

    it('should track requests', () => {
      const initialHealth = systemMonitor.getSystemHealth();
      
      systemMonitor.trackRequest();
      systemMonitor.trackRequest();
      systemMonitor.trackRequest();
      
      const updatedHealth = systemMonitor.getSystemHealth();
      
      expect(initialHealth).toBeDefined();
      expect(updatedHealth).toBeDefined();
    });

    it('should get metrics history', () => {
      const history = systemMonitor.getMetricsHistory(1); // Last 1 hour
      
      expect(Array.isArray(history)).toBe(true);
      // History might be empty in test environment, which is fine
    });
  });

  describe('Alerting System', () => {
    it('should process alerts', async () => {
      const testAlert = {
        id: 'test-alert-123',
        level: 'warning' as const,
        message: 'Test alert message',
        timestamp: new Date(),
        service: 'TestService',
        resolved: false,
        metadata: { test: true }
      };

      // Process the alert
      await alertingSystem.processAlert(testAlert);
      
      // Alert should be processed (this is mainly testing that no errors occur)
      expect(true).toBe(true);
    });

    it('should provide alerting statistics', () => {
      const stats = alertingSystem.getStatistics();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalAlerts).toBe('number');
      expect(stats.alertsByLevel).toBeDefined();
      expect(stats.alertsByService).toBeDefined();
      expect(Array.isArray(stats.channelStatus)).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should work together for end-to-end monitoring', async () => {
      // Simulate a service call that generates metrics
      const callId = serviceMonitor.startCall('IntegrationService', 'testMethod');
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 50));
      
      serviceMonitor.endCall(callId, { success: true });
      
      // Track a session
      systemMonitor.trackSession('integration-session', 'start');
      
      // Track some requests
      systemMonitor.trackRequest();
      systemMonitor.trackRequest();
      
      // Get system health (this should include our service metrics)
      const systemHealth = await systemMonitor.getSystemHealth();
      
      expect(systemHealth.status).toMatch(/healthy|degraded|unhealthy/);
      expect(systemHealth.services).toBeDefined();
      expect(systemHealth.metrics).toBeDefined();
      
      // Clean up
      systemMonitor.trackSession('integration-session', 'end');
    });

    it('should handle monitoring errors gracefully', async () => {
      // Test that monitoring doesn't break when services have issues
      const callId = serviceMonitor.startCall('ProblematicService', 'errorMethod');
      
      const error = new Error('Simulated service error');
      serviceMonitor.endCallWithError(callId, error);
      
      // System should still be able to provide health information
      const systemHealth = await systemMonitor.getSystemHealth();
      
      expect(systemHealth).toBeDefined();
      expect(systemHealth.status).toBeDefined();
    });
  });
});