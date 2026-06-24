import { describe, it, expect } from 'vitest';
import { sliceManifestForCategories, assembleAppFromPods, extractManifestProtoIds } from './prototypeBuilder';

// 2026-06-16 - Track the deterministic seams of the multi-agent #proto pod build.
// The LLM stages (orchestrator, pods, reviewer) need a live run to validate; these
// two functions are the pure, testable glue the merged app's correctness depends on.

const MANIFEST = [
    '# #proto Component Manifest',
    'intro line',
    '',
    '## Brand token resolution (use as CSS variables in the generated prototype)',
    '--color/accent: #B8B800',
    '',
    '## AI-CHAT category (11 components, both brands)',
    '### proto/Composer',
    'composer spec',
    '',
    '## NAVIGATION category (9 components, both brands)',
    '### proto/NavBar',
    'navbar spec',
    '',
    '## DATA DISPLAY category (14 components, both brands)',
    '### proto/List',
    'list spec',
].join('\n');

describe('sliceManifestForCategories', () => {
    it('keeps only requested categories plus the brand-token block', () => {
        const out = sliceManifestForCategories(MANIFEST, ['AI-CHAT']);
        expect(out).toContain('Brand token resolution');
        expect(out).toContain('--color/accent: #B8B800');
        expect(out).toContain('AI-CHAT category');
        expect(out).toContain('proto/Composer');
        expect(out).not.toContain('NAVIGATION category');
        expect(out).not.toContain('proto/NavBar');
        expect(out).not.toContain('proto/List');
    });

    it('matches multiple categories', () => {
        const out = sliceManifestForCategories(MANIFEST, ['AI-CHAT', 'DATA DISPLAY']);
        expect(out).toContain('proto/Composer');
        expect(out).toContain('proto/List');
        expect(out).not.toContain('proto/NavBar');
    });

    it('is case-insensitive and tolerant of the "category (...)" suffix', () => {
        const out = sliceManifestForCategories(MANIFEST, ['ai-chat']);
        expect(out).toContain('proto/Composer');
    });

    it('returns header + token block (never the whole manifest) when nothing matches', () => {
        const out = sliceManifestForCategories(MANIFEST, ['NONEXISTENT']);
        expect(out).toContain('Brand token resolution');
        expect(out).not.toContain('proto/Composer');
        expect(out).not.toContain('proto/NavBar');
    });

    it('returns empty string for empty manifest', () => {
        expect(sliceManifestForCategories('', ['AI-CHAT'])).toBe('');
    });
});

describe('assembleAppFromPods', () => {
    const shell = {
        shared_code: 'const App = () => null;\n/*__SCREENS__*/\nrender(<App/>);',
        state_shape: 's', action_list: ['A'], shared_primitives: ['Card'], seed_data_note: 'n', screens: [],
    };

    it('splices pod components into the SCREEN marker', () => {
        const merged = assembleAppFromPods(shell as any, [
            { id: 'a', code: 'function Screen_a(){return null;}', engine: 'x', patterns_used: [] },
            { id: 'b', code: 'function Screen_b(){return null;}', engine: 'x', patterns_used: [] },
        ]);
        expect(merged).toContain('function Screen_a');
        expect(merged).toContain('function Screen_b');
        expect(merged).not.toContain('__SCREENS__');
        // order preserved + shell preserved
        expect(merged.indexOf('Screen_a')).toBeLessThan(merged.indexOf('Screen_b'));
        expect(merged).toContain('render(<App/>)');
    });

    it('throws when the shell is missing the injection marker', () => {
        expect(() => assembleAppFromPods({ ...shell, shared_code: 'const App=()=>null;' } as any, [
            { id: 'a', code: 'function Screen_a(){}', engine: 'x', patterns_used: [] },
        ])).toThrow(/injection marker/);
    });

    it('throws when no pod produced code', () => {
        expect(() => assembleAppFromPods(shell as any, [
            { id: 'a', code: '   ', engine: 'x', patterns_used: [] },
        ])).toThrow(/no pod produced code/);
    });
});

describe('extractManifestProtoIds (#proto fidelity ground truth)', () => {
    const M = [
        '## AI-CHAT category',
        '### proto/Composer  (NXT 404:2 / NU 332:2)',
        'spec mentions proto/ChatMessage inline and proto/Reasoning.',
        '## DATA DISPLAY',
        '### proto/List',
        '### proto/Card',
    ].join('\n');

    it('extracts proto/<Name> ids from headings AND inline prose', () => {
        const ids = extractManifestProtoIds(M);
        expect(ids.has('proto/Composer')).toBe(true);
        expect(ids.has('proto/ChatMessage')).toBe(true); // inline mention counts
        expect(ids.has('proto/Reasoning')).toBe(true);
        expect(ids.has('proto/List')).toBe(true);
        expect(ids.has('proto/Card')).toBe(true);
    });

    it('a declared component absent from the manifest is INVENTED (the fidelity check)', () => {
        const ids = extractManifestProtoIds(M);
        const declared = ['proto/Composer', 'proto/List', 'proto/Frobnicator', 'p-42'];
        const invented = declared.filter(p => !ids.has(p));
        expect(invented).toEqual(['proto/Frobnicator', 'p-42']);
    });

    it('does not match a bare "proto/" or lowercase noise', () => {
        const ids = extractManifestProtoIds('proto/ lowercase proto/widget PROTO/Thing');
        expect(ids.size).toBe(0); // requires proto/ + UpperCamel
    });
});
