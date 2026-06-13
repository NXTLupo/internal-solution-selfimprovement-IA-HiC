/**
 * slidePaginator - deterministic multi-slide decomposition (W0, 2026-06-11).
 *
 * The density ladder is: base layout -> dense layout (structural) ->
 * DECOMPOSITION. A 16:9 slide has a physical ceiling; payloads beyond a
 * template's dense ceiling split into an OVERVIEW slide plus CONTINUATION
 * slides per segment. This replaces the renderer-level `.slice(0, caps)`
 * truncation, which silently DROPPED evidenced items (a defect under the
 * density constraint: never cram past ceilings, never drop evidence).
 *
 * The prompt-side DECOMPOSITION RULE in corpusChatService teaches the model
 * to paginate; this module is the deterministic guarantee when it doesn't.
 * Pure function, no side effects: parseSlideBlocks maps each parsed slide
 * through paginateSlide() and flattens.
 *
 * Continuation titles: the action-title rule says titles are conclusions.
 * Continuations keep the original conclusion with a mono-style " · part N"
 * suffix; the OVERVIEW slide keeps dashboard/tiles/keyInsight; continuations
 * carry the detail segments only.
 */

// Structural slice of SlideCanvas's SlideData - type-only import would create
// a service->component dependency; the paginator only touches these fields.
export interface PaginatableSlide {
    id: string;
    template: string;
    title: string;
    density?: 'base' | 'dense';
    sources?: string[];
    themeCluster?: { themes: any[]; patternSignal?: string };
    timeline?: { phases: any[] };
    serviceBlueprint?: any;
    journeyMap?: any;
    gapMatrix?: { gaps: any[]; scaleMax?: number; insight?: string };
    matrix?: { columns: string[]; columnDefs?: string[]; rows: any[]; scaleMax?: number; scaleLabels?: string[]; insight?: string; subjectRow?: string };
    prdFeature?: { features: any[] };
    systemsInventory?: { systems: any[]; insight?: string };
    caseStudy?: any;
    recommendation?: any;
    [k: string]: any;
}

/** Per-template hard ceilings (dense tier). Beyond these, decompose. */
const CEILINGS: Record<string, number> = {
    'journey-map': 6,        // stages per slide
    'service-blueprint': 5,  // stages per slide
    'theme-cluster': 4,      // themes per slide
    'timeline': 6,           // phases per slide
    'gap-matrix': 10,        // gaps per slide
    'competitive-matrix': 10,// rows per slide
    'systems-inventory': 14, // systems per slide
    'prd-feature-deep': 2,   // fully-detailed features per slide
    'prd-feature': 6,        // shallow features per slide
    'case-study-evidence': 4,// evidence quotes on the deep-dive before continuation
    'recommendation': 6,     // supporting actions per slide
};

/** Segment size for continuation slides (slightly under ceiling for air). */
const SEGMENTS: Record<string, number> = {
    'journey-map': 5,
    'service-blueprint': 4,
    'theme-cluster': 4,
    'timeline': 5,
    'gap-matrix': 8,
    'competitive-matrix': 8,
    'systems-inventory': 12,
    'prd-feature-deep': 2,
    'prd-feature': 5,
    'recommendation': 4,
};

let _pageSeq = 0;
const childId = (parent: string) => `${parent}_p${++_pageSeq}_${Math.random().toString(36).slice(2, 6)}`;

const partTitle = (title: string, n: number, total: number) =>
    total > 1 && n > 1 ? `${title} · part ${n} of ${total}` : title;

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/** A PRD feature is "deep" when it carries a real story plus criteria depth. */
function prdIsDeep(f: any): boolean {
    return !!(f && f.userStory && Array.isArray(f.acceptanceCriteria) && f.acceptanceCriteria.length >= 3)
        || !!(f && (f.technicalDetails || f.problemSolved && f.userStory));
}

export function paginateSlide(slide: PaginatableSlide): PaginatableSlide[] {
    try {
        const t = (slide.template || '').toLowerCase();

        // --- journey-map: chunk stages; lanes.cells + painPoints align to stages ---
        if (t === 'journey-map' && slide.journeyMap && Array.isArray(slide.journeyMap.stages)
            && slide.journeyMap.stages.length > CEILINGS['journey-map']) {
            const jm = slide.journeyMap;
            const groups = chunk(jm.stages, SEGMENTS['journey-map']);
            return groups.map((stages, gi) => {
                const lo = gi * SEGMENTS['journey-map'];
                const hi = lo + stages.length;
                const lanes = (jm.lanes || []).map((l: any) => ({ ...l, cells: (l.cells || []).slice(lo, hi) }));
                const painPoints = Array.isArray(jm.painPoints) ? jm.painPoints.slice(lo, hi) : undefined;
                return {
                    ...slide,
                    id: gi === 0 ? slide.id : childId(slide.id),
                    title: partTitle(slide.title, gi + 1, groups.length),
                    // OVERVIEW (first page) keeps dashboard + tiles + keyInsight;
                    // continuations carry the matrix detail only.
                    journeyMap: {
                        ...jm, stages, lanes, painPoints,
                        personas: gi === 0 ? jm.personas : undefined,
                        overallPainPoints: gi === 0 ? jm.overallPainPoints : undefined,
                        opportunities: gi === 0 ? jm.opportunities : undefined,
                        kpiTiles: gi === 0 ? jm.kpiTiles : undefined,
                        keyInsight: gi === 0 ? jm.keyInsight : undefined,
                    },
                };
            });
        }

        // --- service-blueprint: chunk stages; keyInsight stays on page 1 ---
        if (t === 'service-blueprint' && slide.serviceBlueprint && Array.isArray(slide.serviceBlueprint.stages)
            && slide.serviceBlueprint.stages.length > CEILINGS['service-blueprint']) {
            const sb = slide.serviceBlueprint;
            const groups = chunk(sb.stages, SEGMENTS['service-blueprint']);
            return groups.map((stages, gi) => ({
                ...slide,
                id: gi === 0 ? slide.id : childId(slide.id),
                title: partTitle(slide.title, gi + 1, groups.length),
                serviceBlueprint: { ...sb, stages, keyInsight: gi === 0 ? sb.keyInsight : undefined },
            }));
        }

        // --- theme-cluster: chunk themes; patternSignal stays on page 1 ---
        if (t === 'theme-cluster' && slide.themeCluster && Array.isArray(slide.themeCluster.themes)
            && slide.themeCluster.themes.length > CEILINGS['theme-cluster']) {
            const tc = slide.themeCluster;
            const groups = chunk(tc.themes, SEGMENTS['theme-cluster']);
            return groups.map((themes, gi) => ({
                ...slide,
                id: gi === 0 ? slide.id : childId(slide.id),
                title: partTitle(slide.title, gi + 1, groups.length),
                themeCluster: { ...tc, themes, patternSignal: gi === 0 ? tc.patternSignal : undefined },
            }));
        }

        // --- timeline: chunk phases ---
        if (t === 'timeline' && slide.timeline && Array.isArray(slide.timeline.phases)
            && slide.timeline.phases.length > CEILINGS['timeline']) {
            const groups = chunk(slide.timeline.phases, SEGMENTS['timeline']);
            return groups.map((phases, gi) => ({
                ...slide,
                id: gi === 0 ? slide.id : childId(slide.id),
                title: partTitle(slide.title, gi + 1, groups.length),
                timeline: { ...slide.timeline, phases },
            }));
        }

        // --- gap-matrix / competitive-matrix / systems-inventory: chunk rows ---
        if (t === 'gap-matrix' && slide.gapMatrix && Array.isArray(slide.gapMatrix.gaps)
            && slide.gapMatrix.gaps.length > CEILINGS['gap-matrix']) {
            const groups = chunk(slide.gapMatrix.gaps, SEGMENTS['gap-matrix']);
            return groups.map((gaps, gi) => ({
                ...slide,
                id: gi === 0 ? slide.id : childId(slide.id),
                title: partTitle(slide.title, gi + 1, groups.length),
                gapMatrix: { ...slide.gapMatrix, gaps, insight: gi === 0 ? slide.gapMatrix!.insight : undefined },
            }));
        }
        if (t === 'competitive-matrix' && slide.matrix && Array.isArray(slide.matrix.rows)
            && slide.matrix.rows.length > CEILINGS['competitive-matrix']) {
            const m = slide.matrix;
            // The subject row repeats on every page so each comparison stands alone.
            const subject = m.subjectRow ? m.rows.find((r: any) => r.name === m.subjectRow) : undefined;
            const others = subject ? m.rows.filter((r: any) => r !== subject) : m.rows;
            const seg = SEGMENTS['competitive-matrix'] - (subject ? 1 : 0);
            const groups = chunk(others, seg);
            return groups.map((rows, gi) => ({
                ...slide,
                id: gi === 0 ? slide.id : childId(slide.id),
                title: partTitle(slide.title, gi + 1, groups.length),
                matrix: { ...m, rows: subject ? [subject, ...rows] : rows, insight: gi === 0 ? m.insight : undefined },
            }));
        }
        if (t === 'systems-inventory' && slide.systemsInventory && Array.isArray(slide.systemsInventory.systems)
            && slide.systemsInventory.systems.length > CEILINGS['systems-inventory']) {
            const groups = chunk(slide.systemsInventory.systems, SEGMENTS['systems-inventory']);
            return groups.map((systems, gi) => ({
                ...slide,
                id: gi === 0 ? slide.id : childId(slide.id),
                title: partTitle(slide.title, gi + 1, groups.length),
                systemsInventory: { ...slide.systemsInventory, systems, insight: gi === 0 ? slide.systemsInventory!.insight : undefined },
            }));
        }

        // --- prd-feature: deep features cap at 2/slide, shallow at 6 ---
        if (t === 'prd-feature' && slide.prdFeature && Array.isArray(slide.prdFeature.features)) {
            const feats = slide.prdFeature.features;
            const deep = feats.some(prdIsDeep);
            const ceiling = deep ? CEILINGS['prd-feature-deep'] : CEILINGS['prd-feature'];
            if (feats.length > ceiling) {
                const groups = chunk(feats, deep ? SEGMENTS['prd-feature-deep'] : SEGMENTS['prd-feature']);
                return groups.map((features, gi) => ({
                    ...slide,
                    id: gi === 0 ? slide.id : childId(slide.id),
                    title: partTitle(slide.title, gi + 1, groups.length),
                    prdFeature: { features },
                }));
            }
        }

        // --- case-study: overflow evidence moves to an evidence-stack continuation ---
        if (t === 'case-study' && slide.caseStudy && Array.isArray(slide.caseStudy.evidence)
            && slide.caseStudy.evidence.length > CEILINGS['case-study-evidence']) {
            const c = slide.caseStudy;
            const head = c.evidence.slice(0, 3);
            const rest = c.evidence.slice(3);
            return [
                { ...slide, caseStudy: { ...c, evidence: head } },
                {
                    ...slide,
                    id: childId(slide.id),
                    title: `${slide.title} · evidence continued`,
                    caseStudy: {
                        subject: c.subject, subjectMeta: c.subjectMeta,
                        variant: 'evidence-stack', evidence: rest,
                        takeaway: c.takeaway || c.lesson || c.implication,
                    },
                },
            ];
        }

        // --- recommendation: too many actions splits into sibling rec slides ---
        if (t === 'recommendation' && slide.recommendation && Array.isArray(slide.recommendation.supportingActions)
            && slide.recommendation.supportingActions.length > CEILINGS['recommendation']) {
            const r = slide.recommendation;
            const groups = chunk(r.supportingActions, SEGMENTS['recommendation']);
            return groups.map((supportingActions, gi) => ({
                ...slide,
                id: gi === 0 ? slide.id : childId(slide.id),
                title: partTitle(slide.title, gi + 1, groups.length),
                recommendation: {
                    ...r, supportingActions,
                    // Impact + evidence + implication ride the FIRST slide only.
                    impactGrid: gi === 0 ? r.impactGrid : undefined,
                    impactMetric: gi === 0 ? r.impactMetric : undefined,
                    evidence: gi === 0 ? r.evidence : undefined,
                    implication: gi === 0 ? r.implication : undefined,
                },
            }));
        }

        return [slide];
    } catch (e) {
        // Pagination must never break parsing - fall back to the original slide.
        console.warn('[slidePaginator] pagination failed (slide kept whole):', (e as any)?.message || e);
        return [slide];
    }
}

/** Map + flatten helper for parse sites. */
export function paginateSlides(slides: PaginatableSlide[]): PaginatableSlide[] {
    const out: PaginatableSlide[] = [];
    for (const s of slides) out.push(...paginateSlide(s));
    if (out.length !== slides.length) {
        console.info(`[slidePaginator] decomposed ${slides.length} slide(s) into ${out.length} (ceilings honored, no evidence dropped)`);
    }
    return out;
}
