// auditCritiqueDeck.ts
//
// 2026-07-07 - Heuristic-audit uplift Phase 1 (owner directive, plan
// heuristic-audit-live-prototype-uplift-2026-07-05.md): after the AI-powered analysis of
// uploaded screens + the supplied website URL, the DEFAULT result surface is the designer
// chat carrying a nicely formatted #slides CRITIQUE DECK - one slide per screen with THAT
// screen's screenshot and its evidence-bound findings - followed by a #proto runtime path
// that compiles the modernized interactive prototype from the Figma design-system patterns.
//
// This module composes that deck DETERMINISTICALLY from the HeuristicReport the vision
// model already produced: no second model call for formatting (composition from payload is
// the HiC way; the critique substance is the model's, the geometry is the registry's).
// Emits standard :::slide fences (template=slides:*) that CorpusChatPanel.parseSlideBlocks
// lifts into SlideCanvas previews and the GOLD exporter walks into native editable PPTX;
// screenshots ride as data-URIs so they export as native swappable pictures.

import { HeuristicReport, HeuristicFinding, HEURISTIC_DIMENSION_LABELS, HeuristicDimensionId } from '../types';
import { stripEmDashes, removeMetaNarration } from './slidePostProcessor';
import { brandTokens } from './slideToStageHtml';

/** One audited screen: the display name + the data-URI the slide image region paints.
 *  2026-07-08 elevation: the App seam enriches each screen with its natural ASPECT
 *  (w/h, for deterministic marker placement), average LUMINANCE (0-1, drives the
 *  cover variant: bright UI screenshots go in the framed hero panel, dark/editorial
 *  scenes go full-bleed under the scrim), and optionally the PROPOSED experience
 *  render (native tokenized proto/* composition from the proxy, never diffusion). */
export interface AuditScreen {
    name: string;       // "Screen 3" (upload) or "example.com · mobile 390px" (capture)
    dataUri: string;    // data:image/...;base64,...
    aspect?: number;    // natural width / height
    luminance?: number; // 0 (black) .. 1 (white)
    /** The screenshot with the numbered finding discs BAKED into its pixels
     *  (bakeScreenAnnotations). Baked because the PPTX GEO walker layers pictures above
     *  shape overlays, so overlay discs cannot survive export; pixels always do. */
    annotatedDataUri?: string;
    proposedRender?: string;     // data-URI of the native proposed-experience render
    proposedRationale?: string;  // one-sentence WHAT CHANGES statement
}

const SEVERITY_LABEL: Record<number, string> = {
    4: 'CRITICAL', 3: 'MAJOR', 2: 'MINOR', 1: 'COSMETIC', 0: 'NOTE',
};

// Short dimension tags for the per-finding label line (full labels are too long there).
const DIMENSION_SHORT: Record<HeuristicDimensionId, string> = {
    traditional_usability: 'USABILITY',
    accessibility: 'ACCESSIBILITY',
    visual_design: 'VISUAL DESIGN',
    conversational_ai: 'AI PATTERNS',
    trust_architecture: 'TRUST',
    agentic_commerce: 'AGENTIC COMMERCE',
    social_commerce: 'SOCIAL COMMERCE',
    geo_optimization: 'GEO',
};

// v2 (2026-07-08): 3 per slide - the 4-at-186px layout collided (3-line descriptions
// overran the fix line); 3 at 240px pitch gives every cell collision-free worst-case room.
const MAX_FINDINGS_PER_SLIDE = 3;
// Cover-variant threshold: screenshots brighter than this go in the framed hero panel
// (white display type over a 52%-washed WHITE dashboard is illegible - live-deck audit).
const BRIGHT_COVER_LUMINANCE = 0.55;

/** Output-rule sanitation for every user-visible string: meta-narration scrub (the model
 *  occasionally narrates the artifact or the design process despite the prompt ban;
 *  live-caught 2026-07-08) + em-dash ban + whitespace. */
function clean(s: string | undefined | null): string {
    return stripEmDashes(removeMetaNarration(String(s || ''))).replace(/\s+/g, ' ').trim();
}

function fence(template: string, payload: Record<string, unknown>): string {
    return `:::slide template=${template} brand=nxt\n${JSON.stringify(payload)}\n:::`;
}

/** First sentence of the executive summary, used as the cover judgment. Capped at 88 chars
 *  so it fits BOTH cover variants (the boxed variant's narrowed title column wraps a long
 *  sentence into the subtitle - live-deck audit 2026-07-08). */
function coverTitle(report: HeuristicReport): string {
    const first = clean(report.executiveSummary?.summary).split(/(?<=[.!?])\s+/)[0] || '';
    if (first && first.length >= 20 && first.length <= 88) return first.replace(/[.!?]$/, '');
    return `Where the ${clean(report.brief.productName)} experience helps users and where it fails them`;
}

function findingCell(f: HeuristicFinding, num: number) {
    return {
        number: String(num).padStart(2, '0'),
        severityLabel: `${SEVERITY_LABEL[f.severity] ?? 'NOTE'} · ${DIMENSION_SHORT[f.dimension] || 'USABILITY'}`,
        heading: clean(f.title),
        body: clean(f.description),
        fix: clean(f.recommendation),
    };
}

/** Compose the full critique-deck chat reply (fences + a #proto call-to-action coda).
 *  `screens` is index-aligned to the 1-based screenshotRefs the findings carry. */
export function buildCritiqueDeckReply(report: HeuristicReport, screens: AuditScreen[]): string {
    const product = clean(report.brief.productName) || 'The product';
    const slides: string[] = [];

    // 1. Cover, luminance-aware (live-deck audit 2026-07-08): a BRIGHT UI screenshot can
    //    never carry white display type even under the scrim, so it rides the framed hero
    //    panel on the dark canvas instead; dark/editorial scenes keep the full-bleed scrim.
    const cover = screens[0];
    const coverBright = (cover?.luminance ?? 0) > BRIGHT_COVER_LUMINANCE;
    slides.push(fence('slides:cover', {
        title: coverTitle(report),
        // Subject-focused subtitle (2026-07-08 meta-narration fix): describes the USERS'
        // situation, never the deliverable ("critique of..." named the artifact itself).
        subtitle: `Where users of the current ${product} experience succeed, struggle, and leave · WCAG 2.2 AA lens`,
        ...(coverBright
            ? { heroImage: cover?.dataUri || '' }
            : { backgroundImage: cover?.dataUri || '' }),
    }));

    // 2. Top issues (up to 4, severity-ranked) as the numbered-themes archetype.
    const top = (report.executiveSummary?.topIssues || []).slice(0, 4);
    if (top.length >= 2) {
        slides.push(fence('slides:numbered-themes', {
            kicker: 'WHAT MATTERS MOST',
            title: 'A small set of severe issues causes most of the user friction',
            items: top.map((f, i) => ({
                number: String(i + 1).padStart(2, '0'),
                name: clean(f.title),
                body: clean(f.description),
                quote: `${SEVERITY_LABEL[f.severity] ?? 'NOTE'} · ${clean(HEURISTIC_DIMENSION_LABELS[f.dimension] || '')}`,
            })),
            sourceLine: `Source: AI heuristic review (${report.modelUsed}) of the supplied screens`,
        }));
    }

    // 3. Per-screen critique slides. v2 (2026-07-08, live-deck audit): a finding renders on
    //    its PRIMARY screen ONLY (screenshotRefs[0]) - the v1 includes() placement repeated
    //    broad findings on every referenced screen, which is exactly the "annotations aren't
    //    matched to the right screens" failure. Findings are numbered per screen; the numbers
    //    match the callout discs the composer overlays at each finding's marker coordinates.
    const summaryByScreen = new Map<number, { verdict?: string }>();
    for (const s of report.screenSummaries || []) summaryByScreen.set(s.screenshot, s);
    screens.forEach((screen, idx) => {
        const ref = idx + 1;  // screenshotRefs are 1-indexed
        // READING-ORDER numbering (2026-07-08 root-cause fix): the list order matches the
        // discs' top-to-bottom order on the screenshot - the single ordering authority.
        const mine = orderFindingsForScreen(report, ref);
        if (mine.length === 0) return;
        const verdict = clean(summaryByScreen.get(ref)?.verdict);
        for (let start = 0; start < mine.length; start += MAX_FINDINGS_PER_SLIDE) {
            const chunk = mine.slice(start, start + MAX_FINDINGS_PER_SLIDE);
            const cont = start > 0;
            slides.push(fence('slides:screen-critique', {
                kicker: `SCREEN ${String(ref).padStart(2, '0')} · ${clean(screen.name).toUpperCase()}${cont ? ' · CONTINUED' : ''}`,
                title: verdict || clean(chunk[0].title),
                // 2026-07-08 v3: the numbered discs are BAKED into the screenshot pixels
                // (annotatedDataUri, canvas-composited in the App seam) because the PPTX
                // GEO walker layers pictures above shape overlays - baked pixels survive
                // every surface identically. The raw screenshot is the fallback.
                screenImage: screen.annotatedDataUri || screen.dataUri,
                imageAspect: screen.aspect,
                findings: chunk.map((f, j) => findingCell(f, start + j + 1)),
                sourceLine: `Source: AI heuristic review (${report.modelUsed}) · severity on the Nielsen 0-4 scale`,
            }));
        }
        // 3b. Side-by-side redesign slide (owner directive): CURRENT annotated screenshot vs
        //     the PROPOSED experience - a native tokenized composition from the registered
        //     Figma proto/* pattern catalog (rendered by the proxy; fail-open when absent).
        //     STRING DISCIPLINE (2026-07-08, user-flagged meta-narration): every visible
        //     string is about the SUBJECT (the screen and its users), never the artifact,
        //     its panels, or the design process. The takeaway falls back to the findings'
        //     own imperative fixes; the process-reference source line is GONE.
        if (screen.proposedRender) {
            const rationale = clean(screen.proposedRationale);
            const topFixes = mine.slice(0, 2).map(f => clean(f.recommendation)).filter(Boolean).join(' ');
            // Numbered legend (user-flagged 2026-07-08): decode the baked discs ON this
            // slide - same reading-order numbers, short finding titles.
            const legend = mine.slice(0, 4)
                .map((f, i) => `${String(i + 1).padStart(2, '0')} ${clean(f.title)}`)
                .join('  ·  ');
            slides.push(fence('slides:screen-redesign', {
                kicker: `SCREEN ${String(ref).padStart(2, '0')} · ${clean(screen.name).toUpperCase()} · PROPOSED`,
                title: (rationale && rationale.length <= 96)
                    ? rationale
                    : 'Stronger contrast, clearer structure, and a visible next step',
                currentImage: screen.annotatedDataUri || screen.dataUri,
                currentAspect: screen.aspect,
                legend,
                proposedImage: screen.proposedRender,
                takeaway: {
                    label: 'WHAT CHANGES',
                    statement: (rationale && rationale.length > 96)
                        ? rationale
                        : (topFixes || 'Contrast, structure, and the next step are rebuilt with design-system patterns.'),
                },
            }));
        }
    });

    // 4. Closing thesis: the summary's final judgment.
    const sentences = clean(report.executiveSummary?.summary).split(/(?<=[.!?])\s+/).filter(Boolean);
    const thesis = sentences[sentences.length - 1] || `${product} can meet its users with a faster, clearer, accessible experience.`;
    slides.push(fence('slides:thesis-interstitial', {
        kicker: 'THE PATH FORWARD',
        thesis,
    }));

    const coda = [
        'The critique deck above covers every reviewed screen. Each slide pairs the actual screen with its evidence-bound findings and the concrete fix.',
        'Type #proto to compile an interactive prototype of the modernized experience: a better, more accessible version of what these screens implied, composed from the NXT design-system patterns and tokens.',
    ].join('\n\n');

    return `${slides.join('\n\n')}\n\n${coda}`;
}

/** ONE ordering authority for a screen's findings (2026-07-08 root-cause fix, user-flagged
 *  swapped annotations): findings are ordered by READING POSITION on the screenshot
 *  (marker y, then x), so the numbers 01..N always DESCEND the image and each disc is
 *  adjacent to the content its finding names. Severity stays visible in every finding's
 *  label; it no longer drives the numbering (severity order put 02 above 01 on the image,
 *  which read as mixed-up annotations). Findings without a marker keep their relative
 *  severity order and number AFTER the marked ones. Shared by the deck builder, the disc
 *  baker, and the dashboard so all surfaces agree. */
export function orderFindingsForScreen(report: HeuristicReport, ref: number): HeuristicFinding[] {
    const mine = report.findings.filter(f => (f.screenshotRefs || [])[0] === ref);
    const marked = mine
        .filter(f => f.marker && Number.isFinite(f.marker.x) && Number.isFinite(f.marker.y))
        .sort((a, b) => (a.marker!.y - b.marker!.y) || (a.marker!.x - b.marker!.x));
    const unmarked = mine
        .filter(f => !(f.marker && Number.isFinite(f.marker.x) && Number.isFinite(f.marker.y)))
        .sort((a, b) => b.severity - a.severity);
    return [...marked, ...unmarked];
}

/** Numbered markers for a screen, in the SAME order orderFindingsForScreen numbers the list. */
export function screenMarkers(report: HeuristicReport, ref: number): { n: string; x: number; y: number }[] {
    return orderFindingsForScreen(report, ref)
        .map((f, i) => (f.marker && Number.isFinite(f.marker.x) && Number.isFinite(f.marker.y)
            ? { n: String(i + 1).padStart(2, '0'), x: Math.max(2, Math.min(98, f.marker.x)), y: Math.max(2, Math.min(98, f.marker.y)) }
            : null))
        .filter((m): m is { n: string; x: number; y: number } => !!m);
}

/** Pure geometry for the disc positions on an image of natural size w x h. De-collision is a
 *  side-by-side CLUSTER at the shared anchor (map-pin convention), NEVER a vertical
 *  relocation: the 2026-07-08 live deck proved a downward nudge parks the disc on a
 *  DIFFERENT element's content (the swapped-annotation bug's second half). Exported for tests. */
export function markerPositions(
    markers: { n: string; x: number; y: number }[],
    w: number, h: number, d: number,
): { n: string; px: number; py: number }[] {
    const placed: { n: string; px: number; py: number }[] = [];
    const half = Math.ceil(d / 2);
    const clamp = (v: number, max: number) => Math.max(half, Math.min(max - half, v));
    const sorted = markers.slice(0, 12).map(m => ({
        n: m.n,
        px: clamp(Math.round(m.x / 100 * w), w),
        py: clamp(Math.round(m.y / 100 * h), h),
    })).sort((a, b) => a.py - b.py || a.px - b.px);
    const collides = (px: number, py: number) =>
        placed.some(p => Math.abs(p.px - px) < d + 4 && Math.abs(p.py - py) < d + 4);
    for (const m of sorted) {
        if (collides(m.px, m.py)) {
            // slide horizontally beside the cluster, staying ON the shared anchor row:
            // try right first, then left; only if the whole row is occupied drop by ONE
            // disc height (still touching the anchor zone, never a far relocation).
            let placedOk = false;
            for (const dir of [1, -1]) {
                for (let step = 1; step <= 4 && !placedOk; step++) {
                    const px = clamp(m.px + dir * step * (d + 4), w);
                    if (!collides(px, m.py)) { m.px = px; placedOk = true; }
                }
                if (placedOk) break;
            }
            if (!placedOk) m.py = clamp(m.py + d + 4, h);
        }
        placed.push(m);
    }
    return placed;
}

/** Canvas-composite the numbered accent discs INTO the screenshot pixels. Disc colors come
 *  from the brand tokens (accent fill, paper ring, band-text numeral - never hardcoded).
 *  Fail-open: any decode/canvas failure returns the original dataUri untouched. */
export function annotateImageWithMarkers(
    dataUri: string,
    markers: { n: string; x: number; y: number }[],
    brand: 'nxt' | 'nu' = 'nxt',
): Promise<string> {
    if (!markers.length) return Promise.resolve(dataUri);
    return new Promise((resolve) => {
        try {
            const T = brandTokens(brand);
            const img = new Image();
            img.onload = () => {
                try {
                    const w = img.naturalWidth, h = img.naturalHeight;
                    if (!w || !h) { resolve(dataUri); return; }
                    const cv = document.createElement('canvas');
                    cv.width = w; cv.height = h;
                    const cx = cv.getContext('2d');
                    if (!cx) { resolve(dataUri); return; }
                    cx.drawImage(img, 0, 0);
                    // disc diameter scales with the image so it reads at slide size
                    const d = Math.max(28, Math.round(Math.min(w, h) * 0.055));
                    for (const m of markerPositions(markers, w, h, d)) {
                        cx.beginPath();
                        cx.arc(m.px, m.py, d / 2, 0, Math.PI * 2);
                        cx.fillStyle = T.accent;
                        cx.fill();
                        cx.lineWidth = Math.max(2, Math.round(d * 0.08));
                        cx.strokeStyle = T.paper;
                        cx.stroke();
                        cx.fillStyle = T.bandText;
                        cx.font = `700 ${Math.round(d * 0.48)}px ${T.bodyFont}`;
                        cx.textAlign = 'center';
                        cx.textBaseline = 'middle';
                        cx.fillText(m.n, m.px, m.py + Math.round(d * 0.03));
                    }
                    resolve(cv.toDataURL('image/jpeg', 0.88));
                } catch { resolve(dataUri); }
            };
            img.onerror = () => resolve(dataUri);
            img.src = dataUri;
        } catch { resolve(dataUri); }
    });
}

/** Bake the numbered discs into every screen that has marker-bearing findings. Mutates
 *  screens[i].annotatedDataUri; all fail-open. */
export async function bakeScreenAnnotations(report: HeuristicReport, screens: AuditScreen[], brand: 'nxt' | 'nu' = 'nxt'): Promise<void> {
    await Promise.all(screens.map(async (screen, idx) => {
        const markers = screenMarkers(report, idx + 1);
        if (!markers.length) return;
        try {
            const annotated = await annotateImageWithMarkers(screen.dataUri, markers, brand);
            if (annotated && annotated !== screen.dataUri) screen.annotatedDataUri = annotated;
        } catch { /* fail-open */ }
    }));
}

/** Measure a screenshot's natural aspect (w/h) + average luminance (0-1) in the browser.
 *  Drives deterministic marker placement (aspect) and the cover variant choice (luminance).
 *  Fail-open: any decode/canvas error returns {} and the deck renders without annotation
 *  geometry (markers skipped) and with the full-bleed cover default. */
export function analyzeScreenImage(dataUri: string): Promise<{ aspect?: number; luminance?: number }> {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.onload = () => {
                try {
                    const aspect = img.naturalWidth > 0 && img.naturalHeight > 0
                        ? img.naturalWidth / img.naturalHeight : undefined;
                    // downsample to 32x32 for a cheap average luminance
                    const cv = document.createElement('canvas');
                    cv.width = 32; cv.height = 32;
                    const cx = cv.getContext('2d');
                    if (!cx) { resolve({ aspect }); return; }
                    cx.drawImage(img, 0, 0, 32, 32);
                    const d = cx.getImageData(0, 0, 32, 32).data;
                    let sum = 0;
                    for (let i = 0; i < d.length; i += 4) {
                        sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
                    }
                    resolve({ aspect, luminance: sum / (d.length / 4) });
                } catch { resolve({}); }
            };
            img.onerror = () => resolve({});
            img.src = dataUri;
        } catch { resolve({}); }
    });
}

/** Serialized audit context for the designer chat (the corpus the #proto path grounds on). */
export function buildAuditChatCorpus(report: HeuristicReport, screens: AuditScreen[]): string {
    const b = report.brief;
    const lines: string[] = [
        `HEURISTIC AUDIT CONTEXT: ${clean(b.productName)} (${clean(b.experienceType).replace(/_/g, ' ')})`,
        b.productUrl ? `Live URL: ${b.productUrl}` : '',
        `Target audience: ${(b.targetAudience || []).join(', ')}`,
        `Business goals: ${(b.businessGoals || []).join(', ')}`,
        b.competitiveContext ? `Competitive context: ${clean(b.competitiveContext)}` : '',
        `Screens reviewed: ${screens.map((s, i) => `[${i + 1}] ${s.name}`).join('; ')}`,
        '',
        `EXECUTIVE SUMMARY: ${clean(report.executiveSummary?.summary)}`,
        '',
        'FINDINGS (severity 0-4, Nielsen scale):',
        ...report.findings.map(f =>
            `- [${SEVERITY_LABEL[f.severity] ?? 'NOTE'}] (${clean(HEURISTIC_DIMENSION_LABELS[f.dimension] || f.dimension)})` +
            ` screens ${(f.screenshotRefs || []).join(',')}: ${clean(f.title)}. ${clean(f.description)} FIX: ${clean(f.recommendation)}`),
        '',
        'PROTOTYPE DIRECTIVE: any #proto build in this conversation is the REMEDIATION of the findings above:',
        'a modern, accessible (WCAG 2.2 AA) reinterpretation of the reviewed experience. Resolve every',
        'CRITICAL and MAJOR finding by design; compose ONLY from the registered design-system patterns and',
        'tokens (never hardcoded values); keep the subject, audience, and business goals of the brief.',
    ];
    return lines.filter(Boolean).join('\n');
}
