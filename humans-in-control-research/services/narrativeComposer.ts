// narrativeComposer.ts
//
// The agentic narrative composer. Takes a user's narrative thesis + brand +
// analysis context, runs a tool-using loop with Opus 4.7 (or GPT-5.5),
// emits a validated PresentationPayload.
//
// Flow:
//   1. compose() builds system prompt from template + skills + brand + context
//   2. Initializes the chosen provider client + tool executor + citation tracker
//   3. Loops: call model → execute tool calls → append results → repeat
//      until model emits stop/end_turn with a parseable JSON payload
//   4. Validates schema, returns payload + tool-call count + duration

import type {
  PresentationPayload,
  BrandVariant,
  ThemeMode,
  SectionKind,
} from './presentationTypes';
import { resolveBrandTokens, generateSlug } from './presentationTypes';
import type { ComposerModelChoice } from './hashtagParser';
import {
  NARRATIVE_TOOLS,
  createCitationTracker,
  type ToolExecutor,
  type CitationTracker,
} from './narrativeComposerTools';
import { wrapWithTracker } from './narrativeComposerExecutor';
import { tryRepairJson } from './aiRouter';
import { NARRATIVE_COMPOSER_PROMPT } from './prompts/narrativeComposerPrompt';

// ============================================================================
// PUBLIC API
// ============================================================================

export interface ComposeRequest {
  narrativeRequest: string;
  brand: BrandVariant;
  theme: ThemeMode;
  model: ComposerModelChoice;
  heroOverride?: string;
  sectionFilter?: SectionKind[];
  engagementContext: EngagementContext;
  executor: ToolExecutor;
  /**
   * Recent chat history that the user developed BEFORE invoking #presentation.
   * The composer treats these as the PRIMARY source material — packaging the
   * conversation rather than re-researching from scratch. Tools are reserved
   * for filling specific evidence gaps the chat didn't cover.
   *
   * Pass the last 6-12 messages (excluding the just-sent #presentation message).
   * Empty array = fall back to tool-only retrieval (less preferred).
   */
  priorConversation?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  onToolCall?: (tool: string, args: unknown, resultSummary?: string) => void;
  onProgress?: (message: string) => void;
}

export interface EngagementContext {
  engagementGoal: string;
  themeCount: number;
  personaCount: number;
  deliverableList: string[];
  externalArticleCount: number;
  uploadedDocCount: number;
  sourceEngagementPath?: string;
}

export interface ComposeResult {
  payload: PresentationPayload;
  toolCallCount: number;
  durationMs: number;
}

// ============================================================================
// COMPOSE ENTRY POINT
// ============================================================================

export async function compose(request: ComposeRequest): Promise<ComposeResult> {
  const startedAt = Date.now();
  const { narrativeRequest, brand, theme, model, executor, onProgress, onToolCall } = request;

  // Mode detection: when the chat has substantial prior content, we're in
  // PACKAGE mode — the chat IS the source. When the chat is thin, we're in
  // RESEARCH mode — the model retrieves from scratch via tools.
  // Package mode dramatically tightens the iteration cap and the prompt
  // priorities to prevent the model from drifting off-topic.
  const isPackageMode = computePackageMode(request.priorConversation, narrativeRequest);
  const topicAnchor = isPackageMode ? extractTopicAnchor(request.priorConversation, narrativeRequest) : null;

  onProgress?.(isPackageMode
    ? `Packaging chat into presentation (${model}; ${request.priorConversation?.length || 0} prior turns)...`
    : `Composing fresh narrative with ${model}...`);

  const systemPrompt = await buildSystemPrompt(request, { isPackageMode, topicAnchor });
  const tracker = createCitationTracker();
  const trackedExecutor = wrapWithTracker(executor, tracker);

  let toolCallCount = 0;
  const onTool = (name: string, args: unknown, summary?: string) => {
    toolCallCount += 1;
    onToolCall?.(name, args, summary);
  };

  // 2026-05-03 — Anthropic loop removed on this branch (HiC-Gemini-Primary).
  // All composer traffic goes through runOpenAILoop, which routes to either
  // OpenAI or Google's OpenAI-compatible endpoint based on model prefix:
  //   gpt-*    → /api/ai/openai
  //   gemini-* → /api/ai/gemini-compat (Google's OpenAI-format endpoint)
  // The wire format is identical for both, so the same loop logic drives
  // both providers. To restore Anthropic, re-add the runAnthropicLoop branch.
  const loopArgs: LoopArgs = { systemPrompt, narrativeRequest, executor: trackedExecutor, onTool, isPackageMode, model };
  const rawPayload = await runOpenAILoop(loopArgs);

  onProgress?.('Validating schema and finalizing...');
  const validated = validateAndFinalize(rawPayload, request, tracker, toolCallCount);

  return {
    payload: validated,
    toolCallCount,
    durationMs: Date.now() - startedAt,
  };
}

// ============================================================================
// SYSTEM PROMPT ASSEMBLY
// ============================================================================

// Prompt template is now inlined (see narrativeComposerPrompt.ts).
// Skills are fetched at runtime — /skills/ is volume-mounted into the
// research-generator nginx container and serves correctly.
const NXT_VISUAL_RENDERER_SKILL_PATH = '/skills/nxt-visual-renderer/SKILL.md';
const DECK_NARRATIVE_COMPOSER_SKILL_PATH = '/skills/deck-narrative-composer/SKILL.md';

// ============================================================================
// MODE DETECTION + TOPIC ANCHORING
// ============================================================================

/**
 * Package mode is on when the prior chat has enough substance that the
 * composer should TREAT IT AS THE SOURCE rather than re-research. Threshold
 * tuned to ~300 words of cumulative analyst output.
 */
/**
 * Phrases in the user's NEW narrative request that explicitly demand fresh
 * retrieval — e.g., "competitive analysis OUTSIDE of Northeastern", "find
 * external benchmarks", "research industry trends". When any of these appear
 * in the new request, package mode is the wrong choice even if there's prior
 * chat content: the user is asking for material the chat does NOT contain.
 *
 * Without this guard, a follow-up "competitive landscape" request after a
 * substantive earlier deck collapses to package mode, the search_corpus
 * tool is forbidden, and the model fabricates citations from training.
 */
const RESEARCH_INTENT_PATTERNS: RegExp[] = [
  /\boutside of\b/i,
  /\bexternal (data|sources|benchmark|research|evidence|examples)\b/i,
  /\bcompetitive (analysis|landscape|intelligence|benchmark)\b/i,
  /\bindustry (landscape|analysis|benchmark|trends|examples)\b/i,
  /\bmarket (landscape|analysis|trends|research)\b/i,
  /\b(non[- ]?Northeastern|non[- ]?NU|peer institutions?|other universities?)\b/i,
  /\b(find|surface|pull|retrieve|gather|collect) (relevant|external|new|fresh|additional)\b/i,
  /\bbeyond (the )?(uploaded|client|northeastern|nu)\b/i,
  /\bnot (just |only )?(the |our )?(uploads?|client docs?|prior chat)\b/i,
  /\bfresh (research|evidence|sources|data)\b/i,
];

function hasResearchIntent(narrativeRequest: string | undefined): boolean {
  if (!narrativeRequest) return false;
  return RESEARCH_INTENT_PATTERNS.some(re => re.test(narrativeRequest));
}

function computePackageMode(
  messages?: Array<{ role: string; content: string }>,
  narrativeRequest?: string,
): boolean {
  // If the new request explicitly asks for fresh/external/competitive material,
  // override package mode. The chat history doesn't contain what the user is
  // asking for — retrieval is mandatory.
  if (hasResearchIntent(narrativeRequest)) return false;

  if (!messages || messages.length === 0) return false;
  const assistantMsgs = messages.filter(m => m.role === 'assistant' && (m.content || '').trim().length > 0);
  if (assistantMsgs.length === 0) return false;
  const totalChars = assistantMsgs.reduce((s, m) => s + (m.content || '').length, 0);
  return totalChars >= 1500;
}

/**
 * Topic anchor: the FIRST substantial user intent + the FIRST substantial
 * analyst response, both verbatim. This is what the composer's prompt
 * uses to lock the topic — preventing the model from drifting off into
 * unrelated wiki content via search_corpus.
 */
function extractTopicAnchor(
  messages: Array<{ role: string; content: string }> | undefined,
  fallbackRequest: string,
): string {
  if (!messages || messages.length === 0) {
    return `USER REQUEST: ${fallbackRequest}`;
  }
  const firstUser = messages.find(m => m.role === 'user' && (m.content || '').trim().length >= 30);
  const firstAssistant = messages.find(m => m.role === 'assistant' && (m.content || '').trim().length >= 200);

  const userIntent = firstUser?.content?.slice(0, 800).trim() || fallbackRequest;
  const analystFraming = firstAssistant?.content?.slice(0, 800).trim() || '(no substantial analyst response yet)';

  return [
    `USER INTENT (verbatim from first message):`,
    userIntent,
    ``,
    `ANALYST'S FRAMING (verbatim from first analyst response):`,
    analystFraming,
    ``,
    `LATEST USER REQUEST: ${fallbackRequest}`,
  ].join('\n');
}

// ============================================================================

async function buildSystemPrompt(
  request: ComposeRequest,
  modeContext: { isPackageMode: boolean; topicAnchor: string | null },
): Promise<string> {
  // Prompt template is inlined as a TS module (see narrativeComposerPrompt.ts
  // for why — the previous fetch path was broken by nginx SPA-fallback).
  // Skill files are still fetched because /skills/ IS volume-mounted in the
  // Docker container and serves correctly.
  const template = NARRATIVE_COMPOSER_PROMPT;
  const [visualRenderer, deckNarrative] = await Promise.all([
    fetchText(NXT_VISUAL_RENDERER_SKILL_PATH).catch(() => '(visual-renderer skill unavailable)'),
    fetchText(DECK_NARRATIVE_COMPOSER_SKILL_PATH).catch(() => '(deck-narrative skill unavailable)'),
  ]);

  const tokens = resolveBrandTokens(request.brand);
  const tokensSummary = `accents: ${tokens.accentPrimary}/${tokens.accentSecondary}/${tokens.accentTertiary}; bg: ${tokens.bgPrimary}; font: ${tokens.fontDisplay}`;

  const priorConversationBlock = formatPriorConversation(request.priorConversation);
  const modeHeader = buildModeHeader(modeContext.isPackageMode, modeContext.topicAnchor);
  const topicAnchorBlock = modeContext.topicAnchor || '(no prior conversation — fresh research request)';

  return template
    .replace(/{{MODE_HEADER}}/g, modeHeader)
    .replace(/{{TOPIC_ANCHOR_BLOCK}}/g, topicAnchorBlock)
    .replace(/{{BRAND_NAME}}/g, request.brand === 'NU' ? 'Northeastern University Advancement' : 'NXT Humans')
    .replace(/{{BRAND_DESCRIPTION}}/g, brandDescription(request.brand))
    .replace(/{{BRAND_TOKENS_SUMMARY}}/g, tokensSummary)
    .replace(/{{ENGAGEMENT_GOAL}}/g, request.engagementContext.engagementGoal || '(not set)')
    .replace(/{{NARRATIVE_THESIS}}/g, request.narrativeRequest)
    .replace(/{{THEME_COUNT}}/g, String(request.engagementContext.themeCount))
    .replace(/{{PERSONA_COUNT}}/g, String(request.engagementContext.personaCount))
    .replace(/{{DELIVERABLE_LIST}}/g, request.engagementContext.deliverableList.join(', ') || '(none)')
    .replace(/{{EXTERNAL_COUNT}}/g, String(request.engagementContext.externalArticleCount))
    .replace(/{{UPLOADED_COUNT}}/g, String(request.engagementContext.uploadedDocCount))
    .replace(/{{PRIOR_CONVERSATION_BLOCK}}/g, priorConversationBlock)
    .replace(/{{NXT_VISUAL_RENDERER_SKILL}}/g, stripFrontmatter(visualRenderer))
    .replace(/{{DECK_NARRATIVE_COMPOSER_SKILL}}/g, stripFrontmatter(deckNarrative))
    .replace(/{{OUTPUT_SCHEMA}}/g, getOutputSchemaText());
}

function buildModeHeader(isPackageMode: boolean, topicAnchor: string | null): string {
  if (!isPackageMode) {
    return [
      `# MODE: RESEARCH`,
      ``,
      `No substantial prior chat. Use tools to retrieve evidence, then call submit_presentation.`,
    ].join('\n');
  }
  return [
    `# MODE: PACKAGE`,
    ``,
    `# ⚠ CRITICAL: THE CHAT CONVERSATION BELOW IS YOUR ONLY SOURCE.`,
    `# DO NOT CHANGE TOPIC. DO NOT RESEARCH FROM SCRATCH.`,
    ``,
    `The user has been developing this narrative with you in the AI Analyst chat.`,
    `Your task is NOT to compose a new strategic narrative. Your task is to STRUCTURE`,
    `the analyst's prior responses into the PresentationPayload format and call`,
    `submit_presentation. Treat the conversation as the authoritative draft.`,
    ``,
    `## TOPIC LOCK (the deck MUST be about this — not anything else)`,
    ``,
    topicAnchor || '(missing)',
    ``,
    `## TOOL USE IN PACKAGE MODE`,
    ``,
    `⚠ CRITICAL CORPUS HYGIENE: The wiki at /api/wiki/fetch-articles contains content`,
    `from ALL engagements — past and present. A "challenges and opportunities" query`,
    `will retrieve articles from completely unrelated engagements (NXT's own brand`,
    `thesis content, prior client work, etc.) and the model will WEAVE THEM IN as if`,
    `they belonged. This is how decks change topic. DO NOT RUN GENERAL QUERIES.`,
    ``,
    `- search_corpus: FORBIDDEN unless the chat references a source by name and you need a`,
    `  specific verbatim quote not in the chat. If you must call it, use scope='uploaded_only'`,
    `  (uploads are engagement-scoped) and a query that names the specific document or`,
    `  speaker. Maximum 1 call.`,
    `- get_themes / get_personas / get_deliverable: FORBIDDEN. The chat already integrates`,
    `  whatever themes/personas/deliverables are relevant.`,
    `- extract_quotes / extract_stats: only if the chat referenced a quote or stat by`,
    `  source name but did not include the verbatim text. Use scope='uploaded_only'.`,
    `  Maximum 2 calls combined.`,
    `- submit_presentation: required. Call this within 1-3 turns.`,
    ``,
    `If you find yourself wanting to call search_corpus to "round out" or "supplement"`,
    `the narrative, STOP. The chat is the narrative. Just structure it.`,
    ``,
    `## DECK COMPOSITION FROM CHAT`,
    ``,
    `Read the conversation. Identify:`,
    `- The thesis/title (often the analyst's headline sentence in the first major response)`,
    `- The diagnosis (the situation/complication framing)`,
    `- The evidence (numbers, quotes, named sources cited in the chat)`,
    `- The recommendations (the resolution / "moves" sections)`,
    ``,
    `Then map them onto sections (hero, context, evidence, themes, quotes, recommendations,`,
    `roadmap as appropriate). Keep the analyst's exact phrasings and exact citations.`,
    `Do not paraphrase or "improve" them — the user has already approved them.`,
    ``,
    `===== END MODE HEADER =====`,
  ].join('\n');
}

/**
 * Format chat history as a system-prompt block. When non-empty, this is the
 * composer's PRIMARY source. Each turn is labeled and the assistant's prior
 * responses are presented as drafts the user has already engaged with.
 *
 * Aggressive truncation: each message capped at 2000 chars to keep the
 * system prompt under control. Most chat replies exceed this only when they
 * include large embedded JSON or very long source dumps.
 */
function formatPriorConversation(
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
): string {
  if (!messages || messages.length === 0) {
    return '(no prior conversation — this is a fresh narrative request; use tools to research from scratch)';
  }
  const PER_MSG_CAP = 2000;
  const lines: string[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue; // skip system breadcrumbs
    const role = m.role === 'user' ? 'USER' : 'ANALYST';
    const text = (m.content || '').slice(0, PER_MSG_CAP).trim();
    if (!text) continue;
    lines.push(`[${role}]\n${text}`);
  }
  if (lines.length === 0) return '(no usable prior conversation)';
  return lines.join('\n\n---\n\n');
}

function brandDescription(brand: BrandVariant): string {
  if (brand === 'NU') {
    return 'Northeastern University. Advancement, alumni engagement, donor relations. Brand voice: institutional gravitas, Huskies pride, modern but grounded. Visual: near-black + Huskies red, Archivo display.';
  }
  return 'NXT Humans. AI-native consulting that disrupts traditional discovery and strategy with intelligence augmentation. Brand voice: rigorous, anti-slop, evidence-first. Visual: near-black + chartreuse + cyan + teal, Archivo display.';
}

function stripFrontmatter(md: string): string {
  if (md.startsWith('---')) {
    const end = md.indexOf('\n---', 3);
    if (end > 0) return md.slice(end + 4).trim();
  }
  return md;
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return await res.text();
}

function getOutputSchemaText(): string {
  return JSON.stringify({
    type: 'object',
    required: ['schemaVersion', 'meta', 'narrativeArc', 'sections'],
    properties: {
      schemaVersion: { const: 1 },
      meta: {
        type: 'object',
        required: ['title', 'subtitle', 'narrativeThesis'],
        properties: {
          title: { type: 'string', maxLength: 120 },
          subtitle: { type: 'array', items: { type: 'string' }, maxItems: 2 },
          narrativeThesis: { type: 'string' },
        },
      },
      narrativeArc: {
        type: 'object',
        required: ['diagnosis', 'guidingPolicy', 'arcRationale', 'sectionMap'],
        properties: {
          // Lengths raised for scrolling-format depth — diagnosis and policy
          // can now hold a multi-sentence argument with named evidence
          // instead of a one-sentence summary.
          diagnosis: { type: 'string', maxLength: 800 },
          guidingPolicy: { type: 'string', maxLength: 800 },
          arcRationale: { type: 'string', maxLength: 1200 },
          sectionMap: { type: 'array', items: { type: 'object' } },
        },
      },
      sections: {
        type: 'array',
        // Raised to 16 — prompt now targets 10-12 sections for engagements
        // with rich analysis (≥10 themes / ≥50 external articles); a hard
        // cap of 12 was clipping the convergence section + roadmap split.
        minItems: 6,
        maxItems: 16,
        items: {
          type: 'object',
          required: ['kind', 'data'],
          properties: {
            kind: {
              type: 'string',
              enum: [
                'hero', 'context', 'themes', 'evidence', 'quotes',
                'personas', 'journey', 'recommendations', 'roadmap',
                'gap_analysis', 'tech_arch', 'team', 'competitive', 'cta',
              ],
            },
            data: { type: 'object' },
          },
        },
      },
    },
  }, null, 2);
}

// ============================================================================
// COMPOSER TOOL-USE LOOP
// ============================================================================
// 2026-05-03 — Anthropic loop / proxy URL / message types removed on this
// branch (HiC-Gemini-Primary). All composer traffic flows through
// runOpenAILoop, which dispatches to OpenAI or Google's OpenAI-compatible
// endpoint based on model prefix.

const OPENAI_PROXY_URL = 'http://localhost:5012/api/ai/openai';
const GEMINI_OPENAI_COMPAT_PROXY_URL = 'http://localhost:5012/api/ai/gemini-compat';
// 8 iterations × ~1.7 parallel tool calls per turn = ~14 actual tool invocations
// in the worst case. Anything more bloats the context past the point where the
// model can produce a clean submit_presentation payload — that was the failure
// mode in the 20-tool-call run that emitted a meta-less payload.
const COMPOSER_MAX_ITERATIONS = 8;
const COMPOSER_MAX_TOKENS = 16000;
const COMPOSER_REQUEST_TIMEOUT_MS = 180_000;
// Force submit at iter 5 in research mode (was 8). Combined with MAX=8 this
// guarantees at most 5 rounds of retrieval before the model is locked to
// submit_presentation only. Package mode still force-converges at iter 2.
const COMPOSER_FORCE_SUBMIT_AT_ITER = 5;

// ============================================================================
// HTTP RETRY HELPER — 3 attempts with exponential backoff for transient errors
// ============================================================================

interface RetriableHttpError extends Error {
  status?: number;
  isTransient?: boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const err = e as RetriableHttpError;
      const status = err.status;
      const transient =
        err.isTransient ||
        status === 429 ||
        status === 500 || status === 502 || status === 503 || status === 504 ||
        /ECONNRESET|ETIMEDOUT|ConnectError|fetch failed|network/i.test(err.message || '');
      if (!transient || attempt === maxAttempts) throw e;
      const delay = Math.min(8_000, 1_000 * Math.pow(2, attempt - 1));
      // eslint-disable-next-line no-console
      console.warn(`${label}: attempt ${attempt}/${maxAttempts} failed (${status || 'network'}). Retrying in ${delay}ms.`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface LoopArgs {
  systemPrompt: string;
  narrativeRequest: string;
  executor: ToolExecutor;
  onTool: (name: string, args: unknown, summary?: string) => void;
  /** When true, force-converge to submit_presentation after just 1-2 turns. */
  isPackageMode: boolean;
  /**
   * 2026-05-03 — Model id passed by the dispatcher. runOpenAILoop accepts
   * either gpt-* (routed to OpenAI) or gemini-* (routed to Google's
   * OpenAI-compatible endpoint). Optional: omitted callers default to gpt-5.5.
   */
  model?: string;
}

// Force-convergence threshold:
//   Package mode: after 1 turn, force submit (the chat IS the source — no
//                 need for retrieval; if the model wants to do 1 lookup,
//                 fine, but turn 2 must be submit).
//   Research mode: after 8 turns, force submit (existing behavior).
function forceSubmitAtIter(isPackageMode: boolean): number {
  return isPackageMode ? 2 : COMPOSER_FORCE_SUBMIT_AT_ITER;
}


// ============================================================================
// OPENAI TOOL-USE LOOP
// ============================================================================

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: 'stop' | 'tool_calls' | 'length' | string;
}

interface OpenAIResponse {
  id: string;
  choices: OpenAIChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

async function runOpenAILoop(args: LoopArgs): Promise<unknown> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: args.systemPrompt },
    { role: 'user', content: args.narrativeRequest },
  ];

  const tools = NARRATIVE_TOOLS.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  let missingSubmitRetries = 0;
  const MAX_MISSING_SUBMIT_RETRIES = 2;

  // Mirror the Anthropic loop's retrieval-floor enforcement: research mode
  // requires ≥2 retrieval calls before submit_presentation is permitted.
  const RETRIEVAL_TOOL_NAMES = new Set([
    'search_corpus', 'extract_quotes', 'extract_stats',
    'get_themes', 'get_personas', 'get_deliverable',
  ]);
  let retrievalCount = 0;
  const MIN_RETRIEVALS_RESEARCH = 2;

  const forceAt = forceSubmitAtIter(args.isPackageMode);
  for (let iter = 0; iter < COMPOSER_MAX_ITERATIONS; iter++) {
    // Three phases mirroring the Anthropic loop:
    //   1. iter 0 in research mode: force search_corpus
    //   2. iter < forceAt with retrievalCount < MIN: tools list excludes submit
    //   3. iter >= forceAt: force submit_presentation
    let toolChoice: unknown;
    let availableTools = tools;

    if (!args.isPackageMode && iter === 0) {
      toolChoice = { type: 'function', function: { name: 'search_corpus' } };
    } else if (iter >= forceAt) {
      toolChoice = { type: 'function', function: { name: 'submit_presentation' } };
    } else if (!args.isPackageMode && retrievalCount < MIN_RETRIEVALS_RESEARCH) {
      toolChoice = 'required';
      availableTools = tools.filter(t => t.function.name !== 'submit_presentation');
    } else {
      toolChoice = 'required';
    }

    const loopModel = args.model || 'gpt-5.5';
    const response = await callOpenAI({
      model: loopModel,
      messages,
      tools: availableTools,
      tool_choice: toolChoice,
      max_tokens: COMPOSER_MAX_TOKENS,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error('OpenAI returned no choices');

    messages.push(choice.message);

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
      // Silent-mode short-circuit: if model called submit_presentation, parse
      // its arguments and return as the final payload.
      const submitCall = choice.message.tool_calls.find(tc => tc.function.name === 'submit_presentation');
      if (submitCall) {
        try {
          const payload = JSON.parse(submitCall.function.arguments);
          args.onTool('submit_presentation', { sections: payload?.sections?.length }, 'final payload submitted');
          return payload;
        } catch (e: unknown) {
          // Try repair once; OpenAI's strict mode should prevent malformed JSON,
          // but defense-in-depth costs nothing.
          try {
            const payload = JSON.parse(tryRepairJson(submitCall.function.arguments));
            args.onTool('submit_presentation', { sections: payload?.sections?.length }, 'final payload submitted (repaired)');
            return payload;
          } catch {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(`gpt-5.5 submit_presentation arguments unparseable: ${msg}. First 200 chars: ${submitCall.function.arguments.slice(0, 200)}`);
          }
        }
      }

      // Execute retrieval tools and continue
      for (const tc of choice.message.tool_calls) {
        const summary = await executeToolForOpenAI(args.executor, tc, args.onTool);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: summary.serialized,
        });
        if (RETRIEVAL_TOOL_NAMES.has(tc.function.name)) {
          retrievalCount += 1;
        }
      }
      continue;
    }

    if (choice.finish_reason === 'stop' || choice.finish_reason === 'length') {
      // With tool_choice='required' the model should never end without a tool
      // call. Guard anyway: send a corrective message and force submit.
      if (missingSubmitRetries < MAX_MISSING_SUBMIT_RETRIES) {
        missingSubmitRetries += 1;
        messages.push({
          role: 'user',
          content:
            'You did not call the submit_presentation tool. Your task is incomplete. ' +
            'CALL submit_presentation NOW with the full PresentationPayload as the arguments. ' +
            'Do not emit any other text.',
        });
        continue;
      }
      throw new Error(
        `gpt-5.5 ended turn without calling submit_presentation after ${MAX_MISSING_SUBMIT_RETRIES} retries.`
      );
    }

    throw new Error(`OpenAI returned unexpected finish_reason: ${choice.finish_reason}`);
  }

  throw new Error(`Composer exceeded ${COMPOSER_MAX_ITERATIONS} iterations without calling submit_presentation`);
}

async function callOpenAI(body: Record<string, unknown>): Promise<OpenAIResponse> {
  // Route by model prefix: gemini-* → Google OpenAI-compat endpoint,
  // gpt-* / openai-* → OpenAI native. Wire format identical for both
  // (chat completions + tool_calls), so the rest of runOpenAILoop is unchanged.
  const modelStr = String(body.model || '').toLowerCase();
  const url = modelStr.startsWith('gemini-')
    ? GEMINI_OPENAI_COMPAT_PROXY_URL
    : OPENAI_PROXY_URL;
  const providerLabel = modelStr.startsWith('gemini-') ? 'Gemini-compat' : 'OpenAI';

  return withRetry(async () => {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, COMPOSER_REQUEST_TIMEOUT_MS);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const err: RetriableHttpError = new Error(`${providerLabel} API ${res.status}: ${errText.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }, 'callOpenAI');
}

async function executeToolForOpenAI(
  executor: ToolExecutor,
  call: OpenAIToolCall,
  onTool: LoopArgs['onTool'],
): Promise<{ serialized: string; isError: boolean }> {
  try {
    const args = JSON.parse(call.function.arguments);
    const result = await dispatchTool(executor, call.function.name, args);
    onTool(call.function.name, args, summarizeResult(call.function.name, result));
    return { serialized: JSON.stringify(result), isError: false };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    onTool(call.function.name, call.function.arguments, `error: ${msg}`);
    return { serialized: JSON.stringify({ error: msg }), isError: true };
  }
}

// ============================================================================
// TOOL DISPATCH — single switch shared by both providers
// ============================================================================

async function dispatchTool(executor: ToolExecutor, name: string, input: unknown): Promise<unknown> {
  const args = input as Record<string, unknown>;
  switch (name) {
    case 'search_corpus':
      return executor.search_corpus(args as never);
    case 'get_themes':
      return executor.get_themes();
    case 'get_personas':
      return executor.get_personas();
    case 'get_deliverable':
      return executor.get_deliverable(args as never);
    case 'extract_quotes':
      return executor.extract_quotes(args as never);
    case 'extract_stats':
      return executor.extract_stats(args as never);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function summarizeResult(toolName: string, result: unknown): string {
  if (!result || typeof result !== 'object') return '';
  const r = result as Record<string, unknown>;
  if ('chunks' in r && Array.isArray(r.chunks)) {
    return `${(r.chunks as unknown[]).length} chunks`;
  }
  if ('themes' in r && Array.isArray(r.themes)) {
    return `${(r.themes as unknown[]).length} themes`;
  }
  if ('personas' in r && Array.isArray(r.personas)) {
    return `${(r.personas as unknown[]).length} personas`;
  }
  if ('quotes' in r && Array.isArray(r.quotes)) {
    return `${(r.quotes as unknown[]).length} quotes`;
  }
  if ('stats' in r && Array.isArray(r.stats)) {
    return `${(r.stats as unknown[]).length} stats`;
  }
  if ('exists' in r) {
    return r.exists ? 'found' : 'not in session';
  }
  return '';
}

// ============================================================================
// JSON PARSING + REPAIR
// ============================================================================

function parsePayload(rawText: string, modelLabel: string): unknown {
  let cleaned = rawText.trim();

  // Strip markdown fences if any
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/```\s*$/, '').trim();
  }

  // First parse attempt
  try {
    return JSON.parse(cleaned);
  } catch (firstErr) {
    // Repair attempt
    try {
      const repaired = tryRepairJson(cleaned);
      return JSON.parse(repaired);
    } catch (secondErr) {
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      throw new Error(
        `${modelLabel} returned unparseable JSON after repair: ${msg}. ` +
        `First 200 chars: ${cleaned.slice(0, 200)}`
      );
    }
  }
}

// ============================================================================
// VALIDATION + FINALIZATION
// ============================================================================

function validateAndFinalize(
  raw: unknown,
  request: ComposeRequest,
  tracker: CitationTracker,
  toolCallCount: number,
): PresentationPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Composer returned non-object payload (got ${typeof raw})`);
  }

  // ====== STRINGIFIED-NESTED-OBJECT TOLERANCE ======
  // Under heavy context pressure (large corpus, many tool calls), Anthropic
  // tool inputs sometimes come back with nested objects double-encoded as
  // JSON strings: e.g., { meta: "{\"title\":...}" } instead of { meta: {...} }.
  // The schema-required keys ARE present, but typeof is 'string' not 'object'.
  // Detect and JSON.parse the stringified nested fields before validating.
  const tryUnstringify = (v: unknown): unknown => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (!t.startsWith('{') && !t.startsWith('[')) return v;
    try { return JSON.parse(t); } catch { return v; }
  };

  let p = raw as Partial<PresentationPayload> & { [k: string]: unknown };
  let unstringifiedAny = false;
  for (const key of ['meta', 'narrativeArc', 'sections'] as const) {
    if (typeof p[key] === 'string') {
      const parsed = tryUnstringify(p[key]);
      if (parsed !== p[key] && parsed && typeof parsed === 'object') {
        // eslint-disable-next-line no-console
        console.warn(`[narrativeComposer] Model double-encoded '${key}' as JSON string — unstringifying.`);
        (p as Record<string, unknown>)[key] = parsed;
        unstringifiedAny = true;
      }
    }
  }
  if (unstringifiedAny) {
    // eslint-disable-next-line no-console
    console.warn('[narrativeComposer] Recovered from JSON stringification — payload should validate now.');
  }

  // ====== UNWRAP TOLERANCE ======
  // Models sometimes wrap the payload in an extra layer:
  //   { payload: { meta, narrativeArc, sections } }
  //   { presentation: { ... } }
  // Detect and unwrap before validating.
  if (!p.meta || typeof p.meta !== 'object') {
    const r = raw as Record<string, unknown>;
    for (const wrapper of ['payload', 'presentation', 'presentation_payload', 'data', 'result']) {
      const candidate = r[wrapper];
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        const c = candidate as Partial<PresentationPayload>;
        if (c.meta && typeof c.meta === 'object') {
          // eslint-disable-next-line no-console
          console.warn(`[narrativeComposer] Model wrapped payload in '${wrapper}' key — unwrapping.`);
          p = c as Partial<PresentationPayload> & { [k: string]: unknown };
          break;
        }
      }
    }
  }

  // Schema shape validation — enforce required top-level fields with diagnostics
  if (!p.meta || typeof p.meta !== 'object') {
    const topKeys = Object.keys(raw as object).slice(0, 20);
    const sample = JSON.stringify(raw).slice(0, 400);
    throw new Error(
      `Payload missing meta block. Top-level keys received: [${topKeys.join(', ')}]. ` +
      `First 400 chars: ${sample}`
    );
  }
  if (!p.narrativeArc || typeof p.narrativeArc !== 'object') {
    // Be tolerant: some models forget narrativeArc but produce sections.
    // Synthesize a minimal narrativeArc rather than failing.
    // eslint-disable-next-line no-console
    console.warn('[narrativeComposer] Model did not produce narrativeArc — synthesizing minimal block.');
    p.narrativeArc = {
      diagnosis: '',
      guidingPolicy: '',
      arcRationale: '',
      sectionMap: [],
    };
  }
  if (!Array.isArray(p.sections) || p.sections.length < 1) {
    throw new Error(
      `Payload sections array missing or empty (got ${Array.isArray(p.sections) ? `${p.sections.length} items` : typeof p.sections}).`
    );
  }

  // Apply section filter if requested
  let sections = p.sections;
  if (request.sectionFilter && request.sectionFilter.length > 0) {
    const filterSet = new Set(request.sectionFilter);
    // Always keep hero and cta even if not explicitly listed
    filterSet.add('hero');
    filterSet.add('cta');
    sections = sections.filter(s => filterSet.has(s.kind as SectionKind));
  }

  // Apply hero override if provided
  if (request.heroOverride && sections.length > 0 && sections[0].kind === 'hero') {
    const heroData = sections[0].data as unknown as Record<string, unknown>;
    sections[0] = {
      kind: 'hero',
      data: { ...heroData, title: request.heroOverride } as never,
    } as never;
  }

  // Compose final payload, filling observability metadata the model can't see
  const summary = tracker.summary();
  const finalized: PresentationPayload = {
    schemaVersion: 1,
    meta: {
      slug: p.meta.slug || generateSlug(request.engagementContext.engagementGoal, request.narrativeRequest),
      title: p.meta.title || 'Untitled Presentation',
      subtitle: p.meta.subtitle || [],
      brand: request.brand,
      theme: request.theme,
      generatedAt: new Date().toISOString(),
      sourceEngagement: p.meta.sourceEngagement || request.engagementContext.sourceEngagementPath,
      narrativeThesis: p.meta.narrativeThesis || request.narrativeRequest,
      composerModel: request.model,
      composerToolCalls: toolCallCount,
      sourceCount: {
        external: summary.external,
        uploaded: summary.uploaded,
        analysis: summary.analysis,
        total: summary.total,
      },
      citationCount: countCitations(sections),
    },
    narrativeArc: {
      diagnosis: p.narrativeArc.diagnosis || '',
      guidingPolicy: p.narrativeArc.guidingPolicy || '',
      arcRationale: p.narrativeArc.arcRationale || '',
      sectionMap: p.narrativeArc.sectionMap || sections.map((s, i) => ({
        index: i,
        kind: s.kind as SectionKind,
        thesis: '',
      })),
    },
    sections: sections as PresentationPayload['sections'],
    tokens: resolveBrandTokens(request.brand),
  };

  return finalized;
}

function countCitations(sections: Array<{ data?: unknown }>): number {
  let count = 0;
  for (const s of sections) {
    const data = s.data as Record<string, unknown> | undefined;
    if (!data) continue;
    const cites = data.citations;
    if (Array.isArray(cites)) count += cites.length;
    // Some sections nest citations inside arrays (e.g. quotes[], stats[])
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === 'object') {
            const inner = (item as Record<string, unknown>).citation;
            if (inner) count += 1;
            const innerArr = (item as Record<string, unknown>).citations;
            if (Array.isArray(innerArr)) count += innerArr.length;
          }
        }
      }
    }
  }
  return count;
}
