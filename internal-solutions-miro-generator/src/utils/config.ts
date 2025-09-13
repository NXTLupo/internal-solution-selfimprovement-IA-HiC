/**
 * Configuration Manager
 * Handles loading, validation, and management of application configuration
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';
import Joi from 'joi';

import {
  AppConfig,
  MiroConfig,
  ParsingConfig,
  LayoutOptions,
  StylingConfig,
  ApiConfig,
  PerformanceConfig,
  ColorScheme,
  FontConfig,
  ShapeConfig,
  SizeConfig,
  GridConfig
} from '@types/index';
import { Logger } from './logger';
import { ConfigurationError } from './errors';

export class ConfigManager {
  private logger: Logger;
  private configCache: AppConfig | null = null;

  constructor() {
    this.logger = new Logger('ConfigManager');
  }

  /**
   * Load configuration from environment and config files
   */
  async loadConfig(configPath?: string): Promise<AppConfig> {
    try {
      // Load environment variables
      loadEnv();

      // Load base configuration
      const baseConfig = this.loadBaseConfig();

      // Load custom configuration if provided
      let customConfig = {};
      if (configPath && await fs.pathExists(configPath)) {
        customConfig = await this.loadConfigFile(configPath);
      }

      // Merge configurations
      const config = this.mergeConfigs(baseConfig, customConfig);

      // Validate configuration
      await this.validateConfig(config);

      this.configCache = config;
      this.logger.info('Configuration loaded successfully');
      
      return config;

    } catch (error) {
      this.logger.error('Failed to load configuration:', error);
      throw new ConfigurationError('Configuration loading failed', { error });
    }
  }

  /**
   * Load base configuration from environment variables
   */
  private loadBaseConfig(): AppConfig {
    const miroConfig: MiroConfig = {
      accessToken: process.env.MIRO_ACCESS_TOKEN || '',
      boardId: process.env.MIRO_BOARD_ID,
      baseUrl: process.env.API_BASE_URL || 'https://api.miro.com/v2',
      timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
      retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3', 10),
      retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000', 10)
    };

    const parsingConfig: ParsingConfig = {
      touchpoints: process.env.PARSE_TOUCHPOINTS !== 'false',
      painPoints: process.env.PARSE_PAIN_POINTS !== 'false',
      quotes: process.env.PARSE_QUOTES !== 'false',
      emotions: process.env.PARSE_EMOTIONS !== 'false',
      channels: process.env.PARSE_CHANNELS !== 'false',
      actions: process.env.PARSE_ACTIONS !== 'false'
    };

    const gridConfig: GridConfig = {
      cellWidth: parseInt(process.env.GRID_CELL_WIDTH || '200', 10),
      cellHeight: parseInt(process.env.GRID_CELL_HEIGHT || '150', 10),
      marginX: parseInt(process.env.GRID_MARGIN_X || '50', 10),
      marginY: parseInt(process.env.GRID_MARGIN_Y || '50', 10),
      columns: parseInt(process.env.GRID_COLUMNS || '8', 10)
    };

    const layoutOptions: LayoutOptions = {
      grid: gridConfig,
      spacing: {
        phase: 100,
        element: 20,
        group: 40
      },
      alignment: 'center' as any,
      distribution: 'grid' as any
    };

    const colorScheme: ColorScheme = {
      primary: process.env.DEFAULT_SHAPE_COLOR || '#1A73E8',
      secondary: '#4285F4',
      accent: '#9AA0A6',
      background: '#FFFFFF',
      text: '#000000',
      painPoint: process.env.PAIN_POINT_COLOR || '#EA4335',
      positiveEmotion: process.env.POSITIVE_EMOTION_COLOR || '#34A853',
      negativeEmotion: process.env.NEGATIVE_EMOTION_COLOR || '#FBBC04',
      neutral: '#9AA0A6'
    };

    const fontConfig: FontConfig = {
      primary: 'Arial',
      secondary: 'Helvetica',
      sizes: {
        small: 10,
        medium: 12,
        large: 16,
        xlarge: 20
      }
    };

    const shapeConfig: ShapeConfig = {
      default: 'rectangle' as any,
      touchpoint: 'rectangle' as any,
      painPoint: 'rectangle' as any,
      emotion: 'circle' as any,
      quote: 'rectangle' as any,
      action: 'arrow_right' as any,
      channel: 'diamond' as any
    };

    const sizeConfig: SizeConfig = {
      small: { width: 100, height: 80 },
      medium: { width: 150, height: 100 },
      large: { width: 200, height: 120 },
      xlarge: { width: 250, height: 150 }
    };

    const stylingConfig: StylingConfig = {
      colorScheme,
      fonts: fontConfig,
      shapes: shapeConfig,
      sizes: sizeConfig
    };

    const apiConfig: ApiConfig = {
      rateLimit: parseInt(process.env.API_RATE_LIMIT || '100', 10),
      batchSize: parseInt(process.env.BATCH_SIZE || '10', 10),
      concurrentRequests: parseInt(process.env.CONCURRENT_REQUESTS || '5', 10),
      timeout: parseInt(process.env.API_TIMEOUT || '30000', 10)
    };

    const performanceConfig: PerformanceConfig = {
      memoryLimit: parseInt(process.env.MEMORY_LIMIT || '512', 10),
      processingTimeout: 300000, // 5 minutes
      maxFileSize: 50 * 1024 * 1024, // 50MB
      cacheEnabled: process.env.NODE_ENV !== 'development'
    };

    return {
      miro: miroConfig,
      parsing: parsingConfig,
      layout: layoutOptions,
      styling: stylingConfig,
      api: apiConfig,
      performance: performanceConfig
    };
  }

  /**
   * Load configuration from file
   */
  private async loadConfigFile(configPath: string): Promise<Partial<AppConfig>> {
    try {
      const fileContent = await fs.readFile(configPath, 'utf-8');
      const extension = path.extname(configPath).toLowerCase();

      switch (extension) {
        case '.json':
          return JSON.parse(fileContent);
        case '.js':
          // Dynamic import for JS config files
          delete require.cache[require.resolve(path.resolve(configPath))];
          return require(path.resolve(configPath));
        default:
          throw new ConfigurationError(`Unsupported config file format: ${extension}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load config file: ${configPath}`, error);
      throw new ConfigurationError(`Failed to load config file: ${configPath}`);
    }
  }

  /**
   * Merge multiple configuration objects
   */
  private mergeConfigs(base: AppConfig, custom: Partial<AppConfig>): AppConfig {
    return {
      miro: { ...base.miro, ...custom.miro },
      parsing: { ...base.parsing, ...custom.parsing },
      layout: {
        grid: { ...base.layout.grid, ...custom.layout?.grid },
        spacing: { ...base.layout.spacing, ...custom.layout?.spacing },
        alignment: custom.layout?.alignment || base.layout.alignment,
        distribution: custom.layout?.distribution || base.layout.distribution
      },
      styling: {
        colorScheme: { ...base.styling.colorScheme, ...custom.styling?.colorScheme },
        fonts: { ...base.styling.fonts, ...custom.styling?.fonts },
        shapes: { ...base.styling.shapes, ...custom.styling?.shapes },
        sizes: { ...base.styling.sizes, ...custom.styling?.sizes }
      },
      api: { ...base.api, ...custom.api },
      performance: { ...base.performance, ...custom.performance }
    };
  }

  /**
   * Validate configuration using Joi schema
   */
  private async validateConfig(config: AppConfig): Promise<void> {
    const schema = Joi.object({
      miro: Joi.object({
        accessToken: Joi.string().min(1).required(),
        boardId: Joi.string().optional(),
        baseUrl: Joi.string().uri().required(),
        timeout: Joi.number().integer().min(1000).max(300000).required(),
        retryAttempts: Joi.number().integer().min(0).max(10).required(),
        retryDelay: Joi.number().integer().min(100).max(10000).required()
      }).required(),

      parsing: Joi.object({
        touchpoints: Joi.boolean().required(),
        painPoints: Joi.boolean().required(),
        quotes: Joi.boolean().required(),
        emotions: Joi.boolean().required(),
        channels: Joi.boolean().required(),
        actions: Joi.boolean().required(),
        customSelectors: Joi.object().optional()
      }).required(),

      layout: Joi.object({
        grid: Joi.object({
          cellWidth: Joi.number().integer().min(50).required(),
          cellHeight: Joi.number().integer().min(50).required(),
          marginX: Joi.number().integer().min(0).required(),
          marginY: Joi.number().integer().min(0).required(),
          columns: Joi.number().integer().min(1).required()
        }).required(),
        spacing: Joi.object({
          phase: Joi.number().min(0).required(),
          element: Joi.number().min(0).required(),
          group: Joi.number().min(0).required()
        }).required(),
        alignment: Joi.string().required(),
        distribution: Joi.string().required()
      }).required(),

      styling: Joi.object().required(),
      api: Joi.object().required(),
      performance: Joi.object().required()
    });

    const { error } = schema.validate(config);
    if (error) {
      throw new ConfigurationError(`Configuration validation failed: ${error.message}`);
    }

    // Additional validation
    if (!config.miro.accessToken) {
      throw new ConfigurationError('Miro access token is required');
    }
  }

  /**
   * Get current cached configuration
   */
  getCurrentConfig(): AppConfig {
    if (!this.configCache) {
      throw new ConfigurationError('Configuration not loaded. Call loadConfig() first.');
    }
    return this.configCache;
  }

  /**
   * Initialize configuration interactively
   */
  async initializeConfig(answers: any): Promise<void> {
    const configDir = path.join(process.cwd(), 'config');
    await fs.ensureDir(configDir);

    const configData = {
      miro: {
        accessToken: answers.accessToken,
        boardId: answers.boardId || undefined
      },
      logging: {
        level: answers.logLevel || 'info'
      }
    };

    const configPath = path.join(configDir, 'local.json');
    await fs.writeJson(configPath, configData, { spaces: 2 });

    // Update environment variables
    await this.updateEnvFile('MIRO_ACCESS_TOKEN', answers.accessToken);
    if (answers.boardId) {
      await this.updateEnvFile('MIRO_BOARD_ID', answers.boardId);
    }
    await this.updateEnvFile('LOG_LEVEL', answers.logLevel);
  }

  /**
   * Set Miro access token
   */
  async setMiroToken(token: string): Promise<void> {
    await this.updateEnvFile('MIRO_ACCESS_TOKEN', token);
    if (this.configCache) {
      this.configCache.miro.accessToken = token;
    }
  }

  /**
   * Set default board ID
   */
  async setDefaultBoard(boardId: string): Promise<void> {
    await this.updateEnvFile('MIRO_BOARD_ID', boardId);
    if (this.configCache) {
      this.configCache.miro.boardId = boardId;
    }
  }

  /**
   * Update .env file
   */
  private async updateEnvFile(key: string, value: string): Promise<void> {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    if (await fs.pathExists(envPath)) {
      envContent = await fs.readFile(envPath, 'utf-8');
    }

    const lines = envContent.split('\n');
    const keyIndex = lines.findIndex(line => line.startsWith(`${key}=`));

    if (keyIndex >= 0) {
      lines[keyIndex] = `${key}=${value}`;
    } else {
      lines.push(`${key}=${value}`);
    }

    await fs.writeFile(envPath, lines.join('\n'));
  }

  /**
   * Template management
   */
  async listTemplates(): Promise<Array<{ name: string; description: string }>> {
    const templatesDir = path.join(process.cwd(), 'config', 'templates');
    
    if (!await fs.pathExists(templatesDir)) {
      return [
        { name: 'default', description: 'Default template with standard colors and layout' },
        { name: 'minimal', description: 'Minimal template with reduced visual elements' },
        { name: 'colorful', description: 'Colorful template with vibrant colors' }
      ];
    }

    const templateFiles = await fs.readdir(templatesDir);
    const templates = [];

    for (const file of templateFiles) {
      if (path.extname(file) === '.json') {
        try {
          const templateData = await fs.readJson(path.join(templatesDir, file));
          templates.push({
            name: path.basename(file, '.json'),
            description: templateData.description || 'No description available'
          });
        } catch (error) {
          this.logger.warn(`Failed to read template ${file}:`, error);
        }
      }
    }

    return templates;
  }

  async createTemplate(name: string, options: any): Promise<void> {
    const templatesDir = path.join(process.cwd(), 'config', 'templates');
    await fs.ensureDir(templatesDir);

    const templateData = {
      name,
      description: options.description,
      colorScheme: options.colorScheme || 'default',
      createdAt: new Date().toISOString(),
      styling: {
        colorScheme: {
          primary: '#1A73E8',
          secondary: '#4285F4',
          accent: '#9AA0A6'
        }
      }
    };

    const templatePath = path.join(templatesDir, `${name}.json`);
    await fs.writeJson(templatePath, templateData, { spaces: 2 });
  }

  async deleteTemplate(name: string): Promise<void> {
    const templatePath = path.join(process.cwd(), 'config', 'templates', `${name}.json`);
    
    if (await fs.pathExists(templatePath)) {
      await fs.remove(templatePath);
    } else {
      throw new ConfigurationError(`Template '${name}' not found`);
    }
  }
}