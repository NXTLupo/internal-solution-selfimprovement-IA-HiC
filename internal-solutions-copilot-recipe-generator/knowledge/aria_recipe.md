Industry Research Agent -- Definitive Build Recipe for Copilot Studio 
This recipe walks you through every click, field, toggle, and configuration needed to 
build an autonomous Industry Research Agent in Microsoft Copilot Studio. The agent 
ingests documents from SharePoint, analyzes them with user-selected reasoning 
models (Claude 4.5 Sonnet as default, GPT-5.2, or Gemini 3 Pro), generates 
professional infographics via Nano Banana Pro, routes drafts through a human 
reviewer, and delivers polished reports by email, Teams, and SharePoint. The agent 
persona is a deterministic, jargon-free industry analyst that never fabricates 
information. Written for absolute beginners in Copilot Studio -- no step is assumed. 
 
Prerequisites -- What you need before starting 
Before you begin building, confirm you have the following: 
1. A Microsoft 365 work or school account with a license that includes Copilot 
Studio (typically Microsoft 365 E3/E5 or a standalone Copilot Studio license). If 
you're not sure, ask your IT admin. 
2. Access to Power Automate at https://make.powerautomate.com -- sign in and 
confirm you can see the home page. 
3. Access to Power Apps maker portal at https://make.powerapps.com -- sign in 
and confirm you can see the home page. 
4. A SharePoint site where you can create document libraries and folders. You 
need at least "Edit" permissions on this site. 
5. API keys for the three reasoning models (you said you have these in an .env file): 
- 
Anthropic API key (for Claude 4.5 Sonnet) -- starts with sk-ant-... 
- 
OpenAI API key (for GPT-5.2) -- starts with sk-... 
- 
Google Gemini API key (for Gemini 3 Pro / Nano Banana Pro) -- get 
from https://aistudio.google.com -> API keys 
6. Microsoft Teams installed (desktop or web) for testing the agent. 
7. Microsoft Word desktop application (not Word Online) -- needed to create the 
report template with content controls. 
 


Phase 1 -- Prepare SharePoint folder structure 
We set up SharePoint first because the agent needs to reference these folders during 
configuration. 
Step 1: Create the SharePoint document libraries and folders 
1. Open your browser and navigate to your SharePoint site 
(e.g., https://yourcompany.sharepoint.com/sites/Research). 
2. In the left navigation, click Documents (or Shared Documents) to open the 
default document library. 
3. Click + New -> Folder. Name it Research Documents. Click Create. This is where 
you and your team will upload source documents for analysis. 
4. Inside Research Documents, click + New -> Folder. Name it Inbox. Click Create. 
This subfolder is the trigger point -- any file uploaded here will automatically 
kick off an analysis. 
5. Go back to the root of the Documents library. Create these additional folders by 
repeating + New -> Folder for each: 
- 
PDF Output -- where completed PDF reports will be saved 
- 
JSON Output -- where structured JSON report files will be saved 
- 
Infographics -- where Nano Banana Pro-generated images will be saved 
- 
Drafts for Review -- where draft reports and infographics are staged for 
human review before delivery 
- 
Templates -- where the Word report template will live 
6. Copy and save the full URL of your SharePoint site (everything up to and 
including the site name, 
e.g., https://yourcompany.sharepoint.com/sites/Research). You'll need this 
multiple times throughout the recipe. 
 
Phase 2 -- Create and configure the agent in Copilot Studio 
Step 2: Sign in to Copilot Studio and create a blank agent 
1. Open your browser and navigate to https://copilotstudio.microsoft.com. 


2. Sign in with your Microsoft 365 work or school account. 
3. You'll land on the Copilot Studio home page. In the left navigation pane, 
click Agents. 
4. Click the Create blank agent button. (If you want to change advanced settings 
like the solution or schema name, click the small down arrow (v) next to the 
button and select Advanced create, then click Confirm and create. For most 
users, just clicking the main button is fine.) 
5. A new agent opens on the Overview page. This is your agent's home base -- it 
has sections for Details, Instructions, Knowledge, Tools, Suggested Prompts, 
and Channels. 
Step 3: Set the agent name, description, and icon 
1. On the Overview page, find the Details section (near the top). Click 
the Edit (pencil  ) icon. 
2. In the Name field, delete the default name and type: Industry Research Analyst 
3. In the Description field (max 1,024 characters), paste: 
Autonomous industry research agent that analyzes uploaded documents from 
SharePoint, 
generates structured reports with professional infographics, and delivers findings 
via email and Teams. Supports multi-model reasoning with Claude 4.5 Sonnet 
(default), 
GPT-5.2, and Gemini 3 Pro. Reports include detailed citations to source documents. 
4. To change the agent's icon: click the agent icon in the top-left area of the page -> 
click Change icon -> upload a 192 x 192 pixel PNG image (max 72 KB). Use a 
professional icon that represents an analyst or research function. 
5. Click Save at the top of the page. Wait for the green "Saved successfully" 
banner. 
Step 4: Enable generative orchestration 
1. Still in the Details section of the Overview page, look for the Orchestration area. 
2. Find the toggle labeled "Use generative AI to determine how best to respond to 
users and events". 


3. Make sure this is set to Yes (toggled on). New agents usually default to this, but 
verify it. 
4. What this does: Instead of requiring you to manually define exact trigger 
phrases for every possible user question, generative orchestration uses an AI 
planner to dynamically decide which topics, tools, and knowledge sources to 
use for each request. This is essential for an agent that needs to handle open-
ended research queries. 
Step 5: Write the agent instructions 
1. On the Overview page, find the Instructions section. Click Edit. 
2. You'll see a large text field (max 8,000 characters). Delete any default text and 
paste the following: 
[PERSONA] 
You are a senior industry research analyst working for NXT Humans. Your tone is 
professional, concise, and jargon-free. You deliver deterministic, evidence-based 
analyses -- never speculate, never hallucinate, never fabricate data. When uncertain 
about a claim, state so explicitly and cite the gap. 
 
[CHAIN-OF-THOUGHT REASONING] 
For every research request, reason step-by-step before responding: 
1. Identify the industry, sector, and geographic scope of the request. 
2. Retrieve relevant documents from the connected SharePoint knowledge sources. 
3. Extract key data points: market size, growth rates, competitive landscape, 
   regulatory factors, technology trends, and consumer behavior. 
4. Synthesize findings into a structured report with these sections: 
   Executive Summary, Market Overview, Competitive Analysis, Trends & Drivers, 
   Risk Factors, and Outlook. 
5. Include precise citations for every factual claim: document name, author, 
   date, and page or section number. 


 
[OUTPUT FORMAT] 
When producing a research report, return a structured JSON object with these keys: 
- title (string): report title 
- date (string): generation date in YYYY-MM-DD format 
- sections (array): each item has {heading, content, citations} 
- citations (array in each section): each has {source, author, date, page} 
- metadata: {model_used, processing_time_seconds, document_count, query} 
 
The downstream Power Automate pipeline will convert this JSON into a branded PDF 
with infographics. Always output valid JSON -- no markdown, no extra text outside 
the JSON structure when generating a report. 
 
[CONSTRAINTS] 
- Only answer questions related to industry research and market analysis. 
- Cite every factual claim with its source document, author, and date. 
- If no relevant knowledge source is found, respond: "I could not find sufficient 
  data in the Research Documents library to answer this question. Please upload 
  relevant documents to the Inbox folder or refine your query." 
- Never provide financial advice, investment recommendations, or legal opinions. 
- When the user says "generate report" or "perform research on," always invoke 
  the full report pipeline: reasoning -> infographic generation -> human review -> 
  PDF delivery. 
 
[FEW-SHOT EXAMPLE] 
User: "Analyze the European EV battery market" 


Expected output: 
{ 
  "title": "European EV Battery Market Analysis", 
  "date": "2026-02-13", 
  "sections": [ 
    { 
      "heading": "Executive Summary", 
      "content": "The European EV battery market reached EUR 48.2 billion in 2025, 
      growing at a CAGR of 26.3% since 2021...", 
      "citations": [ 
        {"source": "BloombergNEF Battery Report Q4 2025", "author": "J. Smith", 
         "date": "2025-12-01", "page": "12"} 
      ] 
    } 
  ], 
  "metadata": { 
    "model_used": "claude-sonnet-4-5", 
    "processing_time_seconds": 14, 
    "document_count": 7, 
    "query": "European EV battery market analysis" 
  } 
} 
3. Click Save at the top of the page. 
Step 6: Disable general knowledge 
1. Click the Settings gear icon ( ) at the very top of the Copilot Studio page (not 
the Details section -- the gear icon in the top navigation bar). 


2. In the settings panel, click Generative AI in the left menu. 
3. Find the toggle "Allow the AI to use its own general knowledge" and set it to Off. 
4. What this does: Forces the agent to answer exclusively from your SharePoint 
documents. This prevents the agent from making up plausible-sounding claims 
from its training data. 
5. Click Save and close the settings panel. 
Step 7: Configure system topics 
1. Click the Topics tab in the top navigation bar of Copilot Studio. 
2. You'll see two subtabs: Custom and System. Click the System subtab. 
3. You'll see a list of system topics. Configure each one: 
Conversation Start: 4. Click Conversation Start to open the topic authoring canvas. 5. 
You'll see a trigger node ("Conversation Start") connected to a Message node. Click 
the Message node. 6. Delete the default message text. Replace it with: 
Welcome. I am your Industry Research Analyst, built by NXT Humans. 
 
-> Upload documents to the Research Documents Inbox folder in SharePoint, or ask 
  me to analyze an industry topic. 
-> Type "select model" to choose your preferred AI reasoning model. 
-> Type "help" for a list of available commands. 
 
Your current model: Claude 4.5 Sonnet (default). 
7. Click Save at the top. 
Fallback: 8. Go back to Topics -> System and click Fallback. 9. Click the Message node 
and replace the text with: 
I didn't understand that request. I can help with: 
-> Industry research and market analysis 
-> Document analysis from the Research Documents library 


-> Generating research reports with infographics 
 
Please rephrase your question, or type "help" for available commands. 
10. Click Save. 
On Error: 11. Click On Error in the system topics list. Keep the default configuration -- 
it displays the error code, conversation ID, and timestamp, which you'll need for 
troubleshooting. 
End of Conversation: 12. Click End of Conversation. Toggle the satisfaction 
survey to On so you can collect feedback on report quality. 13. Click Save. 
 
Phase 3 -- Connect SharePoint knowledge sources 
Step 8: Add your SharePoint document library as a knowledge source 
1. Navigate back to the Overview page of your agent (click the agent name in the 
breadcrumb at the top). 
2. Find the Knowledge section and click Add knowledge. 
3. A panel opens showing knowledge source options. Under Featured, 
click SharePoint. 
4. In the SharePoint URL field, paste the URL of your SharePoint site. For 
example: https://yourcompany.sharepoint.com/sites/Research 
5. Press Enter or click the + button. The URL appears as a tag below the field. 
6. To add additional SharePoint URLs: click in the field again, paste another URL, 
and press Enter. You can add up to 4 URLs. Add any other SharePoint sites that 
contain research documents. 
7. Below the URLs, you'll see two fields: 
- 
Name: Type Research Documents Library 
- 
Description: This is critical for retrieval quality. Paste: 
Contains industry reports, market analyses, competitive intelligence documents, 
financial filings, earnings transcripts, analyst notes, regulatory filings, and 


research papers. Covers technology, healthcare, financial services, retail, and 
higher education sectors across North America and Europe. File formats include PDF, 
DOCX, XLSX, PPTX, TXT, and HTML. Date range: 2020-2026. Key terminology includes 
TAM, SAM, SOM, CAGR, market penetration, regulatory landscape, competitive 
positioning, and market share. 
8. Click Add to agent. 
9. You'll see the knowledge source appear in the Knowledge section with a green 
checkmark. If you see a yellow warning, click it to read the issue (usually a 
permissions problem). 
Step 9: Configure knowledge behavior settings 
1. Click the Settings gear icon ( ) in the top navigation bar. 
2. Click Generative AI in the left menu. 
3. Under "How should your agent interact with knowledge sources", 
select High strictness. This ensures the agent only answers from your 
documents and doesn't fill gaps with guesses. 
4. Click Save and close the settings panel. 
 
Phase 4 -- Store API keys and create environment variables 
Before we build the Power Automate flows, we need to store the API keys from 
your .env file in a place where the flows can access them securely. 
Step 10: Create a Power Platform solution 
1. Open a new browser tab and navigate to https://make.powerapps.com. 
2. Sign in with the same Microsoft 365 account. 
3. Important: In the top-right corner, check the Environment dropdown. Make sure 
you're in the same environment where your Copilot Studio agent lives. If you're 
not sure, it's usually called "Default" or your organization's name. 
4. In the left navigation, click Solutions. 
5. Click + New solution. 


6. Fill in: 
- 
Display name: Industry Research Agent Solution 
- 
Publisher: Select the default publisher (or create one -- click + New 
publisher, set Name to NXTHumans, Prefix to nxth, then click Save). 
- 
Leave Version as 1.0.0.0. 
7. Click Create. The solution opens. 
Step 11: Create environment variables for API keys 
We'll create one environment variable for each API key and one for each API endpoint 
-- 6 variables total. 
Variable 1 -- Anthropic API Key: 
1. Inside your solution, click Add (the button at the top) -> More -> Environment 
variable. 
2. Fill in: 
- 
Display name: Anthropic API Key 
- 
Name: This auto-fills as nxth_AnthropicAPIKey (based on your publisher 
prefix). That's fine. 
- 
Data type: Select Text 
- 
Current value: Click Add next to "Current value" -> paste your Anthropic 
API key from your .env file (the one starting with sk-ant-...) -> click Save. 
3. Click Save at the bottom of the panel. 
Variable 2 -- OpenAI API Key: 4. Click Add -> More -> Environment variable again. 5. Fill 
in: 
- 
Display name: OpenAI API Key 
- 
Data type: Text 
- 
Current value: Paste your OpenAI API key -> click Save. 
6. Click Save. 
Variable 3 -- Gemini API Key: 7. Repeat: Add -> More -> Environment variable. 8. Fill in: 
- 
Display name: Gemini API Key 


- 
Data type: Text 
- 
Current value: Paste your Google Gemini API key -> click Save. 
9. Click Save. 
Variable 4 -- Anthropic Endpoint: 10. Repeat: Add -> More -> Environment variable. 11. 
Fill in: - Display name: Anthropic Endpoint - Data type: Text - Current 
value: https://api.anthropic.com/v1/messages 12. Click Save. 
Variable 5 -- OpenAI Endpoint: 13. Repeat: Add -> More -> Environment variable. 14. Fill 
in: - Display name: OpenAI Endpoint - Data type: Text - Current 
value: https://api.openai.com/v1/chat/completions (or your Azure OpenAI endpoint if 
you're using Azure-hosted OpenAI) 15. Click Save. 
Variable 6 -- Gemini Endpoint: 16. Repeat: Add -> More -> Environment variable. 17. Fill 
in: - Display name: Gemini Endpoint - Data type: Text - Current 
value: https://generativelanguage.googleapis.com/v1beta/models/gemini-3-
pro:generateContent 18. Click Save. 
You should now see 6 environment variables listed in your solution. These are stored 
in Dataverse and can be referenced by any Power Automate flow in this solution. 
Step 12: Understand the security trade-off 
Important: Environment variables of type "Text" store values as plain text in 
Dataverse. This means anyone with a Maker or Admin role in your Power Platform 
environment can read these values. To keep them safe: 
- 
In every Power Automate flow that uses a key, you must enable Secure 
Inputs and Secure Outputs on any action that touches the key (instructions 
included in every flow step below). 
- 
Never share your solution with people who shouldn't have access to these keys. 
- 
When your IT admin can provision Azure Key Vault, migrate the keys there for 
encrypted-at-rest storage. 
 
Phase 5 -- Build the model-selection topic in Copilot Studio 
Before building the Power Automate flows, we need the model-selection interface 
inside the agent so the user can choose which AI model to use. 
Step 13: Create a global variable for model choice 


1. Go back to your Copilot Studio tab (https://copilotstudio.microsoft.com). 
2. Open your Industry Research Analyst agent. 
3. Click the Topics tab -> Custom subtab -> click + Add a topic -> From blank. 
4. At the top of the canvas, click the topic name (it says "Untitled") and rename it 
to: Model Selection 
5. Click the Description field below the name. Type: Presents a model selection 
card to the user and stores their choice as a global variable. 
Step 14: Add trigger phrases 
1. In the Trigger node at the top of the canvas, you'll see a section 
labeled "Describe what this topic does" (or "Add trigger phrases" depending on 
your view). 
2. Click the description/trigger area and add these trigger phrases (press Enter 
after each one): 
- 
select model 
- 
change model 
- 
switch model 
- 
choose AI model 
- 
model selection 
Step 15: Add the adaptive card for model selection 
1. Click the + button below the Trigger node to add a new node. 
2. In the node menu that appears, click Ask a question. 
3. In the question node, click the three dots ((...)) at the top-right of the node -> 
select Properties. 
4. Under "Input type", change it from the default to Adaptive Card. 
5. A JSON editor opens. Delete any default content and paste this exact JSON: 
json 
{ 
  "type": "AdaptiveCard", 


  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json", 
  "version": "1.4", 
  "body": [ 
    { 
      "type": "TextBlock", 
      "text": "SELECT REASONING MODEL", 
      "weight": "Bolder", 
      "size": "Medium" 
    }, 
    { 
      "type": "TextBlock", 
      "text": "Claude 4.5 Sonnet is the default. Choose an alternative if preferred. Your 
selection applies to this session only.", 
      "wrap": true, 
      "size": "Small" 
    }, 
    { 
      "type": "Input.ChoiceSet", 
      "id": "modelChoice", 
      "label": "AI Model", 
      "style": "expanded", 
      "isRequired": true, 
      "value": "claude-sonnet-4-5", 
      "choices": [ 
        { 
          "title": "Claude 4.5 Sonnet (Default -- Anthropic)", 


          "value": "claude-sonnet-4-5" 
        }, 
        { 
          "title": "GPT-5.2 (OpenAI)", 
          "value": "gpt-5.2" 
        }, 
        { 
          "title": "Gemini 3 Pro (Google)", 
          "value": "gemini-3-pro" 
        } 
      ] 
    } 
  ], 
  "actions": [ 
    { 
      "type": "Action.Submit", 
      "title": "Confirm" 
    } 
  ] 
} 
6. Critical: The "id": "modelChoice" field in the Input.ChoiceSet is what creates 
the output variable. After pasting, click Save in the JSON editor. 
7. The adaptive card node will now show an output variable. Click the output 
variable name (it may be called modelChoice or Topic.modelChoice). 
8. In the variable properties panel that opens on the right: 


- 
Rename the variable to Global.modelChoice (or if there's 
a "Global" checkbox/toggle, check it). This makes the variable 
accessible across all topics in the agent, not just this one. 
- 
Variable type should be Text/String. 
9. If Copilot Studio doesn't let you set it as global from here, do this instead: 
- 
Click the Variables icon (x with curly braces {x}) in the top toolbar of the 
canvas. 
- 
Find modelChoice in the list. 
- 
Click it -> toggle "Global variable" to On. 
Step 16: Add a confirmation message 
1. Click the + button below the adaptive card node to add a new node. 
2. Select Send a message. 
3. In the message text, type: Model set to  
4. Then click the {x} (Insert variable) button in the message toolbar -> 
select Global.modelChoice. 
5. Continue typing after the variable: . Send me your research question or upload 
documents to the Inbox folder to begin analysis. 
6. The full message reads: Model set to {Global.modelChoice}. Send me your 
research question or upload documents to the Inbox folder to begin analysis. 
7. Click Save at the top of the canvas. 
Step 17: Set the default model value 
Since users may skip model selection, we need to ensure Global.modelChoice has a 
default value: 
1. Go back to Topics -> System -> Conversation Start. 
2. Click the + button to add a node before the greeting message. 
3. Select Variable management -> Set a variable value. 
4. In the "Set variable" node: 
- 
Variable: Click and select Global.modelChoice 


- 
Value: Type claude-sonnet-4-5 (this is the literal text string, not a variable 
reference) 
5. This ensures that if the user never selects a model, Claude 4.5 Sonnet is always 
the default. 
6. Drag the node so it comes before the greeting message node (if it isn't already). 
7. Click Save. 
 
Phase 6 -- Build the multi-model reasoning Power Automate flow 
This is the most complex flow. It receives a user's research query, sends it to the 
correct AI model based on their selection, and returns the response. Take your time 
with each sub-step. 
Step 18: Create the flow 
1. Open a new browser tab and navigate to https://make.powerautomate.com. 
2. In the left navigation, click Solutions -> open Industry Research Agent 
Solution (the one you created in Step 10). 
3. Click + New -> Automation -> Cloud flow -> Instant. 
4. In the "Build an instant cloud flow" dialog: 
- 
Flow name: Multi-Model Reasoning Engine 
- 
Choose how to trigger this flow: Scroll down and select "Run a flow from 
Copilot" (this is the Copilot Studio trigger). If you don't see this, 
select "Manually trigger a flow" -- we'll change it. 
5. Click Create. The flow editor opens. 
Step 19: Configure the trigger with input parameters 
1. If the trigger shows as "Run a flow from Copilot", click on it to expand it. 
2. If it shows a different trigger, delete it and add the correct one: click + -> search 
for "Run a flow from Copilot" -> select it. 
3. Click + Add an input inside the trigger. You need to add three text inputs: 
Input 1: 


- 
Click + Add an input -> select Text. 
- 
Input name (the label): userMessage 
- 
Description: The user's research query or instruction 
Input 2: 
- 
Click + Add an input -> select Text. 
- 
Input name: modelChoice 
- 
Description: The selected AI model identifier (claude-sonnet-4-5, gpt-5.2, or 
gemini-3-pro) 
Input 3: 
- 
Click + Add an input -> select Text. 
- 
Input name: systemPrompt 
- 
Description: The full system prompt for the AI model including persona and 
output format instructions 
Step 20: Initialize variables for the flow 
We need variables to store the AI response and track which model was used. 
1. Below the trigger, click + -> Add an action. 
2. Search for "Initialize variable" -> select Initialize variable (under "Variable" 
actions). 
3. Fill in: 
- 
Name: varAIResponse 
- 
Type: String 
- 
Value: (leave empty) 
4. Click + -> Add an action -> Initialize variable again: 
- 
Name: varModelUsed 
- 
Type: String 
- 
Value: (leave empty) 
5. Click + -> Add an action -> Initialize variable again: 


- 
Name: varTokenWarning 
- 
Type: Boolean 
- 
Value: false (click the toggle to select false) 
Step 21: Retrieve API keys from environment variables 
1. Click + -> Add an action -> search for "List rows" (Dataverse connector). STOP -- 
actually, for environment variables, the simplest approach is to 
use Compose actions with the values hardcoded, then secure them. But the 
better approach is: 
Simplified approach -- use Compose actions with your key values: 
1. Click + -> Add an action -> search for "Compose" -> select Compose (under "Data 
Operations"). 
2. In the Inputs field, paste your Anthropic API key (the literal key string from 
your .env file). 
3. Immediately secure this action: Click the three dots ((...)) on the Compose action 
-> Settings -> scroll down to Security -> toggle Secure Inputs to On -> 
toggle Secure Outputs to On -> click Done. 
4. Rename this action: click the three dots ((...)) -> Rename -> 
type Get_Anthropic_Key. 
5. Add another Compose action -> paste your OpenAI API key -> secure it (Secure 
Inputs + Secure Outputs: On) -> rename to Get_OpenAI_Key. 
6. Add another Compose action -> paste your Gemini API key -> secure it -> rename 
to Get_Gemini_Key. 
Why Compose instead of environment variables? This is the simplest approach that 
works without any additional connectors. The Secure Inputs/Outputs settings hide the 
values from flow run history. When you're ready to upgrade, replace these Compose 
actions with Dataverse lookups for your environment variables. 
Step 22: Add the Switch control for model routing 
1. Click + -> Add an action -> search for "Switch" -> select Switch (under "Control"). 
2. In the On field, click the dynamic content panel (the lightning bolt   icon) and 
select modelChoice (from the trigger inputs). 


3. The Switch action creates a default case. Click + (the plus icon on the left side 
of the Switch) to add cases. You need 3 cases plus the default: 
Case 1 -- Claude 4.5 Sonnet: 4. Click the first case. In the Equals field, type 
exactly: claude-sonnet-4-5 5. Inside this case, click + -> Add an action -> search 
for "HTTP" -> select HTTP (the premium connector with the blue globe icon). 6. 
Configure the HTTP action: 
- 
Method: Select POST from the dropdown. 
- 
URI: https://api.anthropic.com/v1/messages 
- 
Headers (click + Add new parameter -> check Headers): 
- 
Header 1: Key = x-api-key | Value = click   dynamic content -> 
under Get_Anthropic_Key, select Outputs 
- 
Header 2: Key = anthropic-version | Value = 2023-06-01 
- 
Header 3: Key = content-type | Value = application/json 
- 
Body: Click in the Body field and paste: 
json 
{ 
  "model": "claude-sonnet-4-6", 
  "max_tokens": 8192, 
  "temperature": 0.2, 
  "system": "@{triggerBody()?['text_1']}", 
  "messages": [ 
    { 
      "role": "user", 
      "content": "@{triggerBody()?['text']}" 
    } 
  ] 
} 


Important note about dynamic content in the Body: 
The @{triggerBody()?['text']} references may not work if you paste them literally. 
Instead, do this: 
- 
Type the JSON structure up to where the systemPrompt value should go. 
- 
Delete the placeholder text and click   -> select systemPrompt from the 
trigger. 
- 
Continue typing the JSON, and where the userMessage should go, click   -> 
select userMessage. 
7. Secure this action: Click (...) -> Settings -> Secure Inputs: On -> Done. 
8. Rename this action to HTTP_Claude. 
9. Below the HTTP action (still inside Case 1), click + -> Add an action -> Compose. 
10. In the Inputs field, click the Expression tab (the fx button) and paste: 
first(body('HTTP_Claude')?['content'])?['text'] 
11. Click OK. Rename this action to Extract_Claude_Response. 
12. Add another action: Set variable. 
- 
Name: Select varAIResponse 
- 
Value: Click   -> select Outputs from Extract_Claude_Response 
13. Add another action: Set variable. 
- 
Name: Select varModelUsed 
- 
Value: Type Claude 4.5 Sonnet 
14. Add a Condition action to check token usage: 
- 
Left side: Click fx (Expression) and 
paste: body('HTTP_Claude')?['usage']?['output_tokens'] 
- 
Operator: is greater than 
- 
Right side: 7500 
- 
In the Yes branch: Add Set variable -> Name: varTokenWarning -> 
Value: true (select the boolean true) 
- 
In the No branch: Leave empty. 


Case 2 -- GPT-5.2: 15. Click the + on the Switch to add a new case. In the Equals field, 
type: gpt-5.2 16. Inside this case, add an HTTP action: - Method: POST 
- URI: https://api.openai.com/v1/chat/completions - Headers: - Key = Authorization | 
Value = Type Bearer  (with the trailing space), then click   -> 
select Outputs from Get_OpenAI_Key - Key = Content-Type | Value 
= application/json - Body: 
json 
{ 
  "model": "gpt-5.2", 
  "temperature": 0.2, 
  "max_tokens": 8192, 
  "messages": [ 
    { 
      "role": "system", 
      "content": "@{triggerBody()?['systemPrompt']}" 
    }, 
    { 
      "role": "user", 
      "content": "@{triggerBody()?['userMessage']}" 
    } 
  ] 
} 
(Use the   dynamic content picker for `systemPrompt` and `userMessage` as 
described above.) 
- Secure Inputs: **On**. Rename to `HTTP_GPT`. 
17. Add Compose action -> 
Expression: first(body('HTTP_GPT')?['choices'])?['message']?['content'] -> Rename 
to Extract_GPT_Response. 18. Add Set variable: varAIResponse -> value 


from Extract_GPT_Response Outputs. 19. Add Set variable: varModelUsed -> 
value GPT-5.2. 
Case 3 -- Gemini 3 Pro: 20. Add a new case. Equals: gemini-3-pro 21. Add 
a Compose action to build the URL with the API key: - Inputs: Click fx and 
paste: concat('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-
pro:generateContent?key=', outputs('Get_Gemini_Key')) - Rename 
to Build_Gemini_URL. - Secure Inputs and Outputs: On. 
22. Add HTTP action: 
- 
Method: POST 
- 
URI: Click   -> select Outputs from Build_Gemini_URL 
- 
Headers: Content-Type -> application/json 
- 
Body: 
json 
{ 
  "system_instruction": { 
    "parts": [{"text": "@{triggerBody()?['systemPrompt']}"}] 
  }, 
  "contents": [ 
    { 
      "role": "user", 
      "parts": [{"text": "@{triggerBody()?['userMessage']}"}] 
    } 
  ], 
  "generationConfig": { 
    "temperature": 0.2, 
    "maxOutputTokens": 8192 
  } 


} 
- Secure Inputs: **On**. Rename to `HTTP_Gemini`. 
23. Add Compose -> 
Expression: body('HTTP_Gemini')?['candidates']?[0]?['content']?['parts']?[0]?['text'] -> 
Rename to Extract_Gemini_Response. 24. Add Set variable: varAIResponse -> value 
from Extract_Gemini_Response. 25. Add Set variable: varModelUsed -> value Gemini 3 
Pro. 
Default case: 26. In the Default case (for any unrecognized model value), add the same 
Claude actions from Case 1 (copy-paste or recreate). This ensures the agent always 
falls back to Claude. 
Step 23: Add the return-to-agent action 
1. Below the entire Switch control (outside and after it), click + -> Add an action. 
2. Search for "Respond to Copilot" -> select Respond to Copilot (or "Return 
value(s) to Power Virtual Agents" -- same thing, different label depending on 
your version). 
3. Click + Add an output three times to create three outputs: 
Output 1: 
- 
Type: Text 
- 
Name: aiResponse 
- 
Value: Click   -> select the variable varAIResponse 
Output 2: 
- 
Type: Text 
- 
Name: modelUsed 
- 
Value: Click   -> select varModelUsed 
Output 3: 
- 
Type: Yes/No 
- 
Name: tokenWarning 
- 
Value: Click   -> select varTokenWarning 


4. Click Save at the top of the flow editor. Wait for the green "Your flow is ready" 
banner. 
 
Phase 7 -- Build the Nano Banana Pro infographic flow 
Step 24: Create the infographic generation flow 
1. In your solution at make.powerautomate.com, click + New -> Automation -> 
Cloud flow -> Instant. 
2. Flow name: Infographic Generator - Nano Banana Pro 
3. Trigger: Run a flow from Copilot. 
4. Click Create. 
Step 25: Configure trigger inputs 
Add three text inputs to the trigger: 
1. Input 1: Name = reportContent, Description = The report text content to 
visualize as an infographic 
2. Input 2: Name = visualType, Description = The type of visual to generate (e.g., 
market share breakdown, competitive landscape, trend timeline) 
3. Input 3: Name = reportTitle, Description = The title of the report for file naming 
Step 26: Retrieve the Gemini API key 
1. Add a Compose action -> paste your Gemini API key -> Secure Inputs + 
Outputs: On -> Rename to Get_Gemini_Key. 
Step 27: Build the infographic prompt 
1. Add a Compose action. Rename it to Build_Infographic_Prompt. 
2. In the Inputs field, paste the following (use   dynamic content to 
insert reportContent and visualType where indicated): 
Generate a professional infographic with the following specifications: 
 
STYLE: Ultra-modern, minimalistic, flat design aligned with the NXT Humans brand. 
No gradients, no 3D effects, no shadows, no decorative borders, no clip art, no 


stock imagery. Use only geometric shapes, clean lines, and this exact palette: 
- Primary background: Darkest Gray (#0D0D0D) or White (#FFFFFF) depending on 
  context (dark mode preferred for hero/summary graphics, light mode for data charts) 
- Text and structural elements: White (#FFFFFF) on dark backgrounds, Darkest Gray 
  (#0D0D0D) on light backgrounds 
- Accent color for highlights, labels, and callouts: Bright Green/Chartreuse (#B8B800) 
- Secondary neutral tones: Med Gray (#4A4A4A), Light Gray (#D9D9D9) 
- NO teal, NO cyan, NO blue -- the accent is always chartreuse/bright green 
Typography must be ultra-condensed sans-serif for headlines (similar to Agency FB -- 
tall, narrow, high-impact, all-caps) and a clean geometric sans-serif (similar to 
Archivo Extra Light) for body text and labels. Extreme scale contrast between 
headlines and body text. Generous whitespace throughout. 
 
FORMAT: Horizontal layout, 1920x1080px, suitable for embedding in a professional 
PDF report or PowerPoint presentation. Leave generous whitespace. 
 
CONTENT TYPE: [INSERT visualType HERE] 
 
DATA TO VISUALIZE: 
[INSERT reportContent HERE] 
 
RULES: 
- Every data point shown must come directly from the content provided above. 
- Use precise numbers and labels -- do not approximate or invent figures. 
- Include a small source attribution line at the bottom. 
- No decorative illustrations, mascots, or filler graphics. 


- If showing comparisons, use proportionally accurate bar widths or areas. 
- If showing timelines, maintain proportional spacing between dates. 
Important: Where it says [INSERT visualType HERE], delete that placeholder text and 
click   -> select visualType from the trigger. Do the same for [INSERT reportContent 
HERE] -- delete it and click   -> select reportContent. 
Step 28: Call the Gemini API for image generation 
1. Add a Compose action to build the URL: 
- 
Expression: concat('https://generativelanguage.googleapis.com/v1beta/
models/gemini-3-pro:generateContent?key=', 
outputs('Get_Gemini_Key')) 
- 
Secure Inputs + Outputs: On. Rename to Build_Gemini_Image_URL. 
2. Add an HTTP action: 
- 
Method: POST 
- 
URI: Paste the full URL directly with your Gemini key 
hardcoded: https://generativelanguage.googleapis.com/v1beta/models/
gemini-3-pro-image-
preview:generateContent?key=YOUR_GEMINI_KEY (enable Secure 
Inputs on this action to hide the key). If you get a 403 or "model not 
found" error, use the free-tier alternative: gemini-2.5-flash-image instead 
of gemini-3-pro-image-preview in the URL. 
- 
Headers: Content-Type -> application/json 
- 
Body: 
json 
{ 
  "contents": [ 
    { 
      "role": "user", 
      "parts": [ 
        { 


          "text": "@{outputs('Build_Infographic_Prompt')}" 
        } 
      ] 
    } 
  ], 
  "generationConfig": { 
    "responseModalities": ["TEXT", "IMAGE"], 
    "temperature": 0.2, 
    "imageConfig": { 
      "aspectRatio": "16:9", 
      "imageSize": "2K" 
    } 
  } 
} 
(Use   to insert the Build_Infographic_Prompt output where indicated.) 
- 
Secure Inputs: On. Rename to HTTP_NanoBanana. 
Step 29: Extract the generated image 
1. Add a Compose action -> Expression: 
first(filter(body('HTTP_NanoBanana')?['candidates']?[0]?['content']?['parts'], 
item()?['inlineData'] ne null))?['inlineData']?['data'] 
Rename to Extract_Base64_Image. 
2. Add another Compose -> Expression: 
first(filter(body('HTTP_NanoBanana')?['candidates']?[0]?['content']?['parts'], 
item()?['inlineData'] ne null))?['inlineData']?['mimeType'] 
Rename to Extract_MIME_Type. 
Step 30: Save the infographic to SharePoint 


1. Add a SharePoint -> Create file action. 
- 
Site Address: Select your SharePoint site from the dropdown (or paste 
the URL). 
- 
Folder Path: Click the folder icon and navigate to /Shared 
Documents/Infographics (or type /Shared Documents/Infographics). 
- 
File Name: Use this expression (click fx): concat(triggerBody()?['text_2'], 
'_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), 
'_infographic.png') (Note: text_2 corresponds to the reportTitle input -- 
check the trigger's raw output names if the expression doesn't 
resolve.) Simpler alternative: Type the file name manually with a dynamic 
content insertion: click   -> select reportTitle from trigger -> then 
type _infographic.png after it. 
- 
File Content: Click fx -> 
paste: base64ToBinary(outputs('Extract_Base64_Image')) Rename this 
action to Save_Infographic_to_SharePoint. 
2. Add another SharePoint -> Create file to save a copy to the drafts review folder: 
- 
Site Address: Same site. 
- 
Folder Path: /Shared Documents/Drafts for Review 
- 
File Name: Same expression as above. 
- 
File Content: Same expression as above. Rename 
to Save_Draft_Infographic. 
Step 31: Return outputs to the agent 
1. Add Respond to Copilot with outputs: 
Output 1: 
- 
Type: Text 
- 
Name: infographicUrl 
- 
Value: Click   -> from Save_Infographic_to_SharePoint -> select File 
Path (or Link to item if available) 
Output 2: 
- 
Type: Text 


- 
Name: draftFolderUrl 
- 
Value: Type your SharePoint drafts folder URL, 
e.g., https://yourcompany.sharepoint.com/sites/Research/Shared 
Documents/Drafts for Review 
Output 3: 
- 
Type: Text 
- 
Name: status 
- 
Value: completed 
2. Click Save. 
 
Phase 8 -- Build the report generation and delivery flow (with human review) 
Step 32: Create the Word report template 
1. Open Microsoft Word on your desktop (not Word Online -- you need the 
Developer tab). 
2. Enable the Developer tab: click File -> Options -> Customize Ribbon -> check 
the Developer checkbox in the right column -> click OK. 
3. Design the report template using NXT Humans branding: 
Cover page: 
- 
Set the page background to black (#0D0D0D) (Design -> Page Color -> More 
Colors -> Custom -> R:13 G:13 B:13). 
- 
Add a large text placeholder for the report title. Use Agency FB Bold font 
(or Impact or Bebas Neue if Agency FB isn't installed), all-caps, white color, 48-
72pt. 
- 
Click Developer tab -> Plain Text Content Control (the Aa icon) to insert a 
content control for the title. Right-click the content control -> Properties -> 
set Title and Tag both to ReportTitle. 
- 
Add a subtitle for the date: Archivo Extra Light, white, 14pt. Insert another Plain 
Text Content Control with Title/Tag = GeneratedDate. 
- 
Add the NXT Humans logo image. 


- 
Add a thin chartreuse (#B8B800) horizontal line separator. 
Interior pages: 
- 
Reset page background to white. 
- 
For section headers: Agency FB Bold (or condensed sans-serif), all-caps, 24pt, 
black (#0D0D0D), with a chartreuse left border (use a table with a left column of 
4pt width filled with #B8B800). 
- 
Body text: Archivo Light, 11pt, dark gray (#333333), line spacing 1.4. 
- 
Insert a Repeating Section Content Control (Developer tab -> Repeating Section 
Content Control) around a section template that contains: 
- 
A Plain Text Content Control with Title/Tag = SectionHeading 
- 
A Rich Text Content Control with Title/Tag = SectionContent 
- 
A Plain Text Content Control with Title/Tag = CitationText 
- 
Insert Picture Content Controls (Developer tab -> Picture Content Control) 
where infographics should appear. 
- 
Add page headers: "NXT Humans | Industry Research" in Archivo Light 8pt. 
- 
Add page footers with centered page numbers. 
- 
Insert content controls for 
metadata: ModelUsed, AnalystNote, ExecutiveSummary. 
4. Save the template as IndustryReportTemplate.docx. 
5. Upload it to your SharePoint site: navigate to /Shared 
Documents/Templates/ and upload the file. 
Step 33: Create the master report generation flow 
1. In your solution, create a new flow: + New -> Automation -> Cloud flow -> Instant. 
2. Flow name: Report Generator and Delivery 
3. Trigger: Run a flow from Copilot. Click Create. 
Step 34: Configure trigger inputs 
Add these inputs to the trigger: 


1. reportJSON -- Type: Text -- Description: The full structured JSON output from 
the reasoning model 
2. infographicUrl -- Type: Text -- Description: SharePoint URL of the generated 
infographic 
3. userEmail -- Type: Text -- Description: Email address of the requesting user 
4. reportTitle -- Type: Text -- Description: Title of the report 
5. modelUsed -- Type: Text -- Description: Name of the AI model that generated 
the analysis 
Step 35: Parse the report JSON 
1. Add a Data Operations -> Parse JSON action. 
2. Content: Click   -> select reportJSON from the trigger. 
3. Schema: Click "Generate from sample" and paste a sample JSON matching 
your report structure: 
json 
{ 
  "title": "Sample Report", 
  "date": "2026-02-13", 
  "sections": [ 
    { 
      "heading": "Executive Summary", 
      "content": "Sample content here.", 
      "citations": [ 
        {"source": "Sample Report.pdf", "author": "J. Doe", "date": "2025-01-01", "page": 
"1"} 
      ] 
    } 
  ], 


  "metadata": { 
    "model_used": "claude-sonnet-4-5", 
    "processing_time_seconds": 10, 
    "document_count": 3, 
    "query": "sample query" 
  } 
} 
4. Click Done. The Parse JSON action now provides all fields as dynamic content 
in subsequent steps. 
Step 36: Human review gate -- send approval card via Teams 
This is the critical quality control step. The reviewer sees the draft analysis and 
infographics before the report is finalized and delivered. 
1. Add a Microsoft Teams -> Post adaptive card and wait for a response action. 
- 
Post as: Flow bot 
- 
Post in: Chat with Flow bot 
- 
Recipient: Click   -> select userEmail from the trigger (or type a fixed 
reviewer email address if you have a dedicated reviewer) 
- 
Adaptive Card: 
json 
{ 
  "type": "AdaptiveCard", 
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json", 
  "version": "1.2", 
  "body": [ 
    { 
      "type": "Container", 
      "style": "emphasis", 


      "items": [ 
        { 
          "type": "TextBlock", 
          "text": "REPORT REVIEW REQUIRED", 
          "weight": "Bolder", 
          "size": "Large", 
          "color": "Light" 
        } 
      ] 
    }, 
    { 
      "type": "TextBlock", 
      "text": "A draft report and infographics are ready for your review before delivery.", 
      "wrap": true 
    }, 
    { 
      "type": "FactSet", 
      "facts": [ 
        {"title": "Report", "value": "${reportTitle}"}, 
        {"title": "Model", "value": "${modelUsed}"}, 
        {"title": "Status", "value": "Awaiting your review"} 
      ] 
    }, 
    { 
      "type": "TextBlock", 


      "text": "Open the Drafts for Review folder in SharePoint to inspect the infographics 
and analysis. Then choose an action below.", 
      "wrap": true, 
      "size": "Small" 
    }, 
    { 
      "type": "Input.Text", 
      "id": "reviewNotes", 
      "placeholder": "Optional: Add revision notes if rejecting or requesting changes...", 
      "isMultiline": true 
    }, 
    { 
      "type": "Input.ChoiceSet", 
      "id": "reviewDecision", 
      "label": "Your decision", 
      "style": "expanded", 
      "isRequired": true, 
      "choices": [ 
        {"title": "Approve -- deliver the report", "value": "approved"}, 
        {"title": "Revise -- regenerate with my notes", "value": "revise"}, 
        {"title": "Reject -- discard this report", "value": "rejected"} 
      ] 
    } 
  ], 
  "actions": [ 
    { 


      "type": "Action.OpenUrl", 
      "title": "OPEN DRAFTS FOLDER", 
      "url": "https://yourcompany.sharepoint.com/sites/Research/Shared 
Documents/Drafts for Review" 
    }, 
    { 
      "type": "Action.Submit", 
      "title": "SUBMIT DECISION" 
    } 
  ] 
} 
Important: Replace ${reportTitle} and ${modelUsed} with   dynamic content from 
the trigger inputs. Replace the url in the OpenUrl action with your actual SharePoint 
Drafts folder URL. 
- 
Update message: Thank you for your review. Processing your decision... 
- 
Should update card: Yes 
2. Rename this action to Review_Approval_Card. 
Step 37: Handle the review decision 
1. Add a Switch control. 
- 
On: Click   -> from Review_Approval_Card -> select the dynamic content 
for the card output. Look 
for data.reviewDecision or body('Review_Approval_Card')?['data']?['revie
wDecision'] (use the Expression tab if needed). 
Case "approved": 2. This case continues to the PDF generation steps below (Steps 38-
42). 
Case "revise": 3. Add a Microsoft Teams -> Post message in a chat or channel action: 
- 
Recipient: same as above 


- 
Message: Your revision notes have been received. The infographics will be 
regenerated. You will receive another review card shortly. 
4. For a full implementation, you would loop back to the Infographic Generator 
flow with the reviewer's notes appended to the prompt. For this first iteration, 
add a Terminate action with Status = Cancelled and a message: Revision 
requested. Re-run the analysis with updated instructions. (You can enhance 
this with a Do Until loop in a future iteration.) 
Case "rejected": 5. Add a Microsoft Teams -> Post message to the user: The report has 
been rejected. Reviewer notes:  then click   -> select the reviewNotes output from 
the card. 6. Add a Terminate action -> Status: Cancelled. 
Step 38: Populate the Word template (inside the "approved" case) 
1. Inside the "approved" case of the Switch, add Word Online (Business) -> 
Populate a Microsoft Word template. 
2. Configure: 
- 
Location: Select your SharePoint site from the dropdown. 
- 
Document Library: Shared Documents (or whatever your library is 
named). 
- 
File: Click the folder icon and navigate 
to /Templates/IndustryReportTemplate.docx -> select it. 
3. Once selected, the action expands to show all the content controls you created 
in the template. Map each one: 
- 
ReportTitle: Click   -> select reportTitle from the trigger. 
- 
GeneratedDate: Click fx -> paste: formatDateTime(utcNow(), 'MMMM dd, 
yyyy') 
- 
ModelUsed: Click   -> select modelUsed from trigger. 
- 
ExecutiveSummary: Click   -> from the Parse JSON step, find sections -> 
you may need an 
expression: body('Parse_JSON')?['sections']?[0]?['content'] (this gets the 
first section's content, which should be the Executive Summary). 


- 
For repeating sections: 
Map SectionHeading, SectionContent, CitationText to the corresponding 
fields from the sections array in the parsed JSON. 
4. Rename this action to Populate_Word_Template. 
Step 39: Convert to PDF 
1. Add Word Online (Business) -> Convert Word Document to PDF. 
- 
Location: Same SharePoint site. 
- 
Document Library: Shared Documents 
- 
File: Click   -> from Populate_Word_Template, select the output file 
path or file ID. 
2. Rename to Convert_to_PDF. 
Step 40: Save outputs to SharePoint 
Save PDF: 
1. Add SharePoint -> Create file. 
- 
Site Address: Your SharePoint site. 
- 
Folder Path: /Shared Documents/PDF Output 
- 
File Name: Click   -> select reportTitle from trigger -> type _ -> 
click fx -> formatDateTime(utcNow(), 'yyyyMMdd') -> type .pdf (Or use a 
Compose action first to build the filename, then reference it here.) 
- 
File Content: Click   -> from Convert_to_PDF, select the File 
Content output (this is the binary PDF data). 
2. Rename to Save_PDF_to_SharePoint. 
Save JSON: 3. Add another SharePoint -> Create file. 
- 
Folder Path: /Shared Documents/JSON Output 
- 
File Name: Same pattern but ending in .json 
- 
File Content: Click   -> select reportJSON from the trigger (this is the raw JSON 
string). 
4. Rename to Save_JSON_to_SharePoint. 


Step 41: Create a sharing link for the PDF 
1. Add SharePoint -> Create sharing link for a file or folder. 
- 
Site Address: Your site. 
- 
Item Id: Click   -> from Save_PDF_to_SharePoint -> select ItemId (or Id). 
- 
Link Type: Organization (anyone in your organization can view). 
- 
Link Scope: Organization 
2. Rename to Create_PDF_Sharing_Link. 
Step 42: Email the report 
1. Add Office 365 Outlook -> Send an email (V2). 
- 
To: Click   -> select userEmail from trigger. 
- 
Subject: Type Industry Research Report:  then click   -> 
select reportTitle. 
- 
Body (toggle to HTML view by clicking the </> icon): Paste: 
html 
<div style="font-family: Arial, sans-serif; max-width: 600px;"> 
  <h2 style="color: #0D0D0D;">RESEARCH REPORT COMPLETE</h2> 
  <p>Your industry research report is ready for download.</p> 
  <table style="width: 100%; border-collapse: collapse;"> 
    <tr><td style="padding: 4px 8px; font-weight: bold;">Report:</td> 
        <td style="padding: 4px 8px;">[reportTitle]</td></tr> 
    <tr><td style="padding: 4px 8px; font-weight: bold;">Model:</td> 
        <td style="padding: 4px 8px;">[modelUsed]</td></tr> 
    <tr><td style="padding: 4px 8px; font-weight: bold;">Date:</td> 
        <td style="padding: 4px 8px;">[date]</td></tr> 
  </table> 
  <p><a href="[sharingLinkUrl]" style="background: #B8B800; color: #0D0D0D; 


  padding: 10px 24px; text-decoration: none; font-weight: bold; display: inline-block; 
  margin-top: 16px;">DOWNLOAD PDF REPORT</a></p> 
  <p style="color: #999; font-size: 12px; margin-top: 24px;"> 
  NXT Humans | Industry Research | Build smarter. Move faster. Win sooner.</p> 
</div> 
Important: Replace [reportTitle], [modelUsed], [date], and [sharingLinkUrl] with   
dynamic content from the trigger and the sharing link step. Delete each placeholder 
text, click  , and select the appropriate field. 
- 
Attachments: Click Show advanced options -> under Attachments: 
- 
Attachments Name - 1: Click   -> select reportTitle -> type .pdf 
- 
Attachments Content - 1: Click   -> from Convert_to_PDF -> select File 
Content 
2. Rename to Send_Report_Email. 
Step 43: Post Teams notification 
1. Add Microsoft Teams -> Post adaptive card in a chat or channel. 
- 
Post as: Flow bot 
- 
Post in: Chat with Flow bot 
- 
Recipient: Click   -> select userEmail from trigger. 
- 
Adaptive Card: 
json 
{ 
  "type": "AdaptiveCard", 
  "version": "1.2", 
  "body": [ 
    { 
      "type": "Container", 


      "style": "emphasis", 
      "items": [ 
        { 
          "type": "TextBlock", 
          "text": "RESEARCH REPORT READY", 
          "weight": "Bolder", 
          "size": "Large", 
          "color": "Light" 
        } 
      ] 
    }, 
    { 
      "type": "TextBlock", 
      "text": "${reportTitle}", 
      "wrap": true, 
      "weight": "Bolder", 
      "size": "Medium" 
    }, 
    { 
      "type": "FactSet", 
      "facts": [ 
        {"title": "Generated", "value": "${date}"}, 
        {"title": "Model", "value": "${modelUsed}"}, 
        {"title": "Sources Analyzed", "value": "${documentCount}"} 
      ] 
    }, 


    { 
      "type": "TextBlock", 
      "text": "NXT Humans | Industry Research", 
      "size": "Small", 
      "isSubtle": true 
    } 
  ], 
  "actions": [ 
    {"type": "Action.OpenUrl", "title": "OPEN PDF REPORT", "url": "${sharingLinkUrl}"}, 
    {"type": "Action.OpenUrl", "title": "VIEW IN SHAREPOINT", "url": 
"${sharePointFolderUrl}"} 
  ] 
} 
Important: Replace every ${...} placeholder with   dynamic content. 
For ${sharingLinkUrl}, use the output from Create_PDF_Sharing_Link. 
For ${sharePointFolderUrl}, type your actual PDF Output folder URL. 
2. Rename to Post_Teams_Notification. 
Step 44: Add the return-to-agent action 
1. Add Respond to Copilot with one output: 
- 
Type: Text 
- 
Name: deliveryStatus 
- 
Value: Report approved and delivered via email, Teams, and SharePoint. 
2. Click Save. 
 
Phase 9 -- Register all flows as tools in Copilot Studio 
Step 45: Register the Multi-Model Reasoning Engine 
1. Go back to Copilot Studio -> open your Industry Research Analyst agent. 


2. On the Overview page, find the Tools section. Click Add a tool. 
3. In the tool picker, click Power Automate flows (or Flows depending on your 
view). 
4. Find Multi-Model Reasoning Engine in the list -> click it -> click Add and 
configure. 
5. On the configuration screen: 
- 
Name: Multi-Model Reasoning Engine 
- 
Description (this is what the AI orchestrator reads to decide when to call 
this tool): Sends the user's research query to the selected LLM (Claude 
4.5 Sonnet, GPT-5.2, or Gemini 3 Pro) and returns a structured JSON 
analysis. Call this tool whenever the user asks a research question or 
requests document analysis. 
6. Map the inputs: 
- 
userMessage -> Set this to the user's current message (the orchestrator 
handles this automatically when the description is clear). 
- 
modelChoice -> Click and select the global variable Global.modelChoice. 
- 
systemPrompt -> You can either: (a) set this to a static value containing 
the full system prompt from Step 5, or (b) create a global variable 
called Global.systemPrompt that holds the instructions and reference it 
here. Option (a) is simpler -- paste the full instructions text from Step 5 
as the default value. 
7. Click Save. 
Step 46: Register the Infographic Generator 
1. Click Add a tool -> Power Automate flows -> select Infographic Generator - Nano 
Banana Pro -> Add and configure. 
2. Configure: 
- 
Name: Infographic Generator 
- 
Description: Generates professional, minimalistic infographics in the 
NXT Humans brand style using Nano Banana Pro (Gemini 3 Pro image 
generation). Call this tool after generating a research analysis to create 
visual representations of the findings. 


3. Map inputs: 
- 
reportContent -> the AI response from the reasoning engine 
- 
visualType -> let the orchestrator determine this from context (or set a 
default like market overview chart) 
- 
reportTitle -> from the report JSON title field 
4. Click Save. 
Step 47: Register the Report Generator and Delivery 
1. Click Add a tool -> Power Automate flows -> select Report Generator and 
Delivery -> Add and configure. 
2. Configure: 
- 
Name: Report Generator and Delivery 
- 
Description: Generates a branded PDF report from the analysis JSON, 
saves to SharePoint, sends via email and Teams. Includes a human 
review step before delivery. Call this tool after the analysis and 
infographics are ready. 
3. Map inputs: 
- 
reportJSON -> the AI response (structured JSON) 
- 
infographicUrl -> from the Infographic Generator's output 
- 
userEmail -> the signed-in user's email (use the system 
variable User.Email if available, or ask the user) 
- 
reportTitle -> from the report 
- 
modelUsed -> from the reasoning engine's output 
4. Click Save. 
 
Phase 10 -- Set up automatic triggers 
Step 48: Configure the SharePoint file upload trigger 
1. In Copilot Studio, open your agent -> click the Triggers tab (or find Triggers in the 
left navigation). 


2. Click + Add trigger. 
3. Search for "When a file is created (properties only)" and select 
the SharePoint version. 
4. Configure: 
- 
Site Address: Select your SharePoint site from the dropdown. 
- 
Library Name: Select Shared Documents (or whatever your document 
library is named). 
- 
Folder: Type or navigate to /Research Documents/Inbox 
5. In the trigger instructions field, paste: 
A new document has been uploaded to the Research Documents Inbox. Analyze this 
document using the connected SharePoint knowledge sources and the default model 
(Claude 4.5 Sonnet). Generate a comprehensive industry analysis report with 
infographics. Save outputs to the PDF Output and JSON Output folders. Send the 
report to the user who uploaded the document via email and Teams. 
6. Click Save. 
7. Important: This trigger only activates after the agent is published (Phase 11). 
Step 49: Configure the Outlook email trigger 
1. Still in the Triggers section, click + Add trigger. 
2. Search for "When a new email arrives (V3)" and select the Office 365 
Outlook version. 
3. Configure: 
- 
Folder: Inbox 
- 
Subject Filter: [Research] (only emails with this tag in the subject will 
trigger the agent) 
- 
Include Attachments: Yes 
4. In the trigger instructions field, paste: 
A research request has been received via email. Process the email body as a 


research query. If attachments are present, analyze them as source documents. 
Generate a full industry research report with infographics. Send the completed 
report back to the sender's email address and post a notification in Teams. 
5. Click Save. 
 
Phase 11 -- Publish, deploy, and test 
Step 50: Publish the agent 
1. In Copilot Studio, click the Publish button at the top of the Overview page. 
2. In the confirmation dialog, click Publish again. 
3. Wait for the green "Published successfully" banner. This may take 1-2 minutes. 
4. Why this matters: Event triggers (SharePoint file upload, Outlook email) only 
become active after publishing. Conversational features work in the test pane 
before publishing, but everything else requires this step. 
Step 51: Deploy to Microsoft Teams 
1. After publishing, click the Channels tab in the top navigation. 
2. Click the "Teams and Microsoft 365 Copilot" tile. 
3. Click Add channel. 
4. A panel opens. Click "See agent in Teams" -- this opens Microsoft Teams and 
prompts you to install the agent. 
5. In Teams, click Add to install the agent in your chat. 
6. To share with your team: 
- 
Click Availability options in the Copilot Studio channel panel -> Submit 
for admin approval. 
- 
Your Teams admin then goes to Teams Admin Center -> Apps -> finds your 
agent -> clicks Publish. 
- 
Optional: The admin can create an App Setup Policy to auto-install and 
pin the agent for specific users or groups. 
Step 52: Test the full pipeline 


Test 1 -- Model selection: 
1. Open Teams -> find the Industry Research Analyst agent in your chat. 
2. Type select model. You should see the adaptive card with model choices. 
3. Select Claude 4.5 Sonnet -> click Confirm. You should see: "Model set to 
claude-sonnet-4-5." 
Test 2 -- Conversational research: 4. Type: Analyze the competitive landscape in the 
North American cloud computing market. 5. Verify: 
- 
The agent retrieves content from your SharePoint knowledge source. 
- 
It returns a structured analysis with citations. 
- 
If you have relevant documents in your Research Documents library, citations 
should reference them. 
Test 3 -- Full report pipeline: 6. Type: Generate a full research report on the European 
EV battery market. 7. Verify the following sequence occurs: 
- 
The Multi-Model Reasoning Engine flow is called (check at 
make.powerautomate.com -> Flow runs). 
- 
The Infographic Generator flow is called. 
- 
An infographic PNG appears in your SharePoint /Infographics/ folder. 
- 
A draft appears in /Drafts for Review/. 
- 
You receive a review adaptive card in Teams. 
- 
After you click Approve, a PDF appears in /PDF Output/, a JSON in /JSON 
Output/, you receive an email with the PDF attached, and a Teams notification 
card appears. 
Test 4 -- Document upload trigger: 8. Upload a PDF industry report to /Research 
Documents/Inbox/ in SharePoint. 9. Wait 2-5 minutes (trigger polling interval). 10. 
Verify the agent processes it and sends you a report. 
Test 5 -- Email trigger: 11. Send an email with subject [Research] Analyze Q4 
semiconductor trends to your inbox. 12. Verify the agent processes it and replies with 
a report. 
 


Troubleshooting reference 
Symptom 
Resolution 
Agent doesn't respond 
to any query 
Verify generative orchestration is enabled (Step 4). Confirm 
the agent is published (Step 50). Check that at least one 
knowledge source is connected with a green checkmark. 
Agent says "I couldn't 
find information" 
Your SharePoint library may be empty or the user doesn't have 
permissions to the files. Upload test documents to the 
Research Documents library. Check that the knowledge 
source description (Step 8) accurately describes the content. 
Model selection card 
doesn't appear 
Verify the Model Selection topic (Step 13) is saved and 
enabled. Check that the trigger phrases include "select 
model". Test by typing the exact phrase "select model" in the 
test pane. 
Global.modelChoice is 
empty/undefined 
Confirm the variable is set as a Global variable (Step 15, sub-
step 8-9). Verify the Conversation Start topic sets the default 
value (Step 17). 
Power Automate flow 
fails with 401/403 
Your API key is expired or incorrect. Go to 
make.powerapps.com -> Solutions -> open the Compose 
action with the key -> verify the value matches your .env file. 
For Anthropic, ensure the key starts with sk-ant-. 
HTTP action shows 
"The expression is 
invalid" 
You likely have a typo in a dynamic content expression. Open 
the action -> check the fx expression for missing quotes, 
brackets, or incorrect action names (action names must 
match exactly, including underscores). 
Nano Banana Pro 
returns blurry or 
inaccurate visuals 
Tighten the prompt: add explicit dimensions (1920x1080), 
exact data values, and stronger style constraints. Reduce 
temperature to 0.1. Use the human review "Revise" option 
with correction notes. 
Gemini image 
generation quota 
exceeded 
Check usage at aistudio.google.com. Free tier has daily limits. 
Upgrade to a paid plan or add a Delay + retry loop in the flow. 


Symptom 
Resolution 
Review card not 
received in Teams 
Verify the reviewer email is correct in the flow. Check that the 
Flow bot has permission to post. Ensure adaptive card 
schema version is 1.2 (not higher -- Teams doesn't support 
1.4+ for all features). 
PDF generation fails 
Verify the Word template was created in desktop Word (not 
Word Online). Ensure all content control Title/Tag names 
match exactly what the flow references. File size limit is 10 
MB. If the Populate action shows no fields, re-upload the 
template and re-select it. 
SharePoint trigger 
doesn't fire 
Confirm the agent is published. Check the trigger folder path 
matches exactly. Triggers have a polling interval of ~1-3 
minutes -- wait before assuming it's broken. Check 
the Activity tab in Copilot Studio. 
Adaptive card renders 
as plain text in Teams 
Ensure you're using the "Post adaptive card" action (not "Post 
message"). The card JSON must be valid -- test it 
at https://adaptivecards.io/designer/ before pasting into the 
flow. 
Token warning fires on 
every Claude request 
7,500 output tokens is a conservative threshold. Increase it to 
8,000 in the Condition expression in Step 22, or remove the 
condition entirely if you have sufficient API budget. 
Architecture summary 
The complete system operates through three interaction modes converging on the 
same pipeline: 
Mode 1 -- Conversational (Teams/Web chat): User asks a question -> Copilot Studio 
orchestrator selects knowledge sources and tools -> Multi-Model Reasoning Engine 
(Power Automate) calls the user's chosen LLM -> structured JSON returned -> 
Infographic Generator creates visuals via Nano Banana Pro (Gemini 3 Pro image 
generation) -> drafts saved to SharePoint review folder -> human reviewer approves, 
requests revision, or rejects via Teams adaptive card -> upon approval, Report 
Generator populates Word template -> converts to PDF -> saves to SharePoint -> emails 
user -> posts Teams adaptive card. 


Mode 2 -- Document upload (SharePoint trigger): New file lands in the Inbox folder -> 
event trigger sends payload to agent -> agent autonomously runs the full pipeline 
above using default model (Claude 4.5 Sonnet) -> drafts go to review folder -> reviewer 
approves via Teams -> notifies uploader via Teams with final report. 
Mode 3 -- Email request (Outlook trigger): Email arrives with [Research] subject -> 
event trigger sends payload -> agent processes the request and any attachments -> 
drafts go to review -> reviewer approves -> sends completed report back to the sender's 
email. 
All three modes produce identical outputs: a PDF report (with NXT Humans-branded 
infographics) saved to /PDF Output/, a structured JSON file saved to /JSON Output/, 
infographic PNGs saved to /Infographics/, an email with attachment to the requestor, 
and a Teams adaptive card with download links. Every claim in every report includes 
citations tracing back to the source document, author, date, and section. 
 
Conclusion 
This recipe produces a production-grade autonomous research agent without writing 
application code. The three most consequential design decisions are: relying 
on Copilot Studio's native SharePoint knowledge integration with richly described 
knowledge sources for retrieval (keeping the architecture simple and avoiding Azure 
infrastructure overhead), storing API credentials in Power Platform Environment 
Variables with Secure Inputs/Outputs enabled on all flow actions (a practical 
approach when Azure Key Vault access isn't available -- migrate to Key Vault when 
organizational permissions allow), and making Claude 4.5 Sonnet the default 
model with automatic fallback -- balancing reasoning depth with cost optimization. 
The Nano Banana Pro integration (via Gemini 3 Pro image generation) fills a gap that 
most enterprise agent builds overlook: turning dense analytical text into scannable, 
boardroom-ready visuals without a design team -- with the human review gate 
ensuring every number is verified before delivery. If retrieval quality needs to scale 
beyond what native SharePoint knowledge provides, the architecture can be extended 
with Azure AI Search indexing and Foundry IQ agentic retrieval in a future iteration. 
 


