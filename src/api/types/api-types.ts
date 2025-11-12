import { SOPType, WorkflowDefinition, SOPDocument, SOPChanges, ValidationResult } from '../../models';

// Request types
export interface SessionCreateRequest {
  userId: string;
}

export interface ConversationInputRequest {
  text?: string;
  audioData?: Buffer;
  type: 'text' | 'audio';
}

export interface SOPGenerationRequest {
  workflowDefinition: WorkflowDefinition;
  sopType: SOPType;
}

export interface SOPUpdateRequest {
  changes: SOPChanges;
}

export interface SOPExportRequest {
  format: 'pdf' | 'docx' | 'html';
  options?: {
    includeCharts?: boolean;
    template?: string;
    styling?: Record<string, any>;
  };
}

// Response types
export interface SessionResponse {
  sessionId: string;
  status: 'active' | 'ended';
  createdAt: string;
}

export interface ConversationResponse {
  message: string;
  requiresConfirmation: boolean;
  suggestedActions: string[];
  shouldReadAloud: boolean;
  sessionId: string;
  timestamp: string;
}

export interface SOPResponse extends SOPDocument {
  // Additional API-specific fields can be added here
}

export interface ValidationResponse extends ValidationResult {
  sopId: string;
  validatedAt: string;
}

export interface ExportResponse {
  downloadUrl: string;
  format: string;
  size: number;
  generatedAt: string;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: string;
  timestamp?: string;
}

export interface ErrorResponse {
  error: ApiError;
}

// Authentication types
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Validation schema names
export type ValidationSchema = 
  | 'sessionCreate'
  | 'conversationInput'
  | 'sopGeneration'
  | 'sopUpdate'
  | 'sopExport';