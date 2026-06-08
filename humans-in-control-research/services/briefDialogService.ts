// services/briefDialogService.ts
// Two-persona dialogue artifact (Skeptical Partner ↔ Curious Strategist) that
// pressure-tests a research finding or recommendation set. Text-first
// (sidesteps voice IP). Returns the transcript JSON + brand-styled HTML
// ready for the FreeformViewer.
//
// 2026-05-24 - Phase 6 of plans/hic-notebooklm-uplift-plan-2026-05-24.md
// See .claude/skills/brief-dialog/SKILL.md for the contract.

import { parseJSONWithRepair } from './aiOutputRepair';
import { withResilience, isThrottleError } from './multiModelResilience';

type Brand = 'nxt' | 'nu';

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
}

export interface BriefDialogInput {
    topic: string;                          // verbatim user prompt
    corpus: string;                         // chunked corpus with [CHUNK_XXX] markers
    finding_under_test?: string;            // the specific claim to pressure-test
    proxy_base?: string;
}

const SYSTEM_PROMPT = `You are simulating a 3-minute consulting pressure-test in dialogue form.

Two voices, no narration:
- SKEPTICAL PARTNER: Bain-partner archetype. Names prior failures and quotes counter-numbers. Pushes back on every claim.
- CURIOUS STRATEGIST: senior analyst. Defends the work with cited evidence from the corpus.

HARD CONSTRAINTS:
- 8-14 turns total, alternating speakers
- 600-900 words total
- Every claim must cite a [CHUNK_XXX] token from the corpus - no hand-waving
- The Skeptical Partner makes EXACTLY ONE concession somewhere in the dialogue ("is_concession": true on that turn)
- Final stance is one of: "stronger" (the finding holds), "qualified" (holds with caveats), "rejected" (does not hold)
- No greetings, no narration, no meta-commentary
- No emoji
- Voice rules: Partner uses short, blunt sentences. Strategist uses precise, evidence-led sentences.

OUTPUT - return ONLY this JSON shape:
{
  "topic": "<verbatim topic>",
  "finding_under_test": "<the claim being tested in one sentence>",
  "turns": [
    {"speaker": "Skeptical Partner", "line": "...", "citations": ["CHUNK_001"], "is_concession": false},
    {"speaker": "Curious Strategist", "line": "...", "citations": ["CHUNK_004", "CHUNK_017"]},
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
    const findingClause = input.finding_under_test
        ? `\n\nCLAIM TO PRESSURE-TEST: ${input.finding_under_test}`
        : '';

    const userMsg = `TOPIC: ${input.topic}${findingClause}\n\nCORPUS:\n${input.corpus.slice(0, 18000)}\n\nGenerate the dialogue.`;

    const { result } = await withResilience<BriefDialogTranscript>({
        primary: 'anthropic',
        fallbacks: ['gemini'],
        stage: 'brief_dialog:generate',
        is429: isThrottleError,
        invoke: async (provider) => {
            const endpoint = provider === 'anthropic' ? '/api/ai/anthropic' : '/api/ai/gemini';
            const body = provider === 'anthropic'
                ? {
                    model: 'claude-sonnet-4-6',
                    max_tokens: 4000,
                    temperature: 0.3,
                    system: SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: userMsg }],
                }
                : {
                    model: 'gemini-3.5-flash',
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
                ? (data.content?.[0]?.text ?? '')
                : (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
            return parseJSONWithRepair(text, { calling_context: 'brief_dialog:generate' });
        },
    });

    // Defensive normalization - model can drop fields under load
    const turns = Array.isArray(result.turns) ? result.turns : [];
    const totalWords = turns.reduce((sum, t) => sum + (t.line || '').split(/\s+/).filter(Boolean).length, 0);
    return {
        topic: result.topic || input.topic,
        finding_under_test: result.finding_under_test || input.finding_under_test || '',
        turns: turns.map(t => ({
            speaker: t.speaker === 'Skeptical Partner' ? 'Skeptical Partner' : 'Curious Strategist',
            line: t.line || '',
            citations: Array.isArray(t.citations) ? t.citations : [],
            is_concession: !!t.is_concession,
        })),
        final_stance: ['stronger', 'qualified', 'rejected'].includes(result.final_stance as string)
            ? result.final_stance
            : 'qualified',
        word_count: result.word_count || totalWords,
    };
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

export function renderBriefDialogHtml(input: BriefDialogRenderInput): string {
    const css = input.brand === 'nu' ? NU_STYLE : NXT_STYLE;
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
