/**
 * Tests for audio processing utilities
 */

import {
  AudioCapture,
  AudioStreamer,
  validateAudioQualityMetrics,
  AudioQualityMetrics,
  AudioCaptureOptions,
  StreamingOptions,
} from '../audio-utils';
import { AudioStream, AudioFormat } from '@/models';

// Mock Web Audio API for testing
const mockAudioContext = {
  createAnalyser: jest.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn(),
    getByteTimeDomainData: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  createScriptProcessor: jest.fn(() => ({
    onaudioprocess: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
  })),
  state: 'running',
  resume: jest.fn(),
  close: jest.fn(),
};

const mockTrack = { stop: jest.fn() };
const mockMediaStream = {
  getTracks: jest.fn(() => [mockTrack]),
};

// Mock navigator.mediaDevices
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: jest.fn(() => Promise.resolve(mockMediaStream)),
    },
  },
  writable: true,
});

// Mock window.AudioContext
Object.defineProperty(global, 'window', {
  value: {
    AudioContext: jest.fn(() => mockAudioContext),
  },
  writable: true,
});

describe('AudioCapture', () => {
  let audioCapture: AudioCapture;

  beforeEach(() => {
    jest.clearAllMocks();
    audioCapture = new AudioCapture();
  });

  afterEach(async () => {
    if (audioCapture) {
      await audioCapture.cleanup();
    }
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      expect(audioCapture).toBeInstanceOf(AudioCapture);
    });

    it('should initialize with custom options', () => {
      const options: AudioCaptureOptions = {
        sampleRate: 44100,
        channels: 2,
        format: AudioFormat.FLAC,
        echoCancellation: false,
      };
      
      const customCapture = new AudioCapture(options);
      expect(customCapture).toBeInstanceOf(AudioCapture);
    });

    it('should initialize audio context and media stream', async () => {
      await audioCapture.initialize();
      
      expect((global as any).navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    });

    it('should handle initialization errors', async () => {
      ((global as any).navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      await expect(audioCapture.initialize()).rejects.toThrow(
        'Failed to initialize audio capture'
      );
    });
  });

  describe('audio capture', () => {
    beforeEach(async () => {
      await audioCapture.initialize();
    });

    it('should start and stop capture', () => {
      const mockCallback = jest.fn();
      
      audioCapture.startCapture(mockCallback);
      audioCapture.stopCapture();
      
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should throw error when starting capture without initialization', () => {
      const uninitializedCapture = new AudioCapture();
      const mockCallback = jest.fn();
      
      expect(() => uninitializedCapture.startCapture(mockCallback)).toThrow(
        'Audio capture not initialized'
      );
    });
  });

  describe('audio quality metrics', () => {
    beforeEach(async () => {
      await audioCapture.initialize();
    });

    it('should get audio quality metrics', () => {
      // Mock analyser data
      const mockAnalyser = mockAudioContext.createAnalyser();
      mockAnalyser.getByteFrequencyData.mockImplementation((array: Uint8Array) => {
        // Fill with sample data
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 255);
        }
      });
      mockAnalyser.getByteTimeDomainData.mockImplementation((array: Uint8Array) => {
        // Fill with sample data
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.floor(Math.random() * 50 - 25);
        }
      });

      const metrics = audioCapture.getAudioQualityMetrics();
      
      expect(metrics).toHaveProperty('signalToNoiseRatio');
      expect(metrics).toHaveProperty('averageAmplitude');
      expect(metrics).toHaveProperty('peakAmplitude');
      expect(metrics).toHaveProperty('silenceRatio');
      expect(metrics).toHaveProperty('clippingDetected');
    });

    it('should throw error when getting metrics without initialization', () => {
      const uninitializedCapture = new AudioCapture();
      
      expect(() => uninitializedCapture.getAudioQualityMetrics()).toThrow(
        'Audio capture not initialized'
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await audioCapture.initialize();
      await audioCapture.cleanup();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });
});

describe('AudioStreamer', () => {
  let audioStreamer: AudioStreamer;
  let mockAudioStream: AudioStream;

  beforeEach(() => {
    audioStreamer = new AudioStreamer();
    mockAudioStream = {
      data: new ArrayBuffer(1024),
      sampleRate: 16000,
      channels: 1,
      format: AudioFormat.WAV,
      timestamp: new Date(),
    };
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      expect(audioStreamer).toBeInstanceOf(AudioStreamer);
    });

    it('should initialize with custom options', () => {
      const options: StreamingOptions = {
        chunkSize: 8192,
        overlap: 1024,
        bufferTime: 200,
      };
      
      const customStreamer = new AudioStreamer(options);
      expect(customStreamer).toBeInstanceOf(AudioStreamer);
    });
  });

  describe('audio streaming', () => {
    it('should add audio data to buffer', () => {
      audioStreamer.addAudioData(mockAudioStream);
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should process chunks when buffer is large enough', () => {
      const mockCallback = jest.fn();
      audioStreamer.setChunkCallback(mockCallback);

      // Add multiple audio streams to trigger chunk processing
      for (let i = 0; i < 10; i++) {
        audioStreamer.addAudioData(mockAudioStream);
      }

      // Should have processed at least one chunk
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should clear buffer', () => {
      audioStreamer.addAudioData(mockAudioStream);
      audioStreamer.clearBuffer();
      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});

describe('validateAudioQualityMetrics', () => {
  it('should validate good quality audio', () => {
    const goodMetrics: AudioQualityMetrics = {
      signalToNoiseRatio: 25,
      averageAmplitude: 50,
      peakAmplitude: 200,
      silenceRatio: 0.1,
      clippingDetected: false,
    };

    const result = validateAudioQualityMetrics(goodMetrics);
    
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.recommendations).toHaveLength(0);
  });

  it('should detect low signal-to-noise ratio', () => {
    const poorMetrics: AudioQualityMetrics = {
      signalToNoiseRatio: 5,
      averageAmplitude: 50,
      peakAmplitude: 200,
      silenceRatio: 0.1,
      clippingDetected: false,
    };

    const result = validateAudioQualityMetrics(poorMetrics);
    
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Low signal-to-noise ratio detected');
    expect(result.recommendations).toContain('Move closer to microphone or reduce background noise');
  });

  it('should detect audio clipping', () => {
    const clippedMetrics: AudioQualityMetrics = {
      signalToNoiseRatio: 25,
      averageAmplitude: 50,
      peakAmplitude: 200,
      silenceRatio: 0.1,
      clippingDetected: true,
    };

    const result = validateAudioQualityMetrics(clippedMetrics);
    
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Audio clipping detected');
    expect(result.recommendations).toContain('Reduce microphone gain or speak softer');
  });

  it('should detect excessive silence', () => {
    const silentMetrics: AudioQualityMetrics = {
      signalToNoiseRatio: 25,
      averageAmplitude: 50,
      peakAmplitude: 200,
      silenceRatio: 0.9,
      clippingDetected: false,
    };

    const result = validateAudioQualityMetrics(silentMetrics);
    
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Excessive silence detected');
    expect(result.recommendations).toContain('Speak louder or check microphone connection');
  });

  it('should detect low audio levels', () => {
    const lowMetrics: AudioQualityMetrics = {
      signalToNoiseRatio: 25,
      averageAmplitude: 2,
      peakAmplitude: 200,
      silenceRatio: 0.1,
      clippingDetected: false,
    };

    const result = validateAudioQualityMetrics(lowMetrics);
    
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Very low audio levels');
    expect(result.recommendations).toContain('Increase microphone volume or speak louder');
  });

  it('should detect high audio levels', () => {
    const highMetrics: AudioQualityMetrics = {
      signalToNoiseRatio: 25,
      averageAmplitude: 50,
      peakAmplitude: 250,
      silenceRatio: 0.1,
      clippingDetected: false,
    };

    const result = validateAudioQualityMetrics(highMetrics);
    
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Audio levels too high');
    expect(result.recommendations).toContain('Reduce microphone gain or speak softer');
  });

  it('should handle multiple quality issues', () => {
    const poorMetrics: AudioQualityMetrics = {
      signalToNoiseRatio: 5,
      averageAmplitude: 2,
      peakAmplitude: 250,
      silenceRatio: 0.9,
      clippingDetected: true,
    };

    const result = validateAudioQualityMetrics(poorMetrics);
    
    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(1);
    expect(result.recommendations.length).toBeGreaterThan(1);
  });
});