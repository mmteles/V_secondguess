/**
 * Tests for Text-to-Speech Service
 */

import { TextToSpeechServiceImpl } from '../text-to-speech-service';
import { TextToSpeechService, VoiceInfo, VoiceGender, VoiceType, SOPReadingOptions } from '@/interfaces';
import { AudioBuffer, VoiceConfiguration, SpeechOptions, AudioFormat } from '@/models';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock Google Cloud Text-to-Speech client
const mockSynthesizeSpeech = jest.fn();
const mockListVoices = jest.fn();

jest.mock('@google-cloud/text-to-speech', () => ({
  TextToSpeechClient: jest.fn().mockImplementation(() => ({
    synthesizeSpeech: mockSynthesizeSpeech,
    listVoices: mockListVoices,
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

// Mock config
jest.mock('@/utils/config', () => ({
  getConfig: jest.fn().mockReturnValue({
    services: {
      textToSpeech: {
        provider: 'google',
        apiKey: 'test-api-key',
        defaultVoice: 'en-US-Standard-A',
        audioFormat: 'mp3',
        sampleRate: 22050
      }
    }
  })
}));

// Mock Audio API for browser environment
(global as any).Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  volume: 1,
  currentTime: 0,
  duration: 10,
  paused: false,
  onended: null,
  onerror: null,
}));

(global as any).URL = {
  createObjectURL: jest.fn().mockReturnValue('mock-audio-url'),
  revokeObjectURL: jest.fn(),
};

(global as any).Blob = jest.fn().mockImplementation(() => ({}));

describe('TextToSpeechServiceImpl', () => {
  let ttsService: TextToSpeechService;
  let mockVoiceConfig: VoiceConfiguration;
  let mockSpeechOptions: SpeechOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock responses
    mockListVoices.mockResolvedValue([{
      voices: [
        {
          name: 'en-US-Standard-A',
          languageCodes: ['en-US'],
          ssmlGender: 'FEMALE'
        },
        {
          name: 'en-US-Standard-B',
          languageCodes: ['en-US'],
          ssmlGender: 'MALE'
        },
        {
          name: 'en-US-Neural2-A',
          languageCodes: ['en-US'],
          ssmlGender: 'FEMALE'
        }
      ]
    }]);

    mockSynthesizeSpeech.mockResolvedValue([{
      audioContent: new Uint8Array([1, 2, 3, 4, 5])
    }]);

    ttsService = new TextToSpeechServiceImpl();
    
    mockVoiceConfig = {
      voiceId: 'en-US-Standard-A',
      language: 'en-US',
      speed: 1.0,
      pitch: 0.0,
      volume: 1.0
    };

    mockSpeechOptions = {
      voice: mockVoiceConfig,
      audioFormat: AudioFormat.MP3,
      sampleRate: 22050
    };

    // Wait for service initialization
    return new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Service Initialization', () => {
    it('should initialize service successfully', async () => {
      expect(mockListVoices).toHaveBeenCalled();
      expect(ttsService.isReady()).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      // Clear existing mocks and set up failure
      jest.clearAllMocks();
      mockListVoices.mockRejectedValue(new Error('API Error'));
      
      const newService = new TextToSpeechServiceImpl();
      
      // Wait for initialization attempt to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(newService.isReady()).toBe(false);
    });
  });

  describe('Speech Synthesis', () => {
    it('should synthesize speech successfully', async () => {
      const text = 'Hello, this is a test message.';
      const result = await ttsService.synthesizeSpeech(text, mockSpeechOptions);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith({
        input: { text },
        voice: {
          languageCode: mockVoiceConfig.language,
          name: mockVoiceConfig.voiceId,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          sampleRateHertz: 22050,
          speakingRate: mockVoiceConfig.speed,
          pitch: mockVoiceConfig.pitch,
          volumeGainDb: expect.any(Number),
        },
      });

      expect(result).toEqual({
        data: expect.any(ArrayBuffer),
        sampleRate: 22050,
        channels: 1,
        duration: expect.any(Number),
        format: AudioFormat.MP3
      });
    });

    it('should use default options when none provided', async () => {
      const text = 'Test message';
      await ttsService.synthesizeSpeech(text);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { text },
          audioConfig: expect.objectContaining({
            audioEncoding: 'MP3'
          })
        })
      );
    });

    it('should handle synthesis errors', async () => {
      mockSynthesizeSpeech.mockRejectedValueOnce(new Error('Synthesis failed'));
      
      await expect(ttsService.synthesizeSpeech('test')).rejects.toThrow('Speech synthesis failed');
    });

    it('should handle empty audio content response', async () => {
      mockSynthesizeSpeech.mockResolvedValueOnce([{ audioContent: null }]);
      
      await expect(ttsService.synthesizeSpeech('test')).rejects.toThrow('No audio content received');
    });
  });

  describe('Voice Configuration', () => {
    it('should set and get voice configuration', () => {
      const newConfig: VoiceConfiguration = {
        voiceId: 'en-US-Standard-B',
        language: 'en-US',
        speed: 1.5,
        pitch: 2.0,
        volume: 0.8
      };

      ttsService.setVoiceConfiguration(newConfig);
      const retrievedConfig = ttsService.getVoiceConfiguration();

      expect(retrievedConfig).toEqual(newConfig);
    });

    it('should get available voices', async () => {
      const voices = await ttsService.getAvailableVoices();

      expect(voices).toHaveLength(3);
      expect(voices[0]).toEqual({
        id: 'en-US-Standard-A',
        name: 'en-US-Standard-A',
        language: 'en-US',
        gender: VoiceGender.FEMALE,
        type: VoiceType.STANDARD,
        sampleRate: 22050
      });
    });
  });

  describe('Session Management', () => {
    it('should start and end sessions', async () => {
      const sessionId = await ttsService.startSession();
      
      expect(sessionId).toMatch(/^tts-session-\d+-[a-z0-9]+$/);
      expect(ttsService.isReady()).toBe(true);

      await ttsService.endSession(sessionId);
    });
  });

  describe('Audio Playback Controls', () => {
    let mockAudio: any;

    beforeEach(() => {
      mockAudio = {
        play: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn(),
        volume: 1,
        currentTime: 0,
        duration: 10,
        paused: false,
        onended: null,
        onerror: null,
      };
      ((global as any).Audio as jest.Mock).mockReturnValue(mockAudio);
    });

    it('should play audio successfully', async () => {
      const audioBuffer: AudioBuffer = {
        data: new ArrayBuffer(1024),
        sampleRate: 22050,
        channels: 1,
        duration: 5.0,
        format: AudioFormat.MP3
      };

      const playPromise = ttsService.playAudio(audioBuffer);
      
      // Simulate audio ending
      if (mockAudio.onended) {
        mockAudio.onended();
      }

      await playPromise;

      expect((global as any).Audio).toHaveBeenCalled();
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should handle audio playback errors', async () => {
      const audioBuffer: AudioBuffer = {
        data: new ArrayBuffer(1024),
        sampleRate: 22050,
        channels: 1,
        duration: 5.0,
        format: AudioFormat.MP3
      };

      const playPromise = ttsService.playAudio(audioBuffer);
      
      // Simulate audio error
      if (mockAudio.onerror) {
        mockAudio.onerror(new Error('Playback failed'));
      }

      await expect(playPromise).rejects.toThrow();
    });

    it('should pause and resume playback', () => {
      ttsService.pausePlayback();
      expect(mockAudio.pause).not.toHaveBeenCalled(); // No current audio

      // Simulate having current audio
      (ttsService as any).currentAudio = mockAudio;
      
      ttsService.pausePlayback();
      expect(mockAudio.pause).toHaveBeenCalled();

      mockAudio.paused = true;
      ttsService.resumePlayback();
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should stop playback', () => {
      (ttsService as any).currentAudio = mockAudio;
      
      ttsService.stopPlayback();
      
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
      expect((ttsService as any).currentAudio).toBeNull();
    });
  });

  describe('SOP Reading Functionality', () => {
    const mockSOPDocument = {
      title: 'Test SOP Document',
      sections: [
        {
          type: 'overview',
          title: 'Overview',
          content: 'This is the overview section.',
          steps: [
            { description: 'First step description' },
            { description: 'Second step description' }
          ]
        },
        {
          type: 'steps',
          title: 'Main Steps',
          content: 'These are the main steps to follow.'
        }
      ]
    };

    it('should read SOP document successfully', async () => {
      const options: SOPReadingOptions = {
        includePauses: true,
        includeSectionTitles: true,
        readingSpeed: 1.0
      };

      // Mock playAudio to resolve immediately
      jest.spyOn(ttsService, 'playAudio').mockResolvedValue();

      await ttsService.readSOPDocument(mockSOPDocument, options);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            text: expect.stringContaining('Test SOP Document')
          })
        })
      );
    });

    it('should read specific SOP section', async () => {
      const section = mockSOPDocument.sections[0];
      
      // Mock playAudio to resolve immediately
      jest.spyOn(ttsService, 'playAudio').mockResolvedValue();
      
      await ttsService.readSOPSection(section);

      expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            text: expect.stringContaining('Overview')
          })
        })
      );
    });

    it('should filter sections based on reading options', async () => {
      const options: SOPReadingOptions = {
        sectionsToRead: ['overview']
      };

      // Mock playAudio to resolve immediately
      jest.spyOn(ttsService, 'playAudio').mockResolvedValue();

      await ttsService.readSOPDocument(mockSOPDocument, options);

      const lastCall = mockSynthesizeSpeech.mock.calls[mockSynthesizeSpeech.mock.calls.length - 1][0];
      const synthesizedText = lastCall.input.text;
      expect(synthesizedText).toContain('Overview');
      expect(synthesizedText).not.toContain('Main Steps');
    });

    it('should handle missing SOP document', async () => {
      await expect(ttsService.readSOPDocument(null)).rejects.toThrow('SOP document is required');
    });

    it('should handle missing SOP section', async () => {
      await expect(ttsService.readSOPSection(null)).rejects.toThrow('SOP section is required');
    });
  });

  describe('Reading Speed Control', () => {
    it('should set and get reading speed', () => {
      ttsService.setReadingSpeed(1.5);
      expect(ttsService.getReadingSpeed()).toBe(1.5);
    });

    it('should validate reading speed range', () => {
      expect(() => ttsService.setReadingSpeed(0.1)).toThrow('Reading speed must be between 0.25 and 4.0');
      expect(() => ttsService.setReadingSpeed(5.0)).toThrow('Reading speed must be between 0.25 and 4.0');
    });
  });

  describe('Playback Position Control', () => {
    let mockAudio: any;

    beforeEach(() => {
      mockAudio = {
        currentTime: 5.0,
        duration: 10.0,
        paused: false
      };
      (ttsService as any).currentAudio = mockAudio;
    });

    it('should get current playback position', () => {
      expect(ttsService.getCurrentPosition()).toBe(5.0);
    });

    it('should set playback position within bounds', () => {
      ttsService.setCurrentPosition(7.0);
      expect(mockAudio.currentTime).toBe(7.0);

      ttsService.setCurrentPosition(-1.0);
      expect(mockAudio.currentTime).toBe(0);

      ttsService.setCurrentPosition(15.0);
      expect(mockAudio.currentTime).toBe(10.0);
    });

    it('should check if currently reading', () => {
      expect(ttsService.isReading()).toBe(true);

      mockAudio.paused = true;
      expect(ttsService.isReading()).toBe(false);

      (ttsService as any).currentAudio = null;
      expect(ttsService.isReading()).toBe(false);
    });
  });

  describe('Audio Format Mapping', () => {
    it('should map audio formats correctly', async () => {
      const formats = [
        { format: AudioFormat.MP3, expected: 'MP3' },
        { format: AudioFormat.WAV, expected: 'LINEAR16' },
        { format: AudioFormat.OGG, expected: 'OGG_OPUS' },
      ];

      for (const { format, expected } of formats) {
        await ttsService.synthesizeSpeech('test', { audioFormat: format });
        
        expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
          expect.objectContaining({
            audioConfig: expect.objectContaining({
              audioEncoding: expected
            })
          })
        );
      }
    });
  });

  describe('Text Processing for Speech', () => {
    it('should process markdown formatting', async () => {
      const textWithMarkdown = '**Bold text** and *italic text* with `code` and [link](url)';
      
      // Mock playAudio to resolve immediately
      jest.spyOn(ttsService, 'playAudio').mockResolvedValue();
      
      await ttsService.readSOPSection({
        title: 'Test',
        content: textWithMarkdown
      });

      const lastCall = mockSynthesizeSpeech.mock.calls[mockSynthesizeSpeech.mock.calls.length - 1][0];
      const processedText = lastCall.input.text;
      expect(processedText).not.toContain('**');
      expect(processedText).not.toContain('*');
      expect(processedText).not.toContain('`');
      expect(processedText).not.toContain('[');
      expect(processedText).not.toContain(']');
      expect(processedText).not.toContain('(');
      expect(processedText).not.toContain(')');
    });

    it('should process bullet points', async () => {
      const textWithBullets = '- First item\n* Second item\n+ Third item';
      
      // Mock playAudio to resolve immediately
      jest.spyOn(ttsService, 'playAudio').mockResolvedValue();
      
      await ttsService.readSOPSection({
        title: 'Test',
        content: textWithBullets
      });

      const lastCall = mockSynthesizeSpeech.mock.calls[mockSynthesizeSpeech.mock.calls.length - 1][0];
      const processedText = lastCall.input.text;
      expect(processedText).toContain('Item:');
    });
  });
});