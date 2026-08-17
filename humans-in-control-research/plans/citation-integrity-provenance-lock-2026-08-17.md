# Citation integrity: the provenance lock

2026-08-17. Source: Isabelle's field report (`.claude/research/FEEDBACK ON TOOL.pdf`),
a live client engagement (private-club / hospitality finance deck) where the Analyst
chat produced a deck with fabricated attributions and cross-industry evidence, and only
her manual "STOP and re-verify everything" prompt surfaced it. Unified Vision phases
advanced: 3 (per-type provenance read at cite time), 5 (anti-RAG on all surfaces),
7 (user-influenced self-improvement).

## 1. What actually happened (failure taxonomy from the incident)

The model's own audit, run after her STOP prompt, proves the decisive fact: EVERY claim
existed in the corpus, most with real URLs. The failures were attribution and framing,
not missing data:

- F1 ATTRIBUTION FABRICATION. Real corpus content re-labeled with invented source
  identities: a PYMNTS article became "Intuit Mid-Market AI Report, 2026"; a Tearsheet
  article became "BILL Case Study"; a Docyt-derived synthesis became "HFTP"; the
  Virtuous nonprofit report became a generic "2026 AI Adoption Report". The model
  authored plausible source names instead of using the chunk's real `sources:` field.
- F2 TOPICAL MISMATCH. On-claim but off-industry chunks used as direct evidence:
  nonprofit fundraising (Virtuous), asset-management distribution (Dakota Data Summit
  upload), and bank CRO risk (Databricks) cited on private-club slides. The claim topic
  matched; the industry did not.
- F3 NO CHECKABLE URLS. Citations rendered as names only, so neither the tool nor the
  reader could spot-check; trust broke on the first fabrication found.
- F4 PARAPHRASE DRIFT. A stat lightly paraphrased from one source (Docyt) was credited
  to another (HFTP): synthesis across chunks lost the originating pointer.
- F5 THE AUDIT WAS MANUAL. Her STOP prompt produced exactly the verification ledger the
  product should emit: the corpus + registry can already answer "real URL, verbatim,
  topically matched?" for every claim. The loop exists; it is not in-path.

## 2. Root causes in the code (anchors)

- RC1 The model AUTHORS source identity. Quote attributions, "named report" labels, and
  citations[] entries are free-text model output. `citationPointerRegistry.ts` resolves
  POINTERS to real names (Tier 1 per-chunk `sources:`), but nothing forbids or replaces
  model-written source labels in quote/attribution/citation fields, so a hallucinated
  "Intuit Mid-Market AI Report" ships untouched.
- RC2 No verbatim check. Nothing compares a rendered quote or stat against the text of
  the chunk it allegedly came from. `validate_chunk_citations.py` checks pointer
  EXISTENCE for Claude-Code-side generation, and it is a dev-harness hook: the RUNTIME
  chat/deck path (`corpusChatService` -> `parseSlideBlocks` -> `slidePostProcessor`)
  has no equivalent gate.
- RC3 No domain dimension. Chunk retrieval (`chunkRetrieval.ts` pickChunksForPrompt)
  ranks by objective relevance; a chunk about "AI adoption" from any industry scores
  well for an "AI adoption" claim. Chunks carry no industry/domain tag, and the
  scope-match rule (.claude/CLAUDE.md, 2026-08-13) is prompt prose with no enforcement.
- RC4 URLs stop at the registry. `ChunkSourceInfo.url` and the resolved-chunk `{n, u}`
  source pairs exist (`registerResolvedChunkSources`), but rendered citations carry
  names only; the URL never reaches the slide data, the UI, or the export.
- RC5 No post-generation claims pass. The two-pass QA order (claims then prose) exists
  as doctrine; the runtime artifact path runs prose gates (slidePostProcessor,
  auditGate) but no claims-vs-corpus inspection.

## 3. The design principle: THE PROVENANCE LOCK

The model never authors source identity. Attribution is CODE-RESOLVED from chunk
pointers, end to end. A quote, named report, or statistic without a resolvable pointer
does not ship as sourced content: it is dropped, replaced, or explicitly labeled
unverified. This is Isabelle's NEW RULE generalized into architecture, and it is
industry-agnostic by construction: nothing below names an industry; the run's domain
profile is derived per engagement from the goal, the selected packs, and the uploads.

## 4. Workstreams

### WS-A Provenance-locked attribution (kills F1, F4)
- Schema: every evidence-bearing field in artifact JSON (quote blocks, evidenceBasis,
  citations[], stat callouts, "named report" references) becomes { text, pointer }
  where pointer is a manifest chunk id (`path#cN`) or a corpus item id. The generation
  prompts already instruct pointer citation (chunkRetrieval contract); the change is
  that the ATTRIBUTION STRING the model writes is IGNORED at render time.
- Render: `citationPointerRegistry.resolveManifestPointers` (extended) is the ONLY
  writer of visible source names. Model-authored labels are replaced by the registry's
  real `sources:` names. A pointer the registry cannot resolve renders as no citation,
  never as the model's label.
- Synthesis chunks resolve to their `resolved_sources` (existing straggler-14 bridge),
  so a Docyt-derived synthesis line says Docyt, never a guessed industry body.
- Files: deliverableFrameworks.ts (schemas), corpusChatService.ts (deck/artifact
  prompts + parse), slidePostProcessor.ts resolveCitations/resolveSlidesCitations,
  citationPointerRegistry.ts.

### WS-B Verbatim verification gate, runtime (kills F1, F4; the core gate)
- New `services/citationVerifier.ts`, run after parse and before preview/emit, on EVERY
  artifact path (hashtag artifacts, chat decks, refine, export re-render):
  1. For each { text, pointer } quote: fetch the chunk text (manifest read; the proxy
     already serves wiki pages), normalize whitespace/case, require the quote verbatim
     in-chunk (ellipsis-tolerant windowed match). Quotes are already required to be
     verbatim corpus sentences (Evidence-Label rule); now it is checked, not trusted.
  2. For each stat: the number token(s) must appear in the pointed chunk.
  3. For each named report/event/person in an attribution: the name must appear in the
     chunk's `sources:` or body. "Intuit Mid-Market AI Report" dies here.
  - Verdicts per element: VERIFIED / REPAIRED (re-pointed to the chunk that actually
    contains it, found via corpus search) / UNVERIFIED.
  - UNVERIFIED handling per Isabelle's rule: drop the element and narrow the slide, or
    swap in a verified alternative from retrieval; NEVER ship with a fabricated label.
    An explicitly-kept unverified claim renders with an "unverified, illustrative"
    label only on user command.
- Deterministic string work; zero model calls in the hot path. One optional flash
  arbitration only for paraphrase-suspect stats (text overlap below threshold).
- Extend `validate_chunk_citations.py` to the same contract for the dev harness.

### WS-C URL-carrying citations (kills F3)
- Thread `url` from ChunkSourceInfo / resolved-source `{n, u}` pairs through the
  registry into slide data: citations render as name + working URL (web preview:
  clickable; PPTX: URL in the sources line / speaker notes; verification ledger: the
  spot-check column). A citation whose chunk has no URL states its true provenance
  class instead (client upload, wiki synthesis of named sources) - honest, checkable,
  never dressed as an external publication.

### WS-D Topical scope-match gate (kills F2), industry-agnostic
- RUN DOMAIN PROFILE: derived at run start from the research goal, the selected pack(s)
  (each pack already declares its industry), and the upload synthesis (WS-2 intake
  fields). Stored on the run manifest. No hardcoded industry list; profiles are
  computed per engagement, so the same gate covers healthcare, energy, executive
  search, clubs, anything.
- CHUNK DOMAIN TAGS at ingest: pack-collected items inherit the pack's domain; uploads
  inherit the upload-synthesis domain; deep-research/synthesis chunks get a batch flash
  classification once at ingest (cached in frontmatter, never re-paid).
- At cite time: pointer domain vs run domain compared in citationVerifier.
  - Match -> fine.
  - Mismatch -> the element must carry an explicit cross-industry frame ("a nonprofit-
    sector benchmark", "in asset management distribution") or be swapped for in-domain
    evidence; the generation prompt gets this contract (ANALOG-LABELING clause), and
    the verifier enforces it (frame words present or verdict SCOPE-MISMATCH).
- Retrieval: pickChunksForPrompt gains an in-domain boost; off-domain chunks are
  admitted only when in-domain coverage for the claim is absent, and arrive pre-labeled
  ANALOG so the prompt frames them correctly. Cross-industry evidence stays available
  (analogs have real consulting value); it just can no longer masquerade as in-industry
  proof.

### WS-E The verification ledger as a product surface (productizes F5)
- After every artifact generation, the citationVerifier's output renders as a
  collapsible VERIFICATION LEDGER under the deck/artifact: exact claim | real resolved
  source | URL | verbatim verdict | domain verdict. This is precisely the table
  Isabelle demanded by hand, emitted by default.
- Flagged rows carry one-click repair: regenerate that slide/element with the flag as
  an anchored constraint (the WS-4 lock semantics respected).
- Pre-export check refuses (with override) while UNVERIFIED elements remain.

### WS-F Chat repair loop + learning (phase 7)
- Intent router (chatIntentRouter.ts) adds verify_sources: "these quotes look fake",
  "check the citations" -> run the ledger + repair flow; no STOP essay needed.
- Every confirmed fabrication/mismatch logs an edit-learning signal (which archetype,
  which field, which failure class) feeding the existing constraint learner, so repeat
  offenders tighten the generation prompts automatically.

## 5. Sequencing

S1 WS-A + WS-B (the lock + the gate: fabrication becomes structurally impossible on
   sourced elements) -> S2 WS-C (URLs end to end) -> S3 WS-D (domain profile, tags,
   retrieval boost, analog labeling) -> S4 WS-E (ledger UI + repair + export gate) ->
   S5 WS-F (chat intent + learning). Each stage: tsc + vitest (fixture corpus with a
   seeded fabrication, a seeded paraphrase-drift, a seeded off-domain chunk; the gate
   must catch all three), rebuild, owner checkpoint in the live app, commit on approval.

## Status 2026-08-17 (S1+S2+WS-E slice implemented, branch hic-v2-workspace-2026-08-14, local, NOT pushed)

SHIPPED (tsc clean; 82 files / 723 tests green incl. 10 new verifier tests; rebuilt :5011):
- WS-B `services/citationVerifier.ts`: extractEvidenceClaims (deep payload walk, pointer
  markers, attribution siblings), quoteAppearsIn (ellipsis-tolerant verbatim), statsAppearIn
  (numeric tokens), attributionMatches (two-tier: named-artifact labels need the PHRASE in
  source/names, so "Intuit Mid-Market AI Report" dies even though "Intuit" appears in the
  article; person/org labels need a significant token), verifyDeckEvidence (one cached
  /api/wiki/read fetch per cited page; unreachable page = UNVERIFIED never silent pass),
  applyVerificationFixes (ATTRIBUTION_FIXED relabels to real sources; UNVERIFIED strips the
  label; immutable via the WS-4 edit contract, undo-able).
- WS-C slice: citationPointerRegistry stores the {n,u} URLs it previously dropped
  (lookupPointerUrl / lookupSourceUrl); ledger rows carry the checkable URL.
- WS-E slice: CorpusChatPanel verifyAndAttachLedger on all three slide-lift paths (main
  response, chunked deck, safety-net); VERIFICATION LEDGER renders under each deck
  (auto-open when flagged: verdict chip, claim, cited-as vs real source, URL, note).
- WS-A slice: PROVENANCE LOCK block in the corpusChatService slide/deck system prompt
  (pointer-required claims, never author source identity, verbatim-only quotes,
  cross-industry analog framing mandatory).
- Tests include the incident end-to-end (fabricated report title -> ATTRIBUTION_FIXED ->
  payload relabeled to PYMNTS; missing quote -> label stripped; no pointer -> UNSOURCED)
  plus a REAL-corpus fixture (real wiki article sentence verifies; fabricated sentence
  against the same real page fails).

NOT YET IMPLEMENTED (next passes): WS-D domain profile + chunk domain tags + retrieval
boost (the analog-framing contract exists in the prompt only); WS-E one-click repair +
export refusal; WS-F verify_sources chat intent + edit-learning signals; extending the
verifier to the non-chat artifact paths (geminiService deliverables) and to CHUNK_XXX
legacy citations; per-chunk (vs page-level) verbatim scoping.

CO-WORK VERIFICATION: adversarial code-review agent + Playwright spa-smoke agent run on
this build; their findings and fixes are recorded below before any ship claim.

## 6. Acceptance criteria (her NEW RULE, generalized)

- No rendered quote, named report, or statistic without a resolvable pointer; visible
  source names are registry-resolved only, never model-authored.
- Every external citation carries a working URL (or its honest provenance class).
- A claim that cannot be verified is dropped, replaced, or explicitly labeled
  unverified; invented titles/events/speakers cannot reach a rendered surface.
- Off-industry evidence renders only with an explicit cross-industry frame, on every
  run, for any pack, industry, or upload mix.
- The verification ledger appears with every generated artifact, and her STOP workflow
  (audit -> review table -> approve -> regenerate) is one click, not an essay.
