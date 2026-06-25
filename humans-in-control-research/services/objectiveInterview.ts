// objectiveInterview.ts - 2026-06-25 (Interview-Me-at-intake, P1)
//
// Optional adaptive intake interview that turns a vague seed ("research the new
// dashboard") into a precise Research Objective. This is Reinforcement Inference
// applied PRE-task: resolve scoping uncertainty by re-asking BEFORE generation,
// instead of charging ahead on a one-liner (HiC's #1 documented failure ->
// reddit-skewed, hollow deliverables). It is the multi-turn sibling of
// promptEnhancer's one-shot goal rewrite, and mirrors its mechanics exactly:
//   - Gemini 3.5 Flash (HiC's conversational tier; snappy, correct for intake).
//   - DELIMITER output (not JSON) so quote-heavy prose can never break parsing.
//   - Soft-fail: a failed turn never throws a scary error at the user.
// DOMAIN-NEUTRAL by mandate (the 2026-06-24 de-poisoning fix): the interviewer
// makes NO industry assumption until the user states one.

import { callAIWithRetry } from './aiRetryClient';

const INTERVIEW_MODEL = 'gemini-3.5-flash';
const MAX_QUESTIONS = 6;

export interface InterviewExchange { q: string; a: string; }

export interface InterviewTurnInput {
    /** The current Research Goal text (may be empty). */
    seed: string;
    /** Prior question/answer exchanges this session. */
    history: InterviewExchange[];
    /** Force the model to synthesize the objective now (the "Build it now" action). */
    forceSynthesize?: boolean;
}

export type InterviewTurnResult =
    | { kind: 'question'; question: string }
    | { kind: 'objective'; objective: string; rationale: string };

const QUESTION_MARK = '<<<QUESTION>>>';
const OBJECTIVE_MARK = '<<<OBJECTIVE>>>';
const RATIONALE_MARK = '<<<RATIONALE>>>';

function systemPrompt(): string {
    return `You are a sharp, senior research strategist running a SHORT scoping interview. Your job is
to turn a vague or thin research ask into ONE precise, decision-anchored Research Objective, the way a
good researcher interviews a stakeholder before writing a plan.

HOW YOU WORK:
- Look at the seed ask and everything already answered. Decide: do you have enough to write a sharp,
  specific objective? If yes, write it. If not, ask the SINGLE most valuable missing question.
- Ask ONE question at a time. Keep it short, concrete, and plain. No preamble, no numbered lists.
- Cover ONLY the dimensions still unknown (skip anything the seed or prior answers already make clear;
  NEVER re-ask): the DECISION this research will inform; the AUDIENCE / segment / market; what is
  already KNOWN or has been TRIED; what a SUCCESSFUL outcome looks like; hard CONSTRAINTS, non-starters,
  or must-includes; the TIME HORIZON; the INDUSTRY / domain.
- Be adaptive: if the user gives a rich answer, skip ahead. Aim to finish in 3-6 questions.

DOMAIN NEUTRALITY (hard): make NO assumption about industry or vertical (not higher-ed, not any
specific field) until the user states one. Mirror the user's own domain language.

WHEN READY (or once you have asked enough), write the OBJECTIVE:
- 1 to 3 sentences. Concrete and specific. It names the decision to be informed, the audience/market,
  the scope, and the time horizon where known. It reads as a research objective (what we will learn and
  why it matters), NOT a research plan or a list of methods.
- No meta-narration, no "this objective...", no preamble.

OUTPUT EXACTLY ONE of these two forms, nothing before or after, NO code fence, NO JSON:

${QUESTION_MARK}
the single next question, one line

OR

${OBJECTIVE_MARK}
the refined research objective here, plain text
${RATIONALE_MARK}
one sentence, <= 20 words, naming what the interview sharpened

The text between markers is read literally; never escape quotes or brackets.`;
}

function userPrompt(input: InterviewTurnInput): string {
    const seed = (input.seed || '').trim() || '(the user has not written an objective yet)';
    const qa = input.history.length
        ? input.history.map((e, i) => `Q${i + 1}: ${e.q}\nA${i + 1}: ${e.a || '(skipped)'}`).join('\n\n')
        : '(no questions answered yet)';
    const force = input.forceSynthesize || input.history.length >= MAX_QUESTIONS
        ? `\n\nYou have enough. Do NOT ask another question. Emit the ${OBJECTIVE_MARK} now from whatever is known.`
        : '';
    return `SEED ASK:\n${seed}\n\nINTERVIEW SO FAR:\n${qa}${force}`;
}

/** Parse the delimiter response into a question or an objective. */
export function parseInterviewResponse(text: string): InterviewTurnResult {
    let cleaned = (text || '').trim();
    if (cleaned.startsWith('```')) {
        const parts = cleaned.split('```').filter(Boolean);
        cleaned = (parts.length ? parts[parts.length - 1] : cleaned).trim();
        if (cleaned.toLowerCase().startsWith('json')) cleaned = cleaned.slice(4).trim();
    }
    const oIdx = cleaned.indexOf(OBJECTIVE_MARK);
    if (oIdx !== -1) {
        const afterObj = cleaned.slice(oIdx + OBJECTIVE_MARK.length);
        const rIdx = afterObj.indexOf(RATIONALE_MARK);
        const objective = (rIdx === -1 ? afterObj : afterObj.slice(0, rIdx)).trim();
        const rationale = rIdx === -1 ? '' : afterObj.slice(rIdx + RATIONALE_MARK.length).trim();
        if (objective) return { kind: 'objective', objective, rationale };
    }
    const qIdx = cleaned.indexOf(QUESTION_MARK);
    if (qIdx !== -1) {
        const question = cleaned.slice(qIdx + QUESTION_MARK.length).trim();
        if (question) return { kind: 'question', question };
    }
    // Fallback: a bare line with no marker is treated as the next question.
    if (cleaned) return { kind: 'question', question: cleaned.split('\n')[0].trim() };
    throw new Error('interview response was empty');
}

/**
 * Run one interview turn. Returns the next question, or the synthesized objective
 * when the model decides it has enough (or forceSynthesize / the question cap is hit).
 */
export async function interviewTurn(input: InterviewTurnInput): Promise<InterviewTurnResult> {
    const body = {
        model: INTERVIEW_MODEL,
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt(input) }] }],
        config: { temperature: 0.4, maxOutputTokens: 1024, thinkingBudget: 'low' },
    };
    const data = await callAIWithRetry('gemini', body, { label: 'Objective Interview', maxAttempts: 2 });
    const candidate = (data as any)?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const text = parts.map((p: any) => p?.text || '').join('').trim();
    if (!text) throw new Error(`interview returned empty content (finishReason=${candidate?.finishReason || 'unknown'})`);
    return parseInterviewResponse(text);
}
