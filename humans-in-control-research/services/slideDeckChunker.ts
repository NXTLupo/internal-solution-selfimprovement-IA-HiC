/**
 * Slide Deck Chunker - Per-theme parallel slide-deck generation.
 *
 * Replaces the single-shot `:::slide` deck generation that silently truncated
 * at ~4-5 slides regardless of how many were requested. Now: detect themes
 * in the prompt, generate slides per theme in parallel, merge the deck.
 *
 * Triggered from the chat hashtag router when `#slides` or `#case study`
 * appears AND the implied slide count exceeds 6.
 *
 * Created 2026-05-23 as part of the chunking + output-quality plan, Phase 2.
 */

import { runChunked } from './chunkDispatcher';
import { calculateChunkPlan, type FeedbackSignalsForChunking } from './chunkBudgetCalculator';
import { validateCompleteness } from './outputCompletenessValidator';
import { getBrand, type BrandVariantId } from '../components/slideTemplates/brands';
import { brandVariantOf } from './hashtagParser';

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface SlideDeckRequest {
    prompt: string;
    themes?: string[];
    slidesPerTheme?: number;
    brand?: BrandVariantId;
    template?: string;
    engagementSlug?: string;
    corpusContext?: string;
    feedbackSignals?: FeedbackSignalsForChunking;
}

export interface SlideDeckResult {
    deckMarkdown: string;
    totalSlides: number;
    expectedSlides: number;
    perThemeStatus: Array<{ theme: string; slideCount: number; ok: boolean }>;
    rationale: string;
}

/**
 * Heuristically extract themes from a user prompt.
 *
 * Strategy A (preferred): numbered list inline. Split on `, N. ` or
 * sentence-end before a `N.` marker. This works even when individual
 * themes contain their OWN internal commas (e.g., "Give Advisors &
 * Trailblazers Tools to Monitor, Connect, Guide, and Intervene") -
 * the earlier `[^,;.]` exclusion broke on this.
 *
 * Strategy B (fallback): bulleted list across lines.
 *
 * Strategy C (last resort): `themes: A, B, C` explicit list.
 */
function extractThemesFromPrompt(prompt: string): string[] {
    // Strategy A: numbered inline. We use a split-then-walk approach so
    // each theme can contain arbitrary internal punctuation.
    // Find every position where `\d+\.\s+[A-Z]` begins a numbered item.
    const numberStarts: Array<{ pos: number; n: number }> = [];
    // Leading-punctuation set covers ALL the realistic boundaries a numbered
    // list can be preceded by: start-of-string, comma, semicolon, period,
    // newline, colon (very common: "themes: 1. ..."), opening paren, hyphen.
    const itemStartRe = /(?:^|[,;:.\n()\-]\s*)(\d+)\.\s+(?=[A-Z])/g;
    let mm: RegExpExecArray | null;
    while ((mm = itemStartRe.exec(prompt)) !== null) {
        // Anchor at the position AFTER the leading punctuation
        const n = parseInt(mm[1], 10);
        const contentStart = mm.index + mm[0].length;
        numberStarts.push({ pos: contentStart, n });
    }
    // Only treat as a numbered list if we have >= 2 sequential numbers (1, 2,
    // 3, ...) - protects against false matches like "Section 4.5 ..."
    const isSequential = numberStarts.length >= 2 &&
        numberStarts.every((s, i) => i === 0 || s.n === numberStarts[i - 1].n + 1);
    if (isSequential) {
        const themes: string[] = [];
        for (let i = 0; i < numberStarts.length; i += 1) {
            const start = numberStarts[i].pos;
            let slice: string;
            if (i + 1 < numberStarts.length) {
                // Strip the trailing `, N+1. ` (or `. N+1. ` etc.) that's now
                // part of THIS item's slice because the next item's content
                // begins after the separator.
                slice = prompt.substring(start, numberStarts[i + 1].pos)
                    .replace(/[,;.\n]\s*\d+\.\s+$/, '');
            } else {
                // Last item: stop at the first sentence boundary that starts
                // a new sentence with a capital letter - e.g., ". Ensure ..."
                // after the final theme. Sentence boundary = `.` + whitespace
                // + capital letter.
                slice = prompt.substring(start).split(/\.\s+(?=[A-Z])/)[0];
            }
            const cleaned = slice.replace(/\s+/g, ' ').replace(/[,.;]$/, '').trim();
            if (cleaned.length > 5 && cleaned.length < 300) themes.push(cleaned);
        }
        if (themes.length >= 2) return themes;
    }

    // Strategy B: bullet list
    const bulletLines = prompt.match(/^\s*[-*]\s+(.+)$/gm);
    if (bulletLines && bulletLines.length >= 2) {
        const out: string[] = [];
        for (const line of bulletLines) {
            const theme = line.replace(/^\s*[-*]\s+/, '').trim();
            if (theme.length > 5 && theme.length < 300) out.push(theme);
        }
        if (out.length >= 2) return out;
    }

    // Strategy C: explicit "themes: A, B, C"
    const themeListMatch = prompt.match(/themes?\s*[:\-]\s*([^.\n]+)/i);
    if (themeListMatch) {
        const list = themeListMatch[1];
        const parts = list.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 5);
        if (parts.length >= 2) return parts;
    }

    return [];
}

/**
 * Heuristically extract requested slide count from prompt.
 */
function extractSlideCountFromPrompt(prompt: string): { perTheme?: number; total?: number } {
    const lc = prompt.toLowerCase();
    // `#?` makes the hashtag prefix optional - handles "5 case study #slides
    // per theme" (very common) just like "5 case study slides per theme".

    const perThemeMatch = lc.match(/(\d+)\s+(?:case\s+study\s+)?#?slides?\s+per\s+(?:theme|topic|item)/);
    if (perThemeMatch) return { perTheme: parseInt(perThemeMatch[1], 10) };

    const eachMatch = lc.match(/(\d+)\s+(?:named\s+)?(?:case\s+study\s+|university\s+)?#?slides?\s+(?:for\s+each|each|per\s+theme)/);
    if (eachMatch) return { perTheme: parseInt(eachMatch[1], 10) };

    const totalMatch = lc.match(/generate\s+(\d+)\s+(?:case\s+study\s+)?#?slides?/);
    if (totalMatch) return { total: parseInt(totalMatch[1], 10) };

    return {};
}

/**
 * Build the per-chunk LLM prompt for one theme.
 */
function buildChunkPrompt(opts: {
    theme: string;
    slidesPerTheme: number;
    brand: BrandVariantId;
    template: string;
    corpusContext: string;
    originalUserPrompt: string;
    feedbackHint?: string;
}): string {
    const d = getBrand('deciem');
    const brandBlock = opts.brand === 'NU'
        ? 'Brand: Northeastern University (NU). Background `#141414`, accent Huskies Red `#C8102E`.'
        : opts.brand === 'DECIEM'
            // 2026-10-01 - DECIEM (The Abnormal Beauty Company), values from the token mirror
            ? `Brand: DECIEM (The Abnormal Beauty Company). Black title canvases, white body slides \`#${d.WHITE}\`, ${d.FONT_DISPLAY} Bold uppercase headlines and labels, ${d.FONT_BODY} body, ${d.FONT_MONO} for tables and data, pink accent \`#${d.CHARTREUSE}\`, cyan \`#${d.CYAN}\` and purple \`#${d.ACCENT_COOL}\` pops.`
            : 'Brand: NXT Humans. Stark white background `#FFFFFF`, chartreuse accent `#B8B800`, cyan secondary `#00B7C3`.';

    return `You are generating slides for ONE theme of a multi-theme deck. Your job is to produce EXACTLY ${opts.slidesPerTheme} \`:::slide\` blocks for this theme. Do not produce slides for other themes.

THEME: ${opts.theme}

DECK CONTEXT (the user's original request):
${opts.originalUserPrompt.slice(0, 1500)}

${brandBlock}
Template: ${opts.template}

CORPUS CONTEXT:
${opts.corpusContext}

${opts.feedbackHint ? `FEEDBACK FROM A PRIOR ATTEMPT - INCORPORATE: ${opts.feedbackHint}\n` : ''}
RULES:
- Emit EXACTLY ${opts.slidesPerTheme} \`:::slide\` blocks. Not fewer.
- Each block: \`:::slide template=${opts.template} brand=${opts.brand.toLowerCase()}\` then a JSON object then \`:::\`.
- Every JSON object must have: title, sources (array of named source files), caseStudy: {subject, subjectMeta, timeframe, investment, challenge, approach, outcome, keyMetric: {value, label}, supportingMetrics: [{value, label}...], pullQuote: {text, attribution, role}, lesson, comparables: [{name, outcome, source}], implication}.
- Subjects must be NAMED real institutions or organizations (e.g., "Lehigh University", "Purdue University", "Michigan State University"). No fabricated entities.
- Cite specific source filenames from the corpus context in the sources array.
- No preamble. No framing language. No phrases like "Here are the slides".
- Output ONLY the ${opts.slidesPerTheme} slide blocks, nothing else.`;
}

/**
 * Main entry: generate a chunked slide deck.
 */
export async function generateChunkedSlideDeck(
    req: SlideDeckRequest,
): Promise<SlideDeckResult> {
    const themes = req.themes?.length ? req.themes : extractThemesFromPrompt(req.prompt);
    if (themes.length === 0) {
        throw new Error('No themes detected in prompt - slide-deck chunking requires explicit themes. Provide them via #themes=A,B,C or a numbered list.');
    }
    const counts = extractSlideCountFromPrompt(req.prompt);
    const slidesPerTheme = req.slidesPerTheme || counts.perTheme || (counts.total ? Math.ceil(counts.total / themes.length) : 5);
    const expectedSlides = themes.length * slidesPerTheme;

    const brand: BrandVariantId = req.brand || brandVariantOf(req.prompt);   // #NXT / #NU / #DECIEM
    const template = req.template || 'case-study';

    const plan = await calculateChunkPlan({
        artifactType: 'slides',
        expectedItemCount: expectedSlides,
        feedbackSignals: req.feedbackSignals,
    });

    const feedbackHint = req.feedbackSignals?.incomplete
        ? 'The previous attempt was truncated and only delivered partial content. Ensure THIS chunk is complete - emit every required slide.'
        : req.feedbackSignals?.tooShort
            ? 'The previous attempt was too shallow. Use the full per-chunk budget - pack each slide with named entities, quantified outcomes, verbatim quotes from the corpus.'
            : undefined;

    const dispatchResult = await runChunked<SlideDeckRequest, string, string>(
        {
            artifactType: 'slides',
            parallelism: plan.parallelism,
            perChunkRetries: 1,
            split: () => themes.map((theme, idx) => ({
                id: `theme-${idx + 1}`,
                payload: { theme, idx },
                description: theme,
            })),
            generate: async (chunkId, payload) => {
                const prompt = buildChunkPrompt({
                    theme: payload.theme,
                    slidesPerTheme,
                    brand,
                    template,
                    corpusContext: req.corpusContext || '(no corpus context provided)',
                    originalUserPrompt: req.prompt,
                    feedbackHint,
                });
                const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'gemini-3.5-flash',
                        contents: prompt,
                        config: {
                            temperature: 0.3,
                            maxOutputTokens: plan.perChunkOutputBudget,
                        },
                    }),
                });
                if (!resp.ok) throw new Error(`Chunk ${chunkId} HTTP ${resp.status}`);
                const data = await resp.json();
                const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (!text || text.length < 200) {
                    throw new Error(`Chunk ${chunkId} returned empty/short output (${text.length} chars)`);
                }
                return text;
            },
            validateChunk: (result, chunkId) => {
                const openMatches = result.match(/^:::slide(?:\s|$)/gm);
                const openCount = openMatches?.length || 0;
                if (openCount < slidesPerTheme) {
                    return {
                        ok: false,
                        reason: `Chunk ${chunkId} returned ${openCount} slides, expected ${slidesPerTheme}`,
                    };
                }
                return { ok: true };
            },
            merge: (chunks) => {
                const parts: string[] = [
                    `# ${themes.length}-theme deck (${expectedSlides} slides total)`,
                    '',
                    `Generated via per-theme chunked path (${themes.length} parallel calls).`,
                    '',
                ];
                chunks.forEach((c, idx) => {
                    parts.push(`### Theme ${idx + 1}: ${themes[idx]}`);
                    parts.push('');
                    parts.push(c.result.trim());
                    parts.push('');
                });
                return parts.join('\n');
            },
            validateFinal: (merged) => validateCompleteness(merged, {
                expectedFenceMarker: ':::slide',
                expectedItemCount: expectedSlides,
            }),
        },
        req,
    );

    if (!dispatchResult.ok) {
        const failedThemeNames = dispatchResult.perChunkResults
            .filter(r => !r.ok)
            .map(r => themes[parseInt(r.id.replace('theme-', ''), 10) - 1] || r.id);
        throw new Error(
            `Slide deck generation incomplete: ${dispatchResult.failures.join('; ')}. Failed themes: ${failedThemeNames.join(', ')}`,
        );
    }

    const finalMarkdown = dispatchResult.result || '';
    const slideOpens = finalMarkdown.match(/^:::slide(?:\s|$)/gm)?.length || 0;
    const perThemeStatus = dispatchResult.perChunkResults.map((r, idx) => ({
        theme: themes[idx],
        slideCount: slidesPerTheme,
        ok: r.ok,
    }));

    return {
        deckMarkdown: finalMarkdown,
        totalSlides: slideOpens,
        expectedSlides,
        perThemeStatus,
        rationale: plan.rationale,
    };
}

/**
 * Lightweight detection: should we route a chat send through the chunker?
 */
export function shouldChunkSlideRequest(prompt: string): boolean {
    // 2026-05-23 - DIVERSION DISABLED. The chunker produces correct
    // :::slide fence content but the chat-panel render pipeline does not
    // mount slide cards from the chunker output reliably (user confirmed
    // twice). Until that path is repaired and verified pixel-level, force
    // every slide request through the proven single-shot sendChatMessage
    // path which is known to render cards correctly within its 5-second
    // timestamp window. The single-shot path has its own truncation risk
    // at very large decks but ships rendered slides reliably.
    void prompt;
    return false;
}
