/**
 * Source-deck parity (2026-10-21, owner: "There should be information parity from the uploaded deck and the new
 * #slides deck"). A reformat is judged against its source, unit by unit: every source slide, its labeled sections,
 * named entities and figures must be carried by the output. The plan rides in the prompt; the check runs on the
 * reply; an uncovered source slide gets one re-ask and then a deterministic fill from its own text.
 *
 * Live failure this fixes: the 5-slide client deck (cover + four initiatives, each OBJECTIVE / APPROACH / STATUS /
 * BUSINESS VALUE) came back as 11 slides built from an earlier test deck in the conversation; one initiative was
 * missing entirely.
 */

export interface SourceSection { label: string; body: string }
export interface SourceSlide {
    index: number;
    title: string;
    subtitle: string;
    /** A numbered kicker naming the slide's subject ("01 NORTHEASTERN"), carried verbatim. */
    kicker: string;
    sections: SourceSection[];
    lines: string[];
    entities: string[];
    figures: string[];
    notes: string;
}
export interface SourceDeck { filename: string; slides: SourceSlide[] }

const LABEL_RE = /^[A-Z][A-Z&/'. -]{2,40}$/;
/** "01  NORTHEASTERN": a numbered kicker naming the slide's subject, not a section label. */
const KICKER_RE = /^\d{2}\s+[A-Z][A-Z&/ .-]{2,60}$/;
const SKIP_LINE_RE = /^(?:\d{1,3}|TITLE:\s*|NOTES:\s*|TABLE:\s*)$/;

function cleanLine(s: string): string {
    return String(s || '').replace(/\s+/g, ' ').replace(/[•●]/g, '').trim();
}

/** Capitalised multi-word phrases and all-caps names ("Benefits Cortex", "DECIEM", "Student 360"). */
export function namedEntities(text: string): string[] {
    const out = new Set<string>();
    const t = String(text || '');
    // Mixed-case multi-word names ("Student Hub", "Student 360", "Plan Pulse"); an all-caps section label followed by
    // a sentence ("OBJECTIVE Improve") is not a name, so each word must be Capitalised-lowercase or a number.
    for (const m of t.matchAll(/\b(?:[A-Z][a-z0-9]+(?:\s+(?:of|and|&|\/)?\s*(?:[A-Z][a-z0-9]+|\d{2,4}\b)){1,3})\b/g)) {
        const v = m[0].trim();
        if (v.split(/\s+/).length >= 2 && !/^(?:The|A|An|This|These|Our|Your|Create|Define|Improve|Reduce|Build|Make|Use|Start|Turn|Give|Speed|Simplify)\b/.test(v)) out.add(v);
    }
    // accent-aware: "ESTÉE" is one name, never "EST" (2026-10-26 live run)
    for (const m of t.matchAll(/(?<!\p{L})\p{Lu}{3,}(?:\s+\p{Lu}{3,})?(?!\p{L})/gu)) {
        const v = m[0].trim();
        if (!/^(?:OBJECTIVE|APPROACH|STATUS|BUSINESS|VALUE|TITLE|NOTES|TABLE|AND|THE|FOR|WITH|THROUGH)$/.test(v)) out.add(v);
    }
    return [...out];
}

function figuresIn(text: string): string[] {
    return [...new Set((String(text || '').match(/\b\d[\d,.]*(?:%|x|k|m|bn)?\b/gi) || []).filter(f => !/^\d{1,2}$/.test(f)))];
}

/** Parse the proxy's PPTX extraction ("[Slide N]" blocks with TITLE:, labels and NOTES:). */
/** The name a reader sees for an attached document: no extension, no underscores, no copy suffix
 *  ("NXT_Humans_Client_Portfolio_2027_Continuity 1.pptx" -> "NXT Humans Client Portfolio 2027 Continuity"). */
export function documentNameOf(filename: string): string {
    return String(filename || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ')
        .replace(/\s*(?:\(\d+\)|-\s*copy|\bcopy|\s\d)\s*$/i, '').replace(/\s{2,}/g, ' ').trim();
}
/** The same name as the model tends to write it from the raw filename (extension dropped, copy suffix kept). */
export function documentRawNameOf(filename: string): string {
    return String(filename || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function parseSourceDeck(text: string, filename = 'attached deck'): SourceDeck {
    const blocks = String(text || '').split(/\n?\[Slide (\d+)\]\n?/);
    const slides: SourceSlide[] = [];
    for (let i = 1; i < blocks.length; i += 2) {
        const index = Number(blocks[i]);
        const raw = blocks[i + 1] || '';
        let notes = '';
        const body = raw.replace(/\nNOTES:\s*([\s\S]*)$/, (_m, n) => { notes = cleanLine(n).slice(0, 600); return ''; });
        const lines = body.split('\n').map(cleanLine).filter(l => l && !SKIP_LINE_RE.test(l) && !/^\d{1,2}$/.test(l));
        let title = '';
        const tl = lines.find(l => /^TITLE:/.test(l));
        if (tl) title = tl.replace(/^TITLE:\s*/, '');
        const content = lines.map(l => l.replace(/^TITLE:\s*/, ''));
        const sections: SourceSection[] = [];
        const free: string[] = [];
        let kicker = '';
        for (let k = 0; k < content.length; k++) {
            const l = content[k];
            if (KICKER_RE.test(l)) { kicker = l.replace(/\s{2,}/g, ' '); free.push(l); continue; }
            if (LABEL_RE.test(l) && k + 1 < content.length && !LABEL_RE.test(content[k + 1]) && !KICKER_RE.test(content[k + 1])) {
                sections.push({ label: l, body: content[k + 1] });
                k++;
            } else free.push(l);
        }
        if (!title) {
            // The title is the first headline-like line: not a label, not a kicker.
            title = free.find(l => l.length >= 12 && !LABEL_RE.test(l) && !KICKER_RE.test(l)) || free[0] || '';
        }
        const subtitle = free.filter(l => l !== title && !LABEL_RE.test(l) && !KICKER_RE.test(l))[0] || kicker || '';
        const all = content.join(' ');
        // 2026-10-26 (live: "DECIEM CANON", "CORTEX NORTHEASTERN", "Diagnose Find" were glued across line breaks, so every
        // carried slide read as missing and the repair added three duplicate slides): names never span a line.
        const entities = [...new Set(content.flatMap(l => namedEntities(l)))];
        slides.push({ index, title, subtitle, kicker, sections, lines: content, entities, figures: figuresIn(all), notes });
    }
    return { filename, slides };
}

const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'are', 'can', 'its', 'our', 'their', 'more', 'than', 'one', 'into', 'across', 'while', 'without', 'what', 'when', 'where', 'how', 'who']);
function tokens(s: string): Set<string> {
    return new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !STOP.has(w)));
}
function overlap(a: Set<string>, b: Set<string>): number {
    if (!a.size) return 1;
    let n = 0;
    for (const w of a) if (b.has(w)) n++;
    return n / a.size;
}

/** A source slide's full text for matching (2026-10-26 live: matching on title + labeled sections let a slide whose
 *  source title was only "Northeastern" match any slide that named Northeastern, so an agenda was replaced by an
 *  account slide and a picture went to the wrong slide). */
function slideText(s: SourceSlide): string {
    return [s.title, s.subtitle, ...s.sections.map(x => `${x.label} ${x.body}`), ...s.lines].join(' ');
}

export interface ParityResult {
    total: number;
    covered: number;
    uncovered: Array<{ index: number; title: string; missing: string[] }>;
    /** per output slide: index of the source slide it carries best (or -1) */
    mapping: number[];
}

/**
 * Judge an output deck's text against the source. A source slide counts as carried when its title's idea (>= 50%
 * of its content words) OR two of its sections are present, AND its named entities appear. Missing units are listed
 * for the re-ask.
 */
export function parityCheck(deck: SourceDeck, outputText: string, outputSlides: string[] = []): ParityResult {
    const outAll = tokens(outputText);
    const outLower = String(outputText || '').toLowerCase();
    const uncovered: ParityResult['uncovered'] = [];
    let covered = 0;
    for (const s of deck.slides) {
        const missing: string[] = [];
        const titleHit = overlap(tokens(s.title), outAll) >= 0.5;
        const sectionHits = s.sections.filter(sec => overlap(tokens(sec.body), outAll) >= 0.45);
        for (const sec of s.sections) if (!sectionHits.includes(sec)) missing.push(`${sec.label}: ${sec.body}`);
        const ents = s.entities.filter(e => e.length >= 4);
        // a name is carried when each of its words is ("Benefits Cortex Aon" against "Aon integration ... Benefits Cortex")
        const entMissing = ents.filter(e => !e.toLowerCase().split(/[\s/&]+/).filter(w => w.length >= 2).every(w => outLower.includes(w)));
        // 2026-10-26 (live: the repair got "figure: 500K" with no context and wrote "Canon CFS shows 840K on its 2027
        // continuity path", the currency, unit and meaning gone): every missing name or figure carries its source line.
        const lineOf = (needle: string) => {
            const n = needle.toLowerCase();
            const sec = s.sections.find(x => `${x.label} ${x.body}`.toLowerCase().includes(n));
            if (sec) return `${sec.label}: ${sec.body}`;
            return s.lines.find(l => l.toLowerCase().includes(n)) || '';
        };
        const withLine = (kind: string, v: string) => { const l = lineOf(v); return l ? `${kind}: ${v} (source line, carry it with its meaning: "${l.slice(0, 260)}")` : `${kind}: ${v}`; };
        for (const e of entMissing) missing.push(withLine('named', e));
        const figMissing = s.figures.filter(f => !outLower.includes(f.toLowerCase()));
        for (const f of figMissing) missing.push(withLine('figure', f));
        // 2026-10-26 (live: every account slide dropped its "2027 continuity path" box, $500K / $840K / $66,625 a month,
        // and parity still read 8 of 8): a source figure missing from the deck makes the slide uncovered too.
        const carried = (titleHit || sectionHits.length >= Math.max(1, Math.ceil(s.sections.length / 2))) && entMissing.length === 0 && figMissing.length === 0;
        if (carried) covered++;
        else uncovered.push({ index: s.index, title: s.title, missing: missing.slice(0, 12) });
    }
    const mapping = outputSlides.map(txt => {
        const t = tokens(txt);
        let best = -1, bestScore = 0;
        deck.slides.forEach((s, i) => {
            const sc = overlap(tokens(`${slideText(s)}`), t);
            if (sc > bestScore) { bestScore = sc; best = i; }
        });
        return bestScore >= 0.25 ? best : -1;
    });
    return { total: deck.slides.length, covered, uncovered, mapping };
}

/** The plan block the generation prompt carries: one entry per source slide with the units that must be carried. */
export function parityPlanBlock(deck: SourceDeck): string {
    if (!deck.slides.length) return '';
    const lines = [
        `=== SOURCE DECK PARITY PLAN (${deck.filename}: ${deck.slides.length} source slides; information parity is the bar) ===`,
        'Carry EVERY source slide into at least one output slide, in source order. A source slide with labeled sections (e.g. OBJECTIVE / APPROACH / STATUS / BUSINESS VALUE) maps to ONE slides:brief-card that carries all of its sections as its four blocks (label = the section label, body = the full sentences of that section), or slides:evidence-table / slides:comparison-panels when the source is tabular. Keep every named entity, product name, figure and status statement as written; tighten wording, never drop a unit. The same archetype MAY repeat for sibling source slides: parity beats variety here, and the visual floor and adjacency rules do not apply. Add nothing the source does not say (no new thesis, no market context, no appendix). A cover maps to slides:cover; an overview of the parts maps to slides:agenda or slides:numbered-themes.',
    ];
    for (const s of deck.slides) {
        lines.push(`Source slide ${s.index}: "${s.title || '(untitled)'}"${s.subtitle ? ` - ${s.subtitle}` : ''}${s.kicker ? ` [kicker, verbatim: ${s.kicker}]` : ''}`);
        for (const sec of s.sections) lines.push(`  - ${sec.label}: ${sec.body}`);
        const extra = s.lines.filter(l => l !== s.title && l !== s.subtitle && !s.sections.some(sec => sec.label === l || sec.body === l));
        for (const l of extra.slice(0, 10)) lines.push(`  - ${l}`);
        if (s.entities.length) lines.push(`  - named: ${s.entities.slice(0, 10).join('; ')}`);
    }
    lines.push('=== END SOURCE DECK PARITY PLAN ===');
    return lines.join('\n');
}

/**
 * The re-ask after a parity miss: the missing units, nothing else.
 * 2026-10-25 (owner: "an unacceptable amount of time"; live: this re-ask regenerated the complete deck, a second
 * multi-minute Opus call on every reformat): the model returns ONLY the slides for the missing source slides and
 * mergeParityFences places them in source order.
 */
export function parityRepairInstruction(result: ParityResult): string {
    const lines = [`PARITY CHECK: ${result.covered} of ${result.total} source slides are carried. For EACH source slide listed below write ONE :::slide fence that carries ALL of that source slide's units, in source order, same brand and archetype rules as the deck. When the deck already has a slide for that source slide, your fence REPLACES it: keep what it says right and add what is missing (a brief-card carries a fifth or sixth block when the source has more sections). Write nothing outside the fences.`];
    for (const u of result.uncovered) {
        lines.push(`Source slide ${u.index} "${u.title}" is missing:`);
        for (const m of u.missing) lines.push(`  - ${m}`);
    }
    return lines.join('\n');
}

const FENCE_RE = /:::slide[\s\S]*?\n:::/g;

/** Position (0-based) of the source slide a fence carries best, or -1. */
function sourcePositionOf(deck: SourceDeck, fence: string): number {
    const t = tokens(fence);
    let best = -1, bestScore = 0;
    deck.slides.forEach((s, i) => {
        const sc = overlap(tokens(`${slideText(s)}`), t);
        if (sc > bestScore) { bestScore = sc; best = i; }
    });
    return bestScore >= 0.25 ? best : -1;
}
/** The source slide an output slide carries (index into deck.slides), or -1 when it carries none (2026-10-26: a deck that
 *  mixes research slides with an attached section marks only the attached slides as the client's own words). */
export function sourceSlideFor(deck: SourceDeck, text: string): number { return sourcePositionOf(deck, text); }
/** How much of source slide `i` a text carries (0..1). */
function sourceScore(deck: SourceDeck, i: number, text: string): number {
    const s = deck.slides[i];
    return s ? overlap(tokens(`${slideText(s)}`), tokens(text)) : 0;
}

/**
 * 2026-10-26 (live reformat: source slide 7's picture went to the four-step slide as a thumbnail and the 2027 bridge
 * slide got none, because the first slide that mapped to it took it): each source picture goes to the output slide that
 * carries THAT source slide best; an output slide takes at most one picture. Returns output index -> source index.
 */
export function pictureAssignments(deck: SourceDeck, outputTexts: string[]): Map<number, number> {
    const pairs: Array<{ out: number; src: number; score: number }> = [];
    outputTexts.forEach((txt, out) => deck.slides.forEach((_s, src) => {
        const score = sourceScore(deck, src, txt);
        if (score >= 0.25) pairs.push({ out, src, score });
    }));
    pairs.sort((a, b) => b.score - a.score);
    const usedOut = new Set<number>(), usedSrc = new Set<number>(), out = new Map<number, number>();
    for (const p of pairs) {
        if (usedOut.has(p.out) || usedSrc.has(p.src)) continue;
        out.set(p.out, p.src); usedOut.add(p.out); usedSrc.add(p.src);
    }
    return out;
}

/**
 * Merge the repair's fences into the deck. A fence for a source slide the deck already carries REPLACES that slide
 * (2026-10-26 live: account slides that dropped their figures were left as they were, because the repair could only
 * add); a fence for a source slide the deck lacks goes after the last fence carrying an earlier source slide (never
 * before the cover); a fence that maps to no source slide and repeats an existing slide is dropped. Text outside the
 * fences (the thesis block, any preamble) is untouched.
 */
export function mergeParityFences(deckText: string, addedText: string, deck: SourceDeck): { text: string; added: number; replaced: number } {
    const add = String(addedText || '').match(FENCE_RE) || [];
    if (!add.length) return { text: deckText, added: 0, replaced: 0 };
    const src0 = String(deckText);
    const existing = Array.from(src0.matchAll(FENCE_RE)).map(m => ({ start: m.index || 0, end: (m.index || 0) + m[0].length, text: m[0], src: sourcePositionOf(deck, m[0]) }));
    if (!existing.length) return { text: `${src0.trimEnd()}\n\n${add.join('\n\n')}\n`, added: add.length, replaced: 0 };
    const replaceAt = new Map<number, string>();          // existing fence index -> replacement
    const after = new Map<number, string[]>();            // existing fence index -> fences inserted after it
    let added = 0;
    for (const f of add) {
        const src = sourcePositionOf(deck, f);
        // the slide replaced is the one that carries this source slide BEST (2026-10-26 live: the first fence that
        // mapped to Northeastern was the agenda, which was replaced, leaving two Northeastern slides and no agenda)
        let same = -1, bestScore = 0;
        if (src >= 0) existing.forEach((e, i) => {
            if (e.src !== src || replaceAt.has(i)) return;
            const sc = sourceScore(deck, src, e.text);
            if (sc > bestScore) { bestScore = sc; same = i; }
        });
        if (same >= 0) { replaceAt.set(same, f); continue; }
        if (src < 0 && existing.some(e => overlap(tokens(f), tokens(e.text)) >= 0.6)) continue;
        let k = src < 0 ? existing.length - 1 : 0;
        if (src >= 0) existing.forEach((e, i) => { if (e.src >= 0 && e.src < src) k = Math.max(k, i); });
        after.set(k, [...(after.get(k) || []), f]);
        added++;
    }
    let text = '';
    let cursor = 0;
    existing.forEach((e, i) => {
        text += src0.slice(cursor, e.start) + (replaceAt.get(i) ?? e.text);
        const extra = after.get(i);
        if (extra) text += `\n\n${extra.join('\n\n')}`;
        cursor = e.end;
    });
    text += src0.slice(cursor);
    return { text, added, replaced: replaceAt.size };
}

/** Deterministic fill: one dense slide per uncovered source slide, built from the source's own text. */
export function parityFillFences(deck: SourceDeck, result: ParityResult, brand: string, sourceLabel: string): string {
    const fences: string[] = [];
    for (const u of result.uncovered) {
        const s = deck.slides.find(x => x.index === u.index);
        if (!s) continue;
        const blocks = (s.sections.length ? s.sections : s.lines.slice(1, 5).map((l, i) => ({ label: `Point ${i + 1}`, body: l })))
            .slice(0, 4)
            .map(sec => ({ label: sec.label.slice(0, 24), body: sec.body.slice(0, 240) }));
        while (blocks.length < 4 && blocks.length > 0) blocks.push({ label: '', body: '' });
        const payload = { kicker: (s.kicker || s.subtitle || sourceLabel).slice(0, 60), title: (s.title || sourceLabel).slice(0, 90), subtitle: s.subtitle && s.subtitle !== s.title ? s.subtitle.slice(0, 160) : '', blocks, sourceLine: `Source: ${sourceLabel}` };
        fences.push(`:::slide template=slides:brief-card brand=${brand}\n${JSON.stringify(payload)}\n:::`);
    }
    return fences.join('\n');
}
