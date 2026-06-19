import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 2026-06-16 - TRACK B B1: FIGMA REGISTRY PARITY GUARD.
// The EVERY-page Figma harvest (plans/figma-audit/*.md) proved every deliverable is now a
// componentized, token-bound symbol with an NU mode-535:0 instance twin. The runtime contract
// (wiki/brand/figma-node-map.md "RUNTIME VARIANT CONTRACT") is: the SPA does NOT instance Figma
// at runtime; the components are the design CANON, mirrored into the code renderers + figma-
// tokens.json. So Track B's job is to PROVE every code renderer is a faithful mirror of its
// registered Figma component, and to keep the registry from drifting out of sync with the code.
//
// This test reads plans/figma-audit/registry.json (the machine-readable component registry) and
// asserts, for every deliverable:
//   - firstClass[]  -> its slide template-key exists in the types.ts SlideTemplate union,
//                      AND has a dispatch case in slideToStageHtml.ts, AND a payload-contract
//                      entry in slideContractParity.test.ts's TEMPLATE_PAYLOAD.
//   - variants[]    -> its baseTemplate is itself a firstClass template (predicate-routed dense/
//                      detail/index/spotlight renders share a base renderX, no own dispatch case).
// Plus a NO-HARDCODE hex SHADOW scan (always passes, reports counts) - the "faithful token mirror"
// signal, wired shadow-first per the project's validate_writing_quality.py shadow-then-block model.

const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

const registry = JSON.parse(read('plans/figma-audit/registry.json'));
const firstClass: Record<string, string> = registry._templateMap.firstClass;
const variants: Record<string, string> = registry._templateMap.variants;

const typesSrc = read('components/slideTemplates/types.ts');
// Templates live in BOTH forms: the `SlideTemplate` type-alias union (`| 'journey-map'`) and
// the discriminated-union interface members (`template: 'persona-card'`). Capture both.
const unionTemplates = new Set([
    ...Array.from(typesSrc.matchAll(/^\s*\|\s*'([a-z-]+)'/gm)).map(m => m[1]),
    ...Array.from(typesSrc.matchAll(/template:\s*'([a-z-]+)'/gm)).map(m => m[1]),
]);

const stageSrc = read('services/slideToStageHtml.ts');
const dispatchCases = new Set(
    Array.from(stageSrc.matchAll(/case\s*'([a-z-]+)':/gm)).map(m => m[1]),
);

// The payload-contract map lives in the sibling drift-guard test; parse it so the two guards
// can't disagree about which templates exist.
const paritySrc = read('services/slideContractParity.test.ts');
const payloadKeys = new Set(
    Array.from(paritySrc.matchAll(/^\s*'([a-z-]+)':\s*'[a-zA-Z]+',/gm)).map(m => m[1]),
);

describe('Figma registry <-> code parity (Track B B1)', () => {
    it('every first-class deliverable template exists in the types.ts SlideTemplate union', () => {
        const missing = Object.entries(firstClass)
            .filter(([, tpl]) => !unionTemplates.has(tpl))
            .map(([d, tpl]) => `${d} -> ${tpl}`);
        expect(missing, `registry templates absent from types.ts union: ${missing.join(', ')}`).toEqual([]);
    });

    it('every first-class deliverable template has a dispatch case in slideToStageHtml.ts', () => {
        const missing = Object.entries(firstClass)
            .filter(([, tpl]) => !dispatchCases.has(tpl))
            .map(([d, tpl]) => `${d} -> ${tpl}`);
        expect(missing, `registry templates with no render dispatch: ${missing.join(', ')}`).toEqual([]);
    });

    it('every first-class deliverable template has a payload-contract entry (no silent drop)', () => {
        const missing = Object.entries(firstClass)
            .filter(([, tpl]) => !payloadKeys.has(tpl))
            .map(([d, tpl]) => `${d} -> ${tpl}`);
        expect(missing, `registry templates missing from TEMPLATE_PAYLOAD: ${missing.join(', ')}`).toEqual([]);
    });

    it('every variant deliverable routes through a known first-class base template', () => {
        const firstClassTpls = new Set(Object.values(firstClass));
        const broken = Object.entries(variants)
            .filter(([, base]) => !firstClassTpls.has(base) && !unionTemplates.has(base))
            .map(([d, base]) => `${d} -> ${base}`);
        expect(broken, `variant deliverables with unknown base template: ${broken.join(', ')}`).toEqual([]);
    });

    // SHADOW (non-blocking): the "faithful token mirror" signal. The renderer twins should bind
    // color/font from the hydrated BrandTokens (T.accent, var(--color/*)), never literal hex in
    // the rendered body. T's own definition block legitimately holds hex (it IS the hydration
    // source), so a raw count over-reports; we report it for tracking, do NOT fail CI yet.
    it('[shadow] reports literal-hex density in the renderer twins (no-hardcode signal)', () => {
        const twins = ['services/slideToStageHtml.ts', 'components/slideTemplates/web.tsx'];
        const counts = twins.map(p => {
            const n = (read(p).match(/#[0-9a-fA-F]{6}\b/g) || []).length;
            return `${p}: ${n} literal hex`;
        });
        // eslint-disable-next-line no-console
        console.log('[B1 no-hardcode shadow]\n  ' + counts.join('\n  '));
        expect(counts.length).toBe(2); // always passes; presence-only tracking
    });
});

// 2026-06-17 - SLIDES-SYSTEM ARCHETYPE PARITY. The user's directive: "everything should be
// referenced in the manifest." The Figma SLIDES system (page 324:2, symbols 609:2-609:15) has 14
// deck-native archetypes; ~9 were never coded, so the model literally could not select them and
// repeated one GOLD template. registry._slideArchetypes now registers ALL 14 with node IDs +
// when_to_use + renderer status. These tests keep the manifest HONEST: a 'present' archetype must
// actually be renderable, and the declared missing_renderers must exactly match reality - so a
// Figma archetype can never again be silently invisible, and shipping a renderer FORCES a registry
// update (renderer flips present + drops out of missing_renderers, or the test fails).
describe('SLIDES-system archetype manifest parity (Track B - everything in the manifest)', () => {
    const archetypes: Record<string, any> = registry._slideArchetypes.archetypes;
    const declaredMissing: string[] = registry._slideArchetypes.missing_renderers;

    it('every "present" archetype has a types.ts SlideTemplate + a slideToStageHtml dispatch case', () => {
        const broken = Object.entries(archetypes)
            .filter(([, a]) => a.renderer === 'present')
            .filter(([, a]) => !unionTemplates.has(a.template) || !dispatchCases.has(a.template))
            .map(([k, a]) => `${k} -> ${a.template}`);
        expect(broken, `archetypes marked 'present' but missing a renderer: ${broken.join(', ')}`).toEqual([]);
    });

    it('every "variant" archetype maps to a base template that exists in the union', () => {
        const broken = Object.entries(archetypes)
            .filter(([, a]) => a.renderer === 'variant')
            .filter(([, a]) => !unionTemplates.has(a.template))
            .map(([k, a]) => `${k} -> ${a.template}`);
        expect(broken, `variant archetypes with no base template: ${broken.join(', ')}`).toEqual([]);
    });

    it('declared missing_renderers EXACTLY matches archetypes whose template is absent from the union (manifest cannot lie)', () => {
        const actuallyMissing = Object.entries(archetypes)
            .filter(([, a]) => !unionTemplates.has(a.template))
            .map(([k]) => k).sort();
        expect([...declaredMissing].sort()).toEqual(actuallyMissing);
    });

    it('[tracked gap] reports the SLIDES archetypes still needing a renderer', () => {
        // eslint-disable-next-line no-console
        console.log(`[SLIDES archetype gap] ${declaredMissing.length}/14 still need a renderer: ${declaredMissing.join(', ')}`);
        expect(Array.isArray(declaredMissing)).toBe(true); // informational; the build burns this list down
    });
});
