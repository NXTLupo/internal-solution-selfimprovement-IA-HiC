/**
 * 2026-10-05 deliverable uplift: the #presentation quality gate, the narrative theme cap and the provider-outage
 * matcher that now triggers cross-provider fallback on 5xx / network failures, not only on 429s.
 */
import { describe, it, expect } from 'vitest';
import { presentationQualityIssues } from './narrativeComposer';
import { coverageUniverse, COVERAGE_SPECS, softenFigures } from './deliverableCoverage';
import { isProviderUnavailableError } from './multiModelResilience';
import { cleanAttributionDebris, stripQAAnnotations, stripQAAnnotationsDeep, stripModelNameAsSource } from './slidePostProcessor';
import type { LedgerItem } from './engagementLedger';

describe('presentationQualityIssues', () => {
    const deck = (titles: string[]) => ({ sections: titles.map(t => ({ kind: 'context', data: { title: t } })) });

    it('sends a deck that never retrieved external research back to search it', () => {
        const issues = presentationQualityIssues(deck(['Advisors start every intake from zero']), { externalSearched: false, externalChunksSeen: 0 });
        expect(issues.join(' ')).toMatch(/external_only/);
    });

    it('accepts a deck once an external search ran, even when the corpus had none', () => {
        expect(presentationQualityIssues(deck(['Advisors start every intake from zero']), { externalSearched: true, externalChunksSeen: 0 })).toEqual([]);
    });

    it('sends back a deck that cites HiC deliverables as sources, but not prose that mentions a research plan', () => {
        const bad = { sections: [{ kind: 'evidence', data: { title: 'Advisors start every intake from zero', citations: [{ sourceName: 'Playground brief: First-year co-op readiness' }] } }] };
        expect(presentationQualityIssues(bad, { externalSearched: true, externalChunksSeen: 3 }).join(' ')).toMatch(/Playground brief/);
        const ok = { sections: [{ kind: 'context', data: { title: 'Advisors start every intake from zero', body: 'Each college keeps its own research plan for co-op.' } }] };
        expect(presentationQualityIssues(ok, { externalSearched: true, externalChunksSeen: 3 })).toEqual([]);
    });

    it('flags bare figures in titles but allows a year', () => {
        const issues = presentationQualityIssues(deck([
            'The PRD sets out 1,042 requirements',
            'Sequence the hub against the Fall 2026 pilot',
            'Advisors report the widest gap in 25 years',
        ]), { externalSearched: true, externalChunksSeen: 4 });
        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatch(/section 1 /);
        expect(issues[0]).toMatch(/section 3 /);
        expect(issues[0]).not.toMatch(/section 2 /);
    });
});

describe('coverage theme cap', () => {
    const theme = (id: string, item: string): LedgerItem => ({ id, type: 'theme', item, statement: item } as unknown as LedgerItem);
    const stated = (id: string, item: string): LedgerItem => ({ id, type: 'stated', item, statement: item } as unknown as LedgerItem);
    const ledger: LedgerItem[] = [
        ...Array.from({ length: 60 }, (_, i) => theme(`TH-${i + 1}`, `Unrelated finding number ${i + 1} about campus parking`)),
        theme('TH-co-op', 'Co-op readiness starts in the first year with advisor preparation'),
        stated('SF-1', 'Students see one dashboard of co-op applications'),
    ];

    it('keeps the request-relevant themes and never drops a stated item', () => {
        const u = coverageUniverse(COVERAGE_SPECS.deck, ledger, [], 'first-year co-op readiness hub for advisors');
        const themes = u.filter(x => x.type === 'theme');
        expect(themes.length).toBe(COVERAGE_SPECS.deck.themeCap);
        expect(themes.map(t => t.id)).toContain('TH-co-op');
    });

    it('caps #themes too, keeping the request-relevant theme', () => {
        const u = coverageUniverse(COVERAGE_SPECS.themes, ledger, [], 'co-op readiness');
        expect(u.filter(x => x.type === 'theme')).toHaveLength(COVERAGE_SPECS.themes.themeCap!);
        expect(u.map(x => x.id)).toContain('TH-co-op');
    });

    it('leaves meeting action items out of the universe', () => {
        const task = { id: 'FB-9', type: 'feedback', item: 'Send Careers AI usage-limit screenshot', statement: 'x', quote: 'Send the screenshot. Completed' } as unknown as LedgerItem;
        const real = { id: 'FB-1', type: 'feedback', item: 'Show application status in one place', statement: 'x' } as unknown as LedgerItem;
        const ids = coverageUniverse(COVERAGE_SPECS.recs, [task, real], [], '').map(x => x.id);
        expect(ids).toEqual(['FB-1']);
    });
});

describe('cleanAttributionDebris (live QA strings)', () => {
    it.each([
        ['Previous implementation challenges discourage administrators from adopting broad platforms ()', 'Previous implementation challenges discourage administrators from adopting broad platforms'],
        ['Advisors lack capacity (Source: Client Uploads) (Source: Client Uploads)', 'Advisors lack capacity (Source: Client document)'],
        ['Students track applications by hand (Source: reddit-deep', 'Students track applications by hand'],
        ['SOW012_NXT_Humans_NU_Dashboard_Final_REDACTED.txt', 'SOW012 NXT Humans NU Dashboard'],
        ['Readiness starts late (Source: Client Uploads: Northeastern_CoOp_CLR_Executive_Summary_Copy.txt)', 'Readiness starts late (Source: Client document: Northeastern CoOp CLR Executive Summary)'],
        ['Experiential Learning 1 Meeting Summary ·  · Northeastern CoOp CLR Executive Summary', 'Experiential Learning 1 Meeting Summary · Northeastern CoOp CLR Executive Summary'],
        ['Advisors lack time [Client Uploads: "Northeastern_CoOp_CLR_Executive_Summary_Copy.txt"]', 'Advisors lack time [Client document: Northeastern CoOp CLR Executive Summary]'],
        ['API-driven orchestration layer sitting above existing systems [Client Uploads: ""', 'API-driven orchestration layer sitting above existing systems'],
        ['Hosts job postings and virtual recruiting events [mit_capd', 'Hosts job postings and virtual recruiting events'],
        ['Client Uploads: Northeastern Student 360 Product Brief (1).pdf', 'Client document: Northeastern Student 360 Product Brief'],
        ['Per "Client Uploads: SOW012_NXT_Humans_NU_Dashboard_Final_REDACTED.txt", the dashboard ships first', 'Per "Client document: SOW012 NXT Humans NU Dashboard", the dashboard ships first'],
    ])('%s', (input, expected) => {
        expect(cleanAttributionDebris(input)).toBe(expected);
        expect(cleanAttributionDebris(cleanAttributionDebris(input))).toBe(expected);
    });
});

describe('a whole raw reply is never damaged by the field cleaner', () => {
    it('stripQAAnnotations leaves slide-fence JSON parseable (live #arch regression)', () => {
        const reply = ':::slide template=architecture-map brand=nxt\n{ "title": "One API layer sits above Banner and Canvas", "sources": [ "Client Uploads: SOW012_NXT_Humans_NU_Dashboard_Final_REDACTED.txt", "Client Uploads: Northeastern Student 360 Product Brief (1).pdf" ], "architectureMap": { "layers": [ { "name": "Systems of Record", "nodes": [ { "name": "Banner SIS" } ] } ] } }\n:::';
        const out = stripQAAnnotations(reply);
        const body = out.replace(/^:::slide[^\n]*\n/, '').replace(/\n:::$/, '');
        expect(() => JSON.parse(body)).not.toThrow();
    });
});

describe('code is never treated as prose (live #playground "Unexpected token")', () => {
    it('a deep strip over an HTML artifact keeps its script syntax', () => {
        const art = { html: '<html><body><p>Advisors guide students ()</p><script>(function(){ var a = [1, 2]; window.go = () => a.map(x => x); })();</script></body></html>' };
        const out: any = stripQAAnnotationsDeep(art);
        expect(out.html).toContain('(function(){');
        expect(out.html).toContain('})();');
    });
    it('the model-name source stripper never touches code (the real #playground breaker)', () => {
        const html = '<script>(function(){ var a = []; var b = f(); })();</script>';
        expect(stripModelNameAsSource(html)).toBe(html);
        expect(stripModelNameAsSource('Students lack status tracking (Source: Gemini focused research).')).toBe('Students lack status tracking.');
    });
    it('a prose field still loses an empty citation', () => {
        expect(cleanAttributionDebris('Students track applications by hand ()')).toBe('Students track applications by hand');
    });
});

describe('softenFigures on hyphenated compounds', () => {
    it.each([
        ['A 10-point Global North/South AI adoption gap forces region-calibrated preparation', 'A Global North/South AI adoption gap forces region-calibrated preparation'],
        // 2026-10-20 (root-cause audit P1.9): an N-year term is a fixed term, kept as written.
        ['Two 25-year veterans describe the widest gap', 'Two 25-year veterans describe the widest gap'],
        ['Career guidance is optional and used by 20%.', 'Career guidance is optional and used by some.'],
        ['First-year experience engagement goal of 30 to 40 percent.', 'First-year experience engagement goal of a set target range.'],
    ])('%s', (input, expected) => expect(softenFigures(input)).toBe(expected));
});

describe('isProviderUnavailableError', () => {
    it.each([
        'Gemini compat proxy error: All connection attempts failed',
        'Anthropic API 502: bad gateway',
        'HTTP 503 Service Unavailable',
        'Request timed out after 300s',
        'TypeError: Failed to fetch',
        'HTTP 429 rate limit',
    ])('treats "%s" as an outage', (m) => expect(isProviderUnavailableError(new Error(m))).toBe(true));

    it.each(['HTTP 400 invalid_request_error: messages: field required', 'JSON parse error at position 5021'])(
        'does not treat "%s" as an outage', (m) => expect(isProviderUnavailableError(new Error(m))).toBe(false));
});
