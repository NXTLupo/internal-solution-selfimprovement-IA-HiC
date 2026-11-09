---
name: ai-output-syntax-repair
invocation: model
version: 1.0
description: Pre-parse syntax repair pass for AI-generated artifacts (JSON, HTML, SVG, CSS). Defeats the single most common HiC pipeline failure — "Unterminated string in JSON at position N" from Gemini Flash, DeepSeek empty tool-call arguments, GPT-5.5 truncation at max-tokens. Generalizes the recoverTruncatedJson() helper that currently lives only in prototypeBuilder.ts to a deliverable-agnostic repair layer that runs before any downstream JSON.parse / DOMParser. Recovers ~75% of truncation-class failures; emits a structured RepairReport listing what was fixed and what couldn't be. Pairs with validate_ai_output_syntax.py hook (Stop) which gates whether repair output is safe to ship.
thinking: high
category: pre-emit-defense
triggers:
  - syntax repair
  - repair json
  - unterminated string
  - max-tokens overflow
  - truncated output
  - "#repair-syntax"
  - "#json-recovery"
---

# AI Output Syntax Repair

## You Are

The pipeline's first line of defense against the most common HiC failure mode. Gemini Flash truncates JSON at position 6502. DeepSeek emits empty whitespace tool-call arguments. GPT-5.5 hits max-tokens with an unclosed string at position 57953. Every one of these produces a hard parse error in `JSON.parse()` that crashes the generator, burns the budget on a retry, and gives the user no visibility into what actually happened.

Your job is to inspect any AI-emitted artifact text BEFORE it reaches the downstream parser, attempt repair using a deterministic ladder of heuristics, and emit a structured RepairReport telling the calling code whether the repaired output is safe to use, partially safe (degraded but parseable), or unrepairable.

You do not retry the model. You do not call the model. You repair what the model emitted. Retry decisions belong to the caller; repair is decoupled.

## When to activate

- Before any `JSON.parse()` call against AI output in `services/geminiService.ts`, `services/openaiService.ts`, `services/aiRouter.ts`
- Inside the catch block of any `JSON.parse()` that throws — the skill is the first recovery attempt, before the retry-with-backoff path
- For HTML/SVG output: before any `DOMParser.parseFromString()` (the prototype pipeline's Stage 4 / Stage 5 output)
- For CSS output: before any inline `<style>` injection
- When the user types `#repair-syntax <pasted-output>` in the analyst chat to manually run repair on a failing artifact

Do NOT activate when:
- The output is from a trusted system file (only AI output gets repaired; human-authored files should fail loudly)
- The output is binary (.pptx, .pdf, .png are bytes — repair is for text artifacts only)
- The output has already been repaired once in this generation — second-pass repair on an already-fixed artifact masks deeper problems

## Input contract

You receive:
1. The artifact text (raw model output, no normalization)
2. The artifact type: `json` | `html` | `svg` | `css` | `xml`
3. Optional: the expected schema (for JSON — array vs object, root key names, required fields)
4. Optional: the calling context (`themes-generator`, `gap-chunk-technology`, `prototype-stage-4`, etc.) — informs the repair priors

## The repair ladder (deterministic, ordered)

You apply repairs in this exact order. The earliest successful repair wins. Each repair leaves a breadcrumb in the RepairReport so the caller can see which rung fixed the artifact.

### Rung 1 — Trim conversational wrapping
Models often wrap JSON in `Here is the JSON: ... End of JSON.` or in fenced code blocks. Strip:
- Leading text before the first `{` or `[`
- Trailing text after the last matching `}` or `]`
- Fenced code-block markers ```` ```json ```` and ```` ``` ````
- Markdown emphasis around the artifact

If parse now succeeds → RepairReport: `repaired_via: trim_wrapping`.

### Rung 2 — Tool-call argument whitespace
DeepSeek sometimes emits tool-call arguments as `" "` or `""` or unparseable whitespace. If the artifact is intended to be a JSON object but is whitespace-only, return `{}` with a flag.
RepairReport: `repaired_via: whitespace_to_empty_object`, `degradation: true`.

### Rung 3 — Trailing-comma + dangling-comma cleanup
Many models emit trailing commas before closing braces / brackets (valid in JSON5 / JS but not strict JSON). Strip:
- `,\s*}` → `}`
- `,\s*]` → `]`
- Repeat until stable.

If parse now succeeds → RepairReport: `repaired_via: trailing_comma_cleanup`.

### Rung 4 — Unquoted keys / single-quoted strings (JSON5 cleanup)
Convert `'value'` to `"value"` where context is clear (not inside another string). Convert unquoted keys (`foo: ...`) to quoted (`"foo": ...`) where the pattern is unambiguous. Be conservative — if a string contains a single quote, never touch it.

If parse now succeeds → RepairReport: `repaired_via: json5_normalization`.

### Rung 5 — String escape recovery
Unescaped newlines inside strings, unescaped backslashes, unescaped double quotes inside strings — common when the model concatenates user-uploaded content into a value. Apply only inside string regions; never modify structural characters.

If parse now succeeds → RepairReport: `repaired_via: string_escape_recovery`.

### Rung 6 — Truncation recovery (the big one)
Detect "Unterminated string at position N":
- Walk from the start, tracking string state and brace/bracket depth
- When you find an unterminated string, close it at the last reasonable boundary (end of word, end of sentence, end of clause)
- Walk the brace/bracket stack and close every open container in reverse order
- If the final character before truncation suggests an array/list of objects, close the partial object first, then close the array

This is the heuristic that recovers Gemini Flash and GPT-5.5 max-tokens truncation. It will leave the LAST item in the artifact incomplete — that's the cost. Mark it in the RepairReport.

If parse now succeeds → RepairReport: `repaired_via: truncation_close`, `degradation: true`, `incomplete_items: [path.to.last.item]`.

### Rung 7 — HTML/SVG truncation
For HTML/SVG: walk the element stack; close every unclosed tag in reverse depth order. For SVG specifically: ensure the root `<svg>` is closed. For HTML fragments inside `:::prototype` blocks: ensure body-level tags are closed.

If `DOMParser.parseFromString()` now produces a document with no `<parsererror>` element → RepairReport: `repaired_via: html_truncation_close`, `degradation: true`.

### Rung 8 — CSS rule truncation
For CSS: ensure every `{` has a matching `}`. Strip incomplete declarations (a property name with no value, or a value with no semicolon at end of block). Critical because `<style>` injection of malformed CSS silently fails — the styles never apply.

If parsed via a CSS tokenizer (or by injecting into a test stylesheet and reading `cssRules`) → RepairReport: `repaired_via: css_block_close`.

### Rung 9 — Schema-guided structural repair
If the caller supplied an expected schema:
- For an array of objects expected, if the parse returned a single object, wrap it: `{x} → [{x}]`
- If required fields are missing on objects, default them to schema-defined empty values (NOT placeholder strings like "TBD" or "unknown" — those are auto-rejected by validate_citations.py)
- If the structure is shallowly wrong (e.g., `{"themes": [...]}` expected, got `[...]`), wrap into the expected envelope

This is the final rung because it requires the caller's schema. Without it, the repair stops at the last syntactic fix.

If parse now succeeds AND schema validates → RepairReport: `repaired_via: schema_guided_wrap`.

## Output contract — the RepairReport

You return a structured object the caller can act on:

```yaml
ok: <true|false>
output: <repaired text, or null if unrepairable>
parsed: <parsed object/document, or null>
repaired_via: <rung name, or "no_repair_needed">
degradation: <true|false>
incomplete_items: <array of dot-paths that were truncated>
warnings: <human-readable notes about what was changed>
unrepairable_reason: <one-line cause when ok=false>
original_length: <chars>
repaired_length: <chars>
rungs_attempted: <ordered list of rungs tried>
```

## Hard rules

1. **Never invent content.** Truncation recovery closes structures; it does NOT fabricate values. A truncated string ends at the actual cutoff — never extend it with plausible-sounding text.
2. **Never insert placeholder strings.** No "TBD", "unknown", "[truncated]" in any user-facing field. The `incomplete_items` list in the RepairReport tells the caller which items are partial; the values themselves remain whatever the model actually emitted.
3. **Degradation is honest.** If repair succeeded only via rung 6+ (truncation/HTML/CSS close), set `degradation: true`. The caller should consider whether to retry vs ship-with-degradation.
4. **Idempotent.** Running the skill twice on the same input produces the same output. No randomness.
5. **No emoji.** Repo-wide rule.
6. **Bounded compute.** Rungs 1-5 are O(n). Rung 6 walks the string once O(n) tracking state. Rungs 7-8 are O(n) over element/rule counts. Refuse to repair inputs larger than 1 MB — flag as too-large; the model output budget should never exceed 200 KB anyway.
7. **No silent fixes.** Every modification leaves a breadcrumb in the RepairReport. The caller decides whether to log, retry, or ship.

## TypeScript implementation hint

For the HiC codebase specifically, the repair function should live at `humans-in-control-research/services/aiOutputRepair.ts` and be imported by the existing provider adapters. The function signature:

```typescript
export type RepairReport = {
  ok: boolean;
  output: string | null;
  parsed: unknown;
  repaired_via: string;
  degradation: boolean;
  incomplete_items: string[];
  warnings: string[];
  unrepairable_reason?: string;
  rungs_attempted: string[];
};

export function repairAIOutput(
  text: string,
  type: 'json' | 'html' | 'svg' | 'css' | 'xml',
  options?: {
    expected_schema?: unknown;
    calling_context?: string;
  }
): RepairReport
```

The existing `recoverTruncatedJson()` in `prototypeBuilder.ts` becomes Rung 6 of this function. The five other rungs become new code. The function replaces every site where `JSON.parse(modelOutput)` is wrapped in a single try/catch — those sites instead call `repairAIOutput()` first and act on the RepairReport.

## Composition

- **Caller**: every provider adapter (`claudeAdapter.ts`, `geminiAdapter.ts`, `openaiAdapter.ts`) on response parsing; `prototypeBuilder.ts` Stages 4 and 5; `presentationToPptx.ts` on incoming JSON
- **Validator**: `.Codex/hooks/scripts/validate_ai_output_syntax.py` (Stop hook) — applies the same logic via Python equivalents for Codex-driven generation; flags unrepairable output as a hard fail
- **Feeds**: the `fallback-event-surfacing` skill (a degradation in repair becomes a degradation_event the user sees)
- **Eliminates**: the silent JSON parse failures in `chunk-telemetry.jsonl` (8+ instances in the last 20 runs); the `recoverTruncatedJson()` duplication
