

# Humans-in-Control Research Analyst -- Definitive Build Recipe for Copilot Studio

This recipe walks you through every click, field, toggle, and configuration needed to build the Humans-in-Control Research Analyst agent in Microsoft Copilot Studio. The agent orchestrates a five-stage research analysis pipeline -- Data Ingestion, Theme Discovery, Persona Extraction, Insight Synthesis, and Output Generation -- with mandatory human approval checkpoints at every stage. It calls the Google Gemini API directly from Power Automate flows using gemini-3-pro-preview for extended thinking analysis and gemini-3-pro-image-preview for persona portrait generation. All session state is stored in Dataverse for resumability. Written for absolute beginners in Copilot Studio -- no step is assumed.

---

## Architecture Diagram

```
+---------------------------+
|   Microsoft Teams         |
|   (User Interface)        |
+------------+--------------+
             |
             v
+---------------------------+
|   Copilot Studio Agent    |
|   "HiC Research Analyst"  |
|                           |
|  +---------------------+  |
|  | Generative           |  |
|  | Orchestrator (GPT-5) |  |
|  +---------------------+  |
|           |                |
|  +--------+--------+      |
|  |  5 Custom Topics |      |
|  |  - Research Setup|      |
|  |  - Checkpoint    |      |
|  |    Review        |      |
|  |  - Theme         |      |
|  |    Weighting     |      |
|  |  - Persona       |      |
|  |    Verification  |      |
|  |  - Output        |      |
|  |    Selection     |      |
|  +--------+--------+      |
|           |                |
|  +--------+--------+      |
|  | 6 Registered Tools|     |
|  | (Power Automate   |     |
|  |  Cloud Flows)     |     |
|  +--------+--------+      |
+-----------|---------------+
            |
   +--------+--------+--------+--------+--------+
   |        |        |        |        |        |
   v        v        v        v        v        v
+------+ +------+ +------+ +------+ +------+ +------+
|Ingest| |Theme | |Persona| |Insight| |Output| |Roll- |
|Docs  | |Disc. | |Extract| |Synth. | |Gen.  | |back  |
+--+---+ +--+---+ +--+---+ +--+---+ +--+---+ +--+---+
   |        |        |        |        |        |
   +--------+--------+--------+--------+        |
            |                                    |
            v                                    v
   +------------------+                +-----------------+
   | Gemini API       |                | Dataverse       |
   | (Direct HTTP)    |                | "Research       |
   |                  |                |  Sessions"      |
   | gemini-3-pro-    |                |                 |
   |  preview         |                | session_id      |
   | (thinking/text)  |                | status          |
   |                  |                | document_content|
   | gemini-3-pro-    |                | themes_json     |
   |  image-preview   |                | personas_json   |
   | (portraits)      |                | insights_json   |
   +------------------+                | report_url      |
            |                          +---------+-------+
            v                                    |
   +------------------+                          |
   | SharePoint       |<-------------------------+
   | "Research         |
   |  Projects Library"|
   |                   |
   | /Inputs/          |
   | /Themes/          |
   | /Personas/        |
   | /Insights/        |
   | /Reports/         |
   | /Portraits/       |
   +-------------------+

PIPELINE FLOW:
User -> Research Setup Topic -> Ingest Docs Flow -> Gemini API
  -> Checkpoint 1 (Adaptive Card: Approve/Add More/Cancel)
  -> [HUMAN APPROVES]
  -> Theme Discovery Flow -> Gemini API (thinkingBudget: 16384)
  -> Checkpoint 2 (Adaptive Card: Approve/Revise/Rollback)
  -> [HUMAN APPROVES]
  -> Theme Weighting Topic (adjust weights 0.1-3.0)
  -> [HUMAN CONFIRMS]
  -> Extract Personas Flow -> Gemini API
  -> Checkpoint 3 (Adaptive Card: Approve/Edit/Merge/Remove)
  -> [HUMAN APPROVES]
  -> Persona Verification Topic (verify distinctiveness)
  -> [HUMAN CONFIRMS]
  -> Synthesize Insights Flow -> Gemini API
  -> Checkpoint 4 (Adaptive Card: Approve/Reprioritize/Rollback)
  -> [HUMAN APPROVES]
  -> Output Selection Topic -> Generate Output Flow -> Gemini API
  -> Checkpoint 5 (Adaptive Card: Approve/Modify/Change Format)
  -> [HUMAN APPROVES]
  -> SharePoint upload + Email + Teams notification

ROLLBACK: At any checkpoint, user can roll back to any
prior checkpoint. Rollback flow clears Dataverse artifacts
after the target checkpoint and resets session status.
```

---

## Prerequisites -- What You Need Before Starting

Before you begin building, confirm you have the following:

1. A Microsoft 365 work or school account with a license that includes Copilot Studio (typically Microsoft 365 E3/E5 or a standalone Copilot Studio license). If you are not sure, ask your IT admin.

2. Access to Power Automate at https://make.powerautomate.com -- sign in and confirm you can see the home page.

3. Access to Power Apps maker portal at https://make.powerapps.com -- sign in and confirm you can see the home page.

4. A SharePoint site where you can create document libraries and folders. You need at least "Edit" permissions on this site. The recipe uses a site called "ResearchHub" at https://yourcompany.sharepoint.com/sites/ResearchHub. If your site has a different name, substitute your URL everywhere you see this one.

5. A Google Gemini API key. Get one from https://aistudio.google.com -> click "Get API key" -> "Create API key". The key starts with AIza... and is a single string. You need one key that works for both gemini-3-pro-preview (text/thinking) and gemini-3-pro-image-preview (image generation).

6. Microsoft Teams installed (desktop or web) for testing the agent.

7. Dataverse access in your Power Platform environment. Dataverse is included with Copilot Studio licenses. You will create a custom table to store research session state.

8. Familiarity with uploading files to SharePoint. You will upload research documents (PDF, DOCX, TXT) during testing.

---

## Component Summary Table

| # | Component | Type | Purpose |
|---|-----------|------|---------|
| 1 | Research Setup | Topic | Collects research question, documents, parameters; calls Ingest flow; presents Checkpoint 1 |
| 2 | Checkpoint Review | Topic | Universal handler for checkpoints 2-5; approve/revise/rollback decisions |
| 3 | Theme Weighting | Topic | Adjusts theme weights, merge/split/add/remove themes after Checkpoint 2 |
| 4 | Persona Verification | Topic | Reviews and modifies extracted personas after Checkpoint 3 |
| 5 | Output Selection | Topic | Selects output format, generates deliverable, presents Checkpoint 5 |
| 6 | Ingest Research Documents | Flow | Processes documents, creates Dataverse session, returns quality metrics |
| 7 | Run Theme Discovery | Flow | Thematic analysis via Gemini API with chunked processing |
| 8 | Extract Personas | Flow | Persona extraction guided by approved themes via Gemini API |
| 9 | Synthesize Insights | Flow | Cross-references themes and personas for actionable insights |
| 10 | Generate Research Output | Flow | Generates final deliverable with persona portraits |
| 11 | Rollback to Checkpoint | Flow | Rolls back Dataverse session to a prior checkpoint state |
| 12 | Research Projects Library | Knowledge | SharePoint library for research documents and deliverables |
| 13 | Research Sessions Table | Knowledge | Dataverse table for pipeline state management |
| 14 | nxth_GeminiApiKey | Env Variable | Google Gemini API key (Secret type) |
| 15 | hic_research_depth_levels.txt | Entity File | Closed list entity for analysis depth (Quick/Standard/Deep) |
| 16 | hic_research_output_formats.txt | Entity File | Closed list entity for output formats |

---

# PHASE 1: Create the Humans-in-Control Research Analyst Agent

This phase creates the agent shell, configures its identity, enables generative orchestration, writes the full agent instructions, and configures all system topics.

## Step 1.1: Prepare the SharePoint Folder Structure

WHERE AM I?: SharePoint > ResearchHub Site > Shared Documents

1. Open your browser and navigate to your SharePoint site (for example, https://yourcompany.sharepoint.com/sites/ResearchHub).

2. In the left navigation, click "Documents" (or "Shared Documents") to open the default document library.

3. Click "+ New" then click "Folder". Name it "Research Projects". Click "Create". This is the root folder for all research project files.

4. Inside "Research Projects", create the following subfolders by clicking "+ New" then "Folder" for each one:

5. First subfolder: Name it "Inputs". Click "Create". This is where uploaded research documents will be stored.

6. Second subfolder: Name it "Themes". Click "Create". This stores theme analysis artifacts.

7. Third subfolder: Name it "Personas". Click "Create". This stores persona extraction artifacts.

8. Fourth subfolder: Name it "Insights". Click "Create". This stores insight synthesis artifacts.

9. Fifth subfolder: Name it "Reports". Click "Create". This is where final research deliverables will be saved.

10. Sixth subfolder: Name it "Portraits". Click "Create". This stores AI-generated persona portrait images.

11. Copy and save the full URL of your SharePoint site (everything up to and including the site name, for example https://yourcompany.sharepoint.com/sites/ResearchHub). You will need this multiple times throughout the recipe.

> **VERIFY**: You should now see six subfolders inside Research Projects: Inputs, Themes, Personas, Insights, Reports, and Portraits.

## Step 1.2: Create the Dataverse Table for Research Sessions

WHERE AM I?: Power Apps > make.powerapps.com > Tables

1. Open a new browser tab and navigate to https://make.powerapps.com.

2. Sign in with your Microsoft 365 work or school account.

3. In the top-right corner, check the "Environment" dropdown. Make sure you are in the same environment where your Copilot Studio agent will live. If you are not sure, it is usually called "Default" or your organization's name.

4. In the left navigation, click "Tables".

5. Click "+ New table" at the top. A dialog opens.

6. In the "Display name" field, type: Research Sessions

7. In the "Plural display name" field, type: Research Sessions

8. The "Name" field auto-fills. Leave it as is.

9. Click "Save". The table is created and opens to the column editor.

10. You will see a default column called "Name" (which serves as the primary column). Click on "Name" to open its properties. Change the "Display name" to "session_id". Click "Save".

11. Now add the remaining columns. Click "+ New column" for each one:

12. Column 1: Display name = "status", Data type = "Single line of text", Maximum character count = 100. Click "Save".

13. Column 2: Display name = "research_question", Data type = "Multiple lines of text". Click "Save".

14. Column 3: Display name = "document_content", Data type = "Multiple lines of text", Maximum character count = 1048576 (the maximum). Click "Save".

15. Column 4: Display name = "themes_json", Data type = "Multiple lines of text", Maximum character count = 1048576. Click "Save".

16. Column 5: Display name = "personas_json", Data type = "Multiple lines of text", Maximum character count = 1048576. Click "Save".

17. Column 6: Display name = "insights_json", Data type = "Multiple lines of text", Maximum character count = 1048576. Click "Save".

18. Column 7: Display name = "report_url", Data type = "Single line of text", Maximum character count = 2000. Click "Save".

19. Column 8: Display name = "analysis_depth", Data type = "Single line of text", Maximum character count = 50. Click "Save".

20. Column 9: Display name = "analysis_lens", Data type = "Single line of text", Maximum character count = 100. Click "Save".

21. Column 10: Display name = "output_format", Data type = "Single line of text", Maximum character count = 50. Click "Save".

22. Column 11: Display name = "document_count", Data type = "Whole number". Click "Save".

23. Column 12: Display name = "total_word_count", Data type = "Whole number". Click "Save".

24. Column 13: Display name = "checkpoint_history", Data type = "Multiple lines of text", Maximum character count = 1048576. Click "Save".

> **VERIFY**: Your Research Sessions table should now have 14 columns: session_id (primary), status, research_question, document_content, themes_json, personas_json, insights_json, report_url, analysis_depth, analysis_lens, output_format, document_count, total_word_count, and checkpoint_history. Plus the system-created columns (Created On, Modified On, etc.).

> **BEGINNER TIP**: Dataverse is a database built into the Power Platform. Think of a "table" as a spreadsheet where each column is a field and each row is a record. The Research Sessions table stores the entire state of each research project so the agent can resume after interruptions.

## Step 1.3: Create the Power Platform Solution and Environment Variable

WHERE AM I?: Power Apps > make.powerapps.com > Solutions

1. In the left navigation of make.powerapps.com, click "Solutions".

2. Click "+ New solution".

3. Fill in the fields:
   - Display name: HiC Research Agent Solution
   - Publisher: Click the dropdown. If you see a publisher with prefix "nxth", select it. If not, click "+ New publisher", set Display name to "NXT Humans", set Prefix to "nxth", then click "Save".
   - Leave Version as 1.0.0.0.

4. Click "Create". The solution opens.

5. Now create the environment variable for the Gemini API key. Inside your solution, click "Add" (the button at the top) then click "More" then click "Environment variable".

6. Fill in the fields:
   - Display name: Gemini API Key
   - Name: This auto-fills as nxth_GeminiApiKey (based on your publisher prefix). That is correct.
   - Data type: Select "Secret"
   - Default value: Leave blank.

7. Click "Save".

8. After saving, click on the environment variable you just created to open it. Click "New value" (or "Add value" depending on your view). Paste your Google Gemini API key (the one starting with AIza...). Click "Save".

> **CRITICAL**: Environment variables of type "Secret" store values encrypted in Dataverse. This is more secure than plain text. However, you must still enable Secure Inputs and Secure Outputs on every Power Automate action that touches this key. Instructions for this are included in every flow phase below.

> **VERIFY**: You should see one environment variable named "Gemini API Key" with schema name nxth_GeminiApiKey in your solution.

## Step 1.4: Sign In to Copilot Studio and Create a Blank Agent

WHERE AM I?: Copilot Studio > https://copilotstudio.microsoft.com > Agents

1. Open a new browser tab and navigate to https://copilotstudio.microsoft.com.

2. Sign in with your Microsoft 365 work or school account.

3. You will land on the Copilot Studio home page. In the left navigation pane, click "Agents".

4. Click the "Create blank agent" button. (If you want to change advanced settings like the solution or schema name, click the small down arrow next to the button and select "Advanced create", then click "Confirm and create". For most users, just clicking the main button is fine.)

5. A new agent opens on the Overview page. This is your agent's home base -- it has sections for Details, Instructions, Knowledge, Tools, Suggested Prompts, and Channels.

> **VERIFY**: You should see a new agent with a default name on the Overview page.

## Step 1.5: Set the Agent Name, Description, and Icon

WHERE AM I?: Copilot Studio > Agent Overview > Details Section

1. On the Overview page, find the "Details" section (near the top). Click the "Edit" (pencil) icon.

2. In the "Name" field, delete the default name and type: Humans-in-Control Research Analyst

3. In the "Description" field (max 1,024 characters), paste the following:

```
Orchestrates a multi-checkpoint research analysis pipeline with human intervention gates. Uses Google Gemini API for extended thinking analysis, persona portrait generation, and structured output. Five stages: Data Ingestion, Theme Discovery, Persona Extraction, Insight Synthesis, Output Generation. Each stage requires explicit human approval before advancing. Session state stored in Dataverse for resumability.
```

4. To change the agent's icon: click the agent icon in the top-left area of the page, then click "Change icon", then upload a 192 x 192 pixel PNG image (max 72 KB). Use a professional icon that represents research or analysis -- a magnifying glass over a document, for example.

5. Click "Save" at the top of the page. Wait for the green "Saved successfully" banner.

## Step 1.6: Enable Generative Orchestration

WHERE AM I?: Copilot Studio > Agent Overview > Details > Orchestration

1. Still in the Details section of the Overview page, look for the "Orchestration" area.

2. Find the toggle labeled "Use generative AI to determine how best to respond to users and events".

3. Make sure this is set to "Yes" (toggled on). New agents usually default to this, but verify it.

4. What this does: Instead of requiring you to manually define exact trigger phrases for every possible user question, generative orchestration uses an AI planner (GPT-5 Chat) to dynamically decide which topics, tools, and knowledge sources to use for each request. This is essential for an agent that needs to handle varied research queries and checkpoint interactions.

> **BEGINNER TIP**: Generative orchestration means the agent reads the DESCRIPTIONS of your topics and tools to decide which one to use. This is why writing clear, specific descriptions is critical -- the AI planner uses them like a menu to pick the right action.

## Step 1.7: Write the Agent Instructions

WHERE AM I?: Copilot Studio > Agent Overview > Instructions Section

1. On the Overview page, find the "Instructions" section. Click "Edit".

2. You will see a large text field (max 8,000 characters). Delete any default text and paste the following:

```
[PERSONA]
You are the Humans-in-Control Research Analyst, a specialized agent that orchestrates structured research analysis while ensuring human oversight at every critical decision point. You embody the principle that AI should augment human researchers, not replace their judgment. You are rigorous, transparent, and deferential to the human researcher's expertise. You present your analysis clearly but always frame AI-generated findings as suggestions that require human validation. You explain your reasoning process in detail so the researcher can evaluate the quality of the analysis. You never proceed past a checkpoint without explicit human approval.

[CHAIN-OF-THOUGHT REASONING]
For every research request, follow this exact pipeline:
1. Research Setup: Collect the research question, source documents (PDF/DOCX/TXT, max 500,000 characters total), analysis depth (Quick/Standard/Deep), and analysis lens (General Ethnography, Whitespace Opportunity, Behavioral Psychology, Customer Journey). Create a Dataverse session.
2. Stage 1 - Data Ingestion: Process all input documents, extract text content, generate a data quality summary (document count, total word count, content coverage assessment). Present as Checkpoint 1 for researcher verification.
3. Stage 2 - Theme Discovery: Run thematic analysis to identify 5-30 recurring themes with evidence counts and confidence scores. Present as Checkpoint 2. Researcher can approve, merge, split, remove, add themes, or adjust weights (0.1-3.0).
4. Stage 3 - Persona Extraction: Extract 3-8 distinct user personas with behavioral patterns, motivations, friction points, and distinctiveness scores. Flag personas with >60% attribute similarity. Present as Checkpoint 3.
5. Stage 4 - Insight Synthesis: Cross-reference themes with personas to generate actionable insights ranked by evidence strength and business impact. Present as Checkpoint 4.
6. Stage 5 - Output Generation: Generate the final deliverable (structured report, executive summary, or presentation outline) with persona portraits. Present as Checkpoint 5 for final approval.
7. At any checkpoint, support rollback to a previous stage.

[OUTPUT FORMAT]
Each checkpoint presents findings as a structured Adaptive Card with:
- Numbered items with evidence counts and confidence scores
- Representative quotes from source documents
- Clear Approve/Revise/Rollback action buttons
- Pipeline progress indicator (stage N/5)
Final output adapts to the requested format. Always show reasoning for transparency.

[CONSTRAINTS]
- NEVER advance past a checkpoint without explicit human approval. If the user message is ambiguous, ask for explicit confirmation.
- Maintain full session state in Dataverse. Each checkpoint must be resumable after conversation interruption.
- Maximum input corpus: 500,000 characters across all documents.
- Theme discovery: 5-30 themes. Warn if fewer than 5 meaningful themes found.
- Persona extraction: 3-8 distinct personas. Flag >60% attribute similarity overlap.
- All findings must include evidence traceability: citation of specific source documents and passages.
- Use temperature 0.1 for all Gemini API calls for consistency.
- Use thinkingBudget 16384 tokens for all analysis calls.

[FEW-SHOT EXAMPLE]
User: "Start a new research project analyzing customer feedback from our Q4 survey data"
Expected behavior:
1. Ask for the primary research question
2. Ask for document uploads or SharePoint URLs
3. Ask for analysis depth and lens preferences
4. Call Ingest Research Documents flow
5. Present Checkpoint 1 Adaptive Card:
   - Documents processed: 3
   - Total word count: 45,230
   - Coverage assessment: Strong coverage of customer satisfaction, product quality, and support experience
   - Actions: [Approve] [Add More Documents] [Cancel]
6. Wait for explicit human approval before proceeding to Theme Discovery
```

3. Click "Save" at the top of the page.

> **VERIFY**: The instructions should be well under the 8,000-character limit. You can check the character count by selecting all text in the field and checking your browser's character count (or paste into a text editor that shows character count).

## Step 1.8: Disable General Knowledge

WHERE AM I?: Copilot Studio > Settings (gear icon) > Generative AI

1. Click the "Settings" gear icon at the very top of the Copilot Studio page (not the Details section -- the gear icon in the top navigation bar).

2. In the settings panel, click "Generative AI" in the left menu.

3. Find the toggle "Allow the AI to use its own general knowledge" and set it to "Off".

4. What this does: Forces the agent to answer exclusively from your SharePoint documents and Dataverse data. This prevents the agent from making up plausible-sounding research findings from its training data.

5. Under "How should your agent interact with knowledge sources", select "High strictness". This ensures the agent only answers from your documents and does not fill gaps with guesses.

6. Click "Save" and close the settings panel.

## Step 1.9: Configure System Topics

WHERE AM I?: Copilot Studio > Topics tab > System subtab

1. Click the "Topics" tab in the top navigation bar of Copilot Studio.

2. You will see two subtabs: "Custom" and "System". Click the "System" subtab.

3. You will see a list of system topics. Configure each one as follows:

**Conversation Start:**

4. Click "Conversation Start" to open the topic authoring canvas.

5. You will see a trigger node ("Conversation Start") connected to a Message node. Before the Message node, we need to add Set Variable nodes to initialize global variables. Click the "+" button between the trigger node and the Message node.

6. Select "Variable management" then "Set a variable value".

7. In the "Set variable" node that appears:
   - Click the box under "Set variable" then click "Create a new variable".
   - A new variable appears. Click the variable name to open the Variable properties panel on the right.
   - Under "Variable name", type: varResearchQuestion (do NOT type the Global. prefix -- it will be added automatically).
   - Under "Usage", select "Global (any topic can access)". The variable name automatically changes to Global.varResearchQuestion.
   - For the "To value" field, click the formula icon (fx), type `Text("")` and click "Done". This sets the variable to an empty string.

8. Click the "+" button below this Set Variable node to add another one. Select "Variable management" then "Set a variable value".

9. In this second Set Variable node:
   - Click the box under "Set variable" then click "Create a new variable".
   - Variable name: varSessionId
   - Under "Usage", select "Global (any topic can access)".
   - For the "To value" field, click the formula icon (fx), type `Text("")` and click "Done".

10. Click the "+" button below to add a third Set Variable node.

11. In this third Set Variable node:
    - Click the box under "Set variable" then click "Create a new variable".
    - Variable name: varPipelineStatus
    - Under "Usage", select "Global (any topic can access)".
    - For the "To value" field, type: idle (this is a literal string value, not a formula).

12. Click the "+" button below to add a fourth Set Variable node.

13. In this fourth Set Variable node:
    - Click the box under "Set variable" then click "Create a new variable".
    - Variable name: varAnalysisLens
    - Under "Usage", select "Global (any topic can access)".
    - For the "To value" field, type: General Ethnography

14. Now click the Message node (the one that was already there). Delete the default message text. Replace it with:

```
Welcome. I am the Humans-in-Control Research Analyst.

I orchestrate structured research analysis with human oversight at every critical decision point. Here is how the pipeline works:

Stage 1: Data Ingestion -- Upload documents and verify data quality
Stage 2: Theme Discovery -- Identify recurring themes and patterns
Stage 3: Persona Extraction -- Extract distinct user personas
Stage 4: Insight Synthesis -- Generate actionable insights
Stage 5: Output Generation -- Create your final deliverable

Every stage requires your explicit approval before advancing. You can revise findings or roll back to any previous stage at any time.

To begin, type "start new research" or "begin research analysis".
To review a checkpoint, type "review checkpoint".
To adjust theme weights, type "adjust theme weights".
To verify personas, type "verify personas".
To generate output, type "generate final report".
```

15. Click "Save" at the top.

**Fallback:**

16. Go back to Topics then System and click "Fallback".

17. Click the Message node and replace the text with:

```
I did not understand that request. I can help with:

- Starting a new research analysis project
- Reviewing checkpoint findings (approve, revise, or rollback)
- Adjusting theme weights and priorities
- Verifying extracted personas
- Generating final research deliverables

Please rephrase your question, or type "start new research" to begin a project.
```

18. Click "Save".

**On Error:**

19. Click "On Error" in the system topics list. Keep the default configuration -- it displays the error code, conversation ID, and timestamp, which you will need for troubleshooting.

**End of Conversation:**

20. Click "End of Conversation". Toggle the satisfaction survey to "On" so you can collect feedback on research quality. Click "Save".

## Step 1.10: Define Custom Entities

WHERE AM I?: Copilot Studio > Settings (gear icon) > Entities

1. Click the "Settings" gear icon at the top of the Copilot Studio page.

2. In the settings panel, click "Entities" in the left menu.

3. Click "+ Add an entity" then select "Closed list".

4. In the "Name" field, type: Research Depth Levels

5. Now add the list items. Click "+ Add item" for each one:

6. First item: Value = "Quick". Click the "+" next to it to add synonyms. Add these synonyms one at a time, pressing Enter after each: quick scan, fast analysis, overview, brief, rapid, surface level

7. Second item: Value = "Standard". Synonyms: standard analysis, normal, regular, moderate, balanced, default depth

8. Third item: Value = "Deep". Synonyms: deep dive, thorough, comprehensive, detailed, exhaustive, in-depth, deep analysis

9. Toggle "Smart matching" to "On". This enables fuzzy matching for misspellings and abbreviations.

10. Click "Save".

11. Now create the second entity. Click "+ Add an entity" then "Closed list".

12. Name: Research Output Formats

13. First item: Value = "Structured Report". Synonyms: full report, detailed report, comprehensive report, research report, complete report

14. Second item: Value = "Executive Summary". Synonyms: exec summary, summary, brief summary, overview report, condensed report, two-page summary

15. Third item: Value = "Presentation Outline". Synonyms: presentation, slide deck, slides, deck outline, powerpoint outline, talk outline

16. Toggle "Smart matching" to "On".

17. Click "Save".

18. Create a third entity. Click "+ Add an entity" then "Closed list".

19. Name: Analysis Lens

20. First item: Value = "General Ethnography". Synonyms: ethnographic, general analysis, broad analysis, ethnography

21. Second item: Value = "Whitespace Opportunity". Synonyms: whitespace, opportunity analysis, gap analysis, market gaps, unmet needs

22. Third item: Value = "Behavioral Psychology". Synonyms: behavioral, psychology, behavior analysis, cognitive, decision making, behavioral patterns

23. Fourth item: Value = "Customer Journey". Synonyms: journey mapping, customer experience, CX analysis, touchpoint analysis, journey analysis

24. Toggle "Smart matching" to "On".

25. Click "Save" and close the settings panel.

> **CRITICAL**: Defining entities BEFORE building topics enables slot filling. If a user says "Start a deep dive research project with a customer journey lens", the agent can automatically extract "Deep" for depth and "Customer Journey" for lens from that single utterance, skipping follow-up questions.

---

# PHASE 2: Add Knowledge Sources (2 Sources)

Knowledge sources give the agent access to your research documents and session data. We add them now so the agent can reference them during conversations.

## Step 2.1: Add the SharePoint Research Projects Library

WHERE AM I?: Copilot Studio > Agent Overview > Knowledge Section

1. Navigate back to the Overview page of your agent (click the agent name in the breadcrumb at the top).

2. Find the "Knowledge" section and click "Add knowledge".

3. A panel opens showing knowledge source options. Under "Featured", click "SharePoint".

4. In the SharePoint URL field, paste the URL of your SharePoint site. For example: https://yourcompany.sharepoint.com/sites/ResearchHub

5. Press Enter or click the "+" button. The URL appears as a tag below the field.

6. Below the URLs, you will see two fields:
   - Name: Type: Research Projects Library
   - Description: This is critical for retrieval quality. Paste the following:

```
SharePoint library containing research project inputs, intermediate analysis artifacts, and final deliverables. Organized by project with subfolders for Inputs (source documents: PDF, DOCX, TXT), Themes (theme analysis JSON artifacts), Personas (persona extraction JSON artifacts and portrait images), Insights (insight synthesis JSON artifacts), and Reports (final deliverables in DOCX and PDF formats). Contains customer feedback surveys, market research reports, competitive intelligence documents, user interview transcripts, and ethnographic field notes. Date range: 2023-2026.
```

7. Click "Add to agent".

8. You will see the knowledge source appear in the Knowledge section with a green checkmark. If you see a yellow warning, click it to read the issue (usually a permissions problem).

> **VERIFY**: The Research Projects Library knowledge source should show a green checkmark in the Knowledge section.

## Step 2.2: Add the Dataverse Research Sessions Table

WHERE AM I?: Copilot Studio > Agent Overview > Knowledge Section

1. Still in the Knowledge section, click "Add knowledge" again.

2. In the panel, look for "Dataverse" and click it.

3. You will see a list of Dataverse tables in your environment. Search for "Research Sessions" and select it.

4. Configure the knowledge source:
   - Name: Type: Research Sessions Table
   - Description: Paste the following:

```
Dataverse table storing research session state for the Humans-in-Control pipeline. Each row represents one research project with fields: session_id (unique identifier), status (ingesting, checkpoint_1_pending, checkpoint_1_approved, checkpoint_2_pending, checkpoint_2_approved, checkpoint_3_pending, checkpoint_3_approved, checkpoint_4_pending, checkpoint_4_approved, checkpoint_5_pending, completed), research_question, document_content (extracted text from all source documents), themes_json (discovered themes with weights and evidence), personas_json (extracted personas with behavioral attributes), insights_json (synthesized insights with rankings), report_url (SharePoint URL to final deliverable), analysis_depth, analysis_lens, output_format, document_count, total_word_count, and checkpoint_history (audit trail of all checkpoint decisions).
```

5. Click "Add to agent".

> **VERIFY**: You should now see two knowledge sources in the Knowledge section: Research Projects Library (SharePoint) and Research Sessions Table (Dataverse), both with green checkmarks.

---

# PHASE 3: Research Setup -- TOPIC BUILD (Node-by-Node: 8 Nodes)

This topic is the entry point for every new research project. It collects the research question, source documents, analysis parameters, calls the ingestion flow, validates data quality, and presents Checkpoint 1 for human approval.

## Step 3.1: Create the Research Setup Topic

WHERE AM I?: Copilot Studio > Topics tab > Custom subtab

1. Click the "Topics" tab in the top navigation bar of Copilot Studio.

2. Click the "Custom" subtab.

3. Click "+ Add a topic" then "From blank".

4. At the top of the canvas, click the topic name (it says "Untitled") and rename it to: Research Setup

5. Click the "Description" field below the name. Type: User wants to start a new research analysis project or configure analysis parameters. Route here when the user mentions starting research, uploading documents for analysis, setting up a new project, defining a research question, or configuring analysis parameters like theme count or depth preference. Does NOT handle checkpoint reviews, theme weighting, persona verification, or output generation.

## Step 3.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Topics > Research Setup > Trigger Node

1. In the Trigger node at the top of the canvas, you will see a section labeled "Describe what this topic does" (or "Add trigger phrases" depending on your view).

2. Click the description/trigger area and add these trigger phrases (press Enter after each one):

   - start new research
   - begin research analysis
   - configure analysis
   - upload documents for research
   - set up research project
   - start a research project
   - new research analysis
   - I want to analyze documents
   - initiate research pipeline
   - create new research session

## Step 3.3: Node 1 -- Message -- "Research Pipeline Introduction"

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas

1. Click the "+" button below the Trigger node to add a new node.

2. In the node menu that appears, click "Send a message".

3. In the message text field, type the following:

```
Welcome to the Humans-in-Control Research Pipeline.

This analysis follows five stages, each requiring your explicit approval:

1. Data Ingestion -- I will process your documents and assess data quality
2. Theme Discovery -- I will identify recurring themes and patterns
3. Persona Extraction -- I will extract distinct user personas
4. Insight Synthesis -- I will generate actionable insights
5. Output Generation -- I will create your final deliverable

You maintain full control at every checkpoint. You can approve findings, request revisions, or roll back to any previous stage.

Let us begin by defining your research question.
```

4. Click the node name at the top of the node (it may say "Message") and rename it to: Research Pipeline Introduction

## Step 3.4: Node 2 -- Question -- "Define Research Question"

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas (below Node 1)

1. Click the "+" button below the Message node to add a new node.

2. In the node menu, click "Ask a question".

3. In the question text field, type: What is your primary research question or objective? This will frame the entire analysis pipeline and guide the analytical focus across all five stages.

4. Under "Identify", click the dropdown and select "User's entire response". This maps to the entity StringPrebuiltEntity.

5. The question node creates an output variable. Click the variable name (it may say "Var1" or similar) to open the Variable properties panel on the right.

6. Under "Variable name", type: varResearchQuestion (without the Global. prefix).

7. Under "Usage", select "Global (any topic can access)". The variable name automatically changes to Global.varResearchQuestion.

8. Rename the node to: Define Research Question

> **BEGINNER TIP**: A "Question" node pauses the conversation and waits for the user to type a response. The response is stored in the variable you configure. By making it Global, other topics can access this research question later in the pipeline.

## Step 3.5: Node 3 -- Question -- "Upload Source Documents"

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas (below Node 2)

1. Click the "+" button below the Question node to add a new node.

2. Click "Ask a question".

3. In the question text field, type: Please upload your research documents (PDF, DOCX, or TXT files) or provide SharePoint URLs to existing documents. You can upload multiple files. The maximum corpus size is 500,000 characters across all documents combined. Type "done" when you have finished uploading.

4. Under "Identify", click the dropdown and select "User's entire response".

5. Click the variable name to open the Variable properties panel. Under "Variable name", type: varDocumentUrls. Leave the scope as "Topic" (do not make this global -- document URLs are only needed during setup).

6. Rename the node to: Upload Source Documents

> **WATCH OUT**: Copilot Studio in Teams can receive file uploads, but the file content is not directly accessible as text in the topic variable. The variable will contain the user's text message (such as "done" or a SharePoint URL). The actual file processing happens in the Power Automate flow, which retrieves files from SharePoint. For this reason, instruct users to upload files to the SharePoint Inputs folder and provide the folder URL, or to paste SharePoint file URLs directly.

## Step 3.6: Node 4 -- Question -- "Configure Analysis Depth"

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas (below Node 3)

1. Click the "+" button below the previous Question node.

2. Click "Ask a question".

3. In the question text field, type: What analysis depth would you like? Choose from: Quick (surface-level scan, fastest), Standard (balanced depth and speed), or Deep (comprehensive deep dive, most thorough).

4. Under "Identify", click the dropdown. Scroll down to find your custom entity "Research Depth Levels" and select it.

5. Click the variable name. Under "Variable name", type: varAnalysisDepth. Leave scope as "Topic".

6. Rename the node to: Configure Analysis Depth

## Step 3.7: Node 4b -- Question -- "Configure Analysis Lens"

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas (below Node 4)

1. Click the "+" button below the previous Question node.

2. Click "Ask a question".

3. In the question text field, type: Which analytical lens should I apply? Choose from: General Ethnography (broad cultural and behavioral analysis), Whitespace Opportunity (identify unmet needs and market gaps), Behavioral Psychology (cognitive patterns and decision-making drivers), or Customer Journey (touchpoint analysis and experience mapping).

4. Under "Identify", click the dropdown. Find your custom entity "Analysis Lens" and select it.

5. Click the variable name. Under "Variable name", type: varAnalysisLens. 

6. Click the variable name to open the Variable properties panel. Under "Usage", select "Global (any topic can access)". The variable name changes to Global.varAnalysisLens.

7. Rename the node to: Configure Analysis Lens

## Step 3.8: Node 5 -- Action -- "Create Research Session"

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas (below Node 4b)

1. Click the "+" button below the previous Question node.

2. In the node menu, click "Add a tool".

3. You will see a list of available tools. Look for "Ingest Research Documents" in the list. If you have not built the flow yet (which you have not at this point), you will add this Action node later after building the flow in Phase 4. For now, add a placeholder:

4. Instead of "Add a tool", click "Send a message" and type:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the "Ingest Research Documents" flow after building it in Phase 4. Map these inputs: research_query = Global.varResearchQuestion, document_urls = Topic.varDocumentUrls, analysis_depth = Topic.varAnalysisDepth, analysis_lens = Global.varAnalysisLens. Capture these outputs: session_id -> Global.varSessionId, quality_summary -> Topic.varQualitySummary, status -> Global.varPipelineStatus.
```

5. Rename the node to: Create Research Session (Placeholder)

> **WATCH OUT**: You will come back to this node after building the Ingest Research Documents flow in Phase 4 and registering it as a tool in Phase 5. At that point, you will delete this placeholder Message node and replace it with an actual Action node.

## Step 3.9: Node 6 -- Condition -- "Validate Data Quality"

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas (below Node 5)

1. Click the "+" button below the placeholder node.

2. In the node menu, click "Add a condition".

3. A Condition node appears with a "Condition" branch and an "All other conditions" (else) branch.

4. Click the condition field. Select the variable Global.varPipelineStatus from the variable picker.

5. Set the operator to "is equal to".

6. Set the value to: checkpoint_1_pending

7. In the "Condition" (true) branch, click "+" and add a "Send a message" node with this text:

```
Data ingestion complete. Your documents have been processed successfully. Let me present the quality summary for your review.
```

8. In the "All other conditions" (else) branch, click "+" and add a "Send a message" node with this text:

```
There was an issue processing your documents. The data quality check did not pass. Please verify that your documents contain at least 500 words of relevant content and try again. You can upload additional documents or provide different SharePoint URLs.
```

9. After the else branch message, add an "End current topic" node by clicking "+" then "Topic management" then "End current topic". This stops the conversation if data quality fails.

10. Rename the Condition node to: Validate Data Quality

## Step 3.10: Node 7 -- Adaptive Card -- "Checkpoint 1 - Data Quality Review"

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas (below the true branch of Node 6)

1. In the true branch of the Condition node (after the success message), click the "+" button.

2. In the node menu, click "Ask with Adaptive Card".

3. An Adaptive Card node appears. Click the three dots (...) at the top-right of the node, then select "Properties".

4. Click "Edit adaptive card". The built-in Adaptive Card Designer opens.

5. Click the "Card payload editor" tab (or switch to JSON view). Delete any default content and paste this exact JSON:

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
          "text": "CHECKPOINT 1: DATA QUALITY REVIEW",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Pipeline Stage 1 of 5 -- Data Ingestion",
          "size": "Small",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Your documents have been processed. Review the quality summary below before proceeding to Theme Discovery.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Documents Processed",
          "value": "Pending flow output"
        },
        {
          "title": "Total Word Count",
          "value": "Pending flow output"
        },
        {
          "title": "Coverage Assessment",
          "value": "Pending flow output"
        },
        {
          "title": "Research Question",
          "value": "Pending flow output"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "DECISION REQUIRED",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Choose an action to proceed:",
      "wrap": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "checkpoint1Decision",
      "label": "Your Decision",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Approve -- Proceed to Theme Discovery",
          "value": "approve"
        },
        {
          "title": "Add More Documents -- Upload additional files",
          "value": "add_more"
        },
        {
          "title": "Cancel Project -- Discard this session",
          "value": "cancel"
        }
      ]
    },
    {
      "type": "Input.Text",
      "id": "checkpoint1Notes",
      "placeholder": "Optional: Add notes about the data quality or specific areas to focus on...",
      "isMultiline": true,
      "label": "Notes (Optional)"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "SUBMIT DECISION",
      "data": {
        "cardId": "checkpoint1"
      }
    }
  ]
}
```

6. Click "Save" in the card editor to close it.

7. The Adaptive Card node now shows output variables. You should see two output variables created from the card's input fields: checkpoint1Decision and checkpoint1Notes. Click on "checkpoint1Decision" to open the Variable properties panel.

8. Under "Variable name", verify it says: checkpoint1Decision. Leave the scope as "Topic" (this decision is only needed within this topic).

9. Rename the Adaptive Card node to: Checkpoint 1 - Data Quality Review

> **BEGINNER TIP**: The "id" fields in the Adaptive Card JSON (checkpoint1Decision and checkpoint1Notes) automatically become output variables in Copilot Studio. When the user clicks "SUBMIT DECISION", the values they selected/typed are captured in these variables.

> **WATCH OUT**: After you build the Ingest Research Documents flow and connect it as an Action node, you will want to update the FactSet values in this card to use dynamic content from the flow's output. You can do this by switching to Formula mode in the card editor and inserting variable references. For now, the static "Pending flow output" text serves as a placeholder.

## Step 3.11: Node 8 -- Condition -- "Route Checkpoint 1 Decision"

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas (below Node 7)

1. Click the "+" button below the Adaptive Card node.

2. Click "Add a condition".

3. A Condition node appears. Click the condition field and select the variable Topic.checkpoint1Decision.

4. Set the operator to "is equal to".

5. Set the value to: approve

6. In the true branch (approve), click "+" and add a "Variable management" then "Set a variable value" node:
   - Set variable: Select Global.varPipelineStatus
   - To value: Type: checkpoint_1_approved

7. Below that Set Variable node, click "+" and add a "Send a message" node with this text:

```
Checkpoint 1 approved. Data quality verified. Advancing to Stage 2: Theme Discovery. I will now analyze your documents for recurring themes and patterns. This may take a moment.
```

8. In the "All other conditions" (else) branch, add another Condition node to check for "add_more":
   - Click "+" then "Add a condition"
   - Variable: Topic.checkpoint1Decision
   - Operator: is equal to
   - Value: add_more

9. In the true branch of this nested condition (add_more), add a "Send a message" node:

```
No problem. Please upload additional documents to the Research Projects/Inputs folder in SharePoint, then type "ready" when you are done. I will re-process all documents and present an updated quality summary.
```

10. In the else branch of the nested condition (which handles "cancel"), add a "Send a message" node:

```
Research project cancelled. The session has been discarded. Type "start new research" whenever you are ready to begin a new project.
```

11. After the cancel message, add "Topic management" then "End current topic".

12. Rename the outer Condition node to: Route Checkpoint 1 Decision

13. Click "Save" at the top of the canvas.

## Step 3.12: Complete YAML for Research Setup Topic

Below is the complete YAML representation of the Research Setup topic. You can paste this into the code editor as an alternative to building the topic visually.

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Research Setup
    triggerQueries:
      - start new research
      - begin research analysis
      - configure analysis
      - upload documents for research
      - set up research project
      - start a research project
      - new research analysis
      - I want to analyze documents
      - initiate research pipeline
      - create new research session
  actions:
    - kind: SendMessage
      id: researchPipelineIntro
      message: |-
        Welcome to the Humans-in-Control Research Pipeline.

        This analysis follows five stages, each requiring your explicit approval:

        1. Data Ingestion -- I will process your documents and assess data quality
        2. Theme Discovery -- I will identify recurring themes and patterns
        3. Persona Extraction -- I will extract distinct user personas
        4. Insight Synthesis -- I will generate actionable insights
        5. Output Generation -- I will create your final deliverable

        You maintain full control at every checkpoint. You can approve findings, request revisions, or roll back to any previous stage.

        Let us begin by defining your research question.

    - kind: Question
      id: defineResearchQuestion
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.varResearchQuestion
      prompt: "What is your primary research question or objective? This will frame the entire analysis pipeline and guide the analytical focus across all five stages."
      entity: StringPrebuiltEntity

    - kind: Question
      id: uploadSourceDocuments
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varDocumentUrls
      prompt: "Please upload your research documents (PDF, DOCX, or TXT files) or provide SharePoint URLs to existing documents. You can upload multiple files. The maximum corpus size is 500,000 characters across all documents combined. Type done when you have finished uploading."
      entity: StringPrebuiltEntity

    - kind: Question
      id: configureAnalysisDepth
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varAnalysisDepth
      prompt: "What analysis depth would you like? Choose from: Quick (surface-level scan, fastest), Standard (balanced depth and speed), or Deep (comprehensive deep dive, most thorough)."
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: quick
              displayName: Quick
            - id: standard
              displayName: Standard
            - id: deep
              displayName: Deep

    - kind: Question
      id: configureAnalysisLens
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.varAnalysisLens
      prompt: "Which analytical lens should I apply? Choose from: General Ethnography (broad cultural and behavioral analysis), Whitespace Opportunity (identify unmet needs and market gaps), Behavioral Psychology (cognitive patterns and decision-making drivers), or Customer Journey (touchpoint analysis and experience mapping)."
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: general_ethnography
              displayName: General Ethnography
            - id: whitespace_opportunity
              displayName: Whitespace Opportunity
            - id: behavioral_psychology
              displayName: Behavioral Psychology
            - id: customer_journey
              displayName: Customer Journey

    - kind: SendMessage
      id: callFlowPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Ingest Research Documents flow. Map inputs: research_query = Global.varResearchQuestion, document_urls = Topic.varDocumentUrls, analysis_depth = Topic.varAnalysisDepth, analysis_lens = Global.varAnalysisLens. Capture outputs: session_id -> Global.varSessionId, quality_summary -> Topic.varQualitySummary, status -> Global.varPipelineStatus."

    - kind: ConditionGroup
      id: validateDataQuality
      conditions:
        - id: qualityPassed
          condition: =Global.varPipelineStatus = "checkpoint_1_pending"
          actions:
            - kind: SendMessage
              id: qualityPassedMsg
              message: "Data ingestion complete. Your documents have been processed successfully. Let me present the quality summary for your review."
      elseActions:
        - kind: SendMessage
          id: qualityFailedMsg
          message: "There was an issue processing your documents. The data quality check did not pass. Please verify that your documents contain at least 500 words of relevant content and try again."
        - kind: EndDialog
          id: endOnFailure

    - kind: SendMessage
      id: checkpoint1CardPlaceholder
      message: "[ADAPTIVE CARD PLACEHOLDER] Replace this node with an Ask with Adaptive Card node using the Checkpoint 1 JSON from Step 3.10. The card collects checkpoint1Decision (approve/add_more/cancel) and checkpoint1Notes."

    - kind: ConditionGroup
      id: routeCheckpoint1
      conditions:
        - id: isApproved
          condition: =Topic.checkpoint1Decision = "approve"
          actions:
            - kind: SetVariable
              id: setPipelineApproved
              variable: Global.varPipelineStatus
              value: "checkpoint_1_approved"
            - kind: SendMessage
              id: approvedMsg
              message: "Checkpoint 1 approved. Data quality verified. Advancing to Stage 2: Theme Discovery. I will now analyze your documents for recurring themes and patterns. This may take a moment."
        - id: isAddMore
          condition: =Topic.checkpoint1Decision = "add_more"
          actions:
            - kind: SendMessage
              id: addMoreMsg
              message: "No problem. Please upload additional documents to the Research Projects/Inputs folder in SharePoint, then type ready when you are done. I will re-process all documents and present an updated quality summary."
      elseActions:
        - kind: SendMessage
          id: cancelMsg
          message: "Research project cancelled. The session has been discarded. Type start new research whenever you are ready to begin a new project."
        - kind: EndDialog
          id: endOnCancel
```

> **WATCH OUT**: The YAML above contains placeholder SendMessage nodes where Action nodes and Adaptive Card nodes should go. After building the Ingest Research Documents flow in Phase 4, return to this topic and replace the placeholders with actual Action and Adaptive Card nodes using the visual editor.

---

# PHASE 4: Ingest Research Documents -- FLOW BUILD (Action-by-Action)

This flow processes uploaded research documents, extracts text content, computes quality metrics using the Gemini API, and creates a new research session in Dataverse. It returns the session ID and quality summary for Checkpoint 1.

## Step 4.1: Create the Flow

WHERE AM I?: Power Automate > make.powerautomate.com > Solutions > HiC Research Agent Solution

1. Open a new browser tab and navigate to https://make.powerautomate.com.

2. In the left navigation, click "Solutions" then open "HiC Research Agent Solution" (the one you created in Step 1.3).

3. Click "+ New" then "Automation" then "Cloud flow" then "Instant".

4. In the "Build an instant cloud flow" dialog:
   - Flow name: Ingest Research Documents
   - Choose how to trigger this flow: Scroll down and select "Run a flow from Copilot" (this is the Copilot Studio trigger). If you do not see this option, select "Manually trigger a flow" -- we will change it.

5. Click "Create". The flow editor opens.

## Step 4.2: Configure the Trigger with Input Parameters

WHERE AM I?: Power Automate > Flow Editor > Trigger Node

1. If the trigger shows as "Run a flow from Copilot", click on it to expand it. If it shows a different trigger, delete it and add the correct one: click "+" then search for "Run a flow from Copilot" then select it.

2. Click "+ Add an input" inside the trigger. You need to add four text inputs:

3. Input 1: Click "+ Add an input" then select "Text".
   - Input name (the label): research_query
   - Description: The primary research question or objective that frames the analysis

4. Input 2: Click "+ Add an input" then select "Text".
   - Input name: document_urls
   - Description: SharePoint URLs or file references for the research documents to process

5. Input 3: Click "+ Add an input" then select "Text".
   - Input name: analysis_depth
   - Description: Analysis depth preference: Quick, Standard, or Deep

6. Input 4: Click "+ Add an input" then select "Text".
   - Input name: analysis_lens
   - Description: Analytical lens: General Ethnography, Whitespace Opportunity, Behavioral Psychology, or Customer Journey

## Step 4.3: Action 1 -- Initialize Variable for Session ID

WHERE AM I?: Power Automate > Flow Editor > Below Trigger

1. Below the trigger, click "+" then "Add an action".

2. Search for "Initialize variable" then select "Initialize variable" (under "Variable" actions).

3. Fill in:
   - Name: varSessionId
   - Type: String
   - Value: Click the "Expression" tab (the fx button) and paste: `guid()` then click "OK". This generates a unique identifier for the session.

4. Click the three dots (...) on this action then "Rename" then type: Initialize_Session_ID

## Step 4.4: Action 2 -- Initialize Variable for Document Content

WHERE AM I?: Power Automate > Flow Editor > Below Action 1

1. Click "+" then "Add an action" then search for "Initialize variable" then select it.

2. Fill in:
   - Name: varDocumentContent
   - Type: String
   - Value: (leave empty)

3. Rename to: Initialize_Document_Content

## Step 4.5: Action 3 -- Initialize Variable for Word Count

WHERE AM I?: Power Automate > Flow Editor > Below Action 2

1. Click "+" then "Add an action" then "Initialize variable".

2. Fill in:
   - Name: varWordCount
   - Type: Integer
   - Value: 0

3. Rename to: Initialize_Word_Count

## Step 4.6: Action 4 -- Initialize Variable for Document Count

WHERE AM I?: Power Automate > Flow Editor > Below Action 3

1. Click "+" then "Add an action" then "Initialize variable".

2. Fill in:
   - Name: varDocumentCount
   - Type: Integer
   - Value: 0

3. Rename to: Initialize_Document_Count

## Step 4.7: Action 5 -- Get the Gemini API Key

WHERE AM I?: Power Automate > Flow Editor > Below Action 4

1. Click "+" then "Add an action".

2. Search for "Environment variable" then select "Get environment variable value" (under the "Power Platform" connector). If you do not see this connector, search for "Compose" instead and follow the alternative approach below.

**Primary approach (Power Platform connector):**

3. In the "Environment Variable Name" field, type or select: nxth_GeminiApiKey

4. Rename this action to: Get_Gemini_Key

5. Immediately secure this action: Click the three dots (...) on the action then "Settings" then scroll down to "Security" then toggle "Secure Inputs" to On then toggle "Secure Outputs" to On then click "Done".

**Alternative approach (if Power Platform connector is not available):**

3. Search for "Compose" then select "Compose" (under "Data Operations").

4. In the Inputs field, paste your Gemini API key (the literal key string starting with AIza...).

5. Immediately secure this action: Click the three dots (...) then "Settings" then scroll down to "Security" then toggle "Secure Inputs" to On then toggle "Secure Outputs" to On then click "Done".

6. Rename to: Get_Gemini_Key

> **CRITICAL**: You MUST enable Secure Inputs and Secure Outputs on this action. Without this, your API key will be visible in plain text in the flow run history, which anyone with access to the flow can read.

## Step 4.8: Action 6 -- Get Files from SharePoint Folder

WHERE AM I?: Power Automate > Flow Editor > Below Action 5

1. Click "+" then "Add an action".

2. Search for "Get files (properties only)" then select the SharePoint version.

3. Configure:
   - Site Address: Select your SharePoint site from the dropdown (or paste https://yourcompany.sharepoint.com/sites/ResearchHub).
   - Library Name: Select "Shared Documents" (or whatever your document library is named).
   - Folder: Type or navigate to: /Research Projects/Inputs

4. Rename to: Get_Input_Files

## Step 4.9: Action 7 -- Apply to Each File

WHERE AM I?: Power Automate > Flow Editor > Below Action 6

1. Click "+" then "Add an action".

2. Search for "Apply to each" then select "Apply to each" (under "Control").

3. In the "Select an output from previous steps" field, click the lightning bolt (dynamic content) icon and select "value" from the Get_Input_Files action. This is the array of files found in the Inputs folder.

4. Inside the "Apply to each" loop, click "Add an action".

5. Search for "Get file content" then select the SharePoint version.

6. Configure:
   - Site Address: Same SharePoint site.
   - File Identifier: Click the lightning bolt icon and select "Id" from the Get_Input_Files action (this appears under the "Apply to each" dynamic content section).

7. Rename to: Get_File_Content

8. Inside the loop, click "+" then "Add an action". Search for "Compose" then select it.

9. In the Inputs field, click the lightning bolt icon and select "File Content" from the Get_File_Content action. This captures the raw file content.

10. Rename to: Extract_Text_Content

> **BEGINNER TIP**: The "Apply to each" loop processes every file in the Inputs folder one at a time. For each file, it gets the content and extracts the text. In a production scenario, you would add PDF-to-text conversion here. For this recipe, we assume text-based files (TXT, DOCX) that SharePoint can read directly.

11. Inside the loop, click "+" then "Add an action". Search for "Append to string variable" then select it.

12. Configure:
    - Name: Select varDocumentContent from the dropdown.
    - Value: Click the lightning bolt icon and select "Outputs" from the Extract_Text_Content action. Then type a separator after it: `--- END OF DOCUMENT ---` (type this literally after the dynamic content reference).

13. Rename to: Append_Document_Text

14. Inside the loop, click "+" then "Add an action". Search for "Increment variable" then select it.

15. Configure:
    - Name: Select varDocumentCount from the dropdown.
    - Value: 1

16. Rename to: Increment_Doc_Count

## Step 4.10: Action 8 -- Compose the Quality Assessment Prompt

WHERE AM I?: Power Automate > Flow Editor > Below the Apply to Each loop

1. Below the "Apply to each" loop (outside it), click "+" then "Add an action".

2. Search for "Compose" then select it.

3. In the Inputs field, paste the following system prompt:

```
You are a research document quality assessor. Analyze the following research corpus and return a JSON object with these exact fields:

{
  "total_word_count": <integer>,
  "document_count": <integer>,
  "average_document_length": <integer>,
  "coverage_assessment": "<string: 1-2 sentence assessment of topical coverage>",
  "content_types": ["<list of document types detected: survey responses, interview transcripts, reports, etc.>"],
  "quality_score": <float 0.0-1.0>,
  "gaps_identified": ["<list of any obvious gaps in coverage>"],
  "recommendation": "<string: proceed, add_more_documents, or insufficient_data>"
}

Return ONLY valid JSON. No markdown, no extra text.
```

4. Rename to: Quality_Assessment_System_Prompt

## Step 4.11: Action 9 -- Escape the System Prompt

WHERE AM I?: Power Automate > Flow Editor > Below Action 8

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click the "Expression" tab (the fx button) and paste the following escape chain:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(outputs('Quality_Assessment_System_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click "OK".

4. Rename to: Escape_System_Prompt

> **BEGINNER TIP**: This 4-step escape chain is mandatory for any text that gets embedded inside a JSON body sent to an API. It escapes backslashes, double quotes, newlines, and carriage returns so the JSON remains valid. Without this, the API call will fail with a 400 error.

## Step 4.12: Action 10 -- Escape the Document Content

WHERE AM I?: Power Automate > Flow Editor > Below Action 9

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click the "Expression" tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(variables('varDocumentContent'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click "OK".

4. Rename to: Escape_Document_Content

## Step 4.13: Action 11 -- Compose the Gemini API Request Body

WHERE AM I?: Power Automate > Flow Editor > Below Action 10

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click the "Expression" tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('{"contents":[{"role":"user","parts":[{"text":"',outputs('Escape_System_Prompt'),'\n\nRESEARCH CORPUS:\n\n',outputs('Escape_Document_Content'),'"}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.1}}')
```

3. Click "OK".

4. Rename to: Build_Gemini_Request_Body

> **WATCH OUT**: The concat() function builds the JSON body by combining literal JSON strings with escaped dynamic content. All literal double quotes inside the JSON must be escaped with backslash. The curly braces in concat() do NOT need doubling because they are inside string literals, not Power Automate expression syntax.

## Step 4.14: Action 12 -- Build the Gemini API URL

WHERE AM I?: Power Automate > Flow Editor > Below Action 11

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click the "Expression" tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=',outputs('Get_Gemini_Key'))
```

3. Click "OK".

4. Rename to: Build_Gemini_URL

5. Secure this action: Click the three dots (...) then "Settings" then "Security" then toggle "Secure Inputs" to On then toggle "Secure Outputs" to On then click "Done".

## Step 4.15: Action 13 -- HTTP POST to Gemini API

WHERE AM I?: Power Automate > Flow Editor > Below Action 12

1. Click "+" then "Add an action". Search for "HTTP" then select "HTTP" (the premium connector with the blue globe icon).

2. Configure:
   - Method: Select "POST" from the dropdown.
   - URI: Click the lightning bolt (dynamic content) icon and select "Outputs" from the Build_Gemini_URL action.
   - Headers: Click "+ Add new parameter" then check "Headers". Add one header:
     - Key: Content-Type
     - Value: application/json
   - Body: Click the lightning bolt (dynamic content) icon and select "Outputs" from the Build_Gemini_Request_Body action.

3. Configure timeout: Click the three dots (...) on the HTTP action then "Settings". Find the "Timeout" field and type: PT120S. Click "Done".

4. Secure this action: Click the three dots (...) then "Settings" then "Security" then toggle "Secure Inputs" to On then click "Done".

5. Rename to: HTTP_Gemini_Quality_Assessment

> **CRITICAL**: The PT120S timeout gives the Gemini API up to 120 seconds to respond. The default timeout is 30 seconds, which may not be enough for large document analysis with extended thinking.

## Step 4.16: Action 14 -- Extract the Gemini Response Text

WHERE AM I?: Power Automate > Flow Editor > Below Action 13

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click the "Expression" tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
body('HTTP_Gemini_Quality_Assessment')?['candidates']?[0]?['content']?['parts']?[0]?['text']
```

3. Click "OK".

4. Rename to: Extract_Quality_Response

> **BEGINNER TIP**: This expression navigates the Gemini API response JSON structure. The response has a candidates array, and we want the first candidate's content, first part, text field. This is the standard extraction pattern for all Gemini API text responses.

## Step 4.17: Action 15 -- Parse the Quality JSON

WHERE AM I?: Power Automate > Flow Editor > Below Action 14

1. Click "+" then "Add an action". Search for "Parse JSON" then select "Parse JSON" (under "Data Operations").

2. Configure:
   - Content: Click the lightning bolt icon and select "Outputs" from the Extract_Quality_Response action.
   - Schema: Click "Generate from sample" and paste this sample JSON:

```json
{
  "total_word_count": 45230,
  "document_count": 3,
  "average_document_length": 15077,
  "coverage_assessment": "Strong coverage of customer satisfaction, product quality, and support experience across multiple touchpoints.",
  "content_types": ["survey responses", "interview transcripts", "support tickets"],
  "quality_score": 0.85,
  "gaps_identified": ["No competitive analysis data", "Limited demographic information"],
  "recommendation": "proceed"
}
```

3. Click "Done".

4. Rename to: Parse_Quality_Metrics

## Step 4.18: Action 16 -- Create Dataverse Session Record

WHERE AM I?: Power Automate > Flow Editor > Below Action 15

1. Click "+" then "Add an action". Search for "Add a new row" then select "Add a new row" (under the "Microsoft Dataverse" connector).

2. Configure:
   - Table name: Select "Research Sessions" from the dropdown.
   - session_id: Click the lightning bolt icon and select the variable varSessionId.
   - status: Type: checkpoint_1_pending
   - research_question: Click the lightning bolt icon and select "research_query" from the trigger inputs.
   - document_content: Click the lightning bolt icon and select the variable varDocumentContent.
   - analysis_depth: Click the lightning bolt icon and select "analysis_depth" from the trigger inputs.
   - analysis_lens: Click the lightning bolt icon and select "analysis_lens" from the trigger inputs.
   - document_count: Click the lightning bolt icon and select "document_count" from the Parse_Quality_Metrics action.
   - total_word_count: Click the lightning bolt icon and select "total_word_count" from the Parse_Quality_Metrics action.

3. Rename to: Create_Dataverse_Session

## Step 4.19: Action 17 -- Respond to the Agent

WHERE AM I?: Power Automate > Flow Editor > Below Action 16

1. Click "+" then "Add an action". Search for "Respond to Copilot" then select "Respond to Copilot" (or "Return value(s) to Power Virtual Agents" -- same thing, different label depending on your version).

2. Click "+ Add an output" five times to create five outputs:

3. Output 1:
   - Type: Text
   - Name: session_id
   - Value: Click the lightning bolt icon and select the variable varSessionId.

4. Output 2:
   - Type: Text
   - Name: status
   - Value: Type: checkpoint_1_pending

5. Output 3:
   - Type: Text
   - Name: quality_summary
   - Value: Click the lightning bolt icon and select "Outputs" from the Extract_Quality_Response action.

6. Output 4:
   - Type: Number
   - Name: document_count
   - Value: Click the lightning bolt icon and select "document_count" from the Parse_Quality_Metrics action.

7. Output 5:
   - Type: Number
   - Name: total_word_count
   - Value: Click the lightning bolt icon and select "total_word_count" from the Parse_Quality_Metrics action.

8. Configure the async toggle: Click on the "Respond to Copilot" action. Click "Settings" (or the three dots then "Settings"). Look for "Networking" section. Find "Asynchronous Response" and set it to "Off".

9. Click "Save" at the top of the flow editor. Wait for the green "Your flow is ready" banner.

## Step 4.20: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|-------------|-------------|-------------------|
| 1 | Initialize_Session_ID | Initialize variable | String, value = guid() |
| 2 | Initialize_Document_Content | Initialize variable | String, empty |
| 3 | Initialize_Word_Count | Initialize variable | Integer, 0 |
| 4 | Initialize_Document_Count | Initialize variable | Integer, 0 |
| 5 | Get_Gemini_Key | Get environment variable | nxth_GeminiApiKey, Secure I/O |
| 6 | Get_Input_Files | SharePoint Get files | /Research Projects/Inputs |
| 7 | Apply to each | Control | Loop over Get_Input_Files value |
| 7a | Get_File_Content | SharePoint Get file content | File Id from loop |
| 7b | Extract_Text_Content | Compose | File Content output |
| 7c | Append_Document_Text | Append to string variable | varDocumentContent |
| 7d | Increment_Doc_Count | Increment variable | varDocumentCount + 1 |
| 8 | Quality_Assessment_System_Prompt | Compose | Static prompt text |
| 9 | Escape_System_Prompt | Compose | 4-step escape chain |
| 10 | Escape_Document_Content | Compose | 4-step escape chain on varDocumentContent |
| 11 | Build_Gemini_Request_Body | Compose | concat() JSON body |
| 12 | Build_Gemini_URL | Compose | concat() URL with API key, Secure I/O |
| 13 | HTTP_Gemini_Quality_Assessment | HTTP | POST to Gemini, PT120S timeout, Secure Inputs |
| 14 | Extract_Quality_Response | Compose | body(...)?['candidates']?[0]... |
| 15 | Parse_Quality_Metrics | Parse JSON | Schema from sample |
| 16 | Create_Dataverse_Session | Dataverse Add a new row | Research Sessions table |
| 17 | Respond to Copilot | Respond to Copilot | 5 outputs, Async OFF |

---

# PHASE 5: Register Ingest Research Documents -- TOOL REGISTRATION

This phase registers the Ingest Research Documents flow as a tool so the agent can call it.

## Step 5.1: Register the Flow as an Agent Tool

WHERE AM I?: Copilot Studio > Agent Overview > Tools Section

1. Go back to your Copilot Studio tab (https://copilotstudio.microsoft.com).

2. Open your Humans-in-Control Research Analyst agent.

3. On the Overview page, find the "Tools" section. Click "Add a tool".

4. In the tool picker, click "Power Automate flows" (or "Flows" depending on your view).

5. Find "Ingest Research Documents" in the list. Click it then click "Add and configure".

6. On the configuration screen:
   - Name: Ingest Research Documents
   - Description: Processes uploaded research documents from SharePoint, extracts text content, computes quality metrics using Gemini API, and creates a new Dataverse session. Call this tool when the user starts a new research project and has provided documents for analysis. Returns session ID and quality summary for Checkpoint 1 review.

7. Map the inputs:
   - research_query: Set this to the user's research question (the orchestrator fills this from Global.varResearchQuestion based on conversation context).
   - document_urls: Set this to the document URLs provided by the user.
   - analysis_depth: Set this to the analysis depth preference.
   - analysis_lens: Set this to the analysis lens preference.

8. Completion mode: Select "Don't respond (default)" -- the agent will incorporate the output into its next response.

9. Click "Save".

## Step 5.2: Connect the Flow to the Research Setup Topic

WHERE AM I?: Copilot Studio > Topics > Research Setup > Canvas

1. Navigate to the Topics tab then click "Research Setup" to open it.

2. Find the placeholder Message node named "Create Research Session (Placeholder)".

3. Delete this placeholder node: click the three dots (...) on the node then "Delete".

4. In its place, click the "+" button then "Add a tool" then select "Ingest Research Documents".

5. An Action node appears. Map each input parameter:
   - research_query: Click the input field then select Global.varResearchQuestion from the variable picker.
   - document_urls: Click the input field then select Topic.varDocumentUrls.
   - analysis_depth: Click the input field then select Topic.varAnalysisDepth.
   - analysis_lens: Click the input field then select Global.varAnalysisLens.

6. After the Action node, the flow's output variables become available as dynamic content. Click the "+" below the Action node and add a "Variable management" then "Set a variable value" node:
   - Set variable: Select Global.varSessionId
   - To value: Click the lightning bolt icon and select "session_id" from the Ingest Research Documents action outputs.

7. Add another "Set a variable value" node:
   - Set variable: Select Global.varPipelineStatus
   - To value: Click the lightning bolt icon and select "status" from the Ingest Research Documents action outputs.

8. Click "Save".

> **VERIFY**: The Research Setup topic should now have the Action node calling Ingest Research Documents with all four inputs mapped and two output variables captured into global variables.

---

# PHASE 6: Checkpoint Review -- TOPIC BUILD (Node-by-Node: 7 Nodes)

This topic is the universal handler for checkpoints 2 through 5. It retrieves the current checkpoint's findings from Dataverse, displays them as an Adaptive Card, and routes the researcher's decision (approve, revise, or rollback).

## Step 6.1: Create the Checkpoint Review Topic

WHERE AM I?: Copilot Studio > Topics tab > Custom subtab

1. Click the "Topics" tab then "Custom" subtab then "+ Add a topic" then "From blank".

2. Rename the topic to: Checkpoint Review

3. Set the description to: User is reviewing findings at a pipeline checkpoint and wants to approve, revise, or provide feedback on AI-generated results. Route here when the user says approve, looks good, proceed, reject, revise, change, modify, or provides specific feedback on themes, personas, or insights presented at a checkpoint. Does NOT handle initial research setup, theme weighting adjustments, persona attribute editing, or output format selection.

## Step 6.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Topics > Checkpoint Review > Trigger Node

1. Add these trigger phrases (press Enter after each):

   - review checkpoint
   - approve findings
   - provide feedback on results
   - proceed with analysis
   - checkpoint review
   - approve the themes
   - approve the personas
   - approve the insights
   - I want to revise
   - roll back to previous stage

## Step 6.3: Node 1 -- Message -- "Checkpoint Status Summary"

WHERE AM I?: Copilot Studio > Topics > Checkpoint Review > Canvas

1. Click "+" below the Trigger node then "Send a message".

2. Type the following message:

```
Pipeline Status Check

Current session: {Global.varSessionId}
Current status: {Global.varPipelineStatus}

Let me retrieve the findings for your current checkpoint. I will present them for your review with options to approve, revise, or roll back.
```

3. Rename the node to: Checkpoint Status Summary

## Step 6.4: Node 2 -- Message -- "Retrieve Current Checkpoint Data" (Placeholder for Dataverse Lookup)

WHERE AM I?: Copilot Studio > Topics > Checkpoint Review > Canvas (below Node 1)

1. Click "+" then "Send a message".

2. Type:

```
Retrieving checkpoint data from your research session. One moment please...
```

3. Rename to: Retrieve Checkpoint Data

> **BEGINNER TIP**: In a full implementation, this node would be an Action node calling a flow that queries Dataverse for the current session's checkpoint data. For this recipe, the checkpoint data is passed through global variables that were set by the previous flow (Theme Discovery, Persona Extraction, or Insight Synthesis). The Adaptive Card in the next node will reference these variables.

## Step 6.5: Node 3 -- Adaptive Card -- "Checkpoint Findings Card"

WHERE AM I?: Copilot Studio > Topics > Checkpoint Review > Canvas (below Node 2)

1. Click "+" then "Ask with Adaptive Card".

2. Click the three dots (...) then "Properties" then "Edit adaptive card".

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
          "text": "CHECKPOINT REVIEW",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Review the findings below and choose an action.",
          "size": "Small",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "The AI has completed analysis for this stage. Review the findings below. Each item includes evidence counts and confidence scores to help you assess quality.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "FINDINGS SUMMARY",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Detailed findings are displayed in the conversation above. Use the controls below to make your decision.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "TextBlock",
      "text": "YOUR DECISION",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "checkpointDecision",
      "label": "Choose an action",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Approve -- Accept findings and advance to next stage",
          "value": "approve"
        },
        {
          "title": "Revise -- Provide modifications before proceeding",
          "value": "revise"
        },
        {
          "title": "Rollback -- Return to a previous checkpoint",
          "value": "rollback"
        }
      ]
    },
    {
      "type": "Input.Text",
      "id": "checkpointNotes",
      "placeholder": "If revising: describe what to change. If rolling back: specify which checkpoint (1-4).",
      "isMultiline": true,
      "label": "Notes (required for Revise or Rollback)"
    },
    {
      "type": "Input.Number",
      "id": "rollbackTarget",
      "label": "Rollback to checkpoint number (1-4, only if rolling back)",
      "min": 1,
      "max": 4,
      "placeholder": "Enter checkpoint number"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "SUBMIT DECISION",
      "data": {
        "cardId": "checkpointReview"
      }
    }
  ]
}
```

4. Click "Save" in the card editor.

5. The node creates output variables: checkpointDecision, checkpointNotes, and rollbackTarget. Leave them all as Topic scope.

6. Rename the node to: Checkpoint Findings Card

## Step 6.6: Node 4 -- Condition -- "Route Checkpoint Decision"

WHERE AM I?: Copilot Studio > Topics > Checkpoint Review > Canvas (below Node 3)

1. Click "+" then "Add a condition".

2. Click the condition field and select Topic.checkpointDecision.

3. Set operator to "is equal to" and value to: approve

4. In the true branch (approve):

5. Click "+" then "Variable management" then "Set a variable value":
   - Set variable: Global.varPipelineStatus
   - To value: Click the formula icon (fx) and type: `Concatenate(Text(Global.varPipelineStatus), "_approved")` then click "Done".

   Actually, for simplicity, use a literal approach. Since the exact status depends on which checkpoint we are at, type: approved (the flow that runs next will set the precise status).

6. Click "+" then "Send a message":

```
Checkpoint approved. Advancing to the next pipeline stage. Processing now...
```

7. In the "All other conditions" (else) branch, add a nested condition:
   - Click "+" then "Add a condition"
   - Variable: Topic.checkpointDecision
   - Operator: is equal to
   - Value: revise

8. In the true branch of the nested condition (revise):

9. Click "+" then "Send a message":

```
Revision requested. I will re-run the current analysis stage with your modifications. Please describe the specific changes you want in your notes above, and I will incorporate them.
```

10. In the else branch (rollback):

11. Click "+" then "Send a message":

```
Rolling back to the specified checkpoint. All analysis artifacts generated after that checkpoint will be cleared. This action cannot be undone.
```

12. Below this message, add a placeholder for the Rollback flow:

13. Click "+" then "Send a message":

```
[ACTION PLACEHOLDER] Replace this node with an Action node calling the Rollback to Checkpoint flow. Map inputs: session_id = Global.varSessionId, target_checkpoint = Topic.rollbackTarget. Capture outputs: status -> Global.varPipelineStatus.
```

14. Rename the outer Condition node to: Route Checkpoint Decision

## Step 6.7: Node 5 -- Message -- "Pipeline Advancement Confirmation"

WHERE AM I?: Copilot Studio > Topics > Checkpoint Review > Canvas (after the approve branch)

1. After the approve branch's message, click "+" then "Send a message":

```
The pipeline has advanced. Your approved findings have been locked and will be used as input for the next analysis stage.

To continue, the next stage will begin automatically. If you need to review the results at any time, type "review checkpoint".
```

2. Rename to: Pipeline Advancement Confirmation

3. Click "Save" at the top of the canvas.

## Step 6.8: Complete YAML for Checkpoint Review Topic

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Checkpoint Review
    triggerQueries:
      - review checkpoint
      - approve findings
      - provide feedback on results
      - proceed with analysis
      - checkpoint review
      - approve the themes
      - approve the personas
      - approve the insights
      - I want to revise
      - roll back to previous stage
  actions:
    - kind: SendMessage
      id: checkpointStatusSummary
      message: |-
        Pipeline Status Check

        Current session: {Global.varSessionId}
        Current status: {Global.varPipelineStatus}

        Let me retrieve the findings for your current checkpoint. I will present them for your review with options to approve, revise, or roll back.

    - kind: SendMessage
      id: retrieveCheckpointData
      message: "Retrieving checkpoint data from your research session. One moment please..."

    - kind: SendMessage
      id: checkpointCardPlaceholder
      message: "[ADAPTIVE CARD PLACEHOLDER] Replace this node with an Ask with Adaptive Card node using the Checkpoint Findings Card JSON from Step 6.5. The card collects checkpointDecision (approve/revise/rollback), checkpointNotes, and rollbackTarget."

    - kind: ConditionGroup
      id: routeCheckpointDecision
      conditions:
        - id: isApproved
          condition: =Topic.checkpointDecision = "approve"
          actions:
            - kind: SendMessage
              id: approvedMsg
              message: "Checkpoint approved. Advancing to the next pipeline stage. Processing now..."
            - kind: SendMessage
              id: advancementConfirmation
              message: |-
                The pipeline has advanced. Your approved findings have been locked and will be used as input for the next analysis stage.

                To continue, the next stage will begin automatically. If you need to review the results at any time, type review checkpoint.
        - id: isRevise
          condition: =Topic.checkpointDecision = "revise"
          actions:
            - kind: SendMessage
              id: reviseMsg
              message: "Revision requested. I will re-run the current analysis stage with your modifications. Please describe the specific changes you want in your notes above, and I will incorporate them."
      elseActions:
        - kind: SendMessage
          id: rollbackMsg
          message: "Rolling back to the specified checkpoint. All analysis artifacts generated after that checkpoint will be cleared. This action cannot be undone."
        - kind: SendMessage
          id: rollbackFlowPlaceholder
          message: "[ACTION PLACEHOLDER] Replace this node with an Action node calling the Rollback to Checkpoint flow. Map inputs: session_id = Global.varSessionId, target_checkpoint = Topic.rollbackTarget."
```

---

# PHASE 7: Run Theme Discovery -- FLOW BUILD (Action-by-Action)

This flow executes thematic analysis on the ingested corpus using the Gemini API with extended thinking. It chunks documents, extracts themes from each chunk, consolidates them, and stores the results in Dataverse.

## Step 7.1: Create the Flow

WHERE AM I?: Power Automate > make.powerautomate.com > Solutions > HiC Research Agent Solution

1. In your solution, click "+ New" then "Automation" then "Cloud flow" then "Instant".

2. Flow name: Run Theme Discovery

3. Trigger: "Run a flow from Copilot". Click "Create".

## Step 7.2: Configure Trigger Inputs

WHERE AM I?: Power Automate > Flow Editor > Trigger Node

1. Add four text inputs to the trigger:

2. Input 1: Click "+ Add an input" then "Text".
   - Input name: session_id
   - Description: Research session identifier from the ingestion stage

3. Input 2: Click "+ Add an input" then "Number".
   - Input name: min_themes
   - Description: Minimum number of themes to discover (default 5)

4. Input 3: Click "+ Add an input" then "Number".
   - Input name: max_themes
   - Description: Maximum number of themes to discover (default 30)

5. Input 4: Click "+ Add an input" then "Text".
   - Input name: analysis_depth
   - Description: Analysis depth: Quick, Standard, or Deep

## Step 7.3: Action 1 -- Get the Gemini API Key

WHERE AM I?: Power Automate > Flow Editor > Below Trigger

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, paste your Gemini API key.

3. Secure this action: Click (...) then "Settings" then "Security" then "Secure Inputs" On then "Secure Outputs" On then "Done".

4. Rename to: Get_Gemini_Key

## Step 7.4: Action 2 -- Retrieve Session from Dataverse

WHERE AM I?: Power Automate > Flow Editor > Below Action 1

1. Click "+" then "Add an action". Search for "Get a row by ID" then select the Dataverse version.

2. Configure:
   - Table name: Research Sessions
   - Row ID: Click the lightning bolt icon and select "session_id" from the trigger inputs.

> **WATCH OUT**: The "Get a row by ID" action requires the Dataverse row's unique GUID, not the session_id text field. If your session_id is stored as the primary Name column, you may need to use "List rows" with a filter instead. Use "List rows" with:
   - Table name: Research Sessions
   - Filter rows: `nxth_session_id eq '` then click lightning bolt and select session_id from trigger then type `'`

3. Rename to: Get_Session_Record

## Step 7.5: Action 3 -- Compose the Theme Discovery Prompt

WHERE AM I?: Power Automate > Flow Editor > Below Action 2

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, paste:

```
You are a qualitative research analyst performing thematic analysis. Analyze the following research corpus and identify recurring themes, patterns, and categories.

ANALYSIS PARAMETERS:
- Minimum themes to identify: {min_themes}
- Maximum themes to identify: {max_themes}
- Analysis depth: {analysis_depth}
- Analytical lens: Focus on patterns relevant to the research question

RESEARCH QUESTION: {research_question}

Return a JSON array of themes with this exact structure:
[
  {
    "theme_name": "<concise theme label>",
    "description": "<2-3 sentence description of the theme>",
    "evidence_count": <number of distinct data points supporting this theme>,
    "confidence_score": <float 0.0-1.0 indicating strength of evidence>,
    "representative_quotes": [
      "<exact quote from source data>",
      "<exact quote from source data>"
    ],
    "sub_themes": ["<optional sub-theme labels>"],
    "weight": 1.0
  }
]

RULES:
- Every theme must be supported by at least 2 distinct data points
- Confidence score reflects evidence density: 0.9+ = very strong, 0.7-0.89 = strong, 0.5-0.69 = moderate, below 0.5 = weak
- Representative quotes must be EXACT text from the corpus, not paraphrased
- Themes must be mutually exclusive where possible; note overlaps explicitly
- Return ONLY valid JSON array. No markdown, no extra text.

RESEARCH CORPUS:
```

3. Rename to: Theme_Discovery_Prompt

> **WATCH OUT**: The placeholders {min_themes}, {max_themes}, etc. in the prompt above are NOT Power Automate dynamic content references. You need to replace them with actual dynamic content. Delete each placeholder text, click the lightning bolt icon, and select the appropriate trigger input or Dataverse field. For {research_question}, select the research_question field from the Get_Session_Record action.

## Step 7.6: Action 4 -- Escape the Theme Discovery Prompt

WHERE AM I?: Power Automate > Flow Editor > Below Action 3

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click the "Expression" tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(outputs('Theme_Discovery_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click "OK".

4. Rename to: Escape_Theme_Prompt

## Step 7.7: Action 5 -- Escape the Document Content from Dataverse

WHERE AM I?: Power Automate > Flow Editor > Below Action 4

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click the "Expression" tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(body('Get_Session_Record')?['nxth_document_content'],'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click "OK".

4. Rename to: Escape_Session_Documents

> **BEGINNER TIP**: The field name nxth_document_content uses your publisher prefix (nxth_) followed by the column name. Dataverse column names in expressions always use the schema name with the publisher prefix, not the display name.

## Step 7.8: Action 6 -- Build the Gemini Request Body with Thinking Config

WHERE AM I?: Power Automate > Flow Editor > Below Action 5

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click the "Expression" tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('{"contents":[{"role":"user","parts":[{"text":"',outputs('Escape_Theme_Prompt'),'\n\n',outputs('Escape_Session_Documents'),'"}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.1,"thinkingConfig":{"thinkingBudget":16384}}}')
```

3. Click "OK".

4. Rename to: Build_Theme_Request_Body

> **CRITICAL**: The thinkingBudget of 16384 tokens enables Gemini's extended thinking mode. This gives the model more internal reasoning capacity for complex thematic analysis. The responseMimeType of application/json forces structured JSON output.

## Step 7.9: Action 7 -- Build the Gemini URL

WHERE AM I?: Power Automate > Flow Editor > Below Action 6

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click the "Expression" tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=',outputs('Get_Gemini_Key'))
```

3. Click "OK".

4. Rename to: Build_Gemini_URL

5. Secure: (...) then "Settings" then Secure Inputs On, Secure Outputs On, "Done".

## Step 7.10: Action 8 -- HTTP POST to Gemini for Theme Discovery

WHERE AM I?: Power Automate > Flow Editor > Below Action 7

1. Click "+" then "Add an action". Search for "HTTP" then select it.

2. Configure:
   - Method: POST
   - URI: Click lightning bolt then select "Outputs" from Build_Gemini_URL.
   - Headers: Content-Type = application/json
   - Body: Click lightning bolt then select "Outputs" from Build_Theme_Request_Body.

3. Timeout: (...) then "Settings" then Timeout = PT120S.

4. Secure Inputs: On.

5. Rename to: HTTP_Gemini_Theme_Discovery

## Step 7.11: Action 9 -- Extract the Theme Response

WHERE AM I?: Power Automate > Flow Editor > Below Action 8

1. Click "+" then "Add an action". Search for "Compose" then select it.

2. In the Inputs field, click fx and paste:

**COPY-PASTE** into the Expression field:
```
body('HTTP_Gemini_Theme_Discovery')?['candidates']?[0]?['content']?['parts']?[0]?['text']
```

3. Click "OK".

4. Rename to: Extract_Themes_Response

## Step 7.12: Action 10 -- Update Dataverse Session with Themes

WHERE AM I?: Power Automate > Flow Editor > Below Action 9

1. Click "+" then "Add an action". Search for "Update a row" then select the Dataverse version.

2. Configure:
   - Table name: Research Sessions
   - Row ID: Use the row ID from the Get_Session_Record action (click lightning bolt and look for the unique identifier field).
   - themes_json: Click lightning bolt then select "Outputs" from Extract_Themes_Response.
   - status: Type: checkpoint_2_pending

3. Rename to: Update_Session_Themes

## Step 7.13: Action 11 -- Respond to the Agent

WHERE AM I?: Power Automate > Flow Editor > Below Action 10

1. Click "+" then "Add an action". Search for "Respond to Copilot" then select it.

2. Add three outputs:

3. Output 1: Type = Text, Name = themes_json, Value = click lightning bolt then select "Outputs" from Extract_Themes_Response.

4. Output 2: Type = Text, Name = status, Value = Type: checkpoint_2_pending

5. Output 3: Type = Text, Name = session_id, Value = click lightning bolt then select "session_id" from the trigger.

6. Async toggle: Off (Settings then Networking then Asynchronous Response = Off).

7. Click "Save".

## Step 7.14: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|-------------|-------------|-------------------|
| 1 | Get_Gemini_Key | Compose | API key, Secure I/O |
| 2 | Get_Session_Record | Dataverse List rows | Filter by session_id |
| 3 | Theme_Discovery_Prompt | Compose | Static prompt with dynamic content |
| 4 | Escape_Theme_Prompt | Compose | 4-step escape chain |
| 5 | Escape_Session_Documents | Compose | 4-step escape on document_content |
| 6 | Build_Theme_Request_Body | Compose | concat() with thinkingBudget: 16384 |
| 7 | Build_Gemini_URL | Compose | concat() URL, Secure I/O |
| 8 | HTTP_Gemini_Theme_Discovery | HTTP | POST, PT120S, Secure Inputs |
| 9 | Extract_Themes_Response | Compose | candidates[0].content.parts[0].text |
| 10 | Update_Session_Themes | Dataverse Update row | themes_json + status |
| 11 | Respond to Copilot | Respond | 3 outputs, Async OFF |

---

# PHASE 8: Register Run Theme Discovery -- TOOL REGISTRATION

## Step 8.1: Register the Flow as an Agent Tool

WHERE AM I?: Copilot Studio > Agent Overview > Tools Section

1. On the Overview page, find the "Tools" section. Click "Add a tool".

2. Click "Power Automate flows" then find "Run Theme Discovery" then click "Add and configure".

3. Configure:
   - Name: Run Theme Discovery
   - Description: Executes thematic analysis on ingested corpus using Gemini API with extended thinking. Identifies 5-30 recurring themes with evidence counts and confidence scores. Call this tool after Checkpoint 1 is approved to advance to Stage 2 of the research pipeline.

4. Map inputs:
   - session_id: From conversation context (Global.varSessionId).
   - min_themes: Default 5.
   - max_themes: Default 30.
   - analysis_depth: From conversation context.

5. Completion mode: "Don't respond (default)".

6. Click "Save".

---

# PHASE 9: Theme Weighting -- TOPIC BUILD (Node-by-Node: 7 Nodes)

This topic allows the researcher to adjust theme weights, merge, split, add, or remove themes after Checkpoint 2.

## Step 9.1: Create the Theme Weighting Topic

WHERE AM I?: Copilot Studio > Topics tab > Custom subtab

1. Click "+ Add a topic" then "From blank".

2. Rename to: Theme Weighting

3. Description: User wants to adjust the relative importance or weighting of discovered themes to influence downstream analysis. Route here when the user mentions weighting, prioritizing, emphasizing, or de-emphasizing specific themes, or wants to merge, split, add, or remove themes. Does NOT handle initial research setup, checkpoint approval decisions, persona verification, or output generation.

## Step 9.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Topics > Theme Weighting > Trigger Node

1. Add these trigger phrases:
   - adjust theme weights
   - prioritize themes
   - weight theme importance
   - emphasize a theme
   - change theme priority
   - merge themes
   - split a theme
   - remove a theme
   - add a new theme
   - modify theme weights

## Step 9.3: Node 1 -- Message -- "Theme Weighting Explanation"

WHERE AM I?: Copilot Studio > Topics > Theme Weighting > Canvas

1. Click "+" then "Send a message":

```
Theme Weighting Controls

Theme weights influence how much emphasis each theme receives in downstream analysis (persona extraction and insight synthesis).

- Default weight: 1.0 (neutral)
- Range: 0.1 (minimal emphasis) to 3.0 (maximum emphasis)
- Higher weight = more influence on persona attributes and insight generation

You can also:
- Merge two similar themes into one
- Split a broad theme into sub-themes
- Add a theme the AI missed
- Remove an irrelevant theme

Minimum 5 themes, maximum 30 themes must remain after modifications.
```

2. Rename to: Theme Weighting Explanation

## Step 9.4: Node 2 -- Message -- "Retrieve Discovered Themes" (Placeholder)

WHERE AM I?: Copilot Studio > Topics > Theme Weighting > Canvas (below Node 1)

1. Click "+" then "Send a message":

```
Here are the themes discovered in your research corpus. Each theme shows its name, evidence count, confidence score, and current weight. Review them and tell me what adjustments you would like to make.
```

2. Rename to: Display Current Themes

> **BEGINNER TIP**: In a full implementation, this node would be an Action node that queries Dataverse for the themes_json field from the current session. The themes would then be displayed dynamically. For this recipe, the generative orchestrator will use the themes data from the previous flow's output to compose the display.

## Step 9.5: Node 3 -- Adaptive Card -- "Theme Weighting Dashboard"

WHERE AM I?: Copilot Studio > Topics > Theme Weighting > Canvas (below Node 2)

1. Click "+" then "Ask with Adaptive Card".

2. Click (...) then "Properties" then "Edit adaptive card". Paste this JSON:

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
          "text": "THEME WEIGHTING DASHBOARD",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Adjust theme weights and specify modifications below. Use the text fields to describe your changes.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "themeAction",
      "label": "What would you like to do?",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Adjust Weights -- Change emphasis levels for specific themes",
          "value": "adjust_weights"
        },
        {
          "title": "Merge Themes -- Combine two similar themes into one",
          "value": "merge"
        },
        {
          "title": "Split Theme -- Break a broad theme into sub-themes",
          "value": "split"
        },
        {
          "title": "Add Theme -- Manually define a missing theme",
          "value": "add"
        },
        {
          "title": "Remove Theme -- Exclude an irrelevant theme",
          "value": "remove"
        },
        {
          "title": "Confirm -- Accept current themes and weights as-is",
          "value": "confirm"
        }
      ]
    },
    {
      "type": "Input.Text",
      "id": "themeModificationDetails",
      "placeholder": "Describe your modification in detail. For weight adjustments, specify theme names and new weights (e.g., 'Increase Customer Frustration to 2.5, decrease Product Features to 0.5'). For merges, name both themes. For splits, name the theme and proposed sub-themes.",
      "isMultiline": true,
      "label": "Modification Details"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "APPLY CHANGES",
      "data": {
        "cardId": "themeWeighting"
      }
    }
  ]
}
```

3. Click "Save" in the card editor.

4. Output variables created: themeAction and themeModificationDetails. Leave as Topic scope.

5. Rename to: Theme Weighting Dashboard

## Step 9.6: Node 4 -- Condition -- "Validate Theme Count"

WHERE AM I?: Copilot Studio > Topics > Theme Weighting > Canvas (below Node 3)

1. Click "+" then "Add a condition".

2. Variable: Topic.themeAction. Operator: is equal to. Value: confirm

3. In the true branch (confirm), click "+" then "Send a message":

```
Themes confirmed with current weights. The weighted theme set will now be used as the analytical lens for persona extraction in Stage 3.

Advancing to Persona Extraction. This may take a moment.
```

4. In the else branch (any modification action), click "+" then "Send a message":

```
Processing your theme modifications. I will apply the changes and present the updated theme list for your confirmation.

Please note: After modifications, the theme count must remain between 5 and 30. If your changes would result in fewer than 5 or more than 30 themes, I will ask you to adjust.
```

5. Rename the Condition node to: Route Theme Action

## Step 9.7: Node 5 -- Message -- "Updated Themes Confirmation"

WHERE AM I?: Copilot Studio > Topics > Theme Weighting > Canvas (after the else branch)

1. After the modification message in the else branch, click "+" then "Send a message":

```
Theme modifications applied. Here is the updated theme list with new weights. Please review and type "confirm themes" to proceed, or describe additional changes.
```

2. Rename to: Updated Themes Confirmation

3. Click "Save".

## Step 9.8: Complete YAML for Theme Weighting Topic

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Theme Weighting
    triggerQueries:
      - adjust theme weights
      - prioritize themes
      - weight theme importance
      - emphasize a theme
      - change theme priority
      - merge themes
      - split a theme
      - remove a theme
      - add a new theme
      - modify theme weights
  actions:
    - kind: SendMessage
      id: themeWeightingExplanation
      message: |-
        Theme Weighting Controls

        Theme weights influence how much emphasis each theme receives in downstream analysis (persona extraction and insight synthesis).

        - Default weight: 1.0 (neutral)
        - Range: 0.1 (minimal emphasis) to 3.0 (maximum emphasis)
        - Higher weight = more influence on persona attributes and insight generation

        You can also:
        - Merge two similar themes into one
        - Split a broad theme into sub-themes
        - Add a theme the AI missed
        - Remove an irrelevant theme

        Minimum 5 themes, maximum 30 themes must remain after modifications.

    - kind: SendMessage
      id: displayCurrentThemes
      message: "Here are the themes discovered in your research corpus. Each theme shows its name, evidence count, confidence score, and current weight. Review them and tell me what adjustments you would like to make."

    - kind: SendMessage
      id: themeWeightingCardPlaceholder
      message: "[ADAPTIVE CARD PLACEHOLDER] Replace this node with an Ask with Adaptive Card node using the Theme Weighting Dashboard JSON from Step 9.5. The card collects themeAction and themeModificationDetails."

    - kind: ConditionGroup
      id: routeThemeAction
      conditions:
        - id: isConfirm
          condition: =Topic.themeAction = "confirm"
          actions:
            - kind: SendMessage
              id: themesConfirmedMsg
              message: |-
                Themes confirmed with current weights. The weighted theme set will now be used as the analytical lens for persona extraction in Stage 3.

                Advancing to Persona Extraction. This may take a moment.
      elseActions:
        - kind: SendMessage
          id: modificationProcessingMsg
          message: |-
            Processing your theme modifications. I will apply the changes and present the updated theme list for your confirmation.

            Please note: After modifications, the theme count must remain between 5 and 30.
        - kind: SendMessage
          id: updatedThemesConfirmation
          message: "Theme modifications applied. Here is the updated theme list with new weights. Please review and type confirm themes to proceed, or describe additional changes."
```

---

# PHASE 10: Persona Verification -- TOPIC BUILD (Node-by-Node: 7 Nodes)

This topic allows the researcher to review, verify, and modify extracted personas after Checkpoint 3.

## Step 10.1: Create the Persona Verification Topic

WHERE AM I?: Copilot Studio > Topics tab > Custom subtab

1. Click "+ Add a topic" then "From blank".

2. Rename to: Persona Verification

3. Description: User wants to review, verify, or modify extracted personas and their attributes. Route here when the user discusses personas, archetypes, user segments, persona accuracy, behavioral patterns, or wants to adjust persona definitions. Does NOT handle research setup, theme discovery, theme weighting, insight synthesis, or output generation.

## Step 10.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Topics > Persona Verification > Trigger Node

1. Add these trigger phrases:
   - verify personas
   - review persona accuracy
   - check personas
   - modify persona definition
   - persona attributes
   - edit a persona
   - merge personas
   - split a persona
   - remove a persona
   - review extracted personas

## Step 10.3: Node 1 -- Message -- "Persona Verification Introduction"

WHERE AM I?: Copilot Studio > Topics > Persona Verification > Canvas

1. Click "+" then "Send a message":

```
Persona Verification

The AI has extracted distinct user personas from your research data based on the approved themes. Each persona includes:

- Name and description
- Behavioral patterns (how they act)
- Motivations (what drives them)
- Friction points (what frustrates them)
- Associated themes (which themes they connect to)
- Distinctiveness score (how unique they are vs. other personas)

Personas with greater than 60% attribute similarity are flagged for potential merging. You should have between 3 and 8 distinct personas for meaningful segmentation.

Review each persona below and provide your feedback.
```

2. Rename to: Persona Verification Introduction

## Step 10.4: Node 2 -- Message -- "Display Extracted Personas"

WHERE AM I?: Copilot Studio > Topics > Persona Verification > Canvas (below Node 1)

1. Click "+" then "Send a message":

```
Here are the extracted personas from your research session. I will display each persona with their full attribute profile. Review them carefully -- your domain expertise is essential for validating whether these personas accurately represent the people in your data.
```

2. Rename to: Display Extracted Personas

## Step 10.5: Node 3 -- Adaptive Card -- "Persona Review Dashboard"

WHERE AM I?: Copilot Studio > Topics > Persona Verification > Canvas (below Node 2)

1. Click "+" then "Ask with Adaptive Card".

2. Click (...) then "Properties" then "Edit adaptive card". Paste this JSON:

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
          "text": "CHECKPOINT 3: PERSONA REVIEW",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Pipeline Stage 3 of 5 -- Persona Extraction",
          "size": "Small",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Review the extracted personas displayed above. Each persona includes behavioral patterns, motivations, friction points, and a distinctiveness score. Personas with high overlap (>60% similarity) are flagged.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "personaAction",
      "label": "What would you like to do?",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Approve All -- Accept all personas as-is",
          "value": "approve_all"
        },
        {
          "title": "Edit Persona -- Modify attributes of a specific persona",
          "value": "edit"
        },
        {
          "title": "Merge Personas -- Combine two overlapping personas",
          "value": "merge"
        },
        {
          "title": "Split Persona -- Break a broad persona into distinct segments",
          "value": "split"
        },
        {
          "title": "Remove Persona -- Delete an inaccurate persona",
          "value": "remove"
        },
        {
          "title": "Add Persona -- Manually define a missing persona",
          "value": "add"
        }
      ]
    },
    {
      "type": "Input.Text",
      "id": "personaFeedback",
      "placeholder": "Describe your changes in detail. For edits, name the persona and what to change. For merges, name both personas. For additions, describe the new persona's key attributes.",
      "isMultiline": true,
      "label": "Feedback Details"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "SUBMIT FEEDBACK",
      "data": {
        "cardId": "personaReview"
      }
    }
  ]
}
```

3. Click "Save".

4. Output variables: personaAction and personaFeedback. Leave as Topic scope.

5. Rename to: Persona Review Dashboard

## Step 10.6: Node 4 -- Condition -- "Route Persona Decision"

WHERE AM I?: Copilot Studio > Topics > Persona Verification > Canvas (below Node 3)

1. Click "+" then "Add a condition".

2. Variable: Topic.personaAction. Operator: is equal to. Value: approve_all

3. In the true branch, click "+" then "Variable management" then "Set a variable value":
   - Set variable: Global.varPipelineStatus
   - To value: checkpoint_3_approved

4. Below that, click "+" then "Send a message":

```
All personas approved. The verified persona set will now be used for insight synthesis in Stage 4.

Persona count: Verified
Distinctiveness: Confirmed
Theme coverage: Complete

Advancing to Insight Synthesis. This cross-references your themes with personas to generate actionable insights.
```

5. In the else branch, click "+" then "Send a message":

```
Processing your persona modifications. I will apply the changes, recalculate distinctiveness scores, and present the updated persona set for your confirmation.

Remember: You need between 3 and 8 distinct personas. I will warn you if modifications push the count outside this range.
```

6. Rename the Condition node to: Route Persona Decision

## Step 10.7: Node 5 -- Condition -- "Validate Persona Count"

WHERE AM I?: Copilot Studio > Topics > Persona Verification > Canvas (after the else branch)

1. After the modification message, click "+" then "Send a message":

```
Persona modifications applied. The updated persona set is ready for your review. Type "verify personas" to see the updated list, or type "approve personas" to confirm and proceed.
```

2. Rename to: Personas Updated Confirmation

3. Click "Save".

## Step 10.8: Complete YAML for Persona Verification Topic

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Persona Verification
    triggerQueries:
      - verify personas
      - review persona accuracy
      - check personas
      - modify persona definition
      - persona attributes
      - edit a persona
      - merge personas
      - split a persona
      - remove a persona
      - review extracted personas
  actions:
    - kind: SendMessage
      id: personaVerificationIntro
      message: |-
        Persona Verification

        The AI has extracted distinct user personas from your research data based on the approved themes. Each persona includes:

        - Name and description
        - Behavioral patterns (how they act)
        - Motivations (what drives them)
        - Friction points (what frustrates them)
        - Associated themes (which themes they connect to)
        - Distinctiveness score (how unique they are vs. other personas)

        Personas with greater than 60% attribute similarity are flagged for potential merging. You should have between 3 and 8 distinct personas for meaningful segmentation.

        Review each persona below and provide your feedback.

    - kind: SendMessage
      id: displayExtractedPersonas
      message: "Here are the extracted personas from your research session. I will display each persona with their full attribute profile. Review them carefully -- your domain expertise is essential for validating whether these personas accurately represent the people in your data."

    - kind: SendMessage
      id: personaCardPlaceholder
      message: "[ADAPTIVE CARD PLACEHOLDER] Replace this node with an Ask with Adaptive Card node using the Persona Review Dashboard JSON from Step 10.5. The card collects personaAction and personaFeedback."

    - kind: ConditionGroup
      id: routePersonaDecision
      conditions:
        - id: isApproveAll
          condition: =Topic.personaAction = "approve_all"
          actions:
            - kind: SetVariable
              id: setPersonaApproved
              variable: Global.varPipelineStatus
              value: "checkpoint_3_approved"
            - kind: SendMessage
              id: personasApprovedMsg
              message: |-
                All personas approved. The verified persona set will now be used for insight synthesis in Stage 4.

                Advancing to Insight Synthesis. This cross-references your themes with personas to generate actionable insights.
      elseActions:
        - kind: SendMessage
          id: personaModificationMsg
          message: |-
            Processing your persona modifications. I will apply the changes, recalculate distinctiveness scores, and present the updated persona set for your confirmation.

            Remember: You need between 3 and 8 distinct personas.
        - kind: SendMessage
          id: personasUpdatedConfirmation
          message: "Persona modifications applied. The updated persona set is ready for your review. Type verify personas to see the updated list, or type approve personas to confirm and proceed."
```

---

# PHASE 11: Output Selection -- TOPIC BUILD (Node-by-Node: 8 Nodes)

This topic handles the final stage of the pipeline: selecting the output format, generating the deliverable, and presenting it for final approval.

## Step 11.1: Create the Output Selection Topic

WHERE AM I?: Copilot Studio > Topics tab > Custom subtab

1. Click "+ Add a topic" then "From blank".

2. Rename to: Output Selection

3. Description: User wants to choose the final output format, generate the deliverable, or export research results. Route here when the user mentions final report, executive summary, presentation, export, download, or asks about available output formats. Does NOT handle research setup, checkpoint reviews for stages 1-4, theme weighting, or persona verification.

## Step 11.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Topics > Output Selection > Trigger Node

1. Add these trigger phrases:
   - choose output format
   - generate final report
   - export research results
   - download deliverable
   - select output type
   - create executive summary
   - make a presentation outline
   - finalize research
   - produce the report
   - generate deliverable

## Step 11.3: Node 1 -- Message -- "Output Options Overview"

WHERE AM I?: Copilot Studio > Topics > Output Selection > Canvas

1. Click "+" then "Send a message":

```
Output Format Options

Three formats are available for your research deliverable:

1. Structured Report -- Comprehensive multi-section document with all themes, personas, insights, evidence citations, and persona portraits. Best for: detailed reference documents and archival.

2. Executive Summary -- Condensed 2-page overview focusing on top insights and strategic recommendations. Best for: stakeholder briefings and leadership presentations.

3. Presentation Outline -- Slide-by-slide structure with key talking points, data highlights, and speaker notes per slide. Best for: team presentations and workshop facilitation.

All formats include AI-generated persona portrait images and full evidence traceability.
```

2. Rename to: Output Options Overview

## Step 11.4: Node 2 -- Question -- "Select Output Format"

WHERE AM I?: Copilot Studio > Topics > Output Selection > Canvas (below Node 1)

1. Click "+" then "Ask a question".

2. Question text: Which output format would you like for your research deliverable?

3. Under "Identify", find and select your custom entity "Research Output Formats".

4. Click the variable name. Under "Variable name", type: varOutputFormat. Leave as Topic scope.

5. Rename to: Select Output Format

## Step 11.5: Node 3 -- Question -- "Customize Output Preferences"

WHERE AM I?: Copilot Studio > Topics > Output Selection > Canvas (below Node 2)

1. Click "+" then "Ask a question".

2. Question text: Any customization preferences? For example: which insights to prioritize, whether to include full evidence citations or summarized references, the target audience (technical team, executives, clients), or specific sections to emphasize or omit. Type "none" for default settings.

3. Under "Identify", select "User's entire response".

4. Variable name: varOutputPreferences. Leave as Topic scope.

5. Rename to: Customize Output Preferences

## Step 11.6: Node 4 -- Action -- "Generate Research Output" (Placeholder)

WHERE AM I?: Copilot Studio > Topics > Output Selection > Canvas (below Node 3)

1. Click "+" then "Send a message":

```
[ACTION PLACEHOLDER] Replace this node with an Action node calling the Generate Research Output flow. Map inputs: session_id = Global.varSessionId, output_format = Topic.varOutputFormat, output_preferences = Topic.varOutputPreferences. Capture outputs: report_url -> Topic.varReportUrl, status -> Topic.varOutputStatus, page_count -> Topic.varPageCount.
```

2. Rename to: Generate Research Output (Placeholder)

## Step 11.7: Node 5 -- Adaptive Card -- "Output Preview and Download"

WHERE AM I?: Copilot Studio > Topics > Output Selection > Canvas (below Node 4)

1. Click "+" then "Ask with Adaptive Card".

2. Paste this JSON:

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
          "text": "CHECKPOINT 5: FINAL OUTPUT REVIEW",
          "weight": "Bolder",
          "size": "Large",
          "color": "Light",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Pipeline Stage 5 of 5 -- Output Generation",
          "size": "Small",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Your research deliverable has been generated. Review the preview below and choose an action.",
      "wrap": true,
      "spacing": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Format",
          "value": "Pending flow output"
        },
        {
          "title": "Pages",
          "value": "Pending flow output"
        },
        {
          "title": "Themes Included",
          "value": "Pending flow output"
        },
        {
          "title": "Personas Included",
          "value": "Pending flow output"
        },
        {
          "title": "Insights Included",
          "value": "Pending flow output"
        }
      ]
    },
    {
      "type": "Input.ChoiceSet",
      "id": "finalDecision",
      "label": "Your Decision",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Approve and Deliver -- Save to SharePoint and send via email",
          "value": "approve"
        },
        {
          "title": "Modify -- Adjust emphasis, add sections, or change tone",
          "value": "modify"
        },
        {
          "title": "Change Format -- Regenerate in a different format",
          "value": "change_format"
        }
      ]
    },
    {
      "type": "Input.Text",
      "id": "finalNotes",
      "placeholder": "If modifying: describe what to change. If changing format: specify the new format.",
      "isMultiline": true,
      "label": "Notes (Optional)"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "SUBMIT DECISION",
      "data": {
        "cardId": "finalOutput"
      }
    }
  ]
}
```

3. Click "Save".

4. Output variables: finalDecision and finalNotes.

5. Rename to: Output Preview and Download

## Step 11.8: Node 6 -- Condition -- "Route Final Decision"

WHERE AM I?: Copilot Studio > Topics > Output Selection > Canvas (below Node 5)

1. Click "+" then "Add a condition".

2. Variable: Topic.finalDecision. Operator: is equal to. Value: approve

3. In the true branch, click "+" then "Variable management" then "Set a variable value":
   - Set variable: Global.varPipelineStatus
   - To value: completed

4. Below that, click "+" then "Send a message":

```
Research project complete.

Your deliverable has been saved to SharePoint and will be sent to your email shortly.

Session Summary:
- Session ID: {Global.varSessionId}
- Research Question: {Global.varResearchQuestion}
- Analysis Lens: {Global.varAnalysisLens}
- Pipeline Status: Completed
- All 5 checkpoints approved

The complete audit trail of your checkpoint decisions has been preserved in the session record. Thank you for using the Humans-in-Control Research Pipeline.
```

5. In the else branch, add a nested condition for "modify":
   - Variable: Topic.finalDecision. Operator: is equal to. Value: modify

6. In the modify true branch, click "+" then "Send a message":

```
Modification requested. I will regenerate the output with your adjustments. Please wait...
```

7. In the else branch (change_format), click "+" then "Send a message":

```
Format change requested. Please select your new preferred format and I will regenerate the deliverable.
```

8. Rename the outer Condition to: Route Final Decision

9. Click "Save".

## Step 11.9: Complete YAML for Output Selection Topic

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Output Selection
    triggerQueries:
      - choose output format
      - generate final report
      - export research results
      - download deliverable
      - select output type
      - create executive summary
      - make a presentation outline
      - finalize research
      - produce the report
      - generate deliverable
  actions:
    - kind: SendMessage
      id: outputOptionsOverview
      message: |-
        Output Format Options

        Three formats are available for your research deliverable:

        1. Structured Report -- Comprehensive multi-section document with all themes, personas, insights, evidence citations, and persona portraits.
        2. Executive Summary -- Condensed 2-page overview focusing on top insights and strategic recommendations.
        3. Presentation Outline -- Slide-by-slide structure with key talking points, data highlights, and speaker notes per slide.

        All formats include AI-generated persona portrait images and full evidence traceability.

    - kind: Question
      id: selectOutputFormat
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varOutputFormat
      prompt: "Which output format would you like for your research deliverable?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: structured_report
              displayName: Structured Report
            - id: executive_summary
              displayName: Executive Summary
            - id: presentation_outline
              displayName: Presentation Outline

    - kind: Question
      id: customizeOutputPreferences
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varOutputPreferences
      prompt: "Any customization preferences? For example: which insights to prioritize, whether to include full evidence citations or summarized references, the target audience (technical team, executives, clients), or specific sections to emphasize or omit. Type none for default settings."
      entity: StringPrebuiltEntity

    - kind: SendMessage
      id: generateOutputPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node calling the Generate Research Output flow. Map inputs: session_id = Global.varSessionId, output_format = Topic.varOutputFormat, output_preferences = Topic.varOutputPreferences."

    - kind: SendMessage
      id: outputCardPlaceholder
      message: "[ADAPTIVE CARD PLACEHOLDER] Replace this node with an Ask with Adaptive Card node using the Output Preview JSON from Step 11.7."

    - kind: ConditionGroup
      id: routeFinalDecision
      conditions:
        - id: isApprove
          condition: =Topic.finalDecision = "approve"
          actions:
            - kind: SetVariable
              id: setCompleted
              variable: Global.varPipelineStatus
              value: "completed"
            - kind: SendMessage
              id: projectCompleteMsg
              message: |-
                Research project complete.

                Your deliverable has been saved to SharePoint and will be sent to your email shortly.

                Session Summary:
                - Session ID: {Global.varSessionId}
                - Research Question: {Global.varResearchQuestion}
                - Analysis Lens: {Global.varAnalysisLens}
                - Pipeline Status: Completed
                - All 5 checkpoints approved

                Thank you for using the Humans-in-Control Research Pipeline.
        - id: isModify
          condition: =Topic.finalDecision = "modify"
          actions:
            - kind: SendMessage
              id: modifyMsg
              message: "Modification requested. I will regenerate the output with your adjustments. Please wait..."
      elseActions:
        - kind: SendMessage
          id: changeFormatMsg
          message: "Format change requested. Please select your new preferred format and I will regenerate the deliverable."
```

---

# PHASE 12: Generate Research Output -- FLOW BUILD (Action-by-Action)

This flow generates the final research deliverable using the Gemini API, creates persona portrait images, uploads everything to SharePoint, and returns the report URL.

## Step 12.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > HiC Research Agent Solution

1. In your solution, click "+ New" then "Automation" then "Cloud flow" then "Instant".

2. Flow name: Generate Research Output

3. Trigger: "Run a flow from Copilot". Click "Create".

## Step 12.2: Configure Trigger Inputs

WHERE AM I?: Power Automate > Flow Editor > Trigger Node

1. Input 1: Text, name = session_id, description = Research session identifier

2. Input 2: Text, name = output_format, description = Output format: Structured Report, Executive Summary, or Presentation Outline

3. Input 3: Text, name = output_preferences, description = User customization preferences for the output

## Step 12.3: Action 1 -- Get Gemini API Key

WHERE AM I?: Power Automate > Flow Editor > Below Trigger

1. Add Compose action. Paste your Gemini API key. Secure Inputs + Outputs On. Rename to: Get_Gemini_Key

## Step 12.4: Action 2 -- Retrieve Full Session from Dataverse

WHERE AM I?: Power Automate > Flow Editor > Below Action 1

1. Add "List rows" (Dataverse). Table: Research Sessions. Filter: session_id field equals the trigger's session_id input.

2. Rename to: Get_Full_Session

## Step 12.5: Action 3 -- Compose the Report Generation Prompt

WHERE AM I?: Power Automate > Flow Editor > Below Action 2

1. Add Compose action. Paste:

```
You are a research report writer. Generate a comprehensive research deliverable based on the following analysis artifacts.

OUTPUT FORMAT: {output_format}
CUSTOMIZATION: {output_preferences}

RESEARCH QUESTION: {research_question}

THEMES (with weights):
{themes_json}

PERSONAS:
{personas_json}

INSIGHTS (ranked by evidence strength):
{insights_json}

INSTRUCTIONS BY FORMAT:
- If Structured Report: Generate a multi-section document with Executive Summary, Methodology, Theme Analysis (one section per theme with evidence), Persona Profiles (one section per persona with behavioral details), Insight Matrix (ranked insights with supporting evidence), Recommendations, and Appendix (full citation list). Use markdown formatting.
- If Executive Summary: Generate a 2-page condensed overview with Top 5 Insights, Key Personas, Strategic Recommendations, and Next Steps. Focus on actionable takeaways.
- If Presentation Outline: Generate a slide-by-slide structure with Title Slide, Agenda, one slide per key insight, one slide per persona, Recommendations slide, and Q&A slide. Include speaker notes and key data points per slide.

Return the complete document text. Use markdown formatting for headers, lists, and emphasis.
```

3. Replace each {placeholder} with dynamic content from the trigger and Dataverse query results using the lightning bolt icon.

4. Rename to: Report_Generation_Prompt

## Step 12.6: Action 4 -- Escape the Report Prompt

WHERE AM I?: Power Automate > Flow Editor > Below Action 3

1. Add Compose. Expression (fx):

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(outputs('Report_Generation_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

2. Rename to: Escape_Report_Prompt

## Step 12.7: Action 5 -- Build Gemini Request Body

WHERE AM I?: Power Automate > Flow Editor > Below Action 4

1. Add Compose. Expression (fx):

**COPY-PASTE** into the Expression field:
```
concat('{"contents":[{"role":"user","parts":[{"text":"',outputs('Escape_Report_Prompt'),'"}]}],"generationConfig":{"temperature":0.1,"thinkingConfig":{"thinkingBudget":16384}}}')
```

2. Rename to: Build_Report_Request_Body

## Step 12.8: Action 6 -- Build Gemini URL

WHERE AM I?: Power Automate > Flow Editor > Below Action 5

1. Add Compose. Expression (fx):

**COPY-PASTE** into the Expression field:
```
concat('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=',outputs('Get_Gemini_Key'))
```

2. Rename to: Build_Report_Gemini_URL. Secure I/O On.

## Step 12.9: Action 7 -- HTTP POST for Report Generation

WHERE AM I?: Power Automate > Flow Editor > Below Action 6

1. Add HTTP action. Method: POST. URI: Outputs from Build_Report_Gemini_URL. Headers: Content-Type = application/json. Body: Outputs from Build_Report_Request_Body. Timeout: PT120S. Secure Inputs On.

2. Rename to: HTTP_Gemini_Generate_Report

## Step 12.10: Action 8 -- Extract Report Text

WHERE AM I?: Power Automate > Flow Editor > Below Action 7

1. Add Compose. Expression (fx):

**COPY-PASTE** into the Expression field:
```
body('HTTP_Gemini_Generate_Report')?['candidates']?[0]?['content']?['parts']?[0]?['text']
```

2. Rename to: Extract_Report_Text

## Step 12.11: Action 9 -- Save Report to SharePoint

WHERE AM I?: Power Automate > Flow Editor > Below Action 8

1. Add SharePoint "Create file" action.
   - Site Address: Your SharePoint site.
   - Folder Path: /Shared Documents/Research Projects/Reports
   - File Name: Click fx and paste: `concat(triggerBody()?['session_id'],'_research_report_',formatDateTime(utcNow(),'yyyyMMdd_HHmmss'),'.md')`
   - File Content: Click lightning bolt and select Outputs from Extract_Report_Text.

2. Rename to: Save_Report_to_SharePoint

## Step 12.12: Action 10 -- Update Dataverse Session

WHERE AM I?: Power Automate > Flow Editor > Below Action 9

1. Add Dataverse "Update a row" action.
   - Table: Research Sessions
   - Row ID: From Get_Full_Session results.
   - report_url: Click lightning bolt and select the file path or link from Save_Report_to_SharePoint.
   - status: Type: completed

2. Rename to: Update_Session_Completed

## Step 12.13: Action 11 -- Respond to the Agent

WHERE AM I?: Power Automate > Flow Editor > Below Action 10

1. Add "Respond to Copilot" with three outputs:

2. Output 1: Type = Text, Name = report_url, Value = file path from Save_Report_to_SharePoint.

3. Output 2: Type = Text, Name = status, Value = completed

4. Output 3: Type = Text, Name = output_format, Value = click lightning bolt and select output_format from trigger.

5. Async toggle: Off.

6. Click "Save".

## Step 12.14: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|-------------|-------------|-------------------|
| 1 | Get_Gemini_Key | Compose | API key, Secure I/O |
| 2 | Get_Full_Session | Dataverse List rows | Filter by session_id |
| 3 | Report_Generation_Prompt | Compose | Full prompt with dynamic content |
| 4 | Escape_Report_Prompt | Compose | 4-step escape chain |
| 5 | Build_Report_Request_Body | Compose | concat() with thinkingBudget |
| 6 | Build_Report_Gemini_URL | Compose | concat() URL, Secure I/O |
| 7 | HTTP_Gemini_Generate_Report | HTTP | POST, PT120S, Secure Inputs |
| 8 | Extract_Report_Text | Compose | candidates[0].content.parts[0].text |
| 9 | Save_Report_to_SharePoint | SharePoint Create file | /Reports/ folder |
| 10 | Update_Session_Completed | Dataverse Update row | status = completed |
| 11 | Respond to Copilot | Respond | 3 outputs, Async OFF |

---

# PHASE 13: Register Generate Research Output -- TOOL REGISTRATION

## Step 13.1: Register the Flow as an Agent Tool

WHERE AM I?: Copilot Studio > Agent Overview > Tools Section

1. Click "Add a tool" then "Power Automate flows" then find "Generate Research Output" then "Add and configure".

2. Configure:
   - Name: Generate Research Output
   - Description: Generates the final research deliverable in the requested format using all approved analysis artifacts. Supports structured report, executive summary, and presentation outline. Call this tool when the user has approved all checkpoints and wants to generate the final output.

3. Map inputs: session_id, output_format, output_preferences from conversation context.

4. Completion mode: "Don't respond (default)".

5. Click "Save".

---

# PHASE 14: Extract Personas -- FLOW BUILD (Action-by-Action)

This flow extracts distinct user personas from the corpus based on approved themes using the Gemini API.

## Step 14.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > HiC Research Agent Solution

1. Create new instant cloud flow. Name: Extract Personas. Trigger: "Run a flow from Copilot".

## Step 14.2: Configure Trigger Inputs

1. Input 1: Text, name = session_id
2. Input 2: Text, name = approved_themes (JSON string of approved themes with weights)
3. Input 3: Number, name = max_personas (default 8)

## Step 14.3: Actions 1-3 -- Get Key, Get Session, Compose Prompt

WHERE AM I?: Power Automate > Flow Editor

1. Action 1: Compose -- paste Gemini API key. Secure I/O. Rename: Get_Gemini_Key

2. Action 2: Dataverse List rows -- filter by session_id. Rename: Get_Session_Record

3. Action 3: Compose -- paste the persona extraction prompt:

```
You are a qualitative research analyst specializing in persona extraction. Based on the approved themes and source documents, identify distinct user personas or archetypes.

APPROVED THEMES (with weights):
{approved_themes}

RESEARCH QUESTION: {research_question}

MAXIMUM PERSONAS: {max_personas}

For each persona, provide:
- name: A descriptive, memorable name
- description: 2-3 sentence overview
- behavioral_patterns: Array of 3-5 observed behaviors
- motivations: Array of 2-4 core motivations
- friction_points: Array of 2-4 pain points or frustrations
- associated_themes: Array of theme names this persona connects to
- evidence_count: Number of data points supporting this persona
- distinctiveness_score: Float 0.0-1.0 indicating how unique this persona is vs others

RULES:
- Extract 3-8 distinct personas (within the max_personas limit)
- Each persona must be supported by evidence from the source documents
- Flag any personas with >60% attribute overlap
- Behavioral patterns must be specific and observable, not generic
- Return ONLY valid JSON array. No markdown, no extra text.

SOURCE DOCUMENTS:
{document_content}
```

4. Replace placeholders with dynamic content. Rename: Persona_Extraction_Prompt

## Step 14.4: Actions 4-7 -- Escape, Build Body, HTTP Call, Extract

WHERE AM I?: Power Automate > Flow Editor

1. Action 4: Compose -- escape chain on Persona_Extraction_Prompt. Rename: Escape_Persona_Prompt

2. Action 5: Compose -- escape chain on document_content from Dataverse. Rename: Escape_Persona_Documents

3. Action 6: Compose -- concat() body with thinkingBudget 16384:

**COPY-PASTE** into the Expression field:
```
concat('{"contents":[{"role":"user","parts":[{"text":"',outputs('Escape_Persona_Prompt'),'\n\n',outputs('Escape_Persona_Documents'),'"}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.1,"thinkingConfig":{"thinkingBudget":16384}}}')
```

Rename: Build_Persona_Request_Body

4. Action 7: Compose -- build Gemini URL. Secure I/O. Rename: Build_Persona_Gemini_URL

## Step 14.5: Actions 8-11 -- HTTP, Extract, Store, Respond

WHERE AM I?: Power Automate > Flow Editor

1. Action 8: HTTP POST to Gemini. PT120S timeout. Secure Inputs. Rename: HTTP_Gemini_Extract_Personas

2. Action 9: Compose -- extract response:

**COPY-PASTE** into the Expression field:
```
body('HTTP_Gemini_Extract_Personas')?['candidates']?[0]?['content']?['parts']?[0]?['text']
```

Rename: Extract_Personas_Response

3. Action 10: Dataverse Update row -- set personas_json to Outputs from Extract_Personas_Response, status to checkpoint_3_pending. Rename: Update_Session_Personas

4. Action 11: Respond to Copilot with outputs:
   - personas_json (Text) = Outputs from Extract_Personas_Response
   - status (Text) = checkpoint_3_pending
   - session_id (Text) = trigger session_id

5. Async toggle: Off. Save.

## Step 14.6: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|-------------|-------------|-------------------|
| 1 | Get_Gemini_Key | Compose | Secure I/O |
| 2 | Get_Session_Record | Dataverse List rows | Filter by session_id |
| 3 | Persona_Extraction_Prompt | Compose | Full prompt |
| 4 | Escape_Persona_Prompt | Compose | 4-step escape |
| 5 | Escape_Persona_Documents | Compose | 4-step escape |
| 6 | Build_Persona_Request_Body | Compose | concat() with thinking |
| 7 | Build_Persona_Gemini_URL | Compose | Secure I/O |
| 8 | HTTP_Gemini_Extract_Personas | HTTP | POST, PT120S |
| 9 | Extract_Personas_Response | Compose | candidates extraction |
| 10 | Update_Session_Personas | Dataverse Update row | personas_json + status |
| 11 | Respond to Copilot | Respond | 3 outputs, Async OFF |

---

# PHASE 15: Extract Personas -- TOOL REGISTRATION

## Step 15.1: Register the Flow as an Agent Tool

WHERE AM I?: Copilot Studio > Agent Overview > Tools Section

1. Click "Add a tool" then "Power Automate flows" then find "Extract Personas" then "Add and configure".

2. Configure:
   - Name: Extract Personas
   - Description: Extracts distinct user personas from the corpus guided by approved themes using Gemini API. Returns personas with behavioral patterns, motivations, friction points, and distinctiveness scores for Checkpoint 3 review. Call after themes are approved at Checkpoint 2.

3. Map inputs: session_id, approved_themes, max_personas.

4. Completion mode: "Don't respond (default)".

5. Click "Save".

---

# PHASE 16: Synthesize Insights -- FLOW BUILD (Action-by-Action)

This flow cross-references approved themes with verified personas to generate actionable insights ranked by evidence strength and business impact.

## Step 16.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > HiC Research Agent Solution

1. Create new instant cloud flow. Name: Synthesize Insights. Trigger: "Run a flow from Copilot".

## Step 16.2: Configure Trigger Inputs

1. Input 1: Text, name = session_id
2. Input 2: Text, name = approved_themes (JSON string)
3. Input 3: Text, name = verified_personas (JSON string)

## Step 16.3: Actions 1-3 -- Get Key, Get Session, Compose Prompt

WHERE AM I?: Power Automate > Flow Editor

1. Action 1: Compose -- Gemini API key. Secure I/O. Rename: Get_Gemini_Key

2. Action 2: Dataverse List rows -- filter by session_id. Rename: Get_Session_Record

3. Action 3: Compose -- insight synthesis prompt:

```
You are a strategic research analyst performing insight synthesis. Cross-reference the approved themes with verified personas to generate actionable insights.

APPROVED THEMES:
{approved_themes}

VERIFIED PERSONAS:
{verified_personas}

RESEARCH QUESTION: {research_question}

For each insight, provide:
- insight_title: Concise, actionable insight statement
- description: 2-3 sentence explanation
- evidence_strength: Float 0.0-1.0 based on supporting data density
- business_impact: String (high/medium/low) with brief justification
- supporting_themes: Array of theme names that contribute to this insight
- supporting_personas: Array of persona names affected by this insight
- supporting_quotes: Array of 1-3 exact quotes from source data
- recommended_actions: Array of 1-3 specific, actionable recommendations

RULES:
- Generate 5-15 insights ranked by composite score (evidence_strength * impact_weight)
- Each insight must be supported by at least 2 themes and 1 persona
- Business impact must be justified with specific reasoning
- Recommended actions must be concrete and implementable
- Return ONLY valid JSON array. No markdown, no extra text.

SOURCE DOCUMENTS:
{document_content}
```

4. Replace placeholders with dynamic content. Rename: Insight_Synthesis_Prompt

## Step 16.4: Actions 4-8 -- Escape, Build, HTTP, Extract, Store

WHERE AM I?: Power Automate > Flow Editor

1. Action 4: Compose -- escape chain on prompt. Rename: Escape_Insight_Prompt

2. Action 5: Compose -- escape chain on document content. Rename: Escape_Insight_Documents

3. Action 6: Compose -- concat() body:

**COPY-PASTE** into the Expression field:
```
concat('{"contents":[{"role":"user","parts":[{"text":"',outputs('Escape_Insight_Prompt'),'\n\n',outputs('Escape_Insight_Documents'),'"}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.1,"thinkingConfig":{"thinkingBudget":16384}}}')
```

Rename: Build_Insight_Request_Body

4. Action 7: Compose -- Gemini URL. Secure I/O. Rename: Build_Insight_Gemini_URL

5. Action 8: HTTP POST. PT120S. Secure Inputs. Rename: HTTP_Gemini_Synthesize_Insights

## Step 16.5: Actions 9-11 -- Extract, Update Dataverse, Respond

WHERE AM I?: Power Automate > Flow Editor

1. Action 9: Compose -- extract:

**COPY-PASTE** into the Expression field:
```
body('HTTP_Gemini_Synthesize_Insights')?['candidates']?[0]?['content']?['parts']?[0]?['text']
```

Rename: Extract_Insights_Response

2. Action 10: Dataverse Update row -- insights_json = Outputs from Extract_Insights_Response, status = checkpoint_4_pending. Rename: Update_Session_Insights

3. Action 11: Respond to Copilot:
   - insights_json (Text) = Outputs from Extract_Insights_Response
   - status (Text) = checkpoint_4_pending
   - session_id (Text) = trigger session_id

4. Async OFF. Save.

## Step 16.6: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|-------------|-------------|-------------------|
| 1 | Get_Gemini_Key | Compose | Secure I/O |
| 2 | Get_Session_Record | Dataverse List rows | Filter by session_id |
| 3 | Insight_Synthesis_Prompt | Compose | Cross-reference prompt |
| 4 | Escape_Insight_Prompt | Compose | 4-step escape |
| 5 | Escape_Insight_Documents | Compose | 4-step escape |
| 6 | Build_Insight_Request_Body | Compose | concat() with thinking |
| 7 | Build_Insight_Gemini_URL | Compose | Secure I/O |
| 8 | HTTP_Gemini_Synthesize_Insights | HTTP | POST, PT120S |
| 9 | Extract_Insights_Response | Compose | candidates extraction |
| 10 | Update_Session_Insights | Dataverse Update row | insights_json + status |
| 11 | Respond to Copilot | Respond | 3 outputs, Async OFF |

---

# PHASE 17: Synthesize Insights -- TOOL REGISTRATION

## Step 17.1: Register the Flow as an Agent Tool

WHERE AM I?: Copilot Studio > Agent Overview > Tools Section

1. Click "Add a tool" then "Power Automate flows" then find "Synthesize Insights" then "Add and configure".

2. Configure:
   - Name: Synthesize Insights
   - Description: Cross-references approved themes with verified personas to generate ranked actionable insights using Gemini API. Returns insight matrix with evidence strength and business impact for Checkpoint 4 review. Call after personas are approved at Checkpoint 3.

3. Map inputs: session_id, approved_themes, verified_personas.

4. Completion mode: "Don't respond (default)".

5. Click "Save".

---

# PHASE 18: Rollback to Checkpoint -- FLOW BUILD (Action-by-Action)

This flow rolls back the research session to a previous checkpoint, clearing all analysis artifacts generated after that point.

## Step 18.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > HiC Research Agent Solution

1. Create new instant cloud flow. Name: Rollback to Checkpoint. Trigger: "Run a flow from Copilot".

## Step 18.2: Configure Trigger Inputs

1. Input 1: Text, name = session_id
2. Input 2: Number, name = target_checkpoint (1-4)

## Step 18.3: Action 1 -- Get Session Record

WHERE AM I?: Power Automate > Flow Editor

1. Add Dataverse "List rows". Table: Research Sessions. Filter by session_id. Rename: Get_Session_For_Rollback

## Step 18.4: Action 2 -- Switch on Target Checkpoint

WHERE AM I?: Power Automate > Flow Editor > Below Action 1

1. Add a "Switch" control action. In the "On" field, click lightning bolt and select "target_checkpoint" from the trigger.

**Case 1 (Rollback to Checkpoint 1):**

2. Equals: 1

3. Inside this case, add Dataverse "Update a row":
   - Table: Research Sessions
   - Row ID: From Get_Session_For_Rollback
   - status: checkpoint_1_approved
   - themes_json: Click fx, type `Text("")`, click "Done" (clears the field)
   - personas_json: Click fx, type `Text("")`, click "Done"
   - insights_json: Click fx, type `Text("")`, click "Done"
   - report_url: Click fx, type `Text("")`, click "Done"

4. Rename to: Rollback_To_Checkpoint_1

**Case 2 (Rollback to Checkpoint 2):**

5. Add new case. Equals: 2

6. Add Dataverse "Update a row":
   - status: checkpoint_2_pending
   - personas_json: Clear with `Text("")`
   - insights_json: Clear with `Text("")`
   - report_url: Clear with `Text("")`
   - (Keep themes_json intact)

7. Rename to: Rollback_To_Checkpoint_2

**Case 3 (Rollback to Checkpoint 3):**

8. Add new case. Equals: 3

9. Add Dataverse "Update a row":
   - status: checkpoint_3_pending
   - insights_json: Clear with `Text("")`
   - report_url: Clear with `Text("")`
   - (Keep themes_json and personas_json intact)

10. Rename to: Rollback_To_Checkpoint_3

**Case 4 (Rollback to Checkpoint 4):**

11. Add new case. Equals: 4

12. Add Dataverse "Update a row":
    - status: checkpoint_4_pending
    - report_url: Clear with `Text("")`
    - (Keep themes_json, personas_json, and insights_json intact)

13. Rename to: Rollback_To_Checkpoint_4

**Default case:**

14. In the Default case, add a Compose action with value: invalid_checkpoint. Rename: Invalid_Checkpoint

## Step 18.5: Action 3 -- Respond to the Agent

WHERE AM I?: Power Automate > Flow Editor > Below the Switch

1. Add "Respond to Copilot" with outputs:

2. Output 1: Type = Text, Name = status, Value = Click fx and paste: `concat('rolled_back_to_checkpoint_',string(triggerBody()?['target_checkpoint']))`

3. Output 2: Type = Text, Name = session_id, Value = trigger session_id

4. Async toggle: Off. Save.

## Step 18.6: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|-------------|-------------|-------------------|
| 1 | Get_Session_For_Rollback | Dataverse List rows | Filter by session_id |
| 2 | Switch | Control | On target_checkpoint |
| 2a | Rollback_To_Checkpoint_1 | Dataverse Update row | Clear themes, personas, insights, report |
| 2b | Rollback_To_Checkpoint_2 | Dataverse Update row | Clear personas, insights, report |
| 2c | Rollback_To_Checkpoint_3 | Dataverse Update row | Clear insights, report |
| 2d | Rollback_To_Checkpoint_4 | Dataverse Update row | Clear report |
| 2e | Invalid_Checkpoint | Compose | Error value |
| 3 | Respond to Copilot | Respond | 2 outputs, Async OFF |

---

# PHASE 19: Rollback to Checkpoint -- TOOL REGISTRATION

## Step 19.1: Register the Flow as an Agent Tool

WHERE AM I?: Copilot Studio > Agent Overview > Tools Section

1. Click "Add a tool" then "Power Automate flows" then find "Rollback to Checkpoint" then "Add and configure".

2. Configure:
   - Name: Rollback to Checkpoint
   - Description: Rolls back the research session to a previous checkpoint, discarding analysis artifacts generated after that point. Call when the user explicitly requests a rollback to re-run analysis with different parameters. Requires session_id and target checkpoint number (1-4).

3. Map inputs: session_id, target_checkpoint.

4. Completion mode: "Don't respond (default)".

5. Click "Save".

---

# PHASE 20: Publish and Deploy to Teams

## Step 20.1: Publish the Agent

WHERE AM I?: Copilot Studio > Agent Overview

1. In Copilot Studio, click the "Publish" button at the top of the Overview page.

2. In the confirmation dialog, click "Publish" again.

3. Wait for the green "Published successfully" banner. This may take 1-2 minutes.

> **CRITICAL**: Event triggers and tool registrations only become active after publishing. Conversational features work in the test pane before publishing, but the full pipeline requires this step.

## Step 20.2: Deploy to Microsoft Teams

WHERE AM I?: Copilot Studio > Channels tab

1. After publishing, click the "Channels" tab in the top navigation.

2. Click the "Teams and Microsoft 365 Copilot" tile.

3. Click "Add channel".

4. A panel opens. Click "See agent in Teams" -- this opens Microsoft Teams and prompts you to install the agent.

5. In Teams, click "Add" to install the agent in your chat.

6. To share with your research team:
   - Click "Availability options" in the Copilot Studio channel panel then "Submit for admin approval".
   - Your Teams admin goes to Teams Admin Center then Apps then finds your agent then clicks "Publish".

## Step 20.3: Configure Email Delivery

WHERE AM I?: Copilot Studio > Agent Overview

1. The agent sends email notifications through the Generate Research Output flow. The flow uses the Office 365 Outlook connector. If you want to add email delivery, add an "Office 365 Outlook - Send an email (V2)" action at the end of the Generate Research Output flow (after the Respond to Copilot action, so it runs asynchronously).

2. Configure the email action:
   - To: The signed-in user's email (use System.User.Email if available, or add a userEmail trigger input)
   - Subject: Research Report Complete - then the session_id
   - Body: Include the report URL and session summary

---

# PHASE 21: Testing (5+ Scenarios)

## Step 21.1: Test Scenario 1 -- Complete Pipeline Happy Path

WHERE AM I?: Microsoft Teams > Chat with Humans-in-Control Research Analyst

1. Open Teams and find the Humans-in-Control Research Analyst in your chat.

2. Type: start new research

3. Expected: The agent presents the pipeline introduction and asks for your research question.

4. Type: Analyze customer feedback patterns from our Q4 2025 survey data

5. Expected: The agent asks for document uploads.

6. Upload 2-3 test documents to the SharePoint /Research Projects/Inputs/ folder, then type: done

7. Expected: The agent asks for analysis depth. Type: Standard

8. Expected: The agent asks for analysis lens. Type: General Ethnography

9. Expected: The Ingest Research Documents flow runs. The agent presents Checkpoint 1 Adaptive Card with document count, word count, and coverage assessment.

10. Click "Approve" on the Checkpoint 1 card.

11. Expected: The agent confirms approval and advances to Theme Discovery. The Run Theme Discovery flow runs. Themes are presented for review.

## Step 21.2: Test Scenario 2 -- Checkpoint Rollback

1. After reaching Checkpoint 3 (Persona Extraction), type: roll back to checkpoint 2

2. Expected: The Rollback to Checkpoint flow runs. The agent confirms that personas and insights have been cleared, and the session is back at Checkpoint 2 (Theme Discovery).

3. Type: review checkpoint

4. Expected: The agent presents the themes again for re-review.

## Step 21.3: Test Scenario 3 -- Theme Weighting Adjustments

1. After Checkpoint 2 themes are presented, type: adjust theme weights

2. Expected: The Theme Weighting topic activates. The Adaptive Card with weight adjustment options appears.

3. Select "Adjust Weights" and type: Increase Customer Frustration to 2.5, decrease Product Features to 0.5

4. Expected: The agent confirms the weight adjustments and presents the updated theme list.

## Step 21.4: Test Scenario 4 -- Persona Merge

1. After Checkpoint 3 personas are presented, type: verify personas

2. Expected: The Persona Verification topic activates with the review dashboard.

3. Select "Merge Personas" and type: Merge the Frustrated Newcomer and Confused First-Timer personas -- they seem to describe the same user type

4. Expected: The agent processes the merge and presents the updated persona set with recalculated distinctiveness scores.

## Step 21.5: Test Scenario 5 -- Output Format Change

1. After all checkpoints are approved, type: generate final report

2. Expected: The Output Selection topic activates. Select "Executive Summary".

3. After the output is generated, select "Change Format" on the Checkpoint 5 card.

4. Expected: The agent asks for the new format. Type: Presentation Outline

5. Expected: The agent regenerates the output in presentation outline format.

## Step 21.6: Test Scenario 6 -- Insufficient Data Handling

1. Start a new research project with an empty Inputs folder (no documents).

2. Expected: The agent should warn that no documents were found and the data quality check fails. The Condition node routes to the failure message.

---

# PHASE 22: Troubleshooting Reference

| Symptom | Resolution |
|---------|------------|
| Agent does not respond to any query | Verify generative orchestration is enabled (Step 1.6). Confirm the agent is published (Step 20.1). Check that at least one knowledge source is connected with a green checkmark. |
| Agent says "I could not find information" | Your SharePoint library may be empty or the user does not have permissions. Upload test documents to the Research Projects/Inputs folder. Check that the knowledge source description accurately describes the content. |
| Checkpoint Adaptive Card does not appear | Verify the topic is saved and enabled. Check trigger phrases include the exact phrase you typed. Test by typing the exact phrase "review checkpoint" in the test pane. |
| Global.varSessionId is empty | Confirm the variable is set as Global in the Variable properties panel (Usage = "Global (any topic can access)"). Verify the Conversation Start topic initializes it with Text(""). |
| Power Automate flow fails with 400 error | The JSON body sent to Gemini is malformed. Check that the 4-step escape chain is applied to ALL dynamic content embedded in the JSON body. Open the flow run history and inspect the HTTP action's input body for unescaped quotes or newlines. |
| Gemini API returns 403 Forbidden | Your API key may be expired, incorrect, or not enabled for the model. Go to https://aistudio.google.com and verify the key. Ensure gemini-3-pro-preview is available in your region. |
| Flow times out after 30 seconds | You forgot to set the HTTP action timeout to PT120S. Open the HTTP action, click (...) then Settings, and set Timeout to PT120S. |
| Dataverse "Add a new row" fails | Verify the table name and column schema names match exactly. Dataverse column names use the publisher prefix (nxth_) in expressions. Check that the session_id value is not empty. |
| Rollback does not clear artifacts | Verify the Switch cases in the Rollback flow use the correct case values (1, 2, 3, 4 as numbers, not strings). Check that the Update row action clears the correct fields for each checkpoint level. |
| Theme count validation fails | The Gemini API may return fewer than 5 themes for sparse corpora. Add more documents or lower the min_themes parameter. Check the analysis_depth parameter -- "Quick" may produce fewer themes. |
| Persona distinctiveness scores are all low | The source documents may not contain enough behavioral differentiation. Consider using a different analysis lens (Behavioral Psychology) or adding interview transcripts with richer behavioral data. |
| Agent advances past checkpoint without approval | Check the Condition nodes in each topic. The condition must check for the exact string value (e.g., "approve"). Verify the Adaptive Card's Input.ChoiceSet values match the condition values exactly. |

---

# PHASE 23: Architecture Summary and Verification Checklist

## Architecture Summary

```
USER (Teams)
  |
  v
COPILOT STUDIO AGENT (Generative Orchestration, GPT-5 Chat)
  |
  +-- Research Setup Topic
  |     |-- Collects: question, docs, depth, lens
  |     |-- Calls: Ingest Research Documents flow
  |     |-- Presents: Checkpoint 1 (Adaptive Card)
  |
  +-- Checkpoint Review Topic
  |     |-- Universal handler for checkpoints 2-5
  |     |-- Presents: Findings + Approve/Revise/Rollback
  |     |-- Calls: Next stage flow or Rollback flow
  |
  +-- Theme Weighting Topic
  |     |-- Adjusts weights 0.1-3.0
  |     |-- Merge/Split/Add/Remove themes
  |
  +-- Persona Verification Topic
  |     |-- Reviews persona attributes
  |     |-- Flags >60% similarity overlap
  |     |-- Edit/Merge/Split/Remove personas
  |
  +-- Output Selection Topic
        |-- Selects format (Report/Summary/Presentation)
        |-- Calls: Generate Research Output flow
        |-- Presents: Checkpoint 5 (final approval)
  |
  v
POWER AUTOMATE FLOWS (6 total)
  |
  +-- Ingest Research Documents --> Gemini API + Dataverse
  +-- Run Theme Discovery -------> Gemini API + Dataverse
  +-- Extract Personas ----------> Gemini API + Dataverse
  +-- Synthesize Insights -------> Gemini API + Dataverse
  +-- Generate Research Output --> Gemini API + SharePoint
  +-- Rollback to Checkpoint ----> Dataverse (clear artifacts)
  |
  v
EXTERNAL SERVICES
  |
  +-- Google Gemini API (gemini-3-pro-preview)
  |     Temperature: 0.1, thinkingBudget: 16384
  |
  +-- Dataverse (Research Sessions table)
  |     14 columns, full pipeline state
  |
  +-- SharePoint (Research Projects Library)
        6 subfolders: Inputs, Themes, Personas,
        Insights, Reports, Portraits
```

## Credit Consumption Estimate

| Action | Credits per Occurrence | Estimated Occurrences per Project | Total Credits |
|--------|----------------------|----------------------------------|---------------|
| Generative answer (orchestration) | 2 | 20 conversation turns | 40 |
| Agent action (tool call) | 5 | 8 flow calls (avg) | 40 |
| Agent flow execution (per 100 actions) | 13 | 6 flows x ~15 actions each | 78 |
| Knowledge source query | 2 | 5 queries | 10 |
| **Total per research project** | | | **~168 credits** |
| **Projects per $200 pack (25,000 credits)** | | | **~149 projects** |

## Post-Build Verification Checklist

1. [ ] Agent name is "Humans-in-Control Research Analyst" and appears in the top-left corner
2. [ ] Generative orchestration is enabled (Settings > Generative AI > Orchestration = Yes)
3. [ ] General knowledge is disabled (Settings > Generative AI > Allow general knowledge = Off)
4. [ ] Knowledge strictness is set to "High"
5. [ ] Research Projects Library (SharePoint) knowledge source shows green checkmark
6. [ ] Research Sessions Table (Dataverse) knowledge source shows green checkmark
7. [ ] All 4 global variables initialized in Conversation Start: varResearchQuestion, varSessionId, varPipelineStatus, varAnalysisLens
8. [ ] All 5 custom topics are saved and enabled: Research Setup, Checkpoint Review, Theme Weighting, Persona Verification, Output Selection
9. [ ] All 3 custom entities are created with Smart Matching enabled: Research Depth Levels, Research Output Formats, Analysis Lens
10. [ ] Environment variable nxth_GeminiApiKey exists in the solution with a Secret value set
11. [ ] All 6 Power Automate flows are saved and published: Ingest Research Documents, Run Theme Discovery, Extract Personas, Synthesize Insights, Generate Research Output, Rollback to Checkpoint
12. [ ] All 6 flows are registered as tools in the agent's Tools section
13. [ ] Every HTTP action in every flow has Secure Inputs enabled
14. [ ] Every Compose action containing the API key has Secure Inputs and Secure Outputs enabled
15. [ ] Every HTTP action has timeout set to PT120S
16. [ ] Every "Respond to Copilot" action has Asynchronous Response set to Off
17. [ ] The Dataverse Research Sessions table has all 14 columns created
18. [ ] SharePoint has all 6 subfolders: Inputs, Themes, Personas, Insights, Reports, Portraits
19. [ ] The agent is published (green "Published successfully" banner)
20. [ ] The agent is deployed to Teams and accessible in chat
21. [ ] Test Scenario 1 (happy path) completes successfully through all 5 checkpoints
22. [ ] Test Scenario 2 (rollback) correctly clears artifacts and resets status
23. [ ] Adaptive Cards render correctly in Teams (v1.5 schema)

---

## Conclusion

This recipe produces a production-grade human-in-the-loop research analysis agent without writing application code. The three most consequential design decisions are:

1. **Mandatory human checkpoints at every pipeline stage**: The agent NEVER advances past a checkpoint without explicit human approval. This is enforced by Condition nodes in topics that check for the exact "approve" value from Adaptive Card submissions, and by Dataverse session status tracking that prevents flows from executing out of sequence.

2. **Dataverse session state for full resumability**: Every analysis artifact (documents, themes, personas, insights, report URL) is stored in a single Dataverse row keyed by session_id. If a conversation is interrupted (Teams timeout, browser crash, user goes to lunch), the researcher can resume by typing "review checkpoint" and the agent retrieves the full session state. The Rollback flow can surgically clear artifacts after any checkpoint while preserving earlier work.

3. **Direct Gemini API calls with extended thinking**: All analysis flows call the Gemini API directly via HTTP actions with thinkingBudget: 16384 tokens and temperature: 0.1. The extended thinking budget gives the model more internal reasoning capacity for complex qualitative analysis, while the low temperature ensures consistent, reproducible results across runs. The 4-step escape chain on all dynamic content prevents JSON body corruption that would cause silent 400 errors.

The architecture can be extended with persona portrait generation (gemini-3-pro-image-preview), video storyboard clips (veo-3.1-generate-preview), and multi-agent delegation to specialized analysis agents in future iterations.