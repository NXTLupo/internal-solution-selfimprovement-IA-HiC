# HiC artifacts vs Gemini Notebook (NotebookLM): quality audit, gaps, fixes — 2026-11-09

Phase advanced (hic-unified-vision): (6) routing/generation surfaces, (7) self-improvement in-path.
Baseline contract: the reverse-engineered NotebookLM specification in
`plans/notebooklm-studio-reverse-engineering-2026-11-03.md` Part 2 (clauses N1-N4, C1-C4, S1-S10,
U1-U3), compiled from the wondertools guide, the Windows wrapper's DOM observation points, and
public product documentation. The comparison is against that specification, not a live side-by-side
(no NotebookLM account is reachable from this environment); every HiC grade cites an artifact
GENERATED AND READ this session (2026-11-08/09) in the Northeastern engagement.

## Method

Each NotebookLM output clause is graded on five dimensions: PARITY (does the capability exist),
GROUNDING (citations to source passages; NotebookLM studio outputs carry none, clause S10),
WRITING (the four-round independent hic-output-qa critic verdicts from this session),
VERIFICATION (deterministic gates on what ships), and STEERING (format/audience options).
Grades: AHEAD (HiC beats the NotebookLM clause), PAR, BEHIND, with the evidence named.

## The audit matrix

| Clause | NotebookLM | HiC today | Grade + evidence |
|---|---|---|---|
| S1 Audio Overview | two-host podcast; 4 formats | #audio-overview: two-voice MP3 (ElevenLabs) + cited transcript + deterministic figure/citation verifier (verifyDialogTurns) + 4 formats as of TODAY (leading format word: brief / critique / debate / default long form) | AHEAD on grounding + verification (NotebookLM audio cites nothing; HiC's transcript is pointer-cited and figure-gated: live run 2026-11-08 shipped zero fabricated figures on an empty corpus); PAR on formats (shipped this audit); BEHIND on interactive join (NotebookLM lets the listener interrupt; HiC has no live mode) |
| S2 Video Overview | narrated slideshow, 2 lengths | #video-overview wired + proven live 2026-11-03 (W9) | PAR; length steering rides the prompt |
| S3 Briefing doc | ~2-3K words, no citations | #brief: chain line 2026-11-09 "14 pointers resolved, 9 origins, 0 blocking, prose 0.98"; copy read | AHEAD (cited + gated + critic-schooled) |
| S3 Explainer | report format | #explainer: "21 ptr / 11 org / 1 blk / prose 0.99"; judgment title, 2 contrast hits in 104 sentences | AHEAD |
| S3 FAQ | report format | #faq: "30 ptr / 20 org / 0 blk / prose 0.99"; real student questions, named-source answers | AHEAD |
| S3 Study guide | report format | #studyguide: "88 ptr / 25 org / prose 0.99"; zero contrast templates in 89 sentences | AHEAD |
| S3 Timeline | chronology from sources | #chronology: "28 ptr / 24 org / 0 blk / prose 0.98"; dated cited entries | AHEAD |
| S3 Critique | weaknesses in sources | #critique: "54 ptr / 20 org / 0 blk / prose 0.98"; honest independence-aware verdict quoted in the prose plan | AHEAD |
| S3 Debate | multiple perspectives | #brief-dialog debate format (today) + the long-standing two-voice engine with verified citations | AHEAD on grounding |
| S4 Mind Map | interactive nested map, click-to-chat | #mindmap: radial renderer + click-to-chat; needs >= 3 themes | PAR (persistence gap: IndexedDB only, see U2) |
| S5 Flashcards | term cards; count/familiarity steering | #flashcards wired (W3) + W8 smoke-proven; steering rides the prompt text | PAR (steering is prompt-native, not a picker) |
| S6 Quiz | MCQ + explanations | #quiz: "33 ptr / 13 org / 23 narrowed / prose 0.97"; every answer carries the pointer + why-the-distractor-is-wrong | AHEAD |
| S7 Data Table | entities x attributes | #datatable: "66 ptr / 14 org / 0 blk / prose 1.00"; VS-picked table shape, Sources column per row | AHEAD |
| S8 Infographic | standalone, 3 aspect ratios | #infographic shipped during this audit: content-true element + native renderer + 3 aspect words | PAR (solved below) |
| S9 Slide Deck | detailed/presenter, PDF | #slides DECK MODE + native editable PPTX + archetype registry + chain gates (deck AIR 2026-11-09: prose 0.994, slop_sites 0, layout 6/6) | AHEAD |
| S10 (weakness) | studio outputs carry NO citations | every HiC artifact keeps the citation protocol + claim-ledger gate + NAKED_FIGURE + prose signal + repair-safety filter | AHEAD (the central structural win) |
| N1 Upload intelligence | instant summary + questions per source | sourceIntelligence.ts (W6) | PAR |
| C1 Citation chips | chips resolve to the passage | W1: pointer-preserving chips + passage viewer | PAR |
| C2 Source scoping | checkbox rail scopes everything | W2: scope rail + sessionConstraints.setSourceScope | PAR |
| C4 Suggested questions | notebook-level AND after each answer | DynamicPromptChips was goal/corpus-keyed only; TODAY: the latest substantial answer feeds the chips and at least two become follow-ups | PAR (shipped this audit) |
| U1 Studio panel | one-click tiles | StudioPanel.tsx (W4) | PAR |
| U2 Unified gallery | everything saved in the notebook | uplift kinds now dual-write to /api/artifacts (shipped this audit): #artifacts lists and relaunches them; decks/presentations/prototypes keep purpose-built stores | PAR for documents (solved below) |
| U3 Completion toast | notify on long renders | audio/video handlers post chat completion messages | PAR |

## Where HiC is categorically ahead (the quality half of the audit)

NotebookLM's studio outputs are fluent but uncited and unverified (S10). Every HiC artifact family
now runs, live-proven this session: manifest-chunk grounding -> the claim-ledger gate (pointer
resolution, verbatim-quote check, independence, modality, NAKED_FIGURE incl. headings) -> bounded
narrowing repair with a safety filter that rejects broken rewrites -> the prose signal (cadence,
actors, contrast templates, verdict enders) with voice-only repair -> coverage appendix with
dedupe + verbatim-quote discipline -> publication-name citations. The independent hic-output-qa
critic took the long-form report from FAIL (10.7% contrast-template saturation) to "the main-body
prose now clears the senior-editor bar" across four adversarial reviews, and its findings were
fixed at chokepoints, not patched per-artifact. No NotebookLM output has an equivalent of any of
these layers.

## Where NotebookLM was still ahead, and what was done (both BEHIND items SOLVED same day)

1. S8 STANDALONE INFOGRAPHIC: SOLVED. `#infographic` catalog entry (analysis modality) +
   UPLIFT handler: the model writes ONE content-true element from the grounded corpus (steps /
   comparison / stats whose values ride verbatim quoted passages, per the Quantitative Claim
   Rule), `infographicSpecFrom` builds the spec, the proxy's native renderer draws it; aspect
   steering via a leading landscape/portrait/square word; content-true fallback to session
   themes; registry #help entry added; pinned catalog test updated.
2. U2 UNIFIED GALLERY: SOLVED (the load-bearing half). Every uplift kind (mindmap, brief-dialog,
   audio-overview, meta-themes, deep-research, infographic) now DUAL-WRITES its rendered HTML to
   /api/artifacts beside the Design Desk store, so #artifacts lists it, LAUNCH opens it on any
   machine, and the chat reply names the saved slug. Best-effort: a store hiccup never fails the
   run. Deferred remainder: decks/presentations/prototypes keep their own stores by design (they
   are not HTML documents); a single cross-store gallery view stays future work.
3. S1 INTERACTIVE AUDIO (BEHIND, accepted): NotebookLM's join-the-conversation mode needs
   streaming TTS + live session plumbing; out of scope for the artifact factory. The four
   formats + verified transcript are the right trade.
4. S5/S6 STEERING PICKERS (PAR, accepted): count/difficulty already steer through prompt text
   ("20 advanced cards on X"); a picker UI adds chrome without capability.
5. Card-title concision (the critic's last open writing item): copy-critic rule 6b now tightens
   any title over 12 words / 80 chars while keeping the judgment and the actor, with the live
   20-word theme title as the worked example.

## Shipped in this audit (today)

- S1 formats: `parseDialogFormat` + FORMAT_BLOCKS in briefDialogService; both #audio-overview and
  #brief-dialog accept a leading brief/critique/debate word (default long form unchanged); the
  debate format lifts the one-concession rule. 4 new tests pin the parser.
- C4 follow-ups: SuggestionState.lastAnswer; the chat chips now read the latest substantial
  assistant answer and at least two chips are follow-up questions to it.
- Citation display layer (the critic's "single highest-value remaining change"): displaySourceName
  maps feed slugs to publication names ("aws ml blog" -> "AWS Machine Learning Blog", one Reddit
  Deep casing, slug title-casing fallback) at formatCitationLabel and the coverage appendix cite.

All typechecked, tested (gate + dialog + coverage suites green), container rebuilt.

## THE HEAD-TO-HEAD: the owner's own real Gemini Notebook artifact, same client (2026-11-09)

Found via the connected SharePoint: "NE Transcript Summary from NotebookLM.docx" (SOW 005 NU
Giving, two copies, modified 2026-02-26), a REAL NotebookLM-generated summary of the owner's own
Northeastern advancement call (Chris, VP Digital Marketing; Jen Brant-Gargan, CIO). Scored with
the SAME deterministic instruments applied to every HiC artifact this session:

| Instrument | NotebookLM summary (real, same client) | HiC #brief / #report (this session) |
|---|---|---|
| Citations / attributions of any kind | 0 in 24 sentences; nothing is traceable to a transcript passage | 14-85 pointers resolved per artifact, 9-35 independent origins, every quote carries its source |
| Hard figures outside quotes | 2 as the model's own assertions ("$1.5 billion", "15+") | 0 (NAKED_FIGURE gate; figures ride only inside verbatim quotes) |
| Quoted fragments without a verification mechanism | 16 ("PVC pipe", "fill the pipeline", "power hosing"...), plausibly real, unverifiable from the artifact | UNVERIFIED_QUOTE gate: every quoted span is checked verbatim against the cited chunk, else removed |
| Source-as-subject meta openers | 4 of 24 sentences ("This transcript details...", "The dialogue concludes...") | Banned and stripped (Subject Discipline + meta scrub); the critic verified zero on v4 |
| Interface chrome in the deliverable | The exported doc carries the chat timestamp ("Today - 10:11 AM"), the operator's full prompt, and the suggested-question chips | Chrome gate strips model-authored chrome; the reader sees the document only |
| Contrast-template saturation | 0 (good) | 0-2 per artifact post-fix (par) |
| Writing fluency and organization | Genuinely good: clear structure, named actors, actionable opportunity list | Comparable after the voice-contract work; independently reviewed to the senior-editor bar |

SECOND REAL ARTIFACT, different type: "YouTube Analysis.docx" (SOW 002, Application and
Enrollment), a NotebookLM research ANALYSIS on the same client, the direct counterpart of HiC's
#report/#brief family. Same instruments:

| Instrument | NotebookLM "YouTube Analysis" (real) | HiC #report/#brief (this session) |
|---|---|---|
| Resolvable citations | 0. The tool's citation chips EXPORTED AS DEBRIS: ten digit-runs fused to sentence ends ("beyond just grades.1234", "abilities.25") that resolve to nothing in the document | Every pointer renders as a linked, dated, named citation; a dated source index is appended |
| Naked figures outside quotes | 6 asserted in the model's voice ("73 acres", "28,000", "20%", "87%", "12%") in an unattributed "Important Facts" block | 0 (NAKED_FIGURE gate) |
| Ingestion verification | A quoted source line praises "The faculty at northwestern" inside a NORTHEASTERN analysis: transcription garbage shipped unverified | UNVERIFIED_QUOTE + UNVERIFIED_IDENTIFIER gates check every span and name against cited chunks |
| Template chrome | "Left Header Right Header" placeholder text printed three times in the deliverable | Chrome gate strips model/template chrome |
| Meta openers | "This document summarizes...", "The sources reveal..." | Banned and stripped |

ESTATE-LEVEL FINDING: of 71 SharePoint matches for NotebookLM, roughly 50 are manually curated
INPUT folders ("Transcripts for NotebookLM", "PDFs for NotebookLM"): the team hand-prepared and
hand-fed every source, the step HiC's upload pipeline and source packs automate. Only TWO
generated artifacts ever left the tool (both scored above), plus notebook .url links whose
notebooks may no longer exist. No mind map, quiz, flashcard, study-guide or audio export exists
anywhere in the estate: those NotebookLM output types stayed trapped in the tool, while every
HiC artifact is a portable, relaunchable, re-openable document in the gallery.

Verdict on the owner's real artifacts: NotebookLM's prose is fluent and the structure useful,
which is exactly why the owner rates it, but NOTHING in it can be checked: no claim, no quote
and no figure carries a path back to the transcript, the two figures are asserted in the
model's own voice, and the deliverable ships with the operator's prompt and chat chrome inside
it. The same engagement's HiC artifacts carry a verifiable trail on every sentence. The
client-side pain list in the owner's own design-research doc (DesignResearch_Maturity.docx)
corroborates: NotebookLM at the client suffers "Unguided usage", "Limited Tool knowledge" and
"Inability to locate past research", the retrieval/organization layer HiC's engagement wiki and
#artifacts gallery exist to solve. Seventy more SharePoint matches remain if a wider sample is
ever wanted.

## Direct evidence from REAL Gemini Notebook outputs (public, 2026-11-09)

The account wall blocks generating fresh NotebookLM outputs here (next section), but two
independent public sources carry analyzable REAL output, and they settle the central quality
question directly:

1. A published Whisper transcript of a real Audio Overview (Simon Willison's analysis,
   simonwillison.net/2024/Sep/29/notebooklm-audio-overview/): the spoken output contains NO
   source names, NO citation markers and NO attribution to specific documents anywhere; claims
   are "warm, confident, and largely unqualified"; the author's own flag is sycophancy (an
   episode about himself was embarrassingly complimentary) and he does not verify factual
   accuracy. Sample register: "He's a builder. He's a sharer."
2. A 2026 heavy-use practitioner guide (70 notebooks, dankershaw.substack.com/p/70-notebooks-later):
   chat answers and FAQ pairs carry citations, but Studio outputs are "a starting point, not a
   final product"; a slide deck "is a draft. It needs human editing"; the author frames the value
   as "starting at 70% instead of zero"; retrieval accuracy "degrades as you approach the
   ceiling" and the tool "can occasionally contradict itself across responses".

Head-to-head on the same dimensions, against HiC's session artifacts:

| Dimension | Real Gemini Notebook output (evidence above) | HiC session artifact (this session's runs) |
|---|---|---|
| Audio: citations in output | NONE in the spoken output or transcript | Every transcript line carries its corpus pointer; the player page shows the cited transcript |
| Audio: figure safety | Unverified; author flags sycophancy, skips accuracy | Deterministic verifyDialogTurns: a figure exists only where the cited passage carries it (live: zero fabricated figures on an empty corpus) |
| Audio: production realism | Strong (banter, disfluencies, "very podcast-like") | Two fixed ElevenLabs voices, no banter engine: NotebookLM WINS this dimension |
| Documents: finishedness | "A draft. It needs human editing" (author's words) | Four independent critic reviews drove the report to "the main-body prose now clears the senior-editor bar"; gates run before save |
| Self-consistency | "Can occasionally contradict itself across responses" | Claim ledger + independence checks on every shipped sentence |
| Verifiability of any claim | Chat yes; studio outputs no | Every artifact: pointer-resolvable citations, 25-86 independent origins per document |

The honest two-way verdict: Gemini Notebook wins audio production realism and one-click polish;
HiC wins every dimension a consulting reader can check (citations, figure safety, verification,
editorial finish), and the public evidence confirms the spec's S10 clause on real outputs, not
just on paper.

## Live NotebookLM comparison: attempted, blocked by auth, protocol ready for the owner

> SUPERSEDED same day: the owner signed the session browser into Google and the full live run
> happened. See "THE LIVE RUN" at the end of this file. This section stays as the access record.

Attempted 2026-11-09 from the session browser, three ways, all terminating at the Google
Accounts credential form: (1) notebooklm.google.com redirects to notebook.google.com/trynow
("Gemini Notebook"), whose only path in is "Sign in to Gemini Notebook"; (2) the sign-in
button itself; (3) a PUBLIC featured notebook (The Economist "World Ahead",
notebooklm.google.com/notebook/5881d15d-...) also bounces straight to sign-in, consistent with
Google's own support page ("share a link with anyone WITH A GOOGLE ACCOUNT"). The eight
featured-notebook URLs are recorded below for the owner's run. No anonymous mode exists
anywhere, the Playwright profile holds no Google session, and signing in requires the owner's
credentials, which an agent must not use.

Featured notebooks (real Gemini Notebook artifacts, one click once signed in): Eric Topol
longevity (780a38ee...), The Economist World Ahead (5881d15d...), Arthur C. Brooks columns
(750a23df...), Yellowstone (1e5735b3...), Our World in Data wellbeing (0d5cd576...),
Techno Sapiens parenting (505ee4b1...), Shakespeare complete works (19bde485...),
Q1 top-50 earnings (e4ddc6f8...), each at notebooklm.google.com/notebook/<id>. The audit above therefore grades against the reverse-engineered
specification (itself compiled from the product's observed DOM and documentation), and the
spec file records each clause as testable.

OWNER PROTOCOL (about 30 minutes, closes the loop whenever desired):
1. Sign into notebook.google.com (or sign the session's Playwright browser in and ask the
   agent to drive the rest).
2. Create one notebook; add the same evidence the HiC session used: the Northeastern uploads
   plus these, the session's 14 most-cited sources (extracted 2026-11-09 from the shipped
   artifacts' own citation links, ordered by citation count), paste-ready:
   - https://www.anthropic.com/research/claude-personal-guidance
   - https://www.reddit.com/r/MuseAgent/comments/1wr7rtl/a_beginners_stepbystep_guide_to_muse_from_signing/
   - https://www.reddit.com/r/MuseAgent/comments/1wp3d8z/metas_docs_is_for_normie_and_i_have_to_ask_to/
   - https://www.reddit.com/r/artificial/comments/1vu97uc/looking_at_agent_setups_that_can_actually_run/
   - https://www.reddit.com/r/AcademicPsychology/comments/1uk8jq4/why_are_people_relying_on_ai_technology_for/
   - https://www.reddit.com/r/MuseAgent/comments/1xbl8fe/i_run_my_companies_with_a_team_of_ai_agents_heres/
   - https://www.reddit.com/r/ClaudeAI/comments/1ww9nq3/i_use_claude_daily_but_i_know_im_only_using_a/
   - https://venturebeat.com/security/when-agents-act-on-their-own-governance-has-to-live-in-the-data-layer
   - https://www.reddit.com/r/artificial/comments/1un62q0/other_than_writing_emails_and_summarizing_reports/
   - https://theconversation.com/ai-can-help-with-academic-research-but-doesnt-always-get-it-right-here-are-some-ti
   - https://arstechnica.com/gadgets/2026/10/google-admits-ai-search-makes-less-money-but-its-fixing-that-with-more
   - https://developer.nvidia.com/blog/how-to-carry-user-identity-across-federated-kubernetes-and-ai-platforms/
   - https://www.reddit.com/r/jobs/comments/1s594k6/how_are_yall_handling_ai_screening_and_tailoring/
   - https://www.reddit.com/r/NEU/comments/1rr2mdp/your_neu_claude_account_data_belongs_to_the/
3. Generate the five head-to-head outputs: Audio Overview (default + brief), Report (briefing
   doc), Study guide, Mind Map, Quiz.
4. Score both sides with the same two instruments already used on HiC this session: the
   nine-criterion copy bar in plans/artifact-prose-voice-chokepoint-2026-11-08.md, and the
   hic-output-qa critic prompt (paste the NotebookLM output in as the artifact under review).
5. Record per-output: citations present (yes/no + resolvable), figures outside quotes, title
   quality, actor rule, and whether any claim can be traced to a source passage. The S10
   prediction to test: NotebookLM outputs will score zero on citation resolvability.

## Critic open-items closure ledger (every item from the four hic-output-qa reviews)

| Item | Closure |
|---|---|
| Caption/table register (abstract subjects) | CLOSED in code: ABSTRACT_SUBJECTS extended (behaviors, work, process, sequence, actions, parameters...); the prose stage now targets those rows |
| Paraphrased figures outside quotes | CLOSED and critic-verified on v4: NAKED_FIGURE gate (prose + headings + citations-in-headings); "every number in the document now rides inside a verbatim quote" (fourth review) |
| Report title/heading concision | CLOSED and critic-verified on v4: chain heading repair; "All seven section H2s are 11-13-word action titles", main title 10 words |
| Card-title concision (theme/persona) | CLOSED in code: copy-critic rule 6b (over 12 words / 80 chars -> tighten, judgment kept); next card generation exercises it |
| Feed-slug citation names | CLOSED in code + unit-pinned: displaySourceName (services/citationDisplayName.test.ts); next chain run renders publication names |
| Repair-pass damage (broken splices, flattened quotes, unclosed quotes) | CLOSED and live-proven: repairIsSafe rejected 4 broken rewrites on the v4 run; quote spans survive character-for-character |
| Appendix duplicates / quoteless entries / truncated titles / grammar | CLOSED in code after the v4 render: near-duplicate merge, one-quote-per-entry, ellipsis strip, article tidy; the v4 artifact predates the fix and regenerates clean on demand |
| Composite persona voice | OPEN BY DECISION: a genre call for the owner (one card stitching several practitioners), surfaced in the critic report, not hidden |

## Commit status

Everything remains uncommitted on `hic-clarification-and-ledger-2026-08-26` because the standing
rule reserves commits for the owner's explicit approval; that approval is the one action no agent
can perform. The branch is staged, tested and live-verified for review.

## Live proof of the two solved BEHIND items (2026-11-09)

- #infographic ran twice through the UI. Run 1 exposed a subject-discipline leak (the model
  titled the element "The provided corpus contains no evidence regarding stud..."), which was
  fixed at TWO layers (a SUBJECT DISCIPLINE clause in the element prompt + a deterministic
  meta-title net that substitutes the user's own subject line). Run 2, square aspect: title
  "Students must navigate a strict approval process to connect...", native render in 67.2s,
  no fallback.
- The gallery dual-write fired on both runs: each chat reply names the saved slug and
  "#artifacts" now lists and relaunches uplift artifacts like any HTML document.
- Copy-critic rule 6b (title length) and the S1 audio-format steering (live run: 8 turns /
  391 words under the brief budget, format word stripped from the heading) complete the set.

## THE LIVE RUN: fresh Gemini Notebook outputs, driven end-to-end (2026-11-09, afternoon)

The owner signed the session's Playwright browser into Google ("im signed in") and the agent drove
the whole protocol: created notebook `25078bb9-e656-434d-bf21-668c6305f615` ("HiC Head-to-Head:
Student AI and Northeastern Connectors"), added the 14 staged source URLs from the owner protocol
above, and generated six Studio outputs. The notebook remains in the owner's account for direct
inspection.

### Run facts

- Ingestion: 12 of 14 sources ingested; theconversation.com and venturebeat.com FAILED with error
  badges (silent degradation: every generation ran on 12 sources with no warning in the outputs
  themselves). HiC equivalent: the GenerationReceipt names degraded sources per run.
- Outputs generated: Briefing Doc report, Study Guide report, Mind Map, Quiz (10 questions),
  Data Table, Audio Overview (Deep Dive, default length).
- Capture method: full innerText extraction of each report via the DOM (what copy/export yields),
  DOM citation-element counts, accessibility-tree reads for the iframe-hosted Quiz and Mind Map,
  screenshot of the Mind Map.

### Per-output scorecard (same instruments as the HiC artifacts this session)

**1. Briefing Doc, "Executive Briefing: Enterprise AI Architecture, Financial Realities, and
Behavioral Governance" (~2,900 words)**
- Citations: ZERO. The report viewer (`labs-tailwind-doc-viewer`) contains zero citation chips,
  zero sup elements, zero buttons; the text carries no source names beyond those that appear
  inside sentences. Not one claim is traceable to a source passage from the deliverable itself.
  The S10 prediction held exactly.
- Naked figures: 40+ in the model's own voice (revenue, EPS, capex, percentages from the
  Anthropic study, "9,434 business calls", "~78 sessions weekly", "55% reduction"). Under the
  claim-ledger gate every one would be blocked or forced into a quoted span.
- Self-reference: "This briefing document synthesizes key developments..." in the opening
  paragraph (banned process language under the HiC contract).
- RENDERING DEFECT (new finding): dollar figures are mangled by a math-mode parser. Verbatim from
  the export surface: "nearly 128billioninQ32026,Alphabet(Google)experiencedasignificantmarket
  capitalizationdrop( 122.12 actual vs. 3.02projected)" - adjacent words fused, $ signs eaten,
  and "$2.12" corrupted to "122.12" in one spot while the table says $2.12 (the same document
  contradicts itself). The Study Guide shows the identical defect ("over 26billion,missing
  earningspershareprojections(2.12 actual vs. 3.02expected)").
- Titles: every heading is a topic label ("1. Commercial AI Financials and Market Dynamics");
  zero action titles.
- Genuine strengths, recorded honestly: strong information architecture (comparative matrices,
  ASCII flow diagrams that are collision-free and content-true), dense synthesis across all 12
  sources, correct attribution of the NVIDIA pattern and the Anthropic study inside prose, and
  zero hedge filler. Fluency is comparable to HiC's post-chokepoint prose.

**2. Study Guide report ("Comprehensive Study Guide: Multi-Agent Architectures...")**
- Citations: zero chips, zero source names in the answer key beyond in-sentence mentions.
- Same $-mangling defect; same naked-figure density in the answer key.
- Strengths: 10 well-formed short-answer Q/As, 5 essay prompts, an 18-term glossary; the glossary
  definitions are accurate to the sources.

**3. Data Table ("Claims and Implications of Student and Professional AI Assistant Usage") -
NotebookLM's BEST-GROUNDED output, recorded against our thesis**
- Every row carries: a named source descriptor ("r/MuseAgent post by u/cgallic", "Anthropic
  Research", "u/NikeCool79 (Reddit user)"), a VERBATIM supporting quote, and a numbered [1]-[6]
  citation resolvable in-app. This is the one Studio surface that matches HiC's Evidence-Label
  pattern (claim + verbatim quote + named source). On copy-out the [N] markers survive as plain
  brackets (degraded but not debris).
- Weaknesses: the "implication" column is uncited model editorialization (acceptable, labeled);
  figures appear but inside quoted spans, which would PASS the HiC gate. The audit matrix's
  "S10: no citations anywhere" clause must be narrowed: Data Table is the exception.

**4. Mind Map ("AI Agents Mind Map")**
- Root + 6 branches (Meta Muse Onboarding and Setup; Advanced Agent Capabilities; Multi-Agent
  Systems and Shared Brain Architecture; Optimizing Workflows and Overcoming Pitfalls; Enterprise
  AI Platforms and Economics; AI Guidance and Sycophancy Research), 3-5 children each. Clean,
  faithful clustering. Keyboard-navigable tree, zoom, and a "Download mindmap as image" button
  (so not fully trapped; image-only export, no data form, no node citations). HiC #mindmap:
  nodes carry chunk references with click-to-chat drill-down and the HTML lands in the gallery.
  Verdict stays PAR on structure; HiC ahead on provenance and reuse, NotebookLM ahead on polish
  of the interactive viewer.

**5. Quiz ("Artificial Intelligence Quiz")**
- 10 scenario-based MCQs (A-D), rendered inside a cross-origin usercontent.goog iframe; no
  citations on questions; content quality high (questions test mechanisms, not trivia). Not
  exportable: the host DOM cannot even read it, which is the "trapped in the tool" estate
  finding reproduced live.

**6. Audio Overview (Deep Dive)** - generation pending at write time; result appended below.

### Live-run verdict

The fresh outputs reproduce the estate findings almost clause for clause: text reports ship with
ZERO resolvable citations and dozens of naked figures in the model's own voice, plus a new
export-corruption defect ($-math mangling) and silent 2-source ingestion failure. The one genuine
counterexample is the Data Table, whose per-row verbatim-quote grounding matches HiC's
evidence-label contract and must be credited: the matrix clause "S10: studio outputs carry no
citations" is now "all EXCEPT Data Table". Mind Map and Quiz are strong interactive learning
surfaces with no provenance. Nothing in the live run moves any HiC BEHIND verdict; both former
BEHIND items were already shipped and live-proven earlier today.

### 6. Audio Overview, scored from a full Whisper transcript (appended as promised)

"How To Manage Autonomous AI Agents", 23:41, Deep Dive format, ~4,300 spoken words. The agent
downloaded the m4a (NotebookLM offers a real audio download, credit where due) and transcribed it
through the platform's own Video Analyzer (job ee8cf989, Whisper, 77 seconds). Scored on the
plain-text half of the transcript:

- Spoken attributions EXIST at the organization level: Anthropic named 5 times, NVIDIA 4,
  Ars Technica 1, "a Reddit user [with ADHD]" for the Notion story. This is BETTER than the
  public simonwillison sample (zero attributions) and the finding is corrected accordingly:
  the Deep Dive names its source organizations but never ties any claim to a passage, and no
  listener can resolve "a source here" to a document.
- Naked figures spoken as host assertions: about 11 distinct ($128 billion, $30 billion,
  $9.06 billion, $300 billion, 55%, 12%, 19%, 6%, 25%, 9,434 calls). Same figures the text
  reports carry; same gate failure.
- Podcast chrome by design: "Welcome to today's Deep Dive", "our mission for you today",
  "Thanks for taking this deep dive with us". HiC's dialog contract bans greetings; NotebookLM's
  genre requires them. Noted as a genre difference, not graded as a defect.
- Slop: one each of "fundamental shift", "robust", "ecosystem". Low density.
- Production quality: high. A sustained opening analogy (a Lamborghini in a traffic jam you
  built), natural two-host banter, a closing provocation about personalized echo chambers that
  goes beyond the sources (mild unsupported editorializing).

Audio verdict refined: NotebookLM wins audio production and now also shows coarse spoken
attribution; HiC keeps the provenance win (per-turn chunk citations in #audio-overview and
#brief-dialog) but its TTS leg was degraded on audit day (ElevenLabs 401, owner key item), so
NotebookLM shipped 23 minutes of real audio while HiC shipped a cited transcript with an honest
degradation notice. Closing that key restores the full head-to-head.
