// visualRouter.ts - 2026-06-26
//
// C2 (surface-routed hybrid) from
// plans/nano-banana-designer-skill-runtime-images-2026-06-25.md.
//
// ONE per-slot decision: a DATA / relational slot routes to the deterministic vizEngine (precise
// labels, $0, anti-slop, token-pure); an EMOTIVE / conceptual slot routes to the brand-locked
// Nano-Banana DESIGNER skill (the existing /api/ai/illustration loop via artifactIllustrator).
// The user can pin the branch with the #img override (#img=diagram|generate|none).
//
// VISION COMPLIANCE (UNIFIED_VISION.md):
//   - Never-hardcode: this file holds ROUTING logic only. No colors / fonts / sizes / hexes. The
//     diagram branch themes from /api/design-tokens (vizSlot); the emotive branch's palette is
//     injected into the prompt from the same token mirror (proxy _illus_palette).
//   - SPA never calls Figma live: slot existence comes from the registry MIRROR (artifactImageSlots),
//     bounds from HERO_PANEL - never a live Figma call.
//   - Converge, don't build-new: the emotive branch delegates to the existing artifactIllustrator
//     loop (VS ideation -> Nano Banana -> knockout -> content-hash cache + reuse = C4). The diagram
//     branch is already handled synchronously at compose-time by vizSlot.attachViz.
//   - GATE before default (plan section 8): the generative (emotive) branch is OFF by default for
//     slots that are not already a human-approved surface (registry `wired:true`). #img=generate
//     forces it; setDesignerBranchEnabled(true) / localStorage flips the auto-default for UNWIRED
//     surfaces once the section-8 fidelity + anti-slop spikes pass.

import type { ImgDirective } from './hashtagParser';
import { imageSpecFor, type SlotBranch } from './artifactImageSlots';
import { hasAuthoredMeaning } from './vizSlot';
import { resolveArtifactImages } from './artifactIllustrator';
import { resolveArtifactIcons } from './artifactIconResolver';

export type VisualBranch = 'diagram' | 'emotive' | 'icon' | 'none';
export interface VisualRoute { branch: VisualBranch; reason: string; }

// ---- section-8 gate: the designer (generative) branch default for UNWIRED surfaces -----------
// Default OFF per the plan. A human flips it on (after the brand-fidelity + anti-slop spikes) via
// setDesignerBranchEnabled(true) or localStorage['hic.designer.branch']='on'. Wired surfaces
// (registry wired:true, e.g. journey-map) are already approved and do not depend on this flag.
let _designerOverride: boolean | undefined;
export function setDesignerBranchEnabled(v: boolean | undefined): void { _designerOverride = v; }
export function isDesignerBranchEnabled(): boolean {
    if (typeof _designerOverride === 'boolean') return _designerOverride;
    try {
        if (typeof localStorage !== 'undefined') {
            const v = localStorage.getItem('hic.designer.branch');
            if (v) return v === 'on' || v === 'true' || v === '1';
        }
    } catch { /* non-browser context */ }
    return false; // GATED OFF by default (plan section 8: verify-before-default)
}

export interface RouteSlotOpts {
    artifact?: string;          // deliverable / template id (e.g. 'competitive-matrix', 'slides:cover')
    mode?: string;              // registry slot mode (panel | hero | per-element | glyph | none)
    branch?: SlotBranch;        // the GOLD-audit per-slot decision (authoritative auto; #img still wins)
    slotWired?: boolean;        // renderer twin reads this carrier today (existing human-approved surface)
    hasAuthoredData?: boolean;  // payload carries viz meaning (labels / links / stages / scores...)
    override?: ImgDirective;    // parsed #img directive
    designerEnabled?: boolean;  // explicit override of the section-8 gate (else isDesignerBranchEnabled())
}

/** Decide which branch fills a slot. Pure + deterministic - the tested contract for C2.
 *  Precedence: explicit #img override > GOLD-audit branch > content/heuristic fallback. */
export function routeSlot(o: RouteSlotOpts): VisualRoute {
    // 1) Explicit user override always wins.
    if (o.override === 'none') return { branch: 'none', reason: '#img=none (user suppressed slot art)' };
    if (o.override === 'diagram') return { branch: 'diagram', reason: '#img=diagram (forced deterministic viz)' };
    if (o.override === 'icon') return { branch: 'icon', reason: '#img=icon (forced tokenized glyph)' };
    if (o.override === 'generate') return { branch: 'emotive', reason: '#img=generate (forced designer skill)' };

    // 2) Registry says image-free -> never generate.
    const spec = imageSpecFor(o.artifact);
    const mode = o.mode ?? spec?.mode;
    if (!mode || mode === 'none') return { branch: 'none', reason: `${o.artifact || 'slot'}: no registered slot / image-free` };

    const enabled = typeof o.designerEnabled === 'boolean' ? o.designerEnabled : isDesignerBranchEnabled();
    const gateEmotive = (reason: string): VisualRoute =>
        (o.slotWired || enabled)
            ? { branch: 'emotive', reason }
            : { branch: 'none', reason: 'emotive slot but designer branch gated off (section 8); use #img=generate to force' };

    // 3) The verified GOLD audit is the authoritative auto decision.
    const audit = o.branch ?? spec?.branch;
    if (audit) {
        if (audit === 'none') return { branch: 'none', reason: `${o.artifact}: registered image-free (audit)` };
        if (audit === 'icon') return { branch: 'icon', reason: `${o.artifact}: audit -> tokenized glyph (deterministic, $0)` };
        if (audit === 'chart') return { branch: 'diagram', reason: `${o.artifact}: audit -> content-true diagram (vizEngine)` };
        if (audit === 'emotive') return gateEmotive(`${o.artifact}: audit -> emotive (designer skill)`);
    }

    // 4) Heuristic fallback when the registry carries no audit branch.
    if ((mode === 'panel' || mode === 'hero') && o.hasAuthoredData) {
        return { branch: 'diagram', reason: 'authored data on a single panel -> content-true diagram (vizEngine)' };
    }
    if (mode === 'glyph') return { branch: 'icon', reason: 'glyph slot -> tokenized icon' };
    return gateEmotive('emotive slot (heuristic) -> designer skill');
}

export interface ResolveRoutedOpts {
    override?: ImgDirective;
    designerEnabled?: boolean;
    industry?: string;          // run industry -> icon selection + viz domain form
    onLog?: (msg: string) => void;
}
export interface RoutedResult { branch: VisualBranch; count: number; reason: string; }

/** Per-slide entry the chat seam calls. Routes the decision, then RESOLVES it:
 *   - icon    -> the tokenized glyph library (deterministic, $0, synchronous).
 *   - emotive -> the existing Nano-Banana loop (artifactIllustrator), which caches + reuses (C4).
 *   - diagram -> the slide-level panel is filled synchronously by vizSlot.attachViz at compose-time;
 *                here the per-artifact carrier is filled too when authored data is present.
 *   - none    -> nothing.
 *  Reads slot meaning from the payload's viz block (or top level). Fail-open: returns count 0 on
 *  any failure. */
export async function resolveRoutedSlotImages(
    artifact: string,
    payload: Record<string, unknown>,
    brand: string,
    theme: string,
    opts: ResolveRoutedOpts = {},
): Promise<RoutedResult> {
    const spec = imageSpecFor(artifact);
    const vizSrc = (payload && typeof (payload as any).viz === 'object') ? (payload as any).viz : payload;
    const route = routeSlot({
        artifact,
        mode: spec?.mode,
        branch: spec?.branch,
        slotWired: !!spec?.wired,
        hasAuthoredData: hasAuthoredMeaning(vizSrc),
        override: opts.override,
        designerEnabled: opts.designerEnabled,
    });
    try {
        if (route.branch === 'icon') {
            const n = resolveArtifactIcons(artifact, payload, brand, theme, opts.industry, opts.onLog);
            return { branch: 'icon', count: n, reason: route.reason };
        }
        if (route.branch === 'emotive') {
            const n = await resolveArtifactImages(artifact, payload, brand, theme, opts.onLog);
            return { branch: 'emotive', count: n, reason: route.reason };
        }
        // diagram + none: no async carrier fill here (slide panels are handled at compose by attachViz).
        return { branch: route.branch, count: 0, reason: route.reason };
    } catch {
        return { branch: route.branch, count: 0, reason: route.reason };
    }
}
