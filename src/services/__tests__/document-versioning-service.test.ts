import { DocumentVersioningService } from '../document-versioning-service';
import {
  DocumentVersion,
  VersionHistory,
  VersionStatus,
  ChangeType,
  TargetType,
  ChangeOperation,
  ImpactSeverity,
  RollbackStatus,
  DifferenceType,
  SignificanceLevel,
  validateDocumentVersion,
  validateVersionHistory,
  parseVersion,
  formatVersion,
  incrementVersion,
  compareVersions,
  isVersionNewer,
  generateChecksum,
  calculateStabilityScore
} from '@/models/versioning-models';
import { SOPDocument, SOPSection } from '@/models/sop-models';
import { ChangeRequest } from '@/models/feedback-models';
import { SOPType, SectionType } from '@/models/enums';

describe('DocumentVersioningService', () => {
  let service: DocumentVersioningService;
  let mockSOPDocument: SOPDocument;
  let mockChangeRequests: ChangeRequest[];

  beforeEach(() => {
    service = new DocumentVersioningService();
    
    mockSOPDocument = {
      id: 'sop-123',
      title: 'Test SOP Document',
      type: SOPType.AUTOMATION,
      sections: [
        {
          id: 'overview',
          title: 'Overview',
          content: 'This is the overview section.',
          type: SectionType.OVERVIEW,
          order: 1,
          charts: [],
          checkpoints: []
        },
        {
          id: 'steps',
          title: 'Process Steps',
          content: 'Step 1: Initialize\nStep 2: Execute\nStep 3: Finalize',
          type: SectionType.STEPS,
          order: 2,
          charts: [],
          checkpoints: []
        }
      ],
      charts: [],
      metadata: {
        author: 'Test Author',
        department: 'Test Department',
        effectiveDate: new Date(),
        reviewDate: new Date(),
        version: '1.0.0',
        status: 'DRAFT' as any,
        tags: ['test'],
        category: 'Test',
        audience: ['General Users'],
        purpose: 'Test purpose',
        scope: 'Test scope',
        references: []
      },
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockChangeRequests = [
      {
        id: 'change-1',
        type: 'UPDATE' as any,
        target: {
          type: 'SECTION' as any,
          id: 'overview',
          path: 'sections.overview'
        },
        operation: 'MODIFY' as any,
        oldValue: 'This is the overview section.',
        newValue: 'This is the updated overview section.',
        reason: 'Improve clarity',
        impact: {
          scope: 'SECTION' as any,
          severity: 'LOW' as any,
          affectedSections: ['overview'],
          affectedUsers: ['All users'],
          estimatedEffort: {
            hours: 1,
            complexity: 'SIMPLE' as any,
            resources: ['Content Editor']
          },
          risks: []
        },
        dependencies: [],
        validationStatus: 'VALID' as any
      }
    ];
  });

  describe('Version Creation', () => {
    describe('createVersion', () => {
      it('should create a new version successfully', async () => {
        const version = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          {
            changeReason: 'Content update',
            changeDescription: 'Updated overview section for clarity'
          },
          'test-user'
        );

        expect(version).toHaveProperty('id');
        expect(version).toHaveProperty('documentId', mockSOPDocument.id);
        expect(version).toHaveProperty('version');
        expect(version).toHaveProperty('document');
        expect(version).toHaveProperty('changes');
        expect(version).toHaveProperty('metadata');
        expect(version).toHaveProperty('createdBy', 'test-user');
        expect(version).toHaveProperty('status', VersionStatus.DRAFT);
        expect(version.changes.length).toBe(mockChangeRequests.length);
      });

      it('should increment version number correctly', async () => {
        // Create first version
        const version1 = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'First update' },
          'test-user'
        );

        // Create second version
        const version2 = await service.createVersion(
          version1.document,
          mockChangeRequests,
          { changeReason: 'Second update' },
          'test-user'
        );

        expect(isVersionNewer(version2.version, version1.version)).toBe(true);
      });

      it('should generate appropriate version tags', async () => {
        const breakingChangeRequests = [
          {
            ...mockChangeRequests[0]!,
            type: 'DELETE' as any,
            target: { type: 'SECTION' as any, id: 'overview', path: 'sections.overview' },
            impact: {
              ...mockChangeRequests[0]!.impact,
              severity: 'CRITICAL' as any
            }
          }
        ];

        const version = await service.createVersion(
          mockSOPDocument,
          breakingChangeRequests,
          { changeReason: 'Breaking change' },
          'test-user'
        );

        expect(version.tags).toContain('breaking-change');
      });

      it('should create restore point automatically', async () => {
        await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'Test update' },
          'test-user'
        );

        const restorePoints = await service.getRestorePoints(mockSOPDocument.id);
        expect(restorePoints.length).toBeGreaterThan(0);
      });

      it('should validate version data', async () => {
        const version = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'Test update' },
          'test-user'
        );

        expect(validateDocumentVersion(version)).toBe(true);
      });
    });

    describe('Version Number Calculation', () => {
      it('should increment patch version for minor changes', async () => {
        const minorChanges = [
          {
            ...mockChangeRequests[0]!,
            impact: {
              ...mockChangeRequests[0]!.impact,
              severity: 'LOW' as any
            }
          }
        ];

        const version = await service.createVersion(
          mockSOPDocument,
          minorChanges,
          { changeReason: 'Minor update' },
          'test-user'
        );

        const parsed = parseVersion(version.version);
        expect(parsed.patch).toBeGreaterThan(0);
      });

      it('should increment minor version for moderate changes', async () => {
        const moderateChanges = [
          {
            ...mockChangeRequests[0]!,
            type: 'ADD' as any,
            impact: {
              ...mockChangeRequests[0]!.impact,
              severity: 'MEDIUM' as any
            }
          }
        ];

        const version = await service.createVersion(
          mockSOPDocument,
          moderateChanges,
          { changeReason: 'Feature addition' },
          'test-user'
        );

        const parsed = parseVersion(version.version);
        expect(parsed.minor).toBeGreaterThan(0);
      });

      it('should increment major version for breaking changes', async () => {
        const breakingChanges = [
          {
            ...mockChangeRequests[0]!,
            type: 'DELETE' as any,
            target: { type: 'SECTION' as any, id: 'overview', path: 'sections.overview' },
            impact: {
              ...mockChangeRequests[0]!.impact,
              severity: 'CRITICAL' as any
            }
          }
        ];

        const version = await service.createVersion(
          mockSOPDocument,
          breakingChanges,
          { changeReason: 'Breaking change' },
          'test-user'
        );

        const parsed = parseVersion(version.version);
        expect(parsed.major).toBeGreaterThan(0);
      });
    });
  });

  describe('Version History Management', () => {
    describe('getVersionHistory', () => {
      it('should create new history for new document', async () => {
        const history = await service.getVersionHistory('new-doc-123');
        
        expect(history).toHaveProperty('documentId', 'new-doc-123');
        expect(history).toHaveProperty('versions');
        expect(history).toHaveProperty('branches');
        expect(history).toHaveProperty('merges');
        expect(history).toHaveProperty('metadata');
        expect(Array.isArray(history.versions)).toBe(true);
        expect(history.versions.length).toBe(0);
      });

      it('should return existing history for existing document', async () => {
        // Create a version first
        await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'Test' },
          'test-user'
        );

        const history = await service.getVersionHistory(mockSOPDocument.id);
        expect(history.versions.length).toBeGreaterThan(0);
      });

      it('should validate history structure', async () => {
        const history = await service.getVersionHistory('test-doc');
        expect(validateVersionHistory(history)).toBe(true);
      });
    });

    describe('getVersion', () => {
      it('should retrieve specific version', async () => {
        const createdVersion = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'Test' },
          'test-user'
        );

        const retrievedVersion = await service.getVersion(
          mockSOPDocument.id,
          createdVersion.version
        );

        expect(retrievedVersion).not.toBeNull();
        expect(retrievedVersion?.id).toBe(createdVersion.id);
        expect(retrievedVersion?.version).toBe(createdVersion.version);
      });

      it('should return null for non-existent version', async () => {
        const version = await service.getVersion(mockSOPDocument.id, '99.99.99');
        expect(version).toBeNull();
      });
    });

    describe('getCurrentVersion', () => {
      it('should return latest version', async () => {
        const history = await service.getVersionHistory(mockSOPDocument.id);
        
        // Create multiple versions
        const version1 = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'First' },
          'test-user'
        );

        const version2 = await service.createVersion(
          version1.document,
          mockChangeRequests,
          { changeReason: 'Second' },
          'test-user'
        );

        const currentVersion = service.getCurrentVersion(history);
        expect(currentVersion?.version).toBe(version2.version);
      });

      it('should return null for empty history', async () => {
        const emptyHistory = await service.getVersionHistory('empty-doc');
        const currentVersion = service.getCurrentVersion(emptyHistory);
        expect(currentVersion).toBeNull();
      });
    });
  });

  describe('Version Comparison', () => {
    describe('compareVersions', () => {
      it('should compare two versions successfully', async () => {
        // Create two versions
        const version1 = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'First version' },
          'test-user'
        );

        const modifiedDoc = {
          ...version1.document,
          sections: [
            ...version1.document.sections.slice(0, 1),
            {
              ...version1.document.sections[1]!,
              content: 'Step 1: Initialize\nStep 2: Execute with modifications\nStep 3: Finalize'
            }
          ]
        };

        const version2 = await service.createVersion(
          modifiedDoc,
          mockChangeRequests,
          { changeReason: 'Second version' },
          'test-user'
        );

        const comparison = await service.compareVersions(
          mockSOPDocument.id,
          version1.version,
          version2.version
        );

        expect(comparison).toHaveProperty('sourceVersion', version1.version);
        expect(comparison).toHaveProperty('targetVersion', version2.version);
        expect(comparison).toHaveProperty('differences');
        expect(comparison).toHaveProperty('summary');
        expect(Array.isArray(comparison.differences)).toBe(true);
      });

      it('should detect content modifications', async () => {
        const version1 = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'First version' },
          'test-user'
        );

        const modifiedDoc = {
          ...version1.document,
          title: 'Modified Test SOP Document'
        };

        const version2 = await service.createVersion(
          modifiedDoc,
          [],
          { changeReason: 'Title change' },
          'test-user'
        );

        const comparison = await service.compareVersions(
          mockSOPDocument.id,
          version1.version,
          version2.version
        );

        const titleDiff = comparison.differences.find(d => d.path === 'title');
        expect(titleDiff).toBeDefined();
        expect(titleDiff?.type).toBe(DifferenceType.MODIFIED);
        expect(titleDiff?.oldValue).toBe('Test SOP Document');
        expect(titleDiff?.newValue).toBe('Modified Test SOP Document');
      });

      it('should detect section additions and deletions', async () => {
        const version1 = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'First version' },
          'test-user'
        );

        const modifiedDoc = {
          ...version1.document,
          sections: [
            ...version1.document.sections,
            {
              id: 'new-section',
              title: 'New Section',
              content: 'This is a new section',
              type: SectionType.REFERENCES,
              order: 3,
              charts: [],
              checkpoints: []
            }
          ]
        };

        const version2 = await service.createVersion(
          modifiedDoc,
          [],
          { changeReason: 'Add new section' },
          'test-user'
        );

        const comparison = await service.compareVersions(
          mockSOPDocument.id,
          version1.version,
          version2.version
        );

        const addedSection = comparison.differences.find(d => 
          d.type === DifferenceType.ADDED && d.path === 'sections.new-section'
        );
        expect(addedSection).toBeDefined();
      });

      it('should generate accurate comparison summary', async () => {
        const version1 = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'First version' },
          'test-user'
        );

        const version2 = await service.createVersion(
          version1.document,
          mockChangeRequests,
          { changeReason: 'Second version' },
          'test-user'
        );

        const comparison = await service.compareVersions(
          mockSOPDocument.id,
          version1.version,
          version2.version
        );

        expect(comparison.summary).toHaveProperty('totalDifferences');
        expect(comparison.summary).toHaveProperty('addedElements');
        expect(comparison.summary).toHaveProperty('modifiedElements');
        expect(comparison.summary).toHaveProperty('deletedElements');
        expect(comparison.summary).toHaveProperty('compatibilityImpact');
        expect(comparison.summary.totalDifferences).toBe(comparison.differences.length);
      });
    });
  });

  describe('Rollback Operations', () => {
    describe('rollbackToVersion', () => {
      it('should rollback to previous version successfully', async () => {
        // Create multiple versions
        const version1 = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'First version' },
          'test-user'
        );

        const version2 = await service.createVersion(
          version1.document,
          mockChangeRequests,
          { changeReason: 'Second version' },
          'test-user'
        );

        // Rollback to version 1
        const rollbackOp = await service.rollbackToVersion(
          mockSOPDocument.id,
          version1.version,
          'Rollback due to issues',
          'test-user'
        );

        expect(rollbackOp).toHaveProperty('id');
        expect(rollbackOp).toHaveProperty('fromVersion', version2.version);
        expect(rollbackOp).toHaveProperty('toVersion', version1.version);
        expect(rollbackOp).toHaveProperty('reason', 'Rollback due to issues');
        expect(rollbackOp).toHaveProperty('status', RollbackStatus.COMPLETED);
        expect(rollbackOp).toHaveProperty('executedBy', 'test-user');
      });

      it('should create restore point before rollback', async () => {
        const version1 = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'First version' },
          'test-user'
        );

        const version2 = await service.createVersion(
          version1.document,
          mockChangeRequests,
          { changeReason: 'Second version' },
          'test-user'
        );

        const initialRestorePoints = await service.getRestorePoints(mockSOPDocument.id);
        const initialCount = initialRestorePoints.length;

        await service.rollbackToVersion(
          mockSOPDocument.id,
          version1.version,
          'Test rollback',
          'test-user'
        );

        const finalRestorePoints = await service.getRestorePoints(mockSOPDocument.id);
        expect(finalRestorePoints.length).toBeGreaterThan(initialCount);
      });

      it('should validate rollback operation', async () => {
        const version1 = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'First version' },
          'test-user'
        );

        const version2 = await service.createVersion(
          version1.document,
          mockChangeRequests,
          { changeReason: 'Second version' },
          'test-user'
        );

        const rollbackOp = await service.rollbackToVersion(
          mockSOPDocument.id,
          version1.version,
          'Test rollback',
          'test-user'
        );

        expect(rollbackOp.validation).toHaveProperty('preChecks');
        expect(rollbackOp.validation).toHaveProperty('postChecks');
        expect(rollbackOp.validation).toHaveProperty('backupCreated', true);
        expect(Array.isArray(rollbackOp.validation.preChecks)).toBe(true);
      });

      it('should throw error for non-existent target version', async () => {
        await expect(service.rollbackToVersion(
          mockSOPDocument.id,
          '99.99.99',
          'Invalid rollback',
          'test-user'
        )).rejects.toThrow('Version not found for rollback');
      });
    });
  });

  describe('Restore Points', () => {
    describe('createRestorePoint', () => {
      it('should create restore point successfully', async () => {
        const version = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'Test version' },
          'test-user'
        );

        const restorePoint = await service.createRestorePoint(
          mockSOPDocument.id,
          version.version,
          {
            reason: 'Manual backup',
            createdBy: 'test-user',
            automatic: false
          }
        );

        expect(restorePoint).toHaveProperty('id');
        expect(restorePoint).toHaveProperty('version', version.version);
        expect(restorePoint).toHaveProperty('documentSnapshot');
        expect(restorePoint).toHaveProperty('metadata');
        expect(restorePoint.metadata.reason).toBe('Manual backup');
        expect(restorePoint.metadata.createdBy).toBe('test-user');
        expect(restorePoint.metadata.automatic).toBe(false);
      });

      it('should limit number of restore points', async () => {
        const version = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'Test version' },
          'test-user'
        );

        // Create more than 10 restore points
        for (let i = 0; i < 15; i++) {
          await service.createRestorePoint(
            mockSOPDocument.id,
            version.version,
            { reason: `Backup ${i}`, createdBy: 'test-user' }
          );
        }

        const restorePoints = await service.getRestorePoints(mockSOPDocument.id);
        expect(restorePoints.length).toBeLessThanOrEqual(10);
      });
    });

    describe('restoreFromPoint', () => {
      it('should restore from restore point successfully', async () => {
        const version = await service.createVersion(
          mockSOPDocument,
          mockChangeRequests,
          { changeReason: 'Test version' },
          'test-user'
        );

        const restorePoint = await service.createRestorePoint(
          mockSOPDocument.id,
          version.version,
          { reason: 'Test backup', createdBy: 'test-user' }
        );

        const restoredVersion = await service.restoreFromPoint(
          restorePoint.id,
          'test-user'
        );

        expect(restoredVersion).toHaveProperty('id');
        expect(restoredVersion).toHaveProperty('createdBy', 'test-user');
        expect(restoredVersion.metadata.changeReason).toBe('Restore from restore point');
      });

      it('should throw error for non-existent restore point', async () => {
        await expect(service.restoreFromPoint(
          'non-existent-restore-point',
          'test-user'
        )).rejects.toThrow('Restore point not found');
      });
    });
  });
});

describe('Versioning Utility Functions', () => {
  describe('parseVersion', () => {
    it('should parse version string correctly', () => {
      const parsed = parseVersion('1.2.3');
      expect(parsed).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should handle incomplete version strings', () => {
      const parsed = parseVersion('1.2');
      expect(parsed).toEqual({ major: 1, minor: 2, patch: 0 });
    });
  });

  describe('formatVersion', () => {
    it('should format version correctly', () => {
      const formatted = formatVersion(1, 2, 3);
      expect(formatted).toBe('1.2.3');
    });
  });

  describe('incrementVersion', () => {
    it('should increment patch version', () => {
      const incremented = incrementVersion('1.2.3', 'patch');
      expect(incremented).toBe('1.2.4');
    });

    it('should increment minor version and reset patch', () => {
      const incremented = incrementVersion('1.2.3', 'minor');
      expect(incremented).toBe('1.3.0');
    });

    it('should increment major version and reset minor and patch', () => {
      const incremented = incrementVersion('1.2.3', 'major');
      expect(incremented).toBe('2.0.0');
    });
  });

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0);
      expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0);
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    });

    it('should handle major version differences', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
    });
  });

  describe('isVersionNewer', () => {
    it('should identify newer versions correctly', () => {
      expect(isVersionNewer('1.2.4', '1.2.3')).toBe(true);
      expect(isVersionNewer('1.2.3', '1.2.4')).toBe(false);
      expect(isVersionNewer('2.0.0', '1.9.9')).toBe(true);
    });
  });

  describe('generateChecksum', () => {
    it('should generate consistent checksum for same document', () => {
      const testDoc = {
        id: 'test-doc',
        title: 'Test Document',
        type: SOPType.AUTOMATION,
        sections: [],
        charts: [],
        metadata: {} as any,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const checksum1 = generateChecksum(testDoc);
      const checksum2 = generateChecksum(testDoc);
      expect(checksum1).toBe(checksum2);
    });

    it('should generate different checksum for different documents', () => {
      const testDoc1 = {
        id: 'test-doc-1',
        title: 'Test Document 1',
        type: SOPType.AUTOMATION,
        sections: [],
        charts: [],
        metadata: {} as any,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const testDoc2 = {
        ...testDoc1,
        title: 'Modified Title'
      };
      
      const checksum1 = generateChecksum(testDoc1);
      const checksum2 = generateChecksum(testDoc2);
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('calculateStabilityScore', () => {
    it('should calculate stability score for version history', () => {
      const mockHistory = {
        documentId: 'test-doc',
        versions: [
          {
            id: 'v1',
            documentId: 'test-doc',
            version: '1.0.0',
            majorVersion: 1,
            minorVersion: 0,
            patchVersion: 0,
            document: {} as SOPDocument,
            changes: [
              { id: 'c1' } as any,
              { id: 'c2' } as any
            ],
            metadata: {} as any,
            createdAt: new Date(),
            createdBy: 'test',
            status: VersionStatus.DRAFT,
            tags: [],
            checksum: 'test'
          },
          {
            id: 'v2',
            documentId: 'test-doc',
            version: '1.0.1',
            majorVersion: 1,
            minorVersion: 0,
            patchVersion: 1,
            document: {} as SOPDocument,
            changes: [{ id: 'c3' } as any],
            metadata: {} as any,
            createdAt: new Date(),
            createdBy: 'test',
            status: VersionStatus.DRAFT,
            tags: [],
            checksum: 'test'
          }
        ],
        branches: [],
        merges: [],
        metadata: {} as any
      } as VersionHistory;

      const score = calculateStabilityScore(mockHistory);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return 1.0 for single version history', () => {
      const singleVersionHistory = {
        documentId: 'test-doc',
        versions: [{
          id: 'v1',
          documentId: 'test-doc',
          version: '1.0.0',
          majorVersion: 1,
          minorVersion: 0,
          patchVersion: 0,
          document: {} as SOPDocument,
          changes: [],
          metadata: {} as any,
          createdAt: new Date(),
          createdBy: 'test',
          status: VersionStatus.DRAFT,
          tags: [],
          checksum: 'test'
        }],
        branches: [],
        merges: [],
        metadata: {} as any
      } as VersionHistory;

      const score = calculateStabilityScore(singleVersionHistory);
      expect(score).toBe(1.0);
    });
  });
});