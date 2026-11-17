/**
 * Dynamic Prompt Suggestions - the Consulting Partner guidance layer.
 *
 * Turns the chat input from a blank box into a guided research surface.
 * Suggested questions (rendered as clickable chips above the input) are
 * state-aware:
 *
 *   PRE-COLLECTION   - research goal + uploaded document names/content
 *   MID-COLLECTION   - live source feed + goal ("the PDFs are in, two
 *                      connectors returned, what should you ask?")
 *   POST-COLLECTION  - knowledge graph (themes, personas, barriers) + goal
 *                      ("you have 23 themes and 6 personas, here are the
 *                      highest-leverage follow-ups")
 *
 * Each suggestion carries a `kind` tag so the UI can render icons and the
 * client can debug what guidance pattern fired.
 *
 * Non-blocking: Gemini call failures return deterministic fallback chips
 * built from the current state so the chat UI never loses guidance.
 */

import { extractResearchObjective } from './wikiService';

export type SuggestionKind =
    | 'document-drill'      // Pull something specific out of an uploaded doc
    | 'source-coverage'     // Ask about what a named source is saying
    | 'theme-exploration'   // Drill into an emerged theme
    | 'persona-perspective' // Frame a question from a persona's POV
    | 'comparison'          // Compare two entities (institutions / vendors / programs)
    | 'synthesis'           // Cross-cutting "so what" question
    | 'slide-request'       // Generate a specific slide from current data
    | 'evidence-probe'      // Test whether evidence exists for a hypothesis
    | 'report-format';      // Propose a report FORMAT the corpus shape actually supports

export interface PromptSuggestion {
    text: string;
    kind: SuggestionKind;
    rationale?: string;     // optional tooltip on the chip
}

export type CollectionPhase = 'setup' | 'pre-collection' | 'mid-collection' | 'post-collection';

export interface SuggestionState {
    researchGoal: string;
    /** Files the user uploaded - name + optional parsed text */
    uploadedFiles?: Array<{ name: string; parsedText?: string }>;
    /** Live source feed - each entry is a connector result with {source, items[], status} */
    liveSourceResults?: Array<{ source?: string; items?: Array<{ title?: string; sourceName?: string }>; status?: string }>;
    /** Knowledge graph - set once themes/personas/etc. have been generated */
    knowledgeGraph?: { nodes?: any[]; edges?: any[] };
    /** Hint from caller: override the phase detection if needed */
    phaseOverride?: CollectionPhase;
    /** 2026-11-09 (NotebookLM parity C4): the assistant's LATEST chat answer, so at least
     *  two chips become follow-up questions to what the researcher just read, not only
     *  corpus-level openers. Caller passes plain text (fences stripped). */
    lastAnswer?: string;
}

// --- DESCRIPTIVE LABELS ---
// Uploaded files often have opaque names - especially YouTube transcripts which
// are saved as `transcript_{uuid}.txt` or `{uuid}_transcript.txt`. The chips
// and Gemini prompt need a HUMAN-READABLE label or they'll produce useless
// questions like "Summarize the key findings from transcript_446863f9..."
//
// Strategy: peek at the file's parsed text for metadata headers (our Whisper
// transcriber writes `YouTube Video:`, `Title:`, `Channel:` at the top) and
// fall back to the raw filename only when no header is present.

const UUID_FILENAME_RX = /(transcript[_-])?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}([_-]transcript)?/i;

function describeUploadedFile(f: { name: string; parsedText?: string }): string {
    const body = (f.parsedText || '').slice(0, 800);
    // Match our transcriber's header block: looks for `Title:` and `Channel:`
    // on separate lines within the first ~800 chars.
    const titleMatch = body.match(/^\s*Title:\s*(.+?)\s*$/m);
    const channelMatch = body.match(/^\s*Channel:\s*(.+?)\s*$/m);
    if (titleMatch) {
        const title = titleMatch[1].trim().slice(0, 80);
        const channel = channelMatch ? ` (${channelMatch[1].trim().slice(0, 40)})` : '';
        return `${title}${channel}`;
    }
    // If filename is a UUID-only transcript, try the first non-empty prose line
    // as a last-resort description (truncated to 70 chars).
    if (UUID_FILENAME_RX.test(f.name)) {
        const firstLine = (body.split(/\r?\n/).map(s => s.trim()).find(s => s.length > 20) || '').slice(0, 70);
        if (firstLine) return `Transcript: "${firstLine}..."`;
    }
    // Fall back to filename (trimmed + stripped of extension)
    const base = f.name.replace(/\.[^.]+$/, '');
    return base.length > 60 ? base.slice(0, 58) + '...' : base;
}

// --- CORPUS-SUGGESTED REPORT FORMATS (2026-11-09, closeout plan WS-B2b) ---
//
// The live Gemini Notebook run proposed report templates from the sources it held
// (it offered "Architecture Specification" because the corpus carried an NVIDIA
// platform-architecture blog). HiC had the formats but no suggestion surface.
//
// DETERMINISTIC ON PURPOSE: this reads the corpus SHAPE (source titles, names and
// upload labels already in SuggestionState) and maps it to formats HiC can actually
// produce. No model call, no token cost, no nondeterminism: the same corpus always
// proposes the same formats, which the determinism rule for cached runs requires.

interface FormatRule {
    /** The hashtag the chip types into the composer. */
    tag: string;
    /** Why this corpus shape supports this format (chip tooltip). */
    rationale: string;
    /** Signals in the corpus text that make this format a fit. */
    match: RegExp;
}

// Ordered by specificity: the narrower shapes win the two slots before the generics.
const FORMAT_RULES: FormatRule[] = [
    { tag: '#chronology', rationale: 'The sources are dated news, so a source chronology can order what happened', match: /\b(ars technica|techcrunch|reuters|bloomberg|venturebeat|the verge|wired|press release|earnings|quarterly)\b/i },
    { tag: '#explainer', rationale: 'The sources include technical platform writing, so an explainer can carry the mechanism', match: /\b(developer|technical blog|docs|documentation|architecture|kubernetes|api|sdk|engineering)\b/i },
    { tag: '#faq', rationale: 'The sources are discussion threads, so an FAQ can answer the questions people actually asked', match: /\b(reddit|r\/[a-z]+|forum|thread|comments|stack overflow|discord)\b/i },
    { tag: '#critique', rationale: 'The sources include research papers, so a critique can weigh what they establish', match: /\b(arxiv|journal|study|research|openalex|pubmed|doi|peer.?review)\b/i },
    { tag: '#studyguide', rationale: 'The corpus includes transcripts, so a study guide can turn them into teachable modules', match: /\b(transcript|interview|call recording|webinar|podcast|youtube)\b/i },
    { tag: '#datatable', rationale: 'The sources name comparable entities, so a data table can line them up with their quotes', match: /\b(vendor|competitor|comparison|versus|pricing|benchmark|matrix)\b/i },
];

/**
 * Reserve the last slot of a chip set for ONE corpus-matched report format, once the
 * corpus exists (post-collection). Keeps the question chips the researcher came for and
 * still names a format the sources support, which is the parity item from the live run.
 */
export function withReportFormats(
    base: PromptSuggestion[],
    phase: CollectionPhase,
    state: SuggestionState,
    maxSuggestions: number,
): PromptSuggestion[] {
    if (phase !== 'post-collection' || maxSuggestions < 2) return base.slice(0, maxSuggestions);
    const formats = suggestReportFormats(state, 1);
    if (formats.length === 0) return base.slice(0, maxSuggestions);
    // Never duplicate a format the model already proposed.
    const already = new Set(base.map(s => (s.text.match(/#[a-z-]+/i)?.[0] || '').toLowerCase()));
    const fresh = formats.filter(f => !already.has((f.text.match(/#[a-z-]+/i)?.[0] || '').toLowerCase()));
    if (fresh.length === 0) return base.slice(0, maxSuggestions);
    return [...base.slice(0, maxSuggestions - 1), fresh[0]];
}

/** Formats proposed when nothing more specific matches: the two the family always supports. */
const DEFAULT_FORMAT_RULES: FormatRule[] = [
    { tag: '#brief', rationale: 'A stakeholder brief is the shortest route from this corpus to a decision', match: /.^/ },
    { tag: '#blogpost', rationale: 'A blog post puts the judgment in a readable register without loosening the citations', match: /.^/ },
];

/** One searchable string of everything the corpus is made of: upload labels, feed names, item titles. */
function corpusShapeText(state: SuggestionState): string {
    const parts: string[] = [];
    for (const f of state.uploadedFiles || []) parts.push(describeUploadedFile(f), f.name);
    for (const r of state.liveSourceResults || []) {
        if (r?.source) parts.push(r.source);
        for (const it of r?.items || []) {
            if (it?.sourceName) parts.push(it.sourceName);
            if (it?.title) parts.push(it.title);
        }
    }
    return parts.join(' \n ');
}

/**
 * Propose report formats this corpus can actually support. Returns at most `max`
 * (default 2) suggestions, most specific first, with the generic pair as backfill.
 * Pure: same corpus in, same formats out.
 */
export function suggestReportFormats(state: SuggestionState, max = 2): PromptSuggestion[] {
    const text = corpusShapeText(state);
    if (!text.trim()) return [];
    const objective = extractResearchObjective(state.researchGoal) || 'this corpus';
    const topic = objective.length > 70 ? objective.slice(0, 68).trim() : objective;

    const matched = FORMAT_RULES.filter(r => r.match.test(text));
    const chosen = [...matched, ...DEFAULT_FORMAT_RULES].slice(0, Math.max(0, max));

    return chosen.map(r => ({
        text: `${r.tag} ${topic}`,
        kind: 'report-format' as const,
        rationale: r.rationale,
    }));
}

// --- PHASE DETECTION ---

export function detectPhase(state: SuggestionState): CollectionPhase {
    if (state.phaseOverride) return state.phaseOverride;
    const themes = (state.knowledgeGraph?.nodes || []).filter(n => n?.type === 'theme');
    const sources = (state.knowledgeGraph?.nodes || []).filter(n => n?.type === 'source');
    const liveItemCount = (state.liveSourceResults || [])
        .reduce((sum, s) => sum + (s.items?.length || 0), 0);
    if (themes.length > 0) return 'post-collection';
    if (liveItemCount > 0 || sources.length > 0) return 'mid-collection';
    // NEW 2026-04-21 - distinguish "setup" (no goal OR empty goal) from
    // "pre-collection" (goal exists but data hasn't been collected yet).
    // Setup state gets guidance chips tailored to writing a better brief;
    // pre-collection gets chips that probe uploaded docs + clarify scope.
    const goalLen = (state.researchGoal || '').trim().length;
    const hasUploads = (state.uploadedFiles || []).length > 0;
    if (goalLen < 20 && !hasUploads) return 'setup';
    return 'pre-collection';
}

// --- SUGGESTION GENERATION ---

const PROXY_BASE = 'http://127.0.0.1:5012';

export async function suggestPrompts(state: SuggestionState, opts: { maxSuggestions?: number; signal?: AbortSignal } = {}): Promise<PromptSuggestion[]> {
    const maxSuggestions = opts.maxSuggestions ?? 5;
    const phase = detectPhase(state);
    const objective = extractResearchObjective(state.researchGoal);

    // Setup phase (no goal, no uploads) still gets suggestions - but these
    // come from the deterministic fallback path since the AI has nothing to
    // ground against. A Gemini call with an empty objective wastes tokens
    // and produces generic boilerplate.
    if (phase === 'setup' || !objective || objective.length < 10) {
        return fallbackSuggestions(phase, state, maxSuggestions);
    }

    // Embeddings-backed neighbor lookup - gives the chip generator real
    // archive titles/sources that semantically match the goal so chips
    // reference actual content instead of generic phrasing. Non-blocking:
    // if the proxy is slow or embeddings are empty, neighbors = empty and
    // buildPromptForPhase emits its normal prompt without the archive block.
    let neighbors: { strong: any[]; adjacent: any[]; weak: any[] } = { strong: [], adjacent: [], weak: [] };
    try {
        const { exploreConcepts } = await import('./wikiIndexService');
        const result = await Promise.race([
            exploreConcepts(objective, { limit: 6, minSim: 0.3, signal: opts.signal }),
            new Promise<any>(resolve => setTimeout(() => resolve({ strong: [], adjacent: [], weak: [] }), 4000)),
        ]);
        neighbors = result;
        const found = (neighbors.strong?.length || 0) + (neighbors.adjacent?.length || 0);
        if (found > 0) {
            console.log(`[DynamicPromptChips] archive neighbors: ${neighbors.strong?.length || 0} strong + ${neighbors.adjacent?.length || 0} adjacent (${(result as any).total_indexed || 0} vectors indexed)`);
        }
    } catch { /* non-blocking */ }

    const prompt = buildPromptForPhase(phase, objective, state, maxSuggestions, neighbors);

    // 2026-05-12 - Retry NOT added here on purpose. This call already has
    // fallbackSuggestions() on failure (graceful degradation built in)
    // AND uses AbortSignal.timeout(15s) that the effect cancels on every
    // state-fingerprint change. A retry-with-backoff would conflict with
    // the abort pattern (retries firing after the effect's component
    // unmounted) and double the rate-limit risk on already-flaky calls.
    // Keep the fallback path.
    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.4, maxOutputTokens: 1200 },
            }),
            signal: opts.signal || AbortSignal.timeout(15_000),
        });
        if (!resp.ok) return fallbackSuggestions(phase, state, maxSuggestions);
        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.text || '';
        const parsed = parseSuggestionsFromResponse(text);
        if (parsed.length === 0) return fallbackSuggestions(phase, state, maxSuggestions);
        return withReportFormats(parsed, phase, state, maxSuggestions);
    } catch (err: any) {
        // Abort errors are EXPECTED - they fire when the component's state
        // fingerprint changes and a new effect run cancels the in-flight
        // fetch. Logging them as warnings floods the console with noise on
        // a rapidly-updating workbench. Real failures (network, bad JSON)
        // still log.
        const isAbort = err?.name === 'AbortError' || /aborted/i.test(err?.message || '');
        if (!isAbort) {
            console.warn('[dynamicPromptSuggestions] failed, using fallback:', err?.message || err);
        }
        return fallbackSuggestions(phase, state, maxSuggestions);
    }
}

function renderNeighborsBlock(neighbors: { strong: any[]; adjacent: any[]; weak: any[] } | undefined): string {
    if (!neighbors) return '';
    const strong = neighbors.strong || [];
    const adjacent = neighbors.adjacent || [];
    const hasAny = strong.length > 0 || adjacent.length > 0;
    if (!hasAny) return '';

    const fmt = (n: any) => {
        const src = n.source || '?';
        const ttl = (n.title || '').substring(0, 90);
        const sim = typeof n.similarity === 'number' ? ` (sim ${n.similarity.toFixed(2)})` : '';
        return `  - [${src}] ${ttl}${sim}`;
    };
    let block = `\nARCHIVE NEIGHBORS (semantically matched to the goal via OpenAI/Gemini embeddings - REFERENCE THESE SPECIFIC TITLES IN YOUR SUGGESTIONS):\n`;
    if (strong.length > 0) {
        block += `\nSTRONG MATCHES (archive already covers this - suggest a review/drill-in question):\n${strong.map(fmt).join('\n')}\n`;
    }
    if (adjacent.length > 0) {
        block += `\nADJACENT-BUT-CLOSE (overlooked angles - suggest exploring why this neighbor matters to the goal):\n${adjacent.map(fmt).join('\n')}\n`;
    }
    block += `
NEIGHBOR-GROUNDING RULES:
- At least 2 of your ${'${n}'.replace(/\$\{n\}/, '')} suggestions MUST reference a specific title or source from the lists above by NAME
- When citing a STRONG match, phrase as drill-in: "What does [TITLE] say about [ASPECT]?" or "Pull everything [SOURCE] has on [ASPECT]"
- When citing an ADJACENT match, phrase as lateral exploration: "Why might [TITLE] be relevant to [GOAL CONCEPT]?" or "Compare [ADJACENT TITLE] against [GOAL ASPECT]"
- Never invent a title - use only titles from the lists above
- Never say "the archive contains..." - just ask about specific titles directly
`;
    return block;
}

function buildPromptForPhase(phase: CollectionPhase, objective: string, state: SuggestionState, n: number, neighbors?: { strong: any[]; adjacent: any[]; weak: any[] }): string {
    const base = `You are a senior consulting partner coaching a researcher on what to ASK their data next. Your job: propose ${n} high-leverage questions the researcher should ask the AI chat right now.

Each suggestion must be:
- ONE sentence, question-form, action-oriented
- ANCHORED to a specific entity / source / theme (no generic prompts)
- Written as the researcher would type it (first-person or imperative)
- 6-16 words ideal, 22 max
- Varied across kinds (don't return 5 "compare X and Y" questions)

RESEARCH OBJECTIVE:
"""
${objective.substring(0, 1500)}
"""
`;

    let stateBlock = '';
    if (phase === 'pre-collection') {
        const uploads = (state.uploadedFiles || []);
        const descriptions = uploads.map(f => describeUploadedFile(f)).filter(Boolean);
        const samples = uploads
            .slice(0, 3)
            .map(f => f.parsedText?.substring(0, 400))
            .filter(Boolean);
        stateBlock = `
CURRENT STATE: PRE-COLLECTION (data has not been collected yet)

UPLOADED DOCUMENTS (${descriptions.length}) - REFER TO THEM BY THE HUMAN-READABLE LABEL, NEVER BY FILENAME OR UUID:
${descriptions.map(n => `- ${n}`).join('\n') || '(none)'}

${samples.length ? `SAMPLE CONTENT (first 400 chars of up to 3 documents):\n${samples.map(s => '"""\n' + s + '\n"""').join('\n\n')}` : ''}

Suggest ${n} questions that:
- Drill into specific uploaded documents when they exist (kind: document-drill)
- Probe what the research objective requires BEFORE data collection (kind: evidence-probe)
- Set up comparison frameworks the researcher will need (kind: comparison)
- Propose specific slide outputs grounded in uploaded docs if any (kind: slide-request)
- If NO uploads, suggest goal-setting questions that clarify scope (kind: synthesis)`;
    } else if (phase === 'mid-collection') {
        // CRITICAL: Only treat a source as "pattern-rich" if it has ≥5 items.
        // Asking "what patterns are emerging from X?" when X has one article
        // guarantees an LLM response like "only one article available, cannot
        // identify patterns". Classify sources into three buckets and tailor
        // the question kind to how much evidence each source actually has.
        const all = (state.liveSourceResults || []).filter(s => (s.items?.length || 0) > 0);
        const rich = all.filter(s => (s.items?.length || 0) >= 5)
            .sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0))
            .slice(0, 6);
        const thin = all.filter(s => (s.items?.length || 0) > 0 && (s.items?.length || 0) < 5).slice(0, 6);
        const richSummary = rich.map(s =>
            `- ${s.source || 'source'}: ${s.items?.length || 0} items (sample titles: ${(s.items || []).slice(0, 3).map(i => i.title?.substring(0, 80)).filter(Boolean).join(' | ')})`
        ).join('\n');
        const thinSummary = thin.map(s =>
            `- ${s.source || 'source'}: ${s.items?.length || 0} item(s)${(s.items || [])[0]?.title ? ` ("${(s.items || [])[0].title?.substring(0, 80)}")` : ''}`
        ).join('\n');
        const totalItems = all.reduce((sum, s) => sum + (s.items?.length || 0), 0);
        const uploadDescriptions = (state.uploadedFiles || []).map(f => describeUploadedFile(f));
        stateBlock = `
CURRENT STATE: MID-COLLECTION (data is flowing in right now - ${totalItems} total items from ${all.length} sources)

UPLOADED DOCUMENTS (refer by human-readable label, not filename):
${uploadDescriptions.length ? uploadDescriptions.map(n => `- ${n}`).join('\n') : '(none)'}

PATTERN-RICH SOURCES (≥5 items each - safe to ask about emerging themes/patterns):
${richSummary || '(none yet - do NOT ask "what patterns are emerging from X?" about thin sources below)'}

THIN SOURCES (<5 items - ask about the SPECIFIC article/item, NOT about "patterns"):
${thinSummary || '(none)'}

HARD RULES:
- NEVER suggest "What patterns are emerging from [source]?" unless that source appears in PATTERN-RICH above
- For THIN sources, suggest drilling into the specific article title that was returned
- Prefer cross-source synthesis questions over single-source questions when most sources are thin
- If <3 pattern-rich sources exist, shift to cross-cutting questions about the CORPUS (not individual sources)

Suggest ${n} questions that:
- Ask about pattern-rich sources by NAME (kind: source-coverage) - only if ≥5 items
- Drill into specific article titles from thin sources (kind: evidence-probe) - quote the title
- Bridge uploaded docs with newly-arriving data (kind: comparison)
- Cross-source synthesis: what's emerging across the corpus overall (kind: synthesis)
- Generate in-progress slides (kind: slide-request) only if enough evidence exists`;
    } else {
        // post-collection
        const themes = (state.knowledgeGraph?.nodes || [])
            .filter(n => n?.type === 'theme')
            .slice(0, 10)
            .map(n => n.label || n.name);
        const personas = (state.knowledgeGraph?.nodes || [])
            .filter(n => n?.type === 'persona')
            .slice(0, 6)
            .map(n => n.label || n.name);
        const sources = (state.knowledgeGraph?.nodes || [])
            .filter(n => n?.type === 'source')
            .slice(0, 10)
            .map(n => n.label || n.name);
        stateBlock = `
CURRENT STATE: POST-COLLECTION (corpus is complete; synthesis has produced themes/personas)

RESEARCH OBJECTIVE:
${objective.substring(0, 600)}

EMERGED THEMES (${themes.length}):
${themes.map(t => `- ${t}`).join('\n') || '(none yet)'}

PERSONAS (${personas.length}):
${personas.map(p => `- ${p}`).join('\n') || '(none yet)'}

TOP SOURCES:
${sources.slice(0, 8).map(s => `- ${s}`).join('\n') || '(none)'}

${state.lastAnswer ? `THE ASSISTANT'S LATEST ANSWER (the researcher just read this):\n"""\n${String(state.lastAnswer).slice(0, 1200)}\n"""\n` : ''}
Suggest ${n} questions that:
${state.lastAnswer ? '- AT LEAST TWO must be direct follow-ups to the latest answer above: probe a claim it made, ask for the evidence behind a named point, or push one of its judgments further (kind: evidence-probe or synthesis)\n' : ''}- Drill into the most robust themes (kind: theme-exploration) - NAME the theme
- Frame a question from a named persona's POV (kind: persona-perspective)
- Compare themes against each other or against a specific source (kind: comparison)
- Request specific slide outputs (kind: slide-request) - e.g. "Build a case study slide on X"
- Probe cross-cutting "so what" synthesis (kind: synthesis)`;
    }

    const outputFmt = `

RETURN STRICT JSON ONLY:
{
  "suggestions": [
    { "text": "...", "kind": "document-drill|source-coverage|theme-exploration|persona-perspective|comparison|synthesis|slide-request|evidence-probe", "rationale": "one-sentence why this is high-leverage right now" }
  ]
}`;

    // Semantic archive-neighbors block - empty string when wiki has no
    // embeddings yet OR no articles cleared the similarity floor. When
    // populated, it steers the chip generator toward specific titles in
    // the archive rather than generic phrasing.
    const neighborsBlock = renderNeighborsBlock(neighbors);

    return base + stateBlock + neighborsBlock + outputFmt;
}

function parseSuggestionsFromResponse(text: string): PromptSuggestion[] {
    if (!text) return [];
    // Strip ``` fences and anything before the first {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) cleaned = cleaned.substring(firstBrace);
    try {
        const parsed = JSON.parse(cleaned);
        if (!parsed || !Array.isArray(parsed.suggestions)) return [];
        const validKinds = new Set<SuggestionKind>([
            'document-drill', 'source-coverage', 'theme-exploration',
            'persona-perspective', 'comparison', 'synthesis',
            'slide-request', 'evidence-probe',
        ]);
        return parsed.suggestions
            .filter((s: any) => s && typeof s.text === 'string' && s.text.length >= 10 && s.text.length <= 300)
            .map((s: any) => ({
                text: s.text.trim(),
                kind: validKinds.has(s.kind) ? s.kind as SuggestionKind : 'synthesis',
                rationale: typeof s.rationale === 'string' ? s.rationale : undefined,
            }));
    } catch {
        return [];
    }
}

// --- DETERMINISTIC FALLBACKS ---
// When the Gemini call fails (proxy down, rate limit, malformed JSON) we
// return deterministic suggestions so the user never sees an empty chip row.

function fallbackSuggestions(phase: CollectionPhase, state: SuggestionState, n: number): PromptSuggestion[] {
    const out: PromptSuggestion[] = [];
    if (phase === 'setup') {
        // No goal AND no uploads - coach the user into writing a real brief.
        // These chips LOAD INTO THE CHAT INPUT so the researcher can tweak and send
        // the question to the AI, which will walk them through writing a better brief.
        out.push({ text: 'Help me structure a research brief for my project', kind: 'synthesis', rationale: 'AI walks you through a brief template' });
        out.push({ text: 'What makes a strong research objective vs a vague one?', kind: 'synthesis', rationale: 'Pattern coaching before you commit' });
        out.push({ text: 'What named entities (peers, vendors, programs) should I specify in my brief?', kind: 'evidence-probe', rationale: 'Specificity drives source quality' });
        out.push({ text: 'What sources should I enable for this research brief?', kind: 'source-coverage', rationale: 'Source selection guidance' });
        out.push({ text: 'What uploaded documents would strengthen this research?', kind: 'document-drill', rationale: 'Gap-fill before collecting' });
        out.push({ text: 'Give me 3 example research briefs I can adapt', kind: 'synthesis', rationale: 'Concrete templates' });
    } else if (phase === 'pre-collection') {
        const uploads = (state.uploadedFiles || []);
        for (const f of uploads.slice(0, 2)) {
            // Use descriptive label (video Title / Channel) instead of opaque
            // UUID filenames. See describeUploadedFile() for extraction logic.
            const label = describeUploadedFile(f);
            const short = label.length > 60 ? label.substring(0, 58) + '...' : label;
            out.push({ text: `Summarize the key findings from "${short}"`, kind: 'document-drill' });
            out.push({ text: `What does "${short}" say about the research objective?`, kind: 'document-drill' });
        }
        out.push({ text: 'What are the key research questions this project needs to answer?', kind: 'synthesis' });
        out.push({ text: 'What competing hypotheses should the data evaluate?', kind: 'evidence-probe' });
        out.push({ text: 'What named entities are worth collecting evidence on first?', kind: 'evidence-probe' });
    } else if (phase === 'mid-collection') {
        // Pattern questions require ≥5 items or they produce "only one article
        // available" non-answers. Use a two-tier approach.
        const all = (state.liveSourceResults || []).filter(s => (s.items?.length || 0) > 0);
        const rich = all.filter(s => (s.items?.length || 0) >= 5)
            .sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0))
            .slice(0, 2);
        const thin = all.filter(s => (s.items?.length || 0) > 0 && (s.items?.length || 0) < 5).slice(0, 2);
        for (const s of rich) {
            out.push({
                text: `What patterns are emerging from ${s.source} (${s.items?.length || 0} articles)?`,
                kind: 'source-coverage',
                rationale: 'Pattern-rich source - enough items to surface themes',
            });
        }
        for (const s of thin) {
            const firstTitle = (s.items || [])[0]?.title?.substring(0, 70);
            if (firstTitle) {
                out.push({
                    text: `What does "${firstTitle}" say, and does it support or contradict the corpus?`,
                    kind: 'evidence-probe',
                    rationale: 'Thin source - drill into the single returned article',
                });
            }
        }
        out.push({ text: 'Which sources are returning the richest evidence so far?', kind: 'source-coverage' });
        out.push({ text: 'Summarize what the data shows about the research objective so far', kind: 'synthesis' });
        out.push({ text: 'What gaps are emerging in the collected evidence?', kind: 'evidence-probe' });
    } else {
        const themes = (state.knowledgeGraph?.nodes || []).filter(n => n?.type === 'theme').slice(0, 2);
        for (const t of themes) {
            const name = (t.label || t.name || '').substring(0, 60);
            if (name) out.push({ text: `Drill into the "${name}" theme - what's the evidence?`, kind: 'theme-exploration' });
        }
        out.push({ text: 'Build a case study slide on the highest-leverage theme #slide', kind: 'slide-request' });
        out.push({ text: 'Compare the top 3 themes across sources', kind: 'comparison' });
        out.push({ text: 'What is the single most defensible strategic recommendation?', kind: 'synthesis' });
        out.push({ text: 'Which theme has the thinnest evidence base?', kind: 'evidence-probe' });
    }
    // The degraded path keeps the format suggestion too, so a provider failure never
    // silently removes the capability (closeout plan WS-B2b).
    return withReportFormats(out, phase, state, n);
}
