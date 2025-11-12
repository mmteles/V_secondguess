import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '../utils/logger';
import { getConfig } from '../utils/config';
import { systemMonitor } from '../utils/system-monitor';

// Import routes
import sessionRoutes from './routes/session';
import conversationRoutes from './routes/conversation';
import sopRoutes from './routes/sop';
import monitoringRoutes from './routes/monitoring';
import dashboardRoutes from './routes/dashboard';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { rateLimit, rateLimitConfigs } from './middleware/rate-limiter';
import { 
  comprehensiveMonitoringMiddleware,
  errorTrackingMiddleware,
  routeSpecificMonitoring
} from './middleware/monitoring';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();
  const config = getConfig();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "http://localhost:3000"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  app.use(cors({
    origin: config.server.cors?.origin || ['http://localhost:3000'],
    credentials: config.server.cors?.credentials || true,
    methods: config.server.cors?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' })); // Increased limit for audio data
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);

  // Comprehensive monitoring middleware
  app.use(comprehensiveMonitoringMiddleware);

  // Serve static files from public directory
  app.use(express.static('public'));

  // Monitoring routes (includes health check)
  app.use('/api/monitoring', monitoringRoutes);
  
  // Dashboard routes
  app.use('/dashboard', dashboardRoutes);

  // API routes with rate limiting and route-specific monitoring
  app.use('/api/sessions', 
    rateLimit(rateLimitConfigs.general), 
    routeSpecificMonitoring('sessions'),
    sessionRoutes
  );
  app.use('/api/conversations', 
    rateLimit(rateLimitConfigs.conversation), 
    routeSpecificMonitoring('conversations'),
    conversationRoutes
  );
  app.use('/api/sops', 
    rateLimit(rateLimitConfigs.sopGeneration), 
    routeSpecificMonitoring('sops'),
    sopRoutes
  );

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Error tracking middleware
  app.use(errorTrackingMiddleware);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the HTTP server
 */
export async function startServer(): Promise<void> {
  try {
    const app = createApp();
    const config = getConfig();
    
    const port = config.server.port || 3000;
    const host = config.server.host || 'localhost';

    const server = app.listen(port, host, () => {
      logger.info('API server started successfully', {
        port,
        host,
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        logger.info('Server closed successfully');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection:', { reason, promise });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start API server:', error);
    throw error;
  }
}