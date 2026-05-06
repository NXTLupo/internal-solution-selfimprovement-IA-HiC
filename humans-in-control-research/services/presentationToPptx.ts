// presentationToPptx.ts
//
// 2026-05-06 — Bespoke per-section pptxgenjs builders that mirror the
// interactive presentation's design language as elegant, native, editable
// PowerPoint slides. NOT constrained to the existing slideTemplates inventory
// (those have a different layout vocabulary). Brand-aware for both NU and NXT.
//
// Design language (mirrors internal-solutions-presentation-renderer/src/sections/):
//   - Eyebrow label: small uppercase letter-spaced accent-color text
//     "SECTION 03 · BY THE NUMBERS"
//   - Section title: huge bold display with brand-period accent, e.g. "Evidence."
//   - Card: pale bg, optional 3px top accent border, no shadow
//   - Quote: 4px left accent border on pale bg, italic text, attribution + role
//   - Persona: name + role header, optional confidence pill, italic quote,
//     key fields list
//   - Journey stage: 3px top accent, step number, phase title, customer/
//     frontstage/backstage rows, fail/pain footer
//   - Recommendation: priority pill, title, rationale, metric pills column
//   - Roadmap horizon: 3px top accent (NOW=primary, NEXT=secondary, LATER=teal),
//     label + duration row, item list with confidence-coded left bars
//   - Source footer: small mono line at bottom

import type { PresentationPayload, BrandVariant } from './presentationTypes';

// --- Brand palettes (mirrors the renderer's CSS custom properties) ---
const NXT = {
    INK: '0D0D0D',
    PAPER: 'FFFFFF',
    PALE: 'F5F5F0',
    BODY: '333333',
    BODY_SOFT: '555555',
    MUTED: '999999',
    RULE: 'E0E0E0',
    ACCENT: 'B8B800',          // chartreuse — primary brand accent
    SECONDARY: '00B7C3',       // cyan
    NEGATIVE: 'CC6644',        // rust
    TEAL: '115054',
};

const NU = {
    INK: '0D0D0D',
    PAPER: 'FAF8F4',           // cream
    PALE: 'F2EFE7',
    BODY: '2A2A2A',
    BODY_SOFT: '4A4A4A',
    MUTED: '888888',
    RULE: 'D8D2C4',
    ACCENT: 'C8102E',          // NU red — primary brand accent
    SECONDARY: '6E54E0',       // violet
    NEGATIVE: 'CC6644',
    TEAL: '115054',
};

function palette(brand: BrandVariant) {
    return brand === 'NU' ? NU : NXT;
}

// --- Slide geometry constants ---
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN = 0.55;
const CONTENT_W = SLIDE_W - MARGIN * 2;
const FONT = 'Archivo';
const MONO = 'JetBrains Mono';

// --- Text helpers ---
function clip(s: string | undefined | null, max: number): string {
    if (!s) return '';
    const t = String(s).trim();
    return t.length > max ? t.substring(0, max - 1) + '…' : t;
}

function asArray<T>(v: T[] | undefined | null): T[] {
    return Array.isArray(v) ? v : [];
}

const PLACEHOLDER_RX = /^(\s*(none\s*(identified|specified|provided)?|n\/?a|not\s+(specified|provided|applicable|identified|available)|tbd|to\s+be\s+(determined|defined)|—|-|null|undefined|true|false|evidence\s+gap|needs\s+baseline|baseline\s+tbd)\s*\.?)$/i;
function meaningful(v: unknown): string {
    if (v == null || typeof v === 'boolean') return '';
    const s = String(v).trim();
    if (!s) return '';
    if (PLACEHOLDER_RX.test(s)) return '';
    return s;
}

// ---------------------------------------------------------------------------
// SHARED CHROME — eyebrow label, section title, source footer, card primitive
// ---------------------------------------------------------------------------

interface SectionCtx {
    pres: any;
    P: typeof NXT;
    sectionNumber: number;   // 1-indexed
    eyebrowLabel: string;
}

function buildSectionShell(ctx: SectionCtx, headlineText: string, headlinePeriodAccent = true): any {
    const { pres, P, sectionNumber, eyebrowLabel } = ctx;
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };

    // Eyebrow: "SECTION 03 · BY THE NUMBERS"
    const eyebrow = `SECTION ${String(sectionNumber).padStart(2, '0')}  ·  ${eyebrowLabel.toUpperCase()}`;
    slide.addText(eyebrow, {
        x: MARGIN, y: 0.45, w: CONTENT_W, h: 0.28,
        fontSize: 10, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 4,
    });

    // Section title with optional brand-period accent
    const trailingPeriod = headlinePeriodAccent && headlineText.endsWith('.');
    const main = trailingPeriod ? headlineText.slice(0, -1) : headlineText;
    const period = trailingPeriod ? '.' : '';
    if (period) {
        slide.addText([
            { text: main, options: { color: P.INK, bold: true } },
            { text: period, options: { color: P.ACCENT, bold: true } },
        ], {
            x: MARGIN, y: 0.78, w: CONTENT_W, h: 1.4,
            fontSize: 56, fontFace: FONT, charSpacing: -1.5, valign: 'top', lineSpacingMultiple: 1.0,
        });
    } else {
        slide.addText(clip(main, 220), {
            x: MARGIN, y: 0.78, w: CONTENT_W, h: 1.4,
            fontSize: 56, color: P.INK, fontFace: FONT, bold: true,
            charSpacing: -1.5, valign: 'top', lineSpacingMultiple: 1.0,
        });
    }

    return slide;
}

function addSourceFooter(slide: any, P: typeof NXT, sources: string[]) {
    const unique = Array.from(new Set(sources.filter(Boolean))).slice(0, 6);
    if (unique.length === 0) return;
    slide.addText(`Sources:  ${unique.join('  ·  ')}`, {
        x: MARGIN, y: SLIDE_H - 0.42, w: CONTENT_W, h: 0.28,
        fontSize: 9, color: P.MUTED, fontFace: MONO,
    });
}

function addCard(slide: any, P: typeof NXT, x: number, y: number, w: number, h: number, opts: { accent?: boolean; topAccent?: boolean; accentColor?: string } = {}) {
    const accentColor = opts.accentColor || P.ACCENT;
    slide.addShape('rect' as any, {
        x, y, w, h,
        fill: { color: P.PALE },
        line: { color: P.RULE, width: 0.5 },
    });
    if (opts.topAccent) {
        slide.addShape('rect' as any, { x, y, w, h: 0.06, fill: { color: accentColor } });
    } else if (opts.accent) {
        slide.addShape('rect' as any, { x, y, w: 0.06, h, fill: { color: accentColor } });
    }
}

function addPill(slide: any, P: typeof NXT, x: number, y: number, w: number, h: number, label: string, tone: 'accent' | 'muted' | 'secondary' = 'accent') {
    const fill = tone === 'accent' ? P.ACCENT : tone === 'secondary' ? P.SECONDARY : 'transparent';
    const textColor = tone === 'muted' ? P.MUTED : (P.ACCENT === 'B8B800' ? P.INK : P.PAPER);
    if (tone === 'muted') {
        slide.addShape('rect' as any, { x, y, w, h, line: { color: P.RULE, width: 0.5 } });
    } else {
        slide.addShape('rect' as any, { x, y, w, h, fill: { color: fill } });
    }
    slide.addText(label.toUpperCase(), {
        x, y, w, h,
        fontSize: 9, color: textColor, fontFace: FONT, bold: true,
        charSpacing: 2, align: 'center', valign: 'middle',
    });
}

// ---------------------------------------------------------------------------
// HERO SECTION — large centered title with period accent, optional subtitles
// ---------------------------------------------------------------------------

function buildHero(pres: any, section: any, P: typeof NXT, payloadTitle: string) {
    const slide = pres.addSlide();
    slide.background = { color: P.INK };

    // Tiny brand label top-left
    slide.addText('PRESENTATION', {
        x: MARGIN, y: 0.55, w: 4, h: 0.3,
        fontSize: 11, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 4,
    });

    const title = meaningful(section?.data?.title) || meaningful(payloadTitle) || 'Untitled';
    const trailingPeriod = title.endsWith('.');
    const main = trailingPeriod ? title.slice(0, -1) : title;
    const period = trailingPeriod ? '.' : '';

    if (period) {
        slide.addText([
            { text: main, options: { color: P.PAPER, bold: true } },
            { text: period, options: { color: P.ACCENT, bold: true } },
        ], {
            x: MARGIN, y: 1.5, w: CONTENT_W, h: 4.0,
            fontSize: 64, fontFace: FONT, charSpacing: -2, valign: 'middle', lineSpacingMultiple: 1.05,
        });
    } else {
        slide.addText(clip(main, 240), {
            x: MARGIN, y: 1.5, w: CONTENT_W, h: 4.0,
            fontSize: 64, color: P.PAPER, fontFace: FONT, bold: true,
            charSpacing: -2, valign: 'middle', lineSpacingMultiple: 1.05,
        });
    }

    const subs = asArray<string>(section?.data?.subtitle).map(meaningful).filter(Boolean);
    if (subs.length > 0) {
        slide.addText(subs.join('   /   '), {
            x: MARGIN, y: 5.7, w: CONTENT_W, h: 1.2,
            fontSize: 18, color: P.PAPER, fontFace: FONT,
            valign: 'top', lineSpacingMultiple: 1.4,
        });
    }
}

// ---------------------------------------------------------------------------
// CONTEXT — 3-column SCQA grid (Situation / Complication / Resolution)
// ---------------------------------------------------------------------------

function buildContext(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'The Situation' };
    const slide = buildSectionShell(ctx, 'Context.');
    const data = section?.data || {};

    const colW = (CONTENT_W - 0.3 * 2) / 3;
    const colY = 2.5;
    const colH = 4.2;

    const blocks: Array<[string, string, boolean]> = [
        ['SITUATION', meaningful(data.situation), false],
        ['COMPLICATION', meaningful(data.complication), true],   // accent column
        ['RESOLUTION', meaningful(data.resolution), false],
    ];

    blocks.forEach(([label, body, isAccent], i) => {
        const x = MARGIN + i * (colW + 0.3);
        addCard(slide, P, x, colY, colW, colH, isAccent ? { accent: true } : {});
        const insetL = isAccent ? 0.28 : 0.22;
        slide.addText(label, {
            x: x + insetL, y: colY + 0.25, w: colW - insetL - 0.15, h: 0.25,
            fontSize: 9, color: isAccent ? P.ACCENT : P.MUTED, fontFace: FONT, bold: true, charSpacing: 3,
        });
        slide.addText(clip(body, 600) || '—', {
            x: x + insetL, y: colY + 0.6, w: colW - insetL - 0.15, h: colH - 0.8,
            fontSize: 13, color: body ? P.BODY : P.MUTED, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.45,
        });
    });

    addSourceFooter(slide, P, asArray<any>(data.citations).map((c: any) => meaningful(c?.sourceName) || meaningful(c?.source)));
}

// ---------------------------------------------------------------------------
// THEMES — cluster grid (3-4 themes, equal weight) with optional pattern signal
// ---------------------------------------------------------------------------

function buildThemes(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'Strategic Themes' };
    const slide = buildSectionShell(ctx, 'What we found.');
    const data = section?.data || {};
    const themes = asArray<any>(data.themes).slice(0, 4);
    if (themes.length === 0) return;

    let topY = 2.5;
    const patternSignal = meaningful(data.patternSignal);
    if (patternSignal) {
        slide.addShape('rect' as any, { x: MARGIN, y: topY, w: CONTENT_W, h: 0.7, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x: MARGIN, y: topY, w: 0.06, h: 0.7, fill: { color: P.ACCENT } });
        slide.addText('CROSS-THEME PATTERN', {
            x: MARGIN + 0.18, y: topY + 0.08, w: CONTENT_W - 0.3, h: 0.2,
            fontSize: 8, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 2,
        });
        slide.addText(clip(patternSignal, 280), {
            x: MARGIN + 0.18, y: topY + 0.3, w: CONTENT_W - 0.3, h: 0.4,
            fontSize: 12, color: P.INK, fontFace: FONT, italic: true, valign: 'top',
        });
        topY += 0.9;
    }

    const cardH = SLIDE_H - 0.6 - topY;
    const colW = (CONTENT_W - 0.25 * (themes.length - 1)) / themes.length;
    const allSources: string[] = [];

    themes.forEach((t: any, i: number) => {
        const x = MARGIN + i * (colW + 0.25);
        addCard(slide, P, x, topY, colW, cardH, { topAccent: true });

        // Status pill (top of card)
        const status = meaningful(t.status);
        if (status) {
            const isPriority = status.toLowerCase() === 'priority';
            addPill(slide, P, x + 0.2, topY + 0.22, 0.85, 0.24, status, isPriority ? 'accent' : 'muted');
        }

        // Theme name
        const nameY = status ? topY + 0.6 : topY + 0.3;
        slide.addText(clip(meaningful(t.name), 110), {
            x: x + 0.2, y: nameY, w: colW - 0.4, h: 0.85,
            fontSize: 17, color: P.INK, fontFace: FONT, bold: true,
            charSpacing: -0.5, valign: 'top', lineSpacingMultiple: 1.2,
        });

        // Description
        const descY = nameY + 0.95;
        slide.addText(clip(meaningful(t.description), 380), {
            x: x + 0.2, y: descY, w: colW - 0.4, h: cardH - (descY - topY) - 0.7,
            fontSize: 11, color: P.BODY_SOFT, fontFace: FONT,
            valign: 'top', lineSpacingMultiple: 1.45,
        });

        // Signal arrow at bottom
        const signal = meaningful(t.signal);
        if (signal) {
            slide.addText(`→  ${clip(signal, 180)}`, {
                x: x + 0.2, y: topY + cardH - 0.55, w: colW - 0.4, h: 0.4,
                fontSize: 10, color: P.SECONDARY, fontFace: FONT, italic: true, valign: 'top',
            });
        }

        asArray<any>(t.citations).forEach((c: any) => {
            const n = meaningful(c?.sourceName) || meaningful(c?.source);
            if (n) allSources.push(n);
        });
    });

    addSourceFooter(slide, P, allSources);
}

// ---------------------------------------------------------------------------
// EVIDENCE — 3-4 stat tiles + optional convergent insight callout
// ---------------------------------------------------------------------------

function valueTypography(v: string): { fontSize: number; lineHeight: number } {
    const len = (v || '').length;
    if (len <= 5)  return { fontSize: 56, lineHeight: 1.0 };
    if (len <= 8)  return { fontSize: 44, lineHeight: 1.05 };
    if (len <= 12) return { fontSize: 30, lineHeight: 1.1 };
    if (len <= 18) return { fontSize: 22, lineHeight: 1.15 };
    return            { fontSize: 16, lineHeight: 1.25 };
}

function buildEvidence(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'By the Numbers' };
    const slide = buildSectionShell(ctx, 'Evidence.');
    const data = section?.data || {};
    const stats = asArray<any>(data.stats).slice(0, 4);
    if (stats.length === 0) return;

    const colW = (CONTENT_W - 0.25 * (stats.length - 1)) / stats.length;
    const cardY = 2.5;
    const insight = meaningful(data.convergentInsight);
    const cardH = insight ? 3.0 : 4.2;
    const accents = [P.ACCENT, P.SECONDARY, P.NEGATIVE, P.TEAL];

    const sources: string[] = [];

    stats.forEach((s: any, i: number) => {
        const x = MARGIN + i * (colW + 0.25);
        const accent = accents[i % accents.length];
        addCard(slide, P, x, cardY, colW, cardH, { topAccent: true, accentColor: accent });

        // Big value
        const valueText = meaningful(s.value) || '—';
        const typo = valueTypography(valueText);
        slide.addText(valueText, {
            x: x + 0.2, y: cardY + 0.3, w: colW - 0.4, h: 1.5,
            fontSize: typo.fontSize, color: accent, fontFace: FONT, bold: true,
            charSpacing: -1.5, valign: 'top', lineSpacingMultiple: typo.lineHeight,
        });

        // Label
        const labelY = cardY + 1.85;
        slide.addText(clip(meaningful(s.label), 140), {
            x: x + 0.2, y: labelY, w: colW - 0.4, h: 0.7,
            fontSize: 12, color: P.INK, fontFace: FONT, bold: true,
            valign: 'top', lineSpacingMultiple: 1.3,
        });

        // Context
        const ctxText = meaningful(s.context);
        if (ctxText) {
            slide.addText(clip(ctxText, 200), {
                x: x + 0.2, y: labelY + 0.75, w: colW - 0.4, h: 0.6,
                fontSize: 9.5, color: P.MUTED, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.45,
            });
        }

        // Source (mono, small)
        slide.addText(clip(meaningful(s.source), 80), {
            x: x + 0.2, y: cardY + cardH - 0.35, w: colW - 0.4, h: 0.25,
            fontSize: 8, color: P.MUTED, fontFace: MONO,
        });

        if (s.source) sources.push(meaningful(s.source));
    });

    if (insight) {
        const insightY = cardY + cardH + 0.2;
        slide.addShape('rect' as any, { x: MARGIN, y: insightY, w: CONTENT_W, h: 0.85, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x: MARGIN, y: insightY, w: 0.06, h: 0.85, fill: { color: P.ACCENT } });
        slide.addText('WHAT THIS MEANS', {
            x: MARGIN + 0.18, y: insightY + 0.1, w: CONTENT_W - 0.3, h: 0.2,
            fontSize: 9, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 2.5,
        });
        slide.addText(clip(insight, 320), {
            x: MARGIN + 0.18, y: insightY + 0.32, w: CONTENT_W - 0.3, h: 0.5,
            fontSize: 13, color: P.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4,
        });
    }

    addSourceFooter(slide, P, sources);
}

// ---------------------------------------------------------------------------
// QUOTES — vertical stack of left-bordered quote cards (1-3 per slide)
// ---------------------------------------------------------------------------

function buildQuotes(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'Voices from the Field' };
    const slide = buildSectionShell(ctx, 'What people are saying.');
    const quotes = asArray<any>(section?.data?.quotes).slice(0, 3);
    if (quotes.length === 0) return;

    const startY = 2.5;
    const totalH = SLIDE_H - 0.6 - startY;
    const cardH = (totalH - 0.3 * (quotes.length - 1)) / quotes.length;
    const sources: string[] = [];

    quotes.forEach((q: any, i: number) => {
        const y = startY + i * (cardH + 0.3);
        slide.addShape('rect' as any, { x: MARGIN, y, w: CONTENT_W, h: cardH, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x: MARGIN, y, w: 0.08, h: cardH, fill: { color: P.ACCENT } });

        const text = meaningful(q.text);
        slide.addText(`"${clip(text, 380)}"`, {
            x: MARGIN + 0.3, y: y + 0.25, w: CONTENT_W - 0.5, h: cardH - 0.85,
            fontSize: 18, color: P.INK, fontFace: FONT, italic: true,
            charSpacing: -0.3, valign: 'top', lineSpacingMultiple: 1.4,
        });

        const attribution = meaningful(q.attribution) || 'Anonymous';
        const role = meaningful(q.role);
        const attrLine = role ? `${attribution}  ·  ${role}` : attribution;
        slide.addText([
            { text: attribution, options: { bold: true, color: P.BODY } },
            ...(role ? [{ text: `   ·  ${role}`, options: { color: P.MUTED } }] : []),
        ], {
            x: MARGIN + 0.3, y: y + cardH - 0.55, w: CONTENT_W - 0.5, h: 0.25,
            fontSize: 12, fontFace: FONT,
        });
        slide.addText(clip(meaningful(q.source), 100), {
            x: MARGIN + 0.3, y: y + cardH - 0.3, w: CONTENT_W - 0.5, h: 0.22,
            fontSize: 9, color: P.MUTED, fontFace: MONO,
        });

        if (q.source) sources.push(meaningful(q.source));
    });

    addSourceFooter(slide, P, sources);
}

// ---------------------------------------------------------------------------
// PERSONAS — up to 3 persona cards in a row, each with name/role/quote/key fields
// ---------------------------------------------------------------------------

function buildPersonas(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'The People' };
    const slide = buildSectionShell(ctx, "Who's affected.");
    const personas = asArray<any>(section?.data?.personas).slice(0, 3);
    if (personas.length === 0) return;

    const cardY = 2.5;
    const cardH = SLIDE_H - 0.6 - cardY;
    const colW = (CONTENT_W - 0.25 * (personas.length - 1)) / personas.length;

    personas.forEach((p: any, i: number) => {
        const x = MARGIN + i * (colW + 0.25);
        const isAccent = i === 0;
        addCard(slide, P, x, cardY, colW, cardH, isAccent ? { accent: true } : {});
        const insetL = isAccent ? 0.28 : 0.22;

        // Name
        slide.addText(clip(meaningful(p.name), 60), {
            x: x + insetL, y: cardY + 0.25, w: colW - insetL - 0.15, h: 0.5,
            fontSize: 22, color: P.INK, fontFace: FONT, bold: true, charSpacing: -1, valign: 'top',
        });

        // Role
        slide.addText(clip(meaningful(p.role), 80), {
            x: x + insetL, y: cardY + 0.78, w: colW - insetL - 0.15, h: 0.3,
            fontSize: 11, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 0.5,
        });

        // Demographics (small)
        const demo = meaningful(p.demographics);
        let yy = cardY + 1.1;
        if (demo) {
            slide.addText(clip(demo, 100), {
                x: x + insetL, y: yy, w: colW - insetL - 0.15, h: 0.22,
                fontSize: 9, color: P.MUTED, fontFace: FONT,
            });
            yy += 0.28;
        }

        // Quote panel
        const quote = meaningful(p.quote);
        if (quote) {
            slide.addShape('rect' as any, { x: x + insetL, y: yy, w: 0.04, h: 0.95, fill: { color: P.SECONDARY } });
            slide.addText(`"${clip(quote, 200)}"`, {
                x: x + insetL + 0.15, y: yy, w: colW - insetL - 0.3, h: 0.95,
                fontSize: 11, color: P.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4,
            });
            yy += 1.05;
        }

        // Bio (short)
        const bio = meaningful(p.bio);
        if (bio && yy < cardY + cardH - 1.5) {
            slide.addText(clip(bio, 200), {
                x: x + insetL, y: yy, w: colW - insetL - 0.15, h: 0.7,
                fontSize: 10, color: P.BODY_SOFT, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4,
            });
            yy += 0.8;
        }

        // Key fields
        const fields: Array<[string, string]> = [
            ['TOP GOAL', meaningful(p.topGoal)],
            ['PAIN POINT', meaningful(p.topPainPoint)],
            ['MOTIVATION', meaningful(p.topMotivation)],
        ];
        for (const [k, v] of fields) {
            if (!v) continue;
            if (yy > cardY + cardH - 0.5) break;
            slide.addText(k, {
                x: x + insetL, y: yy, w: colW - insetL - 0.15, h: 0.18,
                fontSize: 7.5, color: P.MUTED, fontFace: FONT, bold: true, charSpacing: 1.5,
            });
            yy += 0.18;
            slide.addText(clip(v, 200), {
                x: x + insetL, y: yy, w: colW - insetL - 0.15, h: 0.45,
                fontSize: 10, color: P.INK, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35,
            });
            yy += 0.5;
        }
    });
}

// ---------------------------------------------------------------------------
// JOURNEY — horizontal stage strip, up to 5 stages
// ---------------------------------------------------------------------------

function buildJourney(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'Service Blueprint' };
    const slide = buildSectionShell(ctx, 'The journey.');
    const stages = asArray<any>(section?.data?.stages).slice(0, 5);
    if (stages.length === 0) return;

    const cardY = 2.5;
    const cardH = SLIDE_H - 0.6 - cardY;
    const colW = (CONTENT_W - 0.18 * (stages.length - 1)) / stages.length;

    stages.forEach((s: any, i: number) => {
        const x = MARGIN + i * (colW + 0.18);
        const fail = meaningful(s.failPoint);
        const pain = meaningful(s.painPoint);
        const accentBorder = fail ? P.NEGATIVE : P.RULE;

        slide.addShape('rect' as any, {
            x, y: cardY, w: colW, h: cardH,
            fill: { color: P.PALE },
            line: { color: accentBorder, width: fail ? 1 : 0.5 },
        });
        slide.addShape('rect' as any, { x, y: cardY, w: colW, h: 0.06, fill: { color: P.ACCENT } });

        // Step number eyebrow
        slide.addText(`STEP ${String(i + 1).padStart(2, '0')}`, {
            x: x + 0.18, y: cardY + 0.22, w: colW - 0.36, h: 0.22,
            fontSize: 8, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 2,
        });

        // Phase name
        const phase = meaningful(s.phase) || meaningful(s.customerAction) || `Stage ${i + 1}`;
        slide.addText(clip(phase, 90), {
            x: x + 0.18, y: cardY + 0.5, w: colW - 0.36, h: 0.6,
            fontSize: 13, color: P.INK, fontFace: FONT, bold: true,
            charSpacing: -0.3, valign: 'top', lineSpacingMultiple: 1.2,
        });

        // Optional duration + emotion line
        const subBits: string[] = [];
        const dur = meaningful(s.duration);
        const emo = meaningful(s.emotion);
        if (dur) subBits.push(dur);
        if (emo) subBits.push(emo);
        let yy = cardY + 1.15;
        if (subBits.length > 0) {
            slide.addText(subBits.join('  ·  '), {
                x: x + 0.18, y: yy, w: colW - 0.36, h: 0.22,
                fontSize: 9, color: P.SECONDARY, fontFace: FONT, italic: true,
            });
            yy += 0.3;
        }

        const rows: Array<[string, string]> = [
            ['CUSTOMER', meaningful(s.customerAction)],
            ['FRONTSTAGE', meaningful(s.frontstage)],
            ['BACKSTAGE', meaningful(s.backstage)],
            ['SUPPORT', meaningful(s.support)],
        ];
        for (const [k, v] of rows) {
            if (!v) continue;
            if (yy > cardY + cardH - 0.7) break;
            slide.addText(k, {
                x: x + 0.18, y: yy, w: colW - 0.36, h: 0.18,
                fontSize: 7.5, color: P.MUTED, fontFace: FONT, bold: true, charSpacing: 1.5,
            });
            slide.addText(clip(v, 130), {
                x: x + 0.18, y: yy + 0.18, w: colW - 0.36, h: 0.52,
                fontSize: 9, color: P.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3,
            });
            yy += 0.74;
        }

        if (fail || pain) {
            const ftrY = cardY + cardH - 0.55;
            slide.addShape('rect' as any, { x: x + 0.12, y: ftrY, w: colW - 0.24, h: 0.42, fill: { color: 'FFF4EA' } });
            slide.addText(fail ? `Fail: ${clip(fail, 110)}` : `Pain: ${clip(pain, 110)}`, {
                x: x + 0.18, y: ftrY + 0.04, w: colW - 0.36, h: 0.38,
                fontSize: 8.5, color: P.NEGATIVE, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3,
            });
        }
    });
}

// ---------------------------------------------------------------------------
// RECOMMENDATIONS — vertical stack of action cards, up to 4 per slide
// ---------------------------------------------------------------------------

function buildRecommendations(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'Coherent Actions' };
    const slide = buildSectionShell(ctx, 'What to do.');
    const recs = asArray<any>(section?.data?.recommendations).slice(0, 4);
    if (recs.length === 0) return;

    const startY = 2.5;
    const totalH = SLIDE_H - 0.6 - startY;
    const cardH = (totalH - 0.18 * (recs.length - 1)) / recs.length;
    const sources: string[] = [];

    recs.forEach((r: any, i: number) => {
        const y = startY + i * (cardH + 0.18);
        slide.addShape('rect' as any, { x: MARGIN, y, w: CONTENT_W, h: cardH, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x: MARGIN, y, w: 0.08, h: cardH, fill: { color: P.ACCENT } });

        const num = `ACTION ${String(i + 1).padStart(2, '0')}`;
        slide.addText(num, {
            x: MARGIN + 0.25, y: y + 0.18, w: 1.4, h: 0.22,
            fontSize: 8, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 2.5,
        });

        // Title
        const title = meaningful(r.actionTitle) || `Action ${i + 1}`;
        slide.addText(clip(title, 200), {
            x: MARGIN + 0.25, y: y + 0.4, w: CONTENT_W - 0.5 - 2.4, h: 0.55,
            fontSize: 16, color: P.INK, fontFace: FONT, bold: true,
            charSpacing: -0.5, valign: 'top', lineSpacingMultiple: 1.2,
        });

        // Rationale
        const rationale = meaningful(r.rationale);
        if (rationale) {
            slide.addText(clip(rationale, 380), {
                x: MARGIN + 0.25, y: y + 1.0, w: CONTENT_W - 0.5 - 2.4, h: cardH - 1.15,
                fontSize: 11, color: P.BODY_SOFT, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5,
            });
        }

        // Right-side metric stack
        const metrics: Array<[string, string]> = [
            ['IMPACT', meaningful(r.impactMetric)],
            ['WHEN', meaningful(r.timeframe)],
            ['OWNER', meaningful(r.owner)],
        ].filter(([_, v]) => v) as Array<[string, string]>;

        const mx = SLIDE_W - MARGIN - 2.2;
        metrics.forEach(([k, v], mi) => {
            const my = y + 0.22 + mi * 0.6;
            slide.addText(k, {
                x: mx, y: my, w: 2.2, h: 0.2,
                fontSize: 7.5, color: P.MUTED, fontFace: FONT, bold: true, charSpacing: 1.5,
            });
            slide.addText(clip(v, 90), {
                x: mx, y: my + 0.2, w: 2.2, h: 0.35,
                fontSize: 11, color: P.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.3,
            });
        });

        asArray<any>(r.evidence).forEach((e: any) => {
            const n = meaningful(e?.source) || meaningful(e?.sourceName);
            if (n) sources.push(n);
        });
    });

    addSourceFooter(slide, P, sources);
}

// ---------------------------------------------------------------------------
// ROADMAP — 3 horizon columns (NOW/NEXT/LATER), each with 3px top accent
// ---------------------------------------------------------------------------

function buildRoadmap(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'Sequencing' };
    const slide = buildSectionShell(ctx, 'The roadmap.');
    const horizons = asArray<any>(section?.data?.horizons).slice(0, 3);
    if (horizons.length === 0) return;

    const cardY = 2.5;
    const cardH = SLIDE_H - 0.6 - cardY;
    const colW = (CONTENT_W - 0.25 * (horizons.length - 1)) / horizons.length;
    const accents: Record<string, string> = { NOW: P.ACCENT, NEXT: P.SECONDARY, LATER: P.TEAL };

    horizons.forEach((h: any, i: number) => {
        const x = MARGIN + i * (colW + 0.25);
        const label = (meaningful(h.horizon) || meaningful(h.name) || `H${i + 1}`).toUpperCase();
        const accent = accents[label] || P.MUTED;

        slide.addShape('rect' as any, { x, y: cardY, w: colW, h: cardH, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x, y: cardY, w: colW, h: 0.06, fill: { color: accent } });

        // Header row: label left, duration right
        slide.addText(label, {
            x: x + 0.2, y: cardY + 0.22, w: colW * 0.55, h: 0.45,
            fontSize: 18, color: accent, fontFace: FONT, bold: true, charSpacing: 3, valign: 'middle',
        });
        const duration = meaningful(h.duration) || meaningful(h.timeframe);
        if (duration) {
            slide.addText(duration, {
                x: x + colW * 0.5, y: cardY + 0.28, w: colW * 0.4, h: 0.35,
                fontSize: 10, color: P.MUTED, fontFace: MONO, align: 'right', valign: 'middle',
            });
        }

        // Items
        const items = asArray<any>(h.initiatives).slice(0, 5);
        let yy = cardY + 0.85;
        items.forEach((init: any) => {
            if (yy > cardY + cardH - 0.5) return;
            const name = meaningful(init.name) || meaningful(init.title) || 'Initiative';
            const meta = [meaningful(init.successMetric), meaningful(init.owner)].filter(Boolean).join('  ·  ');
            const conf = String(init.confidence || '').toLowerCase();
            const barColor = conf === 'high' ? accent : conf === 'speculative' ? P.MUTED : P.RULE;

            slide.addShape('rect' as any, { x: x + 0.18, y: yy, w: 0.04, h: meta ? 0.7 : 0.45, fill: { color: barColor } });
            slide.addText(clip(name, 85), {
                x: x + 0.3, y: yy, w: colW - 0.45, h: 0.4,
                fontSize: 11, color: P.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.25,
            });
            if (meta) {
                slide.addText(clip(meta, 130), {
                    x: x + 0.3, y: yy + 0.4, w: colW - 0.45, h: 0.32,
                    fontSize: 8.5, color: P.MUTED, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3,
                });
                yy += 0.78;
            } else {
                yy += 0.55;
            }
        });
    });
}

// ---------------------------------------------------------------------------
// GAP ANALYSIS — list of capability gaps with current/target maturity bars
// ---------------------------------------------------------------------------

function buildGapAnalysis(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'Capability Gaps' };
    const slide = buildSectionShell(ctx, 'The gaps.');
    const gaps = asArray<any>(section?.data?.gaps).slice(0, 6);
    if (gaps.length === 0) return;

    const startY = 2.5;
    const rowH = (SLIDE_H - 0.6 - startY) / gaps.length;
    const sevColor: Record<string, string> = {
        critical: P.NEGATIVE, high: P.ACCENT, medium: P.SECONDARY, low: P.MUTED,
    };
    const scaleMax = 5;

    gaps.forEach((g: any, i: number) => {
        const y = startY + i * rowH;
        const sev = String(g.severity || 'medium').toLowerCase();
        const accent = sevColor[sev] || P.MUTED;

        slide.addShape('rect' as any, { x: MARGIN, y, w: CONTENT_W, h: rowH - 0.1, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x: MARGIN, y, w: 0.06, h: rowH - 0.1, fill: { color: accent } });

        // Capability + severity pill
        slide.addText(clip(meaningful(g.capability), 120), {
            x: MARGIN + 0.2, y: y + 0.15, w: CONTENT_W - 4.5, h: 0.4,
            fontSize: 14, color: P.INK, fontFace: FONT, bold: true, valign: 'top',
        });
        addPill(slide, P, MARGIN + 0.2, y + rowH - 0.55, 1.1, 0.26, sev, sev === 'critical' || sev === 'high' ? 'accent' : 'muted');

        // Impact text
        const impact = meaningful(g.impact);
        if (impact) {
            slide.addText(clip(impact, 280), {
                x: MARGIN + 0.2, y: y + 0.55, w: CONTENT_W - 4.5, h: rowH - 1.1,
                fontSize: 10, color: P.BODY_SOFT, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4,
            });
        }

        // Maturity bars on the right
        const cur = Math.max(0, Math.min(scaleMax, Number(g.currentMaturity) || 0));
        const tgt = Math.max(0, Math.min(scaleMax, Number(g.targetMaturity) || 0));
        const barX = SLIDE_W - MARGIN - 4.0;
        const barW = 3.8;
        const dotW = barW / scaleMax;

        slide.addText('CURRENT', { x: barX, y: y + 0.15, w: 0.9, h: 0.18, fontSize: 7.5, color: P.MUTED, fontFace: FONT, bold: true, charSpacing: 1.5 });
        for (let k = 0; k < scaleMax; k++) {
            slide.addShape('rect' as any, {
                x: barX + 0.95 + k * dotW * 0.6, y: y + 0.18, w: dotW * 0.55, h: 0.16,
                fill: { color: k < cur ? accent : P.RULE },
            });
        }
        slide.addText('TARGET', { x: barX, y: y + 0.45, w: 0.9, h: 0.18, fontSize: 7.5, color: P.MUTED, fontFace: FONT, bold: true, charSpacing: 1.5 });
        for (let k = 0; k < scaleMax; k++) {
            slide.addShape('rect' as any, {
                x: barX + 0.95 + k * dotW * 0.6, y: y + 0.48, w: dotW * 0.55, h: 0.16,
                fill: { color: k < tgt ? P.SECONDARY : P.RULE },
            });
        }
    });
}

// ---------------------------------------------------------------------------
// TECH ARCH — layered groupings of nodes
// ---------------------------------------------------------------------------

function buildTechArch(pres: any, section: any, P: typeof NXT, sectionNumber: number) {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: 'Architecture' };
    const slide = buildSectionShell(ctx, 'The architecture.');
    const layers = asArray<any>(section?.data?.layers).slice(0, 5);
    if (layers.length === 0) return;

    const startY = 2.5;
    const layerH = (SLIDE_H - 0.6 - startY) / layers.length;
    layers.forEach((l: any, i: number) => {
        const y = startY + i * layerH;
        slide.addShape('rect' as any, { x: MARGIN, y, w: CONTENT_W, h: layerH - 0.12, fill: { color: P.PALE } });
        slide.addText(clip(meaningful(l.name) || `Layer ${i + 1}`, 60), {
            x: MARGIN + 0.2, y: y + 0.15, w: 2.5, h: 0.4,
            fontSize: 13, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 1.5,
        });
        const nodes = asArray<any>(l.nodes).slice(0, 5);
        const nodeStartX = MARGIN + 2.9;
        const nodeW = (CONTENT_W - 2.9 - 0.15 * (nodes.length - 1)) / Math.max(nodes.length, 1);
        nodes.forEach((n: any, j: number) => {
            const nx = nodeStartX + j * (nodeW + 0.15);
            slide.addShape('rect' as any, { x: nx, y: y + 0.15, w: nodeW, h: layerH - 0.42, line: { color: P.RULE, width: 0.5 }, fill: { color: P.PAPER } });
            slide.addText(clip(meaningful(n.name) || 'Node', 60), {
                x: nx + 0.1, y: y + 0.2, w: nodeW - 0.2, h: 0.32,
                fontSize: 10.5, color: P.INK, fontFace: FONT, bold: true, valign: 'top',
            });
            const desc = meaningful(n.description);
            if (desc) {
                slide.addText(clip(desc, 120), {
                    x: nx + 0.1, y: y + 0.55, w: nodeW - 0.2, h: layerH - 0.85,
                    fontSize: 9, color: P.BODY_SOFT, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35,
                });
            }
        });
    });
}

// ---------------------------------------------------------------------------
// COMPETITIVE & TEAM & generic — fall back to a clean list slide
// ---------------------------------------------------------------------------

function buildList(pres: any, section: any, P: typeof NXT, sectionNumber: number, eyebrow: string, headline: string, listKey: string, titleField = 'name', bodyField = 'description') {
    const ctx: SectionCtx = { pres, P, sectionNumber, eyebrowLabel: eyebrow };
    const slide = buildSectionShell(ctx, headline);
    const items = asArray<any>(section?.data?.[listKey]).slice(0, 5);
    if (items.length === 0) {
        const narrative = meaningful(section?.data?.narrative) || meaningful(section?.data?.description);
        if (narrative) {
            slide.addText(narrative, {
                x: MARGIN, y: 2.5, w: CONTENT_W, h: 4.2, fontSize: 14, color: P.BODY,
                fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.55,
            });
        }
        return;
    }
    const startY = 2.5;
    const itemH = (SLIDE_H - 0.6 - startY) / items.length;
    items.forEach((it: any) => {
        slide.addShape('rect' as any, { x: MARGIN, y: startY, w: 0.06, h: itemH - 0.15, fill: { color: P.ACCENT } });
        const title = meaningful(it[titleField]) || meaningful(it.name) || meaningful(it.title) || 'Item';
        slide.addText(clip(title, 140), {
            x: MARGIN + 0.2, y: startY, w: CONTENT_W - 0.2, h: 0.38,
            fontSize: 14, color: P.INK, fontFace: FONT, bold: true, valign: 'top',
        });
        const body = meaningful(it[bodyField]) || meaningful(it.summary) || meaningful(it.position);
        if (body) {
            slide.addText(clip(body, 350), {
                x: MARGIN + 0.2, y: startY + 0.42, w: CONTENT_W - 0.2, h: itemH - 0.6,
                fontSize: 11, color: P.BODY_SOFT, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.45,
            });
        }
    });
}

// ---------------------------------------------------------------------------
// CTA — large centered title with brand-period accent (mirror hero)
// ---------------------------------------------------------------------------

function buildCta(pres: any, section: any, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.INK };

    slide.addText('NEXT STEPS', {
        x: MARGIN, y: 0.55, w: 4, h: 0.3,
        fontSize: 11, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 4,
    });

    const titleStr = meaningful(section?.data?.title) || 'Get in touch.';
    const trailingPeriod = titleStr.endsWith('.');
    const main = trailingPeriod ? titleStr.slice(0, -1) : titleStr;
    const period = trailingPeriod ? '.' : '';
    if (period) {
        slide.addText([
            { text: main, options: { color: P.PAPER, bold: true } },
            { text: period, options: { color: P.ACCENT, bold: true } },
        ], {
            x: MARGIN, y: 1.8, w: CONTENT_W, h: 3.2,
            fontSize: 64, fontFace: FONT, charSpacing: -2, valign: 'middle', lineSpacingMultiple: 1.05, align: 'center',
        });
    } else {
        slide.addText(main, {
            x: MARGIN, y: 1.8, w: CONTENT_W, h: 3.2,
            fontSize: 64, color: P.PAPER, fontFace: FONT, bold: true,
            charSpacing: -2, valign: 'middle', lineSpacingMultiple: 1.05, align: 'center',
        });
    }

    const desc = meaningful(section?.data?.description);
    if (desc) {
        slide.addText(clip(desc, 360), {
            x: MARGIN + 1.5, y: 5.3, w: CONTENT_W - 3, h: 1.0,
            fontSize: 16, color: P.PAPER, fontFace: FONT, valign: 'top',
            align: 'center', lineSpacingMultiple: 1.45,
        });
    }

    const email = meaningful(section?.data?.email);
    const url = meaningful(section?.data?.primaryActionUrl);
    const cta = email || url;
    if (cta) {
        slide.addText(cta, {
            x: MARGIN + 1.5, y: 6.4, w: CONTENT_W - 3, h: 0.5,
            fontSize: 18, color: P.ACCENT, fontFace: FONT, bold: true,
            align: 'center', valign: 'middle',
        });
    }
}

// ---------------------------------------------------------------------------
// MAIN ENTRY
// ---------------------------------------------------------------------------

export async function exportPresentationToPptx(payload: PresentationPayload): Promise<void> {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';

    const brand = (payload?.meta?.brand || 'NXT') as BrandVariant;
    const P = palette(brand);
    const deckTitle = payload?.meta?.title || 'Untitled Presentation';

    pres.title = deckTitle;
    pres.author = 'NXT Humans · HiC Composer';

    const sections = asArray<any>(payload?.sections);
    if (sections.length === 0) {
        const slide = pres.addSlide();
        slide.background = { color: P.PAPER };
        slide.addText(deckTitle, {
            x: MARGIN, y: 3, w: CONTENT_W, h: 1.5,
            fontSize: 40, color: P.INK, fontFace: FONT, bold: true, align: 'center',
        });
    }

    let sectionNumber = 1;
    for (const section of sections) {
        const kind = section?.kind || 'context';
        try {
            switch (kind) {
                case 'hero':            buildHero(pres, section, P, deckTitle); break;
                case 'context':         buildContext(pres, section, P, sectionNumber++); break;
                case 'themes':          buildThemes(pres, section, P, sectionNumber++); break;
                case 'evidence':        buildEvidence(pres, section, P, sectionNumber++); break;
                case 'quotes':          buildQuotes(pres, section, P, sectionNumber++); break;
                case 'personas':        buildPersonas(pres, section, P, sectionNumber++); break;
                case 'journey':         buildJourney(pres, section, P, sectionNumber++); break;
                case 'recommendations': buildRecommendations(pres, section, P, sectionNumber++); break;
                case 'roadmap':         buildRoadmap(pres, section, P, sectionNumber++); break;
                case 'gap_analysis':    buildGapAnalysis(pres, section, P, sectionNumber++); break;
                case 'tech_arch':       buildTechArch(pres, section, P, sectionNumber++); break;
                case 'team':            buildList(pres, section, P, sectionNumber++, 'The Team', 'The team.', 'members', 'name', 'role'); break;
                case 'competitive':     buildList(pres, section, P, sectionNumber++, 'Competitive Landscape', 'The landscape.', 'peers', 'name', 'position'); break;
                case 'cta':             buildCta(pres, section, P); break;
                default:                buildList(pres, section, P, sectionNumber++, kind, kind, 'items'); break;
            }
        } catch (e) {
            console.warn(`[pptx-export] section "${kind}" failed:`, e);
            const slide = pres.addSlide();
            slide.background = { color: P.PAPER };
            slide.addText(`Section ${sectionNumber++}: ${kind}`, {
                x: MARGIN, y: 3, w: CONTENT_W, h: 1, fontSize: 24, color: P.MUTED, fontFace: FONT, align: 'center',
            });
        }
    }

    const safeName = deckTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase().substring(0, 60);
    const date = new Date().toISOString().split('T')[0];
    const brandSuffix = brand === 'NU' ? 'nu' : 'nxt';
    await pres.writeFile({ fileName: `${date}_${safeName}_${brandSuffix}.pptx` });
}
