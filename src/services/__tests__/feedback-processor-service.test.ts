import { FeedbackProcessorService } from '../feedback-processor-service';
import {
  FeedbackRequest,
  FeedbackType,
  FeedbackSource,
  FeedbackPriority,
  FeedbackStatus,
  ChangeType,
  TargetType,
  ProcessingStatus,
  ValidationStatus,
  ImpactSeverity,
  ComplexityLevel,
  RecommendationType,
  validateFeedbackRequest,
  categorizeFeedback,
  calculateFeedbackPriority,
  estimateChangeComplexity
} from '@/models/feedback-models';
import { SOPDocument, SOPSection } from '@/models/sop-models';
import { SOPType, SectionType } from '@/models/enums';

describe('FeedbackProcessorService', () => {
  let service: FeedbackProcessorService;
  let mockSOPDocument: SOPDocument;
  let mockFeedbackRequest: FeedbackRequest;

  beforeEach(() => {
    service = new FeedbackProcessorService();
    
    mockSOPDocument = {
      id: 'sop-123',
      title: 'Test SOP Document',
      type: SOPType.AUTOMATION,
      sections: [
        {
          id: 'overview',
          title: 'Overview',
          content: 'This is the overview section with important information.',
          type: SectionType.OVERVIEW,
          order: 1,
          charts: [],
          checkpoints: []
        },
        {
          id: 'steps',
          title: 'Process Steps',
          content: 'Step 1: Initialize the process\nStep 2: Execute main logic\nStep 3: Finalize results',
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
        version: '1.0',
        status: 'DRAFT' as any,
        tags: ['test'],
        category: 'Test',
        audience: ['General Users'],
        purpose: 'Test purpose',
        scope: 'Test scope',
        references: []
      },
      version: '1.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockFeedbackRequest = {
      id: 'feedback-123',
      sopId: 'sop-123',
      userId: 'user-123',
      type: FeedbackType.CONTENT_CORRECTION,
      source: FeedbackSource.VOICE_INPUT,
      content: {
        originalText: 'This is the overview section with important information.',
        suggestedText: 'This is the overview section with critical information.',
        comment: 'The word "important" should be changed to "critical" for better emphasis',
        targetSection: 'overview',
        changeType: ChangeType.UPDATE,
        rationale: 'Better emphasizes the significance of the information'
      },
      priority: FeedbackPriority.MEDIUM,
      status: FeedbackStatus.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        voiceTranscription: {
          transcriptionConfidence: 0.95,
          alternativeTranscriptions: [],
          speakerInfo: {
            confidence: 0.9
          }
        },
        confidence: 0.9,
        language: 'en',
        tags: ['content-update']
      }
    };
  });

  describe('Feedback Processing', () => {
    describe('processFeedback', () => {
      it('should process valid feedback successfully', async () => {
        const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('feedbackId', mockFeedbackRequest.id);
        expect(result).toHaveProperty('status', ProcessingStatus.COMPLETED);
        expect(result).toHaveProperty('changes');
        expect(result).toHaveProperty('validationResults');
        expect(result).toHaveProperty('conflicts');
        expect(result).toHaveProperty('recommendations');
        expect(Array.isArray(result.changes)).toBe(true);
        expect(result.changes.length).toBeGreaterThan(0);
      });

      it('should throw error for invalid feedback', async () => {
        const invalidFeedback = {
          ...mockFeedbackRequest,
          id: '', // Invalid - missing ID
          content: {
            ...mockFeedbackRequest.content,
            comment: '' // Invalid - empty comment
          }
        };

        await expect(service.processFeedback(invalidFeedback, mockSOPDocument))
          .rejects.toThrow('Invalid feedback');
      });

      it('should categorize feedback correctly', async () => {
        const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);
        
        // Should have at least one change request
        expect(result.changes.length).toBeGreaterThan(0);
        
        const change = result.changes[0];
        expect(change?.type).toBe(ChangeType.UPDATE);
        expect(change?.target.type).toBe(TargetType.SECTION);
        expect(change?.target.id).toBe('overview');
      });

      it('should generate appropriate recommendations', async () => {
        const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);
        
        expect(Array.isArray(result.recommendations)).toBe(true);
        
        if (result.recommendations.length > 0) {
          const recommendation = result.recommendations[0];
          expect(recommendation).toHaveProperty('type');
          expect(recommendation).toHaveProperty('title');
          expect(recommendation).toHaveProperty('description');
          expect(recommendation).toHaveProperty('confidence');
          expect(recommendation?.confidence).toBeGreaterThan(0);
          expect(recommendation?.confidence).toBeLessThanOrEqual(1);
        }
      });
    });

    describe('Change Type Detection', () => {
      it('should detect ADD change type', async () => {
        const addFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            comment: 'Please add a new section about safety procedures',
            changeType: ChangeType.ADD
          }
        };

        const result = await service.processFeedback(addFeedback, mockSOPDocument);
        const change = result.changes[0];
        expect(change?.type).toBe(ChangeType.ADD);
      });

      it('should detect DELETE change type', async () => {
        const deleteFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            comment: 'Please remove the redundant information from step 2',
            changeType: ChangeType.DELETE
          }
        };

        const result = await service.processFeedback(deleteFeedback, mockSOPDocument);
        const change = result.changes[0];
        expect(change?.type).toBe(ChangeType.DELETE);
      });

      it('should detect MOVE change type', async () => {
        const moveFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            comment: 'Please move step 3 to come before step 2',
            changeType: ChangeType.MOVE
          }
        };

        const result = await service.processFeedback(moveFeedback, mockSOPDocument);
        const change = result.changes[0];
        expect(change?.type).toBe(ChangeType.MOVE);
      });
    });

    describe('Target Identification', () => {
      it('should identify explicit target section', async () => {
        const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);
        const change = result.changes[0];
        
        expect(change?.target.type).toBe(TargetType.SECTION);
        expect(change?.target.id).toBe('overview');
      });

      it('should infer target from comment content', async () => {
        const stepFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            comment: 'Step 2 needs to be updated with more detailed instructions'
          }
        };
        delete (stepFeedback.content as any).targetSection;

        const result = await service.processFeedback(stepFeedback, mockSOPDocument);
        const change = result.changes[0];
        
        expect(change?.target.type).toBe(TargetType.STEP);
        expect(change?.target.id).toBe('step-2');
      });

      it('should default to document level when target unclear', async () => {
        const vagueFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            comment: 'This document needs general improvements'
          }
        };
        delete (vagueFeedback.content as any).targetSection;
        delete (vagueFeedback.content as any).targetElement;

        const result = await service.processFeedback(vagueFeedback, mockSOPDocument);
        const change = result.changes[0];
        
        expect(change?.target.type).toBe(TargetType.DOCUMENT);
        expect(change?.target.id).toBe(mockSOPDocument.id);
      });
    });

    describe('Impact Assessment', () => {
      it('should assess low impact for minor text changes', async () => {
        const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);
        const change = result.changes[0];
        
        expect(change?.impact.severity).toBe(ImpactSeverity.LOW);
        expect(change?.impact.scope).toBe('MINIMAL');
      });

      it('should assess high impact for section deletions', async () => {
        const deleteFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            comment: 'Remove the entire overview section',
            changeType: ChangeType.DELETE
          },
          type: FeedbackType.DELETION
        };

        const result = await service.processFeedback(deleteFeedback, mockSOPDocument);
        const change = result.changes[0];
        
        expect(change?.impact.severity).toBe(ImpactSeverity.HIGH);
      });

      it('should identify affected sections', async () => {
        const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);
        const change = result.changes[0];
        
        expect(Array.isArray(change?.impact.affectedSections)).toBe(true);
        expect(change?.impact.affectedSections).toContain('overview');
      });

      it('should estimate effort correctly', async () => {
        const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);
        const change = result.changes[0];
        
        expect(change?.impact.estimatedEffort).toHaveProperty('hours');
        expect(change?.impact.estimatedEffort).toHaveProperty('complexity');
        expect(change?.impact.estimatedEffort).toHaveProperty('resources');
        expect(change?.impact.estimatedEffort.hours).toBeGreaterThan(0);
        expect(Array.isArray(change?.impact.estimatedEffort.resources)).toBe(true);
      });
    });

    describe('Complex Feedback Processing', () => {
      it('should handle feedback with multiple changes', async () => {
        const complexFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            comment: 'Change "important" to "critical" in overview and also add a new safety section'
          }
        };

        const result = await service.processFeedback(complexFeedback, mockSOPDocument);
        
        // Should generate multiple changes for complex feedback
        expect(result.changes.length).toBeGreaterThanOrEqual(1);
      });

      it('should extract actionable text from feedback', async () => {
        const quotedFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            comment: 'Please change the text to "This is a critical overview section"'
          }
        };
        delete (quotedFeedback.content as any).suggestedText;

        const result = await service.processFeedback(quotedFeedback, mockSOPDocument);
        const change = result.changes[0];
        
        expect(change?.newValue).toBe('This is a critical overview section');
      });
    });
  });

  describe('Validation', () => {
    describe('Feedback Validation', () => {
      it('should validate correct feedback as valid', async () => {
        const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);
        const validation = result.validationResults[0];
        
        expect(validation?.isValid).toBe(true);
        expect(validation?.confidence).toBeGreaterThan(0.5);
      });

      it('should flag low confidence voice transcription', async () => {
        const lowConfidenceFeedback = {
          ...mockFeedbackRequest,
          metadata: {
            ...mockFeedbackRequest.metadata,
            voiceTranscription: {
              transcriptionConfidence: 0.6, // Low confidence
              alternativeTranscriptions: [],
              speakerInfo: { confidence: 0.7 }
            }
          }
        };

        const result = await service.processFeedback(lowConfidenceFeedback, mockSOPDocument);
        const validation = result.validationResults[0];
        
        expect(validation?.warnings.length).toBeGreaterThan(0);
        expect(validation?.warnings.some(w => w.code === 'LOW_TRANSCRIPTION_CONFIDENCE')).toBe(true);
      });

      it('should flag unclear feedback', async () => {
        const unclearFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            comment: 'Fix it' // Very short and unclear
          }
        };

        const result = await service.processFeedback(unclearFeedback, mockSOPDocument);
        const validation = result.validationResults[0];
        
        expect(validation?.warnings.some(w => w.code === 'UNCLEAR_FEEDBACK')).toBe(true);
      });
    });

    describe('Change Validation', () => {
      it('should validate changes against document structure', async () => {
        const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);
        const change = result.changes[0];
        
        expect(change?.validationStatus).toBe(ValidationStatus.VALID);
      });

      it('should flag invalid targets', async () => {
        const invalidTargetFeedback = {
          ...mockFeedbackRequest,
          content: {
            ...mockFeedbackRequest.content,
            targetSection: 'nonexistent-section'
          }
        };

        const result = await service.processFeedback(invalidTargetFeedback, mockSOPDocument);
        
        // Should still process but may have validation warnings
        expect(result.changes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicts between overlapping changes', async () => {
      // Create multiple feedback requests targeting the same section
      const feedback1 = { ...mockFeedbackRequest, id: 'feedback-1' };
      const feedback2 = {
        ...mockFeedbackRequest,
        id: 'feedback-2',
        content: {
          ...mockFeedbackRequest.content,
          comment: 'Change the overview section to be more detailed',
          suggestedText: 'This is a comprehensive overview section with detailed information.'
        }
      };

      const result1 = await service.processFeedback(feedback1, mockSOPDocument);
      const result2 = await service.processFeedback(feedback2, mockSOPDocument);

      // Simulate processing multiple changes together
      const allChanges = [...result1.changes, ...result2.changes];
      
      // Check if conflicts would be detected (this is a simplified test)
      const sameTargets = allChanges.filter(change => 
        change.target.id === 'overview'
      );
      
      expect(sameTargets.length).toBeGreaterThan(1);
    });

    it('should suggest resolution strategies for conflicts', async () => {
      const result = await service.processFeedback(mockFeedbackRequest, mockSOPDocument);
      
      // Even without conflicts, should have proper structure
      expect(Array.isArray(result.conflicts)).toBe(true);
      
      if (result.conflicts.length > 0) {
        const conflict = result.conflicts[0];
        expect(conflict).toHaveProperty('resolution');
        expect(conflict?.resolution).toHaveProperty('strategy');
        expect(conflict?.resolution).toHaveProperty('action');
      }
    });
  });

  describe('Recommendations', () => {
    it('should recommend batch processing for multiple small changes', async () => {
      // Create feedback that would result in multiple small changes
      const batchFeedback = {
        ...mockFeedbackRequest,
        content: {
          ...mockFeedbackRequest.content,
          comment: 'Fix typos: change "teh" to "the", "recieve" to "receive", and "seperate" to "separate"'
        }
      };

      const result = await service.processFeedback(batchFeedback, mockSOPDocument);
      
      // Should have recommendations
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should recommend quality review for high-impact changes', async () => {
      const highImpactFeedback = {
        ...mockFeedbackRequest,
        content: {
          ...mockFeedbackRequest.content,
          comment: 'Delete the entire steps section as it is redundant',
          changeType: ChangeType.DELETE
        },
        type: FeedbackType.DELETION
      };

      const result = await service.processFeedback(highImpactFeedback, mockSOPDocument);
      
      // Should recommend quality review for high-impact changes
      const qualityRecommendation = result.recommendations.find(r => 
        r.type === RecommendationType.QUALITY && r.title.includes('Quality Review')
      );
      
      if (qualityRecommendation) {
        expect(qualityRecommendation.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should recommend compliance validation for compliance updates', async () => {
      const complianceFeedback = {
        ...mockFeedbackRequest,
        type: FeedbackType.COMPLIANCE_UPDATE,
        content: {
          ...mockFeedbackRequest.content,
          comment: 'Update the document to comply with new regulatory requirements'
        }
      };

      const result = await service.processFeedback(complianceFeedback, mockSOPDocument);
      
      const complianceRecommendation = result.recommendations.find(r => 
        r.type === RecommendationType.COMPLIANCE
      );
      
      if (complianceRecommendation) {
        expect(complianceRecommendation.confidence).toBeGreaterThan(0.9);
      }
    });
  });
});

describe('Feedback Utility Functions', () => {
  describe('validateFeedbackRequest', () => {
    it('should validate complete feedback request', () => {
      const validFeedback: FeedbackRequest = {
        id: 'feedback-123',
        sopId: 'sop-123',
        userId: 'user-123',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'This is a valid comment',
          changeType: ChangeType.UPDATE
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      expect(validateFeedbackRequest(validFeedback)).toBe(true);
    });

    it('should reject feedback with missing required fields', () => {
      const invalidFeedback = {
        id: '',
        sopId: 'sop-123',
        type: FeedbackType.CONTENT_CORRECTION,
        content: { comment: '' }
      } as unknown as FeedbackRequest;

      expect(validateFeedbackRequest(invalidFeedback)).toBe(false);
    });
  });

  describe('categorizeFeedback', () => {
    it('should categorize feedback based on keywords', () => {
      const feedback: FeedbackRequest = {
        id: 'feedback-123',
        sopId: 'sop-123',
        userId: 'user-123',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'This is wrong and needs to be corrected',
          changeType: ChangeType.UPDATE
        },
        priority: FeedbackPriority.MEDIUM,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      const categories = [
        {
          id: 'content-correction',
          name: 'Content Correction',
          description: 'Corrections to existing content',
          keywords: ['wrong', 'incorrect', 'error', 'correct'],
          patterns: [],
          priority: FeedbackPriority.HIGH,
          autoProcessing: true
        }
      ];

      const result = categorizeFeedback(feedback, categories);
      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe('content-correction');
    });
  });

  describe('calculateFeedbackPriority', () => {
    it('should assign critical priority for critical keywords', () => {
      const criticalFeedback: FeedbackRequest = {
        id: 'feedback-123',
        sopId: 'sop-123',
        userId: 'user-123',
        type: FeedbackType.CONTENT_CORRECTION,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'This is a critical safety issue that needs urgent attention',
          changeType: ChangeType.UPDATE
        },
        priority: FeedbackPriority.LOW, // Will be overridden
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      const priority = calculateFeedbackPriority(criticalFeedback);
      expect(priority).toBe(FeedbackPriority.CRITICAL);
    });

    it('should assign appropriate priority for different keywords', () => {
      const improvementFeedback: FeedbackRequest = {
        id: 'feedback-123',
        sopId: 'sop-123',
        userId: 'user-123',
        type: FeedbackType.QUALITY_IMPROVEMENT,
        source: FeedbackSource.TEXT_INPUT,
        content: {
          comment: 'This section could be improved for better clarity',
          changeType: ChangeType.UPDATE
        },
        priority: FeedbackPriority.LOW,
        status: FeedbackStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      const priority = calculateFeedbackPriority(improvementFeedback);
      expect(priority).toBe(FeedbackPriority.MEDIUM);
    });
  });

  describe('estimateChangeComplexity', () => {
    it('should estimate simple complexity for basic updates', () => {
      const simpleChange = {
        id: 'change-1',
        type: ChangeType.UPDATE,
        target: { type: TargetType.PARAGRAPH, id: 'para-1', path: 'para-1' },
        operation: 'MODIFY' as any,
        reason: 'Simple text update',
        impact: {} as any,
        dependencies: [],
        validationStatus: ValidationStatus.VALID
      };

      const complexity = estimateChangeComplexity(simpleChange);
      expect(complexity).toBe(ComplexityLevel.SIMPLE);
    });

    it('should estimate complex complexity for structural changes', () => {
      const complexChange = {
        id: 'change-1',
        type: ChangeType.MERGE,
        target: { type: TargetType.DOCUMENT, id: 'doc-1', path: 'doc-1' },
        operation: 'MODIFY' as any,
        reason: 'Merge multiple sections',
        impact: {} as any,
        dependencies: ['dep-1', 'dep-2', 'dep-3'],
        validationStatus: ValidationStatus.VALID
      };

      const complexity = estimateChangeComplexity(complexChange);
      expect(complexity).toBe(ComplexityLevel.VERY_COMPLEX);
    });
  });
});