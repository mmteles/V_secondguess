import { AudioStream } from '@/models';

/**
 * Voice User Interface for managing audio input/output and user interaction
 */
export interface VoiceUserInterface {
  /**
   * Start listening for audio input from microphone
   */
  startListening(): Promise<void>;

  /**
   * Stop listening for audio input
   */
  stopListening(): Promise<void>;

  /**
   * Play audio response to user
   * @param audioData - Audio buffer to play
   */
  playAudio(audioData: ArrayBuffer): Promise<void>;

  /**
   * Register callback for audio input events
   * @param callback - Function to handle audio stream
   */
  onAudioInput(callback: (audioStream: AudioStream) => void): void;

  /**
   * Check if currently listening for audio input
   */
  isListening(): boolean;

  /**
   * Get current audio session state
   */
  getSessionState(): AudioSessionState;
}

export interface AudioSessionState {
  isActive: boolean;
  startTime?: Date;
  duration?: number;
  quality: AudioQuality;
}

export enum AudioQuality {
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  EXCELLENT = 'excellent'
}