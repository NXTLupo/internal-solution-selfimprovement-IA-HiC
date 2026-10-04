/**
 * Slide Validator - post-parse quality gate for AI-emitted :::slide blocks.
 *
 * Catches the failure mode where, when evidence is thin, the AI fills case-
 * study / theme / quote templates with meta-commentary about the research
 * corpus itself instead of subject-level content. Seen in the wild as:
 *
 *   "Within this corpus, EverTrue is the clearest vendor source..."
 *   "The external corpus contains very few named higher-ed cases..."
 *   "The strongest quantified outcome available in the corpus..."
 *
 * These slip past the existing SLOP_PHRASES banlist (which targets paradigm-
 * shift-style jargon) because they sound analytical. This module flags them
 * so the renderer can surface an EVIDENCE GAP badge - the slide still
 * renders, but the operator sees exactly what's wrong.
 *
 * Design contract:
 *   - PURE. No network, no deps beyond types.
 *   - Conservative. Only flags clear violations; false positives hurt trust.
 *   - Advisory. Validator returns issues + `evidenceGap` hint; the caller
 *     chooses whether to render, reject, or warn.
 */

// --- CORPUS META-COMMENTARY BANLIST (40+) ---
// Phrases that reveal the AI is describing the research apparatus instead
// of the subject. Longer phrases check first to avoid false positives on
// shorter fragments (e.g. "the corpus" alone is fine in a methodology
// sentence but "within this corpus" is almost always a meta-reveal).
const CORPUS_META_PHRASES: string[] = [
    // Explicit corpus references
    'within this corpus',
    'within the corpus',
    'in this corpus',
    'in the corpus',
    'the external corpus',
    'external corpus contains',
    'the broader corpus',
    'broader corpus',
    'this corpus contains',
    'corpus contains very few',
    'the corpus contains',
    'the sampled corpus',
    'the research corpus',
    'the available corpus',
    'the collected corpus',
    'the corpus cluster',
    'the vendor corpus',
    'corpus cluster shows',
    'corpus evidence',
    'supporting evidence in the same vendor cluster',

    // Meta-narration about data collection
    'the dataset contains',
    'this dataset shows',
    'the sample shows',
    'the sample contains',
    'the sampled set',
    'the extracted material',
    'the extracted content',
    'the available material',

    // "The strongest/clearest X available" constructions
    'the strongest quantified outcome available',
    'the strongest named',
    'the strongest available',
    'the clearest vendor source',
    'the clearest named',
    'the only named case',
    'the best available evidence',

    // Scarcity admissions that reveal the lens
    'evidence is scarce in this',
    'is scarce in this corpus',
    'few named cases',
    'few named higher-ed',
    'most vendor material is',
    'most vendor evidence',
    'most of the evidence',

    // Self-referential framing ("our corpus", "our dataset")
    'our corpus',
    'our dataset',
    'our sample',
    'our research corpus',

    // Research-process leakage
    'based on our collection',
    'as collected',
    'as gathered',
    'the gathered material',
];

// --- PLACEHOLDER / EMPTY QUOTE DETECTORS ---
// Strings that indicate the AI couldn't find a real quote and fell back to
// the template scaffolding. Any of these as `quote.attribution` or as the
// whole `quote.text` should trigger an evidence-gap warning.
const PLACEHOLDER_ATTRIBUTIONS: string[] = [
    'customer story title',
    'case study title',
    'article title',
    'headline',
    'source title',
    'untitled',
    'unknown',
    'n/a',
    'tbd',
    'placeholder',
];

// --- VALIDATION TYPES ---

export interface SlideIssue {
    field: string;              // JSON path, e.g. "caseStudy.challenge"
    reason: string;             // one-line human-readable reason
    matched?: string;           // the phrase / fragment that matched
    severity: 'gap' | 'warning'; // 'gap' = evidence insufficient; 'warning' = style issue
}

export interface SlideValidationResult {
    ok: boolean;
    issues: SlideIssue[];
    /** True if any issue is severity 'gap' - the slide should render with an
     *  EVIDENCE GAP badge so the operator knows the underlying evidence is thin. */
    evidenceGap: boolean;
    /** Short user-facing summary for the badge tooltip. Empty when ok. */
    gapSummary: string;
}

// --- CORE CHECKS ---

/** Search text for any corpus-meta banlist phrase. Returns the first match. */
function findCorpusMetaPhrase(text: string | undefined): string | null {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();
    for (const phrase of CORPUS_META_PHRASES) {
        if (lower.includes(phrase)) return phrase;
    }
    return null;
}

/** Detect whether a text snippet explicitly names the subject. Subject is
 *  the case-study `subject` field or any explicitly-named entity. Used to
 *  force Challenge/Approach/Outcome to describe the subject, not the corpus. */
function mentionsSubject(text: string | undefined, subject: string | undefined): boolean {
    if (!text || !subject) return false;
    // Break subject into significant tokens (len ≥ 4) and check at least one
    // appears. This tolerates abbreviations and partial matches ("University
    // of Wyoming" → "Wyoming" still counts).
    const subTokens = subject.toLowerCase().split(/\W+/).filter(t => t.length >= 4);
    if (subTokens.length === 0) return false;
    const lowerText = text.toLowerCase();
    return subTokens.some(t => lowerText.includes(t));
}

/** Normalize a string for comparison - collapses whitespace + lowercases. */
function norm(s: string | undefined): string {
    return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// --- TEMPLATE-SPECIFIC VALIDATORS ---

/** Case-study slides require subject-named content in challenge/approach/
 *  outcome. Meta-commentary about the corpus instead of the subject's
 *  business situation is the failure mode this catches. */
function validateCaseStudy(slide: any): SlideIssue[] {
    const issues: SlideIssue[] = [];
    const cs = slide.caseStudy;
    if (!cs) return issues;
    const subject = cs.subject;
    const fields: Array<[string, string | undefined]> = [
        ['caseStudy.challenge', cs.challenge],
        ['caseStudy.approach', cs.approach],
        ['caseStudy.outcome', cs.outcome],
    ];
    for (const [path, text] of fields) {
        if (!text) continue;
        // Gap check 1: contains corpus-meta phrase
        const matched = findCorpusMetaPhrase(text);
        if (matched) {
            issues.push({
                field: path,
                reason: `Describes the research corpus instead of ${subject || 'the subject'}.`,
                matched,
                severity: 'gap',
            });
        }
        // Gap check 2: doesn't name the subject at all (required for case-study)
        if (subject && !mentionsSubject(text, subject) && text.length > 40) {
            issues.push({
                field: path,
                reason: `Does not mention ${subject}. Case-study fields must describe the subject.`,
                severity: 'gap',
            });
        }
    }
    return issues;
}

/** Block-quote slides require a real, non-placeholder quote. If the AI
 *  falls back to the scaffold ("Customer story title"), the slide is empty. */
function validateBlockQuote(slide: any): SlideIssue[] {
    const issues: SlideIssue[] = [];
    const q = slide.quote;
    if (!q) return issues;
    const text = norm(q.text);
    const attr = norm(q.attribution);
    const title = norm(slide.title);

    // Gap 1: placeholder attribution
    if (PLACEHOLDER_ATTRIBUTIONS.includes(attr) || attr === '') {
        issues.push({
            field: 'quote.attribution',
            reason: 'Attribution is a placeholder, not a real source or person.',
            matched: q.attribution,
            severity: 'gap',
        });
    }
    // Gap 2: quote text is just the slide title
    if (text && title && text === title) {
        issues.push({
            field: 'quote.text',
            reason: 'Quote text is identical to the slide title - no distinct evidence.',
            severity: 'gap',
        });
    }
    // Gap 3: quote text too short to be real (< 40 chars is rarely a quote)
    if (text && text.length > 0 && text.length < 40) {
        issues.push({
            field: 'quote.text',
            reason: `Quote text is too short to be a verbatim passage (${text.length} chars).`,
            severity: 'warning',
        });
    }
    return issues;
}

/** Generic title check - flags action titles that describe the research
 *  artifact ("This slide shows...", "The corpus reveals...") instead of
 *  stating a conclusion about the subject. */
function validateTitle(slide: any): SlideIssue[] {
    const issues: SlideIssue[] = [];
    const title = slide.title;
    if (!title) return issues;
    const matched = findCorpusMetaPhrase(title);
    if (matched) {
        issues.push({
            field: 'title',
            reason: 'Title describes the research artifact instead of stating a subject conclusion.',
            matched,
            severity: 'gap',
        });
    }
    return issues;
}

/** Theme cluster / spotlight / arc / mosaic - check each child theme's
 *  insight and evidence/quote for corpus meta-commentary. */
function validateThemeCluster(slide: any): SlideIssue[] {
    const issues: SlideIssue[] = [];
    const themes = slide.themeCluster?.themes;
    if (!Array.isArray(themes)) return issues;
    themes.forEach((t: any, idx: number) => {
        const matched = findCorpusMetaPhrase(t.insight) || findCorpusMetaPhrase(t.evidence);
        if (matched) {
            issues.push({
                field: `themeCluster.themes[${idx}]`,
                reason: `Theme "${t.name?.substring(0, 40) || '(unnamed)'}" describes the corpus instead of the signal itself.`,
                matched,
                severity: 'gap',
            });
        }
    });
    return issues;
}

// --- ROOT VALIDATOR ---

/**
 * Validate a parsed :::slide block. Returns an advisory result - the caller
 * decides whether to render, warn, or reject.
 */
export function validateSlide(slide: any): SlideValidationResult {
    const issues: SlideIssue[] = [
        ...validateTitle(slide),
        ...validateCaseStudy(slide),
        ...validateBlockQuote(slide),
        ...validateThemeCluster(slide),
    ];

    // De-dupe issues by (field + matched) to avoid noisy lists
    const seen = new Set<string>();
    const deduped: SlideIssue[] = [];
    for (const i of issues) {
        const key = `${i.field}|${i.matched || i.reason}`;
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(i);
        }
    }

    const gapIssues = deduped.filter(i => i.severity === 'gap');
    const evidenceGap = gapIssues.length > 0;
    const gapSummary = evidenceGap
        ? `${gapIssues.length} evidence gap${gapIssues.length > 1 ? 's' : ''}: ${gapIssues[0].reason}`
        : '';

    return {
        ok: deduped.length === 0,
        issues: deduped,
        evidenceGap,
        gapSummary,
    };
}

