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
  'gap_analysis', 'tech_arch', 'team', 'competitive', 'cta',
] as const;

// 2026-05-04 — Per-kind data shapes. The composer schema uses these via
// `oneOf` discriminated by `kind` so the model knows EXACTLY what fields
// each section requires. This single change collapses ~5 historical bugs
// where models emitted variant field names (recommendations vs items,
// horizons[].initiatives vs horizons[].items, actionTitle vs title,
// horizon vs name, etc.). Renderer-side tolerance is retained as a
// belt-and-suspenders fallback for old presentation JSON files.
//
// Each shape lists ONLY fields the renderer actually consumes. Extra
// fields are allowed (additionalProperties default true at JSON Schema
// level) so models can include `narrative`, `convergentInsight`, etc.
// without rejection.
const SECTION_DATA_SHAPES: Record<string, Record<string, unknown>> = {
  hero: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', maxLength: 120 },
      subtitle: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      visualStyle: { type: 'object' },
      citations: { type: 'array', items: { type: 'string' } },
    },
  },
  context: {
    type: 'object',
    required: ['situation', 'complication', 'resolution'],
    properties: {
      title: { type: 'string', maxLength: 200 },
      situation: { type: 'string', maxLength: 1200 },
      complication: { type: 'string', maxLength: 1200 },
      resolution: { type: 'string', maxLength: 1200 },
      benchmarks: { type: 'array' },
      quote: { type: 'object' },
      convergentInsight: { type: 'string' },
      narrative: { type: 'string' },
      citations: { type: 'array' },
    },
  },
  themes: {
    type: 'object',
    required: ['themes'],
    properties: {
      title: { type: 'string', maxLength: 200 },
      layout: { type: 'string', enum: ['cluster', 'spotlight', 'arc', 'mosaic', 'theme-cluster'] },
      themes: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            signal: { type: 'string' },
            status: { type: 'string' },
            citations: { type: 'array' },
            isHero: { type: 'boolean' },
          },
        },
      },
      narrative: { type: 'string' },
      patternSignal: { type: 'string' },
      convergentInsight: { type: 'string' },
      citations: { type: 'array' },
    },
  },
  evidence: {
    type: 'object',
    required: ['stats'],
    properties: {
      title: { type: 'string' },
      narrative: { type: 'string' },
      stats: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['value', 'label', 'source'],
          properties: {
            value: { type: 'string' },
            label: { type: 'string' },
            context: { type: 'string' },
            source: { type: 'string' },
          },
        },
      },
      patternSignal: { type: 'string' },
      convergentInsight: { type: 'string' },
      citations: { type: 'array' },
    },
  },
  quotes: {
    type: 'object',
    required: ['quotes'],
    properties: {
      title: { type: 'string' },
      narrative: { type: 'string' },
      quotes: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['text', 'attribution', 'source'],
          properties: {
            text: { type: 'string' },
            attribution: { type: 'string' },
            role: { type: 'string' },
            source: { type: 'string' },
            type: { type: 'string' },
          },
        },
      },
      implication: { type: 'string' },
      citations: { type: 'array' },
    },
  },
  personas: {
    type: 'object',
    required: ['personas'],
    properties: {
      personas: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'role'],
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            demographics: { type: 'string' },
            quote: { type: 'string' },
            bio: { type: 'string' },
            topGoal: { type: 'string' },
            topPainPoint: { type: 'string' },
            topMotivation: { type: 'string' },
            evidenceConfidence: { type: 'string' },
          },
        },
      },
    },
  },
  journey: {
    type: 'object',
    required: ['stages'],
    properties: {
      stages: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['phase'],
          properties: {
            phase: { type: 'string' },
            duration: { type: 'string' },
            emotion: { type: 'string' },
            customerAction: { type: 'string' },
            frontstage: { type: 'string' },
            backstage: { type: 'string' },
            support: { type: 'string' },
            painPoint: { type: 'string' },
            failPoint: { type: 'boolean' },
          },
        },
      },
    },
  },
  recommendations: {
    type: 'object',
    required: ['recommendations'],
    properties: {
      title: { type: 'string' },
      narrative: { type: 'string' },
      // CANONICAL: `recommendations` array. Model MUST use this key.
      // Renderer also accepts `items` for back-compat with prior payloads.
      recommendations: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['actionTitle', 'rationale'],
          properties: {
            // CANONICAL: actionTitle. NOT `title`.
            actionTitle: { type: 'string' },
            // CANONICAL: rationale. NOT `description` or `outcome`.
            rationale: { type: 'string' },
            // CANONICAL: supportingActions[] of strings. NOT `actions` or `steps`.
            supportingActions: { type: 'array', items: { type: 'string' } },
            impactMetric: { type: 'string' },
            timeframe: { type: 'string' },
            owner: { type: 'string' },
            implication: { type: 'string' },
            evidence: { type: 'array' },
          },
        },
      },
      convergentInsight: { type: 'string' },
      citations: { type: 'array' },
    },
  },
  roadmap: {
    type: 'object',
    required: ['horizons'],
    properties: {
      title: { type: 'string' },
      narrative: { type: 'string' },
      horizons: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['horizon', 'initiatives'],
          properties: {
            // CANONICAL: horizon (NOW|NEXT|LATER). NOT `name`.
            horizon: { type: 'string' },
            // CANONICAL: duration. NOT `timeframe`.
            duration: { type: 'string' },
            // CANONICAL: initiatives[]. NOT `items`.
            initiatives: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  problem: { type: 'string' },
                  successMetric: { type: 'string' },
                  owner: { type: 'string' },
                  confidence: { type: 'string', enum: ['high', 'medium', 'speculative'] },
                },
              },
            },
          },
        },
      },
      convergentInsight: { type: 'string' },
      citations: { type: 'array' },
    },
  },
  gap_analysis: {
    type: 'object',
    required: ['gaps'],
    properties: {
      gaps: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['capability'],
          properties: {
            capability: { type: 'string' },
            currentMaturity: { type: ['integer', 'string'] },
            targetMaturity: { type: ['integer', 'string'] },
            severity: { type: 'string' },
            impact: { type: 'string' },
          },
        },
      },
    },
  },
  tech_arch: {
    type: 'object',
    required: ['layers'],
    properties: {
      layers: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'nodes'],
          properties: {
            name: { type: 'string' },
            nodes: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  team: {
    type: 'object',
    required: ['members'],
    properties: {
      members: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['role', 'description'],
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            description: { type: 'string' },
            focus: { type: 'string' },
          },
        },
      },
    },
  },
  competitive: {
    type: 'object',
    required: ['layers'],
    properties: {
      layers: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'nodes'],
          properties: {
            name: { type: 'string' },
            nodes: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  source: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
            signal: { type: 'string' },
          },
        },
      },
      convergentInsight: { type: 'string' },
    },
  },
  cta: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      email: { type: 'string' },
      primaryActionLabel: { type: 'string' },
      primaryActionUrl: { type: 'string' },
    },
  },
};

// Build the per-kind oneOf branches that the schema validator can use to
// enforce shape correctness based on `kind`. Each branch fixes `kind` to a
// const value and constrains `data` to the corresponding shape.
const SECTION_ONE_OF = SECTION_KIND_ENUM.map((k) => ({
  type: 'object',
  required: ['kind', 'data'],
  properties: {
    kind: { const: k },
    data: SECTION_DATA_SHAPES[k],
  },
}));

// Exposed for runtime validation in narrativeComposer.validateAndFinalize.
export const SECTION_DATA_SHAPES_EXPORT: Readonly<Record<string, { required: readonly string[]; arrayFields: readonly string[] }>> = {
  hero: { required: ['title'], arrayFields: [] },
  context: { required: ['situation', 'complication', 'resolution'], arrayFields: [] },
  themes: { required: [], arrayFields: ['themes'] },
  evidence: { required: [], arrayFields: ['stats'] },
  quotes: { required: [], arrayFields: ['quotes'] },
  personas: { required: [], arrayFields: ['personas'] },
  journey: { required: [], arrayFields: ['stages'] },
  recommendations: { required: [], arrayFields: ['recommendations', 'items'] }, // synonym tolerance
  roadmap: { required: [], arrayFields: ['horizons'] },
  gap_analysis: { required: [], arrayFields: ['gaps'] },
  tech_arch: { required: [], arrayFields: ['layers'] },
  team: { required: [], arrayFields: ['members'] },
  competitive: { required: [], arrayFields: ['layers'] },
  cta: { required: ['title'], arrayFields: [] },
} as const;

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
      maxItems: 16,
      description: '6-16 sections defending the strategic thesis. Each section is a discriminated union: the `kind` field picks the data shape. See SECTION_DATA_SHAPES.',
      items: {
        // 2026-05-04 — Discriminated union per `kind`. Each branch fixes
        // kind to a const value and constrains data to the corresponding
        // per-kind shape. Replaces the prior loose `data: { type: 'object' }`
        // schema that produced empty `data: {}` from Gemini-via-OpenAI-compat
        // and field-name drift from GPT-5.5 (recommendations vs items,
        // horizons[].initiatives vs horizons[].items, etc.).
        oneOf: SECTION_ONE_OF,
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
