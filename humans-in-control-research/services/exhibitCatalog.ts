/**
 * DF-V3 - THE EXHIBIT CATALOG (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * deer-flow's `skills/public/chart-visualization` ships 26 chart types, each with
 * its own reference file declaring when to use it, the data shape it requires, and
 * what to do when the data does not fit. That is why its chart selection is
 * reliable: selection is a lookup, not an intuition.
 *
 * HiC had the opposite split. `slideComposer.ts::ARCHETYPE_SPECS` declares the
 * GEOMETRY of every archetype (where the boxes go) and `deckQualityGate` declares
 * a minimum FILL for fourteen of them, but nothing model-facing said WHEN to reach
 * for a quadrant instead of a table, or what to do when the evidence yields two
 * items and the archetype needs four. The model picked a layout, the gate then
 * failed the payload, and the repair pass had to guess the intent backwards.
 *
 * This file is the missing middle. It is:
 *  1. the single authority for exhibit fit (`deckQualityGate` derives its rules
 *     from here, so a threshold cannot drift between the gate and the guidance);
 *  2. a model-facing selection guide (`buildExhibitCatalogBlock`) injectable into
 *     DECK MODE;
 *  3. a DOWNGRADE PATH per exhibit, which is the part that makes the 40% visual
 *     quota in the visual-uplift plan reachable without inventing data. When the
 *     evidence cannot fill a quadrant, the answer is a named smaller exhibit, not
 *     a padded one and not a wall of prose.
 *
 * The downgrade ladder is the load-bearing idea: every entry names a target that
 * requires STRICTLY LESS data than itself, so following the chain always
 * terminates. `exhibitCatalog.test.ts` proves that.
 */

export type ExhibitFamily = 'comparison' | 'ranking' | 'composition' | 'process' | 'position' | 'quantity' | 'narrative';

export interface ExhibitSpec {
    /** Archetype id as it appears in a `template=` fence. */
    id: string;
    family: ExhibitFamily;
    /** When a consultant reaches for this exhibit. One sentence, model-facing. */
    useWhen: string;
    /** The payload field that carries the exhibit's data. */
    field: string;
    /** Below this count the exhibit renders but says nothing. */
    min: number;
    /** Above this count the exhibit is unreadable at 1920x1080. */
    max?: number;
    /** Why the floor exists. Reused verbatim as the gate's finding text. */
    why: string;
    /** What the reader sees when the data does not fit. */
    failureMode: string;
    /**
     * Where the content goes when the floor cannot be met honestly. Must require
     * strictly less data than this entry, so a single hop always resolves.
     * `null` terminates the ladder: nothing needs less than this.
     */
    downgradeTo: string | null;
    /**
     * Set only on the narrative floor. `slides:block-quote` is a fill contract
     * ("a quote slide needs its quote"), not a fit rule, and enforcing it as one
     * would fail every legitimately short narrative slide. This flag exists
     * because the first version keyed the exclusion off `downgradeTo === null`,
     * which then silently dropped `problem-diptych` from the gate the moment its
     * ladder was corrected.
     */
    excludeFromGate?: true;
}

/**
 * The catalog. Fit thresholds and `why` strings are the ones `deckQualityGate`
 * already shipped, so moving the authority here changes no verdict; the useWhen,
 * failureMode and downgradeTo fields are new.
 */
export const EXHIBIT_CATALOG: Record<string, ExhibitSpec> = {
    'slides:ranked-bars': {
        id: 'slides:ranked-bars', family: 'ranking',
        useWhen: 'one measure compared across three or more named subjects, where the ORDER is the point',
        field: 'bars', min: 3, max: 8,
        why: 'a ranking needs at least three entries to show a rank',
        failureMode: 'two bars read as a comparison, not a ranking, and the reader cannot tell whether the rest were omitted or do not exist',
        downgradeTo: 'slides:comparison-panels',
    },
    'slides:quadrant': {
        id: 'slides:quadrant', family: 'position',
        useWhen: 'subjects positioned against TWO independent axes, where the clustering is the finding',
        field: 'items', min: 3, max: 12,
        why: 'a 2x2 with fewer than three plotted subjects shows no positioning',
        failureMode: 'one or two dots on a 2x2 asserts a landscape the evidence does not describe',
        downgradeTo: 'slides:comparison-panels',
    },
    'slides:evidence-table': {
        id: 'slides:evidence-table', family: 'comparison',
        useWhen: 'several subjects compared across the same named dimensions, each cell citable',
        field: 'rows', min: 3, max: 7,
        why: 'a comparison table with fewer than three rows is a sentence in a grid',
        failureMode: 'a two-row table spends a full slide on what one sentence carries',
        downgradeTo: 'slides:block-quote',
    },
    'slides:stat-row': {
        id: 'slides:stat-row', family: 'quantity',
        useWhen: 'three cited figures that frame the problem, each from a different source',
        field: 'stats', min: 3, max: 3,
        why: 'the archetype lays out three stat columns',
        failureMode: 'a half-empty stat row looks like a rendering failure',
        downgradeTo: 'slides:means-matters',
    },
    'slides:means-matters': {
        id: 'slides:means-matters', family: 'quantity',
        useWhen: 'one or two figures that carry the whole argument, with the interpretation beside them',
        field: 'stats', min: 2, max: 2,
        why: 'the hero-numeral layout needs at least two figures to compare',
        failureMode: 'a single hero numeral with no counterpart reads as decoration',
        downgradeTo: 'slides:block-quote',
    },
    'slides:flow-arc': {
        id: 'slides:flow-arc', family: 'process',
        useWhen: 'a sequence where each step is a precondition for the next',
        field: 'steps', min: 3, max: 7,
        why: 'a process arc needs at least three steps to be a process',
        failureMode: 'two boxes and an arrow is a cause-and-effect claim wearing a process diagram',
        downgradeTo: 'slides:comparison-panels',
    },
    'slides:numbered-themes': {
        id: 'slides:numbered-themes', family: 'narrative',
        useWhen: 'exactly four peer findings, each with a title and a short body',
        field: 'items', min: 4, max: 4,
        why: 'the archetype profiles exactly four items',
        failureMode: 'a three-item grid leaves a visible hole in the fourth cell',
        downgradeTo: 'slides:role-needs',
    },
    'slides:org-model': {
        id: 'slides:org-model', family: 'composition',
        useWhen: 'a structure whose three parts must be seen together to make sense',
        field: 'columns', min: 3, max: 4,
        why: 'a three-part model needs its three parts',
        failureMode: 'a two-column model implies a missing third the reader will look for',
        downgradeTo: 'slides:comparison-panels',
    },
    'slides:milestone-timeline': {
        id: 'slides:milestone-timeline', family: 'process',
        useWhen: 'dated or sequenced events where the SPACING between them carries meaning',
        field: 'milestones', min: 3, max: 8,
        why: 'a time axis with fewer than three milestones is a label',
        failureMode: 'two points on an axis cannot show pace, only order',
        // NOT flow-arc: that also needs three, so the hop would resolve nothing.
        // Two points in time ARE a before-and-after, which is what this target is.
        downgradeTo: 'slides:comparison-panels',
    },
    'slides:comparison-panels': {
        id: 'slides:comparison-panels', family: 'comparison',
        useWhen: 'exactly two subjects or two states set against each other',
        field: 'panels', min: 2, max: 2,
        why: 'a comparison needs two sides',
        failureMode: 'one populated panel beside an empty one reads as a bug',
        downgradeTo: 'slides:block-quote',
    },
    'slides:problem-diptych': {
        id: 'slides:problem-diptych', family: 'comparison',
        useWhen: 'a problem stated on one side and its consequence or counterpart on the other',
        field: 'left', min: 1,
        why: 'a diptych needs both halves populated',
        failureMode: 'an empty half turns a deliberate contrast into a layout error',
        // Nothing needs less than one item, so this is a second terminator. A
        // diptych with nothing in it is not an exhibit, which `resolveDowngrade`
        // reports as null rather than by pointing at another empty layout.
        downgradeTo: null,
    },
    'slides:role-needs': {
        id: 'slides:role-needs', family: 'narrative',
        useWhen: 'one actor and the three or more distinct needs the evidence attributes to them',
        field: 'needs', min: 3, max: 6,
        why: 'a needs list with fewer than three entries does not characterize a role',
        failureMode: 'two needs describe an anecdote, not a role',
        downgradeTo: 'slides:block-quote',
    },
    'slides:aggregate-roadmap': {
        id: 'slides:aggregate-roadmap', family: 'process',
        useWhen: 'sequenced phases of work with named entry conditions',
        field: 'phases', min: 3, max: 5,
        why: 'a roadmap needs at least three phases',
        failureMode: 'two phases is a before-and-after, and calling it a roadmap overstates the plan',
        // The failure mode names the answer: two phases ARE a before-and-after.
        // flow-arc would be the wrong target because it needs three phases too.
        downgradeTo: 'slides:comparison-panels',
    },
    'slides:role-roadmap': {
        id: 'slides:role-roadmap', family: 'process',
        useWhen: 'phases of work as one named role experiences them',
        field: 'phases', min: 3, max: 5,
        why: 'a roadmap needs at least three phases',
        failureMode: 'two phases is a before-and-after, and calling it a roadmap overstates the plan',
        // The failure mode names the answer: two phases ARE a before-and-after.
        // flow-arc would be the wrong target because it needs three phases too.
        downgradeTo: 'slides:comparison-panels',
    },
    /**
     * The ladder's floor. Every downgrade path terminates here or at a spec whose
     * own path terminates here, which is what keeps the chain finite.
     */
    'slides:block-quote': {
        id: 'slides:block-quote', family: 'narrative',
        useWhen: 'one verbatim quotation carries the point better than any arrangement of it',
        field: 'quote', min: 1,
        why: 'a quote slide needs the quote',
        failureMode: 'an empty quote slide is a blank slide',
        downgradeTo: null,
        excludeFromGate: true,
    },
};

/**
 * The shape `deckQualityGate` consumes. Derived, so the gate and the guidance
 * cannot disagree about a threshold.
 */
export function exhibitFitRules(): Record<string, { field: string; min: number; why: string }> {
    const out: Record<string, { field: string; min: number; why: string }> = {};
    for (const [id, spec] of Object.entries(EXHIBIT_CATALOG)) {
        if (spec.excludeFromGate) continue;
        out[id] = { field: spec.field, min: spec.min, why: spec.why };
    }
    return out;
}

export interface FitVerdict {
    template: string;
    known: boolean;
    /** null when the payload does not carry the field at all. */
    count: number | null;
    fits: boolean;
    /** Set when the count exceeds the readable maximum. */
    overfull: boolean;
    spec: ExhibitSpec | null;
    /** The archetype to use instead, when this one does not fit. */
    downgradeTo: string | null;
    detail: string;
}

/** Count entries in a payload field, tolerating the shapes archetypes use. */
export function countExhibitField(payload: any, field: string): number | null {
    if (!payload || typeof payload !== 'object') return null;
    const v = (payload as any)[field];
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === 'object') {
        if (Array.isArray((v as any).items)) return (v as any).items.length;
        return Object.keys(v).length ? 1 : 0;
    }
    if (typeof v === 'string') return v.trim() ? 1 : 0;
    return null;
}

export function checkExhibitFit(template: string, payload: any): FitVerdict {
    const id = String(template || '').toLowerCase();
    const spec = EXHIBIT_CATALOG[id] || null;
    if (!spec) {
        return { template: id, known: false, count: null, fits: true, overfull: false, spec: null, downgradeTo: null, detail: 'no fit rule for this archetype' };
    }
    const count = countExhibitField(payload, spec.field);
    if (count === null) {
        return { template: id, known: true, count: null, fits: true, overfull: false, spec, downgradeTo: null, detail: `${spec.field} absent; the payload contract owns that` };
    }
    if (count < spec.min) {
        return {
            template: id, known: true, count, fits: false, overfull: false, spec,
            downgradeTo: spec.downgradeTo,
            detail: `${id} carries ${count} ${spec.field} (needs ${spec.min}): ${spec.why}`,
        };
    }
    if (spec.max && count > spec.max) {
        return {
            template: id, known: true, count, fits: false, overfull: true, spec,
            downgradeTo: null,
            detail: `${id} carries ${count} ${spec.field} (readable maximum ${spec.max}): take the top ${spec.max} rather than shrinking the type`,
        };
    }
    return { template: id, known: true, count, fits: true, overfull: false, spec, downgradeTo: null, detail: 'fits' };
}

/**
 * Walk the downgrade ladder until an exhibit's floor is satisfiable by `available`
 * items. Returns null when even the floor exhibit cannot be filled, which is the
 * honest answer: the content is not an exhibit.
 */
export function resolveDowngrade(template: string, available: number): string | null {
    let cursor: string | null = String(template || '').toLowerCase();
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        const spec: ExhibitSpec | undefined = EXHIBIT_CATALOG[cursor];
        if (!spec) return null;
        if (available >= spec.min) return cursor;
        cursor = spec.downgradeTo;
    }
    return null;
}

/**
 * Model-facing selection guide, injected into DECK MODE. Deliberately terse: a
 * catalog nobody reads is worse than no catalog, because it costs tokens on every
 * call. One line per exhibit, grouped by what the consultant is trying to show.
 */
export function buildExhibitCatalogBlock(): string {
    const byFamily = new Map<ExhibitFamily, ExhibitSpec[]>();
    for (const spec of Object.values(EXHIBIT_CATALOG)) {
        const list = byFamily.get(spec.family) || [];
        list.push(spec);
        byFamily.set(spec.family, list);
    }
    const lines = [
        '=== EXHIBIT SELECTION (pick by what the evidence CAN support, never by variety alone) ===',
        'Each entry: archetype - use when - required data - what to use instead when the data falls short.',
    ];
    for (const [family, specs] of byFamily) {
        lines.push(`\n${family.toUpperCase()}`);
        for (const s of specs) {
            const range = s.max && s.max !== s.min ? `${s.min}-${s.max}` : String(s.min);
            lines.push(`- ${s.id}: ${s.useWhen}. Needs ${range} ${s.field}. If fewer: ${s.downgradeTo || 'this content is prose, not an exhibit'}.`);
        }
    }
    lines.push(
        '',
        'RULE: choose the archetype from the shape of the evidence you actually hold. Never pad an',
        'array to reach a floor, and never invent a row, a phase, or a figure to fill a layout. If the',
        'evidence supports fewer items than the archetype needs, use the named alternative.',
    );
    return lines.join('\n');
}

/**
 * DF-V4 support: prose that REFERS to an exhibit the reader cannot see. deer-flow
 * renders every planned exhibit before authoring narrative for exactly this
 * reason. HiC generates payload and prose in one model call, so the enforceable
 * equivalent is to catch the dangling reference after the fact.
 *
 * Deliberately narrow: only phrases that point AT a visual artifact, and only when
 * the slide's own exhibit is missing or underfilled. A slide that merely uses the
 * word "table" in a sentence is not a cross-reference.
 */
const NOUNS = 'chart|graph|table|matrix|timeline|roadmap|quadrant|diagram|exhibit|figure';
const EXHIBIT_REFERENCE_RE = new RegExp(
    `\\b(?:the\\s+)?(${NOUNS})\\s+(?:above|below|opposite|at\\s+(?:the\\s+)?(?:left|right)|on\\s+(?:the\\s+)?(?:left|right)|here|shown)`,
    'i',
);
const EXHIBIT_VERB_RE = new RegExp(
    `\\b(${NOUNS})\\s+(?:above|below)?\\s*(?:shows|show|illustrates|plots|maps|lists|compares|indicates)\\b`,
    'i',
);

/**
 * Which archetypes actually render each referenced noun. A `slides:block-quote`
 * saying "the timeline below" is dangling even though the quote slide is
 * perfectly well filled: the slide renders no timeline. The first version of this
 * check only looked at whether the slide's OWN exhibit fitted, so it missed the
 * commonest case, a prose slide pointing at a visual that lives nowhere.
 */
const NOUN_RENDERERS: Record<string, string[]> = {
    chart: ['slides:ranked-bars', 'slides:stat-row', 'slides:means-matters', 'slides:infographic-exhibit'],
    graph: ['slides:ranked-bars', 'slides:infographic-exhibit'],
    table: ['slides:evidence-table', 'slides:systems-inventory'],
    matrix: ['slides:quadrant', 'slides:evidence-table', 'slides:gap-matrix'],
    timeline: ['slides:milestone-timeline'],
    roadmap: ['slides:aggregate-roadmap', 'slides:role-roadmap'],
    quadrant: ['slides:quadrant'],
    diagram: ['slides:org-model', 'slides:flow-arc', 'slides:infographic-exhibit', 'slides:architecture-map'],
    // Generic words: any exhibit archetype can legitimately be called one.
    exhibit: [],
    figure: [],
};

export interface ReferenceCheck {
    dangling: boolean;
    noun: string | null;
}

/**
 * Does this text point at a visual that `template` does not render? `template`
 * omitted means "any reference is dangling", which is the caller's judgment when
 * the slide's own exhibit failed to fit.
 */
export function checkExhibitReference(text: string, template?: string): ReferenceCheck {
    const t = String(text || '');
    const m = EXHIBIT_REFERENCE_RE.exec(t) || EXHIBIT_VERB_RE.exec(t);
    if (!m) return { dangling: false, noun: null };
    const noun = (m[1] || '').toLowerCase();
    if (!template) return { dangling: true, noun };
    const renderers = NOUN_RENDERERS[noun];
    // A generic noun on a slide that renders SOME exhibit is fair.
    if (!renderers || renderers.length === 0) {
        return { dangling: !EXHIBIT_CATALOG[String(template).toLowerCase()], noun };
    }
    return { dangling: !renderers.includes(String(template).toLowerCase()), noun };
}

export function findsDanglingExhibitReference(text: string, template?: string): boolean {
    return checkExhibitReference(text, template).dangling;
}

// ---------------------------------------------------------------------------
// DF-V4: the gate. Exhibits are settled before the prose stage judges wording.
// ---------------------------------------------------------------------------

export interface ExhibitFinding {
    kind: 'misfit' | 'overfull' | 'dangling_reference';
    slideId: string;
    template: string;
    detail: string;
    remedy: string;
}

export interface ExhibitReport {
    findings: ExhibitFinding[];
    exhibitsChecked: number;
    fitted: number;
    pass: boolean;
}

/**
 * Which text fields can carry a cross-reference. Deliberately narrow: a
 * `sourceLine` naming "Table 3 above" from a cited article is the SOURCE's wording,
 * not the deck's, and flagging it would punish an accurate citation.
 */
const PROSE_KEYS = /^(?:narrative|body|content|summary|takeaway|insight|so_?what|speakerNotes|subtitle|lede|caption)$/i;

function proseStrings(payload: any, depth = 0): string[] {
    if (!payload || typeof payload !== 'object' || depth > 4) return [];
    const out: string[] = [];
    for (const [k, v] of Object.entries(payload)) {
        if (k.startsWith('_')) continue;
        if (typeof v === 'string') {
            if (PROSE_KEYS.test(k)) out.push(v);
        } else if (Array.isArray(v)) {
            for (const item of v) {
                if (typeof item === 'string') { if (PROSE_KEYS.test(k)) out.push(item); }
                else out.push(...proseStrings(item, depth + 1));
            }
        } else if (v && typeof v === 'object') {
            out.push(...proseStrings(v, depth + 1));
        }
    }
    return out;
}

/**
 * A slide is an EXHIBIT slide when its archetype is in the catalog with a real fit
 * rule. Only those can carry a dangling reference to their own exhibit; a prose
 * archetype pointing at "the table below" is pointing at a different slide, which
 * is a deck-level concern the reader can resolve by turning the page.
 */
export function evaluateExhibits(slides: any[]): ExhibitReport {
    const findings: ExhibitFinding[] = [];
    const list = Array.isArray(slides) ? slides : [];
    let exhibitsChecked = 0;
    let fitted = 0;

    for (const s of list) {
        const template = String(s?.template || '').toLowerCase();
        const slideId = String(s?.id || '');
        const verdict = checkExhibitFit(template, s?.composerPayload);
        if (!verdict.known || verdict.count === null) {
            // Not an exhibit, or its payload contract owns the absent field.
        } else {
            exhibitsChecked++;
            if (verdict.fits) {
                fitted++;
            } else if (verdict.overfull) {
                findings.push({
                    kind: 'overfull', slideId, template, detail: verdict.detail,
                    remedy: `Take the top ${verdict.spec?.max} ${verdict.spec?.field} by the measure that matters and say so in the title.`,
                });
            } else {
                const target = resolveDowngrade(template, verdict.count);
                findings.push({
                    kind: 'misfit', slideId, template, detail: verdict.detail,
                    remedy: target && target !== template
                        ? `Re-map this slide to ${target}, which carries ${verdict.count} item(s) honestly. Do not pad ${verdict.spec?.field}.`
                        : `The evidence supports ${verdict.count} item(s), which is not an exhibit. Write this as prose or cut the slide.`,
                });
            }
        }

        // A cross-reference to a visual this slide does not render is prose
        // describing something the reader cannot see. That is the exact failure
        // deer-flow's exhibits-before-prose rule prevents. When the slide's own
        // exhibit misfitted, ANY reference dangles, because the thing it points at
        // is about to be re-mapped or cut.
        const misfitHere = findings.some(f => f.slideId === slideId && (f.kind === 'misfit' || f.kind === 'overfull'));
        for (const text of proseStrings(s?.composerPayload)) {
            const ref = checkExhibitReference(text, misfitHere ? undefined : template);
            if (ref.dangling) {
                findings.push({
                    kind: 'dangling_reference', slideId, template,
                    detail: `prose points at a ${ref.noun} this slide does not render: "${text.slice(0, 90)}"`,
                    remedy: 'State the finding directly. Never refer the reader to a chart, table, or figure that is not on the slide.',
                });
                break;
            }
        }
    }

    return { findings, exhibitsChecked, fitted, pass: findings.length === 0 };
}

export function buildExhibitInstruction(report: ExhibitReport): string {
    if (report.pass) return '';
    const lines = ['EXHIBIT REVISION. Every item below is an exhibit that does not carry its data, or prose that points at an exhibit the reader cannot see:'];
    for (const f of report.findings.slice(0, 8)) {
        lines.push(`- ${f.template}: ${f.detail}. ${f.remedy}`);
    }
    lines.push('Never pad an array, invent a row, or add a phase to satisfy a layout.');
    return lines.join('\n');
}
