/**
 * sessionConstraints.ts - V4 directive-to-constraint compiler (2026-08-07)
 * plans/sota-elevation-loops-caching-rsi-okf-2026-08-07.md item V4.
 *
 * THE PROBLEM (colleague finding F5, the top-severity report): chat directives
 * like "don't use anything from the transcript" or "include more graphics" are
 * transient prompt text. Retrieval ranking and deck planning never see them, so
 * the transcript keeps winning relevance ranking and the visual quota stays at
 * its default. The human is not in control when explicit instructions lose to
 * auto-ranking.
 *
 * THE FIX: compile imperatives into a TYPED session-constraint object, persist
 * it for the WHOLE SESSION until explicitly lifted (owner decision 7), and
 * enforce it DETERMINISTICALLY downstream:
 *   (a) chunkRetrieval.pickChunksForPrompt filters excluded sources BEFORE
 *       ranking (rung-1 enforcement, not prompt hope);
 *   (b) deckPlanGate reads visualQuotaFloor as a parameter (V2);
 *   (c) every reply carries a visible echo-back of what is being enforced,
 *       so control is never invisible.
 * Extends the standing rule [S] user-selections-trump-auto-ranking
 * (2026-06-16) from KL/cached-wiki selections to chat directives.
 *
 * The compiler is DELIBERATELY deterministic (regex + fuzzy source matching,
 * no model call): enforcement signals should sit on rung 1 of the
 * verification hierarchy (wiki/synthesis/verification-hierarchy.md), and a
 * parser model would add latency plus a new failure mode to every chat turn.
 * Phrasings it cannot parse simply remain ordinary prompt text - strictly no
 * worse than the pre-V4 behavior.
 */

export interface SessionConstraints {
    /** Source names/ids the user excluded ("don't use the transcript").
     *  Matched fuzzily against chunk source titles + wikiPaths at retrieval. */
    excludeSources: string[];
    /** When non-empty, ONLY sources matching these names are eligible. */
    includeOnly: string[];
    /** Raised visual-share floor for deck planning (0..1). undefined = gate default. */
    visualQuotaFloor?: number;
    /** Free-text tone/style directives worth persisting across turns. */
    toneDirectives: string[];
    /** UTC ms of last modification. */
    updatedAt: number;
}

const EMPTY: SessionConstraints = { excludeSources: [], includeOnly: [], toneDirectives: [], updatedAt: 0 };

// ---------------------------------------------------------------------------
// Store - per engagement slug, in-memory + localStorage (survives reloads
// within the browser session; a new engagement starts clean per the
// CLEAN-GROUNDING standing rule).
// ---------------------------------------------------------------------------

const _mem: Record<string, SessionConstraints> = {};
const LS_PREFIX = 'hic-session-constraints:';

function _lsKey(slug: string): string { return `${LS_PREFIX}${slug || '_unassigned'}`; }

export function getSessionConstraints(slug: string): SessionConstraints {
    const key = slug || '_unassigned';
    if (_mem[key]) return _mem[key];
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(_lsKey(key));
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.excludeSources)) {
                    _mem[key] = parsed as SessionConstraints;
                    return _mem[key];
                }
            }
        }
    } catch { /* fall through to empty */ }
    _mem[key] = { ...EMPTY, excludeSources: [], includeOnly: [], toneDirectives: [] };
    return _mem[key];
}

function setSessionConstraints(slug: string, c: SessionConstraints): void {
    const key = slug || '_unassigned';
    _mem[key] = c;
    try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(_lsKey(key), JSON.stringify(c));
    } catch { /* in-memory only */ }
}

export function clearSessionConstraints(slug: string): void {
    const key = slug || '_unassigned';
    delete _mem[key];
    try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(_lsKey(key));
    } catch { /* no-op */ }
}

// ---------------------------------------------------------------------------
// The compiler.
// ---------------------------------------------------------------------------

/** Nouns that refer to the user's uploaded material generically. */
const UPLOAD_NOUNS = '(?:transcript|upload(?:ed)?(?:\\s+(?:doc(?:ument)?s?|files?))?|attachment|attached\\s+(?:doc(?:ument)?s?|files?)|my\\s+(?:doc(?:ument)?s?|files?)|interview|recording|meeting\\s+notes)';

const EXCLUDE_RES: RegExp[] = [
    // "don't use / do not use anything from / stop using / avoid / exclude /
    // ignore / leave out / omit / without ... <thing>". The verb, the object
    // filler ("anything", "content"), and "from" are each independently
    // optional so chains like "do not use anything from the transcript",
    // "don't include the uploads", and "exclude \"board memo\"" all parse.
    new RegExp(
        `(?:don'?t|do\\s+not|stop|avoid|exclude|ignore|leave\\s+out|omit|without)\\s+` +
        `(?:us(?:e|ing)|includ(?:e|ing)|cit(?:e|ing)|referenc(?:e|ing)|pull(?:ing)?)?\\s*` +
        `(?:anything|any\\s+content|content|quotes?|material|information)?\\s*` +
        `(?:from\\s+)?(?:the\\s+|this\\s+|that\\s+|my\\s+)?(${UPLOAD_NOUNS}|"([^"]{2,80})")`, 'gi'),
    // "nothing from <thing>" / "no content from <thing>" / "no quotes from <thing>"
    new RegExp(`(?:nothing|no\\s+(?:content|quotes?|citations?|material|information))\\s+from\\s+(?:the\\s+|this\\s+|that\\s+|my\\s+)?(${UPLOAD_NOUNS}|"([^"]{2,80})")`, 'gi'),
];

const LIFT_RES: RegExp[] = [
    // "you can use the transcript again" / "include the transcript again" / "re-include ..."
    new RegExp(`(?:can\\s+use|use|include|re-?include|bring\\s+back|allow)\\s+(?:the\\s+|this\\s+|that\\s+|my\\s+)?(${UPLOAD_NOUNS}|"([^"]{2,80})")\\s*(?:again|back|now)`, 'gi'),
    new RegExp(`(?:lift|remove|clear|drop|forget)\\s+(?:the\\s+|that\\s+|all\\s+)?(?:exclusions?|constraints?|restrictions?)`, 'gi'),
];

const MORE_VISUALS_RE = /(?:more|additional|extra|add(?:\s+\w+)?)\s+(?:graphics?|images?|visuals?|charts?|diagrams?|figures?|infographics?|illustrations?|imagery)|(?:make\s+it|be)\s+more\s+visual/i;
const FEWER_VISUALS_RE = /(?:fewer|less|reduce(?:\s+the)?|not\s+so\s+many)\s+(?:graphics?|images?|visuals?|charts?|diagrams?|figures?)/i;

export interface CompileResult {
    constraints: SessionConstraints;
    /** True when this turn changed anything (added/lifted/adjusted). */
    changed: boolean;
    /** Human-readable summary of what THIS turn did (for the echo-back). */
    turnActions: string[];
}

function _cleanCapture(m: RegExpMatchArray): string {
    // Prefer the quoted capture group when present; else the noun match.
    const quoted = m[2] || m[3];
    const raw = (quoted || m[1] || '').trim().toLowerCase();
    return raw.replace(/\s+/g, ' ');
}

/**
 * Compile one user chat turn against the session's existing constraints.
 * Deterministic; never throws. Persists via setSessionConstraints when changed.
 */
export function compileDirectives(userText: string, slug: string): CompileResult {
    const prior = getSessionConstraints(slug);
    const next: SessionConstraints = {
        excludeSources: [...prior.excludeSources],
        includeOnly: [...prior.includeOnly],
        visualQuotaFloor: prior.visualQuotaFloor,
        toneDirectives: [...prior.toneDirectives],
        updatedAt: prior.updatedAt,
    };
    const actions: string[] = [];
    const text = String(userText || '');
    if (!text.trim()) return { constraints: prior, changed: false, turnActions: [] };

    // Lifts first ("you can use the transcript again" must beat the exclude
    // regexes, which would otherwise re-match the same sentence).
    let lifted = false;
    for (const re of LIFT_RES) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            if (!m[1]) { // generic "lift the exclusions"
                if (next.excludeSources.length) {
                    actions.push(`lifted all source exclusions (${next.excludeSources.join('; ')})`);
                    next.excludeSources = [];
                    lifted = true;
                }
                continue;
            }
            const target = _cleanCapture(m);
            const before = next.excludeSources.length;
            next.excludeSources = next.excludeSources.filter(s => !_fuzzyEq(s, target));
            if (next.excludeSources.length !== before) {
                actions.push(`lifted exclusion: ${target}`);
                lifted = true;
            }
        }
    }

    // Exclusions.
    if (!lifted) {
        for (const re of EXCLUDE_RES) {
            re.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = re.exec(text)) !== null) {
                const target = _cleanCapture(m);
                if (!target) continue;
                if (!next.excludeSources.some(s => _fuzzyEq(s, target))) {
                    next.excludeSources.push(target);
                    actions.push(`excluding from retrieval + citations: ${target}`);
                }
            }
        }
    }

    // Visual density.
    if (MORE_VISUALS_RE.test(text)) {
        const bumped = Math.min(0.7, Math.max(0.55, (next.visualQuotaFloor ?? 0.4) + 0.15));
        if (bumped !== next.visualQuotaFloor) {
            next.visualQuotaFloor = bumped;
            actions.push(`visual-slide floor raised to ${Math.round(bumped * 100)}%`);
        }
    } else if (FEWER_VISUALS_RE.test(text)) {
        if (next.visualQuotaFloor !== undefined) {
            next.visualQuotaFloor = undefined;
            actions.push('visual-slide floor reset to the gate default');
        }
    }

    const changed = actions.length > 0;
    if (changed) {
        next.updatedAt = Date.now();
        setSessionConstraints(slug, next);
    }
    return { constraints: changed ? next : prior, changed, turnActions: actions };
}

// ---------------------------------------------------------------------------
// Enforcement helpers.
// ---------------------------------------------------------------------------

/** Loose containment match: "transcript" matches "Interview transcript - Rich.docx". */
function _fuzzyEq(a: string, b: string): boolean {
    const na = a.toLowerCase().trim();
    const nb = b.toLowerCase().trim();
    if (!na || !nb) return false;
    return na === nb || na.includes(nb) || nb.includes(na);
}

/** True when a chunk (by its source title / wikiPath / upload filename) is
 *  excluded by the session constraints. Rung-1 deterministic; used by
 *  chunkRetrieval BEFORE ranking so an excluded source can never win. */
export function isSourceExcluded(
    constraints: SessionConstraints | undefined,
    fields: { title?: string; wikiPath?: string; source?: string },
): boolean {
    if (!constraints) return false;
    const hay = [fields.title, fields.wikiPath, fields.source]
        .filter(Boolean).join(' ').toLowerCase();
    if (!hay) return false;
    // Generic upload nouns exclude client-upload material wholesale.
    const GENERIC = ['transcript', 'upload', 'attachment', 'interview', 'recording', 'meeting notes'];
    for (const ex of constraints.excludeSources) {
        const exn = ex.toLowerCase();
        if (GENERIC.some(g => exn.includes(g))) {
            // match chunks whose source path marks them as client uploads, or
            // whose title carries the noun itself.
            if (hay.includes(exn) || GENERIC.some(g => exn.includes(g) && hay.includes(g))
                || /(^|\/)(sources\/uploads?|uploads?)\//.test(hay)) return true;
        } else if (hay.includes(exn)) {
            return true;
        }
    }
    if (constraints.includeOnly.length) {
        return !constraints.includeOnly.some(inc => hay.includes(inc.toLowerCase()));
    }
    return false;
}

/** The visible echo-back line (V4 rule: enforcement is never invisible). */
export function describeEnforcement(constraints: SessionConstraints, turnActions: string[] = []): string {
    const parts: string[] = [];
    if (turnActions.length) parts.push(...turnActions);
    else {
        if (constraints.excludeSources.length) {
            parts.push(`excluded from retrieval + citations: ${constraints.excludeSources.join('; ')}`);
        }
        if (constraints.visualQuotaFloor !== undefined) {
            parts.push(`visual-slide floor: ${Math.round(constraints.visualQuotaFloor * 100)}%`);
        }
    }
    if (!parts.length) return '';
    return `Enforcing: ${parts.join(' | ')}. Say "lift the exclusions" or "use it again" to undo.`;
}

/** Fire-and-forget loop-trace event (L1 directive-adherence telemetry). */
export function noteDirectiveEnforcement(slug: string, count: number = 1): void {
    try {
        void fetch('http://127.0.0.1:5012/api/sessions/loop-trace/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: slug || '_unassigned', field: 'directive_enforcements', n: count }),
        }).catch(() => { /* fire-and-forget */ });
    } catch { /* never blocks */ }
}
