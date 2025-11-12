/**
 * Core enumerations for the AI Voice SOP Agent system
 */

export enum SOPType {
  AUTOMATION = 'automation',
  PROCESS_IMPROVEMENT = 'process_improvement',
  TRAINING = 'training'
}

export enum ChartType {
  FLOWCHART = 'flowchart',
  EVENT_DIAGRAM = 'event_diagram',
  PROCESS_MAP = 'process_map',
  SWIMLANE = 'swimlane',
  DECISION_TREE = 'decision_tree'
}

export enum ConversationState {
  INITIAL_DESCRIPTION = 'initial_description',
  GATHERING_DETAILS = 'gathering_details',
  VALIDATION = 'validation',
  REFINEMENT = 'refinement',
  FINALIZATION = 'finalization'
}

export enum WorkflowType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  ITERATIVE = 'iterative',
  EVENT_DRIVEN = 'event_driven'
}

export enum ChartFormat {
  SVG = 'svg',
  PNG = 'png',
  PDF = 'pdf',
  JPEG = 'jpeg',
  HTML = 'html'
}

export enum SectionType {
  OVERVIEW = 'overview',
  PREREQUISITES = 'prerequisites',
  STEPS = 'steps',
  QUALITY_CONTROL = 'quality_control',
  TROUBLESHOOTING = 'troubleshooting',
  REFERENCES = 'references',
  RISK_ASSESSMENT = 'risk_assessment',
  CHECKLIST = 'checklist',
  DIAGRAM = 'diagram'
}

export enum UserInputType {
  VOICE = 'voice',
  TEXT = 'text',
  CORRECTION = 'correction',
  CONFIRMATION = 'confirmation'
}

export enum ValidationErrorType {
  MISSING_FIELD = 'missing_field',
  INVALID_FORMAT = 'invalid_format',
  CONSTRAINT_VIOLATION = 'constraint_violation',
  BUSINESS_RULE_VIOLATION = 'business_rule_violation'
}

export enum DocumentFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  HTML = 'html',
  MARKDOWN = 'markdown',
  RTF = 'rtf'
}