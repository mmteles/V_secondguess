import { AudioBuffer, VoiceConfiguration, SpeechOptions } from '@/models';

/**
 * Text-to-Speech Service for generating audio from text
 */
export interface TextToSpeechService {
  /**
   * Convert text to speech audio
   * @param text - Text to convert to speech
   * @param options - Speech generation options
   */
  synthesizeSpeech(text: string, options?: SpeechOptions): Promise<AudioBuffer>;

  /**
   * Set voice configuration
   * @param config - Voice configuration settings
   */
  setVoiceConfiguration(config: VoiceConfiguration): void;

  /**
   * Get current voice configuration
   */
  getVoiceConfiguration(): VoiceConfiguration;

  /**
   * Get available voices
   */
  getAvailableVoices(): Promise<VoiceInfo[]>;

  /**
   * Check if service is ready
   */
  isReady(): boolean;

  /**
   * Start TTS session
   */
  startSession(): Promise<string>;

  /**
   * End TTS session
   * @param sessionId - Session identifier
   */
  endSession(sessionId: string): Promise<void>;

  /**
   * Pause speech playback
   */
  pausePlayback(): void;

  /**
   * Resume speech playback
   */
  resumePlayback(): void;

  /**
   * Stop speech playback
   */
  stopPlayback(): void;

  /**
   * Play audio buffer
   * @param audioBuffer - Audio buffer to play
   */
  playAudio(audioBuffer: AudioBuffer): Promise<void>;

  /**
   * Read SOP document content aloud
   * @param sopDocument - SOP document to read
   * @param options - Reading options
   */
  readSOPDocument(sopDocument: any, options?: SOPReadingOptions): Promise<void>;

  /**
   * Read specific SOP section
   * @param section - SOP section to read
   * @param options - Reading options
   */
  readSOPSection(section: any, options?: SOPReadingOptions): Promise<void>;

  /**
   * Set reading speed
   * @param speed - Reading speed (0.25 to 4.0)
   */
  setReadingSpeed(speed: number): void;

  /**
   * Get current reading speed
   */
  getReadingSpeed(): number;

  /**
   * Check if currently reading/playing audio
   */
  isReading(): boolean;

  /**
   * Get current playback position in seconds
   */
  getCurrentPosition(): number;

  /**
   * Set playback position in seconds
   * @param position - Position in seconds
   */
  setCurrentPosition(position: number): void;
}

/**
 * Options for SOP reading functionality
 */
export interface SOPReadingOptions {
  speechOptions?: SpeechOptions;
  includePauses?: boolean;
  includeSectionTitles?: boolean;
  sectionsToRead?: string[]; // Array of section types to read
  readingSpeed?: number;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender: VoiceGender;
  type: VoiceType;
  sampleRate: number;
}

export enum VoiceGender {
  MALE = 'male',
  FEMALE = 'female',
  NEUTRAL = 'neutral'
}

export enum VoiceType {
  STANDARD = 'standard',
  NEURAL = 'neural',
  WAVENET = 'wavenet'
}