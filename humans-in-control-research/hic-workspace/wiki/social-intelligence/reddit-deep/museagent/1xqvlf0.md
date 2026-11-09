---
id: social-intelligence/reddit-deep/museagent/1xqvlf0.md
url: "https://www.reddit.com/r/MuseAgent/comments/1xqvlf0/i_turned_my_2015_iphone_6s_into_an_ai_gadget/"
kind: "social-post"
source: "reddit-deep: r/museagent"
subreddit: "museagent"
title: "I turned my 2015 iPhone 6s into an AI gadget: Meta's Muse Gadget SDK, ported to old iPhones and iPads"
author: "AnalysisFlimsy4661"
date: "2026-11-08T10:40:41.000Z"
score: 1
upvote_ratio: 0.6
num_comments: 4
flair: "Built With Muse"
extracted_at: "2026-11-08T23:01:57.440Z"
extraction_method: "praw-deep"
research_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations\n\nDetermine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.\n\nExplore:\n\nWhich AI platforms students use and pay for\nCareer-related use cases: resumes, job discovery, interview prep, networking, skills development\nMovement from simple prompting toward persistent assistants, agents, memory and connected tools\nExpectations that AI should know their context rather than start from scratch\nDifferences by AI fluency, age, discipline and career stage\n\nSocial listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.\n 3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.\n\n2. Assess the emerging“Bring Your Own AI” model\n\nDetermine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.\n\nSpecifically investigate:\n\nPreference for a personally chosen AI vs. institution-provided assistant\nEvidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products\nWillingness to connect personal AI to trusted institutional services\nExpectations for interoperability, memory, portability and personalization\nAnalogous models emerging in banking, healthcare, commerce and enterprise SaaS\n\nThis directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.\n\nKey output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.\n\n3. Map consumer trust, privacy and control expectations\n\nIdentify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.\n\nFocus on:\n\nWhat information consumers willingly give AI\nWhat information they consider sensitive\nDifferences between AI accessing data and AI writing data back\nExpectations around consent, transparency, memory and deletion\nConcern about universities/employers seeing personal AI interactions\nBehaviors consumers already use to protect themselves\nTrust differences among an institution, an AI provider and a third-party platform\n\nThis addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.\n\nKey output: a consumer AI trust and permission framework that can guide architecture and UX decisions.\n\n4. Identify where proactive AI creates value versus backlash\n\nDetermine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.\n\nAnalyze market reaction to:\n\nAI notifications and nudges\nPersistent memory\nRecommendations based on behavior\nAutonomous task completion\nAI detecting problems before the user asks\nEmotional or motivational interventions\nAI escalating something to a human\n\nThis directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.\n\nKey output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.\n\n5. Define the evolving role of humans in AI-mediated guidance\n\nUnderstand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.\n\nLook comparatively across:\n\nCareer advising\nAcademic advising\nHealthcare navigation\nFinancial advice\nCustomer service\nCoaching and mentoring\n\nStudy the moments when consumers say:\n\n“AI can handle this.”\n\nversus:\n\n“AI can help me prepare, but I want a person making this call.”\n\nThat maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.\n\nKey output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.\n\nThe synthesis question\n\nThese five objectives ladder into one strategic market question:\n\nAs AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
chunks:
  - id: "social-intelligence/reddit-deep/museagent/1xqvlf0.md#c0"
    char_span: [0, 1074]
    sentence_count: 5
    key_terms: [muse, apple, https, com, gadget, iphone, sdk, testflight]
    concepts: [apple, https, gadget, iphone, testflight]
    token_count: 302
    sources: [{"n":"reddit-deep: r/museagent","u":"https://www.reddit.com/r/MuseAgent/comments/1xqvlf0/i_turned_my_2015_iphone_6s_into_an_ai_gadget/","kind":"social-post","date":"2026-11-08","author":"AnalysisFlimsy4661","subreddit":"museagent"}]
  - id: "social-intelligence/reddit-deep/museagent/1xqvlf0.md#c1"
    char_span: [1088, 2842]
    sentence_count: 19
    key_terms: [muse, device, app, data, ios, cifuentes8, whatever, gadgets]
    concepts: [device, cifuentes8, whatever, gadgets, history]
    section: Comments
    token_count: 410
    sources: [{"n":"reddit-deep: r/museagent","u":"https://www.reddit.com/r/MuseAgent/comments/1xqvlf0/i_turned_my_2015_iphone_6s_into_an_ai_gadget/","kind":"social-post","date":"2026-11-08","author":"AnalysisFlimsy4661","subreddit":"museagent"}]
---
# I turned my 2015 iPhone 6s into an AI gadget: Meta's Muse Gadget SDK, ported to old iPhones and iPads

Source: [reddit-deep: r/museagent](https://www.reddit.com/r/MuseAgent/comments/1xqvlf0/i_turned_my_2015_iphone_6s_into_an_ai_gadget/)
Posted by **AnalysisFlimsy4661** · **1↑** · **4 comments**

That old iPhone or iPad Apple stopped updating can now be a Muse gadget, like the ESP32 and Raspberry Pi builds from Meta's open-source SDK, but with no extra hardware. **Pal Again** pairs with Muse once over Bluetooth, then lives on Wi-Fi as Muse's screen, voice, camera and sensors, with chat, an animated avatar and widgets. Tested on an iPhone 6s (iOS 15) and an iPad 6th gen (iPadOS 17). It's open source on [GitHub](https://github.com/exrector/muse-gadget-ios), $1 on the [App Store](https://apps.apple.com/us/app/pal-again/id6830354776) to cover the Apple Developer Program, or free on [TestFlight](https://testflight.apple.com/join/jWYJWgHz). You'll need an SDK token from gadgets.muse.ai and a second phone with Muse. If you like the idea, a repost would mean a lot!

## Comments

- **Cifuentes8** (1↑): Please tell me how I’m not at risk of your app leaking all my data
  - **AnalysisFlimsy4661** (1↑): Fair question, and you shouldn’t have to take my word for it. That’s why the whole thing is open source: https://github.com/exrector/muse-gadget-ios

What it does with your data:

There’s no server of mine. There are no analytics, no ads, no tracking and no account system, so I have nothing to collect your data into. The app talks only to Muse, over the same encrypted gadget protocol (Noise) that Meta’s official SDK uses for ESP32 and Raspberry Pi gadgets.
Secrets stay on the device. Your SDK token and pairing credentials are kept in the iOS Keychain and never written to logs. Chat history stays on the device. iCloud sync is optional, and it goes to your own iCloud.
Muse can’t do whatever it wants on the device. There’s no shell and no file access. Muse gets a short fixed list of commands, such as showing a card, speaking or reading the battery. Camera, mic and location work only if you grant the iOS permission. Each new Shortcut or local-network device needs a tap on the screen first.
You can cut it off at any time. Revoke the token at gadgets.muse.ai, take back the permissions in iOS Settings, or clear history and pairing inside the app.

One honest caveat: whatever you send to Muse (messages, photos, voice) goes to Muse, the same as with any Muse gadget, and Meta’s privacy policy covers it there. Pal Again doesn’t add another party in between.

If you’d like to check this yourself, the privacy policy and SECURITY.md are short reads, and the command list shows everything Muse is able to call. Happy to answer anything specific.
    - **Cifuentes8** (1↑): Thank you! Would there be an Android App as well?
