/**
 * memoryAdmissions.ts - 2026-10-31 (plan agent-stack-shared-memory-skills-uplift, WS-B B3)
 *
 * Write FREQUENTLY: the transcript's missing piece was a memory that "did not update often enough to make the
 * hand-off seamless". Admission now happens at every SETTLED step, not at session end, each as typed facts
 * through the ONE memory door (/api/memory/admit), with the run id as provenance:
 *
 *   artifactShipped   the deck's (or artifact's) chosen thesis      knowledge   engagement
 *                     the open findings it shipped with             correction  engagement
 *   deckAskChoice     what the owner chose when a deck shipped      correction  engagement
 *                     with open findings
 *   planApproved      the approved research plan's objective and    goal        engagement
 *                     sub-questions
 *   epochAccepted     a promoted skill edit and what it changed     behavior    user
 *   preferenceStated  a standing deliverable-shape preference (B4)  preference  user
 *
 * Every builder is pure (and tested); `admitAt` is the only IO and never throws into the caller.
 */
import { memoryAdmit, type ProposedFact } from './memoryLifecycle';

const clean = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export interface ShippedArtifact {
    kind: string;                 // 'slides', 'personas', ...
    objective?: string;
    thesis?: string | null;
    openFindings?: string[];
}

export function artifactShippedFacts(a: ShippedArtifact): ProposedFact[] {
    const out: ProposedFact[] = [];
    const kind = clean(a.kind, 40).replace(/^#/, '') || 'artifact';
    const thesis = clean(a.thesis, 400);
    const objective = clean(a.objective, 200);
    if (thesis.length >= 40) {
        out.push({
            content: `The ${kind} ${objective ? `for "${objective}" ` : ''}argued: ${thesis}`,
            category: 'knowledge', confidence: 0.8, scope: 'engagement', durability: 'durable', authority: 'descriptive', expectedValidDays: 180,
        });
    }
    const findings = (a.openFindings || []).map(f => clean(f, 160)).filter(f => f && f !== 'unchecked').slice(0, 4);
    if (findings.length) {
        out.push({
            content: `The last ${kind} shipped with open findings to fix next time: ${findings.join('; ')}`,
            category: 'correction', confidence: 0.75, scope: 'engagement', durability: 'durable', authority: 'descriptive', expectedValidDays: 90,
        });
    }
    return out;
}

export function deckAskChoiceFacts(kind: string, choiceLabel: string, findings: string[]): ProposedFact[] {
    const choice = clean(choiceLabel, 80);
    if (!choice) return [];
    const f = (findings || []).map(x => clean(x, 120)).filter(Boolean).slice(0, 3);
    return [{
        content: `When a ${clean(kind, 30) || 'deck'} shipped with open findings${f.length ? ` (${f.join('; ')})` : ''}, the owner chose: ${choice}`,
        category: 'correction', confidence: 0.85, scope: 'engagement', durability: 'durable', authority: 'descriptive', expectedValidDays: 180,
    }];
}

export function planApprovedFacts(objective: string, subQuestions: string[]): ProposedFact[] {
    const obj = clean(objective, 300);
    if (obj.length < 20) return [];
    const sq = (subQuestions || []).map(q => clean(q, 140)).filter(Boolean).slice(0, 6);
    return [{
        content: `Approved research plan. Objective: ${obj}${sq.length ? `. Sub-questions: ${sq.join('; ')}` : ''}`,
        category: 'goal', confidence: 0.9, scope: 'engagement', durability: 'durable', authority: 'descriptive', expectedValidDays: 365,
    }];
}

export function epochAcceptedFacts(e: { epochId?: string | number; skill?: string; kind?: string; summary?: string }): ProposedFact[] {
    const summary = clean(e.summary, 300);
    const skill = clean(e.skill, 60);
    if (!summary && !skill) return [];
    return [{
        content: `Self-improvement epoch ${e.epochId ?? ''} accepted${skill ? ` for ${skill}` : ''}${e.kind ? ` (${clean(e.kind, 40)})` : ''}${summary ? `: ${summary}` : ''}`.replace(/\s+/g, ' '),
        category: 'behavior', confidence: 0.85, scope: 'user', durability: 'durable', authority: 'descriptive', expectedValidDays: 365,
    }];
}

/**
 * B4: a standing deliverable-shape preference the user states ("always put the data appendix at the end",
 * "keep decks to ten slides", "NU brand for this client"). Detected deterministically from the user's own words,
 * never from a model's guess about what they prefer.
 */
const PREFERENCE_RE = /\b(?:always|from now on|going forward,?|in future|every time|by default|i (?:always )?(?:prefer|want|like)|we (?:always|normally|usually) (?:organi[sz]e|put|start|end|use|keep))\b[^.!?\n]{8,220}/i;
const SHAPE_WORDS = /\b(deck|slides?|section|appendix|order|structure|layout|chart|table|brand|#?nxt|#?nu|#?deciem|title|font|density|length|summary|executive|data|cover|agenda|template|format|page|bullet|tone|voice)\b/i;

export function detectStatedPreference(userMessage: string): string | null {
    const m = PREFERENCE_RE.exec(String(userMessage || ''));
    if (!m) return null;
    const sentence = clean(m[0], 220);
    return SHAPE_WORDS.test(sentence) ? sentence : null;
}

export function preferenceFacts(sentence: string, deliverable?: string): ProposedFact[] {
    const s = clean(sentence, 220);
    if (s.length < 15) return [];
    return [{
        content: `Standing preference${deliverable ? ` for ${clean(deliverable, 30)}` : ''}: ${s}`,
        category: 'preference', confidence: 0.9, scope: 'user', durability: 'durable', authority: 'descriptive', expectedValidDays: 365,
    }];
}

export interface StandingPreference { id: string; content: string; }

/**
 * The work a standing preference limits itself to, in the user's own words. "for this engagement / client / project"
 * holds only in the engagement where it was stated; "for the executive search work" or "for Northeastern clients"
 * holds where the current objective (or engagement slug) names that work. A preference with no such clause holds
 * everywhere. Live 2026-10-31: "always put the methodology appendix at the end of every deck for the executive search
 * work" was applied to a Northeastern co-op deck, because selection looked at the deliverable kind only.
 */
const THIS_WORK_RE = /\b(?:for|on|in) (?:this|the current) (?:engagement|client|project|account|program|work)\b/i;
const NAMED_WORK_RE = /\bfor (?:the |our |all |any )?([A-Za-z][\w&'-]*(?:\s+[A-Za-z][\w&'-]*){0,3}?)\s+(?:work|engagements?|clients?|projects?|accounts?)\b/i;
const CONDITION_STOP = new Set(['the', 'our', 'all', 'any', 'of', 'a', 'an', 'my', 'this', 'that', 'client', 'clients', 'customer', 'consulting']);
// "for every claim in client work" is a rule about claims, not a named body of work
const NOT_A_NAME = /\b(?:every|each|in|on|at|to|with|by|from|about)\b/i;

export function preferenceAppliesTo(
    content: string,
    where: { objective?: string; engagement?: string; factEngagement?: string | null },
): boolean {
    const text = String(content || '').replace(/^Standing preference(?: for [^:]+)?:\s*/, '');
    const here = String(where.engagement || '');
    if (THIS_WORK_RE.test(text)) return !!here && here === String(where.factEngagement || '');
    const m = NAMED_WORK_RE.exec(text);
    if (!m || NOT_A_NAME.test(m[1])) return true;
    const alts = m[1].split(/\s*(?:,|&|\band\b|\bor\b)\s*/i)
        .map(alt => alt.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !CONDITION_STOP.has(w)))
        .filter(terms => terms.length);
    if (!alts.length) return true;                                            // "for client work" names no particular work
    if (here && here === String(where.factEngagement || '')) return true;   // stated in this very engagement
    const hay = `${where.objective || ''} ${here.replace(/[-_]+/g, ' ')}`.toLowerCase();
    return alts.some(terms => terms.every(t => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(hay)));
}

/**
 * B4: the owner's standing preferences for this deliverable kind, injected AHEAD of generation. Relevance recall
 * cannot find them (a preference about appendix order shares no terms with a deck's objective, and "deck" and
 * "slides" are stop words), so they are selected by kind: every user-scoped preference fact stated through
 * `preferenceFacts`, minus those scoped to a different deliverable and those whose own words limit them to other
 * work (`preferenceAppliesTo`).
 */
export async function loadStandingPreferences(
    kind: string | null | undefined,
    fetchImpl: typeof fetch = globalThis.fetch,
    where: { objective?: string; engagement?: string } = {},
): Promise<StandingPreference[]> {
    try {
        const { proxyBase } = await import('./proxyConfig');
        const r = await fetchImpl(`${proxyBase()}/api/memory/facts?category=preference`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) return [];
        const d = await r.json();
        const k = String(kind || '').replace(/^#/, '').toLowerCase();
        return (Array.isArray(d?.facts) ? d.facts : [])
            .filter((f: any) => f?.scope === 'user' && /^Standing preference/.test(String(f?.content || '')))
            .filter((f: any) => {
                const m = /^Standing preference for ([^:]+):/.exec(String(f.content));
                return !m || !k || m[1].trim().toLowerCase().replace(/^#/, '') === k;
            })
            .filter((f: any) => preferenceAppliesTo(String(f.content), { ...where, factEngagement: f.engagement }))
            .slice(0, 8)
            .map((f: any) => ({ id: String(f.id), content: String(f.content).replace(/^Standing preference(?: for [^:]+)?:\s*/, '') }));
    } catch {
        return [];
    }
}

/** Admit facts at a settled step. Fire-and-forget: returns the ids admitted (empty on any failure). */
export async function admitAt(step: string, facts: ProposedFact[], runId: string, engagement = '', fetchImpl: typeof fetch = globalThis.fetch): Promise<string[]> {
    if (!facts.length || !runId) return [];
    try {
        const res = await memoryAdmit(facts, runId, { engagement, surface: 'spa' }, fetchImpl);
        if (res.ok && res.report?.admitted) console.info(`[memory] ${step}: ${res.report.admitted} fact(s) admitted`);
        else if (res.report?.refusals?.length) console.info(`[memory] ${step}: refused (${res.report.refusals[0]})`);
        return res.admitted_ids || [];
    } catch {
        return [];
    }
}
