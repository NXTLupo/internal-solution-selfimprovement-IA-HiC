/**
 * UX Heuristic Analysis Service
 * Single-pass vision evaluation of screenshots against 8 evaluation dimensions
 * with structured severity scoring.
 *
 * 2026-07-05 (heuristic-audit uplift Phase 0): model resolution goes through the
 * ONE routing authority. The heuristic audit is artifact-class generation, so the
 * default resolves via artifactModelFor('heuristic-audit') (evidence tier ->
 * the Claude reasoning model while the cap is lifted; cap-aware fallback otherwise). An
 * explicit vision preference still wins, but only if that model is
 * vision-capable per MODEL_REGISTRY. NOTE: the plain 'audit' kind belongs to the
 * #audit tech-audit hashtag (schema tier / flash) - do not reuse it here.
 *
 * 2026-07-08 (critique-rigor plan, P0-b/P1-a/P1-b/P1-c): severity 0-4 with
 * severity_basis + deterministic collapseAndScore (subsumption/merge, ONE authority
 * upstream of deck, dashboard, gate, corpus); evidence discipline (axe/dom/measured/
 * vlm with advisory caps); artifact-type framing (slides get the communication lens);
 * total-content-parity contract on proposals (inventory + omitted[]); preserve[] +
 * non_issues[]; and a kill-only Critic pass (same-model anchored re-ask, id-subset
 * asserted) whose actions log to the gate's criticLog.
 */

import { routeVisionAnalysis, artifactModelFor, MODEL_REGISTRY, DEFAULT_MODELS, ModelPreferences } from './aiRouter';
import {
    HeuristicReport, HeuristicFinding, HeuristicScreenSummary, DimensionScore,
    HeuristicExecutiveSummary, UXBrief, HeuristicDimensionId, SeverityScore,
    ScreenArtifactType, ScreenInventoryItem,
} from '../types';
import { shortlistForInventory, registryPromptBlock, PROPOSED_RENDER_REGISTRY } from './proposedRenderRegistry';

// --- SYSTEM PROMPT: The full evaluation framework ---
// Hardened with techniques 2 (failure prevention), 4 (constraints), 5 (locked format), 8 (trimmed)

const SYSTEM_PROMPT = `You are a Senior UX Research Analyst. You evaluate digital experiences by examining screenshots against 8 evaluation dimensions. You return ONLY valid JSON matching the exact schema specified.

EVALUATION DIMENSIONS:

1. TRADITIONAL USABILITY (Nielsen's 10 Heuristics)
Evaluate: visibility of system status, match between system and real world, user control and freedom, consistency and standards, error prevention, recognition over recall, flexibility and efficiency, aesthetic and minimalist design, error recovery, help and documentation.

2. ACCESSIBILITY (WCAG 2.1 AA + 3.0 Draft)
Evaluate: color contrast, alt text on images, keyboard navigation, focus indicators, touch targets (44x44px minimum), responsive reflow at 320px, motion controls, form labels, error identification in text not just color, heading hierarchy.

3. VISUAL DESIGN (Gestalt Principles + Hierarchy)
Evaluate: proximity grouping, similarity patterns, continuity, closure, figure/ground separation, F/Z-pattern reading flow, visual weight distribution, whitespace, typography hierarchy, grid alignment.

4. CONVERSATIONAL AI (6 Agentic UX Patterns)
Only evaluate if screenshots show AI/chatbot/assistant interfaces.
Pattern 1 - Progressive Disclosure: summary first, detail on demand, max 2-3 layers.
Pattern 2 - Guided Narrowing: structured clarifying questions, sensible defaults, max 3-5 steps.
Pattern 3 - Confidence Signals: certainty levels on claims, evidence-grounded, not universal hedging.
Pattern 4 - Transparent Limitations: proactive limitation disclosure, specific not generic.
Pattern 5 - Action Audit and Undo: visibility of AI actions, undo mechanisms, confirmation before irreversible.
Pattern 6 - Contextual Progress Narration: descriptive processing states, not generic spinners.

5. TRUST ARCHITECTURE
Evaluate: calibrated trust (help users know WHEN to trust AI), tool-not-friend design, consistent persona, no sycophantic behavior, no emotional manipulation, evidence-based claims, differentiation between AI-generated and human-verified content.

6. AGENTIC COMMERCE READINESS
Evaluate: structured data completeness (specs, Schema.org), cross-platform consistency, machine readability, third-party verification/certifications, dual-audience design (human + AI agent). Score how well the experience serves algorithmic shopping agents alongside human users.

7. SOCIAL COMMERCE INTEGRATION
Evaluate: TikTok Shop / Instagram Shopping readiness, creator content integration, UGC trust signals, shoppable content, mobile-first discovery patterns, authentic voice, community-driven discovery elements.

8. GEO OPTIMIZATION (Generative Engine Optimization)
Evaluate: FAQ schema, structured response blocks, comparison data, use-case mapping, E-E-A-T signals, internal linking architecture, clinical/test results presentation. Score how well the page feeds AI-generated answers.

SEVERITY DISCIPLINE (hard):
- severity is an INTEGER 0-4: 0=no issue, 1=cosmetic, 2=minor, 3=major (impairs the primary task), 4=blocking (the task cannot complete / the page is broken).
- Every finding carries "severity_basis": ONE line of frequency x impact x persistence reasoning ("every visitor hits it; blocks the quote request; persists on all pages").
- The SAME defect gets the SAME score wherever it appears. Score one defect once; note repeats, never re-list them as new findings.
- If a finding is a SYMPTOM of a larger finding (a broken page makes its buttons unreadable), emit the parent once and set "dependsOn": "<parent finding id>" on the symptom. Do not scale symptom severity to match the parent.

EVIDENCE DISCIPLINE (hard):
- "evidenceKind" per finding: "axe" when the claim binds to a scanner rule result (name the rule id in the description); "dom" when derived from the provided DOM inventory or nav data; "vlm" when it rests only on your reading of the pixels.
- vlm-only findings are ADVISORY: set "needsManualReview": true and severity at most 2. They never headline.
- CONTRAST: assert a contrast failure ONLY when the scanner reports it. Thresholds: 4.5:1 body text; 3:1 large text (24px+, or 18.66px+ bold); 3:1 UI components. A visual impression of low contrast without a measurement is advisory (needsManualReview, severity <= 2).
- Claim exactly what was checked. Cite a WCAG success criterion only with a matching scanner result; otherwise describe the observation without the standard's name.

FRAMING (hard):
- Each screenshot has a declared ARTIFACT TYPE. "slide" (presentation slide) and "document" (report/PDF page): evaluate COMMUNICATION only - hierarchy, evidence, legibility, information design; NEVER emit interface findings (CTAs, nav, landmarks, form issues) against them, and NEVER propose a page redesign for them (omit proposedSections). "live" / "mockup": full heuristic set.
- The stated USER TASK anchors impact: severity 3-4 requires naming how the defect blocks or degrades that task in severity_basis.

NAVIGATION RULE (hard):
- On a multi-screen live/mockup experience, a screen with no visible navigation MUST produce a wayfinding finding (evidenceKind "dom" when the derived nav data says nav_present=false).
- Every proposed page layout MUST include one navigation pattern (sidebar, nav-bar, tabs, breadcrumb, bottom-nav, or footer). App/dashboard screens PREFER the sidebar rail (it renders as a true left navigation column).

CONSTRAINTS:
- Every finding MUST reference at least one screenshot by number (1-indexed).
- screenshotRefs DISCIPLINE (hard): list ONLY screenshots where the issue is DIRECTLY VISIBLE.
  The FIRST entry is the PRIMARY screenshot - the single screen that best evidences the issue;
  the report renders the finding on that screen. Never list a screenshot where the named
  element does not appear.
- Every finding carries "marker": {"x": <0-100>, "y": <0-100>} - the approximate location of
  the issue on the PRIMARY screenshot as percentages of the image (x from left, y from top).
  Point at the specific element, not the center of the page.
- Confidence: exactly HIGH (clearly visible), MEDIUM (inferred from partial evidence), or LOW (requires live testing).
- Report ALL findings per dimension - do not cap at an arbitrary number. Skip dimensions with 0 findings.
- PLAIN ENGLISH (hard): write for a business owner, not an auditor. Title = 5-8 plain words
  naming what is wrong ("Buttons are too faint to read"), never spec jargon in the title.
  Description = ONE sentence, 12-20 words: what a user experiences and why it costs the
  business; a standards or rule id may appear once in parentheses at the end. Recommendation
  = one imperative sentence, under 12 words, naming the concrete change ("Darken button
  labels to charcoal"). These are COMPLETE thoughts compressed by you, never fragments.
- Executive summary: exactly 3 sentences, same plain-English register.
- Top issues: exactly 5, sorted by severity descending; never a needsManualReview finding.
- Only evaluate dimensions listed in the brief's evaluationDimensions array.
- If screenshots show no AI/chatbot interface, skip conversational_ai dimension entirely.
- Do NOT invent findings that are not visible in the screenshots.

PER-SCREEN SYNTHESIS ("screenSummaries", one entry PER screenshot):
- "verdict": one plain-English judgment sentence about THIS screen, max 12 words
  ("Strong data table undermined by faint labels and a missing next step").
- "preserve": the strong elements of THIS screen the redesign must carry forward
  (at least 1 wherever a genuinely strong element exists). Name CONCRETE VISIBLE CONTENT
  in the screen's own words - a headline, a stat with its value, a brand mark, a label -
  so the proposal can carry it in a slot. Never abstract layout qualities ("three-column
  structure", "clean split"); name the content the structure carries instead.
- "non_issues": at least 1 check you examined on this screen and found fine
  ("Body text passes contrast", "The form labels every field").
- "contentInventory" (UPLOADED screenshots only; captured URLs already carry a
  DOM-derived inventory): EVERY visible detail as {"kind": "heading"|"value"|"text"|"action",
  "text": "<verbatim>"} - headings, stats WITH their values, captions, source
  attributions, table rows, button labels. Up to 40 items. This is the parity contract.
- "proposedSections" (REQUIRED for every live/mockup screen; OMIT for slide and document screens): the modernized layout,
  3-9 sections chosen ONLY from the PATTERN CATALOG given in the task (exact names).
  Each section = {"pattern", "label", "items": [<up to 10 for list/table/card-grid/
  accordion, up to 6 elsewhere>], "values": [<the REAL numbers aligned to items, for
  kpi-row/table/cite/pricing>], "subs": [<captions aligned to items>], "cta": "<button
  label>"}. Order sections top-to-bottom. The proposal must RESOLVE the screen's
  findings AND include one navigation pattern and one clearly-labeled primary action.
- DENSE SCREENS (hard): a data-dense screen (dashboard, report catalog, benchmark table)
  carries its many rows through list/table/card-grid sections with up to 10 items each;
  SPLIT into two sections of the same pattern rather than dropping rows. A dense current
  screen needs 6-9 proposed sections, not 4.
- TOTAL CONTENT PARITY (hard): EVERY inventory item of the current screen maps into the
  proposed sections (label, items, values, subs, or cta), or appears in "omitted":
  [{"item": "<the detail>", "reason": "<one line why dropping it improves the screen>"}].
  Dropping a detail silently is a violation. Real values ($3.8T, >50%) go INTO the value
  slots; never replace a real value with a placeholder. UI chrome with no place in a
  static proposal (keyboard hints like "Esc to return", sample-data disclaimers,
  pagination controls) belongs in omitted[] with its reason - USE omitted[], it is the
  only legal way to drop a detail.
- "nav_present": true/false - whether THIS screen shows navigation (uploads only;
  captures are DOM-derived).
- "proposedRationale": one sentence, max 20 words, stating the USER-FACING improvement as a
  judgment about the screen ("Barrier rows become readable and every visitor gets a clear
  next step"). NEVER design-process narration ("darkens", "rebrands", "adds a CTA"), NEVER
  references to "the proposal", "the layout", "the redesign", or the screen-as-artifact.

OUTPUT VOICE (hard, applies to EVERY field): the reader is an executive seeing a finished
consulting artifact. Never write meta-narration ("This screen shows", "the proposal",
"the layout above"), never reference the report/critique/analysis itself, never process
language ("based on the analysis", "the review found"). State the judgment directly.`;

export interface HeuristicRunOptions {
    deterministicEvidence?: string;
    screenNames?: string[];
    /** 1-indexed screen -> deterministic DOM inventory (captured URLs). */
    contentInventories?: Record<number, ScreenInventoryItem[]>;
    /** 1-indexed screen -> deterministic nav presence (captured URLs). */
    navPresent?: Record<number, boolean>;
    /** 1-indexed screen -> artifact type. Captures auto-type 'live'; unset uploads
     *  fail open as 'mockup'. */
    artifactTypes?: Record<number, ScreenArtifactType>;
    /** Run the kill-only Critic pass (default true). */
    critic?: boolean;
}

const USER_PROMPT_TEMPLATE = (brief: UXBrief, screenshotCount: number, opts: HeuristicRunOptions) => {
    const screenNames = opts.screenNames;
    const types = opts.artifactTypes || {};
    const invs = opts.contentInventories || {};
    const nav = opts.navPresent || {};
    const frameLines: string[] = [];
    for (let i = 1; i <= screenshotCount; i++) {
        const bits = [`type=${types[i] || 'mockup'}`];
        if (nav[i] !== undefined) bits.push(`nav_present=${nav[i]}`);
        frameLines.push(`[${i}] ${screenNames?.[i - 1] || `Upload ${i}`} (${bits.join(', ')})`);
    }
    // Manifest-mirrored catalog: shape-based shortlist per screen where an inventory
    // exists; the union of matched entries is the only catalog the model sees.
    const entryUnion = new Map<string, ReturnType<typeof shortlistForInventory>[number]>();
    const perScreenCatalog: string[] = [];
    for (let i = 1; i <= screenshotCount; i++) {
        if ((types[i] || 'mockup') === 'slide') continue;
        const entries = shortlistForInventory(invs[i], { multiScreen: screenshotCount > 1, appShell: brief.experienceType === 'saas_dashboard' || brief.experienceType === 'mobile_app' });
        entries.forEach(e => entryUnion.set(e.pattern, e));
        if (invs[i]?.length) perScreenCatalog.push(`Screen ${i}: ${entries.map(e => e.pattern).join(', ')}`);
    }
    if (!entryUnion.size) PROPOSED_RENDER_REGISTRY.forEach(e => entryUnion.set(e.pattern, e));
    const inventoryBlock = Object.entries(invs).map(([k, items]) =>
        `Screen ${k} CONTENT INVENTORY (DOM-derived ground truth; the parity contract for its proposal):\n` +
        items.slice(0, 50).map(it => `  - ${it.kind}: ${it.text}`).join('\n')
    ).join('\n');

    return `
Analyze these ${screenshotCount} screenshots of "${brief.productName}" (${brief.experienceType.replace('_', ' ')}).
Screens in order: ${frameLines.join('; ')}.

BRIEF:
- Target audience: ${brief.targetAudience.join(', ')}
- Business goals: ${brief.businessGoals.join(', ')}
${brief.primaryTask ? `- PRIMARY USER TASK (anchors severity impact): ${brief.primaryTask}` : '- No task model was provided: severity 3-4 interaction findings are not available; cap interaction findings at 2 unless a scanner result backs them.'}
${brief.competitiveContext ? `- Competitive context: ${brief.competitiveContext}` : ''}
- Evaluate ONLY these dimensions: ${brief.evaluationDimensions.join(', ')}

PATTERN CATALOG (mirrored Figma proto/* components; choose proposedSections ONLY from these exact names):
${registryPromptBlock([...entryUnion.values()])}
${perScreenCatalog.length ? `\nShape-matched shortlist per screen (prefer these for that screen):\n${perScreenCatalog.join('\n')}` : ''}
${inventoryBlock ? `\n${inventoryBlock}` : ''}

OUTPUT BUDGET (hard): the response must stay well inside the output-token limit. Findings and
summaries are COMPACT: severity_basis <= 15 words, description one sentence, no repeated
content anywhere. Never re-emit a finding object twice.

Return a JSON object with this exact structure:
{
  "executiveSummary": {
    "overallScore": <0-100, where 100 means no issues found>,
    "summary": "<exactly 3 sentences>"
  },
  "findings": [
    {
      "id": "f1",
      "dimension": "<dimension_id>",
      "screenshotRefs": [<1-indexed; FIRST = the primary screen where the issue is visible>],
      "marker": {"x": <0-100 percent from left on the primary screenshot>, "y": <0-100 percent from top>},
      "severity": <0-4>,
      "severity_basis": "<one line: frequency x impact x persistence>",
      "confidence": "HIGH|MEDIUM|LOW",
      "evidenceKind": "axe|dom|vlm",
      "needsManualReview": <true when vlm-only>,
      "dependsOn": "<parent finding id, ONLY when this is a symptom of it>",
      "title": "<5-8 plain words>",
      "description": "<one sentence, 12-20 words, plain English>",
      "recommendation": "<1 imperative sentence, under 12 words>",
      "subcategory": "<e.g. Heuristic 4: Consistency or Pattern 2: Guided Narrowing>"
    }
  ],
  "screenSummaries": [
    {
      "screenshot": <1-indexed, one entry per screenshot>,
      "verdict": "<max 12 plain words judging THIS screen>",
      "preserve": ["<strong element to carry forward>"],
      "non_issues": ["<check examined and passed>"],
      "contentInventory": [{"kind": "heading|value|text|action", "text": "<verbatim>"}],
      "nav_present": <true|false>,
      "proposedSections": [{"pattern": "<catalog name>", "label": "<heading>", "items": ["<label>"], "values": ["<real value>"], "subs": ["<caption>"], "cta": "<button label>"}],
      "omitted": [{"item": "<inventory detail deliberately dropped>", "reason": "<one line>"}],
      "proposedRationale": "<one sentence, max 20 words>"
    }
  ]
}`;
};

// ------------------------------------------------------------------
// collapseAndScore (P0-b): the ONE deterministic authority that merges
// duplicates and folds symptom findings under their roots, BEFORE anything
// consumes findings (deck, dashboard, gate, corpus serialization).
// ------------------------------------------------------------------

const BLANK_PAGE_RX = /does\s*n[o']t exist|blank|fails? to load|failed to load|empty page|no content|placeholder|missing page|\b404\b|dead end/i;

export function collapseAndScore(findings: HeuristicFinding[]): HeuristicFinding[] {
    // Pass 1 - merge identical fix + dimension into one finding with instances[].
    const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const byKey = new Map<string, HeuristicFinding>();
    const merged: HeuristicFinding[] = [];
    for (const f of findings) {
        const rec = norm(f.recommendation);
        const key = rec ? `${f.dimension}|${rec}` : `id|${f.id}`;
        const prior = byKey.get(key);
        if (prior) {
            prior.instances = [...(prior.instances || []), `also on screen ${f.screenshotRefs[0]}: ${f.title}`];
            prior.severity = Math.max(prior.severity, f.severity) as SeverityScore;
            for (const r of f.screenshotRefs) if (!prior.screenshotRefs.includes(r)) prior.screenshotRefs.push(r);
        } else {
            const copy = { ...f, screenshotRefs: [...f.screenshotRefs] };
            byKey.set(key, copy);
            merged.push(copy);
        }
    }
    // Pass 2 - dependency fold: children whose dependsOn resolves to a survivor
    // collapse into the parent's subsumes[]; parent severity re-raises.
    const byId = new Map(merged.map(f => [f.id, f]));
    const absorbed = new Set<string>();
    for (const f of merged) {
        const parent = f.dependsOn ? byId.get(f.dependsOn) : undefined;
        if (parent && parent !== f && !absorbed.has(parent.id)) {
            parent.subsumes = [...(parent.subsumes || []), f.id];
            parent.severity = Math.max(parent.severity, f.severity) as SeverityScore;
            absorbed.add(f.id);
        }
    }
    // Pass 3 - blank-page rule: a severity-4 "page is broken" root on a screen
    // absorbs every other finding whose PRIMARY screen is that screen.
    const roots = new Map<number, HeuristicFinding>();
    for (const f of merged) {
        if (absorbed.has(f.id)) continue;
        if (f.severity === 4 && BLANK_PAGE_RX.test(`${f.title} ${f.description}`)) {
            const screen = f.screenshotRefs[0];
            if (!roots.has(screen)) roots.set(screen, f);
        }
    }
    for (const f of merged) {
        if (absorbed.has(f.id)) continue;
        const root = roots.get(f.screenshotRefs[0]);
        if (root && root !== f) {
            root.subsumes = [...(root.subsumes || []), f.id];
            absorbed.add(f.id);
        }
    }
    return merged.filter(f => !absorbed.has(f.id)).map(f => {
        // a surviving finding whose parent was itself absorbed keeps no dangling hint
        if (f.dependsOn && (absorbed.has(f.dependsOn) || !byId.has(f.dependsOn))) {
            const { dependsOn: _drop, ...rest } = f;
            return rest as HeuristicFinding;
        }
        return f;
    });
}

// ------------------------------------------------------------------
// Critic pass (P1-a): same-model anchored re-ask with KILL-ONLY powers.
// May downgrade / merge / subsume / mark-advisory / kill; may NOT add findings.
// ------------------------------------------------------------------

const CRITIC_SYSTEM = `You are the CRITIC pass of a UX audit. You receive the evaluator's findings and screen summaries, with the screenshots. Your ONLY powers are to REMOVE or WEAKEN findings; you can NEVER add one.

The ARTIFACT TYPES mapping in the task is AUTHORITATIVE - the human declared what each
screen is. Do not re-infer it from the pixels: a screen declared "mockup" or "live" gets
the full interface lens even if it visually resembles a slide. NEVER kill a wayfinding/
navigation finding on a screen whose derived nav_present is false - that finding is
required by rule.

Apply this fast checklist (the failure taxonomy):
- R1 wrong lens: interface findings (CTA/nav/landmarks/forms) against a screen DECLARED type "slide" -> kill (reason OPINION-AS-HEURISTIC or NO-TASK-MODEL). Never against declared mockup/live screens.
- R5/R6 unverified: a claim needing measurement (contrast, target size) with no scanner backing -> action "advisory" (reason UNVERIFIED-AS-DEFECT or FP-CONTRAST).
- R7 severity inflation: severity not justified by the stated basis against the user task -> "downgrade" with the corrected severity (reason SEVERITY-UNMAPPED).
- R8 subsumption: a finding that is a symptom of another -> "subsume" into the parent (reason SUBSUMED).
- R9 duplicates: same fix, same heuristic -> "merge" into the first (reason DUP).
- R10 opinion: taste with no heuristic anchor and no user cost -> "kill" (reason OPINION-AS-HEURISTIC).
- R11 overclaimed standard: WCAG named without a matching scanner result -> "advisory" (reason STANDARD-OVERCLAIMED).
- Tautological recommendation (restates the finding negated, adds nothing actionable) -> "downgrade" to 1 (reason TAUTOLOGICAL-REC).

Keep findings you cannot fault: emit NO action for them. Do not revise text. Return ONLY JSON:
{"actions": [{"finding_id": "<id>", "action": "kill|downgrade|advisory|merge|subsume", "reason_code": "<code>", "severity": <0-4, downgrade only>, "target_id": "<id, merge/subsume only>", "note": "<12 words max>"}]}`;

export interface CriticAction {
    finding_id: string;
    action: 'kill' | 'downgrade' | 'advisory' | 'merge' | 'subsume';
    reason_code: string;
    severity?: number;
    target_id?: string;
    note?: string;
}

/** Apply Critic actions deterministically. Kill-only is structural: the result id
 *  set is always a subset of the input id set (asserted). */
export function applyCriticActions(findings: HeuristicFinding[], actions: CriticAction[]):
    { findings: HeuristicFinding[]; log: { finding_id: string; reason_code: string; action: string }[] } {
    const before = new Set(findings.map(f => f.id));
    const byId = new Map(findings.map(f => [f.id, { ...f }]));
    const log: { finding_id: string; reason_code: string; action: string }[] = [];
    for (const a of actions || []) {
        const f = byId.get(a.finding_id);
        if (!f) continue;   // unknown id: the Critic cannot touch what does not exist
        switch (a.action) {
            case 'kill':
                byId.delete(a.finding_id);
                break;
            case 'downgrade': {
                const s = Math.max(0, Math.min(4, Math.min(f.severity, Math.round(a.severity ?? 2)))) as SeverityScore;
                f.severity = s;
                break;
            }
            case 'advisory':
                f.needsManualReview = true;
                f.severity = Math.min(f.severity, 2) as SeverityScore;
                break;
            case 'merge':
            case 'subsume': {
                const target = a.target_id ? byId.get(a.target_id) : undefined;
                if (target && target !== f) {
                    if (a.action === 'merge') target.instances = [...(target.instances || []), `merged: ${f.title}`];
                    else target.subsumes = [...(target.subsumes || []), f.id];
                    target.severity = Math.max(target.severity, f.severity) as SeverityScore;
                    byId.delete(a.finding_id);
                }
                break;
            }
        }
        log.push({ finding_id: a.finding_id, reason_code: a.reason_code || 'UNSPECIFIED', action: a.action });
    }
    const result = findings.filter(f => byId.has(f.id)).map(f => byId.get(f.id)!);
    // id-subset assertion (item 20): the Critic can only remove/weaken, never add.
    for (const f of result) {
        if (!before.has(f.id)) throw new Error(`Critic invariant violated: new finding id "${f.id}"`);
    }
    return { findings: result, log };
}

// ------------------------------------------------------------------
// Repair loop (P0-c3, wired 2026-07-08 after the NFP live failure where all seven
// proposals were withheld with no repair attempt): ONE anchored re-ask per run that
// names each withheld screen's exact unbound inventory items + failed floor axes and
// demands bind-or-justify. The result re-renders and re-gates; still-below-floor
// screens stay withheld (honest critique-only beats an anti-recommendation).
// ------------------------------------------------------------------

export async function repairWithheldProposals(
    summaries: HeuristicScreenSummary[],
    briefs: Record<number, string[]>,   // screen -> missing items + axis directives
    screenshots: { base64: string; mimeType: string }[],
    modelPreferences?: ModelPreferences,
): Promise<HeuristicScreenSummary[]> {
    const failing = summaries.filter(s => briefs[s.screenshot]?.length && s.proposedSections?.length);
    if (!failing.length) return summaries;
    const routed = artifactModelFor('heuristic-audit');
    const prefs: ModelPreferences = {
        ...(modelPreferences || (DEFAULT_MODELS as ModelPreferences)),
        vision: MODEL_REGISTRY[routed]?.vision ? routed : DEFAULT_MODELS.vision,
    };
    const blocks = failing.map(s => `SCREEN ${s.screenshot}
PRIOR PROPOSAL (revise, do not start over):
${JSON.stringify({ proposedSections: s.proposedSections, omitted: s.omitted || [], preserve: s.preserve || [] }, null, 1)}
UNRESOLVED (every line below MUST end up bound into a section slot OR in omitted[] with a reason):
${briefs[s.screenshot].map(m => `- ${m}`).join('\n')}`).join('\n\n');

    const user = `The proposed layouts below failed the fidelity gate. Revise each screen's proposedSections so EVERY unresolved line binds into a slot (label, items, values, subs, cta) or appears in omitted[] with a one-line reason. Rules:
- Patterns stay within the same catalog names already used plus: sidebar, nav-bar, tabs, footer, hero, kpi-row, list, table, card-grid, accordion, cite, cta-row, form, search, chart-bar, pricing, feature-grid, timeline, testimonial, bento, kanban, notif-list, empty, profile, product.
- list/table/card-grid/accordion sections carry up to 10 items; SPLIT a pattern into two sections rather than dropping rows; up to 9 sections per screen.
- Every screen keeps one navigation pattern and one clearly-labeled primary action (cta).
- Real values go into "values" slots verbatim; never invent or round them.
- Keep every preserve item carried in the sections.

${blocks}

Return ONLY JSON: {"screens": [{"screenshot": <n>, "proposedSections": [...], "omitted": [{"item": "...", "reason": "..."}]}]}`;

    const out = await routeVisionAnalysis<{ screens: { screenshot: number; proposedSections: HeuristicScreenSummary['proposedSections']; omitted?: { item: string; reason: string }[] }[] }>(
        'You repair proposed screen layouts to meet a total-content-parity contract. You return ONLY valid JSON.',
        user, screenshots, prefs, 24000, 0);

    const byRef = new Map((out?.screens || []).map(r => [r.screenshot, r]));
    return summaries.map(s => {
        const r = byRef.get(s.screenshot);
        if (!r || !Array.isArray(r.proposedSections) || !r.proposedSections.length) return s;
        return { ...s, proposedSections: r.proposedSections, omitted: r.omitted || s.omitted };
    });
}

// ------------------------------------------------------------------
// "Improve this" revise loop (2026-07-08, owner: feedback must produce NEW proposed
// designs, not a text-only re-ask). One Opus vision call revises the proposedSections
// of every live/mockup screen per the user feedback; the caller re-renders through
// the Figma-partial renderer and re-gates. Parity and preserve stay binding.
// ------------------------------------------------------------------

export async function reviseProposalsWithFeedback(
    summaries: HeuristicScreenSummary[],
    feedback: string,
    screenshots: { base64: string; mimeType: string }[],
    artifactTypes: Record<number, ScreenArtifactType>,
    modelPreferences?: ModelPreferences,
): Promise<HeuristicScreenSummary[]> {
    const revisable = summaries.filter(s =>
        !['slide', 'document'].includes(artifactTypes[s.screenshot] ?? 'mockup') && s.proposedSections?.length);
    if (!revisable.length) return summaries;
    const routed = artifactModelFor('heuristic-audit');
    const prefs: ModelPreferences = {
        ...(modelPreferences || (DEFAULT_MODELS as ModelPreferences)),
        vision: MODEL_REGISTRY[routed]?.vision ? routed : DEFAULT_MODELS.vision,
    };
    const catalog = registryPromptBlock(PROPOSED_RENDER_REGISTRY);
    const user = `USER FEEDBACK ON THE PROPOSED REDESIGNS - apply to EVERY screen below:
"${feedback}"

CURRENT PROPOSALS (revise these; keep everything the feedback does not change):
${JSON.stringify(revisable.map(s => ({ screenshot: s.screenshot, proposedSections: s.proposedSections, preserve: s.preserve || [], omitted: s.omitted || [] })), null, 1)}

PATTERN CATALOG (exact names only):
${catalog}

Rules:
- Apply the feedback structurally (a request for a left-hand menu means a "sidebar" section FIRST on every page-type screen; a brand/logo request goes into the sidebar or nav-bar label).
- Keep every currently-bound detail: labels, items, values, subs, ctas, omitted[] justifications, preserve items. The feedback ADDS or RESTRUCTURES; it never drops content.
- list/table/card-grid/accordion carry up to 10 items; up to 9 sections per screen; one navigation pattern + one labeled primary action per screen.
Return ONLY JSON: {"screens": [{"screenshot": <n>, "proposedSections": [...], "omitted": [...], "proposedRationale": "<one sentence, max 20 words, user-facing judgment>"}]}`;

    const out = await routeVisionAnalysis<{ screens: { screenshot: number; proposedSections: HeuristicScreenSummary['proposedSections']; omitted?: { item: string; reason: string }[]; proposedRationale?: string }[] }>(
        'You revise proposed screen layouts per user feedback while preserving total content parity. You return ONLY valid JSON.',
        user, screenshots, prefs, 24000, 0);
    const byRef = new Map((out?.screens || []).map(r => [r.screenshot, r]));
    return summaries.map(s => {
        const r = byRef.get(s.screenshot);
        if (!r || !Array.isArray(r.proposedSections) || !r.proposedSections.length) return s;
        return { ...s, proposedSections: r.proposedSections, omitted: r.omitted || s.omitted, proposedRationale: r.proposedRationale || s.proposedRationale };
    });
}

// ------------------------------------------------------------------
// Artifact auto-classification (2026-07-08, owner: "recognize documents to analyze
// vs UI analyses" - slide decks kept receiving CTA/nav critique). A cheap vision
// pre-pass on the FAST tier types every screenshot BEFORE analysis; the intake chip
// is a human override for screens the user explicitly set. Deterministic captures
// stay 'live' regardless.
// ------------------------------------------------------------------

export async function classifyScreenArtifacts(
    screenshots: { base64: string; mimeType: string }[],
): Promise<Record<number, ScreenArtifactType>> {
    const out = await routeVisionAnalysis<{ screens: { screenshot: number; type: string }[] }>(
        `You classify screenshots for a UX analysis pipeline. For EACH screenshot, decide what it IS:
- "live": a real product interface in use (browser chrome, real data, interactive states)
- "mockup": a designed interface comp/prototype (UI layout without live chrome)
- "slide": a PRESENTATION SLIDE (16:9 composition, display-size headline or section numeral, deck furniture like kickers/footers/page numbers, statistics laid out to be read, no interactive controls)
- "document": a document/report/PDF page (flowing text columns, headings + paragraphs, print-like layout)
Interfaces have controls a user operates (inputs, buttons, menus, tables to act on). Slides and documents COMMUNICATE and are never critiqued as interfaces. Return ONLY JSON.`,
        `Classify all ${screenshots.length} screenshots. Return {"screens": [{"screenshot": <1-indexed>, "type": "live|mockup|slide|document"}]} with exactly one entry per screenshot.`,
        screenshots,
        DEFAULT_MODELS as ModelPreferences,   // fast vision tier: this is triage, not judgment
        2000,
        0,
    );
    const map: Record<number, ScreenArtifactType> = {};
    for (const s of out?.screens || []) {
        if (Number.isInteger(s.screenshot) && s.screenshot >= 1 && s.screenshot <= screenshots.length
            && ['live', 'mockup', 'slide', 'document'].includes(s.type)) {
            map[s.screenshot] = s.type as ScreenArtifactType;
        }
    }
    return map;
}

// --- ANALYSIS FUNCTION ---

export async function runHeuristicAnalysis(
    brief: UXBrief,
    screenshots: { base64: string; mimeType: string }[],
    modelPreferences?: ModelPreferences,
    // 2026-07-07 Phase 1: deterministic scanner evidence (axe-core violations/incomplete +
    // timing from /api/audit/capture-url), serialized as text. When present it rides in the
    // user prompt with the evidence-binding rule: WCAG conformance claims must cite these
    // rule ids; without a matching rule id the finding is subjective and advisory.
    deterministicEvidence?: string,
    // 2026-07-08 critique elevation: display names per screenshot (index-aligned) so the
    // model can bind findings + screenSummaries to the RIGHT screen by name, not just index.
    screenNames?: string[],
    options?: HeuristicRunOptions
): Promise<HeuristicReport> {
    const opts: HeuristicRunOptions = {
        deterministicEvidence, screenNames,
        ...(options || {}),
    };
    // Resolve the vision model through the routing authority: explicit vision-capable
    // preference wins; otherwise the artifact-class route (never a hardcoded model id).
    const preferred = modelPreferences?.vision;
    const routed = artifactModelFor('heuristic-audit');
    const modelId = (preferred && MODEL_REGISTRY[preferred]?.vision)
        ? preferred
        : (MODEL_REGISTRY[routed]?.vision ? routed : DEFAULT_MODELS.vision);
    const prefs: ModelPreferences = {
        ...(modelPreferences || (DEFAULT_MODELS as ModelPreferences)),
        vision: modelId,
    };

    let userPrompt = USER_PROMPT_TEMPLATE(brief, screenshots.length, opts);
    if (opts.deterministicEvidence && opts.deterministicEvidence.trim()) {
        userPrompt += `

DETERMINISTIC SCANNER EVIDENCE (axe-core, WCAG 2.2 AA tag set; ground truth, not opinion):
${opts.deterministicEvidence.trim()}

EVIDENCE-BINDING RULE: any finding that asserts a WCAG success-criterion failure MUST correspond
to one of the axe rule results above (name the rule id in the finding description and set
evidenceKind "axe"). Items in the "incomplete" set need human review; present them as advisory
(needsManualReview true), never as definitive pass/fail. Subjective usability/visual observations
remain yours but carry no WCAG conformance claim.`;
    }

    // Single-pass vision analysis. The executive layer from the model is score +
    // summary ONLY (2026-07-08: the old schema demanded 5 duplicated full finding
    // objects as topIssues, inflating output toward the token cap - the live NFP run
    // truncated there; topIssues/distribution/counts are recomputed deterministically
    // below, so they were never the model's to emit).
    const rawResult = await routeVisionAnalysis<{
        executiveSummary: Partial<HeuristicExecutiveSummary> & { overallScore: number; summary: string };
        findings: HeuristicFinding[];
        screenSummaries?: (HeuristicScreenSummary & { nav_present?: boolean })[];
    }>(
        SYSTEM_PROMPT,
        userPrompt,
        screenshots,
        prefs,
        32000,
        0.1
    );

    // 2026-07-08 elevation: sanitize screenshotRefs against the real screen count so a
    // drifted ref can never place a finding on a non-existent screen; drop out-of-range
    // entries and default an emptied list to screen 1 (better a visible finding on the
    // first screen than a silently dropped one).
    const maxRef = screenshots.length;
    let findings = (rawResult.findings || []).map(f => {
        const refs = (f.screenshotRefs || []).filter(r => Number.isInteger(r) && r >= 1 && r <= maxRef);
        return { ...f, screenshotRefs: refs.length ? refs : [1] };
    });

    // Evidence discipline enforced deterministically (quality floor upstream of the gate):
    // an axe rule id in the description binds the finding to the scanner; anything vlm-only
    // is advisory - needsManualReview + severity cap 2 (taxonomy R5/R6).
    const axeRuleIds = new Set<string>();
    if (opts.deterministicEvidence) {
        for (const m of opts.deterministicEvidence.matchAll(/"id":\s*"([a-z0-9-]+)"/g)) axeRuleIds.add(m[1]);
    }
    findings = findings.map(f => {
        const g = { ...f };
        if (!g.evidenceKind) {
            const text = `${g.description} ${g.subcategory || ''}`;
            g.evidenceKind = [...axeRuleIds].some(id => text.includes(id)) ? 'axe' : 'vlm';
        }
        if (g.evidenceKind === 'vlm') {
            g.needsManualReview = true;
            if (g.severity > 2) g.severity = 2;
        }
        if (!(g.severity_basis || '').trim()) {
            g.severity_basis = `${g.confidence === 'HIGH' ? 'clearly visible' : 'partially evidenced'}; ${g.description}`.slice(0, 160);
        }
        return g;
    });

    // P0-b: THE collapse authority - dedupe + subsumption fold, before any consumer.
    findings = collapseAndScore(findings);

    // Screen summaries: sanitize refs; deterministic capture data OVERRIDES model output.
    const summaries: HeuristicScreenSummary[] = (rawResult.screenSummaries || [])
        .filter(s => s && Number.isInteger(s.screenshot) && s.screenshot >= 1 && s.screenshot <= maxRef)
        .map(s => {
            const det = opts.contentInventories?.[s.screenshot];
            return { ...s, contentInventory: det?.length ? det : s.contentInventory };
        });

    const navPresent: Record<number, boolean> = {};
    for (const s of rawResult.screenSummaries || []) {
        if (s && typeof (s as any).nav_present === 'boolean') navPresent[s.screenshot] = (s as any).nav_present;
    }
    Object.assign(navPresent, opts.navPresent || {});

    // P1-a: kill-only Critic (same-model anchored re-ask). Fail-open: a Critic failure
    // ships the evaluator's findings with an empty log, never kills the run.
    let criticLog: { finding_id: string; reason_code: string; action: string }[] = [];
    if (opts.critic !== false && findings.length > 0) {
        try {
            const criticUser = `USER TASK: ${brief.primaryTask || '(none provided)'}
ARTIFACT TYPES: ${JSON.stringify(opts.artifactTypes || {})}
NAV PRESENT (derived): ${JSON.stringify(navPresent)}
SCANNER RULE IDS PRESENT: ${[...axeRuleIds].join(', ') || '(none)'}

EVALUATOR FINDINGS (verbatim; act only on these ids):
${JSON.stringify(findings.map(f => ({
                id: f.id, dimension: f.dimension, screen: f.screenshotRefs[0], severity: f.severity,
                severity_basis: f.severity_basis, evidenceKind: f.evidenceKind,
                needsManualReview: !!f.needsManualReview, title: f.title,
                description: f.description, recommendation: f.recommendation, subcategory: f.subcategory,
            })), null, 1)}`;
            const criticOut = await routeVisionAnalysis<{ actions: CriticAction[] }>(
                CRITIC_SYSTEM, criticUser, screenshots, prefs, 8000, 0
            );
            const applied = applyCriticActions(findings, criticOut?.actions || []);
            findings = applied.findings;
            criticLog = applied.log;
        } catch (criticErr) {
            console.warn('[heuristic] Critic pass failed (fail-open, evaluator findings ship):', criticErr);
        }
    }

    // P0-d measurement-first (2026-07-08 NFP live failure): nav absence is DERIVED
    // ground truth, so the wayfinding finding it implies is guaranteed deterministically
    // rather than begged from the model (which missed it on 3 of 7 screens live). An
    // existing wayfinding finding EXTENDS its refs to the uncovered screens; only when
    // none exists at all is one synthesized with evidenceKind "dom".
    if (screenshots.length > 1) {
        const navRx = /nav|wayfind|orientation|menu|breadcrumb/i;
        const uncovered: number[] = [];
        for (const [k, present] of Object.entries(navPresent)) {
            const screen = Number(k);
            if (present) continue;
            if (['slide', 'document'].includes(opts.artifactTypes?.[screen] ?? 'mockup')) continue;
            const covered = findings.some(f => f.screenshotRefs.includes(screen) &&
                navRx.test(`${f.title} ${f.description} ${f.subcategory || ''}`));
            if (!covered) uncovered.push(screen);
        }
        if (uncovered.length) {
            const existing = findings.find(f => navRx.test(`${f.title} ${f.description} ${f.subcategory || ''}`));
            if (existing) {
                existing.screenshotRefs.push(...uncovered.filter(s => !existing.screenshotRefs.includes(s)));
                existing.instances = [...(existing.instances || []),
                    `also derived on screen${uncovered.length > 1 ? 's' : ''} ${uncovered.join(', ')}: no navigation present`];
            } else {
                findings.push({
                    id: 'nav-derived',
                    dimension: 'traditional_usability',
                    screenshotRefs: uncovered,
                    severity: 2,
                    confidence: 'HIGH',
                    evidenceKind: 'dom',
                    title: 'No navigation visible on this screen',
                    description: 'The screen shows no menu, links, or wayfinding, so users cannot move toward the next step.',
                    recommendation: 'Add a navigation bar with a primary action.',
                    subcategory: 'Heuristic 7: Flexibility and efficiency',
                    severity_basis: 'every visitor on these screens; slows movement toward the primary task; persists until navigation exists',
                    marker: { x: 8, y: 5 },
                });
            }
        }
    }

    // Compute dimension scores from the SURVIVING findings
    const dimensionMap = new Map<HeuristicDimensionId, { total: number; count: number; critical: number }>();
    for (const f of findings) {
        const dim = f.dimension as HeuristicDimensionId;
        if (!dimensionMap.has(dim)) dimensionMap.set(dim, { total: 0, count: 0, critical: 0 });
        const entry = dimensionMap.get(dim)!;
        entry.total += f.severity;
        entry.count += 1;
        if (f.severity >= 3) entry.critical += 1;
    }
    const dimensions: DimensionScore[] = Array.from(dimensionMap.entries()).map(([dim, data]) => ({
        dimension: dim,
        averageSeverity: Math.round((data.total / data.count) * 10) / 10,
        findingCount: data.count,
        criticalCount: data.critical,
    }));

    // Recompute the executive layer from survivors (the model's counts drift after
    // collapse + Critic): distribution, total, and topIssues (never advisory findings).
    const severityDist: Record<SeverityScore, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const f of findings) severityDist[f.severity] = (severityDist[f.severity] || 0) + 1;
    const topIssues = [...findings]
        .filter(f => !f.needsManualReview)
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 5);

    return {
        brief,
        executiveSummary: {
            overallScore: rawResult.executiveSummary?.overallScore ?? 50,
            summary: rawResult.executiveSummary?.summary ?? '',
            totalFindings: findings.length,
            severityDistribution: severityDist,
            topIssues,
        },
        dimensions,
        findings,
        screenshotCount: screenshots.length,
        modelUsed: modelId,
        analyzedAt: new Date().toISOString(),
        screenSummaries: summaries,
        navPresent,
        criticLog,
    };
}
