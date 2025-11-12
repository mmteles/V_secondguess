import { ConversationState, UserInputType } from './enums';

/**
 * Type definitions for conversation and session management
 */

export type SessionId = string;

export interface ConversationSession {
  id: SessionId;
  userId: string;
  startTime: Date;
  currentState: ConversationState;
  iterationCount: number;
  workflowSummary: WorkflowSummary;
  transcriptionHistory: TranscriptionResult[];
  lastActivity: Date;
  isActive: boolean;
}

export interface UserInput {
  type: UserInputType;
  content: string;
  timestamp: Date;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface ConversationResponse {
  message: string;
  requiresConfirmation: boolean;
  suggestedActions: string[];
  shouldReadAloud: boolean;
  nextState?: ConversationState;
  metadata?: Record<string, any>;
}

export interface WorkflowSummary {
  title: string;
  description: string;
  keySteps: string[];
  identifiedInputs: string[];
  identifiedOutputs: string[];
  completenessScore: number; // 0-100
  lastUpdated: Date;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  segments: TranscriptionSegment[];
  timestamp: Date;
  sessionId: string;
  language: string;
}

export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speakerTag?: string;
}

export interface AudioStream {
  data: ArrayBuffer;
  sampleRate: number;
  channels: number;
  format: AudioFormat;
  timestamp: Date;
}

export interface AudioBuffer {
  data: ArrayBuffer;
  sampleRate: number;
  channels: number;
  duration: number;
  format: AudioFormat;
}

export interface VoiceConfiguration {
  voiceId: string;
  language: string;
  speed: number; // 0.25 to 4.0
  pitch: number; // -20.0 to 20.0
  volume: number; // 0.0 to 1.0
}

export interface SpeechOptions {
  voice?: VoiceConfiguration;
  ssml?: boolean;
  audioFormat?: AudioFormat;
  sampleRate?: number;
}

export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  OGG = 'ogg',
  FLAC = 'flac'
}

/**
 * Validation functions for conversation and session data integrity
 */

export function validateConversationSession(session: ConversationSession): boolean {
  if (!session.id || !session.userId || !session.startTime) {
    return false;
  }
  
  if (session.iterationCount < 0 || session.iterationCount > 10) {
    return false;
  }
  
  if (!Object.values(ConversationState).includes(session.currentState)) {
    return false;
  }
  
  return true;
}

export function validateUserInput(input: UserInput): boolean {
  if (!input.content || !input.timestamp) {
    return false;
  }
  
  if (!Object.values(UserInputType).includes(input.type)) {
    return false;
  }
  
  if (input.confidence !== undefined && (input.confidence < 0 || input.confidence > 1)) {
    return false;
  }
  
  return true;
}

export function validateTranscriptionResult(result: TranscriptionResult): boolean {
  if (!result.text || !result.timestamp || !result.sessionId) {
    return false;
  }
  
  if (result.confidence < 0 || result.confidence > 1) {
    return false;
  }
  
  if (!result.segments || result.segments.length === 0) {
    return false;
  }
  
  return result.segments.every(segment => validateTranscriptionSegment(segment));
}

export function validateTranscriptionSegment(segment: TranscriptionSegment): boolean {
  if (!segment.text || segment.startTime < 0 || segment.endTime <= segment.startTime) {
    return false;
  }
  
  if (segment.confidence < 0 || segment.confidence > 1) {
    return false;
  }
  
  return true;
}

export function validateWorkflowSummary(summary: WorkflowSummary): boolean {
  if (!summary.title || !summary.description || !summary.lastUpdated) {
    return false;
  }
  
  if (summary.completenessScore < 0 || summary.completenessScore > 100) {
    return false;
  }
  
  if (!Array.isArray(summary.keySteps) || !Array.isArray(summary.identifiedInputs) || !Array.isArray(summary.identifiedOutputs)) {
    return false;
  }
  
  return true;
}

export function validateAudioStream(stream: AudioStream): boolean {
  if (!stream.data || !stream.timestamp) {
    return false;
  }
  
  if (stream.sampleRate <= 0 || stream.channels <= 0) {
    return false;
  }
  
  if (!Object.values(AudioFormat).includes(stream.format)) {
    return false;
  }
  
  return true;
}

export function validateVoiceConfiguration(config: VoiceConfiguration): boolean {
  if (!config.voiceId || !config.language) {
    return false;
  }
  
  if (config.speed < 0.25 || config.speed > 4.0) {
    return false;
  }
  
  if (config.pitch < -20.0 || config.pitch > 20.0) {
    return false;
  }
  
  if (config.volume < 0.0 || config.volume > 1.0) {
    return false;
  }
  
  return true;
}