---
id: social-intelligence/reddit-deep/gemini/1ksv5wp.md
url: "https://www.reddit.com/r/Gemini/comments/1ksv5wp/mixed_experience_with_passkey_and_suggestion_for/"
kind: "social-post"
source: "reddit-deep: r/gemini"
subreddit: "gemini"
title: "Mixed experience with passkey and suggestion for final configuration"
author: "rocket_9"
date: "2025-05-22T16:31:24.000Z"
score: 6
upvote_ratio: 0.81
num_comments: 10
flair: "Discussion :Discussion:"
extracted_at: "2026-05-11T16:52:32.578Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [financial_services]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/gemini/1ksv5wp.md#c0"
    char_span: [0, 2582]
    sentence_count: 14
    key_terms: [passkey, account, security, settings, passwords, sign, considering, experience]
    token_count: 501
  - id: "social-intelligence/reddit-deep/gemini/1ksv5wp.md#c1"
    char_span: [2597, 3111]
    sentence_count: 2
    key_terms: [passkey, infinitecontrol9574, key, indefinitely, specifically, generation, answering, presented]
    section: Comments
    token_count: 127
---
# Mixed experience with passkey and suggestion for final configuration

Source: [reddit-deep: r/gemini](https://www.reddit.com/r/Gemini/comments/1ksv5wp/mixed_experience_with_passkey_and_suggestion_for/)
Posted by **rocket_9** · **6↑** · **10 comments**

I was surprised to receive an email indicating the need to establish a passkey with such a short deadline and minimal explanation relative to configuration options. I am not a huge fan of the passkey concept, when implemented as a turn key single sign in action.

After multiple failed attempts on a Mac, I was able to establish a passkey. But it would fail on subsequent sign in attempts, requiring a fall back to conventional username password. Fearing a loss of account access post the deadline enforcement, I migrated most assets off ( I had recently moved some in anticipating the current market direction). In this case, the passkey did work for verification of transfers.

*After investigating account settings, clearing out browser cache for gemini, and further considering sign on security I have the following suggestions for setup:*

* **If you have a tendency to use simple passwords or reuse passwords**, consider using the full single step passkey experience. This will be the default account setup once you successfully establish a passkey. My personal opinion is the single sign on can have security weaknesses depending on passkey authentication methods and device settings, but is much improved over poor password hygiene.

* **If you want an experience similar to conventional two factor (2FA) services (Authy, Google Authenticator)**, disable the sign in with Passkey option under Account Settings> Security. This will keep the passkey as a 2FA method only, under Account Security settings, and require a traditional username and password entry before prompting for the passkey. I recommend considering this setup if you are using strong passwords that are unique for each third party login account. And potentially better, keep passwords managed under a different software service/ecosystem than the passkey storage.

There is no perfect solution for any 2FA model, particularly when considering "wrench attacks" or tradeoffs for adding another vector of intercept. But I prefer security diversity in device and service provider over consolidated conveniences, based on first hand experiences in cybersecurity technology development and product management.

I am also keeping assets off the exchange until the passkey deadline passes, and I can re-confirm the settings above continue to function correctly.

## Comments

- **Lost_Success_161** (1↑): When setting up your passkey was there an option to use a security key/yubikey as the passkey?
  - **rocket_9** (2↑): There was a prompt to select other devices from the OS passkey generation service, but I don't recall if it presented a hardware based key specifically.
- **InfiniteControl9574** (1↑): I made the mistake to setup the passkey (face id) and now all funds are stuck in a "verify its you page". Gemini stole my money basically indefinitely and is not answering to emails.
