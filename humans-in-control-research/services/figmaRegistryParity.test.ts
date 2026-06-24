import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 2026-06-16 TRACK B B1 / 2026-06-23 UNIVERSAL FIGMA-GROUNDING GATE.
// The EVERY-page Figma harvest (plans/figma-audit/*.md) proved every deliverable is a
// componentized, token-bound symbol with an NU mode-535:0 instance twin. The runtime contract
// (wiki/brand/figma-node-map.md "RUNTIME VARIANT CONTRACT"): the SPA does NOT instance Figma at
// runtime; the components are design CANON, mirrored into the code renderers + figma-tokens.json.
// Track B's job is to PROVE every code renderer is a faithful mirror of a registered Figma
// component, and that NO renderer template can quietly masquerade as Figma-grounded.
//
// This gate reads plans/figma-audit/registry.json (the single machine-readable contract) and
// asserts, UNIVERSALLY across every deliverable:
//   - firstClass    -> template exists in the types.ts SlideTemplate union, has a dispatch case in
//                      slideToStageHtml.ts, and a payload-contract entry in slideContractParity.
//   - variants       -> baseTemplate is itself a firstClass/union template.
//   - CLASSIFICATION -> EVERY dispatch `case '<tpl>':` is EITHER firstClass (Figma-backed, with a
//                      figmaNodes entry) OR renderer_only (explicitly quarantined w/ reason+decision).
//                      A dispatch template that is neither = FAIL. (Catches theme-cluster/spotlight.)
//   - REVERSE GAP    -> every Figma component that has a renderer (firstClass) is dispatch-backed;
//                      Figma components with no twin YET live in planned_renderers (honest burn-down)
//                      and are NOT yet in the union (building the twin forces them into firstClass).
//   - NO-HARDCODE    -> literal-hex count per renderer twin may not EXCEED its current ceiling, so
//                      token-binding faithfulness can only improve, never regress (a new raw hex fails).
// The slides-system archetypes (Figma 609:2..609:15) are rendered by services/slideComposer.ts
// ARCHETYPE_SPECS (the slides: namespace), NOT the GOLD dispatch, so they are checked against the
// composer's registered specs, not the union.

const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

const registry = JSON.parse(read('plans/figma-audit/registry.json'));
// Strip _comment / underscore-prefixed doc keys so they aren't treated as real entries.
const stripDocKeys = <T,>(o: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(o || {}).filter(([k]) => !k.startsWith('_')));

const firstClass: Record<string, string> = stripDocKeys(registry._templateMap.firstClass);
const variants: Record<string, string> = stripDocKeys(registry._templateMap.variants);
const rendererOnly: Record<string, any> = stripDocKeys(registry.renderer_only);
const plannedRenderers: Record<string, any> = stripDocKeys(registry.planned_renderers);
const figmaNodes: Record<string, any> = stripDocKeys(registry.figmaNodes);

const typesSrc = read('components/slideTemplates/types.ts');
// Templates live in BOTH forms: the `SlideTemplate` type-alias union (`| 'journey-map'`) and the
// discriminated-union interface members (`template: 'persona-card'`). Capture both.
const unionTemplates = new Set([
    ...Array.from(typesSrc.matchAll(/^\s*\|\s*'([a-z-]+)'/gm)).map(m => m[1]),
    ...Array.from(typesSrc.matchAll(/template:\s*'([a-z-]+)'/gm)).map(m => m[1]),
]);

const stageSrc = read('services/slideToStageHtml.ts');
const dispatchCases = new Set(
    Array.from(stageSrc.matchAll(/case\s*'([a-z-]+)':/gm)).map(m => m[1]),
);

// The payload-contract map lives in the sibling drift-guard test; parse it so the two guards can't
// disagree about which templates exist.
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

    it('every first-class deliverable is node-anchored (has a figmaNodes entry)', () => {
        const missing = Object.keys(firstClass).filter(d => !figmaNodes[d]);
        expect(missing, `first-class deliverables with no figmaNodes anchor: ${missing.join(', ')}`).toEqual([]);
    });

    it('every variant deliverable routes through a known first-class base template', () => {
        const firstClassTpls = new Set(Object.values(firstClass));
        const broken = Object.entries(variants)
            .filter(([, base]) => !firstClassTpls.has(base) && !unionTemplates.has(base))
            .map(([d, base]) => `${d} -> ${base}`);
        expect(broken, `variant deliverables with unknown base template: ${broken.join(', ')}`).toEqual([]);
    });
});

describe('UNIVERSAL classification — no renderer template may masquerade as Figma-grounded (2026-06-23)', () => {
    const firstClassTpls = new Set(Object.values(firstClass));

    it('EVERY slideToStageHtml dispatch case is classified (firstClass Figma-backed OR renderer_only quarantine)', () => {
        const unclassified = Array.from(dispatchCases)
            .filter(tpl => !firstClassTpls.has(tpl) && !(tpl in rendererOnly));
        expect(
            unclassified,
            `dispatch templates that are neither Figma-backed (firstClass) nor quarantined (renderer_only): ${unclassified.join(', ')}. ` +
            `Add to _templateMap.firstClass with a figmaNodes anchor, or to renderer_only with a reason+decision.`,
        ).toEqual([]);
    });

    it('every renderer_only entry declares a reason + decision (honest quarantine, never silent)', () => {
        const bad = Object.entries(rendererOnly)
            .filter(([, v]) => !v || typeof v.reason !== 'string' || !v.reason || typeof v.decision !== 'string' || !v.decision)
            .map(([k]) => k);
        expect(bad, `renderer_only entries missing reason/decision: ${bad.join(', ')}`).toEqual([]);
    });

    it('every renderer_only template actually exists as a dispatch case (no dangling quarantine)', () => {
        const dangling = Object.keys(rendererOnly).filter(tpl => !dispatchCases.has(tpl));
        expect(dangling, `renderer_only templates with no dispatch case (delete from registry): ${dangling.join(', ')}`).toEqual([]);
    });

    it('REVERSE GAP: every Figma component with a renderer is dispatch-backed; un-built twins live in planned_renderers and are NOT yet in the union', () => {
        // A planned twin must (a) carry its Figma anchor and (b) NOT yet be a real template — building
        // the renderer is what moves it from planned_renderers into firstClass + union + dispatch.
        const lyingPlanned = Object.entries(plannedRenderers)
            .filter(([, v]) => {
                const tpl = v.template;
                const anchored = v.figmaNodes && Array.isArray(v.figmaNodes.nxt) && v.figmaNodes.nxt.length > 0;
                const alreadyBuilt = unionTemplates.has(tpl) && dispatchCases.has(tpl);
                return !anchored || alreadyBuilt;
            })
            .map(([k, v]) => `${k} -> ${v.template}`);
        expect(
            lyingPlanned,
            `planned_renderers that are mis-declared (no Figma anchor, or already built and should be promoted to firstClass): ${lyingPlanned.join(', ')}`,
        ).toEqual([]);
    });
});

// SHADOW + CEILING: the "faithful token mirror" signal. Renderer twins should bind color/font from
// the hydrated BrandTokens (T.accent, var(--color/*)), never literal hex in the rendered body. T's
// own definition block legitimately holds hex (it IS the hydration source), so a raw count over-
// reports the absolute number; we therefore enforce a NON-INCREASING ceiling (a new literal hex
// fails CI) rather than zero. The full flip to zero-hex is a separate burn-down.
describe('no-hardcode token-fidelity ceiling (non-increasing)', () => {
    const HEX = /#[0-9a-fA-F]{6}\b/g;
    // Ceilings = literal-hex counts at 2026-06-23. Lower them as twins migrate to tokens; never raise.
    const CEIL: Record<string, number> = {
        'services/slideToStageHtml.ts': 63,
        'components/slideTemplates/web.tsx': 16,
        'services/slideComposer.ts': 6,
    };
    for (const [file, ceil] of Object.entries(CEIL)) {
        it(`${file} literal-hex count stays <= ${ceil}`, () => {
            const n = (read(file).match(HEX) || []).length;
            // eslint-disable-next-line no-console
            console.log(`[no-hardcode ceiling] ${file}: ${n}/${ceil} literal hex`);
            expect(n, `${file} gained literal hex (${n} > ceiling ${ceil}) - bind from T.*/var(--color/*) instead, or lower the ceiling if you removed some`).toBeLessThanOrEqual(ceil);
        });
    }
});

// 2026-06-17 / 2026-06-23 SLIDES-SYSTEM ARCHETYPE PARITY. The Figma SLIDES system (page 324:2,
// symbols 609:2..609:15) has 14 deck-native archetypes. They are rendered by services/
// slideComposer.ts composeSlide() (the slides: namespace) via ARCHETYPE_SPECS, NOT by the GOLD
// types.ts union + slideToStageHtml dispatch. So 'present' is checked against the composer's
// registered spec keys. registry._slideArchetypes registers all 14 with node IDs; these tests keep
// the manifest HONEST: a 'present' archetype must be renderable by the composer, and declared
// missing_renderers must EXACTLY match reality, so a Figma archetype can never again be silently
// invisible and shipping a renderer FORCES a registry update.
describe('SLIDES-system archetype manifest parity (composer-backed)', () => {
    const archetypes: Record<string, any> = registry._slideArchetypes.archetypes;
    const declaredMissing: string[] = registry._slideArchetypes.missing_renderers;

    // Parse the ARCHETYPE_SPECS keys straight from source (hermetic; no import side-effects), the
    // same source-parsing approach the rest of this gate uses.
    const composerSrc = read('services/slideComposer.ts');
    const specBlock = composerSrc.slice(composerSrc.indexOf('const ARCHETYPE_SPECS'));
    const archetypeSpecKeys = new Set(
        Array.from(specBlock.matchAll(/^ {4}'([a-z-]+)':\s*\{/gm)).map(m => m[1]),
    );

    it('every "present" archetype is registered in slideComposer ARCHETYPE_SPECS', () => {
        const broken = Object.entries(archetypes)
            .filter(([, a]) => a.renderer === 'present')
            .filter(([k]) => !archetypeSpecKeys.has(k))
            .map(([k, a]) => `${k} -> ${a.template}`);
        expect(broken, `archetypes marked 'present' but absent from ARCHETYPE_SPECS: ${broken.join(', ')}`).toEqual([]);
    });

    it('declared missing_renderers EXACTLY matches archetypes absent from the composer (manifest cannot lie)', () => {
        const actuallyMissing = Object.keys(archetypes)
            .filter(k => !archetypeSpecKeys.has(k))
            .sort();
        expect([...declaredMissing].sort()).toEqual(actuallyMissing);
    });

    it('[tracked gap] reports the SLIDES archetypes still needing a renderer', () => {
        // eslint-disable-next-line no-console
        console.log(`[SLIDES archetype gap] ${declaredMissing.length}/14 still need a renderer: ${declaredMissing.join(', ') || '(none)'}`);
        expect(Array.isArray(declaredMissing)).toBe(true); // informational; the build burns this list down
    });
});
