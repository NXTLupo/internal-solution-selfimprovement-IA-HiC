/**
 * generateExemplarPatterns.ts â€” batch image generator that produces
 * NXT-reimagined and NU-reimagined versions of every Behance exemplar.
 *
 * For each exemplar in `_raw_index.json`, the script:
 *   1. Fetches the source thumbnail from Behance's CDN
 *   2. Calls Gemini 2.5 Flash Image (Nano Banana) with the source as a
 *      ref image and an NXT-brand-translation prompt, saving the result
 *      to wiki/exemplars/behance/<tag>/generated/<id>-nxt.png
 *   3. Repeats for the NU-brand-translation prompt â†’ <id>-nu.png
 *
 * The ref-image input is load-bearing â€” without it the model invents
 * a generic UI that has nothing to do with the source. With it, the model
 * preserves the source's composition + information architecture and only
 * swaps the design language to the requested brand.
 *
 * Usage:
 *   cd humans-in-control-research
 *   npx tsx scripts/generateExemplarPatterns.ts                    # all 105 exemplars
 *   npx tsx scripts/generateExemplarPatterns.ts --id=behance-...   # just one
 *   npx tsx scripts/generateExemplarPatterns.ts --limit=5          # first 5 by index order
 *   npx tsx scripts/generateExemplarPatterns.ts --skip-existing    # don't regenerate present files
 *
 * Cost: gemini-3.1-flash-image-preview at ~$0.04/image, 2 images per exemplar,
 *       so ~$0.08 per exemplar. 105 exemplars Ã— 2 = 210 images = ~$8.40 total.
 * Time: roughly 1-2 sec generation + 1 sec polite spacing per image,
 *       so ~5-7 min for all 105 single-threaded.
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..');
const INDEX_PATH = path.join(PROJECT_ROOT, 'hic-workspace/wiki/exemplars/behance/_raw_index.json');
const EXEMPLARS_BASE = path.join(PROJECT_ROOT, 'hic-workspace/wiki/exemplars/behance');

// â”€â”€â”€ Env loading â”€â”€â”€
function loadEnv() {
  if (process.env.GEMINI_API_KEY || process.env.API_KEY) return;
  const candidates = [
    path.join(PROJECT_ROOT, '.env.local'),
    path.join(PROJECT_ROOT, '.env'),
    path.join(REPO_ROOT, '.env'),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}
loadEnv();

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!API_KEY) {
  console.error('FATAL: GEMINI_API_KEY (or API_KEY) not set. Add to .env.local or export in shell.');
  process.exit(1);
}

// â”€â”€â”€ Brand prompts â”€â”€â”€
// Both prompts include a "no readable text" constraint because AI image
// models can't spell. The brand language is what makes the prompts distinct.

// PRE-PROMPT (shared) â€” Strips the marketing/promo treatment Behance covers
// universally apply: tilted 3D phone mockups, isolated hero backgrounds,
// decorative props, dramatic shadows, brand-watermarked layouts. We want only
// the underlying UI that the designer built, rendered head-on as a clean
// screen capture, then re-skinned to NXT or NU.
const STRIP_PROMO_PREFACE = `Behance project covers are marketing presentations, not raw UI. They typically show 3D phone mockups tilted in space, decorative gradient backgrounds, isolated UI floating with prop shadows, branded promotional treatments.

YOUR JOB: extract ONLY the underlying user interface visible in the reference image â€” the actual app screens, dashboards, cards, lists, forms â€” and render them as if you were taking a clean head-on screenshot of that interface at native device resolution.

DROP ENTIRELY from the output:
- 3D phone, tablet, laptop, monitor bezels and mockup hardware
- Tilted/perspective transforms â€” render every screen straight-on, square to the camera
- Isolation backgrounds, gradient backdrops, color washes, marketing photography
- Decorative props (plants, hands, desks, devices the UI is laid on)
- Drop shadows that float the UI in space
- Brand watermarks, designer signatures, project names baked into the cover

KEEP AND TRANSLATE from the source:
- The actual interaction primitives the UI implements (assistant orb, schedule cards, family/team identity strip, dashboard widgets, form fields, gallery grid, settings list, voice waveform, recommendation cards, etc.)
- The general information architecture (sidebar+main, single column mobile, three-pane workspace, etc.)
- The screen count and layout topology, INSOFAR AS the source shows multiple discrete UI screens â€” render them tiled in a clean grid, NOT floating in space

Then APPLY the following design system to that extracted UI:`;

const NXT_PROMPT = `${STRIP_PROMO_PREFACE}

NXT HUMANS DESIGN SYSTEM:
- Anti-slop editorial brutalism. No gradients, no soft pastels, no rounded-everything softness.
- Canvas: stark white #FFFFFF or warm paper #F5F5F0 â€” fills the entire output frame edge-to-edge
- Single accent color: chartreuse-yellow #B8B800, used SPARINGLY (under 15% of surface), only on active states, key CTAs, callout backgrounds
- Secondary accent (rare): cyan #00B7C3 for evidence panels or info badges only
- Type rendering: Bebas Neue ALL-CAPS geometric condensed sans for display/labels, Archivo humanist sans for body, JetBrains Mono for numerics and codes
- Geometry: SHARP 2px corner radii on every card, button, input; 1px hairline rules in #E0E0E0; NO drop shadows; NO glows; NO blur; NO depth tricks
- Pure black #0D0D0D for headlines, #333333 body text, #666666 secondary, #999999 muted
- Editorial density â€” front-page-of-the-FT rhythm. Information-rich. Every pixel earns its keep.
- Numeric data uses tabular figures in JetBrains Mono with monospaced alignment

OUTPUT: a flat, full-bleed, head-on rendering of the source's UI re-skinned in NXT. The viewer must be able to identify this as "the source app's UI, rebuilt for NXT Humans" â€” not a marketing cover.

CRITICAL: Do NOT include any readable text, words, letters, numbers, or labels. AI image models cannot spell. Render text as abstract horizontal bars or geometric placeholders of varying widths. Zero readable characters.`;

const NU_PROMPT = `${STRIP_PROMO_PREFACE}

NORTHEASTERN UNIVERSITY ADVANCEMENT DESIGN SYSTEM:
- Institutional editorial â€” research-librarian voice, not consumer tech
- Canvas: slate-50 #F8FAFC or pure white panels â€” fills the entire output frame edge-to-edge
- Primary structural color: deep navy ink-900 #0B1326 and ink-800 #141D30 for text, headlines, dark surfaces, dashboard rails
- Brand accent: Huskies red #C8102E, used SPARINGLY â€” only on key CTAs, deadline anchors, status alerts, brand seals. Never as a background fill or large surface.
- Type rendering: Spectral Light (300 weight) serif for hero/display headlines, Spectral Semibold for section anchors, Roboto sans for body, Roboto Mono with tabular figures for data
- Geometry: rounded 8px card corners, 4px input radii, 999px pills/tags, soft institutional shadows (0 4px 12px rgba(11,19,38,0.08))
- Slate neutrals: slate-100 #F1F5F9, slate-200 #E2E8F0, slate-300 #CBD5E1 for borders and surfaces
- Semantic colors when relevant: success green #38A165 on #D7FBE3, warning amber #FA8834 on #FFEBD0
- Hierarchy reads as: serif headline anchor â†’ sans body â†’ mono data â€” the institutional rhythm

OUTPUT: a flat, full-bleed, head-on rendering of the source's UI re-skinned for Northeastern. Should read as a Northeastern admissions / advancement / alumni / student portal interface â€” institutional, refined, restrained.

CRITICAL: Do NOT include any readable text, words, letters, numbers, or labels. AI image models cannot spell. Render text as abstract horizontal bars or geometric placeholders of varying widths. Zero readable characters.`;

// â”€â”€â”€ Helpers â”€â”€â”€
async function fetchImageAsBase64(url: string): Promise<{ data: string; mime: string }> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'NXT-Humans-InspirationHub/1.0 (research)' },
  });
  if (!resp.ok) throw new Error(`Image fetch failed: HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const mime = resp.headers.get('content-type') || 'image/jpeg';
  return { data: buf.toString('base64'), mime };
}

// 2026-10-01 - DECIEM (The Abnormal Beauty Company), the third brand mode. Values mirror
// brands.ts deciemBrand (PPTX-template sourced). Not run yet: the deciem lane is wired so the
// next generation pass can emit {exemplar_id}-deciem.png beside the nxt / nu renders.
const DECIEM_PROMPT = `${STRIP_PROMO_PREFACE}

DECIEM DESIGN SYSTEM (The Abnormal Beauty Company):
- Black and white editorial canvases. Title and section surfaces are pure black #000000 with white type; body surfaces are white #FFFFFF with black type.
- Type rendering: Poppins Bold UPPERCASE for display and headlines, Josefin Sans for body, Poppins Bold uppercase for labels, Nunito for tables and data.
- Pops used as single accents per block: pink #FB48C4 (primary), cyan #00FACC, purple #8A69D4, orange #FF6C2F. Never a rainbow, never a gradient.
- Geometry: radius 0, thin 1px line-art, hairline rules #E3E3E3 on white and #2A2A2A on black. NO shadows, NO glows, NO blur, NO rail, NO dot mark.
- A thin-bordered lockup box reading as two stacked lines may appear in a corner (render as abstract bars, no letters).
- Minimal, product-literal, high-contrast. Every block has one dominant element.

OUTPUT: a flat, full-bleed, head-on rendering of the source's UI re-skinned for DECIEM. The viewer must be able to identify this as "the source app's UI, rebuilt for DECIEM" - not a marketing cover.

CRITICAL: Do NOT include any readable text, words, letters, numbers, or labels. AI image models cannot spell. Render text as abstract horizontal bars or geometric placeholders of varying widths. Zero readable characters.`;

type ExemplarBrand = 'nxt' | 'nu' | 'deciem';
const BRAND_PROMPTS: Record<ExemplarBrand, string> = { nxt: NXT_PROMPT, nu: NU_PROMPT, deciem: DECIEM_PROMPT };

async function generateImageForBrand(
  ai: GoogleGenAI,
  ex: any,
  brand: ExemplarBrand,
  source: { data: string; mime: string },
): Promise<string> {
  const prompt = BRAND_PROMPTS[brand];

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: source.mime, data: source.data } },
        { text: prompt },
      ],
    }] as any,
    config: { imageConfig: { aspectRatio: '4:3' as any } } as any,
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if ((part as any).inlineData) {
      const outDir = path.join(EXEMPLARS_BASE, ex.primary_tag, 'generated');
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${ex.exemplar_id}-${brand}.png`);
      fs.writeFileSync(outPath, Buffer.from((part as any).inlineData.data, 'base64'));
      return outPath;
    }
  }
  throw new Error('Model returned no image part');
}

function parseArgs() {
  const args: { id?: string; limit?: number; skipExisting?: boolean; tags?: string[] } = {};
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--id=')) args.id = a.split('=')[1];
    else if (a.startsWith('--limit=')) args.limit = parseInt(a.split('=')[1], 10);
    else if (a === '--skip-existing') args.skipExisting = true;
    else if (a.startsWith('--tag=')) {
      args.tags = (args.tags || []).concat(a.split('=')[1]);
    }
  }
  return args;
}

// â”€â”€â”€ Main â”€â”€â”€
async function main() {
  const args = parseArgs();
  const raw = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  let exemplars: any[] = raw.exemplars || [];

  if (args.id) exemplars = exemplars.filter(e => e.exemplar_id === args.id);
  if (args.tags && args.tags.length > 0) {
    exemplars = exemplars.filter(e =>
      args.tags!.includes(e.primary_tag) ||
      (e.all_tags || []).some((t: string) => args.tags!.includes(t)),
    );
  }
  if (args.limit) exemplars = exemplars.slice(0, args.limit);

  console.log(`[generateExemplarPatterns] Targeting ${exemplars.length} exemplar(s).`);
  if (exemplars.length === 0) {
    console.log('Nothing to generate. Pass --id=behance-... or --tag=ai-chatbot or --limit=N.');
    return;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  let okNxt = 0, okNu = 0, failed = 0;
  const startedAt = Date.now();

  for (let i = 0; i < exemplars.length; i++) {
    const ex = exemplars[i];
    console.log(`\n[${i + 1}/${exemplars.length}] ${ex.title}  (${ex.exemplar_id})`);

    const outDir = path.join(EXEMPLARS_BASE, ex.primary_tag, 'generated');
    const nxtOut = path.join(outDir, `${ex.exemplar_id}-nxt.png`);
    const nuOut = path.join(outDir, `${ex.exemplar_id}-nu.png`);

    try {
      const source = await fetchImageAsBase64(ex.image_url);

      if (args.skipExisting && fs.existsSync(nxtOut)) {
        console.log(`  NXT skip (exists): ${nxtOut}`);
      } else {
        const p = await generateImageForBrand(ai, ex, 'nxt', source);
        console.log(`  NXT ok â†’ ${p}`);
        okNxt++;
        await new Promise(r => setTimeout(r, 800));  // polite pacing
      }

      if (args.skipExisting && fs.existsSync(nuOut)) {
        console.log(`  NU  skip (exists): ${nuOut}`);
      } else {
        const p = await generateImageForBrand(ai, ex, 'nu', source);
        console.log(`  NU  ok â†’ ${p}`);
        okNu++;
        await new Promise(r => setTimeout(r, 1200));
      }
    } catch (e: any) {
      failed++;
      console.error(`  FAIL: ${e?.message || e}`);
    }
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\n[generateExemplarPatterns] Done. NXT: ${okNxt}, NU: ${okNu}, FAIL: ${failed}, elapsed: ${elapsed}s`);
}

main().catch(err => { console.error(err); process.exit(1); });
