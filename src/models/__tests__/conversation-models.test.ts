import {
  ConversationSession,
  UserInput,
  TranscriptionResult,
  TranscriptionSegment,
  WorkflowSummary,
  AudioStream,
  VoiceConfiguration,
  validateConversationSession,
  validateUserInput,
  validateTranscriptionResult,
  validateTranscriptionSegment,
  validateWorkflowSummary,
  validateAudioStream,
  validateVoiceConfiguration,
  AudioFormat
} from '../conversation-models';
import { ConversationState, UserInputType } from '../enums';

describe('Conversation Models Validation', () => {
  describe('validateConversationSession', () => {
    it('should validate a valid conversation session', () => {
      const session: ConversationSession = {
        id: 'session-123',
        userId: 'user-456',
        startTime: new Date(),
        currentState: ConversationState.INITIAL_DESCRIPTION,
        iterationCount: 2,
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

      expect(validateConversationSession(session)).toBe(true);
    });

    it('should reject session with missing required fields', () => {
      const session = {
        userId: 'user-456',
        startTime: new Date(),
        currentState: ConversationState.INITIAL_DESCRIPTION,
        iterationCount: 2
      } as ConversationSession;

      expect(validateConversationSession(session)).toBe(false);
    });

    it('should reject session with invalid iteration count', () => {
      const session: ConversationSession = {
        id: 'session-123',
        userId: 'user-456',
        startTime: new Date(),
        currentState: ConversationState.INITIAL_DESCRIPTION,
        iterationCount: -1,
        workflowSummary: {
          title: 'Test Workflow',
          description: 'Test description',
          keySteps: [],
          identifiedInputs: [],
          identifiedOutputs: [],
          completenessScore: 75,
          lastUpdated: new Date()
        },
        transcriptionHistory: [],
        lastActivity: new Date(),
        isActive: true
      };

      expect(validateConversationSession(session)).toBe(false);
    });
  });

  describe('validateUserInput', () => {
    it('should validate valid user input', () => {
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'Test content',
        timestamp: new Date(),
        confidence: 0.95
      };

      expect(validateUserInput(input)).toBe(true);
    });

    it('should reject input with invalid confidence score', () => {
      const input: UserInput = {
        type: UserInputType.VOICE,
        content: 'Test content',
        timestamp: new Date(),
        confidence: 1.5
      };

      expect(validateUserInput(input)).toBe(false);
    });

    it('should reject input with missing content', () => {
      const input = {
        type: UserInputType.VOICE,
        timestamp: new Date()
      } as UserInput;

      expect(validateUserInput(input)).toBe(false);
    });
  });

  describe('validateTranscriptionResult', () => {
    it('should validate valid transcription result', () => {
      const segment: TranscriptionSegment = {
        text: 'Hello world',
        startTime: 0,
        endTime: 2,
        confidence: 0.9
      };

      const result: TranscriptionResult = {
        text: 'Hello world',
        confidence: 0.9,
        segments: [segment],
        timestamp: new Date(),
        sessionId: 'session-123',
        language: 'en-US'
      };

      expect(validateTranscriptionResult(result)).toBe(true);
    });

    it('should reject result with invalid confidence', () => {
      const segment: TranscriptionSegment = {
        text: 'Hello world',
        startTime: 0,
        endTime: 2,
        confidence: 0.9
      };

      const result: TranscriptionResult = {
        text: 'Hello world',
        confidence: -0.1,
        segments: [segment],
        timestamp: new Date(),
        sessionId: 'session-123',
        language: 'en-US'
      };

      expect(validateTranscriptionResult(result)).toBe(false);
    });

    it('should reject result with empty segments', () => {
      const result: TranscriptionResult = {
        text: 'Hello world',
        confidence: 0.9,
        segments: [],
        timestamp: new Date(),
        sessionId: 'session-123',
        language: 'en-US'
      };

      expect(validateTranscriptionResult(result)).toBe(false);
    });
  });

  describe('validateTranscriptionSegment', () => {
    it('should validate valid transcription segment', () => {
      const segment: TranscriptionSegment = {
        text: 'Hello world',
        startTime: 0,
        endTime: 2,
        confidence: 0.9
      };

      expect(validateTranscriptionSegment(segment)).toBe(true);
    });

    it('should reject segment with invalid time range', () => {
      const segment: TranscriptionSegment = {
        text: 'Hello world',
        startTime: 2,
        endTime: 1,
        confidence: 0.9
      };

      expect(validateTranscriptionSegment(segment)).toBe(false);
    });
  });

  describe('validateWorkflowSummary', () => {
    it('should validate valid workflow summary', () => {
      const summary: WorkflowSummary = {
        title: 'Test Workflow',
        description: 'Test description',
        keySteps: ['Step 1', 'Step 2'],
        identifiedInputs: ['Input 1'],
        identifiedOutputs: ['Output 1'],
        completenessScore: 75,
        lastUpdated: new Date()
      };

      expect(validateWorkflowSummary(summary)).toBe(true);
    });

    it('should reject summary with invalid completeness score', () => {
      const summary: WorkflowSummary = {
        title: 'Test Workflow',
        description: 'Test description',
        keySteps: ['Step 1', 'Step 2'],
        identifiedInputs: ['Input 1'],
        identifiedOutputs: ['Output 1'],
        completenessScore: 150,
        lastUpdated: new Date()
      };

      expect(validateWorkflowSummary(summary)).toBe(false);
    });
  });

  describe('validateAudioStream', () => {
    it('should validate valid audio stream', () => {
      const stream: AudioStream = {
        data: new ArrayBuffer(1024),
        sampleRate: 44100,
        channels: 2,
        format: AudioFormat.WAV,
        timestamp: new Date()
      };

      expect(validateAudioStream(stream)).toBe(true);
    });

    it('should reject stream with invalid sample rate', () => {
      const stream: AudioStream = {
        data: new ArrayBuffer(1024),
        sampleRate: -1,
        channels: 2,
        format: AudioFormat.WAV,
        timestamp: new Date()
      };

      expect(validateAudioStream(stream)).toBe(false);
    });
  });

  describe('validateVoiceConfiguration', () => {
    it('should validate valid voice configuration', () => {
      const config: VoiceConfiguration = {
        voiceId: 'voice-123',
        language: 'en-US',
        speed: 1.0,
        pitch: 0.0,
        volume: 0.8
      };

      expect(validateVoiceConfiguration(config)).toBe(true);
    });

    it('should reject configuration with invalid speed', () => {
      const config: VoiceConfiguration = {
        voiceId: 'voice-123',
        language: 'en-US',
        speed: 5.0,
        pitch: 0.0,
        volume: 0.8
      };

      expect(validateVoiceConfiguration(config)).toBe(false);
    });

    it('should reject configuration with invalid pitch', () => {
      const config: VoiceConfiguration = {
        voiceId: 'voice-123',
        language: 'en-US',
        speed: 1.0,
        pitch: 25.0,
        volume: 0.8
      };

      expect(validateVoiceConfiguration(config)).toBe(false);
    });
  });
});