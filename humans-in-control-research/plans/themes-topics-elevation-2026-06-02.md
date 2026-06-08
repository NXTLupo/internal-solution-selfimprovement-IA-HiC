# Analyst Desk: Themes + Topic Modeling Elevation Plan (2026-06-02)

Audit + plan for two linked problems: (1) theme extraction is thin / off-objective /
conflated with recommendations and buried in a UI strip; (2) HiC topic modeling never
got the Social Analytics sentiment/richness enhancements. Goal: make **themes + topic
modeling the wall-to-wall default of the analyst desk, alongside the AI chat**, and make
both pipelines rich, relevant, and useful to a researcher.

All file:line refs verified by code audit on 2026-06-02.

---

## PART 1 — THEME EXTRACTION: audit findings (root causes)

Engine: `services/geminiService.ts::generateThemes` (826-1901). Trigger: auto-synthesis
`App.tsx:4430`.

### Structural defects
1. **BERTopic clusters are ORPHANED from theme generation (the #1 gap).** `generateThemes(feedback,onStream)` never receives `topicModelResult`; no cluster text reaches the breadth/depth prompts. Themes are pure-LLM. The deterministic clustering layer the architecture brags about does not inform themes. (`geminiService.ts:826`; clusters live only in React state `App.tsx:3934`.)
2. **Topic modeling only runs for Reddit-deep ≥10 items** (`App.tsx:3907`). Most corpora produce zero clusters, so even a wiring fix would be empty for them. (See Part 3 — lower the gate.)
3. **Aggressive `TOP_N` cap silently slices themes to 5-25** keyed off output mode (`geminiService.ts:1435-1454`, slice at `1492`). The dashboard themes view inherits whatever cap the active deliverable implies — a corpus that yielded 20+ thick themes can be cut to 5.
4. **Thick-evidence `>=2 distinct sources` filter can EMPTY the set** with no fallback (`1481`, zeroes at `1506`); homogeneous corpora (single subreddit / few PDFs) lose most themes.
5. **Two LLM domain gates compound pruning** (`_domainGateThemes` at `1461` and `1567`).
6. **Off-objective corpus ships irrelevant themes BY DESIGN** — when 0/N themes are on-objective the gate keeps them "to avoid an empty result" (`816-819`) instead of telling the researcher the corpus is off-topic.
7. **`goalAlignment` overwritten by cosine** (`1599-1618`) which "cannot tell 'AI for co-op' from 'AI for design'" (comment `773-776`) — buzzword-adjacent themes rank high.

### Conflation with recommendations
8. **The DEPTH pass forces an `implications` array of verb-led, actionable, consultant-grade sentences** — the schema example is literally a recommendation ("Pilot AI-summarized donor history in 1-2 gift officer pods within Q3...", `1838-1841`). A theme (a finding) is rendered as finding + action plan. This is the direct source of the conflation.

### Schema / typing
9. **`Theme` TS type is thin** (`types.ts:119-129`: name, description, quote, citations, status, confidence). Rich depth fields (`subThemes/dimensions/contradictions/temporalArc/implications`) are untyped runtime `any` — renderers drop them. **No `prevalence` and no `sentiment` field** — a researcher can't see how common or how positive/negative a theme is.

### Determinism
10. Breadth/depth run at `temperature:0.2` (`1699/1893`), not temp-0+seed — theme names drift run-to-run (violates the determinism-first standing rule). Stale comments claim "Opus 4.7" where code calls `gemini-3.1-pro-preview`.

---

## PART 2 — THE "THIN STRIP" UI: audit findings

Post-extraction surface = `LiveResearchBoard` (`App.tsx:295`) in `AppState.ANALYZING`
(`App.tsx:5621-5623`). Themes = the `ThemeTreemap` (`AnalystDeskKnowledgeGraph.tsx:597`).

1. **The strip is a HEIGHT effect.** Themes are Row 3 of a ~6-row grid (`AnalystDeskKnowledgeGraph.tsx:1818`) inside a height-capped card (`SIZE_PRESETS.tall = min(115vh,1500px)`, `184-188`, default `App.tsx:355`), itself one block in a vertical scroll column (`App.tsx:5622`, board `h-[85vh]` `373`). The treemap is one `1fr` competing with objective banner, search row, a 7-tile metric grid, corpus bar, breadcrumb.
2. **AI chat is NOT co-primary** — it's a `position:fixed` 420px right-edge overlay (`CorpusChatPanel.tsx:7159-7171`), hidden until toggled (`isOpen` `7161`), and never reflows the layout.
3. **Topic modeling is a conditional sub-tab of the KG card**, gated on `>=10 Reddit-deep items` (`AnalystDeskKnowledgeGraph.tsx:1509`), default tab is `'kg'` (`1508`) — never the default, often absent.

---

## PART 3 — TOPIC MODELING vs SOCIAL ANALYTICS: audit findings

HiC live path: `proxy/topic_modeling.py::run_pipeline_v2` (`app.py:2506`). It is **not
BERTopic** — hand-rolled UMAP→HDBSCAN→c-TF-IDF + LLM labeler (`topic_modeling.py:15-17`).

### "Very few topics" causes
- Input floor `len(items) < min_cluster_size*2` → needs ≥10 docs (`:735/:1225`); SPA also gates at ≥10 (`App.tsx:3907`).
- HDBSCAN `min_cluster_size` 3-5 drops small groups to noise (`:431`, SPA formula `App.tsx:3924`).
- **Evidence-density gate deletes any cluster with `<2 distinct sources`** (`:1188-1193`) — kills most clusters on a single-subreddit corpus.
- Coherence gate (`:964-1006`) + two LLM relevance filters (`:1243-1276`, `:1337-1372`) compound.

### "Thin/inaccurate sentiment" causes
- Sentiment is **one LLM-guessed word per cluster** from 8 titles + 10 terms (`:569`), 4-way categorical, **"neutral" is the failure sink** (every degrade path writes neutral). No per-doc, no model, no engagement weighting, no aspect breakdown. There is **no VADER/RoBERTa anywhere** in the proxy.
- `target_topic_count` is dead from the UI; v2 enrichment fields (`convergent_evidence`, `source_types`, `distinct_source_count`) are returned but **dropped by the TS type** (`topicModelService.ts:43-52`).

### Social Analytics enhancements MISSING in HiC (the port list)
SA = `internal-solutions-socialresearch/backend/util/topic_model/BertTopic.py` (true BERTopic + the 2026-06-01 RoBERTa sentiment uplift).
1. **Real sentiment model** — CardiffNLP `twitter-roberta-base-sentiment`, full softmax, compound = P(pos)-P(neg) (`BertTopic.py:412-420,531`).
2. **Distribution-based compound** (no argmax-to-zero wash).
3. **±0.10 sentiment band**.
4. **Weighted topic-sentiment aggregation** (`analyze_topic_sentiment_weighted:527-580`): OP weight 3x, log-upvote weighting, vocal-author cap 1/√n, **Net Sentiment Score (NSS=%pos-%neg)**, **controversy 2·min(pos,neg)/W**, score=0.6·NSS+0.4·weighted_mean.
5. **Structured comment units** (body+score+author) for weighting (`topic_processor.py:48-87`).
6. **Aspect-based sentiment evidence** — pos/neg evidence points tied to post IDs (`extract_sentiment_evidence.py`).
7. **`filter_redundant_keywords`** (lemmatization, phrase-subsumption, plural collapse) (`BertTopic.py:667-812`).
8. **Domain stopwords + (1,3) n-grams** (`:880-889,904`).
9. **Embedding-cosine topic similarity** (`:586-665`).
10. **Corpus-size-adaptive hyperparameters** (5 tiers, `:895-1104`).

### Keep (HiC > SA — do NOT regress)
`leaf` clustering (fixes mega-cluster collapse), source-stratified clustering +
`convergent_evidence`, coherence + evidence-density gates, objective-relevance + LLM
domain gate, multi-model resilience/caching, `mixed` class, no-PyTorch proxy.

---

## THE PLAN (phased, quality-first — fix UPSTREAM, never relax the gate)

### Phase 1 — Theme richness, relevance, de-conflation (highest value, lowest risk)
1. **Wire topic clusters into the theme stage.** Pass `topicModelResult` into `generateThemes`; inject a "DETERMINISTIC TOPIC CLUSTERS (from the corpus)" block (cluster name + top terms + representative quotes + sentiment) into the breadth prompt as the structural backbone the LLM must cover and name. Themes become cluster-grounded, not free-associated.
2. **De-conflate findings from recommendations.** Rename/repurpose the depth `implications` field to `interpretation` ("what this pattern MEANS for the objective") — analytical, not prescriptive; strip verb-led action framing from the theme contract. Recommendations stay in the recommendations deliverable.
3. **Uncap the dashboard themes view.** The analyst-desk themes panel renders ALL thick themes (sorted by density), NOT sliced to a deliverable `TOP_N`. Keep the slice only when a specific deliverable (deck/persona) consumes themes downstream.
4. **Add `prevalence` + `sentiment` to the Theme type + schema** (sourced from cluster post_count + the new weighted sentiment). Type the depth fields properly (`types.ts`).
5. **Relevance honesty:** when the domain gate finds the corpus off-objective, surface a researcher-facing banner ("corpus weakly matches objective") instead of silently shipping adjacency. Replace cosine-only goalAlignment with cosine + the LLM domain-gate verdict.
6. **Determinism:** breadth/depth naming at temp 0 + seed; fix stale model comments.

### Phase 2 — Dashboard: themes + topics wall-to-wall, AI chat co-primary
1. Convert `App.tsx:5622` post-extraction area to a **two real columns**: left = analyst desk (themes/topics) filling height; right = `CorpusChatPanel` as a flow column (drop `position:fixed`; default open).
2. **Promote the tab strip to LiveResearchBoard level**: THEMES | TOPIC MODELING | KNOWLEDGE GRAPH as co-primary peers; default = THEMES.
3. **Kill the height cap**: themes/topics panel gets `flex-1 min-h-0` and fills the left column (default size `full`/`100%`).
4. Slim the metric tiles + search into a toolbar so the themes view is the dominant surface.
5. **Relax the topic-modeling tab gate** (`AnalystDeskKnowledgeGraph.tsx:1509`) so it's always a peer when a corpus exists.

### Phase 3 — Topic modeling: port Social Analytics richness + sentiment
1. **Carry per-comment `score`/`author`** through the topic payload (prereq for weighting). Update the SPA→proxy item shape + `_doc_text_for_embedding` neighbors.
2. **Real weighted sentiment** in `run_pipeline_v2`: add CardiffNLP RoBERTa (CPU `transformers`, as socialresearch uses) OR call the social-research-backend sentiment endpoint; port the weighted aggregation (OP weight, log-upvote, author cap, NSS, controversy, 0.6/0.4 blend) verbatim. Replace the single LLM-guessed word.
3. **Aspect-based sentiment evidence** (pos/neg points per topic, post-referenced).
4. **Richer representation:** `filter_redundant_keywords`, domain stopwords, (1,3) n-grams.
5. **Lower the input floor + run for all corpora**, not just Reddit-deep ≥10. Soften the `<2 distinct sources` gate for homogeneous corpora (degrade tier, not delete).
6. **Surface dropped v2 fields** (`convergent_evidence`, `source_types`, `distinct_source_count`, NSS, controversy, aspect evidence) in `topicModelService.ts` type + `TopicModelingPanel.tsx`.

### Sequencing
Phase 1 first (theme value, no architecture risk). Phase 2 (UI) second. Phase 3 (ML port)
third — flag the PyTorch-in-proxy tradeoff vs calling socialresearch backend. Each phase:
build → visual/functional test → report. Determinism + quality-first standing rules apply.
