// 2026-10-01 (plan Stage 0.1, audit F5): ONE engagement slug derivation.
// Seven engagements were filed under two folders because App.tsx, geminiService,
// researchFabricOrchestrator and wikiService each truncated the goal at 60 (or 50)
// characters while the proxy truncated at 80. This test pins the convergence: every
// goal-derived slug in the tree delegates to engagementSlugFor, and no inline
// `.slice(0, 60)` / `.substring(0, 60)` slugify of a goal survives. (Slugs of other
// things, such as a tile title for a download filename, are a different concept.)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { engagementSlugFor, ENGAGEMENT_SLUG_MAX } from './engagementSlug';
import { buildEngagementSlug } from './wikiService';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// an inline slugify applied to a GOAL variable, truncated at the legacy 60/50
const GOAL_VARS = String.raw`(?:researchGoal|this\.goal|goalQuery|engagementGoal|goalForSlug|researchGoal \|\| 'default)`;
const INLINE_GOAL_SLUG = new RegExp(
    GOAL_VARS + String.raw`[^\n]*?\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9[\\s-]*\]\+?\/g?, ?'-'\)[^\n]*?(?:slice|substring)\(0, ?(?:60|50)\)`,
);

describe('engagement slug convergence', () => {
    const goal = 'Identify high-converting email design patterns and product marketing trends for 2026 to guide the template redesign of a clean, organic cosmetics brand';

    it('buildEngagementSlug ignores its legacy maxLen and returns the canonical 80-char slug', () => {
        const canonical = engagementSlugFor(goal);
        expect(canonical.length).toBeLessThanOrEqual(ENGAGEMENT_SLUG_MAX);
        expect(canonical.length).toBeGreaterThan(60);
        expect(buildEngagementSlug(goal, 60)).toBe(canonical);
        expect(buildEngagementSlug(goal, 50)).toBe(canonical);
        expect(buildEngagementSlug(goal)).toBe(canonical);
    });

    it('no inline goal-slug derivation truncating at 60 or 50 remains', () => {
        const files = ['App.tsx', 'services/geminiService.ts', 'services/researchFabricOrchestrator.ts', 'services/wikiService.ts',
            'components/CorpusChatPanel.tsx', 'design-desk/DesignDeskChat.tsx', 'services/evidenceCatalogBuilder.ts'];
        const offenders = files.filter(f => INLINE_GOAL_SLUG.test(stripComments(read(f))));
        expect(offenders, 'use engagementSlugFor (services/engagementSlug.ts)').toEqual([]);
    });

    it('App.tsx sets the engagement run state from engagementSlugFor', () => {
        const src = stripComments(read('App.tsx'));
        expect(src).toMatch(/setEngagementSlug\(slug/);
        expect(src).toMatch(/const slug = goal \? engagementSlugFor\(goal\) : ''/);
    });
});
