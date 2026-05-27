# NotebookLM Reverse-Engineering Technical Specification
**Prepared for:** Jonathan Lupo, Founder, NXT Humans — "Humans in Control" research application
**Target stack:** Claude Code + Anthropic Claude API + Microsoft Copilot Studio + Power Automate + SharePoint + Microsoft Teams
**Cutoff:** May 2026. NotebookLM is officially built on Gemini 3 as of December 2025; Audio Overviews ride on Gemini 2.5 native audio; Cinematic Video Overviews use a Gemini 3 + Nano Banana Pro + Veo 3 stack (March 4, 2026).

---

## TL;DR
- **NotebookLM is a hybrid long-context + retrieval ("source-grounding") application layer on top of Gemini**, with five output surfaces (Chat, Audio Overview, Video Overview, Mind Map, Structured Docs) plus an agentic Deep Research front-end. The "magic" is not a single model — it is a multi-step, multi-agent pipeline (outline → script → critique → revise → render) wrapped in strict source-grounded prompts and inline citation tooling.
- **You can replicate ~85% of NotebookLM's capabilities on the Claude + Microsoft 365 stack.** Use Claude Sonnet 4.5 as the long-context grounded synthesizer, Haiku 4.5 for cheap chunk-level extraction/ranking, Voyage-3 for embeddings, Azure AI Search as the store, ElevenLabs or Azure Speech for multi-speaker TTS, Power Automate as the long-running-job orchestrator, Copilot Studio as the user surface, and a strict citation contract enforced at the prompt + post-processing layer.
- **Three things are NotebookLM-specific and hard to copy 1:1:** Gemini 2.5/3 native multi-speaker dialogue TTS (the "Deep Dive" voice quality), Google's finely-tuned conversational style with natively-rendered disfluencies, and Veo 3 cinematic animation. **Don't try to clone the voices** — design Jonathan's product around a different sonic signature (e.g., single expert host + interview-style guest), and lean on provenance, consent, and audit as the durable moat.

---

## 1. Executive Summary & Product Philosophy

NotebookLM began as **Project Tailwind**, demonstrated by Josh Woodward at Google I/O in May 2023. The Google Labs team: Raiza Martin (product lead), Jason Spielman (design lead), Usama Bin Shafqat (AI engineer behind the audio pipeline), and **Steven Johnson** — the New York Times bestselling science author — as editorial director and de-facto product muse. The first prototype was built in six weeks by four to five engineers working part-time (Steven Johnson, Google blog "How Google developed and tested NotebookLM"). The original framing, which still drives the product, is Johnson's phrase **"source-grounded AI"**: a tool where the user defines a closed corpus of trusted documents, and every model output must be defensible against that corpus.

Three principles separate NotebookLM from a generic chat-over-docs RAG demo:

1. **Source-grounding is non-negotiable.** Every chat response carries numbered inline citations linking to the exact passage. If a query cannot be answered from sources, the model is supposed to refuse. The independent evaluation by Hagar et al. (arXiv:2509.25498, "Not Wrong, But Untrue: LLM Overconfidence in Document-Based Queries," Computation + Journalism Symposium 2025, Miami, Dec 11–12) found: *"Across our sample, 30% of model outputs contained at least one hallucination, with rates approximately three times higher for Gemini and ChatGPT (40%) than for NotebookLM (13%)"* — a ~3× reduction in hallucination directly attributable to the grounding architecture.
2. **The "newly magical and the actually useful" intersection** — Steven Johnson's stated design rule. Audio Overviews are the canonical example: a feature that feels like magic (two AI hosts having a real podcast about your PDF) but is genuinely useful (a 10-minute listenable digest of dense material).
3. **Less is more, embrace non-determinism.** Raiza Martin on the Latent Space podcast (Oct 25, 2024): the first version of Audio Overviews had **zero** customization options — one button. Customization (length, format, focus prompt) was added only after users started prompt-hacking it. The team explicitly treats AI output variability as a feature, gated behind feature flags.

UI: three panels — **Sources** (left), **Chat** (middle), **Studio** (right — output artifacts: Audio Overview, Video Overview, Mind Map, Reports, Flashcards, Quizzes, Briefing Doc, Study Guide, FAQ, Timeline, Table of Contents, Slide Deck, Infographic, Data Table). Notes live in a notepad above the chat input.

## 2. Architectural Diagrams (text form)

### 2.1 System-level

```
CLIENT (web / iOS / Android) — Sources | Chat | Studio
        │
NotebookLM Application Layer — ingestion router, notebook store, artifact store, orchestrator
        │
   ┌────┴───────────┬─────────────┬─────────────────────────────┐
Ingestion       Retrieval/      Reasoning                  Multimodal Generation
(parse,         Ranking         (Gemini 3                  - Gemini 2.5 native audio
chunk,          (embed,         chat,                      - Nano Banana Pro (images)
embed,          multi-angle     summarize,                 - Veo 3 (video)
OCR/ASR,        rewrite,        outline,                   - Cinematic orchestrator
YT-transcript)  top-k retrieve) critique)
```

### 2.2 Audio Overview multi-agent pipeline (Steven Johnson, Hard Fork interview, Sept 2024)

```
Selected sources
   │
   ▼
[OUTLINE AGENT]        Gemini-Pro-class long-context call
   │                   produces: hook → 4–7 segments → conclusion
   ▼
[OUTLINE-REVISION]     critiques vs sources, rebalances coverage
   │
   ▼
[SCRIPT AGENT]         Gemini-Pro / Gemini 3
   │                   full two-host transcript with speaker tags
   ▼
[CRITIQUE AGENT]       accuracy vs sources + pacing/banter
   │
   ▼
[REVISION AGENT]       applies critique edits
   │
   ▼
[DISFLUENCY PASS]      inserts "ums," "ahs," interjections (signaled in
   │                   script; many added natively by audio model)
   ▼
[TTS RENDER]           Gemini 2.5 native multi-speaker audio
                       (DeepMind blog, June 3, 2025: "Multi-speaker
                       dialogue generation: This model can generate
                       two-person 'NotebookLM-style' audio overview
                       from text input.")
   │
   ▼
Audio Overview MP3 (6–15 min for Deep Dive)
```

The two voices are fixed: a male voice (a "paid professional actor" per Google's spokesperson José Castañeda in the Greene lawsuit, Feb 2026) and a female voice. Customization options: format (Deep Dive / Brief / Critique / Debate), length (Shorter / Default / Longer), language (80+ supported), and a free-text focus prompt. Brief uses a single host for sub-two-minute summaries.

### 2.3 Chat pipeline (October 29, 2025 upgrade)

```
User query
   │
   ▼
[QUERY EXPANSION]   Gemini-class small/fast model
   │                generates intermediate sub-questions
   │                ("explores your sources from multiple
   │                 angles, going beyond your initial prompt"
   │                — Anuja Agrawal, Senior Staff Lead for
   │                NotebookLM, Google blog "Chat in NotebookLM:
   │                A powerful, goal-focused AI research partner")
   ▼
[RETRIEVAL]         embedding-based + multi-angle reranking
   │                per-sub-query retrieval, dedup, merge
   ▼
[SYNTHESIS]         Gemini 3 with full 1M-token chat context
   │                ("enabling the full 1 million token context
   │                 window of Gemini in NotebookLM chat across
   │                 all plans" — Agrawal, Oct 29, 2025)
   │                emits inline [N] citation markers tied to chunk IDs
   ▼
[POST-PROCESS]      renders citations as clickable inline pills;
                    generates suggested follow-up questions
```

### 2.4 Cinematic Video Overview pipeline (March 4, 2026)

```
Notebook sources
   │
   ▼
[CREATIVE DIRECTOR]  Gemini 3
   │                 "makes hundreds of structural and stylistic decisions"
   │                 — determines narrative arc, visual style, format;
   │                 refines its own output for consistency
   │                 (Google blog, March 4, 2026)
   ▼
[ASSET GENERATION]   Nano Banana Pro (Gemini 3 Pro Image)
   │                 generates illustrations, diagrams, stylized frames
   │                 in one of 6 visual styles (Watercolor, Papercraft,
   │                 Anime, Whiteboard, Retro Print, Heritage — Aug 2025)
   ▼
[ANIMATION]          Veo 3 — animates assets into fluid motion video
   │
   ▼
[NARRATION]          Gemini 2.5 native audio (single narrator)
   │
   ▼
MP4 (Google AI Ultra only; 20/day cap; English at launch; 18+)
```

### 2.5 Deep Research agentic flow (November 13, 2025)

```
User query (+ optional existing sources)
   │
   ▼
[RESEARCH PLAN AGENT]  Gemini 3
   │                   user-visible plan; user can edit/approve/
   │                   add scope before run
   ▼
[AGENT LOOP]           iteratively browses public web
   │                   (and, with permission, Drive/Gmail)
   │                   per iter: search → fetch → extract →
   │                   judge relevance → refine next query
   │                   ("creates a research plan and browses
   │                    hundreds of websites on your behalf,
   │                    refining its search as it learns" —
   │                    Google blog Nov 13, 2025)
   ▼
[SYNTHESIS]            Gemini 3 long-context; citation-backed report
   │
   ▼
Import options:        ① import synthesized report as Source
                       ② import each individual web hit as a Source
```

Fast Research is the lighter variant: smaller link set, user review and import in seconds rather than minutes.

## 3. Feature-by-Feature Deep Dive

### 3.1 Source Ingestion & Grounding (the core RAG / source-grounding pipeline)

**Supported source types (May 2026):**
- PDFs (≤200 MB / ≤500,000 words per source)
- Google Docs (sync-on-demand)
- Google Slides
- Google Sheets (added Nov 2025 — structured-data querying, stat summarization, export to Sheets)
- Microsoft Word .docx (Nov 2025)
- Drive URLs / Drive-imported PDFs (Nov 2025)
- Plain text / Markdown
- Pasted text
- Web URLs (HTML extraction)
- YouTube (transcript only; video must be public)
- Audio files (MP3 etc.; auto-transcribed by Google's ASR)
- Images (rolling out late 2025 / early 2026)

**Per-notebook caps:** Free 50 sources × 500k words = up to ~25M words/notebook. Plus 300 sources. Ultra 600 sources.

**Pipeline (inferred + partially confirmed):**

1. **Parse** per type. PDFs use Google Document AI-class OCR/layout. Slides parse text + speaker notes (and likely image captions). Audio runs through Google's ASR (very likely the Universal Speech Model family that powers YouTube auto-captions — not officially confirmed for NotebookLM). YouTube uses the public transcript.
2. **Chunk.** Specific chunk size, overlap, and strategy **not publicly disclosed.** Behavioral inference: semantic-aware (sentence- or paragraph-boundary respecting), ~500–1,500 token chunks. Each source also produces an auto-generated **Source Guide** summary shown in the source viewer.
3. **Embed.** Embedding model **not publicly named for NotebookLM specifically.** Google's production embedding family is the Gemini Embedding line (`gemini-embedding-001`, GA July 2025; `gemini-embedding-exp-03-07` before that; legacy `text-embedding-005` / `textembedding-gecko`). Vertex AI RAG Engine defaults to `text-embedding-005`. **Inference:** NotebookLM almost certainly uses a Gemini-family embedding (768- or 3072-dim); not confirmed.
4. **Store.** Vector index likely Vertex AI Vector Search (ScaNN); chunk-content store likely Spanner/Memorystore. Not officially confirmed.
5. **Index metadata** for citation jump-to-passage: source_id, chunk_id, char offsets.

**Critical Latent Space disclosure (Raiza Martin, Oct 2024):** *"NotebookLM can handle up to 50 sources, 500,000 words each. Like, you're not going to be able to jam all of that into, like, the context window."* This is the explicit confirmation that NotebookLM uses retrieval — it is NOT pure long-context "stuff everything in." It is a **hybrid**: retrieval surfaces the most relevant chunks **into** a 1M-token Gemini call.

**Steven Johnson (Hard Fork podcast, July 2025):** *"what if you could use AI now we would call it RAG now we call it source grounding as we call it at notebook"* — explicit RAG equivalence. His book site (thelongcontext.com) confirms: *"Central to that project was what we came to call 'source-grounding'—sometimes now called RAG, short for retrieval-augmented generation."*

**Citation mechanism:**
- During synthesis, the LLM is prompted to emit citation tokens (numeric markers, e.g. `[1]`, `[2]`) inline with claims.
- Each marker maps to a (source_id, chunk_id, char_range) tuple maintained by the orchestrator.
- UI renders markers as numbered superscript pills. Hover preview shows the verbatim quoted passage; click opens the source viewer scrolled to and highlighted at the exact location.
- Google official help docs: *"If your source content is too short, NotebookLM references the entire document without a cited individual text from your source"* — citation granularity falls back to whole-document for short sources.
- Known limitation widely noted by users (XDA Developers, 2025): citations point to "Source 3" with a highlight, not to page numbers or paragraph references suitable for formal bibliographic export.

### 3.2 Corpus-Level Theme Extraction & Cross-Source Synthesis

NotebookLM's core differentiator over plain ChatGPT-with-attachments is its ability to answer cross-corpus questions: *"What financial trends have emerged over the last ten quarterly reports, and what risks are cited across all of them?"*

Mechanism (inferred from disclosures):
- The Oct 29, 2025 retrieval upgrade adds **multi-angle exploration**: a planner sub-call decomposes the user query into 3–7 sub-queries spanning different angles.
- Each sub-query retrieves its own top-k chunks; results deduplicated and merged.
- Final synthesis call (Gemini 3, 1M tokens) reasons across the merged context.
- Reported impact: *"we've seen a 50% improvement in user satisfaction with responses that use larger amounts of sources"* (Anuja Agrawal, Senior Staff Lead for NotebookLM, Oct 29, 2025).

### 3.3 Chat / Q&A

UI behaviors:
- Inline numbered citations on every answer.
- Suggested follow-up questions under each response.
- "Save to note" pins the answer with citations preserved (no longer editable).
- Source-scoping: subset selection; user notes can be converted to sources via "Convert all notes to source."
- **Custom Chat Goals** (Oct 2025): persistent persona/goal per notebook (e.g., "Act as an 8th-grade physics teacher; answer with TL;DR + Analogy + Vocabulary + Check Question.").

**Underlying model evolution:**
- Launch–2024: PaLM 2 → Gemini 1.5 Pro (1M context).
- Dec 2024: Gemini 2.0 Flash.
- March 2025: Gemini 2.0 Flash Thinking.
- May 2025: Gemini 2.5 Flash (9to5Google, May 2, 2025).
- Dec 2025: Gemini 3 (NotebookLM X account).

Hyperparameters (not disclosed; behavioral inference): temperature low (~0.2–0.4); top-k retrieval likely 10–30 chunks per sub-query with reranking; full 1M-token context budget; multi-turn capacity increased "more than sixfold" Oct 2025 (Agrawal).

### 3.4 Audio Overviews / Podcast Generation

**The model stack:**

*2024 launch era (Sept 2024):* Behaviorally consistent with Google DeepMind's SoundStream → AudioLM → SpearTTS → SoundStorm research lineage. SoundStorm — RVQ-based audio tokens, MaskGIT-style parallel decoding, 30 s of audio in 0.5 s on TPU-v4 — was the strongest third-party hypothesis (Arize, Jesus Rodriguez, Simon Willison). Google never explicitly confirmed SoundStorm as the production model.

*2025–2026:* Officially powered by **Gemini 2.5 native audio multi-speaker TTS.** Google DeepMind blog, June 3, 2025 ("Advanced audio dialog and generation with Gemini 2.5," Ankur Bapna and Tara Sainath): *"We're already using these models to bring audio to users globally, across numerous products, prototypes and languages. NotebookLM's Audio Overviews and Project Astra are just two examples."* and *"Multi-speaker dialogue generation: This model can generate two-person 'NotebookLM-style' audio overview from text input, making content more engaging through conversation."* The April 29, 2025 multilingual expansion ("over 50 languages," Google Workspace Updates blog) is explicitly attributed to *"Gemini's native audio support."*

**The dialogue pipeline (Steven Johnson, Hard Fork, Sept 2024, transcribed by Simon Willison):**
> "behind the scenes, it's basically running through, stuff that we all do professionally all the time, which is it generates an outline, it kind of revises that outline, it generates a detailed version of the script and then it has a kind of critique phase and then it modifies it based on the critique. Then at the end of it, there's a stage where it adds my favorite new word, which is 'disfluencies'."

**The script-level "deep dive" host persona** (from prompt-injection leaks documented by Jaden Geller, Simon Willison, Nicole Hennig, and ikangai.com):
- Hosts are instructed to **act as human podcast hosts under all circumstances** — they will not break character to admit they are AI unless directly addressed via the "deep dive" framing.
- The system prompt opens with language like *"You are a Grammy-award-winning podcast script writer"* (per leaked-style transcript).
- It specifies a **listener persona** (someone who values efficiency).
- It instructs: always start with a clear topical overview; maintain a neutral stance on controversial topics; "wrap up the episode within [N] minutes" (length parameterized).
- It instructs use of disfluencies and conversational micro-interjections — though Usama Bin Shafqat clarified on Latent Space that **many disfluencies are added in the audio model itself**, not the text script: the script provides "signals" where they should appear, and the audio model fills them in.

**The Brief / Critique / Debate formats** (September 2025) reuse the same multi-agent pipeline with different host counts and persona prompts: Brief = single host, ≤2 min; Critique = two hosts evaluating a doc; Debate = two hosts on opposing sides.

**Interactive Mode** ("Join the conversation," launched Dec 16, 2024): tap "Join," speak a question, host responds in real time using the Gemini 2.0/2.5/3 chat backend (retrieving from the same source corpus) streamed through the same multi-speaker TTS. Initially English-only; broader languages rolled out through 2025.

**Known limitations & how Google has addressed them:**
- Inability to interrupt hosts at launch → Interactive Mode (Dec 16, 2024).
- English-only at launch → "over 50 languages" (Apr 29, 2025, Google Workspace blog) → exactly **80 languages** (Aug 25, 2025, per Sam Dealy, Google Labs engineer, Google blog: *"Today we're announcing two key updates to NotebookLM: Video Overviews are now available in 80 languages globally"*; Audio Overviews use the same language set).
- Audio glitches in Interactive Mode (random speaker switches, third voice) — still acknowledged in current help docs.
- **David Greene v. Google (filed Jan 23, 2026, Santa Clara County Superior Court; per nationaltoday.com court records):** NPR host alleges his voice was used as training data for the male host without consent. Google spokesperson José Castañeda gave one combined statement to The Washington Post (Feb 16, 2026): *"These allegations are baseless. The sound of the male voice in NotebookLM's Audio Overviews is based on a paid professional actor Google hired."* Case is unresolved as of May 2026. **Implication for Jonathan's product: if you license third-party TTS voices, ensure the contract covers training data and synthetic-voice rights.**

### 3.5 Video Overviews & Cinematic Video Overviews

- **Original Video Overviews (July 2025):** Narrated slides — text-based slide compositions with TTS narration.
- **Nano Banana upgrade (Aug 2025):** Six visual styles (Watercolor, Papercraft, Anime, Whiteboard, Retro Print, Heritage), source-grounded illustrations.
- **Cinematic Video Overviews (March 4, 2026):** Three-model pipeline. Gemini 3 = "creative director" making "hundreds of structural and stylistic decisions" (Google blog, March 4, 2026); Nano Banana Pro = image assets; Veo 3 = animation. Ultra-only ($249.99/mo), 20 videos/day, English-only at launch, 18+.

There is no public detail on the inter-model handoff schema. **Inference:** Gemini 3 emits a structured "production plan" JSON (scene list, narrative beats, visual style tags, timing) that Nano Banana Pro consumes for asset generation and Veo 3 consumes for animation directives. Whether Gemini 3 iteratively reviews Veo 3 outputs is unconfirmed; the 20/day cap suggests one-pass execution.

### 3.6 Mind Maps

Launched March/April 2025. UX: "Mind Map" button in chat panel produces a branching diagram with main topics as parent nodes and sub-topics as children. Nodes are interactive — clicking opens the chat panel with the branch's context auto-applied. Exportable as PNG; shareable via notebook.

Mechanism (inferred): a single Gemini long-context call over selected sources produces a hierarchical outline in structured (JSON-like) form. The front-end renders the tree as a force-directed or radial graph. The "click node to chat" feature injects the node label + parent path as additional context into the chat query. Output is deterministic enough that users regenerate by deleting and re-creating the mind map note.

### 3.7 Briefing Docs, Study Guides, FAQs, Timelines, Tables of Contents

Five preset structured-deliverable buttons in the Studio panel. Each is a single Gemini generation with a fixed system prompt + the user's sources.

Reconstructed prompt sketches (inferred from outputs):
- **Briefing Doc:** 1–2 page executive briefing with Headline summary, 5–7 Key Takeaways, Direct Quotations with citations, Open Questions.
- **Study Guide:** Short-answer quiz with answer key, essay prompts, key terms with definitions, glossary.
- **FAQ:** 10–15 most important questions a reader of these sources would have, with source-grounded answers.
- **Timeline:** Chronological events with date, event, source citation, named entities.
- **Table of Contents:** Hierarchical TOC for a synthesized document built from these sources.

Newer structured outputs (late 2025–2026):
- **Reports** (multiple per notebook, free-text prompt).
- **Slide Decks** (Nov 2025, Nano Banana Pro visuals).
- **Infographics** (Nov 2025, Nano Banana Pro).
- **Data Tables** (Dec 2025, exportable to Google Sheets; extracts structured tabular data from unstructured sources).
- **Flashcards & Quizzes** (rolled out 2025).

### 3.8 Deep Research (November 13, 2025)

Two modes: **Fast Research** (quick scan, sources to review/import in seconds) and **Deep Research** (creates research plan, browses hundreds of websites, refines as it learns, generates a citation-backed report in minutes). Per Google blog, Nov 13, 2025: *"With your guidance, Deep Research takes your question, creates a research plan and browses hundreds of websites on your behalf, refining its search as it learns. In a few minutes, it generates an organized, insightful, source-grounded report."* User can scope search to public web, Google Drive, or both. Outputs are importable as first-class notebook sources (and then chatted with, audio-overviewed, etc.).

This is NotebookLM's transition from passive RAG to **agentic researcher** — the textbook plan-act-reflect loop with query decomposition, parallel execution, synthesis, gap analysis, and re-querying.

### 3.9 Notebook Organization, Source Limits, Context Window Management

- **Notebook = top-level container** (sources, chat, notes, Studio artifacts).
- **Tier limits (May 2026):**
  - Free: 100 notebooks, 50 sources/notebook, ~50 chats/day, ~3 audio/video gens/day.
  - Plus ($19.99/mo via Google One AI Premium): 500 notebooks, 300 sources, 500 chats/day, 20 audio/video/day.
  - Ultra ($249.99/mo via Google AI Ultra): 600 sources, Cinematic Video Overviews access.
- **Source cap:** 500,000 words OR 200 MB per source.
- **Chat context budget at query time:** full 1M tokens (Gemini 3, Oct 29, 2025).
- **Notes** live separately from sources; bulk-convertible to a "source" via "Convert all notes to source."
- **Sharing:** View-only or edit; Workspace for Education defaults to within-domain; public via "Anyone with the link" share. Featured Notebooks is a publishing surface: *"Over the past four weeks, more than 140,000 public notebooks have been created, on a wide range of topics"* (Steven Johnson, Google blog "Try featured notebooks on selected topics in NotebookLM," July 14, 2025 — referring to the first four weeks after public sharing launched).
- **Enterprise data isolation:** NotebookLM Enterprise via Google Cloud supports VPC Service Controls, CMEK, audit logs, US/EU/Global data residency. Sources are not used to train foundational models on Enterprise.

## 4. Mixture-of-Agents / Multi-Agent Patterns Identified

NotebookLM uses at least four distinct multi-agent / multi-step LLM patterns:

1. **Generate → Critique → Revise** (the "writer-editor" reflection loop) — used for Audio Overview scripts and (inferred) for the Cinematic Video Overview production plan.
2. **Plan → Decompose → Parallel-Execute → Synthesize** (the "researcher" loop) — used for Deep Research and for the Oct 2025 multi-angle chat retrieval upgrade.
3. **Director → Specialist Model orchestration** (the "production studio" pattern) — Cinematic Video Overviews: Gemini 3 plans, Nano Banana Pro generates assets, Veo 3 animates, Gemini 2.5 audio narrates.
4. **Persona-loaded generator** (the "voice" pattern) — Audio Overview hosts: thick system prompt establishes two Grammy-winning podcast hosts with disfluency rules, listener-persona awareness, and "never break character as human" jailbreak protection.

These four patterns are the most directly transferable to a Claude-based replica.

## 5. Reconstructed / Inferred Prompt Templates

The following are sketches reconstructed from public leaks (Jaden Geller, Simon Willison, Nicole Hennig, ikangai.com), Latent Space disclosures, and behavioral observation. Treat as starting points, not exact production prompts.

### 5.1 Chat synthesis

```
You are NotebookLM, a research assistant grounded strictly in the
user's sources. Answer using ONLY the provided source chunks. If the
sources do not contain the answer, say so explicitly.

For every factual claim, emit an inline citation [N] where N is the
chunk ID used. Each chunk is provided with chunk_id, source_title,
and content.

Style: clear, neutral, concise. Bullets for lists; tables for
comparisons. No editorializing. No claims not in chunks.

For broad queries: short overview first, then sub-sections with
citations. End with 3 suggested follow-up questions.

USER QUERY: {{query}}
SUB-QUERIES (auto-generated): {{sub_queries}}
RETRIEVED CHUNKS: {{chunks_with_ids}}
```

### 5.2 Audio Overview outline (first stage)

```
You are a Grammy-award-winning podcast script writer. Produce an
OUTLINE for an 8–12 minute Deep Dive podcast featuring two hosts
having a conversation about the user's source material.

Outline must include:
- Hook (one strong concrete detail, question, or surprise from sources)
- 4–7 main segments (each a single coherent idea)
- Per segment: core idea, 1–2 strongest quotes/facts, natural pivot
- "So what" close

LISTENER PERSONA: intelligent generalist who values efficiency.

Strict rules: ground all content in sources; neutral stance on
controversial topics; do not invent facts.

SOURCES: {{sources}}
```

### 5.3 Audio Overview script + critique

```
Write the FULL SCRIPT for the Deep Dive based on the outline.
Two hosts: Host A and Host B — warm, curious, energetic podcast
professionals (never break character as humans).

Rules:
- Alternate speakers naturally; no monologue > 60 s
- Micro-interjections: "Right," "Exactly," "Oh really?", "Totally"
- Tension: occasional disagreement; clarifying questions
- Concrete analogies and metaphors; hosts add INSIGHT, not paraphrase
- Open: "Hey everyone, welcome back…" Frame as a "deep dive"
- Wrap with a takeaway and soft sign-off

OUTLINE: {{outline}}
SOURCES: {{sources}}

Format:
HOST_A: …
HOST_B: …
```

```
[critique pass]
You are a strict podcast editor. Review for:
1. Factual accuracy vs sources — flag any ungrounded claim
2. Pacing — segments too long? abrupt pivots?
3. Conversational quality — two humans, or two chatbots?
4. Length within target

Output: JSON list of specific edits with line references.
```

### 5.4 Mind Map

```
Build hierarchical concept map from sources.

Output JSON:
{
  "root": "<short notebook title>",
  "nodes": [{
    "id": "n1",
    "label": "<concept>",
    "summary": "<one sentence>",
    "source_refs": [chunk_ids],
    "children": [...]
  }]
}

Rules: max depth 4; max 7 children per node. Root = unifying theme.
Layer 2 = major themes. Layer 3+ = sub-concepts. Every leaf cites ≥1
chunk. Multiple unrelated themes → top-level forest, not strained root.
```

### 5.5 Deep Research planner

```
You are a research planning agent. The user has asked: "{{query}}".

Generate a research plan with:
1. Goal statement (1 sentence)
2. 3–7 sub-questions that fully address the goal
3. Per sub-question: ideal source type (academic paper, government
   data, news, primary doc, expert interview) + 2–4 candidate queries
4. Known unknowns: what we expect to be hard to find
5. Out-of-scope: what we will NOT investigate

Present plan for user approval/editing before running.
```

## 6. Claude Code Implementation Mapping

This is the operational core of the spec — how Jonathan builds equivalents on Claude + Microsoft 365.

### 6.1 Recommended Anthropic model assignment

| NotebookLM role | Claude model | Reasoning |
|---|---|---|
| Final chat synthesis (long-context grounded answer) | **Claude Sonnet 4.5** (200K; 1M-token beta if available) | Best price/perf; strong structured outputs and citations |
| Audio Overview outline + critique + revise loop | **Sonnet 4.5** for outline/critique; **Opus 4.5** for final script polish | Sonnet 4.5 fast enough; Opus 4.5 for writerly final pass |
| Cheap per-chunk extraction, ranking, query expansion, sub-question generation | **Claude Haiku 4.5** | Sub-second; ideal for hundreds of parallel calls |
| Deep Research planner | **Sonnet 4.5** with extended thinking | Plan-act-reflect benefits from explicit thinking traces |
| Mind Map structural extraction | **Sonnet 4.5** in JSON tool-use mode | Reliable structured output |
| Briefing / Study Guide / FAQ / Timeline / TOC | **Sonnet 4.5** | One-shot with strict prompt + tool-enforced schema |

### 6.2 Embeddings & vector store

Anthropic does not ship a first-party embedding model; use a third-party:
- **Voyage-3 / voyage-3-large** (Anthropic's recommended embedding partner) — best default.
- Alternative: **OpenAI text-embedding-3-large** (3072-dim) via **Azure OpenAI** — keeps data in Jonathan's Azure tenant for data residency.

**Vector store options ranked for Jonathan's stack:**
1. **Azure AI Search** (top recommendation) — native to Microsoft 365 / Copilot Studio; supports hybrid lexical + vector + semantic ranker; integrates with SharePoint via Azure AI Search SharePoint connector.
2. **SharePoint Embedded + Microsoft 365 Copilot vector capabilities** — emerging; tighter coupling to Copilot Studio.
3. **Postgres + pgvector** on Azure Database for PostgreSQL — clean fallback; cheap and portable.
4. Pinecone / Weaviate / Qdrant — only if Microsoft-native options are insufficient.

### 6.3 Chunking strategy (starting point — NotebookLM does not disclose theirs)

- **Chunk size:** 800–1,200 tokens with 100–150 token overlap. Semantic-boundary aware (use `unstructured.io` or a sentence-splitter; not naive char-split).
- PDFs: parse with Azure Document Intelligence for layout; chunk by section headings where available.
- Slides: one chunk per slide + speaker notes; capture slide title as metadata.
- Audio: transcribe with Azure Speech-to-Text or Whisper via Azure OpenAI; chunk by speaker turn or ~60 s windows.
- YouTube: yt-dlp + auto-caption track; chunk by ~2-min windows with timestamp metadata for citation precision.
- **Always store chunk metadata:** source_id, source_title, source_type, position offsets, page number (PDFs), slide number, audio timestamp, URL.

### 6.4 Citation contract (single most important implementation detail)

Enforce a strict JSON-validated citation schema. The synthesis prompt must require:

```json
{
  "answer_markdown": "Climate impact is rising significantly [1], with emissions up 14% [2].",
  "citations": [
    {"id": 1, "chunk_id": "src7_chunk23", "source_id": "src7", "passage": "verbatim quote"},
    {"id": 2, "chunk_id": "src2_chunk11", "source_id": "src2", "passage": "verbatim quote"}
  ],
  "suggested_followups": ["...", "...", "..."]
}
```

Post-process: validate that every `[N]` in `answer_markdown` has a matching entry in `citations`; render markers as Teams adaptive-card buttons or SharePoint link pills; reject the answer if validation fails and retry with a "you must cite every claim" reminder.

### 6.5 Multi-agent orchestration

**Option A — Claude Code with file-based state:** Each agent step = separate Claude API call; state lives in JSON files; Claude Code reads/writes them. Simple, debuggable. **Best for the writer-editor (Audio Overview) loop.**

**Option B — Power Automate as orchestrator + Claude API actions:** Each agent step = a Power Automate action that calls the Claude API; intermediates land in SharePoint; native parallelism, error handling, Teams notifications. **Best for Deep Research / parallel sub-question pattern.**

**Option C — Copilot Studio "skills":** Wrap each agent role as a Copilot Studio topic/skill with Claude API as the backing connector. **Best for the chat & Deep Research front-end.**

**Recommendation — hybrid:** Copilot Studio for user-facing chat and Deep Research plan presentation; Power Automate for long-running multi-agent jobs (Audio Overview generation, Briefing Doc, Mind Map); Claude Code as the engineering surface for the pipelines themselves.

### 6.6 Audio (the hardest piece to clone)

Do NOT try to replicate Gemini 2.5's two-host native dialogue TTS. Instead:

- **ElevenLabs v3** with two distinct cloned/preset voices (license carefully — see Greene caveat).
- Alternative: **Azure AI Speech Custom Neural Voice** with two voices — keeps data in tenant; enterprise-grade compliance.
- Alternative: **OpenAI gpt-4o-mini-tts** — cheaper, lower quality, single-voice-at-a-time.

**Disfluencies:** since no available pipeline adds them natively, **bake them into the script** during the script-agent step. Explicitly prompt Claude to insert `[pause]`, "uh," "right," "totally," and short interjections from the non-speaking host. ElevenLabs v3 supports `[pause]` and emotion tags.

**Multi-speaker rendering:** synthesize each speaker's lines separately; stitch in FFmpeg with crossfaded transitions; add a subtle low-volume room-tone bed.

**Interactive mode:** scope cut for v1. v2: Azure Speech bidirectional streaming + Claude streaming chat.

### 6.7 Video (defer until proven need)

Veo 3 / Cinematic Video Overviews is a months-of-effort replication. **v1: narrated slide deck** (HTML / PPTX) via Claude + image generation (Azure OpenAI DALL-E 3 / Stable Diffusion 3.5 via Azure ML / Recraft v3) + TTS narration rendered with FFmpeg. Don't pursue fully animated cinematic video until users explicitly need it.

### 6.8 Reference architecture for "Humans in Control"

```
┌────────────────────────────────────────────────────────────────┐
│ Microsoft Teams (chat surface) + SharePoint (notebook home)    │
└──────────────────┬─────────────────────────────────────────────┘
                   │
            Copilot Studio (front-end agent)
                   │
       ┌───────────┴────────────┐
   Claude API           Power Automate flows
   (Sonnet/Opus/        (long-running multi-agent
   Haiku)               pipelines)
                              │
            ┌─────────────────┼─────────────────┐
         Audio Pipe        Briefing/         Mind Map Pipe
         (Claude+TTS)      Study/FAQ/        (Claude + Mermaid/Markmap)
                           Timeline (Claude)
                              │
                ┌─────────────┴─────────────┐
                │ Azure AI Search           │
                │  (vector + hybrid)        │
                │  + chunk content store    │
                │  + metadata               │
                └─────────────┬─────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ Ingestion Pipeline             │
              │ (Power Automate on SharePoint  │
              │  uploads + Teams triggers):    │
              │  - Document Intelligence       │
              │  - Azure Speech (audio)        │
              │  - YouTube transcript fetch    │
              │  - Web URL extractor           │
              │  - Voyage-3 embeddings         │
              └────────────────────────────────┘
```

### 6.9 Claude Code engineering patterns

- **One repo with `/agents/{outline,critique,script,planner,synth}.md`** prompt files; Claude Code parameterizes them.
- **Evals first** (Raiza/Usama explicitly emphasized eval-driven development on Latent Space): build a 10–20 (sources, query, expected-properties) golden set and run after every pipeline change.
- **Version every prompt** (commit-pinned); tag every Claude call with prompt version + model snapshot.
- **MCP servers worth wiring up early:**
  - SharePoint MCP (read sources, write artifacts).
  - Azure AI Search MCP (retrieval).
  - Teams MCP (notifications, share-back).
  - **Custom citation-checker MCP** that validates `[N]` markers against the citation manifest.
- **Tool-use schemas** for every structured output (Mind Map JSON, Briefing Doc sections, Citation manifest).

## 7. Hyperparameters & Configuration Recommendations

| Parameter | NotebookLM (disclosed / inferred) | Recommended for Claude replica |
|---|---|---|
| Chat synthesis temperature | low (~0.2–0.4, inferred) | 0.2 |
| Audio outline temperature | mid (inferred from variability) | 0.6 |
| Audio critique temperature | low | 0.4 |
| Audio script temperature | mid-high | 0.7 |
| Mind Map temperature | low | 0.1 (JSON output, deterministic) |
| Deep Research planner | mid | 0.5 |
| Embedding dimensions | not disclosed; likely 768 or 3072 | Voyage-3 (1024) or text-embedding-3-large (3072) |
| Chunk size | not disclosed | 800–1,200 tokens, 100–150 overlap |
| Retrieval top-k per sub-query | not disclosed | 10 (Haiku reranks to top 6 before synthesis) |
| Number of sub-queries (multi-angle) | "multiple angles" (Agrawal, Oct 2025) | 3–5 |
| Synthesis context budget | 1M tokens (Gemini 3) | 200K Sonnet (or 1M Sonnet beta); 30K output headroom |
| Audio Overview length | Deep Dive 6–15 min; Brief <2 min | 8–12 min default |
| Max sources / notebook | 50 / 300 / 600 (tier-dependent) | 50 default, parameterize |
| Max words / source | 500,000 | match |

## 8. Quality Control, Safety, Human-in-the-Loop

**NotebookLM's stack (observable + disclosed):**

- **Safety filters** trigger refusals on violent, sexual, or extremist content even in historical contexts (Google help docs: *"Safety flags: The content of your source contains language that triggers a safety flag. This occurs with sensitive topics like violence, sexuality, or obscenity, even in historical contexts."*).
- **Citation-based hallucination control:** claims must be source-grounded; the UI's hover-preview gives users an instant verify-it-yourself loop.
- **"Reflective" multi-agent loop** for Audio Overview (outline → critique → revise → script → critique → revise) catches factual drift before TTS.
- **Thumbs up/down feedback** is the only signal that enters training (and only on free tier; enterprise tier does not send any data to model training per Google's terms).
- **Workspace/Enterprise data isolation:** VPC Service Controls, CMEK, audit logs, configurable data residency (US/EU/Global). Sources never train foundational models on Enterprise.
- **Human-in-the-loop for Deep Research:** the agent always presents a research plan for user approval before running.

**For Jonathan's "Humans in Control" replica:**

1. **Mandatory HITL approval on every long-running agentic job.** Mirror Deep Research's "plan first, run on approval" pattern via Teams adaptive-card approvals.
2. **Mandatory citation validation** post-synthesis: if a claim has no citation, drop the claim or flag it as ungrounded.
3. **Azure AI Content Safety** classification on all sources at ingestion AND all outputs before rendering.
4. **Audit log** of every chat query, source set, model + prompt version, retrieved chunk IDs, and final response — stored in SharePoint or Log Analytics. **This audit trail is what makes the system "auditable" for the "Humans in Control" thesis and is the primary product moat.**
5. **Differential trust levels:** distinguish "internal trusted source," "external web," "user-pasted" with visible UI badges; require explicit user opt-in for web-grounded answers.

## 9. Known Gaps — Confirmed vs. Inferred vs. Speculative

**CONFIRMED (direct Google statements):**
- NotebookLM is built on Gemini 3 as of Dec 2025 (NotebookLM X account).
- Audio Overviews use Gemini 2.5 native audio multi-speaker TTS (Google DeepMind blog, June 3, 2025, Ankur Bapna & Tara Sainath).
- Cinematic Video Overviews use Gemini 3 + Nano Banana Pro + Veo 3 (Google blog, March 4, 2026).
- Full 1M-token context window in chat (Anuja Agrawal, Senior Staff Lead for NotebookLM, Google blog "Chat in NotebookLM: A powerful, goal-focused AI research partner," Oct 29, 2025).
- Multi-angle retrieval — "explores your sources from multiple angles" (Agrawal, Oct 29, 2025).
- Source caps and word caps (Google help docs).
- Architecture is officially called "source grounding" (Steven Johnson, multiple disclosures).
- Male host voice is "based on a paid professional actor Google hired" (Google spokesperson José Castañeda to The Washington Post, Feb 16, 2026).
- Outline → revise → script → critique → revise → disfluency pipeline (Steven Johnson, Hard Fork, Sept 2024).
- Hallucination rate ~13% on NotebookLM vs ~40% on ungrounded LLMs (Hagar et al., arXiv:2509.25498, Computation + Journalism Symposium 2025).

**REASONABLE INFERENCE from behavior + adjacent Google products:**
- Embedding model is a Gemini-family embedding (`gemini-embedding-001` or successor).
- Vector store is Vertex AI Vector Search (ScaNN-based).
- Chunk size in the 500–1,500 token range; semantic-boundary aware.
- Audio model is the controllable multi-speaker TTS branch of Gemini 2.5 (Pro Preview TTS or Flash Preview TTS), not the bidirectional Live model.
- Disfluencies are split: signaled in the script and rendered natively in the audio model (per Usama Bin Shafqat on Latent Space).

**SPECULATION (no direct evidence):**
- Whether NotebookLM uses Vertex AI RAG Engine under the hood (third parties treat them as separate products).
- Whether the legacy SoundStorm decoder still serves as a codec/decoder layer in a hybrid stack vs being fully replaced.
- Exact top-k retrieval values.
- Exact temperatures and full system prompt content (only fragmentary jailbreak leaks).
- Whether Cinematic Video Overviews include iterative Gemini 3 ↔ Veo 3 refinement (20/day cap suggests one-pass).

**NOT DISCLOSED AT ALL:**
- Specific chunk sizes, overlap, embedding dimensions for NotebookLM.
- Full system prompts for any feature.
- Eval methodology and internal metrics (Raiza Martin discussed eval philosophy on Latent Space but shared no metrics).
- Cost per Audio Overview / Video Overview generation.
- NotebookLM-specific Google patent filings (none surfaced in research).

## 10. Recommendations (Staged Roadmap)

### Stage 0 — Foundations (Weeks 0–2)
- Stand up SharePoint document library + Azure AI Search index.
- Build the ingestion pipeline (Power Automate triggers on SharePoint upload → Document Intelligence parse → semantic chunking → Voyage-3 embeddings → Azure AI Search).
- Build the chat-with-citations MVP: Copilot Studio topic → Claude Sonnet 4.5 with the §5.1 prompt → strict citation contract → render in Teams adaptive cards.
- **Advance gate:** ≥80% of test queries return correctly cited answers on a 20-question golden set.

### Stage 1 — Structured deliverables (Weeks 2–5)
- Implement Briefing Doc, Study Guide, FAQ, Timeline, Mind Map (§5.4 schema).
- Mermaid / Markmap front-end for Mind Map.
- **Advance gate:** users prefer NXT Humans Briefing Doc over manual research on ≥7/10 internal trials.

### Stage 2 — Audio Overview pipeline (Weeks 5–9)
- Build outline → critique → script → critique → revise pipeline in Claude Code.
- ElevenLabs (or Azure Speech) two-voice TTS with script-injected disfluencies.
- FFmpeg stitching with crossfaded transitions + room-tone bed.
- **Advance gate:** internal listening test scores ≥4.0/5.0 naturalness and ≥4.5/5.0 accuracy on a 10-doc test set.

### Stage 3 — Deep Research agentic flow (Weeks 9–13)
- Build planner → parallel sub-query executor → synthesizer.
- HITL plan approval in Teams adaptive cards.
- Tavily or Bing Web Search APIs (not Google's, due to ToS).
- **Advance gate:** Deep Research outputs surface ≥3 sources the user did not previously know AND zero hallucinated facts on 20 test queries.

### Stage 4 — "Humans in Control" Differentiation (Weeks 13+)
- Lean into explicit per-source trust levels, mandatory HITL gates, full audit trail, exportable provenance reports — this is the durable moat.
- SharePoint Embedded vector index for tenant-isolated enterprise tier.
- Optional: interactive audio mode (Azure Speech bidirectional + Claude streaming), animated video (only if user demand is proven).

### Triggers that would change these recommendations
- **Anthropic ships a first-party embedding model** → switch from Voyage-3 for tighter contract alignment.
- **Microsoft 365 Copilot ships a first-class NotebookLM-equivalent** (likely 2026) → reposition NXT Humans' product as the *governance, HITL, and auditability* layer on top, not the underlying tool.
- **Gemini 2.5/3 native audio TTS becomes commercially licensable via Vertex API** → evaluate direct usage for audio while keeping Claude for everything else.
- **Greene v. Google sets a precedent on synthetic-voice training data** → tighten TTS vendor contracts; consider non-clone voices only.

## 11. Caveats

- This spec is a reverse engineering. Sections labeled "inferred" or "speculation" should be treated accordingly.
- NotebookLM is a moving target — major releases approximately every 6–8 weeks during 2024–2026. The Gemini 3 + Cinematic Video Overviews world (Dec 2025 – March 2026) is materially different from the launch product. Re-validate against current Google blog before each implementation step.
- Some leaked prompt fragments (e.g., "Grammy-award-winning podcast script writer") came from jailbreak attempts and may be partially hallucinated by the model itself when asked to reveal its prompt. Treat all reconstructed prompts as starting points, not ground truth.
- The Latent Space podcast with Raiza Martin and Usama Bin Shafqat (Oct 25, 2024) is the single most useful primary source on NotebookLM engineering culture; the Sequoia Training Data podcast with Raiza Martin and Jason Spielman is the best primary source on product philosophy. Re-listen to both before committing to architectural decisions.
- Recommendations assume Jonathan can use ElevenLabs or Azure Speech commercially in the target deployment domain. For regulated industries (healthcare, legal, regulated financial), Azure Speech Custom Neural Voice is strongly preferred for tenant isolation.
- The "Humans in Control" thesis is *strengthened* by the David Greene v. Google lawsuit (filed January 23, 2026, Santa Clara County Superior Court) and the broader public concern about AI-generated voice clones. Lean into provenance, consent, and audit as primary differentiators rather than trying to out-magic Google's audio.