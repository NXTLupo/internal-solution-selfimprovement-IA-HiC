---
id: social-intelligence/reddit-deep/it/1olxcnm.md
url: "https://www.reddit.com/r/it/comments/1olxcnm/new_open_source_rmm_in_development/"
kind: "social-post"
source: "reddit-deep: r/it"
subreddit: "it"
title: "New Open Source RMM In Development"
author: "scryptolog1st"
date: "2025-11-01T19:56:38.000Z"
score: 2
upvote_ratio: 0.67
num_comments: 17
flair: "self-promotion"
extracted_at: "2026-10-01T20:49:31.533Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/it/1olxcnm.md#c0"
    char_span: [0, 1999]
    sentence_count: 6
    key_terms: [customizable, management, remote, custom, dashboard, comments, controls, security]
    concepts: [customizable, management, remote, custom, dashboard]
    token_count: 508
    sources: [{"n":"reddit-deep: r/it","u":"https://www.reddit.com/r/it/comments/1olxcnm/new_open_source_rmm_in_development/","kind":"social-post","date":"2025-11-01","author":"scryptolog1st","subreddit":"it"}]
  - id: "social-intelligence/reddit-deep/it/1olxcnm.md#c1"
    char_span: [2001, 2266]
    sentence_count: 4
    key_terms: [away, fire, rmms, realistic, possible, ugliness, feature, include]
    token_count: 67
    sources: [{"n":"reddit-deep: r/it","u":"https://www.reddit.com/r/it/comments/1olxcnm/new_open_source_rmm_in_development/","kind":"social-post","date":"2025-11-01","author":"scryptolog1st","subreddit":"it"}]
  - id: "social-intelligence/reddit-deep/it/1olxcnm.md#c2"
    char_span: [2281, 3581]
    sentence_count: 11
    key_terms: [security, integration, something, continue, project, curkus, invite, tools]
    concepts: [security, integration, something, continue, project]
    related_chunks: ["social-intelligence/reddit-deep/it/1olxcnm.md#c3"]
    section: Comments
    token_count: 300
    sources: [{"n":"reddit-deep: r/it","u":"https://www.reddit.com/r/it/comments/1olxcnm/new_open_source_rmm_in_development/","kind":"social-post","date":"2025-11-01","author":"scryptolog1st","subreddit":"it"}]
  - id: "social-intelligence/reddit-deep/it/1olxcnm.md#c3"
    char_span: [3583, 4982]
    sentence_count: 15
    key_terms: [scryptolog1st, get, building, security, solution, project, agent, done]
    concepts: [scryptolog1st, building, security, solution, project]
    related_chunks: ["social-intelligence/reddit-deep/it/1olxcnm.md#c2"]
    section: Comments
    token_count: 331
    sources: [{"n":"reddit-deep: r/it","u":"https://www.reddit.com/r/it/comments/1olxcnm/new_open_source_rmm_in_development/","kind":"social-post","date":"2025-11-01","author":"scryptolog1st","subreddit":"it"}]
---
# New Open Source RMM In Development

Source: [reddit-deep: r/it](https://www.reddit.com/r/it/comments/1olxcnm/new_open_source_rmm_in_development/)
Posted by **scryptolog1st** · **2↑** · **17 comments**

MSP owner here. I’m building an open-source, self-hosted RMM. I’d love blunt feedback.

**Model**

* **Client → Site → Devices** with fast filters, saved views, import/export, and custom fields.
* Full white-label: colors, logos, login background, favicon, custom CSS, live preview.

**What’s in**

* **Endpoint patching**
* **Custom alerts** with noise controls
* **Remote execution & software deploys**: `.exe`, `.msi`, `.pkg/.dmg`, `.sh` (Win/Linux/macOS)
* **Seamless remote connect/control**, **remote shell**, **remote file browser**
* **Software inventory** \+ install/uninstall from the dashboard
* **Group Policy management**
* **User & role management** (granular RBAC), **SSO**, **advanced 2FA**, session controls
* **Email stack**: multiple SMTP/IMAP/POP, **DKIM generation**, **DNS checks**, customizable email templates & workflows
* **Backups** (S3 or local/remote), easy migrations, robust DB settings
* **Security policies**, **detailed audit logs**, **SLA compliance settings**
* **Reporting** (fully customizable)
* **Customizable notifications**
* **Billing** for clients with invoice customization/management
* **Client portal**
* **Full REST API**

**On deck**

* AD management (thinking this through)
* Ticketing + a built-for-RemoteIQ CRM

**Stack (short)**

* NestJS control plane, Next.js dashboard, Windows agent (.NET 8), WebSockets for real-time jobs/logs.

**Principles**

* Security first (least privilege, signed builds, SBOM/supply-chain checks)
* Telemetry is **opt-in** only
* UX should be fast and obvious; almost everything is customizable

**Ask**

1. Day-one **must-haves** to even trial it
2. Hard **deal-breakers** you’ve hit elsewhere
3. Small QoL wins you want (maintenance windows, alert tuning, script library patterns, etc.)

https://remoteiqrmm.com

I’m aiming for “feels like *your* tool,” with speed and safety baked in. Fire away.

This RMM aims to clean up all the ugliness of other RMMs as well as include every realistic and possible feature that other RMMs lack. So if you've got any ideas, please fire away.

## Comments

- **curkus** (3↑): For me something I see other tools failing in is using MS Exchange Shared Mailboxes. Almost nobody can add them in a convenient way.

Also SCIM user provisioning is something that would make sense.
  - **scryptolog1st** (1↑): Thank you for your feedback. Ill keep this in my notes. 

I'm not sure if im allowed to post discord invite links here but if you want to keep up to date with what's happening with the project, and continue to chat about possibilities, feel free to let me know and I can send you an invite in your dms.
    - **curkus** (1↑): How far along are you with the project?
- **stebswahili** (2↑): Our must have has always been seamless integration with our other tools. You have the API, so the capability is there, but which integrations are you prioritizing as you expand the software? Every click counts! 

One thing I wish Datto RMM did a little better was bring in security telemetry from Microsoft Defender. On one hand, I don’t think our tech have our set up quite right, but on the other it still doesn’t seem like a very robust integration. As MSPs continue to mature in their cybersecurity practices, unifying RMM with security is going to become more and more appealing. Not just device security, but identity, application, and data security as well. 

With all of the M&A activity and PE buyouts happening in the industry, I think an open source alternative is timely. I wish you luck!
  - **scryptolog1st** (1↑): Thank you for this reply. I'll def keep it all in mind. One of the top focuses for this project is security. We've also pondered building a fully integrated AV solution that ships with the agent. So it can only be installed on an endpoint if the RMM agent exists and the goal would be to use numerous threat databases/sources mixed with AI learning and determination to secure endpoints as much as physically possible. This is all just in theory as we haven't actually put it in force yet. But please, let me know how this sounds to you. Cheers!
    - **stebswahili** (3↑): It’ll be tough to compete against the big guys who are solely focused on security, at least at the start. It’s good you’re thinking about it though.
- **siggifly** (1↑): Take a look at Fleet. I would suggest contributing there instead of building a new project.
  - **scryptolog1st** (1↑): I've contributed to so many projects over the years and still dont see things get done that need to get done. So I decided to take it into my own hands and develop a solution that covers everything that needs to be covered. Why wait for others to get it together when I know for a fact I can make it happen? Plus, my rmm is already about 30% complete. Why would I stop now?
