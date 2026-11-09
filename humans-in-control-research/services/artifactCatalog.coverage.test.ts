import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    ARTIFACT_CATALOG,
    CATALOG_HASHTAG_ALIASES,
    CATALOG_HASHTAG_TO_SKILL_ID,
    CATALOG_MODIFIERS,
    CATALOG_MODIFIER_TOKENS,
    CATALOG_TEMPLATE_RULES,
    UPLIFT_CATALOG_IDS,
    catalogEntryFor,
    designDeskVocabulary,
    isCatalogModifier,
    matchCatalogDirectives,
    primaryCatalogHit,
} from './artifactCatalog';
import { DIRECTIVES, catalogIdsMissingFromRegistry } from './hashtagRegistry';
import { parseHashtags } from '../design-desk/services/hashtagParser';
import { HTML_ARTIFACT_PARSERS, classifyHashtags, parseDirectiveHits, routeDirective } from './hashtagParser';

/**
 * Stage 6.1 FIVE-VOCABULARY AGREEMENT (plan finding A7). The five places a hashtag vocabulary used to be
 * hand-kept must now agree with the catalog, because four of them are generated from it and the fifth
 * (corpusChatService.ts) is checked by reading its live source:
 *   1. services/artifactCatalog.ts          (the source)
 *   2. services/hashtagRegistry.ts          (UI copy + generated aliases)
 *   3. services/corpusChatService.ts        (HASHTAG_TO_SKILL_ID / HASHTAG_ALIASES / ARTIFACT_TPL / protocol text)
 *   4. services/hashtagParser.ts            (generated parsers + multi-hit routing)
 *   5. design-desk/services/hashtagParser.ts (generated CONTENT set + aliases)
 */

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf-8');
const ccs = read('corpusChatService.ts');

describe('artifact catalog: the five vocabularies agree', () => {
    it('every registry artifact directive resolves to a catalog entry and carries the catalog aliases', () => {
        const artifactDirectives = DIRECTIVES.filter(d => !['browse', 'edit-refine', 'system'].includes(d.category));
        const unresolved = artifactDirectives.filter(d => !catalogEntryFor(d.id)).map(d => d.id);
        expect(unresolved, `registry directives with no catalog entry: ${unresolved.join(', ')}`).toEqual([]);
        for (const d of artifactDirectives) {
            const entry = catalogEntryFor(d.id)!;
            const expected = entry.aliases.map(a => a.toLowerCase()).filter(a => a !== d.id.toLowerCase());
            expect(d.aliases, `${d.id} aliases are generated from the catalog`).toEqual(expected);
        }
        expect(catalogIdsMissingFromRegistry(), 'catalog ids with no registry human copy').toEqual([]);
    });

    it('the registry brand copy is token-derived, never a literal stale typeface', () => {
        const nxt = DIRECTIVES.find(d => d.id === '#NXT')!;
        const nu = DIRECTIVES.find(d => d.id === '#NU')!;
        const deciem = DIRECTIVES.find(d => d.id === '#DECIEM')!;   // 2026-10-01 third brand mode
        expect(deciem).toBeTruthy();
        for (const d of [nxt, nu, deciem]) {
            const text = `${d.summary} ${d.description}`;
            expect(text).not.toMatch(/Bebas|JetBrains|Roboto|Open Sans/);
        }
        expect(nxt.description).toMatch(/Saira Condensed/);
        expect(nu.description).toMatch(/Lato/);
        expect(deciem.description).toMatch(/Poppins/);
        expect(deciem.description).toMatch(/Josefin Sans/);
        expect(deciem.description).toMatch(/#FB48C4/);
        expect(deciem.summary).toMatch(/applies to any deliverable hashtag/);
    });

    it('corpusChatService consumes the catalog-generated vocabularies (no local tables)', () => {
        // 2026-10-01 (Stage 6.1 landed in the parent): the four local tables are gone; the chat service
        // binds the generated constants. A reappearing literal table is the drift this test exists to catch.
        expect(ccs).toMatch(/const ARTIFACT_TPL: Array<\[RegExp, string\]> = CATALOG_TEMPLATE_RULES;/);
        expect(ccs).toMatch(/const HASHTAG_TO_SKILL_ID: Record<string, string> = CATALOG_HASHTAG_TO_SKILL_ID;/);
        expect(ccs).toMatch(/const HASHTAG_ALIASES: Record<string, string> = CATALOG_HASHTAG_ALIASES;/);
        expect(ccs).toMatch(/const HASHTAG_MODIFIERS: ReadonlySet<string> = CATALOG_MODIFIER_TOKENS;/);
        expect(ccs).not.toMatch(/'#presentation':\s*'deck-narrative-composer'/);
        expect(ccs).not.toMatch(/const INLINE_SKILL_TEMPLATES/);
        expect(ccs).toMatch(/primaryCatalogHit\(userMessage\)/);
        // every canonical hashtag in the generated skill map resolves in the catalog
        const unresolved = Object.keys(CATALOG_HASHTAG_TO_SKILL_ID).filter(k => !catalogEntryFor(k));
        expect(unresolved).toEqual([]);
    });

    it('every hashtag the corpusChatService protocol text mentions is a catalog entry or a modifier', () => {
        // The protocol / prompt text is the user-visible contract: `#gap`, `#slides #NU`, ... Every tag it
        // teaches must resolve, so the model is never told about a directive the router does not know.
        // Tokens followed by a regex metacharacter (`/#compet/i`, `/#case-?stud/`, `#strateg(y|ies)`) are regex
        // fragments, not hashtags the reader sees; the trailing lookahead excludes them.
        const tags = Array.from(new Set(Array.from(ccs.matchAll(/(?<![\w#-])#([a-z][a-z-]{1,24})(?![\w\-/(?\\|[\]*+{])/gi)).map(m => `#${m[1].toLowerCase()}`)));
        // tokens that are not hashtags: CSS colors are 3/6 hex (excluded by the letter start), markdown
        // headings start the line (`# `), ids like `#stage` / `#c12` are DOM or pointer anchors.
        const DOM_OR_POINTER = new Set(['#stage', '#c', '#root', '#raw-json', '#app', '#main', '#slide-root', '#deck', '#chunk', '#section']);
        const unknown = tags.filter(t => !DOM_OR_POINTER.has(t) && !/^#c\d+$/.test(t) && !catalogEntryFor(t) && !isCatalogModifier(t) && !/^#(nxt|nu)$/.test(t));
        // Allowlist of prose anchors in comments that are not directives (keep SHORT; every entry is a
        // judgment that the token is not a user-facing directive).
        const PROSE = new Set(['#artifact', '#hashtag', '#deliverable', '#html', '#name', '#chunk_xxx', '#orphans', '#research', '#hero', '#table', '#count', '#foo', '#proto-deck', '#cn', '#case']);
        const really = unknown.filter(t => !PROSE.has(t));
        expect(really, `hashtags in corpusChatService not covered by the catalog or modifiers: ${really.join(', ')}`).toEqual([]);
    });

    it('the generated ARTIFACT_TPL rules cover every slide-template id the catalog declares', () => {
        const generated = new Set(CATALOG_TEMPLATE_RULES.map(([, t]) => t));
        const declared = new Set(ARTIFACT_CATALOG.filter(e => e.templateId).map(e => e.templateId as string));
        expect(Array.from(generated).sort()).toEqual(Array.from(declared).sort());
    });

    it('the Design Desk parser vocabulary is the catalog vocabulary', () => {
        const vocab = designDeskVocabulary();
        for (const kind of vocab.content) {
            const r = parseHashtags(`#${kind} show me`);
            expect(r.content, `#${kind} parses as content`).toEqual([kind]);
        }
        for (const [alias, kind] of Object.entries(vocab.aliases)) {
            const r = parseHashtags(`#${alias} show me`);
            expect(r.content, `#${alias} -> ${kind}`).toEqual([kind]);
        }
        // the two local system tags and the legacy shorthand still parse
        expect(parseHashtags('#refine x').content).toEqual(['refine']);
        expect(parseHashtags('#help').content).toEqual(['help']);
        expect(parseHashtags('#plan').content).toEqual(['research-plan']);
    });

    it('the HTML artifact parser list is generated from the html-modality catalog entries', () => {
        const htmlAliases = new Set(ARTIFACT_CATALOG.filter(e => e.modality === 'html').flatMap(e => e.aliases));
        for (const ap of HTML_ARTIFACT_PARSERS) expect(htmlAliases.has(ap.generator), ap.generator).toBe(true);
        const gens = HTML_ARTIFACT_PARSERS.map(ap => ap.generator);
        expect(gens).toContain('#questionnaire');
        expect(gens).toContain('#whitepaper');
        expect(gens).toContain('#report');
    });

    it('the NotebookLM uplift kinds are exactly the analysis-modality catalog ids', () => {
        expect(Array.from(UPLIFT_CATALOG_IDS).sort()).toEqual(['audio-overview', 'brief-dialog', 'deep-research', 'infographic', 'meta-themes', 'mindmap', 'video-overview']);
        for (const id of UPLIFT_CATALOG_IDS) {
            const e = catalogEntryFor(id)!;
            const kind = e.designDeskKind || e.id;
            expect(parseHashtags(`#${id} x`).content).toEqual([kind]);
        }
    });

    it('aliases are unique across entries and modifiers never collide with a directive', () => {
        const seen = new Map<string, string>();
        for (const e of ARTIFACT_CATALOG) {
            for (const a of e.aliases) {
                expect(seen.has(a), `alias ${a} on ${e.id} already used by ${seen.get(a)}`).toBe(false);
                seen.set(a, e.id);
            }
        }
        for (const m of CATALOG_MODIFIERS) {
            if (m.token === '#rec' || m.token === '#name') continue; // value forms only; bare #rec is the recs alias
            if (m.kind === 'view') { expect(seen.get(m.token)).toBe('slides'); continue; } // #slide/#slides: view modifier AND the deck entry
            expect(seen.has(m.token), `modifier ${m.token} collides with a directive`).toBe(false);
        }
        expect(Object.keys(CATALOG_HASHTAG_ALIASES).every(a => !(a in CATALOG_HASHTAG_TO_SKILL_ID))).toBe(true);
    });

    it('the formerly unknown modifiers (#dense, #count=, #img=, #hero=) are modifiers, not unknown directives', () => {
        for (const t of ['#dense', '#count=5', '#img=diagram', '#hero="Title"', '#NU', '#deciem', '#DECIEM', '#slides', '#export-pptx']) {
            expect(isCatalogModifier(t), t).toBe(true);
        }
        expect(CATALOG_MODIFIER_TOKENS.has('#dense')).toBe(true);
        expect(CATALOG_MODIFIERS.filter(m => m.kind === 'brand').map(m => m.token).sort()).toEqual(['#deciem', '#nu', '#nxt']);
        const c = classifyHashtags('#gap #personas #slides #dense #count=4 #img=diagram #fundraising');
        expect(c.directives.map(h => h.entry.id)).toEqual(['gap', 'persona', 'slides']);
        expect(c.modifiers).toEqual(['#dense', '#count', '#img']);
        expect(c.unknown).toEqual(['#fundraising']);
    });

    it('#prd carries the prdAir kind and #whitepaper resolves to the report entry', () => {
        expect(catalogEntryFor('#prd')?.airKind).toBe('prdAir');
        expect(catalogEntryFor('#whitepaper')?.id).toBe('report');
        expect(catalogEntryFor('#gap-matrix')?.id).toBe('gap');
        expect(catalogEntryFor('gap-matrix')?.id).toBe('gap');
    });
});

describe('multi-hit, word-boundary routing (finding A2)', () => {
    it('#gap #personas #slides returns every hit in document order', () => {
        const hits = matchCatalogDirectives('#gap #personas #slides on the corpus');
        expect(hits.map(h => h.entry.id)).toEqual(['gap', 'persona', 'slides']);
        expect(parseDirectiveHits('#gap #personas #slides').map(h => h.alias)).toEqual(['#gap', '#personas', '#slides']);
    });

    it('routes a mixed request on the highest tier: #gap #personas -> persona (evidence), not gap (flash)', () => {
        expect(primaryCatalogHit('#gap #personas #slides')?.entry.id).toBe('persona');
        expect(routeDirective('#gap #journey #slides')?.entry.id).toBe('gap');       // two schema hits: document order
        expect(routeDirective('#slides #gap')?.entry.id).toBe('gap');                // #slides beside a deliverable is the view modifier
        expect(routeDirective('#slides on retail')?.entry.id).toBe('slides');        // bare #slides is a deck
    });

    it('#arch does not match #architecture-x and #compet does not match #competency', () => {
        expect(matchCatalogDirectives('#architecture-x diagram')).toEqual([]);
        expect(matchCatalogDirectives('#archive the notes')).toEqual([]);
        expect(matchCatalogDirectives('#competency framework')).toEqual([]);
        expect(matchCatalogDirectives('#arch of the platform').map(h => h.entry.id)).toEqual(['arch']);
        expect(matchCatalogDirectives('#architecture of the platform').map(h => h.entry.id)).toEqual(['arch']);
        expect(matchCatalogDirectives('#competitive matrix').map(h => h.entry.id)).toEqual(['compete']);
    });

    it('#recs and #recommendations are one entry; #brief does not match #brief-dialog', () => {
        expect(matchCatalogDirectives('#recs please').map(h => h.entry.id)).toEqual(['recommendations']);
        expect(matchCatalogDirectives('#recommendations please').map(h => h.entry.id)).toEqual(['recommendations']);
        expect(matchCatalogDirectives('#brief-dialog on themes').map(h => h.entry.id)).toEqual(['brief-dialog']);
        expect(matchCatalogDirectives('#brief on themes').map(h => h.entry.id)).toEqual(['brief']);
    });

    it('is case-insensitive and ignores anchors glued to words', () => {
        expect(matchCatalogDirectives('#GAP #Personas').map(h => h.entry.id)).toEqual(['gap', 'persona']);
        expect(matchCatalogDirectives('foo#gap bar')).toEqual([]);
        expect(matchCatalogDirectives('color #gap0 x')).toEqual([]);
    });
});
