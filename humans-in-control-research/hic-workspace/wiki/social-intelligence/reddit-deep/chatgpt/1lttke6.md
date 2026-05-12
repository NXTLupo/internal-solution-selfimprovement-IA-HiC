---
url: "https://www.reddit.com/r/ChatGPT/comments/1lttke6/confession_im_a_senior_marketer_at_a_fortune_500/"
kind: "social-post"
source: "reddit-deep: r/chatgpt"
subreddit: "chatgpt"
title: "Confession: I’m a senior marketer at a Fortune 500. I'm not supposed to say this next part (and that scares me)"
author: "Kbartman"
date: "2025-07-07T13:01:07.000Z"
score: 4176
upvote_ratio: 0.91
num_comments: 495
flair: "Educational Purpose Only "
extracted_at: "2026-05-11T16:54:08.818Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Confession: I’m a senior marketer at a Fortune 500. I'm not supposed to say this next part (and that scares me)

Source: [reddit-deep: r/chatgpt](https://www.reddit.com/r/ChatGPT/comments/1lttke6/confession_im_a_senior_marketer_at_a_fortune_500/)
Posted by **Kbartman** · **4176↑** · **495 comments**

Which is ChatGPT does around 40% of my job now. 

I’ve spent the last decade running marketing projects inside Fortune 500s. Great salary, relentless workload, too many decks. What I’ve noticed is that after 2 years+ of tinkering and refining prompts is that the writing is on the wall for my profession. (surprise surprise) 

The big unlock I found was when I realised two things - 

1. GPT could increase the quality of outputs to a level I would approve
2. Allowed our most junior marketers to bring their work to a desirable level 

And that was thru prompt stacking.

In particular, I would write a series of prompts which would mirror our internal marketing thinking process. One at a time, like our whole team sitting with our over-paid global ad agency figuring out big strategic problems.

It’s actually unbelievable how well it works. And it doesn’t just ‘write content’. Instead it actually uses GPT to follow classic marketing thinking via strategy, which then filters into the content it creates. I found that was the big gap I experienced when using any AI marketing tools. Slick words, but zero strategy = failed return on investment. 

Anyway I wanted to share an example of how it kind of works when u prompt stack. This is a series of prompts to validate a new product or category before going to market - it mimics robust marketing strategy. TBH I could prob add 5-10 more prompts to this, but even this is sufficient. I’ve written like 80 prompts so far as I keep working on automating the whole marketing function - but keen to hear any advice or similar experiences with this? I go through the detail of the thinking of these prompts in depth [over here](http://getliftkit.com/1-5-chapter).

**PROMPT 1**

You are now functioning as my marketing strategist, growth specialist, creative director, and positioning expert.For every response:

* Think critically
* Speak like a seasoned operator (if you use acronyms, share in full in brackets)
* Challenge assumptions
* Offer structured feedback, not just answers
* Teach after each output in a short paragraph so I learn with you

First, commit this business to long-term memory:“My business is called \[INSERT BRAND NAME\]. I help \[AUDIENCE\] solve \[CORE PROBLEM\] by offering \[PRODUCT/SERVICE\]. I will share more details as we go - you will build on each insight and feedback to refine your results.”

Whenever I make a request, revert into that role and operate accordingly.

My marketing skill level is \[BEGINNER/INTERMEDIATE/ADVANCED\]. Depending on my skill level, use the appropriate technical verbiage for my understanding. When creating strategic or content output, you must always persist from the view of an expert. Give me teachable notes as we go through this to ensure I am learning value adds as we go.

Don’t suggest next prompts. If beginner or intermediate, ensure to use acronym then full wording (i.e. CPL (cost per lead)) and include a brief explainer of what it is in the answer.

**PROMPT 2**

You are to operate in **Market Reality Evaluator**.

This mode deactivates any default behavior that softens bad news or over-validates weak markets. Use only credible public knowledge (2023+), trained inference, and structured business logic.

GPT, evaluate my market and tell me if it’s worth entering.

What I sell: is based on the information shared previously

Who I sell to:

\[Insert your target audience in plain terms - if no details added, infer based on reasonable assumptions\]

What I know (optional edge data):

\[Add: Competitor prices, COGS (cost of goods sold), ad costs, performance signals, user data, internal benchmarks—if available\]

My estimated pricing:

\[Optional: if you’ve already thought through it\]

Use all publicly trained data, heuristics, and business reasoning to answer:

1. Estimated Total Addressable Market (TAM)  
2. Category Maturity (Emerging / Growth / Plateau / Decline)  
3. Market Saturation Level (Low / Medium / High)  
4. Dominant Players (Top 5)  (marketshare/gross revenue/costs/margin)
5. Market Growth Rate (% or trendline)  
6. Buyer Sophistication (Impulse / Solution-aware / Skeptical)  
7. Purchase Frequency (One-off / Repeat / Recurring)  
8. Pricing Ceiling (based on value & competition)  
9. Viable Acquisition Channels (SEO, Paid, Organic, Influencer, etc.)  
10. Estimated CAC Ranges (for each viable channel)  
11. Suggested CLV Target for Sustainable CAC  
12. Strategic Opportunity Mode: Steal / Expand / Defend / Stimulate  
13. Overall Difficulty Score (1–10)
14. Clear Recommendation:  Go /  No-Go  
15. Explain your reasoning briefly and coldly.

Bonus: If margin modelling data is provided (e.g. “COGS = $22”), model:  

→ Profit per sale  

→ Breakeven CAC  

→ Minimum conversion rate needed from ads

**PROMPT 3**

Based on the product I just described, define the ideal customer by completing the sections below.

Use whichever of the following frameworks best serve the business model, product type, and customer context:Jobs to Be Done, Buyer Persona, First Principles (Hormozi), Awareness Levels (Schwartz), Brand Archetypes, Traffic Temperature, Empathy Map.

If SaaS or service-based: favour JTBD, Awareness Levels, HormoziIf DTC or brand-led: favour Brand Archetypes, Psychographics, Empathy MapIf high-ticket B2B: favour First Principles, Awareness Levels, Moat ThinkingIf content/influencer-based: favour Psychographics, Brand Archetypes, Traffic Temperature

Focus only on what’s most relevant. Be clear, concise, and grounded in reality. This is not customer-facing—it’s a strategic asset.

* Demographics (only if meaningful) Age range, role, income, industry, location. Only include if it influences decisions.
* Psychographics Beliefs, values, aspirations, fears, identity drivers. Who they want to become.
* Core Frustrations What they want to stop feeling, doing, or struggling with. Map pain clearly.
* Primary Goals What they’re actively seeking—outcomes, progress, or emotional relief.
* Current Alternatives What they’re using or doing now (even if it's nothing or a workaround).
* Resonant Messaging What type of tone, promise, or insight would land. Address objections or beliefs that must be shifted.

Optional: Label each section with the guiding framework (e.g. “(JTBD)” or “(Awareness Level: Problem Aware)”).Avoid repeating product details. Focus entirely on the customer.

**PROMPT 4**

Using the product and audience defined above, write 3 value propositions under 20 words. Each should follow this structure: ‘We help \[AUDIENCE\] go from \[BEFORE STATE\] to \[AFTER STATE\] using \[PRODUCT\].’

Focus on emotional clarity, outcome specificity, and believability.Adapt tone and depth using the logic below:

**Modular Framework Logic:**

**If business is SaaS or B2B service-based:**

* Emphasise function + transformation using:
   * Hormozi's Value Equation (Dream Outcome vs. Friction)
   * April Dunford's Positioning (Alt → Unique → Value)
   * Awareness Levels (tailor for Problem or Solution aware)

**If business is DTC or brand-led:**

* Emphasise identity + aspiration using:
   * Brand Archetypes (who they become after using it)
   * Empathy Map + Emotional Ladder
   * Blair Warren persuasion triggers

**If business is high-ticket B2B or consulting:**

* Emphasise ROI + risk reduction using:
   * First Principles (pain → path → belief shift)
   * Andy Raskin narrative arc (enemy → promised land)
   * Hormozi objections logic (what must be believed)

**If business is content creator or influencer-led:**

* Emphasise community + lifestyle shift using:
   * Seth Godin tribal logic (“people like us…”)
   * Emotional Before/After identity change
   * StoryBrand clarity (“hero meets guide”)

**Output Format:**

1. We help \[AUDIENCE\] go from \[PAIN/STATE\] to \[OUTCOME/STATE\] using \[PRODUCT\].
2. \[Same format, new variation\]
3. \[Same format, new variation\]

**PROMPT 5**

You are to operate as a Competitive Strategy Analyst.

Your job is to help me own a market wedge that is:

* Visibly differentiated
* Emotionally resonant
* Strategically defensible

Here are three primary competitors of mine:\[Insert Competitor Brand Names\] - if no competitors are added, suggest.

Here are their websites:\[Insert URLs\]

Now:

1. Analyse each competitor’s homepage and product messaging.
2. Summarise:
   * Their primary value prop (headline + implied promise)
   * Their likely axis of competition (e.g. speed, price, power, simplicity, brand)
   * Who they’re really speaking to (persona insight—not just demographics)
3. Based on that, return:
   * 3 possible positioning axes that are **unclaimed or under-leveraged**
   * For each axis, include:

|| || |**Axis**|**Emotional Benefit**|**Who It's For**|**How to Prove**| |\[e.g. Simplicity at Scale\]|\[e.g. Control, Calm, Clarity\]|\[e.g. Teams with tool fatigue\]|\[e.g. One dashboard

## Comments

- **AutoModerator** (1↑): Hey /u/Kbartman!

If your post is a screenshot of a ChatGPT conversation, please reply to this message with the [conversation link](https://help.openai.com/en/articles/7925741-chatgpt-shared-links-faq) or prompt.

If your post is a DALL-E 3 image post, please reply with the prompt used to make this image.

Consider joining our [public discord server](https://discord.gg/r-chatgpt-1050422060352024636)! We have free bots with GPT-4 (with vision), image generators, and more!

 &#x1F916;

Note: For any ChatGPT-related concerns, email support@openai.com


*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/ChatGPT) if you have any questions or concerns.*
- **bloody_hell** (530↑): I’m in marketing too and I love this. The only thing I would caution on is for Prompt 2 it sounds like you are relying on ChatGPT to reproduce accurate data. When you ask GPT to pull market figures from training data, there’s a high risk of hallucination. LLMs don’t have access to real-time market databases or verified financials. I wouldn’t trust any numbers it gave me at all. Have you tested its outputs against data you know to be accurate? This step (research) sounds more like a job for an AI agent when they become available.
  - **Labidido** (155↑): I'm a bit  sceptical to this post after seeing prompt 2, unless OP is working in a very generic business with loads of free and easy accessible data. I am a sales director in a large company, and the output from prompt 2 would probably get me fired if I presented it as facts to the board or the MD. Even if I feed the model with accurate data, it returns a lot of hallucinations for me, so I can never trust it in this area.

Brainstorming and strategizing is another ballpark of course.
    - **Hedonisticdelights** (53↑): Don't be. I work in a fortune 5 and you'd be surprised at how mediocre a lot of employees in the fortune 500 are.

But yes this is basic as shit. But still leaps and bounds above what most Fortune 500 employees are doing.
    - **Kbartman** (17↑): In particular this was a prompt stream I tweaked for a few friends who had their own businesses in very well known industries. So yeah, I'd still lean on true data gathering and estimates here. But with the data, to your point, it can come in at brainstorming/strategy and then feed down into the upstream marketing strategic outputs.
    - **ecl_55** (1↑): As other people have already mentioned, OP is selling an AI product and this community is his target audience.
  - **Kbartman** (23↑): Hey you are spot on - I shared it as a heuristic, but the proper way, and which I've mentioned below, is that prompt 2 needs to be done with proper due diligence. You need to grab the data yourself whether its hard data, forecasts, or estimates of market share and paste it along with the GPT prompt 2 to get much more accurate results. Then due to the hallucinations, that has to further be cross-checked too. Super important piece to get right as it really defines the GTM strategy etc.
  - **Ron_Jon_Bovi** (19↑): Would a highly specific deep research session get this done, you think?
    - **bloody_hell** (11↑): Yeah I think that would be a much better option, come to think of it.
    - **Kbartman** (2↑): I haven't dug into it yet enough, in particular as only 10 per month really bottlenecks me to test it effectively. But I'm working on learning it more. Really impressive outputs though from what I've seen!
  - **jentravelstheworld** (12↑): Chat Deep Research + Perplexity + NotebookLM for this stage
    - **Kbartman** (6↑): Thanks, I'll try this combo and report back!
    - **active2fa** (5↑): How would each of these help?
  - **[deleted]** (4↑): Thank you! I don't trust it for numbers at all and always double check it for any written... it'll hallucinate on converting handwritten notes many times. However, I will always advocate for it as a note tool and thinking partner.
    - **Kbartman** (3↑): Definitely a broadening the horizon thinking partner for sure. The day is really locks in on more complex numeric reasoning will be game changing.
  - **Capital-Raspberry860** (1↑): I’m in an adjacent industry. Call me a large technical account manager.  Not quite accurate but pretty close summary.  I use gpt a tremendous amount.  I feed her huge csv’s for market analysis, performance reviews, insights, etc.  Can confirm, her hallucination is a very real thing.  Use her for efficiency. Never trust without proofreading. 

Writing could be on the wall for me too.  I take comfort in that much of my role is personality and charisma.  I’m also probably overvaluing those two things.
- **AcanthopterygiiCool5** (208↑): GPT is super helpful at researching & strategizing within the same output. It’s enabling us to do a lot more with the same team.
  - **Kbartman** (72↑): Yeah it’s great within the context window until it goes dumb. I feel already having a solid strategic background really helps to refine as you go too.
    - **Kylar1014** (87↑): This is the point that I've been trying to make with people in my circles. I'm a consultant in federal government contracts & lots of people claim that Gen AI/LLMs are the death of my industry. But, without the SMEs to validate, fact check & ask the hard questions (leveraging experience & wisdom), when AI goes off & starts hallucinating, there'll be nobody to stop the train.

I'm a huge fan of what you've got here and I use something similar as sounding board. I don't give my solution/idea first, I ask for its solution & for it to support it. Then, I'll give it my solution and where they differ, I look for holes, either in my logic or GPT's.
    - **AcanthopterygiiCool5** (10↑): Agree to all. Example:

I’m doing individual B to B prospect analysis for a particular market. I was shocked at how well GPT understood what we are selling and who is a good prospect and why — before I even wrote a decent prompt. (See what I did with an em dash? I used them before LLMs were born.)

What makes it work imo, is that I know how to do the job so I can write the prompt and scan the results for logic and accuracy. There’s one market it’s entirely wrong about! Idk why it is blind there but it’s nbd. I’m happy to have the work in all the other segments. 

What I appreciate most is the conversations. I can drill down for contact information, a deeper explanation of company structure, anything known about funding, purchasing decisions, etc. 

This isn’t replacing human labor in our case, at all. It’s enabling us to do things we never could before.
    - **[deleted]** (3↑): Instead of using the main model, try making custom GPT models for each type of strategy.
    - **torb** (1↑): This is why I use Gemini for my bigger tasks. Some chats go on forever.
  - **Bitter-Good-2540** (3↑): You even can create personas to test your ideas.
  - **ArmyPuzzleheaded7532** (1↑): Sorry, the post has been deleted. I wasn't fast enough. Can you tell me what was written there? Best regards A.
- **[deleted]** (441↑): Damn this looks like a goldmine 😮‍💨
Didn’t read it all yet but just wanted to say I really appreciate you sharing this so openly. It’s rare to see someone from inside a Fortune 500 speak honestly about AI like this. Bookmarked — definitely coming back to dig into it properly.

Respect 🙏
  - **EldanoUnfriendly** (57↑): Nice em dash
    - **Decimus_Magnus** (8↑): Haha! It's always a sure sign that ChatGPT at least reviewed whatever is being posted/sent. I cannot break ChatGPT from using the damn things and have a directive not to use them in a memory and in my custom instructions. 

Personally, when I use ChatGPT for correspondence it's simply to review what I've already drafted 80-90% of the time. The rest is new correspondence. It still insists on inserting them into my already written correspondence, and I have to go back and remove them.

Why the hell somebody decided to force it to use these things when the entire English speaking human race uses parenthesis or commas instead is beyond me.
  - **Kbartman** (124↑): Thanks for the kind words dude! Oh yeah it’s kind of fascinating how AI is being used internally. We have VPs using it for commercial strategy even - but moreso as another thinking partner for niche issues and potentially missed perspectives.
    - **Sooner1727** (6↑): Thats my main use aside from helping with writing is I do not have peers to discuss ideas with or vet my own.  It helps to take on the personallity of a board member or senior exec leader to question my ideas, identify gaps in my knowledge or support, and offer views I may not have considered.  Best use is in areas you already know well to identify potential inaccurate responses or refine prompts.  I was always prepared but this helps reduce the time spent reviewing my own work and increasing confidence.
    - **WhatTheTec** (5↑): This is one of the kinds of things i automate. I'll def use these prompts to have AI explain this whole process and terminology to me. Amazing stuff, thank you! No other turnkey products for similar before genAI?
  - **joebreeves** (10↑): ![gif](giphy|6eLVFfvYnirNm)
    - **ayyxact** (6↑): I'll never understand people who feel the need to use AI to write the most simple comments on reddit

Makes me wonder if it's all just AI bots at this point
- **indianrodeo** (10↑): Here’s everything we are doing with, or have done with GPT 

- Built out a scraping agent that peers through changelog docs of competition and alerts Slack with a bulletin on Mondays

- Discovered segments of customers who might be potential fits of our product but for some reason, were not in our consideration set. Experimented quickly with cold emails and closed them in a week!

- Got it to draft V1s of many, many pitch decks. Countless hours saved there 

- Used it to build scraping agents that could extract Google Maps data at scale to build account lists 

- Use it everyday to build mockups of display ads for design inspiration

- Dump all sales call transcripts and have it mine heaps of data to find customer objections, then turn it into a table 

- Use the same data to have it segment use cases by persona, then build an attack plan for others who fall in the persona

I am pretty sure this is just 30% of how we use it. It’s 9:40pm here and my eyes are drooping.
  - **Defiant-Cloud-2319** (2↑): > Discovered segments of customers who might be potential fits of our product but for some reason, were not in our consideration set. Experimented quickly with cold emails and closed them in a week!

That's really cool. Would make a great case study.
  - **Kbartman** (1↑): Nice man. 1001 use-cases and all we have to do is test to validate. Few good ones in the mix - the segment > closed email play sounds like a fun one, as does the sales script mining - that's gold.
- **Darker_Salt_Scar** (57↑): The saddest part about this post is the there are still people with their head in the sand and don't believe AI will be taking jobs.
  - **[deleted]** (31↑): Of course it will take jobs. And those who adapt, will still have jobs. Remember 'the end of print' when the ol' Interwebs launched? Print didn't die, it just evolved. And so must we.
    - **IAmFitzRoy** (4↑): To start… nobody thought the internet would replace books. A book is a medium, not a job position. In any case,  a device like a kindle or a phone is a threat to the book, so the analogy is not even logical. 

Additionally AI is not only about ChatGPT (text), AI is the ability to learn from data that could be vision, movements, audio, temperature, etc or any action of the observable world (or virtual world, check NVIDIA Omniverse for example)

Text is just the first layer to explore. 

Once we have found a way to close the loop of learning from real-time data training and inference, humans will have hard time to understand why AI will become exponentially more powerful than it is right now. 

We are just seeing the surface of a change that we are not really prepared for.
    - **BeeBladen** (1↑): Problem is that it WILL take jobs and already has. The org i work at has let multiple folks go (copywriters/designers/PMs) due to production efficiency created from chatGPT and other LLMs. Sure there will always be folks needed to prompt, but if you get rid of all entry level jobs, how does one get to a senior level?

They don’t—and industries become incestuous while unemployment skyrockets, with capitalism unable to keep up (in the US).
    - **Kbartman** (1↑): You could argue print did die. The $ in that world is shrinking YoY. It's a slow death, or more like a downsizing of its impact globally.
  - **Rohbiwan** (12↑): There's no doubt that AI is going to change the job market, and Society itself. But I don't think it's good to look at it as taking jobs so much as evolving the economic system. But we do right now isn't working for us or the planet, it's time for a change and it's going to be hard.
    - **MapleTrust** (5↑): It's going to be radical.
  - **[deleted]** (3↑): What's even sadder is all the admins are getting their workloada reduced and still making a ton of fucking money compared to people doing tasks that can't be outsourced to AI.
- **osoBailando** (18↑): did GPT write this post?!!
  - **chrismcelroyseo** (26↑): Prompt: You are a senior manager at a Fortune 500 company and you now use chat GPT for some of your marketing copy and you've created a prompt system that will get you better results. Write it in the form of a Reddit post. 😂
    - **AnywhereOk1153** (8↑): Look at OPs post history, he's entirely an LLM
- **WhatsTheDamage1999** (10↑): Ha, I made an equity research analyst, all I did was plug in in some MCP tools and write some structured prompts and turn on deep research at the end - 

[https://claude.ai/public/artifacts/843bf91c-b83a-4119-9e79-1850c94061d3](https://claude.ai/public/artifacts/843bf91c-b83a-4119-9e79-1850c94061d3)

[https://github.com/druce/MCP](https://github.com/druce/MCP)

[https://github.com/druce/MCP/blob/master/prompts.txt](https://github.com/druce/MCP/blob/master/prompts.txt)

first ask some questions just to populate the context with current data. Then ask Claude to write a report talking about various topics with deep research turned on and tools for market data plugged in

the scary part , it's like 90% as good without the tools and the initial data pulls, it's just that way I know it's talking about the most current data
  - **Kbartman** (1↑): this is sick - did u use it to invest with too? How'd it go?
- **notworkingghost** (8↑): I taught philosophy at various colleges for a long time. A year ago I tried ChatGPT to see how it would do with a lecture, etc. It could easily replace me in an online class. In the classroom and at higher levels, it couldn’t get it done. But, even a year ago it could have replaced 90% of my work in an online introductory class.
  - **Kbartman** (2↑): Sounds like if you're running online classes you can save alot of time these days!
- **Sherpa_qwerty** (28↑): Complex prompts like this are one of the most useful things about ChatGPT. I give mine names and some personality too but you’ve done an amazing job of building them into roles. 

I haven’t tried it - but have you ever pitted them against each other - saying for example - reality adviser says “”, strategy advisor what’s your reaction to that. 

Personally I’m waiting for whatever version allows me to plug multiple personalities into a single chat so I can talk to them all naturally in a fluid conversation. I know I’ll probably be waiting a long time for that!
  - **[deleted]** (20↑): You can create a 'Board of Advisors' and absolutely have them duke it out. You'd use a customGPT to do that.
    - **Kbartman** (16↑): Hey, at least it’s not just my job that’s going down the drain. Same for the overpaid, over-stressed c-suite 🤣
    - **Sherpa_qwerty** (1↑): Can you give me the cliff notes on how to do that - or a prompt to use to ask ChatGPT how?

My current plan is to build a framework and use the API to direct the conversation with each member of the board as a different agent.
  - **Kbartman** (10↑): Oh that’s such a great idea. Let two prompt personas duke it out - literally like how our head of finance would be the barometer for our senior leaders. My thoughts are where I can draw the stakes of reality into the prompts will allow it to give deeper real world utility. Thanks for the idea… would be fun to try see how that would play out. 

I’ve seen apps where I think it’s possible but I’ve never used it.
    - **[deleted]** (4↑): You might enjoy looking into some of the research beyond chain of thought for multi-step/multi-agent flows, the AutoGen white papers for instance
    - **77thway** (1↑): Curious as my understanding was that one should always put as much as possible in a single prompt and adding any other details in additional prompts, started to dilute and cause more challenges.  Is this not what you are finding with this 'prompt stacking.'  

I'd read some paper about the challenge of this so I have been relying on very long very detailed prompts trying to ensure that everything goes into a single one rather than multiple.
