#!/usr/bin/env node
/**
 * generateExemplarImages.mjs — batch generator for per-exemplar brand
 * reimaginings using Gemini 2.5 Flash Image (Nano Banana).
 *
 * For each exemplar in wiki/exemplars/behance/_raw_index.json this script
 * produces TWO PNGs: a NXT-styled reimagining and a NU-styled reimagining.
 * Output saved to wiki/exemplars/behance/<tag>/generated/<id>-{nxt|nu}.png.
 *
 * After completion, also writes wiki/exemplars/behance/_generated_manifest.json
 * with {exemplar_id, nxt_url, nu_url, generated_at} entries — the gallery
 * loads this and prefers generated images over the CSS template fallbacks.
 *
 * USAGE
 *   node scripts/generateExemplarImages.mjs                     # batch all
 *   node scripts/generateExemplarImages.mjs --only=behance-241915081
 *   node scripts/generateExemplarImages.mjs --brand=nxt         # one brand only
 *   node scripts/generateExemplarImages.mjs --limit=5           # first N
 *
 * REQUIREMENTS
 *   - GEMINI_API_KEY in env (read from repo-root .env if not set)
 *   - node >= 18 (uses native fetch)
 *
 * COST
 *   ~$0.04 per image. 105 exemplars × 2 brands = 210 images ≈ $8.40 total.
 *   Use --limit during testing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WIKI_BASE = path.join(__dirname, '..', 'hic-workspace', 'wiki', 'exemplars', 'behance');
const INDEX_PATH = path.join(WIKI_BASE, '_raw_index.json');
const MANIFEST_PATH = path.join(WIKI_BASE, '_generated_manifest.json');

// ─── Env loading (read from .env if GEMINI_API_KEY not in process env) ───
function loadEnv() {
    if (process.env.GEMINI_API_KEY) return;
    const envPath = path.join(REPO_ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
        if (!m) continue;
        const [, key, value] = m;
        if (!process.env[key]) process.env[key] = value.replace(/^["']|["']$/g, '');
    }
}
loadEnv();

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY missing. Set in env or repo-root .env.');
    process.exit(1);
}

// ─── CLI args ───
const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const m = a.match(/^--([a-z]+)=(.+)$/);
        return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
    }),
);

// ─── Brand prompt templates ───
const BRAND_STYLE = {
    nxt: [
        'A user interface design rendered in the NXT Humans brand: editorial-brutalism business flat minimalism.',
        'Typography: oversized Bebas Neue uppercase headlines, Archivo body text, JetBrains Mono for numeric data.',
        'Color palette: near-white #F5F5F0 page background, near-black #0D0D0D primary text, chartreuse #B8B800 as the SINGLE brand accent (max 15% of the visual surface), cyan #00B7C3 used sparingly for evidence callouts.',
        'Geometry: sharp 2px corners, no rounded shapes, no decorative shadows, no gradients.',
        'Density: high information density, editorial layout rhythm like the front page of an FT weekend edition.',
        'Forbidden: rounded-everything softness, generic SaaS-modal centering, pastel palettes, gradient overlays, rainbow color, stock-photo aesthetic.',
    ].join(' '),
    nu: [
        'A user interface design rendered in the Northeastern University Advancement Design System: institutional, scholarly, reserved.',
        'Typography: Spectral Light serif display headlines (large, refined, no all-caps), Roboto body text, Roboto Mono for tabular numerics.',
        'Color palette: slate-50 #F8FAFC page background, ink-900 navy #0B1326 as the primary text and structural color, Huskies red #C8102E used SPARINGLY only on key actions, deadlines, or active states (less than 5% of the surface).',
        'Geometry: refined 8px card radii, soft institutional shadows (subtle, never neon).',
        'Layout: editorial hierarchy, generous whitespace, hairline rules. Reads as a research librarian, not a consumer app.',
        'Forbidden: editorial-brutalist all-caps, chartreuse, decorative gradients, playful illustration, generic Copilot shell.',
    ].join(' '),
    // 2026-10-01 - DECIEM (The Abnormal Beauty Company), the third brand mode (brands.ts deciemBrand).
    deciem: [
        'A user interface design rendered in the DECIEM brand (The Abnormal Beauty Company): black and white editorial canvases, bold minimal, product-literal.',
        'Typography: Poppins Bold UPPERCASE headlines, Josefin Sans body text, Poppins Bold uppercase labels, Nunito for tables and numerics.',
        'Color palette: pure black #000000 title surfaces with white type, white #FFFFFF body surfaces with black type, pink #FB48C4 as the primary accent, cyan #00FACC, purple #8A69D4 and orange #FF6C2F as single pops per block.',
        'Geometry: radius 0, thin 1px line-art, no shadows, no gradients, no rail, no dot mark.',
        'Layout: one dominant element per block, generous black or white field, hairline rules.',
        'Forbidden: chartreuse, Huskies red, rainbow use of all pops at once, gradients, rounded SaaS cards, generic Copilot shell.',
    ].join(' '),
};

const NO_TEXT_RULE = 'CRITICAL: do not include any readable text, letters, words, or numbers in the image. Text rendering must remain a post-overlay step. The image must contain ZERO readable characters.';

function buildPrompt(ex, brand) {
    const style = BRAND_STYLE[brand];
    const tags = (ex.all_tags || []).join(', ');
    const subject = ex.title.replace(/^\s*|\s*$/g, '').slice(0, 120);
    const primitives = inferPrimitives(ex);
    return [
        style,
        `Subject: reimagine "${subject}" as a ${brand.toUpperCase()}-branded interface.`,
        `Core interaction primitive(s) to depict: ${primitives}.`,
        `Source tags context: ${tags}.`,
        NO_TEXT_RULE,
    ].join(' ');
}

function inferPrimitives(ex) {
    const tag = ex.primary_tag || 'generic';
    const map = {
        'ai-chatbot': 'an assistant orb or AI avatar, multi-message conversation surface, reasoning reveal card',
        'ai': 'an AI agent interface with reasoning steps and confidence indicator',
        'voice-chat': 'a voice waveform, listening-state orb with concentric rings, voice transcript stream',
        'dashboard': 'a multi-pane analytics dashboard with KPI tiles, line and bar charts, status indicators',
        'data-visualization': 'a precise data visualization with axes, hierarchical bars, and a legend',
        'mobile-ui': 'a smartphone frame showing a focused mobile UI with status bar, primary content, and one accent CTA',
        'profile': 'a user profile card with avatar, role label, stats row, and primary action',
        'persona': 'a persona card with portrait, goals list, frustrations, and a quote pull-out',
        'landing-page': 'a hero section with oversized typographic headline, value proposition, and two action buttons',
        'ecommerce': 'a product detail layout with image grid, price, options, and an add-to-cart CTA',
        'forms': 'a form with stacked input fields, an active focus state, and a primary submit button',
        'account': 'an account settings panel with grouped controls and a destructive-action area',
        'gallery': 'a gallery grid with featured tiles, filter chips, and editorial caption strip',
        'video': 'a video player with controls, timeline scrubber, and chapter markers',
        'avatar': 'an avatar customization panel with preview and trait sliders',
        'digital-human': 'a stylized digital portrait with environment, lighting, and material rendering',
        'recommendations': 'a recommendations panel with ranked cards, confidence indicators, and a why-this-match disclosure',
        'gamification': 'a progression UI with level bar, achievement tiles, and reward callout',
        'checklist': 'a task checklist with completed/pending states, time markers, and progress indicator',
        'tags': 'a chip-filter UI with active and inactive states, and a result count strip',
        'journey': 'a customer journey map with stages, touchpoints, and emotion curve',
    };
    return map[tag] || 'a focused interface surface with primary action and secondary support content';
}

// ─── Gemini API call (Nano Banana — gemini-2.5-flash-image) ───
async function generateOneImage(prompt, brand) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '4:3' },
        },
    };
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`HTTP ${resp.status} for ${brand}: ${errText.slice(0, 400)}`);
    }
    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
        if (p.inlineData?.data) {
            const mimeType = p.inlineData.mimeType || 'image/png';
            return { base64: p.inlineData.data, mimeType };
        }
    }
    throw new Error(`No image in response for ${brand}: ${JSON.stringify(data).slice(0, 300)}`);
}

function savePng(outPath, base64) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
}

function manifestUrl(ex, brand) {
    return `/hic-workspace/wiki/exemplars/behance/${ex.primary_tag}/generated/${ex.exemplar_id}-${brand}.png`;
}

function diskPath(ex, brand) {
    return path.join(WIKI_BASE, ex.primary_tag, 'generated', `${ex.exemplar_id}-${brand}.png`);
}

// ─── Main ───
async function main() {
    if (!fs.existsSync(INDEX_PATH)) {
        console.error(`Missing index at ${INDEX_PATH}`);
        process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
    let exemplars = raw.exemplars || [];

    if (args.only) exemplars = exemplars.filter(e => e.exemplar_id === args.only);
    if (args.limit) exemplars = exemplars.slice(0, parseInt(args.limit, 10));

    const brands = args.brand ? [args.brand] : ['nxt', 'nu', 'deciem'];

    console.log(`Generating ${exemplars.length} exemplars × ${brands.length} brand(s) = ${exemplars.length * brands.length} images`);
    console.log(`Estimated cost: ~$${(exemplars.length * brands.length * 0.04).toFixed(2)}`);

    let manifest = {};
    if (fs.existsSync(MANIFEST_PATH)) {
        try { manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')); } catch {}
    }
    if (!manifest.entries) manifest = { schema_version: 1, generated_at: new Date().toISOString(), entries: {} };

    let success = 0, skip = 0, fail = 0;

    for (let i = 0; i < exemplars.length; i++) {
        const ex = exemplars[i];
        const entry = manifest.entries[ex.exemplar_id] || {};
        for (const brand of brands) {
            const out = diskPath(ex, brand);
            if (!args.force && fs.existsSync(out)) {
                console.log(`  [${i+1}/${exemplars.length}] ${ex.exemplar_id} ${brand} — skip (already exists)`);
                entry[brand + '_url'] = manifestUrl(ex, brand);
                skip++;
                continue;
            }
            try {
                const prompt = buildPrompt(ex, brand);
                console.log(`  [${i+1}/${exemplars.length}] ${ex.exemplar_id} ${brand} — generating...`);
                const { base64 } = await generateOneImage(prompt, brand);
                savePng(out, base64);
                entry[brand + '_url'] = manifestUrl(ex, brand);
                entry.title = ex.title;
                entry.primary_tag = ex.primary_tag;
                entry.generated_at = new Date().toISOString();
                console.log(`    -> ${out.replace(REPO_ROOT, '')} (${Math.round(Buffer.from(base64, 'base64').length / 1024)}KB)`);
                success++;
                // Polite throttle — Gemini image API allows reasonable RPS but we don't need to push it
                await new Promise(r => setTimeout(r, 800));
            } catch (e) {
                console.error(`    !! ${ex.exemplar_id} ${brand} FAILED: ${e.message}`);
                fail++;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        manifest.entries[ex.exemplar_id] = entry;
        // Persist manifest incrementally so a crash doesn't lose progress
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    }

    console.log(`\nDone. success=${success} skip=${skip} fail=${fail}. Manifest at ${MANIFEST_PATH.replace(REPO_ROOT, '')}`);
}

main().catch(e => { console.error(e); process.exit(1); });
