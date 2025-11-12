/**
 * Service Container - Singleton pattern for shared service instances
 * Ensures all routes use the same service instances to maintain state
 */

import { ConversationManagerService } from './conversation-manager-service';
import { SOPGeneratorService } from './sop-generator-service';
import { DocumentExporterService } from './document-exporter-service';
import { VisualGeneratorService } from './visual-generator-service';

export class ServiceContainer {
  private static conversationManager: ConversationManagerService | null = null;
  private static sopGenerator: SOPGeneratorService | null = null;
  private static documentExporter: DocumentExporterService | null = null;
  private static visualGenerator: VisualGeneratorService | null = null;

  /**
   * Get shared ConversationManager instance
   */
  static getConversationManager(): ConversationManagerService {
    if (!this.conversationManager) {
      this.conversationManager = new ConversationManagerService();
    }
    return this.conversationManager;
  }

  /**
   * Get shared SOPGenerator instance
   */
  static getSOPGenerator(): SOPGeneratorService {
    if (!this.sopGenerator) {
      this.sopGenerator = new SOPGeneratorService();
    }
    return this.sopGenerator;
  }

  /**
   * Get shared DocumentExporter instance
   */
  static getDocumentExporter(): DocumentExporterService {
    if (!this.documentExporter) {
      this.documentExporter = new DocumentExporterService();
    }
    return this.documentExporter;
  }

  /**
   * Get shared VisualGenerator instance
   */
  static getVisualGenerator(): VisualGeneratorService {
    if (!this.visualGenerator) {
      this.visualGenerator = new VisualGeneratorService();
    }
    return this.visualGenerator;
  }

  /**
   * Reset all service instances (useful for testing)
   */
  static reset(): void {
    this.conversationManager = null;
    this.sopGenerator = null;
    this.documentExporter = null;
    this.visualGenerator = null;
  }
}
