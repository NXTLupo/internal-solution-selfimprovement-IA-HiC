/**
 * Journey Map HTML Parser
 * Extracts journey map components from Claude journey mapper HTML output
 */

import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import * as fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

import {
  JourneyMap,
  JourneyPhase,
  Touchpoint,
  Emotion,
  PainPoint,
  Quote,
  Action,
  Channel,
  JourneyMetadata,
  ParsingConfig,
  TouchpointType,
  EmotionType,
  SeverityLevel,
  PainPointCategory,
  SentimentType,
  ActionType,
  ChannelType,
  Position
} from '../types/index';
import { Logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';

export class JourneyMapParser {
  private logger: Logger;
  private config: ParsingConfig;

  constructor(config: ParsingConfig) {
    this.logger = new Logger('JourneyMapParser');
    this.config = config;
  }

  /**
   * Parse journey map from HTML file
   */
  async parseFromFile(filePath: string): Promise<JourneyMap> {
    try {
      this.logger.debug(`Reading HTML file: ${filePath}`);
      const htmlContent = await fs.readFile(filePath, 'utf-8');
      return await this.parseFromString(htmlContent, filePath);
    } catch (error) {
      this.logger.error(`Failed to read file: ${filePath}`, error);
      throw new ValidationError(`Unable to read HTML file: ${filePath}`);
    }
  }

  /**
   * Parse journey map from HTML string
   */
  async parseFromString(htmlContent: string, source: string = 'string'): Promise<JourneyMap> {
    try {
      this.logger.debug('Loading HTML content with cheerio');
      const $ = cheerio.load(htmlContent);

      // An empty or unparseable document carries no journey content: refuse it instead of returning a
      // blank one-phase map that would become an empty Miro board.
      if ($.root().text().trim().length === 0) {
        throw new ValidationError('HTML contains no journey map content');
      }

      // Extract basic metadata
      const metadata = this.extractMetadata($, source);
      this.logger.debug('Extracted metadata:', metadata);

      // Extract title
      const title = this.extractTitle($);
      this.logger.debug(`Extracted title: ${title}`);

      // Extract phases
      const phases = await this.extractPhases($);
      this.logger.debug(`Extracted ${phases.length} phases`);

      const journeyMap: JourneyMap = {
        id: uuidv4(),
        title,
        phases,
        metadata
      };

      // Validate the parsed journey map
      await this.validateJourneyMap(journeyMap);

      this.logger.info(`Successfully parsed journey map: ${title}`);
      return journeyMap;

    } catch (error) {
      this.logger.error('Failed to parse HTML content', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to parse journey map HTML');
    }
  }

  /**
   * Extract metadata from HTML document
   */
  private extractMetadata($: cheerio.CheerioAPI, source: string): JourneyMetadata {
    const now = new Date();
    
    // Try to extract persona from meta tags or content
    const persona = $('meta[name="persona"]').attr('content') || 
                   $('.persona').first().text().trim() ||
                   'Unknown Persona';

    // Try to extract scenario
    const scenario = $('meta[name="scenario"]').attr('content') ||
                    $('.scenario').first().text().trim() ||
                    'Default Scenario';

    // Extract tags from meta keywords or content
    const tags: string[] = [];
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    if (metaKeywords) {
      tags.push(...metaKeywords.split(',').map(tag => tag.trim()));
    }

    // Add additional tags based on content analysis
    if ($('.pain-point, .painpoint').length > 0) tags.push('pain-points');
    if ($('.emotion').length > 0) tags.push('emotions');
    if ($('.quote').length > 0) tags.push('quotes');
    if ($('.touchpoint').length > 0) tags.push('touchpoints');

    return {
      persona,
      scenario,
      dateCreated: now,
      dateModified: now,
      version: '1.0.0',
      tags: [...new Set(tags)], // Remove duplicates
      source
    };
  }

  /**
   * Extract title from HTML document
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    // Try multiple selectors for title
    const titleSelectors = [
      'h1',
      '.title',
      '.journey-title',
      '.map-title',
      'title',
      '.header h1',
      '.main-title'
    ];

    for (const selector of titleSelectors) {
      const title = $(selector).first().text().trim();
      if (title && title.length > 0) {
        return title;
      }
    }

    return 'Customer Journey Map';
  }

  /**
   * Extract journey phases from HTML
   */
  private async extractPhases($: cheerio.CheerioAPI): Promise<JourneyPhase[]> {
    const phases: JourneyPhase[] = [];
    
    // Try different selectors for phases
    const phaseSelectors = [
      '.phase',
      '.journey-phase',
      '.stage',
      '.step',
      '.section[data-phase]',
      'section.phase',
      '.timeline-phase'
    ] as const; // literal selectors, so cheerio types each query result as Cheerio<Element>

    let phaseElements: cheerio.Cheerio<Element> = $();
    
    for (const selector of phaseSelectors) {
      phaseElements = $(selector);
      if (phaseElements.length > 0) {
        this.logger.debug(`Found ${phaseElements.length} phases using selector: ${selector}`);
        break;
      }
    }

    // If no phases found with specific selectors, try to infer from structure
    if (phaseElements.length === 0) {
      phaseElements = this.inferPhasesFromStructure($);
    }

    for (let i = 0; i < phaseElements.length; i++) {
      const element = phaseElements.eq(i);
      const phase = await this.extractPhase($, element, i);
      if (phase) {
        phases.push(phase);
      }
    }

    return phases;
  }

  /**
   * Infer phases from HTML structure when explicit phase markers aren't found
   */
  private inferPhasesFromStructure($: cheerio.CheerioAPI): cheerio.Cheerio<Element> {
    // Look for common structural patterns
    const structuralSelectors = [
      'section',
      '.col, .column',
      '.step-container',
      'div[class*="phase"]',
      'div[class*="stage"]',
      'div[class*="step"]'
    ] as const;

    for (const selector of structuralSelectors) {
      const elements = $(selector);
      if (elements.length >= 2 && elements.length <= 10) { // Reasonable number of phases
        this.logger.debug(`Inferred ${elements.length} phases from structural selector: ${selector}`);
        return elements;
      }
    }

    // Fallback: create a single phase containing all content
    this.logger.warn('Could not identify phases, creating single phase');
    return $('body').length > 0 ? $('body') : $('html');
  }

  /**
   * Extract individual phase data
   */
  private async extractPhase($: cheerio.CheerioAPI, element: cheerio.Cheerio<Element>, order: number): Promise<JourneyPhase | null> {
    try {
      const id = uuidv4();
      
      // Extract phase name
      const name = this.extractPhaseName(element) || `Phase ${order + 1}`;
      
      // Extract description
      const description = this.extractPhaseDescription(element);

      // Extract various components based on configuration
      const touchpoints = this.config.touchpoints ? this.extractTouchpoints($, element, id) : [];
      const emotions = this.config.emotions ? this.extractEmotions($, element, id) : [];
      const painPoints = this.config.painPoints ? this.extractPainPoints($, element, id) : [];
      const quotes = this.config.quotes ? this.extractQuotes($, element, id) : [];
      const actions = this.config.actions ? this.extractActions($, element, id) : [];
      const channels = this.config.channels ? this.extractChannels($, element, id) : [];

      const phase: JourneyPhase = {
        id,
        name,
        description,
        order,
        touchpoints,
        emotions,
        painPoints,
        quotes,
        actions,
        channels
      };

      this.logger.debug(`Extracted phase: ${name} with ${touchpoints.length} touchpoints, ${painPoints.length} pain points`);
      return phase;

    } catch (error) {
      this.logger.error(`Failed to extract phase at order ${order}`, error);
      return null;
    }
  }

  /**
   * Extract phase name
   */
  private extractPhaseName(element: cheerio.Cheerio<Element>): string | undefined {
    const nameSelectors = [
      'h2',
      'h3',
      '.phase-name',
      '.phase-title',
      '.stage-name',
      '.step-title',
      '[data-phase-name]'
    ];

    for (const selector of nameSelectors) {
      const name = element.find(selector).first().text().trim();
      if (name && name.length > 0) {
        return name;
      }
    }

    // Try to get name from attributes
    const dataName = element.attr('data-name') || element.attr('data-phase') || element.attr('data-title');
    if (dataName) {
      return dataName;
    }

    return undefined;
  }

  /**
   * Extract phase description
   */
  private extractPhaseDescription(element: cheerio.Cheerio<Element>): string | undefined {
    const descSelectors = [
      '.description',
      '.phase-description',
      '.summary',
      'p:first-of-type',
      '.overview'
    ];

    for (const selector of descSelectors) {
      const description = element.find(selector).first().text().trim();
      if (description && description.length > 0) {
        return description;
      }
    }

    return undefined;
  }

  /**
   * Extract touchpoints
   */
  private extractTouchpoints($: cheerio.CheerioAPI, element: cheerio.Cheerio<Element>, phaseId: string): Touchpoint[] {
    const touchpoints: Touchpoint[] = [];
    const selectors = [
      '.touchpoint',
      '.touch-point',
      '.interaction',
      '[data-type="touchpoint"]',
      ...(this.config.customSelectors?.touchpoints ? [this.config.customSelectors.touchpoints] : [])
    ];

    for (const selector of selectors) {
      element.find(selector).each((index, el) => {
        const $el = $(el);
        const touchpoint = this.parseTouchpoint($el, phaseId, index);
        if (touchpoint) {
          touchpoints.push(touchpoint);
        }
      });
    }

    return touchpoints;
  }

  /**
   * Parse individual touchpoint
   */
  private parseTouchpoint($el: cheerio.Cheerio<Element>, phaseId: string, index: number): Touchpoint | null {
    try {
      const heading = $el.find('.name, .title, h3, h4, h5, strong').first().text().trim();
      const name = heading || $el.text().trim() || $el.attr('data-name') || `Touchpoint ${index + 1}`;
      const description = $el.attr('data-description') ||
        $el.find('.description').text().trim() ||
        (heading ? $el.find('p').first().text().trim() : '');
      const typeAttr = $el.attr('data-type') || $el.attr('class');
      
      // Determine touchpoint type
      let type = TouchpointType.DIGITAL;
      if (typeAttr) {
        if (typeAttr.includes('physical')) type = TouchpointType.PHYSICAL;
        else if (typeAttr.includes('human')) type = TouchpointType.HUMAN;
        else if (typeAttr.includes('hybrid')) type = TouchpointType.HYBRID;
      }

      return {
        id: uuidv4(),
        name,
        description: description || undefined,
        type,
        phase: phaseId,
        position: this.calculatePosition($el, index),
        metadata: this.extractElementMetadata($el)
      };
    } catch (error) {
      this.logger.warn(`Failed to parse touchpoint at index ${index}`, error);
      return null;
    }
  }

  /**
   * Extract emotions
   */
  private extractEmotions($: cheerio.CheerioAPI, element: cheerio.Cheerio<Element>, phaseId: string): Emotion[] {
    const emotions: Emotion[] = [];
    const selectors = [
      '.emotion',
      '.feeling',
      '.sentiment',
      '[data-type="emotion"]',
      ...(this.config.customSelectors?.emotions ? [this.config.customSelectors.emotions] : [])
    ];

    for (const selector of selectors) {
      element.find(selector).each((index, el) => {
        const $el = $(el);
        const emotion = this.parseEmotion($el, phaseId, index);
        if (emotion) {
          emotions.push(emotion);
        }
      });
    }

    return emotions;
  }

  /**
   * Parse individual emotion
   */
  private parseEmotion($el: cheerio.Cheerio<Element>, phaseId: string, index: number): Emotion | null {
    try {
      const text = $el.text().trim().toLowerCase();
      const classNames = $el.attr('class') || '';
      
      // Determine emotion type
      let type = EmotionType.NEUTRAL;
      const positiveKeywords = ['happy', 'satisfied', 'pleased', 'excited', 'delighted', 'positive'];
      const negativeKeywords = ['frustrated', 'angry', 'disappointed', 'confused', 'annoyed', 'negative'];
      
      if (positiveKeywords.some(keyword => text.includes(keyword) || classNames.includes(keyword))) {
        type = EmotionType.POSITIVE;
      } else if (negativeKeywords.some(keyword => text.includes(keyword) || classNames.includes(keyword))) {
        type = EmotionType.NEGATIVE;
      }

      // Extract intensity (1-10 scale)
      let intensity = 5; // Default neutral
      const intensityAttr = $el.attr('data-intensity');
      if (intensityAttr) {
        const parsed = parseInt(intensityAttr, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
          intensity = parsed;
        }
      } else {
        // Infer intensity from text/class
        if (text.includes('very') || text.includes('extremely')) intensity = 8;
        else if (text.includes('quite') || text.includes('really')) intensity = 7;
        else if (type === EmotionType.POSITIVE) intensity = 6;
        else if (type === EmotionType.NEGATIVE) intensity = 4;
      }

      return {
        id: uuidv4(),
        type,
        intensity,
        description: $el.text().trim() || undefined,
        phase: phaseId,
        position: this.calculatePosition($el, index)
      };
    } catch (error) {
      this.logger.warn(`Failed to parse emotion at index ${index}`, error);
      return null;
    }
  }

  /**
   * Extract pain points
   */
  private extractPainPoints($: cheerio.CheerioAPI, element: cheerio.Cheerio<Element>, phaseId: string): PainPoint[] {
    const painPoints: PainPoint[] = [];
    const selectors = [
      '.pain-point',
      '.painpoint',
      '.problem',
      '.issue',
      '.friction',
      '[data-type="pain-point"]',
      ...(this.config.customSelectors?.painPoints ? [this.config.customSelectors.painPoints] : [])
    ];

    for (const selector of selectors) {
      element.find(selector).each((index, el) => {
        const $el = $(el);
        const painPoint = this.parsePainPoint($el, phaseId, index);
        if (painPoint) {
          painPoints.push(painPoint);
        }
      });
    }

    return painPoints;
  }

  /**
   * Parse individual pain point
   */
  private parsePainPoint($el: cheerio.Cheerio<Element>, phaseId: string, index: number): PainPoint | null {
    try {
      const title = $el.find('.title, h4, h5').first().text().trim() || 
                   $el.attr('data-title') || 
                   `Pain Point ${index + 1}`;
      
      const description = $el.find('.description, p').first().text().trim() || 
                         $el.text().trim();

      // Determine severity
      let severity = SeverityLevel.MEDIUM;
      const severityAttr = $el.attr('data-severity') || $el.attr('class');
      if (severityAttr) {
        if (severityAttr.includes('critical')) severity = SeverityLevel.CRITICAL;
        else if (severityAttr.includes('high')) severity = SeverityLevel.HIGH;
        else if (severityAttr.includes('low')) severity = SeverityLevel.LOW;
      }

      // Determine category
      let category = PainPointCategory.OTHER;
      const categoryAttr = $el.attr('data-category') || $el.attr('class');
      if (categoryAttr) {
        if (categoryAttr.includes('process')) category = PainPointCategory.PROCESS;
        else if (categoryAttr.includes('interface') || categoryAttr.includes('ui')) category = PainPointCategory.INTERFACE;
        else if (categoryAttr.includes('communication')) category = PainPointCategory.COMMUNICATION;
        else if (categoryAttr.includes('technical') || categoryAttr.includes('tech')) category = PainPointCategory.TECHNICAL;
        else if (categoryAttr.includes('policy')) category = PainPointCategory.POLICY;
      }

      const impact = $el.find('.impact').text().trim() || $el.attr('data-impact');
      const solution = $el.find('.solution').text().trim() || $el.attr('data-solution');

      return {
        id: uuidv4(),
        title,
        description,
        severity,
        category,
        phase: phaseId,
        position: this.calculatePosition($el, index),
        impact: impact || undefined,
        solution: solution || undefined
      };
    } catch (error) {
      this.logger.warn(`Failed to parse pain point at index ${index}`, error);
      return null;
    }
  }

  /**
   * Extract quotes
   */
  private extractQuotes($: cheerio.CheerioAPI, element: cheerio.Cheerio<Element>, phaseId: string): Quote[] {
    const quotes: Quote[] = [];
    const selectors = [
      '.quote',
      'blockquote',
      '.testimonial',
      '.customer-quote',
      '[data-type="quote"]',
      ...(this.config.customSelectors?.quotes ? [this.config.customSelectors.quotes] : [])
    ];

    for (const selector of selectors) {
      element.find(selector).each((index, el) => {
        const $el = $(el);
        const quote = this.parseQuote($el, phaseId, index);
        if (quote) {
          quotes.push(quote);
        }
      });
    }

    return quotes;
  }

  /**
   * Parse individual quote
   */
  private parseQuote($el: cheerio.Cheerio<Element>, phaseId: string, index: number): Quote | null {
    try {
      const text = $el.text().trim().replace(/^["']|["']$/g, ''); // Remove surrounding quotes
      const attribution = $el.find('.attribution, cite, .author').text().trim() || 
                         $el.attr('data-attribution');
      const context = $el.find('.context').text().trim() || $el.attr('data-context');

      // Determine sentiment
      let sentiment = SentimentType.NEUTRAL;
      const sentimentAttr = $el.attr('data-sentiment') || $el.attr('class');
      const lowerText = text.toLowerCase();
      
      const positiveWords = ['love', 'great', 'excellent', 'amazing', 'perfect', 'happy', 'satisfied'];
      const negativeWords = ['hate', 'terrible', 'awful', 'frustrated', 'angry', 'disappointed'];
      
      if (sentimentAttr) {
        if (sentimentAttr.includes('positive')) sentiment = SentimentType.POSITIVE;
        else if (sentimentAttr.includes('negative')) sentiment = SentimentType.NEGATIVE;
      } else {
        const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
        
        if (positiveCount > negativeCount) sentiment = SentimentType.POSITIVE;
        else if (negativeCount > positiveCount) sentiment = SentimentType.NEGATIVE;
      }

      return {
        id: uuidv4(),
        text,
        attribution: attribution || undefined,
        sentiment,
        phase: phaseId,
        position: this.calculatePosition($el, index),
        context: context || undefined
      };
    } catch (error) {
      this.logger.warn(`Failed to parse quote at index ${index}`, error);
      return null;
    }
  }

  /**
   * Extract actions
   */
  private extractActions($: cheerio.CheerioAPI, element: cheerio.Cheerio<Element>, phaseId: string): Action[] {
    const actions: Action[] = [];
    const selectors = [
      '.action',
      '.activity',
      '.task',
      '.step-action',
      '[data-type="action"]',
      ...(this.config.customSelectors?.actions ? [this.config.customSelectors.actions] : [])
    ];

    for (const selector of selectors) {
      element.find(selector).each((index, el) => {
        const $el = $(el);
        const action = this.parseAction($el, phaseId, index);
        if (action) {
          actions.push(action);
        }
      });
    }

    return actions;
  }

  /**
   * Parse individual action
   */
  private parseAction($el: cheerio.Cheerio<Element>, phaseId: string, index: number): Action | null {
    try {
      const name = $el.text().trim() || $el.attr('data-name') || `Action ${index + 1}`;
      const description = $el.find('.description').text().trim() || $el.attr('data-description');
      
      // Determine action type
      let type = ActionType.OTHER;
      const typeAttr = $el.attr('data-type') || $el.attr('class') || name.toLowerCase();
      
      if (typeAttr.includes('browse')) type = ActionType.BROWSE;
      else if (typeAttr.includes('search')) type = ActionType.SEARCH;
      else if (typeAttr.includes('click')) type = ActionType.CLICK;
      else if (typeAttr.includes('fill')) type = ActionType.FILL;
      else if (typeAttr.includes('submit')) type = ActionType.SUBMIT;
      else if (typeAttr.includes('wait')) type = ActionType.WAIT;
      else if (typeAttr.includes('call')) type = ActionType.CALL;
      else if (typeAttr.includes('email')) type = ActionType.EMAIL;
      else if (typeAttr.includes('visit')) type = ActionType.VISIT;

      return {
        id: uuidv4(),
        name,
        description: description || undefined,
        type,
        phase: phaseId,
        position: this.calculatePosition($el, index)
      };
    } catch (error) {
      this.logger.warn(`Failed to parse action at index ${index}`, error);
      return null;
    }
  }

  /**
   * Extract channels
   */
  private extractChannels($: cheerio.CheerioAPI, element: cheerio.Cheerio<Element>, phaseId: string): Channel[] {
    const channels: Channel[] = [];
    const selectors = [
      '.channel',
      '.platform',
      '.medium',
      '[data-type="channel"]',
      ...(this.config.customSelectors?.channels ? [this.config.customSelectors.channels] : [])
    ];

    for (const selector of selectors) {
      element.find(selector).each((index, el) => {
        const $el = $(el);
        const channel = this.parseChannel($el, phaseId, index);
        if (channel) {
          channels.push(channel);
        }
      });
    }

    return channels;
  }

  /**
   * Parse individual channel
   */
  private parseChannel($el: cheerio.Cheerio<Element>, phaseId: string, index: number): Channel | null {
    try {
      const name = $el.text().trim() || $el.attr('data-name') || `Channel ${index + 1}`;
      const description = $el.find('.description').text().trim() || $el.attr('data-description');
      
      // Determine channel type
      let type = ChannelType.OTHER;
      const typeAttr = $el.attr('data-type') || $el.attr('class') || name.toLowerCase();
      
      if (typeAttr.includes('website') || typeAttr.includes('web')) type = ChannelType.WEBSITE;
      else if (typeAttr.includes('mobile') || typeAttr.includes('app')) type = ChannelType.MOBILE_APP;
      else if (typeAttr.includes('phone') || typeAttr.includes('call')) type = ChannelType.PHONE;
      else if (typeAttr.includes('email')) type = ChannelType.EMAIL;
      else if (typeAttr.includes('chat')) type = ChannelType.CHAT;
      else if (typeAttr.includes('social')) type = ChannelType.SOCIAL_MEDIA;
      else if (typeAttr.includes('person') || typeAttr.includes('office')) type = ChannelType.IN_PERSON;
      else if (typeAttr.includes('mail') || typeAttr.includes('post')) type = ChannelType.MAIL;

      const digitalIndicator = type === ChannelType.WEBSITE || 
                              type === ChannelType.MOBILE_APP || 
                              type === ChannelType.EMAIL || 
                              type === ChannelType.CHAT || 
                              type === ChannelType.SOCIAL_MEDIA;

      return {
        id: uuidv4(),
        name,
        type,
        description: description || undefined,
        phase: phaseId,
        position: this.calculatePosition($el, index),
        digitalIndicator
      };
    } catch (error) {
      this.logger.warn(`Failed to parse channel at index ${index}`, error);
      return null;
    }
  }

  /**
   * Calculate position for element
   */
  private calculatePosition($el: cheerio.Cheerio<Element>, index: number): Position {
    // Try to get position from data attributes
    const x = $el.attr('data-x');
    const y = $el.attr('data-y');
    
    if (x && y) {
      return {
        x: parseFloat(x),
        y: parseFloat(y)
      };
    }

    // Default positioning based on index
    return {
      x: (index % 4) * 200 + 100,
      y: Math.floor(index / 4) * 150 + 100
    };
  }

  /**
   * Extract metadata from element
   */
  private extractElementMetadata($el: cheerio.Cheerio<Element>): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    // Extract all data attributes
    const attributes = $el.get(0)?.attribs || {};
    Object.keys(attributes).forEach(key => {
      if (key.startsWith('data-')) {
        const metaKey = key.replace('data-', '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        metadata[metaKey] = attributes[key];
      }
    });

    return metadata;
  }

  /**
   * Validate parsed journey map
   */
  private async validateJourneyMap(journeyMap: JourneyMap): Promise<void> {
    const schema = Joi.object({
      id: Joi.string().required(),
      title: Joi.string().min(1).required(),
      phases: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          name: Joi.string().min(1).required(),
          description: Joi.string().optional(),
          order: Joi.number().integer().min(0).required(),
          touchpoints: Joi.array().required(),
          emotions: Joi.array().required(),
          painPoints: Joi.array().required(),
          quotes: Joi.array().required(),
          actions: Joi.array().required(),
          channels: Joi.array().required()
        })
      ).min(1).required(),
      metadata: Joi.object().required()
    });

    const { error } = schema.validate(journeyMap);
    if (error) {
      throw new ValidationError(`Journey map validation failed: ${error.message}`);
    }

    // Additional business logic validation
    if (journeyMap.phases.length === 0) {
      throw new ValidationError('Journey map must contain at least one phase');
    }

    // Check for duplicate phase orders
    const orders = journeyMap.phases.map(p => p.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      throw new ValidationError('Journey map phases must have unique order values');
    }
  }
}