---
id: social-intelligence/reddit-deep/saas/1t3rj2p.md
url: "https://www.reddit.com/r/SaaS/comments/1t3rj2p/was_cpo_at_a_saas_customers_kept_asking_us_to/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "Was CPO at a SaaS. Customers kept asking us to give their AI agents access. Scoping it honestly was depressing enough that I quit."
author: "CrewPale9061"
date: "2026-05-04T19:13:14.000Z"
score: 20
upvote_ratio: 0.78
num_comments: 33
flair: ""
extracted_at: "2026-06-14T15:28:21.913Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c0"
    char_span: [0, 2034]
    sentence_count: 28
    key_terms: [saas, customers, agents, per-customer, auth, work, depressing, comments]
    token_count: 468
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c1"
    char_span: [2036, 2614]
    sentence_count: 5
    key_terms: [multi-tenant, engineering, connecting, internally, customers, mid-build, post-ship, adoption]
    token_count: 120
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c2"
    char_span: [2629, 4874]
    sentence_count: 18
    key_terms: [app, mcp, because, routes, needs, definitions, auth, data]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c3"
    char_span: [4876, 6806]
    sentence_count: 8
    key_terms: [mcp, requests, auth, standard, because, handles, install, queries]
    section: Comments
    token_count: 418
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c4"
    char_span: [6808, 8126]
    sentence_count: 15
    key_terms: ["i'd", tool, synthetic, refresh, middleware-as-registry, "that's", right, token]
    section: Comments
    token_count: 275
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c5"
    char_span: [8128, 9603]
    sentence_count: 11
    key_terms: [integration, api, auth, like, cases, human, context-switching, use]
    section: Comments
    token_count: 324
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c6"
    char_span: [9607, 10563]
    sentence_count: 5
    key_terms: [model, agent, saying, doesn, did, does, key, need]
    section: Comments
    token_count: 214
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c7"
    char_span: [10565, 12587]
    sentence_count: 14
    key_terms: [different, agent, customers, mcp, multi-tenant, tenant-level, flows, permissions]
    section: Comments
    token_count: 419
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c8"
    char_span: [12589, 14088]
    sentence_count: 10
    key_terms: [somethingdifferent24, enterprise, agent, crewpale9061, api, mcp, monetizing, reasoning]
    section: Comments
    token_count: 346
  - id: "social-intelligence/reddit-deep/saas/1t3rj2p.md#c9"
    char_span: [14090, 15390]
    sentence_count: 11
    key_terms: [api, layer, enterprise, customers, limiting, adding, oauth, auth]
    section: Comments
    token_count: 293
---
# Was CPO at a SaaS. Customers kept asking us to give their AI agents access. Scoping it honestly was depressing enough that I quit.

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1t3rj2p/was_cpo_at_a_saas_customers_kept_asking_us_to/)
Posted by **CrewPale9061** · **20↑** · **33 comments**

Sharing this because I think a lot of SaaS teams are about to walk into the same wall.

Before this I was CPO at an enterprise SaaS. We had auth, subscriptions, dashboards, the whole thing working fine for human users logging in. Then customers started asking if their AI agents could use our product on their behalf. Not "can you build us an AI feature." More like "can my Claude actually call your API the way I would."

I sat down to scope it.

Agents do not navigate UIs. They do not read your docs. They do not know which endpoint to call for what. They need a discoverable surface, machine-readable schemas, agent-scoped auth (your existing API token approach does not quite fit), and rate limits that make sense when one customer's agent fires a thousand calls in a minute. None of that fit our existing stack. It was basically a whole second stack sitting on top of the one we already had.

Honestly depressing to look at. Months of infra work for something that was not our core product. The kind of project that gets cut every time a "real" feature comes up. I knew what would happen if I stayed. We would ship a half-version, customers would build around it, we would never invest enough to do it right.

So I left and built it as a company.

What has surprised me since is that the work nobody wants to do inside their own SaaS is the work everyone actually needs done. The MCP protocol piece is small, the SDK does it fine. The hard part is the layer underneath. Per-customer auth. Per-customer scoping. Rate limits that do not punish the model for retrying. Observability so customers can see what their agent did. Tool descriptions tuned so the model picks the right one, which sounds trivial and is not.

CLI is open source and free locally if anyone wants to poke at it (bridge.ls). The thing I am most curious about right now, if you have shipped MCP at your SaaS or are mid-build: who actually drove the decision internally? Engineering pushing for it, product, CEO mandate? And on the other side of launch, how is adoption looking, and are you hitting the same multi-tenant problems I scoped out above once real customers start connecting their AI clients? Trying to figure out where the friction actually shows up post-ship and would rather hear it from people in it than guess.

## Comments

- **nsjames1** (9↑): So, I've got some pretty in-depth recent experience with this. Just to close the loop for anyone reading this, here's how I approached it. 

Before digging in, here's the biggest benefits I think this does for products:

* Users don't need to go to your app anymore, they can just pull down the exact data they need on a far more granular pathway which equals less server load across the platform
* We humans aren't great at synthesizing large amounts of data, but agents are. Letting them fetch data in abundance gives your users a better experience and outcomes. 
* You meet customers where they already are. They don't need to leave the comfort of their agent to come to your dashboard or app to do something. It's right there for them, one prompt away.
* It's **especially** helpful if your app needs some kind of integrating into their app because you can give back a \`setup\` tool with step by step instructions, links to docs, etc that the agent can follow and do it for them. 

I'm using Express on a project that wants to have an MCP that can "do anything a user could do in the UI". Excellent feature, meets the ICP where they are. 

Constraints:

1. It can't be a claude code skill, because some people use codex / alternatives. That really only leaves MCP as a first-class option.
2. MCP should only be given access to certain tenants within the platform, user selected
3. Tool definitions shouldn't be able to drift, or at least it should be hard for them to.
4. Auth needs to be based on the user's auth, and carry the same RBAC controls
5. The MCP should hit real routes, not its own custom definitions so that there's a single source of truth for the app. 
6. The MCP needs to give back both a summary, and also any schemas required

(I'll put aside observability, audit logs, rate limits, etc because those are either basic integrations or so specific they arent' informationally beneficial for the post) 

I ended up adding a middleware to routes that self-types. It makes sure all of the parameters are good, and throws on startup of the actual app so there's no way to bypass them. Then, added them to all of the app's routes that should have them (excluding the obvious ones like auth, webhooks, etc.).

Looks something like this on a route:

    router.post(
      '/',
      ...other middleware here
      mcp({
        name: 'send_invite',
        description:
          'Email an invite for the recipient to join a specific team.',
          bodySchema: sendInviteBody,
      }),
      async (req, res) => {
        ...
      },
    );

That makes it easy for anyone changing the code to either remember to update the tool definition, or get body schema changes for free. 

Then, at app start it builds an MCP registry from those tagged routes, and exposes them as Streamable HTTP (with a shim for stdio because consumers like claude code don't make using that standard easy, and also makes the auth UX far better; you can just do `/plugin install <whatever>` and have auth handled automatically).

Then we have a dispatch system internally which transforms MCP requests into synthetic standard requests (same trick supertest uses) that allows pushing all MCP requests into the real routes they would have otherwise hit when using the UI and allows us to never have to duplicate any logic in the backend. 

The kicker here is that because the MCP was done this way (versus allowing them to use canned queries, or (god forbid) write their own queries; you get the safety net of your app's already (hopefully) robust security posture, and more tools than you would ever elect to manually craft out (ex: this gave the app 173 tools from very little development effort, relatively). 

Auth was a PITA though. There's a dance you have to do with MCPs. Basically though: 

OAuth (one per install, not API keys) handles "is this bearer valid and who is it." A side table keyed by (userId, clientId) handles "what tenant + accessors did the user consent to" and survives token refre
  - **CrewPale9061** (-1↑): This is one of the more thorough write-ups I've seen on actually shipping this end to end. Appreciate you putting it out there.

The middleware-as-registry approach is clever. The thing that kills tool quality in most implementations is drift. Someone changes a route, forgets the description, and the model starts picking the wrong tool or hallucinating parameters. Throwing at startup enforces the contract in a way code review alone never will. 173 tools for relatively little effort is also a meaningful number. That's the kind of leverage that makes the internal "why are we building this" conversation a lot shorter.

The synthetic request dispatch is the part I'd want to dig into more. Routing MCP calls through your real middleware chain means RBAC, plan-gating, and audit come along for free, which is exactly the right instinct. The thing I'd probe is latency. Synthetic HTTP has overhead, agents retry, and a slow p95 on a flaky tool compounds fast. Curious how that's held up under real agent load and whether you've had to tune anything.

On auth, the (userId, clientId) side table surviving token refresh is the piece most people get wrong the first time. They tie scope to the token, refresh happens, everything breaks. Separate consent row is the right call. One thing I'd add: revocation needs to be synchronous. If a user pulls an agent's access mid-session you want that enforced on the next call, not after a cache TTL drains.

Who drove it being yourself tracks with what I'm hearing from others. Product people closest to the ICP pain tend to get here before eng or the CEO does. The Stripe analogy is a good frame. The context-switching cost is invisible until someone actually maps it out.
- **Sad-Sherbert6878** (5↑): Really interesting. Curious when customers asked for this, did they actually have production use cases, or was it more exploratory demand driven by the AI hype cycle?
  - **CrewPale9061** (3↑): Yeah actually real use cases, never got to ship it though. We were helping brands like Adidas, Swarovski and Puma track carbon emissions across their supply chains, and they kept complaining our dashboards were too rigid. Custom views for sustainability reports, board decks, regulatory filings. The Claude integration would have let them build whatever visualization they wanted on top of their data.
- **Sea-Nobody7951** (2↑): Why is this so much harder/different than auth for any API first service?
  - **RouggeRavageDear** (2↑): Because most “normal” API auth assumes a pretty chill human-driven pattern, and this is more like plugging a firehose into your app.

Traditional API first auth is usually something like: a server-to-server integration, predictable usage, a human dev reading docs, deciding which endpoints to call, and building logic to avoid dumb behavior. Even with OAuth and per-user scopes, there’s still a human brain in the loop.

With agents, you suddenly have:
  
- A caller that doesn’t read docs and doesn’t remember context the way you think it does, so you need very explicit, machine-friendly schemas and tool descriptions or it thrashes your APIs in weird ways.  
- Much more bursty, chaotic traffic patterns. One “user” can become thousands of calls in seconds because the model retries, fans out, or loops. Your old rate limiting and quota model tends to punish the agent for doing what the model naturally does.  
- Much finer grained scoping. You’re not just saying “this API key can do X and Y,” you’re saying “this specific agent instance, acting on behalf of this tenant, can only touch this subset of data and actions,” and you need to expose that in a way the model can actually reason about.  
- Observability that’s per-tenant and per-agent, not just per key. Humans ask “what did my agent just do and why” way more than “what did my Zapier integration do.” That’s a whole extra layer of logging and UX.

So yeah, “auth” sounds the same on paper, but once you add multi-tenant SaaS, agents that behave non-deterministically, and customers expecting to plug in any model / client they want, it turns into way more than slapping OAuth on your existing endpoints.
    - **Sea-Nobody7951** (1↑): No, API first services are more often consumed by other applications . And you need to protect your APIs from weird behavior whether it is from another application or bot or anything else
- **exp-unknown** (1↑): I can relate to this from a smaller SaaS angle. I built a multi-tenant app for beauty and wellness businesses, and now customers are asking for similar AI-agent/bot features. In my case it is easier because we already provide websites for them, so adding an AI bot into those website flows is not a huge problem. But for a bigger enterprise SaaS, I can see why MCP is much harder. It is not just “add MCP.” You have to shape the data flow properly, handle tenant-level permissions, scope what the agent can access, manage rate limits, and give customers visibility into what the agent actually did. I have been wondering whether a browserless/headless-browser MCP layer could be a practical bridge. The MCP server exposes clean tools to the agent, but underneath it uses existing product flows or browser automation until the proper APIs are ready. Not perfect architecture, but maybe useful for teams that cannot justify rebuilding a whole second stack immediately. Did you consider that route, or did the auth/observability problems still make it too risky?
  - **CrewPale9061** (1↑): The headless browser idea is tempting but it breaks pretty fast at scale. Auth sessions expire, flows change, and suddenly your agent is clicking on something that no longer exists.

The tenant-level permissions point is where it really gets painful though. Every customer has different data scopes, different entity structures, different teams that should see different things. That's not something a headless layer handles gracefully.

Your beauty and wellness case sounds genuinely easier because you own the whole surface. Enterprise SaaS is brutal because you're retrofitting trust boundaries that were never designed with agents in mind.
- **somethingdifferent24** (1↑): Two month old account and every post looks like AI, get ready for the ad drop
  - **CrewPale9061** (1↑): says the one with the authentic pb 😄
    - **somethingdifferent24** (1↑): What does this even mean?
- **AdvenVrasco** (1↑): Out of curiosity how are you monetizing your MCP? Are you using traditional ways of monetizing like for normal API?
  - **CrewPale9061** (1↑): That's what we did back then. Every API (or MCP) integration cost $X annually. Especially in the enterprise market, you can easily do the same with MCP.
- **One_Cheesecake_3543** (1↑): We hit this exact wall building agent integrations for enterprise. The non-obvious failure mode most teams miss: you solve the auth layer, ship it, then 6 months later compliance asks you to prove what the agent actually *decided* and why -- and you have nothing. Logs show API calls. Not reasoning.

What actually helped us:
- Machine-readable schemas are table stakes, but you also need decision-level tracing per agent action, not just request/response pairs
- Scoped auth without a reasoning snapshot means you can revoke access but can't reconstruct *why* the agent chose to call that endpoint in that moment
- Rate limiting is solvable. Auditability of intent is where teams are still flying blind

The infra gap you're describing is real and most SaaS platforms are punting on it entirely. Are you seeing enterprise customers asking for audit trails on agent decisions specifically, or is it mostly just the auth/rate limiting piece right now?
  - **One_Cheesecake_3543** (1↑): Thanks for your question! The challenge with MCPs is not just about code but ensuring compliance with auditability and security standards, which is vital for enterprise customers. Tenet is designed to address those complexities while granting safe access to AI agents.
- **Fair-Stop9968** (1↑): Am I missing something? isn't an MCP just an API inference layer with like another 20 lines of code? If you have an externally accessible API why was adding an MCP hard?
  - **CrewPale9061** (1↑): It’s not just a layer on top of your API. Auth is already a pain. Your API might use Bearer tokens, AI clients expect OAuth, so now you’re either adding OAuth or building a mapping layer. Then rate limiting, because AI can hallucinate and just fire 1000 calls in a loop. Fine in most cases, not fine when you’re credit-based and one bad session just wiped a user’s balance.

And once you know intelligent routing and tool optimization can cut token costs by 80%, you’re not shipping just a naive wrapper. 

Does that make sense?
