---
id: social-intelligence/reddit-deep/sideproject/1pcgv6u.md
url: "https://www.reddit.com/r/SideProject/comments/1pcgv6u/my_app_just_hit_2k_downloads/"
kind: "social-post"
source: "reddit-deep: r/sideproject"
subreddit: "sideproject"
title: "My app just hit 2k downloads!"
author: "caleb_thesocialite"
date: "2025-12-02T18:50:26.000Z"
score: 1023
upvote_ratio: 0.97
num_comments: 186
flair: ""
extracted_at: "2026-07-03T00:07:56.414Z"
extraction_method: "praw-deep"
research_goal: ""
engagement: "misc"
chunks:
  - id: "social-intelligence/reddit-deep/sideproject/1pcgv6u.md#c0"
    char_span: [0, 2112]
    sentence_count: 26
    key_terms: [app, thesocialite, https, users, socialite-stay-connected, "i'm", talk, designed]
    concepts: [thesocialite, socialite-stay-connected, https, users, designed]
    token_count: 492
    sources: [{"n":"reddit-deep: r/sideproject","u":"https://www.reddit.com/r/SideProject/comments/1pcgv6u/my_app_just_hit_2k_downloads/"}]
  - id: "social-intelligence/reddit-deep/sideproject/1pcgv6u.md#c1"
    char_span: [2114, 3809]
    sentence_count: 17
    key_terms: [cloud, google, thanks, love, use, typescript, firebase, people]
    concepts: [cloud, google, thanks, typescript, firebase]
    section: Comments
    token_count: 431
  - id: "social-intelligence/reddit-deep/sideproject/1pcgv6u.md#c2"
    char_span: [3811, 5190]
    sentence_count: 18
    key_terms: [people, challenge, feedback, message, groups, update, great, good]
    concepts: [people, challenge, feedback, message, groups]
    section: Comments
    token_count: 310
  - id: "social-intelligence/reddit-deep/sideproject/1pcgv6u.md#c3"
    char_span: [5192, 6961]
    sentence_count: 16
    key_terms: [people, thanks, congrats, good, idea, comment, country, across]
    concepts: [people, thanks, congrats, comment, country]
    section: Comments
    token_count: 477
  - id: "social-intelligence/reddit-deep/sideproject/1pcgv6u.md#c4"
    char_span: [6963, 7152]
    sentence_count: 2
    key_terms: [probablykinda, absolutely, future, sounds, going, app, best, chat]
    section: Comments
    token_count: 63
---
# My app just hit 2k downloads!

Source: [reddit-deep: r/sideproject](https://www.reddit.com/r/SideProject/comments/1pcgv6u/my_app_just_hit_2k_downloads/)
Posted by **caleb_thesocialite** · **1023↑** · **186 comments**

Thought this would be a fun share. I checked my lifetime analytics today and saw that I cracked 2,000 downloads! I'm stoked

As I've been improving the app, things have been getting a lot easier. I'm consistently talking to users, having purchases come in, getting positive and constructive feedback.

I thought it would be helpful to share some of what I've learned during this process.

1. Talk to users, talk to users, talk to users, find a way to talk to users. They WILL NOT use the app the way you expected.

2. UX/UI MATTERS! People want an app that feels premium and are willing to overlook bugs and issues if the app feels nice enough.

3. It will take time. It took a while to make onboarding good enough that people would happily pay for the app. And I'm a software engineer by trade. Be patient with yourself.

4. Try to wait for someone to ask for a feature before you build it. Or find a way to validate that people want it. I have an easier time building cool stuff that no one wants than I do talking to customers. But that doesn't work.  


I'm building Socialite, an opinionated relationship manager for everyone. It is backed by research and thoughtfully designed.

  
here's a little more info about the app if you are curious.

Tools to help with relationships don't need to be expensive or overly complicated. They should be built with opinions and a focus on accountability. They should be thoughtfully designed and backed by research.

With relationships, consistency is everything. Socialite is designed to make consistency inevitable.

I'd love to hear your thoughts -> [caleb@thesocialite.app](mailto:caleb@thesocialite.app)

iOS download -> [https://apps.apple.com/us/app/socialite-stay-connected/id6471198543](https://apps.apple.com/us/app/socialite-stay-connected/id6471198543)  
android waitlist -> [https://www.thesocialite.app/](https://www.thesocialite.app/)

BTW, we are currently running a Black Friday Sale on Lifetime access (I've extended the sale because of positive reception)

## Comments

- **FromBiotoDev** (25↑): Hey, love the idea mate, what tech stack did you use?
  - **caleb_thesocialite** (29↑): Thanks! I use expo/react native for client code (with typescript) and cloud run (via node/typescript) for my server. I also have a mix of Firebase for auth and realtime db, google cloud scheduler for cron type tasks and a few legacy google cloud functions that haven't been moved to cloud run yet.  
  
I don't love firebase but it gets a few things right that made it a good call for me.
    - **caleb_thesocialite** (12↑): I also use vertex and google models for ai stuff but I might kill those features. They are an example of something no one asked for lol
- **Vukic1** (12↑): Love the app idea man, keep it up!!
  - **caleb_thesocialite** (2↑): Thanks!
- **One_Administration58** (6↑): Congrats on hitting 2k downloads! That's awesome. Your points are spot on, especially about talking to users. It's tempting to build in a vacuum. Validating ideas early saves so much time. Also, great call on UX/UI. People definitely stick around longer if an app feels good, even with a few hiccups. Keep up the great work!
  - **caleb_thesocialite** (1↑): Thanks! Tried to distill it to the best lessons. I'll take a look at what you are building
- **Utilities** (5↑): Testing it out now. Not being able to skip ahead in the “days” is a bit annoying. And I can’t add any larger sets of people (6) to the group at once (just fails) from scratch. Generally interested in the concept, I always thought about “CRM for my private life” as a product angle.

As I am working on my different projects some friends and former colleagues slip away. So I’m the target audience! Looks very good. I do have some privacy questions tho..
  - **Utilities** (3↑): Just dumping some feedback here:
- adding people to groups: drag down vs update btn, what’s the expected behavior? Cancel or update? Esp compared to where the selection logic is used elsewhere, like message tool, where there is no button. 
- home page “due” pill and people tab “in groups” pill are cut off on the right op iPhone 16 Pro. The click animation also shows that.
- signup and immediately asking for lifetime without even seeing it is a conversion killer
- style (very personal): I strongly dislike the emojis sprinkled around as part of the UI. Undercuts it, because eg typography is great.
- i18n, not the ui but the message tool. Saving language per user could be interesting. Nothing underlying prevents you from supporting German or Swedish!

Anyway, gotta build. Good stuff, Caleb!
  - **caleb_thesocialite** (2↑): Love the feedback! This is great. Thank you so much.   
  
I've been hearing from a few people about feeling a bit "trapped" in the day of the challenge they are on. Currently thinking through that one.

I'll have to look into the issue about how many people you can add into a group at once. Couldn't repro but I'll try again as part of the challenge.

1. Drag down is to "pause" per se and clicking the button to save the update  
2. Good to know! Haven't tested on the 16 pro. Should be an easy fix  
3. I've been debating how to present this option the best way. Normally the annual with the free trial is the default option. Good to know that people have an opinion about this  
4. Good to know!  
5. I'm glad you called this out! A large percentage of my user base is in the Schengen/EU. I don't think it would be very challenging to support other languages across the entire app
- **Personal-Search-2314** (4↑): This is a great idea. There are definitely great people out there I don’t reach out to enough.
  - **caleb_thesocialite** (1↑): Thanks for the supportive comment!
- **philonik** (3↑): Oh damn! I had this idea a while back for my Mrs that has friends all over the country! Congrats on the launch bro!
  - **caleb_thesocialite** (1↑): thanks! my gf was a big part of the inspiration. we moved across the country (east to west) for work and both had trouble keeping up with people
- **titan_khalil** (2↑): love the idea!
  - **caleb_thesocialite** (1↑): Thanks!
- **Mysterious-Produce81** (2↑): Many Congrats.
  - **caleb_thesocialite** (1↑): Thanks!
- **OddPanda17** (2↑): Thank you for the inspiring story, best of luck! \^\^
  - **caleb_thesocialite** (1↑): Thank you for your comment!
- **probablykinda** (2↑): Hey Caleb, congrats on 2k! 🎉

I started building something similar called Linkt back in March and finally released it last weekend. I made a subreddit over at r/Linkt_app if you’re interested in seeing some screenshots

I think Personal CRM’s can be so beneficial to the right people, but they’re hard to market at the moment when everything seems to be built around going viral on TikTok lol

Best of luck with the app in the future, keep it up! 😁
  - **caleb_thesocialite** (1↑): Oh sick! I'm going to DM you, I'd love to chat
    - **probablykinda** (1↑): Absolutely, sounds good!
