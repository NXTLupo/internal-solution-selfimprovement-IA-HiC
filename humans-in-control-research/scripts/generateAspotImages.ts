/**
 * generateAspotImages.ts â€” produces realistic industry-specific promotional
 * photography for the A-Spot banner patterns (65-74) in the AI Experience
 * Patterns showcase. Each image is rendered at 16:9 (landscape banner)
 * with explicit NO-TEXT, NO-LOGO constraints so the resulting promo can be
 * paired with any brand chrome (NXT or NU) without conflict.
 *
 * Uses gemini-3.1-flash-image-preview (Nano Banana). Output saved to:
 *   wiki/inspiration-hub/ai-patterns/aspot-images/<industry>.jpg
 *
 * Usage:
 *   cd humans-in-control-research
 *   npx tsx scripts/generateAspotImages.ts                # all 10
 *   npx tsx scripts/generateAspotImages.ts --only=higher-ed
 *   npx tsx scripts/generateAspotImages.ts --skip-existing
 *
 * Cost: ~$0.04/image Ã— 10 = ~$0.40 total. Runtime ~60-90s single-threaded.
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'hic-workspace/wiki/inspiration-hub/ai-patterns/aspot-images');

function loadEnv() {
  if (process.env.GEMINI_API_KEY || process.env.API_KEY) return;
  for (const envPath of [
    path.join(PROJECT_ROOT, '.env.local'),
    path.join(PROJECT_ROOT, '.env'),
    path.join(REPO_ROOT, '.env'),
  ]) {
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!API_KEY) { console.error('FATAL: GEMINI_API_KEY not set.'); process.exit(1); }

const NO_TEXT = 'CRITICAL: Do NOT include ANY readable text, words, letters, numbers, logos, brand marks, signs, screens, billboards, papers with writing, or anything containing typography. AI image models cannot spell. Zero readable characters in the output. Pure photography â€” subjects, environment, light only.';

interface Industry {
  slug: string;
  label: string;
  prompt: string;
}

const INDUSTRIES: Industry[] = [
  {
    slug: 'higher-ed',
    label: 'Higher Education',
    prompt: 'Editorial photography of a diverse group of college students walking across a leafy university quad in golden-hour autumn light. Three to four young adults in their late teens / early twenties, laughing mid-stride, carrying laptops and backpacks. Brick collegiate architecture softly out of focus in background. Warm honey-tone lighting, shallow depth of field, Leica documentary aesthetic. Tasteful, aspirational, not stock-photo cheesy.',
  },
  {
    slug: 'healthcare',
    label: 'Healthcare',
    prompt: 'Documentary-style photography of a kind doctor in a clean modern medical clinic, mid-30s, gently consulting with an older patient. Soft natural light through frosted-glass partition. Cool clinical whites mixed with warm wood accents. Both people calm, focused, present. Hands visible â€” doctor gesturing toward a tablet (held face away from camera, no screen visible). Patient-centered, dignified, modern healthcare aesthetic. Editorial Annual-Report quality.',
  },
  {
    slug: 'finance',
    label: 'Finance / Wealth',
    prompt: 'Premium editorial photography of a woman in her 40s reviewing financial documents at a minimal modern wood desk, soft morning light from large window left. Wearing a structured blazer. Coffee cup, fountain pen, single orchid. Calm, focused expression. Aerial three-quarter angle. Tonal palette of warm taupes, deep navy, single accent of brass. Wall Street Journal cover aesthetic, NOT generic corporate stock.',
  },
  {
    slug: 'insurance',
    label: 'Insurance',
    prompt: 'Warm lifestyle photography of a young multi-generational family â€” parents in their late 30s, two children ages 6 and 9 â€” standing in front of a charming craftsman-style home with their new puppy. Late afternoon golden light. The family is relaxed and connected, not posed. Garden hose visible, kids dressed casually. Suburban Americana but tasteful, not saccharine. Documentary editorial, Vogue Living quality.',
  },
  {
    slug: 'nonprofit',
    label: 'Nonprofit / Donations',
    prompt: 'Photojournalism photography of multiple hands of different skin tones meeting at the center of a wooden community garden table, planting seedlings together. Sunlight dappled through trees. Three to five people partially visible â€” only hands, forearms, and torsos in frame. Real dirt on hands, real seedlings in small clay pots. Soft natural light. NPR / National Geographic aesthetic. Genuine, not aspirational stock.',
  },
  {
    slug: 'ecommerce',
    label: 'Ecommerce / Retail',
    prompt: 'Premium product lifestyle photography of a beautifully arranged minimal still life on a warm cream linen surface â€” folded organic-cotton tee in muted sage, a leather card holder in cognac, a small ceramic vessel, a single sprig of dried lavender. Soft directional north light. Subtle shadows. Aerial straight-down composition. The aesthetic of a luxury Japanese-Scandinavian DTC brand. Tactile, restrained, expensive.',
  },
  {
    slug: 'government',
    label: 'Government / Civic',
    prompt: 'Architectural documentary photography of the marble interior of a modern civic building, late morning. A wide central hallway with a citizen approaching a clean wood service counter where a uniformed staff member helps them. Soft daylight through large windows. The architecture conveys public dignity and accessibility â€” high ceilings, clean lines, no decorative excess. Editorial editorial of public service done right. Annie Leibovitz portrait energy meets architectural digest.',
  },
  {
    slug: 'real-estate',
    label: 'Real Estate',
    prompt: 'Interior photography of a sun-filled modern apartment living room. Mid-century furniture in muted tones, a large neutral linen sectional, a worn leather chair, a bookcase with curated books, a green plant in a clay pot, large windows showing soft city skyline at golden hour. Hardwood floors. Empty room â€” no people. Editorial, aspirational, Dwell magazine quality. Warm, livable, not staged-stiff.',
  },
  {
    slug: 'saas',
    label: 'B2B SaaS / Tech',
    prompt: 'Editorial photography of a small product team in a quietly-lit minimal workspace, three people in late twenties to early thirties gathered around a wooden communal table reviewing print-outs. Natural daylight from large warehouse-style window. Plants visible. Laptops closed in the background â€” focus on paper, sketches, and conversation. Architectural Digest workplace aesthetic, NOT generic tech-bro stock. Calm, deliberate, design-led.',
  },
  {
    slug: 'editorial',
    label: 'News / Editorial',
    prompt: 'Documentary portrait photography of a thoughtful journalist in their 40s in a quiet newsroom corner, late afternoon. Sitting at a desk with notebooks open, a phone receiver mid-conversation, head tilted slightly down. Soft natural window light from camera-left. Stacks of books and folders, no readable text. The mood is contemplative, the craft is visible. Granta magazine portrait aesthetic.',
  },
];

const args = process.argv.slice(2);
const onlyMatch = args.find(a => a.startsWith('--only='))?.split('=')[1];
const skipExisting = args.includes('--skip-existing');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const subset = onlyMatch ? INDUSTRIES.filter(i => i.slug === onlyMatch) : INDUSTRIES;
  if (subset.length === 0) { console.error('No matching industry. Available:', INDUSTRIES.map(i => i.slug).join(', ')); process.exit(1); }

  let ok = 0, skipped = 0, failed = 0;
  const start = Date.now();

  for (let i = 0; i < subset.length; i++) {
    const ind = subset[i];
    const outPath = path.join(OUT_DIR, `${ind.slug}.jpg`);
    if (skipExisting && fs.existsSync(outPath)) { console.log(`  [${i+1}/${subset.length}] SKIP ${ind.slug} (exists)`); skipped++; continue; }
    process.stdout.write(`  [${i+1}/${subset.length}] ${ind.slug.padEnd(14)} `);
    try {
      const finalPrompt = ind.prompt + ' ' + NO_TEXT;
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }] as any,
        config: { imageConfig: { aspectRatio: '16:9' as any } } as any,
      });
      let saved = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) {
          fs.writeFileSync(outPath, Buffer.from((part as any).inlineData.data, 'base64'));
          console.log(`OK â†’ ${outPath}`);
          saved = true; ok++;
          break;
        }
      }
      if (!saved) { console.log('FAIL Â· no image returned'); failed++; }
      await new Promise(r => setTimeout(r, 1500));
    } catch (e: any) {
      console.log('FAIL Â· ' + (e?.message || String(e)).slice(0, 100));
      failed++;
    }
  }
  console.log(`\nDone. ok=${ok} skip=${skipped} fail=${failed} Â· ${Math.round((Date.now()-start)/1000)}s`);
}

main().catch(e => { console.error(e); process.exit(1); });
