import { DocumentExporterService } from '../document-exporter-service';
import { SOPDocument, DocumentFormat, ExportOptions, SOPType, SectionType, SOPStatus } from '@/models';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('DocumentExporterService', () => {
  let service: DocumentExporterService;
  let mockSOPDocument: SOPDocument;

  beforeEach(() => {
    service = new DocumentExporterService();
    
    // Create a comprehensive mock SOP document for testing
    mockSOPDocument = {
      id: 'test-sop-001',
      title: 'Test Standard Operating Procedure',
      type: SOPType.AUTOMATION,
      version: '1.0',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      sections: [
        {
          id: 'overview',
          title: 'Overview',
          content: 'This is a test SOP for automated processes.\n\nIt includes multiple paragraphs and formatting.',
          type: SectionType.OVERVIEW,
          order: 0,
          charts: [],
          checkpoints: [
            {
              id: 'cp-001',
              stepId: 'overview',
              description: 'Verify understanding of process overview',
              criteria: ['Process purpose is clear', 'Scope is defined'],
              method: 'visual_inspection' as any,
              frequency: 'every_execution' as any,
              responsible: 'Process Owner',
              documentation: ['Process checklist']
            }
          ]
        },
        {
          id: 'steps',
          title: 'Procedure Steps',
          content: '1. Initialize the system\n2. Configure parameters\n3. Execute automation\n4. Verify results',
          type: SectionType.STEPS,
          order: 1,
          charts: [
            {
              chartId: 'flowchart-001',
              position: 'inline' as any,
              caption: 'Process Flow Diagram',
              size: 'medium' as any
            }
          ],
          checkpoints: []
        }
      ],
      charts: [
        {
          id: 'flowchart-001',
          type: 'flowchart' as any,
          title: 'Process Flow',
          data: { nodes: [], edges: [] },
          styling: { 
            theme: 'professional' as any,
            colors: {
              primary: '#3498db',
              secondary: '#2ecc71',
              accent: '#e74c3c',
              background: '#ffffff',
              text: '#2c3e50',
              border: '#bdc3c7',
              success: '#27ae60',
              warning: '#f39c12',
              error: '#e74c3c'
            },
            fonts: {
              family: 'Arial',
              sizes: { title: 16, subtitle: 14, body: 12, caption: 10, label: 11 },
              weights: { normal: 400, bold: 700 }
            },
            layout: {
              spacing: 10,
              padding: 15,
              alignment: 'center' as any,
              orientation: 'vertical' as any,
              direction: 'top_to_bottom' as any
            },
            dimensions: { width: 800, height: 600, responsive: true }
          },
          exportFormats: ['svg' as any, 'png' as any],
          metadata: {
            title: 'Process Flow',
            description: 'Test chart',
            author: 'Test Author',
            version: '1.0',
            tags: ['test'],
            generatedAt: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      metadata: {
        author: 'Test Author',
        department: 'Quality Assurance',
        approver: 'QA Manager',
        effectiveDate: new Date('2024-02-01'),
        reviewDate: new Date('2025-02-01'),
        version: '1.0',
        status: SOPStatus.APPROVED,
        tags: ['automation', 'testing', 'quality'],
        category: 'Process Automation',
        audience: ['Operators', 'Supervisors'],
        purpose: 'To standardize automated process execution',
        scope: 'Applies to all automated processes in the QA department',
        references: [
          {
            id: 'ref-001',
            title: 'ISO 9001:2015',
            type: 'standard' as any,
            document: 'Quality Management Systems'
          }
        ]
      }
    };
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const exportDir = './exports';
      const files = await fs.readdir(exportDir);
      for (const file of files) {
        if (file.startsWith('Test_Standard_Operating_Procedure')) {
          await fs.unlink(path.join(exportDir, file));
        }
      }
    } catch (error) {
      // Directory might not exist, ignore
    }
  });

  describe('getSupportedFormats', () => {
    it('should return all supported document formats', () => {
      const formats = service.getSupportedFormats();
      
      expect(formats).toContain(DocumentFormat.PDF);
      expect(formats).toContain(DocumentFormat.DOCX);
      expect(formats).toContain(DocumentFormat.HTML);
      expect(formats).toContain(DocumentFormat.MARKDOWN);
      expect(formats.length).toBe(4);
    });
  });

  describe('validateForExport', () => {
    it('should validate a complete SOP document successfully', () => {
      const result = service.validateForExport(mockSOPDocument);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should identify missing title as validation error', () => {
      const invalidSOP = { ...mockSOPDocument, title: '' };
      const result = service.validateForExport(invalidSOP);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe('title');
      expect(result.errors[0]?.message).toContain('title is required');
    });

    it('should warn about empty sections', () => {
      const sopWithoutSections = { ...mockSOPDocument, sections: [] };
      const result = service.validateForExport(sopWithoutSections);
      
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.message).toContain('no sections');
    });
  });

  describe('generateMetadata', () => {
    it('should generate complete document metadata', () => {
      const metadata = service.generateMetadata(mockSOPDocument);
      
      expect(metadata.title).toBe(mockSOPDocument.title);
      expect(metadata.author).toBe(mockSOPDocument.metadata.author);
      expect(metadata.version).toBe(mockSOPDocument.version);
      expect(metadata.keywords).toContain('automation');
      expect(metadata.keywords).toContain('SOP');
      expect(metadata.description).toBe(mockSOPDocument.metadata.purpose);
    });

    it('should include unique keywords without duplicates', () => {
      const metadata = service.generateMetadata(mockSOPDocument);
      
      const uniqueKeywords = [...new Set(metadata.keywords)];
      expect(metadata.keywords.length).toBe(uniqueKeywords.length);
    });
  });

  describe('exportDocument', () => {
    describe('PDF export', () => {
      it('should export SOP to PDF format successfully', async () => {
        const result = await service.exportDocument(mockSOPDocument, DocumentFormat.PDF);
        
        expect(result.success).toBe(true);
        expect(result.format).toBe(DocumentFormat.PDF);
        expect(result.filePath).toMatch(/\.pdf$/);
        expect(result.fileSize).toBeGreaterThan(0);
        expect(result.metadata.checksum).toBeDefined();
        
        // Verify file exists
        const fileExists = await fs.access(result.filePath!).then(() => true).catch(() => false);
        expect(fileExists).toBe(true);
      });

      it('should include metadata in PDF export when option is enabled', async () => {
        const options: ExportOptions = {
          includeMetadata: true,
          includeCharts: false
        };
        
        const result = await service.exportDocument(mockSOPDocument, DocumentFormat.PDF, options);
        
        expect(result.success).toBe(true);
        expect(result.fileSize).toBeGreaterThan(1000); // Should be larger with metadata
      });
    });

    describe('DOCX export', () => {
      it('should export SOP to DOCX format successfully', async () => {
        const result = await service.exportDocument(mockSOPDocument, DocumentFormat.DOCX);
        
        expect(result.success).toBe(true);
        expect(result.format).toBe(DocumentFormat.DOCX);
        expect(result.filePath).toMatch(/\.docx$/);
        expect(result.fileSize).toBeGreaterThan(0);
        
        // Verify file exists
        const fileExists = await fs.access(result.filePath!).then(() => true).catch(() => false);
        expect(fileExists).toBe(true);
      });
    });

    describe('HTML export', () => {
      it('should export SOP to HTML format successfully', async () => {
        const result = await service.exportDocument(mockSOPDocument, DocumentFormat.HTML);
        
        expect(result.success).toBe(true);
        expect(result.format).toBe(DocumentFormat.HTML);
        expect(result.filePath).toMatch(/\.html$/);
        expect(result.fileSize).toBeGreaterThan(0);
        
        // Verify file content
        const content = await fs.readFile(result.filePath!, 'utf-8');
        expect(content).toContain('<!DOCTYPE html>');
        expect(content).toContain(mockSOPDocument.title);
        expect(content).toContain('Quality Checkpoints');
      });

      it('should include watermark when specified', async () => {
        const options: ExportOptions = {
          includeMetadata: true,
          includeCharts: false,
          watermark: 'CONFIDENTIAL'
        };
        
        const result = await service.exportDocument(mockSOPDocument, DocumentFormat.HTML, options);
        const content = await fs.readFile(result.filePath!, 'utf-8');
        
        expect(content).toContain('CONFIDENTIAL');
        expect(content).toContain('watermark');
      });

      it('should apply custom styling when provided', async () => {
        const options: ExportOptions = {
          includeMetadata: true,
          includeCharts: false,
          styling: {
            fontFamily: 'Times New Roman',
            fontSize: 14,
            lineSpacing: 1.8,
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            colors: {
              text: '#000000',
              background: '#ffffff',
              headers: '#333333',
              borders: '#cccccc'
            }
          }
        };
        
        const result = await service.exportDocument(mockSOPDocument, DocumentFormat.HTML, options);
        const content = await fs.readFile(result.filePath!, 'utf-8');
        
        expect(content).toContain('Times New Roman');
        expect(content).toContain('14pt');
      });
    });

    describe('Markdown export', () => {
      it('should export SOP to Markdown format successfully', async () => {
        const result = await service.exportDocument(mockSOPDocument, DocumentFormat.MARKDOWN);
        
        expect(result.success).toBe(true);
        expect(result.format).toBe(DocumentFormat.MARKDOWN);
        expect(result.filePath).toMatch(/\.markdown$/);
        expect(result.fileSize).toBeGreaterThan(0);
        
        // Verify file content
        const content = await fs.readFile(result.filePath!, 'utf-8');
        expect(content).toContain(`# ${mockSOPDocument.title}`);
        expect(content).toContain('## Overview');
        expect(content).toContain('### Quality Checkpoints');
      });
    });

    it('should handle unsupported format gracefully', async () => {
      const result = await service.exportDocument(mockSOPDocument, 'unsupported' as DocumentFormat);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported format');
    });

    it('should handle export errors gracefully', async () => {
      // Create an invalid SOP that should cause export to fail
      const invalidSOP = { ...mockSOPDocument, title: null as any };
      
      const result = await service.exportDocument(invalidSOP, DocumentFormat.PDF);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('applyTemplate', () => {
    it('should apply standard template successfully', async () => {
      const result = await service.applyTemplate(mockSOPDocument, 'standard-sop');
      
      expect(result.id).toBe(mockSOPDocument.id);
      expect(result.metadata.tags).toContain('template:standard-sop');
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should apply training template successfully', async () => {
      const result = await service.applyTemplate(mockSOPDocument, 'training-sop');
      
      expect(result.metadata.tags).toContain('template:training-sop');
    });

    it('should throw error for non-existent template', async () => {
      await expect(service.applyTemplate(mockSOPDocument, 'non-existent'))
        .rejects.toThrow('Template not found');
    });
  });

  describe('embedCharts', () => {
    it('should embed charts in SOP document', async () => {
      const result = await service.embedCharts(mockSOPDocument);
      
      expect(result.id).toBe(mockSOPDocument.id);
      expect(result.charts).toHaveLength(1);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle SOP without charts', async () => {
      const sopWithoutCharts = { ...mockSOPDocument, charts: [] };
      const result = await service.embedCharts(sopWithoutCharts);
      
      expect(result.charts).toHaveLength(0);
    });
  });

  describe('integration tests', () => {
    it('should export document with all features enabled', async () => {
      const options: ExportOptions = {
        includeMetadata: true,
        includeCharts: true,
        template: 'standard-sop',
        watermark: 'DRAFT',
        headerFooter: {
          includeHeader: true,
          includeFooter: true,
          headerText: 'Custom Header',
          footerText: 'Custom Footer',
          includePageNumbers: true,
          includeDatetime: true
        }
      };
      
      const result = await service.exportDocument(mockSOPDocument, DocumentFormat.HTML, options);
      
      expect(result.success).toBe(true);
      expect(result.fileSize).toBeGreaterThan(2000); // Should be larger with all features
      
      const content = await fs.readFile(result.filePath!, 'utf-8');
      expect(content).toContain('DRAFT');
      expect(content).toContain('header');
      expect(content).toContain('footer');
    });

    it('should maintain document integrity across different formats', async () => {
      const formats = [DocumentFormat.HTML, DocumentFormat.MARKDOWN];
      const results = [];
      
      for (const format of formats) {
        const result = await service.exportDocument(mockSOPDocument, format);
        expect(result.success).toBe(true);
        results.push(result);
      }
      
      // All exports should have consistent metadata
      results.forEach(result => {
        expect(result.metadata.originalDocumentId).toBe(mockSOPDocument.id);
        expect(result.metadata.version).toBe(mockSOPDocument.version);
      });
    });
  });
});