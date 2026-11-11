#!/usr/bin/env node

/**
 * CLI Entry Point for NXT Miro Generator
 * Provides command-line interface for generating Miro boards from journey maps
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { config } from 'dotenv';

import { JourneyMapParser } from '../parsers/journey-parser';
import { MiroAPIClient } from '../miro/api-client';
import { BoardGenerator } from '../miro/board-generator';
import { GridLayout } from '../utils/grid-layout';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../utils/config';
import { ValidationError, MiroAPIError } from '../utils/errors';
import { CLIOptions, AppConfig } from '../types/index';

// Load environment variables
config();

const program = new Command();
const logger = new Logger();
const configManager = new ConfigManager();

/**
 * Progress and result lines go to stdout, next to the summary they introduce; errors stay on stderr.
 */
function startSpinner(text: string): ReturnType<typeof ora> {
  return ora({ text, stream: process.stdout }).start();
}

/**
 * Main CLI setup
 */
function setupCLI(): void {
  program
    .name('miro-gen')
    .description('Generate interactive Miro boards from Claude journey mapper HTML')
    .version('1.0.0');

  // Generate command
  program
    .command('generate')
    .alias('gen')
    .description('Generate a Miro board from journey map HTML')
    .requiredOption('-i, --input <file>', 'Input HTML file path')
    .option('-o, --output <dir>', 'Output directory for generated files', './output')
    .option('-b, --board-id <id>', 'Miro board ID (optional, creates new board if not provided)')
    .option('-t, --template <name>', 'Template to use for board generation', 'default')
    .option('-c, --config <file>', 'Configuration file path')
    .option('--dry-run', 'Preview what would be generated without creating the board')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-f, --force', 'Force overwrite existing files')
    .action(async (options: CLIOptions) => {
      await handleGenerateCommand(options);
    });

  // Validate command
  program
    .command('validate')
    .description('Validate journey map HTML file')
    .requiredOption('-i, --input <file>', 'Input HTML file path')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options: Pick<CLIOptions, 'input' | 'verbose'>) => {
      await handleValidateCommand(options);
    });

  // Config command
  program
    .command('config')
    .description('Configure Miro API settings')
    .option('--set-token <token>', 'Set Miro access token')
    .option('--set-board <id>', 'Set default board ID')
    .option('--show', 'Show current configuration')
    .option('--init', 'Initialize configuration interactively')
    .action(async (options) => {
      await handleConfigCommand(options);
    });

  // Template command
  program
    .command('template')
    .description('Manage board templates')
    .option('--list', 'List available templates')
    .option('--create <name>', 'Create new template')
    .option('--delete <name>', 'Delete template')
    .action(async (options) => {
      await handleTemplateCommand(options);
    });

  // Test command
  program
    .command('test')
    .description('Test Miro API connection')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options: Pick<CLIOptions, 'verbose'>) => {
      await handleTestCommand(options);
    });
}

/**
 * Handle generate command
 */
async function handleGenerateCommand(options: CLIOptions): Promise<void> {
  const spinner = startSpinner('Initializing Miro board generation...');
  
  try {
    // Setup logging
    if (options.verbose) {
      logger.setLevel('debug');
    }

    // Load configuration
    const config = await loadConfiguration(options.config);
    logger.info('Configuration loaded successfully');

    // Validate input file
    await validateInputFile(options.input);
    spinner.text = 'Validating input file...';

    // Parse journey map
    spinner.text = 'Parsing journey map HTML...';
    const parser = new JourneyMapParser(config.parsing);
    const journeyMap = await parser.parseFromFile(options.input);
    logger.info(`Parsed journey map: ${journeyMap.title}`);
    logger.debug(`Found ${journeyMap.phases.length} phases`);

    if (options.dryRun) {
      spinner.succeed('Dry run completed - would generate board with:');
      console.log(chalk.cyan(`  Title: ${journeyMap.title}`));
      console.log(chalk.cyan(`  Phases: ${journeyMap.phases.length}`));
      console.log(chalk.cyan(`  Total touchpoints: ${journeyMap.phases.reduce((sum, p) => sum + p.touchpoints.length, 0)}`));
      console.log(chalk.cyan(`  Total pain points: ${journeyMap.phases.reduce((sum, p) => sum + p.painPoints.length, 0)}`));
      return;
    }

    // Initialize Miro API client
    spinner.text = 'Connecting to Miro API...';
    const miroClient = new MiroAPIClient(config.miro);
    await miroClient.validateConnection();

    // Determine board
    let boardId = options.boardId || config.miro.boardId;
    if (!boardId) {
      const createBoard = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'create',
          message: 'No board ID specified. Create a new board?',
          default: true
        }
      ]);

      if (createBoard.create) {
        spinner.text = 'Creating new Miro board...';
        const board = await miroClient.createBoard(journeyMap.title);
        boardId = board.id;
        logger.info(`Created new board: ${boardId}`);
      } else {
        throw new ValidationError('Board ID is required');
      }
    }

    // Generate layout
    spinner.text = 'Calculating optimal layout...';
    const gridLayout = new GridLayout(config.layout);
    const layout = gridLayout.generateLayout(journeyMap);

    // Generate board
    spinner.text = 'Generating Miro board...';
    const boardGenerator = new BoardGenerator(miroClient, config);
    const result = await boardGenerator.generateBoard(journeyMap, layout, boardId);

    // Save output
    if (options.output) {
      spinner.text = 'Saving output files...';
      await saveGenerationOutput(options.output, result, journeyMap);
    }

    spinner.succeed(chalk.green('Miro board generated successfully!'));
    console.log(chalk.cyan(`  Board URL: ${result.boardUrl}`));
    console.log(chalk.cyan(`  Items created: ${result.itemsCreated}`));
    
    if (options.output) {
      console.log(chalk.cyan(`  Output saved to: ${path.resolve(options.output)}`));
    }

  } catch (error) {
    spinner.fail('Generation failed');
    await handleError(error);
    process.exit(1);
  }
}

/**
 * Handle validate command
 */
async function handleValidateCommand(options: Pick<CLIOptions, 'input' | 'verbose'>): Promise<void> {
  const spinner = startSpinner('Validating journey map HTML...');

  try {
    if (options.verbose) {
      logger.setLevel('debug');
    }

    await validateInputFile(options.input);
    
    const config = await loadConfiguration();
    const parser = new JourneyMapParser(config.parsing);
    const journeyMap = await parser.parseFromFile(options.input);

    spinner.succeed('Validation successful!');
    console.log(chalk.green('\nJourney Map Summary:'));
    console.log(chalk.cyan(`  Title: ${journeyMap.title}`));
    console.log(chalk.cyan(`  Phases: ${journeyMap.phases.length}`));
    
    journeyMap.phases.forEach((phase, index) => {
      console.log(chalk.gray(`    ${index + 1}. ${phase.name}`));
      console.log(chalk.gray(`       Touchpoints: ${phase.touchpoints.length}`));
      console.log(chalk.gray(`       Pain Points: ${phase.painPoints.length}`));
      console.log(chalk.gray(`       Quotes: ${phase.quotes.length}`));
    });

  } catch (error) {
    spinner.fail('Validation failed');
    await handleError(error);
    process.exit(1);
  }
}

/**
 * Handle config command
 */
async function handleConfigCommand(options: any): Promise<void> {
  try {
    if (options.init) {
      await initializeConfiguration();
    } else if (options.show) {
      await showConfiguration();
    } else if (options.setToken) {
      await configManager.setMiroToken(options.setToken);
      console.log(chalk.green('Miro access token updated successfully'));
    } else if (options.setBoard) {
      await configManager.setDefaultBoard(options.setBoard);
      console.log(chalk.green('Default board ID updated successfully'));
    } else {
      console.log(chalk.yellow('No configuration action specified. Use --help for options.'));
    }
  } catch (error) {
    await handleError(error);
    process.exit(1);
  }
}

/**
 * Handle template command
 */
async function handleTemplateCommand(options: any): Promise<void> {
  try {
    if (options.list) {
      const templates = await configManager.listTemplates();
      console.log(chalk.green('Available templates:'));
      templates.forEach((template, index) => {
        console.log(chalk.cyan(`  ${index + 1}. ${template.name} - ${template.description}`));
      });
    } else if (options.create) {
      await createTemplate(options.create);
    } else if (options.delete) {
      await deleteTemplate(options.delete);
    } else {
      console.log(chalk.yellow('No template action specified. Use --help for options.'));
    }
  } catch (error) {
    await handleError(error);
    process.exit(1);
  }
}

/**
 * Handle test command
 */
async function handleTestCommand(options: Pick<CLIOptions, 'verbose'>): Promise<void> {
  const spinner = startSpinner('Testing Miro API connection...');

  try {
    if (options.verbose) {
      logger.setLevel('debug');
    }

    const config = await loadConfiguration();
    const miroClient = new MiroAPIClient(config.miro);
    
    const user = await miroClient.validateConnection();
    spinner.succeed('Connection test successful!');
    console.log(chalk.green(`  Connected as: ${user.name} (${user.email})`));

  } catch (error) {
    spinner.fail('Connection test failed');
    await handleError(error);
    process.exit(1);
  }
}

/**
 * Utility functions
 */
async function loadConfiguration(configPath?: string): Promise<AppConfig> {
  try {
    return await configManager.loadConfig(configPath);
  } catch (error) {
    logger.error('Failed to load configuration:', error);
    throw new ValidationError('Configuration loading failed');
  }
}

async function validateInputFile(filePath: string): Promise<void> {
  if (!await fs.pathExists(filePath)) {
    throw new ValidationError(`Input file not found: ${filePath}`);
  }

  const stats = await fs.stat(filePath);
  if (!stats.isFile()) {
    throw new ValidationError(`Input path is not a file: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.html' && ext !== '.htm') {
    throw new ValidationError(`Input file must be HTML: ${filePath}`);
  }
}

async function saveGenerationOutput(outputDir: string, result: any, journeyMap: any): Promise<void> {
  await fs.ensureDir(outputDir);
  
  // Save generation summary
  const summary = {
    timestamp: new Date().toISOString(),
    journeyMap: {
      title: journeyMap.title,
      phases: journeyMap.phases.length,
      metadata: journeyMap.metadata
    },
    result: {
      boardUrl: result.boardUrl,
      itemsCreated: result.itemsCreated,
      boardId: result.boardId
    }
  };

  await fs.writeJson(path.join(outputDir, 'generation-summary.json'), summary, { spaces: 2 });
  
  // Save raw journey map data
  await fs.writeJson(path.join(outputDir, 'journey-map.json'), journeyMap, { spaces: 2 });
}

async function initializeConfiguration(): Promise<void> {
  console.log(chalk.blue('\n🚀 Initializing Miro Generator Configuration\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'accessToken',
      message: 'Enter your Miro access token:',
      validate: (input) => input.length > 0 || 'Access token is required'
    },
    {
      type: 'input',
      name: 'boardId',
      message: 'Enter default board ID (optional):',
    },
    {
      type: 'list',
      name: 'logLevel',
      message: 'Select logging level:',
      choices: ['error', 'warn', 'info', 'debug'],
      default: 'info'
    }
  ]);

  await configManager.initializeConfig(answers);
  console.log(chalk.green('\n✅ Configuration initialized successfully!'));
}

async function showConfiguration(): Promise<void> {
  const config = await loadConfiguration();
  const token = config.miro.accessToken;
  console.log(chalk.blue('\n📋 Current Configuration:\n'));
  console.log(chalk.cyan(`  Miro Access Token: ${token ? `${'*'.repeat(20)}${token.slice(-4)}` : 'Not set'}`));
  console.log(chalk.cyan(`  Default Board ID: ${config.miro.boardId || 'Not set'}`));
  console.log(chalk.cyan(`  API Base URL: ${config.miro.baseUrl}`));
  console.log(chalk.cyan(`  Log Level: ${logger.getLevel()}`));
}

async function createTemplate(name: string): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Enter template description:',
      validate: (input) => input.length > 0 || 'Description is required'
    },
    {
      type: 'input',
      name: 'colorScheme',
      message: 'Enter color scheme name:',
      default: 'default'
    }
  ]);

  await configManager.createTemplate(name, answers);
  console.log(chalk.green(`Template '${name}' created successfully!`));
}

async function deleteTemplate(name: string): Promise<void> {
  const confirm = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'delete',
      message: `Are you sure you want to delete template '${name}'?`,
      default: false
    }
  ]);

  if (confirm.delete) {
    await configManager.deleteTemplate(name);
    console.log(chalk.green(`Template '${name}' deleted successfully!`));
  } else {
    console.log(chalk.yellow('Template deletion cancelled.'));
  }
}

async function handleError(error: unknown): Promise<void> {
  if (error instanceof ValidationError) {
    console.error(chalk.red(`❌ Validation Error: ${error.message}`));
    if (error.details) {
      console.error(chalk.gray('Details:', JSON.stringify(error.details, null, 2)));
    }
  } else if (error instanceof MiroAPIError) {
    console.error(chalk.red(`❌ Miro API Error: ${error.message}`));
    console.error(chalk.gray(`Status Code: ${error.statusCode}`));
    if (error.details) {
      console.error(chalk.gray('Details:', JSON.stringify(error.details, null, 2)));
    }
  } else if (error instanceof Error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    logger.debug('Stack trace:', error.stack);
  } else {
    console.error(chalk.red('❌ Unknown error occurred'));
    logger.debug('Error details:', error);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    setupCLI();
    await program.parseAsync();
  } catch (error) {
    await handleError(error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(async (error) => {
    await handleError(error);
    process.exit(1);
  });
}

export { main };