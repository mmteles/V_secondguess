import { SOPDocument, SOPSection, ExportOptions, ExportResult } from '../../models/sop-models';
import { DocumentFormat } from '../../models/enums';
import { ChartDefinition } from '../../models/chart-models';
import { sopPreviewStyles } from '../styles/sop-preview-styles';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { join } from 'path';
import { Table } from 'docx';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { Document } from 'docx';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { join } from 'path';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';
import { document } from 'pdfkit/js/page';

export interface SOPPreviewConfig {
  onExport?: (format: DocumentFormat, options: ExportOptions) => Promise<ExportResult>;
  onShare?: (shareOptions: ShareOptions) => void;
  onEdit?: (sectionId: string) => void;
  onVersionHistory?: () => void;
}

export interface ShareOptions {
  method: 'email' | 'link' | 'download';
  recipients?: string[];
  message?: string;
  permissions?: 'view' | 'edit' | 'comment';
}

export class SOPPreview {
  private container: HTMLElement;
  private config: SOPPreviewConfig;
  private currentDocument: SOPDocument | null = null;
  private previewMode: 'document' | 'print' | 'web' = 'document';

  constructor(containerId: string, config: SOPPreviewConfig = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id '${containerId}' not found`);
    }
    
    this.container = container;
    this.config = config;
    this.createInterface();
    this.setupEventListeners();
  }

  private createInterface(): void {
    this.container.innerHTML = `
      <div class="sop-preview">
        <div class="preview-header">
          <div class="document-info">
            <h2 id="documentTitle">No Document Loaded</h2>
            <div class="document-meta">
              <span id="documentType" class="doc-type">-</span>
              <span id="documentVersion" class="doc-version">v-</span>
              <span id="documentStatus" class="doc-status">-</span>
            </div>
          </div>
          
          <div class="preview-controls">
            <div class="view-modes">
              <button id="documentView" class="view-btn active">Document</button>
              <button id="printView" class="view-btn">Print</button>
              <button id="webView" class="view-btn">Web</button>
            </div>
            
            <div class="action-buttons">
              <button id="editBtn" class="action-btn secondary">
                <span class="btn-icon">✏️</span>
                <span>Edit</span>
              </button>
              <button id="shareBtn" class="action-btn secondary">
                <span class="btn-icon">🔗</span>
                <span>Share</span>
              </button>
              <button id="exportBtn" class="action-btn primary">
                <span class="btn-icon">📥</span>
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        <div class="preview-content">
          <div id="documentPreview" class="document-preview">
            <div class="empty-state">
              <div class="empty-icon">📄</div>
              <h3>No SOP Document</h3>
              <p>Generate an SOP from your conversation to see the preview here.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .sop-preview {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: white;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        overflow: hidden;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .document-info h2 {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 600;
      }

      .document-meta {
        display: flex;
        gap: 15px;
        font-size: 13px;
      }

      .doc-type, .doc-version, .doc-status {
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        font-weight: 500;
      }

      .preview-controls {
        display: flex;
        gap: 20px;
        align-items: center;
      }

      .view-modes {
        display: flex;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 4px;
      }

      .view-btn {
        padding: 8px 16px;
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .view-btn.active {
        background: white;
        color: #667eea;
      }

      .action-buttons {
        display: flex;
        gap: 10px;
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .action-btn.primary {
        background: #28a745;
        color: white;
      }

      .action-btn.primary:hover {
        background: #218838;
        transform: translateY(-1px);
      }

      .action-btn.secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .action-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .btn-icon {
        font-size: 16px;
      }

      .preview-content {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .document-preview {
        height: 100%;
        overflow-y: auto;
        padding: 30px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #6c757d;
        text-align: center;
      }

      .empty-icon {
        font-size: 64px;
        margin-bottom: 20px;
        opacity: 0.5;
      }

      .empty-state h3 {
        margin: 0 0 10px 0;
        font-size: 24px;
        font-weight: 600;
      }

      .empty-state p {
        margin: 0;
        font-size: 16px;
        opacity: 0.8;
      }
    `;

      ${sopPreviewStyles}
    `;

    document.head.appendChild(style);
  }  pri
vate setupEventListeners(): void {
    // View mode buttons
    const documentViewBtn = this.container.querySelector('#documentView') as HTMLButtonElement;
    const printViewBtn = this.container.querySelector('#printView') as HTMLButtonElement;
    const webViewBtn = this.container.querySelector('#webView') as HTMLButtonElement;

    documentViewBtn.addEventListener('click', () => this.setPreviewMode('document'));
    printViewBtn.addEventListener('click', () => this.setPreviewMode('print'));
    webViewBtn.addEventListener('click', () => this.setPreviewMode('web'));

    // Action buttons
    const editBtn = this.container.querySelector('#editBtn') as HTMLButtonElement;
    const shareBtn = this.container.querySelector('#shareBtn') as HTMLButtonElement;
    const exportBtn = this.container.querySelector('#exportBtn') as HTMLButtonElement;

    editBtn.addEventListener('click', this.handleEdit.bind(this));
    shareBtn.addEventListener('click', this.handleShare.bind(this));
    exportBtn.addEventListener('click', this.handleExport.bind(this));
  }

  private setPreviewMode(mode: 'document' | 'print' | 'web'): void {
    this.previewMode = mode;
    
    // Update active button
    this.container.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    this.container.querySelector(`#${mode}View`)?.classList.add('active');
    
    // Re-render document with new mode
    if (this.currentDocument) {
      this.renderDocument(this.currentDocument);
    }
  }

  private handleEdit(): void {
    if (this.config.onEdit && this.currentDocument) {
      this.config.onEdit('document');
    }
  }

  private handleShare(): void {
    this.showShareDialog();
  }

  private handleExport(): void {
    this.showExportDialog();
  }

  loadDocument(document: SOPDocument): void {
    this.currentDocument = document;
    this.updateDocumentInfo();
    this.renderDocument(document);
  }

  private updateDocumentInfo(): void {
    if (!this.currentDocument) return;

    const titleElement = this.container.querySelector('#documentTitle') as HTMLElement;
    const typeElement = this.container.querySelector('#documentType') as HTMLElement;
    const versionElement = this.container.querySelector('#documentVersion') as HTMLElement;
    const statusElement = this.container.querySelector('#documentStatus') as HTMLElement;

    titleElement.textContent = this.currentDocument.title;
    typeElement.textContent = this.currentDocument.type.toUpperCase();
    versionElement.textContent = `v${this.currentDocument.version}`;
    statusElement.textContent = this.currentDocument.metadata.status.toUpperCase();
  }

  private renderDocument(document: SOPDocument): void {
    const previewContainer = this.container.querySelector('#documentPreview') as HTMLElement;
    
    const documentHtml = this.generateDocumentHTML(document);
    previewContainer.innerHTML = documentHtml;
    
    this.setupDocumentEventListeners();
  } 
 private generateDocumentHTML(document: SOPDocument): string {
    const modeClass = `preview-mode-${this.previewMode}`;
    
    return `
      <div class="sop-document ${modeClass}">
        ${this.generateDocumentHeader(document)}
        ${this.generateTableOfContents(document)}
        ${this.generateDocumentSections(document)}
        ${this.generateDocumentFooter(document)}
      </div>
    `;
  }

  private generateDocumentHeader(document: SOPDocument): string {
    return `
      <div class="document-header">
        <div class="header-content">
          <h1 class="document-title">${document.title}</h1>
          <div class="document-metadata">
            <div class="metadata-row">
              <span class="label">Document Type:</span>
              <span class="value">${document.type.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="metadata-row">
              <span class="label">Version:</span>
              <span class="value">${document.version}</span>
            </div>
            <div class="metadata-row">
              <span class="label">Status:</span>
              <span class="value status-${document.metadata.status}">${document.metadata.status.toUpperCase()}</span>
            </div>
            <div class="metadata-row">
              <span class="label">Effective Date:</span>
              <span class="value">${document.metadata.effectiveDate.toLocaleDateString()}</span>
            </div>
            <div class="metadata-row">
              <span class="label">Author:</span>
              <span class="value">${document.metadata.author}</span>
            </div>
            <div class="metadata-row">
              <span class="label">Department:</span>
              <span class="value">${document.metadata.department}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateTableOfContents(document: SOPDocument): string {
    const tocItems = document.sections
      .sort((a, b) => a.order - b.order)
      .map(section => `
        <li class="toc-item">
          <a href="#section-${section.id}" class="toc-link">
            ${section.order + 1}. ${section.title}
          </a>
        </li>
      `).join('');

    return `
      <div class="table-of-contents">
        <h2>Table of Contents</h2>
        <ol class="toc-list">
          ${tocItems}
        </ol>
      </div>
    `;
  }

  private generateDocumentSections(document: SOPDocument): string {
    return document.sections
      .sort((a, b) => a.order - b.order)
      .map(section => this.generateSection(section))
      .join('');
  }

  private generateSection(section: SOPSection): string {
    return `
      <div class="document-section" id="section-${section.id}">
        <h2 class="section-title">
          ${section.order + 1}. ${section.title}
          <button class="edit-section-btn" data-section-id="${section.id}">✏️</button>
        </h2>
        <div class="section-content">
          ${this.formatSectionContent(section.content)}
        </div>
        ${this.generateSectionCharts(section)}
        ${this.generateQualityCheckpoints(section)}
        ${this.generateSubsections(section)}
      </div>
    `;
  }  priv
ate formatSectionContent(content: string): string {
    // Convert line breaks to paragraphs and handle basic formatting
    return content
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  private generateSectionCharts(section: SOPSection): string {
    if (!section.charts || section.charts.length === 0) return '';

    const chartsHtml = section.charts.map(chartRef => `
      <div class="chart-container chart-${chartRef.position}">
        <div class="chart-placeholder" data-chart-id="${chartRef.chartId}">
          <div class="chart-icon">📊</div>
          <div class="chart-info">
            <h4>Chart: ${chartRef.chartId}</h4>
            ${chartRef.caption ? `<p class="chart-caption">${chartRef.caption}</p>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    return `<div class="section-charts">${chartsHtml}</div>`;
  }

  private generateQualityCheckpoints(section: SOPSection): string {
    if (!section.checkpoints || section.checkpoints.length === 0) return '';

    const checkpointsHtml = section.checkpoints.map(checkpoint => `
      <div class="quality-checkpoint">
        <h4 class="checkpoint-title">Quality Checkpoint: ${checkpoint.description}</h4>
        <div class="checkpoint-details">
          <div class="checkpoint-criteria">
            <strong>Criteria:</strong>
            <ul>
              ${checkpoint.criteria.map(criterion => `<li>${criterion}</li>`).join('')}
            </ul>
          </div>
          <div class="checkpoint-meta">
            <span class="checkpoint-method">Method: ${checkpoint.method.replace('_', ' ')}</span>
            <span class="checkpoint-frequency">Frequency: ${checkpoint.frequency.replace('_', ' ')}</span>
            <span class="checkpoint-responsible">Responsible: ${checkpoint.responsible}</span>
          </div>
        </div>
      </div>
    `).join('');

    return `<div class="section-checkpoints">${checkpointsHtml}</div>`;
  }

  private generateSubsections(section: SOPSection): string {
    if (!section.subsections || section.subsections.length === 0) return '';

    const subsectionsHtml = section.subsections
      .sort((a, b) => a.order - b.order)
      .map(subsection => `
        <div class="subsection">
          <h3 class="subsection-title">${section.order + 1}.${subsection.order + 1} ${subsection.title}</h3>
          <div class="subsection-content">
            ${this.formatSectionContent(subsection.content)}
          </div>
          ${this.generateSectionCharts(subsection)}
        </div>
      `).join('');

    return `<div class="section-subsections">${subsectionsHtml}</div>`;
  }

  private generateDocumentFooter(document: SOPDocument): string {
    return `
      <div class="document-footer">
        <div class="footer-content">
          <div class="footer-info">
            <p><strong>Document ID:</strong> ${document.id}</p>
            <p><strong>Created:</strong> ${document.createdAt.toLocaleDateString()}</p>
            <p><strong>Last Updated:</strong> ${document.updatedAt.toLocaleDateString()}</p>
            <p><strong>Next Review:</strong> ${document.metadata.reviewDate.toLocaleDateString()}</p>
          </div>
          ${document.metadata.references.length > 0 ? this.generateReferences(document) : ''}
        </div>
      </div>
    `;
  }

  private generateReferences(document: SOPDocument): string {
    const referencesHtml = document.metadata.references.map(ref => `
      <li class="reference-item">
        <strong>${ref.title}</strong>
        ${ref.version ? ` (v${ref.version})` : ''}
        ${ref.url ? ` - <a href="${ref.url}" target="_blank">${ref.url}</a>` : ''}
      </li>
    `).join('');

    return `
      <div class="document-references">
        <h3>References</h3>
        <ul class="references-list">
          ${referencesHtml}
        </ul>
      </div>
    `;
  }

  private setupDocumentEventListeners(): void {
    // Section edit buttons
    this.container.querySelectorAll('.edit-section-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sectionId = (e.target as HTMLElement).dataset.sectionId;
        if (sectionId && this.config.onEdit) {
          this.config.onEdit(sectionId);
        }
      });
    });

    // Table of contents links
    this.container.querySelectorAll('.toc-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = (e.target as HTMLAnchorElement).getAttribute('href');
        if (href) {
          const targetElement = this.container.querySelector(href);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  private showShareDialog(): void {
    const dialog = this.createShareDialog();
    document.body.appendChild(dialog);
    
    // Setup dialog event listeners
    const closeBtn = dialog.querySelector('.dialog-close');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const shareBtn = dialog.querySelector('.share-btn');

    const closeDialog = () => {
      document.body.removeChild(dialog);
    };

    closeBtn?.addEventListener('click', closeDialog);
    cancelBtn?.addEventListener('click', closeDialog);
    
    shareBtn?.addEventListener('click', () => {
      const formData = new FormData(dialog.querySelector('form') as HTMLFormElement);
      const shareOptions: ShareOptions = {
        method: formData.get('method') as 'email' | 'link' | 'download',
        recipients: formData.get('recipients')?.toString().split(',').map(s => s.trim()) || [],
        message: formData.get('message')?.toString() || '',
        permissions: formData.get('permissions') as 'view' | 'edit' | 'comment'
      };

      if (this.config.onShare) {
        this.config.onShare(shareOptions);
      }
      
      closeDialog();
    });

    // Click outside to close
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });
  }

  private createShareDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog">
        <div class="dialog-header">
          <h3>Share SOP Document</h3>
          <button class="dialog-close">×</button>
        </div>
        <form class="dialog-content">
          <div class="form-group">
            <label>Share Method:</label>
            <select name="method" required>
              <option value="link">Generate Link</option>
              <option value="email">Send via Email</option>
              <option value="download">Download File</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Recipients (comma-separated emails):</label>
            <input type="text" name="recipients" placeholder="user1@example.com, user2@example.com">
          </div>
          
          <div class="form-group">
            <label>Permissions:</label>
            <select name="permissions">
              <option value="view">View Only</option>
              <option value="comment">View & Comment</option>
              <option value="edit">Edit</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Message (optional):</label>
            <textarea name="message" rows="3" placeholder="Add a message..."></textarea>
          </div>
        </form>
        <div class="dialog-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="button" class="share-btn">Share</button>
        </div>
      </div>
    `;

    return dialog;
  }

  private showExportDialog(): void {
    const dialog = this.createExportDialog();
    document.body.appendChild(dialog);
    
    // Setup dialog event listeners
    const closeBtn = dialog.querySelector('.dialog-close');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const exportBtn = dialog.querySelector('.export-btn');

    const closeDialog = () => {
      document.body.removeChild(dialog);
    };

    closeBtn?.addEventListener('click', closeDialog);
    cancelBtn?.addEventListener('click', closeDialog);
    
    exportBtn?.addEventListener('click', async () => {
      const formData = new FormData(dialog.querySelector('form') as HTMLFormElement);
      const format = formData.get('format') as DocumentFormat;
      
      const exportOptions: ExportOptions = {
        includeCharts: formData.get('includeCharts') === 'on',
        includeMetadata: formData.get('includeMetadata') === 'on',
        template: formData.get('template')?.toString(),
        watermark: formData.get('watermark')?.toString(),
        headerFooter: {
          includeHeader: formData.get('includeHeader') === 'on',
          includeFooter: formData.get('includeFooter') === 'on',
          includePageNumbers: formData.get('includePageNumbers') === 'on',
          includeDatetime: formData.get('includeDatetime') === 'on'
        }
      };

      if (this.config.onExport) {
        try {
          const result = await this.config.onExport(format, exportOptions);
          if (result.success) {
            this.showExportSuccess(result);
          } else {
            this.showExportError(result.error || 'Export failed');
          }
        } catch (error) {
          this.showExportError(error.toString());
        }
      }
      
      closeDialog();
    });

    // Click outside to close
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });
  }

  private createExportDialog(): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog">
        <div class="dialog-header">
          <h3>Export SOP Document</h3>
          <button class="dialog-close">×</button>
        </div>
        <form class="dialog-content">
          <div class="form-group">
            <label>Export Format:</label>
            <select name="format" required>
              <option value="PDF">PDF Document</option>
              <option value="DOCX">Word Document</option>
              <option value="HTML">HTML Page</option>
              <option value="MARKDOWN">Markdown</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Template:</label>
            <select name="template">
              <option value="">Default Template</option>
              <option value="corporate">Corporate Template</option>
              <option value="technical">Technical Template</option>
              <option value="training">Training Template</option>
            </select>
          </div>
          
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="includeCharts" checked>
              Include Charts and Diagrams
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="includeMetadata" checked>
              Include Document Metadata
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="includeHeader">
              Include Header
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="includeFooter" checked>
              Include Footer
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="includePageNumbers" checked>
              Include Page Numbers
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="includeDatetime" checked>
              Include Date/Time
            </label>
          </div>
          
          <div class="form-group">
            <label>Watermark (optional):</label>
            <input type="text" name="watermark" placeholder="DRAFT, CONFIDENTIAL, etc.">
          </div>
        </form>
        <div class="dialog-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="button" class="export-btn">Export</button>
        </div>
      </div>
    `;

    return dialog;
  }

  private showExportSuccess(result: ExportResult): void {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">✅</span>
        <div class="notification-text">
          <strong>Export Successful!</strong>
          <p>Document exported as ${result.format}</p>
          ${result.filePath ? `<p>File: ${result.filePath}</p>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  private showExportError(error: string): void {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">❌</span>
        <div class="notification-text">
          <strong>Export Failed</strong>
          <p>${error}</p>
        </div>
      </div>
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  // Public methods
  public getCurrentDocument(): SOPDocument | null {
    return this.currentDocument;
  }

  public refreshPreview(): void {
    if (this.currentDocument) {
      this.renderDocument(this.currentDocument);
    }
  }

  public setPreviewMode(mode: 'document' | 'print' | 'web'): void {
    this.setPreviewMode(mode);
  }

  public highlightSection(sectionId: string): void {
    const sectionElement = this.container.querySelector(`#section-${sectionId}`);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth' });
      sectionElement.classList.add('highlighted');
      
      setTimeout(() => {
        sectionElement.classList.remove('highlighted');
      }, 3000);
    }
  }

  public updateDocument(document: SOPDocument): void {
    this.loadDocument(document);
  }

  public clearPreview(): void {
    this.currentDocument = null;
    const previewContainer = this.container.querySelector('#documentPreview') as HTMLElement;
    previewContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <h3>No SOP Document</h3>
        <p>Generate an SOP from your conversation to see the preview here.</p>
      </div>
    `;

    // Reset document info
    const titleElement = this.container.querySelector('#documentTitle') as HTMLElement;
    const typeElement = this.container.querySelector('#documentType') as HTMLElement;
    const versionElement = this.container.querySelector('#documentVersion') as HTMLElement;
    const statusElement = this.container.querySelector('#documentStatus') as HTMLElement;

    titleElement.textContent = 'No Document Loaded';
    typeElement.textContent = '-';
    versionElement.textContent = 'v-';
    statusElement.textContent = '-';
  }
}