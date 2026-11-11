

# Miro Journey Board Creator -- Definitive Build Recipe for Copilot Studio

This recipe walks you through every click, field, toggle, and configuration needed to build the Miro Journey Board Creator agent in Microsoft Copilot Studio. The agent converts customer journey map HTML into professional, visual Miro boards by calling the Anthropic Claude API to analyze and structure journey data, then calling the Miro REST API v2 to create color-coded boards with stage frames, sticky notes for touchpoints and pain points, shape nodes for emotional states, and connector lines showing journey flow. Both APIs are called DIRECTLY from Power Automate Cloud Flows using HTTP actions. Written for absolute beginners in Copilot Studio -- no step is assumed.

---

## Architecture Diagram

```
+---------------------------+
|   USER (Teams / Web)      |
+------------+--------------+
             |
             v
+---------------------------+
| COPILOT STUDIO AGENT      |
| Miro Journey Board Creator|
|                           |
| Topics:                   |
|  - Board Generation Req   |
|  - Template Selection     |
|  - Board Status           |
|                           |
| Knowledge:                |
|  - Miro API v2 Reference  |
|                           |
| Orchestration: GPT-5 Chat |
+-----+-------+-------+----+
      |       |       |
      v       v       v
+----------+ +----------+ +----------+
| Flow 1:  | | Flow 2:  | | Flow 3:  |
| Test     | | Create   | | Retrieve |
| Miro     | | Miro     | | Board    |
| Connect  | | Journey  | | Details  |
+----+-----+ +--+----+--+ +----+-----+
     |          |    |          |
     v          v    v          v
+----------+ +----+ +------+ +----------+
| Miro API | |Clau| | Miro | | Miro API |
| GET      | |de  | | API  | | GET      |
| /boards  | |API | | POST | | /boards/ |
+----------+ +----+ |multi | | {id}     |
                     |endpt | +----------+
                     +------+
                        |
                        v
              +-------------------+
              | MIRO BOARD OUTPUT |
              | - Stage Frames    |
              | - Sticky Notes    |
              | - Shapes          |
              | - Connectors      |
              | - Title Frame     |
              +-------------------+
                        |
                        v
              +-------------------+
              | DELIVERY          |
              | - Teams Card      |
              | - Email Link      |
              +-------------------+
```

**Data Flow Summary:**
1. User requests a Miro board in Teams or Web Chat.
2. Agent checks for existing journey HTML data (from Journey Mapper agent or user-provided).
3. Agent validates Miro API connection via Test Miro Connection flow.
4. Agent calls Create Miro Journey Board flow, which:
   a. Sends journey HTML to Claude API (claude-sonnet-4-6) for structured analysis.
   b. Receives structured JSON with phases, touchpoints, pain points, opportunities, emotions.
   c. Creates a new Miro board via Miro REST API v2.
   d. Iterates through each phase, creating frames, sticky notes, shapes, and connectors.
5. Agent returns board URL and element counts via Adaptive Card and email.

---

## Prerequisites -- What You Need Before Starting

Before you begin building, confirm you have the following:

1. A Microsoft 365 work or school account with a license that includes Copilot Studio (typically Microsoft 365 E3/E5 or a standalone Copilot Studio license). If you are not sure, ask your IT admin.

2. Access to Power Automate at https://make.powerautomate.com -- sign in and confirm you can see the home page.

3. Access to Power Apps maker portal at https://make.powerapps.com -- sign in and confirm you can see the home page.

4. An Anthropic API key for Claude (starts with sk-ant-...). Get one at https://console.anthropic.com if you do not have one.

5. A Miro access token with boards:read and boards:write scopes. To generate one:
   - Go to https://miro.com/app/settings/user-profile/apps
   - Click "Create new app" or select an existing app
   - Under "Installed app", copy the access token
   - Ensure the app has "boards:read" and "boards:write" scopes enabled

6. Microsoft Teams installed (desktop or web) for testing the agent.

7. A SharePoint site where you can create document libraries (optional, for storing journey HTML files).

---

## Component Summary Table

| Component Type | Name | Purpose |
|---|---|---|
| Agent | Miro Journey Board Creator | Orchestrates journey-to-board conversion |
| Topic | Board Generation Request | Collects journey data, validates connection, creates board |
| Topic | Template Selection | Lets user choose layout and color theme |
| Topic | Board Status | Checks board details and element counts |
| Flow | Test Miro Connection | Validates Miro API token and scopes |
| Flow | Create Miro Journey Board | Analyzes journey with Claude, creates Miro board |
| Tool | Test Miro Connection | Registered for topic-level Action node |
| Tool | Create Miro Journey Board | Registered as both agent-level and topic-level tool |
| Knowledge | Miro REST API v2 Reference | API documentation for board operations |
| Entity | Board Layouts | Closed list: Horizontal, Vertical, Swimlane |
| Env Variable | nxth_AnthropicApiKey | Anthropic Claude API key (Secret) |
| Env Variable | nxth_MiroAccessToken | Miro REST API v2 access token (Secret) |

---

# PHASE 1: Create the Miro Journey Board Creator Agent

This phase creates the agent shell, configures its identity, enables generative orchestration, writes the full agent instructions, and configures all system topics.

## Step 1.1: Sign In to Copilot Studio and Create a Blank Agent

WHERE AM I?: Browser > https://copilotstudio.microsoft.com > Home

1. Open your browser and navigate to https://copilotstudio.microsoft.com.

2. Sign in with your Microsoft 365 work or school account. You will land on the Copilot Studio home page.

3. In the left navigation pane, click Agents.

4. Click the Create blank agent button. If you want to change advanced settings like the solution or schema name, click the small down arrow (v) next to the button and select Advanced create, then click Confirm and create. For most users, just clicking the main button is fine.

5. A new agent opens on the Overview page. This is your agent's home base -- it has sections for Details, Instructions, Knowledge, Tools, Suggested Prompts, and Channels.

> **VERIFY**: You should see a new agent with a default name in the top-left corner of the page. The Overview page should be visible with all sections listed.

## Step 1.2: Set the Agent Name, Description, and Icon

WHERE AM I?: Copilot Studio > Agents > [Your New Agent] > Overview > Details

1. On the Overview page, find the Details section near the top. Click the Edit (pencil) icon.

2. In the Name field, delete the default name and type: Miro Journey Board Creator

3. In the Description field (max 1,024 characters), paste the following:

```
Converts customer journey maps into visual Miro boards by calling the Anthropic Claude API to analyze journey HTML into structured JSON, then calling the Miro REST API v2 to create boards with color-coded stage frames, sticky notes for touchpoints and pain points, shape nodes for emotional states, and connector lines showing journey flow. Supports horizontal, vertical, and swimlane layouts with customizable color themes. Both APIs called directly from Power Automate flows.
```

4. To change the agent's icon: click the agent icon in the top-left area of the page, then click Change icon, then upload a 192 x 192 pixel PNG image (max 72 KB). Use a professional icon that represents a whiteboard or visualization tool.

5. Click Save at the top of the page. Wait for the green "Saved successfully" banner.

> **VERIFY**: The agent name "Miro Journey Board Creator" appears in the top-left corner of the page and in the Details section.

## Step 1.3: Enable Generative Orchestration

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Overview > Details > Orchestration

1. Still in the Details section of the Overview page, look for the Orchestration area.

2. Find the toggle labeled "Use generative AI to determine how best to respond to users and events".

3. Make sure this is set to Yes (toggled on). New agents usually default to this, but verify it.

4. What this does: Instead of requiring you to manually define exact trigger phrases for every possible user question, generative orchestration uses an AI planner to dynamically decide which topics, tools, and knowledge sources to use for each request. This is essential for an agent that needs to handle varied requests about board creation, template selection, and status checking.

> **BEGINNER TIP**: Generative orchestration means the agent reads the descriptions you write for each topic and tool, then decides which one to use based on what the user says. This is why writing clear, specific descriptions is critical -- the AI planner uses them to make routing decisions.

> **CRITICAL**: This is an architectural decision. Generative orchestration is the correct choice for this agent because users will phrase board creation requests in many different ways, and the agent needs to autonomously decide when to call the Miro API versus when to show template options. Classic orchestration would require you to predict every possible phrasing, which is impractical for creative visualization requests.

## Step 1.4: Write the Agent Instructions

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Overview > Instructions

1. On the Overview page, find the Instructions section. Click Edit.

2. You will see a large text field (max 8,000 characters). Delete any default text and paste the following:

```
[PERSONA]
You are the Miro Journey Board Creator, a visualization specialist built by NXT Humans. You transform structured journey data into professional, visually appealing Miro boards. Your tone is creative yet systematic. You understand visual hierarchy, information design, and collaborative whiteboarding best practices. You suggest layout improvements and color-coding schemes that enhance readability. You never fabricate journey data -- you only visualize what the user provides.

[CHAIN-OF-THOUGHT REASONING]
For every board creation request, reason step-by-step before responding:
1. Check if the user has a completed journey map from the Journey Mapper agent (Global.varJourneyHtml) or a manually provided journey JSON structure.
2. If no journey data exists, guide the user to either run the Journey Mapper first or provide journey data in the expected format (stages array with touchpoints, emotions, pain points).
3. Ask about layout preferences: linear horizontal (default), linear vertical, or swimlane (grouped by channel). Ask about color theme: default CX palette, brand colors, or accessibility-optimized high contrast.
4. Validate the Miro API connection by testing the access token. If the token is invalid or lacks required scopes, provide clear instructions for generating a new token at https://miro.com/app/settings/user-profile/apps.
5. Execute the board creation flow: create the board, then populate it stage by stage. Each stage gets a frame container, sticky notes for each element type, and connectors linking sequential stages.
6. Position elements using the Miro coordinate system: stages flow left-to-right with 1000px spacing, elements within stages stack vertically with 250px spacing.
7. Return the board URL to the user and offer to add additional elements or adjust the layout.

[OUTPUT FORMAT]
When presenting board creation results, return an Adaptive Card with:
- board_title (string): name of the created Miro board
- board_url (string): direct clickable URL to the Miro board
- element_counts (object): {stages, sticky_notes, connectors, frames, total}
- creation_timestamp (string): when the board was created in YYYY-MM-DD HH:mm format
- status (string): completed, in_progress, or error

[CONSTRAINTS]
- Miro API token must have boards:read and boards:write scopes. Always test connection before creating boards.
- Maximum 200 elements per board to maintain performance. For large journey maps with more than 8 stages, suggest splitting into multiple boards.
- Sticky note text is limited to 1000 characters. Truncate long descriptions with an ellipsis and a note about truncation.
- Position calculations must avoid overlapping elements. Use consistent spacing: 1000px horizontal between stages, 250px vertical between elements within a stage.
- Color codes must be valid Miro sticky note colors: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black.
- Always include a title frame at the top of the board with the journey map name and creation date.
- Only answer questions related to Miro board creation and journey visualization.
- If no journey data is available, respond: "I need journey map data to create a board. Please provide journey HTML, a SharePoint URL to a saved journey, or run the Journey Mapper agent first."
- Never provide advice unrelated to journey visualization or Miro board creation.

[FEW-SHOT EXAMPLE]
User: "Create a Miro board from my customer onboarding journey"
Expected behavior:
1. Check Global.varJourneyHtml for existing journey data
2. If found, ask for board name (suggest "Customer Onboarding Journey - 2026-02-13")
3. Test Miro connection
4. Call Create Miro Journey Board flow
5. Return Adaptive Card:
{
  "board_title": "Customer Onboarding Journey - 2026-02-13",
  "board_url": "https://miro.com/app/board/abc123=/",
  "element_counts": {
    "stages": 5,
    "sticky_notes": 23,
    "connectors": 4,
    "frames": 5,
    "total": 37
  },
  "creation_timestamp": "2026-02-13 14:30",
  "status": "completed"
}
```

3. Click Save at the top of the page.

> **VERIFY**: The Instructions section shows the full text you pasted. No truncation should have occurred -- the text is well within the 8,000-character limit.

## Step 1.5: Disable General Knowledge

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Settings (gear icon) > Generative AI

1. Click the Settings gear icon at the very top of the Copilot Studio page (not the Details section -- the gear icon in the top navigation bar).

2. In the settings panel, click Generative AI in the left menu.

3. Find the toggle "Allow the AI to use its own general knowledge" and set it to Off.

4. What this does: Forces the agent to answer exclusively from your knowledge sources and tools. This prevents the agent from making up plausible-sounding Miro API calls or inventing board creation steps.

5. Click Save and close the settings panel.

## Step 1.6: Configure System Topics

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > System

1. Click the Topics tab in the top navigation bar of Copilot Studio.

2. You will see two subtabs: Custom and System. Click the System subtab.

3. You will see a list of system topics. Configure each one as follows:

**Conversation Start:**

4. Click Conversation Start to open the topic authoring canvas.

5. You will see a trigger node ("Conversation Start") connected to a Message node. Before the Message node, we need to add variable initialization nodes. Click the + button between the trigger and the existing Message node.

6. Select Variable management, then Set a variable value.

7. In the "Set variable" node that appears:
   - Click the box under "Set variable" and select Create a new variable.
   - A new variable appears with a default name (e.g., Var1) and type Unknown.
   - Click the variable name. The Variable properties panel opens on the right side.
   - Under Variable name, type: varJourneyHtml (do NOT include the Global. prefix -- it will be added automatically).
   - Under Usage, select "Global (any topic can access)". The variable name automatically changes to Global.varJourneyHtml.
   - For the To value field, click the formula icon (fx), type `Text("")` and click Done. This sets the variable to an empty string.

8. Click the + button below the Set variable node you just created to add another Set variable value node.

9. In this second "Set variable" node:
   - Click the box under "Set variable" and select Create a new variable.
   - Click the variable name in the Variable properties panel.
   - Under Variable name, type: varLayoutType
   - Under Usage, select "Global (any topic can access)". The name becomes Global.varLayoutType.
   - For the To value field, type: horizontal (this is the literal text string, not a variable reference).

10. Click the + button below to add a third Set variable value node.

11. In this third node:
    - Create a new variable named varColorTheme.
    - Under Usage, select "Global (any topic can access)". The name becomes Global.varColorTheme.
    - For the To value field, type: default

12. Now click the existing Message node (the one that came with the system topic). Delete the default message text. Replace it with:

```
Welcome. I am the Miro Journey Board Creator, built by NXT Humans.

I convert customer journey maps into professional, visual Miro boards with color-coded stages, sticky notes, and connector lines.

-> Type "create board" to generate a Miro board from journey data.
-> Type "choose template" to select a layout and color theme.
-> Type "board status" to check on a previously created board.
-> Type "help" for a list of available commands.

Your current layout: Horizontal. Color theme: Default CX Palette.
```

13. Click Save at the top.

**Fallback:**

14. Go back to Topics, then System, and click Fallback.

15. Click the Message node and replace the text with:

```
I did not understand that request. I can help with:

-> Creating Miro boards from journey map data
-> Choosing board layouts and color themes
-> Checking the status of generated boards

Please rephrase your question, or type "help" for available commands.
```

16. Click Save.

**On Error:**

17. Click On Error in the system topics list. Keep the default configuration -- it displays the error code, conversation ID, and timestamp, which you will need for troubleshooting.

**End of Conversation:**

18. Click End of Conversation. Toggle the satisfaction survey to On so you can collect feedback on board quality.

19. Click Save.

## Step 1.7: Create the Power Platform Solution and Environment Variables

WHERE AM I?: Browser > https://make.powerapps.com > Solutions

1. Open a new browser tab and navigate to https://make.powerapps.com.

2. Sign in with the same Microsoft 365 account.

3. Important: In the top-right corner, check the Environment dropdown. Make sure you are in the same environment where your Copilot Studio agent lives. If you are not sure, it is usually called "Default" or your organization's name.

4. In the left navigation, click Solutions.

5. Click + New solution.

6. Fill in:
   - Display name: Miro Journey Board Creator Solution
   - Publisher: Select the default publisher (or create one -- click + New publisher, set Name to NXTHumans, Prefix to nxth, then click Save).
   - Leave Version as 1.0.0.0.

7. Click Create. The solution opens.

**Environment Variable 1 -- Anthropic API Key:**

8. Inside your solution, click Add (the button at the top), then More, then Environment variable.

9. Fill in:
   - Display name: Anthropic API Key
   - Name: This auto-fills as nxth_AnthropicApiKey (based on your publisher prefix). That is correct.
   - Data type: Select Secret
   - Leave Default value blank.

10. Click Save at the bottom of the panel.

11. After saving, click the variable you just created to open it. Click New value under "Current value". Paste your Anthropic API key (the one starting with sk-ant-...). Click Save.

**Environment Variable 2 -- Miro Access Token:**

12. Click Add, then More, then Environment variable again.

13. Fill in:
    - Display name: Miro Access Token
    - Name: This auto-fills as nxth_MiroAccessToken.
    - Data type: Select Secret
    - Leave Default value blank.

14. Click Save.

15. After saving, click the variable, click New value, paste your Miro access token, and click Save.

> **VERIFY**: You should now see 2 environment variables listed in your solution: Anthropic API Key and Miro Access Token.

> **WATCH OUT**: Environment variables of type "Secret" store values encrypted in Dataverse. However, you must STILL enable Secure Inputs and Secure Outputs on every Power Automate action that touches these keys. Instructions for this are included in every flow step below.

## Step 1.8: Define the Board Layouts Entity

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Settings > Entities

1. Go back to your Copilot Studio tab.

2. Open your Miro Journey Board Creator agent.

3. Click the Settings gear icon at the top of the page.

4. In the settings panel, click Entities in the left menu.

5. Click + Add an entity, then select Closed list.

6. In the entity creation panel:
   - Name: Board Layouts
   - Add items one at a time by typing in the "Add item" field and pressing Enter:
     - Item 1: Type Horizontal and press Enter. Then click the item to expand it and add synonyms: horizontal, left to right, timeline, linear horizontal, side by side
     - Item 2: Type Vertical and press Enter. Add synonyms: vertical, top to bottom, top down, linear vertical, stacked
     - Item 3: Type Swimlane and press Enter. Add synonyms: swimlane, swim lane, channel view, multi-channel, grouped by channel, lanes

7. Toggle Smart matching to On. This enables fuzzy matching for misspellings and abbreviations.

8. Click Save.

> **BEGINNER TIP**: A closed list entity is like a dropdown menu that the agent understands. When a user says "I want a horizontal layout" or "make it left to right", the agent recognizes both as meaning "Horizontal" because of the synonyms you defined.

## Step 1.9: Define the Color Themes Entity

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Settings > Entities

1. Still in the Entities section, click + Add an entity, then select Closed list.

2. In the entity creation panel:
   - Name: Color Themes
   - Item 1: Type Default CX Palette and press Enter. Add synonyms: default, cx palette, standard colors, default colors, blue green yellow
   - Item 2: Type Brand Colors and press Enter. Add synonyms: brand, brand colors, custom colors, company colors, our brand
   - Item 3: Type High Contrast and press Enter. Add synonyms: high contrast, accessible, accessibility, black and white, high visibility

3. Toggle Smart matching to On.

4. Click Save.

5. Close the Settings panel by clicking the X or clicking back to the Overview page.

---

# PHASE 2: Add Knowledge Sources (1 source)

Knowledge sources give the agent reference material to answer questions about Miro API capabilities, element types, and positioning. This is critical for the agent to provide accurate guidance about board creation options.

## Step 2.1: Add the Miro REST API v2 Reference as a Knowledge Source

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Overview > Knowledge

1. Navigate back to the Overview page of your agent (click the agent name in the breadcrumb at the top).

2. Find the Knowledge section and click Add knowledge.

3. A panel opens showing knowledge source options. Click Public websites (or Website URL depending on your view).

4. In the URL field, paste: https://developers.miro.com/reference/api-reference

5. Press Enter or click the + button. The URL appears as a tag below the field.

6. Below the URL, you will see two fields:
   - Name: Type Miro REST API v2 Reference
   - Description: This is critical for retrieval quality. Paste:

```
Official Miro REST API v2 documentation covering board creation (POST /v2/boards), board item types including sticky notes (POST /v2/boards/{board_id}/sticky_notes), shapes (POST /v2/boards/{board_id}/shapes), frames (POST /v2/boards/{board_id}/frames), connectors (POST /v2/boards/{board_id}/connectors), and text items. Covers positioning with x/y coordinates, element styling including fillColor for sticky notes (supported colors: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black), geometry dimensions, and authentication via Bearer token. Includes rate limits, error codes, and sharing policies.
```

7. Click Add to agent.

8. You will see the knowledge source appear in the Knowledge section with a green checkmark. If you see a yellow warning, click it to read the issue (usually a permissions or crawling problem).

## Step 2.2: Configure Knowledge Behavior Settings

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Settings (gear icon) > Generative AI

1. Click the Settings gear icon in the top navigation bar.

2. Click Generative AI in the left menu.

3. Under "How should your agent interact with knowledge sources", select High strictness. This ensures the agent only answers from the Miro API documentation and does not fill gaps with guesses.

4. Click Save and close the settings panel.

> **VERIFY**: The Knowledge section on the Overview page shows "Miro REST API v2 Reference" with a green checkmark.

---

# PHASE 3: Board Generation Request -- TOPIC BUILD (node-by-node: 8 nodes)

This is the primary topic that orchestrates the entire board creation workflow. It checks for existing journey data, validates the Miro API connection, and calls the board creation flow. We build this topic first, then immediately build its associated flows in Phases 4 and 5.

## Step 3.1: Create the Board Generation Request Topic

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Custom

1. Click the Topics tab in the top navigation bar, then click the Custom subtab.

2. Click + Add a topic, then From blank.

3. At the top of the canvas, click the topic name (it says "Untitled") and rename it to: Board Generation Request

4. Click the Description field below the name. Type: User wants to create a Miro board from a journey map or structured data. Route here when the user mentions creating a Miro board, visualizing a journey, converting journey data to a whiteboard, or generating a visual board from their analysis results.

## Step 3.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request > Trigger node

1. In the Trigger node at the top of the canvas, you will see a section labeled "Describe what this topic does" or "Add trigger phrases" depending on your view.

2. Click the description/trigger area and add these trigger phrases (press Enter after each one):
   - create Miro board
   - generate board
   - visualize journey
   - convert to whiteboard
   - make a Miro board
   - build a journey board
   - create visual board
   - generate Miro visualization

> **BEGINNER TIP**: Even though we are using generative orchestration (which relies on the topic description for routing), trigger phrases are still required for Custom Topic classification. They serve as additional signals to the AI planner.

## Step 3.3: Add Node 1 -- Message -- "Board Generation Welcome"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request > Canvas

1. Click the + button below the Trigger node to add a new node.

2. In the node menu that appears, click Send a message.

3. In the message text field, type:

```
I can create a professional Miro board from your journey map data. The board will include:

-> Color-coded stage frames for each journey phase
-> Sticky notes for touchpoints, pain points, and opportunities
-> Shape nodes for emotional states
-> Connector lines showing the journey flow

Let me check if you have journey data available.
```

4. This node simply explains the capability before the agent checks for data.

## Step 3.4: Add Node 2 -- Condition -- "Check Journey Data Available"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request > Canvas

1. Click the + button below the message node you just created.

2. In the node menu, click Add a condition.

3. A Condition node appears with a condition branch and an "All other conditions" (else) branch.

4. In the condition branch, click the "Select a variable" box. Click the {x} icon to open the variable picker. Select Global.varJourneyHtml from the list.

5. Set the operator to "is not equal to" (or "does not equal" depending on your view).

6. In the value field, click the formula icon (fx), type `Text("")` and click Done. This checks whether the global variable is NOT an empty string.

> **BEGINNER TIP**: This condition checks if the Journey Mapper agent (or the user) has already stored journey HTML in the Global.varJourneyHtml variable. If the variable has content, we skip the data collection step. If it is empty, we ask the user to provide data.

**In the "Yes" (condition met) branch:**

7. Click the + button inside the "Yes" branch. Click Send a message. Type:

```
I found existing journey data from your previous session. I will use this data to create the Miro board.
```

**In the "All other conditions" (else) branch:**

8. Click the + button inside the else branch. This is where we add Node 3 (the question about data source). We will add it in the next step.

## Step 3.5: Add Node 3 -- Question -- "Select Journey Data Source"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request > Canvas > Else branch of Condition

1. Inside the "All other conditions" (else) branch of the condition node, click the + button.

2. Click Ask a question.

3. In the question text field, type:

```
I do not have journey data from a previous session. How would you like to provide the journey data?
```

4. Under "Identify", click the dropdown and select the option that lets you define choices. Look for "Multiple choice options" or click "Edit options" to add choices manually.

5. Add these three options:
   - Option 1: Paste journey HTML or JSON directly
   - Option 2: Provide a SharePoint URL to a saved journey
   - Option 3: Go to Journey Mapper agent first

6. The question node automatically creates an output variable. Click the variable name (it may be called Var1 or similar). The Variable properties panel opens on the right side.
   - Under Variable name, type: varJourneyDataSource
   - Leave Usage as "Topic (this topic only)" since this variable is only needed within this topic.

7. Below the question node, add a Condition node to handle each choice:

8. Click the + button below the question node. Click Add a condition.

9. In the condition, select Topic.varJourneyDataSource, set operator to "is equal to", and set value to: Paste journey HTML or JSON directly

10. In the "Yes" branch, click + then Ask a question. Type:

```
Please paste your journey map HTML or JSON content below. I will analyze it and create the Miro board.
```

11. Under "Identify", select "User's entire response" (this maps to StringPrebuiltEntity in YAML).

12. Click the output variable name. In the Variable properties panel:
    - Under Variable name, type: varJourneyHtmlInput
    - Leave Usage as "Topic (this topic only)".

13. After this question, add a Set variable value node:
    - Click + below the question, then Variable management, then Set a variable value.
    - Set variable: Select Global.varJourneyHtml
    - To value: Click the {x} icon and select Topic.varJourneyHtmlInput

14. In the "All other conditions" branch of this inner condition, add a Send a message node:

```
Please run the Journey Mapper agent first to generate journey data, or provide a SharePoint URL to a previously saved journey. Then come back and type "create board" to continue.
```

15. After this message, add an End current topic node (click + then Topic management then End current topic).

## Step 3.6: Add Node 4 -- Question -- "Set Board Name"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request > Canvas (after both branches merge)

1. After both branches of the journey data condition merge back together (the "Yes" branch where data exists and the branch where the user just pasted data), click the + button to add a new node.

2. Click Ask a question.

3. In the question text field, type:

```
What would you like to name this Miro board? You can type a custom name, or I will use a default name based on the current date.
```

4. Under "Identify", select "User's entire response" (StringPrebuiltEntity).

5. Click the output variable name. In the Variable properties panel:
   - Under Variable name, type: varBoardName
   - Leave Usage as "Topic (this topic only)".

## Step 3.7: Add Node 5 -- Action -- "Validate Miro API Connection"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request > Canvas

1. Click the + button below the board name question node.

2. In the node menu, click Add a tool.

3. You will see a list of available tools. Look for Test Miro Connection. If you have not built the flow yet (we build it in Phase 4), you will not see it here yet. That is expected -- we will come back to this step after building the flow.

> **WATCH OUT**: You cannot add an Action node for a flow that does not exist yet. We document this node's position now, but you will physically add it after completing Phase 4 (building the Test Miro Connection flow) and Phase 6 (registering it as a tool). For now, add a placeholder Message node with the text: "[PLACEHOLDER] Replace this node with the Test Miro Connection action after building the flow in Phase 4." You will delete this placeholder later.

4. When you come back to add the actual Action node after Phase 6:
   - Delete the placeholder Message node.
   - Click + then Add a tool.
   - Select Test Miro Connection from the list.
   - The Action node appears. It has no input parameters (the flow gets the token from environment variables).
   - The Action node shows output parameters. Map them to topic variables:
     - connected: Click the output and create a new variable named varMiroConnected (Topic scope).
     - status: Click the output and create a new variable named varMiroConnectionStatus (Topic scope).

## Step 3.8: Add Node 6 -- Condition -- "Check API Connection Valid"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request > Canvas

1. Click the + button below the Action node (or placeholder).

2. Click Add a condition.

3. In the condition, select Topic.varMiroConnected, set operator to "is equal to", and set value to: true (select the boolean true value).

**In the "Yes" (connected) branch:**

4. Click + and add a Send a message node. Type:

```
Miro API connection verified. Creating your board now. This may take a moment as I analyze the journey data and create each element.
```

5. This is where we will add Node 7 (the Create Miro Journey Board action). Continue to the next step.

**In the "All other conditions" (not connected) branch:**

6. Click + and add a Send a message node. Type:

```
The Miro API connection failed. Please check the following:

-> If you received an authentication error (401): Your Miro access token may be expired. Generate a new one at https://miro.com/app/settings/user-profile/apps
-> If you received a permission error (403): Your Miro app needs the boards:read and boards:write scopes enabled.

After updating your token, contact your admin to update the nxth_MiroAccessToken environment variable, then try again.
```

7. After this message, add an End current topic node.

## Step 3.9: Add Node 7 -- Action -- "Create Miro Journey Board"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request > Canvas > "Yes" branch of connection check

1. Inside the "Yes" branch (Miro connected), after the confirmation message, click the + button.

2. Click Add a tool.

3. Select Create Miro Journey Board from the list. (Same note as Step 3.7 -- you will add this after building the flow in Phase 5 and registering it in Phase 6. Add a placeholder Message node for now: "[PLACEHOLDER] Replace this node with the Create Miro Journey Board action after building the flow in Phase 5.")

4. When you come back to add the actual Action node after Phase 6:
   - Delete the placeholder Message node.
   - Click + then Add a tool.
   - Select Create Miro Journey Board.
   - The Action node appears with input parameters. Map each one:
     - journey_html: Click the input field, then click {x} and select Global.varJourneyHtml
     - board_name: Click the input field, then click {x} and select Topic.varBoardName
     - layout_type: Click the input field, then click {x} and select Global.varLayoutType
     - color_theme: Click the input field, then click {x} and select Global.varColorTheme
   - The Action node shows output parameters. Map them:
     - board_url: Create a new variable named varBoardUrl (Topic scope)
     - status: Create a new variable named varBoardCreationStatus (Topic scope)

## Step 3.10: Add Node 8 -- Adaptive Card -- "Board Creation Result Card"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request > Canvas

1. Click the + button below the Create Miro Journey Board action node (or placeholder).

2. Click Send a message.

3. In the message node, click the + (Add) button in the message content area, then select Adaptive Card. (Alternatively, click the attachment icon and select Adaptive Card.)

4. The Adaptive Card editor opens. Delete any default content and paste this exact JSON:

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
          "text": "MIRO BOARD CREATED",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Your journey map has been converted into a visual Miro board.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Board Name",
          "value": "{Topic.varBoardName}"
        },
        {
          "title": "Board URL",
          "value": "{Topic.varBoardUrl}"
        },
        {
          "title": "Status",
          "value": "{Topic.varBoardCreationStatus}"
        },
        {
          "title": "Layout",
          "value": "{Global.varLayoutType}"
        },
        {
          "title": "Color Theme",
          "value": "{Global.varColorTheme}"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Click the button below to open your board in Miro and start collaborating with your team.",
      "wrap": true,
      "size": "Small",
      "spacing": "Medium"
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "OPEN IN MIRO",
      "url": "{Topic.varBoardUrl}"
    }
  ]
}
```

> **WATCH OUT**: The variable references like `{Topic.varBoardUrl}` in the JSON above are placeholders for the visual editor. When you paste this JSON, you may need to switch to Formula mode to insert actual variable references. To do this: in the Adaptive Card editor, click "Formula" to convert JSON to Power Fx. Then replace the placeholder strings with actual variable references like `Topic.varBoardUrl`. WARNING: Once you switch to Formula mode, you CANNOT go back to the original JSON. Save a copy of the JSON before switching.

> **BEGINNER TIP**: If Formula mode feels complex, an alternative approach is to use a regular Message node instead of an Adaptive Card. Type the message text and use the {x} button to insert variables inline. The Adaptive Card looks more professional, but a Message node works just as well functionally.

5. Click Save on the Adaptive Card editor, then click Save at the top of the topic canvas.

## Step 3.11: Complete YAML for Board Generation Request Topic

Below is the complete YAML representation of this topic. You can paste this into the code editor as an alternative to building the topic visually.

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Board Generation Request
    triggerQueries:
      - create Miro board
      - generate board
      - visualize journey
      - convert to whiteboard
      - make a Miro board
      - build a journey board
      - create visual board
      - generate Miro visualization
  actions:
    - kind: SendMessage
      id: welcomeMsg
      message: |-
        I can create a professional Miro board from your journey map data. The board will include:

        -> Color-coded stage frames for each journey phase
        -> Sticky notes for touchpoints, pain points, and opportunities
        -> Shape nodes for emotional states
        -> Connector lines showing the journey flow

        Let me check if you have journey data available.

    - kind: ConditionGroup
      id: checkJourneyData
      conditions:
        - id: hasJourneyData
          condition: =!IsBlank(Global.varJourneyHtml)
          actions:
            - kind: SendMessage
              id: dataFoundMsg
              message: "I found existing journey data from your previous session. I will use this data to create the Miro board."
      elseActions:
        - kind: Question
          id: askDataSource
          interruptionPolicy:
            allowInterruption: true
          variable: init:Topic.varJourneyDataSource
          prompt: |-
            I do not have journey data from a previous session. How would you like to provide the journey data?
          entity:
            kind: EmbeddedEntity
            definition:
              kind: ClosedListEntity
              smartMatchingEnabled: true
              items:
                - id: paste
                  displayName: Paste journey HTML or JSON directly
                - id: sharepoint
                  displayName: Provide a SharePoint URL to a saved journey
                - id: mapper
                  displayName: Go to Journey Mapper agent first

        - kind: ConditionGroup
          id: handleDataSource
          conditions:
            - id: isPaste
              condition: =Topic.varJourneyDataSource = "paste"
              actions:
                - kind: Question
                  id: askJourneyHtml
                  interruptionPolicy:
                    allowInterruption: true
                  variable: init:Topic.varJourneyHtmlInput
                  prompt: "Please paste your journey map HTML or JSON content below. I will analyze it and create the Miro board."
                  entity: StringPrebuiltEntity
                - kind: SetVariable
                  id: setGlobalJourneyHtml
                  variable: Global.varJourneyHtml
                  value: =Topic.varJourneyHtmlInput
          elseActions:
            - kind: SendMessage
              id: noDataMsg
              message: "Please run the Journey Mapper agent first to generate journey data, or provide a SharePoint URL to a previously saved journey. Then come back and type \"create board\" to continue."
            - kind: EndDialog
              id: endNoData

    - kind: Question
      id: askBoardName
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varBoardName
      prompt: "What would you like to name this Miro board? You can type a custom name, or I will use a default name based on the current date."
      entity: StringPrebuiltEntity

    - kind: SendMessage
      id: testConnectionPlaceholder
      message: "[ACTION] Replace this node with an Action node that calls the Test Miro Connection flow. (Add node -> Add a tool -> select Test Miro Connection, then map output variables: connected -> Topic.varMiroConnected, status -> Topic.varMiroConnectionStatus.)"

    - kind: ConditionGroup
      id: checkConnection
      conditions:
        - id: isConnected
          condition: =Topic.varMiroConnected = true
          actions:
            - kind: SendMessage
              id: connectedMsg
              message: "Miro API connection verified. Creating your board now. This may take a moment as I analyze the journey data and create each element."
            - kind: SendMessage
              id: createBoardPlaceholder
              message: "[ACTION] Replace this node with an Action node that calls the Create Miro Journey Board flow. (Add node -> Add a tool -> select Create Miro Journey Board, then map inputs: journey_html <- Global.varJourneyHtml, board_name <- Topic.varBoardName, layout_type <- Global.varLayoutType, color_theme <- Global.varColorTheme. Map outputs: board_url -> Topic.varBoardUrl, status -> Topic.varBoardCreationStatus.)"
            - kind: SendMessage
              id: resultMsg
              message: |-
                Your Miro board has been created successfully.

                Board Name: {Topic.varBoardName}
                Board URL: {Topic.varBoardUrl}
                Status: {Topic.varBoardCreationStatus}
                Layout: {Global.varLayoutType}
                Color Theme: {Global.varColorTheme}

                Click the board URL above to open it in Miro.
      elseActions:
        - kind: SendMessage
          id: notConnectedMsg
          message: |-
            The Miro API connection failed. Please check the following:

            -> If you received an authentication error (401): Your Miro access token may be expired. Generate a new one at https://miro.com/app/settings/user-profile/apps
            -> If you received a permission error (403): Your Miro app needs the boards:read and boards:write scopes enabled.

            After updating your token, contact your admin to update the nxth_MiroAccessToken environment variable, then try again.
        - kind: EndDialog
          id: endNotConnected

    - kind: EndDialog
      id: endBoardGeneration
```

> **CRITICAL**: The two `SendMessage` nodes with "[ACTION]" prefixes are placeholders. After building the flows in Phases 4 and 5 and registering them as tools in Phase 6, you MUST return to this topic and replace those placeholder nodes with actual Action nodes that call the flows. The YAML cannot include `InvokeFlowAction` because the flow GUIDs do not exist yet.

---

# PHASE 4: Test Miro Connection -- FLOW BUILD (action-by-action)

This flow validates the Miro API access token by making a lightweight GET request to list boards. It returns whether the connection is valid and the specific error if it fails. We build this flow first because the Board Generation Request topic calls it before creating any board.

## Step 4.1: Create the Flow

WHERE AM I?: Browser > https://make.powerautomate.com > Solutions > Miro Journey Board Creator Solution

1. Open your browser tab with https://make.powerautomate.com.

2. In the left navigation, click Solutions, then open Miro Journey Board Creator Solution (the one you created in Step 1.7).

3. Click + New, then Automation, then Cloud flow, then Instant.

4. In the "Build an instant cloud flow" dialog:
   - Flow name: Test Miro Connection
   - Choose how to trigger this flow: Scroll down and select "Run a flow from Copilot" (this is the Copilot Studio trigger). If you do not see this option, select "Manually trigger a flow" -- we will change it.

5. Click Create. The flow editor opens.

## Step 4.2: Configure the Trigger

WHERE AM I?: Power Automate > Flow Editor > Test Miro Connection > Trigger

1. If the trigger shows as "Run a flow from Copilot", click on it to expand it. If it shows a different trigger, delete it and add the correct one: click + then search for "Run a flow from Copilot" and select it.

2. This flow has NO input parameters -- it retrieves the Miro token from environment variables internally. Leave the trigger as-is with no inputs.

> **BEGINNER TIP**: The "Run a flow from Copilot" trigger is what allows Copilot Studio to call this flow. When the agent's Action node invokes this flow, the trigger fires and the flow executes.

## Step 4.3: Add Action 1 -- Get Miro Access Token

WHERE AM I?: Power Automate > Flow Editor > Test Miro Connection > Below Trigger

1. Below the trigger, click + then Add an action.

2. Search for "Compose" and select Compose (under "Data Operations").

3. In the Inputs field, paste your Miro access token (the literal token string).

4. Immediately secure this action: Click the three dots (...) on the Compose action, then Settings, then scroll down to Security, then toggle Secure Inputs to On, then toggle Secure Outputs to On, then click Done.

5. Rename this action: click the three dots (...), then Rename, then type: Get_Miro_Token

> **WATCH OUT**: This approach stores the token directly in the flow action. The Secure Inputs/Outputs settings hide the value from flow run history. For a more secure approach, use the "Get environment variable" action from the Power Platform connector to retrieve the nxth_MiroAccessToken variable at runtime. However, the Compose approach is simpler for beginners and works reliably.

## Step 4.4: Add Action 2 -- Initialize Variable for Connection Status

WHERE AM I?: Power Automate > Flow Editor > Test Miro Connection > Below Get_Miro_Token

1. Click + then Add an action.

2. Search for "Initialize variable" and select Initialize variable (under "Variable" actions).

3. Fill in:
   - Name: varConnected
   - Type: Boolean
   - Value: Click the toggle to select false

4. Click + then Add an action. Search for "Initialize variable" again.

5. Fill in:
   - Name: varStatus
   - Type: String
   - Value: (leave empty)

## Step 4.5: Add Action 3 -- HTTP GET to Miro API

WHERE AM I?: Power Automate > Flow Editor > Test Miro Connection > Below Initialize Variables

1. Click + then Add an action.

2. Search for "HTTP" and select HTTP (the premium connector with the blue globe icon).

3. Configure the HTTP action:
   - Method: Select GET from the dropdown.
   - URI: https://api.miro.com/v2/boards?limit=1
   - Headers: Click + Add new parameter, then check Headers. Add one header:
     - Key: Authorization
     - Value: Type Bearer  (with the trailing space), then click the lightning bolt (dynamic content) icon and select Outputs from Get_Miro_Token. The full value reads: Bearer [dynamic content from Get_Miro_Token]
   - Click + Add new parameter, then check Timeout. Set it to: PT120S

4. Secure this action: Click the three dots (...), then Settings, then toggle Secure Inputs to On, then click Done.

5. Rename this action to: HTTP_Test_Miro

6. Important: We need to configure this action to NOT fail the entire flow on a non-200 response. Click the three dots (...) on the HTTP_Test_Miro action, then Settings, then scroll to "Run After". This is not the right place -- instead, we will handle errors with a Condition node checking the status code.

> **WATCH OUT**: By default, if the HTTP action returns a 401 or 403 status code, the flow will fail. To prevent this, click the three dots (...) on the HTTP_Test_Miro action, then Configure run after. This is not available on the HTTP action itself -- instead, we will wrap it in a Scope and use run-after configuration. Actually, the simplest approach for beginners is to use the "Configure run after" on the NEXT action. We will handle this in the next step.

## Step 4.6: Add Action 4 -- Check Status Code with Condition

WHERE AM I?: Power Automate > Flow Editor > Test Miro Connection > Below HTTP_Test_Miro

1. Click + then Add an action.

2. Search for "Condition" and select Condition (under "Control").

3. In the condition:
   - Left side: Click the fx (Expression) tab and paste: outputs('HTTP_Test_Miro')['statusCode']
   - Click OK.
   - Operator: is equal to
   - Right side: Type 200

4. Important: Click the three dots (...) on this Condition action, then Configure run after. Check BOTH "is successful" AND "has failed". This ensures the condition runs even if the HTTP action fails (which happens on 401/403 responses). Click Done.

**In the "Yes" (status 200) branch:**

5. Click + inside the Yes branch. Add a Set variable action.
   - Name: Select varConnected
   - Value: Click the toggle to select true

6. Click + and add another Set variable action.
   - Name: Select varStatus
   - Value: Type: success

**In the "No" (not 200) branch:**

7. Click + inside the No branch. Add a Condition action to check for 401 vs 403.

8. In this inner condition:
   - Left side: Click fx and paste: outputs('HTTP_Test_Miro')['statusCode']
   - Operator: is equal to
   - Right side: Type 401

9. Configure run after on this inner Condition: check "is successful" AND "has failed". Click Done.

**In the inner "Yes" (401) branch:**

10. Click + and add Set variable:
    - Name: varStatus
    - Value: Type: auth_failed - Your Miro access token is invalid or expired. Generate a new token at https://miro.com/app/settings/user-profile/apps

**In the inner "No" (not 401, likely 403) branch:**

11. Click + and add Set variable:
    - Name: varStatus
    - Value: Type: permission_error - Your Miro app is missing required scopes. Ensure boards:read and boards:write are enabled in your Miro app settings.

## Step 4.7: Add Action 5 -- Respond to Copilot

WHERE AM I?: Power Automate > Flow Editor > Test Miro Connection > Below all branches

1. Below the entire Condition control (outside and after all branches merge), click + then Add an action.

2. Search for "Respond to Copilot" and select Respond to Copilot (or "Return value(s) to Power Virtual Agents" -- same thing, different label depending on your version).

3. Click + Add an output two times to create two outputs:

Output 1:
- Type: Yes/No
- Name: connected
- Value: Click the lightning bolt (dynamic content) icon and select the variable varConnected

Output 2:
- Type: Text
- Name: status
- Value: Click the lightning bolt icon and select the variable varStatus

4. Click on the Respond to Copilot action. Click Settings (or the three dots then Settings). Under Networking, find the Asynchronous Response toggle and set it to Off. This ensures the flow responds synchronously within the 100-second timeout.

5. Click Save at the top of the flow editor. Wait for the green "Your flow is ready" banner.

## Step 4.8: Test the Flow

WHERE AM I?: Power Automate > Flow Editor > Test Miro Connection > Test

1. Click Test in the top-right corner of the flow editor.

2. Select Manually, then click Test.

3. The flow runs. Click on each action to see its inputs and outputs.

4. If the Miro token is valid, you should see: connected = true, status = success.

5. If the token is invalid, you should see: connected = false, status = auth_failed - ...

> **VERIFY**: The flow completes without errors. The Respond to Copilot action shows the correct output values.

## Step 4.9: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Get_Miro_Token | Compose | Miro access token (Secure Inputs/Outputs ON) |
| 2 | Initialize varConnected | Initialize variable | Boolean, default false |
| 3 | Initialize varStatus | Initialize variable | String, default empty |
| 4 | HTTP_Test_Miro | HTTP | GET https://api.miro.com/v2/boards?limit=1, Authorization: Bearer {token}, Timeout PT120S |
| 5 | Check Status Code | Condition | outputs('HTTP_Test_Miro')['statusCode'] == 200 |
| 6 | Set varConnected (Yes) | Set variable | true |
| 7 | Set varStatus (Yes) | Set variable | "success" |
| 8 | Check 401 (No) | Condition | statusCode == 401 |
| 9 | Set varStatus (401) | Set variable | "auth_failed - ..." |
| 10 | Set varStatus (403) | Set variable | "permission_error - ..." |
| 11 | Respond to Copilot | Respond to Copilot | connected (Yes/No), status (Text) |

---

# PHASE 5: Create Miro Journey Board -- FLOW BUILD (action-by-action)

This is the most complex flow in the agent. It receives journey HTML, sends it to Claude for structured analysis, creates a new Miro board, then iterates through each phase to create frames, sticky notes, shapes, and connectors. Take your time with each sub-step.

## Step 5.1: Create the Flow

WHERE AM I?: Browser > https://make.powerautomate.com > Solutions > Miro Journey Board Creator Solution

1. In your solution at make.powerautomate.com, click + New, then Automation, then Cloud flow, then Instant.

2. In the dialog:
   - Flow name: Create Miro Journey Board
   - Trigger: Run a flow from Copilot

3. Click Create. The flow editor opens.

## Step 5.2: Configure Trigger Inputs

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Trigger

1. Click on the trigger to expand it.

2. Click + Add an input inside the trigger. You need to add four text inputs:

Input 1:
- Click + Add an input, then select Text.
- Input name: journey_html
- Description: Journey map HTML or JSON content to analyze and convert into a Miro board

Input 2:
- Click + Add an input, then select Text.
- Input name: board_name
- Description: Name for the new Miro board

Input 3:
- Click + Add an input, then select Text.
- Input name: layout_type
- Description: Board layout style - horizontal, vertical, or swimlane

Input 4:
- Click + Add an input, then select Text.
- Input name: color_theme
- Description: Color theme for the board - default, brand, or high_contrast

## Step 5.3: Add Action 1 -- Get Anthropic API Key

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Trigger

1. Below the trigger, click + then Add an action.

2. Search for "Compose" and select Compose (under "Data Operations").

3. In the Inputs field, paste your Anthropic API key (the literal key string starting with sk-ant-...).

4. Secure this action: Click the three dots (...), then Settings, then toggle Secure Inputs to On, then toggle Secure Outputs to On, then click Done.

5. Rename this action: click the three dots (...), then Rename, then type: Get_Anthropic_Key

## Step 5.4: Add Action 2 -- Get Miro Access Token

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Get_Anthropic_Key

1. Click + then Add an action.

2. Search for "Compose" and select Compose.

3. In the Inputs field, paste your Miro access token.

4. Secure this action: Click the three dots (...), then Settings, then Secure Inputs On, then Secure Outputs On, then Done.

5. Rename to: Get_Miro_Token

## Step 5.5: Add Action 3 -- Initialize Variables

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Get_Miro_Token

1. Click + then Add an action. Search for "Initialize variable" and select it.
   - Name: varPhasesJson
   - Type: String
   - Value: (leave empty)

2. Click + then Add an action. Initialize variable:
   - Name: varBoardId
   - Type: String
   - Value: (leave empty)

3. Click + then Add an action. Initialize variable:
   - Name: varBoardUrl
   - Type: String
   - Value: (leave empty)

4. Click + then Add an action. Initialize variable:
   - Name: varElementCount
   - Type: Integer
   - Value: 0

5. Click + then Add an action. Initialize variable:
   - Name: varJourneyTitle
   - Type: String
   - Value: (leave empty)

## Step 5.6: Add Action 4 -- Build Claude System Prompt

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Initialize Variables

1. Click + then Add an action. Search for "Compose" and select Compose.

2. In the Inputs field, paste the following system prompt text:

```
You are a UX expert specializing in customer journey analysis. Extract journey phases from the provided HTML or JSON into a structured JSON format. Return ONLY valid JSON with no markdown, no code fences, no extra text. The JSON must have this exact structure: {"journey_title": "string", "phases": [{"phase_name": "string", "touchpoints": ["string"], "emotions": ["string"], "pain_points": ["string"], "opportunities": ["string"]}], "key_insights": {"total_touchpoints": number, "total_pain_points": number, "top_recommendations": ["string"]}}. Each phase should represent a distinct stage in the customer journey. Touchpoints are specific interactions. Emotions are feelings at that stage. Pain points are frustrations or problems. Opportunities are improvement suggestions. If the input is HTML, parse the visual structure to identify stages. If the input is JSON, restructure it to match the required format. Limit each array to a maximum of 10 items per phase to stay within Miro board element limits.
```

3. Rename this action to: Claude_System_Prompt

## Step 5.7: Add Action 5 -- Escape System Prompt for JSON

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Claude_System_Prompt

1. Click + then Add an action. Search for "Compose" and select Compose.

2. Click in the Inputs field, then click the fx (Expression) tab. Paste the following expression:

```
replace(replace(replace(replace(outputs('Claude_System_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK.

4. Rename this action to: Escape_System_Prompt

> **BEGINNER TIP**: This 4-step escape chain is mandatory for any text that gets embedded inside a JSON body sent to an API. It escapes backslashes, double quotes, newlines, and carriage returns so the JSON remains valid. Without this, the API call will fail with a 400 error.

## Step 5.8: Add Action 6 -- Escape Journey HTML for JSON

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Escape_System_Prompt

1. Click + then Add an action. Search for "Compose" and select Compose.

2. Click in the Inputs field, then click the fx (Expression) tab. Paste:

```
replace(replace(replace(replace(triggerBody()?['journey_html'],'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK.

4. Rename this action to: Escape_Journey_Html

## Step 5.9: Add Action 7 -- Build Claude Request Body

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Escape_Journey_Html

1. Click + then Add an action. Search for "Compose" and select Compose.

2. Click in the Inputs field, then click the fx (Expression) tab. Paste:

```
concat('{"model":"claude-sonnet-4-6","max_tokens":8000,"system":"',outputs('Escape_System_Prompt'),'","messages":[{"role":"user","content":"Analyze the following journey map and extract structured phases:\\n\\n',outputs('Escape_Journey_Html'),'"}]}')
```

3. Click OK.

4. Rename this action to: Build_Claude_Body

> **WATCH OUT**: The concat() function builds the JSON body as a string. All literal JSON braces are single (not doubled) because they are inside a string, not a Power Automate expression context. The escaped outputs from the previous Compose actions ensure the JSON remains valid even if the journey HTML contains special characters.

## Step 5.10: Add Action 8 -- HTTP POST to Claude API

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Build_Claude_Body

1. Click + then Add an action. Search for "HTTP" and select HTTP.

2. Configure the HTTP action:
   - Method: Select POST from the dropdown.
   - URI: https://api.anthropic.com/v1/messages
   - Headers: Click + Add new parameter, then check Headers. Add three headers:
     - Header 1: Key = x-api-key, Value = click the lightning bolt (dynamic content) icon and select Outputs from Get_Anthropic_Key
     - Header 2: Key = anthropic-version, Value = 2023-06-01
     - Header 3: Key = content-type, Value = application/json
   - Body: Click in the Body field, then click the lightning bolt (dynamic content) icon and select Outputs from Build_Claude_Body
   - Click + Add new parameter, then check Timeout. Set to: PT120S

3. Secure this action: Click the three dots (...), then Settings, then Secure Inputs On, then Done.

4. Rename this action to: HTTP_Claude_Analyze

## Step 5.11: Add Action 9 -- Extract Claude Response

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below HTTP_Claude_Analyze

1. Click + then Add an action. Search for "Compose" and select Compose.

2. Click in the Inputs field, then click the fx (Expression) tab. Paste:

```
first(body('HTTP_Claude_Analyze')?['content'])?['text']
```

3. Click OK.

4. Rename this action to: Extract_Claude_Response

> **BEGINNER TIP**: This expression navigates the Claude API response structure. The response body has a "content" array, and the first item in that array has a "text" field containing the actual response text. The `first()` function gets the first item from the array.

## Step 5.12: Add Action 10 -- Parse Claude JSON Response

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Extract_Claude_Response

1. Click + then Add an action. Search for "Parse JSON" and select Parse JSON (under "Data Operations").

2. Content: Click the lightning bolt (dynamic content) icon and select Outputs from Extract_Claude_Response.

3. Schema: Click "Generate from sample" and paste this sample JSON:

```json
{
  "journey_title": "Customer Onboarding Journey",
  "phases": [
    {
      "phase_name": "Awareness",
      "touchpoints": ["Website visit", "Social media ad"],
      "emotions": ["Curious", "Interested"],
      "pain_points": ["Hard to find pricing"],
      "opportunities": ["Add pricing page"]
    }
  ],
  "key_insights": {
    "total_touchpoints": 12,
    "total_pain_points": 5,
    "top_recommendations": ["Simplify onboarding flow"]
  }
}
```

4. Click Done. The Parse JSON action now provides all fields as dynamic content in subsequent steps.

5. Rename this action to: Parse_Journey_Phases

## Step 5.13: Add Action 11 -- Set Journey Title Variable

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Parse_Journey_Phases

1. Click + then Add an action. Search for "Set variable" and select Set variable.

2. Name: Select varJourneyTitle

3. Value: Click the lightning bolt icon. Under Parse_Journey_Phases, select journey_title.

## Step 5.14: Add Action 12 -- Create Miro Board

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Set varJourneyTitle

1. Click + then Add an action. Search for "HTTP" and select HTTP.

2. Configure:
   - Method: POST
   - URI: https://api.miro.com/v2/boards
   - Headers:
     - Header 1: Key = Authorization, Value = Type Bearer  (with trailing space), then click the lightning bolt icon and select Outputs from Get_Miro_Token
     - Header 2: Key = Content-Type, Value = application/json
   - Body: Click in the Body field and type the following (use the lightning bolt to insert dynamic content where indicated):

```
{"name":"
```

Then click the lightning bolt icon and select board_name from the trigger inputs. Continue typing:

```
","description":"Journey board analyzed by Claude AI. Created by Miro Journey Board Creator.","sharingPolicy":{"access":"private","inviteToAccountAndBoardLinkAccess":"no_access","organizationAccess":"private","teamAccess":"private"}}
```

The complete body reads: `{"name":"[board_name dynamic content]","description":"Journey board analyzed by Claude AI. Created by Miro Journey Board Creator.","sharingPolicy":{"access":"private","inviteToAccountAndBoardLinkAccess":"no_access","organizationAccess":"private","teamAccess":"private"}}`

   - Timeout: PT120S

3. Secure this action: Click (...), then Settings, then Secure Inputs On, then Done.

4. Rename to: HTTP_Create_Board

## Step 5.15: Add Action 13 -- Extract Board ID and URL

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below HTTP_Create_Board

1. Click + then Add an action. Search for "Set variable" and select Set variable.
   - Name: Select varBoardId
   - Value: Click the fx (Expression) tab and paste: body('HTTP_Create_Board')?['id']
   - Click OK.

2. Click + then Add an action. Set variable:
   - Name: Select varBoardUrl
   - Value: Click fx and paste: body('HTTP_Create_Board')?['viewLink']
   - Click OK.

## Step 5.16: Add Action 14 -- Create Title Frame on Board

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Set varBoardUrl

1. Click + then Add an action. Search for "HTTP" and select HTTP.

2. Configure:
   - Method: POST
   - URI: Click in the field, then click fx and paste:
     ```
     concat('https://api.miro.com/v2/boards/',variables('varBoardId'),'/frames')
     ```
     Click OK.
   - Headers:
     - Key = Authorization, Value = Bearer  then lightning bolt then Outputs from Get_Miro_Token
     - Key = Content-Type, Value = application/json
   - Body:

```json
{"data":{"title":"Journey Map Board","format":"custom","type":"freeform"},"style":{"fillColor":"#1E3A8A"},"position":{"x":0,"y":-500},"geometry":{"width":2000,"height":200}}
```

   - Timeout: PT120S

3. Secure Inputs: On. Rename to: HTTP_Create_Title_Frame

4. Click + then Add an action. Search for "Increment variable" and select Increment variable.
   - Name: varElementCount
   - Value: 1

## Step 5.17: Add Action 15 -- Apply to Each Phase (Main Loop)

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below HTTP_Create_Title_Frame

This is the core loop that iterates through each journey phase and creates all Miro elements.

1. Click + then Add an action. Search for "Apply to each" and select Apply to each (under "Control").

2. In the "Select an output from previous steps" field, click the lightning bolt icon. Under Parse_Journey_Phases, select phases. (This is the array of phase objects from the parsed Claude response.)

3. Rename this Apply to each action to: Loop_Through_Phases

**Inside the loop, we need to calculate the X position for each phase. Since Power Automate does not have a built-in loop index, we will use the varElementCount variable to track position.**

4. Inside the Loop_Through_Phases, click + then Add an action. Search for "Compose" and select Compose.

5. In the Inputs field, click fx and paste:
```
mul(div(sub(variables('varElementCount'),1),1),1000)
```

> **WATCH OUT**: This expression is a simplified position calculator. For a more accurate approach, we will use a separate counter variable. Actually, let us use a cleaner approach. Add an Initialize variable BEFORE the loop (go back above the Apply to each):

6. Go back above the Apply to each loop. Click + between the Increment variable (for title frame) and the Apply to each. Add Initialize variable:
   - Name: varPhaseIndex
   - Type: Integer
   - Value: 0

7. Now go back inside the Loop_Through_Phases. The first action inside the loop should calculate the X position:

8. Click + inside the loop. Add a Compose action.
   - Inputs: Click fx and paste: mul(variables('varPhaseIndex'), 1000)
   - Click OK.
   - Rename to: Calculate_Phase_X

## Step 5.18: Add Actions Inside Loop -- Create Phase Frame

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Inside Loop_Through_Phases

1. Click + inside the loop (below Calculate_Phase_X). Add an HTTP action.

2. Configure:
   - Method: POST
   - URI: Click fx and paste:
     ```
     concat('https://api.miro.com/v2/boards/',variables('varBoardId'),'/frames')
     ```
   - Headers:
     - Key = Authorization, Value = Bearer  then lightning bolt then Outputs from Get_Miro_Token
     - Key = Content-Type, Value = application/json
   - Body: Click fx and paste:
     ```
     concat('{"data":{"title":"',replace(items('Loop_Through_Phases')?['phase_name'],'"','\"'),'","format":"custom","type":"freeform"},"style":{"fillColor":"#1E3A8A"},"position":{"x":',string(outputs('Calculate_Phase_X')),',"y":0},"geometry":{"width":800,"height":1500}}')
     ```
   - Timeout: PT120S

3. Secure Inputs: On. Rename to: HTTP_Create_Phase_Frame

4. Click + and add Increment variable:
   - Name: varElementCount
   - Value: 1

## Step 5.19: Add Actions Inside Loop -- Create Touchpoint Sticky Notes

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Inside Loop_Through_Phases

1. Click + inside the loop (below the Increment variable). Add an Apply to each action.

2. In the "Select an output from previous steps" field, click the lightning bolt icon. Under Loop_Through_Phases (the current item), look for touchpoints. If it does not appear in dynamic content, click fx and paste:
```
items('Loop_Through_Phases')?['touchpoints']
```

3. Rename this inner loop to: Loop_Touchpoints

4. Inside Loop_Touchpoints, click + and add an HTTP action.

5. Configure:
   - Method: POST
   - URI: Click fx and paste:
     ```
     concat('https://api.miro.com/v2/boards/',variables('varBoardId'),'/sticky_notes')
     ```
   - Headers:
     - Key = Authorization, Value = Bearer  then lightning bolt then Outputs from Get_Miro_Token
     - Key = Content-Type, Value = application/json
   - Body: Click fx and paste:
     ```
     concat('{"data":{"content":"',replace(replace(replace(replace(string(items('Loop_Touchpoints')),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),''),'","shape":"square"},"style":{"fillColor":"yellow","textAlign":"center","textAlignVertical":"middle"},"position":{"x":',string(add(outputs('Calculate_Phase_X'),100)),',"y":',string(mul(iterationIndexes('Loop_Touchpoints'),250)),'}}')
     ```

> **WATCH OUT**: The `iterationIndexes('Loop_Touchpoints')` function returns the current iteration index (0, 1, 2, ...) of the inner loop. This is used to stack sticky notes vertically. If this function is not available in your version, use a separate counter variable initialized to 0 before the inner loop and incremented inside it.

   - Timeout: PT120S

6. Secure Inputs: On. Rename to: HTTP_Create_Touchpoint_Note

7. Click + and add Increment variable:
   - Name: varElementCount
   - Value: 1

## Step 5.20: Add Actions Inside Loop -- Create Pain Point Sticky Notes

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Inside Loop_Through_Phases

1. Below the Loop_Touchpoints (back in the outer loop), click + and add another Apply to each.

2. Select output: Click fx and paste:
```
items('Loop_Through_Phases')?['pain_points']
```

3. Rename to: Loop_Pain_Points

4. Inside Loop_Pain_Points, click + and add an HTTP action.

5. Configure:
   - Method: POST
   - URI: Click fx and paste:
     ```
     concat('https://api.miro.com/v2/boards/',variables('varBoardId'),'/sticky_notes')
     ```
   - Headers:
     - Key = Authorization, Value = Bearer  then lightning bolt then Outputs from Get_Miro_Token
     - Key = Content-Type, Value = application/json
   - Body: Click fx and paste:
     ```
     concat('{"data":{"content":"PAIN POINT: ',replace(replace(replace(replace(string(items('Loop_Pain_Points')),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),''),'","shape":"square"},"style":{"fillColor":"red","textAlign":"center","textAlignVertical":"middle"},"position":{"x":',string(add(outputs('Calculate_Phase_X'),350)),',"y":',string(mul(iterationIndexes('Loop_Pain_Points'),250)),'}}')
     ```
   - Timeout: PT120S

6. Secure Inputs: On. Rename to: HTTP_Create_Pain_Point_Note

7. Click + and add Increment variable:
   - Name: varElementCount
   - Value: 1

## Step 5.21: Add Actions Inside Loop -- Create Opportunity Sticky Notes

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Inside Loop_Through_Phases

1. Below Loop_Pain_Points, click + and add another Apply to each.

2. Select output: Click fx and paste:
```
items('Loop_Through_Phases')?['opportunities']
```

3. Rename to: Loop_Opportunities

4. Inside Loop_Opportunities, click + and add an HTTP action.

5. Configure:
   - Method: POST
   - URI: Click fx and paste:
     ```
     concat('https://api.miro.com/v2/boards/',variables('varBoardId'),'/sticky_notes')
     ```
   - Headers:
     - Key = Authorization, Value = Bearer  then lightning bolt then Outputs from Get_Miro_Token
     - Key = Content-Type, Value = application/json
   - Body: Click fx and paste:
     ```
     concat('{"data":{"content":"OPPORTUNITY: ',replace(replace(replace(replace(string(items('Loop_Opportunities')),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),''),'","shape":"square"},"style":{"fillColor":"light_green","textAlign":"center","textAlignVertical":"middle"},"position":{"x":',string(add(outputs('Calculate_Phase_X'),600)),',"y":',string(mul(iterationIndexes('Loop_Opportunities'),250)),'}}')
     ```
   - Timeout: PT120S

6. Secure Inputs: On. Rename to: HTTP_Create_Opportunity_Note

7. Click + and add Increment variable:
   - Name: varElementCount
   - Value: 1

## Step 5.22: Add Actions Inside Loop -- Create Emotion Sticky Notes

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Inside Loop_Through_Phases

1. Below Loop_Opportunities, click + and add another Apply to each.

2. Select output: Click fx and paste:
```
items('Loop_Through_Phases')?['emotions']
```

3. Rename to: Loop_Emotions

4. Inside Loop_Emotions, click + and add an HTTP action.

5. Configure:
   - Method: POST
   - URI: Click fx and paste:
     ```
     concat('https://api.miro.com/v2/boards/',variables('varBoardId'),'/sticky_notes')
     ```
   - Headers:
     - Key = Authorization, Value = Bearer  then lightning bolt then Outputs from Get_Miro_Token
     - Key = Content-Type, Value = application/json
   - Body: Click fx and paste:
     ```
     concat('{"data":{"content":"EMOTION: ',replace(replace(replace(replace(string(items('Loop_Emotions')),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),''),'","shape":"square"},"style":{"fillColor":"light_pink","textAlign":"center","textAlignVertical":"middle"},"position":{"x":',string(add(outputs('Calculate_Phase_X'),100)),',"y":',string(add(mul(iterationIndexes('Loop_Emotions'),250),1000)),'}}')
     ```
   - Timeout: PT120S

6. Secure Inputs: On. Rename to: HTTP_Create_Emotion_Note

7. Click + and add Increment variable:
   - Name: varElementCount
   - Value: 1

## Step 5.23: Add Actions Inside Loop -- Increment Phase Index

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Inside Loop_Through_Phases (end of loop)

1. At the very end of the Loop_Through_Phases (after all inner loops), click + and add Increment variable:
   - Name: varPhaseIndex
   - Value: 1

> **BEGINNER TIP**: This increments the phase index so the next phase's elements are positioned 1000 pixels to the right of the current phase.

## Step 5.24: Add Action -- Create Connectors Between Phases

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Loop_Through_Phases

After the main phase loop completes, we need to create connector lines between adjacent phases. This requires knowing the IDs of the phase frames we created. Since we did not store them individually, we will use a simplified approach: create connectors based on position.

> **WATCH OUT**: Creating connectors requires the item IDs of the elements to connect. Since we did not capture individual frame IDs in the loop above, we need to retrieve them. We will use a GET request to list all frames on the board, then create connectors between adjacent ones.

1. Below the Loop_Through_Phases, click + and add an HTTP action.

2. Configure:
   - Method: GET
   - URI: Click fx and paste:
     ```
     concat('https://api.miro.com/v2/boards/',variables('varBoardId'),'/items?type=frame&limit=50')
     ```
   - Headers:
     - Key = Authorization, Value = Bearer  then lightning bolt then Outputs from Get_Miro_Token
   - Timeout: PT120S

3. Secure Inputs: On. Rename to: HTTP_Get_All_Frames

4. Click + and add a Compose action.
   - Inputs: Click fx and paste:
     ```
     body('HTTP_Get_All_Frames')?['data']
     ```
   - Rename to: Extract_Frames_Array

5. Click + and add an Apply to each.
   - Select output: Click fx and paste:
     ```
     range(0, sub(length(outputs('Extract_Frames_Array')), 1))
     ```
   - Rename to: Loop_Create_Connectors

> **BEGINNER TIP**: The `range(0, sub(length(...), 1))` expression creates an array of numbers from 0 to (number of frames - 2). This gives us one iteration for each pair of adjacent frames. For example, if there are 5 frames, we get [0, 1, 2, 3] -- representing 4 connections.

6. Inside Loop_Create_Connectors, click + and add a Compose action.
   - Inputs: Click fx and paste:
     ```
     outputs('Extract_Frames_Array')[items('Loop_Create_Connectors')]?['id']
     ```
   - Rename to: Get_Start_Frame_Id

7. Click + and add another Compose action.
   - Inputs: Click fx and paste:
     ```
     outputs('Extract_Frames_Array')[add(items('Loop_Create_Connectors'),1)]?['id']
     ```
   - Rename to: Get_End_Frame_Id

8. Click + and add an HTTP action.
   - Method: POST
   - URI: Click fx and paste:
     ```
     concat('https://api.miro.com/v2/boards/',variables('varBoardId'),'/connectors')
     ```
   - Headers:
     - Key = Authorization, Value = Bearer  then lightning bolt then Outputs from Get_Miro_Token
     - Key = Content-Type, Value = application/json
   - Body: Click fx and paste:
     ```
     concat('{"startItem":{"id":"',outputs('Get_Start_Frame_Id'),'"},"endItem":{"id":"',outputs('Get_End_Frame_Id'),'"},"style":{"strokeColor":"#B8B800","strokeWidth":"2"}}')
     ```
   - Timeout: PT120S

9. Secure Inputs: On. Rename to: HTTP_Create_Connector

10. Click + and add Increment variable:
    - Name: varElementCount
    - Value: 1

## Step 5.25: Add Action -- Respond to Copilot

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board > Below Loop_Create_Connectors

1. Below the connector loop, click + then Add an action.

2. Search for "Respond to Copilot" and select it.

3. Click + Add an output two times:

Output 1:
- Type: Text
- Name: board_url
- Value: Click the lightning bolt icon and select the variable varBoardUrl

Output 2:
- Type: Text
- Name: status
- Value: Type: completed

4. Click on the Respond to Copilot action. Click Settings. Under Networking, find the Asynchronous Response toggle and set it to Off.

5. Click Save at the top of the flow editor.

> **WATCH OUT**: This flow has many HTTP actions inside nested loops. If a journey map has many phases with many elements, the flow may approach the 100-second timeout. For large journey maps (more than 6 phases), consider splitting the board creation into multiple flow runs or using the async pattern (respond first, then continue creating elements).

## Step 5.26: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Get_Anthropic_Key | Compose | Anthropic API key (Secure I/O ON) |
| 2 | Get_Miro_Token | Compose | Miro access token (Secure I/O ON) |
| 3 | Init varPhasesJson | Initialize variable | String, empty |
| 4 | Init varBoardId | Initialize variable | String, empty |
| 5 | Init varBoardUrl | Initialize variable | String, empty |
| 6 | Init varElementCount | Initialize variable | Integer, 0 |
| 7 | Init varJourneyTitle | Initialize variable | String, empty |
| 8 | Claude_System_Prompt | Compose | Full system prompt text |
| 9 | Escape_System_Prompt | Compose | 4-step escape chain on system prompt |
| 10 | Escape_Journey_Html | Compose | 4-step escape chain on journey_html input |
| 11 | Build_Claude_Body | Compose | concat() JSON body for Claude API |
| 12 | HTTP_Claude_Analyze | HTTP | POST api.anthropic.com/v1/messages, Secure Inputs ON |
| 13 | Extract_Claude_Response | Compose | first(body(...)['content'])['text'] |
| 14 | Parse_Journey_Phases | Parse JSON | Schema from sample journey JSON |
| 15 | Set varJourneyTitle | Set variable | From Parse_Journey_Phases.journey_title |
| 16 | HTTP_Create_Board | HTTP | POST api.miro.com/v2/boards |
| 17 | Set varBoardId | Set variable | body('HTTP_Create_Board')['id'] |
| 18 | Set varBoardUrl | Set variable | body('HTTP_Create_Board')['viewLink'] |
| 19 | HTTP_Create_Title_Frame | HTTP | POST .../frames, title frame at y:-500 |
| 20 | Init varPhaseIndex | Initialize variable | Integer, 0 |
| 21 | Loop_Through_Phases | Apply to each | phases array from Parse_Journey_Phases |
| 22 | Calculate_Phase_X | Compose | mul(varPhaseIndex, 1000) |
| 23 | HTTP_Create_Phase_Frame | HTTP | POST .../frames, phase header |
| 24 | Loop_Touchpoints | Apply to each | touchpoints array |
| 25 | HTTP_Create_Touchpoint_Note | HTTP | POST .../sticky_notes, fillColor: yellow |
| 26 | Loop_Pain_Points | Apply to each | pain_points array |
| 27 | HTTP_Create_Pain_Point_Note | HTTP | POST .../sticky_notes, fillColor: red |
| 28 | Loop_Opportunities | Apply to each | opportunities array |
| 29 | HTTP_Create_Opportunity_Note | HTTP | POST .../sticky_notes, fillColor: light_green |
| 30 | Loop_Emotions | Apply to each | emotions array |
| 31 | HTTP_Create_Emotion_Note | HTTP | POST .../sticky_notes, fillColor: light_pink |
| 32 | Increment varPhaseIndex | Increment variable | +1 per phase |
| 33 | HTTP_Get_All_Frames | HTTP | GET .../items?type=frame |
| 34 | Extract_Frames_Array | Compose | body(...)['data'] |
| 35 | Loop_Create_Connectors | Apply to each | range(0, frameCount-1) |
| 36 | Get_Start_Frame_Id | Compose | frames[index]['id'] |
| 37 | Get_End_Frame_Id | Compose | frames[index+1]['id'] |
| 38 | HTTP_Create_Connector | HTTP | POST .../connectors |
| 39 | Respond to Copilot | Respond to Copilot | board_url (Text), status (Text) |

---

# PHASE 6: Register Test Miro Connection, Create Miro Journey Board -- TOOL REGISTRATION

This phase registers both flows as tools in Copilot Studio so the agent can call them from topics and the orchestrator can invoke them autonomously.

## Step 6.1: Register Test Miro Connection as a Tool

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Overview > Tools

1. Go back to Copilot Studio and open your Miro Journey Board Creator agent.

2. On the Overview page, find the Tools section. Click Add a tool.

3. In the tool picker, click Power Automate flows (or Flows depending on your view).

4. Find Test Miro Connection in the list. Click it, then click Add and configure.

5. On the configuration screen:
   - Name: Test Miro Connection
   - Description: Validates the Miro API access token by making a lightweight API call to list boards. Returns connection status and error details if authentication or permissions fail. Call this tool before creating any Miro board.

6. This flow has no input parameters, so skip the inputs section.

7. Under Completion, select "Don't respond (default)" -- the agent will incorporate the output into its next message.

8. Click Save.

## Step 6.2: Register Create Miro Journey Board as a Tool

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Overview > Tools

1. Click Add a tool again.

2. Click Power Automate flows, find Create Miro Journey Board, click it, then click Add and configure.

3. On the configuration screen:
   - Name: Create Miro Journey Board
   - Description: Creates a new Miro board and populates it with journey map elements. Analyzes journey HTML with Claude AI to extract phases, then creates stage frames, touchpoint sticky notes (yellow), pain point sticky notes (red), opportunity sticky notes (green), emotion sticky notes (pink), and connector lines. Call this tool when the user wants to generate a visual Miro board from journey data.

4. Map the inputs:
   - journey_html: Set this to be filled from context (the orchestrator will use Global.varJourneyHtml).
   - board_name: Set this to be filled from context (from the user's response).
   - layout_type: Set this to be filled from context (from Global.varLayoutType).
   - color_theme: Set this to be filled from context (from Global.varColorTheme).

5. Under Completion, select "Don't respond (default)".

6. Click Save.

## Step 6.3: Return to Board Generation Request Topic and Replace Placeholders

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Generation Request

1. Open the Board Generation Request topic.

2. Find the placeholder Message node that says "[PLACEHOLDER] Replace this node with the Test Miro Connection action after building the flow in Phase 4."

3. Delete this placeholder node (click the three dots on the node, then Delete).

4. In its place, click the + button, then Add a tool, then select Test Miro Connection.

5. The Action node appears. It has no input parameters. Map the outputs:
   - Click the connected output. Create a new variable named varMiroConnected (Topic scope, Boolean type).
   - Click the status output. Create a new variable named varMiroConnectionStatus (Topic scope, String type).

6. Find the second placeholder Message node that says "[PLACEHOLDER] Replace this node with the Create Miro Journey Board action after building the flow in Phase 5."

7. Delete this placeholder node.

8. In its place, click +, then Add a tool, then select Create Miro Journey Board.

9. The Action node appears with input parameters. Map each one:
   - journey_html: Click the input field, then click {x} and select Global.varJourneyHtml
   - board_name: Click the input field, then click {x} and select Topic.varBoardName
   - layout_type: Click the input field, then click {x} and select Global.varLayoutType
   - color_theme: Click the input field, then click {x} and select Global.varColorTheme

10. Map the outputs:
    - board_url: Create a new variable named varBoardUrl (Topic scope, String type).
    - status: Create a new variable named varBoardCreationStatus (Topic scope, String type).

11. Click Save at the top of the topic canvas.

> **VERIFY**: Both Action nodes now show the correct flow names with green checkmarks. All input and output variables are mapped. No placeholder Message nodes remain.

---

# PHASE 7: Template Selection -- TOPIC BUILD (node-by-node: 6 nodes)

This topic lets users choose their preferred board layout and color theme before generating a board. The selections are stored in global variables that the Create Miro Journey Board flow uses.

## Step 7.1: Create the Template Selection Topic

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Custom

1. Click the Topics tab, then Custom subtab.

2. Click + Add a topic, then From blank.

3. Rename the topic to: Template Selection

4. Set the Description to: User wants to choose or customize the visual layout and styling of the Miro board. Route here when the user mentions templates, layout options (horizontal, vertical, swimlane), color themes, or visual customization of the board appearance. Does NOT create a board -- only sets preferences.

## Step 7.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Template Selection > Trigger node

1. Add these trigger phrases (press Enter after each):
   - choose board template
   - customize layout
   - change color theme
   - board style options
   - visual customization
   - select layout
   - pick a template
   - change board layout

## Step 7.3: Add Node 1 -- Message -- "Layout Options Overview"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Template Selection > Canvas

1. Click the + button below the Trigger node. Click Send a message.

2. Type:

```
I can customize the layout and color theme for your Miro board. Here are the available options:

LAYOUTS:
-> Horizontal: Stages flow left-to-right. Best for timeline-based journeys with a clear start and end.
-> Vertical: Stages flow top-to-bottom. Best for process-focused views or when stages have many sub-elements.
-> Swimlane: Stages grouped by channel with horizontal lanes. Best for multi-channel journeys showing parallel paths.

COLOR THEMES:
-> Default CX Palette: Blue stage frames, yellow touchpoints, red pain points, green opportunities, pink emotions.
-> Brand Colors: Customize with your organization's brand colors (mapped to Miro's supported colors).
-> High Contrast: Accessibility-optimized with black/white base and bright accent colors.
```

## Step 7.4: Add Node 2 -- Question -- "Select Layout Type"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Template Selection > Canvas

1. Click the + button below the message node. Click Ask a question.

2. In the question text field, type:

```
Which layout would you like for your Miro board?
```

3. Under "Identify", look for the entity selector. Click it and find the Board Layouts entity you created in Step 1.8. Select it.

4. Click the output variable name. In the Variable properties panel:
   - Under Variable name, type: varSelectedLayout
   - Under Usage, select "Global (any topic can access)". The name becomes Global.varSelectedLayout.

5. After the question node, add a Set variable value node:
   - Click + below the question, then Variable management, then Set a variable value.
   - Set variable: Select Global.varLayoutType
   - To value: Click {x} and select Global.varSelectedLayout

> **BEGINNER TIP**: We store the selection in both Global.varSelectedLayout (the raw entity value) and Global.varLayoutType (the variable the flow reads). This ensures the Create Miro Journey Board flow always has the correct layout type regardless of which topic set it.

## Step 7.5: Add Node 3 -- Question -- "Select Color Theme"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Template Selection > Canvas

1. Click the + button below the Set variable node. Click Ask a question.

2. In the question text field, type:

```
Which color theme would you like?
```

3. Under "Identify", find and select the Color Themes entity you created in Step 1.9.

4. Click the output variable name. In the Variable properties panel:
   - Under Variable name, type: varSelectedTheme
   - Under Usage, select "Global (any topic can access)". The name becomes Global.varSelectedTheme.

5. After the question node, add a Set variable value node:
   - Set variable: Select Global.varColorTheme
   - To value: Click {x} and select Global.varSelectedTheme

## Step 7.6: Add Node 4 -- Condition -- "Validate Color Compatibility"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Template Selection > Canvas

1. Click the + button below the Set variable node. Click Add a condition.

2. In the condition, select Global.varColorTheme, set operator to "is equal to", and set value to: Brand Colors

**In the "Yes" (Brand Colors selected) branch:**

3. Click + and add a Send a message node. Type:

```
You selected Brand Colors. Please note that Miro supports only these sticky note colors: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black.

Your brand colors will be mapped to the closest supported Miro color. The default mapping uses blue for stage frames, your primary brand color for touchpoints, and red for pain points.
```

**In the "All other conditions" branch:**

4. Click + and add a Send a message node. Type:

```
Color theme confirmed. All colors are compatible with Miro's supported palette.
```

## Step 7.7: Add Node 5 -- Adaptive Card -- "Template Preview Card"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Template Selection > Canvas

1. After both branches merge, click the + button. Click Send a message.

2. In the message node, click the attachment icon and select Adaptive Card.

3. Paste this JSON:

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
          "text": "TEMPLATE CONFIGURATION SUMMARY",
          "weight": "Bolder",
          "size": "Medium",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Layout",
          "value": "{Global.varLayoutType}"
        },
        {
          "title": "Color Theme",
          "value": "{Global.varColorTheme}"
        },
        {
          "title": "Stage Spacing",
          "value": "1000px horizontal"
        },
        {
          "title": "Element Spacing",
          "value": "250px vertical"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "COLOR LEGEND:",
      "weight": "Bolder",
      "size": "Small",
      "spacing": "Medium",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Stage Frames",
          "value": "Dark Blue (#1E3A8A)"
        },
        {
          "title": "Touchpoints",
          "value": "Yellow sticky notes"
        },
        {
          "title": "Pain Points",
          "value": "Red sticky notes"
        },
        {
          "title": "Opportunities",
          "value": "Light Green sticky notes"
        },
        {
          "title": "Emotions",
          "value": "Light Pink sticky notes"
        },
        {
          "title": "Connectors",
          "value": "Chartreuse (#B8B800)"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "These settings will be applied when you create your next Miro board. Type \"create board\" to proceed.",
      "wrap": true,
      "size": "Small",
      "spacing": "Medium"
    }
  ]
}
```

4. Save the Adaptive Card editor.

> **WATCH OUT**: The `{Global.varLayoutType}` and `{Global.varColorTheme}` references in the FactSet values are placeholders for the visual editor. You may need to switch to Formula mode to insert actual variable references. Remember: once you switch to Formula mode, you cannot go back to JSON. Save the JSON first.

## Step 7.8: Add Node 6 -- Message -- "Template Selection Confirmed"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Template Selection > Canvas

1. Click the + button below the Adaptive Card node. Click Send a message.

2. Type:

```
Your template preferences have been saved. Layout: {Global.varLayoutType}. Color theme: {Global.varColorTheme}.

Type "create board" to generate a Miro board with these settings, or type "choose template" again to change your selections.
```

3. Click Save at the top of the topic canvas.

## Step 7.9: Complete YAML for Template Selection Topic

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Template Selection
    triggerQueries:
      - choose board template
      - customize layout
      - change color theme
      - board style options
      - visual customization
      - select layout
      - pick a template
      - change board layout
  actions:
    - kind: SendMessage
      id: layoutOverview
      message: |-
        I can customize the layout and color theme for your Miro board. Here are the available options:

        LAYOUTS:
        -> Horizontal: Stages flow left-to-right. Best for timeline-based journeys with a clear start and end.
        -> Vertical: Stages flow top-to-bottom. Best for process-focused views or when stages have many sub-elements.
        -> Swimlane: Stages grouped by channel with horizontal lanes. Best for multi-channel journeys showing parallel paths.

        COLOR THEMES:
        -> Default CX Palette: Blue stage frames, yellow touchpoints, red pain points, green opportunities, pink emotions.
        -> Brand Colors: Customize with your organization's brand colors (mapped to Miro's supported colors).
        -> High Contrast: Accessibility-optimized with black/white base and bright accent colors.

    - kind: Question
      id: askLayout
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.varSelectedLayout
      prompt: "Which layout would you like for your Miro board?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: horizontal
              displayName: Horizontal
            - id: vertical
              displayName: Vertical
            - id: swimlane
              displayName: Swimlane

    - kind: SetVariable
      id: setLayoutType
      variable: Global.varLayoutType
      value: =Global.varSelectedLayout

    - kind: Question
      id: askColorTheme
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.varSelectedTheme
      prompt: "Which color theme would you like?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: default
              displayName: Default CX Palette
            - id: brand
              displayName: Brand Colors
            - id: high_contrast
              displayName: High Contrast

    - kind: SetVariable
      id: setColorTheme
      variable: Global.varColorTheme
      value: =Global.varSelectedTheme

    - kind: ConditionGroup
      id: validateColors
      conditions:
        - id: isBrandColors
          condition: =Global.varColorTheme = "brand"
          actions:
            - kind: SendMessage
              id: brandColorNote
              message: |-
                You selected Brand Colors. Please note that Miro supports only these sticky note colors: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black.

                Your brand colors will be mapped to the closest supported Miro color. The default mapping uses blue for stage frames, your primary brand color for touchpoints, and red for pain points.
      elseActions:
        - kind: SendMessage
          id: colorsOk
          message: "Color theme confirmed. All colors are compatible with Miro's supported palette."

    - kind: SendMessage
      id: confirmTemplate
      message: |-
        Your template preferences have been saved. Layout: {Global.varLayoutType}. Color theme: {Global.varColorTheme}.

        Type "create board" to generate a Miro board with these settings, or type "choose template" again to change your selections.

    - kind: EndDialog
      id: endTemplate
```

---

# PHASE 8: Board Status -- TOPIC BUILD (node-by-node: 6 nodes)

This topic lets users check the details of a previously created Miro board, including element counts and the board URL. It calls the Miro API directly to retrieve board information.

## Step 8.1: Create the Board Status Topic

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Custom

1. Click the Topics tab, then Custom subtab.

2. Click + Add a topic, then From blank.

3. Rename the topic to: Board Status

4. Set the Description to: User wants to check the progress of board generation or view details of a completed board. Route here when the user asks about board creation status, wants the board URL, asks how many elements were created, or wants to verify the board was generated correctly. Does NOT create new boards.

## Step 8.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Status > Trigger node

1. Add these trigger phrases:
   - check board status
   - board creation progress
   - get board URL
   - is the board ready
   - view generated board
   - how many elements
   - board details
   - show my board

## Step 8.3: Add Node 1 -- Message -- "Board Status Check"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Status > Canvas

1. Click the + button below the Trigger node. Click Send a message.

2. Type:

```
Let me check the status of your Miro board. I will retrieve the board details from the Miro API.
```

## Step 8.4: Add Node 2 -- Condition -- "Check if Board URL Exists"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Status > Canvas

1. Click the + button below the message. Click Add a condition.

2. Before we can check the board, we need to know which board to look up. We will check if a board URL was stored from a previous creation.

3. In the condition, we need to check Global.varBoardUrl (we need to make this variable global). First, let us create it:
   - Click the + button ABOVE the condition (between the message and condition). Select Variable management, then Set a variable value.
   - Set variable: Click and select Create a new variable. Name it varBoardUrlCheck. Under Usage, select "Topic (this topic only)".
   - To value: Click {x} and look for a global variable. If Global.varBoardUrl does not exist yet as a global variable, we need to create it in the Conversation Start topic. Actually, the varBoardUrl from the Board Generation Request topic was Topic-scoped. We need to make it global.

> **WATCH OUT**: The varBoardUrl variable in the Board Generation Request topic was created as Topic-scoped. To share it across topics, we need to change it to Global scope. Go back to the Board Generation Request topic, find the varBoardUrl variable (in the Action node output mapping), click it, and in the Variable properties panel, change Usage to "Global (any topic can access)". The name becomes Global.varBoardUrl. Then come back here.

4. After making varBoardUrl global, return to the Board Status topic. In the condition:
   - Select Global.varBoardUrl
   - Operator: is not equal to
   - Value: Click fx, type `Text("")`, click Done.

**In the "Yes" (board URL exists) branch:**

5. Click + and add a Send a message node. Type:

```
Found a board from your current session. Retrieving details now.
```

6. Continue to Node 3 (the API call) in the next step.

**In the "All other conditions" (no board URL) branch:**

7. Click + and add a Send a message node. Type:

```
I do not have a board URL from your current session. You can:

-> Type "create board" to generate a new Miro board
-> Provide a Miro board ID and I will look it up
```

8. Add an End current topic node after this message.

## Step 8.5: Add Node 3 -- Message Placeholder for Board Details Retrieval

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Status > Canvas > "Yes" branch

Since we do not have a separate flow for board status retrieval (the Board Generation Request flow already returns the board URL and status), we will display the stored information directly. For a production agent, you would create a separate flow that calls GET /v2/boards/{board_id}/items to get element counts. For this recipe, we use the stored global variables.

1. Inside the "Yes" branch, after the "Found a board" message, click + and add a Set variable value node:
   - Set variable: Create a new variable named varBoardStatus (Topic scope, String type).
   - To value: Type: completed

> **BEGINNER TIP**: In a production implementation, you would create a third flow called "Get Board Details" that makes a GET request to the Miro API to retrieve current board information. For this recipe, we use the data stored from the board creation flow to keep things simpler.

## Step 8.6: Add Node 4 -- Adaptive Card -- "Board Details Card"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Status > Canvas

1. Click the + button below the Set variable node. Click Send a message.

2. Click the attachment icon and select Adaptive Card.

3. Paste this JSON:

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
          "text": "MIRO BOARD STATUS",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Board URL",
          "value": "{Global.varBoardUrl}"
        },
        {
          "title": "Status",
          "value": "{Topic.varBoardStatus}"
        },
        {
          "title": "Layout",
          "value": "{Global.varLayoutType}"
        },
        {
          "title": "Color Theme",
          "value": "{Global.varColorTheme}"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "ELEMENT LIMIT: Miro boards perform best with fewer than 200 elements. Monitor your element count if adding more items.",
      "wrap": true,
      "size": "Small",
      "spacing": "Medium",
      "isSubtle": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "OPEN IN MIRO",
      "url": "{Global.varBoardUrl}"
    }
  ]
}
```

4. Save the Adaptive Card editor.

## Step 8.7: Add Node 5 -- Question -- "Board Follow-Up Action"

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Status > Canvas

1. Click the + button below the Adaptive Card node. Click Ask a question.

2. Type:

```
What would you like to do next?
```

3. Under "Identify", define choices:
   - Option 1: Open the board in Miro
   - Option 2: Create a new board from different journey data
   - Option 3: Change template settings

4. Click the output variable name. In the Variable properties panel:
   - Under Variable name, type: varBoardAction
   - Leave Usage as "Topic (this topic only)".

## Step 8.8: Add Node 6 -- Condition and Redirect

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Topics > Board Status > Canvas

1. Click the + button below the question. Click Add a condition.

2. Select Topic.varBoardAction, operator "is equal to", value: Create a new board from different journey data

**In the "Yes" branch:**

3. Click + and select Topic management, then Redirect to another topic.

4. In the redirect node, select Board Generation Request.

**In the "All other conditions" branch:**

5. Add another Condition: Select Topic.varBoardAction, operator "is equal to", value: Change template settings

6. In the "Yes" branch of this inner condition: Click + and select Topic management, then Redirect to another topic. Select Template Selection.

7. In the "All other conditions" branch: Click + and add a Send a message node. Type:

```
You can open the board directly using the URL shown above. The board is ready for collaboration in Miro.
```

8. Add an End current topic node.

9. Click Save at the top of the topic canvas.

## Step 8.9: Complete YAML for Board Status Topic

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Board Status
    triggerQueries:
      - check board status
      - board creation progress
      - get board URL
      - is the board ready
      - view generated board
      - how many elements
      - board details
      - show my board
  actions:
    - kind: SendMessage
      id: statusCheckMsg
      message: "Let me check the status of your Miro board. I will retrieve the board details from the Miro API."

    - kind: ConditionGroup
      id: checkBoardExists
      conditions:
        - id: hasBoardUrl
          condition: =!IsBlank(Global.varBoardUrl)
          actions:
            - kind: SendMessage
              id: boardFoundMsg
              message: "Found a board from your current session. Retrieving details now."
            - kind: SetVariable
              id: setBoardStatus
              variable: Topic.varBoardStatus
              value: "completed"
            - kind: SendMessage
              id: boardDetailsCard
              message: |-
                Board Status: {Topic.varBoardStatus}
                Board URL: {Global.varBoardUrl}
                Layout: {Global.varLayoutType}
                Color Theme: {Global.varColorTheme}

                Element Limit: Miro boards perform best with fewer than 200 elements.
            - kind: Question
              id: askFollowUp
              interruptionPolicy:
                allowInterruption: true
              variable: init:Topic.varBoardAction
              prompt: "What would you like to do next?"
              entity:
                kind: EmbeddedEntity
                definition:
                  kind: ClosedListEntity
                  smartMatchingEnabled: true
                  items:
                    - id: open
                      displayName: Open the board in Miro
                    - id: new_board
                      displayName: Create a new board from different journey data
                    - id: change_template
                      displayName: Change template settings
            - kind: ConditionGroup
              id: handleFollowUp
              conditions:
                - id: isNewBoard
                  condition: =Topic.varBoardAction = "new_board"
                  actions:
                    - kind: BeginDialog
                      id: redirectToGeneration
                      dialog: Board Generation Request
                - id: isChangeTemplate
                  condition: =Topic.varBoardAction = "change_template"
                  actions:
                    - kind: BeginDialog
                      id: redirectToTemplate
                      dialog: Template Selection
              elseActions:
                - kind: SendMessage
                  id: openBoardMsg
                  message: "You can open the board directly using the URL shown above. The board is ready for collaboration in Miro."
      elseActions:
        - kind: SendMessage
          id: noBoardMsg
          message: |-
            I do not have a board URL from your current session. You can:

            -> Type "create board" to generate a new Miro board
            -> Provide a Miro board ID and I will look it up
        - kind: EndDialog
          id: endNoBoard

    - kind: EndDialog
      id: endBoardStatus
```

---

# PHASE 9: Publish and Deploy to Teams

This phase publishes the agent and deploys it to Microsoft Teams so users can interact with it.

## Step 9.1: Publish the Agent

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Overview

1. In Copilot Studio, click the Publish button at the top of the Overview page.

2. In the confirmation dialog, click Publish again.

3. Wait for the green "Published successfully" banner. This may take 1-2 minutes.

> **CRITICAL**: Event triggers and tool registrations only become fully active after publishing. Conversational features work in the test pane before publishing, but the full pipeline requires this step.

## Step 9.2: Deploy to Microsoft Teams

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Channels

1. After publishing, click the Channels tab in the top navigation.

2. Click the "Teams and Microsoft 365 Copilot" tile.

3. Click Add channel.

4. A panel opens. Click "See agent in Teams" -- this opens Microsoft Teams and prompts you to install the agent.

5. In Teams, click Add to install the agent in your chat.

6. To share with your team:
   - Click Availability options in the Copilot Studio channel panel, then Submit for admin approval.
   - Your Teams admin then goes to Teams Admin Center, finds your agent under Apps, and clicks Publish.

## Step 9.3: Configure Email Delivery (Optional)

WHERE AM I?: Power Automate > Flow Editor > Create Miro Journey Board

To send the board URL via email after creation, you can add an email action at the end of the Create Miro Journey Board flow (after the Respond to Copilot action -- actions after Respond can run asynchronously for up to 30 days):

1. Open the Create Miro Journey Board flow in Power Automate.

2. Below the Respond to Copilot action, click + and add Office 365 Outlook, then Send an email (V2).

3. Configure:
   - To: Click fx and paste: triggerBody()?['board_name'] (this does not contain an email -- you would need to add a userEmail input to the trigger, or use the signed-in user's email via a connector). For now, type your own email address as a test.
   - Subject: Type: Miro Board Created:  then click the lightning bolt and select the variable varJourneyTitle
   - Body: Toggle to HTML view (click the </> icon). Paste:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2 style="color: #0D0D0D;">MIRO BOARD CREATED</h2>
  <p>Your journey map has been converted into a visual Miro board.</p>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 4px 8px; font-weight: bold;">Board URL:</td>
        <td style="padding: 4px 8px;"><a href="BOARD_URL_HERE">Open in Miro</a></td></tr>
  </table>
  <p style="color: #999; font-size: 12px; margin-top: 24px;">
  NXT Humans | Miro Journey Board Creator</p>
</div>
```

Replace BOARD_URL_HERE with the lightning bolt dynamic content for varBoardUrl.

4. Click Save.

> **BEGINNER TIP**: Actions placed AFTER the "Respond to Copilot" action run asynchronously. This means the agent responds to the user immediately with the board URL, and the email sends in the background. The email may arrive a few seconds after the Teams message.

---

# PHASE 10: Testing (5+ Scenarios)

This phase walks you through specific test scenarios to verify every part of the agent works correctly.

## Step 10.1: Test 1 -- Miro API Connection Validation

WHERE AM I?: Copilot Studio > Agents > Miro Journey Board Creator > Test pane (bottom-right)

1. Open the test pane by clicking the Test your agent button in the bottom-right corner of Copilot Studio.

2. Click the refresh icon to start a new conversation.

3. Type: create board

4. Expected behavior:
   - The agent responds with the Board Generation Welcome message explaining the capability.
   - The agent checks Global.varJourneyHtml (which is empty) and asks how you want to provide journey data.
   - Select "Paste journey HTML or JSON directly".
   - Paste this sample journey JSON:

```json
{"stages":[{"name":"Awareness","touchpoints":["Website","Social Media"],"emotions":["Curious"],"pain_points":["Hard to find info"],"opportunities":["Better SEO"]},{"name":"Consideration","touchpoints":["Demo","Pricing Page"],"emotions":["Interested"],"pain_points":["Complex pricing"],"opportunities":["Simplify pricing"]}]}
```

   - The agent asks for a board name. Type: Test Board 1
   - The agent calls Test Miro Connection. If your token is valid, you see a confirmation message.
   - The agent calls Create Miro Journey Board. After processing, you see the result Adaptive Card with a Miro URL.

5. Verify: Click the Miro URL. The board should open in Miro with stage frames, sticky notes, and connectors.

> **VERIFY**: The board in Miro has: 1 title frame, 2 stage frames (Awareness and Consideration), yellow sticky notes for touchpoints, red sticky notes for pain points, green sticky notes for opportunities, pink sticky notes for emotions, and connector lines between stages.

## Step 10.2: Test 2 -- Invalid Miro Token

WHERE AM I?: Copilot Studio > Test pane

1. Temporarily change the Miro token in the Get_Miro_Token Compose action to an invalid value (e.g., "invalid_token_123").

2. Start a new conversation. Type: create board

3. Provide journey data and a board name.

4. Expected behavior: The Test Miro Connection flow returns connected = false and status = auth_failed. The agent displays the error message with instructions to generate a new token.

5. After testing, restore the correct Miro token in the Compose action.

## Step 10.3: Test 3 -- Template Selection

WHERE AM I?: Copilot Studio > Test pane

1. Start a new conversation.

2. Type: choose template

3. Expected behavior:
   - The agent shows the layout options overview.
   - Select "Vertical" when asked about layout.
   - Select "High Contrast" when asked about color theme.
   - The agent shows the Template Preview Card with Layout: vertical and Color Theme: high_contrast.
   - The agent confirms the selections.

4. Verify: Type "create board" and go through the board creation flow. The board should use the vertical layout and high contrast colors.

## Step 10.4: Test 4 -- Board Status Check

WHERE AM I?: Copilot Studio > Test pane

1. After creating a board in Test 1 or Test 3 (so Global.varBoardUrl has a value), type: check board status

2. Expected behavior:
   - The agent finds the board URL from the current session.
   - Displays the Board Details Card with the URL, status, layout, and color theme.
   - Asks what you want to do next.
   - Select "Create a new board from different journey data".
   - The agent redirects to the Board Generation Request topic.

## Step 10.5: Test 5 -- No Journey Data Available

WHERE AM I?: Copilot Studio > Test pane

1. Start a completely new conversation (click refresh).

2. Type: create board

3. When asked about journey data source, select "Go to Journey Mapper agent first".

4. Expected behavior: The agent displays a message telling you to run the Journey Mapper first, then ends the topic.

## Step 10.6: Test 6 -- Large Journey Map (Element Limit)

WHERE AM I?: Copilot Studio > Test pane

1. Start a new conversation. Type: create board

2. Paste a large journey JSON with 8 stages, each having 5 touchpoints, 3 pain points, 3 opportunities, and 3 emotions. This creates approximately: 8 frames + 8*(5+3+3+3) sticky notes + 7 connectors = 8 + 112 + 7 = 127 elements.

3. Expected behavior: The board creates successfully (under the 200-element limit). The agent returns the board URL.

4. Verify: Open the board in Miro and count the elements. They should be within the 200-element limit.

---

# PHASE 11: Troubleshooting Reference

| Symptom | Resolution |
|---|---|
| Agent does not respond to any query | Verify generative orchestration is enabled (Step 1.3). Confirm the agent is published (Step 9.1). Check that at least one knowledge source is connected with a green checkmark. |
| Agent says "I could not find information" | The knowledge source may not have crawled successfully. Check the Miro API Reference knowledge source status. Ensure the URL https://developers.miro.com/reference/api-reference is accessible. |
| Test Miro Connection returns auth_failed | Your Miro access token is expired or incorrect. Go to https://miro.com/app/settings/user-profile/apps and generate a new token. Update the nxth_MiroAccessToken environment variable and the Get_Miro_Token Compose action in both flows. |
| Test Miro Connection returns permission_error | Your Miro app is missing required scopes. Go to your Miro app settings and enable boards:read and boards:write scopes. You may need to regenerate the token after adding scopes. |
| Claude API returns 401 Unauthorized | Your Anthropic API key is invalid or expired. Check that the key starts with sk-ant- and has not been revoked. Update the nxth_AnthropicApiKey environment variable and the Get_Anthropic_Key Compose action. |
| Claude API returns 400 Bad Request | The JSON body sent to Claude is malformed. Check the Escape_System_Prompt and Escape_Journey_Html Compose actions for correct escape chain syntax. Verify the concat() expression in Build_Claude_Body has no missing quotes or brackets. |
| Miro board creates but has no elements | The Claude response may not have parsed correctly. Check the Parse_Journey_Phases action output in the flow run history. Verify the JSON schema matches the sample. If Claude returned markdown-wrapped JSON (with code fences), add a Compose action to strip the fences before parsing. |
| Sticky notes overlap on the board | The position calculations may have incorrect spacing. Verify Calculate_Phase_X uses mul(varPhaseIndex, 1000) and inner loops use iterationIndexes() for Y positioning. Increase spacing values if needed. |
| Flow times out (exceeds 100 seconds) | The journey map has too many phases or elements. Reduce the number of phases to 6 or fewer. Alternatively, set the Asynchronous Response toggle to On and respond to the agent before the loop completes. |
| Adaptive Card renders as plain text in Teams | Ensure you are using the Adaptive Card attachment in a Message node (not typing JSON as text). Verify the card JSON is valid by testing at https://adaptivecards.io/designer/ before pasting. Use version 1.5 (not 1.6) for Teams compatibility. |
| Global variables are empty in Board Status topic | Verify the variables were set to Global scope in the Board Generation Request topic. Open the topic, click the Variables icon {x}, find each variable, and confirm Usage shows "Global (any topic can access)". |
| Connectors not appearing between stages | The HTTP_Get_All_Frames action may be returning the title frame along with stage frames. Add a filter to exclude the title frame (check position.y to distinguish). Or verify the range() expression creates the correct number of iterations. |

---

# PHASE 12: Architecture Summary and Verification Checklist

## Architecture Summary

```
USER (Teams/Web Chat)
    |
    v
COPILOT STUDIO AGENT (GPT-5 Chat, Generative Orchestration)
    |
    +-- Topic: Board Generation Request
    |       |-- Node 1: Welcome message
    |       |-- Node 2: Check Global.varJourneyHtml
    |       |-- Node 3: Ask for journey data source
    |       |-- Node 4: Ask for board name
    |       |-- Node 5: ACTION -> Test Miro Connection flow
    |       |-- Node 6: Check connection result
    |       |-- Node 7: ACTION -> Create Miro Journey Board flow
    |       |-- Node 8: Display result Adaptive Card
    |
    +-- Topic: Template Selection
    |       |-- Node 1: Layout options overview
    |       |-- Node 2: Ask layout (Board Layouts entity)
    |       |-- Node 3: Ask color theme (Color Themes entity)
    |       |-- Node 4: Validate color compatibility
    |       |-- Node 5: Template preview Adaptive Card
    |       |-- Node 6: Confirmation message
    |
    +-- Topic: Board Status
    |       |-- Node 1: Status check message
    |       |-- Node 2: Check Global.varBoardUrl exists
    |       |-- Node 3: Set status variable
    |       |-- Node 4: Board details Adaptive Card
    |       |-- Node 5: Follow-up action question
    |       |-- Node 6: Redirect to other topics
    |
    +-- Flow: Test Miro Connection
    |       |-- GET https://api.miro.com/v2/boards?limit=1
    |       |-- Returns: connected (bool), status (string)
    |
    +-- Flow: Create Miro Journey Board
            |-- Phase 1: Claude Analysis
            |   |-- POST https://api.anthropic.com/v1/messages
            |   |-- Model: claude-sonnet-4-6
            |   |-- Returns: structured JSON with phases
            |
            |-- Phase 2: Miro Board Creation
                |-- POST /v2/boards (create board)
                |-- POST /v2/boards/{id}/frames (title + stage frames)
                |-- POST /v2/boards/{id}/sticky_notes (touchpoints: yellow)
                |-- POST /v2/boards/{id}/sticky_notes (pain points: red)
                |-- POST /v2/boards/{id}/sticky_notes (opportunities: light_green)
                |-- POST /v2/boards/{id}/sticky_notes (emotions: light_pink)
                |-- POST /v2/boards/{id}/connectors (between stages)
                |-- Returns: board_url, status
```

## Credit Consumption Estimate

| Action | Credits per Use | Estimated Uses per Board | Subtotal |
|---|---|---|---|
| Generative answer (topic routing) | 2 | 3 | 6 |
| Agent action (flow call) | 5 | 2 | 10 |
| Agent flow actions (per 100 actions) | 13 | 1-3 (depending on phases) | 13-39 |
| Premium AI tool (Claude API via HTTP) | 100 per 10 responses | 1 | 10 |
| Total per board creation | | | ~39-65 credits |

At $200/month for 25,000 credits, you can create approximately 385-640 boards per month.

## Post-Build Verification Checklist

| # | Item | Status |
|---|---|---|
| 1 | Agent name is "Miro Journey Board Creator" | [ ] |
| 2 | Generative orchestration is enabled (Yes) | [ ] |
| 3 | General knowledge is disabled (Off) | [ ] |
| 4 | Agent instructions contain [PERSONA], [CHAIN-OF-THOUGHT], [OUTPUT FORMAT], [CONSTRAINTS], [FEW-SHOT EXAMPLE] | [ ] |
| 5 | Knowledge source "Miro REST API v2 Reference" shows green checkmark | [ ] |
| 6 | Knowledge strictness set to High | [ ] |
| 7 | Board Layouts entity created with 3 items and Smart Matching enabled | [ ] |
| 8 | Color Themes entity created with 3 items and Smart Matching enabled | [ ] |
| 9 | Environment variable nxth_AnthropicApiKey exists with Secret type | [ ] |
| 10 | Environment variable nxth_MiroAccessToken exists with Secret type | [ ] |
| 11 | Conversation Start topic initializes Global.varJourneyHtml, Global.varLayoutType, Global.varColorTheme | [ ] |
| 12 | Board Generation Request topic has 8 nodes with correct flow Action nodes | [ ] |
| 13 | Template Selection topic has 6 nodes with Board Layouts and Color Themes entities | [ ] |
| 14 | Board Status topic has 6 nodes with redirects to other topics | [ ] |
| 15 | Test Miro Connection flow has Secure Inputs/Outputs on all sensitive actions | [ ] |
| 16 | Create Miro Journey Board flow has Secure Inputs/Outputs on all sensitive actions | [ ] |
| 17 | Both flows have Asynchronous Response toggle set to Off | [ ] |
| 18 | Both flows are registered as tools with clear descriptions | [ ] |
| 19 | Board Generation Request topic Action nodes have correct input/output variable mappings | [ ] |
| 20 | All Adaptive Cards use version 1.5 (Teams compatible) | [ ] |
| 21 | All HTTP actions have Timeout set to PT120S | [ ] |
| 22 | Agent is published (green "Published successfully" banner) | [ ] |
| 23 | Agent is deployed to Teams channel | [ ] |
| 24 | Test 1 (full board creation) passes with valid Miro board output | [ ] |
| 25 | Test 2 (invalid token) shows correct error message | [ ] |
| 26 | Test 3 (template selection) stores correct global variables | [ ] |

---

## Conclusion

This recipe produces a production-grade Miro Journey Board Creator agent without writing application code. The three most consequential design decisions are:

1. **Two-phase API architecture**: Claude analyzes journey HTML into structured JSON FIRST, then the Miro API creates board elements from that structure. This separation ensures the journey analysis is deterministic and the board creation is systematic -- Claude never directly calls Miro, and Miro never interprets unstructured HTML.

2. **Direct API calls via Power Automate HTTP actions**: Both the Anthropic Claude API and the Miro REST API v2 are called directly from Cloud Flows using HTTP actions with the 4-step escape chain for JSON body construction. No middleware, no custom connectors, no MCP servers. API keys are stored as environment variables with Secure Inputs/Outputs enabled on every action that touches them.

3. **Global variable architecture for cross-topic state**: Layout type, color theme, journey HTML, and board URL are stored as Global variables initialized in the Conversation Start system topic. This allows the Template Selection topic to set preferences that the Board Generation Request topic consumes, and the Board Status topic to display results from a previous creation -- all without requiring the user to re-enter information.

The 200-element Miro board limit and 100-second flow timeout are the primary scaling constraints. For journey maps with more than 8 stages, the recipe can be extended with a batch creation pattern that splits elements across multiple flow runs using the async response pattern (respond to agent first, then continue creating elements for up to 30 days). The connector creation step retrieves frame IDs after all phases are created, ensuring accurate linking regardless of API response timing.