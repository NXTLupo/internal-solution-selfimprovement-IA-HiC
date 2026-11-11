/**
 * Miro Board Generator
 * Generates complete Miro boards from parsed journey map data
 */

import { v4 as uuidv4 } from 'uuid';

import {
  JourneyMap,
  JourneyPhase,
  Touchpoint,
  Emotion,
  PainPoint,
  Quote,
  Action,
  Channel,
  MiroItem,
  Position,
  Geometry,
  AppConfig,
  LayoutOptions,
  EmotionType,
  SeverityLevel,
  SentimentType,
  TouchpointType,
  ChannelType,
  MiroItemType,
  ShapeType,
  StickerShape,
  ConnectorShape,
  MiroStyle,
  TextAlign,
  TextAlignVertical
} from '../types/index';
import { MiroAPIClient } from './api-client';
import { Logger } from '../utils/logger';
import { GridLayout, LayoutResult } from '../utils/grid-layout';

export interface GenerationResult {
  boardId: string;
  boardUrl: string;
  itemsCreated: number;
  phaseSections: PhaseSectionResult[];
  connectors: string[];
  metadata: GenerationMetadata;
}

export interface PhaseSectionResult {
  phaseId: string;
  phaseName: string;
  headerItemId: string;
  touchpointIds: string[];
  painPointIds: string[];
  emotionIds: string[];
  quoteIds: string[];
  actionIds: string[];
  channelIds: string[];
}

export interface GenerationMetadata {
  timestamp: string;
  totalElements: number;
  processingTime: number;
  errors: string[];
  warnings: string[];
}

export class BoardGenerator {
  private miroClient: MiroAPIClient;
  private config: AppConfig;
  private logger: Logger;
  private layout: GridLayout;

  constructor(miroClient: MiroAPIClient, config: AppConfig) {
    this.miroClient = miroClient;
    this.config = config;
    this.logger = new Logger('BoardGenerator');
    this.layout = new GridLayout(config.layout);
  }

  /**
   * Generate complete Miro board from journey map
   */
  async generateBoard(journeyMap: JourneyMap, layoutResult: LayoutResult, boardId: string): Promise<GenerationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      this.logger.info(`Starting board generation for: ${journeyMap.title}`);

      // Validate board access
      await this.miroClient.getBoard(boardId);

      // Clear existing content if configured
      if (this.config.styling.colorScheme.background) {
        this.logger.info('Clearing existing board content');
        await this.miroClient.clearBoard(boardId);
      }

      // Generate board title
      const titleItemId = await this.generateBoardTitle(boardId, journeyMap);

      // Generate phase sections
      const phaseSections: PhaseSectionResult[] = [];
      let totalItemsCreated = 1; // Title

      for (const phase of journeyMap.phases) {
        try {
          const phaseLayout = layoutResult.phases.find(p => p.phaseId === phase.id);
          if (!phaseLayout) {
            errors.push(`Layout not found for phase: ${phase.name}`);
            continue;
          }

          const phaseResult = await this.generatePhaseSection(boardId, phase, phaseLayout);
          phaseSections.push(phaseResult);
          
          totalItemsCreated += this.countPhaseItems(phaseResult);
          
          this.logger.debug(`Generated phase: ${phase.name}`);
        } catch (error) {
          const errorMsg = `Failed to generate phase ${phase.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg, error);
        }
      }

      // Generate connectors between phases
      const connectors = await this.generatePhaseConnectors(boardId, phaseSections);
      totalItemsCreated += connectors.length;

      // Generate legend and metadata
      await this.generateBoardLegend(boardId, layoutResult.bounds);
      totalItemsCreated += 1;

      const processingTime = Date.now() - startTime;
      const boardUrl = this.miroClient.getBoardUrl(boardId);

      const result: GenerationResult = {
        boardId,
        boardUrl,
        itemsCreated: totalItemsCreated,
        phaseSections,
        connectors,
        metadata: {
          timestamp: new Date().toISOString(),
          totalElements: this.countJourneyMapElements(journeyMap),
          processingTime,
          errors,
          warnings
        }
      };

      this.logger.info(`Board generation completed in ${processingTime}ms`);
      this.logger.info(`Created ${totalItemsCreated} items with ${errors.length} errors, ${warnings.length} warnings`);

      return result;

    } catch (error) {
      this.logger.error('Board generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate board title
   */
  private async generateBoardTitle(boardId: string, journeyMap: JourneyMap): Promise<string> {
    const position: Position = { x: 0, y: -200 };
    const geometry: Geometry = { width: 800, height: 80 };
    
    const style: MiroStyle = {
      fillColor: 'transparent',
      fontSize: 28,
      fontFamily: this.config.styling.fonts.primary,
      textAlign: TextAlign.CENTER,
      textAlignVertical: TextAlignVertical.MIDDLE
    };

    const titleItem = await this.miroClient.createText(boardId, {
      content: `<p><strong>${journeyMap.title}</strong></p>`,
      position,
      geometry,
      style
    });

    return titleItem.id;
  }

  /**
   * Generate phase section with all components
   */
  private async generatePhaseSection(boardId: string, phase: JourneyPhase, phaseLayout: any): Promise<PhaseSectionResult> {
    // Generate phase header
    const headerItemId = await this.generatePhaseHeader(boardId, phase, phaseLayout.bounds.topLeft);

    // Generate touchpoints
    const touchpointIds = await this.generateTouchpoints(boardId, phase.touchpoints, phaseLayout.touchpoints);

    // Generate pain points
    const painPointIds = await this.generatePainPoints(boardId, phase.painPoints, phaseLayout.painPoints);

    // Generate emotions
    const emotionIds = await this.generateEmotions(boardId, phase.emotions, phaseLayout.emotions);

    // Generate quotes
    const quoteIds = await this.generateQuotes(boardId, phase.quotes, phaseLayout.quotes);

    // Generate actions
    const actionIds = await this.generateActions(boardId, phase.actions, phaseLayout.actions);

    // Generate channels
    const channelIds = await this.generateChannels(boardId, phase.channels, phaseLayout.channels);

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      headerItemId,
      touchpointIds,
      painPointIds,
      emotionIds,
      quoteIds,
      actionIds,
      channelIds
    };
  }

  /**
   * Generate phase header
   */
  private async generatePhaseHeader(boardId: string, phase: JourneyPhase, position: Position): Promise<string> {
    const geometry: Geometry = { width: 300, height: 60 };
    
    const style: MiroStyle = {
      fillColor: this.config.styling.colorScheme.primary,
      fontSize: 18,
      fontFamily: this.config.styling.fonts.primary,
      textAlign: TextAlign.CENTER,
      textAlignVertical: TextAlignVertical.MIDDLE
    };

    const headerItem = await this.miroClient.createShape(boardId, {
      content: `<p><strong>${phase.name}</strong></p>`,
      shape: ShapeType.RECTANGLE,
      position,
      geometry,
      style
    });

    return headerItem.id;
  }

  /**
   * Generate touchpoints
   */
  private async generateTouchpoints(boardId: string, touchpoints: Touchpoint[], layouts: any[]): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < touchpoints.length; i++) {
      const touchpoint = touchpoints[i];
      const layout = layouts[i];
      
      if (!layout) continue;

      try {
        const style = this.getTouchpointStyle(touchpoint);
        const shape = this.getTouchpointShape(touchpoint.type);

        const item = await this.miroClient.createShape(boardId, {
          content: `<p><strong>${touchpoint.name}</strong></p>${touchpoint.description ? `<p>${touchpoint.description}</p>` : ''}`,
          shape,
          position: layout.position,
          geometry: layout.geometry,
          style
        });

        ids.push(item.id);
      } catch (error) {
        this.logger.warn(`Failed to create touchpoint ${touchpoint.name}:`, error);
      }
    }

    return ids;
  }

  /**
   * Generate pain points
   */
  private async generatePainPoints(boardId: string, painPoints: PainPoint[], layouts: any[]): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < painPoints.length; i++) {
      const painPoint = painPoints[i];
      const layout = layouts[i];
      
      if (!layout) continue;

      try {
        const style = this.getPainPointStyle(painPoint);

        const item = await this.miroClient.createStickyNote(boardId, {
          content: `<p><strong>${painPoint.title}</strong></p><p>${painPoint.description}</p>`,
          position: layout.position,
          geometry: layout.geometry,
          shape: StickerShape.SQUARE,
          style
        });

        ids.push(item.id);
      } catch (error) {
        this.logger.warn(`Failed to create pain point ${painPoint.title}:`, error);
      }
    }

    return ids;
  }

  /**
   * Generate emotions
   */
  private async generateEmotions(boardId: string, emotions: Emotion[], layouts: any[]): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < emotions.length; i++) {
      const emotion = emotions[i];
      const layout = layouts[i];
      
      if (!layout) continue;

      try {
        const style = this.getEmotionStyle(emotion);
        const shape = this.getEmotionShape(emotion.type);

        const content = `<p>${emotion.description || emotion.type}</p><p>Intensity: ${emotion.intensity}/10</p>`;

        const item = await this.miroClient.createShape(boardId, {
          content,
          shape,
          position: layout.position,
          geometry: layout.geometry,
          style
        });

        ids.push(item.id);
      } catch (error) {
        this.logger.warn(`Failed to create emotion ${emotion.type}:`, error);
      }
    }

    return ids;
  }

  /**
   * Generate quotes
   */
  private async generateQuotes(boardId: string, quotes: Quote[], layouts: any[]): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < quotes.length; i++) {
      const quote = quotes[i];
      const layout = layouts[i];
      
      if (!layout) continue;

      try {
        const style = this.getQuoteStyle(quote);

        const content = `<p>"${quote.text}"</p>${quote.attribution ? `<p><em>- ${quote.attribution}</em></p>` : ''}`;

        const item = await this.miroClient.createText(boardId, {
          content,
          position: layout.position,
          geometry: layout.geometry,
          style
        });

        ids.push(item.id);
      } catch (error) {
        this.logger.warn(`Failed to create quote:`, error);
      }
    }

    return ids;
  }

  /**
   * Generate actions
   */
  private async generateActions(boardId: string, actions: Action[], layouts: any[]): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const layout = layouts[i];
      
      if (!layout) continue;

      try {
        const style = this.getActionStyle(action);

        const item = await this.miroClient.createShape(boardId, {
          content: `<p>${action.name}</p>${action.description ? `<p><small>${action.description}</small></p>` : ''}`,
          shape: ShapeType.ARROW_RIGHT,
          position: layout.position,
          geometry: layout.geometry,
          style
        });

        ids.push(item.id);
      } catch (error) {
        this.logger.warn(`Failed to create action ${action.name}:`, error);
      }
    }

    return ids;
  }

  /**
   * Generate channels
   */
  private async generateChannels(boardId: string, channels: Channel[], layouts: any[]): Promise<string[]> {
    const ids: string[] = [];

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      const layout = layouts[i];
      
      if (!layout) continue;

      try {
        const style = this.getChannelStyle(channel);
        const shape = this.getChannelShape(channel.type);

        const item = await this.miroClient.createShape(boardId, {
          content: `<p>${channel.name}</p>${channel.digitalIndicator ? '<p>🌐 Digital</p>' : ''}`,
          shape,
          position: layout.position,
          geometry: layout.geometry,
          style
        });

        ids.push(item.id);
      } catch (error) {
        this.logger.warn(`Failed to create channel ${channel.name}:`, error);
      }
    }

    return ids;
  }

  /**
   * Generate connectors between phases
   */
  private async generatePhaseConnectors(boardId: string, phaseSections: PhaseSectionResult[]): Promise<string[]> {
    const connectorIds: string[] = [];

    for (let i = 0; i < phaseSections.length - 1; i++) {
      const currentPhase = phaseSections[i];
      const nextPhase = phaseSections[i + 1];

      try {
        const connector = await this.miroClient.createConnector(boardId, {
          startItem: currentPhase.headerItemId,
          endItem: nextPhase.headerItemId,
          shape: ConnectorShape.STRAIGHT,
          style: {
            borderColor: this.config.styling.colorScheme.accent,
            borderWidth: 2
          }
        });

        connectorIds.push(connector.id);
      } catch (error) {
        this.logger.warn(`Failed to create connector between ${currentPhase.phaseName} and ${nextPhase.phaseName}:`, error);
      }
    }

    return connectorIds;
  }

  /**
   * Generate board legend
   */
  private async generateBoardLegend(boardId: string, bounds: any): Promise<void> {
    const legendPosition: Position = { 
      x: bounds.bottomRight.x + 100, 
      y: bounds.topLeft.y 
    };

    const legendContent = `
      <p><strong>Legend</strong></p>
      <p>🔵 Touchpoints</p>
      <p>🔴 Pain Points</p>
      <p>😊 Positive Emotions</p>
      <p>😟 Negative Emotions</p>
      <p>💬 Customer Quotes</p>
      <p>➡️ Actions</p>
      <p>📱 Channels</p>
    `;

    await this.miroClient.createText(boardId, {
      content: legendContent,
      position: legendPosition,
      geometry: { width: 200, height: 300 },
      style: {
        fontSize: 12,
        fontFamily: this.config.styling.fonts.secondary
      }
    });
  }

  /**
   * Style helper methods
   */
  private getTouchpointStyle(touchpoint: Touchpoint): MiroStyle {
    return {
      fillColor: this.config.styling.colorScheme.primary,
      fontSize: 14,
      fontFamily: this.config.styling.fonts.primary,
      textAlign: TextAlign.CENTER,
      textAlignVertical: TextAlignVertical.MIDDLE
    };
  }

  private getTouchpointShape(type: TouchpointType): ShapeType {
    switch (type) {
      case TouchpointType.DIGITAL: return ShapeType.RECTANGLE;
      case TouchpointType.PHYSICAL: return ShapeType.HEXAGON;
      case TouchpointType.HUMAN: return ShapeType.CIRCLE;
      case TouchpointType.HYBRID: return ShapeType.DIAMOND;
      default: return ShapeType.RECTANGLE;
    }
  }

  private getPainPointStyle(painPoint: PainPoint): MiroStyle {
    let color = this.config.styling.colorScheme.painPoint;
    
    switch (painPoint.severity) {
      case SeverityLevel.CRITICAL:
        color = '#CC0000';
        break;
      case SeverityLevel.HIGH:
        color = '#FF3333';
        break;
      case SeverityLevel.MEDIUM:
        color = '#FF6666';
        break;
      case SeverityLevel.LOW:
        color = '#FF9999';
        break;
    }

    return {
      fillColor: color,
      fontSize: 12,
      fontFamily: this.config.styling.fonts.primary
    };
  }

  private getEmotionStyle(emotion: Emotion): MiroStyle {
    let color = this.config.styling.colorScheme.neutral;
    
    switch (emotion.type) {
      case EmotionType.POSITIVE:
        color = this.config.styling.colorScheme.positiveEmotion;
        break;
      case EmotionType.NEGATIVE:
        color = this.config.styling.colorScheme.negativeEmotion;
        break;
    }

    return {
      fillColor: color,
      fontSize: 12,
      fontFamily: this.config.styling.fonts.primary,
      textAlign: TextAlign.CENTER
    };
  }

  private getEmotionShape(type: EmotionType): ShapeType {
    switch (type) {
      case EmotionType.POSITIVE: return ShapeType.CIRCLE;
      case EmotionType.NEGATIVE: return ShapeType.TRIANGLE;
      default: return ShapeType.DIAMOND;
    }
  }

  private getQuoteStyle(quote: Quote): MiroStyle {
    return {
      fillColor: 'transparent',
      fontSize: 11,
      fontFamily: this.config.styling.fonts.secondary,
      borderColor: this.config.styling.colorScheme.accent,
      borderWidth: 1
    };
  }

  private getActionStyle(action: Action): MiroStyle {
    return {
      fillColor: this.config.styling.colorScheme.secondary,
      fontSize: 12,
      fontFamily: this.config.styling.fonts.primary,
      textAlign: TextAlign.CENTER
    };
  }

  private getChannelStyle(channel: Channel): MiroStyle {
    const baseColor = channel.digitalIndicator 
      ? this.config.styling.colorScheme.primary 
      : this.config.styling.colorScheme.secondary;

    return {
      fillColor: baseColor,
      fontSize: 12,
      fontFamily: this.config.styling.fonts.primary,
      textAlign: TextAlign.CENTER
    };
  }

  private getChannelShape(type: ChannelType): ShapeType {
    switch (type) {
      case ChannelType.WEBSITE:
      case ChannelType.MOBILE_APP:
        return ShapeType.RECTANGLE;
      case ChannelType.PHONE:
      case ChannelType.EMAIL:
        return ShapeType.CIRCLE;
      case ChannelType.IN_PERSON:
        return ShapeType.HEXAGON;
      default:
        return ShapeType.DIAMOND;
    }
  }

  /**
   * Utility methods
   */
  private countPhaseItems(phaseResult: PhaseSectionResult): number {
    return 1 + // header
           phaseResult.touchpointIds.length +
           phaseResult.painPointIds.length +
           phaseResult.emotionIds.length +
           phaseResult.quoteIds.length +
           phaseResult.actionIds.length +
           phaseResult.channelIds.length;
  }

  private countJourneyMapElements(journeyMap: JourneyMap): number {
    return journeyMap.phases.reduce((total, phase) => {
      return total + 
             phase.touchpoints.length +
             phase.painPoints.length +
             phase.emotions.length +
             phase.quotes.length +
             phase.actions.length +
             phase.channels.length;
    }, 0);
  }
}