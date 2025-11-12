import { SOPType, SectionType, DocumentFormat } from './enums';
import { ChartDefinition } from './chart-models';

/**
 * Type definitions for Standard Operating Procedure documents
 */

export interface SOPDocument {
  id: string;
  title: string;
  type: SOPType;
  sections: SOPSection[];
  charts: ChartDefinition[];
  metadata: SOPMetadata;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SOPSection {
  id: string;
  title: string;
  content: string;
  type: SectionType;
  order: number;
  charts: ChartReference[];
  checkpoints: QualityCheckpoint[];
  subsections?: SOPSubsection[];
}

export interface SOPSubsection {
  id: string;
  title: string;
  content: string;
  order: number;
  charts: ChartReference[];
}

export interface SOPMetadata {
  author: string;
  department: string;
  approver?: string;
  effectiveDate: Date;
  reviewDate: Date;
  version: string;
  status: SOPStatus;
  tags: string[];
  category: string;
  audience: string[];
  purpose: string;
  scope: string;
  references: SOPReference[];
}

export interface ChartReference {
  chartId: string;
  position: ChartPosition;
  caption?: string;
  size?: ChartSize;
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

export interface SOPReference {
  id: string;
  title: string;
  type: ReferenceType;
  url?: string;
  document?: string;
  version?: string;
}

export interface SOPChanges {
  sections?: SectionChange[];
  metadata?: Partial<SOPMetadata>;
  charts?: ChartChange[];
  changeReason: string;
  changedBy: string;
  changeDate: Date;
}

export interface SectionChange {
  sectionId: string;
  operation: ChangeOperation;
  content?: string;
  position?: number;
}

export interface ChartChange {
  chartId: string;
  operation: ChangeOperation;
  chartData?: Partial<ChartDefinition>;
  position?: ChartPosition;
}

export interface ExportOptions {
  includeCharts: boolean;
  includeMetadata: boolean;
  template?: string;
  watermark?: string;
  headerFooter?: HeaderFooterOptions;
  styling?: DocumentStyling;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  format: DocumentFormat;
  error?: string;
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  exportedAt: Date;
  exportedBy: string;
  originalDocumentId: string;
  version: string;
  checksum?: string;
}

export interface HeaderFooterOptions {
  includeHeader: boolean;
  includeFooter: boolean;
  headerText?: string;
  footerText?: string;
  includePageNumbers: boolean;
  includeDatetime: boolean;
}

export interface DocumentStyling {
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  margins: DocumentMargins;
  colors: DocumentColors;
}

export interface DocumentMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface DocumentColors {
  text: string;
  background: string;
  headers: string;
  borders: string;
}

export enum SOPStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  OBSOLETE = 'obsolete'
}

export enum ChartPosition {
  INLINE = 'inline',
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
  FULL_PAGE = 'full_page'
}

export enum ChartSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FULL_WIDTH = 'full_width'
}

export enum ReferenceType {
  DOCUMENT = 'document',
  WEBSITE = 'website',
  STANDARD = 'standard',
  REGULATION = 'regulation',
  PROCEDURE = 'procedure'
}

export enum ChangeOperation {
  ADD = 'add',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move'
}

export enum CheckpointMethod {
  VISUAL_INSPECTION = 'visual_inspection',
  MEASUREMENT = 'measurement',
  DOCUMENTATION_REVIEW = 'documentation_review',
  SYSTEM_CHECK = 'system_check',
  PEER_REVIEW = 'peer_review'
}

export enum CheckpointFrequency {
  EVERY_EXECUTION = 'every_execution',
  PERIODIC = 'periodic',
  MILESTONE = 'milestone',
  EXCEPTION = 'exception',
  RANDOM_SAMPLING = 'random_sampling'
}

export interface ExportOptions {
  includeCharts: boolean;
  includeMetadata: boolean;
  template?: string;
  watermark?: string;
  headerFooter?: HeaderFooterOptions;
  styling?: DocumentStyling;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  format: DocumentFormat;
  error?: string;
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  exportedAt: Date;
  exportedBy: string;
  originalDocumentId: string;
  version: string;
  checksum?: string;
}

/**
 * Validation functions for SOP document data integrity
 */

export function validateSOPDocument(sop: SOPDocument): boolean {
  if (!sop.id || !sop.title || !sop.version || !sop.createdAt) {
    return false;
  }
  
  if (!Object.values(SOPType).includes(sop.type)) {
    return false;
  }
  
  if (!Array.isArray(sop.sections) || sop.sections.length === 0) {
    return false;
  }
  
  return sop.sections.every(section => validateSOPSection(section)) &&
         validateSOPMetadata(sop.metadata);
}

export function validateSOPSection(section: SOPSection): boolean {
  if (!section.id || !section.title || !section.content || section.order < 0) {
    return false;
  }
  
  if (!Object.values(SectionType).includes(section.type)) {
    return false;
  }
  
  if (!Array.isArray(section.charts) || !Array.isArray(section.checkpoints)) {
    return false;
  }
  
  return section.checkpoints.every(checkpoint => validateQualityCheckpoint(checkpoint));
}

export function validateSOPMetadata(metadata: SOPMetadata): boolean {
  if (!metadata.author || !metadata.department || !metadata.effectiveDate || !metadata.reviewDate || !metadata.version) {
    return false;
  }
  
  if (!Object.values(SOPStatus).includes(metadata.status)) {
    return false;
  }
  
  if (!Array.isArray(metadata.tags) || !Array.isArray(metadata.audience) || !Array.isArray(metadata.references)) {
    return false;
  }
  
  return metadata.references.every(ref => validateSOPReference(ref));
}

export function validateQualityCheckpoint(checkpoint: QualityCheckpoint): boolean {
  if (!checkpoint.id || !checkpoint.stepId || !checkpoint.description || !checkpoint.responsible) {
    return false;
  }
  
  if (!Object.values(CheckpointMethod).includes(checkpoint.method)) {
    return false;
  }
  
  if (!Object.values(CheckpointFrequency).includes(checkpoint.frequency)) {
    return false;
  }
  
  if (!Array.isArray(checkpoint.criteria) || checkpoint.criteria.length === 0) {
    return false;
  }
  
  return true;
}

export function validateSOPReference(reference: SOPReference): boolean {
  if (!reference.id || !reference.title) {
    return false;
  }
  
  if (!Object.values(ReferenceType).includes(reference.type)) {
    return false;
  }
  
  return true;
}

export function validateChartReference(chartRef: ChartReference): boolean {
  if (!chartRef.chartId) {
    return false;
  }
  
  if (!Object.values(ChartPosition).includes(chartRef.position)) {
    return false;
  }
  
  if (chartRef.size && !Object.values(ChartSize).includes(chartRef.size)) {
    return false;
  }
  
  return true;
}

export function validateExportOptions(options: ExportOptions): boolean {
  if (typeof options.includeCharts !== 'boolean' || typeof options.includeMetadata !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * Data transformation utilities between workflow and SOP formats
 */

export function transformWorkflowToSOP(workflow: any, type: SOPType): Partial<SOPDocument> {
  const sopId = `sop-${workflow.id}-${Date.now()}`;
  
  return {
    id: sopId,
    title: workflow.title || 'Generated SOP',
    type: type,
    sections: transformWorkflowStepsToSections(workflow.steps || []),
    charts: [],
    metadata: {
      author: workflow.metadata?.author || 'AI Voice SOP Agent',
      department: workflow.metadata?.category || 'General',
      effectiveDate: new Date(),
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      version: '1.0',
      status: SOPStatus.DRAFT,
      tags: workflow.metadata?.tags || [],
      category: workflow.metadata?.category || 'General',
      audience: ['General Users'],
      purpose: workflow.description || 'Generated from workflow definition',
      scope: 'As defined in workflow',
      references: []
    },
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function transformWorkflowStepsToSections(steps: any[]): SOPSection[] {
  const sections: SOPSection[] = [];
  
  // Add overview section
  sections.push({
    id: 'overview',
    title: 'Overview',
    content: 'This SOP was generated from a workflow definition.',
    type: SectionType.OVERVIEW,
    order: 0,
    charts: [],
    checkpoints: []
  });
  
  // Add prerequisites section if needed
  const prerequisites = steps.filter(step => step.prerequisites && step.prerequisites.length > 0);
  if (prerequisites.length > 0) {
    sections.push({
      id: 'prerequisites',
      title: 'Prerequisites',
      content: prerequisites.map(step => step.prerequisites.join(', ')).join('\n'),
      type: SectionType.PREREQUISITES,
      order: 1,
      charts: [],
      checkpoints: []
    });
  }
  
  // Add steps section
  const stepsContent = steps.map((step, index) => 
    `${index + 1}. ${step.title}\n   ${step.description || ''}\n   Instructions: ${(step.instructions || []).join(', ')}`
  ).join('\n\n');
  
  sections.push({
    id: 'steps',
    title: 'Procedure Steps',
    content: stepsContent,
    type: SectionType.STEPS,
    order: 2,
    charts: [],
    checkpoints: steps.flatMap((step, index) => 
      (step.qualityChecks || []).map((check: any, checkIndex: number) => ({
        id: `checkpoint-${index}-${checkIndex}`,
        stepId: step.id || `step-${index}`,
        description: check.description || 'Quality checkpoint',
        criteria: check.criteria || ['Verify completion'],
        method: CheckpointMethod.VISUAL_INSPECTION,
        frequency: CheckpointFrequency.EVERY_EXECUTION,
        responsible: 'Process Owner',
        documentation: []
      }))
    )
  });
  
  return sections;
}

/**
 * Serialization and deserialization utilities for document persistence
 */

export function serializeSOPDocument(sop: SOPDocument): string {
  try {
    return JSON.stringify(sop, null, 2);
  } catch (error) {
    throw new Error(`Failed to serialize SOP document: ${error}`);
  }
}

export function deserializeSOPDocument(data: string): SOPDocument {
  try {
    const parsed = JSON.parse(data);
    
    // Convert date strings back to Date objects
    if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
    if (parsed.updatedAt) parsed.updatedAt = new Date(parsed.updatedAt);
    if (parsed.metadata?.effectiveDate) parsed.metadata.effectiveDate = new Date(parsed.metadata.effectiveDate);
    if (parsed.metadata?.reviewDate) parsed.metadata.reviewDate = new Date(parsed.metadata.reviewDate);
    
    if (!validateSOPDocument(parsed)) {
      throw new Error('Invalid SOP document structure');
    }
    
    return parsed as SOPDocument;
  } catch (error) {
    throw new Error(`Failed to deserialize SOP document: ${error}`);
  }
}

export function serializeSOPSection(section: SOPSection): string {
  try {
    return JSON.stringify(section, null, 2);
  } catch (error) {
    throw new Error(`Failed to serialize SOP section: ${error}`);
  }
}

export function deserializeSOPSection(data: string): SOPSection {
  try {
    const parsed = JSON.parse(data);
    
    if (!validateSOPSection(parsed)) {
      throw new Error('Invalid SOP section structure');
    }
    
    return parsed as SOPSection;
  } catch (error) {
    throw new Error(`Failed to deserialize SOP section: ${error}`);
  }
}