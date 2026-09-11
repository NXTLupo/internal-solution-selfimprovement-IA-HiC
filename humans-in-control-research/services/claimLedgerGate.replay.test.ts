/**
 * REPLAY of the reviewed artifact through the revised gate (2026-09-11).
 *
 * The reviewer's root-cause section ends: "Before claiming a root cause is fixed, replay the
 * original evidence through the baseline and revised pipelines." This test does exactly that
 * for the stored artifact: the HTML the reader received is run through the claim ledger gate
 * with the wiki pages it cited, read from disk, and each defect class the review logged must
 * be caught. Skipped when the workspace artifact is not present (a fresh clone), so the suite
 * stays green without the data while the replay stays runnable where the data lives.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateClaimLedger, stripModelChrome } from './claimLedgerGate';
import { parsePageMeta } from './wikiPointerResolver';

const ROOT = process.cwd();
const ARTIFACT = join(ROOT, 'hic-workspace', 'artifacts', 'figma-opens-the-canvas-to-agents-but-determinism-lives-outside-it.json');
const WIKI = join(ROOT, 'hic-workspace', 'wiki');
const present = existsSync(ARTIFACT) && existsSync(WIKI);

describe.skipIf(!present)('replay: the 2026-09-10 white paper through the claim ledger gate', () => {
    it('catches every defect class the external review logged', async () => {
        const stored = JSON.parse(readFileSync(ARTIFACT, 'utf-8'));
        const html: string = stored.html_source;
        const goal = `${stored.topic}. As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions?`;

        const chrome = stripModelChrome(html);
        expect(chrome.stripped.length).toBeGreaterThanOrEqual(2);            // footer buttons + audit + metadata

        const pointers = Array.from(new Set((chrome.html.match(/[\w.\\-]+\/[\w./\\-]+\.md(?:#c\d+)?/gi) || []).map(p => p.replace(/#c\d+$/i, ''))));
        const pageMetaByPath: Record<string, any> = {};
        const pageText = new Map<string, string | null>();
        for (const page of pointers) {
            const abs = join(WIKI, page);
            if (!existsSync(abs)) { pageText.set(page, null); continue; }
            const raw = readFileSync(abs, 'utf-8');
            pageMetaByPath[page] = parsePageMeta(raw);
            pageText.set(page, raw);
        }
        const ledger = await evaluateClaimLedger(chrome.html, {
            goalText: goal,
            chunks: [],
            pageMetaByPath,
            fetchPage: async (p) => pageText.get(p) ?? null,
        });

        // C01: "September 2026 beta" over sources published 2025-04 .. 2026-06.
        expect(ledger.summary.DATE_SCOPE_MISMATCH).toBeGreaterThanOrEqual(1);
        expect(ledger.findings.some(f => f.code === 'DATE_SCOPE_MISMATCH' && /projected/.test(f.detail))).toBe(true);
        // C07 / C17: get_variable, make_design_system_kit, "Endpoint Security Bot".
        expect(ledger.summary.UNVERIFIED_IDENTIFIER).toBeGreaterThanOrEqual(1);
        // C04 / C05: the Webflow page cited on Figma's architecture. The stored sentence names
        // Webflow ("Webflow's MCP"), so the scope gate correctly accepts it as a framed analogy;
        // the reviewer's remaining complaint is the diagram caption that asserts the live-session
        // dependency with no source at all, which the gate reports as an unsourced fact.
        const webflowRows = ledger.rows.filter(r => r.pointers.some(p => /webflow/i.test(p)));
        expect(webflowRows.length).toBeGreaterThanOrEqual(1);
        expect(webflowRows.every(r => /webflow/i.test(r.text)) || ledger.summary.PRODUCT_SCOPE_MISMATCH >= 1).toBe(true);
        expect(ledger.findings.some(f => f.code === 'UNSOURCED_FACT' && /live session/i.test(f.sentence))).toBe(true);
        // C18: "every practitioner account in the corpus converges".
        expect(ledger.summary.INDEPENDENCE_INFLATED).toBeGreaterThanOrEqual(1);
        // C34: "paraphrased from theme" / "via theme" inside citation brackets.
        expect(ledger.summary.DERIVED_AS_SOURCE).toBeGreaterThanOrEqual(1);
        expect(ledger.pass).toBe(false);
        console.log('[replay] summary', JSON.stringify(ledger.summary), 'blocking', ledger.blocking, 'warnings', ledger.warnings, 'origins', ledger.independentOrigins, 'rows', ledger.rows.length);
        for (const f of ledger.findings.filter(x => x.severity === 'block').slice(0, 12)) console.log(`[replay] ${f.code}: ${f.detail.slice(0, 140)} :: ${f.sentence.slice(0, 90)}`);
    });
});
