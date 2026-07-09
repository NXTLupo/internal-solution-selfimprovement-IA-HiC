/**
 * AI Router - Multi-Model Intelligence Layer
 * Routes tasks to the optimal AI model based on task type and user preferences.
 *
 * Model Roster (April 2026):
 * - Claude Opus 4.6: Deep research analysis, vision-based UX heuristics (1M context)
 * - GPT-5.4 Mini: Fast structured JSON generation (PRDs, roadmaps, tables)
 * - GPT-5.4: Vision fallback, deep reasoning alternative
 * - Gemini 2.5 Flash: Current default, image generation, video generation
 * - Gemini 3.1 Pro Preview: Long-context multimodal reasoning
 * - Imagen 4: Primary image generation
 */

// --- JSON REPAIR UTILITY (shared across all services) ---
// 2026-05-24 NotebookLM uplift Wire 1: delegate-on-failure to the 9-rung
// ladder in aiOutputRepair.ts. tryRepairJson still returns a string for
// backward compat with the 22 existing call sites; if its repair still
// can't parse, parseJSONWithRepair is invoked as a deeper fallback and
// the repaired output is returned. Net: every JSON.parse(tryRepairJson(...))
// site in the codebase now has the 9-rung ladder underneath it.
import { repairAIOutput } from './aiOutputRepair';

function tryRepairJsonDeep(cleaned: string): string {
    // After bracket-balance, if it still won't parse, try the ladder.
    try {
        JSON.parse(cleaned);
        return cleaned;
    } catch {
        const report = repairAIOutput(cleaned, 'json', {
            calling_context: 'tryRepairJson:deep_fallback',
        });
        if (report.ok && report.output) {
            if (typeof console !== 'undefined' && report.degradation) {
                console.warn(`[tryRepairJson] deep-ladder repair via "${report.repaired_via}" (degradation=${report.degradation})`);
            }
            return report.output;
        }
        // Final fallback: error envelope so downstream JSON.parse doesn't throw
        return JSON.stringify({
            _error: 'AI output unrepairable via tryRepairJson + 9-rung ladder',
            _unrepairable_reason: report.unrepairable_reason ?? 'unknown',
            _raw_preview: cleaned.substring(0, 200),
        });
    }
}

export function tryRepairJson(jsonString: string): string {
    // Strip \r (carriage return) globally - Gemini sometimes returns \r\n on Windows
    // JSON.parse chokes on \r at position 1 in some runtimes
    let cleaned = jsonString.replace(/\r/g, '').trim();

    // Strip markdown code fences
    if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1].split('```')[0].trim();
    }

    // FIX: Handle double-escaped JSON from Gemini streaming.
    // Detection: raw text starts with literal \n or contains literal \" sequences
    // but the first real JSON char ({ or [) isn't at position 0.
    // Example broken input: \n{\n  \"name\": \"value\"\n}
    if (/^\\n|^"\\n|^"?\s*\\n?\s*\{/.test(cleaned) && !cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        try {
            // Try JSON.parse in case it's a JSON-encoded string
            const unescaped = JSON.parse(cleaned);
            if (typeof unescaped === 'string') {
                cleaned = unescaped.trim();
            }
        } catch {
            // Manual unescape of literal \n, \t, \", \\ sequences
            cleaned = cleaned
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1);
            }
            cleaned = cleaned.trim();
        }
    }

    // Also handle the case where the text IS valid JSON structure but has leading \n
    // (literal backslash-n at the start, before the opening brace)
    if (cleaned.startsWith('\\n')) {
        cleaned = cleaned.replace(/^(\\n)+/, '').trim();
    }

    // Strip leading non-JSON text (Gemini sometimes prepends prose)
    const jsonStart = cleaned.search(/[\[{]/);
    if (jsonStart > 0) {
        cleaned = cleaned.substring(jsonStart);
    } else if (jsonStart === -1) {
        // No JSON structure found at all - response is pure text, not JSON.
        // Wrap it as a minimal valid JSON object so downstream doesn't crash.
        console.warn('[tryRepairJson] No JSON structure found in response, wrapping as error object');
        return JSON.stringify({ _error: "Model returned non-JSON text", _raw: cleaned.substring(0, 200) });
    }

    // Bracket-balancing repair for truncated responses.
    // 2026-06-14 - Also DROP stray/unmatched closing brackets that appear
    // MID-STRING. The old pass only COUNTED brackets (to append missing
    // closers) and could not remove an extra "]" or "}" sitting in the middle
    // of the object. A real failure: a block-quote slide where Opus emitted
    //   "quote": { ... }], "motivations": [...]
    // (a stray "]" right after the quote object closed, plus out-of-schema
    // fields). That unmatched "]" defeated JSON.parse AND the end-trim
    // fallback below (the bad bracket is not at the end), so the entire slide
    // collapsed to an error envelope and rendered blank ("Untitled Slide" +
    // empty quote). We now REBUILD the string, skipping any closer that does
    // not match the open stack. For well-formed JSON this is a pure no-op
    // (no closer is ever stray); for the malformed case it recovers the
    // slide's real title + quote instead of losing the whole card.
    let stack: string[] = [];
    let inString = false;
    let escaped = false;
    let rebuilt = '';

    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (escaped) { rebuilt += char; escaped = false; continue; }
        if (char === '\\') { rebuilt += char; escaped = true; continue; }
        if (char === '"') { rebuilt += char; inString = !inString; continue; }
        if (!inString) {
            if (char === '{' || char === '[') {
                stack.push(char === '{' ? '}' : ']');
            } else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                    stack.pop();
                } else {
                    // Stray closer (stack empty, or top is the other bracket
                    // type) - drop it rather than emit invalid JSON.
                    continue;
                }
            }
        }
        rebuilt += char;
    }
    cleaned = rebuilt;

    // Close unclosed string
    if (inString) cleaned += '"';
    // Close remaining brackets/braces
    while (stack.length > 0) cleaned += stack.pop();
    // Fix trailing comma before closing bracket (common truncation artifact)
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    // Validation: try to parse. If bracket-balanced version fails,
    // progressively trim from the end to find a parseable prefix.
    // 2026-05-24: also try the 9-rung ladder via tryRepairJsonDeep at end
    try {
        JSON.parse(cleaned);
    } catch {
        // Strip the appended closers and try again with a backward search
        let base = cleaned;
        for (let trim = 0; trim < 5; trim++) {
            // Remove last closer and any trailing comma/whitespace
            base = base.replace(/[\]}"]?\s*$/, '').replace(/,\s*$/, '');
            // Re-run bracket balance on trimmed version
            let s: string[] = [];
            let iS = false;
            let es = false;
            for (let i = 0; i < base.length; i++) {
                if (es) { es = false; continue; }
                if (base[i] === '\\') { es = true; continue; }
                if (base[i] === '"') { iS = !iS; continue; }
                if (!iS) {
                    if (base[i] === '{' || base[i] === '[') s.push(base[i] === '{' ? '}' : ']');
                    else if (base[i] === '}' || base[i] === ']') { if (s.length) s.pop(); }
                }
            }
            let attempt = base;
            if (iS) attempt += '"';
            while (s.length > 0) attempt += s.pop();
            attempt = attempt.replace(/,\s*([\]}])/g, '$1');
            try {
                JSON.parse(attempt);
                return attempt;
            } catch { /* keep trimming */ }
        }
        // 2026-05-24 NotebookLM uplift Wire 1: 9-rung ladder as final fallback
        return tryRepairJsonDeep(cleaned);
    }

    return cleaned;
}

/**
 * Best-effort recovery of a JSON ARRAY response when the whole-blob parser
 * has already failed. Gemini Flash occasionally truncates mid-object on
 * batched scoring/grading prompts, producing things like:
 *   [{"i":0,"s":85,"r":"..."}, ..., {"i":24,"s":}]
 *                                          ^ half-typed value
 *
 * tryRepairJson can balance brackets but cannot complete a half-typed value,
 * so JSON.parse still throws and the caller loses the ENTIRE batch - even
 * though 24 of 25 objects are well-formed.
 *
 * This helper scans the text for top-level {...} objects (depth-aware,
 * string-aware) and attempts to JSON.parse each one independently, returning
 * only the objects that parse cleanly. Items that fail are skipped silently.
 *
 * Returns [] if the text contains no recoverable objects (e.g., pure prose).
 * NEVER throws.
 */
export function salvageJsonArray<T = unknown>(rawText: string): T[] {
    if (!rawText || typeof rawText !== 'string') return [];

    // Strip markdown fences + leading prose (same prelude as tryRepairJson).
    let text = rawText.replace(/\r/g, '').trim();
    if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
        text = text.split('```')[1].split('```')[0].trim();
    }
    const arrStart = text.indexOf('[');
    if (arrStart < 0) return [];
    text = text.substring(arrStart);

    const out: T[] = [];
    let depth = 0;
    let inString = false;
    let escaped = false;
    let objStart = -1;

    // Iterate character-by-character to find top-level objects inside the
    // outer array. We only care about depth-1 { ... } spans - anything
    // inside nested objects rides along inside its parent.
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;

        if (ch === '{') {
            if (depth === 0) objStart = i;
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0 && objStart >= 0) {
                const candidate = text.substring(objStart, i + 1);
                objStart = -1;
                try {
                    const parsed = JSON.parse(candidate) as T;
                    out.push(parsed);
                } catch { /* skip - partial / malformed object */ }
            }
            if (depth < 0) depth = 0; // defensive
        }
    }

    // Truncation case: outermost object never closed. Try to salvage it by
    // running tryRepairJson on the dangling tail (handles "s":} style cuts
    // by repeatedly trimming the last partial property).
    if (depth > 0 && objStart >= 0) {
        const dangling = text.substring(objStart);
        // Progressive trim: strip the last property + trailing comma until
        // JSON.parse succeeds, or we run out of characters.
        let attempt = dangling;
        for (let trim = 0; trim < 8; trim++) {
            // Strip trailing partial value (everything after the last balanced "key":value pair)
            attempt = attempt.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, '');
            attempt = attempt.replace(/,\s*$/, '');
            // Re-balance brackets on the trimmed candidate
            const repaired = tryRepairJson(attempt);
            try {
                const parsed = JSON.parse(repaired) as T;
                out.push(parsed);
                break;
            } catch { /* keep trimming */ }
        }
    }

    return out;
}

/**
 * Best-effort recovery of a flat JSON OBJECT response when the whole-blob
 * parser has failed. Used for endpoints that return Record<string, V> shapes
 * like queryFabric.refineSearchQueries:
 *   {"GDELT": "remote work 2026", ..., "AI News":}
 *                                              ^ truncated value
 *
 * Strategy: progressively trim trailing partial "key": (no value) chunks
 * until JSON.parse succeeds. Same idea as the trim loop in tryRepairJson,
 * but more aggressive and bounded. Returns {} if nothing can be recovered.
 *
 * NEVER throws.
 */
export function salvageJsonObject<V = unknown>(rawText: string): Record<string, V> {
    if (!rawText || typeof rawText !== 'string') return {};

    let text = rawText.replace(/\r/g, '').trim();
    if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
        text = text.split('```')[1].split('```')[0].trim();
    }
    const objStart = text.indexOf('{');
    if (objStart < 0) return {};
    text = text.substring(objStart);

    // Fast path - try the bracket-balanced repair first.
    try {
        const parsed = JSON.parse(tryRepairJson(text)) as Record<string, V>;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch { /* fall through to progressive trim */ }

    // Slow path - trim a partial trailing entry, then rebalance & retry.
    //
    // IMPORTANT: Gemini sometimes emits the malformed key BEFORE the outermost
    // closer (e.g. `..., "AI News":}` - the } at the end is the object
    // closer, not part of the entry's value). To make the trim regexes anchor
    // on the partial entry instead of the closer, we strip ALL trailing
    // closers/whitespace first; tryRepairJson re-adds them via bracket
    // balancing at the end of each iteration.
    //
    // Patterns we strip, in increasing aggressiveness:
    //   1. ", \"key\" :"                      bare key + colon, no value
    //   2. ", \"key\" : \"unterminated"       string value with no closing quote
    //   3. ", \"key\" : <partial-token>"      number/bool/null value cut mid-token
    //   4. ", \"key\""                        bare key, no colon at all
    let attempt = text;
    for (let trim = 0; trim < 12; trim++) {
        // Strip any trailing closers/whitespace so the partial entry sits at $
        attempt = attempt.replace(/[\s\]}]+$/, '');
        // Now anchor the trim regexes on the partial trailing entry
        const before = attempt;
        attempt = attempt.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, '');   // unterminated string value
        attempt = attempt.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, ''); // partial non-string value (incl. bare colon)
        attempt = attempt.replace(/,\s*"[^"]*"?\s*$/, '');            // bare key (with or without closing quote)
        attempt = attempt.replace(/,\s*$/, '');
        // Re-run tryRepairJson which closes the object via bracket balance.
        const repaired = tryRepairJson(attempt);
        try {
            const parsed = JSON.parse(repaired) as Record<string, V>;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch { /* keep trimming */ }
        // Bail if this iteration made no progress to avoid infinite loops.
        if (attempt === before) break;
    }

    return {};
}

// --- MODEL REGISTRY ---
export interface ModelInfo {
    id: string;
    provider: 'anthropic' | 'openai' | 'google' | 'deepseek';
    displayName: string;
    vision: boolean;
    maxContext: number;
    maxOutput: number;
    costTier: 'budget' | 'standard' | 'premium';
}

// 2026-05-05 - Single-vendor migration to DeepSeek V4 Flash via Azure.
// All HiC reasoning / synthesis / chat / composer paths now route to
// deepseek-v4-flash through /api/ai/deepseek. The proxy honors 429
// Retry-After with exponential backoff so the staging deployment's
// 20 req/min · 20K tok/min limit doesn't surface as user-facing failures
// while quota bump is pending. OpenAI Whisper + text-embedding-3-small
// remain (DeepSeek has no audio/embedding parity). Gemini Search
// Grounding stays only for the conditional web-search tool path
// (free, opt-in via deepResearchService).
//
// Verified 2026-05-05 against the Azure deployment:
//   - 256K-token needle-in-haystack: PASS (10.5s)
//   - Discriminated-union schema tool-use: PASS
//   - Strict OpenAI chat-completions wire format: PASS
//   - api-key header (NOT Authorization: Bearer): required
//   - Token usage NOT returned in response (Azure inference quirk)
//
// To re-enable a fallback path, restore Gemini / GPT entries AND the
// per-stage dispatch branches in services that now hard-route to DeepSeek.
export const MODEL_REGISTRY: Record<string, ModelInfo> = {
    'deepseek-v4-flash': {
        id: 'deepseek-v4-flash', provider: 'deepseek', displayName: 'DeepSeek V4 Flash',
        vision: false, maxContext: 256_000, maxOutput: 8_192, costTier: 'standard'
    },
    'deepseek-v4-pro': {
        id: 'deepseek-v4-pro', provider: 'deepseek', displayName: 'DeepSeek V4 Pro',
        vision: false, maxContext: 256_000, maxOutput: 8_192, costTier: 'premium'
    },
    'gpt-5.4': {
        id: 'gpt-5.4', provider: 'openai', displayName: 'GPT-5.4',
        vision: true, maxContext: 1_050_000, maxOutput: 128_000, costTier: 'standard'
    },
    'gpt-5.4-mini': {
        id: 'gpt-5.4-mini', provider: 'openai', displayName: 'GPT-5.4 Mini',
        vision: true, maxContext: 400_000, maxOutput: 128_000, costTier: 'budget'
    },
    'gpt-5.5': {
        id: 'gpt-5.5', provider: 'openai', displayName: 'GPT-5.5',
        vision: true, maxContext: 1_200_000, maxOutput: 128_000, costTier: 'premium'
    },
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash', provider: 'google', displayName: 'Gemini 2.5 Flash',
        vision: true, maxContext: 1_048_576, maxOutput: 65_536, costTier: 'budget'
    },
    'gemini-3.1-pro-preview': {
        id: 'gemini-3.1-pro-preview', provider: 'google', displayName: 'Gemini 3.1 Pro',
        vision: true, maxContext: 1_000_000, maxOutput: 65_536, costTier: 'premium'
    },
    // 2026-05-22 - Gemini 3.5 Flash registered for HiC's agentic loops
    // (learning engine, verifier, wiki compiler, "Apply now" regeneration).
    // Pricing per Google's posted card: $1.50/M input, $9/M output (vs Opus
    // $15/M input, $75/M output). Designed for multi-step tasks and coding
    // pipelines - a strict superset of what HiC's self-improvement layer
    // needs. Tier set to "budget" because it is below the Anthropic
    // premium-tier baseline at every dimension.
    'gemini-3.5-flash': {
        id: 'gemini-3.5-flash', provider: 'google', displayName: 'Gemini 3.5 Flash',
        vision: true, maxContext: 1_000_000, maxOutput: 65_536, costTier: 'budget'
    },
    // 2026-05-27 - Claude re-registered as the FUNDED cross-provider escape for
    // the deliverableModelRouter. ANTHROPIC_API_KEY is the platform's primary
    // required key (the journey-mapper now runs claude-opus-4-8 on it), so this is
    // the real "survive even if Gemini is fully down" fallback now that the
    // OpenAI account is insufficient_quota. Sonnet 4.6 balances quality + speed
    // for an escape path. NOTE: Sonnet 4.6 does NOT support assistant prefill;
    // do not use a prefilled-continuation pattern with it.
    'claude-sonnet-4-6': {
        id: 'claude-sonnet-4-6', provider: 'anthropic', displayName: 'Claude Sonnet 4.6',
        vision: true, maxContext: 200_000, maxOutput: 64_000, costTier: 'premium'
    },
    // 2026-05-29 - Opus 4.8 (released 2026-05-28) registered as the deep-reasoning
    // upgrade over 4.7. Standard $5/$25 per 1M tokens, adaptive thinking by default,
    // 1M context window on the Anthropic API. Used by the journey-mapper service and
    // by anything that wants Opus-class reasoning at the new cheaper standard price.
    // 2026-06-13 - Opus 4.8 is the chat-surface deliverable-generation model for
    // artifact hashtags (Analyst Desk + Design Desk), a TEMPORARY stand-in for
    // Claude Fable 5 (Anthropic temporarily banned Fable 5). Swap back to a
    // 'claude-fable-5' entry + repoint the routing strings once the ban lifts;
    // see plans/fable-to-opus-swap-2026-06-13.md.
    'claude-opus-4-8': {
        id: 'claude-opus-4-8', provider: 'anthropic', displayName: 'Claude Opus 4.8',
        vision: true, maxContext: 1_000_000, maxOutput: 64_000, costTier: 'premium'
    },
};

// --- TASK CATEGORIES ---
// 2026-05-03 - Defaults migrated from Anthropic to Google. Opus 4.7 cost was
// $43/run dominated by ~363K-token system-prompt replay × 8 turns. Gemini
// 3.1 Pro at $1.25/M input cuts per-run cost to ~$8 with no loss to source
// coverage, theme breadth, or deliverable structure (those live in code, not
// in the model). Anthropic is fully removed from this branch - all stages
// route to Google or OpenAI exclusively.
// 2026-05-22 - `fast_agentic` category added for HiC's self-improvement
// loops (lint contradiction detection, learning-engine payload generation,
// verifier checks, wiki recompile, "Apply now" regeneration). Default is
// gemini-3.5-flash because it is Google's most-capable model in the agentic
// + structured-output band at roughly 10% of Opus cost.
export type TaskCategory = 'research' | 'fast_generation' | 'vision' | 'image' | 'video' | 'narrative_composition' | 'fast_agentic';

// 2026-05-07 - Defaults migrated from DeepSeek V4 Flash to Gemini 3.1 Pro
// across every reasoning category. DeepSeek narratives were jargon-heavy,
// hyperbolic, and read as AI-slop; Gemini 3.1 Pro produces descriptive,
// professional prose at 1M-token context with reliable instruction-following.
//
// 2026-05-26 - Tiered. Pro stays for `research` (cold-start analysis,
// partner-grade deliverables) and `narrative_composition` (deck/PPTX export,
// the highest-quality surface). Everything else moves to Flash:
//   - `fast_generation` is the chat/interactive path; Pro was 3-5x too slow
//   - `vision` rarely needs Pro's reasoning depth; Flash is sufficient
//   - `fast_agentic` was already Flash
// Quality is preserved on the export path; speed is recovered on the
// interactive path. Users can override per-task via preferences.
// ============================================================================
// CANONICAL MODEL-ROUTING RULE (single source of truth — 2026-06-16, user-final)
// ----------------------------------------------------------------------------
//   • Gemini 3.5 Flash  →  ALL non-hashtag Analyst Desk chat (plain corpus Q&A).
//   • Claude Opus 4.8   →  ALL hashtag deliverable generation — EVERY artifact
//     hashtag (#slides #journey #org #personas #recs #prd #gap #competitive
//     #case-study #roadmap #blueprint #brief #explainer #report ...) AND the
//     #proto build pipeline's generation stages (brief, interaction spec, sim,
//     design-system, build-recipe, code, critique).
//   • VALIDATED EXCEPTION (2026-06-28): #gap (gap-matrix) + #journey (journey-map)
//     → gemini-3.5-flash (temperature 0, deterministic). Bake-off-validated:
//     plans/model-bakeoff-gap-journey-2026-06-28.md (Flash == Pro on both, 0
//     fabricated citations, ~18x cheaper). ALL OTHER artifact hashtags remain
//     Claude Opus 4.8. The other six schema-constrained deliverables (#blueprint
//     #competitive #org #audit #arch #roadmap) are pending their own bake-off.
//     Encoded as DELIVERABLE_MODEL_TIER in corpusChatService.ts (reversible:
//     delete the map entry → Opus).
//   • Cross-provider FALLBACK (resilience only, never by choice): Gemini, then
//     (last) OpenAI for the GENERATED prototype's own runtime; the HiC BUILD path
//     never uses GPT-5.5 (it rejects non-default temperature → HTTP 400, and is off-rule).
//
// ENFORCEMENT POINTS (keep in lockstep — no parallel routing logic / no debt):
//   • services/corpusChatService.ts routedModelFor() + the artifact force-route
//     (plain → gemini-3.5-flash; hashtag → claude-opus-4-8).
//   • services/prototypeBuilder.ts callOpusJsonStage + callClaudeStage (Opus
//     primary; Gemini 3.1 Pro resilience fallback).
//   • The DEFAULT_MODELS table below feeds non-deliverable agentic tasks only;
//     deliverable routing is the force-route above, NOT a category default.
// Mirrored in: documentation.html §12, .claude/CLAUDE.md, brand/figma-node-map +
// memory. When this rule changes, update ALL of those together.
// ============================================================================
// ============================================================================
// OPUS CAP — SINGLE SOURCE OF TRUTH for the temporary Anthropic-quota workaround
// (Opus 4.8 hit its monthly cap; it returns HTTP 400 until access is regained).
// While `true`, NO generation path may route to claude-opus-4-8 — every site that
// would otherwise pick Opus must fall to its Gemini stand-in. This consolidates a
// workaround that previously lived in three places (corpusChatService
// ARTIFACT_DEFAULT_DURING_CAP, prototypeBuilder CODE_MODEL, and — unguarded until
// 2026-06-29 — geminiService._runBreadthShard, which kept calling Opus and eating
// a 400 on every theme shard before falling back).
// REVERT (after the cap lifts, e.g. 2026-07-01): set this to `false` — that ONE
// flip restores Opus across all three sites in lockstep. No other edit required.
// REVERTED 2026-07-01 (deferred-ledger D7): the Anthropic cap window ended today; Opus 4.8 is
// restored for evidence/imagery/narrative artifacts + the #proto build path. The schema→Flash
// tier is bake-off-validated and PERMANENT (not cap-dependent). If Opus still 400s, the router's
// health/quota handling + cross-provider fallback (chooseArtifactModel quotaExhausted/healthDegraded
// + callWithModelChain) absorb it; flip back to `true` only if Anthropic extends the cap.
// ============================================================================
export const OPUS_CAP_ACTIVE = false;

// ============================================================================
// CANONICAL HASHTAG-ARTIFACT MODEL POLICY — single source of truth (2026-06-30).
// Every hashtag artifact generation path MUST resolve its model through
// artifactModelFor() so routing is consistent, cap-aware, and cost/quality-tiered.
// Bake-off ground truth (plans/model-bakeoff-broadened-2026-06-28.md):
//   • SCHEMA/TABLE deliverables — the template bounds the output, so Gemini 3.5
//     Flash matched Gemini 3.1 Pro on completeness + 0 fabricated citations at
//     ~18x lower cost. Flash is the cost/quality winner REGARDLESS of the cap.
//   • EVIDENCE / IMAGERY / NARRATIVE deliverables — need the strongest model:
//     Gemini 3.1 Pro while the Opus cap is active, Claude Opus 4.8 after it lifts.
// NEVER returns claude-opus-4-8 while OPUS_CAP_ACTIVE (the legacy hardcoded-Opus
// sites that ignored this were the #proto hard-fail + #approaches 400 burns).
// Accepts a template id (gap-matrix), a hashtag (#gap), or a generator/kind name.
// ============================================================================
const SCHEMA_FLASH_ARTIFACTS = new Set<string>([
    // slide-template ids
    'gap-matrix', 'journey-map', 'service-blueprint', 'competitive-matrix',
    'org-chart', 'systems-inventory', 'architecture-map', 'timeline',
    // hashtag / generator aliases for the same schema deliverables
    'gap', 'journey', 'blueprint', 'competitive', 'compete', 'org',
    'audit', 'arch', 'tech-arch', 'roadmap',
]);

export function artifactModelFor(kind?: string | null): string {
    // WS-E/D13: delegate to the eval-backed policy engine (single authority). Behavior-preserving vs the
    // former tier switch (schema->flash; evidence/imagery/narrative->gemini-3.1-pro-preview capped /
    // claude-opus-4-8 after), now with a scored rationale + quota/health-awareness available via chooseArtifactModel.
    return chooseArtifactModel(kind).selectedModel;
}

// ============================================================================
// WS-E / D13 (2026-06-30): EVAL-BACKED ROUTER POLICY ENGINE. artifactModelFor() returns just the winning id;
// chooseArtifactModel() is the richer authority - it scores the eligible models for THIS deliverable by
// bake-off EVAL QUALITY + live provider QUOTA/HEALTH + relative COST, and returns {selectedModel, reason,
// alternatives, evalBasis}. Reserves frontier models for deliverables the eval says need them (personas,
// evidence); pushes schema/table to the cheap tier. Sync (embedded registry, no fetch) so artifactModelFor
// delegates cleanly. Provider-native orchestration (Responses/Interactions) is a separate proxy concern.
// ============================================================================
interface ModelEval { quality: number; note?: string; }   // 0-1 eval quality for a model on a deliverable class

// Bake-off-seeded eval evidence (plans/model-bakeoff-*.md). '_schema'/'_evidence' are class defaults;
// a per-deliverable key (e.g. 'personas') overrides. Extend from the golden-set + traces over time.
const ARTIFACT_EVAL_REGISTRY: Record<string, Record<string, ModelEval>> = {
    _schema: {
        'gemini-3.5-flash': { quality: 1.0, note: 'bakeoff: matched Pro, ~18x cheaper' },
        'gemini-3.1-pro-preview': { quality: 1.0 },
        'claude-opus-4-8': { quality: 1.0 },
    },
    _evidence: {
        'gemini-3.5-flash': { quality: 0.5, note: 'thin quotes/concepts on evidence-heavy work' },
        'gemini-3.1-pro-preview': { quality: 0.9 },
        'claude-opus-4-8': { quality: 1.0 },
    },
    // bake-off Part B: Flash FAILED personas (1/3, truncated); Pro passed.
    personas: { 'gemini-3.5-flash': { quality: 0.3, note: 'bakeoff PartB: FAILED (1/3, truncated)' }, 'gemini-3.1-pro-preview': { quality: 0.95 }, 'claude-opus-4-8': { quality: 1.0 } },
    persona: { 'gemini-3.5-flash': { quality: 0.3, note: 'bakeoff PartB: FAILED (1/3, truncated)' }, 'gemini-3.1-pro-preview': { quality: 0.95 }, 'claude-opus-4-8': { quality: 1.0 } },
    'persona-card': { 'gemini-3.5-flash': { quality: 0.3 }, 'gemini-3.1-pro-preview': { quality: 0.95 }, 'claude-opus-4-8': { quality: 1.0 } },
};

// Relative per-1M output-token $ (ordering is what the cost tilt uses, not absolute precision).
const MODEL_COST_REL: Record<string, number> = {
    'gemini-3.5-flash': 1, 'gemini-3.1-pro-preview': 10, 'claude-opus-4-8': 25, 'gpt-5.5': 30, 'gpt-5.4-mini': 4.5,
};

export interface RoutingDecision {
    selectedModel: string;
    reason: string;
    alternatives: string[];
    evalBasis: string;
}

export interface RoutingOpts {
    /** model ids currently over quota (defaults to claude-opus-4-8 while OPUS_CAP_ACTIVE). */
    quotaExhausted?: string[];
    /** model ids with degraded provider health (from multiModelResilience). */
    healthDegraded?: string[];
}

export function chooseArtifactModel(kind?: string | null, opts: RoutingOpts = {}): RoutingDecision {
    const k = String(kind || '').toLowerCase().replace(/^#/, '').trim();
    const isSchema = SCHEMA_FLASH_ARTIFACTS.has(k);
    const candidates = isSchema
        ? ['gemini-3.5-flash', 'gemini-3.1-pro-preview']
        : (OPUS_CAP_ACTIVE ? ['gemini-3.1-pro-preview', 'gemini-3.5-flash'] : ['claude-opus-4-8', 'gemini-3.1-pro-preview']);
    const cls = isSchema ? '_schema' : '_evidence';
    const evalMap: Record<string, ModelEval> = { ...(ARTIFACT_EVAL_REGISTRY[cls] || {}), ...(ARTIFACT_EVAL_REGISTRY[k] || {}) };
    const exhausted = new Set(opts.quotaExhausted || (OPUS_CAP_ACTIVE ? ['claude-opus-4-8'] : []));
    const degraded = new Set(opts.healthDegraded || []);
    const costWeight = isSchema ? 0.04 : 0.01;   // schema: cheaper matters more (quality is a wash)
    let eligible = candidates.filter(m => !exhausted.has(m));
    // health-aware: PREFER healthy models - drop degraded ones when a healthy candidate remains; only fall
    // back to a degraded model if EVERY eligible candidate is degraded (degraded still works, just worse).
    const healthy = eligible.filter(m => !degraded.has(m));
    if (healthy.length > 0) eligible = healthy;
    const scored = eligible
        .map(m => {
            const q = evalMap[m]?.quality ?? 0.6;
            const cost = MODEL_COST_REL[m] ?? 10;
            const score = q - costWeight * Math.log2(cost + 1) - (degraded.has(m) ? 0.3 : 0);
            return { m, q, cost, score, note: evalMap[m]?.note };
        })
        .sort((a, b) => b.score - a.score);
    if (scored.length === 0) {
        const fallback = isSchema ? 'gemini-3.5-flash' : (OPUS_CAP_ACTIVE ? 'gemini-3.1-pro-preview' : 'claude-opus-4-8');
        return { selectedModel: fallback, reason: 'all candidates exhausted/degraded; tier default', alternatives: [], evalBasis: cls };
    }
    const win = scored[0];
    return {
        selectedModel: win.m,
        reason: `eval q=${win.q.toFixed(2)}${win.note ? ` (${win.note})` : ''}, cost~${win.cost}, ${isSchema ? 'schema' : 'evidence'} tier${degraded.size ? ', health-adjusted' : ''}`,
        alternatives: scored.slice(1).map(s => s.m),
        evalBasis: ARTIFACT_EVAL_REGISTRY[k] ? k : cls,
    };
}

/** The proxy AI endpoint family for a model id (so callers route the request to
 *  the matching endpoint + body shape). */
/** E1 (2026-07-02, artifact-total-elevation): CACHE-BREAK MARKER - the single client-side source of
 *  truth (mirrors proxy HIC_CACHE_BREAK; keep in lockstep). System prompts assembled as
 *  [stable core][marker][engagement block][marker][dynamic] get multi-breakpoint Anthropic prompt
 *  caching at the proxy; other providers strip the marker there. Never reaches any model. */
export const HIC_CACHE_BREAK = '\n<<<HIC-CACHE-BREAK>>>\n';

/** Strip cache-break markers for call paths that do NOT go through the proxy (e.g. the Gemini SDK).
 *  The proxy strips them for its own non-Anthropic endpoints; direct-SDK callers use this. */
export function stripCacheMarkers(s: string): string {
    if (!s || s.indexOf('<<<HIC-CACHE-BREAK>>>') === -1) return s;
    return s.split(HIC_CACHE_BREAK).join('\n').split(HIC_CACHE_BREAK.trim()).join('');
}

export function endpointForModel(modelId: string): 'gemini' | 'anthropic' | 'openai' {
    if (modelId.startsWith('claude-')) return 'anthropic';
    if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'openai';
    return 'gemini';
}

export const DEFAULT_MODELS: Record<TaskCategory, string> = {
    research: 'gemini-3.1-pro-preview',
    fast_generation: 'gemini-3.5-flash',
    vision: 'gemini-3.5-flash',
    image: 'gemini-3.1-flash-image-preview',
    video: 'gemini-3.1-flash-image-preview',   // HiC has no video; kept off 2.5-flash for hygiene
    narrative_composition: 'gemini-3.1-pro-preview',
    fast_agentic: 'gemini-3.5-flash',
};

export type ModelPreferences = Record<TaskCategory, string>;

// --- AVAILABLE MODELS PER CATEGORY ---
export const MODELS_FOR_CATEGORY: Record<TaskCategory, string[]> = {
    research: ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'deepseek-v4-flash'],
    fast_generation: ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'deepseek-v4-flash'],
    vision: ['gemini-3.1-pro-preview', 'gemini-3.5-flash'],
    image: ['gemini-3.1-flash-image-preview'],
    video: ['gemini-3.1-flash-image-preview'],
    narrative_composition: ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'deepseek-v4-flash'],
    fast_agentic: ['gemini-3.5-flash', 'gemini-3.1-pro-preview'],
};

// --- API KEY AVAILABILITY ---
export function getAvailableProviders(): Set<string> {
    const providers = new Set<string>();
    if ((process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY) providers.add('google');
    if ((process.env as any).OPENAI_API_KEY) providers.add('openai');
    // 2026-05-27 - Anthropic is the funded cross-provider escape. vite.config
    // exposes ANTHROPIC_API_KEY to the client (line 89), and the proxy attaches
    // it server-side at /api/ai/anthropic.
    if ((process.env as any).ANTHROPIC_API_KEY) providers.add('anthropic');
    return providers;
}

export function getAvailableModels(category: TaskCategory): ModelInfo[] {
    const providers = getAvailableProviders();
    return MODELS_FOR_CATEGORY[category]
        .filter(id => providers.has(MODEL_REGISTRY[id].provider))
        .map(id => MODEL_REGISTRY[id]);
}

// --- ROUTER ---

import * as openaiService from './openaiService';

/**
 * Route a text analysis task to the selected model.
 * Returns parsed JSON of type T.
 *
 * 2026-05-03 - Anthropic branch removed. Only OpenAI and Google providers
 * are supported on this branch. Google text routing uses GenAISession
 * directly (see geminiService.ts), so this router only handles OpenAI.
 */
export async function routeTextAnalysis<T>(
    systemPrompt: string,
    userPrompt: string,
    preferences: ModelPreferences,
    category: TaskCategory = 'research',
    maxTokens: number = 16000,
    temperature: number = 0.1
): Promise<T> {
    const modelId = preferences[category] || DEFAULT_MODELS[category];
    const model = MODEL_REGISTRY[modelId];

    if (!model) {
        throw new Error(`Unknown model: ${modelId}`);
    }

    switch (model.provider) {
        case 'openai':
            return openaiService.analyzeTextJSON<T>(systemPrompt, userPrompt, modelId, maxTokens, temperature);
        case 'google':
            // Delegate to existing Gemini service (import dynamically to avoid circular deps)
            throw new Error('Google text routing should use existing GenAISession. Use routeTextAnalysis only for OpenAI tasks.');
        default:
            throw new Error(`Unsupported provider: ${model.provider}`);
    }
}

/**
 * Route a vision analysis task to the selected model.
 * Returns parsed JSON of type T.
 *
 * 2026-07-05 (heuristic-audit uplift Phase 0): anthropic + google branches added.
 * The pre-fix switch implemented ONLY 'openai', while DEFAULT_MODELS.vision is a
 * google model, so the default configuration always threw "Vision not supported
 * for provider: google" (the Heuristic Analysis module was broken for every user
 * who did not hand-pick an OpenAI vision model). Both new branches post through
 * the proxy /api/ai/{anthropic,gemini} chokepoints (keys attach server-side; the
 * proxy strips `temperature` for Opus 4.8, which rejects it with a 400).
 */
export async function routeVisionAnalysis<T>(
    systemPrompt: string,
    userPrompt: string,
    images: { base64: string; mimeType: string }[],
    preferences: ModelPreferences,
    maxTokens: number = 32000,
    temperature: number = 0.1
): Promise<T> {
    const modelId = preferences.vision || DEFAULT_MODELS.vision;
    const model = MODEL_REGISTRY[modelId];

    if (!model) {
        throw new Error(`Unknown model: ${modelId}`);
    }
    if (!model.vision) {
        throw new Error(`Model ${modelId} is not vision-capable (registry vision:false)`);
    }

    switch (model.provider) {
        case 'openai':
            return openaiService.analyzeVision<T>(systemPrompt, userPrompt, images, modelId, maxTokens, temperature);
        case 'anthropic':
            return anthropicVisionJSON<T>(systemPrompt, userPrompt, images, modelId, maxTokens);
        case 'google':
            return geminiVisionJSON<T>(systemPrompt, userPrompt, images, modelId, maxTokens, temperature);
        default:
            throw new Error(`Vision not supported for provider: ${model.provider}`);
    }
}

/** Anthropic vision via the proxy /api/ai/anthropic. Screenshots ride as base64 image
 *  blocks interleaved with 1-indexed sequence labels (mirrors the OpenAI shape in
 *  openaiService.analyzeVision so screenshotRefs stay consistent across providers).
 *  No `temperature`: claude-opus-4-8 rejects it; the proxy strips it defensively. */
async function anthropicVisionJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    images: { base64: string; mimeType: string }[],
    modelId: string,
    maxTokens: number,
): Promise<T> {
    const { callAnthropic } = await import('./aiRetryClient');
    const { parseJSONWithRepair } = await import('./aiOutputRepair');

    const content: any[] = [];
    images.forEach((img, i) => {
        content.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.base64 } });
        content.push({ type: 'text', text: `[Screenshot ${i + 1} of ${images.length}]` });
    });
    content.push({ type: 'text', text: userPrompt });

    const cap = MODEL_REGISTRY[modelId]?.maxOutput ?? 64_000;
    const data: any = await callAnthropic({
        model: modelId,
        max_tokens: Math.min(maxTokens, cap),
        system: systemPrompt,
        messages: [{ role: 'user', content }],
    }, {
        label: `Vision (${modelId})`,
        maxAttempts: 3,
        requestTimeoutMs: 600_000,
        retryOnTimeout: false,
    });

    const text = (Array.isArray(data?.content) ? data.content : [])
        .map((b: any) => (typeof b?.text === 'string' ? b.text : ''))
        .join('')
        .trim();
    if (!text) {
        throw new Error(`Vision (${modelId}) returned empty content (stop_reason=${data?.stop_reason || 'unknown'})`);
    }
    // 2026-07-08 (live NFP "no rung succeeded" failure): a max_tokens stop means the
    // JSON is truncated - say so loudly so the repair telemetry carries the cause, and
    // fold the stop reason into any parse error instead of a bare repair message.
    if (data?.stop_reason === 'max_tokens') {
        console.warn(`[aiRouter] Vision (${modelId}) hit its ${maxTokens}-token output cap; response truncated - the repair ladder salvages complete items`);
    }
    try {
        return parseJSONWithRepair<T>(text, {
            calling_context: `vision:${modelId}`,
            onDegradation: (report) => console.warn(
                `[aiRouter] Vision (${modelId}) JSON repaired via ${report.repaired_via} (stop_reason=${data?.stop_reason}); incomplete: ${report.incomplete_items.join(', ') || 'none'}`),
        });
    } catch (e: any) {
        e.message = `${e.message} (stop_reason=${data?.stop_reason || 'unknown'}, response ${text.length} chars)`;
        throw e;
    }
}

/** Gemini vision via the proxy /api/ai/gemini (native shape). Screenshots ride as
 *  inlineData parts interleaved with sequence labels; responseMimeType locks JSON. */
async function geminiVisionJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    images: { base64: string; mimeType: string }[],
    modelId: string,
    maxTokens: number,
    temperature: number,
): Promise<T> {
    const { callGemini } = await import('./aiRetryClient');
    const { parseJSONWithRepair } = await import('./aiOutputRepair');

    const parts: any[] = [];
    images.forEach((img, i) => {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        parts.push({ text: `[Screenshot ${i + 1} of ${images.length}]` });
    });
    parts.push({ text: userPrompt });

    const cap = MODEL_REGISTRY[modelId]?.maxOutput ?? 65_536;
    const data: any = await callGemini({
        model: modelId,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts }],
        config: {
            temperature,
            maxOutputTokens: Math.min(maxTokens, cap),
            responseMimeType: 'application/json',
        },
    }, {
        label: `Vision (${modelId})`,
        maxAttempts: 3,
        requestTimeoutMs: 600_000,
        retryOnTimeout: false,
    });

    const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .join('')
        .trim();
    if (!text) {
        throw new Error(`Vision (${modelId}) returned empty content (finishReason=${data?.candidates?.[0]?.finishReason || 'unknown'})`);
    }
    return parseJSONWithRepair<T>(text, { calling_context: `vision:${modelId}` });
}

/**
 * Get a human-readable summary of which models will be used.
 * Displayed at the MODEL_SELECTION checkpoint.
 */
export function getModelSummary(preferences: ModelPreferences): { category: string; model: string; provider: string; costTier: string }[] {
    return (Object.keys(preferences) as TaskCategory[]).map(category => {
        const modelId = preferences[category];
        const model = MODEL_REGISTRY[modelId];
        return {
            category: category.replace('_', ' '),
            model: model?.displayName || modelId,
            provider: model?.provider || 'unknown',
            costTier: model?.costTier || 'unknown',
        };
    });
}
