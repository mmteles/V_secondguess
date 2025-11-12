import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../server';
import { serviceOrchestrator } from '../../services/service-orchestrator';

describe('End-to-End Workflow Tests', () => {
  let app: Application;
  const mockAuthToken = 'mock-valid-token';

  beforeAll(async () => {
    app = createApp();
    await serviceOrchestrator.initialize();
  });

  afterAll(async () => {
    await serviceOrchestrator.shutdown();
  });

  describe('Complete SOP Generation Workflow', () => {
    it('should complete full workflow from conversation to SOP export', async () => {
      // Step 1: Create a new session
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-e2e' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;
      expect(sessionId).toBeDefined();

      // Step 2: Start conversation with initial workflow description
      const initialInputResponse = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'I need to create a workflow for processing customer support tickets. The process should include ticket intake, assignment, resolution, and follow-up.',
          type: 'text'
        })
        .expect(200);

      expect(initialInputResponse.body.message).toBeDefined();
      expect(initialInputResponse.body.sessionId).toBe(sessionId);

      // Step 3: Add more details through conversation
      const detailsResponse = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'The workflow should handle different priority levels: low, medium, high, and critical. Critical tickets should be escalated immediately.',
          type: 'text'
        })
        .expect(200);

      expect(detailsResponse.body.message).toBeDefined();

      // Step 4: Add process steps
      const stepsResponse = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'The steps are: 1) Customer submits ticket, 2) System auto-assigns based on category, 3) Agent reviews and works on ticket, 4) Resolution is provided, 5) Customer confirms satisfaction.',
          type: 'text'
        })
        .expect(200);

      expect(stepsResponse.body.message).toBeDefined();

      // Step 5: Generate workflow summary
      const summaryResponse = await request(app)
        .post(`/api/conversations/${sessionId}/summary`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(summaryResponse.body.id).toBeDefined();
      expect(summaryResponse.body.title).toBeDefined();
      expect(summaryResponse.body.description).toBeDefined();

      // Step 6: Check conversation status
      const statusResponse = await request(app)
        .get(`/api/conversations/${sessionId}/status`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(statusResponse.body.sessionId).toBe(sessionId);
      expect(statusResponse.body.isAtIterationLimit).toBeDefined();

      // Step 7: Finalize workflow
      const finalizeResponse = await request(app)
        .post(`/api/conversations/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      const workflowDefinition = finalizeResponse.body;
      expect(workflowDefinition.id).toBeDefined();
      expect(workflowDefinition.title).toBeDefined();
      expect(workflowDefinition.steps).toBeDefined();
      expect(Array.isArray(workflowDefinition.steps)).toBe(true);

      // Step 8: Generate SOP from workflow
      const sopResponse = await request(app)
        .post('/api/sops')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          workflowDefinition: workflowDefinition,
          sopType: 'process_improvement'
        })
        .expect(201);

      const sopDocument = sopResponse.body;
      expect(sopDocument.id).toBeDefined();
      expect(sopDocument.title).toBeDefined();
      expect(sopDocument.type).toBe('process_improvement');
      expect(sopDocument.sections).toBeDefined();

      // Step 9: Validate SOP
      const validationResponse = await request(app)
        .post(`/api/sops/${sopDocument.id}/validate`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(validationResponse.body.isValid).toBeDefined();
      expect(validationResponse.body.errors).toBeDefined();
      expect(validationResponse.body.warnings).toBeDefined();

      // Step 10: Export SOP in multiple formats
      const pdfExportResponse = await request(app)
        .post(`/api/sops/${sopDocument.id}/export`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          format: 'pdf',
          options: { includeCharts: true }
        })
        .expect(200);

      expect(pdfExportResponse.body.downloadUrl).toBeDefined();
      expect(pdfExportResponse.body.format).toBe('pdf');

      const docxExportResponse = await request(app)
        .post(`/api/sops/${sopDocument.id}/export`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          format: 'docx',
          options: { includeCharts: false }
        })
        .expect(200);

      expect(docxExportResponse.body.downloadUrl).toBeDefined();
      expect(docxExportResponse.body.format).toBe('docx');

      // Step 11: Clean up - end session
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    }, 30000); // Increase timeout for this comprehensive test

    it('should handle audio input in workflow', async () => {
      // Create session
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-audio' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Send audio input (mock audio data)
      const mockAudioData = Buffer.from('mock-audio-data-for-workflow');

      const audioInputResponse = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          audioData: mockAudioData,
          type: 'audio'
        })
        .expect(200);

      expect(audioInputResponse.body.message).toBeDefined();
      expect(audioInputResponse.body.sessionId).toBe(sessionId);

      // The response might include audio data if shouldReadAloud is true
      if (audioInputResponse.body.shouldReadAloud) {
        expect(audioInputResponse.body.audioData).toBeDefined();
      }

      // Clean up
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should handle iterative conversation refinement', async () => {
      // Create session
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-iterative' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Simulate multiple iterations of conversation
      const conversationInputs = [
        'I need a workflow for inventory management',
        'The workflow should track stock levels and reorder points',
        'It should also handle supplier management and purchase orders',
        'Include automated alerts for low stock situations',
        'Add approval process for large orders over $10,000'
      ];

      for (let i = 0; i < conversationInputs.length; i++) {
        const response = await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: conversationInputs[i],
            type: 'text'
          })
          .expect(200);

        expect(response.body.message).toBeDefined();

        // Check status after each input
        const statusResponse = await request(app)
          .get(`/api/conversations/${sessionId}/status`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        expect(statusResponse.body.iterationCount).toBeDefined();
      }

      // Generate final workflow
      const finalizeResponse = await request(app)
        .post(`/api/conversations/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(finalizeResponse.body.id).toBeDefined();
      expect(finalizeResponse.body.title).toContain('inventory');

      // Clean up
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle service failures gracefully', async () => {
      // Create session
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-resilience' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Send input that might cause service issues
      const response = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'Create a very complex workflow with many edge cases and potential failure points',
          type: 'text'
        });

      // Should either succeed or fail gracefully with proper error response
      if (response.status === 200) {
        expect(response.body.message).toBeDefined();
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBeDefined();
      }

      // Clean up
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should handle concurrent sessions', async () => {
      const numberOfSessions = 3;
      const sessionPromises = [];

      // Create multiple sessions concurrently
      for (let i = 0; i < numberOfSessions; i++) {
        sessionPromises.push(
          request(app)
            .post('/api/sessions')
            .set('Authorization', `Bearer ${mockAuthToken}`)
            .send({ userId: `test-user-concurrent-${i}` })
        );
      }

      const sessionResponses = await Promise.all(sessionPromises);
      
      // All sessions should be created successfully
      sessionResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.sessionId).toBeDefined();
      });

      const sessionIds = sessionResponses.map(r => r.body.sessionId);

      // Send input to all sessions concurrently
      const inputPromises = sessionIds.map((sessionId, index) =>
        request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: `Workflow for process ${index + 1}`,
            type: 'text'
          })
      );

      const inputResponses = await Promise.all(inputPromises);
      
      // All inputs should be processed successfully
      inputResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.message).toBeDefined();
      });

      // Clean up all sessions
      const cleanupPromises = sessionIds.map(sessionId =>
        request(app)
          .delete(`/api/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
      );

      const cleanupResponses = await Promise.all(cleanupPromises);
      
      cleanupResponses.forEach(response => {
        expect(response.status).toBe(204);
      });
    });
  });

  describe('Performance and Load', () => {
    it('should handle reasonable load', async () => {
      const startTime = Date.now();
      
      // Create session
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-performance' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Send multiple inputs in sequence
      const inputs = [
        'Create a workflow for customer service',
        'Add escalation procedures',
        'Include quality assurance steps',
        'Add reporting and metrics'
      ];

      for (const input of inputs) {
        const response = await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: input,
            type: 'text'
          })
          .expect(200);

        expect(response.body.message).toBeDefined();
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(10000); // 10 seconds

      // Clean up
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });
});