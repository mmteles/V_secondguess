/**
 * Conversation Manager Service Implementation
 * Handles conversation flow orchestration, state management, and iterative summary process
 */

import { ConversationManager, ConversationSessionState, ConversationPhase } from '@/interfaces';
import { 
  SessionId, 
  UserInput, 
  ConversationResponse, 
  WorkflowSummary, 
  WorkflowDefinition,
  ConversationState,
  WorkflowType,
  ComplexityLevel,
  TimeUnit,
  ConversationSession,
  UserInputType,
  validateUserInput,
  validateWorkflowSummary
} from '@/models';

interface ExtendedSessionState extends ConversationSessionState {
  conversationHistory: UserInput[];
  workflowData: Partial<WorkflowDefinition>;
  summaryHistory: WorkflowSummary[];
  pendingQuestions: string[];
  userChoices: Record<string, any>;
  contextData: SessionContext;
  persistenceKey?: string;
}

interface SessionContext {
  userId: string;
  sessionStartTime: Date;
  totalInteractionTime: number; // in milliseconds
  lastSaveTime: Date;
  recoveryData?: SessionRecoveryData;
  preferences: UserPreferences;
}

interface SessionRecoveryData {
  lastKnownState: ConversationPhase;
  lastValidSummary?: WorkflowSummary | undefined;
  criticalDataPoints: string[];
  recoveryInstructions: string[];
}

interface UserPreferences {
  preferredLanguage: string;
  audioFeedback: boolean;
  summaryFrequency: 'after_each_input' | 'every_2_inputs' | 'every_3_inputs';
  confirmationRequired: boolean;
}

interface SessionPersistenceData {
  sessionId: SessionId;
  userId: string;
  state: ExtendedSessionState;
  timestamp: Date;
  version: string;
}

export class ConversationManagerService implements ConversationManager {
  private sessions = new Map<SessionId, ExtendedSessionState>();
  private persistedSessions = new Map<SessionId, SessionPersistenceData>();
  private readonly ITERATION_LIMIT = 5;
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private readonly PERSISTENCE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private cleanupInterval?: NodeJS.Timeout;
  private persistenceInterval?: NodeJS.Timeout;

  constructor() {
    this.startPeriodicCleanup();
    this.startPeriodicPersistence();
  }

  async startSession(userId: string, preferences?: Partial<UserPreferences>): Promise<SessionId> {
    const sessionId: SessionId = `session-${userId}-${Date.now()}`;
    const now = new Date();
    
    const defaultPreferences: UserPreferences = {
      preferredLanguage: 'en',
      audioFeedback: true,
      summaryFrequency: 'after_each_input',
      confirmationRequired: true
    };

    const initialSession: ExtendedSessionState = {
      isActive: true,
      currentPhase: ConversationPhase.INITIALIZATION,
      iterationCount: 0,
      lastActivity: now,
      workflowCompleteness: 0,
      conversationHistory: [],
      workflowData: {
        id: `workflow-${sessionId}`,
        title: '',
        description: '',
        type: WorkflowType.SEQUENTIAL,
        steps: [],
        inputs: [],
        outputs: [],
        dependencies: [],
        risks: [],
        createdAt: now,
        updatedAt: now
      },
      summaryHistory: [],
      pendingQuestions: [],
      userChoices: {},
      contextData: {
        userId,
        sessionStartTime: now,
        totalInteractionTime: 0,
        lastSaveTime: now,
        preferences: { ...defaultPreferences, ...preferences }
      },
      persistenceKey: `persist-${sessionId}`
    };

    this.sessions.set(sessionId, initialSession);
    await this.persistSession(sessionId);
    
    return sessionId;
  }

  async processUserInput(sessionId: SessionId, input: UserInput): Promise<ConversationResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.isActive) {
      throw new Error(`Session ${sessionId} is not active`);
    }

    // Validate input
    if (!validateUserInput(input)) {
      throw new Error('Invalid user input provided');
    }

    // Update session activity
    session.lastActivity = new Date();
    session.conversationHistory.push(input);

    // Process input based on current conversation phase
    const response = await this.orchestrateConversationFlow(session, input, sessionId);
    
    // Update session state based on response
    if (response.nextState) {
      session.currentPhase = this.mapConversationStateToPhase(response.nextState);
    }

    return response;
  }

  private async orchestrateConversationFlow(
    session: ExtendedSessionState, 
    input: UserInput,
    sessionId: SessionId
  ): Promise<ConversationResponse> {
    switch (session.currentPhase) {
      case ConversationPhase.INITIALIZATION:
        return this.handleInitializationPhase(session, input);
      
      case ConversationPhase.WORKFLOW_DESCRIPTION:
        return this.handleWorkflowDescriptionPhase(session, input, sessionId);
      
      case ConversationPhase.DETAIL_GATHERING:
        return this.handleDetailGatheringPhase(session, input, sessionId);
      
      case ConversationPhase.VALIDATION:
        return this.handleValidationPhase(session, input, sessionId);
      
      case ConversationPhase.REFINEMENT:
        return this.handleRefinementPhase(session, input, sessionId);
      
      case ConversationPhase.FINALIZATION:
        return this.handleFinalizationPhase(session, input);
      
      default:
        throw new Error(`Unknown conversation phase: ${session.currentPhase}`);
    }
  }

  private async handleInitializationPhase(
    session: ExtendedSessionState, 
    input: UserInput
  ): Promise<ConversationResponse> {
    // Extract initial workflow information
    this.extractWorkflowInformation(session, input);
    session.iterationCount++;
    
    return {
      message: "Thank you for starting to describe your workflow. Please continue with more details about the process, including the steps involved, inputs needed, and expected outputs.",
      requiresConfirmation: false,
      suggestedActions: [
        'Describe the main steps',
        'Explain inputs and outputs',
        'Mention any dependencies'
      ],
      shouldReadAloud: true,
      nextState: ConversationState.GATHERING_DETAILS
    };
  }

  private async handleWorkflowDescriptionPhase(
    session: ExtendedSessionState, 
    input: UserInput,
    sessionId: SessionId
  ): Promise<ConversationResponse> {
    this.extractWorkflowInformation(session, input);
    session.iterationCount++;

    // Generate summary after each input
    const summary = await this.generateSummary(sessionId);
    session.summaryHistory.push(summary);

    // Check if we've reached the iteration limit
    if (session.iterationCount >= this.ITERATION_LIMIT) {
      return this.handleIterationCheckpoint(session);
    }

    return {
      message: `${summary.description}\n\nThat's all or there is something missing?`,
      requiresConfirmation: true,
      suggestedActions: [
        'Add more details',
        'Clarify existing information',
        'Continue to next phase'
      ],
      shouldReadAloud: true,
      nextState: ConversationState.GATHERING_DETAILS
    };
  }

  private async handleDetailGatheringPhase(
    session: ExtendedSessionState, 
    input: UserInput,
    sessionId: SessionId
  ): Promise<ConversationResponse> {
    this.extractWorkflowInformation(session, input);
    session.iterationCount++;

    // Generate updated summary
    const summary = await this.generateSummary(sessionId);
    session.summaryHistory.push(summary);

    // Check iteration limit
    if (session.iterationCount >= this.ITERATION_LIMIT) {
      return this.handleIterationCheckpoint(session);
    }

    // Determine if we need more information
    const completeness = this.calculateWorkflowCompleteness(session);
    session.workflowCompleteness = completeness;

    if (completeness >= 80) {
      return {
        message: `${summary.description}\n\nYour workflow description appears comprehensive. That's all or there is something missing?`,
        requiresConfirmation: true,
        suggestedActions: [
          'Proceed to validation',
          'Add final details',
          'Review and refine'
        ],
        shouldReadAloud: true,
        nextState: ConversationState.VALIDATION
      };
    }

    return {
      message: `${summary.description}\n\nThat's all or there is something missing?`,
      requiresConfirmation: true,
      suggestedActions: [
        'Add more details',
        'Clarify steps',
        'Specify requirements'
      ],
      shouldReadAloud: true,
      nextState: ConversationState.GATHERING_DETAILS
    };
  }

  private async handleValidationPhase(
    session: ExtendedSessionState, 
    input: UserInput,
    sessionId: SessionId
  ): Promise<ConversationResponse> {
    if (input.type === UserInputType.CONFIRMATION) {
      if (input.content.toLowerCase().includes('yes') || input.content.toLowerCase().includes('correct')) {
        return {
          message: "Perfect! Your workflow has been validated. Would you like to proceed with SOP generation or make any final refinements?",
          requiresConfirmation: true,
          suggestedActions: [
            'Generate SOP',
            'Make refinements',
            'Review workflow'
          ],
          shouldReadAloud: true,
          nextState: ConversationState.FINALIZATION
        };
      }
    }

    // Handle corrections or additional information
    this.extractWorkflowInformation(session, input);
    const summary = await this.generateSummary(sessionId);
    
    return {
      message: `I've updated the workflow based on your feedback: ${summary.description}\n\nIs this now accurate?`,
      requiresConfirmation: true,
      suggestedActions: [
        'Confirm accuracy',
        'Make more changes',
        'Add details'
      ],
      shouldReadAloud: true,
      nextState: ConversationState.VALIDATION
    };
  }

  private async handleRefinementPhase(
    session: ExtendedSessionState, 
    input: UserInput,
    sessionId: SessionId
  ): Promise<ConversationResponse> {
    this.extractWorkflowInformation(session, input);
    const summary = await this.generateSummary(sessionId);
    
    return {
      message: `Refinement applied: ${summary.description}\n\nAre you satisfied with these changes?`,
      requiresConfirmation: true,
      suggestedActions: [
        'Accept changes',
        'Make more refinements',
        'Finalize workflow'
      ],
      shouldReadAloud: true,
      nextState: ConversationState.FINALIZATION
    };
  }

  private async handleFinalizationPhase(
    session: ExtendedSessionState, 
    input: UserInput
  ): Promise<ConversationResponse> {
    if (input.type === UserInputType.CONFIRMATION) {
      return {
        message: "Excellent! Your workflow is now ready for SOP generation. The system will create a comprehensive Standard Operating Procedure based on our conversation.",
        requiresConfirmation: false,
        suggestedActions: [
          'Generate SOP',
          'Export document',
          'Start new workflow'
        ],
        shouldReadAloud: true,
        nextState: ConversationState.FINALIZATION
      };
    }

    return {
      message: "Please confirm if you're ready to proceed with SOP generation, or let me know if you need any final adjustments.",
      requiresConfirmation: true,
      suggestedActions: [
        'Confirm and proceed',
        'Make final changes',
        'Review workflow'
      ],
      shouldReadAloud: true,
      nextState: ConversationState.FINALIZATION
    };
  }

  private handleIterationCheckpoint(session: ExtendedSessionState): ConversationResponse {
    return {
      message: "We've gone through several iterations of your workflow description. Would you like more time to review and elaborate on your description, or shall we continue with the current information to generate your SOP?",
      requiresConfirmation: true,
      suggestedActions: [
        'Continue with current information',
        'Take more time to elaborate',
        'Review what we have so far'
      ],
      shouldReadAloud: true,
      nextState: ConversationState.VALIDATION,
      metadata: {
        isCheckpoint: true,
        iterationCount: session.iterationCount
      }
    };
  }

  // Workflow Information Gathering Logic

  private extractWorkflowInformation(session: ExtendedSessionState, input: UserInput): void {
    const content = input.content.toLowerCase();
    const originalContent = input.content;
    
    // Extract workflow title if not set
    this.extractWorkflowTitle(session, content, originalContent);
    
    // Update description
    this.updateWorkflowDescription(session, originalContent);
    
    // Extract workflow components
    this.extractWorkflowSteps(session, content, originalContent);
    this.extractWorkflowInputs(session, content, originalContent);
    this.extractWorkflowOutputs(session, content, originalContent);
    this.extractWorkflowDependencies(session, content, originalContent);
    this.extractWorkflowRisks(session, content, originalContent);
    
    // Determine workflow type
    this.determineWorkflowType(session, content);
    
    session.workflowData.updatedAt = new Date();
    
    // Generate targeted questions for missing information
    this.generateTargetedQuestions(session);
  }

  private extractWorkflowTitle(session: ExtendedSessionState, content: string, originalContent: string): void {
    if (session.workflowData.title) return;

    // Look for explicit title patterns
    const titlePatterns = [
      /(?:workflow|process)\s+(?:for|to|of|called|named)\s+([^.!?]+)/i,
      /(?:this|the)\s+(?:workflow|process)\s+(?:is|involves|handles)\s+([^.!?]+)/i,
      /(?:i|we)\s+(?:need|want)\s+(?:a|to)\s+(?:workflow|process)\s+(?:for|to)\s+([^.!?]+)/i
    ];

    for (const pattern of titlePatterns) {
      const match = originalContent.match(pattern);
      if (match && match[1]) {
        session.workflowData.title = match[1].trim();
        break;
      }
    }

    // Fallback: extract from first meaningful sentence
    if (!session.workflowData.title) {
      const sentences = originalContent.split(/[.!?]+/);
      const meaningfulSentence = sentences.find(s => s.trim().length > 10);
      if (meaningfulSentence) {
        const words = meaningfulSentence.trim().split(' ').slice(0, 6);
        session.workflowData.title = words.join(' ');
      }
    }
  }

  private updateWorkflowDescription(session: ExtendedSessionState, content: string): void {
    if (session.workflowData.description) {
      session.workflowData.description += ` ${content}`;
    } else {
      session.workflowData.description = content;
    }
  }

  private extractWorkflowSteps(session: ExtendedSessionState, content: string, originalContent: string): void {
    const stepKeywords = ['step', 'then', 'next', 'after', 'first', 'second', 'third', 'finally', 'lastly'];
    const actionVerbs = ['create', 'review', 'approve', 'send', 'receive', 'process', 'validate', 'check'];
    
    // Look for numbered steps
    const numberedSteps = originalContent.match(/\d+\.\s*([^.!?]+)/g);
    if (numberedSteps) {
      numberedSteps.forEach((step, index) => {
        this.addWorkflowStep(session, step.replace(/\d+\.\s*/, ''), index + 1);
      });
      return;
    }

    // Look for sequential indicators
    const sentences = originalContent.split(/[.!?]+/);
    sentences.forEach((sentence, index) => {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length < 5) return;

      const hasStepKeyword = stepKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      );
      const hasActionVerb = actionVerbs.some(verb => 
        sentence.toLowerCase().includes(verb)
      );

      if (hasStepKeyword || hasActionVerb) {
        this.addWorkflowStep(session, trimmedSentence, (session.workflowData.steps?.length || 0) + 1);
      }
    });
  }

  private addWorkflowStep(session: ExtendedSessionState, description: string, order: number): void {
    if (!session.workflowData.steps) {
      session.workflowData.steps = [];
    }

    // Check if step already exists
    const existingStep = session.workflowData.steps.find(step => 
      step.description.toLowerCase().includes(description.toLowerCase().substring(0, 20))
    );

    if (!existingStep) {
      session.workflowData.steps.push({
        id: `step-${order}`,
        title: `Step ${order}`,
        description: description,
        order: order,
        type: this.determineStepType(description),
        inputs: this.extractStepInputs(description),
        outputs: this.extractStepOutputs(description),
        prerequisites: [],
        instructions: [description],
        qualityChecks: []
      });
    }
  }

  private determineStepType(description: string): any {
    const content = description.toLowerCase();
    
    if (content.includes('automated') || content.includes('system') || content.includes('automatically')) {
      return 'automated';
    } else if (content.includes('decision') || content.includes('choose') || content.includes('if')) {
      return 'decision';
    } else if (content.includes('parallel') || content.includes('simultaneously')) {
      return 'parallel';
    } else if (content.includes('repeat') || content.includes('loop') || content.includes('until')) {
      return 'loop';
    }
    
    return 'manual';
  }

  private extractStepInputs(description: string): string[] {
    const inputs: string[] = [];
    const inputPatterns = [
      /(?:using|with|from)\s+([^,.\s]+)/gi,
      /(?:input|data|information)\s+([^,.\s]+)/gi,
      /(?:requires?|needs?)\s+([^,.\s]+)/gi
    ];

    inputPatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const input = match.replace(/(?:using|with|from|input|data|information|requires?|needs?)\s+/i, '').trim();
          if (input.length > 0 && !inputs.includes(input)) {
            inputs.push(input);
          }
        });
      }
    });

    return inputs;
  }

  private extractStepOutputs(description: string): string[] {
    const outputs: string[] = [];
    const outputPatterns = [
      /(?:creates?|generates?|produces?)\s+([^,.\s]+)/gi,
      /(?:results? in|outputs?)\s+([^,.\s]+)/gi,
      /(?:delivers?|provides?)\s+([^,.\s]+)/gi
    ];

    outputPatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const output = match.replace(/(?:creates?|generates?|produces?|results? in|outputs?|delivers?|provides?)\s+/i, '').trim();
          if (output.length > 0 && !outputs.includes(output)) {
            outputs.push(output);
          }
        });
      }
    });

    return outputs;
  }

  private extractWorkflowInputs(session: ExtendedSessionState, content: string, originalContent: string): void {
    if (!session.workflowData.inputs) {
      session.workflowData.inputs = [];
    }

    const inputKeywords = ['input', 'require', 'need', 'data', 'information', 'document', 'form'];
    const inputPatterns = [
      /(?:inputs?|requires?|needs?)\s+([^.!?]+)/gi,
      /(?:data|information|documents?)\s+(?:such as|including|like)\s+([^.!?]+)/gi
    ];

    inputPatterns.forEach(pattern => {
      const matches = originalContent.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const inputDescription = match.replace(/(?:inputs?|requires?|needs?|data|information|documents?|such as|including|like)\s*/gi, '').trim();
          this.addWorkflowInput(session, inputDescription);
        });
      }
    });
  }

  private addWorkflowInput(session: ExtendedSessionState, description: string): void {
    const existingInput = session.workflowData.inputs?.find(input => 
      input.description.toLowerCase().includes(description.toLowerCase().substring(0, 15))
    );

    if (!existingInput && description.length > 3) {
      session.workflowData.inputs?.push({
        id: `input-${(session.workflowData.inputs?.length || 0) + 1}`,
        name: description.split(' ').slice(0, 3).join(' '),
        description: description,
        type: this.determineInputType(description),
        required: true,
        validation: []
      });
    }
  }

  private determineInputType(description: string): any {
    const content = description.toLowerCase();
    
    if (content.includes('document') || content.includes('file') || content.includes('form')) {
      return 'document';
    } else if (content.includes('approval') || content.includes('permission')) {
      return 'approval';
    } else if (content.includes('resource') || content.includes('equipment')) {
      return 'resource';
    } else if (content.includes('data') || content.includes('information')) {
      return 'data';
    }
    
    return 'information';
  }

  private extractWorkflowOutputs(session: ExtendedSessionState, content: string, originalContent: string): void {
    if (!session.workflowData.outputs) {
      session.workflowData.outputs = [];
    }

    const outputPatterns = [
      /(?:outputs?|results?|produces?|generates?|creates?)\s+([^.!?]+)/gi,
      /(?:delivers?|provides?)\s+([^.!?]+)/gi
    ];

    outputPatterns.forEach(pattern => {
      const matches = originalContent.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const outputDescription = match.replace(/(?:outputs?|results?|produces?|generates?|creates?|delivers?|provides?)\s*/gi, '').trim();
          this.addWorkflowOutput(session, outputDescription);
        });
      }
    });
  }

  private addWorkflowOutput(session: ExtendedSessionState, description: string): void {
    const existingOutput = session.workflowData.outputs?.find(output => 
      output.description.toLowerCase().includes(description.toLowerCase().substring(0, 15))
    );

    if (!existingOutput && description.length > 3) {
      session.workflowData.outputs?.push({
        id: `output-${(session.workflowData.outputs?.length || 0) + 1}`,
        name: description.split(' ').slice(0, 3).join(' '),
        description: description,
        type: this.determineOutputType(description),
        qualityCriteria: []
      });
    }
  }

  private determineOutputType(description: string): any {
    const content = description.toLowerCase();
    
    if (content.includes('document') || content.includes('report') || content.includes('file')) {
      return 'document';
    } else if (content.includes('notification') || content.includes('alert') || content.includes('message')) {
      return 'notification';
    } else if (content.includes('decision') || content.includes('approval') || content.includes('choice')) {
      return 'decision';
    } else if (content.includes('data') || content.includes('information')) {
      return 'data';
    }
    
    return 'report';
  }

  private extractWorkflowDependencies(session: ExtendedSessionState, content: string, originalContent: string): void {
    if (!session.workflowData.dependencies) {
      session.workflowData.dependencies = [];
    }

    const dependencyKeywords = ['depends on', 'requires', 'needs', 'after', 'before', 'prerequisite'];
    const dependencyPatterns = [
      /(?:depends on|requires|needs)\s+([^.!?]+)/gi,
      /(?:after|before)\s+([^.!?]+)/gi,
      /(?:prerequisite|precondition)\s+([^.!?]+)/gi
    ];

    dependencyPatterns.forEach(pattern => {
      const matches = originalContent.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const dependencyDescription = match.replace(/(?:depends on|requires|needs|after|before|prerequisite|precondition)\s*/gi, '').trim();
          this.addWorkflowDependency(session, dependencyDescription);
        });
      }
    });
  }

  private addWorkflowDependency(session: ExtendedSessionState, description: string): void {
    if (description.length > 3) {
      session.workflowData.dependencies?.push({
        id: `dependency-${(session.workflowData.dependencies?.length || 0) + 1}`,
        type: 'prerequisite' as any,
        source: 'external',
        target: 'workflow',
        description: description
      });
    }
  }

  private extractWorkflowRisks(session: ExtendedSessionState, content: string, originalContent: string): void {
    if (!session.workflowData.risks) {
      session.workflowData.risks = [];
    }

    const riskKeywords = ['risk', 'problem', 'issue', 'challenge', 'concern', 'failure', 'error'];
    const riskPatterns = [
      /(?:risk|problem|issue|challenge|concern)\s+(?:of|with|is)\s+([^.!?]+)/gi,
      /(?:might|could|may)\s+(?:fail|error|break)\s+([^.!?]+)/gi
    ];

    riskPatterns.forEach(pattern => {
      const matches = originalContent.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const riskDescription = match.replace(/(?:risk|problem|issue|challenge|concern|of|with|is|might|could|may|fail|error|break)\s*/gi, '').trim();
          this.addWorkflowRisk(session, riskDescription);
        });
      }
    });
  }

  private addWorkflowRisk(session: ExtendedSessionState, description: string): void {
    if (description.length > 3) {
      session.workflowData.risks?.push({
        id: `risk-${(session.workflowData.risks?.length || 0) + 1}`,
        description: description,
        probability: 'medium' as any,
        impact: 'medium' as any,
        mitigation: [],
        owner: 'workflow_owner'
      });
    }
  }

  private determineWorkflowType(session: ExtendedSessionState, content: string): void {
    if (content.includes('parallel') || content.includes('simultaneously') || content.includes('at the same time')) {
      session.workflowData.type = WorkflowType.PARALLEL;
    } else if (content.includes('if') || content.includes('condition') || content.includes('depending on')) {
      session.workflowData.type = WorkflowType.CONDITIONAL;
    } else if (content.includes('repeat') || content.includes('loop') || content.includes('iterate')) {
      session.workflowData.type = WorkflowType.ITERATIVE;
    } else if (content.includes('event') || content.includes('trigger') || content.includes('when')) {
      session.workflowData.type = WorkflowType.EVENT_DRIVEN;
    } else {
      session.workflowData.type = WorkflowType.SEQUENTIAL;
    }
  }

  private generateTargetedQuestions(session: ExtendedSessionState): void {
    const questions: string[] = [];
    const workflow = session.workflowData;

    // Check for missing critical information
    if (!workflow.title || workflow.title.length < 3) {
      questions.push("What would you like to call this workflow or process?");
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      questions.push("Can you describe the main steps involved in this process?");
    }

    if (!workflow.inputs || workflow.inputs.length === 0) {
      questions.push("What inputs, data, or resources are needed to start this process?");
    }

    if (!workflow.outputs || workflow.outputs.length === 0) {
      questions.push("What are the expected outputs or deliverables from this process?");
    }

    if (workflow.steps && workflow.steps.length > 0) {
      const stepsWithoutInputs = workflow.steps.filter(step => step.inputs.length === 0);
      if (stepsWithoutInputs.length > 0 && stepsWithoutInputs[0]) {
        questions.push(`What inputs are needed for the step: "${stepsWithoutInputs[0].description}"?`);
      }

      const stepsWithoutOutputs = workflow.steps.filter(step => step.outputs.length === 0);
      if (stepsWithoutOutputs.length > 0 && stepsWithoutOutputs[0]) {
        questions.push(`What does the step "${stepsWithoutOutputs[0].description}" produce or deliver?`);
      }
    }

    if (!workflow.dependencies || workflow.dependencies.length === 0) {
      questions.push("Are there any prerequisites or dependencies that must be completed before this process can start?");
    }

    if (!workflow.risks || workflow.risks.length === 0) {
      questions.push("What potential risks, challenges, or failure points should we be aware of in this process?");
    }

    // Store questions for later use
    session.pendingQuestions = questions.slice(0, 3); // Limit to 3 most important questions
  }

  async getTargetedQuestions(sessionId: SessionId): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return [...session.pendingQuestions];
  }

  async detectMissingElements(sessionId: SessionId): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const missingElements: string[] = [];
    const workflow = session.workflowData;

    if (!workflow.title) missingElements.push('Workflow Title');
    if (!workflow.description || workflow.description.length < 20) missingElements.push('Detailed Description');
    if (!workflow.steps || workflow.steps.length === 0) missingElements.push('Process Steps');
    if (!workflow.inputs || workflow.inputs.length === 0) missingElements.push('Required Inputs');
    if (!workflow.outputs || workflow.outputs.length === 0) missingElements.push('Expected Outputs');
    if (!workflow.dependencies || workflow.dependencies.length === 0) missingElements.push('Dependencies/Prerequisites');

    return missingElements;
  }

  async generateClarificationRequest(sessionId: SessionId, ambiguousInput: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Analyze the ambiguous input to generate specific clarification
    const content = ambiguousInput.toLowerCase();
    
    if (content.includes('it') || content.includes('this') || content.includes('that')) {
      return "Could you be more specific about what 'it' or 'this' refers to in your description?";
    }

    if (content.includes('someone') || content.includes('they') || content.includes('person')) {
      return "Who specifically is responsible for this step? What role or department should handle this?";
    }

    if (content.includes('sometime') || content.includes('later') || content.includes('eventually')) {
      return "Can you provide more specific timing or conditions for when this should happen?";
    }

    if (content.includes('document') || content.includes('form') || content.includes('file')) {
      return "What specific type of document or form is involved? What information should it contain?";
    }

    if (content.includes('system') || content.includes('tool') || content.includes('software')) {
      return "Which specific system, tool, or software are you referring to?";
    }

    // Generic clarification for unclear descriptions
    return "Could you provide more details about this part of the process? I want to make sure I understand it correctly.";
  }

  private calculateWorkflowCompleteness(session: ExtendedSessionState): number {
    let score = 0;
    const workflow = session.workflowData;

    // Title (10 points)
    if (workflow.title && workflow.title.length > 0) score += 10;

    // Description (20 points)
    if (workflow.description && workflow.description.length > 50) score += 20;

    // Steps (30 points)
    if (workflow.steps && workflow.steps.length > 0) {
      score += Math.min(30, workflow.steps.length * 10);
    }

    // Inputs (15 points)
    if (workflow.inputs && workflow.inputs.length > 0) score += 15;

    // Outputs (15 points)
    if (workflow.outputs && workflow.outputs.length > 0) score += 15;

    // Dependencies (10 points)
    if (workflow.dependencies && workflow.dependencies.length > 0) score += 10;

    return Math.min(100, score);
  }

  private mapConversationStateToPhase(state: ConversationState): ConversationPhase {
    switch (state) {
      case ConversationState.INITIAL_DESCRIPTION:
        return ConversationPhase.WORKFLOW_DESCRIPTION;
      case ConversationState.GATHERING_DETAILS:
        return ConversationPhase.DETAIL_GATHERING;
      case ConversationState.VALIDATION:
        return ConversationPhase.VALIDATION;
      case ConversationState.REFINEMENT:
        return ConversationPhase.REFINEMENT;
      case ConversationState.FINALIZATION:
        return ConversationPhase.FINALIZATION;
      default:
        return ConversationPhase.INITIALIZATION;
    }
  }

  async generateSummary(sessionId: SessionId): Promise<WorkflowSummary> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const workflow = session.workflowData;
    
    // Generate title from description if not available
    let title = workflow.title || 'Workflow Process';
    if (!workflow.title && workflow.description) {
      const words = workflow.description.split(' ').slice(0, 5);
      title = words.join(' ') + (workflow.description.split(' ').length > 5 ? '...' : '');
    }

    // Extract key steps
    const keySteps = workflow.steps?.map(step => step.description) || [];
    
    // Identify inputs from conversation
    const identifiedInputs = this.extractInputsFromConversation(session.conversationHistory);
    
    // Identify outputs from conversation
    const identifiedOutputs = this.extractOutputsFromConversation(session.conversationHistory);

    // Calculate completeness
    const completenessScore = this.calculateWorkflowCompleteness(session);

    const summary: WorkflowSummary = {
      title,
      description: this.generateDescriptiveSummary(session),
      keySteps,
      identifiedInputs,
      identifiedOutputs,
      completenessScore,
      lastUpdated: new Date()
    };

    // Validate summary before returning
    if (!validateWorkflowSummary(summary)) {
      throw new Error('Generated workflow summary is invalid');
    }

    return summary;
  }

  private generateDescriptiveSummary(session: ExtendedSessionState): string {
    const workflow = session.workflowData;
    let summary = `This workflow involves ${workflow.steps?.length || 0} main steps`;
    
    if (workflow.description) {
      const sentences = workflow.description.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const keyPoints = sentences.slice(0, 3).map(s => s.trim()).join('. ');
      summary += `. ${keyPoints}`;
    }

    if (workflow.steps && workflow.steps.length > 0) {
      summary += ` The process includes: ${workflow.steps.slice(0, 3).map(step => step.description).join(', ')}`;
      if (workflow.steps.length > 3) {
        summary += ` and ${workflow.steps.length - 3} additional steps`;
      }
    }

    return summary + '.';
  }

  private extractInputsFromConversation(history: UserInput[]): string[] {
    const inputs: string[] = [];
    const inputKeywords = ['input', 'require', 'need', 'data', 'information', 'document'];
    
    history.forEach(input => {
      const content = input.content.toLowerCase();
      
      // Look for explicit input mentions
      if (content.includes('requires') && content.includes('as input')) {
        const match = content.match(/requires\s+([^.]+)\s+as\s+input/i);
        if (match && match[1]) {
          inputs.push(match[1].trim());
        }
      }
      
      // Look for "needs" patterns
      if (content.includes('needs') || content.includes('requires')) {
        const matches = content.match(/(?:needs|requires)\s+([^.!?]+)/gi);
        if (matches) {
          matches.forEach(match => {
            const extracted = match.replace(/(?:needs|requires)\s+/i, '').trim();
            if (extracted.length > 3 && !inputs.includes(extracted)) {
              inputs.push(extracted);
            }
          });
        }
      }
      
      // Look for document/data mentions
      if (content.includes('document') || content.includes('data')) {
        const matches = content.match(/(?:document|data|information)\s+([^.!?]+)/gi);
        if (matches) {
          matches.forEach(match => {
            const extracted = match.replace(/(?:document|data|information)\s+/i, '').trim();
            if (extracted.length > 3 && !inputs.includes(extracted)) {
              inputs.push(extracted);
            }
          });
        }
      }
    });

    return inputs.slice(0, 5); // Limit to 5 inputs
  }

  private extractOutputsFromConversation(history: UserInput[]): string[] {
    const outputs: string[] = [];
    
    history.forEach(input => {
      const content = input.content.toLowerCase();
      
      // Look for explicit output mentions
      if (content.includes('produces') || content.includes('generates')) {
        const matches = content.match(/(?:produces|generates)\s+([^.!?]+)/gi);
        if (matches) {
          matches.forEach(match => {
            const extracted = match.replace(/(?:produces|generates)\s+/i, '').trim();
            if (extracted.length > 3 && !outputs.includes(extracted)) {
              outputs.push(extracted);
            }
          });
        }
      }
      
      // Look for "creates" patterns
      if (content.includes('creates') || content.includes('delivers')) {
        const matches = content.match(/(?:creates|delivers)\s+([^.!?]+)/gi);
        if (matches) {
          matches.forEach(match => {
            const extracted = match.replace(/(?:creates|delivers)\s+/i, '').trim();
            if (extracted.length > 3 && !outputs.includes(extracted)) {
              outputs.push(extracted);
            }
          });
        }
      }
      
      // Look for result patterns
      if (content.includes('result') || content.includes('output')) {
        const matches = content.match(/(?:result|output)\s+([^.!?]+)/gi);
        if (matches) {
          matches.forEach(match => {
            const extracted = match.replace(/(?:result|output)\s+/i, '').trim();
            if (extracted.length > 3 && !outputs.includes(extracted)) {
              outputs.push(extracted);
            }
          });
        }
      }
    });

    return outputs.slice(0, 5); // Limit to 5 outputs
  }

  checkIterationLimit(sessionId: SessionId): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.iterationCount >= this.ITERATION_LIMIT : false;
  }

  async finalizeWorkflow(sessionId: SessionId): Promise<WorkflowDefinition> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const workflow = session.workflowData;
    
    // Ensure required fields are populated
    if (!workflow.title) {
      workflow.title = 'Generated Workflow';
    }
    
    if (!workflow.description) {
      workflow.description = 'Workflow generated from voice conversation';
    }

    // Set metadata
    workflow.metadata = {
      author: 'AI Voice SOP Agent',
      version: '1.0.0',
      tags: this.generateTagsFromWorkflow(workflow),
      category: this.determineWorkflowCategory(workflow),
      complexity: this.assessComplexity(workflow),
      estimatedDuration: this.estimateDuration(workflow),
      requiredSkills: this.identifyRequiredSkills(workflow)
    };

    workflow.updatedAt = new Date();

    // Mark session as finalized
    session.currentPhase = ConversationPhase.FINALIZATION;
    session.workflowCompleteness = 100;

    return workflow as WorkflowDefinition;
  }

  private generateTagsFromWorkflow(workflow: Partial<WorkflowDefinition>): string[] {
    const tags: string[] = [];
    const description = (workflow.description || '').toLowerCase();
    
    // Add tags based on content
    if (description.includes('automation')) tags.push('automation');
    if (description.includes('approval')) tags.push('approval');
    if (description.includes('document')) tags.push('documentation');
    if (description.includes('review')) tags.push('review');
    if (description.includes('process')) tags.push('process');
    if (description.includes('training')) tags.push('training');
    
    return tags;
  }

  private determineWorkflowCategory(workflow: Partial<WorkflowDefinition>): string {
    const description = (workflow.description || '').toLowerCase();
    
    if (description.includes('training') || description.includes('learning')) {
      return 'Training';
    } else if (description.includes('automation') || description.includes('automated')) {
      return 'Automation';
    } else if (description.includes('approval') || description.includes('review')) {
      return 'Approval Process';
    } else if (description.includes('document') || description.includes('report')) {
      return 'Documentation';
    }
    
    return 'General Process';
  }

  private assessComplexity(workflow: Partial<WorkflowDefinition>): ComplexityLevel {
    const stepCount = workflow.steps?.length || 0;
    const dependencyCount = workflow.dependencies?.length || 0;
    const riskCount = workflow.risks?.length || 0;
    
    const complexityScore = stepCount + (dependencyCount * 2) + (riskCount * 1.5);
    
    if (complexityScore <= 5) return ComplexityLevel.LOW;
    if (complexityScore <= 15) return ComplexityLevel.MEDIUM;
    if (complexityScore <= 25) return ComplexityLevel.HIGH;
    return ComplexityLevel.VERY_HIGH;
  }

  private estimateDuration(workflow: Partial<WorkflowDefinition>): { value: number; unit: TimeUnit } {
    const stepCount = workflow.steps?.length || 1;
    const baseTimePerStep = 15; // minutes
    
    const totalMinutes = stepCount * baseTimePerStep;
    
    if (totalMinutes < 60) {
      return { value: totalMinutes, unit: TimeUnit.MINUTES };
    } else if (totalMinutes < 480) { // 8 hours
      return { value: Math.ceil(totalMinutes / 60), unit: TimeUnit.HOURS };
    } else {
      return { value: Math.ceil(totalMinutes / 480), unit: TimeUnit.DAYS };
    }
  }

  private identifyRequiredSkills(workflow: Partial<WorkflowDefinition>): string[] {
    const skills: string[] = [];
    const description = (workflow.description || '').toLowerCase();
    
    // Basic skill identification
    if (description.includes('technical') || description.includes('system')) {
      skills.push('Technical Skills');
    }
    if (description.includes('communication') || description.includes('coordinate')) {
      skills.push('Communication');
    }
    if (description.includes('analysis') || description.includes('review')) {
      skills.push('Analytical Skills');
    }
    if (description.includes('management') || description.includes('supervise')) {
      skills.push('Management');
    }
    
    return skills.length > 0 ? skills : ['General Skills'];
  }

  async getSessionState(sessionId: SessionId): Promise<ConversationSessionState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Check for session timeout
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
    
    if (timeSinceLastActivity > this.SESSION_TIMEOUT_MS) {
      session.isActive = false;
    }
    
    return {
      isActive: session.isActive,
      currentPhase: session.currentPhase,
      iterationCount: session.iterationCount,
      lastActivity: session.lastActivity,
      workflowCompleteness: session.workflowCompleteness
    };
  }

  async endSession(sessionId: SessionId): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
    }
    this.sessions.delete(sessionId);
  }

  async resumeSession(sessionId: SessionId): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (session) {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      
      // Only resume if within timeout period
      if (timeSinceLastActivity <= this.SESSION_TIMEOUT_MS) {
        session.isActive = true;
        session.lastActivity = new Date();
        return true;
      }
    }
    return false;
  }

  // Additional helper methods for conversation management

  async pauseSession(sessionId: SessionId): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
    }
  }

  async getConversationHistory(sessionId: SessionId): Promise<UserInput[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return [...session.conversationHistory];
  }

  async getSummaryHistory(sessionId: SessionId): Promise<WorkflowSummary[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return [...session.summaryHistory];
  }

  async updateUserChoice(sessionId: SessionId, choice: string, value: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.userChoices[choice] = value;
    session.lastActivity = new Date();
  }

  async getUserChoice(sessionId: SessionId, choice: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session.userChoices[choice];
  }

  // Session Persistence Methods

  private async persistSession(sessionId: SessionId): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const persistenceData: SessionPersistenceData = {
      sessionId,
      userId: session.contextData.userId,
      state: { ...session },
      timestamp: new Date(),
      version: '1.0.0'
    };

    // In a real implementation, this would save to a database or file system
    this.persistedSessions.set(sessionId, persistenceData);
    session.contextData.lastSaveTime = new Date();
  }

  private async loadPersistedSession(sessionId: SessionId): Promise<ExtendedSessionState | null> {
    const persistedData = this.persistedSessions.get(sessionId);
    if (!persistedData) {
      return null;
    }

    // Check if persisted data is not too old
    const now = new Date();
    const timeSincePersistence = now.getTime() - persistedData.timestamp.getTime();
    
    if (timeSincePersistence > this.SESSION_TIMEOUT_MS * 2) {
      // Data is too old, remove it
      this.persistedSessions.delete(sessionId);
      return null;
    }

    return persistedData.state;
  }

  async recoverSession(sessionId: SessionId, userId: string): Promise<boolean> {
    try {
      const persistedSession = await this.loadPersistedSession(sessionId);
      if (!persistedSession || persistedSession.contextData.userId !== userId) {
        return false;
      }

      // Restore session with recovery data
      persistedSession.isActive = true;
      persistedSession.lastActivity = new Date();
      
      // Create recovery instructions
      const lastSummary = persistedSession.summaryHistory.length > 0 
        ? persistedSession.summaryHistory[persistedSession.summaryHistory.length - 1] 
        : undefined;
      
      const recoveryData: SessionRecoveryData = {
        lastKnownState: persistedSession.currentPhase,
        criticalDataPoints: this.extractCriticalDataPoints(persistedSession),
        recoveryInstructions: this.generateRecoveryInstructions(persistedSession),
        ...(lastSummary && { lastValidSummary: lastSummary })
      };

      persistedSession.contextData.recoveryData = recoveryData;
      this.sessions.set(sessionId, persistedSession);

      return true;
    } catch (error) {
      console.error(`Failed to recover session ${sessionId}:`, error);
      return false;
    }
  }

  private extractCriticalDataPoints(session: ExtendedSessionState): string[] {
    const criticalPoints: string[] = [];
    
    if (session.workflowData.title) {
      criticalPoints.push(`Workflow Title: ${session.workflowData.title}`);
    }
    
    if (session.workflowData.steps && session.workflowData.steps.length > 0) {
      criticalPoints.push(`Steps Identified: ${session.workflowData.steps.length}`);
    }
    
    if (session.summaryHistory.length > 0) {
      const lastSummary = session.summaryHistory[session.summaryHistory.length - 1];
      if (lastSummary) {
        criticalPoints.push(`Last Summary: ${lastSummary.description.substring(0, 100)}...`);
      }
    }
    
    criticalPoints.push(`Iteration Count: ${session.iterationCount}`);
    criticalPoints.push(`Completeness: ${session.workflowCompleteness}%`);
    
    return criticalPoints;
  }

  private generateRecoveryInstructions(session: ExtendedSessionState): string[] {
    const instructions: string[] = [];
    
    switch (session.currentPhase) {
      case ConversationPhase.INITIALIZATION:
        instructions.push("Session was in initialization phase. Ready to begin workflow description.");
        break;
      case ConversationPhase.WORKFLOW_DESCRIPTION:
        instructions.push("Session was gathering initial workflow description. Continue with workflow details.");
        break;
      case ConversationPhase.DETAIL_GATHERING:
        instructions.push("Session was gathering detailed information. Continue refining workflow details.");
        break;
      case ConversationPhase.VALIDATION:
        instructions.push("Session was in validation phase. Review and confirm workflow accuracy.");
        break;
      case ConversationPhase.REFINEMENT:
        instructions.push("Session was refining workflow. Continue with adjustments and improvements.");
        break;
      case ConversationPhase.FINALIZATION:
        instructions.push("Session was finalizing workflow. Ready to complete SOP generation.");
        break;
    }
    
    if (session.iterationCount >= this.ITERATION_LIMIT - 1) {
      instructions.push("Approaching iteration limit. Consider moving to validation phase.");
    }
    
    if (session.workflowCompleteness < 50) {
      instructions.push("Workflow needs more details. Focus on gathering missing information.");
    }
    
    return instructions;
  }

  // Context Tracking Methods

  async updateSessionContext(sessionId: SessionId, contextUpdate: Partial<SessionContext>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.contextData = { ...session.contextData, ...contextUpdate };
    session.lastActivity = new Date();
    
    // Update interaction time
    const now = new Date();
    const timeDiff = now.getTime() - session.contextData.sessionStartTime.getTime();
    session.contextData.totalInteractionTime = timeDiff;

    await this.persistSession(sessionId);
  }

  async getSessionContext(sessionId: SessionId): Promise<SessionContext> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return { ...session.contextData };
  }

  async trackUserInteraction(sessionId: SessionId, interactionType: string, data?: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Track interaction in context
    const interaction = {
      type: interactionType,
      timestamp: new Date(),
      data: data || {}
    };

    // Store interaction data (in a real implementation, this might go to analytics)
    session.userChoices[`interaction_${Date.now()}`] = interaction;
    session.lastActivity = new Date();
  }

  // Periodic Operations

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.SESSION_TIMEOUT_MS / 2); // Run cleanup every 15 minutes
  }

  private startPeriodicPersistence(): void {
    this.persistenceInterval = setInterval(() => {
      this.persistAllActiveSessions();
    }, this.PERSISTENCE_INTERVAL_MS);
  }

  private async persistAllActiveSessions(): Promise<void> {
    const activeSessions = Array.from(this.sessions.keys()).filter(sessionId => {
      const session = this.sessions.get(sessionId);
      return session?.isActive;
    });

    for (const sessionId of activeSessions) {
      await this.persistSession(sessionId);
    }
  }

  // Cleanup method for expired sessions
  cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: SessionId[] = [];

    this.sessions.forEach((session, sessionId) => {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      if (timeSinceLastActivity > this.SESSION_TIMEOUT_MS) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      // Persist before cleanup for potential recovery
      this.persistSession(sessionId);
      this.sessions.delete(sessionId);
    });
  }

  // Cleanup resources when service is destroyed
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }
    
    // Persist all active sessions before shutdown
    this.persistAllActiveSessions();
  }

  // Session Recovery and Timeout Handling

  async handleSessionTimeout(sessionId: SessionId): Promise<ConversationResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Create recovery data before timeout
    const lastSummary = session.summaryHistory.length > 0 
      ? session.summaryHistory[session.summaryHistory.length - 1] 
      : undefined;
    
    const recoveryData: SessionRecoveryData = {
      lastKnownState: session.currentPhase,
      criticalDataPoints: this.extractCriticalDataPoints(session),
      recoveryInstructions: this.generateRecoveryInstructions(session),
      ...(lastSummary && { lastValidSummary: lastSummary })
    };

    session.contextData.recoveryData = recoveryData;
    await this.persistSession(sessionId);

    return {
      message: "Your session has been saved due to inactivity. You can resume where you left off by restarting the conversation.",
      requiresConfirmation: false,
      suggestedActions: [
        'Resume session',
        'Start new session',
        'Review saved progress'
      ],
      shouldReadAloud: true,
      metadata: {
        isTimeout: true,
        recoveryAvailable: true,
        sessionId
      }
    };
  }

  async getRecoveryInstructions(sessionId: SessionId): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session?.contextData.recoveryData) {
      return ['No recovery data available'];
    }

    return session.contextData.recoveryData.recoveryInstructions;
  }
}