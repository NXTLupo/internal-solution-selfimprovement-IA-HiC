// DECIEM round 2 proof (2026-10-01): a 12-slide deck composed with deck positions plumbed. Pins the
// deck-order art rotation (stride 5 over 12 backgrounds), the divider pop-fill ordinal, the canvas
// families (black quote, black-header table, paper + art, panel), the art safe zones (no text box
// intersects a corner art zone), Poppins 700 titles and the no-italics rule. Also writes the twelve
// stage HTML docs to the scratchpad for the contact-sheet screenshot.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    slideDataToStageHtml, deckPositions, brandBodyArtPick, rectHitsZones, brandDividerFill, hasFilledImagery, goldArtInsets, brandArtZones,
} from './slideToStageHtml';
import { composeSlide, planCanvasFor, composerCanvasFamily } from './slideComposer';
import { getBrandArt, getBrand } from '../components/slideTemplates/brands';

const OUT = process.env.DECIEM_DECK_OUT || 'C:/Users/JonathanLupo/AppData/Local/Temp/claude/d--NXT-HUMANS-AI-CX-WORKBENCH/fdaba13b-5a00-49a6-905f-3a10e95ef4fa/scratchpad/deciem/deck';
const LOCKUP = 'THE ABNORMAL BEAUTY COMPANY.';

const themes = (n: number) => ({
    title: `Theme ${n}: buyers read the label before the brand`,
    items: [
        { number: '01', name: 'Ingredient literacy', body: 'Buyers name the active before the house name and compare concentrations across brands.', quote: 'I look for niacinamide, not a name.', source: 'r/SkincareAddiction' },
        { number: '02', name: 'Regimen assembly', body: 'Routines mix brands by step, so loyalty attaches to the step rather than the house.', quote: 'My routine is five brands.', source: 'Allure' },
        { number: '03', name: 'Patience', body: 'Visible results take weeks, so expectation setting precedes retention.', quote: 'Give it eight weeks.', source: 'Dermatology Times' },
        { number: '04', name: 'Proof', body: 'Clinical language earns trust faster than lifestyle imagery.', quote: 'Show me the study.', source: 'Byrdie' },
    ],
    sourceLine: 'Sources: r/SkincareAddiction; Allure; Dermatology Times; Byrdie',
});

// cover, divider, 4 themes, stat-row, block-quote, evidence-table, role-needs, divider, roadmap
const DECK: any[] = [
    { id: 's1', template: 'slides:cover', brand: 'deciem', title: 'Skincare buyers now start with the ingredient', composerPayload: { title: 'Skincare buyers now start with the ingredient', subtitle: 'DECIEM AI strategy, 2026' } },
    { id: 's2', template: 'slides:section-divider', brand: 'deciem', title: 'The ingredient-first buyer', composerPayload: { number: '01', title: 'The ingredient-first buyer', supporting: 'How people choose a serum.' } },
    { id: 's3', template: 'slides:numbered-themes', brand: 'deciem', title: themes(1).title, composerPayload: themes(1) },
    { id: 's4', template: 'slides:numbered-themes', brand: 'deciem', title: themes(2).title, composerPayload: themes(2) },
    { id: 's5', template: 'theme-detail', brand: 'deciem', title: 'Theme 3: regimen assembly moves loyalty to the step', themeCluster: { themes: [{ name: 'Regimen assembly', insight: 'Routines mix brands by step, so loyalty attaches to the step rather than the house.', quotes: [{ text: 'My routine is five brands.', source: 'Allure' }, { text: 'I rebuy the serum, not the line.', source: 'r/SkincareAddiction' }], whatItMeans: 'Cross-sell depends on regimen fit, not brand affinity.', subthemes: ['step loyalty', 'multi-brand routines'] }], takeaway: 'Sell the step, not the house.' }, sources: ['Allure', 'r/SkincareAddiction'] },
    { id: 's6', template: 'slides:numbered-themes', brand: 'deciem', title: themes(4).title, composerPayload: themes(4) },
    { id: 's7', template: 'slides:stat-row', brand: 'deciem', title: 'Three patterns define the first purchase', composerPayload: { title: 'Three patterns define the first purchase', stats: [
        { figure: 'Literate', headline: 'Buyers name the active first', means: 'The shelf is read by ingredient, not by house.', matters: 'Education content is the first touchpoint.' },
        { figure: 'Routine', headline: 'Regimens span several brands', means: 'Loyalty sits with the step.', matters: 'Cross-sell depends on regimen fit.' },
        { figure: 'Patient', headline: 'Results take weeks', means: 'Expectation setting precedes retention.', matters: 'Follow-up timing matters more than discounting.' },
    ], sourceLine: 'Sources: r/SkincareAddiction; Allure; Dermatology Times' } },
    { id: 's8', template: 'slides:block-quote', brand: 'deciem', title: 'In the buyer\'s words', composerPayload: { topicKicker: 'ON INGREDIENT LITERACY', quote: 'I look for niacinamide, not a name. If the label does not say the percentage, I put it back.', attributionName: 'Skincare forum member', attributionRole: 'r/SkincareAddiction, 2026', corroborating: [{ figure: 'Label', label: 'Buyers read the active first', source: 'Allure' }, { figure: 'Percent', label: 'Concentration decides between two serums', source: 'Byrdie' }], sourceLine: 'Source: r/SkincareAddiction' } },
    { id: 's9', template: 'slides:evidence-table', brand: 'deciem', title: 'Four sources converge on the same buyer', composerPayload: { title: 'Four sources converge on the same buyer', intro: 'Independent sources describe the same ingredient-first behavior.', columns: ['Source', 'What they prove', 'Implication', 'Grade'], rows: [
        { subject: 'r/SkincareAddiction', prove: 'Buyers compare actives and percentages before brands.', implication: 'Lead with the ingredient on the shelf and the page.', evidenceGrade: 'Convergent' },
        { subject: 'Allure', prove: 'Routines span several brands by step.', implication: 'Position each product as a step.', evidenceGrade: 'Corroborated' },
        { subject: 'Dermatology Times', prove: 'Results take weeks to show.', implication: 'Time follow-up to the result window.', evidenceGrade: 'Clinical' },
    ], takeaway: { label: 'So what', statement: 'The ingredient-first buyer is the planning unit for content, shelf and follow-up.' }, sourceLine: 'Sources: r/SkincareAddiction; Allure; Dermatology Times' } },
    { id: 's10', template: 'slides:role-needs', brand: 'deciem', title: 'The ingredient-first buyer needs proof before persuasion', composerPayload: { eyebrow: 'PERSONA', title: 'The ingredient-first buyer needs proof before persuasion', challenges: [
        { numeral: '01', heading: 'Finding the percentage', body: 'Labels bury the concentration the buyer compares on.' },
        { numeral: '02', heading: 'Sequencing steps', body: 'Mixing brands makes order and conflicts unclear.' },
        { numeral: '03', heading: 'Waiting for results', body: 'Weeks pass before the buyer can judge a product.' },
    ], persona: { needsLabel: 'WHAT SHE NEEDS', name: 'The label reader', needs: [{ kind: 'Clarity', body: 'The active and its percentage up front.' }, { kind: 'Sequence', body: 'A routine order that works across brands.' }, { kind: 'Proof', body: 'A study, not a promise.' }] } } },
    { id: 's11', template: 'slides:section-divider', brand: 'deciem', title: 'What DECIEM does next', composerPayload: { number: '02', title: 'What DECIEM does next', supporting: 'Three moves for the ingredient-first buyer.' } },
    { id: 's12', template: 'slides:aggregate-roadmap', brand: 'deciem', title: 'Three moves across three horizons', composerPayload: { eyebrow: 'ROADMAP', title: 'Three moves across three horizons', horizons: ['Now', 'Next', 'Later'], roles: [
        { name: 'Content', cells: ['Ingredient pages lead', 'Regimen builder', 'Results tracker'] },
        { name: 'Shelf', cells: ['Percentage on the label', 'Step badges', 'Cross-brand routine cards'] },
        { name: 'Follow-up', cells: ['Week-two check-in', 'Week-eight result prompt', 'Routine refresh'] },
    ], sourceLine: 'Sources: engagement synthesis' } },
];

const positions = deckPositions(DECK);
const htmls = DECK.map((s, i) => slideDataToStageHtml(s, positions[i]));

type Canvas = 'cover' | 'pop' | 'paper-art' | 'paper-plain' | 'black';
function canvasOf(i: number): { canvas: Canvas; artFile: string; zones: { x: number; y: number; w: number; h: number }[] } {
    const s = DECK[i];
    const t = String(s.template);
    if (t.startsWith('slides:')) {
        const arch = t.slice('slides:'.length);
        const plan = planCanvasFor(arch, s.composerPayload, 'deciem', positions[i])!;
        const canvas: Canvas = plan.family === 'cover' ? 'cover' : plan.kind === 'pop' ? 'pop' : plan.kind === 'dark' ? 'black' : plan.artFile ? 'paper-art' : 'paper-plain';
        return { canvas, artFile: plan.artFile, zones: plan.zones };
    }
    const pick = brandBodyArtPick('deciem', s.title, positions[i].deckIndex)!;
    return { canvas: 'paper-art', artFile: pick.file, zones: pick.zones };
}
/** Every absolutely positioned TEXT box in a composed stage doc (left/top/width/font-size + text). */
function textBoxes(html: string): Array<{ x: number; y: number; w: number; h: number; size: number; style: string; text: string }> {
    return [...html.matchAll(/<div style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;([^"]*)">([^<]+)<\/div>/g)]
        .filter(m => /font-size:(\d+)px/.test(m[4]) && m[5].trim().length > 0)
        .map(m => {
            const size = Number(/font-size:(\d+)px/.exec(m[4])![1]) || 20;
            const lh = Number((/line-height:([\d.]+)/.exec(m[4]) || [])[1]) || 1.25;
            const upper = /text-transform:uppercase/.test(m[4]);
            const cpl = Math.max(1, Math.floor(Number(m[3]) / (size * (upper ? 0.68 : 0.52))));
            const lines = Math.max(1, Math.ceil(m[5].length / cpl));
            return { x: +m[1], y: +m[2], w: +m[3], h: Math.ceil(lines * size * lh), size, style: m[4], text: m[5] };
        });
}

describe('DECIEM 12-slide deck: deck-order rotation + canvas families', () => {
    it('deckPositions numbers the deck and counts dividers before each slide', () => {
        expect(positions.map(p => p.deckIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        expect(positions[1].dividerOrdinal).toBe(0);
        expect(positions[10].dividerOrdinal).toBe(1);
        expect(positions[11].dividerOrdinal).toBe(2);
    });
    it('every slide renders as a DECIEM doc with no rail / dot-mark and Poppins loaded', () => {
        for (const h of htmls) {
            expect(h).toContain('data-brand="deciem"');
            expect(h).toContain('Poppins');
            expect(h).not.toContain('class="rail"');
            expect(h).not.toContain('class="dotmark"');
        }
    });
    it('canvas families follow the template rules', () => {
        const c = DECK.map((_, i) => canvasOf(i).canvas);
        expect(c[0]).toBe('cover');
        expect(c[1]).toBe('pop');
        expect(c[10]).toBe('pop');
        expect(c[7]).toBe('black');          // block-quote = NIOD dark layout
        expect(c[8]).toBe('paper-plain');    // evidence-table = table family, no corner art
        expect(c[9]).toBe('paper-plain');    // role-needs = panel family, no corner art
        expect(c[11]).toBe('paper-plain');   // aggregate-roadmap = table family
        for (const i of [2, 3, 4, 5, 6]) expect(c[i]).toBe('paper-art');
        // deck mix (cover excluded): 5 paper+art, 3 plain tables/panels, 1 black, 2 pop
        const body = c.slice(1);
        expect(body.filter(x => x === 'paper-art').length).toBe(5);
        expect(body.filter(x => x === 'black').length).toBe(1);
        expect(body.filter(x => x === 'pop').length).toBe(2);
    });
    it('consecutive body slides never share an art file; the art slides use distinct files', () => {
        const files = DECK.map((_, i) => canvasOf(i).artFile).filter(Boolean);
        expect(files.length).toBe(5);
        expect(new Set(files).size).toBeGreaterThanOrEqual(4);
        for (let i = 2; i < DECK.length; i++) {
            const a = canvasOf(i - 1).artFile, b = canvasOf(i).artFile;
            if (a && b) expect(a).not.toBe(b);
        }
        // stride 5 over 12: the whole set appears before any repeat
        const art = getBrandArt('deciem')!;
        const seq = Array.from({ length: 12 }, (_, k) => brandBodyArtPick('deciem', 'x', k)!.file);
        expect(new Set(seq).size).toBe(12);
        expect(seq.every(f => art.bodyBackgrounds.some(b => b.file === f))).toBe(true);
        // consecutive picks differ in pop color too
        const pops = Array.from({ length: 12 }, (_, k) => brandBodyArtPick('deciem', 'x', k)!.pop);
        for (let k = 1; k < 12; k++) expect(pops[k]).not.toBe(pops[k - 1]);
    });
    it('the two dividers use different pop fills, neither black', () => {
        const d1 = brandDividerFill('deciem', DECK[1].title, positions[1].dividerOrdinal)!;
        const d2 = brandDividerFill('deciem', DECK[10].title, positions[10].dividerOrdinal)!;
        expect(d1.fill).not.toBe(d2.fill);
        expect(d1.fill.toUpperCase()).not.toBe('#000000');
        expect(d2.fill.toUpperCase()).not.toBe('#000000');
        expect(htmls[1]).toContain(`background:${d1.fill}`);
        expect(htmls[10]).toContain(`background:${d2.fill}`);
        expect(htmls[1]).toContain(LOCKUP);
        expect(htmls[10]).toContain(LOCKUP);
    });
    it('cover and dividers carry the lockup; body slides (the black quote included) do not', () => {
        for (const i of [0, 1, 10]) expect(htmls[i]).toContain(LOCKUP);
        for (const i of [2, 3, 4, 5, 6, 7, 8, 9, 11]) expect(htmls[i]).not.toContain(LOCKUP);
    });
    it('takeaway bands are black with white type, never a pop fill (both twins)', () => {
        // composer evidence-table band carrier (wide accent rect) -> rail
        expect(htmls[8]).toMatch(/top:858px;width:1622px;height:100px;background:#000000/);
        // GOLD theme-detail band override
        expect(htmls[4]).toContain('#stage .toband,#stage .tdband,#stage .toc .pill.dom,#stage .tdpill.dom{background:#000000;color:#FFFFFF}');
    });
    it('word figures on the stat row are sized to fit their column (no cross-column collision)', () => {
        const figs = [...htmls[6].matchAll(/<div style="position:absolute;left:(\d+)px;top:(\d+)px;width:(\d+)px;([^"]*)">(LITERATE|ROUTINE|PATIENT)<\/div>/gi)];
        expect(figs.length).toBe(3);
        for (const f of figs) {
            const size = Number(/font-size:(\d+)px/.exec(f[4])![1]);
            expect(size * 0.66 * f[5].length).toBeLessThanOrEqual(Number(f[3]) + 1);
        }
    });
    it('cover / divider / thesis titles render Poppins 700 uppercase; no italics anywhere', () => {
        // cover title region: display face, hero size, weight 700, uppercase
        expect(htmls[0]).toMatch(/font-family:'Poppins', sans-serif;font-size:\d+px;font-weight:700;[^"]*text-transform:uppercase/);
        expect(htmls[1]).toMatch(/font-family:'Poppins', sans-serif;font-size:\d+px;font-weight:700;[^"]*text-transform:uppercase/);
        for (const h of htmls) {
            // composer output never carries an inline italic; the GOLD shell forces normal with !important
            if (/^<!DOCTYPE html>[\s\S]*class="canvas"/.test(h)) expect(h).toContain('font-style:normal!important');
            else expect(h).not.toContain('font-style:italic');
        }
    });
    it('the GOLD body slide (theme-detail) takes zone-derived insets (least-area rule), full width when the zones allow', () => {
        const pick = brandBodyArtPick('deciem', DECK[4].title, 4)!;
        const ins = goldArtInsets(pick.zones, true);
        expect(htmls[4]).toContain(`.canvas{position:absolute;left:${ins.left}px;top:0;right:${ins.right}px;bottom:${ins.bottom}px;padding:${ins.top}px`);
        expect(htmls[4]).toContain(pick.url);
        // the canvas box is clear of every measured zone
        const box = { x: ins.left, y: ins.top, w: 1920 - ins.left - ins.right, h: 1080 - ins.top - ins.bottom };
        expect(rectHitsZones(box, pick.zones)).toBe(false);
    });
    it('measured zones: the backgrounds carry zones and brandArtZones prefers them over the corner heuristic', () => {
        const art = getBrandArt('deciem')!;
        expect(art.bodyBackgrounds.every(b => Array.isArray((b as any).zones) && (b as any).zones.length > 0)).toBe(true);
        expect(brandArtZones(art.bodyBackgrounds[0])).toEqual((art.bodyBackgrounds[0] as any).zones);
    });
    it('no composed text box intersects a MEASURED art zone on paper+art slides', () => {
        for (const i of [2, 3, 5, 6]) {
            const { artFile, zones, canvas } = canvasOf(i);
            expect(canvas).toBe('paper-art');
            const boxes = textBoxes(htmls[i]);
            expect(boxes.length).toBeGreaterThan(4);
            const hits = boxes.filter(b => rectHitsZones(b, zones));
            expect(hits, `slide ${i + 1} (${artFile}) text over art: ${hits.map(h => h.text.slice(0, 30)).join(' | ')}`).toEqual([]);
        }
    });
    it('the theme slides keep 4 full-width columns on every background', () => {
        for (const i of [2, 3, 5]) {
            const nums = textBoxes(htmls[i]).filter(b => /^0[1-4]$/.test(b.text.trim()));
            expect(nums.length).toBe(4);
            const lefts = nums.map(n => n.x).sort((a, b) => a - b);
            expect(lefts).toEqual([196, 614, 1032, 1450]);
            // every column body keeps the full 380px measure
            const bodies = textBoxes(htmls[i]).filter(b => /Buyers name the active|Routines mix brands|Visible results take|Clinical language earns/.test(b.text));
            expect(bodies.length).toBe(4);
            for (const b of bodies) expect(b.w).toBe(380);
        }
    });
    it('the smallest body-face type on any slide is >= 0.9 x its tier (no slide-wide shrink)', () => {
        const scale = (getBrand('deciem') as any).TYPE_SCALE || {};
        const bodyReadable = scale.bodyReadable || 28, caption = scale.caption || 18;
        for (const h of htmls) {
            const josefin = textBoxes(h).filter(b => /Josefin Sans/.test(b.style));
            for (const b of josefin) expect(b.size).toBeGreaterThanOrEqual(Math.floor(0.9 * caption));
        }
        for (const i of [2, 3, 5]) {
            const bodies = textBoxes(htmls[i]).filter(b => /Buyers name the active|Routines mix brands|Visible results take|Clinical language earns/.test(b.text));
            for (const b of bodies) expect(b.size).toBeGreaterThanOrEqual(Math.floor(0.9 * bodyReadable));
        }
    });
    it('the stat-row title never runs into the word figures (long two-line title)', () => {
        const long = { ...DECK[6].composerPayload, title: 'Three patterns define the first purchase and decide which serum the ingredient-first buyer picks up' };
        const h = composeSlide('stat-row', long, 'deciem', positions[6])!;
        const boxes = textBoxes(h);
        const title = boxes.find(b => /Three patterns define/.test(b.text))!;
        const figs = boxes.filter(b => /^(LITERATE|ROUTINE|PATIENT)$/i.test(b.text.trim()));
        expect(figs.length).toBe(3);
        for (const f of figs) expect(title.y + title.h).toBeLessThanOrEqual(f.y);
    });
    it('the block-quote mark sits in the left gutter, never over the first quote line', () => {
        const boxes = textBoxes(htmls[7]);
        const mark = boxes.find(b => b.text.trim() === '“')!;
        const quote = boxes.find(b => /I look for niacinamide/.test(b.text))!;
        expect(mark.x + mark.w).toBeLessThanOrEqual(quote.x);
    });
    it('stat numerals rotate the four pop colors', () => {
        const h = htmls[6];
        for (const c of ['#FB48C4', '#00FACC', '#8A69D4']) expect(h).toContain(`;color:${c}`);
    });
    it('the evidence table has a black header band with white Poppins heads; the quote slide is black with a pink mark', () => {
        expect(htmls[8]).toMatch(/top:278px;width:1622px;height:40px;background:#000000/);
        expect(htmls[7]).toContain('background:#000000');
        expect(htmls[7].toLowerCase()).toContain('color:#fb48c4');
    });
    it('art-vs-imagery: a body slide carrying imagery gets no corner art', () => {
        const withImg = { ...DECK[2], composerPayload: { ...DECK[2].composerPayload, itemImages: ['data:image/png;base64,AAAA', '', '', ''] } };
        expect(hasFilledImagery(withImg.composerPayload)).toBe(true);
        const h = composeSlide('numbered-themes', withImg.composerPayload, 'deciem', positions[2])!;
        expect(h).not.toContain('/api/design-assets/deciem/');
        expect(composerCanvasFamily('numbered-themes')).toBe('body');
    });
    it('writes the twelve stage docs for the contact sheet', () => {
        fs.mkdirSync(OUT, { recursive: true });
        htmls.forEach((h, i) => fs.writeFileSync(path.join(OUT, `slide-${String(i + 1).padStart(2, '0')}.html`), h, 'utf8'));
        fs.writeFileSync(path.join(OUT, '_plan.json'), JSON.stringify(DECK.map((s, i) => ({ i: i + 1, template: s.template, ...canvasOf(i) })), null, 2));
        expect(fs.existsSync(path.join(OUT, 'slide-12.html'))).toBe(true);
    });
});
