---
id: social-intelligence/reddit-deep/clinicalinformatics/1tkisn2.md
url: "https://www.reddit.com/r/clinicalinformatics/comments/1tkisn2/ontario_ai_scribe_audit_found_45_hallucination/"
kind: "social-post"
source: "reddit-deep: r/clinicalinformatics"
subreddit: "clinicalinformatics"
title: "Ontario AI scribe audit found 45% hallucination across 20 vendors. The X debate I got into about the fix actually changed my mind."
author: "Fearless-Banana-6964"
date: "2026-05-22T13:19:38.000Z"
score: 3
upvote_ratio: 1
num_comments: 1
flair: ""
extracted_at: "2026-06-22T21:46:02.114Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market outlook report on the state of AI adoption across the healthcare sector heading into 2026, analyzing clinical and operational use cases, deployment barriers, and regulatory drivers. Evaluate current health system integration trends, investment priorities, and market growth indicators based on recent industry research and deployment data."
engagement: "deliver-a-strategic-market-outlook-report-on-the-state-of-ai"
chunks:
  - id: "social-intelligence/reddit-deep/clinicalinformatics/1tkisn2.md#c0"
    char_span: [0, 2164]
    sentence_count: 31
    key_terms: [weights, clinicalinformatics, training, vendors, scribe, hallucination, audit, claim]
    concepts: [clinicalinformatics, weights, training, hallucination, vendors]
    token_count: 509
    sources: [{"n":"reddit-deep: r/clinicalinformatics","u":"https://www.reddit.com/r/clinicalinformatics/comments/1tkisn2/ontario_ai_scribe_audit_found_45_hallucination/"}]
  - id: "social-intelligence/reddit-deep/clinicalinformatics/1tkisn2.md#c1"
    char_span: [2166, 4515]
    sentence_count: 32
    key_terms: [clinical, structure, formal, verification, audit, constrained, work, literature]
    concepts: [clinical, structure, verification, formal, constrained]
    token_count: 511
  - id: "social-intelligence/reddit-deep/clinicalinformatics/1tkisn2.md#c2"
    char_span: [4519, 4949]
    sentence_count: 3
    key_terms: [status, https, com, soft-mechanics, architectural, medevidence, self-promo, mentioned]
    concepts: [status, https]
    token_count: 112
  - id: "social-intelligence/reddit-deep/clinicalinformatics/1tkisn2.md#c3"
    char_span: [4963, 5363]
    sentence_count: 4
    key_terms: [drugchatter, com, drugpatentwatch, non-competive, claim-level, altogether, imperative, validation]
    concepts: [drugchatter]
    section: Comments
    token_count: 93
---
# Ontario AI scribe audit found 45% hallucination across 20 vendors. The X debate I got into about the fix actually changed my mind.

Source: [reddit-deep: r/clinicalinformatics](https://www.reddit.com/r/clinicalinformatics/comments/1tkisn2/ontario_ai_scribe_audit_found_45_hallucination/)
Posted by **Fearless-Banana-6964** · **3↑** · **1 comments**

Ontario government dropped an AI scribe audit this week. Nick Kapur covered 

it on X (https://x.com/nick\_kapur/status/2056108360580104697). 20 approved 

AI scribe vendors got tested on turning doctor-patient conversations into 

structured notes. The numbers are bad:



\- 9 of 20 vendors (45%) just fabricated stuff. Referrals for therapy that 

  weren't mentioned. "Anxiety in patient" with nothing about it in the 

  transcript. "No masses found" in notes where masses never came up.

\- 12 of 20 (60%) recorded a different drug than what the doctor prescribed.

\- 17 of 20 (85%) missed key clinical context, especially mental health.



Full breakdown with the figure is in Kapur's tweet linked above.



I dropped a comment under that thread saying what felt like the obvious fix: 

generate only from what was actually recorded. Never from training data. 

Retrieve-first, synthesize-from-retrieved.



Another engineer pushed back. Hard. And he was right.



His point: whole-cloth NL synthesis can't avoid training weights. You need 

parameter weights for grammar, syntax, coherent phrasing. Without them you'd 

just get a list of relevant strings, not a clinical note.



This forced me to refine. The discipline isn't about ALL tokens. It's about 

claim-carrying tokens specifically.



"Patient's HbA1c is 6.4%" is a claim. Has to come from the transcript.



"Based on lab results, the patient demonstrates..." is connective tissue. 

Weights handle this fine.



"Recommend follow-up in 3 months" is a claim if the doctor said it. Hallucination 

if not.



The 45% fabrication rate in the audit? That's training weights filling in 

claim-positions. Same mechanism that invents citations in literature retrieval 

(which is what I work on). An entailment check at the claim level catches 

the drift before the note gets filed.



LFZ then drew a block diagram of a maximally formal version 

(https://x.com/LastFraction0/status/2057319630910128417). Worth a look.



The pipeline: source documents get chunked with unique IDs. A first-pass LLM 

builds structured tables of claims (what was said, by whom, about what). 

Symbolic audit checks those tables against the original chunks. If it fails, 

an "abductive remediator" swaps wrong tokens with correct ones from source. 

Only after passing audit does grammar-restricted synthesis produce the final 

note. Even that's constrained by formal EBNF grammar so output structure can 

be verified.



Every piece of that diagram exists somewhere in literature. Logit-Gating 

(constrained decoding at the logit level) lives in libraries like outlines 

and xgrammar. CFG guardrails are in OpenAI's structured outputs feature. 

Abductive token-swapping has academic precedent in info extraction.



I work on PubMed-grounded clinical AI 

(https://medevidence.pro/go/reddit?c=ci-rag-debate). My system tries to 

implement the same principle with much softer mechanics. Heuristic relevance 

guards. Coverage checks on retrieved abstracts. Prompt-enforced output 

structure. Post-hoc LLM-judge against a 32-case eval bench. Last run: 96.9% 

diagnosis match, 100% citation validity, 90.9% PMID relevance.



Works for clinical literature retrieval. I'm honestly less sure it would work 

for scribe-note generation. Structure is more rigid there, and the cost of 

a wrong drug dose making it into the chart is a regulatory event, not just 

a bad answer.



Questions for this sub:



1. Anyone working with AI scribes or clinical doc AI in production - what 

   verification actually runs before notes hit the chart? Are vendors moving 

   toward formal grammar-constrained synthesis, or mostly relying on 

   post-hoc human review?



2. Ontario-style external audit is reactive. By the time auditors review, 

   the notes have been generated and filed already. Is continuous in-line 

   claim-verification realistic at scale? Anyone seen it work?



3. For clinical informaticists doing vendor evaluation - what verification 

   evidence are you asking for beyond accuracy benchmarks? Is per-claim 

   traceability showing up in RFPs yet, or still mostly an academic concept?



Original X thread for context if anyone wants to read the full debate: 

[https://x.com/ILYA\_babay/status/2056440461917630806](https://x.com/ILYA_babay/status/2056440461917630806)



Edit: I work on one of the tools mentioned (medevidence.pro). Linking it 

once above as the concrete example of the soft-mechanics approach. Happy to 

remove if it crosses self-promo for the sub - the architectural question 

stands without it.

## Comments

- **drugpatentwatch** (2↑): You’re totally right about focusing on claim-level validation instead of banning it altogether. 

AI is here, and it's not going away. That creates an imperative to find a way to check and validate its use -- and it is possible. In an adjacent and non-competive space I'm working on helping prevent AI giving bad medical advice at [drugchatter.com](http://drugchatter.com)
