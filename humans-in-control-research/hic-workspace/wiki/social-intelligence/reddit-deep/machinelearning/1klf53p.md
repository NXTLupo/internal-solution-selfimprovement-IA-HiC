---
id: social-intelligence/reddit-deep/machinelearning/1klf53p.md
url: "https://www.reddit.com/r/MachineLearning/comments/1klf53p/d_had_an_ai_engineer_interview_recently_and_the/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[D] Had an AI Engineer interview recently and the startup wanted to fine-tune sub-80b parameter models for their platform, why?"
author: "Sunshineallon"
date: "2025-05-13T06:32:26.000Z"
score: 167
upvote_ratio: 0.89
num_comments: 83
flair: "Discussion"
extracted_at: "2026-05-11T17:27:06.572Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1klf53p.md#c0"
    char_span: [0, 1430]
    sentence_count: 6
    key_terms: [engineering, machinelearning, models, prompt, tuning, fine-tuning, fine, interview]
    token_count: 300
  - id: "social-intelligence/reddit-deep/machinelearning/1klf53p.md#c1"
    char_span: [1445, 2905]
    sentence_count: 8
    key_terms: [clearlycylindrical, models, domain-specific, tasks, train, understand, decoder, trained]
    section: Comments
    token_count: 368
  - id: "social-intelligence/reddit-deep/machinelearning/1klf53p.md#c2"
    char_span: [2907, 5048]
    sentence_count: 18
    key_terms: [fine-tuning, model, fine, engineering, maintenance, "it's", learning, context]
    section: Comments
    token_count: 490
  - id: "social-intelligence/reddit-deep/machinelearning/1klf53p.md#c3"
    char_span: [5050, 7275]
    sentence_count: 5
    key_terms: [training, sparsevectormath, domain, distribution, model, engineering, performance, data]
    section: Comments
    token_count: 492
  - id: "social-intelligence/reddit-deep/machinelearning/1klf53p.md#c4"
    char_span: [7277, 9210]
    sentence_count: 11
    key_terms: [fine, fine-tuning, "it's", decision, tuning, "can't", coach, assessments]
    section: Comments
    token_count: 419
  - id: "social-intelligence/reddit-deep/machinelearning/1klf53p.md#c5"
    char_span: [9212, 10701]
    sentence_count: 8
    key_terms: [customer, product, prompt, model, experience, surprised, probably, deliver]
    section: Comments
    token_count: 346
  - id: "social-intelligence/reddit-deep/machinelearning/1klf53p.md#c6"
    char_span: [10703, 12647]
    sentence_count: 9
    key_terms: [finetuning, model, performance, language, scalpel, compared, specific, because]
    section: Comments
    token_count: 410
---
# [D] Had an AI Engineer interview recently and the startup wanted to fine-tune sub-80b parameter models for their platform, why?

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1klf53p/d_had_an_ai_engineer_interview_recently_and_the/)
Posted by **Sunshineallon** · **167↑** · **83 comments**

I'm a Full-Stack engineer working mostly on serving and scaling AI models.  
For the past two years I worked with start ups on AI products (AI exec coach), and we usually decided that we would go the fine tuning route only when prompt engineering and tooling would be insufficient to produce the quality that we want.

Yesterday I had an interview for a startup the builds a no-code agent platform, which insisted on fine-tuning the models that they use.

As someone who haven't done fine tuning for the last 3 years, I was wondering about what would be the use case for it and more specifically, why would it economically make sense, considering the costs of collecting and curating data for fine tuning, building the pipelines for continuous learning and the training costs, especially when there are competitors who serve a similar solution through prompt engineering and tooling which are faster to iterate and cheaper.

Did anyone here arrived at a problem where the fine-tuning route was a better solution than better prompt engineering? what was the problem and what made the decision?

## Comments

- **ClearlyCylindrical** (240↑): I work with training and finetuning lots of sub 1B parameter models. In many tasks you can meet or exceed the performance of the huge LLMs for a small fraction of the cost.
  - **alchamest3** (26↑): with models that are that size, do you train each of them for a specific task, or are you able to have a single model trained to do a few of these tasks?
    - **ClearlyCylindrical** (77↑): They are very much only specialised for a single task, and are generally not just decoder only transformers.
  - **techdaddykraken** (14↑): This.

Use the base models as a semantic layer scaffold.

You just need them to be trained on English, basic math, understand sentence structure, basic logic.

Anything domain-specific you can train, and run locally for cheap. You don’t need to rely on OpenAI/Google/Anthropic/Meta to train on your domain-specific tasks, you know them better than they do.
    - **ClearlyCylindrical** (3↑): Yeah agreed, we deal with loads of very domain-specific stuff, e.g. molecular structures
  - **SometimesObsessed** (3↑): Could you share your process for fine tuning? Like is it Lora or some other tricks?
  - **robobub** (1↑): How does it compare to LoRA/DoRA techniques on larger models, assuming you have the inference hardware (e.g. 5-15B models)?
  - **me_but_darker** (1↑): 1. I understand sharing your code will not be possibly, but can you share resources I can look up to fine tune a decoder model?

2. How different is fine-tuning this model would be compared to, say fine tuning Bert (encoder model)
  - **[deleted]** (1↑): I'm working on a micro llm stack right now. Do you consult?
  - **maverickarchitect100** (1↑): Cost wise what's cheaper tho, pinging a standard big llm or fine-tuning a small model? With the price of deepseek type of models it seems like querying an API has its benefits.
- **bigabig** (40↑): Wow it is insane to me how fine-tuning is not even anymore considered by AI practitioner. The field truly has changed
  - **Sunshineallon** (15↑): Judging by the comments here, it is definitely considered.  
It's a question of when does fine tuning and continuous learning becomes lower effort/maintenance than in context learning, and then specifically here of what kind of problem/use case that early start up came up with that fine tuning is a lower effort/maintenance than prompt engineering
    - **HGAscension** (6↑): For most people, prompt engineering will always be easier to build, adapt and maintain. That's why it's the first thing most people try.

But lower effort/maintenance aren't the only considerations. Some problems require fine-tuning. And as others have pointed out, using smaller fine tuned models can save costs.
  - **extracoffeeplease** (4↑): The field didn't change. The people doing it, and their context, have.

OP, besides prev comments maybe your company has data you don't know about that would make fine-tuning logical but they're not willing to share it with you yet. I suggest giving the usual advice about prompt engineering but implementing the fine-tuning code nonetheless.
- **asdfsflhasdfa** (59↑): It's the same as any other ML model. If you need to work on a specific domain, it's generally better to fine tune models. There is only so much room in the context window for 0 shot learning, and if the model doesn't have knowledge about a specific domain then performance will drop.

Yes its more expensive, but that's a tradeoff to make for better performance when deployed
- **sgt102** (15↑): Commercial differentiation? 

Inference time costs? Big prompts = lots of dot products

Testability and stability? Big prompts scare me (maybe it's only me) as figuring out where your performance comes from across the distribution is very hard (imho).
- **sparsevectormath** (8↑): Because the performance delta between an 80b and a 4b  when both are trained well is substantially smaller than the cost delta unless you're serving a chatbot.

With optimized kernals and clever inference solutions you can serve a small model to tens of thousands of users for less compute than the cost to serve an 80b to a couple dozen,  being pretrained on tons of out of domain data is a detriment for tasks that require high precision, not only that but you pay for training 1 time, you pay for prompt engineering every time, and in both cases you need pipelines and curation and continuous integration, the difference on that front is that for training runs you can curate first and iterate, for prompt engineering you can't easily benchmark your improvement and you can't quickly identify and correct flaws before deployment
  - **Saltysalad** (3↑): What do you mean by more training data leading to lower precision? Perhaps that training on a lot of data from a wide domain is worse than a small amount from a narrow domain?
    - **sparsevectormath** (1↑): Because if you train a model to know the price of eggs every Thursday for the last thirty years and the task is to predict the category of products in your resale aggregation front end, you will have harmed the model

To answer your direct question,  generally it's use case dependent,  whatever the distribution of behaviors you want to successfully predict should be represented in your dataset as proportionally as possible

Thanks for pointing that out, corrected the original post 🙏
- **syllogism_** (3↑): ~~This is the sort of thing I'd only say on Reddit and some people will say it's an ML boomer take, but I don't think you're qualified to be acting as an "AI exec coach" if you haven't done fine-tuning for the last three years. (I'll make a separate comment with the actual trade-offs, just so I'm not only giving you this shaking-fist-at-clouds part.)~~ Edit: This was a misreading of the OP. The product they worked on was 'AI exec coach', not the role.

It's fine to debate that the decision to use prompt engineering or fine-tuning should go one way or the other on a specific task. But it needs to be an actual decision. You can't be making that choice because the team is uncomfortable with the tooling or process of doing fine-tuning, so can't even give a confident cost estimate of it.

Even within a prompt-engineering paradigm, you still have to make lots of cost/benefit analysis decisions on your data infrastructure. Some projects might decide to YOLO everything and have zero evaluation data, but that also needs to be an active decision. You need to know what work would be required to do the evaluation framework so you can consciously decide whether it's worth it.

It's fine to question the logic of going with fine-tuning if it seems like it's some sort of unmotivated default. But from what you've said it sounds like you're coming from the opposite bias. None of us have perfectly balanced experience profiles; we all have some technologies or approaches that are more in our comfort zone. But you can't let your comfort zone drive your technology assessments, especially if those assessments are a service you're advertising.
  - **Sunshineallon** (2↑): Oh I'm not a coach, merely a fullstack developer working around AI, as I wrote in the post :)  
I was building a product that should have served as an AI exec coach

I will add more that because I am not up to date with fine tuning, I was not able to have a conversation to understand why exactly they chose fine tuning as an approach, which would have been valuable to me  
  
Personally, I want to have a large enough toolbox to solve problems, fine tuning is for me a tool in that tool box that I wonder if I should refine or spend my energy somewhere else.
    - **syllogism_** (5↑): Oh, sorry! I misread this part of your post:

\> For the past two years I worked with start ups on AI products (AI exec coach)

So the *product* was the 'AI exec coach'. I read this as part of your work. I'll edit, thanks.
- **Raz4r** (3↑): I'm surprised that you're surprised by their demand. No matter how good your prompt is, if your LLM can't handle a specific domain, it's not going to deliver the results they're looking for.
  - **Sunshineallon** (1↑): As I wrote in my OP, they \*don'\* specialize in one domain which they want to dominate. They try to build an agent marketplace platform, Let's say Coca Cola uses them to build an customer support agent. From my experience - a good prompt template coupled with RAG and tools as needed would get 95% satisfaction, the other 5% are escelated to customer support.  
Since prompt and rags are needed anyway, you would mostly be able to solve a problem like this without needing to spend the limited  time of 3 engineers working on an mvp/early product on building and maintaining training pipelines.
- **jorgemf** (5↑): Probably the investors want the company to have some intelectual property. (What they don't know is that fine-tuning a model correctly is expensive and probably not worth for an early startup)
- **DigThatData** (2↑): A big motivator is getting inference cost/time down. If you can train/finetune a task-specific model that is orders of magnitude faster than a general purpose model, you make your product cheaper to operate and deliver a better customer experience, likely also increasing the quality of your model's behavior in the process.

Prompt-engineering is a swiss army knife. You can perform surgery with a swiss army knife, but you'd probably rather have a scalpel.
  - **Sunshineallon** (1↑): Well, if you are operating in a surgical place, then you would rather have a scalpel  
If you are building a deck though, a multitool is more useful, and a scalpel might break when you try to tighten a screw :)
- **SatisfactionGood1307** (2↑): I got mixed feelings about this overall. Not that categorically you've better outcomes on every tradeoff never finetuning or always finetuning - but the point of finetuning is supposed to be get the model to perform in domains where performance is lacking because you can guarantee it hasn't seen your domain specific inputs yet.

I read recently FlipKart developed a DSL to intermediate interactions from natural language and SQL queries - and finetuning a small model might really help with making sure the natural language -> DSL part turned out nicely because the model hasn't seen the made up language patterns yet. It's certainly tenable to train a smaller parameter model "at home" compared to a giant one for these specific purposes - so yeah it might make sense to do that in that case.

The points about performance and cost don't hit for me. We route queries to FMs at scale in my workplace and have very low monthly bills - couple $ for huge usage - it's not enough to motivate finetuning work so it seems like premature optimization.   
  
As far as performance - if I am getting good enough eval metrics for application use from ChatGPT with a good prompt, cost is order magnitude less than a couple hundred bucks a month at large scale - is finetuning and switching to a narrower model the first idea for that extra performance? No not really compared to less effort options; or things that point to bigger underlying data quality issues and not properties of the model and its statistical lens from what it saw in training.
