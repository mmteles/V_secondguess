import { Router, Request, Response } from 'express';
import { ConversationManagerService } from '../../services/conversation-manager-service';
import { validateRequest } from '../middleware/validation';
import { authenticateUser } from '../middleware/auth';
import { logger } from '../../utils/logger';
import { ConversationInputRequest, ConversationResponse, ApiError } from '../types/api-types';
import { UserInputType } from '../../models/enums';

const router = Router();

/**
 * POST /api/conversations/:sessionId/input
 * Process user input in a conversation
 */
router.post('/:sessionId/input', authenticateUser, validateRequest('conversationInput'), async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;
    const { text, audioData, type } = req.body as ConversationInputRequest;
    
    const conversationManager = new ConversationManagerService();
    
    // Create user input object
    const userInput = {
      type: type === 'audio' ? UserInputType.VOICE : UserInputType.TEXT,
      content: text || (audioData ? 'audio_data' : ''),
      timestamp: new Date(),
      metadata: {
        text,
        audioData: audioData ? audioData.toString('base64') : undefined
      }
    };
    
    const conversationResponse = await conversationManager.processUserInput(sessionId, userInput);
    
    const response: ConversationResponse = {
      message: conversationResponse.message,
      requiresConfirmation: conversationResponse.requiresConfirmation,
      suggestedActions: conversationResponse.suggestedActions,
      shouldReadAloud: conversationResponse.shouldReadAloud,
      sessionId,
      timestamp: new Date().toISOString()
    };
    
    logger.info('Conversation input processed successfully', { sessionId, inputType: type });
    res.json(response);
    
  } catch (error) {
    logger.error('Failed to process conversation input:', error);
    const apiError: ApiError = {
      code: 'CONVERSATION_INPUT_FAILED',
      message: 'Failed to process conversation input',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json({ error: apiError });
  }
});

/**
 * POST /api/conversations/:sessionId/summary
 * Generate workflow summary
 */
router.post('/:sessionId/summary', authenticateUser, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;
    const conversationManager = new ConversationManagerService();
    
    const summary = await conversationManager.generateSummary(sessionId);
    
    logger.info('Workflow summary generated successfully', { sessionId });
    res.json(summary);
    
  } catch (error) {
    logger.error('Failed to generate summary:', error);
    const apiError: ApiError = {
      code: 'SUMMARY_GENERATION_FAILED',
      message: 'Failed to generate workflow summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json({ error: apiError });
  }
});

/**
 * GET /api/conversations/:sessionId/status
 * Get conversation status and iteration count
 */
router.get('/:sessionId/status', authenticateUser, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;
    const conversationManager = new ConversationManagerService();
    
    const isAtLimit = conversationManager.checkIterationLimit(sessionId);
    
    // TODO: Get actual conversation state and iteration count
    const response = {
      sessionId,
      isAtIterationLimit: isAtLimit,
      iterationCount: 0, // TODO: Get actual count
      state: 'active' // TODO: Get actual state
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('Failed to get conversation status:', error);
    const apiError: ApiError = {
      code: 'STATUS_RETRIEVAL_FAILED',
      message: 'Failed to retrieve conversation status',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json({ error: apiError });
  }
});

/**
 * POST /api/conversations/:sessionId/finalize
 * Finalize workflow and prepare for SOP generation
 */
router.post('/:sessionId/finalize', authenticateUser, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;
    const conversationManager = new ConversationManagerService();
    
    const workflowDefinition = await conversationManager.finalizeWorkflow(sessionId);
    
    logger.info('Workflow finalized successfully', { sessionId, workflowId: workflowDefinition.id });
    res.json(workflowDefinition);
    
  } catch (error) {
    logger.error('Failed to finalize workflow:', error);
    const apiError: ApiError = {
      code: 'WORKFLOW_FINALIZATION_FAILED',
      message: 'Failed to finalize workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json({ error: apiError });
  }
});

export default router;