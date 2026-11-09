// services/briefDialogService.ts
// Two-persona dialogue artifact (Skeptical Partner ↔ Curious Strategist) that
// pressure-tests a research finding or recommendation set. Text-first
// (sidesteps voice IP). Returns the transcript JSON + brand-styled HTML
// ready for the FreeformViewer.
//
// 2026-05-24 - Phase 6 of plans/hic-notebooklm-uplift-plan-2026-05-24.md
// See .claude/skills/brief-dialog/SKILL.md for the contract.

import { parseJSONWithRepair } from './aiOutputRepair';
import { withResilience, isProviderUnavailableError } from './multiModelResilience';
import { CLAUDE_REASONING_MODEL } from './claudeModelPolicy';
import { getBrand, normalizeBrandId, type BrandId } from '../components/slideTemplates/brands';

type Brand = BrandId;

export interface BriefDialogTurn {
    speaker: 'Skeptical Partner' | 'Curious Strategist';
    line: string;
    citations?: string[];        // [CHUNK_XXX] tokens
    is_concession?: boolean;     // true on the Partner's mandatory single concession
}

export interface BriefDialogTranscript {
    topic: string;
    finding_under_test: string;
    turns: BriefDialogTurn[];
    final_stance: 'stronger' | 'qualified' | 'rejected';
    word_count: number;
    /** 2026-11-08 verification record: how many turns the deterministic gate removed and why
     *  (for the chat receipt; never rendered inside the artifact body). */
    verification?: { removed: number; reasons: string[]; reasked: boolean };
}

// ---------------------------------------------------------------------------------------------
// DETERMINISTIC TURN VERIFICATION (2026-11-08, live hallucination: an audio overview asserted a
// 2018 student-AI statistic against an October-2026-windowed objective, and nothing checked it:
// the dialogue path had no gate at all, unlike the HTML chain's claim ledger).
// A turn's citation is VALID only when its token literally appears in the corpus text. A turn
// carrying a figure (a year, a percentage, a count, a dollar amount) must have at least one valid
// citation AND that figure must appear within the cited passage's neighborhood of the corpus.
// Self-verification is not gate-passing: this check reads the corpus, not the model's opinion.
// ---------------------------------------------------------------------------------------------

const FIGURE_RE = /\b(?:(?:19|20)\d{2}|\d+(?:\.\d+)?\s*(?:%|percent)|\$\s?\d[\d,.]*)\b/g;
const CITE_NEIGHBORHOOD = 1600;

export interface TurnViolation { index: number; line: string; reason: string }

export function verifyDialogTurns(turns: BriefDialogTurn[], corpus: string): TurnViolation[] {
    const violations: TurnViolation[] = [];
    const body = String(corpus || '');
    turns.forEach((t, i) => {
        const line = String(t.line || '');
        const tokens = (t.citations || []).map(c => String(c || '').trim().replace(/^\[+|\]+$/g, '')).filter(Boolean);
        const validTokens = tokens.filter(tok => tok.length >= 4 && body.includes(tok));
        const invented = tokens.filter(tok => !validTokens.includes(tok));
        if (invented.length) {
            violations.push({ index: i, line: line.slice(0, 140), reason: `citation token(s) not present in the corpus: ${invented.slice(0, 2).join(', ')}` });
            return;
        }
        const figures = Array.from(new Set((line.match(FIGURE_RE) || []).map(f => f.trim())));
        if (!figures.length) return;
        if (!validTokens.length) {
            violations.push({ index: i, line: line.slice(0, 140), reason: `carries figure(s) ${figures.slice(0, 3).join(', ')} with no corpus citation` });
            return;
        }
        // Every figure must appear near at least one cited passage.
        const windows = validTokens.map(tok => {
            const at = body.indexOf(tok);
            return body.slice(Math.max(0, at - CITE_NEIGHBORHOOD), at + CITE_NEIGHBORHOOD);
        });
        const unsupported = figures.filter(f => {
            const needle = f.replace(/\s+/g, '');
            return !windows.some(w => w.replace(/\s+/g, '').includes(needle));
        });
        if (unsupported.length) {
            violations.push({ index: i, line: line.slice(0, 140), reason: `figure(s) ${unsupported.slice(0, 3).join(', ')} absent from the cited passage(s)` });
        }
    });
    return violations;
}

export interface BriefDialogInput {
    topic: string;                          // verbatim user prompt
    corpus: string;                         // chunked corpus with [CHUNK_XXX] markers
    finding_under_test?: string;            // the specific claim to pressure-test
    proxy_base?: string;
    /** 2026-11-09 (NotebookLM S1 parity): dialogue format. Default 'deep-dive'. */
    format?: BriefDialogFormat;
}

export type BriefDialogFormat = 'deep-dive' | 'brief' | 'critique' | 'debate';

/** Pull a leading format word off a user topic ("debate the connector bet" -> format debate). */
export function parseDialogFormat(topic: string): { format: BriefDialogFormat; topic: string } {
    const m = String(topic || '').match(/^\s*(?:as a |format[:\s]+)?(deep-?dive|brief|critique|debate)\b[:,.\-]?\s+/i);
    if (!m) return { format: 'deep-dive', topic: String(topic || '').trim() };
    const w = m[1].toLowerCase();
    const format = (w.startsWith('deep') ? 'deep-dive' : w) as BriefDialogFormat;
    return { format, topic: String(topic).slice(m[0].length).trim() || String(topic).trim() };
}

/** Per-format steering appended to the system prompt. 'deep-dive' keeps the original contract. */
const FORMAT_BLOCKS: Record<BriefDialogFormat, string> = {
    'deep-dive': '',
    'brief': `
FORMAT: BRIEF. 6-8 turns, 300-450 words total. The Curious Strategist opens with the single
strongest finding and covers at most three findings; the Skeptical Partner probes each once.
No digressions: every turn either states a finding or tests one.`,
    'critique': `
FORMAT: CRITIQUE. The Skeptical Partner leads and sets the agenda: the dialogue walks the
WEAKNESSES of the evidence itself - single-origin claims repeated across outlets, hedged or
anecdotal sources, missing populations, stale dates. The Strategist defends only where the
corpus genuinely supports a defense and names the weakness plainly where it does not.`,
    'debate': `
FORMAT: DEBATE. Two positions argued as equals: the Curious Strategist argues FOR the finding;
the Skeptical Partner argues a NAMED alternative interpretation of the same evidence (not mere
doubt - a rival reading). The one-concession rule is LIFTED for this format: neither side
concedes unless the evidence forces it, and final_stance reflects which argument carried.`,
};

const SYSTEM_PROMPT = `You are simulating a 3-minute consulting pressure-test in dialogue form.

Two voices, no narration:
- SKEPTICAL PARTNER: Bain-partner archetype. Names prior failures and quotes counter-numbers. Pushes back on every claim.
- CURIOUS STRATEGIST: senior analyst. Defends the work with cited evidence from the corpus.

HARD CONSTRAINTS:
- 8-14 turns total, alternating speakers
- 600-900 words total
- CITATIONS (2026-11-08, binding; the runtime verifies every one deterministically): a citation is an
  EXACT bracketed token COPIED from the CORPUS text, character for character. The corpus marks its
  passages with tokens like [articles/<source>/<hash>.md#c2] or [CHUNK_012]; whatever token style the
  corpus actually carries is the only valid style. NEVER invent a token. A claim with no matching
  corpus token is written WITHOUT the statistic: state the qualitative pattern instead.
- NUMBERS, YEARS AND DATED FACTS exist ONLY where the cited corpus passage carries them. If the
  corpus does not state a figure, neither does the dialogue. Honor any time window the TOPIC states
  (e.g. "no earlier than October 2026"): a fact outside that window is used only when the corpus
  passage carries it AND the line names its date.
- EMPTY OR THIN CORPUS: when the corpus block is absent or carries no citation tokens, the dialogue
  is purely qualitative - zero statistics, zero named studies, zero years - and every citations[]
  array is empty. Argue the topic's logic, not invented evidence.
- The Skeptical Partner makes EXACTLY ONE concession somewhere in the dialogue ("is_concession": true on that turn)
- Final stance is one of: "stronger" (the finding holds), "qualified" (holds with caveats), "rejected" (does not hold)
- No greetings, no narration, no meta-commentary
- No emoji
- Voice rules: Partner uses short, blunt sentences. Strategist uses precise, evidence-led sentences.

OUTPUT - return ONLY this JSON shape (citations carry the corpus's own tokens, shown here as examples):
{
  "topic": "<verbatim topic>",
  "finding_under_test": "<the claim being tested in one sentence>",
  "turns": [
    {"speaker": "Skeptical Partner", "line": "...", "citations": ["articles/pew-internet/ab12cd34ef.md#c3"], "is_concession": false},
    {"speaker": "Curious Strategist", "line": "...", "citations": ["CHUNK_004"]},
    ...
  ],
  "final_stance": "qualified",
  "word_count": <integer>
}`;

function escapeHtml(s: string): string {
    return (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function inlineCitations(line: string): string {
    // Convert [CHUNK_XXX] tokens into citation chips.
    return escapeHtml(line).replace(/\[CHUNK_([A-Z0-9_]+)\]/g, (_, id) =>
        `<span class="bd-cite">CHUNK ${escapeHtml(id)}</span>`
    );
}

export async function generateBriefDialog(input: BriefDialogInput): Promise<BriefDialogTranscript> {
    const proxyBase = input.proxy_base ?? 'http://localhost:5012';
    const systemPrompt = SYSTEM_PROMPT + (FORMAT_BLOCKS[input.format || 'deep-dive'] || '');
    const findingClause = input.finding_under_test
        ? `\n\nCLAIM TO PRESSURE-TEST: ${input.finding_under_test}`
        : '';

    const corpusSlice = input.corpus.slice(0, 18000);
    const userMsg = `TOPIC: ${input.topic}${findingClause}\n\nCORPUS:\n${corpusSlice}\n\nGenerate the dialogue.`;

    const { result } = await withResilience<BriefDialogTranscript>({
        primary: 'anthropic',
        fallbacks: ['gemini'],
        stage: 'brief_dialog:generate',
        // 2026-11-03 (live #audio-overview failure): an UNREPAIRABLE reply from one provider now
        // falls back too, not only outages. The anthropic leg returned 200 with JSON the repair
        // ladder could not rescue and the run died with no fallback, although Gemini with
        // responseMimeType json completes this schema reliably.
        is429: (e: any) => isProviderUnavailableError(e) || /unrepairable|no rung succeeded/i.test(String(e?.message || '')),
        invoke: async (provider) => {
            const endpoint = provider === 'anthropic' ? '/api/ai/anthropic' : '/api/ai/gemini';
            const body = provider === 'anthropic'
                ? {
                    model: CLAUDE_REASONING_MODEL,   // 2026-10-05: reasoning deliverable -> Opus 5.5
                    // 32K headroom: adaptive thinking spends from the same budget, and a length
                    // stop mid-JSON is exactly the unrepairable shape that killed the live run.
                    max_tokens: 32000,
                    // no temperature: every Claude 4.6+/5.x model 400s on a non-default value
                    // (the proxy strips it, but the service should not send it at all).
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userMsg }],
                }
                : {
                    model: 'gemini-3.1-pro-preview',   // reasoning fallback (flash is for speed)
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: userMsg }] }],
                    config: { temperature: 0.3, responseMimeType: 'application/json' },
                };
            const resp = await fetch(`${proxyBase}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!resp.ok) {
                throw new Error(`${provider} HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
            }
            const data = await resp.json();
            const text = provider === 'anthropic'
                ? ((data.content || []).filter((c: any) => c?.type === 'text').map((c: any) => c.text || '').join(''))   // 2026-10-05: content[0] is the thinking block under adaptive thinking
                // Gemini 3.1 Pro emits thought parts; parts[0] may be a thought, so join every
                // NON-thought text part instead of reading the first part blind.
                : ((data.candidates?.[0]?.content?.parts || []).filter((p: any) => !p?.thought).map((p: any) => p?.text || '').join(''));
            return parseJSONWithRepair(text, { calling_context: 'brief_dialog:generate' });
        },
    });

    // Defensive normalization - model can drop fields under load
    const normalize = (r: BriefDialogTranscript): BriefDialogTranscript => {
        const turns = Array.isArray(r.turns) ? r.turns : [];
        const totalWords = turns.reduce((sum, t) => sum + (t.line || '').split(/\s+/).filter(Boolean).length, 0);
        return {
            topic: r.topic || input.topic,
            finding_under_test: r.finding_under_test || input.finding_under_test || '',
            turns: turns.map(t => ({
                speaker: t.speaker === 'Skeptical Partner' ? 'Skeptical Partner' : 'Curious Strategist',
                line: t.line || '',
                citations: Array.isArray(t.citations) ? t.citations : [],
                is_concession: !!t.is_concession,
            })),
            final_stance: ['stronger', 'qualified', 'rejected'].includes(r.final_stance as string)
                ? r.final_stance
                : 'qualified',
            word_count: r.word_count || totalWords,
        };
    };

    let transcript = normalize(result);

    // 2026-11-08 - the deterministic gate. Verify every turn against the corpus; on violations,
    // ONE anchored re-ask (the house pattern: prior answer verbatim plus the named violations);
    // turns still failing after that are DROPPED, never voiced, and the removal is reported in
    // the chat receipt (never inside the artifact body).
    let violations = verifyDialogTurns(transcript.turns, corpusSlice);
    let reasked = false;
    if (violations.length) {
        reasked = true;
        try {
            const reaskMsg = `${userMsg}\n\nYOUR PRIOR DIALOGUE (verbatim JSON):\n${JSON.stringify({ ...transcript, verification: undefined })}\n\nTHE RUNTIME VERIFIED EVERY LINE AGAINST THE CORPUS AND THESE FAILED:\n${violations.map(v => `- turn ${v.index + 1}: ${v.reason} :: "${v.line}"`).join('\n')}\n\nRewrite the dialogue correcting ONLY the failing lines: keep every passing line verbatim. A failing figure either gains the exact corpus token whose passage carries that figure, or the line is rewritten qualitatively WITHOUT the figure. Same JSON shape, nothing else.`;
            const { result: second } = await withResilience<BriefDialogTranscript>({
                primary: 'anthropic',
                fallbacks: ['gemini'],
                stage: 'brief_dialog:verify-reask',
                is429: (e: any) => isProviderUnavailableError(e) || /unrepairable|no rung succeeded/i.test(String(e?.message || '')),
                invoke: async (provider) => {
                    const endpoint = provider === 'anthropic' ? '/api/ai/anthropic' : '/api/ai/gemini';
                    const body = provider === 'anthropic'
                        ? { model: CLAUDE_REASONING_MODEL, max_tokens: 32000, system: systemPrompt, messages: [{ role: 'user', content: reaskMsg }] }
                        : { model: 'gemini-3.1-pro-preview', systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: 'user', parts: [{ text: reaskMsg }] }], config: { temperature: 0.3, responseMimeType: 'application/json' } };
                    const resp = await fetch(`${proxyBase}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                    if (!resp.ok) throw new Error(`${provider} HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
                    const data = await resp.json();
                    const text = provider === 'anthropic'
                        ? ((data.content || []).filter((c: any) => c?.type === 'text').map((c: any) => c.text || '').join(''))
                        : ((data.candidates?.[0]?.content?.parts || []).filter((p: any) => !p?.thought).map((p: any) => p?.text || '').join(''));
                    return parseJSONWithRepair(text, { calling_context: 'brief_dialog:verify-reask' });
                },
            });
            transcript = normalize(second);
            violations = verifyDialogTurns(transcript.turns, corpusSlice);
        } catch (e: any) {
            console.warn('[brief-dialog] verification re-ask failed; falling back to dropping the violating turns:', e?.message || e);
        }
    }

    const reasons: string[] = [];
    if (violations.length) {
        const bad = new Set(violations.map(v => v.index));
        for (const v of violations) reasons.push(v.reason);
        transcript.turns = transcript.turns.filter((_, i) => !bad.has(i));
        console.warn(`[brief-dialog] dropped ${bad.size} turn(s) that failed corpus verification: ${reasons.slice(0, 3).join(' | ')}`);
    }
    transcript.verification = { removed: violations.length, reasons: reasons.slice(0, 5), reasked };
    return transcript;
}

// ─── HTML renderer ────────────────────────────────────────────────────────────

interface BriefDialogRenderInput {
    transcript: BriefDialogTranscript;
    brand: Brand;
    runId?: string;
}

const NXT_STYLE = `
  html, body { width: 1920px; height: 1080px; background: #0D0D0D; color: #E8E8E8; }
  body { font-family: 'Archivo', sans-serif; }
  .bd-frame { width: 1920px; min-height: 1080px; padding: 60px 80px; }
  .bd-kicker { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .bd-title { font-family: 'Bebas Neue', sans-serif; font-size: 42px; line-height: 1; color: #FFFFFF; margin-bottom: 6px; }
  .bd-subtitle { font-size: 14px; color: #B8B800; max-width: 1400px; margin-bottom: 32px; line-height: 1.4; }
  .bd-rail { width: 56px; height: 4px; background: #B8B800; margin: 0 0 28px 0; }
  .bd-turns { columns: 2; column-gap: 60px; column-rule: 1px solid #222; }
  .bd-turn { break-inside: avoid; margin-bottom: 18px; padding: 10px 14px 12px 14px; border-left: 3px solid transparent; }
  .bd-turn.partner { border-left-color: #CC6644; }
  .bd-turn.strategist { border-left-color: #00B7C3; }
  .bd-turn.concession { background: rgba(184, 184, 0, 0.06); border-left-color: #B8B800; }
  .bd-speaker { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
  .bd-turn.partner .bd-speaker { color: #CC6644; }
  .bd-turn.strategist .bd-speaker { color: #00B7C3; }
  .bd-turn.concession .bd-speaker::after { content: ' · concession'; color: #B8B800; }
  .bd-line { font-size: 14px; line-height: 1.55; color: #E8E8E8; }
  .bd-cite { display: inline-block; padding: 1px 6px; margin: 0 2px; background: rgba(0, 183, 195, 0.16); color: #00B7C3; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.5px; border-radius: 1px; }
  .bd-footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #222; display: flex; justify-content: space-between; align-items: baseline; }
  .bd-stance-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #888; }
  .bd-stance { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 0.02em; }
  .bd-stance.stronger { color: #0CCE6B; }
  .bd-stance.qualified { color: #B8B800; }
  .bd-stance.rejected { color: #FF5A5A; }
  .bd-meta { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #666; letter-spacing: 1px; text-align: right; }
  .bd-meta span { color: #B8B800; }
`;

const NU_STYLE = `
  html, body { width: 1920px; height: 1080px; background: #FFFFFF; color: #1A1A1A; }
  body { font-family: 'Open Sans', sans-serif; }
  .bd-frame { width: 1920px; min-height: 1080px; padding: 60px 80px; }
  .bd-kicker { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .bd-title { font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 42px; line-height: 1; color: #0D0D0D; margin-bottom: 6px; }
  .bd-subtitle { font-size: 14px; color: #C8102E; max-width: 1400px; margin-bottom: 32px; line-height: 1.4; }
  .bd-rail { width: 56px; height: 4px; background: #C8102E; margin: 0 0 28px 0; }
  .bd-turns { columns: 2; column-gap: 60px; column-rule: 1px solid #E8E8E8; }
  .bd-turn { break-inside: avoid; margin-bottom: 18px; padding: 10px 14px 12px 14px; border-left: 3px solid transparent; }
  .bd-turn.partner { border-left-color: #C8102E; }
  .bd-turn.strategist { border-left-color: #0091B6; }
  .bd-turn.concession { background: rgba(200, 16, 46, 0.04); border-left-color: #C8102E; }
  .bd-speaker { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
  .bd-turn.partner .bd-speaker { color: #C8102E; }
  .bd-turn.strategist .bd-speaker { color: #0091B6; }
  .bd-turn.concession .bd-speaker::after { content: ' · concession'; color: #C8102E; }
  .bd-line { font-size: 14px; line-height: 1.55; color: #1A1A1A; }
  .bd-cite { display: inline-block; padding: 1px 6px; margin: 0 2px; background: rgba(0, 145, 182, 0.12); color: #0091B6; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.5px; border-radius: 1px; }
  .bd-footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #E8E8E8; display: flex; justify-content: space-between; align-items: baseline; }
  .bd-stance-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #666; }
  .bd-stance { font-family: 'Roboto Condensed', sans-serif; font-weight: 700; font-size: 24px; letter-spacing: 0.02em; }
  .bd-stance.stronger { color: #0CCE6B; }
  .bd-stance.qualified { color: #C8102E; }
  .bd-stance.rejected { color: #FF5A5A; }
  .bd-meta { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #888; letter-spacing: 1px; text-align: right; }
  .bd-meta span { color: #C8102E; }
`;

// 2026-10-01 - DECIEM (The Abnormal Beauty Company): white canvas, black ink, Poppins Bold
// uppercase title, Josefin Sans body, pink / cyan / purple pops. Built from the token mirror at
// call time so the hydrated /api/design-tokens?brand=DECIEM values win over build defaults.
function deciemStyle(): string {
    const b = getBrand('deciem');
    const hx = (v: string) => '#' + String(v || '000000').replace(/^#/, '');
    const ink = hx(b.INK), paper = hx(b.WHITE), accent = hx(b.CHARTREUSE), purple = hx(b.ACCENT_COOL);
    const warn = hx(b.ACCENT_WARN), hair = hx(b.HAIRLINE), grey = hx(b.GREY), body = hx(b.BODY), wash = hx(b.CHARTREUSE_PALE);
    // Font roles (template audit): Poppins Bold uppercase = every title, subtitle and label; Josefin Sans = body;
    // FONT_MONO (Nunito) = tables, data, meta and source lines. FONT_LABEL falls back to the display face.
    const labelFace = String((b as Record<string, unknown>).FONT_LABEL || b.FONT_DISPLAY);
    const display = `'${b.FONT_DISPLAY}', sans-serif`, bodyFont = `'${b.FONT_BODY}', sans-serif`, mono = `'${b.FONT_MONO}', sans-serif`;
    const label = `'${labelFace}', sans-serif`;
    const transform = b.TITLE_TRANSFORM || 'none';
    return `
  html, body { width: 1920px; height: 1080px; background: ${paper}; color: ${body}; }
  body { font-family: ${bodyFont}; }
  .bd-frame { width: 1920px; min-height: 1080px; padding: 60px 80px; }
  .bd-kicker { font-family: ${label}; font-weight: 700; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: ${grey}; margin-bottom: 8px; }
  .bd-title { font-family: ${display}; font-weight: ${b.TITLE_WEIGHT}; text-transform: ${transform}; font-size: 42px; line-height: 1; color: ${ink}; margin-bottom: 6px; }
  .bd-subtitle { font-size: 14px; color: ${ink}; max-width: 1400px; margin-bottom: 32px; line-height: 1.4; }
  .bd-rail { width: 56px; height: 4px; background: ${accent}; margin: 0 0 28px 0; }
  .bd-turns { columns: 2; column-gap: 60px; column-rule: 1px solid ${hair}; }
  .bd-turn { break-inside: avoid; margin-bottom: 18px; padding: 10px 14px 12px 14px; border-left: 3px solid transparent; }
  .bd-turn.partner { border-left-color: ${warn}; }
  .bd-turn.strategist { border-left-color: ${purple}; }
  .bd-turn.concession { background: ${wash}; border-left-color: ${accent}; }
  .bd-speaker { font-family: ${label}; font-weight: 700; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: ${grey}; margin-bottom: 4px; }
  .bd-turn.partner .bd-speaker { color: ${warn}; }
  .bd-turn.strategist .bd-speaker { color: ${purple}; }
  .bd-turn.concession .bd-speaker::after { content: ' · concession'; color: ${ink}; }
  .bd-line { font-size: 14px; line-height: 1.55; color: ${body}; }
  .bd-cite { display: inline-block; padding: 1px 6px; margin: 0 2px; background: ${hx(b.WASH_COOL)}; color: ${purple}; font-family: ${mono}; font-size: 9px; letter-spacing: 0.5px; border-radius: 1px; }
  .bd-footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid ${hair}; display: flex; justify-content: space-between; align-items: baseline; }
  .bd-stance-label { font-family: ${label}; font-weight: 700; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: ${grey}; }
  .bd-stance { font-family: ${display}; font-weight: ${b.TITLE_WEIGHT}; text-transform: ${transform}; font-size: 24px; letter-spacing: 0.02em; }
  .bd-stance.stronger { color: ${ink}; }
  .bd-stance.qualified { color: ${purple}; }
  .bd-stance.rejected { color: ${warn}; }
  .bd-meta { font-family: ${mono}; font-size: 9px; color: ${grey}; letter-spacing: 1px; text-align: right; }
  .bd-meta span { color: ${ink}; }
`;
}

export function renderBriefDialogHtml(input: BriefDialogRenderInput): string {
    const brandId = normalizeBrandId(input.brand);
    const css = brandId === 'deciem' ? deciemStyle() : brandId === 'nu' ? NU_STYLE : NXT_STYLE;
    const turnsHtml = input.transcript.turns.map(turn => {
        const cls = turn.speaker === 'Skeptical Partner' ? 'partner' : 'strategist';
        const concession = turn.is_concession ? ' concession' : '';
        return `
        <div class="bd-turn ${cls}${concession}">
          <div class="bd-speaker">${escapeHtml(turn.speaker)}</div>
          <div class="bd-line">${inlineCitations(turn.line)}</div>
        </div>`;
    }).join('');

    const stanceClass = input.transcript.final_stance;
    const findingHtml = input.transcript.finding_under_test
        ? `<div class="bd-subtitle">Pressure-testing: ${escapeHtml(input.transcript.finding_under_test)}</div>`
        : '';

    // 2026-05-25 - Run ID stamp removed (reporting-depth metadata).
    const runIdRow = '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Brief Dialog · ${escapeHtml(input.transcript.topic)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ${css}
</style>
</head>
<body>
<div class="bd-frame">
  <div class="bd-kicker">Brief Dialog · ${escapeHtml(input.brand.toUpperCase())}</div>
  <h1 class="bd-title">${escapeHtml(input.transcript.topic)}</h1>
  ${findingHtml}
  <div class="bd-rail"></div>
  <div class="bd-turns">
    ${turnsHtml}
  </div>
  <div class="bd-footer">
    <div>
      <div class="bd-stance-label">Final stance</div>
      <div class="bd-stance ${escapeHtml(stanceClass)}">${escapeHtml(input.transcript.final_stance)}</div>
    </div>
    <div class="bd-meta">
      ${runIdRow}<span>${input.transcript.turns.length}</span> turns · <span>${input.transcript.word_count}</span> words
    </div>
  </div>
</div>
</body>
</html>`;
}
