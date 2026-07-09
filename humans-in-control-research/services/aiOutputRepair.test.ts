/**
 * aiOutputRepair.test.ts (2026-07-08)
 *
 * Pins the two repair rungs added after the live NFP heuristic failure ("AI output
 * unrepairable: no rung succeeded for JSON"): escape_inner_quotes (balanced-but-invalid
 * responses quoting UI copy verbatim) and truncation_salvage (max_tokens truncation
 * shapes that bracket-closing alone cannot fix). Every case here is a response shape
 * that previously killed a paid analysis run.
 */

import { describe, it, expect } from 'vitest';
import { repairAIOutput, parseJSONWithRepair } from './aiOutputRepair';

describe('escape_inner_quotes (balanced-but-invalid)', () => {
    it('escapes unescaped quotes inside a string value (the NFP shape)', () => {
        const raw = '{"findings": [{"id": "f1", "description": "The "SAMPLE DATA" banner confuses visitors and buries the real numbers."}]}';
        const r = repairAIOutput(raw, 'json');
        expect(r.ok).toBe(true);
        expect(r.repaired_via).toBe('escape_inner_quotes');
        expect((r.parsed as any).findings[0].description).toContain('"SAMPLE DATA"');
    });
    it('handles multiple quoted fragments in one value', () => {
        const raw = '{"text": "Labels read "Esc to return" and "View Example" mid-sentence"}';
        const r = repairAIOutput(raw, 'json');
        expect(r.ok).toBe(true);
        expect((r.parsed as any).text).toContain('"Esc to return"');
    });
    it('leaves already-valid JSON untouched', () => {
        const raw = '{"a": "properly \\"escaped\\" quotes", "b": 2}';
        const r = repairAIOutput(raw, 'json');
        expect(r.ok).toBe(true);
        expect(r.repaired_via).toBe('no_repair_needed');
    });
});

describe('truncation_salvage (max_tokens shapes bracket-closing cannot fix)', () => {
    it('drops a dangling key fragment after a comma', () => {
        const raw = '{"findings": [{"id": "f1", "severity": 3}, {"id": "f2", "sever';
        const parsed = parseJSONWithRepair<any>(raw);
        expect(parsed.findings[0].id).toBe('f1');
    });
    it('nulls a value truncated after the colon', () => {
        const raw = '{"findings": [{"id": "f1", "severity":';
        const parsed = parseJSONWithRepair<any>(raw);
        expect(parsed.findings[0].id).toBe('f1');
        expect(parsed.findings[0].severity).toBeNull();
    });
    it('closes a clean mid-array truncation (existing rung still owns it)', () => {
        const raw = '{"findings": [{"id": "f1", "marker": {"x": 4, "y": 5}}';
        const parsed = parseJSONWithRepair<any>(raw);
        expect(parsed.findings[0].marker.y).toBe(5);
    });
    it('salvages a mid-string truncation inside a large object', () => {
        const raw = '{"executiveSummary": {"overallScore": 62, "summary": "Three sentences."}, "findings": [{"id": "f1", "title": "Buttons are faint"}, {"id": "f2", "title": "No naviga';
        const parsed = parseJSONWithRepair<any>(raw);
        expect(parsed.executiveSummary.overallScore).toBe(62);
        expect(parsed.findings.length).toBeGreaterThanOrEqual(1);
        expect(parsed.findings[0].id).toBe('f1');
    });
    it('handles an unterminated code fence around truncated JSON', () => {
        const raw = '```json\n{"a": [1, 2, {"b": "c"}, {"d": "e';
        const parsed = parseJSONWithRepair<any>(raw);
        expect(parsed.a[2].b).toBe('c');
    });
    it('still reports unrepairable for non-JSON prose', () => {
        const r = repairAIOutput('I could not analyze the screenshots provided.', 'json');
        expect(r.ok).toBe(false);
    });
});

describe('stripDataUris (chat token-bomb guard, 2026-07-08)', () => {
    it('removes large base64 data URIs but keeps small inline icons', async () => {
        const { stripDataUris } = await import('./corpusChatService');
        const big = 'data:image/png;base64,' + 'A'.repeat(5000);
        const small = 'data:image/svg+xml;base64,' + 'B'.repeat(64);
        const text = `before ![shot](${big}) middle ${small} after`;
        const out = stripDataUris(text);
        expect(out).toContain('[embedded image omitted]');
        expect(out).not.toContain('A'.repeat(100));
        expect(out).toContain(small);
        expect(out).toContain('before');
        expect(out).toContain('after');
    });
});
