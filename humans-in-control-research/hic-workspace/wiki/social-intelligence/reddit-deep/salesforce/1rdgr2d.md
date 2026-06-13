---
id: social-intelligence/reddit-deep/salesforce/1rdgr2d.md
url: "https://www.reddit.com/r/salesforce/comments/1rdgr2d/headless_salesforce_on_10_free_nonprofit_seats/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Headless Salesforce on 10 Free Nonprofit Seats — Here’s the Full Stack"
author: "mcc0nnell"
date: "2026-02-24T13:50:27.000Z"
score: 40
upvote_ratio: 0.83
num_comments: 48
flair: "developer"
extracted_at: "2026-06-11T18:58:38.958Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c0"
    char_span: [0, 2043]
    sentence_count: 14
    key_terms: [salesforce, portal, nonprofit, org, laravel, authentication, infrastructure, passwordless]
    token_count: 481
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c1"
    char_span: [2045, 4536]
    sentence_count: 22
    key_terms: [membership, salesforce, contact, laravel, magic, creates, status, flows]
    token_count: 514
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c2"
    char_span: [4538, 6672]
    sentence_count: 18
    key_terms: [idempotency, governance, duplicate, motions, return, board, don, key]
    token_count: 521
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c3"
    char_span: [6674, 8787]
    sentence_count: 12
    key_terms: [events, emission, event, dig, summit, governance, eventkey, append-only]
    token_count: 494
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c4"
    char_span: [8789, 10265]
    sentence_count: 6
    key_terms: [geary, slice, deploy, membership, python, tools, cli, manifest]
    token_count: 330
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c5"
    char_span: [10280, 12585]
    sentence_count: 17
    key_terms: [salesforce, application, mcc0nnell, something, features, another, showing, support]
    section: Comments
    token_count: 496
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c6"
    char_span: [12587, 13006]
    sentence_count: 3
    key_terms: [deterministic, intentionally, revolutionary, architecture, hash-chained, idempotency, zero-budget, membership]
    section: Comments
    token_count: 78
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c7"
    char_span: [13008, 14985]
    sentence_count: 12
    key_terms: [mcc0nnell, internal, system, "it's", everything, salesforce, database, requests]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c8"
    char_span: [14726, 15421]
    sentence_count: 5
    key_terms: [portal, members, system, gold-efficiency-4308, user, member-facing, idempotency, information]
    section: Comments
    token_count: 175
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c9"
    char_span: [15423, 17810]
    sentence_count: 9
    key_terms: [emission, subscriber, chain, hash, platform, question, events, verification]
    section: Comments
    token_count: 498
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c10"
    char_span: [17812, 19916]
    sentence_count: 12
    key_terms: [idempotency, reconciliation, emission, chain, recovery, replay, job, gap]
    section: Comments
    token_count: 449
  - id: "social-intelligence/reddit-deep/salesforce/1rdgr2d.md#c11"
    char_span: [19918, 21540]
    sentence_count: 13
    key_terms: [salesforce, users, access, available, service, integration, api, different]
    section: Comments
    token_count: 370
---
# Headless Salesforce on 10 Free Nonprofit Seats — Here’s the Full Stack

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1rdgr2d/headless_salesforce_on_10_free_nonprofit_seats/)
Posted by **mcc0nnell** · **40↑** · **48 comments**

I run a nonprofit called Deaf in Government (DIG). We needed a member portal — not a landing page, a real platform. Membership engine, governance with ballot secrecy, event management, hash-chained audit trails, passwordless auth, and a deployment toolchain that doesn’t require deploying the whole org every time you touch a field.

Budget: $0.

The result looks like a $50K build, outperforms Experience Cloud, and has infrastructure patterns that most paid Salesforce orgs don’t bother implementing. Here’s the full stack.

# The Stack

**System of record** — Salesforce (API v65.0): Apex, LWC, Flows, Platform Events, CMDT

**Member portal** — PHP 8.2 / Laravel 12, Vue 3, Tailwind CSS v4, Vite

**Toolchain** — Python (Geary CLI), TypeScript / oclif (sf-geary plugin)

**Infrastructure** — Cloudflare Workers (Mermaid rendering)

**Mail** — MailerSend

**CLI** — Salesforce CLI (\`sf\`), Make

Total annual cost: \~$12 for the domain. Everything else is donated or open source.

# The Architecture

Salesforce is the backend — system of record for all membership, governance, communications, and event data. No Experience Cloud, no Visualforce, no Lightning Out. The portal is a standalone Laravel app that talks to Salesforce exclusively through the REST API and Apex REST endpoints.

Users hit portal.deafingov.org → Laravel handles routing, views, and session management → every data operation goes through authenticated API calls to the Salesforce org.

But the portal is only half the story. The Salesforce org itself is engineered with patterns you’d expect from a funded startup, not a zero-budget nonprofit.

# Auth: Magic Links, Not OAuth

We’re not using OAuth for end-user authentication. We’re using *magic links* — passwordless email authentication.

The flow:

1. User enters their email on the portal
2. Laravel looks up the Contact in Salesforce via REST API
3. If found, Laravel generates a signed, time-limited token and emails a login link
4. User clicks the link → Laravel validates the token and creates a server-side session
5. Session is tied to the Salesforce Contact ID — all subsequent API calls use that context

There are two distinct flows: \*\*join\*\* (creates a Contact and active Membership in Salesforce if they don’t exist) and **login** (authenticates without mutating membership state). The \`/me\` dashboard renders a request-scoped membership context DTO from Salesforce truth, with configurable caching (default 5 min TTL).

For the server-to-server Salesforce connection, we use the OAuth 2.0 Client Credentials flow — a single authenticated connection that the Laravel backend uses for all data operations. End users never interact with Salesforce auth.

Why magic links?

\- **No Community/Experience Cloud licenses needed** — users don’t need Salesforce identities

\- **No password management** — magic links are the entire auth layer

\- **Lower friction for government employees** — some agency email systems don’t play nice with OAuth redirects and third-party login screens. A magic link just works

\- **Contact-based access** — permissions and dashboard data are driven by the Contact record and associated membership spine

The \`Magic\_Link\_\_c\` custom object stores token state in Salesforce. Auth is fully auditable.

# Membership Engine

This isn’t a checkbox on a Contact. It’s a deterministic Apex engine.

Membership status is computed from \`Membership\_\_c\` term records (\`Membership\_Term\_\_c\`) and written to a Contact “membership spine” for reporting. Status derivation — Active, Grace, Lapsed, Pending, Cancelled — is pure Apex. No Flows. No ambiguity about execution order.

Admins tune behavior through Custom Metadata Types: membership levels, grace period windows, renewal notice timing. A scheduled daily job (\`DigOps\_MembershipDailyJob\`) creates deduplicated renewal Tasks based on those CMDT notice windows.

Why Apex over Flows for this? Ordering guarantees, bulk safety, bypass control, and a clear audit trail. When membership status drives permissions, governance eligibility, and communications, you need determinism — not a Flow that might fire in a different order depending on what else is happening in the transaction.

# Governance API

This is the one that surprises people.

DIG has a board. The board votes on motions. Those votes need to be auditable, enforceable, and in some cases secret. All of this runs through Apex REST at \`/services/apexrest/gov/\*\`.

Key objects:

\- \`Motion\_\_c\` — board and member motions

\- \`Ballot\_\_c\` — unique per motion/contact pair, enforced by \`BallotKey\_\_c\` (composite key: \`motionId:contactId\`)

\- \`Vote\_\_c\` — individual vote records

**Idempotency is enforced at the API level.** All mutating governance requests require \`Idempotency-Key\` and \`X-Request-Id\` headers. Duplicate ballot submissions don’t create duplicate records — they return the prior receipt. This is backed by \`IdempotencyKey\_\_c\`, a custom object that stores request fingerprints.

**Ballot secrecy rules:**

\- Board motions: public ballots are returned only when the caller has the \`Gov\_View\_Public\_Ballots\` permission

\- Member motions: secret ballots are never returned by any endpoint, period

The portal governance UI at \`/governance\` is purely a rendering layer. All business logic — quorum calculation, vote tallying, secrecy enforcement — lives in Apex. The portal just calls the API and displays results.

# Idempotency Everywhere

This isn’t limited to governance. \*\*Every mutating API request across the entire platform\*\* requires \`Idempotency-Key\` and \`X-Request-Id\` headers. Duplicate operations return prior receipts instead of creating duplicate data.

This is enforced by \`IdempotencyKey\_\_c\` in Salesforce. The pattern:

1. Request comes in with an idempotency key
2. Apex checks for an existing record with that key
3. If found → return the stored receipt (no mutation)
4. If not found → execute the operation, store the receipt, return it

This protects against double-submits, retry storms, network hiccups — all the things that create garbage data in orgs that don’t think about it. Most Salesforce orgs I’ve seen don’t implement idempotency at all. We enforce it on every write.

# Emissions: Hash-Chained Audit Trail

This is probably the most over-engineered thing in the stack, and I don’t care because it’s also the most useful.

Emissions is an append-only, hash-chained event journal built on Platform Events (\`DIG\_Emission\_\_e\`) with a durable sink (\`DIG\_Emission\_\_c\`).

Every significant operation — membership state change, governance vote, RSVP, communication sent — emits an event. Each emission envelope includes a hash of the previous emission, creating a verifiable chain. You can prove that no events have been inserted, deleted, or reordered after the fact.

This gives us:

\- **Audit trail** that’s tamper-evident, not just append-only

\- **Evidence** **for governance decisions** — every vote has a chained emission

\- **Replay capability** — you can reconstruct system state from the emission log

\- **Compliance** — for a government-adjacent nonprofit, being able to prove what happened and when is not optional

The emission pattern is a first-class architectural concept, not an afterthought. It’s baked into membership changes, governance actions, event RSVPs, and communications.

# DIG Coffee: Event Integration

DIG Coffee is our recurring professional development event. It’s backed by Summit Events (managed package) with a config-driven adapter layer.

The flow:

\- Events are keyed by \`EventKey\` (\`dig-coffee-YYYY-MM-DD\`)

\- RSVPs live in \`DIG\_RSVP\_\_c\` (attendance join table)

\- The portal resolves events by querying \`Summit\_Event\_\_c.EventKey\_\_c\` via Salesforce — if the key is missing, unpublished, or collides, the public page returns 404

\- Admin check-in is gated at \`/events/dig-coffee/admin\`

\- Email confirmations pull event details (title, start time, location) from \`Summit\_Event\_\_c\`

\- The resolve endpoint returns realtime \`rsvp\_count\`

The adapter is configured via \`DIG\_SummitPkg\_Config\_\_mdt\`. If Summit Events ever becomes a problem, rollback is config-only: flip the CMDT to point at a different object and field, redeploy metadata. No route or code changes. The EventKey contract is stable regardless of backing store.

# Geary: Custom Deployment Toolchain

Deploying a full Salesforce org every time you change a field is insane. So I built Geary.

Geary is a metadata slice builder, deploy wrapper, and recipe compiler. It scans package directories, generates deterministic slice manifests, resolves dependencies, and lets you deploy by friendly aliases.

\`\`\`

**Rebuild the slice registry**

python tools/geary/geary.py update --root .

**List available slices**

python tools/geary/geary.py list

**Deploy just the membership slice**

python tools/geary/geary.py install membership --target-org deafingov

**Health check**

python tools/geary/geary.py doctor --root .

\`\`\`

Each slice has its own manifest under \`manifest/\`. The principle is **small blast radius** — deploy what you changed, not what you didn’t. The slice catalog is human-curated YAML under \`catalog/\` with dependency resolution and linting.

There’s also a TypeScript sf CLI plugin (\`sf-geary-plugin\`) that wraps the Python CLI for teams that prefer staying in the Salesforce CLI ecosystem.

Key Makefile targets:

\- \`make deploy-membership\` — deploy just the membership slice

\- \`make deploy-governance\` — deploy just the governance slice

\- \`make deploy-apex\` — deploy Apex classes + triggers

\- \`make dig-smoke\` — run membership join smoke test

\- \`make portal-up\` — stand up the portal locally

# What the Portal Actually Does

Full member lifecycle:

\- **Landing pages** with mission messaging, testimonials, stats, and CTAs

\- **Member dashboards** (\`/me\`) with personalized data from the membership spine

\- **Comm

## Comments

- **Interesting_Button60** (33↑): Really thorough post which I appreciate, but this is hella complicated and questionably legal as pointed out. Maybe you should have posted it without tying it to your non profit so you don't get into any trouble.
  - **mcc0nnell** (11↑): On the complexity: yeah, it’s a lot. But that’s kind of the point of the post — showing what’s actually involved in building something real on the platform without paying for Experience Cloud or a consulting firm. Most Salesforce content stays at the surface level. I wanted to go deeper for the people who’d get something out of it.

And tying it to the nonprofit is intentional. DIG is the reason it exists. I’m not trying to hide what it’s for — I’m trying to show what’s possible for orgs that have more talent than budget. Sometimes edge cases are worth exploring and questioning.
    - **Interesting_Button60** (5↑): You 100% succeeded in showing the details of this :)
  - **Strong-Dinner-1367** (1↑): Completely agree.
- **EnvironmentalTap2413** (10↑): This is acceptable use and not a violation of terms. All you've done is integrate Salesforce with another system. That system happens to be home grown but it could just as easily have been any 3rd party application that provides the functionality you need.

Tens of thousands of customers have integrations between their systems and many of them are home grown. You are not providing any access to Salesforce to the users of your web app and every API call made by your web app is properly authenticated using the built-in features that facilitate API calls.

Your excitement and lengthy description make it sound like you achieved some amazing feat, and it is commendable that you found a way to support your constituents and keep costs down, however it is not revolutionary and has been done before. Keep supporting your organization and sharing to support the greater community as it is inspiring for others.

If anyone gives you a hard time just ask them "What's not allowed about integrating Salesforce with another application, that's what External Clients/Connected Apps, Mulesoft, Heroku Connect, and a bunch of other Salesforce (and 3rd party) products/features are built to do?"
  - **mcc0nnell** (6↑): This is exactly it. Thank you for laying it out so clearly.

And you're right — the architecture itself isn't revolutionary. Thousands of orgs integrate external apps with Salesforce every day. What I wanted to show was the full picture of what's possible when a zero-budget nonprofit applies those same patterns intentionally — idempotency, hash-chained audit trails, ballot secrecy, deterministic membership logic — instead of settling for a basic contact form and a newsletter.

Appreciate the encouragement. Will keep sharing.
- **Etanclan** (20↑): The post and comments all scream AI generated and give me the creeps.
  - **SoshulBattery** (8↑): I was thinking the same thing. I have never seen a human leave raw markdown formatting in their post, so probably OP copied and pasted text from an LLM.
    - **mcc0nnell** (4↑): Half-and-half, admittedly.
    - **jjdonald** (5↑): Going out on a limb and saying it's Claude.  A lot of the cadence reads the same.
  - **mcc0nnell** (3↑): Hopefully it helps other nonprofits, though!
  - **Wild_Brilliant_7270** (1↑): Not everything that AI generates is bad, particularly if it's reviewed by the person publishing the content.
- **No-Coast3171** (11↑): One of the great parts of LLMs is how you can prompt them to provide succinct outputs.
- **AndroxxTraxxon** (5↑): This seems like a lot of work to set up a Salesforce instance as basically just a database backend. I get that it's done now, but why not use any one of the many FOSS or cheaply hostable databases? At the scale you're limited to here (only 100k requests/day, or a little over 1 request/second), you could run that on a Raspberry Pi.
  - **gmsd90** (7↑): I don't think it is a database backend, it is an internal system with off platform portal. I have seen many large clients following this paradigm.
  - **mcc0nnell** (5↑): If I swapped Salesforce for Postgres, I’d still need to build everything the internal team uses: user management, role-based access, reporting, dashboards, workflow automation, email integration, audit UI. That’s a full application, not a schema.
The 10 free Enterprise seats give me all of that out of the box. The API is just the bridge between the internal system and the member-facing portal.
As for the 100K limit — for a nonprofit with a few hundred active members, with caching and composite requests, we barely touch it. Not every system needs to handle 1 req/sec sustained.
    - **Wild_Brilliant_7270** (1↑): What does the Salesforce side of the schema look like for the members interacting with the portal? Is there information stored in Contacts? Also are you using an integration user to call the API from the portal, or a full enterprise user, or some other license type?
- **RektAccount** (5↑): Holy ai slop
  - **mcc0nnell** (-1↑): Hopefully it helps other nonprofits, though!
- **Gold-Efficiency-4308** (3↑): In the idempotency section. 

How does the request come with idemkey?
  - **mcc0nnell** (1↑): The portal generates it. When Laravel makes a mutating API call to Salesforce, it generates a deterministic idempotency key — typically a hash of the operation type, the relevant record IDs, and a timestamp or session nonce — and sends it as a header with the request. The Apex REST endpoint reads the header and runs it through the IdempotencyKey__c check before executing.
- **neilsarkr** (3↑): this is one of the most genuinely impressive things I've seen posted on this sub in years. the hash-chained audit trail on platform events is the part that got me - most orgs with actual compliance requirements just bolt on shield event monitoring and call it a day, the fact that you built tamper-evident chain verification into the core architecture of a $12/year nonprofit is kind of insane in the best way. the idempotency enforcement on every write is also something I've preached at paid enterprise clients who nodded politely and then shipped anyway without it. the Geary toolchain scratches a real itch too - slice-based deploys are something the ecosystem desperately needs and the fact that copado charges thousands per year for a worse version of what you built in python is a little depressing. one question - how are you handling platform event replay when the trigger subscriber fails? we've had situations where a subscriber flow errored silently and events were just lost, curious if you built any dead letter handling into the emission chain or if you're relying on the hash verification to detect gaps after the fact
  - **mcc0nnell** (2↑): Great question and honestly one that pushed me to think harder about a gap I hadn't fully closed.

Here's how it works today and what I'm adding based on your question:

The trigger subscriber uses setResumeCheckpoint on each successfully processed emission, so if it hits a limit exception mid-batch, Salesforce resumes from the last checkpoint. Platform Events are retained for 72 hours on Enterprise, which gives a replay window for transient failures.

The hash chain itself is the primary gap detector. Each DIG_Emission__c includes the hash of the previous emission. If a subscriber failure causes an emission to be lost, the next emission that does land will have a previous_hash that doesn't match the chain tip in the durable sink. That's a detectable break.

What I'm building now (you lit a fire under this): a reconciliation layer. A scheduled Apex job walks the emission chain, verifies hash continuity, and for any detected gap, attempts recovery. Here's where the idempotency pattern pays off — because every emission was originally published with an idempotency key, replay is always safe. The reconciliation job re-publishes the emission … with the original idempotency key. If it actually did land somewhere, idempotency catches the duplicate and returns the prior receipt. If it was genuinely lost, it publishes fresh and repairs the chain. You can never accidentally double-emit. Idempotency turns replay from a dangerous retry into a safe recovery mechanism.

Gaps that fall outside the 72-hour replay window get an honest gap marker emission — the chain doesn't pretend continuity where there is none. It records the break, the recovery attempt, and the outcome. The reconciliation job itself emits to the chain so it's auditable too.

Appreciate you flagging this — it's going straight into the build.
    - **neilsarkr** (2↑): the idempotency as a safe replay mechanism is the part that really clicks - most people treat idempotency as just a duplicate prevention layer but you've essentially made it the foundation of your entire recovery story. the gap marker emission for breaks outside the 72 hour window is elegant too, honest about what happened instead of trying to paper over it. the reconciliation job emitting to the chain so it's auditable is the kind of thing that sounds obvious in hindsight but most people would never think to do. genuinely excited to see where this goes - if you ever open it up beyond DIG I'd be first in line to implement this pattern in a compliance-heavy org we work with. this thread convinced me to go rethink how we handle platform event failures because "hope the subscriber doesn't error" is apparently what we've been doing
- **gearcollector** (8↑): Sound like aou are violating the Salesforce MSA and EULA with this solution.
  - **mcc0nnell** (5↑): Appreciate the flag — licensing is worth getting right.

Short version: end users never access Salesforce. They access a Laravel app. The portal connects to Salesforce via a licensed Integration User (one of the 5 free API-only licenses included with Enterprise Edition) through the REST API. That's a documented, supported integration pattern — same as Mailchimp, HubSpot, or any custom app using the API.

MSA 3.3 restricts making the "Service" available to non-Users. The Salesforce Service isn't being made available to anyone. Laravel is. Salesforce is a backend accessed through a licensed connection.

Experience Cloud licenses are for giving external users direct access to the Salesforce platform. Our users don't have Salesforce identities and never touch Salesforce. Different architecture, different licensing requirements.

Happy to dig into specific clauses if you see something I'm not seeing.
    - **ride_whenever** (2↑): 3.4a in the standard msa - “will not make any service or content available to anyone other than… …users” defined as people you’ve bought a seat for. 

3.4g will not permit direct or indirect access to or use of any services… …in a way that circumvents a contractual usage limit

However, is there a contract for free NPSP?
    - **big-blue-balls** (2↑): What you’ve just described is exactly what you’re not permitted to do. Using an API used to bypass the need to pay for actual users is a circumvention of limits and does indeed have its own clause.
- **AcksYouaSyn** (12↑): AI Slop
  - **mcc0nnell** (1↑): Hopefully it helps other nonprofits, though!
    - **East-Selection-4897** (6↑): if it wasn't worth writing, it's not worth reading
