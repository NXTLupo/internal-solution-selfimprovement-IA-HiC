---
id: articles/aws-ml-blog/a8b208cbbf.md
url: "https://aws.amazon.com/blogs/machine-learning/building-a-restaurant-telephony-ai-host-with-amazon-connect/"
url_hash: "a8b208cbbf"
kind: "article"
source: "aws_ml_blog"
title: "Building a restaurant telephony AI host with Amazon Connect"
author: ""
date: "Mon, 24 Aug 2026 16:13:09 +0000"
tier: 2
method: "source-native"
extracted_at: "2026-08-26T19:33:42.897849+00:00"
chars: 10000
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
collected_at: "2026-08-26T19:33:42.181Z"
relevance: 0
engagement_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
content_hash: "03b1f9c99832d5e6"
relevance_by_goal: {"8429cfd39d4f":0,"d21cb50b17ba":0}
chunks:
  - id: "articles/aws-ml-blog/a8b208cbbf.md#c0"
    char_span: [0, 192]
    sentence_count: 1
    key_terms: [building-a-restaurant-telephony-ai-host-with-amazon-connect, amazon, machine-learning, restaurant, telephony, building, connect, source]
    concepts: [amazon]
    token_count: 45
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/building-a-restaurant-telephony-ai-host-with-amazon-connect/","kind":"article","date":"2026-08-24"}]
  - id: "articles/aws-ml-blog/a8b208cbbf.md#c1"
    char_span: [194, 2774]
    sentence_count: 16
    key_terms: [amazon, connect, backend, conversation, phone, agent, voice, agentic]
    concepts: [amazon, connect, backend, conversation, phone]
    related_chunks: ["articles/aws-ml-blog/a8b208cbbf.md#c2", "articles/aws-ml-blog/a8b208cbbf.md#c3", "articles/aws-ml-blog/a8b208cbbf.md#c4", "articles/aws-ml-blog/a8b208cbbf.md#c5"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/building-a-restaurant-telephony-ai-host-with-amazon-connect/","kind":"article","date":"2026-08-24"}]
  - id: "articles/aws-ml-blog/a8b208cbbf.md#c2"
    char_span: [2450, 5089]
    sentence_count: 14
    key_terms: [amazon, connect, agent, backend, conversation, voice, agentic, gateway]
    concepts: [amazon, connect, agent, backend, conversation]
    related_chunks: ["articles/aws-ml-blog/a8b208cbbf.md#c1", "articles/aws-ml-blog/a8b208cbbf.md#c3", "articles/aws-ml-blog/a8b208cbbf.md#c4", "articles/aws-ml-blog/a8b208cbbf.md#c5"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/building-a-restaurant-telephony-ai-host-with-amazon-connect/","kind":"article","date":"2026-08-24"}]
  - id: "articles/aws-ml-blog/a8b208cbbf.md#c3"
    char_span: [4747, 7338]
    sentence_count: 21
    key_terms: [amazon, connect, section, agent, agentic, gateway, caller, number]
    concepts: [amazon, connect, section, agent, agentic]
    related_chunks: ["articles/aws-ml-blog/a8b208cbbf.md#c1", "articles/aws-ml-blog/a8b208cbbf.md#c2", "articles/aws-ml-blog/a8b208cbbf.md#c4", "articles/aws-ml-blog/a8b208cbbf.md#c5"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/building-a-restaurant-telephony-ai-host-with-amazon-connect/","kind":"article","date":"2026-08-24"}]
  - id: "articles/aws-ml-blog/a8b208cbbf.md#c4"
    char_span: [7029, 9522]
    sentence_count: 10
    key_terms: [amazon, connect, call, caller, conversation, agent, aws, flow]
    concepts: [amazon, connect, conversation, caller, agent]
    related_chunks: ["articles/aws-ml-blog/a8b208cbbf.md#c1", "articles/aws-ml-blog/a8b208cbbf.md#c2", "articles/aws-ml-blog/a8b208cbbf.md#c3", "articles/aws-ml-blog/a8b208cbbf.md#c5"]
    token_count: 512
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/building-a-restaurant-telephony-ai-host-with-amazon-connect/","kind":"article","date":"2026-08-24"}]
  - id: "articles/aws-ml-blog/a8b208cbbf.md#c5"
    char_span: [9194, 10194]
    sentence_count: 6
    key_terms: [amazon, connect, boundary, agentic, caller, number, speech, agent]
    concepts: [amazon, connect, boundary, agentic, caller]
    related_chunks: ["articles/aws-ml-blog/a8b208cbbf.md#c1", "articles/aws-ml-blog/a8b208cbbf.md#c2", "articles/aws-ml-blog/a8b208cbbf.md#c3", "articles/aws-ml-blog/a8b208cbbf.md#c4"]
    token_count: 188
    sources: [{"n":"aws_ml_blog","u":"https://aws.amazon.com/blogs/machine-learning/building-a-restaurant-telephony-ai-host-with-amazon-connect/","kind":"article","date":"2026-08-24"}]
---
# Building a restaurant telephony AI host with Amazon Connect

Source: [aws_ml_blog](https://aws.amazon.com/blogs/machine-learning/building-a-restaurant-telephony-ai-host-with-amazon-connect/)

Artificial Intelligence
Building a restaurant telephony AI host with Amazon Connect
At many restaurants, a large share of orders still arrive by phone, and those calls usually land on a staff member who is already taking care of customers at the counter. Callers wait on hold, orders get written down by hand, and busy periods make both worse. Adding an app or a website helps customers who prefer to order online, but it does nothing for the person who wants to call and order.
In this post, we show you how to build a voice ordering system that answers a phone number and takes the order from greeting to confirmation, with no app, no website, and no sign-in. A caller dials a phone number, and an AI host greets them, answers menu questions, finds a nearby pickup location, and confirms the order out loud. The system uses Amazon Connect Customer for the telephony channel, Amazon Lex V2 with Amazon Connect Agentic Voice for real-time speech, and Amazon Connect Customer AI agents to orchestrate the conversation, connected to a restaurant backend through the Model Context Protocol (MCP) and Amazon Bedrock AgentCore.
This solution handles the telephony channel specifically. The audio arrives over the phone network rather than a browser, and the system identifies the caller by phone number rather than by a login. The solution builds the agent logic and the backend services as separate modules, so the ordering logic stays independent from the channel that calls it.
The walkthrough shows you how to:
- Deploy the system with AWS Cloud Development Kit (AWS CDK)
- Answer an inbound phone call with Amazon Connect and route it through a contact flow.
- Provide real-time speech recognition and synthesis with Amazon Connect Agentic Voice (Advanced ASR and TTS)
- Orchestrate the conversation and backend tool calls with an Amazon Connect AI agent.
- Keep the conversation safe and on topic with an Amazon Connect AI Guardrail.
- Connect the agent to backend services as discoverable tools through AgentCore Gateway and MCP.
Amazon Connect Agentic Voice provides the speech layer natively in Amazon Connect, handling speech recognition for listening and text-to-speech for speaking. The Amazon Lex V2 bot uses it for both, while an Amazon Connect AI agent handles the reasoning and the calls to the backend. A later section covers how Agentic Voice speeds up turn-taking.
Solution overview
The design keeps three things apart. Amazon Connect handles the call, an Amazon Connect AI agent runs the conversation, and the backend holds the menu, carts, orders, and locations. A call comes in through Amazon Connect, a contact flow opens an Amazon Connect AI agent session and connects the caller to the agent. Amazon Connect Agentic Voice provides speech recognition and synthesis throughout the call, the AI agent reasons over the conversation, and it reaches the backend through MCP tools exposed by AgentCore Gateway. Because MCP is an open standard for connecting an agent to external tools, the backend can change without touching the agent.
In this solution, the contact flow, the Amazon Lex V2 speech layer (Amazon Connect Agentic Voice), and the Amazon Connect AI agent are all provisioned and managed through Amazon Connect. You do not stand them up as separate services. A single Amazon Connect deployment brings the telephony, the speech, and the AI agent together. The AgentCore Gateway and the restaurant backend are the parts you build and integrate yourself.
The solution deploys the following:
- Amazon Connect Customer provides the inbound telephony, the contact flow, and the phone number that accepts calls.
- Amazon Lex V2 hosts the voice bot that the contact flow connects the caller to. It uses Amazon Connect Agentic Voice for speech and routes each turn to the AI agent.
- Amazon Connect Agentic Voice handles Advanced ASR (with confidence-based end-of-turn detection) and expressive TTS, natively in Amazon Connect.
- Amazon Connect Customer AI agents provide the orchestration AI agent that drives the conversation, powered by Anthropic Claude Haiku 4.5 in Amazon Bedrock.
- Amazon Connect AI Guardrails keep the conversation safe and on topic with content filters, denied topics, and profanity filtering.
- AgentCore Gateway exposes the backend APIs as MCP tools the agent can discover and call by name.
- Amazon AppIntegrations registers the AgentCore Gateway as an MCP application the AI agent can use.
- Amazon API Gateway fronts the backend with REST endpoints secured by AWS Identity and Access Management (IAM).
- AWS Lambda runs the business logic for menus, carts, orders, and location lookups, and pushes the caller’s phone number into the agent session.
- Amazon DynamoDB stores customer profiles, orders, menu items, carts, and locations.
- Amazon Location Service provides geocoding and route calculation for pickup recommendations.
Architecture diagram
Figure 1 shows the solution, which is organized into four sections.
Section A, backend infrastructure. This section deploys the restaurant backend. Amazon DynamoDB holds the customer, order, menu, cart, and location data, and Amazon Location Service handles addresses and routing. AWS Lambda runs the business logic, and Amazon API Gateway exposes it with IAM authorization. Resources deploy in dependency order.
Section B, AgentCore Gateway. This section provisions an AgentCore Gateway that reads the REST API’s OpenAPI schema at deploy time and registers each endpoint as a named MCP tool. The gateway uses custom JSON Web Token (JWT) authorization and validates inbound tokens against the Amazon Connect instance.
Section C, Amazon Connect instance and AI agent. This section creates the Amazon Connect instance, the Amazon Connect AI Agents assistant, and the orchestration AI agent. It registers the AgentCore Gateway as an MCP server in Amazon AppIntegrations and creates an Amazon Lex V2 bot with Amazon Connect Agentic Voice for Advanced ASR. It then defines the AI Guardrail with content safety policies, defines the AI agent with the Anthropic Claude Haiku 4.5 system prompt and the guardrail attached, publishes the agent version, and associates a security profile that grants the agent access to the backend tools.
Section D, Amazon Connect telephony. This section creates the contact flow and claims the phone number. The contact flow is the entry point for every inbound call. It enables logging, sets Agentic Voice for text-to-speech, and captures the caller’s phone number. It then opens an Amazon Connect AI agent session, pushes the caller’s phone number into that session with a Lambda function so the agent can identify the caller, plays the greeting, and connects the caller to the Amazon Lex V2 bot. The Lex bot provides the real-time speech layer, using Agentic Voice Advanced ASR to listen and Agentic Voice TTS to speak, while the AI agent handles reasoning and tool calls.
The numbered callouts in Figure 1 trace the solution end to end:
- A call is initiated to the phone number provisioned by Amazon Connect, either by a customer or forwarded from another line.
- The Amazon Connect contact flow sets the Agentic Voice, captures the caller’s phone number, opens an Amazon Connect AI Agents session, pushes the caller’s phone number into the session, and plays the greeting to the caller.
- The contact flow connects the caller to the Amazon Lex V2 bot with Amazon Connect Agentic Voice for speech recognition and synthesis throughout the conversation.
- Amazon Lex V2 routes the conversation to Amazon Connect AI Agents, delegating the conversation logic to the orchestration AI agent.
- The Amazon Connect AI agent, powered by Anthropic Claude Haiku 4.5 in Amazon Bedrock and protected by an AI Guardrail for content safety, drives the conversation, resolving the caller’s location, fetching the menu, managing the cart, and placing the order.
- The AI agent calls the available tools through Amazon Bedrock AgentCore Gateway using the MCP protocol.
- AgentCore Gateway forwards each tool call to Amazon API Gateway, which routes the request to the appropriate AWS Lambda function.
- AWS Lambda reads and writes Amazon DynamoDB for cart, order, menu, and location data, and calls Amazon Location Service for geocoding and nearest-location lookup.
- AWS CDK deploys all eight stacks in a single script.
- Amazon CloudWatch provides centralized monitoring, logging, and alerting across all services, and all data at rest is encrypted using AWS Key Management Service (AWS KMS).
Callouts 1 through 8 happen during a single phone call, callout 9 covers how the solution is built and deployed, and callout 10 covers how it is monitored and secured. The following section sets deployment and operations aside and gets closer to the call itself.
Inbound call flow
This section follows one call from the caller’s side, from the first ring to the spoken reply. It is the same runtime path as callouts 1 through 6 in Figure 1. Figure 2 shows it as a sequence so the order of events is more straightforward to see.
Figure 2: Inbound call flow, with the components inside the Amazon Connect boundary.
The dashed boundary marks what Amazon Connect provides. The contact flow, the Amazon Lex V2 speech layer (Amazon Connect Agentic Voice), and the Amazon Connect AI agent all come from one Amazon Connect deployment, so you configure them through Amazon Connect rather than as standalone services. The AgentCore Gateway sits outside the boundary and connects the agent to your backend.
The numbered steps in Figure 2 correspond to these stages of the call:
- The caller dials the phone number, and Amazon Connect answers.
- The Amazon Connect contact flow sets the Agentic Voice, captures the caller’s phone number, opens an Amazon Connect AI agent session, pushes the number into that session, and plays the greeting before connecting the caller to the speech layer.
- Amazon Connect Agentic Voice provides speech recognition and synthesis throughout the conversation, passing each turn
