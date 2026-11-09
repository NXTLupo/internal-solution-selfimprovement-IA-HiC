---
id: articles/meta-ai-blog/4cffedcb97.md
url: "https://engineering.fb.com/2026/10/19/ml-applications/thin-orchestrator-ai-agent-architecture/"
url_hash: "4cffedcb97"
kind: "article"
source: "Meta AI Blog"
title: "The Thin Orchestrator: How We Made Our AI Agents More Reliable by Giving the Router Less to Do"
author: ""
date: "Mon, 19 Oct 2026 15:30:37 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-11-09T00:36:35.279644+00:00"
chars: 10000
engagement: "1-understand-emerging-northeastern-university-student-and-other-college-student"
collected_at: "2026-11-09T00:36:34.992Z"
relevance: 25
engagement_goal: "1. Understand emerging northeastern university student (and other college student) 2026 AI behaviors (no earlier than October, 2026) and expectations  Determine how college students and early-career workers are adopting AI and personal assistants like Muse (from Meta) for academic, career, and life-management needs, and how those behaviors are evolving.  Explore:  Which AI platforms students use and pay for Career-related use cases: resumes, job discovery, interview prep, networking, skills development Movement from simple prompting toward persistent assistants, agents, memory and connected tools Expectations that AI should know their context rather than start from scratch Differences by AI fluency, age, discipline and career stage  Social listening: Reddit, TikTok, YouTube, Discord/public communities, product communities and app reviews.  3rd-party: Pew, EDUCAUSE, Anthropic, OpenAI, Microsoft, Google, Handshake, NACE and LinkedIn.  2. Assess the emerging“Bring Your Own AI” model  Determine whether consumers increasingly view AI as a personal technology layer that should travel with them across institutions and services.  Specifically investigate:  Preference for a personally chosen AI vs. institution-provided assistant Evidence of switching between ChatGPT, Claude, Gemini, Copilot and emerging personal-agent products Willingness to connect personal AI to trusted institutional services Expectations for interoperability, memory, portability and personalization Analogous models emerging in banking, healthcare, commerce and enterprise SaaS  This directly tests the broader proposition behind the team's headless direction: rather than Northeastern trying to build or permanently select the student's AI, institutional services could securely make themselves available to whichever AI the student chooses.  Key output: evidence for or against AI becoming a user-owned interface layer rather than an institution-owned destination.  3. Map consumer trust, privacy and control expectations  Identify what makes people willing or unwilling to connect AI with personal, institutional and behavioral data.  Focus on:  What information consumers willingly give AI What information they consider sensitive Differences between AI accessing data and AI writing data back Expectations around consent, transparency, memory and deletion Concern about universities/employers seeing personal AI interactions Behaviors consumers already use to protect themselves Trust differences among an institution, an AI provider and a third-party platform  This addresses a fundamental issue already surfacing internally: bi-directional student data and what should be written back to institutional profiles.  Key output: a consumer AI trust and permission framework that can guide architecture and UX decisions.  4. Identify where proactive AI creates value versus backlash  Determine when consumers want AI to anticipate a need and intervene, versus when proactive behavior becomes noise, surveillance or unwanted influence.  Analyze market reaction to:  AI notifications and nudges Persistent memory Recommendations based on behavior Autonomous task completion AI detecting problems before the user asks Emotional or motivational interventions AI escalating something to a human  This directly addresses the team's concern that proactive experiences can become noisy, while career guidance depends heavily on providing the right intervention at the right moment.  Key output: a taxonomy of high-value, acceptable and unacceptable proactive AI behaviors.  5. Define the evolving role of humans in AI-mediated guidance  Understand where consumers expect AI to replace transactions, augment experts or defer entirely to humans.  Look comparatively across:  Career advising Academic advising Healthcare navigation Financial advice Customer service Coaching and mentoring  Study the moments when consumers say:  “AI can handle this.”  versus:  “AI can help me prepare, but I want a person making this call.”  That maps directly to the question the Co-op team has raised about ensuring AI strengthens rather than appears to displace advisor expertise.  Key output: a human-AI responsibility model that shows where career services can automate, augment or preserve human interaction.  The synthesis question  These five objectives ladder into one strategic market question:  As AI becomes a persistent personal interface, what role should universities play in connecting students' preferred AI tools to trusted data, services, expertise and human support?"
content_hash: "41ee940e8263d70f"
relevance_by_goal: {"aaf3b0416610":25}
chunks:
  - id: "articles/meta-ai-blog/4cffedcb97.md#c0"
    char_span: [0, 216]
    sentence_count: 1
    key_terms: [thin-orchestrator-ai-agent-architecture, ml-applications, orchestrator, engineering, reliable, agents, giving, router]
    token_count: 57
    sources: [{"n":"Meta AI Blog","u":"https://engineering.fb.com/2026/10/19/ml-applications/thin-orchestrator-ai-agent-architecture/","kind":"article","date":"2026-10-19"}]
  - id: "articles/meta-ai-blog/4cffedcb97.md#c1"
    char_span: [218, 2924]
    sentence_count: 22
    key_terms: [data, agent, agents, knowledge, pipeline, context, domain, single]
    concepts: [agent, agents, knowledge, pipeline, context]
    token_count: 512
    sources: [{"n":"Meta AI Blog","u":"https://engineering.fb.com/2026/10/19/ml-applications/thin-orchestrator-ai-agent-architecture/","kind":"article","date":"2026-10-19"}]
  - id: "articles/meta-ai-blog/4cffedcb97.md#c2"
    char_span: [2606, 5217]
    sentence_count: 23
    key_terms: [population, validation, agent, deterministic, orchestrator, required, subagent, workflow]
    concepts: [population, validation, deterministic, orchestrator, agent]
    related_chunks: ["articles/meta-ai-blog/4cffedcb97.md#c3", "articles/meta-ai-blog/4cffedcb97.md#c4"]
    token_count: 512
    sources: [{"n":"Meta AI Blog","u":"https://engineering.fb.com/2026/10/19/ml-applications/thin-orchestrator-ai-agent-architecture/","kind":"article","date":"2026-10-19"}]
  - id: "articles/meta-ai-blog/4cffedcb97.md#c3"
    char_span: [4879, 7522]
    sentence_count: 23
    key_terms: [orchestrator, knowledge, subagent, new, workflow, population, files, patterns]
    concepts: [orchestrator, knowledge, subagent, workflow, population]
    related_chunks: ["articles/meta-ai-blog/4cffedcb97.md#c2"]
    token_count: 512
    sources: [{"n":"which domain files to load at runtime (typically a few thousand tokens each).","u":""}]
  - id: "articles/meta-ai-blog/4cffedcb97.md#c4"
    char_span: [7214, 9860]
    sentence_count: 30
    key_terms: [orchestrator, deterministic, agents, reasoning, subagents, routing, knowledge, new]
    concepts: [orchestrator, deterministic, agents, reasoning, subagents]
    related_chunks: ["articles/meta-ai-blog/4cffedcb97.md#c2"]
    token_count: 512
    sources: [{"n":"Meta AI Blog","u":"https://engineering.fb.com/2026/10/19/ml-applications/thin-orchestrator-ai-agent-architecture/","kind":"article","date":"2026-10-19"}]
  - id: "articles/meta-ai-blog/4cffedcb97.md#c5"
    char_span: [9511, 10219]
    sentence_count: 7
    key_terms: [hallucination, reliability, because, scaling, compositional, domain-scoped, architecture, continuously]
    concepts: [hallucination, reliability, because, scaling]
    token_count: 124
    sources: [{"n":"Meta AI Blog","u":"https://engineering.fb.com/2026/10/19/ml-applications/thin-orchestrator-ai-agent-architecture/","kind":"article","date":"2026-10-19"}]
---
# The Thin Orchestrator: How We Made Our AI Agents More Reliable by Giving the Router Less to Do

Source: [Meta AI Blog](https://engineering.fb.com/2026/10/19/ml-applications/thin-orchestrator-ai-agent-architecture/)

- Sometimes, giving an AI agent all of the knowledge it needs is the wrong approach.
- At Meta, we’ve seen notable improvements in efficiency and accuracy by keeping the orchestration layer of our data pipeline agents deliberately thin: It routes work and enforces reliability checks, while specialized agents do the domain reasoning.
- We’re sharing our own process and insights, plus how any team can apply this to their production AI agents.
We built a 1,300-line orchestrator that routes 20+ workflows to 14 specialized AI agents. It performs zero domain work itself. That’s the point.
When we first deployed AI agents to automate data column onboarding across Meta’s recommendation systems — a process spanning three code repositories, three programming languages, and up to six pipeline stages that must stay in sync — we did what most teams do: We built one smart agent that knew everything.
It worked in demos. In production, it started hallucinating.
The fix wasn’t better prompts or a bigger context window. It was giving the central agent less to do. We call this the thin orchestrator pattern: a router that owns sequencing and reliability checks, and leaves every domain decision to specialists.
The Problem: More Context, Worse Results
Our pipeline is config-as-code: Python configurations drive C++ code generation, which feeds data processing services, which populate analytics systems. Onboarding a single data column requires coordinated changes across configuration registries, backend services, and data pipelines, and each column moves through up to six stages before its data arrives.
Our first approach was a single AI agent loaded with all domain knowledge, configuration schemas, code generation rules, pipeline routing logic, validation requirements, and population patterns for 10+ data sources.
The agent had everything it needed. That was the problem.
Past a certain context threshold, additional knowledge degraded rather than improved performance. The agent would cross-contaminate concepts, applying field naming conventions from one subsystem to another, or using a code generation pattern meant for one data source when populating from a different one. A preprint from the Windreich Department of Artificial Intelligence and Human Health at Mount Sinai found that orchestrated multiagent systems held 65.3% accuracy at 80-task batches where single agents fell to 16.6%, while reducing token usage up to 65-fold. The authors attribute this to the design’s isolation of tasks, which prevented context interference. We were experiencing the inverse, a single agent drowning in its own knowledge.
We also evaluated an alternative single-agent approach. Its success rate was 70-80% with manual prompt engineering per task: An engineer had to craft a custom system prompt for each specific job. Without that handholding, success dropped to 10-20%. This wasn’t a prompt engineering problem. It was an architectural one.
The Approach: A Thin Router With Specialist Workers
We split the system into two layers:
- A deterministic orchestrator that performs zero domain work. It classifies intent, gathers required fields, runs reliability checks, and delegates to the right specialist. It never reasons about code, never generates configurations, and never touches the codebase. It’s a router.
- Fourteen specialized subagents, each a complete domain expert with isolated context. A schema management agent knows configuration registries. A population agent knows how to generate code for each of 10 data sources. A validation agent knows build systems and quality checks. No agent sees the full picture. That’s the feature, not the bug.
The orchestrator follows a fixed 7-step protocol for every request:
- Read the relevant subagent’s instruction file.
- Check if the target already exists (prevent duplicates).
- Gather required fields from the user.
- Auto-discover what can be inferred (repository type, existing configurations).
- Reliability gate check for active warnings or required reviewers.
- Delegate to the subagent with full context.
- Handle results and surface errors, confirm success.
Steps 1–5 and 7 are deterministic. Only step 6 involves large language model (LLM) reasoning, and it happens inside an isolated subagent with only its domain knowledge loaded.
What We Built: Workflow Templates, Not New Agents
One architectural insight was separating what needs to happen from how each step is performed. The orchestrator defines phase ordering through workflow templates — deterministic state machines that constrain the LLM’s decision space:
- Column Onboarding: Schema → Validation → Population → Testing
- Event Onboarding: Schema → Population → Validation → Testing → Event Processing
- Pipeline Migration: Assessment → Planning → Population → Validation → Monitoring
Each workflow template reuses the same pool of 14 subagents in different sequences. When we needed to support pipeline migration, a completely new use case, we didn’t build new agents. We wrote a new workflow template that sequenced existing agents differently. Zero new agent code. Full production capability.
Each subagent follows a standardized structure:
- Knowledge sources: which domain files to load at runtime (typically a few thousand tokens each).
- Pre-gathering checklist: what the orchestrator must collect before delegation.
- Step-by-step workflow: the domain-specific execution plan.
- Discovery patterns: how to find relevant code patterns in the monorepo.
- Troubleshooting: error-to-resolution mappings for common failures.
This uniformity means adding a new subagent is templated work, not greenfield engineering. The 15th subagent looks structurally identical to the first.
Knowledge files are loaded on demand at subagent execution time, not embedded in the orchestrator. We maintain 25+ knowledge files organized by workflow domain. When a knowledge file is updated, the next session automatically uses the latest version — no orchestrator changes required. The same knowledge files serve multiple platform implementations of our agent.
Results
Configuration prep for a new column took three to four days by hand and about a day with our earlier config-driven system. The thin orchestrator system does it in under an hour.
For broader context: About two-thirds of the system’s changes land without significant human edits. It gets there by trading generality for deep domain knowledge, a deliberate architectural choice. The orchestrator is general; the subagents are specialists.
Why This Works (And Why Heavyweight Orchestrators Don’t)
The conventional approach is to make the orchestrator the smartest component — give it all the context and let it reason about what to do and how to do it. This works until it doesn’t, and it stops working exactly when you need it most — at scale, with complex multi-step workflows, across heterogeneous subsystems.
The thin orchestrator works because it aligns architectural boundaries with computational boundaries:
- Deterministic decisions stay deterministic. “Which subagent handles this?” is a routing decision, not a reasoning task. Don’t use an LLM for it.
- Context isolation prevents cross-contamination. The population agent for data source A never sees data source B’s patterns. It can’t hallucinate the wrong one.
- Failures are contained. If a subagent fails, the orchestrator retries or escalates. The failure doesn’t corrupt the orchestrator’s state or other subagents’ contexts.
- The system improves at every layer independently. A better model improves all 14 subagents simultaneously. A knowledge file update takes effect immediately. A new workflow template unlocks new capabilities without touching agents. No single component carries the full weight.
How to Apply This to Your AI Agents
This pattern isn’t specific to data pipelines. Any team building production AI agents can benefit:
- Separate routing from reasoning. If your orchestrator is making domain decisions, it’s doing too much. Routing should be deterministic: keyword matching, intent classification, field gathering. Push all domain reasoning into isolated subagents.
- Design subagents as structurally uniform specialists. Every subagent should have the same structure: knowledge sources, required inputs, execution steps, error handling. This makes adding new capabilities templated work rather than architecture changes.
- Use workflow templates, not new agents, to scale. When you need a new use case, first ask: Can I sequence existing agents differently? If you can’t reuse agents across workflows, your agents are too coupled to specific use cases.
- Load knowledge at runtime, not at build time. Embed knowledge in the orchestrator and every update requires redeployment. Load it on demand and updates take effect immediately, across all platforms.
- Draw the deterministic/probabilistic boundary explicitly. For every component, decide: Is this a routing decision (deterministic) or a reasoning task (probabilistic)? The orchestrator should be on one side, the subagents on the other. Don’t mix them.
The strongest argument for a thin orchestrator is the failure mode of the alternative. When a heavyweight orchestrator hallucinates, the error spreads to everything downstream: it routes to the wrong agent, gathers the wrong fields, or skips reliability checks. A thin orchestrator leaves little room for hallucination because its routing and reliability steps don’t rely on LLM reasoning. It follows a fixed protocol. The creativity happens downstream, in isolated, domain-scoped contexts where hallucination risk is minimized and failures are contained.
What’s Next
We’re scaling this architecture to handle an increase in data columns across new pipeline domains. The compositional thesis predicts this will work because scaling means adding workflow templates and knowledge files, not rebuilding agents. We’re also exploring how the system can continuously improve from production usage, using automated feedback loops to
