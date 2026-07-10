// #slides infographic uplift guard tests (goal 2026-07-02): the deck-native data-visual
// archetype composes from the payload's own fields, renders the exhibit as a real <img>
// (native swappable picture in PPTX via the GEO walker), and is wired end to end
// (composer spec + registry slot + chat-seam carrier + derivation lane).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { composeSlide, archetypeKeys } from './slideComposer';
import { imageSpecFor } from './artifactImageSlots';
import { infographicSpecFrom } from './artifactIllustrator';

const src = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('slides:infographic-exhibit archetype', () => {
    it('is a registered composer archetype', () => {
        expect(archetypeKeys()).toContain('infographic-exhibit');
    });
    it('renders kicker + title + exhibit image + takeaway band', () => {
        const html = composeSlide('infographic-exhibit', {
            kicker: 'RISK PRIORITIZATION',
            title: 'Five moves take a farm from static plan to living coverage',
            exhibitImage: 'data:image/png;base64,AAAA',
            takeaway: { label: 'PATTERN', statement: 'The plan survives because the review cadence is built into the product.' },
            sourceLine: 'Client discussion notes; Farm Risk Ready Plan Builder',
        }, 'nxt' as any);
        expect(html).toBeTruthy();
        expect(html!).toContain('RISK PRIORITIZATION');
        expect(html!).toContain('Five moves take a farm');
        expect(html!).toContain('data:image/png;base64,AAAA');
        expect(html!).toContain('The plan survives');
    });
    it('fails open without an image (no broken img, takeaway still closes the slide)', () => {
        const html = composeSlide('infographic-exhibit', {
            kicker: 'K', title: 'T',
            takeaway: { label: 'PATTERN', statement: 'S' },
        }, 'nxt' as any);
        expect(html).toBeTruthy();
        expect(html!).not.toContain('<img src=""');
        expect(html!).toContain('PATTERN');
    });
    it('registry slot is wired: panel / infographic / exhibitImage at the composer bounds', () => {
        const spec = imageSpecFor('slides:infographic-exhibit');
        expect(spec?.mode).toBe('panel');
        expect(spec?.branch).toBe('infographic');
        expect(spec?.carrier).toBe('exhibitImage');
        expect(spec?.bounds?.w).toBe(1622);
        expect(spec?.wired).toBe(true);
    });
    it('the chat seam routes the carrier write to composerPayload', () => {
        const panel = src('components/CorpusChatPanel.tsx');
        expect(panel).toContain("'slides:infographic-exhibit': 'composerPayload'");
    });
    it('DECK MODE selection doctrine routes structural findings to the archetype (2026-07-02 live-miss fix: the catalog alone was not enough - the model follows the doctrine)', () => {
        const chat = src('services/corpusChatService.ts');
        expect(chat).toContain('-> slides:infographic-exhibit');
        expect(chat).toContain('VISUAL FLOOR');
        // the stale hardcoded archetype count that contradicted the catalog is gone
        expect(chat).not.toContain('ONLY the 14 SLIDES archetypes');
    });
    it('every documented payload shape derives a native spec (steps / beforeAfter / stats / citations)', () => {
        expect(infographicSpecFrom({ steps: [{ name: 'Profile the farm' }, { name: 'Rank the risks' }, { name: 'Match mitigation' }] }, '')?.kind).toBe('process-flow');
        expect(infographicSpecFrom({ beforeAfter: { before: { points: ['Static PDF plan', 'No review'] }, after: { points: ['Living plan', 'Reminders drive review'] } } }, '')?.kind).toBe('comparison');
        expect(infographicSpecFrom({ stats: [{ label: 'PLAN STATE', value: 'LIVING' }, { label: 'REVIEW', value: 'PERIODIC' }] }, '')?.kind).toBe('stat-row');
        expect(infographicSpecFrom({ citations: ['Reddit r/farming', 'AgWeb: risk planning feature', 'client-notes.pdf', 'USDA ERS'] }, '')?.kind).toBe('composition');
    });
});
