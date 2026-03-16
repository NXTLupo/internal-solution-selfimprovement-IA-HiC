

# Social Data Collector -- Definitive Build Recipe for Copilot Studio

This recipe walks you through every click, field, toggle, and configuration needed to build a Social Data Collector agent in Microsoft Copilot Studio. The agent collects posts and comments from Reddit subreddits using the Reddit OAuth2 API called directly from Power Automate Cloud Flows, delivers structured JSON datasets and formatted summaries to SharePoint and Teams, and guides users through source selection, status monitoring, and export. The agent persona is a methodical, precise data collection specialist that confirms every parameter before executing. Written for absolute beginners in Copilot Studio -- no step is assumed.

> **CRITICAL**: This agent focuses exclusively on Reddit data collection via the official Reddit OAuth2 API. TrustPilot and Google Play Store have NO official public API -- the original IA service used web scraping (BeautifulSoup for TrustPilot, google-play-scraper for Play Store), which is not feasible in Power Automate. The TrustPilot and Play Store flow phases (Phases 11-14) document the architectural patterns but note that these require external scraping services or SerpAPI subscriptions that are outside the core Power Platform stack.

---

## Architecture Diagram

```
+------------------+       +------------------------+       +-------------------+
|                  |       |                        |       |                   |
|   Microsoft      |<----->|   Copilot Studio       |<----->|   SharePoint      |
|   Teams          |       |   Social Data          |       |   ResearchHub     |
|   (User Chat)    |       |   Collector Agent       |       |   /Collections/   |
|                  |       |                        |       |   /Templates/     |
+------------------+       +----------+-------------+       +-------------------+
                                      |                              ^
                                      | Calls Flows                  | Saves Files
                                      v                              |
                           +----------+-------------+                |
                           |                        |                |
                           |   Power Automate       +----------------+
                           |   Cloud Flows          |
                           |                        |
                           +----+------+------+-----+
                                |      |      |
                    +-----------+  +---+---+  +------------+
                    |              |       |                |
                    v              v       v                v
              +-----+-----+ +----+----+ +-+----------+ +--+----------+
              |            | |         | |            | |             |
              | Reddit     | | Check   | | TrustPilot | | Play Store |
              | OAuth2 API | | Status  | | (External  | | (SerpAPI)  |
              | (Direct)   | | (SP)    | |  Scraper)  | |            |
              +------------+ +---------+ +------------+ +-------------+

Data Flow:
1. User sends collection request via Teams chat
2. Agent collects parameters via topic conversation (subreddit, count, time filter, etc.)
3. Agent confirms plan via Adaptive Card
4. Agent calls Collect Reddit Data flow via Action node
5. Flow authenticates with Reddit OAuth2 (client credentials)
6. Flow fetches posts from oauth.reddit.com/r/{subreddit}/top.json
7. Flow fetches comments for each post from /comments/{post_id}.json
8. Flow builds JSON dataset and saves to SharePoint /Collections/{session_id}/
9. Flow returns job_id, post_count, and SharePoint URLs to agent
10. Agent presents results via Adaptive Card with download links
11. User can check status, export results, or start new collection
```

---

## Prerequisites -- What You Need Before Starting

Before you begin building, confirm you have the following:

1. A Microsoft 365 work or school account with a license that includes Copilot Studio (typically Microsoft 365 E3/E5 or a standalone Copilot Studio license). If you are not sure, ask your IT admin.

2. Access to Power Automate at https://make.powerautomate.com -- sign in and confirm you can see the home page.

3. Access to Power Apps maker portal at https://make.powerapps.com -- sign in and confirm you can see the home page.

4. A SharePoint site called "ResearchHub" (or similar) where you can create document libraries and folders. You need at least "Edit" permissions on this site. The URL will look like: https://yourcompany.sharepoint.com/sites/ResearchHub

5. A Reddit application registered for OAuth2 client credentials:
   - Go to https://www.reddit.com/prefs/apps
   - Click "create another app..." at the bottom
   - Select "script" as the app type
   - Name: MarketResearch (or any name)
   - Redirect URI: http://localhost (required but not used for client credentials)
   - Click "create app"
   - Copy the Client ID (shown under the app name, a short alphanumeric string)
   - Copy the Client Secret (shown next to "secret")
   - Note your Reddit username for the User-Agent string

6. Microsoft Teams installed (desktop or web) for testing the agent.

7. A text editor (Notepad, VS Code, or similar) for preparing entity files and JSON snippets before pasting them into Copilot Studio.

---

## Component Summary Table

| Component Type | Name | Purpose |
|---|---|---|
| Agent | Social Data Collector | Main agent for social data collection |
| Knowledge Source | Collection Templates Library | SharePoint library with subreddit recommendations by industry |
| Topic | Data Collection Request | Primary workflow: collect parameters and execute Reddit collection |
| Topic | Source Selection | Help users choose subreddits based on research topic |
| Topic | Collection Status | Check progress of active/completed collection jobs |
| Topic | Export Results | Download and share collected data in multiple formats |
| Flow | Collect Reddit Data | Authenticate with Reddit, fetch posts/comments, save to SharePoint |
| Flow | Check Collection Job Status | Query SharePoint for collection job progress and file list |
| Flow | Collect TrustPilot Reviews | (Architectural pattern -- requires external scraping service) |
| Flow | Collect Play Store Reviews | (Architectural pattern -- requires SerpAPI subscription) |
| Tool | Collect Reddit Data | Agent-level tool for Reddit collection |
| Tool | Check Collection Job Status | Agent-level tool for status queries |
| Tool | Collect TrustPilot Reviews | Agent-level tool for TrustPilot collection |
| Tool | Collect Play Store Reviews | Agent-level tool for Play Store collection |
| Entity | Time Filters | Closed list: Past Day, Past Week, Past Month, Past Year, All Time |
| Environment Variable | nxth_RedditClientId | Reddit OAuth2 client ID (Secret) |
| Environment Variable | nxth_RedditClientSecret | Reddit OAuth2 client secret (Secret) |
| Environment Variable | nxth_RedditUserAgent | Reddit User-Agent string (Text) |

---

# PHASE 1: Create the Social Data Collector Agent

This phase creates the agent shell, configures orchestration, writes the complete agent instructions, and sets up system topics. Everything else in the recipe depends on this foundation.

## Step 1.1: Create the SharePoint Folder Structure

WHERE AM I?: SharePoint > ResearchHub Site > Documents

1. Open your browser and navigate to your SharePoint ResearchHub site (e.g., https://yourcompany.sharepoint.com/sites/ResearchHub).

2. In the left navigation, click Documents (or Shared Documents) to open the default document library.

3. Click + New at the top of the page, then click Folder. Name it Collections. Click Create. This is where all collected data files will be saved, organized by job ID.

4. Go back to the root of the Documents library. Click + New, then Folder. Name it Collection Templates. Click Create. This folder will hold pre-configured subreddit recommendation documents organized by industry vertical.

5. Inside the Collection Templates folder, create the following subfolders by clicking + New, then Folder for each one:
   - Retail
   - Technology
   - Finance
   - Healthcare
   - Automotive
   - Travel
   - Food and Beverage

6. Copy and save the full URL of your SharePoint site (everything up to and including the site name, e.g., https://yourcompany.sharepoint.com/sites/ResearchHub). You will need this multiple times throughout the recipe.

> **VERIFY**: After creating all folders, your Documents library should show two top-level folders: Collections and Collection Templates. The Collection Templates folder should contain seven industry subfolders.

## Step 1.2: Create the Power Platform Solution and Environment Variables

WHERE AM I?: Power Apps > make.powerapps.com > Solutions

1. Open a new browser tab and navigate to https://make.powerapps.com.

2. Sign in with the same Microsoft 365 account you used for SharePoint.

3. In the top-right corner, check the Environment dropdown. Make sure you are in the same environment where your Copilot Studio agent will live. If you are not sure, it is usually called "Default" or your organization's name.

4. In the left navigation, click Solutions.

5. Click + New solution.

6. Fill in the following fields:
   - Display name: Social Data Collector Solution
   - Publisher: Select the default publisher, or create one by clicking + New publisher, setting Name to NXTHumans, Prefix to nxth, then clicking Save.
   - Leave Version as 1.0.0.0.

7. Click Create. The solution opens.

## Step 1.3: Create Environment Variables for Reddit API Credentials

WHERE AM I?: Power Apps > Solutions > Social Data Collector Solution

We need three environment variables to store the Reddit API credentials securely. Every Power Automate flow that calls the Reddit API will retrieve these at runtime.

**Variable 1 -- Reddit Client ID:**

1. Inside your solution, click + New at the top, then click More, then click Environment variable.

2. Fill in the following fields:
   - Display name: Reddit Client Id
   - Name: This auto-fills as nxth_RedditClientId (based on your publisher prefix). That is correct.
   - Data type: Select Secret from the dropdown.
   - Click Save.

3. After saving, the variable appears in your solution. Click on it to open it. Click + New value under "Current value". Paste your Reddit Client ID (the short alphanumeric string from your Reddit app registration). Click Save.

> **WATCH OUT**: Secret-type environment variables store values encrypted in Dataverse. However, anyone with Maker or Admin role in your Power Platform environment can still read the value by opening the variable. For production use, migrate to Azure Key Vault when your IT admin can provision it.

**Variable 2 -- Reddit Client Secret:**

4. Click + New at the top, then More, then Environment variable.

5. Fill in:
   - Display name: Reddit Client Secret
   - Name: auto-fills as nxth_RedditClientSecret
   - Data type: Select Secret
   - Click Save.

6. Open the variable, click + New value, paste your Reddit Client Secret, click Save.

**Variable 3 -- Reddit User Agent:**

7. Click + New at the top, then More, then Environment variable.

8. Fill in:
   - Display name: Reddit User Agent
   - Name: auto-fills as nxth_RedditUserAgent
   - Data type: Select Text (this is NOT a secret -- it is a public identifier string)
   - Current value: Click + New value and type: script:SocialDataCollector:1.0 (by /u/YOUR_REDDIT_USERNAME)
   - Replace YOUR_REDDIT_USERNAME with your actual Reddit username.
   - Click Save.

> **CRITICAL**: Reddit requires a descriptive User-Agent header on every API request. Requests without a proper User-Agent are rate-limited aggressively or blocked entirely. The format must be: script:AppName:Version (by /u/username)

9. You should now see three environment variables in your solution: nxth_RedditClientId, nxth_RedditClientSecret, and nxth_RedditUserAgent.

## Step 1.4: Sign In to Copilot Studio and Create a Blank Agent

WHERE AM I?: Copilot Studio > https://copilotstudio.microsoft.com > Agents

1. Open your browser and navigate to https://copilotstudio.microsoft.com.

2. Sign in with your Microsoft 365 work or school account.

3. You will land on the Copilot Studio home page. In the left navigation pane, click Agents.

4. Click the + Create button at the top. Then click New agent. Then click Skip to configure (to bypass the AI-assisted creation wizard and go straight to manual configuration).

> **BEGINNER TIP**: The AI-assisted creation wizard can be helpful for simple agents, but for a complex agent like this one, manual configuration gives you full control over every setting. Always choose "Skip to configure" for production agents.

5. A new agent opens on the Overview page. This is your agent's home base -- it has sections for Details, Instructions, Knowledge, Tools, Suggested Prompts, and Channels.

## Step 1.5: Set the Agent Name, Description, and Icon

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview > Details

1. On the Overview page, find the Details section near the top. Click the Edit (pencil) icon.

2. In the Name field, delete the default name and type: Social Data Collector

3. In the Description field, paste the following:

```
Specialized agent for collecting social media posts and consumer reviews from Reddit. Collects posts and comments from subreddits via Reddit OAuth2 API, delivers structured JSON datasets and formatted summaries to SharePoint and Teams. Guides users through source selection, parameter configuration, status monitoring, and data export.
```

4. To change the agent's icon: click the agent icon in the top-left area of the page, then click Change icon, then upload a 192 x 192 pixel PNG image (max 72 KB). Use a professional icon that represents data collection or social media analytics.

5. Click Save at the top of the page. Wait for the green "Saved successfully" banner.

## Step 1.6: Enable Generative Orchestration

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview > Details > Orchestration

1. Still in the Details section of the Overview page, look for the Orchestration area.

2. Find the toggle labeled "Use generative AI to determine how best to respond to users and events".

3. Make sure this is set to Yes (toggled on). New agents usually default to this, but verify it.

> **BEGINNER TIP**: Generative orchestration means the agent uses an AI planner to dynamically decide which topics, tools, and knowledge sources to use for each user request. Instead of requiring exact trigger phrase matches, the agent reads topic and tool descriptions to route intelligently. This is essential for an agent that handles varied data collection requests across different platforms.

> **CRITICAL**: This is an architectural decision. With generative orchestration ON, the agent selects topics based on their descriptions (not just trigger phrases). This means your topic descriptions must be clear, specific, and non-overlapping. We will craft these carefully in later phases.

## Step 1.7: Write the Agent Instructions

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview > Instructions

1. On the Overview page, find the Instructions section. Click Edit.

2. You will see a large text field (max 8,000 characters). Delete any default text and paste the following complete instructions:

```
[PERSONA]
You are the Social Data Collector agent, a specialized assistant for gathering social media and consumer review data. Your role is to help researchers and analysts collect high-quality datasets for customer experience research. You are methodical, precise, and proactive about data quality. You speak in clear, professional language and always confirm parameters before executing a collection. You understand social media platform structures (subreddits, review categories, app store listings) and guide users toward well-scoped queries. You never fabricate data or invent statistics.

[CHAIN-OF-THOUGHT REASONING]
For every data collection request, reason step-by-step before responding:
1. Identify the target platform. Currently supported: Reddit (via OAuth2 API). TrustPilot and Google Play Store are noted in the interface but require external scraping services not yet connected.
2. Determine the specific source identifiers: subreddit names without the r/ prefix for Reddit.
3. Gather platform-specific parameters:
   - Reddit: time_filter (day, week, month, year, all), max posts (10-500, default 100), comments per post (0-10, default 5), optional keyword filter.
4. Validate that the combination of parameters is feasible and will not exceed rate limits.
5. Present a summary of the collection plan and ask for explicit confirmation before executing.
6. Execute the appropriate Power Automate flow and monitor for completion.
7. On completion, present a summary with record count, date range covered, and links to download JSON data from SharePoint.

[OUTPUT FORMAT]
Always present collection summaries as structured lists with:
- Platform and source identifier
- Record count collected
- Time filter applied
- Output file location in SharePoint
- Download links for JSON data

When delivering results in Teams, use Adaptive Cards for structured display. For status updates, include progress percentage and estimated completion time.

[CONSTRAINTS]
- Post count range is 10 to 500 per collection (default 100). Warn users if they request more than 300 items as collection time increases significantly.
- Always confirm all parameters via an Adaptive Card summary before executing any collection.
- Do not store or display personally identifiable information from collected posts beyond usernames which are public.
- If a collection fails mid-execution, report the partial results and the failure reason.
- Rate limiting is enforced: 10-second delays between Reddit API requests for comments.
- Always re-authenticate with Reddit at the start of each flow run. Tokens last 86400 seconds but we do not cache them across flow runs for security.
- If the user asks about TrustPilot or Google Play Store, explain that these platforms require external scraping services that are not yet connected, and offer to help with Reddit collection instead.

[FEW-SHOT EXAMPLE]
User: "Collect posts from the customerservice subreddit"
Expected behavior:
1. Confirm platform: Reddit
2. Ask for time filter (default: Past Year)
3. Ask for post count (default: 100)
4. Ask for comments per post (default: 5)
5. Ask for optional keyword filter
6. Present confirmation card:
   Platform: Reddit
   Subreddit: customerservice
   Time Filter: Past Year
   Post Count: 100
   Comments Per Post: 5
   Keyword Filter: None
   Estimated Time: ~17 minutes (100 posts x 10s rate limit for comments)
7. On confirmation, execute Collect Reddit Data flow
8. Return: "Collection complete. 100 posts collected with 487 comments. JSON saved to SharePoint."
```

3. Click Save at the top of the page.

> **VERIFY**: The instructions should be well under the 8,000-character limit. You can check the character count by selecting all text in the field and checking your browser's character count (or paste into a text editor first).

## Step 1.8: Disable General Knowledge

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Settings (gear icon) > Generative AI

1. Click the Settings gear icon at the very top of the Copilot Studio page (in the top navigation bar, not the Details section).

2. In the settings panel, click Generative AI in the left menu.

3. Find the toggle "Allow the AI to use its own general knowledge" and set it to Off.

4. Under "How should your agent interact with knowledge sources", select High strictness.

> **BEGINNER TIP**: Disabling general knowledge forces the agent to answer exclusively from your SharePoint documents and the tools you configure. This prevents the agent from making up plausible-sounding information about subreddits or data collection that might be incorrect.

5. Click Save and close the settings panel.

## Step 1.9: Configure Authentication

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Settings (gear icon) > Security > Authentication

1. Click the Settings gear icon again.

2. In the left menu, click Security, then click Authentication.

3. Select "Authenticate with Microsoft". This is the middle option.

4. Click Save.

> **BEGINNER TIP**: "Authenticate with Microsoft" means the agent automatically knows who the user is via their Microsoft Entra ID (formerly Azure AD) credentials when they chat in Teams. This gives you access to System.User.DisplayName, System.User.Email, and System.User.Id without any additional login prompts. The user simply opens the agent in Teams and starts chatting.

## Step 1.10: Configure System Topics

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > System

1. Click the Topics tab in the top navigation bar of Copilot Studio.

2. You will see two subtabs: Custom and System. Click the System subtab.

3. You will see a list of system topics. Configure each one as follows:

**Conversation Start:**

4. Click Conversation Start to open the topic authoring canvas.

5. You will see a trigger node ("Conversation Start") connected to a Message node. Before the Message node, we need to add a Set Variable node to initialize a global variable for the session ID.

6. Click the + button between the Trigger node and the existing Message node. Select Variable management, then Set a variable value.

7. In the Set variable node that appears:
   - Click the box under "Set variable" and select Create a new variable.
   - A new variable appears with a default name (e.g., Var1). Click the variable name to open the Variable properties panel on the right.
   - Under Variable name, type: SessionId (do NOT type the Global. prefix -- it will be added automatically).
   - Under Usage, select "Global (any topic can access)". The variable name automatically changes to Global.SessionId.
   - Close the properties panel.
   - In the To value field, click the formula icon (fx), type the following formula, and click Done:

> **COPY-PASTE** into the formula field:
> `Text(Now(), "yyyyMMddHHmmss")`

8. Now click the existing Message node below. Delete the default message text. Replace it with:

```
Welcome to the Social Data Collector. I help you gather social media posts and reviews for research analysis.

Available platforms:
- Reddit: Collect posts and comments from any subreddit via the Reddit API.
- TrustPilot: (Coming soon -- requires external scraping service)
- Google Play Store: (Coming soon -- requires SerpAPI subscription)

To get started:
- Type "collect data" to start a new Reddit data collection
- Type "choose source" to get subreddit recommendations for your research topic
- Type "check status" to monitor an active collection job
- Type "export results" to download completed collection data

All collections generate structured JSON datasets saved to SharePoint.
```

9. Click Save at the top.

**Fallback:**

10. Go back to Topics, then System, and click Fallback.

11. Click the Message node and replace the text with:

```
I did not understand that request. I can help with:
- Collecting Reddit posts and comments from subreddits
- Recommending subreddits for your research topic
- Checking the status of active collection jobs
- Exporting and downloading collected data

Please rephrase your question, or type "collect data" to start a new collection.
```

12. Click Save.

**On Error:**

13. Click On Error in the system topics list. Keep the default configuration -- it displays the error code, conversation ID, and timestamp, which you will need for troubleshooting.

**End of Conversation:**

14. Click End of Conversation. Toggle the satisfaction survey to On so you can collect feedback on collection quality.

15. Click Save.

## Step 1.11: Create the Time Filters Entity

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Settings > Entities

Before building topics, we define the custom entity for time filter choices. This enables slot filling -- if the user says "collect Reddit posts from the past week", the agent can automatically extract "Past Week" without asking a separate question.

1. Click the Settings gear icon at the top of the page.

2. In the left menu, click Entities.

3. Click + Add an entity at the top.

4. Select Closed list.

5. In the Name field, type: Time Filters

6. You will see a table where you can add items. Add the following five items by clicking + Add item for each one:

   **Item 1:**
   - Value: day
   - Synonyms: Click the item row to expand it, then add these synonyms one at a time by typing each and pressing Enter: past day, today, last 24 hours, 24 hours, daily, last day

   **Item 2:**
   - Value: week
   - Synonyms: past week, last week, this week, 7 days, last 7 days, weekly

   **Item 3:**
   - Value: month
   - Synonyms: past month, last month, this month, 30 days, last 30 days, monthly

   **Item 4:**
   - Value: year
   - Synonyms: past year, last year, this year, 12 months, last 12 months, yearly, annual

   **Item 5:**
   - Value: all
   - Synonyms: all time, all posts, everything, no time limit, no filter, all available

7. Find the Smart matching toggle and set it to On. This enables fuzzy matching so the agent can handle misspellings and abbreviations.

8. Click Save.

> **BEGINNER TIP**: A closed list entity is like a dropdown menu that the agent understands. When you use this entity in a Question node, the agent presents these options to the user and can recognize synonyms. For example, if the user says "last week", the agent maps it to the value "week". Smart matching means even "lst week" (a typo) would be recognized.

> **VERIFY**: Your Time Filters entity should show 5 items: day, week, month, year, all. Each item should have 5-7 synonyms. Smart matching should be On.

---

# PHASE 2: Add Knowledge Sources (1 source)

Knowledge sources give the agent access to reference documents. The Collection Templates Library contains pre-configured subreddit recommendations organized by industry, which the Source Selection topic will use to help users find relevant data sources.

## Step 2.1: Add the Collection Templates SharePoint Library

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview > Knowledge

1. Navigate back to the Overview page of your agent (click the agent name in the breadcrumb at the top).

2. Find the Knowledge section and click Add knowledge.

3. A panel opens showing knowledge source options. Under Featured, click SharePoint.

4. In the SharePoint URL field, paste the URL of your Collection Templates folder. For example: https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Collection Templates

5. Press Enter or click the + button. The URL appears as a tag below the field.

6. Below the URLs, you will see two fields:
   - Name: Type Collection Templates Library
   - Description: This is critical for retrieval quality. Paste the following:

```
Pre-configured collection templates with recommended subreddits organized by industry vertical. Contains curated lists of active subreddits for retail (r/retail, r/CustomerService, r/TalesFromRetail), technology (r/technology, r/programming, r/sysadmin), finance (r/personalfinance, r/investing, r/FinancialPlanning), healthcare (r/healthcare, r/medicine, r/nursing), automotive (r/cars, r/electricvehicles, r/MechanicAdvice), travel (r/travel, r/solotravel, r/TravelHacks), and food/beverage (r/food, r/Cooking, r/restaurant). Each template includes subreddit name, subscriber count estimate, typical post volume, recommended time filters, and suggested keyword filters for common research questions. Use this source when users ask for subreddit recommendations or need help choosing data sources for their research topic.
```

7. Click Add to agent.

8. You will see the knowledge source appear in the Knowledge section with a green checkmark. If you see a yellow warning, click it to read the issue (usually a permissions problem -- ensure the agent's service account has at least Read access to the SharePoint library).

> **WATCH OUT**: If you have not yet uploaded any documents to the Collection Templates folder, the knowledge source will have nothing to search. Before testing the Source Selection topic, upload at least one document per industry subfolder. A simple Word document listing recommended subreddits with descriptions is sufficient. For example, a file called "Technology_Subreddits.docx" containing a table of subreddit names, descriptions, subscriber counts, and recommended parameters.

## Step 2.2: Verify Knowledge Source Configuration

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Settings (gear icon) > Generative AI

1. Click the Settings gear icon in the top navigation bar.

2. Click Generative AI in the left menu.

3. Confirm that "Allow the AI to use its own general knowledge" is set to Off (you did this in Step 1.8).

4. Confirm that the strictness is set to High.

5. Click Save and close the settings panel.

> **VERIFY**: On the Overview page, the Knowledge section should show "Collection Templates Library" with a green checkmark and the SharePoint icon.

---

# PHASE 3: Data Collection Request -- TOPIC BUILD (node-by-node: 10 nodes)

This is the primary workflow topic. It collects all parameters from the user, confirms the collection plan via Adaptive Card, calls the Collect Reddit Data flow, and presents results. This is the most complex topic in the agent.

## Step 3.1: Create the Topic and Set Trigger Phrases

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Custom > + Add a topic > From blank

1. Click the Topics tab in the top navigation bar.

2. Click the Custom subtab.

3. Click + Add a topic at the top, then click From blank.

4. At the top of the canvas, click the topic name (it says "Untitled") and rename it to: Data Collection Request

5. Click the Description field below the name. Type: User wants to collect social media data from Reddit. Route here when the user mentions collecting, scraping, gathering, or downloading posts, reviews, or comments from Reddit.

6. In the Trigger node at the top of the canvas, you will see a section where you can add trigger phrases. Click the area and add these trigger phrases (press Enter after each one):
   - collect social data
   - gather posts
   - scrape reviews
   - download comments
   - collect Reddit data
   - start data collection
   - start scraping subreddit posts
   - collect posts from Reddit
   - get Reddit posts

> **BEGINNER TIP**: Even though we are using generative orchestration (which routes based on descriptions), trigger phrases still serve as Custom Topic identifiers and help the AI understand what kinds of requests this topic handles. Always include 5-10 varied phrases.

## Step 3.2: Node 1 -- Welcome and Capability Overview (Message)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas

1. Click the + button below the Trigger node to add a new node.

2. In the node menu that appears, click Send a message.

3. In the message text field, type the following:

```
I can help you collect social media data. Here is what is available:

Reddit: Collects posts and comments from subreddits via the Reddit API.
- Parameters: subreddit name, time filter (day/week/month/year/all), post count (10-500), comments per post (0-10), optional keyword filter.

TrustPilot: Coming soon (requires external scraping service).
Google Play Store: Coming soon (requires SerpAPI subscription).

Output: Every collection generates a structured JSON dataset saved to SharePoint.

Let me collect your parameters. First, which platform would you like to use?
```

4. Click Save at the top of the canvas.

## Step 3.3: Node 2 -- Select Data Platform (Question)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas

1. Click the + button below the Message node to add a new node.

2. Click Ask a question.

3. In the question text field, type: Which platform would you like to collect data from?

4. Under Identify, click the dropdown. Select the option to create a choice. You will see options appear. Click Edit options and add three choices:
   - Reddit
   - TrustPilot
   - Google Play Store

5. Alternatively, for more control, click the Identify dropdown and select the option for a custom entity. However, for simplicity, we will use the built-in multiple choice option. The three choices above will appear as buttons in the chat.

6. The question node automatically creates an output variable. Click the variable name (it may say Var1 or similar). The Variable properties panel opens on the right.
   - Under Variable name, type: varPlatformChoice
   - The scope should remain as Topic (Topic.varPlatformChoice). We do not need this to be global.

7. Click Save.

> **BEGINNER TIP**: When you add a Question node with multiple choice options, Copilot Studio displays the choices as clickable buttons in the chat. The user can either click a button or type their choice. The selected value is stored in the variable you configured.

## Step 3.4: Node 3 -- Route by Platform (Condition)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas

1. Click the + button below the Question node to add a new node.

2. Click Add a condition, then select Condition.

3. A condition node appears with a branching structure. Configure the first condition:
   - Click the variable selector in the condition. Select Topic.varPlatformChoice.
   - Set the operator to is equal to.
   - Set the value to: Reddit

4. In the "All other conditions" branch (the else branch), add a Message node by clicking the + below it, then Send a message. Type:

```
I currently only support Reddit data collection via the direct API. TrustPilot and Google Play Store require external scraping services that are not yet connected.

Would you like to proceed with Reddit data collection instead? Type "collect Reddit data" to start, or type "choose source" for subreddit recommendations.
```

5. Below this message in the else branch, click + and select Topic management, then End current topic.

6. Click Save.

> **WATCH OUT**: The condition routes the conversation. Only the Reddit branch continues to the parameter collection nodes below. The TrustPilot and Play Store paths end with a helpful message redirecting the user.

## Step 3.5: Node 4 -- Collect Source Identifier (Question)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas (inside the Reddit branch)

1. Inside the Reddit condition branch (the "Yes" path where varPlatformChoice equals Reddit), click the + button to add a new node.

2. Click Ask a question.

3. In the question text field, type: What subreddit would you like to collect data from? Enter the subreddit name without the r/ prefix (for example, type "technology" not "r/technology").

4. Under Identify, click the dropdown and select User's entire response. This captures whatever the user types as a free-text string.

5. Click the output variable name. In the Variable properties panel:
   - Under Variable name, type: varSubreddit
   - Scope remains Topic.

6. Click Save.

## Step 3.6: Node 5 -- Set Time Filter (Question)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas (inside the Reddit branch)

1. Click the + button below the subreddit question to add a new node.

2. Click Ask a question.

3. In the question text field, type: What time range should I search? This controls how far back the Reddit API looks for top posts.

4. Under Identify, click the dropdown. Scroll down to find your custom entity Time Filters (the one you created in Step 1.11). Select it.

> **BEGINNER TIP**: If you do not see your Time Filters entity in the dropdown, go back to Settings > Entities and verify it was saved correctly. Custom entities sometimes take a moment to appear in the dropdown after creation.

5. Click the output variable name. In the Variable properties panel:
   - Under Variable name, type: varTimeFilter
   - Scope remains Topic.

6. Click Save.

## Step 3.7: Node 6 -- Set Comments Per Post (Question)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas (inside the Reddit branch)

1. Click the + button below the time filter question to add a new node.

2. Click Ask a question.

3. In the question text field, type: How many top comments should I collect per post? Enter a number from 0 to 10 (default is 5). Enter 0 if you only want posts without comments. Higher values increase collection time due to API rate limiting.

4. Under Identify, click the dropdown and select Number.

5. Click the output variable name. In the Variable properties panel:
   - Under Variable name, type: varCommentsPerPost
   - Scope remains Topic.

6. Click Save.

## Step 3.8: Node 7 -- Set Collection Count (Question)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas (inside the Reddit branch)

1. Click the + button below the comments question to add a new node.

2. Click Ask a question.

3. In the question text field, type: How many posts should I collect? Enter a number from 10 to 500 (default is 100). Note: Reddit returns a maximum of 100 posts per API request. Collections over 100 require multiple API calls and take longer.

4. Under Identify, click the dropdown and select Number.

5. Click the output variable name. In the Variable properties panel:
   - Under Variable name, type: varCollectionCount
   - Scope remains Topic.

6. Click Save.

## Step 3.9: Node 8 -- Confirm Collection Plan (Adaptive Card)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas (inside the Reddit branch)

This is the critical confirmation step. We present all collected parameters in an Adaptive Card and ask the user to confirm before executing.

1. Click the + button below the collection count question to add a new node.

2. Click Ask with Adaptive Card.

3. An Adaptive Card node appears. Click the three dots (...) at the top-right of the node, then select Properties.

4. Click Edit adaptive card. The built-in Adaptive Card Designer opens with a JSON editor.

5. Delete any default content in the JSON editor and paste this exact JSON:

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
          "text": "COLLECTION PLAN CONFIRMATION",
          "weight": "Bolder",
          "size": "Medium",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Review the collection parameters below and confirm to start.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Platform",
          "value": "Reddit"
        },
        {
          "title": "Subreddit",
          "value": "${varSubreddit}"
        },
        {
          "title": "Time Filter",
          "value": "${varTimeFilter}"
        },
        {
          "title": "Post Count",
          "value": "${varCollectionCount}"
        },
        {
          "title": "Comments Per Post",
          "value": "${varCommentsPerPost}"
        },
        {
          "title": "Output Format",
          "value": "JSON dataset -> SharePoint"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Estimated collection time depends on the number of posts and comments requested. Each post with comments requires a separate API call with a 10-second rate limit delay.",
      "wrap": true,
      "size": "Small",
      "isSubtle": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "confirmAction",
      "label": "Your decision",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Confirm -- start collection",
          "value": "confirmed"
        },
        {
          "title": "Edit -- change parameters",
          "value": "edit"
        },
        {
          "title": "Cancel -- discard this request",
          "value": "cancelled"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "SUBMIT"
    }
  ]
}
```

> **CRITICAL**: The `"id": "confirmAction"` field in the Input.ChoiceSet is what creates the output variable. After the user clicks SUBMIT, the selected value ("confirmed", "edit", or "cancelled") is captured in this variable.

> **WATCH OUT**: The `${varSubreddit}`, `${varTimeFilter}`, `${varCollectionCount}`, and `${varCommentsPerPost}` placeholders in the FactSet will display the literal text "${varSubreddit}" unless you switch to Formula mode. To make these dynamic: after pasting the JSON, click the "Formula" button at the top of the card editor to convert to Power Fx mode. Then replace each `"${varSubreddit}"` with `Topic.varSubreddit`, each `"${varTimeFilter}"` with `Topic.varTimeFilter`, each `"${varCollectionCount}"` with `Text(Topic.varCollectionCount)`, and each `"${varCommentsPerPost}"` with `Text(Topic.varCommentsPerPost)`. WARNING: Once you switch to Formula mode, you CANNOT go back to the original JSON. Save a copy of the JSON above before switching.

> **BEGINNER TIP**: If you prefer not to use Formula mode (it is a one-way conversion), you can leave the static JSON as-is and add a Message node BEFORE the Adaptive Card that displays the parameters as text. The Adaptive Card then serves purely as the confirm/edit/cancel choice. This is simpler for beginners.

6. Click Save in the card editor to close it.

7. The Adaptive Card node now shows an output variable for confirmAction. Click the variable name. In the Variable properties panel:
   - Under Variable name, type: varConfirmAction
   - Scope remains Topic.

8. Click Save at the top of the canvas.

## Step 3.10: Node 9 -- Execute Data Collection Flow (Action)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas

We need to handle the user's confirmation decision first, then call the flow.

1. Click the + button below the Adaptive Card node.

2. Click Add a condition, then select Condition.

3. Configure the condition:
   - Variable: Topic.varConfirmAction
   - Operator: is equal to
   - Value: confirmed

4. In the "All other conditions" branch, add a Message node: "Collection cancelled. Type 'collect data' to start a new collection request." Then add an End current topic node.

5. In the "confirmed" branch, click the + button.

6. Click Add a tool. A panel opens showing available tools and flows.

> **WATCH OUT**: The Collect Reddit Data flow does not exist yet -- we will build it in Phase 4. For now, we will add a placeholder Message node. After building the flow in Phase 4, you will come back to this topic and replace the placeholder with the actual Action node.

7. For now, click Send a message instead. Type the following placeholder text:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Collect Reddit Data flow. To do this: delete this Message node, click the + button, select Add a tool, find the Collect Reddit Data flow, and select it. Then map the input variables as follows:
- subreddit -> Topic.varSubreddit
- time_filter -> Topic.varTimeFilter
- max_posts -> Topic.varCollectionCount
- comments_per_post -> Topic.varCommentsPerPost
- keyword_filter -> Text("")
- platform -> "reddit"
- include_comments -> If(Topic.varCommentsPerPost > 0, true, false)
```

8. Click Save.

> **CRITICAL**: You MUST come back to this topic after building the Collect Reddit Data flow in Phase 4 and replace this placeholder with a real Action node. The recipe will remind you at the end of Phase 4.

## Step 3.11: Node 10 -- Collection Initiated Confirmation (Message)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request > Canvas

1. Click the + button below the placeholder message (or below the future Action node) to add a new node.

2. Click Send a message.

3. Type the following:

```
Collection initiated successfully.

- Platform: Reddit
- Subreddit: {Topic.varSubreddit}
- Posts Requested: {Topic.varCollectionCount}
- Comments Per Post: {Topic.varCommentsPerPost}
- Time Filter: {Topic.varTimeFilter}

The collection is now running. You can check progress by typing "check status". I will notify you when the collection is complete with download links to the JSON dataset in SharePoint.
```

> **BEGINNER TIP**: The `{Topic.varSubreddit}` syntax inside a Message node automatically inserts the variable's value. You create these by typing the opening brace `{`, which opens a variable picker -- select the variable from the list, and Copilot Studio inserts the reference. You can also type the full reference manually.

4. Click Save at the top of the canvas.

## Step 3.12: Complete YAML for Data Collection Request Topic

Below is the complete YAML representation of this topic. You can paste this into the code editor as an alternative to building node-by-node, or use it to verify your visual canvas matches the intended structure.

To access the code editor: click the three dots (...) at the top-right of the topic canvas, then select Open code editor.

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Data Collection Request
    triggerQueries:
      - collect social data
      - gather posts
      - scrape reviews
      - download comments
      - collect Reddit data
      - start data collection
      - start scraping subreddit posts
      - collect posts from Reddit
      - get Reddit posts
  actions:
    - kind: SendMessage
      id: welcomeCapability
      message: |-
        I can help you collect social media data. Here is what is available:

        Reddit: Collects posts and comments from subreddits via the Reddit API.
        - Parameters: subreddit name, time filter (day/week/month/year/all), post count (10-500), comments per post (0-10), optional keyword filter.

        TrustPilot: Coming soon (requires external scraping service).
        Google Play Store: Coming soon (requires SerpAPI subscription).

        Output: Every collection generates a structured JSON dataset saved to SharePoint.

        Let me collect your parameters. First, which platform would you like to use?

    - kind: Question
      id: askPlatform
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varPlatformChoice
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

    - kind: ConditionGroup
      id: routeByPlatform
      conditions:
        - id: isReddit
          condition: =Topic.varPlatformChoice = "reddit"
          actions:
            - kind: Question
              id: askSubreddit
              interruptionPolicy:
                allowInterruption: true
              variable: init:Topic.varSubreddit
              prompt: "What subreddit would you like to collect data from? Enter the subreddit name without the r/ prefix (for example, type 'technology' not 'r/technology')."
              entity: StringPrebuiltEntity

            - kind: Question
              id: askTimeFilter
              interruptionPolicy:
                allowInterruption: true
              variable: init:Topic.varTimeFilter
              prompt: "What time range should I search? This controls how far back the Reddit API looks for top posts."
              entity:
                kind: EmbeddedEntity
                definition:
                  kind: ClosedListEntity
                  smartMatchingEnabled: true
                  items:
                    - id: day
                      displayName: Past Day
                    - id: week
                      displayName: Past Week
                    - id: month
                      displayName: Past Month
                    - id: year
                      displayName: Past Year
                    - id: all
                      displayName: All Time

            - kind: Question
              id: askCommentsPerPost
              interruptionPolicy:
                allowInterruption: true
              variable: init:Topic.varCommentsPerPost
              prompt: "How many top comments should I collect per post? Enter a number from 0 to 10 (default is 5). Enter 0 if you only want posts without comments."
              entity: NumberPrebuiltEntity

            - kind: Question
              id: askCollectionCount
              interruptionPolicy:
                allowInterruption: true
              variable: init:Topic.varCollectionCount
              prompt: "How many posts should I collect? Enter a number from 10 to 500 (default is 100)."
              entity: NumberPrebuiltEntity

            - kind: SendMessage
              id: confirmationPlaceholder
              message: |-
                Here is your collection plan:
                - Platform: Reddit
                - Subreddit: {Topic.varSubreddit}
                - Time Filter: {Topic.varTimeFilter}
                - Post Count: {Topic.varCollectionCount}
                - Comments Per Post: {Topic.varCommentsPerPost}

                Type "confirm" to start the collection, or "cancel" to discard.

            - kind: SendMessage
              id: flowPlaceholder
              message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Collect Reddit Data flow. Map inputs: subreddit -> Topic.varSubreddit, time_filter -> Topic.varTimeFilter, max_posts -> Topic.varCollectionCount, comments_per_post -> Topic.varCommentsPerPost, keyword_filter -> empty string, platform -> reddit, include_comments -> true if comments > 0."

            - kind: SendMessage
              id: collectionInitiated
              message: |-
                Collection initiated successfully.

                - Platform: Reddit
                - Subreddit: {Topic.varSubreddit}
                - Posts Requested: {Topic.varCollectionCount}
                - Comments Per Post: {Topic.varCommentsPerPost}
                - Time Filter: {Topic.varTimeFilter}

                The collection is now running. Type "check status" to monitor progress.

      elseActions:
        - kind: SendMessage
          id: platformNotSupported
          message: |-
            I currently only support Reddit data collection via the direct API. TrustPilot and Google Play Store require external scraping services that are not yet connected.

            Would you like to proceed with Reddit data collection instead? Type "collect Reddit data" to start, or type "choose source" for subreddit recommendations.
        - kind: EndDialog
          id: endUnsupported
```

> **WATCH OUT**: The YAML above uses a simplified confirmation flow (SendMessage instead of Adaptive Card) because the Adaptive Card with dynamic variables requires Formula mode which cannot be represented in static YAML. When building on the visual canvas, use the full Adaptive Card from Step 3.9 instead of the confirmationPlaceholder SendMessage node.

---

# PHASE 4: Collect Reddit Data -- FLOW BUILD (action-by-action)

This is the core data collection flow. It authenticates with Reddit using OAuth2 client credentials, fetches posts from a subreddit, optionally fetches comments for each post, builds a JSON dataset, saves it to SharePoint, and returns the results to the agent. Take your time with each action -- this is the most complex flow in the agent.

## Step 4.1: Create the Flow

WHERE AM I?: Power Automate > make.powerautomate.com > Solutions > Social Data Collector Solution

1. Open a new browser tab and navigate to https://make.powerautomate.com.

2. In the left navigation, click Solutions, then open Social Data Collector Solution (the one you created in Step 1.2).

3. Click + New at the top, then Automation, then Cloud flow, then Instant.

4. In the "Build an instant cloud flow" dialog:
   - Flow name: Collect Reddit Data
   - Choose how to trigger this flow: Scroll down and select "Run a flow from Copilot" (this is the Copilot Studio trigger, also labeled "When an agent calls the flow" in some versions). If you do not see this option, select "Manually trigger a flow" and we will change it.

5. Click Create. The flow editor opens.

## Step 4.2: Configure the Trigger with Input Parameters

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer

1. If the trigger shows as "Run a flow from Copilot" or "When an agent calls the flow", click on it to expand it. If it shows a different trigger, delete it (click the three dots ... then Delete), click + Add a trigger, search for "When an agent calls the flow", and select it.

2. Click + Add an input inside the trigger. You need to add seven text/number inputs:

**Input 1:**
- Click + Add an input, then select Text.
- Input name: subreddit
- Description: Target subreddit name without r/ prefix

**Input 2:**
- Click + Add an input, then select Text.
- Input name: time_filter
- Description: Time range filter: day, week, month, year, or all

**Input 3:**
- Click + Add an input, then select Number.
- Input name: max_posts
- Description: Maximum number of posts to collect (10-500)

**Input 4:**
- Click + Add an input, then select Number.
- Input name: comments_per_post
- Description: Number of top comments per post (0-10)

**Input 5:**
- Click + Add an input, then select Text.
- Input name: keyword_filter
- Description: Optional keyword to filter posts by title or body content

**Input 6:**
- Click + Add an input, then select Text.
- Input name: platform
- Description: Platform identifier (always reddit for this flow)

**Input 7:**
- Click + Add an input, then select Yes/No (Boolean).
- Input name: include_comments
- Description: Whether to fetch comment threads for each post

> **VERIFY**: Your trigger should now show 7 inputs: subreddit (Text), time_filter (Text), max_posts (Number), comments_per_post (Number), keyword_filter (Text), platform (Text), include_comments (Yes/No).

## Step 4.3: Initialize Variables

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer (below trigger)

We need several variables to track state throughout the flow.

**Variable 1 -- Reddit Access Token:**

1. Below the trigger, click + then Add an action.

2. Search for "Initialize variable" and select Initialize variable (under "Variable" actions).

3. Fill in:
   - Name: varRedditToken
   - Type: String
   - Value: (leave empty)

4. Click the three dots (...) on this action, then Settings, then scroll down to Security, then toggle Secure Inputs to On and Secure Outputs to On. Click Done.

5. Click the three dots (...) again, then Rename. Type: Init_Reddit_Token

> **CRITICAL**: The Reddit access token is a sensitive credential. Enabling Secure Inputs and Secure Outputs hides the token value from flow run history, preventing accidental exposure.

**Variable 2 -- Posts Array:**

6. Click + then Add an action. Search for "Initialize variable" and select it.

7. Fill in:
   - Name: varPostsArray
   - Type: Array
   - Value: []

8. Rename to: Init_Posts_Array

**Variable 3 -- Session ID:**

9. Click + then Add an action. Search for "Initialize variable" and select it.

10. Fill in:
    - Name: varSessionId
    - Type: String
    - Value: (leave empty for now -- we will set it with a Compose action)

11. Rename to: Init_Session_Id

**Variable 4 -- Post Count:**

12. Click + then Add an action. Search for "Initialize variable" and select it.

13. Fill in:
    - Name: varPostCount
    - Type: Integer
    - Value: 0

14. Rename to: Init_Post_Count

**Variable 5 -- Error Message:**

15. Click + then Add an action. Search for "Initialize variable" and select it.

16. Fill in:
    - Name: varErrorMessage
    - Type: String
    - Value: (leave empty)

17. Rename to: Init_Error_Message

## Step 4.4: Generate Session ID

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer (below variables)

1. Click + then Add an action. Search for "Compose" and select Compose (under "Data Operations").

2. In the Inputs field, click the Expression tab (the fx button) and paste:

> **COPY-PASTE** into the Expression field:
> `concat('SDC_', formatDateTime(utcNow(), 'yyyyMMddHHmmss'), '_', guid())`

3. Click OK.

4. Rename this action to: Generate_Session_Id

5. Click + then Add an action. Search for "Set variable" and select Set variable.

6. Fill in:
   - Name: Select varSessionId from the dropdown.
   - Value: Click the lightning bolt (dynamic content) icon, then under Generate_Session_Id, select Outputs.

7. Rename to: Set_Session_Id

## Step 4.5: Retrieve Reddit API Credentials from Environment Variables

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer

We retrieve each credential using the "List rows" Dataverse action to query environment variable values. However, the simplest approach for beginners is to use Compose actions with the literal values, secured with Secure Inputs/Outputs. We will use this approach.

> **BEGINNER TIP**: In a production environment, you would use the Power Platform connector's "Get environment variable" action or query Dataverse directly. For this recipe, we use Compose actions with your actual credential values pasted in, then secure them so the values are hidden from run history. When your team is ready, replace these with Dataverse lookups.

**Credential 1 -- Reddit Client ID:**

1. Click + then Add an action. Search for "Compose" and select Compose.

2. In the Inputs field, paste your Reddit Client ID (the short alphanumeric string from your Reddit app registration).

3. Immediately secure this action: Click the three dots (...) on the Compose action, then Settings, then scroll down to Security, then toggle Secure Inputs to On, then toggle Secure Outputs to On. Click Done.

4. Rename this action to: Get_Reddit_ClientId

**Credential 2 -- Reddit Client Secret:**

5. Click + then Add an action. Search for "Compose" and select Compose.

6. In the Inputs field, paste your Reddit Client Secret.

7. Secure it: Click (...), then Settings, then Secure Inputs: On, Secure Outputs: On. Click Done.

8. Rename to: Get_Reddit_Secret

**Credential 3 -- Reddit User Agent:**

9. Click + then Add an action. Search for "Compose" and select Compose.

10. In the Inputs field, type: script:SocialDataCollector:1.0 (by /u/YOUR_REDDIT_USERNAME)
    Replace YOUR_REDDIT_USERNAME with your actual Reddit username.

11. Rename to: Get_Reddit_UserAgent

> **WATCH OUT**: The User-Agent string is NOT a secret -- it is a public identifier. Do NOT enable Secure Inputs/Outputs on this action. Reddit uses it to identify your application and will block requests without a proper User-Agent.

## Step 4.6: Authenticate with Reddit OAuth2

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer

This is the critical authentication step. We send a POST request to Reddit's token endpoint using client credentials.

1. Click + then Add an action. Search for "Compose" and select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `base64(concat(outputs('Get_Reddit_ClientId'), ':', outputs('Get_Reddit_Secret')))`

3. Click OK.

4. Secure this action: Click (...), then Settings, then Secure Inputs: On, Secure Outputs: On. Click Done.

5. Rename to: Build_Basic_Auth

6. Click + then Add an action. Search for "HTTP" and select HTTP (the premium connector with the blue globe icon).

7. Configure the HTTP action:
   - Method: Select POST from the dropdown.
   - URI: https://www.reddit.com/api/v1/access_token
   - Click Show advanced options (or + Add new parameter), then check Headers and Body.
   - Headers: Click + Add new item three times to create three header rows:
     - Header 1: Key = Authorization | Value = Type `Basic ` (with the trailing space), then click the lightning bolt (dynamic content) icon, then under Build_Basic_Auth, select Outputs. The full value reads: Basic [dynamic content from Build_Basic_Auth]
     - Header 2: Key = User-Agent | Value = Click the lightning bolt icon, then under Get_Reddit_UserAgent, select Outputs.
     - Header 3: Key = Content-Type | Value = application/x-www-form-urlencoded
   - Body: Type exactly: grant_type=client_credentials

8. Click the three dots (...) on this HTTP action, then Settings:
   - Secure Inputs: On
   - Secure Outputs: On
   - Timeout: Type PT120S
   - Click Done.

9. Rename to: HTTP_Reddit_Auth

10. Click + then Add an action. Search for "Compose" and select Compose.

11. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `body('HTTP_Reddit_Auth')?['access_token']`

12. Click OK.

13. Secure this action: Click (...), then Settings, then Secure Inputs: On, Secure Outputs: On. Click Done.

14. Rename to: Extract_Reddit_Token

15. Click + then Add an action. Search for "Set variable" and select Set variable.

16. Fill in:
    - Name: Select varRedditToken
    - Value: Click the lightning bolt icon, then under Extract_Reddit_Token, select Outputs.

17. Secure this action: Click (...), then Settings, then Secure Inputs: On, Secure Outputs: On. Click Done.

18. Rename to: Set_Reddit_Token

> **VERIFY**: At this point, your flow should have: trigger with 7 inputs, 5 Initialize Variable actions, Generate_Session_Id + Set_Session_Id, 3 credential Compose actions, Build_Basic_Auth, HTTP_Reddit_Auth, Extract_Reddit_Token, and Set_Reddit_Token. That is 16 actions so far.

## Step 4.7: Fetch Posts from Reddit

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer

Now we call the Reddit API to fetch top posts from the specified subreddit.

1. Click + then Add an action. Search for "Compose" and select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `concat('https://oauth.reddit.com/r/', triggerBody()?['subreddit'], '/top.json?limit=', string(min(triggerBody()?['max_posts'], 100)), '&t=', triggerBody()?['time_filter'])`

> **BEGINNER TIP**: This expression builds the Reddit API URL dynamically. It takes the subreddit name from the trigger input, limits the request to 100 posts maximum (Reddit's per-request limit), and applies the time filter. The `min()` function ensures we never request more than 100 in a single call.

3. Click OK.

4. Rename to: Build_Reddit_Posts_URL

5. Click + then Add an action. Search for "HTTP" and select HTTP.

6. Configure the HTTP action:
   - Method: Select GET from the dropdown.
   - URI: Click the lightning bolt icon, then under Build_Reddit_Posts_URL, select Outputs.
   - Headers: Click + Add new item twice:
     - Header 1: Key = Authorization | Value = Type `Bearer ` (with the trailing space), then click the lightning bolt icon, then under the Variables section, select varRedditToken.
     - Header 2: Key = User-Agent | Value = Click the lightning bolt icon, then under Get_Reddit_UserAgent, select Outputs.

7. Click (...), then Settings:
   - Secure Inputs: On (because the Authorization header contains the token)
   - Timeout: PT120S
   - Click Done.

8. Rename to: HTTP_Reddit_Posts

## Step 4.8: Parse the Posts Response

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer

1. Click + then Add an action. Search for "Compose" and select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `body('HTTP_Reddit_Posts')?['data']?['children']`

3. Click OK.

4. Rename to: Extract_Posts_Array

> **BEGINNER TIP**: The Reddit API returns a JSON structure where posts are nested inside `data.children`. Each child is an object with a `data` property containing the actual post fields (title, selftext, score, etc.). This Compose action extracts just the children array so we can loop through it.

## Step 4.9: Loop Through Posts and Optionally Fetch Comments

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer

1. Click + then Add an action. Search for "Apply to each" and select Apply to each (under "Control").

2. In the "Select an output from previous steps" field, click the lightning bolt icon, then under Extract_Posts_Array, select Outputs.

3. Rename this loop to: Loop_Through_Posts

**Inside the loop, add the following actions:**

**Action 1 inside loop -- Extract Post Data:**

4. Inside the Loop_Through_Posts, click + then Add an action. Search for "Compose" and select Compose.

5. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `items('Loop_Through_Posts')?['data']`

6. Click OK.

7. Rename to: Extract_Post_Data

**Action 2 inside loop -- Check Keyword Filter:**

8. Click + then Add an action. Search for "Condition" and select Condition (under "Control").

9. Configure the condition. We need to check if the keyword filter is empty OR if the post contains the keyword. Click the Expression tab (fx) in the left side of the condition and paste:

> **COPY-PASTE** into the Expression field:
> `or(equals(triggerBody()?['keyword_filter'], ''), contains(toLower(concat(outputs('Extract_Post_Data')?['title'], ' ', outputs('Extract_Post_Data')?['selftext'])), toLower(triggerBody()?['keyword_filter'])))`

10. Set the operator to is equal to and the right side value to true.

11. Rename this condition to: Check_Keyword_Match

**Inside the "Yes" branch of Check_Keyword_Match (post matches filter):**

**Action 3 -- Build Post Object:**

12. Inside the Yes branch, click + then Add an action. Search for "Compose" and select Compose.

13. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `json(concat('{"id":"', outputs('Extract_Post_Data')?['id'], '","title":"', replace(replace(replace(replace(coalesce(outputs('Extract_Post_Data')?['title'], ''), '\', '\\'), '"', '\"'), decodeUriComponent('%0A'), '\n'), decodeUriComponent('%0D'), ''), '","body":"', replace(replace(replace(replace(coalesce(outputs('Extract_Post_Data')?['selftext'], ''), '\', '\\'), '"', '\"'), decodeUriComponent('%0A'), '\n'), decodeUriComponent('%0D'), ''), '","score":', string(coalesce(outputs('Extract_Post_Data')?['score'], 0)), ',"num_comments":', string(coalesce(outputs('Extract_Post_Data')?['num_comments'], 0)), ',"author":"', coalesce(outputs('Extract_Post_Data')?['author'], '[deleted]'), '","created_utc":', string(coalesce(outputs('Extract_Post_Data')?['created_utc'], 0)), ',"url":"', coalesce(outputs('Extract_Post_Data')?['url'], ''), '","subreddit":"', triggerBody()?['subreddit'], '","top_comments":[]}'))`

> **WATCH OUT**: This is a long expression. It builds a JSON object for each post with all fields properly escaped using the mandatory 4-step escape chain (Rule 38). The `replace()` calls handle backslashes, double quotes, newlines, and carriage returns in post titles and body text. Copy it exactly -- any missing parenthesis will cause an error.

14. Click OK.

15. Rename to: Build_Post_Object

**Action 4 -- Check if Comments Needed:**

16. Click + then Add an action. Search for "Condition" and select Condition.

17. Configure: Left side = click the lightning bolt icon, then from the trigger, select include_comments. Operator = is equal to. Right side = true (select the boolean true).

18. Rename to: Check_Comments_Needed

**Inside the "Yes" branch of Check_Comments_Needed:**

**Action 5 -- Fetch Comments for This Post:**

19. Click + then Add an action. Search for "Compose" and select Compose.

20. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `concat('https://oauth.reddit.com/r/', triggerBody()?['subreddit'], '/comments/', outputs('Extract_Post_Data')?['id'], '.json?limit=', string(triggerBody()?['comments_per_post']), '&sort=top')`

21. Click OK.

22. Rename to: Build_Comments_URL

23. Click + then Add an action. Search for "HTTP" and select HTTP.

24. Configure:
    - Method: GET
    - URI: Click the lightning bolt icon, then under Build_Comments_URL, select Outputs.
    - Headers:
      - Header 1: Key = Authorization | Value = `Bearer ` then lightning bolt > varRedditToken
      - Header 2: Key = User-Agent | Value = lightning bolt > Get_Reddit_UserAgent > Outputs

25. Click (...), then Settings:
    - Secure Inputs: On
    - Timeout: PT120S
    - Click Done.

26. Rename to: HTTP_Reddit_Comments

**Action 6 -- Extract Comments Array:**

27. Click + then Add an action. Search for "Compose" and select Compose.

28. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `body('HTTP_Reddit_Comments')?[1]?['data']?['children']`

> **BEGINNER TIP**: The Reddit comments endpoint returns an array of two items. The first item (`[0]`) is the post itself. The second item (`[1]`) contains the comments. We access `[1]['data']['children']` to get the comment objects.

29. Click OK.

30. Rename to: Extract_Comments_Array

**Action 7 -- Build Comments JSON String:**

31. Click + then Add an action. Search for "Select" and select Select (under "Data Operations").

32. Configure:
    - From: Click the lightning bolt icon, then under Extract_Comments_Array, select Outputs.
    - Map mode: Click the toggle to switch to "Map" mode (the T icon).
    - Map: Click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `json(concat('{"author":"', coalesce(item()?['data']?['author'], '[deleted]'), '","body":"', replace(replace(replace(replace(coalesce(item()?['data']?['body'], ''), '\', '\\'), '"', '\"'), decodeUriComponent('%0A'), '\n'), decodeUriComponent('%0D'), ''), '","score":', string(coalesce(item()?['data']?['score'], 0)), '}'))`

33. Click OK.

34. Rename to: Select_Comments

**Action 8 -- Merge Post with Comments:**

35. Click + then Add an action. Search for "Compose" and select Compose.

36. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `setProperty(outputs('Build_Post_Object'), 'top_comments', body('Select_Comments'))`

37. Click OK.

38. Rename to: Merge_Post_With_Comments

**Action 9 -- Rate Limit Delay:**

39. Click + then Add an action. Search for "Delay" and select Delay (under "Schedule").

40. Configure:
    - Count: 10
    - Unit: Second

41. Rename to: Rate_Limit_Delay_10s

> **CRITICAL**: This 10-second delay between comment fetches is mandatory. Reddit aggressively rate-limits applications that make requests too quickly. Without this delay, your OAuth token may be temporarily suspended.

**Back in the "No" branch of Check_Comments_Needed (no comments needed):**

42. Click the "No" branch of Check_Comments_Needed. Click + then Add an action. Search for "Compose" and select Compose.

43. In the Inputs field, click the lightning bolt icon, then under Build_Post_Object, select Outputs.

44. Rename to: Post_Without_Comments

**After Check_Comments_Needed (both branches merge):**

**Action 10 -- Append Post to Array:**

45. After the Check_Comments_Needed condition (where both branches merge), click + then Add an action. Search for "Append to array variable" and select it.

46. Configure:
    - Name: Select varPostsArray
    - Value: Click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `if(equals(triggerBody()?['include_comments'], true), outputs('Merge_Post_With_Comments'), outputs('Post_Without_Comments'))`

> **WATCH OUT**: This expression selects the correct post object depending on whether comments were fetched. If include_comments is true, it uses the merged object with comments. Otherwise, it uses the post without comments.

47. Click OK.

48. Rename to: Append_Post_To_Array

**Action 11 -- Increment Post Count:**

49. Click + then Add an action. Search for "Increment variable" and select Increment variable.

50. Configure:
    - Name: Select varPostCount
    - Value: 1

51. Rename to: Increment_Post_Count

**End of the "Yes" branch of Check_Keyword_Match. The "No" branch (post does not match keyword filter) is left empty -- the post is simply skipped.**

**This completes the Loop_Through_Posts.**

## Step 4.10: Build the Complete JSON Dataset

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer (below the loop)

1. Below the Loop_Through_Posts (outside and after the loop), click + then Add an action. Search for "Compose" and select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `json(concat('{"source":"reddit","subreddit":"', triggerBody()?['subreddit'], '","collected_at":"', formatDateTime(utcNow(), 'yyyy-MM-ddTHH:mm:ssZ'), '","time_filter":"', triggerBody()?['time_filter'], '","item_count":', string(variables('varPostCount')), ',"keyword_filter":"', coalesce(triggerBody()?['keyword_filter'], ''), '","items":', string(variables('varPostsArray')), '}'))`

3. Click OK.

4. Rename to: Build_Complete_Dataset

## Step 4.11: Save JSON to SharePoint

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer

1. Click + then Add an action. Search for "Create file" and select Create file (under "SharePoint").

2. Configure:
   - Site Address: Select your SharePoint ResearchHub site from the dropdown (or paste the URL: https://yourcompany.sharepoint.com/sites/ResearchHub).
   - Folder Path: Click the folder icon and navigate to /Shared Documents/Collections. If the session subfolder does not exist yet, we will create it first.

> **WATCH OUT**: SharePoint's "Create file" action can create a file in an existing folder but cannot create folders. We need to create the session subfolder first.

3. Actually, delete this action. We need to create the folder first.

4. Click + then Add an action. Search for "Send an HTTP request to SharePoint" and select it (under "SharePoint").

5. Configure:
   - Site Address: Select your SharePoint ResearchHub site.
   - Method: POST
   - Uri: Click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `concat('_api/web/folders/add(''', '/sites/ResearchHub/Shared Documents/Collections/', variables('varSessionId'), ''')')`

   - Headers: Leave as default (the connector handles authentication).
   - Body: Leave empty.

6. Click OK.

7. Rename to: Create_Session_Folder

8. Now click + then Add an action. Search for "Create file" and select Create file (SharePoint).

9. Configure:
   - Site Address: Select your SharePoint ResearchHub site.
   - Folder Path: Click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `concat('/Shared Documents/Collections/', variables('varSessionId'))`

   - File Name: Click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `concat(variables('varSessionId'), '_reddit_', triggerBody()?['subreddit'], '_data_complete.json')`

   - File Content: Click the lightning bolt icon, then under Build_Complete_Dataset, select Outputs.

10. Click OK.

11. Rename to: Save_JSON_To_SharePoint

## Step 4.12: Return Results to the Agent

WHERE AM I?: Power Automate > Collect Reddit Data Flow > Designer

1. Click + then Add an action. Search for "Respond to Copilot" (or "Respond to the agent" or "Return value(s) to Power Virtual Agents" -- the label varies by version). Select it.

2. Click + Add an output six times to create six outputs:

**Output 1:**
- Type: Text
- Name: status
- Value: Type the literal text: completed

**Output 2:**
- Type: Text
- Name: job_id
- Value: Click the lightning bolt icon, then under the Variables section, select varSessionId.

**Output 3:**
- Type: Text
- Name: post_count
- Value: Click the Expression tab (fx) and paste: `string(variables('varPostCount'))`

**Output 4:**
- Type: Text
- Name: sharepoint_json_url
- Value: Click the lightning bolt icon, then under Save_JSON_To_SharePoint, select the output labeled "Link to item" or "Full Path" (the exact label depends on your SharePoint connector version). If neither is available, use the Expression: `body('Save_JSON_To_SharePoint')?['{Link}']`

**Output 5:**
- Type: Text
- Name: sharepoint_pdf_urls
- Value: Type the literal text: PDF generation not yet implemented

**Output 6:**
- Type: Text
- Name: pdf_file_count
- Value: Type: 0

3. Click the three dots (...) on the Respond to Copilot action, then Settings, then under Networking, verify that Asynchronous Response is set to Off.

> **CRITICAL**: Asynchronous Response MUST be Off. If it is On, the agent will not wait for the flow to complete and will not receive the output values.

4. Click Save at the top of the flow editor. Wait for the green "Your flow is ready" banner.

> **WATCH OUT**: This flow may exceed the 100-second synchronous timeout for large collections (many posts with comments and 10-second delays). For production use, consider splitting the flow: have the first part respond immediately with a job_id, then continue processing asynchronously (actions placed AFTER the Respond to Copilot action can run for up to 30 days). The Check Collection Job Status flow would then poll SharePoint for completion. For this recipe, we keep it synchronous for simplicity, but limit max_posts to 100 and comments_per_post to 5 to stay within the timeout.

## Step 4.13: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Init_Reddit_Token | Initialize variable | String, empty, Secure I/O |
| 2 | Init_Posts_Array | Initialize variable | Array, [] |
| 3 | Init_Session_Id | Initialize variable | String, empty |
| 4 | Init_Post_Count | Initialize variable | Integer, 0 |
| 5 | Init_Error_Message | Initialize variable | String, empty |
| 6 | Generate_Session_Id | Compose | concat('SDC_', formatDateTime..., guid()) |
| 7 | Set_Session_Id | Set variable | varSessionId = Generate_Session_Id output |
| 8 | Get_Reddit_ClientId | Compose | Literal client ID, Secure I/O |
| 9 | Get_Reddit_Secret | Compose | Literal client secret, Secure I/O |
| 10 | Get_Reddit_UserAgent | Compose | User-Agent string |
| 11 | Build_Basic_Auth | Compose | base64(concat(clientId, ':', secret)), Secure I/O |
| 12 | HTTP_Reddit_Auth | HTTP | POST https://www.reddit.com/api/v1/access_token |
| 13 | Extract_Reddit_Token | Compose | body('HTTP_Reddit_Auth')?['access_token'] |
| 14 | Set_Reddit_Token | Set variable | varRedditToken = token, Secure I/O |
| 15 | Build_Reddit_Posts_URL | Compose | concat URL with subreddit, limit, time_filter |
| 16 | HTTP_Reddit_Posts | HTTP | GET oauth.reddit.com/r/{sub}/top.json |
| 17 | Extract_Posts_Array | Compose | body(...)?['data']?['children'] |
| 18 | Loop_Through_Posts | Apply to each | Over Extract_Posts_Array outputs |
| 19 | -- Extract_Post_Data | Compose | items('Loop_Through_Posts')?['data'] |
| 20 | -- Check_Keyword_Match | Condition | keyword empty OR post contains keyword |
| 21 | ---- Build_Post_Object | Compose | JSON object with 4-step escape chain |
| 22 | ---- Check_Comments_Needed | Condition | include_comments == true |
| 23 | ------ Build_Comments_URL | Compose | concat comments endpoint URL |
| 24 | ------ HTTP_Reddit_Comments | HTTP | GET /comments/{id}.json |
| 25 | ------ Extract_Comments_Array | Compose | body(...)?[1]?['data']?['children'] |
| 26 | ------ Select_Comments | Select | Map each comment to JSON object |
| 27 | ------ Merge_Post_With_Comments | Compose | setProperty(post, 'top_comments', comments) |
| 28 | ------ Rate_Limit_Delay_10s | Delay | 10 seconds |
| 29 | ---- Post_Without_Comments | Compose | Pass-through of Build_Post_Object |
| 30 | -- Append_Post_To_Array | Append to array | varPostsArray += post object |
| 31 | -- Increment_Post_Count | Increment variable | varPostCount += 1 |
| 32 | Build_Complete_Dataset | Compose | Full JSON dataset with metadata |
| 33 | Create_Session_Folder | Send HTTP to SharePoint | POST _api/web/folders/add |
| 34 | Save_JSON_To_SharePoint | Create file (SharePoint) | JSON file in /Collections/{session}/ |
| 35 | Respond_To_Agent | Respond to Copilot | 6 outputs: status, job_id, post_count, urls |

## Step 4.14: Connect the Flow to the Data Collection Request Topic

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Data Collection Request

Now that the flow is built and saved, go back to the Data Collection Request topic and replace the placeholder with a real Action node.

1. Navigate back to Copilot Studio and open the Data Collection Request topic.

2. Find the placeholder Message node you created in Step 3.10 (the one that says "[ACTION PLACEHOLDER]").

3. Delete this Message node by clicking the three dots (...) on it, then Delete.

4. Click the + button where the placeholder was.

5. Click Add a tool. A panel opens showing available tools and flows.

6. Find Collect Reddit Data in the list. Click it.

7. An Action node appears in the topic. You need to map each input parameter:
   - subreddit: Click the input field, then select Topic.varSubreddit from the variable picker.
   - time_filter: Click the input field, then select Topic.varTimeFilter.
   - max_posts: Click the input field, then select Topic.varCollectionCount.
   - comments_per_post: Click the input field, then select Topic.varCommentsPerPost.
   - keyword_filter: Click the input field, then click the formula icon (fx), type `Text("")`, and click Done.
   - platform: Click the input field and type the literal text: reddit
   - include_comments: Click the input field, then click the formula icon (fx), type `If(Topic.varCommentsPerPost > 0, true, false)`, and click Done.

8. The Action node also shows output parameters. Click each output to map it to a topic variable:
   - status: Click and select Create a new variable. Name it varCollectionStatus.
   - job_id: Click and select Create a new variable. Name it varCollectionJobId. Then click the variable name, open Variable properties, and under Usage select "Global (any topic can access)" so other topics can reference this job ID.
   - post_count: Click and select Create a new variable. Name it varPostCountResult.
   - sharepoint_json_url: Click and select Create a new variable. Name it varSharepointJsonUrl.
   - sharepoint_pdf_urls: Click and select Create a new variable. Name it varSharepointPdfUrls.
   - pdf_file_count: Click and select Create a new variable. Name it varPdfFileCount.

9. Click Save.

10. Now update the final Message node (Node 10 -- Collection Initiated Confirmation) to use the actual output variables:

```
Collection complete!

- Status: {Topic.varCollectionStatus}
- Posts Collected: {Topic.varPostCountResult}
- Job ID: {Global.varCollectionJobId}

Download your JSON dataset:
{Topic.varSharepointJsonUrl}

Type "check status" to see detailed results, or "export results" to download in additional formats.
```

11. Click Save.

---

# PHASE 5: Register Collect Reddit Data -- TOOL REGISTRATION

Registering the flow as an agent-level tool allows the generative orchestrator to call it autonomously when it determines the user wants to collect Reddit data, even outside the Data Collection Request topic.

## Step 5.1: Register the Collect Reddit Data Flow as a Tool

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview > Tools

1. Navigate to the Overview page of your Social Data Collector agent.

2. Find the Tools section. Click Add a tool.

3. In the tool picker panel, look for Power Automate flows (or Flows). Click it.

4. Find Collect Reddit Data in the list. Click it, then click Add and configure.

5. On the configuration screen, fill in:
   - Name: Collect Reddit Data
   - Description: Executes Reddit data collection via OAuth2 API. Collects posts and comments from specified subreddits within a time filter range. Generates JSON dataset saved to SharePoint. Enforces 10-second rate limiting between comment fetches. Call this tool when the user wants to collect, scrape, gather, or download Reddit posts or comments.

6. Under Inputs, verify each input is listed:
   - subreddit (String) -- the orchestrator will fill this from conversation context
   - time_filter (String) -- the orchestrator will fill this from context or ask the user
   - max_posts (Number) -- the orchestrator will fill or use default
   - comments_per_post (Number) -- the orchestrator will fill or use default
   - keyword_filter (String) -- optional, orchestrator may leave empty
   - platform (String) -- always "reddit"
   - include_comments (Boolean) -- derived from comments_per_post

7. Under Completion, select "Don't respond (default)" -- this lets the agent incorporate the output into its own contextual response.

8. Click Save.

> **VERIFY**: The Tools section on the Overview page should now show "Collect Reddit Data" with the Flow icon.

---

# PHASE 6: Source Selection -- TOPIC BUILD (node-by-node: 7 nodes)

This topic helps users choose appropriate subreddits for their research topic by querying the Collection Templates knowledge source.

## Step 6.1: Create the Topic and Set Trigger Phrases

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Custom > + Add a topic > From blank

1. Click the Topics tab, then Custom, then + Add a topic, then From blank.

2. Rename the topic to: Source Selection

3. Set the Description to: User needs help choosing subreddits or data sources for their research. Route here when the user asks about available sources, wants recommendations, or needs help finding relevant subreddits.

4. Add these trigger phrases:
   - choose data source
   - configure sources
   - select subreddit
   - which platform
   - available sources
   - recommend subreddits
   - suggest subreddits for my research
   - help me find a subreddit
   - what subreddits should I use

## Step 6.2: Node 1 -- Source Configuration Introduction (Message)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Source Selection > Canvas

1. Click the + button below the Trigger node. Select Send a message.

2. Type:

```
I can help you find the right data sources for your research. Here is how source identifiers work:

Reddit: Subreddit names without the r/ prefix (for example, "technology", "customerservice"). You can collect from multiple subreddits by separating names with commas.

I have a library of recommended subreddits organized by industry vertical: retail, technology, finance, healthcare, automotive, travel, and food/beverage.

Tell me about your research topic and I will suggest relevant subreddits.
```

3. Click Save.

## Step 6.3: Node 2 -- Select Platform for Source Browsing (Question)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Source Selection > Canvas

1. Click + below the message. Select Ask a question.

2. Type: Which platform are you looking for sources on?

3. Under Identify, set up choices: Reddit, TrustPilot (coming soon), Google Play Store (coming soon).

4. Click the output variable. Name it: varSourcePlatform. Scope: Topic.

5. Click Save.

## Step 6.4: Node 3 -- Describe Research Topic (Question)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Source Selection > Canvas

1. Click + below the platform question. Select Ask a question.

2. Type: Describe your research topic or industry so I can recommend relevant subreddits. For example: "customer experience in retail banking" or "electric vehicle consumer sentiment".

3. Under Identify, select User's entire response.

4. Click the output variable. Name it: varResearchTopic. Scope: Topic.

5. Click Save.

## Step 6.5: Node 4 -- Search Knowledge for Recommendations (Generative Answers)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Source Selection > Canvas

Instead of calling a flow, we use the agent's built-in knowledge search to find relevant subreddit recommendations from the Collection Templates library.

1. Click + below the research topic question. Select Advanced, then Generative answers.

> **BEGINNER TIP**: The "Generative answers" node searches the agent's connected knowledge sources (in this case, the Collection Templates SharePoint library) and generates a response based on what it finds. This is simpler than building a separate flow for knowledge retrieval.

2. In the Input field, click the variable picker and select Topic.varResearchTopic.

3. Under Data sources, verify that the Collection Templates Library knowledge source is selected.

4. In the instructions field (if available), type: Search the Collection Templates library for subreddit recommendations related to the user's research topic. Return a list of 3-5 recommended subreddits with their names, descriptions, estimated subscriber counts, and typical post volumes. Format as a numbered list.

5. Click Save.

## Step 6.6: Node 5 -- Display Source Recommendations (Adaptive Card)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Source Selection > Canvas

1. Click + below the generative answers node. Select Ask with Adaptive Card.

2. Click (...), then Properties, then Edit adaptive card.

3. Delete any default content and paste:

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
          "text": "SUBREDDIT RECOMMENDATIONS",
          "weight": "Bolder",
          "size": "Medium",
          "color": "Light",
          "wrap": true
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Based on your research topic, here are recommended subreddits. Select the ones you want to collect data from.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "Input.Text",
      "id": "selectedSources",
      "label": "Enter subreddit names (comma-separated)",
      "placeholder": "technology, programming, sysadmin",
      "isRequired": true,
      "isMultiline": false
    },
    {
      "type": "TextBlock",
      "text": "Enter subreddit names without the r/ prefix, separated by commas. You can use the recommendations above or enter your own.",
      "wrap": true,
      "size": "Small",
      "isSubtle": true
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "SELECT THESE SOURCES"
    }
  ]
}
```

4. Save the card editor.

5. The output variable from the card is selectedSources. Click the variable name and rename it to: varSelectedSources. Scope: Topic.

6. Click Save.

## Step 6.7: Node 6 -- Validate Source Selection (Condition)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Source Selection > Canvas

1. Click + below the Adaptive Card. Select Add a condition, then Condition.

2. Configure: Variable = Topic.varSelectedSources. Operator = is not blank (or "is not equal to" with value empty string).

3. In the Yes branch, add a Message node (Step 6.8 below).

4. In the No branch, add a Message node: "No sources were selected. Please enter at least one subreddit name." Then add a Redirect node back to the Adaptive Card (or end the topic).

5. Click Save.

## Step 6.8: Node 7 -- Source Selection Confirmed (Message)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Source Selection > Canvas

1. In the Yes branch of the condition, click + then Send a message.

2. Type:

```
Sources confirmed: {Topic.varSelectedSources}

You can now start a data collection with these subreddits. Type "collect Reddit data" and I will pre-fill the subreddit field with your selection.

Or type "collect data" to configure all parameters from scratch.
```

3. Click Save.

## Step 6.9: Complete YAML for Source Selection Topic

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Source Selection
    triggerQueries:
      - choose data source
      - configure sources
      - select subreddit
      - which platform
      - available sources
      - recommend subreddits
      - suggest subreddits for my research
      - help me find a subreddit
      - what subreddits should I use
  actions:
    - kind: SendMessage
      id: sourceIntro
      message: |-
        I can help you find the right data sources for your research. Here is how source identifiers work:

        Reddit: Subreddit names without the r/ prefix (for example, "technology", "customerservice"). You can collect from multiple subreddits by separating names with commas.

        I have a library of recommended subreddits organized by industry vertical: retail, technology, finance, healthcare, automotive, travel, and food/beverage.

        Tell me about your research topic and I will suggest relevant subreddits.

    - kind: Question
      id: askSourcePlatform
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varSourcePlatform
      prompt: "Which platform are you looking for sources on?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: reddit
              displayName: Reddit
            - id: trustpilot
              displayName: TrustPilot (coming soon)
            - id: playstore
              displayName: Google Play Store (coming soon)

    - kind: Question
      id: askResearchTopic
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varResearchTopic
      prompt: "Describe your research topic or industry so I can recommend relevant subreddits. For example: 'customer experience in retail banking' or 'electric vehicle consumer sentiment'."
      entity: StringPrebuiltEntity

    - kind: SearchAndSummarizeContent
      id: searchKnowledge
      userMessage: =Topic.varResearchTopic

    - kind: SendMessage
      id: sourceConfirmed
      message: |-
        Based on the recommendations above, type the subreddit names you want to use (comma-separated, without r/ prefix).

        Or type "collect data" to start a collection and I will ask for the subreddit name during parameter setup.

    - kind: EndDialog
      id: endSourceSelection
```

---

# PHASE 7: Collection Status -- TOPIC BUILD (node-by-node: 6 nodes)

This topic lets users check the progress of active or completed collection jobs by querying SharePoint for the session folder and its files.

## Step 7.1: Create the Topic and Set Trigger Phrases

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Custom > + Add a topic > From blank

1. Click Topics, then Custom, then + Add a topic, then From blank.

2. Rename to: Collection Status

3. Set Description to: User wants to check the progress or status of a data collection job. Route here when the user asks about collection progress, completion, errors, or whether a job has finished.

4. Add trigger phrases:
   - check collection status
   - job progress
   - is my collection done
   - collection update
   - how is the job going
   - check on my data pull
   - what is the status
   - status of my collection

## Step 7.2: Node 1 -- Status Check Introduction (Message)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Collection Status > Canvas

1. Click + below the Trigger node. Select Send a message.

2. Type:

```
I can check the status of your data collection job. I need your job ID to look it up. If you just completed a collection, I already have your most recent job ID stored.
```

3. Click Save.

## Step 7.3: Node 2 -- Provide Job Identifier (Question)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Collection Status > Canvas

1. Click + below the message. Select Ask a question.

2. Type: What is your collection job ID? You can type the job ID, or type "latest" to check your most recent collection.

3. Under Identify, select User's entire response.

4. Click the output variable. Name it: varJobIdentifier. Scope: Topic.

5. Click Save.

## Step 7.4: Node 3 -- Resolve Job ID (Condition + Set Variable)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Collection Status > Canvas

1. Click + below the question. Select Add a condition, then Condition.

2. Configure: Variable = Topic.varJobIdentifier. Operator = is equal to. Value = latest

3. In the Yes branch, click + then Variable management, then Set a variable value.
   - Set variable: Topic.varJobIdentifier
   - To value: Click the variable picker and select Global.varCollectionJobId (the global variable set during the Data Collection Request topic).

4. In the No branch, leave it empty (the user provided an explicit job ID).

5. Click Save.

## Step 7.5: Node 4 -- Retrieve Job Status (Action -- Call Flow)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Collection Status > Canvas

Similar to Phase 3, we add a placeholder for the Check Collection Job Status flow (built in Phase 8).

1. After the condition (where both branches merge), click +.

2. Click Send a message (placeholder). Type:

```
[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Check Collection Job Status flow. Map input: job_id -> Topic.varJobIdentifier. Map outputs: status -> Topic.varJobStatus, progress -> Topic.varJobProgress, total_items -> Topic.varTotalItems, collected_items -> Topic.varCollectedItems, files -> Topic.varFilesList, error_message -> Topic.varErrorMsg.
```

3. Click Save.

> **CRITICAL**: After building the Check Collection Job Status flow in Phase 8, come back here and replace this placeholder with the actual Action node.

## Step 7.6: Node 5 -- Display Job Status Card (Adaptive Card)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Collection Status > Canvas

1. Click + below the placeholder. Select Send a message (we use a Message node for a non-interactive display card).

2. Click the message area. Click the + icon in the message toolbar to add an Adaptive Card attachment. Alternatively, type the status as plain text for now:

```
Collection Job Status:
- Job ID: {Topic.varJobIdentifier}
- Status: Checking SharePoint for files...

After the Check Collection Job Status flow is connected, this message will display:
- Current status (completed/running/failed)
- Files generated (JSON dataset)
- Download links to SharePoint

Type "export results" to download your data, or "collect data" to start a new collection.
```

3. Click Save.

## Step 7.7: Node 6 -- Next Steps Guidance (Message)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Collection Status > Canvas

1. Click + below the status display. Select Send a message.

2. Type:

```
What would you like to do next?
- Type "export results" to download your collected data
- Type "collect data" to start a new collection
- Type "choose source" to get subreddit recommendations
```

3. Click Save.

## Step 7.8: Complete YAML for Collection Status Topic

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Collection Status
    triggerQueries:
      - check collection status
      - job progress
      - is my collection done
      - collection update
      - how is the job going
      - check on my data pull
      - what is the status
      - status of my collection
  actions:
    - kind: SendMessage
      id: statusIntro
      message: |-
        I can check the status of your data collection job. I need your job ID to look it up. If you just completed a collection, I already have your most recent job ID stored.

    - kind: Question
      id: askJobId
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varJobIdentifier
      prompt: "What is your collection job ID? You can type the job ID, or type 'latest' to check your most recent collection."
      entity: StringPrebuiltEntity

    - kind: ConditionGroup
      id: resolveJobId
      conditions:
        - id: isLatest
          condition: =Topic.varJobIdentifier = "latest"
          actions:
            - kind: SetVariable
              id: useGlobalJobId
              variable: Topic.varJobIdentifier
              value: =Global.varCollectionJobId
      elseActions: []

    - kind: SendMessage
      id: flowPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Check Collection Job Status flow. Map input: job_id -> Topic.varJobIdentifier."

    - kind: SendMessage
      id: statusDisplay
      message: |-
        Checking status for job: {Topic.varJobIdentifier}

        After the flow is connected, this will show:
        - Current status (completed/running/failed)
        - Files generated
        - Download links

    - kind: SendMessage
      id: nextSteps
      message: |-
        What would you like to do next?
        - Type "export results" to download your collected data
        - Type "collect data" to start a new collection
        - Type "choose source" to get subreddit recommendations

    - kind: EndDialog
      id: endStatus
```

---

# PHASE 8: Check Collection Job Status -- FLOW BUILD (action-by-action)

This flow queries SharePoint for the collection session folder and its files to determine the job status. Since we save files to SharePoint during collection, the presence and content of files indicates completion status.

## Step 8.1: Create the Flow

WHERE AM I?: Power Automate > make.powerautomate.com > Solutions > Social Data Collector Solution

1. In your solution, click + New, then Automation, then Cloud flow, then Instant.

2. Flow name: Check Collection Job Status

3. Trigger: Run a flow from Copilot (or "When an agent calls the flow").

4. Click Create.

## Step 8.2: Configure Trigger Input

WHERE AM I?: Power Automate > Check Collection Job Status Flow > Designer

1. Click the trigger to expand it.

2. Click + Add an input, then Text.
   - Input name: job_id
   - Description: Unique job identifier from a previous collection request

## Step 8.3: Build the Status Check Actions

WHERE AM I?: Power Automate > Check Collection Job Status Flow > Designer

**Action 1 -- Initialize Status Variable:**

1. Click + then Add an action. Search for "Initialize variable" and select it.

2. Fill in:
   - Name: varStatus
   - Type: String
   - Value: unknown

3. Rename to: Init_Status

**Action 2 -- Initialize Files Variable:**

4. Click + then Add an action. Search for "Initialize variable" and select it.

5. Fill in:
   - Name: varFiles
   - Type: String
   - Value: []

6. Rename to: Init_Files

**Action 3 -- List Files in Session Folder:**

7. Click + then Add an action. Search for "Get files (properties only)" and select it (under "SharePoint").

8. Configure:
   - Site Address: Select your SharePoint ResearchHub site.
   - Library Name: Select Shared Documents (or Documents).
   - Folder: Click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `concat('/Shared Documents/Collections/', triggerBody()?['job_id'])`

9. Click OK.

10. Rename to: List_Session_Files

**Action 4 -- Check if Files Exist:**

11. Click + then Add an action. Search for "Condition" and select Condition.

12. Configure: Left side = click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `length(body('List_Session_Files')?['value'])`

13. Operator = is greater than. Right side = 0.

14. Rename to: Check_Files_Exist

**Inside the Yes branch (files exist -- collection completed):**

15. Click + then Add an action. Search for "Set variable" and select it.

16. Fill in:
    - Name: varStatus
    - Value: completed

17. Rename to: Set_Status_Completed

18. Click + then Add an action. Search for "Select" and select Select (under "Data Operations").

19. Configure:
    - From: Click the lightning bolt icon, then under List_Session_Files, select value (the array of files).
    - Map mode: Click the toggle to switch to Map mode.
    - Map: Click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `json(concat('{"name":"', item()?['{FilenameWithExtension}'], '","url":"', item()?['{Link}'], '","size":', string(item()?['{FileSizeDisplay}']), '}'))`

20. Click OK.

21. Rename to: Build_File_List

22. Click + then Add an action. Search for "Set variable" and select it.

23. Fill in:
    - Name: varFiles
    - Value: Click the Expression tab (fx) and paste: `string(body('Build_File_List'))`

24. Rename to: Set_Files_String

**Inside the No branch (no files -- collection may be running or failed):**

25. Click + then Add an action. Search for "Set variable" and select it.

26. Fill in:
    - Name: varStatus
    - Value: Type: not_found

27. Rename to: Set_Status_Not_Found

**After the condition (both branches merge):**

**Action 5 -- Respond to Agent:**

28. Click + then Add an action. Search for "Respond to Copilot" and select it.

29. Click + Add an output six times:

**Output 1:**
- Type: Text
- Name: status
- Value: Click the lightning bolt icon, then select varStatus.

**Output 2:**
- Type: Text
- Name: progress
- Value: Click the Expression tab (fx) and paste: `if(equals(variables('varStatus'), 'completed'), '100', '0')`

**Output 3:**
- Type: Text
- Name: total_items
- Value: Type: 0

**Output 4:**
- Type: Text
- Name: collected_items
- Value: Type: 0

**Output 5:**
- Type: Text
- Name: files
- Value: Click the lightning bolt icon, then select varFiles.

**Output 6:**
- Type: Text
- Name: error_message
- Value: Click the Expression tab (fx) and paste: `if(equals(variables('varStatus'), 'not_found'), concat('No files found for job ID: ', triggerBody()?['job_id'], '. The collection may still be running or the job ID may be incorrect.'), '')`

30. Click (...) on the Respond to Copilot action, then Settings, then Networking, then verify Asynchronous Response is Off.

31. Click Save.

## Step 8.4: Connect the Flow to the Collection Status Topic

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Collection Status

1. Navigate back to Copilot Studio and open the Collection Status topic.

2. Find the placeholder Message node from Step 7.5.

3. Delete the placeholder. Click + then Add a tool. Find Check Collection Job Status and select it.

4. Map the input:
   - job_id: Select Topic.varJobIdentifier

5. Map the outputs:
   - status: Create new variable Topic.varJobStatus
   - progress: Create new variable Topic.varJobProgress
   - total_items: Create new variable Topic.varTotalItems
   - collected_items: Create new variable Topic.varCollectedItems
   - files: Create new variable Topic.varFilesList
   - error_message: Create new variable Topic.varErrorMsg

6. Update the status display Message node to use the real variables:

```
Collection Job Status:
- Job ID: {Topic.varJobIdentifier}
- Status: {Topic.varJobStatus}
- Progress: {Topic.varJobProgress}%

Files: {Topic.varFilesList}

{Topic.varErrorMsg}
```

7. Click Save.

## Step 8.5: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Init_Status | Initialize variable | String, "unknown" |
| 2 | Init_Files | Initialize variable | String, "[]" |
| 3 | List_Session_Files | Get files (SharePoint) | /Collections/{job_id}/ |
| 4 | Check_Files_Exist | Condition | length(files) > 0 |
| 5 | Set_Status_Completed | Set variable | varStatus = "completed" |
| 6 | Build_File_List | Select | Map files to {name, url, size} JSON |
| 7 | Set_Files_String | Set variable | varFiles = stringified file list |
| 8 | Set_Status_Not_Found | Set variable | varStatus = "not_found" |
| 9 | Respond_To_Agent | Respond to Copilot | 6 outputs |

---

# PHASE 9: Register Check Collection Job Status -- TOOL REGISTRATION

## Step 9.1: Register the Check Collection Job Status Flow as a Tool

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview > Tools

1. On the Overview page, find the Tools section. Click Add a tool.

2. Click Power Automate flows (or Flows).

3. Find Check Collection Job Status in the list. Click it, then click Add and configure.

4. Configure:
   - Name: Check Collection Job Status
   - Description: Queries the status of a collection job by job ID. Returns progress, file list, and error information. Call this tool when the user asks about collection progress, completion status, or wants to know if their data is ready.

5. Under Inputs, verify: job_id (String).

6. Under Completion, select "Don't respond (default)".

7. Click Save.

> **VERIFY**: The Tools section should now show two tools: Collect Reddit Data and Check Collection Job Status.

---

# PHASE 10: Export Results -- TOPIC BUILD (node-by-node: 7 nodes)

This topic helps users download and share their collected data by retrieving file links from SharePoint.

## Step 10.1: Create the Topic and Set Trigger Phrases

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Custom > + Add a topic > From blank

1. Click Topics, then Custom, then + Add a topic, then From blank.

2. Rename to: Export Results

3. Set Description to: User wants to download, view, or share collected data results. Route here when the user asks for output files, wants to export data, needs SharePoint links, or wants to preview collected data. Does NOT handle new data collection requests.

4. Add trigger phrases:
   - export results
   - download data
   - get JSON file
   - share results
   - view collected data
   - export to SharePoint
   - download all files
   - get my data
   - download collection results

## Step 10.2: Node 1 -- Export Options Overview (Message)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Export Results > Canvas

1. Click + below the Trigger node. Select Send a message.

2. Type:

```
Here are the available export formats for your collected data:

JSON Data (auto-generated): Complete structured dataset with all collected fields and metadata. Single file containing the full collection with source info, timestamps, and item array. Ideal for programmatic analysis or import into other tools.

All JSON files are automatically generated when a collection completes and saved to the SharePoint ResearchHub library under /Collections/{job_id}/.

Let me look up your collection files.
```

3. Click Save.

## Step 10.3: Node 2 -- Ask for Job ID (Question)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Export Results > Canvas

1. Click + below the message. Select Ask a question.

2. Type: Which collection job would you like to export? Enter the job ID, or type "latest" for your most recent collection.

3. Under Identify, select User's entire response.

4. Click the output variable. Name it: varExportJobId. Scope: Topic.

5. Click Save.

## Step 10.4: Node 3 -- Resolve Job ID (Condition)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Export Results > Canvas

1. Click + below the question. Select Add a condition, then Condition.

2. Configure: Variable = Topic.varExportJobId. Operator = is equal to. Value = latest

3. In the Yes branch, click + then Variable management, then Set a variable value.
   - Set variable: Topic.varExportJobId
   - To value: Select Global.varCollectionJobId

4. Click Save.

## Step 10.5: Node 4 -- Retrieve Export Links (Action -- Call Flow)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Export Results > Canvas

We reuse the Check Collection Job Status flow to get the file list.

1. After the condition (where both branches merge), click +.

2. Click Add a tool. Find Check Collection Job Status and select it.

3. Map the input:
   - job_id: Select Topic.varExportJobId

4. Map the outputs:
   - status: Create new variable Topic.varExportStatus
   - files: Create new variable Topic.varExportFiles
   - error_message: Create new variable Topic.varExportError

5. Click Save.

## Step 10.6: Node 5 -- Check if Files Available (Condition)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Export Results > Canvas

1. Click + below the Action node. Select Add a condition, then Condition.

2. Configure: Variable = Topic.varExportStatus. Operator = is equal to. Value = completed

3. In the No branch, add a Message node:

```
No files found for this job ID. The collection may still be running, or the job ID may be incorrect.

- Type "check status" to monitor an active collection
- Type "collect data" to start a new collection
```

Then add End current topic.

4. Click Save.

## Step 10.7: Node 6 -- Display Export Results Card (Adaptive Card)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Export Results > Canvas

1. In the Yes branch (files available), click +. Select Send a message.

2. Click the message area. We will use a text-based display since the file URLs are dynamic:

```
Your collection data is ready for download.

Job ID: {Topic.varExportJobId}
Status: {Topic.varExportStatus}

Files available in SharePoint:
{Topic.varExportFiles}

To access your files directly, open SharePoint and navigate to:
Documents > Collections > {Topic.varExportJobId}

The JSON file contains the complete structured dataset with all post data, comments, scores, and metadata.
```

3. Click Save.

## Step 10.8: Node 7 -- Export Complete Confirmation (Message)

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Topics > Export Results > Canvas

1. Click + below the results display. Select Send a message.

2. Type:

```
All files are stored in the SharePoint ResearchHub document library under /Collections/{Topic.varExportJobId}/. File naming convention: {job_id}_reddit_{subreddit}_data_complete.json for the JSON dataset.

What would you like to do next?
- Type "collect data" to start a new collection
- Type "choose source" to get subreddit recommendations
```

3. Click Save.

## Step 10.9: Complete YAML for Export Results Topic

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Export Results
    triggerQueries:
      - export results
      - download data
      - get JSON file
      - share results
      - view collected data
      - export to SharePoint
      - download all files
      - get my data
      - download collection results
  actions:
    - kind: SendMessage
      id: exportOverview
      message: |-
        Here are the available export formats for your collected data:

        JSON Data (auto-generated): Complete structured dataset with all collected fields and metadata. Single file containing the full collection with source info, timestamps, and item array.

        All JSON files are saved to the SharePoint ResearchHub library under /Collections/{job_id}/.

        Let me look up your collection files.

    - kind: Question
      id: askExportJobId
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varExportJobId
      prompt: "Which collection job would you like to export? Enter the job ID, or type 'latest' for your most recent collection."
      entity: StringPrebuiltEntity

    - kind: ConditionGroup
      id: resolveExportJobId
      conditions:
        - id: isLatest
          condition: =Topic.varExportJobId = "latest"
          actions:
            - kind: SetVariable
              id: useGlobalJobId
              variable: Topic.varExportJobId
              value: =Global.varCollectionJobId
      elseActions: []

    - kind: SendMessage
      id: flowPlaceholder
      message: "[ACTION PLACEHOLDER] Replace this node with an Action node that calls the Check Collection Job Status flow. Map input: job_id -> Topic.varExportJobId."

    - kind: ConditionGroup
      id: checkFilesAvailable
      conditions:
        - id: isCompleted
          condition: =Topic.varExportStatus = "completed"
          actions:
            - kind: SendMessage
              id: displayResults
              message: |-
                Your collection data is ready for download.

                Job ID: {Topic.varExportJobId}
                Status: {Topic.varExportStatus}

                Files available in SharePoint:
                {Topic.varExportFiles}

                Navigate to: Documents > Collections > {Topic.varExportJobId}
      elseActions:
        - kind: SendMessage
          id: noFiles
          message: |-
            No files found for this job ID. The collection may still be running, or the job ID may be incorrect.

            - Type "check status" to monitor an active collection
            - Type "collect data" to start a new collection
        - kind: EndDialog
          id: endNoFiles

    - kind: SendMessage
      id: exportConfirmation
      message: |-
        All files are stored in the SharePoint ResearchHub document library under /Collections/{Topic.varExportJobId}/.

        What would you like to do next?
        - Type "collect data" to start a new collection
        - Type "choose source" to get subreddit recommendations

    - kind: EndDialog
      id: endExport
```

---

# PHASE 11: Collect TrustPilot Reviews -- FLOW BUILD (action-by-action)

> **CRITICAL**: TrustPilot does NOT have an official public API for review scraping. The original IA service used Python BeautifulSoup to scrape TrustPilot web pages. Power Automate's HTTP connector CAN fetch web pages, but parsing HTML without BeautifulSoup is extremely difficult and fragile. This phase documents the architectural pattern for completeness, but the flow will NOT work reliably without an external parsing service.

> **WATCH OUT**: If you need TrustPilot data collection in production, consider: (1) deploying an Azure Function that runs BeautifulSoup and exposes a REST API, then calling that from Power Automate, or (2) using a third-party API service like Apify or ScrapingBee that provides structured TrustPilot data.

## Step 11.1: Create the Flow Shell

WHERE AM I?: Power Automate > make.powerautomate.com > Solutions > Social Data Collector Solution

1. In your solution, click + New, then Automation, then Cloud flow, then Instant.

2. Flow name: Collect TrustPilot Reviews

3. Trigger: Run a flow from Copilot.

4. Click Create.

## Step 11.2: Configure Trigger Inputs

WHERE AM I?: Power Automate > Collect TrustPilot Reviews Flow > Designer

1. Click the trigger to expand it. Add four inputs:

**Input 1:**
- Type: Text
- Name: company_domain
- Description: TrustPilot company domain URL or name (e.g., amazon.com)

**Input 2:**
- Type: Number
- Name: max_reviews
- Description: Maximum number of reviews to collect (10-1000, default 100)

**Input 3:**
- Type: Number
- Name: min_rating
- Description: Minimum star rating filter 1-5 (default 1 = all reviews)

**Input 4:**
- Type: Text
- Name: sort_by
- Description: Sort order: recency (default) or rating

## Step 11.3: Build the Flow Actions

WHERE AM I?: Power Automate > Collect TrustPilot Reviews Flow > Designer

**Action 1 -- Initialize Variables:**

1. Add Initialize variable: Name = varSessionId, Type = String, Value = (empty). Rename to Init_Session_Id.

2. Add Initialize variable: Name = varReviewsArray, Type = Array, Value = []. Rename to Init_Reviews_Array.

3. Add Initialize variable: Name = varReviewCount, Type = Integer, Value = 0. Rename to Init_Review_Count.

**Action 2 -- Generate Session ID:**

4. Add Compose. Expression: `concat('SDC_TP_', formatDateTime(utcNow(), 'yyyyMMddHHmmss'), '_', guid())`. Rename to Generate_Session_Id.

5. Add Set variable: varSessionId = outputs from Generate_Session_Id. Rename to Set_Session_Id.

**Action 3 -- Fetch TrustPilot Page (HTTP GET):**

> **WATCH OUT**: This is where the pattern breaks down. TrustPilot pages return HTML, not JSON. Without a server-side HTML parser, we cannot reliably extract review data.

6. Add HTTP action:
   - Method: GET
   - URI: Click the Expression tab (fx) and paste:

> **COPY-PASTE** into the Expression field:
> `concat('https://www.trustpilot.com/review/', triggerBody()?['company_domain'], '?sort=', triggerBody()?['sort_by'], '&stars=', string(triggerBody()?['min_rating']))`

   - Headers:
     - User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
   - Timeout: PT120S

7. Rename to: HTTP_TrustPilot_Page

**Action 4 -- Placeholder for HTML Parsing:**

8. Add Compose. In the Inputs field, type: HTML_PARSING_NOT_IMPLEMENTED - This flow requires an external HTML parsing service (Azure Function with BeautifulSoup, Apify, or similar) to extract structured review data from the TrustPilot HTML response. The HTTP_TrustPilot_Page action returns raw HTML that cannot be reliably parsed with Power Automate expressions alone.

9. Rename to: HTML_Parsing_Placeholder

**Action 5 -- Respond to Agent with Placeholder:**

10. Add Respond to Copilot with outputs:

**Output 1:** Type: Text, Name: status, Value: not_implemented

**Output 2:** Type: Text, Name: job_id, Value: Click lightning bolt > varSessionId

**Output 3:** Type: Text, Name: review_count, Value: 0

**Output 4:** Type: Text, Name: average_rating, Value: 0

**Output 5:** Type: Text, Name: sharepoint_pdf_urls, Value: TrustPilot collection requires external HTML parsing service

**Output 6:** Type: Text, Name: sharepoint_json_url, Value: Not available

**Output 7:** Type: Text, Name: pdf_file_count, Value: 0

11. Verify Asynchronous Response is Off.

12. Click Save.

## Step 11.4: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Init_Session_Id | Initialize variable | String, empty |
| 2 | Init_Reviews_Array | Initialize variable | Array, [] |
| 3 | Init_Review_Count | Initialize variable | Integer, 0 |
| 4 | Generate_Session_Id | Compose | concat('SDC_TP_', ...) |
| 5 | Set_Session_Id | Set variable | varSessionId |
| 6 | HTTP_TrustPilot_Page | HTTP | GET https://www.trustpilot.com/review/{domain} |
| 7 | HTML_Parsing_Placeholder | Compose | Not implemented notice |
| 8 | Respond_To_Agent | Respond to Copilot | 7 outputs, status = not_implemented |

---

# PHASE 12: Collect TrustPilot Reviews -- TOOL REGISTRATION

## Step 12.1: Register the Collect TrustPilot Reviews Flow as a Tool

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview > Tools

1. On the Overview page, find the Tools section. Click Add a tool.

2. Click Power Automate flows.

3. Find Collect TrustPilot Reviews. Click it, then Add and configure.

4. Configure:
   - Name: Collect TrustPilot Reviews
   - Description: Collects customer reviews from TrustPilot business pages. Currently returns not_implemented status because TrustPilot requires external HTML parsing. Call this tool when the user asks to collect TrustPilot reviews.

5. Under Inputs, verify: company_domain (String), max_reviews (Number), min_rating (Number), sort_by (String).

6. Under Completion, select "Don't respond (default)".

7. Click Save.

---

# PHASE 13: Collect Play Store Reviews -- FLOW BUILD (action-by-action)

> **CRITICAL**: Google Play Store does NOT have an official public API for review collection. The original IA service used the google-play-scraper Python library. For Power Automate, you would need a SerpAPI subscription (paid service) or an Azure Function running the scraper. This phase documents the SerpAPI pattern.

## Step 13.1: Create the Flow Shell

WHERE AM I?: Power Automate > make.powerautomate.com > Solutions > Social Data Collector Solution

1. In your solution, click + New, then Automation, then Cloud flow, then Instant.

2. Flow name: Collect Play Store Reviews

3. Trigger: Run a flow from Copilot.

4. Click Create.

## Step 13.2: Configure Trigger Inputs

WHERE AM I?: Power Automate > Collect Play Store Reviews Flow > Designer

1. Add five inputs:

**Input 1:** Type: Text, Name: app_id, Description: Google Play Store app package name (e.g., com.spotify.music)

**Input 2:** Type: Text, Name: language, Description: Language code (en, es, fr, de, etc.)

**Input 3:** Type: Text, Name: country, Description: Country code (us, gb, ca, au, etc.)

**Input 4:** Type: Text, Name: sort_by, Description: Sort order: newest, rating, or helpful

**Input 5:** Type: Number, Name: max_reviews, Description: Maximum reviews to collect (10-1000)

## Step 13.3: Build the Flow Actions

WHERE AM I?: Power Automate > Collect Play Store Reviews Flow > Designer

**Action 1 -- Initialize Variables:**

1. Add Initialize variable: Name = varSessionId, Type = String, Value = (empty). Rename to Init_Session_Id.

2. Add Initialize variable: Name = varReviewsArray, Type = Array, Value = []. Rename to Init_Reviews_Array.

3. Add Initialize variable: Name = varReviewCount, Type = Integer, Value = 0. Rename to Init_Review_Count.

**Action 2 -- Generate Session ID:**

4. Add Compose. Expression: `concat('SDC_PS_', formatDateTime(utcNow(), 'yyyyMMddHHmmss'), '_', guid())`. Rename to Generate_Session_Id.

5. Add Set variable: varSessionId = outputs from Generate_Session_Id. Rename to Set_Session_Id.

**Action 3 -- SerpAPI Call (requires subscription):**

> **WATCH OUT**: SerpAPI is a paid service (https://serpapi.com). You need a SerpAPI API key. If you do not have one, this flow will return not_implemented.

6. Add Compose. In the Inputs field, type: SERPAPI_NOT_CONFIGURED - This flow requires a SerpAPI subscription and API key to fetch Google Play Store reviews. Add environment variable nxth_SerpApiKey and configure the HTTP action below with your key.

7. Rename to: SerpAPI_Placeholder

**Action 4 -- Respond to Agent:**

8. Add Respond to Copilot with outputs:

**Output 1:** Type: Text, Name: status, Value: not_implemented

**Output 2:** Type: Text, Name: job_id, Value: Click lightning bolt > varSessionId

**Output 3:** Type: Text, Name: review_count, Value: 0

**Output 4:** Type: Text, Name: average_rating, Value: 0

**Output 5:** Type: Text, Name: sharepoint_pdf_urls, Value: Play Store collection requires SerpAPI subscription

**Output 6:** Type: Text, Name: sharepoint_json_url, Value: Not available

**Output 7:** Type: Text, Name: pdf_file_count, Value: 0

9. Verify Asynchronous Response is Off.

10. Click Save.

## Step 13.4: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Init_Session_Id | Initialize variable | String, empty |
| 2 | Init_Reviews_Array | Initialize variable | Array, [] |
| 3 | Init_Review_Count | Initialize variable | Integer, 0 |
| 4 | Generate_Session_Id | Compose | concat('SDC_PS_', ...) |
| 5 | Set_Session_Id | Set variable | varSessionId |
| 6 | SerpAPI_Placeholder | Compose | Not configured notice |
| 7 | Respond_To_Agent | Respond to Copilot | 7 outputs, status = not_implemented |

---

# PHASE 14: Collect Play Store Reviews -- TOOL REGISTRATION

## Step 14.1: Register the Collect Play Store Reviews Flow as a Tool

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview > Tools

1. On the Overview page, find the Tools section. Click Add a tool.

2. Click Power Automate flows.

3. Find Collect Play Store Reviews. Click it, then Add and configure.

4. Configure:
   - Name: Collect Play Store Reviews
   - Description: Collects app reviews from Google Play Store via SerpAPI. Currently returns not_implemented status because SerpAPI subscription is not configured. Call this tool when the user asks to collect Play Store or app reviews.

5. Under Inputs, verify: app_id (String), language (String), country (String), sort_by (String), max_reviews (Number).

6. Under Completion, select "Don't respond (default)".

7. Click Save.

> **VERIFY**: The Tools section should now show four tools: Collect Reddit Data, Check Collection Job Status, Collect TrustPilot Reviews, and Collect Play Store Reviews.

---

# PHASE 15: Publish and Deploy to Teams

This phase makes the agent available to users in Microsoft Teams.

## Step 15.1: Publish the Agent

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview

1. In Copilot Studio, click the Publish button at the top of the Overview page.

2. In the confirmation dialog, click Publish again.

3. Wait for the green "Published successfully" banner. This may take 1-2 minutes.

> **CRITICAL**: Event triggers and tool registrations only become fully active after publishing. Conversational features work in the test pane before publishing, but the full pipeline requires this step.

## Step 15.2: Deploy to Microsoft Teams

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Channels

1. After publishing, click the Channels tab in the top navigation.

2. Click the "Teams and Microsoft 365 Copilot" tile.

3. Click Add channel.

4. A panel opens. Click "See agent in Teams" -- this opens Microsoft Teams and prompts you to install the agent.

5. In Teams, click Add to install the agent in your chat.

6. To share with your team:
   - Click Availability options in the Copilot Studio channel panel, then Submit for admin approval.
   - Your Teams admin goes to Teams Admin Center, then Apps, finds your agent, and clicks Publish.
   - Optional: The admin can create an App Setup Policy to auto-install and pin the agent for specific users or groups.

## Step 15.3: Configure Email Delivery

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Overview

For email delivery of collection results, the Collect Reddit Data flow can be extended with an Office 365 Outlook "Send an email (V2)" action placed after the Save_JSON_To_SharePoint action. This is optional and can be added later.

To add email delivery:

1. Open the Collect Reddit Data flow in Power Automate.

2. Before the Respond_To_Agent action, click + then Add an action.

3. Search for "Send an email (V2)" and select it (under "Office 365 Outlook").

4. Configure:
   - To: Click the Expression tab (fx) and paste: `triggerBody()?['keyword_filter']` -- actually, the flow does not have a user email input. To add email delivery, you would need to add a new trigger input called user_email (Text) and map it from the topic using System.User.Email.

> **BEGINNER TIP**: For now, skip email delivery. The primary delivery channel is Teams (where the agent presents results directly in the chat) and SharePoint (where files are saved). Email can be added as an enhancement later.

---

# PHASE 16: Testing (5+ Scenarios)

## Step 16.1: Test Scenario 1 -- Basic Reddit Collection

WHERE AM I?: Copilot Studio > Social Data Collector Agent > Test Pane (bottom-right)

1. Open the test pane by clicking the Test your agent button at the bottom-right of the Copilot Studio page.

2. Click the refresh icon to start a new conversation.

3. Type: collect Reddit data

4. Expected behavior:
   - The agent should trigger the Data Collection Request topic.
   - It should display the welcome message with platform options.
   - It should ask which platform (Reddit, TrustPilot, Play Store).

5. Select Reddit.

6. Expected: Agent asks for subreddit name.

7. Type: technology

8. Expected: Agent asks for time filter.

9. Select Past Month (or type "past month").

10. Expected: Agent asks for comments per post.

11. Type: 3

12. Expected: Agent asks for post count.

13. Type: 10

14. Expected: Agent displays the confirmation Adaptive Card with all parameters.

15. Select Confirm.

16. Expected: The Collect Reddit Data flow executes. After completion (may take 1-2 minutes for 10 posts with 3 comments each at 10-second delays), the agent displays the results with job ID and SharePoint link.

> **VERIFY**: Check your SharePoint /Collections/ folder for a new subfolder with the session ID. Inside should be a JSON file named like SDC_20260213143022_abc123_reddit_technology_data_complete.json.

## Step 16.2: Test Scenario 2 -- Source Selection

WHERE AM I?: Copilot Studio > Test Pane

1. Start a new conversation.

2. Type: recommend subreddits for customer experience research

3. Expected: The Source Selection topic triggers. The agent explains available platforms and asks about the research topic.

4. Type: customer experience in retail banking

5. Expected: The agent searches the Collection Templates knowledge source and returns subreddit recommendations (if you uploaded template documents). If no documents are uploaded, the agent should say it could not find relevant information.

## Step 16.3: Test Scenario 3 -- Collection Status Check

WHERE AM I?: Copilot Studio > Test Pane

1. Start a new conversation (or continue from Scenario 1).

2. Type: check status

3. Expected: The Collection Status topic triggers. The agent asks for a job ID.

4. Type: latest

5. Expected: The agent uses the Global.varCollectionJobId from the previous collection and calls the Check Collection Job Status flow. It should display the status (completed) and file list.

## Step 16.4: Test Scenario 4 -- Export Results

WHERE AM I?: Copilot Studio > Test Pane

1. Start a new conversation.

2. Type: export my data

3. Expected: The Export Results topic triggers. The agent asks for a job ID.

4. Type: latest

5. Expected: The agent retrieves file information and displays download links.

## Step 16.5: Test Scenario 5 -- Unsupported Platform Handling

WHERE AM I?: Copilot Studio > Test Pane

1. Start a new conversation.

2. Type: collect TrustPilot reviews for amazon.com

3. Expected: The Data Collection Request topic triggers. When the user selects TrustPilot, the agent should explain that TrustPilot requires an external scraping service and offer Reddit as an alternative.

## Step 16.6: Test Scenario 6 -- Edge Case -- Empty Subreddit

WHERE AM I?: Copilot Studio > Test Pane

1. Start a new conversation.

2. Type: collect Reddit data

3. When asked for subreddit, type: thissubredditdoesnotexist12345

4. Expected: The flow should execute but return 0 posts (Reddit returns an empty result for non-existent subreddits). The agent should report 0 posts collected.

---

# PHASE 17: Troubleshooting Reference

| Symptom | Resolution |
|---|---|
| Agent does not respond to any query | Verify generative orchestration is enabled (Step 1.6). Confirm the agent is published (Step 15.1). Check that at least one knowledge source is connected with a green checkmark. |
| Agent says "I could not find information" for source recommendations | Your Collection Templates SharePoint folder may be empty. Upload at least one document per industry subfolder with subreddit recommendations. Check that the knowledge source description accurately describes the content. |
| Reddit OAuth2 returns 401 Unauthorized | Your Reddit Client ID or Client Secret is incorrect. Go to https://www.reddit.com/prefs/apps and verify the credentials match what you pasted in the Compose actions. Ensure the app type is "script". |
| Reddit API returns 403 Forbidden | Your User-Agent string is missing or malformed. Reddit blocks requests without a proper User-Agent. Verify the Get_Reddit_UserAgent Compose action contains: script:SocialDataCollector:1.0 (by /u/YOUR_USERNAME). |
| Reddit API returns 429 Too Many Requests | You are hitting rate limits. Increase the Delay action from 10 seconds to 15 seconds. Reduce the number of posts or comments per post. Reddit allows approximately 60 requests per minute for OAuth2 apps. |
| Flow fails with "The expression is invalid" | You likely have a typo in a dynamic content expression. Open the failing action, check the fx expression for missing quotes, brackets, or incorrect action names. Action names in expressions must use underscores (e.g., HTTP_Reddit_Posts, not HTTP Reddit Posts). |
| SharePoint Create file fails with 404 | The session folder may not have been created. Check that the Create_Session_Folder action (Send HTTP to SharePoint) succeeded. Verify the folder path matches your SharePoint site structure. |
| Adaptive Card renders as plain text in Teams | Ensure you are using the "Ask with Adaptive Card" node (not a regular Message node with JSON). Test the card JSON at https://adaptivecards.io/designer/ before pasting. Use version 1.5 (not 1.6) for Teams compatibility. |
| Global.varCollectionJobId is empty when checking status | Confirm the variable was set as Global in the Data Collection Request topic (Step 3.10, output mapping for job_id). Verify the Conversation Start topic initializes Global.SessionId. |
| Flow exceeds 100-second timeout | Reduce max_posts to 50 or fewer. Reduce comments_per_post to 0. For larger collections, restructure the flow to respond immediately with a job_id, then continue processing asynchronously (move collection logic after the Respond to Copilot action). |
| TrustPilot or Play Store flow returns not_implemented | This is expected. These flows are architectural placeholders. TrustPilot requires an external HTML parsing service. Play Store requires a SerpAPI subscription. See the notes in Phases 11 and 13. |
| Knowledge source responses work in test chat but fail in Teams | Try importing the agent directly into Teams rather than using the Channels publish feature. Also try turning off generative orchestration temporarily to isolate the issue. |

---

# PHASE 18: Architecture Summary and Verification Checklist

## Architecture Summary

```
+------------------------------------------------------------------+
|                    SOCIAL DATA COLLECTOR                          |
|                    Copilot Studio Agent                          |
+------------------------------------------------------------------+
|                                                                  |
|  TOPICS (4)                    TOOLS (4)                        |
|  +------------------------+   +----------------------------+    |
|  | Data Collection Request|-->| Collect Reddit Data (Flow) |    |
|  | Source Selection       |   | Check Collection Status    |    |
|  | Collection Status      |-->| Collect TrustPilot (Shell) |    |
|  | Export Results         |-->| Collect Play Store (Shell)  |    |
|  +------------------------+   +----------------------------+    |
|                                                                  |
|  KNOWLEDGE (1)                 ENTITIES (1)                     |
|  +------------------------+   +----------------------------+    |
|  | Collection Templates   |   | Time Filters (Closed List) |    |
|  | (SharePoint Library)   |   | day/week/month/year/all    |    |
|  +------------------------+   +----------------------------+    |
|                                                                  |
|  GLOBAL VARIABLES (2)                                           |
|  +------------------------+                                     |
|  | Global.SessionId       |                                     |
|  | Global.varCollectionJobId |                                  |
|  +------------------------+                                     |
|                                                                  |
+------------------------------------------------------------------+
         |                    |                    |
         v                    v                    v
+----------------+  +------------------+  +------------------+
| Reddit OAuth2  |  | SharePoint       |  | Microsoft Teams  |
| API            |  | ResearchHub      |  | (Delivery)       |
| (Direct HTTP)  |  | /Collections/    |  |                  |
+----------------+  +------------------+  +------------------+

Data Flow:
User -> Teams Chat -> Agent -> Data Collection Request Topic
  -> Collect parameters (subreddit, time_filter, count, comments)
  -> Confirm via Adaptive Card
  -> Call Collect Reddit Data Flow
    -> OAuth2 authenticate with Reddit
    -> GET /r/{subreddit}/top.json
    -> For each post: GET /comments/{id}.json (with 10s delay)
    -> Build JSON dataset
    -> Save to SharePoint /Collections/{session_id}/
  -> Return results to agent
  -> Display results with SharePoint links in Teams
```

## Credit Consumption Estimate

| Action | Credits Per Use | Estimated Uses Per Collection | Subtotal |
|---|---|---|---|
| Generative answer (topic routing) | 2 | 5 (per conversation) | 10 |
| Agent action (flow call) | 5 | 2 (collect + status) | 10 |
| Agent flow actions (per 100 actions) | 13 | 1-3 (depending on post count) | 13-39 |
| Knowledge search | 2 | 1 (source selection) | 2 |
| **Total per collection session** | | | **35-61 credits** |

At $200/month for 25,000 credits, you can run approximately 400-700 collection sessions per month.

## Post-Build Verification Checklist

Check each item after completing the build:

1. [ ] Agent name is "Social Data Collector" on the Overview page
2. [ ] Agent description mentions Reddit, OAuth2, and SharePoint
3. [ ] Generative orchestration is enabled (Settings > Generative AI > Yes)
4. [ ] General knowledge is disabled (Settings > Generative AI > Off)
5. [ ] Authentication is set to "Authenticate with Microsoft"
6. [ ] Knowledge strictness is set to High
7. [ ] Collection Templates Library knowledge source shows green checkmark
8. [ ] Time Filters entity has 5 items with Smart Matching enabled
9. [ ] Data Collection Request topic has 10 nodes and 9 trigger phrases
10. [ ] Source Selection topic has 7 nodes and 9 trigger phrases
11. [ ] Collection Status topic has 6 nodes and 8 trigger phrases
12. [ ] Export Results topic has 7 nodes and 9 trigger phrases
13. [ ] Conversation Start system topic initializes Global.SessionId
14. [ ] Fallback system topic has a custom message
15. [ ] Collect Reddit Data flow has 35 actions and 7 trigger inputs
16. [ ] Check Collection Job Status flow has 9 actions and 1 trigger input
17. [ ] All HTTP actions touching API keys have Secure Inputs and Secure Outputs enabled
18. [ ] All Respond to Copilot actions have Asynchronous Response set to Off
19. [ ] Four tools registered: Collect Reddit Data, Check Collection Job Status, Collect TrustPilot Reviews, Collect Play Store Reviews
20. [ ] Environment variables created: nxth_RedditClientId (Secret), nxth_RedditClientSecret (Secret), nxth_RedditUserAgent (Text)
21. [ ] SharePoint folders exist: /Collections/ and /Collection Templates/ with 7 industry subfolders
22. [ ] Agent is published (green "Published successfully" banner)
23. [ ] Agent is deployed to Teams channel
24. [ ] Test Scenario 1 (basic Reddit collection) passes end-to-end
25. [ ] Test Scenario 5 (unsupported platform) returns helpful message

---

## Conclusion

This recipe produces a functional Social Data Collector agent that authenticates with the Reddit API using OAuth2 client credentials and collects posts and comments from any public subreddit. The three most consequential design decisions are:

1. **Direct Reddit API integration via Power Automate HTTP actions** -- avoiding any dependency on external microservices or Python backends. The OAuth2 client credentials flow is implemented entirely within Power Automate using Compose actions for base64 encoding and HTTP actions for the token exchange and API calls. This keeps the architecture self-contained within the Power Platform.

2. **Honest handling of unsupported platforms** -- TrustPilot and Google Play Store are documented as architectural shells rather than pretending they work. TrustPilot requires server-side HTML parsing (BeautifulSoup) that Power Automate cannot do natively. Play Store requires a paid SerpAPI subscription. Both flows return "not_implemented" status with clear guidance on what external services are needed to enable them.

3. **Session-based file organization in SharePoint** -- every collection generates a unique session ID and saves all output files to a dedicated subfolder under /Collections/{session_id}/. This makes it trivial to look up, export, and share collection results, and prevents file naming collisions across multiple concurrent collections.

The 10-second rate limit delay between Reddit comment fetches is the primary constraint on collection speed. A 100-post collection with 5 comments each requires approximately 17 minutes of API time. For larger collections, the flow should be restructured to respond immediately with a job ID and continue processing asynchronously (actions placed after the Respond to Copilot action can run for up to 30 days). The Check Collection Job Status flow then polls SharePoint for completion, enabling a non-blocking user experience.