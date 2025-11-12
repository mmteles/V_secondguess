import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../../utils/logger';
import { ValidationSchema, ApiError } from '../types/api-types';

// Validation schemas
const schemas: Record<ValidationSchema, Joi.ObjectSchema> = {
  sessionCreate: Joi.object({
    userId: Joi.string().required().min(1).max(255)
  }),
  
  conversationInput: Joi.object({
    text: Joi.string().optional().max(10000),
    audioData: Joi.binary().optional(),
    type: Joi.string().valid('text', 'audio').required()
  }).or('text', 'audioData'), // At least one of text or audioData must be present
  
  sopGeneration: Joi.object({
    workflowDefinition: Joi.object({
      id: Joi.string().required(),
      title: Joi.string().required().max(255),
      description: Joi.string().required().max(2000),
      type: Joi.string().valid('automation', 'process_improvement', 'training').required(),
      steps: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required(),
        description: Joi.string().required(),
        order: Joi.number().integer().min(0).required(),
        prerequisites: Joi.array().items(Joi.string()).default([]),
        outcomes: Joi.array().items(Joi.string()).default([])
      })).required(),
      inputs: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
        description: Joi.string().required(),
        required: Joi.boolean().default(true)
      })).default([]),
      outputs: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
        description: Joi.string().required()
      })).default([]),
      dependencies: Joi.array().items(Joi.object({
        type: Joi.string().required(),
        description: Joi.string().required(),
        critical: Joi.boolean().default(false)
      })).default([]),
      risks: Joi.array().items(Joi.object({
        description: Joi.string().required(),
        severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
        mitigation: Joi.string().required(),
        probability: Joi.string().valid('low', 'medium', 'high').required()
      })).default([])
    }).required(),
    sopType: Joi.string().valid('automation', 'process_improvement', 'training').required()
  }),
  
  sopUpdate: Joi.object({
    changes: Joi.object({
      title: Joi.string().optional().max(255),
      description: Joi.string().optional().max(2000),
      sections: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required(),
        content: Joi.string().required(),
        type: Joi.string().required(),
        order: Joi.number().integer().min(0).required()
      })).optional(),
      metadata: Joi.object().optional()
    }).required()
  }),
  
  sopExport: Joi.object({
    format: Joi.string().valid('pdf', 'docx', 'html').required(),
    options: Joi.object({
      includeCharts: Joi.boolean().default(true),
      template: Joi.string().optional(),
      styling: Joi.object().optional()
    }).optional()
  })
};

/**
 * Request validation middleware factory
 */
export const validateRequest = (schemaName: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const schema = schemas[schemaName];
      
      if (!schema) {
        logger.error('Unknown validation schema:', { schemaName });
        const error: ApiError = {
          code: 'INTERNAL_ERROR',
          message: 'Internal validation error',
          timestamp: new Date().toISOString()
        };
        res.status(500).json({ error });
        return;
      }
      
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });
      
      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        logger.warn('Request validation failed:', { 
          schemaName, 
          errors: validationErrors,
          path: req.path 
        });
        
        const apiError: ApiError = {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: JSON.stringify(validationErrors),
          timestamp: new Date().toISOString()
        };
        
        res.status(400).json({ error: apiError });
        return;
      }
      
      // Replace request body with validated and sanitized data
      req.body = value;
      
      logger.debug('Request validation passed', { schemaName, path: req.path });
      next();
      
    } catch (error) {
      logger.error('Validation middleware error:', error);
      const apiError: ApiError = {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json({ error: apiError });
    }
  };
};

/**
 * Query parameter validation middleware factory
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });
      
      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        logger.warn('Query validation failed:', { 
          errors: validationErrors,
          path: req.path 
        });
        
        const apiError: ApiError = {
          code: 'QUERY_VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          details: JSON.stringify(validationErrors),
          timestamp: new Date().toISOString()
        };
        
        res.status(400).json({ error: apiError });
        return;
      }
      
      // Replace query with validated and sanitized data
      req.query = value;
      next();
      
    } catch (error) {
      logger.error('Query validation middleware error:', error);
      const apiError: ApiError = {
        code: 'QUERY_VALIDATION_ERROR',
        message: 'Query parameter validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      res.status(500).json({ error: apiError });
    }
  };
};