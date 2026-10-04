import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ARTIFACT_CATALOG, catalogEntryFor, allArtifactIds } from './artifactCatalog';
import { CATALOG_TEMPLATE_RULES, CATALOG_HASHTAG_TO_SKILL_ID } from './artifactCatalog';
import { isArtifactGenerationMessage, messageTargetsArtifact } from './corpusChatService';

// WS-0 OMISSION GUARD. The artifact catalog must cover EVERY directive HiC accepts, so no hashtag is ever
// silently omitted from routing / AIR tracking. This test reads the LIVE corpusChatService.ts ARTIFACT_TPL
// template ids + the directive->skill map and fails the build if any is not resolvable in the catalog.
// If you add a directive in corpusChatService, you MUST add a catalog entry in services/artifactCatalog.ts.

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf-8');

describe('artifact catalog coverage (none omitted)', () => {
    const src = read('corpusChatService.ts');

    it('has unique canonical ids and well-formed entries', () => {
        const ids = allArtifactIds();
        expect(new Set(ids).size).toBe(ids.length);
        for (const e of ARTIFACT_CATALOG) {
            expect(e.id, `entry ${e.id} aliases`).toBeTruthy();
            expect(e.aliases.length, `entry ${e.id} has aliases`).toBeGreaterThan(0);
        }
    });

    it('the chat service binds the catalog-generated template rules and directive map (Stage 6.1)', () => {
        expect(src).toMatch(/const ARTIFACT_TPL: Array<\[RegExp, string\]> = CATALOG_TEMPLATE_RULES;/);
        expect(src).toMatch(/const HASHTAG_TO_SKILL_ID: Record<string, string> = CATALOG_HASHTAG_TO_SKILL_ID;/);
        // every generated template id and every canonical directive resolves in the catalog
        for (const [, t] of CATALOG_TEMPLATE_RULES) expect(ARTIFACT_CATALOG.some(e => e.templateId === t), t).toBe(true);
        for (const k of Object.keys(CATALOG_HASHTAG_TO_SKILL_ID)) expect(catalogEntryFor(k), k).not.toBeNull();
    });

    it('resolves directives by hashtag, id, and template id', () => {
        expect(catalogEntryFor('#gap')?.id).toBe('gap');
        expect(catalogEntryFor('gap-matrix')?.id).toBe('gap');
        expect(catalogEntryFor('#personas')?.id).toBe('persona');
        expect(catalogEntryFor('#case-studies')?.id).toBe('case-study');
        expect(catalogEntryFor('#slides')?.id).toBe('slides');
        expect(catalogEntryFor('#deep-research')?.id).toBe('deep-research');
        expect(catalogEntryFor('#nonsense-directive')).toBeNull();
    });

    it('EVERY templated slide directive routes through the chat-path AIR chokepoint (isArtifactGenerationMessage)', () => {
        // Stage-3 proof. HiC emits AIR via TWO paths: (1) the corpusChatService chat chokepoint
        // (isArtifactGenerationMessage -> buildEvidenceLedger) serves every ARTIFACT_TPL slide-template
        // directive; (2) the CorpusChatPanel freeform/HTML path (emitDeliverable.air, CorpusChatPanel:5193)
        // serves the narrative/HTML directives (templateId null: #strategy, #brief, #explainer, #report ...).
        // This guards path 1: any directive that HAS a slide templateId MUST hit the chat chokepoint, else it
        // would render a deck with no AIR. (Null-template narrative directives correctly use path 2.)
        // D18: EVERY slide/html artifact directive (ALL aliases, incl #strategy/#playground/#approaches and
        // plural/compound forms) must be caught by messageTargetsArtifact -> the chat-path AIR block fires and
        // the deck emits a real-ledger AIR. Previously #strategy (not in ARTIFACT_TPL) generated a deck via
        // strategy-author but emitted NO AIR because the block gated on isArtifactGenerationMessage. Found by a
        // live #strategy run (0 strategy AIRs on disk); messageTargetsArtifact closes it via the catalog SSOT.
        const artifactAliases = ARTIFACT_CATALOG
            .filter(e => e.modality === 'slides' || e.modality === 'html')
            .flatMap(e => e.aliases);
        expect(artifactAliases.length).toBeGreaterThan(20);
        const outsideAir = artifactAliases.filter(d => !messageTargetsArtifact(`${d} on the corpus`));
        expect(outsideAir, `artifact directive aliases NOT caught by messageTargetsArtifact (deck would emit NO AIR): ${outsideAir.join(', ')}`).toEqual([]);
        // sanity: plain chat must NOT trigger AIR emission
        expect(messageTargetsArtifact('what are the main themes in the corpus?')).toBe(false);
    });

    it('COMBINED hashtags (#strategy #slides, #gap #NU, etc.) still route to AIR emission', () => {
        // Combos are the real usage: a directive + #slides/#NU/#dense. Every combination of an artifact
        // directive with modifiers must keep messageTargetsArtifact true so the deck still emits an AIR.
        const combos = [
            '#strategy #slides #NU', '#gap #slides', '#personas #dense', '#journey #NU',
            '#competitive #slides #dense', '#brief #slides', '#audits #slides', '#architecture #NU',
            '#strategy', '#playground', '#approaches',
            '#strategy #slides #deciem', '#personas #DECIEM', '#prd #deciem',   // 2026-10-01 third brand modifier
        ];
        const missed = combos.filter(c => !messageTargetsArtifact(`${c} on the corpus`));
        expect(missed, `combined-hashtag artifact requests NOT caught (deck would emit NO AIR): ${missed.join(' | ')}`).toEqual([]);
        // and a modifier-only / non-artifact combo must NOT trigger
        expect(messageTargetsArtifact('summarize the corpus #NU')).toBe(false);
        expect(messageTargetsArtifact('summarize the corpus #deciem')).toBe(false);
    });

    it('keeps schema_flash routingClass in sync with aiRouter SCHEMA_FLASH_ARTIFACTS', () => {
        const router = read('aiRouter.ts');
        const setBlock = router.slice(router.indexOf('SCHEMA_FLASH_ARTIFACTS'), router.indexOf('])', router.indexOf('SCHEMA_FLASH_ARTIFACTS')));
        // every catalog entry marked schema_flash should have its id or templateId present in the router set
        const schemaEntries = ARTIFACT_CATALOG.filter(e => e.routingClass === 'schema_flash');
        const notInRouter = schemaEntries.filter(e => !setBlock.includes(`'${e.id}'`) && !(e.templateId && setBlock.includes(`'${e.templateId}'`)));
        expect(notInRouter.map(e => e.id), 'schema_flash catalog ids absent from aiRouter SCHEMA_FLASH_ARTIFACTS').toEqual([]);
    });
});
