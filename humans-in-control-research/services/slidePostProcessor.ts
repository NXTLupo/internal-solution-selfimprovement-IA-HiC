/**
 * Slide Post-Processor — Validation & Correction Middleware
 *
 * Runs AFTER AI generation and BEFORE rendering/export.
 * Catches every recurring failure identified in the strategy deck audit:
 *
 * 1. Markdown artifacts (**bold**, *italic*, # headers) → stripped to plain text
 * 2. Raw citations ([FILE X], [CHUNK_XXX]) → resolved or flagged
 * 3. Meta-narration ("We now move to...") → detected and removed
 * 4. Unresolved placeholders ([Date], [TBD], [X%]) → flagged
 * 5. Visual prompts requesting text in images → rewritten
 * 6. SaaS marketing CTAs → detected on closing slides
 * 7. Topic titles vs action titles → detected (title without verb/number)
 */

import type { Slide } from '../types';
import type { ChunkSourceInfo } from './researchFabricOrchestrator';

// ============================================================
// 1. MARKDOWN STRIPPING
// ============================================================

/**
 * Strip markdown syntax from text, converting to clean plain text.
 * Handles: **bold**, *italic*, __bold__, _italic_, `code`, # headers, [links](url)
 */
export function stripMarkdown(text: string): string {
    if (!text) return text;
    return text
        // Bold: **text** or __text__
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        // Italic: *text* or _text_ (but not inside words like don't)
        .replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '$1')
        .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '$1')
        // Inline code: `text`
        .replace(/`([^`]+)`/g, '$1')
        // Headers: # text, ## text, etc.
        .replace(/^#{1,6}\s+/gm, '')
        // Links: [text](url) → text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Horizontal rules
        .replace(/^[-*_]{3,}$/gm, '')
        // Clean up any double spaces left behind
        .replace(/  +/g, ' ')
        .trim();
}

/**
 * Strip markdown from all text fields in a slide.
 */
export function stripSlideMarkdown(slide: Slide): Slide {
    return {
        ...slide,
        title: stripMarkdown(slide.title),
        content: (slide.content || []).map(stripMarkdown),
        narrative: stripMarkdown(slide.narrative || ''),
        speakerNotes: stripMarkdown(slide.speakerNotes || ''),
        quote: stripMarkdown(slide.quote || ''),
    };
}

// ============================================================
// 2. CITATION RESOLUTION
// ============================================================

/**
 * Resolve raw [FILE X] and [CHUNK_XXX] citations to human-readable format.
 * Uses the chunk-to-source mapping from corpus assembly to show real source names.
 */
export function resolveCitations(
    text: string,
    fileNames?: string[],
    chunkSourceMap?: Record<string, ChunkSourceInfo>
): string {
    if (!text) return text;

    // Replace [FILE X] with the actual file name if available
    text = text.replace(/\[FILE\s*(\d+)\]/gi, (_match, num) => {
        const idx = parseInt(num, 10) - 1;
        if (fileNames && fileNames[idx]) {
            return `(Source: ${fileNames[idx]})`;
        }
        return `(Source: uploaded document ${num})`;
    });

    // Replace [CHUNK_XXX] with human-readable source names from the corpus map.
    // Before: [CHUNK_042] → "(Research finding #42)" (meaningless)
    // After:  [CHUNK_042] → "(Higher Ed Dive: 'Student Retention Strategies')"
    text = text.replace(/\[CHUNK_(\d+)\]/gi, (_match, num) => {
        const chunkId = `CHUNK_${String(parseInt(num, 10)).padStart(3, '0')}`;
        const info = chunkSourceMap?.[chunkId];
        if (info) {
            // Show source name + shortened title for traceability
            const shortTitle = info.title.length > 50
                ? info.title.substring(0, 47) + '...'
                : info.title;
            return shortTitle
                ? `(${info.sourceName}: "${shortTitle}")`
                : `(${info.sourceName})`;
        }
        return `(Source #${parseInt(num, 10)})`;
    });

    // Also handle comma-separated chunk lists: [CHUNK_003, CHUNK_017]
    text = text.replace(/\[(CHUNK_\d+(?:\s*,\s*CHUNK_\d+)+)\]/gi, (_match, chunkList) => {
        const chunks = chunkList.split(/\s*,\s*/);
        const resolvedSources = chunks.map((c: string) => {
            const info = chunkSourceMap?.[c.trim()];
            return info ? info.sourceName : c.trim();
        });
        // Deduplicate source names
        const unique = [...new Set(resolvedSources)];
        return `(Sources: ${unique.join(', ')})`;
    });

    // Replace raw filenames with extensions (e.g., [filename.pdf], [something - Copy.pdf])
    text = text.replace(/\[([^\]]+\.(pdf|docx?|xlsx?|pptx?|csv|txt))\]/gi, (_match, filename) => {
        // Clean up " - Copy" artifacts
        const cleaned = filename.replace(/\s*-\s*Copy/gi, '').trim();
        return `(Source: ${cleaned})`;
    });

    return text;
}

/**
 * Resolve citations in all text fields of a slide.
 */
export function resolveSlidesCitations(
    slides: Slide[],
    fileNames?: string[],
    chunkSourceMap?: Record<string, ChunkSourceInfo>
): Slide[] {
    return slides.map(slide => ({
        ...slide,
        title: resolveCitations(slide.title, fileNames, chunkSourceMap),
        content: (slide.content || []).map(c => resolveCitations(c, fileNames, chunkSourceMap)),
        narrative: resolveCitations(slide.narrative || '', fileNames, chunkSourceMap),
        speakerNotes: resolveCitations(slide.speakerNotes || '', fileNames, chunkSourceMap),
        quote: resolveCitations(slide.quote || '', fileNames, chunkSourceMap),
    }));
}

// ============================================================
// 3. META-NARRATION DETECTION & REMOVAL
// ============================================================

const META_NARRATION_PATTERNS = [
    /\bwe\s+(now|are now)\s+(move|enter|moving|entering|transition)/i,
    /\bthis is (where|the section|the phase|the part)\b/i,
    /\blet['u]s?\s+(now\s+)?(examine|explore|look at|discuss|turn to|move to|dive into|delve into)/i,
    /\bin this (section|slide|part|phase|presentation|deck|document)\b/i,
    /\bwe will (now\s+)?(examine|explore|discuss|look at|analyze|present|review|walk|cover|show|demonstrate|outline)/i,
    /\b(we|I)\s+(will|are going to|would like to|want to|aim to|seek to)\s+(present|discuss|explore|examine|review|walk|cover|show|demonstrate|outline)/i,
    /\bnow (we|I|let's)\s+(move|turn|shift|transition|proceed)/i,
    /\btoday (we|I)('(ll|d like to|m going to)|\s+(will|are going to|would like to|want to))\s+\w+/i,
    /\bgood (morning|afternoon|evening)\b/i,
    /\bthank you for (being here|joining|coming|attending)/i,
    /\bas you can see\b/i,
    /\bthis slide shows\b/i,
    /\bthe next (slide|section|part) (will |)(show|cover|discuss|explore|present)/i,
    /\bour (objective|goal|aim|purpose) (is|here is) to\b/i,
    /\bthis (presentation|deck|report|document) (will|is designed to|aims to|seeks to)\b/i,
    /\bwelcome to\b/i,
    /\ballow me to\b/i,
    /\bI('d| would) like to (start|begin|open) by\b/i,
    /\bbefore we (begin|start|dive in|get started)\b/i,
];

/**
 * Detect meta-narration in text. Returns matched patterns.
 */
export function detectMetaNarration(text: string): string[] {
    if (!text) return [];
    return META_NARRATION_PATTERNS
        .filter(pattern => pattern.test(text))
        .map(pattern => {
            const match = text.match(pattern);
            return match ? match[0] : '';
        })
        .filter(Boolean);
}

/**
 * Remove meta-narration sentences from text.
 * Removes the entire sentence containing meta-narration, not just the matched phrase.
 */
export function removeMetaNarration(text: string): string {
    if (!text) return text;

    // Split into sentences
    const sentences = text.split(/(?<=[.!?])\s+/);
    const cleaned = sentences.filter(sentence => {
        return !META_NARRATION_PATTERNS.some(pattern => pattern.test(sentence));
    });

    return cleaned.join(' ').trim();
}

// ============================================================
// 4. PLACEHOLDER DETECTION
// ============================================================

const PLACEHOLDER_PATTERNS = [
    /\[Date\]/gi,
    /\[TBD\]/gi,
    /\[X%?\]/gi,
    /\[INSERT[^\]]*\]/gi,
    /\[PLACEHOLDER[^\]]*\]/gi,
    /\[TODO[^\]]*\]/gi,
    /\[YOUR[^\]]*\]/gi,
    /\[COMPANY[^\]]*\]/gi,
    /\(baseline:\s*[XYZ]\)/gi,
];

/**
 * Detect unresolved placeholders in text.
 */
export function detectPlaceholders(text: string): string[] {
    if (!text) return [];
    const found: string[] = [];
    for (const pattern of PLACEHOLDER_PATTERNS) {
        const matches = text.match(pattern);
        if (matches) found.push(...matches);
    }
    return found;
}

/**
 * Replace common placeholders with honest language.
 */
export function resolvePlaceholders(text: string): string {
    if (!text) return text;
    return text
        .replace(/\[Date\]/gi, '(timeline to be confirmed)')
        .replace(/\[TBD\]/gi, '(to be determined in scoping)')
        .replace(/\[X%?\]/gi, '(target to be baselined)')
        .replace(/\[INSERT[^\]]*\]/gi, '')
        .replace(/\[PLACEHOLDER[^\]]*\]/gi, '')
        .replace(/\[TODO[^\]]*\]/gi, '')
        .replace(/\(baseline:\s*[XYZ]\)/gi, '(baseline to be measured)')
        .replace(/  +/g, ' ')
        .trim();
}

// ============================================================
// 5. VISUAL PROMPT SANITIZATION
// ============================================================

const TEXT_IN_IMAGE_PATTERNS = [
    /\btext\s+(that\s+)?(says?|reads?|showing|displaying|with)\b/i,
    /\bwith\s+(the\s+)?(words?|text|letters?|label|title|heading|caption)\b/i,
    /\blabeled?\b/i,
    /\bcaption(ed)?\b/i,
    /\boverlay(ed)?\s+text\b/i,
    /\btext\s+overlay\b/i,
    /\bheadline\b/i,
    /\btitle\s+card\b/i,
    /\bword(s)?\s+(on|in|over|across)\b/i,
];

/**
 * Sanitize a visual prompt to prevent text rendering in AI-generated images.
 * - Removes requests for text/labels/captions in images
 * - Appends explicit "no text" instruction
 */
export function sanitizeVisualPrompt(prompt: string): string {
    if (!prompt) return prompt;

    // If prompt explicitly says "TEXT ONLY" or "no visual needed", keep it
    if (/text\s*only|no\s*visual\s*needed/i.test(prompt)) {
        return prompt;
    }

    // Remove requests for text-in-image
    let sanitized = prompt;
    for (const pattern of TEXT_IN_IMAGE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }

    // Append the hard constraint
    sanitized += ' CRITICAL: Do NOT include any text, words, letters, numbers, labels, captions, or typography in this image. All text will be added as a separate overlay layer. The image must contain ZERO readable characters.';

    return sanitized.replace(/  +/g, ' ').trim();
}

// ============================================================
// 6. SAAS CTA DETECTION
// ============================================================

const SAAS_CTA_PATTERNS = [
    /\bready to innovate\b/i,
    /\bstart project\b/i,
    /\bget consulting\b/i,
    /\bjoin us\b/i,
    /\blet['u]s get started\b/i,
    /\bschedule a demo\b/i,
    /\bbook a call\b/i,
    /\bsign up\b/i,
    /\bfree trial\b/i,
    /\bcontact us today\b/i,
    /\brequest a quote\b/i,
    /\blearn more\b/i,
    /\btransform your\b/i,
    /\bunlock your\b/i,
    /\bsupercharge your\b/i,
];

/**
 * Detect SaaS marketing CTAs that don't belong in a strategy deck.
 */
export function detectSaasCTAs(text: string): string[] {
    if (!text) return [];
    return SAAS_CTA_PATTERNS
        .filter(pattern => pattern.test(text))
        .map(pattern => {
            const match = text.match(pattern);
            return match ? match[0] : '';
        })
        .filter(Boolean);
}

// ============================================================
// 7. TOPIC TITLE vs ACTION TITLE CHECK
// ============================================================

/**
 * Heuristic check: does a slide title state a conclusion (action title)
 * or merely name a topic (topic title)?
 *
 * Action titles contain verbs, numbers, or comparison language.
 * Topic titles are typically 1-3 words with no verb.
 */
export function isTopicTitle(title: string): boolean {
    if (!title) return false;
    const words = title.trim().split(/\s+/);
    // Very short titles (1-3 words) without numbers are likely topic titles
    if (words.length <= 3 && !/\d/.test(title)) return true;
    // Section headers are expected to be short
    return false;
}

// ============================================================
// 8. SLIDE DEPTH VALIDATION (D7)
// ============================================================

/**
 * Validate that a slide meets the 3-layer depth requirement:
 *   Layer 1 — Observation: contains a data point or specific fact
 *   Layer 2 — Implication: explains what the data means for this organization
 *   Layer 3 — Recommendation: states what to do, with a timeline or owner
 *
 * Returns a score 1-3 and flags for missing layers.
 */
export function validateSlideDepth(slide: Slide): { score: number; missingLayers: string[] } {
    if (!slide || slide.layout === 'SECTION_HEADER' || slide.layout === 'TITLE_SLIDE') {
        return { score: 3, missingLayers: [] }; // Headers exempt
    }

    const allText = [slide.title, ...(slide.content || []), slide.narrative || '', slide.quote || ''].join(' ');
    const missingLayers: string[] = [];

    // Layer 1: Observation — contains a number, percentage, stat, or date
    const hasData = /\d+(\.\d+)?(%|\s*(months?|years?|days?|hours?|x|pts?|percent|million|billion|thousand))/i.test(allText)
        || /\$[\d,.]+/i.test(allText)
        || /20[12]\d/i.test(allText);
    if (!hasData) missingLayers.push('Layer 1 (Observation): No data point or specific metric found');

    // Layer 2: Implication — contains consequence/meaning language
    const hasImplication = /\b(this means|which means|resulting in|leading to|causing|indicating|suggesting that|implies|the impact is|the consequence|for .{5,30} this|this translates to)\b/i.test(allText)
        || /\b(because of this|as a result|the effect|the implication)\b/i.test(allText);
    if (!hasImplication) missingLayers.push('Layer 2 (Implication): No "so what" — explain what the data means');

    // Layer 3: Recommendation — contains action verb + timeline or owner
    const hasAction = /\b(recommend|should|must|will|implement|deploy|launch|establish|create|consolidate|migrate|invest|allocate|hire|train)\b/i.test(allText)
        && (/\b(by Q[1-4]|within \d+|by 20[2-3]\d|in the next|over the next|\d+ months?|\d+ days?)\b/i.test(allText)
            || /\b(VP|Director|Manager|CTO|CIO|CMO|team lead|owner|responsible)\b/i.test(allText));
    if (!hasAction) missingLayers.push('Layer 3 (Recommendation): No specific action with timeline or owner');

    const score = 3 - missingLayers.length;
    return { score: Math.max(1, score), missingLayers };
}

// ============================================================
// 9. OUTPUT ANTI-PATTERN DETECTION (P5-01)
// ============================================================

/**
 * Banned slop phrases that undermine credibility.
 * These are the corporate-speak equivalents of filler words —
 * they sound authoritative but communicate nothing.
 */
const SLOP_PHRASES: { phrase: string; severity: 'high' | 'medium' }[] = [
    // High severity: consultant cliches that destroy trust
    { phrase: 'paradigm shift', severity: 'high' },
    { phrase: 'game-changer', severity: 'high' },
    { phrase: 'holistic approach', severity: 'high' },
    { phrase: 'cutting-edge', severity: 'high' },
    { phrase: 'best-in-class', severity: 'high' },
    { phrase: 'leverage synergies', severity: 'high' },
    { phrase: 'robust solution', severity: 'high' },
    { phrase: 'seamless integration', severity: 'high' },
    { phrase: "in today's rapidly evolving landscape", severity: 'high' },
    { phrase: "it's important to note", severity: 'high' },
    { phrase: 'actionable insights', severity: 'high' },
    // Medium severity: hedge words and filler
    { phrase: 'key takeaways', severity: 'medium' },
    { phrase: 'at the end of the day', severity: 'medium' },
    { phrase: 'moving forward', severity: 'medium' },
    { phrase: 'low-hanging fruit', severity: 'medium' },
    { phrase: 'it seems', severity: 'medium' },
    { phrase: 'perhaps', severity: 'medium' },
    { phrase: "it's possible", severity: 'medium' },
    { phrase: 'may or may not', severity: 'medium' },
];

export interface AntiPatternViolation {
    phrase: string;
    severity: 'high' | 'medium';
}

export interface AntiPatternResult {
    violations: AntiPatternViolation[];
    slopScore: number;        // 0-100, lower is better
    cleanText: string;        // text with slop phrases removed
}

/**
 * Detect output anti-patterns in generated text before a human checkpoint.
 *
 * Checks three categories:
 * 1. Banned slop phrases — consultant cliches and marketing filler
 * 2. Hedge words — wishy-washy language that undermines authority
 * 3. Empty filler — short sentences under 10 words that add no information
 *
 * @param text - The generated text to audit
 * @param deliverableType - The deliverable type (e.g., "personas", "themes", "deck")
 *                          for context-aware severity weighting
 * @returns Violations list, slop score (0-100, lower is better), and cleaned text
 */
export function detectOutputAntiPatterns(text: string, deliverableType: string): AntiPatternResult {
    if (!text) {
        return { violations: [], slopScore: 0, cleanText: '' };
    }

    const violations: AntiPatternViolation[] = [];
    const lowerText = text.toLowerCase();
    let cleanText = text;

    // 1. Check banned slop phrases
    for (const entry of SLOP_PHRASES) {
        if (lowerText.includes(entry.phrase.toLowerCase())) {
            violations.push({ phrase: entry.phrase, severity: entry.severity });
            // Remove the slop phrase from clean text (case-insensitive)
            const escaped = entry.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanText = cleanText.replace(new RegExp(escaped, 'gi'), '');
        }
    }

    // 2. Detect empty filler sentences (under 10 words, no data/numbers)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    for (const sentence of sentences) {
        const words = sentence.trim().split(/\s+/);
        if (words.length < 10 && words.length > 0) {
            // A short sentence is filler if it has no numbers, no proper nouns, and no specifics
            const hasData = /\d/.test(sentence);
            const hasSpecifics = /\$|%|Q[1-4]|202[4-9]|203[0-9]|NPS|CSAT|CES|ROI/.test(sentence);
            // Skip headings and labels (typically 1-4 words ending without punctuation)
            const isLabel = words.length <= 4 && !/[.!?]$/.test(sentence.trim());
            if (!hasData && !hasSpecifics && !isLabel) {
                violations.push({ phrase: `[filler] ${sentence.trim()}`, severity: 'medium' });
            }
        }
    }

    // 3. Compute slop score (0-100, lower is better)
    //    High severity = 12 points, medium = 5 points, capped at 100
    //    Deck and strategy deliverables are penalized more heavily
    const highMultiplier = (deliverableType === 'deck' || deliverableType === 'strategy') ? 15 : 12;
    const mediumMultiplier = (deliverableType === 'deck' || deliverableType === 'strategy') ? 7 : 5;

    const highCount = violations.filter(v => v.severity === 'high').length;
    const mediumCount = violations.filter(v => v.severity === 'medium').length;
    const rawScore = (highCount * highMultiplier) + (mediumCount * mediumMultiplier);
    const slopScore = Math.min(100, rawScore);

    // Clean up double-spaces and orphaned punctuation from removal
    cleanText = cleanText
        .replace(/  +/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .replace(/^\s+/gm, '')
        .trim();

    return { violations, slopScore, cleanText };
}

// ============================================================
// MAIN POST-PROCESSOR
// ============================================================

export interface PostProcessorIssue {
    slideNumber: number;
    type: 'markdown' | 'citation' | 'meta-narration' | 'placeholder' | 'saas-cta' | 'topic-title' | 'visual-text';
    severity: 'critical' | 'high' | 'medium';
    field: string;
    detail: string;
    autoCorrected: boolean;
}

export interface PostProcessorResult {
    slides: Slide[];
    issues: PostProcessorIssue[];
    issueCount: number;
    autoCorrectedCount: number;
}

/**
 * Run the full post-processor on a set of slides.
 * Fixes what it can automatically, flags what it can't.
 */
export function postProcessSlides(
    slides: Slide[],
    fileNames?: string[],
    chunkSourceMap?: Record<string, ChunkSourceInfo>
): PostProcessorResult {
    const issues: PostProcessorIssue[] = [];

    const processed = slides.map(slide => {
        let s = { ...slide };
        const sn = s.slideNumber || 0;

        // --- MARKDOWN STRIPPING (auto-correct) ---
        const hasMarkdown = (text: string) => /\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|^#{1,6}\s/m.test(text || '');

        if (hasMarkdown(s.title) || (s.content || []).some(hasMarkdown) || hasMarkdown(s.narrative || '') || hasMarkdown(s.quote || '')) {
            issues.push({
                slideNumber: sn, type: 'markdown', severity: 'critical',
                field: 'multiple', detail: 'Raw markdown syntax detected and stripped',
                autoCorrected: true
            });
            s = stripSlideMarkdown(s);
        }

        // --- CITATION RESOLUTION (auto-correct) ---
        const hasCitation = (text: string) => /\[FILE\s*\d+\]|\[CHUNK_\d+\]|\[[^\]]+\.(pdf|docx?)\]/i.test(text || '');

        if (hasCitation(s.title) || (s.content || []).some(hasCitation) || hasCitation(s.narrative || '') || hasCitation(s.quote || '')) {
            issues.push({
                slideNumber: sn, type: 'citation', severity: 'critical',
                field: 'multiple', detail: 'Raw citations detected and resolved',
                autoCorrected: true
            });
        }
        // Always run citation resolution (harmless on clean text)
        s.title = resolveCitations(s.title, fileNames, chunkSourceMap);
        s.content = (s.content || []).map(c => resolveCitations(c, fileNames, chunkSourceMap));
        s.narrative = resolveCitations(s.narrative || '', fileNames, chunkSourceMap);
        s.speakerNotes = resolveCitations(s.speakerNotes || '', fileNames, chunkSourceMap);
        s.quote = resolveCitations(s.quote || '', fileNames, chunkSourceMap);

        // --- FINAL CHUNK SWEEP: Remove any [CHUNK_XXX] that survived resolution ---
        const stripChunks = (text: string) => text.replace(/\s*\[CHUNK_\d+\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
        s.title = stripChunks(s.title);
        s.content = (s.content || []).map(stripChunks);
        s.narrative = stripChunks(s.narrative || '');
        s.speakerNotes = stripChunks(s.speakerNotes || '');
        s.quote = stripChunks(s.quote || '');

        // --- META-NARRATION (auto-correct on ALL fields: title, content, narrative, speakerNotes, quote) ---
        const metaInTitle = detectMetaNarration(s.title || '');
        if (metaInTitle.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'critical',
                field: 'title', detail: `Meta-narration in title: "${metaInTitle[0]}"`,
                autoCorrected: true
            });
            s.title = removeMetaNarration(s.title);
            // If title becomes empty after removal, the slide was pure meta-narration
            if (!s.title.trim()) s.title = `Slide ${sn}`;
        }

        const metaNarrationInContent = (s.content || []).flatMap(detectMetaNarration);
        if (metaNarrationInContent.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'critical',
                field: 'content', detail: `Meta-narration detected: "${metaNarrationInContent[0]}"`,
                autoCorrected: true
            });
            s.content = (s.content || []).map(removeMetaNarration).filter(c => c.length > 0);
        }

        const metaInNarrative = detectMetaNarration(s.narrative || '');
        if (metaInNarrative.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'high',
                field: 'narrative', detail: `Meta-narration in presenter notes: "${metaInNarrative[0]}"`,
                autoCorrected: true
            });
            s.narrative = removeMetaNarration(s.narrative || '');
        }

        const metaInSpeakerNotes = detectMetaNarration(s.speakerNotes || '');
        if (metaInSpeakerNotes.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'high',
                field: 'speakerNotes', detail: `Meta-narration in speaker notes: "${metaInSpeakerNotes[0]}"`,
                autoCorrected: true
            });
            s.speakerNotes = removeMetaNarration(s.speakerNotes || '');
        }

        const metaInQuote = detectMetaNarration(s.quote || '');
        if (metaInQuote.length > 0) {
            issues.push({
                slideNumber: sn, type: 'meta-narration', severity: 'high',
                field: 'quote', detail: `Meta-narration in quote: "${metaInQuote[0]}"`,
                autoCorrected: true
            });
            s.quote = removeMetaNarration(s.quote || '');
        }

        // --- PLACEHOLDER RESOLUTION (auto-correct) ---
        const allText = [s.title, ...(s.content || []), s.narrative || '', s.quote || ''].join(' ');
        const placeholders = detectPlaceholders(allText);
        if (placeholders.length > 0) {
            issues.push({
                slideNumber: sn, type: 'placeholder', severity: 'high',
                field: 'multiple', detail: `Unresolved placeholders: ${placeholders.join(', ')}`,
                autoCorrected: true
            });
            s.title = resolvePlaceholders(s.title);
            s.content = (s.content || []).map(resolvePlaceholders);
            s.narrative = resolvePlaceholders(s.narrative || '');
        }

        // --- SAAS CTA DETECTION (flag on closing slides) ---
        if (s.layout === 'CLOSING_CTA') {
            const ctaMatches = detectSaasCTAs(allText);
            if (ctaMatches.length > 0) {
                issues.push({
                    slideNumber: sn, type: 'saas-cta', severity: 'high',
                    field: 'content', detail: `SaaS marketing language detected: "${ctaMatches.join('", "')}"`,
                    autoCorrected: false
                });
            }
        }

        // --- TOPIC TITLE CHECK (flag only, not on section headers) ---
        if (s.layout !== 'SECTION_HEADER' && s.layout !== 'TITLE_SLIDE' && isTopicTitle(s.title)) {
            issues.push({
                slideNumber: sn, type: 'topic-title', severity: 'medium',
                field: 'title', detail: `Title "${s.title}" may be a topic label instead of an action title (conclusion sentence)`,
                autoCorrected: false
            });
        }

        // --- DEPTH VALIDATION (D7 — flag shallow slides) ---
        const depth = validateSlideDepth(s);
        if (depth.score < 3 && s.layout !== 'SECTION_HEADER' && s.layout !== 'TITLE_SLIDE') {
            issues.push({
                slideNumber: sn, type: 'topic-title' as any, severity: depth.score === 1 ? 'critical' : 'medium',
                field: 'content', detail: `Shallow slide (depth ${depth.score}/3): ${depth.missingLayers.join('; ')}`,
                autoCorrected: false
            });
        }

        // --- HALLUCINATION GUARD: Detect fabricated proper nouns ---
        // Scan for quoted statistics that look fabricated (round numbers like "exactly 50%")
        const allSlideText = [s.title, ...(s.content || []), s.narrative || '', s.quote || ''].join(' ');
        const fabricatedStatPatterns = [
            /\b(?:exactly|precisely)\s+\d+%/i,                    // "exactly 50%"
            /\b\d{3,}%\s/i,                                        // >100% without context
            /\$\d+(?:\.\d+)?\s*(?:trillion|quadrillion)/i,         // absurd dollar amounts
        ];
        for (const pattern of fabricatedStatPatterns) {
            if (pattern.test(allSlideText)) {
                issues.push({
                    slideNumber: sn, type: 'placeholder' as any, severity: 'medium',
                    field: 'content', detail: `Potential fabricated statistic detected: ${allSlideText.match(pattern)?.[0]}`,
                    autoCorrected: false
                });
            }
        }

        // --- VISUAL PROMPT SANITIZATION (auto-correct) ---
        if (s.visualPrompt) {
            const original = s.visualPrompt;
            s.visualPrompt = sanitizeVisualPrompt(s.visualPrompt);
            if (s.visualPrompt !== original) {
                issues.push({
                    slideNumber: sn, type: 'visual-text', severity: 'critical',
                    field: 'visualPrompt', detail: 'Visual prompt requested text in image — sanitized',
                    autoCorrected: true
                });
            }
        }

        return s;
    });

    // --- CONTENT BUDGET ENFORCEMENT (Ship 2) ---
    const budgeted = processed.map(s => enforceContentBudgets(s));

    return {
        slides: budgeted,
        issues,
        issueCount: issues.length,
        autoCorrectedCount: issues.filter(i => i.autoCorrected).length,
    };
}

// ============================================================
// CONTENT BUDGET ENFORCEMENT
// ============================================================

/** Truncate text at last sentence boundary before maxChars */
function truncateAtSentence(text: string, maxChars: number): string {
    if (!text || text.length <= maxChars) return text;
    const truncated = text.substring(0, maxChars);
    // Find last sentence boundary (.!?) followed by space or end
    const lastSentence = truncated.search(/[.!?]\s+(?=[A-Z])/g);
    // Scan backwards for the last occurrence
    let best = -1;
    for (let i = truncated.length - 1; i >= 0; i--) {
        if ((truncated[i] === '.' || truncated[i] === '!' || truncated[i] === '?') && i < maxChars - 1) {
            best = i + 1;
            break;
        }
    }
    if (best > maxChars * 0.4) return truncated.substring(0, best).trim();
    // No good sentence boundary — truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxChars * 0.5) return truncated.substring(0, lastSpace).trim() + '...';
    return truncated.trim() + '...';
}

/** Enforce per-field character budgets to prevent data dumps */
function enforceContentBudgets(slide: Slide): Slide {
    const s = { ...slide };
    const layout = s.layout;

    // SECTION_HEADER: force empty content fields
    if (layout === 'SECTION_HEADER') {
        s.content = [];
        s.narrative = '';
        s.quote = '';
        s.sources = [];
        s.speakerNotes = '';
        return s;
    }

    // Title: 120 chars
    if (s.title && s.title.length > 120) {
        s.title = truncateAtSentence(s.title, 120);
    }

    // Content bullets: 200 chars each, max 4 bullets
    if (s.content) {
        s.content = s.content
            .slice(0, 4)
            .map(c => truncateAtSentence(c, 200))
            .filter(c => c.length > 0);
    }

    // Quote: 250 chars
    if (s.quote && s.quote.length > 250) {
        s.quote = truncateAtSentence(s.quote, 250);
    }

    // Speaker notes: 600 chars
    if (s.speakerNotes && s.speakerNotes.length > 600) {
        s.speakerNotes = truncateAtSentence(s.speakerNotes, 600);
    }

    // Narrative: 400 chars
    if (s.narrative && s.narrative.length > 400) {
        s.narrative = truncateAtSentence(s.narrative, 400);
    }

    // Bento cells: 100 chars per text field
    if (s.bentoCells) {
        s.bentoCells = s.bentoCells.map(cell => ({
            ...cell,
            text: cell.text ? truncateAtSentence(cell.text, 100) : cell.text,
        }));
    }

    // Solution points: 150 chars per description
    if (s.solutionPoints) {
        s.solutionPoints = s.solutionPoints.map(sp => ({
            ...sp,
            description: truncateAtSentence(sp.description, 150),
        }));
    }

    return s;
}

// ============================================================
// STRUCTURE VALIDATION (Ship 3-5)
// ============================================================

export interface StructureViolation {
    rule: string;
    severity: 'blocking' | 'warning';
    detail: string;
}

export interface StructureValidation {
    valid: boolean;
    violations: StructureViolation[];
    feedbackForRetry: string;
}

/**
 * Validate deck structure against quality constraints.
 * Returns validation result with feedback string for auto-retry.
 */
export function validateDeckStructure(
    slides: Array<{ slideNumber: number; layout: string; title: string; sourceDeliverable?: string; personaRef?: string }>,
    availableDeliverables: string[]
): StructureValidation {
    const violations: StructureViolation[] = [];

    // Rule 1: Deliverable coverage — every available deliverable should have >=1 slide
    for (const del of availableDeliverables) {
        const covered = slides.some(s => s.sourceDeliverable === del);
        if (!covered) {
            violations.push({
                rule: 'deliverable_coverage',
                severity: 'blocking',
                detail: `Deliverable "${del}" is available but no slide references it.`,
            });
        }
    }

    // Rule 2: Slide count
    if (slides.length < 12 && availableDeliverables.length >= 5) {
        violations.push({
            rule: 'slide_count',
            severity: 'blocking',
            detail: `Only ${slides.length} slides generated but ${availableDeliverables.length} deliverables are available. Expected 15-30 slides.`,
        });
    }

    // Rule 3: Persona slides — each persona should have a slide with personaRef
    const personaRefs = slides.filter(s => s.personaRef).map(s => s.personaRef);
    if (availableDeliverables.includes('personas') && personaRefs.length === 0) {
        violations.push({
            rule: 'persona_slides',
            severity: 'blocking',
            detail: 'Personas are available but no slide has a personaRef set.',
        });
    }

    // Rule 4: Journey map presence
    if (availableDeliverables.includes('journey_map') && !slides.some(s => s.sourceDeliverable === 'journey_map')) {
        violations.push({
            rule: 'journey_presence',
            severity: 'blocking',
            detail: 'Journey map stages are available but no slide references them.',
        });
    }

    // Rule 5: No 3+ consecutive identical sourceDeliverable
    for (let i = 0; i < slides.length - 2; i++) {
        if (slides[i].sourceDeliverable && slides[i].sourceDeliverable === slides[i+1].sourceDeliverable && slides[i].sourceDeliverable === slides[i+2].sourceDeliverable) {
            violations.push({
                rule: 'consecutive_deliverable',
                severity: 'warning',
                detail: `Slides ${slides[i].slideNumber}-${slides[i+2].slideNumber} all reference "${slides[i].sourceDeliverable}" — vary the narrative flow.`,
            });
        }
    }

    const blocking = violations.filter(v => v.severity === 'blocking');
    const feedbackLines = blocking.map(v => `- ${v.detail}`);
    const feedbackForRetry = blocking.length > 0
        ? `STRUCTURE VALIDATION FAILED. Fix these issues:\n${feedbackLines.join('\n')}\n\nGenerate a revised structure that addresses all of the above.`
        : '';

    return {
        valid: blocking.length === 0,
        violations,
        feedbackForRetry,
    };
}
