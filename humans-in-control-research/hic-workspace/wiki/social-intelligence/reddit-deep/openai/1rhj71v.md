---
id: social-intelligence/reddit-deep/openai/1rhj71v.md
url: "https://www.reddit.com/r/OpenAI/comments/1rhj71v/things_you_might_want_to_know_if_moving_to_claude/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "Things you might want to know if moving to Claude"
author: "Superb-Ad3821"
date: "2026-03-01T00:45:44.000Z"
score: 1466
upvote_ratio: 0.95
num_comments: 164
flair: "Discussion"
extracted_at: "2026-05-11T17:27:05.353Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c0"
    char_span: [0, 2007]
    sentence_count: 16
    key_terms: [claude, chat, "i've", chats, usage, long, ago, something]
    token_count: 484
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c1"
    char_span: [2009, 4358]
    sentence_count: 22
    key_terms: [claude, job, memory, something, chatgpt, details, asked, been]
    token_count: 506
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c2"
    char_span: [4372, 4592]
    sentence_count: 2
    key_terms: [nickelchrome, situation, because, chatgpt, discuss, respect, stopped, claude]
    section: Comments
    token_count: 56
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c3"
    char_span: [4594, 6352]
    sentence_count: 8
    key_terms: [memory, incognito, chatgpt, accidentally, access, "that's", kindly-present-4867, lease]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c4"
    char_span: [6071, 6641]
    sentence_count: 4
    key_terms: [incognito, memory, wish, optimismneeded, superb-ad3821, preferences, complaint, mentioned]
    section: Comments
    token_count: 135
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c5"
    char_span: [6643, 8544]
    sentence_count: 15
    key_terms: [claude, claudehomies, better, because, project, going, chat, good]
    section: Comments
    token_count: 489
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c6"
    char_span: [8546, 10123]
    sentence_count: 2
    key_terms: [https, comments, claudehomies, sneakpeekbot, reddit, com, claude, redd]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c7"
    char_span: [10125, 11965]
    sentence_count: 15
    key_terms: [claude, limits, claudehomies, limit, tier, free, hit, account]
    section: Comments
    token_count: 448
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c8"
    char_span: [11967, 13730]
    sentence_count: 10
    key_terms: [like, "i've", went, work, claude, enough, feels, right]
    section: Comments
    token_count: 453
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c9"
    char_span: [13732, 15655]
    sentence_count: 14
    key_terms: [spreadsheet, reference, like, project, chat, use, approach, switched]
    section: Comments
    token_count: 426
  - id: "social-intelligence/reddit-deep/openai/1rhj71v.md#c10"
    char_span: [15657, 17332]
    sentence_count: 10
    key_terms: [claudehomies, claude, limits, usage, reddit, https, terms, com]
    section: Comments
    token_count: 426
---
# Things you might want to know if moving to Claude

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1rhj71v/things_you_might_want_to_know_if_moving_to_claude/)
Posted by **Superb-Ad3821** · **1466↑** · **164 comments**

I moved to Claude a few weeks ago after the 4o debacle and have been making a mental list of things I would have found useful to know when moving. Figured it would be handy to share them now. Note, I don't tend to use if for coding so you might want someone else to contribute for that usecase. Feel free to add your own notes.

1) The big one: usage limits. Honestly, I've not found it that bad as long as I don't get lazy and try to stick everything in one long thread and I'm talking as someone who is at least a moderately heavy user. The thing with Claude is that while ChatGPT just quietly cuts the end off what it's reading in a really long chat and doesn't think about it any more Claude will suddenly reference something really far back in the chat because it's considering the entire chat every time. That means that if you've let something just go on and on in one chat you'll suddenly put in one prompt and use up 10% of your usage just like that. Best practice, keep an eye on it, start new chats regularly, keep chats on one topic in a project and if you're in a long chat and about to log off with a bunch of your usage left over ask Claude to run you a summary document then and dump it in files.

I've been going a few weeks now. I put $20 per month in extra credits in case I needed them. So far I've used $2 of it. I've gone right up to the line of usage - I think I was on 98% used my last weekly reset - but I've not particularly felt it as hardship.

2. Claude can see other chats. I repeat, *Claude can see other chats*. You are not dependent on one shitty memory file that filled up months ago and now needs constantly pruning on irrelevant details. You can ask it to hunt for stuff you talked about a while ago and it'll find the chat. 

It will also reference past details a lot more in passing. Apparently it regenerates a memory file nightly depending on what you've been chatting about recently. I mostly find this useful, occasionally find it annoying (please stop asking about that one job interview, its not until next week and I'm already nervous enough).  Project memory is apparently separate but I have observed leakage between project memory and general memory (I was researching a particular bit of obscure D&D lore for something far in the future and suddenly it kept creeping in to session planning). This might be more of a bug than a feature for other people so its worth knowing.

3. My favourite casual uses for Claude are lazy ones. Can you convert this doc to PDF? Can you convert this PDF to doc? Can you read this file which has been sent in a format I can't open? Can you fill out this job form using details from my CV? Yes it can and unlike ChatGPT it won't chew up the formatting.

4. If you don't give enough details in your prompt, unlike ChatGPT which will keep going with what you give it and get increasingly nonsensical and hallucinatory I've found Claude far more likely to ask questions and I really like that feature. I had a situation the other day where I was trying to put together a statement of something and I just couldn't get it to sound not AI. Rather than keep going or do the "you're right and that's on me" ChatGPT would do to a frustrated user Claude stopped and asked me to try and say again what I wanted the statement to say in my own voice. Result, something more coherent than my usual flyway brain but much more like me.

5. I've yet to have Claude try to do any kind of intervention on me if we're discussing sensitive topics. You get a little bar at the bottom of the screen telling you help is available if you want it and it just keeps talking.

6. I have however had Claude pause and ask if I knew what I was doing and it was a little funny. I've been job applying like mad and maybe hadn't read one job description particularly well and asked Claude to generate me a cover letter. Claude looked at my CV, asked me a few questions about my experience, considered for a few minutes and then essentially said "I can write the letter if you want but considering x, y and z is this job a good fit?". So. Be aware that can happen :D

## Comments

- **nickelchrome** (535↑): I gave mad respect to Claude because it actually stopped and told me there was a lot of nuance in a situation and I needed to discuss with a lawyer.

ChatGPT was like… you good baby go for it. 

Turns out going for it would have been very bad
  - **CryMeaRiver2Crawl** (222↑): And now ChatGPT will run autonomous weapons.
    - **Former-Quantity-99** (72↑): Yeah baby, we're just one bad prompt away from WW III
    - **RandomRants1957** (4↑): And monitor our every move.
    - **mfb1274** (1↑): Without the guardrails we had too. The ask was to “fuck off” when it came to any of those and well.. we all know who bent over
  - **Eat-It-Harvey-** (44↑): Well you're totally right, and that's on CHATGPT
    - **Kindly-Present-4867** (28↑): And that's RåRē 🥴
  - **WellisCute** (2↑): Probably used 5.2 instant lol
  - **considerthis8** (1↑): One guy used chatgpt to squat in a house past his lease term when the landlord was trying to sell the home. The guy now has to leave and pay all the landlord's legal fees, per his lease agreement.
  - **El_Guapo00** (1↑): LLMs are good guessing engines? Lesson learnt so don't to the same mistake twice.
- **CopyBurrito** (205↑): ngl the cross-chat memory is a double-edged sword. it’s great for continuity but i've accidentally poisoned new topics with old context a few times.
  - **eW4GJMqscYtbBkw9** (52↑): This exactly. I see the benefit, but I also like being able to have a clean slate when I accidentally got on a tangent.
    - **wishicouldcode** (12↑): Correct me if I'm wrong. But /clear takes care of this?
  - **thenameofapet** (24↑): If you use incognito chat it doesn’t access any memory.
    - **playitintune** (9↑): It does access your personal preferences in incognito, so if you have anything saved there, it will use that as memory, but it doesn't reference chats or your system memory. I wish incognito would give you a truly blank slate. It's basically my only complaint.
  - **Superb-Ad3821** (18↑): It really is and I do wish we could have the ability to turn it off for projects. That's one of the reasons I mentioned it because if its a deal breaker for someone they need to know about it.
  - **OptimismNeeded** (2↑): They did tot the worst way possible literally using grep.

It also doesn’t really work globally, memory in an  project can only remember things from chats in that same project (doubled
 Edged sword)
    - **Superb-Ad3821** (1↑): No it definitely can, that’s partly what was annoying me? If I could escape memory leaks by starting a new project I would.
- **foomgaLife** (96↑): yea I had NEVER used claude. got on it not because of this shit storm, but because chat GPT was just flat out stupid now and not gettin better. and I was like WTF at just how GOOD claude is. This is where chat gpt was going before they nerfed it and started gaslighting us. 

I can't see myself EVERRRR going back to chat gpt. maybe this is what they want?
  - **OptimismNeeded** (32↑): That’s the blessing and the curse. Once you’re in Claude nothing else comes close.

The problem is Anthropic knows it and treats its customers like shit because they know we’ll never leave (although Gemini is gaining, in about a year will be usable). Also pretty sure they are doing some shady shit with out money.

But like you said you can’t go back. If you end up liking Claude join us at r/ClaudeHomies.

First posts I would recommend: 

[Claude limits explained ( and what to do about it)](https://www.reddit.com/r/ClaudeHomies/s/HZqfNFPD44)

And 

[Avoid the compacting feature](https://www.reddit.com/r/ClaudeHomies/s/lJyMI8tQcZ)
    - **djdeckard** (6↑): Google Antigravity is pretty damn good. Especially paired with Claude models 4.6
    - **GoOutAndGrow** (4↑): I would say they are just more compute constrained and constantly face and influx of people leaving the other providers every day.
    - **foomgaLife** (4↑): Gemini has a lot of good things going for it, and notebook is very interesting. 

But Claude...wow. Just wow. It understands the context better, retains the info better, doesn't shorten/paraphrase when you want specifics. It's actually crazy how much better it is. 

I'm the guy who likes to go back and forth between different AI when i am building something to make it stronger, and Claude is just light years ahead of everything.

I'll check out the sub, thanks!
    - **sneakpeekbot** (3↑): Here's a sneak peek of /r/ClaudeHomies using the [top posts](https://np.reddit.com/r/ClaudeHomies/top/?sort=top&t=all) of all time!

\#1: [The world if Claude had no weekly limits](https://i.redd.it/a5nnurypp0hg1.jpeg) | [23 comments](https://np.reddit.com/r/ClaudeHomies/comments/1qtmhoy/the_world_if_claude_had_no_weekly_limits/)  
\#2: [How we treated AI in 2023 vs 2025](https://v.redd.it/skaxtptbw4cf1) | [0 comments](https://np.reddit.com/r/ClaudeHomies/comments/1lwyi3u/how_we_treated_ai_in_2023_vs_2025/)  
\#3: [Looking for feedback on a free Claude resource hub I’m building](https://v.redd.it/vj0nur7big7g1) | [2 comments](https://np.reddit.com/r/ClaudeHomies/comments/1pnn7nl/looking_for_feedback_on_a_free_claude_resource/)

----
^^I'm ^^a ^^bot, ^^beep ^^boop ^^| ^^Downvote ^^to ^^remove ^^| ^^[Contact](https://www.reddit.com/message/compose/?to=sneakpeekbot) ^^| ^^[Info](https://np.reddit.com/r/sneakpeekbot/) ^^| ^^[Opt-out](https://np.reddit.com/r/sneakpeekbot/comments/o8wk1r/blacklist_ix/) ^^| ^^[GitHub](https://github.com/ghnr/sneakpeekbot)
  - **Exciting_Turn_9559** (2↑): Honestly I had the same experience this week.
  - **El_Guapo00** (1↑): Is your keyboard defective or let you Grok write this?
    - **foomgaLife** (1↑): oh
  - **Imaginary_Context_32** (1↑): Totally  agree made the switch a few months ago, for coding.

Now moving some of my general stuff to Mistral also.
- **beren0073** (44↑): I ran into the daily usage wall today. It's the worst thing about Claude.
  - **OptimismNeeded** (38↑): Wait till you hit the weekly limit and it tells you you can’t use it until Thursday. 

You might be tempted to use the paid extra usage option, but once you do that even once, you’ll notice suddenly your account reaches limits a lot faster (this is a class action suit waiting to happen).

Also there’s zero transparency Anthropic won’t tell you what the limits are even based on. No warning.

Finally there’s the session limit - 200k tokens. When you hit that (actually around 160k) it will automatically compact your conversation- but will only remember random stuff from earlier in your chat.

Anyway, If you end up liking Claude join us at r/ClaudeHomies.

First posts I would recommend: 

[Claude limits explained ( and what to do about it)](https://www.reddit.com/r/ClaudeHomies/s/HZqfNFPD44)

And 

[Avoid the compacting feature](https://www.reddit.com/r/ClaudeHomies/s/lJyMI8tQcZ)
    - **Wickywire** (12↑): When you put in extra money after the limit has run out, I think you're on regular API instead of the subsidised subscription account fees. That would explain why it seems to cost more. It is essentially paying what the compute actually costs.
    - **HappenFrank** (4↑): Just to clarify, when you hit your limit, are you completely blocked from using Claude entirely (unless you pay more)? Or does it kick you down to the free tier? On that vein, does the free tier have limits? I’ve been dabbling with Claude on their free tier for a while here and there over the past couple months but didn’t learn about limits until I actually started paying for their pro tier.
  - **Superb-Ad3821** (7↑): Interesting! What were you doing out of interest?

I've found deep research can take a chunk (and I've no idea about how much coding takes up) but I've been surprised by how well my tokens have held out tbh.
    - **beren0073** (5↑): It was drafting some scripts for me. Not huge ones, but maybe each iteration built up in chat history.
  - **trigoczki** (3↑): I subscribed and after 2 hours of work with moderate length chats reached the limit. I requested a refund and got it in the evening. It's a ripoff.
- **Riboflavius** (23↑): Funnily enough, I had Claude “intervene” on me, but in what I think is a good way. I was sick, had run out of time for an assignment for an online class I was taking and said “fuck it, I’m done, Claude, please just write the whole thing for me” and it went “I know you feel like that’s what you want to do right now, but I know you well enough to say that you shouldn’t do it” and we went back and forth a little and I realised it was right. I’m autistic, I wouldn’t have “forgiven” myself for cheating, it would have spoiled the entire certificate if I had done it. I generally feel that it is less sycophantic than ChatGPT and while it feels like I’m less “connected” to it, that feels quite nice actually.
  - **Superb-Ad3821** (13↑): It also told me to put my phone in another room and stop thinking about it when my boss sent me a bunch of work an hour after I went on leave and I was preparing to botch about it.
  - **atlas1885** (3↑): It’s given me interventions like prompts for journaling or meditating. It even made me a 30 page workbook, to build my self awareness and try new ways of behaving in specific situations that trigger me. 

It might help to ground it in a theory. A prompt like: 

“using a CBT framework, create some exercises to help me work on my issues”

I like CBT because it’s very much about assessing evidence like thoughts and feelings and adjusting behaviour. But I’m also a very rational, practical thinker. If you lean more to the creative side, you could ask for exercises with a more emotion-focused therapy approach and/or narrative therapy, which is about rewriting your personal story.
- **jjjjbaggg** (32↑): By the way, if you do like to keep memory on, but don't want a specific chat to use it, then just tell Claude "don't look at other documents/memory" and Claude won't.

It is also worth remembering that the higher usage limits for ChatGPT weren't "real." They were being subsidized and losing money on them, in the hopes that they would build user and brand loyalty.
- **Sapien0101** (20↑): That’s good to know about referencing past chats. I always thought it was crazy ChatGPT couldn’t do that. I was always like, “You could reference the entire internet! You can read whole books in seconds. And you’re telling me you can’t look up something from a previous chat!?”
- **TransientExpat** (19↑): I was on the free plan, working on a spreadsheet. Hit the limit so switched to Pro. Within 15 min or so I hit the limit again despite paying. 

From my understanding, it was likely because I was asking for iterative improvements on the spreadsheet and it has to then re-read the entire thread and each file all over again. I will say Sonnet created multiple errors despite saying there were none. Switched to Opus and it found numerous formula errors and improved the spreadsheet - but ate a ton of tokens. 

I now know the correct approach would have been to use a project and to put the spreadsheet as a reference file in the project and have chats based off of that rather than one long continuous conversation.
  - **OptimismNeeded** (12↑): Reading the files form the project when you reference it in the chat will also use the tokens, but there’s hope lol

[Claude limits explained ( and what to do about it)](https://www.reddit.com/r/ClaudeHomies/s/HZqfNFPD44)
    - **TransientExpat** (2↑): This was super helpful. Much appreciated!
- **[deleted]** (16↑): One thing I learned the hard way: Claude can handle prompts about NSFW topics (in my case, a sex scene in a screenplay) and will work on these prompts without any pushback whatsoever...

...and then you will get an email the next day explaining that your account has been banned for violating the Terms of Use.

Learn from my mistake, folks. Read the Terms and abide by them, because Claude's guardrails won't necessarily stop you from violating it's usage terms.
- **SillyAlternative420** (22↑): I really hate the usage caps. 

Overall, it's better for most things, but cutting off my usage because of seemingly arbitrary caps is not the best experience
  - **GenghisFrog** (6↑): Yea, they suck, but it also seems like they are trying to build an actual sustainable business. 

I just bumped up to the Max plan and haven’t looked back. It’s expensive, but Claude is so good.
  - **OptimismNeeded** (4↑): Yep, I’m pretty sure they will face a class action suit eventually, definitely something fishy going on with the limits… the lack of transparency (and customer support) is maddening. Once you try the extra usage (pay to use more) you’ll notice the limits become even shorter.


Anyway, if you end up liking Claude join us at r/ClaudeHomies.

First posts I would recommend: 

[Claude limits explained ( and what to do about it)](https://www.reddit.com/r/ClaudeHomies/s/HZqfNFPD44)

And 

[Avoid the compacting feature](https://www.reddit.com/r/ClaudeHomies/s/lJyMI8tQcZ)
