import { Router, Request, Response } from 'express';
import { ConversationManagerService } from '../../services/conversation-manager-service';
import { validateRequest } from '../middleware/validation';
import { authenticateUser } from '../middleware/auth';
import { logger } from '../../utils/logger';
import { SessionCreateRequest, SessionResponse, ApiError } from '../types/api-types';

const router = Router();

/**
 * POST /api/sessions
 * Create a new conversation session
 */
router.post('/', authenticateUser, validateRequest('sessionCreate'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as SessionCreateRequest;
    const conversationManager = new ConversationManagerService();
    
    const sessionId = await conversationManager.startSession(userId);
    
    const response: SessionResponse = {
      sessionId,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    logger.info('Session created successfully', { sessionId, userId });
    res.status(201).json(response);
    
  } catch (error) {
    logger.error('Failed to create session:', error);
    const apiError: ApiError = {
      code: 'SESSION_CREATION_FAILED',
      message: 'Failed to create conversation session',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json({ error: apiError });
  }
});

/**
 * GET /api/sessions/:sessionId
 * Get session information
 */
router.get('/:sessionId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;
    const conversationManager = new ConversationManagerService();
    
    // TODO: Implement getSession method in ConversationManagerService
    // const session = await conversationManager.getSession(sessionId);
    
    const response: SessionResponse = {
      sessionId,
      status: 'active', // TODO: Get actual status from session
      createdAt: new Date().toISOString() // TODO: Get actual creation time
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('Failed to get session:', error);
    const apiError: ApiError = {
      code: 'SESSION_NOT_FOUND',
      message: 'Session not found',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(404).json({ error: apiError });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * End a conversation session
 */
router.delete('/:sessionId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId!;
    const conversationManager = new ConversationManagerService();
    
    // TODO: Implement endSession method in ConversationManagerService
    // await conversationManager.endSession(sessionId);
    
    logger.info('Session ended successfully', { sessionId });
    res.status(204).send();
    
  } catch (error) {
    logger.error('Failed to end session:', error);
    const apiError: ApiError = {
      code: 'SESSION_END_FAILED',
      message: 'Failed to end session',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json({ error: apiError });
  }
});

export default router;