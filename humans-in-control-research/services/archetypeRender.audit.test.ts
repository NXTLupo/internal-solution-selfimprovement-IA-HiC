/**
 * 2026-10-21: renders EVERY registered deck archetype from the composer's representative payloads into the same stage
 * HTML the preview and the PPTX exporter use, for a rendered visual audit (one file per archetype, plus the image
 * variant where the archetype has one). Output: ARCHETYPE_RENDER_DIR (env) or the OS temp dir.
 */
import { it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { archetypeKeys, archetypeSpec } from './slideComposer';
import { slideDataToStageHtml } from './slideToStageHtml';
import { SAMPLES } from './slideComposer.test';

// A neutral photograph stand-in (SVG data URI) so image variants render their treatment without a model call.
const PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a6f7a"/><stop offset="1" stop-color="#1f2a30"/></linearGradient></defs><rect width="1536" height="1024" fill="url(#g)"/><circle cx="1100" cy="380" r="160" fill="#c9d3d8" opacity=".55"/><rect x="180" y="640" width="900" height="220" fill="#0d0d0d" opacity=".35"/></svg>',
);

// Representative payloads for the archetypes the composer suite does not sample (image-led surfaces).
const EXTRA: Record<string, any> = {
    'screen-critique': { kicker: 'HEURISTIC AUDIT', title: 'The checkout form hides the total until the last step', screenImage: PHOTO, findings: [
        { number: '01', severityLabel: 'SEVERE', heading: 'The order total appears only after payment details', body: 'Shoppers enter card data before they know the delivery charge, so the form is abandoned at the last step.', fix: 'Show the running total beside the basket from step one.' },
        { number: '02', severityLabel: 'MODERATE', heading: 'Error messages sit above the fold, away from the field', body: 'A failed postcode check prints at the top of the page while the field stays unmarked.', fix: 'Mark the field inline and keep focus on it.' },
        { number: '03', severityLabel: 'MINOR', heading: 'Promo code entry competes with the pay button', body: 'Two equal-weight controls share the final row.', fix: 'Demote the promo link to text under the total.' },
    ], sourceLine: 'Source: checkout flow capture, release 4.2' },
    'screen-redesign': { kicker: 'PROPOSED SCREEN', title: 'Move the order total and delivery charge beside the basket', currentImage: PHOTO, proposedImage: PHOTO, legend: '1 Running total pinned to the basket panel. 2 Inline postcode validation. 3 Promo entry demoted under the total.', takeaway: { label: 'TAKEAWAY', statement: 'The shopper sees the full cost before entering a card, which removes the last-step abandonment.' }, sourceLine: 'Source: checkout flow capture, release 4.2' },
    'scene': { kicker: 'THE SHIFT', title: 'Advisors now open the day in one queue', body: 'Every overnight request, hold and exception lands in one ranked list, so the advisor starts with the student who needs a decision first.', illustration: PHOTO },
};

it('renders every archetype to stage HTML for the visual audit', () => {
    const dir = process.env.ARCHETYPE_RENDER_DIR || path.join(os.tmpdir(), 'hic-archetype-renders');
    fs.mkdirSync(dir, { recursive: true });
    const written: string[] = [];
    for (const k of archetypeKeys()) {
        const sample = SAMPLES[k] || EXTRA[k];
        if (!sample) { written.push(`${k}: NO SAMPLE`); continue; }
        const base = slideDataToStageHtml({ id: `audit_${k}`, template: `slides:${k}`, brand: 'nxt', composerPayload: JSON.parse(JSON.stringify(sample)) } as any);
        fs.writeFileSync(path.join(dir, `${k}.html`), base);
        written.push(`${k}.html (${base.length})`);
        const spec: any = archetypeSpec(k);
        const carriers = new Set<string>((spec?.variants || []).map((v: any) => v.when));
        for (const c of carriers) {
            const pay: any = JSON.parse(JSON.stringify(sample));
            if (c === 'itemImages' && Array.isArray(pay.items)) pay.itemImages = pay.items.map(() => PHOTO);
            else if (c === 'outcome') continue;
            else pay[c] = PHOTO;
            const html = slideDataToStageHtml({ id: `audit_${k}_${c}`, template: `slides:${k}`, brand: 'nxt', composerPayload: pay } as any);
            fs.writeFileSync(path.join(dir, `${k}__${c}.html`), html);
            written.push(`${k}__${c}.html (${html.length})`);
        }
    }
    process.stdout.write(`\nARCHETYPE_RENDERS ${dir}\n${written.join('\n')}\n`);
});
