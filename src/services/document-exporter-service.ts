/**
 * Document Exporter Service Implementation
 * Handles multi-format export of SOP documents
 */

import { DocumentExporter, DocumentMetadata, DocumentTemplate, PageSize, PageOrientation } from '@/interfaces';
import { SOPDocument, DocumentFormat, ExportOptions, ExportResult, ValidationResult, ValidationErrorType, ErrorSeverity, DocumentStyling } from '@/models';
import * as fs from 'fs/promises';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { marked } from 'marked';

export class DocumentExporterService implements DocumentExporter {
  private readonly exportDir = './exports';

  constructor() {
    this.ensureExportDirectory();
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
    }
  }

  async exportDocument(
    sop: SOPDocument, 
    format: DocumentFormat, 
    options?: ExportOptions
  ): Promise<ExportResult> {
    try {
      await this.ensureExportDirectory();
      
      const sanitizedTitle = sop.title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
      const filename = `${sanitizedTitle}_v${sop.version}.${format}`;
      const filePath = path.join(this.exportDir, filename);
      
      let fileSize = 0;
      
      switch (format) {
        case DocumentFormat.PDF:
          fileSize = await this.exportToPDF(sop, filePath, options);
          break;
        case DocumentFormat.DOCX:
          fileSize = await this.exportToDocx(sop, filePath, options);
          break;
        case DocumentFormat.HTML:
          fileSize = await this.exportToHTML(sop, filePath, options);
          break;
        case DocumentFormat.MARKDOWN:
          fileSize = await this.exportToMarkdown(sop, filePath, options);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      return {
        success: true,
        filePath,
        fileSize,
        format,
        metadata: {
          exportedAt: new Date(),
          exportedBy: 'AI Voice SOP Agent',
          originalDocumentId: sop.id,
          version: sop.version,
          checksum: await this.generateChecksum(filePath)
        }
      };
    } catch (error) {
      return {
        success: false,
        format,
        error: error instanceof Error ? error.message : 'Unknown export error',
        metadata: {
          exportedAt: new Date(),
          exportedBy: 'AI Voice SOP Agent',
          originalDocumentId: sop.id,
          version: sop.version
        }
      };
    }
  }

  private async exportToPDF(sop: SOPDocument, filePath: string, options?: ExportOptions): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 72, bottom: 72, left: 72, right: 72 }
        });
        
        const stream = require('fs').createWriteStream(filePath);
        doc.pipe(stream);
        
        // Add header
        if (options?.headerFooter?.includeHeader !== false) {
          doc.fontSize(20).text(sop.title, { align: 'center' });
          doc.moveDown();
        }
        
        // Add metadata
        if (options?.includeMetadata !== false) {
          doc.fontSize(12)
             .text(`Version: ${sop.version}`, { align: 'left' })
             .text(`Author: ${sop.metadata.author}`)
             .text(`Department: ${sop.metadata.department}`)
             .text(`Created: ${sop.createdAt.toLocaleDateString()}`)
             .moveDown();
        }
        
        // Add sections
        sop.sections.forEach((section, index) => {
          doc.fontSize(16).text(section.title, { underline: true });
          doc.fontSize(12).text(section.content);
          doc.moveDown();
          
          // Add quality checkpoints if any
          if (section.checkpoints.length > 0) {
            doc.fontSize(14).text('Quality Checkpoints:', { underline: true });
            section.checkpoints.forEach((checkpoint, cpIndex) => {
              doc.fontSize(10)
                 .text(`${cpIndex + 1}. ${checkpoint.description}`)
                 .text(`   Criteria: ${checkpoint.criteria.join(', ')}`)
                 .text(`   Method: ${checkpoint.method}`)
                 .text(`   Responsible: ${checkpoint.responsible}`)
                 .moveDown(0.5);
            });
            doc.moveDown();
          }
        });
        
        // Add footer
        if (options?.headerFooter?.includeFooter !== false) {
          const pageCount = doc.bufferedPageRange().count;
          for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.fontSize(10)
               .text(`Page ${i + 1} of ${pageCount}`, 
                     doc.page.margins.left, 
                     doc.page.height - doc.page.margins.bottom + 10,
                     { align: 'center' });
          }
        }
        
        doc.end();
        
        stream.on('finish', () => {
          const stats = require('fs').statSync(filePath);
          resolve(stats.size);
        });
        
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async exportToDocx(sop: SOPDocument, filePath: string, options?: ExportOptions): Promise<number> {
    const children: any[] = [];
    
    // Add title
    children.push(
      new Paragraph({
        children: [new TextRun({ text: sop.title, bold: true, size: 32 })],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER
      })
    );
    
    // Add metadata
    if (options?.includeMetadata !== false) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Version: ${sop.version}`, break: 1 }),
            new TextRun({ text: `Author: ${sop.metadata.author}`, break: 1 }),
            new TextRun({ text: `Department: ${sop.metadata.department}`, break: 1 }),
            new TextRun({ text: `Created: ${sop.createdAt.toLocaleDateString()}`, break: 1 })
          ]
        })
      );
    }
    
    // Add sections
    sop.sections.forEach(section => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.title, bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_1
        })
      );
      
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.content })]
        })
      );
      
      // Add quality checkpoints
      if (section.checkpoints.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Quality Checkpoints:', bold: true, underline: {} })]
          })
        );
        
        section.checkpoints.forEach((checkpoint, index) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${index + 1}. ${checkpoint.description}`, break: 1 }),
                new TextRun({ text: `   Criteria: ${checkpoint.criteria.join(', ')}`, break: 1 }),
                new TextRun({ text: `   Method: ${checkpoint.method}`, break: 1 }),
                new TextRun({ text: `   Responsible: ${checkpoint.responsible}`, break: 1 })
              ]
            })
          );
        });
      }
    });
    
    const doc = new Document({
      sections: [{
        properties: {},
        children
      }]
    });
    
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(filePath, buffer);
    
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  private async exportToHTML(sop: SOPDocument, filePath: string, options?: ExportOptions): Promise<number> {
    // Get template if specified
    const template = options?.template ? this.getDocumentTemplate(options.template) : this.getDocumentTemplate('standard-sop');
    const styleSheet = template?.styleSheet || this.getStandardCSS();
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sop.title}</title>
    <style>
        ${styleSheet}
        .footer { text-align: center; margin-top: 50px; font-size: 0.9em; color: #666; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); 
                    font-size: 72pt; color: rgba(0,0,0,0.1); z-index: -1; pointer-events: none; }
    </style>
</head>
<body>`;
    
    // Add watermark if specified
    if (options?.watermark) {
      html += `<div class="watermark">${options.watermark}</div>`;
    }
    
    // Add header if specified
    if (template && options?.headerFooter?.includeHeader !== false) {
      const headerText = this.generateHeaderText(template, sop);
      html += `<div class="header" style="text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">
        ${headerText}
      </div>`;
    }
    
    // Add title
    html += `<h1>${sop.title}</h1>`;
    
    // Add metadata
    if (options?.includeMetadata !== false) {
      html += `<div class="metadata">
        <strong>Document Information:</strong><br>
        Version: ${sop.version}<br>
        Author: ${sop.metadata.author}<br>
        Department: ${sop.metadata.department}<br>
        Created: ${sop.createdAt.toLocaleDateString()}<br>
        Status: ${sop.metadata.status}<br>
        Purpose: ${sop.metadata.purpose}<br>
        Scope: ${sop.metadata.scope}
      </div>`;
    }
    
    // Add sections
    sop.sections.forEach(section => {
      html += `<div class="section">
        <h2>${section.title}</h2>
        <p>${section.content.replace(/\n/g, '<br>')}</p>`;
      
      // Add quality checkpoints
      if (section.checkpoints.length > 0) {
        html += `<h3>Quality Checkpoints:</h3>`;
        section.checkpoints.forEach((checkpoint, index) => {
          html += `<div class="checkpoint">
            <div class="checkpoint-title">${index + 1}. ${checkpoint.description}</div>
            <div><strong>Criteria:</strong> ${checkpoint.criteria.join(', ')}</div>
            <div><strong>Method:</strong> ${checkpoint.method}</div>
            <div><strong>Responsible:</strong> ${checkpoint.responsible}</div>
          </div>`;
        });
      }
      
      html += `</div>`;
    });
    
    // Add footer
    if (template && options?.headerFooter?.includeFooter !== false) {
      const footerText = this.generateFooterText(template, sop);
      html += `<div class="footer" style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 30px;">
        ${footerText}
      </div>`;
    } else {
      html += `<div class="footer">
        Generated by AI Voice SOP Agent on ${new Date().toLocaleDateString()}
      </div>`;
    }
    
    html += `</body>
</html>`;
    
    // Apply custom styling if provided
    if (options?.styling) {
      html = this.applyDocumentStyling(html, options.styling);
    }
    
    await fs.writeFile(filePath, html, 'utf-8');
    
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  private async exportToMarkdown(sop: SOPDocument, filePath: string, options?: ExportOptions): Promise<number> {
    let markdown = `# ${sop.title}\n\n`;
    
    // Add metadata
    if (options?.includeMetadata !== false) {
      markdown += `## Document Information\n\n`;
      markdown += `- **Version:** ${sop.version}\n`;
      markdown += `- **Author:** ${sop.metadata.author}\n`;
      markdown += `- **Department:** ${sop.metadata.department}\n`;
      markdown += `- **Created:** ${sop.createdAt.toLocaleDateString()}\n`;
      markdown += `- **Status:** ${sop.metadata.status}\n\n`;
    }
    
    // Add sections
    sop.sections.forEach(section => {
      markdown += `## ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
      
      // Add quality checkpoints
      if (section.checkpoints.length > 0) {
        markdown += `### Quality Checkpoints\n\n`;
        section.checkpoints.forEach((checkpoint, index) => {
          markdown += `${index + 1}. **${checkpoint.description}**\n`;
          markdown += `   - **Criteria:** ${checkpoint.criteria.join(', ')}\n`;
          markdown += `   - **Method:** ${checkpoint.method}\n`;
          markdown += `   - **Responsible:** ${checkpoint.responsible}\n\n`;
        });
      }
    });
    
    // Add footer
    markdown += `---\n\n`;
    markdown += `*Generated by AI Voice SOP Agent on ${new Date().toLocaleDateString()}*\n`;
    
    await fs.writeFile(filePath, markdown, 'utf-8');
    
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  private async generateChecksum(filePath: string): Promise<string> {
    const crypto = require('crypto');
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  getSupportedFormats(): DocumentFormat[] {
    return [
      DocumentFormat.PDF,
      DocumentFormat.DOCX,
      DocumentFormat.HTML,
      DocumentFormat.MARKDOWN
    ];
  }

  validateForExport(sop: SOPDocument): ValidationResult {
    // TODO: Implement export validation
    const errors: any[] = [];
    const warnings: any[] = [];
    const suggestions: string[] = [];

    if (!sop.title || sop.title.trim().length === 0) {
      errors.push({
        id: 'missing-title',
        type: ValidationErrorType.MISSING_FIELD,
        field: 'title',
        message: 'Document title is required for export',
        severity: ErrorSeverity.HIGH,
        code: 'MISSING_TITLE'
      });
    }

    if (sop.sections.length === 0) {
      warnings.push({
        id: 'no-sections',
        field: 'sections',
        message: 'Document has no sections',
        code: 'NO_SECTIONS'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score: errors.length === 0 ? (warnings.length === 0 ? 100 : 90) : 70
    };
  }

  async applyTemplate(sop: SOPDocument, templateId: string): Promise<SOPDocument> {
    const template = this.getDocumentTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Apply template formatting to SOP
    const formattedSOP: SOPDocument = {
      ...sop,
      metadata: {
        ...sop.metadata,
        // Apply template-specific metadata
        category: template.name.includes('Training') ? 'Training' : sop.metadata.category,
        tags: [...sop.metadata.tags, `template:${templateId}`]
      },
      sections: sop.sections.map(section => ({
        ...section,
        // Apply template-specific section formatting
        content: this.formatSectionContent(section.content, template)
      })),
      updatedAt: new Date()
    };
    
    return formattedSOP;
  }

  private getDocumentTemplate(templateId: string): DocumentTemplate | null {
    const templates = this.getAvailableTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  private getAvailableTemplates(): DocumentTemplate[] {
    return [
      {
        id: 'standard-sop',
        name: 'Standard SOP Template',
        description: 'Standard corporate SOP template with consistent formatting',
        supportedFormats: [DocumentFormat.PDF, DocumentFormat.DOCX, DocumentFormat.HTML],
        headerTemplate: '{{title}} - {{department}}',
        footerTemplate: 'Page {{pageNumber}} of {{totalPages}} | {{date}}',
        styleSheet: this.getStandardCSS(),
        pageLayout: {
          pageSize: PageSize.A4,
          orientation: PageOrientation.PORTRAIT,
          margins: { top: 72, bottom: 72, left: 72, right: 72 },
          headerHeight: 36,
          footerHeight: 36
        }
      },
      {
        id: 'training-sop',
        name: 'Training SOP Template',
        description: 'Training-focused SOP template with learning objectives',
        supportedFormats: [DocumentFormat.PDF, DocumentFormat.DOCX, DocumentFormat.HTML],
        headerTemplate: 'Training Material: {{title}}',
        footerTemplate: 'Training Document | {{date}}',
        styleSheet: this.getTrainingCSS(),
        pageLayout: {
          pageSize: PageSize.A4,
          orientation: PageOrientation.PORTRAIT,
          margins: { top: 90, bottom: 90, left: 72, right: 72 },
          headerHeight: 54,
          footerHeight: 54
        }
      },
      {
        id: 'process-improvement',
        name: 'Process Improvement Template',
        description: 'Template for process improvement SOPs with metrics focus',
        supportedFormats: [DocumentFormat.PDF, DocumentFormat.DOCX, DocumentFormat.HTML],
        headerTemplate: 'Process Improvement: {{title}}',
        footerTemplate: 'Improvement Initiative | {{version}} | {{date}}',
        styleSheet: this.getProcessImprovementCSS(),
        pageLayout: {
          pageSize: PageSize.A4,
          orientation: PageOrientation.PORTRAIT,
          margins: { top: 72, bottom: 72, left: 90, right: 90 },
          headerHeight: 36,
          footerHeight: 36
        }
      }
    ];
  }

  private formatSectionContent(content: string, template: DocumentTemplate): string {
    // Apply template-specific content formatting
    let formattedContent = content;
    
    // Add consistent paragraph spacing
    formattedContent = formattedContent.replace(/\n\n/g, '\n\n');
    
    // Format numbered lists consistently
    formattedContent = formattedContent.replace(/^\d+\.\s/gm, match => match);
    
    // Format bullet points consistently
    formattedContent = formattedContent.replace(/^[-*]\s/gm, '• ');
    
    return formattedContent;
  }

  private getStandardCSS(): string {
    return `
      body { 
        font-family: 'Arial', sans-serif; 
        font-size: 12pt; 
        line-height: 1.6; 
        color: #333; 
        margin: 0; 
        padding: 20px; 
      }
      h1 { 
        font-size: 24pt; 
        font-weight: bold; 
        color: #2c3e50; 
        text-align: center; 
        margin-bottom: 30px; 
        border-bottom: 3px solid #3498db; 
        padding-bottom: 10px; 
      }
      h2 { 
        font-size: 18pt; 
        font-weight: bold; 
        color: #34495e; 
        margin-top: 25px; 
        margin-bottom: 15px; 
        border-bottom: 1px solid #bdc3c7; 
        padding-bottom: 5px; 
      }
      h3 { 
        font-size: 14pt; 
        font-weight: bold; 
        color: #7f8c8d; 
        margin-top: 20px; 
        margin-bottom: 10px; 
      }
      .metadata { 
        background-color: #ecf0f1; 
        padding: 15px; 
        border-radius: 5px; 
        margin: 20px 0; 
        border-left: 4px solid #3498db; 
      }
      .checkpoint { 
        background-color: #e8f6f3; 
        padding: 12px; 
        margin: 10px 0; 
        border-left: 4px solid #27ae60; 
        border-radius: 3px; 
      }
      .section { 
        margin: 25px 0; 
        page-break-inside: avoid; 
      }
    `;
  }

  private getTrainingCSS(): string {
    return `
      body { 
        font-family: 'Calibri', sans-serif; 
        font-size: 11pt; 
        line-height: 1.8; 
        color: #2c3e50; 
        margin: 0; 
        padding: 20px; 
      }
      h1 { 
        font-size: 26pt; 
        font-weight: bold; 
        color: #8e44ad; 
        text-align: center; 
        margin-bottom: 35px; 
        border-bottom: 3px solid #9b59b6; 
        padding-bottom: 15px; 
      }
      h2 { 
        font-size: 16pt; 
        font-weight: bold; 
        color: #8e44ad; 
        margin-top: 30px; 
        margin-bottom: 15px; 
        background-color: #f8f9fa; 
        padding: 10px; 
        border-left: 5px solid #9b59b6; 
      }
      .learning-objective { 
        background-color: #fef9e7; 
        padding: 15px; 
        border-left: 4px solid #f39c12; 
        margin: 15px 0; 
        font-style: italic; 
      }
      .checkpoint { 
        background-color: #eaf2f8; 
        padding: 12px; 
        margin: 10px 0; 
        border-left: 4px solid #3498db; 
        border-radius: 3px; 
      }
    `;
  }

  private getProcessImprovementCSS(): string {
    return `
      body { 
        font-family: 'Times New Roman', serif; 
        font-size: 12pt; 
        line-height: 1.5; 
        color: #2c3e50; 
        margin: 0; 
        padding: 20px; 
      }
      h1 { 
        font-size: 22pt; 
        font-weight: bold; 
        color: #e74c3c; 
        text-align: center; 
        margin-bottom: 30px; 
        border-bottom: 2px solid #c0392b; 
        padding-bottom: 10px; 
      }
      h2 { 
        font-size: 16pt; 
        font-weight: bold; 
        color: #c0392b; 
        margin-top: 25px; 
        margin-bottom: 15px; 
        border-bottom: 1px solid #e74c3c; 
        padding-bottom: 5px; 
      }
      .metric { 
        background-color: #fdf2e9; 
        padding: 12px; 
        border-left: 4px solid #e67e22; 
        margin: 10px 0; 
        font-weight: bold; 
      }
      .improvement-note { 
        background-color: #eafaf1; 
        padding: 10px; 
        border-left: 4px solid #27ae60; 
        margin: 10px 0; 
        font-style: italic; 
      }
    `;
  }

  generateMetadata(sop: SOPDocument): DocumentMetadata {
    const keywords = [
      ...sop.metadata.tags,
      sop.type,
      sop.metadata.category,
      'SOP',
      'Standard Operating Procedure'
    ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
    
    return {
      title: sop.title,
      author: sop.metadata.author,
      createdDate: sop.createdAt,
      modifiedDate: sop.updatedAt,
      version: sop.version,
      description: sop.metadata.purpose || `${sop.type} SOP for ${sop.metadata.category}`,
      keywords,
      subject: `${sop.type} - ${sop.metadata.category}`,
      category: sop.metadata.category
    };
  }

  private generateHeaderText(template: DocumentTemplate, sop: SOPDocument): string {
    return template.headerTemplate
      .replace('{{title}}', sop.title)
      .replace('{{department}}', sop.metadata.department)
      .replace('{{version}}', sop.version)
      .replace('{{author}}', sop.metadata.author)
      .replace('{{date}}', new Date().toLocaleDateString());
  }

  private generateFooterText(template: DocumentTemplate, sop: SOPDocument, pageNumber?: number, totalPages?: number): string {
    return template.footerTemplate
      .replace('{{pageNumber}}', pageNumber?.toString() || '1')
      .replace('{{totalPages}}', totalPages?.toString() || '1')
      .replace('{{date}}', new Date().toLocaleDateString())
      .replace('{{version}}', sop.version)
      .replace('{{title}}', sop.title);
  }

  private applyDocumentStyling(content: string, styling?: DocumentStyling): string {
    if (!styling) return content;
    
    // Apply consistent styling transformations
    let styledContent = content;
    
    // Apply font and spacing preferences
    if (styling.fontFamily || styling.fontSize || styling.lineSpacing) {
      const fontStyle = `font-family: ${styling.fontFamily || 'Arial'}; font-size: ${styling.fontSize || 12}pt; line-height: ${styling.lineSpacing || 1.6};`;
      styledContent = `<div style="${fontStyle}">${styledContent}</div>`;
    }
    
    // Apply color scheme
    if (styling.colors) {
      styledContent = styledContent
        .replace(/color:\s*#[0-9a-fA-F]{6}/g, `color: ${styling.colors.text}`)
        .replace(/background-color:\s*#[0-9a-fA-F]{6}/g, `background-color: ${styling.colors.background}`);
    }
    
    return styledContent;
  }

  private validateDocumentStructure(sop: SOPDocument): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check required fields
    if (!sop.title?.trim()) issues.push('Document title is missing');
    if (!sop.metadata?.author?.trim()) issues.push('Document author is missing');
    if (!sop.metadata?.department?.trim()) issues.push('Department is missing');
    if (!sop.sections || sop.sections.length === 0) issues.push('Document has no sections');
    
    // Check section structure
    sop.sections?.forEach((section, index) => {
      if (!section.title?.trim()) issues.push(`Section ${index + 1} is missing a title`);
      if (!section.content?.trim()) issues.push(`Section ${index + 1} is missing content`);
    });
    
    // Check metadata completeness
    if (!sop.metadata?.purpose?.trim()) issues.push('Document purpose is missing');
    if (!sop.metadata?.scope?.trim()) issues.push('Document scope is missing');
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  async embedCharts(sop: SOPDocument): Promise<SOPDocument> {
    // TODO: Implement chart embedding in document
    console.log(`Embedding ${sop.charts.length} charts in SOP ${sop.id}`);
    
    return {
      ...sop,
      updatedAt: new Date()
    };
  }

  private getDefaultPageLayout() {
    return {
      pageSize: PageSize.A4,
      orientation: PageOrientation.PORTRAIT,
      margins: {
        top: 72,    // 1 inch
        bottom: 72, // 1 inch
        left: 72,   // 1 inch
        right: 72   // 1 inch
      },
      headerHeight: 36, // 0.5 inch
      footerHeight: 36  // 0.5 inch
    };
  }
}