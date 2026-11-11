/**
 * IA plan Phase 0 (2026-11-11): the owner's model seat matrix of 2026-11-10, the TypeScript half.
 *
 * The proxy half is SEAT_MATRIX in proxy/model_registry.py, served at /api/models as `seat_matrix`;
 * services/seatMatrix.test.ts pins the two together. `serving` is what the platform routes to today;
 * `primary` is the owner's target. A held seat moves only when its bake-off on the regression set
 * (scripts/eval-run.mjs --mode live, written back by applyModelMatrix) shows the primary is at least
 * as good. Nothing here changes routing by itself; artifactModelFor and DEFAULT_MODELS stay the
 * routing authority. No Grok, by the owner.
 */
import { CLAUDE_REASONING_MODEL } from './claudeModelPolicy';
import { DEFAULT_MODELS } from './aiRouter';

export type SeatId =
    | 'deep_reasoning' | 'research' | 'artifact' | 'orchestration' | 'search'
    | 'analysis' | 'fast' | 'image' | 'video' | 'verifier';

export interface Seat {
    primary: string;
    secondary: string | null;
    serving: string | null;
    status: 'seated' | 'held' | 'constraint';
    reason: string;
}

export const SEAT_MATRIX: Record<SeatId, Seat> = {
    deep_reasoning: { primary: 'claude-fable-5-2', secondary: 'gpt-6-astra', serving: CLAUDE_REASONING_MODEL, status: 'held', reason: 'bake-off on the regression set before Fable 5.2 takes reasoning work from Opus 5.5' },
    research: { primary: 'gemini-4-carbon', secondary: 'claude-opus-5-5', serving: DEFAULT_MODELS.research, status: 'held', reason: 'bake-off on the regression set; research has run on Opus 5.5 since the 2026-10-01 owner decision' },
    artifact: { primary: 'claude-opus-5-5', secondary: 'claude-sonnet-5-5', serving: CLAUDE_REASONING_MODEL, status: 'seated', reason: '' },
    orchestration: { primary: 'claude-opus-5-5', secondary: 'gemini-4-carbon', serving: CLAUDE_REASONING_MODEL, status: 'seated', reason: '' },
    search: { primary: 'gemini-4-argon', secondary: null, serving: 'gemini-3.5-flash', status: 'held', reason: 'search grounding not yet exercised on gemini-4-argon; the probe covered plain generation only' },
    analysis: { primary: 'claude-sonnet-5-5', secondary: 'gpt-6.1-terra', serving: 'gemini-3.5-flash', status: 'held', reason: 'the 2026-10-01 theme-breadth bake-off scored gemini-3.5-flash 0.957 against Sonnet 5.5 at 0.861; re-run before moving' },
    fast: { primary: 'gpt-6-luna', secondary: 'claude-haiku-5-5', serving: DEFAULT_MODELS.fast_generation, status: 'held', reason: 'bake-off on chat latency and quality before plain chat leaves gemini-3.5-flash' },
    image: { primary: 'gpt-image-2.6-flare', secondary: 'gemini-nano-banana-2.1', serving: DEFAULT_MODELS.image, status: 'held', reason: 'owner-approved; the proxy image routes speak the Gemini image API only, so the OpenAI image path lands with the Media Producer' },
    video: { primary: 'gemini-omni-1.2-flash', secondary: null, serving: 'gemini-omni-1.2-flash', status: 'seated', reason: 'OpenAI Sora is shut down (2026-09-24); Gemini Omni generated a verified 3 s clip on 2026-11-11' },
    verifier: { primary: 'a different vendor from the author', secondary: 'a second vendor, pooled', serving: null, status: 'constraint', reason: 'a rule on authorship, not a model id' },
};

/** The Phase 0 exit gate: every seat is seated on a probed model or held with a stated reason. */
export function seatsWithoutReason(): SeatId[] {
    return (Object.keys(SEAT_MATRIX) as SeatId[]).filter((id) => {
        const s = SEAT_MATRIX[id];
        if (s.status === 'seated') return s.primary !== s.serving;
        return !s.reason.trim();
    });
}
