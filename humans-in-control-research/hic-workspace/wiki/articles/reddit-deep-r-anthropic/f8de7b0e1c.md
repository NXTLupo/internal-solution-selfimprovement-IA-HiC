---
id: articles/reddit-deep-r-anthropic/f8de7b0e1c.md
url: "https://www.reddit.com/r/Anthropic/comments/1skwgfl/i_used_claude_to_help_me_build_an_apple_watch_app/"
url_hash: "f8de7b0e1c"
kind: "article"
source: "Reddit Deep: r/anthropic"
title: "I used Claude to help me build an Apple Watch app to track caffeine half life and it’s gotten 2,500 downloads and made $700 in revenue so far"
author: ""
date: "2026-04-14T02:56:07.000Z"
tier: 
method: "source-native"
extracted_at: "2026-05-11T17:32:57.971371+00:00"
chars: 2521
industries: [ai_research, enterprise_it, education]
industry_method: llm
chunks:
  - id: "articles/reddit-deep-r-anthropic/f8de7b0e1c.md#c0"
    char_span: [0, 1792]
    sentence_count: 13
    key_terms: [claude, app, apple, anthropic, caffeine, native, completely, management]
    token_count: 383
  - id: "articles/reddit-deep-r-anthropic/f8de7b0e1c.md#c1"
    char_span: [1794, 2808]
    sentence_count: 5
    key_terms: [caffeine, pythononrailz, pseudorep, sensitive, awesome, drink, great, app]
    token_count: 264
---
# I used Claude to help me build an Apple Watch app to track caffeine half life and it’s gotten 2,500 downloads and made $700 in revenue so far

Source: [Reddit Deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1skwgfl/i_used_claude_to_help_me_build_an_apple_watch_app/)

Hey r/Anthropic

I am a software engineering student and I wanted to share a milestone I just hit using Claude as my main pair programmer. My app Caffeine Curfew just crossed 2,500 downloads and 700 dollars in revenue.

Since this is a developer community, I wanted to talk about how Claude actually handled the native iOS architecture. The app is a caffeine tracker that calculates metabolic decay, built completely in SwiftUI and relying on SwiftData for local storage.

Where Claude really shined was helping me figure out the complex state management. The absolute biggest headache of this project was getting a seamless three way handshake between the Apple Watch, the iOS Home Screen widgets, and the main app to update instantly. Claude helped me navigate the WidgetKit and SwiftData sync without breaking the native feel or causing memory leaks.

It also helped me wire up direct integrations with Apple Health and Siri so the logging experience is completely frictionless. For any solo devs here building native apps, leaning on Claude for that architectural boilerplate and state management was a massive boost to my shipping speed.

I am an indie dev and the app has zero ads. If anyone is curious about the UI or wants to see how the sync works in production, drop a comment below and I will send you a promo code for a free year of Pro. 

I am also happy to answer any questions about how I prompted Claude for the Swift code.

Link:

https://apps.apple.com/us/app/caffeine-curfew/id6757022559

--- TOP COMMENTS ---
[55↑ pseudorep] I downloaded your app when you first posted it - I’ve used it a few times (as I can be sensitive to caffeine) and I wish to say it is great, you have done a fantastic job!
[12↑ pythononrailz] Thank you so much, that genuinely means a lot. I’m really glad it’s been helpful for you, especially since you’re sensitive to caffeine. I’ve put a lot into it, so hearing this from someone who actually uses the app is awesome.
[5↑ pseudorep] The only thing I would suggest as a feature (might be available on the phone but I use the watch to add) is being able to adjust the time the drink registers from. Sometimes I’ll forget to log the coffee at the time I drink it. It’s a minor thing, but then the caffeine tracker is a few mins to hours behind depending on how late I tracked it.
[2↑ dooperma] Challenge accepted.
[14↑ philokingo] great idea! now onto alcohol lol
[3↑ pythononrailz] Lmao
[4↑ el_cul] weeeed
[9↑ BoltSLAMMER] awesome! how much of the code did you touch yourself?
