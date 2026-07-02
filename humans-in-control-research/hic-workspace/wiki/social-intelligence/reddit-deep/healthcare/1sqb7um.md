---
id: social-intelligence/reddit-deep/healthcare/1sqb7um.md
url: "https://www.reddit.com/r/healthcare/comments/1sqb7um/ai_agents_accessing_patient_data_how_are_you/"
kind: "social-post"
source: "reddit-deep: r/healthcare"
subreddit: "healthcare"
title: "AI agents accessing patient data — how are you proving what they were authorized to do?"
author: "Yeahbudz_"
date: "2026-04-20T01:27:14.000Z"
score: 17
upvote_ratio: 0.78
num_comments: 29
flair: "News"
extracted_at: "2026-06-22T20:51:07.135Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive strategic assessment of the \"State of the Healthcare and Life Sciences Industry in 2026 as it relates to AI Adoption for Providers, Consumers, Caregivers, and Payers,\" analyzing key adoption drivers, barriers, and high-impact use cases for each cohort."
engagement: "deliver-a-comprehensive-strategic-assessment-of-the-state-of"
chunks:
  - id: "social-intelligence/reddit-deep/healthcare/1sqb7um.md#c0"
    char_span: [0, 1193]
    sentence_count: 13
    key_terms: [healthcare, instructions, teams, authorized, authproof, safeguard, technical, comments]
    concepts: [healthcare, instructions, authorized, teams, authproof]
    token_count: 248
    sources: [{"n":"reddit-deep: r/healthcare","u":"https://www.reddit.com/r/healthcare/comments/1sqb7um/ai_agents_accessing_patient_data_how_are_you/"}]
  - id: "social-intelligence/reddit-deep/healthcare/1sqb7um.md#c1"
    char_span: [1207, 2376]
    sentence_count: 6
    key_terms: [here, proper, built, new, no-produce-6720, newalexandria, thenightgaunt, unprecedented]
    concepts: [proper, built]
    section: Comments
    token_count: 273
  - id: "social-intelligence/reddit-deep/healthcare/1sqb7um.md#c2"
    char_span: [2378, 3428]
    sentence_count: 2
    key_terms: [controls, access, cryptographic, audit, section-164, part-164, requires, title-45]
    concepts: [controls, cryptographic, access, section-164, audit]
    section: Comments
    token_count: 240
  - id: "social-intelligence/reddit-deep/healthcare/1sqb7um.md#c3"
    char_span: [3430, 4835]
    sentence_count: 7
    key_terms: [authorization, fhir, oracle, token, documentation, smart, epic, fhir-authorization-framework]
    concepts: [authorization, oracle, token, documentation, smart]
    section: Comments
    token_count: 276
  - id: "social-intelligence/reddit-deep/healthcare/1sqb7um.md#c4"
    char_span: [4837, 7284]
    sentence_count: 22
    key_terms: [layer, fhir, deployments, access, smart, identity, operator, specific]
    concepts: [layer, deployments, access, smart, identity]
    related_chunks: ["social-intelligence/reddit-deep/healthcare/1sqb7um.md#c6"]
    section: Comments
    token_count: 476
  - id: "social-intelligence/reddit-deep/healthcare/1sqb7um.md#c5"
    char_span: [7286, 9149]
    sentence_count: 11
    key_terms: [injection, receipt, access, kaiser, prompt, tokenization, using, web3]
    concepts: [injection, receipt, tokenization, access, kaiser]
    section: Comments
    token_count: 442
  - id: "social-intelligence/reddit-deep/healthcare/1sqb7um.md#c6"
    char_span: [9151, 11404]
    sentence_count: 15
    key_terms: [agent, access, layer, health, right, healthcare, operations, question]
    concepts: [agent, access, layer, health, healthcare]
    related_chunks: ["social-intelligence/reddit-deep/healthcare/1sqb7um.md#c4"]
    section: Comments
    token_count: 471
---
# AI agents accessing patient data — how are you proving what they were authorized to do?

Source: [reddit-deep: r/healthcare](https://www.reddit.com/r/healthcare/comments/1sqb7um/ai_agents_accessing_patient_data_how_are_you/)
Posted by **Yeahbudz_** · **17↑** · **29 comments**

Genuine question for healthcare teams deploying AI.

 When an AI agent accesses a patient record, generates a clinical summary, or touches any PHI — how do you prove what it was authorized to do before it acted?

Most teams are using system prompts and hoping the model follows instructions. System prompts are not HIPAA access controls. They are instructions to a probabilistic model. They do not constitute a technical safeguard under the Security Rule.

The technical safeguard is a cryptographic record of authorization that existed before the access event. Not reconstructed from logs. Not the vendor’s word. A signed receipt that predates the action.

Built this — authproof.dev Hosted version at cloud.authproof.dev with a free tier.

Not trying to promote — genuinely want to know if this is a problem other healthcare teams are actively trying to solve or if most organizations have not gotten there yet.

## Comments

- **No-Produce-6720** (17↑): If you're not trying to promote, there's no need to mention what you have already built.
  - **Yeahbudz_** (1↑): Genuine question, not a pitch. Built something that addresses exactly what the thread is asking about so I mentioned it. If that crosses a line I'll keep it out of the replies.
    - **NewAlexandria** (4↑): The main issue is that we get a ton of spam posts here related to new technologies, and the danger is that somebody might see them and use them without getting proper input, or vetting if somebody's new experimental AI service even has proper terms or legal company behind it to be held accountable. 

It's a problem overall and I wish we had a good path for it, Going forward.
- **thenightgaunt** (5↑): God I hope someone is. 

So far what I've seen here in rural healthcare can be summed up as "well if the vendor says its safe then its on them right?"

Most admins seems not to want to face the reality of the risks at hand here or are just generally oblivious to them. They seem happy to trust the word of companies who committed an unprecedented level of IP and data theft to train their models in the first place. 

Heck, I'm genuinely curious how many other CIOs here in the SW even know OpenAI put out a paper on how hallucinations are inevitable and can't be eliminated, much less read it.
- **WTLGovernance** (2↑): Without getting too far into the weeds, the claim that HIPAA's technical safeguards require "a cryptographic record of authorization that existed before the access event" overstates what the Security Rule actually says. [45 CFR § 164.312(a)](https://www.ecfr.gov/current/title-45/part-164/section-164.312#p-164.312(a)) requires access controls (unique user identification, emergency access procedures, automatic logoff, and encryption/decryption), and [§ 164.312(b)](https://www.ecfr.gov/current/title-45/part-164/section-164.312#p-164.312(b)) requires audit controls, which are mechanisms that record and examine activity in systems containing ePHI. The Rule is technology-neutral and does not prescribe a specific cryptographic attestation model, and a properly maintained audit log is a recognized implementation of the audit controls standard.

With that said, the authorization question you're raising is already being answered in production deployments and becoming the norm. Epic and Oracle Health both require AI agents to authenticate via SMART on FHIR. [Epic's backend OAuth 2.0 specification](https://fhir.epic.com/Documentation?docId=oauth2) requires JWT-signed client assertions bound to a registered public key, and [Oracle Health's own FHIR documentation](https://docs.oracle.com/en/industries/health/millennium-platform-apis/fhir-authorization-framework/) states directly that Millennium's FHIR implementation is "protected using the SMART App Launch Framework and SMART Backend Services: Authorization Guide". The access token that an agent presents to the FHIR server carries the OAuth scopes granted, the identity of the authenticated user or system principal, patient and encounter context from the EHR launch, and an exact audience binding to the FHIR base URL. Oracle Health's Code Console performs scope auditing at app approval and runtime monitoring of API usage patterns; Epic enforces the same audience binding on every token request. That token is the pre-access authorization record, so it captures what was permitted, by whom, and in what context, before any data is touched. The resource server logs the call and the token together. No separate attestation layer is required to produce a defensible record of authorization.

To your point though, that doesn't mean all systems are set to go and compliant with auditing. These include things like agents authenticating with static API keys or shared service account credentials scoped too broadly, vendor-hosted agents whose logs live inside the vendor's infrastructure and are inaccessible to the covered entity, and the growing "shadow AI" problem of staff feeding ePHI into consumer-grade tools like ChatGPT or the free Claude tier without a BAA in place. In those deployments, system prompts do end up carrying weight the access control layer should be carrying. However, I'd argue the remedy is migration to the SMART on FHIR pattern that already exists; not a new cryptographic primitive bolted onto a broken identity model. As mentioned in the paragraph above, the instrumentation is already there in production EHR systems. What's missing in most deployments is the discipline to use what's already available, not an attestation layer. Adding a cryptographic receipt on top of a shared-API-key service account with broad scopes just produces a tamper-evident record of the underlying compliance failure.
  - **Yeahbudz_** (1↑): Correction on the HIPAA framing — I overstated it. The Security Rule is technology neutral and SMART on FHIR with JWT assertions is the right pattern for EHR-integrated agents. Agreed.

The gap authproof addresses is upstream of the FHIR layer. OAuth scopes define what the agent can access. A delegation receipt defines what the user specifically authorized the agent to do with that access in this session. Those are different things.

An agent authenticated via SMART on FHIR with read scope on patient records can still be instructed by the operator to do things the user never intended within that scope. The OAuth token proves authentication and permitted access. It does not prove the user signed off on this specific task with this specific operator instruction hash before the session started.

You are right that the remedy for shadow AI and shared API keys is proper identity management not attestation on top of a broken model. But for well-architected deployments where identity is handled correctly the receipt adds something the OAuth layer does not — user-signed pre-commitment to the specific task before the operator gets control.

Not a replacement for SMART on FHIR. A complementary layer above it.

Audit logs are post-hoc evidence.
Receipts are pre-hoc constraints.

Adding a receipt to a bad identity model just gives you a tamper-evident record of failure.
- **Big-Info** (1↑): Whatever software you are using should control what data the AI has access to. It shouldn’t have access to any PHI. Any data that is anonymized can freely be accessed by the AI to do whatever needed tasks.
  - **Yeahbudz_** (2↑): That works until a prompt injection tells the agent to use its permitted access in ways you never intended. The receipt proves exactly what was authorized before anything happened. That is what HIPAA actually requires.
    - **Big-Info** (3↑): Prompt injection is a failure on the part of the system designers. Also prompt injection would only work in chat bot situations. 99% of you don’t need a chat bot you need AI to automate all the busy work and tedious tasks so physicians can focus on providing healthcare not documenting and medical codes.
  - **thenightgaunt** (1↑): Tell that to anyone at facility running cerner right now.
- **Broder987** (1↑): Not a single person mentioning web3? Tokenization. I have several bots that have bridged this gap alongside Kaiser Permanente
  - **Yeahbudz_** (1↑): Web3 anchoring is actually on the roadmap — publishing receipt hashes on-chain removes the centralized log entirely. What are you using with Kaiser?
    - **Broder987** (1↑): Web4 to surf and audit web3 and web2 via tokenization through iso 20022 is what Kaiser is using. Walk in scan your QR code. Pulls up your tokenized medical records and boom just like that every human is a file on a DLT ledger like xrp xlm xdc hbar algo. 👌
- **rahuliitk** (1↑): lowkey i don’t think most orgs are there yet, because a lot of “AI authorization” is still just app permissions plus prompts plus after the fact logs, and that is very different from proving a specific agent had a specific approved scope before it touched PHI.

that gap is pretty real.
- **Remote_Parsnip_5827** (1↑): You're absolutely right to call out system prompts here. Relying on a probabilistic model to enforce access controls is fundamentally not a technical safeguard. The authorisation needs to be structural, independent of the agent's internal reasoning or any potential prompt injection.

The way we approach this is to enforce capabilities at the kernel level, *before* the agent ever executes. So, an agent can only ever access files or networks that have been explicitly granted at the OS layer. This makes unauthorised operations structurally impossible. For the auditability you're looking for, these policies can be attested via Sigstore Rekor, providing a cryptographic record of the exact authorisations that were in place for that agent session. Session logs also capture all attempted operations, including those denied by the kernel.

Full disclosure, I'm a part of nono community (github.com/always-further/nono), an open source tool that does exactly this. It uses Landlock on Linux and Seatbelt on macOS to sandbox agent processes for exactly these kinds of security and compliance needs.
- **doctorAllways** (1↑): This is one of the harder unsolved problems in health AI right now. OAuth scopes tell you what an agent \*could\* access, not what it \*did\* access or why,  and most EHR audit logs weren't designed to answer the 'on whose behalf, under what clinical context' question that agentic workflows require. What you actually need is a purpose-bound authorization layer that travels with the request, not just the token. The interesting architectural question is whether that accountability infrastructure lives at the identity layer, the data layer, or somewhere in between, and right now the answer is usually 'nowhere consistently.'
- **twistedwiccan** (1↑): AI is not only inside the healthcare setting but the healthcare settings are using them to do reach outs as well. I work at a health plan, and we have a policy to turn down calls, asking for the protected health information from an AI or virtual assistant when we can identify them. But they are getting really good at sounding human When we ask them if they are human, they will even lie to us and say that they are
