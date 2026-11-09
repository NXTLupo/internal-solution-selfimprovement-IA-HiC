// scaffoldingShrink.test.ts - WS-3 (2026-10-30): the prompt carries each instruction once, the caps come
// from the gate, and the dead or stale scaffolding stays deleted.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripDeckComposerLegacySection, deliverableProtocolFor } from './corpusChatService';
import { describeDeckCaps, NUMBERED_THEMES_CAP, BODY_ARCHETYPE_CAP, INFOGRAPHIC_CAP_DRAWN } from './deckPlanGate';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');

describe('WS-3 P1: deck-composer rides the prompt once, without its legacy section', () => {
    it('strips section 8 (legacy GOLD flows) and keeps everything before it', () => {
        const skill = '# Deck Composer\n\n## 1. Scope\nbody one\n\n## 7. Imagery rules\nbody seven\n\n## 8. Legacy GOLD Slide-object flows (folded)\nlegacy text\nmore legacy\n';
        const out = stripDeckComposerLegacySection(skill);
        expect(out).toContain('## 7. Imagery rules');
        expect(out).not.toContain('Legacy GOLD');
        expect(out).not.toContain('legacy text');
    });
    it('is a no-op on text without the section', () => {
        expect(stripDeckComposerLegacySection('# x\n## 1. y\n')).toBe('# x\n## 1. y\n');
    });
    it('the real deck-composer SKILL.md still has a section 8 to strip (the contract is live)', () => {
        const dc = read('../.claude/skills/deck-composer/SKILL.md');
        expect(dc).toMatch(/^## 8\. Legacy GOLD/m);
        const stripped = stripDeckComposerLegacySection(dc);
        expect(stripped.length).toBeLessThan(dc.length - 5000);
    });
    it('DECK MODE injects deck-composer only when it is not already the active skill', () => {
        const src = read('services/corpusChatService.ts');
        expect(src).toMatch(/skillContext\?\.skill\?\.id === 'deck-composer'\s*\n?\s*\? 'The ACTIVE SKILL block above \(deck-composer\)/);
    });
    it('render contracts and composes_with enhancers are skipped on a deck turn', () => {
        const src = read('services/corpusChatService.ts');
        expect(src).toMatch(/const _deckTurn = topContentSkill\?\.id === 'deck-composer'/);
        expect(src).toMatch(/matchedContracts\.length > 0 && !_deckTurn/);
        expect(src).toMatch(/_deckTurn \? \[\] : \[topContentSkill/);
    });
    it('the plain-chat protocol head is not sent on a deck turn', () => {
        expect(deliverableProtocolFor('deck')).toBe('');
        expect(deliverableProtocolFor('none').length).toBeGreaterThan(1000);
    });
});

describe('WS-3 P4: the archetype caps have one owner', () => {
    it('describeDeckCaps states the gate constants', () => {
        const s = describeDeckCaps(0);
        expect(s).toContain(`more than ${BODY_ARCHETYPE_CAP} times`);
        expect(s).toContain(`numbered-themes at most ${NUMBERED_THEMES_CAP}`);
        expect(s).toContain(`infographic-exhibit at most ${BODY_ARCHETYPE_CAP}`);
        expect(describeDeckCaps(1)).toContain(`infographic-exhibit at most ${INFOGRAPHIC_CAP_DRAWN}`);
    });
    it('the prompt no longer hardcodes the caps', () => {
        const src = read('services/corpusChatService.ts');
        expect(src).not.toMatch(/never more than twice total except section-dividers/);
        expect(src).not.toMatch(/stays capped at 3 per deck/);
        expect(src).toMatch(/\$\{describeDeckCaps\(/);
    });
});

describe('WS-3 P2/P3/P5: stale lines are gone', () => {
    const src = read('services/corpusChatService.ts');
    it('one citation rule with two surfaces; the contradicting SLIDE MODE line is gone', () => {
        expect(src).not.toMatch(/use NAMED source names, never raw file paths or \.md#cNN pointers/);
        expect(src).toMatch(/CITATION FORMAT \(MANDATORY; ONE rule, two surfaces\)/);
        expect(src).not.toMatch(/should cite \[Source: Title\]/);
    });
    it('thesis options are parsed from the reply before the preamble scrub', () => {
        expect(src).toMatch(/_replyBeforeScrub = responseText \|\| '';\s*\n\s*responseText = scrubChatReplyMeta/);
        expect(src).toMatch(/parseThesisOptions\(_replyBeforeScrub \|\| responseText \|\| ''\)/);
    });
    it('dead constants are deleted', () => {
        expect(src).not.toMatch(/const THINKING_BUDGETS/);
        expect(src).not.toMatch(/const CONSULTING_MANDATES/);
    });
    it('the junk-guard salvage no longer swaps an Opus turn to Flash', () => {
        expect(src).toMatch(/_isJunkAnswer\(responseText\) && !\/gemini\/i\.test/);
    });
    it('Stage 4 no longer instructs the dropped fonts', () => {
        const cur = read('services/designExemplarCurator.ts');
        expect(cur).not.toMatch(/Bebas Neue \(display\)/);
        expect(cur).not.toMatch(/Spectral Light \(display\)/);
        expect(cur).toMatch(/Saira Condensed SemiBold \(display\)/);
    });
});
