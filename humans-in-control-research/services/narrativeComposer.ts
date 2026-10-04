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
  sanitizeSchemaForGemini,
  type ToolExecutor,
  type CitationTracker,
} from './narrativeComposerTools';
import { wrapWithTracker } from './narrativeComposerExecutor';
import { tryRepairJson } from './aiRouter';
import { NARRATIVE_COMPOSER_PROMPT } from './prompts/narrativeComposerPrompt';
import { UNIVERSAL_TONE_RULES } from './deliverableFrameworks';

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
   * The composer treats these as the PRIMARY source material - packaging the
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

  // 2026-05-10 - Reset the DeepSeek content_filter sticky flag at the start
  // of each compose() call. Filter triggers are prompt-dependent - a fresh
  // edit attempt with rephrased text deserves a fresh shot at DeepSeek
  // before we route it to GPT-5.5.
  _composerDeepSeekContentFilterTripped = false;
  _composerContentFilterWarned = false;

  // Mode detection: when the chat has substantial prior content, we're in
  // PACKAGE mode - the chat IS the source. When the chat is thin, we're in
  // RESEARCH mode - the model retrieves from scratch via tools.
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

  // 2026-05-03 - Anthropic loop removed on this branch (HiC-Gemini-Primary).
  // All composer traffic goes through runOpenAILoop, which routes to either
  // OpenAI or Google's OpenAI-compatible endpoint based on model prefix:
  //   gpt-*    → /api/ai/openai
  //   gemini-* → /api/ai/gemini-compat (Google's OpenAI-format endpoint)
  // The wire format is identical for both, so the same loop logic drives
  // both providers. To restore Anthropic, re-add the runAnthropicLoop branch.
  const loopArgs: LoopArgs = { systemPrompt, narrativeRequest, executor: trackedExecutor, onTool, isPackageMode, model };

  // 2026-05-27 - Cross-provider Claude fallback (Issue 10 fix). When the
  // current provider (Gemini-compat / OpenAI / DeepSeek) exhausts after its
  // in-chain retries, hand the same systemPrompt + narrativeRequest to Claude
  // Sonnet 4.6 in ONE single-shot call. Claude has no tools on this path -
  // it composes the PresentationPayload from training + the conversation
  // context + the systemPrompt's brand/schema/voice rules. Graceful
  // degradation: a deck (less evidence-grounded) instead of an error.
  let rawPayload: unknown;
  try {
    rawPayload = await runOpenAILoop(loopArgs);
  } catch (loopErr) {
    if (_isComposerExhaustionError(loopErr)) {
      const msg = String((loopErr as any)?.message || loopErr).slice(0, 200);
      onProgress?.(`${model} exhausted - falling over to Claude Sonnet 4.6 (single-shot, no corpus search)...`);
      console.warn(`[composer.failover] ${model} exhausted; falling over to Claude Sonnet 4.6: ${msg}`);
      rawPayload = await composeViaClaudeSingleShot(loopArgs);
    } else {
      throw loopErr;
    }
  }

  onProgress?.('Validating schema and finalizing...');
  const validated = validateAndFinalize(rawPayload, request, tracker, toolCallCount);

  return {
    payload: validated,
    toolCallCount,
    durationMs: Date.now() - startedAt,
  };
}

// ============================================================================
// 2026-05-27 - CROSS-PROVIDER CLAUDE FALLBACK (Issue 10 fix)
// ============================================================================
// Detection + single-shot Claude composition for when the primary provider
// exhausts. Mirrors the pattern in corpusChatService._finalizeChatViaClaude
// for the deliverable path. Claude is the ONLY funded escape on this
// platform (ANTHROPIC_API_KEY is the platform's primary required key);
// GPT is currently dry (insufficient_quota). The composer's normal tool
// loop is not ported to Claude here - this is graceful degradation that
// produces a coherent deck instead of an outright error.

function _isComposerExhaustionError(e: unknown): boolean {
  const msg = String((e as any)?.message || e || '');
  return /insufficient[_ ]?quota|HTTP 429|rate.?limit|resource exhausted|quota exhausted|content[_ ]?filter|ResponsibleAI|block action|HTTP 50[234]|gateway error|temporarily overloaded|after \d+ attempts|all models exhausted/i.test(msg);
}

async function composeViaClaudeSingleShot(args: LoopArgs): Promise<unknown> {
  const { callAIWithRetry } = await import('./aiRetryClient');

  // Append an output-format directive to the system prompt. We do NOT modify
  // the brand / voice / schema rules already baked in - we just tell Claude
  // it's on the fallback path and how to emit the payload without tools.
  const fallbackSystem = `${args.systemPrompt}

================================================================
ANTHROPIC FALLBACK PATH (2026-05-27)
================================================================
You are operating as the cross-provider fallback. Corpus-search tools are
NOT available here. Compose the PresentationPayload using:
1. The narrative request and any prior conversation context.
2. Your own knowledge - but ONLY where it is defensible. Where you would
   normally cite the corpus, prefer naming the institution or framework
   directly without inventing a chunk id.
3. All brand, schema, voice, and banned-phrase rules from the system
   prompt above - they remain in force.

OUTPUT FORMAT:
Return EXACTLY one JSON object inside a single \`\`\`json code fence. No
prose before or after the fence. The JSON must validate against the
PresentationPayload schema (\`meta\` + \`sections\` with 6 to 16 items;
each section is \`{ kind, data }\`; \`kind\` is one of the documented
section kinds; \`data\` follows the per-kind shape described above).`;

  const messages = [
    { role: 'user' as const, content: args.narrativeRequest },
  ];

  const data: any = await callAIWithRetry('anthropic', {
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    system: fallbackSystem,
    messages,
    temperature: 0.3,
  }, {
    label: 'Composer (Claude fallback)',
    maxAttempts: 2,
    requestTimeoutMs: 300_000,
  });

  const blocks = Array.isArray(data?.content) ? data.content : [];
  const text = blocks.map((b: any) => (typeof b?.text === 'string' ? b.text : '')).join('').trim();
  if (!text) {
    throw new Error(`Claude composer fallback returned empty content (stop_reason=${data?.stop_reason || 'unknown'})`);
  }

  // Strip code fence if present; otherwise extract the outermost {...}.
  let body = text;
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    body = fence[1].trim();
  } else {
    const fb = body.indexOf('{');
    const lb = body.lastIndexOf('}');
    if (fb >= 0 && lb > fb) body = body.slice(fb, lb + 1);
  }
  const repaired = tryRepairJson(body);
  try {
    return JSON.parse(repaired);
  } catch (parseErr: any) {
    throw new Error(
      `Claude composer fallback produced unparseable JSON: ${parseErr?.message || parseErr}. ` +
      `Head: ${repaired.slice(0, 200)}`
    );
  }
}

// ============================================================================
// SYSTEM PROMPT ASSEMBLY
// ============================================================================

// Prompt template is now inlined (see narrativeComposerPrompt.ts).
// Skills are fetched at runtime - /skills/ is volume-mounted into the
// research-generator nginx container and serves correctly.
const NXT_VISUAL_RENDERER_SKILL_PATH = '/skills/nxt-visual-renderer/SKILL.md';
// Stage 6.3 (2026-10-01): deck-narrative-composer was folded into deck-composer (section 8) and deleted.
const DECK_NARRATIVE_COMPOSER_SKILL_PATH = '/skills/deck-composer/SKILL.md';

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
 * retrieval - e.g., "competitive analysis OUTSIDE of Northeastern", "find
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
  // asking for - retrieval is mandatory.
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
 * uses to lock the topic - preventing the model from drifting off into
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
  // for why - the previous fetch path was broken by nginx SPA-fallback).
  // Skill files are still fetched because /skills/ IS volume-mounted in the
  // Docker container and serves correctly.
  const template = NARRATIVE_COMPOSER_PROMPT;
  const [visualRenderer, deckNarrative] = await Promise.all([
    fetchText(NXT_VISUAL_RENDERER_SKILL_PATH).catch(() => '(visual-renderer skill unavailable)'),
    fetchText(DECK_NARRATIVE_COMPOSER_SKILL_PATH).catch(() => '(deck-composer skill unavailable)'),
  ]);

  const tokens = resolveBrandTokens(request.brand);
  const tokensSummary = `accents: ${tokens.accentPrimary}/${tokens.accentSecondary}/${tokens.accentTertiary}; bg: ${tokens.bgPrimary}; font: ${tokens.fontDisplay}`;

  const priorConversationBlock = formatPriorConversation(request.priorConversation);
  const modeHeader = buildModeHeader(modeContext.isPackageMode, modeContext.topicAnchor);
  const topicAnchorBlock = modeContext.topicAnchor || '(no prior conversation - fresh research request)';

  const filled = template
    .replace(/{{MODE_HEADER}}/g, modeHeader)
    .replace(/{{TOPIC_ANCHOR_BLOCK}}/g, topicAnchorBlock)
    .replace(/{{BRAND_NAME}}/g, brandName(request.brand))
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

  // 2026-05-08 - Prepend the universal tone rules. DeepSeek (current
  // composer model) defaults to deficit-only / catastrophizing framing
  // when given Rumelt's diagnosis-first structure. The tone block at the
  // very top of the prompt forces balanced framing, opportunity-led
  // section leads, pragmatic action verbs, and bans catastrophizing
  // metaphors. The composer's existing Rumelt + Minto discipline is
  // preserved underneath.
  return `${UNIVERSAL_TONE_RULES}\n\n${filled}`;
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
    `#  CRITICAL: THE CHAT CONVERSATION BELOW IS YOUR ONLY SOURCE.`,
    `# DO NOT CHANGE TOPIC. DO NOT RESEARCH FROM SCRATCH.`,
    ``,
    `The user has been developing this narrative with you in the AI Analyst chat.`,
    `Your task is NOT to compose a new strategic narrative. Your task is to STRUCTURE`,
    `the analyst's prior responses into the PresentationPayload format and call`,
    `submit_presentation. Treat the conversation as the authoritative draft.`,
    ``,
    `## TOPIC LOCK (the deck MUST be about this - not anything else)`,
    ``,
    topicAnchor || '(missing)',
    ``,
    `## TOOL USE IN PACKAGE MODE`,
    ``,
    ` CRITICAL CORPUS HYGIENE: The wiki at /api/wiki/fetch-articles contains content`,
    `from ALL engagements - past and present. A "challenges and opportunities" query`,
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
    `Do not paraphrase or "improve" them - the user has already approved them.`,
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
    return '(no prior conversation - this is a fresh narrative request; use tools to research from scratch)';
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

// 2026-10-01 - three brands resolve through ONE switch (NXT default, NU, DECIEM). DECIEM is the
// third brand mode; its default theme is dark (hashtagParser: only NU defaults to light).
function brandName(brand: BrandVariant): string {
  if (brand === 'NU') return 'Northeastern University Advancement';
  if (brand === 'DECIEM') return 'DECIEM';
  return 'NXT Humans';
}

function brandDescription(brand: BrandVariant): string {
  if (brand === 'NU') {
    return 'Northeastern University. Advancement, alumni engagement, donor relations. Brand voice: institutional gravitas, Huskies pride, modern but grounded. Visual: near-black + Huskies red, Archivo display.';
  }
  if (brand === 'DECIEM') {
    // CSS variables resolve from BRAND_TOKENS.DECIEM (presentationTypes.ts), never from literals here.
    const t = resolveBrandTokens('DECIEM');
    return `DECIEM, The Abnormal Beauty Company. Skincare and beauty retail, ingredient-literal, direct-to-customer. Brand voice: plain-spoken, product-literal, no marketing gloss. Visual: pure black canvas (--bg-primary ${t.bgPrimary}) with white type (--text-primary ${t.textPrimary}), pink accent (--accent-primary ${t.accentPrimary}), cyan (--accent-secondary ${t.accentSecondary}) and purple (--accent-tertiary ${t.accentTertiary}) pops, thin line-art, no gradients; ${t.fontDisplay} Bold UPPERCASE headlines, ${t.fontBody} body, ${t.fontMono} labels. Dark theme by default.`;
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
          // Lengths raised for scrolling-format depth - diagnosis and policy
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
        // Raised to 16 - prompt now targets 10-12 sections for engagements
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
// 2026-05-03 - Anthropic loop / proxy URL / message types removed on this
// branch (HiC-Gemini-Primary). All composer traffic flows through
// runOpenAILoop, which dispatches to OpenAI or Google's OpenAI-compatible
// endpoint based on model prefix.

const OPENAI_PROXY_URL = 'http://127.0.0.1:5012/api/ai/openai';
const GEMINI_OPENAI_COMPAT_PROXY_URL = 'http://127.0.0.1:5012/api/ai/gemini-compat';
// 2026-05-05 - Azure DeepSeek-V4-Flash. OpenAI-compatible chat-completions
// schema, accessed via the proxy at /api/ai/deepseek (auth uses api-key
// header - proxy handles that detail). 256K context, tool-use confirmed
// against discriminated-union schema.
const DEEPSEEK_PROXY_URL = 'http://127.0.0.1:5012/api/ai/deepseek';
// 8 iterations × ~1.7 parallel tool calls per turn = ~14 actual tool invocations
// in the worst case. Anything more bloats the context past the point where the
// model can produce a clean submit_presentation payload - that was the failure
// mode in the 20-tool-call run that emitted a meta-less payload.
const COMPOSER_MAX_ITERATIONS = 8;
const COMPOSER_MAX_TOKENS = 16000;
// 2026-05-08 - Bumped from 180s → 420s (7 min). The per-call AbortSignal
// fired during submit_presentation on heavy composes (7-slide payload with
// strict source-restriction directives + UNIVERSAL_TONE_RULES + USER
// OVERRIDE block). The proxy itself waits 600s for DeepSeek; only the
// browser-side timeout was binding. 420s gives the model room to compose
// large strict-constraint payloads in one shot without aborting.
const COMPOSER_REQUEST_TIMEOUT_MS = 420_000;
// Force submit at iter 5 in research mode (was 8). Combined with MAX=8 this
// guarantees at most 5 rounds of retrieval before the model is locked to
// submit_presentation only. Package mode still force-converges at iter 2.
const COMPOSER_FORCE_SUBMIT_AT_ITER = 5;

// ============================================================================
// HTTP RETRY HELPER - 3 attempts with exponential backoff for transient errors
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
      // 2026-05-20 - Added 'Failed to fetch' (Chrome TypeError) and
      // 'NetworkError' (Firefox) and 'AbortError' (signal-aborted) to the
      // transient set. These three are how browsers surface mid-flight TCP
      // resets / proxy-side connection drops on long composer runs.
      const transient =
        err.isTransient ||
        status === 429 ||
        status === 500 || status === 502 || status === 503 || status === 504 ||
        /ECONNRESET|ETIMEDOUT|ConnectError|fetch failed|network|Failed to fetch|NetworkError|AbortError|The operation was aborted/i.test(err.message || '');
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
   * 2026-05-03 - Model id passed by the dispatcher. runOpenAILoop accepts
   * either gpt-* (routed to OpenAI) or gemini-* (routed to Google's
   * OpenAI-compatible endpoint). Optional: omitted callers default to gpt-5.5.
   */
  model?: string;
}

// Force-convergence threshold:
//   Package mode: after 1 turn, force submit (the chat IS the source - no
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
  // 2026-05-04 - Per-compose tool-call dedup cache. Lives for the duration
  // of this loop only; identical (tool, args) calls return the cached
  // promise instead of re-executing.
  const toolCache: ToolCache = new Map();
  const messages: OpenAIMessage[] = [
    { role: 'system', content: args.systemPrompt },
    { role: 'user', content: args.narrativeRequest },
  ];

  // 2026-05-27 - For Gemini models, strip JSON-Schema keywords Gemini's
  // function-declaration parser rejects (proven root cause of the submit_
  // presentation 400 INVALID_ARGUMENT). DeepSeek/GPT get the full schema.
  const isGeminiComposer = (args.model || 'gemini-3.5-flash').startsWith('gemini-');
  const tools = NARRATIVE_TOOLS.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: isGeminiComposer ? sanitizeSchemaForGemini(t.input_schema) : t.input_schema,
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

    // 2026-05-27 - Gemini's OpenAI-compat layer 400s (INVALID_ARGUMENT) on
    // tool_choice:"required" once the conversation has multi-turn tool history
    // (proven by the composer e2e test: round 0 forced-function worked, the
    // next "required" round failed). It handles "auto" reliably. The
    // retrieval-floor guard + the forced-function rounds (0 and submit) still
    // drive tool usage, so "auto" on the middle rounds is safe. DeepSeek/GPT
    // keep "required" (works there).
    const isGeminiLoop = (args.model || 'gemini-3.5-flash').startsWith('gemini-');
    const anyToolChoice = isGeminiLoop ? 'auto' : 'required';

    if (!args.isPackageMode && iter === 0) {
      toolChoice = { type: 'function', function: { name: 'search_corpus' } };
    } else if (iter >= forceAt) {
      toolChoice = { type: 'function', function: { name: 'submit_presentation' } };
    } else if (!args.isPackageMode && retrievalCount < MIN_RETRIEVALS_RESEARCH) {
      toolChoice = anyToolChoice;
      availableTools = tools.filter(t => t.function.name !== 'submit_presentation');
    } else {
      toolChoice = anyToolChoice;
    }

    // 2026-05-27 - Default loop model is funded Gemini 3.5 Flash (was gpt-5.5,
    // now out of quota). The section schema was flattened so Gemini-compat
    // accepts it. callers pass args.model from parseModel (defaults to gemini).
    const loopModel = args.model || 'gemini-3.5-flash';
    // 2026-05-04 - GPT-5 family deprecated `max_tokens` and requires
    // `max_completion_tokens`. Gemini's OpenAI-compat endpoint still
    // accepts `max_tokens` natively. Branch by model prefix.
    const tokenCapField = loopModel.startsWith('gpt-') ? 'max_completion_tokens' : 'max_tokens';
    const response = await callOpenAI({
      model: loopModel,
      messages,
      tools: availableTools,
      tool_choice: toolChoice,
      [tokenCapField]: COMPOSER_MAX_TOKENS,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error('OpenAI returned no choices');

    // 2026-05-27 - Re-append the assistant message, preserving Gemini's
    // provider fields (extra_content.google.thought_signature is REQUIRED on
    // re-send, proven by the composer e2e test) but coercing a NULL content to
    // an empty string. Gemini's OpenAI-compat layer rejects an assistant
    // message with `content: null` + tool_calls in multi-turn history with a
    // generic 400 INVALID_ARGUMENT (round 0 forced-function worked; the next
    // `tool_choice:"required"` round failed once null-content history existed).
    const assistantMsg: any = choice.message;
    if (assistantMsg && assistantMsg.content == null && Array.isArray(assistantMsg.tool_calls) && assistantMsg.tool_calls.length) {
      assistantMsg.content = '';
    }
    messages.push(assistantMsg);

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
      // Silent-mode short-circuit: if model called submit_presentation, parse
      // its arguments and return as the final payload.
      const submitCall = choice.message.tool_calls.find(tc => tc.function.name === 'submit_presentation');
      if (submitCall) {
        // Defense-in-depth: deep-strip any "EVIDENCE GAP" / "Evidence Gap" /
        // "TBD" / "[needs baseline]" tokens from every string in the payload
        // before returning it. The composer prompt forbids these tokens; this
        // layer guarantees they never reach the renderer or wiki archive.
        const finalize = async (raw: any) => {
          try {
            const { stripQAAnnotationsDeep, stripEmDashes, stripEmoji } = await import('./slidePostProcessor');
            // stripQAAnnotationsDeep covers QA-annotations + meta-narration +
            // process-references, but NOT em-dashes or emoji - which were leaking
            // into the :5014 renderer + PPTX (2026-05-31). Add a deep pass for
            // those so #presentation gets the same hard bans as every other path.
            let cleaned = stripQAAnnotationsDeep(raw);
            const deepStrip = (v: any): any => {
              if (typeof v === 'string') return stripEmoji(stripEmDashes(v));
              if (Array.isArray(v)) return v.map(deepStrip);
              if (v && typeof v === 'object') {
                for (const k of Object.keys(v)) { if (!k.startsWith('_')) v[k] = deepStrip(v[k]); }
                return v;
              }
              return v;
            };
            return deepStrip(cleaned);
          } catch (e) { return raw; }
        };
        try {
          const payload = JSON.parse(submitCall.function.arguments);
          const cleaned = await finalize(payload);
          args.onTool('submit_presentation', { sections: cleaned?.sections?.length }, 'final payload submitted');
          return cleaned;
        } catch (e: unknown) {
          // Try repair once
          try {
            const payload = JSON.parse(tryRepairJson(submitCall.function.arguments));
            const cleaned = await finalize(payload);
            args.onTool('submit_presentation', { sections: cleaned?.sections?.length }, 'final payload submitted (repaired)');
            return cleaned;
          } catch {
            // 2026-05-04 - Don't throw fatally. Push a corrective user message
            // and let the model re-emit on the next iteration. Composer's
            // MAX_MISSING_SUBMIT_RETRIES (~2) will eventually give up if the
            // model keeps emitting unparseable JSON, but in practice one
            // corrective turn is usually enough to converge.
            const msg = e instanceof Error ? e.message : String(e);
            const head = submitCall.function.arguments.slice(0, 200);
            console.warn(`[composer] submit_presentation JSON unparseable (iter ${iter}): ${msg}. First 200 chars: ${head}`);
            messages.push({
              role: 'tool',
              tool_call_id: submitCall.id,
              name: 'submit_presentation',
              content: `(error: your submit_presentation arguments were not valid JSON: ${msg}. The first 200 chars of what you sent were: "${head}". Re-emit the FULL PresentationPayload as valid JSON now. Make sure every key is double-quoted and every string value is properly escaped.)`,
            });
            missingSubmitRetries += 1;
            if (missingSubmitRetries >= MAX_MISSING_SUBMIT_RETRIES) {
              throw new Error(`Composer: submit_presentation JSON unparseable after ${MAX_MISSING_SUBMIT_RETRIES} retries. Last attempt head: ${head}`);
            }
            continue;
          }
        }
      }

      // Execute retrieval tools and continue
      for (const tc of choice.message.tool_calls) {
        const summary = await executeToolForOpenAI(args.executor, tc, args.onTool, toolCache);
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

// 2026-05-10 - Sticky DeepSeek content_filter fallback. Set to true the
// first time Azure DeepSeek's Microsoft content management policy
// rejects a prompt (HTTP 422 from the proxy). For the rest of the
// compose() session, every deepseek-* dispatch silently rewrites the
// model to gpt-5.5 and routes to /api/ai/openai. Reset at the start of
// each compose() so a new edit attempt gets a fresh shot at DeepSeek
// (the filter is prompt-dependent - rephrasing may pass).
let _composerDeepSeekContentFilterTripped = false;
let _composerContentFilterWarned = false;

async function callOpenAI(body: Record<string, unknown>): Promise<OpenAIResponse> {
  const modelStr = String(body.model || '').toLowerCase();

  // Sticky fallback: route subsequent deepseek-* calls in this session to
  // funded Gemini once Azure's Microsoft content filter has tripped, rather
  // than wasting another withRetry budget on the same blocked prompt.
  // 2026-05-27 - target changed gpt-5.5 → gemini-3.5-flash (GPT is out of
  // quota; Gemini is funded, healthy, and not Azure-content-filtered).
  if (modelStr.startsWith('deepseek-') && _composerDeepSeekContentFilterTripped) {
    body.model = 'gemini-3.5-flash';
    return callOpenAI(body); // recurse - dispatches to Gemini-compat branch below
  }

  let url: string;
  let providerLabel: string;
  if (modelStr.startsWith('deepseek-')) {
    url = DEEPSEEK_PROXY_URL;
    providerLabel = 'DeepSeek';
  } else if (modelStr.startsWith('gemini-')) {
    url = GEMINI_OPENAI_COMPAT_PROXY_URL;
    providerLabel = 'Gemini-compat';
  } else {
    url = OPENAI_PROXY_URL;
    providerLabel = 'OpenAI';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-openai-endpoint': 'chat',
  };

  try {
    return await withRetry(async () => {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }, COMPOSER_REQUEST_TIMEOUT_MS);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        // 2026-05-27 - DIAGNOSTIC: on a 400, dump a STRUCTURAL summary of the
        // request so we can pinpoint which argument Gemini-compat rejects
        // (Google returns a generic "invalid argument" with no field).
        if (res.status === 400 && (process.env as any).COMPOSER_DEBUG) {
          try {
            const msgs: any[] = (body as any).messages || [];
            const summary = msgs.map((m, i) => ({
              i, role: m.role,
              contentType: m.content == null ? 'NULL' : typeof m.content,
              contentLen: typeof m.content === 'string' ? m.content.length : (m.content == null ? 0 : -1),
              hasToolCalls: Array.isArray(m.tool_calls) ? m.tool_calls.length : 0,
              toolCallExtraKeys: Array.isArray(m.tool_calls) ? m.tool_calls.map((tc: any) => Object.keys(tc)).flat() : [],
              tool_call_id: m.tool_call_id || undefined,
              extraTopKeys: Object.keys(m).filter(k => !['role', 'content', 'tool_calls', 'tool_call_id', 'name'].includes(k)),
            }));
            console.error('[composer.diag] 400 request structure:', JSON.stringify({
              model: (body as any).model,
              tool_choice: (body as any).tool_choice,
              toolCount: ((body as any).tools || []).length,
              messages: summary,
            }, null, 2));
          } catch (diagErr) { console.error('[composer.diag] dump failed', diagErr); }
        }
        const err: RetriableHttpError = new Error(`${providerLabel} API ${res.status}: ${errText.slice(0, 300)}`);
        err.status = res.status;
        // content_filter is non-retryable - the same prompt will trigger the
        // same filter on every retry. Mark it so withRetry surfaces immediately
        // and the outer try/catch can fall back. 2026-05-27 - Azure returns
        // this as BOTH 400 and 422 depending on path; match either.
        if ((res.status === 422 || res.status === 400) && /content_filter|ResponsibleAI|block action/i.test(errText)) {
          err.isTransient = false;
          // Trip the sticky flag so the next deepseek-* dispatch this session
          // auto-routes to Gemini instead of re-hitting the filtered provider.
          if (modelStr.startsWith('deepseek-')) _composerDeepSeekContentFilterTripped = true;
        }
        throw err;
      }
      return res.json();
    }, 'callOpenAI');
  } catch (e: unknown) {
    const err = e as RetriableHttpError;
    const isDeepSeek = providerLabel === 'DeepSeek';
    const isContentFilter = err.status === 422 && /content_filter/i.test(err.message || '');
    if (isDeepSeek && isContentFilter) {
      _composerDeepSeekContentFilterTripped = true;
      if (!_composerContentFilterWarned) {
        _composerContentFilterWarned = true;
        console.warn(
          `[composer] Azure DeepSeek content filter rejected the prompt. Falling back to GPT-5.5 for the rest of this compose() session. ` +
          `Try rephrasing the edit instruction with less charged language to use DeepSeek again.`,
        );
      }
      body.model = 'gpt-5.5';
      return callOpenAI(body);
    }
    throw e;
  }
}

// 2026-05-04 - Per-compose() tool-call dedup cache. The composer can fire
// `search_corpus` 4-6 times with identical query strings across iterations,
// each time bloating context and pushing the model toward the meta-less-
// submit failure mode (May 2 incident). Caching identical (tool, args)
// pairs collapses repeats into one execution, cuts context bloat, and
// ensures the model sees consistent results across turns.
type ToolCache = Map<string, Promise<{ serialized: string; isError: boolean }>>;

async function executeToolForOpenAI(
  executor: ToolExecutor,
  call: OpenAIToolCall,
  onTool: LoopArgs['onTool'],
  cache: ToolCache,
): Promise<{ serialized: string; isError: boolean }> {
  // 2026-05-05 - Tolerate empty / whitespace `arguments` strings.
  // DeepSeek V4 Flash emits arguments as "" (instead of "{}") for tools
  // with no required parameters (e.g. get_themes, get_personas, the
  // arg-less retrieval tools). OpenAI's strict mode emits "{}" for the
  // same case. Treat both as the empty-object {}.
  const rawArgs = (call.function.arguments || '').trim();
  const argsForKey = rawArgs || '{}';
  const cacheKey = `${call.function.name}::${argsForKey}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    // Re-await the cached promise so we can inspect isError. Don't return
    // an error result from the cache - let the model see a fresh attempt
    // (errors should not be sticky; the prior failure may have been
    // transient or a different tool path can succeed).
    const cachedResult = await cached;
    if (!cachedResult.isError) {
      onTool(call.function.name, rawArgs, '(dedup hit - cached result)');
      return cachedResult;
    }
    // Error path - fall through to re-execute. Cache key is overwritten
    // below so subsequent identical calls also re-execute until success.
  }
  const promise = (async () => {
    try {
      const args = rawArgs ? JSON.parse(rawArgs) : {};
      const result = await dispatchTool(executor, call.function.name, args);
      onTool(call.function.name, args, summarizeResult(call.function.name, result));
      return { serialized: JSON.stringify(result), isError: false };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onTool(call.function.name, rawArgs, `error: ${msg}`);
      return { serialized: JSON.stringify({ error: msg }), isError: true };
    }
  })();
  cache.set(cacheKey, promise);
  return promise;
}

// ============================================================================
// TOOL DISPATCH - single switch shared by both providers
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
        console.warn(`[narrativeComposer] Model double-encoded '${key}' as JSON string - unstringifying.`);
        (p as Record<string, unknown>)[key] = parsed;
        unstringifiedAny = true;
      }
    }
  }
  if (unstringifiedAny) {
    // eslint-disable-next-line no-console
    console.warn('[narrativeComposer] Recovered from JSON stringification - payload should validate now.');
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
          console.warn(`[narrativeComposer] Model wrapped payload in '${wrapper}' key - unwrapping.`);
          p = c as Partial<PresentationPayload> & { [k: string]: unknown };
          break;
        }
      }
    }
  }

  // Schema shape validation - enforce required top-level fields with diagnostics
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
    console.warn('[narrativeComposer] Model did not produce narrativeArc - synthesizing minimal block.');
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

  // 2026-05-04 - Per-kind data-shape validation. Drops sections whose `data`
  // doesn't have the minimum required content for the section kind. This
  // catches schema slippage where the model emits e.g. {kind:'recommendations',
  // data:{themes:[...]}} (cross-kind contamination) or {kind:'hero', data:{}}
  // (empty data - was the Gemini-via-OpenAI-compat failure mode).
  // The composer's submit_presentation tool now uses a discriminated-union
  // JSON Schema that should prevent most of this - this validator is
  // defense-in-depth.
  const SHAPE_REQUIRED_FIELDS: Record<string, string[]> = {
    hero: ['title'],
    context: ['situation', 'complication', 'resolution'],
    cta: ['title'],
  };
  const SHAPE_REQUIRED_ARRAYS: Record<string, string[]> = {
    themes: ['themes'],
    evidence: ['stats'],
    quotes: ['quotes'],
    personas: ['personas'],
    journey: ['stages'],
    recommendations: ['recommendations', 'items'],   // accept either
    roadmap: ['horizons'],
    gap_analysis: ['gaps'],
    tech_arch: ['layers'],
    team: ['members'],
    competitive: ['layers'],
  };
  // 2026-05-27 - Salvage the hero (title slide) before validation. The model
  // sometimes emits {kind:'hero', data:{...no title...}} while still providing
  // p.meta.title; dropping the hero loses the deck's title slide entirely.
  // Backfill the hero title from meta.title (or the narrative request) so the
  // title slide survives instead of being dropped for an empty `title` field.
  try {
    const heroSec = (p.sections as Array<{ kind: string; data: any }>).find(s => s?.kind === 'hero');
    if (heroSec && heroSec.data && typeof heroSec.data === 'object') {
      const t = heroSec.data.title;
      if (typeof t !== 'string' || t.trim().length === 0) {
        const fallback = (p.meta?.title && String(p.meta.title).trim())
          || (request.narrativeRequest && String(request.narrativeRequest).trim())
          || (request.engagementContext?.engagementGoal && String(request.engagementContext.engagementGoal).trim())
          || '';
        if (fallback) heroSec.data.title = fallback;
      }
    }
  } catch { /* non-blocking salvage */ }

  const validatedSections = (p.sections as Array<{ kind: string; data: unknown }>).filter((s, i) => {
    const kind = s?.kind;
    const data = s?.data;
    if (!kind || !data || typeof data !== 'object' || Array.isArray(data)) {
      console.warn(`[narrativeComposer] Section[${i}] kind=${JSON.stringify(kind)} dropped: data missing or not an object`);
      return false;
    }
    const dataObj = data as Record<string, unknown>;
    const reqFields = SHAPE_REQUIRED_FIELDS[kind];
    if (reqFields) {
      for (const field of reqFields) {
        const v = dataObj[field];
        if (typeof v !== 'string' || v.trim().length === 0) {
          console.warn(`[narrativeComposer] Section[${i}] kind=${JSON.stringify(kind)} dropped: required field ${JSON.stringify(field)} missing or empty`);
          return false;
        }
      }
    }
    const reqArrays = SHAPE_REQUIRED_ARRAYS[kind];
    if (reqArrays) {
      const hasAtLeastOne = reqArrays.some(field => Array.isArray(dataObj[field]) && (dataObj[field] as unknown[]).length > 0);
      if (!hasAtLeastOne) {
        console.warn(`[narrativeComposer] Section[${i}] kind=${JSON.stringify(kind)} dropped: none of [${reqArrays.join(', ')}] is a non-empty array`);
        return false;
      }
    }
    return true;
  });

  if (validatedSections.length === 0) {
    throw new Error('Payload had sections but ALL of them failed per-kind shape validation. Model emitted malformed data shapes.');
  }
  if (validatedSections.length < (p.sections as unknown[]).length) {
    console.warn(`[narrativeComposer] Per-kind validator dropped ${(p.sections as unknown[]).length - validatedSections.length} section(s) of ${(p.sections as unknown[]).length} for shape mismatches.`);
  }
  p.sections = validatedSections as never;

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
