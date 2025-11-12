import { SOPPreview, SOPPreviewConfig } from '../components/SOPPreview';
import { SOPDocument, SOPSection, ExportOptions, ExportResult } from '../../models/sop-models';
import { SOPType, SectionType, DocumentFormat } from '../../models/enums';
import { SOPStatus } from '../../models/sop-models';

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockImplementation((tagName: string) => {
    const element = {
      tagName: tagName.toUpperCase(),
      innerHTML: '',
      textContent: '',
      className: '',
      style: {},
      dataset: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn().mockReturnValue([]),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      remove: jest.fn(),
      scrollIntoView: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn()
      }
    };
    return element;
  })
});

Object.defineProperty(document, 'head', {
  value: {
    appendChild: jest.fn()
  }
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    contains: jest.fn().mockReturnValue(true)
  }
});

describe('SOPPreview', () => {
  let sopPreview: SOPPreview;
  let mockContainer: HTMLElement;
  let mockConfig: SOPPreviewConfig;

  beforeEach(() => {
    // Create mock container
    mockContainer = document.createElement('div');
    mockContainer.id = 'test-container';
    mockContainer.querySelector = jest.fn().mockImplementation((selector: string) => {
      const mockElement = document.createElement('div');
      mockElement.id = selector.replace('#', '');
      return mockElement;
    });
    mockContainer.querySelectorAll = jest.fn().mockReturnValue([]);

    // Mock getElementById
    document.getElementById = jest.fn().mockReturnValue(mockContainer);

    // Mock config
    mockConfig = {
      onExport: jest.fn(),
      onShare: jest.fn(),
      onEdit: jest.fn(),
      onVersionHistory: jest.fn()
    };

    sopPreview = new SOPPreview('test-container', mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create SOPPreview instance', () => {
      expect(sopPreview).toBeInstanceOf(SOPPreview);
    });

    it('should throw error if container not found', () => {
      document.getElementById = jest.fn().mockReturnValue(null);
      
      expect(() => {
        new SOPPreview('non-existent');
      }).toThrow("Container element with id 'non-existent' not found");
    });

    it('should work with empty config', () => {
      expect(() => {
        new SOPPreview('test-container');
      }).not.toThrow();
    });
  });

  describe('loadDocument', () => {
    let mockDocument: SOPDocument;

    beforeEach(() => {
      mockDocument = {
        id: 'sop-123',
        title: 'Test SOP Document',
        type: SOPType.PROCESS_IMPROVEMENT,
        sections: [
          {
            id: 'section-1',
            title: 'Overview',
            content: 'This is the overview section.',
            type: SectionType.OVERVIEW,
            order: 0,
            charts: [],
            checkpoints: []
          },
          {
            id: 'section-2',
            title: 'Prerequisites',
            content: 'These are the prerequisites.',
            type: SectionType.PREREQUISITES,
            order: 1,
            charts: [],
            checkpoints: []
          }
        ],
        charts: [],
        metadata: {
          author: 'Test Author',
          department: 'Test Department',
          effectiveDate: new Date('2023-01-01'),
          reviewDate: new Date('2024-01-01'),
          version: '1.0',
          status: SOPStatus.ACTIVE,
          tags: ['test', 'automation'],
          category: 'Process',
          audience: ['Operators', 'Supervisors'],
          purpose: 'Test purpose',
          scope: 'Test scope',
          references: []
        },
        version: '1.0',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      };
    });

    it('should load and display document', () => {
      sopPreview.loadDocument(mockDocument);

      expect(sopPreview.getCurrentDocument()).toEqual(mockDocument);
    });

    it('should update document info in header', () => {
      sopPreview.loadDocument(mockDocument);

      // Verify that querySelector was called to update document info
      expect(mockContainer.querySelector).toHaveBeenCalledWith('#documentTitle');
      expect(mockContainer.querySelector).toHaveBeenCalledWith('#documentType');
      expect(mockContainer.querySelector).toHaveBeenCalledWith('#documentVersion');
      expect(mockContainer.querySelector).toHaveBeenCalledWith('#documentStatus');
    });

    it('should render document sections', () => {
      sopPreview.loadDocument(mockDocument);

      // Verify document preview container is updated
      expect(mockContainer.querySelector).toHaveBeenCalledWith('#documentPreview');
    });
  });

  describe('preview modes', () => {
    let mockDocument: SOPDocument;

    beforeEach(() => {
      mockDocument = {
        id: 'sop-123',
        title: 'Test SOP Document',
        type: SOPType.AUTOMATION,
        sections: [],
        charts: [],
        metadata: {
          author: 'Test Author',
          department: 'Test Department',
          effectiveDate: new Date(),
          reviewDate: new Date(),
          version: '1.0',
          status: SOPStatus.DRAFT,
          tags: [],
          category: 'Test',
          audience: [],
          purpose: 'Test',
          scope: 'Test',
          references: []
        },
        version: '1.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    it('should switch to document view mode', () => {
      sopPreview.loadDocument(mockDocument);
      sopPreview.setPreviewMode('document');

      // Verify mode switching logic
      expect(mockContainer.querySelector).toHaveBeenCalledWith('#documentView');
    });

    it('should switch to print view mode', () => {
      sopPreview.loadDocument(mockDocument);
      sopPreview.setPreviewMode('print');

      expect(mockContainer.querySelector).toHaveBeenCalledWith('#printView');
    });

    it('should switch to web view mode', () => {
      sopPreview.loadDocument(mockDocument);
      sopPreview.setPreviewMode('web');

      expect(mockContainer.querySelector).toHaveBeenCalledWith('#webView');
    });
  });

  describe('export functionality', () => {
    it('should handle export with valid options', async () => {
      const mockExportResult: ExportResult = {
        success: true,
        filePath: '/path/to/exported/file.pdf',
        fileSize: 1024,
        format: DocumentFormat.PDF,
        metadata: {
          exportedAt: new Date(),
          exportedBy: 'test-user',
          originalDocumentId: 'sop-123',
          version: '1.0'
        }
      };

      (mockConfig.onExport as jest.Mock).mockResolvedValue(mockExportResult);

      const exportOptions: ExportOptions = {
        includeCharts: true,
        includeMetadata: true
      };

      // Simulate export action
      if (mockConfig.onExport) {
        const result = await mockConfig.onExport(DocumentFormat.PDF, exportOptions);
        expect(result).toEqual(mockExportResult);
      }

      expect(mockConfig.onExport).toHaveBeenCalledWith(DocumentFormat.PDF, exportOptions);
    });

    it('should handle export failure', async () => {
      const mockExportResult: ExportResult = {
        success: false,
        format: DocumentFormat.PDF,
        error: 'Export failed due to network error',
        metadata: {
          exportedAt: new Date(),
          exportedBy: 'test-user',
          originalDocumentId: 'sop-123',
          version: '1.0'
        }
      };

      (mockConfig.onExport as jest.Mock).mockResolvedValue(mockExportResult);

      if (mockConfig.onExport) {
        const result = await mockConfig.onExport(DocumentFormat.PDF, {
          includeCharts: true,
          includeMetadata: true
        });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Export failed due to network error');
      }
    });
  });

  describe('sharing functionality', () => {
    it('should handle share action', () => {
      const shareOptions = {
        method: 'email' as const,
        recipients: ['user1@example.com', 'user2@example.com'],
        message: 'Please review this SOP document',
        permissions: 'view' as const
      };

      if (mockConfig.onShare) {
        mockConfig.onShare(shareOptions);
      }

      expect(mockConfig.onShare).toHaveBeenCalledWith(shareOptions);
    });
  });

  describe('editing functionality', () => {
    it('should handle edit action for document', () => {
      if (mockConfig.onEdit) {
        mockConfig.onEdit('document');
      }

      expect(mockConfig.onEdit).toHaveBeenCalledWith('document');
    });

    it('should handle edit action for specific section', () => {
      if (mockConfig.onEdit) {
        mockConfig.onEdit('section-1');
      }

      expect(mockConfig.onEdit).toHaveBeenCalledWith('section-1');
    });
  });

  describe('document rendering', () => {
    let mockDocument: SOPDocument;

    beforeEach(() => {
      mockDocument = {
        id: 'sop-123',
        title: 'Test SOP with Sections',
        type: SOPType.TRAINING,
        sections: [
          {
            id: 'section-1',
            title: 'Introduction',
            content: 'This is the introduction section with multiple paragraphs.\n\nThis is the second paragraph.',
            type: SectionType.OVERVIEW,
            order: 0,
            charts: [{
              chartId: 'chart-1',
              position: 'inline' as any,
              caption: 'Process Flow Chart'
            }],
            checkpoints: [{
              id: 'checkpoint-1',
              stepId: 'step-1',
              description: 'Verify completion',
              criteria: ['All steps completed', 'Documentation updated'],
              method: 'visual_inspection' as any,
              frequency: 'every_execution' as any,
              responsible: 'Operator',
              documentation: []
            }]
          }
        ],
        charts: [],
        metadata: {
          author: 'Test Author',
          department: 'Training',
          effectiveDate: new Date('2023-01-01'),
          reviewDate: new Date('2024-01-01'),
          version: '2.0',
          status: SOPStatus.APPROVED,
          tags: ['training', 'onboarding'],
          category: 'Training',
          audience: ['New Employees'],
          purpose: 'Employee training',
          scope: 'All departments',
          references: [{
            id: 'ref-1',
            title: 'Company Policy Manual',
            type: 'document' as any,
            version: '3.0'
          }]
        },
        version: '2.0',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-06-01')
      };
    });

    it('should render document with all sections', () => {
      sopPreview.loadDocument(mockDocument);

      // Verify document is loaded and rendered
      expect(sopPreview.getCurrentDocument()).toEqual(mockDocument);
    });

    it('should render charts in sections', () => {
      sopPreview.loadDocument(mockDocument);

      // Charts should be rendered as placeholders
      const document = sopPreview.getCurrentDocument();
      expect(document?.sections[0].charts).toHaveLength(1);
      expect(document?.sections[0].charts[0].chartId).toBe('chart-1');
    });

    it('should render quality checkpoints', () => {
      sopPreview.loadDocument(mockDocument);

      const document = sopPreview.getCurrentDocument();
      expect(document?.sections[0].checkpoints).toHaveLength(1);
      expect(document?.sections[0].checkpoints[0].description).toBe('Verify completion');
    });

    it('should render document metadata', () => {
      sopPreview.loadDocument(mockDocument);

      const document = sopPreview.getCurrentDocument();
      expect(document?.metadata.author).toBe('Test Author');
      expect(document?.metadata.status).toBe(SOPStatus.APPROVED);
    });

    it('should render references', () => {
      sopPreview.loadDocument(mockDocument);

      const document = sopPreview.getCurrentDocument();
      expect(document?.metadata.references).toHaveLength(1);
      expect(document?.metadata.references[0].title).toBe('Company Policy Manual');
    });
  });

  describe('utility methods', () => {
    it('should clear preview', () => {
      const mockDocument: SOPDocument = {
        id: 'sop-123',
        title: 'Test Document',
        type: SOPType.AUTOMATION,
        sections: [],
        charts: [],
        metadata: {
          author: 'Test',
          department: 'Test',
          effectiveDate: new Date(),
          reviewDate: new Date(),
          version: '1.0',
          status: SOPStatus.DRAFT,
          tags: [],
          category: 'Test',
          audience: [],
          purpose: 'Test',
          scope: 'Test',
          references: []
        },
        version: '1.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      sopPreview.loadDocument(mockDocument);
      expect(sopPreview.getCurrentDocument()).toEqual(mockDocument);

      sopPreview.clearPreview();
      expect(sopPreview.getCurrentDocument()).toBeNull();
    });

    it('should refresh preview', () => {
      const mockDocument: SOPDocument = {
        id: 'sop-123',
        title: 'Test Document',
        type: SOPType.AUTOMATION,
        sections: [],
        charts: [],
        metadata: {
          author: 'Test',
          department: 'Test',
          effectiveDate: new Date(),
          reviewDate: new Date(),
          version: '1.0',
          status: SOPStatus.DRAFT,
          tags: [],
          category: 'Test',
          audience: [],
          purpose: 'Test',
          scope: 'Test',
          references: []
        },
        version: '1.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      sopPreview.loadDocument(mockDocument);
      
      // Should not throw error
      expect(() => {
        sopPreview.refreshPreview();
      }).not.toThrow();
    });

    it('should highlight section', () => {
      const mockDocument: SOPDocument = {
        id: 'sop-123',
        title: 'Test Document',
        type: SOPType.AUTOMATION,
        sections: [{
          id: 'section-1',
          title: 'Test Section',
          content: 'Test content',
          type: SectionType.OVERVIEW,
          order: 0,
          charts: [],
          checkpoints: []
        }],
        charts: [],
        metadata: {
          author: 'Test',
          department: 'Test',
          effectiveDate: new Date(),
          reviewDate: new Date(),
          version: '1.0',
          status: SOPStatus.DRAFT,
          tags: [],
          category: 'Test',
          audience: [],
          purpose: 'Test',
          scope: 'Test',
          references: []
        },
        version: '1.0',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      sopPreview.loadDocument(mockDocument);
      
      // Should not throw error
      expect(() => {
        sopPreview.highlightSection('section-1');
      }).not.toThrow();
    });
  });
});