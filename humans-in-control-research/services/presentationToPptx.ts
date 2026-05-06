// presentationToPptx.ts
//
// 2026-05-06 — Converts a composed PresentationPayload (the artifact produced
// by the #presentation hashtag composer at services/narrativeComposer.ts) into
// a PowerPoint .pptx file the user can download. Triggered when the chat
// directive includes #export-pptx.
//
// One slide per section. Each section kind has a kind-aware body layout:
// hero gets title+subtitle, evidence gets stat tiles, quotes gets verbatim
// blocks, recommendations get action cards, etc. Brand-aware coloring uses
// the same NU/NXT palette as the slide templates.
//
// This is the BASELINE PPTX export — it produces a presentable deck that
// matches the interactive HTML version's content but not its motion design.
// For higher-fidelity output, a future pass could screenshot each section of
// the live presentation renderer at port 5014 and stitch the images.

import type { PresentationPayload, BrandVariant } from './presentationTypes';

// --- Brand palette (mirrors components/slideTemplates/web.tsx and pptx.ts) ---
const NXT = {
    INK: '0D0D0D',
    PAPER: 'FFFFFF',
    PALE: 'F5F5F0',
    BODY: '333333',
    MUTED: '999999',
    RULE: 'E0E0E0',
    ACCENT: 'B8B800',         // chartreuse
    SECONDARY: '00B7C3',      // cyan
    NEGATIVE: 'CC6644',       // rust
    TEAL: '115054',
};

const NU = {
    INK: '0D0D0D',
    PAPER: 'FAF8F4',          // cream
    PALE: 'F0EDE5',
    BODY: '2A2A2A',
    MUTED: '888888',
    RULE: 'D8D2C4',
    ACCENT: 'C8102E',         // NU red
    SECONDARY: '6E54E0',      // violet
    NEGATIVE: 'CC6644',
    TEAL: '115054',
};

function palette(brand: BrandVariant) {
    return brand === 'NU' ? NU : NXT;
}

// --- Slide geometry constants (matches existing exporter conventions) ---
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const MARGIN = 0.5;
const CONTENT_W = SLIDE_W - MARGIN * 2;
const FONT = 'Archivo';
const MONO = 'JetBrains Mono';

function clip(s: string | undefined | null, max: number): string {
    if (!s) return '';
    const t = String(s).trim();
    return t.length > max ? t.substring(0, max - 1) + '…' : t;
}

function asArray<T>(v: T[] | undefined | null): T[] {
    return Array.isArray(v) ? v : [];
}

// ---------------------------------------------------------------------------
// SLIDE BUILDERS — one per kind; each appends a single slide to the deck
// ---------------------------------------------------------------------------

function addEyebrow(slide: any, P: typeof NXT, label: string) {
    slide.addText(label.toUpperCase(), {
        x: MARGIN, y: 0.45, w: CONTENT_W, h: 0.25,
        fontSize: 9, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 3,
    });
}

function addTitle(slide: any, P: typeof NXT, title: string, size = 28) {
    slide.addText(clip(title, 200), {
        x: MARGIN, y: 0.78, w: CONTENT_W, h: 1.4,
        fontSize: size, color: P.INK, fontFace: FONT, bold: true,
        charSpacing: -1, valign: 'top', lineSpacingMultiple: 1.1,
    });
}

function addSourceFooter(slide: any, P: typeof NXT, sources: string[]) {
    if (!sources.length) return;
    const unique = Array.from(new Set(sources)).slice(0, 6);
    slide.addText(`Sources: ${unique.join('  ·  ')}`, {
        x: MARGIN, y: SLIDE_H - 0.45, w: CONTENT_W, h: 0.3,
        fontSize: 9, color: P.MUTED, fontFace: MONO,
    });
}

function buildHero(pres: any, section: any, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.INK };
    slide.addText('PRESENTATION', {
        x: MARGIN, y: 0.6, w: CONTENT_W, h: 0.3,
        fontSize: 11, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 4,
    });
    slide.addText(clip(section?.data?.title, 200), {
        x: MARGIN, y: 1.2, w: CONTENT_W, h: 3.6,
        fontSize: 48, color: P.PAPER, fontFace: FONT, bold: true,
        charSpacing: -1.5, valign: 'middle', lineSpacingMultiple: 1.05,
    });
    const subs = asArray<string>(section?.data?.subtitle);
    if (subs.length) {
        slide.addText(subs.join('  /  '), {
            x: MARGIN, y: 5.2, w: CONTENT_W, h: 1.5,
            fontSize: 16, color: P.PAPER, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4,
        });
    }
}

function buildContext(pres: any, section: any, title: string, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };
    addEyebrow(slide, P, 'Context · The Situation');
    addTitle(slide, P, title);
    const data = section?.data || {};
    const blocks: Array<[string, string, string]> = [
        ['SITUATION', clip(data.situation, 600), P.SECONDARY],
        ['COMPLICATION', clip(data.complication, 600), P.NEGATIVE],
        ['RESOLUTION', clip(data.resolution, 600), P.ACCENT],
    ];
    let y = 2.4;
    for (const [label, body, accent] of blocks) {
        if (!body) continue;
        slide.addShape('rect' as any, { x: MARGIN, y, w: 0.06, h: 1.4, fill: { color: accent } });
        slide.addText(label, {
            x: MARGIN + 0.18, y, w: CONTENT_W - 0.18, h: 0.25,
            fontSize: 9, color: accent, fontFace: FONT, bold: true, charSpacing: 2,
        });
        slide.addText(body, {
            x: MARGIN + 0.18, y: y + 0.3, w: CONTENT_W - 0.18, h: 1.0,
            fontSize: 13, color: P.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4,
        });
        y += 1.55;
    }
}

function buildThemes(pres: any, section: any, title: string, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };
    addEyebrow(slide, P, 'Research Themes');
    addTitle(slide, P, title);
    const themes = asArray<any>(section?.data?.themes).slice(0, 4);
    if (themes.length === 0) return;
    const colW = (CONTENT_W - 0.3 * (themes.length - 1)) / themes.length;
    let allSources: string[] = [];
    themes.forEach((t: any, i: number) => {
        const x = MARGIN + i * (colW + 0.3);
        slide.addShape('rect' as any, { x, y: 2.5, w: colW, h: 4.0, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x, y: 2.5, w: colW, h: 0.08, fill: { color: P.ACCENT } });
        slide.addText(`THEME ${String(i + 1).padStart(2, '0')}`, {
            x: x + 0.2, y: 2.7, w: colW - 0.4, h: 0.25,
            fontSize: 8, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 2,
        });
        slide.addText(clip(t.name, 120), {
            x: x + 0.2, y: 3.0, w: colW - 0.4, h: 0.7,
            fontSize: 14, color: P.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2,
        });
        slide.addText(clip(t.description, 350), {
            x: x + 0.2, y: 3.85, w: colW - 0.4, h: 2.2,
            fontSize: 10, color: P.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35,
        });
        if (t.signal) {
            slide.addText(`→ ${clip(t.signal, 200)}`, {
                x: x + 0.2, y: 6.05, w: colW - 0.4, h: 0.4,
                fontSize: 9, color: P.SECONDARY, fontFace: FONT, italic: true, valign: 'top',
            });
        }
        asArray<any>(t.citations).forEach((c: any) => { if (c?.source) allSources.push(c.source); });
    });
    addSourceFooter(slide, P, allSources);
}

function buildEvidence(pres: any, section: any, title: string, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };
    addEyebrow(slide, P, 'Evidence · By the Numbers');
    addTitle(slide, P, title);
    const stats = asArray<any>(section?.data?.stats).slice(0, 4);
    if (stats.length === 0) return;
    const colW = (CONTENT_W - 0.25 * (stats.length - 1)) / stats.length;
    const accents = [P.ACCENT, P.SECONDARY, P.NEGATIVE, P.TEAL];
    const sources: string[] = [];
    stats.forEach((s: any, i: number) => {
        const x = MARGIN + i * (colW + 0.25);
        const accent = accents[i % accents.length];
        slide.addShape('rect' as any, { x, y: 2.5, w: colW, h: 4.0, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x, y: 2.5, w: colW, h: 0.08, fill: { color: accent } });
        const valueText = String(s.value || '').trim();
        const valueSize = valueText.length <= 5 ? 56 : valueText.length <= 8 ? 44 : valueText.length <= 12 ? 30 : 22;
        slide.addText(valueText, {
            x: x + 0.2, y: 2.85, w: colW - 0.4, h: 1.6,
            fontSize: valueSize, color: accent, fontFace: FONT, bold: true,
            charSpacing: -1, valign: 'top', lineSpacingMultiple: 1.0,
        });
        slide.addText(clip(s.label, 120), {
            x: x + 0.2, y: 4.6, w: colW - 0.4, h: 0.9,
            fontSize: 11, color: P.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.3,
        });
        if (s.context) {
            slide.addText(clip(s.context, 200), {
                x: x + 0.2, y: 5.55, w: colW - 0.4, h: 0.7,
                fontSize: 9, color: P.MUTED, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4,
            });
        }
        slide.addText(clip(s.source, 100), {
            x: x + 0.2, y: 6.25, w: colW - 0.4, h: 0.25,
            fontSize: 8, color: P.MUTED, fontFace: MONO,
        });
        if (s.source) sources.push(s.source);
    });
}

function buildQuotes(pres: any, section: any, title: string, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };
    addEyebrow(slide, P, 'Voice of the Field');
    addTitle(slide, P, title);
    const quotes = asArray<any>(section?.data?.quotes).slice(0, 3);
    if (quotes.length === 0) return;
    const sources: string[] = [];
    let y = 2.5;
    const cardH = (SLIDE_H - 1.5 - y) / quotes.length;
    quotes.forEach((q: any) => {
        slide.addShape('rect' as any, { x: MARGIN, y, w: 0.06, h: cardH - 0.2, fill: { color: P.ACCENT } });
        slide.addText(`"${clip(q.text, 350)}"`, {
            x: MARGIN + 0.25, y, w: CONTENT_W - 0.25, h: cardH - 0.7,
            fontSize: 16, color: P.INK, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4,
        });
        const attribution = [q.attribution, q.role].filter(Boolean).join(' · ');
        const meta = q.source ? `${attribution}    ${q.source}` : attribution;
        slide.addText(meta, {
            x: MARGIN + 0.25, y: y + cardH - 0.55, w: CONTENT_W - 0.25, h: 0.3,
            fontSize: 10, color: P.MUTED, fontFace: MONO,
        });
        if (q.source) sources.push(q.source);
        y += cardH;
    });
}

function buildPersonas(pres: any, section: any, title: string, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };
    addEyebrow(slide, P, 'People · Personas');
    addTitle(slide, P, title);
    const personas = asArray<any>(section?.data?.personas).slice(0, 3);
    if (personas.length === 0) return;
    const colW = (CONTENT_W - 0.3 * (personas.length - 1)) / personas.length;
    personas.forEach((p: any, i: number) => {
        const x = MARGIN + i * (colW + 0.3);
        slide.addShape('rect' as any, { x, y: 2.5, w: colW, h: 4.2, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x, y: 2.5, w: colW, h: 0.08, fill: { color: P.SECONDARY } });
        slide.addText(clip(p.name, 60), {
            x: x + 0.2, y: 2.7, w: colW - 0.4, h: 0.4,
            fontSize: 16, color: P.INK, fontFace: FONT, bold: true, valign: 'top',
        });
        slide.addText(clip(p.role, 80), {
            x: x + 0.2, y: 3.1, w: colW - 0.4, h: 0.3,
            fontSize: 10, color: P.SECONDARY, fontFace: FONT, bold: true, charSpacing: 1.5,
        });
        if (p.quote) {
            slide.addText(`"${clip(p.quote, 200)}"`, {
                x: x + 0.2, y: 3.5, w: colW - 0.4, h: 1.2,
                fontSize: 11, color: P.BODY, fontFace: FONT, italic: true, valign: 'top', lineSpacingMultiple: 1.4,
            });
        }
        let yy = 4.8;
        const fields: Array<[string, string]> = [
            ['GOAL', clip(p.topGoal, 160)],
            ['PAIN', clip(p.topPainPoint, 160)],
            ['MOTIVATION', clip(p.topMotivation, 160)],
        ];
        for (const [k, v] of fields) {
            if (!v) continue;
            slide.addText(k, { x: x + 0.2, y: yy, w: colW - 0.4, h: 0.18, fontSize: 7, color: P.MUTED, fontFace: FONT, bold: true, charSpacing: 1.5 });
            slide.addText(v, { x: x + 0.2, y: yy + 0.18, w: colW - 0.4, h: 0.45, fontSize: 9, color: P.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3 });
            yy += 0.65;
        }
    });
}

function buildJourney(pres: any, section: any, title: string, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };
    addEyebrow(slide, P, 'Journey · Service Blueprint');
    addTitle(slide, P, title);
    const stages = asArray<any>(section?.data?.stages).slice(0, 5);
    if (stages.length === 0) return;
    const colW = (CONTENT_W - 0.2 * (stages.length - 1)) / stages.length;
    const placeholderRx = /^(\s*(none|n\/?a|tbd|true|false|null|undefined)\s*\.?)$/i;
    const meaningful = (v: unknown) => {
        if (v == null || typeof v === 'boolean') return '';
        const s = String(v).trim();
        return !s || placeholderRx.test(s) ? '' : s;
    };
    stages.forEach((s: any, i: number) => {
        const x = MARGIN + i * (colW + 0.2);
        const fail = meaningful(s.failPoint);
        const pain = meaningful(s.painPoint);
        slide.addShape('rect' as any, { x, y: 2.5, w: colW, h: 4.2, fill: { color: P.PALE }, line: { color: fail ? P.NEGATIVE : P.RULE, width: 0.5 } });
        slide.addShape('rect' as any, { x, y: 2.5, w: colW, h: 0.08, fill: { color: P.ACCENT } });
        slide.addText(`STEP ${String(i + 1).padStart(2, '0')}`, {
            x: x + 0.15, y: 2.7, w: colW - 0.3, h: 0.22, fontSize: 8, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 2,
        });
        slide.addText(clip(meaningful(s.phase) || meaningful(s.customerAction) || `Stage ${i + 1}`, 80), {
            x: x + 0.15, y: 2.95, w: colW - 0.3, h: 0.5, fontSize: 12, color: P.INK, fontFace: FONT, bold: true, valign: 'top', lineSpacingMultiple: 1.2,
        });
        let yy = 3.55;
        const rows: Array<[string, string]> = [
            ['CUSTOMER', clip(meaningful(s.customerAction), 120)],
            ['FRONTSTAGE', clip(meaningful(s.frontstage), 120)],
            ['BACKSTAGE', clip(meaningful(s.backstage), 120)],
        ];
        for (const [k, v] of rows) {
            if (!v) continue;
            slide.addText(k, { x: x + 0.15, y: yy, w: colW - 0.3, h: 0.16, fontSize: 7, color: P.MUTED, fontFace: FONT, bold: true, charSpacing: 1.5 });
            slide.addText(v, { x: x + 0.15, y: yy + 0.16, w: colW - 0.3, h: 0.5, fontSize: 8.5, color: P.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3 });
            yy += 0.7;
        }
        if (fail || pain) {
            slide.addShape('rect' as any, { x: x + 0.15, y: 6.15, w: colW - 0.3, h: 0.45, fill: { color: 'FFF4EA' } });
            slide.addText(`${fail ? 'Fail' : 'Pain'}: ${clip(fail || pain, 100)}`, {
                x: x + 0.2, y: 6.18, w: colW - 0.4, h: 0.4, fontSize: 8, color: P.NEGATIVE, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.3,
            });
        }
    });
}

function buildRecommendations(pres: any, section: any, title: string, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };
    addEyebrow(slide, P, 'Recommendations · Coherent Actions');
    addTitle(slide, P, title);
    const recs = asArray<any>(section?.data?.recommendations).slice(0, 4);
    if (recs.length === 0) return;
    let y = 2.5;
    const cardH = Math.min(1.0, (SLIDE_H - 1.0 - y) / recs.length);
    recs.forEach((r: any, i: number) => {
        slide.addShape('rect' as any, { x: MARGIN, y, w: CONTENT_W, h: cardH - 0.1, fill: { color: P.PALE } });
        slide.addShape('rect' as any, { x: MARGIN, y, w: 0.08, h: cardH - 0.1, fill: { color: P.ACCENT } });
        slide.addText(`${String(i + 1).padStart(2, '0')}`, {
            x: MARGIN + 0.2, y: y + 0.1, w: 0.5, h: 0.3, fontSize: 14, color: P.ACCENT, fontFace: FONT, bold: true,
        });
        slide.addText(clip(r.actionTitle, 180), {
            x: MARGIN + 0.7, y: y + 0.1, w: CONTENT_W - 0.7 - 1.6, h: 0.4, fontSize: 13, color: P.INK, fontFace: FONT, bold: true, valign: 'top',
        });
        slide.addText(clip(r.rationale, 280), {
            x: MARGIN + 0.7, y: y + 0.45, w: CONTENT_W - 0.7 - 1.6, h: cardH - 0.55, fontSize: 9.5, color: P.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.35,
        });
        const metrics = [r.impactMetric, r.timeframe, r.owner].filter(Boolean).slice(0, 3);
        let mx = SLIDE_W - MARGIN - 1.5;
        metrics.forEach((m: string, mi: number) => {
            slide.addText(clip(m, 60), {
                x: mx, y: y + 0.1 + mi * 0.25, w: 1.5, h: 0.2, fontSize: 9, color: P.SECONDARY, fontFace: MONO,
            });
        });
        y += cardH;
    });
}

function buildRoadmap(pres: any, section: any, title: string, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };
    addEyebrow(slide, P, 'Roadmap · Sequencing');
    addTitle(slide, P, title);
    const horizons = asArray<any>(section?.data?.horizons).slice(0, 3);
    if (horizons.length === 0) return;
    const colW = (CONTENT_W - 0.25 * (horizons.length - 1)) / horizons.length;
    const accents: Record<string, string> = { NOW: P.ACCENT, NEXT: P.SECONDARY, LATER: P.TEAL };
    horizons.forEach((h: any, i: number) => {
        const x = MARGIN + i * (colW + 0.25);
        const label = String(h.horizon || '').toUpperCase();
        const accent = accents[label] || P.MUTED;
        slide.addShape('rect' as any, { x, y: 2.5, w: colW, h: 0.08, fill: { color: accent } });
        slide.addText(label, { x, y: 2.65, w: colW * 0.6, h: 0.35, fontSize: 14, color: accent, fontFace: FONT, bold: true, charSpacing: 3 });
        slide.addText(clip(h.duration, 30), { x: x + colW * 0.6, y: 2.7, w: colW * 0.4, h: 0.3, fontSize: 10, color: P.MUTED, fontFace: MONO, align: 'right' });
        const inits = asArray<any>(h.initiatives).slice(0, 5);
        let yy = 3.15;
        inits.forEach((init: any) => {
            slide.addShape('line' as any, { x: x + 0.05, y: yy, w: 0, h: 0.6, line: { color: init.confidence === 'high' ? accent : P.RULE, width: 1.5 } });
            slide.addText(clip(init.name, 80), {
                x: x + 0.2, y: yy, w: colW - 0.3, h: 0.3, fontSize: 11, color: P.INK, fontFace: FONT, bold: true, valign: 'top',
            });
            const meta = [init.successMetric, init.owner].filter(Boolean).join('  ·  ');
            if (meta) {
                slide.addText(clip(meta, 120), {
                    x: x + 0.2, y: yy + 0.3, w: colW - 0.3, h: 0.3, fontSize: 9, color: P.MUTED, fontFace: FONT, valign: 'top',
                });
            }
            yy += 0.7;
        });
    });
}

function buildGenericList(pres: any, section: any, title: string, eyebrow: string, listKey: string, itemFields: string[], P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.PAPER };
    addEyebrow(slide, P, eyebrow);
    addTitle(slide, P, title);
    const items = asArray<any>(section?.data?.[listKey]).slice(0, 5);
    if (items.length === 0) {
        // Fall back to a narrative paragraph if the section has one
        const narrative = clip(section?.data?.narrative || section?.data?.description, 1500);
        if (narrative) {
            slide.addText(narrative, { x: MARGIN, y: 2.5, w: CONTENT_W, h: 4.0, fontSize: 14, color: P.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
        }
        return;
    }
    let y = 2.5;
    const itemH = (SLIDE_H - 1.0 - y) / items.length;
    items.forEach((it: any) => {
        slide.addShape('rect' as any, { x: MARGIN, y, w: 0.06, h: itemH - 0.15, fill: { color: P.ACCENT } });
        const titleField = itemFields[0];
        const bodyField = itemFields[1];
        slide.addText(clip(it[titleField] || it.name || it.label || it.title, 120), {
            x: MARGIN + 0.2, y, w: CONTENT_W - 0.2, h: 0.35, fontSize: 14, color: P.INK, fontFace: FONT, bold: true, valign: 'top',
        });
        if (bodyField && it[bodyField]) {
            slide.addText(clip(it[bodyField], 400), {
                x: MARGIN + 0.2, y: y + 0.4, w: CONTENT_W - 0.2, h: itemH - 0.6, fontSize: 11, color: P.BODY, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.4,
            });
        }
        y += itemH;
    });
}

function buildCta(pres: any, section: any, title: string, P: typeof NXT) {
    const slide = pres.addSlide();
    slide.background = { color: P.INK };
    slide.addText('NEXT STEPS', {
        x: MARGIN, y: 1.5, w: CONTENT_W, h: 0.4, fontSize: 12, color: P.ACCENT, fontFace: FONT, bold: true, charSpacing: 4,
    });
    slide.addText(clip(title, 150), {
        x: MARGIN, y: 2.2, w: CONTENT_W, h: 2.0, fontSize: 36, color: P.PAPER, fontFace: FONT, bold: true, charSpacing: -1, valign: 'top', lineSpacingMultiple: 1.1,
    });
    const cta = clip(section?.data?.text || section?.data?.callToAction || section?.data?.body, 400);
    if (cta) {
        slide.addText(cta, { x: MARGIN, y: 4.4, w: CONTENT_W, h: 2.0, fontSize: 16, color: P.PAPER, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.5 });
    }
}

// ---------------------------------------------------------------------------
// MAIN ENTRY
// ---------------------------------------------------------------------------

export async function exportPresentationToPptx(payload: PresentationPayload): Promise<void> {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';   // 13.333 × 7.5

    const brand = (payload?.meta?.brand || 'NXT') as BrandVariant;
    const P = palette(brand);
    const deckTitle = payload?.meta?.title || 'Untitled Presentation';

    pres.title = deckTitle;
    pres.author = 'NXT Humans · HiC Composer';

    const sections = asArray<any>(payload?.sections);
    if (sections.length === 0) {
        // Empty payload — render a single placeholder slide so the user gets a file
        const slide = pres.addSlide();
        slide.background = { color: P.PAPER };
        slide.addText(deckTitle, { x: MARGIN, y: 3, w: CONTENT_W, h: 1.5, fontSize: 36, color: P.INK, fontFace: FONT, bold: true, align: 'center' });
    }

    for (const section of sections) {
        const kind = section?.kind || 'context';
        const title = clip(section?.title || section?.data?.title || deckTitle, 200);
        try {
            switch (kind) {
                case 'hero':            buildHero(pres, section, P); break;
                case 'context':         buildContext(pres, section, title, P); break;
                case 'themes':          buildThemes(pres, section, title, P); break;
                case 'evidence':        buildEvidence(pres, section, title, P); break;
                case 'quotes':          buildQuotes(pres, section, title, P); break;
                case 'personas':        buildPersonas(pres, section, title, P); break;
                case 'journey':         buildJourney(pres, section, title, P); break;
                case 'recommendations': buildRecommendations(pres, section, title, P); break;
                case 'roadmap':         buildRoadmap(pres, section, title, P); break;
                case 'gap_analysis':    buildGenericList(pres, section, title, 'Gap Analysis · Maturity', 'gaps', ['capability', 'impact'], P); break;
                case 'tech_arch':       buildGenericList(pres, section, title, 'Technical Architecture', 'nodes', ['label', 'description'], P); break;
                case 'team':            buildGenericList(pres, section, title, 'Team', 'members', ['name', 'role'], P); break;
                case 'competitive':     buildGenericList(pres, section, title, 'Competitive Landscape', 'peers', ['name', 'position'], P); break;
                case 'cta':             buildCta(pres, section, title, P); break;
                default:                buildGenericList(pres, section, title, kind.toUpperCase(), 'items', ['title', 'description'], P);
            }
        } catch (e) {
            // Slide builder crashed — emit a fallback slide so the deck still ships
            console.warn(`[pptx-export] Section "${kind}" failed:`, e);
            const slide = pres.addSlide();
            slide.background = { color: P.PAPER };
            addEyebrow(slide, P, kind);
            addTitle(slide, P, title);
        }
    }

    const safeName = deckTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase().substring(0, 60);
    const date = new Date().toISOString().split('T')[0];
    await pres.writeFile({ fileName: `${date}_${safeName}.pptx` });
}
