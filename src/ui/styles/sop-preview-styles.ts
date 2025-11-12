export const sopPreviewStyles = `
  /* SOP Document Styles */
  .sop-document {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    font-family: 'Times New Roman', serif;
    line-height: 1.6;
    color: #333;
  }

  .preview-mode-print .sop-document {
    font-size: 12pt;
    margin: 0;
    max-width: none;
  }

  .preview-mode-web .sop-document {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 1000px;
  }

  /* Document Header */
  .document-header {
    border-bottom: 3px solid #667eea;
    padding-bottom: 20px;
    margin-bottom: 30px;
  }

  .document-title {
    font-size: 28px;
    font-weight: bold;
    color: #667eea;
    margin: 0 0 20px 0;
    text-align: center;
  }

  .document-metadata {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
  }

  .metadata-row {
    display: flex;
    justify-content: space-between;
  }

  .metadata-row .label {
    font-weight: bold;
    color: #495057;
  }

  .metadata-row .value {
    color: #6c757d;
  }

  .status-draft { color: #ffc107; }
  .status-review { color: #17a2b8; }
  .status-approved { color: #28a745; }
  .status-active { color: #28a745; }
  .status-archived { color: #6c757d; }
  .status-obsolete { color: #dc3545; }

  /* Table of Contents */
  .table-of-contents {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
  }

  .table-of-contents h2 {
    margin: 0 0 15px 0;
    color: #495057;
    font-size: 20px;
  }

  .toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc-item {
    margin-bottom: 8px;
  }

  .toc-link {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .toc-link:hover {
    color: #5a67d8;
    text-decoration: underline;
  }

  /* Document Sections */
  .document-section {
    margin-bottom: 40px;
    padding: 20px;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    position: relative;
  }

  .document-section.highlighted {
    background: #fff3cd;
    border-color: #ffc107;
    animation: highlight 3s ease-out;
  }

  @keyframes highlight {
    0% { background: #fff3cd; }
    100% { background: white; }
  }

  .section-title {
    color: #495057;
    font-size: 22px;
    margin: 0 0 15px 0;
    padding-bottom: 10px;
    border-bottom: 2px solid #e9ecef;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .edit-section-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    opacity: 0.6;
    transition: opacity 0.2s ease;
  }

  .edit-section-btn:hover {
    opacity: 1;
  }

  .section-content {
    margin-bottom: 20px;
  }

  .section-content p {
    margin: 0 0 15px 0;
    text-align: justify;
  }

  /* Charts */
  .section-charts {
    margin: 20px 0;
  }

  .chart-container {
    margin: 20px 0;
    text-align: center;
  }

  .chart-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    padding: 40px;
    border: 2px dashed #dee2e6;
    border-radius: 8px;
    background: #f8f9fa;
  }

  .chart-icon {
    font-size: 48px;
    opacity: 0.6;
  }

  .chart-info h4 {
    margin: 0 0 5px 0;
    color: #495057;
  }

  .chart-caption {
    margin: 0;
    font-style: italic;
    color: #6c757d;
  }

  /* Quality Checkpoints */
  .section-checkpoints {
    margin: 20px 0;
  }

  .quality-checkpoint {
    background: #e8f4fd;
    border-left: 4px solid #17a2b8;
    padding: 15px;
    margin: 15px 0;
    border-radius: 0 8px 8px 0;
  }

  .checkpoint-title {
    margin: 0 0 10px 0;
    color: #0c5460;
    font-size: 16px;
  }

  .checkpoint-criteria ul {
    margin: 10px 0;
    padding-left: 20px;
  }

  .checkpoint-criteria li {
    margin-bottom: 5px;
  }

  .checkpoint-meta {
    display: flex;
    gap: 20px;
    font-size: 14px;
    color: #0c5460;
    margin-top: 10px;
  }

  /* Subsections */
  .section-subsections {
    margin-top: 20px;
  }

  .subsection {
    margin: 20px 0;
    padding-left: 20px;
    border-left: 3px solid #e9ecef;
  }

  .subsection-title {
    color: #6c757d;
    font-size: 18px;
    margin: 0 0 10px 0;
  }

  .subsection-content {
    margin-bottom: 15px;
  }

  /* Document Footer */
  .document-footer {
    border-top: 3px solid #667eea;
    padding-top: 20px;
    margin-top: 40px;
  }

  .footer-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 20px;
  }

  .footer-info p {
    margin: 5px 0;
    font-size: 14px;
    color: #6c757d;
  }

  .document-references h3 {
    color: #495057;
    font-size: 18px;
    margin: 0 0 15px 0;
  }

  .references-list {
    list-style: decimal;
    padding-left: 20px;
  }

  .reference-item {
    margin-bottom: 8px;
    font-size: 14px;
  }

  .reference-item a {
    color: #667eea;
    text-decoration: none;
  }

  .reference-item a:hover {
    text-decoration: underline;
  }

  /* Dialog Styles */
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e9ecef;
  }

  .dialog-header h3 {
    margin: 0;
    color: #495057;
  }

  .dialog-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6c757d;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dialog-content {
    padding: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #495057;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s ease;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-group input[type="checkbox"] {
    width: auto;
    margin: 0;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #e9ecef;
  }

  .cancel-btn,
  .share-btn,
  .export-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .cancel-btn {
    background: #6c757d;
    color: white;
  }

  .cancel-btn:hover {
    background: #5a6268;
  }

  .share-btn,
  .export-btn {
    background: #667eea;
    color: white;
  }

  .share-btn:hover,
  .export-btn:hover {
    background: #5a67d8;
  }

  /* Notifications */
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    padding: 15px;
    max-width: 400px;
    z-index: 1001;
    animation: slideInRight 0.3s ease-out;
  }

  .notification.success {
    border-left: 4px solid #28a745;
  }

  .notification.error {
    border-left: 4px solid #dc3545;
  }

  .notification-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .notification-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .notification-text strong {
    display: block;
    margin-bottom: 5px;
    color: #495057;
  }

  .notification-text p {
    margin: 0;
    font-size: 14px;
    color: #6c757d;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Print Styles */
  @media print {
    .preview-header,
    .edit-section-btn {
      display: none !important;
    }

    .sop-document {
      font-size: 12pt;
      max-width: none;
      margin: 0;
    }

    .document-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .section-title {
      page-break-after: avoid;
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .preview-header {
      flex-direction: column;
      gap: 15px;
      align-items: stretch;
    }

    .preview-controls {
      flex-direction: column;
      gap: 15px;
    }

    .document-metadata {
      grid-template-columns: 1fr;
    }

    .footer-info {
      grid-template-columns: 1fr;
    }

    .checkpoint-meta {
      flex-direction: column;
      gap: 5px;
    }

    .dialog {
      width: 95%;
      margin: 10px;
    }
  }
`;