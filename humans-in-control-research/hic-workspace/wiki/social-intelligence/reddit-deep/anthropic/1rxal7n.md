---
id: social-intelligence/reddit-deep/anthropic/1rxal7n.md
url: "https://www.reddit.com/r/Anthropic/comments/1rxal7n/skill_md_file_to_scan_mac_outlook_emails_with/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "Skill md file to scan Mac Outlook emails with Claude Code, no admin permissions or API access needed."
author: "coolreddy"
date: "2026-03-18T17:39:18.000Z"
score: 22
upvote_ratio: 0.97
num_comments: 20
flair: "Improvements :upvote:"
extracted_at: "2026-05-11T17:26:51.913Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, enterprise_it]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/anthropic/1rxal7n.md#c0"
    char_span: [0, 2145]
    sentence_count: 15
    key_terms: [accessibility, outlook, outlook-email-scanner, api, claude, skill, permissions, https]
    token_count: 505
  - id: "social-intelligence/reddit-deep/anthropic/1rxal7n.md#c1"
    char_span: [2147, 2378]
    sentence_count: 2
    key_terms: [outlook, outlook-email-scanner, github, attachment, arkya-ai, download, licensed, visible]
    token_count: 61
  - id: "social-intelligence/reddit-deep/anthropic/1rxal7n.md#c2"
    char_span: [2393, 4413]
    sentence_count: 6
    key_terms: [outlook, accessibility, win32com, inbox, windows, msg, client, import]
    section: Comments
    token_count: 472
  - id: "social-intelligence/reddit-deep/anthropic/1rxal7n.md#c3"
    char_span: [4419, 6383]
    sentence_count: 11
    key_terms: [outlook, write, com, automation, msg, api, direct, option]
    section: Comments
    token_count: 455
  - id: "social-intelligence/reddit-deep/anthropic/1rxal7n.md#c4"
    char_span: [6385, 8248]
    sentence_count: 12
    key_terms: [personal, coolreddy, "it's", cool, drewhouser, catalyst, alzeric, company]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/anthropic/1rxal7n.md#c5"
    char_span: [7947, 8470]
    sentence_count: 1
    key_terms: [frontmost, catalyst, like, axidentifier, everything, screenshot, afternoon, different]
    section: Comments
    token_count: 114
---
# Skill md file to scan Mac Outlook emails with Claude Code, no admin permissions or API access needed.

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1rxal7n/skill_md_file_to_scan_mac_outlook_emails_with/)
Posted by **coolreddy** · **22↑** · **20 comments**

Have been using outlook but IT won't enable Microsoft Graph API access, so I can't connect email to Claude or any AI tool. Got tired of copy-pasting emails, so I [built a scanner](https://github.com/Arkya-AI/outlook-email-scanner) that reads Outlook directly through the macOS Accessibility API.

What it does:

* Connects to the running Outlook app via the macOS accessibility tree (atomacos)
* Reads your inbox — subject, sender, recipients, date, full body
* Saves each email as a clean markdown file to \~/Desktop/outlook-emails/
* Handles multiple accounts — switches between them automatically via the sidebar
* Deduplicates, so re-running won't create duplicates
* \~500x faster than screenshot-based automation and costs $0 (no API calls)

Using it with Claude Code:

The repo includes a [SKILL.md](https://github.com/Arkya-AI/outlook-email-scanner) file. Copy it to \~/.claude/skills/outlook-email-scan/ and just tell Claude "check my inbox" or "scan my outlook." The skill auto-clones the repo and installs dependencies on first run, no manual setup beyond copying the skill file and granting Accessibility permissions.

Setup:

1. Copy [SKILL.md](https://github.com/Arkya-AI/outlook-email-scanner) to \~/.claude/skills/outlook-email-scan/
2. Grant Accessibility permissions to your terminal or AI coding tool (System Settings > Privacy & Security > Accessibility). This single toggle covers both reading Outlook's UI and mouse control for scrolling/account switching
3. Have Outlook open
4. Say "check my inbox" and it handles the rest

Why Accessibility API instead of screenshots/OCR?

I tried the screenshot + Vision API approach first. It worked but was slow (\~$0.80 per scan in API costs, took minutes). The accessibility tree approach reads the UI directly - same data, zero cost, 25-120 seconds depending on inbox size.

Limitations:

* macOS only
* Outlook for Mac only (tested on 16.x)
* No attachment download yet (text only)
* Outlook needs to be open and visible

[GitHub Repo Here](https://github.com/Arkya-AI/outlook-email-scanner)

MIT licensed. PRs welcome.

## Comments

- **Adeian** (7↑): I'm looking for this too but a windows version. One of these days.   :)
  - **Chronicles010** (2↑): # Windows Alternatives to macOS Outlook Accessibility Scanning

Great project! On Windows you actually have **better** options than accessibility scraping, because Outlook for Windows exposes a full COM automation API.

# Option 1: Outlook COM Automation (best option)

Outlook for Windows has a rich COM object model you can script directly with Python via `win32com`:

    import win32com.client
    outlook = win32com.client.Dispatch("Outlook.Application")
    inbox = outlook.GetNamespace("MAPI").GetDefaultFolder(6)  # 6 = inbox
    for msg in inbox.Items:
        print(msg.Subject, msg.SenderEmailAddress, msg.Body)

This is **far superior** to accessibility scraping because:

* **Direct data access** — no UI parsing, no element tree walking
* **Works in background** — Outlook can be minimized, no need for it to be visible
* **Full object model** — attachments, folders, categories, flags, everything
* **No special permissions** — no accessibility toggle needed
* **Stable API** — doesn't break when Microsoft updates the UI (it's been stable since Outlook 97)

# Setup

1. Install `pywin32`: `pip install pywin32`
2. Have Outlook installed and signed in
3. Run the script — that's it

# Reading full inbox to markdown (same output as the macOS tool)

    import win32com.client
    import os
    from datetime import datetime
    
    outlook = win32com.client.Dispatch("Outlook.Application")
    namespace = outlook.GetNamespace("MAPI")
    inbox = namespace.GetDefaultFolder(6)
    
    output_dir = os.path.expanduser("~/Desktop/outlook-emails")
    os.makedirs(output_dir, exist_ok=True)
    
    for msg in inbox.Items:
        safe_subject = "".join(c if c.isalnum() or c in " -_" else "_" for c in msg.Subject)
        filename = f"{safe_subject[:80]}.md"
        filepath = os.path.join(output_dir, filename)
    
        if os.path.exists(filepath):
            continue  # dedup
    
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# {msg.Subject}\n\n")
            f.write(f"**From:** {msg.SenderEmailAddress}\n\n")
            f.write(f"**Date:** {msg.ReceivedTime}\n\n")
            f.write(f"**To:** {msg.To}\n\n")
            f.write(f"---\n\n")
            f.write(msg.Body)

# Option 2: UI Automation (direct equivalent of the macOS approach)

If COM doesn't work for some reason, Windows has **UI Automation (UIA)** — the direct analog to macOS `atomacos`. Libraries:

* **pywinauto** — most popular, good docs
* **uiautomation** — lighter weight
* **accessible** — newer option

Same concept: walk the accessibility tree of the running Outlook window, read elements. But honestly, COM is better in every way on Windows — UI Automation is the fallback, not the first choice.

# Option 3: MAPI Direct Access

Libraries like `redemption` or `mapi33` can talk to the MAPI messaging layer directly, bypassing even the Outlook application. Overkill for most use cases but worth knowing about.

# Why COM works when Graph API doesn't

The reason IT blocks Graph API but COM still works:

* **Graph API** requires an Azure AD app registration — that's an org-level admin decision. IT has to explicitly grant your app permissions to read mail.
* **COM automation** just talks to the locally installed Outlook process using your existing login session. No admin approval needed. It's the same access level as you opening Outlook and reading your own email.

This is why VBA macros in Outlook have worked for 25+ years without IT involvement — same API, different language.

# Using it with Claude Code

Same approach as the macOS skill — you could create a `SKILL.md` that:

1. Checks for `pywin32` installation
2. Runs the COM script to dump emails to markdown
3. Points Claude at the output directory

The main difference: no accessibility permissions to configure, and it works with Outlook minimized.

# Comparison

|macOS (Accessibility)|Windows (COM)|Graph API|
|:-|:-|:-|
|**Speed**|Fast (25-120s)|Faster (direct data)|Fast (network depende
    - **figgz415** (3↑): What the bot said. I just discovered a GitHub project this week that does this via MCP. Will circle back if I can get the link
    - **Adeian** (1↑): This is pretty great.  I've got it built into a [skill.md](http://skill.md) and work perfect.
- **Fearless-Letterhead3** (2↑): This is exactly what I'm after. Can it also read sent items, deleted items?
  - **coolreddy** (1↑): I will add the feature. Thank you. This is just first cut, will add multiple accounts, sent and drafts folder + search in the next version.
- **Chronicles010** (2↑): Actually a genius idea.
- **fredjutsu** (2↑): Cool, just sharing with the world how to get backdoor access to your personal comms.  Cool.  Cool.
- **Alzeric** (2↑): Awesome, bypassing company IT security policies. Brilliant move! especially if you're dealing with NPI
- **Aimsworthy** (1↑): Interesting…. Is IT allowing you to use Claude but just won’t give you api access for some reason or are you using a personal account?
  - **coolreddy** (1↑): Personal.
    - **Alzeric** (1↑): If it's personal there is no IT department to block you from using Graph.  Are you certain it's not your personal COMPANY mailbox?
- **DREWHOUSER** (1↑): Is the link not working for anyone else?
  - **coolreddy** (1↑): It's working, what error are you seeing
    - **DREWHOUSER** (1↑): it's giving me a 404 error on github!
- **Deep_Ad1959** (1↑): i took the same accessibility-tree route for a different mac catalyst app and the two gotchas that ate my afternoon were: catalyst wraps everything in 4-6 AXGroup layers with no stable AXIdentifier, so any minor UI update nukes your selectors, and the tree returns stale data if the window isn't frontmost, which looks like the scanner worked but with content from 10 min ago. forcing a frontmost+re-poll before each read fixed it for me. still wildly faster than screenshot+vision and no ToS gray zone like scraping the web version of the same product has.
