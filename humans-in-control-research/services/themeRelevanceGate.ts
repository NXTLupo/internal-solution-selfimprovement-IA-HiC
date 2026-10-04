/**
 * themeRelevanceGate: the board-admission relevance gate for themes that come from ANOTHER engagement (2026-10-03,
 * owner decision: block off-topic themes at board admission with a meaning-based relevance check against the
 * project goal).
 *
 * Why: the Knowledge Library selection is user-level and follows the user across goals, and its engagement-theme
 * harvest offers every engagement's board themes. One university board admitted fundraising, agricultural lending,
 * email design and executive-search themes, and every deliverable then had to account for them. A lexical gate and
 * two embedding gates were measured on the real board and rejected (co-op themes scored below fundraising ones), so
 * relevance is judged by a fast model in one batched call per 80 themes, against the objective and the engagement's
 * own client scope. Verdicts are cached per engagement (wiki `engagements/<slug>/theme-relevance.json`), so a theme
 * is judged once.
 *
 * Rules: the engagement's OWN themes are never judged. A theme is held out only on an explicit "not relevant"
 * verdict; a failed or missing verdict keeps it (fail open: nothing is lost silently). Held themes stay in the
 * Knowledge Library and are named in the receipt. Generic: nothing here names a client or an industry.
 */

export interface GateTheme { id?: string; name?: string; title?: string; summary?: string; description?: string; insight?: string; source?: string; source_synthesis_path?: string }
export interface RelevanceVerdict { relevant: boolean; reason?: string; at?: string }
export interface RelevanceCache { version: 1; engagement: string; objective: string; verdicts: Record<string, RelevanceVerdict> }
export interface GateIo { proxyBase?: string; fetchImpl?: typeof fetch; judge?: (prompt: { system: string; user: string }) => Promise<string> }

const DEFAULT_PROXY = 'http://127.0.0.1:5012';
const BATCH = 80;

function slugMatches(a: string, b: string): boolean {
    const x = String(a || '').toLowerCase().trim(), y = String(b || '').toLowerCase().trim();
    if (!x || !y) return false;
    if (x === y) return true;
    const [s, l] = x.length <= y.length ? [x, y] : [y, x];
    return s.length >= 30 && l.startsWith(s);
}

/** The engagement a theme was harvested from, when it is not this one; null for the engagement's own themes. */
export function foreignSourceOf(t: GateTheme, engagement: string): string | null {
    const m = /^eng:([^#]+)#/.exec(String(t?.id || ''));
    if (m) return slugMatches(m[1], engagement) ? null : m[1];
    if (t?.source === 'cached') {
        const p = String(t.source_synthesis_path || '');
        const e = /^engagements\/([^/]+)\//.exec(p);
        if (e) return slugMatches(e[1], engagement) ? null : e[1];
        return p ? `cached:${p}` : 'cached';
    }
    return null;
}

/** Stable cache key: the theme's own id when it has one, else its normalized name. */
function verdictKey(t: GateTheme): string {
    return String(t?.id || '').trim() || `name:${String(t?.name || t?.title || '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

const JUDGE_SYSTEM = [
    'You decide which research themes belong on a project\'s research board. A theme belongs when it bears on the',
    'project\'s subject: its users, their needs and pains, the organization and its operations, the market or domain the',
    'project addresses, or the product, service or program being designed. A theme does NOT belong when it is about a',
    'different subject (another industry, another client\'s business, another program unrelated to this project), even',
    'if it shares a word or a general topic such as AI or marketing. Judge the subject, not the wording.',
    'Return JSON only: {"verdicts": [{"i": <theme number>, "relevant": true|false, "reason": "<ten words or fewer>"}]}',
    'with one verdict per theme, in order. No preamble, no code fence.',
].join('\n');

export function buildJudgePrompt(objective: string, scope: string[], themes: GateTheme[]): { system: string; user: string } {
    const lines = themes.map((t, i) => `${i + 1}. ${String(t.name || t.title || '').trim()}${(t.summary || t.description || t.insight) ? `: ${String(t.summary || t.description || t.insight).replace(/\s+/g, ' ').slice(0, 280)}` : ''}`);
    const user = [
        `PROJECT OBJECTIVE: ${objective}`,
        scope.length ? `\nTHE CLIENT'S OWN SCOPE (items from the client documents):\n${scope.slice(0, 40).map(s => `- ${s}`).join('\n')}` : '',
        `\nTHEMES TO JUDGE:\n${lines.join('\n')}`,
    ].join('\n');
    return { system: JUDGE_SYSTEM, user };
}

export function parseVerdicts(raw: string, count: number): Array<RelevanceVerdict | undefined> {
    const out: Array<RelevanceVerdict | undefined> = new Array(count).fill(undefined);
    let s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    try {
        const j = JSON.parse(s);
        for (const v of Array.isArray(j?.verdicts) ? j.verdicts : []) {
            const i = Number(v?.i) - 1;
            if (i >= 0 && i < count && typeof v?.relevant === 'boolean') out[i] = { relevant: v.relevant, reason: String(v.reason || '').slice(0, 120) };
        }
    } catch { /* unparseable: every theme keeps its default (kept) */ }
    return out;
}

/** Pure: split themes into kept and held from cached verdicts (own themes and unjudged themes are kept). */
export function applyVerdicts<T extends GateTheme>(themes: T[], engagement: string, verdicts: Record<string, RelevanceVerdict>): { kept: T[]; held: T[] } {
    const kept: T[] = [], held: T[] = [];
    for (const t of themes) {
        const foreign = foreignSourceOf(t, engagement);
        const v = foreign ? verdicts[verdictKey(t)] : undefined;
        (v && v.relevant === false ? held : kept).push(t);
    }
    return { kept, held };
}

function base(io: GateIo): string { return io.proxyBase ?? DEFAULT_PROXY; }
function fx(io: GateIo): typeof fetch { return io.fetchImpl || fetch; }
function cachePath(slug: string): string { return `engagements/${String(slug).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 80)}/theme-relevance.json`; }

async function readCache(slug: string, io: GateIo): Promise<RelevanceCache | null> {
    try {
        const r = await fx(io)(`${base(io)}/api/wiki/read/${cachePath(slug)}`);
        if (!r.ok) return null;
        const j: any = await r.json();
        if (!j?.exists || !j.content) return null;
        const c = JSON.parse(j.content);
        return c && c.verdicts ? c : null;
    } catch { return null; }
}
async function writeCache(c: RelevanceCache, io: GateIo): Promise<void> {
    try {
        await fx(io)(`${base(io)}/api/wiki/write`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: cachePath(c.engagement), content: JSON.stringify(c, null, 1) }) });
    } catch { /* the verdicts are recomputed next time */ }
}

async function defaultJudge(): Promise<(p: { system: string; user: string }) => Promise<string>> {
    const { callWithModelChain } = await import('./deliverableModelRouter');
    return async ({ system, user }) => {
        const r = await callWithModelChain({
            deliverable: 'themes' as any, preferModel: 'gemini-3.5-flash', label: 'board theme relevance gate',
            buildBody: (modelId: string) => {
                if (modelId.startsWith('claude-')) return { endpoint: 'anthropic', body: { model: modelId, max_tokens: 8000, system, messages: [{ role: 'user', content: user }] } };
                if (modelId.startsWith('gemini-')) return { endpoint: 'gemini', body: { model: modelId, systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], config: { temperature: 0, maxOutputTokens: 16000 } } };
                return { endpoint: 'openai', headers: { 'x-openai-endpoint': 'chat' }, body: { model: modelId, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_completion_tokens: 8000 } };
            },
        } as any);
        return r.text || '';
    };
}

export interface GateResult<T> { kept: T[]; held: T[]; judgedNow: number }

/**
 * Judge every unjudged theme from another engagement, cache the verdicts, and return the board split into kept and
 * held. Never throws; with no objective or nothing foreign it returns the input unchanged.
 */
export async function gateForeignThemes<T extends GateTheme>(themes: T[], opts: { engagement: string; objective: string; scope?: string[] } & GateIo): Promise<GateResult<T>> {
    const list = Array.isArray(themes) ? themes : [];
    if (!opts.engagement || !String(opts.objective || '').trim()) return { kept: list, held: [], judgedNow: 0 };
    const foreign = list.filter(t => foreignSourceOf(t, opts.engagement));
    if (!foreign.length) return { kept: list, held: [], judgedNow: 0 };
    const cache: RelevanceCache = (await readCache(opts.engagement, opts)) || { version: 1, engagement: opts.engagement, objective: opts.objective, verdicts: {} };
    // A changed objective invalidates the verdicts (the same theme can be relevant to one goal and not another).
    if (cache.objective !== opts.objective) { cache.objective = opts.objective; cache.verdicts = {}; }
    const seen = new Set<string>();
    const todo = foreign.filter(t => { const k = verdictKey(t); if (cache.verdicts[k] || seen.has(k)) return false; seen.add(k); return true; });
    let judgedNow = 0;
    if (todo.length) {
        try {
            const judge = opts.judge || await defaultJudge();
            const runBatches = async (items: T[], size: number) => {
                for (let i = 0; i < items.length; i += size) {
                    const batch = items.slice(i, i + size);
                    const raw = await judge(buildJudgePrompt(opts.objective, opts.scope || [], batch)).catch(() => '');
                    const vs = parseVerdicts(raw, batch.length);
                    const at = new Date().toISOString();
                    batch.forEach((t, k) => { if (vs[k]) { cache.verdicts[verdictKey(t)] = { ...vs[k]!, at }; judgedNow++; } });
                }
            };
            await runBatches(todo, BATCH);
            // 2026-10-03 live: a long batch came back with some verdicts missing, and the unjudged themes (an email-design
            // and a beauty-brand theme) were kept by default. Anything still unjudged is asked again in small batches.
            const missing = todo.filter(t => !cache.verdicts[verdictKey(t)]);
            if (missing.length) await runBatches(missing, 20);
            if (judgedNow) await writeCache(cache, opts);
        } catch (e: any) {
            console.warn('[theme-gate] relevance judging failed; every theme kept (non-fatal):', e?.message || e);
        }
    }
    const { kept, held } = applyVerdicts(list, opts.engagement, cache.verdicts);
    return { kept, held, judgedNow };
}
