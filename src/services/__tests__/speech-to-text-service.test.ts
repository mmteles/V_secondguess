/**
 * Tests for Speech-to-Text Service
 */

import { SpeechToTextServiceImpl } from '../speech-to-text-service';
import { SpeechToTextService } from '@/interfaces';
import { AudioStream, AudioFormat, TranscriptionResult } from '@/models';

// Mock Google Cloud Speech client
const mockRecognize = jest.fn();
const mockStreamingRecognize = jest.fn();
const mockInitialize = jest.fn();

jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    recognize: mockRecognize,
    streamingRecognize: mockStreamingRecognize,
    initialize: mockInitialize,
  })),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SpeechToTextServiceImpl', () => {
  let sttService: SpeechToTextService;
  let mockAudioStream: AudioStream;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
    
    sttService = new SpeechToTextServiceImpl();
    
    mockAudioStream = {
      data: new ArrayBuffer(1024),
      sampleRate: 16000,
      channels: 1,
      format: AudioFormat.WAV,
      timestamp: new Date(),
    };

    // Wait for service initialization
    return new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(sttService).toBeInstanceOf(SpeechToTextServiceImpl);
      expect(mockInitialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockInitialize.mockRejectedValueOnce(new Error('Auth failed'));
      
      const failingService = new SpeechToTextServiceImpl();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(failingService.isReady()).toBe(false);
    });
  });

  describe('language management', () => {
    it('should set and get current language', () => {
      expect(sttService.getCurrentLanguage()).toBe('en-US');
      
      sttService.setLanguage('es-ES');
      expect(sttService.getCurrentLanguage()).toBe('es-ES');
    });
  });

  describe('session management', () => {
    it('should start and end sessions', async () => {
      const sessionId = await sttService.startSession();
      
      expect(sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);
      
      await sttService.endSession(sessionId);
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should handle ending non-existent session', async () => {
      await sttService.endSession('non-existent-session');
      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('transcription', () => {
    beforeEach(() => {
      // Mock successful recognition response
      mockRecognize.mockResolvedValue([{
        results: [{
          alternatives: [{
            transcript: 'Hello world',
            confidence: 0.95,
            words: [
              {
                word: 'Hello',
                startTime: { seconds: 0, nanos: 0 },
                endTime: { seconds: 0, nanos: 500000000 },
                confidence: 0.96,
              },
              {
                word: 'world',
                startTime: { seconds: 0, nanos: 500000000 },
                endTime: { seconds: 1, nanos: 0 },
                confidence: 0.94,
              },
            ],
          }],
        }],
      }]);
    });

    it('should transcribe audio successfully', async () => {
      const result = await sttService.transcribe(mockAudioStream);
      
      expect(result).toHaveProperty('text', 'Hello world');
      expect(result).toHaveProperty('confidence', 0.95);
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toHaveProperty('text', 'Hello');
      expect(result.segments[1]).toHaveProperty('text', 'world');
      expect(result).toHaveProperty('language', 'en-US');
    });

    it('should handle empty recognition results', async () => {
      mockRecognize.mockResolvedValue([{ results: [] }]);
      
      const result = await sttService.transcribe(mockAudioStream);
      
      expect(result.text).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.segments).toHaveLength(0);
    });

    it('should handle recognition errors', async () => {
      mockRecognize.mockRejectedValue(new Error('API Error'));
      
      await expect(sttService.transcribe(mockAudioStream)).rejects.toThrow(
        'Transcription failed'
      );
    });

    it('should throw error when service not ready', async () => {
      const unreadyService = new SpeechToTextServiceImpl();
      // Don't wait for initialization
      
      await expect(unreadyService.transcribe(mockAudioStream)).rejects.toThrow(
        'Speech-to-Text service not ready'
      );
    });

    it('should handle results without word timing', async () => {
      mockRecognize.mockResolvedValue([{
        results: [{
          alternatives: [{
            transcript: 'Hello world',
            confidence: 0.95,
            // No words array
          }],
        }],
      }]);

      const result = await sttService.transcribe(mockAudioStream);
      
      expect(result.text).toBe('Hello world');
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]!.text).toBe('Hello world');
    });
  });

  // Note: Streaming transcription is not part of the public interface

  describe('confidence scoring', () => {
    it('should calculate confidence score for segments', () => {
      expect(sttService.getConfidenceScore('')).toBe(0);
      expect(sttService.getConfidenceScore('Hello')).toBeGreaterThan(0.7);
      expect(sttService.getConfidenceScore('Hello world.')).toBeGreaterThan(0.8);
      expect(sttService.getConfidenceScore('This is a longer sentence with proper punctuation.')).toBeGreaterThan(0.9);
    });
  });

  // Note: Transcription validation is not part of the public interface

  describe('audio format handling', () => {
    it('should handle different audio formats', async () => {
      const formats = [
        { format: AudioFormat.WAV, expected: 'LINEAR16' },
        { format: AudioFormat.FLAC, expected: 'FLAC' },
        { format: AudioFormat.OGG, expected: 'OGG_OPUS' },
        { format: AudioFormat.MP3, expected: 'MP3' },
      ];

      for (const { format } of formats) {
        const audioStream = { ...mockAudioStream, format };
        
        mockRecognize.mockResolvedValueOnce([{
          results: [{
            alternatives: [{
              transcript: 'Test',
              confidence: 0.95,
            }],
          }],
        }]);

        const result = await sttService.transcribe(audioStream);
        expect(result.text).toBe('Test');
      }
    });
  });
});