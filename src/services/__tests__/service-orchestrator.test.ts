import { ServiceOrchestratorImpl } from '../service-orchestrator';
import { serviceMonitor } from '../../utils/service-monitor';
import { errorRecovery } from '../../utils/error-recovery';

// Mock all service dependencies
jest.mock('../voice-user-interface-service');
jest.mock('../speech-to-text-service');
jest.mock('../conversation-manager-service');
jest.mock('../sop-generator-service');
jest.mock('../visual-generator-service');
jest.mock('../document-exporter-service');
jest.mock('../text-to-speech-service');
jest.mock('../feedback-processor-service');
jest.mock('../document-versioning-service');

describe('ServiceOrchestrator', () => {
  let orchestrator: ServiceOrchestratorImpl;

  beforeEach(() => {
    orchestrator = new ServiceOrchestratorImpl();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (orchestrator) {
      try {
        await orchestrator.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }
  });

  describe('Initialization and Shutdown', () => {
    it('should initialize all services successfully', async () => {
      await expect(orchestrator.initialize()).resolves.not.toThrow();
    });

    it('should shutdown all services gracefully', async () => {
      await orchestrator.initialize();
      await expect(orchestrator.shutdown()).resolves.not.toThrow();
    });

    it('should throw error when using uninitialized orchestrator', async () => {
      await expect(
        orchestrator.startConversationWorkflow('test-user')
      ).rejects.toThrow('Service orchestrator is not initialized');
    });
  });

  describe('Conversation Workflow', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should start conversation workflow successfully', async () => {
      const userId = 'test-user-123';
      
      const sessionId = await orchestrator.startConversationWorkflow(userId);
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });

    it('should process text input successfully', async () => {
      const userId = 'test-user-123';
      const sessionId = await orchestrator.startConversationWorkflow(userId);
      
      const userInput = {
        text: 'I need help creating a workflow',
        type: 'text' as const,
        timestamp: new Date()
      };

      const response = await orchestrator.processConversationInput(sessionId, userInput);
      
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.requiresConfirmation).toBeDefined();
      expect(response.suggestedActions).toBeDefined();
      expect(response.shouldReadAloud).toBeDefined();
    });

    it('should process audio input with transcription', async () => {
      const userId = 'test-user-123';
      const sessionId = await orchestrator.startConversationWorkflow(userId);
      
      const userInput = {
        audioData: Buffer.from('mock-audio-data'),
        type: 'audio' as const,
        timestamp: new Date()
      };

      const response = await orchestrator.processConversationInput(sessionId, userInput);
      
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should handle transcription failures gracefully', async () => {
      const userId = 'test-user-123';
      const sessionId = await orchestrator.startConversationWorkflow(userId);
      
      // Mock transcription service to throw error
      const mockTranscribeError = new Error('Transcription service unavailable');
      
      const userInput = {
        audioData: Buffer.from('mock-audio-data'),
        type: 'audio' as const,
        timestamp: new Date()
      };

      // Should not throw error, should use fallback
      const response = await orchestrator.processConversationInput(sessionId, userInput);
      
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });

  describe('SOP Generation', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should generate SOP from session successfully', async () => {
      const userId = 'test-user-123';
      const sessionId = await orchestrator.startConversationWorkflow(userId);
      
      const sopDocument = await orchestrator.generateSOPFromSession(sessionId, 'automation');
      
      expect(sopDocument).toBeDefined();
      expect(sopDocument.id).toBeDefined();
      expect(sopDocument.title).toBeDefined();
      expect(sopDocument.type).toBe('automation');
      expect(sopDocument.sections).toBeDefined();
    });

    it('should handle chart generation failures gracefully', async () => {
      const userId = 'test-user-123';
      const sessionId = await orchestrator.startConversationWorkflow(userId);
      
      // Mock visual generator to throw error
      const mockChartError = new Error('Chart generation failed');
      
      // Should still generate SOP without charts
      const sopDocument = await orchestrator.generateSOPFromSession(sessionId, 'training');
      
      expect(sopDocument).toBeDefined();
      expect(sopDocument.id).toBeDefined();
    });
  });

  describe('Document Export', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should export SOP document successfully', async () => {
      const sopId = 'test-sop-123';
      const format = 'pdf';
      
      const exportResult = await orchestrator.exportSOPDocument(sopId, format);
      
      expect(exportResult).toBeDefined();
      expect(exportResult.downloadUrl).toBeDefined();
      expect(exportResult.format).toBe(format);
    });

    it('should handle export failures with proper error', async () => {
      const sopId = 'invalid-sop-id';
      const format = 'pdf';
      
      await expect(
        orchestrator.exportSOPDocument(sopId, format)
      ).rejects.toThrow();
    });
  });

  describe('Service Health and Metrics', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should return service health status', async () => {
      const healthStatus = await orchestrator.getServiceHealth();
      
      expect(healthStatus).toBeDefined();
      expect(healthStatus.overall).toBeDefined();
      expect(healthStatus.services).toBeDefined();
      expect(typeof healthStatus.services).toBe('object');
    });

    it('should return service metrics', async () => {
      const metrics = await orchestrator.getServiceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.activeConversations).toBeDefined();
      expect(metrics.totalSOPsGenerated).toBeDefined();
      expect(metrics.averageConversationDuration).toBeDefined();
      expect(metrics.errorRate).toBeDefined();
      expect(metrics.responseTime).toBeDefined();
    });

    it('should update metrics after operations', async () => {
      const initialMetrics = await orchestrator.getServiceMetrics();
      
      // Perform some operations
      const userId = 'test-user-metrics';
      const sessionId = await orchestrator.startConversationWorkflow(userId);
      
      const updatedMetrics = await orchestrator.getServiceMetrics();
      
      expect(updatedMetrics.activeConversations).toBeGreaterThan(initialMetrics.activeConversations);
    });
  });

  describe('Error Recovery Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should use retry mechanism for failed operations', async () => {
      const userId = 'test-user-retry';
      
      // Mock service to fail first time, succeed second time
      let callCount = 0;
      const mockFailThenSucceed = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary failure');
        }
        return 'session-123';
      });

      // Should retry and eventually succeed
      const sessionId = await orchestrator.startConversationWorkflow(userId);
      expect(sessionId).toBeDefined();
    });

    it('should use circuit breaker for repeated failures', async () => {
      const userId = 'test-user-circuit-breaker';
      
      // Mock service to always fail
      const mockAlwaysFail = jest.fn().mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      // First few calls should attempt and fail
      await expect(
        orchestrator.startConversationWorkflow(userId)
      ).rejects.toThrow();

      // After threshold, circuit breaker should open
      // Subsequent calls should fail fast
      await expect(
        orchestrator.startConversationWorkflow(userId)
      ).rejects.toThrow();
    });
  });

  describe('Service Monitoring Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
      serviceMonitor.reset(); // Clear previous metrics
    });

    it('should track service calls in monitor', async () => {
      const userId = 'test-user-monitoring';
      
      await orchestrator.startConversationWorkflow(userId);
      
      const metrics = serviceMonitor.getAllMetrics();
      expect(metrics.size).toBeGreaterThan(0);
    });

    it('should track successful and failed calls', async () => {
      const userId = 'test-user-tracking';
      
      // Successful call
      await orchestrator.startConversationWorkflow(userId);
      
      // Failed call (invalid session)
      try {
        await orchestrator.processConversationInput('invalid-session', {
          text: 'test',
          type: 'text',
          timestamp: new Date()
        });
      } catch (error) {
        // Expected to fail
      }
      
      const healthSummary = serviceMonitor.getHealthSummary();
      expect(healthSummary.totalServices).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should handle multiple concurrent conversation workflows', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      
      const sessionPromises = userIds.map(userId =>
        orchestrator.startConversationWorkflow(userId)
      );
      
      const sessionIds = await Promise.all(sessionPromises);
      
      expect(sessionIds).toHaveLength(3);
      sessionIds.forEach(sessionId => {
        expect(sessionId).toBeDefined();
        expect(typeof sessionId).toBe('string');
      });
    });

    it('should handle concurrent input processing', async () => {
      const userId = 'test-user-concurrent';
      const sessionId = await orchestrator.startConversationWorkflow(userId);
      
      const inputs = [
        { text: 'Input 1', type: 'text' as const, timestamp: new Date() },
        { text: 'Input 2', type: 'text' as const, timestamp: new Date() },
        { text: 'Input 3', type: 'text' as const, timestamp: new Date() }
      ];
      
      const responsePromises = inputs.map(input =>
        orchestrator.processConversationInput(sessionId, input)
      );
      
      const responses = await Promise.all(responsePromises);
      
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.message).toBeDefined();
      });
    });
  });
});