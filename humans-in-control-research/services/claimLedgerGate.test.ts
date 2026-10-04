/**
 * Regression fixtures for the claim ledger gate. Every fixture is a sentence class the
 * external review of the 2026-09-10 `#report` white paper logged (C01, C04/C05, C07, C17,
 * C18, C22, C34 and the chrome leak), reduced to the shape that reproduces it. A gate
 * with no red case is a gate nobody has proved bites.
 */
import { describe, it, expect } from 'vitest';
import {
    evaluateClaimLedger, extractClaimRows, stripModelChrome, applyDeterministicFixes, profileObjective,
    buildNarrowingInstruction, classifyClaim, type GateChunk,
} from './claimLedgerGate';
import { registerPageMeta, renderPointerCitationsHtml, formatCitationLabel, formatCitationDate, resolveManifestPointers, registerChunkSources } from './citationPointerRegistry';
import { describeChunkProvenance } from './chunkRetrieval';

const GOAL = 'Generate a technical white paper detailing how Figma is extended for agentic, multi-agent, and deterministic reading, writing, and design system integration as of September 2026. As of August-September 2026 (no earlier), what are the capabilities of Figma\'s (the design tool) agents and extensions?';

const FIGMA_LAUNCH: GateChunk = {
    id: 'articles/figma-blog/213ea4dcb6.md#c1',
    text: 'Starting today, you can use AI agents to design directly on the Figma canvas. Our new use_figma tool empowers agents to operate on the canvas using your design system. Skills make that behavior more predictable by encoding specific steps, guidelines, and code to follow. We are working toward parity with the Plugin API, starting with image support and custom fonts.',
    pageMeta: { title: 'Agents, meet the Figma canvas', sourceName: 'figma_blog', url: 'https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/', date: '2026-03-24T12:00:00.000Z', kind: 'article', method: 'source-native', extractedAt: '2026-09-10T17:24:51Z' },
};
const FIGMA_MCP: GateChunk = {
    id: 'articles/figma-blog/1e5fd6afb8.md#c3',
    text: 'The MCP server can scan your codebase and output a structured rules file outlining token definitions, component libraries, style hierarchies, and naming conventions. This file acts as a system-level guide for the agent, reducing ambiguity.',
    pageMeta: { title: 'Design systems and AI: Why MCP servers are the unlock', sourceName: 'figma_blog', url: 'https://www.figma.com/blog/design-systems-ai-mcp/', date: '2025-08-06T00:00:00.000Z', kind: 'article', method: 'source-native', extractedAt: '2026-09-10T17:24:51Z' },
};
const REDDIT_TOOLS: GateChunk = {
    id: 'articles/reddit-deep-r-figmadesign/1b849d0af7.md#c0',
    text: 'I connected Claude to the Figma MCP. The tools felt promising - ranging from get_variable to make_design_system_kit or something. It sometimes mapps the right values and sometimes not.',
    pageMeta: { title: 'How has your experience been using claude with figma mcp', sourceName: 'Reddit Deep: r/figmadesign', url: 'https://www.reddit.com/r/FigmaDesign/comments/1s3xzr4/how_has_your_experience/', date: '2026-03-26T04:44:04.000Z', kind: 'article', method: 'source-native', extractedAt: '' },
};
const WEBFLOW: GateChunk = {
    id: 'articles/webflow-blog/03064a8762.md#c1',
    text: 'The MCP server maintains a WebSocket bridge to a Designer Extension running inside the user\'s active Webflow session. This architecture gives agents a unified MCP surface while allowing the system to route operations to the correct runtime.',
    pageMeta: { title: 'The agentic web is here. Webflow is built for it.', sourceName: 'webflow_blog', url: 'https://webflow.com/blog/the-agentic-web-is-here', date: 'Tue, 21 Jul 2026 00:00:00 GMT', kind: 'article', method: 'source-native', extractedAt: '' },
};
const SECURITY: GateChunk = {
    id: 'articles/figma-blog/dcd16bd825.md#c2',
    text: 'Our Endpoint Security Baseline (ESB) detects when a device drifts out of compliance using OSQuery. Rather than requiring the user to file a ticket, the ESB messages the user in Slack and provides self-service remediation options.',
    pageMeta: { title: 'Designing for security and usability: Figma\'s modern endpoint strategy', sourceName: 'figma_blog', url: 'https://www.figma.com/blog/figmas-modern-endpoint-strategy/', date: '2025-04-04T00:00:00.000Z', kind: 'article', method: 'source-native', extractedAt: '' },
};
const THREAD_A: GateChunk = {
    id: 'articles/reddit-deep-r-designsystems/78f6986171.md#c1',
    text: 'The real issue is that prompt-based rules are constraints without anything to anchor to. The validation is non-negotiable. If it fails, it gets rejected and you iterate.',
    pageMeta: { title: 'Anyone successfully forcing AI agents to follow a central design system?', sourceName: 'Reddit Deep: r/designsystems', url: 'https://www.reddit.com/r/DesignSystems/comments/1u2z8qq/anyone_successfully_forcing_ai_agents_claude_code/', date: '2026-06-11T13:33:51.000Z', kind: 'article', method: 'source-native', extractedAt: '' },
};
const THREAD_B: GateChunk = {
    id: 'social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c1',
    text: 'The real issue is that prompt-based rules are constraints without anything to anchor to. Every session is a blank slate and the only thing holding it together is the context.',
    pageMeta: { title: 'Anyone successfully forcing AI agents to follow a central design system?', sourceName: 'reddit-deep: r/designsystems', url: 'https://www.reddit.com/r/DesignSystems/comments/1u2z8qq/anyone_successfully_forcing_ai_agents_claude_code/', date: '2026-06-11T13:33:51.000Z', kind: 'social-post', method: 'praw-deep', extractedAt: '' },
};
const CHUNKS = [FIGMA_LAUNCH, FIGMA_MCP, REDDIT_TOOLS, WEBFLOW, SECURITY, THREAD_A, THREAD_B];

const gate = (html: string) => evaluateClaimLedger(html, { goalText: GOAL, chunks: CHUNKS, fetchPage: async () => null });
const codes = (l: Awaited<ReturnType<typeof gate>>) => l.findings.map(f => f.code);

describe('profileObjective', () => {
    it('finds the subject and the as-of window', () => {
        const p = profileObjective(GOAL);
        expect(p.subjects[0]).toBe('figma');
        expect(p.asOf.toYm).toBe(202609);
        expect(p.asOf.fromYm).toBe(202608);
    });
});

describe('claim ledger gate: the reviewer\'s classes', () => {
    it('C01: the as-of window projected onto a March 2026 source is DATE_SCOPE_MISMATCH', async () => {
        const l = await gate('<p>As of the September 2026 beta, Figma exposes a real agent surface through use_figma [articles/figma-blog/213ea4dcb6.md#c1].</p>');
        const f = l.findings.find(x => x.code === 'DATE_SCOPE_MISMATCH');
        expect(f).toBeTruthy();
        expect(f!.detail).toMatch(/as-of window projected/);
        expect(f!.detail).toMatch(/2026-03/);
        expect(l.summary.UNVERIFIED_IDENTIFIER).toBe(0);  // use_figma IS in the cited chunk
    });

    it('a date the cited chunk carries passes', async () => {
        const l = await gate('<p>Figma announced use_figma in March 2026 [articles/figma-blog/213ea4dcb6.md#c1].</p>');
        expect(l.summary.DATE_SCOPE_MISMATCH).toBe(0);
    });

    it('C07: hedged forum recollection promoted to a tool inventory is UNVERIFIED_IDENTIFIER (reframe)', async () => {
        const l = await gate('<p>The Figma MCP server exposes named tools such as get_variable and make_design_system_kit that agents invoke [articles/reddit-deep-r-figmadesign/1b849d0af7.md#c0].</p>');
        const f = l.findings.filter(x => x.code === 'UNVERIFIED_IDENTIFIER');
        expect(f.length).toBeGreaterThanOrEqual(2);
        expect(f[0].repair).toBe('reframe_as_recollection');
        expect(f[0].detail).toMatch(/or something|hedged|social-post/);
    });

    it('the same identifiers framed as a recollection pass', async () => {
        const l = await gate('<p>One practitioner described tools "ranging from get_variable to make_design_system_kit or something" [articles/reddit-deep-r-figmadesign/1b849d0af7.md#c0].</p>');
        expect(l.summary.UNVERIFIED_IDENTIFIER).toBe(0);
    });

    it('C04/C05: a Webflow source describing Figma is PRODUCT_SCOPE_MISMATCH', async () => {
        const l = await gate('<p>Canvas writes in Figma depend on the live session through a WebSocket bridge to a Designer Extension [articles/webflow-blog/03064a8762.md#c1].</p>');
        const f = l.findings.find(x => x.code === 'PRODUCT_SCOPE_MISMATCH');
        expect(f).toBeTruthy();
        expect(f!.detail).toMatch(/webflow/);
        expect(f!.repair).toBe('name_the_analogy');
    });

    it('the analogy named explicitly passes the scope check', async () => {
        const l = await gate('<p>By analogy, Webflow\'s MCP server maintains a WebSocket bridge to a Designer Extension inside the active session, which is how a live-canvas write path can be routed for Figma [articles/webflow-blog/03064a8762.md#c1].</p>');
        expect(l.summary.PRODUCT_SCOPE_MISMATCH).toBe(0);
    });

    it('C17: an invented expansion ("Bot" for "Baseline") is UNVERIFIED_IDENTIFIER', async () => {
        const l = await gate('<p>Figma\'s Endpoint Security Bot detects a risk using OSQuery and puts the device into quarantine [articles/figma-blog/dcd16bd825.md#c2].</p>');
        const f = l.findings.find(x => x.code === 'UNVERIFIED_IDENTIFIER' && /Endpoint Security Bot/.test(x.detail));
        expect(f).toBeTruthy();
        expect(f!.detail).toMatch(/missing: Bot/);
    });

    it('C18: consensus language over two pointers to one thread is INDEPENDENCE_INFLATED', async () => {
        const l = await gate('<p>Every practitioner account in the corpus converges on the same structural finding about prompt-based rules [articles/reddit-deep-r-designsystems/78f6986171.md#c1, social-intelligence/reddit-deep/designsystems/1u2z8qq.md#c1].</p>');
        const f = l.findings.find(x => x.code === 'INDEPENDENCE_INFLATED');
        expect(f).toBeTruthy();
        expect(f!.detail).toMatch(/1 independent origin/);
        expect(f!.detail).toMatch(/duplicates share one URL/);
        expect(l.independentOrigins).toBe(1);
    });

    it('C22/C03: guarantee language over a source that says "more predictable" is UNSUPPORTED_MODALITY', async () => {
        const l = await gate('<p>Skills ensure agents produce correct output on the Figma canvas [articles/figma-blog/213ea4dcb6.md#c1].</p>');
        const f = l.findings.find(x => x.code === 'UNSUPPORTED_MODALITY');
        expect(f).toBeTruthy();
        expect(f!.detail).toMatch(/ensure/);
    });

    it('strong language the source itself uses passes', async () => {
        const l = await gate('<p>The practitioner states that the validation is non-negotiable and a failed check is rejected [articles/reddit-deep-r-designsystems/78f6986171.md#c1].</p>');
        expect(l.summary.UNSUPPORTED_MODALITY).toBe(0);
    });

    it('C34: "paraphrased from theme" inside the bracket is DERIVED_AS_SOURCE and is stripped deterministically', async () => {
        const html = '<p>The MCP server sends context such as components and variables to the agent [articles/figma-blog/1e5fd6afb8.md#c3, paraphrased from theme].</p>';
        const l = await gate(html);
        expect(l.summary.DERIVED_AS_SOURCE).toBe(1);
        expect(l.rows[0].pointers).toEqual(['articles/figma-blog/1e5fd6afb8.md#c3']);
        expect(applyDeterministicFixes(html, l)).toContain('[articles/figma-blog/1e5fd6afb8.md#c3]');
        expect(applyDeterministicFixes(html, l)).not.toContain('paraphrased');
    });

    it('a verbatim quote passes; a doctored quote is UNVERIFIED_QUOTE', async () => {
        const ok = await gate('<blockquote>"the MCP server can scan your codebase and output a structured rules file" [articles/figma-blog/1e5fd6afb8.md#c3]</blockquote>');
        expect(ok.summary.UNVERIFIED_QUOTE).toBe(0);
        const bad = await gate('<blockquote>"the MCP server will always scan your codebase and enforce a structured rules file" [articles/figma-blog/1e5fd6afb8.md#c3]</blockquote>');
        expect(bad.summary.UNVERIFIED_QUOTE).toBe(1);
        expect(bad.findings[0].repair).toBe('remove_quote_marks');
    });

    it('a quantified claim with no pointer is UNSOURCED_FACT; a recommendation is not', async () => {
        const l = await gate('<p>Enterprise seats receive 600 calls per day on the MCP server.</p><p>Teams should build a validation gate before writing to the canvas.</p>');
        expect(l.summary.UNSOURCED_FACT).toBe(1);
        expect(l.findings[0].severity).toBe('block');
        expect(classifyClaim('Teams should build a validation gate before writing to the canvas.')).toBe('recommendation');
    });

    it('an unknown pointer is UNRESOLVED_SOURCE and is stripped', async () => {
        const html = '<p>Figma routes operations by type [articles/nowhere/deadbeef00.md#c9].</p>';
        const l = await gate(html);
        expect(l.summary.UNRESOLVED_SOURCE).toBe(1);
        expect(l.unresolvedPointers).toEqual(['articles/nowhere/deadbeef00.md#c9']);
        expect(applyDeterministicFixes(html, l)).not.toContain('.md#c');
    });

    it('the narrowing instruction names every blocking finding and no source', () => {
        const ledger = {
            rows: [], summary: {} as any, blocking: 1, warnings: 0, pass: false, independentOrigins: 0, resolvedPointers: 0, unresolvedPointers: [],
            findings: [{ code: 'DATE_SCOPE_MISMATCH' as const, severity: 'block' as const, rowId: 'r1', sentence: 'As of the September 2026 beta', pointers: [], detail: 'projected', repair: 'narrow' as const }],
        };
        const text = buildNarrowingInstruction(ledger as any);
        expect(text).toMatch(/DATE_SCOPE_MISMATCH/);
        expect(text).toMatch(/Narrow the sentence/);
    });
});

describe('model chrome', () => {
    const CHROME = `<main><p>Body text that stays.</p>
<footer class="report-footer"><button id="copy-as-prompt" class="copy-btn">Copy as prompt</button><button id="save-as-pdf" class="copy-btn secondary">Save as PDF</button>
<details class="vs-audit"><summary>Generation audit (verbalized-sampling commitment)</summary><p>IA committed: capability-map (p≈0.20).</p></details></footer>
<script type="application/json" id="__HIC_ARTIFACT_META__">{"slug":"x","generator":"#report"}</script></main>`;
    it('strips the footer, buttons, audit block and metadata script; keeps the body', () => {
        const { html, stripped } = stripModelChrome(CHROME);
        expect(html).toContain('Body text that stays.');
        expect(html).not.toMatch(/Copy as prompt|Save as PDF|Generation audit|__HIC_ARTIFACT_META__|<footer/i);
        expect(stripped.length).toBeGreaterThanOrEqual(2);
        expect(extractClaimRows(html).map(r => r.text)).toEqual(['Body text that stays.']);
    });
});

describe('WS-1 provenance: registry labels, linked citations, chunk provenance line', () => {
    it('formats dates from ISO and RFC strings', () => {
        expect(formatCitationDate('2026-03-24T12:00:00.000Z')).toBe('Mar 2026');
        expect(formatCitationDate('Tue, 21 Jul 2026 00:00:00 GMT')).toBe('Jul 2026');
        expect(formatCitationDate('')).toBe('');
    });
    it('renders a pointer group with a commentary tail as one linked, dated citation', () => {
        registerPageMeta('articles/figma-blog/213ea4dcb6.md', FIGMA_LAUNCH.pageMeta as any);
        registerChunkSources('articles/figma-blog/213ea4dcb6.md#c1', ['Figma Blog']);
        const label = formatCitationLabel('articles/figma-blog/213ea4dcb6.md#c1');
        expect(label).toBe('Figma Blog (Mar 2026)');
        const html = renderPointerCitationsHtml('<p>Agents design on the canvas [articles/figma-blog/213ea4dcb6.md#c1, paraphrased from theme].</p>');
        expect(html).toContain('href="https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/"');
        expect(html).toContain('Figma Blog (Mar 2026)');
        expect(html).not.toContain('.md#c');
        expect(html).not.toContain('paraphrased');
        // The plain-text resolver tolerates the tail too.
        expect(resolveManifestPointers('x [articles/figma-blog/213ea4dcb6.md#c1, via theme]')).toBe('x (Source: Figma Blog)');
    });
    it('describes a chunk with source, kind, published date and url; an undated live page says retrieved', () => {
        const line = describeChunkProvenance(FIGMA_LAUNCH as any);
        expect(line).toContain('source: figma_blog');
        expect(line).toContain('kind: article');
        expect(line).toContain('published: 2026-03-24');
        expect(line).toContain('url: https://www.figma.com/blog/');
        const live = describeChunkProvenance({ id: 'articles/x-docs/ab.md#c0', pageMeta: { sourceName: 'X documentation', kind: 'documentation', date: '', extractedAt: '2026-09-11T08:00:00Z' } });
        expect(live).toContain('undated live page, retrieved: 2026-09-11');
        expect(describeChunkProvenance({ id: 'a.md#c0' })).toBe('');
    });
});

// 2026-10-01 #prd consulting-grade pass: nested blocks, spec / ref kinds, typed targets, compound absolutes,
// population words inside verbatim quotes. Each case is a shape the live #prd replay produced.
describe('claim rows: nested blocks are read, never twice', () => {
    it('reads the inner blocks of a block that holds blocks (blockquote > p, li > p, td > p)', () => {
        const html = '<blockquote><p>"Salesforce is kind of all over the place in many different versions."</p></blockquote>'
            + '<ul><li><p>Students track every application in a spreadsheet of their own.</p><p>Advisors cannot see the external applications at all.</p></li></ul>'
            + '<table><tr><td><p>Advisors open four systems before a single advising call.</p></td></tr></table>';
        const rows = extractClaimRows(html);
        expect(rows.map(r => r.tag)).toEqual(['p', 'p', 'p', 'p']);
        expect(rows.map(r => r.text)).toEqual([
            '"Salesforce is kind of all over the place in many different versions."',
            'Students track every application in a spreadsheet of their own.',
            'Advisors cannot see the external applications at all.',
            'Advisors open four systems before a single advising call.',
        ]);
    });
    it('keeps a parent block\'s own prose between its children as separate rows', () => {
        const rows = extractClaimRows('<li>The lead sentence of this list item.<ul><li>The nested child item sentence.</li></ul>The tail sentence of the outer item.</li>');
        expect(rows.map(r => r.text)).toEqual(['The lead sentence of this list item.', 'The nested child item sentence.', 'The tail sentence of the outer item.']);
    });
    it('closes unclosed paragraphs and list items the way a parser does', () => {
        const rows = extractClaimRows('<p>The first unclosed paragraph is here.<p>The second unclosed paragraph is here.<ul><li>An unclosed list item one.<li>An unclosed list item two.</ul>');
        expect(rows.map(r => r.text)).toEqual(['The first unclosed paragraph is here.', 'The second unclosed paragraph is here.', 'An unclosed list item one.', 'An unclosed list item two.']);
    });
});

describe('claim kinds: specification and references are decisions, not claims', () => {
    it('a spec-marked block needs no pointer and is never routed to narrowing; the mark inherits from an ancestor', async () => {
        const html = '<div data-claim-kind="spec"><p>Given a student has open tasks in every connected source, when the student opens the dashboard, then all tasks appear.</p></div>'
            + '<h3 data-claim-kind="spec">The student tracks every application in one place.</h3>'
            + '<p data-claim-kind="ref">Serves: Co-op Seeking Student and Incoming First-Year Student</p>';
        const ledger = await evaluateClaimLedger(html, { goalText: 'Specify the hub', chunks: [] });
        expect(ledger.rows.map(r => r.kind)).toEqual(['spec', 'spec', 'ref']);
        expect(ledger.exemptRows).toBe(3);
        expect(ledger.findings).toEqual([]);
        expect(buildNarrowingInstruction(ledger)).toBe('');
    });
    it('the same sentence unmarked stays fully gated', async () => {
        const ledger = await evaluateClaimLedger('<p>Every student tracks all applications in a spreadsheet because the portal fails.</p>', { goalText: 'x', chunks: [] });
        expect(ledger.summary.UNSOURCED_FACT).toBe(1);
        expect(ledger.blocking).toBe(1);
    });
    it('a spec row that carries a quotation still gets the verbatim check', async () => {
        const html = `<p data-claim-kind="spec">The rule quotes the source: "Agents now operate on the canvas through a brand new plugin bridge." [${FIGMA_LAUNCH.id}]</p>`;
        const ledger = await evaluateClaimLedger(html, { goalText: GOAL, chunks: [FIGMA_LAUNCH] });
        expect(ledger.summary.UNVERIFIED_QUOTE).toBe(1);
    });
    it('a typed requirement target inside a block is exempt from the number rule', () => {
        const rows = extractClaimRows('<li>Search results load before the student loses the thread.<div class="prd-target-row" data-requirement-target="1"><span class="prd-target">latency: 800 ms p95</span></div></li>');
        expect(rows).toHaveLength(1);
        expect(rows[0].text).toBe('Search results load before the student loses the thread.');
        expect(rows[0].kind).toBe('text');
        expect(extractClaimRows('<td data-requirement-target="1">rollout share: 10 percent of the pilot cohort</td>')[0].kind).toBe('spec');
    });
});

describe('false positives from the live #prd replay', () => {
    it('"First" inside a compound or proper noun is not an absolute', () => {
        expect(classifyClaim('Incoming First-Year Student · Arriving at the university')).not.toBe('fact');
        expect(classifyClaim('Owned by the First Generation Students Office for the whole cohort')).not.toBe('fact');
        expect(classifyClaim('A first-year student is the only user the advisors never contact')).toBe('fact');   // a real absolute in the same sentence still counts
    });
    it('a population word inside a verbatim quote is the source speaking, not the deliverable generalizing', async () => {
        const chunk: GateChunk = { id: 'articles/client-uploads/ab12cd34ef.md#c4', text: 'Interviewer notes. Salesforce is kind of all over the place in many different versions across the university.' };
        const html = `<blockquote>"Salesforce is kind of all over the place in many different versions across the university." [${chunk.id}]</blockquote>`;
        const ledger = await evaluateClaimLedger(html, { goalText: 'x', chunks: [chunk] });
        expect(ledger.summary.INDEPENDENCE_INFLATED).toBe(0);
        // the deliverable's own population claim over one origin is still flagged
        const own = await evaluateClaimLedger(`<p>All advisors report that Salesforce is kind of all over the place in many different versions across the university. [${chunk.id}]</p>`, { goalText: 'x', chunks: [chunk] });
        expect(own.summary.INDEPENDENCE_INFLATED).toBe(1);
    });
});
