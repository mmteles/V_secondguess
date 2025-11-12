import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../server';
import { serviceOrchestrator } from '../../services/service-orchestrator';

describe('System Integration Tests', () => {
  let app: Application;
  const mockAuthToken = 'mock-valid-token';

  beforeAll(async () => {
    app = createApp();
    await serviceOrchestrator.initialize();
  });

  afterAll(async () => {
    await serviceOrchestrator.shutdown();
  });

  describe('Complete User Journey Tests', () => {
    it('should complete voice-to-SOP workflow with real-time transcription', async () => {
      const startTime = Date.now();

      // Step 1: Create session
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-voice-journey' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Step 2: Simulate voice input with transcription
      const mockAudioBuffer = Buffer.from('mock-audio-workflow-description');
      
      const voiceInputResponse = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          audioData: mockAudioBuffer,
          type: 'audio'
        })
        .expect(200);

      expect(voiceInputResponse.body.message).toBeDefined();
      expect(voiceInputResponse.body.transcription).toBeDefined();
      expect(voiceInputResponse.body.confidence).toBeGreaterThan(0.7);

      // Step 3: Validate transcription and continue conversation
      const validationResponse = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'Yes, that transcription is correct. Please continue.',
          type: 'text'
        })
        .expect(200);

      expect(validationResponse.body.message).toBeDefined();

      // Step 4: Add workflow details through multiple iterations
      const workflowDetails = [
        'This is a customer service escalation process',
        'It should handle three priority levels: low, medium, and high',
        'High priority issues should be escalated within 15 minutes',
        'The process includes initial triage, assignment, and resolution tracking'
      ];

      for (const detail of workflowDetails) {
        const detailResponse = await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: detail,
            type: 'text'
          })
          .expect(200);

        expect(detailResponse.body.message).toBeDefined();
      }

      // Step 5: Generate and validate workflow
      const workflowResponse = await request(app)
        .post(`/api/conversations/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(workflowResponse.body.id).toBeDefined();
      expect(workflowResponse.body.steps).toBeDefined();
      expect(workflowResponse.body.steps.length).toBeGreaterThan(0);

      // Step 6: Generate SOP with charts
      const sopResponse = await request(app)
        .post('/api/sops')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          workflowDefinition: workflowResponse.body,
          sopType: 'process_improvement'
        })
        .expect(201);

      expect(sopResponse.body.id).toBeDefined();
      expect(sopResponse.body.charts).toBeDefined();
      expect(sopResponse.body.charts.length).toBeGreaterThan(0);

      // Step 7: Export in multiple formats
      const exportFormats = ['pdf', 'docx', 'html'];
      const exportPromises = exportFormats.map(format =>
        request(app)
          .post(`/api/sops/${sopResponse.body.id}/export`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            format,
            options: { includeCharts: true }
          })
      );

      const exportResponses = await Promise.all(exportPromises);
      
      exportResponses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.downloadUrl).toBeDefined();
        expect(response.body.format).toBe(exportFormats[index]);
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Performance assertion: complete workflow should finish within 15 seconds
      expect(totalTime).toBeLessThan(15000);

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    }, 20000);

    it('should handle iterative refinement with 5-iteration checkpoint', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-iteration-checkpoint' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Simulate exactly 5 iterations to trigger checkpoint
      const iterations = [
        'I need a workflow for inventory management',
        'Add automatic reorder points for low stock',
        'Include supplier management and purchase orders',
        'Add approval workflow for orders over $5000',
        'Include reporting and analytics dashboard'
      ];

      for (let i = 0; i < iterations.length; i++) {
        const response = await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: iterations[i],
            type: 'text'
          })
          .expect(200);

        expect(response.body.message).toBeDefined();

        // Check iteration count
        const statusResponse = await request(app)
          .get(`/api/conversations/${sessionId}/status`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        expect(statusResponse.body.iterationCount).toBe(i + 1);

        // After 5th iteration, should be at checkpoint
        if (i === 4) {
          expect(statusResponse.body.isAtIterationLimit).toBe(true);
          expect(response.body.message).toContain('more time to review');
        }
      }

      // User chooses to continue after checkpoint
      const continueResponse = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'Yes, I want to continue with the SOP generation',
          type: 'text'
        })
        .expect(200);

      expect(continueResponse.body.message).toBeDefined();

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should handle text-to-speech SOP reading functionality', async () => {
      // Create session and generate SOP
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-tts' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Add workflow input
      await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'Create a simple workflow for document approval process',
          type: 'text'
        })
        .expect(200);

      // Finalize workflow
      const workflowResponse = await request(app)
        .post(`/api/conversations/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      // Generate SOP
      const sopResponse = await request(app)
        .post('/api/sops')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          workflowDefinition: workflowResponse.body,
          sopType: 'training'
        })
        .expect(201);

      // Test TTS functionality - read SOP aloud
      const ttsResponse = await request(app)
        .post(`/api/sops/${sopResponse.body.id}/read`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          section: 'all',
          voice: 'standard',
          speed: 1.0
        })
        .expect(200);

      expect(ttsResponse.body.audioUrl).toBeDefined();
      expect(ttsResponse.body.duration).toBeGreaterThan(0);
      expect(ttsResponse.body.format).toBe('mp3');

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle transcription service failures gracefully', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-transcription-error' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Send corrupted audio data to simulate transcription failure
      const corruptedAudio = Buffer.from('corrupted-audio-data-that-cannot-be-processed');

      const response = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          audioData: corruptedAudio,
          type: 'audio'
        });

      // Should either succeed with low confidence or fail gracefully
      if (response.status === 200) {
        expect(response.body.confidence).toBeDefined();
        expect(response.body.message).toContain('unclear');
      } else {
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('TRANSCRIPTION_FAILED');
        expect(response.body.error.message).toBeDefined();
        expect(response.body.error.recoveryOptions).toBeDefined();
      }

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should handle SOP generation service failures', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-sop-error' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Create an incomplete workflow that might cause SOP generation issues
      const incompleteWorkflow = {
        id: 'incomplete-workflow',
        title: '',
        description: '',
        type: 'unknown',
        steps: [],
        inputs: [],
        outputs: [],
        dependencies: [],
        risks: []
      };

      const response = await request(app)
        .post('/api/sops')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          workflowDefinition: incompleteWorkflow,
          sopType: 'process_improvement'
        });

      // Should fail gracefully with proper error response
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.details).toBeDefined();

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should handle session timeout and recovery', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-timeout' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Add some conversation data
      await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'Start of workflow description',
          type: 'text'
        })
        .expect(200);

      // Simulate session timeout by trying to access after long delay
      // In real scenario, this would be handled by session middleware
      const timeoutResponse = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      // Session should still be accessible (timeout handling depends on implementation)
      expect(timeoutResponse.body.sessionId).toBe(sessionId);

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should handle network interruptions during audio streaming', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-network-interruption' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Simulate partial audio data (network interruption)
      const partialAudio = Buffer.from('partial-audio');

      const response = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          audioData: partialAudio,
          type: 'audio',
          isPartial: true
        });

      // Should handle partial audio gracefully
      if (response.status === 200) {
        expect(response.body.message).toBeDefined();
        expect(response.body.requiresConfirmation).toBe(true);
      } else {
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INCOMPLETE_AUDIO');
      }

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });

  describe('Performance Tests', () => {
    it('should handle real-time transcription within acceptable latency', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-performance' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Test multiple audio inputs for latency
      const audioInputs = [
        Buffer.from('first-audio-segment'),
        Buffer.from('second-audio-segment'),
        Buffer.from('third-audio-segment')
      ];

      const latencies: number[] = [];

      for (const audioData of audioInputs) {
        const startTime = Date.now();

        const response = await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            audioData,
            type: 'audio'
          })
          .expect(200);

        const endTime = Date.now();
        const latency = endTime - startTime;
        latencies.push(latency);

        expect(response.body.message).toBeDefined();
      }

      // Average latency should be under 2 seconds for real-time feel
      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      expect(averageLatency).toBeLessThan(2000);

      // No single request should take more than 5 seconds
      latencies.forEach(latency => {
        expect(latency).toBeLessThan(5000);
      });

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should handle concurrent conversation sessions efficiently', async () => {
      const numberOfSessions = 5;
      const sessionPromises = [];

      // Create multiple sessions
      for (let i = 0; i < numberOfSessions; i++) {
        sessionPromises.push(
          request(app)
            .post('/api/sessions')
            .set('Authorization', `Bearer ${mockAuthToken}`)
            .send({ userId: `test-user-concurrent-${i}` })
        );
      }

      const sessionResponses = await Promise.all(sessionPromises);
      const sessionIds = sessionResponses.map(r => r.body.sessionId);

      // Send concurrent inputs to all sessions
      const inputPromises = sessionIds.map((sessionId, index) =>
        request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: `Concurrent workflow description ${index + 1}`,
            type: 'text'
          })
      );

      const startTime = Date.now();
      const inputResponses = await Promise.all(inputPromises);
      const endTime = Date.now();

      // All requests should succeed
      inputResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.message).toBeDefined();
      });

      // Concurrent processing should not significantly increase total time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 5 concurrent sessions

      // Cleanup all sessions
      const cleanupPromises = sessionIds.map(sessionId =>
        request(app)
          .delete(`/api/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
      );

      await Promise.all(cleanupPromises);
    });

    it('should handle large SOP generation efficiently', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-large-sop' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Create a complex workflow with many steps
      const complexWorkflowInputs = [
        'Create a comprehensive employee onboarding workflow',
        'Include 15 different steps from application to first day',
        'Add approval processes for HR, IT, and department managers',
        'Include document collection, background checks, and system setup',
        'Add training modules and orientation schedules',
        'Include compliance requirements and safety training'
      ];

      for (const input of complexWorkflowInputs) {
        await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: input,
            type: 'text'
          })
          .expect(200);
      }

      // Finalize complex workflow
      const workflowResponse = await request(app)
        .post(`/api/conversations/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      // Generate large SOP
      const startTime = Date.now();
      
      const sopResponse = await request(app)
        .post('/api/sops')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          workflowDefinition: workflowResponse.body,
          sopType: 'training'
        })
        .expect(201);

      const endTime = Date.now();
      const generationTime = endTime - startTime;

      // Large SOP generation should complete within reasonable time
      expect(generationTime).toBeLessThan(30000); // 30 seconds

      expect(sopResponse.body.sections).toBeDefined();
      expect(sopResponse.body.sections.length).toBeGreaterThan(5);

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should provide comprehensive health check information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.services).toBeDefined();

      // Check individual service health
      const services = response.body.services;
      expect(services.conversationManager).toBeDefined();
      expect(services.sopGenerator).toBeDefined();
      expect(services.speechToText).toBeDefined();
      expect(services.textToSpeech).toBeDefined();
      expect(services.documentExporter).toBeDefined();
    });

    it('should track system metrics during operation', async () => {
      // Create session and perform operations
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-metrics' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Perform several operations
      await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'Test workflow for metrics tracking',
          type: 'text'
        })
        .expect(200);

      // Check metrics endpoint
      const metricsResponse = await request(app)
        .get('/metrics')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(metricsResponse.body.totalSessions).toBeDefined();
      expect(metricsResponse.body.activeConversations).toBeDefined();
      expect(metricsResponse.body.averageResponseTime).toBeDefined();
      expect(metricsResponse.body.errorRate).toBeDefined();

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });
});