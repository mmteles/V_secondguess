import { 
  WorkflowDefinition, 
  SOPDocument, 
  SOPType, 
  ValidationResult, 
  SOPChanges,
  CheckpointMethod,
  CheckpointFrequency
} from '@/models';

/**
 * SOP Generator for creating structured Standard Operating Procedures
 */
export interface SOPGenerator {
  /**
   * Generate SOP document from workflow definition
   * @param workflow - Validated workflow definition
   * @param type - Type of SOP to generate
   */
  generateSOP(workflow: WorkflowDefinition, type: SOPType): Promise<SOPDocument>;

  /**
   * Validate SOP completeness and quality
   * @param sop - SOP document to validate
   */
  validateSOPCompleteness(sop: SOPDocument): ValidationResult;

  /**
   * Update existing SOP with changes
   * @param sop - Existing SOP document
   * @param changes - Changes to apply
   */
  updateSOP(sop: SOPDocument, changes: SOPChanges): Promise<SOPDocument>;

  /**
   * Get available SOP templates
   */
  getAvailableTemplates(): SOPTemplate[];

  /**
   * Select appropriate template for workflow
   * @param workflow - Workflow definition
   */
  selectTemplate(workflow: WorkflowDefinition): SOPTemplate;

  /**
   * Generate risk assessment for workflow
   * @param workflow - Workflow definition
   */
  generateRiskAssessment(workflow: WorkflowDefinition): Promise<RiskAssessment[]>;

  /**
   * Generate quality checkpoints for SOP
   * @param sop - SOP document
   */
  generateQualityCheckpoints(sop: SOPDocument): Promise<QualityCheckpoint[]>;
}

export interface SOPTemplate {
  id: string;
  name: string;
  type: SOPType;
  sections: TemplateSectionDefinition[];
  applicableWorkflowTypes: string[];
}

export interface TemplateSectionDefinition {
  id: string;
  title: string;
  required: boolean;
  order: number;
  contentType: SectionContentType;
}

export enum SectionContentType {
  TEXT = 'text',
  STEPS = 'steps',
  CHECKLIST = 'checklist',
  CHART = 'chart',
  RISK_MATRIX = 'risk_matrix'
}

export interface RiskAssessment {
  id: string;
  description: string;
  probability: RiskLevel;
  impact: RiskLevel;
  mitigation: string[];
  owner: string;
}

export interface QualityCheckpoint {
  id: string;
  stepId: string;
  description: string;
  criteria: string[];
  method: CheckpointMethod;
  frequency: CheckpointFrequency;
  responsible: string;
  documentation: string[];
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Moved to models/sop-models.ts