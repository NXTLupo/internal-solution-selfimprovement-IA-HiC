// D17 (2026-07-01, owner-chosen): map a diagram slide's native generated data
// (JourneyMapData / ArchitectureMapData / mindmap) to the corpus-derived `spec` the proxy
// /api/ai/diagram native renderer (proxy/nxt_diagram_render.py) consumes. Nothing hardcoded:
// every field comes from the slide's already-generated data. Used at gen-time (inline preview)
// AND at export (PPTX embed) so both paths build the SAME full-bleed exhibit image.

import { normalizeBrandId, type BrandId } from '../components/slideTemplates/brands';

type AnySlide = any;

function asList<T = any>(v: any): T[] {
    return Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);
}

function s(v: any): string {
    if (v && typeof v === 'object') return String(v.text || v.label || v.name || v.value || '');
    return v == null ? '' : String(v);
}

/** The diagram-image templates and their proxy `kind`. Returns null for non-diagram templates. */
function diagramTemplateKind(template: string): string | null {
    const t = (template || '').toLowerCase();
    if (t === 'journey-map') return 'journey';
    if (t === 'architecture-map') return 'architecture';
    if (t === 'mindmap') return 'mindmap';
    if (t === 'service-blueprint') return 'blueprint';
    return null;
}

/** Build the /api/ai/diagram spec from a slide, or null if not a diagram slide / no data yet. */
export function buildDiagramSpec(slide: AnySlide): any | null {
    const kind = diagramTemplateKind(slide?.template || '');
    if (!kind) return null;
    const title = s(slide.title);

    if (kind === 'journey' || kind === 'blueprint') {
        const d = slide.journeyMap || {};
        const stages = asList(d.stages).map((x: any) => (typeof x === 'string' ? { name: x } : (x || {})));
        const lanes = asList(d.lanes).map((l: any) => ({ actor: s(l.actor), cells: asList(l.cells).map(s) }))
            .filter((l: any) => l.actor);
        if (!stages.length || !lanes.length) return null;
        const kpis = asList(d.kpiTiles);
        const pains = asList(d.painPoints);
        const opps = asList(d.opportunities);
        const phases = stages.slice(0, 6).map((st: any, i: number) => {
            const p = pains[i];
            const painList = (Array.isArray(p) ? p : (p ? [p] : [])).map(s).filter(Boolean);
            const kpi = kpis[i];
            return {
                name: s(st.name),
                critical: !!st.critical,
                kpi: kpi && s(kpi.value) ? { label: s(kpi.label), value: s(kpi.value) } : undefined,
                pains: painList,
                opportunity: s(opps[i]),
            };
        });
        return {
            kind: kind === 'blueprint' ? 'blueprint' : 'journey',
            title,
            kicker: s(d.journeyType) || undefined,
            takeaway: s(d.keyInsight),
            personas: asList(d.personas).map(s).filter(Boolean),
            phases,
            lanes,
        };
    }

    if (kind === 'architecture') {
        const d = slide.architectureMap || {};
        const layers = asList(d.layers).map((ly: any) => ({
            name: s(ly.name),
            nodes: asList(ly.nodes).map((n: any) => ({ label: s(n.name || n.label), desc: s(n.description || n.desc || n.type) }))
                .filter((n: any) => n.label),
        })).filter((ly: any) => ly.nodes.length);
        if (!layers.length) return null;
        return { kind: 'architecture', title, layers, flowSummary: s(d.flowSummary) };
    }

    if (kind === 'mindmap') {
        const d = slide.mindMap || slide.mindmap || {};
        const root = d.root || d;
        const children = asList(root.children || d.nodes || d.branches);
        const nodes = children.map((c: any) => ({
            label: s(c.label || c.name || c.title),
            desc: s((c.children && c.children[0] && (c.children[0].label || c.children[0].name)) || c.description || c.desc),
        })).filter((n: any) => n.label);
        if (!nodes.length) return null;
        return { kind: 'mindmap', title, hub: s(root.label || root.name) || title, nodes };
    }
    return null;
}

/** Fetch (or reuse) the full-bleed exhibit PNG for a slide. Returns a data URI, or '' on failure
 *  (fail-open: the caller keeps the native matrix fallback). */
export async function fetchDiagramImage(slide: AnySlide, brand: BrandId | string, proxyBase = 'http://127.0.0.1:5012'): Promise<string> {
    const spec = buildDiagramSpec(slide);
    if (!spec) return '';
    try {
        // brand is normalized to its id (nxt | nu | deciem) so the proxy renderer paints the matching
        // token palette (DECIEM: black / white with pink, cyan, purple pops; never NXT chartreuse).
        const r = await fetch(`${proxyBase}/api/ai/diagram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spec, brand: normalizeBrandId(brand), canvas: 'light' }),
        });
        if (!r.ok) return '';
        const d = await r.json();
        return (d && (d.dataUri || (d.url ? `${proxyBase}${d.url}` : ''))) || '';
    } catch {
        return '';
    }
}
