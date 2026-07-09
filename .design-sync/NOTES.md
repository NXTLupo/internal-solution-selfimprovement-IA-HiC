# design-sync notes

- 2026-07-08 owner directives (first sync):
  - Scope: ALL components (tokenized) from the 5 UI #proto pages of the NXT Figma design
    system (file iSQhAVM7SI4QHAWB7y9C2z) - the proto/* catalog (~22 patterns: nav-bar 440:2,
    breadcrumb 441:2, tabs 441:8, stepper 441:36, bottom-nav 442:19, footer 444:2,
    mega-menu 444:26, form-card 448:25, field 448:2, alert 450:6, list 454:2, card 454:27,
    stat 454:39, accordion 455:2, chart-bar 460:2, chart-line 460:11, button 462:21,
    cmd/search 462:34, pricing 465:20, hero 465:57, cite 408:2). NOT the slide templates.
  - Never violate the Unified Vision: design-time Figma harvest -> token-bound mirrors;
    runtime never calls Figma; every color/font/size resolves through tokens hydrated from
    hic-workspace/design-system/figma-tokens.json; zero hardcoded values.
  - Component base: shadcn/ui primitives (Radix + Tailwind) themed via CSS variables mapped
    from figma-tokens.json - NOT hand-rolled bespoke components. proto/* patterns compose
    from those primitives.
  - No compiled DS dist existed in the repo; the package is created for this purpose
    (design-time mirror, same lifecycle as figma-tokens.json: re-harvest on library change).
- Prior same-session harvest reference: proxy/proto_partials.py carries the full anatomy of
  all 21+1 partials with variable bindings (harvested 2026-07-08 via Figma MCP) - the
  authoritative anatomy source for the React/shadcn mirrors alongside the live Figma pages.
- 2026-07-08 owner reference image (Downloads/original-7e1d9f8811fa62f28fdb082a46dc37b4.webp,
  "TWISTY" freelance dashboard): the COMPOSITION quality bar for proto components + previews -
  soft rounded cards with generous padding, pill chips, dot-terminated line/scatter charts,
  stat groups (big numeral, quiet label, tick-strip), avatar-led list rows, search-in-navbar.
  Styling still resolves ONLY from NXT tokens (unified vision); the image informs layout
  density and preview realism, never colors/fonts/radii.
- 2026-07-08 solo-grade learnings (fan-out prompt material):
  - tailwind-merge ORDER: all-sides `border`/`border-hairline` must come BEFORE side-specific
    `border-l-[3px]`/`border-l-<color>` in cva/cn strings, or twMerge silently drops the side
    width and variants render identically (hit live on ui/alert.tsx; fixed).
  - Component-source changes need `npm run build` in nxt-proto-ds AND a full package-build re-run;
    preview-rebuild alone only recompiles the preview tsx against the STALE bundle.
  - Preview idiom that grades well: named exports, realistic domain copy (farm risk / benefits
    analytics), explicit style={{maxWidth}} so cards don't stretch, 2-4 exports per component.
- 2026-07-08 wave-1 fold (5 agents, 86/86 components authored + graded good):
  - PREVIEW AUTHORS: bundle CSS only carries utilities used by PACKAGE source; preview-only
    layout classes (h-20, flex-1...) silently no-op - use inline style for preview sizing.
  - Alpha modifiers (bg-rail/60) require the rgb-triplet color definitions in
    tailwind.config.js (<alpha-value>) - fixed 2026-07-08; gen-tokens emits --color-<k>-rgb.
  - Badge + Skeleton were plain function components; forwardRef added (Radix asChild anchors
    failed silently against them).
  - Dialog/Sheet preview statically with open + modal={false}; Tooltip needs
    TooltipProvider + open + ~48px clearance. Radix Tooltip content is NOT portalled here.
  - Composer source claims auto-grow but renders rows=1 textarea with no grow logic
    (multi-line values clip) - candidate source fix, previews use one-line values.
  - Avatars -space-x overlap occludes second initials (matches Figma anatomy); Story
    truncates names ~9 chars; Pricing wants >=720px, FeatureGrid(3) >=640, Bento >=560;
    ProductCard fixed intrinsic ~210px width.
  - Modal/Drawer previews carry a color-mix scrim workaround; harmless now that bg-rail/60
    compiles, remove on a future preview pass.
- Re-sync risks: figma-tokens.json is the token source - re-run `npm run gen:tokens` +
  full build after any Figma re-pull; the proto-component-manifest.md wiki page is the
  anatomy authority for component-source changes; NU mode ships tokens but Lato arrives
  via runtimeFontPrefixes (no @font-face shipped); preview grades live in the uploaded
  _ds_sync.json, not git.
- 2026-07-08 OWNER HARD BOUNDARY: nxt-proto-ds (shadcn package) is ONLY the claude.ai/design
  sync artifact. HiC runtime surfaces (heuristic proposed renders, #proto, slides) NEVER
  render through it - they compose from the Figma #proto pages via the design-time harvest
  (proxy/proto_partials.py token-bound mirrors + figma-tokens.json + the manifest-chunked
  PROPOSED-RENDER REGISTRY). Unified vision: Figma bricks + tokens, never a parallel library.
