import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ARTIFACT_CATALOG, catalogEntryFor, allArtifactIds } from './artifactCatalog';
import { isArtifactGenerationMessage } from './corpusChatService';

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

    it('covers every ARTIFACT_TPL slide-template id', () => {
        // capture the second quoted token on each ARTIFACT_TPL row: [/.../i, 'template-id'],
        const tplBlock = src.slice(src.indexOf('const ARTIFACT_TPL'), src.indexOf('];', src.indexOf('const ARTIFACT_TPL')));
        const tplIds = Array.from(tplBlock.matchAll(/,\s*'([a-z-]+)'\s*\]/g)).map(m => m[1]);
        expect(tplIds.length, 'found ARTIFACT_TPL rows').toBeGreaterThan(10);
        const missing = tplIds.filter(t => !ARTIFACT_CATALOG.some(e => e.templateId === t));
        expect(missing, `ARTIFACT_TPL template ids missing from catalog: ${missing.join(', ')}`).toEqual([]);
    });

    it('resolves every directive hashtag in the corpusChatService directive map', () => {
        // capture keys like '#proto': 'skill-name'  (the canonical directive->skill map)
        const hashtags = Array.from(src.matchAll(/'(#[a-z][a-z-]*)'\s*:/g)).map(m => m[1]);
        const uniq = Array.from(new Set(hashtags));
        expect(uniq.length, 'found directive hashtags').toBeGreaterThan(15);
        const unresolved = uniq.filter(h => catalogEntryFor(h) === null);
        expect(unresolved, `directives not covered by the catalog: ${unresolved.join(', ')}`).toEqual([]);
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
        // Guard the CANONICAL directive form (aliases[0]) of every templated slide entry - the primary way a
        // user invokes it. KNOWN gap (tracked): some plural/compound ALIASES (#audits, #orgs, #prds,
        // #techaudit, #tech-audit, #architecture, #themecluster) are not matched by the ARTIFACT_TPL
        // \b-anchored regexes even though catalogEntryFor resolves them; aligning isArtifactGenerationMessage
        // with the catalog needs care (avoid double-emission for #strategy) + a live verify - see the D-alias
        // follow-up. Canonical forms all route correctly today.
        const canonical = ARTIFACT_CATALOG
            .filter(e => e.modality === 'slides' && e.templateId)   // has a real slide template -> chat-path
            .map(e => e.aliases[0]);
        expect(canonical.length).toBeGreaterThan(12);
        const outsideAir = canonical.filter(d => !isArtifactGenerationMessage(`${d} on the corpus`));
        expect(outsideAir, `CANONICAL templated slide directives NOT caught by isArtifactGenerationMessage (would skip chat-path AIR): ${outsideAir.join(', ')}`).toEqual([]);
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
