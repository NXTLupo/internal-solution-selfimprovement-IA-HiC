# Freeform-HTML Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 5 schema-validated diagram artifacts (org, journey, arch, roadmap, blueprint) with AI-emitted full HTML documents inheriting visual treatment from user-curated 1920x1080 exemplars, rendered in iframe isolation, exported at high quality with editable text overlay in PPTX.

**Architecture:** Single unified freeform pipeline. Hashtag-driven loading of two skill axes (brand-style, diagram-illustrator) plus the matching exemplar HTML. Model emits `:::nxt:freeform` block (JSON header + raw HTML body). Sanitized via DOMPurify. Rendered in sandboxed iframe at native 1920x1080. Exported via html-to-image at 2x pixel ratio plus DOM-walked vector text overlay for PPTX.

**Tech Stack:** React 18 + TypeScript 5.8 + Vite 6 + Zustand 4 + Zod 3 + DOMPurify 3 + html-to-image 1.11 + jspdf 2.5 + pptxgenjs 3.12. Tested with Vitest 4. Deployed via Docker (nginx serving static dist on port 5011).

**Source spec:** `docs/superpowers/specs/2026-04-26-freeform-html-artifacts-design.md` (commit 6bdcd32)

**Standing constraints (carried from prior sessions):**
- **Sacred ports:** never bind 3000 (Social Research) or 5011 (HiC). HiC frontend changes ship via `docker compose -f docker-compose-all.yml up -d --build research-generator` then hard-refresh.
- **Build, then test, then commit:** every task ends at `git add` (stage). User commits when satisfied. No per-task `git commit`.
- **Test before handoff:** HTTP 200 is not enough. Tasks that affect rendering require a manual browser verification step.
- **No emoji** in prompts, code, or outputs.

---

## File Structure

### New files (in `humans-in-control-research/`)

| Path | Responsibility |
|---|---|
| `design-desk/schemas/freeformArtifact.ts` | Minimal Zod schema for `FreeformArtifact` (html field is opaque string) |
| `design-desk/schemas/freeformArtifact.test.ts` | Schema unit tests |
| `design-desk/services/exemplarLoader.ts` | Load exemplar HTML + brand skill md + diagram skill md by `kind × brand` |
| `design-desk/services/exemplarLoader.test.ts` | Loader unit tests with fixtures |
| `design-desk/services/freeformParser.ts` | Parse `:::nxt:freeform` block (JSON header + `---` + HTML body) |
| `design-desk/services/freeformParser.test.ts` | Parser unit tests |
| `design-desk/services/freeformSanitizer.ts` | DOMPurify wrapper with explicit allowlist |
| `design-desk/services/freeformSanitizer.test.ts` | Sanitizer unit tests |
| `design-desk/services/chatToFreeform.ts` | Build prompt, route to provider, parse output, sanitize, validate |
| `design-desk/services/chatToFreeform.test.ts` | Prompt-building tests with mocked provider |
| `design-desk/services/freeformExporter.ts` | PNG + PDF + PPTX (with vector-text overlay) export |
| `design-desk/components/FreeformViewer.tsx` | iframe-based artifact renderer |
| `design-desk/__fixtures__/freeform-output-sample.txt` | Example model output (`:::nxt:freeform` block) for parser tests |
| `humans-in-control-research/styles/09-journey-NU.html` | NEW — copy of 01-service-blueprint-NU.html (current-state framing) |
| `humans-in-control-research/styles/10-journey-NXT.html` | NEW — copy of 02-service-blueprint-NXT.html (current-state framing) |

> Note: per spec, `#journey` and `#blueprint` SHARE the existing 01/02 service-blueprint exemplar files. Tasks below initially wire the loader to both kinds reading from 01/02. The 09/10 file slots above are a future option if the user wants journey to diverge visually later — they are NOT created in this plan. Removed from the table; left as a note here only.

### New skill markdown (in `.claude/skills/`)

| Path | Author |
|---|---|
| `.claude/skills/brands/nxt-style/SKILL.md` | User authors content; this plan creates a stub |
| `.claude/skills/brands/nu-style/SKILL.md` | User authors content; this plan creates a stub |
| `.claude/skills/diagrams/org-illustrator/SKILL.md` | User authors content; this plan creates a stub |
| `.claude/skills/diagrams/journey-illustrator/SKILL.md` | User authors content; this plan creates a stub |
| `.claude/skills/diagrams/arch-illustrator/SKILL.md` | User authors content; this plan creates a stub |
| `.claude/skills/diagrams/roadmap-illustrator/SKILL.md` | User authors content; this plan creates a stub |
| `.claude/skills/diagrams/blueprint-illustrator/SKILL.md` | User authors content; this plan creates a stub |

### Modified files

| Path | Change |
|---|---|
| `design-desk/types.ts` | Add `FreeformArtifact`; widen the `Artifact` union |
| `design-desk/services/hashtagParser.ts` | Add `deck` as alias for `slides`; verify all 5 freeform kinds present |
| `design-desk/services/hashtagParser.test.ts` | Add tests for `#deck` alias |
| `design-desk/store/designDeskStore.ts` | Drop legacy `org`/`journey` artifacts on hydrate |
| `design-desk/DesignDeskChat.tsx` | Route freeform kinds through `chatToFreeform` |
| `design-desk/ArtifactViewer.tsx` | Render `FreeformViewer` when `artifact.type === 'freeform'`; remove org/journey branches |
| `design-desk/components/ExportMenu.tsx` | Use `freeformExporter` for freeform; pass artifact directly (no DOM ref) |
| `package.json` | Add `dompurify`, `@types/dompurify`; remove `fossflow`, `reactflow`, `@dagrejs/dagre` |

### Deleted files (Task 15 only — after E2E green)

| Path | Reason |
|---|---|
| `design-desk/components/OrgChartCanvas.tsx` | Replaced by FreeformViewer |
| `design-desk/components/OrgChartNode.tsx` | Dead with OrgChartCanvas |
| `design-desk/components/FossflowCanvas.tsx` | Replaced by FreeformViewer |
| `design-desk/schemas/orgChartArtifact.ts` | Replaced by freeformArtifact |
| `design-desk/schemas/orgChartArtifact.test.ts` | Dead with schema |
| `design-desk/schemas/journeyArtifact.ts` | Replaced by freeformArtifact |
| `design-desk/schemas/journeyArtifact.test.ts` | Dead with schema |
| `design-desk/prompts/orgChartPrompt.ts` | Replaced by exemplar inheritance |
| `design-desk/prompts/journeyPrompt.ts` | Replaced by exemplar inheritance |
| `design-desk/services/chatToArtifact.ts` | Replaced by chatToFreeform |
| `design-desk/services/chatToArtifact.test.ts` | Dead with chatToArtifact |
| `design-desk/services/artifactExporter.ts` | Replaced by freeformExporter |
| `design-desk/__fixtures__/orgChart.valid.json` | Dead with schema |
| `design-desk/__fixtures__/journey.valid.json` | Dead with schema |

---

## Task 1: Add `FreeformArtifact` type and schema

**Files:**
- Create: `humans-in-control-research/design-desk/schemas/freeformArtifact.ts`
- Create: `humans-in-control-research/design-desk/schemas/freeformArtifact.test.ts`
- Modify: `humans-in-control-research/design-desk/types.ts`

- [ ] **Step 1: Read the existing types file to understand the union shape**

Run: `cat humans-in-control-research/design-desk/types.ts`
Expected output: existing `Artifact` discriminated union with `'persona' | 'journey' | 'org'` types.

- [ ] **Step 2: Write failing test for the schema**

Create `humans-in-control-research/design-desk/schemas/freeformArtifact.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateFreeformArtifact, FreeformArtifactSchema } from './freeformArtifact';

const valid = {
    id: 'f_1',
    type: 'freeform' as const,
    kind: 'org' as const,
    brand: 'nu' as const,
    title: 'Northeastern Advancement',
    html: '<!DOCTYPE html><html><body>...</body></html>',
    citations: [{ label: 'Org doc', source: 'NU Advancement Charter' }],
    createdAt: 1714150000000,
    updatedAt: 1714150000000,
};

describe('freeformArtifact schema', () => {
    it('accepts a valid artifact', () => {
        const r = validateFreeformArtifact(valid);
        expect(r.ok).toBe(true);
    });

    it('rejects unknown kind', () => {
        const r = validateFreeformArtifact({ ...valid, kind: 'unknown' });
        expect(r.ok).toBe(false);
    });

    it('rejects unknown brand', () => {
        const r = validateFreeformArtifact({ ...valid, brand: 'apple' });
        expect(r.ok).toBe(false);
    });

    it('accepts empty citations array', () => {
        const r = validateFreeformArtifact({ ...valid, citations: [] });
        expect(r.ok).toBe(true);
    });

    it('treats html as opaque string (does not parse it)', () => {
        const r = validateFreeformArtifact({ ...valid, html: '<<<not html>>>' });
        expect(r.ok).toBe(true);
    });

    it('rejects empty html', () => {
        const r = validateFreeformArtifact({ ...valid, html: '' });
        expect(r.ok).toBe(false);
    });
});
```

- [ ] **Step 3: Run test to confirm it fails**

Run: `cd humans-in-control-research && npm test -- design-desk/schemas/freeformArtifact.test.ts`
Expected: 6 tests fail (`Cannot find module './freeformArtifact'`).

- [ ] **Step 4: Write the schema**

Create `humans-in-control-research/design-desk/schemas/freeformArtifact.ts`:

```ts
import { z } from 'zod';
import { BrandSchema, type ValidationResult } from './personaArtifact';

export const FreeformKindSchema = z.enum(['org', 'journey', 'arch', 'roadmap', 'blueprint']);
export type FreeformKind = z.infer<typeof FreeformKindSchema>;

export const FreeformArtifactSchema = z.object({
    id: z.string().min(1),
    type: z.literal('freeform'),
    kind: FreeformKindSchema,
    brand: BrandSchema,
    title: z.string().min(1),
    html: z.string().min(1),
    citations: z.array(z.object({
        label: z.string().min(1),
        source: z.string().min(1),
    })).default([]),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type FreeformArtifact = z.infer<typeof FreeformArtifactSchema>;

export function validateFreeformArtifact(input: unknown): ValidationResult<FreeformArtifact> {
    const r = FreeformArtifactSchema.safeParse(input);
    if (r.success) return { ok: true, value: r.data };
    const firstIssue = r.error.issues[0];
    return { ok: false, error: `${firstIssue.path.join('.')}: ${firstIssue.message}` };
}
```

- [ ] **Step 5: Run test to confirm it passes**

Run: `cd humans-in-control-research && npm test -- design-desk/schemas/freeformArtifact.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 6: Widen the `Artifact` union in types.ts**

Modify `humans-in-control-research/design-desk/types.ts`:

```ts
import type { PersonaArtifact } from './schemas/personaArtifact';
import type { JourneyArtifact } from './schemas/journeyArtifact';
import type { OrgChartArtifact } from './schemas/orgChartArtifact';
import type { FreeformArtifact } from './schemas/freeformArtifact';

// Existing union, widened to include FreeformArtifact. The legacy types remain
// in the union ONLY for the duration of the migration window — they are
// filtered out at hydrate time (see designDeskStore) and the renderer no
// longer has a path for them. Task 15 deletes the legacy types entirely.
export type Artifact = PersonaArtifact | JourneyArtifact | OrgChartArtifact | FreeformArtifact;
```

- [ ] **Step 7: Verify the project type-checks**

Run: `cd humans-in-control-research && npx tsc --noEmit`
Expected: zero new type errors. (Pre-existing errors are tolerable; this task should not add any.)

- [ ] **Step 8: Stage (do not commit)**

Run:
```bash
git add humans-in-control-research/design-desk/schemas/freeformArtifact.ts \
        humans-in-control-research/design-desk/schemas/freeformArtifact.test.ts \
        humans-in-control-research/design-desk/types.ts
git status
```
Expected: 3 files staged, no commit. User will review later.

---

## Task 2: Add `#deck` alias to hashtag parser

**Files:**
- Modify: `humans-in-control-research/design-desk/services/hashtagParser.ts`
- Modify: `humans-in-control-research/design-desk/services/hashtagParser.test.ts`

- [ ] **Step 1: Write a failing test for `#deck`**

Append to `humans-in-control-research/design-desk/services/hashtagParser.test.ts`:

```ts
describe('parseHashtags - #deck composition modifier', () => {
    it('treats #deck as alias for #slides', () => {
        const r = parseHashtags('#org #deck #NU advancement');
        expect(r.composition).toBe('slides');
        expect(r.content).toContain('org');
        expect(r.brand).toBe('nu');
    });

    it('still recognizes #slides directly', () => {
        const r = parseHashtags('#org #slides #NU advancement');
        expect(r.composition).toBe('slides');
    });

    it('strips #deck from cleanPrompt', () => {
        const r = parseHashtags('#org #deck advancement division');
        expect(r.cleanPrompt).not.toContain('#deck');
        expect(r.cleanPrompt).toContain('advancement division');
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd humans-in-control-research && npm test -- design-desk/services/hashtagParser.test.ts`
Expected: 3 new tests FAIL.

- [ ] **Step 3: Add `deck` recognition to the parser**

Modify `humans-in-control-research/design-desk/services/hashtagParser.ts`:

Find:
```ts
const VIEW_SINGLE = 'slide';
const VIEW_MULTI = 'slides';
```

Replace with:
```ts
const VIEW_SINGLE = 'slide';
const VIEW_MULTI = 'slides';
const VIEW_MULTI_ALIAS = 'deck';   // alias for slides — same composition behavior
```

Find:
```ts
        } else if (tag === VIEW_MULTI) {
            composition = 'slides';
            consumed = true;
```

Replace with:
```ts
        } else if (tag === VIEW_MULTI || tag === VIEW_MULTI_ALIAS) {
            composition = 'slides';
            consumed = true;
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `cd humans-in-control-research && npm test -- design-desk/services/hashtagParser.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Stage**

```bash
git add humans-in-control-research/design-desk/services/hashtagParser.ts \
        humans-in-control-research/design-desk/services/hashtagParser.test.ts
```

---

## Task 3: Add DOMPurify dependency

**Files:**
- Modify: `humans-in-control-research/package.json`
- Modify: `humans-in-control-research/package-lock.json`

- [ ] **Step 1: Install dompurify and types**

Run: `cd humans-in-control-research && npm install --save dompurify@^3.2.4 && npm install --save-dev @types/dompurify@^3`
Expected: package.json and package-lock.json updated; node_modules has the packages.

- [ ] **Step 2: Verify it imports without errors**

Run: `cd humans-in-control-research && node -e "console.log(typeof require('dompurify'))"`
Expected: `function`

- [ ] **Step 3: Stage**

```bash
git add humans-in-control-research/package.json humans-in-control-research/package-lock.json
```

> **Do NOT remove fossflow/reactflow/@dagrejs/dagre yet** — they are still imported by the existing `OrgChartCanvas.tsx` / `FossflowCanvas.tsx` files. Task 15 removes them after the legacy code is deleted.

---

## Task 4: Create exemplar loader

**Files:**
- Create: `humans-in-control-research/design-desk/services/exemplarLoader.ts`
- Create: `humans-in-control-research/design-desk/services/exemplarLoader.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `humans-in-control-research/design-desk/services/exemplarLoader.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Vite's ?raw imports — the loader uses these to bundle exemplars and skill markdown
vi.mock('../../styles/01-service-blueprint-NU.html?raw', () => ({ default: '<!DOCTYPE html><html data-fixture="bp-nu"></html>' }));
vi.mock('../../styles/02-service-blueprint-NXT.html?raw', () => ({ default: '<!DOCTYPE html><html data-fixture="bp-nxt"></html>' }));
vi.mock('../../styles/03-architecture-NU.html?raw', () => ({ default: '<!DOCTYPE html><html data-fixture="arch-nu"></html>' }));
vi.mock('../../styles/04-architecture-NXT.html?raw', () => ({ default: '<!DOCTYPE html><html data-fixture="arch-nxt"></html>' }));
vi.mock('../../styles/05-org-chart-NU.html?raw', () => ({ default: '<!DOCTYPE html><html data-fixture="org-nu"></html>' }));
vi.mock('../../styles/06-org-chart-NXT.html?raw', () => ({ default: '<!DOCTYPE html><html data-fixture="org-nxt"></html>' }));
vi.mock('../../styles/07-roadmap-NU.html?raw', () => ({ default: '<!DOCTYPE html><html data-fixture="rm-nu"></html>' }));
vi.mock('../../styles/08-roadmap-NXT.html?raw', () => ({ default: '<!DOCTYPE html><html data-fixture="rm-nxt"></html>' }));

// Skill markdown mocks
vi.mock('../../../.claude/skills/brands/nxt-style/SKILL.md?raw', () => ({ default: '# NXT brand skill' }));
vi.mock('../../../.claude/skills/brands/nu-style/SKILL.md?raw', () => ({ default: '# NU brand skill' }));
vi.mock('../../../.claude/skills/diagrams/org-illustrator/SKILL.md?raw', () => ({ default: '# Org illustrator' }));
vi.mock('../../../.claude/skills/diagrams/journey-illustrator/SKILL.md?raw', () => ({ default: '# Journey illustrator' }));
vi.mock('../../../.claude/skills/diagrams/arch-illustrator/SKILL.md?raw', () => ({ default: '# Arch illustrator' }));
vi.mock('../../../.claude/skills/diagrams/roadmap-illustrator/SKILL.md?raw', () => ({ default: '# Roadmap illustrator' }));
vi.mock('../../../.claude/skills/diagrams/blueprint-illustrator/SKILL.md?raw', () => ({ default: '# Blueprint illustrator' }));

import { loadExemplar } from './exemplarLoader';

describe('exemplarLoader', () => {
    it('loads org NU bundle', () => {
        const r = loadExemplar('org', 'nu');
        expect(r.exemplarHtml).toContain('data-fixture="org-nu"');
        expect(r.brandSkill).toContain('NU brand skill');
        expect(r.diagramSkill).toContain('Org illustrator');
    });

    it('loads journey NXT bundle (shares blueprint exemplar)', () => {
        const r = loadExemplar('journey', 'nxt');
        expect(r.exemplarHtml).toContain('data-fixture="bp-nxt"');
        expect(r.brandSkill).toContain('NXT brand skill');
        expect(r.diagramSkill).toContain('Journey illustrator');
    });

    it('loads blueprint NU bundle (shares same exemplar as journey)', () => {
        const r = loadExemplar('blueprint', 'nu');
        expect(r.exemplarHtml).toContain('data-fixture="bp-nu"');
    });

    it('throws for unknown kind', () => {
        expect(() => loadExemplar('unknown' as any, 'nu')).toThrow(/unknown.*kind/i);
    });

    it('throws for unknown brand', () => {
        expect(() => loadExemplar('org', 'apple' as any)).toThrow(/unknown.*brand/i);
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd humans-in-control-research && npm test -- design-desk/services/exemplarLoader.test.ts`
Expected: tests fail with `Cannot find module './exemplarLoader'`.

- [ ] **Step 3: Write the loader**

Create `humans-in-control-research/design-desk/services/exemplarLoader.ts`:

```ts
import type { FreeformKind } from '../schemas/freeformArtifact';
import type { BrandHashtag } from './hashtagParser';

// Vite ?raw imports — the file content is bundled at build time as a string.
// After updating any of these source files (HTML or SKILL.md), a Docker
// rebuild is required to pick up the change (no HMR in production).

import bpNuHtml from '../../styles/01-service-blueprint-NU.html?raw';
import bpNxtHtml from '../../styles/02-service-blueprint-NXT.html?raw';
import archNuHtml from '../../styles/03-architecture-NU.html?raw';
import archNxtHtml from '../../styles/04-architecture-NXT.html?raw';
import orgNuHtml from '../../styles/05-org-chart-NU.html?raw';
import orgNxtHtml from '../../styles/06-org-chart-NXT.html?raw';
import roadmapNuHtml from '../../styles/07-roadmap-NU.html?raw';
import roadmapNxtHtml from '../../styles/08-roadmap-NXT.html?raw';

import nxtBrandSkill from '../../../.claude/skills/brands/nxt-style/SKILL.md?raw';
import nuBrandSkill from '../../../.claude/skills/brands/nu-style/SKILL.md?raw';

import orgSkill from '../../../.claude/skills/diagrams/org-illustrator/SKILL.md?raw';
import journeySkill from '../../../.claude/skills/diagrams/journey-illustrator/SKILL.md?raw';
import archSkill from '../../../.claude/skills/diagrams/arch-illustrator/SKILL.md?raw';
import roadmapSkill from '../../../.claude/skills/diagrams/roadmap-illustrator/SKILL.md?raw';
import blueprintSkill from '../../../.claude/skills/diagrams/blueprint-illustrator/SKILL.md?raw';

const EXEMPLARS: Record<FreeformKind, Record<BrandHashtag, string>> = {
    org:       { nu: orgNuHtml,     nxt: orgNxtHtml     },
    arch:      { nu: archNuHtml,    nxt: archNxtHtml    },
    roadmap:   { nu: roadmapNuHtml, nxt: roadmapNxtHtml },
    // Journey and blueprint share the service-blueprint exemplar — semantic
    // difference (current vs future state) lives in the diagram skill markdown.
    blueprint: { nu: bpNuHtml,      nxt: bpNxtHtml      },
    journey:   { nu: bpNuHtml,      nxt: bpNxtHtml      },
};

const BRAND_SKILLS: Record<BrandHashtag, string> = {
    nxt: nxtBrandSkill,
    nu:  nuBrandSkill,
};

const DIAGRAM_SKILLS: Record<FreeformKind, string> = {
    org:       orgSkill,
    journey:   journeySkill,
    arch:      archSkill,
    roadmap:   roadmapSkill,
    blueprint: blueprintSkill,
};

export interface ExemplarBundle {
    exemplarHtml: string;
    brandSkill: string;
    diagramSkill: string;
}

export function loadExemplar(kind: FreeformKind, brand: BrandHashtag): ExemplarBundle {
    const kindMap = EXEMPLARS[kind];
    if (!kindMap) throw new Error(`exemplarLoader: unknown kind "${kind}"`);
    const exemplarHtml = kindMap[brand];
    if (!exemplarHtml) throw new Error(`exemplarLoader: unknown brand "${brand}"`);
    const brandSkill = BRAND_SKILLS[brand];
    const diagramSkill = DIAGRAM_SKILLS[kind];
    if (!brandSkill || brandSkill.trim().length === 0) {
        throw new Error(`exemplarLoader: brand skill not authored — add content to .claude/skills/brands/${brand}-style/SKILL.md`);
    }
    if (!diagramSkill || diagramSkill.trim().length === 0) {
        throw new Error(`exemplarLoader: diagram skill not authored — add content to .claude/skills/diagrams/${kind}-illustrator/SKILL.md`);
    }
    return { exemplarHtml, brandSkill, diagramSkill };
}
```

- [ ] **Step 4: Create the 7 SKILL.md stubs (so loader doesn't blow up at runtime before user authors)**

Create each file with the exact content shown — the stub MUST be non-empty for the loader's "not authored" guard to pass once user begins authoring. The user replaces stub content with real exemplars + guidance.

`.claude/skills/brands/nxt-style/SKILL.md`:
```markdown
---
name: nxt-style
description: NXT Humans brand-style skill for freeform-HTML diagram artifacts. Editorial layer (voice, anti-patterns, when-to-use). Visual tokens live in the exemplar HTML files at humans-in-control-research/styles/.
---

# NXT Humans brand style

STUB — author voice, anti-patterns, and when-to-use guidance here. The visual tokens (colors, typography) are inherited from the exemplar HTML files; do not redefine them in this markdown.
```

`.claude/skills/brands/nu-style/SKILL.md`:
```markdown
---
name: nu-style
description: Northeastern University brand-style skill for freeform-HTML diagram artifacts. Editorial layer (voice, anti-patterns, when-to-use). Visual tokens live in the exemplar HTML files at humans-in-control-research/styles/.
---

# Northeastern University brand style

STUB — author voice, anti-patterns, and when-to-use guidance here. The visual tokens (colors, typography) are inherited from the exemplar HTML files; do not redefine them in this markdown.
```

`.claude/skills/diagrams/org-illustrator/SKILL.md`:
```markdown
---
name: org-illustrator
description: Org chart diagram illustrator skill. Layout idioms (hierarchy / radial / matrix), anti-patterns, when-to-use guidance. Inherits visual treatment from styles/05-org-chart-NU.html and styles/06-org-chart-NXT.html.
---

# Org chart illustrator

STUB — author idiom variants and anti-patterns here.
```

`.claude/skills/diagrams/journey-illustrator/SKILL.md`:
```markdown
---
name: journey-illustrator
description: Journey map (CURRENT-state) illustrator skill. Frames stages as observed reality, pain points as evidenced friction, opportunities as noted-but-not-committed. Shares visual exemplar with blueprint; diverges semantically. Inherits from styles/01-service-blueprint-NU.html and styles/02-service-blueprint-NXT.html.
---

# Journey map (current-state) illustrator

STUB — author current-state framing guidance, idiom variants, and anti-patterns here. Note: visually identical to blueprint; semantically different.
```

`.claude/skills/diagrams/arch-illustrator/SKILL.md`:
```markdown
---
name: arch-illustrator
description: Technical architecture illustrator skill. Systems, components, data flows, integration patterns. Inherits visual treatment from styles/03-architecture-NU.html and styles/04-architecture-NXT.html.
---

# Technical architecture illustrator

STUB — author idiom variants and anti-patterns here.
```

`.claude/skills/diagrams/roadmap-illustrator/SKILL.md`:
```markdown
---
name: roadmap-illustrator
description: Roadmap illustrator skill. Phases, milestones, now-next-later, Gantt-style timeline. Inherits visual treatment from styles/07-roadmap-NU.html and styles/08-roadmap-NXT.html.
---

# Roadmap illustrator

STUB — author idiom variants and anti-patterns here.
```

`.claude/skills/diagrams/blueprint-illustrator/SKILL.md`:
```markdown
---
name: blueprint-illustrator
description: Service blueprint (FUTURE-state) illustrator skill. Frames stages as proposed post-analysis design — pain points resolved, lanes restructured, evidence cites diagnosis driving each design choice. Shares visual exemplar with journey; diverges semantically. Inherits from styles/01-service-blueprint-NU.html and styles/02-service-blueprint-NXT.html.
---

# Service blueprint (future-state) illustrator

STUB — author future-state framing guidance, idiom variants, and anti-patterns here. Note: visually identical to journey; semantically different.
```

- [ ] **Step 5: Run test to confirm it passes**

Run: `cd humans-in-control-research && npm test -- design-desk/services/exemplarLoader.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 6: Stage**

```bash
git add humans-in-control-research/design-desk/services/exemplarLoader.ts \
        humans-in-control-research/design-desk/services/exemplarLoader.test.ts \
        .claude/skills/brands/nxt-style/SKILL.md \
        .claude/skills/brands/nu-style/SKILL.md \
        .claude/skills/diagrams/org-illustrator/SKILL.md \
        .claude/skills/diagrams/journey-illustrator/SKILL.md \
        .claude/skills/diagrams/arch-illustrator/SKILL.md \
        .claude/skills/diagrams/roadmap-illustrator/SKILL.md \
        .claude/skills/diagrams/blueprint-illustrator/SKILL.md
```

---

## Task 5: Create freeform output parser

**Files:**
- Create: `humans-in-control-research/design-desk/services/freeformParser.ts`
- Create: `humans-in-control-research/design-desk/services/freeformParser.test.ts`
- Create: `humans-in-control-research/design-desk/__fixtures__/freeform-output-sample.txt`

- [ ] **Step 1: Create a fixture of a typical model output**

Create `humans-in-control-research/design-desk/__fixtures__/freeform-output-sample.txt`:

```
:::nxt:freeform
{
  "id": "f_1714150000000",
  "kind": "org",
  "brand": "nu",
  "title": "Northeastern Advancement Division",
  "citations": [
    { "label": "Organizational chart", "source": "NU Advancement charter, 2025" }
  ]
}
---
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>NU Advancement</title></head>
<body class="brand-nu">
  <div class="slide-frame">
    <h1>Northeastern Advancement</h1>
    <p>Body content with --- in the middle should not split parsing</p>
  </div>
</body>
</html>
:::
```

- [ ] **Step 2: Write the failing tests**

Create `humans-in-control-research/design-desk/services/freeformParser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFreeformOutput } from './freeformParser';

const sample = readFileSync(join(__dirname, '../__fixtures__/freeform-output-sample.txt'), 'utf-8');

describe('parseFreeformOutput', () => {
    it('extracts header JSON and HTML body from a full sample', () => {
        const r = parseFreeformOutput(sample);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.header.id).toBe('f_1714150000000');
        expect(r.header.kind).toBe('org');
        expect(r.header.brand).toBe('nu');
        expect(r.header.title).toBe('Northeastern Advancement Division');
        expect(r.header.citations).toHaveLength(1);
        expect(r.html).toContain('<!DOCTYPE html>');
        expect(r.html).toContain('<body class="brand-nu">');
    });

    it('preserves --- inside the HTML body (only the FIRST --- separator counts)', () => {
        const r = parseFreeformOutput(sample);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.html).toContain('--- in the middle should not split');
    });

    it('strips ```json or ``` fences if the model adds them', () => {
        const fenced = '```\n' + sample + '\n```';
        const r = parseFreeformOutput(fenced);
        expect(r.ok).toBe(true);
    });

    it('returns error for missing :::nxt:freeform open marker', () => {
        const r = parseFreeformOutput('just some text');
        expect(r.ok).toBe(false);
    });

    it('returns error for missing --- separator', () => {
        const r = parseFreeformOutput(':::nxt:freeform\n{"id":"x"}\n<html></html>\n:::');
        expect(r.ok).toBe(false);
    });

    it('returns error when JSON header is malformed', () => {
        const broken = ':::nxt:freeform\n{not valid json\n---\n<html></html>\n:::';
        const r = parseFreeformOutput(broken);
        expect(r.ok).toBe(false);
    });
});
```

- [ ] **Step 3: Run test to confirm it fails**

Run: `cd humans-in-control-research && npm test -- design-desk/services/freeformParser.test.ts`
Expected: tests fail (module not found).

- [ ] **Step 4: Write the parser**

Create `humans-in-control-research/design-desk/services/freeformParser.ts`:

```ts
import type { FreeformKind } from '../schemas/freeformArtifact';
import type { BrandHashtag } from './hashtagParser';

export interface FreeformHeader {
    id: string;
    kind: FreeformKind;
    brand: BrandHashtag;
    title: string;
    citations: Array<{ label: string; source: string }>;
}

export type ParseResult =
    | { ok: true; header: FreeformHeader; html: string }
    | { ok: false; error: string };

const OPEN = ':::nxt:freeform';
const CLOSE = ':::';
const SEP = '---';

/**
 * Parse a model response of the form:
 *
 *   :::nxt:freeform
 *   { "id": "...", "kind": "...", "brand": "...", "title": "...", "citations": [...] }
 *   ---
 *   <!DOCTYPE html>...full HTML body...</html>
 *   :::
 *
 * Tolerates surrounding ```...``` fences (some providers add them).
 * Only the FIRST `---` line splits header from body — `---` inside the HTML
 * body (e.g. inside a comment, inside text content) is preserved.
 */
export function parseFreeformOutput(raw: string): ParseResult {
    // Strip optional outer code fence
    const fenceMatch = raw.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)\s*```/);
    const candidate = (fenceMatch ? fenceMatch[1] : raw).trim();

    const openIdx = candidate.indexOf(OPEN);
    if (openIdx < 0) return { ok: false, error: `missing "${OPEN}" open marker` };

    // Find the LAST ::: as the closer (so any ::: inside the body is tolerated)
    const closeIdx = candidate.lastIndexOf(CLOSE);
    if (closeIdx <= openIdx) return { ok: false, error: 'missing or misplaced ::: close marker' };

    const inner = candidate.slice(openIdx + OPEN.length, closeIdx).trim();

    // Split on the first line that is exactly "---" (with optional whitespace)
    const sepRegex = /\r?\n\s*---\s*\r?\n/;
    const sepMatch = sepRegex.exec(inner);
    if (!sepMatch) return { ok: false, error: 'missing --- separator between header and body' };

    const headerJson = inner.slice(0, sepMatch.index).trim();
    const html = inner.slice(sepMatch.index + sepMatch[0].length).trim();

    let header: FreeformHeader;
    try {
        header = JSON.parse(headerJson);
    } catch (e) {
        return { ok: false, error: `header JSON parse failed: ${(e as Error).message}` };
    }

    if (typeof header.id !== 'string' || typeof header.title !== 'string'
        || typeof header.kind !== 'string' || typeof header.brand !== 'string') {
        return { ok: false, error: 'header missing required fields (id, title, kind, brand)' };
    }
    if (!Array.isArray(header.citations)) {
        header.citations = [];
    }

    if (html.length === 0) {
        return { ok: false, error: 'HTML body is empty' };
    }

    return { ok: true, header, html };
}
```

- [ ] **Step 5: Run test to confirm it passes**

Run: `cd humans-in-control-research && npm test -- design-desk/services/freeformParser.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 6: Stage**

```bash
git add humans-in-control-research/design-desk/services/freeformParser.ts \
        humans-in-control-research/design-desk/services/freeformParser.test.ts \
        humans-in-control-research/design-desk/__fixtures__/freeform-output-sample.txt
```

---

## Task 6: Create freeform sanitizer

**Files:**
- Create: `humans-in-control-research/design-desk/services/freeformSanitizer.ts`
- Create: `humans-in-control-research/design-desk/services/freeformSanitizer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `humans-in-control-research/design-desk/services/freeformSanitizer.test.ts`:

```ts
/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { sanitizeFreeformHtml } from './freeformSanitizer';

describe('sanitizeFreeformHtml', () => {
    it('strips <script> tags', () => {
        const input = '<html><body><div>ok</div><script>alert(1)</script></body></html>';
        const out = sanitizeFreeformHtml(input);
        expect(out).not.toContain('<script');
        expect(out).toContain('<div>ok</div>');
    });

    it('strips event handler attributes', () => {
        const input = '<div onclick="hack()">x</div>';
        const out = sanitizeFreeformHtml(input);
        expect(out).not.toContain('onclick');
    });

    it('strips javascript: URLs', () => {
        const input = '<a href="javascript:alert(1)">x</a>';
        const out = sanitizeFreeformHtml(input);
        expect(out).not.toContain('javascript:');
    });

    it('preserves <style> blocks', () => {
        const input = '<html><head><style>.foo{color:red}</style></head><body></body></html>';
        const out = sanitizeFreeformHtml(input);
        expect(out).toContain('.foo{color:red}');
    });

    it('preserves <link rel="stylesheet"> tags (Google Fonts preconnect/load)', () => {
        const input = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo">';
        const out = sanitizeFreeformHtml(input);
        expect(out).toContain('href="https://fonts.googleapis.com');
    });

    it('preserves SVG drawing primitives', () => {
        const input = '<svg viewBox="0 0 100 100"><path d="M0,0 L100,100" stroke="red"/><circle cx="50" cy="50" r="10"/></svg>';
        const out = sanitizeFreeformHtml(input);
        expect(out).toContain('<path');
        expect(out).toContain('<circle');
        expect(out).toContain('viewBox');
    });

    it('preserves data-* and aria-* attributes', () => {
        const input = '<div data-id="x" aria-label="y">z</div>';
        const out = sanitizeFreeformHtml(input);
        expect(out).toContain('data-id="x"');
        expect(out).toContain('aria-label="y"');
    });

    it('strips <iframe>', () => {
        const input = '<iframe src="https://evil.com"></iframe>';
        const out = sanitizeFreeformHtml(input);
        expect(out).not.toContain('<iframe');
    });

    it('strips <form> and <input>', () => {
        const input = '<form><input name="x"/></form>';
        const out = sanitizeFreeformHtml(input);
        expect(out).not.toContain('<form');
        expect(out).not.toContain('<input');
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd humans-in-control-research && npm test -- design-desk/services/freeformSanitizer.test.ts`
Expected: tests fail (module not found).

- [ ] **Step 3: Write the sanitizer**

Create `humans-in-control-research/design-desk/services/freeformSanitizer.ts`:

```ts
import DOMPurify from 'dompurify';

/**
 * Sanitize an AI-emitted HTML document for safe rendering inside a sandboxed
 * iframe. Allowlist is tight — every tag/attribute the freeform exemplars
 * actually use is explicitly listed. Anything else is stripped silently.
 *
 * Run inside the host page (not inside the iframe) before passing to srcDoc.
 * The iframe's own sandbox attribute is a defense-in-depth second line:
 * sanitizer is the primary safety boundary.
 */

const ALLOWED_TAGS = [
    // Document structure
    'html', 'head', 'body', 'meta', 'title', 'link', 'style',
    // Block + inline
    'div', 'span', 'main', 'header', 'footer', 'nav', 'section', 'article',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'strong', 'em', 'b', 'i', 'u', 'small', 'code', 'pre', 'blockquote',
    // Tabular
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
    // SVG primitives the exemplars use for drawing
    'svg', 'g', 'path', 'line', 'circle', 'rect', 'ellipse', 'polygon', 'polyline',
    'text', 'tspan', 'defs', 'marker', 'linearGradient', 'radialGradient', 'stop',
    'clipPath', 'mask', 'use', 'symbol', 'pattern',
    // Media
    'img',
];

const ALLOWED_ATTRS = [
    // Generic
    'class', 'style', 'id', 'lang', 'dir', 'role',
    // Meta / link
    'charset', 'name', 'content', 'rel', 'href', 'crossorigin',
    // Image
    'src', 'alt', 'width', 'height', 'loading',
    // SVG
    'viewBox', 'preserveAspectRatio',
    'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
    'd', 'fill', 'fill-opacity', 'fill-rule',
    'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
    'points', 'transform', 'opacity',
    'gradientUnits', 'gradientTransform', 'spreadMethod', 'offset', 'stop-color', 'stop-opacity',
    'clip-path', 'mask', 'filter', 'text-anchor', 'dominant-baseline',
    // Tabular
    'colspan', 'rowspan', 'scope',
];

// Global allowlist of attribute prefixes — DOMPurify supports this via ALLOW_DATA_ATTR / ALLOW_ARIA_ATTR
const ALLOW_DATA_ATTR = true;
const ALLOW_ARIA_ATTR = true;

export function sanitizeFreeformHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        WHOLE_DOCUMENT: true,    // accept full <!DOCTYPE html>...<html>...</html> input
        ALLOWED_TAGS,
        ALLOWED_ATTR: ALLOWED_ATTRS,
        ALLOW_DATA_ATTR,
        ALLOW_ARIA_ATTR,
        // Drop dangerous protocols
        ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[#/])/i,
        // Strip on*= event handlers explicitly
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
        // Strip elements that bypass our model
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea'],
        // Keep <style> contents intact (DOMPurify default would tokenize; we want the CSS verbatim)
        ADD_TAGS: ['style'],
        KEEP_CONTENT: true,
    });
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `cd humans-in-control-research && npm test -- design-desk/services/freeformSanitizer.test.ts`
Expected: 9 tests PASS.

> If any test fails because DOMPurify's defaults differ from expectations, adjust the config — but DO NOT widen the FORBID_TAGS list. The script/iframe/form blocks are mandatory.

- [ ] **Step 5: Stage**

```bash
git add humans-in-control-research/design-desk/services/freeformSanitizer.ts \
        humans-in-control-research/design-desk/services/freeformSanitizer.test.ts
```

---

## Task 7: Create chatToFreeform — prompt builder + provider routing

**Files:**
- Create: `humans-in-control-research/design-desk/services/chatToFreeform.ts`
- Create: `humans-in-control-research/design-desk/services/chatToFreeform.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `humans-in-control-research/design-desk/services/chatToFreeform.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./exemplarLoader', () => ({
    loadExemplar: vi.fn().mockReturnValue({
        exemplarHtml: '<html data-fixture="exemplar"></html>',
        brandSkill: '# brand skill content',
        diagramSkill: '# diagram skill content',
    }),
}));

vi.mock('../../services/anthropicService', () => ({
    analyzeText: vi.fn(),
}));

vi.mock('../../services/openaiService', () => ({
    analyzeText: vi.fn(),
}));

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: {
            generateContent: vi.fn().mockResolvedValue({
                text: ':::nxt:freeform\n' +
                      '{"id":"f_1","kind":"org","brand":"nu","title":"Test","citations":[]}\n' +
                      '---\n' +
                      '<!DOCTYPE html><html><body>generated</body></html>\n' +
                      ':::',
            }),
        },
    })),
}));

import { generateFreeformArtifact } from './chatToFreeform';

describe('generateFreeformArtifact', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns a sanitized FreeformArtifact on a successful gemini round-trip', async () => {
        const r = await generateFreeformArtifact({
            kind: 'org',
            brand: 'nu',
            userPrompt: 'advancement division',
            corpus: '',
            currentArtifact: null,
            model: 'gemini-2.5-flash',
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.artifact.type).toBe('freeform');
        expect(r.artifact.kind).toBe('org');
        expect(r.artifact.brand).toBe('nu');
        expect(r.artifact.html).toContain('<!DOCTYPE html>');
        // sanitizer ran (script tag would be stripped if present)
        expect(r.artifact.html).not.toContain('<script');
    });

    it('fails fast when exemplar loader throws (skill not authored)', async () => {
        const { loadExemplar } = await import('./exemplarLoader');
        (loadExemplar as any).mockImplementationOnce(() => {
            throw new Error('exemplarLoader: brand skill not authored — add content to .claude/skills/brands/nu-style/SKILL.md');
        });
        const r = await generateFreeformArtifact({
            kind: 'org',
            brand: 'nu',
            userPrompt: 'x',
            corpus: '',
            currentArtifact: null,
            model: 'gemini-2.5-flash',
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.error).toMatch(/brand skill not authored/);
    });

    it('passes currentArtifact into the prompt for revisions', async () => {
        const { GoogleGenAI } = await import('@google/genai');
        const generateContent = vi.fn().mockResolvedValue({
            text: ':::nxt:freeform\n{"id":"f_1","kind":"org","brand":"nu","title":"T","citations":[]}\n---\n<html></html>\n:::',
        });
        (GoogleGenAI as any).mockImplementationOnce(() => ({ models: { generateContent } }));

        const existing = {
            id: 'f_1', type: 'freeform' as const, kind: 'org' as const, brand: 'nu' as const,
            title: 'old', html: '<html data-old></html>', citations: [],
            createdAt: 0, updatedAt: 0,
        };
        await generateFreeformArtifact({
            kind: 'org', brand: 'nu', userPrompt: 'rename Diane',
            corpus: '', currentArtifact: existing, model: 'gemini-2.5-flash',
        });
        const call = generateContent.mock.calls[0][0];
        const sentPrompt = call.contents[0].parts[0].text;
        expect(sentPrompt).toContain('CURRENT ARTIFACT');
        expect(sentPrompt).toContain('data-old');
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd humans-in-control-research && npm test -- design-desk/services/chatToFreeform.test.ts`
Expected: tests fail (module not found).

- [ ] **Step 3: Write chatToFreeform**

Create `humans-in-control-research/design-desk/services/chatToFreeform.ts`:

```ts
import type { FreeformArtifact, FreeformKind } from '../schemas/freeformArtifact';
import { validateFreeformArtifact } from '../schemas/freeformArtifact';
import type { BrandHashtag } from './hashtagParser';
import { loadExemplar } from './exemplarLoader';
import { parseFreeformOutput } from './freeformParser';
import { sanitizeFreeformHtml } from './freeformSanitizer';
import { analyzeText as analyzeTextAnthropic } from '../../services/anthropicService';
import { analyzeText as analyzeTextOpenAI } from '../../services/openaiService';
import { GoogleGenAI } from '@google/genai';

export type GenerationModel = 'gemini-2.5-flash' | 'claude-opus-4-7' | 'gpt-5.4';

export interface GenerateArgs {
    kind: FreeformKind;
    brand: BrandHashtag;
    userPrompt: string;
    corpus: string;
    currentArtifact: FreeformArtifact | null;
    model: GenerationModel;
}

export type GenerateResult =
    | { ok: true; artifact: FreeformArtifact; modelUsed: GenerationModel }
    | { ok: false; error: string; rawResponse?: string; modelUsed?: GenerationModel };

const SYSTEM_PROMPT =
    'You are an NXT Humans Designer. You produce visual artifacts as full 1920x1080 ' +
    'HTML documents that inherit visual treatment from a provided exemplar. You return ' +
    'EXACTLY one :::nxt:freeform block, no preamble, no markdown fences around the block.';

const MAX_TOKENS = 16000;
const TEMPERATURE = 0.4;

function resolveProviderModelId(chatModel: GenerationModel): string {
    switch (chatModel) {
        case 'claude-opus-4-7': return 'claude-opus-4-6';
        case 'gpt-5.4':         return 'gpt-5.4';
        case 'gemini-2.5-flash': return 'gemini-2.5-flash';
    }
}

async function callGemini(prompt: string, modelId: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: (process as any).env?.API_KEY ?? (process as any).env?.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: MAX_TOKENS,
            temperature: TEMPERATURE,
        },
    });
    return (response as any)?.text ?? '';
}

async function callForModel(prompt: string, model: GenerationModel): Promise<string> {
    const providerId = resolveProviderModelId(model);
    if (model === 'claude-opus-4-7') return analyzeTextAnthropic(SYSTEM_PROMPT, prompt, providerId, MAX_TOKENS, TEMPERATURE);
    if (model === 'gpt-5.4') return analyzeTextOpenAI(SYSTEM_PROMPT, prompt, providerId, MAX_TOKENS, TEMPERATURE);
    return callGemini(prompt, providerId);
}

function buildPrompt(args: GenerateArgs, bundle: { exemplarHtml: string; brandSkill: string; diagramSkill: string }): string {
    const sections: string[] = [];

    sections.push(`KIND: ${args.kind}`);
    sections.push(`BRAND: ${args.brand}`);

    sections.push(`\n=== BRAND STYLE SKILL ===\n${bundle.brandSkill}`);
    sections.push(`\n=== DIAGRAM ILLUSTRATOR SKILL ===\n${bundle.diagramSkill}`);

    sections.push(`\n=== EXEMPLAR HTML (you must produce HTML in this exact visual language ===\n` +
        `=== — preserve the frame structure, typography, atmospheric washes, brand    ===\n` +
        `=== tokens. Adapt the CONTENT to the user request + corpus; the visual       ===\n` +
        `=== treatment is non-negotiable. Scale dimensionality (number of swimlanes,  ===\n` +
        `=== nodes, phases, quotes) to match the data — clone the structural element  ===\n` +
        `=== from the exemplar as many times as needed.                               ===\n${bundle.exemplarHtml}`);

    if (args.corpus && args.corpus.length > 0) {
        sections.push(`\n=== RESEARCH CORPUS + UPLOADS (grounding evidence) ===\n${args.corpus.slice(0, 200000)}`);
    }

    if (args.currentArtifact) {
        sections.push(`\n=== CURRENT ARTIFACT (this is a REVISION — apply user's intent intelligently; preserve unchanged content; use corpus for grounded additions) ===\n` +
            `id: ${args.currentArtifact.id}\n` +
            `title: ${args.currentArtifact.title}\n` +
            `--- existing HTML body ---\n` +
            `${args.currentArtifact.html}`);
    }

    sections.push(`\n=== USER REQUEST ===\n${args.userPrompt}`);

    sections.push(`\n=== OUTPUT CONTRACT ===\n` +
        `Return EXACTLY one block of this form, with no preamble or trailing prose:\n\n` +
        `:::nxt:freeform\n` +
        `{ "id": "${args.currentArtifact?.id ?? `f_${Date.now()}`}",\n` +
        `  "kind": "${args.kind}",\n` +
        `  "brand": "${args.brand}",\n` +
        `  "title": "<action title — what this artifact represents>",\n` +
        `  "citations": [{"label": "<fact>", "source": "<named source>"}] }\n` +
        `---\n` +
        `<!DOCTYPE html>\n` +
        `<html lang="en">\n` +
        `... full HTML document, 1920x1080, inheriting exemplar's visual treatment ...\n` +
        `</html>\n` +
        `:::`);

    return sections.join('\n');
}

export async function generateFreeformArtifact(args: GenerateArgs): Promise<GenerateResult> {
    let bundle;
    try {
        bundle = loadExemplar(args.kind, args.brand);
    } catch (err: any) {
        return { ok: false, error: err?.message ?? String(err) };
    }

    const prompt = buildPrompt(args, bundle);

    let raw: string;
    try {
        raw = await callForModel(prompt, args.model);
    } catch (err: any) {
        return { ok: false, error: `${args.model} request failed: ${err?.message ?? String(err)}`, modelUsed: args.model };
    }

    const parsed = parseFreeformOutput(raw);
    if (!parsed.ok) {
        return { ok: false, error: parsed.error, rawResponse: raw, modelUsed: args.model };
    }

    const sanitizedHtml = sanitizeFreeformHtml(parsed.html);

    const candidate: FreeformArtifact = {
        id: parsed.header.id,
        type: 'freeform',
        kind: parsed.header.kind,
        brand: parsed.header.brand,
        title: parsed.header.title,
        html: sanitizedHtml,
        citations: parsed.header.citations,
        createdAt: args.currentArtifact?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
    };

    const validation = validateFreeformArtifact(candidate);
    if (!validation.ok) {
        return { ok: false, error: `validation: ${validation.error}`, rawResponse: raw, modelUsed: args.model };
    }

    return { ok: true, artifact: validation.value, modelUsed: args.model };
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `cd humans-in-control-research && npm test -- design-desk/services/chatToFreeform.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Stage**

```bash
git add humans-in-control-research/design-desk/services/chatToFreeform.ts \
        humans-in-control-research/design-desk/services/chatToFreeform.test.ts
```

---

## Task 8: Create FreeformViewer (iframe-based renderer)

**Files:**
- Create: `humans-in-control-research/design-desk/components/FreeformViewer.tsx`

> Component is hard to unit-test meaningfully without DOM measurements; manual browser verification at end of Task 16. Prioritize a clean implementation here.

- [ ] **Step 1: Write the component**

Create `humans-in-control-research/design-desk/components/FreeformViewer.tsx`:

```tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FreeformArtifact } from '../schemas/freeformArtifact';

interface Props {
    artifact: FreeformArtifact;
    /** Called when the iframe has loaded its srcDoc and fonts have settled.
     *  Used by the exporter to know the artifact is ready to capture. */
    onReady?: (iframe: HTMLIFrameElement) => void;
}

const ARTIFACT_W = 1920;
const ARTIFACT_H = 1080;

/**
 * Renders a freeform HTML artifact inside a sandboxed iframe at native
 * 1920x1080. The container observes its own size and computes a scale
 * factor so the 1920x1080 iframe fits, transform-origin top-left so the
 * iframe's top-left stays anchored.
 *
 * The iframe is `sandbox="allow-same-origin"` — no scripts, no nav, no forms.
 * `same-origin` is required so html-to-image (running in the host) can read
 * the iframe's DOM during export. The sanitizer is the primary safety
 * boundary; sandbox is defense-in-depth.
 */
export const FreeformViewer: React.FC<Props> = ({ artifact, onReady }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [scale, setScale] = useState(1);

    const recalcScale = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const cw = el.clientWidth;
        const ch = el.clientHeight;
        if (cw === 0 || ch === 0) return;
        const s = Math.min(cw / ARTIFACT_W, ch / ARTIFACT_H);
        setScale(Math.max(s, 0.1));
    }, []);

    useEffect(() => {
        recalcScale();
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => recalcScale());
        ro.observe(el);
        return () => ro.disconnect();
    }, [recalcScale]);

    const handleLoad = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe || !onReady) return;
        // Wait for fonts to settle so the rendered artifact (and any export
        // capture taken right after) uses the correct typography rather than
        // a fallback substitution.
        const doc = iframe.contentDocument;
        const fontsReady = doc?.fonts?.ready ?? Promise.resolve();
        fontsReady.then(() => onReady(iframe)).catch(() => onReady(iframe));
    }, [onReady]);

    return (
        <div
            ref={containerRef}
            data-freeform-viewer
            data-artifact-id={artifact.id}
            data-artifact-kind={artifact.kind}
            data-artifact-brand={artifact.brand}
            style={{
                width: '100%',
                height: '100%',
                background: '#FFFFFF',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <iframe
                ref={iframeRef}
                title={artifact.title}
                srcDoc={artifact.html}
                sandbox="allow-same-origin"
                onLoad={handleLoad}
                style={{
                    width: ARTIFACT_W,
                    height: ARTIFACT_H,
                    border: 0,
                    display: 'block',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }}
            />
        </div>
    );
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd humans-in-control-research && npx tsc --noEmit design-desk/components/FreeformViewer.tsx`
Expected: zero new errors.

- [ ] **Step 3: Stage**

```bash
git add humans-in-control-research/design-desk/components/FreeformViewer.tsx
```

---

## Task 9: Wire DesignDeskChat to route diagram kinds through chatToFreeform

**Files:**
- Modify: `humans-in-control-research/design-desk/DesignDeskChat.tsx`

- [ ] **Step 1: Read the existing send() handler**

Run: `cat humans-in-control-research/design-desk/DesignDeskChat.tsx | head -120`
Look for the `send` function that calls `generateArtifact`.

- [ ] **Step 2: Add freeform routing**

In `humans-in-control-research/design-desk/DesignDeskChat.tsx`:

Find the import:
```ts
import { generateArtifact, type GenerateResult, type GenerateError } from './services/chatToArtifact';
```

Replace with:
```ts
import { generateArtifact, type GenerateResult, type GenerateError } from './services/chatToArtifact';
import { generateFreeformArtifact } from './services/chatToFreeform';
import type { FreeformKind } from './schemas/freeformArtifact';

const FREEFORM_KINDS: Set<FreeformKind> = new Set(['org', 'journey', 'arch', 'roadmap', 'blueprint']);
```

Find the existing `send` function (around line 33). Inside the loop `for (const contentTag of parsed.content) {`, look for the line:
```ts
const res = await generateArtifact({
    content: contentTag, brand: parsed.brand, userPrompt: parsed.cleanPrompt,
    designMdRaw, corpusText: corpus, currentArtifact: null,
});
```

Replace the entire `for (const contentTag of parsed.content)` body with:
```ts
for (const contentTag of parsed.content) {
    if (FREEFORM_KINDS.has(contentTag as FreeformKind)) {
        const res = await generateFreeformArtifact({
            kind: contentTag as FreeformKind,
            brand: parsed.brand,
            userPrompt: parsed.cleanPrompt,
            corpus,
            currentArtifact: null,
            model: 'gemini-2.5-flash',     // TODO model selector wiring — same default as before
        });
        if (res.ok) {
            addArtifact(res.artifact);
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}_${contentTag}`, role: 'system', timestamp: Date.now(),
                content: `Created ${res.artifact.kind} (${res.artifact.brand.toUpperCase()}): ${res.artifact.title}`,
            }]);
        } else {
            if (res.rawResponse) console.warn(`[DesignDesk] freeform ${contentTag} failed:`, res.error, '\nRaw:', res.rawResponse);
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}_${contentTag}_err`, role: 'system', timestamp: Date.now(),
                content: `Generation failed for #${contentTag}: ${res.error}\n(See browser console for raw output.)`,
            }]);
        }
        continue;
    }
    if (contentTag !== 'persona') {
        setMessages(prev => [...prev, { id: `s_${Date.now()}_${contentTag}`, role: 'system', timestamp: Date.now(),
            content: `#${contentTag} is out of scope for this Designer pilot. Supported: #persona, #org, #journey, #arch, #roadmap, #blueprint.` }]);
        continue;
    }
    // Persona stays on the existing structured pipeline (chatToArtifact)
    const res = await generateArtifact({
        content: contentTag, brand: parsed.brand, userPrompt: parsed.cleanPrompt,
        designMdRaw, corpusText: corpus, currentArtifact: null,
    });
    handleResult(res, contentTag);
}
```

Also handle the **revision path** (when `parsed.content.length === 0` and there is an active artifact). Find the block:
```ts
if (parsed.content.length === 0) {
    if (!active) {
        setMessages(prev => [...prev, ...]);
        return;
    }
    setBusy(true);
    const corpus = buildPromptCorpus();
    const res = await generateArtifact({
        content: active.type, brand: active.brand, userPrompt: parsed.cleanPrompt,
        designMdRaw, corpusText: corpus, currentArtifact: active,
    });
    handleResult(res);
    setBusy(false);
    return;
}
```

Replace with:
```ts
if (parsed.content.length === 0) {
    if (!active) {
        setMessages(prev => [...prev, { id: `s_${Date.now()}`, role: 'system', timestamp: Date.now(),
            content: 'No active artifact. Start one with a content hashtag: #persona, #org, #journey, #arch, #roadmap, or #blueprint.' }]);
        return;
    }
    setBusy(true);
    const corpus = buildPromptCorpus();
    if (active.type === 'freeform') {
        const res = await generateFreeformArtifact({
            kind: active.kind, brand: active.brand, userPrompt: parsed.cleanPrompt,
            corpus, currentArtifact: active, model: 'gemini-2.5-flash',
        });
        if (res.ok) {
            replaceArtifact(res.artifact);
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}`, role: 'system', timestamp: Date.now(),
                content: `Updated ${res.artifact.kind}: ${res.artifact.title}`,
            }]);
        } else {
            if (res.rawResponse) console.warn(`[DesignDesk] freeform revision failed:`, res.error, '\nRaw:', res.rawResponse);
            setMessages(prev => [...prev, {
                id: `s_${Date.now()}_err`, role: 'system', timestamp: Date.now(),
                content: `Revision failed: ${res.error}\n(See browser console for raw output.)`,
            }]);
        }
    } else {
        // Persona revision path
        const res = await generateArtifact({
            content: active.type, brand: active.brand, userPrompt: parsed.cleanPrompt,
            designMdRaw, corpusText: corpus, currentArtifact: active as any,
        });
        handleResult(res);
    }
    setBusy(false);
    return;
}
```

- [ ] **Step 3: Type-check**

Run: `cd humans-in-control-research && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Stage**

```bash
git add humans-in-control-research/design-desk/DesignDeskChat.tsx
```

---

## Task 10: Render FreeformViewer in ArtifactViewer

**Files:**
- Modify: `humans-in-control-research/design-desk/ArtifactViewer.tsx`

- [ ] **Step 1: Read the existing render switch**

Run: `cat humans-in-control-research/design-desk/ArtifactViewer.tsx | head -200`
Look for the canvas-area block that switches on `active.type` and renders `NxtDocViewer` / `FossflowCanvas` / `OrgChartCanvas`.

- [ ] **Step 2: Add a FreeformViewer branch**

In `humans-in-control-research/design-desk/ArtifactViewer.tsx`:

Find the import block and add:
```tsx
import { FreeformViewer } from './components/FreeformViewer';
```

Find the canvas-area switch (around line 165):
```tsx
{active.type === 'persona' && <NxtDocViewer artifact={active} tokens={tokens} onFieldEdit={handleFieldEdit as any} />}
{active.type === 'journey' && <FossflowCanvas artifact={active} tokens={tokens} onLayoutChange={(layout) => replaceArtifact({ ...active, layout, updatedAt: Date.now() })} />}
{active.type === 'org' && <OrgChartCanvas artifact={active} tokens={tokens} onLayoutChange={(layout) => replaceArtifact({ ...active, layout, updatedAt: Date.now() })} />}
```

Replace with:
```tsx
{active.type === 'persona' && <NxtDocViewer artifact={active} tokens={tokens} onFieldEdit={handleFieldEdit as any} />}
{active.type === 'freeform' && <FreeformViewer artifact={active} />}
{/* Legacy types (org, journey) intentionally unrendered — filtered out of the store on hydrate. */}
```

> Update the TYPE_ICON map to add a 'freeform' entry as well — find:
```ts
const TYPE_ICON: Record<string, string> = {
    persona: '◔',
    journey: '◇',
    org: '◊',
};
```

Replace with:
```ts
const TYPE_ICON: Record<string, string> = {
    persona: '◔',
    freeform: '◈',
};
```

- [ ] **Step 3: Verify type-check**

Run: `cd humans-in-control-research && npx tsc --noEmit`
Expected: no new type errors. (Pre-existing legacy-type references in the file are tolerable for this task; they go away with Task 15.)

- [ ] **Step 4: Stage**

```bash
git add humans-in-control-research/design-desk/ArtifactViewer.tsx
```

---

## Task 11: Create freeformExporter — PNG + PDF (image-only)

**Files:**
- Create: `humans-in-control-research/design-desk/services/freeformExporter.ts`

- [ ] **Step 1: Write image-only export functions**

Create `humans-in-control-research/design-desk/services/freeformExporter.ts`:

```ts
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { FreeformArtifact } from '../schemas/freeformArtifact';

const ARTIFACT_W = 1920;
const ARTIFACT_H = 1080;
const PIXEL_RATIO = 2;
const PDF_W_IN = 13.333;
const PDF_H_IN = 7.5;

/**
 * Find the iframe rendering the given artifact in the live DOM. We rely on
 * the FreeformViewer setting `data-artifact-id` on its container.
 */
function findArtifactIframe(artifactId: string): HTMLIFrameElement | null {
    const container = document.querySelector(`[data-freeform-viewer][data-artifact-id="${artifactId}"]`);
    if (!container) return null;
    return container.querySelector('iframe') as HTMLIFrameElement | null;
}

/**
 * Wait for the iframe's document fonts to be ready so the captured render
 * uses the correct typography rather than a fallback substitution.
 */
async function waitForIframeReady(iframe: HTMLIFrameElement): Promise<void> {
    const doc = iframe.contentDocument;
    if (!doc) return;
    if (doc.readyState !== 'complete') {
        await new Promise(resolve => iframe.addEventListener('load', resolve, { once: true }));
    }
    try {
        await (doc.fonts?.ready ?? Promise.resolve());
    } catch { /* non-fatal */ }
    // One more frame so any post-font layout settles
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/**
 * Capture the iframe contents at native 1920x1080 with pixelRatio: 2.
 * Returns a data URL of the resulting PNG.
 */
async function captureArtifactPng(artifact: FreeformArtifact): Promise<string> {
    const iframe = findArtifactIframe(artifact.id);
    if (!iframe) throw new Error('freeformExporter: artifact iframe not found in DOM (is the artifact rendered?)');
    await waitForIframeReady(iframe);
    const target = iframe.contentDocument?.documentElement;
    if (!target) throw new Error('freeformExporter: iframe document not accessible');
    return toPng(target, {
        width: ARTIFACT_W,
        height: ARTIFACT_H,
        canvasWidth: ARTIFACT_W * PIXEL_RATIO,
        canvasHeight: ARTIFACT_H * PIXEL_RATIO,
        pixelRatio: PIXEL_RATIO,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
        skipFonts: true,    // iframe owns its own font loading; do not re-inline cross-origin sheets
    });
}

function downloadDataUrl(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
}

export async function exportFreeformPng(artifact: FreeformArtifact): Promise<void> {
    const dataUrl = await captureArtifactPng(artifact);
    downloadDataUrl(dataUrl, `${artifact.kind}-${artifact.id}.png`);
}

export async function exportFreeformPdf(artifact: FreeformArtifact): Promise<void> {
    const dataUrl = await captureArtifactPng(artifact);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [PDF_W_IN, PDF_H_IN] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, PDF_W_IN, PDF_H_IN);
    pdf.save(`${artifact.kind}-${artifact.id}.pdf`);
}

// PPTX added in Task 12.
```

- [ ] **Step 2: Wire export buttons in ExportMenu**

Modify `humans-in-control-research/design-desk/components/ExportMenu.tsx`:

Find the imports:
```ts
import { exportPdf, exportPng, exportPptx } from '../services/artifactExporter';
```

Replace with:
```ts
import { exportFreeformPng, exportFreeformPdf } from '../services/freeformExporter';
import { exportPdf as exportLegacyPdf, exportPng as exportLegacyPng, exportPptx as exportLegacyPptx } from '../services/artifactExporter';
// PPTX wired in Task 12; until then ExportMenu uses the legacy exporter for pptx clicks
```

Find the run() function and replace its body:
```ts
const run = async (fmt: 'pdf' | 'png' | 'pptx') => {
    setBusy(fmt);
    try {
        if (artifact.type === 'freeform') {
            if (fmt === 'pdf') await exportFreeformPdf(artifact);
            else if (fmt === 'png') await exportFreeformPng(artifact);
            else throw new Error('PPTX export for freeform pending Task 12');
        } else {
            if (fmt === 'pdf') await exportLegacyPdf(artifact, tokens);
            else if (fmt === 'png') await exportLegacyPng(artifact, tokens);
            else await exportLegacyPptx(artifact, tokens);
        }
    } catch (e) {
        console.error(`[ExportMenu] ${fmt} export failed`, e);
        alert(`Export failed: ${(e as Error).message}`);
    } finally {
        setBusy(null);
    }
};
```

- [ ] **Step 3: Type-check**

Run: `cd humans-in-control-research && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Stage**

```bash
git add humans-in-control-research/design-desk/services/freeformExporter.ts \
        humans-in-control-research/design-desk/components/ExportMenu.tsx
```

---

## Task 12: Add PPTX export with vector-text overlay

**Files:**
- Modify: `humans-in-control-research/design-desk/services/freeformExporter.ts`
- Modify: `humans-in-control-research/design-desk/components/ExportMenu.tsx`

- [ ] **Step 1: Add walkTextNodes + exportFreeformPptx to freeformExporter**

In `humans-in-control-research/design-desk/services/freeformExporter.ts`, append:

```ts
// ============================================================
// PPTX with vector-text overlay
// ============================================================

interface TextRun {
    text: string;
    /** Pixel-space bounding rect, relative to the iframe's 1920x1080 viewport. */
    rect: { x: number; y: number; w: number; h: number };
    fontFamily: string;
    fontSize: number;     // px
    fontWeight: number;
    color: string;        // rgb(...) or #...
    textAlign: 'left' | 'center' | 'right';
}

const MIN_TEXT_W = 24;    // px — smaller bounding boxes are decorative; image-only suffices
const MIN_TEXT_H = 8;     // px

function rgbStringToHex(rgb: string): string {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '000000';
    const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
    return [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function pxToPt(px: number): number {
    return Math.round(px * 0.75 * 100) / 100;   // 1 px ≈ 0.75 pt at 96 dpi
}

function walkTextNodes(doc: Document): TextRun[] {
    const out: TextRun[] = [];
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        const text = (node.nodeValue ?? '').trim();
        if (text.length === 0) continue;
        const parent = node.parentElement;
        if (!parent) continue;
        // Skip nodes inside <style>, <script>, or anything we wouldn't render
        if (['STYLE', 'SCRIPT', 'NOSCRIPT'].includes(parent.tagName)) continue;
        const range = doc.createRange();
        range.selectNode(node);
        const rect = range.getBoundingClientRect();
        if (rect.width < MIN_TEXT_W || rect.height < MIN_TEXT_H) continue;
        const cs = doc.defaultView?.getComputedStyle(parent);
        if (!cs) continue;
        // Skip invisible text
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity || '1') < 0.05) continue;
        const fontSize = parseFloat(cs.fontSize) || 16;
        const fontWeight = parseInt(cs.fontWeight, 10) || 400;
        out.push({
            text,
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            fontFamily: (cs.fontFamily || 'Archivo').split(',')[0].replace(/['"]/g, '').trim(),
            fontSize,
            fontWeight: isNaN(fontWeight) ? 400 : fontWeight,
            color: cs.color || 'rgb(0,0,0)',
            textAlign: (cs.textAlign === 'right' || cs.textAlign === 'center' || cs.textAlign === 'left')
                ? cs.textAlign as TextRun['textAlign']
                : 'left',
        });
    }
    return out;
}

export async function exportFreeformPptx(artifact: FreeformArtifact): Promise<void> {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const iframe = findArtifactIframe(artifact.id);
    if (!iframe) throw new Error('freeformExporter: artifact iframe not found in DOM');
    await waitForIframeReady(iframe);
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('freeformExporter: iframe document not accessible');

    // 1. Capture the visual layer
    const dataUrl = await captureArtifactPng(artifact);

    // 2. Walk DOM for vector text overlay
    const runs = walkTextNodes(doc);

    // 3. Emit PPTX
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'NXT_16x9', width: PDF_W_IN, height: PDF_H_IN });
    pptx.layout = 'NXT_16x9';
    const slide = pptx.addSlide();

    // Background image at exact slide bounds
    slide.addImage({ data: dataUrl, x: 0, y: 0, w: PDF_W_IN, h: PDF_H_IN });

    // Vector text frames overlaid in pixel-accurate positions
    for (const r of runs) {
        slide.addText(r.text, {
            x: (r.rect.x / ARTIFACT_W) * PDF_W_IN,
            y: (r.rect.y / ARTIFACT_H) * PDF_H_IN,
            w: (r.rect.w / ARTIFACT_W) * PDF_W_IN,
            h: (r.rect.h / ARTIFACT_H) * PDF_H_IN,
            fontFace: r.fontFamily,
            fontSize: pxToPt(r.fontSize),
            color: rgbStringToHex(r.color),
            bold: r.fontWeight >= 700,
            align: r.textAlign,
            valign: 'top',
            margin: 0,
            // transparent = true -> no fill behind; image shows through where text is
            fill: { type: 'none' as any },
        });
    }

    await pptx.writeFile({ fileName: `${artifact.kind}-${artifact.id}.pptx` });
}
```

- [ ] **Step 2: Update ExportMenu to call exportFreeformPptx**

In `humans-in-control-research/design-desk/components/ExportMenu.tsx`, find:
```ts
if (fmt === 'pdf') await exportFreeformPdf(artifact);
else if (fmt === 'png') await exportFreeformPng(artifact);
else throw new Error('PPTX export for freeform pending Task 12');
```

Replace with:
```ts
if (fmt === 'pdf') await exportFreeformPdf(artifact);
else if (fmt === 'png') await exportFreeformPng(artifact);
else await exportFreeformPptx(artifact);
```

Add the import at the top:
```ts
import { exportFreeformPng, exportFreeformPdf, exportFreeformPptx } from '../services/freeformExporter';
```

- [ ] **Step 3: Type-check**

Run: `cd humans-in-control-research && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Stage**

```bash
git add humans-in-control-research/design-desk/services/freeformExporter.ts \
        humans-in-control-research/design-desk/components/ExportMenu.tsx
```

---

## Task 13: Migration — drop legacy artifacts on store hydrate

**Files:**
- Modify: `humans-in-control-research/design-desk/store/designDeskStore.ts`

- [ ] **Step 1: Read the existing hydrate/persist logic**

Run: `grep -n "persist\|hydrate\|setState\|localStorage" humans-in-control-research/design-desk/store/designDeskStore.ts | head -20`

- [ ] **Step 2: Filter legacy types on hydration**

In `humans-in-control-research/design-desk/store/designDeskStore.ts`, find the storage event listener (and any initial-state hydration from localStorage):

Look for:
```ts
const parsed = JSON.parse(e.newValue);
useDesignDeskStore.setState({
    artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
    activeArtifactId: typeof parsed.activeArtifactId === 'string' ? parsed.activeArtifactId : null,
});
```

Replace with:
```ts
const parsed = JSON.parse(e.newValue);
const filtered = Array.isArray(parsed.artifacts)
    ? parsed.artifacts.filter((a: any) => a && a.type !== 'org' && a.type !== 'journey')
    : [];
useDesignDeskStore.setState({
    artifacts: filtered,
    activeArtifactId: filtered.some((a: any) => a.id === parsed.activeArtifactId) ? parsed.activeArtifactId : null,
});
```

Also do the same filter at the **initial hydrate** site (when the store reads `localStorage.getItem(STORAGE_KEY)` on module load). If the store uses Zustand's `persist` middleware with a `merge` function, add the same filter there. If it uses a manual rehydration call, filter at the same point.

- [ ] **Step 3: Type-check**

Run: `cd humans-in-control-research && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Stage**

```bash
git add humans-in-control-research/design-desk/store/designDeskStore.ts
```

---

## Task 14: Compose Deck panel for #slides / #deck multi-slide export

**Files:**
- Create: `humans-in-control-research/design-desk/components/ComposeDeckPanel.tsx`
- Modify: `humans-in-control-research/design-desk/services/freeformExporter.ts` (add multi-slide export)
- Modify: `humans-in-control-research/design-desk/ArtifactViewer.tsx` (mount the panel)
- Modify: `humans-in-control-research/design-desk/DesignDeskChat.tsx` (open panel on `#deck` / `#slides`)

- [ ] **Step 1: Add multi-slide PPTX export to freeformExporter**

In `humans-in-control-research/design-desk/services/freeformExporter.ts`, append:

```ts
/**
 * Export a deck of multiple freeform artifacts as a single PPTX file.
 * Each artifact = one slide, in the given order. Each slide gets the same
 * vector-text-overlay treatment as exportFreeformPptx.
 */
export async function exportFreeformDeckPptx(
    artifacts: FreeformArtifact[],
    fileName: string = 'design-desk-deck.pptx',
): Promise<void> {
    if (artifacts.length === 0) throw new Error('exportFreeformDeckPptx: no artifacts to export');
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'NXT_16x9', width: PDF_W_IN, height: PDF_H_IN });
    pptx.layout = 'NXT_16x9';

    for (const artifact of artifacts) {
        const iframe = findArtifactIframe(artifact.id);
        if (!iframe) throw new Error(`exportFreeformDeckPptx: iframe not found for artifact ${artifact.id}`);
        await waitForIframeReady(iframe);
        const doc = iframe.contentDocument;
        if (!doc) throw new Error(`exportFreeformDeckPptx: iframe doc not accessible for ${artifact.id}`);
        const dataUrl = await captureArtifactPng(artifact);
        const runs = walkTextNodes(doc);
        const slide = pptx.addSlide();
        slide.addImage({ data: dataUrl, x: 0, y: 0, w: PDF_W_IN, h: PDF_H_IN });
        for (const r of runs) {
            slide.addText(r.text, {
                x: (r.rect.x / ARTIFACT_W) * PDF_W_IN,
                y: (r.rect.y / ARTIFACT_H) * PDF_H_IN,
                w: (r.rect.w / ARTIFACT_W) * PDF_W_IN,
                h: (r.rect.h / ARTIFACT_H) * PDF_H_IN,
                fontFace: r.fontFamily,
                fontSize: pxToPt(r.fontSize),
                color: rgbStringToHex(r.color),
                bold: r.fontWeight >= 700,
                align: r.textAlign,
                valign: 'top',
                margin: 0,
                fill: { type: 'none' as any },
            });
        }
    }
    await pptx.writeFile({ fileName });
}

/**
 * Multi-slide PDF — each artifact is one landscape page.
 */
export async function exportFreeformDeckPdf(
    artifacts: FreeformArtifact[],
    fileName: string = 'design-desk-deck.pdf',
): Promise<void> {
    if (artifacts.length === 0) throw new Error('exportFreeformDeckPdf: no artifacts to export');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [PDF_W_IN, PDF_H_IN] });
    let first = true;
    for (const artifact of artifacts) {
        const dataUrl = await captureArtifactPng(artifact);
        if (!first) pdf.addPage([PDF_W_IN, PDF_H_IN], 'landscape');
        pdf.addImage(dataUrl, 'PNG', 0, 0, PDF_W_IN, PDF_H_IN);
        first = false;
    }
    pdf.save(fileName);
}
```

- [ ] **Step 2: Create the ComposeDeckPanel component**

Create `humans-in-control-research/design-desk/components/ComposeDeckPanel.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { useDesignDeskStore } from '../store/designDeskStore';
import { exportFreeformDeckPptx, exportFreeformDeckPdf } from '../services/freeformExporter';

interface Props {
    open: boolean;
    onClose: () => void;
}

export const ComposeDeckPanel: React.FC<Props> = ({ open, onClose }) => {
    const { artifacts } = useDesignDeskStore();
    const freeformOnly = artifacts.filter(a => a.type === 'freeform');
    const [order, setOrder] = useState<string[]>(() => freeformOnly.map(a => a.id));
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        // When the artifact list changes, append new ids and drop missing ones,
        // preserving the user's existing ordering for the rest.
        setOrder(prev => {
            const present = new Set(freeformOnly.map(a => a.id));
            const kept = prev.filter(id => present.has(id));
            const added = freeformOnly.map(a => a.id).filter(id => !kept.includes(id));
            return [...kept, ...added];
        });
    }, [freeformOnly.length]);

    if (!open) return null;

    const move = (idx: number, dir: -1 | 1) => {
        setOrder(prev => {
            const next = [...prev];
            const j = idx + dir;
            if (j < 0 || j >= next.length) return prev;
            [next[idx], next[j]] = [next[j], next[idx]];
            return next;
        });
    };

    const ordered = order.map(id => freeformOnly.find(a => a.id === id)).filter(Boolean) as typeof freeformOnly;

    const exportDeck = async (fmt: 'pptx' | 'pdf') => {
        setBusy(true);
        try {
            if (fmt === 'pptx') await exportFreeformDeckPptx(ordered);
            else await exportFreeformDeckPdf(ordered);
        } catch (e) {
            console.error('[ComposeDeck] export failed', e);
            alert(`Export failed: ${(e as Error).message}`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 56, right: 12,
            width: 420, maxHeight: 600, overflow: 'auto',
            background: '#FFFFFF', border: '1px solid #0D0D0D',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 100, padding: 16,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.04em' }}>COMPOSE DECK</div>
                <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
                Reorder using the arrows. Each artifact becomes one slide in tab order.
            </div>
            {ordered.length === 0 ? (
                <div style={{ fontSize: 12, color: '#888', padding: 16, textAlign: 'center' }}>
                    No freeform artifacts in this session yet.
                </div>
            ) : ordered.map((a, idx) => (
                <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 4px', borderBottom: '1px solid #EEE',
                }}>
                    <span style={{ width: 20, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#999' }}>{idx + 1}.</span>
                    <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 9, marginRight: 6 }}>{a.kind}</span>
                        {a.title}
                    </span>
                    <button disabled={idx === 0} onClick={() => move(idx, -1)} style={{ border: '1px solid #DDD', background: '#FFF', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: '2px 6px', fontSize: 10 }}>↑</button>
                    <button disabled={idx === ordered.length - 1} onClick={() => move(idx, 1)} style={{ border: '1px solid #DDD', background: '#FFF', cursor: idx === ordered.length - 1 ? 'not-allowed' : 'pointer', padding: '2px 6px', fontSize: 10 }}>↓</button>
                </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => exportDeck('pptx')} disabled={busy || ordered.length === 0}
                    style={{ flex: 1, padding: '6px 12px', background: '#0D0D0D', color: '#FFF', border: 'none', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', cursor: ordered.length === 0 ? 'not-allowed' : 'pointer', opacity: ordered.length === 0 ? 0.4 : 1 }}>
                    {busy ? '…' : 'Export PPTX'}
                </button>
                <button onClick={() => exportDeck('pdf')} disabled={busy || ordered.length === 0}
                    style={{ flex: 1, padding: '6px 12px', background: '#FFF', color: '#0D0D0D', border: '1px solid #0D0D0D', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', cursor: ordered.length === 0 ? 'not-allowed' : 'pointer', opacity: ordered.length === 0 ? 0.4 : 1 }}>
                    {busy ? '…' : 'Export PDF'}
                </button>
            </div>
        </div>
    );
};
```

- [ ] **Step 3: Mount the panel from ArtifactViewer + open it via DesignDeskChat**

In `humans-in-control-research/design-desk/ArtifactViewer.tsx`, add a state for the panel and render it.

Add at top of component:
```tsx
import { ComposeDeckPanel } from './components/ComposeDeckPanel';
const [composeOpen, setComposeOpen] = useState(false);
```

> **Note:** the panel needs to be opened from `DesignDeskChat` when the user types `#deck` or `#slides`. Do this via a simple custom event (the cleanest cross-component channel without bringing in additional state plumbing):

In `DesignDeskChat.tsx`, in the `send` function, AFTER `parsed = parseHashtags(text)`, add:
```ts
if (parsed.composition === 'slides') {
    window.dispatchEvent(new CustomEvent('design-desk:open-compose-deck'));
}
```

In `ArtifactViewer.tsx`, listen for it:
```tsx
useEffect(() => {
    const handler = () => setComposeOpen(true);
    window.addEventListener('design-desk:open-compose-deck', handler);
    return () => window.removeEventListener('design-desk:open-compose-deck', handler);
}, []);
```

Render the panel at the bottom of the ArtifactViewer's JSX (sibling to the canvas area):
```tsx
<ComposeDeckPanel open={composeOpen} onClose={() => setComposeOpen(false)} />
```

- [ ] **Step 4: Type-check**

Run: `cd humans-in-control-research && npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 5: Stage**

```bash
git add humans-in-control-research/design-desk/components/ComposeDeckPanel.tsx \
        humans-in-control-research/design-desk/services/freeformExporter.ts \
        humans-in-control-research/design-desk/ArtifactViewer.tsx \
        humans-in-control-research/design-desk/DesignDeskChat.tsx
```

---

## Task 15: Cleanup — delete legacy code + remove npm deps

**Files:** see "Deleted files" table at the top of this plan.

> Do NOT execute this task until Task 16 has confirmed the freeform pipeline works end-to-end in a Docker rebuild + browser test. If anything in Task 16 fails, fix it on the freeform side; do NOT roll back to the legacy renderer mid-flight.

- [ ] **Step 1: Confirm the freeform pipeline is green** (Task 16 PASS — see Task 16 verification checklist)

- [ ] **Step 2: Delete legacy files**

```bash
rm humans-in-control-research/design-desk/components/OrgChartCanvas.tsx
rm humans-in-control-research/design-desk/components/OrgChartNode.tsx
rm humans-in-control-research/design-desk/components/FossflowCanvas.tsx
rm humans-in-control-research/design-desk/schemas/orgChartArtifact.ts
rm humans-in-control-research/design-desk/schemas/orgChartArtifact.test.ts
rm humans-in-control-research/design-desk/schemas/journeyArtifact.ts
rm humans-in-control-research/design-desk/schemas/journeyArtifact.test.ts
rm humans-in-control-research/design-desk/prompts/orgChartPrompt.ts
rm humans-in-control-research/design-desk/prompts/journeyPrompt.ts
rm humans-in-control-research/design-desk/services/chatToArtifact.ts
rm humans-in-control-research/design-desk/services/chatToArtifact.test.ts
rm humans-in-control-research/design-desk/services/artifactExporter.ts
rm humans-in-control-research/design-desk/__fixtures__/orgChart.valid.json
rm humans-in-control-research/design-desk/__fixtures__/journey.valid.json
```

- [ ] **Step 3: Update types.ts to drop legacy from the union**

In `humans-in-control-research/design-desk/types.ts`:

Replace the `Artifact` union with:
```ts
import type { PersonaArtifact } from './schemas/personaArtifact';
import type { FreeformArtifact } from './schemas/freeformArtifact';

export type Artifact = PersonaArtifact | FreeformArtifact;
```

Remove the now-broken imports from `JourneyArtifact` and `OrgChartArtifact`.

- [ ] **Step 4: Update ArtifactViewer.tsx to drop the legacy comment + imports**

In `humans-in-control-research/design-desk/ArtifactViewer.tsx`:
- Remove the line `{/* Legacy types (org, journey) intentionally unrendered ... */}`
- Remove any leftover imports of `OrgChartCanvas`, `FossflowCanvas`

In `ExportMenu.tsx`:
- Remove the `import { exportPdf as exportLegacyPdf, ... } from '../services/artifactExporter'` line
- Simplify the run() function to call freeform exporters directly (drop the `artifact.type === 'freeform'` branch — there is no longer any other branch)

- [ ] **Step 5: Remove npm deps**

```bash
cd humans-in-control-research && npm uninstall fossflow reactflow @dagrejs/dagre
```

- [ ] **Step 6: Type-check the whole project**

Run: `cd humans-in-control-research && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 7: Run all unit tests**

Run: `cd humans-in-control-research && npm test`
Expected: all tests PASS. The deleted-schema tests are gone, so they can't fail.

- [ ] **Step 8: Stage**

```bash
git add -u humans-in-control-research/
git status
```
Expected: many deletions + modified types.ts/ArtifactViewer.tsx/ExportMenu.tsx + package.json + package-lock.json. Verify nothing unrelated got staged.

---

## Task 16: End-to-end verification (Docker rebuild + browser test)

**This is the hand-off gate. Do not declare the project complete until every checkbox here is green.**

- [ ] **Step 1: Docker rebuild**

Run: `docker compose -f docker-compose-all.yml up -d --build research-generator`
Expected: build succeeds, container `hic-research` starts.

- [ ] **Step 2: Verify the new bundle is live**

Run: `curl -s http://localhost:5011/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1`
Expected: a fresh bundle hash (different from prior).

- [ ] **Step 3: Confirm bundle has key markers**

Run:
```bash
BUNDLE=$(curl -s http://localhost:5011/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s "http://localhost:5011/assets/$BUNDLE" -o /tmp/bundle.js
wc -c /tmp/bundle.js
echo "--- markers ---"
grep -c "freeform" /tmp/bundle.js
grep -c ":::nxt:freeform" /tmp/bundle.js
grep -c "data-freeform-viewer" /tmp/bundle.js
grep -c "exportFreeformPng\|exportFreeformPdf\|exportFreeformPptx" /tmp/bundle.js
```
Expected: bundle is ≥7MB; "freeform" appears ≥30 times; the literal `:::nxt:freeform` block marker appears ≥1 time; `data-freeform-viewer` appears ≥1 time; export function names appear ≥3 times.

- [ ] **Step 4: Open localhost:5011 in browser, hard-refresh (Ctrl+Shift+R)**

Manual: navigate to `http://localhost:5011`. Open the Design Desk in popup mode (`?designer=1`) or in-tab.

- [ ] **Step 5: Verify the legacy artifacts are gone from the store on first load**

Manual: open the Designer. Tab strip should show no `org`/`journey` legacy entries (per Task 13 hydrate filter).

- [ ] **Step 6: Generate a freeform org chart**

Manual: type `#org #NU advancement division` in the Designer chat. **Expected outcome:**
- Status bar shows the generation in progress (~10-30s on Gemini 2.5 Flash with full corpus)
- On completion: chat reply says `Created org (NU): <title>`
- Canvas area renders an iframe at the artifact's native 1920×1080 (scaled to fit)
- Visual treatment matches `styles/05-org-chart-NU.html` — same frame, top band, atmospheric washes, typography
- Content reflects the user's prompt + corpus

If generation fails because skill markdown is still stub: the error message should say `exemplarLoader: brand skill not authored ...` — author the skill content (Task 4 stubs become real exemplars), Docker rebuild, retry.

- [ ] **Step 7: Generate revisions**

Manual:
- Type "make it radial" — expect `Updated org: <title>` and the chart visually re-flows
- Type "rename Lori to Loretta" — expect surgical edit (one name changes, visual treatment intact)

- [ ] **Step 8: Generate the other four kinds**

Manual: in turn, generate `#journey #NU ...`, `#arch #NXT ...`, `#roadmap #NU ...`, `#blueprint #NXT ...`. Verify each renders with its matching exemplar's visual treatment, content adapted to the corpus.

- [ ] **Step 9: Test PNG export**

Manual: with an artifact active, click "Export PNG". Expected: a file `<kind>-<id>.png` downloads, opens to a sharp 3840×2160 image (2x pixel ratio of 1920×1080), visually identical to the in-app render.

- [ ] **Step 10: Test PDF export**

Manual: click "Export PDF". Expected: a 13.333"×7.5" landscape PDF downloads, single page, image fills the page.

- [ ] **Step 11: Test PPTX export**

Manual: click "Export PPTX". Expected: a `.pptx` downloads. Open in PowerPoint:
- Slide is 16:9 native
- Background image is sharp
- Click on a text element — it is selectable as text, editable, font/size/color preserved
- Use Find (Ctrl+F) — finds text from the artifact

- [ ] **Step 12: Test deck composition**

Manual:
- Generate 3 freeform artifacts of varying kinds in the same session
- Type `#deck` (or `#slides`) — Compose Deck panel slides in
- Reorder via arrow buttons
- Click "Export PPTX" — multi-slide deck downloads
- Open in PowerPoint: 3 slides in chosen order, each with vector text overlay

- [ ] **Step 13: Smoke-test legacy persona path**

Manual: type `#persona #NU first-gen junior dev` — verify persona generation still works (existing structured pipeline, NxtDocViewer renders).

- [ ] **Step 14: Final stage**

```bash
git status
```
Expected: a long list of staged + modified files across all tasks. Nothing committed. User is the final commit gate per the standing constraint.

- [ ] **Step 15: Hand off to user with a summary**

Tell the user:
- The bundle hash that's live
- The five freeform kinds verified
- Export formats verified
- Any deviations or known issues
- That nothing has been committed (they decide)

---

## Self-Review

**Spec coverage:**
- Hashtag vocabulary frozen → Task 2 (deck alias added; rest already in parser)
- FreeformArtifact data shape → Task 1
- Two skill axes (brand × diagram) → Task 4 (loader + 7 stubs)
- Exemplar mapping table → Task 4 (EXEMPLARS map in code)
- Output protocol (`:::nxt:freeform` JSON header + `---` + HTML) → Task 5 (parser) + Task 7 (prompt builder)
- Sanitization (DOMPurify allowlist) → Task 6
- Render (iframe, sandbox, scale-to-fit, fonts.ready) → Task 8
- High-quality export PNG/PDF (1920×1080 @ 2x) → Task 11
- PPTX vector overlay → Task 12
- Slide composition `#slides`/`#deck` → Task 14
- Migration (drop legacy on hydrate) → Task 13
- File map + cleanup → Task 15
- Risks called out: token bloat (no specific task — handled by 1M-context models), model fidelity (no specific task — could add a re-prompt guard later), iframe edge cases (handled in Task 8 by visible scaled mount), PPTX overlay drift (handled in Task 12 with MIN_TEXT_W/H heuristics)

**Placeholder scan:** no TBD/TODO/placeholders. All steps have actual code. The only "author later" content is the SKILL.md stubs — explicitly flagged as user-authored, with the loader's fail-fast guard surfacing actionable errors.

**Type consistency:**
- `FreeformKind` defined in Task 1, used identically in Tasks 4, 5, 7, 9, 13
- `BrandHashtag` is the existing type from `hashtagParser.ts`; used identically throughout
- `loadExemplar(kind, brand)` signature identical across Tasks 4 (definition) and 7 (use)
- `generateFreeformArtifact(args)` argument shape identical across Tasks 7 (definition) and 9 (use)
- `findArtifactIframe(id)`, `captureArtifactPng(artifact)`, `walkTextNodes(doc)` defined in Task 11/12, used identically in Task 14

**Scope:** one feature, one plan. Implementer executes one task at a time. Tasks have explicit dependencies (Task 11 needs Task 8; Task 12 needs Task 11; Task 14 needs Tasks 11+12; Task 15 needs Task 16 verification).

---

## Execution

**Plan complete and saved to `docs/superpowers/plans/2026-04-26-freeform-html-artifacts.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — I execute tasks in this session via `executing-plans`, batched with checkpoints.

**Which approach?**
