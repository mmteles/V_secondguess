import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../server';
import { serviceOrchestrator } from '../../services/service-orchestrator';

describe('Performance Tests', () => {
  let app: Application;
  const mockAuthToken = 'mock-valid-token';

  beforeAll(async () => {
    app = createApp();
    await serviceOrchestrator.initialize();
  });

  afterAll(async () => {
    await serviceOrchestrator.shutdown();
  });

  describe('Real-time Transcription Performance', () => {
    it('should process audio transcription within 2 seconds', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-transcription-perf' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Test various audio sizes
      const audioSizes = [1024, 5120, 10240]; // Different buffer sizes
      const results: Array<{ size: number; latency: number }> = [];

      for (const size of audioSizes) {
        const audioData = Buffer.alloc(size, 'mock-audio-data');
        
        const startTime = process.hrtime.bigint();
        
        const response = await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            audioData,
            type: 'audio'
          })
          .expect(200);

        const endTime = process.hrtime.bigint();
        const latencyMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        results.push({ size, latency: latencyMs });

        expect(response.body.message).toBeDefined();
        expect(latencyMs).toBeLessThan(2000); // Must be under 2 seconds
      }

      // Log performance results for analysis
      console.log('Transcription Performance Results:', results);

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should maintain consistent performance under load', async () => {
      const numberOfRequests = 10;
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-load-perf' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;
      const latencies: number[] = [];

      // Send multiple requests sequentially
      for (let i = 0; i < numberOfRequests; i++) {
        const audioData = Buffer.from(`audio-data-${i}`);
        
        const startTime = process.hrtime.bigint();
        
        const response = await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            audioData,
            type: 'audio'
          })
          .expect(200);

        const endTime = process.hrtime.bigint();
        const latencyMs = Number(endTime - startTime) / 1000000;
        
        latencies.push(latencyMs);
        expect(response.body.message).toBeDefined();
      }

      // Calculate performance metrics
      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);
      const standardDeviation = Math.sqrt(
        latencies.reduce((sum, lat) => sum + Math.pow(lat - averageLatency, 2), 0) / latencies.length
      );

      // Performance assertions
      expect(averageLatency).toBeLessThan(2000);
      expect(maxLatency).toBeLessThan(5000);
      expect(standardDeviation).toBeLessThan(1000); // Consistent performance

      console.log('Load Performance Metrics:', {
        averageLatency,
        maxLatency,
        minLatency,
        standardDeviation,
        requestCount: numberOfRequests
      });

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });

  describe('Conversation Response Performance', () => {
    it('should respond to conversation inputs within 2 seconds', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-conversation-perf' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      const conversationInputs = [
        'I need help creating a workflow',
        'The workflow is for customer service',
        'It should handle ticket routing and escalation',
        'Include priority levels and SLA tracking',
        'Add reporting and analytics features'
      ];

      const responseLatencies: number[] = [];

      for (const input of conversationInputs) {
        const startTime = process.hrtime.bigint();
        
        const response = await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: input,
            type: 'text'
          })
          .expect(200);

        const endTime = process.hrtime.bigint();
        const latencyMs = Number(endTime - startTime) / 1000000;
        
        responseLatencies.push(latencyMs);
        
        expect(response.body.message).toBeDefined();
        expect(latencyMs).toBeLessThan(2000); // Must respond within 2 seconds
      }

      const averageResponseTime = responseLatencies.reduce((sum, lat) => sum + lat, 0) / responseLatencies.length;
      
      console.log('Conversation Response Performance:', {
        averageResponseTime,
        maxResponseTime: Math.max(...responseLatencies),
        minResponseTime: Math.min(...responseLatencies)
      });

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should handle concurrent conversations efficiently', async () => {
      const numberOfConcurrentSessions = 5;
      const inputsPerSession = 3;

      // Create multiple sessions
      const sessionPromises = Array(numberOfConcurrentSessions).fill(null).map((_, i) =>
        request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({ userId: `test-user-concurrent-${i}` })
      );

      const sessionResponses = await Promise.all(sessionPromises);
      const sessionIds = sessionResponses.map(r => r.body.sessionId);

      // Send concurrent inputs to all sessions
      const startTime = process.hrtime.bigint();
      
      const allInputPromises = sessionIds.flatMap(sessionId =>
        Array(inputsPerSession).fill(null).map((_, inputIndex) =>
          request(app)
            .post(`/api/conversations/${sessionId}/input`)
            .set('Authorization', `Bearer ${mockAuthToken}`)
            .send({
              text: `Concurrent input ${inputIndex + 1} for session ${sessionId}`,
              type: 'text'
            })
        )
      );

      const allResponses = await Promise.all(allInputPromises);
      
      const endTime = process.hrtime.bigint();
      const totalLatencyMs = Number(endTime - startTime) / 1000000;

      // All requests should succeed
      allResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.message).toBeDefined();
      });

      // Concurrent processing should be efficient
      const totalRequests = numberOfConcurrentSessions * inputsPerSession;
      const averageLatencyPerRequest = totalLatencyMs / totalRequests;
      
      expect(averageLatencyPerRequest).toBeLessThan(1000); // Average under 1 second per request
      expect(totalLatencyMs).toBeLessThan(15000); // Total under 15 seconds

      console.log('Concurrent Performance:', {
        totalRequests,
        totalLatencyMs,
        averageLatencyPerRequest,
        concurrentSessions: numberOfConcurrentSessions
      });

      // Cleanup all sessions
      const cleanupPromises = sessionIds.map(sessionId =>
        request(app)
          .delete(`/api/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
      );

      await Promise.all(cleanupPromises);
    });
  });

  describe('SOP Generation Performance', () => {
    it('should generate SOPs within acceptable time limits', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-sop-perf' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Create workflow of varying complexity
      const workflowComplexities = [
        { name: 'simple', inputs: ['Simple workflow with 3 steps'] },
        { name: 'medium', inputs: ['Medium workflow', 'with 7 steps', 'including approvals', 'and notifications'] },
        { name: 'complex', inputs: ['Complex workflow', 'with 15 steps', 'multiple approval levels', 'integration points', 'error handling', 'reporting features'] }
      ];

      const performanceResults: Array<{ complexity: string; generationTime: number; sopSize: number }> = [];

      for (const complexity of workflowComplexities) {
        // Create new session for each complexity test
        const complexitySessionResponse = await request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({ userId: `test-user-sop-perf-${complexity.name}` })
          .expect(201);

        const complexitySessionId = complexitySessionResponse.body.sessionId;

        // Add workflow inputs
        for (const input of complexity.inputs) {
          await request(app)
            .post(`/api/conversations/${complexitySessionId}/input`)
            .set('Authorization', `Bearer ${mockAuthToken}`)
            .send({
              text: input,
              type: 'text'
            })
            .expect(200);
        }

        // Finalize workflow
        const workflowResponse = await request(app)
          .post(`/api/conversations/${complexitySessionId}/finalize`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        // Measure SOP generation time
        const startTime = process.hrtime.bigint();
        
        const sopResponse = await request(app)
          .post('/api/sops')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            workflowDefinition: workflowResponse.body,
            sopType: 'process_improvement'
          })
          .expect(201);

        const endTime = process.hrtime.bigint();
        const generationTimeMs = Number(endTime - startTime) / 1000000;

        const sopSize = JSON.stringify(sopResponse.body).length;

        performanceResults.push({
          complexity: complexity.name,
          generationTime: generationTimeMs,
          sopSize
        });

        // Performance assertions based on complexity
        switch (complexity.name) {
          case 'simple':
            expect(generationTimeMs).toBeLessThan(5000); // 5 seconds
            break;
          case 'medium':
            expect(generationTimeMs).toBeLessThan(15000); // 15 seconds
            break;
          case 'complex':
            expect(generationTimeMs).toBeLessThan(30000); // 30 seconds
            break;
        }

        expect(sopResponse.body.sections).toBeDefined();
        expect(sopResponse.body.sections.length).toBeGreaterThan(0);

        // Cleanup
        await request(app)
          .delete(`/api/sessions/${complexitySessionId}`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(204);
      }

      console.log('SOP Generation Performance Results:', performanceResults);

      // Cleanup main session
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });

    it('should handle chart generation efficiently', async () => {
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-chart-perf' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Create workflow with multiple chart requirements
      const chartInputs = [
        'Create a workflow with multiple decision points',
        'Include parallel processing paths',
        'Add event triggers and notifications',
        'Include approval workflows with different roles'
      ];

      for (const input of chartInputs) {
        await request(app)
          .post(`/api/conversations/${sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: input,
            type: 'text'
          })
          .expect(200);
      }

      const workflowResponse = await request(app)
        .post(`/api/conversations/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      // Measure SOP generation with charts
      const startTime = process.hrtime.bigint();
      
      const sopResponse = await request(app)
        .post('/api/sops')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          workflowDefinition: workflowResponse.body,
          sopType: 'process_improvement'
        })
        .expect(201);

      const endTime = process.hrtime.bigint();
      const generationTimeMs = Number(endTime - startTime) / 1000000;

      // Should generate SOP with charts within reasonable time
      expect(generationTimeMs).toBeLessThan(20000); // 20 seconds
      expect(sopResponse.body.charts).toBeDefined();
      expect(sopResponse.body.charts.length).toBeGreaterThan(0);

      console.log('Chart Generation Performance:', {
        generationTimeMs,
        chartCount: sopResponse.body.charts.length,
        sectionCount: sopResponse.body.sections.length
      });

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });

  describe('Document Export Performance', () => {
    it('should export documents in multiple formats efficiently', async () => {
      // First create a SOP to export
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-export-perf' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'Create a comprehensive workflow for document management',
          type: 'text'
        })
        .expect(200);

      const workflowResponse = await request(app)
        .post(`/api/conversations/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      const sopResponse = await request(app)
        .post('/api/sops')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          workflowDefinition: workflowResponse.body,
          sopType: 'training'
        })
        .expect(201);

      const sopId = sopResponse.body.id;

      // Test export performance for different formats
      const exportFormats = ['pdf', 'docx', 'html'];
      const exportResults: Array<{ format: string; exportTime: number; fileSize: number }> = [];

      for (const format of exportFormats) {
        const startTime = process.hrtime.bigint();
        
        const exportResponse = await request(app)
          .post(`/api/sops/${sopId}/export`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            format,
            options: { includeCharts: true }
          })
          .expect(200);

        const endTime = process.hrtime.bigint();
        const exportTimeMs = Number(endTime - startTime) / 1000000;

        exportResults.push({
          format,
          exportTime: exportTimeMs,
          fileSize: exportResponse.body.size || 0
        });

        expect(exportResponse.body.downloadUrl).toBeDefined();
        expect(exportTimeMs).toBeLessThan(10000); // 10 seconds per format
      }

      console.log('Export Performance Results:', exportResults);

      // Cleanup
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain stable memory usage during extended operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      const numberOfOperations = 20;
      const sessionIds: string[] = [];

      for (let i = 0; i < numberOfOperations; i++) {
        const sessionResponse = await request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({ userId: `test-user-memory-${i}` })
          .expect(201);

        sessionIds.push(sessionResponse.body.sessionId);

        // Add conversation input
        await request(app)
          .post(`/api/conversations/${sessionResponse.body.sessionId}/input`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            text: `Memory test workflow ${i}`,
            type: 'text'
          })
          .expect(200);
      }

      const midMemory = process.memoryUsage();

      // Cleanup all sessions
      for (const sessionId of sessionIds) {
        await request(app)
          .delete(`/api/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(204);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();

      console.log('Memory Usage Analysis:', {
        initial: initialMemory,
        mid: midMemory,
        final: finalMemory,
        operations: numberOfOperations
      });

      // Memory should not grow excessively
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      expect(memoryGrowthMB).toBeLessThan(100); // Should not grow more than 100MB
    });
  });
});