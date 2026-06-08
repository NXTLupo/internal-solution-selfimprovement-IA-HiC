/**
 * Transcript Quote Cleaner - strips Whisper disfluencies and video-intro
 * meta-narration from auto-generated YouTube transcripts before they're
 * surfaced as slide quotes.
 *
 * Why this exists:
 *   Whisper's YouTube transcriber emits raw speech with "uh", "um",
 *   sentence restarts, and verbal tics. Speakers also open videos with
 *   meta-narration ("In today's video, I'm walking you through four
 *   strategies...") that reads as slop when quoted out of context.
 *   The slidePostProcessor's existing meta-narration filter targets
 *   consulting-deliverable cliches - it misses video-intro language.
 *   This module adds a transcript-specific pass.
 *
 * Strategy:
 *   1. `cleanDisfluencies(text)` - strip "um"/"uh" fillers and collapse
 *      mid-word restarts while preserving the actual sentence.
 *   2. `isTranscriptIntroNarration(sentence)` - returns true for video
 *      opening lines ("So, let's dive into...", "In today's video..."
 *      "Before we begin...", "Hey everyone welcome back").
 *   3. `cleanTranscriptQuote(text)` - the single entrypoint: strips
 *      disfluencies AND drops intro/outro narration sentences. Returns
 *      the cleaned text, or empty string if nothing meaningful survives.
 *
 * Non-goals:
 *   - Rewriting speech into prose (we preserve the speaker's voice)
 *   - Correcting transcription errors - we don't invent words
 *   - Removing speaker names or timestamps (those happen upstream)
 */

// Video-intro and outro meta-narration. Expands the slidePostProcessor
// patterns with explicit YouTube / webinar opener phrases that leak
// through when transcripts are quoted.
const TRANSCRIPT_META_PATTERNS = [
    // Video openers
    /\b(so|ok|okay|alright|right)?,?\s*let['u]s\s+(dive|jump|get|move|start)\s+(in|into|on|started)/i,
    /\b(in|on)\s+today['u]s\s+(video|webinar|session|episode|conversation|talk)/i,
    /\b(hey|hi|hello)\s+(everyone|everybody|folks|guys|friends|team)\b/i,
    /\b(welcome|welcome back)\s+(to|everyone)\b/i,
    /\bthanks?\s+(so\s+much\s+)?for\s+(joining|tuning in|watching|listening|being here)/i,
    /\bi['u]m\s+(going to|gonna)\s+(walk|take|show|guide)\s+you\s+(through|to)/i,
    /\bi\s+want(?:ed)?\s+to\s+(show|tell|share|walk)\s+you\b/i,
    /\bin\s+this\s+(video|webinar|episode|segment|session)\b/i,
    /\bmake\s+sure\s+(to|you)\s+(subscribe|hit|smash|like)/i,
    /\bbefore\s+we\s+(get|dive|jump)\s+(started|in|into)/i,
    /\bstay\s+tuned\s+(for|until)/i,
    // Outro / CTA
    /\bif\s+you\s+(liked|enjoyed)\s+(this|that)\s+(video|episode)/i,
    /\bsee\s+you\s+in\s+the\s+next\s+(video|episode)/i,
    /\bdon['u]t\s+forget\s+to\s+(subscribe|like|share)/i,
    /\bcatch\s+you\s+(next|later)/i,
    // Webinar housekeeping
    /\bthis\s+(webinar|session|call)\s+is\s+being\s+record/i,
    /\bif\s+you\s+need\s+to\s+step\s+away/i,
    /\byou\s+(will|'ll)\s+receive\s+(the\s+)?(recording|replay)/i,
    /\bdrop\s+(your|a)\s+(name|question|comment)\s+in\s+(the\s+)?chat/i,
    /\b(please\s+)?(ask|drop)\s+your\s+questions?\s+(in|via)/i,
    // "Today we'll cover" / self-summarizing narration that consultants already ban
    /\b(today|now)\s+(we|i)\s+(will|are\s+going\s+to|'ll)\s+(cover|discuss|explore|walk|present)/i,
    /\bthe\s+(four|three|five|six|seven)\s+strategies\s+that\s+(will|we['u]ll)/i,
];

/**
 * Disfluencies Whisper loves to emit. These are stripped WITHIN a sentence
 * rather than dropping the whole sentence, because a filler word surrounded
 * by otherwise-substantive speech is still quote-worthy once the filler is
 * removed.
 *
 * Patterns use word boundaries + surrounding whitespace collapse so we never
 * concatenate adjacent words. Comma-before-filler is consumed because
 * "um,"/"uh," leave a dangling comma if we only strip the filler itself.
 */
const DISFLUENCY_PATTERNS: Array<{ find: RegExp; replace: string }> = [
    // Standalone filler words with optional surrounding commas
    { find: /,?\s+\b(um+|uh+|er+|erm+|ah+|hmm+)\b,?/gi, replace: ' ' },
    { find: /^\s*\b(um+|uh+|er+|erm+|ah+|hmm+)\b[,\s]+/gi, replace: '' },
    // "you know" / "I mean" / "like" (only when clearly filler, surrounded by punctuation)
    { find: /,\s+you\s+know,?\s+/gi, replace: ', ' },
    { find: /,\s+i\s+mean,?\s+/gi, replace: ', ' },
    // "sort of" / "kind of" as hedge fillers (preserve if mid-phrase)
    { find: /\s+sort\s+of\s+,/gi, replace: ', ' },
    { find: /\s+kind\s+of\s+,/gi, replace: ', ' },
    // Repeated word stutters: "the the" → "the", "and and" → "and"
    { find: /\b(the|and|a|to|of|in|is|it|that|so|for)\s+\1\b/gi, replace: '$1' },
    // Mid-sentence restart marker we see in Whisper: ". ." or ". .."
    { find: /\.\s+\.\s*/g, replace: '. ' },
    // Leading "And so " / "And then " that speakers use to keep going
    { find: /^(and\s+so|and\s+then|so\s+then)\s+/i, replace: '' },
    // Double spaces created by prior substitutions
    { find: /\s{2,}/g, replace: ' ' },
    // Floating punctuation after cleanup: " ," → ",", " ." → "."
    { find: /\s+([,.!?])/g, replace: '$1' },
    // Duplicated punctuation
    { find: /([,.!?]){2,}/g, replace: '$1' },
];

export function cleanDisfluencies(text: string): string {
    if (!text) return text;
    let out = text;
    for (const { find, replace } of DISFLUENCY_PATTERNS) {
        out = out.replace(find, replace);
    }
    return out.trim();
}

export function isTranscriptIntroNarration(sentence: string): boolean {
    if (!sentence) return false;
    return TRANSCRIPT_META_PATTERNS.some(p => p.test(sentence));
}

/**
 * Clean a transcript quote before rendering. Returns a cleaned string, or
 * empty string if nothing substantive remains after filtering.
 *
 * Pipeline:
 *   1. Strip surrounding quote marks (we re-add them in the renderer)
 *   2. Split into sentences
 *   3. Drop any sentence matching a transcript-intro meta pattern
 *   4. Run the disfluency cleaner on each surviving sentence
 *   5. Re-join, trim. If the result is <30 chars of substance, return ''.
 */
export function cleanTranscriptQuote(text: string): string {
    if (!text) return '';
    let t = text.trim().replace(/^["'"'"]+|["'"'"]+$/g, '').trim();
    if (!t) return '';

    // Sentence split on .!? plus optional trailing whitespace. Preserve
    // terminal punctuation by using a lookbehind.
    const sentences = t.split(/(?<=[.!?])\s+/);
    const kept: string[] = [];
    for (const s of sentences) {
        if (isTranscriptIntroNarration(s)) continue;
        const cleaned = cleanDisfluencies(s);
        if (cleaned.length < 8) continue;              // empty fragment
        kept.push(cleaned);
    }
    const joined = kept.join(' ').trim();
    // If less than 30 substantive chars survive, the quote was mostly
    // narration/filler. Return '' so the caller can pick a different quote.
    if (joined.replace(/[^a-z0-9]/gi, '').length < 30) return '';
    return joined;
}

/**
 * Heuristic: does this look like a transcript-derived quote?
 * We use it to decide whether to run the transcript cleaner at all - PDF
 * quotes don't need disfluency stripping and we want to avoid collapsing
 * formal prose that happens to contain words like "um" inside a URL.
 */
export function looksLikeTranscriptSource(source?: string): boolean {
    if (!source) return false;
    const s = source.toLowerCase();
    return /transcript|youtube|yt|webinar|podcast|video|audio/.test(s);
}
