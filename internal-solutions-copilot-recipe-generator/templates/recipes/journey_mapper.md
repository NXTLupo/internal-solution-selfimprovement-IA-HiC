

# Customer Journey Mapper -- Definitive Build Recipe for Copilot Studio

This recipe walks you through every click, field, toggle, and configuration needed to build the Customer Journey Mapper agent in Microsoft Copilot Studio. The agent ingests research documents (interview transcripts, survey reports, support ticket analyses) from SharePoint, performs dual-pass analysis using the Anthropic Claude Opus API called directly from Power Automate flows, and produces interactive HTML journey maps with emotional scoring (-5 to +5), pain point identification, and improvement opportunities. The agent persona is an expert CX research analyst that never fabricates journey elements not supported by source data. Written for absolute beginners in Copilot Studio -- no step is assumed.

---

## Architecture Diagram

```
+------------------------------------------------------------------+
|                    MICROSOFT TEAMS (User Interface)               |
|                                                                    |
|  User uploads document  -->  Copilot Studio Agent                 |
|  or types request            "Customer Journey Mapper"            |
+------------------------------------------------------------------+
         |                    |                    |
         v                    v                    v
+----------------+  +------------------+  +------------------+
| TOPIC:         |  | TOPIC:           |  | TOPIC:           |
| Journey        |  | Document         |  | Content          |
| Analysis       |  | Selection        |  | Customization    |
| Request        |  | (7 nodes)        |  | (6 nodes)        |
| (9 nodes)      |  +------------------+  +------------------+
+----------------+           |
  |           |              v                    +------------------+
  |           |     SharePoint CX                 | TOPIC:           |
  |           |     Research Library               | Export Journey   |
  |           |                                    | (6 nodes)        |
  v           v                                    +------------------+
+----------------+  +------------------+                    |
| FLOW:          |  | FLOW:            |                    v
| Extract        |  | Synthesize       |           +------------------+
| Journey        |  | Journey Map      |           | FLOW:            |
| Elements       |  | (Pass 2)         |           | Export Journey   |
| (Pass 1)       |  |                  |           | Map              |
+----------------+  +------------------+           +------------------+
  |                    |                                    |
  v                    v                                    v
+------------------------------------------------------------------+
|              ANTHROPIC CLAUDE API (claude-opus-4-6)               |
|              POST https://api.anthropic.com/v1/messages           |
|              max_tokens: 64000 | temperature: 0.3                |
+------------------------------------------------------------------+
         |                    |
         v                    v
+------------------------------------------------------------------+
|                    SHAREPOINT                                     |
|  /Journey Templates/    -- Template library                      |
|  /CX Research/           -- Source documents                     |
|  /Journey Maps/HTML/     -- Generated HTML maps                  |
|  /Journey Maps/CSV/      -- Generated CSV exports                |
|  /Journey Maps/JSON/     -- Generated JSON data                  |
+------------------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|                    DELIVERY                                        |
|  Teams Adaptive Card  |  Email with download links               |
|  Miro Board handoff   |  SharePoint direct links                 |
+------------------------------------------------------------------+
```

---

## Prerequisites -- What You Need Before Starting

Before you begin building, confirm you have the following:

1. A Microsoft 365 work or school account with a license that includes Copilot Studio (typically Microsoft 365 E3/E5 or a standalone Copilot Studio license). If you are not sure, ask your IT admin.

2. Access to Power Automate at https://make.powerautomate.com -- sign in and confirm you can see the home page.

3. Access to Power Apps maker portal at https://make.powerapps.com -- sign in and confirm you can see the home page.

4. A SharePoint site where you can create document libraries and folders. You need at least "Edit" permissions on this site. The recipe uses a site called "ResearchHub" -- substitute your actual site name throughout.

5. An Anthropic API key for Claude Opus (starts with sk-ant-...). Obtain from https://console.anthropic.com. This is the only external API key required.

6. Microsoft Teams installed (desktop or web) for testing the agent.

7. A basic understanding of what a "customer journey map" is -- a visual representation of the steps a customer takes when interacting with a company, including their emotions, pain points, and touchpoints at each stage.

---

## Component Summary Table

| Component Type | Name | Purpose |
|---|---|---|
| Agent | Customer Journey Mapper | Orchestrates all journey mapping capabilities |
| Knowledge Source | Journey Map Templates | Template library organized by industry |
| Knowledge Source | CX Research Library | Repository of past research documents |
| Topic | Journey Analysis Request | Core dual-pass analysis workflow (9 nodes) |
| Topic | Document Selection | Document upload and management (7 nodes) |
| Topic | Content Customization | Output element selection and granularity (6 nodes) |
| Topic | Export Journey | Multi-format export and sharing (6 nodes) |
| Flow | Extract Journey Elements | Pass 1: Claude API extraction of journey elements |
| Flow | Synthesize Journey Map | Pass 2: Claude API synthesis into HTML journey map |
| Flow | Export Journey Map | Generates CSV, JSON, and manages file exports |
| Tool | Extract Journey Elements | Registered flow tool for Pass 1 |
| Tool | Synthesize Journey Map | Registered flow tool for Pass 2 |
| Tool | Export Journey Map | Registered flow tool for exports |
| Entity | Content Types | Closed list: Emotional Journey, Pain Points, etc. |
| Entity | Export Formats | Closed list: HTML, CSV, Miro Board, JSON |
| Environment Variable | nxth_AnthropicApiKey | Anthropic Claude API key (Secret type) |

---

# PHASE 1: Create the Customer Journey Mapper Agent

This phase creates the agent shell, configures orchestration, writes the full agent instructions, sets up system topics, creates the Power Platform solution, stores the API key as an environment variable, and defines custom entities. We do all foundational work before building any capabilities.

## Step 1.1: Create the SharePoint Folder Structure

WHERE AM I?: SharePoint > Site Contents > Documents

1. Open your browser and navigate to your SharePoint site (for example, https://yourcompany.sharepoint.com/sites/ResearchHub).

2. In the left navigation, click Documents (or Shared Documents) to open the default document library.

3. Click + New then Folder. Name it Journey Templates. Click Create. This is where industry-specific journey map templates will live.

4. Inside Journey Templates, create four subfolders by clicking + New then Folder for each: Retail, Healthcare, Finance, SaaS. These organize templates by industry vertical.

5. Go back to the root of the Documents library. Create a folder named CX Research. Click Create. This is where users upload research documents for analysis.

6. Go back to the root again. Create a folder named Journey Maps. Click Create.

7. Inside Journey Maps, create three subfolders: HTML (for generated interactive journey maps), CSV (for spreadsheet exports), JSON (for structured data exports).

8. Copy and save the full URL of your SharePoint site (everything up to and including the site name, for example https://yourcompany.sharepoint.com/sites/ResearchHub). You will need this multiple times throughout the recipe.

> **VERIFY**: You should now have this folder structure:
> - /Documents/Journey Templates/ (with Retail, Healthcare, Finance, SaaS subfolders)
> - /Documents/CX Research/
> - /Documents/Journey Maps/HTML/
> - /Documents/Journey Maps/CSV/
> - /Documents/Journey Maps/JSON/

## Step 1.2: Open Copilot Studio and Create a Blank Agent

WHERE AM I?: Browser > https://copilotstudio.microsoft.com

1. Open your browser and navigate to https://copilotstudio.microsoft.com.

2. Sign in with your Microsoft 365 work or school account.

3. You will land on the Copilot Studio home page. In the left navigation pane, click Agents.

4. Click the Create blank agent button. If you want to change advanced settings like the solution or schema name, click the small down arrow (v) next to the button and select Advanced create, then click Confirm and create. For most users, just clicking the main button is fine.

5. A new agent opens on the Overview page. This is your agent's home base -- it has sections for Details, Instructions, Knowledge, Tools, Suggested Prompts, and Channels.

> **BEGINNER TIP**: The Overview page is the central dashboard for your agent. Think of it as the agent's "control panel" where you configure its identity, brain (instructions), data sources (knowledge), and capabilities (tools).

## Step 1.3: Set the Agent Name, Description, and Icon

WHERE AM I?: Copilot Studio > Agent > Overview > Details

1. On the Overview page, find the Details section near the top. Click the Edit (pencil) icon.

2. In the Name field, delete the default name and type: Customer Journey Mapper

3. In the Description field (max 1,024 characters), paste:

```
Expert CX research analyst that transforms qualitative and quantitative research data into actionable customer journey maps. Performs dual-pass document analysis using Claude Opus API: Pass 1 extracts journey elements (stages, touchpoints, emotions, pain points, moments of truth), Pass 2 synthesizes them into interactive HTML journey maps with emotional scoring (-5 to +5). Supports PDF, DOCX, and TXT documents up to 200,000 characters. Exports to HTML, CSV, JSON, and Miro Board formats.
```

4. To change the agent's icon: click the agent icon in the top-left area of the page, then click Change icon, then upload a 192 x 192 pixel PNG image (max 72 KB). Use a professional icon that represents journey mapping or customer experience -- a path/route icon works well.

5. Click Save at the top of the page. Wait for the green "Saved successfully" banner.

> **VERIFY**: Check that the agent name "Customer Journey Mapper" appears in the top-left corner of the page.

## Step 1.4: Enable Generative Orchestration

WHERE AM I?: Copilot Studio > Agent > Overview > Details > Orchestration

1. Still in the Details section of the Overview page, look for the Orchestration area.

2. Find the toggle labeled "Use generative AI to determine how best to respond to users and events".

3. Make sure this is set to Yes (toggled on). New agents usually default to this, but verify it.

4. What this does: Instead of requiring you to manually define exact trigger phrases for every possible user question, generative orchestration uses an AI planner to dynamically decide which topics, tools, and knowledge sources to use for each request. This is essential for the Customer Journey Mapper because users will phrase their requests in many different ways ("map my customer journey", "analyze this transcript", "create a CX visualization", and so on).

> **CRITICAL**: This is an architectural decision. Generative orchestration means the agent decides which topic to invoke based on topic descriptions, not just trigger phrase matching. This gives flexibility but requires well-written topic descriptions. We chose generative orchestration because journey mapping requests are varied and open-ended.

## Step 1.5: Write the Agent Instructions

WHERE AM I?: Copilot Studio > Agent > Overview > Instructions

1. On the Overview page, find the Instructions section. Click Edit.

2. You will see a large text field (max 8,000 characters). Delete any default text and paste the following:

```
[PERSONA]
You are the Customer Journey Mapper, an expert CX research analyst that transforms qualitative and quantitative research data into actionable customer journey maps. You help UX researchers, product managers, and CX strategists visualize the end-to-end customer experience. You are insightful, thorough, and empathetic toward both the end customer and the researcher. You think like a senior CX consultant who has mapped hundreds of journeys. You ask clarifying questions about persona scope, journey boundaries (start/end points), and desired granularity before beginning analysis. You highlight moments of truth and emotional peaks/valleys. Your tone is professional, warm, and consultative. You never fabricate journey elements not supported by the source data.

[CHAIN-OF-THOUGHT REASONING]
For every journey mapping request, reason step-by-step before responding:
1. When a user uploads a document, first identify the document type (research report, interview transcript, survey results, support tickets) and assess its suitability for journey mapping. Minimum 500 words required.
2. Ask the user to define the journey scope: Which persona or customer segment? What is the journey start point and end point? What level of granularity (high-level phases, standard stages, or micro-moments)?
3. Determine content selection preferences: Should the map include emotional journey, pain points, touchpoints, channel indicators, opportunities, quotes, or all elements?
4. Execute Pass 1 - Element Extraction: Send the document content to the Claude API with a structured extraction prompt that identifies all journey stages, touchpoints, customer actions, emotions (-5 to +5 scale), pain points, and moments of truth.
5. Present the extracted elements to the user for review. Allow them to add, remove, or modify elements before synthesis.
6. Execute Pass 2 - Journey Synthesis: Send the validated elements back to Claude with a synthesis prompt that organizes them into a coherent journey map with logical stage ordering, emotional arc, and opportunity identification.
7. Format the output as structured JSON that renders as an interactive HTML journey map, exports to CSV, or feeds into the Miro Board Generator.

[OUTPUT FORMAT]
Journey maps are presented as a structured stage-by-stage walkthrough. Each stage includes:
- stage_name (string): Name of the journey stage
- customer_goal (string): What the customer is trying to achieve
- actions (array): Specific actions the customer takes
- touchpoints (array): Each has {channel, description, digital_or_physical}
- emotional_state (object): {score (-5 to +5), label, evidence_quote}
- pain_points (array): Each has {description, severity (1-5), evidence_quote}
- moments_of_truth (array): Each has {description, type (positive/negative), impact}
- opportunities (array): Each has {description, priority (high/medium/low), effort}

The downstream Power Automate pipeline converts this JSON into interactive HTML with color-coded emotional arcs and annotated touchpoints.

[CONSTRAINTS]
- Maximum document size: 100 pages or 200,000 characters. For larger documents, ask the user to select the most relevant sections.
- Always validate that uploaded content contains enough journey-relevant data (minimum 500 words). Warn if the document appears off-topic.
- The dual-pass approach is mandatory. Never skip element extraction (Pass 1) and go straight to synthesis (Pass 2).
- Emotional scoring must be consistent across stages using the -5 to +5 scale: -5 (extremely frustrated), -3 (frustrated), -1 (slightly dissatisfied), 0 (neutral), +1 (slightly satisfied), +3 (satisfied), +5 (delighted).
- Always attribute insights to specific evidence from the source document. Include direct quotes where available.
- If the document contains multiple personas, ask the user to select one persona per journey map run.
- Never provide strategic recommendations beyond what the data supports.
- When the user says "map journey" or "analyze experience," always invoke the full dual-pass pipeline.

[FEW-SHOT EXAMPLE]
User: "Analyze this interview transcript and create a journey map for the onboarding experience"
Expected output structure:
{
  "title": "Customer Onboarding Journey Map",
  "persona": "New Enterprise Customer",
  "journey_start": "Contract Signed",
  "journey_end": "First Value Realized",
  "granularity": "standard",
  "stages": [
    {
      "stage_name": "Welcome and Setup",
      "customer_goal": "Get access to the platform and understand next steps",
      "actions": ["Receive welcome email", "Create account", "Schedule kickoff call"],
      "touchpoints": [
        {"channel": "Email", "description": "Automated welcome sequence", "digital_or_physical": "digital"},
        {"channel": "Web Portal", "description": "Account creation flow", "digital_or_physical": "digital"}
      ],
      "emotional_state": {"score": 2, "label": "Optimistic but uncertain", "evidence_quote": "I was excited to get started but wasn't sure what to do first"},
      "pain_points": [
        {"description": "No clear next steps after account creation", "severity": 3, "evidence_quote": "After I created my account, I just stared at the dashboard"}
      ],
      "moments_of_truth": [
        {"description": "First login experience sets expectations", "type": "negative", "impact": "Customer confidence drops if onboarding feels unguided"}
      ],
      "opportunities": [
        {"description": "Add interactive onboarding wizard after first login", "priority": "high", "effort": "medium"}
      ]
    }
  ],
  "metadata": {
    "model_used": "claude-opus-4-6",
    "document_type": "interview_transcript",
    "word_count": 8500,
    "extraction_time_seconds": 22,
    "synthesis_time_seconds": 35
  }
}
```

3. Click Save at the top of the page.

> **WATCH OUT**: The instructions field has an 8,000-character limit. The text above is approximately 4,200 characters, leaving room for future additions. Do not exceed 8,000 characters or the save will fail silently.

## Step 1.6: Disable General Knowledge

WHERE AM I?: Copilot Studio > Agent > Settings (gear icon) > Generative AI

1. Click the Settings gear icon at the very top of the Copilot Studio page (not the Details section -- the gear icon in the top navigation bar).

2. In the settings panel, click Generative AI in the left menu.

3. Find the toggle "Allow the AI to use its own general knowledge" and set it to Off.

4. What this does: Forces the agent to answer exclusively from your SharePoint documents and flow outputs. This prevents the agent from making up plausible-sounding journey elements from its training data. Every insight must come from the user's uploaded research documents.

5. Click Save and close the settings panel.

## Step 1.7: Configure System Topics

WHERE AM I?: Copilot Studio > Agent > Topics > System

1. Click the Topics tab in the top navigation bar of Copilot Studio.

2. You will see two subtabs: Custom and System. Click the System subtab.

3. You will see a list of system topics. Configure each one:

**Conversation Start:**

4. Click Conversation Start to open the topic authoring canvas.

5. You will see a trigger node ("Conversation Start") connected to a Message node. Before the Message node, click the + button to add a new node. Select Variable management then Set a variable value.

6. In the "Set variable" node, click the box under "Set variable" and select Create a new variable. A new variable appears with a default name (for example, Var1) and type Unknown. Click the variable name. The Variable properties panel opens on the right side. Under Variable name, type ModelChoice (without the Global. prefix). Under Usage, select "Global (any topic can access)". The variable name automatically becomes Global.ModelChoice. For the To value field, type: claude-opus-4-6

7. Add another Set variable value node below the first one. Create a new variable named ContentSelections. Set its Usage to "Global (any topic can access)" so it becomes Global.ContentSelections. For the To value field, click the formula icon (fx), type Text("") and click Done. This initializes the content selections as an empty string.

8. Add another Set variable value node. Create a new variable named Granularity. Set its Usage to "Global (any topic can access)" so it becomes Global.Granularity. For the To value field, type: standard

9. Add another Set variable value node. Create a new variable named PersonaScope. Set its Usage to "Global (any topic can access)" so it becomes Global.PersonaScope. For the To value field, click the formula icon (fx), type Text("") and click Done.

10. Add another Set variable value node. Create a new variable named DocumentContent. Set its Usage to "Global (any topic can access)" so it becomes Global.DocumentContent. For the To value field, click the formula icon (fx), type Text("") and click Done.

11. Add another Set variable value node. Create a new variable named ExtractedElements. Set its Usage to "Global (any topic can access)" so it becomes Global.ExtractedElements. For the To value field, click the formula icon (fx), type Text("") and click Done.

12. Now click the Message node that was already there. Delete the default message text. Replace it with:

```
Welcome to the Customer Journey Mapper. I am your CX research analyst, built by NXT Humans.

I transform research documents into structured customer journey maps using dual-pass AI analysis.

What I can do:
-> Upload a document (PDF, DOCX, or TXT) and I will extract journey elements, then synthesize them into an interactive HTML journey map
-> Type "select document" to upload or browse research files
-> Type "customize content" to choose which journey elements to include
-> Type "export journey" to download your completed journey map

Your current settings:
- Analysis model: Claude Opus 4.6
- Granularity: Standard (5-8 stages)
- All content categories enabled

To begin, upload a research document or type your request.
```

13. Click Save at the top.

**Fallback:**

14. Go back to Topics then System and click Fallback.

15. Click the Message node and replace the text with:

```
I did not understand that request. I can help with:

-> Customer journey mapping from research documents
-> Document upload and management
-> Content customization (emotions, pain points, touchpoints, quotes)
-> Exporting journey maps to HTML, CSV, JSON, or Miro Board

Please rephrase your question, or type "help" for available commands.
```

16. Click Save.

**On Error:**

17. Click On Error in the system topics list. Keep the default configuration -- it displays the error code, conversation ID, and timestamp, which you will need for troubleshooting.

**End of Conversation:**

18. Click End of Conversation. Toggle the satisfaction survey to On so you can collect feedback on journey map quality.

19. Click Save.

## Step 1.8: Create the Power Platform Solution and Environment Variable

WHERE AM I?: Browser > https://make.powerapps.com > Solutions

1. Open a new browser tab and navigate to https://make.powerapps.com.

2. Sign in with the same Microsoft 365 account.

3. Important: In the top-right corner, check the Environment dropdown. Make sure you are in the same environment where your Copilot Studio agent lives. If you are not sure, it is usually called "Default" or your organization's name.

4. In the left navigation, click Solutions.

5. Click + New solution.

6. Fill in:
   - Display name: Customer Journey Mapper Solution
   - Publisher: Select the default publisher (or create one -- click + New publisher, set Name to NXTHumans, Prefix to nxth, then click Save).
   - Leave Version as 1.0.0.0.

7. Click Create. The solution opens.

**Create the Anthropic API Key environment variable:**

8. Inside your solution, click Add (the button at the top) then More then Environment variable.

9. Fill in:
   - Display name: Anthropic API Key
   - Name: This auto-fills as nxth_AnthropicApiKey (based on your publisher prefix). That is correct.
   - Data type: Select Secret
   - Default value: Leave blank.

10. Click Save at the bottom of the panel.

11. After saving, click the variable name nxth_AnthropicApiKey to reopen it. Click New value under "Current value". Paste your Anthropic API key (the one starting with sk-ant-...). Click Save.

> **CRITICAL**: Environment variables of type "Secret" store values encrypted in Dataverse. This is more secure than the "Text" type. However, you must ALSO enable Secure Inputs and Secure Outputs on every Power Automate action that touches this key (instructions included in every flow step below). When your IT admin can provision Azure Key Vault, migrate the key there for additional security.

> **VERIFY**: You should now see 1 environment variable listed in your solution: nxth_AnthropicApiKey.

## Step 1.9: Define Custom Entities

WHERE AM I?: Copilot Studio > Agent > Settings > Entities

Before building topics, we define custom entities so that Copilot Studio can automatically extract values from user messages (slot filling). This means if a user says "export my journey map as CSV", the agent automatically fills the export format variable without asking a follow-up question.

**Entity 1: Content Types**

1. Go back to your Copilot Studio tab. Open your Customer Journey Mapper agent.

2. Click the Settings gear icon at the top of the page.

3. In the settings panel, click Entities in the left menu.

4. Click + Add an entity then select Closed list.

5. In the Name field, type: Content Types

6. Add the following items. For each item, click + Add item, type the display name, then click the item to expand it and add synonyms (type each synonym and press Enter):

   Item 1:
   - Display name: Emotional Journey
   - Synonyms: emotions, emotional arc, mood scores, emotional states, feelings, sentiment

   Item 2:
   - Display name: Pain Points
   - Synonyms: pain points, frustrations, problems, issues, complaints, friction points, barriers

   Item 3:
   - Display name: Touchpoints with Channels
   - Synonyms: touchpoints, channels, contact points, interaction points, channel mapping

   Item 4:
   - Display name: Moments of Truth
   - Synonyms: moments of truth, critical moments, key moments, decisive moments, make or break

   Item 5:
   - Display name: Opportunities
   - Synonyms: opportunities, improvements, recommendations, suggestions, enhancements

   Item 6:
   - Display name: Customer Quotes
   - Synonyms: quotes, verbatims, customer voice, direct quotes, testimonials

   Item 7:
   - Display name: Channel Swimlanes
   - Synonyms: swimlanes, channel lanes, channel rows, channel visualization

7. Toggle Smart matching to On. This enables fuzzy matching so misspellings like "emtional journey" still match.

8. Click Save.

**Entity 2: Export Formats**

9. Click + Add an entity then select Closed list.

10. In the Name field, type: Export Formats

11. Add the following items with synonyms:

    Item 1:
    - Display name: Interactive HTML
    - Synonyms: HTML, web view, interactive map, browser view, html export

    Item 2:
    - Display name: CSV
    - Synonyms: spreadsheet, excel, csv export, tabular, csv file

    Item 3:
    - Display name: Miro Board
    - Synonyms: miro, whiteboard, visual board, miro export, collaborative board

    Item 4:
    - Display name: JSON
    - Synonyms: json data, structured data, json export, raw data, api format

12. Toggle Smart matching to On.

13. Click Save.

14. Close the settings panel.

> **BEGINNER TIP**: Entities are like vocabulary lists that help the agent understand specific terms. When you define "CSV" as an export format with synonyms like "spreadsheet" and "excel", the agent knows that when a user says "give me a spreadsheet", they mean the CSV export format. Defining entities BEFORE building topics enables "slot filling" -- the agent can extract multiple values from a single user message.

---

# PHASE 2: Add Knowledge Sources (2 Sources)

Knowledge sources give the agent access to your SharePoint document libraries so it can reference templates and past research. We configure these before building topics because topics may reference knowledge content.

## Step 2.1: Add the Journey Map Templates Knowledge Source

WHERE AM I?: Copilot Studio > Agent > Overview > Knowledge

1. Navigate back to the Overview page of your agent (click the agent name in the breadcrumb at the top).

2. Find the Knowledge section and click Add knowledge.

3. A panel opens showing knowledge source options. Under Featured, click SharePoint.

4. In the SharePoint URL field, paste the URL of your Journey Templates folder. For example: https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Journey Templates

5. Press Enter or click the + button. The URL appears as a tag below the field.

6. Below the URLs, you will see two fields:
   - Name: Type Journey Map Templates
   - Description: This is critical for retrieval quality. Paste:

```
Library of customer journey map templates organized by industry vertical (retail, healthcare, finance, SaaS). Contains pre-defined stage structures with common touchpoint taxonomies, emotional scoring frameworks, and pain point categorization schemes. Templates include standard journey phases (awareness, consideration, purchase, onboarding, usage, renewal, advocacy), industry-specific touchpoint channels, and benchmark emotional scores. Use these templates as structural references when the user does not specify a custom journey structure. File formats include DOCX and HTML.
```

7. Click Add to agent.

8. You will see the knowledge source appear in the Knowledge section with a green checkmark. If you see a yellow warning, click it to read the issue (usually a permissions problem).

> **VERIFY**: The knowledge source "Journey Map Templates" appears with a green checkmark in the Knowledge section.

## Step 2.2: Add the CX Research Library Knowledge Source

WHERE AM I?: Copilot Studio > Agent > Overview > Knowledge

1. Click Add knowledge again.

2. Click SharePoint.

3. In the SharePoint URL field, paste: https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/CX Research

4. Press Enter.

5. Fill in:
   - Name: Type CX Research Library
   - Description: Paste:

```
Repository of past customer experience research documents including interview transcripts, survey reports, support ticket analyses, usability test results, NPS feedback compilations, and competitive experience audits. Documents cover multiple industries and customer segments. Content includes verbatim customer quotes, satisfaction scores, task completion rates, and behavioral observations. Use this library when the user wants to browse existing research documents for journey mapping input or when cross-referencing findings across multiple studies. File formats include PDF, DOCX, XLSX, and TXT. Date range: 2022-2026.
```

6. Click Add to agent.

> **VERIFY**: Both knowledge sources appear with green checkmarks in the Knowledge section.

## Step 2.3: Configure Knowledge Behavior Settings

WHERE AM I?: Copilot Studio > Agent > Settings (gear icon) > Generative AI

1. Click the Settings gear icon in the top navigation bar.

2. Click Generative AI in the left menu.

3. Under "How should your agent interact with knowledge sources", select High strictness. This ensures the agent only answers from your documents and does not fill gaps with guesses.

4. Click Save and close the settings panel.

---

# PHASE 3: Journey Analysis Request -- TOPIC BUILD (Node-by-Node: 9 Nodes)

This is the core topic of the Customer Journey Mapper. It handles the complete dual-pass analysis workflow: document upload, validation, scope definition, Pass 1 extraction, element review, and Pass 2 synthesis. We build every node in exact order.

## Step 3.1: Create the Journey Analysis Request Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Custom

1. Click the Topics tab in the top navigation bar then click the Custom subtab.

2. Click + Add a topic then From blank.

3. At the top of the canvas, click the topic name (it says "Untitled") and rename it to: Journey Analysis Request

4. Click the Description field below the name. Type: User wants to create a customer journey map from a document or data source. Route here when the user uploads a file, mentions journey mapping, customer experience analysis, or wants to map a user journey from research data. Does NOT handle document browsing (use Document Selection), content customization (use Content Customization), or export (use Export Journey).

## Step 3.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Trigger node

1. In the Trigger node at the top of the canvas, you will see a section labeled "Describe what this topic does" or "Add trigger phrases" depending on your view.

2. Click the description/trigger area and add these trigger phrases (press Enter after each one):
   - create journey map
   - map customer journey
   - analyze customer experience
   - journey mapping
   - upload for journey analysis
   - analyze this document for journey mapping
   - create a CX journey map
   - map the user experience
   - I want to map a customer journey
   - analyze research for journey stages

> **BEGINNER TIP**: Even though we are using generative orchestration (which relies on the topic description more than trigger phrases), trigger phrases are still required. They help the AI planner understand what kinds of user messages should route to this topic. Think of them as "example sentences" that teach the agent what this topic handles.

## Step 3.3: Add Node 1 -- Message: Journey Mapping Introduction

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas

1. Click the + button below the Trigger node to add a new node.

2. In the node menu that appears, click Send a message.

3. In the message text field, type:

```
I will help you create a customer journey map from your research data.

Here is how the process works:
1. You upload a research document (PDF, DOCX, or plain text)
2. I validate the document contains enough journey-relevant content (minimum 500 words)
3. You define the journey scope: persona, start point, end point, and granularity
4. Pass 1: I extract all journey elements -- stages, touchpoints, emotions, pain points, and moments of truth
5. You review and approve the extracted elements
6. Pass 2: I synthesize the elements into a structured, interactive HTML journey map

Supported document types: interview transcripts, survey reports, support ticket analyses, usability test results, and research reports.

Maximum document size: 100 pages or 200,000 characters.

Please upload your research document now, or type "select document" to browse the CX Research Library.
```

4. Click outside the message node to confirm.

## Step 3.4: Add Node 2 -- Question: Upload Research Document

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas (below Node 1)

1. Click the + button below the message node to add a new node.

2. In the node menu, click Ask a question.

3. In the question text field, type: Please upload your research document. I accept PDF, DOCX, and TXT files up to 200,000 characters. You can drag and drop the file into this chat, or paste the document text directly.

4. Under "Identify", click the dropdown. Select User's entire response. This captures whatever the user types or uploads as a single text string.

5. The question node creates an output variable. Click the variable name (it may say Var1 or similar). The Variable properties panel opens on the right side.

6. Under Variable name, type: DocumentContent (without any prefix).

7. Under Usage, select "Global (any topic can access)". The variable name automatically becomes Global.DocumentContent.

8. Click Save on the topic.

> **WATCH OUT**: In a production deployment, file uploads in Teams are handled as attachments. The agent receives the file content as text. For PDF files, you may need a Power Automate flow to extract text from the PDF binary. For this recipe, we assume the user pastes text content or uploads a TXT/DOCX file that Teams can render as text. If you need PDF text extraction, add a "Parse PDF" flow step before the validation condition.

## Step 3.5: Add Node 3 -- Condition: Validate Document Suitability

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas (below Node 2)

1. Click the + button below the question node to add a new node.

2. In the node menu, click Add a condition.

3. A condition node appears with a "Condition" branch and an "All other conditions" (else) branch.

4. Click the condition field. We need to check that the document has enough content. Click the variable selector (the {x} icon) and select Global.DocumentContent.

5. Set the operator to "is not empty" (or "is not Blank" depending on your view).

> **BEGINNER TIP**: Copilot Studio's condition node has limited expression capabilities compared to Power Automate. For a simple "is not empty" check, this works. The detailed word count validation (minimum 500 words, maximum 200,000 characters) will be performed inside the Power Automate flow in Phase 4, which has full expression support. Here we do a basic "did the user provide any content" check.

6. In the Condition (Yes/True) branch, click the + button to add a message node. Type:

```
Document received. Let me validate the content.
```

7. In the "All other conditions" (else) branch, click the + button to add a message node. Type:

```
I did not receive any document content. Please try again by:
- Pasting the document text directly into the chat
- Uploading a TXT or DOCX file by dragging it into the chat window
- Typing "select document" to browse the CX Research Library

The document must contain at least 500 words of journey-relevant content.
```

8. After the else branch message, click + and select Topic management then End current topic. This stops the conversation if no document was provided.

9. Click Save.

## Step 3.6: Add Node 4 -- Question: Define Journey Scope

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas (below the Yes branch of Node 3)

1. In the Yes (condition met) branch, after the "Document received" message, click the + button to add a new node.

2. Click Ask a question.

3. In the question text field, type:

```
Now let me understand the journey scope. Please provide:

1. Customer persona or segment (e.g., "New Enterprise Customer", "First-time Mobile User")
2. Journey start point (e.g., "Awareness", "First Contact", "Sign-up")
3. Journey end point (e.g., "Purchase", "Onboarding Complete", "Renewal")

You can answer all three in one message, or I will ask follow-up questions.
```

4. Under "Identify", select User's entire response.

5. Click the output variable name. In the Variable properties panel, change the name to JourneyScope. Under Usage, select "Global (any topic can access)". It becomes Global.JourneyScope.

6. Click Save.

## Step 3.7: Add Node 5 -- Action: Execute Pass 1 - Element Extraction

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas (below Node 4)

1. Click the + button below the question node.

2. In the node menu, click Add a tool.

3. A panel opens showing available tools. Since we have not built the flow yet, we will add a placeholder message node now and replace it with the actual Action node after building the flow in Phase 4.

4. Instead, click Send a message and type:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Extract Journey Elements flow. To do this: delete this message node, click the + button, select Add a tool, select the Extract Journey Elements flow, then map these inputs:
- document_content -> Global.DocumentContent
- persona_scope -> Global.PersonaScope
- analysis_type -> "full"
And capture these outputs:
- journey_html -> Topic.ExtractedElementsHTML
- summary -> Topic.ExtractionSummary
- status -> Topic.ExtractionStatus
```

> **WATCH OUT**: We cannot add the Action node until the flow exists. After building the Extract Journey Elements flow in Phase 4, come back to this topic and replace this placeholder with the real Action node. The recipe will remind you.

5. Below this placeholder, add a Set variable value node. Click the box under "Set variable" and select Global.ExtractedElements. For the To value, we will set this after the flow is connected. For now, click the formula icon (fx), type Text("Pass 1 extraction pending") and click Done.

6. Click Save.

## Step 3.8: Add Node 6 -- Adaptive Card: Element Review Card

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas (below Node 5)

1. Click the + button below the previous node.

2. In the node menu, click Ask with Adaptive Card.

3. An Adaptive Card node appears. Click the three dots (...) at the top-right of the node, then select Properties, then Edit adaptive card.

4. The built-in Adaptive Card Designer opens. Click the Card payload editor tab (or JSON editor) to switch to raw JSON editing.

5. Delete any default content and paste this exact JSON:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "TextBlock",
          "text": "EXTRACTED JOURNEY ELEMENTS -- REVIEW",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Pass 1 extraction is complete. Review the discovered journey elements below. You can approve them as-is or request modifications before I synthesize the final journey map.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "DISCOVERED STAGES",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "The extraction identified journey stages, touchpoints, emotional states, pain points, and moments of truth from your document. A detailed summary is available in the chat above.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "TextBlock",
      "text": "ELEMENT MODIFICATIONS",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "reviewDecision",
      "label": "What would you like to do?",
      "style": "expanded",
      "isRequired": true,
      "value": "approve",
      "choices": [
        {
          "title": "Approve -- proceed to journey synthesis",
          "value": "approve"
        },
        {
          "title": "Edit -- I want to modify some elements",
          "value": "edit"
        },
        {
          "title": "Add -- I want to add missing elements",
          "value": "add"
        },
        {
          "title": "Remove -- I want to remove irrelevant elements",
          "value": "remove"
        }
      ]
    },
    {
      "type": "Input.Text",
      "id": "modificationNotes",
      "label": "Modification details (if editing, adding, or removing):",
      "placeholder": "Describe what you want to change, add, or remove...",
      "isMultiline": true,
      "isRequired": false
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "SUBMIT REVIEW"
    }
  ]
}
```

6. Click Save in the JSON editor, then close the designer.

7. The Adaptive Card node now shows output variables. You should see two variables created from the card's input fields: reviewDecision and modificationNotes. Click the reviewDecision variable name. In the Variable properties panel, rename it to ElementReviewDecision. Leave it as a Topic-scoped variable (do not make it global -- it is only needed in this topic).

8. Click the modificationNotes variable name. Rename it to ElementModificationNotes. Leave it as Topic-scoped.

9. Click Save.

> **BEGINNER TIP**: Adaptive Cards are interactive UI elements that appear as rich cards in Teams. The JSON above defines a card with a choice set (radio buttons) and a text input field. When the user clicks "SUBMIT REVIEW", the values they selected are captured into the output variables (ElementReviewDecision and ElementModificationNotes). The "id" fields in the JSON ("reviewDecision" and "modificationNotes") are what create the output variables.

## Step 3.9: Add Node 7 -- Condition: Approve or Modify Elements

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas (below Node 6)

1. Click the + button below the Adaptive Card node.

2. Click Add a condition.

3. Click the condition field. Select the variable Topic.ElementReviewDecision.

4. Set the operator to "is equal to".

5. Set the value to: approve

6. In the Condition (Yes/True) branch -- this is the "approved" path -- click + and add a Send a message node. Type:

```
Elements approved. Proceeding to Pass 2 -- Journey Synthesis.

I will now organize the extracted elements into a coherent journey map with:
- Logical stage ordering and transitions
- Emotional arc visualization (-5 to +5 scale)
- Channel mapping across touchpoints
- Prioritized improvement opportunities

This may take 30-60 seconds. Please wait...
```

7. In the "All other conditions" (else) branch -- this handles edit, add, and remove -- click + and add a Send a message node. Type:

```
I have noted your modifications. Let me re-extract the journey elements with your feedback incorporated.

Your modification notes: {Topic.ElementModificationNotes}

Re-running Pass 1 extraction with adjustments...
```

8. To insert the variable reference in the else branch message: position your cursor after "Your modification notes: " then click the {x} (Insert variable) button in the message toolbar and select Topic.ElementModificationNotes.

9. After the else branch message, you would ideally loop back to the Pass 1 extraction. For this first iteration, add a Send a message node: "Modification noted. In a future update, this will automatically re-run extraction. For now, please start a new journey analysis with your refined instructions." Then add an End current topic node.

10. Click Save.

## Step 3.10: Add Node 8 -- Action: Execute Pass 2 - Journey Synthesis

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas (below the Yes branch of Node 7)

1. In the Yes (approved) branch, after the "Proceeding to Pass 2" message, click the + button.

2. Just like Node 5, we need to add a placeholder until the Synthesize Journey Map flow is built in Phase 5. Click Send a message and type:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Synthesize Journey Map flow. To do this: delete this message node, click the + button, select Add a tool, select the Synthesize Journey Map flow, then map these inputs:
- extracted_elements -> Global.ExtractedElements
- content_selections -> Global.ContentSelections
- granularity -> Global.Granularity
And capture these outputs:
- journey_html -> Topic.JourneyHTML
- summary -> Topic.JourneySummary
- status -> Topic.SynthesisStatus
```

3. Click Save.

## Step 3.11: Add Node 9 -- Adaptive Card: Journey Map Preview

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas (below Node 8)

1. Click the + button below the previous node.

2. Click Send a message. We use a Message node (not an Adaptive Card node) here because this is a non-interactive display card -- the user does not need to submit a response from it.

3. Click the message text area. Click the + (Add) button in the message toolbar and select Adaptive Card (or click the card icon if available).

4. In the Adaptive Card JSON editor, paste:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "TextBlock",
          "text": "JOURNEY MAP COMPLETE",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Your customer journey map has been synthesized and saved to SharePoint.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Model",
          "value": "Claude Opus 4.6"
        },
        {
          "title": "Granularity",
          "value": "Standard (5-8 stages)"
        },
        {
          "title": "Status",
          "value": "Completed"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "EXECUTIVE SUMMARY",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "The journey map summary will appear here after synthesis completes. It includes key findings, emotional peaks and valleys, critical pain points, and top improvement opportunities.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "TextBlock",
      "text": "NEXT STEPS",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Type 'export journey' to download in HTML, CSV, JSON, or Miro Board format. Type 'customize content' to adjust which elements are displayed.",
      "wrap": true,
      "size": "Small"
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "VIEW HTML JOURNEY MAP",
      "url": "https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Journey Maps/HTML/"
    },
    {
      "type": "Action.OpenUrl",
      "title": "OPEN SHAREPOINT FOLDER",
      "url": "https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Journey Maps/"
    }
  ]
}
```

> **WATCH OUT**: Replace the two URL values in the "actions" section with your actual SharePoint folder URLs. The "VIEW HTML JOURNEY MAP" URL should point to your /Journey Maps/HTML/ folder. The "OPEN SHAREPOINT FOLDER" URL should point to your /Journey Maps/ root folder.

5. Click Save in the card editor, then click Save on the topic.

6. After the Adaptive Card message, click + and add an End current topic node to cleanly end the conversation flow.

7. Click Save.

## Step 3.12: Complete YAML for Journey Analysis Request Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas > (...) > Open code editor

1. Click the three dots (...) at the top-right of the topic canvas.

2. Select Open code editor.

3. You can verify or paste the following YAML. Note that the InvokeFlowAction nodes are represented as SendMessage placeholders because the flow GUIDs are not yet known.

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Journey Analysis Request
    triggerQueries:
      - create journey map
      - map customer journey
      - analyze customer experience
      - journey mapping
      - upload for journey analysis
      - analyze this document for journey mapping
      - create a CX journey map
      - map the user experience
      - I want to map a customer journey
      - analyze research for journey stages
  actions:
    - kind: SendMessage
      id: journeyIntro
      message: |-
        I will help you create a customer journey map from your research data.

        Here is how the process works:
        1. You upload a research document (PDF, DOCX, or plain text)
        2. I validate the document contains enough journey-relevant content (minimum 500 words)
        3. You define the journey scope: persona, start point, end point, and granularity
        4. Pass 1: I extract all journey elements -- stages, touchpoints, emotions, pain points, and moments of truth
        5. You review and approve the extracted elements
        6. Pass 2: I synthesize the elements into a structured, interactive HTML journey map

        Supported document types: interview transcripts, survey reports, support ticket analyses, usability test results, and research reports.

        Maximum document size: 100 pages or 200,000 characters.

        Please upload your research document now, or type "select document" to browse the CX Research Library.

    - kind: Question
      id: askDocument
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.DocumentContent
      prompt: "Please upload your research document. I accept PDF, DOCX, and TXT files up to 200,000 characters. You can drag and drop the file into this chat, or paste the document text directly."
      entity: StringPrebuiltEntity

    - kind: ConditionGroup
      id: validateDocument
      conditions:
        - id: hasContent
          condition: =!IsBlank(Global.DocumentContent)
          actions:
            - kind: SendMessage
              id: docReceived
              message: "Document received. Let me validate the content."
      elseActions:
        - kind: SendMessage
          id: noDocMsg
          message: |-
            I did not receive any document content. Please try again by:
            - Pasting the document text directly into the chat
            - Uploading a TXT or DOCX file by dragging it into the chat window
            - Typing "select document" to browse the CX Research Library

            The document must contain at least 500 words of journey-relevant content.
        - kind: EndDialog
          id: endNoDoc

    - kind: Question
      id: askScope
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.JourneyScope
      prompt: |-
        Now let me understand the journey scope. Please provide:

        1. Customer persona or segment (e.g., "New Enterprise Customer", "First-time Mobile User")
        2. Journey start point (e.g., "Awareness", "First Contact", "Sign-up")
        3. Journey end point (e.g., "Purchase", "Onboarding Complete", "Renewal")

        You can answer all three in one message, or I will ask follow-up questions.
      entity: StringPrebuiltEntity

    - kind: SendMessage
      id: pass1Placeholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Extract Journey Elements flow. Map inputs: document_content -> Global.DocumentContent, persona_scope -> Global.PersonaScope, analysis_type -> full. Capture outputs: journey_html -> Topic.ExtractedElementsHTML, summary -> Topic.ExtractionSummary, status -> Topic.ExtractionStatus."

    - kind: Question
      id: elementReviewCard
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.ElementReviewDecision
      prompt: "Review the extracted journey elements and choose an action."
      entity: StringPrebuiltEntity

    - kind: ConditionGroup
      id: checkApproval
      conditions:
        - id: isApproved
          condition: =Topic.ElementReviewDecision = "approve"
          actions:
            - kind: SendMessage
              id: approvedMsg
              message: |-
                Elements approved. Proceeding to Pass 2 -- Journey Synthesis.

                I will now organize the extracted elements into a coherent journey map with:
                - Logical stage ordering and transitions
                - Emotional arc visualization (-5 to +5 scale)
                - Channel mapping across touchpoints
                - Prioritized improvement opportunities

                This may take 30-60 seconds. Please wait...
            - kind: SendMessage
              id: pass2Placeholder
              message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Synthesize Journey Map flow. Map inputs: extracted_elements -> Global.ExtractedElements, content_selections -> Global.ContentSelections, granularity -> Global.Granularity. Capture outputs: journey_html -> Topic.JourneyHTML, summary -> Topic.JourneySummary, status -> Topic.SynthesisStatus."
            - kind: SendMessage
              id: journeyComplete
              message: "Your journey map has been synthesized and saved to SharePoint. Type 'export journey' to download in HTML, CSV, JSON, or Miro Board format."
      elseActions:
        - kind: SendMessage
          id: modifyMsg
          message: "Modification noted. In a future update, this will automatically re-run extraction. For now, please start a new journey analysis with your refined instructions."
        - kind: EndDialog
          id: endModify

    - kind: EndDialog
      id: endJourneyAnalysis
```

4. Close the code editor to return to the visual canvas.

5. Click Save.

---

# PHASE 4: Extract Journey Elements -- FLOW BUILD (Action-by-Action)

This flow implements Pass 1 of the dual-pass architecture. It receives the document content from the topic, sends it to the Anthropic Claude Opus API with a structured extraction prompt, and returns the extracted journey elements (stages, touchpoints, emotions, pain points, moments of truth) as a JSON string.

## Step 4.1: Create the Flow

WHERE AM I?: Browser > https://make.powerautomate.com > Solutions > Customer Journey Mapper Solution

1. Open a new browser tab and navigate to https://make.powerautomate.com.

2. In the left navigation, click Solutions then open Customer Journey Mapper Solution (the one you created in Step 1.8).

3. Click + New then Automation then Cloud flow then Instant.

4. In the "Build an instant cloud flow" dialog:
   - Flow name: Extract Journey Elements
   - Choose how to trigger this flow: Scroll down and select "Run a flow from Copilot" (this is the Copilot Studio trigger). If you do not see this option, select "Manually trigger a flow" -- we will change it in the next step.

5. Click Create. The flow editor opens.

## Step 4.2: Configure the Trigger

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Trigger

1. If the trigger shows as "Run a flow from Copilot" (or "When an agent calls the flow"), click on it to expand it. If it shows a different trigger, delete it by clicking the three dots (...) then Delete, then click + Add a trigger, search for "When an agent calls the flow", and select it.

2. Click + Add an input inside the trigger. You need to add three text inputs:

**Input 1:**
- Click + Add an input then select Text.
- Input name (the label): document_content
- Description: The full text content of the research document to analyze for journey elements

**Input 2:**
- Click + Add an input then select Text.
- Input name: persona_scope
- Description: Target customer persona or segment to focus the journey extraction on

**Input 3:**
- Click + Add an input then select Text.
- Input name: analysis_type
- Description: Type of journey analysis -- full, touchpoints_only, or emotions_only

> **VERIFY**: The trigger now shows three text inputs: document_content, persona_scope, and analysis_type.

## Step 4.3: Action 1 -- Get the Anthropic API Key

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below trigger

1. Below the trigger, click + then Add an action.

2. Search for "Environment" in the action search box. Look for the Power Platform connector. Select List environment variable values (or "Get environment variable" if available). If you cannot find this connector, use the alternative approach below.

**Alternative approach (simpler, works in all environments):**

3. If the Power Platform environment variable connector is not available, click + then Add an action then search for "Compose" then select Compose (under "Data Operations").

4. In the Inputs field, paste your Anthropic API key (the literal key string from your .env file, starting with sk-ant-...).

5. Immediately secure this action: Click the three dots (...) on the Compose action then Settings then scroll down to Security then toggle Secure Inputs to On then toggle Secure Outputs to On then click Done.

6. Rename this action: click the three dots (...) then Rename then type: Get_Anthropic_Key

> **CRITICAL**: The Secure Inputs/Outputs settings hide the API key value from flow run history. Without this, anyone who can view flow runs can see your API key. Always enable both toggles on any action that touches an API key.

## Step 4.4: Action 2 -- Compose the Pass 1 System Prompt

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 1

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, paste the following system prompt:

```
You are an expert customer journey mapping analyst. Your task is to extract structured journey elements from a research document.

EXTRACTION RULES:
1. Identify every distinct journey stage mentioned or implied in the document.
2. For each stage, extract: stage name, customer goal, specific actions taken, touchpoints with channel indicators, emotional state with a score from -5 (extremely frustrated) to +5 (delighted), pain points with severity (1-5), moments of truth, and improvement opportunities.
3. Every extracted element MUST be traceable to a specific passage in the source document. Include the relevant quote or paraphrase.
4. Do NOT invent or assume journey elements not supported by the document content.
5. If the document mentions multiple personas, extract elements only for the specified persona scope.
6. Score emotions consistently: -5 = extremely frustrated, -3 = frustrated, -1 = slightly dissatisfied, 0 = neutral, +1 = slightly satisfied, +3 = satisfied, +5 = delighted.
7. Classify moments of truth as positive (builds loyalty) or negative (risks churn).

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "extraction_metadata": {
    "document_type": "string",
    "word_count": number,
    "persona_identified": "string",
    "extraction_confidence": "high|medium|low"
  },
  "stages": [
    {
      "stage_name": "string",
      "stage_order": number,
      "customer_goal": "string",
      "actions": ["string"],
      "touchpoints": [
        {
          "channel": "string",
          "description": "string",
          "digital_or_physical": "digital|physical"
        }
      ],
      "emotional_state": {
        "score": number,
        "label": "string",
        "evidence_quote": "string"
      },
      "pain_points": [
        {
          "description": "string",
          "severity": number,
          "evidence_quote": "string"
        }
      ],
      "moments_of_truth": [
        {
          "description": "string",
          "type": "positive|negative",
          "impact": "string"
        }
      ],
      "opportunities": [
        {
          "description": "string",
          "priority": "high|medium|low",
          "effort": "high|medium|low"
        }
      ]
    }
  ],
  "cross_cutting_themes": ["string"],
  "data_gaps": ["string"]
}
```

3. Rename this action: click the three dots (...) then Rename then type: Pass1_System_Prompt

## Step 4.5: Action 3 -- Compose the Pass 1 User Prompt

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 2

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, we need to combine the document content with persona scope instructions. Click the Expression tab (the fx button) and paste:

**COPY-PASTE** into the Expression field:
```
concat('Analyze the following research document and extract all customer journey elements. Focus on the persona: ', triggerBody()?['persona_scope'], '. Analysis type: ', triggerBody()?['analysis_type'], '. Document content: ', triggerBody()?['document_content'])
```

3. Click OK.

4. Rename this action to: Pass1_User_Prompt

## Step 4.6: Action 4 -- Escape the System Prompt

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 3

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (the fx button) and paste:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(outputs('Pass1_System_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK.

4. Rename this action to: Escape_System_Prompt

> **BEGINNER TIP**: This escape chain is mandatory for any text that gets embedded inside a JSON body sent to an API. The four replace() calls handle: (1) backslashes, (2) double quotes, (3) newline characters, and (4) carriage returns. Without this, the JSON body would be malformed and the API would return a 400 error.

## Step 4.7: Action 5 -- Escape the User Prompt

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 4

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (the fx button) and paste:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(outputs('Pass1_User_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK.

4. Rename this action to: Escape_User_Prompt

## Step 4.8: Action 6 -- Build the HTTP Request Body

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 5

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (the fx button) and paste:

**COPY-PASTE** into the Expression field:
```
concat('{"model":"claude-opus-4-6","max_tokens":64000,"temperature":0.3,"system":"',outputs('Escape_System_Prompt'),'","messages":[{"role":"user","content":"',outputs('Escape_User_Prompt'),'"}]}')
```

3. Click OK.

4. Rename this action to: Build_Pass1_Body

> **WATCH OUT**: The concat() function builds the JSON body by combining literal JSON structure with the escaped prompt outputs. All literal double quotes inside the JSON string are escaped with backslashes. The model is set to "claude-opus-4-6" which is the current Claude Opus model identifier. The max_tokens is 64000 for comprehensive extraction. Temperature is 0.3 for consistency.

## Step 4.9: Action 7 -- HTTP POST to Anthropic Claude API

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 6

1. Click + then Add an action then search for "HTTP" then select HTTP (the premium connector with the blue globe icon).

2. Configure the HTTP action:

   - Method: Select POST from the dropdown.
   - URI: https://api.anthropic.com/v1/messages
   - Headers: Click + Add new parameter then check Headers. Add three headers:
     - Header 1: Key = x-api-key | Value = click the dynamic content panel (the lightning bolt icon) then under Get_Anthropic_Key, select Outputs
     - Header 2: Key = anthropic-version | Value = 2023-06-01
     - Header 3: Key = Content-Type | Value = application/json
   - Body: Click in the Body field, then click the dynamic content panel (lightning bolt icon), then under Build_Pass1_Body, select Outputs.

3. Configure timeout: Click the three dots (...) on the HTTP action then Settings then under Timeout, type: PT120S then click Done.

4. Secure this action: Click the three dots (...) then Settings then scroll down to Security then toggle Secure Inputs to On then click Done. (We keep Secure Outputs off so we can see the API response for debugging, but enable it in production.)

5. Rename this action to: HTTP_Pass1

> **CRITICAL**: The timeout is set to PT120S (120 seconds) because Claude Opus with 64000 max_tokens on a large document can take 30-90 seconds to respond. The default timeout is 30 seconds which would cause the action to fail on longer documents.

## Step 4.10: Action 8 -- Extract the Response Text

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 7

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (the fx button) and paste:

**COPY-PASTE** into the Expression field:
```
first(body('HTTP_Pass1')?['content'])?['text']
```

3. Click OK.

4. Rename this action to: Extract_Pass1_Response

> **BEGINNER TIP**: The Anthropic Claude API returns a JSON response with a "content" array. Each item in the array has a "type" (usually "text") and a "text" field containing the actual response. The expression first(body('HTTP_Pass1')?['content'])?['text'] gets the first item in the content array and extracts its text value. This is the standard extraction pattern for Claude API responses without tool use.

## Step 4.11: Action 9 -- Compose the Summary

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 8

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (the fx button) and paste:

**COPY-PASTE** into the Expression field:
```
concat('Pass 1 extraction complete. Response length: ', string(length(coalesce(outputs('Extract_Pass1_Response'), ''))), ' characters.')
```

3. Click OK.

4. Rename this action to: Build_Summary

## Step 4.12: Action 10 -- Save Extracted Elements to SharePoint

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 9

1. Click + then Add an action then search for "Create file" then select Create file under the SharePoint connector.

2. Configure:
   - Site Address: Select your SharePoint site from the dropdown (or paste the URL, for example https://yourcompany.sharepoint.com/sites/ResearchHub).
   - Folder Path: Click the folder icon and navigate to /Shared Documents/Journey Maps/JSON (or type /Shared Documents/Journey Maps/JSON).
   - File Name: Click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('pass1_extraction_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.json')
```

   Click OK.

   - File Content: Click the dynamic content panel (lightning bolt icon) then under Extract_Pass1_Response, select Outputs.

3. Rename this action to: Save_Extraction_to_SharePoint

## Step 4.13: Action 11 -- Respond to the Agent

WHERE AM I?: Power Automate > Flow Editor > Extract Journey Elements > Below Action 10

1. Click + then Add an action then search for "Respond" then select Respond to Copilot (or "Respond to the agent" or "Return value(s) to Power Virtual Agents" -- same action, different label depending on your version).

2. Click + Add an output three times to create three outputs:

**Output 1:**
- Type: Text
- Name: journey_html
- Value: Click the dynamic content panel (lightning bolt icon) then under Extract_Pass1_Response, select Outputs

**Output 2:**
- Type: Text
- Name: summary
- Value: Click the dynamic content panel (lightning bolt icon) then under Build_Summary, select Outputs

**Output 3:**
- Type: Text
- Name: status
- Value: Type the literal text: completed

3. Configure the async toggle: Click the Respond to Copilot action, then click Settings (or the three dots then Settings), then under Networking, find the "Asynchronous Response" toggle and set it to Off.

4. Rename this action to: Respond_Pass1_Results

5. Click Save at the top of the flow editor. Wait for the green "Your flow is ready" banner.

> **VERIFY**: The flow should have 11 actions total (including the trigger). Check the flow checker (the checkmark icon at the top) for any errors.

## Step 4.14: Action Stack Summary -- Extract Journey Elements Flow

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Get_Anthropic_Key | Compose | API key with Secure Inputs/Outputs ON |
| 2 | Pass1_System_Prompt | Compose | Full extraction system prompt |
| 3 | Pass1_User_Prompt | Compose | concat() with trigger inputs |
| 4 | Escape_System_Prompt | Compose | 4-step escape chain on system prompt |
| 5 | Escape_User_Prompt | Compose | 4-step escape chain on user prompt |
| 6 | Build_Pass1_Body | Compose | concat() JSON body with escaped prompts |
| 7 | HTTP_Pass1 | HTTP | POST to api.anthropic.com, timeout PT120S |
| 8 | Extract_Pass1_Response | Compose | first(body(...)['content'])?['text'] |
| 9 | Build_Summary | Compose | concat() summary with response length |
| 10 | Save_Extraction_to_SharePoint | SharePoint Create file | /Journey Maps/JSON/ |
| 11 | Respond_Pass1_Results | Respond to Copilot | journey_html, summary, status |

## Step 4.15: Connect the Flow to the Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas

1. Go back to your Copilot Studio tab. Open the Journey Analysis Request topic.

2. Find the placeholder message node from Step 3.7 (Node 5) that says "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Extract Journey Elements flow."

3. Delete this placeholder node by clicking the three dots (...) on the node then Delete.

4. Click the + button where the placeholder was. Select Add a tool.

5. In the tool picker, find Extract Journey Elements in the list. Click it.

6. A new Action node appears in the topic. Map each input parameter:
   - document_content: Click the input field, then click the {x} (Insert variable) button, then select Global.DocumentContent.
   - persona_scope: Click the input field, then click {x}, then select Global.PersonaScope. If Global.PersonaScope is empty, type "all personas" as a default value.
   - analysis_type: Type the literal text: full

7. After the Action node, the flow's output variables become available. Add a Set variable value node below the Action node. Set Global.ExtractedElements to the flow output journey_html (click {x} then look under the Extract Journey Elements action outputs for journey_html).

8. Add a Send a message node below the Set variable node. Type:

```
Pass 1 extraction complete.

{Topic.ExtractionSummary}

Please review the extracted elements in the card below.
```

To insert the summary variable: position your cursor after "Pass 1 extraction complete." and the blank line, then click {x} and select the summary output from the Extract Journey Elements action.

9. Click Save.

---

# PHASE 5: Synthesize Journey Map -- FLOW BUILD (Action-by-Action)

This flow implements Pass 2 of the dual-pass architecture. It receives the validated extracted elements from Pass 1, sends them to Claude Opus with a synthesis prompt, and returns a complete interactive HTML journey map.

## Step 5.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > Customer Journey Mapper Solution

1. In your solution at make.powerautomate.com, click + New then Automation then Cloud flow then Instant.

2. Flow name: Synthesize Journey Map

3. Trigger: Run a flow from Copilot (or "When an agent calls the flow"). Click Create.

## Step 5.2: Configure the Trigger

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Trigger

1. Click on the trigger to expand it. Add three text inputs:

**Input 1:**
- Click + Add an input then select Text.
- Input name: extracted_elements
- Description: JSON string of validated extracted journey elements from Pass 1

**Input 2:**
- Click + Add an input then select Text.
- Input name: content_selections
- Description: JSON string of content selection preferences (which elements to include in the map)

**Input 3:**
- Click + Add an input then select Text.
- Input name: granularity
- Description: Journey map granularity level -- high_level, standard, or micro_moment

## Step 5.3: Action 1 -- Get the Anthropic API Key

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below trigger

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, paste your Anthropic API key (the literal key string starting with sk-ant-...).

3. Secure this action: Click the three dots (...) then Settings then Security then toggle Secure Inputs to On then toggle Secure Outputs to On then click Done.

4. Rename to: Get_Anthropic_Key

## Step 5.4: Action 2 -- Compose the Pass 2 System Prompt

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 1

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, paste:

```
You are an expert customer journey map synthesizer. You receive pre-extracted journey elements (stages, touchpoints, emotions, pain points, moments of truth) and your task is to synthesize them into a complete, interactive HTML journey map visualization.

SYNTHESIS RULES:
1. Organize stages in logical chronological order based on the customer lifecycle.
2. Ensure emotional scores form a coherent arc -- transitions between stages should be smooth unless a specific event causes a sharp change.
3. Identify the critical path -- the sequence of stages with the highest impact on customer retention.
4. Generate improvement opportunities that are specific, actionable, and prioritized by impact and effort.
5. Include all content categories specified in the content_selections parameter.
6. Maintain evidence traceability -- every insight must reference the original extracted element.

OUTPUT FORMAT:
Return a COMPLETE, self-contained HTML document that renders as an interactive journey map. The HTML must include:
- Inline CSS (no external stylesheets) using NXT Humans brand colors: Dark background #0D0D0D, Chartreuse accent #B8B800, Cyan accent #00B7C3, White text #FFFFFF on dark, Gray #4A4A4A for secondary elements
- A responsive layout that works on screens 1024px and wider
- An executive summary section at the top with key findings
- A horizontal stage timeline with color-coded emotional scores: red (#FF4444) for negative (-5 to -2), yellow (#FFD700) for neutral (-1 to +1), green (#44BB44) for positive (+2 to +5)
- Each stage as an expandable card showing: stage name, customer goal, actions, touchpoints with channel icons, emotional score with label, pain points with severity indicators, moments of truth, and opportunities
- An emotional arc line chart rendered with inline SVG
- A pain point severity heatmap
- A channel swimlane diagram showing which channels are active at each stage
- Customer quotes displayed as styled blockquotes with attribution
- A data quality section noting any gaps or low-confidence extractions
- JavaScript for expand/collapse interactions (no external libraries)

The HTML must be COMPLETE and render correctly when opened directly in a browser. Do not use placeholder text. Use the actual extracted data for all content.
```

3. Rename to: Pass2_System_Prompt

## Step 5.5: Action 3 -- Compose the Pass 2 User Prompt

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 2

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('Synthesize the following extracted journey elements into a complete interactive HTML journey map. Granularity level: ', triggerBody()?['granularity'], '. Content selections: ', triggerBody()?['content_selections'], '. Extracted elements from Pass 1: ', triggerBody()?['extracted_elements'])
```

3. Click OK.

4. Rename to: Pass2_User_Prompt

## Step 5.6: Action 4 -- Escape the System Prompt

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 3

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(outputs('Pass2_System_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK.

4. Rename to: Escape_Pass2_System

## Step 5.7: Action 5 -- Escape the User Prompt

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 4

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(outputs('Pass2_User_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK.

4. Rename to: Escape_Pass2_User

## Step 5.8: Action 6 -- Build the HTTP Request Body

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 5

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('{"model":"claude-opus-4-6","max_tokens":64000,"temperature":0.3,"system":"',outputs('Escape_Pass2_System'),'","messages":[{"role":"user","content":"',outputs('Escape_Pass2_User'),'"}]}')
```

3. Click OK.

4. Rename to: Build_Pass2_Body

## Step 5.9: Action 7 -- HTTP POST to Anthropic Claude API

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 6

1. Click + then Add an action then search for "HTTP" then select HTTP.

2. Configure:
   - Method: POST
   - URI: https://api.anthropic.com/v1/messages
   - Headers:
     - Header 1: Key = x-api-key | Value = click the dynamic content panel (lightning bolt) then under Get_Anthropic_Key, select Outputs
     - Header 2: Key = anthropic-version | Value = 2023-06-01
     - Header 3: Key = Content-Type | Value = application/json
   - Body: Click the dynamic content panel (lightning bolt) then under Build_Pass2_Body, select Outputs.

3. Configure timeout: Click the three dots (...) then Settings then Timeout then type: PT120S then click Done.

4. Secure this action: Click the three dots (...) then Settings then Security then toggle Secure Inputs to On then click Done.

5. Rename to: HTTP_Pass2

## Step 5.10: Action 8 -- Extract the Response Text

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 7

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
first(body('HTTP_Pass2')?['content'])?['text']
```

3. Click OK.

4. Rename to: Extract_Pass2_Response

## Step 5.11: Action 9 -- Save HTML Journey Map to SharePoint

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 8

1. Click + then Add an action then search for "Create file" then select Create file under the SharePoint connector.

2. Configure:
   - Site Address: Select your SharePoint site from the dropdown.
   - Folder Path: /Shared Documents/Journey Maps/HTML
   - File Name: Click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('journey_map_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.html')
```

   Click OK.

   - File Content: Click the dynamic content panel (lightning bolt) then under Extract_Pass2_Response, select Outputs.

3. Rename to: Save_HTML_to_SharePoint

## Step 5.12: Action 10 -- Create a Sharing Link

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 9

1. Click + then Add an action then search for "Create sharing link" then select Create sharing link for a file or folder under the SharePoint connector.

2. Configure:
   - Site Address: Your SharePoint site.
   - Item Id: Click the dynamic content panel (lightning bolt) then under Save_HTML_to_SharePoint, select ItemId (or Id).
   - Link Type: Organization
   - Link Scope: Organization

3. Rename to: Create_HTML_Sharing_Link

## Step 5.13: Action 11 -- Build the Summary

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 10

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('Journey map synthesized successfully. HTML file saved to SharePoint. Response length: ', string(length(coalesce(outputs('Extract_Pass2_Response'), ''))), ' characters.')
```

3. Click OK.

4. Rename to: Build_Pass2_Summary

## Step 5.14: Action 12 -- Respond to the Agent

WHERE AM I?: Power Automate > Flow Editor > Synthesize Journey Map > Below Action 11

1. Click + then Add an action then search for "Respond" then select Respond to Copilot.

2. Click + Add an output three times:

**Output 1:**
- Type: Text
- Name: journey_html
- Value: Click the dynamic content panel (lightning bolt) then under Extract_Pass2_Response, select Outputs

**Output 2:**
- Type: Text
- Name: summary
- Value: Click the dynamic content panel (lightning bolt) then under Build_Pass2_Summary, select Outputs

**Output 3:**
- Type: Text
- Name: status
- Value: Type: completed

3. Set Asynchronous Response to Off: Click the action, then Settings, then Networking, then toggle Asynchronous Response to Off.

4. Rename to: Respond_Pass2_Results

5. Click Save.

## Step 5.15: Action Stack Summary -- Synthesize Journey Map Flow

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Get_Anthropic_Key | Compose | API key with Secure Inputs/Outputs ON |
| 2 | Pass2_System_Prompt | Compose | Full synthesis system prompt with HTML output instructions |
| 3 | Pass2_User_Prompt | Compose | concat() with trigger inputs |
| 4 | Escape_Pass2_System | Compose | 4-step escape chain on system prompt |
| 5 | Escape_Pass2_User | Compose | 4-step escape chain on user prompt |
| 6 | Build_Pass2_Body | Compose | concat() JSON body with escaped prompts |
| 7 | HTTP_Pass2 | HTTP | POST to api.anthropic.com, timeout PT120S |
| 8 | Extract_Pass2_Response | Compose | first(body(...)['content'])?['text'] |
| 9 | Save_HTML_to_SharePoint | SharePoint Create file | /Journey Maps/HTML/ |
| 10 | Create_HTML_Sharing_Link | SharePoint | Organization sharing link |
| 11 | Build_Pass2_Summary | Compose | concat() summary with response length |
| 12 | Respond_Pass2_Results | Respond to Copilot | journey_html, summary, status |

## Step 5.16: Connect the Synthesize Flow to the Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Journey Analysis Request > Canvas

1. Go back to your Copilot Studio tab. Open the Journey Analysis Request topic.

2. Find the placeholder message node from Step 3.10 (Node 8) that says "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Synthesize Journey Map flow."

3. Delete this placeholder node.

4. Click the + button where the placeholder was. Select Add a tool.

5. Find Synthesize Journey Map in the list. Click it.

6. Map each input parameter:
   - extracted_elements: Click {x} then select Global.ExtractedElements.
   - content_selections: Click {x} then select Global.ContentSelections. If empty, type "all" as default.
   - granularity: Click {x} then select Global.Granularity.

7. After the Action node, add a Send a message node. Type:

```
Journey synthesis complete.

{Topic.JourneySummary}
```

Insert the summary variable by clicking {x} and selecting the summary output from the Synthesize Journey Map action.

8. Click Save.

---

# PHASE 6: Register Extract Journey Elements, Synthesize Journey Map -- TOOL REGISTRATION

After building both flows, we register them as tools so the generative orchestrator can call them autonomously when appropriate.

## Step 6.1: Register the Extract Journey Elements Tool

WHERE AM I?: Copilot Studio > Agent > Overview > Tools

1. Go back to Copilot Studio. Open your Customer Journey Mapper agent.

2. On the Overview page, find the Tools section. Click Add a tool.

3. In the tool picker, look for Power Automate flows (or Flows). Find Extract Journey Elements in the list. Click it then click Add and configure.

4. On the configuration screen:
   - Name: Extract Journey Elements
   - Description: Pass 1 of dual-pass journey analysis. Extracts journey stages, touchpoints, emotions (-5 to +5), pain points, and moments of truth from a research document using the Claude Opus API. Call this tool when the user uploads a document and wants to begin journey mapping. Does NOT synthesize the final map -- use Synthesize Journey Map for that.

5. Map the inputs:
   - document_content: Set to "From agent" (the orchestrator fills this from conversation context).
   - persona_scope: Set to "From agent".
   - analysis_type: Set to "From agent" with default value "full".

6. Under Completion, select "Don't respond (default)" -- the agent will incorporate the output into its next response.

7. Click Save.

## Step 6.2: Register the Synthesize Journey Map Tool

WHERE AM I?: Copilot Studio > Agent > Overview > Tools

1. Click Add a tool again.

2. Find Synthesize Journey Map. Click it then click Add and configure.

3. Configure:
   - Name: Synthesize Journey Map
   - Description: Pass 2 of dual-pass journey analysis. Takes validated extracted elements from Pass 1 and synthesizes them into a complete interactive HTML journey map with emotional arc, channel mapping, and improvement opportunities. Call this tool AFTER Extract Journey Elements has completed and the user has approved the extracted elements. Does NOT extract elements -- use Extract Journey Elements for that.

4. Map the inputs:
   - extracted_elements: Set to "From agent".
   - content_selections: Set to "From agent" with default value "all".
   - granularity: Set to "From agent" with default value "standard".

5. Under Completion, select "Don't respond (default)".

6. Click Save.

> **VERIFY**: The Tools section now shows two tools: Extract Journey Elements and Synthesize Journey Map.

---

# PHASE 7: Document Selection -- TOPIC BUILD (Node-by-Node: 7 Nodes)

This topic handles document upload, browsing, and validation before redirecting to the Journey Analysis Request topic. It provides a dedicated entry point for document management.

## Step 7.1: Create the Document Selection Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Custom

1. Click the Topics tab then Custom subtab.

2. Click + Add a topic then From blank.

3. Rename the topic to: Document Selection

4. Set the Description to: User needs to select, upload, or manage input documents for journey analysis. Route here when the user wants to upload a new document, switch between documents, or asks about supported file formats. Does NOT perform journey analysis (use Journey Analysis Request) or export (use Export Journey).

## Step 7.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agent > Topics > Document Selection > Trigger node

1. Add these trigger phrases (press Enter after each):
   - upload document
   - select input file
   - change document
   - supported file formats
   - manage documents
   - browse research files
   - upload a new file
   - what files can I upload
   - select from library
   - switch to a different document

## Step 7.3: Add Node 1 -- Message: Document Management Overview

WHERE AM I?: Copilot Studio > Agent > Topics > Document Selection > Canvas

1. Click + below the Trigger node then Send a message.

2. Type:

```
I can help you manage your research documents for journey mapping.

Supported document types:
- PDF research reports and white papers
- DOCX interview transcripts and survey reports
- TXT plain text data exports and support ticket logs

Document requirements:
- Minimum 500 words of journey-relevant content
- Maximum 100 pages or 200,000 characters per document
- Content should describe customer experiences, interactions, or feedback

You can:
1. Upload a new document by dragging it into this chat
2. Browse existing documents in the CX Research Library on SharePoint
3. Combine multiple shorter documents for a single analysis
```

## Step 7.4: Add Node 2 -- Question: Select Document Action

WHERE AM I?: Copilot Studio > Agent > Topics > Document Selection > Canvas (below Node 1)

1. Click + then Ask a question.

2. Type: What would you like to do?

3. Under "Identify", click the dropdown and select one of the following options. Since we want structured choices, we will use a choice entity. Select the option that lets you define choices inline. If you see "Multiple choice options", select that. Otherwise, select User's entire response.

4. If using multiple choice options, add these choices:
   - Upload a new document
   - Browse the CX Research Library
   - Check if my file format is supported

5. Click the output variable name. Rename it to DocumentAction. Leave it as Topic-scoped.

## Step 7.5: Add Node 3 -- Condition: Route Document Action

WHERE AM I?: Copilot Studio > Agent > Topics > Document Selection > Canvas (below Node 2)

1. Click + then Add a condition.

2. Set the condition: Variable = Topic.DocumentAction, Operator = "is equal to", Value = "Upload a new document".

3. In the Yes branch, click + then Send a message. Type:

```
Please upload your research document now. You can:
- Drag and drop a file into this chat window
- Copy and paste the document text directly
- Share a link to a file in SharePoint

I accept PDF, DOCX, and TXT files up to 200,000 characters.
```

4. After this message, add a Question node. Type: Please provide your document content now. Under "Identify", select User's entire response. Rename the output variable to DocumentContent. Under Usage in the Variable properties panel, select "Global (any topic can access)" so it becomes Global.DocumentContent.

5. In the "All other conditions" (else) branch, click + then Send a message. Type:

```
To browse the CX Research Library, open this SharePoint folder and select a document:

https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/CX Research

After selecting a document, copy its content and paste it here, or share the file link.

Supported formats: PDF, DOCX, TXT, XLSX
Minimum content: 500 words
Maximum content: 200,000 characters (approximately 100 pages)
```

> **WATCH OUT**: Replace the SharePoint URL with your actual CX Research Library URL.

## Step 7.6: Add Node 4-5 -- Validate and Confirm

WHERE AM I?: Copilot Studio > Agent > Topics > Document Selection > Canvas (below Node 3 branches)

1. After both branches converge (or after the upload Question node in the Yes branch), click + then Add a condition.

2. Set the condition: Variable = Global.DocumentContent, Operator = "is not empty".

3. In the Yes branch, click + then Send a message. Type:

```
Document received and validated.

Your document is ready for journey analysis. I will now redirect you to the Journey Analysis Request workflow where you can define the journey scope and begin the dual-pass analysis.
```

4. In the else branch, click + then Send a message. Type:

```
I did not receive any document content. Please try again by uploading a file or pasting text directly into the chat.
```

Then add an End current topic node.

## Step 7.7: Add Node 7 -- Redirect to Journey Analysis

WHERE AM I?: Copilot Studio > Agent > Topics > Document Selection > Canvas (below Node 6 Yes branch)

1. In the Yes branch (document validated), after the confirmation message, click + then Topic management then Redirect to another topic.

2. In the redirect node, select Journey Analysis Request from the topic list.

3. Click Save.

## Step 7.8: Complete YAML for Document Selection Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Document Selection > (...) > Open code editor

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Document Selection
    triggerQueries:
      - upload document
      - select input file
      - change document
      - supported file formats
      - manage documents
      - browse research files
      - upload a new file
      - what files can I upload
      - select from library
      - switch to a different document
  actions:
    - kind: SendMessage
      id: docOverview
      message: |-
        I can help you manage your research documents for journey mapping.

        Supported document types:
        - PDF research reports and white papers
        - DOCX interview transcripts and survey reports
        - TXT plain text data exports and support ticket logs

        Document requirements:
        - Minimum 500 words of journey-relevant content
        - Maximum 100 pages or 200,000 characters per document
        - Content should describe customer experiences, interactions, or feedback

        You can:
        1. Upload a new document by dragging it into this chat
        2. Browse existing documents in the CX Research Library on SharePoint
        3. Combine multiple shorter documents for a single analysis

    - kind: Question
      id: askDocAction
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.DocumentAction
      prompt: "What would you like to do? You can upload a new document, browse the CX Research Library, or check if your file format is supported."
      entity: StringPrebuiltEntity

    - kind: SendMessage
      id: uploadPrompt
      message: "Please upload your research document now. Drag and drop a file into this chat, copy and paste the document text directly, or share a link to a file in SharePoint. I accept PDF, DOCX, and TXT files up to 200,000 characters."

    - kind: Question
      id: getDocContent
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.DocumentContent
      prompt: "Please provide your document content now."
      entity: StringPrebuiltEntity

    - kind: ConditionGroup
      id: validateDoc
      conditions:
        - id: hasDoc
          condition: =!IsBlank(Global.DocumentContent)
          actions:
            - kind: SendMessage
              id: docConfirmed
              message: "Document received and validated. Your document is ready for journey analysis. I will now redirect you to the Journey Analysis Request workflow."
            - kind: BeginDialog
              id: redirectToAnalysis
              dialog: Journey Analysis Request
      elseActions:
        - kind: SendMessage
          id: noDocReceived
          message: "I did not receive any document content. Please try again by uploading a file or pasting text directly into the chat."
        - kind: EndDialog
          id: endNoDoc
```

---

# PHASE 8: Content Customization -- TOPIC BUILD (Node-by-Node: 6 Nodes)

This topic lets users control which elements appear in the journey map output and set the granularity level.

## Step 8.1: Create the Content Customization Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Custom

1. Click + Add a topic then From blank.

2. Rename to: Content Customization

3. Set the Description to: User wants to customize which elements appear in the journey map output. Route here when the user mentions selecting content types (emotions, pain points, touchpoints, quotes), adjusting granularity, choosing a persona, or modifying the journey scope. Does NOT perform analysis (use Journey Analysis Request) or export (use Export Journey).

## Step 8.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agent > Topics > Content Customization > Trigger node

1. Add these trigger phrases:
   - customize journey map
   - select content types
   - adjust granularity
   - choose persona
   - modify journey scope
   - change what is included in the map
   - toggle content categories
   - set journey detail level
   - pick which elements to show
   - configure map output

## Step 8.3: Add Node 1 -- Message: Content Options Introduction

WHERE AM I?: Copilot Studio > Agent > Topics > Content Customization > Canvas

1. Click + below the Trigger node then Send a message.

2. Type:

```
You can customize which elements appear in your journey map. Here are the available content categories:

1. Emotional Journey -- mood scores (-5 to +5) at each stage with an emotional arc visualization
2. Pain Points -- customer frustrations with severity ratings (1-5) and evidence quotes
3. Touchpoints with Channels -- interaction points labeled by channel (email, phone, web, in-person, etc.)
4. Moments of Truth -- critical make-or-break moments that determine loyalty or churn
5. Opportunities -- improvement recommendations prioritized by impact and effort
6. Customer Quotes -- direct verbatim quotes from the source document
7. Channel Swimlanes -- visual lanes showing which channels are active at each stage

All categories are enabled by default. You can toggle any combination on or off.
```

## Step 8.4: Add Node 2 -- Adaptive Card: Content Selection Checklist

WHERE AM I?: Copilot Studio > Agent > Topics > Content Customization > Canvas (below Node 1)

1. Click + then Ask with Adaptive Card.

2. Click the three dots (...) then Properties then Edit adaptive card.

3. In the JSON editor, paste:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "TextBlock",
          "text": "CONTENT SELECTION",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Toggle each content category on or off. All are enabled by default.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "Input.Toggle",
      "id": "emotionalJourney",
      "title": "Emotional Journey (mood scores -5 to +5)",
      "value": "true",
      "valueOn": "true",
      "valueOff": "false"
    },
    {
      "type": "Input.Toggle",
      "id": "painPoints",
      "title": "Pain Points (frustrations with severity ratings)",
      "value": "true",
      "valueOn": "true",
      "valueOff": "false"
    },
    {
      "type": "Input.Toggle",
      "id": "touchpointsChannels",
      "title": "Touchpoints with Channels (interaction points by channel)",
      "value": "true",
      "valueOn": "true",
      "valueOff": "false"
    },
    {
      "type": "Input.Toggle",
      "id": "momentsTruth",
      "title": "Moments of Truth (critical make-or-break moments)",
      "value": "true",
      "valueOn": "true",
      "valueOff": "false"
    },
    {
      "type": "Input.Toggle",
      "id": "opportunities",
      "title": "Opportunities (improvement recommendations)",
      "value": "true",
      "valueOn": "true",
      "valueOff": "false"
    },
    {
      "type": "Input.Toggle",
      "id": "customerQuotes",
      "title": "Customer Quotes (direct verbatims from source)",
      "value": "true",
      "valueOn": "true",
      "valueOff": "false"
    },
    {
      "type": "Input.Toggle",
      "id": "channelSwimlanes",
      "title": "Channel Swimlanes (visual channel lanes per stage)",
      "value": "true",
      "valueOn": "true",
      "valueOff": "false"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "SAVE CONTENT SELECTIONS"
    }
  ]
}
```

4. Click Save in the editor.

5. The Adaptive Card creates output variables for each toggle: emotionalJourney, painPoints, touchpointsChannels, momentsTruth, opportunities, customerQuotes, channelSwimlanes. These are all Topic-scoped by default.

6. Below the Adaptive Card node, add a Set variable value node. Set Global.ContentSelections to a concatenated string of the selections. Click the formula icon (fx) and type:

**COPY-PASTE** into the formula field:
```
Concatenate("{""emotionalJourney"":", Topic.emotionalJourney, ",""painPoints"":", Topic.painPoints, ",""touchpointsChannels"":", Topic.touchpointsChannels, ",""momentsTruth"":", Topic.momentsTruth, ",""opportunities"":", Topic.opportunities, ",""customerQuotes"":", Topic.customerQuotes, ",""channelSwimlanes"":", Topic.channelSwimlanes, "}")
```

Click Done.

> **BEGINNER TIP**: This formula builds a JSON-like string from the toggle values. Each toggle returns "true" or "false" as a string. The doubled double-quotes ("") are how you escape quotes inside a Power Fx string. The result looks like: {"emotionalJourney":true,"painPoints":true,...}

## Step 8.5: Add Node 3 -- Question: Set Persona Scope

WHERE AM I?: Copilot Studio > Agent > Topics > Content Customization > Canvas (below Node 2)

1. Click + then Ask a question.

2. Type: If your source document contains data about multiple customer personas or segments, which persona should the journey map focus on? Type the persona name, or type "all" to include all personas.

3. Under "Identify", select User's entire response.

4. Click the output variable. Rename to PersonaScope. Under Usage, select "Global (any topic can access)" so it becomes Global.PersonaScope.

## Step 8.6: Add Node 4 -- Question: Set Granularity Level

WHERE AM I?: Copilot Studio > Agent > Topics > Content Customization > Canvas (below Node 3)

1. Click + then Ask a question.

2. Type: What level of detail should the journey map include?

3. Under "Identify", we will use our custom entity or inline choices. Select the option for multiple choice and add:
   - High-level (3-5 broad phases)
   - Standard (5-8 detailed stages)
   - Micro-moment (10+ granular touchpoint-level steps)

4. Click the output variable. Rename to GranularityChoice. Leave as Topic-scoped for now.

5. Below this question, add a Set variable value node. Set Global.Granularity based on the choice:
   - Variable: Global.Granularity
   - Value: Click {x} and select Topic.GranularityChoice

> **WATCH OUT**: The granularity values passed to the flow should be: high_level, standard, or micro_moment (with underscores). If the user selects "High-level (3-5 broad phases)", you may need to map this to "high_level". For simplicity, the flow accepts any of these values and the Claude prompt handles interpretation.

## Step 8.7: Add Node 5 -- Condition: Validate Content Selections

WHERE AM I?: Copilot Studio > Agent > Topics > Content Customization > Canvas (below Node 4)

1. Click + then Add a condition.

2. Set the condition: Variable = Global.ContentSelections, Operator = "is not empty".

3. In the Yes branch, proceed to the confirmation message (Node 6).

4. In the else branch, add a Send a message: "No content selections were saved. All categories will be enabled by default." Then add a Set variable value node setting Global.ContentSelections to "all".

## Step 8.8: Add Node 6 -- Message: Customization Confirmed

WHERE AM I?: Copilot Studio > Agent > Topics > Content Customization > Canvas (below Node 5)

1. In the Yes branch (or after the else branch converges), click + then Send a message.

2. Type:

```
Content customization saved.

Your settings:
- Persona scope: {Global.PersonaScope}
- Granularity: {Global.Granularity}
- Content selections have been updated

These settings will be applied during the next journey synthesis pass. To start a new analysis, type "create journey map". To re-run synthesis with updated settings on an existing extraction, type "synthesize journey".
```

3. Insert the variables by clicking {x} at the appropriate positions and selecting Global.PersonaScope and Global.Granularity.

4. Add an End current topic node.

5. Click Save.

## Step 8.9: Complete YAML for Content Customization Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Content Customization > (...) > Open code editor

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Content Customization
    triggerQueries:
      - customize journey map
      - select content types
      - adjust granularity
      - choose persona
      - modify journey scope
      - change what is included in the map
      - toggle content categories
      - set journey detail level
      - pick which elements to show
      - configure map output
  actions:
    - kind: SendMessage
      id: contentIntro
      message: |-
        You can customize which elements appear in your journey map. Here are the available content categories:

        1. Emotional Journey -- mood scores (-5 to +5) at each stage with an emotional arc visualization
        2. Pain Points -- customer frustrations with severity ratings (1-5) and evidence quotes
        3. Touchpoints with Channels -- interaction points labeled by channel (email, phone, web, in-person, etc.)
        4. Moments of Truth -- critical make-or-break moments that determine loyalty or churn
        5. Opportunities -- improvement recommendations prioritized by impact and effort
        6. Customer Quotes -- direct verbatim quotes from the source document
        7. Channel Swimlanes -- visual lanes showing which channels are active at each stage

        All categories are enabled by default. You can toggle any combination on or off.

    - kind: Question
      id: contentCard
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.ContentCardResponse
      prompt: "Use the card above to toggle content categories, then click SAVE CONTENT SELECTIONS."
      entity: StringPrebuiltEntity

    - kind: Question
      id: askPersona
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.PersonaScope
      prompt: "If your source document contains data about multiple customer personas or segments, which persona should the journey map focus on? Type the persona name, or type 'all' to include all personas."
      entity: StringPrebuiltEntity

    - kind: Question
      id: askGranularity
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.GranularityChoice
      prompt: "What level of detail should the journey map include?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: high_level
              displayName: "High-level (3-5 broad phases)"
            - id: standard
              displayName: "Standard (5-8 detailed stages)"
            - id: micro_moment
              displayName: "Micro-moment (10+ granular touchpoint-level steps)"

    - kind: SetVariable
      id: setGranularity
      variable: Global.Granularity
      value: =Topic.GranularityChoice

    - kind: SendMessage
      id: customConfirmed
      message: |-
        Content customization saved.

        Your settings:
        - Persona scope: {Global.PersonaScope}
        - Granularity: {Global.Granularity}
        - Content selections have been updated

        These settings will be applied during the next journey synthesis pass. To start a new analysis, type "create journey map". To re-run synthesis with updated settings on an existing extraction, type "synthesize journey".

    - kind: EndDialog
      id: endCustomization
```

---

# PHASE 9: Export Journey -- TOPIC BUILD (Node-by-Node: 6 Nodes)

This topic handles exporting completed journey maps in multiple formats: Interactive HTML, CSV, Miro Board, and JSON.

## Step 9.1: Create the Export Journey Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Custom

1. Click + Add a topic then From blank.

2. Rename to: Export Journey

3. Set the Description to: User wants to export, download, or share a completed journey map. Route here when the user asks for HTML export, CSV download, Miro board generation, JSON output, or wants to share the journey map with colleagues. Does NOT perform analysis (use Journey Analysis Request) or customize content (use Content Customization).

## Step 9.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agent > Topics > Export Journey > Trigger node

1. Add these trigger phrases:
   - export journey map
   - download journey HTML
   - export journey to CSV
   - generate Miro board
   - share journey map
   - download my journey map
   - get the journey map file
   - export to spreadsheet
   - save journey as JSON
   - send journey map to team

## Step 9.3: Add Node 1 -- Message: Export Options Overview

WHERE AM I?: Copilot Studio > Agent > Topics > Export Journey > Canvas

1. Click + then Send a message.

2. Type:

```
Here are the available export formats for your journey map:

1. Interactive HTML -- A self-contained web page with expandable stage cards, emotional arc chart, and channel swimlanes. Opens in any browser.

2. CSV -- A spreadsheet with one row per stage, columns for all journey elements (touchpoints, emotions, pain points, etc.). Opens in Excel or Google Sheets.

3. Miro Board -- A visual whiteboard with sticky notes, connectors, and swimlanes. Requires Miro access. This will hand off to the Miro Board Generator agent.

4. JSON -- Raw structured data for programmatic use or integration with other tools.

HTML and CSV files are automatically generated and saved to SharePoint. Miro Board creation requires a separate step.
```

## Step 9.4: Add Node 2 -- Question: Select Export Format

WHERE AM I?: Copilot Studio > Agent > Topics > Export Journey > Canvas (below Node 1)

1. Click + then Ask a question.

2. Type: Which export format would you like? You can select one or more.

3. Under "Identify", use the Export Formats entity we created earlier. If you can select a custom entity, choose Export Formats. Otherwise, use multiple choice options and add: Interactive HTML, CSV, Miro Board, JSON.

4. Click the output variable. Rename to ExportFormat. Leave as Topic-scoped.

## Step 9.5: Add Node 3 -- Condition: Check Miro Board Requested

WHERE AM I?: Copilot Studio > Agent > Topics > Export Journey > Canvas (below Node 2)

1. Click + then Add a condition.

2. Set the condition: Variable = Topic.ExportFormat, Operator = "is equal to", Value = "Miro Board".

3. In the Yes branch (Miro requested), click + then Send a message. Type:

```
Miro Board export selected. This requires the Miro Board Generator agent.

I will prepare the journey map data and hand off to the Miro Board Generator, which will create a visual whiteboard with:
- Sticky notes for each journey stage
- Color-coded emotional indicators
- Connectors showing stage transitions
- Swimlanes for different channels

Preparing handoff...
```

4. In the else branch (HTML, CSV, or JSON), click + then Send a message. Type:

```
Generating your export files. This may take a moment...
```

## Step 9.6: Add Node 4 -- Action: Generate Export Files

WHERE AM I?: Copilot Studio > Agent > Topics > Export Journey > Canvas (below Node 3 else branch)

1. In the else branch (non-Miro exports), we call the Synthesize Journey Map flow to regenerate the output in the requested format. Since the HTML is already saved from the initial synthesis, we primarily need to generate CSV and JSON exports.

2. Click + then Add a tool. Select Synthesize Journey Map.

3. Map inputs:
   - extracted_elements: Click {x} then select Global.ExtractedElements.
   - content_selections: Click {x} then select Global.ContentSelections.
   - granularity: Click {x} then select Global.Granularity.

4. After the Action node, add a Send a message node referencing the flow outputs.

## Step 9.7: Add Node 5 -- Adaptive Card: Export Downloads Card

WHERE AM I?: Copilot Studio > Agent > Topics > Export Journey > Canvas (below Node 4)

1. Click + then Send a message (non-interactive display card).

2. Click the + (Add) button in the message toolbar and select Adaptive Card.

3. Paste:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "TextBlock",
          "text": "JOURNEY MAP EXPORTS READY",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Your journey map has been exported in the requested format(s). Click the buttons below to download or view.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Format",
          "value": "Interactive HTML"
        },
        {
          "title": "Stages",
          "value": "See journey map"
        },
        {
          "title": "Location",
          "value": "SharePoint > Journey Maps"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Files are saved in your SharePoint Journey Maps folder, organized by format (HTML, CSV, JSON).",
      "wrap": true,
      "size": "Small",
      "spacing": "Medium"
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "OPEN HTML JOURNEY MAP",
      "url": "https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Journey Maps/HTML/"
    },
    {
      "type": "Action.OpenUrl",
      "title": "OPEN CSV EXPORT",
      "url": "https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Journey Maps/CSV/"
    },
    {
      "type": "Action.OpenUrl",
      "title": "OPEN JSON DATA",
      "url": "https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Journey Maps/JSON/"
    }
  ]
}
```

> **WATCH OUT**: Replace all three URL values with your actual SharePoint folder URLs.

4. Save the card.

## Step 9.8: Add Node 6 -- Redirect for Miro Board

WHERE AM I?: Copilot Studio > Agent > Topics > Export Journey > Canvas (Yes branch of Node 3)

1. In the Yes branch (Miro Board requested), after the Miro preparation message, click + then Send a message. Type:

```
The Miro Board Generator agent is a separate agent that creates visual whiteboards from journey map data. To use it:

1. Copy the journey map JSON from the SharePoint JSON folder
2. Open the Miro Board Generator agent
3. Paste the JSON and follow the board creation workflow

Direct handoff to the Miro Board Generator will be available in a future update.
```

2. Add an End current topic node.

3. In the else branch, after the Export Downloads Card, add an End current topic node.

4. Click Save.

## Step 9.9: Complete YAML for Export Journey Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Export Journey > (...) > Open code editor

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Export Journey
    triggerQueries:
      - export journey map
      - download journey HTML
      - export journey to CSV
      - generate Miro board
      - share journey map
      - download my journey map
      - get the journey map file
      - export to spreadsheet
      - save journey as JSON
      - send journey map to team
  actions:
    - kind: SendMessage
      id: exportOverview
      message: |-
        Here are the available export formats for your journey map:

        1. Interactive HTML -- A self-contained web page with expandable stage cards, emotional arc chart, and channel swimlanes. Opens in any browser.

        2. CSV -- A spreadsheet with one row per stage, columns for all journey elements (touchpoints, emotions, pain points, etc.). Opens in Excel or Google Sheets.

        3. Miro Board -- A visual whiteboard with sticky notes, connectors, and swimlanes. Requires Miro access. This will hand off to the Miro Board Generator agent.

        4. JSON -- Raw structured data for programmatic use or integration with other tools.

        HTML and CSV files are automatically generated and saved to SharePoint. Miro Board creation requires a separate step.

    - kind: Question
      id: askFormat
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.ExportFormat
      prompt: "Which export format would you like? You can select one or more."
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: html
              displayName: Interactive HTML
            - id: csv
              displayName: CSV
            - id: miro
              displayName: Miro Board
            - id: json
              displayName: JSON

    - kind: ConditionGroup
      id: checkMiro
      conditions:
        - id: isMiro
          condition: =Topic.ExportFormat = "miro"
          actions:
            - kind: SendMessage
              id: miroMsg
              message: |-
                Miro Board export selected. The Miro Board Generator agent is a separate agent that creates visual whiteboards from journey map data. To use it:

                1. Copy the journey map JSON from the SharePoint JSON folder
                2. Open the Miro Board Generator agent
                3. Paste the JSON and follow the board creation workflow

                Direct handoff to the Miro Board Generator will be available in a future update.
            - kind: EndDialog
              id: endMiro
      elseActions:
        - kind: SendMessage
          id: generatingMsg
          message: "Generating your export files. This may take a moment..."
        - kind: SendMessage
          id: exportPlaceholder
          message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Synthesize Journey Map flow for export generation. Map inputs: extracted_elements -> Global.ExtractedElements, content_selections -> Global.ContentSelections, granularity -> Global.Granularity."
        - kind: SendMessage
          id: exportComplete
          message: "Your journey map exports are ready. Check the SharePoint Journey Maps folder for your files."
        - kind: EndDialog
          id: endExport
```

---

# PHASE 10: Export Journey Map -- FLOW BUILD (Action-by-Action)

This flow generates CSV and JSON export files from the extracted journey elements. It is a simpler flow than the synthesis flow because it reformats existing data rather than calling the Claude API.

## Step 10.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > Customer Journey Mapper Solution

1. In your solution, click + New then Automation then Cloud flow then Instant.

2. Flow name: Export Journey Map

3. Trigger: Run a flow from Copilot. Click Create.

## Step 10.2: Configure the Trigger

WHERE AM I?: Power Automate > Flow Editor > Export Journey Map > Trigger

1. Add two text inputs:

**Input 1:**
- Click + Add an input then select Text.
- Input name: extracted_elements
- Description: JSON string of journey elements to export

**Input 2:**
- Click + Add an input then select Text.
- Input name: export_format
- Description: Requested export format -- html, csv, json, or all

## Step 10.3: Action 1 -- Parse the Elements JSON

WHERE AM I?: Power Automate > Flow Editor > Export Journey Map > Below trigger

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the dynamic content panel (lightning bolt) then select extracted_elements from the trigger.

3. Rename to: Raw_Elements

## Step 10.4: Action 2 -- Generate CSV Content

WHERE AM I?: Power Automate > Flow Editor > Export Journey Map > Below Action 1

1. Click + then Add an action then search for "Compose" then select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('Stage Name,Customer Goal,Emotional Score,Emotional Label,Pain Point Count,Touchpoint Count,Moment of Truth Count,Opportunity Count', decodeUriComponent('%0A'), 'Data rows will be generated from the extracted elements JSON. This is a simplified CSV header for the export.')
```

3. Click OK.

4. Rename to: Build_CSV_Content

> **BEGINNER TIP**: In a production implementation, you would use an Apply to each loop to iterate through the stages array in the JSON and build CSV rows. For this recipe, we generate a simplified CSV with the header row and a note. The full CSV generation can be enhanced by parsing the JSON with a Parse JSON action and looping through stages.

## Step 10.5: Action 3 -- Save CSV to SharePoint

WHERE AM I?: Power Automate > Flow Editor > Export Journey Map > Below Action 2

1. Click + then Add an action then search for "Create file" then select Create file (SharePoint).

2. Configure:
   - Site Address: Your SharePoint site.
   - Folder Path: /Shared Documents/Journey Maps/CSV
   - File Name: Click fx and paste:

**COPY-PASTE** into the Expression field:
```
concat('journey_export_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.csv')
```

   - File Content: Click the dynamic content panel (lightning bolt) then under Build_CSV_Content, select Outputs.

3. Rename to: Save_CSV_to_SharePoint

## Step 10.6: Action 4 -- Save JSON to SharePoint

WHERE AM I?: Power Automate > Flow Editor > Export Journey Map > Below Action 3

1. Click + then Add an action then search for "Create file" then select Create file (SharePoint).

2. Configure:
   - Site Address: Your SharePoint site.
   - Folder Path: /Shared Documents/Journey Maps/JSON
   - File Name: Click fx and paste:

**COPY-PASTE** into the Expression field:
```
concat('journey_export_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.json')
```

   - File Content: Click the dynamic content panel (lightning bolt) then select extracted_elements from the trigger.

3. Rename to: Save_JSON_to_SharePoint

## Step 10.7: Action 5 -- Respond to the Agent

WHERE AM I?: Power Automate > Flow Editor > Export Journey Map > Below Action 4

1. Click + then Add an action then search for "Respond" then select Respond to Copilot.

2. Add two outputs:

**Output 1:**
- Type: Text
- Name: download_url
- Value: Click the dynamic content panel (lightning bolt) then under Save_CSV_to_SharePoint, select the Link to item or File Path output.

**Output 2:**
- Type: Text
- Name: status
- Value: Type: completed

3. Set Asynchronous Response to Off.

4. Rename to: Respond_Export_Results

5. Click Save.

## Step 10.8: Action Stack Summary -- Export Journey Map Flow

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Raw_Elements | Compose | Trigger input extracted_elements |
| 2 | Build_CSV_Content | Compose | CSV header row generation |
| 3 | Save_CSV_to_SharePoint | SharePoint Create file | /Journey Maps/CSV/ |
| 4 | Save_JSON_to_SharePoint | SharePoint Create file | /Journey Maps/JSON/ |
| 5 | Respond_Export_Results | Respond to Copilot | download_url, status |

---

# PHASE 11: Register Export Journey Map -- TOOL REGISTRATION

## Step 11.1: Register the Export Journey Map Tool

WHERE AM I?: Copilot Studio > Agent > Overview > Tools

1. Go back to Copilot Studio. Open your Customer Journey Mapper agent.

2. On the Overview page, find the Tools section. Click Add a tool.

3. Find Export Journey Map in the list. Click it then click Add and configure.

4. Configure:
   - Name: Export Journey Map
   - Description: Generates CSV and JSON export files from extracted journey elements and saves them to SharePoint. Call this tool when the user wants to download or export a completed journey map. Does NOT perform analysis or synthesis -- use Extract Journey Elements and Synthesize Journey Map for those.

5. Map inputs:
   - extracted_elements: Set to "From agent".
   - export_format: Set to "From agent" with default value "all".

6. Under Completion, select "Don't respond (default)".

7. Click Save.

> **VERIFY**: The Tools section now shows three tools: Extract Journey Elements, Synthesize Journey Map, and Export Journey Map.

---

# PHASE 12: Publish and Deploy to Teams

## Step 12.1: Publish the Agent

WHERE AM I?: Copilot Studio > Agent > Overview

1. In Copilot Studio, click the Publish button at the top of the Overview page.

2. In the confirmation dialog, click Publish again.

3. Wait for the green "Published successfully" banner. This may take 1-2 minutes.

> **CRITICAL**: Event triggers and tool registrations only become active after publishing. Conversational features work in the test pane before publishing, but the full pipeline requires this step.

## Step 12.2: Deploy to Microsoft Teams

WHERE AM I?: Copilot Studio > Agent > Channels

1. After publishing, click the Channels tab in the top navigation.

2. Click the "Teams and Microsoft 365 Copilot" tile.

3. Click Add channel.

4. A panel opens. Click "See agent in Teams" -- this opens Microsoft Teams and prompts you to install the agent.

5. In Teams, click Add to install the agent in your chat.

6. To share with your team:
   - Click Availability options in the Copilot Studio channel panel then Submit for admin approval.
   - Your Teams admin then goes to Teams Admin Center then Apps then finds your agent then clicks Publish.
   - Optional: The admin can create an App Setup Policy to auto-install and pin the agent for specific users or groups.

## Step 12.3: Configure Email Delivery (Optional)

WHERE AM I?: Power Automate > Solutions > Customer Journey Mapper Solution

1. To add email delivery of completed journey maps, create a new flow or add actions to the Synthesize Journey Map flow after the Respond to Copilot action (actions after Respond can run asynchronously for up to 30 days).

2. Add an Office 365 Outlook > Send an email (V2) action:
   - To: The requesting user's email (use System.User.Email from the agent context, or add a userEmail trigger input).
   - Subject: Customer Journey Map Complete
   - Body: Include a link to the SharePoint HTML file and a summary of the journey map.

---

# PHASE 13: Testing (5+ Scenarios)

## Step 13.1: Test Scenario 1 -- Basic Journey Analysis

WHERE AM I?: Copilot Studio > Agent > Test pane (bottom-right corner)

1. Click the Test your agent button (chat icon) in the bottom-right corner of Copilot Studio.

2. If a previous conversation exists, click the refresh icon to start a new conversation.

3. Type: create journey map

4. Expected result: The agent should trigger the Journey Analysis Request topic and display the journey mapping introduction message explaining the dual-pass process.

5. When prompted to upload a document, paste a sample interview transcript (at least 500 words describing a customer experience).

6. Verify: The agent asks for journey scope (persona, start point, end point).

7. Type: New customer, from awareness to first purchase

8. Verify: The agent calls the Extract Journey Elements flow (check flow run history at make.powerautomate.com).

## Step 13.2: Test Scenario 2 -- Document Selection

WHERE AM I?: Copilot Studio > Agent > Test pane

1. Start a new conversation.

2. Type: upload document

3. Expected result: The Document Selection topic activates, showing supported formats and options.

4. Type: Upload a new document

5. Verify: The agent prompts for document content.

6. Paste sample text and verify the agent validates and redirects to Journey Analysis Request.

## Step 13.3: Test Scenario 3 -- Content Customization

WHERE AM I?: Copilot Studio > Agent > Test pane

1. Start a new conversation.

2. Type: customize journey map

3. Expected result: The Content Customization topic activates with the content options introduction.

4. Verify: The Adaptive Card with toggle switches appears.

5. Toggle off "Customer Quotes" and "Channel Swimlanes", then click SAVE CONTENT SELECTIONS.

6. When asked about persona, type: Enterprise IT Manager

7. When asked about granularity, select: Standard (5-8 detailed stages)

8. Verify: The confirmation message shows the saved settings.

## Step 13.4: Test Scenario 4 -- Export Journey

WHERE AM I?: Copilot Studio > Agent > Test pane

1. Start a new conversation.

2. Type: export journey map

3. Expected result: The Export Journey topic activates with format options.

4. Select: CSV

5. Verify: The agent generates export files and displays the downloads card.

## Step 13.5: Test Scenario 5 -- Full End-to-End Pipeline

WHERE AM I?: Microsoft Teams > Customer Journey Mapper agent

1. Open Teams and find the Customer Journey Mapper agent.

2. Type: I want to map the onboarding journey for our SaaS product

3. Follow the complete workflow: upload document, define scope, review extracted elements, approve, wait for synthesis.

4. Verify the following sequence:
   - Pass 1 flow runs successfully (check at make.powerautomate.com > Flow runs)
   - Element Review Adaptive Card appears in Teams
   - After approval, Pass 2 flow runs
   - HTML file appears in SharePoint /Journey Maps/HTML/
   - JSON file appears in SharePoint /Journey Maps/JSON/
   - Journey Map Preview card appears in Teams

5. Type: export journey to CSV

6. Verify: CSV file appears in SharePoint /Journey Maps/CSV/

## Step 13.6: Test Scenario 6 -- Error Handling

WHERE AM I?: Copilot Studio > Agent > Test pane

1. Start a new conversation.

2. Type: create journey map

3. When prompted for a document, type a very short message: Hello

4. Verify: The agent warns that the content is insufficient (the condition check catches the short input, or the flow returns an error about minimum word count).

---

# PHASE 14: Troubleshooting Reference

| Symptom | Resolution |
|---|---|
| Agent does not respond to any query | Verify generative orchestration is enabled (Step 1.4). Confirm the agent is published (Step 12.1). Check that at least one knowledge source is connected with a green checkmark. |
| Agent says "I could not find information" | Your SharePoint libraries may be empty or the user does not have permissions. Upload test documents to the CX Research Library. Check that knowledge source descriptions accurately describe the content. |
| Flow fails with 401 Unauthorized | Your Anthropic API key is expired or incorrect. Go to make.powerapps.com then Solutions then open the Compose action with the key then verify the value starts with sk-ant-. Check that the x-api-key header references the correct action output. |
| Flow fails with 400 Bad Request | The JSON body sent to the Claude API is malformed. Check that the escape chain (4-step replace) is applied to BOTH the system prompt and user prompt. Open the flow run history and inspect the Build_Pass1_Body or Build_Pass2_Body output for invalid JSON. |
| HTTP action times out | The default timeout is 30 seconds. Verify you set the timeout to PT120S on both HTTP_Pass1 and HTTP_Pass2 actions. For very large documents (over 100,000 characters), consider splitting the document into chunks. |
| Adaptive Card does not render in Teams | Verify the card JSON uses version "1.5" (not 1.6). Test the JSON at https://adaptivecards.io/designer/ before pasting. Ensure you are using "Ask with Adaptive Card" for interactive cards and "Send a message" with card attachment for display-only cards. |
| Global variables are empty or undefined | Confirm each variable has Usage set to "Global (any topic can access)" in the Variable properties panel. Verify the Conversation Start topic initializes all global variables with default values (Step 1.7). |
| Element Review Card outputs are not captured | Check that the "id" fields in the Adaptive Card JSON match the expected output variable names. The "id": "reviewDecision" creates the output variable. If renamed, update all references. |
| Pass 2 synthesis produces incomplete HTML | The max_tokens may be too low for complex journey maps. Verify max_tokens is set to 64000 in the Build_Pass2_Body concat expression. Check the Claude API response for truncation indicators. |
| SharePoint Create file action fails | Verify the folder path exists and matches exactly (case-sensitive). Check that the service account or user running the flow has Edit permissions on the SharePoint site. |
| Export CSV is empty or has only headers | The CSV generation in the Export Journey Map flow uses a simplified approach. For full CSV generation, add a Parse JSON action followed by an Apply to each loop that builds rows from the stages array. |
| Agent routes to wrong topic | Review topic descriptions for overlap. Add explicit exclusions: "Does NOT handle..." in each description. Test with exact trigger phrases first, then try varied phrasings. |

---

# PHASE 15: Architecture Summary and Verification Checklist

## Architecture Summary

```
USER (Teams/Web Chat)
    |
    v
COPILOT STUDIO AGENT: Customer Journey Mapper
    |
    +-- Topic: Journey Analysis Request (9 nodes)
    |       |-- Node 1: Introduction message
    |       |-- Node 2: Document upload question -> Global.DocumentContent
    |       |-- Node 3: Validation condition
    |       |-- Node 4: Scope definition question -> Global.JourneyScope
    |       |-- Node 5: ACTION -> Extract Journey Elements flow (Pass 1)
    |       |-- Node 6: Element Review Adaptive Card
    |       |-- Node 7: Approval condition
    |       |-- Node 8: ACTION -> Synthesize Journey Map flow (Pass 2)
    |       |-- Node 9: Journey Map Preview card
    |
    +-- Topic: Document Selection (7 nodes)
    |       |-- Upload/browse/validate -> Redirect to Journey Analysis
    |
    +-- Topic: Content Customization (6 nodes)
    |       |-- Toggle card -> Persona -> Granularity -> Save to globals
    |
    +-- Topic: Export Journey (6 nodes)
            |-- Format selection -> Generate files -> Download card
    
POWER AUTOMATE FLOWS:
    |
    +-- Extract Journey Elements (Pass 1)
    |       |-- Get API Key -> Escape prompts -> HTTP POST Claude Opus
    |       |-- Extract response -> Save JSON to SharePoint -> Return
    |
    +-- Synthesize Journey Map (Pass 2)
    |       |-- Get API Key -> Escape prompts -> HTTP POST Claude Opus
    |       |-- Extract response -> Save HTML to SharePoint -> Return
    |
    +-- Export Journey Map
            |-- Parse elements -> Generate CSV -> Save to SharePoint -> Return

EXTERNAL APIS:
    +-- Anthropic Claude API (claude-opus-4-6)
        POST https://api.anthropic.com/v1/messages
        max_tokens: 64000 | temperature: 0.3

SHAREPOINT:
    +-- /Journey Templates/ (knowledge source)
    +-- /CX Research/ (knowledge source)
    +-- /Journey Maps/HTML/ (output)
    +-- /Journey Maps/CSV/ (output)
    +-- /Journey Maps/JSON/ (output)
```

## Credit Consumption Estimate

| Action | Credits per Use | Estimated Uses per Session | Session Total |
|---|---|---|---|
| Generative answer (knowledge search) | 2 | 3 | 6 |
| Agent action (flow call) | 5 | 3 (Pass 1 + Pass 2 + Export) | 15 |
| Classic answer (message nodes) | 1 | 8 | 8 |
| Premium AI tool (Claude API via flow) | 100 per 10 responses | 2 | 20 |
| **Estimated total per session** | | | **~49 credits** |

At $200/month for 25,000 credits, this supports approximately 510 journey mapping sessions per month.

## Post-Build Verification Checklist

Check each item after completing the build:

1. [ ] Agent name is "Customer Journey Mapper" and description is filled in
2. [ ] Generative orchestration is enabled (Settings > Generative AI > Orchestration > Yes)
3. [ ] General knowledge is disabled (Settings > Generative AI > Allow general knowledge > Off)
4. [ ] Knowledge strictness is set to High
5. [ ] Agent instructions are pasted (approximately 4,200 characters with all sections)
6. [ ] Conversation Start topic initializes all 6 global variables with defaults
7. [ ] Fallback topic has a custom message listing agent capabilities
8. [ ] End of Conversation has satisfaction survey enabled
9. [ ] Knowledge source "Journey Map Templates" has green checkmark
10. [ ] Knowledge source "CX Research Library" has green checkmark
11. [ ] Entity "Content Types" has 7 items with Smart matching enabled
12. [ ] Entity "Export Formats" has 4 items with Smart matching enabled
13. [ ] Environment variable nxth_AnthropicApiKey exists in the solution with a value set
14. [ ] Topic "Journey Analysis Request" has 9 nodes and 10 trigger phrases
15. [ ] Topic "Document Selection" has 7 nodes and 10 trigger phrases
16. [ ] Topic "Content Customization" has 6 nodes and 10 trigger phrases
17. [ ] Topic "Export Journey" has 6 nodes and 10 trigger phrases
18. [ ] Flow "Extract Journey Elements" has 11 actions and saves successfully
19. [ ] Flow "Synthesize Journey Map" has 12 actions and saves successfully
20. [ ] Flow "Export Journey Map" has 5 actions and saves successfully
21. [ ] Both HTTP actions have timeout set to PT120S
22. [ ] Both Get_Anthropic_Key actions have Secure Inputs and Secure Outputs enabled
23. [ ] Both HTTP actions have Secure Inputs enabled
24. [ ] All three flows have Asynchronous Response set to Off on the Respond action
25. [ ] Tool "Extract Journey Elements" is registered with description mentioning Pass 1
26. [ ] Tool "Synthesize Journey Map" is registered with description mentioning Pass 2
27. [ ] Tool "Export Journey Map" is registered with description mentioning CSV and JSON
28. [ ] Agent is published (green "Published successfully" banner)
29. [ ] Agent is deployed to Teams channel
30. [ ] Test Scenario 1 (basic analysis) passes
31. [ ] Test Scenario 5 (full end-to-end) passes
32. [ ] SharePoint folders contain generated HTML, CSV, and JSON files after testing

---

## Conclusion

This recipe produces a production-grade Customer Journey Mapper agent without writing application code. The three most consequential design decisions are:

1. **Dual-pass architecture** -- separating element extraction (Pass 1) from journey synthesis (Pass 2) ensures the user can review and validate extracted elements before the final map is generated. This prevents the common failure mode where an AI generates a plausible-looking but inaccurate journey map from a single pass. The human review gate between passes is the quality control mechanism.

2. **Direct Anthropic Claude API calls from Power Automate** -- rather than routing through an intermediary service, each flow calls the Claude Opus API directly via HTTP POST. This eliminates middleware dependencies, gives full control over prompts and parameters, and keeps the architecture simple. The 4-step escape chain (Rule 38) ensures prompt text is safely embedded in JSON bodies without breaking the API call.

3. **Global variable architecture for cross-topic state** -- six global variables (DocumentContent, ExtractedElements, ContentSelections, Granularity, PersonaScope, JourneyScope) persist across all four topics, enabling a modular design where users can enter the workflow at any point (upload first, customize first, or go straight to export) without losing context. The Conversation Start topic initializes all globals with sensible defaults.

The emotional scoring framework (-5 to +5) with evidence traceability ensures every insight in the journey map can be traced back to a specific passage in the source document. When combined with the Content Customization topic's toggle-based selection, researchers get exactly the journey map elements they need without information overload. The Miro Board handoff pattern (documented but not fully automated in this version) provides a clear extension path for visual collaboration.