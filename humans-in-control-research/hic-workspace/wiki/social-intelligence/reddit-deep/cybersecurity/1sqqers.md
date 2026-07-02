---
id: social-intelligence/reddit-deep/cybersecurity/1sqqers.md
url: "https://www.reddit.com/r/cybersecurity/comments/1sqqers/bored_it_assistant_what_should_i_do/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "Bored IT Assistant - What should I do"
author: "No-Appearance697"
date: "2026-04-20T14:07:47.000Z"
score: 0
upvote_ratio: 0.2
num_comments: 12
flair: "Business Security Questions & Discussion"
extracted_at: "2026-06-20T17:52:50.786Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1sqqers.md#c0"
    char_span: [0, 1107]
    sentence_count: 7
    key_terms: [security, like, cybersecurity, cyber, assistant, barracuda, comments, company]
    concepts: [security, cybersecurity, cyber, assistant, barracuda]
    token_count: 248
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1sqqers/bored_it_assistant_what_should_i_do/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1sqqers.md#c1"
    char_span: [1121, 2153]
    sentence_count: 5
    key_terms: [securitycareeradvice, framework, mysterious-print9737, setup, mammoth-power-3028, like, nist, no-appearance697]
    concepts: [securitycareeradvice, framework, setup]
    section: Comments
    token_count: 253
  - id: "social-intelligence/reddit-deep/cybersecurity/1sqqers.md#c2"
    char_span: [2155, 3779]
    sentence_count: 10
    key_terms: [addendumworking9756, policy, start, m365, defender, document, "that's", genemoody-action1]
    concepts: [addendumworking9756, policy, start, defender, document]
    section: Comments
    token_count: 364
---
# Bored IT Assistant - What should I do

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1sqqers/bored_it_assistant_what_should_i_do/)
Posted by **No-Appearance697** · **0↑** · **12 comments**

I’m a recent cyber security graduate and was recently hired as an IT Assistant based on my degree and project experience.

I work at a medium-sized company where the IT team consists of two internal staff, including myself, plus a third-party provider who originally built the systems and is still involved. My day-to-day work mainly involves end-user support, such as hardware issues, network troubleshooting, and supporting systems like Microsoft 365 and Barracuda.

I do have some free time during the day, and I’d like to use it productively. From what I’ve seen, the company’s cyber security setup is quite minimal, with no EDR, limited documentation, and no formal security policies beyond basic tools like Avast and Barracuda.

I’d like to start applying my cyber security knowledge and add value where I can. What should I focus on first to make a meaningful impact?

## Comments

- **Mysterious-Print9737** (4↑): You're in the perfect spot for building out your resume and I'd suggest starting with a gap analysis. Look at what you have vs a standard framework like CIS or NIST. Make sure you document everything so you can turn a minimap setup into a managed one, for example if you map out the current sprawl and drafta a basic Incident Response Plan. That way you'll prove your value to leadership without immediately needing a big budget.
  - **No-Appearance697** (1↑): I was looking for ISO27001, NIST is pretty much useless as we are based in the UK with business in the US
- **radicalize** (1↑): You could /should also check [r/SecurityCareerAdvice](https://www.reddit.com/r/SecurityCareerAdvice/). This being written, it makes (more) sense to post this kind information /request there, I would think
- **Mammoth-Power-3028** (1↑): If they have minimal policy setup you should go forward and work with any GRC framework like ISO 27001 or SOC 2, create policies and implement controls on the basis of them.

But you know the prerequisite to that would be learning GRC in a practical way.
- **AddendumWorking9756** (1↑): Baseline first: get an EDR trial on Defender for Business free tier, stand up basic logging, lock down the M365 tenant. Then document what's missing in plain english so leadership can budget the fixes. Between tickets run through some investigation scenarios on CyberDefenders so when you start seeing alerts you know what to chase.
  - **No-Appearance697** (1↑): Unfortunately Defender cannot be implemented, as the current AD is not synced to entra, I already mentioned this to my manager but even AD users, usernames and passwords are different from what we have on M365. This because the initial IT guy built a messy system which I suppose they didnt think the company would grow this much
    - **AddendumWorking9756** (1↑): That's a common legacy mess and honestly the cleanup project is your portfolio piece. Start with a drift assessment, identify where AD and M365 diverge then pitch a phased AAD Connect rollout and document every decision. For detection while the sync is broken look at free Sysmon plus Wazuh on the endpoints, that's also good SOC prep.
- **That_Fixed_It** (1↑): With Mythos and GPT-5.4 Cyber finding thousands of software vulnerabilities, I expect patch management to become more important in the near future. Start with anything Internet facing. I use Action1 for Windows PCs.
  - **GeneMoody-Action1** (1↑): Appreciate the shoutout there. 

I would suggest policy, if you are not doing it, you have no policy stating what you do. Nail the policy first the rest is mostly designed.
