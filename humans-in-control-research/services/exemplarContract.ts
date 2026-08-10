/**
 * exemplarContract.ts (2026-08-07, hashtag-deliverable design-system build)
 *
 * THE CONSULTATION RULE: before ANY hashtag deliverable generates - on the
 * Analyst desk (corpusChatService) AND the Designer desk (chatToSlideSpec /
 * chatToFreeform) - the agent consults the exemplar manifest
 * (wiki design-system/exemplar-manifest.md): the Figma canon node ids and the
 * decomposed-component anatomy for that artifact. Structure outside the
 * exemplar anatomy is a gate violation (deckPlanGate / schema validation /
 * the D4 design-change spine). Fail-open by design: a missing manifest never
 * blocks generation, it only loses the contract block (and the loss is
 * visible in logs + the L1 exemplar_consultations counter).
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

let _exemplarManifestCache: string | null = null;

/** Fetch (once per session) + slice the exemplar manifest for this message's hashtags. */
export async function fetchExemplarContract(userMessage: string): Promise<string> {
    try {
        if (_exemplarManifestCache === null) {
            const r = await fetch(`${PROXY_BASE}/api/wiki/read-article/${encodeURIComponent('design-system/exemplar-manifest.md')}`);
            if (r.ok) {
                const j = await r.json().catch(() => null);
                _exemplarManifestCache = (j && (j.content || j.body || j.markdown)) ? String(j.content || j.body || j.markdown) : '';
            } else { _exemplarManifestCache = ''; }
        }
        if (!_exemplarManifestCache) return '';
        return sliceExemplarSections(_exemplarManifestCache, userMessage);
    } catch { return ''; }
}

/** Designer-desk convenience: map an artifact KIND to its hashtag and fetch. */
export async function fetchExemplarContractForKind(kind: string): Promise<string> {
    const k = (kind || '').toLowerCase();
    const tag =
        /persona/.test(k) ? '#personas' :
        /journey/.test(k) ? '#journey' :
        /theme/.test(k) ? '#themes' :
        /arch/.test(k) ? '#arch' :
        /blueprint/.test(k) ? '#blueprint' :
        /competitive/.test(k) ? '#competitive' :
        /gap/.test(k) ? '#gap' :
        /rec/.test(k) ? '#recs' :
        /roadmap|timeline/.test(k) ? '#roadmap' :
        /slide|deck|strategy|presentation|cover/.test(k) ? '#slides' : '';
    if (!tag) return '';
    return fetchExemplarContract(tag);
}

/** Pure section slicer (exported for tests): keeps the `## #hashtag` sections whose hashtag
 *  appears in the message, plus the Usage rules block, wrapped in the consultation header. */
export function sliceExemplarSections(manifest: string, userMessage: string): string {
    const TAGS: Array<[RegExp, string]> = [
        [/#slides?\b|#strategy\b|#presentation\b/i, '## #slides'],
        [/#themes?\b/i, '## #themes'],
        [/#personas?\b/i, '## #personas'],
        [/#arch\b/i, '## #arch'],
        [/#journey\b/i, '## #journey'],
        [/#blueprint\b/i, '## #blueprint'],
        [/#competitive\b/i, '## #competitive'],
        [/#gap\b/i, '## #gap'],
        [/#recs?\b|#recommendations?\b/i, '## #recs'],
        [/#roadmap\b/i, '## #roadmap'],
    ];
    const wanted = TAGS.filter(([re]) => re.test(userMessage)).map(([, h]) => h);
    if (wanted.length === 0) return '';
    const sections = manifest.split(/\n(?=## )/);
    const kept = sections.filter(s => {
        const head = s.split('\n', 1)[0] || '';
        return wanted.some(h => head.startsWith(h))
            || head.startsWith('## Usage rules')
            || head.startsWith('## THE IMAGERY CONTRACT');
    });
    if (kept.length === 0) return '';
    let block = kept.join('\n');
    if (block.length > 8000) block = block.slice(0, 8000) + '\n[exemplar contract truncated]';
    return `\n\n=== EXEMPLAR CONTRACT (design-system/exemplar-manifest.md - CONSULT BEFORE COMPOSING: the Figma canon + decomposed-component anatomy for this artifact; structure outside this anatomy is a gate violation) ===\n${block}`;
}

/** L1 telemetry: book one consultation event on the session's loop aggregate. */
export function noteExemplarConsultation(sessionSlug?: string): void {
    try {
        const slug = sessionSlug
            || (typeof window !== 'undefined' ? (window as any).__hicCurrentEngagementSlug : '')
            || '_unassigned';
        void fetch(`${PROXY_BASE}/api/sessions/loop-trace/event`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: slug, field: 'exemplar_consultations' }),
        }).catch(() => { /* fire-and-forget */ });
    } catch { /* telemetry never blocks */ }
}
