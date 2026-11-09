---
id: articles/nvidia-developer/1b310febff.md
url: "https://developer.nvidia.com/blog/efficient-moe-training-for-biological-foundation-models/"
url_hash: "1b310febff"
kind: "article"
source: "NVIDIA Developer"
title: "Efficient MoE Training for Biological Foundation Models"
author: ""
date: "2026-09-24T15:00:00Z"
tier: 2
method: "source-native"
extracted_at: "2026-11-09T00:41:48.964033+00:00"
chars: 7691
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
collected_at: "2026-11-09T00:41:48.816Z"
relevance: 0
engagement_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations  Determine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.  Explore:  Which AI platforms students use and pay for Career-related use cases: resumes, job discovery, interview prep, networking, skills development Movement from simple prompting toward persistent assistants, agents, memory and connected tools Expectations that AI should know their context rather than start from scratch Differences by AI fluency, age, discipline and career stage  Social listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.  3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.  2. Assess the emerging“Bring Your Own AI” model  Determine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.  Specifically investigate:  Preference for a personally chosen AI vs. institution-provided assistant Evidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products Willingness to connect personal AI to trusted institutional services Expectations for interoperability, memory, portability and personalization Analogous models emerging in banking, healthcare, commerce and enterprise SaaS  This directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.  Key output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.  3. Map consumer trust, privacy and control expectations  Identify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.  Focus on:  What information consumers willingly give AI What information they consider sensitive Differences between AI accessing data and AI writing data back Expectations around consent, transparency, memory and deletion Concern about universities/employers seeing personal AI interactions Behaviors consumers already use to protect themselves Trust differences among an institution, an AI provider and a third-party platform  This addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.  Key output: a consumer AI trust and permission framework that can guide architecture and UX decisions.  4. Identify where proactive AI creates value versus backlash  Determine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.  Analyze market reaction to:  AI notifications and nudges Persistent memory Recommendations based on behavior Autonomous task completion AI detecting problems before the user asks Emotional or motivational interventions AI escalating something to a human  This directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.  Key output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.  5. Define the evolving role of humans in AI-mediated guidance  Understand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.  Look comparatively across:  Career advising Academic advising Healthcare navigation Financial advice Customer service Coaching and mentoring  Study the moments when consumers say:  “AI can handle this.”  versus:  “AI can help me prepare, but I want a person making this call.”  That maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.  Key output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.  The synthesis question  These five objectives ladder into one strategic market question:  As AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
content_hash: "e1587b769a352e9a"
relevance_by_goal: {"aaf3b0416610":0}
chunks:
  - id: "articles/nvidia-developer/1b310febff.md#c0"
    char_span: [0, 177]
    sentence_count: 1
    key_terms: [efficient-moe-training-for-biological-foundation-models, developer, nvidia, biological, foundation, efficient, training, models]
    concepts: [developer, nvidia]
    token_count: 37
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/efficient-moe-training-for-biological-foundation-models/","kind":"article","date":"2026-09-24"}]
  - id: "articles/nvidia-developer/1b310febff.md#c1"
    char_span: [179, 2865]
    sentence_count: 16
    key_terms: [expert, computation, kernel, implementation, training, architectures, models, nvidia]
    concepts: [expert, computation, implementation, kernel, architectures]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/efficient-moe-training-for-biological-foundation-models/","kind":"article","date":"2026-09-24"}]
  - id: "articles/nvidia-developer/1b310febff.md#c2"
    char_span: [2538, 5025]
    sentence_count: 16
    key_terms: [groupedlinear, mxfp8, activation, expert, training, scaling, use, grouped]
    concepts: [groupedlinear, activation, mxfp8, expert, training]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/efficient-moe-training-for-biological-foundation-models/","kind":"article","date":"2026-09-24"}]
  - id: "articles/nvidia-developer/1b310febff.md#c3"
    char_span: [4719, 7010]
    sentence_count: 13
    key_terms: [groupedlinear, scaledswiglu, sequential, recipe, dequantization, fused, training, quantization]
    concepts: [groupedlinear, scaledswiglu, sequential, dequantization, recipe]
    token_count: 512
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/efficient-moe-training-for-biological-foundation-models/","kind":"article","date":"2026-09-24"}]
  - id: "articles/nvidia-developer/1b310febff.md#c4"
    char_span: [6725, 7871]
    sentence_count: 6
    key_terms: [recipe, configuration, config-name, parallelism, transformer, checkpoint, benchmark, torchrun]
    concepts: [recipe, configuration, config-name, parallelism, transformer]
    token_count: 276
    sources: [{"n":"NVIDIA Developer","u":"https://developer.nvidia.com/blog/efficient-moe-training-for-biological-foundation-models/","kind":"article","date":"2026-09-24"}]
---
# Efficient MoE Training for Biological Foundation Models

Source: [NVIDIA Developer](https://developer.nvidia.com/blog/efficient-moe-training-for-biological-foundation-models/)

As language models grow, scaling dense architectures becomes increasingly expensive. In a dense transformer, every token passes through every layer, so adding capabilities increases computation for both training and inference.
Mixture-of-experts (MoE) architectures take a different approach to scaling by using many subnetworks, or experts, while activating only a small subset for each token.
This tradeoff has made MoE architectures increasingly attractive to the large language model (LLM) community. They can scale model capacity more efficiently, but the benefits depend heavily on implementation. Fragmented expert computation can reduce GPU utilization. Routing adds communication overhead, and larger parameter footprints create memory and distributed-training challenges. NVIDIA Transformer Engine (TE) helps address these bottlenecks with optimized primitives for grouped expert computation, kernel fusion, and low-precision training. As biological foundation models grow in parameter count and sequence length, these primitives can improve GPU efficiency while expanding model capacity.
This tutorial shows how to put these techniques into practice with the NVIDIA BioNeMo MoE recipe and TE. You’ll see how GroupedLinear improves expert computation, MXFP8 reduces memory use, and the GroupedMLP kernel fuses quantization, SwiGLU, and routing-weight scaling. Together, these capabilities provide a practical reference for efficiently training MoE-based biological foundation models.
Prerequisites
Before you begin, you need:
- Familiarity with Python, PyTorch, and distributed training concepts
- An NVIDIA CUDA-enabled environment—you can use the linked Dockerfile or install the recipe requirements
- At least two GPUs for expert parallelism; NVIDIA Blackwell GPUs are required to use the fused MXFP8 GroupedMLP kernel
Challenge 1: Fragmented expert kernels
MoE models replace a single dense feed-forward block with multiple expert networks. A naive implementation, however, can trigger excessive kernel launches. For example, the Hugging Face baseline implementation iterates over all experts in a Python loop, with each expert triggering separate kernel launches.
for expert_idx, expert_layer in enumerate(self.experts):
    idx, top_x = torch.where(expert_mask[expert_idx])
    current_state = hidden_states[None, top_x].reshape(-1, hidden_dim)
    current_hidden = expert_layer(current_state) * routing_weights[top_x, idx, None]
    final_hidden_states.index_add_(0, top_x, current_hidden)
Grouped execution preserves the individual expert matrices but submits their work together. TE’s GroupedLinear applies multiple linear transformations in one call by gathering the expert weights and input tokens. Because each expert can receive a different number of tokens, GroupedLinear accepts per-expert token counts (split_sizes). It submits the local experts through the TE grouped GEMM path instead of launching one PyTorch Linear operation per expert, reducing launch and scheduling overhead.
Use GroupedLinear as follows. Each expert retains its own weight tensor (weight0, weight1, and so on), and the call accepts the per-expert token counts as an additional positional argument:
from transformer_engine.pytorch.ops import GroupedLinear
experts_gate_up = GroupedLinear(
    num_groups=num_local_experts,
    in_features=hidden_size,
    out_features=2 * intermediate_size,
    bias=False,
    dtype=torch.bfloat16,
    device="cuda",
)
gate_up_output = experts_gate_up(tokens, split_sizes)
Compared with the Python loop, this approach submits the gate-up projections as one grouped operation instead of multiple separate calls.
Hugging Face Transformers also provides grouped_mm. However, TE can fuse GroupedLinear with MXFP8 quantization, activation, routing-weight scaling, and intermediate data movement into a GroupedMLP kernel, as shown in the later sections.
Challenge 2: Large model size and activation memory
MoE architectures increase total parameter capacity, and genomics workloads often use long sequences, which puts pressure on activation memory during training. BF16 uses 16 bits to represent each model weight and activation.
The BioNeMo recipe uses TE to support FP8 and MXFP8 training, reducing memory use. Both formats represent weight and activation values with 8 bits instead of 16. The main difference between FP8 and MXFP8 is scaling granularity: MXFP8 assigns a scaling factor to each block of 32 consecutive values, helping preserve numerical range and accuracy. On NVIDIA Blackwell GPUs, MXFP8 is hardware-accelerated, enabling MXFP8 GEMMs to use specialized Tensor Core instructions. For details about MXFP8 and block scaling, see the Transformer Engine FP8 primer.
Challenge 3: Quantization overhead in low-precision training
Although most training computation uses 8-bit precision, the model retains its master weights in 16 bits. The training framework therefore adds quantization and dequantization steps to convert between formats. Quantization converts BF16 weights and activations to MXFP8 before the low-precision GEMM; dequantization converts the result back to the higher-precision format. A naive path performs these steps as separate operations, motivating the fused MLP path described next.
fp8_recipe = te_recipe.MXFP8BlockScaling()
model = TEMixtralMXFP8ForCausalLM(config, fp8_recipe=fp8_recipe, dispatcher=dispatcher)
The TE autocast API enables MXFP8 precision for the model’s forward and backward passes:
with te.autocast(enabled=True, recipe=self._fp8_recipe):
    for decoder_layer in self.layers:
        hidden_states = decoder_layer(hidden_states)
See the BioNeMo recipe for the complete code.
To use the fused MLP, import the Transformer Engine Sequential API to chain together gate_up, ScaledSwiGLU, and down. The API also folds dequantization into the fused path. ScaledSwiGLU combines the routing probabilities (“scales”) with the expert feed-forward network computations.
from transformer_engine.pytorch.ops import GroupedLinear, ScaledSwiGLU, Sequential
experts_ffn = Sequential(GroupedLinear(gate_up), ScaledSwiGLU(), GroupedLinear(down))
The TE Sequential API scans the operations and, when the pattern matches, replaces the GroupedLinear → ScaledSwiGLU → GroupedLinear sequence with a fused operation object: ForwardGroupedMLP_CuTeGEMMSwiGLU_MXFP8 for the forward pass and a matching fused backward operation. This reduces framework overhead, fuses the SwiGLU and probability-scaling work into the grouped MLP path, and avoids materializing some intermediate results.
Results
These are several of the optimizations in the BioNeMo recipe. In our training benchmark on eight NVIDIA B200 Tensor Core GPUs, the recipe delivered up to 2.21x the throughput of the Hugging Face baseline.
Run the recipe
Start with the two-GPU L0_sanity configuration to confirm that expert parallelism and the training environment work correctly:
torchrun --nproc_per_node=2 train_fsdp2_ep.py --config-name L0_sanity
After validation, scale to the Mixtral-8x7B configuration with expert parallelism (EP=8) and MXFP8 precision across eight GPUs:
torchrun --nproc_per_node=8 train_fsdp2_ep.py --config-name L1_8x7B_ep checkpoint.ckpt_dir=/path/to/ckpt
Select BF16 or MXFP8 based on your GPU and memory requirements and set the data-parallel and expert-parallel sizes so their product equals the total GPU count. The recipe README includes launch, checkpoint, and benchmark commands.
Try the Mixtral Native Transformer Engine recipe in BioNeMo Recipes and learn more about the optimized MoE kernels in the NVIDIA Transformer Engine documentation.
Acknowledgments
Sudhakar Singh, Varun Thumbe, Santosh Santosh, Timur Rvachov, and Chris Hoge.
