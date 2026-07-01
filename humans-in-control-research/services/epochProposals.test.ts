import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as svc from './epochProposals';

// WS-D regression guard (2026-06-30). The propose-only self-improvement loop must stay wired:
// the review service exports exist, App.tsx mounts the review panel, and the epoch-proposer skill
// is PROPOSE-ONLY (never auto-applies). Source-level asserts (style of opusCapConvergence).

const readRepo = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');

describe('WS-D: propose-only self-improvement review', () => {
    it('epochProposals service exposes list + review', () => {
        expect(typeof svc.listEpochProposals).toBe('function');
        expect(typeof svc.reviewEpochProposal).toBe('function');
    });

    it('App.tsx mounts the EpochProposalsPanel review surface', () => {
        const app = readRepo('App.tsx');
        expect(app).toMatch(/import\s*\{\s*EpochProposalsPanel\s*\}\s*from '\.\/components\/EpochProposalsPanel'/);
        expect(app).toMatch(/<EpochProposalsPanel\s+onClose=/);
        expect(app).toMatch(/showEpochProposals/);
    });

    it('the epoch-proposer skill is PROPOSE-ONLY (no auto-apply/commit)', () => {
        const skill = readRepo('../.claude/skills/epoch-proposer/SKILL.md');
        expect(skill, 'proposes via the ledger endpoint').toMatch(/POST the proposal to the ledger|\/api\/epochs\/proposals/);
        expect(skill, 'explicitly propose-only / never mutate live harness').toMatch(/PROPOSE-ONLY|NEVER mutate the live harness/);
    });
});
