import { describe, it, expect } from 'vitest';
import { stripMarkdown, removeMetaNarration, stripProcessReferences, stripFormatTells } from './slidePostProcessor';

// Regression guard for the 2026-06-14 "fully slop" Analyst Desk plain-chat
// reply (gemini-3.5-flash answering "summarize the features, benefits and
// distinct applications of Intelligence Augmentation"). The reply shipped
// markdown chrome (### headers, **bold** walls, --- rules) and meta-narration
// ("The ultimate goal is to...") that the prose chat path never scrubbed.
// The fix runs stripMarkdown + removeMetaNarration + stripProcessReferences on
// non-fenced prose replies. This pins that those passes remove the structural
// slop from a sample lifted from the actual transcript.

const SLOP_SAMPLE = [
    '### Intelligence Augmentation prioritizes human-machine collaboration',
    '',
    'The core philosophy is built on partnership. **The ultimate goal is to** equip human operators with real-time intelligence.',
    '',
    '---',
    '',
    '### Secured sandboxes form the core technical features',
    '',
    '* **GenAI Co-Lab Platform:** A secured Microsoft Azure workspace.',
    '* **Synthetic-Customer Simulator:** A multi-agent simulation environment.',
].join('\n');

function scrubProse(text: string): string {
    // Mirrors the corpusChatService prose path (non-fenced branch).
    let t = stripFormatTells(text);
    t = stripMarkdown(t);
    t = removeMetaNarration(t);
    t = stripProcessReferences(t);
    return t;
}

describe('plain-chat prose anti-slop scrub', () => {
    const out = scrubProse(SLOP_SAMPLE);

    it('removes markdown headers (###)', () => {
        expect(out).not.toMatch(/^#{1,6}\s/m);
        expect(out).not.toContain('### ');
    });

    it('removes bold/emphasis markers (**)', () => {
        expect(out).not.toContain('**');
    });

    it('removes horizontal-rule chrome (---)', () => {
        expect(out).not.toMatch(/^-{3,}$/m);
    });

    it('keeps the substance words (does not delete the content)', () => {
        expect(out).toContain('Intelligence Augmentation');
        expect(out).toContain('GenAI Co-Lab');
        expect(out).toContain('Synthetic-Customer Simulator');
    });

    it('never emits an em-dash', () => {
        expect(out).not.toContain('—');
    });
});
