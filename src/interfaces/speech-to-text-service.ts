import { AudioStream, TranscriptionResult } from '@/models';

/**
 * Speech-to-Text Service for converting audio streams to text
 */
export interface SpeechToTextService {
  /**
   * Transcribe audio stream to text in real-time
   * @param audioStream - Audio stream to transcribe
   */
  transcribe(audioStream: AudioStream): Promise<TranscriptionResult>;

  /**
   * Get confidence score for a transcribed segment
   * @param segment - Text segment to evaluate
   */
  getConfidenceScore(segment: string): number;

  /**
   * Set language for transcription
   * @param language - Language code (e.g., 'en-US', 'es-ES')
   */
  setLanguage(language: string): void;

  /**
   * Get current language setting
   */
  getCurrentLanguage(): string;

  /**
   * Check if service is ready for transcription
   */
  isReady(): boolean;

  /**
   * Start transcription session
   */
  startSession(): Promise<string>;

  /**
   * End transcription session
   * @param sessionId - Session identifier
   */
  endSession(sessionId: string): Promise<void>;
}