import { 
  logger, 
  logConversation, 
  logSOPGeneration, 
  logAudioProcessing, 
  logValidation,
  logBusinessEvent,
  logIntegration,
  logDataProcessing,
  logFileOperation,
  logError,
  createComponentLogger
} from './logger';
import { serviceMonitor } from './service-monitor';

/**
 * Service-specific logging utilities
 * Provides structured logging for all system components
 */

// Component loggers
export const conversationLogger = createComponentLogger('ConversationManager');
export const sopGeneratorLogger = createComponentLogger('SOPGenerator');
export const speechToTextLogger = createComponentLogger('SpeechToText');
export const textToSpeechLogger = createComponentLogger('TextToSpeech');
export const visualGeneratorLogger = createComponentLogger('VisualGenerator');
export const documentExporterLogger = createComponentLogger('DocumentExporter');
export const voiceInterfaceLogger = createComponentLogger('VoiceInterface');

/**
 * Conversation Manager Logging
 */
export class ConversationManagerLogging {
  static logSessionStart(sessionId: string, userId: string, metadata?: Record<string, any>): void {
    conversationLogger.info('Session started', {
      sessionId,
      userId,
      event: 'session_start',
      ...metadata
    });
    
    logConversation(sessionId, 'session_start', { userId, ...metadata });
    logBusinessEvent('session_created', sessionId, 'conversation_session', { userId });
  }

  static logSessionEnd(sessionId: string, duration: number, iterationCount: number, metadata?: Record<string, any>): void {
    conversationLogger.info('Session ended', {
      sessionId,
      duration,
      iterationCount,
      event: 'session_end',
      ...metadata
    });
    
    logConversation(sessionId, 'session_end', { duration, iterationCount, ...metadata });
    logBusinessEvent('session_completed', sessionId, 'conversation_session', { duration, iterationCount });
  }

  static logUserInput(sessionId: string, inputType: 'voice' | 'text', inputLength: number, metadata?: Record<string, any>): void {
    conversationLogger.info('User input received', {
      sessionId,
      inputType,
      inputLength,
      event: 'user_input',
      ...metadata
    });
    
    logConversation(sessionId, 'user_input', { inputType, inputLength, ...metadata });
  }

  static logIterationCheckpoint(sessionId: string, iterationCount: number, userChoice: string, metadata?: Record<string, any>): void {
    conversationLogger.info('Iteration checkpoint reached', {
      sessionId,
      iterationCount,
      userChoice,
      event: 'iteration_checkpoint',
      ...metadata
    });
    
    logConversation(sessionId, 'iteration_checkpoint', { iterationCount, userChoice, ...metadata });
    logBusinessEvent('iteration_checkpoint', sessionId, 'conversation_session', { iterationCount, userChoice });
  }

  static logWorkflowSummary(sessionId: string, summaryLength: number, completeness: number, metadata?: Record<string, any>): void {
    conversationLogger.info('Workflow summary generated', {
      sessionId,
      summaryLength,
      completeness,
      event: 'workflow_summary',
      ...metadata
    });
    
    logConversation(sessionId, 'workflow_summary', { summaryLength, completeness, ...metadata });
  }

  static logError(sessionId: string, error: Error, context?: Record<string, any>): void {
    conversationLogger.error('Conversation manager error', {
      sessionId,
      error: error.message,
      stack: error.stack,
      ...context
    });
    
    logError(error, { sessionId, component: 'ConversationManager', ...context });
  }
}

/**
 * SOP Generator Logging
 */
export class SOPGeneratorLogging {
  static logSOPGenerationStart(sopId: string, workflowType: string, templateType: string, metadata?: Record<string, any>): void {
    sopGeneratorLogger.info('SOP generation started', {
      sopId,
      workflowType,
      templateType,
      event: 'generation_start',
      ...metadata
    });
    
    logSOPGeneration(sopId, 'generation_start', { workflowType, templateType, ...metadata });
    logBusinessEvent('sop_generation_started', sopId, 'sop_document', { workflowType, templateType });
  }

  static logSOPGenerationComplete(sopId: string, sectionCount: number, chartCount: number, duration: number, metadata?: Record<string, any>): void {
    sopGeneratorLogger.info('SOP generation completed', {
      sopId,
      sectionCount,
      chartCount,
      duration,
      event: 'generation_complete',
      ...metadata
    });
    
    logSOPGeneration(sopId, 'generation_complete', { sectionCount, chartCount, duration, ...metadata });
    logBusinessEvent('sop_generated', sopId, 'sop_document', { sectionCount, chartCount, duration });
    logDataProcessing('sop_generation', sectionCount, duration, { sopId, chartCount });
  }

  static logTemplateSelection(sopId: string, selectedTemplate: string, confidence: number, metadata?: Record<string, any>): void {
    sopGeneratorLogger.info('Template selected', {
      sopId,
      selectedTemplate,
      confidence,
      event: 'template_selection',
      ...metadata
    });
    
    logSOPGeneration(sopId, 'template_selection', { selectedTemplate, confidence, ...metadata });
  }

  static logQualityCheck(sopId: string, checkType: string, passed: boolean, issues: string[], metadata?: Record<string, any>): void {
    const level = passed ? 'info' : 'warn';
    
    sopGeneratorLogger.log(level, 'Quality check performed', {
      sopId,
      checkType,
      passed,
      issues,
      event: 'quality_check',
      ...metadata
    });
    
    logSOPGeneration(sopId, 'quality_check', { checkType, passed, issues, ...metadata });
    logValidation('sop_document', sopId, passed, issues);
  }

  static logError(sopId: string, error: Error, context?: Record<string, any>): void {
    sopGeneratorLogger.error('SOP generator error', {
      sopId,
      error: error.message,
      stack: error.stack,
      ...context
    });
    
    logError(error, { sopId, component: 'SOPGenerator', ...context });
  }
}

/**
 * Speech-to-Text Logging
 */
export class SpeechToTextLogging {
  static logTranscriptionStart(sessionId: string, audioLength: number, language: string, metadata?: Record<string, any>): void {
    speechToTextLogger.info('Transcription started', {
      sessionId,
      audioLength,
      language,
      event: 'transcription_start',
      ...metadata
    });
    
    logAudioProcessing(sessionId, 'transcription_start', { audioLength, language, ...metadata });
  }

  static logTranscriptionComplete(sessionId: string, transcriptionLength: number, confidence: number, duration: number, metadata?: Record<string, any>): void {
    speechToTextLogger.info('Transcription completed', {
      sessionId,
      transcriptionLength,
      confidence,
      duration,
      event: 'transcription_complete',
      ...metadata
    });
    
    logAudioProcessing(sessionId, 'transcription_complete', { transcriptionLength, confidence, duration, ...metadata });
    logDataProcessing('speech_transcription', 1, duration, { sessionId, confidence, transcriptionLength });
  }

  static logConfidenceIssue(sessionId: string, confidence: number, threshold: number, metadata?: Record<string, any>): void {
    speechToTextLogger.warn('Low transcription confidence', {
      sessionId,
      confidence,
      threshold,
      event: 'low_confidence',
      ...metadata
    });
    
    logAudioProcessing(sessionId, 'low_confidence', { confidence, threshold, ...metadata });
  }

  static logServiceIntegration(provider: string, operation: string, success: boolean, duration: number, metadata?: Record<string, any>): void {
    speechToTextLogger.info('External service call', {
      provider,
      operation,
      success,
      duration,
      event: 'service_integration',
      ...metadata
    });
    
    logIntegration(provider, operation, success, duration, metadata);
  }

  static logError(sessionId: string, error: Error, context?: Record<string, any>): void {
    speechToTextLogger.error('Speech-to-text error', {
      sessionId,
      error: error.message,
      stack: error.stack,
      ...context
    });
    
    logError(error, { sessionId, component: 'SpeechToText', ...context });
  }
}

/**
 * Text-to-Speech Logging
 */
export class TextToSpeechLogging {
  static logSynthesisStart(sessionId: string, textLength: number, voice: string, metadata?: Record<string, any>): void {
    textToSpeechLogger.info('Speech synthesis started', {
      sessionId,
      textLength,
      voice,
      event: 'synthesis_start',
      ...metadata
    });
    
    logAudioProcessing(sessionId, 'synthesis_start', { textLength, voice, ...metadata });
  }

  static logSynthesisComplete(sessionId: string, audioLength: number, duration: number, metadata?: Record<string, any>): void {
    textToSpeechLogger.info('Speech synthesis completed', {
      sessionId,
      audioLength,
      duration,
      event: 'synthesis_complete',
      ...metadata
    });
    
    logAudioProcessing(sessionId, 'synthesis_complete', { audioLength, duration, ...metadata });
    logDataProcessing('speech_synthesis', 1, duration, { sessionId, audioLength });
  }

  static logPlaybackEvent(sessionId: string, event: 'start' | 'pause' | 'resume' | 'stop', position?: number, metadata?: Record<string, any>): void {
    textToSpeechLogger.info('Audio playback event', {
      sessionId,
      event: `playback_${event}`,
      position,
      ...metadata
    });
    
    logAudioProcessing(sessionId, `playback_${event}`, { position, ...metadata });
  }

  static logServiceIntegration(provider: string, operation: string, success: boolean, duration: number, metadata?: Record<string, any>): void {
    textToSpeechLogger.info('External service call', {
      provider,
      operation,
      success,
      duration,
      event: 'service_integration',
      ...metadata
    });
    
    logIntegration(provider, operation, success, duration, metadata);
  }

  static logError(sessionId: string, error: Error, context?: Record<string, any>): void {
    textToSpeechLogger.error('Text-to-speech error', {
      sessionId,
      error: error.message,
      stack: error.stack,
      ...context
    });
    
    logError(error, { sessionId, component: 'TextToSpeech', ...context });
  }
}

/**
 * Visual Generator Logging
 */
export class VisualGeneratorLogging {
  static logChartGeneration(sopId: string, chartType: string, dataPoints: number, duration: number, metadata?: Record<string, any>): void {
    visualGeneratorLogger.info('Chart generated', {
      sopId,
      chartType,
      dataPoints,
      duration,
      event: 'chart_generation',
      ...metadata
    });
    
    logDataProcessing('chart_generation', dataPoints, duration, { sopId, chartType });
    logBusinessEvent('chart_generated', sopId, 'chart', { chartType, dataPoints });
  }

  static logChartExport(chartId: string, format: string, fileSize: number, success: boolean, metadata?: Record<string, any>): void {
    const level = success ? 'info' : 'error';
    
    visualGeneratorLogger.log(level, 'Chart exported', {
      chartId,
      format,
      fileSize,
      success,
      event: 'chart_export',
      ...metadata
    });
    
    logFileOperation('chart_export', `chart_${chartId}.${format}`, success, fileSize, metadata);
  }

  static logError(sopId: string, error: Error, context?: Record<string, any>): void {
    visualGeneratorLogger.error('Visual generator error', {
      sopId,
      error: error.message,
      stack: error.stack,
      ...context
    });
    
    logError(error, { sopId, component: 'VisualGenerator', ...context });
  }
}

/**
 * Document Exporter Logging
 */
export class DocumentExporterLogging {
  static logExportStart(sopId: string, format: string, templateType: string, metadata?: Record<string, any>): void {
    documentExporterLogger.info('Document export started', {
      sopId,
      format,
      templateType,
      event: 'export_start',
      ...metadata
    });
    
    logBusinessEvent('document_export_started', sopId, 'sop_document', { format, templateType });
  }

  static logExportComplete(sopId: string, format: string, fileSize: number, duration: number, metadata?: Record<string, any>): void {
    documentExporterLogger.info('Document export completed', {
      sopId,
      format,
      fileSize,
      duration,
      event: 'export_complete',
      ...metadata
    });
    
    logFileOperation('document_export', `sop_${sopId}.${format}`, true, fileSize, { duration });
    logBusinessEvent('document_exported', sopId, 'sop_document', { format, fileSize, duration });
    logDataProcessing('document_export', 1, duration, { sopId, format, fileSize });
  }

  static logExportError(sopId: string, format: string, error: Error, context?: Record<string, any>): void {
    documentExporterLogger.error('Document export failed', {
      sopId,
      format,
      error: error.message,
      stack: error.stack,
      ...context
    });
    
    logFileOperation('document_export', `sop_${sopId}.${format}`, false, undefined, { error: error.message });
    logError(error, { sopId, format, component: 'DocumentExporter', ...context });
  }
}

/**
 * Voice Interface Logging
 */
export class VoiceInterfaceLogging {
  static logAudioCapture(sessionId: string, event: 'start' | 'stop', duration?: number, metadata?: Record<string, any>): void {
    voiceInterfaceLogger.info('Audio capture event', {
      sessionId,
      event: `capture_${event}`,
      duration,
      ...metadata
    });
    
    logAudioProcessing(sessionId, `capture_${event}`, { duration, ...metadata });
  }

  static logAudioQuality(sessionId: string, quality: 'good' | 'poor' | 'unacceptable', metrics: Record<string, any>): void {
    const level = quality === 'good' ? 'info' : quality === 'poor' ? 'warn' : 'error';
    
    voiceInterfaceLogger.log(level, 'Audio quality assessment', {
      sessionId,
      quality,
      metrics,
      event: 'audio_quality'
    });
    
    logAudioProcessing(sessionId, 'audio_quality', { quality, metrics });
  }

  static logError(sessionId: string, error: Error, context?: Record<string, any>): void {
    voiceInterfaceLogger.error('Voice interface error', {
      sessionId,
      error: error.message,
      stack: error.stack,
      ...context
    });
    
    logError(error, { sessionId, component: 'VoiceInterface', ...context });
  }
}

/**
 * Service monitoring decorator with comprehensive logging
 */
export function monitoredServiceCall(serviceName: string, methodName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const callId = serviceMonitor.startCall(serviceName, methodName, {
        argsCount: args.length,
        timestamp: new Date().toISOString()
      });

      const componentLogger = createComponentLogger(serviceName);
      
      componentLogger.info(`${methodName} started`, {
        callId,
        argsCount: args.length,
        timestamp: new Date().toISOString()
      });

      try {
        const result = await method.apply(this, args);
        
        serviceMonitor.endCall(callId, result);
        
        componentLogger.info(`${methodName} completed successfully`, {
          callId,
          hasResult: !!result,
          timestamp: new Date().toISOString()
        });
        
        return result;
      } catch (error) {
        serviceMonitor.endCallWithError(callId, error as Error);
        
        componentLogger.error(`${methodName} failed`, {
          callId,
          error: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: new Date().toISOString()
        });
        
        logError(error as Error, { 
          service: serviceName, 
          method: methodName, 
          callId 
        });
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Export all logging utilities
export {
  logger,
  logConversation,
  logSOPGeneration,
  logAudioProcessing,
  logValidation,
  logBusinessEvent,
  logIntegration,
  logDataProcessing,
  logFileOperation,
  logError
};