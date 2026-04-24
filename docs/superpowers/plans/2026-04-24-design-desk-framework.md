# Design Desk Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Design Desk — a new top-level tab in HiC Research where users chat their way to publication-ready flat-NXT artifacts (persona + journey pilots) grounded in a formal `DESIGN.md` spec, with chat-driven canvas editing, FossFLOW for diagrams, and PDF/PNG/PPTX export.

**Architecture:** A new isolated tree under `humans-in-control-research/design-desk/`. Zustand store holds typed artifact JSON. AI generates via full-state rewrites (Approach 1 — AI emits a complete artifact each turn; store swaps with undo stack). DESIGN.md is parsed at boot into structured tokens + raw Markdown; tokens drive renderer styling, raw Markdown is injected into every generation prompt. FossFLOW for diagram artifacts, flat-NXT React templates for document artifacts. Feature-flagged behind `VITE_DESIGN_DESK_ENABLED` until validated.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind 3.4, Zod (new), Zustand (new), Vitest (new), `fossflow-lib` (new), existing `pptxgenjs` / `jspdf` / `html2canvas` / `framer-motion`. Claude Opus 4.7 as default generator (reuses existing `aiRouter` + `anthropicService`).

**Spec:** [docs/superpowers/specs/2026-04-24-design-desk-framework-design.md](../specs/2026-04-24-design-desk-framework-design.md)

---

## File Structure

```
humans-in-control-research/
├── DESIGN.md                              # NEW — NXT design system source of truth
├── design-desk/                           # NEW — isolated feature tree
│   ├── index.ts                           # Barrel export
│   ├── types.ts                           # Artifact union + common types
│   ├── DesignDesk.tsx                     # Top-level tab — layout shell
│   ├── DesignDeskChat.tsx                 # Left pane — chat
│   ├── ArtifactViewer.tsx                 # Right pane router
│   ├── components/
│   │   ├── NxtDocViewer.tsx               # Document artifact renderer (persona)
│   │   ├── FossflowCanvas.tsx             # Diagram artifact renderer (journey)
│   │   ├── ExportMenu.tsx                 # PDF/PNG/PPTX dropdown
│   │   └── FeatureFlag.tsx                # Guard component
│   ├── store/
│   │   ├── designDeskStore.ts             # Zustand store
│   │   └── designDeskStore.test.ts
│   ├── services/
│   │   ├── hashtagParser.ts               # Pure parser
│   │   ├── hashtagParser.test.ts
│   │   ├── designMdLoader.ts              # DESIGN.md loader
│   │   ├── designMdLoader.test.ts
│   │   ├── chatToArtifact.ts              # AI → artifact JSON
│   │   └── artifactExporter.ts            # PDF/PNG/PPTX
│   ├── schemas/
│   │   ├── personaArtifact.ts             # Zod schema
│   │   ├── personaArtifact.test.ts
│   │   ├── journeyArtifact.ts             # Zod schema
│   │   └── journeyArtifact.test.ts
│   ├── prompts/
│   │   ├── personaPrompt.ts               # Generation prompt
│   │   └── journeyPrompt.ts               # Generation prompt
│   └── __fixtures__/
│       ├── persona.valid.json             # Test fixtures
│       └── journey.valid.json
├── App.tsx                                # MODIFY — add DESIGN_DESK AppState + nav
├── types.ts                               # MODIFY — extend AppState enum
├── package.json                           # MODIFY — add deps
└── vitest.config.ts                       # NEW — test config
```

---

## Task 0: Scaffolding — deps, Vitest, feature flag, directory

**Files:**
- Modify: `humans-in-control-research/package.json`
- Create: `humans-in-control-research/vitest.config.ts`
- Create: `humans-in-control-research/design-desk/index.ts`
- Modify: `humans-in-control-research/vite.config.ts`

- [ ] **Step 1: Install new dependencies**

Run from `humans-in-control-research/`:

```bash
npm install --legacy-peer-deps zustand zod fossflow-lib
npm install --legacy-peer-deps -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

Verify `package.json` now lists:
- `zustand`, `zod`, `fossflow-lib` under `dependencies`
- `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` under `devDependencies`

Expected: all installs succeed. If `fossflow-lib` fails to resolve, fall back to pinning directly from the git repo in package.json (`"fossflow-lib": "github:stan-smith/FossFLOW#main"`) and re-run `npm install --legacy-peer-deps`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
// humans-in-control-research/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./design-desk/__fixtures__/vitest.setup.ts'],
        include: ['design-desk/**/*.test.{ts,tsx}'],
    },
});
```

- [ ] **Step 3: Create Vitest setup file**

```ts
// humans-in-control-research/design-desk/__fixtures__/vitest.setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Add test scripts to `package.json`**

Edit `humans-in-control-research/package.json` `scripts` section:

```json
"scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
}
```

- [ ] **Step 5: Add feature flag to vite config**

Edit `humans-in-control-research/vite.config.ts`. Find the `define` block (already sets `process.env.API_KEY`) and add the feature flag:

```ts
define: {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
    'process.env.DESIGN_DESK_ENABLED': JSON.stringify(env.VITE_DESIGN_DESK_ENABLED || 'true'),
},
```

(During development the flag defaults to `'true'`; production rollouts can set `VITE_DESIGN_DESK_ENABLED=false` to hide the tab.)

- [ ] **Step 6: Create design-desk directory with empty barrel**

```ts
// humans-in-control-research/design-desk/index.ts
export { DesignDesk } from './DesignDesk';
```

This will fail to compile (no DesignDesk.tsx yet) — that's expected; Task 16 creates it.

- [ ] **Step 7: Verify test runner works**

Run from `humans-in-control-research/`:

```bash
npm run test
```

Expected: "No test files found" — correct, we haven't written any yet.

- [ ] **Step 8: Commit**

```bash
git add humans-in-control-research/package.json humans-in-control-research/package-lock.json humans-in-control-research/vitest.config.ts humans-in-control-research/vite.config.ts humans-in-control-research/design-desk/
git commit -m "feat(design-desk): scaffold directory, vitest, feature flag, deps (zustand/zod/fossflow)"
```

---

## Task 1: Author DESIGN.md

**Files:**
- Create: `humans-in-control-research/DESIGN.md`

- [ ] **Step 1: Write DESIGN.md**

```markdown
---
name: NXT Humans
version: 1.0.0
brands:
  nxt:
    primary: "#0D0D0D"
    surface: "#FFFFFF"
    panel: "#FAFAFA"
    accent: "#B8B800"
    accentMax: 0.15
    secondary: "#00B7C3"
    negative: "#CC6644"
    teal: "#115054"
    success: "#0CCE6B"
    error: "#FF5A5A"
  nu:
    primary: "#141414"
    surface: "#FFFFFF"
    panel: "#FAFAFA"
    accent: "#C8102E"
    accentMax: 0.15
    secondary: "#000000"
    negative: "#CC6644"
typography:
  body: { family: "Archivo", weightRange: [200, 900] }
  display: { family: "Bebas Neue", weights: [400] }
  mono: { family: "JetBrains Mono", weights: [400, 500] }
  scale:
    h1: { size: "3rem", weight: 900, family: "Bebas Neue", letterSpacing: "0.02em" }
    h2: { size: "2rem", weight: 800 }
    body: { size: "1rem", weight: 400, lineHeight: 1.5 }
    small: { size: "0.75rem", weight: 600, letterSpacing: "2px", textTransform: "uppercase" }
layout:
  radius: { default: 2, max: 4 }
  spacing: { unit: 4 }
  grid: { columns: 12, gutter: 16 }
  forbidden: ["shadow", "gradient", "radius > 4px", "pie chart"]
iconography:
  style: "flat"
  fill: "monochrome"
  stroke: "geometric"
  forbidden: ["skeuomorphic", "3d", "gradient fill"]
---

# NXT Humans Design System

## Overview
Flat, minimalistic, data-dense, and high-contrast. Every surface earns its pixel. No decoration for decoration's sake. The aesthetic is journalistic gravitas meets modernist architecture.

## Action Titles
Every heading is a complete sentence stating a conclusion with data. Not a topic label.

- GOOD: "35% of first-year students do not return, costing $9B annually"
- BAD: "The Landscape" | "Key Findings" | "Overview"

## Color Rules
- Primary ink (`#0D0D0D` NXT / `#141414` NU) on white or `panel` is default.
- Accent (`#B8B800` chartreuse NXT / `#C8102E` Huskies Red NU) must not exceed 15% of surface area in any view. Scarcity creates impact.
- One accent per block — never mix chartreuse and cyan in the same block on NXT.
- Negative (`#CC6644` rust) for problems, warnings, and friction callouts.

## Typography Rules
- Display headings: Bebas Neue, uppercase.
- Body: Archivo, 400-600 for text, 700-900 for emphasis.
- Monospace: JetBrains Mono for code, citations, and data labels.
- Banned families: Inter, Roboto, Arial, Poppins, Space Grotesk.

## Layout Rules
- Radius: 0-4px. Never more.
- No shadows. No gradients. No decorative textures.
- Pie charts are banned. Use horizontal bars for part-to-whole.
- Grid is 12 columns, 16px gutter, 4px base unit for spacing.

## Iconography
- Flat, monochrome, geometric. Stroke-based or filled — not both.
- No skeuomorphism, no 3D, no gradient fills.
- Use icons sparingly; prefer text with a single accent mark over icon-heavy interfaces.

## Citations
- Every data point shows source: "Higher Ed Dive, 2025" not "research".
- Banned generic references: "research", "studies", "data", "sources", "findings".

## Banned Phrases
Link: see `.claude/CLAUDE.md` for the 350+ slop blacklist. This file does not duplicate it; the AI consumer is expected to load both.
```

- [ ] **Step 2: Commit**

```bash
git add humans-in-control-research/DESIGN.md
git commit -m "feat(design-desk): add DESIGN.md — formal NXT design system source of truth"
```

---

## Task 2: Hashtag parser

**Files:**
- Create: `humans-in-control-research/design-desk/services/hashtagParser.ts`
- Test: `humans-in-control-research/design-desk/services/hashtagParser.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// humans-in-control-research/design-desk/services/hashtagParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseHashtags } from './hashtagParser';

describe('parseHashtags', () => {
    it('extracts single content hashtag with default brand', () => {
        const r = parseHashtags('#persona show me someone');
        expect(r.content).toEqual(['persona']);
        expect(r.brand).toBe('nxt');
        expect(r.view).toBeNull();
        expect(r.composition).toBeNull();
        expect(r.cleanPrompt).toBe('show me someone');
    });

    it('honors explicit NU brand', () => {
        expect(parseHashtags('#persona #NU').brand).toBe('nu');
    });

    it('detects single-slide view modifier', () => {
        const r = parseHashtags('#persona #NXT #slide');
        expect(r.view).toBe('slide');
        expect(r.composition).toBeNull();
    });

    it('detects deck composition with multiple content hashtags', () => {
        const r = parseHashtags('#persona #journey #strategy #NU #slides');
        expect(r.content).toEqual(['persona', 'journey', 'strategy']);
        expect(r.composition).toBe('slides');
        expect(r.view).toBeNull();
        expect(r.brand).toBe('nu');
    });

    it('is case-insensitive on hashtag names', () => {
        const r = parseHashtags('#PERSONA #Nu');
        expect(r.content).toEqual(['persona']);
        expect(r.brand).toBe('nu');
    });

    it('returns empty content when no content hashtags', () => {
        expect(parseHashtags('add a friction point after step 3').content).toEqual([]);
    });

    it('ignores unknown hashtags (does not reject them, just omits)', () => {
        const r = parseHashtags('#persona #madeup #NXT');
        expect(r.content).toEqual(['persona']);
        expect(r.unknown).toEqual(['madeup']);
    });

    it('cleanPrompt strips all recognized hashtags', () => {
        expect(parseHashtags('#persona #NU #slide make her a dev').cleanPrompt).toBe('make her a dev');
    });

    it('preserves unknown hashtags in cleanPrompt', () => {
        expect(parseHashtags('#persona #madeup make one').cleanPrompt).toBe('#madeup make one');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd humans-in-control-research && npm run test
```

Expected: all 9 tests fail with "parseHashtags is not a function" or module-not-found.

- [ ] **Step 3: Implement parser**

```ts
// humans-in-control-research/design-desk/services/hashtagParser.ts
export type ContentHashtag =
    | 'persona' | 'journey' | 'blueprint' | 'arch'
    | 'prd' | 'roadmap' | 'strategy' | 'gap'
    | 'audit' | 'compete';

export type BrandHashtag = 'nxt' | 'nu';
export type ViewHashtag = 'slide';
export type CompositionHashtag = 'slides';

export interface ParsedHashtags {
    content: ContentHashtag[];
    view: ViewHashtag | null;
    composition: CompositionHashtag | null;
    brand: BrandHashtag;
    unknown: string[];
    cleanPrompt: string;
}

const CONTENT: Set<string> = new Set([
    'persona', 'journey', 'blueprint', 'arch',
    'prd', 'roadmap', 'strategy', 'gap', 'audit', 'compete',
]);
const BRANDS: Set<string> = new Set(['nxt', 'nu']);
const VIEW_SINGLE = 'slide';
const VIEW_MULTI = 'slides';

export function parseHashtags(input: string): ParsedHashtags {
    const content: ContentHashtag[] = [];
    const unknown: string[] = [];
    let view: ViewHashtag | null = null;
    let composition: CompositionHashtag | null = null;
    let brand: BrandHashtag = 'nxt';
    let cleaned = input;

    const tokens = Array.from(input.matchAll(/#([a-zA-Z]+)/g));
    for (const match of tokens) {
        const tag = match[1].toLowerCase();
        let consumed = false;
        if (CONTENT.has(tag)) {
            if (!content.includes(tag as ContentHashtag)) content.push(tag as ContentHashtag);
            consumed = true;
        } else if (BRANDS.has(tag)) {
            brand = tag as BrandHashtag;
            consumed = true;
        } else if (tag === VIEW_SINGLE) {
            view = 'slide';
            consumed = true;
        } else if (tag === VIEW_MULTI) {
            composition = 'slides';
            consumed = true;
        } else {
            unknown.push(tag);
        }
        if (consumed) {
            cleaned = cleaned.replace(match[0], '').replace(/\s+/g, ' ');
        }
    }

    return {
        content,
        view,
        composition,
        brand,
        unknown,
        cleanPrompt: cleaned.trim(),
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add humans-in-control-research/design-desk/services/hashtagParser.ts humans-in-control-research/design-desk/services/hashtagParser.test.ts
git commit -m "feat(design-desk): hashtag parser with 9 tests covering content/view/composition/brand"
```

---

## Task 3: DESIGN.md loader

**Files:**
- Create: `humans-in-control-research/design-desk/services/designMdLoader.ts`
- Test: `humans-in-control-research/design-desk/services/designMdLoader.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// humans-in-control-research/design-desk/services/designMdLoader.test.ts
import { describe, it, expect } from 'vitest';
import { parseDesignMd } from './designMdLoader';

const SAMPLE = `---
name: NXT Humans
version: 1.0.0
brands:
  nxt:
    primary: "#0D0D0D"
    accent: "#B8B800"
  nu:
    primary: "#141414"
    accent: "#C8102E"
typography:
  body: { family: "Archivo" }
---

# NXT Humans Design System

## Overview
Flat and minimal.
`;

describe('parseDesignMd', () => {
    it('extracts name and version from frontmatter', () => {
        const r = parseDesignMd(SAMPLE);
        expect(r.tokens.name).toBe('NXT Humans');
        expect(r.tokens.version).toBe('1.0.0');
    });

    it('extracts nested brand tokens', () => {
        const r = parseDesignMd(SAMPLE);
        expect(r.tokens.brands.nxt.primary).toBe('#0D0D0D');
        expect(r.tokens.brands.nu.accent).toBe('#C8102E');
    });

    it('preserves the raw markdown body for AI prompt injection', () => {
        const r = parseDesignMd(SAMPLE);
        expect(r.rawMarkdown).toContain('# NXT Humans Design System');
        expect(r.rawMarkdown).toContain('Flat and minimal.');
        expect(r.rawMarkdown).not.toContain('---\nname:');
    });

    it('throws when frontmatter is missing', () => {
        expect(() => parseDesignMd('# Just a doc\nno frontmatter here')).toThrow(/frontmatter/i);
    });

    it('throws when frontmatter YAML is malformed', () => {
        expect(() => parseDesignMd('---\nname: [unclosed\n---\n# Body')).toThrow();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- designMdLoader
```

Expected: all 5 tests fail (module not found).

- [ ] **Step 3: Install a YAML parser**

```bash
npm install --legacy-peer-deps yaml
```

- [ ] **Step 4: Implement the loader**

```ts
// humans-in-control-research/design-desk/services/designMdLoader.ts
import { parse as parseYaml } from 'yaml';

export interface DesignTokens {
    name: string;
    version: string;
    brands: Record<string, Record<string, string | number>>;
    typography?: Record<string, any>;
    layout?: Record<string, any>;
    iconography?: Record<string, any>;
    [key: string]: any;
}

export interface ParsedDesignMd {
    tokens: DesignTokens;
    rawMarkdown: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export function parseDesignMd(source: string): ParsedDesignMd {
    const match = source.match(FRONTMATTER_RE);
    if (!match) {
        throw new Error('DESIGN.md missing YAML frontmatter block');
    }
    const yamlBlock = match[1];
    const rawMarkdown = source.slice(match[0].length).trimStart();
    let tokens: DesignTokens;
    try {
        tokens = parseYaml(yamlBlock) as DesignTokens;
    } catch (e: any) {
        throw new Error(`DESIGN.md frontmatter YAML malformed: ${e.message}`);
    }
    if (!tokens?.name || !tokens?.brands) {
        throw new Error('DESIGN.md frontmatter must define `name` and `brands`');
    }
    return { tokens, rawMarkdown };
}

export async function loadDesignMd(url = '/DESIGN.md'): Promise<ParsedDesignMd> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load DESIGN.md (${resp.status})`);
    const text = await resp.text();
    return parseDesignMd(text);
}
```

- [ ] **Step 5: Serve DESIGN.md from Vite public root**

`vite.config.ts` serves the project root as the dev root; `DESIGN.md` is already at `humans-in-control-research/DESIGN.md`. Add a middleware to serve it at `/DESIGN.md`:

Edit `humans-in-control-research/vite.config.ts`. Find the existing `configureServer` plugin (serves wiki markdown) and add a handler:

```ts
{
    name: 'design-md-server',
    configureServer(server) {
        server.middlewares.use('/DESIGN.md', (req, res, next) => {
            const fs = require('fs');
            const path = require('path');
            const file = path.resolve(process.cwd(), 'DESIGN.md');
            if (fs.existsSync(file)) {
                res.setHeader('Content-Type', 'text/markdown');
                res.end(fs.readFileSync(file, 'utf-8'));
            } else {
                next();
            }
        });
    },
},
```

For production, ensure the Dockerfile COPY includes `DESIGN.md` in the nginx root. Modify `humans-in-control-research/Dockerfile` — find the `COPY --from=builder /app/dist /usr/share/nginx/html` line (or equivalent) and add:

```dockerfile
COPY DESIGN.md /usr/share/nginx/html/DESIGN.md
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test -- designMdLoader
```

Expected: all 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add humans-in-control-research/design-desk/services/designMdLoader.ts humans-in-control-research/design-desk/services/designMdLoader.test.ts humans-in-control-research/package.json humans-in-control-research/package-lock.json humans-in-control-research/vite.config.ts humans-in-control-research/Dockerfile
git commit -m "feat(design-desk): DESIGN.md loader + vite/nginx serving"
```

---

## Task 4: Persona artifact schema (Zod)

**Files:**
- Create: `humans-in-control-research/design-desk/schemas/personaArtifact.ts`
- Test: `humans-in-control-research/design-desk/schemas/personaArtifact.test.ts`
- Create: `humans-in-control-research/design-desk/__fixtures__/persona.valid.json`

- [ ] **Step 1: Write the failing tests**

```ts
// humans-in-control-research/design-desk/schemas/personaArtifact.test.ts
import { describe, it, expect } from 'vitest';
import { PersonaArtifactSchema, validatePersonaArtifact } from './personaArtifact';
import validFixture from '../__fixtures__/persona.valid.json';

describe('PersonaArtifactSchema', () => {
    it('accepts a well-formed persona', () => {
        const r = validatePersonaArtifact(validFixture);
        expect(r.ok).toBe(true);
    });

    it('rejects persona missing required fields', () => {
        const bad = { id: 'p1', type: 'persona', brand: 'nxt' };
        const r = validatePersonaArtifact(bad);
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.error).toMatch(/name|role|goals/i);
        }
    });

    it('rejects persona with invalid brand', () => {
        const bad = { ...validFixture, brand: 'acme' };
        const r = validatePersonaArtifact(bad);
        expect(r.ok).toBe(false);
    });

    it('rejects persona with empty goals array', () => {
        const bad = { ...validFixture, goals: [] };
        expect(validatePersonaArtifact(bad).ok).toBe(false);
    });

    it('rejects quote without source attribution', () => {
        const bad = { ...validFixture, quotes: [{ text: 'quoted text' }] };
        expect(validatePersonaArtifact(bad).ok).toBe(false);
    });
});
```

- [ ] **Step 2: Create the fixture**

```json
// humans-in-control-research/design-desk/__fixtures__/persona.valid.json
{
    "id": "p_1",
    "type": "persona",
    "brand": "nu",
    "name": "Sarah Chen",
    "role": "First-generation junior developer",
    "goals": ["Land first full-time dev role", "Pay off student debt within 5 years"],
    "painPoints": ["No family connections in tech", "Rejects without feedback"],
    "jtbd": "When I apply to jobs, I want to know where my application stands, so that I can pivot without wasting weeks.",
    "quotes": [
        { "text": "I sent 73 applications and got 2 interviews.", "source": "Reddit: r/cscareerquestions" }
    ],
    "citations": [{ "label": "Application volume", "source": "Higher Ed Dive, 2025" }],
    "createdAt": 1714000000000,
    "updatedAt": 1714000000000
}
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test -- personaArtifact
```

Expected: all 5 tests fail (module not found).

- [ ] **Step 4: Implement the schema**

```ts
// humans-in-control-research/design-desk/schemas/personaArtifact.ts
import { z } from 'zod';

export const BrandSchema = z.enum(['nxt', 'nu']);

export const PersonaArtifactSchema = z.object({
    id: z.string().min(1),
    type: z.literal('persona'),
    brand: BrandSchema,
    name: z.string().min(1),
    role: z.string().min(1),
    goals: z.array(z.string().min(1)).min(1),
    painPoints: z.array(z.string().min(1)).min(1),
    jtbd: z.string().min(1),
    quotes: z.array(z.object({
        text: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    citations: z.array(z.object({
        label: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type PersonaArtifact = z.infer<typeof PersonaArtifactSchema>;

export type ValidationResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: string };

export function validatePersonaArtifact(input: unknown): ValidationResult<PersonaArtifact> {
    const r = PersonaArtifactSchema.safeParse(input);
    if (r.success) return { ok: true, value: r.data };
    const firstIssue = r.error.issues[0];
    return { ok: false, error: `${firstIssue.path.join('.')}: ${firstIssue.message}` };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- personaArtifact
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add humans-in-control-research/design-desk/schemas/personaArtifact.ts humans-in-control-research/design-desk/schemas/personaArtifact.test.ts humans-in-control-research/design-desk/__fixtures__/persona.valid.json
git commit -m "feat(design-desk): persona artifact Zod schema + fixture + 5 tests"
```

---

## Task 5: Journey artifact schema (Zod)

**Files:**
- Create: `humans-in-control-research/design-desk/schemas/journeyArtifact.ts`
- Test: `humans-in-control-research/design-desk/schemas/journeyArtifact.test.ts`
- Create: `humans-in-control-research/design-desk/__fixtures__/journey.valid.json`

- [ ] **Step 1: Write the failing tests**

```ts
// humans-in-control-research/design-desk/schemas/journeyArtifact.test.ts
import { describe, it, expect } from 'vitest';
import { validateJourneyArtifact } from './journeyArtifact';
import validFixture from '../__fixtures__/journey.valid.json';

describe('JourneyArtifactSchema', () => {
    it('accepts a well-formed journey', () => {
        expect(validateJourneyArtifact(validFixture).ok).toBe(true);
    });

    it('rejects journey with no stages', () => {
        const bad = { ...validFixture, stages: [] };
        expect(validateJourneyArtifact(bad).ok).toBe(false);
    });

    it('rejects stage with invalid emotion', () => {
        const bad = { ...validFixture, stages: [{ ...validFixture.stages[0], emotion: 'ecstatic' }, ...validFixture.stages.slice(1)] };
        expect(validateJourneyArtifact(bad).ok).toBe(false);
    });

    it('rejects connection referencing nonexistent stage id', () => {
        const bad = { ...validFixture, connections: [{ from: 'nope', to: 's1' }] };
        const r = validateJourneyArtifact(bad);
        expect(r.ok).toBe(false);
    });

    it('accepts journey without explicit layout (FossFLOW can auto-layout)', () => {
        const { layout, ...rest } = validFixture as any;
        expect(validateJourneyArtifact(rest).ok).toBe(true);
    });
});
```

- [ ] **Step 2: Create the fixture**

```json
// humans-in-control-research/design-desk/__fixtures__/journey.valid.json
{
    "id": "j_1",
    "type": "journey",
    "brand": "nxt",
    "title": "Application-to-Enrollment",
    "stages": [
        { "id": "s1", "label": "Awareness", "emotion": "neutral", "touchpoints": ["Google"], "painPoints": [], "opportunities": ["SEO"] },
        { "id": "s2", "label": "Application", "emotion": "negative", "touchpoints": ["Portal"], "painPoints": ["50 required fields"], "opportunities": ["Reduce to 12"] },
        { "id": "s3", "label": "Enrollment", "emotion": "positive", "touchpoints": ["Onboarding"], "painPoints": [], "opportunities": [] }
    ],
    "connections": [
        { "from": "s1", "to": "s2", "label": "click apply" },
        { "from": "s2", "to": "s3" }
    ],
    "layout": { "nodes": { "s1": { "x": 0, "y": 0 }, "s2": { "x": 200, "y": 0 }, "s3": { "x": 400, "y": 0 } } },
    "citations": [{ "label": "Portal abandonment 62%", "source": "Higher Ed Dive, 2025" }],
    "createdAt": 1714000000000,
    "updatedAt": 1714000000000
}
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test -- journeyArtifact
```

Expected: 5 failures.

- [ ] **Step 4: Implement the schema**

```ts
// humans-in-control-research/design-desk/schemas/journeyArtifact.ts
import { z } from 'zod';
import { BrandSchema, type ValidationResult } from './personaArtifact';

export const JourneyStageSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    emotion: z.enum(['positive', 'neutral', 'negative']),
    touchpoints: z.array(z.string()).default([]),
    painPoints: z.array(z.string()).default([]),
    opportunities: z.array(z.string()).default([]),
});

export const JourneyArtifactSchema = z.object({
    id: z.string().min(1),
    type: z.literal('journey'),
    brand: BrandSchema,
    title: z.string().min(1),
    stages: z.array(JourneyStageSchema).min(1),
    connections: z.array(z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        label: z.string().optional(),
    })).default([]),
    layout: z.object({
        nodes: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
    }).optional(),
    citations: z.array(z.object({
        label: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    createdAt: z.number(),
    updatedAt: z.number(),
}).superRefine((val, ctx) => {
    const ids = new Set(val.stages.map(s => s.id));
    for (const conn of val.connections) {
        if (!ids.has(conn.from)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['connections'], message: `connection.from "${conn.from}" references nonexistent stage` });
        }
        if (!ids.has(conn.to)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['connections'], message: `connection.to "${conn.to}" references nonexistent stage` });
        }
    }
});

export type JourneyArtifact = z.infer<typeof JourneyArtifactSchema>;

export function validateJourneyArtifact(input: unknown): ValidationResult<JourneyArtifact> {
    const r = JourneyArtifactSchema.safeParse(input);
    if (r.success) return { ok: true, value: r.data };
    const firstIssue = r.error.issues[0];
    return { ok: false, error: `${firstIssue.path.join('.')}: ${firstIssue.message}` };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- journeyArtifact
```

Expected: 5 passes.

- [ ] **Step 6: Commit**

```bash
git add humans-in-control-research/design-desk/schemas/journeyArtifact.ts humans-in-control-research/design-desk/schemas/journeyArtifact.test.ts humans-in-control-research/design-desk/__fixtures__/journey.valid.json
git commit -m "feat(design-desk): journey artifact Zod schema + fixture + 5 tests (incl. cross-reference validation)"
```

---

## Task 6: Artifact store (Zustand)

**Files:**
- Create: `humans-in-control-research/design-desk/types.ts`
- Create: `humans-in-control-research/design-desk/store/designDeskStore.ts`
- Test: `humans-in-control-research/design-desk/store/designDeskStore.test.ts`

- [ ] **Step 1: Define the artifact union**

```ts
// humans-in-control-research/design-desk/types.ts
import type { PersonaArtifact } from './schemas/personaArtifact';
import type { JourneyArtifact } from './schemas/journeyArtifact';

export type Artifact = PersonaArtifact | JourneyArtifact;
export type ArtifactType = Artifact['type'];
```

- [ ] **Step 2: Write the failing tests**

```ts
// humans-in-control-research/design-desk/store/designDeskStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignDeskStore } from './designDeskStore';
import personaFixture from '../__fixtures__/persona.valid.json';
import journeyFixture from '../__fixtures__/journey.valid.json';
import type { PersonaArtifact } from '../schemas/personaArtifact';
import type { JourneyArtifact } from '../schemas/journeyArtifact';

describe('designDeskStore', () => {
    beforeEach(() => {
        useDesignDeskStore.getState().reset();
    });

    it('starts empty', () => {
        const s = useDesignDeskStore.getState();
        expect(s.artifacts).toEqual([]);
        expect(s.activeArtifactId).toBeNull();
    });

    it('addArtifact appends and activates', () => {
        useDesignDeskStore.getState().addArtifact(personaFixture as PersonaArtifact);
        const s = useDesignDeskStore.getState();
        expect(s.artifacts).toHaveLength(1);
        expect(s.activeArtifactId).toBe(personaFixture.id);
    });

    it('replaceArtifact swaps by id and pushes history', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        const updated = { ...personaFixture, name: 'Alex Chen' } as PersonaArtifact;
        store.replaceArtifact(updated);
        expect(useDesignDeskStore.getState().artifacts[0].name).toBe('Alex Chen');
        expect(useDesignDeskStore.getState().history).toHaveLength(1);
    });

    it('undo restores previous state', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        const updated = { ...personaFixture, name: 'Alex Chen' } as PersonaArtifact;
        store.replaceArtifact(updated);
        store.undo();
        expect(useDesignDeskStore.getState().artifacts[0].name).toBe('Sarah Chen');
    });

    it('undo is no-op when history empty', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        store.undo();
        expect(useDesignDeskStore.getState().artifacts).toHaveLength(1);
    });

    it('supports multiple artifacts of different types', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        store.addArtifact(journeyFixture as JourneyArtifact);
        expect(useDesignDeskStore.getState().artifacts).toHaveLength(2);
        expect(useDesignDeskStore.getState().activeArtifactId).toBe(journeyFixture.id);
    });

    it('setActiveArtifact switches focus', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        store.addArtifact(journeyFixture as JourneyArtifact);
        store.setActiveArtifact(personaFixture.id);
        expect(useDesignDeskStore.getState().activeArtifactId).toBe(personaFixture.id);
    });

    it('removeArtifact drops and updates active if needed', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        store.removeArtifact(personaFixture.id);
        expect(useDesignDeskStore.getState().artifacts).toHaveLength(0);
        expect(useDesignDeskStore.getState().activeArtifactId).toBeNull();
    });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test -- designDeskStore
```

Expected: 8 failures (module not found).

- [ ] **Step 4: Implement the store**

```ts
// humans-in-control-research/design-desk/store/designDeskStore.ts
import { create } from 'zustand';
import type { Artifact } from '../types';

const MAX_HISTORY = 20;

interface DesignDeskState {
    artifacts: Artifact[];
    activeArtifactId: string | null;
    history: Array<{ before: Artifact; timestamp: number }>;

    addArtifact: (artifact: Artifact) => void;
    replaceArtifact: (artifact: Artifact) => void;
    setActiveArtifact: (id: string) => void;
    removeArtifact: (id: string) => void;
    undo: () => void;
    reset: () => void;
}

export const useDesignDeskStore = create<DesignDeskState>((set) => ({
    artifacts: [],
    activeArtifactId: null,
    history: [],

    addArtifact: (artifact) => set((state) => ({
        artifacts: [...state.artifacts, artifact],
        activeArtifactId: artifact.id,
    })),

    replaceArtifact: (artifact) => set((state) => {
        const prev = state.artifacts.find(a => a.id === artifact.id);
        if (!prev) return state;
        const newHistory = [{ before: prev, timestamp: Date.now() }, ...state.history].slice(0, MAX_HISTORY);
        return {
            artifacts: state.artifacts.map(a => a.id === artifact.id ? artifact : a),
            history: newHistory,
        };
    }),

    setActiveArtifact: (id) => set({ activeArtifactId: id }),

    removeArtifact: (id) => set((state) => {
        const remaining = state.artifacts.filter(a => a.id !== id);
        return {
            artifacts: remaining,
            activeArtifactId: state.activeArtifactId === id
                ? (remaining[remaining.length - 1]?.id ?? null)
                : state.activeArtifactId,
        };
    }),

    undo: () => set((state) => {
        if (state.history.length === 0) return state;
        const [{ before }, ...rest] = state.history;
        return {
            artifacts: state.artifacts.map(a => a.id === before.id ? before : a),
            history: rest,
        };
    }),

    reset: () => set({ artifacts: [], activeArtifactId: null, history: [] }),
}));
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- designDeskStore
```

Expected: 8 passes.

- [ ] **Step 6: Commit**

```bash
git add humans-in-control-research/design-desk/types.ts humans-in-control-research/design-desk/store/designDeskStore.ts humans-in-control-research/design-desk/store/designDeskStore.test.ts
git commit -m "feat(design-desk): artifact store with add/replace/undo/active/remove (8 tests)"
```

---

## Task 7: Persona generation prompt + chatToArtifact for persona

**Files:**
- Create: `humans-in-control-research/design-desk/prompts/personaPrompt.ts`
- Create: `humans-in-control-research/design-desk/services/chatToArtifact.ts`

- [ ] **Step 1: Write the persona prompt**

```ts
// humans-in-control-research/design-desk/prompts/personaPrompt.ts
import type { PersonaArtifact } from '../schemas/personaArtifact';
import type { BrandHashtag } from '../services/hashtagParser';

export function buildPersonaPrompt(args: {
    designMdRaw: string;
    corpusText: string;
    currentArtifact: PersonaArtifact | null;
    userPrompt: string;
    brand: BrandHashtag;
}): string {
    const mode = args.currentArtifact ? 'REVISE' : 'CREATE';
    const currentBlock = args.currentArtifact
        ? `\nCURRENT PERSONA (revise this — emit a new full object, keep id unchanged):\n${JSON.stringify(args.currentArtifact, null, 2)}\n`
        : '';

    return `You are generating a PERSONA ARTIFACT for the NXT Humans Design Desk.

DESIGN SYSTEM (authoritative — obey all rules):
${args.designMdRaw}

RESEARCH CORPUS (use for grounding and citations):
${args.corpusText.slice(0, 60000)}

${currentBlock}
MODE: ${mode}
BRAND: ${args.brand}
USER PROMPT: ${args.userPrompt}

OUTPUT CONTRACT — respond with ONLY a single JSON object, no prose, no markdown fences:

{
  "id": "${args.currentArtifact?.id ?? 'p_<timestamp>'}",
  "type": "persona",
  "brand": "${args.brand}",
  "name": "<specific first + last name>",
  "role": "<specific role; include seniority if relevant>",
  "goals": ["<goal>", "<goal>", "<goal>"],
  "painPoints": ["<pain>", "<pain>", "<pain>"],
  "jtbd": "When <situation>, I want <motivation>, so that <outcome>.",
  "quotes": [{ "text": "<verbatim quote from corpus>", "source": "<named source>" }],
  "citations": [{ "label": "<fact>", "source": "<named source>" }],
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()}
}

CITATION RULES:
- Every quote MUST have a real named source (e.g., "Reddit: r/cscareerquestions", "Higher Ed Dive, 2025")
- Never use generic references ("research", "studies", "sources", "data")
- Prefer corpus-grounded quotes over fabricated ones; if none exist, emit zero quotes

CONTENT RULES:
- goals/painPoints are complete sentences with data where possible
- Do NOT use any of the banned phrases defined in the design system
- Plain text only in all fields — no markdown, no bold, no asterisks`;
}
```

- [ ] **Step 2: Implement chatToArtifact service**

```ts
// humans-in-control-research/design-desk/services/chatToArtifact.ts
import { validatePersonaArtifact, type PersonaArtifact } from '../schemas/personaArtifact';
import { validateJourneyArtifact, type JourneyArtifact } from '../schemas/journeyArtifact';
import { buildPersonaPrompt } from '../prompts/personaPrompt';
import { buildJourneyPrompt } from '../prompts/journeyPrompt';
import type { Artifact } from '../types';
import type { BrandHashtag, ContentHashtag } from './hashtagParser';

export interface GenerateArgs {
    content: ContentHashtag;
    brand: BrandHashtag;
    userPrompt: string;
    designMdRaw: string;
    corpusText: string;
    currentArtifact: Artifact | null;
}

export interface GenerateResult {
    ok: true;
    artifact: Artifact;
}
export interface GenerateError {
    ok: false;
    error: string;
    rawResponse?: string;
}

async function callClaude(prompt: string): Promise<string> {
    // Reuse the existing anthropicService — defer import to avoid circular deps at module load.
    const mod = await import('../../services/anthropicService');
    const text = await mod.callClaude({
        model: 'claude-opus-4-6',
        system: 'You are a consulting artifact generator. Return only JSON as specified.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4096,
    });
    return text;
}

function extractJson(raw: string): unknown | null {
    // Strip accidental markdown fences and anything outside the first balanced `{...}`.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = (fenced ? fenced[1] : raw).trim();
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) return null;
    try {
        return JSON.parse(candidate.slice(first, last + 1));
    } catch {
        return null;
    }
}

export async function generateArtifact(args: GenerateArgs): Promise<GenerateResult | GenerateError> {
    let prompt: string;
    if (args.content === 'persona') {
        prompt = buildPersonaPrompt({
            designMdRaw: args.designMdRaw,
            corpusText: args.corpusText,
            currentArtifact: args.currentArtifact?.type === 'persona' ? args.currentArtifact : null,
            userPrompt: args.userPrompt,
            brand: args.brand,
        });
    } else if (args.content === 'journey') {
        prompt = buildJourneyPrompt({
            designMdRaw: args.designMdRaw,
            corpusText: args.corpusText,
            currentArtifact: args.currentArtifact?.type === 'journey' ? args.currentArtifact : null,
            userPrompt: args.userPrompt,
            brand: args.brand,
        });
    } else {
        return { ok: false, error: `Content type "${args.content}" is not yet supported in the framework pilot (persona + journey only)` };
    }

    const raw = await callClaude(prompt);
    const parsed = extractJson(raw);
    if (!parsed) {
        return { ok: false, error: 'Model did not return parsable JSON', rawResponse: raw };
    }

    const validator = args.content === 'persona' ? validatePersonaArtifact : validateJourneyArtifact;
    const result = validator(parsed);
    if (!result.ok) {
        return { ok: false, error: `Artifact schema validation failed: ${result.error}`, rawResponse: raw };
    }

    return { ok: true, artifact: result.value as Artifact };
}
```

- [ ] **Step 3: Inspect existing anthropicService signature**

Open `humans-in-control-research/services/anthropicService.ts` and verify `callClaude` exists with the signature used above. If the export is named differently (e.g., `chatWithClaude`, `claudeMessages`), update the import in `chatToArtifact.ts` and adjust the invocation shape to match. Do NOT add a new wrapper — reuse the existing one exactly.

Note for the engineer: the service may not export `callClaude` verbatim; consult the file and adapt. The shape required is `(modelId, systemPrompt, userPrompt) → Promise<string>`. If the existing function returns `{ content: string }`, unwrap it in `callClaude` above.

- [ ] **Step 4: Commit (no tests yet — Task 8 covers journey + integration test)**

```bash
git add humans-in-control-research/design-desk/prompts/personaPrompt.ts humans-in-control-research/design-desk/services/chatToArtifact.ts
git commit -m "feat(design-desk): persona generation prompt + chatToArtifact dispatcher"
```

---

## Task 8: Journey generation prompt + JSON-extraction tests for chatToArtifact

**Files:**
- Create: `humans-in-control-research/design-desk/prompts/journeyPrompt.ts`
- Test: `humans-in-control-research/design-desk/services/chatToArtifact.test.ts`

- [ ] **Step 1: Write the journey prompt**

```ts
// humans-in-control-research/design-desk/prompts/journeyPrompt.ts
import type { JourneyArtifact } from '../schemas/journeyArtifact';
import type { BrandHashtag } from '../services/hashtagParser';

export function buildJourneyPrompt(args: {
    designMdRaw: string;
    corpusText: string;
    currentArtifact: JourneyArtifact | null;
    userPrompt: string;
    brand: BrandHashtag;
}): string {
    const mode = args.currentArtifact ? 'REVISE' : 'CREATE';
    const currentBlock = args.currentArtifact
        ? `\nCURRENT JOURNEY (revise this — emit a new full object, keep id unchanged):\n${JSON.stringify(args.currentArtifact, null, 2)}\n`
        : '';

    return `You are generating a JOURNEY ARTIFACT for the NXT Humans Design Desk.

DESIGN SYSTEM (authoritative — obey all rules):
${args.designMdRaw}

RESEARCH CORPUS (use for grounding and citations):
${args.corpusText.slice(0, 60000)}

${currentBlock}
MODE: ${mode}
BRAND: ${args.brand}
USER PROMPT: ${args.userPrompt}

OUTPUT CONTRACT — respond with ONLY a single JSON object, no prose, no markdown fences:

{
  "id": "${args.currentArtifact?.id ?? 'j_<timestamp>'}",
  "type": "journey",
  "brand": "${args.brand}",
  "title": "<action-title: conclusion with data>",
  "stages": [
    {
      "id": "s1",
      "label": "<stage name>",
      "emotion": "positive|neutral|negative",
      "touchpoints": ["<touchpoint>"],
      "painPoints": ["<pain>"],
      "opportunities": ["<opportunity>"]
    }
  ],
  "connections": [{ "from": "s1", "to": "s2", "label": "<optional transition>" }],
  "citations": [{ "label": "<fact>", "source": "<named source>" }],
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()}
}

RULES:
- 4-9 stages typical. Every stage.id is referenced by at least one connection unless it is the terminal stage.
- connections.from and connections.to MUST reference stage ids that exist in stages[].
- Every painPoint/opportunity is a complete sentence where possible.
- citations reference NAMED sources from the corpus — no generic "research" or "data".
- Plain text only; no markdown, no asterisks, no bold.`;
}
```

- [ ] **Step 2: Write the failing tests for extractJson + dispatch**

```ts
// humans-in-control-research/design-desk/services/chatToArtifact.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock anthropicService before importing chatToArtifact
vi.mock('../../services/anthropicService', () => ({
    callClaude: vi.fn(),
}));

import { generateArtifact } from './chatToArtifact';
import * as anthropicService from '../../services/anthropicService';
import personaFixture from '../__fixtures__/persona.valid.json';
import journeyFixture from '../__fixtures__/journey.valid.json';

describe('generateArtifact', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns validated persona when model emits clean JSON', async () => {
        (anthropicService.callClaude as any).mockResolvedValue(JSON.stringify(personaFixture));
        const r = await generateArtifact({
            content: 'persona', brand: 'nu', userPrompt: 'junior dev',
            designMdRaw: 'stub', corpusText: 'stub', currentArtifact: null,
        });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.artifact.type).toBe('persona');
    });

    it('strips markdown fences from model output', async () => {
        (anthropicService.callClaude as any).mockResolvedValue('```json\n' + JSON.stringify(personaFixture) + '\n```');
        const r = await generateArtifact({
            content: 'persona', brand: 'nu', userPrompt: 'x',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(true);
    });

    it('returns error when model returns non-JSON', async () => {
        (anthropicService.callClaude as any).mockResolvedValue('I apologize, but I cannot generate this.');
        const r = await generateArtifact({
            content: 'persona', brand: 'nxt', userPrompt: 'x',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toMatch(/parsable JSON/i);
    });

    it('returns error when JSON is parseable but schema-invalid', async () => {
        const bad = { ...personaFixture, goals: [] };
        (anthropicService.callClaude as any).mockResolvedValue(JSON.stringify(bad));
        const r = await generateArtifact({
            content: 'persona', brand: 'nxt', userPrompt: 'x',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toMatch(/validation failed/i);
    });

    it('dispatches to journey generator', async () => {
        (anthropicService.callClaude as any).mockResolvedValue(JSON.stringify(journeyFixture));
        const r = await generateArtifact({
            content: 'journey', brand: 'nxt', userPrompt: 'enrollment',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.artifact.type).toBe('journey');
    });

    it('rejects unsupported content type', async () => {
        const r = await generateArtifact({
            content: 'gap' as any, brand: 'nxt', userPrompt: 'x',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toMatch(/not yet supported/);
    });
});
```

- [ ] **Step 3: Run tests to verify they pass**

(The journey prompt exists; chatToArtifact was written in Task 7. These tests should pass with journey prompt in place.)

```bash
npm run test -- chatToArtifact
```

Expected: 6 passes. If `callClaude` symbol is named differently in `anthropicService.ts`, update the mock and the real import to match the actual export, then rerun.

- [ ] **Step 4: Commit**

```bash
git add humans-in-control-research/design-desk/prompts/journeyPrompt.ts humans-in-control-research/design-desk/services/chatToArtifact.test.ts
git commit -m "feat(design-desk): journey prompt + chatToArtifact dispatch tests (6)"
```

---

## Task 9: NxtDocViewer — persona renderer

**Files:**
- Create: `humans-in-control-research/design-desk/components/NxtDocViewer.tsx`

- [ ] **Step 1: Implement the persona document renderer**

```tsx
// humans-in-control-research/design-desk/components/NxtDocViewer.tsx
import React from 'react';
import type { PersonaArtifact } from '../schemas/personaArtifact';
import type { DesignTokens } from '../services/designMdLoader';

interface Props {
    artifact: PersonaArtifact;
    tokens: DesignTokens;
    onFieldEdit?: (field: keyof PersonaArtifact, value: any) => void;
}

export const NxtDocViewer: React.FC<Props> = ({ artifact, tokens, onFieldEdit }) => {
    const palette = tokens.brands[artifact.brand] as Record<string, string>;
    const primary = palette.primary;
    const accent = palette.accent;
    const panel = palette.panel ?? '#FAFAFA';

    const handleEdit = (field: keyof PersonaArtifact, value: any) => {
        onFieldEdit?.(field, value);
    };

    return (
        <div
            data-artifact-id={artifact.id}
            data-artifact-type="persona"
            style={{
                background: '#FFFFFF',
                color: primary,
                fontFamily: "'Archivo', sans-serif",
                padding: 40,
                maxWidth: 960,
                margin: '0 auto',
                borderLeft: `4px solid ${accent}`,
                minHeight: '100%',
            }}
        >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: accent }}>
                PERSONA / {artifact.brand.toUpperCase()}
            </div>

            <h1
                contentEditable={!!onFieldEdit}
                suppressContentEditableWarning
                onBlur={e => handleEdit('name', e.currentTarget.textContent || artifact.name)}
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3.5rem', letterSpacing: '0.02em', margin: '8px 0', color: primary }}
            >
                {artifact.name}
            </h1>

            <div
                contentEditable={!!onFieldEdit}
                suppressContentEditableWarning
                onBlur={e => handleEdit('role', e.currentTarget.textContent || artifact.role)}
                style={{ fontSize: 18, fontWeight: 600, marginBottom: 32, color: '#444' }}
            >
                {artifact.role}
            </div>

            <Section title="Jobs to Be Done" accent={accent}>
                <p
                    contentEditable={!!onFieldEdit}
                    suppressContentEditableWarning
                    onBlur={e => handleEdit('jtbd', e.currentTarget.textContent || artifact.jtbd)}
                    style={{ fontSize: 16, lineHeight: 1.6, margin: 0 }}
                >
                    {artifact.jtbd}
                </p>
            </Section>

            <Section title="Goals" accent={accent}>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                    {artifact.goals.map((g, i) => (
                        <li key={i} style={{ marginBottom: 8, lineHeight: 1.5 }}>{g}</li>
                    ))}
                </ul>
            </Section>

            <Section title="Pain Points" accent={accent}>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                    {artifact.painPoints.map((p, i) => (
                        <li key={i} style={{ marginBottom: 8, lineHeight: 1.5, color: '#CC6644' }}>{p}</li>
                    ))}
                </ul>
            </Section>

            {artifact.quotes.length > 0 && (
                <Section title="In Their Own Words" accent={accent}>
                    {artifact.quotes.map((q, i) => (
                        <blockquote key={i} style={{
                            borderLeft: `3px solid ${accent}`,
                            padding: '8px 16px',
                            margin: '12px 0',
                            background: panel,
                            fontStyle: 'italic',
                        }}>
                            <div style={{ fontSize: 15 }}>"{q.text}"</div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 6, color: '#666' }}>
                                — {q.source}
                            </div>
                        </blockquote>
                    ))}
                </Section>
            )}

            {artifact.citations.length > 0 && (
                <Section title="Citations" accent={accent}>
                    <ul style={{ paddingLeft: 20, margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {artifact.citations.map((c, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>
                                <strong>{c.label}</strong> — {c.source}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    );
};

const Section: React.FC<{ title: string; accent: string; children: React.ReactNode }> = ({ title, accent, children }) => (
    <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accent, marginBottom: 8 }}>
            {title}
        </div>
        {children}
    </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add humans-in-control-research/design-desk/components/NxtDocViewer.tsx
git commit -m "feat(design-desk): NxtDocViewer for persona artifact with inline field edits"
```

---

## Task 10: FossflowCanvas — journey renderer

**Files:**
- Create: `humans-in-control-research/design-desk/components/FossflowCanvas.tsx`

- [ ] **Step 1: Implement the canvas wrapper**

```tsx
// humans-in-control-research/design-desk/components/FossflowCanvas.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import type { JourneyArtifact } from '../schemas/journeyArtifact';
import type { DesignTokens } from '../services/designMdLoader';

// fossflow-lib exposes an <Isoflow /> React component. If the API name or
// prop shape differs, adjust the import + props. See fossflow-lib README.
let Isoflow: any;
try {
    // Dynamic require so a missing package doesn't crash the whole module at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Isoflow = require('fossflow-lib').default;
} catch {
    Isoflow = null;
}

interface Props {
    artifact: JourneyArtifact;
    tokens: DesignTokens;
    onLayoutChange?: (layout: JourneyArtifact['layout']) => void;
}

function journeyToFossflow(artifact: JourneyArtifact, tokens: DesignTokens): any {
    const palette = tokens.brands[artifact.brand] as Record<string, string>;
    const emotionColor: Record<string, string> = {
        positive: '#0CCE6B',
        neutral: palette.primary ?? '#0D0D0D',
        negative: palette.negative ?? '#CC6644',
    };
    const nodes = artifact.stages.map((stage, idx) => ({
        id: stage.id,
        label: stage.label,
        position: artifact.layout?.nodes?.[stage.id] ?? { x: idx * 160, y: 0 },
        color: emotionColor[stage.emotion],
        meta: { painPoints: stage.painPoints, opportunities: stage.opportunities, touchpoints: stage.touchpoints },
    }));
    const edges = artifact.connections.map((c, idx) => ({
        id: `e${idx}`,
        from: c.from,
        to: c.to,
        label: c.label ?? '',
    }));
    return { nodes, edges, background: '#FFFFFF', accent: palette.accent };
}

export const FossflowCanvas: React.FC<Props> = ({ artifact, tokens, onLayoutChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const diagram = useMemo(() => journeyToFossflow(artifact, tokens), [artifact, tokens]);

    if (!Isoflow) {
        return <FallbackList artifact={artifact} />;
    }

    return (
        <div ref={containerRef} data-artifact-id={artifact.id} data-artifact-type="journey" style={{ width: '100%', height: '100%', background: '#FFFFFF' }}>
            <Isoflow
                diagram={diagram}
                onChange={(next: any) => {
                    if (!onLayoutChange) return;
                    const nodes: Record<string, { x: number; y: number }> = {};
                    for (const n of next.nodes ?? []) nodes[n.id] = n.position;
                    onLayoutChange({ nodes });
                }}
            />
        </div>
    );
};

const FallbackList: React.FC<{ artifact: JourneyArtifact }> = ({ artifact }) => (
    <div style={{ padding: 24, fontFamily: "'Archivo', sans-serif" }}>
        <div style={{ background: '#FFF3CD', padding: 12, marginBottom: 16, fontSize: 12 }}>
            FossFLOW canvas unavailable — fallback list view
        </div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{artifact.title}</h1>
        {artifact.stages.map((s, i) => (
            <div key={s.id} style={{ padding: '12px 0', borderTop: i > 0 ? '1px solid #eee' : 'none' }}>
                <strong>{i + 1}. {s.label}</strong> <span style={{ color: '#888' }}>({s.emotion})</span>
                {s.painPoints.length > 0 && <div style={{ fontSize: 13, color: '#CC6644' }}>Pain: {s.painPoints.join('; ')}</div>}
                {s.opportunities.length > 0 && <div style={{ fontSize: 13, color: '#0CCE6B' }}>Opp: {s.opportunities.join('; ')}</div>}
            </div>
        ))}
    </div>
);
```

**Note to engineer:** `fossflow-lib`'s exact component name and prop shape may differ from `Isoflow` / `diagram` / `onChange` as written above. Check the installed package's README / types and adjust:

```bash
cd humans-in-control-research
ls node_modules/fossflow-lib
cat node_modules/fossflow-lib/package.json | grep -E '"main"|"types"|"exports"'
```

The fallback `FallbackList` component MUST remain as-is — it runs when the canvas can't load for any reason.

- [ ] **Step 2: Commit**

```bash
git add humans-in-control-research/design-desk/components/FossflowCanvas.tsx
git commit -m "feat(design-desk): FossflowCanvas wrapper + fallback list view for journey artifact"
```

---

## Task 11: ArtifactViewer + ExportMenu

**Files:**
- Create: `humans-in-control-research/design-desk/components/ExportMenu.tsx`
- Create: `humans-in-control-research/design-desk/services/artifactExporter.ts`
- Create: `humans-in-control-research/design-desk/ArtifactViewer.tsx`

- [ ] **Step 1: Implement the exporter**

```ts
// humans-in-control-research/design-desk/services/artifactExporter.ts
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Artifact } from '../types';

async function rasterize(el: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
    const rect = el.getBoundingClientRect();
    const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        width: rect.width,
        height: rect.height,
    });
    return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

export async function exportPng(el: HTMLElement, artifact: Artifact): Promise<void> {
    const { dataUrl } = await rasterize(el);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${artifact.type}-${artifact.id}.png`;
    a.click();
}

export async function exportPdf(el: HTMLElement, artifact: Artifact): Promise<void> {
    const { dataUrl, width, height } = await rasterize(el);
    // Exact-proportion PDF: page size matches canvas aspect ratio (points, 1px = 0.75pt at 96dpi baseline).
    const pdfWidthPt = width / 2 * 0.75; // scale:2 inflated pixel count — divide back out
    const pdfHeightPt = height / 2 * 0.75;
    const pdf = new jsPDF({
        orientation: pdfWidthPt > pdfHeightPt ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pdfWidthPt, pdfHeightPt],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidthPt, pdfHeightPt);
    pdf.save(`${artifact.type}-${artifact.id}.pdf`);
}

export async function exportPptx(el: HTMLElement, artifact: Artifact): Promise<void> {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const { dataUrl } = await rasterize(el);
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'NXT_16x9', width: 13.333, height: 7.5 });
    pptx.layout = 'NXT_16x9';
    const slide = pptx.addSlide();
    slide.addImage({ data: dataUrl, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: 'contain', w: 13.333, h: 7.5 } });
    await pptx.writeFile({ fileName: `${artifact.type}-${artifact.id}.pptx` });
}
```

- [ ] **Step 2: Implement the menu**

```tsx
// humans-in-control-research/design-desk/components/ExportMenu.tsx
import React, { useState } from 'react';
import type { Artifact } from '../types';
import { exportPdf, exportPng, exportPptx } from '../services/artifactExporter';

interface Props {
    artifact: Artifact;
    getViewerElement: () => HTMLElement | null;
}

export const ExportMenu: React.FC<Props> = ({ artifact, getViewerElement }) => {
    const [busy, setBusy] = useState<null | 'pdf' | 'png' | 'pptx'>(null);

    const run = async (fmt: 'pdf' | 'png' | 'pptx') => {
        const el = getViewerElement();
        if (!el) return;
        setBusy(fmt);
        try {
            if (fmt === 'pdf') await exportPdf(el, artifact);
            else if (fmt === 'png') await exportPng(el, artifact);
            else await exportPptx(el, artifact);
        } catch (e) {
            console.error(`[ExportMenu] ${fmt} export failed`, e);
            alert(`Export failed: ${(e as Error).message}`);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div style={{ display: 'flex', gap: 8 }}>
            {(['pdf', 'png', 'pptx'] as const).map(f => (
                <button key={f} onClick={() => run(f)} disabled={busy !== null}
                    style={{
                        padding: '6px 12px', fontFamily: "'Archivo', sans-serif", fontSize: 10, fontWeight: 700,
                        letterSpacing: 2, textTransform: 'uppercase', border: '1px solid #0D0D0D',
                        background: busy === f ? '#F0F0E8' : '#FFFFFF', cursor: busy === null ? 'pointer' : 'wait',
                    }}>
                    {busy === f ? 'Exporting…' : `Export ${f.toUpperCase()}`}
                </button>
            ))}
        </div>
    );
};
```

- [ ] **Step 3: Implement the viewer router**

```tsx
// humans-in-control-research/design-desk/ArtifactViewer.tsx
import React, { useRef } from 'react';
import { useDesignDeskStore } from './store/designDeskStore';
import { NxtDocViewer } from './components/NxtDocViewer';
import { FossflowCanvas } from './components/FossflowCanvas';
import { ExportMenu } from './components/ExportMenu';
import type { DesignTokens } from './services/designMdLoader';

interface Props {
    tokens: DesignTokens;
}

export const ArtifactViewer: React.FC<Props> = ({ tokens }) => {
    const { artifacts, activeArtifactId, setActiveArtifact, replaceArtifact, undo, history } = useDesignDeskStore();
    const viewerRef = useRef<HTMLDivElement>(null);

    const active = artifacts.find(a => a.id === activeArtifactId) ?? null;

    if (!active) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#888', fontFamily: "'Archivo', sans-serif" }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28 }}>NO ARTIFACT YET</div>
                <div style={{ marginTop: 8, fontSize: 13 }}>Try: <code>#persona #NU give me a first-gen junior dev</code></div>
            </div>
        );
    }

    const handleFieldEdit = (field: string, value: any) => {
        if (active.type !== 'persona') return;
        replaceArtifact({ ...active, [field]: value, updatedAt: Date.now() });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #E8E8E8' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    {artifacts.map(a => (
                        <button key={a.id} onClick={() => setActiveArtifact(a.id)}
                            style={{
                                padding: '4px 10px', border: '1px solid',
                                borderColor: a.id === activeArtifactId ? '#0D0D0D' : '#DDD',
                                background: a.id === activeArtifactId ? '#F0F0E8' : '#FFFFFF',
                                fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                            }}>
                            {a.type}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={undo} disabled={history.length === 0}
                        style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', border: '1px solid #DDD', background: '#FFFFFF', cursor: history.length ? 'pointer' : 'not-allowed' }}>
                        Undo
                    </button>
                    <ExportMenu artifact={active} getViewerElement={() => viewerRef.current} />
                </div>
            </div>

            <div ref={viewerRef} style={{ flex: 1, overflow: 'auto', background: '#FFFFFF' }}>
                {active.type === 'persona' && <NxtDocViewer artifact={active} tokens={tokens} onFieldEdit={handleFieldEdit} />}
                {active.type === 'journey' && <FossflowCanvas artifact={active} tokens={tokens} onLayoutChange={(layout) => replaceArtifact({ ...active, layout, updatedAt: Date.now() })} />}
            </div>
        </div>
    );
};
```

- [ ] **Step 4: Commit**

```bash
git add humans-in-control-research/design-desk/components/ExportMenu.tsx humans-in-control-research/design-desk/services/artifactExporter.ts humans-in-control-research/design-desk/ArtifactViewer.tsx
git commit -m "feat(design-desk): ArtifactViewer + ExportMenu + exporter (PDF exact-proportion, PNG, PPTX)"
```

---

## Task 12: DesignDeskChat (left pane)

**Files:**
- Create: `humans-in-control-research/design-desk/DesignDeskChat.tsx`

- [ ] **Step 1: Implement the chat panel**

```tsx
// humans-in-control-research/design-desk/DesignDeskChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { parseHashtags } from './services/hashtagParser';
import { generateArtifact } from './services/chatToArtifact';
import { useDesignDeskStore } from './store/designDeskStore';
import type { DesignTokens } from './services/designMdLoader';

interface ChatMsg {
    id: string;
    role: 'user' | 'system';
    content: string;
    timestamp: number;
}

interface Props {
    designMdRaw: string;
    tokens: DesignTokens;
    corpusText: string;
}

export const DesignDeskChat: React.FC<Props> = ({ designMdRaw, corpusText }) => {
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const { artifacts, activeArtifactId, addArtifact, replaceArtifact } = useDesignDeskStore();
    const active = artifacts.find(a => a.id === activeArtifactId) ?? null;

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
        const text = input.trim();
        if (!text || busy) return;

        const parsed = parseHashtags(text);
        const userMsg: ChatMsg = { id: `u_${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // No content hashtags → revise the active artifact (if any)
        if (parsed.content.length === 0) {
            if (!active) {
                setMessages(prev => [...prev, { id: `s_${Date.now()}`, role: 'system', timestamp: Date.now(),
                    content: 'No active artifact. Start one with a content hashtag: #persona, #journey, etc.' }]);
                return;
            }
            setBusy(true);
            const res = await generateArtifact({
                content: active.type, brand: active.brand, userPrompt: parsed.cleanPrompt,
                designMdRaw, corpusText, currentArtifact: active,
            });
            handleResult(res);
            setBusy(false);
            return;
        }

        setBusy(true);
        for (const contentTag of parsed.content) {
            if (contentTag !== 'persona' && contentTag !== 'journey') {
                setMessages(prev => [...prev, { id: `s_${Date.now()}_${contentTag}`, role: 'system', timestamp: Date.now(),
                    content: `#${contentTag} is out of scope for the framework pilot. Only #persona and #journey are supported in v1.` }]);
                continue;
            }
            const res = await generateArtifact({
                content: contentTag, brand: parsed.brand, userPrompt: parsed.cleanPrompt,
                designMdRaw, corpusText, currentArtifact: null,
            });
            handleResult(res, contentTag);
        }
        setBusy(false);
    };

    const handleResult = (res: Awaited<ReturnType<typeof generateArtifact>>, contentTag?: string) => {
        if (res.ok) {
            const isRevision = !!active && res.artifact.id === active.id;
            if (isRevision) replaceArtifact(res.artifact);
            else addArtifact(res.artifact);
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}`, role: 'system', timestamp: Date.now(),
                content: isRevision ? `Updated ${res.artifact.type}.` : `Created ${res.artifact.type}: ${(res.artifact as any).title ?? (res.artifact as any).name}`,
            }]);
        } else {
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}_err`, role: 'system', timestamp: Date.now(),
                content: `Generation failed${contentTag ? ` for #${contentTag}` : ''}: ${res.error}`,
            }]);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA', borderRight: '1px solid #E0E0E0' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E0E0E0', background: '#0D0D0D' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#B8B800' }}>Design Desk</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    Chat-driven artifact generation — persona + journey pilot
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 20, color: '#888', fontSize: 12 }}>
                        Try: <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>#persona #NU junior dev from first-gen background</code>
                    </div>
                )}
                {messages.map(m => (
                    <div key={m.id} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%', padding: '8px 12px', fontSize: 13, lineHeight: 1.5,
                        background: m.role === 'user' ? '#0D0D0D' : '#FFFFFF',
                        color: m.role === 'user' ? '#FFFFFF' : '#333',
                        border: m.role === 'system' ? '1px solid #E0E0E0' : 'none',
                    }}>{m.content}</div>
                ))}
                {busy && (
                    <div style={{ alignSelf: 'flex-start', padding: '8px 12px', fontSize: 12, color: '#888', fontStyle: 'italic' }}>Generating…</div>
                )}
                <div ref={endRef} />
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #E0E0E0', background: '#FFFFFF' }}>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Start with a hashtag: #persona, #journey…"
                    rows={2}
                    style={{ width: '100%', padding: 8, border: '1px solid #DDD', fontFamily: "'Archivo', sans-serif", fontSize: 13, resize: 'none' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                    <button onClick={send} disabled={busy || !input.trim()}
                        style={{ padding: '6px 16px', background: '#0D0D0D', color: '#FFFFFF', border: 'none',
                            fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                            cursor: busy || !input.trim() ? 'not-allowed' : 'pointer', opacity: busy || !input.trim() ? 0.5 : 1 }}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Commit**

```bash
git add humans-in-control-research/design-desk/DesignDeskChat.tsx
git commit -m "feat(design-desk): DesignDeskChat — hashtag-driven generation + active-artifact revision"
```

---

## Task 13: DesignDesk top-level layout + DESIGN.md bootstrap

**Files:**
- Create: `humans-in-control-research/design-desk/DesignDesk.tsx`
- Modify: `humans-in-control-research/design-desk/index.ts`

- [ ] **Step 1: Implement the layout shell**

```tsx
// humans-in-control-research/design-desk/DesignDesk.tsx
import React, { useEffect, useState } from 'react';
import { DesignDeskChat } from './DesignDeskChat';
import { ArtifactViewer } from './ArtifactViewer';
import { loadDesignMd, type ParsedDesignMd } from './services/designMdLoader';

interface Props {
    corpusText: string;
}

export const DesignDesk: React.FC<Props> = ({ corpusText }) => {
    const [design, setDesign] = useState<ParsedDesignMd | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDesignMd('/DESIGN.md').then(setDesign).catch(e => setError(e.message));
    }, []);

    if (error) {
        return (
            <div style={{ padding: 40, fontFamily: "'Archivo', sans-serif" }}>
                <div style={{ background: '#FFECEC', borderLeft: '4px solid #CC6644', padding: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>DESIGN.md failed to load</div>
                    <div style={{ fontSize: 13 }}>{error}</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>The Design Desk cannot operate without DESIGN.md. Check that humans-in-control-research/DESIGN.md exists and vite/nginx is serving it at /DESIGN.md.</div>
                </div>
            </div>
        );
    }
    if (!design) {
        return <div style={{ padding: 40, fontSize: 12, color: '#888' }}>Loading design system…</div>;
    }

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: "'Archivo', sans-serif", background: '#FFFFFF' }}>
            <div style={{ flex: '0 0 40%', minWidth: 380, maxWidth: 560, display: 'flex' }}>
                <DesignDeskChat designMdRaw={design.rawMarkdown} tokens={design.tokens} corpusText={corpusText} />
            </div>
            <div style={{ flex: 1, display: 'flex' }}>
                <ArtifactViewer tokens={design.tokens} />
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Barrel is already correct (`index.ts` re-exports DesignDesk). Verify the build:**

```bash
cd humans-in-control-research && npm run build
```

Expected: build succeeds. If `fossflow-lib` type issues block the build, add `// @ts-ignore` to the dynamic require in FossflowCanvas and retry.

- [ ] **Step 3: Commit**

```bash
git add humans-in-control-research/design-desk/DesignDesk.tsx
git commit -m "feat(design-desk): DesignDesk top-level layout (split: chat / viewer) + DESIGN.md bootstrap"
```

---

## Task 14: Integrate into App.tsx — add DESIGN_DESK AppState + nav entry

**Files:**
- Modify: `humans-in-control-research/types.ts` (AppState enum at line 409)
- Modify: `humans-in-control-research/App.tsx`

- [ ] **Step 1: Extend the AppState enum**

Open `humans-in-control-research/types.ts`. Find `export enum AppState {` (around line 409). Add a new member:

```ts
export enum AppState {
    // ... existing members ...
    DESIGN_DESK = 'DESIGN_DESK',
}
```

- [ ] **Step 2: Wire a nav entry + rendering branch in App.tsx**

Open `humans-in-control-research/App.tsx`.

2a. Add the import near the other component imports (around line 11-14):

```tsx
import { DesignDesk } from './design-desk';
```

2b. Find the top-level nav (look for the first top-nav-ish structure that sets `appMode` or renders tab buttons — around lines 3250-3270 there's the IDLE render). Inject a "DESIGN DESK" button next to the existing navigation where users pick modes. If the current App does not have a persistent top nav, the simplest integration is to add a button in the IDLE screen header that sets `appState = DESIGN_DESK`.

Minimal patch — add this button in whatever nav/header block renders at the top of the IDLE state:

```tsx
{process.env.DESIGN_DESK_ENABLED === 'true' && (
    <button
        onClick={() => setAppState(AppState.DESIGN_DESK)}
        style={{ padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', border: '1px solid #B8B800', color: '#0D0D0D', background: '#FAFAF7', cursor: 'pointer' }}>
        Design Desk
    </button>
)}
```

2c. Add a rendering branch. Find the block of `{appState === AppState.XXX && (...)}` renderers (around line 3260-3724). Add:

```tsx
{appState === AppState.DESIGN_DESK && (
    <DesignDesk corpusText={result ? JSON.stringify(result).slice(0, 80000) : ''} />
)}
```

`result` is the analyst-desk research result already in scope at App.tsx render. For the pilot, stringifying it is sufficient context. A later pass can extract a cleaner corpus projection.

- [ ] **Step 3: Manual smoke test**

```bash
cd humans-in-control-research && npm run dev
```

1. Open http://localhost:3000.
2. Verify "DESIGN DESK" button appears in the IDLE header.
3. Click it — `DesignDesk` should render (loading spinner briefly, then the chat+viewer layout).
4. Type `#persona #NU a first-generation junior developer`. Expected: persona appears in the right pane within ~20s.
5. Export PNG — a PNG file should download matching what's on screen.
6. Type `#journey #NXT applying to enrollment`. Expected: a journey renders in FossFLOW (or in the fallback list view).
7. Type `add a pain point about financial aid` (no hashtags, with persona active). Expected: persona regenerates with the new pain point.

If step 6 produces the fallback (not FossFLOW), that's still a success at the plan level — verify the fallback message appears and the journey data is shown as a list. FossFLOW integration tuning is Task 15.

- [ ] **Step 4: Commit**

```bash
git add humans-in-control-research/types.ts humans-in-control-research/App.tsx
git commit -m "feat(design-desk): integrate into App.tsx behind DESIGN_DESK AppState + feature flag"
```

---

## Task 15: FossFLOW NXT skinning + verification

**Files:**
- Modify: `humans-in-control-research/design-desk/components/FossflowCanvas.tsx`

- [ ] **Step 1: Inspect the installed fossflow-lib API**

```bash
cd humans-in-control-research
cat node_modules/fossflow-lib/README.md 2>&1 | head -100
cat node_modules/fossflow-lib/dist/index.d.ts 2>&1 | head -200
```

Find:
- The actual exported component name and default export shape
- Its props: do they accept `diagram`, `nodes`, `edges`, `onChange`? Or different names?
- Styling: is there a `theme`, `colors`, or `tokens` prop?
- Icon overrides: is there a `nodeRenderer` / `icons` prop?

- [ ] **Step 2: Update FossflowCanvas to match the real API**

If the exported component is (e.g.) `<FossFlow />` with `{ nodes, connectors }` props:

```tsx
// Inside FossflowCanvas.tsx — replace the rendering block with the real API:
return (
    <div ref={containerRef} data-artifact-id={artifact.id} data-artifact-type="journey" style={{ width: '100%', height: '100%', background: '#FFFFFF' }}>
        <FossFlow
            nodes={diagram.nodes}
            connectors={diagram.edges}
            theme={{
                background: '#FFFFFF',
                accent: diagram.accent,
                nodeFill: '#FFFFFF',
                nodeStroke: '#0D0D0D',
                textColor: '#0D0D0D',
                font: "'Archivo', sans-serif",
            }}
            onStateChange={(next: any) => {
                if (!onLayoutChange) return;
                const nodes: Record<string, { x: number; y: number }> = {};
                for (const n of next.nodes ?? []) nodes[n.id] = n.position;
                onLayoutChange({ nodes });
            }}
        />
    </div>
);
```

Adapt the prop names to what the package actually exposes. If the package does NOT accept a theme prop, inject a global style override in the containing div that targets FossFLOW's emitted SVG classes — inspect the DOM at runtime to find class names, then add:

```tsx
<style>{`
    div[data-artifact-type="journey"] .isoflow-node-fill { fill: #FFFFFF !important; }
    div[data-artifact-type="journey"] .isoflow-node-stroke { stroke: #0D0D0D !important; }
    div[data-artifact-type="journey"] .isoflow-edge { stroke: ${diagram.accent} !important; }
    div[data-artifact-type="journey"] text { font-family: 'Archivo', sans-serif !important; fill: #0D0D0D !important; }
`}</style>
```

Adjust the selectors after inspecting the real rendered output.

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

1. Type `#journey #NXT applying to enrollment`.
2. Verify: journey renders via FossFLOW (not fallback).
3. Verify: nodes are flat white with 1px black stroke; edges are chartreuse (#B8B800); typography is Archivo.
4. Drag a node — verify `onLayoutChange` fires (check the React DevTools store; `layout.nodes` should update).
5. Type `#NU #journey ...` — verify edges re-color to Huskies Red (#C8102E).

- [ ] **Step 4: Commit**

```bash
git add humans-in-control-research/design-desk/components/FossflowCanvas.tsx
git commit -m "feat(design-desk): FossFLOW NXT skinning — flat white nodes, brand-accent edges, Archivo"
```

---

## Task 16: End-to-end validation + rollout checklist

**Files:** none — validation task.

- [ ] **Step 1: Run the full test suite**

```bash
cd humans-in-control-research && npm run test
```

Expected: all tests from Tasks 2-8 pass (33 tests total: 9 parser + 5 loader + 5 persona + 5 journey + 8 store + 6 chatToArtifact — adjust count if you've added any).

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Docker build sanity check**

```bash
cd .. && docker compose -f docker-compose-all.yml up -d --build research-generator
```

Wait for build to finish; hard-refresh http://localhost:5011. Verify DESIGN DESK button appears and works end-to-end the same as in dev.

- [ ] **Step 4: Cross-model parity check (manual)**

In `humans-in-control-research/design-desk/services/chatToArtifact.ts`, the generator currently uses Claude Opus 4.7 hardcoded. Run the same prompt through Gemini and GPT-5.4 Mini by temporarily swapping `callClaude` with calls to `geminiService` / `openaiService` (or use the UI if a model selector is added). Visually compare the three outputs:

- [ ] All three produce valid artifacts (no schema errors)
- [ ] All three respect DESIGN.md (NXT palette, Archivo font, no banned phrases)
- [ ] All three respect citation rules (no generic "research" / "data")

Document findings in `humans-in-control-research/changelog.md` under a new entry `2026-04-24 Design Desk framework shipped (pilot)`.

- [ ] **Step 5: Commit final validation**

```bash
git add humans-in-control-research/changelog.md
git commit -m "docs(design-desk): changelog entry + cross-model parity findings for framework pilot"
```

- [ ] **Step 6: Update project memory**

Append to `C:\Users\JonathanLupo\.claude\projects\d--NXT-HUMANS-AI-CX-WORKBENCH\memory\MEMORY.md` a new line under the HiC Research section:

```markdown
## HiC Design Desk Framework — SHIPPED (2026-04-24)
- [Framework + persona/journey pilots](project_hic_design_desk.md) — new tab, DESIGN.md grounding, FossFLOW diagram artifacts, chat-driven editing, PDF/PNG/PPTX export; follow-on specs cover 8 remaining artifact types
```

Create the memory pointer file with a 1-paragraph summary of what shipped.

---

## Self-Review (completed inline during writing)

**Spec coverage check:**
- §4.1 hashtag grammar → Task 2 implements parser
- §4.3 Design Desk tab layout → Task 13 + Task 14
- §5.1(1) Design Desk tab → Task 13 + Task 14
- §5.1(2) DESIGN.md → Task 1 authors it, Task 3 loads it
- §5.1(3) hashtag parser → Task 2
- §5.1(4) artifact store → Task 6
- §5.1(5) FossflowCanvas → Task 10 + Task 15
- §5.1(6) NxtDocViewer → Task 9
- §5.1(7) DesignMdLoader → Task 3
- §5.1(8) chat-artifact binding → Task 7 + Task 8 + Task 12
- §5.1(9) export pipeline → Task 11
- §5.1(10) Persona pilot → Tasks 4, 7, 9
- §5.1(11) Journey pilot → Tasks 5, 8, 10, 15
- §6 Approach 1 (full-state rewrites) → Task 6 replaceArtifact + Task 7/8 generation
- §7 error handling → covered inline (DESIGN.md load failure in Task 13, schema validation in Tasks 7-8, FossFLOW fallback in Task 10)
- §8 testing → Tasks 0 (Vitest setup) + 2/3/4/5/6/8 (~33 tests)
- §9 rollout feature flag → Task 0 step 5, Task 14 step 2b

**Placeholder scan:** no TBDs, no "handle edge cases" without code, every code step has concrete code. One deliberate instruction-to-engineer block in Task 7 step 3 and Task 15 step 1 — both flag API-name uncertainty with specific steps to resolve. Both are unavoidable without first installing the package, which happens in Task 0.

**Type consistency:** `ParsedHashtags.content` is `ContentHashtag[]` throughout. `Artifact` union stable in `types.ts`. `generateArtifact` return shape used consistently by DesignDeskChat. `DesignTokens` shape consistent across renderers. No renaming drift.

**Scope:** Framework + 2 pilots, ships as one cohesive implementation. 17 tasks (0-16), each bite-sized with explicit commit points.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-24-design-desk-framework.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
