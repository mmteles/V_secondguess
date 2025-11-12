/**
 * Test helpers and mocks for API integration tests
 */

// Mock service orchestrator for testing
export class MockServiceOrchestrator {
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  async startConversationWorkflow(userId: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Service orchestrator is not initialized');
    }
    return `session-${userId}-${Date.now()}`;
  }

  async processConversationInput(sessionId: string, input: any): Promise<any> {
    if (!this.initialized) {
      throw new Error('Service orchestrator is not initialized');
    }
    
    return {
      message: `Processed input: ${input.text || '[audio input]'}`,
      requiresConfirmation: false,
      suggestedActions: ['continue', 'clarify'],
      shouldReadAloud: true,
      sessionId,
      timestamp: new Date().toISOString()
    };
  }

  async generateSOPFromSession(sessionId: string, sopType: string): Promise<any> {
    if (!this.initialized) {
      throw new Error('Service orchestrator is not initialized');
    }

    return {
      id: `sop-${sessionId}-${Date.now()}`,
      title: 'Generated SOP Document',
      type: sopType,
      sections: [
        {
          id: 'section-1',
          title: 'Overview',
          content: 'This is a generated SOP document.',
          type: 'overview',
          order: 1
        }
      ],
      charts: [],
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  async exportSOPDocument(sopId: string, format: string): Promise<any> {
    if (!this.initialized) {
      throw new Error('Service orchestrator is not initialized');
    }

    return {
      downloadUrl: `/downloads/${sopId}.${format}`,
      format
    };
  }

  async getServiceHealth(): Promise<any> {
    return {
      overall: 'healthy',
      services: {
        'conversation-manager': {
          status: 'healthy',
          lastCheck: new Date().toISOString()
        }
      }
    };
  }

  async getServiceMetrics(): Promise<any> {
    return {
      activeConversations: 0,
      totalSOPsGenerated: 0,
      averageConversationDuration: 0,
      errorRate: 0,
      responseTime: {
        conversation: 100,
        sopGeneration: 500,
        export: 200
      }
    };
  }
}

// Mock conversation manager service
export class MockConversationManagerService {
  async startSession(userId: string): Promise<string> {
    return `session-${userId}-${Date.now()}`;
  }

  async processUserInput(sessionId: string, input: any): Promise<any> {
    return {
      message: `Processed: ${input.text || '[audio]'}`,
      requiresConfirmation: false,
      suggestedActions: [],
      shouldReadAloud: false
    };
  }

  async generateSummary(sessionId: string): Promise<any> {
    return {
      id: `workflow-${sessionId}`,
      title: 'Test Workflow',
      description: 'A test workflow description',
      type: 'automation',
      steps: []
    };
  }

  checkIterationLimit(sessionId: string): boolean {
    return false;
  }

  async finalizeWorkflow(sessionId: string): Promise<any> {
    return {
      id: `workflow-${sessionId}`,
      title: 'Finalized Workflow',
      description: 'A finalized workflow',
      type: 'automation',
      steps: [
        {
          id: 'step-1',
          title: 'First Step',
          description: 'The first step',
          order: 1,
          prerequisites: [],
          outcomes: []
        }
      ],
      inputs: [],
      outputs: [],
      dependencies: [],
      risks: []
    };
  }
}

// Mock SOP generator service
export class MockSOPGeneratorService {
  async generateSOP(workflowDefinition: any, sopType: string): Promise<any> {
    return {
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
    };
  }

  validateSOPCompleteness(sop: any): any {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
  }

  async updateSOP(sop: any, changes: any): Promise<any> {
    return {
      ...sop,
      ...changes,
      metadata: {
        ...sop.metadata,
        updatedAt: new Date().toISOString(),
        version: '1.1.0'
      }
    };
  }
}

// Mock document exporter service
export class MockDocumentExporterService {
  async exportDocument(sopId: string, format: string, options?: any): Promise<any> {
    return {
      filePath: `/downloads/${sopId}.${format}`,
      format,
      size: 1024,
      generatedAt: new Date().toISOString()
    };
  }
}