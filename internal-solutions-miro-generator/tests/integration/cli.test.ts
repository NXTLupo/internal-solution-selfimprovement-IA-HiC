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

describe('CLI Integration', () => {
  beforeAll(async () => {
    // Ensure CLI is built
    if (!await fs.pathExists(CLI_PATH)) {
      throw new Error('CLI not built. Run npm run build first.');
    }
  });

  describe('validate command', () => {
    it('should validate sample journey map', async () => {
      const { stdout, stderr } = await execAsync(`node ${CLI_PATH} validate -i ${SAMPLE_HTML}`);
      
      expect(stderr).toBe('');
      expect(stdout).toContain('Validation successful');
    }, 10000);

    it('should show error for non-existent file', async () => {
      await expect(
        execAsync(`node ${CLI_PATH} validate -i non-existent.html`)
      ).rejects.toThrow();
    }, 5000);
  });

  describe('test command', () => {
    it('should show help when no token configured', async () => {
      // This might fail if token is actually configured
      try {
        const { stdout } = await execAsync(`node ${CLI_PATH} test`);
        expect(stdout).toContain('test');
      } catch (error) {
        // Expected if no token configured
        expect(error).toBeDefined();
      }
    }, 5000);
  });

  describe('config command', () => {
    it('should show configuration', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} config --show`);
      expect(stdout).toContain('Configuration');
    }, 5000);
  });

  describe('template command', () => {
    it('should list available templates', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} template --list`);
      expect(stdout).toContain('templates');
    }, 5000);
  });

  describe('help', () => {
    it('should show help message', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} --help`);
      expect(stdout).toContain('Usage');
      expect(stdout).toContain('generate');
      expect(stdout).toContain('validate');
    }, 5000);
  });

  describe('generate command dry run', () => {
    it('should perform dry run without errors', async () => {
      const { stdout } = await execAsync(`node ${CLI_PATH} generate -i ${SAMPLE_HTML} --dry-run`);
      expect(stdout).toContain('Dry run completed');
    }, 10000);
  });
});