---
id: frameworks/anti-slop-lexicon.md
chunks:
  - id: "frameworks/anti-slop-lexicon.md#c0"
    char_span: [0, 713]
    sentence_count: 5
    key_terms: [rules, anti-slop-lexicon, voice, via, anti-slop, lexicon, source, human-voice-editor]
    token_count: 182
  - id: "frameworks/anti-slop-lexicon.md#c1"
    char_span: [770, 1263]
    sentence_count: 2
    key_terms: [streamline, leverage, showcase, utilize, garner, robust, use, groundbreaking]
    section: "Tier-1: hard-flag on sight (any single occurrence)"
    token_count: 120
  - id: "frameworks/anti-slop-lexicon.md#c2"
    char_span: [1330, 3608]
    sentence_count: 16
    key_terms: ["it's", sentences, question-then-short-answer, question, reliable, valuable, bullets, cadence]
    section: "Tier-2: flag only in clusters (2+ in one paragraph or slide) / Banned openers (sentence/bullet start) / Banned closers / Banned multiword + copula inflation / Structural tells (highest signal - weight 3x a word hit)"
    token_count: 511
  - id: "frameworks/anti-slop-lexicon.md#c3"
    char_span: [3658, 4093]
    sentence_count: 12
    key_terms: [anchor, conversational, contractions, barbarous, mechanism, something, concrete, emphasis]
    section: Human voice (Pillar 4 - the positive rules)
    token_count: 101
  - id: "frameworks/anti-slop-lexicon.md#c4"
    char_span: [4125, 4431]
    sentence_count: 3
    key_terms: [headline, judgment, contestable, challenges, experience, platitudes, reasonable, customer]
    section: Headlines and theme names
    token_count: 64
---

# Anti-Slop Lexicon + Human Voice

The single source of truth for what NOT to write (the lexicon) and HOW good consulting
prose reads (the voice). The machine twin is `anti-slop-lexicon.json` in this directory:
the Stop-hooks import its arrays via `_lexicon.py`, the runtime post-processor migrates to
it, and the human-voice-editor skill teaches the voice rules. Generation retrieves THIS
page on demand via `fetch_wiki_resource(path: "frameworks/anti-slop-lexicon.md")` rather
than the rules being stuffed into every prompt. Refreshed monthly via SkillOpt and the
public lists (Kobak excess-vocab, GPTZero, Wikipedia "Signs of AI writing").

Source: the Anti-Slop Field Guide (100 rules), Rules 1-34 + Pillar 4.

## Tier-1: hard-flag on sight (any single occurrence)

delve, leverage (verb), robust, seamless, tapestry, testament, underscore, crucial,
pivotal, realm, boasts, elevate, garner, showcase, intricate, meticulous, harness, unlock,
unleash, streamline, utilize, paradigm, transformative, groundbreaking, game-changer,
cutting-edge, best-in-class, vibrant, bustling, nestled, epitomizes, embodies, multifaceted.
Replace with the plain word: leverage->use, utilize->use, foster->build, garner->get,
showcase->show, robust->strong, streamline->simplify.

## Tier-2: flag only in clusters (2+ in one paragraph or slide)

significant, vital, essential, key, notable, valuable, enhance, facilitate, underpin,
holistic, nuanced, cornerstone, beacon, illuminate, paramount, comprehensive, foundational,
interplay, bolster, "value proposition". Fine alone; two or more together triggers a rewrite.

## Banned openers (sentence/bullet start)

Furthermore, Moreover, Additionally, Consequently, Notably, Importantly, Indeed,
Firstly/Secondly/Lastly, In essence, Ultimately, "In today's fast-paced world", "it is
important to note", "it's worth noting", "needless to say", "Certainly!", "Great question!".

## Banned closers

In conclusion, In summary, "At the end of the day", "the future looks bright", "only time
will tell", "as we move forward", "the takeaway?", "here's the kicker".

## Banned multiword + copula inflation

"navigate the complexities", "gain valuable insights", "a deeper understanding", "plays a
[crucial/pivotal/key/vital] role", "when it comes to", "in the realm of", "a testament to",
"rich tapestry", "ever-evolving", "best of breed" / "best-of-breed".
Replace "serves as / stands as / acts as / represents a / constitutes a" with plain "is/does".

## Structural tells (highest signal - weight 3x a word hit)

- Negative parallelism: "It's not X, it's Y", "not just X but Y", "more than just",
  "goes beyond". The single most reliable AI tell. Zero allowed.
- negative_parallelism_comma: the clause-final "X, not Y" antithesis form ("core
  practice, not a side task", "proof, not pitch", "flagged, not hidden"). Same tell,
  comma variant; high-precision (end-anchored), shadow-scored. Assert the positive claim.
- Rule-of-three triads as a default ("fast, efficient, and reliable"). At most one per artifact.
- Dangling "-ing" significance clauses: ", highlighting the importance of", ", improving
  convenience". Delete the clause.
- Dramatic colon/fragment: "There was only one problem: trust." "The best part? It's free."
- Mid-sentence rhetorical question then a two-word answer ("The solution? It's simpler than you think."). Block the question-then-short-answer cadence.
- Bold-label-colon bullets where the label restates the clause.
- Stacked hedging ("could potentially", "may, in some cases, possibly"). One qualifier max.
- False balance ("on one hand ... on the other hand") unless the deliverable's job is an explicit options trade-off. Take a position; clients pay for a recommendation, not neutrality.
- Same-opener cadence: 3+ consecutive sentences/bullets starting with the same word.
- Low burstiness: uniform medium-length sentences. Mix short (<=6 word) and long (25+).

## Human voice (Pillar 4 - the positive rules)

Lead with the answer. Active voice, named actor. Omit needless words. Prefer the short
concrete word. Anchor every claim to a name, place, mechanism, or instance (a figure is one
anchor, only inside a cited quote). Vary cadence. Take a position. Earn emphasis, never
assert it. Trust the reader. Reuse the precise domain term verbatim. Contractions are fine
in conversational chat. Break any rule sooner than write something barbarous.

## Headlines and theme names

A headline or theme name earns its place by being SPECIFIC and CONTESTABLE - a claim a
reasonable person could disagree with. Reject topic labels ("Co-op Challenges"), platitudes
("Customer experience matters"), and naked numbers standing in for a judgment. The figure is
not the headline; the judgment is.
