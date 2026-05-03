// narrativeComposerTools.ts
//
// Tool surface for the narrative composer agent. Six tools — six gates between
// the model and the corpus. The composer is forbidden from citing anything
// it has not retrieved through these tools (enforced at validation time).
//
// Tool schemas follow the Anthropic + OpenAI tool-use contracts simultaneously
// (both providers accept JSON-Schema input_schema). Provider adapters in
// narrativeComposer.ts translate to provider-specific shapes if needed.

import type { Citation } from './presentationTypes';

// ============================================================================
// TOOL DEFINITIONS — what the model sees
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ============================================================================
// PRESENTATION PAYLOAD JSON SCHEMA (used by submit_presentation tool)
// ============================================================================
// Single source of truth for the schema the composer must emit. Used as the
// input_schema of the submit_presentation tool (so Anthropic/OpenAI parse the
// JSON for us) AND copied verbatim into the system prompt so the model sees
// the contract in two reinforcing places.

const SECTION_KIND_ENUM = [
  'hero', 'context', 'themes', 'evidence', 'quotes',
  'personas', 'journey', 'recommendations', 'roadmap',
  'gap_analysis', 'tech_arch', 'team', 'cta',
];

export const PRESENTATION_PAYLOAD_JSONSCHEMA = {
  type: 'object',
  required: ['schemaVersion', 'meta', 'narrativeArc', 'sections'],
  properties: {
    schemaVersion: { const: 1 },
    meta: {
      type: 'object',
      required: ['title', 'subtitle', 'narrativeThesis'],
      properties: {
        title: {
          type: 'string',
          maxLength: 65,
          description: 'Hero title — a complete action-title sentence with data. MUST fit on 2 lines (target 30-55 chars, HARD CAP 65). Run-on sentences will be rejected. Examples: "NUs $2B ambition is capped by fragmented data" (49 chars).',
        },
        subtitle: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 2,
          description: '1-2 hero subtitles, each <= 100 chars. Together with the title these set up the deck.',
        },
        narrativeThesis: {
          type: 'string',
          description: "The user's narrative thesis verbatim.",
        },
      },
    },
    narrativeArc: {
      type: 'object',
      required: ['diagnosis', 'guidingPolicy', 'arcRationale', 'sectionMap'],
      properties: {
        diagnosis: {
          type: 'string',
          maxLength: 400,
          description: 'Rumelt diagnosis — name THE central challenge with specific evidence. Max 400 chars.',
        },
        guidingPolicy: {
          type: 'string',
          maxLength: 400,
          description: 'A strategic decision (NOT a goal). Max 400 chars.',
        },
        arcRationale: {
          type: 'string',
          maxLength: 600,
          description: 'Why this section sequence defends the thesis. Max 600 chars.',
        },
        sectionMap: {
          type: 'array',
          items: {
            type: 'object',
            required: ['index', 'kind', 'thesis'],
            properties: {
              index: { type: 'integer' },
              kind: { type: 'string', enum: SECTION_KIND_ENUM },
              thesis: { type: 'string', maxLength: 200 },
            },
          },
        },
      },
    },
    sections: {
      type: 'array',
      minItems: 6,
      maxItems: 12,
      description: '6-12 sections defending the strategic thesis.',
      items: {
        type: 'object',
        required: ['kind', 'data'],
        properties: {
          kind: { type: 'string', enum: SECTION_KIND_ENUM },
          data: {
            type: 'object',
            description:
              'Section payload. Shape varies by kind: ' +
              'hero={title,subtitle[]}; ' +
              'context={situation,complication,resolution,citations[]}; ' +
              'themes={layout,themes[{name,description,signal,status,citations[],isHero}],patternSignal}; ' +
              'evidence={stats[{value,label,context,source}],convergentInsight}; ' +
              'quotes={quotes[{text (verbatim from extract_quotes),attribution (exact name from source — "Anonymized stakeholder" if anonymous; never invent),role (omit if not in source — never promote/invent titles),source}]}; ' +
              'personas={personas[{name,role,demographics,quote,bio,topGoal,topPainPoint,topMotivation,evidenceConfidence}]}; ' +
              'journey={stages[{phase,duration,emotion,customerAction,frontstage,backstage,support,painPoint,failPoint}]}; ' +
              'recommendations={recommendations[{actionTitle,rationale,supportingActions[],impactMetric (qualitative if no tool-retrieved number — NEVER invent percentages),timeframe (only if tool-retrieved),owner,implication,evidence[]}]}; ' +
              'roadmap={horizons[{horizon,duration,initiatives[{name,problem,successMetric,owner,confidence}]}]}; ' +
              'gap_analysis={gaps[{capability,currentMaturity,targetMaturity,severity,impact}]}; ' +
              'tech_arch={layers[{name,nodes[{name,description}]}]}; ' +
              'team={members[{name,role,description,focus}]}; ' +
              'cta={title,description,email,primaryActionLabel,primaryActionUrl}',
          },
        },
      },
    },
  },
} as const;

export const NARRATIVE_TOOLS: ToolDefinition[] = [
  {
    name: 'search_corpus',
    description: `Semantic search across the research corpus. Returns ranked passages with citations. Use scope to control which sources are searched: 'external_only' for third-party authority, 'uploaded_only' for client-doc grounding, 'both' for balanced retrieval. Prefer specific queries (5-10 words, named entities) over broad ones.`,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. Be specific. Include named entities, metrics, or domain terms when possible.',
        },
        scope: {
          type: 'string',
          enum: ['external_only', 'uploaded_only', 'both'],
          description: 'External research sources, client uploads, or both. Default to "both" unless you have a specific reason to constrain.',
        },
        engagement_goal: {
          type: 'string',
          description: 'Optional: blend retrieval toward this engagement goal (default 0.4 weight). Use when query alone is ambiguous.',
        },
        limit: {
          type: 'integer',
          description: 'Max results. Default 8. Max 20.',
          minimum: 1,
          maximum: 20,
        },
      },
      required: ['query', 'scope'],
    },
  },
  {
    name: 'get_themes',
    description: `Get all themes from the current analysis session with their citations and confidence scores. Always call this BEFORE search_corpus — the work may already be done.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_personas',
    description: `Get all personas from the current analysis session with full enrichment (Cooper goals, JTBD, pain points, motivations, evidence per attribute). Returns empty array if no personas have been generated.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_deliverable',
    description: `Get a specific generated deliverable from the analysis session — journey map, recommendations, roadmap, gap analysis, tech architecture, etc. Returns null if the deliverable has not been generated for this session.`,
    input_schema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: [
            'journey_map',
            'recommendations',
            'roadmap',
            'gap_analysis',
            'tech_arch',
            'tech_audit',
            'competitive',
            'prd',
            'strategic_report',
          ],
        },
      },
      required: ['kind'],
    },
  },
  {
    name: 'extract_quotes',
    description: `Surface verbatim quotes from the corpus matching a semantic filter. Each quote is 10-50 words, attributed when possible, traceable to a chunk citation. Use for the 'quotes' section and any block-quote content.`,
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Semantic description of the quotes you want. e.g. "alumni expressing frustration with university communication"',
        },
        scope: {
          type: 'string',
          enum: ['external_only', 'uploaded_only', 'both'],
        },
        max: {
          type: 'integer',
          description: 'Max quotes. Default 5. Max 10.',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['filter', 'scope'],
    },
  },
  {
    name: 'extract_stats',
    description: `Surface verifiable numeric data points from the corpus matching a semantic filter. Each stat includes the number, what it measures, source name, and citation chunk. Use for the 'evidence' section. Prefer scope='external_only' for evidence sections to maintain third-party authority.`,
    input_schema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Semantic description of the data points you need. e.g. "Gen Z donor giving rates"',
        },
        scope: {
          type: 'string',
          enum: ['external_only', 'uploaded_only', 'both'],
        },
        max: {
          type: 'integer',
          description: 'Max stats. Default 4. Max 8.',
          minimum: 1,
          maximum: 8,
        },
      },
      required: ['filter', 'scope'],
    },
  },
  {
    name: 'submit_presentation',
    description:
      'CALL THIS TOOL WITH THE FINAL PRESENTATION PAYLOAD. This is the ONLY way to deliver your final answer. ' +
      'Do not emit text. Do not narrate. Do not say "I have enough context" or "Let me build". ' +
      'When you have gathered enough evidence and composed the strategic narrative, call submit_presentation ' +
      'with the entire PresentationPayload as your single argument. The arguments object IS the presentation — ' +
      'meta, narrativeArc, and sections all live in the input. After calling this tool, your task is complete.',
    input_schema: PRESENTATION_PAYLOAD_JSONSCHEMA as unknown as ToolDefinition['input_schema'],
  },
];

// ============================================================================
// TOOL INPUT/OUTPUT TYPES — what the executor produces and consumes
// ============================================================================

export type ToolName = typeof NARRATIVE_TOOLS[number]['name'];

export interface SearchCorpusInput {
  query: string;
  scope: 'external_only' | 'uploaded_only' | 'both';
  engagement_goal?: string;
  limit?: number;
}

export interface SearchCorpusResult {
  chunks: Array<{
    chunk_id: string;
    text: string;
    /**
     * Composite display score (0-1) — kept for back-compat with consumers
     * that don't differentiate axes. New code should prefer chunk_relevance
     * + article_relevance below.
     */
    score: number;
    /**
     * Retrieval-time chunk relevance from the LLM rerank pass (0-1).
     * Reflects how well THIS chunk answers the current question. Resets
     * each retrieval call. Null when rerank fell back to identity ordering.
     */
    chunk_relevance?: number | null;
    /**
     * Article-level relevance from collection-time Gemini grading (0-100).
     * Reflects how well the WHOLE article fits the engagement goal. Set
     * once at collection. Null for articles written before grading existed.
     */
    article_relevance?: number | null;
    source: {
      name: string;
      url?: string;
      author?: string;
      publicationDate?: string;
      scope: 'external' | 'uploaded' | 'analysis';
      wikiPath?: string;
    };
  }>;
  total_returned: number;
  query_echoed: string;
  scope_used: string;
}

export interface GetThemesResult {
  themes: Array<{
    name: string;
    description: string;
    quote?: string;
    citations: Citation[];
    isCrossDocument?: boolean;
    status?: string;
  }>;
  count: number;
}

export interface GetPersonasResult {
  personas: Array<{
    name: string;
    role: string;
    demographics?: string;
    quote?: string;
    bio?: string;
    goals?: { life?: string; experience?: string; functional?: string };
    painPoints?: Array<{ description: string; citation?: Citation }>;
    motivations?: Array<{ description: string; citation?: Citation }>;
    confidenceLevel?: string;
  }>;
  count: number;
}

export interface GetDeliverableInput {
  kind: string;
}

export interface GetDeliverableResult {
  kind: string;
  data: unknown | null;
  exists: boolean;
}

export interface ExtractQuotesInput {
  filter: string;
  scope: 'external_only' | 'uploaded_only' | 'both';
  max?: number;
}

export interface ExtractQuotesResult {
  quotes: Array<{
    text: string;
    attribution: string;
    role?: string;
    source_name: string;
    chunk_id: string;
    url?: string;
  }>;
  total_returned: number;
}

export interface ExtractStatsInput {
  filter: string;
  scope: 'external_only' | 'uploaded_only' | 'both';
  max?: number;
}

export interface ExtractStatsResult {
  stats: Array<{
    value: string;            // raw extracted, e.g. "35%", "$9B", "1-2%"
    label: string;             // what it measures
    context?: string;          // surrounding context (1 sentence)
    source_name: string;
    chunk_id: string;
    url?: string;
  }>;
  total_returned: number;
}

// ============================================================================
// EXECUTOR INTERFACE — implementations live in narrativeComposer.ts
// ============================================================================
//
// The composer provides an executor that maps tool names to async functions.
// This shape is stable; the implementation can swap (e.g., during tests, a
// mock executor returns canned data without hitting the proxy).

export interface ToolExecutor {
  search_corpus: (input: SearchCorpusInput) => Promise<SearchCorpusResult>;
  get_themes: () => Promise<GetThemesResult>;
  get_personas: () => Promise<GetPersonasResult>;
  get_deliverable: (input: GetDeliverableInput) => Promise<GetDeliverableResult>;
  extract_quotes: (input: ExtractQuotesInput) => Promise<ExtractQuotesResult>;
  extract_stats: (input: ExtractStatsInput) => Promise<ExtractStatsResult>;
}

// ============================================================================
// CITATION TRACKING — for source-mix discipline enforcement
// ============================================================================
//
// As tool calls return, the composer tracks every (chunk_id, source) pair
// the model has access to. At validation time, every citation in the output
// payload must trace back to a tracked chunk_id. This prevents hallucinated
// citations and enforces the ≥30% external / ≥50% external-themed rules.

export interface CitationTracker {
  /** Register chunks returned by a tool call. */
  register(chunks: Array<{ chunk_id: string; source: { name: string; scope: 'external' | 'uploaded' | 'analysis' } }>): void;
  /** Check whether a citation in the output traces to a registered chunk. */
  has(chunkId: string): boolean;
  /** Stats on the registered chunks for source-mix audit. */
  summary(): {
    total: number;
    external: number;
    uploaded: number;
    analysis: number;
    sources_unique: number;
  };
}

export function createCitationTracker(): CitationTracker {
  const seen = new Map<string, { source: { name: string; scope: 'external' | 'uploaded' | 'analysis' } }>();

  return {
    register(chunks) {
      for (const c of chunks) {
        if (!seen.has(c.chunk_id)) seen.set(c.chunk_id, { source: c.source });
      }
    },
    has(chunkId) {
      return seen.has(chunkId);
    },
    summary() {
      const sources = new Set<string>();
      let external = 0, uploaded = 0, analysis = 0;
      for (const [, v] of seen) {
        sources.add(v.source.name);
        if (v.source.scope === 'external') external++;
        else if (v.source.scope === 'uploaded') uploaded++;
        else analysis++;
      }
      return {
        total: seen.size,
        external,
        uploaded,
        analysis,
        sources_unique: sources.size,
      };
    },
  };
}
