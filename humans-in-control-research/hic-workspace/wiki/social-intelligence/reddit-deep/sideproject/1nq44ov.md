---
id: social-intelligence/reddit-deep/sideproject/1nq44ov.md
url: "https://www.reddit.com/r/SideProject/comments/1nq44ov/i_worked_2_jobs_to_bootstrap_this_spent_2_years/"
kind: "social-post"
source: "reddit-deep: r/sideproject"
subreddit: "sideproject"
title: "I worked 2 jobs to bootstrap this, spent 2 years researching, and almost a year building an app that can guess a mental state from phone sensor and usage data, and offer timely support"
author: "Natural_Gate5182"
date: "2025-09-25T11:24:26.000Z"
score: 1424
upvote_ratio: 0.95
num_comments: 234
flair: ""
extracted_at: "2026-07-03T00:07:56.413Z"
extraction_method: "praw-deep"
research_goal: ""
engagement: "misc"
chunks:
  - id: "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c0"
    char_span: [0, 2050]
    sentence_count: 10
    key_terms: [mental, reddit, health, comments, self-reporting, effort, https, sideproject]
    concepts: [mental, reddit, health, comments, self-reporting]
    related_chunks: ["social-intelligence/reddit-deep/sideproject/1nq44ov.md#c2", "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c7"]
    token_count: 488
    sources: [{"n":"reddit-deep: r/sideproject","u":"https://www.reddit.com/r/SideProject/comments/1nq44ov/i_worked_2_jobs_to_bootstrap_this_spent_2_years/"}]
  - id: "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c1"
    char_span: [2052, 3824]
    sentence_count: 5
    key_terms: [time, mood-tracker-anticipate-ai, appreciate, id6746043684, apple, app, like, prediction]
    concepts: [mood-tracker-anticipate-ai, appreciate, id6746043684, apple, prediction]
    token_count: 430
  - id: "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c2"
    char_span: [3839, 5335]
    sentence_count: 15
    key_terms: [health, mental, credibility, concept, medical, product, randomusername323232, board]
    concepts: [health, mental, credibility, concept, medical]
    related_chunks: ["social-intelligence/reddit-deep/sideproject/1nq44ov.md#c0", "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c6", "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c7"]
    section: Comments
    token_count: 329
  - id: "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c3"
    char_span: [5337, 7346]
    sentence_count: 8
    key_terms: [data, app, try, helloanticipate, private, privacy-policy, stored, days]
    concepts: [helloanticipate, privacy-policy, private, stored, thoroughly]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c4"
    char_span: [7348, 8719]
    sentence_count: 8
    key_terms: [android, package-famous, charge, love, available, "doesn't", great, users]
    concepts: [package-famous, android, charge, available, "doesn't"]
    section: Comments
    token_count: 363
  - id: "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c5"
    char_span: [8721, 10518]
    sentence_count: 10
    key_terms: [research, people, onboarding, probably, openai, data, response-to-nyt-data-demands, spreading]
    concepts: [research, onboarding, people, probably, openai]
    section: Comments
    token_count: 476
  - id: "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c6"
    char_span: [10520, 12422]
    sentence_count: 15
    key_terms: [app, medical, health, work, researches, "people's", support, actual]
    concepts: [medical, health, researches, "people's", support]
    related_chunks: ["social-intelligence/reddit-deep/sideproject/1nq44ov.md#c2"]
    section: Comments
    token_count: 429
  - id: "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c7"
    char_span: [12424, 14267]
    sentence_count: 17
    key_terms: [health, mental, people, mentioning, scientific, already, medical, advice]
    concepts: [health, mental, people, mentioning, scientific]
    related_chunks: ["social-intelligence/reddit-deep/sideproject/1nq44ov.md#c0", "social-intelligence/reddit-deep/sideproject/1nq44ov.md#c2"]
    section: Comments
    token_count: 400
---
# I worked 2 jobs to bootstrap this, spent 2 years researching, and almost a year building an app that can guess a mental state from phone sensor and usage data, and offer timely support

Source: [reddit-deep: r/sideproject](https://www.reddit.com/r/SideProject/comments/1nq44ov/i_worked_2_jobs_to_bootstrap_this_spent_2_years/)
Posted by **Natural_Gate5182** · **1424↑** · **234 comments**

Hello wonderful people,

I'm Alex 👋 I struggle with anxiety (*yes, I'm dying inside posting this).* I always thought it would be great to know when my mental health was about to go down, and what was affecting it, so I can manage it better. I interviewed over 100 people with mental health conditions from anxiety to bipolar ([Reddit helped](https://www.reddit.com/r/BipolarSOs/comments/16rlyvz/developing_a_help_tool_for_people_with_bipolar/)), and found the struggle was shared.

But what I kept hearing was:

↳ seeing triggers and patterns is real help for mental health, 

↳ but it requires self-reporting (mood diary, journalling, etc.),

↳ but self-reporting requires motivation,

↳ and motivation is one of the first things that goes out the window when you're near an episode.

*The hypothesis was that someone or something should be doing it for you for it to work.*

So in 2023, I started reading all the research I could find on predictions of mental state, and analysed all threads on triggers and early signs of mental health shifts here on Reddit ([bless Reddit](https://www.reddit.com/r/dataisbeautiful/comments/1mozybt/oc_most_frequently_mentioned_depression_symptoms/)). I met researchers who had been doing it since 2014.

Around 10 months ago, a friend of mine, Varvara, and I started building. We created 6 versions of the approaches and the app. 

All failed. 

High effort → Still high effort → IS IT A MENTAL HEALTH APP FOR... DOGS?! → Still high effort. 

We kept iterating and finding a way to use sensor data as much as possible to model mood, habits, surroundings, events FOR users, instead of making a user self-report everything.

Now it feels like we have a *minimum viable product* with what feels like a *good plan* to turn it into a *minimum valuable product*.

**It's called Anticipate, and what it currently does is:**

🧠 Analyses sleep (Apple Watch, or modeled based on device motion), activity, triggers and good events, weather, and travel, and makes a mood prediction with an explanation of why this prediction was made.

🗓️ Automatically logs moods and factors in the calendar, so you can see correlations.

🧡 Support: audio guided self-care routines (so far, recorded by me)

**Who it's for:**

* You want to monitor your mental health over time.
* Life happens, and you don't have time to log things manually.
* Your anxious/ADHD brain needs a clean non-stimulating design.

*We keep working →*

**What's in development:**

* Free plan with full access to all essentials.
* More pre-calculated insights to link to your mental health: exposure to sunlight, time outside, rest time, screen time, binge-watching, time with others, etc.
* More and better self-care audio routines with real humans.
* Real help hub with a collection of helplines, therapists, psychiatrists, etc.
* Hopefully, getting closer to turning this lil side project into a **safe** useful tool that can help people with serious conditions. *That's why we started after all.*

👉 Try it on the App Store - [https://apps.apple.com/gb/app/mood-tracker-anticipate-ai/id6746043684](https://apps.apple.com/gb/app/mood-tracker-anticipate-ai/id6746043684) **\[WE MADE FULL VERSION OF IT LIFETIME FREE FOR TODAY & TOMORROW SO YOU CAN TRY IT\]**

*p.s. We would appreciate any feedback, challenges, and guidance. And if you like it, we would really appreciate your kind review. It means more than you can imagine. I appreciate you.*

## Comments

- **RandomUserName323232** (159↑): This should be tested and reviewed by qualified mental health experts, as incorrect outputs could negatively affect someone’s mental state. Nonetheless, it’s an amazing concept
  - **Proffit91** (35↑): This was my first thought. What credibility is behind the app?

And I’m sorry, saying “mental health folks,” when asked what credibility this has to make such claims, makes it sound like total BS. What kind of “mental health folks?”
    - **Natural_Gate5182** (43↑): Thank you so much for asking!

At this stage, we don’t have an official medical board. However, we’ve been receiving consultations and feedback from researchers at Hospital Clínic Barcelona, KU Leuven, a clinical advisor at Modern Health, and we participate at Society for Digital Mental Health.

I’m fully aware that as we grow, the product will need a formal medical/scientific board. There’s absolutely no doubt about that. For now, we’re starting with a simple mood tracker that’s a bit smarter than what’s currently on the market. It calculates averages and uses device data to model factors like rest time, sunlight exposure, screen time, and more. Importantly, we don’t give direct suggestions or claim X = Y.

The goal is to build initial traction with this proof of concept and then scale from there. I really value your concerns. They help me see gaps in the product, the pitch, and my own answers, and show what I’ll need to do differently to move this to a truly meaningful place.

Thank you so much! I appreciate you
  - **Natural_Gate5182** (12↑): Yes, you're 100% right. We're already guided by mental health folks, and we will keep doing that. The mirroring issue is real, and we're thinking how we can fix that
    - **dickdastardaddy** (1↑): If you really want it to be thoroughly tested then create a list of early adopters and then try to test your app with that user group rather than making it free for 2 days as per your convenience, why is that because not everyone who really wants to try it has the exact free days to test it.  
Even I wanted it to try it at least but I'm not free on these days so I think it's better to give your use base the flexibility will also help you test the app thoroughly. Just a suggestion, the idea was great and your level of dedication is at a different level. All the best!!
    - **Critical_Hunter_6924** (-4↑): I'm glad that you're admitting that this is potentially damaging, I hope you try to do proper research asap.
  - **CenlTheFennel** (1↑): I actually enjoy the usage of words here. “Guess” even if data driven and highly tested is a good way of putting it, kudos.
- **pr2d3** (107↑): Sorry to be that guy, but…

How do you handle all of that private data? And how do you plan to monetise it?
  - **Natural_Gate5182** (82↑): This is such a important question, thank you for being that guy 🙏

**Private data**

* All sensitive data is stored locally on your device
* Right now, only basic sleep chunks, steps, and energy data are stored on Google Cloud, but we’re moving those too, so our servers will be empty
* In app settings, you can see and delete each data point stored, no matter where it is
* We don't ask for an email, and you open the app with Face ID
* Privacy policy: [https://helloanticipate.com/privacy-policy/](https://helloanticipate.com/privacy-policy/)

Please let me know if you have concerns, I take all the guidance I can on how we can make it more safe and private - I know it's essential for users and Anticipate.

**Monetisation**

Subscription. Outside of the lifetime free offer, there’s a 7-day trial, then 3.99/month or 19.99/year. We did it only because we're bootstaping and need to make ends meet. Long-term, I’d love for us to have a free version with all essentials, and monetise only customisation (e.g. look, views, etc.).
    - **cs_legend_93** (29↑): you should charge a little more, i see plant identifcation apps and weather apps charge more.  but i want it cheap as a user, but as a business,  you should charge more
    - **i_am_simple_bob** (2↑): If you're not already, the sensitive data on the device should be encrypted at rest if possible.
  - **Package-Famous** (3↑): When i saw the notification on my phone via reddit that was my 1st initial reaction too 😆  but worse it was morbid fear 😆 I love the app idea though! I wish it was available for Android.
- **TwoFluidCarrots** (11↑): Is this available on Android?
  - **Package-Famous** (4↑): That's EXACTLY what I was wondering!
  - **Devuluh** (1↑): Doesn't look like it :(
  - **SpecificWay1954** (1↑): Android users doesn't need therapy
- **kylen57** (6↑): Love it Alex! Great pitch. Proof will ultimately be in the pudding - if this can actually work and provide mood insights that correlate with the users intuition automatically, but it sounds like you guys are doing everything right so far. Great work. 

Quick bit of feedback - onboarding flow needs a back button. You should be able to change your mind. Making onboarding choices feel final introduces a lot of anxiety at a critical point of the user experience
  - **Natural_Gate5182** (3↑): Thank you so much for your kind words and direction. Noted re onboarding, and we'll fix that!
- **Muted_Farmer_5004** (4↑): Amazing story!
  - **Natural_Gate5182** (1↑): Thank you, it really means a lot. 🙇‍♀️
- **Critical_Hunter_6924** (3↑): Can you link your research?
  - **Natural_Gate5182** (0↑): I am not a researcher, and I don't have anything published. By research I meant user and feasibility research, and finding the right people to answer to my questions. I should have been more clear about this, so there's no miscommunication.
    - **Critical_Hunter_6924** (-7↑): Disappointing, yet another founder spreading nonsense while not even knowing how to research. "I have researched for 2 whole 2 years with nothing to show for it" 

I hope your app dies asap since you have no idea what you're spreading, you're probably damaging people as we speak.
    - **[deleted]** (-1↑): Alex, you did a probably complex survey on 100 people. It IS a research, don’t let crazy redditers blame you

This is what we do in business, we interview people, we get the pain points, we summarize studies and try to launch an MVP.

You have a good storytelling and probably a long excel to prove data/insights
- **BlinksTale** (5↑): r/UNBGBBIIVCHIDCTIICBG
  - **Natural_Gate5182** (2↑): ❤️
- **woadwarrior** (3↑): Sharing users' health data with OpenAI is at best iffy and at worst a legal quagmire in multiple jurisdictions including the UK. Especially after OpenAI started [retaining all data](https://openai.com/index/response-to-nyt-data-demands/), indefinitely.

If you have a Zero Data Retention agreement with OpenAI, please mention it in your [privacy policy](https://helloanticipate.com/privacy-policy/).
- **Mobile_Reward9541** (9↑): So, medical claims without a proof or a license. Congrats you invented snake oil for the millionth time
  - **Natural_Gate5182** (3↑): No medical claims. In fact, quite the opposite \*sad sigh\*. But I am truly grateful for your comment, and taking away this a good learning and feedback that I have to be better at communicating it. I'll work on it
    - **Mobile_Reward9541** (0↑): “Guess a mental state and offer timely support” what if people believed this and skipped the actual help they needed from professionals and as a result non reversible consequences happened? And you can take a moment to think why didn’t any actual licensed doctor build such an app.
- **Natural-Funny-2292** (14↑): \> analysed all threads on triggers and early signs of mental health shifts here on Reddit

People's health is not a joke. Why do you think all medical devices and software go through years of scientific research? What makes you (more importantly, your users) confident that your app really does what it says and will cause no harm? As someone who researches, among others, technical approaches (e.g. AI) to wellbeing support, I am extremely skeptical that you and your friend made more progress than thousands of full time researches globally. You even included a (presumably LLM-powered) chatbot as far as I can tell from the app description. And in your ToS you clearly don't want to be liable to any harm done.

Health should not be a side project.

All that said, I applaud that you put in a lot of work and launched an application, I know it took effort and dedication and you must be proud of your app. I wish you had worked on something where the quality of your work and lack of experience didn't affect people's lives.

Feel free to downvote me for ruining the vibes, but I will never stop advocating for the regulation of these completely made up mental health support apps made by amateur devs to fetch a quick dollar from the global mental health pandemic.
  - **Natural_Gate5182** (2↑): You’re making very important points. We’re not in a position to claim Anticipate is a medical device or suitable for people with mental illnesses, and we don’t. That’s why we’ve started as a simple mood tracker, and why I say there’s a long road ahead before it becomes a safe, useful tool for monitoring serious conditions.

We’ll never be able to do this on our own. That’s why we’re already getting guidance from clinical advisors and researchers like yourself. As we scale, building a strong medical and scientific team will be essential.

But to get there, we have to start somewhere. And for us, that’s with a simple assisted mood tracking tool. Hopefully, we can show traction and bring the right people on board to turn it into something big and truly meaningful.

Health is not a joke, and I agree with you fully.
    - **Natural-Funny-2292** (2↑): If you really do get advice, you should make sure to be transparent about from who, and what. You can do this by at least mentioning the institution of the advisor/researcher and citing the scientific articles that back up your work. Mentioning Reddit as a source is raising massive red flags already. Dedicate a page to this on your website.  Making design decisions based on hunches or vague design goals is not acceptable in this space. Also, regardless of the amount of advice you receive about your chatbot, please do not use LLM for it for now (I just assume that you did, I did not try the app). The technology is simply not there yet. Your users are the most vulnerable people, you must treat them as such.
