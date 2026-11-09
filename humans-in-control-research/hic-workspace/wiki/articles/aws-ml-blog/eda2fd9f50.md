---
id: articles/aws-ml-blog/eda2fd9f50.md
url: "https://aws.amazon.com/blogs/machine-learning/automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions/"
url_hash: "eda2fd9f50"
kind: "article"
source: "aws_ml_blog"
title: "Automated agent evaluation with Amazon Bedrock AgentCore and GitHub Actions"
author: ""
date: "Tue, 08 Sep 2026 16:23:21 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-09-10T17:30:26.485972+00:00"
chars: 10000
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
collected_at: "2026-09-10T17:30:25.788Z"
relevance: 10
engagement_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.  "
content_hash: "01c61cff68fa9060"
relevance_by_goal: {"5a163910d68e":10}
chunks:
  - id: "articles/aws-ml-blog/eda2fd9f50.md#c0"
    char_span: [0, 224]
    sentence_count: 1
    key_terms: [automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions, amazon, machine-learning, evaluation, agentcore, automated, actions, bedrock]
    concepts: [amazon]
    token_count: 49
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions/","kind":"article","date":"2026-09-08"}]
  - id: "articles/aws-ml-blog/eda2fd9f50.md#c1"
    char_span: [226, 2794]
    sentence_count: 18
    key_terms: [agentcore, agent, mcp, runtime, evaluation, tools, agents, amazon]
    concepts: [agentcore, agent, evaluation, runtime, tools]
    related_chunks: ["articles/aws-ml-blog/eda2fd9f50.md#c2"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions/","kind":"article","date":"2026-09-08"}]
  - id: "articles/aws-ml-blog/eda2fd9f50.md#c2"
    char_span: [2469, 5069]
    sentence_count: 29
    key_terms: [agentcore, agent, evaluation, quality, mcp, server, aws, runtime]
    concepts: [agentcore, evaluation, agent, quality, server]
    related_chunks: ["articles/aws-ml-blog/eda2fd9f50.md#c1"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions/","kind":"article","date":"2026-09-08"}]
  - id: "articles/aws-ml-blog/eda2fd9f50.md#c3"
    char_span: [4735, 7418]
    sentence_count: 22
    key_terms: [evaluators, evaluation, cloudwatch, provide, custom, expectedtrajectory, evaluator, built-in]
    concepts: [evaluators, evaluation, cloudwatch, provide, expectedtrajectory]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions/","kind":"article","date":"2026-09-08"}]
  - id: "articles/aws-ml-blog/eda2fd9f50.md#c4"
    char_span: [7109, 9697]
    sentence_count: 24
    key_terms: [agent, mcp, traces, approach, oauth, pipeline, user, consent]
    concepts: [agent, traces, approach, pipeline, oauth]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions/","kind":"article","date":"2026-09-08"}]
  - id: "articles/aws-ml-blog/eda2fd9f50.md#c5"
    char_span: [9409, 10227]
    sentence_count: 10
    key_terms: [tokens, m2m, approach, role, bypass, checks, roles, types]
    concepts: [tokens, approach, bypass, checks, roles]
    token_count: 173
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions/","kind":"article","date":"2026-09-08"}]
---
# Automated agent evaluation with Amazon Bedrock AgentCore and GitHub Actions

Source: [aws_ml_blog](https://aws.amazon.com/blogs/machine-learning/automated-agent-evaluation-with-amazon-bedrock-agentcore-and-github-actions/)

Artificial Intelligence
Automated agent evaluation with Amazon Bedrock AgentCore and GitHub Actions
Build a continuous integration and continuous delivery (CI/CD) quality gate that deploys an agent with role-based MCP tools, evaluates it, and blocks PRs when evaluation scores drop.
You shipped an AI agent on Amazon Bedrock AgentCore runtime. It calls tools through an MCP server protected by OAuth. Now you want CI to tell you when a code change makes its performance worse before it reaches production.
This post walks through a GitHub Actions pipeline that deploys an agent to AgentCore runtime and evaluates the agent with evaluation prompts using the AgentCore Evaluate API. If the agent regresses, the PR fails.
We’ll cover the full stack: a Strands agent that connects to an MCP server with role-based access control, a shared Cognito pool serving both machine-to-machine (M2M) and user-scoped auth flows, CDK infrastructure-as-code, and a unified evaluation script. The complete reference implementation is available in the accompanying repository.
What this covers
- Deploying an agent + MCP server to AgentCore runtime using CDK.
- Role-based access control on MCP tools (three-layer auth pattern).
- Invoking OAuth-protected runtimes from CI (M2M client_credentialsflow).
- Running on-demand evaluations with built-in evaluators.
- Enforcing a quality gate that blocks merges on regression.
- Handling the OAuth challenge: how CI pipelines authenticate without user context.
Key concepts
Before diving in, here’s a quick primer on the building blocks. Skip ahead if you’re already familiar with them.
- AgentCore runtime is a managed hosting platform for AI agents. You deploy your agent code (Python, any framework), and AgentCore handles scaling, session isolation, and infrastructure. Think of it as AWS Lambda for agents.
- AgentCore Evaluations, a capability of Amazon Bedrock AgentCore, scores agent behavior using a large language model (LLM) as a judge. It reads OpenTelemetry traces from Amazon CloudWatch and rates responses on dimensions like helpfulness, correctness, and tool selection accuracy.
- MCP (Model Context Protocol) is an open protocol that agents use to call external tools through a standardized interface. An MCP server exposes tools. The agent discovers and calls them. AgentCore runtime can host MCP servers and connect agents to them.
- OpenID Connect (OIDC) federation is how GitHub Actions assumes an AWS Identity and Access Management (AWS IAM) role without storing long-lived credentials. GitHub issues a short-lived token, AWS validates it, and the workflow gets temporary credentials.
- Quality Gate is a CI/CD pattern where a pipeline step must pass a threshold before the build can proceed. In our case, the agent’s evaluation scores must meet a minimum bar (for example, 0.8 out of 1.0) or the PR stays blocked.
Why this matters: Without automated evaluation, agent quality is subjective. A developer changes a system prompt. The agent starts giving worse answers, and nobody notices until users complain. A quality gate catches this at PR time before it reaches production.
The problem
Here’s the scenario. You have an agent deployed on AgentCore runtime. It calls tools through an MCP server where some tools are public. Others are restricted by user role. Every time someone changes the system prompt, swaps a model, or updates tool configurations, you want to know: did the agent get better or worse?
Manual testing doesn’t scale. You need automated evaluation in CI. That means automatically deploying the agent in a dev environment, invoking it with representative prompts, scoring the responses, and blocking the merge if quality drops.
The complication: your MCP server uses OAuth with role-based access control. CI pipelines don’t have user context. How do you authenticate a headless pipeline against an OAuth-protected agent that forwards tokens to an MCP server expecting user roles?
AgentCore Evaluations: Where it fits
AgentCore Evaluations is the quality measurement layer in the Amazon Bedrock AgentCore platform. It sits alongside AgentCore runtime, which hosts your agent, and AgentCore Observability, a capability of Amazon Bedrock AgentCore that captures traces, completing the build → deploy → observe → evaluate lifecycle.
The service scores agent interactions using LLM-as-a-judge by default, with an option for code-based evaluation via AWS Lambda. It operates on OpenTelemetry traces, the same traces your agent already emits through AgentCore Observability. For on-demand evaluation, you provide span data directly in the API call; online and batch evaluation read from CloudWatch.
Three evaluation modes cover different stages:
- On-demand evaluation evaluates specific sessions at any time. You provide span data, pick your evaluators, and get scores back. This is what powers CI/CD quality gates, the focus of this post.
- Online evaluation continuously monitors production traffic with configurable sampling rates. Results feed into CloudWatch dashboards for trend monitoring.
- Batch evaluation scores multiple sessions in a single asynchronous job. You point it to your CloudWatch Logs, pick your evaluators, and get aggregate plus per-session results. This is what powers baseline measurement and pre/post regression testing.
Evaluators come in four categories:
- Built-in evaluators cover common quality dimensions: Helpfulness, Correctness, GoalSuccessRate, ToolSelectionAccuracy, ToolParameterAccuracy, and more. They operate at session, trace, and tool-call levels. Three trajectory evaluators (TrajectoryExactOrderMatch,TrajectoryInOrderMatch,TrajectoryAnyOrderMatch) compare actual tool-call sequences against expected trajectories.
- Custom evaluators use your own LLM-as-a-judge prompts for domain-specific scoring. Ground truth fields (expectedResponse, assertions, expectedTrajectory) are available as placeholders in custom evaluator prompts too.
- Code-based evaluators run a Lambda function against each trace or session and return a score, label, and explanation calculated by your custom implementation. Use them for deterministic checks like regex matching, schema validation, or keyword presence without LLM costs.
- Third-party evaluators from the DeepEval and AutoEval open-source libraries are managed by the service like built-in evaluators. Select one by ID with no model or configuration required. You can also derive a custom evaluator from a built-in or third-party evaluator to run its logic on your own model.
The Evaluate API accepts sessionSpans (OpenTelemetry trace data from CloudWatch) and returns structured scores. Each evaluate() call must contain spans from a single session only. Mixing sessions causes a ValidationException.
The API also accepts optional ground truth through evaluationReferenceInputs. You can provide an expectedResponse (used by Correctness), assertions (used by GoalSuccessRate), or an expectedTrajectory (used by trajectory evaluators). Traces without ground truth fall back to ground-truth-free evaluation, so you only need to provide it for the turns you care about.
Architecture
The pipeline deploys two AgentCore runtimes behind a shared Cognito user pool. One AgentCore runtime for the Strands agent and one for the MCP server:
A single Cognito user pool serves two auth flows:
The GitHub Actions pipeline deploys the agent stack to a dev environment, retrieves a JWT token from the provisioned Cognito instance to authenticate API calls, invokes the agent with an evaluation dataset, and analyzes the generated traces in Amazon CloudWatch Logs to assess performance against defined thresholds. It automatically approves or blocks the PR based on whether the overall score meets the acceptance criteria.
Handling OAuth-protected MCP servers in CI
When your agent calls an MCP server protected by OAuth, CI pipelines face a challenge: they don’t have user context. The MCP server expects a JWT with role claims, but a headless CI runner can’t complete an interactive OAuth consent flow.
There are three approaches for evaluating the agent, each with different trade-offs:
Approach A: Evaluate stored traces
Decouple evaluation from live MCP calls entirely. A staging pipeline runs the agent with representative prompts, captures traces, and commits them as JSON fixtures. PR-time, CI evaluates those stored traces. No live invocation is needed.
The Evaluate API doesn’t need a live agent. It scores OpenTelemetry spans you provide. Your CI pipeline becomes deterministic (check existing traces) and you sidestep the OAuth problem completely.
Trade-off: You’re evaluating the staging deployment’s behavior, not the code in the current PR. The accompanying repo includes scripts/evaluate_stored_traces.py and sample fixtures in fixtures/ to get started with this approach.
Approach B: Service account with pre-authorized consent
Create a dedicated test user in your identity provider. Complete the OAuth consent flow once (interactively), cache the refresh token in AWS Secrets Manager. CI uses this token to invoke the agent as that test user.
Trade-off: Refresh tokens expire. You need a rotation mechanism or periodic manual re-consent.
Approach C: M2M auth (this post’s approach)
Configure your MCP servers to support both M2M and user-scoped grant types. CI uses M2M tokens while interactive users go through the standard OAuth consent flow.
The MCP server middleware distinguishes between token types: M2M tokens contain scopes but no roles, so role checks are bypassed, and all tools are accessible. User tokens carry custom:roles claims, so tool-level access control is enforced. This bypass is secure because M2M tokens require a client secret that’s never exposed to end users. Only CI pipelines and the agent runtime can obtain these tokens, preventing untrusted callers from acquiring role-less tokens.
Trade-off: M2M tokens bypass role checks by design. If you need CI to test role enforcement specifically, use Approach B.
Use the decision t
