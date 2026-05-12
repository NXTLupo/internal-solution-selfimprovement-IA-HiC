---
url: "https://www.reddit.com/r/Anthropic/comments/1skwgfl/i_used_claude_to_help_me_build_an_apple_watch_app/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "I used Claude to help me build an Apple Watch app to track caffeine half life and it’s gotten 2,500 downloads and made $700 in revenue so far"
author: "pythononrailz"
date: "2026-04-14T02:56:07.000Z"
score: 652
upvote_ratio: 0.95
num_comments: 118
flair: "Other"
extracted_at: "2026-05-11T17:26:51.919Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# I used Claude to help me build an Apple Watch app to track caffeine half life and it’s gotten 2,500 downloads and made $700 in revenue so far

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1skwgfl/i_used_claude_to_help_me_build_an_apple_watch_app/)
Posted by **pythononrailz** · **652↑** · **118 comments**

Hey r/Anthropic

I am a software engineering student and I wanted to share a milestone I just hit using Claude as my main pair programmer. My app Caffeine Curfew just crossed 2,500 downloads and 700 dollars in revenue.

Since this is a developer community, I wanted to talk about how Claude actually handled the native iOS architecture. The app is a caffeine tracker that calculates metabolic decay, built completely in SwiftUI and relying on SwiftData for local storage.

Where Claude really shined was helping me figure out the complex state management. The absolute biggest headache of this project was getting a seamless three way handshake between the Apple Watch, the iOS Home Screen widgets, and the main app to update instantly. Claude helped me navigate the WidgetKit and SwiftData sync without breaking the native feel or causing memory leaks.

It also helped me wire up direct integrations with Apple Health and Siri so the logging experience is completely frictionless. For any solo devs here building native apps, leaning on Claude for that architectural boilerplate and state management was a massive boost to my shipping speed.

I am an indie dev and the app has zero ads. If anyone is curious about the UI or wants to see how the sync works in production, drop a comment below and I will send you a promo code for a free year of Pro. 

I am also happy to answer any questions about how I prompted Claude for the Swift code.

Link:

https://apps.apple.com/us/app/caffeine-curfew/id6757022559

## Comments

- **pseudorep** (55↑): I downloaded your app when you first posted it - I’ve used it a few times (as I can be sensitive to caffeine) and I wish to say it is great, you have done a fantastic job!
  - **pythononrailz** (12↑): Thank you so much, that genuinely means a lot. I’m really glad it’s been helpful for you, especially since you’re sensitive to caffeine. I’ve put a lot into it, so hearing this from someone who actually uses the app is awesome.
    - **pseudorep** (5↑): The only thing I would suggest as a feature (might be available on the phone but I use the watch to add) is being able to adjust the time the drink registers from. Sometimes I’ll forget to log the coffee at the time I drink it. It’s a minor thing, but then the caffeine tracker is a few mins to hours behind depending on how late I tracked it.
  - **dooperma** (2↑): Challenge accepted.
- **philokingo** (14↑): great idea! now onto alcohol lol
  - **pythononrailz** (3↑): Lmao
    - **el_cul** (4↑): weeeed
- **BoltSLAMMER** (9↑): awesome! how much of the code did you touch yourself?
  - **pythononrailz** (14↑): Actually quite a bit on this project. My goal was to learn the MVVM architecture with this app & long term I want to be an iOS engineer ( idk if it’s even possible these days )… I  struggled getting the three way sync & a lot of the app intent integrations ( Siri etc ) & Claude code came clutch for that.
  - **pythononrailz** (1↑): Also thank you!
- **Mammoth-Error1577** (6↑): The development barrier to entry is so low now for a project like this, which is amazing. But the app store barrier seems significant if you're just doing it for fun, rather than trying to make a career out of it. This is probably not an ideal question for you given light overall experience, however you've literally just taken an idea and turned it into revenue for the first time so perhaps you're the ideal person to ask.

The idea of having to create an LLC and get a business mailing address and pay app store fees and do marketing all for a just for fun project seems like a lot. Was that what you did here?
  - **pythononrailz** (9↑): Yeah honestly I kept it pretty simple. I didn’t make an LLC or get a business address or anything like that. I just enrolled in the Apple Developer Program as an individual and shipped it.

The main barrier was really just the $99 App Store fee, app review, and learning all the App Store stuff as I went. Definitely more friction than just building for fun, but not nearly as intense as setting up a whole business from day one.
    - **crazzzone** (9↑): And then someone used your app to figure out how much caffeine was safed and then they died and then their family sued you and you don't have an LLC so they took your house.

Story as old as time.

Please protect yourself brother
  - **Ecsta** (2↑): I made a small app to solve a local headache. Programming + building + designing the app took ~3 months. Waiting for Carplay approval took 6 months. Getting the app ready for submission (ie all paperwork/documents) took like a month of off and on effort. I saw everyone complaining about approvals but I got my app approved on the first submission.

It's not hard there's just a lot of boxes to check.
    - **pythononrailz** (1↑): Apple has been known to be a pain when it comes to App Store approval lately, but I agree if you have all your ducks in a row and are diligent about it. You usually pass the first or second time.
- **pythononrailz** (3↑): Please feel free to ask any questions on the code, marketing, anything :)
  - **Super-Commercial6445** (2↑): Did you do any other forms of marketing other than just Reddit?
I’d like to know where you think you got most of your customers from?
    - **pythononrailz** (1↑): Reddit and experimented with tik tok, instagram, YouTube shorts, etc. I think Reddit is the best place for direct feedback and talking to users directly and validating a product. I think the short form video content is harder to crack, but has a larger upside. My analytics tell me where users are coming from.
  - **deleted-account69420** (4↑): Can I remake it and ship it for free?
    - **pythononrailz** (13↑): It’s a free country sir
  - **Chrisgpresents** (2↑): I’m really impressed:) I was wondering how one accomplishes such a task? I have no code background at all.. I was wondering how would you point me in a first step if I wanted to make an Apple Watch app that takes hrv levels throughout the day and night to predict a person’s energy levels the next day? Almost like energy points. 

Over simplified, but this is for a specific chronic illness
    - **pythononrailz** (3↑): Thank you :) with no coding background, I’d honestly start smaller than the full prediction engine.

I’d first make a very simple Apple Watch/iPhone app that can read HRV from HealthKit and display it cleanly over time. Once that works, then I’d layer on the energy points score and test whether it actually matches real life.

The biggest thing is starting with data collection first, prediction second.Awesome idea for sure.
  - **[deleted]** (1↑): "marketing" is you spamming reddit?
    - **pythononrailz** (2↑): Tactile spamming 😉( aka marketing )
- **sQeeeter** (3↑): Hey siri - if I drink three Panera Bread lemonades, how many days before I go to sleep? 🤣
  - **pythononrailz** (2↑): Lmao three Panera charged lemonades is a boss battle
- **whoisyb** (2↑): Man, this is dope af. Wow. Thank you!
  - **pythononrailz** (1↑): Bro, thank you! I’ll shoot you a message.
- **Jason-Griffin** (2↑): Cool! Good job! Curious how long this took you?
  - **pythononrailz** (1↑): I think the initial build took about a month & a half and since then I’ve been taking feedback & iterating for about 3 months. It’s definitely a passion project & I think almost everyone in this sub shares the love of building software.
    - **Jason-Griffin** (2↑): I just downloaded it and it’s a little buggy when you try and edit the drinks. It wants tries to add a new one when I click confirm and then the UI kind of bounces left and right.
- **Raunhofer** (2↑): No ads, I updoot.
  - **pythononrailz** (1↑): Respect 🫡
- **omgtmilol** (2↑): I am interested in learning more about how you prompted CC to develop this app. I’m about to start on my first Swift app and have a Claude Pro subscription I’ve been using for Azure App Services development. Any advice is greatly appreciated. I will also download your app and check it out. Can’t promise to reduce my caffeine intake, but I will try my best.
  - **pythononrailz** (2↑): haha fair enough. Some advice if you are not familiar with code at all. Prompt Claude to apply “Solid” software engineering practices to create a modular & maintainable codebase. This will help, if you ever need to have someone help you with debugging. I would still learn the basics of how swift data & swift UI works, how to instantiate a class, call a function. I’m not saying be a professional programmer, but this will give you more autonomy in your codebase.
