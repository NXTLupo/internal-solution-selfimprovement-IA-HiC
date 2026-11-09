/**
 * WS-D D2 (2026-10-31, plan agent-stack-shared-memory-skills-uplift): /api/models serves the routing authority's
 * seats from proxy/model_registry.py, which every non-SPA service (platform agent, research-mcp, NXT-Agency) reads
 * instead of hard-coding a model id. This pins the Python constants to the TS authority so the two cannot drift.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_MODELS } from './aiRouter';
import { CLAUDE_REASONING_MODEL, CLAUDE_STRUCTURED_MODEL } from './claudeModelPolicy';

const py = readFileSync(resolve(__dirname, '..', 'proxy', 'model_registry.py'), 'utf8');
const pyConst = (name: string) => (new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, 'm').exec(py) || [])[1];

describe('model seats parity (TS router vs proxy registry)', () => {
    it('the reasoning and structured Claude seats match claudeModelPolicy', () => {
        expect(pyConst('CLAUDE_REASONING_MODEL')).toBe(CLAUDE_REASONING_MODEL);
        expect(pyConst('CLAUDE_STRUCTURED_MODEL')).toBe(CLAUDE_STRUCTURED_MODEL);
    });

    it('the chat seat matches aiRouter.DEFAULT_MODELS.fast_generation', () => {
        expect(pyConst('CHAT_MODEL')).toBe(DEFAULT_MODELS.fast_generation);
    });

    it('the agent seats are the chat and reasoning seats (owner decision 4), never a literal', () => {
        const fn = /def routing_seats\(\)[\s\S]*?return \{([\s\S]*?)\}/.exec(py)?.[1] || '';
        expect(fn).toMatch(/"agent_chat":\s*CHAT_MODEL/);
        expect(fn).toMatch(/"agent_tool_chain":\s*CLAUDE_REASONING_MODEL/);
        expect(fn).not.toMatch(/"(claude|gemini|gpt)-/);
    });
});
