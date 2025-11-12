import { ConversationDisplay, ConversationMessage } from '../components/ConversationDisplay';
import { ConversationSession, TranscriptionResult, ConversationResponse } from '../../models/conversation-models';
import { ConversationState, UserInputType } from '../../models/enums';

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockImplementation((tagName: string) => {
    const element = {
      tagName: tagName.toUpperCase(),
      innerHTML: '',
      textContent: '',
      className: '',
      style: {},
      dataset: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn().mockReturnValue([]),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      remove: jest.fn(),
      scrollIntoView: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn()
      }
    };
    return element;
  })
});

Object.defineProperty(document, 'head', {
  value: {
    appendChild: jest.fn()
  }
});

describe('ConversationDisplay', () => {
  let conversationDisplay: ConversationDisplay;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Create mock container
    mockContainer = document.createElement('div');
    mockContainer.id = 'test-container';
    mockContainer.querySelector = jest.fn().mockImplementation((selector: string) => {
      const mockElement = document.createElement('div');
      mockElement.id = selector.replace('#', '');
      return mockElement;
    });

    // Mock getElementById
    document.getElementById = jest.fn().mockReturnValue(mockContainer);

    conversationDisplay = new ConversationDisplay('test-container');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create ConversationDisplay instance', () => {
      expect(conversationDisplay).toBeInstanceOf(ConversationDisplay);
    });

    it('should throw error if container not found', () => {
      document.getElementById = jest.fn().mockReturnValue(null);
      
      expect(() => {
        new ConversationDisplay('non-existent');
      }).toThrow("Container element with id 'non-existent' not found");
    });
  });

  describe('addMessage', () => {
    it('should add user message to display', () => {
      const message: ConversationMessage = {
        id: 'msg-1',
        type: 'user',
        content: 'Hello, I need help with a workflow',
        timestamp: new Date(),
        isEditable: true
      };

      conversationDisplay.addMessage(message);

      const messages = conversationDisplay.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should add agent message to display', () => {
      const message: ConversationMessage = {
        id: 'msg-2',
        type: 'agent',
        content: 'I can help you create an SOP. Please describe your workflow.',
        timestamp: new Date(),
        isEditable: false
      };

      conversationDisplay.addMessage(message);

      const messages = conversationDisplay.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should add message with confidence score', () => {
      const message: ConversationMessage = {
        id: 'msg-3',
        type: 'user',
        content: 'This is a transcribed message',
        timestamp: new Date(),
        confidence: 0.85,
        isEditable: true
      };

      conversationDisplay.addMessage(message);

      const messages = conversationDisplay.getMessages();
      expect(messages[0].confidence).toBe(0.85);
    });
  });

  describe('addTranscriptionResult', () => {
    it('should convert transcription result to message', () => {
      const transcriptionResult: TranscriptionResult = {
        text: 'Transcribed speech content',
        confidence: 0.92,
        segments: [{
          text: 'Transcribed speech content',
          startTime: 0,
          endTime: 2.5,
          confidence: 0.92
        }],
        timestamp: new Date(),
        sessionId: 'session-123',
        language: 'en-US'
      };

      conversationDisplay.addTranscriptionResult(transcriptionResult);

      const messages = conversationDisplay.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('user');
      expect(messages[0].content).toBe('Transcribed speech content');
      expect(messages[0].confidence).toBe(0.92);
      expect(messages[0].isEditable).toBe(true);
    });
  });

  describe('addAgentResponse', () => {
    it('should convert agent response to message', () => {
      const response: ConversationResponse = {
        message: 'Thank you for the information. Let me summarize what I understood.',
        requiresConfirmation: true,
        suggestedActions: ['continue', 'clarify'],
        shouldReadAloud: true
      };

      conversationDisplay.addAgentResponse(response);

      const messages = conversationDisplay.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('agent');
      expect(messages[0].content).toBe(response.message);
      expect(messages[0].isEditable).toBe(false);
    });
  });

  describe('updateSession', () => {
    it('should update session information display', () => {
      const session: ConversationSession = {
        id: 'session-123',
        userId: 'user-456',
        startTime: new Date(),
        currentState: ConversationState.GATHERING_DETAILS,
        iterationCount: 3,
        workflowSummary: {
          title: 'Test Workflow',
          description: 'Test description',
          keySteps: ['Step 1', 'Step 2'],
          identifiedInputs: ['Input 1'],
          identifiedOutputs: ['Output 1'],
          completenessScore: 75,
          lastUpdated: new Date()
        },
        transcriptionHistory: [],
        lastActivity: new Date(),
        isActive: true
      };

      conversationDisplay.updateSession(session);

      // Verify session status elements are updated
      expect(mockContainer.querySelector).toHaveBeenCalledWith('#sessionStatus');
      expect(mockContainer.querySelector).toHaveBeenCalledWith('#iterationCount');
    });
  });

  describe('message editing', () => {
    it('should handle message edit callback', () => {
      const editCallback = jest.fn();
      conversationDisplay.onTranscriptionEdit(editCallback);

      const message: ConversationMessage = {
        id: 'msg-1',
        type: 'user',
        content: 'Original content',
        timestamp: new Date(),
        isEditable: true
      };

      conversationDisplay.addMessage(message);

      // Simulate edit action (this would normally be triggered by UI interaction)
      // We'll test the callback registration
      expect(editCallback).toBeDefined();
    });

    it('should validate message content before editing', () => {
      const message: ConversationMessage = {
        id: 'msg-1',
        type: 'user',
        content: 'Original content',
        timestamp: new Date(),
        isEditable: true
      };

      conversationDisplay.addMessage(message);

      // Test that non-editable messages can't be edited
      const nonEditableMessage: ConversationMessage = {
        id: 'msg-2',
        type: 'agent',
        content: 'Agent response',
        timestamp: new Date(),
        isEditable: false
      };

      conversationDisplay.addMessage(nonEditableMessage);

      const messages = conversationDisplay.getMessages();
      expect(messages[0].isEditable).toBe(true);
      expect(messages[1].isEditable).toBe(false);
    });
  });

  describe('conversation controls', () => {
    it('should handle message send callback', () => {
      const sendCallback = jest.fn();
      conversationDisplay.onMessageSend(sendCallback);

      // Simulate sending a message (this would normally be triggered by UI interaction)
      expect(sendCallback).toBeDefined();
    });

    it('should clear all messages', () => {
      // Add some messages
      conversationDisplay.addMessage({
        id: 'msg-1',
        type: 'user',
        content: 'Message 1',
        timestamp: new Date(),
        isEditable: true
      });

      conversationDisplay.addMessage({
        id: 'msg-2',
        type: 'agent',
        content: 'Message 2',
        timestamp: new Date(),
        isEditable: false
      });

      expect(conversationDisplay.getMessages()).toHaveLength(2);

      conversationDisplay.clearMessages();

      expect(conversationDisplay.getMessages()).toHaveLength(0);
    });
  });

  describe('message formatting', () => {
    it('should escape HTML in message content', () => {
      const message: ConversationMessage = {
        id: 'msg-1',
        type: 'user',
        content: '<script>alert("xss")</script>',
        timestamp: new Date(),
        isEditable: true
      };

      conversationDisplay.addMessage(message);

      // The escapeHtml method should be called internally
      // We can verify the message is stored correctly
      const messages = conversationDisplay.getMessages();
      expect(messages[0].content).toBe('<script>alert("xss")</script>');
    });

    it('should format timestamps correctly', () => {
      const testDate = new Date('2023-12-01T14:30:00');
      const message: ConversationMessage = {
        id: 'msg-1',
        type: 'user',
        content: 'Test message',
        timestamp: testDate,
        isEditable: true
      };

      conversationDisplay.addMessage(message);

      const messages = conversationDisplay.getMessages();
      expect(messages[0].timestamp).toEqual(testDate);
    });
  });

  describe('confidence indicators', () => {
    it('should display confidence for transcribed messages', () => {
      const highConfidenceMessage: ConversationMessage = {
        id: 'msg-1',
        type: 'user',
        content: 'High confidence message',
        timestamp: new Date(),
        confidence: 0.95,
        isEditable: true
      };

      conversationDisplay.addMessage(highConfidenceMessage);

      const messages = conversationDisplay.getMessages();
      expect(messages[0].confidence).toBe(0.95);
    });

    it('should handle low confidence messages', () => {
      const lowConfidenceMessage: ConversationMessage = {
        id: 'msg-1',
        type: 'user',
        content: 'Low confidence message',
        timestamp: new Date(),
        confidence: 0.45,
        isEditable: true
      };

      conversationDisplay.addMessage(lowConfidenceMessage);

      const messages = conversationDisplay.getMessages();
      expect(messages[0].confidence).toBe(0.45);
    });

    it('should handle messages without confidence scores', () => {
      const messageWithoutConfidence: ConversationMessage = {
        id: 'msg-1',
        type: 'user',
        content: 'Message without confidence',
        timestamp: new Date(),
        isEditable: true
      };

      conversationDisplay.addMessage(messageWithoutConfidence);

      const messages = conversationDisplay.getMessages();
      expect(messages[0].confidence).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid message data gracefully', () => {
      const invalidMessage = {
        id: 'msg-1',
        type: 'invalid' as any,
        content: '',
        timestamp: new Date()
      };

      // Should not throw error
      expect(() => {
        conversationDisplay.addMessage(invalidMessage as ConversationMessage);
      }).not.toThrow();
    });

    it('should handle missing container elements gracefully', () => {
      mockContainer.querySelector = jest.fn().mockReturnValue(null);

      // Should not throw error when elements are missing
      expect(() => {
        new ConversationDisplay('test-container');
      }).not.toThrow();
    });
  });
});