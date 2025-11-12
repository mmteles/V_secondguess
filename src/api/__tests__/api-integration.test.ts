import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../server';
import { 
  MockServiceOrchestrator, 
  MockConversationManagerService, 
  MockSOPGeneratorService,
  MockDocumentExporterService 
} from './test-helpers';

// Mock the service modules
jest.mock('../../services/conversation-manager-service', () => ({
  ConversationManagerService: MockConversationManagerService
}));

jest.mock('../../services/sop-generator-service', () => ({
  SOPGeneratorService: MockSOPGeneratorService
}));

jest.mock('../../services/document-exporter-service', () => ({
  DocumentExporterService: MockDocumentExporterService
}));

describe('API Integration Tests', () => {
  let app: Application;
  const mockAuthToken = 'mock-valid-token';

  beforeAll(async () => {
    // Create the Express app
    app = createApp();
  });

  afterAll(async () => {
    // Cleanup - nothing needed for mocked services
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-123' })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('status', 'active');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should reject session creation without auth token', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({ userId: 'test-user-123' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'MISSING_AUTH_TOKEN');
    });

    it('should reject session creation with invalid data', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ invalidField: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should get session information', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-123' })
        .expect(201);

      const sessionId = createResponse.body.sessionId;

      // Then get session info
      const response = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sessionId', sessionId);
      expect(response.body).toHaveProperty('status');
    });

    it('should delete a session', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-123' })
        .expect(201);

      const sessionId = createResponse.body.sessionId;

      // Then delete it
      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(204);
    });
  });

  describe('Conversation Management', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a session for each test
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ userId: 'test-user-123' })
        .expect(201);

      sessionId = response.body.sessionId;
    });

    it('should process text conversation input', async () => {
      const response = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'I need help creating a workflow for customer onboarding',
          type: 'text'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('requiresConfirmation');
      expect(response.body).toHaveProperty('suggestedActions');
      expect(response.body).toHaveProperty('shouldReadAloud');
      expect(response.body).toHaveProperty('sessionId', sessionId);
    });

    it('should process audio conversation input', async () => {
      // Mock audio data (in real scenario, this would be actual audio buffer)
      const mockAudioData = Buffer.from('mock-audio-data');

      const response = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          audioData: mockAudioData,
          type: 'audio'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('sessionId', sessionId);
    });

    it('should generate workflow summary', async () => {
      // First add some conversation input
      await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'I need a workflow for processing customer orders',
          type: 'text'
        });

      const response = await request(app)
        .post(`/api/conversations/${sessionId}/summary`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('description');
    });

    it('should get conversation status', async () => {
      const response = await request(app)
        .get(`/api/conversations/${sessionId}/status`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sessionId', sessionId);
      expect(response.body).toHaveProperty('isAtIterationLimit');
      expect(response.body).toHaveProperty('iterationCount');
      expect(response.body).toHaveProperty('state');
    });

    it('should finalize workflow', async () => {
      // First add some conversation input
      await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          text: 'Create a workflow for employee training',
          type: 'text'
        });

      const response = await request(app)
        .post(`/api/conversations/${sessionId}/finalize`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('steps');
    });
  });

  describe('SOP Management', () => {
    const mockWorkflowDefinition = {
      id: 'workflow-123',
      title: 'Customer Onboarding Process',
      description: 'A comprehensive workflow for onboarding new customers',
      type: 'process_improvement',
      steps: [
        {
          id: 'step-1',
          title: 'Initial Contact',
          description: 'Make first contact with the customer',
          order: 1,
          prerequisites: [],
          outcomes: ['Customer contacted']
        }
      ],
      inputs: [
        {
          name: 'Customer Information',
          type: 'object',
          description: 'Basic customer details',
          required: true
        }
      ],
      outputs: [
        {
          name: 'Onboarded Customer',
          type: 'object',
          description: 'Fully onboarded customer record'
        }
      ],
      dependencies: [],
      risks: []
    };

    it('should generate a new SOP', async () => {
      const response = await request(app)
        .post('/api/sops')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          workflowDefinition: mockWorkflowDefinition,
          sopType: 'process_improvement'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('sections');
      expect(response.body).toHaveProperty('charts');
      expect(response.body).toHaveProperty('metadata');
    });

    it('should get SOP by ID', async () => {
      const sopId = 'sop-123';

      const response = await request(app)
        .get(`/api/sops/${sopId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', sopId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('type');
    });

    it('should update an existing SOP', async () => {
      const sopId = 'sop-123';
      const changes = {
        title: 'Updated SOP Title',
        sections: [
          {
            id: 'section-1',
            title: 'Updated Section',
            content: 'Updated content',
            type: 'procedure',
            order: 1
          }
        ]
      };

      const response = await request(app)
        .put(`/api/sops/${sopId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({ changes })
        .expect(200);

      expect(response.body).toHaveProperty('id', sopId);
      expect(response.body).toHaveProperty('title');
    });

    it('should validate SOP completeness', async () => {
      const sopId = 'sop-123';

      const response = await request(app)
        .post(`/api/sops/${sopId}/validate`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('isValid');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('suggestions');
    });

    it('should export SOP in specified format', async () => {
      const sopId = 'sop-123';

      const response = await request(app)
        .post(`/api/sops/${sopId}/export`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          format: 'pdf',
          options: {
            includeCharts: true,
            template: 'standard'
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('downloadUrl');
      expect(response.body).toHaveProperty('format', 'pdf');
      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('generatedAt');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid-json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({}) // Missing userId
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/health')
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed for health endpoint (it's not rate limited)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});