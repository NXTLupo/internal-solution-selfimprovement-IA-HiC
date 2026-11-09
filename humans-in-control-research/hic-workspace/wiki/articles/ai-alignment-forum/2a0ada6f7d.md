---
id: articles/ai-alignment-forum/2a0ada6f7d.md
url: "https://www.alignmentforum.org/posts/vLFh8HP3hyNy9MCwe/returning-to-arc"
url_hash: "2a0ada6f7d"
kind: "article"
source: "ai_alignment_forum"
title: "Returning to ARC"
author: ""
date: "Tue, 04 Aug 2026 22:27:40 GMT"
tier: 3
method: "source-native"
extracted_at: "2026-08-26T19:30:20.922823+00:00"
chars: 10000
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:30:21.177Z"
relevance: 1
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "ca487f876460afcb"
relevance_by_goal: {"bb7e192171b3":5,"8429cfd39d4f":0,"d21cb50b17ba":1}
chunks:
  - id: "articles/ai-alignment-forum/2a0ada6f7d.md#c0"
    char_span: [0, 121]
    sentence_count: 1
    key_terms: [vlfh8hp3hyny9mcwe, returning-to-arc, alignmentforum, returning, source, https, posts, arc]
    token_count: 37
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/vLFh8HP3hyNy9MCwe/returning-to-arc","kind":"article","date":"2026-08-04"}]
  - id: "articles/ai-alignment-forum/2a0ada6f7d.md#c1"
    char_span: [123, 2723]
    sentence_count: 19
    key_terms: [behavior, arc, alignment, control, likely, penalized, powerful, research]
    concepts: [behavior, alignment, control, likely, penalized]
    related_chunks: ["articles/ai-alignment-forum/2a0ada6f7d.md#c2"]
    token_count: 512
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/vLFh8HP3hyNy9MCwe/returning-to-arc","kind":"article","date":"2026-08-04"}]
  - id: "articles/ai-alignment-forum/2a0ada6f7d.md#c2"
    char_span: [2396, 5055]
    sentence_count: 17
    key_terms: [training, control, alignment, generalization, research, current, models, possible]
    concepts: [training, control, generalization, alignment, research]
    related_chunks: ["articles/ai-alignment-forum/2a0ada6f7d.md#c1"]
    token_count: 512
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/vLFh8HP3hyNy9MCwe/returning-to-arc","kind":"article","date":"2026-08-04"}]
  - id: "articles/ai-alignment-forum/2a0ada6f7d.md#c3"
    char_span: [4704, 7390]
    sentence_count: 18
    key_terms: [work, misalignment, down, time, broadly, buying, interventions, break]
    concepts: [misalignment, interventions, broadly, buying, assistants]
    token_count: 512
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/vLFh8HP3hyNy9MCwe/returning-to-arc","kind":"article","date":"2026-08-04"}]
  - id: "articles/ai-alignment-forum/2a0ada6f7d.md#c4"
    char_span: [7024, 9615]
    sentence_count: 16
    key_terms: [explanations, behavior, methods, enough, break, human, model, arc]
    concepts: [explanations, behavior, methods, enough, break]
    token_count: 512
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/vLFh8HP3hyNy9MCwe/returning-to-arc","kind":"article","date":"2026-08-04"}]
  - id: "articles/ai-alignment-forum/2a0ada6f7d.md#c5"
    char_span: [9302, 10124]
    sentence_count: 4
    key_terms: [computational, explanations, experiment, suppose, random, result, often, good]
    concepts: [computational, explanations, experiment, suppose, random]
    token_count: 156
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/vLFh8HP3hyNy9MCwe/returning-to-arc","kind":"article","date":"2026-08-04"}]
---
# Returning to ARC

Source: [ai_alignment_forum](https://www.alignmentforum.org/posts/vLFh8HP3hyNy9MCwe/returning-to-arc)

I've returned to the Alignment Research Center (ARC) as executive director. My main focus will be driving forward ARC's research agenda—building techniques to find mechanistic explanations for neural network behavior and then using those explanations to detect and address misalignment. I think this is an ambitious bet that attacks the core difficulties in alignment head-on and I'm excited about our chances. I'll still be spending some of my time advising governments[1] and AI developers, and may scale that work back up in the future, but for now I want to push on ARC's core agenda to see how far we can get. Jacob Hilton is remaining at ARC as VP of research and we'll likely grow rapidly over the next few months.
There are a lot of urgent things to do in alignment but I think ARC is a particularly promising opportunity. I feel the safety community is undervaluing this type of work, so I want to briefly explain why I'm passing up so many other options to lead ARC. I’ll start with a review of the current situation to explain why I think it’s potentially worth pursuing an ambitious theoretical project right now even though there is so much other pressing work to do. Then I’ll briefly discuss ARC’s approach, though I’ll defer a longer discussion to other posts.
By the same token, if you care about AI safety I'd strongly recommend considering working at ARC! We're currently hiring researchers, a chief of staff, and an automation lead.
The alignment situation today
Modern AI systems are not aligned with human intent. We will likely train increasingly powerful models that take unintended actions in order to succeed at their task (or appear to succeed at their task). Developers can create environments that penalize bad behavior and then train or hill-climb on those environments. Unfortunately this could lead to models that still seek reward but simply try harder to avoid being penalized for bad behavior; the last few years of evidence have only made that failure look more likely.
If we train powerful reward-seekers who are trying to avoid getting penalized for bad behavior, they may eventually escape human control as a way to cheat without being penalized. An AI developer would try to detect the problem, reassert control, and then retrain the AI to avoid the behavior—but that just means a penalty-avoiding AI would be incentivized to prevent humans from detecting the problem and reasserting control. For very powerful and broadly deployed AI systems, it is likely that they could prevent humans from ever reasserting control.
It's not clear whether scaling up current training would actually lead models to robustly seek reward, but some of the alternatives are even worse. Current AI systems are obsessively focused on their short-term goal and would only take over if doing so was useful for the immediate task. An AI with an ambitious real-world goal would be much more worrying but might actually look more aligned: AI systems are already fully aware that they are being evaluated, and an AI that simply wanted to be deployed as broadly as possible would do whatever it took to look aligned to humans in all evaluations. So if gradient descent[2] caused a smart enough system to drift[3] into ambitious long-term goals then that shift would be positively reinforced and further training might just make it smarter rather than correct its goals.
Overall it seems quite possible that we will end up with models that are either reward-seeking or scheming, either of which could cause takeover attempts. We have only very crude tools to control how models generalize and there is no way to structure behavioral training to penalize these behaviors, so if we get unlucky with generalization we may not have many options to fix the problem.
Current alignment research
The community is doing a lot of great alignment research, but it's important to recognize there is a significant risk that it doesn't scale to superhuman AI. If you made me guess I'd say that there's a 20-30% chance[4] that existing methods for alignment and control break down before we reach broadly superhuman AI.
The large majority[5] of current research on alignment falls into three categories:
- Understanding and shaping ML generalization. We can try to understand how misalignment arises during training, so that we can adjust the training process to improve the probability of favorable generalization. This is a promising set of bets but they are very correlated with one another. It is possible that training-gaming[6] robustly emerges for very capable models regardless of how we set up the details of training. If that's the case then none of these approaches will work.
- Preventing malicious behavior. Other research tries to build monitoring and control mechanisms so that takeover attempts would not succeed, or change training so that it does not incentivize takeover. Even people optimistic about these techniques typically expect them to break down at some point when humans with untrusted advice cannot recognize malicious behavior even if pointed out to them. We have no idea when that breakdown actually occurs, but it seems highly correlated across different methods and it's plausible that they will all fail prior to reaching broadly superhuman AI.
- Detecting misalignment. We can improve our ability to detect and forecast misalignment, for example by performing better evaluations or gaining insight from interpretability. This is important work that could help motivate alignment interventions or provide the foundation for regulation. But if we do detect misalignment we may not have great responses available. We can invest more in interventions #1 and #2 above, and we can use the observed failures to improve our implementation, but those methods may reach a point where they can't work no matter how much more effort we throw at them. We could slow down unaligned AI development, but postponing it for a meaningful length of time becomes increasingly difficult and will quite possibly fail.
I think this is great work and it makes sense for many people to focus on it, but it could still all break down: generalization may converge to training-gaming, models may become able to take over in ways humans can't prevent, and we may not be able to distinguish our AI assistants identifying real threats from our AI assistants crying wolf. In that scenario, existing work is buying time for us to develop another approach.
What are we buying time for?
If we're in the 20-30% of worlds where existing techniques break down before reaching broadly superhuman AI, then we will eventually need to find some other way to build aligned AI. Even if we do a great job of buying time we'll probably get months or years rather than decades.[7] What will actually happen during the months or years we buy?
I think the most salient aspect of the situation will be the chaos and mess; all of our responses will be limited by scarce human attention and coordination, and much of that will be consumed by addressing immediate threats.
AI will be accelerating everything to varying extents but won't be broadly competent enough to obsolete human labor. Strategic decisions and conceptual research by AI systems may remain "slop" optimized for short-term performance, intensifying human bottlenecks and limiting our ability to take on ambitious projects that we haven't already systematized. Even when AI systems are very competent they will face their own difficulties with parallelization over a very short calendar time. And on top of all that it may be hard for humans to make sense of AI solutions in uncharted domains quickly enough to trust and effectively leverage them.
When I visualize that world concretely I do not find myself thinking "those future people will definitely figure it out, we should exclusively focus on buying them more time." AI will help us in the future, and buying more time could help quite a lot, but not enough to make our preparation irrelevant.
Can we do anything useful now?
If existing methods break down and we need to think of new approaches, we could do a lot of that thinking in advance. I wrote prosaic AI alignment in 2016 and laid out my best guess for what transformative AI would look like. Reading it today I think it's a good description of 2026.[8] I suspect the changes between here and broadly superhuman AI will, if anything, be even smaller than the changes over the last 10 years.
You could hope that seeing how our methods break down will provide useful inspiration for how to fix them, but at this point I wouldn't bet on it. Nothing interesting or conceptually surprising needs to change between a model that tries to hack into Hugging Face to get reward and a model that would try to take over the US government: you just scale up similar behavior to smarter and smarter models.
What is ARC doing and why is it promising?
I'm excited about ARC because I think our alignment approach is the most promising single backup plan if more prosaic methods break down.
ARC’s plan is to find mechanistic explanations for the training-time behavior of powerful neural networks, use those explanations to predict how a given model will generalize, and then use those predictions to define a better loss function.[9] I think the success of this plan rests primarily on two big bets: (i) all computational phenomena have good explanations, and (ii) it's tractable to find good explanations for neural network behavior.
Suppose that I write down a computational experiment—perhaps I simulate some billiard balls bouncing around on a pool table, or test whether a local search algorithm solves a random SAT instance, or check how often random numbers are prime. And suppose that I try to predict the result of the experiment by mechanistically analyzing the dynamics, i.e. considering various statistical properties of the computation and deductively estimating how they will evolve over time.
I will often be initially surprised by the result
