/**
 * Main entry point for the AI Voice SOP Agent
 */

import { logger } from './utils/logger';
import { getConfig, validateConfig } from './utils/config';
import { startServer } from './api/server';

async function main(): Promise<void> {
  try {
    logger.info('Starting AI Voice SOP Agent...');
    
    // Load and validate configuration
    const config = getConfig();
    const configErrors = validateConfig(config);
    
    if (configErrors.length > 0) {
      logger.error('Configuration validation failed:', { errors: configErrors });
      process.exit(1);
    }
    
    logger.info('Configuration validated successfully');
    
    // TODO: Initialize services
    // - Voice User Interface Service
    // - Speech-to-Text Service
    // - Conversation Manager Service
    // - SOP Generator Service
    // - Visual Generator Service
    // - Document Exporter Service
    // - Text-to-Speech Service
    
    // Start HTTP server with REST API endpoints
    await startServer();
    
    logger.info('AI Voice SOP Agent started successfully', {
      port: config.server.port,
      host: config.server.host
    });
    
  } catch (error) {
    logger.error('Failed to start AI Voice SOP Agent:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  // TODO: Cleanup resources
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  // TODO: Cleanup resources
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', { reason, promise });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main().catch((error) => {
    logger.error('Application startup failed:', error);
    process.exit(1);
  });
}