/**
 * Audio processing utilities for the AI Voice SOP Agent
 */

import { AudioStream, AudioBuffer, AudioFormat } from '@/models';

// Type declarations for Web Audio API (for Node.js compatibility)
declare const navigator: any;
declare const window: any;

/**
 * Convert audio buffer to different format
 */
export function convertAudioFormat(
  buffer: AudioBuffer, 
  targetFormat: AudioFormat
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      // This is a placeholder implementation
      // In a real implementation, you would use libraries like ffmpeg or web audio APIs
      const convertedBuffer: AudioBuffer = {
        ...buffer,
        format: targetFormat
      };
      resolve(convertedBuffer);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Validate audio quality
 */
export function validateAudioQuality(buffer: AudioBuffer): AudioQualityResult {
  const { data, sampleRate, channels, duration } = buffer;
  
  // Calculate basic audio metrics
  const samples = new Float32Array(data);
  const rms = calculateRMS(samples);
  const snr = calculateSNR(samples);
  const clipping = detectClipping(samples);
  
  // Determine quality score (0-100)
  let score = 100;
  
  if (rms < 0.01) score -= 30; // Too quiet
  if (rms > 0.9) score -= 20;  // Too loud
  if (snr < 10) score -= 25;   // Poor signal-to-noise ratio
  if (clipping > 0.01) score -= 40; // Clipping detected
  if (sampleRate < 16000) score -= 15; // Low sample rate
  if (duration < 0.5) score -= 10; // Too short
  
  const quality = score >= 80 ? 'excellent' : 
                 score >= 60 ? 'good' : 
                 score >= 40 ? 'fair' : 'poor';
  
  return {
    score: Math.max(0, score),
    quality,
    metrics: {
      rms,
      snr,
      clipping,
      duration,
      sampleRate,
      channels
    },
    issues: getQualityIssues(score, rms, snr, clipping, sampleRate, duration)
  };
}

/**
 * Calculate RMS (Root Mean Square) of audio samples
 */
function calculateRMS(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (sample !== undefined) {
      sum += sample * sample;
    }
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * Calculate Signal-to-Noise Ratio
 */
function calculateSNR(samples: Float32Array): number {
  // Simplified SNR calculation
  // In practice, you'd need more sophisticated noise detection
  const rms = calculateRMS(samples);
  const noise = estimateNoise(samples);
  return noise > 0 ? 20 * Math.log10(rms / noise) : 60; // Default high SNR if no noise
}

/**
 * Estimate noise floor in audio
 */
function estimateNoise(samples: Float32Array): number {
  // Simple noise estimation using minimum RMS in sliding windows
  const windowSize = 1024;
  let minRMS = Infinity;
  
  for (let i = 0; i < samples.length - windowSize; i += windowSize) {
    const window = samples.slice(i, i + windowSize);
    const windowRMS = calculateRMS(window);
    minRMS = Math.min(minRMS, windowRMS);
  }
  
  return minRMS === Infinity ? 0.001 : minRMS;
}

/**
 * Detect audio clipping
 */
function detectClipping(samples: Float32Array): number {
  let clippedSamples = 0;
  const threshold = 0.95;
  
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (sample !== undefined && Math.abs(sample) >= threshold) {
      clippedSamples++;
    }
  }
  
  return clippedSamples / samples.length;
}

/**
 * Get quality issues based on metrics
 */
function getQualityIssues(
  score: number, 
  rms: number, 
  snr: number, 
  clipping: number, 
  sampleRate: number, 
  duration: number
): string[] {
  const issues: string[] = [];
  
  if (rms < 0.01) issues.push('Audio level too low');
  if (rms > 0.9) issues.push('Audio level too high');
  if (snr < 10) issues.push('High background noise');
  if (clipping > 0.01) issues.push('Audio clipping detected');
  if (sampleRate < 16000) issues.push('Low sample rate may affect quality');
  if (duration < 0.5) issues.push('Recording too short');
  
  return issues;
}

/**
 * Normalize audio levels
 */
export function normalizeAudio(buffer: AudioBuffer, targetLevel: number = 0.7): AudioBuffer {
  const samples = new Float32Array(buffer.data);
  const rms = calculateRMS(samples);
  
  if (rms === 0) return buffer; // Avoid division by zero
  
  const gain = targetLevel / rms;
  const normalizedSamples = samples.map(sample => sample * gain);
  
  return {
    ...buffer,
    data: normalizedSamples.buffer
  };
}

/**
 * Apply noise reduction (simplified)
 */
export function reduceNoise(buffer: AudioBuffer, noiseThreshold: number = 0.01): AudioBuffer {
  const samples = new Float32Array(buffer.data);
  
  // Simple noise gate - zero out samples below threshold
  const processedSamples = samples.map(sample => 
    Math.abs(sample) < noiseThreshold ? 0 : sample
  );
  
  return {
    ...buffer,
    data: processedSamples.buffer
  };
}

/**
 * Detect silence in audio
 */
export function detectSilence(
  buffer: AudioBuffer, 
  silenceThreshold: number = 0.01,
  minSilenceDuration: number = 1.0
): SilenceSegment[] {
  const samples = new Float32Array(buffer.data);
  const windowSize = Math.floor(buffer.sampleRate * 0.1); // 100ms windows
  const minSilenceWindows = Math.floor(minSilenceDuration / 0.1);
  
  const silenceSegments: SilenceSegment[] = [];
  let currentSilenceStart: number | null = null;
  let silenceWindowCount = 0;
  
  for (let i = 0; i < samples.length; i += windowSize) {
    const window = samples.slice(i, Math.min(i + windowSize, samples.length));
    const windowRMS = calculateRMS(window);
    const isSilent = windowRMS < silenceThreshold;
    
    if (isSilent) {
      if (currentSilenceStart === null) {
        currentSilenceStart = i / buffer.sampleRate;
      }
      silenceWindowCount++;
    } else {
      if (currentSilenceStart !== null && silenceWindowCount >= minSilenceWindows) {
        silenceSegments.push({
          start: currentSilenceStart,
          end: i / buffer.sampleRate,
          duration: (i / buffer.sampleRate) - currentSilenceStart
        });
      }
      currentSilenceStart = null;
      silenceWindowCount = 0;
    }
  }
  
  // Handle silence at the end
  if (currentSilenceStart !== null && silenceWindowCount >= minSilenceWindows) {
    silenceSegments.push({
      start: currentSilenceStart,
      end: buffer.duration,
      duration: buffer.duration - currentSilenceStart
    });
  }
  
  return silenceSegments;
}

/**
 * Trim silence from beginning and end of audio
 */
export function trimSilence(buffer: AudioBuffer, silenceThreshold: number = 0.01): AudioBuffer {
  const samples = new Float32Array(buffer.data);
  
  // Find first non-silent sample
  let start = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (sample !== undefined && Math.abs(sample) > silenceThreshold) {
      start = i;
      break;
    }
  }
  
  // Find last non-silent sample
  let end = samples.length - 1;
  for (let i = samples.length - 1; i >= 0; i--) {
    const sample = samples[i];
    if (sample !== undefined && Math.abs(sample) > silenceThreshold) {
      end = i;
      break;
    }
  }
  
  if (start >= end) {
    // All silence, return minimal buffer
    return {
      ...buffer,
      data: new Float32Array(1024).buffer,
      duration: 1024 / buffer.sampleRate
    };
  }
  
  const trimmedSamples = samples.slice(start, end + 1);
  
  return {
    ...buffer,
    data: trimmedSamples.buffer,
    duration: trimmedSamples.length / buffer.sampleRate
  };
}

// Type definitions for audio utilities
export interface AudioQualityResult {
  score: number; // 0-100
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  metrics: AudioMetrics;
  issues: string[];
}

export interface AudioMetrics {
  rms: number;
  snr: number;
  clipping: number;
  duration: number;
  sampleRate: number;
  channels: number;
}

export interface SilenceSegment {
  start: number; // seconds
  end: number;   // seconds
  duration: number; // seconds
}
/**

 * Audio capture and streaming utilities for real-time processing
 */

export interface AudioCaptureOptions {
  sampleRate?: number;
  channels?: number;
  bufferSize?: number;
  format?: AudioFormat;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface AudioQualityMetrics {
  signalToNoiseRatio: number;
  averageAmplitude: number;
  peakAmplitude: number;
  silenceRatio: number;
  clippingDetected: boolean;
}

export class AudioCapture {
  private mediaStream: any | null = null;
  private audioContext: any | null = null;
  private analyser: any | null = null;
  private processor: any | null = null;
  private isCapturing = false;
  private options: AudioCaptureOptions;
  private onAudioDataCallback?: (audioStream: AudioStream) => void;

  constructor(options: AudioCaptureOptions = {}) {
    this.options = {
      sampleRate: 16000,
      channels: 1,
      bufferSize: 4096,
      format: AudioFormat.WAV,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...options
    };
  }

  async initialize(): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof navigator === 'undefined' || !(navigator as any).mediaDevices) {
        throw new Error('MediaDevices API not available');
      }

      // Request microphone access
      this.mediaStream = await (navigator as any).mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: this.options.channels,
          echoCancellation: this.options.echoCancellation,
          noiseSuppression: this.options.noiseSuppression,
          autoGainControl: this.options.autoGainControl
        }
      });

      // Create audio context
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({
        sampleRate: this.options.sampleRate
      });

      // Create analyser for audio quality detection
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      // Create processor for audio data capture
      this.processor = this.audioContext.createScriptProcessor(
        this.options.bufferSize,
        this.options.channels,
        this.options.channels
      );

      // Connect audio nodes
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Set up audio processing
      this.processor.onaudioprocess = (event: any) => {
        if (this.isCapturing && this.onAudioDataCallback) {
          const inputBuffer = event.inputBuffer;
          const audioData = inputBuffer.getChannelData(0);
          
          // Convert to ArrayBuffer
          const arrayBuffer = this.float32ToArrayBuffer(audioData);
          
          const audioStream: AudioStream = {
            data: arrayBuffer,
            sampleRate: this.options.sampleRate!,
            channels: this.options.channels!,
            format: this.options.format!,
            timestamp: new Date()
          };

          this.onAudioDataCallback(audioStream);
        }
      };

    } catch (error) {
      throw new Error(`Failed to initialize audio capture: ${error}`);
    }
  }

  startCapture(onAudioData: (audioStream: AudioStream) => void): void {
    if (!this.audioContext || !this.processor) {
      throw new Error('Audio capture not initialized');
    }

    this.onAudioDataCallback = onAudioData;
    this.isCapturing = true;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  stopCapture(): void {
    this.isCapturing = false;
    this.onAudioDataCallback = undefined as any;
  }

  getAudioQualityMetrics(): AudioQualityMetrics {
    if (!this.analyser) {
      throw new Error('Audio capture not initialized');
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(bufferLength);
    
    this.analyser.getByteFrequencyData(dataArray);
    this.analyser.getByteTimeDomainData(timeDataArray);

    // Calculate metrics
    const averageAmplitude = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const peakAmplitude = Math.max(...dataArray);
    
    // Calculate signal-to-noise ratio (simplified)
    const signalPower = dataArray.slice(0, bufferLength / 4).reduce((sum, value) => sum + value * value, 0);
    const noisePower = dataArray.slice(bufferLength * 3 / 4).reduce((sum, value) => sum + value * value, 0);
    const signalToNoiseRatio = noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0;

    // Detect silence
    const silenceThreshold = 10;
    const silentSamples = timeDataArray.filter(value => Math.abs(value - 128) < silenceThreshold).length;
    const silenceRatio = silentSamples / bufferLength;

    // Detect clipping
    const clippingThreshold = 250;
    const clippingDetected = timeDataArray.some(value => value >= clippingThreshold || value <= (255 - clippingThreshold));

    return {
      signalToNoiseRatio,
      averageAmplitude,
      peakAmplitude,
      silenceRatio,
      clippingDetected
    };
  }

  async cleanup(): Promise<void> {
    this.stopCapture();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track: any) => track.stop());
      this.mediaStream = null;
    }
  }

  private float32ToArrayBuffer(float32Array: Float32Array): ArrayBuffer {
    // Convert Float32Array to 16-bit PCM
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i] || 0));
      view.setInt16(i * 2, sample * 0x7FFF, true);
    }
    
    return buffer;
  }
}

/**
 * Audio streaming utilities for real-time processing
 */

export interface StreamingOptions {
  chunkSize?: number;
  overlap?: number;
  bufferTime?: number;
}

export class AudioStreamer {
  private buffer: ArrayBuffer[] = [];
  private options: StreamingOptions;
  private onChunkCallback?: (chunk: AudioStream) => void;

  constructor(options: StreamingOptions = {}) {
    this.options = {
      chunkSize: 4096,
      overlap: 512,
      bufferTime: 100, // ms
      ...options
    };
  }

  addAudioData(audioStream: AudioStream): void {
    this.buffer.push(audioStream.data);

    // Process chunks when buffer is large enough
    if (this.shouldProcessChunk()) {
      this.processChunk(audioStream);
    }
  }

  setChunkCallback(callback: (chunk: AudioStream) => void): void {
    this.onChunkCallback = callback;
  }

  private shouldProcessChunk(): boolean {
    const totalBytes = this.buffer.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    return totalBytes >= this.options.chunkSize!;
  }

  private processChunk(template: AudioStream): void {
    if (!this.onChunkCallback || this.buffer.length === 0) {
      return;
    }

    // Combine buffer chunks
    const totalBytes = this.buffer.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combinedBuffer = new ArrayBuffer(totalBytes);
    const combinedView = new Uint8Array(combinedBuffer);
    
    let offset = 0;
    for (const chunk of this.buffer) {
      const chunkView = new Uint8Array(chunk);
      combinedView.set(chunkView, offset);
      offset += chunk.byteLength;
    }

    // Create chunk with overlap handling
    const chunkSize = Math.min(this.options.chunkSize!, totalBytes);
    const chunkBuffer = combinedBuffer.slice(0, chunkSize);

    const audioChunk: AudioStream = {
      ...template,
      data: chunkBuffer,
      timestamp: new Date()
    };

    this.onChunkCallback(audioChunk);

    // Keep overlap data in buffer
    const overlapSize = this.options.overlap!;
    if (totalBytes > chunkSize && overlapSize > 0) {
      const overlapBuffer = combinedBuffer.slice(chunkSize - overlapSize);
      this.buffer = [overlapBuffer];
    } else {
      this.buffer = [];
    }
  }

  clearBuffer(): void {
    this.buffer = [];
  }
}

/**
 * Audio quality validation utilities
 */

export function validateAudioQualityMetrics(metrics: AudioQualityMetrics): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check signal-to-noise ratio
  if (metrics.signalToNoiseRatio < 10) {
    issues.push('Low signal-to-noise ratio detected');
    recommendations.push('Move closer to microphone or reduce background noise');
  }

  // Check for clipping
  if (metrics.clippingDetected) {
    issues.push('Audio clipping detected');
    recommendations.push('Reduce microphone gain or speak softer');
  }

  // Check for excessive silence
  if (metrics.silenceRatio > 0.8) {
    issues.push('Excessive silence detected');
    recommendations.push('Speak louder or check microphone connection');
  }

  // Check amplitude levels
  if (metrics.averageAmplitude < 5) {
    issues.push('Very low audio levels');
    recommendations.push('Increase microphone volume or speak louder');
  }

  if (metrics.peakAmplitude > 240) {
    issues.push('Audio levels too high');
    recommendations.push('Reduce microphone gain or speak softer');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}