import { ChartType, ChartFormat } from './enums';

/**
 * Type definitions for chart and visual generation
 */

export interface ChartDefinition {
  id: string;
  type: ChartType;
  title: string;
  data: ChartData;
  styling: ChartStyling;
  exportFormats: ChartFormat[];
  metadata: ChartMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartData {
  nodes?: ChartNode[];
  edges?: ChartEdge[];
  datasets?: ChartDataset[];
  labels?: string[];
  categories?: ChartCategory[];
  timeline?: TimelineItem[];
  mermaidSyntax?: string;
  participants?: string[];
  phases?: string[];
  actors?: string[];
  decisionPoints?: number;
}

export interface ChartNode {
  id: string;
  label: string;
  type: NodeType;
  position: Position;
  size: Size;
  data?: Record<string, any>;
  styling?: NodeStyling;
}

export interface ChartEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: EdgeType;
  styling?: EdgeStyling;
  data?: Record<string, any>;
}

export interface ChartDataset {
  id: string;
  label: string;
  data: DataPoint[];
  styling?: DatasetStyling;
}

export interface DataPoint {
  x: number | string;
  y: number | string;
  label?: string;
  metadata?: Record<string, any>;
}

export interface ChartCategory {
  id: string;
  name: string;
  color: string;
  items: string[];
}

export interface TimelineItem {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  category?: string;
  description?: string;
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

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface NodeStyling {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
  shape: NodeShape;
  opacity: number;
}

export interface EdgeStyling {
  color: string;
  width: number;
  style: EdgeStyle;
  arrowType: ArrowType;
  opacity: number;
}

export interface DatasetStyling {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  pointStyle: PointStyle;
  fill: boolean;
}

export interface ChartMetadata {
  title: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  sourceWorkflowId?: string;
  generatedAt: Date;
}

export interface ChartExport {
  format: ChartFormat;
  data: ArrayBuffer;
  filename: string;
  size: number;
  dimensions: ChartDimensions;
  metadata: ChartExportMetadata;
}

export interface ChartExportMetadata {
  exportedAt: Date;
  originalChartId: string;
  format: ChartFormat;
  quality: number;
  compression?: string;
}

export enum ChartTheme {
  PROFESSIONAL = 'professional',
  MODERN = 'modern',
  MINIMAL = 'minimal',
  COLORFUL = 'colorful',
  DARK = 'dark',
  LIGHT = 'light'
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

export enum FlowDirection {
  TOP_TO_BOTTOM = 'top_to_bottom',
  BOTTOM_TO_TOP = 'bottom_to_top',
  LEFT_TO_RIGHT = 'left_to_right',
  RIGHT_TO_LEFT = 'right_to_left'
}

export enum NodeType {
  START = 'start',
  END = 'end',
  PROCESS = 'process',
  DECISION = 'decision',
  SUBPROCESS = 'subprocess',
  DATA = 'data',
  DOCUMENT = 'document',
  ACTOR = 'actor'
}

export enum NodeShape {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  DIAMOND = 'diamond',
  ELLIPSE = 'ellipse',
  HEXAGON = 'hexagon',
  TRIANGLE = 'triangle'
}

export enum EdgeType {
  SEQUENCE = 'sequence',
  CONDITIONAL = 'conditional',
  DATA_FLOW = 'data_flow',
  MESSAGE = 'message',
  ASSOCIATION = 'association'
}

export enum EdgeStyle {
  SOLID = 'solid',
  DASHED = 'dashed',
  DOTTED = 'dotted'
}

export enum ArrowType {
  NONE = 'none',
  ARROW = 'arrow',
  DIAMOND = 'diamond',
  CIRCLE = 'circle'
}

export enum PointStyle {
  CIRCLE = 'circle',
  SQUARE = 'square',
  TRIANGLE = 'triangle',
  DIAMOND = 'diamond',
  CROSS = 'cross'
}