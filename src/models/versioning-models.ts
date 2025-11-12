import { SOPDocument, SOPSection } from './sop-models';
import { ChangeRequest } from './feedback-models';

/**
 * Type definitions for document versioning and revision control
 */

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  document: SOPDocument;
  changes: VersionChange[];
  metadata: VersionMetadata;
  createdAt: Date;
  createdBy: string;
  status: VersionStatus;
  tags: string[];
  checksum: string;
}

export interface VersionMetadata {
  changeReason: string;
  changeDescription: string;
  approvedBy?: string;
  approvedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  migrationNotes?: string;
  breakingChanges: boolean;
  compatibilityNotes?: string;
  rollbackInstructions?: string;
}

export interface VersionChange {
  id: string;
  type: ChangeType;
  target: ChangeTarget;
  operation: ChangeOperation;
  oldValue?: any;
  newValue?: any;
  description: string;
  impact: ChangeImpact;
  timestamp: Date;
  author: string;
}

export interface ChangeTarget {
  type: TargetType;
  id: string;
  path: string;
  selector?: string;
}

export interface ChangeImpact {
  scope: ImpactScope;
  severity: ImpactSeverity;
  affectedElements: string[];
  dependencies: string[];
  riskLevel: RiskLevel;
}

export interface VersionHistory {
  documentId: string;
  versions: DocumentVersion[];
  branches: VersionBranch[];
  merges: VersionMerge[];
  metadata: HistoryMetadata;
}

export interface VersionBranch {
  id: string;
  name: string;
  description: string;
  baseVersion: string;
  headVersion: string;
  status: BranchStatus;
  createdAt: Date;
  createdBy: string;
  mergedAt?: Date;
  mergedBy?: string;
}

export interface VersionMerge {
  id: string;
  sourceBranch: string;
  targetBranch: string;
  sourceVersion: string;
  targetVersion: string;
  resultVersion: string;
  conflicts: MergeConflict[];
  resolution: MergeResolution;
  mergedAt: Date;
  mergedBy: string;
}

export interface MergeConflict {
  id: string;
  type: ConflictType;
  path: string;
  sourceValue: any;
  targetValue: any;
  resolution?: ConflictResolution;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface MergeResolution {
  strategy: ResolutionStrategy;
  conflicts: ConflictResolution[];
  notes: string;
  validated: boolean;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: ResolutionType;
  value?: any;
  rationale: string;
}

export interface HistoryMetadata {
  totalVersions: number;
  firstVersion: string;
  latestVersion: string;
  createdAt: Date;
  lastModified: Date;
  totalChanges: number;
  contributors: string[];
  statistics: VersionStatistics;
}

export interface VersionStatistics {
  changesByType: Record<ChangeType, number>;
  changesByAuthor: Record<string, number>;
  averageTimeBetweenVersions: number;
  mostActiveSection: string;
  stabilityScore: number;
}

export interface VersionComparison {
  sourceVersion: string;
  targetVersion: string;
  differences: VersionDifference[];
  summary: ComparisonSummary;
  generatedAt: Date;
}

export interface VersionDifference {
  id: string;
  type: DifferenceType;
  path: string;
  oldValue?: any;
  newValue?: any;
  description: string;
  significance: SignificanceLevel;
}

export interface ComparisonSummary {
  totalDifferences: number;
  addedElements: number;
  modifiedElements: number;
  deletedElements: number;
  movedElements: number;
  significantChanges: number;
  compatibilityImpact: CompatibilityImpact;
}

export interface VersionRestorePoint {
  id: string;
  version: string;
  documentSnapshot: SOPDocument;
  metadata: RestorePointMetadata;
  createdAt: Date;
  expiresAt?: Date;
}

export interface RestorePointMetadata {
  reason: string;
  createdBy: string;
  automatic: boolean;
  preserveChanges: boolean;
  validationRequired: boolean;
  dependencies: string[];
}

export interface RollbackOperation {
  id: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  impact: RollbackImpact;
  validation: RollbackValidation;
  executedAt: Date;
  executedBy: string;
  status: RollbackStatus;
  rollbackChanges: VersionChange[];
}

export interface RollbackImpact {
  affectedSections: string[];
  lostChanges: VersionChange[];
  dependencyIssues: string[];
  userImpact: string[];
  dataLoss: boolean;
}

export interface RollbackValidation {
  preChecks: ValidationCheck[];
  postChecks: ValidationCheck[];
  backupCreated: boolean;
  approvalRequired: boolean;
  approvedBy?: string;
}

export interface ValidationCheck {
  id: string;
  name: string;
  description: string;
  status: CheckStatus;
  result?: any;
  error?: string;
  executedAt?: Date;
}

// Enumerations

export enum VersionStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated'
}

export enum ChangeType {
  CONTENT_ADD = 'content_add',
  CONTENT_MODIFY = 'content_modify',
  CONTENT_DELETE = 'content_delete',
  STRUCTURE_ADD = 'structure_add',
  STRUCTURE_MODIFY = 'structure_modify',
  STRUCTURE_DELETE = 'structure_delete',
  METADATA_UPDATE = 'metadata_update',
  CHART_ADD = 'chart_add',
  CHART_MODIFY = 'chart_modify',
  CHART_DELETE = 'chart_delete'
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
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',
  REPLACE = 'replace'
}

export enum ImpactScope {
  ELEMENT = 'element',
  SECTION = 'section',
  DOCUMENT = 'document',
  SYSTEM = 'system'
}

export enum ImpactSeverity {
  TRIVIAL = 'trivial',
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum BranchStatus {
  ACTIVE = 'active',
  MERGED = 'merged',
  ABANDONED = 'abandoned',
  PROTECTED = 'protected'
}

export enum ConflictType {
  CONTENT_CONFLICT = 'content_conflict',
  STRUCTURE_CONFLICT = 'structure_conflict',
  METADATA_CONFLICT = 'metadata_conflict',
  DEPENDENCY_CONFLICT = 'dependency_conflict'
}

export enum ResolutionStrategy {
  MANUAL = 'manual',
  AUTO_MERGE = 'auto_merge',
  PREFER_SOURCE = 'prefer_source',
  PREFER_TARGET = 'prefer_target',
  CUSTOM = 'custom'
}

export enum ResolutionType {
  ACCEPT_SOURCE = 'accept_source',
  ACCEPT_TARGET = 'accept_target',
  ACCEPT_BOTH = 'accept_both',
  CUSTOM_VALUE = 'custom_value',
  SKIP = 'skip'
}

export enum DifferenceType {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  MOVED = 'moved',
  RENAMED = 'renamed'
}

export enum SignificanceLevel {
  TRIVIAL = 'trivial',
  MINOR = 'minor',
  SIGNIFICANT = 'significant',
  MAJOR = 'major',
  BREAKING = 'breaking'
}

export enum CompatibilityImpact {
  NONE = 'none',
  BACKWARD_COMPATIBLE = 'backward_compatible',
  BREAKING_CHANGE = 'breaking_change',
  REQUIRES_MIGRATION = 'requires_migration'
}

export enum RollbackStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum CheckStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

/**
 * Validation functions for versioning data integrity
 */

export function validateDocumentVersion(version: DocumentVersion): boolean {
  if (!version.id || !version.documentId || !version.version) {
    return false;
  }
  
  if (!version.document || !version.createdAt || !version.createdBy) {
    return false;
  }
  
  if (!Object.values(VersionStatus).includes(version.status)) {
    return false;
  }
  
  return version.changes.every(change => validateVersionChange(change));
}

export function validateVersionChange(change: VersionChange): boolean {
  if (!change.id || !change.type || !change.target || !change.operation) {
    return false;
  }
  
  if (!Object.values(ChangeType).includes(change.type)) {
    return false;
  }
  
  if (!Object.values(TargetType).includes(change.target.type)) {
    return false;
  }
  
  if (!Object.values(ChangeOperation).includes(change.operation)) {
    return false;
  }
  
  return true;
}

export function validateVersionHistory(history: VersionHistory): boolean {
  if (!history.documentId || !Array.isArray(history.versions)) {
    return false;
  }
  
  return history.versions.every(version => validateDocumentVersion(version));
}

/**
 * Utility functions for version management
 */

export function parseVersion(versionString: string): { major: number; minor: number; patch: number } {
  const parts = versionString.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

export function formatVersion(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`;
}

export function incrementVersion(
  currentVersion: string,
  changeType: 'major' | 'minor' | 'patch'
): string {
  const { major, minor, patch } = parseVersion(currentVersion);
  
  switch (changeType) {
    case 'major':
      return formatVersion(major + 1, 0, 0);
    case 'minor':
      return formatVersion(major, minor + 1, 0);
    case 'patch':
      return formatVersion(major, minor, patch + 1);
    default:
      return currentVersion;
  }
}

export function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.patch - v2.patch;
}

export function isVersionNewer(version1: string, version2: string): boolean {
  return compareVersions(version1, version2) > 0;
}

export function calculateVersionDistance(version1: string, version2: string): number {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  
  return Math.abs(v1.major - v2.major) * 10000 + 
         Math.abs(v1.minor - v2.minor) * 100 + 
         Math.abs(v1.patch - v2.patch);
}

export function generateChecksum(document: SOPDocument): string {
  // Simple checksum based on document content
  const content = JSON.stringify(document, null, 0);
  let hash = 0;
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

export function determineChangeSignificance(change: VersionChange): SignificanceLevel {
  // Determine significance based on change type and target
  if (change.type === ChangeType.STRUCTURE_DELETE || 
      change.type === ChangeType.STRUCTURE_MODIFY) {
    return SignificanceLevel.MAJOR;
  }
  
  if (change.type === ChangeType.CONTENT_DELETE && 
      change.target.type === TargetType.SECTION) {
    return SignificanceLevel.SIGNIFICANT;
  }
  
  if (change.type === ChangeType.CONTENT_MODIFY && 
      change.target.type === TargetType.STEP) {
    return SignificanceLevel.MINOR;
  }
  
  return SignificanceLevel.TRIVIAL;
}

export function calculateStabilityScore(history: VersionHistory): number {
  if (history.versions.length < 2) return 1.0;
  
  const recentVersions = history.versions.slice(-10); // Last 10 versions
  const totalChanges = recentVersions.reduce((sum, v) => sum + v.changes.length, 0);
  const avgChangesPerVersion = totalChanges / recentVersions.length;
  
  // Lower score for more changes (less stable)
  return Math.max(0, 1 - (avgChangesPerVersion / 20));
}

export function identifyBreakingChanges(changes: VersionChange[]): VersionChange[] {
  return changes.filter(change => {
    // Structure deletions are breaking
    if (change.type === ChangeType.STRUCTURE_DELETE) return true;
    
    // Major structure modifications are breaking
    if (change.type === ChangeType.STRUCTURE_MODIFY && 
        change.impact.severity === ImpactSeverity.CRITICAL) return true;
    
    // Content deletions from critical sections are breaking
    if (change.type === ChangeType.CONTENT_DELETE && 
        change.target.type === TargetType.SECTION) return true;
    
    return false;
  });
}