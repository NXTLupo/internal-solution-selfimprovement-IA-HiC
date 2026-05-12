---
url: "https://www.reddit.com/r/deeplearning/comments/1qqzjbz/i_spent_6_months_mapping_100k_multiturn_agentic/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "I spent 6 months mapping 100k \"multi-turn\" agentic jailbreaks. Here’s what I learned about the \"Context Injection\" loophole."
author: "Quirky-Ad-3072"
date: "2026-01-30T08:07:42.000Z"
score: 18
upvote_ratio: 0.8
num_comments: 14
flair: ""
extracted_at: "2026-05-11T17:26:50.052Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# I spent 6 months mapping 100k "multi-turn" agentic jailbreaks. Here’s what I learned about the "Context Injection" loophole.

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1qqzjbz/i_spent_6_months_mapping_100k_multiturn_agentic/)
Posted by **Quirky-Ad-3072** · **18↑** · **14 comments**

Most people think prompt injection is just one-liners like "ignore previous instructions." It’s not.
After generating and analyzing over 100,000 adversarial sessions, I’ve found that the most successful "jailbreaks" (especially in agentic workflows) happen around Turn 8 to Turn 11. Attackers aren't just hitting the guardrail; they are "steering" the model's internal attention mechanism through a long-form conversation.
Key Findings from the 100k Trace Dataset:
Unicode Smuggling: Using zero-width characters to hide malicious intent within "safe" code blocks (bypasses most regex filters).
Context Exhaustion: Pushing the model to its context limit so it "forgets" its system instructions but remembers the attacker's payload.
Solidity Assembly Tricks: Hiding logic flaws inside assembly { } blocks that look like standard optimization but contain backdoors.
I've documented the forensic schema for these attacks (21 fields including IP hashes, session IDs, and attack depth). I'm looking for feedback from other red-teamers and AI safety researchers on these patterns.
I’m happy to share a 200-row sample (.jsonl) with anyone who wants to stress-test their own guardrails or filters. Just comment "SAMPLE" or drop a DM, and I'll send the link. Currying no favor, just looking to see if these patterns hold up against your current production models.

## Comments

- **Top_Locksmith_9695** (1↑): SAMPLE and thanks 😃
- **DrDoomC17** (1↑): SAMPLE
- **wierdloop** (1↑): SAMPLE
- **vagueinquietude** (1↑): SAMPLE
- **Objective-Searching** (1↑): Sample
- **idesireawill** (1↑): SAMPLE
- **Ok_Green7154** (1↑): SAMPLE
- **solilobee** (1↑): interesting work\~! sample please
- **AVX_Instructor** (1↑): Interesting work, I want see sample
- **Various-Fun-978** (1↑): SAMPLE and thx 🙏
