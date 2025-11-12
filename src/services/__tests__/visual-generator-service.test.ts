/**
 * Visual Generator Service Tests
 */

// Mock mermaid module
jest.mock('mermaid', () => ({
  initialize: jest.fn(),
  render: jest.fn().mockResolvedValue({ svg: '<svg>Mock SVG</svg>' })
}));

import { VisualGeneratorService } from '../visual-generator-service';
import { 
  WorkflowDefinition, 
  ChartDefinition, 
  ChartFormat, 
  ChartType,
  EventSequence,
  ProcessDefinition,
  ChartTheme,
  NodeType,
  EdgeType,
  WorkflowType,
  StepType,
  ComplexityLevel,
  TimeUnit,
  EventType,
  ActivityType,
  FlowType
} from '@/models';

describe('VisualGeneratorService', () => {
  let service: VisualGeneratorService;
  let mockWorkflow: WorkflowDefinition;
  let mockEventSequences: EventSequence[];
  let mockProcess: ProcessDefinition;

  beforeEach(() => {
    service = new VisualGeneratorService();
    
    // Mock workflow definition
    mockWorkflow = {
      id: 'test-workflow-1',
      title: 'Test Workflow',
      description: 'A test workflow for unit testing',
      type: WorkflowType.SEQUENTIAL,
      steps: [
        {
          id: 'step1',
          title: 'Initial Step',
          description: 'First step in the workflow',
          order: 1,
          type: StepType.MANUAL,
          inputs: [],
          outputs: [],
          prerequisites: [],
          instructions: ['Perform initial step'],
          qualityChecks: []
        },
        {
          id: 'step2',
          title: 'Decision Point',
          description: 'Make a decision',
          order: 2,
          type: StepType.DECISION,
          inputs: [],
          outputs: [],
          prerequisites: [],
          instructions: ['Make decision based on criteria'],
          qualityChecks: []
        },
        {
          id: 'step3',
          title: 'Final Step',
          description: 'Complete the workflow',
          order: 3,
          type: StepType.AUTOMATED,
          inputs: [],
          outputs: [],
          prerequisites: [],
          instructions: ['Complete the workflow'],
          qualityChecks: []
        }
      ],
      inputs: [],
      outputs: [],
      dependencies: [],
      risks: [],
      metadata: {
        author: 'Test Author',
        version: '1.0.0',
        tags: ['test'],
        category: 'testing',
        complexity: ComplexityLevel.LOW,
        estimatedDuration: { value: 2, unit: TimeUnit.HOURS },
        requiredSkills: ['basic']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock event sequences
    mockEventSequences = [
      {
        id: 'seq1',
        name: 'User Registration',
        events: [
          {
            id: 'event1',
            name: 'Submit Form',
            type: EventType.START,
            timestamp: new Date(),
            source: 'User',
            target: 'System'
          },
          {
            id: 'event2',
            name: 'Validate Data',
            type: EventType.INTERMEDIATE,
            timestamp: new Date(),
            source: 'System',
            target: 'Database'
          }
        ],
        triggers: []
      }
    ];

    // Mock process definition
    mockProcess = {
      id: 'proc1',
      name: 'Test Process',
      description: 'A test process',
      actors: [
        {
          id: 'user',
          name: 'User',
          role: 'End User',
          responsibilities: ['Submit requests']
        },
        {
          id: 'system',
          name: 'System',
          role: 'Automated System',
          responsibilities: ['Process requests']
        }
      ],
      activities: [
        {
          id: 'act1',
          name: 'Start Activity',
          description: 'Initial activity',
          type: ActivityType.TASK,
          actorId: 'user'
        },
        {
          id: 'act2',
          name: 'Process Activity',
          description: 'Processing activity',
          type: ActivityType.TASK,
          actorId: 'system'
        }
      ],
      flows: [
        {
          id: 'flow1',
          from: 'act1',
          to: 'act2',
          type: FlowType.SEQUENCE
        }
      ]
    };
  });

  describe('generateFlowchart', () => {
    it('should generate a flowchart from workflow definition', async () => {
      const result = await service.generateFlowchart(mockWorkflow);

      expect(result).toBeDefined();
      expect(result.type).toBe(ChartType.FLOWCHART);
      expect(result.title).toBe('Flowchart: Test Workflow');
      expect(result.data.nodes).toBeDefined();
      expect(result.data.edges).toBeDefined();
      expect(result.data.mermaidSyntax).toBeDefined();
      expect(result.metadata.sourceWorkflowId).toBe(mockWorkflow.id);
    });

    it('should include start and end nodes', async () => {
      const result = await service.generateFlowchart(mockWorkflow);

      const startNode = result.data.nodes?.find(node => node.type === NodeType.START);
      const endNode = result.data.nodes?.find(node => node.type === NodeType.END);

      expect(startNode).toBeDefined();
      expect(endNode).toBeDefined();
    });

    it('should handle decision nodes with conditions', async () => {
      const result = await service.generateFlowchart(mockWorkflow);

      const decisionNode = result.data.nodes?.find(node => node.type === NodeType.DECISION);
      expect(decisionNode).toBeDefined();

      // Should have sequence edges (since we removed conditions handling)
      const sequenceEdges = result.data.edges?.filter(edge => edge.type === EdgeType.SEQUENCE);
      expect(sequenceEdges?.length).toBeGreaterThan(0);
    });

    it('should generate valid Mermaid syntax', async () => {
      const result = await service.generateFlowchart(mockWorkflow);

      expect(result.data.mermaidSyntax).toContain('flowchart TD');
      expect(result.data.mermaidSyntax).toContain('start');
      expect(result.data.mermaidSyntax).toContain('end');
    });
  });

  describe('generateEventDiagram', () => {
    it('should generate an event diagram from event sequences', async () => {
      const result = await service.generateEventDiagram(mockEventSequences);

      expect(result).toBeDefined();
      expect(result.type).toBe(ChartType.EVENT_DIAGRAM);
      expect(result.data.timeline).toBeDefined();
      expect(result.data.mermaidSyntax).toBeDefined();
      expect(result.data.participants).toBeDefined();
    });

    it('should extract participants from events', async () => {
      const result = await service.generateEventDiagram(mockEventSequences);

      expect(result.data.participants).toContain('User');
      expect(result.data.participants).toContain('System');
    });

    it('should create timeline items from events', async () => {
      const result = await service.generateEventDiagram(mockEventSequences);

      expect(result.data.timeline?.length).toBeGreaterThan(0);
      const timelineItem = result.data.timeline?.[0];
      expect(timelineItem?.title).toBeDefined();
      expect(timelineItem?.start).toBeDefined();
    });

    it('should generate sequence diagram syntax', async () => {
      const result = await service.generateEventDiagram(mockEventSequences);

      expect(result.data.mermaidSyntax).toContain('sequenceDiagram');
      expect(result.data.mermaidSyntax).toContain('participant');
    });
  });

  describe('generateProcessMap', () => {
    it('should generate a process map from process definition', async () => {
      const result = await service.generateProcessMap(mockProcess);

      expect(result).toBeDefined();
      expect(result.type).toBe(ChartType.PROCESS_MAP);
      expect(result.title).toBe('Process Map: Test Process');
      expect(result.data.nodes).toBeDefined();
      expect(result.data.edges).toBeDefined();
    });

    it('should organize activities by actors', async () => {
      const result = await service.generateProcessMap(mockProcess);

      expect(result.data.actors).toContain('user');
      expect(result.data.actors).toContain('system');
    });

    it('should create flows between activities', async () => {
      const result = await service.generateProcessMap(mockProcess);

      const flow = result.data.edges?.find(edge => edge.source === 'act1' && edge.target === 'act2');
      expect(flow).toBeDefined();
    });
  });

  describe('generateSwimlaneChart', () => {
    it('should generate a swimlane chart from workflow', async () => {
      const result = await service.generateSwimlaneChart(mockWorkflow);

      expect(result).toBeDefined();
      expect(result.type).toBe(ChartType.SWIMLANE);
      expect(result.data.categories).toBeDefined();
      expect(result.data.actors).toBeDefined();
    });

    it('should create lanes for different actors', async () => {
      const result = await service.generateSwimlaneChart(mockWorkflow);

      expect(result.data.actors).toContain('User');
      expect(result.data.actors).toContain('System');
      // Note: Manager is not included since we derive actors from step types
    });

    it('should organize steps by actor lanes', async () => {
      const result = await service.generateSwimlaneChart(mockWorkflow);

      const categories = result.data.categories;
      expect(categories?.length).toBeGreaterThan(0);
      
      const userCategory = categories?.find(cat => cat.name === 'User');
      expect(userCategory).toBeDefined();
    });
  });

  describe('generateDecisionTree', () => {
    it('should generate a decision tree from workflow', async () => {
      const result = await service.generateDecisionTree(mockWorkflow);

      expect(result).toBeDefined();
      expect(result.type).toBe(ChartType.DECISION_TREE);
      expect(result.data.nodes).toBeDefined();
      expect(result.data.edges).toBeDefined();
    });

    it('should identify decision points', async () => {
      const result = await service.generateDecisionTree(mockWorkflow);

      expect(result.data.decisionPoints).toBe(1); // One decision step in mock workflow
    });

    it('should handle workflows without decisions', async () => {
      const simpleWorkflow: WorkflowDefinition = {
        ...mockWorkflow,
        steps: [
          {
            id: 'step1',
            title: 'Simple Step',
            description: 'A simple step',
            order: 1,
            type: StepType.MANUAL,
            inputs: [],
            outputs: [],
            prerequisites: [],
            instructions: ['Perform simple step'],
            qualityChecks: []
          }
        ]
      };

      const result = await service.generateDecisionTree(simpleWorkflow);

      expect(result).toBeDefined();
      expect(result.data.decisionPoints).toBe(0);
    });
  });

  describe('exportChart', () => {
    let mockChart: ChartDefinition;

    beforeEach(() => {
      mockChart = {
        id: 'test-chart-1',
        type: ChartType.FLOWCHART,
        title: 'Test Chart',
        data: {
          mermaidSyntax: 'flowchart TD\n    A --> B'
        },
        styling: service['getDefaultStyling'](),
        exportFormats: [ChartFormat.SVG, ChartFormat.PNG],
        metadata: {
          title: 'Test Chart',
          description: 'A test chart',
          author: 'Test',
          version: '1.0.0',
          tags: ['test'],
          generatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    it('should export chart to SVG format', async () => {
      const result = await service.exportChart(mockChart, ChartFormat.SVG);

      expect(result).toBeDefined();
      expect(result.format).toBe(ChartFormat.SVG);
      expect(result.filename).toBe(`${mockChart.id}.svg`);
      expect(result.data).toBeInstanceOf(ArrayBuffer);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        service.exportChart(mockChart, 'unsupported' as ChartFormat)
      ).rejects.toThrow('Unsupported export format');
    });

    it('should include export metadata', async () => {
      const result = await service.exportChart(mockChart, ChartFormat.SVG);

      expect(result.metadata.exportedAt).toBeInstanceOf(Date);
      expect(result.metadata.originalChartId).toBe(mockChart.id);
      expect(result.metadata.format).toBe(ChartFormat.SVG);
    });
  });

  describe('validateChart', () => {
    it('should validate chart definition', () => {
      const mockChart: ChartDefinition = {
        id: 'test-chart',
        type: ChartType.FLOWCHART,
        title: 'Test Chart',
        data: {},
        styling: service['getDefaultStyling'](),
        exportFormats: [ChartFormat.SVG],
        metadata: {
          title: 'Test Chart',
          description: 'Test',
          author: 'Test',
          version: '1.0.0',
          tags: [],
          generatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = service.validateChart(mockChart);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getSupportedChartTypes', () => {
    it('should return list of supported chart types', () => {
      const types = service.getSupportedChartTypes();

      expect(types).toContain(ChartType.FLOWCHART);
      expect(types).toContain(ChartType.EVENT_DIAGRAM);
      expect(types).toContain(ChartType.PROCESS_MAP);
      expect(types).toContain(ChartType.SWIMLANE);
      expect(types).toContain(ChartType.DECISION_TREE);
    });
  });

  describe('applyChartStyling', () => {
    it('should apply styling to chart', async () => {
      const originalDate = new Date('2023-01-01');
      const mockChart: ChartDefinition = {
        id: 'test-chart',
        type: ChartType.FLOWCHART,
        title: 'Test Chart',
        data: {},
        styling: service['getDefaultStyling'](),
        exportFormats: [ChartFormat.SVG],
        metadata: {
          title: 'Test Chart',
          description: 'Test',
          author: 'Test',
          version: '1.0.0',
          tags: [],
          generatedAt: new Date()
        },
        createdAt: originalDate,
        updatedAt: originalDate
      };

      const newStyling = {
        ...service['getDefaultStyling'](),
        theme: ChartTheme.DARK
      };

      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const result = service.applyChartStyling(mockChart, newStyling);

      expect(result.styling.theme).toBe(ChartTheme.DARK);
      expect(result.updatedAt.getTime()).toBeGreaterThan(mockChart.updatedAt.getTime());
    });
  });

  describe('chart integration methods', () => {
    let mockChart: ChartDefinition;

    beforeEach(() => {
      mockChart = {
        id: 'test-chart-1',
        type: ChartType.FLOWCHART,
        title: 'Test Chart',
        data: {
          mermaidSyntax: 'flowchart TD\n    A --> B'
        },
        styling: service['getDefaultStyling'](),
        exportFormats: [ChartFormat.SVG],
        metadata: {
          title: 'Test Chart',
          description: 'A test chart for SOP integration',
          author: 'Test',
          version: '1.0.0',
          tags: ['test'],
          generatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    describe('generateChartReference', () => {
      it('should generate inline chart reference', () => {
        const result = service.generateChartReference(mockChart, 'inline');
        expect(result).toContain('![Test Chart]');
        expect(result).toContain('data:image/svg+xml;base64');
      });

      it('should generate reference chart link', () => {
        const result = service.generateChartReference(mockChart, 'reference');
        expect(result).toBe('[Chart: Test Chart](charts/test-chart-1.svg)');
      });

      it('should generate attachment reference', () => {
        const result = service.generateChartReference(mockChart, 'attachment');
        expect(result).toContain('Chart Reference:');
        expect(result).toContain('test-chart-1.svg');
      });
    });

    describe('createChartEmbedding', () => {
      it('should create chart embedding HTML', () => {
        const result = service.createChartEmbedding(mockChart);
        
        expect(result).toContain('chart-embedding');
        expect(result).toContain('Test Chart');
        expect(result).toContain('mermaid');
        expect(result).toContain('flowchart TD');
      });

      it('should respect embedding options', () => {
        const result = service.createChartEmbedding(mockChart, {
          showTitle: false,
          showMetadata: true,
          responsive: false,
          width: 500,
          height: 300
        });

        expect(result).not.toContain('<h3 class="chart-title">');
        expect(result).toContain('chart-metadata');
        expect(result).toContain('width: 500px; height: 300px;');
      });
    });

    describe('createChartGallery', () => {
      it('should create chart gallery with multiple charts', () => {
        const charts = [mockChart, { ...mockChart, id: 'chart-2', title: 'Chart 2' }];
        const result = service.createChartGallery(charts, 'grid');

        expect(result).toContain('chart-gallery');
        expect(result).toContain('chart-gallery-grid');
        expect(result).toContain('Test Chart');
        expect(result).toContain('Chart 2');
        expect(result).toContain('viewChart');
        expect(result).toContain('downloadChart');
      });

      it('should support different gallery layouts', () => {
        const charts = [mockChart];
        
        const gridResult = service.createChartGallery(charts, 'grid');
        expect(gridResult).toContain('chart-gallery-grid');

        const listResult = service.createChartGallery(charts, 'list');
        expect(listResult).toContain('chart-gallery-list');
      });
    });
  });
});