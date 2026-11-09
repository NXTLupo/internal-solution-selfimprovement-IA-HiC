---
id: articles/microsoft-research/afba0cde78.md
url: "https://www.microsoft.com/en-us/research/blog/introducing-care-x-towards-clinically-useful-radiology-vlms-with-auxiliary-supervision-reward-aligned-learning-and-tool-augmented-measurement/"
url_hash: "afba0cde78"
kind: "article"
source: "Microsoft Research"
title: "Introducing CARE-X: Towards Clinically Useful Radiology VLMs with Auxiliary Supervision, Reward-Aligned Learning, and Tool-Augmented Measurement"
author: ""
date: "Tue, 11 Aug 2026 16:00:00 +0000"
tier: 1
method: "source-native"
extracted_at: "2026-08-25T23:41:27.273927+00:00"
chars: 10000
engagement: "identify-high-converting-email-design-patterns-and-product-m"
collected_at: "2026-08-25T23:41:27.384Z"
relevance: 0
engagement_goal: "Identify high-converting email design patterns and product marketing trends for 2026 to guide the template redesign of a clean, organic cosmetics and skincare brand targeting Gen Z."
content_hash: "9daa71a054c49968"
relevance_by_goal: {"bb7e192171b3":0,"8429cfd39d4f":0}
chunks:
  - id: "articles/microsoft-research/afba0cde78.md#c0"
    char_span: [0, 366]
    sentence_count: 1
    key_terms: [introducing-care-x-towards-clinically-useful-radiology-vlms-with-auxiliary-supervision-reward-aligned-learning-and-tool-augmented-measurement, microsoft, research, reward-aligned, tool-augmented, introducing, measurement, supervision]
    concepts: [microsoft, research]
    token_count: 86
    sources: [{"n":"Microsoft Research","u":"https://www.microsoft.com/en-us/research/blog/introducing-care-x-towards-clinically-useful-radiology-vlms-with-auxiliary-supervision-reward-aligned-learning-and-tool-augmented-measurement/","kind":"article","date":"2026-08-11"}]
  - id: "articles/microsoft-research/afba0cde78.md#c1"
    char_span: [368, 3272]
    sentence_count: 17
    key_terms: [clinical, research, care-x, clinically, tasks, radiologists, different, radiology]
    concepts: [clinical, research, care-x, clinically, radiologists]
    related_chunks: ["articles/microsoft-research/afba0cde78.md#c2"]
    token_count: 512
    sources: [{"n":"Microsoft Research","u":"https://www.microsoft.com/en-us/research/blog/introducing-care-x-towards-clinically-useful-radiology-vlms-with-auxiliary-supervision-reward-aligned-learning-and-tool-augmented-measurement/","kind":"article","date":"2026-08-11"}]
  - id: "articles/microsoft-research/afba0cde78.md#c2"
    char_span: [2882, 5732]
    sentence_count: 22
    key_terms: [clinical, confidence, generative, model, care-x, models, training, matters]
    concepts: [clinical, confidence, generative, model, care-x]
    related_chunks: ["articles/microsoft-research/afba0cde78.md#c1"]
    token_count: 512
    sources: [{"n":"Microsoft Research","u":"https://www.microsoft.com/en-us/research/blog/introducing-care-x-towards-clinically-useful-radiology-vlms-with-auxiliary-supervision-reward-aligned-learning-and-tool-augmented-measurement/","kind":"article","date":"2026-08-11"}]
  - id: "articles/microsoft-research/afba0cde78.md#c3"
    char_span: [5425, 8295]
    sentence_count: 18
    key_terms: [generative, grounding, auxiliary, representations, structured, calibrated, care-x, classification]
    concepts: [generative, grounding, auxiliary, representations, structured]
    token_count: 512
    sources: [{"n":"Microsoft Research","u":"https://www.microsoft.com/en-us/research/blog/introducing-care-x-towards-clinically-useful-radiology-vlms-with-auxiliary-supervision-reward-aligned-learning-and-tool-augmented-measurement/","kind":"article","date":"2026-08-11"}]
  - id: "articles/microsoft-research/afba0cde78.md#c4"
    char_span: [7871, 10369]
    sentence_count: 13
    key_terms: [care-x, measurements, quantitative, computation, measurement, across, visual, qwen3-vl-4b-instruct]
    concepts: [care-x, measurements, quantitative, qwen3-vl-4b-instruct, computation]
    token_count: 446
    sources: [{"n":"Microsoft Research","u":"https://www.microsoft.com/en-us/research/blog/introducing-care-x-towards-clinically-useful-radiology-vlms-with-auxiliary-supervision-reward-aligned-learning-and-tool-augmented-measurement/","kind":"article","date":"2026-08-11"}]
---
# Introducing CARE-X: Towards Clinically Useful Radiology VLMs with Auxiliary Supervision, Reward-Aligned Learning, and Tool-Augmented Measurement

Source: [Microsoft Research](https://www.microsoft.com/en-us/research/blog/introducing-care-x-towards-clinically-useful-radiology-vlms-with-auxiliary-supervision-reward-aligned-learning-and-tool-augmented-measurement/)

Research Note: CARE-X is a research model and not a Microsoft product offering or medical device. It has not been cleared or approved by any regulatory authority and is not intended for clinical diagnosis, screening, or patient care. The results described below are retrospective research findings and do not establish the safety, effectiveness, or suitability of CARE-X for any clinical use. References to potential workflows describe areas for future research, not currently available capabilities or recommended uses.
At a glance
- The challenge: Chest X-ray interpretation spans diverse tasks that require both expressive report generation and calibrated diagnostic predictions.
- CARE-X is a unified chest X-ray VLM for diverse clinical interpretation tasks. It combines generation and structured prediction to provide both free-text reasoning and deterministic outputs.
- CARE-X uses reinforcement learning (DAPO) to reward clinical correctness in a multi-task setting.
- In a separate research experiment from CARE-X, we paired Qwen3-VL-4B-Instruct with deterministic measurement tools to evaluate whether direct computation could improve performance on measurement-dependent conditions compared with visual approximation alone.
- Validated on real-world Indian clinical data from Narayana Health, including rare ICU pathologies and CT-confirmed enlargement conditions.
What radiologists need: Task diversity, flexibility, and clinical fidelity
A clinically useful radiology AI system must support a wide range of tasks, adapt to different workflows, and produce outputs that are medically accurate.
Radiologists and other clinicians use chest X-rays for many different purposes. A clinically useful AI system must be able to support that range of tasks. It may be asked to generate detailed findings and concise impressions for a report, answer questions about the presence, absence, or location of a finding, identify medical devices and assess their placement, or pinpoint exactly where an abnormality appears in an image.
These tasks also require different kinds of outputs, from narrative reports to calibrated diagnostic scores. And above all, they require clinical accuracy. A report could ostensibly be perfectly written yet clinically wrong if it misses a finding, reverses a negation, or misidentifies a location. Certain findings could be trivial in one context and vital to identify in another.
CARE-X was developed as a research model to explore how a unified approach can address these diverse demands. The system combines generative and discriminative capabilities, clinically aligned optimization, and tool-based reasoning to support a broader range of radiology workflows while maintaining clinical fidelity.
Gaps in current radiology vision-language models
Despite the impressive task breadth of recent models, critical gaps remain between what radiologists need and what current systems deliver:
- No calibrated confidence for diagnostic decisions. Generative VLMs predict diagnoses as free text, but they typically do not provide calibrated confidence scores. In clinical settings, confidence matters. Clinicians cannot tune sensitivity–specificity trade-offs across clinical contexts—an important requirement for real-world deployment. Discriminative models provide these properties but lack the flexibility of open-ended generation.
- Cross-entropy loss does not optimize clinical fidelity. Standard training methods treat all token-level errors similarly, regardless of their clinical consequences. A coordinate mistake may be penalized no more than a harmless wording change. A “yes” can be flipped to a “no” even though the clinical meaning is completely different. Missing a life-threatening finding may carry the same training penalty as omitting a minor observation. As a result, models are not explicitly optimized for what matters most in patient care.
- No capability for measurement-dependent findings. Some radiological findings require more than visual recognition. Radiological signs such as cardiomegaly, mediastinal widening etc. depend on precise measurements. For example, a model may correctly recognize whether a chest radiograph was acquired using an AP or PA view. But determining cardiomegaly requires measuring the cardiac and thoracic widths and determining the cardiothoracic ratio. Those quantities should be measured and computed rather than visually approximated while considering variables such as type of view, exposure, rotation of the patient etc.
Together, these gaps call for more than a fluent generative model. The system must combine broad task coverage, structured predictions, clinically aligned optimization, and quantitative tools where direct measurement is required.
CARE-X: One model, flexible outputs
CARE-X brings these diverse interpretation capabilities into one model, using generative or dual inference according to the needs of each task:
Dual inference means that a single forward pass produces both an autoregressive response and a structured auxiliary-head prediction with a confidence score. This provides free-text flexibility alongside threshold-adjustable outputs for tasks where operating-point control matters.
The CARE-X architecture and training approach
CARE-X is built on a SigLIP2-so400M vision encoder and a Phi-4-mini-instruct (3.8B) language model connected through a lightweight adapter. To support both free-text generation and structured clinical predictions, the model augments the shared language backbone with task-specific auxiliary heads for classification and visual grounding. These heads provide calibrated diagnostic predictions and spatial localization signals while sharing representations with the generative language model. Rather than being trained independently, they are co-trained with the language-modeling objective, allowing structured supervision to enrich shared representations and improve generative performance on the same tasks.
Training. CARE-X uses a three-stage supervised fine-tuning pipeline (vision pre-training, adapter/head training, and LoRA adaptation) followed by DAPO-based reinforcement learning. DAPO optimizes task-specific rewards for clinical reporting, diagnostic accuracy, and spatial grounding quality.
Auxiliary supervision: Structured prediction strengthens generation
A central finding of this work is that co-training discriminative auxiliary heads with a generative VLM enriches shared representations, leading to stronger generative performance on the same tasks while also providing calibrated structured predictions.
Grounding improvements
The auxiliary grounding head consistently improves localization over generative decoding. On anatomical grounding (Chest ImaGenome), mAP and mIoU increase by +28.2 pp and +6.2 pp, while the largest gains occur on phrase grounding (PadChest), with +24.6 pp mAP and +14.1 pp mIoU. The composite spatial loss enhances geometric precision in shared representations.
DAPO bridges the gap to dedicated detection heads
DAPO-trained generative output approaches or exceeds the SFT auxiliary detection head. On Anatomy grounding, CARE-X generative (0.868 mAP) surpasses the SFT detection head (0.865). This is practically significant—it demonstrates that reward-aligned learning can bring autoregressive spatial decoding to parity with structured prediction, offering clinicians a single generative inference mode without requiring auxiliary heads at test time.
Calibrated classification with tunable operating points
Beyond representation enrichment, the classification head offers a distinct deployment advantage: calibrated probability scores with tunable thresholds allow clinicians to shift between high-sensitivity screening and high-specificity confirmation from a single forward pass—a capability purely generative architectures cannot provide.
Strong report generation across four benchmarks
Within the paper’s comparison set, CARE-X achieves the strongest performance on most reported metrics across MIMIC-CXR, IU-Xray, CheXpert-Plus, and ReXGradient. CRIMSON, a held-out metric that evaluates abnormal findings and weights errors by clinical severity, suggests these gains reflect clinically meaningful improvements rather than reward-specific optimization.
CARE-X reaches 94% accuracy on ReXVQA
CARE-X ranks first on the ReXrank RexVQA leaderboard (opens in new tab) as of August 2026. On the ReXVQA benchmark (41,007 question–answer pairs across five clinically relevant categories), CARE-X reaches 94% overall accuracy, six percentage points above the next-best publicly reported model.
Tool-augmented measurement: Interleaving perception and computation
Some radiological findings depend on quantitative measurements rather than visual patterns. In a separate research experiment from CARE-X, we built an inference-time pipeline that combines Qwen3-VL-4B-Instruct with deterministic measurement tools, allowing the model to alternate between image understanding and precise computation. Qwen3-VL-4B-Instruct retains visual access to the radiograph throughout inference, invoking tools to identify anatomical landmarks, compute measurements, and evaluate diagnostic thresholds as needed. This creates a multi-turn reasoning loop that interleaves perception and measurement, enabling the model to combine visual context with exact quantitative evidence before reaching a diagnosis.
Despite requiring no task-specific training, this approach substantially outperforms perception-only inference across all evaluated measurement-based conditions. The results suggest that for threshold-dependent diagnoses, direct computation of clinically defined measurements is more reliable than visual approximation alone.
More broadly, this measurement-augmented approach could augment clinical workflows by expanding the set of quantitative assessments routinely derived from chest radiographs. For example, aortic dilation is not typically quantified on CXR and is often detected only incidentally on CT scans obta
