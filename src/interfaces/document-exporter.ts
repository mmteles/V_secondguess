import { SOPDocument, DocumentFormat, ExportOptions, ExportResult, ValidationResult } from '@/models';

/**
 * Document Exporter for formatting and exporting SOPs in multiple formats
 */
export interface DocumentExporter {
  /**
   * Export SOP document in specified format
   * @param sop - SOP document to export
   * @param format - Export format
   * @param options - Export options
   */
  exportDocument(sop: SOPDocument, format: DocumentFormat, options?: ExportOptions): Promise<ExportResult>;

  /**
   * Get supported export formats
   */
  getSupportedFormats(): DocumentFormat[];

  /**
   * Validate document before export
   * @param sop - SOP document to validate
   */
  validateForExport(sop: SOPDocument): ValidationResult;

  /**
   * Apply document template
   * @param sop - SOP document
   * @param templateId - Template identifier
   */
  applyTemplate(sop: SOPDocument, templateId: string): Promise<SOPDocument>;

  /**
   * Generate document metadata
   * @param sop - SOP document
   */
  generateMetadata(sop: SOPDocument): DocumentMetadata;

  /**
   * Embed charts in document
   * @param sop - SOP document with chart references
   */
  embedCharts(sop: SOPDocument): Promise<SOPDocument>;
}

export interface DocumentMetadata {
  title: string;
  author: string;
  createdDate: Date;
  modifiedDate: Date;
  version: string;
  description: string;
  keywords: string[];
  subject: string;
  category: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  supportedFormats: DocumentFormat[];
  headerTemplate: string;
  footerTemplate: string;
  styleSheet: string;
  pageLayout: PageLayout;
}

export interface PageLayout {
  pageSize: PageSize;
  orientation: PageOrientation;
  margins: PageMargins;
  headerHeight: number;
  footerHeight: number;
}

export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export enum PageSize {
  A4 = 'A4',
  LETTER = 'Letter',
  LEGAL = 'Legal',
  A3 = 'A3'
}

export enum PageOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape'
}

// DocumentFormat is now exported from models/enums.ts