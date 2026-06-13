---
id: social-intelligence/reddit-deep/anthropic/1t29cmf.md
url: "https://www.reddit.com/r/Anthropic/comments/1t29cmf/to_all_my_claude_code_win11_bois_do_you_all_use/"
kind: "social-post"
source: "reddit-deep: r/anthropic"
subreddit: "anthropic"
title: "To all my Claude Code + Win11 bois: Do you all use WSL2 or a native Windows install? I'm a long time PowerShell developer so I use Pwsh, but lately I've been thinking about switching to WSL2 + Bash. Please confirm or deny my suspicions and evaluate my reasoning!"
author: "xii"
date: "2026-05-03T02:43:33.000Z"
score: 5
upvote_ratio: 0.78
num_comments: 12
flair: "Other"
extracted_at: "2026-05-11T17:26:51.914Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, saas, workforce]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/anthropic/1t29cmf.md#c0"
    char_span: [0, 959]
    sentence_count: 6
    key_terms: [claude, code, https, use, wsl2, powershell, anthropic, switching]
    token_count: 245
  - id: "social-intelligence/reddit-deep/anthropic/1t29cmf.md#c1"
    char_span: [978, 2136]
    sentence_count: 3
    key_terms: [wsl2, docker, bash, use, powershell, terminate, instead, better]
    section: The positives
    token_count: 271
  - id: "social-intelligence/reddit-deep/anthropic/1t29cmf.md#c2"
    char_span: [2156, 3309]
    sentence_count: 7
    key_terms: [code, powershell, claude, wsl2, bash, here, use, distro]
    section: The negatives
    token_count: 277
  - id: "social-intelligence/reddit-deep/anthropic/1t29cmf.md#c3"
    char_span: [3324, 5242]
    sentence_count: 19
    key_terms: [powershell, works, projects, bash, claude, code, windows, using]
    section: Comments
    token_count: 452
  - id: "social-intelligence/reddit-deep/anthropic/1t29cmf.md#c4"
    char_span: [5245, 6482]
    sentence_count: 9
    key_terms: [space, free, virtual, disk, ram, wsl, "doesn't", claude]
    section: Comments
    token_count: 284
  - id: "social-intelligence/reddit-deep/anthropic/1t29cmf.md#c5"
    char_span: [6484, 8691]
    sentence_count: 13
    key_terms: [claude, windows, wsl, powershell, port, instance, because, through]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/anthropic/1t29cmf.md#c6"
    char_span: [8431, 8896]
    sentence_count: 2
    key_terms: [windows, powershell, switching, therefore, commands, increase, inherent, juscuz96]
    section: Comments
    token_count: 105
  - id: "social-intelligence/reddit-deep/anthropic/1t29cmf.md#c7"
    char_span: [8898, 10075]
    sentence_count: 8
    key_terms: [wsl2, windows, side, smoother, doesn, going, happy, place]
    section: Comments
    token_count: 273
---
# To all my Claude Code + Win11 bois: Do you all use WSL2 or a native Windows install? I'm a long time PowerShell developer so I use Pwsh, but lately I've been thinking about switching to WSL2 + Bash. Please confirm or deny my suspicions and evaluate my reasoning!

Source: [reddit-deep: r/anthropic](https://www.reddit.com/r/Anthropic/comments/1t29cmf/to_all_my_claude_code_win11_bois_do_you_all_use/)
Posted by **xii** · **5↑** · **12 comments**

I currently use the Official Claude Code plugin in VS Code and have Claude Code installed natively on Windows 11 + Powershell. 

I went with the below Pwsh command as shown [here](https://code.claude.com/docs/en/quickstart):

```
irm https://claude.ai/install.ps1 | iex
```

I am leaning towards switching to WSL2 + Ubuntu 24 + Bash though for several reasons and want as much feedback as possible from all of you glorious vibe-coding bastards.

My chain of thought about the situation right now is below.

---

## The positives

- Claude Code is better and more efficient with Bash than Powershell. However, CC uses Git Bash instead of Powershell by default on Windows 11 which is great but not as good as a full Linux distro.

- Extending on the above, Git Bash is not as extendable as a full distro on WSL2 where I can install any number of CLI tools to extend my workflow like ripgrep, fzf, k9s etc.

- If I go with the WSL2 path, I can also sandbox any tool use or code execution (HUGE reason for me, trying to avoid supply chain attacks or malicious prompt injection poison etc)

- Better integration with Docker (I don't really use docker much and don't see the value here so this is kind of a non-issue for me - if I'm wrong and should be using docker for things feel free to change my mind)

- I can offload ALL of my AI use to the WSL2 instance for resource management. On Win11 this means if I have a runaway plugin spawning tons of processes (claude-mem just did this for me recently) or some MCP server going nuts, I can just terminate wsl2 (`wsl --shutdown`) instead of having to open a task manager app like System Informer and terminate every rogue or zombie process.

---

## The negatives

- I know Powershell like the back of my hand and it makes it really easy to extend claude with custom hooks with powershell. Yes, Powershell is available on Linux as well, but the syntax has to change very specifically for cross-platform use here. (Although I can easily just vibe code bash scripts that do the same thing)

- WSL2 has to be turned on and consumes a lot of resources compared to Claude Code natively using Git Bash.

... I can't really think of any more.

---

Can some of you expert coding masters chime in here?

- Should I go WSL2 + Ubuntu 24.04 + Bash, or stay on Powershell + Git Bash? 
- Should I use a different distro than Ubuntu 24.04 if I go this route? (If you are recommending a distro, please explain why it's better.)
- How good is the Claude Code VS Code plugin when Claude Code is running on WSL2? This is extremely important to me. I currently use it as my main agent (I don't like the CLI) and I have absolutely no idea how the plugin will function when Claude Code is installed in WSL2 instead of on my Win11 OS.

Any other pro-tips from Windows11+WSL2 users here as well would be super awesome.

TIA for any guidance!

## Comments

- **newhunter18** (5↑): WSL2 and I'm never going back to PowerShell.
  - **xii** (2↑): Can you elaborate? Why on earth would you abandon good ol' Powershell?! Joking, I just happen to be really proficient with it because it was one of the first legit shell scripting languages I picked up.

Anyway, by default, Claude Code uses Git Bash on Windows instead of Powershell, so if PowerShell is the reason you left, you might have misjudged that specific step. Claude Code is fantastic with Git Bash. 

Sorry if you already knew that or had other reasons for switching. Really appreciate your reply!
- **muikrad** (3↑): I use the PowerShell experimental flag in Claude code and it works well. I have bash denied at the user level config to prevent it from even using it. No issues at all, it works well. I do have a pretool hook that catches some bash-like aliases like "head" and "cat" and tells Claude to use the PowerShell equivalent.
- **Apprehensive_Half_68** (3↑): Always ALWAYS develop on bash in wsl2 on windows or suffer path issues forever on hosting.
- **vvtz0** (1↑): Been using this exact setup with CC in WSL Ubuntu on Win 11 with VS Code + CC plugin but only for my personal pet projects, so cannot really comment on how it works with large codebase in enterprise.


For small pet projects it works perfectly well, so much that I don't even know what to tell you. Just start using it and that's it. It just works. I switched to this setup for the same reason of going for Linux+bash env as opposed to Win+PS which coding agents in general seem to struggle more with.


The only noticeable negative point is that it's slower on I/O operations - WSL introduces some overhead here. But as long as you use native Linux paths e.g. '~/projects' and not mounted windows drive's path '/mnt/c/projects/' it won't be a problem. 


The rest just works. It's so seamless nowadays, you don't have to worry about details.


CC plugin in VSC works well. I still find it inferior to Cursor's UX which I'm used to because that's what I work with at my job. But that's a personal preference and doesn't make CC over WSL any worse than CC on Win.
- **sockalicious** (1↑): I use WSL2.  I am much more familiar with Unix/Linux environments and Claude works great there.

The main problem is managing the virtual disk in which the environment runs, which is a filesystem saved to a real disk as a monolithic file.  It does not automatically free space; if it bloats up and you remove files, you then have to close WSL, get out to powershell and run a series of commands to compact the virtual volume.

The disk usage issue is exacerbated by the fact that df on the virtual volume shows some fictional amount of thousands of TB free; df -h /mnt/c (or whatever drive) is the right way to find out how much free space you actually have, but Claude doesn't know that and will cheerfully fill all that space while blathering on about your petabytes of free space headroom.

The other issue is that Windows allocates about half your RAM to the WSL instance and the other half to itself.  If you were tight on RAM to begin with, you will be very tight on RAM after that stunt.

There are a variety of issues regarding port forwarding and proxies if you want to access the WSL instance via ssh, or other operations on LAN or WAN; but Claude will walk you through working around them.  The main one is that WSL assigns every new instance of itself an IP4 address in the 172.\* range at startup time and there is no way to predict or pin what it's going to be ahead of time; there is also the usual port forwarding thing where you're running similar services in two OSes on a single box.  Example: Windows and WSL might both expose an sshd, but Windows has already taken port 22, so the WSL sshd would have to be portproxied to port 2222.
- **banderberg** (1↑): I created an EC2 instance running Ubuntu and work on it from my windows box with Cursor via ssh.  Works beautifully.
- **isakota** (1↑): I'm comfortable around Linux and still use CC without WSL2 WITH pwsh. 
It's just less overhead.
I use pwsh over old PowerShell because of encoding issues. I have no issues.
CC sometimes slips with quoting, but gets it correctly quickly.
- **Nice_Cellist_7595** (1↑): Wsl is slow. Also when it comes to certain aspects of hardware it can be difficult including GPU use. Also consider that WSL does not protect you from Claude turning your file system into mashed potatoes. It is worth it IMO to keep claude isolated to VMs or remote servers. Kind limits co work however.
- **ven_** (1↑): I have ripgrep jq and all the other stuff installed in Powershell through winget and even through git bash they all work fine... as long as Claude thinks it's doing something bash adjacent I don't find much differences in performance. However, the one advantage of WSL2 is that Claude doesn't get confused about path names which doesn't happen a lot but when it does is quite frustrating because Claude will sometimes construct paths like /c:/users/username which are a mix of a git bash path and a normal Windows path which just aren't valid and once it did that mistake once the session can basically be trashed because having it in context will increase the chance of doing it again by a lot.
- **juscuz96** (0↑): I have found since switching from Windows PowerShell 7 to WSL2 Ubuntu 24.04, CC makes fewer errors when making tool calls. Part of the issue with the Windows install is that the training of the models is done on Linux distros and therefore there is this inherent “reach” for those commands.

There is a reason though and for Windows it’s a safety measure, CC works over in WSL2 land pretending Windows doesn’t exist and that’s its “happy place”. You get a local repo location and an AI agent that “doesn’t know” about the more critical systems. When you install it on the Windows side it works and they have a “preferred method”, but you can bet you a\*\* CC is going to mess up the first tool call at a minimum. CC used to fight you on going from one side to the other and would just init itself on the WSL2 side if it was available. And then somewhere along the way it gave up I guess. 

WSL2 isn’t CC’s true “happy place” but it’s closer and since the “reach” is less from its base training it gets things “right” more often. Word to the wise, fully set up your WSL2 repo including Claude.md file before trying to init CC, they will not have their normal config they will be truly stateless and that means they will waste a huge amount of tokens figuring out things you have stored already.

TL;DR: For Windows I do agree WSL2 is the superior environment to run CC in, everything runs smoother, the tui interface is smoother, CC waste less time on simple tool calls.
