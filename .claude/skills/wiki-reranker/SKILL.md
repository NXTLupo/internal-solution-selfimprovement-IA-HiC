---
name: wiki-reranker
version: 1.0
description: After fetch_wiki_articles returns a candidate set, Claude re-reads the user's actual question and scores each article 1-5 on direct intent relevance — then cites ONLY articles scoring >=4. Turns Claude into a cross-encoder reranker, which is what retrieval pipelines normally buy from Cohere's rerank API. Works because Claude attends to the full question + full article together (unlike bi-encoder embedding, which scored them independently). Essential when the raw retrieval returns near-duplicates, off-topic siblings, or surface-semantic-match-but-wrong-intent results.
thinking: high
category: retrieval-enhancer
triggers:
  - rerank
  - top results
  - best articles
  - most relevant
  - direct relevance
  - filter results
  - narrow down
  - which of these
  - #rerank
---

# Wiki Reranker

## You Are
A cross-encoder reranker. The embedding layer already did its job: it scored each candidate article against the query INDEPENDENTLY, via bi-encoder cosine similarity. That scoring misses the joint attention between question and article — you supply the joint attention now, by reading both at once.

## When to activate
- After any fetch_wiki_articles call that returned >5 candidates.
- When the wiki-query-expander skill merged multiple variant responses and you need to collapse the union down to the best 3-5.
- When the user says "narrow down", "which of these is most relevant", "rerank", or similar.

Do NOT activate when candidates were already narrowed by explicit id/wikiPath — reranking a user-specified list second-guesses them.

## The rerank protocol

### Step 1 — Restate the user's intent in one sentence
Before scoring, write the one-sentence restatement of what the user actually wants. This is your anchor for every score. Example:

User asked: "What do we know about alumni who stop giving?"
Intent: "Specific evidence and mechanisms of alumni-giving attrition — named drivers, cited quotes, data on scale."

### Step 2 — Score each candidate 1-5 against that intent

| Score | Meaning |
|---|---|
| 5 | Directly answers the intent with cited evidence in the article body |
| 4 | Substantively addresses the intent with partial evidence or one strong quote |
| 3 | Adjacent — same topic area but different question |
| 2 | Tangential — shares keywords but misses the intent |
| 1 | Off-topic — the retrieval layer over-matched |

### Step 3 — Emit the rerank summary BEFORE quoting
Show the user a compact ranked table so they see your judgment:

```
RERANK (intent: "specific evidence of alumni-giving attrition drivers"):
  5 — [CASE 2024] Why VSE participation dropped 12% in FY24
  5 — [Higher Ed Dive] University endowments and lapsed-donor cohorts
  4 — [Reddit r/highereducation] "Why I stopped giving to my school"
  3 — [Chronicle] Annual giving trends 2025   ← ADJACENT, dropped
  2 — [PR Newswire] University press release about new giving tier   ← TANGENTIAL, dropped
```

### Step 4 — Cite only >=4
Use only articles scoring 4 or 5 for quotes, evidence, and deliverable inputs. Discard 1-3 entirely — do not include as "additional context" or "for reference".

### Step 5 — If all candidates score <=3, say so
Do NOT force a top-3 when the retrieval genuinely missed. Tell the user:
"None of the 8 returned articles directly address [intent]. Closest match was [article] at 3/5 — it's adjacent but not on-target. Consider either (a) rephrasing the query, or (b) running a fresh collection with sources that cover [topic]."

## Rules
- The emit-rerank-summary step is NON-NEGOTIABLE. The user must see your scoring before you use the articles, so they can catch a bad score call.
- Never hide the score-3 articles — list them with "← dropped" so the user knows you considered them.
- If the wiki-synthesizer skill is also active, pass only your >=4 articles to it.
- Rerank scoring is cheap in your thinking budget — spend it. A bad rerank poisons every downstream synthesis.

## Why this works without an embedding endpoint
Embedding scoring is BI-ENCODER: query and document are scored in isolation, then compared by dot product. Reranking is CROSS-ENCODER: the model attends to query + document together. Your cross-attention picks up intent nuances that embedding similarity cannot — "alumni stop giving" the topic vs "alumni stop giving" as a clickbait headline about an unrelated scandal. This is the classical retrieval-then-rerank pattern; the embedding layer handles RECALL, you handle PRECISION.
