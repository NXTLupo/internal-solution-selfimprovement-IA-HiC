// WS-B B3/B4 (2026-10-31): admission at every settled step, as typed facts the gate accepts.
import { describe, it, expect, vi } from 'vitest';
import {
    artifactShippedFacts, deckAskChoiceFacts, planApprovedFacts, epochAcceptedFacts, detectStatedPreference, preferenceFacts, admitAt,
} from './memoryAdmissions';
import { admitFacts } from './memoryLifecycle';

const gate = (facts: any[]) => admitFacts(facts, 'run_t');

describe('settled-step facts pass the admission gate', () => {
    it('an artifact ship yields its thesis (knowledge) and its open findings (correction)', () => {
        const f = artifactShippedFacts({ kind: '#slides', objective: 'Agency decline 2026', thesis: 'Traditional agencies lose share because AI-native teams ship working pilots in weeks, not quarters.', openFindings: ['provenance below floor', 'unchecked', 'ungrounded concept on slide 6'] });
        expect(f.map(x => x.category)).toEqual(['knowledge', 'correction']);
        expect(f[0].content).toContain('argued: Traditional agencies');
        expect(f[1].content).not.toContain('unchecked');
        expect(gate(f).admitted).toHaveLength(2);
        expect(artifactShippedFacts({ kind: 'slides', thesis: 'short' })).toEqual([]);
    });

    it('a deckAsk choice, an approved plan and an accepted epoch each yield one admissible fact', () => {
        const all = [
            ...deckAskChoiceFacts('slides', 'Narrow the scope', ['layout overflow on slide 4']),
            ...planApprovedFacts('Map the executive search market to find where AI sourcing changes fees', ['Who adopts first?', 'What breaks?']),
            ...epochAcceptedFacts({ epochId: 4, skill: 'deck-composer', kind: 'strategy-slide', summary: 'density floor raised for exhibit slides' }),
        ];
        expect(all.map(f => [f.category, f.scope])).toEqual([['correction', 'engagement'], ['goal', 'engagement'], ['behavior', 'user']]);
        expect(gate(all).admitted).toHaveLength(3);
        expect(planApprovedFacts('too short', [])).toEqual([]);
        expect(deckAskChoiceFacts('slides', '', [])).toEqual([]);
    });
});

describe('B4 standing preferences come from the user words, never a guess', () => {
    it('detects a deliverable-shape preference and ignores ordinary requests', () => {
        expect(detectStatedPreference('Build the deck. Always put the data appendix at the end of the deck.')).toMatch(/^Always put the data appendix/);
        expect(detectStatedPreference('From now on use the NU brand for Northeastern decks')).toMatch(/^From now on use the NU brand/);
        expect(detectStatedPreference('Build a 10-slide deck on agency decline')).toBeNull();
        expect(detectStatedPreference('I always want lunch at noon')).toBeNull();     // not a deliverable shape
        const f = preferenceFacts('Always put the data appendix at the end of the deck', 'slides');
        expect(f[0]).toMatchObject({ category: 'preference', scope: 'user' });
        expect(gate(f).admitted).toHaveLength(1);
    });
});

describe('loadStandingPreferences (B4)', () => {
    it('returns user-scoped stated preferences for this kind and drops other kinds', async () => {
        const facts = [
            { id: 'p1', scope: 'user', category: 'preference', content: 'Standing preference for slides: Always put the data appendix at the end of the deck' },
            { id: 'p2', scope: 'user', category: 'preference', content: 'Standing preference for personas: keep personas to three' },
            { id: 'p3', scope: 'user', category: 'preference', content: 'Standing preference: From now on use the NU brand for Northeastern work' },
            { id: 'p4', scope: 'user', category: 'preference', content: 'Prefer two-column layouts (applies to deck)' },
            { id: 'p5', scope: 'engagement', category: 'preference', content: 'Standing preference for slides: engagement-scoped, not standing' },
        ];
        const f = vi.fn(async () => new Response(JSON.stringify({ facts }))) as any;
        const { loadStandingPreferences } = await import('./memoryAdmissions');
        const prefs = await loadStandingPreferences('#slides', f, { objective: 'Map where Northeastern co-op advising breaks down', engagement: 'nu-coop' });
        expect(prefs.map(p => p.id)).toEqual(['p1', 'p3']);
        expect(prefs[0].content).toBe('Always put the data appendix at the end of the deck');
        expect(String(f.mock.calls[0][0])).toMatch(/\/api\/memory\/facts\?category=preference$/);
    });

    it('a preference limited to other work stays out (live 2026-10-31: an executive-search rule reached a co-op deck)', async () => {
        const execSlug = 'analyze-the-executive-search-industry-to-map-current-trends-against-dsg-globals';
        const facts = [
            { id: 'x1', scope: 'user', category: 'preference', engagement: execSlug, content: 'Standing preference: From now on, always put the methodology appendix at the end of every deck for the executive search work' },
            { id: 'x2', scope: 'user', category: 'preference', engagement: execSlug, content: 'Standing preference for slides: always end on a decision slide for this client' },
            { id: 'x3', scope: 'user', category: 'preference', engagement: execSlug, content: 'Standing preference: always put the data appendix at the end of the deck' },
        ];
        const f = vi.fn(async () => new Response(JSON.stringify({ facts }))) as any;
        const { loadStandingPreferences } = await import('./memoryAdmissions');
        const coop = await loadStandingPreferences('slides', f, { objective: "Generate a PRD for Northeastern University's Experiential Learning Hub", engagement: 'generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ' });
        expect(coop.map(p => p.id)).toEqual(['x3']);
        const exec = await loadStandingPreferences('slides', f, { objective: 'Analyze the executive search industry to map current trends', engagement: execSlug });
        expect(exec.map(p => p.id)).toEqual(['x1', 'x2', 'x3']);
        // another executive-search engagement: the named work holds, "this client" does not
        const other = await loadStandingPreferences('slides', f, { objective: 'Where AI sourcing changes executive search fees', engagement: 'exec-search-fees' });
        expect(other.map(p => p.id)).toEqual(['x1', 'x3']);
    });

    it('preferenceAppliesTo reads the condition from the words, and any named alternative suffices', async () => {
        const { preferenceAppliesTo } = await import('./memoryAdmissions');
        expect(preferenceAppliesTo('Use the NU brand for Northeastern and Huskies work', { objective: 'Huskies athletics fan experience' })).toBe(true);
        expect(preferenceAppliesTo('Use the NU brand for Northeastern work', { objective: 'Retail checkout conversion' })).toBe(false);
        expect(preferenceAppliesTo('Keep decks to ten slides', { objective: 'anything' })).toBe(true);
        expect(preferenceAppliesTo('Lead with the CFO view on this engagement', { engagement: 'a', factEngagement: 'b' })).toBe(false);
        // rules that name no particular work hold everywhere
        expect(preferenceAppliesTo('Always cite a named source for every claim in client work', { objective: 'Retail checkout conversion' })).toBe(true);
        expect(preferenceAppliesTo('Always use plain titles for client work', { objective: 'Retail checkout conversion' })).toBe(true);
    });
});

describe('admitAt', () => {
    it('posts through the door and returns the admitted ids; a failure returns []', async () => {
        const ok = vi.fn(async () => new Response(JSON.stringify({ ok: true, report: { admitted: 1, refusals: [] }, admitted_ids: ['f9'] }))) as any;
        expect(await admitAt('test', planApprovedFacts('Map the executive search market to find where AI sourcing changes fees', []), 'run_1', 'exec', ok)).toEqual(['f9']);
        const body = JSON.parse(ok.mock.calls[0][1].body);
        expect(body).toMatchObject({ run_id: 'run_1', engagement: 'exec', surface: 'spa' });
        const down = vi.fn(async () => { throw new Error('offline'); }) as any;
        expect(await admitAt('test', planApprovedFacts('Map the executive search market to find where AI sourcing changes fees', []), 'run_1', '', down)).toEqual([]);
        expect(await admitAt('test', [], 'run_1')).toEqual([]);
    });
});
