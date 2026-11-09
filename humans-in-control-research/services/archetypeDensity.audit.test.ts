import { it } from 'vitest';
import { archetypeKeys, archetypeSpec } from './slideComposer';

// Text capacity estimate per archetype: for every prose/text region or cell with a width, chars ~= lines * cpl where
// cpl = w / (0.5 * px) and lines = fitH / (px * leading) (fitH absent -> 2 lines). Images/diagram/bars/matrix counted.
const PX: Record<string, number> = { kicker: 16, label: 16, caption: 18, bodyReadable: 28, body: 21, deckHeading: 24, deckTitle: 44, title: 36, numeral: 64, name: 26, display: 56 };
function px(size: any): number { if (typeof size === 'number') return size; return PX[String(size)] || 22; }

it('archetype density audit', () => {
    const rows: string[] = [];
    for (const k of archetypeKeys()) {
        const spec: any = archetypeSpec(k);
        let chars = 0, images = 0, visuals = 0, textRegions = 0;
        const walkRegions = (regions: any[], mult = 1) => {
            for (const r of regions || []) {
                if (r.kind === 'image') { images += mult; continue; }
                if (r.kind === 'matrix' || r.kind === 'chips' || r.kind === 'bar' || r.kind === 'band') { visuals += 1; }
                if (r.kind === 'columns') {
                    const n = r.count || 1;
                    for (const c of r.cells || []) {
                        if (c.kind === 'image') { images += n; continue; }
                        if (c.kind === 'bar') { visuals += n; continue; }
                        if (c.kind && c.kind !== 'text') continue;
                        if (!c.key) continue;
                        const p = px(c.size); const w = c.w || r.w || 400; const lines = c.fitH ? Math.max(1, Math.floor(c.fitH / (p * (c.leading || 1.3)))) : (c.prose ? 3 : 1);
                        chars += n * lines * Math.floor(w / (0.5 * p)); textRegions += n;
                    }
                    continue;
                }
                if (r.payload || r.literal) {
                    if (!r.payload) continue;
                    const p = px(r.size); const w = r.w || 600; const lines = r.fitH ? Math.max(1, Math.floor(r.fitH / (p * (r.leading || 1.3)))) : (r.prose ? 3 : 1);
                    chars += lines * Math.floor(w / (0.5 * p)); textRegions += 1;
                }
            }
        };
        walkRegions(spec.regions);
        const variantImages = (spec.variants || []).map((v: any) => v.when).join('/');
        rows.push(`${k.padEnd(22)} chars~${String(chars).padStart(5)} words~${String(Math.round(chars / 6)).padStart(4)} textRegions=${String(textRegions).padStart(2)} images=${images} visuals=${visuals} imageVariant=${variantImages || '-'} chrome=${spec.chrome}`);
    }
    process.stdout.write('\nARCHETYPE_AUDIT\n' + rows.join('\n') + '\n');
});
