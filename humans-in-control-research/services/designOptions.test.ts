import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    parseDesignDirective, buildDesignOptionsPrompt, parseDesignOptions, sanitizePreviewHtml, previewDocument,
    designDirectionFact, loadDesignDirection, directionBlock,
} from './designOptions';

const opt = (name: string, p: number, extra = '') => ({
    name, probability: p, layout: `${name} layout`, hierarchy: 'headline, evidence, action', density: 'airy', imagery: 'native diagram', rationale: 'fits',
    previewHtml: `<div class="opt" style="background:var(--rail)">${extra}<h1 style="font-family:var(--font-display)">Advancement teams lose donors after the first gift</h1></div>`,
});

describe('#design option boards (WS-E E2)', () => {
    it('reads the directive, the count (2 to 4, default 3) and the subject', () => {
        expect(parseDesignDirective('#design options:3 donor retention deck for the CFO')).toEqual({ count: 3, subject: 'donor retention deck for the CFO' });
        expect(parseDesignDirective('#design #NU onboarding hub')).toEqual({ count: 3, subject: 'onboarding hub' });
        expect(parseDesignDirective('#design options:9 x')?.count).toBe(4);
        expect(parseDesignDirective('#designer please')).toBeNull();
        expect(parseDesignDirective('#slides about design systems')).toBeNull();
    });

    it('asks for a distribution over layouts with the same copy, token-only styling and the house copy rules', () => {
        const { system, user } = buildDesignOptionsPrompt({ count: 3, subject: 'donor retention' }, { brand: 'nxt', tokensPrompt: 'TOKENS: --accent ...' });
        expect(system).toContain('verbalized distribution');
        expect(system).toContain('differ in composition only');
        expect(system).toContain('var(--token)');
        expect(system).toContain('No em dashes');
        expect(system).toContain('TOKENS: --accent');
        expect(user).toContain('Return exactly 3 directions.');
    });

    it('strips scripts, handlers and remote fetches from a preview', () => {
        const dirty = '<div class="opt" onclick="steal()"><script>alert(1)</script><a href="https://x.test/a">x</a><div style="background:url(https://x.test/i.png)">y</div><iframe src="https://x.test"></iframe>—</div>';
        const clean = sanitizePreviewHtml(dirty);
        expect(clean).not.toMatch(/script|onclick|iframe|https:/i);
        expect(clean).not.toContain('—');
        expect(clean).toContain('class="opt"');
    });

    it('keeps distinct, renderable options and normalizes the probabilities', () => {
        const raw = JSON.stringify({ options: [opt('Evidence rail', 2), opt('Evidence rail', 1), opt('Split hero', 1), { ...opt('No root', 1), previewHtml: '<div>x</div>' }, opt('Quiet grid', 1)] });
        const got = parseDesignOptions(`Here you go: ${raw}`, 3);
        expect(got.map(o => o.name)).toEqual(['Evidence rail', 'Split hero', 'Quiet grid']);
        expect(got.map(o => o.id)).toEqual([1, 2, 3]);
        expect(got.map(o => o.probability)).toEqual([0.5, 0.25, 0.25]);
        expect(parseDesignOptions('not json', 3)).toEqual([]);
    });

    it('renders a preview inside the brand token custom properties', () => {
        const doc = previewDocument({ previewHtml: '<div class="opt">x</div>' }, ':root {\n    --accent: #B8B800 !important;\n}\n');
        expect(doc).toContain('--accent: #B8B800');
        expect(doc.indexOf('--accent')).toBeLessThan(doc.indexOf('<div class="opt">'));
    });

    it('the pick becomes an engagement-scoped preference fact', () => {
        const [f] = designDirectionFact({ name: 'Evidence rail', layout: 'A left rail of quotes beside one exhibit.', hierarchy: 'Headline, exhibit, quotes.', density: 'balanced', imagery: 'native diagram' }, 'donor retention');
        expect(f).toMatchObject({ category: 'preference', scope: 'engagement', durability: 'durable' });
        expect(f.content).toBe('Design direction for donor retention: Evidence rail. Layout: A left rail of quotes beside one exhibit. Reading order: Headline, exhibit, quotes. Density: balanced. Imagery: native diagram.');
    });

    it('the next build reads the newest direction of THIS engagement', async () => {
        const fetchImpl = vi.fn(async (url: string) => {
            expect(url).toContain('category=preference');
            expect(url).toContain('engagement=eng-a');
            return new Response(JSON.stringify({ facts: [
                { id: 'f1', scope: 'engagement', engagement: 'eng-a', createdAt: '2026-10-30T10:00:00Z', content: 'Design direction for x: Old pick.' },
                { id: 'f2', scope: 'engagement', engagement: 'eng-a', createdAt: '2026-10-31T10:00:00Z', content: 'Design direction for x: New pick.' },
                { id: 'f3', scope: 'engagement', engagement: 'eng-b', createdAt: '2026-10-31T11:00:00Z', content: 'Design direction for y: Other engagement.' },
                { id: 'f4', scope: 'user', createdAt: '2026-10-31T12:00:00Z', content: 'Standing preference: appendix last.' },
            ] }));
        });
        const d = await loadDesignDirection('eng-a', fetchImpl as any);
        expect(d).toEqual({ id: 'f2', content: 'Design direction for x: New pick.' });
        expect(directionBlock(d)).toContain('PINNED DESIGN DIRECTION');
        expect(await loadDesignDirection('', fetchImpl as any)).toBeNull();
        expect(directionBlock(null)).toBe('');
    });

    it('the deck path and the prototype build both read the pinned direction', () => {
        const chat = readFileSync(join(__dirname, 'corpusChatService.ts'), 'utf8');
        const proto = readFileSync(join(__dirname, 'prototypeBuilder.ts'), 'utf8');
        expect(chat).toContain("const _dir = await loadDesignDirection(currentEngagementSlug() || '');");
        expect(chat).toContain('systemPrompt += `\\n\\n${directionBlock(_dir)}`;');
        expect(proto).toContain('${pinnedDirection ? `\\n\\n${pinnedDirection}` : \'\'}');
        const designer = readFileSync(join(__dirname, '..', 'design-desk', 'DesignDeskChat.tsx'), 'utf8');
        expect(designer).toContain("admitAt('design direction', designDirectionFact(o, m.designBoard!.subject)");
        expect(designer).toContain("engagementSlugFor(String(ctx.researchGoal || ''))");
    });
});
