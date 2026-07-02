---
id: social-intelligence/reddit-deep/cybersecurity/1tk9mel.md
url: "https://www.reddit.com/r/cybersecurity/comments/1tk9mel/cyber_insurance_actuary_looking_for_educational/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "Cyber Insurance Actuary Looking for Educational Resources"
author: "Bad_Actuary"
date: "2026-05-22T05:38:26.000Z"
score: 6
upvote_ratio: 0.8
num_comments: 8
flair: "Business Security Questions & Discussion"
extracted_at: "2026-06-20T17:52:50.783Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1tk9mel.md#c0"
    char_span: [0, 1610]
    sentence_count: 10
    key_terms: [cybersecurity, "i'm", insurance, looking, cyber, actuary, educational, like]
    concepts: [cybersecurity, insurance, looking, cyber, actuary]
    token_count: 328
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1tk9mel/cyber_insurance_actuary_looking_for_educational/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1tk9mel.md#c1"
    char_span: [1624, 3709]
    sentence_count: 14
    key_terms: [encrypted, file, security, blueteamsec, like, otherwise, technical, notpetya]
    concepts: [encrypted, security, blueteamsec, otherwise, technical]
    section: Comments
    token_count: 491
  - id: "social-intelligence/reddit-deep/cybersecurity/1tk9mel.md#c2"
    char_span: [3711, 4705]
    sentence_count: 9
    key_terms: [general, compliance, technical, topics, brick, paper, route, cant]
    concepts: [general, compliance, technical, topics, brick]
    section: Comments
    token_count: 224
---
# Cyber Insurance Actuary Looking for Educational Resources

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1tk9mel/cyber_insurance_actuary_looking_for_educational/)
Posted by **Bad_Actuary** · **6↑** · **8 comments**

Hello,

I'm an actuary at an insurance company that writes cyber insurance for businesses. I'm looking for some cybersecurity educational resources.

We cover things like lost revenue due to outages, legal liability for data breaches, investigation/response/data restoration costs from ransomware attacks, etc. My work involves setting cyber insurance prices and catastrophe modeling. Think quantifying the insured losses of a 10x-NotPetya event or a multi-day AWS outage on a book of cyber policies, similar to how a property actuary models hurricane exposure.

I have a solid understanding of the insurance aspect of the role, but I'm lacking in my undressing of the underlying cybersecurity fundamentals. Things like: how threat actors infiltrate networks, what recovery from a ransomware attack actually looks like end-to-end, what separates a well-secured company from a poorly-secured one, how critical vulnerabilities are actually exploited, etc.

I'm not looking to become a full-time cybersecurity professional, so I'm not looking for something overly technical, and I don't require a certification or credential (but I'm not opposed to this if it is the best path). Really I'm likely looking for something in between podcasts/Youtube video explanations and a full on undergrad/masters degree.

Any advice and recommendations are appreciated!

## Comments

- **stacksmasher** (4↑): Seriously? How about you pay me $300/Hr because that type of info is worth a ton of money if it's actually correct.
- **makedonc** (2↑): For encrypted file sharing, the architecture matters more than the marketing. You want:

- Client-side encryption (file encrypted before upload, not server-side)
- Key never sent to server (URL fragment or manual key exchange)
- No account required for recipient (massive friction otherwise)
- Auto-expiry (files shouldn't live forever)

Lots of services claim "encrypted" but mean TLS in transit. That's table stakes - it encrypts the connection, not the file.
- **Oompa_Loompa_SpecOps** (2↑): If your org can survive regulating the damages of a 10x notpetya event then congratulations, you are like MunichRE after the San Francisco earthquake.

I think war stories could be a good start. What did actual incidents look like, how large was the blast radius, in which way did it differ from what was expected? From there you can walk back to technical and organisational root causes as much as seems to be useful to you.

I don't have a ton of resources, but this talk has some lines about how getting hit by notpetya felt on the inside, might be the kind of content you are looking for:

https://youtu.be/erJoeVPeRrs
- **3rrr0r** (1↑): For educational purposes to understand how a attack works you need some technical expertise. Otherwise it will always be only very general like "user executed malicious file -> PC compromised -> Data exfiltrated -> Lateral movement -> ..."

A starting point is reading here in r/cybersecurity and r/blueteamsec. Blueteamsec is more focusing on the defender-side part of the job with a lot of reading material on how attacks happen. Also the [OWASP Top 10](https://owasp.org/www-project-top-ten/) could be a starting point for application security. For general infrastructure security you could look at your corresponding goverment. NIST (USA), ENISA (EU), BSI (Germany), NCSC (UK), ACSC (Australia), CCCS (Canada), all publish papers with what is up to date security. Very paper heavy. 

Also a general cybersecurity course with the general topics could be a good starting point. Legal side, comon attack patterns, vulnerability management, etc. Nothing to deep just a general overview.

You have tow options: Go the technical route or go the compliance route. Compliance is relying on paper, that everything is in order. Technical expertise is understanding what this paper translates to do.
- **Derpolium** (1↑): Your free piece of advice is to go bone up on RMF and NIST guidance and translate the information the to business impact. More verbose output currently locked behind pay wall
- **bhaugli** (1↑): I've out together videos on different cyber topics.  Worth a view  

https://youtube.com/@sidechannel
- **Fine_League311** (0↑): First: Learn Security Concepts

THan:

CLI -> Than

* IT Support / Help Desk Technics
* be a junior Systems Administrator @ home 😃
* Network Administratation

And brick/Kill your first home lab! If you cant brick you cant open or secure a door
