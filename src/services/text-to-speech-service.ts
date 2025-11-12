/**
 * Text-to-Speech Service Implementation
 * Integrates with Google Cloud Text-to-Speech API
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { TextToSpeechService, VoiceInfo, VoiceGender, VoiceType, SOPReadingOptions } from '@/interfaces';
import { AudioBuffer, VoiceConfiguration, SpeechOptions, AudioFormat } from '@/models';
import { logger } from '@/utils/logger';
import { getConfig } from '@/utils/config';

export class TextToSpeechServiceImpl implements TextToSpeechService {
  private client: TextToSpeechClient;
  private voiceConfig: VoiceConfiguration = {
    voiceId: 'en-US-Standard-A',
    language: 'en-US',
    speed: 1.0,
    pitch: 0.0,
    volume: 1.0
  };
  private isServiceReady = false;
  private currentAudio: any | null = null;
  private availableVoices: VoiceInfo[] = [];

  constructor() {
    const config = getConfig();
    this.client = new TextToSpeechClient({
      // Use environment variables for Google Cloud credentials
      // GOOGLE_APPLICATION_CREDENTIALS should be set to the path of the service account key file
    });
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      await this.loadAvailableVoices();
      this.isServiceReady = true;
      logger.info('Text-to-Speech service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Text-to-Speech service:', error);
      this.isServiceReady = false;
    }
  }

  private async loadAvailableVoices(): Promise<void> {
    try {
      const [response] = await this.client.listVoices({});
      this.availableVoices = response.voices?.map(voice => ({
        id: voice.name || '',
        name: voice.name || '',
        language: voice.languageCodes?.[0] || '',
        gender: this.mapGoogleGenderToEnum(voice.ssmlGender),
        type: this.mapGoogleVoiceTypeToEnum(voice.name || ''),
        sampleRate: 22050 // Default sample rate
      })) || [];
    } catch (error) {
      logger.error('Failed to load available voices:', error);
      // Fallback to default voices
      this.availableVoices = this.getDefaultVoices();
      throw error; // Re-throw to indicate initialization failure
    }
  }

  private mapGoogleGenderToEnum(googleGender: any): VoiceGender {
    switch (googleGender?.toUpperCase()) {
      case 'MALE':
        return VoiceGender.MALE;
      case 'FEMALE':
        return VoiceGender.FEMALE;
      default:
        return VoiceGender.NEUTRAL;
    }
  }

  private mapGoogleVoiceTypeToEnum(voiceName: string): VoiceType {
    if (voiceName.includes('Neural')) {
      return VoiceType.NEURAL;
    } else if (voiceName.includes('WaveNet')) {
      return VoiceType.WAVENET;
    } else {
      return VoiceType.STANDARD;
    }
  }

  private getDefaultVoices(): VoiceInfo[] {
    return [
      {
        id: 'en-US-Standard-A',
        name: 'English (US) - Standard A',
        language: 'en-US',
        gender: VoiceGender.FEMALE,
        type: VoiceType.STANDARD,
        sampleRate: 22050
      },
      {
        id: 'en-US-Standard-B',
        name: 'English (US) - Standard B',
        language: 'en-US',
        gender: VoiceGender.MALE,
        type: VoiceType.STANDARD,
        sampleRate: 22050
      },
      {
        id: 'en-US-Neural2-A',
        name: 'English (US) - Neural A',
        language: 'en-US',
        gender: VoiceGender.FEMALE,
        type: VoiceType.NEURAL,
        sampleRate: 24000
      }
    ];
  }

  async synthesizeSpeech(text: string, options?: SpeechOptions): Promise<AudioBuffer> {
    if (!this.isServiceReady) {
      throw new Error('Text-to-Speech service is not ready');
    }

    try {
      const voiceConfig = options?.voice || this.voiceConfig;
      const audioFormat = options?.audioFormat || AudioFormat.MP3;
      const sampleRate = options?.sampleRate || 22050;

      const request = {
        input: { text },
        voice: {
          languageCode: voiceConfig.language,
          name: voiceConfig.voiceId,
        },
        audioConfig: {
          audioEncoding: this.mapAudioFormatToGoogle(audioFormat) as any,
          sampleRateHertz: sampleRate,
          speakingRate: voiceConfig.speed,
          pitch: voiceConfig.pitch,
          volumeGainDb: this.volumeToDb(voiceConfig.volume),
        },
      };

      const [response] = await this.client.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      const audioData = response.audioContent as Uint8Array;
      const duration = this.estimateAudioDuration(text, voiceConfig.speed);

      return {
        data: audioData.buffer as ArrayBuffer,
        sampleRate,
        channels: 1,
        duration,
        format: audioFormat
      };
    } catch (error) {
      logger.error('Failed to synthesize speech:', error);
      throw new Error(`Speech synthesis failed: ${error}`);
    }
  }

  private mapAudioFormatToGoogle(format: AudioFormat): string {
    switch (format) {
      case AudioFormat.MP3:
        return 'MP3';
      case AudioFormat.WAV:
        return 'LINEAR16';
      case AudioFormat.OGG:
        return 'OGG_OPUS';
      default:
        return 'MP3';
    }
  }

  private volumeToDb(volume: number): number {
    // Convert volume (0.0-1.0) to decibels (-96dB to 16dB)
    if (volume <= 0) return -96;
    if (volume >= 1) return 16;
    return 20 * Math.log10(volume);
  }

  private estimateAudioDuration(text: string, speed: number): number {
    // Rough estimation: average speaking rate is ~150 words per minute
    const wordsPerMinute = 150 * speed;
    const wordCount = text.split(/\s+/).length;
    return (wordCount / wordsPerMinute) * 60;
  }

  async playAudio(audioBuffer: AudioBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        this.stopPlayback();

        // Create blob from audio data
        const blob = new Blob([audioBuffer.data], { 
          type: `audio/${audioBuffer.format}` 
        });
        const audioUrl = URL.createObjectURL(blob);

        // Create and configure audio element
        this.currentAudio = new (global as any).Audio(audioUrl);
        this.currentAudio.volume = this.voiceConfig.volume;

        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          resolve();
        };

        this.currentAudio.onerror = (error: any) => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          reject(new Error(`Audio playback failed: ${error}`));
        };

        // Start playback
        this.currentAudio.play().catch(reject);
      } catch (error) {
        reject(new Error(`Failed to play audio: ${error}`));
      }
    });
  }

  setVoiceConfiguration(config: VoiceConfiguration): void {
    this.voiceConfig = { ...config };
    logger.info('Voice configuration updated:', config);
  }

  getVoiceConfiguration(): VoiceConfiguration {
    return { ...this.voiceConfig };
  }

  async getAvailableVoices(): Promise<VoiceInfo[]> {
    if (!this.isServiceReady) {
      await this.initializeService();
    }
    return [...this.availableVoices];
  }

  isReady(): boolean {
    return this.isServiceReady;
  }

  async startSession(): Promise<string> {
    if (!this.isServiceReady) {
      await this.initializeService();
    }
    
    const sessionId = `tts-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info('Started TTS session:', sessionId);
    return sessionId;
  }

  async endSession(sessionId: string): Promise<void> {
    this.stopPlayback();
    logger.info('Ended TTS session:', sessionId);
  }

  pausePlayback(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      logger.info('TTS playback paused');
    }
  }

  resumePlayback(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch((error: any) => {
        logger.error('Failed to resume TTS playback:', error);
      });
      logger.info('TTS playback resumed');
    }
  }

  stopPlayback(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      logger.info('TTS playback stopped');
    }
  }

  /**
   * Read SOP document content aloud with structured processing
   */
  async readSOPDocument(sopDocument: any, options?: SOPReadingOptions): Promise<void> {
    if (!sopDocument) {
      throw new Error('SOP document is required for reading');
    }

    try {
      const processedText = this.processSOPForReading(sopDocument, options);
      const audioBuffer = await this.synthesizeSpeech(processedText, options?.speechOptions);
      await this.playAudio(audioBuffer);
    } catch (error) {
      logger.error('Failed to read SOP document:', error);
      throw new Error(`SOP reading failed: ${error}`);
    }
  }

  /**
   * Read specific SOP section
   */
  async readSOPSection(section: any, options?: SOPReadingOptions): Promise<void> {
    if (!section) {
      throw new Error('SOP section is required for reading');
    }

    try {
      const processedText = this.processSOPSectionForReading(section, options);
      const audioBuffer = await this.synthesizeSpeech(processedText, options?.speechOptions);
      await this.playAudio(audioBuffer);
    } catch (error) {
      logger.error('Failed to read SOP section:', error);
      throw new Error(`SOP section reading failed: ${error}`);
    }
  }

  /**
   * Process SOP document content for optimal text-to-speech conversion
   */
  private processSOPForReading(sopDocument: any, options?: SOPReadingOptions): string {
    let processedText = '';

    // Add document title
    if (sopDocument.title) {
      processedText += `${sopDocument.title}. `;
      if (options?.includePauses) {
        processedText += '<break time="1s"/> ';
      }
    }

    // Process each section
    if (sopDocument.sections && Array.isArray(sopDocument.sections)) {
      sopDocument.sections.forEach((section: any, index: number) => {
        if (options?.sectionsToRead && !options.sectionsToRead.includes(section.type)) {
          return; // Skip sections not in the reading list
        }

        processedText += this.processSOPSectionForReading(section, options);
        
        // Add pause between sections
        if (options?.includePauses && index < sopDocument.sections.length - 1) {
          processedText += '<break time="2s"/> ';
        }
      });
    }

    return this.cleanTextForSpeech(processedText);
  }

  /**
   * Process individual SOP section for reading
   */
  private processSOPSectionForReading(section: any, options?: SOPReadingOptions): string {
    let sectionText = '';

    // Add section title
    if (section.title && options?.includeSectionTitles !== false) {
      sectionText += `Section: ${section.title}. `;
      if (options?.includePauses) {
        sectionText += '<break time="0.5s"/> ';
      }
    }

    // Process section content
    if (section.content) {
      sectionText += this.processContentForReading(section.content, options);
    }

    // Process steps if available
    if (section.steps && Array.isArray(section.steps)) {
      section.steps.forEach((step: any, index: number) => {
        sectionText += `Step ${index + 1}: ${step.description || step.content}. `;
        if (options?.includePauses) {
          sectionText += '<break time="0.3s"/> ';
        }
      });
    }

    return sectionText;
  }

  /**
   * Process content text for optimal speech synthesis
   */
  private processContentForReading(content: string, options?: SOPReadingOptions): string {
    let processedContent = content;

    // Remove markdown formatting
    processedContent = processedContent
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/`(.*?)`/g, '$1') // Code
      .replace(/#{1,6}\s/g, '') // Headers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Links

    // Replace bullet points with spoken equivalents
    processedContent = processedContent
      .replace(/^\s*[-*+]\s/gm, 'Item: ')
      .replace(/^\s*\d+\.\s/gm, 'Number $&');

    // Add pauses for punctuation if enabled
    if (options?.includePauses) {
      processedContent = processedContent
        .replace(/\./g, '. <break time="0.3s"/>')
        .replace(/[!?]/g, '$& <break time="0.5s"/>')
        .replace(/[;:]/g, '$& <break time="0.2s"/>');
    }

    return processedContent;
  }

  /**
   * Clean and normalize text for speech synthesis
   */
  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([.!?])\s*([.!?])/g, '$1 $2') // Fix multiple punctuation
      .trim();
  }

  /**
   * Set reading speed (affects voice configuration)
   */
  setReadingSpeed(speed: number): void {
    if (speed < 0.25 || speed > 4.0) {
      throw new Error('Reading speed must be between 0.25 and 4.0');
    }
    
    this.voiceConfig.speed = speed;
    logger.info(`Reading speed set to: ${speed}`);
  }

  /**
   * Get current reading speed
   */
  getReadingSpeed(): number {
    return this.voiceConfig.speed;
  }

  /**
   * Check if currently reading/playing audio
   */
  isReading(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  /**
   * Get current playback position (in seconds)
   */
  getCurrentPosition(): number {
    return this.currentAudio?.currentTime || 0;
  }

  /**
   * Set playback position (in seconds)
   */
  setCurrentPosition(position: number): void {
    if (this.currentAudio) {
      this.currentAudio.currentTime = Math.max(0, Math.min(position, this.currentAudio.duration || 0));
    }
  }
}