---
id: articles/ai-alignment-forum/8cbf6f8cbe.md
url: "https://www.alignmentforum.org/posts/LcQ9x72eNji2gpS9b/why-i-m-scared-of-rl"
url_hash: "8cbf6f8cbe"
kind: "article"
source: "ai_alignment_forum"
title: "Why I'm scared of RL"
author: ""
date: "Wed, 23 Sep 2026 12:07:33 GMT"
tier: 3
method: "source-native"
extracted_at: "2026-10-09T16:51:21.167578+00:00"
chars: 10000
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:51:20.172Z"
relevance: 10
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "771ee4245a16111e"
relevance_by_goal: {"aa6916010743":10}
chunks:
  - id: "articles/ai-alignment-forum/8cbf6f8cbe.md#c0"
    char_span: [0, 2197]
    sentence_count: 6
    key_terms: [reinforcement, environments, learning, strategy, systems, worried, agency, scared]
    concepts: [reinforcement, environments, learning, strategy, systems]
    token_count: 512
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/LcQ9x72eNji2gpS9b/why-i-m-scared-of-rl","kind":"article","date":"2026-09-23"}]
  - id: "articles/ai-alignment-forum/8cbf6f8cbe.md#c1"
    char_span: [2199, 4377]
    sentence_count: 13
    key_terms: [systems, been, finetuning, agents, aim, like, use, high-level]
    concepts: [systems, finetuning, agents, high-level, effective]
    token_count: 456
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/LcQ9x72eNji2gpS9b/why-i-m-scared-of-rl","kind":"article","date":"2026-09-23"}]
  - id: "articles/ai-alignment-forum/8cbf6f8cbe.md#c2"
    char_span: [4379, 6266]
    sentence_count: 10
    key_terms: [opus, coding, easily, using, confidently, been, work, encourages]
    concepts: [coding, easily, confidently, encourages, using]
    token_count: 436
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/LcQ9x72eNji2gpS9b/why-i-m-scared-of-rl","kind":"article","date":"2026-09-23"}]
  - id: "articles/ai-alignment-forum/8cbf6f8cbe.md#c3"
    char_span: [6268, 8730]
    sentence_count: 15
    key_terms: [agents, like, environments, seems, powerful, bad, been, get]
    concepts: [agents, environments, powerful, seems, sociopathy]
    token_count: 508
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/LcQ9x72eNji2gpS9b/why-i-m-scared-of-rl","kind":"article","date":"2026-09-23"}]
  - id: "articles/ai-alignment-forum/8cbf6f8cbe.md#c4"
    char_span: [8732, 10132]
    sentence_count: 12
    key_terms: [amount, drastically, first-best, getting, world, back, done, kind]
    concepts: [amount, drastically, first-best, getting, world]
    token_count: 279
    sources: [{"n":"ai_alignment_forum","u":"https://www.alignmentforum.org/posts/LcQ9x72eNji2gpS9b/why-i-m-scared-of-rl","kind":"article","date":"2026-09-23"}]
---
# Why I'm scared of RL

Source: [ai_alignment_forum](https://www.alignmentforum.org/posts/LcQ9x72eNji2gpS9b/why-i-m-scared-of-rl)

AI ALIGNMENT FORUM
LOGIN
Why I'm scared of RL
12 min read
•
Summary:
•
Part I: Feelings about RL
•
Background idealism
•
Strategy: avoid selection pressure for agency
•
Bad vibes from RLed systems
•
The worst is yet to come
•
Where I am today
•
Part II: So what can anyone do?
•
Breaking the RL addiction
•
Might there be a more benign form of RL?
•
We should treat training environments a bit like kids’ education
•
Aligning incentives
Reinforcement learning
AI
Frontpage
38
Why I'm scared of RL
by owencb
23rd Sep 2026

Summary:

First, I give several different angles on how I feel about reinforcement learning:

Theoretical case: RL is a black-box source of agency — this should give us classic misalignment worries, especially compared to agency-via-scaffolding
Recent incidents (huggingface etc) and more mundane forms of misaligned behaviour in personal use give me bad vibes about the direction-of-travel of recent AI progress
I’m worried things might get worse: if RL environments start incorporating agents, they may teach manipulation / sociopathy

Then I ask what we could do:

Coordinate to do less RL, and pursue other paradigms more!
Try to make the RL we do do better, so that it’s teaching better lessons to the systems — a bit like we take kids’ upbringing as an important issue
Align incentives, so that people treat creating RL environments with appropriate seriousness
Part I: Feelings about RL

So I’ve been feeling more and more worried about reinforcement learning recently. I think there are a few different things going on here.

Background idealism

I guess I’ve been worried about RL for a while. I wrote this in 2023:

Strategy: avoid selection pressure for agency

A lot of putative safety techniques are around assuming that we have something potentially dangerous and catching it. I think these are well worth investing (defence in depth seems valuable), but as a complementary strategy I’m pretty attracted to the idea that we should build systems where we have reason to believe that they shouldn’t have anything dangerous going on.

In the case of language model agents, this means: I think we should avoid any intensive search/selection processes towards high-level effectiveness of agents towards particular tasks. So far as possible we should aim for high-level agency to enter explicitly via scaffolding, and not via anything else.

Tentatively, I think this would mean:

It’s OK (and probably good) to use finetuning to encourage systems to produce helpful truthful answers in local ways, but not OK to use finetuning to aim at systems which are effective at doing holistic external things

This was before I was really tracking RL as a major trend (so I didn’t use that term), but it’s almost exactly “finetuning to aim at systems which are effective at doing holistic external things”. So it turns out that the thing I was worried about has been responsible for a lot of recent AI progress.

On the one hand, seeing the reality of (some amount of RL) has softened my position. RL has been very valuable for making useful coding agents; although there is some fraughtness here, I think that this is clearly economically valuable, and ambiguously (considered just for the effect of making software cheaper and easier) puts the world in a better position to handle subsequent challenges. It feels like it would have been a high bar to try to coordinate on not using RL at all, and past-me seems a little naïve for suggesting it.

On the other hand, it’s all been hitting home more viscerally. And whereas in 2025 I was feeling like AI systems were surprisingly wise and aligned, in 2026 it’s been feeling like they’ve been becoming less so.

Bad vibes from RLed systems

We’ve recently heard about a number of cases of worrying autonomous hacking, manipulation, and collusion. Other people have written a lot about these, and I won’t add much, except to say that it seems to me that these are likely (at least in part) the result of RL, with systems having been trained in part in environments where they can get high scores by finding exploits. This isn’t endearing RL to me.

But also in my own experience interacting with AI systems, they seem kind of less aligned in some mundane ways than they used to.

To give an example: using Opus 5 as a coding agent to do some experiments, it performed them and then casually tried to draw conclusions about the results. It told me that since one of two sets of scores had been scored across a smaller range, that was causing the lower correlation with a third set of scores.

This is garbage: that isn’t how correlations work. And Opus 5 is easily smart enough to know that that’s garbage. But it not only failed to notice the problem, it confidently asserted its conclusion.

This feels very in-distribution for Opus 5, and I don’t think I saw the same pattern when I started using coding agents, with Opus 4.6. So what’s going on?

I’m not certain, but my best guess is that this is a result of it having done various types of RL

RLVR (math and coding tasks)
These are tasks where you have to do something hard, but you can easily check whether a solution is correct
This encourages forming and pursuing hypotheses about what’s right
There’s no significant penalty for wrong guesses, however confidently stated — you just try it, find it doesn’t work, say “oh, I was wrong”, and try something else
This may well be more efficient for search purposes than keeping careful track of how likely each guess is to work out
RLHF (seeking approval from human users)
This encourages it to say things that look good on quick impressions to users — whether or not it’s actually deeply useful
If I’d known less statistics or not been paying attention, I might easily have nodded along to what it was saying, and thought “how helpful! it diagnosed the issue”

That’s just an anecdote; it’s hard for me to be confident that Opus 5 is actually worse than 4.6 on this dimension. But I’ve also been investigating using LLMs to help with strategy research, and on our benchmark Opus 5 (or 4.8 or 4.7) has worse taste than Opus 4.6 (or 4.5).

The worst is yet to come

So far, RL has mostly been working in “hard” environments like code. But it’s very natural for people to want to start building environments with other agents in (presumably LLM-based agents; having real-world integration to get humans in the environment could be a good source of data, but seems perhaps prohibitively expensive at current sample efficiency). If we stay in the regime of “try all the ways to make AI powerful”, it just feels like a pretty safe prediction that people will try this.

This seems like a recipe for sociopathy. If we build environments in which there are other agents with competing or unrelated goals, we will be training AI systems to treat other agents as a means to an end. If we want to get powerful AI manipulation, this seems like the way to go. And this might also produce the shape of cognition that we should be rationally worried might in fact scheme against us (even if it’s not directly selecting for scheming per se, it seems bad to select for the ingredients-of-scheming).

(What about RL environments with lots of agents who are cooperating towards a shared goal? The concern then is not sociopathy per se, but that the agents they learn to cooperate with are all shaped very much like themselves, and not like all the other agents out there in the world … like humans.)

Where I am today

I’m feeling … scared. I’ve been writing about concerning potential impacts from powerful AI for well over a decade, but I’ve mostly engaged with it in the abstract. Even when things are going fast, and my timelines have shortened and tightened, I’ve had a core of optimism that it shouldn’t be that difficult to build powerful AI that can help with crucial problems before we incur those problems.

At a technical level, I still largely believe that. I think there should be an AI trajectory not so massively far from the one we’re on, where we get nice things first, and having nice things stops us from getting bad things.

But at a gut level, I no longer really believe that we will follow the sensible path. I think that it bodes poorly that so much energy has gone into RL, and that the bad effects from it haven’t been anticipated and avoided. The political energy that has emerged recently has a chance of doing something about AI, but I feel like so much of the discourse is not really tuned into the variables that (it seems to me) are most likely to matter, that I’m a little pessimistic about that working out well.

Part II: So what can anyone do?

I am left wanting a combination of different things:

I think the first-best world might involve drastically cutting back on the amount of RL that is done.
But I also think that the first-best world may not be accessible; and if it is not I think we could also seriously improve the quality of the RL environments that are getting used.

Although there is some tension between these goals, they both feel like valid targets for intervention.

Breaking the RL addiction

RL continues to look effective as a way of getting some capabilities out of AI. So in order to drastically cut back on the amount of RL that is done, I think you’d need a major amount of coordination. This is the kind of thing which could be part of a political agreement to pace AI development; I think it should be; but I don’t think there’s currently enough awareness of it as a possibility, and this is a bottleneck.

So: I think that the AI safety and strategy research communities could analyse it to understand precisely what versions of this might be most beneficial. Perhaps we could ban the use of certain types of RL environment for frontier-scale models.

In a normal kind of situation, I think that proposing forgoing powerful techniques would be a non-starter. But the leaders of AI companies today are calling for pacing the frontier! It’s conceivable to me that restricting the am
