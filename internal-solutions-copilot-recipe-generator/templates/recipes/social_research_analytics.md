

# Social Research Analyst -- Definitive Build Recipe for Copilot Studio

This recipe walks you through every click, field, toggle, and configuration needed to build a Social Research Analyst agent in Microsoft Copilot Studio. The agent analyzes social media datasets by calling the Anthropic Claude API directly from Power Automate flows, discovering themes via intelligent topic extraction, measuring sentiment, performing semantic search, and presenting results through interactive Adaptive Cards. The agent stores analysis sessions in Dataverse, delivers results via Teams and email, and uses Claude claude-sonnet-4-6 for all NLP processing -- achieving equivalent business outcomes to Python ML pipelines (BERTopic, VADER, pgvector) through a Power Automate-native approach. Written for absolute beginners in Copilot Studio -- no step is assumed.

---

## Architecture Diagram

```
+------------------------------------------------------------------+
|                     USER (Teams / Web Chat)                       |
+------------------------------------------------------------------+
        |                    |                   |              |
        v                    v                   v              v
+---------------+  +-----------------+  +-------------+  +------------+
| Topic         |  | Sentiment       |  | Semantic    |  | Results    |
| Analysis      |  | Analysis        |  | Search      |  | Review     |
| Request       |  |                 |  |             |  |            |
| (Topic)       |  | (Topic)         |  | (Topic)     |  | (Topic)    |
+-------+-------+  +--------+--------+  +------+------+  +-----+------+
        |                    |                  |               |
        v                    v                  v               v
+-------+-------+  +--------+--------+  +------+------+  +-----+------+
| Run Topic     |  | Run Sentiment   |  | Semantic    |  | Get Topic  |
| Modeling      |  | Analysis        |  | Search      |  | Results /  |
| (Agent Flow)  |  | (Agent Flow)    |  | (Agent Flow)|  | Get Sent.  |
+-------+-------+  +--------+--------+  +------+------+  | Results    |
        |                    |                  |         | (Agent     |
        v                    v                  v         | Flows)     |
+-------+-------+  +--------+--------+  +------+------+  +-----+------+
| Check Analysis|  | Check Analysis  |  |             |        |
| Status        |  | Status          |  |             |        |
| (Agent Flow)  |  | (Agent Flow)    |  |             |        |
+-------+-------+  +--------+--------+  |             |        |
        |                    |           |             |        |
        v                    v           v             v        v
+------------------------------------------------------------------+
|              Anthropic Claude API (claude-sonnet-4-6)              |
|              POST https://api.anthropic.com/v1/messages           |
+------------------------------------------------------------------+
        |                    |                  |               |
        v                    v                  v               v
+------------------------------------------------------------------+
|                  Dataverse: Social Analyses Table                  |
|  (analysis_id, status, posts_url, topics_json, sentiment_json)   |
+------------------------------------------------------------------+
        |                                                      |
        v                                                      v
+---------------------------+          +---------------------------+
| SharePoint                |          | Delivery                  |
| /Analysis Guides          |          | - Teams Adaptive Card     |
| /Analysis Results         |          | - Email (Outlook)         |
+---------------------------+          +---------------------------+
```

**Data Flow Summary:**
1. User sends a request via Teams or Web Chat
2. Copilot Studio generative orchestrator selects the appropriate topic based on description matching
3. The topic collects parameters via Question nodes and Adaptive Cards
4. Action nodes call Agent Flows (Power Automate cloud flows)
5. Each Agent Flow calls the Anthropic Claude API via HTTP POST with the dataset and analysis prompt
6. Claude returns structured JSON (topics, sentiment scores, search results)
7. Results are stored in Dataverse and returned to the topic
8. The topic displays results via Adaptive Cards and offers export to SharePoint

---

## Prerequisites -- What You Need Before Starting

Before you begin building, confirm you have the following:

1. A Microsoft 365 work or school account with a license that includes Copilot Studio (typically Microsoft 365 E3/E5 or a standalone Copilot Studio license). If you are not sure, ask your IT admin.

2. Access to Power Automate at https://make.powerautomate.com -- sign in and confirm you can see the home page.

3. Access to Power Apps maker portal at https://make.powerapps.com -- sign in and confirm you can see the home page.

4. A SharePoint site where you can create document libraries and folders. You need at least "Edit" permissions on this site. The recipe uses a site called ResearchHub (e.g., https://yourcompany.sharepoint.com/sites/ResearchHub).

5. An Anthropic API key for Claude claude-sonnet-4-6. This key starts with sk-ant-... and you can obtain it from https://console.anthropic.com. This is the only external API key required for this agent.

6. Microsoft Teams installed (desktop or web) for testing the agent.

7. A SharePoint document library at /sites/ResearchHub/Shared Documents/Analysis Guides containing documentation on social media analysis methodology. If you do not have this yet, create the folder structure -- you can add documents later.

8. Social media datasets in JSON format (arrays of posts with text, score, author, created_utc fields) collected by the Social Data Collector agent or any equivalent tool. You need at least one dataset with 50+ posts for testing.

---

## Component Summary Table

| Component | Type | Name | Purpose |
|---|---|---|---|
| Topic 1 | Custom Topic | Topic Analysis Request | Collects parameters and runs theme discovery |
| Topic 2 | Custom Topic | Sentiment Analysis | Measures positive/neutral/negative sentiment |
| Topic 3 | Custom Topic | Semantic Search | Natural language search across posts |
| Topic 4 | Custom Topic | Results Review | View, drill into, and export completed analyses |
| Flow 1 | Agent Flow | Run Topic Modeling | Sends posts to Claude for theme extraction |
| Flow 2 | Agent Flow | Check Analysis Status | Polls Dataverse for job completion status |
| Flow 3 | Agent Flow | Get Topic Results | Retrieves completed topic analysis from Dataverse |
| Flow 4 | Agent Flow | Run Sentiment Analysis | Sends posts to Claude for sentiment classification |
| Flow 5 | Agent Flow | Get Sentiment Results | Retrieves completed sentiment results from Dataverse |
| Flow 6 | Agent Flow | Semantic Search | Sends query + posts to Claude for relevance ranking |
| Knowledge 1 | SharePoint | Analysis Methodology Guides | BERTopic, VADER, and analysis best practices |
| Knowledge 2 | Website URL | BERTopic Documentation | Official BERTopic reference documentation |
| Entity 1 | Closed List | Analysis Types | Quick / Standard / Deep analysis depth options |
| Dataverse Table | Table | Social Analyses | Stores all analysis sessions and results |
| Env Variable | Secret | nxth_AnthropicApiKey | Anthropic Claude API key |

---

# PHASE 1: Create the Social Research Analyst Agent

This phase creates the agent shell, configures generative orchestration, writes the complete agent instructions, sets up system topics, and creates the Power Platform solution with the required environment variable.

## Step 1.1: Sign In to Copilot Studio and Create a Blank Agent

WHERE AM I?: Browser > https://copilotstudio.microsoft.com > Home

1. Open your browser and navigate to https://copilotstudio.microsoft.com.

2. Sign in with your Microsoft 365 work or school account. You will land on the Copilot Studio home page.

3. In the left navigation pane, click Agents.

4. Click the Create blank agent button. If you want to change advanced settings like the solution or schema name, click the small down arrow (v) next to the button and select Advanced create, then click Confirm and create. For most users, just clicking the main button is fine.

5. A new agent opens on the Overview page. This is your agent's home base -- it has sections for Details, Instructions, Knowledge, Tools, Suggested Prompts, and Channels.

> **VERIFY**: Confirm you see the Overview page with the agent name in the top-left corner and sections for Details, Instructions, Knowledge, and Tools.

## Step 1.2: Set the Agent Name, Description, and Icon

WHERE AM I?: Copilot Studio > Agents > [New Agent] > Overview > Details

1. On the Overview page, find the Details section near the top. Click the Edit (pencil) icon.

2. In the Name field, delete the default name and type: Social Research Analyst

3. In the Description field (max 1,024 characters), paste the following:

```
Social media analytics agent that discovers themes, measures sentiment, and performs semantic search across collected social data. Calls the Anthropic Claude API directly from Power Automate flows for intelligent NLP processing. Supports topic modeling with configurable depth (Quick/Standard/Deep), VADER-equivalent sentiment scoring, and relevance-ranked semantic search. Stores analysis sessions in Dataverse and delivers results via Teams Adaptive Cards and email. Requires a minimum of 50 posts per dataset for meaningful analysis.
```

4. To change the agent's icon: click the agent icon in the top-left area of the page, then click Change icon, then upload a 192 x 192 pixel PNG image (max 72 KB). Use a professional icon that represents data analytics or research.

5. Click Save at the top of the page. Wait for the green "Saved successfully" banner.

## Step 1.3: Enable Generative Orchestration

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview > Details > Orchestration

1. Still in the Details section of the Overview page, look for the Orchestration area.

2. Find the toggle labeled "Use generative AI to determine how best to respond to users and events".

3. Make sure this is set to Yes (toggled on). New agents usually default to this, but verify it.

4. What this does: Instead of requiring you to manually define exact trigger phrases for every possible user question, generative orchestration uses an AI planner to dynamically decide which topics, tools, and knowledge sources to use for each request. This is essential for an agent that needs to handle varied research queries like "what are people talking about" or "how do users feel about the new feature."

> **BEGINNER TIP**: Generative orchestration means the agent reads the descriptions you write for each topic and tool, then decides which one to use based on what the user said. This is why writing clear, specific descriptions is so important -- they are the routing instructions for the AI planner.

> **CRITICAL**: This is an architectural decision. Generative orchestration is the correct choice for this agent because users will ask varied, unpredictable questions across multiple analysis types. Classic orchestration would require predicting every possible phrasing, which is impractical for research queries.

## Step 1.4: Write the Agent Instructions

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview > Instructions

1. On the Overview page, find the Instructions section. Click Edit.

2. You will see a large text field (max 8,000 characters). Delete any default text and paste the following:

```
[PERSONA]
You are the Social Research Analyst, an advanced analytics agent built by NXT Humans specializing in natural language processing of social media data. Your tone is analytical, methodical, and data-driven. You explain statistical concepts in accessible terms without oversimplifying. You proactively highlight unexpected findings, outlier topics, and sentiment shifts. You always ground claims in the data and cite specific post counts and confidence scores. You never fabricate data or make causal claims from correlational data -- use language like "associated with" rather than "caused by."

[CHAIN-OF-THOUGHT REASONING]
For every analysis request, reason step-by-step before responding:
1. Verify that a dataset exists and meets minimum requirements (50+ posts, max 500 per batch recommended).
2. Identify the analysis type requested: topic modeling, sentiment analysis, semantic search, or results review.
3. For topic modeling: call the Run Topic Modeling flow with the dataset reference, analysis depth, and summarization model override. Always use claude-sonnet-4-6 as the summarization model.
4. For sentiment analysis: determine scope (full dataset or specific topics). If topic-scoped, verify a completed topic modeling job exists first.
5. For semantic search: accept the natural language query and dataset reference, call the Semantic Search flow.
6. Present results with precise numbers: post counts, percentages, confidence scores, and representative quotes.
7. Cross-reference topics with sentiment when both analyses are available to identify which themes drive positive vs. negative discourse.

[OUTPUT FORMAT]
Present results using structured data. Topic lists include: rank, topic label, document count, percentage share, top keywords, and average sentiment. Sentiment results show: distribution (positive/neutral/negative percentages) with representative quotes. Always include a high-level executive summary before detailed breakdowns.

When generating structured analysis output, return JSON with these keys:
- analysis_type (string): "topic_modeling" or "sentiment" or "semantic_search"
- summary (string): 2-3 sentence executive summary
- results (array): detailed findings
- metadata: {model_used, processing_time, document_count, dataset_id}

[CONSTRAINTS]
- Only answer questions related to social media data analysis, topic modeling, sentiment analysis, and semantic search.
- Minimum dataset size for meaningful topic modeling is 50 posts. Warn users if their dataset is smaller.
- Maximum recommended batch size is 500 posts per Claude API call to stay within context limits.
- Always report confidence scores and sample sizes alongside percentages.
- Do not make causal claims from correlational data.
- If no dataset is available, respond: "No dataset found. Please provide a SharePoint URL pointing to a JSON dataset collected by the Social Data Collector agent, or upload a dataset to the Analysis Results library."
- Never provide personal opinions about social media content. Report what the data shows.

[FEW-SHOT EXAMPLE]
User: "Run topic analysis on the Reddit dataset from last week"
Expected behavior:
1. Retrieve the dataset from SharePoint
2. Validate post count (must be >= 50)
3. Ask for analysis depth (Quick/Standard/Deep)
4. Call Run Topic Modeling flow with claude-sonnet-4-6
5. Poll status until complete
6. Present results:

{
  "analysis_type": "topic_modeling",
  "summary": "Discovered 12 distinct topics across 847 Reddit posts. The dominant theme is 'Product Quality Issues' (23.4% of posts), followed by 'Customer Service Experience' (18.1%). Notably, 'Pricing Concerns' shows the highest negative sentiment correlation.",
  "results": [
    {
      "rank": 1,
      "topic_name": "Product Quality Issues",
      "post_count": 198,
      "percentage": 23.4,
      "keywords": ["defective", "broken", "quality", "warranty", "replacement"],
      "confidence": 0.87,
      "representative_quote": "Third time this year the product arrived damaged..."
    }
  ],
  "metadata": {
    "model_used": "claude-sonnet-4-6",
    "processing_time_seconds": 45,
    "document_count": 847,
    "dataset_id": "reddit_2026_w05"
  }
}
```

3. Click Save at the top of the page.

> **VERIFY**: The instructions text should be well under the 8,000-character limit. You can check the character count by selecting all text in the field and checking your browser's character count (or paste into a text editor first).

## Step 1.5: Disable General Knowledge

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Settings (gear icon) > Generative AI

1. Click the Settings gear icon at the very top of the Copilot Studio page (not the Details section -- the gear icon in the top navigation bar).

2. In the settings panel, click Generative AI in the left menu.

3. Find the toggle "Allow the AI to use its own general knowledge" and set it to Off.

4. What this does: Forces the agent to answer exclusively from your connected knowledge sources and flow outputs. This prevents the agent from making up plausible-sounding analysis results from its training data.

5. Click Save and close the settings panel.

## Step 1.6: Configure System Topics

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > System

1. Click the Topics tab in the top navigation bar of Copilot Studio.

2. You will see two subtabs: Custom and System. Click the System subtab.

3. You will see a list of system topics. Configure each one:

**Conversation Start:**

4. Click Conversation Start to open the topic authoring canvas.

5. You will see a trigger node ("Conversation Start") connected to a Message node. First, click the + button to add a node before the greeting message.

6. Select Variable management, then Set a variable value.

7. In the "Set variable" node, click the box under "Set variable" and select Create a new variable. A new variable appears with a default name (e.g., Var1) and type Unknown.

8. Click the variable name. The Variable properties panel opens on the right side. Under Variable name, type varAnalysisId (without the Global. prefix). Under Usage, select "Global (any topic can access)". The variable name automatically becomes Global.varAnalysisId.

9. In the To value field, click the formula icon (fx), type `Text("")` and click Done. This sets the variable to an empty string.

10. Add another Set a variable value node below the first one. Create a new variable named varDatasetUrl. Set its Usage to "Global (any topic can access)" so it becomes Global.varDatasetUrl. Set the To value using the formula icon (fx): type `Text("")` and click Done.

11. Now click the Message node (the greeting). Delete the default message text. Replace it with:

```
Welcome. I am your Social Research Analyst, built by NXT Humans.

I help you discover themes, measure sentiment, and search through social media datasets using advanced NLP analysis.

Available commands:
-> "run topic analysis" -- Discover themes and topics in your dataset
-> "analyze sentiment" -- Measure positive/neutral/negative sentiment
-> "search posts" -- Find specific content by meaning
-> "view results" -- Review completed analyses

To begin, provide a SharePoint URL to your JSON dataset or tell me what you would like to analyze.
```

12. Click Save at the top.

**Fallback:**

13. Go back to Topics, then System, and click Fallback.

14. Click the Message node and replace the text with:

```
I did not understand that request. I can help with:

-> Topic modeling and theme discovery in social media data
-> Sentiment analysis (positive/neutral/negative classification)
-> Semantic search across collected posts
-> Reviewing and exporting completed analysis results

Please rephrase your question, or type "help" for available commands.
```

15. Click Save.

**On Error:**

16. Click On Error in the system topics list. Keep the default configuration -- it displays the error code, conversation ID, and timestamp, which you will need for troubleshooting.

**End of Conversation:**

17. Click End of Conversation. Toggle the satisfaction survey to On so you can collect feedback on analysis quality.

18. Click Save.

## Step 1.7: Create the Power Platform Solution

WHERE AM I?: Browser > https://make.powerapps.com > Solutions

1. Open a new browser tab and navigate to https://make.powerapps.com.

2. Sign in with the same Microsoft 365 account.

3. Important: In the top-right corner, check the Environment dropdown. Make sure you are in the same environment where your Copilot Studio agent lives. If you are not sure, it is usually called "Default" or your organization's name.

4. In the left navigation, click Solutions.

5. Click + New solution.

6. Fill in:
   - Display name: Social Research Analyst Solution
   - Publisher: Select the default publisher (or create one -- click + New publisher, set Name to NXTHumans, Prefix to nxth, then click Save).
   - Leave Version as 1.0.0.0.

7. Click Create. The solution opens.

## Step 1.8: Create the Environment Variable for the Anthropic API Key

WHERE AM I?: Power Apps > Solutions > Social Research Analyst Solution

1. Inside your solution, click Add (the button at the top), then More, then Environment variable.

2. Fill in:
   - Display name: Anthropic API Key
   - Name: This auto-fills as nxth_AnthropicApiKey (based on your publisher prefix). That is correct.
   - Data type: Select Secret
   - Default value: Leave blank.

3. Click Save at the bottom of the panel.

4. After saving, click the variable you just created to open it. Click New value under "Current value". Paste your Anthropic API key (the one starting with sk-ant-...) and click Save.

> **WATCH OUT**: Environment variables of type "Secret" store values encrypted in Dataverse. However, you must ALSO enable Secure Inputs and Secure Outputs on every Power Automate action that touches this key. Instructions for this are included in every flow phase below.

> **BEGINNER TIP**: An environment variable is like a named container that holds a value (in this case, your API key). Instead of pasting the key directly into every flow, you store it once here and reference it by name. This means if you ever need to rotate the key, you change it in one place.

## Step 1.9: Create the Dataverse Table for Analysis Sessions

WHERE AM I?: Power Apps > Solutions > Social Research Analyst Solution

1. Still inside your solution, click Add (the button at the top), then Table, then Table.

2. In the New table panel, fill in:
   - Display name: Social Analysis
   - Plural display name: Social Analyses
   - Schema name: This auto-fills (e.g., nxth_SocialAnalysis). Leave it.
   - Primary column name: analysis_id
   - Primary column type: Single line of text

3. Click Save. The table is created.

4. Now you need to add columns. Click the table name (Social Analysis) to open it. Click the Columns tab.

5. Click + New column and create each of the following columns one at a time:

**Column 1 -- status:**
   - Display name: status
   - Data type: Single line of text
   - Required: Optional
   - Click Save.

**Column 2 -- posts_url:**
   - Display name: posts_url
   - Data type: Single line of text (URL format)
   - Required: Optional
   - Click Save.

**Column 3 -- topics_json:**
   - Display name: topics_json
   - Data type: Multiple lines of text
   - Required: Optional
   - Click Save.

**Column 4 -- sentiment_json:**
   - Display name: sentiment_json
   - Data type: Multiple lines of text
   - Required: Optional
   - Click Save.

**Column 5 -- search_json:**
   - Display name: search_json
   - Data type: Multiple lines of text
   - Required: Optional
   - Click Save.

**Column 6 -- analysis_type:**
   - Display name: analysis_type
   - Data type: Single line of text
   - Required: Optional
   - Click Save.

**Column 7 -- dataset_id:**
   - Display name: dataset_id
   - Data type: Single line of text
   - Required: Optional
   - Click Save.

**Column 8 -- model_used:**
   - Display name: model_used
   - Data type: Single line of text
   - Required: Optional
   - Click Save.

**Column 9 -- depth:**
   - Display name: depth
   - Data type: Single line of text
   - Required: Optional
   - Click Save.

6. You should now see 9 custom columns plus the default columns (analysis_id as primary, Created On, Modified On, etc.).

> **VERIFY**: Navigate back to your solution. You should see the Social Analysis table listed alongside the Anthropic API Key environment variable.

## Step 1.10: Create the Analysis Types Entity File

WHERE AM I?: Your local computer > Text editor

1. Open a plain text editor (Notepad on Windows, TextEdit on Mac set to plain text mode).

2. Paste the following content exactly:

```
Quick|quick|fast analysis|rapid scan|quick scan|brief analysis
Standard|standard|normal|default|regular analysis|standard depth
Deep|deep|thorough|comprehensive|detailed analysis|deep dive|full analysis
```

3. Save the file as social_research_analysis_types.txt on your desktop.

4. This file defines three analysis depth options with their synonyms. The first value before each pipe (|) is the canonical value that gets stored in the variable. Values after the pipe are synonyms that map to that canonical value.

> **BEGINNER TIP**: A closed list entity is like a dropdown menu with smart matching. If the user types "quick scan" or "fast analysis," the system recognizes both as meaning "Quick." This is much more flexible than requiring exact text matches.

## Step 1.11: Import the Analysis Types Entity into Copilot Studio

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Settings > Entities

1. Go back to your Copilot Studio tab. Open your Social Research Analyst agent.

2. Click the Settings gear icon at the top of the page.

3. In the settings panel, click Entities in the left menu.

4. Click + Add an entity, then select Closed list.

5. In the entity creation panel:
   - Name: Analysis Types
   - Click Upload and select the social_research_analysis_types.txt file you saved in Step 1.10.

6. After upload, you should see three entries: Quick, Standard, Deep -- each with their synonyms listed.

7. Find the Smart matching toggle and set it to On. This enables fuzzy matching so the agent can handle misspellings like "quik" or "standrd."

8. Click Save.

9. Close the settings panel.

> **VERIFY**: You should see "Analysis Types" listed in the Entities section with 3 items and Smart matching enabled.

---

# PHASE 2: Add Knowledge Sources (2 Sources)

Knowledge sources give the agent reference material to answer methodology questions. We add these now so they are available when the agent needs to explain analysis concepts.

## Step 2.1: Add the Analysis Methodology Guides Knowledge Source

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview > Knowledge

1. Navigate back to the Overview page of your agent (click the agent name in the breadcrumb at the top).

2. Find the Knowledge section and click Add knowledge.

3. A panel opens showing knowledge source options. Under Featured, click SharePoint.

4. In the SharePoint URL field, paste: https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Analysis Guides

5. Replace "yourcompany" with your actual SharePoint domain. Press Enter or click the + button. The URL appears as a tag below the field.

6. Below the URLs, you will see two fields:
   - Name: Type Analysis Methodology Guides
   - Description: This is critical for retrieval quality. Paste:

```
Documentation on BERTopic parameters and topic modeling configuration, HDBSCAN clustering algorithm tuning, VADER sentiment scoring interpretation and compound score ranges, best practices for social media text analysis, minimum dataset size requirements, topic coherence metrics, and guidance on interpreting positive/neutral/negative sentiment distributions. Covers Reddit, TrustPilot, and Google Play Store data formats. Includes methodology notes on confidence intervals, sample size requirements, and statistical significance thresholds for social media research.
```

7. Click Add to agent.

8. You will see the knowledge source appear in the Knowledge section with a green checkmark. If you see a yellow warning, click it to read the issue (usually a permissions problem).

## Step 2.2: Add the BERTopic Documentation Knowledge Source

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview > Knowledge

1. Click Add knowledge again.

2. This time, select Website URL (or Public website, depending on your view).

3. In the URL field, paste: https://maartengr.github.io/BERTopic/

4. Press Enter or click the + button.

5. Fill in:
   - Name: BERTopic Documentation
   - Description: Paste:

```
Official BERTopic documentation covering topic modeling algorithm details, HDBSCAN clustering parameters (min_cluster_size, min_samples), UMAP dimensionality reduction settings, CountVectorizer configuration for text preprocessing, topic representation methods, visualization options (topic hierarchy, barchart, heatmap), guided topic modeling, online topic modeling for streaming data, and API reference for all BERTopic classes and methods. Reference material for explaining topic modeling concepts to users.
```

6. Click Add to agent.

## Step 2.3: Configure Knowledge Behavior Settings

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Settings > Generative AI

1. Click the Settings gear icon in the top navigation bar.

2. Click Generative AI in the left menu.

3. Under "How should your agent interact with knowledge sources", select High strictness. This ensures the agent only answers methodology questions from your documents and does not fill gaps with guesses.

4. Click Save and close the settings panel.

> **VERIFY**: On the Overview page, you should see two knowledge sources listed: "Analysis Methodology Guides" and "BERTopic Documentation," both with green checkmarks.

---

# PHASE 3: Topic Analysis Request -- TOPIC BUILD (Node-by-Node: 9 Nodes)

This topic is the primary entry point for theme discovery. It collects the dataset reference, validates size, configures analysis depth, calls the Run Topic Modeling flow, polls for completion, and displays results via an Adaptive Card.

## Step 3.1: Create the Topic and Set Trigger Phrases

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Custom

1. Click the Topics tab in the top navigation bar, then click the Custom subtab.

2. Click + Add a topic, then From blank.

3. At the top of the canvas, click the topic name (it says "Untitled") and rename it to: Topic Analysis Request

4. Click the Description field below the name. Type: User wants to run topic modeling or discover themes in their social data. Route here when the user mentions topic modeling, theme discovery, clustering, finding topics, or analyzing what people are talking about in a dataset. Does NOT handle sentiment analysis or semantic search.

5. In the Trigger node at the top of the canvas, you will see a section labeled "Describe what this topic does" or "Add trigger phrases." Click the trigger area and add these trigger phrases (press Enter after each one):
   - run topic modeling
   - discover themes
   - find topics in data
   - cluster social data
   - what are people talking about
   - analyze themes in posts
   - topic analysis
   - find recurring themes

> **BEGINNER TIP**: Even though generative orchestration primarily uses the topic description for routing, trigger phrases still help the system classify this as a Custom Topic and provide additional matching signals.

## Step 3.2: Node 1 -- Message -- "Topic Analysis Introduction"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request > Canvas

1. Click the + button below the Trigger node to add a new node.

2. In the node menu that appears, click Send a message.

3. In the message text area, type the following:

```
I can help you discover themes and topics in your social media dataset.

How it works:
-> Your dataset is analyzed using advanced NLP to identify recurring themes
-> Each theme is labeled with a 2-3 word name and representative keywords
-> Posts are grouped by theme with confidence scores
-> Analysis typically takes 30-90 seconds depending on dataset size

Requirements:
-> Minimum 50 posts for meaningful results
-> Maximum 500 posts recommended per batch for optimal performance
-> Dataset must be in JSON format with text, score, author, and created_utc fields

Let me collect a few details to get started.
```

4. This node is purely informational -- no variables to configure.

## Step 3.3: Node 2 -- Question -- "Select Dataset"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request > Canvas

1. Click the + button below the message node to add a new node.

2. Click Ask a question.

3. In the question text area, type: Please provide the SharePoint URL pointing to your JSON dataset. This should be the URL of a JSON file in your SharePoint library containing the collected social media posts.

4. Under Identify, click the dropdown and select User's entire response. This captures the full URL text.

5. The question node creates an output variable. Click the variable name (it may be called Var1 or similar). The Variable properties panel opens on the right side.

6. Under Variable name, type varDatasetUrl (without any prefix).

7. Under Usage, select "Global (any topic can access)". The variable name automatically becomes Global.varDatasetUrl.

> **WATCH OUT**: If Global.varDatasetUrl already exists from the Conversation Start initialization (Step 1.6), the Question node will reuse it. If it shows a different variable name, click the variable box in the question node, then select Global.varDatasetUrl from the list.

8. Leave the other settings at their defaults.

## Step 3.4: Node 3 -- Condition -- "Validate Dataset Size"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request > Canvas

1. Click the + button below the question node to add a new node.

2. Click Add a condition.

3. A condition node appears with a condition branch and an "All other conditions" (else) branch.

4. In the condition branch, we need to check that the dataset URL is not blank. Click the condition field. Select Global.varDatasetUrl from the variable list.

5. Set the operator to is not Blank (or "is not equal to" and type an empty string).

6. In the condition's Yes branch (the path that continues when the condition is true), click the + button and add a Send a message node. Type:

```
Dataset URL received. I will validate the dataset before proceeding.

Note: For meaningful topic analysis, your dataset must contain at least 50 posts. Datasets larger than 500 posts will be processed in batches of 50 posts each to stay within processing limits.
```

7. In the All other conditions (else) branch, click the + button and add a Send a message node. Type:

```
I need a valid SharePoint URL to proceed. Please provide the full URL to your JSON dataset file, for example:
https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Analysis Results/reddit_data_complete.json
```

8. After the else message, click + and add a Redirect to another topic node. Select this same topic (Topic Analysis Request) to loop back and ask again. Alternatively, you can add an End current topic node if you prefer the user to start over.

## Step 3.5: Node 4 -- Question -- "Configure Analysis Parameters"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request > Canvas

1. Below the validation message in the Yes branch, click the + button to add a new node.

2. Click Ask a question.

3. In the question text area, type: What analysis depth would you like? This controls how thoroughly the model examines your data.

4. Under Identify, click the dropdown. Scroll down to find your custom entity Analysis Types. If you do not see it, type "Analysis Types" in the search box. Select it.

5. The question node will show the three options: Quick, Standard, Deep. The user can type any of the synonyms you defined.

6. Click the output variable name. In the Variable properties panel:
   - Variable name: varAnalysisDepth
   - Usage: Leave as Topic (this variable is only needed within this topic)

7. Below the question, click + to add another Send a message node that explains each option:

```
Analysis depth options:
-> Quick: Identifies major themes only (fastest, ~30 seconds)
-> Standard: Balanced theme discovery with keywords and confidence scores (~60 seconds)
-> Deep: Comprehensive analysis with sub-themes, representative quotes, and cross-topic relationships (~90 seconds)
```

> **BEGINNER TIP**: The Analysis Types entity you imported earlier enables "slot filling." If the user says "run a deep topic analysis on my Reddit data," the system can automatically extract "Deep" as the analysis depth from that single sentence, potentially skipping this question entirely.

## Step 3.6: Node 5 -- Set Variable -- "Set Summarization Model Override"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request > Canvas

1. Click the + button below the analysis depth question to add a new node.

2. Select Variable management, then Set a variable value.

3. In the "Set variable" node, click the box under "Set variable" and select Create a new variable.

4. Click the new variable name. In the Variable properties panel:
   - Variable name: varSummarizationModel
   - Usage: Leave as Topic (only needed in this topic)

5. In the To value field, type: claude-sonnet-4-6

6. This step is critical. The original IA service backend defaults to deepseek-r1 for topic summarization, which is non-functional. By hardcoding claude-sonnet-4-6 here, we ensure reliable topic labeling.

> **CRITICAL**: This variable override prevents silent topic summarization failures. The Claude claude-sonnet-4-6 model is used for all NLP processing in this agent's architecture.

## Step 3.7: Node 6 -- Action -- "Execute Topic Modeling"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request > Canvas

1. Click the + button below the Set variable node to add a new node.

2. Select Add a tool. A panel opens showing available tools.

3. At this point, the Run Topic Modeling flow has not been created yet (we build it in Phase 7). For now, add a Send a message node as a placeholder. Type:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the "Run Topic Modeling" flow after building it in Phase 7. Map these inputs:
- sharepoint_posts_url -> Global.varDatasetUrl
- depth -> Topic.varAnalysisDepth
- summarization_model -> Topic.varSummarizationModel
Capture these outputs:
- analysis_id -> Global.varAnalysisId
- status -> Topic.varTopicStatus
- estimated_duration -> Topic.varEstimatedDuration
```

> **WATCH OUT**: You will come back to this node after building the Run Topic Modeling flow in Phase 7 and registering it as a tool in Phase 8. At that point, delete this placeholder message and replace it with a real Action node.

## Step 3.8: Node 7 -- Message -- "Analysis Started Confirmation"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request > Canvas

1. Click the + button below the placeholder to add a new node.

2. Click Send a message.

3. In the message text, type: Topic analysis has been submitted.

4. Click the {x} (Insert variable) button in the message toolbar and select Topic.varAnalysisDepth. Continue typing.

5. The full message should read:

```
Topic analysis has been submitted.

Analysis ID: {Global.varAnalysisId}
Depth: {Topic.varAnalysisDepth}
Model: claude-sonnet-4-6

I am now processing your dataset. This typically takes 30-90 seconds depending on dataset size and analysis depth. I will check the status and present your results when ready.
```

6. For each variable reference, click the {x} button and select the appropriate variable from the list.

## Step 3.9: Node 8 -- Action -- "Poll Topic Analysis Status"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request > Canvas

1. Click the + button below the confirmation message to add a new node.

2. Again, the Check Analysis Status flow has not been created yet (Phase 9). Add a Send a message placeholder:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the "Check Analysis Status" flow after building it in Phase 9. Map these inputs:
- job_id -> Global.varAnalysisId
- job_type -> "topic_modeling" (literal string)
Capture these outputs:
- status -> Topic.varTopicStatus
- progress_percent -> Topic.varProgressPercent
- current_phase -> Topic.varCurrentPhase

After this action, add a Condition node:
- If Topic.varTopicStatus equals "completed" -> proceed to results display
- If Topic.varTopicStatus equals "running" -> send a message "Still processing... ({Topic.varProgressPercent}% complete, current phase: {Topic.varCurrentPhase})" and redirect back to poll again
- If Topic.varTopicStatus equals "failed" -> send error message
```

## Step 3.10: Node 9 -- Adaptive Card -- "Display Topic Results Summary"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request > Canvas

1. Click the + button below the status polling section to add a new node.

2. Click Send a message (we use a Message node for this display-only card since it does not collect user input).

3. In the message node, click the + (Add) button in the message toolbar, then select Adaptive Card.

4. The Adaptive Card editor opens. Delete any default content and paste this complete JSON:

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
          "text": "TOPIC ANALYSIS RESULTS",
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
          "title": "Analysis ID",
          "value": "${analysisId}"
        },
        {
          "title": "Total Topics Found",
          "value": "${totalTopics}"
        },
        {
          "title": "Total Posts Analyzed",
          "value": "${totalPosts}"
        },
        {
          "title": "Analysis Depth",
          "value": "${depth}"
        },
        {
          "title": "Model Used",
          "value": "claude-sonnet-4-6"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "TOP 5 TOPICS BY POST COUNT",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "1. ${topic1Name} -- ${topic1Count} posts (${topic1Pct}%) | Keywords: ${topic1Keywords} | Confidence: ${topic1Confidence}",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "2. ${topic2Name} -- ${topic2Count} posts (${topic2Pct}%) | Keywords: ${topic2Keywords} | Confidence: ${topic2Confidence}",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "3. ${topic3Name} -- ${topic3Count} posts (${topic3Pct}%) | Keywords: ${topic3Keywords} | Confidence: ${topic3Confidence}",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "4. ${topic4Name} -- ${topic4Count} posts (${topic4Pct}%) | Keywords: ${topic4Keywords} | Confidence: ${topic4Confidence}",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "5. ${topic5Name} -- ${topic5Count} posts (${topic5Pct}%) | Keywords: ${topic5Keywords} | Confidence: ${topic5Confidence}",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "COHERENCE ASSESSMENT",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "${coherenceAssessment}",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "NXT Humans | Social Research Analyst",
      "size": "Small",
      "isSubtle": true,
      "spacing": "Large",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "RUN SENTIMENT ANALYSIS",
      "url": "https://teams.microsoft.com"
    },
    {
      "type": "Action.OpenUrl",
      "title": "EXPORT TO SHAREPOINT",
      "url": "https://teams.microsoft.com"
    }
  ]
}
```

> **WATCH OUT**: The ${...} placeholders in this card are for illustration. In the actual implementation, you will switch to Formula mode in the Adaptive Card editor to insert topic variables dynamically. Before switching to Formula mode, save a copy of this JSON as a comment in the node. Once you switch to Formula mode, you cannot go back to the original JSON.

> **BEGINNER TIP**: To use dynamic variables in the card, click "Formula" in the Adaptive Card editor. Then replace each ${...} placeholder with the corresponding Power Fx variable reference like `Topic.varTopicResults`. For now, leave the static JSON -- you will update it after the flows are built and returning real data.

5. Save the Adaptive Card and close the editor.

6. Click Save at the top of the canvas to save the entire topic.

## Step 3.11: Complete YAML for Topic Analysis Request

Below is the complete YAML representation of this topic. You can paste this into the code editor as an alternative to building node-by-node on the canvas.

To access the code editor: click the three dots (...) at the top-right of the topic canvas, then select Open code editor. Paste the YAML below, then close the editor to return to the visual canvas.

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Topic Analysis Request
    triggerQueries:
      - run topic modeling
      - discover themes
      - find topics in data
      - cluster social data
      - what are people talking about
      - analyze themes in posts
      - topic analysis
      - find recurring themes
  actions:
    - kind: SendMessage
      id: topicIntroMsg
      message: |-
        I can help you discover themes and topics in your social media dataset.

        How it works:
        -> Your dataset is analyzed using advanced NLP to identify recurring themes
        -> Each theme is labeled with a 2-3 word name and representative keywords
        -> Posts are grouped by theme with confidence scores
        -> Analysis typically takes 30-90 seconds depending on dataset size

        Requirements:
        -> Minimum 50 posts for meaningful results
        -> Maximum 500 posts recommended per batch for optimal performance
        -> Dataset must be in JSON format with text, score, author, and created_utc fields

        Let me collect a few details to get started.

    - kind: Question
      id: askDatasetUrl
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.varDatasetUrl
      prompt: "Please provide the SharePoint URL pointing to your JSON dataset. This should be the URL of a JSON file in your SharePoint library containing the collected social media posts."
      entity: StringPrebuiltEntity

    - kind: ConditionGroup
      id: validateDataset
      conditions:
        - id: hasDatasetUrl
          condition: =!IsBlank(Global.varDatasetUrl)
          actions:
            - kind: SendMessage
              id: datasetValidMsg
              message: |-
                Dataset URL received. I will validate the dataset before proceeding.

                Note: For meaningful topic analysis, your dataset must contain at least 50 posts. Datasets larger than 500 posts will be processed in batches of 50 posts each to stay within processing limits.
      elseActions:
        - kind: SendMessage
          id: noDatasetMsg
          message: |-
            I need a valid SharePoint URL to proceed. Please provide the full URL to your JSON dataset file, for example:
            https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Analysis Results/reddit_data_complete.json
        - kind: EndDialog
          id: endNoDataset

    - kind: Question
      id: askAnalysisDepth
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varAnalysisDepth
      prompt: "What analysis depth would you like? This controls how thoroughly the model examines your data."
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: Quick
              displayName: Quick
            - id: Standard
              displayName: Standard
            - id: Deep
              displayName: Deep

    - kind: SendMessage
      id: depthExplanation
      message: |-
        Analysis depth options:
        -> Quick: Identifies major themes only (fastest, ~30 seconds)
        -> Standard: Balanced theme discovery with keywords and confidence scores (~60 seconds)
        -> Deep: Comprehensive analysis with sub-themes, representative quotes, and cross-topic relationships (~90 seconds)

    - kind: SetVariable
      id: setModelOverride
      variable: Topic.varSummarizationModel
      value: "claude-sonnet-4-6"

    - kind: SendMessage
      id: executeTopicModelingPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Run Topic Modeling flow. Map inputs: sharepoint_posts_url -> Global.varDatasetUrl, depth -> Topic.varAnalysisDepth, summarization_model -> Topic.varSummarizationModel. Capture outputs: analysis_id -> Global.varAnalysisId, status -> Topic.varTopicStatus, estimated_duration -> Topic.varEstimatedDuration."

    - kind: SendMessage
      id: analysisStartedMsg
      message: |-
        Topic analysis has been submitted.

        Analysis ID: {Global.varAnalysisId}
        Depth: {Topic.varAnalysisDepth}
        Model: claude-sonnet-4-6

        I am now processing your dataset. This typically takes 30-90 seconds depending on dataset size and analysis depth. I will check the status and present your results when ready.

    - kind: SendMessage
      id: pollStatusPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Check Analysis Status flow. Map inputs: job_id -> Global.varAnalysisId, job_type -> topic_modeling. Capture outputs: status -> Topic.varTopicStatus, progress_percent -> Topic.varProgressPercent, current_phase -> Topic.varCurrentPhase."

    - kind: SendMessage
      id: resultsCardPlaceholder
      message: "Topic analysis results will be displayed here as an Adaptive Card after the Get Topic Results flow returns data. Replace this with the Adaptive Card node showing top 5 topics, keywords, confidence scores, and coherence assessment."

    - kind: EndDialog
      id: endTopicAnalysis
```

---

# PHASE 4: Sentiment Analysis -- TOPIC BUILD (Node-by-Node: 7 Nodes)

This topic measures the emotional tone of social media posts. It can analyze the full dataset or scope analysis to specific topics from a prior topic modeling run.

## Step 4.1: Create the Topic and Set Trigger Phrases

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Custom

1. Click the Topics tab, then Custom subtab, then + Add a topic, then From blank.

2. Rename the topic to: Sentiment Analysis

3. Click the Description field. Type: User wants to measure sentiment or emotional tone in their data. Route here when the user mentions sentiment, positive/negative analysis, opinion mining, emotional tone, or how people feel about a topic. Does NOT handle topic modeling or semantic search.

4. Add these trigger phrases (press Enter after each):
   - analyze sentiment
   - measure sentiment
   - positive negative analysis
   - opinion mining
   - emotional tone analysis
   - how do people feel
   - sentiment scoring
   - what is the mood

## Step 4.2: Node 1 -- Message -- "Sentiment Analysis Overview"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Sentiment Analysis > Canvas

1. Click the + button below the Trigger node. Click Send a message.

2. Type:

```
I can analyze the sentiment (emotional tone) of your social media data.

How it works:
-> Each post is classified as positive, neutral, or negative
-> A compound score from -1.0 (most negative) to +1.0 (most positive) is assigned
-> Representative quotes are extracted for each sentiment category
-> Results include overall distribution and per-topic breakdowns

You can analyze:
-> The entire dataset (all posts)
-> Specific topics from a completed topic modeling run

Let me configure the analysis scope.
```

## Step 4.3: Node 2 -- Question -- "Select Analysis Scope"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Sentiment Analysis > Canvas

1. Click the + button below the message. Click Ask a question.

2. Type: Would you like to analyze sentiment across the entire dataset, or scope it to specific topics from a completed topic modeling run?

3. Under Identify, click the dropdown and select an inline choice entity. Configure two options:
   - Click the dropdown and select Multiple choice options (or create an embedded entity).

4. Add two choices:
   - full_dataset (display: Entire Dataset)
   - topic_scoped (display: Specific Topics)

5. Click the output variable name. In the Variable properties panel:
   - Variable name: varSentimentScope
   - Usage: Leave as Topic

## Step 4.4: Node 3 -- Condition -- "Check Topic Model Dependency"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Sentiment Analysis > Canvas

1. Click the + button below the scope question. Click Add a condition.

2. In the condition, we check two things: if the user chose "topic_scoped" AND if a topic modeling job exists.

3. For the condition branch, select Topic.varSentimentScope, set operator to "is equal to", and type: full_dataset

4. In the Yes branch (full dataset selected), click + and add a Send a message: "Analyzing sentiment across the entire dataset. Proceeding to analysis."

5. In the All other conditions branch (topic_scoped was selected), add another Condition node to check if Global.varAnalysisId is not blank:
   - Select Global.varAnalysisId, operator "is not Blank"
   - Yes branch: proceed to topic selection (next node)
   - No branch: add a Send a message:

```
No completed topic modeling job found. To scope sentiment analysis by topic, you need to run topic analysis first.

Would you like me to:
-> Run topic analysis first (type "run topic analysis")
-> Analyze sentiment across the full dataset instead (type "full dataset")
```

6. After the "no topic model" message, add an End current topic node.

## Step 4.5: Node 4 -- Question -- "Select Target Topics"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Sentiment Analysis > Canvas

1. In the Yes branch of the topic model check (where Global.varAnalysisId exists), click + and add Ask a question.

2. Type: Which topics would you like to analyze? Enter the topic IDs separated by commas (e.g., "1, 3, 5"), or type "all" to analyze all discovered topics.

3. Under Identify, select User's entire response.

4. Click the output variable name. In the Variable properties panel:
   - Variable name: varTargetTopicIds
   - Usage: Leave as Topic

## Step 4.6: Node 5 -- Action -- "Execute Sentiment Analysis"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Sentiment Analysis > Canvas

1. Click the + button below the topic selection question. Add a Send a message placeholder:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the "Run Sentiment Analysis" flow after building it in Phase 13. Map these inputs:
- dataset_id -> Global.varDatasetUrl
- topic_model_job_id -> Global.varAnalysisId
- target_topic_ids -> Topic.varTargetTopicIds
Capture these outputs:
- job_id -> Topic.varSentimentJobId
- status -> Topic.varSentimentStatus
```

## Step 4.7: Node 6 -- Action -- "Retrieve Sentiment Results"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Sentiment Analysis > Canvas

1. Click the + button below the placeholder. Add another Send a message placeholder:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the "Get Sentiment Results" flow after building it in Phase 15. Map these inputs:
- job_id -> Topic.varSentimentJobId
Capture these outputs:
- results_summary -> Topic.varSentimentResults
- positive_count -> Topic.varPositiveCount
- negative_count -> Topic.varNegativeCount
```

## Step 4.8: Node 7 -- Adaptive Card -- "Display Sentiment Dashboard"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Sentiment Analysis > Canvas

1. Click the + button. Click Send a message.

2. In the message node, click the + (Add) button in the message toolbar, then select Adaptive Card.

3. Paste this complete JSON:

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
          "text": "SENTIMENT ANALYSIS RESULTS",
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
          "title": "Dataset",
          "value": "${datasetId}"
        },
        {
          "title": "Scope",
          "value": "${analysisScope}"
        },
        {
          "title": "Total Posts Analyzed",
          "value": "${totalPosts}"
        },
        {
          "title": "Model",
          "value": "claude-sonnet-4-6"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "OVERALL SENTIMENT DISTRIBUTION",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            {
              "type": "TextBlock",
              "text": "POSITIVE",
              "weight": "Bolder",
              "color": "Good",
              "horizontalAlignment": "Center",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": "${positivePct}%",
              "size": "ExtraLarge",
              "weight": "Bolder",
              "color": "Good",
              "horizontalAlignment": "Center",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": "${positiveCount} posts",
              "size": "Small",
              "isSubtle": true,
              "horizontalAlignment": "Center",
              "wrap": true
            }
          ]
        },
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            {
              "type": "TextBlock",
              "text": "NEUTRAL",
              "weight": "Bolder",
              "color": "Warning",
              "horizontalAlignment": "Center",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": "${neutralPct}%",
              "size": "ExtraLarge",
              "weight": "Bolder",
              "color": "Warning",
              "horizontalAlignment": "Center",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": "${neutralCount} posts",
              "size": "Small",
              "isSubtle": true,
              "horizontalAlignment": "Center",
              "wrap": true
            }
          ]
        },
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            {
              "type": "TextBlock",
              "text": "NEGATIVE",
              "weight": "Bolder",
              "color": "Attention",
              "horizontalAlignment": "Center",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": "${negativePct}%",
              "size": "ExtraLarge",
              "weight": "Bolder",
              "color": "Attention",
              "horizontalAlignment": "Center",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": "${negativeCount} posts",
              "size": "Small",
              "isSubtle": true,
              "horizontalAlignment": "Center",
              "wrap": true
            }
          ]
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "COMPOUND SCORE AVERAGE: ${compoundAvg}",
      "weight": "Bolder",
      "spacing": "Medium",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "REPRESENTATIVE QUOTES",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Positive: \"${positiveQuote}\"",
      "wrap": true,
      "spacing": "Small",
      "color": "Good"
    },
    {
      "type": "TextBlock",
      "text": "Neutral: \"${neutralQuote}\"",
      "wrap": true,
      "spacing": "Small",
      "color": "Warning"
    },
    {
      "type": "TextBlock",
      "text": "Negative: \"${negativeQuote}\"",
      "wrap": true,
      "spacing": "Small",
      "color": "Attention"
    },
    {
      "type": "TextBlock",
      "text": "NXT Humans | Social Research Analyst",
      "size": "Small",
      "isSubtle": true,
      "spacing": "Large",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "VIEW DETAILED BREAKDOWN",
      "url": "https://teams.microsoft.com"
    },
    {
      "type": "Action.OpenUrl",
      "title": "EXPORT RESULTS",
      "url": "https://teams.microsoft.com"
    }
  ]
}
```

4. Save the Adaptive Card and close the editor.

5. Click Save at the top of the canvas.

## Step 4.9: Complete YAML for Sentiment Analysis

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Sentiment Analysis
    triggerQueries:
      - analyze sentiment
      - measure sentiment
      - positive negative analysis
      - opinion mining
      - emotional tone analysis
      - how do people feel
      - sentiment scoring
      - what is the mood
  actions:
    - kind: SendMessage
      id: sentimentOverviewMsg
      message: |-
        I can analyze the sentiment (emotional tone) of your social media data.

        How it works:
        -> Each post is classified as positive, neutral, or negative
        -> A compound score from -1.0 (most negative) to +1.0 (most positive) is assigned
        -> Representative quotes are extracted for each sentiment category
        -> Results include overall distribution and per-topic breakdowns

        You can analyze:
        -> The entire dataset (all posts)
        -> Specific topics from a completed topic modeling run

        Let me configure the analysis scope.

    - kind: Question
      id: askSentimentScope
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varSentimentScope
      prompt: "Would you like to analyze sentiment across the entire dataset, or scope it to specific topics from a completed topic modeling run?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: full_dataset
              displayName: Entire Dataset
            - id: topic_scoped
              displayName: Specific Topics

    - kind: ConditionGroup
      id: checkScopeType
      conditions:
        - id: isFullDataset
          condition: =Topic.varSentimentScope = "full_dataset"
          actions:
            - kind: SendMessage
              id: fullDatasetMsg
              message: "Analyzing sentiment across the entire dataset. Proceeding to analysis."
      elseActions:
        - kind: ConditionGroup
          id: checkTopicModelExists
          conditions:
            - id: hasTopicModel
              condition: =!IsBlank(Global.varAnalysisId)
              actions:
                - kind: Question
                  id: askTargetTopics
                  interruptionPolicy:
                    allowInterruption: true
                  variable: init:Topic.varTargetTopicIds
                  prompt: "Which topics would you like to analyze? Enter the topic IDs separated by commas (e.g., 1, 3, 5), or type all to analyze all discovered topics."
                  entity: StringPrebuiltEntity
          elseActions:
            - kind: SendMessage
              id: noTopicModelMsg
              message: |-
                No completed topic modeling job found. To scope sentiment analysis by topic, you need to run topic analysis first.

                Would you like me to:
                -> Run topic analysis first (type "run topic analysis")
                -> Analyze sentiment across the full dataset instead (type "full dataset")
            - kind: EndDialog
              id: endNoTopicModel

    - kind: SendMessage
      id: executeSentimentPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Run Sentiment Analysis flow. Map inputs: dataset_id -> Global.varDatasetUrl, topic_model_job_id -> Global.varAnalysisId, target_topic_ids -> Topic.varTargetTopicIds. Capture outputs: job_id -> Topic.varSentimentJobId, status -> Topic.varSentimentStatus."

    - kind: SendMessage
      id: retrieveSentimentPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Get Sentiment Results flow. Map inputs: job_id -> Topic.varSentimentJobId. Capture outputs: results_summary -> Topic.varSentimentResults, positive_count -> Topic.varPositiveCount, negative_count -> Topic.varNegativeCount."

    - kind: SendMessage
      id: sentimentDashboardPlaceholder
      message: "Sentiment analysis results will be displayed here as an Adaptive Card showing positive/neutral/negative distribution, compound scores, and representative quotes. Replace this with the Adaptive Card node after flows are connected."

    - kind: EndDialog
      id: endSentiment
```

---

# PHASE 5: Semantic Search -- TOPIC BUILD (Node-by-Node: 6 Nodes)

This topic enables natural language search across collected social media posts. Instead of keyword matching, it uses Claude to rank posts by semantic relevance to the user's query.

## Step 5.1: Create the Topic and Set Trigger Phrases

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Custom

1. Click the Topics tab, then Custom subtab, then + Add a topic, then From blank.

2. Rename the topic to: Semantic Search

3. Click the Description field. Type: User wants to search for specific content within collected data using natural language queries. Route here when the user wants to find posts about a specific subject, search by meaning, or look for similar content. Does NOT handle topic modeling or sentiment analysis.

4. Add these trigger phrases:
   - search posts
   - find content by meaning
   - semantic search
   - find similar content
   - search within collected data
   - look for posts about
   - find mentions of
   - search my dataset

## Step 5.2: Node 1 -- Message -- "Semantic Search Introduction"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Semantic Search > Canvas

1. Click the + button below the Trigger node. Click Send a message.

2. Type:

```
I can search your social media dataset by meaning rather than exact keyword match.

How it works:
-> You describe what you are looking for in natural language
-> Each post is scored for relevance to your query on a 0.0 to 1.0 scale
-> Results are ranked by relevance with the most similar posts first
-> Each result includes the relevance score, post text, author, date, and engagement metrics

This approach finds conceptually related content even when exact keywords differ. For example, searching for "product quality complaints" will also find posts about "defective items" or "broken on arrival."
```

## Step 5.3: Node 2 -- Question -- "Enter Search Query"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Semantic Search > Canvas

1. Click the + button. Click Ask a question.

2. Type: What would you like to search for? Describe what you are looking for in natural language.

3. Under Identify, select User's entire response.

4. Click the output variable name. In the Variable properties panel:
   - Variable name: varSearchQuery
   - Usage: Leave as Topic

## Step 5.4: Node 3 -- Question -- "Set Search Parameters"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Semantic Search > Canvas

1. Click the + button. Click Ask a question.

2. Type: How many results would you like? Enter a number between 5 and 50 (default is 20). You can also type "default" to use 20 results.

3. Under Identify, select User's entire response.

4. Click the output variable name. In the Variable properties panel:
   - Variable name: varMaxResults
   - Usage: Leave as Topic

5. Below this question, add a Condition node to check if the user has a dataset URL:
   - Condition: Global.varDatasetUrl is not Blank
   - Yes branch: proceed to search execution
   - No branch: add a Question node asking for the dataset URL (same as in Topic Analysis Request), storing in Global.varDatasetUrl

## Step 5.5: Node 4 -- Action -- "Execute Semantic Search"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Semantic Search > Canvas

1. Click the + button. Add a Send a message placeholder:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the "Semantic Search" flow after building it in Phase 17. Map these inputs:
- search_query -> Topic.varSearchQuery
- dataset_id -> Global.varDatasetUrl
- max_results -> Topic.varMaxResults
Capture these outputs:
- search_results -> Topic.varSearchResults
- total_matches -> Topic.varTotalMatches
```

## Step 5.6: Node 5 -- Adaptive Card -- "Display Search Results"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Semantic Search > Canvas

1. Click the + button. Click Send a message.

2. Click the + (Add) button in the message toolbar, then select Adaptive Card.

3. Paste this complete JSON:

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
          "text": "SEMANTIC SEARCH RESULTS",
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
          "title": "Query",
          "value": "${searchQuery}"
        },
        {
          "title": "Total Matches",
          "value": "${totalMatches}"
        },
        {
          "title": "Showing Top",
          "value": "${maxResults} results"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "RANKED RESULTS",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "Container",
      "spacing": "Small",
      "items": [
        {
          "type": "TextBlock",
          "text": "1. [Score: ${result1Score}] ${result1Title}",
          "weight": "Bolder",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "${result1Excerpt}",
          "wrap": true,
          "isSubtle": true
        },
        {
          "type": "TextBlock",
          "text": "By ${result1Author} | ${result1Date} | Score: ${result1Engagement}",
          "size": "Small",
          "isSubtle": true,
          "wrap": true
        }
      ]
    },
    {
      "type": "Container",
      "spacing": "Small",
      "separator": true,
      "items": [
        {
          "type": "TextBlock",
          "text": "2. [Score: ${result2Score}] ${result2Title}",
          "weight": "Bolder",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "${result2Excerpt}",
          "wrap": true,
          "isSubtle": true
        },
        {
          "type": "TextBlock",
          "text": "By ${result2Author} | ${result2Date} | Score: ${result2Engagement}",
          "size": "Small",
          "isSubtle": true,
          "wrap": true
        }
      ]
    },
    {
      "type": "Container",
      "spacing": "Small",
      "separator": true,
      "items": [
        {
          "type": "TextBlock",
          "text": "3. [Score: ${result3Score}] ${result3Title}",
          "weight": "Bolder",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "${result3Excerpt}",
          "wrap": true,
          "isSubtle": true
        },
        {
          "type": "TextBlock",
          "text": "By ${result3Author} | ${result3Date} | Score: ${result3Engagement}",
          "size": "Small",
          "isSubtle": true,
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "NXT Humans | Social Research Analyst",
      "size": "Small",
      "isSubtle": true,
      "spacing": "Large",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "REFINE SEARCH",
      "url": "https://teams.microsoft.com"
    },
    {
      "type": "Action.OpenUrl",
      "title": "EXPORT RESULTS",
      "url": "https://teams.microsoft.com"
    }
  ]
}
```

4. Save the Adaptive Card and close the editor.

## Step 5.7: Node 6 -- Message -- "Search Follow-Up Options"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Semantic Search > Canvas

1. Click the + button. Click Send a message.

2. Type:

```
What would you like to do next?

-> Refine your search with a different query
-> Run topic analysis on the matched posts
-> View full details for a specific result (type the result number)
-> Export search results to SharePoint
-> Start a new analysis
```

3. Click Save at the top of the canvas.

## Step 5.8: Complete YAML for Semantic Search

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Semantic Search
    triggerQueries:
      - search posts
      - find content by meaning
      - semantic search
      - find similar content
      - search within collected data
      - look for posts about
      - find mentions of
      - search my dataset
  actions:
    - kind: SendMessage
      id: searchIntroMsg
      message: |-
        I can search your social media dataset by meaning rather than exact keyword match.

        How it works:
        -> You describe what you are looking for in natural language
        -> Each post is scored for relevance to your query on a 0.0 to 1.0 scale
        -> Results are ranked by relevance with the most similar posts first
        -> Each result includes the relevance score, post text, author, date, and engagement metrics

        This approach finds conceptually related content even when exact keywords differ. For example, searching for "product quality complaints" will also find posts about "defective items" or "broken on arrival."

    - kind: Question
      id: askSearchQuery
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varSearchQuery
      prompt: "What would you like to search for? Describe what you are looking for in natural language."
      entity: StringPrebuiltEntity

    - kind: Question
      id: askMaxResults
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varMaxResults
      prompt: "How many results would you like? Enter a number between 5 and 50 (default is 20). You can also type default to use 20 results."
      entity: StringPrebuiltEntity

    - kind: ConditionGroup
      id: checkDatasetForSearch
      conditions:
        - id: hasDataset
          condition: =!IsBlank(Global.varDatasetUrl)
          actions:
            - kind: SendMessage
              id: proceedSearchMsg
              message: "Searching your dataset. Please wait..."
      elseActions:
        - kind: Question
          id: askDatasetForSearch
          interruptionPolicy:
            allowInterruption: true
          variable: init:Global.varDatasetUrl
          prompt: "Please provide the SharePoint URL to your JSON dataset before I can search."
          entity: StringPrebuiltEntity

    - kind: SendMessage
      id: executeSearchPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Semantic Search flow. Map inputs: search_query -> Topic.varSearchQuery, dataset_id -> Global.varDatasetUrl, max_results -> Topic.varMaxResults. Capture outputs: search_results -> Topic.varSearchResults, total_matches -> Topic.varTotalMatches."

    - kind: SendMessage
      id: searchResultsCardPlaceholder
      message: "Search results will be displayed here as an Adaptive Card showing ranked posts with relevance scores, excerpts, and engagement metrics."

    - kind: SendMessage
      id: searchFollowUpMsg
      message: |-
        What would you like to do next?

        -> Refine your search with a different query
        -> Run topic analysis on the matched posts
        -> View full details for a specific result (type the result number)
        -> Export search results to SharePoint
        -> Start a new analysis

    - kind: EndDialog
      id: endSearch
```

---

# PHASE 6: Results Review -- TOPIC BUILD (Node-by-Node: 6 Nodes)

This topic lets users view, drill into, compare, and export previously completed analyses stored in Dataverse.

## Step 6.1: Create the Topic and Set Trigger Phrases

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Custom

1. Click the Topics tab, then Custom subtab, then + Add a topic, then From blank.

2. Rename the topic to: Results Review

3. Click the Description field. Type: User wants to view, drill into, or export previously generated analysis results. Route here when the user asks to see results, review a specific topic, export findings, compare topics, or get a summary of completed analysis. Does NOT start new analyses.

4. Add these trigger phrases:
   - view analysis results
   - review completed analysis
   - export findings
   - compare topics
   - results summary
   - show my results
   - what analyses have been completed
   - download analysis report

## Step 6.2: Node 1 -- Message -- "Available Results Summary"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Results Review > Canvas

1. Click the + button below the Trigger node. Click Send a message.

2. Type:

```
Let me check your completed analyses.

I can show you:
-> Topic modeling results (themes, keywords, post counts)
-> Sentiment analysis results (positive/neutral/negative distributions)
-> Combined topic + sentiment cross-references
-> Previous semantic search results

I will retrieve the most recent analysis session. If you need a specific analysis, provide the Analysis ID.
```

## Step 6.3: Node 2 -- Action -- "Retrieve Analysis Results"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Results Review > Canvas

1. Click the + button. Add a Send a message placeholder:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the "Get Topic Results" flow (Phase 11). Map inputs:
- job_id -> Global.varAnalysisId
Capture outputs:
- results_summary -> Topic.varAnalysisResults
- total_topics -> Topic.varTotalTopics
- total_documents -> Topic.varTotalDocuments

If the user wants sentiment results instead, call "Get Sentiment Results" flow (Phase 15).
```

## Step 6.4: Node 3 -- Condition -- "Check Result Type"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Results Review > Canvas

1. Click the + button. Click Add a condition.

2. Check if Topic.varAnalysisResults is not blank:
   - Condition: Topic.varAnalysisResults is not Blank
   - Yes branch: proceed to display dashboard
   - No branch: add a Send a message:

```
No completed analysis results found. This could mean:
-> No analysis has been run yet in this session
-> The analysis is still processing
-> The Analysis ID is incorrect

To start a new analysis, type "run topic analysis" or "analyze sentiment."
```

3. After the "no results" message, add an End current topic node.

## Step 6.5: Node 4 -- Adaptive Card -- "Detailed Results Dashboard"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Results Review > Canvas

1. In the Yes branch, click the + button. Click Send a message.

2. Click the + (Add) button in the message toolbar, then select Adaptive Card.

3. Paste this complete JSON:

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
          "text": "ANALYSIS RESULTS DASHBOARD",
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
          "title": "Analysis ID",
          "value": "${analysisId}"
        },
        {
          "title": "Status",
          "value": "${status}"
        },
        {
          "title": "Total Topics",
          "value": "${totalTopics}"
        },
        {
          "title": "Total Documents",
          "value": "${totalDocuments}"
        },
        {
          "title": "Created",
          "value": "${createdAt}"
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
      "text": "${executiveSummary}",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "TOPIC BREAKDOWN",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "${topicBreakdown}",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "SENTIMENT OVERVIEW",
      "weight": "Bolder",
      "size": "Medium",
      "spacing": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "${sentimentOverview}",
      "wrap": true,
      "spacing": "Small"
    },
    {
      "type": "TextBlock",
      "text": "NXT Humans | Social Research Analyst",
      "size": "Small",
      "isSubtle": true,
      "spacing": "Large",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "DRILL INTO TOPIC",
      "url": "https://teams.microsoft.com"
    },
    {
      "type": "Action.OpenUrl",
      "title": "COMPARE TOPICS",
      "url": "https://teams.microsoft.com"
    },
    {
      "type": "Action.OpenUrl",
      "title": "EXPORT TO SHAREPOINT",
      "url": "https://teams.microsoft.com"
    }
  ]
}
```

4. Save the Adaptive Card and close the editor.

## Step 6.6: Node 5 -- Question -- "Select Export or Drill-Down"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Results Review > Canvas

1. Click the + button. Click Ask a question.

2. Type: What would you like to do with these results?

3. Under Identify, configure as a choice entity with these options:
   - drill_down (display: Drill into a specific topic)
   - compare (display: Compare two topics side-by-side)
   - export (display: Export all results to SharePoint)
   - summary (display: Generate executive summary)

4. Click the output variable name. In the Variable properties panel:
   - Variable name: varResultAction
   - Usage: Leave as Topic

## Step 6.7: Node 6 -- Action -- "Export Results to SharePoint"

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Results Review > Canvas

1. Click the + button. Add a Condition node:
   - Condition: Topic.varResultAction is equal to "export"
   - Yes branch: Add a Send a message placeholder:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls a SharePoint export flow. The flow should:
1. Take Global.varAnalysisId as input
2. Retrieve the full analysis from Dataverse
3. Create a JSON file in SharePoint at /Shared Documents/Analysis Results/
4. Return the SharePoint file URL as output -> Topic.varExportUrl

After the action, add a message: "Results exported successfully. Download your report: {Topic.varExportUrl}"
```

   - No branch: Add messages for each other action type (drill_down, compare, summary) with appropriate instructions.

2. Click Save at the top of the canvas.

## Step 6.8: Complete YAML for Results Review

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Results Review
    triggerQueries:
      - view analysis results
      - review completed analysis
      - export findings
      - compare topics
      - results summary
      - show my results
      - what analyses have been completed
      - download analysis report
  actions:
    - kind: SendMessage
      id: availableResultsMsg
      message: |-
        Let me check your completed analyses.

        I can show you:
        -> Topic modeling results (themes, keywords, post counts)
        -> Sentiment analysis results (positive/neutral/negative distributions)
        -> Combined topic + sentiment cross-references
        -> Previous semantic search results

        I will retrieve the most recent analysis session. If you need a specific analysis, provide the Analysis ID.

    - kind: SendMessage
      id: retrieveResultsPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Get Topic Results flow. Map inputs: job_id -> Global.varAnalysisId. Capture outputs: results_summary -> Topic.varAnalysisResults, total_topics -> Topic.varTotalTopics, total_documents -> Topic.varTotalDocuments."

    - kind: ConditionGroup
      id: checkResultsExist
      conditions:
        - id: hasResults
          condition: =!IsBlank(Topic.varAnalysisResults)
          actions:
            - kind: SendMessage
              id: resultsDashboardPlaceholder
              message: "Analysis results dashboard will be displayed here as an Adaptive Card. Replace with the Detailed Results Dashboard Adaptive Card after flows are connected."
      elseActions:
        - kind: SendMessage
          id: noResultsMsg
          message: |-
            No completed analysis results found. This could mean:
            -> No analysis has been run yet in this session
            -> The analysis is still processing
            -> The Analysis ID is incorrect

            To start a new analysis, type "run topic analysis" or "analyze sentiment."
        - kind: EndDialog
          id: endNoResults

    - kind: Question
      id: askResultAction
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varResultAction
      prompt: "What would you like to do with these results?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: drill_down
              displayName: Drill into a specific topic
            - id: compare
              displayName: Compare two topics side-by-side
            - id: export
              displayName: Export all results to SharePoint
            - id: summary
              displayName: Generate executive summary

    - kind: SendMessage
      id: exportPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with a Condition checking Topic.varResultAction, then an Action node for export that calls a SharePoint export flow. Map inputs: analysis_id -> Global.varAnalysisId. Capture outputs: export_url -> Topic.varExportUrl."

    - kind: EndDialog
      id: endResultsReview
```

---

# PHASE 7: Run Topic Modeling -- FLOW BUILD (Action-by-Action)

This is the primary analysis flow. It receives a SharePoint URL pointing to a JSON dataset, loads the posts, chunks them into batches of 50, sends each batch to Claude for theme extraction, consolidates the results in a second Claude call, stores the analysis in Dataverse, and returns the results.

## Step 7.1: Create the Flow

WHERE AM I?: Power Automate > https://make.powerautomate.com > Solutions > Social Research Analyst Solution

1. Open a new browser tab and navigate to https://make.powerautomate.com.

2. In the left navigation, click Solutions, then open Social Research Analyst Solution.

3. Click + New, then Automation, then Cloud flow, then Instant.

4. In the "Build an instant cloud flow" dialog:
   - Flow name: Run Topic Modeling
   - Choose how to trigger this flow: Scroll down and select "Run a flow from Copilot" (this is the Copilot Studio trigger). If you do not see this, select "Manually trigger a flow" -- we will change it.

5. Click Create. The flow editor opens.

## Step 7.2: Configure the Trigger with Input Parameters

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling > Trigger

1. If the trigger shows as "Run a flow from Copilot", click on it to expand it. If it shows a different trigger, delete it and add the correct one: click +, search for "Run a flow from Copilot", and select it.

2. Click + Add an input inside the trigger. You need to add three text inputs:

**Input 1:**
   - Click + Add an input, then select Text.
   - Input name: sharepoint_posts_url
   - Description: SharePoint URL to the JSON dataset file containing social media posts

**Input 2:**
   - Click + Add an input, then select Text.
   - Input name: depth
   - Description: Analysis depth level (Quick, Standard, or Deep)

**Input 3:**
   - Click + Add an input, then select Text.
   - Input name: summarization_model
   - Description: LLM model for topic summarization (always claude-sonnet-4-6)

## Step 7.3: Action 1 -- Initialize Variable varPostsJson

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Below the trigger, click + then Add an action.

2. Search for "Initialize variable" and select Initialize variable (under "Variable" actions).

3. Fill in:
   - Name: varPostsJson
   - Type: String
   - Value: (leave empty)

4. This variable will hold the raw JSON content of the posts dataset.

## Step 7.4: Action 2 -- Initialize Variable varAllChunkTopics

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Search for "Initialize variable" and select it.

2. Fill in:
   - Name: varAllChunkTopics
   - Type: String
   - Value: (leave empty)

3. This variable accumulates topic extraction results from each batch.

## Step 7.5: Action 3 -- Initialize Variable varAnalysisId

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Initialize variable.

2. Fill in:
   - Name: varAnalysisId
   - Type: String
   - Value: Click the Expression tab (the fx button) and paste: `guid()` then click OK.

3. This generates a unique identifier for this analysis session.

## Step 7.6: Action 4 -- Initialize Variable varFinalTopicsJson

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Initialize variable.

2. Fill in:
   - Name: varFinalTopicsJson
   - Type: String
   - Value: (leave empty)

## Step 7.7: Action 5 -- Get Anthropic API Key

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Search for "Compose" and select Compose (under "Data Operations").

2. In the Inputs field, paste your Anthropic API key (the literal key string starting with sk-ant-...).

3. Immediately secure this action: Click the three dots (...) on the Compose action, then Settings, then scroll down to Security, then toggle Secure Inputs to On, then toggle Secure Outputs to On, then click Done.

4. Rename this action: click the three dots (...), then Rename, then type: Get_Anthropic_Key

> **CRITICAL**: You MUST enable Secure Inputs and Secure Outputs on this action. Without this, your API key will be visible in the flow run history to anyone with access to the flow.

> **BEGINNER TIP**: A Compose action is the simplest way to store a value in a flow. Think of it as a named container. By securing it, the value is hidden from the run history logs.

## Step 7.8: Action 6 -- Get Posts from SharePoint

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Search for "Send an HTTP request to SharePoint" and select it (under the SharePoint connector).

2. Configure:
   - Site Address: Select your SharePoint site from the dropdown (e.g., https://yourcompany.sharepoint.com/sites/ResearchHub).
   - Method: GET
   - Uri: Click the dynamic content panel (the lightning bolt icon) and select sharepoint_posts_url from the trigger inputs. Then add /$value at the end. The full URI should look like: `triggerBody()?['sharepoint_posts_url']/$value`

   Actually, a simpler approach: Use the Expression tab (fx) and paste:
   ```
   triggerBody()?['sharepoint_posts_url']
   ```

   If the URL is a direct file URL, the SharePoint HTTP action will retrieve the file content.

3. Alternatively, use a Get file content action:
   - Search for "Get file content" (SharePoint connector).
   - Site Address: Your SharePoint site.
   - File Identifier: Click the lightning bolt and select sharepoint_posts_url from the trigger.

4. Rename this action to: Get_Posts_File

## Step 7.9: Action 7 -- Set varPostsJson from File Content

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Search for "Set variable" and select it.

2. Fill in:
   - Name: Select varPostsJson
   - Value: Click the lightning bolt, then from Get_Posts_File, select Body (or File Content depending on which action you used).

3. Rename to: Set_Posts_Json

## Step 7.10: Action 8 -- Build the System Prompt for Topic Extraction

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Compose.

2. In the Inputs field, paste:

```
You are a social research analyst specializing in topic modeling and theme discovery. Analyze the following batch of social media posts and extract recurring themes.

For each theme you discover:
1. Assign a concise 2-3 word topic label
2. List 5-7 representative keywords
3. Count how many posts in this batch support this theme
4. Assign a confidence score from 0.0 to 1.0
5. Extract 1-2 representative quotes (exact text from posts)

Return your analysis as valid JSON with this exact structure:
{"topics": [{"topic_id": 1, "topic_name": "Example Theme", "keywords": ["word1", "word2", "word3", "word4", "word5"], "post_count": 15, "confidence": 0.85, "representative_quotes": ["exact quote from a post"]}]}

Rules:
- Only identify themes supported by 3 or more posts
- Do not fabricate quotes -- use exact text from the provided posts
- Do not merge unrelated themes even if they share a keyword
- Return ONLY valid JSON, no markdown, no explanation text
```

3. Rename to: Topic_Extraction_System_Prompt

## Step 7.11: Action 9 -- Escape the System Prompt

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

```
replace(replace(replace(replace(outputs('Topic_Extraction_System_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK.

4. Rename to: Escape_System_Prompt

> **CRITICAL**: This 4-step escape chain is MANDATORY. Without it, newlines and special characters in the prompt will break the JSON body sent to the Claude API, causing 400 errors.

> **BEGINNER TIP**: The escape chain does four things in order: (1) escapes backslashes so they do not interfere with JSON, (2) escapes double quotes so they do not break the JSON string, (3) replaces actual newline characters with the literal text \n that JSON expects, and (4) strips carriage return characters that Windows adds to line breaks.

## Step 7.12: Action 10 -- Parse Posts Array

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Search for "Parse JSON" and select it (under "Data Operations").

2. Content: Click the lightning bolt and select varPostsJson.

3. Schema: Click "Generate from sample" and paste a minimal sample:

```json
[{"text": "sample post", "score": 10, "author": "user1", "created_utc": 1700000000}]
```

4. Click Done.

5. Rename to: Parse_Posts_Array

## Step 7.13: Action 11 -- Compose Post Count

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

```
length(body('Parse_Posts_Array'))
```

3. Click OK.

4. Rename to: Post_Count

## Step 7.14: Action 12 -- Chunk Posts into Batches (Select Action)

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

We need to split the posts array into chunks of 50. Power Automate does not have a native "chunk" action, so we use a combination of Select and range expressions.

1. Click + then Add an action. Select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

```
range(0, add(div(sub(length(body('Parse_Posts_Array')), 1), 50), 1))
```

3. Click OK. This creates an array of chunk indices [0, 1, 2, ...] based on how many 50-post batches are needed.

4. Rename to: Chunk_Indices

> **BEGINNER TIP**: If you have 150 posts, this expression creates [0, 1, 2] -- meaning three batches. The first batch is posts 0-49, the second is posts 50-99, and the third is posts 100-149.

## Step 7.15: Action 13 -- Apply to Each Chunk

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Search for "Apply to each" and select it (under "Control").

2. In the "Select an output from previous steps" field, click the lightning bolt and select Outputs from Chunk_Indices.

3. Inside the Apply to each loop, add the following actions:

**Action 13a -- Extract Chunk:**

4. Click + (inside the loop) then Add an action. Select Compose.

5. In the Inputs field, click the Expression tab (fx) and paste:

```
take(skip(body('Parse_Posts_Array'), mul(items('Apply_to_each'), 50)), 50)
```

6. Click OK. Rename to: Extract_Chunk

> **BEGINNER TIP**: This expression says "skip the first N*50 posts, then take the next 50." For chunk index 0, it skips 0 and takes 50. For chunk index 1, it skips 50 and takes 50. And so on.

**Action 13b -- Build User Prompt for This Chunk:**

7. Click + (inside the loop). Select Compose.

8. In the Inputs field, type: Analyze these social media posts and extract recurring themes:

9. Then click the lightning bolt and select Outputs from Extract_Chunk.

10. Rename to: Chunk_User_Prompt

**Action 13c -- Escape the User Prompt:**

11. Click + (inside the loop). Select Compose.

12. Click the Expression tab (fx) and paste:

```
replace(replace(replace(replace(string(outputs('Chunk_User_Prompt')),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

13. Click OK. Rename to: Escape_Chunk_Prompt

**Action 13d -- Build HTTP Body:**

14. Click + (inside the loop). Select Compose.

15. Click the Expression tab (fx) and paste:

```
concat('{"model":"claude-sonnet-4-6","max_tokens":8000,"temperature":0.2,"system":"',outputs('Escape_System_Prompt'),'","messages":[{"role":"user","content":"',outputs('Escape_Chunk_Prompt'),'"}]}')
```

16. Click OK. Rename to: Build_Claude_Body

**Action 13e -- HTTP POST to Claude API:**

17. Click + (inside the loop). Search for "HTTP" and select HTTP (the premium connector with the blue globe icon).

18. Configure:
   - Method: Select POST from the dropdown.
   - URI: https://api.anthropic.com/v1/messages
   - Headers: Click + Add new parameter, then check Headers. Add three headers:
     - Header 1: Key = x-api-key | Value = click the lightning bolt, then under Get_Anthropic_Key, select Outputs
     - Header 2: Key = anthropic-version | Value = 2023-06-01
     - Header 3: Key = Content-Type | Value = application/json
   - Body: Click the lightning bolt and select Outputs from Build_Claude_Body.

19. Secure this action: Click the three dots (...), then Settings, then toggle Secure Inputs to On, then click Done.

20. Set the timeout: Still in Settings, find the Timeout field and type: PT120S

21. Click Done to close Settings.

22. Rename to: HTTP_Claude_Chunk

**Action 13f -- Extract Claude Response:**

23. Click + (inside the loop). Select Compose.

24. Click the Expression tab (fx) and paste:

```
first(body('HTTP_Claude_Chunk')?['content'])?['text']
```

25. Click OK. Rename to: Extract_Chunk_Response

**Action 13g -- Append Chunk Topics to Accumulator:**

26. Click + (inside the loop). Search for "Append to string variable" and select it.

27. Fill in:
   - Name: Select varAllChunkTopics
   - Value: Click the lightning bolt and select Outputs from Extract_Chunk_Response. Then type a separator after it: `|||CHUNK_SEPARATOR|||`

28. Rename to: Append_Chunk_Topics

This completes the Apply to each loop. All chunks have been processed and their topic extractions accumulated in varAllChunkTopics.

## Step 7.16: Action 14 -- Build Consolidation Prompt

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling (below the Apply to each loop)

1. Click + (outside and below the Apply to each loop) then Add an action. Select Compose.

2. In the Inputs field, paste:

```
You are a social research analyst. Below are topic extraction results from multiple batches of the same dataset. Consolidate these into a single unified topic list.

Rules for consolidation:
1. Merge topics that describe the same theme (even if labeled differently across batches)
2. Sum post counts for merged topics
3. Recalculate confidence as the weighted average
4. Keep the best representative quotes from all batches
5. Produce a final list of 5-20 distinct topics, ranked by post count
6. Include a coherence assessment (high/medium/low) based on how well-separated the topics are

Return ONLY valid JSON with this structure:
{"total_topics": 12, "total_documents": 847, "coherence": "high", "topics": [{"topic_id": 1, "topic_name": "Theme Name", "keywords": ["k1","k2","k3","k4","k5"], "post_count": 198, "percentage": 23.4, "confidence": 0.87, "representative_quotes": ["quote1", "quote2"]}]}

Batch results to consolidate:
```

3. Rename to: Consolidation_System_Prompt

## Step 7.17: Action 15 -- Build Consolidation User Prompt

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Compose.

2. In the Inputs field, click the lightning bolt and select varAllChunkTopics.

3. Rename to: Consolidation_User_Prompt

## Step 7.18: Action 16 -- Escape Consolidation Prompts

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Compose.

2. Click the Expression tab (fx) and paste:

```
replace(replace(replace(replace(outputs('Consolidation_System_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK. Rename to: Escape_Consolidation_System

4. Click + then Add an action. Select Compose.

5. Click the Expression tab (fx) and paste:

```
replace(replace(replace(replace(variables('varAllChunkTopics'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

6. Click OK. Rename to: Escape_Consolidation_User

## Step 7.19: Action 17 -- Build Consolidation HTTP Body

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Compose.

2. Click the Expression tab (fx) and paste:

```
concat('{"model":"claude-sonnet-4-6","max_tokens":8000,"temperature":0.2,"system":"',outputs('Escape_Consolidation_System'),'","messages":[{"role":"user","content":"',outputs('Escape_Consolidation_User'),'"}]}')
```

3. Click OK. Rename to: Build_Consolidation_Body

## Step 7.20: Action 18 -- HTTP POST Consolidation to Claude

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select HTTP.

2. Configure:
   - Method: POST
   - URI: https://api.anthropic.com/v1/messages
   - Headers:
     - x-api-key: click the lightning bolt, select Outputs from Get_Anthropic_Key
     - anthropic-version: 2023-06-01
     - Content-Type: application/json
   - Body: Click the lightning bolt and select Outputs from Build_Consolidation_Body.

3. Secure this action: Click (...), then Settings, then Secure Inputs: On, then Timeout: PT120S, then Done.

4. Rename to: HTTP_Claude_Consolidation

## Step 7.21: Action 19 -- Extract Final Topics

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Compose.

2. Click the Expression tab (fx) and paste:

```
first(body('HTTP_Claude_Consolidation')?['content'])?['text']
```

3. Click OK. Rename to: Extract_Final_Topics

## Step 7.22: Action 20 -- Set varFinalTopicsJson

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Select Set variable.

2. Fill in:
   - Name: Select varFinalTopicsJson
   - Value: Click the lightning bolt and select Outputs from Extract_Final_Topics.

## Step 7.23: Action 21 -- Store Analysis in Dataverse

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Search for "Add a new row" and select it (under the Dataverse connector).

2. Configure:
   - Table name: Select Social Analyses from the dropdown.
   - analysis_id: Click the lightning bolt and select varAnalysisId.
   - status: Type completed
   - posts_url: Click the lightning bolt and select sharepoint_posts_url from the trigger.
   - topics_json: Click the lightning bolt and select varFinalTopicsJson.
   - analysis_type: Type topic_modeling
   - dataset_id: Click the lightning bolt and select sharepoint_posts_url from the trigger.
   - model_used: Type claude-sonnet-4-6
   - depth: Click the lightning bolt and select depth from the trigger.

3. Rename to: Store_Analysis_Dataverse

## Step 7.24: Action 22 -- Respond to Agent

WHERE AM I?: Power Automate > Flow Editor > Run Topic Modeling

1. Click + then Add an action. Search for "Respond to Copilot" and select it (or "Return value(s) to Power Virtual Agents").

2. Click + Add an output three times:

**Output 1:**
   - Type: Text
   - Name: analysis_id
   - Value: Click the lightning bolt and select varAnalysisId.

**Output 2:**
   - Type: Text
   - Name: status
   - Value: Type completed

**Output 3:**
   - Type: Text
   - Name: topics_json
   - Value: Click the lightning bolt and select varFinalTopicsJson.

3. Click the Respond to Copilot action, then click Settings (or the three dots, then Settings), then find Networking, then confirm Asynchronous Response is set to Off.

4. Click Save at the top of the flow editor. Wait for the green "Your flow is ready" banner.

> **VERIFY**: The flow should show no errors. If you see red error indicators, click them to read the issue.

## Step 7.25: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | varPostsJson | Initialize variable | String, empty |
| 2 | varAllChunkTopics | Initialize variable | String, empty |
| 3 | varAnalysisId | Initialize variable | String, guid() |
| 4 | varFinalTopicsJson | Initialize variable | String, empty |
| 5 | Get_Anthropic_Key | Compose | API key, Secure In/Out ON |
| 6 | Get_Posts_File | Get file content (SharePoint) | sharepoint_posts_url |
| 7 | Set_Posts_Json | Set variable | varPostsJson = file body |
| 8 | Topic_Extraction_System_Prompt | Compose | Full system prompt text |
| 9 | Escape_System_Prompt | Compose | 4-step escape chain |
| 10 | Parse_Posts_Array | Parse JSON | varPostsJson |
| 11 | Post_Count | Compose | length(body('Parse_Posts_Array')) |
| 12 | Chunk_Indices | Compose | range() for batch indices |
| 13 | Apply_to_each | Apply to each | Loop over Chunk_Indices |
| 13a | Extract_Chunk | Compose | take(skip(...), 50) |
| 13b | Chunk_User_Prompt | Compose | Prompt + chunk data |
| 13c | Escape_Chunk_Prompt | Compose | 4-step escape chain |
| 13d | Build_Claude_Body | Compose | concat() JSON body |
| 13e | HTTP_Claude_Chunk | HTTP | POST to Claude API, PT120S |
| 13f | Extract_Chunk_Response | Compose | first(body(...)...) |
| 13g | Append_Chunk_Topics | Append to string variable | varAllChunkTopics |
| 14 | Consolidation_System_Prompt | Compose | Merge instructions |
| 15 | Consolidation_User_Prompt | Compose | varAllChunkTopics |
| 16 | Escape_Consolidation_System | Compose | 4-step escape chain |
| 17 | Escape_Consolidation_User | Compose | 4-step escape chain |
| 18 | Build_Consolidation_Body | Compose | concat() JSON body |
| 19 | HTTP_Claude_Consolidation | HTTP | POST to Claude API, PT120S |
| 20 | Extract_Final_Topics | Compose | first(body(...)...) |
| 21 | Set varFinalTopicsJson | Set variable | Final topics JSON |
| 22 | Store_Analysis_Dataverse | Add a new row (Dataverse) | Social Analyses table |
| 23 | Respond to Copilot | Respond to Copilot | analysis_id, status, topics_json |

---

# PHASE 8: Run Topic Modeling -- TOOL REGISTRATION

This phase registers the Run Topic Modeling flow as a tool that the agent can call.

## Step 8.1: Register the Flow as an Agent Tool

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview > Tools

1. Go back to Copilot Studio and open your Social Research Analyst agent.

2. On the Overview page, find the Tools section. Click Add a tool.

3. In the tool picker, click Power Automate flows (or Flows depending on your view).

4. Find Run Topic Modeling in the list. Click it, then click Add and configure.

5. On the configuration screen:
   - Name: Run Topic Modeling
   - Description: Starts topic modeling analysis on a social media dataset by sending posts to Claude API in batches of 50 for theme extraction, then consolidates results into a unified topic list. Returns analysis_id for status tracking and topics_json with discovered themes. Call this when the user wants to discover themes, run topic analysis, or find what people are talking about.

6. Map the inputs:
   - sharepoint_posts_url: Set to the global variable Global.varDatasetUrl
   - depth: Set to the topic variable Topic.varAnalysisDepth (or let the orchestrator fill from context)
   - summarization_model: Set to a static value: claude-sonnet-4-6

7. Completion mode: Select "Don't respond (default)" -- the agent will incorporate the output into its next message.

8. Click Save.

## Step 8.2: Connect the Flow to the Topic Analysis Request Topic

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request

1. Open the Topic Analysis Request topic.

2. Find the placeholder message node from Step 3.7 (the one that says "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Run Topic Modeling flow").

3. Delete the placeholder message node: click the three dots (...) on the node, then Delete.

4. In its place, click the + button, then select Add a tool, then select Run Topic Modeling.

5. A new Action node appears. Map each input:
   - sharepoint_posts_url: Click the input field, then select Global.varDatasetUrl from the variable list.
   - depth: Click the input field, then select Topic.varAnalysisDepth.
   - summarization_model: Click the input field, then type claude-sonnet-4-6.

6. After the Action node, the flow outputs are available as variables. Click the output variable names to verify:
   - analysis_id output: Click it, then in Variable properties, set Variable name to varAnalysisId, and set Usage to "Global (any topic can access)" so it becomes Global.varAnalysisId.
   - status output: Map to Topic.varTopicStatus.
   - topics_json output: Map to Topic.varTopicResults.

7. Click Save.

> **VERIFY**: The Action node should show green checkmarks on all mapped inputs and outputs. If you see yellow warnings, click them to resolve mapping issues.

---

# PHASE 9: Check Analysis Status -- FLOW BUILD (Action-by-Action)

This flow checks the status of a running analysis by querying the Dataverse Social Analyses table. It returns the current status, which the topic uses to determine whether to display results or continue waiting.

## Step 9.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > Social Research Analyst Solution

1. In your solution at make.powerautomate.com, click + New, then Automation, then Cloud flow, then Instant.

2. Flow name: Check Analysis Status

3. Trigger: Run a flow from Copilot. Click Create.

## Step 9.2: Configure Trigger Inputs

WHERE AM I?: Power Automate > Flow Editor > Check Analysis Status > Trigger

1. Add two text inputs:

**Input 1:**
   - Click + Add an input, then Text.
   - Input name: job_id
   - Description: Analysis ID to check status for

**Input 2:**
   - Click + Add an input, then Text.
   - Input name: job_type
   - Description: Type of analysis job (topic_modeling or sentiment)

## Step 9.3: Action 1 -- Query Dataverse for Analysis Status

WHERE AM I?: Power Automate > Flow Editor > Check Analysis Status

1. Click + then Add an action. Search for "List rows" and select it (under the Dataverse connector).

2. Configure:
   - Table name: Select Social Analyses.
   - Filter rows: Click in the field and type: analysis_id eq '
   - Then click the lightning bolt and select job_id from the trigger.
   - Then type: '
   - The full filter should look like: `analysis_id eq 'job_id_value'`
   - In the Expression tab, you can also paste: `concat('analysis_id eq ''', triggerBody()?['job_id'], '''')`

3. Rename to: Query_Analysis_Status

## Step 9.4: Action 2 -- Extract Status Fields

WHERE AM I?: Power Automate > Flow Editor > Check Analysis Status

1. Click + then Add an action. Select Compose.

2. Click the Expression tab (fx) and paste:

```
first(body('Query_Analysis_Status')?['value'])?['status']
```

3. Click OK. Rename to: Extract_Status

## Step 9.5: Action 3 -- Determine Progress

WHERE AM I?: Power Automate > Flow Editor > Check Analysis Status

1. Click + then Add an action. Select Compose.

2. Click the Expression tab (fx) and paste:

```
if(equals(outputs('Extract_Status'), 'completed'), '100', if(equals(outputs('Extract_Status'), 'failed'), '0', '50'))
```

3. Click OK. Rename to: Calculate_Progress

> **BEGINNER TIP**: Since we store the final result in Dataverse only when complete, the status is either "completed" (100%), "failed" (0%), or we estimate 50% for any intermediate state.

## Step 9.6: Action 4 -- Respond to Agent

WHERE AM I?: Power Automate > Flow Editor > Check Analysis Status

1. Click + then Add an action. Select Respond to Copilot.

2. Add three outputs:

**Output 1:**
   - Type: Text
   - Name: status
   - Value: Click the lightning bolt and select Outputs from Extract_Status.

**Output 2:**
   - Type: Text
   - Name: progress_percent
   - Value: Click the lightning bolt and select Outputs from Calculate_Progress.

**Output 3:**
   - Type: Text
   - Name: current_phase
   - Value: Click the Expression tab (fx) and paste: `if(equals(outputs('Extract_Status'), 'completed'), 'complete', 'processing')`

3. Confirm Asynchronous Response is Off (Settings, then Networking).

4. Click Save.

## Step 9.7: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Query_Analysis_Status | List rows (Dataverse) | Filter by analysis_id |
| 2 | Extract_Status | Compose | first(body(...))?['status'] |
| 3 | Calculate_Progress | Compose | if/else for progress % |
| 4 | Respond to Copilot | Respond to Copilot | status, progress_percent, current_phase |

---

# PHASE 10: Check Analysis Status -- TOOL REGISTRATION

## Step 10.1: Register as Topic-Level Tool

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Topic Analysis Request

1. Open the Topic Analysis Request topic.

2. Find the status polling placeholder (Step 3.9).

3. Delete the placeholder. Click +, then Add a tool, then select Check Analysis Status.

4. Map inputs:
   - job_id: Select Global.varAnalysisId
   - job_type: Type topic_modeling

5. Map outputs:
   - status -> Topic.varTopicStatus
   - progress_percent -> Topic.varProgressPercent
   - current_phase -> Topic.varCurrentPhase

6. Click Save.

7. Repeat this registration in the Sentiment Analysis topic (Step 4.6 placeholder) with job_type set to "sentiment" and outputs mapped to the sentiment-specific variables.

---

# PHASE 11: Get Topic Results -- FLOW BUILD (Action-by-Action)

This flow retrieves completed topic modeling results from Dataverse and formats them for display.

## Step 11.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > Social Research Analyst Solution

1. Create a new instant cloud flow: + New, then Automation, then Cloud flow, then Instant.

2. Flow name: Get Topic Results. Trigger: Run a flow from Copilot. Click Create.

## Step 11.2: Configure Trigger Input

1. Add one text input:
   - Input name: job_id
   - Description: Completed topic modeling job ID

## Step 11.3: Action 1 -- Query Dataverse for Results

WHERE AM I?: Power Automate > Flow Editor > Get Topic Results

1. Click + then Add an action. Select List rows (Dataverse).

2. Configure:
   - Table name: Social Analyses
   - Filter rows: Use the Expression tab: `concat('analysis_id eq ''', triggerBody()?['job_id'], '''')`

3. Rename to: Query_Topic_Results

## Step 11.4: Action 2 -- Extract Topics JSON

1. Click + then Add an action. Select Compose.

2. Click the Expression tab (fx) and paste:

```
first(body('Query_Topic_Results')?['value'])?['topics_json']
```

3. Click OK. Rename to: Extract_Topics_Json

## Step 11.5: Action 3 -- Parse Topics for Summary

1. Click + then Add an action. Select Compose.

2. Click the Expression tab (fx) and paste:

```
coalesce(first(body('Query_Topic_Results')?['value'])?['topics_json'], '{"total_topics": 0, "topics": []}')
```

3. Click OK. Rename to: Safe_Topics_Json

## Step 11.6: Action 4 -- Extract Total Topics Count

1. Click + then Add an action. Select Compose.

2. Click the Expression tab (fx) and paste:

```
coalesce(json(outputs('Safe_Topics_Json'))?['total_topics'], 0)
```

3. Click OK. Rename to: Total_Topics_Count

## Step 11.7: Action 5 -- Extract Total Documents Count

1. Click + then Add an action. Select Compose.

2. Click the Expression tab (fx) and paste:

```
coalesce(json(outputs('Safe_Topics_Json'))?['total_documents'], 0)
```

3. Click OK. Rename to: Total_Documents_Count

## Step 11.8: Action 6 -- Respond to Agent

1. Click + then Add an action. Select Respond to Copilot.

2. Add three outputs:

**Output 1:**
   - Type: Text
   - Name: results_summary
   - Value: Click the lightning bolt and select Outputs from Safe_Topics_Json.

**Output 2:**
   - Type: Text
   - Name: total_topics
   - Value: Click the lightning bolt and select Outputs from Total_Topics_Count.

**Output 3:**
   - Type: Text
   - Name: total_documents
   - Value: Click the lightning bolt and select Outputs from Total_Documents_Count.

3. Confirm Asynchronous Response is Off. Click Save.

## Step 11.9: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Query_Topic_Results | List rows (Dataverse) | Filter by analysis_id |
| 2 | Extract_Topics_Json | Compose | first(body(...))?['topics_json'] |
| 3 | Safe_Topics_Json | Compose | coalesce() null-safe wrapper |
| 4 | Total_Topics_Count | Compose | json(...)?['total_topics'] |
| 5 | Total_Documents_Count | Compose | json(...)?['total_documents'] |
| 6 | Respond to Copilot | Respond to Copilot | results_summary, total_topics, total_documents |

---

# PHASE 12: Get Topic Results -- TOOL REGISTRATION

## Step 12.1: Register as Agent-Level Tool

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview > Tools

1. On the Overview page, find the Tools section. Click Add a tool.

2. Select Power Automate flows, then find Get Topic Results, then click Add and configure.

3. Configure:
   - Name: Get Topic Results
   - Description: Retrieves completed topic modeling results from Dataverse including topic list with labels, keywords, post counts, confidence scores, and coherence assessment. Call this after topic modeling completes to display results to the user.

4. Map inputs:
   - job_id: Set to Global.varAnalysisId

5. Completion mode: Don't respond (default).

6. Click Save.

## Step 12.2: Connect to Results Review Topic

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Results Review

1. Open the Results Review topic.

2. Find the retrieve results placeholder (Step 6.3). Delete it.

3. Click +, then Add a tool, then select Get Topic Results.

4. Map inputs: job_id -> Global.varAnalysisId

5. Map outputs: results_summary -> Topic.varAnalysisResults, total_topics -> Topic.varTotalTopics, total_documents -> Topic.varTotalDocuments.

6. Click Save.

---

# PHASE 13: Run Sentiment Analysis -- FLOW BUILD (Action-by-Action)

This flow sends posts to Claude for sentiment classification, producing positive/neutral/negative distributions with compound scores and representative quotes.

## Step 13.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > Social Research Analyst Solution

1. Create a new instant cloud flow: + New, then Automation, then Cloud flow, then Instant.

2. Flow name: Run Sentiment Analysis. Trigger: Run a flow from Copilot. Click Create.

## Step 13.2: Configure Trigger Inputs

1. Add three text inputs:

**Input 1:** dataset_id (String) -- Dataset ID or SharePoint URL for the social data
**Input 2:** topic_model_job_id (String) -- Optional job ID from prior topic modeling
**Input 3:** target_topic_ids (String) -- Optional comma-separated topic IDs to limit scope

## Step 13.3: Action 1 -- Initialize Variables

1. Add Initialize variable: Name: varSentimentId, Type: String, Value: fx `guid()`
2. Add Initialize variable: Name: varSentimentResults, Type: String, Value: (empty)

## Step 13.4: Action 2 -- Get Anthropic API Key

1. Add Compose action. Paste your Anthropic API key. Secure Inputs: On. Secure Outputs: On. Rename to: Get_Anthropic_Key

## Step 13.5: Action 3 -- Get Posts from SharePoint

1. Add Get file content (SharePoint). Site Address: your site. File Identifier: click lightning bolt, select dataset_id from trigger. Rename to: Get_Posts_For_Sentiment

## Step 13.6: Action 4 -- Build Sentiment System Prompt

1. Add Compose. Paste:

```
You are a social research analyst specializing in sentiment analysis. Classify each post as positive, neutral, or negative. For each post, assign a compound sentiment score from -1.0 (most negative) to +1.0 (most positive).

After classifying all posts, provide:
1. Overall distribution: percentage of positive, neutral, and negative posts
2. Average compound score across all posts
3. 2-3 representative quotes for each sentiment category (exact text from posts)
4. If topic IDs are provided, break down sentiment by topic

Return ONLY valid JSON:
{"total_posts": 100, "positive_pct": 35.0, "neutral_pct": 45.0, "negative_pct": 20.0, "compound_avg": 0.12, "representative_quotes": {"positive": ["quote1", "quote2"], "neutral": ["quote1", "quote2"], "negative": ["quote1", "quote2"]}, "per_topic": [{"topic_id": 1, "topic_name": "Theme", "positive_pct": 40, "neutral_pct": 35, "negative_pct": 25, "compound_avg": 0.15}]}
```

2. Rename to: Sentiment_System_Prompt

## Step 13.7: Action 5 -- Escape System Prompt

1. Add Compose. Expression:

```
replace(replace(replace(replace(outputs('Sentiment_System_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

2. Rename to: Escape_Sentiment_System

## Step 13.8: Action 6 -- Build User Prompt with Posts

1. Add Compose. In Inputs, type: Analyze the sentiment of these social media posts:

2. Then click the lightning bolt and select Body from Get_Posts_For_Sentiment.

3. If topic IDs were provided, append: Focus on posts related to topic IDs: then click lightning bolt and select target_topic_ids from trigger.

4. Rename to: Sentiment_User_Prompt

## Step 13.9: Action 7 -- Escape User Prompt

1. Add Compose. Expression:

```
replace(replace(replace(replace(string(outputs('Sentiment_User_Prompt')),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

2. Rename to: Escape_Sentiment_User

## Step 13.10: Action 8 -- Build HTTP Body

1. Add Compose. Expression:

```
concat('{"model":"claude-sonnet-4-6","max_tokens":8000,"temperature":0.2,"system":"',outputs('Escape_Sentiment_System'),'","messages":[{"role":"user","content":"',outputs('Escape_Sentiment_User'),'"}]}')
```

2. Rename to: Build_Sentiment_Body

## Step 13.11: Action 9 -- HTTP POST to Claude

1. Add HTTP action.
   - Method: POST
   - URI: https://api.anthropic.com/v1/messages
   - Headers: x-api-key = Outputs from Get_Anthropic_Key, anthropic-version = 2023-06-01, Content-Type = application/json
   - Body: Outputs from Build_Sentiment_Body
   - Secure Inputs: On. Timeout: PT120S.

2. Rename to: HTTP_Claude_Sentiment

## Step 13.12: Action 10 -- Extract Sentiment Response

1. Add Compose. Expression:

```
first(body('HTTP_Claude_Sentiment')?['content'])?['text']
```

2. Rename to: Extract_Sentiment_Response

## Step 13.13: Action 11 -- Store in Dataverse

1. Add "Add a new row" (Dataverse).
   - Table: Social Analyses
   - analysis_id: varSentimentId
   - status: completed
   - posts_url: dataset_id from trigger
   - sentiment_json: Outputs from Extract_Sentiment_Response
   - analysis_type: sentiment
   - model_used: claude-sonnet-4-6

2. Rename to: Store_Sentiment_Dataverse

## Step 13.14: Action 12 -- Respond to Agent

1. Add Respond to Copilot with two outputs:
   - job_id (Text): varSentimentId
   - status (Text): completed

2. Asynchronous Response: Off. Click Save.

## Step 13.15: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | varSentimentId | Initialize variable | String, guid() |
| 2 | varSentimentResults | Initialize variable | String, empty |
| 3 | Get_Anthropic_Key | Compose | API key, Secure In/Out ON |
| 4 | Get_Posts_For_Sentiment | Get file content (SharePoint) | dataset_id |
| 5 | Sentiment_System_Prompt | Compose | Classification instructions |
| 6 | Escape_Sentiment_System | Compose | 4-step escape chain |
| 7 | Sentiment_User_Prompt | Compose | Posts + optional topic filter |
| 8 | Escape_Sentiment_User | Compose | 4-step escape chain |
| 9 | Build_Sentiment_Body | Compose | concat() JSON body |
| 10 | HTTP_Claude_Sentiment | HTTP | POST to Claude, PT120S |
| 11 | Extract_Sentiment_Response | Compose | first(body(...)...) |
| 12 | Store_Sentiment_Dataverse | Add a new row (Dataverse) | Social Analyses table |
| 13 | Respond to Copilot | Respond to Copilot | job_id, status |

---

# PHASE 14: Run Sentiment Analysis -- TOOL REGISTRATION

## Step 14.1: Register as Agent-Level Tool

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview > Tools

1. Click Add a tool, then Power Automate flows, then select Run Sentiment Analysis, then Add and configure.

2. Configure:
   - Name: Run Sentiment Analysis
   - Description: Classifies social media posts as positive, neutral, or negative using Claude API sentiment analysis. Returns compound scores from -1.0 to +1.0 and representative quotes. Call this when the user wants to measure sentiment, emotional tone, or opinion distribution.

3. Map inputs:
   - dataset_id: Global.varDatasetUrl
   - topic_model_job_id: Global.varAnalysisId (optional -- may be blank)
   - target_topic_ids: Let orchestrator fill from context

4. Completion mode: Don't respond (default). Click Save.

## Step 14.2: Connect to Sentiment Analysis Topic

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Sentiment Analysis

1. Open the Sentiment Analysis topic. Find the execute sentiment placeholder (Step 4.6). Delete it.

2. Click +, then Add a tool, then select Run Sentiment Analysis.

3. Map inputs: dataset_id -> Global.varDatasetUrl, topic_model_job_id -> Global.varAnalysisId, target_topic_ids -> Topic.varTargetTopicIds.

4. Map outputs: job_id -> Topic.varSentimentJobId, status -> Topic.varSentimentStatus.

5. Click Save.

---

# PHASE 15: Get Sentiment Results -- FLOW BUILD (Action-by-Action)

This flow retrieves completed sentiment analysis results from Dataverse.

## Step 15.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > Social Research Analyst Solution

1. Create a new instant cloud flow: Get Sentiment Results. Trigger: Run a flow from Copilot.

## Step 15.2: Configure Trigger Input

1. Add one text input: job_id (String) -- Completed sentiment analysis job ID

## Step 15.3: Action 1 -- Query Dataverse

1. Add List rows (Dataverse). Table: Social Analyses. Filter: `concat('analysis_id eq ''', triggerBody()?['job_id'], '''')`. Rename to: Query_Sentiment_Results

## Step 15.4: Action 2 -- Extract Sentiment JSON

1. Add Compose. Expression: `first(body('Query_Sentiment_Results')?['value'])?['sentiment_json']`. Rename to: Extract_Sentiment_Json

## Step 15.5: Action 3 -- Extract Counts

1. Add Compose. Expression: `coalesce(json(outputs('Extract_Sentiment_Json'))?['positive_pct'], 0)`. Rename to: Positive_Pct

2. Add Compose. Expression: `coalesce(json(outputs('Extract_Sentiment_Json'))?['negative_pct'], 0)`. Rename to: Negative_Pct

## Step 15.6: Action 4 -- Respond to Agent

1. Add Respond to Copilot with three outputs:
   - results_summary (Text): Outputs from Extract_Sentiment_Json
   - positive_count (Text): Outputs from Positive_Pct
   - negative_count (Text): Outputs from Negative_Pct

2. Asynchronous Response: Off. Click Save.

## Step 15.7: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Query_Sentiment_Results | List rows (Dataverse) | Filter by analysis_id |
| 2 | Extract_Sentiment_Json | Compose | first(body(...))?['sentiment_json'] |
| 3 | Positive_Pct | Compose | json(...)?['positive_pct'] |
| 4 | Negative_Pct | Compose | json(...)?['negative_pct'] |
| 5 | Respond to Copilot | Respond to Copilot | results_summary, positive_count, negative_count |

---

# PHASE 16: Get Sentiment Results -- TOOL REGISTRATION

## Step 16.1: Register as Agent-Level Tool

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview > Tools

1. Click Add a tool, then Power Automate flows, then select Get Sentiment Results, then Add and configure.

2. Configure:
   - Name: Get Sentiment Results
   - Description: Retrieves completed sentiment analysis results from Dataverse including positive/neutral/negative distribution percentages, compound score average, and representative quotes for each sentiment category. Call this after sentiment analysis completes.

3. Map inputs: job_id -> Global.varAnalysisId (or let orchestrator fill from context)

4. Completion mode: Don't respond (default). Click Save.

## Step 16.2: Connect to Sentiment Analysis Topic

1. Open the Sentiment Analysis topic. Find the retrieve sentiment results placeholder (Step 4.7). Delete it.

2. Click +, then Add a tool, then select Get Sentiment Results.

3. Map inputs: job_id -> Topic.varSentimentJobId.

4. Map outputs: results_summary -> Topic.varSentimentResults, positive_count -> Topic.varPositiveCount, negative_count -> Topic.varNegativeCount.

5. Click Save.

---

# PHASE 17: Semantic Search -- FLOW BUILD (Action-by-Action)

This flow sends a natural language query and the dataset to Claude, which ranks posts by semantic relevance.

## Step 17.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > Social Research Analyst Solution

1. Create a new instant cloud flow: Semantic Search. Trigger: Run a flow from Copilot.

## Step 17.2: Configure Trigger Inputs

1. Add three inputs:
   - search_query (Text) -- Natural language search query
   - dataset_id (Text) -- SharePoint URL to the JSON dataset
   - max_results (Text) -- Maximum number of results (default 20)

## Step 17.3: Action 1 -- Initialize Variables

1. Add Initialize variable: varSearchResults, String, empty.

## Step 17.4: Action 2 -- Get Anthropic API Key

1. Add Compose. Paste API key. Secure In/Out: On. Rename to: Get_Anthropic_Key

## Step 17.5: Action 3 -- Get Posts from SharePoint

1. Add Get file content (SharePoint). File Identifier: dataset_id from trigger. Rename to: Get_Posts_For_Search

## Step 17.6: Action 4 -- Build Search System Prompt

1. Add Compose. Paste:

```
You are a semantic search engine for social media data. Given a natural language query and a collection of posts, rank the posts by relevance to the query.

For each matching post, assign a relevance score from 0.0 (not relevant) to 1.0 (highly relevant). Only include posts with relevance score >= 0.5.

Return the top results as valid JSON:
{"query": "original query", "total_matches": 15, "results": [{"rank": 1, "relevance_score": 0.95, "post_title": "first 100 chars of text", "post_excerpt": "most relevant 200-char excerpt", "author": "username", "date": "YYYY-MM-DD", "score": 42, "num_comments": 7}]}

Rules:
- Rank by semantic meaning, not keyword overlap
- Include posts that discuss the concept even without exact keyword matches
- Post excerpts should highlight the most relevant portion
- Return ONLY valid JSON
```

2. Rename to: Search_System_Prompt

## Step 17.7: Action 5 -- Escape System Prompt

1. Add Compose. Expression:

```
replace(replace(replace(replace(outputs('Search_System_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

2. Rename to: Escape_Search_System

## Step 17.8: Action 6 -- Build User Prompt

1. Add Compose. In Inputs, type the search query reference and posts. Use concat in Expression:

```
concat('Search query: ', triggerBody()?['search_query'], '\n\nMax results: ', triggerBody()?['max_results'], '\n\nPosts to search:\n', string(body('Get_Posts_For_Search')))
```

2. Rename to: Search_User_Prompt

## Step 17.9: Action 7 -- Escape User Prompt

1. Add Compose. Expression:

```
replace(replace(replace(replace(outputs('Search_User_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

2. Rename to: Escape_Search_User

## Step 17.10: Action 8 -- Build HTTP Body

1. Add Compose. Expression:

```
concat('{"model":"claude-sonnet-4-6","max_tokens":8000,"temperature":0.1,"system":"',outputs('Escape_Search_System'),'","messages":[{"role":"user","content":"',outputs('Escape_Search_User'),'"}]}')
```

2. Rename to: Build_Search_Body

> **BEGINNER TIP**: We use temperature 0.1 (lower than the 0.2 used for topic modeling) because search ranking should be as deterministic as possible.

## Step 17.11: Action 9 -- HTTP POST to Claude

1. Add HTTP action.
   - Method: POST
   - URI: https://api.anthropic.com/v1/messages
   - Headers: x-api-key = Outputs from Get_Anthropic_Key, anthropic-version = 2023-06-01, Content-Type = application/json
   - Body: Outputs from Build_Search_Body
   - Secure Inputs: On. Timeout: PT120S.

2. Rename to: HTTP_Claude_Search

## Step 17.12: Action 10 -- Extract Search Response

1. Add Compose. Expression:

```
first(body('HTTP_Claude_Search')?['content'])?['text']
```

2. Rename to: Extract_Search_Response

## Step 17.13: Action 11 -- Extract Total Matches

1. Add Compose. Expression:

```
coalesce(json(outputs('Extract_Search_Response'))?['total_matches'], 0)
```

2. Rename to: Total_Matches

## Step 17.14: Action 12 -- Respond to Agent

1. Add Respond to Copilot with two outputs:
   - search_results (Text): Outputs from Extract_Search_Response
   - total_matches (Text): Outputs from Total_Matches

2. Asynchronous Response: Off. Click Save.

## Step 17.15: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | varSearchResults | Initialize variable | String, empty |
| 2 | Get_Anthropic_Key | Compose | API key, Secure In/Out ON |
| 3 | Get_Posts_For_Search | Get file content (SharePoint) | dataset_id |
| 4 | Search_System_Prompt | Compose | Ranking instructions |
| 5 | Escape_Search_System | Compose | 4-step escape chain |
| 6 | Search_User_Prompt | Compose | concat(query + posts) |
| 7 | Escape_Search_User | Compose | 4-step escape chain |
| 8 | Build_Search_Body | Compose | concat() JSON body |
| 9 | HTTP_Claude_Search | HTTP | POST to Claude, PT120S, temp 0.1 |
| 10 | Extract_Search_Response | Compose | first(body(...)...) |
| 11 | Total_Matches | Compose | json(...)?['total_matches'] |
| 12 | Respond to Copilot | Respond to Copilot | search_results, total_matches |

---

# PHASE 18: Semantic Search -- TOOL REGISTRATION

## Step 18.1: Register as Agent-Level Tool

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview > Tools

1. Click Add a tool, then Power Automate flows, then select Semantic Search, then Add and configure.

2. Configure:
   - Name: Semantic Search
   - Description: Searches social media posts by semantic meaning using Claude API relevance ranking. Accepts a natural language query and returns posts ranked by relevance score (0.0-1.0) with excerpts and metadata. Call this when the user wants to find specific content, search by meaning, or look for posts about a particular subject.

3. Map inputs:
   - search_query: Let orchestrator fill from user message
   - dataset_id: Global.varDatasetUrl
   - max_results: Let orchestrator fill (default "20")

4. Completion mode: Don't respond (default). Click Save.

## Step 18.2: Connect to Semantic Search Topic

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics > Semantic Search

1. Open the Semantic Search topic. Find the execute search placeholder (Step 5.5). Delete it.

2. Click +, then Add a tool, then select Semantic Search.

3. Map inputs: search_query -> Topic.varSearchQuery, dataset_id -> Global.varDatasetUrl, max_results -> Topic.varMaxResults.

4. Map outputs: search_results -> Topic.varSearchResults, total_matches -> Topic.varTotalMatches.

5. Click Save.

---

# PHASE 19: Publish and Deploy to Teams

## Step 19.1: Publish the Agent

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Overview

1. In Copilot Studio, click the Publish button at the top of the Overview page.

2. In the confirmation dialog, click Publish again.

3. Wait for the green "Published successfully" banner. This may take 1-2 minutes.

> **CRITICAL**: Event triggers and tool registrations only become active after publishing. Conversational features work in the test pane before publishing, but the full pipeline requires this step.

## Step 19.2: Deploy to Microsoft Teams

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Channels

1. After publishing, click the Channels tab in the top navigation.

2. Click the "Teams and Microsoft 365 Copilot" tile.

3. Click Add channel.

4. A panel opens. Click "See agent in Teams" -- this opens Microsoft Teams and prompts you to install the agent.

5. In Teams, click Add to install the agent in your chat.

6. To share with your team:
   - Click Availability options in the Copilot Studio channel panel, then Submit for admin approval.
   - Your Teams admin goes to Teams Admin Center, then Apps, then finds your agent, then clicks Publish.

## Step 19.3: Configure Email Delivery

WHERE AM I?: Copilot Studio > Agents > Social Research Analyst > Topics (any topic with results)

1. To add email delivery of results, add a final action in each results topic that calls an Office 365 Outlook "Send an email" action.

2. In the Topic Analysis Request topic, after the results Adaptive Card, add a Condition node asking if the user wants email delivery.

3. If yes, add an Action node calling a simple email flow that takes the results JSON and user email as inputs and sends a formatted email.

> **BEGINNER TIP**: Email delivery is optional. The primary delivery channel is Teams Adaptive Cards. You can add email delivery later as an enhancement.

---

# PHASE 20: Testing (5+ Scenarios)

## Step 20.1: Test 1 -- Topic Analysis End-to-End

WHERE AM I?: Microsoft Teams > Social Research Analyst chat

1. Open Teams and find the Social Research Analyst agent in your chat.

2. Type: run topic analysis

3. Expected: The agent displays the topic analysis introduction message and asks for a dataset URL.

4. Paste a SharePoint URL to a JSON dataset with 100+ posts.

5. Expected: The agent validates the URL and asks for analysis depth.

6. Type: Standard

7. Expected: The agent confirms the analysis has started, shows an analysis ID, and processes the dataset through Claude.

8. After 30-90 seconds, expected: The agent displays the Topic Results Summary Adaptive Card with total topics found, top 5 topics, keywords, and coherence assessment.

## Step 20.2: Test 2 -- Sentiment Analysis on Full Dataset

1. Type: analyze sentiment

2. Expected: The agent asks whether to analyze the full dataset or specific topics.

3. Type: Entire Dataset

4. Expected: The agent runs sentiment analysis and displays the Sentiment Dashboard Adaptive Card with positive/neutral/negative percentages and representative quotes.

## Step 20.3: Test 3 -- Semantic Search

1. Type: search posts about customer service complaints

2. Expected: The agent asks for the number of results (or uses default 20).

3. Type: default

4. Expected: The agent displays ranked search results with relevance scores, excerpts, and metadata.

## Step 20.4: Test 4 -- Results Review

1. Type: view analysis results

2. Expected: The agent retrieves the most recent analysis and displays the Results Dashboard Adaptive Card.

## Step 20.5: Test 5 -- Dataset Validation (Edge Case)

1. Type: run topic analysis

2. When asked for a URL, type: invalid-url

3. Expected: The agent displays an error message asking for a valid SharePoint URL.

## Step 20.6: Test 6 -- Topic-Scoped Sentiment

1. First run topic analysis (Test 1).

2. Then type: analyze sentiment for specific topics

3. Expected: The agent checks for a completed topic model, finds one, and asks which topic IDs to analyze.

4. Type: 1, 3, 5

5. Expected: The agent runs scoped sentiment analysis and shows per-topic breakdowns.

---

# PHASE 21: Troubleshooting Reference

| Symptom | Resolution |
|---|---|
| Agent does not respond to any query | Verify generative orchestration is enabled (Step 1.3). Confirm the agent is published (Step 19.1). Check that at least one knowledge source is connected with a green checkmark. |
| Agent says "I could not find information" | Your SharePoint Analysis Guides library may be empty. Upload methodology documents. Check that the knowledge source description accurately describes the content. |
| Topic Analysis Request topic does not trigger | Verify the topic is saved and enabled. Check trigger phrases include "run topic modeling." Test by typing the exact phrase "run topic modeling" in the test pane. |
| Claude API returns 401 error | Your Anthropic API key is expired or incorrect. Go to the flow, check the Get_Anthropic_Key Compose action value. Verify it starts with sk-ant-. |
| Claude API returns 400 error | The JSON body is malformed. Check that all escape chains (Rule 38) are applied correctly. Open the flow run history and inspect the Build_Claude_Body output for invalid JSON. |
| Flow times out after 120 seconds | Your dataset may be too large for a single Claude call. Reduce batch size from 50 to 25 posts per chunk. Check the PT120S timeout is set on all HTTP actions. |
| Dataverse "Add a new row" fails | Verify the Social Analyses table exists in your solution and has all required columns. Check that column names match exactly (analysis_id, status, topics_json, etc.). |
| Adaptive Card renders as plain text in Teams | Ensure you used the "Adaptive Card" option in the message node (not plain text). Verify the JSON is valid by testing at https://adaptivecards.io/designer/. Use schema version 1.5 for Teams. |
| Global.varAnalysisId is empty | Confirm the variable is set as Global in the Variable properties panel (Usage: "Global (any topic can access)"). Verify the Conversation Start topic initializes it with Text(""). |
| Sentiment analysis shows no per-topic breakdown | The topic_model_job_id input may be blank. Verify Global.varAnalysisId has a value from a completed topic modeling run before running scoped sentiment. |
| Search returns 0 matches | The dataset may not contain posts relevant to the query. Try a broader query. Check that the dataset JSON is properly formatted with text fields. |
| Flow run history shows "Secure Inputs" but you need to debug | Temporarily disable Secure Inputs on the failing action, run a test, inspect the values, then re-enable Secure Inputs immediately after debugging. |

---

# PHASE 22: Architecture Summary and Verification Checklist

## Architecture Summary

```
USER (Teams/Web Chat)
    |
    v
COPILOT STUDIO (Generative Orchestration, GPT-5 Chat GA)
    |
    +-- Topic: Topic Analysis Request
    |       |-- Collects: dataset URL, depth, model override
    |       |-- Calls: Run Topic Modeling (Agent Flow)
    |       |-- Calls: Check Analysis Status (Agent Flow)
    |       |-- Displays: Topic Results Adaptive Card
    |
    +-- Topic: Sentiment Analysis
    |       |-- Collects: scope (full/topic-scoped), target topics
    |       |-- Calls: Run Sentiment Analysis (Agent Flow)
    |       |-- Calls: Get Sentiment Results (Agent Flow)
    |       |-- Displays: Sentiment Dashboard Adaptive Card
    |
    +-- Topic: Semantic Search
    |       |-- Collects: search query, max results
    |       |-- Calls: Semantic Search (Agent Flow)
    |       |-- Displays: Search Results Adaptive Card
    |
    +-- Topic: Results Review
    |       |-- Calls: Get Topic Results / Get Sentiment Results
    |       |-- Displays: Results Dashboard Adaptive Card
    |
    +-- Knowledge: Analysis Methodology Guides (SharePoint)
    +-- Knowledge: BERTopic Documentation (Website)
    |
    v
POWER AUTOMATE (6 Agent Flows)
    |
    +-- Run Topic Modeling
    |       |-- Chunks posts into 50-post batches
    |       |-- HTTP POST to Claude API (per chunk)
    |       |-- Consolidation HTTP POST to Claude API
    |       |-- Stores in Dataverse
    |
    +-- Check Analysis Status
    |       |-- Queries Dataverse by analysis_id
    |
    +-- Get Topic Results
    |       |-- Queries Dataverse, returns topics_json
    |
    +-- Run Sentiment Analysis
    |       |-- HTTP POST to Claude API with sentiment prompt
    |       |-- Stores in Dataverse
    |
    +-- Get Sentiment Results
    |       |-- Queries Dataverse, returns sentiment_json
    |
    +-- Semantic Search
            |-- HTTP POST to Claude API with search prompt
    |
    v
ANTHROPIC CLAUDE API (claude-sonnet-4-6)
    POST https://api.anthropic.com/v1/messages
    |
    v
DATAVERSE (Social Analyses table)
    |
    v
SHAREPOINT (Analysis Guides, Analysis Results)
```

## Credit Consumption Estimate

| Action | Credits per Use | Estimated Uses per Session | Session Total |
|---|---|---|---|
| Generative answer (orchestration) | 2 | 10 | 20 |
| Agent action (tool call) | 5 | 6 | 30 |
| Agent flow (per 100 actions) | 13 | 3 | 39 |
| Knowledge source query | 2 | 3 | 6 |
| **Estimated total per session** | | | **~95 credits** |

At $200/month for 25,000 credits, this supports approximately 263 analysis sessions per month.

## Post-Build Verification Checklist

1. Agent name is "Social Research Analyst" and description is populated.
2. Generative orchestration is enabled (Settings > Generative AI > Orchestration > Yes).
3. General knowledge is disabled (Settings > Generative AI > Allow general knowledge > Off).
4. Knowledge strictness is set to High.
5. Analysis Methodology Guides knowledge source shows green checkmark.
6. BERTopic Documentation knowledge source shows green checkmark.
7. Analysis Types entity has 3 items (Quick, Standard, Deep) with Smart matching On.
8. Global.varAnalysisId is initialized in Conversation Start topic.
9. Global.varDatasetUrl is initialized in Conversation Start topic.
10. All 4 custom topics are saved and enabled: Topic Analysis Request, Sentiment Analysis, Semantic Search, Results Review.
11. All 6 Agent Flows are published and error-free: Run Topic Modeling, Check Analysis Status, Get Topic Results, Run Sentiment Analysis, Get Sentiment Results, Semantic Search.
12. All 6 flows have Asynchronous Response set to Off.
13. All HTTP actions have Secure Inputs enabled.
14. All HTTP actions have timeout set to PT120S.
15. All Get_Anthropic_Key Compose actions have Secure Inputs and Secure Outputs enabled.
16. All 6 flows are registered as tools with clear descriptions.
17. All Action node placeholders in topics have been replaced with real Action nodes.
18. Dataverse Social Analyses table has all 9 custom columns.
19. Environment variable nxth_AnthropicApiKey exists with a valid value.
20. Agent is published (green "Published successfully" banner).
21. Agent is deployed to Teams channel.
22. Conversation Start system topic displays the welcome message.
23. Fallback system topic displays the help message.
24. Test 1 (Topic Analysis) completes successfully end-to-end.
25. Test 3 (Semantic Search) returns ranked results.

## Advanced: MCP Alternative

For teams with an existing MCP server deployment, the six Agent Flows above can be replaced with a single MCP server connection:

1. In Copilot Studio, open your agent, then go to Tools, then Add a tool.
2. Select MCP Server from the tool type list.
3. Enter the Server URL: https://social-analytics-mcp.azurewebsites.net/mcp
4. Copilot Studio connects and discovers all available tools (topic_model, get_topic_status, get_topic_results, sentiment_analysis, get_sentiment_results, search).
5. Review the discovered tools. Note that tool descriptions come from the server and cannot be edited in Copilot Studio.
6. Save the configuration.

> **WATCH OUT**: MCP in Copilot Studio is in preview status. The Agent Flow approach documented in Phases 7-18 is the recommended production approach. MCP provides a simpler connection model but with less control over tool descriptions and whole-server governance (all or nothing). Use MCP only if you already have the server deployed and are comfortable with preview limitations.

> **BEGINNER TIP**: If you are new to Copilot Studio, use the Agent Flow approach. It gives you full control over every action, is GA (generally available), and is easier to debug. Consider MCP as a future optimization once you are comfortable with the platform.

---

## Conclusion

This recipe produces a production-grade social media analytics agent without writing application code. The three most consequential design decisions are:

1. **Using Claude API directly from Power Automate** instead of replicating Python ML libraries (BERTopic, VADER, pgvector). Claude claude-sonnet-4-6 achieves equivalent business outcomes for theme discovery and sentiment classification through prompt engineering, while staying within Power Automate's constraints.

2. **Chunking posts into 50-post batches** with a two-pass analysis pattern (chunk extraction then consolidation). This manages Claude's context limits while enabling analysis of datasets up to 500+ posts.

3. **Storing all analysis sessions in Dataverse** with a simple status-based polling pattern. This enables cross-topic data sharing (topic modeling results feed into sentiment analysis), persistent results review, and future extensibility for scheduled re-analysis.

The 4-step escape chain (Rule 38) and concat() body construction pattern (Rule 39) are applied consistently across all six flows, ensuring reliable JSON body construction for every Claude API call. Every HTTP action has Secure Inputs enabled and PT120S timeout configured. The architecture can be extended with additional analysis types (network analysis, trend detection, anomaly detection) by adding new flows that follow the same pattern: escape prompts, build body with concat(), POST to Claude, parse response, store in Dataverse, respond to agent.