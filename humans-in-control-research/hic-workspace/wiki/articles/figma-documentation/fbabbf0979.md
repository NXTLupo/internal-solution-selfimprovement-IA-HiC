---
id: articles/figma-documentation/fbabbf0979.md
url: "https://help.figma.com/hc/en-us/articles/41061095668759-Xcode-and-Figma-Set-up-the-MCP-server"
url_hash: "fbabbf0979"
kind: "documentation"
source: "Figma documentation"
title: "Xcode and Figma: Set up the MCP server"
author: ""
date: ""
tier: 1
method: "primary-docs"
extracted_at: "2026-09-11T15:55:28.206273+00:00"
chars: 1931
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
source_pack: "primary-docs"
collected_at: "2026-09-11T15:55:28.199562Z"
engagement_goal: "As of August-September 2026, what are the capabilities, limitations, and extensibility points of Figma (the design tool) agents and MCP server for agentic workflows, skills, webhooks, notifications, and design-system integration? Scour Figma's own documentation."
content_hash: "4c0ef554ce21bedf"
chunks:
  - id: "articles/figma-documentation/fbabbf0979.md#c0"
    char_span: [0, 2100]
    sentence_count: 19
    key_terms: [figma, server, xcode, mcp, plugin, set, beta, use]
    concepts: [figma, server, xcode, plugin, install]
    token_count: 489
    sources: [{"n":"Figma documentation","u":"https://help.figma.com/hc/en-us/articles/41061095668759-Xcode-and-Figma-Set-up-the-MCP-server","kind":"documentation"}]
---
# Xcode and Figma: Set up the MCP server

Source: [Figma documentation](https://help.figma.com/hc/en-us/articles/41061095668759-Xcode-and-Figma-Set-up-the-MCP-server)

The Figma MCP server gives Xcode structured access to Figma files and tools. It can read design context such as components, variables, layout data, FigJam content, and Make resources, generate code from selected frames, use Code Connect to stay aligned with real components. When moving from Xcode to Figma, you can also write directly to the canvas to create or update native Figma content, and send live web interfaces to Figma as editable layers.
Jump to the setup instructions →
Note: The Figma MCP server is only supported in the Xcode 27 beta app. See Apple's Dev Tools announcement.
This article describes how to set up the Figma MCP server in Xcode. To learn more about the features of the Figma MCP server and how to use it, see:
Figma also includes a SwiftUI skill to use with the Figma MCP server in Xcode. See Figma skills for MCP.
Note: Make sure to install Xcode before you set up the server: Download and install Xcode 27 beta. The Figma MCP server is only supported by Xcode 27 beta.
The recommended way to set up the Figma MCP server in Xcode is by installing the Figma plugin, which includes MCP server settings as well as Agent Skills for common workflows.
First, make sure that the Xcode 27 beta app is open.
To install the Figma plugin, use Xcode's one-click setup and authorize the MCP server for your Figma account: One-click setup
Once added, click Sign in... next to the Figma plugin entry to authorize your Figma account.
If you want to confirm the plugin is installed: In Xcode, go to Settings, and then click Intelligence. The Figma plugin will be listed in the Plug-ins section.
If you prefer, you can manually set up the remote Figma MCP server. There's no difference in functionality if you follow the manual steps.
In Xcode:
https://github.com/figma/mcp-server-guide
If you're coming from the Figma MCP collection, jump back into the previous article.
For more about using the Figma MCP server, see:
