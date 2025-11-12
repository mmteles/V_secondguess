import { UserInputType, ValidationErrorType } from './enums';
import { ErrorSeverity } from './validation-models';
import { SOPDocument, SOPSection } from './sop-models';

/**
 * Type definitions for SOP feedback and revision system
 */

export interface FeedbackRequest {
  id: string;
  sopId: string;
  userId: string;
  type: FeedbackType;
  source: FeedbackSource;
  content: FeedbackContent;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata: FeedbackMetadata;
}

export interface FeedbackContent {
  originalText?: string;
  suggestedText?: string;
  comment: string;
  targetSection?: string;
  targetElement?: string;
  changeType: ChangeType;
  rationale?: string;
  attachments?: FeedbackAttachment[];
}

export interface FeedbackAttachment {
  id: string;
  name: string;
  type: AttachmentType;
  url: string;
  size: number;
  uploadedAt: Date;
}

export interface FeedbackMetadata {
  voiceTranscription?: VoiceTranscriptionData;
  confidence?: number;
  language?: string;
  context?: Record<string, any>;
  tags?: string[];
}

export interface VoiceTranscriptionData {
  originalAudio?: string;
  transcriptionConfidence: number;
  alternativeTranscriptions?: string[];
  speakerInfo?: SpeakerInfo;
}

export interface SpeakerInfo {
  speakerId?: string;
  accent?: string;
  language?: string;
  confidence: number;
}

export interface FeedbackProcessingResult {
  id: string;
  feedbackId: string;
  status: ProcessingStatus;
  changes: ChangeRequest[];
  validationResults: FeedbackValidationResult[];
  conflicts: ChangeConflict[];
  recommendations: ProcessingRecommendation[];
  processedAt: Date;
  processedBy: string;
}

export interface ChangeRequest {
  id: string;
  type: ChangeType;
  target: ChangeTarget;
  operation: ChangeOperation;
  oldValue?: any;
  newValue?: any;
  reason: string;
  impact: ChangeImpact;
  dependencies: string[];
  validationStatus: ValidationStatus;
}

export interface ChangeTarget {
  type: TargetType;
  id: string;
  path?: string;
  selector?: string;
}

export interface ChangeImpact {
  scope: ImpactScope;
  severity: ImpactSeverity;
  affectedSections: string[];
  affectedUsers: string[];
  estimatedEffort: EffortEstimate;
  risks: string[];
}

export interface EffortEstimate {
  hours: number;
  complexity: ComplexityLevel;
  resources: string[];
}

export interface ChangeConflict {
  id: string;
  type: ConflictType;
  description: string;
  conflictingChanges: string[];
  resolution: ConflictResolution;
  priority: ConflictPriority;
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  action: string;
  rationale: string;
  requiresApproval: boolean;
}

export interface ProcessingRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  action: string;
  confidence: number;
  benefits: string[];
  risks: string[];
}

export interface FeedbackValidationResult {
  feedbackId: string;
  isValid: boolean;
  errors: FeedbackValidationError[];
  warnings: FeedbackValidationWarning[];
  suggestions: string[];
  confidence: number;
}

export interface FeedbackValidationError {
  id: string;
  type: ValidationErrorType;
  field: string;
  message: string;
  severity: ErrorSeverity;
  code: string;
}

export interface FeedbackValidationWarning {
  id: string;
  field: string;
  message: string;
  code: string;
}

export interface FeedbackCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  patterns: RegExp[];
  priority: FeedbackPriority;
  autoProcessing: boolean;
}

export interface FeedbackProcessingRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: ProcessingAction;
  priority: number;
  enabled: boolean;
}

export interface ProcessingAction {
  type: ActionType;
  parameters: Record<string, any>;
  validation: ValidationRequirement[];
  approval: ApprovalRequirement[];
}

export interface ValidationRequirement {
  type: ValidationType;
  parameters: Record<string, any>;
  required: boolean;
}

export interface ApprovalRequirement {
  role: string;
  condition?: string;
  timeout?: number;
  escalation?: string;
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  byType: Record<FeedbackType, number>;
  byPriority: Record<FeedbackPriority, number>;
  byStatus: Record<FeedbackStatus, number>;
  averageProcessingTime: number;
  satisfactionScore: number;
  commonIssues: FeedbackIssue[];
  trends: FeedbackTrend[];
}

export interface FeedbackIssue {
  category: string;
  count: number;
  percentage: number;
  examples: string[];
}

export interface FeedbackTrend {
  period: string;
  metric: string;
  value: number;
  change: number;
  direction: TrendDirection;
}

// Enumerations

export enum FeedbackType {
  CONTENT_CORRECTION = 'content_correction',
  STRUCTURE_CHANGE = 'structure_change',
  ADDITION = 'addition',
  DELETION = 'deletion',
  CLARIFICATION = 'clarification',
  QUALITY_IMPROVEMENT = 'quality_improvement',
  COMPLIANCE_UPDATE = 'compliance_update',
  FORMATTING = 'formatting'
}

export enum FeedbackSource {
  VOICE_INPUT = 'voice_input',
  TEXT_INPUT = 'text_input',
  FORM_SUBMISSION = 'form_submission',
  API_REQUEST = 'api_request',
  AUTOMATED_ANALYSIS = 'automated_analysis'
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  URGENT = 'urgent'
}

export enum FeedbackStatus {
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  VALIDATED = 'validated',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
  COMPLETED = 'completed'
}

export enum ChangeType {
  ADD = 'add',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',
  REPLACE = 'replace',
  MERGE = 'merge'
}

export enum TargetType {
  DOCUMENT = 'document',
  SECTION = 'section',
  PARAGRAPH = 'paragraph',
  STEP = 'step',
  CHECKPOINT = 'checkpoint',
  CHART = 'chart',
  METADATA = 'metadata'
}

export enum ChangeOperation {
  INSERT = 'insert',
  MODIFY = 'modify',
  REMOVE = 'remove',
  REORDER = 'reorder'
}

export enum ProcessingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum ValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  WARNING = 'warning',
  PENDING = 'pending'
}

export enum ImpactScope {
  MINIMAL = 'minimal',
  SECTION = 'section',
  DOCUMENT = 'document',
  SYSTEM = 'system'
}

export enum ImpactSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex'
}

export enum ConflictType {
  CONTENT_OVERLAP = 'content_overlap',
  STRUCTURAL_CONFLICT = 'structural_conflict',
  DEPENDENCY_VIOLATION = 'dependency_violation',
  BUSINESS_RULE_CONFLICT = 'business_rule_conflict'
}

export enum ConflictPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  BLOCKING = 'blocking'
}

export enum ResolutionStrategy {
  MERGE = 'merge',
  OVERRIDE = 'override',
  MANUAL_REVIEW = 'manual_review',
  REJECT = 'reject',
  DEFER = 'defer'
}

export enum RecommendationType {
  IMPROVEMENT = 'improvement',
  OPTIMIZATION = 'optimization',
  COMPLIANCE = 'compliance',
  QUALITY = 'quality',
  EFFICIENCY = 'efficiency'
}

export enum AttachmentType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
  REFERENCE = 'reference'
}

export enum ActionType {
  AUTO_APPLY = 'auto_apply',
  REQUIRE_APPROVAL = 'require_approval',
  NOTIFY_STAKEHOLDERS = 'notify_stakeholders',
  VALIDATE_COMPLIANCE = 'validate_compliance',
  UPDATE_DEPENDENCIES = 'update_dependencies'
}

export enum ValidationType {
  CONTENT_VALIDATION = 'content_validation',
  STRUCTURE_VALIDATION = 'structure_validation',
  COMPLIANCE_CHECK = 'compliance_check',
  QUALITY_ASSESSMENT = 'quality_assessment'
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

/**
 * Validation functions for feedback data integrity
 */

export function validateFeedbackRequest(feedback: FeedbackRequest): boolean {
  if (!feedback.id || !feedback.sopId || !feedback.userId) {
    return false;
  }
  
  if (!Object.values(FeedbackType).includes(feedback.type)) {
    return false;
  }
  
  if (!Object.values(FeedbackSource).includes(feedback.source)) {
    return false;
  }
  
  if (!feedback.content || !feedback.content.comment) {
    return false;
  }
  
  return true;
}

export function validateChangeRequest(change: ChangeRequest): boolean {
  if (!change.id || !change.type || !change.target) {
    return false;
  }
  
  if (!Object.values(ChangeType).includes(change.type)) {
    return false;
  }
  
  if (!Object.values(TargetType).includes(change.target.type)) {
    return false;
  }
  
  return true;
}

export function validateFeedbackContent(content: FeedbackContent): boolean {
  if (!content.comment || content.comment.trim() === '') {
    return false;
  }
  
  if (!Object.values(ChangeType).includes(content.changeType)) {
    return false;
  }
  
  return true;
}

/**
 * Utility functions for feedback processing
 */

export function categorizeFeedback(feedback: FeedbackRequest, categories: FeedbackCategory[]): FeedbackCategory[] {
  const matchedCategories: FeedbackCategory[] = [];
  
  for (const category of categories) {
    const content = feedback.content.comment.toLowerCase();
    
    // Check keywords
    const hasKeyword = category.keywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    // Check patterns
    const hasPattern = category.patterns.some(pattern => 
      pattern.test(content)
    );
    
    if (hasKeyword || hasPattern) {
      matchedCategories.push(category);
    }
  }
  
  return matchedCategories;
}

export function calculateFeedbackPriority(feedback: FeedbackRequest): FeedbackPriority {
  const content = feedback.content.comment.toLowerCase();
  
  // Critical keywords
  const criticalKeywords = ['critical', 'urgent', 'emergency', 'safety', 'compliance'];
  if (criticalKeywords.some(keyword => content.includes(keyword))) {
    return FeedbackPriority.CRITICAL;
  }
  
  // High priority keywords
  const highKeywords = ['important', 'error', 'incorrect', 'wrong', 'fix'];
  if (highKeywords.some(keyword => content.includes(keyword))) {
    return FeedbackPriority.HIGH;
  }
  
  // Medium priority keywords
  const mediumKeywords = ['improve', 'update', 'change', 'modify'];
  if (mediumKeywords.some(keyword => content.includes(keyword))) {
    return FeedbackPriority.MEDIUM;
  }
  
  return FeedbackPriority.LOW;
}

export function estimateChangeComplexity(change: ChangeRequest): ComplexityLevel {
  let complexity = 0;
  
  // Factor in change type
  switch (change.type) {
    case ChangeType.ADD:
    case ChangeType.UPDATE:
      complexity += 1;
      break;
    case ChangeType.DELETE:
      complexity += 2;
      break;
    case ChangeType.MOVE:
    case ChangeType.REPLACE:
      complexity += 3;
      break;
    case ChangeType.MERGE:
      complexity += 4;
      break;
  }
  
  // Factor in target type
  switch (change.target.type) {
    case TargetType.PARAGRAPH:
    case TargetType.STEP:
      complexity += 1;
      break;
    case TargetType.SECTION:
      complexity += 2;
      break;
    case TargetType.DOCUMENT:
      complexity += 3;
      break;
  }
  
  // Factor in dependencies
  complexity += Math.min(change.dependencies.length, 3);
  
  if (complexity <= 2) return ComplexityLevel.SIMPLE;
  if (complexity <= 4) return ComplexityLevel.MODERATE;
  if (complexity <= 6) return ComplexityLevel.COMPLEX;
  return ComplexityLevel.VERY_COMPLEX;
}