# The NXT Humans Anti-Slop Copywriting Guide

Compiled 2026-08-08 from the enforced writing rules in `.claude/CLAUDE.md`, the exemplar
manifest, and the owner rubrics added 2026-08-07. These rules apply to every user-visible
sentence in every deliverable: slide titles, body copy, chat replies, captions, quotes,
speaker notes. They are enforced at three layers: prompt injection on both chat desks, the
`slidePostProcessor` lexicon, and regression tests.

---

## 1. The Actor Rule (the core test)

Every sentence must pass two checks:

**Name the actor.** State who or what acts: a named team, system, person, or audience.
Abstract nouns (engagement, advancement, alignment, transformation, adoption) never act.
Dramatic verbs (leaks, dies, bleeds, unlocks, erodes, cannot see) never substitute for the
mechanism. Ground cause and effect: X fails because Y, so Z happens.

- BAD: "Engagement leaks at three stages advancement cannot see."
- GOOD: "Alumni drop off at three stages the advancement team cannot see."

**Read it aloud.** If a real person would not say the sentence out loud, rewrite it. Kill
broken grammar, buzzwords forced into the wrong part of speech, and word-salad compression.
Plain subject, direct verb, concrete object. Delete every word that adds no fact or step.

- BAD: "Buy wins on upkeep; build wins on fit." (parallelism, no actor)
- GOOD: "The vendor does the maintenance; the in-house build matches the workflow."

Why it works: slop strings abstract business nouns together with poetic verbs to sound deep
while carrying no specific meaning. Naming the actor and grounding the cause forces the
sentence to say something checkable.

---

## 2. Action titles

- Every title is a complete sentence stating a conclusion (a judgment), never a topic.
- BAD (topic labels): "The Landscape", "Key Findings", "Recommendations", "Four gaps
  between the help customers seek and the help they get."
- GOOD: "First-year students leave faster than the institution can replace them."
- The Partner Test: a senior partner reading only the titles must understand the argument.
- Concise and literal: aim for 10 words or fewer, one line. Name the mechanism, system,
  actor, or proper noun. No figurative business metaphors. Banned examples: "front door",
  "trust ceiling", "where value leaks", "bleeds", "opens the door", "redrawing the map",
  "wearing four costumes", "the chain breaks at its first link". ("Funnel" terms are
  legitimate marketing vocabulary, not banned.)
- Numbers never appear in titles. The figure, if any, rides in a cited quote on the body.

---

## 3. The quantitative claim rule

Never state a standalone number (percent, ratio, count, dollar figure, "Nx") as the model's
own assertion in any visible field. A number may appear only inside a verbatim quote with an
inline named source.

- ALLOWED: "I applied to 60 co-ops and heard back from 4." [Source: Reddit r/NEU]
- FORBIDDEN: the same "60-to-4" as a bare title, KPI tile, or stat.
- Default to qualitative language: name the pattern (FRAGMENTED, PERSISTENT), the system, or
  the proper noun, not the statistic.

---

## 4. Citations and evidence

- Cite by specific named source: "Higher Ed Dive", "Reddit: r/cscareerquestions",
  "Interview P-04, 2025-03-12". Never "research", "studies", "data", "sources", "analysis".
- A label reading "Evidence" must be followed by a verbatim corpus quote with attribution,
  or the label is not used. A paraphrase under an "Evidence" label is forbidden.
- Lead with external research; corroborate; only then contextualize with client documents.
  At least 60 percent of cited sources are external.
- Quotes are verbatim, clean, complete sentences. Never interview filler ("like,", "you
  know"). Never fabricate a quote; omit the array instead.

---

## 5. Meta-narration ban

Never write, in any output field: "Good morning/afternoon", "Welcome to", "Today we will",
"We now move to", "In this section", "In this presentation/deck", "As you can see", "This
slide shows", "The next slide", "Let's dive into", "As discussed", "As noted earlier",
"In conclusion", "To summarize", "This report aims to", "This analysis covers".
A consultant never greets the audience, announces the framework, or narrates the structure.
Lead with the insight.

## 6. No self-referential or process language

The reader never sees references to:
- The artifact itself: "this deck", "this slide", "this report", "this analysis".
- The process: "based on the research", "the data indicates", "our findings suggest",
  "research shows", "sources indicate", "from the sources reviewed".
- Limitations: "evidence is limited", "more research is needed", "in the absence of".
If a process prefix appears, strip it and keep the insight. If a claim is not evidenced,
omit the claim and narrow the section around what is evidenced.

## 7. Subject discipline

The artifact is about its subject, never about the deliverable. Never write instructions to
the writer as content: "lead with", "open with", "the report should", "section order",
"anchor the messaging", "positioning guide", "frame the story". When the corpus contains
notes about how to write the deliverable, mine them for the underlying substance (the
capability, the pain, the proof) and state that.

---

## 8. Banned phrase families (instant rejection)

**Corporate cliches:** paradigm shift, game-changer, holistic approach, cutting-edge,
best-in-class, leverage synergies, robust solution, seamless integration, actionable
insights, thought leadership, value proposition, core competency, move the needle, circle
back, deep dive, low-hanging fruit, synergy, ecosystem, disruptive, innovative solution.

**AI tells:** in today's rapidly evolving landscape, it's important to note, it's worth
noting, it should be noted, needless to say, at the end of the day, the reality is, when it
comes to, in terms of, as we navigate, the landscape of.

**Verbal tics:** delve, tapestry, testament, meticulous, nestled, vibrant, enduring legacy,
garner, interplay, intricate, showcase, bolster, foster, enhance, boasts a, paramount,
valuable insights, utilize, comprehensive, foundational, multifaceted, leveraging,
facilitate, pivotal role, plays a crucial role, marks a pivotal, represents a paradigm,
embodies, epitomizes.

**AI-jargon salad (added 2026-08-07 from live evidence):** AI-powered, AI-driven,
AI-enabled, value-driven, insight-driven, intelligence-driven, purpose-driven, intelligent
insights, actionable intelligence, powered intelligence, path to value, network activation,
digital transformation journey.

**Hedges and filler:** it seems, perhaps, arguably, potentially, to some extent, moving
forward, going forward, at this point in time, looking ahead.

**False profundity:** fundamental shift, seismic shift, unprecedented, transformative,
revolutionary, groundbreaking, trailblazing, world-class.

**Copula avoidance:** do not replace "is" with elaborate verbs. Watch: serves as, stands
as, marks a, represents a, embodies, epitomizes.
- BAD: "The CRM stands as the cornerstone of advancement."
- GOOD: "The CRM is the cornerstone of advancement."

**Rhetorical patterns:** "It's not just an upgrade, it's a transformation" (not-X-but-Y
parallelism); "Fast, efficient, and reliable" (snappy triad); "The solution? Simpler than
you think" (mid-sentence rhetorical question); "But here's the thing" (false revelation);
"We are excited to announce" (press-release voice).

---

## 9. Format tells (hard bans)

- **Em-dash: never.** Use comma, semicolon, colon, period, or parenthesis. The em-dash is
  the single most reliable AI-writing tell. ASCII hyphens in compound words stay fine.
- No emoji anywhere. No Unicode bold/italic stylization glyphs.
- No eyebrows: one kicker per artifact (the artifact-type line, mono, tracked, uppercase).
  Never additional micro-labels above titles or headings that color and position already
  convey ("WHAT FRUSTRATES THEM" over a red pain box).
- No AI self-awareness: "As an AI", "as of my knowledge cutoff", "I cannot provide".
- No debug chrome in visible text: run IDs, pipeline versions, confidence tags,
  "(composite)" suffixes, "[CHUNK_012]" markers, "EVIDENCE GAP", "TBD".

---

## 10. Semantic coherence (the languagejones rule, added 2026-08-09)

Word-list bingo is the weak signal. The strongest AI tell is conceptual incoherence behind
common word choices: words that co-occur statistically but describe nothing a person can
picture. "Two overarching pillars that undergird the strategy" is architecturally
impossible; nothing arches over and holds up from below at once. "Point a toolkit at a
problem and see what it buys you" barters tools at gunpoint. "Words aren't empty containers,
a blank slate to be filled" mixes two different acts of filling.

- Default to zero metaphor; literal language names the actor, system, and mechanism.
- Any image used must be physically enactable in a single frame. If you cannot draw it or
  act it out, cut it.
- Never mix frames within a sentence pair (a door opened, then knocked down like a SWAT
  team).
- Verbs keep their literal objects: fill a container or write on a slate; buy with money;
  things rest on foundations and sit under arches.
- Also banned from this audit: assistant-voice validation ("sure thing", "great question",
  "and that matters"), the news-voice scene setters ("quietly reshaping", "amid a year
  of"), conceptual "buckets", "toolkit" as a frame, "the move here is".
- Still legitimate here: "gap" and "blueprint" are product vocabulary for gap analyses and
  service blueprints, not tells.

## 11. Content coherence

- One synthetic dataset per artifact: every element tells the same story about the same
  subject. Mixed domains (retail title over fundraising node names) read as generated
  filler.
- Never repeat one card's content as filler across variants; distinct items or fewer items.
- Plain text in generated fields: no markdown bold, headers, or asterisks; the renderer
  owns formatting.

---

## 12. The claim ledger (Kaleynik method, added 2026-08-13)

AI slop is two problems needing different fixes: epistemic slop (fabricated or overreaching
claims) and editorial slop (generic, bloated prose). A source cannot rescue a dead
paragraph; a rewrite cannot rescue an invented statistic. The controls:

- Type every consequential claim: supported fact, derivation, defensible inference,
  hypothesis, editorial judgment, or unknown. Unsupported factual claims do not earn prose;
  they get researched, weakened, framed as an explicit bet, or removed.
- Scope-match every citation: the cited passage must support the actual wording - same
  population, period, product, comparison, and causal strength. A citation is evidence, not
  seasoning.
- Check independence: several citations repeating one original claim are one source. A
  convergence label requires independent originals.
- Stress-test the reasoning before recommending: what else explains this, when would the
  conclusion fail, and under what condition does the opposite recommendation win. If no such
  condition exists, a variable is missing.
- Run two QA passes, never mixed: claims first (ignore how it sounds), prose second (ignore
  whether it is true). Self-critique only nominates suspects; external checks convict.
- Replace empty benefit phrases ("improve efficiency", "enhance engagement", "greater
  flexibility") with the mechanism: what became faster, which behavior changed, who gained
  what under which constraint.

## Quick reference card

1. Name the actor; plain nouns; grounded cause and effect.
2. Read it aloud; a person must be able to say it.
3. Titles are judgments, 10 words or fewer, literal, no numbers.
4. Numbers only inside verbatim cited quotes.
5. Named sources always; "Evidence" label means a verbatim quote follows.
6. Never narrate the deck, the process, or the model.
7. No em-dash, no emoji, one kicker, no debug chrome.
8. When a claim lacks evidence, cut the claim, not the standard.
9. Every image must be physically enactable; zero metaphor by default; never mix frames.
