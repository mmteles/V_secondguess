import { FeedbackProcessorService } from '../feedback-processor-service';
import { DocumentVersioningService } from '../document-versioning-service';
import { SOPGeneratorService } from '../sop-generator-service';
import {
  FeedbackRequest,
  FeedbackType,
  FeedbackSource,
  FeedbackPriority,
  FeedbackStatus,
  ChangeType,
  ProcessingStatus
} from '@/models/feedback-models';
import {
  DocumentVersion,
  VersionStatus,
  RollbackStatus
} from '@/models/versioning-models';
import { SOPDocument } from '@/models/sop-models';
import { SOPType, SectionType } from '@/models/enums';
import { WorkflowDefinition, WorkflowType, StepType, ComplexityLevel, TimeUnit } from '@/models';

describe('SOP Refinement System Integration Tests', () => {
  let feedbackProcessor: FeedbackProcessorService;
  let versioningService: DocumentVersioningService;
  let sopGenerator: SOPGeneratorService;
  let testSOPDocument: SOPDocument;
  let testWorkflow: WorkflowDefinition;

  beforeEach(async () => {
    feedbackProcessor = new FeedbackProcessorService();
    versioningService = new DocumentVersioningService();
    sopGenerator = new SOPGeneratorService();

    // Create a test workflow
    testWorkflow = {
      id: 'integration-test-workflow',
      title: 'Integration Test Process',
      description: 'A test workflow for integration testing',
      type: WorkflowType.SEQUENTIAL,
      steps: [
        {
          id: 'step-1',
          title: 'Initialize System',
          description: 'Set up the system for processing',
          order: 1,
          type: StepType.MANUAL,
          inputs: ['system-config'],
          outputs: ['initialization-complete'],
          prerequisites: ['System access'],
          duration: { value: 15, unit: TimeUnit.MINUTES },
          resources: [],
          instructions: [
            'Log into the system',
            'Verify system status',
            'Load configuration'
          ],
          qualityChecks: []
        },
        {
          id: 'step-2',
          title: 'Process Data',
          description: 'Execute the main data processing',
          order: 2,
          type: StepType.AUTOMATED,
          inputs: ['initialization-complete', 'input-data'],
          outputs: ['processed-results'],
          prerequisites: ['Data validation'],
          duration: { value: 1, unit: TimeUnit.HOURS },
          resources: [],
          instructions: [
            'Start data processing',
            'Monitor progress',
            'Validate results'
          ],
          qualityChecks: []
        }
      ],
      inputs: [],
      outputs: [],
      dependencies: [],
      risks: [],
      metadata: {
        author: 'Integration Test',
        version: '1.0',
        tags: ['integration', 'test'],
        category: 'Testing',
        complexity: ComplexityLevel.MEDIUM,
        estimatedDuration: { value: 2, unit: TimeUnit.HOURS },
        requiredSkills: ['System Administration']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Generate initial SOP document
    testSOPDocument = await sopGenerator.generateSOP(testWorkflow, SOPType.AUTOMATION);
  });

  describe('End-to-End Feedback Processing and Versioning', () => {
    it('should process feedback and create new version', async () => {
      // Create feedback request
      const feedbackRequest: FeedbackRequest = {
        id: 'integration-feedback-1',
        sopId: testSOPDocument.id,
        userId: 'integration-user',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.VOICE_INPUT,
        content: {
          comment: 'The initialization step should include security verification',
          targetSection: 'execution-steps',
          changeType: ChangeType.UPDATE,
          suggestedText: 'Log into the system\nVerify system status\nPerform security verification\nLoad configuration',
          rationale: 'Security verification is critical for system integrity'
        },
        priority: FeedbackPriority.HIGH,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          voiceTranscription: {
            transcriptionConfidence: 0.92,
            alternativeTranscriptions: [],
            speakerInfo: { confidence: 0.88 }
          },
          confidence: 0.9,
          language: 'en'
        }
      };

      // Process feedback
      const processingResult = await feedbackProcessor.processFeedback(
        feedbackRequest,
        testSOPDocument
      );

      expect(processingResult.status).toBe(ProcessingStatus.COMPLETED);
      expect(processingResult.changes.length).toBeGreaterThan(0);

      // Create new version with changes
      const newVersion = await versioningService.createVersion(
        testSOPDocument,
        processingResult.changes,
        {
          changeReason: 'User feedback incorporation',
          changeDescription: 'Added security verification step based on user feedback'
        },
        'integration-user'
      );

      expect(newVersion).toHaveProperty('id');
      expect(newVersion.status).toBe(VersionStatus.DRAFT);
      expect(newVersion.changes.length).toBe(processingResult.changes.length);
      expect(newVersion.metadata.changeReason).toBe('User feedback incorporation');

      // Verify version history
      const history = await versioningService.getVersionHistory(testSOPDocument.id);
      expect(history.versions.length).toBeGreaterThan(0);
      expect(history.metadata.totalVersions).toBeGreaterThan(0);
    });

    it('should handle multiple feedback requests and create appropriate versions', async () => {
      // First feedback: Content correction
      const feedback1: FeedbackRequest = {
        id: 'feedback-1',
        sopId: testSOPDocument.id,
        userId: 'user-1',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'Fix typo in overview section',
          targetSection: 'overview',
          changeType: ChangeType.UPDATE,
          originalText: 'teh system',
          suggestedText: 'the system'
        },
        priority: FeedbackPriority.LOW,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      // Second feedback: Addition
      const feedback2: FeedbackRequest = {
        id: 'feedback-2',
        sopId: testSOPDocument.id,
        userId: 'user-2',
        type: FeedbackType.ADDITION,
        source: FeedbackSource.VOICE_INPUT,
        content: {
          comment: 'Add troubleshooting section for common issues',
          changeType: ChangeType.ADD,
          suggestedText: 'Troubleshooting: If system fails to initialize, check network connectivity and permissions.'
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          voiceTranscription: {
            transcriptionConfidence: 0.89,
            alternativeTranscriptions: [],
            speakerInfo: { confidence: 0.85 }
          }
        }
      };

      // Process both feedback requests
      const result1 = await feedbackProcessor.processFeedback(feedback1, testSOPDocument);
      const result2 = await feedbackProcessor.processFeedback(feedback2, testSOPDocument);

      // Create versions
      const version1 = await versioningService.createVersion(
        testSOPDocument,
        result1.changes,
        { changeReason: 'Typo correction' },
        'user-1'
      );

      const version2 = await versioningService.createVersion(
        version1.document,
        result2.changes,
        { changeReason: 'Add troubleshooting section' },
        'user-2'
      );

      // Verify version progression
      expect(version1.version).not.toBe(version2.version);
      expect(version2.version > version1.version).toBe(true);

      // Verify history
      const history = await versioningService.getVersionHistory(testSOPDocument.id);
      expect(history.versions.length).toBe(2);
      expect(history.metadata.contributors).toContain('user-1');
      expect(history.metadata.contributors).toContain('user-2');
    });

    it('should detect and handle conflicting feedback', async () => {
      // Two conflicting feedback requests targeting the same section
      const conflictingFeedback1: FeedbackRequest = {
        id: 'conflict-feedback-1',
        sopId: testSOPDocument.id,
        userId: 'user-1',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'Change overview title to "System Overview"',
          targetSection: 'overview',
          changeType: ChangeType.UPDATE,
          suggestedText: 'System Overview'
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      const conflictingFeedback2: FeedbackRequest = {
        id: 'conflict-feedback-2',
        sopId: testSOPDocument.id,
        userId: 'user-2',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'Change overview title to "Process Overview"',
          targetSection: 'overview',
          changeType: ChangeType.UPDATE,
          suggestedText: 'Process Overview'
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      // Process both feedback requests
      const result1 = await feedbackProcessor.processFeedback(conflictingFeedback1, testSOPDocument);
      const result2 = await feedbackProcessor.processFeedback(conflictingFeedback2, testSOPDocument);

      // Combine changes to detect conflicts
      const allChanges = [...result1.changes, ...result2.changes];
      
      // Check for same target conflicts
      const overviewChanges = allChanges.filter(change => 
        change.target.id === 'overview' || change.target.path?.includes('overview')
      );
      
      expect(overviewChanges.length).toBeGreaterThan(1);
      
      // In a real system, conflict detection would prevent automatic processing
      // For this test, we verify that the system can identify potential conflicts
      const hasConflicts = overviewChanges.length > 1;
      expect(hasConflicts).toBe(true);
    });
  });

  describe('Version Comparison and Rollback Integration', () => {
    it('should compare versions and perform rollback successfully', async () => {
      // Create initial version
      const feedback1: FeedbackRequest = {
        id: 'version-feedback-1',
        sopId: testSOPDocument.id,
        userId: 'version-user',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'Update step 1 instructions',
          targetSection: 'execution-steps',
          changeType: ChangeType.UPDATE,
          suggestedText: 'Updated instructions for step 1'
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      const result1 = await feedbackProcessor.processFeedback(feedback1, testSOPDocument);
      const version1 = await versioningService.createVersion(
        testSOPDocument,
        result1.changes,
        { changeReason: 'First update' },
        'version-user'
      );

      // Create second version with problematic changes
      const feedback2: FeedbackRequest = {
        id: 'version-feedback-2',
        sopId: testSOPDocument.id,
        userId: 'version-user',
        type: FeedbackType.DELETION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'Remove step 2 as it is not needed',
          targetSection: 'execution-steps',
          changeType: ChangeType.DELETE
        },
        priority: FeedbackPriority.HIGH,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      const result2 = await feedbackProcessor.processFeedback(feedback2, version1.document);
      const version2 = await versioningService.createVersion(
        version1.document,
        result2.changes,
        { changeReason: 'Remove unnecessary step' },
        'version-user'
      );

      // Compare versions
      const comparison = await versioningService.compareVersions(
        testSOPDocument.id,
        version1.version,
        version2.version
      );

      expect(comparison.differences.length).toBeGreaterThan(0);
      expect(comparison.summary.totalDifferences).toBe(comparison.differences.length);

      // Perform rollback due to issues with version 2
      const rollbackOperation = await versioningService.rollbackToVersion(
        testSOPDocument.id,
        version1.version,
        'Version 2 caused issues, rolling back to stable version',
        'version-user'
      );

      expect(rollbackOperation.status).toBe(RollbackStatus.COMPLETED);
      expect(rollbackOperation.fromVersion).toBe(version2.version);
      expect(rollbackOperation.toVersion).toBe(version1.version);

      // Verify rollback created new version
      const history = await versioningService.getVersionHistory(testSOPDocument.id);
      expect(history.versions.length).toBe(3); // Original creation + version1 + version2 + rollback version
    });

    it('should create and restore from restore points', async () => {
      // Create a version
      const feedback: FeedbackRequest = {
        id: 'restore-feedback',
        sopId: testSOPDocument.id,
        userId: 'restore-user',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'Update for restore point test',
          changeType: ChangeType.UPDATE,
          suggestedText: 'Updated content for restore point testing'
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      const result = await feedbackProcessor.processFeedback(feedback, testSOPDocument);
      const version = await versioningService.createVersion(
        testSOPDocument,
        result.changes,
        { changeReason: 'Restore point test' },
        'restore-user'
      );

      // Create manual restore point
      const restorePoint = await versioningService.createRestorePoint(
        testSOPDocument.id,
        version.version,
        {
          reason: 'Manual backup before major changes',
          createdBy: 'restore-user',
          automatic: false
        }
      );

      expect(restorePoint).toHaveProperty('id');
      expect(restorePoint.version).toBe(version.version);

      // Restore from restore point
      const restoredVersion = await versioningService.restoreFromPoint(
        restorePoint.id,
        'restore-user'
      );

      expect(restoredVersion).toHaveProperty('id');
      expect(restoredVersion.createdBy).toBe('restore-user');
      expect(restoredVersion.metadata.changeReason).toBe('Restore from restore point');

      // Verify restore points list
      const restorePoints = await versioningService.getRestorePoints(testSOPDocument.id);
      expect(restorePoints.length).toBeGreaterThan(0);
      expect(restorePoints.some(rp => rp.id === restorePoint.id)).toBe(true);
    });
  });

  describe('Complex Workflow Integration', () => {
    it('should handle complete feedback-to-version workflow with validation', async () => {
      // Step 1: Process multiple types of feedback
      const feedbackRequests: FeedbackRequest[] = [
        {
          id: 'complex-feedback-1',
          sopId: testSOPDocument.id,
          userId: 'complex-user-1',
          type: FeedbackType.CONTENT_CORRECTION,
          source: FeedbackSource.VOICE_INPUT,
          content: {
            comment: 'The word "system" should be "application" in step 1',
            targetSection: 'execution-steps',
            changeType: ChangeType.UPDATE,
            originalText: 'system',
            suggestedText: 'application'
          },
          priority: FeedbackPriority.MEDIUM,
          status: FeedbackStatus.SUBMITTED,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            voiceTranscription: {
              transcriptionConfidence: 0.94,
              alternativeTranscriptions: ['system', 'sistem'],
              speakerInfo: { confidence: 0.91 }
            }
          }
        },
        {
          id: 'complex-feedback-2',
          sopId: testSOPDocument.id,
          userId: 'complex-user-2',
          type: FeedbackType.ADDITION,
          source: FeedbackSource.TEXT_INPUT,
          content: {
            comment: 'Add error handling section',
            changeType: ChangeType.ADD,
            suggestedText: 'Error Handling: If any step fails, consult the troubleshooting guide and contact support if needed.'
          },
          priority: FeedbackPriority.HIGH,
          status: FeedbackStatus.SUBMITTED,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {}
        },
        {
          id: 'complex-feedback-3',
          sopId: testSOPDocument.id,
          userId: 'complex-user-3',
          type: FeedbackType.QUALITY_IMPROVEMENT,
          source: FeedbackSource.FORM_SUBMISSION,
          content: {
            comment: 'Improve clarity of step 2 description',
            targetSection: 'execution-steps',
            changeType: ChangeType.UPDATE,
            suggestedText: 'Execute the main data processing with enhanced monitoring and validation'
          },
          priority: FeedbackPriority.MEDIUM,
          status: FeedbackStatus.SUBMITTED,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {}
        }
      ];

      // Step 2: Process all feedback
      const processingResults = [];
      for (const feedback of feedbackRequests) {
        const result = await feedbackProcessor.processFeedback(feedback, testSOPDocument);
        processingResults.push(result);
        
        // Validate processing results
        expect(result.status).toBe(ProcessingStatus.COMPLETED);
        expect(result.validationResults[0]?.isValid).toBe(true);
      }

      // Step 3: Create versions incrementally
      let currentDocument = testSOPDocument;
      const versions: DocumentVersion[] = [];

      for (let i = 0; i < processingResults.length; i++) {
        const result = processingResults[i]!;
        const feedback = feedbackRequests[i]!;
        
        const version = await versioningService.createVersion(
          currentDocument,
          result.changes,
          {
            changeReason: `Feedback ${i + 1}: ${feedback.type}`,
            changeDescription: feedback.content.comment
          },
          feedback.userId
        );
        
        versions.push(version);
        currentDocument = version.document;
      }

      // Step 4: Validate version progression
      expect(versions.length).toBe(3);
      
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i]!.version > versions[i - 1]!.version).toBe(true);
      }

      // Step 5: Validate history and metadata
      const history = await versioningService.getVersionHistory(testSOPDocument.id);
      expect(history.versions.length).toBe(3);
      expect(history.metadata.contributors.length).toBe(3);
      expect(history.metadata.contributors).toContain('complex-user-1');
      expect(history.metadata.contributors).toContain('complex-user-2');
      expect(history.metadata.contributors).toContain('complex-user-3');

      // Step 6: Test version comparison across multiple versions
      const firstToLastComparison = await versioningService.compareVersions(
        testSOPDocument.id,
        versions[0]!.version,
        versions[2]!.version
      );

      expect(firstToLastComparison.differences.length).toBeGreaterThan(0);
      expect(firstToLastComparison.summary.totalDifferences).toBeGreaterThan(0);

      // Step 7: Test stability score calculation
      const stabilityScore = history.metadata.statistics.stabilityScore;
      expect(stabilityScore).toBeGreaterThanOrEqual(0);
      expect(stabilityScore).toBeLessThanOrEqual(1);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test invalid feedback processing
      const invalidFeedback: FeedbackRequest = {
        id: '', // Invalid empty ID
        sopId: testSOPDocument.id,
        userId: 'error-user',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: '', // Invalid empty comment
          changeType: ChangeType.UPDATE
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      // Should throw error for invalid feedback
      await expect(
        feedbackProcessor.processFeedback(invalidFeedback, testSOPDocument)
      ).rejects.toThrow();

      // Test rollback to non-existent version
      await expect(
        versioningService.rollbackToVersion(
          testSOPDocument.id,
          '999.999.999',
          'Invalid rollback test',
          'error-user'
        )
      ).rejects.toThrow('Version not found for rollback');

      // Test restore from non-existent restore point
      await expect(
        versioningService.restoreFromPoint(
          'non-existent-restore-point',
          'error-user'
        )
      ).rejects.toThrow('Restore point not found');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent feedback processing', async () => {
      // Create multiple feedback requests
      const concurrentFeedback: FeedbackRequest[] = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-feedback-${i}`,
        sopId: testSOPDocument.id,
        userId: `concurrent-user-${i}`,
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: `Concurrent feedback ${i}`,
          changeType: ChangeType.UPDATE,
          suggestedText: `Updated content ${i}`
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      }));

      // Process all feedback concurrently
      const processingPromises = concurrentFeedback.map(feedback =>
        feedbackProcessor.processFeedback(feedback, testSOPDocument)
      );

      const results = await Promise.all(processingPromises);

      // Validate all results
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.status).toBe(ProcessingStatus.COMPLETED);
        expect(result.changes.length).toBeGreaterThan(0);
      });

      // Create versions sequentially to avoid conflicts
      let currentDoc = testSOPDocument;
      for (let i = 0; i < results.length; i++) {
        const version = await versioningService.createVersion(
          currentDoc,
          results[i]!.changes,
          { changeReason: `Concurrent update ${i}` },
          `concurrent-user-${i}`
        );
        currentDoc = version.document;
      }

      // Validate final state
      const history = await versioningService.getVersionHistory(testSOPDocument.id);
      expect(history.versions.length).toBe(5);
    });

    it('should maintain data integrity across operations', async () => {
      // Create a series of operations
      const feedback: FeedbackRequest = {
        id: 'integrity-feedback',
        sopId: testSOPDocument.id,
        userId: 'integrity-user',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'Integrity test update',
          changeType: ChangeType.UPDATE,
          suggestedText: 'Updated for integrity testing'
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      // Process feedback and create version
      const result = await feedbackProcessor.processFeedback(feedback, testSOPDocument);
      const version = await versioningService.createVersion(
        testSOPDocument,
        result.changes,
        { changeReason: 'Integrity test' },
        'integrity-user'
      );

      // Create restore point
      const restorePoint = await versioningService.createRestorePoint(
        testSOPDocument.id,
        version.version,
        { reason: 'Integrity checkpoint', createdBy: 'integrity-user' }
      );

      // Verify data consistency
      const retrievedVersion = await versioningService.getVersion(
        testSOPDocument.id,
        version.version
      );
      
      expect(retrievedVersion).not.toBeNull();
      expect(retrievedVersion?.id).toBe(version.id);
      expect(retrievedVersion?.checksum).toBe(version.checksum);

      // Verify restore point integrity
      const restorePoints = await versioningService.getRestorePoints(testSOPDocument.id);
      const foundRestorePoint = restorePoints.find(rp => rp.id === restorePoint.id);
      
      expect(foundRestorePoint).toBeDefined();
      expect(foundRestorePoint?.documentSnapshot.id).toBe(version.document.id);
    });
  });
});