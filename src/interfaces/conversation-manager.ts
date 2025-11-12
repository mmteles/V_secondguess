import { 
  SessionId, 
  UserInput, 
  ConversationResponse, 
  WorkflowSummary, 
  WorkflowDefinition 
} from '@/models';

/**
 * Conversation Manager for orchestrating dialogue flow and session management
 */
export interface ConversationManager {
  /**
   * Start a new conversation session
   * @param userId - Unique identifier for the user
   */
  startSession(userId: string): Promise<SessionId>;

  /**
   * Process user input and generate appropriate response
   * @param sessionId - Session identifier
   * @param input - User input to process
   */
  processUserInput(sessionId: SessionId, input: UserInput): Promise<ConversationResponse>;

  /**
   * Generate summary of current workflow information
   * @param sessionId - Session identifier
   */
  generateSummary(sessionId: SessionId): Promise<WorkflowSummary>;

  /**
   * Check if iteration limit has been reached
   * @param sessionId - Session identifier
   */
  checkIterationLimit(sessionId: SessionId): boolean;

  /**
   * Finalize workflow and prepare for SOP generation
   * @param sessionId - Session identifier
   */
  finalizeWorkflow(sessionId: SessionId): Promise<WorkflowDefinition>;

  /**
   * Get current session state
   * @param sessionId - Session identifier
   */
  getSessionState(sessionId: SessionId): Promise<ConversationSessionState>;

  /**
   * End conversation session
   * @param sessionId - Session identifier
   */
  endSession(sessionId: SessionId): Promise<void>;

  /**
   * Resume existing session
   * @param sessionId - Session identifier
   */
  resumeSession(sessionId: SessionId): Promise<boolean>;
}

export interface ConversationSessionState {
  isActive: boolean;
  currentPhase: ConversationPhase;
  iterationCount: number;
  lastActivity: Date;
  workflowCompleteness: number; // 0-100 percentage
}

export enum ConversationPhase {
  INITIALIZATION = 'initialization',
  WORKFLOW_DESCRIPTION = 'workflow_description',
  DETAIL_GATHERING = 'detail_gathering',
  VALIDATION = 'validation',
  REFINEMENT = 'refinement',
  FINALIZATION = 'finalization'
}