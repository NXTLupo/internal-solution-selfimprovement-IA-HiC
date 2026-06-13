---
id: social-intelligence/reddit-deep/openai/1mku5ee.md
url: "https://www.reddit.com/r/OpenAI/comments/1mku5ee/this_says_it_all_to_me_o3_vs_gpt5/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "This says it all to me - o3 vs GPT5"
author: "juntmac"
date: "2025-08-08T12:42:15.000Z"
score: 862
upvote_ratio: 0.97
num_comments: 130
flair: "Discussion"
extracted_at: "2026-05-11T16:53:06.862Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c0"
    char_span: [0, 238]
    sentence_count: 1
    key_terms: [comments, openai, reddit-deep, juntmac, posted, reddit, source, https]
    token_count: 81
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c1"
    char_span: [252, 2049]
    sentence_count: 9
    key_terms: [thinking, c1b4474f1ca771e40a64a1d8954e1d3745066dd2, correct, graph, bar, conditions, ectocarpus, stacking]
    section: Comments
    token_count: 498
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c2"
    char_span: [2051, 3945]
    sentence_count: 13
    key_terms: [claude, because, did, chatgpt, like, try, mistake, errors]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c3"
    char_span: [3719, 5230]
    sentence_count: 10
    key_terms: [customers, "it's", errors, embarrassing, presentation, like, chatgpt, mistake]
    section: Comments
    token_count: 420
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c4"
    char_span: [5232, 6812]
    sentence_count: 14
    key_terms: [thinking, ed0c323e026cbd310e337b8971dd62cfe7b247d8, image, got, choices, closest, replied, gemini]
    section: Comments
    token_count: 423
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c5"
    char_span: [6814, 8744]
    sentence_count: 13
    key_terms: [better, thinking, "don't", because, "doesn't", prompts, coding, demand]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c6"
    char_span: [8518, 8781]
    sentence_count: 2
    key_terms: [better, benchmarks, consensus, "doesn't", general, hatsuwr, lmarena, testing]
    section: Comments
    token_count: 70
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c7"
    char_span: [8783, 10505]
    sentence_count: 10
    key_terms: [non-thinking, gpt-5, thinking, eb7c4e94e67896e88fef579b859100e42a8cd8ea, better, height, screenshot, reasoning]
    section: Comments
    token_count: 463
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c8"
    char_span: [10507, 12193]
    sentence_count: 5
    key_terms: [gpt5, being, outperforms, correctly, catches, "doesn't", credit, openai]
    section: Comments
    token_count: 442
  - id: "social-intelligence/reddit-deep/openai/1mku5ee.md#c9"
    char_span: [12197, 12540]
    sentence_count: 3
    key_terms: [absolutely, like, pro, thinking-pro, outperforms, rare-site, thinking, youtuber]
    section: Comments
    token_count: 106
---
# This says it all to me - o3 vs GPT5

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1mku5ee/this_says_it_all_to_me_o3_vs_gpt5/)
Posted by **juntmac** · **862↑** · **130 comments**

_(no body — link/image post)_

## Comments

- **ectocarpus** (62↑): I sent a screenshot of the same graph to GPT 5 thinking, told it to identify the mistake and correct the graph. I think it did ok, though the legend could've been better (I mean, o3 also uses thinking?)

https://preview.redd.it/ei5qt5f3rshf1.jpeg?width=811&format=pjpg&auto=webp&s=26e4b0a6fe70a847e09cb9cce2218000cad4e469

I've seen rumours that the base model's router is broken somehow? What a shame. The release was rushed I guess.
  - **redditburner00111110** (22↑): The "Yep" makes it look like it is responding to you letting it know what the error is...
    - **ectocarpus** (5↑): In my initial prompt, I told it that the numbers on the graph are correct (because technically you can interpret it the other way: bar heights are correct, numbers are wrong). But I ran it before I saw OP's post (we just had a similar idea). I have rerun it in a temporary chat (so it won't pull results from chat history) with a minimal prompt like this:

https://preview.redd.it/ulxzcfxexshf1.jpeg?width=771&format=pjpg&auto=webp&s=c1b4474f1ca771e40a64a1d8954e1d3745066dd2

The text output:

>Here’s what’s off about that chart:

>It mixes encodings. GPT-5 is a stacked bar (two conditions: “without thinking” and “with thinking”), but o3 and GPT-4o are just empty outlines. That’s apples-to-oranges and visually implies they’re zero or less important.

>Stacking is the wrong choice here anyway—the two shades are the same metric under two conditions, not parts of a whole. Stacking suggests addition (52.8 + 22.1 = 74.9), which is misleading.

>The two empty rectangles look the same height even though the labels are 69.1 and 30.8—bar height should encode the number.

>Legend/colors are nearly identical shades, which hurts readability.

>Missing values aren’t marked as missing.

The missing values interpretation is off, the initial chart is even more messed up that it thinks. Otherwise, ok
  - **im_just_using_logic** (8↑): That would actually be good news because they will probably fix it
- **LateReplyer** (374↑): Seems like OpenAI just did great and free advertising for other LLM providers
  - **New_n0ureC** (69↑): I went to try Claude just after. 
And wow ! I tried on Gemini, ChatGPT and Claude to plan a trip to Japan on specific dates. And I thought ChatGPT o3 was good but Claude went checking for special events on these dates, proposed me to skip a city because it was too short or to go only for a day because it’s near. 
Told me to book some stuff now because it won’t be available for long.
    - **Zestyclose-Ad-6147** (16↑): Yeah, but the limits on a Claude are too low 😓. And when you hit the limit, you cant even use sonnet. You just need to wait until it resets.
    - **Gulgana** (1↑): Did you let it plan the whole vacation in agent mode or how do you work with it?
    - **WyvernCommand** (1↑): Im going to Japan in October.  Maybe I need to talk to Claude.
    - **internetuser999999** (1↑): Did you have to pay to try Claude? I would like to try it before paying but didn't get the option.
    - **Boscherelle** (0↑): Idk that’s exactly the kind of stuff I usually get and expect from o3
  - **aigavemeptsd** (2↑): Switched today to Gemini. All those data leak scandals this year really made me turn away from them.
  - **mickaelbneron** (1↑): Today I cancelled my ChatGPT subscription and I'm trying Claude now
- **TheInfiniteUniverse_** (112↑): surprising that OpenAI folks did not even acknowledge and apologized for the embarrassing mistake....makes you wonder if it even was a mistake.
  - **JsThiago5** (34↑): There was a lot of errors in their presentation. Idk if Apologizing would be better. There was like 3 or 4+ errors
    - **Wykop3r** (18↑): Whole presentation was pretty weird but these statictics was peak of that
    - **kopp9988** (3↑): GTP 4o errors
  - **gabrimatic** (11↑): It's 6:32 in the morning for them. They're going to wake up and be shocked by what they have done.
    - **Sufficient_Bad5441** (-3↑): Lol, I know you're probably joking, but time isn't really a thing when you're running a startup/company. There's little to no concept of "it's 4am so Im asleep"
  - **Buff_Grad** (9↑): They did. Well kind of. Sam posted the bad chart screenshot and acknowledged the embarrassing issue.
  - **xCanadroid** (14↑): Maybe it was a test, how brain-dead their customers are.
    - **KevinParnell** (3↑): Customers or shareholders? I imagine most customers haven’t seen this like how most Apple customers don’t tune into WWDC etc.
    - **Minimum_Indication_1** (0↑): Their customers are like Apple customers. AI == ChatGPT or Phone == iPhone
  - **damontoo** (3↑): They're going to acknowledge it today in the /r/chatgpt AMA because it's ~~the top question~~ one of the top questions. It's impossible for them to ignore it.
  - **ezjakes** (2↑): I think their charts are just to get people talking, good or bad, at this point.
- **Longracks** (17↑): Their product management seems..... not the strong suit.

This decision to go from too many choices to know, choices of models ?  The crappy applications - especially the web version on chrome terrible.  Some things  worked on the web and they don't work on the iOS app.  This recent pop-up telling me I need to take a break (I got that literally first thing this morning...)

The story I tell myself that they have AI engineers with quadruple digit, IQs, but nobody that's actually developed commercial software.

I find it an odd dichotomy....
- **Inner-Mall-6129** (9↑): https://preview.redd.it/87nf6iyqdthf1.png?width=3484&format=png&auto=webp&s=ed0c323e026cbd310e337b8971dd62cfe7b247d8

Every time a new model drops, I give it this map and ask it to tell me what I'm looking at and how many states it has. I think o3 has gotten the closest at about 120 (there are 136). GPT 5 says 48.
  - **nonotagainagain** (4↑): okay, put it through GPT5-thinking.  after almost 8 minutes of thinking (!!!) and re-inventing image segmentation I think, it returned 108.
  - **SealDraws** (1↑): Chat gpt5 thinking got me 48 with the base prompt, and gemini 63.

Changing the prompt to 
"In the provided map image, please count every individual, contiguous colored block"

Improved gemini's result to 93. While gpt5 thinking remained at 48.
Asking it to not use base knowledge, it replied it "can't preform analysis on the image itself".

Running this again resulted in the result of 49.

Gemini 2.5 pro api (ai studio) got the closest after 1.5 minute of thinking. With its thinking showing, it counted 130. But then replied 152 for whatever reason.

Wonder what OPUS would give.
  - **SealDraws** (1↑): 4o got 124 on the first guess,
No special instructions
  - **Ok-Lie5292** (1↑): Gemini 2.5 pro got it correct on the first try after 1.5 mins of thinking is insane
- **[deleted]** (25↑): Clearly sings that the current business model is unsustainable, they are downscaling ChatGPT capabilities because it can't handle the demand
  - **UnknownEssence** (2↑): I don't think so. Claude models are better and they profit from every API call. They don't actually lose money on inference. They only lose money on training.
    - **Frequent_Direction40** (1↑): And you know this … because…?!??
  - **Subushie** (1↑): This is my conclusion, diminishing returns- they could easily lean into the "AI best friend" thing and dominate the market in weeks. It has to be resource demand outweighs the revenue.
- **Extreme-Edge-9843** (9↑): I'm getting tired boss. Does anyone have positive examples of how it's actually better.
  - **damontoo** (7↑): Code generation. 5-Thinking and 5-Thinking-Pro absolutely smoke o3. Look at [the first lazy prompt this youtuber used](https://youtu.be/jwX5VTZhjtI?t=78) that one-shots a "web os" complete with file system, apps, terminal etc. The prompts he tries after don't have as good results, but aren't bad either for a single prompt. It would probably take a few more prompts to fix all the issues. He even says at the end of the web OS demo that he can't believe how good it is and is going to be using it for "financial pursuits", but he went back and cut that part out. Guess he doesn't want even more vibe coding competition.
    - **mickaelbneron** (2↑): Not my experience. Twice already GPT-5 Thinking produced crap for me when using it for coding, where o3 was much, much better.
  - **Hatsuwr** (1↑): If you check benchmarks (I'd start with LMArena), you can see that GPT-5 is better in almost every way. What you see on Reddit doesn't seem to match general consensus and testing.

OP compared non-thinking GPT-5 to o3. o3 uses full reasoning by default. With non-thinking GPT-5, it will use some degree of reasoning if it identifies a need to, but the proper comparison would be between either non-thinking 5 vs 4o or 5 Thinking vs o3.

Here is the output from GPT-5 Thinking. You can see it thought longer than non-thinking GPT-5, but it was still faster than o3. I'd argue that its output is better than either of them. It does contain the critical issue with the chart, although it would have been better if it was more definitive about it. I only had my screenshot of the screenshot that OP posted though, so it may have done better with a higher quality image.

https://preview.redd.it/i8969kat2jif1.png?width=580&format=png&auto=webp&s=eb7c4e94e67896e88fef579b859100e42a8cd8ea
  - **smulfragPL** (1↑): Literally this post lol. It thought less to give a way more detsiled response
    - **sabin126** (8↑): It said more words, but missed the most egregious part about the height of the bars and them being totally unrelated to the actual metrics displayed. o3 directly starts with the biggest problem, the height of the bars do not match the numbers. gpt5, in all the words it spits out, doesn't even mention that 69.1 and 30.8 shouldn't have the same height, or that 52.8 shouldn't be significantly higher than 69.1
- **SummerEchoes** (41↑): I truly cannot believe what a train wreck the past 24 hours has been for them.
  - **Mapi2k** (30↑): For them? They had months of testing. What the hell were they thinking?
    - **Interesting-Let4192** (19↑): Sam Altman is a psychopath, they’ve bled talent, focused on hype, done almost zero in the way of scientific research, and now they’ve hit a wall. 

OpenAI is just waiting for deepmind or anthropic to make a breakthrough they can piggy back on and pretend it’s theirs (again).
- **A_parisian** (47↑): Yeah, noticed the same here. o3 outperforms 5thinking every single time. The latter doesn't go off rails after several inputs, it doesn't even start on tracks.
  - **BlankedCanvas** (26↑): Correct me, but doesnt the above show GPT5 went into a more detailed analysis and correctly called out the chart as a “sales slide, not a fair chart”? Both models are calling it out for what it is
    - **[deleted]** (49↑): 5 said a lot more words but I found it far less clear. o3’s explanation of the biggest problem (the bars not being correctly sized at all) is very clear and it calls it right out.
    - **im_just_using_logic** (17↑): It feels that o3 is more surgical into identifying an issue. GPT5 has some sort of personal considerations that feel a bit "gaslighty"
    - **redditburner00111110** (9↑): Sort of, but it misses the most egregious issues that o3 catches in. 69.1 v 74.9, which GPT5 catches, could be explained by a non-zero baseline/y-axis start, which is a common and often sketchy practice, but not stupidly and blatantly inaccurate. The ridiculous part is 52 being higher than 69, and 69 being the same height as 30.
    - **Wiz-rd** (4↑): GPT5 went "corporate" where it started excessively over describing whilst simultaneously avoiding making any direct statement.
  - **ectocarpus** (2↑): Thinking does ok at the similar prompt https://www.reddit.com/r/OpenAI/s/QRSBu8MjXP

I'm also dissapointed with the release, but credit where credit is due
  - **damontoo** (1↑): > o3 outperforms 5thinking every single time.  
  
Absolutely not. I feel like 4o outperforms 5, but 5-Thinking absolutely smokes o3. I can't imagine what 5-Thinking-Pro is like beyond the youtuber demos I've seen, but I bet it's pretty awesome.
    - **Rare-Site** (3↑): 5 pro is not good, 03 pro was better!
- **Resident_Proposal_57** (8↑): Maybe all this will make openai to bring them back.
