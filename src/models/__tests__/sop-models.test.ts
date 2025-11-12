import {
  SOPDocument,
  SOPSection,
  SOPMetadata,
  QualityCheckpoint,
  SOPReference,
  ChartReference,
  ExportOptions,
  validateSOPDocument,
  validateSOPSection,
  validateSOPMetadata,
  validateQualityCheckpoint,
  validateSOPReference,
  validateChartReference,
  validateExportOptions,
  transformWorkflowToSOP,
  transformWorkflowStepsToSections,
  serializeSOPDocument,
  deserializeSOPDocument,
  serializeSOPSection,
  deserializeSOPSection,
  SOPStatus,
  CheckpointMethod,
  CheckpointFrequency,
  ChartPosition,
  ChartSize,
  ReferenceType
} from '../sop-models';
import { SOPType, SectionType } from '../enums';

describe('SOP Models Validation', () => {
  describe('validateSOPDocument', () => {
    it('should validate a valid SOP document', () => {
      const metadata: SOPMetadata = {
        author: 'Test Author',
        department: 'Test Department',
        effectiveDate: new Date(),
        reviewDate: new Date(),
        version: '1.0',
        status: SOPStatus.DRAFT,
        tags: ['test'],
        category: 'Test',
        audience: ['General Users'],
        purpose: 'Test purpose',
        scope: 'Test scope',
        references: []
      };

      const section: SOPSection = {
        id: 'section-1',
        title: 'Test Section',
        content: 'Test content',
        type: SectionType.OVERVIEW,
        order: 1,
        charts: [],
        checkpoints: []
      };

      const sop: SOPDocument = {
        id: 'sop-123',
        title: 'Test SOP',
        type: SOPType.AUTOMATION,
        sections: [section],
        charts: [],
        metadata: metadata,
        version: '1.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(validateSOPDocument(sop)).toBe(true);
    });

    it('should reject SOP with missing required fields', () => {
      const sop = {
        title: 'Test SOP',
        type: SOPType.AUTOMATION,
        sections: [],
        charts: []
      } as unknown as SOPDocument;

      expect(validateSOPDocument(sop)).toBe(false);
    });

    it('should reject SOP with empty sections array', () => {
      const metadata: SOPMetadata = {
        author: 'Test Author',
        department: 'Test Department',
        effectiveDate: new Date(),
        reviewDate: new Date(),
        version: '1.0',
        status: SOPStatus.DRAFT,
        tags: ['test'],
        category: 'Test',
        audience: ['General Users'],
        purpose: 'Test purpose',
        scope: 'Test scope',
        references: []
      };

      const sop: SOPDocument = {
        id: 'sop-123',
        title: 'Test SOP',
        type: SOPType.AUTOMATION,
        sections: [],
        charts: [],
        metadata: metadata,
        version: '1.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(validateSOPDocument(sop)).toBe(false);
    });
  });

  describe('validateSOPSection', () => {
    it('should validate a valid SOP section', () => {
      const section: SOPSection = {
        id: 'section-1',
        title: 'Test Section',
        content: 'Test content',
        type: SectionType.OVERVIEW,
        order: 1,
        charts: [],
        checkpoints: []
      };

      expect(validateSOPSection(section)).toBe(true);
    });

    it('should reject section with negative order', () => {
      const section: SOPSection = {
        id: 'section-1',
        title: 'Test Section',
        content: 'Test content',
        type: SectionType.OVERVIEW,
        order: -1,
        charts: [],
        checkpoints: []
      };

      expect(validateSOPSection(section)).toBe(false);
    });
  });

  describe('validateQualityCheckpoint', () => {
    it('should validate a valid quality checkpoint', () => {
      const checkpoint: QualityCheckpoint = {
        id: 'checkpoint-1',
        stepId: 'step-1',
        description: 'Test checkpoint',
        criteria: ['Criterion 1', 'Criterion 2'],
        method: CheckpointMethod.VISUAL_INSPECTION,
        frequency: CheckpointFrequency.EVERY_EXECUTION,
        responsible: 'Process Owner',
        documentation: []
      };

      expect(validateQualityCheckpoint(checkpoint)).toBe(true);
    });

    it('should reject checkpoint with empty criteria', () => {
      const checkpoint: QualityCheckpoint = {
        id: 'checkpoint-1',
        stepId: 'step-1',
        description: 'Test checkpoint',
        criteria: [],
        method: CheckpointMethod.VISUAL_INSPECTION,
        frequency: CheckpointFrequency.EVERY_EXECUTION,
        responsible: 'Process Owner',
        documentation: []
      };

      expect(validateQualityCheckpoint(checkpoint)).toBe(false);
    });
  });

  describe('validateSOPReference', () => {
    it('should validate a valid SOP reference', () => {
      const reference: SOPReference = {
        id: 'ref-1',
        title: 'Test Reference',
        type: ReferenceType.DOCUMENT,
        url: 'https://example.com',
        version: '1.0'
      };

      expect(validateSOPReference(reference)).toBe(true);
    });

    it('should reject reference with missing title', () => {
      const reference = {
        id: 'ref-1',
        type: ReferenceType.DOCUMENT
      } as unknown as SOPReference;

      expect(validateSOPReference(reference)).toBe(false);
    });
  });

  describe('validateChartReference', () => {
    it('should validate a valid chart reference', () => {
      const chartRef: ChartReference = {
        chartId: 'chart-1',
        position: ChartPosition.INLINE,
        caption: 'Test chart',
        size: ChartSize.MEDIUM
      };

      expect(validateChartReference(chartRef)).toBe(true);
    });

    it('should reject chart reference with missing chartId', () => {
      const chartRef = {
        position: ChartPosition.INLINE
      } as unknown as ChartReference;

      expect(validateChartReference(chartRef)).toBe(false);
    });
  });

  describe('validateExportOptions', () => {
    it('should validate valid export options', () => {
      const options: ExportOptions = {
        includeCharts: true,
        includeMetadata: false,
        template: 'standard'
      };

      expect(validateExportOptions(options)).toBe(true);
    });
  });
});

describe('SOP Data Transformation', () => {
  describe('transformWorkflowToSOP', () => {
    it('should transform workflow to SOP document', () => {
      const workflow = {
        id: 'workflow-123',
        title: 'Test Workflow',
        description: 'Test workflow description',
        steps: [
          {
            id: 'step-1',
            title: 'Step 1',
            description: 'First step',
            instructions: ['Do this', 'Do that'],
            prerequisites: ['Prerequisite 1']
          }
        ],
        metadata: {
          author: 'Test Author',
          category: 'Test Category',
          tags: ['test', 'workflow']
        }
      };

      const sop = transformWorkflowToSOP(workflow, SOPType.AUTOMATION);

      expect(sop.title).toBe('Test Workflow');
      expect(sop.type).toBe(SOPType.AUTOMATION);
      expect(sop.metadata?.author).toBe('Test Author');
      expect(sop.sections).toBeDefined();
      expect(sop.sections!.length).toBeGreaterThan(0);
    });

    it('should handle workflow with minimal data', () => {
      const workflow = {
        id: 'workflow-123'
      };

      const sop = transformWorkflowToSOP(workflow, SOPType.TRAINING);

      expect(sop.title).toBe('Generated SOP');
      expect(sop.type).toBe(SOPType.TRAINING);
      expect(sop.metadata?.author).toBe('AI Voice SOP Agent');
    });
  });

  describe('transformWorkflowStepsToSections', () => {
    it('should transform workflow steps to SOP sections', () => {
      const steps = [
        {
          id: 'step-1',
          title: 'Step 1',
          description: 'First step',
          instructions: ['Do this', 'Do that'],
          prerequisites: ['Prerequisite 1'],
          qualityChecks: [
            {
              description: 'Check quality',
              criteria: ['Criterion 1']
            }
          ]
        }
      ];

      const sections = transformWorkflowStepsToSections(steps);

      expect(sections.length).toBeGreaterThan(0);
      expect(sections.find(s => s.type === SectionType.OVERVIEW)).toBeDefined();
      expect(sections.find(s => s.type === SectionType.PREREQUISITES)).toBeDefined();
      expect(sections.find(s => s.type === SectionType.STEPS)).toBeDefined();
    });

    it('should handle empty steps array', () => {
      const sections = transformWorkflowStepsToSections([]);

      expect(sections.length).toBeGreaterThan(0);
      expect(sections.find(s => s.type === SectionType.OVERVIEW)).toBeDefined();
    });
  });
});

describe('SOP Serialization', () => {
  describe('serializeSOPDocument and deserializeSOPDocument', () => {
    it('should serialize and deserialize SOP document correctly', () => {
      const metadata: SOPMetadata = {
        author: 'Test Author',
        department: 'Test Department',
        effectiveDate: new Date('2023-01-01'),
        reviewDate: new Date('2024-01-01'),
        version: '1.0',
        status: SOPStatus.DRAFT,
        tags: ['test'],
        category: 'Test',
        audience: ['General Users'],
        purpose: 'Test purpose',
        scope: 'Test scope',
        references: []
      };

      const section: SOPSection = {
        id: 'section-1',
        title: 'Test Section',
        content: 'Test content',
        type: SectionType.OVERVIEW,
        order: 1,
        charts: [],
        checkpoints: []
      };

      const originalSOP: SOPDocument = {
        id: 'sop-123',
        title: 'Test SOP',
        type: SOPType.AUTOMATION,
        sections: [section],
        charts: [],
        metadata: metadata,
        version: '1.0',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      };

      const serialized = serializeSOPDocument(originalSOP);
      const deserialized = deserializeSOPDocument(serialized);

      expect(deserialized.id).toBe(originalSOP.id);
      expect(deserialized.title).toBe(originalSOP.title);
      expect(deserialized.type).toBe(originalSOP.type);
      expect(deserialized.sections.length).toBe(originalSOP.sections.length);
    });

    it('should throw error for invalid SOP document during deserialization', () => {
      const invalidData = '{"id": "test"}';

      expect(() => deserializeSOPDocument(invalidData)).toThrow();
    });
  });

  describe('serializeSOPSection and deserializeSOPSection', () => {
    it('should serialize and deserialize SOP section correctly', () => {
      const originalSection: SOPSection = {
        id: 'section-1',
        title: 'Test Section',
        content: 'Test content',
        type: SectionType.OVERVIEW,
        order: 1,
        charts: [],
        checkpoints: []
      };

      const serialized = serializeSOPSection(originalSection);
      const deserialized = deserializeSOPSection(serialized);

      expect(deserialized.id).toBe(originalSection.id);
      expect(deserialized.title).toBe(originalSection.title);
      expect(deserialized.content).toBe(originalSection.content);
      expect(deserialized.type).toBe(originalSection.type);
    });

    it('should throw error for invalid section during deserialization', () => {
      const invalidData = '{"id": "test"}';

      expect(() => deserializeSOPSection(invalidData)).toThrow();
    });
  });
});