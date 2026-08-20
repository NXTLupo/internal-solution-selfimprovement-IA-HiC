/**
 * DF-J - CONTRACT PARITY TESTS.
 *
 * Cross-service payload drift is a named recurring failure on this repo (the
 * composer and the port-5014 renderer have diverged before). A schema nobody
 * checks is documentation; a schema with a test is a contract. These tests read
 * the JSON in contracts/ and assert the TypeScript producers still satisfy it,
 * so a new enum value or a renamed field fails here rather than in a live run.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ok, fail, refuse, partial, envelopeTrace } from './stepEnvelope';
import { STAGE_ORDER } from './artifactChain';
import { admitFacts, DEFAULT_CONFIG } from './memoryLifecycle';
import { reviewSkillPatch } from './skillReview';

const contract = (name: string) => JSON.parse(readFileSync(join(process.cwd(), 'contracts', name), 'utf8'));

/** Walk a schema for the enum declared at a property path. */
const enumAt = (schema: any, path: string[]): string[] => {
    let node = schema;
    for (const key of path) node = node.properties?.[key] ?? node.items ?? node;
    if (node.enum) return node.enum;
    if (node.oneOf) return node.oneOf.flatMap((o: any) => o.enum || []);
    throw new Error(`no enum at ${path.join('.')}`);
};

describe('step_envelope.v1', () => {
    const schema = contract('step_envelope.v1.schema.json');

    it('every produced envelope carries the required fields', () => {
        const produced = [
            ok('s', 1),
            partial('s', 1, 'truncated'),
            fail('s', new Error('401 unauthorized')),
            refuse('s', 1, 'gate said no'),
        ];
        for (const e of produced) {
            for (const key of schema.required) {
                expect(e, `${key} missing from ${e.status}`).toHaveProperty(key);
            }
        }
    });

    it('the TS unions and the schema enums agree', () => {
        expect(enumAt(schema, ['status']).sort()).toEqual(['error', 'partial', 'success']);
        // Every errorType the classifier can emit must be declared.
        const declared = new Set(enumAt(schema, ['errorType']));
        const emitted = [
            fail('s', '401').errorType, fail('s', 'rate limit').errorType,
            fail('s', 'timeout').errorType, fail('s', 'not configured').errorType,
            fail('s', 'permission denied').errorType, fail('s', 'stale write').errorType,
            fail('s', 'unexpected end of json').errorType, fail('s', 'invalid shape').errorType,
            fail('s', 'no results').errorType, fail('s', 'not found').errorType,
            fail('s', 'internal error').errorType, fail('s', 'mystery').errorType,
        ];
        for (const t of emitted) expect(declared.has(String(t)), `${t} not declared`).toBe(true);
    });

    it('nextAction values are all declared, including the HiC-specific narrow_scope', () => {
        const declared = new Set(enumAt(schema, ['nextAction']));
        expect(declared.has('narrow_scope')).toBe(true);
        for (const a of [ok('s', 1), partial('s', 1, 'x'), fail('s', 'x'), refuse('s', 1, 'x')]) {
            expect(declared.has(a.nextAction)).toBe(true);
        }
    });

    it('the trace record carries decision fields only, matching the chain schema', () => {
        const chainSchema = contract('artifact_chain.v1.schema.json');
        const allowed = new Set(Object.keys(chainSchema.properties.trace.items.properties));
        for (const key of Object.keys(envelopeTrace(fail('chain:prose', 'boom')))) {
            expect(allowed.has(key), `${key} is not an allowed trace key`).toBe(true);
        }
    });
});

describe('artifact_chain.v1', () => {
    it('the declared stage order matches the code exactly', () => {
        const schema = contract('artifact_chain.v1.schema.json');
        expect(STAGE_ORDER).toEqual(schema.properties.stageOrder.const);
    });
});

describe('memory_fact.v1', () => {
    const schema = contract('memory_fact.v1.schema.json');

    it('an admitted fact satisfies the schema shape', () => {
        const { admitted } = admitFacts([{
            content: 'the owner reviews decks in the browser before signing off',
            category: 'behavior', confidence: 0.9,
            scope: 'user', durability: 'durable', authority: 'descriptive',
        }], 'r1', DEFAULT_CONFIG, '2026-08-20T00:00:00.000Z');
        expect(admitted).toHaveLength(1);
        const f = admitted[0];
        for (const key of schema.required) expect(f).toHaveProperty(key);
        for (const key of Object.keys(f)) {
            expect(Object.keys(schema.properties), `${key} undeclared`).toContain(key);
        }
    });

    it('the category, scope, durability and authority enums agree with the code', () => {
        expect(enumAt(schema, ['category']).sort()).toEqual(['behavior', 'context', 'correction', 'goal', 'knowledge', 'preference']);
        expect(enumAt(schema, ['scope']).sort()).toEqual(['engagement', 'session', 'user']);
        expect(enumAt(schema, ['durability']).sort()).toEqual(['durable', 'temporary']);
        expect(enumAt(schema, ['authority']).sort()).toEqual(['descriptive', 'transactional']);
    });
});

describe('skill_review.v1', () => {
    const schema = contract('skill_review.v1.schema.json');

    it('a produced report satisfies the contract', () => {
        const r = reviewSkillPatch({ skillName: 'theme-analyst', patch: 'Name the subreddit in the attribution field so the reader can find the thread.', existing: 'x', completeness: { ok: true } });
        for (const key of schema.required) expect(r).toHaveProperty(key);
        expect(schema.properties.readiness.enum).toContain(r.readiness);
        expect(schema.properties.assurance.enum).toContain(r.assurance);
        const dimIds = new Set(schema.properties.dimensions.items.properties.id.enum);
        for (const d of r.dimensions) expect(dimIds.has(d.id), `${d.id} undeclared`).toBe(true);
    });

    it('readiness and assurance are independent axes in the schema', () => {
        expect(schema.properties.readiness.enum).not.toEqual(schema.properties.assurance.enum);
        expect(schema.properties.evidence.required).toContain('limitations');
    });
});
