/**
 * Core type definitions for the Miro Generator application
 */

// Journey Map Types
export interface JourneyMap {
  id: string;
  title: string;
  phases: JourneyPhase[];
  metadata: JourneyMetadata;
}

export interface JourneyPhase {
  id: string;
  name: string;
  description?: string;
  order: number;
  touchpoints: Touchpoint[];
  emotions: Emotion[];
  painPoints: PainPoint[];
  quotes: Quote[];
  actions: Action[];
  channels: Channel[];
}

export interface Touchpoint {
  id: string;
  name: string;
  description?: string;
  type: TouchpointType;
  phase: string;
  position: Position;
  metadata?: Record<string, any>;
}

export interface Emotion {
  id: string;
  type: EmotionType;
  intensity: number; // 1-10 scale
  description?: string;
  phase: string;
  position: Position;
}

export interface PainPoint {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  category: PainPointCategory;
  phase: string;
  position: Position;
  impact?: string;
  solution?: string;
}

export interface Quote {
  id: string;
  text: string;
  attribution?: string;
  sentiment: SentimentType;
  phase: string;
  position: Position;
  context?: string;
}

export interface Action {
  id: string;
  name: string;
  description?: string;
  type: ActionType;
  phase: string;
  position: Position;
  duration?: number;
  complexity?: ComplexityLevel;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  phase: string;
  position: Position;
  digitalIndicator?: boolean;
}

export interface JourneyMetadata {
  persona?: string;
  scenario?: string;
  dateCreated: Date;
  dateModified: Date;
  version: string;
  tags: string[];
  source: string;
}

// Miro API Types
export interface MiroBoard {
  id: string;
  name: string;
  description?: string;
  team: MiroTeam;
  policy: MiroBoardPolicy;
  permissionsPolicy: MiroPermissionsPolicy;
  sharingPolicy: MiroSharingPolicy;
  createdAt: string;
  createdBy: MiroUser;
  modifiedAt: string;
  modifiedBy: MiroUser;
}

export interface MiroItem {
  id: string;
  type: MiroItemType;
  position: Position;
  geometry: Geometry;
  style?: MiroStyle;
  data: Record<string, any>;
  createdAt: string;
  createdBy: MiroUser;
  modifiedAt: string;
  modifiedBy: MiroUser;
}

export interface MiroShape extends MiroItem {
  type: 'shape';
  data: {
    shape: ShapeType;
    content: string;
  };
}

export interface MiroText extends MiroItem {
  type: 'text';
  data: {
    content: string;
  };
}

export interface MiroSticker extends MiroItem {
  type: 'sticky_note';
  data: {
    content: string;
    shape: StickerShape;
  };
}

export interface MiroConnector extends MiroItem {
  type: 'connector';
  data: {
    start: ConnectorEnd;
    end: ConnectorEnd;
    shape: ConnectorShape;
  };
}

// Layout and Positioning Types
export interface Position {
  x: number;
  y: number;
}

export interface Geometry {
  width: number;
  height: number;
}

export interface GridConfig {
  cellWidth: number;
  cellHeight: number;
  marginX: number;
  marginY: number;
  columns: number;
  rows?: number;
}

export interface LayoutOptions {
  grid: GridConfig;
  spacing: {
    phase: number;
    element: number;
    group: number;
  };
  alignment: AlignmentType;
  distribution: DistributionType;
}

// Style Types
export interface MiroStyle {
  fillColor?: string;
  fontFamily?: string;
  fontSize?: number;
  textAlign?: TextAlign;
  textAlignVertical?: TextAlignVertical;
  borderColor?: string;
  borderWidth?: number;
  borderOpacity?: number;
  fillOpacity?: number;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  painPoint: string;
  positiveEmotion: string;
  negativeEmotion: string;
  neutral: string;
}

// Configuration Types
export interface AppConfig {
  miro: MiroConfig;
  parsing: ParsingConfig;
  layout: LayoutOptions;
  styling: StylingConfig;
  api: ApiConfig;
  performance: PerformanceConfig;
}

export interface MiroConfig {
  accessToken: string;
  boardId?: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface ParsingConfig {
  touchpoints: boolean;
  painPoints: boolean;
  quotes: boolean;
  emotions: boolean;
  channels: boolean;
  actions: boolean;
  customSelectors?: Record<string, string>;
}

export interface StylingConfig {
  colorScheme: ColorScheme;
  fonts: FontConfig;
  shapes: ShapeConfig;
  sizes: SizeConfig;
}

export interface FontConfig {
  primary: string;
  secondary: string;
  sizes: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
}

export interface ShapeConfig {
  default: ShapeType;
  touchpoint: ShapeType;
  painPoint: ShapeType;
  emotion: ShapeType;
  quote: ShapeType;
  action: ShapeType;
  channel: ShapeType;
}

export interface SizeConfig {
  small: Geometry;
  medium: Geometry;
  large: Geometry;
  xlarge: Geometry;
}

export interface ApiConfig {
  rateLimit: number;
  batchSize: number;
  concurrentRequests: number;
  timeout: number;
}

export interface PerformanceConfig {
  memoryLimit: number;
  processingTimeout: number;
  maxFileSize: number;
  cacheEnabled: boolean;
}

// CLI Types
export interface CLIOptions {
  input: string;
  output?: string;
  boardId?: string;
  template?: string;
  dryRun?: boolean;
  verbose?: boolean;
  config?: string;
  force?: boolean;
}

export interface CLICommand {
  name: string;
  description: string;
  options: CLIOption[];
  action: (options: CLIOptions) => Promise<void>;
}

export interface CLIOption {
  flags: string;
  description: string;
  defaultValue?: any;
  required?: boolean;
}

// Error Types
export interface AppError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, any>;
}

// Enum Types
export enum TouchpointType {
  DIGITAL = 'digital',
  PHYSICAL = 'physical',
  HUMAN = 'human',
  HYBRID = 'hybrid'
}

export enum EmotionType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed'
}

export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum PainPointCategory {
  PROCESS = 'process',
  INTERFACE = 'interface',
  COMMUNICATION = 'communication',
  TECHNICAL = 'technical',
  POLICY = 'policy',
  OTHER = 'other'
}

export enum SentimentType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral'
}

export enum ActionType {
  BROWSE = 'browse',
  SEARCH = 'search',
  CLICK = 'click',
  FILL = 'fill',
  SUBMIT = 'submit',
  WAIT = 'wait',
  CALL = 'call',
  EMAIL = 'email',
  VISIT = 'visit',
  OTHER = 'other'
}

export enum ChannelType {
  WEBSITE = 'website',
  MOBILE_APP = 'mobile_app',
  PHONE = 'phone',
  EMAIL = 'email',
  CHAT = 'chat',
  SOCIAL_MEDIA = 'social_media',
  IN_PERSON = 'in_person',
  MAIL = 'mail',
  OTHER = 'other'
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex'
}

export enum MiroItemType {
  SHAPE = 'shape',
  TEXT = 'text',
  STICKY_NOTE = 'sticky_note',
  CONNECTOR = 'connector',
  IMAGE = 'image',
  FRAME = 'frame'
}

export enum ShapeType {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  TRIANGLE = 'triangle',
  DIAMOND = 'diamond',
  HEXAGON = 'hexagon',
  STAR = 'star',
  ARROW_RIGHT = 'arrow_right',
  ARROW_LEFT = 'arrow_left',
  ARROW_UP = 'arrow_up',
  ARROW_DOWN = 'arrow_down'
}

export enum StickerShape {
  SQUARE = 'square',
  RECTANGLE = 'rectangle'
}

export enum ConnectorShape {
  STRAIGHT = 'straight',
  CURVED = 'curved',
  ELBOWED = 'elbowed'
}

export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right'
}

export enum TextAlignVertical {
  TOP = 'top',
  MIDDLE = 'middle',
  BOTTOM = 'bottom'
}

export enum AlignmentType {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
  TOP = 'top',
  MIDDLE = 'middle',
  BOTTOM = 'bottom'
}

export enum DistributionType {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  GRID = 'grid'
}

// Helper Types
export interface ConnectorEnd {
  item: string; // Item ID
  snapTo?: string;
}

export interface MiroTeam {
  id: string;
  name: string;
}

export interface MiroUser {
  id: string;
  name: string;
  email: string;
}

export interface MiroBoardPolicy {
  permissionsPolicy: MiroPermissionsPolicy;
  sharingPolicy: MiroSharingPolicy;
}

export interface MiroPermissionsPolicy {
  collaborationToolsStartAccess: string;
  copyAccess: string;
  copyAccessLevel: string;
  sharingAccess: string;
}

export interface MiroSharingPolicy {
  access: string;
  inviteToAccountAndBoardLinkAccess: string;
  organizationAccess: string;
  teamAccess: string;
}