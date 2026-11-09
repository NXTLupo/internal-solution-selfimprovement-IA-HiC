---
id: articles/eff-ai/c56fdc8fa6.md
url: "https://www.eff.org/deeplinks/2026/09/cold-take-amazons-new-encryption-method-still-doesnt-deliver-real-privacy"
url_hash: "c56fdc8fa6"
kind: "article"
source: "eff_ai"
title: "Cold TAKE: Amazon's New Encryption Method Still Doesn't Deliver Real Privacy"
author: ""
date: "Fri, 11 Sep 2026 16:56:34 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-10-09T16:54:57.930591+00:00"
chars: 6068
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:54:57.221Z"
relevance: 0
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "e84c1a5466057049"
relevance_by_goal: {"aa6916010743":0}
chunks:
  - id: "articles/eff-ai/c56fdc8fa6.md#c0"
    char_span: [0, 209]
    sentence_count: 1
    key_terms: [cold-take-amazons-new-encryption-method-still-doesnt-deliver-real-privacy, encryption, deeplinks, "amazon's", deliver, "doesn't", privacy, method]
    token_count: 59
    sources: [{"n":"eff_ai","u":"https://www.eff.org/deeplinks/2026/09/cold-take-amazons-new-encryption-method-still-doesnt-deliver-real-privacy","kind":"article","date":"2026-09-11"}]
  - id: "articles/eff-ai/c56fdc8fa6.md#c1"
    char_span: [211, 2801]
    sentence_count: 17
    key_terms: [ring, encryption, video, keys, features, footage, cloud, key]
    concepts: [encryption, video, features, footage, cloud]
    related_chunks: ["articles/eff-ai/c56fdc8fa6.md#c2"]
    token_count: 512
    sources: [{"n":"eff_ai","u":"https://www.eff.org/deeplinks/2026/09/cold-take-amazons-new-encryption-method-still-doesnt-deliver-real-privacy","kind":"article","date":"2026-09-11"}]
  - id: "articles/eff-ai/c56fdc8fa6.md#c2"
    char_span: [2468, 5147]
    sentence_count: 16
    key_terms: [keys, ring, company, video, enforcement, encryption, access, available]
    concepts: [company, enforcement, encryption, video, available]
    related_chunks: ["articles/eff-ai/c56fdc8fa6.md#c1", "articles/eff-ai/c56fdc8fa6.md#c3"]
    token_count: 512
    sources: [{"n":"eff_ai","u":"https://www.eff.org/deeplinks/2026/09/cold-take-amazons-new-encryption-method-still-doesnt-deliver-real-privacy","kind":"article","date":"2026-09-11"}]
  - id: "articles/eff-ai/c56fdc8fa6.md#c3"
    char_span: [4796, 6280]
    sentence_count: 9
    key_terms: [ring, company, encryption, end-to-end, infrastructure, access, enforcement, independent]
    concepts: [company, encryption, end-to-end, infrastructure, access]
    related_chunks: ["articles/eff-ai/c56fdc8fa6.md#c2"]
    token_count: 281
    sources: [{"n":"eff_ai","u":"https://www.eff.org/deeplinks/2026/09/cold-take-amazons-new-encryption-method-still-doesnt-deliver-real-privacy","kind":"article","date":"2026-09-11"}]
---
# Cold TAKE: Amazon's New Encryption Method Still Doesn't Deliver Real Privacy

Source: [eff_ai](https://www.eff.org/deeplinks/2026/09/cold-take-amazons-new-encryption-method-still-doesnt-deliver-real-privacy)

Amazon recently debuted a new feature for its Ring cameras that the company is calling Throw Away the Key Encryption (TAKE). The idea is to cut back on the amount of video content available to the company, and thus potentially available to law enforcement. But while it might technically add a speed bump to accessing full video content, it doesn’t deliver nearly the level of privacy we should be demanding from video doorbells and other security cameras.
TAKE introduces a new way for Ring to manage encryption keys, where the user’s device has its key, then the company holds encryption keys temporarily within its own cloud infrastructure. Ring’s servers receive the keys temporarily so it can offer a variety of the features it says it can’t offer when a user chooses to use end-to-end encryption, like video descriptions, smart alerts, video search, and more, then deletes the key after 24 hours.
This differs from how it works now, where footage is encrypted in transit and at rest, then decrypted by Ring, which always has access to the footage, to process those features.
Comparatively, this is an improvement to the default settings Ring has now, because it at least puts some restrictions on historical footage, but it has some serious holes worth exploring.
Ring Gets Access to Unencrypted Video for a Short Period
Ring has designed its service so many of its camera features, including smart alerts and video search, need cloud processing to work. That means to provide those features, Ring needs to decrypt the footage while it’s stored in Ring’s cloud servers.
With TAKE, in order to decrypt footage to offer these features, Ring gets access to footage stored in the cloud for 24 hours. TAKE adds some small measures using secure enclaves to make base key material harder to directly export, but keys are still released to services that can be modified. With access to the keys, the cloud processing does its thing and delivers the requested feature to the user. The key is then deleted 24 hours later—until the user wants to watch an old video or use other so-called “smart” features, at which point the keys are sent back to the server.
In practice, that makes the system as a whole barely different from encryption at rest where the server holds the keys. The client device essentially takes the place of a hardware security module (HSM), including making those keys available to the server whenever they’re needed. The end result is an improvement from the status quo, but still not even close to the privacy protections of end-to-end encryption.
The company says it does not keep backups of the keys and there’s no way for a Ring employee to access footage. It also claims that any decrypted content is deleted from its servers.
But that doesn’t mean much when user actions send the keys back to the server. And making features like “Video Search” and “Smart Video Descriptions” available to the device owner means that while the footage can’t be seen by Ring, descriptions are readily available to the company. In response to a question about capability, Ring responded to us that, “As Ring continues to expand and further strengthen TAKE's protections, video descriptions will be included.”
Plus, account recovery keys are stored in the camera itself by default. When that’s paired with the fact that currently, indices of video contents are available to the company, it means that TAKE isn’t even a protection against mass surveillance. Law enforcement could request a mass search across cameras for certain terms, then delve into further details by seizing cameras of interest from the device-owner, decrypting account backups, and using that information to decrypt encrypted videos.
Law Enforcement May Still Seek to Compel Access to Footage
Because of the ways the access and key rotations work, it’s technically still possible for Ring to alter its current practice if compelled to do so by law enforcement, in much the same way as other existing encryption-at-rest systems where the company holds the keys. For example, Ring could receive an order that demands they save content encryption keys or unencrypted videos from memory to disk, which would mean they’d retain some level of access.
In an email to EFF, Ring stated, “By design, under TAKE, Ring will not be able to provide encryption keys or decrypted content. With TAKE, Ring will only preserve and provide encrypted video files in response to valid legal process. It has been and continues to be Ring's policy to object to overbroad legal requests.” EFF specifically asked about the possibility of complying with law enforcement orders to modify existing practice to turn over or preserve unencrypted video, which appears to be technically possible, but the company did not address it.
End-to-end encryption works to maintain trust by its user base because the company that employs it never has access to the keys at any point, making it impossible for itself to access the encrypted contents. This also means law enforcement can’t demand the service retain keys or choose not to rotate them. As described, this level of protection isn’t offered with TAKE.
Ultimately, Ring is the one managing this software and its implementation, and beyond a white paper, “trust us” is the only level of verification they’re offering outside observers. While it doesn’t fix the issues, at the bare minimum, the company needs to open the entire infrastructure up to third-party auditors to verify its claims. Ring seems to agree, as they told us that, “Ring conducts rigorous security reviews of all products before launch and critical components of TAKE’s infrastructure underwent independent security testing prior to launch. We are exploring options for further independent review.”
TAKE is not end-to-end encryption, where Ring would never have access to the keys, and the company thankfully doesn’t claim it as such. Ring already offers the option for end-to-end encryption, and turning that on by default would offer the real sorts of privacy improvements we all want from video doorbells.
