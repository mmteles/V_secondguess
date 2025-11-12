import { 
  WorkflowDefinition, 
  ChartDefinition, 
  ChartFormat, 
  ChartExport, 
  EventSequence, 
  ProcessDefinition,
  ValidationResult
} from '@/models';

/**
 * Visual Generator for creating business modeling charts and diagrams
 */
export interface VisualGenerator {
  /**
   * Generate flowchart from workflow definition
   * @param workflow - Workflow definition
   */
  generateFlowchart(workflow: WorkflowDefinition): Promise<ChartDefinition>;

  /**
   * Generate event diagram from event sequences
   * @param events - Event sequences to visualize
   */
  generateEventDiagram(events: EventSequence[]): Promise<ChartDefinition>;

  /**
   * Generate process map from process definition
   * @param process - Process definition
   */
  generateProcessMap(process: ProcessDefinition): Promise<ChartDefinition>;

  /**
   * Generate swimlane diagram for multi-actor workflows
   * @param workflow - Workflow definition with multiple actors
   */
  generateSwimlaneChart(workflow: WorkflowDefinition): Promise<ChartDefinition>;

  /**
   * Generate decision tree for conditional workflow paths
   * @param workflow - Workflow definition with decision points
   */
  generateDecisionTree(workflow: WorkflowDefinition): Promise<ChartDefinition>;

  /**
   * Export chart in specified format
   * @param chart - Chart definition to export
   * @param format - Export format
   */
  exportChart(chart: ChartDefinition, format: ChartFormat): Promise<ChartExport>;

  /**
   * Get supported chart types
   */
  getSupportedChartTypes(): ChartType[];

  /**
   * Validate chart definition
   * @param chart - Chart definition to validate
   */
  validateChart(chart: ChartDefinition): ValidationResult;

  /**
   * Apply styling to chart
   * @param chart - Chart definition
   * @param styling - Styling configuration
   */
  applyChartStyling(chart: ChartDefinition, styling: ChartStyling): ChartDefinition;
}

export interface ChartStyling {
  theme: ChartTheme;
  colors: ColorPalette;
  fonts: FontConfiguration;
  layout: LayoutConfiguration;
  dimensions: ChartDimensions;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface FontConfiguration {
  family: string;
  sizes: {
    title: number;
    subtitle: number;
    body: number;
    caption: number;
    label: number;
  };
  weights: {
    normal: number;
    bold: number;
  };
}

export interface LayoutConfiguration {
  spacing: number;
  padding: number;
  alignment: ChartAlignment;
  orientation: ChartOrientation;
  direction: FlowDirection;
}

export interface ChartDimensions {
  width: number;
  height: number;
  aspectRatio?: number;
  responsive: boolean;
}

export enum FlowDirection {
  TOP_TO_BOTTOM = 'top_to_bottom',
  BOTTOM_TO_TOP = 'bottom_to_top',
  LEFT_TO_RIGHT = 'left_to_right',
  RIGHT_TO_LEFT = 'right_to_left'
}

export enum ChartTheme {
  PROFESSIONAL = 'professional',
  MODERN = 'modern',
  MINIMAL = 'minimal',
  COLORFUL = 'colorful'
}

export enum ChartAlignment {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
  JUSTIFY = 'justify'
}

export enum ChartOrientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  AUTO = 'auto'
}

export enum ChartType {
  FLOWCHART = 'flowchart',
  EVENT_DIAGRAM = 'event_diagram',
  PROCESS_MAP = 'process_map',
  SWIMLANE = 'swimlane',
  DECISION_TREE = 'decision_tree',
  GANTT = 'gantt',
  ORGANIZATIONAL = 'organizational'
}