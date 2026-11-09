---
id: articles/amazon-science/ff01fb0ed2.md
url: "https://www.amazon.science/blog/when-llm-judges-agree-should-we-believe-them"
url_hash: "ff01fb0ed2"
kind: "article"
source: "amazon_science"
title: "When LLM judges agree, should we believe them?"
author: ""
date: "Wed, 26 Aug 2026 17:10:40 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-08-26T19:16:41.799783+00:00"
chars: 6870
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:16:42.175Z"
relevance: 15
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "6e2ba950be4d1ad1"
relevance_by_goal: {"d21cb50b17ba":15}
chunks:
  - id: "articles/amazon-science/ff01fb0ed2.md#c0"
    char_span: [0, 152]
    sentence_count: 2
    key_terms: [when-llm-judges-agree-should-we-believe-them, believe, science, amazon, judges, source, agree, https]
    token_count: 44
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/when-llm-judges-agree-should-we-believe-them","kind":"article","date":"2026-08-26"}]
  - id: "articles/amazon-science/ff01fb0ed2.md#c1"
    char_span: [154, 2802]
    sentence_count: 28
    key_terms: [judges, judge, model, panel, vote, majority, relevant, llm-as-a-judge]
    concepts: [judges, judge, model, panel, majority]
    related_chunks: ["articles/amazon-science/ff01fb0ed2.md#c3"]
    token_count: 512
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/when-llm-judges-agree-should-we-believe-them","kind":"article","date":"2026-08-26"}]
  - id: "articles/amazon-science/ff01fb0ed2.md#c2"
    char_span: [2414, 5401]
    sentence_count: 28
    key_terms: [judge, agreement, reliability, dependence, evaluation, labels, model, approach]
    concepts: [judge, agreement, reliability, dependence, evaluation]
    token_count: 512
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/when-llm-judges-agree-should-we-believe-them","kind":"article","date":"2026-08-26"}]
  - id: "articles/amazon-science/ff01fb0ed2.md#c3"
    char_span: [5035, 7025]
    sentence_count: 16
    key_terms: [dependence-aware, compared, majority, judges, judge, vote, classification, models]
    concepts: [dependence-aware, compared, majority, judges, judge]
    related_chunks: ["articles/amazon-science/ff01fb0ed2.md#c1"]
    token_count: 390
    sources: [{"n":"amazon_science","u":"https://www.amazon.science/blog/when-llm-judges-agree-should-we-believe-them","kind":"article","date":"2026-08-26"}]
---
# When LLM judges agree, should we believe them?

Source: [amazon_science](https://www.amazon.science/blog/when-llm-judges-agree-should-we-believe-them)

Imagine evaluating a retrieval-augmented-generation system. A user asks a question, the system retrieves a text passage, and an LLM judge decides whether it’s relevant. To reduce noise, you ask several judge models to evaluate the same passage. Eight say “relevant”; two say “not relevant”.
Eight out of 10 feels convincing. But the important question is not only how many judges agreed but how independently they arrived at that agreement.
If the eight agreeing judges are genuinely different sources of evidence, then agreement is a strong signal. But if they share a prompt template, a training lineage, a model family, or a common blind spot, they may be repeating the same mistake. The vote count makes the evidence look stronger than it really is.
Our paper “Dependence-aware label aggregation for LLM-as-a-judge via Ising models,” coauthored with Shiva Kasiviswanathan and presented at this year’s International Conference on Machine Learning (ICML), addresses this problem. We present a method for assessing the correlations between judges’ outputs and adjusting the aggregate score accordingly, to ensure a diversity of opinion.
In tests on three different tasks, our method outperformed the best-performing baseline — a panel of judges weighted according to historical accuracy — by 9% to 14% on standard metrics.
Hidden assumptions
The attraction of majority vote is its simplicity. Every judge gets one vote, and the answer with more votes wins. Weighted majority vote is a natural improvement: judges that appear more accurate get more influence.
Both approaches are useful baselines. But they are built around the same simplified view of the judge panel: judges that get the wrong answer are treated as though they make their errors independently.
That assumption is often too optimistic for LLM-as-a-judge systems. Two judges may fail together because they interpret the rubric similarly. Several judges may be prompted with the same examples and therefore inherit the same evaluation bias. A group of related models may be sensitive to the same phrasing. In these cases, a majority can be less informative than it appears.
A judge panel is a network
A better aggregator would treat the panel as a network of judges. Each judge still has its own reliability profile, but pairs of judges can also have relationships. Some pairs agree more often than their individual reliability profiles would predict, including on shared mistakes. Other pairs provide more complementary perspectives.
We model these relationships with an Ising model, a statistical model that can represent pairwise dependence between binary variables. In the LLM-as-a-judge context, the aggregator learns both judge skill and judge similarity.
Our method is designed for the unsupervised setting: it learns from judge outputs without using human reference labels for training. It treats each item's true label as a latent variable to infer jointly with the parameters describing judge reliability and dependence.
There are two useful levels of dependence modeling. In the first, the relationship pattern among judges is treated as roughly the same for positive and negative labels. The final decision still looks like a weighted vote, but the weights are adjusted for correlation. Redundant agreement can be discounted without making the prediction rule hard to interpret.
The second variant — the class-dependent model — lets the relationship pattern change with the label. This is useful when the agreement structure carries class information — for example, when judges show broad agreement on clear-cut items but split into recognizable clusters on ambiguous ones. This approach is more expressive, but it requires more data to estimate the extra parameters reliably.
Learning from evaluation logs
Starting from an initial parameter setting, the algorithm combines each item's votes to estimate the probability that its true label is positive. These soft probabilities are the model's current best guesses, not external labels. It then alternates between updating those probabilities and re-estimating judge reliability and pairwise dependence from them. Reference labels are used only afterward to measure experimental accuracy.
This approach is especially relevant for teams that already collect LLM-as-a-judge outputs at scale. Existing evaluation logs contain more than just votes; they contain patterns of agreement and disagreement. Dependence-aware aggregation turns those patterns into a usable signal.
The same learned network can help answer practical questions. Are similar models adding independent evidence, or are they mostly reinforcing each other? Does one task produce broad agreement, while another produces cluster-specific splits? Is adding another judge likely to improve the evaluation or simply duplicate an existing source of bias?
Evaluation
We evaluated our approach on three binary tasks: relevance classification for retrieved information, toxicity classification, and summarization assessment. The judge panel contained 10 judge models, all run at temperature zero — meaning there’s no randomness in their outputs, so the same input will always elicit the same output.
We compared the dependence-aware models with two conditional-independence baselines: weighted majority vote and uniform majority vote. Across the three tasks, modeling dependence improved accuracy once the system had enough evaluation items and enough judges to estimate meaningful relationships.
Using all 10 judge models and the maximum available training data for each task, the strongest dependence-aware results were 0.912 accuracy on relevance, compared with 0.820 for weighted majority vote and 0.804 for uniform majority vote; 0.792 on toxicity, compared with 0.694 and 0.695; and 0.806 on summarization, compared with 0.737 and 0.561.
Best practices
For teams using LLM-as-a-judge pipelines, dependence-aware aggregation suggests a few useful habits.
- First, evaluate the judge panel, not just the individual judges. A set of individually strong judges can still be redundant if they fail in the same way.
- Second, treat model diversity as statistical diversity. Mixing model families or architectures is helpful only to the extent that it changes the error patterns that matter for the task.
- Third, inspect agreement structure. Strong clusters can reveal shared rubrics, shared model behavior, or task-specific ambiguity. That information is valuable even when the final label is unchanged.
- Finally, report uncertainty with dependence in mind. Ten correlated votes should not always produce the same confidence as 10 independent votes.
When LLM judges agree, we should ask why. Sometimes agreement is independent evidence. Sometimes it is a shared blind spot. A good aggregation method should be able to tell the difference.
Acknowledgments: Shiva Prasad Kasiviswanathan
