import { VoiceInterface } from '../components/VoiceInterface';
import { AudioStream, AudioFormat } from '../../models/conversation-models';

// Mock Web Audio API
const mockAudioContext = {
  createAnalyser: jest.fn().mockReturnValue({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn()
  }),
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  close: jest.fn().mockResolvedValue(undefined),
  sampleRate: 44100
};

const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null as any,
  onstop: null as any,
  state: 'inactive' as const,
  stream: {
    getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
  }
};

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
    })
  },
  writable: true
});

// Mock MediaRecorder
(global as any).MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder);
(global as any).MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

// Mock AudioContext
(global as any).AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
(global as any).webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

describe('VoiceInterface', () => {
  let voiceInterface: VoiceInterface;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.getContext = jest.fn().mockReturnValue({
      fillStyle: '',
      fillRect: jest.fn(),
      clearRect: jest.fn()
    });

    voiceInterface = new VoiceInterface(mockCanvas);
  });

  afterEach(() => {
    if (voiceInterface.listening) {
      voiceInterface.stopListening();
    }
  });

  describe('constructor', () => {
    it('should create VoiceInterface instance', () => {
      expect(voiceInterface).toBeInstanceOf(VoiceInterface);
    });

    it('should accept optional canvas element', () => {
      const interfaceWithoutCanvas = new VoiceInterface();
      expect(interfaceWithoutCanvas).toBeInstanceOf(VoiceInterface);
    });
  });

  describe('startListening', () => {
    it('should start listening and set up audio context', async () => {
      await voiceInterface.startListening();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      expect(voiceInterface.listening).toBe(true);
    });

    it('should throw error if getUserMedia fails', async () => {
      const error = new Error('Permission denied');
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(error);

      await expect(voiceInterface.startListening()).rejects.toThrow('Failed to start listening');
    });

    it('should set up MediaRecorder with supported mime type', async () => {
      await voiceInterface.startListening();

      expect(global.MediaRecorder).toHaveBeenCalled();
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
    });
  });

  describe('stopListening', () => {
    it('should stop listening and clean up resources', async () => {
      await voiceInterface.startListening();
      await voiceInterface.stopListening();

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(voiceInterface.listening).toBe(false);
    });

    it('should handle stopping when not listening', async () => {
      await expect(voiceInterface.stopListening()).resolves.not.toThrow();
    });
  });

  describe('playAudio', () => {
    it('should play audio buffer', async () => {
      const mockAudioBuffer = {
        length: 1024,
        sampleRate: 44100,
        numberOfChannels: 2
      } as AudioBuffer;

      const mockSource = {
        buffer: null,
        connect: jest.fn(),
        start: jest.fn(),
        onended: null as any
      };

      mockAudioContext.createBufferSource = jest.fn().mockReturnValue(mockSource);
      mockAudioContext.destination = {};

      const playPromise = voiceInterface.playAudio(mockAudioBuffer);
      
      // Simulate audio ended
      if (mockSource.onended) {
        mockSource.onended();
      }

      await playPromise;

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockSource.connect).toHaveBeenCalledWith(mockAudioContext.destination);
      expect(mockSource.start).toHaveBeenCalled();
    });
  });

  describe('onAudioInput', () => {
    it('should register audio input callback', () => {
      const callback = jest.fn();
      voiceInterface.onAudioInput(callback);

      // Callback should be stored (we can't directly test this without exposing internals)
      expect(callback).toBeDefined();
    });

    it('should call callback when audio data is available', async () => {
      const callback = jest.fn();
      voiceInterface.onAudioInput(callback);

      await voiceInterface.startListening();

      // Simulate MediaRecorder data available
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      mockBlob.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

      if (mockMediaRecorder.ondataavailable) {
        mockMediaRecorder.ondataavailable({ data: mockBlob });
      }

      // Simulate MediaRecorder stop
      if (mockMediaRecorder.onstop) {
        await mockMediaRecorder.onstop();
      }

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(ArrayBuffer),
          timestamp: expect.any(Date),
          sampleRate: 44100,
          channels: 1,
          format: AudioFormat.WAV
        })
      );
    });
  });

  describe('detectVoiceActivity', () => {
    it('should return false when not listening', () => {
      expect(voiceInterface.hasVoiceActivity).toBe(false);
    });

    it('should detect voice activity when listening', async () => {
      const mockAnalyser = {
        frequencyBinCount: 128,
        getByteFrequencyData: jest.fn().mockImplementation((dataArray) => {
          // Simulate high frequency data (voice activity)
          for (let i = 0; i < dataArray.length; i++) {
            dataArray[i] = 50; // Above threshold of 30
          }
        })
      };

      mockAudioContext.createAnalyser.mockReturnValue(mockAnalyser);

      await voiceInterface.startListening();

      expect(voiceInterface.hasVoiceActivity).toBe(true);
    });

    it('should not detect voice activity with low volume', async () => {
      const mockAnalyser = {
        frequencyBinCount: 128,
        getByteFrequencyData: jest.fn().mockImplementation((dataArray) => {
          // Simulate low frequency data (no voice activity)
          for (let i = 0; i < dataArray.length; i++) {
            dataArray[i] = 10; // Below threshold of 30
          }
        })
      };

      mockAudioContext.createAnalyser.mockReturnValue(mockAnalyser);

      await voiceInterface.startListening();

      expect(voiceInterface.hasVoiceActivity).toBe(false);
    });
  });

  describe('getSupportedMimeType', () => {
    it('should return supported mime type', () => {
      // Access private method through any cast for testing
      const mimeType = (voiceInterface as any).getSupportedMimeType();
      expect(typeof mimeType).toBe('string');
      expect(mimeType).toMatch(/audio\//);
    });

    it('should fallback to audio/wav when no types supported', () => {
      (global.MediaRecorder.isTypeSupported as jest.Mock).mockReturnValue(false);
      
      const newInterface = new VoiceInterface();
      const mimeType = (newInterface as any).getSupportedMimeType();
      expect(mimeType).toBe('audio/wav');
    });
  });

  describe('error handling', () => {
    it('should handle audio context creation failure', async () => {
      (global.AudioContext as jest.Mock).mockImplementationOnce(() => {
        throw new Error('AudioContext not supported');
      });

      await expect(voiceInterface.startListening()).rejects.toThrow('Failed to start listening');
    });

    it('should handle MediaRecorder creation failure', async () => {
      (global.MediaRecorder as jest.Mock).mockImplementationOnce(() => {
        throw new Error('MediaRecorder not supported');
      });

      await expect(voiceInterface.startListening()).rejects.toThrow('Failed to start listening');
    });
  });
});