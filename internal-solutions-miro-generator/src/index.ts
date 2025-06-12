/**
 * Main entry point for NXT Miro Generator library
 * Exports all public APIs for programmatic usage
 */

// CLI (for programmatic access)
export { main as runCLI } from './cli/index';

// Parsers
export { JourneyMapParser } from './parsers/journey-parser';

// Miro API
export { MiroAPIClient } from './miro/api-client';
export { BoardGenerator } from './miro/board-generator';

// Utilities
export { GridLayout } from './utils/grid-layout';
export { Logger } from './utils/logger';
export { ConfigManager } from './utils/config';
export * from './utils/errors';

// Types
export * from './types/index';

// Version
export const VERSION = '1.0.0';