import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';
import { serviceMonitor, monitorServiceCall } from '../utils/service-monitor';
import { errorRecovery } from '../utils/error-recovery';

// Import service interfaces and implementations
import { VoiceUserInterfaceService } from './voice-user-interface-service';
import { SpeechToTextServiceImpl as SpeechToTextService } from './speech-to-text-service';
import { ConversationManagerService } from './conversation-manager-service';
import { SOPGeneratorService } from './sop-generator-service';
import { VisualGeneratorService } from './visual-generator-service';
import { DocumentExporterService } from './document-exporter-service';
import { TextToSpeechServiceImpl as TextToSpeechService } from './text-to-speech-service';
import { FeedbackProcessorService } from './feedback-processor-service';
import { DocumentVersioningService } from './document-versioning-service';

// Import types
import { 
  ConversationSession, 
  WorkflowDefinition, 
  SOPDocument, 
  SOPType,
  UserInput,
  ConversationResponse as ServiceConversationResponse,
  ValidationResult
} from '../models';

export interface ServiceOrchestrator {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // End-to-end workflow methods
  startConversationWorkflow(userId: string): Promise<string>;
  processConversationInput(sessionId: string, input: UserInput): Promise<ServiceConversationResponse>;
  generateSOPFromSession(sessionId: string, sopType: SOPType): Promise<SOPDocument>;
  exportSOPDocument(sopId: string, format: string, options?: any): Promise<{ downloadUrl: string; format: string }>;
  
  // Service health and monitoring
  getServiceHealth(): Promise<ServiceHealthStatus>;
  getServiceMetrics(): Promise<ServiceMetrics>;
}

export interface ServiceHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      lastCheck: string;
      error?: string;
    };
  };
}

export interface ServiceMetrics {
  activeConversations: number;
  totalSOPsGenerated: number;
  averageConversationDuration: number;
  errorRate: number;
  responseTime: {
    conversation: number;
    sopGeneration: number;
    export: number;
  };
}

/**
 * Service orchestrator implementation
 * Coordinates all services and manages end-to-end workflows
 */
export class ServiceOrchestratorImpl implements ServiceOrchestrator {
  private services: {
    voiceUI: VoiceUserInterfaceService;
    speechToText: SpeechToTextService;
    conversationManager: ConversationManagerService;
    sopGenerator: SOPGeneratorService;
    visualGenerator: VisualGeneratorService;
    documentExporter: DocumentExporterService;
    textToSpeech: TextToSpeechService;
    feedbackProcessor: FeedbackProcessorService;
    documentVersioning: DocumentVersioningService;
  };

  private isInitialized = false;
  private metrics: ServiceMetrics = {
    activeConversations: 0,
    totalSOPsGenerated: 0,
    averageConversationDuration: 0,
    errorRate: 0,
    responseTime: {
      conversation: 0,
      sopGeneration: 0,
      export: 0
    }
  };

  constructor() {
    // Initialize all services
    this.services = {
      voiceUI: new VoiceUserInterfaceService(),
      speechToText: new SpeechToTextService(),
      conversationManager: new ConversationManagerService(),
      sopGenerator: new SOPGeneratorService(),
      visualGenerator: new VisualGeneratorService(),
      documentExporter: new DocumentExporterService(),
      textToSpeech: new TextToSpeechService(),
      feedbackProcessor: new FeedbackProcessorService(),
      documentVersioning: new DocumentVersioningService()
    };
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing service orchestrator...');
      
      const config = getConfig();
      
      // Initialize services in dependency order
      // Note: Services don't have initialize methods yet - they initialize in constructor
      // await this.services.speechToText.initialize(config.services.speechToText);
      // await this.services.textToSpeech.initialize(config.services.textToSpeech);
      // await this.services.voiceUI.initialize(config.audio);
      // await this.services.conversationManager.initialize();
      // await this.services.sopGenerator.initialize();
      // await this.services.visualGenerator.initialize();
      // await this.services.documentExporter.initialize(config.export);
      // await this.services.feedbackProcessor.initialize();
      // await this.services.documentVersioning.initialize();
      
      this.isInitialized = true;
      logger.info('Service orchestrator initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize service orchestrator:', error);
      throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down service orchestrator...');
      
      // Shutdown services in reverse dependency order
      // Note: Services don't have shutdown methods yet
      // await this.services.documentVersioning.shutdown();
      // await this.services.feedbackProcessor.shutdown();
      // await this.services.documentExporter.shutdown();
      // await this.services.visualGenerator.shutdown();
      // await this.services.sopGenerator.shutdown();
      // await this.services.conversationManager.shutdown();
      // await this.services.voiceUI.shutdown();
      // await this.services.textToSpeech.shutdown();
      // await this.services.speechToText.shutdown();
      
      this.isInitialized = false;
      logger.info('Service orchestrator shutdown completed');
      
    } catch (error) {
      logger.error('Error during service orchestrator shutdown:', error);
      throw error;
    }
  }

  /**
   * Start a new conversation workflow
   */
  // @monitorServiceCall('ServiceOrchestrator') // Decorator has signature issues
  async startConversationWorkflow(userId: string): Promise<string> {
    this.ensureInitialized();
    
    return errorRecovery.executeWithRecovery(
      async () => {
        logger.info('Starting conversation workflow', { userId });
        
        // Create new conversation session
        const sessionId = await this.services.conversationManager.startSession(userId);
        
        // Update metrics
        this.metrics.activeConversations++;
        
        logger.info('Conversation workflow started successfully', { userId, sessionId });
        
        return sessionId;
      },
      'startConversationWorkflow',
      {
        retry: { maxAttempts: 2 },
        circuitBreaker: { name: 'conversation-manager' }
      }
    );
  }

  /**
   * Process conversation input through the complete pipeline
   */
  // @monitorServiceCall('ServiceOrchestrator') // Decorator has signature issues
  async processConversationInput(sessionId: string, input: UserInput): Promise<ServiceConversationResponse> {
    this.ensureInitialized();
    
    return errorRecovery.executeWithRecovery(
      async () => {
        logger.info('Processing conversation input', { sessionId, inputType: input.type });
        
        let processedInput = input;
        
        // If input is audio, transcribe it first
        if (input.type === 'audio' && input.audioData) {
          logger.debug('Transcribing audio input', { sessionId });
          
          const transcriptionResult = await errorRecovery.executeWithRecovery(
            () => this.services.speechToText.transcribe({
              audioData: input.audioData!,
              format: 'wav', // Assume WAV format for now
              sampleRate: 16000
            }),
            'speechToTextTranscribe',
            {
              retry: { maxAttempts: 2 },
              circuitBreaker: { name: 'speech-to-text' },
              fallback: {
                fallbackFunction: async () => ({
                  text: '[Audio transcription failed - please type your message]',
                  confidence: 0,
                  segments: [],
                  timestamp: new Date()
                })
              }
            }
          );
          
          processedInput = {
            ...input,
            text: transcriptionResult.text,
            confidence: transcriptionResult.confidence
          };
          
          logger.debug('Audio transcription completed', { 
            sessionId, 
            confidence: transcriptionResult.confidence,
            textLength: transcriptionResult.text.length 
          });
        }
        
        // Process through conversation manager
        const conversationResponse = await this.services.conversationManager.processUserInput(sessionId, processedInput);
        
        // If response should be read aloud, generate audio
        if (conversationResponse.shouldReadAloud) {
          logger.debug('Generating audio response', { sessionId });
          
          try {
            const audioResponse = await errorRecovery.executeWithRecovery(
              () => this.services.textToSpeech.synthesize({
                text: conversationResponse.message,
                voice: 'default',
                format: 'mp3'
              }),
              'textToSpeechSynthesize',
              {
                retry: { maxAttempts: 1 },
                circuitBreaker: { name: 'text-to-speech' }
              }
            );
            
            conversationResponse.audioData = audioResponse.audioData;
            
          } catch (audioError) {
            logger.warn('Failed to generate audio response, continuing without audio:', audioError);
            // Continue without audio - don't fail the entire request
          }
        }
        
        logger.info('Conversation input processed successfully', { sessionId });
        
        return conversationResponse;
      },
      'processConversationInput',
      {
        retry: { maxAttempts: 2 },
        circuitBreaker: { name: 'conversation-processing' }
      }
    );
  }

  /**
   * Generate SOP from conversation session
   */
  async generateSOPFromSession(sessionId: string, sopType: SOPType): Promise<SOPDocument> {
    this.ensureInitialized();
    
    try {
      const startTime = Date.now();
      
      logger.info('Generating SOP from session', { sessionId, sopType });
      
      // Finalize workflow from conversation
      const workflowDefinition = await this.services.conversationManager.finalizeWorkflow(sessionId);
      
      // Generate SOP document
      const sopDocument = await this.services.sopGenerator.generateSOP(workflowDefinition, sopType);
      
      // Generate visual charts if needed
      if (sopDocument.charts && sopDocument.charts.length > 0) {
        logger.debug('Generating visual charts for SOP', { sopId: sopDocument.id, chartCount: sopDocument.charts.length });
        
        for (const chartDef of sopDocument.charts) {
          try {
            let chart;
            
            switch (chartDef.type) {
              case 'flowchart':
                chart = await this.services.visualGenerator.generateFlowchart(workflowDefinition);
                break;
              case 'process_map':
                chart = await this.services.visualGenerator.generateProcessMap(workflowDefinition);
                break;
              default:
                logger.warn('Unknown chart type, skipping:', { type: chartDef.type });
                continue;
            }
            
            // Update chart definition with generated data
            chartDef.data = chart.data;
            chartDef.styling = chart.styling;
            
          } catch (chartError) {
            logger.warn('Failed to generate chart, continuing without it:', chartError);
            // Continue without this chart - don't fail the entire SOP generation
          }
        }
      }
      
      // Validate SOP completeness
      const validationResult = this.services.sopGenerator.validateSOPCompleteness(sopDocument);
      
      if (!validationResult.isValid) {
        logger.warn('Generated SOP has validation issues', { 
          sopId: sopDocument.id, 
          errors: validationResult.errors,
          warnings: validationResult.warnings 
        });
      }
      
      // Update metrics
      this.metrics.totalSOPsGenerated++;
      this.metrics.activeConversations = Math.max(0, this.metrics.activeConversations - 1);
      
      const duration = Date.now() - startTime;
      this.updateResponseTime('sopGeneration', duration);
      
      logger.info('SOP generated successfully', { 
        sessionId, 
        sopId: sopDocument.id, 
        sopType, 
        duration,
        isValid: validationResult.isValid 
      });
      
      return sopDocument;
      
    } catch (error) {
      this.incrementErrorRate();
      logger.error('Failed to generate SOP from session:', error);
      throw new Error(`Failed to generate SOP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export SOP document in specified format
   */
  async exportSOPDocument(sopId: string, format: string, options?: any): Promise<{ downloadUrl: string; format: string }> {
    this.ensureInitialized();
    
    try {
      const startTime = Date.now();
      
      logger.info('Exporting SOP document', { sopId, format });
      
      // TODO: Retrieve SOP document (this would need to be implemented in SOPGeneratorService)
      // For now, we'll assume the document is passed or retrieved somehow
      
      // Export document
      const exportResult = await this.services.documentExporter.exportDocument(sopId, format, options);
      
      const duration = Date.now() - startTime;
      this.updateResponseTime('export', duration);
      
      logger.info('SOP document exported successfully', { sopId, format, duration });
      
      return {
        downloadUrl: exportResult.filePath,
        format: exportResult.format
      };
      
    } catch (error) {
      this.incrementErrorRate();
      logger.error('Failed to export SOP document:', error);
      throw new Error(`Failed to export document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get health status of all services
   */
  async getServiceHealth(): Promise<ServiceHealthStatus> {
    const serviceNames = Object.keys(this.services) as Array<keyof typeof this.services>;
    const healthStatus: ServiceHealthStatus = {
      overall: 'healthy',
      services: {}
    };

    let unhealthyCount = 0;
    let degradedCount = 0;

    for (const serviceName of serviceNames) {
      try {
        // TODO: Implement health check methods in each service
        // For now, we'll assume services are healthy if initialized
        const status = this.isInitialized ? 'healthy' : 'unhealthy';
        
        healthStatus.services[serviceName] = {
          status: status as any,
          lastCheck: new Date().toISOString()
        };

        if (status === 'unhealthy') unhealthyCount++;
        else if (status === 'degraded') degradedCount++;

      } catch (error) {
        healthStatus.services[serviceName] = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        unhealthyCount++;
      }
    }

    // Determine overall health
    if (unhealthyCount > 0) {
      healthStatus.overall = 'unhealthy';
    } else if (degradedCount > 0) {
      healthStatus.overall = 'degraded';
    }

    return healthStatus;
  }

  /**
   * Get service metrics
   */
  async getServiceMetrics(): Promise<ServiceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Ensure orchestrator is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Service orchestrator is not initialized');
    }
  }

  /**
   * Update response time metrics
   */
  private updateResponseTime(operation: keyof ServiceMetrics['responseTime'], duration: number): void {
    // Simple moving average (could be improved with more sophisticated metrics)
    const current = this.metrics.responseTime[operation];
    this.metrics.responseTime[operation] = current === 0 ? duration : (current + duration) / 2;
  }

  /**
   * Increment error rate
   */
  private incrementErrorRate(): void {
    // Simple error counting (could be improved with time-based windows)
    this.metrics.errorRate++;
  }
}

// Export singleton instance
export const serviceOrchestrator = new ServiceOrchestratorImpl();