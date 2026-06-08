// councilSynthesis.ts - 2026-05-11 (HiC-Active-Loop-Improvements #2)
//
// Sanhedrin Architecture for HiC chat: fan a single user query out to THREE
// independent models in parallel, then synthesize their answers via a fourth
// pass. Replaces the "one confident monologue" failure mode with consensus
// reasoning that surfaces contradictions, confidence levels, and a single
// final answer the user can ship.
//
// When the user picks "Council" in the chat model selector, sendChatMessage
// delegates here instead of calling a single provider. The synthesizer is
// Claude Opus by default (its long-synthesis behavior is strongest); the
// three reads are Gemini 3.1 Pro, Claude Opus, and DeepSeek V4 Flash -
// distinct training lineages so disagreements are real, not stylistic.
//
// Cost: ~3× per query. We don't enable Council by default - the user must
// opt in via the chat dropdown. For high-stakes deliverables (long-form
// technical manuals, strategy decks, persona architectures) this is cheap
// insurance against a single model's blind spots.

import type { ChatModel, ChatMessage, ChatContext } from './corpusChatService';

const PROXY_BASE = 'http://127.0.0.1:5012';

// The three independent readers. Picked for distinct lineages so their
// reads don't collapse into stylistic clones of each other.
const COUNCIL_READERS: ChatModel[] = [
    'gemini-3.1-pro-preview',
    'deepseek-v4-flash',
    // 2026-05-11 - third reader is GPT-5.5 via the OpenAI path. The proxy
    // already has automatic Gemini-fallback if OpenAI returns 429/auth fail,
    // so the third slot is resilient even when OpenAI quota is exhausted.
    'gpt-5.5' as ChatModel,
];

const COUNCIL_SYNTHESIZER: ChatModel = 'gemini-3.1-pro-preview';

export interface CouncilReadResult {
    model: ChatModel;
    ok: boolean;
    text?: string;
    error?: string;
    latencyMs: number;
}

export interface CouncilOutput {
    finalText: string;
    reads: CouncilReadResult[];
    synthesisLatencyMs: number;
    confidence: 'high' | 'mixed' | 'low' | 'unknown';
}

/**
 * Run a query through the three-reader council + synthesizer. Returns the
 * synthesized final answer plus per-reader metadata for transparency.
 *
 * The `sendOne` callback is injected by the caller (sendChatMessage in
 * corpusChatService.ts) so we don't duplicate the provider dispatch logic
 * here - Council piggybacks on the same chat path each model normally uses.
 */
export async function runCouncilSynthesis(args: {
    userMessage: string;
    history: ChatMessage[];
    context: ChatContext;
    sendOne: (model: ChatModel, message: string, history: ChatMessage[]) => Promise<string>;
}): Promise<CouncilOutput> {
    const t0 = Date.now();

    // Fire the three readers concurrently. Use allSettled so one model's
    // failure (timeout, content_filter, quota) doesn't kill the council -
    // synthesis can still proceed with 2 of 3 reads if necessary.
    const reads = await Promise.allSettled(
        COUNCIL_READERS.map(async (model) => {
            const start = Date.now();
            try {
                const text = await args.sendOne(model, args.userMessage, args.history);
                return { model, ok: true as const, text, latencyMs: Date.now() - start };
            } catch (e: any) {
                return {
                    model,
                    ok: false as const,
                    error: e?.message || 'unknown error',
                    latencyMs: Date.now() - start,
                };
            }
        }),
    );

    const readResults: CouncilReadResult[] = reads.map((r, i) =>
        r.status === 'fulfilled'
            ? r.value
            : { model: COUNCIL_READERS[i], ok: false, error: 'promise rejected', latencyMs: 0 },
    );

    const successful = readResults.filter(r => r.ok && r.text && r.text.length > 30);
    if (successful.length === 0) {
        return {
            finalText: 'All three council readers failed. Errors: ' +
                readResults.map(r => `${r.model}: ${r.error}`).join('; '),
            reads: readResults,
            synthesisLatencyMs: 0,
            confidence: 'unknown',
        };
    }

    if (successful.length === 1) {
        // Only one model returned; skip synthesis, surface that model's
        // answer with a transparency note appended.
        const sole = successful[0];
        const failures = readResults.filter(r => !r.ok).map(r => r.model).join(', ');
        return {
            finalText: sole.text!,
            reads: readResults,
            synthesisLatencyMs: 0,
            confidence: 'low',
        };
    }

    // Synthesize 2-3 reads into a single answer
    const synthesisPrompt = buildSynthesisPrompt(args.userMessage, successful);
    const synthStart = Date.now();
    let finalText: string;
    try {
        finalText = await args.sendOne(
            COUNCIL_SYNTHESIZER,
            synthesisPrompt,
            [], // empty history - synthesis is a fresh single-turn call
        );
    } catch (e: any) {
        // If the synthesizer itself fails, fall back to the longest read.
        const longest = successful.reduce((a, b) =>
            (a.text!.length >= b.text!.length ? a : b),
        );
        finalText = longest.text! +
            `\n\n_(Synthesis step failed: ${e?.message || 'unknown'}. Returning the most detailed of the ${successful.length} council reads.)_`;
    }
    const synthesisLatencyMs = Date.now() - synthStart;

    // Confidence heuristic: 3 of 3 successful = high, 2 of 3 = mixed,
    // anything less = low (already handled above).
    const confidence: CouncilOutput['confidence'] =
        successful.length === 3 ? 'high' :
        successful.length === 2 ? 'mixed' :
        'low';

    return {
        finalText,
        reads: readResults,
        synthesisLatencyMs,
        confidence,
    };
}

/**
 * Build the synthesizer prompt: each successful read labeled, the original
 * user question repeated, explicit instructions to reconcile, flag
 * contradictions, and ship a single answer.
 */
function buildSynthesisPrompt(userMessage: string, reads: CouncilReadResult[]): string {
    const readBlocks = reads.map((r, i) => {
        const label = `READER ${i + 1} (${r.model})`;
        const body = (r.text || '').trim();
        return `=== ${label} ===\n${body}\n=== END READER ${i + 1} ===`;
    }).join('\n\n');

    return `You are synthesizing a council of independent AI readers for a research analyst. Three frontier models each answered the same question below. Your job is to produce the SINGLE FINAL ANSWER the analyst will use.

## Original question
${userMessage}

## The independent reads
${readBlocks}

## Synthesis instructions
1. Identify the CONSENSUS - claims, structure, citations, and recommendations that appear in 2+ reads. These are the strongest part of the final answer.
2. Identify DISAGREEMENTS - places where readers contradict each other or where one read goes substantially deeper than another. Pick the more rigorous version (more citations, more specificity, more concrete artifacts) for the final answer.
3. Identify GAPS - claims one reader makes that no other corroborated AND that you cannot independently verify from the context. Either remove these claims or downgrade them to softer language.
4. Compose a single final answer that:
   - Matches or exceeds the LENGTH and DEPTH of the longest individual read (the user asked for substantial output and got it from at least one reader - don't compress)
   - Preserves every concrete artifact (code blocks, named entities, specific numbers, citations) that appeared in any read and survived consensus
   - Reads as a single coherent voice, NOT a "Model 1 said... Model 2 said..." comparison
   - Never references the readers, the synthesis process, or that multiple models were consulted

Return ONLY the final answer. No preamble. No meta-commentary about the synthesis. The reader is an executive - they see only the deliverable.`;
}
