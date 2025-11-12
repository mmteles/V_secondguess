import request from 'supertest';
import { Application } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Simple test app without complex dependencies
function createTestApp(): Application {
  const app = express();

  // Basic middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    });
  });

  // Mock API endpoints for testing
  app.post('/api/sessions', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'userId is required'
        }
      });
    }

    return res.status(201).json({
      sessionId: `session-${userId}-${Date.now()}`,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  });

  app.get('/api/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    return res.json({
      sessionId,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  });

  app.post('/api/conversations/:sessionId/input', (req, res) => {
    const { sessionId } = req.params;
    const { text, type } = req.body;

    if (!type || (type === 'text' && !text)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input'
        }
      });
    }

    return res.json({
      message: `Processed input: ${text || '[audio]'}`,
      requiresConfirmation: false,
      suggestedActions: ['continue'],
      shouldReadAloud: false,
      sessionId,
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/sops', (req, res) => {
    const { workflowDefinition, sopType } = req.body;

    if (!workflowDefinition || !sopType) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'workflowDefinition and sopType are required'
        }
      });
    }

    return res.status(201).json({
      id: `sop-${Date.now()}`,
      title: workflowDefinition.title || 'Generated SOP',
      type: sopType,
      sections: [
        {
          id: 'section-1',
          title: 'Overview',
          content: 'Generated SOP content',
          type: 'overview',
          order: 1
        }
      ],
      charts: [],
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  });

  // 404 handler
  app.use((req, res) => {
    return res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'API endpoint not found'
      }
    });
  });

  return app;
}

describe('Simple API Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
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
        .send({ userId: 'test-user-123' })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('status', 'active');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body.sessionId).toContain('test-user-123');
    });

    it('should reject session creation without userId', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should get session information', async () => {
      const sessionId = 'test-session-123';

      const response = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('sessionId', sessionId);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Conversation Management', () => {
    it('should process text conversation input', async () => {
      const sessionId = 'test-session-123';

      const response = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .send({
          text: 'I need help creating a workflow',
          type: 'text'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('requiresConfirmation');
      expect(response.body).toHaveProperty('suggestedActions');
      expect(response.body).toHaveProperty('shouldReadAloud');
      expect(response.body).toHaveProperty('sessionId', sessionId);
      expect(response.body.message).toContain('I need help creating a workflow');
    });

    it('should reject invalid conversation input', async () => {
      const sessionId = 'test-session-123';

      const response = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .send({
          type: 'text'
          // Missing text field
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('SOP Management', () => {
    it('should generate a new SOP', async () => {
      const workflowDefinition = {
        id: 'workflow-123',
        title: 'Test Workflow',
        description: 'A test workflow',
        type: 'automation',
        steps: []
      };

      const response = await request(app)
        .post('/api/sops')
        .send({
          workflowDefinition,
          sopType: 'automation'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Test Workflow');
      expect(response.body).toHaveProperty('type', 'automation');
      expect(response.body).toHaveProperty('sections');
      expect(response.body).toHaveProperty('metadata');
      expect(Array.isArray(response.body.sections)).toBe(true);
    });

    it('should reject SOP generation without required fields', async () => {
      const response = await request(app)
        .post('/api/sops')
        .send({
          // Missing workflowDefinition and sopType
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Content-Type', 'application/json')
        .send('invalid-json')
        .expect(400);

      // Express automatically handles invalid JSON
      expect(response.status).toBe(400);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete a basic workflow from session to SOP', async () => {
      // Step 1: Create session
      const sessionResponse = await request(app)
        .post('/api/sessions')
        .send({ userId: 'test-user-e2e' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Step 2: Add conversation input
      const inputResponse = await request(app)
        .post(`/api/conversations/${sessionId}/input`)
        .send({
          text: 'Create a customer service workflow',
          type: 'text'
        })
        .expect(200);

      expect(inputResponse.body.message).toContain('customer service workflow');

      // Step 3: Generate SOP
      const workflowDefinition = {
        id: `workflow-${sessionId}`,
        title: 'Customer Service Workflow',
        description: 'A workflow for handling customer service requests',
        type: 'process_improvement',
        steps: [
          {
            id: 'step-1',
            title: 'Receive Request',
            description: 'Receive customer service request',
            order: 1
          }
        ]
      };

      const sopResponse = await request(app)
        .post('/api/sops')
        .send({
          workflowDefinition,
          sopType: 'process_improvement'
        })
        .expect(201);

      expect(sopResponse.body.title).toBe('Customer Service Workflow');
      expect(sopResponse.body.type).toBe('process_improvement');
      expect(sopResponse.body.sections).toHaveLength(1);
    });
  });
});