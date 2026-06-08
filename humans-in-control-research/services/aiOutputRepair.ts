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

        // Rung 6 - truncation close
        const r6 = truncationClose(candidate);
        if (r6.changed) {
            rungs_attempted.push('truncation_close');
            candidate = r6.out;
            warnings.push('artifact was truncated; final item may be incomplete');
            try {
                return {
                    ok: true, output: candidate, parsed: JSON.parse(candidate),
                    repaired_via: 'truncation_close', degradation: true,
                    incomplete_items: r6.incompletePath ? [r6.incompletePath] : [],
                    warnings,
                    original_length, repaired_length: candidate.length, rungs_attempted,
                };
            } catch (e: unknown) {
                return {
                    ok: false, output: null, parsed: null,
                    repaired_via: 'truncation_close', degradation: true,
                    incomplete_items: r6.incompletePath ? [r6.incompletePath] : [],
                    warnings: [...warnings, `truncation close insufficient: ${String(e).slice(0, 120)}`],
                    unrepairable_reason: 'truncation close did not yield valid JSON',
                    original_length, repaired_length: candidate.length, rungs_attempted,
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
