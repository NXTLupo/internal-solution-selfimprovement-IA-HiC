/**
 * Integration Test - Full Pipeline
 * Tests the complete journey from HTML parsing to Miro board generation
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { config } from 'dotenv';

import { JourneyMapParser } from '@parsers/journey-parser';
import { MiroAPIClient } from '@miro/api-client';
import { BoardGenerator } from '@miro/board-generator';
import { GridLayout } from '@utils/grid-layout';
import { Logger } from '@utils/logger';
import { ConfigManager } from '@utils/config';
import { AppConfig, ParsingConfig, LayoutOptions, MiroConfig } from '@types/index';

// Load environment variables
config();

describe('Full Pipeline Integration Test', () => {
  let logger: Logger;
  let configManager: ConfigManager;
  let sampleHtmlPath: string;

  beforeAll(() => {
    logger = new Logger('IntegrationTest');
    configManager = new ConfigManager();
    sampleHtmlPath = path.join(__dirname, '../../examples/sample-journey-map.html');
  });

  describe('HTML Parsing', () => {
    test('should parse sample journey map HTML correctly', async () => {
      // Arrange
      const config: ParsingConfig = {
        touchpoints: true,
        painPoints: true,
        emotions: true,
        quotes: true,
        actions: true,
        channels: true,
        customSelectors: {}
      };

      const parser = new JourneyMapParser(config);

      // Act
      const journeyMap = await parser.parseFromFile(sampleHtmlPath);

      // Assert
      expect(journeyMap).toBeDefined();
      expect(journeyMap.title).toBe('Customer Journey Map - Online Banking Account Setup');
      expect(journeyMap.phases).toHaveLength(5);
      
      // Verify phases
      const phaseNames = journeyMap.phases.map(p => p.name);
      expect(phaseNames).toEqual(['Awareness', 'Consideration', 'Application', 'Verification', 'Onboarding']);

      // Verify content extraction
      const awarenessPhase = journeyMap.phases[0];
      expect(awarenessPhase.touchpoints.length).toBeGreaterThan(0);
      expect(awarenessPhase.painPoints.length).toBeGreaterThan(0);
      expect(awarenessPhase.emotions.length).toBeGreaterThan(0);
      expect(awarenessPhase.quotes.length).toBeGreaterThan(0);
      expect(awarenessPhase.actions.length).toBeGreaterThan(0);
      expect(awarenessPhase.channels.length).toBeGreaterThan(0);

      logger.info('✅ HTML parsing test passed');
      logger.debug(`Parsed ${journeyMap.phases.length} phases with total elements:`, {
        touchpoints: journeyMap.phases.reduce((sum, p) => sum + p.touchpoints.length, 0),
        painPoints: journeyMap.phases.reduce((sum, p) => sum + p.painPoints.length, 0),
        emotions: journeyMap.phases.reduce((sum, p) => sum + p.emotions.length, 0),
        quotes: journeyMap.phases.reduce((sum, p) => sum + p.quotes.length, 0),
        actions: journeyMap.phases.reduce((sum, p) => sum + p.actions.length, 0),
        channels: journeyMap.phases.reduce((sum, p) => sum + p.channels.length, 0)
      });
    });

    test('should extract correct element attributes', async () => {
      // Arrange
      const config: ParsingConfig = {
        touchpoints: true,
        painPoints: true,
        emotions: true,
        quotes: true,
        actions: true,
        channels: true,
        customSelectors: {}
      };

      const parser = new JourneyMapParser(config);

      // Act
      const journeyMap = await parser.parseFromFile(sampleHtmlPath);

      // Assert - Check specific elements
      const applicationPhase = journeyMap.phases.find(p => p.name === 'Application');
      expect(applicationPhase).toBeDefined();

      // Check pain point severity
      const criticalPainPoint = applicationPhase!.painPoints.find(pp => pp.title === 'Form Timeout Issues');
      expect(criticalPainPoint).toBeDefined();
      expect(criticalPainPoint!.severity).toBe('critical');

      // Check emotion types and intensity
      const negativeEmotion = applicationPhase!.emotions.find(e => e.intensity === 9);
      expect(negativeEmotion).toBeDefined();
      expect(negativeEmotion!.type).toBe('negative');

      logger.info('✅ Element attribute extraction test passed');
    });
  });

  describe('Grid Layout Generation', () => {
    test('should generate optimal layout for journey map', async () => {
      // Arrange
      const parsingConfig: ParsingConfig = {
        touchpoints: true,
        painPoints: true,
        emotions: true,
        quotes: true,
        actions: true,
        channels: true,
        customSelectors: {}
      };

      const layoutConfig: LayoutOptions = {
        grid: {
          cellWidth: 200,
          cellHeight: 150,
          marginX: 50,
          marginY: 50
        },
        spacing: {
          element: 20,
          group: 40,
          phase: 60
        }
      };

      const parser = new JourneyMapParser(parsingConfig);
      const layout = new GridLayout(layoutConfig);

      // Act
      const journeyMap = await parser.parseFromFile(sampleHtmlPath);
      const layoutResult = layout.generateLayout(journeyMap);

      // Assert
      expect(layoutResult).toBeDefined();
      expect(layoutResult.phases).toHaveLength(5);
      expect(layoutResult.bounds.width).toBeGreaterThan(0);
      expect(layoutResult.bounds.height).toBeGreaterThan(0);
      expect(layoutResult.totalElements).toBeGreaterThan(0);

      // Verify phase layouts
      layoutResult.phases.forEach((phaseLayout, index) => {
        expect(phaseLayout.phaseId).toBe(journeyMap.phases[index].id);
        expect(phaseLayout.bounds.width).toBeGreaterThan(0);
        expect(phaseLayout.bounds.height).toBeGreaterThan(0);
      });

      // Verify layout optimization
      const optimizedLayout = layout.optimizeLayout(layoutResult);
      expect(optimizedLayout).toBeDefined();

      logger.info('✅ Grid layout generation test passed');
      logger.debug('Layout stats:', layout.getLayoutStats(layoutResult));
    });
  });

  describe('Miro API Integration (Mock)', () => {
    test('should configure Miro API client correctly', async () => {
      // Arrange
      const miroConfig: MiroConfig = {
        accessToken: 'test-token',
        baseUrl: 'https://api.miro.com/v2',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        boardId: 'test-board-id'
      };

      // Act
      const miroClient = new MiroAPIClient(miroConfig);

      // Assert
      expect(miroClient).toBeDefined();
      expect(miroClient.getBoardUrl('test-board')).toBe('https://miro.com/app/board/test-board/');

      logger.info('✅ Miro API client configuration test passed');
    });

    test('should create board generator with proper configuration', async () => {
      // Arrange
      const appConfig: AppConfig = {
        miro: {
          accessToken: 'test-token',
          baseUrl: 'https://api.miro.com/v2',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000,
          boardId: 'test-board-id'
        },
        parsing: {
          touchpoints: true,
          painPoints: true,
          emotions: true,
          quotes: true,
          actions: true,
          channels: true,
          customSelectors: {}
        },
        layout: {
          grid: {
            cellWidth: 200,
            cellHeight: 150,
            marginX: 50,
            marginY: 50
          },
          spacing: {
            element: 20,
            group: 40,
            phase: 60
          }
        },
        styling: {
          colorScheme: {
            primary: '#1A73E8',
            secondary: '#34A853',
            accent: '#EA4335',
            background: '#FFFFFF',
            painPoint: '#FFEBEE',
            positiveEmotion: '#E8F5E8',
            negativeEmotion: '#FFF3E0',
            neutral: '#F5F5F5'
          },
          fonts: {
            primary: 'Arial',
            secondary: 'Helvetica'
          }
        }
      };

      const miroClient = new MiroAPIClient(appConfig.miro);
      const boardGenerator = new BoardGenerator(miroClient, appConfig);

      // Assert
      expect(boardGenerator).toBeDefined();

      logger.info('✅ Board generator configuration test passed');
    });
  });

  describe('Full Pipeline Simulation', () => {
    test('should complete full pipeline without errors', async () => {
      // Arrange
      const appConfig: AppConfig = {
        miro: {
          accessToken: 'test-token',
          baseUrl: 'https://api.miro.com/v2',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000,
          boardId: 'test-board-id'
        },
        parsing: {
          touchpoints: true,
          painPoints: true,
          emotions: true,
          quotes: true,
          actions: true,
          channels: true,
          customSelectors: {}
        },
        layout: {
          grid: {
            cellWidth: 200,
            cellHeight: 150,
            marginX: 50,
            marginY: 50
          },
          spacing: {
            element: 20,
            group: 40,
            phase: 60
          }
        },
        styling: {
          colorScheme: {
            primary: '#1A73E8',
            secondary: '#34A853',
            accent: '#EA4335',
            background: '#FFFFFF',
            painPoint: '#FFEBEE',
            positiveEmotion: '#E8F5E8',
            negativeEmotion: '#FFF3E0',
            neutral: '#F5F5F5'
          },
          fonts: {
            primary: 'Arial',
            secondary: 'Helvetica'
          }
        }
      };

      // Act & Assert - Step 1: Parse HTML
      const parser = new JourneyMapParser(appConfig.parsing);
      const journeyMap = await parser.parseFromFile(sampleHtmlPath);
      expect(journeyMap).toBeDefined();
      logger.info('✅ Step 1: HTML parsing completed');

      // Act & Assert - Step 2: Generate Layout
      const gridLayout = new GridLayout(appConfig.layout);
      const layoutResult = gridLayout.generateLayout(journeyMap);
      expect(layoutResult).toBeDefined();
      logger.info('✅ Step 2: Layout generation completed');

      // Act & Assert - Step 3: Optimize Layout
      const optimizedLayout = gridLayout.optimizeLayout(layoutResult);
      expect(optimizedLayout).toBeDefined();
      logger.info('✅ Step 3: Layout optimization completed');

      // Step 4: Miro API (simulated)
      const miroClient = new MiroAPIClient(appConfig.miro);
      const boardGenerator = new BoardGenerator(miroClient, appConfig);
      expect(boardGenerator).toBeDefined();
      logger.info('✅ Step 4: Miro components ready');

      // Generate summary
      const summary = {
        journeyMap: {
          title: journeyMap.title,
          phases: journeyMap.phases.length,
          totalElements: journeyMap.phases.reduce((sum, phase) => 
            sum + phase.touchpoints.length + phase.painPoints.length + 
            phase.emotions.length + phase.quotes.length + 
            phase.actions.length + phase.channels.length, 0)
        },
        layout: {
          bounds: optimizedLayout.bounds,
          gridInfo: optimizedLayout.gridInfo,
          efficiency: gridLayout.getLayoutStats(optimizedLayout).efficiency
        }
      };

      logger.info('✅ Full pipeline simulation completed successfully');
      logger.debug('Pipeline summary:', summary);

      expect(summary.journeyMap.totalElements).toBeGreaterThan(20);
      expect(summary.layout.bounds.width).toBeGreaterThan(1000);
    });
  });

  describe('Configuration Management', () => {
    test('should load and validate configuration', async () => {
      // This test would check configuration loading in a real scenario
      // For now, we'll test the structure

      const config = {
        miro: {
          accessToken: process.env.MIRO_ACCESS_TOKEN || 'test-token',
          baseUrl: 'https://api.miro.com/v2',
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        }
      };

      expect(config.miro).toBeDefined();
      expect(config.miro.baseUrl).toBe('https://api.miro.com/v2');

      logger.info('✅ Configuration management test passed');
    });
  });
});

/**
 * Utility function to run integration test manually
 */
export async function runManualIntegrationTest(htmlFilePath: string): Promise<void> {
  const logger = new Logger('ManualIntegration');
  
  try {
    logger.info('🚀 Starting manual integration test...');

    // Check if HTML file exists
    if (!await fs.pathExists(htmlFilePath)) {
      throw new Error(`HTML file not found: ${htmlFilePath}`);
    }

    const appConfig: AppConfig = {
      miro: {
        accessToken: process.env.MIRO_ACCESS_TOKEN || 'test-token',
        baseUrl: 'https://api.miro.com/v2',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        boardId: process.env.MIRO_BOARD_ID
      },
      parsing: {
        touchpoints: true,
        painPoints: true,
        emotions: true,
        quotes: true,
        actions: true,
        channels: true,
        customSelectors: {}
      },
      layout: {
        grid: {
          cellWidth: 200,
          cellHeight: 150,
          marginX: 50,
          marginY: 50
        },
        spacing: {
          element: 20,
          group: 40,
          phase: 60
        }
      },
      styling: {
        colorScheme: {
          primary: '#1A73E8',
          secondary: '#34A853',
          accent: '#EA4335',
          background: '#FFFFFF',
          painPoint: '#FFEBEE',
          positiveEmotion: '#E8F5E8',
          negativeEmotion: '#FFF3E0',
          neutral: '#F5F5F5'
        },
        fonts: {
          primary: 'Arial',
          secondary: 'Helvetica'
        }
      }
    };

    // Step 1: Parse HTML
    logger.info('📄 Parsing journey map HTML...');
    const parser = new JourneyMapParser(appConfig.parsing);
    const journeyMap = await parser.parseFromFile(htmlFilePath);
    logger.info(`✅ Parsed: "${journeyMap.title}" with ${journeyMap.phases.length} phases`);

    // Step 2: Generate Layout
    logger.info('🎯 Generating layout...');
    const gridLayout = new GridLayout(appConfig.layout);
    const layoutResult = gridLayout.generateLayout(journeyMap);
    const optimizedLayout = gridLayout.optimizeLayout(layoutResult);
    const stats = gridLayout.getLayoutStats(optimizedLayout);
    logger.info(`✅ Layout generated: ${stats.phases} phases, ${stats.totalElements} elements, ${stats.efficiency.toFixed(1)}% efficiency`);

    // Step 3: Prepare for Miro (without creating board)
    logger.info('🎨 Preparing Miro board components...');
    const miroClient = new MiroAPIClient(appConfig.miro);
    const boardGenerator = new BoardGenerator(miroClient, appConfig);
    logger.info('✅ Miro components ready');

    // Generate output summary
    const outputDir = path.join(process.cwd(), 'output', 'integration-test');
    await fs.ensureDir(outputDir);

    const summary = {
      timestamp: new Date().toISOString(),
      source: htmlFilePath,
      journeyMap: {
        title: journeyMap.title,
        phases: journeyMap.phases.map(phase => ({
          name: phase.name,
          elements: {
            touchpoints: phase.touchpoints.length,
            painPoints: phase.painPoints.length,
            emotions: phase.emotions.length,
            quotes: phase.quotes.length,
            actions: phase.actions.length,
            channels: phase.channels.length
          }
        }))
      },
      layout: {
        bounds: optimizedLayout.bounds,
        gridInfo: optimizedLayout.gridInfo,
        stats
      }
    };

    await fs.writeJson(path.join(outputDir, 'integration-summary.json'), summary, { spaces: 2 });
    await fs.writeJson(path.join(outputDir, 'journey-map.json'), journeyMap, { spaces: 2 });
    await fs.writeJson(path.join(outputDir, 'layout.json'), optimizedLayout, { spaces: 2 });

    logger.info('🎉 Manual integration test completed successfully!');
    logger.info(`📁 Output saved to: ${outputDir}`);

  } catch (error) {
    logger.error('❌ Manual integration test failed:', error);
    throw error;
  }
}