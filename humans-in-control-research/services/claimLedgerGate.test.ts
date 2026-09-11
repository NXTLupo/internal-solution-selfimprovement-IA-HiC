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
