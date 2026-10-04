/**
 * Appendix text audit on REAL engagement data (2026-10-03): every ledger item and board theme of two unrelated
 * projects is forced into the coverage appendix (the worst case), and the fill text must carry no placeholder, no
 * generic cluster label, no em dash and no file name. Skipped when the engagement data is not on disk.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { dedupeLedgerItems, themeLedgerItems, assignAreas } from './engagementLedger';
import { themesFromContext } from './prdInputs';
import { htmlCoverageDoc, deckCoverageDoc, runCoverageContract } from './deliverableCoverage';

const ROOT = path.resolve(__dirname, '..', 'hic-workspace', 'wiki', 'engagements');
const PROJECTS = [
    'generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ',
    'deliver-a-2026-risk-and-market-analysis-report-evaluating-how-emerging-property',
];

function load(slug: string) {
    const dir = path.join(ROOT, slug);
    const lf = path.join(dir, 'ledger.json');
    if (!fs.existsSync(lf)) return null;
    const led = JSON.parse(fs.readFileSync(lf, 'utf8'));
    const thf = path.join(dir, 'themes.json');
    const themes = fs.existsSync(thf) ? themesFromContext(JSON.parse(fs.readFileSync(thf, 'utf8'))?.data?.themes || []) : [];
    const ledger = [...dedupeLedgerItems(Object.values(led.documents).flatMap((d: any) => d.items)), ...themeLedgerItems(themes as any)];
    return { ledger, areas: assignAreas(ledger) };
}

describe.each(PROJECTS)('appendix text on real data: %s', (slug) => {
    const data = load(slug);
    const run = data ? it : it.skip;
    run('carries no placeholder, generic label, em dash or file name', async () => {
        const doc = htmlCoverageDoc('report', '<html><body><h1>x</h1></body></html>');
        const r = await runCoverageContract(doc, data!.ledger, data!.areas);
        const deck = deckCoverageDoc('recs', [], { idPrefix: 'audit' });
        const rd = await runCoverageContract(deck, data!.ledger, data!.areas);
        expect(r.receipt.pass).toBe(true);
        expect(rd.receipt.pass).toBe(true);
        // Pointer fields are provenance, never rendered: they are excluded from the display-text check.
        const text = doc.html().replace(/<[^>]+>/g, ' ') + ' ' + JSON.stringify(deck.added).replace(/"(?:pointer|_coverageIds|id)":(?:"[^"]*"|\[[^\]]*\])/g, '');
        const samples = (doc.html().match(/<h4>[^<]*<\/h4>(?:<p>[^<]*<\/p>)?/g) || []).filter(x => /\b(most|some|widely|a set period)\b/.test(x)).slice(0, 4);
        for (const s of samples) console.log('ENTRY', s.replace(/<[^>]+>/g, ' | ').slice(0, 220));
        expect(text).not.toMatch(/stated threshold/i);
        expect(text).not.toMatch(/Unlabelled research cluster|\bCluster \d+\b/);
        expect(text).not.toMatch(/—|\\u0000|\u0000/);
        expect(text).not.toMatch(/\.(txt|pdf)\b/);
    }, 600_000);
});
