/**
 * Visual Generator Service Implementation
 * Creates business modeling charts and diagrams using Mermaid and D3.js
 */

import mermaid from 'mermaid';
import { VisualGenerator, FlowDirection } from '@/interfaces';
import { 
  WorkflowDefinition, 
  ChartDefinition, 
  ChartFormat, 
  ChartExport, 
  EventSequence, 
  ProcessDefinition,
  ValidationResult,
  ChartType,
  NodeType,
  EdgeType,
  ChartStyling,
  ChartTheme,
  ChartAlignment,
  ChartOrientation,
  StepType,
  ActivityType,
  EventType
} from '@/models';

// Initialize Mermaid with default configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  }
});

export class VisualGeneratorService implements VisualGenerator {
  async generateFlowchart(workflow: WorkflowDefinition): Promise<ChartDefinition> {
    const nodes: any[] = [];
    const edges: any[] = [];
    
    // Generate Mermaid flowchart syntax
    let mermaidSyntax = 'flowchart TD\n';
    
    // Add start node
    const startNodeId = 'start';
    mermaidSyntax += `    ${startNodeId}([Start: ${workflow.title}])\n`;
    nodes.push({
      id: startNodeId,
      label: `Start: ${workflow.title}`,
      type: NodeType.START,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 }
    });
    
    // Process workflow steps
    let previousNodeId = startNodeId;
    workflow.steps.forEach((step, index) => {
      const stepNodeId = `step_${index}`;
      const nodeType = step.type === StepType.DECISION ? NodeType.DECISION : NodeType.PROCESS;
      const shape = nodeType === NodeType.DECISION ? '{}' : '[]';
      
      mermaidSyntax += `    ${stepNodeId}${shape[0]}${step.title}${shape[1]}\n`;
      mermaidSyntax += `    ${previousNodeId} --> ${stepNodeId}\n`;
      
      nodes.push({
        id: stepNodeId,
        label: step.title,
        type: nodeType,
        position: { x: 0, y: (index + 1) * 100 },
        size: { width: 150, height: 80 },
        data: { description: step.description, duration: step.duration }
      });
      
      edges.push({
        id: `${previousNodeId}-to-${stepNodeId}`,
        source: previousNodeId,
        target: stepNodeId,
        type: EdgeType.SEQUENCE
      });
      
      previousNodeId = stepNodeId;
    });
    
    // Add end node
    const endNodeId = 'end';
    mermaidSyntax += `    ${endNodeId}([End])\n`;
    mermaidSyntax += `    ${previousNodeId} --> ${endNodeId}\n`;
    
    nodes.push({
      id: endNodeId,
      label: 'End',
      type: NodeType.END,
      position: { x: 0, y: (workflow.steps.length + 1) * 100 },
      size: { width: 80, height: 40 }
    });
    
    edges.push({
      id: `${previousNodeId}-to-${endNodeId}`,
      source: previousNodeId,
      target: endNodeId,
      type: EdgeType.SEQUENCE
    });
    
    return {
      id: `flowchart-${workflow.id}`,
      type: ChartType.FLOWCHART,
      title: `Flowchart: ${workflow.title}`,
      data: {
        nodes,
        edges,
        mermaidSyntax // Store the Mermaid syntax for rendering
      },
      styling: this.getDefaultStyling(),
      exportFormats: [ChartFormat.SVG, ChartFormat.PNG, ChartFormat.PDF],
      metadata: {
        title: `Flowchart: ${workflow.title}`,
        description: 'Generated flowchart from workflow definition',
        author: 'AI Voice SOP Agent',
        version: '1.0.0',
        tags: ['flowchart', 'workflow'],
        sourceWorkflowId: workflow.id,
        generatedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async generateEventDiagram(events: EventSequence[]): Promise<ChartDefinition> {
    const nodes: any[] = [];
    const edges: any[] = [];
    const timeline: any[] = [];
    
    // Generate Mermaid sequence diagram syntax
    let mermaidSyntax = 'sequenceDiagram\n';
    
    // Extract participants from events
    const participants = new Set<string>();
    events.forEach(sequence => {
      sequence.events.forEach(event => {
        if (event.source) participants.add(event.source);
        if (event.target) participants.add(event.target);
      });
    });
    
    // Add participants to diagram
    participants.forEach(participant => {
      mermaidSyntax += `    participant ${participant}\n`;
    });
    
    mermaidSyntax += '\n';
    
    // Process event sequences
    events.forEach((sequence, seqIndex) => {
      if (sequence.name) {
        mermaidSyntax += `    Note over ${Array.from(participants).join(',')}: ${sequence.name}\n`;
      }
      
      sequence.events.forEach((event, eventIndex) => {
        const eventId = `event_${seqIndex}_${eventIndex}`;
        
        // Add to timeline
        timeline.push({
          id: eventId,
          title: event.name,
          start: event.timestamp || new Date(),
          category: event.type.toString(),
          description: `Event: ${event.name}`
        });
        
        // Add to nodes
        nodes.push({
          id: eventId,
          label: event.name,
          type: NodeType.PROCESS,
          position: { x: eventIndex * 150, y: seqIndex * 100 },
          size: { width: 120, height: 60 },
          data: { 
            source: event.source,
            target: event.target,
            timestamp: event.timestamp,
            type: event.type
          }
        });
        
        // Generate sequence diagram syntax
        if (event.source && event.target) {
          const message = event.name || 'Action';
          mermaidSyntax += `    ${event.source}->>+${event.target}: ${message}\n`;
          
          // Add edge
          edges.push({
            id: `${event.source}-to-${event.target}`,
            source: event.source,
            target: event.target,
            type: EdgeType.MESSAGE,
            label: message
          });
        } else if (event.source) {
          mermaidSyntax += `    Note right of ${event.source}: ${event.name}\n`;
        }
        
        // Add activation/deactivation based on event type
        if (event.type === EventType.START && event.target) {
          mermaidSyntax += `    activate ${event.target}\n`;
        }
        if (event.type === EventType.END && event.source) {
          mermaidSyntax += `    deactivate ${event.source}\n`;
        }
      });
      
      mermaidSyntax += '\n';
    });
    
    return {
      id: `event-diagram-${Date.now()}`,
      type: ChartType.EVENT_DIAGRAM,
      title: 'Event Diagram',
      data: {
        nodes,
        edges,
        timeline,
        mermaidSyntax,
        participants: Array.from(participants)
      },
      styling: this.getDefaultStyling(),
      exportFormats: [ChartFormat.SVG, ChartFormat.PNG],
      metadata: {
        title: 'Event Diagram',
        description: 'Generated event diagram from event sequences',
        author: 'AI Voice SOP Agent',
        version: '1.0.0',
        tags: ['event-diagram', 'timeline', 'sequence'],
        generatedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async generateProcessMap(process: ProcessDefinition): Promise<ChartDefinition> {
    const nodes: any[] = [];
    const edges: any[] = [];
    
    // Generate Mermaid flowchart for process map
    let mermaidSyntax = 'flowchart LR\n';
    
    // Add activities directly (no phases in the model)
    process.activities.forEach(activity => {
      const nodeId = activity.id.replace(/\s+/g, '_');
      const shape = activity.type === ActivityType.TASK ? '[]' : '{}';
      mermaidSyntax += `    ${nodeId}${shape[0]}${activity.name}${shape[1]}\n`;
      
      nodes.push({
        id: activity.id,
        label: activity.name,
        type: activity.type === ActivityType.TASK ? NodeType.PROCESS : NodeType.DECISION,
        position: { x: 0, y: 0 },
        size: { width: 150, height: 80 },
        data: { 
          actorId: activity.actorId,
          duration: activity.duration
        }
      });
    });
    
    // Add flows between activities
    process.flows.forEach(flow => {
      const sourceId = flow.from.replace(/\s+/g, '_');
      const targetId = flow.to.replace(/\s+/g, '_');
      
      if (flow.condition) {
        mermaidSyntax += `    ${sourceId} -->|${flow.condition}| ${targetId}\n`;
      } else {
        mermaidSyntax += `    ${sourceId} --> ${targetId}\n`;
      }
      
      edges.push({
        id: flow.id,
        source: flow.from,
        target: flow.to,
        type: flow.condition ? EdgeType.CONDITIONAL : EdgeType.SEQUENCE,
        label: flow.condition
      });
    });
    
    // Add styling for different actors
    const actors = new Set(process.activities.map(activity => activity.actorId).filter(Boolean));
    const actorArray = Array.from(actors);
    actorArray.forEach((actor, index) => {
      const colors = ['#e1f5fe', '#f3e5f5', '#e8f5e8', '#fff3e0', '#fce4ec'];
      const color = colors[index % colors.length];
      
      process.activities
        .filter(activity => activity.actorId === actor)
        .forEach(activity => {
          const nodeId = activity.id.replace(/\s+/g, '_');
          mermaidSyntax += `    style ${nodeId} fill:${color}\n`;
        });
    });
    
    return {
      id: `process-map-${process.id}`,
      type: ChartType.PROCESS_MAP,
      title: `Process Map: ${process.name}`,
      data: {
        nodes,
        edges,
        mermaidSyntax,
        actors: actorArray
      },
      styling: this.getDefaultStyling(),
      exportFormats: [ChartFormat.SVG, ChartFormat.PNG],
      metadata: {
        title: `Process Map: ${process.name}`,
        description: 'Generated process map from process definition',
        author: 'AI Voice SOP Agent',
        version: '1.0.0',
        tags: ['process-map', 'workflow', 'business-process'],
        generatedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async generateSwimlaneChart(workflow: WorkflowDefinition): Promise<ChartDefinition> {
    const nodes: any[] = [];
    const edges: any[] = [];
    const categories: any[] = [];
    
    // Extract actors from workflow steps (using step type as actor for demo)
    const actors = new Set<string>();
    workflow.steps.forEach(step => {
      // Since WorkflowStep doesn't have actor info, we'll use step type as a proxy
      const actor = step.type === StepType.AUTOMATED ? 'System' : 'User';
      actors.add(actor);
    });
    
    // Ensure we have at least default lanes
    if (actors.size === 0) {
      actors.add('System');
      actors.add('User');
    }
    
    // Generate Mermaid flowchart with subgraphs for swimlanes
    let mermaidSyntax = 'flowchart TD\n';
    
    const actorColors = ['#e3f2fd', '#f3e5f5', '#e8f5e8', '#fff3e0', '#fce4ec'];
    
    // Create swimlane subgraphs
    Array.from(actors).forEach((actor, actorIndex) => {
      const actorId = actor.replace(/\s+/g, '_');
      const color = actorColors[actorIndex % actorColors.length];
      
      mermaidSyntax += `    subgraph ${actorId}_Lane["${actor}"]\n`;
      
      // Add category
      categories.push({
        id: actorId,
        name: actor,
        color: color,
        items: []
      });
      
      // Add steps for this actor
      workflow.steps.forEach((step, stepIndex) => {
        const stepActor = step.type === StepType.AUTOMATED ? 'System' : 'User';
        if (stepActor === actor) {
          const stepId = `${actorId}_step_${stepIndex}`;
          const shape = step.type === StepType.DECISION ? '{}' : '[]';
          
          mermaidSyntax += `        ${stepId}${shape[0]}${step.title}${shape[1]}\n`;
          
          nodes.push({
            id: stepId,
            label: step.title,
            type: step.type === StepType.DECISION ? NodeType.DECISION : NodeType.PROCESS,
            position: { x: actorIndex * 200, y: stepIndex * 100 },
            size: { width: 160, height: 80 },
            data: { 
              actor: actor,
              originalStepIndex: stepIndex,
              description: step.description,
              duration: step.duration
            }
          });
          
          // Add to category items
          const category = categories.find(cat => cat.id === actorId);
          if (category) {
            category.items.push(stepId);
          }
        }
      });
      
      mermaidSyntax += '    end\n\n';
    });
    
    // Add connections between steps across swimlanes
    let previousStepId: string | null = null;
    workflow.steps.forEach((step, stepIndex) => {
      const stepActor = (step.type === StepType.AUTOMATED ? 'System' : 'User').replace(/\s+/g, '_');
      const currentStepId = `${stepActor}_step_${stepIndex}`;
      
      if (previousStepId && previousStepId !== currentStepId) {
        mermaidSyntax += `    ${previousStepId} --> ${currentStepId}\n`;
        
        edges.push({
          id: `${previousStepId}-to-${currentStepId}`,
          source: previousStepId,
          target: currentStepId,
          type: EdgeType.SEQUENCE
        });
      }
      
      // No conditional branches handling since WorkflowStep doesn't have conditions
      
      previousStepId = currentStepId;
    });
    
    return {
      id: `swimlane-${workflow.id}`,
      type: ChartType.SWIMLANE,
      title: `Swimlane: ${workflow.title}`,
      data: {
        nodes,
        edges,
        categories,
        mermaidSyntax,
        actors: Array.from(actors)
      },
      styling: this.getDefaultStyling(),
      exportFormats: [ChartFormat.SVG, ChartFormat.PNG],
      metadata: {
        title: `Swimlane: ${workflow.title}`,
        description: 'Generated swimlane diagram from workflow definition',
        author: 'AI Voice SOP Agent',
        version: '1.0.0',
        tags: ['swimlane', 'multi-actor', 'responsibility'],
        generatedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async generateDecisionTree(workflow: WorkflowDefinition): Promise<ChartDefinition> {
    const nodes: any[] = [];
    const edges: any[] = [];
    
    // Generate Mermaid flowchart for decision tree
    let mermaidSyntax = 'flowchart TD\n';
    
    // Find decision points in the workflow
    const decisionSteps = workflow.steps.filter(step => 
      step.type === StepType.DECISION
    );
    
    if (decisionSteps.length === 0) {
      // No decisions found, create a simple linear flow
      mermaidSyntax += '    start([Start])\n';
      mermaidSyntax += '    process[Process Steps]\n';
      mermaidSyntax += '    end_node([End])\n';
      mermaidSyntax += '    start --> process --> end_node\n';
      
      nodes.push(
        {
          id: 'start',
          label: 'Start',
          type: NodeType.START,
          position: { x: 200, y: 50 },
          size: { width: 100, height: 60 }
        },
        {
          id: 'process',
          label: 'Process Steps',
          type: NodeType.PROCESS,
          position: { x: 200, y: 150 },
          size: { width: 120, height: 60 }
        },
        {
          id: 'end_node',
          label: 'End',
          type: NodeType.END,
          position: { x: 200, y: 250 },
          size: { width: 100, height: 60 }
        }
      );
      
      edges.push(
        {
          id: 'start-to-process',
          source: 'start',
          target: 'process',
          type: EdgeType.SEQUENCE
        },
        {
          id: 'process-to-end',
          source: 'process',
          target: 'end_node',
          type: EdgeType.SEQUENCE
        }
      );
    } else {
      // Build decision tree from decision points
      mermaidSyntax += '    start([Start])\n';
      
      nodes.push({
        id: 'start',
        label: 'Start',
        type: NodeType.START,
        position: { x: 400, y: 50 },
        size: { width: 100, height: 60 }
      });
      
      let currentLevel = 1;
      let previousNodeId = 'start';
      
      decisionSteps.forEach((step, stepIndex) => {
        const decisionId = `decision_${stepIndex}`;
        const decisionLabel = step.title || `Decision ${stepIndex + 1}`;
        
        mermaidSyntax += `    ${decisionId}{${decisionLabel}}\n`;
        mermaidSyntax += `    ${previousNodeId} --> ${decisionId}\n`;
        
        nodes.push({
          id: decisionId,
          label: decisionLabel,
          type: NodeType.DECISION,
          position: { x: 400, y: currentLevel * 120 },
          size: { width: 150, height: 80 },
          data: { 
            description: step.description,
            criteria: []
          }
        });
        
        edges.push({
          id: `${previousNodeId}-to-${decisionId}`,
          source: previousNodeId,
          target: decisionId,
          type: EdgeType.SEQUENCE
        });
        
        // Add default branches for decision steps (since we don't have conditions in the model)
        const yesBranchId = `branch_${stepIndex}_yes`;
        const noBranchId = `branch_${stepIndex}_no`;
        
        mermaidSyntax += `    ${yesBranchId}[Yes Path]\n`;
        mermaidSyntax += `    ${noBranchId}[No Path]\n`;
        mermaidSyntax += `    ${decisionId} -->|Yes| ${yesBranchId}\n`;
        mermaidSyntax += `    ${decisionId} -->|No| ${noBranchId}\n`;
        
        nodes.push({
          id: yesBranchId,
          label: 'Yes Path',
          type: NodeType.PROCESS,
          position: { x: 300, y: (currentLevel + 1) * 120 },
          size: { width: 140, height: 70 },
          data: { 
            condition: 'Yes',
            outcome: 'continue'
          }
        });
        
        nodes.push({
          id: noBranchId,
          label: 'No Path',
          type: NodeType.PROCESS,
          position: { x: 500, y: (currentLevel + 1) * 120 },
          size: { width: 140, height: 70 },
          data: { 
            condition: 'No',
            outcome: 'alternative'
          }
        });
        
        edges.push({
          id: `${decisionId}-to-${yesBranchId}`,
          source: decisionId,
          target: yesBranchId,
          type: EdgeType.CONDITIONAL,
          label: 'Yes'
        });
        
        edges.push({
          id: `${decisionId}-to-${noBranchId}`,
          source: decisionId,
          target: noBranchId,
          type: EdgeType.CONDITIONAL,
          label: 'No'
        });
        
        // Add end nodes for each branch if it's the last decision
        if (stepIndex === decisionSteps.length - 1) {
          const endYesId = `end_${stepIndex}_yes`;
          const endNoId = `end_${stepIndex}_no`;
          
          mermaidSyntax += `    ${endYesId}([End: Yes])\n`;
          mermaidSyntax += `    ${endNoId}([End: No])\n`;
          mermaidSyntax += `    ${yesBranchId} --> ${endYesId}\n`;
          mermaidSyntax += `    ${noBranchId} --> ${endNoId}\n`;
          
          nodes.push({
            id: endYesId,
            label: 'End: Yes',
            type: NodeType.END,
            position: { x: 300, y: (currentLevel + 2) * 120 },
            size: { width: 120, height: 60 }
          });
          
          nodes.push({
            id: endNoId,
            label: 'End: No',
            type: NodeType.END,
            position: { x: 500, y: (currentLevel + 2) * 120 },
            size: { width: 120, height: 60 }
          });
          
          edges.push({
            id: `${yesBranchId}-to-${endYesId}`,
            source: yesBranchId,
            target: endYesId,
            type: EdgeType.SEQUENCE
          });
          
          edges.push({
            id: `${noBranchId}-to-${endNoId}`,
            source: noBranchId,
            target: endNoId,
            type: EdgeType.SEQUENCE
          });
        }
        
        currentLevel += 2;
      });
    }
    
    return {
      id: `decision-tree-${workflow.id}`,
      type: ChartType.DECISION_TREE,
      title: `Decision Tree: ${workflow.title}`,
      data: {
        nodes,
        edges,
        mermaidSyntax,
        decisionPoints: decisionSteps.length
      },
      styling: this.getDefaultStyling(),
      exportFormats: [ChartFormat.SVG, ChartFormat.PNG],
      metadata: {
        title: `Decision Tree: ${workflow.title}`,
        description: 'Generated decision tree from workflow definition',
        author: 'AI Voice SOP Agent',
        version: '1.0.0',
        tags: ['decision-tree', 'conditional', 'branching'],
        generatedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async exportChart(chart: ChartDefinition, format: ChartFormat): Promise<ChartExport> {
    try {
      let exportData: ArrayBuffer;
      let filename: string;
      
      switch (format) {
        case ChartFormat.SVG:
          exportData = await this.exportToSVG(chart);
          filename = `${chart.id}.svg`;
          break;
          
        case ChartFormat.PNG:
          exportData = await this.exportToPNG(chart);
          filename = `${chart.id}.png`;
          break;
          
        case ChartFormat.PDF:
          exportData = await this.exportToPDF(chart);
          filename = `${chart.id}.pdf`;
          break;
          
        case ChartFormat.HTML:
          exportData = await this.exportToHTML(chart);
          filename = `${chart.id}.html`;
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      return {
        format,
        data: exportData,
        filename,
        size: exportData.byteLength,
        dimensions: chart.styling.dimensions,
        metadata: {
          exportedAt: new Date(),
          originalChartId: chart.id,
          format,
          quality: format === ChartFormat.PNG ? 90 : 100
        }
      };
    } catch (error) {
      console.error('Error exporting chart:', error);
      throw new Error(`Failed to export chart: ${error}`);
    }
  }

  /**
   * Export chart to SVG format
   */
  private async exportToSVG(chart: ChartDefinition): Promise<ArrayBuffer> {
    const mermaidSyntax = chart.data.mermaidSyntax;
    if (!mermaidSyntax) {
      throw new Error('No Mermaid syntax found in chart data');
    }
    
    const chartId = this.generateChartId('export');
    const svg = await this.renderMermaidToSVG(mermaidSyntax, chartId);
    
    // Apply custom styling if needed
    const styledSvg = this.applySVGStyling(svg, chart.styling);
    
    return new TextEncoder().encode(styledSvg).buffer;
  }

  /**
   * Export chart to PNG format using Puppeteer
   */
  private async exportToPNG(chart: ChartDefinition): Promise<ArrayBuffer> {
    const puppeteer = require('puppeteer');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // Create HTML with Mermaid chart
      const html = await this.createChartHTML(chart);
      await page.setContent(html);
      
      // Wait for Mermaid to render
      await page.waitForSelector('#chart-container svg', { timeout: 10000 });
      
      // Take screenshot
      const element = await page.$('#chart-container');
      const screenshot = await element.screenshot({
        type: 'png',
        omitBackground: true
      });
      
      return screenshot.buffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Export chart to PDF format
   */
  private async exportToPDF(chart: ChartDefinition): Promise<ArrayBuffer> {
    const puppeteer = require('puppeteer');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      const html = await this.createChartHTML(chart);
      await page.setContent(html);
      
      await page.waitForSelector('#chart-container svg', { timeout: 10000 });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      return pdf.buffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Export chart to HTML format
   */
  private async exportToHTML(chart: ChartDefinition): Promise<ArrayBuffer> {
    const html = await this.createChartHTML(chart, true);
    return new TextEncoder().encode(html).buffer;
  }

  /**
   * Create HTML document with embedded chart
   */
  private async createChartHTML(chart: ChartDefinition, standalone: boolean = false): Promise<string> {
    const mermaidSyntax = chart.data.mermaidSyntax;
    if (!mermaidSyntax) {
      throw new Error('No Mermaid syntax found in chart data');
    }
    
    const chartId = this.generateChartId('html');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${chart.title}</title>
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <style>
          body {
            font-family: ${chart.styling.fonts.family};
            background-color: ${chart.styling.colors.background};
            color: ${chart.styling.colors.text};
            margin: 0;
            padding: 20px;
          }
          #chart-container {
            text-align: center;
            width: 100%;
            height: auto;
          }
          .chart-title {
            font-size: ${chart.styling.fonts.sizes.title}px;
            font-weight: ${chart.styling.fonts.weights.bold};
            margin-bottom: 20px;
            color: ${chart.styling.colors.primary};
          }
          .chart-metadata {
            font-size: ${chart.styling.fonts.sizes.caption}px;
            color: ${chart.styling.colors.text};
            margin-top: 20px;
            opacity: 0.7;
          }
        </style>
      </head>
      <body>
        <div class="chart-title">${chart.title}</div>
        <div id="chart-container">
          <div class="mermaid" id="${chartId}">
            ${mermaidSyntax}
          </div>
        </div>
        ${standalone ? `
        <div class="chart-metadata">
          <p>Generated by AI Voice SOP Agent</p>
          <p>Created: ${chart.createdAt.toLocaleDateString()}</p>
          <p>Type: ${chart.type}</p>
        </div>
        ` : ''}
        <script>
          mermaid.initialize({
            startOnLoad: true,
            theme: '${this.getMermaidTheme(chart.styling.theme)}',
            securityLevel: 'loose',
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis'
            }
          });
        </script>
      </body>
      </html>
    `;
    
    return html;
  }

  /**
   * Apply custom styling to SVG
   */
  private applySVGStyling(svg: string, styling: ChartStyling): string {
    // Apply theme colors and fonts to the SVG
    let styledSvg = svg;
    
    // Replace default colors with theme colors
    styledSvg = styledSvg.replace(/fill="#[^"]*"/g, `fill="${styling.colors.primary}"`);
    styledSvg = styledSvg.replace(/stroke="#[^"]*"/g, `stroke="${styling.colors.border}"`);
    
    // Add custom CSS styles
    const customStyles = `
      <style>
        .node rect, .node circle, .node ellipse, .node polygon {
          fill: ${styling.colors.background};
          stroke: ${styling.colors.border};
          stroke-width: 2px;
        }
        .node text {
          font-family: ${styling.fonts.family};
          font-size: ${styling.fonts.sizes.body}px;
          fill: ${styling.colors.text};
        }
        .edgePath path {
          stroke: ${styling.colors.border};
          stroke-width: 2px;
        }
        .edgeLabel text {
          font-family: ${styling.fonts.family};
          font-size: ${styling.fonts.sizes.caption}px;
          fill: ${styling.colors.text};
        }
      </style>
    `;
    
    // Insert styles after the opening SVG tag
    styledSvg = styledSvg.replace('<svg', `${customStyles}<svg`);
    
    return styledSvg;
  }

  /**
   * Get Mermaid theme name from ChartTheme enum
   */
  private getMermaidTheme(theme: ChartTheme): string {
    switch (theme) {
      case ChartTheme.DARK:
        return 'dark';
      case ChartTheme.MINIMAL:
        return 'neutral';
      case ChartTheme.COLORFUL:
        return 'base';
      case ChartTheme.PROFESSIONAL:
      case ChartTheme.MODERN:
      case ChartTheme.LIGHT:
      default:
        return 'default';
    }
  }

  /**
   * Generate chart reference for SOP document embedding
   * @param chart - Chart definition
   * @param embedType - Type of embedding (inline, reference, attachment)
   */
  generateChartReference(chart: ChartDefinition, embedType: 'inline' | 'reference' | 'attachment' = 'reference'): string {
    switch (embedType) {
      case 'inline':
        return `![${chart.title}](data:image/svg+xml;base64,${this.encodeChartForInline(chart)})`;
      
      case 'reference':
        return `[Chart: ${chart.title}](charts/${chart.id}.svg)`;
      
      case 'attachment':
        return `**Chart Reference:** ${chart.title} (See attached file: ${chart.id}.svg)`;
      
      default:
        return `Chart: ${chart.title} (ID: ${chart.id})`;
    }
  }

  /**
   * Create chart embedding HTML for SOP documents
   * @param chart - Chart definition
   * @param options - Embedding options
   */
  createChartEmbedding(chart: ChartDefinition, options: {
    width?: number;
    height?: number;
    responsive?: boolean;
    showTitle?: boolean;
    showMetadata?: boolean;
  } = {}): string {
    const {
      width = chart.styling.dimensions.width,
      height = chart.styling.dimensions.height,
      responsive = true,
      showTitle = true,
      showMetadata = false
    } = options;

    const containerStyle = responsive 
      ? 'width: 100%; max-width: 100%; height: auto;'
      : `width: ${width}px; height: ${height}px;`;

    return `
      <div class="chart-embedding" style="${containerStyle}">
        ${showTitle ? `<h3 class="chart-title">${chart.title}</h3>` : ''}
        <div class="chart-container" id="chart-${chart.id}">
          <div class="mermaid">
            ${chart.data.mermaidSyntax || '<!-- Chart data not available -->'}
          </div>
        </div>
        ${showMetadata ? `
        <div class="chart-metadata">
          <small>
            Type: ${chart.type} | 
            Generated: ${chart.createdAt.toLocaleDateString()} |
            Version: ${chart.metadata.version}
          </small>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate chart gallery for multiple charts in SOP
   * @param charts - Array of chart definitions
   * @param layout - Gallery layout (grid, list, carousel)
   */
  createChartGallery(charts: ChartDefinition[], layout: 'grid' | 'list' | 'carousel' = 'grid'): string {
    const chartItems = charts.map(chart => {
      return `
        <div class="chart-gallery-item" data-chart-id="${chart.id}">
          <div class="chart-thumbnail">
            ${this.createChartEmbedding(chart, { 
              width: 300, 
              height: 200, 
              showTitle: true, 
              showMetadata: false 
            })}
          </div>
          <div class="chart-info">
            <h4>${chart.title}</h4>
            <p>${chart.metadata.description}</p>
            <div class="chart-actions">
              <button onclick="viewChart('${chart.id}')">View Full Size</button>
              <button onclick="downloadChart('${chart.id}')">Download</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const layoutClass = `chart-gallery-${layout}`;
    
    return `
      <div class="chart-gallery ${layoutClass}">
        <h2>Process Diagrams</h2>
        <div class="chart-gallery-container">
          ${chartItems}
        </div>
      </div>
      <style>
        .chart-gallery-grid .chart-gallery-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
        }
        .chart-gallery-list .chart-gallery-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .chart-gallery-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          background: #fff;
        }
        .chart-actions button {
          margin-right: 10px;
          padding: 5px 10px;
          border: 1px solid #007bff;
          background: #007bff;
          color: white;
          border-radius: 4px;
          cursor: pointer;
        }
      </style>
    `;
  }

  /**
   * Encode chart for inline embedding (base64)
   */
  private encodeChartForInline(chart: ChartDefinition): string {
    // This would generate a base64 encoded version of the chart
    // For now, return a placeholder
    return btoa(`<svg><text>Chart: ${chart.title}</text></svg>`);
  }

  getSupportedChartTypes(): ChartType[] {
    return [
      ChartType.FLOWCHART,
      ChartType.EVENT_DIAGRAM,
      ChartType.PROCESS_MAP,
      ChartType.SWIMLANE,
      ChartType.DECISION_TREE
    ];
  }

  validateChart(chart: ChartDefinition): ValidationResult {
    // TODO: Implement chart validation
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      score: 100
    };
  }

  applyChartStyling(chart: ChartDefinition, styling: ChartStyling): ChartDefinition {
    return {
      ...chart,
      styling,
      updatedAt: new Date()
    };
  }

  /**
   * Render Mermaid diagram to SVG
   * @param mermaidSyntax - Mermaid diagram syntax
   * @param id - Unique identifier for the diagram
   */
  private async renderMermaidToSVG(mermaidSyntax: string, id: string): Promise<string> {
    try {
      const { svg } = await mermaid.render(id, mermaidSyntax);
      return svg;
    } catch (error) {
      console.error('Error rendering Mermaid diagram:', error);
      throw new Error(`Failed to render Mermaid diagram: ${error}`);
    }
  }

  /**
   * Generate chart ID with timestamp
   * @param prefix - Prefix for the ID
   */
  private generateChartId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultStyling(): ChartStyling {
    return {
      theme: ChartTheme.PROFESSIONAL,
      colors: {
        primary: '#3498db',
        secondary: '#2ecc71',
        accent: '#e74c3c',
        background: '#ffffff',
        text: '#2c3e50',
        border: '#bdc3c7',
        success: '#27ae60',
        warning: '#f39c12',
        error: '#e74c3c'
      },
      fonts: {
        family: 'Arial, sans-serif',
        sizes: {
          title: 18,
          subtitle: 14,
          body: 12,
          caption: 10,
          label: 11
        },
        weights: {
          normal: 400,
          bold: 700
        }
      },
      layout: {
        spacing: 20,
        padding: 10,
        alignment: ChartAlignment.CENTER,
        orientation: ChartOrientation.AUTO,
        direction: FlowDirection.TOP_TO_BOTTOM
      },
      dimensions: {
        width: 800,
        height: 600,
        responsive: true
      }
    };
  }
}