---
id: articles/import-ai/ff5c4e75aa.md
url: "https://importai.substack.com/p/import-ai-457-ai-stuxnet-cursed-muon"
url_hash: "ff5c4e75aa"
kind: "article"
source: "import_ai"
title: "Import AI 457: AI stuxnet; cursed Muon optimizer; and positive alignment"
author: ""
date: "Mon, 18 May 2026 13:31:17 GMT"
tier: 2
method: "source-native"
extracted_at: "2026-08-13T17:14:01.102068+00:00"
chars: 10000
engagement: "analyze-the-executive-search-industry-to-map-current-trends"
collected_at: "2026-08-13T17:14:00.749Z"
relevance: 5
engagement_goal: "Analyze the executive search industry to map current trends against DSG Global's specific operational pain points (as well as market research validated industry-wide use cases), producing a structured assessment of targeted AI use cases, their implementation feasibility, and expected efficiency gains to address these challenges."
content_hash: "18f7ce61a412121c"
relevance_by_goal: {"bb7e192171b3":5}
chunks:
  - id: "articles/import-ai/ff5c4e75aa.md#c0"
    char_span: [0, 165]
    sentence_count: 1
    key_terms: [import-ai-457-ai-stuxnet-cursed-muon, alignment, optimizer, importai, positive, substack, stuxnet, cursed]
    token_count: 50
    sources: [{"n":"import_ai","u":"https://importai.substack.com/p/import-ai-457-ai-stuxnet-cursed-muon","kind":"article","date":"2026-05-18"}]
  - id: "articles/import-ai/ff5c4e75aa.md#c1"
    char_span: [167, 2843]
    sentence_count: 13
    key_terms: [code, calculation, modeling, software, stuxnet, high-precision, import, investigation]
    concepts: [calculation, modeling, software, high-precision, investigation]
    token_count: 512
    sources: [{"n":"import_ai","u":"https://importai.substack.com/p/import-ai-457-ai-stuxnet-cursed-muon","kind":"article","date":"2026-05-18"}]
  - id: "articles/import-ai/ff5c4e75aa.md#c2"
    char_span: [2474, 4929]
    sentence_count: 8
    key_terms: [neurons, muon, optimizer, aurora, non-proliferation, superintelligence, nuclear, small]
    concepts: [neurons, optimizer, aurora, non-proliferation, superintelligence]
    token_count: 512
    sources: [{"n":"import_ai","u":"https://importai.substack.com/p/import-ai-457-ai-stuxnet-cursed-muon","kind":"article","date":"2026-05-18"}]
  - id: "articles/import-ai/ff5c4e75aa.md#c3"
    char_span: [4692, 7081]
    sentence_count: 17
    key_terms: [aurora, alignment, positive, university, adamw, like, systems, improvement]
    concepts: [aurora, alignment, positive, university, adamw]
    related_chunks: ["articles/import-ai/ff5c4e75aa.md#c4", "articles/import-ai/ff5c4e75aa.md#c5"]
    token_count: 512
    sources: [{"n":"import_ai","u":"https://importai.substack.com/p/import-ai-457-ai-stuxnet-cursed-muon","kind":"article","date":"2026-05-18"}]
  - id: "articles/import-ai/ff5c4e75aa.md#c4"
    char_span: [6740, 9591]
    sentence_count: 7
    key_terms: [alignment, positive, safety, human, different, negative, systems, development]
    concepts: [alignment, positive, safety, different, human]
    related_chunks: ["articles/import-ai/ff5c4e75aa.md#c3", "articles/import-ai/ff5c4e75aa.md#c5"]
    token_count: 512
    sources: [{"n":"import_ai","u":"https://importai.substack.com/p/import-ai-457-ai-stuxnet-cursed-muon","kind":"article","date":"2026-05-18"}]
  - id: "articles/import-ai/ff5c4e75aa.md#c5"
    char_span: [9257, 10168]
    sentence_count: 3
    key_terms: [alignment, positive, society, success, systems, write, good, like]
    concepts: [alignment, positive, society, success, systems]
    related_chunks: ["articles/import-ai/ff5c4e75aa.md#c3", "articles/import-ai/ff5c4e75aa.md#c4"]
    token_count: 172
    sources: [{"n":"import_ai","u":"https://importai.substack.com/p/import-ai-457-ai-stuxnet-cursed-muon","kind":"article","date":"2026-05-18"}]
---
# Import AI 457: AI stuxnet; cursed Muon optimizer; and positive alignment

Source: [import_ai](https://importai.substack.com/p/import-ai-457-ai-stuxnet-cursed-muon)

Import AI 457: AI stuxnet; cursed Muon optimizer; and positive alignment
Welcome to Import AI, a newsletter about AI research. Import AI runs on arXiv, cappuccinos, and feedback from readers. If you’d like to support this, please subscribe.
Stuxnet before Stuxnet:
…Fast16 bugs software likely used in weapons programs…
Here’s a fascinating investigation of a ~20+ year old computer virus called fast16.sys. This software is interesting because it “selectively targets high-precision calculation software, patching code in memory to tamper with results. By combining this payload with self-propagation mechanisms, the attackers aim to produce equivalent inaccurate calculations across an entire facility.”
     If any of you have read the Three Body Problem, this might sound familiar - in that (fictional) book, aliens intent on taking over the Earth use a technology called a Sophon to disrupt high-energy physics experiments all over the world, making it impossible for humanity to advance certain types of science.
More details on the virus: When the researchers at SentinelOne did their teardown of the virus they found something quite unusual: “Most patched patterns correspond to standard x86 code used for hijacking or influencing execution flow. One injected block is different. It’s a larger and complex sequence of Floating Point Unit instructions dedicated to precision arithmetic and scaling values in internal arrays. This code is a standalone mathematical calculation function unrelated to code flow hijacking or any other typical malicious code injection.”
    Further investigation deepened the mystery: “We converted the patching rules into hexadecimal YARA signatures and ran them against a large, period‑appropriate corpus. The results showed a very low hit rate: fewer than ten files matched two or more patterns. Those matches, however, shared a clear theme. They were precision calculation tools in specialised domains such as civil engineering, physics and physical process simulations.”
Targeted tools: “The strongest overlaps point to three high-precision engineering and simulation suites from the mid-2000s: LS-DYNA 970, PKPM, and the MOHID hydrodynamic modeling platform, all used for scenarios like crash testing, structural analysis, and environmental modeling,” they write. “LS-DYNA in particular has been cited in public reporting on Iran’s suspected violations of Section T of the JCPOA, in studies of computer modeling relevant to nuclear weapons development… by introducing small but systematic errors into physical‑world calculations, the framework could undermine or slow scientific research programs, degrade engineered systems over time or even contribute to catastrophic damage.”
Why this matters - this is how a superintelligence might prevent others from coming into existence: fast16 is a subtle, hard-to-find bug which has been designed to degrade an actor’s ability to do certain types of science. You might imagine that a superintelligence could view “AI non-proliferation” as being just as important as nuclear states view “nuclear non-proliferation”.
   Read more: fast16 | Mystery Shadow Brokers Reference Reveals High-Precision Software Sabotage 5 Years Before Stuxnet (Sentinel LABS).
***
Uh oh, the Muon optimizer kills neurons:
…Maybe Aurora is finally the optimizer to beat?...
Researchers with Tilde Research have done a tear-down of the Muon optimizer and found that it has some odd bugs that can damage the quality of models trained with it.
   “Muon’s update inherits row-norm anisotropy on tall matrices which can cause a significant portion of neurons in MLP layers to permanently die,” they write. “Muon can result in neuron death in MLP layers, whereby some neurons receive persistently small updates early in training and fail to recover”.
What happened: “Under Muon, neurons are initially alive with uniformly high leverage, but a large fraction of neurons die during learning rate warmup and never recover. By step 500, more than one in four neurons are effectively dead, producing a sharply bimodal distribution of leverage scores; one mass of neurons receives near-zero updates, and the other receives disproportionately large ones.”
Enter Aurora: In response to this the researchers build and make available Aurora, “a leverage-aware optimizer for rectangular matrices”. In tests, this optimizer works, though they only run it at small scales.
   “We train 1.1B-parameter transformers on ~100B tokens and compare Aurora against Muon and NorMuon, each using PE-8. Aurora achieves the lowest final loss of all methods, reaching a smoothed loss of 2.26 at step 24k, which is a clear improvement over Muon (2.31) and NorMuon (2.33),” they write. “Aurora’s loss improvement translates to consistent gains on standard benchmarks... Strikingly, Aurora improves MMLU scores by 10 points over Muon. We hypothesize that since MLPs are predominantly responsible for memorization, Aurora’s gains are most visible on memorization-intensive benchmarks like MMLU.”
    Alexander Doria, a researcher with Pleias, has already independently validated this, with Aurora outperforming Muon and AdamW on a 600M-parameter model.
Why this matters - the endless quest to defeat AdamW: For many years, researchers have been competing with one another to build a better optimizer than AdamW. No one has conclusively done this yet and there is a long line of failed attempts. Could Aurora beat AdamW? It’s unclear. But does this study highlight just how hard it is to build optimizers? Absolutely.
  Read more: Aurora: A Leverage-Aware Optimizer for Rectangular Matrices (Tilde Research).
   Get the code here: Aurora (Tilde Research, GitHub).
***
Alignment is good at ensuring we don’t die, but how do we ensure that we thrive?
…Positive alignment for figuring out what the good life looks like…
A collection of academic and corporate researchers have written a position paper making the case for what they call “positive alignment”, but might be better thought of as ‘building AI systems that help people live good lives’. It’s an interesting line of thinking - if we are able to deal with things like misuse and misalignment, then we need to ask what comes next? What does success look like once we’ve made systems “safe”? That’s what positive alignment is grappling with.
Who did this: The paper comes from people affiliated with the University of Oxford; Google DeepMind; LIFE; OpenAI; Anthropic; UCLA; Aily Labs; Stanford University; Tufts University; Positive AI Labs; the University of Sussex; and Imperial College London.
Definitions: Positive alignment is “the development of AI systems that (i) remain safe and cooperative and (ii) actively support human and ecological flourishing in a pluralistic, polycentric, context-sensitive, and user-authored way.”
Motivation: “In the last decade, negative alignment has understandably prioritized failure-mode reduction. However, if we want AI systems that improve human outcomes in the environments where they will actually be used, we may benefit from an additional research program that treats alignment as constructively supportive of human aims, and that operationalizes this support with the same technical acumen that safety has brought to harm prevention,” they write. “As AI becomes embedded in education, medicine, governance, and everyday sensemaking, a solely negative posture risks optimizing our information ecology for risk avoidance rather than human development. It may reduce catastrophic errors while leaving society in a local optimum of superficial and ‘soulless’ assistance.”
What are some illustrations of the ways safety falls short? The authors lay out some criticisms of mainstream AI safety, though I find some of these criticisms are a bit weak and could be read as interpreting some existing research uncharitably or discounting it. Nonetheless, some issues in their view include:
- Floor without ceiling: “A model can satisfy all safety constraints while being mediocre, sycophantic, or unhelpful” 
- Preference-wellbeing divergence: “Users may prefer flattery over honest feedback, quick answers over genuine understanding, engagement over growth… Optimizing for preference satisfaction can therefore actively work against users’ deeper interests”. 
- Hidden value system: “The language of safety obscures that value judgments are being made… Positive alignment, by contrast, acknowledges its value-laden nature explicitly”. 
- Scalability: “A positive orientation may generalize better than exhaustive negative enumeration, providing more resilient, positive orientations in novel situations where no specific prohibition applies or can be enforced.” 
Governance for positive alignment requires diversity: Building positive alignment seems to require a multitude of different AI systems with different values that are governed by different entities - the opposite of the monopolistic centralized control worlds thought of by others in the AI safety community. “Positive alignment quickly runs into persistent moral pluralism: reasonable communities disagree about what good looks like and those disagreements don’t reliably converge”, they write. “Positive alignment should not be imposed top-down by a central state or a small, opaque cluster of labs. It should, where possible, be expressed through decentralized, contestable processes that can be revised as norms and contexts change”.
Why this matters - grappling with success: Papers like this are fundamentally about confronting the success of technical safety - if we succeed in building powerful AI systems which are safe and trustworthy and aligned, then how do we turn these systems onto society in such a way they help individuals and societies build good lives. “Positive alignment ensures AI serves as a catalyst for a resilient, happy, and healthy global society,” the authors write. “Ultimately, AI should become a partner in the quest for a life well-lived.”
   Read more: Positive Alignment: Artificial Int
