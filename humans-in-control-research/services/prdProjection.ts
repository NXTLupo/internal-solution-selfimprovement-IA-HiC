/**
 * prdProjection: PrdAir -> the two render surfaces (Stage 3.3 of
 * plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md; vision phases 8 and 9).
 *
 * The PRD is a DOCUMENT first (owner decision 2, 2026-10-01). `projectPrdAirToHtml` renders the
 * two-tier document the HTML artifact chain gates, repairs and cites, on the same path `#report`
 * takes. The stakeholder deck is a PROJECTION of the same record: `projectPrdAirToDeck` emits eight
 * to ten `slides:` composer payloads (cover, thesis, problem with quotes, users and jobs, goals and
 * non-goals, success signals, requirements ledger, risks and alternatives, rollout and decision,
 * trace), four of them on the PRD archetypes registered in slideComposer (`prd-story`, `prd-ledger`,
 * `prd-signals`, `prd-trace`) so DECK MODE never falls through to the generic renderer again.
 *
 * Both surfaces are deterministic functions of the record. Colors and fonts resolve from
 * `brandTokens` (the hydrated Figma feed), never from literals in this file. Numbers appear only
 * inside verbatim quotes and inside typed `requirement_target` carriers (`isRequirementTarget`), which
 * the composer payloads carry as objects so every scanner can exempt them by kind.
 */

import {
    type PrdAir, type PrdRequirement, type PrdQuote, type PrdSource, type RequirementTarget,
    deriveTraceMatrix, quotesForRequirement, usedSources, formatRequirementTarget, acceptanceTestSentence,
    isRequirementTarget, PRD_SECTION_ORDER, ledgerCoverage,
} from './prdAir';
import { brandTokens } from './slideToStageHtml';
import { getBrand, type BrandId } from '../components/slideTemplates/brands';

export const PRD_DECK_ARCHETYPES = ['prd-story', 'prd-ledger', 'prd-signals', 'prd-trace'] as const;
export type PrdDeckArchetype = typeof PRD_DECK_ARCHETYPES[number];

export interface PrdProjectedSlide {
    id: string;
    template: string;          // `slides:<archetype>`
    brand: BrandId;
    title: string;
    sources?: string[];
    composerPayload: any;
}

/** A typed carrier for a target inside a composer payload: the scanner exempts it by `kind`. */
export interface TargetCarrier extends RequirementTarget {
    label: string;
}
function carrier(t?: RequirementTarget): TargetCarrier | undefined {
    if (!t || String(t.value).trim() === '') return undefined;
    return { ...t, kind: 'requirement_target', label: formatRequirementTarget(t) };
}

const TIER_ORDER: Record<string, number> = { must: 0, should: 1, could: 2, wont: 3 };
/** Requirements projected into the HTML brief; the workbook carries all of them. */
const BRIEF_REQUIREMENT_CAP = 150;
const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map(x => [x.id, x] as const));

function sourceLineFor(sources: PrdSource[]): string {
    const parts = sources.slice(0, 4).map(s => `${s.name}${s.pointer ? ` [${s.pointer}]` : ''}`);
    return parts.length ? `Source${parts.length > 1 ? 's' : ''}: ${parts.join('; ')}` : '';
}

function quoteCard(q: PrdQuote, sources: Map<string, PrdSource>) {
    const s = sources.get(q.sourceId);
    // The card foot carries attribution + date only; the slide's sourceLine carries every pointer
    // (a long pointer in a one-line foot clause-truncates to a dangling separator).
    return {
        heading: s?.name || 'Named source',
        body: `"${q.text}"`,
        foot: [q.attribution, s?.date].filter(Boolean).join(' · '),
    };
}

function tracesLabel(r: PrdRequirement, air: PrdAir): string {
    const pains = byId(air.graph.pains), personas = byId(air.graph.personas), gaps = byId(air.graph.competitiveGaps);
    if (r.claimType === 'HYPOTHESIS') return `NON-OBVIOUS BET · ${r.bet?.test || 'test before build'}`;
    const parts: string[] = [];
    for (const id of r.painIds) { const p = pains.get(id); if (p) parts.push(p.text); }
    // A gap trace names the competitor when one is known (the gap text is in the matrix and the document).
    for (const id of r.competitiveGapIds) { const g = gaps.get(id); if (g) parts.push(g.competitor ? `${g.competitor} gap` : g.text); }
    const pe = r.personaIds.map(id => personas.get(id)?.name).filter(Boolean);
    if (pe.length) parts.push(pe.join(', '));
    return parts.join(' · ');
}

export function projectPrdAirToDeck(air: PrdAir, brand: BrandId = air.brand || 'nxt'): PrdProjectedSlide[] {
    const s = air.sections;
    const g = air.graph;
    const sources = byId(g.sources);
    const quotes = byId(g.quotes);
    const personas = byId(g.personas);
    const used = usedSources(air);
    const sourceLine = sourceLineFor(used);
    const sourceNames = used.map(x => x.name);
    const slides: PrdProjectedSlide[] = [];
    const mk = (id: string, archetype: string, title: string, payload: any): PrdProjectedSlide =>
        ({ id: `${air.artifactId}-${id}`, template: `slides:${archetype}`, brand, title, sources: sourceNames, composerPayload: payload });

    // 1. cover
    slides.push(mk('cover', 'cover', air.title, {
        wordmark: getBrand(brand).BRAND_LOGO_WORDMARK,   // NXT HUMANS / NORTHEASTERN / DECIEM from the token mirror
        title: air.title,
        subtitle: s.thesis.decisionRequested || s.thesis.whatItDoes,
    }));
    // 2. thesis
    slides.push(mk('thesis', 'thesis-interstitial', s.thesis.statement, { kicker: 'THESIS', thesis: s.thesis.statement }));
    // 3. problem with quotes + why now band
    const problemQuotes = s.problem.quoteIds.map(id => quotes.get(id)).filter((q): q is PrdQuote => !!q).slice(0, 3);
    slides.push(mk('problem', 'prd-story', s.problem.story.insight || s.thesis.pain, {
        kicker: 'PROBLEM WITH EVIDENCE',
        title: s.problem.story.insight || s.thesis.pain,
        storyLabel: 'THE STORY',
        story: [s.problem.story.user, s.problem.story.need].filter(Boolean).join(' '),
        cards: problemQuotes.map(q => quoteCard(q, sources)),
        band: { label: 'WHY NOW', statement: s.whyNow.statement },
        sourceLine,
    }));
    // 4. users and jobs (role-needs: one role's challenges + persona needs)
    const primary = s.usersAndJobs.primaryPersonaIds.map(id => personas.get(id)).find(Boolean) || g.personas.find(p => p.primary) || g.personas[0];
    if (primary) {
        const primaryPains = g.pains.filter(p => p.personaIds.includes(primary.id)).slice(0, 3);
        const fallbackPains = primaryPains.length ? primaryPains : g.pains.slice(0, 3);
        const jobs = s.usersAndJobs.jobStories.filter(j => j.personaId === primary.id);
        const jobList = (jobs.length ? jobs : s.usersAndJobs.jobStories).slice(0, 3);
        slides.push(mk('users', 'role-needs', primary.stageOfStruggle ? `${primary.name} struggles most at ${primary.stageOfStruggle}` : `${primary.name} carries the jobs this product must serve`, {
            eyebrow: 'USERS AND JOBS',
            title: primary.stageOfStruggle ? `${primary.name} struggles most at ${primary.stageOfStruggle}` : `${primary.name} carries the jobs this product must serve`,
            role: primary.name,
            challenges: fallbackPains.map((p, i) => {
                const q = p.quoteIds.map(id => quotes.get(id)).find(Boolean);
                return { numeral: String(i + 1).padStart(2, '0'), heading: p.text, body: q ? `"${q.text}"` : (p.journeyStage ? `Stage: ${p.journeyStage}` : '') };
            }),
            persona: {
                needsLabel: 'JOB STORIES',
                name: primary.role ? `${primary.name} · ${primary.role}` : primary.name,
                needs: jobList.map(j => ({ kind: `WHEN ${j.when}`, body: `I want to ${j.iWantTo}, so I can ${j.soICan}.` })),
            },
        }));
    }
    // 5. goals, non-goals, appetite (band = the typed appetite target)
    const appetite = carrier(s.goalsNonGoalsAppetite.appetite);
    slides.push(mk('goals', 'prd-story', 'The appetite fixes the time budget and the scope bends to fit it', {
        kicker: 'GOALS, NON-GOALS, APPETITE',
        title: 'The appetite fixes the time budget and the scope bends to fit it',
        storyLabel: 'GOALS',
        story: s.goalsNonGoalsAppetite.goals.map(gl => gl.text).join(' '),
        cards: s.goalsNonGoalsAppetite.nonGoals.slice(0, 3).map(n => ({ heading: `Not this release: ${n.text}`, body: n.reason, foot: 'NON-GOAL' })),
        band: appetite
            ? { ...appetite, label: 'APPETITE', statement: `${appetite.label}${appetite.rationale ? `. ${appetite.rationale}` : ''}` }
            : { label: 'APPETITE', statement: 'Fixed time, variable scope: the team reshapes scope before it extends the timeline.' },
        sourceLine,
    }));
    // 6. success signals
    const signals = s.successSignals.signalIds.map(id => g.signals.find(m => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m).slice(0, 5);
    if (signals.length) {
        slides.push(mk('signals', 'prd-signals', 'Every success signal carries an instrument, a baseline status and a guardrail', {
            kicker: 'SUCCESS SIGNALS',
            title: 'Every success signal carries an instrument, a baseline status and a guardrail',
            columns: ['SIGNAL', 'INSTRUMENT', 'POPULATION', 'DIRECTION', 'BASELINE', 'TYPE', 'GUARDRAIL'],
            rows: signals.map(m => ({
                signal: m.signal,
                instrument: m.instrument,
                population: [m.population.personaId ? personas.get(m.population.personaId)?.name : '', m.population.stage].filter(Boolean).join(' · '),
                direction: m.direction === 'up' ? 'Up' : m.direction === 'down' ? 'Down' : 'Hold',
                baseline: m.baselineStatus,
                type: m.type,
                guardrail: `${m.guardrail.statement}${m.guardrail.rollbackAuthority ? ` · rollback: ${m.guardrail.rollbackAuthority}` : ''}`,
            })),
            takeaway: { label: 'TARGETS', statement: 'Targets are set at the named post-baseline event; the first draft ships instruments and guardrails, not figures.' },
            sourceLine,
        }));
    }
    // 7. requirements ledger
    // Five rows per ledger slide: a complete Given/When/Then needs three caption lines per row.
    const reqs = [...g.requirements].sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9)).slice(0, 5);
    slides.push(mk('ledger', 'prd-ledger', 'Each requirement traces to a pain, a persona and a declarative test', {
        kicker: 'REQUIREMENTS LEDGER',
        title: 'Each requirement traces to a pain, a persona and a declarative test',
        columns: ['ID', 'TIER', 'REQUIREMENT', 'TRACES', 'ACCEPTANCE TEST'],
        rows: reqs.map(r => {
            const at = g.acceptanceTests.find(t => t.requirementId === r.id);
            return {
                id: r.id,
                tier: r.claimType === 'HYPOTHESIS' ? 'BET' : r.tier.toUpperCase(),
                text: r.text,
                traces: tracesLabel(r, air),
                test: at ? acceptanceTestSentence({ ...at, target: undefined }) : '',
                target: carrier(at?.target || r.target),
            };
        }),
        takeaway: { label: 'MUST-HAVE BAR', statement: 'A must-have maps to the thesis, carries two independent origins and a primary persona, and the product cannot ship without it.' },
        sourceLine,
    }));
    // 8. risks and alternatives
    if (s.risks.register.length) {
        const top = s.risks.register[0];
        slides.push(mk('risks', 'prd-story', `${top.failureMode} is the failure to watch first`, {
            kicker: 'RISKS AND ALTERNATIVES',
            title: `${top.failureMode} is the failure to watch first`,
            storyLabel: 'ALTERNATIVES CONSIDERED',
            story: s.risks.alternatives.slice(0, 3).map(a => `Rejected ${a.option}: ${a.rejectedBecause} (${a.tradeoff}).`).join(' '),
            cards: s.risks.register.slice(0, 3).map(r => ({ heading: r.failureMode, body: `Early signal: ${r.earlySignal}. Mitigation: ${r.mitigation}.`, foot: `${r.owner} · ${r.likelihood} likelihood · ${r.severity} severity` })),
            band: { label: 'PRE-MORTEM', statement: top.mitigation },
            sourceLine,
        }));
    }
    // 9. rollout and decision
    if (s.delivery.rollout.length) {
        slides.push(mk('rollout', 'flow-arc', s.thesis.decisionRequested || 'The rollout stops itself when a kill criterion trips', {
            kicker: 'ROLLOUT AND DECISION',
            title: s.thesis.decisionRequested || 'The rollout stops itself when a kill criterion trips',
            steps: s.delivery.rollout.slice(0, 6).map(p => ({ title: p.phase, description: `Gate: ${p.gate}. Kill: ${p.killCriteria}.${p.rollbackAuthority ? ` Rollback: ${p.rollbackAuthority}.` : ''}` })),
            outcome: `Decision requested: ${s.thesis.decisionRequested || s.thesis.statement}${s.delivery.accountableApprover ? ` Accountable approver: ${s.delivery.accountableApprover}.` : ''}`,
            sourceLine,
        }));
    }
    // 10. trace matrix
    const rows = deriveTraceMatrix(air).slice(0, 7);
    slides.push(mk('trace', 'prd-trace', 'Every requirement resolves to a quote, a named source, a test and a signal', {
        kicker: 'TRACEABILITY',
        title: 'Every requirement resolves to a quote, a named source, a test and a signal',
        columns: ['R', 'TIER', 'PAIN', 'PERSONA', 'THEME', 'QUOTE', 'SOURCE', 'TEST', 'SIGNAL'],
        rows: rows.map(r => ({
            id: r.requirementId,
            tier: r.claimType === 'HYPOTHESIS' ? 'BET' : r.tier.toUpperCase(),
            pain: r.pains[0] || (r.claimType === 'HYPOTHESIS' ? 'bet, no pain root' : ''),
            persona: r.personas.join(', '),
            theme: r.themes.join(', '),
            quote: r.quoteExcerpts[0] || '',
            source: r.sources.join('; '),
            test: r.acceptanceTests.join(', '),
            signal: r.signals.join(', '),
        })),
        takeaway: { label: 'TRACE', statement: 'Every requirement resolves to a pain or gap, a verbatim quote and a named source; every test and signal points back to a requirement.' },
        sourceLine,
    }));
    return slides;
}

// ---- the two-tier HTML document -------------------------------------------------------------------

function esc(s: any): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u2014/g, ', ');
}
/**
 * A typed design-decision number (spec 3.5). It renders in its own non-claim element, never inside a
 * sentence: the claim ledger reads p / li / td / h* text, and a target folded into a requirement heading
 * or a test bullet turned "24 hours maximum" into an unsourced statistic about the world. The element
 * carries `data-requirement-target` so any scanner can exempt it by kind.
 */
function targetHtml(t?: RequirementTarget): string {
    if (!t || String(t.value).trim() === '') return '';
    return `<div class="prd-target-row" data-requirement-target="1" data-metric="${esc(t.metric)}"><span class="prd-target">${esc(formatRequirementTarget(t))}</span>${t.rationale ? `<span class="prd-target-why">${esc(t.rationale)}${targetCite(t)}</span>` : ''}</div>`;
}
/** A target rationale that rests on evidence carries that evidence's pointer; the chain renders it as a citation. */
function targetCite(t?: RequirementTarget): string {
    const p = String(t?.source_pointer || '').trim();
    return /^[\w.\\-]+\/[\w./\\-]+\.md#c\d+$/i.test(p) ? ` [${p}]` : '';
}

// ---- pointers: the binding contract with the HTML artifact chain ----------------------------------
//
// `runHtmlArtifactChain` (services/htmlArtifactChain.ts) reads claim rows out of p / li / td / th / dd /
// dt / h* / blockquote / figcaption / summary blocks and binds a row to evidence ONLY through manifest
// pointers written in square brackets INSIDE that same block (`[articles/x/ab12.md#c3]`), or through a
// pointer-only block that directly follows it (claimLedgerGate.extractClaimRows). The 2026-10-01 live
// run put every pointer in a <cite> outside the quote's <p> (cite is not a claim block), so 372 rows
// bound to nothing: 0 pointers resolved, UNSOURCED_FACT 131 before repair, 82 sentences narrowed by the
// repair model. Every block below that states something drawn from evidence carries the pointers of
// the verified quotes it was drawn from, in that bracket form, and nothing else: a block is never
// handed a pointer whose quote it does not rest on (the Scope-Match Rule).
//
// LEAF BLOCKS. The gate now reads nested blocks (leaf blocks are rows), but every claim below is still the
// only block in its element so one claim is one row; wrappers are <figure>, <div> or <article>.
//
// CLAIM KINDS. A PRD is mostly decisions. Requirements, acceptance tests, guardrails, flows, screen states,
// business rules, rollout steps, goals and the quality and delivery statements are SPECIFICATION: they need
// no source pointer and the repair model must never "narrow" them (the live run rewrote 82 sentences, most
// of them acceptance tests). They carry `data-claim-kind="spec"`; graph references (persona and theme names,
// section labels) carry `data-claim-kind="ref"`. Evidence-bearing prose (the problem, why now, the thesis
// pain line, persona struggle, trace rows, signal baselines, failure modes, non-goal and alternative
// reasons) is never marked and stays fully gated.
const SPEC = ' data-claim-kind="spec"';
const REF = ' data-claim-kind="ref"';

/** A manifest chunk pointer the chain can resolve; quote ids that never reached a page are not pointers. */
const CHUNK_POINTER_RE = /^[\w.\\-]+\/[\w./\\-]+\.md#c\d+$/i;
export function pointersOf(qs: Array<PrdQuote | undefined>): string[] {
    const out: string[] = [];
    for (const q of qs) {
        const p = String(q?.pointer || '').trim();
        if (p && CHUNK_POINTER_RE.test(p) && !out.includes(p)) out.push(p);
    }
    return out;
}
/** ` [p1, p2]` (the chain's bracket group), or '' when no quote carries a pointer. */
function cites(qs: Array<PrdQuote | undefined>, max = 6): string {
    const ps = pointersOf(qs).slice(0, max);
    return ps.length ? ` [${ps.join(', ')}]` : '';
}
function quoteHtml(q: PrdQuote, sources: Map<string, PrdSource>): string {
    const s = sources.get(q.sourceId);
    // The pointer sits INSIDE the flat <blockquote>: the chain verifies the quotation verbatim against that chunk
    // and renders the pointer as a linked, dated citation naming the source. The <cite> keeps the speaker,
    // and names the source in plain text only when no pointer exists to render it.
    const hasPtr = pointersOf([q]).length > 0;
    const cite = (hasPtr ? [q.attribution] : [q.attribution, s?.name, s?.date]).filter(Boolean).join(', ');
    return `<figure class="prd-quote"><blockquote>"${esc(q.text)}"${cites([q])}</blockquote>${cite ? `<figcaption>${esc(cite)}</figcaption>` : ''}</figure>`;
}
/** A clause joined after a colon: no closing period on the head, a lower-case lead article on the tail. */
function head(t: string): string { return String(t || '').replace(/[.;:,\s]+$/, ''); }
function tail(t: string): string { return String(t || '').trim().replace(/^(The|A|An|It|This|They|Before|By|After|At|In|On|During|Within)\b/, m => m.toLowerCase()); }
function list(items: string[], cls = '', mark = ''): string {
    const live = items.filter(x => x && x.trim());
    return live.length ? `<ul${cls ? ` class="${cls}"` : ''}${mark}>${live.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
}
function section(n: number, label: string, inner: string, tier: 1 | 2, mark = ''): string {
    // The section number is chrome, not a claim: it renders from a data attribute through CSS so the
    // heading text the claim ledger reads ("Requirements with acceptance tests and trace ids") carries no
    // digit (the live run blocked "09 Requirements ..." as an unsourced statistic). The label is a ref.
    return `<section class="prd-section prd-tier-${tier}" id="prd-s${n}"${mark}><h2 class="prd-h2"${REF}><span class="prd-num" data-num="${String(n).padStart(2, '0')}" aria-hidden="true"></span>${esc(label)}</h2>${inner}</section>`;
}

/**
 * The reader-facing source label per cited pointer, declared to the HTML artifact chain (B8). The chain
 * otherwise falls back to a label derived from the page path ("Hic Theme Synthesis", "1qxkv3v"); the
 * compiler already holds the evidence item's registered, readable name for every quote it admitted.
 */
function sourceLabelsScript(air: PrdAir): string {
    const sources = byId(air.graph.sources);
    const labels: Record<string, { n: string; d?: string }> = {};
    for (const q of air.graph.quotes) {
        const p = pointersOf([q])[0];
        const s = sources.get(q.sourceId);
        if (!p || !s?.name || labels[p]) continue;
        // A client document's or a synthesis page's date is its ingest date, not a publication date: omitted.
        const dated = !!s.date && !/^(?:Client document|Engagement research synthesis)\b/.test(s.name);
        labels[p] = dated ? { n: s.name, d: s.date } : { n: s.name };
    }
    if (!Object.keys(labels).length) return '';
    return `<script type="application/json" id="hic-source-labels">${JSON.stringify(labels).replace(/</g, '\\u003c')}</script>`;
}

/** The objective as typed is a prompt ("Generate a comprehensive PRD for ..."); a reader document never echoes one. */
function isPromptEcho(objective: string): boolean {
    return /^\s*(?:please\s+)?(?:generate|create|write|produce|build|draft|make|prepare|give me|deliver)\b/i.test(String(objective || ''));
}

// 2026-10-01 - brandTokens (the stage twin's hydrated feed) carries the NXT and NU sets. Every other
// brand id (DECIEM) resolves from the brand token mirror here, with the same keys the stylesheet
// reads, so `#prd #deciem` never styles as NXT. Title transform rides along (DECIEM headlines are
// uppercase; NXT and NU keep 'none').
// labelFont / dataFont: NXT and NU keep their mono face for labels and the body face for table cells;
// DECIEM (template audit) sets Poppins Bold uppercase on every label and FONT_MONO (Nunito) on tables,
// data and meta. FONT_LABEL is read defensively and falls back to the display face.
type PrdDocTokens = ReturnType<typeof brandTokens> & { titleTransform: string; labelFont: string; labelWeight: string; dataFont: string };
function prdBrandTokens(brand: BrandId): PrdDocTokens {
    const base = brandTokens(brand);
    const B = getBrand(brand);
    const titleTransform = String(B.TITLE_TRANSFORM || 'none');
    if (brand === 'nxt' || brand === 'nu') return { ...base, titleTransform, labelFont: base.monoFont, labelWeight: 'inherit', dataFont: base.bodyFont };
    const hx = (v: unknown, f: string) => (typeof v === 'string' && v) ? '#' + v.replace(/^#/, '') : f;
    const ff = (v: unknown, f: string) => (typeof v === 'string' && v) ? `'${v}', sans-serif` : f;
    return {
        ...base,
        rail: hx(B.RAIL, base.rail),
        paper: hx(B.WHITE, base.paper),
        ink: hx(B.INK, base.ink),
        accent: hx(B.CHARTREUSE, base.accent),
        accent2: hx(B.CYAN, base.accent2),
        muted: hx(B.MUTED, base.muted),
        hair: hx(B.HAIRLINE, base.hair),
        band: hx(B.BAND, base.band),
        bandText: hx(B.BAND_TEXT, base.bandText),
        callout: hx(B.PANEL, base.callout),
        kicker: hx(B.KICKER, base.kicker),
        accentWarn: hx(B.ACCENT_WARN, base.accentWarn),
        accentCool: hx(B.ACCENT_COOL, base.accentCool),
        washWarn: hx(B.WASH_WARN, base.washWarn),
        washCool: hx(B.WASH_COOL, base.washCool),
        grey: hx(B.GREY, base.grey),
        bodyText: hx(B.BODY, base.bodyText),
        secondaryText: hx(B.SECONDARY, base.secondaryText),
        displayFont: ff(B.FONT_DISPLAY, base.displayFont),
        titleFont: ff(B.FONT_TITLE, base.titleFont),
        bodyFont: ff(B.FONT_BODY, base.bodyFont),
        monoFont: (typeof B.FONT_MONO === 'string' && B.FONT_MONO) ? `'${B.FONT_MONO}', monospace` : base.monoFont,
        titleWeight: Number(B.TITLE_WEIGHT) || base.titleWeight,
        titleTransform,
        labelFont: ff((B as Record<string, unknown>).FONT_LABEL || B.FONT_DISPLAY, base.monoFont),
        labelWeight: '700',
        dataFont: ff(B.FONT_MONO, base.bodyFont),
    };
}

/**
 * VISUAL SLOTS FOR THE PRD (2026-11-09).
 *
 * Every other HTML artifact gets pictures because the MODEL places `[[visual: ...]]` directives and
 * the chain renders them. The PRD cannot: its HTML is PROJECTED from the AIR by this file, so there
 * is no model-written prose to carry a directive, and a regenerated #prd came back with 0 images
 * while every other kind came back with 3. Measured across the stored library, #prd was the largest
 * block of image-free artifacts (19 files).
 *
 * The slots are built from the PRD's OWN fields, so each picture depicts this document's subject
 * rather than a stock idea: the primary persona at the moment of the pain, and the job story's
 * concrete action. A field that is missing yields no slot, so a thin AIR simply gets fewer
 * pictures and never a placeholder.
 */
function visualSlot(concept: string): string {
    let c = String(concept || '').replace(/\s+/g, ' ').trim().replace(/[\[\]]/g, '');
    // Trim on a word boundary: the first version cut a caption mid-word.
    if (c.length > 200) c = c.slice(0, 200).replace(/\s+\S*$/, '');
    c = c.replace(/[,;:\s]+$/, '');
    // The renderer needs a real description; anything shorter is not a picture.
    return c.length >= 24 ? `\n[[visual: ${c}]]\n` : '';
}

/**
 * SHAPE GATE. A field is used only when it LOOKS like what the template needs; see this module's
 * header note. `role` must read as a name for a person, not a predicate, and `stageOfStruggle` as
 * a short phrase naming a moment, not a sentence about one.
 */
function isNounPhrase(text: string): boolean {
    const t = String(text || '').trim();
    if (!t || t.length > 48) return false;
    if (t.split(/\s+/).length > 6) return false;
    if (/[.!?;:]/.test(t)) return false;
    if (/\b(?:I|my|me|we|our|you|your)\b/i.test(t)) return false;
    if (/^(?:when|while|after|before|if|because|so|and|but|that|which)\b/i.test(t)) return false;
    // A leading finite verb means it is a predicate, not a name for a person.
    if (/^(?:is|are|was|were|has|have|had|does|do|did|needs?|wants?|builds?|keeps?|makes?|uses?|runs?|works?|struggles?|cannot|can)\b/i.test(t)) return false;
    return true;
}

/** A short phrase naming a moment, not a sentence about one. */
function isShortPhrase(text: string): boolean {
    const t = String(text || '').trim();
    if (!t || t.length > 60) return false;
    if (t.split(/\s+/).length > 8) return false;
    if (/[.!?;]/.test(t)) return false;
    if (/\b(?:I|my|me|we|our)\b/i.test(t)) return false;
    if (/^(?:when|while|after|before|if|because)\b/i.test(t)) return false;
    return true;
}

/** The persona's own words for who they are, preferring the role over the label. */
function sceneSubject(role: string, name: string, fallback: string): string {
    const r = String(role || '').trim().replace(/[.\s]+$/, '');
    // Article agreement: a live caption read "A owner-operator". A vowel-initial role takes "An".
    if (isNounPhrase(r)) {
        if (/^(a|an|the)\b/i.test(r)) return r;
        const head = `${r.charAt(0).toLowerCase()}${r.slice(1)}`;
        return `${/^[aeiou]/i.test(head) ? 'An' : 'A'} ${head}`;
    }
    const n = String(name || '').trim();
    if (isNounPhrase(n)) return n;
    const f = String(fallback || '').trim();
    return isNounPhrase(f) ? f : '';
}

/** One scene from the persona's own stage of struggle, used only when that field is a phrase. */
function problemVisual(s: PrdAir['sections'], subject: string, stageOfStruggle: string): string {
    const stage = String(stageOfStruggle || '').trim().replace(/[.\s]+$/, '');
    if (!subject || !isShortPhrase(stage)) return '';
    return visualSlot(`${subject} working alone at the point of ${stage}`);
}

/**
 * One scene from the first job story. "about to" takes the bare infinitive `iWantTo` correctly.
 *
 * A job story is written in the FIRST person ("I want to see what changed on my farm"), and a
 * caption describes someone from outside, so a live caption read "An owner-operator about to see
 * what changed on my farm". The pronouns are moved to the third person.
 */
function thirdPerson(text: string): string {
    return String(text || '')
        .replace(/\bmy\b/gi, 'their')
        .replace(/\bmine\b/gi, 'theirs')
        .replace(/\bmyself\b/gi, 'themselves')
        .replace(/\bI\b/g, 'they')
        .replace(/\bme\b/gi, 'them');
}

function jobVisual(s: PrdAir['sections'], subject: string): string {
    const j = (s.usersAndJobs.jobStories || [])[0];
    if (!j || !subject) return '';
    const act = thirdPerson(String(j.iWantTo || '')).trim().replace(/[.\s]+$/, '');
    if (!act) return '';
    return visualSlot(`${subject} about to ${act}`);
}

export function projectPrdAirToHtml(air: PrdAir, opts: { brand?: BrandId; generatedAtIso?: string } = {}): string {
    const brand: BrandId = opts.brand || air.brand || 'nxt';
    const T = prdBrandTokens(brand);
    const s = air.sections;
    const g = air.graph;
    const sources = byId(g.sources);
    const quotes = byId(g.quotes);
    const personas = byId(g.personas);
    const themes = byId(g.themes);
    const pains = byId(g.pains);
    // The brief projects only quotations it can cite with a resolvable wiki pointer (2026-10-03: research-corpus headlines
    // with a URL but no wiki page produced 145 UNVERIFIED_QUOTE rows; the claim chain verifies against cited chunks only).
    // Those quotes stay in the record and the workbook, attributed to their source and URL.
    const citable = (q: PrdQuote | undefined): q is PrdQuote => !!q && pointersOf([q]).length > 0;
    const qOf = (ids: string[]) => ids.map(id => quotes.get(id)).filter(citable);
    const reqQuotesOf = (r: PrdRequirement) => quotesForRequirement(r, air).filter(citable);
    const qs = (ids: string[]) => qOf(ids).map(q => quoteHtml(q, sources)).join('');
    const painQuotes = (ids: string[]) => qOf(ids.flatMap(id => pains.get(id)?.quoteIds || []));
    const gapQuotes = (ids: string[]) => qOf(ids.flatMap(id => g.competitiveGaps.find(c => c.id === id)?.quoteIds || []));
    const reqById = byId(g.requirements);
    const ledgerById = byId(g.ledger || []);
    const ledgerQuotes = (ids: string[]) => qOf(ids.map(id => ledgerById.get(id)?.quoteId || '').filter(Boolean));
    const labelOf = PRD_SECTION_ORDER;
    // Scope and feedback coverage (2026-10-02): every item the client articulated, with the requirements that document it.
    const cov = ledgerCoverage(air);
    const coverageLine = cov.items
        ? `<p class="prd-meta prd-coverage"${REF}>${cov.scopeItems ? `Scope and feedback coverage: ${cov.stated} stated feature${cov.stated === 1 ? '' : 's'} and ${cov.feedback} feedback item${cov.feedback === 1 ? '' : 's'} from the client documents, ${cov.scopeCovered === cov.scopeItems ? 'all covered by requirements' : `${cov.scopeCovered} of ${cov.scopeItems} covered by requirements`}. ` : ''}${cov.themeIds ? `Theme coverage: ${cov.themeIds} board theme${cov.themeIds === 1 ? '' : 's'} in ${cov.themeGroups} group${cov.themeGroups === 1 ? '' : 's'}, ${cov.themeIdsCovered === cov.themeIds ? 'all covered by requirements' : `${cov.themeIdsCovered} covered by requirements`}.` : ''}</p>`
        : '';
    const ledgerHtml = cov.items ? `<section class="prd-section prd-tier-2" id="prd-ledger"><h2 class="prd-h2"${REF}><span class="prd-num">SF</span>Scope and feedback ledger</h2><table class="prd-table"><thead><tr><th>Item</th><th>Type</th><th>Area</th><th>Client words</th><th>Requirements</th></tr></thead><tbody>${(g.ledger || []).slice(0, BRIEF_REQUIREMENT_CAP).map(li => {
        const q = li.quoteId ? quotes.get(li.quoteId) : undefined;
        const row = cov.rows.find(x => x.ledgerId === li.id);
        return `<tr data-ledger-id="${esc(li.id)}"><td${REF}><span class="prd-id">${esc(li.id)}</span>${esc(li.item)}</td><td${REF}>${li.type === 'feedback' ? `feedback${li.disposition ? `, ${esc(li.disposition)}` : ''}` : esc(li.type)}</td><td${REF}>${esc((g.areas || []).find(a => a.id === li.featureArea)?.label || 'Cross-cutting')}</td><td>${q ? `"${esc(q.text)}"${cites([q])}` : esc(li.documentTitle)}</td><td${REF}>${esc((row?.requirementIds || []).join(', '))}</td></tr>`;
    }).join('')}</tbody></table></section>` : '';
    const problemQ = qOf(s.problem.quoteIds);
    const whyNowQ = qOf(s.whyNow.quoteIds);

    // The primary persona's name feeds the visual slots below, so a picture names a real actor.
    const _p0 = personas.get((s.usersAndJobs.primaryPersonaIds || [])[0] || '');
    const _sceneSubject = sceneSubject(String(_p0?.role || ''), String(_p0?.name || ''), String(s.thesis.user || ''));
    const _sceneStage = String(_p0?.stageOfStruggle || '');
    const tier1 = [
        section(1, labelOf[0].label, `<p class="prd-thesis">${esc(s.thesis.statement)}</p><dl class="prd-dl"><dt>User</dt><dd${SPEC}>${esc(s.thesis.user)}</dd><dt>Pain</dt><dd>${esc(s.thesis.pain)}${cites(problemQ)}</dd><dt>Decision requested</dt><dd${SPEC}>${esc(s.thesis.decisionRequested)}</dd><dt>What it does</dt><dd${SPEC}>${esc(s.thesis.whatItDoes)}</dd>${s.thesis.governingThemeId ? `<dt>Governing theme</dt><dd${REF}>${esc(themes.get(s.thesis.governingThemeId)?.name || s.thesis.governingThemeId)}</dd>` : ''}</dl>`, 1),
        section(2, labelOf[1].label, `<p class="prd-prose">${esc([s.problem.story.user, s.problem.story.need, s.problem.story.insight].filter(Boolean).join(' '))}${cites(problemQ)}</p>${qs(s.problem.quoteIds)}${problemVisual(s, _sceneSubject, _sceneStage)}`, 1),
        section(3, labelOf[2].label, `<p class="prd-prose">${esc(s.whyNow.statement)}${cites(whyNowQ)}</p>${s.whyNow.change ? `<p class="prd-prose"><strong>The change:</strong> ${esc(s.whyNow.change)}${cites(whyNowQ)}</p>` : ''}${qs(s.whyNow.quoteIds)}`, 1),
        section(4, labelOf[3].label, `${s.usersAndJobs.primaryPersonaIds.map(id => { const p = personas.get(id); return p ? `<p class="prd-prose"><strong>${esc(p.name)}</strong>${p.role ? `, ${esc(p.role)}` : ''}${p.stageOfStruggle ? `: struggles most at ${esc(String(p.stageOfStruggle).replace(/[.\s]+$/, ''))}` : ''}.${cites(painQuotes(g.pains.filter(x => x.personaIds.includes(p.id)).map(x => x.id)))}</p>` : ''; }).join('')}${s.usersAndJobs.jobStories.map(j => `<div class="prd-job"><span class="prd-label">${esc(personas.get(j.personaId)?.name || 'User')}</span><p class="prd-prose">When ${esc(j.when)}, I want to ${esc(j.iWantTo)}, so I can ${esc(j.soICan)}.${cites(qOf(j.quoteIds))}</p>${qs(j.quoteIds)}</div>`).join('')}${jobVisual(s, _sceneSubject)}`, 1),
        section(5, labelOf[4].label, `<h3 class="prd-h3">Goals</h3>${list(s.goalsNonGoalsAppetite.goals.map(gl => gl.text), '', SPEC)}<h3 class="prd-h3">Non-goals</h3>${list(s.goalsNonGoalsAppetite.nonGoals.map(n => `${head(n.text)}: ${tail(n.reason)}`))}<h3 class="prd-h3">Appetite</h3>${targetHtml({ ...s.goalsNonGoalsAppetite.appetite, rationale: undefined })}${s.goalsNonGoalsAppetite.appetite.rationale ? `<p class="prd-prose">${esc(s.goalsNonGoalsAppetite.appetite.rationale)}${targetCite(s.goalsNonGoalsAppetite.appetite)}</p>` : ''}`, 1),
        section(6, labelOf[5].label, `<table class="prd-table"><thead><tr><th>Signal</th><th>Instrument</th><th>Population</th><th>Direction</th><th>Baseline status</th><th>Type</th><th>Guardrail</th></tr></thead><tbody>${g.signals.map(m => `<tr><td${SPEC}>${esc(m.signal)}${cites(m.requirementIds.flatMap(rid => { const r = reqById.get(rid); return r ? quotesForRequirement(r, air) : []; }), 4)}</td><td${SPEC}>${esc(m.instrument)}</td><td${REF}>${esc([m.population.personaId ? personas.get(m.population.personaId)?.name : '', m.population.stage].filter(Boolean).join(' · '))}</td><td>${esc(m.direction)}</td><td>${esc(m.baselineStatus)}</td><td>${esc(m.type)}</td><td${SPEC}>${esc(m.guardrail.statement)}${m.guardrail.rollbackAuthority ? `<br><span class="prd-meta">Rollback: ${esc(m.guardrail.rollbackAuthority)}</span>` : ''}</td></tr>`).join('')}</tbody></table>`, 1),
    ].join('');

    // 2026-10-02 live #prd: projecting 2,700 requirements made a 9MB brief (34,000 claim rows; the browser window
    // closed twice). The workbook is the primary output and carries every row; the brief projects the strongest
    // BRIEF_REQUIREMENT_CAP requirements (must first, record order within a tier) and names where the rest live.
    const briefReqs = g.requirements.length > BRIEF_REQUIREMENT_CAP
        ? g.requirements.map((r, i) => ({ r, i })).sort((a, b) => ((TIER_ORDER[a.r.tier] ?? 9) - (TIER_ORDER[b.r.tier] ?? 9)) || (a.i - b.i)).slice(0, BRIEF_REQUIREMENT_CAP).map(x => x.r)
        : g.requirements;
    const briefIds = new Set(briefReqs.map(r => r.id));
    const restNote = briefReqs.length < g.requirements.length
        ? `<p class="prd-meta"${REF}>Full set: ${g.requirements.length} requirements with acceptance tests, every client item and theme traced, in the requirements workbook (.xlsx).</p>`
        : '';
    const reqHtml = restNote + briefReqs.map(r => {
        const tests = g.acceptanceTests.filter(t => t.requirementId === r.id);
        const reqQuotes = reqQuotesOf(r);
        // The trace is two rows. The ROOT row (pains and gaps) is drawn from the verified quotes and carries
        // their pointers; the REFERENCE row (personas and themes) names graph records and carries none, so
        // the chain never checks a persona or theme label against a quote it was not drawn from.
        const traceRoots = [
            (r.ledgerIds || []).map(id => ledgerById.get(id)).filter(Boolean).map(li => `${li!.type === 'stated' ? 'Stated' : 'Feedback'}: ${li!.item}`),
            r.painIds.map(id => pains.get(id)?.text).filter(Boolean).map(t => `P: ${t}`),
            r.competitiveGapIds.map(id => g.competitiveGaps.find(c => c.id === id)?.text).filter(Boolean).map(t => `CG: ${t}`),
        ].flat();
        const traceRefs = [
            r.personaIds.map(id => personas.get(id)?.name).filter(Boolean).map(t => `PE: ${t}`),
            r.themeIds.map(id => themes.get(id)?.name).filter(Boolean).map(t => `T: ${t}`),
        ].flat();
        const traceCites = cites([...ledgerQuotes(r.ledgerIds || []), ...painQuotes(r.painIds), ...gapQuotes(r.competitiveGapIds)]);
        const bet = r.claimType === 'HYPOTHESIS' && r.bet
            ? `<div class="prd-bet"${SPEC}><span class="prd-label">Non-obvious bet</span><p class="prd-prose">${esc(r.bet.statement)}</p><p class="prd-prose"><strong>Test:</strong> ${esc(r.bet.test)}</p><p class="prd-prose"><strong>The alternative wins when:</strong> ${esc(r.bet.conditionWhereAlternativeWins)}</p></div>`
            : '';
        const tightAt = (x: string) => esc(x.replace(/[.;,\s]+$/, ''));
        // Ids sit beside their claim block, not inside it: the ledger reads "R-10" in a heading as a statistic.
        return `<article class="prd-req prd-tier-${esc(r.tier)}" data-requirement-id="${esc(r.id)}"><div class="prd-req-head"><span class="prd-id">${esc(r.id)}</span><h3 class="prd-h3"${SPEC}>${esc(r.text)}</h3></div>${targetHtml(r.target)}<p class="prd-meta">${esc(r.kind)} · ${r.claimType === 'HYPOTHESIS' ? 'bet' : esc(r.tier)}${r.tierRationale ? ` · ${esc(r.tierRationale)}` : ''}</p>${bet}${tests.length ? `<div class="prd-tests"${SPEC}>${tests.map(t => `<div class="prd-at-item"><span class="prd-id">${esc(t.id)}</span><p class="prd-at">Given ${tightAt(t.given)}, when ${tightAt(t.when)}, then ${tightAt(t.then)}.</p>${targetHtml(t.target)}</div>`).join('')}</div>` : ''}${traceRoots.length ? `<p class="prd-meta prd-trace">Trace: ${esc(traceRoots.join(' · '))}${traceCites}</p>` : ''}${traceRefs.length ? `<p class="prd-meta prd-trace-refs"${REF}>Serves: ${esc(traceRefs.join(' · '))}</p>` : ''}${reqQuotes.slice(0, 2).map(q => quoteHtml(q, sources)).join('')}</article>`;
    }).join('');

    const matrix = deriveTraceMatrix(air).filter(row => briefIds.has(row.requirementId));
    const matrixHtml = `<table class="prd-table prd-matrix"><thead><tr><th>R</th><th>Tier</th><th>P</th><th>PE</th><th>T</th><th>Q</th><th>S</th><th>AT</th><th>M</th></tr></thead><tbody>${matrix.map(r => {
        const req = reqById.get(r.requirementId);
        const rq = req ? reqQuotesOf(req) : [];
        const rp = req ? cites([...painQuotes(req.painIds), ...gapQuotes(req.competitiveGapIds)]) : '';
        // The quote cell is one flat <td>: every excerpt, then the union of their pointers. The chain finds each
        // excerpt in the union of the cited chunks, so an excerpt whose pointer was lost upstream is reported
        // as unverified rather than borrowing another quote's source.
        // Excerpts are cut at a word boundary and marked with an ellipsis: an excerpt reads as one, and the
        // chain's verbatim check matches each segment in order.
        const excerpt = (q: PrdQuote) => q.text.length > 80 ? `${q.text.slice(0, 80).replace(/\s+\S*$/, '')}...` : q.text;
        // The S cell carries the pointers alone where every source has one: the chain renders each as the
        // linked, dated source name, so the plain name would print twice.
        const srcCell = rq.length && rq.every(q => pointersOf([q]).length) ? cites(rq).trim() : esc(r.sources.join('; '));
        return `<tr><td>${esc(r.requirementId)}</td><td>${r.claimType === 'HYPOTHESIS' ? 'bet' : esc(r.tier)}</td><td>${esc(r.pains.join('; '))}${rp}</td><td${REF}>${esc(r.personas.join(', '))}</td><td${REF}>${esc(r.themes.join(', '))}</td><td>${esc(rq.map(q => `"${excerpt(q)}"`).join(' '))}${cites(rq)}</td><td>${srcCell}</td><td>${esc(r.acceptanceTests.join(', '))}</td><td>${esc(r.signals.join(', '))}</td></tr>`;
    }).join('')}</tbody></table>`;

    const tier2 = [
        section(7, labelOf[6].label, s.hypotheses.assumptions.length ? `<table class="prd-table"><thead><tr><th>Assumption</th><th>Supporting quote</th><th>Quadrant</th><th>Test</th><th>Owner</th></tr></thead><tbody>${s.hypotheses.assumptions.map(a => `<tr><td${SPEC}>${esc(a.text)}${cites(qOf(a.supportingQuoteIds))}</td><td>${esc(qOf(a.supportingQuoteIds).map(q => `"${q.text}"`).join(' '))}${cites(qOf(a.supportingQuoteIds))}</td><td>${esc(a.quadrant)}</td><td${SPEC}>${esc(a.test)}</td><td${SPEC}>${esc(a.owner)}</td></tr>`).join('')}</tbody></table>` : '<p class="prd-prose">No assumption survives the quotes as unsupported; every requirement below traces to evidence.</p>', 2),
        section(8, labelOf[7].label, `${s.solutionFlows.flows.map(f => `<h3 class="prd-h3">${esc(f.name)}</h3><ol class="prd-steps">${f.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>`).join('')}${s.solutionFlows.screenStates.length ? `<h3 class="prd-h3">Required states per screen</h3><table class="prd-table"><thead><tr><th>Screen</th><th>States</th></tr></thead><tbody>${s.solutionFlows.screenStates.map(x => `<tr><td>${esc(x.screen)}</td><td>${esc(x.states.join(', '))}</td></tr>`).join('')}</tbody></table>` : ''}${s.solutionFlows.businessRules.length ? `<h3 class="prd-h3">Business rules</h3>${list(s.solutionFlows.businessRules)}` : ''}${s.solutionFlows.designLink ? `<p class="prd-meta">Design: <a href="${esc(s.solutionFlows.designLink)}" target="_blank" rel="noopener noreferrer">${esc(s.solutionFlows.designLink)}</a></p>` : ''}`, 2, SPEC),
        section(9, labelOf[8].label, reqHtml, 2),
        section(10, labelOf[9].label, `${s.quality.characteristics.length ? `<table class="prd-table"><thead><tr><th>Characteristic</th><th>Verifiable statement</th></tr></thead><tbody>${s.quality.characteristics.map(c => `<tr><td>${esc(c.characteristic)}</td><td>${esc(c.statement)}</td></tr>`).join('')}</tbody></table>${s.quality.characteristics.some(c => c.target) ? `<div class="prd-targets">${s.quality.characteristics.filter(c => c.target).map(c => targetHtml(c.target)).join('')}</div>` : ''}` : ''}<h3 class="prd-h3">Accessibility</h3><p class="prd-prose">${esc(s.quality.accessibility.level)}${s.quality.accessibility.exposedCriteria.length ? `; exposed criteria: ${esc(s.quality.accessibility.exposedCriteria.join(', '))}` : ''}.</p><h3 class="prd-h3">Privacy and compliance</h3>${s.quality.privacy.regime ? `<p class="prd-prose"><strong>Applicable regime:</strong> ${esc(s.quality.privacy.regime)}</p>` : ''}<p class="prd-prose"><strong>Data minimization:</strong> ${esc(s.quality.privacy.dataMinimization)}</p><p class="prd-prose"><strong>Privacy impact assessment:</strong> ${s.quality.privacy.dpiaTrigger.triggered ? 'required' : 'not required'}${s.quality.privacy.dpiaTrigger.reason ? `: ${esc(s.quality.privacy.dpiaTrigger.reason)}` : ''}.</p>`, 2, SPEC),
        section(11, labelOf[10].label, `${s.risks.register.length ? `<table class="prd-table"><thead><tr><th>Failure mode</th><th>Likelihood</th><th>Severity</th><th>Early signal</th><th>Owner</th><th>Mitigation</th></tr></thead><tbody>${s.risks.register.map(r => `<tr><td>${esc(r.failureMode)}</td><td>${esc(r.likelihood)}</td><td>${esc(r.severity)}</td><td${SPEC}>${esc(r.earlySignal)}</td><td${SPEC}>${esc(r.owner)}</td><td${SPEC}>${esc(r.mitigation)}</td></tr>`).join('')}</tbody></table>` : ''}${s.risks.alternatives.length ? `<h3 class="prd-h3">Alternatives considered</h3>${list(s.risks.alternatives.map(a => `${head(a.option)}: rejected because ${tail(head(a.rejectedBecause))}; trade-off ${tail(head(a.tradeoff))}`))}` : ''}`, 2),
        section(12, labelOf[11].label, `${s.delivery.releaseCriteria.length ? `<h3 class="prd-h3">Release criteria</h3>${list(s.delivery.releaseCriteria)}` : ''}${s.delivery.rollout.length ? `<h3 class="prd-h3">Phased rollout</h3><table class="prd-table"><thead><tr><th>Phase</th><th>Gate</th><th>Kill criteria</th><th>Rollback authority</th></tr></thead><tbody>${s.delivery.rollout.map(p => `<tr><td>${esc(p.phase)}</td><td>${esc(p.gate)}</td><td>${esc(p.killCriteria)}</td><td>${esc(p.rollbackAuthority)}</td></tr>`).join('')}</tbody></table>` : ''}${s.delivery.trackingPlan.length ? `<h3 class="prd-h3">Tracking plan</h3><table class="prd-table"><thead><tr><th>Event</th><th>Properties</th><th>Owner</th></tr></thead><tbody>${s.delivery.trackingPlan.map(t => `<tr><td>${esc(t.event)}</td><td>${esc(t.properties.join(', '))}</td><td>${esc(t.owner)}</td></tr>`).join('')}</tbody></table>` : ''}${s.delivery.dependencies.length ? `<h3 class="prd-h3">Dependencies</h3>${list(s.delivery.dependencies.map(d => `${d.name} (${d.kind}, ${d.owner})`))}` : ''}${s.delivery.openQuestions.length ? `<h3 class="prd-h3">Open questions</h3>${list(s.delivery.openQuestions.map(q => `${q.question} (${q.owner}, due ${tail(q.due)})`))}` : ''}<p class="prd-prose"><strong>Accountable approver:</strong> ${esc(s.delivery.accountableApprover)}</p>`, 2, SPEC),
    ].join('');

    const style = `<style id="prd-doc-style">
:root{--color-rail:${T.rail};--color-paper:${T.paper};--color-ink:${T.ink};--color-accent:${T.accent};--color-cool:${T.accentCool};--color-warn:${T.accentWarn};--color-body:${T.bodyText};--color-secondary:${T.secondaryText};--color-hair:${T.hair};--color-callout:${T.callout};--color-wash-cool:${T.washCool};--color-band:${T.band};--color-band-text:${T.bandText};--font-display:${T.displayFont};--font-title:${T.titleFont};--font-body:${T.bodyFont};--font-mono:${T.monoFont};--weight-title:${T.titleWeight};--title-transform:${T.titleTransform};--font-label:${T.labelFont};--weight-label:${T.labelWeight};--font-data:${T.dataFont}}
.prd-doc{font-family:var(--font-body);color:var(--color-body);background:var(--color-paper);max-width:1100px;margin:0 auto;padding:64px 48px;line-height:1.55}
.prd-kicker{font-family:var(--font-label);font-size:0.78rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--color-cool);font-weight:700}
.prd-h1{font-family:var(--font-title);font-weight:var(--weight-title);text-transform:var(--title-transform);font-size:2.2rem;line-height:1.1;color:var(--color-ink);margin:8px 0 12px}
.prd-objective{color:var(--color-secondary);margin:0 0 40px}
.prd-tier{margin:48px 0 16px;padding:14px 20px;background:var(--color-band);color:var(--color-band-text);font-family:var(--font-label);letter-spacing:0.12em;text-transform:uppercase;font-size:0.8rem;font-weight:700}
.prd-section{padding:28px 0;border-top:1px solid var(--color-hair)}
.prd-h2{font-family:var(--font-title);font-weight:var(--weight-title);text-transform:var(--title-transform);font-size:1.35rem;color:var(--color-ink);margin:0 0 14px;display:flex;gap:14px;align-items:baseline}
.prd-num{font-family:var(--font-label);font-size:0.85rem;color:var(--color-accent);font-weight:700}
.prd-num[data-num]::before{content:attr(data-num)}
.prd-h3{font-family:var(--font-body);font-weight:700;font-size:1.02rem;color:var(--color-ink);margin:18px 0 8px}
.prd-thesis{font-family:var(--font-title);font-weight:var(--weight-title);font-size:1.25rem;line-height:1.35;color:var(--color-ink);border-left:4px solid var(--color-accent);padding-left:16px}
.prd-prose{margin:0 0 10px}
.prd-dl{display:grid;grid-template-columns:180px 1fr;gap:6px 18px;margin:14px 0}
.prd-dl dt{font-family:var(--font-label);font-weight:var(--weight-label);font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-secondary)}
.prd-dl dd{margin:0}
.prd-quote{margin:12px 0;padding:10px 16px;background:var(--color-callout);border-left:3px solid var(--color-cool)}
.prd-quote blockquote{margin:0;font-style:italic;color:var(--color-ink)}
.prd-quote figcaption{display:block;margin-top:6px;font-style:normal;font-family:var(--font-mono);font-size:0.75rem;letter-spacing:0.06em;color:var(--color-secondary)}
.prd-table{width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:0.92rem}
.prd-table th{font-family:var(--font-label);font-weight:var(--weight-label);font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-secondary);text-align:left;padding:8px 10px;border-bottom:2px solid var(--color-ink)}
.prd-table td{font-family:var(--font-data);padding:8px 10px;border-bottom:1px solid var(--color-hair);vertical-align:top}
.prd-req{padding:16px 0 8px;border-top:1px solid var(--color-hair)}
.prd-req.prd-tier-must .prd-id{color:var(--color-warn)}
.prd-id{font-family:var(--font-mono);font-size:0.8rem;font-weight:700;color:var(--color-cool);margin-right:6px}
.prd-meta{font-family:var(--font-mono);font-size:0.74rem;letter-spacing:0.04em;color:var(--color-secondary);margin:4px 0 8px}
.prd-label{font-family:var(--font-label);font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--color-warn);font-weight:700;display:block;margin-bottom:4px}
.prd-bet{margin:10px 0;padding:10px 14px;background:var(--color-wash-cool);border-left:3px solid var(--color-warn)}
.prd-target{font-family:var(--font-mono);font-size:0.82em;background:var(--color-wash-cool);color:var(--color-ink);padding:1px 6px;border-radius:2px;white-space:nowrap}
.prd-target-row{margin:2px 0 8px;display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}
.prd-target-why{font-size:0.82rem;color:var(--color-secondary)}
.prd-at{margin:0 0 4px}
.prd-tests{margin:8px 0 8px 4px}
.prd-at-item{margin:0 0 6px;display:flex;gap:8px;align-items:baseline}
.prd-req-head{display:flex;gap:8px;align-items:baseline}
.prd-req-head .prd-h3{margin:0 0 6px}
.prd-job{margin:10px 0 14px}
.prd-steps{padding-left:20px}
.prd-matrix td,.prd-matrix th{font-size:0.8rem}
</style>`;

    const generated = opts.generatedAtIso ? `<p class="prd-meta">Generated ${esc(opts.generatedAtIso.slice(0, 10))}</p>` : '';
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(air.title)}</title>${style}${sourceLabelsScript(air)}</head>
<body><main class="prd-doc" data-brand="${brand}" data-prd-air-version="${esc(air.prdAirVersion)}" data-artifact-id="${esc(air.artifactId)}">
<header><div class="prd-kicker">Product requirements · brief and build spec</div><h1 class="prd-h1">${esc(air.title)}</h1>${air.objective && !isPromptEcho(air.objective) ? `<p class="prd-objective"${REF}>${esc(air.objective)}</p>` : ''}${generated}${coverageLine}</header>
<div class="prd-tier">Tier one · the brief</div>
${tier1}
<div class="prd-tier">Tier two · the build spec</div>
${tier2}
${ledgerHtml}
<section class="prd-section prd-tier-2" id="prd-matrix"><h2 class="prd-h2"${REF}><span class="prd-num">TR</span>Traceability matrix</h2>${matrixHtml}</section>
</main></body></html>`;
}

/** Composer-payload scanner hook: true when a payload value is a typed target carrier the number gate must exempt. */
export function isTargetCarrier(v: unknown): v is TargetCarrier {
    return isRequirementTarget(v);
}
