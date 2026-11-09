---
id: articles/figma-documentation/ad5cff23cc.md
url: "https://developers.figma.com/docs/figma-mcp-server/"
url_hash: "ad5cff23cc"
kind: "documentation"
source: "Figma documentation"
title: "Introduction | Developer Docs"
author: ""
date: ""
tier: 1
method: "primary-docs"
extracted_at: "2026-09-11T15:58:29.032420+00:00"
chars: 2384
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
source_pack: "primary-docs"
collected_at: "2026-09-11T15:58:29.021860Z"
engagement_goal: "As of August-September 2026, what are the capabilities, limitations, and extensibility points of Figma (the design tool) agents and MCP server for agentic workflows, skills, webhooks, notifications, and design-system integration? Scour Figma's own documentation."
content_hash: "9f3891b80fdf5484"
chunks:
  - id: "articles/figma-documentation/ad5cff23cc.md#c0"
    char_span: [0, 2502]
    sentence_count: 18
    key_terms: [figma, mcp, server, code, design, components, directly, connect]
    concepts: [figma, server, design, components, directly]
    token_count: 494
    sources: [{"n":"Figma documentation","u":"https://developers.figma.com/docs/figma-mcp-server/","kind":"documentation"}]
---
# Introduction | Developer Docs

Source: [Figma documentation](https://developers.figma.com/docs/figma-mcp-server/)

Introduction
The Figma MCP server brings Figma directly into your workflow by providing important design information and context to AI agents generating code from Figma design files, and by enabling agents to write native Figma content back to the canvas.
MCP servers are part of a standardized interface for AI agents to interact with data sources using the Model Context Protocol.
With the server enabled, you can:
- 
Write to the canvas: Create and modify native Figma content directly from your MCP client. With the right skills, agents can build and update frames, components, variables, and auto layout in your Figma files using your design system as the source of truth. 
- 
Generate code from selected frames: Select a Figma frame and turn it into code. Great for product teams building new flows or iterating on app features. 
- 
Extract design context: Pull in variables, components, and layout data directly into your IDE. This is especially useful for design systems and component-based workflows. 
- 
Retrieve Make resources: Gather code resources from Make files and provide them to the LLM as context. This can help as you move from prototype to production application. 
- 
Keep your design system components consistent with Code Connect: Boost output quality by reusing your actual components. Code Connect keeps your generated code consistent with your codebase. 
How to connect
We recommend using the Remote MCP server, which connects directly to Figma’s hosted endpoint without requiring the Figma desktop app. The remote MCP server also provides the broadest set of features.
Follow the steps in Remote server installation to get started.
If you want to use write to Figma workflows, you should also install Figma’s skills for your MCP client. These skills help your agent use the write tools more reliably and follow the right workflow when creating or updating content in Figma.
For specific organization and enterprise needs, Figma also provides a desktop version of the MCP server that runs locally, but the remote version is the best choice for most users.
Figma for Government supports the desktop server only. See Figma for Government for the available tools and current limitations.
Only clients listed in the Figma MCP Catalog can connect to the Figma MCP Server. If you're a developer interested in connecting a new MCP client, you can join the waitlist.
