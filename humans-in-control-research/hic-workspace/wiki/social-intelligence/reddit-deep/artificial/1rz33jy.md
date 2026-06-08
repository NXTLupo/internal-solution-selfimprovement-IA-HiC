---
id: social-intelligence/reddit-deep/artificial/1rz33jy.md
url: "https://www.reddit.com/r/artificial/comments/1rz33jy/anthropics_claude_code_had_a_workspace_trust/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "Anthropic's Claude Code had a workspace trust bypass (CVE-2026-33068). Not a prompt injection or AI attack. A configuration loading order bug. Fixed in 2.1.53."
author: "cyberamyntas"
date: "2026-03-20T17:47:02.000Z"
score: 12
upvote_ratio: 0.93
num_comments: 11
flair: "Discussion"
extracted_at: "2026-05-11T17:27:04.763Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1rz33jy.md#c0"
    char_span: [0, 1629]
    sentence_count: 14
    key_terms: [configuration, claude, trust, workspace, security, cve-2026-33068, attack, raxe-2026-040]
    token_count: 387
  - id: "social-intelligence/reddit-deep/artificial/1rz33jy.md#c1"
    char_span: [1644, 3058]
    sentence_count: 14
    key_terms: [definetlyrandom, config-before-trust-dialog, code, interesting, arbitrary, executing, workspace, settings]
    section: Comments
    token_count: 338
---
# Anthropic's Claude Code had a workspace trust bypass (CVE-2026-33068). Not a prompt injection or AI attack. A configuration loading order bug. Fixed in 2.1.53.

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1rz33jy/anthropics_claude_code_had_a_workspace_trust/)
Posted by **cyberamyntas** · **12↑** · **11 comments**

An interesting data point in the AI safety discussion: Anthropic's own Claude Code CLI tool had a security vulnerability, and it was not an AI-specific attack at all.
    
    
    CVE-2026-33068 (CVSS 7.7 HIGH) is a workspace trust dialog bypass in Claude Code versions prior to 2.1.53. A malicious repository could include a 
    `.claude/settings.json`
     file with 
    `bypassPermissions`
     entries that would be applied before the user was shown the trust confirmation dialog. The root cause is a configuration loading order defect, classified as CWE-807: Reliance on Untrusted Inputs in a Security Decision.
    
    
    This is worth discussing because it illustrates that the security challenges of AI tools are not limited to novel AI-specific attack classes like prompt injection. AI tools are software, and they inherit every category of software vulnerability. The trust boundary between "untrusted repository" and "approved workspace" was broken by the order in which configuration was loaded. This same class of bug has existed in IDEs, package managers, and build tools for years.
    
    
    Anthropic fixed it promptly in version 2.1.53.

Full advisory: [https://raxe.ai/labs/advisories/RAXE-2026-040](https://raxe.ai/labs/advisories/RAXE-2026-040)

## Comments

- **ultrathink-art** (3↑): This is the same supply-chain attack surface as malicious package.json scripts or Makefile targets that execute on tab-complete. LLM tool configs are just another place it can live now. Clone with caution applies regardless of whether AI is involved.
- **BreizhNode** (1↑): Good framing. The config-before-trust-dialog issue is basically the same pattern we saw with VS Code workspace settings executing arbitrary code years ago. AI tools are inheriting all the old supply chain problems plus adding new ones. The interesting question is whether AI tool vendors will learn from those lessons or repeat them.
  - **definetlyrandom** (1↑): Bot?
- **Joozio** (1↑): Good framing. The config-before-trust-dialog is the same class of issue as VS Code workspace settings executing arbitrary code years ago. AI tools inherit all the old supply chain attack surfaces plus add new ones. The interesting part is how fast Anthropic patched it. That response time matters more than the bug existing in the first place.
  - **definetlyrandom** (1↑): Bot?
- **definetlyrandom** (1↑): Nice botting!
- **demogoran** (1↑): Meanwhile opencode:


May I read .env?
No, never do it!
OK, I will run bash or any code to read some files(oooopai, how .env is there too?)




Or cursor.
Do you have access to this folder?
No, it gitignored
Please find string in this folder
Oki, there are files you're looking for!
