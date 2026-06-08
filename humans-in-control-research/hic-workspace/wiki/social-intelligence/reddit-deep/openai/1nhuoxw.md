---
id: social-intelligence/reddit-deep/openai/1nhuoxw.md
url: "https://www.reddit.com/r/OpenAI/comments/1nhuoxw/sam_altman_just_announced_gpt5_codex_better_at/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "Sam Altman Just Announced GPT-5 Codex better at Agentic Coding"
author: "AskGpts"
date: "2025-09-15T18:57:48.000Z"
score: 809
upvote_ratio: 0.93
num_comments: 166
flair: "News"
extracted_at: "2026-05-11T17:27:05.359Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c0"
    char_span: [0, 1069]
    sentence_count: 1
    key_terms: [openai, coding, codex, gpt-5, tasks, com, introducing-upgrades-to-codex, announced]
    token_count: 264
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c1"
    char_span: [1084, 2111]
    sentence_count: 3
    key_terms: [codex, model, gpt-5-codex, openai, high, reasoning, stream, auto]
    section: Comments
    token_count: 337
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c2"
    char_span: [2113, 4050]
    sentence_count: 11
    key_terms: [code, extension, cli, claude, using, "i'm", available, reasoning]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c3"
    char_span: [3795, 5034]
    sentence_count: 7
    key_terms: [claude, code, codex, anthropic, validated, admitted, checking, quality]
    section: Comments
    token_count: 309
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c4"
    char_span: [5038, 7017]
    sentence_count: 19
    key_terms: [junior, devs, telling, claude, requirements, changes, collect, mostly]
    section: Comments
    token_count: 448
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c5"
    char_span: [7019, 8883]
    sentence_count: 10
    key_terms: [architects, devs, junior, going, shift, skill, developers, another]
    section: Comments
    token_count: 434
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c6"
    char_span: [8885, 9592]
    sentence_count: 3
    key_terms: [deleted, etc, take, term, try, educational, novakaldwin, regrettably]
    section: Comments
    token_count: 182
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c7"
    char_span: [9594, 11632]
    sentence_count: 12
    key_terms: [junior, level, coding, senior, skills, requirements, money, code]
    section: Comments
    token_count: 468
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c8"
    char_span: [11634, 12109]
    sentence_count: 3
    key_terms: [ability, code, simultaneously, maintainable, productivity, architect, decisions, different]
    section: Comments
    token_count: 84
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c9"
    char_span: [12111, 13859]
    sentence_count: 5
    key_terms: [screenshot, askgpts, quality, like, web, cooking, junior, reddit]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/openai/1nhuoxw.md#c10"
    char_span: [13637, 14794]
    sentence_count: 5
    key_terms: [dangerously-bypass-approvals-and-sandbox, quality, screen, codex, issue, etc, get, gets]
    section: Comments
    token_count: 328
---
# Sam Altman Just Announced GPT-5 Codex better at Agentic Coding

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1nhuoxw/sam_altman_just_announced_gpt5_codex_better_at/)
Posted by **AskGpts** · **809↑** · **166 comments**

OpenAI has officially announced **GPT-5 Codex**, a specialized version of GPT-5 designed for **agentic coding**.

# 🔑 Key Highlights

* Optimized for real-world engineering tasks: building projects end-to-end, adding tests, debugging, refactoring, and code reviews.
* Capable of dynamically adjusting its “thinking time” based on task complexity — from quick outputs to running independently for **hours** on long coding tasks.
* Tested on complex workflows like multi-hour refactors and large codebase integration, showing strong autonomous capabilities.
* Available as the default engine for cloud coding tasks, reviews, and locally through the **Codex CLI / IDE extension**.

# 📌 Official Blog

🔗 [Introducing Upgrades to Codex — OpenAI](https://openai.com/index/introducing-upgrades-to-codex/?utm_source=chatgpt.com)

## Comments

- **AskGpts** (76↑): To try it right away, make sure to first update codex cli to v0.36.0:  
  
\`npm install -g u/openai/codex@latest\`  
  
and then run codex with:  
  
\`codex -m gpt-5-codex -c model\_reasoning\_effort="high"\`

https://preview.redd.it/5u9mb9rzndpf1.jpeg?width=1360&format=pjpg&auto=webp&s=48feb2f9bd3a55a603ddb469449e7e8862f0b30d
  - **BernKing2** (23↑): You can just use the one in the official blog post: npm i -g u/openai/codex and then you are prompted to select the new model or not. Inside you can also between low medium and high using the usual /model commands.  
Also there is a cool rotation animation now, cool
  - **[deleted]** (4↑): I'm getting this in the CLI after updating to 0.36:  
  
stream error: stream disconnected before completion: The model \`gpt-5-codex\` does not exist or you do not have access to it.; retrying 1/5 in 214ms…

And from the status command:  
🧠 **Model**  
  • Name: gpt-5-codex  
  • Provider: OpenAI  
  • Reasoning Effort: High  
  • Reasoning Summaries: Auto

Maybe not available via the API at the moment?
    - **Thisisvexx** (5↑): It is only on subscriptions right now per the official announcement
  - **granoladeer** (3↑): Is this free or only available to Plus and Pro?
  - **Sad-Lie-8654** (2↑): I actually like this one with unspecified reasoning levels. It nails the short tasks SO QUICKLY and still extends reasoning where appropriate.
- **FaatmanSlim** (23↑): Curious if anyone has tried their VS code or other IDE extension and how it compares to the CLI solution?
  - **Mr_Hyper_Focus** (2↑): I’ve found results that come from the CLI to be much better and always route my “heavy” requests to the CLI interface
  - **xIGBClutchIx** (2↑): I switched finally off of Cursor fully now. Using vscode tab mode which is ehhh but no performance issues from Cursor now. Then on the side using the Codex IDE extension. I like it, but for sure could use some work. Honestly, the best thing is the amount of usage for the price and the code quality is pretty good.
  - **smodarnun** (1↑): The cli and the extension are the same, you can check it in your .vscode folder
- **Iamhummus** (23↑): How is it vs claude code?
  - **[deleted]** (10↑): This is what I want to know.  I literally 2 days ago pulled the plug on ChatGPT and signed up for a month of Claude.
  - **Cautious_Cry3928** (3↑): I'm not sure about the update, but I had Codex churn out a program with 2500 lines of code the other day with no need for debugging. For context, i'm using it to triage files in a digital forensics project, and I'm impressed with the results already. I can't imagine how much better it will be with the present update.
  - **Relevant-Ordinary169** (4↑): Or GitHub Copilot?
  - **dhamaniasad** (8↑): IMO Claude code has really gone downhill and this is validated by the exodus they’ve been seeing. They’ve admitted to drop in quality themself (Anthropic). I personally moved almost completely to GPT-5 with codex.
    - **oppai_suika** (14↑): I went from claude to codex but I'm having anxiety about the fact that I never hit rate limits anymore. I've been checking my api bill and double checking that I'm on my plus plan and not api so I really hope codex is just that good and that I don't end up with a nasty surprise at the end of the month
  - **The_Only_RZA_** (3↑): It’s better than Claude code. I just use Claude code to chat now or built ui components
  - **nooruponnoor** (1↑): This is the ultimate million dollar question that needs to be validated
  - **Wisepunter** (1↑): I was one of many who left Claude Code, whilst being gas lit by the fan boys that I obv can't prompt or code... I was complaining months before Anthropic first changed their rates and admitted they were overloaded and now admit there was also quality bugs.. From day one with Codex its reminded me of how I USED to feel about Claude (Apparently once I could code and prompt and then forgot it all ;-) )  
  
In fact my productivity with the now "original" Codex went through the roof after months of fighting Claude and him getting it wrong or telling me he had completed things he hadn't etc.. There are things that annoy me about Codex, like making changes first then telling you what it's done after you have checked it in? Who designed that? But being as it mostly get its all right.... I just check the GIT history to see changes and we all good!

If this model improves on the quality I'm now used to, this could be the final nail in the Claude coffin, with just a handful of hardcore fan boys left that joined after it changed... Still telling us all that we obv don't know what we are doing.
  - **anch7** (1↑): I still use claude code mostly
- **[deleted]** (73↑): Early thoughts:

This really does one shot junior devs. I have a list of tasks I’ve given to junior devs. Typically I’d take an hour meeting to explain the background, the approach I had in mind, etc. Then they’d work away at it for a couple weeks, touching base a few times in there to course correct. 

The model nails the tasks in my informal benchmark with maybe 15min total handholding and verification time compared to ~4 hours with a junior dev. Sometimes the junior devs also totally collapses and it spirals into a multi-month saga. Also in that two week sprint best case scenario, the junior dev cost $6k, vs. A $20/mo subscription. 

I don’t really know what more to say, besides that the field is going to be unrecognizable in 2 years. 

There are still things the models can’t do, like collect requirements, do long term project scoping and planning, and IMO they still struggle with some architectural decisions and tool selection. Unfortunately, these are also things junior devs can’t do. What a time to be alive. Pray for CS students and recent grads.
  - **reeblebeeble** (52↑): No junior devs today means no one who can collect requirements, scope, plan, and check the model's output tomorrow. 

It is seriously short sighted not to invest in the human future of a field of knowledge. But people are going to do it until humans can't do anything.
    - **spinozasrobot** (22↑): Whenever I hear architects invoke hopium and say "AI might replace junior devs, but never architects", I always ask, "And where do architects come from?"
    - **[deleted]** (10↑): Agree, and I worry about this too
    - **yubario** (10↑): \> tomorrow

Lol, there will be plenty of senior developers for the next 30-40 years.

I doubt the profession itself will last another 30-40 years at the current rate of advancement it is getting on a monthly basis.

There really is no concern about who maintains it all when the seniors retire, AI will of course.

And so will other humans in the future, just like what happened to all the COBOL programs.
    - **United_Mango5072** (1↑): That’s the job of a BA
    - **Leather-Cod2129** (1↑): Developers don’t collect requirements 
That’s not their job
    - **IAmRobinGoodfellow** (1↑): The problem is that junior devs are often a risky investment for early employers. It’s not a good thing - it creates a perverse incentive that has to be corrected for. The conflict is that junior devs are more of an unknown quantity because they have less of a track record, and their skill-building is often going to go benefit another company. We also can’t say at this point what skill sets are going to be needed. There was always tech churn with devs expected to keep up their skill set or stick with established projects, but the ai shift is looking to end up like the object shift or the shift to online/networked app development rather than midrange computing. My career extended over some of these major transitions, and I’m not sure if managers can do planning on a 3-5 year horizon in terms of mid-tier range skill sets that will be needed. 

As you point out, this is bad for the industry and ultimately for the companies who try to exploit the system by using something like AI in place of the juniors, but the near term incentives are stacked against those who would take a longer term, educational view.
  - **sjsosowne** (3↑): You're paying junior devs $12k/mo?
    - **[deleted]** (10↑): Regrettably, yes. More if you include insurance etc.
  - **NovaKaldwin** (2↑): Maybe try working with Erlang or weird languages tho
  - **[deleted]** (2↑): \>  Typically I’d take an hour meeting to explain the background, the approach I had in mind, etc. Then they’d work away at it for a couple weeks, touching base a few times in there to course correct.

do you think with this part gone , this will be downward slope for your thinking & planning skills leading to doom-code senior tasks till we get good enough results ?
  - **Velvet_thunder9** (2↑): It’s 20/month subscription for now, given how much money OpenAI loses, I wonder how expensive it’ll get. E.g. (tiered pricing) * amount of users at an org? Agreed it’s gonna be a shit show at the entry level though
    - **Tolopono** (1↑): They actually make money from the api but lose money cause of all the gpus and research they need to do https://futuresearch.ai/openai-api-profit
  - **bobbyrickys** (2↑): Everyone concerned about junior CS students -   
everything moves up to higher level over time. There was a time when assembly code was the way. And prior to that probably folks proficient enough to just read hex from punch cards. For sure there were plenty saying "what are we going to do if new grads don't know assembly?" - well, high level language compiler does that instead. The task for each generations just moves higher up. And if that means providing high level requirements instead of coding, once translating req-s to code is reliable and consistent, so be it. And don't worry about the young folks, they'll end up ahead in any case, by growing up with AI.
  - **eatinggrapes2018** (1↑): Would you say that the junior devs become senior devs with this and other coding agents? Why would a junior dev stay a junior dev?  I feel this has more impact on the senior level then it does a junior level.
    - **[deleted]** (3↑): I think the problem is the skills needed to do the things the models can’t currently do are built over many years as a junior dev, and I worry how people will gain that experience if they don’t become useful until year 5 or 6
    - **Razor_Storm** (1↑): Because the things that AI coding is really good at are not really the skills that distinguish between junior and senior engineers.

AI coding agents are really good at reading requirements quickly and generating tons of code very quickly. 

However junior engineers are very rarely promoted because they can write code quickly. Being a senior is not so much about raw productivity but rather ability to reason about code, ability to architect clean and maintainable code, ability to teach younger folks, ability to work on numerous different projects simultaneously while keeping enough context to make strategic decisions about all of them, etc. These are not skills that the ai coding agents today have focused on.

A junior plus AI does not equal a senior, it equals 10 juniors. (The "10" is just a made up number)
  - **Full-Juggernaut2303** (1↑): I really really would like to see the tasks where it would take a junior dev months and u got it done in 15 min
  - **Nevetsny** (1↑): Not sure if you are using web version but it was completely useless for me. Beyond slow, asked it to remove markdown from a file..created 200+ build errors.  Complete was of time.  Was just seeing what it might be capable of and maybe they will patch but first experience was total waste.
    - **[deleted]** (1↑): Im using the vscode extension
  - **radosc** (1↑): When do you think models are going to replace your skillset?
- **ninseicowboy** (32↑): the TeAm HaS bEeN aBsOlUtElY cOoKiNg
  - **apathydelta** (6↑): Yeah I really don't like that "cooking" has somehow trickled into mainstream.
- **icecoffee888** (35↑): how do u even manage to take such a low quality screenshot in 2025, im not joking I wouldn't even know how to if I tried
  - **AskGpts** (23↑): It's clean and clear from my side, try clicking on it you'll see. idk may be a reddit issue man!
  - **Betaglutamate2** (13↑): His screen is obviously dirty and he needs to wipe it.
    - **AskGpts** (4↑): lol
  - **Mr_Hyper_Focus** (6↑): Reddit does this. Not the users fault.
  - **Outside-Iron-8242** (4↑): weirdly, the screenshot on mobile looks much better than viewing it on the web.
  - **KrispyKreamMe** (3↑): lol now that you mention it, you're right. its like they screenshotted from an old ipod touch or ran it through a web compressor
  - **_lagniappe_** (6↑): What kind of shit screen quality do you have that this screenshot is an issue?
    - **AskGpts** (6↑): It's of high quality, idk what happened to reddit.
  - **TentacleHockey** (1↑): I do this all the time when on a ultra wide monitor. Looks fine on ultra-wide, upload to social media, and boom pixel palace.
  - **Trick_Text_6658** (-3↑): You have to cut the HDMI cable from your screen to PC so its a bit shorter. Then quality gets better!
- **Beukgevaar** (3↑): I hope they fixed the issue where it asks me every silly change or read, even after I changed approval.... i don't get how people manage to 'get it to code all night'?
  - **bobbyrickys** (2↑): codex --dangerously-bypass-approvals-and-sandbox  
Also make sure you update the version
- **redditer129** (2↑): It sure isn’t working in vscode for me. It tries to run bash or powershell commands and gets “program not found” errors. Meanwhile Claude is running smooth.
- **Sisuuu** (2↑): Is it possible to run codex with local llm? (Llama.cpp, vllm etc etc.)
- **Calumface** (2↑): What does this mean in layman terms?
