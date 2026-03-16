# Microsoft Copilot Studio and Power Platform: The 2025-2026 Landscape

Microsoft's Power Platform underwent a structural transformation in 2025-2026. Copilot Studio evolved from a chatbot builder into a full AI agent orchestration platform. Generative orchestration became the default paradigm, agent flows introduced Copilot Credit-based billing, multi-agent collaboration matured, and Teams integration deepened.

Simultaneously:

- **Power Apps** adopted an agent-first architecture with generative pages and MCP server support.
- **Power Automate** remained the deterministic execution backbone connecting agents to enterprise systems.

This document covers major capabilities, limits, architectural patterns, and integration models as of February 2026.

---

# Orchestration: Classic vs. Generative -- Complete Decision Guide

Agents can use either **generative** or **classic** orchestration. By default, newly created agents use generative orchestration. The choice between them is the most consequential architectural decision in any Copilot Studio agent build.

> **Important**: If you create an agent from a prebuilt agent, the prebuilt agent's configuration determines which orchestration method is used. If an admin turns off generative orchestration in an environment, agents in that environment can only use classic orchestration.

## Side-by-Side Behavior Comparison

| Behavior | Generative Orchestration | Classic Orchestration |
|---|---|---|
| **Topic selection** | Based on topic description and purpose | Based on matching user query with trigger phrases |
| **Child/connected agents** | Selected based on their description | Not applicable |
| **Tools** | Agent chooses to call tools based on name and description | Tools can only be called explicitly from within a topic |
| **Knowledge** | Agent proactively searches knowledge to answer queries | Knowledge used as fallback when no topics match (or called explicitly from a topic) |
| **Multi-source responses** | Agent combines topics, tools, and knowledge in one turn | Agent tries to select a single topic, falling back to knowledge |
| **Asking users for input** | Agent auto-generates questions for missing tool/topic inputs | Maker must author Question nodes in topics |
| **Responding to users** | Agent auto-generates responses using all available info | Maker must author Message nodes in topics (or call a tool) |

## Generative Orchestration -- How It Works

### Selection Mechanism
When a user sends a message, the orchestrator selects one or more tools, topics, other agents, or knowledge sources to prepare a response. The most important factor is the **description** of the topics, tools, agents, and knowledge sources. Other factors include the **name**, any **input/output parameters**, and **their names and descriptions**. Descriptions make it possible for the agent to accurately associate user intent without predicting all possible phrasings.

The agent can select **multiple** tools, topics, or knowledge sources to handle multi-intent queries or to autonomously respond to event triggers. If multiple are selected, they execute **in sequence**, after generating any questions to ask the user for missing information.

### Response Generation
The agent takes information returned from all knowledge sources, tools, agents, and topics it selected, and **summarizes an answer** to the originating user query. Because the agent generates responses, you can make topics more flexible by **not** sending a final Message node, but instead returning the result as an **output variable** -- letting the orchestrator provide contextual responses.

### Conversation Context
The agent uses **recent conversation history** to influence decisions. This means responses may differ between a fresh conversation vs. an ongoing one (e.g., a new test pane conversation vs. a long-running Teams conversation). This is expected behavior -- it allows follow-up questions and avoids re-asking for information already provided.

### Turning Generative Orchestration On/Off
- **Settings page** -> **Generative AI** section -> **Orchestration** -> "Use generative AI orchestration for your agent's responses?" -> **Yes** or **No**
- When switching to generative orchestration on an existing classic agent, Copilot Studio **auto-generates descriptions** from trigger phrases. Review and refine these.
- The topic trigger changes from "User says a phrase" to "**The agent chooses**" -- allowing you to add/edit the description.

## Classic Orchestration -- How It Works

Classic orchestration uses predefined workflows and rule-based matching:

1. **Trigger Phrases**: Topics are selected by matching user queries against authored trigger phrases
2. **Actions**: Can only be called **explicitly from within a topic** (no autonomous tool selection)
3. **Knowledge**: Used as **fallback** when no topics match, or called explicitly from a topic
4. **User Input**: **Question nodes** in topics prompt users for required information
5. **Response Generation**: **Message nodes** in topics deliver authored responses or call actions

Classic orchestration is ideal for scenarios where **reliability and predictability** are paramount -- it follows a well-defined path, reducing unexpected outcomes. However, it struggles to adapt to dynamic scenarios or unexpected queries outside predefined rules.

## When to Use Which -- Decision Matrix

| Factor | Classic Orchestration | Generative Orchestration |
|---|---|---|
| **Predictability & control** | High -- exact path every time | Lower -- LLM decides path |
| **Implementation complexity** | Low -- explicit topics/nodes | Higher -- requires good descriptions |
| **Flexibility** | Low -- rigid trigger matching | Medium -- handles varied phrasings |
| **Maintenance burden** | Medium -- update triggers manually | Low -- descriptions are durable |
| **Best for** | Repetitive, structured processes (forms, approvals, data entry) | Dynamic queries, multi-intent, knowledge-heavy agents |
| **Worst for** | Free-form exploration, varied user phrasings | Processes requiring exact deterministic control |

### Use Classic Orchestration When:
- The agent performs **rigid, structured workflows** (e.g., expense approvals, form submissions)
- Every conversation must follow an **exact, predictable path** -- no variation allowed
- The organization requires **auditability** of every decision the agent makes
- Users interact via **constrained interfaces** (IVR menus, button-only cards)
- The admin has **disabled generative orchestration** in the environment

### Use Generative Orchestration When:
- Users ask **varied, unpredictable questions** across multiple domains
- The agent needs to **combine knowledge + tools + topics** in a single response
- **Multi-intent queries** are common ("find my nearest store and check the weather there")
- The agent should **autonomously decide** which tools to call based on context
- You want to **reduce topic authoring burden** (descriptions instead of 20+ trigger phrases)
- The agent uses **child/connected agents** for delegation

## Authoring Best Practices for Generative Orchestration

### Description Writing Rules

1. **Simple and direct language** -- avoid jargon, slang, or technical terms
2. **Active voice, present tense** -- "This tool provides weather information" NOT "Weather information is provided by this tool"
3. **Keywords matching user intent** -- if a tool provides weather info, include "weather," "forecast," "temperature," "rain," "snow"
4. **Short, informative summaries** -- 1-2 sentences explaining what the tool/topic does and how it benefits the user
5. **Descriptive, unique names** -- "Weather Forecast" not "Weather" (avoid generic or ambiguous names)
6. **Specific language to prevent overlap** -- if two topics are similar, include what each CAN'T do:
   - "Current Weather" -> "Provides current weather for any location. **It doesn't get forecasts for future days.**"
   - "Weather Forecast for Tomorrow" -> "Provides next-day weather forecast. **It doesn't get current weather for today.**"

### Preventing Topic Overlap
If multiple topics have similar descriptions, the agent might invoke them all. To prevent this:
- Test thoroughly and revise overlapping descriptions
- Include explicit **exclusions** in descriptions ("This topic does NOT handle...")
- Use different naming patterns for similar topics

## More Control Options for Generative Orchestration

### Canceling the Current Plan
Use the **End all topics** node within a topic to cancel any remaining steps the orchestrator planned.

### Topic Triggers for Generative Orchestration
- **AI response generated** -- fires when the agent generates a response
- **Plan complete** -- fires when the agent performed all planned steps

### Controlling Conversation History
Agents use recent conversation history for decisions. Clear it using a **Clear variable values** node with option **"Conversation history for the current session"**.

## Known Limitations (Generative Orchestration)

- **No Conversational Boosting system topic** -- modifications to this system topic are ignored; classic data sources configured in generative answers nodes are also ignored
- **No custom entity support** for topic/tool input parameters -- closed lists and regex entities cannot be used as inputs. Use Question nodes in topics to collect information using custom entities
- **No disambiguation** -- the Multiple Topics Matched system topic is not called. Leave it enabled so your agent auto-starts disambiguating when this is resolved
- **Limited conversation history window** -- the agent may not see earlier conversation parts. Key information may need to be collected again or included in the transcript at regular intervals
- Maximum **128 tools** per agent (25-30 recommended for reliable routing)
- Generative orchestration **not available** if admin disables it in the environment

## Capabilities (Both Modes)

- Activity map for inspecting execution during testing
- Model selection:
  - GPT-4.1 (default as of Oct 2025)
  - GPT-5 Chat GA (Nov 2025, EU/US)
  - GPT-5 Reasoning (preview)
  - Experimental models
- Multilingual support -- content generated in the currently active language (primary or secondary). Language auto-detected from client/browser

---

# Tools Framework: Unified Agent Extensibility

Introduced at Build 2025, **Tools** unify extensibility under one model.

## Six Tool Types

1. Connector (prebuilt or custom)
2. Agent flow
3. Prompt (single-turn model-based)
4. REST API
5. MCP (Model Context Protocol, preview)
6. Computer use (GUI automation, preview)

## Power Automate as Tool Requirements

Flow must:

- Use trigger: **"When an agent calls the flow"**
- Use response: **"Respond to the agent"**
- Have asynchronous response disabled
- Respond within 100 seconds

Actions after "Respond to agent" may run up to 30 days asynchronously.

## Tool Completion Modes

After execution, tools can:

- **Don't respond (default)** -- Agent incorporates output
- **Write response with generative AI**
- **Send specific response** (templated + Power Fx)
- **Send Adaptive Card**

## Tool Configuration Options

- Authentication:
  - End user credentials
  - Maker credentials
- "Ask before running" confirmation
- AI-driven input filling (default: dynamic extraction from context)

---

# Agent Flows: Deterministic Automation in Copilot Studio

GA March 31, 2025.

Agent flows are automated sequences of actions triggered by specific events or conditions. They help streamline repetitive tasks, improve efficiency, and ensure consistency. They replicate ~98% of cloud flow functionality but are billed under Copilot Credits with key differences.

## Agent Flows vs. Topics vs. Cloud Flows

| Aspect | Agent Flows | Topics | Cloud Flows (Power Automate) |
|--------|-------------|--------|------------------------------|
| Optimized for | Business process automation | Conversational flows | General workflow automation |
| Deterministic | Yes -- same inputs -> same output | Yes -- same inputs -> same output | Yes |
| Licensing | Copilot Credits (consumption-based) | Copilot Studio license | Power Automate license required |
| AI Actions | Native LLM + Prompt Builder | Generative orchestration | Standard connectors |
| Sharing/Co-owners | NOT supported | N/A | Supported |
| Run-only permissions | NOT supported | N/A | Supported |
| Can be copied | No | N/A | Yes |
| Created in | Copilot Studio Flows page | Copilot Studio Topics page | Power Automate portal |
| Premium connectors | Yes (agent flows are premium) | N/A | Requires premium license |
| Desktop flows | NOT supported from agent flows | N/A | Supported |

## Agent Flow Requirements (to work as a tool with agents)

1. Must have trigger: **"When an agent calls the flow"**
2. Must have response action: **"Respond to the agent"**
3. Must respond in **real time** (Asynchronous response toggle -> **Off** in Respond to agent -> Settings -> Networking)
4. Must respond within **100-second action limit**
5. Must be stored in a **solution** in the same Power Platform environment as the agent
6. Actions placed AFTER "Respond to the agent" can run up to **30 days** asynchronously

## Supported Parameter Types (Input/Output)

Only these types are supported for passing data between agents and flows:

| Supported | NOT Supported |
|-----------|---------------|
| Number | Object |
| String (Text) | Date |
| Boolean | Timestamp |
| | List [String] |
| | List [Number] |
| | List [Boolean] |
| | List [Object] |
| | List [Date] |
| | List [Timestamp] |

**CRITICAL LIMIT**: An agent can only receive up to **1 MB of data** from a flow in a single action. No limit on data sent TO a flow.

## Two Methods for Calling Flows from Agents

### Method A: Agent-Level Tool (Orchestrator Decides)

When added at the agent level, the orchestrator triggers the flow automatically at runtime based on conversation context.

Steps:
1. In Copilot Studio -> select Agents -> select the target agent
2. Go to the **Tools** page -> click **Add a tool**
3. Select **Flow** to list available published agent flows
4. Select the flow -> click **Add and configure**
5. Configure:
   - **Name and Description**: Clear description for orchestrator routing (e.g., "Get today's weather forecast at a provided city name or zip code")
   - **Inputs**: How agent fills variable values (from context or explicit)
   - **Completion**: What agent does after tool finishes (Don't respond / Write response / Send specific response / Send Adaptive Card)
6. Click **Save**

**When to use**: The orchestrator should decide when to call the flow based on user intent matching the tool description.

### Method B: Topic-Level Tool (Explicit in Topic)

When added to a specific topic, the flow only becomes available to that topic and runs at a specific point in the conversation.

Steps:
1. In Copilot Studio -> select Agents -> select the target agent
2. Go to **Topics** -> select the topic
3. Select the **Add node icon** below any node -> select **Add a tool**
4. Select the agent flow -> a new **Action node** appears in the topic
5. Map each input parameter to topic variables from earlier Question/Message nodes
6. After the Action node, add a Message node using the flow's **output parameters** via dynamic content

**When to use**: The topic collects specific inputs and needs the flow result for the next message in the conversation.

### Complete Topic + Flow Example (Weather Forecast)

1. Create topic "Get weather" with trigger phrases: "will it rain", "today's forecast", "get weather", "what's the weather"
2. Add Message node: "I can help you with that."
3. Add Question node: "What is your city?" -> Identify: User's entire response -> Variable: Var1 (or rename to "City")
4. Add Question node: "What is your ZIP code?" -> Identify: Number -> Variable: Var2 (or rename to "ZIPcode")
5. Add Action node: select "Get weather forecast" flow
6. Map inputs: City (String) <- Var1, ZIP code (Number) <- Var2
7. Add Message node using outputs: "Today's forecast for {location}: {day_summary}. Chance of rain is {chance_of_rain}%"

### Managing Flow Actions in Topics

- **Delete**: Permanently removes the Action node and flow from the topic
- **Refresh**: Reloads the flow to get changes made in Power Automate, validates it in the topic
- **Change flow**: Hover over the flow name in the Action node -> click the change icon

## Creating Agent Flows

### From Copilot Studio (Recommended)

1. Go to Topics page -> open the topic
2. Select Add node -> Add a tool -> **New Agent flow**
3. The Agent Flows page opens with a starter template (trigger + respond action pre-configured)
4. Select **Publish** to save the starter flow
5. Select **Go back to agent** to return to the topic (Action node auto-added)
6. Select **Save** on the topic
7. On the Action node -> select **View flow details** to return and add actual logic
8. Edit name on Overview page, then go to Designer to add actions

### From the Flows Page

1. Select **Flows** from left navigation
2. Use the Copilot text box to describe what you want (natural language)
3. Or manually create with triggers and actions

### With Natural Language (Copilot)

Describe what you want in everyday language:
- "When an email from my manager arrives, post the email subject in Teams"
- Format: "When X happens, do Y"
- Be specific: mention connectors (Outlook, Teams, Forms)
- Copilot generates trigger + actions, sets up connections, applies parameters

### Flow Designer Features

- **Visual canvas**: Drag-and-drop, add/remove actions, publish
- **View options**: Expand/Collapse all, Zoom in/out, Fit view, Minimap, Search
- **Version history**: Recorded in Dataverse, grouped by date, shows latest/published/past versions
- **Flow checker**: Lists all errors in flow, select error to view details or open operation
- **Cannot publish with errors** -- all errors must be corrected first
- **Testing**: Manual or Automatic test runs, check output of each action

### Converting Cloud Flows to Agent Flows

1. Remove existing trigger: three dots (...) -> Delete
2. Under "Add a trigger" -> search "Copilot" -> select **When an agent calls the flow**
3. At end of flow -> add step -> search "Copilot" -> select **Respond to the agent**
4. Ensure **Asynchronous response = Off** (Respond to agent -> Settings -> Networking)
5. Save and publish
6. Add flow to a **solution** in the same environment:
   - Go to Power Automate -> Solutions -> select/create solution
   - Select Add existing -> Automation -> Cloud flow -> select flow -> Add

### Monitoring Agent Flows

- **Overview tab**: Name, description, connections, owner, recent runs, delete/turn off
- **Activity tab**: Run history, status, duration, select run to troubleshoot, resubmit/cancel runs
- **Analytics tab**: Run count, failure rate, performance trends
  - Metrics lag ~30 minutes for run data, ~24 hours for action data
  - Co-owned/shared flow runs NOT included in analytics

## Differences vs. Cloud Flows (Detailed)

| Feature | Agent Flow | Cloud Flow |
|---------|------------|------------|
| Licensing | Copilot Credits | Power Automate license |
| AI Actions | Native LLM + Prompt Builder | Standard connectors only |
| Human-in-the-loop | Advanced approvals, RFI | Basic approvals |
| Sharing | Not supported | Supported |
| Co-owners | Not supported | Supported |
| Run-only permissions | Not supported | Supported |
| Copying | Not supported | Supported |
| Visible in | Copilot Studio Flows page | Power Automate portal |
| Desktop flow calls | Not supported | Supported |
| Express Mode | Available (preview) | Not available |

## Express Mode (Preview)

Optimizes for 2-minute execution window.

Constraints:

- No Delay actions
- No Webhooks
- No HTTP actions
- Max 100 actions per run
- 1,024-character variable limit
- Must complete in 2 minutes

## Conversion

Cloud flow -> Agent flow:

- One-way conversion (cannot convert back)
- Must be in a solution
- Requires Copilot Studio capacity
- Post-conversion billed via Copilot Credits

---

# Action Nodes and Latency Messaging

When adding tools to topics, an **Action node** is created.

Capabilities:

- Map topic variables to flow inputs
- Capture outputs into topic variables
- Send latency message during execution
  - Example: "Let me check that for you."
- Configure repeat delay
- Set minimum wait time
- Support SSML (voice channels)

Hard limit: **100-second synchronous timeout**

Recommendations:

- Use HTTP Request nodes for simple lookups
- Move long-running tasks after "Respond to agent"
- Optimize flow logic and data returned to stay under 100 seconds
- Use Express Mode (preview) for flows that can complete in 2 minutes

---

# Adaptive Cards -- JSON-Based UI in Copilot Studio

Copilot Studio uses **JSON** for defining Adaptive Cards within topics. It does NOT natively use YAML for Adaptive Card content. The platform offers a visual designer and an option to switch to a Power Fx-based formula editor for dynamic content.

Adaptive Cards are platform-agnostic UI snippets defined by a JSON schema. When delivered to a host app, the JSON transforms into native UI that automatically adapts (dark mode, light mode, mobile, desktop).

## Schema Versions (Channel-Dependent)

Supported schema: **Adaptive Card v1.6 and earlier** -- but the appropriate version depends on the targeted host app:

| Channel | Max Version | Notes |
|---------|-------------|-------|
| Web Chat (default website pattern) | v1.6 | Does NOT support Action.Execute |
| Teams | v1.5 | Limited to v1.5 |
| Dynamics 365 Omnichannel (live chat) | v1.5 | Limited to v1.5 |
| Copilot Studio Test Chat | v1.6 | Only renders v1.6 in test chat, NOT on canvas |

**CRITICAL for recipes**: When targeting Teams delivery (which most agents do), use **v1.5** as the schema version. Using v1.6 features will silently fail in Teams.

## Adding Adaptive Cards to Topics

Three ways to include Adaptive Cards:

1. **Adaptive Card node** ("Ask with Adaptive Card") -- for INTERACTIVE cards where the user submits a response. Must include at least one submit button. Output variables are auto-created from card input fields.
2. **Message node** -- for NON-INTERACTIVE cards that display information only (no submit button needed).
3. **Question node** -- for cards combined with a question flow.

### How to add an Adaptive Card node:
- Select Add node -> select "Ask with Adaptive Card"
- Click (...) -> Properties -> Edit adaptive card
- The built-in Adaptive Card Designer opens
- Design the card visually OR paste JSON in the Card payload editor
- Card MUST contain at least one submit button (it's an interactive card)
- Save and close -- output variables auto-generated from input IDs

### Design Tools:
- **Built-in Designer**: Copilot Studio includes an inline card designer with the most useful features from the official Adaptive Cards Designer
- **Online Designer**: Design at https://adaptivecards.io/designer/ then copy JSON into Copilot Studio
- **JSON Editor**: Direct JSON editing in the Card payload editor pane

## Power Fx Integration (Dynamic Content)

Switch from JSON to Formula mode to reference topic/global variables dynamically:

- In Adaptive Card node properties, click "Formula" to convert JSON to Power Fx
- Variables like `Topic.Title` or `Global.UserName` can be inserted directly
- Supports conditional logic, formatting, and show/hide patterns

**WARNING: Once you switch to Formula mode, you CANNOT go back to the original JSON.** Always save a copy of the JSON before switching. Recommend adding the original JSON as a comment in the node.

Limitations:
- No `choices.data` in Formula mode
- System variables must be mapped to custom variables first
- Regex functions (IsMatch, Match, MatchAll) added mid-2025

## Adaptive Card Node Properties

- **How many reprompts**: Number of retries when user sends text instead of submitting card (default: Repeat up to 2 times). Options: Repeat once, Repeat up to 2 times, Don't repeat.
- **Retry prompt**: Custom message sent when a retry occurs (select Customize to define). Card is re-sent with each retry.
- **Allow switching to another topic**: If enabled (default), incoming text triggers topic switching. When the interrupting topic ends, the card is re-sent.

## Consecutive Cards -- Submit Button Isolation

When an agent has consecutive Adaptive Cards, submit buttons on earlier cards can interfere with later cards. Prevent this by:

1. **Isolate submit actions**: Each card needs unique identifiers and action handlers
2. **Use unique data payloads**: Include unique identifiers in submit action data to differentiate cards
3. **Robust event handling**: Define conditions based on distinctive identifiers
4. **Debug and log**: Add detailed logging to capture action sequences

## Best Practices for Recipes

- Every Adaptive Card JSON in a recipe must be COMPLETE and ready to copy-paste -- never abbreviated
- Use version "1.5" for Teams-targeted agents (not 1.6)
- Include `"wrap": true` on all TextBlock elements for responsive layout
- For cards that collect structured input: use Input.Text, Input.ChoiceSet, Input.Toggle with meaningful "id" fields (these become output variable names)
- For notification/display cards: use FactSet for key-value data, Action.OpenUrl for external links
- For multi-model selection: Input.ChoiceSet with isMultiSelect: false
- For approval workflows: Input.ChoiceSet (approve/revise/reject) + Input.Text for comments
- Always document which "id" fields create output variables and how to reference them in subsequent nodes

---

# Multi-Agent Orchestration

Announced Build 2025 (Preview).

## Patterns

### 1. Child Agents

- Embedded inside parent
- Share environment
- Lightweight modularization

### 2. Connected Agents

- Independent ownership
- Independent orchestration
- Separate authentication

Supported sources:

- Copilot Studio agents
- Microsoft Foundry agents
- Fabric Data agents
- Microsoft 365 Agents SDK
- A2A protocol agents (preview)

## MCP Integration (Model Context Protocol)

Public preview since Sept 2025. GA path expected mid-2026.

MCP is an open protocol (by Anthropic) that lets AI agents discover and call external tools dynamically. Copilot Studio supports MCP as one of its six tool types.

### How MCP Works in Copilot Studio

1. A maker provides the **MCP server host URL** (e.g., `https://my-mcp-server.azurewebsites.net/mcp`)
2. Copilot Studio connects and performs **tool discovery** -- the MCP server advertises its available tools, their descriptions, and input/output schemas
3. The agent's generative orchestrator sees these tools alongside all other registered tools
4. At runtime, the orchestrator decides when to invoke MCP tools based on conversation context and the tool descriptions from the server

### MCP vs. Connectors: Decision Framework

Two key decisions determine when to use MCP vs. connectors:

#### Decision 1: Built-in Capability

| Use Case | Use Connector | Use MCP |
|----------|---------------|---------|
| Standard Microsoft/third-party API | Yes 1400+ prebuilt connectors | No Overkill |
| Certified partner integration | Yes Certified connectors available | No Unnecessary |
| Simple CRUD on SharePoint/Dataverse | Yes Native connectors, no code | No Unnecessary |
| Well-established SaaS API | Yes Likely has a connector | Consider if connector lacks needed operations |

#### Decision 2: Custom Capability

| Use Case | Use Connector/Agent Flow | Use MCP |
|----------|--------------------------|---------|
| Single API endpoint (HTTP POST/GET) | Yes Agent Flow + HTTP action | No Overhead not justified |
| 2-5 related API calls | Yes Agent Flow + HTTP actions | Consider if evolving rapidly |
| Complex multi-step logic (RAG, ML pipeline) | Yes Agent Flow or No | Yes "Thick" MCP server encapsulates complexity |
| Multi-API aggregation (combine 3+ sources) | Possible but complex | Yes MCP server handles orchestration |
| Rapidly evolving tool set | Requires republishing flows | Yes Dynamic discovery adapts automatically |
| Shared across multiple agents/platforms | Each agent needs own flows | Yes One server serves all consumers |

### MCP Server Types

**Thin MCP Servers** ("Swagger for agents"):
- Wrap existing REST APIs with MCP protocol
- Simple pass-through with tool descriptions
- Easy to build, low maintenance
- Example: Wrap a weather API as MCP tools

**Thick MCP Servers** (complex business logic):
- Embed RAG pipelines, ML models, multi-step workflows
- Handle complex orchestration server-side
- Return processed, agent-ready results
- Example: Social analytics server with BERTopic + VADER + pgvector

### Adding an MCP Server in Copilot Studio

Steps:
1. In Copilot Studio -> select Agents -> select the target agent
2. Go to **Tools** -> **Add a tool**
3. Select **MCP Server** from the tool type list
4. Enter the **Server URL** (must be publicly accessible HTTPS endpoint)
5. Copilot Studio connects and discovers all available tools
6. Review the discovered tools -- **makers cannot modify tool descriptions** (they come from the server)
7. The orchestrator includes all discovered tools in its planning
8. Save the configuration

### MCP in Copilot Studio: Key Characteristics

| Aspect | MCP | Connectors / Agent Flows |
|--------|-----|--------------------------|
| **Status** | Preview (Sept 2025) | GA |
| **Tool Discovery** | Dynamic -- server advertises tools at runtime | Static -- defined at design time |
| **Description Control** | Server-defined only -- makers CANNOT edit | Full maker control |
| **Governance** | Whole-server -- all or nothing | Per-tool granularity |
| **Authentication** | Server handles its own auth | Maker/user credential delegation |
| **Deployment** | Requires publicly accessible server (Azure, etc.) | Built into Power Platform |
| **Protocol** | JSON-RPC 2.0 over HTTP(S) with SSE | REST / Power Automate actions |
| **Billing** | Copilot Credits (same as other tools) | Copilot Credits + potential connector license |
| **Best For** | Complex custom backends, multi-tool services, cross-platform sharing | Standard APIs, beginner-friendly, governed environments |

### MCP Protocol Capabilities

The full MCP protocol supports:
- **Tools** -- Functions the agent can call (Yes Supported in Copilot Studio)
- **Resources** -- Data the agent can read (Yes Supported in Copilot Studio)
- **Prompts** -- Reusable prompt templates (No Not yet supported)
- **Sampling** -- Agent-initiated LLM calls (No Not yet supported)

### Building MCP Servers for Copilot Studio

#### Python (FastMCP framework)
```python
from fastmcp import FastMCP
mcp = FastMCP("My Server")

@mcp.tool()
def get_weather(city: str, units: str = "celsius") -> dict:
    """Get current weather for a city."""
    # Call weather API...
    return {"temperature": 22, "condition": "sunny"}

# Deploy to Azure App Service or Azure Functions
```

#### .NET
```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddMcpServer()
    .WithHttpTransport()
    .WithTools<WeatherTools>();  // Class with [McpTool] attributes
var app = builder.Build();
app.MapMcp();
app.Run();
```

### Deployment Requirements for MCP Servers

- Must be accessible via **public HTTPS URL** (Azure App Service, Azure Functions, AWS Lambda, etc.)
- Must implement the MCP protocol (JSON-RPC 2.0 over HTTP with SSE for streaming)
- Must respond within Copilot Studio's **100-second tool timeout**
- Should return data under **1 MB per response** (Copilot Studio agent data limit)
- Must handle authentication server-side (API keys, tokens, certificates)

### When NOT to Use MCP

- **Beginner builders**: Agent Flows with HTTP connectors are far simpler to set up and debug
- **Single-API integrations**: An Agent Flow with one HTTP action is faster than deploying an MCP server
- **Governed environments**: MCP's whole-server governance may not meet compliance requirements for individual tool approval
- **Preview risk**: MCP in Copilot Studio is still in preview -- Agent Flows are GA and production-ready
- **Description control needed**: If the orchestrator needs carefully crafted tool descriptions for accurate routing, use Agent Flows where you control the description

### Recommended Pattern: Agent Flow as Default, MCP as Advanced

For most Copilot Studio agent builds:
1. **Start with Agent Flows** -- they are GA, beginner-friendly, and offer full control
2. **Use MCP when**: you have an existing MCP server already deployed, you need 5+ related tools from one service, or you want cross-platform tool sharing
3. **Hybrid approach**: Use Agent Flows for simple API calls and MCP for complex backend services that encapsulate multi-step logic

---

# Authentication Modes

Three modes:

## 1. No Authentication
- Public link access

## 2. Authenticate with Microsoft
- Teams only
- Automatic Entra ID
- Access to:
  - User.PrincipalName
  - User.DisplayName
  - User.Email
  - User.Id

## 3. Manual OAuth2
- Teams + other channels
- Entra ID or any OAuth2 provider
- Access to:
  - User.AccessToken
  - User.IsLoggedIn

New (Nov 2025 Preview): Automatic Entra Agent Identity creation.

---

# Proactive Messaging (Teams Only)

Implemented via Power Automate:

- Teams action: "Post message in chat or channel"
- "Post as" = Copilot Studio (Preview)

Supports:

- Text
- Adaptive Cards
- Interactive cards

## Constraints

- Teams only
- Personal 1:1 chat only
- Agent must be installed
- Not logged in transcripts
- Preview status

## Enterprise Pattern

- Flow Bot -> Channel announcements
- Copilot Studio Bot -> Personal follow-up

---

# Delay and Wait Workarounds

No native delay node.

## Patterns

- Agent flow with Delay action
- Chain 90-second delay flows sequentially (community pattern)
- Long operations placed after "Respond to agent" (up to 30 days)

LLM-only delay attempts are unreliable.

---

# Power Automate HTTP & API Integration

## HTTP Timeout

- 120 seconds synchronous
- Asynchronous polling extends to 30 days

## Expression Assistant (GA Dec 2025)

Natural language -> Power Fx or WDL expressions.

## SharePoint Enhancements

- Modern approval integration
- Desktop connector support

## Teams Connector Limits

- 25 requests per 300 seconds (channel posting)
- No private channel Adaptive Cards
- Branding limitations

---

# External AI API Integration

Primary method: Premium HTTP action.

### Authentication Patterns

- OpenAI: `Authorization: Bearer`
- Anthropic: `x-api-key`
- Azure OpenAI: `api-key`

### Structured JSON Output

Three approaches:

1. OpenAI `response_format: json_object`
2. AI Builder structured JSON
3. Explicit prompt schema

### Error Handling

- Try-Catch-Finally via Scope
- Auto retries for 408, 429, 5xx
- Custom backoff for rate limits

## REST API Tools (Preview)

Upload OpenAPI v2 spec -> orchestrator auto-invokes endpoints.

---

# Power Apps: Generative & Agent-First

## Generative Pages (GA Nov 2025)

- Natural language -> React pages
- Dataverse connected
- Solution-aware
- Virtual entity support

## Plan Designer (GA 2025)

Generates:

- Dataverse tables
- Canvas apps
- Model-driven apps
- Flows
- Agents

From natural language description.

## MCP Server (Preview Feb 2026)

Enables AI agents to automate app tasks with human oversight.

## Deprecations

- Copilot control removed Feb 2, 2026
- Classic model-driven UI retired April 2026
- AI Builder seeded credits removed Nov 2026

---

# Teams Deployment & Bot Tradeoffs

| Capability | Flow Bot | Copilot Studio Bot |
|------------|----------|-------------------|
| Channels | Yes | No |
| Personal Chat | Yes | Yes |
| Branding | No | Yes |
| Adaptive Cards | No | Yes |
| Conversational | No | Yes |
| Requires Installation | No | Yes |
| Logged Proactive | Yes | No |

Recommended enterprise pattern: Hybrid deployment.

---

# Copilot Credits Economy

Effective Sept 1, 2025.

## Pricing

- $200/month -> 25,000 credits
- $0.01 per credit (PAYG)

Microsoft 365 Copilot users:

- Internal interactions zero-rated
- Autonomous triggers always consume credits (25 per trigger)

## Credit Consumption

| Action | Credits |
|--------|---------|
| Classic answer | 1 |
| Generative answer | 2 |
| Agent action | 5 |
| Tenant graph grounding | 10 |
| Agent flow (per 100 actions) | 13 |
| Premium/reasoning AI tools (per 10 responses) | 100 |

## Rate Limits

- 1-10 packs: 50 RPM / 1,000 RPH
- 51-150 packs: 100 RPM / 2,000 RPH
- Enforcement at 125% prepaid

## Session Limits

- 30-minute inactivity timeout
- 60-minute max duration
- 100-turn cap

## Structural Limits

- 8,000-character instruction field
- 1,000 topics per agent
- 500 knowledge objects (max 5 types)

---

---

# Topic YAML Code Editor: Author Topics as YAML

Copilot Studio provides a **YAML code editor** for every topic. This enables makers to author, copy-paste, and share complete topic definitions as text. YAML is how topics are serialized internally -- every visual canvas node has a direct YAML counterpart.

## Accessing the YAML Code Editor

1. Open any topic in Copilot Studio
2. Click the three dots **((...))** at the top-right of the topic canvas
3. Select **Open code editor**
4. The YAML representation of the entire topic appears
5. Edit YAML directly, or paste a complete YAML topic definition
6. Close the editor to return to the visual canvas -- changes sync bidirectionally

**Key insight**: You can **create an entire topic from scratch by pasting YAML** into an empty topic's code editor. This is faster than building node-by-node on the canvas for complex topics.

## YAML Topic Structure

Every topic is an `AdaptiveDialog` with a trigger and an actions list:

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent        # ALWAYS use this -- creates Custom Topic (deletable)
  id: main
  intent:
    displayName: Research Request  # Must match topic name
    triggerQueries:                # Required even for generative orchestration
      - research a topic
      - analyze data
      - start analysis
  actions:
    - kind: SendMessage           # Use SendMessage for text (NOT SendActivity)
      id: welcomeMsg
      message: Welcome! I can help you with research analysis.
    - kind: Question              # Second node
      id: askTopic
      # ... more actions
```

### Trigger Types

| Trigger Kind | When It Fires | Creates | Use For |
|---|---|---|---|
| `OnRecognizedIntent` | User says something matching trigger phrases | **Custom Topic** (can be deleted) | ALL user-authored topics -- ALWAYS use this |
| `OnUnknownIntent` | User says something not matching any topic | **System Topic** (CANNOT be deleted!) | NEVER use in generated YAML -- reserved for predefined system topics like Conversational Boosting |
| `OnConversationStart` | Conversation begins | System Topic | Reserved for the Conversation Start system topic |

**WARNING: CRITICAL: System vs Custom Topics**
- `OnRecognizedIntent` -> **Custom Topic** -- the user can edit and DELETE it. This is what ALL generated YAML must use.
- `OnUnknownIntent` -> **System Topic** -- the user CANNOT delete it! Only predefined system topics (Fallback, Conversational Boosting) use this. NEVER emit `OnUnknownIntent` in recipe YAML.
- Even when using **generative orchestration** (where trigger phrases are secondary to topic descriptions), ALWAYS use `OnRecognizedIntent` with `triggerQueries` and `displayName` in the YAML. The trigger phrases still serve as Custom Topic identifiers.

## YAML Node Types -- Complete Reference

### 1. SendMessage (Message Node)

Displays a text message to the user. Supports variable substitution via `{VariableName}`. This is the correct node kind for custom topics -- do NOT use `SendActivity` for text messages (that format is for system topics and Adaptive Card attachments only).

```yaml
- kind: SendMessage
  id: showGreeting
  message: Hello {Global.UserName}! I'm ready to help you analyze data.
```

**Multi-line messages:**
```yaml
- kind: SendMessage
  id: showResults
  message: |-
    Here are your results:
    - Topic: {Topic.ResearchTopic}
    - Status: {Topic.AnalysisStatus}
    - Documents analyzed: {Topic.DocCount}
```

**Variable substitution pattern**: Use `{Scope.VariableName}` inside message text:
- `{Global.UserName}` -- global variable
- `{Topic.SelectedPlatform}` -- topic-scoped variable

### 2. Question (Question Node)

Asks the user a question, captures their response into a variable. **Critical syntax rules apply.**

```yaml
- kind: Question
  id: askResearchTopic
  interruptionPolicy:
    allowInterruption: true
  variable: init:Topic.ResearchTopic
  prompt: What topic would you like to research?
  entity: StringPrebuiltEntity
```

**CRITICAL RULES for Question nodes:**
1. **`init:` prefix is MANDATORY** on the variable field -- e.g., `init:Topic.ResearchTopic`, NOT `Topic.ResearchTopic`
2. **`interruptionPolicy` block is REQUIRED** -- must always include the `allowInterruption` field
3. **`entity:` must use the correct Copilot Studio prebuilt entity kind name** -- e.g., `StringPrebuiltEntity`, NOT `freeformText` or `string`. These are PascalCase names ending in `PrebuiltEntity`
4. **NEVER use `freeformText`, `number`, `boolean`, `email`, `url`, or other lowercase shorthand names** -- Copilot Studio's YAML parser rejects them with `Unknown element at path ...Entity`

**Prebuilt entity types (use these EXACT names in YAML):**

| Entity Kind (YAML value) | Captures | Variable Type | Example |
|---|---|---|---|
| `StringPrebuiltEntity` | Any text input (user's entire response) | String | Open-ended responses |
| `NumberPrebuiltEntity` | Numeric values | Number | "How many results?" |
| `BooleanPrebuiltEntity` | Yes/No | Boolean | "Do you want to continue?" |
| `PercentagePrebuiltEntity` | Percentage values | Number | "What confidence level?" |
| `EmailPrebuiltEntity` | Email addresses | String | "What's your email?" |
| `UrlPrebuiltEntity` | URLs | String | "Paste the SharePoint URL" |
| `AgePrebuiltEntity` | Age values | Number | "How old are you?" |
| `CityPrebuiltEntity` | City names | String | "Which city?" |
| `ColorPrebuiltEntity` | Color names | String | "What color?" |
| `CountryOrRegionPrebuiltEntity` | Country/region names | String | "Which country?" |
| `DatePrebuiltEntity` | Date values | DateTime | "What date?" |
| `DateTimePrebuiltEntity` | Date and time values | DateTime | "When should this run?" |
| `MoneyPrebuiltEntity` | Currency amounts | Number | "What's the budget?" |
| `PersonNamePrebuiltEntity` | Person names | String | "Who is the contact?" |
| `PhoneNumberPrebuiltEntity` | Phone numbers | String | "What's your phone number?" |
| `IntegerPrebuiltEntity` | Whole numbers | Integer | "How many items?" |
| `TemperaturePrebuiltEntity` | Temperature values | Number | "What temperature?" |
| `ZipCodePrebuiltEntity` | Postal/zip codes | String | "What's your zip code?" |

**Choice question (multiple options):**
```yaml
- kind: Question
  id: askPlatform
  interruptionPolicy:
    allowInterruption: true
  variable: init:Topic.SelectedPlatform
  prompt: Which platform would you like to collect data from?
  entity:
    kind: EmbeddedEntity
    definition:
      kind: ClosedListEntity
      items:
        - id: reddit
          displayName: Reddit
        - id: trustpilot
          displayName: TrustPilot
        - id: playstore
          displayName: Google Play Store
```

---

## Output Formats -- PDF + JSON Pattern

The Intelligence Augmentation platform services generate multiple output formats. When building Copilot Studio agents that replicate these services, the recipe must include **all output formats** that the original service produces.

### Standard Output Pattern

Most data collection and analysis services produce:

1. **PDF Reports** (primary human-readable output):
   - Formatted, paginated documents with per-item details
   - Batched at **100 items per PDF file** -- large collections produce multiple numbered PDF files
   - File naming: `{job_id}_{source}_data_batch_1.pdf`, `{job_id}_{source}_data_batch_2.pdf`, etc.
   - Each PDF includes: header (source, target, collection date, total items), per-item formatting (title, author, score/rating, date, body text, comments), separator lines between items
   - Character encoding cleaned to ASCII for maximum compatibility (smart quotes converted, non-ASCII removed)
   - Generated using `fpdf` library in Python; in Copilot Studio flows, use Office Scripts or custom connectors for PDF generation

2. **JSON Data** (structured machine-readable output):
   - Complete dataset with all collected fields and metadata
   - Single file: `{job_id}_{source}_data_complete.json`
   - Structure: `{source, collected_at, item_count, metadata: {...}, items: [...]}`
   - Each item includes: id, title, selftext (body), score, num_comments, created, author, comments array

3. **CSV Export** (on-demand spreadsheet format):
   - Generated from JSON data when requested by user
   - Tabular format for Excel analysis or database import
   - Can be generated in Power Automate using Parse JSON -> Create CSV actions

### PDF Batch Size Calculation

When describing output files to users, calculate the expected PDF batch count:
- **PDF batch count** = ceil(total_items / 100)
- Example: 350 items -> 4 PDF files (100 + 100 + 100 + 50 items) + 1 JSON file = **5 total files**

### Platform-Specific Data Fields

**Reddit posts**: id, title, selftext (body), score, num_comments, created (unix timestamp), author, url, permalink, subreddit, comments array (each with id, author, body, score, created)

**TrustPilot reviews**: id, title (rating + review title), selftext (review body), score (helpful votes), rating (1-5 stars), created, author, location, verified_purchase, num_comments (1 if company replied), comments (company reply if exists)

**Play Store reviews**: id, title (rating + first 100 chars), selftext (full review), score (thumbs_up count), rating (1-5), created, author, app_version, num_comments (1 if developer replied), comments (developer reply if exists)

### Rate Limiting in Collection Flows

All collection flows must respect API rate limits:
- **Reddit PRAW API**: 10-second delay between requests (`ratelimit_seconds: 10`)
- **TrustPilot scraping**: 2-second delay between page fetches (configurable)
- **Google Play Store**: No explicit rate limit (handled by google-play-scraper library)

### Collection Parameter Ranges

| Platform | Count Range | Default | Time/Sort Options | Extra Parameters |
|----------|-------------|---------|-------------------|------------------|
| Reddit | 10-1000 | 100 | time_filter: day/week/month/year/all | comments_per_post (0-50, default 5) |
| TrustPilot | 10-1000 | 100 | sort_by: recency/rating | min_rating (1-5, default 1) |
| Play Store | 10-1000 | 100 | sort_by: newest/rating/helpful | language (12 codes), country (14 codes) |

---

## Trigger Phrases -- Best Practices

Trigger phrases determine how users invoke your custom topics. They are critical for:
- **Classic orchestration**: Direct matching against user input
- **Generative orchestration**: Still required for Custom Topic classification (used alongside topic descriptions)

### Rules for Effective Trigger Phrases

1. **5-10 phrases per topic** -- minimum 5, optimal 8-10. More phrases improve recognition accuracy
2. **Vary sentence structure** -- mix questions, commands, and statements:
   - "I need to collect data" (statement)
   - "Can you collect Reddit posts?" (question)
   - "Start data collection" (command)
   - "Help me gather reviews" (request)
3. **Keep phrases short** -- under 10 words each. Short phrases match more flexibly
4. **Use unique verbs and nouns per topic** -- avoid sharing key words across topics to prevent misrouting:
   - GOOD: Topic A uses "collect", "gather", "harvest" / Topic B uses "analyze", "model", "cluster"
   - BAD: Both topics use "process data" -- causes ambiguity
5. **Never use single words** -- "data" alone is too ambiguous. Always use 2+ word phrases
6. **Don't include the agent's name** -- trigger phrases should describe intent, not address the bot
7. **Balance phrase count across topics** -- if one topic has 10 phrases and another has 3, the 10-phrase topic will dominate routing
8. **Include common misspellings and abbreviations** -- "transcibe" for "transcribe", "xport" for "export"
9. **Test with real user queries** -- after deployment, review unmatched queries and add them as trigger phrases

### Trigger Phrase File Format

One phrase per line, 8-10 phrases per topic file:
```
collect social media data
gather Reddit posts
scrape online reviews
download comments from Reddit
start data collection
harvest TrustPilot reviews
collect Play Store ratings
pull social data
```

---

## Entities -- Best Practices & Slot Filling

### Define Entities BEFORE Building Topics

**CRITICAL SEQUENCE**: Define custom entities EARLY in the build process -- BEFORE creating detailed topic flows.

**Recommended build order:**
1. **Define purpose/scope** -- determine what the agent should do
2. **Define custom entities** -- create closed list, regex, and other custom entities BEFORE building topics
3. **Build topics & actions** -- create conversational flows using those entities in Question nodes

**Why define entities first:**
- **Slot filling**: If entities are defined before topics, the bot automatically extracts entity values from the user's initial utterance, skipping unnecessary follow-up questions. Example: user says "Collect Reddit data in CSV format" -- both platform and format entities are filled in one turn
- **Improved NLU**: Defining a closed list entity like "Data Platforms" (Reddit, TrustPilot, Play Store) helps the language model understand domain-specific terminology immediately
- **Reduced rework**: Creating entities first prevents having to go back and reconfigure Question nodes later

### Entity Types

**1. System (Prebuilt) Entities** -- Always available, no setup needed:
- `PersonNamePrebuiltEntity`, `DateTimePrebuiltEntity`, `PhoneNumberPrebuiltEntity`, `EmailPrebuiltEntity`, `CityPrebuiltEntity`, etc.
- Use the exact PascalCase names ending in `PrebuiltEntity` in YAML

**2. Closed List Entities** -- Custom-defined value lists with synonyms:
- Best for: finite sets of options (platforms, formats, layouts, styles)
- Support **Smart Matching**: autocorrects misspellings, handles abbreviations, semantic matching
- Can be uploaded via `.txt` file (pipe-delimited format)

**3. Regex Entities** -- Pattern matching for structured data:
- Best for: ticket IDs (`^[A-Z]{3}-\d{5}$`), codes, reference numbers
- Patterns must use standard regex syntax

### Closed List Entity File Format (.txt)

Upload closed list entities to Copilot Studio using pipe-delimited `.txt` files:

```
value|synonym1|synonym2|synonym3
```

**Rules:**
- First value before `|` is the canonical value (what gets stored in the variable)
- Values after `|` are synonyms that map to the canonical value
- One entry per line
- Maximum file size: 3MB
- Enable **Smart Matching** after import for fuzzy matching (handles misspellings, abbreviations)

**Example: social_data_collector_platforms.txt**
```
Reddit|reddit|subreddit|r/|reddit posts|reddit data
TrustPilot|trustpilot|trust pilot|trustpilot reviews|trustpilot.com
Google Play Store|play store|google play|app store reviews|android reviews|playstore
```

### Slot Filling (Proactive Entity Extraction)

When entities are defined on Question nodes, Copilot Studio can extract **multiple** entity values from a single user utterance:

**User says**: "I want to collect Reddit data and export as PDF"
- `varPlatformChoice` -> automatically filled with "Reddit" (from Data Platforms entity)
- `varExportFormat` -> automatically filled with "PDF" (from Export Formats entity)
- Agent skips both follow-up questions and proceeds directly to confirmation

**Enable slot filling by:**
1. Defining entities BEFORE building topics
2. Using `EmbeddedEntity`/`ClosedListEntity` in Question nodes (not just `StringPrebuiltEntity`)
3. Enabling Smart Matching on imported closed list entities

### EmbeddedEntity YAML Format for Choice Questions

```yaml
- kind: Question
  id: askPlatform
  interruptionPolicy:
    allowInterruption: true
  variable: init:Topic.SelectedPlatform
  prompt: "Which platform would you like to collect data from?"
  entity:
    kind: EmbeddedEntity
    definition:
      kind: ClosedListEntity
      smartMatchingEnabled: true
      items:
        - id: reddit
          displayName: Reddit
        - id: trustpilot
          displayName: TrustPilot
        - id: playstore
          displayName: Google Play Store
```

**Key properties:**
- `smartMatchingEnabled: true` -- enables fuzzy matching (misspellings, abbreviations)
- Each item has `id` (machine value) and `displayName` (human-readable label)
- The `id` is stored in the variable; `displayName` is shown to the user

### Smart Matching Features

When enabled on a closed list entity, Smart Matching handles:
- **Spelling corrections**: "redit" -> Reddit, "trustpolot" -> TrustPilot
- **Abbreviations**: "CSV" -> "Comma-Separated Values"
- **Semantic matching**: "spreadsheet format" -> CSV/Excel
- **Partial matches**: "reddit posts" -> Reddit

Enable Smart Matching: **Settings -> Entities -> [entity name] -> Smart matching toggle**

### Entity Definitions Included with Recipes

Every recipe that uses choice-type Question nodes includes:
1. **Downloadable `.txt` entity files** -- pre-formatted with values and synonyms, ready for upload to Copilot Studio
2. **YAML with `EmbeddedEntity`** -- inline entity definitions in the topic YAML for immediate use
3. **Instructions for importing** -- step-by-step guide for uploading entity files and enabling Smart Matching

**To use the entity files:**
1. Download the `.txt` file from the recipe
2. In Copilot Studio, go to **Settings -> Entities -> + Add an entity -> Closed list**
3. Click **Upload** and select the downloaded `.txt` file
4. Name the entity (e.g., "Data Platforms")
5. Enable **Smart matching** toggle
6. Save the entity
7. In your topic's Question node, select this entity instead of "User's entire response"

---

### 3. SetVariable (Action Node -- Set Variable Value)

Sets a variable to a literal value or Power Fx expression.

```yaml
- kind: SetVariable
  id: setStatus
  variable: Topic.AnalysisStatus
  value: "in_progress"
```

**With Power Fx expression:**
```yaml
- kind: SetVariable
  id: setTimestamp
  variable: Topic.StartTime
  value: =Text(Now(), "yyyy-MM-dd HH:mm:ss")
```

**IMPORTANT**: For Power Fx expressions, prefix the value with `=` -- e.g., `value: =Text(Now(), "yyyy-MM-dd")`. For literal values, no prefix needed.

**Setting a global variable:**
```yaml
- kind: SetVariable
  id: setGlobalModel
  variable: Global.ModelChoice
  value: "claude-sonnet-4-6"
```

### 4. ConditionGroup (Condition Node)

Branching logic with if/else conditions. **Every condition MUST have an `id` field.**

```yaml
- kind: ConditionGroup
  id: checkStatus
  conditions:
    - id: statusSuccess
      condition: =Topic.ResultStatus = "success"
      actions:
        - kind: SendMessage
          id: successMsg
          message: Analysis completed successfully! Here are your results.
    - id: statusError
      condition: =Topic.ResultStatus = "error"
      actions:
        - kind: SendMessage
          id: errorMsg
          message: Something went wrong. Please try again.
  elseActions:
    - kind: SendMessage
      id: unknownStatus
      message: Analysis is still in progress. Please check back later.
```

**CRITICAL**: Every `conditions` entry MUST have a unique `id` field. Missing `id` causes validation errors.

**Power Fx conditions**: Always prefix with `=` -- e.g., `condition: =Topic.Count > 5`

### 5. BeginDialog (Redirect / Call Another Topic)

Redirects to another topic, optionally passing input parameters and receiving outputs.

```yaml
- kind: BeginDialog
  id: redirectToExport
  dialog: ExportResultsTopic
```

**With input/output bindings:**
```yaml
- kind: BeginDialog
  id: callStatusCheck
  dialog: StatusCheckTopic
  input:
    binding:
      jobId: =Topic.JobId
  output:
    binding:
      statusResult: Topic.StatusResponse
```

### 6. EndDialog (End Current Topic)

Ends the current topic and returns control to the orchestrator.

```yaml
- kind: EndDialog
  id: endTopic
```

### 7. AnswerQuestionWithAI (AI-Generated Response)

Uses the agent's LLM to generate a response based on instructions.

```yaml
- kind: AnswerQuestionWithAI
  id: aiSummary
  prompt: >-
    Based on the research results for {Topic.ResearchTopic},
    provide a concise 3-paragraph executive summary highlighting
    key findings, trends, and recommendations.
  variable: Topic.AISummary
```

### 8. SearchAndSummarizeContent (Generative Answers from Knowledge)

Uses the agent's knowledge sources to find and summarize relevant content.

```yaml
- kind: SearchAndSummarizeContent
  id: searchKnowledge
  userMessage: =Topic.UserQuery
```

### 9. InvokeFlowAction (Call a Power Automate Flow)

Calls a Power Automate flow from within a topic, passing inputs and capturing outputs.

```yaml
- kind: InvokeFlowAction
  id: callAnalysisFlow
  input:
    binding:
      text: =Topic.ResearchTopic
      text_1: =Global.ModelChoice
  output:
    binding:
      jobid: Topic.JobId
      statusmessage: Topic.StatusMessage
  flowId: [FLOW-GUID-HERE]
```

**CRITICAL -- flowId GuidParseError**: The `flowId` field requires a **real GUID** (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`). If you paste YAML with a non-GUID placeholder like `REPLACE-WITH-YOUR-FLOW-GUID`, Copilot Studio will throw: `Error reading YAML content: GuidParseError, token: '' (EndObject), expected: UnquotedValue`.

**Workaround for YAML templates**: Since the actual flow GUID is not known until the flow is created, do NOT include `InvokeFlowAction` in pre-generated YAML. Instead, use a `SendMessage` placeholder node with instructions for the maker to replace it:

```yaml
- kind: SendMessage
  id: callFlowPlaceholder
  message: "[ACTION] ACTION PLACEHOLDER -- Replace this node with an Action node that calls the flow. (Add node -> Add a tool -> select the flow, then map input/output variables.)"
```

The maker creates the flow first, then replaces the placeholder with a real Action node via the visual editor (which auto-populates the flowId).

## Variable Scopes

| Scope | Syntax | Lifetime | Use For |
|---|---|---|---|
| **Topic** | `Topic.VarName` | Single topic execution | Temporary data within one conversation path |
| **Global** | `Global.VarName` | Entire session | Data shared across topics (model choice, user preferences, job IDs) |
| **System** | `System.Activity.Text` | Read-only | System-provided values (user message, channel info) |

### Making a Variable Global in YAML

In the YAML code editor, simply use the `Global.` prefix:
```yaml
variable: init:Global.ModelChoice    # Question -> Global
variable: Global.ModelChoice          # SetVariable -> Global
```

On the visual canvas, you must click the Variables icon `{x}` -> find the variable -> toggle "Global variable" to On.

## Power Fx in YAML

Power Fx expressions are used in `value:`, `condition:`, and some `activity:` fields. Always prefix with `=`.

```yaml
# String concatenation (use Concatenate, NOT &)
value: =Concatenate("Report for: ", Topic.ResearchTopic, " -- ", Text(Now(), "yyyy-MM-dd"))

# Conditional value
value: =If(Topic.DocCount > 100, "Large dataset", "Small dataset")

# Number formatting
value: =Text(Topic.ConfidenceScore, "0.00%")

# Check if blank
condition: =!IsBlank(Topic.UserEmail)
```

**CRITICAL**: Use `Concatenate()` for string joining, NOT the `&` operator. The `&` operator may not work correctly in all YAML contexts.

## Complete Working Example: Research Request Topic

This example creates a **Custom Topic** (deletable) with proper `OnRecognizedIntent` trigger, `displayName`, `triggerQueries`, and `SendMessage` nodes.

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Research Request
    triggerQueries:
      - research a topic
      - analyze data
      - start new analysis
      - run a research analysis
      - investigate a topic
  actions:
    - kind: SendMessage
      id: welcomeMsg
      message: |-
        I'll help you run a research analysis. Let me collect a few details first.

    - kind: Question
      id: askTopic
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.ResearchTopic
      prompt: What topic or industry would you like to research?
      entity: StringPrebuiltEntity

    - kind: Question
      id: askPlatform
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.Platform
      prompt: Which data source should I use?
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          items:
            - id: reddit
              displayName: Reddit
            - id: trustpilot
              displayName: TrustPilot
            - id: playstore
              displayName: Google Play Store

    - kind: SetVariable
      id: setTimestamp
      variable: Topic.RequestTime
      value: =Text(Now(), "yyyy-MM-dd HH:mm:ss")

    - kind: SendMessage
      id: confirmMsg
      message: |-
        Starting research analysis:
        - Topic: {Topic.ResearchTopic}
        - Platform: {Topic.Platform}
        - Submitted: {Topic.RequestTime}

        Please wait while I run the analysis...

    - kind: InvokeFlowAction
      id: callResearchFlow
      input:
        binding:
          text: =Topic.ResearchTopic
          text_1: =Topic.Platform
      output:
        binding:
          jobid: Topic.JobId
          statusmessage: Topic.StatusMessage
      flowId: REPLACE-WITH-YOUR-FLOW-GUID

    - kind: ConditionGroup
      id: checkResult
      conditions:
        - id: isSuccess
          condition: =!IsBlank(Topic.JobId)
          actions:
            - kind: SendMessage
              id: successResult
              message: |-
                Analysis started successfully!
                - Job ID: {Topic.JobId}
                - Status: {Topic.StatusMessage}

                I'll notify you when results are ready.
        - id: isFailed
          condition: =IsBlank(Topic.JobId)
          actions:
            - kind: SendMessage
              id: failResult
              message: |-
                I wasn't able to start the analysis.
                Error: {Topic.StatusMessage}

                Please try again or contact support.

    - kind: EndDialog
      id: endResearch
```

## YAML Syntax Rules Summary

| Rule | Correct | Incorrect |
|---|---|---|
| **Trigger kind (Custom Topic)** | `kind: OnRecognizedIntent` with `displayName` + `triggerQueries` | `kind: OnUnknownIntent` (creates System Topic -- CANNOT delete!) |
| **Message node kind** | `kind: SendMessage` with `message:` | `kind: SendActivity` with `activity:` (system topic format) |
| Question variable prefix | `init:Topic.VarName` | `Topic.VarName` |
| Interruption policy | Always include block | Omit it |
| Entity kind names | `StringPrebuiltEntity` (PascalCase, exact name) | `freeformText`, `string`, `FreeformText` |
| Indentation | 2 spaces consistently | Tabs or mixed |
| String concatenation | `Concatenate("a", "b")` | `"a" & "b"` |
| Power Fx prefix | `=Expression()` | `Expression()` |
| Condition IDs | Every condition has `id:` | Missing `id:` |
| Multi-line text | Use `\|-` block scalar | Inline with `\n` |
| Variable substitution in message | `{Global.VarName}` | `${Global.VarName}` |
| Flow action in YAML | `SendMessage` placeholder (no InvokeFlowAction) | `InvokeFlowAction` with fake GUID (GuidParseError) |

---

# Voice Agents: IVR with Copilot Studio

Copilot Studio supports building **Interactive Voice Response (IVR) agents** that speak to customers when they call. Voice agents route calls to departments, diagnose issues, collect information, and give recommendations via spoken conversation.

## Voice Channel Integration

Voice agents are deployed through the **Dynamics 365 Contact Center** voice channel:

- **Dynamics 365 Contact Center -- embedded** (within Customer Service workspace)
- **Dynamics 365 Contact Center -- standalone**
- **Dynamics 365 Customer Service**

## Key Voice Agent Capabilities

### Speech Recognition & Synthesis
- **Speech-to-text**: Automatic transcription of caller speech
- **Text-to-speech**: Agent responses converted to natural speech
- **DTMF input**: Support for keypad entry (press 1 for sales, etc.)
- **Barge-in**: Callers can interrupt agent speech to respond early

### Voice-Specific Node Types
- **Transfer to agent** -- hand off to a human representative with context
- **Transfer to phone number** -- direct PSTN transfer
- **End conversation** -- hang up with optional survey
- **Play audio** -- pre-recorded audio clips

### IVR Design Patterns
1. **Menu-driven IVR** (classic orchestration): Fixed menu tree with DTMF input ("Press 1 for...")
2. **Conversational IVR** (generative orchestration): Natural language interaction where caller describes their need
3. **Hybrid IVR**: Menu for common options, natural language for complex requests

## Voice Agent Architecture Considerations

- Voice agents must handle **latency** differently -- callers expect immediate responses
- Use **short, direct Message nodes** -- long text sounds unnatural when spoken
- Design for **interruption** -- callers may speak before the agent finishes
- **SSML** (Speech Synthesis Markup Language) can be used for pronunciation control, pauses, emphasis
- Voice channels have **different Adaptive Card support** -- voice callers can't see cards, so design alternative flows
- **Timeout handling** is critical -- design for silence detection and reprompting

## Voice Agent Limitations

- Requires **Dynamics 365 Contact Center** license (not available standalone)
- Voice channel is **not available** in all regions
- Limited to **phone channel** -- not applicable to Teams chat or email
- **Adaptive Cards are invisible** to voice callers -- use Message nodes and Question nodes with voice-friendly options
- SSML support varies by **speech synthesis provider**

---

# Real-World Implementation Patterns and Lessons Learned

## Pattern: Offloading Heavy AI Processing

The 100-second synchronous timeout and limited context window in Copilot Studio make it necessary to offload heavy AI processing to external services:

- Deploy **Azure Function Apps** that call **Azure AI Foundry** models (GPT, Claude, Gemini) with larger context windows
- Copilot Studio handles **orchestration only** -- the actual LLM processing happens in the Function App
- The Function App returns structured results that Copilot Studio displays via Adaptive Cards
- For data visualization, the Function App can generate **charts as images** (matplotlib, etc.) and return them as base64-encoded media for Adaptive Cards

## Pattern: Agent Memory via External Storage

Copilot Studio's conversation history window is limited. For agents that need persistent memory:

1. After each response, the Function App **stores response history** in Azure Blob Storage
2. Copilot Studio **wipes global variables** after each answer to free context space
3. On follow-up questions, the Function App **retrieves relevant prior answers** before generating a new response
4. This requires **two LLM calls per follow-up** (context retrieval + answering) but enables long-running conversations

## Pattern: SharePoint List Backend with Prebuilt Connectors (Generative Orchestration)

For generative orchestration agents, you can use **prebuilt connector actions** instead of building full Power Automate flows:

1. Use the **SharePoint Create Item** connector action to create records
2. Use the **SharePoint Get Item** connector action to retrieve records
3. The agent **auto-generates questions** for missing input parameters
4. Configure **end user authentication** -- the current user's identity is used, so they need permissions on the SharePoint list
5. Select which **output fields** the agent can use in responses

This pattern is simpler than building Power Automate flows but gives less control over the exact conversation flow.

## Pattern: Combining Classic and Generative Approaches

For production agents, consider a **hybrid approach**:

- Use **generative orchestration** as the primary mode for flexibility
- Use **explicit Action nodes in topics** for critical workflows that must follow exact steps
- Return topic outputs as **variables** (not Message nodes) to let the orchestrator generate contextual responses
- Add an **informational message** in the Conversation Start system topic noting that some responses are AI-generated

## VS Code Development Pattern

For professional development workflows:

- The **Copilot Studio extension for VS Code** enables local development with source control
- All agent configuration is stored as **YAML** -- topics, flows, variables
- Changes can be **pushed to remote** and **pulled from remote** via the extension
- Use **git** for version control -- revert to earlier versions and push YAML back to Copilot Studio
- The extension detects remote changes and forces download before allowing local pushes
- **AI coding assistants** (GPT Codex, Claude) understand Copilot Studio YAML and can generate topics, Adaptive Cards, and flow configurations

---

# Advanced Expert Patterns and Common Pitfalls

These patterns are drawn from production deployments and advanced Copilot Studio practitioners.

## Brevity is King -- Description and Instruction Design

The most common mistake no-code developers make is writing overly verbose descriptions and instructions. The signal-to-noise ratio directly affects agent quality:

- **Agent description**: Keep under 500 characters. Use actionable verbs, not prose paragraphs.
- **Topic model description**: Keep under 150 characters. Explain what the topic does AND what it does NOT do. Example: "Handles PTO policy queries. Does NOT handle payroll or benefits."
- **Instructions**: Treat the 8000-character limit as if it were 500. Every word must earn its place. Over-detailed instructions confuse the orchestrator.
- **Tool descriptions**: 10 actionable words (mostly verbs). The AI planner reads these to decide when to invoke the tool.
- Think of descriptions as "strict YAML" -- structured, predictable, minimal.

## Topic Output Variables are Bidirectional

Topic output variables capture external data, not just return data to the caller. If you create a topic output variable with a description like "captures retrieved knowledge response", the output will receive the value from the generative node's response. Outputs give data back to the ether AND capture data from it.

This pattern enables lightweight data passing between generative nodes and subsequent logic without complex variable assignments.

## HTTP Flow Pattern -- Don't Use Built-In HTTP Request

The Copilot Studio built-in "Submit HTTP request" action only supports delegated permission (ME endpoints). For app-level authentication and full Graph API access:

1. Create a Cloud Flow (not the built-in action)
2. Use flow inputs for: method, uri, body, and any context variables
3. Get an app auth token via HTTP connector
4. Use the inputs as dynamic values in a second HTTP connector call
5. Output the body of the HTTP response
6. Set output description to: "API response payload. Parse, adjust and retry (3 max) on error."

This gives you one flow with one HTTP connector that can make dynamic HTTP requests to literally any endpoint. The agent constructs the method, URI, and body dynamically.

## 2000-Character Response Limit

Any response over 2000 characters causes an OpenAI token limit error. This includes the instructions text of whatever is sending the response. If the response is a JSON payload, it is very easy to hit this limit.

**Workaround**: Link a SharePoint library/folder as a knowledge source to a generative node. Point the agent to one location with the reference document. If you can localize both the document reference AND the structuring logic in the same topic, you avoid the limit entirely.

## Channel Deployment Gotchas

Channels in Copilot Studio have known issues:

- **Teams deployment**: If knowledge source responses work in test chat but fail in Teams, try importing the agent directly into Teams rather than using the Channels publish feature.
- **Orchestration toggle**: If responses are inconsistent in a deployed channel, try turning off generative orchestration temporarily. Some users report this fixes channel-specific issues.
- **Channel-specific schema versions**: Teams limits Adaptive Cards to v1.5. Using v1.6 features silently fails.

## Knowledge Source Architecture -- One Topic Per Library

For enterprise knowledge bases with many SharePoint libraries:

1. Create one triggered-by-agent topic per knowledge domain
2. Each topic has: one input (slotted), one output, one generative node
3. The generative node searches ONLY its assigned SharePoint library (direct link works better than classic data source)
4. Set node description to: "Understand the input. Resolve ambiguity. Perform Recursive Search on SharePoint Document Library. Return verbatim policy information."
5. Set the node output to the topic output. Turn off "Allow responding."
6. To scale: copy the topic, open code editor, use CTRL+F to search and replace the domain name, update the SharePoint link
7. Add an "optimal output example" document as a knowledge source with description "optimal output example" for quality calibration

## Dynamic Graph API Calls from Copilot Studio

The agent can dynamically construct Graph API HTTP requests based on user input:

- Create one topic with one Copilot trigger action
- Input variables (slotted): method, uri, body
- The agent generates the correct Graph API endpoint, method, and body from natural language
- Topic model description: "Creates complete REST API calls for [purpose] using '/sites/' endpoint. Retrieve, Create, Set content. Adjust and retry on error."
- This enables: creating documents in user OneDrives, listing team memberships, sending adaptive card chats, and more -- all from natural language input

## Service Account Pattern for Flows

Use a dedicated service account for all Power Automate connections:

- The agent itself has zero permissions
- The service account owns all flow connections (HTTP, SharePoint, Outlook)
- Set flows to allow "run only users" to share the connector
- The agent is just a run-only user
- This makes business processes sustainable when employees change roles

## Entity Extraction Requires Explicit Asking

Copilot Studio's entity extraction requires the bot to explicitly ask the user for information. If the user doesn't provide an entity value, the bot must ask at least once. You cannot dynamically alter the flow to skip the question based on whether the entity was provided in the initial utterance.

**Slot filling mitigates this**: If custom entities are defined BEFORE building topics, the bot auto-extracts entity values from the user's initial utterance, potentially skipping follow-up questions. This is why recipes include an early "Entity Definition" phase.

## Special Characters Break the LLM

Characters like $, ., !, and ? in user input can cause the base LLM to generate answers about the character itself rather than understanding the intent. This is a known limitation of the Copilot Studio base model.

**Mitigation**: Use explicit topic structures with Question nodes for structured input. For free-form input, use a Cloud Flow that calls an external LLM (GPT-4o, Claude) for more reliable parsing.

## Testing Discipline -- The 4th Version Rule

Production readiness follows a practical pattern:

1. **Version 1**: Initial build, basic functionality
2. **Version 2**: First round of user feedback incorporated
3. **Version 3**: Second round of feedback, edge cases addressed
4. **Version 4**: Only release as alpha with clear labeling. Make the agent announce its alpha status.
5. Beyond version 4 without user testing = scope creep. Get the agent to the target audience fast.

The agent is not in maintenance phase until it is tested by the actual target audience.

## Fallback Topic Pattern -- External LLM Override

The default Copilot Studio base model can produce unreliable results. A common pattern:

1. Build a fallback topic for "unknown intent"
2. Parse the user's question
3. Push it to a Cloud Flow that calls an external LLM (GPT-4o, Claude, etc.) via API
4. Return the external LLM's response

This gives better quality answers while still leveraging Copilot Studio's conversation management, authentication, and deployment infrastructure.

---

# Conclusion

The 2025-2026 Power Platform evolution marks a structural shift from chatbot construction to autonomous agent orchestration.

Key architectural realities:

- Generative orchestration replaces brittle trigger logic -- but classic orchestration remains essential for deterministic, high-control workflows.
- The choice between classic and generative orchestration is the most consequential architectural decision in any agent build.
- GPT-5 Chat enables semantic routing and planning.
- Tools unify six extensibility models.
- Agent flows collapse licensing friction.
- 100-second synchronous timeout and 128-tool cap define architecture boundaries.
- Teams deployment requires hybrid bot strategy.
- Voice agents extend Copilot Studio to IVR/phone channels via Dynamics 365 Contact Center.
- Copilot Credits make licensing inseparable from system design.
- VS Code + YAML + git enables professional development workflows.

The platform is no longer a conversational wrapper around flows -- it is an agent runtime with deterministic automation beneath it.
