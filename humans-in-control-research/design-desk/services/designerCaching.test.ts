// Designer-chat prompt-caching guard tests (goal 2026-07-02 part 2). Live-verified the same day:
// a marker-split system produced cache_creation_input_tokens=2957 on first call and
// cache_read_input_tokens=2957 on a varied follow-up through /api/ai/anthropic. These asserts
// pin the wiring that produced that result.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('Designer chats carry the cache-break seam', () => {
    const freeform = src('design-desk/services/chatToFreeform.ts');
    const slideSpec = src('design-desk/services/chatToSlideSpec.ts');

    it('chatToFreeform marks the stable/dynamic boundary and lifts the prefix into system on Claude', () => {
        expect(freeform).toContain('HIC_CACHE_BREAK');
        // marker sits AFTER the exemplar body (stable) and BEFORE the corpus (dynamic)
        expect(freeform).toMatch(/sampleBody\);[\s\S]{0,900}HIC_CACHE_BREAK[\s\S]{0,900}RESEARCH CORPUS/);
        // Claude path: prefix -> system, tiny literal tail keeps the big block non-final
        expect(freeform).toContain('Apply every rule and reference above to this generation.');
        // non-Anthropic paths never see the marker as literal text
        expect(freeform).toContain('stripCacheMarkers');
    });

    it('chatToSlideSpec marks the boundary after layout guidance and before corpus', () => {
        expect(slideSpec).toContain('SLIDESPEC_CACHE_BREAK');
        expect(slideSpec).toMatch(/LAYOUT GUIDANCE[\s\S]{0,900}SLIDESPEC_CACHE_BREAK[\s\S]{0,900}RESEARCH CORPUS/);
        expect(slideSpec).toContain('Apply the schema, palette, and layout guidance above to this generation.');
        expect(slideSpec).toContain('stripCacheMarkers(prompt)');
    });

    it('both single-source the marker from aiRouter (never a local literal)', () => {
        expect(freeform).not.toContain('<<<HIC-CACHE-BREAK>>>');
        expect(slideSpec).not.toContain('<<<HIC-CACHE-BREAK>>>');
    });
});
