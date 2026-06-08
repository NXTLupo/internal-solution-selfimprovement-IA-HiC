# Technical Whitepaper: Reference Architecture for an AI-Native Enterprise Creative Team (May 2026)

## 1. Executive Technical Summary

An AI-native creative organization in 2026 is best architected as a **layered, agent-orchestrated pipeline anchored on Figma as the design system of record**, with model-agnostic generative production fed through inference-routing gateways and governed by a brand/design-token layer that is the single source of truth across both code and canvas. The single most important architectural decision is to treat the **design system (Figma components + Variables/tokens + Code Connect mappings)** as the contract that every AI agent — design agents, coding agents, and asset-generation agents — must consume via the **Model Context Protocol (MCP)**, so that non-deterministic generative models produce on-brand, production-aligned output.

Key 2026 realities driving the architecture:
- Figma shipped a native **design agent on the canvas (May 20, 2026)** and opened the canvas to third-party agents via the **`use_figma` write tool (March 24, 2026)**, plus **Figma Make connected to local codebases with branch/PR workflows (May 28, 2026 closed beta)**. Figma is now an agent platform, not just a design tool.
- Generative image/video/audio models have bifurcated into **brand-safe/commercial models (Adobe Firefly family)** vs. **frontier quality/precision models (Google Nano Banana Pro, Veo 3.1, Black Forest Labs FLUX, Recraft, Ideogram)**, with **multi-model routing** (fal.ai, Replicate, OpenRouter, Together) as the abstraction layer.
- **Design-to-code** has matured from one-time export to a **living MCP-fed contract** (Figma Dev Mode MCP + Code Connect feeding Claude Code/Cursor/Copilot), with Anima/Locofy/Builder.io as component-aware converters.
- **Bulk/personalized production** at scale runs through creative-automation platforms (Celtra, Storyteq, Bannerflow, Rocketium) and Figma Buzz, wired to DAM/PIM and CRM data.

This document specifies the topology, APIs, auth models, agent-orchestration patterns, model selection, and governance for both **digital experience surfaces** (apps, websites, chatbots, AI experiences) and **retail/branch collateral**.

## 2. 2026 Industry Landscape and State of Creative AI

**Figma platform (system of record).** Figma evolved from design tool to AI-powered product platform. Per Figma's official Q1 2026 results (Business Wire / SEC Form 8-K, May 14, 2026), Q1 revenue grew 46% year-over-year to $333.4 million ($333,439K per the 10-Q), accelerating from 40% YoY growth the prior quarter; Figma raised FY2026 guidance to $1.422–1.428B, and net dollar retention reached 139%. The stock (NYSE: FIG) had corrected sharply by May 2026 amid an "AI-native workflow" rotation (VentureBeat). Key 2026 releases: MCP server GA (announced Feb 17, 2026 by Dylan Field), `use_figma` write-to-canvas (Mar 24), FigJam MCP skills/architecture diagrams (Apr 28), Make kits/attachments (Apr 2), Figma agent on canvas (May 20), Make-on-local-codebase (May 28). Config 2026 is June 23–25, 2026 at Moscone Center, SF.

**Generative model landscape.** Image: Google Nano Banana Pro (Gemini 3 Pro Image), GPT Image 1.5/2, Black Forest Labs FLUX 2, Recraft V4.1, Ideogram V3, Midjourney v7/v8, Adobe Firefly Image 4/5. Video: Google Veo 3.1, Seedance/Dreamina, Kling, Runway Gen-4, Luma, Adobe Firefly Video. Audio: ElevenLabs (v3, Multilingual v2, Flash v2.5). LMArena and Artificial Analysis are the objective leaderboards.

**Creative-suite AI wars.** Adobe (Firefly Image Model 5 public beta, Firefly Foundry, GenStudio), Canva (Canva AI 2.0 + Canva Design Model, April 2026 at Canva Create), and Figma (Weave, agents) are all converging on integrated agentic creative workflows.

## 3. Reference Architecture for an AI-Native Creative Org

### 3.1 End-to-end topology (text diagram)

```
[Ideation]          [Design]            [Prototype]         [Design-to-Code]      [Asset Production]    [Personalization]   [Distribution]
FigJam + MCP   →    Figma Design   →    Figma Make /   →    Dev Mode MCP +   →    Firefly Services /  → DCO/CRM-driven  →  CMS / DAM /
diagrams,           (agent on           v0/Bolt/            Code Connect →        Weave / fal.ai /      variant gen        Sites / in-branch
project plans       canvas) +           Lovable +          Claude Code/          Recraft/Ideogram      (Celtra/Storyteq/  signage
                    Variables/tokens    real data          Cursor/Copilot        bulk APIs             Buzz/Bannerflow)

        ╔══════════════════════════════════════════════════════════════════════════════════════╗
        ║  AGENT ORCHESTRATION LAYER (MCP servers + REST APIs + skills/SKILL.md)                 ║
        ║  Figma MCP (mcp.figma.com/mcp) · model-routing gateway · DAM/CMS MCP · CRM connectors  ║
        ╚══════════════════════════════════════════════════════════════════════════════════════╝
        ╔══════════════════════════════════════════════════════════════════════════════════════╗
        ║  BRAND / DESIGN-TOKEN LAYER (single source of truth)                                   ║
        ║  Figma Variables (4 types, modes) ↔ Variables REST API ↔ Style Dictionary/Token Studio ║
        ║  ↔ code (CSS/JSON/Swift/XML) · Code Connect mappings · brand kits / custom models      ║
        ╚══════════════════════════════════════════════════════════════════════════════════════╝
        ╔══════════════════════════════════════════════════════════════════════════════════════╗
        ║  DATA / PERSONALIZATION LAYER: CDP / CRM / PIM · segment + locale feeds → DCO engines   ║
        ║  CONTENT / DAM LAYER: Bynder, Brandfolder, Acquia DAM · Content Credentials / C2PA      ║
        ╚══════════════════════════════════════════════════════════════════════════════════════╝
```

### 3.2 Four control planes

1. **Agent orchestration layer.** AI agents coordinate across tools via MCP (Anthropic's open protocol) and REST APIs. The Figma MCP server (single endpoint `mcp.figma.com/mcp`, Streamable HTTP) exposes ~16 tools (10 read, 3 write, 2 navigation, 1 execution) and is guided by **skills** (markdown `SKILL.md` files) that encode team conventions. Coding agents (Claude Code, Cursor, Copilot, Codex, Windsurf, Warp, Augment, Factory, Firebender) connect as MCP clients.
2. **Brand/design-token layer.** Figma Variables (BOOLEAN, FLOAT, STRING, COLOR; multi-mode collections) implement design tokens. The Variables REST API (query/create/update/delete) + Style Dictionary/Token Studio sync tokens to code (CSS/JSON/Swift/Android XML). This is the contract for theming, multi-brand, and locale.
3. **DAM/content layer.** Approved assets, product data (PIM), and Content Credentials (C2PA) live here; DCO platforms and Figma Buzz pull from it.
4. **Data/personalization layer.** CDP/CRM/segment + locale feeds drive variant generation and DCO.

## 4. Deep Dive: Figma as the Creative System of Record

### 4.1 Figma Make (prompt-to-app / design-to-code)
Figma Make is an AI prompt-to-code tool turning prompts/designs into working prototypes/apps. The **May 28, 2026 closed beta** (Mac-only, Beta desktop app) connects Make to a **local codebase**:
- **Direct editing** — select UI elements, adjust color/font/spacing/layout via a Figma panel; the agent finds and edits the relevant code.
- **Annotations** — draw natural-language annotations on elements for interaction/animation changes; stackable to queue changes.
- **Chat-driven edits**; **Figma MCP integration** (paste a frame URL/component link, agent builds with the real design system).
- **Branch and PR workflow** — changes accumulate as local Git commits; create a branch and open a PR without a terminal. **GitHub native; other Git providers via SSH.**
- **Multi-model**: toggles between Anthropic Claude (Sonnet/Opus) and Google Gemini models (per VentureBeat).
- **Constraints**: Mac-only beta; one-directional sync (Make→GitHub overwrites engineer changes if both touch frontend); designers need existing codebase access. Credits not consumed during beta; AI credits apply at GA. Backend via Supabase (secrets, compute, Postgres). Pricing: Full seats $16–$90/mo.

### 4.2 Figma Weave (AI creative canvas)
Acquired as Weavy on October 30, 2025 (TechCrunch); Calcalist reported the deal valued Tel Aviv-based Weavy at more than $200 million — about 50 times the funding it had raised (a $4M seed in June 2025 at a ~$13M valuation per PitchBook). ~20 employees (founded 2024 by ex-Fiverr employees, CEO Lior Albeck) joined Figma. It is a node-based multi-model canvas for image/video/audio/3D, reintroduced as Figma Weave **April 17, 2026** with **20+ workflow templates** on Figma Community. SOC 2 Type II. Per-node model choice across Seedance/Sora/Veo (video), Flux/Ideogram (realism), Nano-Banana/Seedream (precision), plus Kling, Runway, Luma, Wan, Grok, Recraft, Bria. Customers: DoorDash, Lyft (scaled a brand photoshoot — swapping cars/cities/backgrounds on demand), NVIDIA (CES keynote robot scene; low-fi 3D → 4K → 12K upscale). Full Figma integration coming later in 2026; still standalone billing at weave.figma.com.

### 4.3 Figma MCP server and skills
- **Deployment**: Remote (preferred, `https://mcp.figma.com/mcp`, no desktop app, broadest features incl. write-to-canvas, code-to-canvas) vs. Desktop (local `http://127.0.0.1:3845/mcp` via Dev Mode toggle; for orgs restricting outbound connections).
- **Tools**: `get_design_context`, `get_code` (frame→code), `get_variable_defs`, `get_metadata`, `get_screenshot`, `generate_figma_design` (live HTML→editable Figma layers), `use_figma` (write JS via Plugin API), `create_new_file`, `generate_diagram`, plus Code Connect tools (`get_code_connect_map`, `add_code_connect_map`, `send_code_connect_mappings`, `get_code_connect_suggestions`).
- **Skills** (markdown SKILL.md): `/use-figma` (foundational, mandatory before any `use_figma` call), `figma-generate-design`, `figma-generate-library`, `figma-use-figjam`, `figma-generate-diagram`, `figma-code-connect`, `figma-create-new-file`, `generate-project-plan`. Community skills include `/sync-figma-token` (token drift detection, Firebender), `/multi-agent` (Augment). Anyone can author a skill — no plugin code.
- **Editor modes**: design (`figma.com/design/`), FigJam (`figma.com/board/`), Slides (`figma.com/slides/`) have different node-type availability. Design-only nodes (Rectangle, Frame, Component, Text, etc.) are blocked in FigJam; FigJam nodes (Sticky, Connector, ShapeWithText, CodeBlock) blocked in design.
- **Self-healing loop**: agent screenshots its output, compares to intent, iterates against real components/variables/auto-layout.
- **Rate limits**: read tools follow Tier 1 REST API per-minute limits for Dev/Full seats on paid plans; write tools currently exempt. Starter/View/Collab capped at 6 tool calls/month.

### 4.4 FigJam architecture layouts (Apr 28, 2026)
`figma-use-figjam` skill lets agents read/write FigJam boards (stickies, sections, connectors, shapes, tables, code blocks). `generate_diagram` supports complex architecture and ER diagrams. `generate-project-plan` turns a PRD + codebase context into a structured multi-column FigJam board via a 9-step interactive flow (uses `figma.createSection()`, `figma.createTable(rows, cols)`, Inter Bold styling). Use case: agent-written PRs documented as visual architecture for human review.

### 4.5 Figma design agent on canvas (May 20, 2026)
Native agent in Figma Design (canvas + left rail), fine-tuned for editing Figma files with deep context on components/tokens/standards. Handles bulk edits: rename variables for consistency, swap components across screens, repeat padding changes across a flow, populate frames with realistic content, convert to dark mode, set all chips to active state. Multiple agents can run simultaneously. Full seats on Professional/Org/Enterprise; Collab/Dev in drafts. Usage-based paid feature (free during beta); rolling out from May 20.

### 4.6 Dev Mode and Code Connect
Code Connect links Figma component nodes to code implementations so Dev Mode shows real codebase snippets and MCP `get_design_context` returns `componentName`, `source`, and a rendered snippet for accurate AI codegen. Two paths: **Code Connect UI** (in-Figma, language-agnostic, GitHub-connected) and **Code Connect CLI** (React, SwiftUI, etc.; template mappings executed in sandboxed QuickJS). Mappings require published components; one mapping per framework label per node. Enhanced MCP codegen surfaces example previews from connected source files.

### 4.7 REST API, Plugin API, Variables API, tokens
- **REST API**: `https://api.figma.com`, REST structure, auth via personal access tokens (PAT, max 90-day expiry, non-expiring deprecated) or OAuth2 with scoped tokens (`file_content:read`, `file_comments:read`, etc.). Webhooks for events. OpenAPI spec at `figma/rest-api-spec`. Discovery API (Enterprise + Governance+) can surface user-submitted AI prompt text. Variables REST API supports **extended collections** (`isExtension`, `parentVariableCollectionId`, `variableOverrides`) for brand variants from a single source of truth.
- **Plugin API**: `createVariable()` (4 data types), variable aliases, `setBoundVariableForPaint/Effect/LayoutGrid`, team library publish/import, GRID layout APIs.
- **Tokens/modes**: each variable collection supports modes (light/dark, per-brand, per-platform); semantic token (e.g., `text-primary`) maps to different primitives per mode. Dev Mode exposes tokens as CSS custom properties (e.g., `--color-action-primary`). Real-world: Intuit syncs a single source of design tokens to Figma Variables across TurboTax/QuickBooks/Mailchimp/Credit Karma brands.

### 4.8 Figma Buzz (bulk asset production)
Buzz bulk creation (May 22, 2026): upload a spreadsheet to create assets, multi-select cells in table view to manage content/sizes/brand imagery across hundreds of variants; bulk resize across preset channel sizes → multi-channel campaign output. This is Figma's native answer to template-driven bulk/DCO.

### 4.9 Config 2026 direction
June 23–25, 2026, Moscone South. In-person sold out; virtual free. Expect deeper agent/MCP, Make-to-production, and Weave integration announcements (directional, not yet shipped).

## 5. Deep Dive: Experience Prototyping (apps, websites, chatbots, AI experiences)

### 5.1 Prompt-to-app / prompt-to-prototype landscape
| Tool | Output / framework | Best for | Notes (2026) |
|---|---|---|---|
| **Figma Make** | React; design-system-aware via MCP | Brand-fidelity teams in Figma | Direct Figma metadata access = high fidelity; included in Full seat |
| **v0 (Vercel)** | React + Tailwind + shadcn/ui | Frontend devs in Vercel ecosystem | Opinionated stack; AI Gateway (Claude/Gemini/OpenAI); one-way GitHub export; added Supabase + DB connectivity Feb 2026 |
| **Bolt.new (StackBlitz)** | React/Next/Vue/Svelte/RN; full-stack JS | Fast multi-framework prototypes | WebContainer (fastest); direct Figma import = high fidelity |
| **Lovable** | React + TS + Tailwind + shadcn; Supabase | Non-technical founders/MVPs | Cleanest full-stack; GitHub sync; security incidents flagged historically |
| **Replit (Agent 4, Mar 2026)** | 50+ languages; full IDE | Backend-heavy/production infra | Security Agent (Apr 2026); SOC 2 Type II; Design Mode |
| **Subframe / Builder.io / Anima / Framer AI / Google Stitch / Uizard** | Various | Component/UI generation, design import | Stitch pipes design data to coding agents via MCP |

EPAM's structured test found **direct Figma metadata access (Figma Make, Replit, Bolt) is the "cheat code" for fidelity**; screenshot-based tools (v0, Lovable) produce more generic output. All tools hit the "80/20 rule" — easy initial layout, hard final 20% (complex interactions, error handling).

### 5.2 Prototyping conversational/agentic AI experiences
For chatbots and AI-native UX, the 2026 stack splits between **design-side** (Figma Make/v0 to build the chat UI shell with real streaming data) and **conversation-design platforms**:
- **Voiceflow** — "operating system for AI customer experience"; drag-and-drop canvas supporting agentic playbooks + deterministic workflows, global instructions/guardrails.
- **Google CX Agent Studio** (under Gemini Enterprise for CX; Dialogflow CX became "Flows" sub-component, Mar 2026) — visual build/evaluate/deploy/monitor multimodal agents, 40+ languages, MCP support (`McpTool` types, managed MCP servers in public preview).
- **Botpress, Cognigy, Yellow.ai, Rasa (CALM)** — enterprise conversational AI.
- **Agent frameworks for AI-native experiences**: LangGraph (production state control), CrewAI (role-based prototyping), AutoGen (conversational message-passing). Production maturity is still low: per Digital Applied's 2026 compilation citing Forrester/Anaconda, 88% of agent pilots fail to graduate to production (i.e., only ~12% reach production), though survivors return an average 171% ROI; S&P Global Market Intelligence separately puts 31% of organizations with at least one agent in production.

Pattern: prototype the **AI behavior** (tool calls, latency, streaming) with real models behind a routing gateway, and the **UX shell** in Figma Make/v0, joined by MCP so the chat components map to the design system.

## 6. Deep Dive: Design-to-Code Connectors & the Design-System-to-Production Pipeline

### 6.1 The MCP-fed contract
The 2026 pattern is **not** one-time export. Coding agents consume Figma design context live via MCP. Setup (Claude Code example): `claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp` (desktop) or the remote server + Figma plugin (includes MCP settings + Agent Skills). With Code Connect, `get_design_context` returns real component snippets; agents are instructed via cursor/rules files (e.g., "Always use components from `/design_system`", "use design tokens from Figma", "follow WCAG", "if MCP returns a localhost asset source, use it directly; don't create placeholders").

### 6.2 Connector tools comparison
| Tool | Frameworks | Component/library awareness | Notes |
|---|---|---|---|
| **Figma Code Connect** | React, SwiftUI, Vue/HTML, Web Components, etc. | Native (maps Figma node ↔ code component) | Feeds MCP; UI + CLI; template mappings in QuickJS |
| **Builder.io Visual Copilot** | React, Vue, Angular, Svelte, Qwik, Solid, RN, Kotlin, Flutter; Next/Tailwind | Strong (CLI learns your patterns; multi-stage AI pipeline + open-source Mitosis compiler) | CMS coupling = some lock-in |
| **Anima** | React, Vue, HTML | Frontier VS Code extension maps to existing components | Most-installed Dev Mode plugin (1.5M+ installs); Figma Dev Mode launch partner; IBM invested Feb 2026; web-only |
| **Locofy** | React, Next, Gatsby, RN, Vue, Angular, HTML, Flutter | LDMs; imports MUI/Chakra/Bootstrap/Ant; tag system | SOC2+ISO; on-prem/cloud; Lightning ~80% front-end automation |
| **quest.ai / TeleportHQ / CodeParrot** | Various | Varies | Quality scales with design-file discipline |

Reality check: AI gets ~75% of the way; ~20–40% manual refinement for production (semantic HTML, relative units, responsive edge cases, accessibility). Output quality is proportional to Figma file discipline (auto-layout, semantic layer names, components, variables).

### 6.3 Round-tripping & token sync
- `generate_figma_design` (HTML→Figma) brings drifted UI back into Figma; `use_figma` then edits with real components — the two are complementary for keeping design and code in sync.
- Token sync: Variables REST API + Style Dictionary/Token Studio export to CSS/JSON/Swift/Android XML; `/sync-figma-token` skill does bidirectional sync with drift detection.

## 7. Deep Dive: Targeted/Personalized & Bulk/Dynamic Asset Production

### 7.1 Brand-safe vs. frontier generation
- **Adobe Firefly (commercial-safe anchor).** Trained on licensed (Adobe Stock) + public-domain content; Content Credentials (C2PA) on every asset; enterprise IP indemnification. 2026 models: **Image Model 4 / 4 Ultra (GA, up to 2K)**, **Firefly Video Model (GA, 1080p)**, **Image Model 5 (public beta, native 4MP + Prompt to Edit)**. **Firefly Custom Models** (GA for enterprise; private beta for creators) fine-tune on brand assets (10–20 images, min 1024×1024); customer assets isolated, not used to train Adobe foundation models. **Firefly Foundry** trains private multimodal brand models for select enterprises. Firefly integrates 30+ partner models (Nano Banana, Veo 3.1, Imagen 4, FLUX 1.1, Ideogram 3.0, GPT Image, Runway Gen-4, Luma Ray3, ElevenLabs Multilingual v2, Topaz) with Content Credentials noting which model generated each asset.
- **Frontier/precision models.** Nano Banana Pro (precision editing, identity lock, text rendering, 4K), FLUX 2 (material/photoreal), Recraft V4.1 (only native SVG/vector + brand kit), Ideogram V3 (typography/text-in-image), Midjourney (aesthetic).

### 7.2 Firefly Services / GenStudio (programmatic bulk)
- **Firefly Services**: 20+ APIs (Firefly, Photoshop, Lightroom, Content Tagging; Custom Models API; Translate & Lip Sync GA; Avatar). **Auth: OAuth server-to-server** — token from `https://ims-na1.adobelogin.com/ims/token/v3` (`grant_type=client_credentials`, scopes `openid,AdobeID,firefly_api,ff_apis`); tokens valid 24h. Async REST; outputs to encrypted S3 with pre-signed URLs; reference content deleted after 24h, custom-model delta weights cached two weeks.
- **Pricing signals**: ~**$0.02–0.10/image**; enterprise agreement **~$1,000/mo minimum**; consumer plans ($9.99–$199.99/mo) exclude API. Image gen 3–10s/request; budget ~80–120 engineering hours for production integration. (Per-image figures are third-party estimates; verify with Adobe Sales.)
- **GenStudio for Performance Marketing** + Custom Models integration scales on-brand ad content; **Firefly Creative Production** is a no-code bulk interface (now supports video/3D). Forrester TEI (Adobe-cited): 70–80% variant-production scaling, up to 75% less review/fix time.

### 7.3 Enterprise creative-automation platforms (DCO + bulk)
| Platform | Strength | Integration |
|---|---|---|
| **Celtra** | Mature multi-channel creative automation, modular templates, DCO | Google Ad Manager/CM360, The Trade Desk, IAS, DoubleVerify, Bynder DAM; API |
| **Storyteq** | Video-first Adaptation Studio, localization/versioning; content portal + DAM | Figma plugin, Adobe AE/PS, Meta/Google/YouTube/X; Bynder, Acquia DAM, Brandfolder, CreativeX; €30k–180k/yr |
| **Bannerflow** | HTML5 ad production at scale, DCO auto-optimization, 100+ networks | DSPs/networks; governance for multi-market |
| **Rocketium** | Retail-compliant bulk (Amazon/Walmart/100+ retail ad platforms rules) | Per Rocketium case materials, Beiersdorf/NIVEA (with Publicis Commerce) now launches across 14 platforms 2× faster with 98% fewer platform rejections; MegaFood produced 1,100 approved PDP assets in under 4 weeks at 40% of freelancer cost |
| **Creatopy / Papirfly / Pencil (Brandtech)** | Self-serve to brand-management | Varies |

Pattern: brand-locked templates + DAM/PIM feed + CSV/CRM data → thousands of on-brand, localized variants; DCO engines route impressions to best-performing variants.

### 7.4 Personalization at scale
CDP/CRM segment + locale feeds drive variant generation; transcreation (not just translation) via ElevenLabs dubbing/Translate & Lip Sync and localized image gen; resize/reformat across surface specs (Figma Buzz bulk resize, Magic Resize, Storyteq Adaptation Studio). 67% of retail execs expect AI-driven personalization within a year; 94% plan to bring marketing in-house (Netcore).

### 7.5 Canva (alternative/complementary bulk lane)
**Canva AI 2.0** (Canva Create, April 2026, research preview) on the **Canva Design Model** (design-specific foundation model) — conversational design, agentic orchestration, layered object intelligence, living memory; six workflows (connectors, scheduling, web research, brand intelligence, Sheets AI, Canva Code 2.0). **Bulk Create** (CSV→variants), **Magic Studio at scale**, **Magic Layers** (editable layers from AI images; US/UK/CA/AU beta), Dream Lab (Leonardo Phoenix), Veo-3 video. **Canva Shield** enterprise indemnification (100+ seats). 230M+ MAU.

## 8. Generative Model Selection Guide

### 8.1 Image
| Model | Distinguishing trait | API / cost signal | Brand-safety posture |
|---|---|---|---|
| **Nano Banana Pro** (Gemini 3 Pro Image, `gemini-3-pro-image-preview`) | Reasoning-based precision, identity lock (up to ~14 refs), text ~94%, native 4K | Gemini/Vertex API (preview); ~$0.134/1–2K, ~$0.24/4K; batch 50% off | SynthID watermark on free tier; no IP indemnity by default |
| **Adobe Firefly Image 4/4 Ultra/5** | Commercial-safe, brand custom models | Firefly Services ~$0.02–0.10/img | C2PA Content Credentials; IP indemnification |
| **FLUX 2 (Black Forest Labs)** | Photoreal/material accuracy | fal/Replicate ~$0.05/img | Open-weight options |
| **Recraft V4.1** | **Only native SVG/vector**; brand kit (colors/fonts/logos) | fal $0.04 raster/$0.08 vector; Recraft API (Bearer) | Brand-consistent; CMYK/PDF/Lottie export |
| **Ideogram V3** | Best text-in-image/typography | `api.ideogram.ai/generate` (Api-Key header); tiers Turbo/Default/Quality | Signage/packaging/logos |
| **Midjourney v7/v8** | Aesthetic/cinematic | No mainstream API; subscription | Weak text; artistic |
| **GPT Image 1.5/2** | Strong prompt adherence + text | OpenAI API | Top LMArena T2I |

### 8.2 Video
Veo 3.1 (720p/1080p/4K, native synchronized audio in one call; Vertex/Gemini API "Paid Preview"; ~$0.10/s Fast no-audio up to ~$0.40/s with audio, 4K premium); Seedance/Dreamina 2.0 (top of Artificial Analysis I2V arena); Kling, Runway Gen-4, Luma, Adobe Firefly Video (1080p, IP-friendly). Veo 3 video-only ~$0.50/s, with audio ~$0.75/s on Vertex.

### 8.3 Audio
**ElevenLabs**: TTS (per character), STT (per minute), Music/SFX (per generation), Dubbing (per source minute); models Multilingual v2 (29+ langs, 192kbps), Flash v2.5 (~75ms latency, real-time), **Eleven v3** (alpha→public API, 70+ langs, inline audio tags, multi-speaker Text-to-Dialogue). Plans $5→$990/mo + enterprise. Commercial license on paid plans; SOC 2/HIPAA/GDPR, EU residency, zero-retention modes.

### 8.4 3D
Figma Weave 3D workflows; Tripo (multi-view→3D); Midjourney announced 3D export (roadmap). Adobe Substance 3D API (beta).

### 8.5 Model-routing / inference platforms
- **fal.ai** — media-first (image/video/audio/3D); custom CUDA kernels, near-zero cold starts; 30–50% cheaper than Replicate on popular models (FLUX/Kling/Wan); 1000+ models, SOC 2.
- **Replicate** — 50k+ Cog models, per-second GPU billing; Cloudflare edge; broadest model coverage.
- **Together** — open-source LLM inference, batch discounts, fine-tuning, dedicated GPUs.
- **OpenRouter** — 300+ LLMs, OpenAI-compatible, automatic fallback/routing; ~5.5% credit fee, ~100–150ms overhead; limited image, experimental video.
- **Hugging Face Inference Endpoints** — dedicated autoscaling, 2M+ models.

Use a gateway to keep model selection/routing/fallback out of application code; pin explicit model IDs/versions for deterministic latency.

### 8.6 Benchmarks
**LMArena** (Elo from blind human votes; Text-to-Image, Image Edit, Video arenas) and **Artificial Analysis** (Image/Video arenas, quality+cost). As of 2026: GPT Image 1.5 led LMArena T2I (~1264 Elo), Gemini 3 Pro Image ~1235; Recraft V4.1 Pro added May 22, 2026. Artificial Analysis I2V (no audio): HappyHorse-1.0 (1401) led, Dreamina Seedance 2.0 (1351); with audio: Dreamina Seedance 2.0 (1181), Veo 3.1 Fast (1094). Use these for objective model selection, not vendor claims.

## 9. Surface-Specific Production Playbooks

### 9.1 Digital experience design (apps, websites, chatbots, AI experiences) — PRIMARY FOCUS
1. **Ideate** in FigJam with `generate-project-plan`/`generate_diagram` skills (PRD → architecture + project board).
2. **Design** in Figma Design with the canvas agent generating screens from existing components/Variables; enforce tokens/modes for theming, multi-brand, locale.
3. **Prototype** with Figma Make (real data + MCP design-system binding) or v0/Bolt; for chatbots, prototype AI behavior behind a routing gateway + UX shell in Make/v0.
4. **Design-to-code**: Dev Mode MCP + Code Connect feed Claude Code/Cursor/Copilot; agents build against the real component library; Make opens PRs.
5. **Sites/Slides** surfaces: Figma Sites (publish dynamic sites) and Figma Slides for collateral.
6. **QC**: self-healing screenshot loops + human review gates on PRs.

### 9.2 Retail/branch asset generation — PRIMARY FOCUS
- **In-branch/in-store signage**: digital signage has become a "core operational layer" (real-time pricing, wayfinding, dynamic menus, compliance). 2026 trend: AI-driven personalization + automated content triggers feeding CMS-driven screens. Per a Vestcom/Avery Dennison survey (Oct 8, 2024, 1,000 US respondents with the Path to Purchase Institute), 47% of shoppers believe digital screens have a positive impact on their in-store grocery shopping experience and 27% report an unplanned purchase from an in-store digital display.
- **Localized store/branch collateral**: brand-locked templates + PIM/DAM feed → regional variants via Celtra/Storyteq/Rocketium/Bannerflow; print + digital circular automation pulling from centralized product data (region/store-group/channel variants in one workflow).
- **Regional personalization**: locale modes in Figma Variables + transcreation (ElevenLabs dubbing, localized image gen with brand custom models); hyperlocal targeting (geofencing) feeding DCO.
- **Brand governance for local adaptation**: smart templates lock logo/colors/fonts/legal disclaimers while exposing variable fields (offers, products, CTAs, language) — Celtra/Storyteq pattern; Rocketium's Intelligence layer enforces 100+ retail-platform rules to cut rejections.

### 9.3 Other surfaces (brief)
Broad social/paid, OOH, broadcast: handled by the same DCO/creative-automation lane (Celtra/Bannerflow/Smartly for paid social; Storyteq for CTV/video versioning) — out of primary scope here.

## 10. Governance, Brand Safety, IP/Commercial-Safety, HITL & QC

- **IP/commercial safety**: prefer Adobe Firefly (licensed/public-domain training, C2PA Content Credentials, enterprise IP indemnification) and Canva Shield for assets going to market; treat raw frontier-model output (Nano Banana, Midjourney) as not indemnified by default. Note raw AI generations are generally not copyrightable in US/EU.
- **Content provenance**: attach C2PA Content Credentials; Figma Discovery API (Enterprise + Governance+) can audit user-submitted AI prompts.
- **Brand guardrails**: encode in MCP skills (SKILL.md), cursor/rules files, brand kits, custom/fine-tuned brand models, and locked DCO templates. Variables/modes enforce token compliance.
- **HITL gates**: PR review for any Make/agent code (Figma's explicit design: "shipping production code should happen intentionally, through your team's development process"); design review on canvas; legal/compliance review for regulated retail/branch (pricing, disclaimers).
- **Access control**: Figma seat types (Full vs Dev vs Collab/View) gate write access; Adobe Admin Console controls partner-model access per user; enterprise SSO/SOC 2/HIPAA where needed.
- **QC**: self-healing screenshot loops; review agents comparing generated code to Figma screenshots; retail-platform rule validation pre-submission.

## 11. Implementation Roadmap & Build-vs-Buy

**Phase 0 — Foundation (weeks 0–6).** Stand up the brand/token layer: model design tokens as Figma Variables with modes (theme/brand/locale); wire Variables REST API + Style Dictionary/Token Studio to code. Establish Code Connect mappings for the top components. **Buy** Figma (anchor); **build** the token-sync pipeline.

**Phase 1 — Agent orchestration (weeks 6–12).** Deploy the remote Figma MCP server; author team SKILL.md skills (design-system rules, token sync, screen generation). Connect Claude Code/Cursor/Copilot. Stand up a model-routing gateway (**buy** fal.ai for media + OpenRouter for LLM, or self-host LiteLLM for governance). Pilot Figma Make on a low-risk surface.

**Phase 2 — Asset production (weeks 12–20).** Integrate **Adobe Firefly Services** (OAuth server-to-server) for brand-safe bulk; train **Firefly Custom Models** on brand assets; add Recraft (vector/SVG), Ideogram (typography), Nano Banana Pro (precision) via the gateway. **Buy** a creative-automation/DCO platform (Storyteq for video/localization, Rocketium for retail compliance, Celtra/Bannerflow for display).

**Phase 3 — Personalization & distribution (weeks 20–28).** Wire CDP/CRM/PIM feeds to DCO; connect DAM (Bynder/Brandfolder/Acquia) with Content Credentials; deploy to CMS, Figma Sites, and in-branch signage CMS. Localize via locale modes + ElevenLabs transcreation.

**Phase 4 — Govern & scale.** HITL gates, provenance auditing, cost monitoring (per-model dashboards, pinned model versions), KPI loops.

**Build-vs-buy rules of thumb**: Buy the system of record (Figma), brand-safe generation (Adobe), and DCO/automation (Celtra/Storyteq/Rocketium). Build the token-sync pipeline, MCP skills, routing-gateway policy, and orchestration glue. Self-host inference routing (LiteLLM) only if governance/cost demands it.

## 12. Risks, Limitations & Open Problems (as of May 2026)

- **One-directional sync** in Figma Make (Make→GitHub overwrites engineer frontend edits) — a real workflow hazard; Mac-only beta limits adoption.
- **Pricing uncertainty**: Figma agent/MCP write-to-canvas and Make AI credits are "usage-based, TBD"; aggressive agent loops could be costly. Adobe per-image API pricing is third-party-estimated.
- **Model preview/beta status**: Veo 3.1 (Paid Preview, 4K still preview-labeled), Nano Banana Pro (`-preview`), Firefly Image 5 (beta), Canva AI 2.0 (research preview), Eleven v3 (alpha) — capabilities may shift.
- **Output quality gap**: design-to-code tools deliver ~75% (20–40% manual refinement); the final 20% (interactions, accessibility, responsive edge cases) degrades under iteration.
- **Non-determinism**: same prompt → different output; skills/screenshots mitigate but don't eliminate.
- **Copyright/IP**: raw AI generations generally non-copyrightable (US/EU); indemnification only on qualifying Adobe/Canva enterprise plans; Chinese partner models route prompts/files to the developing company.
- **Agent production readiness**: only ~12% of agent pilots reach production (Forrester/Anaconda via Digital Applied), though survivors average ~171% ROI; S&P Global puts 31% of organizations with at least one agent in production — security/reliability remain the gating constraints.
- **MCP single-point dependency**: all Figma skills depend on `mcp.figma.com/mcp`; no offline fallback. Skills can't natively chain to other MCP servers or validate against production APIs in the same workflow.
- **Data fragmentation** across markets/retailers remains the top barrier to retail personalization at scale.

---

### Appendix: Quick-reference release-status table (May 2026)
| Capability | Status |
|---|---|
| Figma MCP server (read) | GA |
| Figma `use_figma` write-to-canvas | Beta (free), usage-based pricing TBD |
| Figma design agent on canvas | Rolling out from May 20, 2026 (beta) |
| Figma Make on local codebase (PR workflow) | Closed beta, Mac-only (May 28, 2026) |
| Figma Weave | Standalone GA; full Figma integration later 2026 |
| Adobe Firefly Image 4/4 Ultra; Firefly Video Model | GA |
| Adobe Firefly Image Model 5 | Public beta |
| Firefly Custom Models | GA (enterprise); private beta (creators) |
| Firefly Foundry | Select enterprise |
| Google Veo 3.1 | Paid Preview (Vertex/Gemini); 4K preview-labeled |
| Nano Banana Pro (`gemini-3-pro-image-preview`) | Preview |
| ElevenLabs Eleven v3 | Alpha; public API available |
| Canva AI 2.0 / Canva Design Model | Research preview |
| Recraft V4.1 / V4.1 Pro | GA (V4.1 released mid-May 2026) |