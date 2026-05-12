---
url: "https://www.reddit.com/r/MachineLearning/comments/1o8szk0/r_plain_english_outperforms_json_for_llm_tool/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[R] Plain English outperforms JSON for LLM tool calling: +18pp accuracy, -70% variance"
author: "tekToks"
date: "2025-10-17T05:30:35.000Z"
score: 132
upvote_ratio: 0.94
num_comments: 31
flair: "Research"
extracted_at: "2026-05-11T17:27:06.575Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# [R] Plain English outperforms JSON for LLM tool calling: +18pp accuracy, -70% variance

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1o8szk0/r_plain_english_outperforms_json_for_llm_tool/)
Posted by **tekToks** · **132↑** · **31 comments**

**TL;DR:** Tool-call accuracy in LLMs can be significantly improved by using natural language instead of JSON-defined schemas (\~+18 percentage points across 6,400 trials and 10 models), while simultaneously reducing variance by 70% and token overhead by 31%. We introduce Natural Language Tools (NLT), a simple framework that decouples tool selection from response generation and eliminates programmatic format constraints and extends tool calling to models even without tool-call support.

**Resources:** [Paper](https://arxiv.org/abs/2510.14453)

**Authors:** Reid T. Johnson, Michelle D. Pain, Jordan D. West

# The Problem

Current LLMs use structured JSON/XML for tool calling, requiring outputs like:

    {
      "tool_calls": [{
        "name": "check_talk_to_a_human",
        "description": "Used when the user requests..."
      }]
    }

This structured approach creates three  bottlenecks:

1. **Task interference**: Models must simultaneously handle multiple tasks, such as understanding queries, select tools, maintaining format constraints, and  generating responses.
2. **Format burden**: Research demonstrates that the more structured a model's output, the more its performance tends to degrade ([a great paper by Tam on the subject](https://arxiv.org/abs/2408.02442)).
3. **Context bloat**: Structured schemas increase token usage, since you define not only the tool name and description, but surrounding JSON or XML syntax.

Even when tool selection is separated from response generation, probability mass is diverted toward maintaining correct formatting rather than selecting the right tools.

# Method: Natural Language Tools (NLT)

We introduce a simple three-stage framework that replaces JSON with natural language:

[Example NLT architecture with Selector \> Parser \> Output](https://preview.redd.it/o80vloo1ylvf1.jpg?width=2259&format=pjpg&auto=webp&s=3c75d8e6986fd499c61ebb364acb4c69abbaf157)

**Stage 1 - Tool Selection:** Model thinks through if any tools are relevant, then lists each tool with a YES/NO determination:

    Thinking: (brief reasoning)
    Example Tool 1 - YES/NO
    Example Tool 2 - YES/NO
    Example Tool 3 - YES/NO
    Assessment finished.

**Stage 2 - Tool Execution:** Parser reads YES/NO decisions and executes relevant tools

**Stage 3 - Response:** Output module receives tool results and generates final response

**Evaluation:** 6,400 trials across two domains (Mental Health & Customer Service), 16 inputs per domain, 5 repetitions per input. Both original and perturbed inputs were tested to control for prompt engineering effects.

# Results

We find that NLT significantly improves tool-call performance, boosting accuracy by more than 18 percentage points (69.1% to 87.5%). Variance overall fell dramatically, falling more than 70% from .0411 to .0121 when switching from structured tool calling to NLT.

DeepSeek-V3 was a standout example, jumping from 78.4% to 94.7% accuracy while its variance dropped from 0.023 to 0.0016, going from among the least stable to the most consistent performer.

While we couldn't compare relative gain, NLT extends tool calling to models without native tool calling support (DeepSeek-R1: 94.1% accuracy).

# Basic NLT Template

**Basic NLT Prompt Template:**

    You are an assistant to [Agent Name], [context].
    
    Your mission is to identify if any of the following topics have 
    been brought up or are relevant:
    
    - Tool 1 (description of when to use it)
    - Tool 2 (description of when to use it)
    ...
    
    Your output should begin by thinking whether any of these are 
    relevant, then include the name of every tool followed by YES or NO. 
    End with "Assessment finished."
    
    Format:
    Thinking: (reasoning)
    Tool 1 - YES/NO
    Tool 2 - YES/NO
    ...
    Assessment finished.

Full prompts and implementation details in [Appendix A](https://arxiv.org/abs/2510.14453). Works immediately with any LLM with no API changes or fine-tuning needed.

# Limitations

**Latency considerations:** NLT requires minimum two model calls per response (selector + output), whereas structured approaches can respond immediately when no tool is needed.

**Evaluation scope:**  We examined single-turn, parameterless tool selection. While less complex than existing multi-turn benchmarks, it proved sufficiently rigorous -- no model achieved 100% accuracy in either condition.

A full discussion on limitations and areas for further research can be found in section 5.9 of the paper!

# Discussion & Implications

We propose five mechanisms for these improvements:

1. **Reduced format burden**: Requiring structured outputs (e.g. JSON) may divert the model's probability mass toward syntax control rather than task accuracy
2. **Reduced task interference**: By separating the tool selection into its own distinct stage, task interference can be  sidestepped.
3. **Training alignment**: The majority of model training is on outputting human-readable text, and NLT better aligns with this training paradigm. This is further supported by our results, as open-weight models see more pronounced gains. This makes intuitive sense, as open-weight models typically have fewer resources to invest in structured tool-call training.
4. **Explicit full-catalog consideration**: Requiring the model to explicitly include each tool name in its output avoids positional bias, allowing the model to "recollect" each tool right before it makes a determination.
5. **Reduced context length**: Even minor increases in tokens can degrade performance, and NLT used 47.4% fewer input tokens on average than its structured tool call counterpart (largely due to removing JSON boilerplate).

For agentic systems, the NLT approach could significantly boost tool selection and accuracy, particularly for open-source models. This may be especially relevant for systems-critical tool call capabilities (i.e. safety).

For model trainers, training efforts currently devoted to SFT and RLHF for structured tool calls may be better directed toward natural-language approaches. This is less clear, as there may be cross-training effects.

One of the authors here, happy to answer any questions about experimental design, implementation, or discuss implications! What do you think?

## Comments

- **here_we_go_beep_boop** (46↑): Great work. We use tool calling and json structured output extensively, and have seen examples where natural language queries (via ChatGPT) outperform the same taks when presented as structured outputs.

I got so sick of begging the LLM for a rigorous output format that structured outputs felt like a safe haven, although even then some of our more complex use cases surfaced examples where we still get json schema violations from the model (gpt4o). To the extent that we validate returned json and requery if necessary, increasing temperature and adding a random nonce to the prompt to bypass caching.

Will definitely be checking this out!
  - **tekToks** (9↑): Thanks!  
  
Yeah, I think the structured approach is still valid for a lot of use-cases, especially if you need back-and-forth immediate responses with very few tool calls. But when you expect to call tools often, or if the tools are critical, it seems like a more intentional tool layer is worth it.

I hope model providers catch on. Already, we find certain ones (looking at you, Gemini 2.5 Pro...) add random "json" markdown to outputs, just because they've been over-tuned on structured outputs with RLHF haha.

Too many humans saying "ooh, I like the markdown pretty print" 😅
    - **Mysterious-Rent7233** (2↑): >Already, we find certain ones (looking at you, Gemini 2.5 Pro...) add random "json" markdown to outputs, just because they've been over-tuned on structured outputs with RLHF haha.

If it *wants* to output JSON then maybe there is no performance cost in that context. And perhaps training them on more JSON is the path to reducing the performance penalty.

But yeah I noticed this Gemini behaviour today.
  - **CanWeStartAgain1** (3↑): To the extent that we validate returned json and requery if necessary,

Can you please elaborate on this? In my mind, this should not be possible, you are restricting at the logit level so the output format should be followed. Can you provide a similar example?
    - **Vadersays** (1↑): A simple case would be endlessly repeating { until the context window was exhausted, easy enough to do with older, dumber models. I wonder if there could be some escape character trickery?
- **nonotan** (26↑): Paper seems all right, but perhaps over-extrapolating from the limited testing done. I'm not at all surprised that natural language would outperform structured output when it comes to simply generally picking a relevant tool. Undoubtedly the same would hold if a human was tested instead of an LLM. The point of structured output is that it allows specifying highly precise parameters in exactly the format the tool will be expecting. If you're not doing any of that, then it's "overkill", imposing a cost for not much reason.

I suspect if you try to expand this work to "full" tool use, the picture will be less rosy. You will either have to deal with "translating" the much more complex natural language into a precise set of parameters (undoubtedly a lossy endeavour that will hurt the accuracy to some extent, unless you implement it with the LLM itself as a separate "reasoning step", in which case any accuracy gain would arguably just be due to having inserted an additional reasoning step, rather than "tool use through natural language"), or alternatively, you could basically only pick the tool with this method, then output the exact parameters verbatim -- in either case, I expect the "magical" accuracy gain will mostly vanish.

But even if it only really helps in simpler cases, the idea that the typical method is overkill and "harmful" for simpler tool use is still useful. If nothing else, a hybrid system of sorts could get you the best of both worlds (easy wins when they are possible, current system when not)
  - **[deleted]** (4↑): I think you’re right that the real advantage here probably comes from removing unnecessary structure when the task doesn’t require precision — not from some deep breakthrough in reasoning. For more complex cases, you’d likely need a parser or intermediate reasoning step anyway, which could eat into the gains.
- **luckylixi** (18↑): How do you pass parameters to the tools?
  - **tekToks** (-6↑): In this study, we looked at parameterless tool-selection only (i.e. choose the right tool) rather than parameters. Our goal was to isolate the "tool selection" mechanism, as many tools act as triggers for actions in agents.  
  
In practice, we've found that you can absolutely pass parameters in natural language while gaining similar benefits, and there are a few ways to implement that. But we've yet to rigorously assess these!
    - **PeJaybird** (7↑): Correct me if Im wrong, but in your stage2 proposal, you mentioned specifically tool execution? So, is your experiment on only tool call or tool use as a whole?
    - **jsaugust** (3↑): Can you say more about what you've found in practice? Being able to extract and pass parameters to tools is pretty fundamental to agentic approaches.
- **msbosssauce** (9↑): I wonder if you read the rebuttal for Tam's paper (https://blog.dottxt.ai/say-what-you-mean.html)
  - **tekToks** (5↑): I have! Their perspective was a reason we tested perturbed inputs. Prompt engineering allows for pretty remarkable task-specific improvements, and we didn't want any differences to be down to that alone

Of course, more work is needed to go further than "may" or "suggests". Perturbations might encode any underlying "optimization" for natural language, leaving structured outputs diminished ([a paper on similar phenomena](https://arxiv.org/abs/2310.18512)). 

Further, while we define the baseline as "structured tool calls" in the paper for convenience, NLT is still in line with the .txt team's views on structured tool calling being immensely valuable. It's simply a structure defined without programmatic syntax!
- **L43** (5↑): As a “more readable json”, does yaml work better?
  - **tekToks** (8↑): Good question! The "Let Me Speak Freely" paper I linked would suggest "better, but not as good as more natural outputs", but we've never tested YAML specifically.

Keep in mind, we're comparing NLT against each model provider's inbuilt tool call functionality, which isn't necessarily JSON. 

Providers can be a bit opaque about how exactly they implement tool calling, though Anthropic / Google / OpenAI's docs have some specifics!
    - **L43** (2↑): Thanks for the reply! I’m probably guilty of not properly reading your paper before asking questions.
- **[deleted]** (2↑): This is really interesting work — thanks for sharing it so clearly. The results make a lot of intuitive sense. Most models are trained to generate natural text, not maintain strict JSON syntax, so reducing that formatting burden would naturally help accuracy.

The experimental design looks solid too. I like that you tested across different models and controlled for prompt effects. The variance reduction is especially striking — stability is often overlooked in these kinds of comparisons.
  - **tekToks** (2↑): Thank you! Internally, we initially used this for "user safety" calls, where precise parameters weren't necessary but stability was critical. So it was front of mind for us!
- **KevinSorboFan** (2↑): Interesting, especially with the timing of the release of Anthropic's Claude Skills. Between Skills and MCP, Skills seems more natural-language driven in how it's defined (though there is still a little structure). I haven't quite digested your paper yet (nor Anthropic's Skills, tbh), but on the surface it seems like your paper may support the approach that Anthropic is shifting towards.
- **Zulfiqaar** (2↑): I've had the most success with dict-like json_output formatting (instead of json schemas), with pythonic comments, wonder if this could carry over to tool calling. It's been working for me since 2022, never thought to change it after a lot of experimentation and personal evals.


Eg "format candidate in the following:

    Output_format = {
    "Name": string,
    "Max_height": integer # 999 if mising
    "Highest_education" string # options are [college, university, post-grad]
    }
  - **tekToks** (4↑): We didn't test that specifically, but from the data, there are hints it might carry over, especially with some open source models!

For example, Llama 4 Scout would sometimes get the "right tool", but would forget to use its inbuilt function call capability, and instead output the JSON schema as a message 😅

Definitely an area we're looking at closely
- **sonhamin** (1↑): Very interesting.
I'll have to read the paper.
But I dont know if I agree with the alignment part. Tool calling is usually a separate training stage, so it should be aligned to the json format.
Do you test with the Berkeley Function-calling Benchmark by any chance? Or any benchmark that requires multi-turn tool use?
- **one-wandering-mind** (1↑): Did the tool calling approach also have a thinking section ?
  - **tekToks** (4↑): Yes, a full list of prompts and inputs are available in the Appendix! 

Warning however, as some inputs, especially those in the mental health domain, can involve pretty heavy topics (we tested both a "Safety" tool and an "end conversation" tool).
