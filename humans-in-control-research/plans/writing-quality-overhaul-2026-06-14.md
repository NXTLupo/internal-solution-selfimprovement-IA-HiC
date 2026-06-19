# Writing-Quality Overhaul (VS + RI) — 2026-06-14

Goal: significantly improve and HUMANIZE the copy across HiC chat responses, themes,
and hashtag artifacts, driven through hooks + expert skills + self-improvement +
sub-agents + the manifest/second-brain channel. No hardcoded prompt-stuffing, no RAG.
Source: the 100-rule Anti-Slop Field Guide (anti-slop-field-guide.md).

## A. The field guide vs our current rules (compare / contrast)

Current enforcement surfaces (audited 2026-06-14):
- HOOKS: precheck_slop.py (PreToolUse, blocks writes), validate_output.py (Stop, blocks
  inside :::fences), validate_no_em_dashes / validate_no_emoji / validate_titles /
  validate_budgets / validate_self_referential_freeform / validate_text_hierarchy /
  validate_speculative_claims (Stop, blocking), validate_ai_slop + validate_freeform_structure
  (Stop, SHADOW-ONLY, never block).
- SKILLS / PROMPT: .claude/CLAUDE.md (350+ prose list), nxt-visual-renderer/anti-slop-rules.md
  (near-duplicate), deck-narrative-composer + theme-analyst (Quality Discipline v2 -> point at CLAUDE.md),
  corpusChatService PLAIN-VOICE block (3rd hand-curated subset).
- RUNTIME: slidePostProcessor.ts SLOP_PHRASES (350+) + META_NARRATION_PATTERNS + METAPHOR + PROCESS_REWRITES;
  wikiService.ts BANNED_PHRASES (a SECOND 350 array, different 13-category taxonomy).

Coverage map vs the guide:
- ALREADY enforced (blocking): em-dash, emoji, meta-narration, self-reference/process language,
  QA annotations, topic-label titles, content budgets, unsourced statistics, citation discipline
  (chunk pointers), all-caps shouting. These map to guide Rules 4-6, 19, 20, 29-30, 43, 51, 81-92.
- DETECTED but NOT enforced (shadow only): negative parallelism (Rule 23 - the guide's "single most
  reliable tell"), rule-of-three triads (24), mid-sentence rhetorical question (25), copula avoidance
  (12, partial), press-release voice. The most reliable structural tells are logged, never blocked.
- NOT covered at all: burstiness / sentence-length variance (31), same-opener cadence (33, 76),
  passive voice (67), Tier-2 cluster logic (2), dangling "-ing" significance clauses (26),
  stacked hedging (27), sanitization-before-scan everywhere (97), weighted slop-score gate (95),
  one bounded rewrite-from-source repair (96), and ALL of Pillar 4 positive voice
  (active voice, contractions per register, trust-the-reader, real position, Orwell rule-6 override).

## B. Inconsistencies (new guide vs our existing rules) - the explicit deliverable

1. TITLE RULE CONTRADICTS ITSELF AND THE GUIDE. validate_titles.py requires a DATA_PATTERN
   (%, $, "N students") OR an action verb. The guide (Rules 14, 46, 58, Caveats) says quantification
   is NOT a quality signal: a title earns its place by being SPECIFIC + CONTESTABLE, never by carrying
   a figure. HiC's OWN Quantitative Claim Rule bans naked numbers in titles. So the hook rewards exactly
   what the master rule bans. FIX: drop the DATA requirement; require a contestable claim (verb/assertion
   someone could disagree with) AND reject generically-true titles ("Customer experience matters").
2. FLAT BAN vs TIER-2 CLUSTER. We hard-ban enhance / comprehensive / significant / vital / paramount
   outright (verbal-tics uplift). The guide Rule 2 says these are fine in isolation, flag only in CLUSTERS
   (2+ per paragraph/slide). Our flat ban over-flags legitimate usage. FIX: split the lexicon into
   Tier-1 (always) vs Tier-2 (cluster) and enforce accordingly.
3. STRUCTURAL TELLS DETECTED, NEVER BLOCKED. validate_ai_slop.py (negative parallelism, triads,
   rhetorical questions, copula) is permanently shadow-mode. The guide ranks these the MOST reliable.
   FIX: promote to a weighted slop-score gate (after a shadow-measured FPR ramp).
4. EM-DASH. We hard-ban U+2014 everywhere (3 hooks). The guide (Rule 98 + Caveats) treats it as a WEAK
   signal / legitimate human punctuation. DELIBERATE DIVERGENCE: keep our hard ban (standing user rule);
   note it is stricter than the guide.
5. REPAIR PHILOSOPHY. Our runtime strips/deletes sentences (removeMetaNarration) = paraphrase-class.
   The guide Rule 96 says paraphrase preserves the cadence tells; use ONE bounded "rewrite-from-source".
   We already HAVE that primitive (the reinforcement-inference skill / anchored re-ask) but it is not
   wired as the slop-repair pass. FIX: wire RI as the single bounded repair.
6. NO SINGLE SOURCE OF TRUTH. The banlist lives in 5-6 hand-maintained copies with divergent taxonomies
   (Rule 99 violated). FIX: one canonical lexicon both prompt and validators import + a drift guard.
7. SANITIZE-BEFORE-SCAN is partial. A banned word inside a verbatim corpus quote can be flagged
   (false positive). Guide Rule 97. FIX: strip code/quotes/URLs/[CHUNK] before lexical scans everywhere.
8. NO POSITIVE VOICE. ~95% of our rules say what NOT to write. The guide Pillar 4 prescribes how good
   prose reads. FIX: a human-voice-editor expert skill + a positive-exemplar page.

## C. Verbalized sampling (tail-weighted, p<0.10) -> selected design

Decision A - lexicon architecture: SELECT a SINGLE canonical lexicon as a manifest-chunked wiki page
(wiki/frameworks/anti-slop-lexicon.md) carrying Tier-1 / Tier-2 / multiword / structural-regex / openers,
with a generated structured JSON the Python hooks AND the TS post-processor import, AND a
/api/design-tokens-style prompt block so generation is TAUGHT it (anti-RAG, second-brain native).
Drift guard fails the build if prose and arrays diverge. (Rules 99, 22.)

Decision B - enforcement: SELECT a tiered WEIGHTED slop-score gate (structural 3x word hits; Tier-2 only
in clusters), sanitize-first (Rule 97), promote the shadow structural detectors after a measured-FPR
ramp, and ONE bounded rewrite-from-source repair via the reinforcement-inference skill (Rules 94-96).

Decision C - humanize: SELECT a human-voice-editor expert SKILL (Pillar 4) wired via composes_with so it
auto-loads as a QUALITY ENHANCER for every deliverable + chat (no extra hashtag, no prompt-stuff), plus a
positive-exemplar page (target prose, not only prohibitions), plus burstiness/same-opener as a measured
hook metric feeding the slop score.

Decision D - self-improvement: SELECT the lexicon-feedback loop ("never use X" / "X is fine" chat feedback
-> logChatFeedback(type:rule) -> learned-constraints -> prompt + hook), relaxing constraintQualityGate's
40-char floor for short lexicon rules; plus a SkillOpt monthly refresh pass that proposes lexicon edits
from slop-flagged rollouts + the public lists (Kobak excess-vocab, GPTZero), gated by skillopt-validation-gate.

## D. Reinforcement inference - anchored critique of the selection (keep / revise)

- B REVISE: blocking structural detectors risk false positives on legitimate quotes/domain terms ->
  sanitize-first (Rule 97) + Tier-2 cluster logic + the Orwell rule-6 override (Rule 78: log an exception,
  never force barbarous output) + ship the structural gate in SHADOW first, measure FPR, then promote.
- A REVISE: collapsing 5-6 lists risks regressing the precheck hook that guards my own writes ->
  build the canonical lexicon ADDITIVELY (new page + JSON + thin loader), migrate consumers incrementally
  (hooks read it, then the TS post-processor, then delete dupes), never big-bang.
- Title-fix REVISE: dropping DATA_PATTERN could pass weak titles -> require contestability (a claim someone
  could disagree with) AND a generically-true-title blocklist, so the bar is contestability not numerosity.
- KEEP the rest.

## E. Staged build (each stage testable)

Stage 1 - Reconcile inconsistencies (low risk, high signal): fix validate_titles.py (contestability, not
data); add the Tier-2 cluster concept to the lexicon design. TEST: title fixtures.
Stage 2 - Single source of truth: author wiki/frameworks/anti-slop-lexicon.md (Tier-1/Tier-2/multiword/
structural/openers + positive-voice rules) + generate anti-slop-lexicon.json; thin Python loader
(_lib lexicon) the hooks import; drift guard. TEST: loader parity.
Stage 3 - Humanize skill: .claude/skills/human-voice-editor/SKILL.md (Pillar 4) + composes_with wiring into
deliverable + chat skills; positive-exemplar page. TEST: skill auto-loads as QUALITY ENHANCER.
Stage 4 - Structural + burstiness detector (SHADOW): new validate_writing_quality.py (negative parallelism,
triad, rhetorical-question, dangling -ing, stacked hedging, same-opener cadence, burstiness variance,
passive-voice) reading the canonical lexicon + sanitize-first + weighted slop-score; shadow-log FPR.
Stage 5 - Repair + promote: wire the reinforcement-inference skill as the ONE bounded rewrite-from-source
repair; promote Stage-4 high-precision checks from shadow to blocking once FPR is acceptable.
Stage 6 - Self-improvement wiring: relax constraintQualityGate short-rule floor for lexicon feedback;
register the SkillOpt monthly lexicon-refresh cadence. TEST: a "never use X" chat correction lands in
learned-constraints and is injected next session.

## F. Surface coverage (explicit per user 2026-06-14): themes, headlines, chat all benefit

The overhaul must reach THREE generation surfaces, not just slide deliverables:
1. THEME SUMMARIZATION + HEADLINES - geminiService.ts generateThemes (GenAISession system
   instruction carries getActiveConstraints() at :776) + the theme-analyst SKILL.md (theme
   names/headlines discipline). WIRING: add human-voice-editor to theme-analyst composes_with;
   the lexicon + positive-voice rules ride the theme-analyst body + the always-injected voice block;
   theme HEADLINES obey the same contestability rule as slide titles (specific + contestable, not a
   topic noun, not a naked number).
2. HASHTAG ARTIFACTS - corpusChatService skill assembly QUALITY ENHANCER block (composes_with).
3. AI CHAT RESPONSES (Analyst Desk + Designer) - the PLAIN-VOICE block + prose scrub (already added
   2026-06-14); upgrade it to read the SINGLE canonical lexicon + load human-voice-editor so plain
   chat gets active voice, contractions-per-register, burstiness, and trust-the-reader, not only
   prohibitions. The validate_writing_quality.py Stop check scans chat replies + theme headlines too.

## G. Goal-pillar -> mechanism map (every named pillar must be a real mechanism, NOT a hardcoded edit)

- HOOKS: validate_titles.py reconciled (contestability, not data) [DONE]; validate_writing_quality.py
  (structural tells + burstiness, reads the canonical lexicon, sanitize-first, shadow) [Stage 4].
- EXPERT SKILLS: human-voice-editor SKILL.md (Pillar 4 positive voice) [DONE].
- SELF-IMPROVEMENT (user feedback + SkillOpt): human-voice-editor is a SkillOpt TRAINING TARGET in
  scripts/skillopt-batch.sh (+ KINDS) so its rules self-improve weekly from rollouts + feedback [DONE];
  edit-learning "ban/allow word X" -> learned-constraints floor relax [Stage 6].
- SUB-AGENT: the writing QA sub-agent (hic-output-qa) reuses the HOOK pattern lists as its source, so the
  field-guide rubric is wired via validate_writing_quality.py [Stage 4]. (Agent definition files are not in
  this repo tree - they resolve from the agent registry - so the hook is the editable single source it cites.)
- MANIFEST / SECOND-BRAIN (no RAG, no prompt-stuffing): canonical lexicon as wiki/frameworks/
  anti-slop-lexicon.md (manifest-chunked) + JSON the hooks import + /api/design-tokens-style voice block
  [Stage 2]. NOT a hardcoded inline list.
- SURFACES: composition map (deliverableFrameworks QUALITY_SKILL_COMPOSITION + skill-manifest.json
  composes_with) loads human-voice-editor on THEMES + every deliverable + chat [DONE]; designer chats
  (chatToFreeform + chatToSlideSpec) inherit the self-improving voice via designerVoiceAddendum
  (human-voice-editor body + getActiveConstraints), no hardcoded prompt [DONE].

## Status
- [x] Field guide analyzed; current surfaces inventoried (3 parallel audits); inconsistencies noted (B); VS+RI (C,D); pillar map (G).
- [x] Stage 1 - title/headline contestability fix (tested: contestable passes, platitude/topic-label/number-only blocked).
- [x] Stage 3 - human-voice-editor skill + wired into themes/deliverables/chat (composition) + designer chats (addendum) + SkillOpt target. typecheck 0.
- [x] Stage 2 - single-source canonical lexicon: wiki/frameworks/anti-slop-lexicon.json (Tier-1/Tier-2/multiword/structural-regex/openers/closers/positive-voice/title-contestability) + the prose twin anti-slop-lexicon.md (manifest-chunked, fetch_wiki_resource retrievable - the anti-RAG channel) + _lexicon.py loader (sanitize-first) the hooks import + scripts/lexicon-drift-guard.py (PASS: 45 Tier-1 + 8 structural present in both). Legacy inline lists remain; migration is incremental (RI revision), new validator uses the canonical source.
- [x] Stage 4 - validate_writing_quality.py (Tier-1, Tier-2 CLUSTER, multiword, openers/closers, negative parallelism + 7 structural regex 3x-weighted, same-opener cadence, low burstiness), sanitize-first, weighted slop-score, SHADOW (exit 0, logs to writing-quality-shadow-log.md); registered universal in dispatch_validators.py. Tested: sloppy=score 8 logged, clean=silent. The sub-agent rubric cites this hook as its writing-tell source.
- [x] Stage 4 PROMOTION (evidence-based, not blind): measured FPR on 298 real clean wiki articles. Promoted the FIVE structural tells at <=0.7% clean-prose FP to BLOCKING (dramatic_colon_fragment 0%, dangling_ing_significance 0%, false_balance 0%, rhetorical_midsentence_question 0.3%, stacked_hedging 0.7%); kept the noisy ones SHADOW/scored (negative_parallelism 3.0%, tier1 19.1%, same_opener 38.6%, triad 6.7%, bold_colon 11.7%). Tested: blocking tell -> exit 2; lone tier1 -> exit 0 shadow; clean -> exit 0. Hooks are file-based so this is LIVE immediately (no rebuild).
- [x] Stage 5 - reinforcement-inference as the ONE bounded rewrite-from-source repair: services/slopRepair.ts (assessSlop via detectOutputAntiPatterns + structural regex from the canonical lexicon; buildRewritePrompt anchored on exact offenders; runSlopRepair keeps whichever scores lower). Wired into corpusChatService AFTER generation, BEFORE the strip, on BOTH paths. MODEL ROUTING (user-corrected, STANDING): the repair re-asks with the SAME model that generated - gemini-3.5-flash for general Analyst Desk chat (its job, including rewrites), claude-opus-4-8 for artifact prose (force-routed); gemini-3.5-flash never touches an artifact because an artifact's activeModelId is opus. Structured output (slide-JSON/HTML) skipped. human-voice-editor ALWAYS-loads for chat so BOTH models get the self-improving voice skill. TESTED LIVE: slop-laden draft 100 -> 0 via opus rewrite; clean draft 0. (Shadow->blocking promotion of Stage-4 structural checks still pending an FPR ramp.)
- [x] Stage 6 - constraintQualityGate.ts + inject_active_constraints_and_patterns.py both exempt short lexicon-feedback rules ("never use X", "X is fine") from the 40-char floor. Tested: short lexicon rule accepted, generic stub rejected.
- [x] Shipped: research-generator rebuilt (composition + designer addendum + gate live); SPA :5011 0 console errors. typecheck 0; drift guard PASS. (Live #prompt + designer-chat end-to-end verification: pending a generation run.)
