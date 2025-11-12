# AI Voice SOP Agent

An AI-powered conversational system that generates Standard Operating Procedures (SOPs) through voice-based interaction. The system receives workflow or process-related tasks from users, transcribes their voice input for validation and accuracy, and produces comprehensive SOPs for various organizational needs including workflow automation, process improvement, and staff training materials.

## 🚀 Current Status

**Production Ready** - The AI Voice SOP Agent is fully implemented with comprehensive features including:
- ✅ Complete REST API with authentication and rate limiting
- ✅ Real-time conversation management with session handling
- ✅ Advanced SOP generation with multiple templates and types
- ✅ Comprehensive monitoring and alerting system
- ✅ Document versioning and refinement capabilities
- ✅ Multi-format export (PDF, DOCX, HTML, Markdown)
- ✅ Visual chart generation (flowcharts, process maps, event diagrams)
- ✅ End-to-end testing suite with performance benchmarks
- ✅ Production-grade logging and error handling

## 📁 Project Structure

```
src/
├── api/                 # REST API implementation
│   ├── routes/          # API route handlers
│   │   ├── session.ts           # Session management endpoints
│   │   ├── conversation.ts      # Conversation handling endpoints
│   │   ├── sop.ts              # SOP generation and management
│   │   └── monitoring.ts       # System monitoring and health checks
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts             # Authentication and authorization
│   │   ├── rate-limiter.ts     # Rate limiting configuration
│   │   ├── error-handler.ts    # Global error handling
│   │   └── monitoring.ts       # Request monitoring and tracking
│   ├── server.ts        # Express server configuration
│   └── __tests__/       # API integration tests
├── services/            # Core business logic services
│   ├── conversation-manager-service.ts    # Conversation orchestration
│   ├── sop-generator-service.ts          # SOP generation engine
│   ├── document-exporter-service.ts      # Multi-format document export
│   ├── visual-generator-service.ts       # Chart and diagram generation
│   ├── document-versioning-service.ts    # Version control for documents
│   ├── sop-refinement-service.ts        # Document refinement and feedback
│   ├── service-orchestrator.ts          # Service coordination
│   └── __tests__/       # Service unit tests
├── models/              # Data models and type definitions
│   ├── conversation-models.ts    # Conversation and session types
│   ├── workflow-models.ts        # Workflow definition types
│   ├── sop-models.ts            # SOP document structure
│   ├── chart-models.ts          # Chart and visualization types
│   ├── validation-models.ts     # Validation result types
│   └── enums.ts                 # Enumeration definitions
├── utils/               # Utility functions and system components
│   ├── logger.ts               # Comprehensive logging system
│   ├── config.ts               # Configuration management
│   ├── service-monitor.ts      # Service call monitoring
│   ├── system-monitor.ts       # System health monitoring
│   ├── alerting.ts            # Alert management system
│   └── __tests__/             # Utility tests
├── ui/                  # User interface components (React-based)
│   ├── components/      # Reusable UI components
│   ├── pages/          # Application pages
│   ├── hooks/          # Custom React hooks
│   └── __tests__/      # UI component tests
└── index.ts            # Application entry point
```

## 🏗️ Core Architecture

### API Layer
- **RESTful API**: Complete REST API with OpenAPI documentation
- **Authentication**: JWT-based authentication with role-based access control
- **Rate Limiting**: Configurable rate limiting per endpoint and user
- **Monitoring**: Real-time request tracking and performance metrics
- **Error Handling**: Comprehensive error handling with structured responses

### Conversation Management
- **Session Handling**: Stateful conversation sessions with persistence
- **Context Management**: Maintains conversation context across interactions
- **5-Iteration Checkpoint**: Implements user review checkpoints every 5 inputs
- **Input Processing**: Handles both text and audio input with validation
- **Response Generation**: Intelligent response generation with suggested actions

### SOP Generation Engine
- **Template System**: Multiple SOP templates for different use cases
- **Content Generation**: AI-powered content generation with structured output
- **Quality Assurance**: Built-in validation and quality checkpoints
- **Risk Assessment**: Automatic identification of risks and mitigation strategies
- **Compliance Integration**: Industry-standard compliance requirements

### Document Management
- **Version Control**: Complete document versioning with diff tracking
- **Refinement System**: Feedback processing and iterative improvement
- **Multi-format Export**: PDF, DOCX, HTML, and Markdown export
- **Template Engine**: Customizable document templates and styling
- **Collaboration**: Multi-user editing and review workflows

### Visual Generation
- **Chart Types**: Flowcharts, process maps, event diagrams, swimlanes
- **Dynamic Generation**: Automatic chart generation from workflow data
- **Export Formats**: SVG, PNG, PDF chart export
- **Styling**: Customizable chart themes and styling options
- **Integration**: Seamless integration with document export

### Monitoring & Observability
- **System Health**: Real-time system health monitoring
- **Performance Metrics**: Response time, throughput, and error rate tracking
- **Service Monitoring**: Individual service health and performance
- **Alerting**: Configurable alerts for system issues
- **Logging**: Structured logging with multiple output formats

## ✨ Key Features

### 🎙️ Conversational Interface
- **Natural Language Processing**: Understands complex workflow descriptions
- **Voice & Text Input**: Supports both audio and text-based interaction
- **Context Awareness**: Maintains conversation context across sessions
- **Smart Prompting**: Intelligent follow-up questions for complete documentation
- **5-Iteration Checkpoints**: Built-in review points for user validation

### 📋 SOP Generation
- **Multiple SOP Types**: 
  - Process Improvement SOPs
  - Training & Onboarding SOPs  
  - Workflow Automation SOPs
- **Template Library**: Industry-standard SOP templates
- **Quality Checkpoints**: Automated validation and completeness checks
- **Risk Assessment**: Identifies potential risks and mitigation strategies
- **Compliance Ready**: Meets regulatory and industry standards

### 📊 Visual Documentation
- **Automatic Chart Generation**: Creates flowcharts, process maps, and event diagrams
- **Multiple Chart Types**: Swimlane diagrams, decision trees, BPMN diagrams
- **Export Formats**: SVG, PNG, PDF for charts and diagrams
- **Customizable Styling**: Professional themes and branding options

### 📄 Document Management
- **Version Control**: Complete version history with diff tracking
- **Collaborative Editing**: Multi-user review and refinement workflows
- **Export Options**: PDF, DOCX, HTML, Markdown formats
- **Template System**: Customizable document templates
- **Batch Operations**: Bulk export and processing capabilities

### 🔧 Enterprise Features
- **Authentication & Authorization**: JWT-based security with role management
- **Rate Limiting**: Configurable limits to prevent abuse
- **Monitoring & Alerting**: Real-time system health and performance monitoring
- **Audit Logging**: Complete audit trail for compliance
- **API Documentation**: OpenAPI/Swagger documentation
- **Scalability**: Horizontal scaling support with load balancing

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Web Framework**: Express.js with comprehensive middleware
- **Authentication**: JWT with bcrypt for password hashing
- **Rate Limiting**: Express-rate-limit with Redis support
- **Validation**: Joi for request validation
- **Logging**: Winston with structured logging

### Document Processing
- **PDF Generation**: Puppeteer for high-quality PDF export
- **Word Documents**: docx library for .docx file generation
- **Chart Generation**: Mermaid, D3.js, and Chart.js integration
- **Template Engine**: Custom template system with Handlebars
- **File Processing**: Sharp for image processing, archiver for ZIP files

### Data & Storage
- **Session Management**: In-memory with Redis clustering support
- **Document Storage**: File system with cloud storage adapters
- **Version Control**: Custom versioning system with diff tracking
- **Caching**: Multi-layer caching for performance optimization

### Monitoring & Observability
- **Health Monitoring**: Custom system health monitoring
- **Metrics Collection**: Performance and usage metrics
- **Alerting**: Multi-channel alerting system (console, file, webhook, email)
- **Error Tracking**: Comprehensive error logging and tracking

### Testing & Quality
- **Testing Framework**: Jest with TypeScript support
- **Test Types**: Unit, integration, and end-to-end tests
- **Performance Testing**: Load testing and benchmarking
- **Code Quality**: ESLint, Prettier, and TypeScript strict mode
- **Coverage**: Code coverage reporting with Istanbul

### Frontend (UI Components)
- **Framework**: React 18 with TypeScript
- **State Management**: React hooks and context
- **Styling**: CSS modules with responsive design
- **Testing**: React Testing Library and Jest

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm 8+** or **yarn 1.22+**
- **Git** for version control
- **Optional**: Redis for session clustering (production)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd ai-voice-sop-agent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the project
npm run build

# Start the development server
npm run dev

# In another terminal, run tests
npm test

# Check code quality
npm run lint
npm run type-check
```

### Environment Configuration

Create a `.env` file in the root directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost
API_BASE_URL=http://localhost:3000

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
CONSOLE_LOGGING=true
FILE_LOGGING=true
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_RETENTION_PERIOD=86400000  # 24 hours
ENABLE_ALERTS=true
ALERT_COOLDOWN=300000  # 5 minutes

# Document Export
EXPORT_TEMP_DIR=./temp
EXPORT_OUTPUT_DIR=./exports
PDF_TIMEOUT=30000
DOCX_TEMPLATE_DIR=./templates

# Performance Thresholds
RESPONSE_TIME_THRESHOLD=5000
ERROR_RATE_THRESHOLD=0.1
MEMORY_USAGE_THRESHOLD=80
CPU_USAGE_THRESHOLD=80

# Optional: Redis Configuration (for production clustering)
# REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=your-redis-password
```

### Development Workflow

```bash
# Start development server with hot reload
npm run dev

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm test -- --testPathPattern="api"
npm test -- --testPathPattern="services"
npm test -- --testPathPattern="integration"

# Generate test coverage report
npm run test:coverage

# Lint and fix code issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

## 📖 API Documentation

### Core Endpoints

#### Session Management
```bash
# Create a new conversation session
POST /api/sessions
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user-123"
}

# Get session information
GET /api/sessions/{sessionId}
Authorization: Bearer <token>

# Delete session
DELETE /api/sessions/{sessionId}
Authorization: Bearer <token>
```

#### Conversation Management
```bash
# Send conversation input (text or audio)
POST /api/conversations/{sessionId}/input
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "I need to create a workflow for customer onboarding",
  "type": "text"
}

# Generate workflow summary
POST /api/conversations/{sessionId}/summary
Authorization: Bearer <token>

# Finalize workflow
POST /api/conversations/{sessionId}/finalize
Authorization: Bearer <token>
```

#### SOP Management
```bash
# Generate SOP from workflow
POST /api/sops
Content-Type: application/json
Authorization: Bearer <token>

{
  "workflowDefinition": { ... },
  "sopType": "process_improvement"
}

# Export SOP in specific format
POST /api/sops/{sopId}/export
Content-Type: application/json
Authorization: Bearer <token>

{
  "format": "pdf",
  "options": {
    "includeCharts": true,
    "template": "standard"
  }
}
```

#### Monitoring & Health
```bash
# System health check
GET /health

# Detailed system metrics
GET /metrics
Authorization: Bearer <token>

# Service-specific metrics
GET /metrics/service/{serviceName}
Authorization: Bearer <token>
```

## 🧪 Testing

### Test Suites

The project includes comprehensive testing at multiple levels:

- **Unit Tests**: Individual component and service testing
- **Integration Tests**: API endpoint and service integration testing
- **End-to-End Tests**: Complete workflow testing from input to output
- **Performance Tests**: Load testing and performance benchmarking
- **System Tests**: Monitoring and alerting system validation

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm test -- --testPathPattern="unit"
npm test -- --testPathPattern="integration"
npm test -- --testPathPattern="e2e"
npm test -- --testPathPattern="performance"

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with verbose output
npm test -- --verbose
```

### Test Coverage

Current test coverage includes:
- ✅ API endpoints (100% route coverage)
- ✅ Service layer (95%+ code coverage)
- ✅ Utility functions (100% coverage)
- ✅ Error handling scenarios
- ✅ Performance benchmarks
- ✅ Integration workflows

## 🔧 Configuration

### Logging Configuration

The system uses structured logging with multiple output formats:

```typescript
// Logger configuration in src/utils/logger.ts
{
  level: 'info',           // debug, info, warn, error
  format: 'json',          // json, simple
  console: {
    enabled: true,
    colorize: true
  },
  file: {
    enabled: true,
    path: './logs/app.log',
    maxSize: '10m',
    maxFiles: 5
  }
}
```

### Monitoring Configuration

System monitoring includes:

```typescript
// Monitoring configuration in src/utils/system-monitor.ts
{
  healthCheckInterval: 30000,      // 30 seconds
  metricsRetentionPeriod: 86400000, // 24 hours
  alertThresholds: {
    responseTime: 5000,            // 5 seconds
    errorRate: 0.1,               // 10%
    memoryUsage: 80,              // 80%
    cpuUsage: 80                  // 80%
  }
}
```

## 🚀 Deployment

### Production Deployment

```bash
# Build for production
npm run build

# Set production environment
export NODE_ENV=production

# Start production server
npm start

# Or use PM2 for process management
pm2 start ecosystem.config.js
```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment-Specific Configuration

- **Development**: Hot reload, verbose logging, test data
- **Staging**: Production-like setup with test data
- **Production**: Optimized performance, security hardening, monitoring

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: Follow TypeScript best practices and ESLint rules
2. **Testing**: Write tests for all new features and bug fixes
3. **Documentation**: Update README and API documentation for changes
4. **Type Safety**: Maintain strict TypeScript compliance
5. **Performance**: Consider performance impact of changes
6. **Security**: Follow security best practices for authentication and data handling

### Pull Request Process

1. Fork the repository and create a feature branch
2. Implement changes with comprehensive tests
3. Ensure all tests pass and code coverage is maintained
4. Update documentation as needed
5. Submit pull request with detailed description

### Code Quality Standards

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Enforced code style and best practices
- **Prettier**: Consistent code formatting
- **Jest**: Comprehensive test coverage (>90%)
- **Security**: Regular dependency audits and security scanning

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions, issues, or contributions:

1. **Issues**: Use GitHub Issues for bug reports and feature requests
2. **Documentation**: Check the `/docs` directory for detailed documentation
3. **API Reference**: OpenAPI documentation available at `/api-docs` when running
4. **Performance**: Monitor system health at `/health` and `/metrics` endpoints

---

**Built with ❤️ using TypeScript, Node.js, and modern web technologies.**