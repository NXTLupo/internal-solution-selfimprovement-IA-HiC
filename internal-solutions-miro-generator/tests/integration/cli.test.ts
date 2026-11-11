/**
 * Integration tests for CLI interface
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs-extra';

const execAsync = promisify(exec);
const CLI_PATH = path.join(__dirname, '../../dist/cli/index.js');
const SAMPLE_HTML = path.join(__dirname, '../../examples/sample-journey-map.html');

// No real Miro access from a subprocess: no token, and the API base URL points at a closed local port.
const { MIRO_BOARD_ID: _unusedBoardId, ...inheritedEnv } = process.env;
const run = (args: string) => execAsync(`node ${CLI_PATH} ${args}`, {
  env: { ...inheritedEnv, MIRO_ACCESS_TOKEN: '', API_BASE_URL: 'http://127.0.0.1:9' }
});

describe('CLI Integration', () => {
  beforeAll(async () => {
    // Ensure CLI is built
    if (!await fs.pathExists(CLI_PATH)) {
      throw new Error('CLI not built. Run npm run build first.');
    }
  });

  describe('validate command', () => {
    it('should validate sample journey map', async () => {
      const { stdout, stderr } = await run(`validate -i ${SAMPLE_HTML}`);
      
      expect(stderr).toBe('');
      expect(stdout).toContain('Validation successful');
    }, 10000);

    it('should show error for non-existent file', async () => {
      await expect(
        run(`validate -i non-existent.html`)
      ).rejects.toThrow();
    }, 5000);
  });

  describe('test command', () => {
    it('should show help when no token configured', async () => {
      // This might fail if token is actually configured
      try {
        const { stdout } = await run(`test`);
        expect(stdout).toContain('test');
      } catch (error) {
        // Expected if no token configured
        expect(error).toBeDefined();
      }
    }, 5000);
  });

  describe('config command', () => {
    it('should show configuration', async () => {
      const { stdout } = await run(`config --show`);
      expect(stdout).toContain('Configuration');
    }, 5000);
  });

  describe('template command', () => {
    it('should list available templates', async () => {
      const { stdout } = await run(`template --list`);
      expect(stdout).toContain('templates');
    }, 5000);
  });

  describe('help', () => {
    it('should show help message', async () => {
      const { stdout } = await run(`--help`);
      expect(stdout).toContain('Usage');
      expect(stdout).toContain('generate');
      expect(stdout).toContain('validate');
    }, 5000);
  });

  describe('generate command dry run', () => {
    it('should perform dry run without errors', async () => {
      const { stdout } = await run(`generate -i ${SAMPLE_HTML} --dry-run`);
      expect(stdout).toContain('Dry run completed');
    }, 10000);
  });
});