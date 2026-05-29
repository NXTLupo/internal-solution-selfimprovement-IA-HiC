"""Creative AI source pack — 200 sources auto-parsed from
.claude/skills/intelligence/creative_ai_sources_registry.md (2026-05-29).
Merged into proxy SOURCES at startup. pack='creative_ai'."""

CREATIVE_AI_SOURCES = {
    "figma_blog": {
        "name": "Figma Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "url": "https://www.figma.com/blog/feed/atom.xml",
        "description": "Figma's main blog — AI agents on canvas, Figma Make, Weave, MCP skills, Config announcements. Verified May 2026 content."
    },
    "figma_newsroom": {
        "name": "Figma Newsroom",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "figma.com",
        "url": "https://www.figma.com/newsroom/",
        "description": "Figma's official press/announcement hub; product launches with dates (May 28 2026 Figma Make expansion verified)."
    },
    "figma_releases": {
        "name": "Figma Release Notes",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "help.figma.com",
        "url": "https://help.figma.com/hc/en-us/articles/360039811154-Release-notes",
        "description": "Granular Figma release notes; feature-level changes with dates. Useful for tracking exact capability rollouts."
    },
    "figma_developers": {
        "name": "Figma Developers Blog & API Changelog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "figma.com",
        "url": "https://www.figma.com/developers/api",
        "description": "Figma REST API + Plugin API documentation and changelog; tracks new endpoints (Dev Mode, Variables, Code Connect, MCP server)."
    },
    "adobe_blog": {
        "name": "Adobe Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "url": "https://blog.adobe.com/en/feed.xml",
        "description": "Adobe's central blog — Firefly, Creative Cloud, Express, Photoshop/Illustrator AI. April 2026 Firefly AI Assistant beta verified."
    },
    "adobe_news": {
        "name": "Adobe Newsroom",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "news.adobe.com",
        "url": "https://news.adobe.com/news/",
        "description": "Adobe official press releases — MAX announcements, Firefly model updates, earnings-tied product reveals (April 15 2026 Creative Agent verified)."
    },
    "adobe_firefly_blog": {
        "name": "Adobe Firefly Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "blog.adobe.com",
        "url": "https://blog.adobe.com/en/topics/firefly",
        "description": "Firefly-specific posts: model versions (Image 4, Video), AI Assistant, Creative Skills, partner-model integration (Nano Banana Pro, Runway, Flux)."
    },
    "adobe_firefly_api": {
        "name": "Adobe Firefly Services API Docs",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "developer.adobe.com",
        "url": "https://developer.adobe.com/firefly-services/docs/firefly-api/",
        "description": "Firefly Services API reference — text-to-image, generative fill/expand, generative recolor; pay-as-you-go (~$0.02/image)."
    },
    "adobe_express_blog": {
        "name": "Adobe Express Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "adobe.com",
        "url": "https://www.adobe.com/express/learn/blog",
        "description": "Adobe Express (Canva-competitor) content on templates, brand kits, AI quick-actions for social/marketing teams."
    },
    "canva_newsroom": {
        "name": "Canva Newsroom",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "canva.com",
        "url": "https://www.canva.com/newsroom/",
        "description": "Canva official announcements — Canva AI 2.0, Magic Studio, Magic Layers, Canva Design Model, Canva Create keynotes (2026 LA event verified)."
    },
    "canva_blog": {
        "name": "Canva Design School / Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "canva.com",
        "url": "https://www.canva.com/learn/",
        "description": "Canva Design School — tutorials, brand-design guidance, AI feature how-tos for non-designers."
    },
    "canva_developers": {
        "name": "Canva Developers Changelog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "canva.dev",
        "url": "https://www.canva.dev/docs/connect/",
        "description": "Canva Connect APIs + Apps SDK changelog; tracks programmatic design generation, autofill, brand-template endpoints."
    },
    "sketch_blog": {
        "name": "Sketch Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "url": "https://www.sketch.com/blog/feed.xml",
        "description": "Sketch (macOS design tool) blog on product updates, design workflows, collaboration features."
    },
    "framer_blog": {
        "name": "Framer Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "framer.com",
        "url": "https://www.framer.com/blog/",
        "description": "Framer (AI website builder) blog on AI site generation, design-to-publish workflows, CMS features."
    },
    "webflow_blog": {
        "name": "Webflow Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "url": "https://webflow.com/blog/rss.xml",
        "description": "Webflow blog — AI site building, design systems, no-code/low-code brand sites, Webflow AI features."
    },
    "penpot_blog": {
        "name": "Penpot Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "penpot.app",
        "url": "https://penpot.app/blog",
        "description": "Penpot (open-source Figma alternative) blog; design-dev collaboration, open standards, self-host options."
    },
    "miro_blog": {
        "name": "Miro Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "miro.com",
        "url": "https://miro.com/blog/",
        "description": "Miro (collaborative whiteboard) blog — AI ideation, Intelligent Canvas, diagramming, brand-workshop facilitation."
    },
    "invision_alternative_zeplin": {
        "name": "Zeplin Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "blog.zeplin.io",
        "url": "https://blog.zeplin.io/",
        "description": "Zeplin (design-to-dev handoff) blog on design systems, component documentation, handoff workflows."
    },
    "abstract_blog": {
        "name": "Spline Blog (3D design)",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "spline.design",
        "url": "https://spline.design/blog",
        "description": "Spline (3D/interactive design) blog — AI 3D generation, web-embeddable 3D, motion for brand sites."
    },
    "rive_blog": {
        "name": "Rive Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "rive.app",
        "url": "https://rive.app/blog",
        "description": "Rive (interactive animation/motion graphics) blog on real-time animation, state machines, brand motion."
    },
    "lottiefiles_blog": {
        "name": "LottieFiles Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "lottiefiles.com",
        "url": "https://lottiefiles.com/blog",
        "description": "LottieFiles (animation ecosystem) blog on motion design, AI animation, brand micro-interactions."
    },
    "linearapp_blog": {
        "name": "Linear Changelog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "linear.app",
        "url": "https://linear.app/changelog",
        "description": "Linear (product/design workflow) changelog — design-eng collaboration, AI triage. Adjacent to brand/product design ops."
    },
    "notion_blog": {
        "name": "Notion Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "notion.com",
        "url": "https://www.notion.com/blog",
        "description": "Notion blog — AI features, brand wikis, design-doc workflows, Notion AI updates relevant to brand-ops teams."
    },
    "uxpin_blog": {
        "name": "UXPin Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "url": "https://www.uxpin.com/studio/blog/feed/",
        "description": "UXPin (code-backed design) blog on design systems, AI component generation, merge workflows."
    },
    "marq_blog": {
        "name": "Marq (Lucidpress) Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "marq.com",
        "url": "https://www.marq.com/blog",
        "description": "Marq (brand templating / brand management) blog — locked brand templates, brand governance at scale."
    },
    "frontify_blog": {
        "name": "Frontify Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "frontify.com",
        "url": "https://www.frontify.com/en/blog/",
        "description": "Frontify (brand management platform) blog — brand guidelines, DAM, brand-portal governance, AI brand assistants. Core brand-ops source."
    },
    "brandfolder_blog": {
        "name": "Brandfolder Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "brandfolder.com",
        "url": "https://brandfolder.com/resources/",
        "description": "Brandfolder (digital asset management) blog — DAM, brand-asset distribution, AI tagging, brand intelligence."
    },
    "bynder_blog": {
        "name": "Bynder Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "bynder.com",
        "url": "https://www.bynder.com/en/blog/",
        "description": "Bynder (DAM + brand templates) blog on brand consistency, content workflows, AI-powered asset management."
    },
    "recraft_blog": {
        "name": "Recraft Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "recraft.ai",
        "url": "https://www.recraft.ai/blog",
        "description": "Recraft (AI design tool for brand-consistent vector/raster) blog on brand styles, AI illustration, design sets."
    },
    "galileo_ai_blog": {
        "name": "Galileo AI / Stitch (Google) Updates",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "stitch.withgoogle.com",
        "url": "https://stitch.withgoogle.com/",
        "description": "Stitch (Google's AI UI design tool, ex-Galileo AI) — text/image-to-UI generation; updates and capabilities."
    },
    "uizard_blog": {
        "name": "Uizard Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "uizard.io",
        "url": "https://uizard.io/blog/",
        "description": "Uizard (AI UI design, now part of Miro) blog on text-to-UI, wireframe-to-design, AI mockups."
    },
    "relume_blog": {
        "name": "Relume Updates",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "relume.io",
        "url": "https://www.relume.io/",
        "description": "Relume (AI sitemap + wireframe generator for web design) product updates; AI-driven site structure for brand sites."
    },
    "khroma_blog": {
        "name": "Khroma / AI Color Tools",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "khroma.co",
        "url": "https://www.khroma.co/",
        "description": "Khroma (AI color palette generator) — brand-color tooling; track updates to AI palette generation."
    },
    "looka_blog": {
        "name": "Looka Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "looka.com",
        "url": "https://looka.com/blog/",
        "description": "Looka (AI logo + brand-identity generator) blog on logo design, brand kits, small-business branding."
    },
    "brandmark_blog": {
        "name": "Brandmark / LogoAI Updates",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "brandmark.io",
        "url": "https://brandmark.io/",
        "description": "Brandmark (AI logo/brand-identity generator) — AI brand-identity systems including color, type, logo."
    },
    "piktochart_blog": {
        "name": "Piktochart Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "url": "https://piktochart.com/blog/feed/",
        "description": "Piktochart (infographic/visual content) blog — AI infographics, brand-consistent visual reporting."
    },
    "visme_blog": {
        "name": "Visme Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "url": "https://visme.co/blog/feed/",
        "description": "Visme (visual content + brand templates) blog on infographics, presentations, data viz, brand kits."
    },
    "venngage_blog": {
        "name": "Venngage Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "url": "https://venngage.com/blog/feed/",
        "description": "Venngage (infographic/design) blog on visual marketing, brand templates, data storytelling."
    },
    "designcrowd_blog": {
        "name": "99designs by Vista Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "99designs.com",
        "url": "https://99designs.com/blog/",
        "description": "99designs (design marketplace) blog — design trends, logo/brand-identity trends, AI-vs-human design discourse."
    },
    "vista_blog": {
        "name": "VistaPrint / Vista Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "vistaprint.com",
        "url": "https://www.vistaprint.com/hub/",
        "description": "Vista (SMB brand/print) hub — small-business branding, AI logo + marketing-asset generation."
    },
    "designstripe_blog": {
        "name": "Kittl Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "kittl.com",
        "url": "https://www.kittl.com/articles",
        "description": "Kittl (AI-assisted design platform for branding, merch, typography) articles on AI design and brand creation."
    },
    "pixelcut_blog": {
        "name": "Pixelcut / Photoroom Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "photoroom.com",
        "url": "https://www.photoroom.com/blog",
        "description": "Photoroom (AI product photography / background removal) blog — e-commerce brand imagery, batch AI editing; has an API."
    },
    "clipdrop_blog": {
        "name": "Clipdrop (by Jasper) Updates",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "clipdrop.co",
        "url": "https://clipdrop.co/",
        "description": "Clipdrop (AI image editing suite, ex-Stability) — relighting, upscaling, background removal; developer API."
    },
    "jasper_blog": {
        "name": "Jasper AI Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "jasper.ai",
        "url": "https://www.jasper.ai/blog",
        "description": "Jasper (AI marketing/brand content platform) blog — brand voice, marketing copy, AI brand campaigns, agentic marketing."
    },
    "writer_blog": {
        "name": "Writer.com Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "writer.com",
        "url": "https://writer.com/blog/",
        "description": "Writer (enterprise generative-AI for brand-consistent content) blog — brand style guides, AI guardrails, agentic content."
    },
    "typeface_blog": {
        "name": "Typeface Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "typeface.ai",
        "url": "https://www.typeface.ai/blog",
        "description": "Typeface (enterprise brand-personalized generative content) blog on brand kits, AI content at scale, brand hub."
    },
    "descript_blog": {
        "name": "Descript Blog",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "descript.com",
        "url": "https://www.descript.com/blog",
        "description": "Descript (AI video/audio editing) blog — AI video for brand/marketing, transcription-based editing, social clips."
    },
    "canva_affinity": {
        "name": "Affinity by Canva Updates",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "affinity.serif.com",
        "url": "https://affinity.serif.com/en-us/blog/",
        "description": "Affinity (pro design suite, now Canva-owned) blog — Designer/Photo/Publisher updates, free-tier news (Affinity went free in 2025)."
    },
    "adobe_color_trends": {
        "name": "Adobe Color Trends & Adobe Stock Trends",
        "category": "Design & Brand Tool Vendors",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research",
            "saas"
        ],
        "domain": "stock.adobe.com",
        "url": "https://stock.adobe.com/creative-trends",
        "description": "Adobe Stock annual + seasonal Creative Trends reports — color, visual, and brand-aesthetic forecasting for design teams."
    },
    "openai_blog": {
        "name": "OpenAI Blog / News",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://openai.com/news/rss.xml",
        "description": "OpenAI announcements — GPT image generation, DALL-E successors, Sora video, API model releases relevant to creative pipelines."
    },
    "anthropic_news": {
        "name": "Anthropic News",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "anthropic.com",
        "url": "https://www.anthropic.com/news",
        "description": "Anthropic Claude model releases, agentic capabilities (Claude in design tools, Cowork, MCP), research relevant to creative agents."
    },
    "google_deepmind_blog": {
        "name": "Google DeepMind Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://deepmind.google/blog/rss.xml",
        "description": "DeepMind — Imagen, Veo (video), Nano Banana Pro (image), Lyria (music), Gemini multimodal; foundational creative-model research."
    },
    "google_ai_blog": {
        "name": "Google AI / Labs Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://blog.google/technology/ai/rss/",
        "description": "Google AI announcements including Gemini, Imagen, Veo, Stitch (UI gen), Workspace creative AI."
    },
    "meta_ai_blog": {
        "name": "Meta AI Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "ai.meta.com",
        "url": "https://ai.meta.com/blog/",
        "description": "Meta AI — Llama models, Emu image/video gen, Movie Gen, Segment Anything; open-weights creative models."
    },
    "stability_ai_news": {
        "name": "Stability AI News",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "stability.ai",
        "url": "https://stability.ai/news",
        "description": "Stability AI — Stable Diffusion successors, Stable Video, Stable Audio; widely used open creative models with API."
    },
    "midjourney_updates": {
        "name": "Midjourney Updates / Release Notes",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "docs.midjourney.com",
        "url": "https://docs.midjourney.com/docs/release-notes",
        "description": "Midjourney release notes — version releases (V7+), style references, character consistency, web app, video. Premier aesthetic image model."
    },
    "blackforest_flux": {
        "name": "Black Forest Labs (FLUX) Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "blackforestlabs.ai",
        "url": "https://blackforestlabs.ai/",
        "description": "Black Forest Labs — FLUX image models (now integrated into Adobe, Canva, others); open + API. Major 2026 creative-model player."
    },
    "runway_blog": {
        "name": "Runway Research & Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "runwayml.com",
        "url": "https://runwayml.com/research",
        "description": "Runway — Gen-4 video/image models, Act-One, video-to-video; leading AI video for brand/creative. Has developer API."
    },
    "pika_blog": {
        "name": "Pika Labs Updates",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "pika.art",
        "url": "https://pika.art/",
        "description": "Pika (AI video generation) — Pikaframes, Pikaffects; consumer-friendly AI video for social/brand content."
    },
    "luma_blog": {
        "name": "Luma AI (Dream Machine) News",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "lumalabs.ai",
        "url": "https://lumalabs.ai/news",
        "description": "Luma Labs — Dream Machine (video), Ray models, Photon (image); 3D + video gen with API."
    },
    "kling_updates": {
        "name": "Kling AI Updates",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "klingai.com",
        "url": "https://klingai.com/",
        "description": "Kling AI (Kuaishou) — leading AI video model with strong motion/physics; widely used in 2026 creative work. API via providers."
    },
    "ideogram_blog": {
        "name": "Ideogram Updates",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "about.ideogram.ai",
        "url": "https://about.ideogram.ai/",
        "description": "Ideogram — image model strong at typography/text-in-image (key for brand/logo work); Canvas, magic fill. Has API."
    },
    "leonardo_blog": {
        "name": "Leonardo.Ai Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "leonardo.ai",
        "url": "https://leonardo.ai/news/",
        "description": "Leonardo.Ai (Canva-owned) — image gen with brand/asset fine-tuning, real-time canvas; production API."
    },
    "krea_blog": {
        "name": "Krea AI Updates",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "krea.ai",
        "url": "https://www.krea.ai/",
        "description": "Krea AI — real-time image/video generation, enhancement, training; popular with designers for live ideation."
    },
    "freepik_ai": {
        "name": "Freepik AI Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "freepik.com",
        "url": "https://www.freepik.com/blog/",
        "description": "Freepik (stock + AI suite aggregating Flux, Mystic, Google models) blog; AI image/video for brand/marketing assets. Has API."
    },
    "fal_ai_blog": {
        "name": "fal.ai Blog & Model Gallery",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "fal.ai",
        "url": "https://fal.ai/models",
        "description": "fal.ai — inference platform hosting FLUX, Kling, Veo, and dozens of creative models with unified API; model gallery shows new releases."
    },
    "replicate_blog": {
        "name": "Replicate Blog & Explore",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "replicate.com",
        "url": "https://replicate.com/explore",
        "description": "Replicate — run thousands of open creative models (image, video, audio, upscaling) via one API; Explore page surfaces trending models."
    },
    "huggingface_blog": {
        "name": "Hugging Face Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://huggingface.co/blog/feed.xml",
        "description": "Hugging Face blog — new open model releases, diffusion/image/video/audio model launches, Spaces demos. Central hub for open creative models."
    },
    "huggingface_papers": {
        "name": "Hugging Face Daily Papers",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "huggingface.co",
        "url": "https://huggingface.co/papers",
        "description": "Curated daily AI papers (heavily multimodal/generative); community-voted. Strong early signal on new creative-model techniques."
    },
    "huggingface_models_api": {
        "name": "Hugging Face Models API",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rest",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://huggingface.co/api/models",
        "description": "Programmatic listing of models filterable by task (text-to-image, image-to-video, text-to-audio), sortable by trending/downloads/date. Ideal for auto-detecting new creative models."
    },
    "civitai_api": {
        "name": "Civitai API (models)",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rest",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://developer.civitai.com/docs/api/public-rest",
        "description": "Civitai — largest community hub for Stable Diffusion / FLUX checkpoints, LoRAs, styles; API surfaces trending creative models and brand-style fine-tunes."
    },
    "elevenlabs_blog": {
        "name": "ElevenLabs Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "elevenlabs.io",
        "url": "https://elevenlabs.io/blog",
        "description": "ElevenLabs — AI voice/audio generation, dubbing, sound effects, music; key for brand audio/video. Robust API."
    },
    "suno_blog": {
        "name": "Suno Updates",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "suno.com",
        "url": "https://suno.com/blog",
        "description": "Suno (AI music generation) — brand jingles, sonic branding, social-content music. Updates and model versions."
    },
    "udio_updates": {
        "name": "Udio Updates",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "udio.com",
        "url": "https://www.udio.com/",
        "description": "Udio (AI music generation) — competitor to Suno; relevant for brand audio and creative soundtracks."
    },
    "mistral_news": {
        "name": "Mistral AI News",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "mistral.ai",
        "url": "https://mistral.ai/news/",
        "description": "Mistral AI — open + commercial LLMs used in agentic creative pipelines; Le Chat, multimodal updates."
    },
    "cohere_blog": {
        "name": "Cohere Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "cohere.com",
        "url": "https://cohere.com/blog",
        "description": "Cohere — enterprise LLMs/embeddings for brand-content generation and semantic search in creative pipelines."
    },
    "xai_news": {
        "name": "xAI News",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "x.ai",
        "url": "https://x.ai/news",
        "description": "xAI — Grok models including Grok image generation (Aurora); multimodal updates relevant to creative use."
    },
    "nvidia_ai_blog": {
        "name": "NVIDIA AI / Research Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://blogs.nvidia.com/feed/",
        "description": "NVIDIA — generative-AI research (Edify, Picasso, Omniverse), creative/3D model tooling, GPU-side creative AI."
    },
    "replicate_changelog": {
        "name": "Replicate Changelog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "replicate.com",
        "url": "https://replicate.com/changelog",
        "description": "Replicate platform changelog — new API features, model-deployment capabilities for creative pipelines."
    },
    "together_blog": {
        "name": "Together AI Blog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "together.ai",
        "url": "https://www.together.ai/blog",
        "description": "Together AI — inference platform hosting open image/video/LLM models; cost-efficient creative-model serving."
    },
    "openrouter_models": {
        "name": "OpenRouter Models",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rest",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://openrouter.ai/api/v1/models",
        "description": "OpenRouter — unified API across hundreds of LLMs (incl. multimodal); /models endpoint surfaces newly added models and pricing."
    },
    "google_aistudio": {
        "name": "Google AI Studio / Gemini API Updates",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "ai.google.dev",
        "url": "https://ai.google.dev/gemini-api/docs/changelog",
        "description": "Gemini API changelog — multimodal (image/video understanding + generation), Imagen/Veo API access, Nano Banana via API."
    },
    "openai_changelog": {
        "name": "OpenAI API Changelog",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "platform.openai.com",
        "url": "https://platform.openai.com/docs/changelog",
        "description": "OpenAI platform changelog — new image-gen endpoints (gpt-image), Sora API, model deprecations relevant to creative pipelines."
    },
    "anthropic_api_news": {
        "name": "Anthropic API / Engineering",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "anthropic.com",
        "url": "https://www.anthropic.com/engineering",
        "description": "Anthropic engineering posts on agentic patterns, MCP, tool use — directly relevant to building creative-AI agent pipelines."
    },
    "replicate_image_models": {
        "name": "Replicate Collections: Image/Video Models",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "replicate.com",
        "url": "https://replicate.com/collections",
        "description": "Replicate curated collections (text-to-image, image-to-video, upscaling, restoration) — fast way to find production-ready creative models."
    },
    "papers_with_code": {
        "name": "Papers with Code — Image/Video Generation",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "paperswithcode.com",
        "url": "https://paperswithcode.com/task/image-generation",
        "description": "Papers with Code task pages for image/video/audio generation — SoTA leaderboards and new-method tracking with code links."
    },
    "arxiv_cv": {
        "name": "arXiv cs.CV (Computer Vision / Generative)",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://arxiv.org/rss/cs.CV",
        "description": "arXiv computer-vision feed — bulk of new diffusion/image/video/3D-generation research preprints. Earliest signal on creative-model techniques."
    },
    "arxiv_gr": {
        "name": "arXiv cs.GR (Graphics)",
        "category": "Generative AI Model Labs & Platforms",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://arxiv.org/rss/cs.GR",
        "description": "arXiv graphics feed — 3D generation, neural rendering, procedural/brand-asset generation research."
    },
    "tencent_hunyuan": {
        "name": "Tencent Hunyuan (image/video/3D models)",
        "category": "Generative AI Model Labs & Platforms",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "hunyuan.tencent.com",
        "url": "https://hunyuan.tencent.com/",
        "description": "Tencent Hunyuan — open image, video, and 3D generation models (HunyuanVideo, Hunyuan3D) widely used in 2026 creative pipelines; weights on Hugging Face."
    },
    "creative_bloq": {
        "name": "Creative Bloq",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.creativebloq.com/feeds/all",
        "description": "Creative Bloq — design/art/tech news; heavy 2026 AI-in-design coverage (Adobe, Figma, branding). Verified Jan 2026 content."
    },
    "its_nice_that": {
        "name": "It's Nice That",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.itsnicethat.com/articles.rss",
        "description": "It's Nice That — creative-industry editorial on graphic design, branding, illustration, and AI's role in creative practice."
    },
    "design_week": {
        "name": "Design Week",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.designweek.co.uk/feed/",
        "description": "Design Week (UK) — branding, identity, design-industry business news; rebrand case studies and AI-in-branding."
    },
    "dezeen": {
        "name": "Dezeen",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.dezeen.com/feed/",
        "description": "Dezeen — architecture/design magazine; design-tech, AI tools, brand/product design coverage."
    },
    "core77": {
        "name": "Core77",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.core77.com/feed",
        "description": "Core77 — industrial/product design news including AI design tools and design-process commentary."
    },
    "the_brand_identity": {
        "name": "The Brand Identity",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "the-brandidentity.com",
        "url": "https://the-brandidentity.com/",
        "description": "The Brand Identity — daily branding/visual-identity showcase and interviews; core brand-design trend source."
    },
    "brand_new_underconsideration": {
        "name": "Brand New (UnderConsideration)",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.underconsideration.com/brandnew/feed.php",
        "description": "Brand New — the definitive blog reviewing corporate/brand identity redesigns; gold standard for rebrand analysis."
    },
    "logo_design_love": {
        "name": "Logo Design Love",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.logodesignlove.com/feed",
        "description": "David Airey's Logo Design Love — logo/brand-identity craft, case studies, branding books."
    },
    "creative_review": {
        "name": "Creative Review",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "creativereview.co.uk",
        "url": "https://www.creativereview.co.uk/",
        "description": "Creative Review — advertising/branding/design criticism; free article surface plus campaign analysis."
    },
    "design_milk": {
        "name": "Design Milk",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://design-milk.com/feed/",
        "description": "Design Milk — design/lifestyle coverage including AI tools, digital design, brand collaborations."
    },
    "abduzeedo": {
        "name": "Abduzeedo",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://abduzeedo.com/rss.xml",
        "description": "Abduzeedo — design inspiration, tutorials, AI design experiments, branding showcases."
    },
    "smashing_magazine": {
        "name": "Smashing Magazine",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.smashingmagazine.com/feed/",
        "description": "Smashing Magazine — web design/UX/front-end; AI design tooling, design systems, accessibility."
    },
    "uxdesign_cc": {
        "name": "UX Collective (uxdesign.cc)",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://uxdesign.cc/feed",
        "description": "UX Collective — one of the largest design publications; AI-in-design, design ops, product/brand design essays."
    },
    "nielsen_norman": {
        "name": "Nielsen Norman Group",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.nngroup.com/feed/rss/",
        "description": "NN/g — UX research authority; AI-UX research, generative-AI usability, design-process evidence."
    },
    "uxmatters": {
        "name": "UXmatters",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.uxmatters.com/index.xml",
        "description": "UXmatters — UX strategy/practice articles including AI tooling and design-process commentary."
    },
    "prototypr": {
        "name": "Prototypr",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://prototypr.io/feed/",
        "description": "Prototypr — design/AI tool reviews, prototyping, design-tech experiments."
    },
    "designmodo": {
        "name": "Designmodo",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://designmodo.com/feed/",
        "description": "Designmodo — web/email design, design tools, AI design coverage."
    },
    "creative_boom": {
        "name": "Creative Boom",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.creativeboom.com/feed/",
        "description": "Creative Boom — creative-industry news for designers/illustrators; branding, freelance, AI's impact on creative careers."
    },
    "eye_on_design": {
        "name": "AIGA Eye on Design",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://eyeondesign.aiga.org/feed/",
        "description": "AIGA Eye on Design — graphic-design culture/criticism from the professional design association; AI/branding discourse."
    },
    "print_mag": {
        "name": "PRINT Magazine",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.printmag.com/feed/",
        "description": "PRINT — graphic-design criticism, branding, typography, design history and AI commentary."
    },
    "typewolf": {
        "name": "Typewolf",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "typewolf.com",
        "url": "https://www.typewolf.com/",
        "description": "Typewolf — typography trends and font-in-the-wild; essential for brand-typography research."
    },
    "fonts_in_use": {
        "name": "Fonts In Use",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://fontsinuse.com/feed",
        "description": "Fonts In Use — typography case studies across brands/media; type-and-branding reference."
    },
    "the_dieline": {
        "name": "The Dieline",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://thedieline.com/blog?format=rss",
        "description": "The Dieline — packaging design and brand-packaging trends; major source for CPG/brand-identity work."
    },
    "trendhunter_design": {
        "name": "Trend Hunter — Design",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.trendhunter.com/rss/category/Design-Trends",
        "description": "Trend Hunter design category — high-volume trend spotting across branding, packaging, marketing creative."
    },
    "adweek_creativity": {
        "name": "Adweek — Creativity & Agencies (free)",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "adweek.com",
        "url": "https://www.adweek.com/category/creativity/",
        "description": "Adweek creativity vertical — ad campaigns, brand creative, AI-in-advertising. Free article surface (metered for some)."
    },
    "the_drum_design": {
        "name": "The Drum — Design & Creative",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "thedrum.com",
        "url": "https://www.thedrum.com/topics/design",
        "description": "The Drum design/creative topic — agency creative, brand campaigns, AI-in-marketing-creative coverage."
    },
    "muse_by_clio": {
        "name": "Muse by Clio",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "musebyclio.com",
        "url": "https://musebyclio.com/",
        "description": "Muse by Clio — advertising creativity, campaign craft, brand storytelling, AI in ad creative."
    },
    "lbb_online": {
        "name": "Little Black Book (LBBOnline)",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "lbbonline.com",
        "url": "https://lbbonline.com/news",
        "description": "LBBOnline — advertising/production-industry news, creative campaigns, AI in commercial creative."
    },
    "toolfinder": {
        "name": "Toolfinder (design/AI tools)",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "toolfinder.co",
        "url": "https://toolfinder.co/",
        "description": "Toolfinder — curated design/productivity/AI tool directory; tracks new creative tools."
    },
    "futuretools": {
        "name": "Futurepedia / There's An AI For That",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "theresanaiforthat.com",
        "url": "https://theresanaiforthat.com/",
        "description": "There's An AI For That — large AI-tool directory; surfaces new creative/brand AI tools daily."
    },
    "bens_bites": {
        "name": "Ben's Bites Newsletter",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "bensbites.com",
        "url": "https://bensbites.com/",
        "description": "Ben's Bites — widely read daily AI newsletter; strong coverage of new creative/generative tools and model releases."
    },
    "rundown_ai": {
        "name": "The Rundown AI",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "therundown.ai",
        "url": "https://www.therundown.ai/",
        "description": "The Rundown AI — daily AI newsletter with frequent creative-tool and image/video-model coverage."
    },
    "superhuman_ai": {
        "name": "Superhuman AI Newsletter",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "superhuman.ai",
        "url": "https://www.superhuman.ai/",
        "description": "Superhuman — daily AI newsletter; practical tool tutorials including creative/design AI workflows."
    },
    "heydesigner": {
        "name": "Heydesigner",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "heydesigner.com",
        "url": "https://heydesigner.com/",
        "description": "Heydesigner — curated design-and-tech reading list; aggregates top design/AI articles daily."
    },
    "sidebar_io": {
        "name": "Sidebar.io",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://sidebar.io/feed.xml",
        "description": "Sidebar — 5 daily curated design links; high signal-to-noise design/AI reading."
    },
    "designernews": {
        "name": "Designer News",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "designernews.co",
        "url": "https://www.designernews.co/",
        "description": "Designer News — community link-sharing for designers; surfaces tool launches and design discourse."
    },
    "creativepro": {
        "name": "CreativePro",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://creativepro.com/feed/",
        "description": "CreativePro — InDesign/Photoshop/Illustrator pro techniques, publishing design, Adobe ecosystem tips."
    },
    "designtaxi": {
        "name": "DesignTAXI",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://designtaxi.com/feed/",
        "description": "DesignTAXI — design/advertising/pop-culture creative news; AI-in-creative and brand-campaign coverage."
    },
    "awwwards_blog": {
        "name": "Awwwards Blog",
        "category": "Creative Trade Press, Newsletters & Blogs",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "domain": "awwwards.com",
        "url": "https://www.awwwards.com/blog/",
        "description": "Awwwards — web-design awards blog; cutting-edge brand-site design, trends, AI web tooling."
    },
    "figma_reports": {
        "name": "Figma Reports (AI, Design Trends)",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "figma.com",
        "url": "https://www.figma.com/reports/",
        "description": "Figma's free research reports — AI report, Design Systems report, State of Design; annual deep data on design-team practices."
    },
    "canva_design_report": {
        "name": "Canva Visual Economy / Design Reports",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "canva.com",
        "url": "https://www.canva.com/newsroom/news/",
        "description": "Canva's free Visual Economy Report, AI in Marketing report, and design-trend research for brand/marketing teams."
    },
    "adobe_creative_trends": {
        "name": "Adobe Creative Trends Report",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "adobe.com",
        "url": "https://www.adobe.com/express/learn/blog/creative-trends",
        "description": "Adobe's annual Creative Trends and Stock Trends reports — color/visual/aesthetic forecasting backed by usage data."
    },
    "adobe_state_of_creativity": {
        "name": "Adobe Future of Creativity / State of Creativity",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "adobe.com",
        "url": "https://www.adobe.com/about-adobe/research.html",
        "description": "Adobe research studies on creativity, AI adoption among creators, creator economy data."
    },
    "deloitte_digital_media": {
        "name": "Deloitte Digital Media Trends",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "www2.deloitte.com",
        "url": "https://www2.deloitte.com/us/en/insights/industry/technology/digital-media-trends-consumption-habits-survey.html",
        "description": "Deloitte Digital Media Trends — annual consumer-media survey; brand/content consumption and gen-AI attitudes."
    },
    "mckinsey_creativity": {
        "name": "McKinsey on Marketing & Creativity (gen AI)",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "mckinsey.com",
        "url": "https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights",
        "description": "McKinsey Growth/Marketing insights — gen-AI in marketing creative, brand-content ROI, personalization at scale."
    },
    "wordstream_data": {
        "name": "LocaliQ / WordStream Benchmarks",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "localiq.com",
        "url": "https://localiq.com/blog/",
        "description": "Free advertising/creative benchmark data (CTR, CPC by industry) useful for brand-campaign performance context."
    },
    "hubspot_research": {
        "name": "HubSpot Research & State of Marketing",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "hubspot.com",
        "url": "https://www.hubspot.com/state-of-marketing",
        "description": "HubSpot State of Marketing report — AI design/content adoption, brand-content trends, marketer survey data."
    },
    "a16z_blog": {
        "name": "a16z (Andreessen Horowitz) — Consumer/AI",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://a16z.com/feed/",
        "description": "a16z analysis on generative-AI consumer apps, creative-AI market maps, Top 100 Gen AI Consumer Apps report."
    },
    "cbinsights_blog": {
        "name": "CB Insights Research (free briefs)",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "cbinsights.com",
        "url": "https://www.cbinsights.com/research/",
        "description": "CB Insights free research briefs — gen-AI market maps, creative-AI startup landscapes, funding trends."
    },
    "stanford_hai": {
        "name": "Stanford HAI — AI Index",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "hai.stanford.edu",
        "url": "https://hai.stanford.edu/research",
        "description": "Stanford HAI AI Index Report (annual) — authoritative free data on AI capability/adoption incl. image/video generation benchmarks."
    },
    "artificial_analysis": {
        "name": "Artificial Analysis (model benchmarks)",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "artificialanalysis.ai",
        "url": "https://artificialanalysis.ai/",
        "description": "Artificial Analysis — independent benchmarks of image/video/text models (quality, speed, price). Best free model-comparison data for tool selection."
    },
    "lmarena_image": {
        "name": "LMArena (Image/Video Arena)",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "lmarena.ai",
        "url": "https://lmarena.ai/",
        "description": "LMArena — crowd-sourced ELO leaderboards for image/video generation models (Text-to-Image Arena). Key for objective model ranking."
    },
    "epoch_ai": {
        "name": "Epoch AI",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "epoch.ai",
        "url": "https://epoch.ai/",
        "description": "Epoch AI — data/analysis on AI model scaling, compute, capability trends; context for creative-model trajectory."
    },
    "state_of_ai_report": {
        "name": "State of AI Report (Air Street)",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "stateof.ai",
        "url": "https://www.stateof.ai/",
        "description": "Nathan Benaich's annual State of AI Report — comprehensive free deck covering generative/creative AI advances and commercial adoption."
    },
    "wef_creative_ai": {
        "name": "World Economic Forum — AI & Creative Economy",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "weforum.org",
        "url": "https://www.weforum.org/stories/artificial-intelligence/",
        "description": "WEF stories/reports on AI's impact on creative industries, jobs, and the brand/marketing economy."
    },
    "nngroup_reports": {
        "name": "Nielsen Norman Group — Free Reports",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "nngroup.com",
        "url": "https://www.nngroup.com/reports/",
        "description": "NN/g free UX research reports including AI-UX guidelines and generative-UI usability studies."
    },
    "ramp_ai_index": {
        "name": "Ramp AI Index (spend data)",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "ramp.com",
        "url": "https://ramp.com/ai-index",
        "description": "Ramp AI Index — anonymized corporate-spend data on which AI tools businesses actually pay for (incl. creative tools). Adoption-signal gold."
    },
    "menlo_ventures_ai": {
        "name": "Menlo Ventures — State of Generative AI in Enterprise",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "menlovc.com",
        "url": "https://menlovc.com/perspective/",
        "description": "Menlo Ventures research on enterprise gen-AI adoption including creative/marketing tool spend and category leaders."
    },
    "sequoia_ai": {
        "name": "Sequoia Capital — AI Essays",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "sequoiacap.com",
        "url": "https://www.sequoiacap.com/article/",
        "description": "Sequoia essays/market maps on generative AI, creative-tool categories, and the AI app landscape."
    },
    "andreessen_marketplace": {
        "name": "Lenny's Newsletter (product/design free posts)",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "lennysnewsletter.com",
        "url": "https://www.lennysnewsletter.com/archive",
        "description": "Lenny's Newsletter — product/design/growth essays; free posts cover AI design tools and creative-product workflows."
    },
    "contagious": {
        "name": "Contagious (free articles)",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "contagious.com",
        "url": "https://www.contagious.com/",
        "description": "Contagious — brand/marketing creativity intelligence; free article surface on award-winning campaigns and AI creative."
    },
    "warc_free": {
        "name": "WARC — Free Insights",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "warc.com",
        "url": "https://www.warc.com/content/feed/",
        "description": "WARC free marketing-effectiveness and brand-creative insights; free briefings on AI in advertising."
    },
    "thoughtworks_radar": {
        "name": "Thoughtworks Technology Radar",
        "category": "Free Ebooks, Reports, Research & Whitepapers",
        "type": "html_scrape",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "domain": "thoughtworks.com",
        "url": "https://www.thoughtworks.com/radar",
        "description": "Thoughtworks Technology Radar — biannual free assessment of tools/techniques including gen-AI and design tooling adoption guidance."
    },
    "yt_figma": {
        "name": "Figma (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=Figmadesign",
        "description": "Figma's official channel — Config talks, feature tutorials, AI-on-canvas demos, design-systems content."
    },
    "yt_adobe_cc": {
        "name": "Adobe Creative Cloud (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=AdobeCreativeCloud",
        "description": "Adobe Creative Cloud — Firefly demos, Photoshop/Illustrator AI tutorials, MAX keynote content."
    },
    "yt_canva": {
        "name": "Canva (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=canva",
        "description": "Canva official — Magic Studio tutorials, Canva Create keynotes, brand-kit and AI feature walkthroughs."
    },
    "yt_mds": {
        "name": "The Futur (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=TheSkoolNetwork",
        "description": "The Futur (Chris Do) — branding, design business, brand strategy, AI's impact on the design industry. Resolve correct channel_id."
    },
    "yt_flux_academy": {
        "name": "Flux Academy (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=FluxWithRanSegall",
        "description": "Flux Academy (Ran Segall) — web design, brand design, design-business, AI-design-workflow content."
    },
    "yt_aiadvantage": {
        "name": "The AI Advantage (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=TheAIAdvantage",
        "description": "The AI Advantage (Igor Pogany) — weekly AI-tool roundups with heavy creative/image/video model coverage and practical workflows."
    },
    "yt_mreflow": {
        "name": "Matt Wolfe (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=mreflow",
        "description": "Matt Wolfe — high-volume AI-news and creative-tool coverage (image/video gen, design tools); runs Futurepedia."
    },
    "yt_futurepedia": {
        "name": "Futurepedia (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=Futurepedia",
        "description": "Futurepedia — AI-tool tutorials and reviews, frequently covering creative/design/brand AI tools."
    },
    "yt_theoreticallymedia": {
        "name": "Theoretically Media (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=theoreticallymedia",
        "description": "Theoretically Media — deep, current coverage of AI video/image models (Runway, Kling, Veo, Sora, Luma) for creative pros."
    },
    "yt_curious_refuge": {
        "name": "Curious Refuge (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=curiousrefuge",
        "description": "Curious Refuge — AI filmmaking and creative-AI workflows; brand-film and ad use cases."
    },
    "yt_mattvidpro": {
        "name": "MattVidPro AI (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=MattVidPro",
        "description": "MattVidPro AI — creative-AI tool reviews across image/video/audio gen with hands-on testing."
    },
    "yt_designcourse": {
        "name": "DesignCourse (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=DesignCourse",
        "description": "DesignCourse (Gary Simon) — UI/UX, web design, AI design tooling tutorials."
    },
    "yt_charliemarie": {
        "name": "CharliMarieTV (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=CharliMarieTV",
        "description": "CharliMarieTV — brand/product design, design-career, design-workflow content."
    },
    "yt_punkt": {
        "name": "Punkt (Michael Janda / design biz)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=morganjanda",
        "description": "Design-business and brand-strategy content for agencies/freelancers; AI's effect on design pricing/process."
    },
    "yt_aexplained": {
        "name": "AI Explained (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=aiexplained-official",
        "description": "AI Explained — rigorous analysis of frontier model releases incl. multimodal/creative capabilities and benchmarks."
    },
    "yt_twominpapers": {
        "name": "Two Minute Papers (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=keeroyz",
        "description": "Two Minute Papers — accessible breakdowns of new generative-graphics/image/video research papers."
    },
    "yt_pixelandbracket": {
        "name": "Pixel & Bracket (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=pixelandbracket",
        "description": "Pixel & Bracket — branding, logo design, brand-identity tutorials and design-tool walkthroughs."
    },
    "yt_satori_graphics": {
        "name": "Satori Graphics (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=SatoriGraphics1",
        "description": "Satori Graphics — graphic-design and branding tutorials, design-trend commentary including AI tools."
    },
    "yt_will_paterson": {
        "name": "Will Paterson (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=WillPattersonDesign",
        "description": "Will Paterson — logo/brand-identity design, freelance design business, AI-in-logo-design takes."
    },
    "yt_mango_street": {
        "name": "Mango Street / creative photo-video",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=theMangoStreet",
        "description": "Mango Street — photography/video for brand content; AI-assisted editing and visual-content workflows."
    },
    "yt_promptingpixels": {
        "name": "Prompt Engineering / creative-AI channels",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=engineerprompt",
        "description": "Prompt-engineering channel covering generative-model prompting incl. image/video model techniques."
    },
    "yt_wade_mcmaster": {
        "name": "Wade McMaster — Creator Impact (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=WadeMcMasterAwesome",
        "description": "Creator Impact — Canva and AI-design tutorials for brand/content creators."
    },
    "yt_gfx_mentor": {
        "name": "Design/AI tutorial channel (GFX Mentor)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=GFXMentorOfficial",
        "description": "GFX Mentor — graphic-design and Adobe-tool tutorials including AI features."
    },
    "yt_kevin_stratvert": {
        "name": "Kevin Stratvert (YouTube)",
        "category": "YouTube Channels",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "media",
            "ai_research"
        ],
        "url": "https://www.youtube.com/feeds/videos.xml?user=KevinStratvert",
        "description": "Kevin Stratvert — accessible tutorials on AI/productivity/creative tools (Canva, Firefly, Copilot) for business users."
    },
    "reddit_graphic_design": {
        "name": "r/graphic_design",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/graphic_design/.rss",
        "description": "~3M members. Professional graphic-design community; AI-tool debates, branding critique, industry trends."
    },
    "reddit_design": {
        "name": "r/Design",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/Design/.rss",
        "description": "~900k members. Broad design discussion across disciplines including brand and digital design."
    },
    "reddit_userexperience": {
        "name": "r/userexperience",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/userexperience/.rss",
        "description": "~200k members. UX practice; AI-UX, design-tool workflows, research methods."
    },
    "reddit_uxdesign": {
        "name": "r/UXDesign",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/UXDesign/.rss",
        "description": "~250k members. UX/product design; heavy discussion of Figma AI, design-tool shifts, AI's career impact."
    },
    "reddit_figma": {
        "name": "r/FigmaDesign",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/FigmaDesign/.rss",
        "description": "Figma-specific community; feature reactions, plugin/AI-feature discussion, workflow tips."
    },
    "reddit_adobe": {
        "name": "r/Adobe",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/Adobe/.rss",
        "description": "Adobe ecosystem community; Firefly/Creative Cloud feedback, pricing reactions, AI feature discussion."
    },
    "reddit_photoshop": {
        "name": "r/photoshop",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/photoshop/.rss",
        "description": "~800k members. Photoshop techniques incl. Generative Fill/AI editing; brand-imagery workflows."
    },
    "reddit_canva": {
        "name": "r/canva",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/canva/.rss",
        "description": "Canva-user community; Magic Studio reactions, brand-kit workflows, template/AI feature discussion."
    },
    "reddit_logodesign": {
        "name": "r/logodesign",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/logodesign/.rss",
        "description": "~180k members. Logo/brand-identity critique and process; AI-logo-tool debates."
    },
    "reddit_branding": {
        "name": "r/branding",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/branding/.rss",
        "description": "Brand-strategy and identity discussion; positioning, brand systems, AI in branding."
    },
    "reddit_stablediffusion": {
        "name": "r/StableDiffusion",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/StableDiffusion/.rss",
        "description": "~750k members. The hub for open image-gen models (SD, FLUX), LoRAs, ComfyUI workflows; earliest signal on new techniques."
    },
    "reddit_midjourney": {
        "name": "r/midjourney",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/midjourney/.rss",
        "description": "~1.8M members. Midjourney prompts, version reactions, style techniques; large aesthetic-trend signal."
    },
    "reddit_comfyui": {
        "name": "r/comfyui",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 1,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/comfyui/.rss",
        "description": "ComfyUI node-based gen-AI workflows; cutting-edge image/video pipeline techniques for production creative work."
    },
    "reddit_aivideo": {
        "name": "r/aivideo",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/aivideo/.rss",
        "description": "AI video generation community; Runway/Kling/Veo/Sora outputs, techniques, model comparisons."
    },
    "reddit_generative": {
        "name": "r/generative",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/generative/.rss",
        "description": "Generative/algorithmic art community; creative-coding and AI-art intersection."
    },
    "reddit_aiart": {
        "name": "r/aiArt",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/aiArt/.rss",
        "description": "AI-art showcase community; broad signal on consumer image-gen aesthetics and tools."
    },
    "reddit_artificial": {
        "name": "r/artificial",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/artificial/.rss",
        "description": "~1M members. General AI news/discussion; frequent creative-model release threads."
    },
    "reddit_singularity": {
        "name": "r/singularity",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/singularity/.rss",
        "description": "~3.5M members. Fast-moving AI-news community; early aggregation of model/tool releases incl. creative."
    },
    "reddit_localllama": {
        "name": "r/LocalLLaMA",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 2,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/LocalLLaMA/.rss",
        "description": "~500k members. Open-model community; spillover into open image/video/audio models and local creative pipelines."
    },
    "reddit_web_design": {
        "name": "r/web_design",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/web_design/.rss",
        "description": "~800k members. Web design practice; AI site builders (Framer, Webflow AI), brand-site trends."
    },
    "reddit_marketing": {
        "name": "r/Marketing",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/marketing/.rss",
        "description": "~1.4M members. Marketing practice incl. brand-creative tooling and AI-content adoption."
    },
    "reddit_advertising": {
        "name": "r/advertising",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/advertising/.rss",
        "description": "~200k members. Ad-industry discussion; creative production, AI-in-ad-creative debates."
    },
    "reddit_motiondesign": {
        "name": "r/MotionDesign",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/MotionDesign/.rss",
        "description": "Motion-graphics community; After Effects, AI motion tools, brand-animation workflows."
    },
    "reddit_blender": {
        "name": "r/blender",
        "category": "Reddit Communities",
        "type": "rss",
        "tier": 3,
        "pack": "creative_ai",
        "industries": [
            "ai_research"
        ],
        "url": "https://www.reddit.com/r/blender/.rss",
        "description": "~1.4M members. 3D community; AI-assisted 3D, brand-3D-asset creation, generative texture/geo tools."
    }
}
