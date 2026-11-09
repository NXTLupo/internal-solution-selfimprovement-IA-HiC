/**
 * prdInputs.ts (2026-10-01, plan Stage 3.2: inputs honored)
 *
 * The one adapter from the chat context (approved personas, themes, journey stages, gap and
 * competitive analyses, the grounding chunks the writer was shown) to the typed `PrdCompilerInputs`
 * the PRD compiler consumes. Every requirement the compiler emits must trace to one of these roots;
 * an empty root set is a `PrdInputsError` the caller surfaces, never an empty array passed along
 * (the F1 defect: the pipeline PRD received empty persona and theme inputs and wrote around them).
 *
 * Shapes in the context are loose (pipeline results, deliverable blocks, restored sessions), so
 * every field is read defensively and nothing is invented: a pain without a quote stays a pain
 * without a quote.
 */
import type { PrdCompilerInputs, PrdPersonaInput, PrdThemeInput, PrdJourneyPainInput, PrdCompetitiveGapInput, PrdEvidenceChunk } from './prdCompiler';
import type { BrandId } from '../components/slideTemplates/brands';

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : (v == null ? '' : String(v).trim()));
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

function painOf(pp: any): { text: string; quote?: string; source?: string; pointer?: string } | null {
    if (!pp) return null;
    if (typeof pp === 'string') return pp.trim() ? { text: pp.trim() } : null;
    const text = str(pp.text || pp.description || pp.pain || pp.painPoint || pp.label || pp.title);
    if (!text) return null;
    const quote = str(pp.quote || pp.evidence || pp.verbatim) || undefined;
    const source = str(pp.source || pp.sourceName || pp.attribution) || undefined;
    const pointer = str(pp.pointer || pp.chunkId || pp.chunk_id || pp.sourceFile) || undefined;
    return { text, quote, source, pointer };
}

export function personasFromContext(personas: unknown): PrdPersonaInput[] {
    return arr(personas).map((p: any, i: number) => {
        const pains = [
            ...arr(p?.painPoints), ...arr(p?.pains), ...arr(p?.frustrations), ...arr(p?.pain_points),
        ].map(painOf).filter((x): x is NonNullable<ReturnType<typeof painOf>> => !!x);
        return {
            id: str(p?.id) || `P${i + 1}`,
            name: str(p?.name || p?.title) || `Persona ${i + 1}`,
            role: str(p?.role || p?.jobTitle || p?.occupation) || undefined,
            primary: p?.primary === true || p?.type === 'primary' || (i === 0 && p?.primary !== false),
            stageOfStruggle: str(p?.stageOfStruggle || p?.stage_of_struggle || p?.jtbd) || undefined,
            painPoints: pains,
        };
    }).filter(p => p.name);
}

export function themesFromContext(themes: unknown): PrdThemeInput[] {
    return arr(themes).map((t: any, i: number) => ({
        id: str(t?.id) || `T${i + 1}`,
        name: str(t?.name || t?.title) || `Theme ${i + 1}`,
        insight: str(t?.description || t?.summary || t?.insight) || undefined,
        sentiment: str(t?.sentiment) || undefined,
        category: str(t?.category || (Array.isArray(t?.top_terms) ? t.top_terms[0] : '')) || undefined,
        // Provenance the board-admission gate reads (a cached theme from another engagement keeps its origin).
        ...(t?.source ? { source: str(t.source) } : {}),
        ...(t?.source_synthesis_path ? { source_synthesis_path: str(t.source_synthesis_path) } : {}),
        quotes: [...arr(t?.citations), ...arr(t?.keyQuotes), ...arr(t?.quotes)]
            .map((c: any) => {
                const text = str(typeof c === 'string' ? c : (c?.quote || c?.text));
                if (!text) return null;
                return { text, source: str(c?.sourceName || c?.source || c?.attribution) || 'corpus', pointer: str(c?.chunkId || c?.pointer || c?.sourceFile) || undefined };  // session theme citations carry the pointer as `sourceFile`
            })
            .filter((q): q is { text: string; source: string; pointer: string | undefined } => !!q),
    })).filter(t => t.name);
}

function journeyPainsFromContext(stages: unknown): PrdJourneyPainInput[] {
    const out: PrdJourneyPainInput[] = [];
    arr(stages).forEach((st: any, si: number) => {
        const stage = str(st?.name || st?.stage || st?.title || st?.phase) || `Stage ${si + 1}`;
        const pains = [...arr(st?.painPoints), ...arr(st?.pains), ...arr(st?.frustrations), ...arr(st?.pain_points)];
        pains.forEach((pp: any, pi: number) => {
            const p = painOf(pp);
            if (!p) return;
            out.push({ id: `J${si + 1}.${pi + 1}`, stage, ...p, personaIds: arr(st?.personaIds || pp?.personaIds).map(str).filter(Boolean) });
        });
    });
    return out;
}

export function competitiveGapsFromContext(gapAnalysis: unknown, competitiveAnalysis: unknown): PrdCompetitiveGapInput[] {
    const out: PrdCompetitiveGapInput[] = [];
    const ga: any = gapAnalysis || {};
    const rows = [...arr(ga?.gaps), ...arr(ga?.rows), ...arr(ga?.items), ...arr(ga?.capabilityGaps)];
    rows.forEach((g: any, i: number) => {
        // 2026-10-06 live #prd: gap-matrix rows carry `gap` as the NUMERIC current-to-target delta; read first, it
        // made 44 of 114 gaps the bare text "3". A numeric field is a score, never the gap's name.
        const named = (v: any) => (typeof v === 'string' && !/^\s*[-+]?\d+(?:\.\d+)?\s*$/.test(v) ? v : '');
        const cap = named(g?.capability) || named(g?.name) || named(g?.dimension);
        const desc = named(g?.description) || named(g?.gap) || named(g?.title);
        const text = str(cap && desc && !desc.toLowerCase().startsWith(cap.toLowerCase()) ? `${cap}: ${desc}` : (desc || cap));
        if (!text) return;
        out.push({ id: `CG${i + 1}`, text, quote: str(g?.quote || g?.evidence) || undefined, source: str(g?.source || g?.sourceName) || undefined, pointer: str(g?.pointer || g?.chunkId || g?.sourceFile) || undefined });
    });
    const ca: any = competitiveAnalysis || {};
    const comps = [...arr(ca?.competitors), ...arr(ca?.rows), ...arr(ca?.peers)];
    comps.forEach((c: any, ci: number) => {
        const competitor = str(c?.name || c?.competitor || c?.subject);
        const gaps = [...arr(c?.gaps), ...arr(c?.weaknesses), ...arr(c?.whereTheyLead), ...arr(c?.advantages)];
        gaps.forEach((g: any, gi: number) => {
            const text = str(typeof g === 'string' ? g : (g?.text || g?.description || g?.gap));
            if (!text) return;
            out.push({ id: `CG${rows.length + ci + 1}.${gi + 1}`, text, competitor: competitor || undefined, quote: str(g?.quote) || undefined, source: str(g?.source || g?.sourceName) || undefined, pointer: str(g?.pointer || g?.chunkId || g?.sourceFile) || undefined });
        });
    });
    return out;
}

function evidenceChunksFromGrounding(chunks: unknown): PrdEvidenceChunk[] {
    return arr(chunks)
        .filter((c: any) => c && str(c.id) && str(c.text))
        .map((c: any) => ({
            id: str(c.id), text: str(c.text),
            sources: arr(c.sources).map((s: any) => ({ n: str(s?.n || s?.sourceName) || undefined, u: str(s?.u || s?.url) || undefined })),
            kind: str(c.pageMeta?.kind || c.kind) || undefined,
            date: str(c.pageMeta?.date || c.date) || undefined,
        }));
}

export interface PrdInputsMeta {
    artifactId: string;
    runId?: string;
    objective: string;
    decisionToSupport?: string;
    brand?: BrandId;
    appetiteHint?: string;
}

/**
 * Chat deliverable blocks (`:::deliverable:` persona / theme / gap / competitive cards the Analyst produced
 * in this session) are evidence roots too: a persona approved in chat is as real as one from the pipeline.
 * Returns the context fields merged with the deliverables' payloads; the pipeline fields come first.
 */
export function mergeDeliverableRoots(ctx: any, deliverables: unknown, slides?: unknown): any {
    // Slide-fence artifacts carry their payload under a template-specific key (the panel's SUBFIELD map):
    // persona-card -> slide.persona, competitive-matrix -> slide.matrix, journey-map -> slide.journeyMap,
    // theme-cluster -> slide.themeCluster. The live 2026-10-01 run produced its personas as persona-card
    // SLIDES, so a PRD that only read deliverable blocks saw no approved personas.
    const fromSlides: any[] = [];
    for (const sl of arr(slides)) {
        const tpl = String(sl?.template || '').toLowerCase();
        if (tpl === 'persona-card' && sl.persona && typeof sl.persona === 'object') fromSlides.push({ type: 'persona', data: sl.persona });
        else if (tpl.startsWith('theme')) {
            const t = sl.themeCluster || sl.themes || sl.theme || sl.composerPayload?.themes;
            if (t) fromSlides.push({ type: 'theme', data: Array.isArray(t) ? { themes: t } : (t.themes ? t : t) });
        }
        else if (tpl === 'gap-matrix' && (sl.gap || sl.gapMatrix || sl.rows)) fromSlides.push({ type: 'gap', data: sl.gap || sl.gapMatrix || { rows: sl.rows } });
        else if (tpl === 'competitive-matrix' && sl.matrix) fromSlides.push({ type: 'competitive', data: sl.matrix });
        else if (tpl === 'journey-map' && (sl.journeyMap || sl.stages)) fromSlides.push({ type: 'journey', data: sl.journeyMap || { stages: sl.stages } });
    }
    const dels = [...arr(deliverables), ...fromSlides].filter((d: any) => d && d.data && typeof d.data === 'object');
    if (!dels.length) return ctx || {};
    const byType = (pred: (t: string) => boolean) => dels.filter((d: any) => pred(String(d.type || '').toLowerCase())).map((d: any) => d.data);
    const personas = byType(t => t.startsWith('persona'));
    const themes = byType(t => t.startsWith('theme'));
    const gaps = byType(t => t.startsWith('gap'));
    const comps = byType(t => t.startsWith('compet'));
    const journeys = byType(t => t.startsWith('journey'));
    const merged: any = { ...(ctx || {}) };
    if (personas.length) merged.personas = [...arr(ctx?.personas), ...personas.flatMap((p: any) => Array.isArray(p?.personas) ? p.personas : [p])];
    if (themes.length) merged.themes = [...arr(ctx?.themes), ...themes.flatMap((t: any) => Array.isArray(t?.themes) ? t.themes : [t])];
    if (gaps.length) merged.gapAnalysis = { gaps: [...arr(ctx?.gapAnalysis?.gaps), ...gaps.flatMap((g: any) => Array.isArray(g?.gaps) ? g.gaps : (Array.isArray(g?.rows) ? g.rows : [g]))] };
    if (comps.length) merged.competitiveAnalysis = { competitors: [...arr(ctx?.competitiveAnalysis?.competitors), ...comps.flatMap((c: any) => Array.isArray(c?.competitors) ? c.competitors : (Array.isArray(c?.rows) ? c.rows : [c]))] };
    if (journeys.length) merged.journeyStages = [...arr(ctx?.journeyStages), ...journeys.flatMap((j: any) => Array.isArray(j?.stages) ? j.stages : (Array.isArray(j?.phases) ? j.phases : []))];
    return merged;
}

/** Build the typed compiler inputs from a chat context (plus optional chat deliverables) and the grounding chunks. Throws nothing; the compiler validates. */
export function buildPrdInputsFromContext(ctx: any, groundingChunks: unknown, meta: PrdInputsMeta, deliverables?: unknown, slides?: unknown): PrdCompilerInputs {
    if (deliverables !== undefined || slides !== undefined) ctx = mergeDeliverableRoots(ctx, deliverables, slides);
    return {
        artifactId: meta.artifactId,
        runId: meta.runId,
        objective: meta.objective,
        decisionToSupport: meta.decisionToSupport,
        brand: meta.brand,
        appetiteHint: meta.appetiteHint,
        personas: personasFromContext(ctx?.personas),
        themes: themesFromContext(ctx?.themes),
        journeyPains: journeyPainsFromContext(ctx?.journeyStages || ctx?.journeyMap?.stages),
        competitiveGaps: competitiveGapsFromContext(ctx?.gapAnalysis, ctx?.competitiveAnalysis),
        evidenceChunks: primaryFirst(evidenceChunksFromGrounding(groundingChunks), [
            ...themesFromContext(ctx?.themes).flatMap(t => t.quotes.map(q => q.text)),
            ...personasFromContext(ctx?.personas).flatMap(p => p.painPoints.map(pp => pp.quote || '')),
        ]),
    };
}

const _norm = (x: string) => String(x || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const _isDerived = (id: string) => /hic-theme-synthesis|\/synthesis\//i.test(id);

/**
 * 2026-10-01 (evidence hierarchy, consulting grade): the compiler reads at most ~60 grounding chunks, and the
 * PRIMARY passage behind a session quote (an upload, an article, a social post) often sat outside that window,
 * so the quote could only be cited to a derived synthesis page. Chunks that contain a session quote verbatim
 * (primary pages first) move to the front, in their original relative order; nothing is dropped.
 */
export function primaryFirst<T extends { id: string; text: string }>(chunks: T[], quotes: string[]): T[] {
    const qs = Array.from(new Set(quotes.map(_norm).filter(q => q.length >= 24))).map(q => q.slice(0, 80));
    if (!qs.length) return chunks;
    const score = (c: T) => {
        const t = _norm(c.text);
        const hit = qs.some(q => t.includes(q));
        return hit ? (_isDerived(c.id) ? 1 : 2) : 0;
    };
    return chunks.map((c, i) => ({ c, i, s: score(c) })).sort((a, b) => (b.s - a.s) || (a.i - b.i)).map(x => x.c);
}
