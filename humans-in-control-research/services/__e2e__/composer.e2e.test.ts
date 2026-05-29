// services/__e2e__/composer.e2e.test.ts — 2026-05-27
//
// END-TO-END test of the #presentation composer flow against the LIVE proxy.
//
// WHY THIS EXISTS: composer fixes kept "passing" in isolation (a flattened
// schema validated with a single curl) but then failed in production because
// the REAL flow is a multi-round tool loop whose accumulated message history
// trips provider-specific rejects (DeepSeek content_filter 400, Gemini-compat
// INVALID_ARGUMENT on echoed thought_signature, etc.). This test runs the
// ACTUAL compose() loop end-to-end against the running research-proxy (5012)
// with a mock executor (canned corpus, no retrieval dependency), so the exact
// failure class is caught here instead of by the user clicking #presentation.
//
// Run:  npx vitest run --config vitest.e2e.config.ts
// Requires: research-proxy up on 127.0.0.1:5012 (skips cleanly if not).

import { describe, it, expect, beforeAll } from 'vitest';
import { compose } from '../narrativeComposer';
import type { ToolExecutor } from '../narrativeComposerTools';

const PROXY = 'http://127.0.0.1:5012';

// Canned co-op corpus so the loop has evidence without real retrieval.
const mockExecutor: ToolExecutor = {
  search_corpus: async (input: any) => ({
    chunks: [
      {
        chunk_id: 'c1', text: 'First-year students report the co-op search is overwhelming and they lack resume readiness before their first advisor meeting.', score: 0.9,
        source: { name: 'Reddit r/NEU', scope: 'external' as const },
      },
      {
        chunk_id: 'c2', text: 'NUworks surfaces thousands of postings with weak filtering, so students apply broadly and hear back rarely.', score: 0.85,
        source: { name: 'NU Student Survey 2025', scope: 'external' as const },
      },
    ],
    total_returned: 2, query_echoed: String((input && input.query) || ''), scope_used: 'both',
  }),
  get_themes: async () => ({
    themes: [
      { name: 'Readiness gap', description: 'Students enter the search underprepared.', citations: [] as any },
      { name: 'Discovery friction', description: 'Fragmented tools make opportunities hard to find.', citations: [] as any },
    ],
    count: 2,
  }),
  get_personas: async () => ({
    personas: [{ name: 'The Anxious First-Year', role: 'First-year co-op seeker' }],
    count: 1,
  }),
  get_deliverable: async (input: any) => ({ kind: String(input?.kind || ''), data: null, exists: false }),
  extract_quotes: async () => ({
    quotes: [{ text: 'I had no idea how to write a resume an employer would look at.', attribution: 'first-year student', source_name: 'Reddit r/NEU', chunk_id: 'c1' }],
    total_returned: 1,
  }),
  extract_stats: async () => ({ stats: [], total_returned: 0 }),
};

let proxyUp = false;
beforeAll(async () => {
  try {
    const r = await fetch(`${PROXY}/health`, { signal: AbortSignal.timeout(5000) });
    proxyUp = r.ok;
  } catch { proxyUp = false; }
});

describe('composer schema isolation (live proxy)', () => {
  it('gemini-compat accepts the REAL submit_presentation tool schema in isolation', async () => {
    if (!proxyUp) { console.warn('[schema-iso] proxy down — skip'); return; }
    const tools = await import('../narrativeComposerTools');
    const submit = (tools.NARRATIVE_TOOLS as any[]).find(t => t.name === 'submit_presentation');
    expect(submit).toBeTruthy();
    // Sanitized for Gemini (strips unsupported JSON-Schema keywords). This is
    // the exact transform the composer now applies for Gemini models.
    const params = tools.sanitizeSchemaForGemini(submit.input_schema);
    const resp = await fetch(`${PROXY}/api/ai/gemini-compat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-openai-endpoint': 'chat' },
      body: JSON.stringify({
        model: 'gemini-3.5-flash',
        messages: [{ role: 'user', content: 'Call submit_presentation now with a minimal valid 6-section payload about first-year co-op readiness.' }],
        tools: [{ type: 'function', function: { name: submit.name, description: submit.description, parameters: params } }],
        tool_choice: { type: 'function', function: { name: 'submit_presentation' } },
        max_tokens: 4000, temperature: 0.3,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const txt = await resp.text();
    console.log(`[schema-iso] status=${resp.status} body=${txt.slice(0, 400)}`);
    // If THIS 400s, the real submit schema is the INVALID_ARGUMENT cause.
    expect(resp.status).toBe(200);
  }, 90_000);
});

describe('composer e2e (live proxy)', () => {
  it('composes a #presentation via the real Gemini tool loop without a provider hard-fail', async () => {
    if (!proxyUp) {
      console.warn('[composer.e2e] research-proxy not reachable on 5012 — skipping');
      return;
    }
    const result = await compose({
      narrativeRequest: 'A strategy to improve first-year co-op readiness at Northeastern through earlier skill-gap identification and democratized access to resources.',
      brand: 'NU',
      theme: 'light',
      model: 'gemini-3.5-flash',
      engagementContext: {
        engagementGoal: 'Improve first-year co-op readiness at Northeastern',
        themeCount: 2,
        personaCount: 1,
        deliverableList: ['themes', 'personas', 'recommendations'],
        externalArticleCount: 2,
        uploadedDocCount: 0,
      } as any,
      executor: mockExecutor,
      priorConversation: [
        { role: 'user', content: 'What are the biggest co-op readiness gaps for first-years?' },
        { role: 'assistant', content: 'Readiness gap and discovery friction are the two dominant patterns in the corpus.' },
      ],
      onProgress: (m) => console.log('[composer.e2e] progress:', m),
    });

    // The bug class we are guarding against produces a THROW (content_filter
    // 400 / INVALID_ARGUMENT). Reaching here with a valid payload means the
    // real tool loop completed against the live provider.
    expect(result).toBeTruthy();
    expect(result.payload).toBeTruthy();
    expect(Array.isArray(result.payload.sections)).toBe(true);
    expect(result.payload.sections.length).toBeGreaterThanOrEqual(6);
    // No emoji / em-dash leaked into the title (repo-wide ban).
    expect(/[\u{1F000}-\u{1FAFF}—]/u.test(result.payload.meta?.title || '')).toBe(false);
  }, 360_000);
});
