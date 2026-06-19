# Track B — Figma Brick Contract Synthesis + Runtime Assembly Plan (2026-06-16)

Closes B0 (EVERY-page Figma harvest + manifest correlation) and defines B1–B3.
Per-deliverable detail in the sibling `*.md` files; the consolidated registry is the new
"COMPONENT REGISTRY (2026-06-16, LIVE)" section of `wiki/brand/figma-node-map.md`.

## B0 — what the EVERY-page sweep proved

Six parallel harvest agents read every deliverable page in `iSQhAVM7SI4QHAWB7y9C2z`
(NXT mode 221:0 + NU mode 535:0). Unanimous findings:

1. **Every deliverable is a componentized, fully token-bound symbol** with an NU mode-535:0
   instance twin. Brand is a pure token swap (navy rail / red-N monogram / NU-teal / white-on-red
   takeaway / Lato); geometry is byte-identical across brands. `--color/on-accent` is the
   load-bearing accessibility token (black on NXT chartreuse, white on NU red).
2. **Shared GOLD brick** across all: 92px rail (SLIDES system = 128px) · 3x3 accent dot-mark ·
   `Brand/Logo · masthead` 619:2 · cyan IBM-Plex-Mono kicker · Archivo-SemiBold action title ·
   body region · accent/ink takeaway band at y=944.
3. **The manifest TABLE was systematically stale** — it listed pre-componentization raw-frame IDs
   (212:2 / 217:2 / 290:2 / 178:3 / 322:124 / ...). The 2026-06-15 componentization minted new
   component IDs (585–614) + NU instances (625–626) and never updated the table. The manifest
   PROSE block and `figma-tokens.json` ARE accurate. FIXED: registry table added 2026-06-16.
4. **figma-tokens.json is current** (refreshed 2026-06-15); the 12 MCP-readable NXT core colors
   match exactly. The fuller variable set isn't MCP-enumerable (PAT lacks `file_variables:read`),
   but is verified indirectly via the live `var(--*)` bindings on every component.

### 5 token-fidelity defects to remediate (do NOT block B1 on these)
- executive-brief 366:2 — raw frame, literal-text masthead 367:2 (won't NU-flip)
- tech-architecture 606:2 — raster SVG connectors (collision ban) + literal borders
- roadmap base 599:2 — literal borders
- case-study 588:4 — cyan left-borders raw `#00b7c3`
- gap 598:2 — target markers raw `#00b7c3`

## The runtime contract Track B must honor (NOT "instance Figma live")

The manifest's RUNTIME VARIANT CONTRACT is explicit and user-final: **the SPA does NOT instance
Figma at runtime.** Variants are produced by the CODE renderers (`services/slideToStageHtml.ts`
export + `components/slideTemplates/web.tsx` preview + `pptx.ts` export), grounded by the tokens
the proxy injects from `figma-tokens.json` (`/api/design-tokens?brand=NU`). The published Figma
library is the DESIGN CANON; Claude Code mirrors it into `figma-tokens.json` + the renderer twins;
`figma-tokens.json` is the runtime carrier. Never recompute values at runtime — read the mode.

So Track B is NOT "build a Figma-instancing engine" (explicitly rejected). It is:

> **Prove every code renderer is a faithful, NO-HARDCODE, token-driven mirror of its registered
> Figma component, for BOTH modes, and make the registry the machine-checkable contract that keeps
> them from drifting.**

This is the same shape as `#proto` (the reference lego-brick impl): brief -> read the component
manifest + tokens -> assemble from registered bricks, never invented shapes.

## B1 — registry-as-contract parity guard — DONE (2026-06-16, no rebuild)

LANDED: `plans/figma-audit/registry.json` (+ `_templateMap`: firstClass / variants / alsoEmits)
and `services/figmaRegistryParity.test.ts` (5 tests, all green; full suite 134/134, tsc 0).
The guard asserts every first-class deliverable template (a) is in the types.ts SlideTemplate
union, (b) has a dispatch case in slideToStageHtml.ts, (c) has a TEMPLATE_PAYLOAD entry; every
variant routes through a known base. The no-hardcode hex scan runs SHADOW (reports 50 in
slideToStageHtml.ts / 16 in web.tsx; most are the legit BrandTokens hydration block) — the
residue is the B3 cleanup target. Verified `roadmap->timeline`, `strategy->recommendation+
principles` against types.ts. Original plan (for reference):

1. Emit a machine-readable companion to the registry: `plans/figma-audit/registry.json`
   `{ deliverable -> { nxtComponent, nuInstance, page, codeTwins[], defects[] } }`.
2. Extend `slideContractParity.test.ts` (already green 2/2) into a **registry parity** test: for
   every deliverable in `registry.json`, assert (a) a `template:` discriminant exists in types.ts,
   (b) a render branch exists in slideToStageHtml.ts AND web.tsx, (c) a pptx.ts export exists.
   This catches the "generator added a field, renderer didn't" drift class at CI, not at runtime.
3. **No-hardcode scan**: grep the three renderer twins for literal hex (`#[0-9a-f]{6}`) outside the
   BrandTokens/figma-tokens hydration block; every match is a candidate drift from the token canon.
   Wire as a non-blocking shadow check first (mirrors the validate_writing_quality.py shadow model).

## METHOD A — full dynamic lego-bricking (owner-final 2026-06-16)

The owner chose **Method A, not B.** Track B is NOT "verify the fixed renderers mirror the canon."
It is: **the model composes each deliverable from registered Figma bricks + tokens at generation
time**, the way `prototypeBuilder.ts` builds `#proto` from `proto-component-manifest.md`. The
per-deliverable hardcoded `renderX` functions are the legacy machinery to be RETIRED, not blessed.
See `.claude/UNIFIED_VISION.md` "Lego-brick doctrine". Non-negotiables: never hardcode (tokens
only); never invent UI shapes (compose from registered bricks only); the SPA never calls Figma's
API live (it reads the markdown manifest + `figma-tokens.json`); brand = mode flip, density = mode.

This is a multi-step architectural build. Scope honestly: it touches generation (emit a composition,
not a fixed payload), a new generic renderer, and the migration of ~21 deliverables off `renderX`.
Done incrementally behind a flag, proving parity at each step.

### B2 — build the composition engine + pilot org-chart (Method A)

1. **Brick-contract schema** — extend `registry.json` (or a sibling `brick-contracts.json`) so each
   deliverable carries its component ANATOMY as data the composer reads: ordered named regions, each
   region's auto-layout (direction / sizing / gap), per-region token bindings (`color/*`, `font/*`,
   `space/*`), and repeat-rules (e.g. org "tier" region repeats per tier). The anatomy already
   exists in prose in `plans/figma-audit/*.md` + the harvest; this step makes it machine-readable.
2. **`brickComposer.ts`** — ONE generic renderer: `(contract, contentPayload, mode, density) ->`
   HTML stage (1920) + preview (540) + PPTX node list. It walks the contract's region tree, binds
   every value from the token mode, and lays out via the region auto-layout rules. No per-deliverable
   layout code. Mirrors how `#proto` materializes a UI from the component manifest.
3. **Generation emits a composition** — the `#org` generator (corpusChatService) reads the org brick
   contract and emits a brick composition (regions + content + token mode), not a bespoke
   `orgChart:{tiers}` payload that only `renderOrgChart` understands.
4. **Pilot org-chart (component 610:2, simplest: 3-tier matrix)** END TO END through `brickComposer`,
   BEHIND A FLAG, running alongside `renderOrgChart`. Assert output parity (same regions, same
   tokens, clean NU flip) + no-hardcode BLOCKING on the composer. org-chart is the pilot because it
   is the freshest and the smallest brick.

### B3 — migrate all deliverables onto the composer + retire renderX + close Figma defects

Walk the registry top to bottom; per deliverable: author its brick contract, route its generator to
emit a composition, prove parity through `brickComposer`, then DELETE its `renderX`. Promote the
no-hardcode scan from shadow to BLOCKING once a deliverable is migrated. Close the 5 Figma defects in
one focused authoring pass (componentize exec-brief + swap masthead to 619:2; convert tech-arch
connectors to auto-layout; rebind raw `#00b7c3` borders in case-study 588:4 / gap 598:2; roadmap
599:2 borders), then re-pull tokens + re-chunk `figma-node-map.md`.

## Sequencing note
B2 step 1 (contract schema) + the `brickComposer` skeleton + the flagged org pilot are code/test
only — safe while `#proto` is being tested; they ship dark behind the flag and only go live on a
deliberate rebuild + flag flip. The Figma authoring fixes (B3) touch the live file; one focused pass
+ re-chunk. Nothing is committed yet — awaiting owner approval per branch discipline.
