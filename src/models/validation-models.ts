import { ValidationErrorType } from './enums';

/**
 * Type definitions for validation and error handling
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  score?: number; // 0-100 validation score
}

export interface ValidationError {
  id: string;
  type: ValidationErrorType;
  field: string;
  message: string;
  severity: ErrorSeverity;
  code: string;
  context?: Record<string, any>;
  suggestions?: string[];
}

export interface ValidationWarning {
  id: string;
  field: string;
  message: string;
  code: string;
  context?: Record<string, any>;
  suggestions?: string[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: ValidationRuleType;
  parameters: Record<string, any>;
  errorMessage: string;
  warningMessage?: string;
}

export interface ValidationContext {
  entityType: string;
  entityId: string;
  operation: ValidationOperation;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface ValidationReport {
  id: string;
  context: ValidationContext;
  results: ValidationResult[];
  summary: ValidationSummary;
  generatedAt: Date;
}

export interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  overallScore: number;
  criticalIssues: number;
}

export interface FieldValidation {
  field: string;
  rules: ValidationRule[];
  required: boolean;
  dependencies?: string[];
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: BusinessRuleAction;
  priority: RulePriority;
  enabled: boolean;
}

export interface BusinessRuleAction {
  type: ActionType;
  parameters: Record<string, any>;
  message: string;
}

export interface ComplianceCheck {
  id: string;
  standard: string;
  requirement: string;
  description: string;
  checkFunction: string;
  mandatory: boolean;
  evidence?: string[];
}

export interface QualityMetric {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  target: number;
  actual?: number;
  unit: string;
  threshold: QualityThreshold;
}

export interface QualityThreshold {
  excellent: number;
  good: number;
  acceptable: number;
  poor: number;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ValidationRuleType {
  REQUIRED = 'required',
  FORMAT = 'format',
  RANGE = 'range',
  PATTERN = 'pattern',
  CUSTOM = 'custom',
  BUSINESS_RULE = 'business_rule',
  COMPLIANCE = 'compliance'
}

export enum ValidationOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  IMPORT = 'import',
  EXPORT = 'export'
}

export enum RulePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ActionType {
  BLOCK = 'block',
  WARN = 'warn',
  LOG = 'log',
  CORRECT = 'correct',
  NOTIFY = 'notify'
}

export enum MetricType {
  PERCENTAGE = 'percentage',
  COUNT = 'count',
  DURATION = 'duration',
  RATIO = 'ratio',
  SCORE = 'score'
}