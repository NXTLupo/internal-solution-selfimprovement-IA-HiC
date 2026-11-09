/**
 * 2026-10-06: a module-scoped #prd writes model requirements only for its scope; everything else (and meeting admin
 * tasks) is accounted for deterministically. Real NU ledger when present; a synthetic ledger otherwise.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { prdScopePartition, isProjectWorkRequirement } from './deliverableCoverage';
import { dedupeLedgerItems } from './engagementLedger';
import type { LedgerItem } from './engagementLedger';

const NU = path.resolve(__dirname, '..', 'hic-workspace', 'wiki', 'engagements', 'generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ', 'ledger.json');

describe('prdScopePartition', () => {
    const mk = (id: string, item: string, type: 'stated' | 'feedback' = 'stated', quote = ''): LedgerItem => ({ id, type, item, statement: item, quote } as unknown as LedgerItem);

    it('a plain #prd keeps every product item and only sets aside meeting action items', () => {
        const ledger = [
            ...Array.from({ length: 40 }, (_, i) => mk(`SF-${i}`, `Hub dashboard shows co-op item ${i}`)),
            mk('FB-1', 'Send Peter the usage-limit screenshot', 'feedback', 'Send the screenshot. Completed'),
        ];
        const r = prdScopePartition(ledger, '');
        expect([...r.outOfScope.keys()]).toEqual(['FB-1']);
    });

    it('sets aside delivery obligations but keeps capabilities phrased with the vendor as subject', () => {
        const c = (id: string, statement: string, documentKind: string) => ({ id, type: 'stated', item: statement, statement, documentKind, documentTitle: 'SOW012 NXT Humans NU Dashboard' } as unknown as LedgerItem);
        const ledger = [
            c('SF-1', 'NXT Humans delivers the Dashboard UX Design Package by November 4.', 'contract'),
            c('SF-2', 'NXT Humans holds a weekly status meeting with the core team.', 'contract'),
            c('SF-3', 'NXT Humans builds a next-steps view in the dashboard.', 'contract'),
            c('SF-4', 'The dashboard shows each student the next three readiness steps.', 'contract'),
            { id: 'FB-2', type: 'feedback', item: 'Kellianne Murphy reviews the draft readiness buckets', statement: 'Kellianne Murphy reviews the draft readiness buckets in a walkthrough.', documentKind: 'meeting-notes', documentTitle: 'Experiential Learning 1 Meeting Summary' } as unknown as LedgerItem,
        ];
        const r = prdScopePartition(ledger, '');
        expect([...r.outOfScope.keys()].sort()).toEqual(['FB-2', 'SF-1', 'SF-2']);
        expect(r.outOfScope.get('SF-1')).toMatch(/engagement obligation/);
    });

    it('flags generated requirements that are project work by a derived party, not product behaviour', () => {
        const parties = ['Acme Consulting', 'Kellianne Murphy'];
        expect(isProjectWorkRequirement('Acme Consulting holds solution architecture design review sessions.', parties)).toBe(true);
        expect(isProjectWorkRequirement('The project team obtains change board approval before release.', parties)).toBe(true);
        expect(isProjectWorkRequirement('Kellianne Murphy reviews the draft readiness buckets.', parties)).toBe(true);
        expect(isProjectWorkRequirement('The dashboard shows each first-year student three next steps.', parties)).toBe(false);
        expect(isProjectWorkRequirement('Acme Consulting builds a next-steps view in the dashboard.', parties)).toBe(false);
        expect(isProjectWorkRequirement('Acme Consulting escalates each blocked dependency to the project owner.', parties)).toBe(true);
        expect(isProjectWorkRequirement('Acme Consulting and Experiential Learning jointly define the decision paths.', parties)).toBe(true);
        expect(isProjectWorkRequirement('The Acme Consulting lead grants final acceptance of each deliverable.', parties)).toBe(true);
        expect(isProjectWorkRequirement('The Acme Consulting Chief Information Officer gives final acceptance of each deliverable.', parties)).toBe(true);
        expect(isProjectWorkRequirement('Acme Consulting embeds the companion in the student portal.', parties)).toBe(false);
    });

    it('a module request scopes to its distinctive terms', () => {
        const ledger = [
            ...Array.from({ length: 30 }, (_, i) => mk(`SF-r${i}`, `First-year readiness milestone ${i} in the Hub`)),
            ...Array.from({ length: 70 }, (_, i) => mk(`SF-e${i}`, `Employer partner portal integration ${i} in the Hub`)),
        ];
        const r = prdScopePartition(ledger, 'first-year readiness module of the Hub');
        expect(r.inScope).toBe(30);
        expect(r.outOfScope.size).toBe(70);
        expect(r.outOfScope.get('SF-e1')).toMatch(/outside the requested scope/);
    });

    const real = fs.existsSync(NU) ? it : it.skip;
    real('on the real NU ledger a module request leaves a focused, non-trivial scope', () => {
        const led = JSON.parse(fs.readFileSync(NU, 'utf8'));
        const items: LedgerItem[] = dedupeLedgerItems(Object.values(led.documents).flatMap((d: any) => d.items));
        const all = prdScopePartition(items, '');
        const mod = prdScopePartition(items, 'for the first-year readiness module of the Experiential Learning Hub');
        process.stdout.write(`PRDSCOPE total=${items.length} plainOut=${all.outOfScope.size} moduleIn=${mod.inScope} moduleOut=${mod.outOfScope.size} focus=${mod.focus.join(',')}\n`);
        expect(mod.inScope).toBeGreaterThanOrEqual(30);
        expect(mod.inScope).toBeLessThan(items.length);
    });
});
