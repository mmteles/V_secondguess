/**
 * Conversation Manager Service Tests
 * Tests for conversation state transitions, iteration counting, and workflow information gathering
 */

import { ConversationManagerService } from '../conversation-manager-service';
import { 
  UserInput, 
  UserInputType, 
  ConversationState,
  WorkflowType,
  ComplexityLevel,
  TimeUnit
} from '@/models';
import { ConversationPhase } from '@/interfaces';

describe('ConversationManagerService', () => {
  let conversationManager: ConversationManagerService;
  let sessionId: string;
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    conversationManager = new ConversationManagerService();
    sessionId = await conversationManager.startSession(testUserId);
  });

  afterEach(() => {
    conversationManager.destroy();
  });

  describe('Session Management', () => {
    it('should create a new session successfully', async () => {
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session-test-user-123-\d+$/);
    });

    it('should initialize session with correct default state', async () => {
      const sessionState = await conversationManager.getSessionState(sessionId);
      
      expect(sessionState.isActive).toBe(true);
      expect(sessionState.currentPhase).toBe(ConversationPhase.INITIALIZATION);
      expect(sessionState.iterationCount).toBe(0);
      expect(sessionState.workflowCompleteness).toBe(0);
    });

    it('should handle session timeout correctly', async () => {
      // Simulate timeout by manipulating session state
      const response = await conversationManager.handleSessionTimeout(sessionId);
      
      expect(response.message).toContain('session has been saved');
      expect(response.metadata?.isTimeout).toBe(true);
      expect(response.metadata?.recoveryAvailable).toBe(true);
    });

    it('should recover session successfully', async () => {
      // First, create some session data
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'I need a workflow for document approval process',
        timestamp: new Date()
      };
      
      await conversationManager.processUserInput(sessionId, input);
      
      // Simulate session recovery
      const recovered = await conversationManager.recoverSession(sessionId, testUserId);
      expect(recovered).toBe(true);
    });
  });

  describe('Conversation Flow Orchestration', () => {
    it('should handle initialization phase correctly', async () => {
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'I want to create a workflow for employee onboarding',
        timestamp: new Date()
      };

      const response = await conversationManager.processUserInput(sessionId, input);
      
      expect(response.message).toContain('continue with more details');
      expect(response.nextState).toBe(ConversationState.GATHERING_DETAILS);
      expect(response.shouldReadAloud).toBe(true);
    });

    it('should transition through conversation phases correctly', async () => {
      // Initial input
      let input: UserInput = {
        type: UserInputType.VOICE,
        content: 'I need a workflow for document approval. First, employee submits document.',
        timestamp: new Date()
      };

      let response = await conversationManager.processUserInput(sessionId, input);
      expect(response.nextState).toBe(ConversationState.GATHERING_DETAILS);

      // Add more details
      input = {
        type: UserInputType.VOICE,
        content: 'Then manager reviews the document and either approves or rejects it.',
        timestamp: new Date()
      };

      response = await conversationManager.processUserInput(sessionId, input);
      expect(response.message).toContain("That's all or there is something missing?");
    });

    it('should handle validation phase with confirmations', async () => {
      // Set up session in validation phase
      const setupInput: UserInput = {
        type: UserInputType.VOICE,
        content: 'Document approval workflow with review and approval steps',
        timestamp: new Date()
      };
      
      await conversationManager.processUserInput(sessionId, setupInput);
      
      // Simulate validation confirmation
      const confirmationInput: UserInput = {
        type: UserInputType.CONFIRMATION,
        content: 'yes, that is correct',
        timestamp: new Date()
      };

      const sessionState = await conversationManager.getSessionState(sessionId);
      // Manually set to validation phase for testing
      sessionState.currentPhase = ConversationPhase.VALIDATION;

      const response = await conversationManager.processUserInput(sessionId, confirmationInput);
      expect(response.message).toContain('validated');
      expect(response.nextState).toBe(ConversationState.FINALIZATION);
    });
  });

  describe('Iteration Counting and Checkpoint Logic', () => {
    it('should track iteration count correctly', async () => {
      for (let i = 1; i <= 3; i++) {
        const input: UserInput = {
          type: UserInputType.VOICE,
          content: `Iteration ${i}: Adding more details to the workflow`,
          timestamp: new Date()
        };

        await conversationManager.processUserInput(sessionId, input);
        
        const sessionState = await conversationManager.getSessionState(sessionId);
        expect(sessionState.iterationCount).toBe(i);
      }
    });

    it('should trigger checkpoint at iteration limit', async () => {
      // Reach the iteration limit (5 iterations)
      for (let i = 1; i <= 5; i++) {
        const input: UserInput = {
          type: UserInputType.VOICE,
          content: `Iteration ${i}: More workflow details`,
          timestamp: new Date()
        };

        const response = await conversationManager.processUserInput(sessionId, input);
        
        if (i === 5) {
          expect(response.message).toContain('several iterations');
          expect(response.message).toContain('more time to review');
          expect(response.metadata?.isCheckpoint).toBe(true);
        }
      }
    });

    it('should check iteration limit correctly', () => {
      // Test with session below limit
      expect(conversationManager.checkIterationLimit(sessionId)).toBe(false);
      
      // This would require manipulating internal state or using a different approach
      // For now, we test the method exists and returns boolean
    });

    it('should handle user choice at checkpoint', async () => {
      // Simulate reaching checkpoint
      for (let i = 1; i <= 5; i++) {
        const input: UserInput = {
          type: UserInputType.VOICE,
          content: `Step ${i} of the process`,
          timestamp: new Date()
        };
        await conversationManager.processUserInput(sessionId, input);
      }

      // User chooses to continue
      const continueInput: UserInput = {
        type: UserInputType.CONFIRMATION,
        content: 'continue with current information',
        timestamp: new Date()
      };

      const response = await conversationManager.processUserInput(sessionId, continueInput);
      expect(response.nextState).toBe(ConversationState.VALIDATION);
    });
  });

  describe('Workflow Information Gathering', () => {
    it('should extract workflow title correctly', async () => {
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'I need a workflow for employee performance review process',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      const summary = await conversationManager.generateSummary(sessionId);
      
      expect(summary.title).toContain('employee performance review');
    });

    it('should identify workflow steps from description', async () => {
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'First, manager schedules review meeting. Then, employee completes self-assessment. Finally, manager provides feedback.',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      const summary = await conversationManager.generateSummary(sessionId);
      
      expect(summary.keySteps.length).toBeGreaterThan(0);
      expect(summary.keySteps.some(step => step.includes('manager schedules'))).toBe(true);
    });

    it('should extract inputs and outputs from conversation', async () => {
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'The process requires employee data and performance metrics as input. It produces a performance report and development plan.',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      const summary = await conversationManager.generateSummary(sessionId);
      
      expect(summary.identifiedInputs.length).toBeGreaterThan(0);
      expect(summary.identifiedOutputs.length).toBeGreaterThan(0);
    });

    it('should calculate workflow completeness accurately', async () => {
      // Start with minimal information
      let input: UserInput = {
        type: UserInputType.VOICE,
        content: 'Simple workflow',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      let sessionState = await conversationManager.getSessionState(sessionId);
      expect(sessionState.workflowCompleteness).toBeLessThan(50);

      // Add more comprehensive information
      input = {
        type: UserInputType.VOICE,
        content: 'Employee onboarding workflow that requires HR documents and employee information. First, collect documents. Then, create accounts. Finally, schedule orientation. This produces employee records and access credentials.',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      sessionState = await conversationManager.getSessionState(sessionId);
      expect(sessionState.workflowCompleteness).toBeGreaterThan(50);
    });

    it('should detect missing workflow elements', async () => {
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'Basic workflow description without details',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      const missingElements = await conversationManager.detectMissingElements(sessionId);
      
      expect(missingElements.length).toBeGreaterThan(0);
      expect(missingElements).toContain('Process Steps');
    });

    it('should generate targeted questions for missing information', async () => {
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'I have a process but not sure about the details',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      const questions = await conversationManager.getTargetedQuestions(sessionId);
      
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.includes('steps'))).toBe(true);
    });

    it('should generate clarification requests for ambiguous input', async () => {
      const ambiguousInput = 'Then it goes to someone who handles it somehow';
      
      const clarification = await conversationManager.generateClarificationRequest(sessionId, ambiguousInput);
      
      expect(clarification).toContain('more specific');
      expect(clarification.length).toBeGreaterThan(10);
    });
  });

  describe('Workflow Finalization', () => {
    it('should finalize workflow with complete metadata', async () => {
      // Set up a comprehensive workflow
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'Document approval workflow. Employee submits document, manager reviews, approves or rejects. Requires document and approval authority. Produces approved document or rejection notice.',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      const finalizedWorkflow = await conversationManager.finalizeWorkflow(sessionId);
      
      expect(finalizedWorkflow.id).toBeDefined();
      expect(finalizedWorkflow.title).toBeDefined();
      expect(finalizedWorkflow.metadata).toBeDefined();
      expect(finalizedWorkflow.metadata.author).toBe('AI Voice SOP Agent');
      expect(finalizedWorkflow.metadata.complexity).toBeOneOf([
        ComplexityLevel.LOW, 
        ComplexityLevel.MEDIUM, 
        ComplexityLevel.HIGH, 
        ComplexityLevel.VERY_HIGH
      ]);
    });

    it('should determine workflow category correctly', async () => {
      const trainingInput: UserInput = {
        type: UserInputType.VOICE,
        content: 'Training workflow for new employee learning and development',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, trainingInput);
      const workflow = await conversationManager.finalizeWorkflow(sessionId);
      
      expect(workflow.metadata.category).toBe('Training');
    });

    it('should estimate duration based on complexity', async () => {
      const complexInput: UserInput = {
        type: UserInputType.VOICE,
        content: 'Complex multi-step approval process with multiple reviewers, document validation, risk assessment, and final authorization',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, complexInput);
      const workflow = await conversationManager.finalizeWorkflow(sessionId);
      
      expect(workflow.metadata.estimatedDuration).toBeDefined();
      expect(workflow.metadata.estimatedDuration.value).toBeGreaterThan(0);
      expect(Object.values(TimeUnit)).toContain(workflow.metadata.estimatedDuration.unit);
    });
  });

  describe('Context Tracking', () => {
    it('should track conversation history', async () => {
      const inputs = [
        'First input about workflow',
        'Second input with more details',
        'Third input for clarification'
      ];

      for (const content of inputs) {
        const input: UserInput = {
          type: UserInputType.VOICE,
          content,
          timestamp: new Date()
        };
        await conversationManager.processUserInput(sessionId, input);
      }

      const history = await conversationManager.getConversationHistory(sessionId);
      expect(history.length).toBe(inputs.length);
      expect(history[0]?.content).toBe(inputs[0]);
    });

    it('should maintain summary history', async () => {
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'Workflow with multiple steps and requirements',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      const summaryHistory = await conversationManager.getSummaryHistory(sessionId);
      
      expect(summaryHistory.length).toBeGreaterThan(0);
      expect(summaryHistory[0]?.lastUpdated).toBeDefined();
    });

    it('should update and retrieve user choices', async () => {
      await conversationManager.updateUserChoice(sessionId, 'preference', 'detailed_summaries');
      const choice = await conversationManager.getUserChoice(sessionId, 'preference');
      
      expect(choice).toBe('detailed_summaries');
    });

    it('should track user interactions', async () => {
      await conversationManager.trackUserInteraction(sessionId, 'voice_input', { duration: 30 });
      
      // Verify interaction was tracked (this would typically be verified through analytics)
      const sessionState = await conversationManager.getSessionState(sessionId);
      expect(sessionState.lastActivity).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent session', async () => {
      const invalidSessionId = 'invalid-session-id';
      
      await expect(conversationManager.getSessionState(invalidSessionId))
        .rejects.toThrow('Session invalid-session-id not found');
    });

    it('should handle invalid user input gracefully', async () => {
      const invalidInput: UserInput = {
        type: UserInputType.VOICE,
        content: '', // Empty content
        timestamp: new Date()
      };

      await expect(conversationManager.processUserInput(sessionId, invalidInput))
        .rejects.toThrow('Invalid user input provided');
    });

    it('should handle session cleanup correctly', () => {
      // Test cleanup method exists and runs without error
      expect(() => conversationManager.cleanupExpiredSessions()).not.toThrow();
    });
  });

  describe('Session Recovery', () => {
    it('should provide recovery instructions', async () => {
      // Set up session with some data
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'Complex workflow with multiple steps',
        timestamp: new Date()
      };

      await conversationManager.processUserInput(sessionId, input);
      
      // Simulate recovery scenario
      await conversationManager.recoverSession(sessionId, testUserId);
      const instructions = await conversationManager.getRecoveryInstructions(sessionId);
      
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toContain('phase');
    });

    it('should handle session pause and resume', async () => {
      await conversationManager.pauseSession(sessionId);
      let sessionState = await conversationManager.getSessionState(sessionId);
      expect(sessionState.isActive).toBe(false);

      const resumed = await conversationManager.resumeSession(sessionId);
      expect(resumed).toBe(true);
      
      sessionState = await conversationManager.getSessionState(sessionId);
      expect(sessionState.isActive).toBe(true);
    });
  });
});

// Custom Jest matcher for testing enum values
expect.extend({
  toBeOneOf(received, validOptions) {
    const pass = validOptions.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${validOptions.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${validOptions.join(', ')}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(validOptions: any[]): R;
    }
  }
}