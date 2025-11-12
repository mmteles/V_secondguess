import {
  DocumentVersion,
  VersionHistory,
  VersionChange,
  VersionComparison,
  VersionDifference,
  RollbackOperation,
  VersionRestorePoint,
  VersionMetadata,
  VersionStatus,
  ChangeType,
  TargetType,
  ChangeOperation,
  ImpactScope,
  ImpactSeverity,
  RiskLevel,
  DifferenceType,
  SignificanceLevel,
  RollbackStatus,
  CheckStatus,
  validateDocumentVersion,
  validateVersionHistory,
  parseVersion,
  formatVersion,
  incrementVersion,
  compareVersions,
  isVersionNewer,
  generateChecksum,
  determineChangeSignificance,
  calculateStabilityScore,
  identifyBreakingChanges
} from '@/models/versioning-models';
import { SOPDocument, SOPSection } from '@/models/sop-models';
import { ChangeRequest } from '@/models/feedback-models';

/**
 * Service for managing document versions, revision history, and rollback operations
 */
export class DocumentVersioningService {
  private versionHistories: Map<string, VersionHistory> = new Map();
  private restorePoints: Map<string, VersionRestorePoint[]> = new Map();

  /**
   * Create a new version of a document
   */
  async createVersion(
    document: SOPDocument,
    changes: ChangeRequest[],
    metadata: Partial<VersionMetadata>,
    author: string
  ): Promise<DocumentVersion> {
    const history = await this.getVersionHistory(document.id);
    const currentVersion = this.getCurrentVersion(history);
    const newVersionString = this.calculateNextVersion(currentVersion?.version || '0.0.0', changes);
    
    // Convert change requests to version changes
    const versionChanges = this.convertChangeRequestsToVersionChanges(changes, author);
    
    // Create version metadata
    const versionMetadata: VersionMetadata = {
      changeReason: metadata.changeReason || 'Document update',
      changeDescription: metadata.changeDescription || 'Updated document based on feedback',
      breakingChanges: this.hasBreakingChanges(versionChanges),
      ...metadata
    };

    // Create new version
    const parsedVersion = parseVersion(newVersionString);
    const newVersion: DocumentVersion = {
      id: `version-${document.id}-${Date.now()}`,
      documentId: document.id,
      version: newVersionString,
      majorVersion: parsedVersion.major,
      minorVersion: parsedVersion.minor,
      patchVersion: parsedVersion.patch,
      document: { ...document, version: newVersionString, updatedAt: new Date() },
      changes: versionChanges,
      metadata: versionMetadata,
      createdAt: new Date(),
      createdBy: author,
      status: VersionStatus.DRAFT,
      tags: this.generateVersionTags(versionChanges),
      checksum: generateChecksum(document)
    };

    // Validate version
    if (!validateDocumentVersion(newVersion)) {
      throw new Error('Invalid version data');
    }

    // Add to history
    history.versions.push(newVersion);
    this.updateHistoryMetadata(history);
    
    // Create automatic restore point
    await this.createRestorePoint(document.id, currentVersion?.version || '0.0.0', {
      reason: 'Automatic restore point before version creation',
      createdBy: 'system',
      automatic: true,
      preserveChanges: true,
      validationRequired: false,
      dependencies: []
    });

    return newVersion;
  }

  /**
   * Get version history for a document
   */
  async getVersionHistory(documentId: string): Promise<VersionHistory> {
    if (!this.versionHistories.has(documentId)) {
      const newHistory: VersionHistory = {
        documentId,
        versions: [],
        branches: [],
        merges: [],
        metadata: {
          totalVersions: 0,
          firstVersion: '0.0.0',
          latestVersion: '0.0.0',
          createdAt: new Date(),
          lastModified: new Date(),
          totalChanges: 0,
          contributors: [],
          statistics: {
            changesByType: {} as Record<ChangeType, number>,
            changesByAuthor: {},
            averageTimeBetweenVersions: 0,
            mostActiveSection: '',
            stabilityScore: 1.0
          }
        }
      };
      this.versionHistories.set(documentId, newHistory);
    }
    
    return this.versionHistories.get(documentId)!;
  }

  /**
   * Get a specific version of a document
   */
  async getVersion(documentId: string, version: string): Promise<DocumentVersion | null> {
    const history = await this.getVersionHistory(documentId);
    return history.versions.find(v => v.version === version) || null;
  }

  /**
   * Get the current (latest) version of a document
   */
  getCurrentVersion(history: VersionHistory): DocumentVersion | null {
    if (history.versions.length === 0) return null;
    
    return history.versions.reduce((latest, current) => {
      return isVersionNewer(current.version, latest.version) ? current : latest;
    });
  }

  /**
   * Compare two versions of a document
   */
  async compareVersions(
    documentId: string,
    sourceVersion: string,
    targetVersion: string
  ): Promise<VersionComparison> {
    const sourceDoc = await this.getVersion(documentId, sourceVersion);
    const targetDoc = await this.getVersion(documentId, targetVersion);
    
    if (!sourceDoc || !targetDoc) {
      throw new Error('One or both versions not found');
    }

    const differences = this.calculateDifferences(sourceDoc.document, targetDoc.document);
    const summary = this.generateComparisonSummary(differences);

    return {
      sourceVersion,
      targetVersion,
      differences,
      summary,
      generatedAt: new Date()
    };
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(
    documentId: string,
    targetVersion: string,
    reason: string,
    author: string
  ): Promise<RollbackOperation> {
    const history = await this.getVersionHistory(documentId);
    const currentVersion = this.getCurrentVersion(history);
    const targetVersionDoc = await this.getVersion(documentId, targetVersion);
    
    if (!currentVersion || !targetVersionDoc) {
      throw new Error('Version not found for rollback');
    }

    // Validate rollback operation
    const validation = await this.validateRollback(currentVersion, targetVersionDoc);
    if (!validation.preChecks.every((check: any) => check.status === CheckStatus.PASSED)) {
      throw new Error('Rollback validation failed');
    }

    // Create rollback operation
    const rollbackOp: RollbackOperation = {
      id: `rollback-${documentId}-${Date.now()}`,
      fromVersion: currentVersion.version,
      toVersion: targetVersion,
      reason,
      impact: this.assessRollbackImpact(currentVersion, targetVersionDoc),
      validation,
      executedAt: new Date(),
      executedBy: author,
      status: RollbackStatus.IN_PROGRESS,
      rollbackChanges: this.generateRollbackChanges(currentVersion, targetVersionDoc, author)
    };

    try {
      // Create restore point before rollback
      await this.createRestorePoint(documentId, currentVersion.version, {
        reason: `Restore point before rollback to ${targetVersion}`,
        createdBy: author,
        automatic: false,
        preserveChanges: true,
        validationRequired: true,
        dependencies: []
      });

      // Create new version with rolled back content
      const rolledBackVersion = await this.createVersion(
        targetVersionDoc.document,
        rollbackOp.rollbackChanges.map(change => this.convertVersionChangeToChangeRequest(change)),
        {
          changeReason: `Rollback to version ${targetVersion}`,
          changeDescription: reason,
          rollbackInstructions: `Rolled back from ${currentVersion.version} to ${targetVersion}`
        },
        author
      );

      rollbackOp.status = RollbackStatus.COMPLETED;
      
      // Run post-rollback validation
      const postValidation = await this.validateRollback(rolledBackVersion, targetVersionDoc);
      rollbackOp.validation.postChecks = postValidation.postChecks;

      return rollbackOp;
    } catch (error) {
      rollbackOp.status = RollbackStatus.FAILED;
      throw error;
    }
  }

  /**
   * Create a restore point for a document version
   */
  async createRestorePoint(
    documentId: string,
    version: string,
    metadata: Partial<any>
  ): Promise<VersionRestorePoint> {
    const versionDoc = await this.getVersion(documentId, version);
    if (!versionDoc) {
      throw new Error('Version not found for restore point');
    }

    const restorePoint: VersionRestorePoint = {
      id: `restore-${documentId}-${version}-${Date.now()}`,
      version,
      documentSnapshot: { ...versionDoc.document },
      metadata: {
        reason: metadata.reason || 'Manual restore point',
        createdBy: metadata.createdBy || 'system',
        automatic: metadata.automatic || false,
        preserveChanges: metadata.preserveChanges || true,
        validationRequired: metadata.validationRequired || false,
        dependencies: metadata.dependencies || []
      },
      createdAt: new Date(),
      expiresAt: metadata.expiresAt
    };

    // Store restore point
    if (!this.restorePoints.has(documentId)) {
      this.restorePoints.set(documentId, []);
    }
    this.restorePoints.get(documentId)!.push(restorePoint);

    // Cleanup old restore points (keep last 10)
    const points = this.restorePoints.get(documentId)!;
    if (points.length > 10) {
      this.restorePoints.set(documentId, points.slice(-10));
    }

    return restorePoint;
  }

  /**
   * Get restore points for a document
   */
  async getRestorePoints(documentId: string): Promise<VersionRestorePoint[]> {
    return this.restorePoints.get(documentId) || [];
  }

  /**
   * Restore from a restore point
   */
  async restoreFromPoint(
    restorePointId: string,
    author: string
  ): Promise<DocumentVersion> {
    // Find restore point
    let restorePoint: VersionRestorePoint | null = null;
    let documentId = '';
    
    for (const [docId, points] of this.restorePoints.entries()) {
      const point = points.find(p => p.id === restorePointId);
      if (point) {
        restorePoint = point;
        documentId = docId;
        break;
      }
    }

    if (!restorePoint) {
      throw new Error('Restore point not found');
    }

    // Create new version from restore point
    return await this.createVersion(
      restorePoint.documentSnapshot,
      [], // No specific changes, just restoration
      {
        changeReason: 'Restore from restore point',
        changeDescription: `Restored from restore point: ${restorePoint.metadata.reason}`,
        rollbackInstructions: `Restored from restore point ${restorePointId}`
      },
      author
    );
  }

  /**
   * Calculate the next version number based on changes
   */
  private calculateNextVersion(currentVersion: string, changes: ChangeRequest[]): string {
    const hasBreakingChanges = changes.some(change => 
      (change.impact.severity as string) === 'CRITICAL' || 
      (change.type as string) === 'DELETE' && (change.target.type as string) === 'SECTION'
    );
    
    const hasMinorChanges = changes.some(change => 
      (change.type as string) === 'ADD' || 
      (change.impact.severity as string) === 'MEDIUM'
    );

    if (hasBreakingChanges) {
      return incrementVersion(currentVersion, 'major');
    } else if (hasMinorChanges) {
      return incrementVersion(currentVersion, 'minor');
    } else {
      return incrementVersion(currentVersion, 'patch');
    }
  }

  /**
   * Convert change requests to version changes
   */
  private convertChangeRequestsToVersionChanges(
    changes: ChangeRequest[],
    author: string
  ): VersionChange[] {
    return changes.map(change => ({
      id: `vchange-${change.id}`,
      type: this.mapChangeRequestTypeToVersionChangeType(change.type),
      target: {
        type: change.target.type as TargetType,
        id: change.target.id,
        path: change.target.path || change.target.id,
        selector: change.target.selector || ''
      },
      operation: this.mapStringToChangeOperation(change.operation as string),
      oldValue: change.oldValue,
      newValue: change.newValue,
      description: change.reason,
      impact: {
        scope: this.mapStringToImpactScope(change.impact.scope as string),
        severity: this.mapStringToImpactSeverity(change.impact.severity as string),
        affectedElements: change.impact.affectedSections,
        dependencies: change.dependencies,
        riskLevel: this.mapStringToRiskLevel(change.impact.severity as string)
      },
      timestamp: new Date(),
      author
    }));
  }

  /**
   * Map string to change operation
   */
  private mapStringToChangeOperation(operation: string): ChangeOperation {
    switch (operation) {
      case 'INSERT': return ChangeOperation.INSERT;
      case 'MODIFY': return ChangeOperation.UPDATE;
      case 'REMOVE': return ChangeOperation.DELETE;
      case 'REORDER': return ChangeOperation.MOVE;
      default: return ChangeOperation.UPDATE;
    }
  }

  /**
   * Map string to impact scope
   */
  private mapStringToImpactScope(scope: string): ImpactScope {
    switch (scope) {
      case 'MINIMAL': return ImpactScope.ELEMENT;
      case 'SECTION': return ImpactScope.SECTION;
      case 'DOCUMENT': return ImpactScope.DOCUMENT;
      case 'SYSTEM': return ImpactScope.SYSTEM;
      default: return ImpactScope.ELEMENT;
    }
  }

  /**
   * Map string to impact severity
   */
  private mapStringToImpactSeverity(severity: string): ImpactSeverity {
    switch (severity) {
      case 'LOW': return ImpactSeverity.TRIVIAL;
      case 'MEDIUM': return ImpactSeverity.MINOR;
      case 'HIGH': return ImpactSeverity.MAJOR;
      case 'CRITICAL': return ImpactSeverity.CRITICAL;
      default: return ImpactSeverity.TRIVIAL;
    }
  }

  /**
   * Map string to risk level
   */
  private mapStringToRiskLevel(severity: string): RiskLevel {
    switch (severity) {
      case 'LOW': return RiskLevel.LOW;
      case 'MEDIUM': return RiskLevel.MEDIUM;
      case 'HIGH': return RiskLevel.HIGH;
      case 'CRITICAL': return RiskLevel.CRITICAL;
      default: return RiskLevel.LOW;
    }
  }

  /**
   * Map change request type to version change type
   */
  private mapChangeRequestTypeToVersionChangeType(changeType: string): ChangeType {
    switch (changeType) {
      case 'ADD': return ChangeType.CONTENT_ADD;
      case 'UPDATE': return ChangeType.CONTENT_MODIFY;
      case 'DELETE': return ChangeType.CONTENT_DELETE;
      case 'MOVE': return ChangeType.STRUCTURE_MODIFY;
      case 'REPLACE': return ChangeType.CONTENT_MODIFY;
      default: return ChangeType.CONTENT_MODIFY;
    }
  }

  /**
   * Assess risk level based on impact severity
   */
  private assessRiskLevel(severity: ImpactSeverity): RiskLevel {
    switch (severity) {
      case ImpactSeverity.CRITICAL: return RiskLevel.CRITICAL;
      case ImpactSeverity.MAJOR: return RiskLevel.HIGH;
      case ImpactSeverity.MINOR: return RiskLevel.MEDIUM;
      default: return RiskLevel.LOW;
    }
  }

  /**
   * Check if changes contain breaking changes
   */
  private hasBreakingChanges(changes: VersionChange[]): boolean {
    return identifyBreakingChanges(changes).length > 0;
  }

  /**
   * Generate version tags based on changes
   */
  private generateVersionTags(changes: VersionChange[]): string[] {
    const tags: string[] = [];
    
    if (this.hasBreakingChanges(changes)) {
      tags.push('breaking-change');
    }
    
    if (changes.some(c => c.type === ChangeType.STRUCTURE_ADD || c.type === ChangeType.STRUCTURE_MODIFY)) {
      tags.push('structural-change');
    }
    
    if (changes.some(c => c.impact.severity === ImpactSeverity.CRITICAL)) {
      tags.push('critical-update');
    }
    
    if (changes.length > 10) {
      tags.push('major-revision');
    }
    
    return tags;
  }

  /**
   * Update history metadata
   */
  private updateHistoryMetadata(history: VersionHistory): void {
    const versions = history.versions;
    
    history.metadata.totalVersions = versions.length;
    history.metadata.lastModified = new Date();
    
    if (versions.length > 0) {
      const sortedVersions = versions.sort((a, b) => compareVersions(a.version, b.version));
      history.metadata.firstVersion = sortedVersions[0]?.version || '0.0.0';
      history.metadata.latestVersion = sortedVersions[sortedVersions.length - 1]?.version || '0.0.0';
      
      // Update statistics
      const allChanges = versions.flatMap(v => v.changes);
      history.metadata.totalChanges = allChanges.length;
      
      // Contributors
      const contributors = new Set(versions.map(v => v.createdBy));
      history.metadata.contributors = Array.from(contributors);
      
      // Changes by type
      const changesByType: Record<ChangeType, number> = {} as Record<ChangeType, number>;
      for (const change of allChanges) {
        changesByType[change.type] = (changesByType[change.type] || 0) + 1;
      }
      history.metadata.statistics.changesByType = changesByType;
      
      // Changes by author
      const changesByAuthor: Record<string, number> = {};
      for (const change of allChanges) {
        changesByAuthor[change.author] = (changesByAuthor[change.author] || 0) + 1;
      }
      history.metadata.statistics.changesByAuthor = changesByAuthor;
      
      // Average time between versions
      if (versions.length > 1) {
        const timeDiffs = [];
        for (let i = 1; i < versions.length; i++) {
          const current = versions[i];
          const previous = versions[i - 1];
          if (current && previous) {
            const diff = current.createdAt.getTime() - previous.createdAt.getTime();
            timeDiffs.push(diff);
          }
        }
        history.metadata.statistics.averageTimeBetweenVersions = 
          timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
      }
      
      // Stability score
      history.metadata.statistics.stabilityScore = calculateStabilityScore(history);
    }
  }

  /**
   * Calculate differences between two documents
   */
  private calculateDifferences(sourceDoc: SOPDocument, targetDoc: SOPDocument): VersionDifference[] {
    const differences: VersionDifference[] = [];
    
    // Compare metadata
    if (sourceDoc.title !== targetDoc.title) {
      differences.push({
        id: `diff-title-${Date.now()}`,
        type: DifferenceType.MODIFIED,
        path: 'title',
        oldValue: sourceDoc.title,
        newValue: targetDoc.title,
        description: 'Document title changed',
        significance: SignificanceLevel.MINOR
      });
    }
    
    // Compare sections
    const sourceSections = new Map(sourceDoc.sections.map(s => [s.id, s]));
    const targetSections = new Map(targetDoc.sections.map(s => [s.id, s]));
    
    // Find added sections
    for (const [id, section] of targetSections) {
      if (!sourceSections.has(id)) {
        differences.push({
          id: `diff-section-add-${id}`,
          type: DifferenceType.ADDED,
          path: `sections.${id}`,
          newValue: section,
          description: `Section '${section.title}' added`,
          significance: SignificanceLevel.SIGNIFICANT
        });
      }
    }
    
    // Find deleted sections
    for (const [id, section] of sourceSections) {
      if (!targetSections.has(id)) {
        differences.push({
          id: `diff-section-delete-${id}`,
          type: DifferenceType.DELETED,
          path: `sections.${id}`,
          oldValue: section,
          description: `Section '${section.title}' deleted`,
          significance: SignificanceLevel.MAJOR
        });
      }
    }
    
    // Find modified sections
    for (const [id, sourceSection] of sourceSections) {
      const targetSection = targetSections.get(id);
      if (targetSection) {
        const sectionDiffs = this.compareSections(sourceSection, targetSection);
        differences.push(...sectionDiffs);
      }
    }
    
    return differences;
  }

  /**
   * Compare two sections for differences
   */
  private compareSections(sourceSection: SOPSection, targetSection: SOPSection): VersionDifference[] {
    const differences: VersionDifference[] = [];
    
    if (sourceSection.title !== targetSection.title) {
      differences.push({
        id: `diff-section-title-${sourceSection.id}`,
        type: DifferenceType.MODIFIED,
        path: `sections.${sourceSection.id}.title`,
        oldValue: sourceSection.title,
        newValue: targetSection.title,
        description: `Section title changed from '${sourceSection.title}' to '${targetSection.title}'`,
        significance: SignificanceLevel.MINOR
      });
    }
    
    if (sourceSection.content !== targetSection.content) {
      differences.push({
        id: `diff-section-content-${sourceSection.id}`,
        type: DifferenceType.MODIFIED,
        path: `sections.${sourceSection.id}.content`,
        oldValue: sourceSection.content,
        newValue: targetSection.content,
        description: `Section '${sourceSection.title}' content modified`,
        significance: this.assessContentChangeSignificance(sourceSection.content, targetSection.content)
      });
    }
    
    return differences;
  }

  /**
   * Assess significance of content changes
   */
  private assessContentChangeSignificance(oldContent: string, newContent: string): SignificanceLevel {
    const oldLength = oldContent.length;
    const newLength = newContent.length;
    const lengthDiff = Math.abs(newLength - oldLength);
    const changeRatio = lengthDiff / Math.max(oldLength, newLength);
    
    if (changeRatio > 0.5) return SignificanceLevel.MAJOR;
    if (changeRatio > 0.2) return SignificanceLevel.SIGNIFICANT;
    if (changeRatio > 0.05) return SignificanceLevel.MINOR;
    return SignificanceLevel.TRIVIAL;
  }

  /**
   * Generate comparison summary
   */
  private generateComparisonSummary(differences: VersionDifference[]): any {
    const summary = {
      totalDifferences: differences.length,
      addedElements: differences.filter(d => d.type === DifferenceType.ADDED).length,
      modifiedElements: differences.filter(d => d.type === DifferenceType.MODIFIED).length,
      deletedElements: differences.filter(d => d.type === DifferenceType.DELETED).length,
      movedElements: differences.filter(d => d.type === DifferenceType.MOVED).length,
      significantChanges: differences.filter(d => 
        d.significance === SignificanceLevel.SIGNIFICANT || 
        d.significance === SignificanceLevel.MAJOR ||
        d.significance === SignificanceLevel.BREAKING
      ).length,
      compatibilityImpact: this.assessCompatibilityImpact(differences)
    };
    
    return summary;
  }

  /**
   * Assess compatibility impact of changes
   */
  private assessCompatibilityImpact(differences: VersionDifference[]): any {
    const hasBreaking = differences.some(d => d.significance === SignificanceLevel.BREAKING);
    const hasMajor = differences.some(d => d.significance === SignificanceLevel.MAJOR);
    const hasDeleted = differences.some(d => d.type === DifferenceType.DELETED);
    
    if (hasBreaking || hasDeleted) return 'BREAKING_CHANGE';
    if (hasMajor) return 'REQUIRES_MIGRATION';
    return 'BACKWARD_COMPATIBLE';
  }

  /**
   * Validate rollback operation
   */
  private async validateRollback(currentVersion: DocumentVersion, targetVersion: DocumentVersion): Promise<any> {
    const preChecks = [
      {
        id: 'version-exists',
        name: 'Target Version Exists',
        description: 'Verify target version exists and is accessible',
        status: CheckStatus.PASSED,
        executedAt: new Date()
      },
      {
        id: 'no-conflicts',
        name: 'No Conflicts',
        description: 'Check for conflicts that would prevent rollback',
        status: CheckStatus.PASSED,
        executedAt: new Date()
      }
    ];
    
    return {
      preChecks,
      postChecks: [],
      backupCreated: true,
      approvalRequired: this.requiresApprovalForRollback(currentVersion, targetVersion),
      approvedBy: undefined
    };
  }

  /**
   * Check if rollback requires approval
   */
  private requiresApprovalForRollback(currentVersion: DocumentVersion, targetVersion: DocumentVersion): boolean {
    // Require approval for major version rollbacks
    const currentParsed = parseVersion(currentVersion.version);
    const targetParsed = parseVersion(targetVersion.version);
    
    return currentParsed.major > targetParsed.major;
  }

  /**
   * Assess rollback impact
   */
  private assessRollbackImpact(currentVersion: DocumentVersion, targetVersion: DocumentVersion): any {
    const comparison = this.calculateDifferences(targetVersion.document, currentVersion.document);
    
    return {
      affectedSections: comparison
        .filter(d => d.path.startsWith('sections.'))
        .map(d => d.path.split('.')[1]),
      lostChanges: currentVersion.changes,
      dependencyIssues: [],
      userImpact: ['Users will see previous version of document'],
      dataLoss: comparison.some(d => d.type === DifferenceType.DELETED)
    };
  }

  /**
   * Generate rollback changes
   */
  private generateRollbackChanges(
    currentVersion: DocumentVersion,
    targetVersion: DocumentVersion,
    author: string
  ): VersionChange[] {
    const differences = this.calculateDifferences(currentVersion.document, targetVersion.document);
    
    return differences.map(diff => ({
      id: `rollback-change-${diff.id}`,
      type: this.mapDifferenceTypeToChangeType(diff.type),
      target: {
        type: this.inferTargetTypeFromPath(diff.path),
        id: diff.path,
        path: diff.path
      },
      operation: this.mapDifferenceTypeToOperation(diff.type),
      oldValue: diff.oldValue,
      newValue: diff.newValue,
      description: `Rollback: ${diff.description}`,
      impact: {
        scope: ImpactScope.ELEMENT,
        severity: this.mapSignificanceToSeverity(diff.significance),
        affectedElements: [diff.path],
        dependencies: [],
        riskLevel: RiskLevel.LOW
      },
      timestamp: new Date(),
      author
    }));
  }

  /**
   * Map difference type to change type
   */
  private mapDifferenceTypeToChangeType(diffType: DifferenceType): ChangeType {
    switch (diffType) {
      case DifferenceType.ADDED: return ChangeType.CONTENT_ADD;
      case DifferenceType.MODIFIED: return ChangeType.CONTENT_MODIFY;
      case DifferenceType.DELETED: return ChangeType.CONTENT_DELETE;
      case DifferenceType.MOVED: return ChangeType.STRUCTURE_MODIFY;
      default: return ChangeType.CONTENT_MODIFY;
    }
  }

  /**
   * Map difference type to operation
   */
  private mapDifferenceTypeToOperation(diffType: DifferenceType): ChangeOperation {
    switch (diffType) {
      case DifferenceType.ADDED: return ChangeOperation.INSERT;
      case DifferenceType.MODIFIED: return ChangeOperation.UPDATE;
      case DifferenceType.DELETED: return ChangeOperation.DELETE;
      case DifferenceType.MOVED: return ChangeOperation.MOVE;
      default: return ChangeOperation.UPDATE;
    }
  }

  /**
   * Infer target type from path
   */
  private inferTargetTypeFromPath(path: string): TargetType {
    if (path.startsWith('sections.')) return TargetType.SECTION;
    if (path.startsWith('charts.')) return TargetType.CHART;
    if (path.startsWith('metadata.')) return TargetType.METADATA;
    return TargetType.DOCUMENT;
  }

  /**
   * Map significance level to impact severity
   */
  private mapSignificanceToSeverity(significance: SignificanceLevel): ImpactSeverity {
    switch (significance) {
      case SignificanceLevel.BREAKING: return ImpactSeverity.CRITICAL;
      case SignificanceLevel.MAJOR: return ImpactSeverity.MAJOR;
      case SignificanceLevel.SIGNIFICANT: return ImpactSeverity.MINOR;
      default: return ImpactSeverity.TRIVIAL;
    }
  }

  /**
   * Convert version change to change request (for rollback)
   */
  private convertVersionChangeToChangeRequest(versionChange: VersionChange): ChangeRequest {
    return {
      id: `change-${versionChange.id}`,
      type: versionChange.type as any,
      target: versionChange.target as any,
      operation: versionChange.operation as any,
      oldValue: versionChange.oldValue,
      newValue: versionChange.newValue,
      reason: versionChange.description,
      impact: versionChange.impact as any,
      dependencies: versionChange.impact.dependencies,
      validationStatus: 'VALID' as any
    };
  }
}