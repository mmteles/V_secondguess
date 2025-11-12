import {
  FeedbackRequest,
  FeedbackProcessingResult,
  ChangeRequest,
  FeedbackValidationResult,
  ChangeConflict,
  ProcessingRecommendation,
  FeedbackCategory,
  FeedbackProcessingRule,
  FeedbackType,
  FeedbackSource,
  FeedbackPriority,
  FeedbackStatus,
  ChangeType,
  TargetType,
  ProcessingStatus,
  ValidationStatus,
  ImpactScope,
  ImpactSeverity,
  ComplexityLevel,
  ConflictType,
  ResolutionStrategy,
  RecommendationType,
  validateFeedbackRequest,
  validateChangeRequest,
  categorizeFeedback,
  calculateFeedbackPriority,
  estimateChangeComplexity
} from '@/models/feedback-models';
import { SOPDocument, SOPSection } from '@/models/sop-models';
import { ValidationResult, ValidationError, ValidationWarning } from '@/models/validation-models';
import { UserInputType } from '@/models/enums';

/**
 * Service for processing feedback and change requests for SOP documents
 */
export class FeedbackProcessorService {
  private categories: FeedbackCategory[] = [];
  private processingRules: FeedbackProcessingRule[] = [];

  constructor() {
    this.initializeDefaultCategories();
    this.initializeDefaultRules();
  }

  /**
   * Process feedback from voice or text input
   */
  async processFeedback(
    feedback: FeedbackRequest,
    sopDocument: SOPDocument
  ): Promise<FeedbackProcessingResult> {
    // Validate feedback request
    const validationResult = this.validateFeedback(feedback);
    if (!validationResult.isValid) {
      throw new Error(`Invalid feedback: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // Categorize feedback
    const categories = categorizeFeedback(feedback, this.categories);
    
    // Parse feedback content to extract change requests
    const changeRequests = await this.parseChangeRequests(feedback, sopDocument);
    
    // Validate change requests
    const validatedChanges = await this.validateChangeRequests(changeRequests, sopDocument);
    
    // Detect conflicts
    const conflicts = await this.detectConflicts(validatedChanges, sopDocument);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(feedback, validatedChanges, sopDocument);
    
    const result: FeedbackProcessingResult = {
      id: `processing-${feedback.id}-${Date.now()}`,
      feedbackId: feedback.id,
      status: ProcessingStatus.COMPLETED,
      changes: validatedChanges,
      validationResults: [validationResult],
      conflicts,
      recommendations,
      processedAt: new Date(),
      processedBy: 'FeedbackProcessorService'
    };

    return result;
  }

  /**
   * Parse feedback content to extract structured change requests
   */
  private async parseChangeRequests(
    feedback: FeedbackRequest,
    sopDocument: SOPDocument
  ): Promise<ChangeRequest[]> {
    const changes: ChangeRequest[] = [];
    const content = feedback.content;

    // Determine change type based on feedback content
    const changeType = this.determineChangeType(content.comment);
    
    // Identify target section/element
    const target = await this.identifyTarget(content, sopDocument);
    
    // Create change request
    const changeRequest: ChangeRequest = {
      id: `change-${feedback.id}-${Date.now()}`,
      type: changeType,
      target,
      operation: this.mapChangeTypeToOperation(changeType),
      oldValue: content.originalText,
      newValue: content.suggestedText || this.generateSuggestedText(content.comment, changeType),
      reason: content.rationale || content.comment,
      impact: this.assessChangeImpact(changeType, target, sopDocument),
      dependencies: this.identifyDependencies(target, sopDocument),
      validationStatus: ValidationStatus.PENDING
    };

    changes.push(changeRequest);

    // Handle complex feedback that might involve multiple changes
    if (this.isComplexFeedback(feedback)) {
      const additionalChanges = await this.parseComplexFeedback(feedback, sopDocument);
      changes.push(...additionalChanges);
    }

    return changes;
  }

  /**
   * Determine the type of change based on feedback content
   */
  private determineChangeType(comment: string): ChangeType {
    const lowerComment = comment.toLowerCase();

    if (lowerComment.includes('add') || lowerComment.includes('include') || lowerComment.includes('insert')) {
      return ChangeType.ADD;
    }
    
    if (lowerComment.includes('remove') || lowerComment.includes('delete') || lowerComment.includes('eliminate')) {
      return ChangeType.DELETE;
    }
    
    if (lowerComment.includes('move') || lowerComment.includes('relocate') || lowerComment.includes('reorder')) {
      return ChangeType.MOVE;
    }
    
    if (lowerComment.includes('replace') || lowerComment.includes('substitute')) {
      return ChangeType.REPLACE;
    }
    
    if (lowerComment.includes('merge') || lowerComment.includes('combine')) {
      return ChangeType.MERGE;
    }

    // Default to update for modifications
    return ChangeType.UPDATE;
  }

  /**
   * Identify the target element for the change
   */
  private async identifyTarget(content: any, sopDocument: SOPDocument): Promise<any> {
    // If target section is explicitly specified
    if (content.targetSection) {
      const section = sopDocument.sections.find(s => 
        s.id === content.targetSection || s.title.toLowerCase().includes(content.targetSection.toLowerCase())
      );
      
      if (section) {
        return {
          type: TargetType.SECTION,
          id: section.id,
          path: `sections.${section.id}`
        };
      }
    }

    // If target element is specified
    if (content.targetElement) {
      return {
        type: this.determineTargetType(content.targetElement),
        id: content.targetElement,
        path: content.targetElement
      };
    }

    // Try to infer target from comment content
    const inferredTarget = this.inferTargetFromComment(content.comment, sopDocument);
    if (inferredTarget) {
      return inferredTarget;
    }

    // Default to document level
    return {
      type: TargetType.DOCUMENT,
      id: sopDocument.id,
      path: 'document'
    };
  }

  /**
   * Infer target from comment content using keyword analysis
   */
  private inferTargetFromComment(comment: string, sopDocument: SOPDocument): any | null {
    const lowerComment = comment.toLowerCase();

    // Look for section references
    for (const section of sopDocument.sections) {
      const sectionTitle = section.title.toLowerCase();
      if (lowerComment.includes(sectionTitle)) {
        return {
          type: TargetType.SECTION,
          id: section.id,
          path: `sections.${section.id}`
        };
      }
    }

    // Look for step references
    const stepMatch = lowerComment.match(/step\s+(\d+)/);
    if (stepMatch && stepMatch[1]) {
      const stepNumber = parseInt(stepMatch[1]);
      const stepsSection = sopDocument.sections.find(s => s.type === 'steps');
      if (stepsSection) {
        return {
          type: TargetType.STEP,
          id: `step-${stepNumber}`,
          path: `sections.${stepsSection.id}.step-${stepNumber}`
        };
      }
    }

    // Look for general keywords
    if (lowerComment.includes('overview') || lowerComment.includes('introduction')) {
      const overviewSection = sopDocument.sections.find(s => s.type === 'overview');
      if (overviewSection) {
        return {
          type: TargetType.SECTION,
          id: overviewSection.id,
          path: `sections.${overviewSection.id}`
        };
      }
    }

    return null;
  }

  /**
   * Determine target type from element identifier
   */
  private determineTargetType(elementId: string): TargetType {
    if (elementId.startsWith('section-')) return TargetType.SECTION;
    if (elementId.startsWith('step-')) return TargetType.STEP;
    if (elementId.startsWith('checkpoint-')) return TargetType.CHECKPOINT;
    if (elementId.startsWith('chart-')) return TargetType.CHART;
    if (elementId.startsWith('metadata-')) return TargetType.METADATA;
    return TargetType.PARAGRAPH;
  }

  /**
   * Map change type to operation
   */
  private mapChangeTypeToOperation(changeType: ChangeType): any {
    switch (changeType) {
      case ChangeType.ADD: return 'INSERT';
      case ChangeType.UPDATE: return 'MODIFY';
      case ChangeType.DELETE: return 'REMOVE';
      case ChangeType.MOVE: return 'REORDER';
      default: return 'MODIFY';
    }
  }

  /**
   * Generate suggested text based on comment and change type
   */
  private generateSuggestedText(comment: string, changeType: ChangeType): string {
    // Extract actionable text from comment
    const actionableText = this.extractActionableText(comment);
    
    switch (changeType) {
      case ChangeType.ADD:
        return actionableText || 'New content to be added';
      case ChangeType.UPDATE:
        return actionableText || 'Updated content';
      case ChangeType.DELETE:
        return '';
      default:
        return actionableText || comment;
    }
  }

  /**
   * Extract actionable text from feedback comment
   */
  private extractActionableText(comment: string): string {
    // Look for quoted text
    const quotedMatch = comment.match(/"([^"]+)"/);
    if (quotedMatch && quotedMatch[1]) {
      return quotedMatch[1];
    }

    // Look for "should be" or "change to" patterns
    const shouldBeMatch = comment.match(/should be (.+?)(?:\.|$)/i);
    if (shouldBeMatch && shouldBeMatch[1]) {
      return shouldBeMatch[1].trim();
    }

    const changeToMatch = comment.match(/change to (.+?)(?:\.|$)/i);
    if (changeToMatch && changeToMatch[1]) {
      return changeToMatch[1].trim();
    }

    // Look for "add" patterns
    const addMatch = comment.match(/add (.+?)(?:\.|$)/i);
    if (addMatch && addMatch[1]) {
      return addMatch[1].trim();
    }

    return '';
  }

  /**
   * Assess the impact of a change
   */
  private assessChangeImpact(changeType: ChangeType, target: any, sopDocument: SOPDocument): any {
    const scope = this.determineImpactScope(target, sopDocument);
    const severity = this.determineImpactSeverity(changeType, target);
    const affectedSections = this.identifyAffectedSections(target, sopDocument);
    
    return {
      scope,
      severity,
      affectedSections,
      affectedUsers: ['All SOP users'], // Could be more specific based on metadata
      estimatedEffort: this.estimateEffort(changeType, target),
      risks: this.identifyRisks(changeType, target)
    };
  }

  /**
   * Determine impact scope
   */
  private determineImpactScope(target: any, sopDocument: SOPDocument): ImpactScope {
    switch (target.type) {
      case TargetType.DOCUMENT:
        return ImpactScope.DOCUMENT;
      case TargetType.SECTION:
        return ImpactScope.SECTION;
      case TargetType.PARAGRAPH:
      case TargetType.STEP:
        return ImpactScope.MINIMAL;
      default:
        return ImpactScope.MINIMAL;
    }
  }

  /**
   * Determine impact severity
   */
  private determineImpactSeverity(changeType: ChangeType, target: any): ImpactSeverity {
    if (changeType === ChangeType.DELETE && target.type === TargetType.SECTION) {
      return ImpactSeverity.HIGH;
    }
    
    if (changeType === ChangeType.MOVE && target.type === TargetType.SECTION) {
      return ImpactSeverity.MEDIUM;
    }
    
    if (changeType === ChangeType.UPDATE && target.type === TargetType.STEP) {
      return ImpactSeverity.MEDIUM;
    }
    
    return ImpactSeverity.LOW;
  }

  /**
   * Identify affected sections
   */
  private identifyAffectedSections(target: any, sopDocument: SOPDocument): string[] {
    const affected: string[] = [];
    
    if (target.type === TargetType.SECTION) {
      affected.push(target.id);
    } else if (target.type === TargetType.DOCUMENT) {
      affected.push(...sopDocument.sections.map(s => s.id));
    }
    
    return affected;
  }

  /**
   * Estimate effort for change
   */
  private estimateEffort(changeType: ChangeType, target: any): any {
    let hours = 1; // Base effort
    let complexity = ComplexityLevel.SIMPLE;
    
    // Adjust based on change type
    switch (changeType) {
      case ChangeType.ADD:
        hours = 2;
        complexity = ComplexityLevel.MODERATE;
        break;
      case ChangeType.DELETE:
        hours = 1;
        break;
      case ChangeType.MOVE:
        hours = 3;
        complexity = ComplexityLevel.COMPLEX;
        break;
      case ChangeType.MERGE:
        hours = 4;
        complexity = ComplexityLevel.VERY_COMPLEX;
        break;
    }
    
    // Adjust based on target type
    if (target.type === TargetType.DOCUMENT) {
      hours *= 2;
      complexity = ComplexityLevel.COMPLEX;
    }
    
    return {
      hours,
      complexity,
      resources: ['Content Editor', 'Quality Reviewer']
    };
  }

  /**
   * Identify risks associated with change
   */
  private identifyRisks(changeType: ChangeType, target: any): string[] {
    const risks: string[] = [];
    
    if (changeType === ChangeType.DELETE) {
      risks.push('Loss of important information');
      risks.push('Broken references or dependencies');
    }
    
    if (changeType === ChangeType.MOVE) {
      risks.push('Disrupted workflow sequence');
      risks.push('Confusion for existing users');
    }
    
    if (target.type === TargetType.SECTION) {
      risks.push('Impact on document structure');
      risks.push('Need for additional validation');
    }
    
    return risks;
  }

  /**
   * Identify dependencies for a target
   */
  private identifyDependencies(target: any, sopDocument: SOPDocument): string[] {
    const dependencies: string[] = [];
    
    // For sections, check if other sections reference it
    if (target.type === TargetType.SECTION) {
      for (const section of sopDocument.sections) {
        if (section.id !== target.id && section.content.includes(target.id)) {
          dependencies.push(section.id);
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Check if feedback is complex (involves multiple changes)
   */
  private isComplexFeedback(feedback: FeedbackRequest): boolean {
    const comment = feedback.content.comment.toLowerCase();
    
    // Look for multiple action words
    const actionWords = ['add', 'remove', 'change', 'move', 'update', 'delete'];
    const actionCount = actionWords.filter(word => comment.includes(word)).length;
    
    return actionCount > 1 || comment.includes('and') || comment.includes('also');
  }

  /**
   * Parse complex feedback into multiple change requests
   */
  private async parseComplexFeedback(
    feedback: FeedbackRequest,
    sopDocument: SOPDocument
  ): Promise<ChangeRequest[]> {
    const changes: ChangeRequest[] = [];
    const comment = feedback.content.comment;
    
    // Split comment by conjunctions
    const parts = comment.split(/\s+and\s+|\s+also\s+/i);
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]?.trim();
      if (part && part.length > 10) { // Only process substantial parts
        const partialFeedback: FeedbackRequest = {
          ...feedback,
          content: {
            ...feedback.content,
            comment: part
          }
        };
        
        const partialChanges = await this.parseChangeRequests(partialFeedback, sopDocument);
        changes.push(...partialChanges);
      }
    }
    
    return changes;
  }

  /**
   * Validate change requests
   */
  private async validateChangeRequests(
    changes: ChangeRequest[],
    sopDocument: SOPDocument
  ): Promise<ChangeRequest[]> {
    const validatedChanges: ChangeRequest[] = [];
    
    for (const change of changes) {
      if (validateChangeRequest(change)) {
        // Perform additional validation
        const validation = await this.validateChangeAgainstDocument(change, sopDocument);
        change.validationStatus = validation.isValid ? ValidationStatus.VALID : ValidationStatus.INVALID;
        validatedChanges.push(change);
      }
    }
    
    return validatedChanges;
  }

  /**
   * Validate change against document structure and rules
   */
  private async validateChangeAgainstDocument(
    change: ChangeRequest,
    sopDocument: SOPDocument
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    
    // Validate target exists
    if (!this.targetExists(change.target, sopDocument)) {
      errors.push({
        id: 'target-not-found',
        type: 'MISSING_FIELD' as any,
        field: 'target',
        message: `Target ${change.target.id} not found in document`,
        severity: 'HIGH' as any,
        code: 'TARGET_NOT_FOUND'
      });
    }
    
    // Validate change type compatibility
    if (!this.isChangeTypeCompatible(change.type, change.target)) {
      warnings.push({
        id: 'incompatible-change-type',
        field: 'type',
        message: `Change type ${change.type} may not be suitable for target type ${change.target.type}`,
        code: 'INCOMPATIBLE_CHANGE_TYPE'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Check if target exists in document
   */
  private targetExists(target: any, sopDocument: SOPDocument): boolean {
    switch (target.type) {
      case TargetType.DOCUMENT:
        return true;
      case TargetType.SECTION:
        return sopDocument.sections.some(s => s.id === target.id);
      case TargetType.CHART:
        return sopDocument.charts.some(c => c.id === target.id);
      default:
        return true; // Assume other targets exist for now
    }
  }

  /**
   * Check if change type is compatible with target type
   */
  private isChangeTypeCompatible(changeType: ChangeType, target: any): boolean {
    // Some combinations that might not make sense
    if (changeType === ChangeType.MERGE && target.type === TargetType.PARAGRAPH) {
      return false;
    }
    
    if (changeType === ChangeType.MOVE && target.type === TargetType.DOCUMENT) {
      return false;
    }
    
    return true;
  }

  /**
   * Detect conflicts between change requests
   */
  private async detectConflicts(
    changes: ChangeRequest[],
    sopDocument: SOPDocument
  ): Promise<ChangeConflict[]> {
    const conflicts: ChangeConflict[] = [];
    
    // Check for overlapping changes
    for (let i = 0; i < changes.length; i++) {
      for (let j = i + 1; j < changes.length; j++) {
        const change1 = changes[i];
        const change2 = changes[j];
        if (change1 && change2) {
            const conflict = this.checkForConflict(change1, change2);
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Check for conflict between two changes
   */
  private checkForConflict(change1: ChangeRequest, change2: ChangeRequest): ChangeConflict | null {
    // Same target conflicts
    if (change1.target.id === change2.target.id) {
      return {
        id: `conflict-${change1.id}-${change2.id}`,
        type: ConflictType.CONTENT_OVERLAP,
        description: `Both changes target the same element: ${change1.target.id}`,
        conflictingChanges: [change1.id, change2.id],
        resolution: {
          strategy: ResolutionStrategy.MANUAL_REVIEW,
          action: 'Manual review required to resolve overlapping changes',
          rationale: 'Multiple changes to same target need careful coordination',
          requiresApproval: true
        },
        priority: 'HIGH' as any
      };
    }
    
    // Dependency conflicts
    if (change1.dependencies.includes(change2.target.id) || 
        change2.dependencies.includes(change1.target.id)) {
      return {
        id: `conflict-${change1.id}-${change2.id}`,
        type: ConflictType.DEPENDENCY_VIOLATION,
        description: 'Changes have conflicting dependencies',
        conflictingChanges: [change1.id, change2.id],
        resolution: {
          strategy: ResolutionStrategy.DEFER,
          action: 'Apply changes in dependency order',
          rationale: 'Dependencies must be resolved in correct sequence',
          requiresApproval: false
        },
        priority: 'MEDIUM' as any
      };
    }
    
    return null;
  }

  /**
   * Generate processing recommendations
   */
  private async generateRecommendations(
    feedback: FeedbackRequest,
    changes: ChangeRequest[],
    sopDocument: SOPDocument
  ): Promise<ProcessingRecommendation[]> {
    const recommendations: ProcessingRecommendation[] = [];
    
    // Recommend batch processing for multiple small changes
    if (changes.length > 3 && changes.every(c => c.impact.severity === ImpactSeverity.LOW)) {
      recommendations.push({
        id: `rec-batch-${feedback.id}`,
        type: RecommendationType.EFFICIENCY,
        title: 'Batch Process Changes',
        description: 'Multiple small changes can be processed together for efficiency',
        action: 'Group changes and apply in single operation',
        confidence: 0.8,
        benefits: ['Reduced processing time', 'Consistent application'],
        risks: ['Harder to rollback individual changes']
      });
    }
    
    // Recommend quality review for high-impact changes
    if (changes.some(c => c.impact.severity === ImpactSeverity.HIGH)) {
      recommendations.push({
        id: `rec-review-${feedback.id}`,
        type: RecommendationType.QUALITY,
        title: 'Quality Review Required',
        description: 'High-impact changes should undergo additional review',
        action: 'Schedule quality review before implementation',
        confidence: 0.9,
        benefits: ['Reduced risk of errors', 'Better change quality'],
        risks: ['Increased processing time']
      });
    }
    
    // Recommend compliance check for certain types
    if (feedback.type === FeedbackType.COMPLIANCE_UPDATE) {
      recommendations.push({
        id: `rec-compliance-${feedback.id}`,
        type: RecommendationType.COMPLIANCE,
        title: 'Compliance Validation',
        description: 'Compliance-related changes need validation against standards',
        action: 'Run compliance validation checks',
        confidence: 0.95,
        benefits: ['Ensures regulatory compliance', 'Reduces audit risk'],
        risks: ['May require additional changes']
      });
    }
    
    return recommendations;
  }

  /**
   * Validate feedback request
   */
  private validateFeedback(feedback: FeedbackRequest): FeedbackValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];
    const suggestions: string[] = [];
    
    if (!validateFeedbackRequest(feedback)) {
      errors.push({
        id: 'invalid-feedback',
        type: 'MISSING_FIELD' as any,
        field: 'feedback',
        message: 'Feedback request is invalid or incomplete',
        severity: 'HIGH' as any,
        code: 'INVALID_FEEDBACK_REQUEST'
      });
    }
    
    // Check for voice transcription confidence
    if (feedback.source === FeedbackSource.VOICE_INPUT && 
        feedback.metadata.voiceTranscription?.transcriptionConfidence && 
        feedback.metadata.voiceTranscription.transcriptionConfidence < 0.8) {
      warnings.push({
        id: 'low-confidence-transcription',
        field: 'transcription',
        message: 'Voice transcription confidence is low, manual review recommended',
        code: 'LOW_TRANSCRIPTION_CONFIDENCE'
      });
    }
    
    // Check for unclear feedback
    if (feedback.content.comment.length < 10) {
      warnings.push({
        id: 'unclear-feedback',
        field: 'comment',
        message: 'Feedback comment is very short and may be unclear',
        code: 'UNCLEAR_FEEDBACK'
      });
    }
    
    return {
      feedbackId: feedback.id,
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      confidence: this.calculateValidationConfidence(feedback, errors, warnings)
    };
  }

  /**
   * Calculate validation confidence score
   */
  private calculateValidationConfidence(
    feedback: FeedbackRequest,
    errors: any[],
    warnings: any[]
  ): number {
    let confidence = 1.0;
    
    // Reduce confidence for errors and warnings
    confidence -= errors.length * 0.3;
    confidence -= warnings.length * 0.1;
    
    // Adjust for voice transcription confidence
    if (feedback.source === FeedbackSource.VOICE_INPUT && feedback.metadata.voiceTranscription) {
      confidence *= feedback.metadata.voiceTranscription.transcriptionConfidence;
    }
    
    // Adjust for comment clarity
    if (feedback.content.comment.length < 20) {
      confidence *= 0.8;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Initialize default feedback categories
   */
  private initializeDefaultCategories(): void {
    this.categories = [
      {
        id: 'content-correction',
        name: 'Content Correction',
        description: 'Corrections to existing content',
        keywords: ['wrong', 'incorrect', 'error', 'mistake', 'fix', 'correct'],
        patterns: [/should be/i, /change.*to/i],
        priority: FeedbackPriority.HIGH,
        autoProcessing: true
      },
      {
        id: 'content-addition',
        name: 'Content Addition',
        description: 'Requests to add new content',
        keywords: ['add', 'include', 'insert', 'missing', 'need'],
        patterns: [/add.*to/i, /should include/i],
        priority: FeedbackPriority.MEDIUM,
        autoProcessing: true
      },
      {
        id: 'structure-change',
        name: 'Structure Change',
        description: 'Changes to document structure',
        keywords: ['move', 'reorder', 'reorganize', 'structure'],
        patterns: [/move.*to/i, /should come/i],
        priority: FeedbackPriority.MEDIUM,
        autoProcessing: false
      },
      {
        id: 'clarity-improvement',
        name: 'Clarity Improvement',
        description: 'Improvements for better clarity',
        keywords: ['unclear', 'confusing', 'clarify', 'explain'],
        patterns: [/not clear/i, /hard to understand/i],
        priority: FeedbackPriority.LOW,
        autoProcessing: false
      }
    ];
  }

  /**
   * Initialize default processing rules
   */
  private initializeDefaultRules(): void {
    this.processingRules = [
      {
        id: 'auto-apply-simple-corrections',
        name: 'Auto-apply Simple Corrections',
        description: 'Automatically apply simple text corrections',
        condition: 'feedback.type === "CONTENT_CORRECTION" && change.impact.severity === "LOW"',
        action: {
          type: 'AUTO_APPLY' as any,
          parameters: { requiresValidation: true },
          validation: [{ type: 'CONTENT_VALIDATION' as any, parameters: {}, required: true }],
          approval: []
        },
        priority: 1,
        enabled: true
      },
      {
        id: 'require-approval-structural-changes',
        name: 'Require Approval for Structural Changes',
        description: 'Structural changes need approval',
        condition: 'change.target.type === "SECTION" || change.type === "MOVE"',
        action: {
          type: 'REQUIRE_APPROVAL' as any,
          parameters: { approvalLevel: 'manager' },
          validation: [{ type: 'STRUCTURE_VALIDATION' as any, parameters: {}, required: true }],
          approval: [{ role: 'manager', timeout: 24 * 60 * 60 * 1000 }]
        },
        priority: 2,
        enabled: true
      }
    ];
  }
}