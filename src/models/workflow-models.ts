import { WorkflowType } from './enums';

// Forward declaration for RiskAssessment
export interface RiskAssessment {
  id: string;
  description: string;
  probability: RiskLevel;
  impact: RiskLevel;
  mitigation: string[];
  owner: string;
}

/**
 * Type definitions for workflow and process modeling
 */

export interface WorkflowDefinition {
  id: string;
  title: string;
  description: string;
  type: WorkflowType;
  steps: WorkflowStep[];
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  dependencies: WorkflowDependency[];
  risks: RiskAssessment[];
  metadata: WorkflowMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  order: number;
  type: StepType;
  inputs: string[];
  outputs: string[];
  prerequisites: string[];
  duration?: Duration;
  resources?: Resource[];
  instructions: string[];
  qualityChecks: QualityCheck[];
}

export interface WorkflowInput {
  id: string;
  name: string;
  description: string;
  type: InputType;
  required: boolean;
  source?: string;
  format?: string;
  validation?: WorkflowValidationRule[];
}

export interface WorkflowOutput {
  id: string;
  name: string;
  description: string;
  type: OutputType;
  destination?: string;
  format?: string;
  qualityCriteria?: string[];
}

export interface WorkflowDependency {
  id: string;
  type: DependencyType;
  source: string;
  target: string;
  description: string;
  condition?: string;
}

export interface WorkflowMetadata {
  author: string;
  version: string;
  tags: string[];
  category: string;
  complexity: ComplexityLevel;
  estimatedDuration: Duration;
  requiredSkills: string[];
}

export interface Duration {
  value: number;
  unit: TimeUnit;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  quantity?: number;
  description?: string;
}

export interface QualityCheck {
  id: string;
  description: string;
  criteria: string[];
  method: string;
  frequency: string;
}

export interface WorkflowValidationRule {
  type: ValidationType;
  value: any;
  message: string;
}

export interface EventSequence {
  id: string;
  name: string;
  events: WorkflowEvent[];
  triggers: EventTrigger[];
}

export interface WorkflowEvent {
  id: string;
  name: string;
  type: EventType;
  timestamp?: Date;
  data?: Record<string, any>;
  source: string;
  target?: string;
}

export interface EventTrigger {
  id: string;
  condition: string;
  action: string;
  priority: TriggerPriority;
}

export interface ProcessDefinition {
  id: string;
  name: string;
  description: string;
  actors: ProcessActor[];
  activities: ProcessActivity[];
  flows: ProcessFlow[];
}

export interface ProcessActor {
  id: string;
  name: string;
  role: string;
  responsibilities: string[];
}

export interface ProcessActivity {
  id: string;
  name: string;
  description: string;
  actorId: string;
  type: ActivityType;
  duration?: Duration;
}

export interface ProcessFlow {
  id: string;
  from: string;
  to: string;
  condition?: string;
  type: FlowType;
}

export enum StepType {
  MANUAL = 'manual',
  AUTOMATED = 'automated',
  DECISION = 'decision',
  PARALLEL = 'parallel',
  LOOP = 'loop'
}

export enum InputType {
  DATA = 'data',
  DOCUMENT = 'document',
  APPROVAL = 'approval',
  RESOURCE = 'resource',
  INFORMATION = 'information'
}

export enum OutputType {
  DATA = 'data',
  DOCUMENT = 'document',
  NOTIFICATION = 'notification',
  REPORT = 'report',
  DECISION = 'decision'
}

export enum DependencyType {
  PREREQUISITE = 'prerequisite',
  RESOURCE = 'resource',
  APPROVAL = 'approval',
  DATA = 'data',
  TIMING = 'timing'
}

export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum TimeUnit {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks'
}

export enum ResourceType {
  HUMAN = 'human',
  EQUIPMENT = 'equipment',
  SOFTWARE = 'software',
  MATERIAL = 'material',
  FACILITY = 'facility'
}

export enum ValidationType {
  REQUIRED = 'required',
  FORMAT = 'format',
  RANGE = 'range',
  PATTERN = 'pattern',
  CUSTOM = 'custom'
}

export enum EventType {
  START = 'start',
  END = 'end',
  INTERMEDIATE = 'intermediate',
  BOUNDARY = 'boundary',
  ERROR = 'error'
}

export enum TriggerPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ActivityType {
  TASK = 'task',
  SUBPROCESS = 'subprocess',
  CALL_ACTIVITY = 'call_activity',
  MANUAL_TASK = 'manual_task',
  USER_TASK = 'user_task'
}

export enum FlowType {
  SEQUENCE = 'sequence',
  MESSAGE = 'message',
  ASSOCIATION = 'association',
  DATA_ASSOCIATION = 'data_association'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}