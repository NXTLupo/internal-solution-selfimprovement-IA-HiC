// services/aiOutputRepair.ts
// TypeScript port of the `ai-output-syntax-repair` skill spec.
// Defeats the most common HiC failure modes: malformed JSON from Gemini Flash,
// empty whitespace tool-call arguments from DeepSeek, GPT-5.5 truncation at max-tokens.
// See .claude/skills/ai-output-syntax-repair/SKILL.md for the 9-rung repair ladder.
//
// 2026-05-24 - Phase 1.1 of plans/hic-notebooklm-uplift-plan-2026-05-24.md

export type RepairReport = {
    ok: boolean;
    output: string | null;
    parsed: unknown;
    repaired_via: string;
    degradation: boolean;
    incomplete_items: string[];
    warnings: string[];
    unrepairable_reason?: string;
    original_length: number;
    repaired_length: number;
    rungs_attempted: string[];
};

export type ArtifactType = 'json' | 'html' | 'svg' | 'css' | 'xml';

export type RepairOptions = {
    expected_schema?: unknown;
    calling_context?: string;
};

const MAX_INPUT_SIZE_BYTES = 1024 * 1024; // 1 MB cap


// Rung 1 - Trim conversational wrapping
function trimWrapping(text: string): { out: string; changed: boolean } {
    let s = text.trim();
    // Strip fenced code blocks
    s = s.replace(/^```(?:json|html|svg|css|xml)?\s*/i, '');
    s = s.replace(/\s*```$/, '');
    // Find first { or [ and last matching close
    const firstObj = s.indexOf('{');
    const firstArr = s.indexOf('[');
    const starts = [firstObj, firstArr].filter(p => p >= 0);
    if (starts.length === 0) return { out: text, changed: false };
    const start = Math.min(...starts);
    const lastObj = s.lastIndexOf('}');
    const lastArr = s.lastIndexOf(']');
    const end = Math.max(lastObj, lastArr);
    if (end <= start) return { out: text, changed: false };
    const candidate = s.slice(start, end + 1);
    return { out: candidate, changed: candidate !== text };
}


// Rung 3 - Trailing comma + dangling comma cleanup
function trailingCommaCleanup(text: string): { out: string; changed: boolean } {
    const out = text.replace(/,(\s*[}\]])/g, '$1');
    return { out, changed: out !== text };
}


// Rung 4 - JSON5 normalization (single quotes → double; unquoted keys → quoted)
function json5Normalize(text: string): { out: string; changed: boolean } {
    // Only convert single-quoted string LITERALS that look like JSON values
    // Avoid touching apostrophes inside double-quoted strings
    let out = text;
    let changed = false;

    // Pattern: 'value' that appears between : or , or [ or { (i.e., as a value or key)
    const singleQuotedValue = /([:,\[{]\s*)'([^'\\]*(?:\\.[^'\\]*)*)'/g;
    const before = out;
    out = out.replace(singleQuotedValue, (_, prefix, content) => {
        // Escape any embedded double quotes
        const escaped = content.replace(/"/g, '\\"');
        return `${prefix}"${escaped}"`;
    });
    if (out !== before) changed = true;

    return { out, changed };
}


// Rung 5 (2026-07-08, live NFP heuristic failure: "no rung succeeded") - escape
// unescaped double quotes INSIDE string values. The #1 balanced-but-invalid shape:
// a model quoting UI copy verbatim ("text": "the "SAMPLE DATA" banner confuses").
// Scanner rule: while inside a string, a `"` whose next non-space char is not one of
// , } ] : \n (or end-of-text, which truncation owns) is CONTENT, not a terminator -
// escape it and stay in the string. Deterministic, no model call.
function escapeInnerQuotes(text: string): { out: string; changed: boolean } {
    let out = '';
    let inString = false;
    let escape = false;
    let changed = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (escape) { out += ch; escape = false; continue; }
        if (inString && ch === '\\') { out += ch; escape = true; continue; }
        if (ch !== '"') { out += ch; continue; }
        if (!inString) { inString = true; out += ch; continue; }
        // inside a string: terminator or content?
        let j = i + 1;
        while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
        const next = j < text.length ? text[j] : '';
        if (next === ',' || next === '}' || next === ']' || next === ':' || next === '\n' || next === '\r' || next === '') {
            inString = false;
            out += ch;
        } else {
            out += '\\"';
            changed = true;
        }
    }
    return { out, changed };
}


// Rung 6b (2026-07-08) - truncation SALVAGE: when closing brackets alone is not
// enough (the tail is a dangling fragment: mid-key `"tit`, post-colon `"severity":`,
// post-comma `},`), iteratively TRIM the incomplete tail back to the last complete
// value boundary, then close + comma-clean + parse. Generalizes the proven
// prototypeBuilder recover-truncated-JSON approach into the shared ladder.
function truncationSalvage(text: string): { out: string; changed: boolean } | null {
    let candidate = text;
    for (let pass = 0; pass < 6; pass++) {
        const before = candidate;
        candidate = candidate
            .replace(/([,{[])\s*"(?:[^"\\]|\\.)*$/s, (_m, open) => (open === ',' ? '' : open))  // mid-string KEY/element after , { [
            .replace(/:\s*"(?:[^"\\]|\\.)*$/s, ': null')                                          // mid-string VALUE
            .replace(/:\s*[-\d.eE+]*$/s, ': null')                                                // mid-number / bare colon
            .replace(/,\s*$/s, '');                                                               // trailing comma
        const closed = truncationClose(candidate);
        const cleaned = trailingCommaCleanup(closed.out).out;
        try {
            JSON.parse(cleaned);
            return { out: cleaned, changed: true };
        } catch { /* trim further */ }
        if (candidate === before) {
            // nothing left to trim mechanically: drop the last raw character and retry
            candidate = candidate.slice(0, -1);
            if (candidate.length < 2) return null;
        }
    }
    return null;
}


// Rung 6 - Truncation close. Walk the string tracking string state + bracket depth.
function truncationClose(text: string): { out: string; changed: boolean; incompletePath: string | null } {
    if (text.length < 2) return { out: text, changed: false, incompletePath: null };

    let inString = false;
    let escape = false;
    const stack: Array<{ char: '{' | '['; depth: number }> = [];
    let lastInStringPos = -1;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (inString) {
            if (ch === '\\') {
                escape = true;
                continue;
            }
            if (ch === '"') {
                inString = false;
                continue;
            }
            lastInStringPos = i;
            continue;
        }
        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === '{' || ch === '[') {
            stack.push({ char: ch as '{' | '[', depth: stack.length });
        } else if (ch === '}') {
            if (stack.length > 0 && stack[stack.length - 1].char === '{') stack.pop();
        } else if (ch === ']') {
            if (stack.length > 0 && stack[stack.length - 1].char === '[') stack.pop();
        }
    }

    if (!inString && stack.length === 0) {
        return { out: text, changed: false, incompletePath: null };
    }

    const closers: string[] = [];
    if (inString) closers.push('"');
    // Close stack in reverse
    while (stack.length > 0) {
        const item = stack.pop()!;
        closers.push(item.char === '{' ? '}' : ']');
    }

    const repaired = text + closers.join('');
    return { out: repaired, changed: true, incompletePath: 'last_item_in_artifact' };
}


// Rung 7 - HTML truncation close (very lightweight)
const VOID_TAGS = new Set([
    'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col',
    'embed', 'source', 'track', 'wbr',
]);

function htmlTruncationClose(text: string): { out: string; changed: boolean; closedTags: string[] } {
    const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?(\/?)>/g;
    const stack: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(text)) !== null) {
        const closing = m[1] === '/';
        const tag = m[2].toLowerCase();
        const selfClose = m[4] === '/' || VOID_TAGS.has(tag);
        if (selfClose) continue;
        if (closing) {
            if (stack.length > 0 && stack[stack.length - 1] === tag) stack.pop();
        } else {
            stack.push(tag);
        }
    }
    if (stack.length === 0) return { out: text, changed: false, closedTags: [] };
    const closers = stack.slice().reverse().map(t => `</${t}>`).join('');
    return { out: text + closers, changed: true, closedTags: stack.slice() };
}


/**
 * The main entry point. Apply the 9-rung repair ladder and return a RepairReport.
 *
 * Callers (provider adapters, geminiService, prototypeBuilder) should call this
 * BEFORE every JSON.parse() / DOMParser.parseFromString() on AI output. On the
 * skill's contract: never insert placeholder strings; never invent content;
 * every modification leaves a breadcrumb.
 */
export function repairAIOutput(
    text: string,
    type: ArtifactType,
    options: RepairOptions = {}
): RepairReport {
    const original_length = text?.length ?? 0;
    const warnings: string[] = [];
    const rungs_attempted: string[] = [];

    // Guard rails
    if (!text || !text.trim()) {
        return {
            ok: false, output: null, parsed: null,
            repaired_via: 'empty_input', degradation: false,
            incomplete_items: [], warnings: ['empty input'],
            unrepairable_reason: 'empty input',
            original_length, repaired_length: 0, rungs_attempted,
        };
    }
    if (original_length > MAX_INPUT_SIZE_BYTES) {
        return {
            ok: false, output: null, parsed: null,
            repaired_via: 'too_large', degradation: false,
            incomplete_items: [], warnings: [`input exceeds 1MB cap: ${original_length} bytes`],
            unrepairable_reason: 'input too large for repair',
            original_length, repaired_length: 0, rungs_attempted,
        };
    }

    // JSON path
    if (type === 'json') {
        let candidate = text;

        // Try parsing as-is first
        try {
            const parsed = JSON.parse(candidate);
            return {
                ok: true, output: candidate, parsed,
                repaired_via: 'no_repair_needed', degradation: false,
                incomplete_items: [], warnings,
                original_length, repaired_length: candidate.length, rungs_attempted,
            };
        } catch {
            // Fall through to ladder
        }

        // Rung 1
        const r1 = trimWrapping(candidate);
        if (r1.changed) {
            rungs_attempted.push('trim_wrapping');
            candidate = r1.out;
            try {
                return {
                    ok: true, output: candidate, parsed: JSON.parse(candidate),
                    repaired_via: 'trim_wrapping', degradation: false,
                    incomplete_items: [], warnings,
                    original_length, repaired_length: candidate.length, rungs_attempted,
                };
            } catch { /* keep trying */ }
        }

        // Rung 3
        const r3 = trailingCommaCleanup(candidate);
        if (r3.changed) {
            rungs_attempted.push('trailing_comma_cleanup');
            candidate = r3.out;
            try {
                return {
                    ok: true, output: candidate, parsed: JSON.parse(candidate),
                    repaired_via: 'trailing_comma_cleanup', degradation: false,
                    incomplete_items: [], warnings,
                    original_length, repaired_length: candidate.length, rungs_attempted,
                };
            } catch { /* keep trying */ }
        }

        // Rung 4
        const r4 = json5Normalize(candidate);
        if (r4.changed) {
            rungs_attempted.push('json5_normalization');
            candidate = r4.out;
            try {
                return {
                    ok: true, output: candidate, parsed: JSON.parse(candidate),
                    repaired_via: 'json5_normalization', degradation: false,
                    incomplete_items: [], warnings,
                    original_length, repaired_length: candidate.length, rungs_attempted,
                };
            } catch { /* keep trying */ }
        }

        // Rung 5 - unescaped inner quotes (balanced-but-invalid; the 2026-07-08 live class)
        const r5 = escapeInnerQuotes(candidate);
        if (r5.changed) {
            rungs_attempted.push('escape_inner_quotes');
            try {
                const parsed = JSON.parse(r5.out);
                return {
                    ok: true, output: r5.out, parsed,
                    repaired_via: 'escape_inner_quotes', degradation: true,
                    incomplete_items: [], warnings: [...warnings, 'unescaped quotes inside string values were escaped'],
                    original_length, repaired_length: r5.out.length, rungs_attempted,
                };
            } catch { /* keep the ORIGINAL candidate: the heuristic may have misfired */ }
        }

        // Rung 6 - truncation close
        const r6 = truncationClose(candidate);
        if (r6.changed) {
            rungs_attempted.push('truncation_close');
            warnings.push('artifact was truncated; final item may be incomplete');
            try {
                const parsed = JSON.parse(r6.out);
                return {
                    ok: true, output: r6.out, parsed,
                    repaired_via: 'truncation_close', degradation: true,
                    incomplete_items: r6.incompletePath ? [r6.incompletePath] : [],
                    warnings,
                    original_length, repaired_length: r6.out.length, rungs_attempted,
                };
            } catch { /* fall through to salvage */ }
        }

        // Rung 6b - truncation salvage: trim the dangling tail to the last complete
        // value, close, comma-clean, parse; iterative. Also retried on the
        // inner-quote-escaped variant (truncation + inner quotes can co-occur).
        for (const base of r5.changed ? [candidate, r5.out] : [candidate]) {
            const r6b = truncationSalvage(base);
            if (r6b) {
                rungs_attempted.push('truncation_salvage');
                return {
                    ok: true, output: r6b.out, parsed: JSON.parse(r6b.out),
                    repaired_via: 'truncation_salvage', degradation: true,
                    incomplete_items: ['trailing_incomplete_fragment_dropped'],
                    warnings: [...warnings, 'artifact was truncated; the incomplete tail item was dropped'],
                    original_length, repaired_length: r6b.out.length, rungs_attempted,
                };
            }
        }

        // Exhausted
        return {
            ok: false, output: null, parsed: null,
            repaired_via: 'unrepairable', degradation: false,
            incomplete_items: [], warnings: [...warnings, 'no rung succeeded'],
            unrepairable_reason: 'no rung succeeded for JSON',
            original_length, repaired_length: 0, rungs_attempted,
        };
    }

    // HTML / SVG path
    if (type === 'html' || type === 'svg') {
        const r7 = htmlTruncationClose(text);
        if (r7.changed) {
            rungs_attempted.push('html_truncation_close');
            return {
                ok: true, output: r7.out, parsed: r7.out,
                repaired_via: 'html_truncation_close', degradation: true,
                incomplete_items: r7.closedTags,
                warnings: [`closed ${r7.closedTags.length} unbalanced tag(s): ${r7.closedTags.join(', ')}`],
                original_length, repaired_length: r7.out.length, rungs_attempted,
            };
        }
        return {
            ok: true, output: text, parsed: text,
            repaired_via: 'no_repair_needed', degradation: false,
            incomplete_items: [], warnings,
            original_length, repaired_length: text.length, rungs_attempted,
        };
    }

    // CSS / XML - minimal repair for now (CSS rule close, XML close)
    return {
        ok: true, output: text, parsed: text,
        repaired_via: 'no_repair_needed', degradation: false,
        incomplete_items: [], warnings: [`${type} repair not yet implemented; passthrough`],
        original_length, repaired_length: text.length, rungs_attempted,
    };
}


/**
 * Convenience wrapper for the typical JSON-parse-with-repair pattern.
 * Throws if unrepairable; returns parsed object on success.
 *
 * Emits a side-effect "degradation event" via the callback if rung 6+ fired.
 */
export function parseJSONWithRepair<T = unknown>(
    text: string,
    options?: {
        calling_context?: string;
        onDegradation?: (report: RepairReport) => void;
    }
): T {
    const report = repairAIOutput(text, 'json', {
        calling_context: options?.calling_context,
    });
    if (!report.ok) {
        const err = new Error(`AI output unrepairable: ${report.unrepairable_reason}`);
        (err as any).repair_report = report;
        throw err;
    }
    if (report.degradation && options?.onDegradation) {
        options.onDegradation(report);
    }
    return report.parsed as T;
}
