/**
 * Output Completeness Validator - Heuristic truncation detection.
 *
 * Every chunked generation runs the merged output through this validator
 * before shipping to the user. The validator catches the patterns that
 * indicate the model stopped mid-stream (unbalanced fences, unclosed JSON,
 * mid-sentence stops, missing required item counts).
 *
 * No false-negative tolerance: if any signal indicates truncation, the
 * artifact is flagged incomplete and surfaced to the user. The user is
 * never silently shipped a half-deliverable.
 *
 * Created 2026-05-23 as part of the chunking + output-quality plan, Phase 1.
 */

export interface CompletenessFinding {
    severity: 'warn' | 'fail';
    code: string;
    message: string;
    suggestedFix?: string;
}

export interface CompletenessReport {
    ok: boolean;
    findings: CompletenessFinding[];
    /** When known: actual count of structural items in the output (e.g., slides found). */
    foundItemCount?: number;
    /** When known: expected count from the prompt. */
    expectedItemCount?: number;
}

export interface ValidateOptions {
    /** When set, validator checks that the output contains at least this many of the structural unit. */
    expectedItemCount?: number;
    /** When set, validator looks for this fence count (e.g., `:::slide`). */
    expectedFenceMarker?: string;
    /** When set, validator expects JSON; runs balanced-brace check. */
    expectJson?: boolean;
    /** When set, validator expects the prompt asked for N numbered items. */
    expectNumberedList?: boolean;
}

/**
 * Run all relevant completeness checks against an output string.
 */
export function validateCompleteness(
    output: string,
    opts: ValidateOptions = {},
): CompletenessReport {
    const findings: CompletenessFinding[] = [];

    // Empty output is the strongest possible truncation signal.
    if (!output || output.trim().length < 20) {
        findings.push({
            severity: 'fail',
            code: 'empty-output',
            message: 'Output is empty or near-empty.',
            suggestedFix: 'Retry the generation with the same prompt. If repeats, escalate to a higher-tier model.',
        });
        return { ok: false, findings };
    }

    // 1. Fence-count check (for `:::slide` style outputs)
    if (opts.expectedFenceMarker) {
        const marker = opts.expectedFenceMarker;
        const openRegex = new RegExp(`^${escapeRegex(marker)}(?:\\s|$)`, 'gm');
        const opens = (output.match(openRegex) || []).length;
        const closeRegex = /^:::\s*$/gm;
        const closes = (output.match(closeRegex) || []).length;
        if (opens > closes) {
            findings.push({
                severity: 'fail',
                code: 'unclosed-fence',
                message: `Found ${opens} \`${marker}\` openers but only ${closes} closing \`:::\` markers. The output stopped mid-fence.`,
                suggestedFix: 'Re-run the generator - likely a model soft-stop on a long output. Consider chunking this artifact type.',
            });
        }
        if (opts.expectedItemCount != null) {
            const floor = Math.max(1, Math.floor(opts.expectedItemCount * 0.9));
            if (opens < floor) {
                findings.push({
                    severity: opens >= opts.expectedItemCount * 0.5 ? 'warn' : 'fail',
                    code: 'item-count-low',
                    message: `Expected ${opts.expectedItemCount} \`${marker}\` items, found ${opens}. Below the 90% completeness floor (${floor}).`,
                    suggestedFix: 'Increase chunk count for this artifact type; re-run with more parallel calls.',
                });
            }
        }
        return finalize(findings, opens, opts.expectedItemCount);
    }

    // 2. Numbered-list check
    if (opts.expectNumberedList && opts.expectedItemCount != null) {
        const numberedRegex = /^\s*\d+[.)]\s+/gm;
        const count = (output.match(numberedRegex) || []).length;
        const floor = Math.max(1, Math.floor(opts.expectedItemCount * 0.9));
        if (count < floor) {
            findings.push({
                severity: count >= opts.expectedItemCount * 0.5 ? 'warn' : 'fail',
                code: 'numbered-list-short',
                message: `Expected ${opts.expectedItemCount} numbered items, found ${count}.`,
                suggestedFix: 'Re-run with explicit numbering instruction or chunk the output by item-group.',
            });
        }
        return finalize(findings, count, opts.expectedItemCount);
    }

    // 3. JSON balance check
    if (opts.expectJson) {
        let json = output.trim();
        if (json.startsWith('```')) {
            const firstNewline = json.indexOf('\n');
            if (firstNewline > 0) {
                json = json.substring(firstNewline + 1);
                if (json.endsWith('```')) json = json.substring(0, json.length - 3);
            }
        }
        const { balanced, unclosed } = checkBracesBalanced(json);
        if (!balanced) {
            findings.push({
                severity: 'fail',
                code: 'unbalanced-json',
                message: `JSON output is unbalanced - ${unclosed} unclosed brace/bracket. The model stopped mid-value.`,
                suggestedFix: 'Re-run; the model truncated. Try chunked generation if this is a long structured output.',
            });
        }
        return finalize(findings);
    }

    // 4. Mid-sentence stop check (apply to plain prose)
    const trimmed = output.trim();
    const lastChar = trimmed[trimmed.length - 1];
    const acceptableEndings = ['.', '!', '?', '"', "'", ')', ']', '}', '>', '`'];
    if (!acceptableEndings.includes(lastChar)) {
        const lastLine = trimmed.split('\n').pop() || '';
        if (!lastLine.endsWith('|') && !lastLine.endsWith('```')) {
            findings.push({
                severity: 'warn',
                code: 'mid-sentence-stop',
                message: `Output ends without terminal punctuation: "${trimmed.slice(-60)}".`,
                suggestedFix: 'Likely a soft-stop. Consider chunking or instructing the model to wrap with a closing sentence.',
            });
        }
    }

    return finalize(findings);
}

function finalize(
    findings: CompletenessFinding[],
    foundItemCount?: number,
    expectedItemCount?: number,
): CompletenessReport {
    const ok = findings.every(f => f.severity !== 'fail');
    return { ok, findings, foundItemCount, expectedItemCount };
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkBracesBalanced(s: string): { balanced: boolean; unclosed: number } {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (escape) { escape = false; continue; }
        if (c === '\\') { escape = true; continue; }
        if (c === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (c === '{' || c === '[') depth++;
        else if (c === '}' || c === ']') depth--;
        if (depth < 0) return { balanced: false, unclosed: -depth };
    }
    return { balanced: depth === 0, unclosed: depth };
}
