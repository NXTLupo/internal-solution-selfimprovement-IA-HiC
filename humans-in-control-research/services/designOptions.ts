/**
 * Designer option boards (2026-10-31, agent-stack plan WS-E E2). `#design options:3 <subject>` composes N layout
 * directions for one subject as a verbalized distribution (each with the model's probability that it fits best),
 * renders them side by side, and the one the owner picks is pinned as the engagement's design direction: a
 * `preference` fact (scope engagement) that the next `#slides` deck and `#proto` build read before composing.
 *
 * The directions differ in LAYOUT (grid, regions, reading order, density, imagery), never in copy: the same headline
 * and evidence appear in every option, so the owner chooses a composition, not a message. Previews use the brand's
 * design-token custom properties only; scripts, external URLs and event handlers are stripped before rendering.
 */
import type { ProposedFact } from './memoryLifecycle';

export interface DesignOption {
    id: number;
    name: string;
    probability: number;
    layout: string;
    hierarchy: string;
    density: 'airy' | 'balanced' | 'dense';
    imagery: string;
    rationale: string;
    previewHtml: string;
}

export interface DesignDirective { count: number; subject: string }

const clean = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').replace(/—/g, ',').trim().slice(0, max);

/** `#design options:3 <subject>` (count 2..4, default 3). Null when the message carries no #design directive. */
export function parseDesignDirective(text: string): DesignDirective | null {
    const t = String(text || '');
    if (!/(^|\s)#design(?![\w-])/i.test(t)) return null;
    const m = /\boptions?\s*[:=]\s*(\d+)/i.exec(t);
    const count = Math.max(2, Math.min(4, m ? Number(m[1]) : 3));
    const subject = t.replace(/#[\w-]+/g, ' ').replace(/\boptions?\s*[:=]\s*\d+/gi, ' ').replace(/\s+/g, ' ').trim();
    return { count, subject };
}

export function buildDesignOptionsPrompt(d: DesignDirective, ctx: { brand: string; tokensPrompt: string; evidence?: string; objective?: string }): { system: string; user: string } {
    const system = [
        `You are a design director. You compose ${d.count} alternative LAYOUT directions for one subject in the ${ctx.brand.toUpperCase()} design system and return them as a verbalized distribution: each direction carries your probability that it is the best fit for the subject and audience, and the probabilities sum to 1.`,
        'The directions differ in composition only: grid and regions, reading order, density, and imagery mode (photography, native diagram, data panel, or none). Every direction uses the SAME headline and the SAME evidence, so the owner compares layouts, not messages.',
        'Each direction includes a preview: one HTML fragment rooted at <div class="opt">, about 960 by 540 pixels, styled with inline style attributes. Colors, fonts and spacing come ONLY from the design-token custom properties listed below, written as var(--token); never a literal hex value or font name. No <script>, no external URLs, no <img>: an image region is a token-colored block whose small label names what the image would show.',
        'Copy rules: the headline is a complete sentence stating a judgment about the subject, at most ten words, literal language, no metaphor. No em dashes. No figures unless they sit inside a quoted, attributed sentence from the evidence. No process language about the deck or the research.',
        'Return ONLY JSON: {"options":[{"name":"<two to four words>","probability":<0..1>,"layout":"<one sentence: grid and regions>","hierarchy":"<one sentence: what the eye reads first, second, third>","density":"airy"|"balanced"|"dense","imagery":"<one phrase>","rationale":"<one sentence: why this layout fits the subject>","previewHtml":"<div class=\\"opt\\">...</div>"}]}',
        '',
        'DESIGN TOKENS:',
        ctx.tokensPrompt || '(token block unavailable: use var(--ink), var(--accent), var(--cyan), var(--rail), var(--font-display), var(--font-body))',
    ].join('\n');
    const user = [
        `SUBJECT: ${clean(d.subject, 600) || clean(ctx.objective, 600) || 'the engagement objective'}`,
        ctx.objective ? `ENGAGEMENT OBJECTIVE: ${clean(ctx.objective, 400)}` : '',
        ctx.evidence ? `EVIDENCE (quote only from here):\n${String(ctx.evidence).slice(0, 6000)}` : '',
        `Return exactly ${d.count} directions.`,
    ].filter(Boolean).join('\n\n');
    return { system, user };
}

/** Remove everything a preview must not run or fetch. */
export function sanitizePreviewHtml(html: string): string {
    let h = String(html || '').slice(0, 16000);
    // paired elements with their content first, then any stray opening, closing or self-closing tag of those names
    h = h.replace(/<\s*(script|iframe|object|embed|form|noscript|template)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    h = h.replace(/<\s*\/?\s*(script|iframe|object|embed|link|meta|base|form|noscript|template)\b[^>]*>/gi, '');
    h = h.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    h = h.replace(/(href|src|action|formaction|xlink:href)\s*=\s*("|')\s*(javascript:|data:text\/html|https?:)[^"']*\2/gi, '$1=$2#$2');
    h = h.replace(/url\(\s*(['"]?)\s*(https?:|javascript:)[^)]*\)/gi, 'none');
    h = h.replace(/@import[^;]+;/gi, '');
    return h.replace(/—/g, ',');
}

export function parseDesignOptions(raw: string, count: number): DesignOption[] {
    const m = /\{[\s\S]*\}/.exec(String(raw || ''));
    if (!m) return [];
    let j: any;
    try { j = JSON.parse(m[0]); } catch { return []; }
    const rows: any[] = Array.isArray(j?.options) ? j.options : [];
    const seen = new Set<string>();
    const out: DesignOption[] = [];
    for (const r of rows) {
        const name = clean(r?.name, 60);
        const previewHtml = sanitizePreviewHtml(String(r?.previewHtml || ''));
        if (!name || seen.has(name.toLowerCase()) || !/class\s*=\s*["']opt["']/.test(previewHtml)) continue;
        seen.add(name.toLowerCase());
        out.push({
            id: out.length + 1,
            name,
            probability: Math.max(0, Number(r?.probability) || 0),
            layout: clean(r?.layout, 240),
            hierarchy: clean(r?.hierarchy, 240),
            density: (['airy', 'balanced', 'dense'] as const).includes(r?.density) ? r.density : 'balanced',
            imagery: clean(r?.imagery, 80),
            rationale: clean(r?.rationale, 240),
            previewHtml,
        });
        if (out.length === count) break;
    }
    const total = out.reduce((s, o) => s + o.probability, 0);
    for (const o of out) o.probability = total > 0 ? Math.round((o.probability / total) * 100) / 100 : Math.round((1 / out.length) * 100) / 100;
    return out;
}

/** The sandboxed document one option renders in: the brand's token custom properties, then the fragment. */
export function previewDocument(option: Pick<DesignOption, 'previewHtml'>, tokenCss: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"><style>${String(tokenCss || '').replace(/<\//g, '<\\/')}
html,body{margin:0;padding:0;background:var(--paper, white);font-family:var(--font-body, sans-serif);color:var(--ink, black);}
.opt{width:960px;height:540px;overflow:hidden;box-sizing:border-box;transform-origin:0 0;}
</style></head><body>${sanitizePreviewHtml(option.previewHtml)}</body></html>`;
}

const DIRECTION_PREFIX = 'Design direction for ';

/** The owner's pick, as the engagement's design direction (a preference fact). */
export function designDirectionFact(o: Pick<DesignOption, 'name' | 'layout' | 'hierarchy' | 'density' | 'imagery'>, subject: string): ProposedFact[] {
    const s = clean(subject, 120) || 'this engagement';
    return [{
        content: `${DIRECTION_PREFIX}${s}: ${clean(o.name, 60)}. Layout: ${clean(o.layout, 240)} Reading order: ${clean(o.hierarchy, 240)} Density: ${o.density}. Imagery: ${clean(o.imagery, 80)}.`,
        category: 'preference', confidence: 0.9, scope: 'engagement', durability: 'durable', authority: 'descriptive', expectedValidDays: 180,
    }];
}

export interface PinnedDirection { id: string; content: string }

/** The engagement's newest pinned design direction, or null. */
export async function loadDesignDirection(engagement: string, fetchImpl: typeof fetch = globalThis.fetch): Promise<PinnedDirection | null> {
    if (!engagement) return null;
    try {
        const { proxyBase } = await import('./proxyConfig');
        const q = new URLSearchParams({ category: 'preference', engagement });
        const r = await fetchImpl(`${proxyBase()}/api/memory/facts?${q.toString()}`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) return null;
        const facts: any[] = ((await r.json())?.facts || []).filter((f: any) => f?.scope === 'engagement' && String(f?.content || '').startsWith(DIRECTION_PREFIX)
            && (!f.engagement || f.engagement === engagement));
        if (!facts.length) return null;
        facts.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        return { id: String(facts[0].id), content: String(facts[0].content) };
    } catch {
        return null;
    }
}

/** The prompt block a deck or prototype build reads. */
export function directionBlock(d: PinnedDirection | null): string {
    return d ? `=== PINNED DESIGN DIRECTION (the owner chose this layout on the Designer option board; compose to it unless THIS request says otherwise) ===\n${d.content}` : '';
}

/** One generation of the board through the routing authority's model. */
export async function generateDesignOptions(d: DesignDirective, ctx: { brand: string; objective?: string; evidence?: string }): Promise<{ ok: boolean; options: DesignOption[]; model: string; tokenCss: string; error?: string }> {
    const { proxyBase } = await import('./proxyConfig');
    const { artifactModelFor } = await import('./aiRouter');
    const { callAIWithRetry } = await import('./aiRetryClient');
    const brandId = ctx.brand.toUpperCase();
    const [tokensPrompt, tokenCss] = await Promise.all([
        fetch(`${proxyBase()}/api/design-tokens?brand=${brandId}&format=prompt`).then(r => (r.ok ? r.text() : '')).catch(() => ''),
        fetch(`${proxyBase()}/api/design-tokens?brand=${brandId}&format=css`).then(r => (r.ok ? r.text() : '')).catch(() => ''),
    ]);
    const { system, user } = buildDesignOptionsPrompt(d, { brand: ctx.brand, tokensPrompt, evidence: ctx.evidence, objective: ctx.objective });
    const model = artifactModelFor('design');
    try {
        let text = '';
        if (model.startsWith('claude-')) {
            const data: any = await callAIWithRetry('anthropic', { model, max_tokens: 24000, system, messages: [{ role: 'user', content: user }] },
                { label: `#design options:${d.count}`, maxAttempts: 2 });
            text = (Array.isArray(data?.content) ? data.content : []).map((b: any) => (typeof b?.text === 'string' ? b.text : '')).join('');
        } else {
            const data: any = await callAIWithRetry('gemini', {
                model, systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }],
                config: { responseMimeType: 'application/json', maxOutputTokens: 32000 },
            }, { label: `#design options:${d.count}`, maxAttempts: 2 });
            text = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
        }
        const options = parseDesignOptions(text, d.count);
        if (options.length < 2) return { ok: false, options, model, tokenCss, error: 'the model returned fewer than two usable directions' };
        return { ok: true, options, model, tokenCss };
    } catch (e: any) {
        return { ok: false, options: [], model, tokenCss, error: e?.message || 'generation failed' };
    }
}
