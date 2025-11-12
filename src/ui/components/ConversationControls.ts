import { ConversationState } from '../../models/enums';
import { ConversationSession } from '../../models/conversation-models';

export interface ConversationControlsConfig {
  onStartSession?: () => void;
  onPauseSession?: () => void;
  onResumeSession?: () => void;
  onEndSession?: () => void;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  onRequestSummary?: () => void;
  onContinueToSOP?: () => void;
}

export class ConversationControls {
  private container: HTMLElement;
  private config: ConversationControlsConfig;
  private currentSession: ConversationSession | null = null;
  private navigationHistory: string[] = [];
  private currentHistoryIndex: number = -1;

  constructor(containerId: string, config: ConversationControlsConfig = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id '${containerId}' not found`);
    }
    
    this.container = container;
    this.config = config;
    this.createInterface();
    this.setupEventListeners();
  }

  private createInterface(): void {
    this.container.innerHTML = `
      <div class="conversation-controls">
        <div class="session-controls">
          <div class="session-actions">
            <button id="startSessionBtn" class="control-btn primary">
              <span class="btn-icon">▶️</span>
              <span>Start Session</span>
            </button>
            <button id="pauseSessionBtn" class="control-btn secondary" disabled>
              <span class="btn-icon">⏸️</span>
              <span>Pause</span>
            </button>
            <button id="resumeSessionBtn" class="control-btn secondary" disabled style="display: none;">
              <span class="btn-icon">▶️</span>
              <span>Resume</span>
            </button>
            <button id="endSessionBtn" class="control-btn danger" disabled>
              <span class="btn-icon">⏹️</span>
              <span>End Session</span>
            </button>
          </div>
          
          <div class="session-status-display">
            <div id="sessionStateIndicator" class="state-indicator">
              <span class="state-dot"></span>
              <span id="stateText">Ready to Start</span>
            </div>
            <div id="iterationProgress" class="iteration-progress">
              <span>Iterations: </span>
              <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
              </div>
              <span id="iterationText">0/5</span>
            </div>
          </div>
        </div>

        <div class="navigation-controls">
          <div class="nav-actions">
            <button id="backBtn" class="nav-btn" disabled>
              <span class="nav-icon">←</span>
              <span>Back</span>
            </button>
            <button id="forwardBtn" class="nav-btn" disabled>
              <span class="nav-icon">→</span>
              <span>Forward</span>
            </button>
          </div>
          
          <div class="conversation-actions">
            <button id="summaryBtn" class="action-btn secondary" disabled>
              <span class="btn-icon">📋</span>
              <span>Request Summary</span>
            </button>
            <button id="continueBtn" class="action-btn primary" disabled>
              <span class="btn-icon">📄</span>
              <span>Continue to SOP</span>
            </button>
          </div>
        </div>

        <div class="workflow-progress">
          <div class="progress-header">
            <h4>Workflow Progress</h4>
            <span id="completenessScore" class="completeness-score">0%</span>
          </div>
          <div class="progress-items">
            <div class="progress-item">
              <span class="item-label">Description</span>
              <div class="item-status" id="descriptionStatus">
                <span class="status-dot pending"></span>
                <span>Pending</span>
              </div>
            </div>
            <div class="progress-item">
              <span class="item-label">Steps Identified</span>
              <div class="item-status" id="stepsStatus">
                <span class="status-dot pending"></span>
                <span>Pending</span>
              </div>
            </div>
            <div class="progress-item">
              <span class="item-label">Inputs/Outputs</span>
              <div class="item-status" id="ioStatus">
                <span class="status-dot pending"></span>
                <span>Pending</span>
              </div>
            </div>
            <div class="progress-item">
              <span class="item-label">Validation</span>
              <div class="item-status" id="validationStatus">
                <span class="status-dot pending"></span>
                <span>Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .conversation-controls {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 20px;
        background: white;
        border-radius: 15px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .session-controls {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .session-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .control-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        min-width: 120px;
        justify-content: center;
      }

      .control-btn.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .control-btn.primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .control-btn.secondary {
        background: #e9ecef;
        color: #495057;
      }

      .control-btn.secondary:hover:not(:disabled) {
        background: #dee2e6;
      }

      .control-btn.danger {
        background: #dc3545;
        color: white;
      }

      .control-btn.danger:hover:not(:disabled) {
        background: #c82333;
        transform: translateY(-1px);
      }

      .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }

      .btn-icon {
        font-size: 16px;
      }

      .session-status-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 10px;
        border-left: 4px solid #667eea;
      }

      .state-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }

      .state-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #6c757d;
        transition: all 0.3s ease;
      }

      .state-dot.active {
        background: #28a745;
        box-shadow: 0 0 8px rgba(40, 167, 69, 0.5);
      }

      .state-dot.paused {
        background: #ffc107;
        box-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
      }

      .iteration-progress {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
      }

      .progress-bar {
        width: 80px;
        height: 6px;
        background: #e9ecef;
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        transition: width 0.3s ease;
      }

      .navigation-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 10px;
      }

      .nav-actions {
        display: flex;
        gap: 10px;
      }

      .nav-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 12px;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s ease;
      }

      .nav-btn:hover:not(:disabled) {
        background: #e9ecef;
        border-color: #adb5bd;
      }

      .nav-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .nav-icon {
        font-size: 14px;
      }

      .conversation-actions {
        display: flex;
        gap: 10px;
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .action-btn.primary {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
      }

      .action-btn.primary:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
      }

      .action-btn.secondary {
        background: #6c757d;
        color: white;
      }

      .action-btn.secondary:hover:not(:disabled) {
        background: #5a6268;
      }

      .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
      }

      .workflow-progress {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 20px;
      }

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .progress-header h4 {
        margin: 0;
        color: #495057;
        font-size: 16px;
      }

      .completeness-score {
        font-size: 18px;
        font-weight: bold;
        color: #667eea;
      }

      .progress-items {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .progress-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        background: white;
        border-radius: 8px;
        border-left: 3px solid #e9ecef;
      }

      .progress-item.completed {
        border-left-color: #28a745;
      }

      .progress-item.in-progress {
        border-left-color: #ffc107;
      }

      .item-label {
        font-weight: 500;
        color: #495057;
      }

      .item-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        transition: all 0.3s ease;
      }

      .status-dot.pending {
        background: #6c757d;
      }

      .status-dot.in-progress {
        background: #ffc107;
        animation: pulse 1.5s infinite;
      }

      .status-dot.completed {
        background: #28a745;
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      @media (max-width: 768px) {
        .session-actions {
          flex-direction: column;
        }

        .control-btn {
          min-width: auto;
          width: 100%;
        }

        .navigation-controls {
          flex-direction: column;
          gap: 15px;
        }

        .session-status-display {
          flex-direction: column;
          gap: 10px;
          align-items: flex-start;
        }
      }
    `;

    document.head.appendChild(style);
  }

  private setupEventListeners(): void {
    // Session control buttons
    const startBtn = this.container.querySelector('#startSessionBtn') as HTMLButtonElement;
    const pauseBtn = this.container.querySelector('#pauseSessionBtn') as HTMLButtonElement;
    const resumeBtn = this.container.querySelector('#resumeSessionBtn') as HTMLButtonElement;
    const endBtn = this.container.querySelector('#endSessionBtn') as HTMLButtonElement;

    startBtn.addEventListener('click', this.handleStartSession.bind(this));
    pauseBtn.addEventListener('click', this.handlePauseSession.bind(this));
    resumeBtn.addEventListener('click', this.handleResumeSession.bind(this));
    endBtn.addEventListener('click', this.handleEndSession.bind(this));

    // Navigation buttons
    const backBtn = this.container.querySelector('#backBtn') as HTMLButtonElement;
    const forwardBtn = this.container.querySelector('#forwardBtn') as HTMLButtonElement;

    backBtn.addEventListener('click', this.handleNavigateBack.bind(this));
    forwardBtn.addEventListener('click', this.handleNavigateForward.bind(this));

    // Action buttons
    const summaryBtn = this.container.querySelector('#summaryBtn') as HTMLButtonElement;
    const continueBtn = this.container.querySelector('#continueBtn') as HTMLButtonElement;

    summaryBtn.addEventListener('click', this.handleRequestSummary.bind(this));
    continueBtn.addEventListener('click', this.handleContinueToSOP.bind(this));
  }

  private handleStartSession(): void {
    if (this.config.onStartSession) {
      this.config.onStartSession();
    }
  }

  private handlePauseSession(): void {
    if (this.config.onPauseSession) {
      this.config.onPauseSession();
    }
  }

  private handleResumeSession(): void {
    if (this.config.onResumeSession) {
      this.config.onResumeSession();
    }
  }

  private handleEndSession(): void {
    if (this.config.onEndSession) {
      this.config.onEndSession();
    }
  }

  private handleNavigateBack(): void {
    if (this.config.onNavigateBack) {
      this.config.onNavigateBack();
    }
  }

  private handleNavigateForward(): void {
    if (this.config.onNavigateForward) {
      this.config.onNavigateForward();
    }
  }

  private handleRequestSummary(): void {
    if (this.config.onRequestSummary) {
      this.config.onRequestSummary();
    }
  }

  private handleContinueToSOP(): void {
    if (this.config.onContinueToSOP) {
      this.config.onContinueToSOP();
    }
  }

  // Public methods
  public updateSession(session: ConversationSession): void {
    this.currentSession = session;
    this.updateSessionDisplay();
    this.updateButtonStates();
    this.updateWorkflowProgress();
  }

  private updateSessionDisplay(): void {
    if (!this.currentSession) return;

    const stateText = this.container.querySelector('#stateText') as HTMLElement;
    const stateDot = this.container.querySelector('.state-dot') as HTMLElement;
    const iterationText = this.container.querySelector('#iterationText') as HTMLElement;
    const progressFill = this.container.querySelector('.progress-fill') as HTMLElement;

    // Update state display
    const stateMap = {
      [ConversationState.INITIAL_DESCRIPTION]: 'Gathering Description',
      [ConversationState.GATHERING_DETAILS]: 'Gathering Details',
      [ConversationState.VALIDATION]: 'Validating Information',
      [ConversationState.REFINEMENT]: 'Refining Workflow',
      [ConversationState.FINALIZATION]: 'Finalizing'
    };

    stateText.textContent = stateMap[this.currentSession.currentState] || 'Unknown State';
    
    // Update state dot
    stateDot.className = 'state-dot';
    if (this.currentSession.isActive) {
      stateDot.classList.add('active');
    } else {
      stateDot.classList.add('paused');
    }

    // Update iteration progress
    iterationText.textContent = `${this.currentSession.iterationCount}/5`;
    const progressPercent = (this.currentSession.iterationCount / 5) * 100;
    progressFill.style.width = `${progressPercent}%`;
  }

  private updateButtonStates(): void {
    if (!this.currentSession) return;

    const startBtn = this.container.querySelector('#startSessionBtn') as HTMLButtonElement;
    const pauseBtn = this.container.querySelector('#pauseSessionBtn') as HTMLButtonElement;
    const resumeBtn = this.container.querySelector('#resumeSessionBtn') as HTMLButtonElement;
    const endBtn = this.container.querySelector('#endSessionBtn') as HTMLButtonElement;
    const summaryBtn = this.container.querySelector('#summaryBtn') as HTMLButtonElement;
    const continueBtn = this.container.querySelector('#continueBtn') as HTMLButtonElement;

    const isActive = this.currentSession.isActive;
    const hasStarted = this.currentSession.iterationCount > 0;

    startBtn.disabled = hasStarted;
    pauseBtn.disabled = !isActive;
    resumeBtn.disabled = isActive;
    endBtn.disabled = !hasStarted;

    // Show/hide resume button
    if (isActive) {
      pauseBtn.style.display = 'flex';
      resumeBtn.style.display = 'none';
    } else if (hasStarted) {
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'flex';
    }

    // Enable summary and continue buttons based on progress
    summaryBtn.disabled = !hasStarted || this.currentSession.iterationCount < 2;
    continueBtn.disabled = this.currentSession.workflowSummary.completenessScore < 70;
  }

  private updateWorkflowProgress(): void {
    if (!this.currentSession) return;

    const completenessScore = this.container.querySelector('#completenessScore') as HTMLElement;
    completenessScore.textContent = `${this.currentSession.workflowSummary.completenessScore}%`;

    // Update individual progress items
    const summary = this.currentSession.workflowSummary;
    
    this.updateProgressItem('descriptionStatus', summary.description.length > 0);
    this.updateProgressItem('stepsStatus', summary.keySteps.length > 0);
    this.updateProgressItem('ioStatus', summary.identifiedInputs.length > 0 && summary.identifiedOutputs.length > 0);
    this.updateProgressItem('validationStatus', summary.completenessScore >= 70);
  }

  private updateProgressItem(itemId: string, isCompleted: boolean): void {
    const item = this.container.querySelector(`#${itemId}`) as HTMLElement;
    const parentItem = item.closest('.progress-item') as HTMLElement;
    const statusDot = item.querySelector('.status-dot') as HTMLElement;
    const statusText = item.querySelector('span:last-child') as HTMLElement;

    if (isCompleted) {
      parentItem.classList.add('completed');
      statusDot.className = 'status-dot completed';
      statusText.textContent = 'Completed';
    } else {
      parentItem.classList.remove('completed');
      statusDot.className = 'status-dot pending';
      statusText.textContent = 'Pending';
    }
  }

  public addToNavigationHistory(item: string): void {
    // Remove any items after current index (when navigating back then adding new item)
    this.navigationHistory = this.navigationHistory.slice(0, this.currentHistoryIndex + 1);
    
    this.navigationHistory.push(item);
    this.currentHistoryIndex = this.navigationHistory.length - 1;
    
    this.updateNavigationButtons();
  }

  private updateNavigationButtons(): void {
    const backBtn = this.container.querySelector('#backBtn') as HTMLButtonElement;
    const forwardBtn = this.container.querySelector('#forwardBtn') as HTMLButtonElement;

    backBtn.disabled = this.currentHistoryIndex <= 0;
    forwardBtn.disabled = this.currentHistoryIndex >= this.navigationHistory.length - 1;
  }

  public setWorkflowProgress(completenessScore: number, progressItems: {
    description: boolean;
    steps: boolean;
    inputsOutputs: boolean;
    validation: boolean;
  }): void {
    const completenessElement = this.container.querySelector('#completenessScore') as HTMLElement;
    completenessElement.textContent = `${completenessScore}%`;

    this.updateProgressItem('descriptionStatus', progressItems.description);
    this.updateProgressItem('stepsStatus', progressItems.steps);
    this.updateProgressItem('ioStatus', progressItems.inputsOutputs);
    this.updateProgressItem('validationStatus', progressItems.validation);
  }

  public reset(): void {
    this.currentSession = null;
    this.navigationHistory = [];
    this.currentHistoryIndex = -1;
    
    // Reset all buttons to initial state
    const startBtn = this.container.querySelector('#startSessionBtn') as HTMLButtonElement;
    const pauseBtn = this.container.querySelector('#pauseSessionBtn') as HTMLButtonElement;
    const resumeBtn = this.container.querySelector('#resumeSessionBtn') as HTMLButtonElement;
    const endBtn = this.container.querySelector('#endSessionBtn') as HTMLButtonElement;

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    endBtn.disabled = true;

    pauseBtn.style.display = 'flex';
    resumeBtn.style.display = 'none';

    // Reset state display
    const stateText = this.container.querySelector('#stateText') as HTMLElement;
    const stateDot = this.container.querySelector('.state-dot') as HTMLElement;
    
    stateText.textContent = 'Ready to Start';
    stateDot.className = 'state-dot';

    // Reset progress
    this.setWorkflowProgress(0, {
      description: false,
      steps: false,
      inputsOutputs: false,
      validation: false
    });
  }
}