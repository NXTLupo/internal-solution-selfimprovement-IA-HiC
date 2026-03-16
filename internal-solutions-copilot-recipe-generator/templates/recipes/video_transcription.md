

# Video Transcription Assistant -- Definitive Build Recipe for Copilot Studio

This recipe walks you through every click, field, toggle, and configuration needed to build a Video Transcription Assistant agent in Microsoft Copilot Studio. The agent accepts audio and video file uploads through Microsoft Teams, transcribes them using the OpenAI Whisper API called directly from Power Automate flows, formats output as plain text, SRT subtitles, or VTT captions, and delivers completed transcripts via Teams Adaptive Cards, email, and SharePoint. The agent also attempts YouTube caption retrieval via the YouTube Data API v3 before falling back to Whisper for YouTube URLs. Written for absolute beginners in Copilot Studio -- no step is assumed.

---

## Architecture Diagram

```
+------------------+       +-------------------------+       +------------------------+
|                  |       |                         |       |                        |
|  Microsoft Teams |------>|  Copilot Studio Agent   |------>|  Power Automate Flows  |
|  (User uploads   |       |  "Video Transcription   |       |                        |
|   file or pastes |       |   Assistant"             |       |  +------------------+  |
|   YouTube URL)   |       |                         |       |  | Transcribe Audio |  |
|                  |       |  Topics:                |       |  | File             |  |
+------------------+       |  - Transcription Request|       |  |                  |  |
        ^                  |  - Format Selection     |       |  | HTTP POST to     |  |
        |                  |  - Download Transcript  |       |  | OpenAI Whisper   |  |
        |                  |                         |       |  | API              |  |
        |                  |  Knowledge:             |       |  +--------+---------+  |
        |                  |  - Transcripts Library  |       |           |            |
        |                  |    (SharePoint)         |       |  +--------v---------+  |
        |                  |                         |       |  | Transcribe       |  |
        |                  +------------+------------+       |  | YouTube Video    |  |
        |                               |                    |  |                  |  |
        |                               |                    |  | HTTP GET YouTube |  |
        |                               v                    |  | Data API v3     |  |
        |                  +-------------------------+       |  | (captions)       |  |
        |                  |                         |       |  +--------+---------+  |
        |                  |  SharePoint             |       |           |            |
        |                  |  /sites/ResearchHub/    |       +------------------------+
        |                  |  Shared Documents/      |                   |
        |                  |  Transcripts/           |<------------------+
        |                  |                         |    (Save transcript files)
        |                  +------------+------------+
        |                               |
        +-------------------------------+
          (Deliver via Teams Card + Email)
```

**Data Flow Summary:**

1. User uploads an audio/video file in Teams or pastes a YouTube URL.
2. Copilot Studio agent routes to the Transcription Request topic.
3. Topic collects input type, file/URL, output format, and timestamp preference.
4. Topic calls the appropriate Power Automate flow via an Action node.
5. Flow retrieves the API key from a Power Platform environment variable.
6. Flow calls the OpenAI Whisper API (for files) or YouTube Data API v3 then Whisper (for YouTube URLs).
7. Flow formats the transcript as plain text, SRT, or VTT.
8. Flow saves the transcript file to SharePoint Transcripts Library.
9. Flow returns transcript text, duration, word count, and status to the agent.
10. Agent presents results via Teams Adaptive Card and offers email delivery.

---

## Prerequisites -- What You Need Before Starting

Before you begin building, confirm you have the following:

1. A Microsoft 365 work or school account with a license that includes Copilot Studio (typically Microsoft 365 E3/E5 or a standalone Copilot Studio license). If you are not sure, ask your IT admin.

2. Access to Power Automate at https://make.powerautomate.com -- sign in and confirm you can see the home page.

3. Access to Power Apps maker portal at https://make.powerapps.com -- sign in and confirm you can see the home page.

4. A SharePoint site at https://yourcompany.sharepoint.com/sites/ResearchHub where you can create document libraries and folders. You need at least "Edit" permissions on this site.

5. API keys for the two external services:
   - OpenAI API key (for Whisper transcription) -- starts with `sk-...`. Get from https://platform.openai.com/api-keys
   - Google API key (for YouTube Data API v3 captions lookup) -- get from https://console.cloud.google.com/apis/credentials. Enable the "YouTube Data API v3" in your Google Cloud project.

6. Microsoft Teams installed (desktop or web) for testing the agent.

7. An email account connected to Office 365 Outlook for email delivery of transcripts.

---

## Component Summary Table

| Component Type | Name | Purpose |
|---|---|---|
| Agent | Video Transcription Assistant | Orchestrates transcription workflows |
| Topic | Transcription Request | Collects input, validates, calls transcription flow |
| Topic | Format Selection | Helps users choose optimal output format |
| Topic | Download Transcript | Retrieves and previews completed transcripts |
| Flow | Transcribe Audio File | Calls OpenAI Whisper API for uploaded files |
| Flow | Transcribe YouTube Video | Retrieves YouTube captions or falls back to Whisper |
| Tool | Transcribe Audio File | Agent-level tool registration for audio flow |
| Tool | Transcribe YouTube Video | Agent-level tool registration for YouTube flow |
| Knowledge Source | Transcripts Library | SharePoint library for completed transcripts |
| Environment Variable | nxth_OpenAiApiKey | OpenAI API key (Secret) |
| Environment Variable | nxth_GeminiApiKey | Google API key for YouTube Data API (Secret) |
| Entity | Transcript Formats | Closed list: Plain Text, SRT, VTT |

---

# PHASE 1: Create the Video Transcription Assistant Agent

This phase creates the agent shell, configures its identity, enables generative orchestration, writes the full agent instructions, disables general knowledge, and configures all system topics.

## Step 1.1: Create the SharePoint Folder Structure

WHERE AM I?: SharePoint > /sites/ResearchHub > Shared Documents

1. Open your browser and navigate to your SharePoint site (e.g., https://yourcompany.sharepoint.com/sites/ResearchHub).

2. In the left navigation, click Documents (or Shared Documents) to open the default document library.

3. Click + New -> Folder. Name it Transcripts. Click Create. This is where all completed transcript files will be stored.

4. Inside the Transcripts folder, create these subfolders by clicking + New -> Folder for each one:
   - Audio Files -- where uploaded audio files are temporarily stored during processing
   - Plain Text -- where plain text transcript files are saved
   - SRT -- where SRT subtitle files are saved
   - VTT -- where VTT caption files are saved

5. Go back to the root of the Documents library. Create one additional folder: Templates -- where any transcript templates will live.

6. Copy and save the full URL of your SharePoint site (everything up to and including the site name, e.g., https://yourcompany.sharepoint.com/sites/ResearchHub). You will need this multiple times throughout the recipe.

> **VERIFY**: You should now see the following folder structure under Shared Documents: Transcripts (with subfolders Audio Files, Plain Text, SRT, VTT) and Templates.

## Step 1.2: Create the Power Platform Solution and Environment Variables

WHERE AM I?: Power Apps > https://make.powerapps.com > Solutions

1. Open a new browser tab and navigate to https://make.powerapps.com.

2. Sign in with the same Microsoft 365 account you will use for Copilot Studio.

3. In the top-right corner, check the Environment dropdown. Make sure you are in the same environment where your Copilot Studio agent will live. If you are not sure, it is usually called "Default" or your organization's name.

4. In the left navigation, click Solutions.

5. Click + New solution.

6. Fill in:
   - Display name: Video Transcription Agent Solution
   - Publisher: Select the default publisher (or create one -- click + New publisher, set Name to NXTHumans, Prefix to nxth, then click Save).
   - Leave Version as 1.0.0.0.

7. Click Create. The solution opens.

> **BEGINNER TIP**: A Solution is like a container that holds all the pieces of your agent (flows, variables, connections) together. It makes it easy to move everything between environments later.

## Step 1.3: Create Environment Variable for OpenAI API Key

WHERE AM I?: Power Apps > Solutions > Video Transcription Agent Solution > + New > More > Environment variable

1. Inside your solution, click Add (the button at the top) -> More -> Environment variable.

2. Fill in:
   - Display name: OpenAI API Key
   - Name: This auto-fills as nxth_OpenAiApiKey (based on your publisher prefix). That is correct.
   - Data type: Select Secret
   - Default value: Leave blank.

3. Click Save at the bottom of the panel.

4. After saving, click the variable name to reopen it. Click + New value next to "Current value". Paste your OpenAI API key (the one starting with sk-...). Click Save.

> **WATCH OUT**: Environment variables of type "Secret" store values encrypted in Dataverse. However, you must STILL enable Secure Inputs and Secure Outputs on every Power Automate action that touches this key. Instructions are included in every flow step below.

## Step 1.4: Create Environment Variable for Google API Key

WHERE AM I?: Power Apps > Solutions > Video Transcription Agent Solution > + New > More > Environment variable

1. Click Add -> More -> Environment variable again.

2. Fill in:
   - Display name: Gemini API Key
   - Name: This auto-fills as nxth_GeminiApiKey. That is correct.
   - Data type: Select Secret
   - Default value: Leave blank.

3. Click Save.

4. After saving, click the variable name to reopen it. Click + New value next to "Current value". Paste your Google API key. Click Save.

> **VERIFY**: You should now see 2 environment variables listed in your solution: OpenAI API Key and Gemini API Key.

## Step 1.5: Sign In to Copilot Studio and Create a Blank Agent

WHERE AM I?: Copilot Studio > https://copilotstudio.microsoft.com > Agents > + Create

1. Open your browser and navigate to https://copilotstudio.microsoft.com.

2. Sign in with your Microsoft 365 work or school account.

3. You will land on the Copilot Studio home page. In the left navigation pane, click Agents.

4. Click the Create blank agent button. (If you want to change advanced settings like the solution or schema name, click the small down arrow (v) next to the button and select Advanced create, then click Confirm and create. For most users, just clicking the main button is fine.)

5. A new agent opens on the Overview page. This is your agent's home base -- it has sections for Details, Instructions, Knowledge, Tools, Suggested Prompts, and Channels.

## Step 1.6: Set the Agent Name, Description, and Icon

WHERE AM I?: Copilot Studio > Agent Overview > Details section > Edit (pencil icon)

1. On the Overview page, find the Details section (near the top). Click the Edit (pencil) icon.

2. In the Name field, delete the default name and type: Video Transcription Assistant

3. In the Description field (max 1,024 characters), paste:

```
Specialized agent for converting audio and video content into accurate text transcripts. Accepts file uploads (MP4, MP3, WAV, M4A, WebM, OGG, FLAC) up to 20 MB through Teams. Transcribes using OpenAI Whisper API called directly from Power Automate flows. Supports plain text, SRT subtitle, and VTT caption output formats with optional timestamps. Delivers transcripts via Teams Adaptive Cards, email, and SharePoint.
```

4. To change the agent's icon: click the agent icon in the top-left area of the page -> click Change icon -> upload a 192 x 192 pixel PNG image (max 72 KB). Use a professional icon that represents audio/video transcription (such as a microphone or waveform).

5. Click Save at the top of the page. Wait for the green "Saved successfully" banner.

## Step 1.7: Enable Generative Orchestration

WHERE AM I?: Copilot Studio > Agent Overview > Details section > Orchestration

1. Still in the Details section of the Overview page, look for the Orchestration area.

2. Find the toggle labeled "Use generative AI to determine how best to respond to users and events".

3. Make sure this is set to Yes (toggled on). New agents usually default to this, but verify it.

4. What this does: Instead of requiring you to manually define exact trigger phrases for every possible user question, generative orchestration uses an AI planner to dynamically decide which topics, tools, and knowledge sources to use for each request. This is essential for an agent that needs to handle varied transcription requests -- users might say "transcribe this video", "convert my audio to text", "I need subtitles for this file", or dozens of other phrasings.

> **CRITICAL**: This is an architectural decision. Generative orchestration means the agent uses topic descriptions (not just trigger phrases) to route conversations. Every topic description you write later must be clear and specific about what the topic does AND does not do.

## Step 1.8: Write the Agent Instructions

WHERE AM I?: Copilot Studio > Agent Overview > Instructions section > Edit

1. On the Overview page, find the Instructions section. Click Edit.

2. You will see a large text field (max 8,000 characters). Delete any default text and paste the following:

```
[PERSONA]
You are the Video Transcription Assistant, a specialized agent for converting audio and video content into accurate text transcripts. You help researchers, content creators, and analysts get written records of multimedia content. Your tone is efficient, detail-oriented, and helpful. You communicate clearly about processing times and file limitations. You proactively suggest the best output format based on the user's stated use case: SRT for subtitles, plain text for analysis, VTT for web embedding.

[CHAIN-OF-THOUGHT REASONING]
For every transcription request, reason step-by-step before responding:
1. Determine the input type: file upload or YouTube URL.
2. For file uploads, validate the format against supported types (MP4, MP3, WAV, M4A, WebM, OGG, FLAC) and check the file size against the 20 MB limit. Warn at 15 MB.
3. For YouTube URLs, extract the video ID and attempt to retrieve existing captions first. If no captions exist, note the limitation.
4. Ask the user for their preferred output format: plain text, SRT (SubRip subtitle), or VTT (WebVTT caption). Default to plain text if not specified.
5. Ask if the user wants timestamp annotations embedded in the text output.
6. Execute the transcription flow with the validated inputs.
7. On completion, present a summary with duration, word count, detected language, and a preview of the first 200 words. Provide download links.

[OUTPUT FORMAT]
Present transcription results in a clean Adaptive Card with metadata at the top (duration, word count, language), followed by a preview excerpt of the first 200 words, and download buttons for the generated format. For long transcripts, offer to break them into sections.

When returning structured data, use this JSON format:
{
  "title": "Transcript of [filename]",
  "date": "YYYY-MM-DD",
  "duration_seconds": 754,
  "word_count": 2340,
  "detected_language": "en",
  "output_format": "plain_text",
  "preview": "First 200 words of the transcript...",
  "sharepoint_url": "https://...",
  "status": "completed"
}

[CONSTRAINTS]
- Maximum file size: 20 MB per upload. Reject files over this limit with a clear explanation that the OpenAI Whisper API enforces a 20 MB hard limit.
- Supported audio/video formats: MP4, MP3, WAV, M4A, WebM, OGG, FLAC. Reject unsupported formats and suggest the user convert using a free tool like FFmpeg or an online converter.
- Processing time estimate: roughly 1 minute per 10 minutes of audio content.
- Always preserve the original audio language. Offer translation to English only if explicitly requested.
- Only answer questions related to transcription, audio/video processing, and transcript formatting.
- If the user asks about topics outside transcription, respond: "I specialize in audio and video transcription. I can help you convert media files to text, choose output formats, or retrieve completed transcripts."
- For YouTube URLs where captions are not available and audio download is not feasible, clearly explain the limitation and suggest the user download the audio manually and upload it.

[FEW-SHOT EXAMPLE]
User: "I need to transcribe this meeting recording"
Expected behavior:
1. Ask for the file upload or YouTube URL
2. Validate the file format and size
3. Ask for preferred output format (recommend plain text for meeting notes)
4. Ask about timestamp preference (recommend yes for meeting recordings)
5. Process through Whisper API
6. Return:
{
  "title": "Transcript of meeting_recording.mp3",
  "date": "2026-02-15",
  "duration_seconds": 2400,
  "word_count": 4200,
  "detected_language": "en",
  "output_format": "plain_text",
  "preview": "Good morning everyone. Let us start with the quarterly review. As you can see from the dashboard, our Q4 numbers exceeded projections by twelve percent...",
  "sharepoint_url": "https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Transcripts/Plain Text/meeting_recording_20260215.txt",
  "status": "completed"
}
```

3. Click Save at the top of the page.

> **VERIFY**: The instructions text should be well under the 8,000 character limit. You can check the character count by selecting all text in the field and checking your browser's character count (or paste into a text editor with character counting).

## Step 1.9: Disable General Knowledge

WHERE AM I?: Copilot Studio > Settings (gear icon in top navigation bar) > Generative AI

1. Click the Settings gear icon at the very top of the Copilot Studio page (not the Details section -- the gear icon in the top navigation bar).

2. In the settings panel, click Generative AI in the left menu.

3. Find the toggle "Allow the AI to use its own general knowledge" and set it to Off.

4. What this does: Forces the agent to answer exclusively from your SharePoint documents and the tools you configure. This prevents the agent from making up plausible-sounding claims about transcription capabilities it does not actually have.

5. Click Save and close the settings panel.

## Step 1.10: Configure Authentication

WHERE AM I?: Copilot Studio > Settings (gear icon) > Security > Authentication

1. Click the Settings gear icon at the top of the page.

2. Click Security in the left menu, then click Authentication.

3. Select "Authenticate with Microsoft". This is the correct choice because the agent runs in Teams and needs to identify users for email delivery and SharePoint access.

4. Click Save and close the settings panel.

> **BEGINNER TIP**: "Authenticate with Microsoft" means the agent automatically knows who the user is via their Microsoft 365 account. You get access to system variables like User.DisplayName, User.Email, and User.Id without any extra configuration.

## Step 1.11: Configure System Topics

WHERE AM I?: Copilot Studio > Topics tab > System subtab

1. Click the Topics tab in the top navigation bar of Copilot Studio.

2. You will see two subtabs: Custom and System. Click the System subtab.

3. You will see a list of system topics. Configure each one:

**Conversation Start:**

4. Click Conversation Start to open the topic authoring canvas.

5. You will see a trigger node ("Conversation Start") connected to a Message node. Before the Message node, click the + button to add a new node. Select Variable management -> Set a variable value.

6. In the "Set variable" node:
   - Click the box under "Set variable" -> select Create a new variable.
   - The new variable appears with a default name (e.g., Var1) and type Unknown.
   - Click the variable name -> the Variable properties panel opens on the right.
   - Under Variable name, type: DefaultOutputFormat (do NOT type the Global. prefix -- it will be added automatically).
   - Under Usage, select "Global (any topic can access)". The variable name automatically becomes Global.DefaultOutputFormat.
   - For the To value field, type: plain_text

7. Add another Set a variable value node below the first one:
   - Click the box under "Set variable" -> select Create a new variable.
   - Click the variable name -> Variable properties panel.
   - Under Variable name, type: IncludeTimestamps
   - Under Usage, select "Global (any topic can access)". It becomes Global.IncludeTimestamps.
   - For the To value field, type: false

8. Now click the Message node that was already there. Delete the default message text. Replace it with:

```
Welcome to the Video Transcription Assistant.

I can help you convert audio and video content into accurate text transcripts.

-> Upload an audio or video file (MP4, MP3, WAV, M4A, WebM, OGG, FLAC -- max 20 MB)
-> Paste a YouTube URL to extract captions or transcribe
-> Type "formats" to learn about output options (Plain Text, SRT, VTT)
-> Type "download" to retrieve a completed transcript

What would you like to transcribe today?
```

9. Click Save at the top.

**Fallback:**

10. Go back to Topics -> System and click Fallback.

11. Click the Message node and replace the text with:

```
I did not understand that request. I specialize in audio and video transcription. I can help with:

-> Transcribing uploaded audio or video files
-> Extracting transcripts from YouTube videos
-> Choosing output formats (Plain Text, SRT, VTT)
-> Downloading completed transcripts

Please rephrase your question, or type "transcribe" to start a new transcription.
```

12. Click Save.

**On Error:**

13. Click On Error in the system topics list. Keep the default configuration -- it displays the error code, conversation ID, and timestamp, which you will need for troubleshooting.

**End of Conversation:**

14. Click End of Conversation. Toggle the satisfaction survey to On so you can collect feedback on transcription quality.

15. Click Save.

---

# PHASE 2: Add Knowledge Sources (1 source)

Knowledge sources allow the agent to search and retrieve information from connected data. We connect the SharePoint Transcripts Library so the agent can find and reference completed transcripts.

## Step 2.1: Add the SharePoint Transcripts Library as a Knowledge Source

WHERE AM I?: Copilot Studio > Agent Overview > Knowledge section > Add knowledge

1. Navigate back to the Overview page of your agent (click the agent name in the breadcrumb at the top).

2. Find the Knowledge section and click Add knowledge.

3. A panel opens showing knowledge source options. Under Featured, click SharePoint.

4. In the SharePoint URL field, paste the URL of your SharePoint site. For example: https://yourcompany.sharepoint.com/sites/ResearchHub

5. Press Enter or click the + button. The URL appears as a tag below the field.

6. Below the URLs, you will see two fields:
   - Name: Type Transcripts Library
   - Description: This is critical for retrieval quality. Paste:

```
Contains completed audio and video transcription files organized by format type. Includes plain text transcripts (.txt), SRT subtitle files (.srt), and VTT caption files (.vtt). Each transcript includes metadata such as source file name, duration, word count, detected language, transcription date, and the AI model used (OpenAI Whisper). File naming convention: {original_filename}_{date}_{format}.{ext}. Subfolders: Audio Files (temporary uploaded files), Plain Text, SRT, VTT. Date range: 2024-2026. Used for research analysis, video subtitling, web captioning, and meeting documentation.
```

7. Click Add to agent.

8. You will see the knowledge source appear in the Knowledge section with a green checkmark. If you see a yellow warning, click it to read the issue (usually a permissions problem -- ensure your account has at least Read access to the SharePoint library).

> **VERIFY**: The Transcripts Library knowledge source appears in the Knowledge section with a green checkmark and the description you entered.

## Step 2.2: Configure Knowledge Behavior Settings

WHERE AM I?: Copilot Studio > Settings (gear icon) > Generative AI

1. Click the Settings gear icon in the top navigation bar.

2. Click Generative AI in the left menu.

3. Under "How should your agent interact with knowledge sources", select High strictness. This ensures the agent only answers from your documents and does not fill gaps with guesses about transcription capabilities.

4. Click Save and close the settings panel.

---

# PHASE 3: Transcription Request -- TOPIC BUILD (node-by-node: 9 nodes)

This is the primary topic that guides users through the full transcription workflow. It collects the input type, validates the file or URL, asks for output format and timestamp preferences, then calls the appropriate Power Automate flow.

## Step 3.1: Create the Transcription Request Topic

WHERE AM I?: Copilot Studio > Topics tab > Custom subtab > + Add a topic > From blank

1. Click the Topics tab in the top navigation bar -> click the Custom subtab -> click + Add a topic -> From blank.

2. At the top of the canvas, click the topic name (it says "Untitled") and rename it to: Transcription Request

3. Click the Description field below the name. Type: User wants to transcribe a video or audio file. Route here when the user uploads a file, pastes a YouTube URL, or mentions transcribing, converting speech to text, or getting a transcript of audio/video content. Does NOT handle format selection advice or transcript downloads.

## Step 3.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Trigger node

1. In the Trigger node at the top of the canvas, you will see a section labeled "Describe what this topic does" (or "Add trigger phrases" depending on your view).

2. Click the description/trigger area and add these trigger phrases (press Enter after each one):
   - transcribe video
   - transcribe audio
   - speech to text
   - get transcript
   - convert video to text
   - upload for transcription
   - I need to transcribe a file
   - convert audio to text
   - transcribe my recording
   - I have a file to transcribe

> **BEGINNER TIP**: Even though we enabled generative orchestration (which uses the topic description for routing), trigger phrases still serve as Custom Topic identifiers and help the AI planner understand what this topic handles.

## Step 3.3: Build Node 1 -- Message -- "Transcription Welcome"

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Canvas (below Trigger node)

1. Click the + button below the Trigger node to add a new node.

2. In the node menu that appears, click Send a message.

3. In the message text field, type:

```
I can help you transcribe audio and video content into text.

Here is what I support:
-- File uploads: MP4, MP3, WAV, M4A, WebM, OGG, FLAC (max 20 MB per file)
-- YouTube URLs: I will attempt to retrieve existing captions first

Output formats available:
-- Plain Text: Clean readable text, best for analysis and reading
-- SRT: SubRip subtitle format with timestamps, standard for video players
-- VTT: WebVTT caption format, ideal for HTML5 web embedding

Let us get started.
```

4. Click Save at the top of the canvas.

## Step 3.4: Build Node 2 -- Question -- "Select Input Type"

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Canvas (below Message node)

1. Click the + button below the Message node to add a new node.

2. In the node menu, click Ask a question.

3. In the question text field, type: How would you like to provide your content? Please choose one:

4. Under "Identify", click the dropdown. You will see options like "User's entire response", "Multiple choice options", and various entity types. Select Multiple choice options.

5. Two option fields appear. Fill them in:
   - Option 1: File Upload
   - Option 2: YouTube URL

6. The question node automatically creates an output variable. Click the variable name (it may say something like Var1 or Topic.Var1).

7. In the Variable properties panel that opens on the right:
   - Under Variable name, change it to: varInputType
   - The scope should remain as Topic (Topic.varInputType). We do not need this to be global.

8. Click Save.

> **BEGINNER TIP**: A "Multiple choice options" question shows the user clickable buttons in Teams. The user can either click a button or type their answer. The variable stores whichever option they selected.

## Step 3.5: Build Node 3 -- Condition -- "Route by Input Type"

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Canvas (below Question node)

1. Click the + button below the Question node to add a new node.

2. In the node menu, click Add a condition -> Branch based on a condition.

3. A Condition node appears with an "If" branch and an "Else" branch.

4. In the "If" condition:
   - Click the first dropdown (Select a variable) -> select Topic.varInputType.
   - Click the operator dropdown -> select is equal to.
   - In the value field, type: File Upload

5. The "If" branch is now the File Upload path. The "Else" branch handles YouTube URL.

6. Click Save.

> **BEGINNER TIP**: A Condition node creates two paths in your conversation. The "If" path runs when the condition is true (user chose File Upload). The "Else" path runs for everything else (user chose YouTube URL).

## Step 3.6: Build Node 4 -- Question -- "Collect File or URL" (File Upload Path)

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Canvas > If branch (File Upload)

**Inside the "If" branch (File Upload path):**

1. Click the + button inside the "If" branch to add a new node.

2. Click Send a message. In the message text, type:

```
Please upload your audio or video file now. Drag and drop the file into the chat, or click the attachment icon (paperclip) at the bottom of the chat window.

Supported formats: MP4, MP3, WAV, M4A, WebM, OGG, FLAC
Maximum file size: 20 MB

I will wait for your file.
```

3. Click Save.

> **WATCH OUT**: Copilot Studio in Teams receives file uploads as attachments. The file content is accessible via the system variable `Activity.Attachments`. However, processing file attachments requires the Power Automate flow to retrieve the file from the Teams attachment URL. The topic itself does not directly "receive" the file -- instead, the flow will use the attachment URL passed as an input parameter.

**Inside the "Else" branch (YouTube URL path):**

4. Click the + button inside the "Else" branch to add a new node.

5. Click Ask a question. In the question text, type: Please paste the full YouTube video URL (e.g., https://www.youtube.com/watch?v=XXXXXXXXXXX):

6. Under "Identify", select User's entire response (this maps to the entity kind StringPrebuiltEntity).

7. Click the output variable name -> in the Variable properties panel:
   - Under Variable name, change it to: varYouTubeUrl
   - Scope remains Topic.

8. Click Save.

## Step 3.7: Build Node 5 -- Condition -- "Validate Input"

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Canvas (after both branches merge)

> **WATCH OUT**: In Copilot Studio, after a Condition node's branches, the conversation flow merges back together automatically. The next node you add after the Condition applies to BOTH paths. However, for file validation, we need to add validation logic inside each branch before they merge. For simplicity in this beginner recipe, we will add a validation message inside the File Upload branch and a URL validation message inside the YouTube branch, then merge for the remaining nodes.

**Inside the File Upload "If" branch, below the upload message:**

1. Click the + button below the upload message node inside the "If" branch.

2. Click Send a message. In the message text, type:

```
I have received your file. Let me validate it before proceeding.

Note: If your file is larger than 15 MB, processing may take longer. Files over 20 MB cannot be processed due to the Whisper API limit.

If you uploaded a video file (MP4, WebM), please note that the Whisper API processes audio only. The audio track will be extracted automatically for supported formats.
```

3. Click Save.

**Inside the YouTube URL "Else" branch, below the URL question:**

4. Click the + button below the YouTube URL question node inside the "Else" branch.

5. Click Send a message. In the message text, type:

```
I have your YouTube URL. I will first check if the video has existing captions available. If captions are found, I will retrieve them directly. If not, I will note the limitation -- direct audio download from YouTube is not currently supported in this flow, and you may need to provide the audio file separately.
```

6. Click Save.

## Step 3.8: Build Node 6 -- Question -- "Select Output Format"

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Canvas (after both branches merge)

1. After the Condition node's branches merge, click the + button to add a new node.

2. Click Ask a question.

3. In the question text, type: What output format would you like for your transcript?

4. Under "Identify", select Multiple choice options.

5. Fill in three options:
   - Option 1: Plain Text
   - Option 2: SRT
   - Option 3: VTT

6. Click the output variable name -> in the Variable properties panel:
   - Under Variable name, change it to: varOutputFormat
   - Scope remains Topic.

7. Click Save.

## Step 3.9: Build Node 7 -- Question -- "Include Timestamps Option"

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Canvas (below Output Format question)

1. Click the + button below the Output Format question to add a new node.

2. Click Ask a question.

3. In the question text, type: Would you like timestamp annotations included in the output? Timestamps are useful for research citations and navigating long transcripts.

4. Under "Identify", select Boolean (this maps to the entity kind BooleanPrebuiltEntity). This presents the user with Yes/No options.

5. Click the output variable name -> in the Variable properties panel:
   - Under Variable name, change it to: varIncludeTimestamps
   - Scope remains Topic.

6. Click Save.

## Step 3.10: Build Node 8 -- Action -- "Execute Transcription Flow"

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Canvas (below Timestamps question)

> **CRITICAL**: We have not built the Power Automate flow yet (that is Phase 4). For now, we will add a placeholder Message node. After building the flow in Phase 4, you will come back to this topic and replace the placeholder with an actual Action node that calls the flow.

1. Click the + button below the Timestamps question to add a new node.

2. Click Send a message. In the message text, type:

```
[ACTION PLACEHOLDER] -- After building the Transcribe Audio File flow in Phase 4, replace this Message node with an Action node. To do this: delete this Message node, click the + button, select Add a tool, find and select the Transcribe Audio File flow, then map the following input variables:
-- file_url: The attachment URL from the user's uploaded file (or Topic.varYouTubeUrl for YouTube)
-- language: "en" (or ask the user)
-- output_format: Topic.varOutputFormat
-- include_timestamps: Topic.varIncludeTimestamps

The flow will return these output variables to capture:
-- transcript_text -> Topic.varTranscriptText
-- duration -> Topic.varDuration
-- status -> Topic.varStatus
```

3. Click Save.

> **BEGINNER TIP**: We cannot add the Action node until the flow exists. This is a common pattern in Copilot Studio development -- you build the topic structure first with placeholders, then build the flows, then come back and wire them together.

## Step 3.11: Build Node 9 -- Message -- "Processing Confirmation"

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Canvas (below Action placeholder)

1. Click the + button below the placeholder message to add a new node.

2. Click Send a message. In the message text, type:

```
Your transcription is being processed. Here is what to expect:

-- Estimated processing time: approximately 1 minute per 10 minutes of audio
-- Output format: {Topic.varOutputFormat}
-- Timestamps: {Topic.varIncludeTimestamps}

I will notify you as soon as the transcript is ready. You can type "download" at any time to check on completed transcripts.
```

3. To insert the variable references: where you see {Topic.varOutputFormat} in the text above, delete that placeholder text, then click the {x} (Insert variable) button in the message toolbar, and select Topic.varOutputFormat. Do the same for {Topic.varIncludeTimestamps}.

4. Click Save at the top of the canvas.

## Step 3.12: Complete YAML for Transcription Request Topic

WHERE AM I?: Copilot Studio > Topics > Transcription Request > (...) menu > Open code editor

1. Click the three dots (...) at the top-right of the topic canvas.

2. Select Open code editor.

3. You can verify your topic matches this YAML structure. If you prefer, you can paste this YAML into an empty topic's code editor to create the entire topic at once:

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Transcription Request
    triggerQueries:
      - transcribe video
      - transcribe audio
      - speech to text
      - get transcript
      - convert video to text
      - upload for transcription
      - I need to transcribe a file
      - convert audio to text
      - transcribe my recording
      - I have a file to transcribe
  actions:
    - kind: SendMessage
      id: transcriptionWelcome
      message: |-
        I can help you transcribe audio and video content into text.

        Here is what I support:
        -- File uploads: MP4, MP3, WAV, M4A, WebM, OGG, FLAC (max 20 MB per file)
        -- YouTube URLs: I will attempt to retrieve existing captions first

        Output formats available:
        -- Plain Text: Clean readable text, best for analysis and reading
        -- SRT: SubRip subtitle format with timestamps, standard for video players
        -- VTT: WebVTT caption format, ideal for HTML5 web embedding

        Let us get started.

    - kind: Question
      id: selectInputType
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varInputType
      prompt: "How would you like to provide your content? Please choose one:"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: file_upload
              displayName: File Upload
            - id: youtube_url
              displayName: YouTube URL

    - kind: ConditionGroup
      id: routeByInputType
      conditions:
        - id: isFileUpload
          condition: =Topic.varInputType = "file_upload"
          actions:
            - kind: SendMessage
              id: fileUploadPrompt
              message: |-
                Please upload your audio or video file now. Drag and drop the file into the chat, or click the attachment icon (paperclip) at the bottom of the chat window.

                Supported formats: MP4, MP3, WAV, M4A, WebM, OGG, FLAC
                Maximum file size: 20 MB

                I will wait for your file.
            - kind: SendMessage
              id: fileValidationMsg
              message: |-
                I have received your file. Let me validate it before proceeding.

                Note: If your file is larger than 15 MB, processing may take longer. Files over 20 MB cannot be processed due to the Whisper API limit.

                If you uploaded a video file (MP4, WebM), please note that the Whisper API processes audio only. The audio track will be extracted automatically for supported formats.
      elseActions:
        - kind: Question
          id: collectYouTubeUrl
          interruptionPolicy:
            allowInterruption: true
          variable: init:Topic.varYouTubeUrl
          prompt: "Please paste the full YouTube video URL (e.g., https://www.youtube.com/watch?v=XXXXXXXXXXX):"
          entity: StringPrebuiltEntity
        - kind: SendMessage
          id: youtubeValidationMsg
          message: |-
            I have your YouTube URL. I will first check if the video has existing captions available. If captions are found, I will retrieve them directly. If not, I will note the limitation -- direct audio download from YouTube is not currently supported in this flow, and you may need to provide the audio file separately.

    - kind: Question
      id: selectOutputFormat
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varOutputFormat
      prompt: "What output format would you like for your transcript?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: plain_text
              displayName: Plain Text
            - id: srt
              displayName: SRT
            - id: vtt
              displayName: VTT

    - kind: Question
      id: includeTimestampsOption
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varIncludeTimestamps
      prompt: "Would you like timestamp annotations included in the output? Timestamps are useful for research citations and navigating long transcripts."
      entity: BooleanPrebuiltEntity

    - kind: SendMessage
      id: callFlowPlaceholder
      message: "[ACTION PLACEHOLDER] -- Replace this node with an Action node that calls the Transcribe Audio File flow. (Add node -> Add a tool -> select the flow, then map input/output variables as documented in Phase 4.)"

    - kind: SendMessage
      id: processingConfirmation
      message: |-
        Your transcription is being processed. Here is what to expect:

        -- Estimated processing time: approximately 1 minute per 10 minutes of audio
        -- Output format: {Topic.varOutputFormat}
        -- Timestamps: {Topic.varIncludeTimestamps}

        I will notify you as soon as the transcript is ready. You can type "download" at any time to check on completed transcripts.

    - kind: EndDialog
      id: endTranscriptionRequest
```

4. Close the code editor to return to the visual canvas.

5. Click Save.

---

# PHASE 4: Transcribe Audio File -- FLOW BUILD (action-by-action)

This is the core flow that receives an uploaded audio file, calls the OpenAI Whisper API for transcription, formats the output, saves it to SharePoint, and returns the results to the agent. Every action is documented individually.

## Step 4.1: Create the Flow

WHERE AM I?: Power Automate > https://make.powerautomate.com > Solutions > Video Transcription Agent Solution

1. Open a new browser tab and navigate to https://make.powerautomate.com.

2. In the left navigation, click Solutions -> open Video Transcription Agent Solution (the one you created in Step 1.2).

3. Click + New -> Automation -> Cloud flow -> Instant.

4. In the "Build an instant cloud flow" dialog:
   - Flow name: Transcribe Audio File
   - Choose how to trigger this flow: Scroll down and select "Run a flow from Copilot" (this is the Copilot Studio trigger). If you do not see this option, select "Manually trigger a flow" -- we will change it in the next step.

5. Click Create. The flow editor opens.

## Step 4.2: Configure the Trigger with Input Parameters

WHERE AM I?: Power Automate > Flow Editor > Trigger node (top of canvas)

1. If the trigger shows as "Run a flow from Copilot", click on it to expand it. If it shows a different trigger, delete it: click the three dots (...) on the trigger -> Delete. Then click + Add a trigger -> search for "Run a flow from Copilot" -> select it.

2. Click + Add an input inside the trigger. You need to add four text inputs and one yes/no input:

**Input 1:**
- Click + Add an input -> select Text.
- Input name (the label): file_url
- Description: URL or SharePoint path to the uploaded audio or video file

**Input 2:**
- Click + Add an input -> select Text.
- Input name: language
- Description: Language hint for transcription accuracy (e.g., en, es, fr). Default is en.

**Input 3:**
- Click + Add an input -> select Text.
- Input name: output_format
- Description: Desired transcript format: plain_text, srt, or vtt

**Input 4:**
- Click + Add an input -> select Yes/No.
- Input name: include_timestamps
- Description: Whether to include timestamp annotations in the output

> **WATCH OUT**: Use named trigger references like `triggerBody()?['file_url']` in expressions later -- NEVER use positional references like `triggerBody()?['text']` or `triggerBody()?['text_1']` as these break when inputs are reordered.

## Step 4.3: Initialize Variables

WHERE AM I?: Power Automate > Flow Editor > Below the trigger

1. Below the trigger, click + -> Add an action.

2. Search for "Initialize variable" -> select Initialize variable (under "Variable" actions).

3. Fill in:
   - Name: varTranscriptText
   - Type: String
   - Value: (leave empty)

4. Rename this action: click the three dots (...) -> Rename -> type: Initialize_varTranscriptText

5. Click + -> Add an action -> Initialize variable again:
   - Name: varDuration
   - Type: String
   - Value: (leave empty)
   - Rename to: Initialize_varDuration

6. Click + -> Add an action -> Initialize variable again:
   - Name: varWordCount
   - Type: Integer
   - Value: 0
   - Rename to: Initialize_varWordCount

7. Click + -> Add an action -> Initialize variable again:
   - Name: varDetectedLanguage
   - Type: String
   - Value: (leave empty)
   - Rename to: Initialize_varDetectedLanguage

8. Click + -> Add an action -> Initialize variable again:
   - Name: varStatus
   - Type: String
   - Value: processing
   - Rename to: Initialize_varStatus

## Step 4.4: Retrieve the OpenAI API Key

WHERE AM I?: Power Automate > Flow Editor > Below the Initialize variables

1. Click + -> Add an action -> search for "Compose" -> select Compose (under "Data Operations").

2. In the Inputs field, paste your OpenAI API key (the literal key string starting with sk-...).

3. Immediately secure this action: Click the three dots (...) on the Compose action -> Settings -> scroll down to Security -> toggle Secure Inputs to On -> toggle Secure Outputs to On -> click Done.

4. Rename this action: click the three dots (...) -> Rename -> type: Get_OpenAI_Key

> **CRITICAL**: The Secure Inputs and Secure Outputs toggles hide the API key value from flow run history. Without these, anyone who can view the flow run history can see your API key in plain text. ALWAYS enable both toggles on any action that touches an API key.

> **BEGINNER TIP**: We are using a Compose action with the key hardcoded for simplicity. In a production environment, you would use the "Get environment variable" action from the Power Platform connector to retrieve the key from the nxth_OpenAiApiKey environment variable you created in Step 1.3. The Compose approach works identically but is simpler for beginners.

## Step 4.5: Get the Uploaded File Content from SharePoint

WHERE AM I?: Power Automate > Flow Editor > Below Get_OpenAI_Key

1. Click + -> Add an action -> search for "Get file content" -> select Get file content (under "SharePoint").

2. Configure:
   - Site Address: Select your SharePoint site from the dropdown (or paste https://yourcompany.sharepoint.com/sites/ResearchHub).
   - File Identifier: Click the dynamic content panel (the lightning bolt icon) and select file_url from the trigger inputs.

3. Rename this action to: Get_File_Content

> **WATCH OUT**: The file_url input from the topic should be the SharePoint file path or a direct URL to the uploaded file. When a user uploads a file in Teams, the file is stored in the user's OneDrive or a Teams-managed location. The topic's Action node must pass the correct file path. For this recipe, we assume the file URL points to a SharePoint-accessible location.

## Step 4.6: Build the Multipart Form Data Body for Whisper API

WHERE AM I?: Power Automate > Flow Editor > Below Get_File_Content

The OpenAI Whisper API requires multipart/form-data, not JSON. We need to construct the multipart body manually using Compose actions.

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (the fx button) and paste:

**COPY-PASTE** into the Expression field:
```
concat('--boundary123', decodeUriComponent('%0D%0A'), 'Content-Disposition: form-data; name="model"', decodeUriComponent('%0D%0A'), decodeUriComponent('%0D%0A'), 'whisper-1', decodeUriComponent('%0D%0A'), '--boundary123', decodeUriComponent('%0D%0A'), 'Content-Disposition: form-data; name="response_format"', decodeUriComponent('%0D%0A'), decodeUriComponent('%0D%0A'), 'verbose_json', decodeUriComponent('%0D%0A'), '--boundary123', decodeUriComponent('%0D%0A'), 'Content-Disposition: form-data; name="language"', decodeUriComponent('%0D%0A'), decodeUriComponent('%0D%0A'), triggerBody()?['language'], decodeUriComponent('%0D%0A'), '--boundary123--')
```

3. Click OK.

4. Rename this action to: Build_Multipart_Text_Parts

> **BEGINNER TIP**: Multipart form data is a way to send multiple pieces of data (like form fields and files) in a single HTTP request. Each "part" is separated by a boundary string (we use "boundary123"). The `decodeUriComponent('%0D%0A')` is how you create a line break (carriage return + line feed) in a Power Automate expression.

> **WATCH OUT**: The Whisper API multipart body requires the actual binary file content to be included. Power Automate's HTTP action can handle this, but constructing a true multipart body with binary data is complex. For a simpler approach, we will use the HTTP action's built-in form-data support instead.

## Step 4.7: Call the OpenAI Whisper API

WHERE AM I?: Power Automate > Flow Editor > Below Build_Multipart_Text_Parts

1. Click + -> Add an action -> search for "HTTP" -> select HTTP (the premium connector with the blue globe icon).

2. Configure the HTTP action:

   - Method: Select POST from the dropdown.
   - URI: https://api.openai.com/v1/audio/transcriptions
   - Headers (click + Add new parameter -> check Headers):
     - Header 1: Key = Authorization | Value = type Bearer followed by a space, then click the lightning bolt (dynamic content) icon -> under Get_OpenAI_Key, select Outputs. The full value reads: Bearer [dynamic content from Get_OpenAI_Key]
     - Header 2: Key = Content-Type | Value = multipart/form-data; boundary=boundary123
   - Body: Click in the Body field. We need to construct the multipart body. Click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('--boundary123', decodeUriComponent('%0D%0A'), 'Content-Disposition: form-data; name="model"', decodeUriComponent('%0D%0A'), decodeUriComponent('%0D%0A'), 'whisper-1', decodeUriComponent('%0D%0A'), '--boundary123', decodeUriComponent('%0D%0A'), 'Content-Disposition: form-data; name="response_format"', decodeUriComponent('%0D%0A'), decodeUriComponent('%0D%0A'), 'verbose_json', decodeUriComponent('%0D%0A'), '--boundary123', decodeUriComponent('%0D%0A'), 'Content-Disposition: form-data; name="language"', decodeUriComponent('%0D%0A'), decodeUriComponent('%0D%0A'), triggerBody()?['language'], decodeUriComponent('%0D%0A'), '--boundary123', decodeUriComponent('%0D%0A'), 'Content-Disposition: form-data; name="file"; filename="audio.mp3"', decodeUriComponent('%0D%0A'), 'Content-Type: audio/mpeg', decodeUriComponent('%0D%0A'), decodeUriComponent('%0D%0A'), base64ToBinary(body('Get_File_Content')?['$content']), decodeUriComponent('%0D%0A'), '--boundary123--')
```

3. Click OK.

> **WATCH OUT**: The multipart body construction with binary file content is the most complex part of this flow. If the expression above causes errors, use the alternative approach in Step 4.7a below.

4. Set the timeout: Click the three dots (...) on the HTTP action -> Settings -> scroll to Networking -> set Timeout to PT120S -> click Done.

5. Secure this action: Click the three dots (...) -> Settings -> scroll to Security -> toggle Secure Inputs to On -> click Done.

6. Rename this action to: HTTP_Whisper

## Step 4.7a: Alternative Approach -- Simplified Whisper API Call

WHERE AM I?: Power Automate > Flow Editor > HTTP_Whisper action

> **BEGINNER TIP**: If the multipart body construction in Step 4.7 causes errors, use this simpler alternative. Delete the HTTP_Whisper action and replace it with the following approach that uses a SharePoint HTTP request to get the file, then passes it to Whisper.

**Alternative: Use "Send an HTTP request to SharePoint" to get file content, then a standard HTTP action:**

1. Delete the HTTP_Whisper action if it has errors.

2. Click + -> Add an action -> search for "Send an HTTP request to SharePoint" -> select it (under SharePoint connector).

3. Configure:
   - Site Address: Select your SharePoint site.
   - Method: GET
   - Uri: Click the lightning bolt -> select file_url from the trigger. This should be the relative path like: /sites/ResearchHub/Shared Documents/Transcripts/Audio Files/myfile.mp3

4. Rename to: Get_File_Binary

5. Now add the HTTP action for Whisper. Click + -> Add an action -> search for "HTTP" -> select HTTP.

6. Configure:
   - Method: POST
   - URI: https://api.openai.com/v1/audio/transcriptions
   - Headers:
     - Key = Authorization | Value = Bearer [dynamic content from Get_OpenAI_Key outputs]
   - Body: Click the lightning bolt -> select Body from Get_File_Binary
   - Click + Add new parameter -> check Queries:
     - Key = model | Value = whisper-1
     - Key = response_format | Value = verbose_json
     - Key = language | Value = click lightning bolt -> select language from trigger

> **WATCH OUT**: The Whisper API strictly requires multipart/form-data. The query parameter approach above will NOT work with the Whisper API. If you encounter issues with the multipart body construction, the most reliable approach is to use an Azure Function or a custom connector as an intermediary that handles the multipart encoding. For this recipe, we proceed with the multipart body approach from Step 4.7.

## Step 4.8: Parse the Whisper API Response

WHERE AM I?: Power Automate > Flow Editor > Below HTTP_Whisper

1. Click + -> Add an action -> search for "Parse JSON" -> select Parse JSON (under "Data Operations").

2. Configure:
   - Content: Click the lightning bolt (dynamic content) -> select Body from HTTP_Whisper.
   - Schema: Click "Generate from sample" and paste this sample JSON:

```json
{
  "task": "transcribe",
  "language": "english",
  "duration": 754.32,
  "text": "This is the full transcript text of the audio file.",
  "segments": [
    {
      "id": 0,
      "seek": 0,
      "start": 0.0,
      "end": 5.2,
      "text": "This is the first segment.",
      "tokens": [50364, 639, 307],
      "temperature": 0.0,
      "avg_logprob": -0.25,
      "compression_ratio": 1.1,
      "no_speech_prob": 0.01
    }
  ]
}
```

3. Click Done. The Parse JSON action now provides all fields as dynamic content in subsequent steps.

4. Rename this action to: Parse_Whisper_Response

## Step 4.9: Extract the Full Transcript Text

WHERE AM I?: Power Automate > Flow Editor > Below Parse_Whisper_Response

1. Click + -> Add an action -> search for "Set variable" -> select Set variable.

2. Configure:
   - Name: Select varTranscriptText from the dropdown.
   - Value: Click the lightning bolt -> from Parse_Whisper_Response, select text.

3. Rename to: Set_varTranscriptText

## Step 4.10: Extract Duration and Calculate Word Count

WHERE AM I?: Power Automate > Flow Editor > Below Set_varTranscriptText

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat(string(div(int(string(body('Parse_Whisper_Response')?['duration'])), 3600)), ':', formatNumber(mod(div(int(string(body('Parse_Whisper_Response')?['duration'])), 60), 60), '00'), ':', formatNumber(mod(int(string(body('Parse_Whisper_Response')?['duration'])), 60), '00'))
```

3. Click OK. This converts the duration in seconds (e.g., 754.32) to HH:MM:SS format (e.g., 0:12:34).

4. Rename to: Format_Duration

5. Click + -> Add an action -> Set variable:
   - Name: Select varDuration
   - Value: Click the lightning bolt -> select Outputs from Format_Duration

6. Rename to: Set_varDuration

7. Click + -> Add an action -> Compose:
   - Inputs: Click fx and paste:

**COPY-PASTE** into the Expression field:
```
length(split(body('Parse_Whisper_Response')?['text'], ' '))
```

8. Click OK. This counts the number of words by splitting the text on spaces.

9. Rename to: Calculate_Word_Count

10. Click + -> Add an action -> Set variable:
    - Name: Select varWordCount
    - Value: Click the lightning bolt -> select Outputs from Calculate_Word_Count

11. Rename to: Set_varWordCount

12. Click + -> Add an action -> Set variable:
    - Name: Select varDetectedLanguage
    - Value: Click the lightning bolt -> from Parse_Whisper_Response, select language

13. Rename to: Set_varDetectedLanguage

## Step 4.11: Format Output Based on Requested Format

WHERE AM I?: Power Automate > Flow Editor > Below Set_varDetectedLanguage

1. Click + -> Add an action -> search for "Switch" -> select Switch (under "Control").

2. In the On field, click the lightning bolt and select output_format from the trigger inputs.

3. The Switch action creates a default case. Click the + icon on the left side of the Switch to add cases. You need 3 cases plus the default.

**Case 1 -- Plain Text:**

4. Click the first case. In the Equals field, type exactly: plain_text

5. Inside this case, click + -> Add an action -> Compose.

6. In the Inputs field, click the lightning bolt -> select the variable varTranscriptText (from the Set_varTranscriptText step).

7. Rename to: Format_Plain_Text

> **BEGINNER TIP**: For plain text, we simply pass through the raw transcript text. No additional formatting is needed unless timestamps are requested.

**Case 2 -- SRT:**

8. Click the + on the Switch to add a new case. In the Equals field, type: srt

9. Inside this case, we need to build SRT format from the segments. Click + -> Add an action -> search for "Select" -> select Select (under "Data Operations").

10. Configure:
    - From: Click the lightning bolt -> from Parse_Whisper_Response, select segments.
    - Map mode: Click the toggle to switch from "Automatic" to "Manual" (click the small T icon on the right).
    - Map: Click in the field and click fx (Expression tab). Paste:

**COPY-PASTE** into the Expression field:
```
concat(string(add(item()?['id'], 1)), decodeUriComponent('%0D%0A'), formatNumber(div(item()?['start'], 3600), '00'), ':', formatNumber(mod(div(item()?['start'], 60), 60), '00'), ':', formatNumber(mod(item()?['start'], 60), '00'), ',000 --> ', formatNumber(div(item()?['end'], 3600), '00'), ':', formatNumber(mod(div(item()?['end'], 60), 60), '00'), ':', formatNumber(mod(item()?['end'], 60), '00'), ',000', decodeUriComponent('%0D%0A'), item()?['text'], decodeUriComponent('%0D%0A'))
```

11. Click OK.

12. Rename to: Build_SRT_Segments

13. Below the Select action, click + -> Add an action -> Compose.

14. In the Inputs field, click fx and paste:

**COPY-PASTE** into the Expression field:
```
join(body('Build_SRT_Segments'), decodeUriComponent('%0D%0A'))
```

15. Click OK.

16. Rename to: Format_SRT_Output

17. Click + -> Add an action -> Set variable:
    - Name: Select varTranscriptText
    - Value: Click the lightning bolt -> select Outputs from Format_SRT_Output

18. Rename to: Set_SRT_Text

**Case 3 -- VTT:**

19. Click the + on the Switch to add a new case. In the Equals field, type: vtt

20. Inside this case, click + -> Add an action -> Select (Data Operations).

21. Configure:
    - From: Click the lightning bolt -> from Parse_Whisper_Response, select segments.
    - Map mode: Switch to Manual.
    - Map: Click fx and paste:

**COPY-PASTE** into the Expression field:
```
concat(formatNumber(div(item()?['start'], 3600), '00'), ':', formatNumber(mod(div(item()?['start'], 60), 60), '00'), ':', formatNumber(mod(item()?['start'], 60), '00'), '.000 --> ', formatNumber(div(item()?['end'], 3600), '00'), ':', formatNumber(mod(div(item()?['end'], 60), 60), '00'), ':', formatNumber(mod(item()?['end'], 60), '00'), '.000', decodeUriComponent('%0D%0A'), item()?['text'], decodeUriComponent('%0D%0A'))
```

22. Click OK.

23. Rename to: Build_VTT_Segments

24. Below the Select action, click + -> Add an action -> Compose.

25. In the Inputs field, click fx and paste:

**COPY-PASTE** into the Expression field:
```
concat('WEBVTT', decodeUriComponent('%0D%0A'), decodeUriComponent('%0D%0A'), join(body('Build_VTT_Segments'), decodeUriComponent('%0D%0A')))
```

26. Click OK.

27. Rename to: Format_VTT_Output

28. Click + -> Add an action -> Set variable:
    - Name: Select varTranscriptText
    - Value: Click the lightning bolt -> select Outputs from Format_VTT_Output

29. Rename to: Set_VTT_Text

**Default Case:**

30. In the Default case, click + -> Add an action -> Compose.

31. In the Inputs field, click the lightning bolt -> select the variable varTranscriptText.

32. Rename to: Format_Default_Plain_Text

> **BEGINNER TIP**: The default case handles any unrecognized format value by falling back to plain text. This ensures the flow never fails due to an unexpected format parameter.

## Step 4.12: Determine File Extension and Save to SharePoint

WHERE AM I?: Power Automate > Flow Editor > Below the Switch control

1. Below the entire Switch control (outside and after it), click + -> Add an action -> Compose.

2. In the Inputs field, click fx and paste:

**COPY-PASTE** into the Expression field:
```
if(equals(triggerBody()?['output_format'], 'srt'), '.srt', if(equals(triggerBody()?['output_format'], 'vtt'), '.vtt', '.txt'))
```

3. Click OK.

4. Rename to: Determine_File_Extension

5. Click + -> Add an action -> Compose.

6. In the Inputs field, click fx and paste:

**COPY-PASTE** into the Expression field:
```
if(equals(triggerBody()?['output_format'], 'srt'), 'SRT', if(equals(triggerBody()?['output_format'], 'vtt'), 'VTT', 'Plain Text'))
```

7. Click OK.

8. Rename to: Determine_Subfolder

9. Click + -> Add an action -> search for "Create file" -> select Create file (under "SharePoint").

10. Configure:
    - Site Address: Select your SharePoint site from the dropdown (or paste https://yourcompany.sharepoint.com/sites/ResearchHub).
    - Folder Path: Click the folder icon. You need to build a dynamic path. Click in the field, type: /Shared Documents/Transcripts/ then click the lightning bolt -> select Outputs from Determine_Subfolder.
    - File Name: Click fx and paste:

**COPY-PASTE** into the Expression field:
```
concat('transcript_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), outputs('Determine_File_Extension'))
```

11. Click OK.

    - File Content: Click the lightning bolt -> select the variable varTranscriptText.

12. Rename to: Save_Transcript_to_SharePoint

## Step 4.13: Set Status and Return Results to Agent

WHERE AM I?: Power Automate > Flow Editor > Below Save_Transcript_to_SharePoint

1. Click + -> Add an action -> Set variable:
   - Name: Select varStatus
   - Value: Type: completed

2. Rename to: Set_Status_Completed

3. Click + -> Add an action -> search for "Respond to Copilot" -> select Respond to Copilot (or "Return value(s) to Power Virtual Agents" -- same thing, different label depending on your version).

4. Click + Add an output three times to create three outputs:

**Output 1:**
- Type: Text
- Name: transcript_text
- Value: Click the lightning bolt -> select the variable varTranscriptText

**Output 2:**
- Type: Text
- Name: duration
- Value: Click the lightning bolt -> select the variable varDuration

**Output 3:**
- Type: Text
- Name: status
- Value: Click the lightning bolt -> select the variable varStatus

5. Verify the Asynchronous Response toggle is OFF: Click the Respond to Copilot action -> click the three dots (...) -> Settings -> Networking -> ensure "Asynchronous Response" is toggled Off -> click Done.

6. Click Save at the top of the flow editor. Wait for the green "Your flow is ready" banner.

## Step 4.14: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Initialize_varTranscriptText | Initialize variable | String, empty |
| 2 | Initialize_varDuration | Initialize variable | String, empty |
| 3 | Initialize_varWordCount | Initialize variable | Integer, 0 |
| 4 | Initialize_varDetectedLanguage | Initialize variable | String, empty |
| 5 | Initialize_varStatus | Initialize variable | String, "processing" |
| 6 | Get_OpenAI_Key | Compose | API key (Secure Inputs/Outputs ON) |
| 7 | Get_File_Content | SharePoint Get file content | file_url from trigger |
| 8 | HTTP_Whisper | HTTP POST | multipart/form-data to api.openai.com, PT120S timeout |
| 9 | Parse_Whisper_Response | Parse JSON | Schema from verbose_json sample |
| 10 | Set_varTranscriptText | Set variable | text from parsed response |
| 11 | Format_Duration | Compose | Seconds to HH:MM:SS conversion |
| 12 | Set_varDuration | Set variable | Formatted duration string |
| 13 | Calculate_Word_Count | Compose | split(text, ' ') length |
| 14 | Set_varWordCount | Set variable | Word count integer |
| 15 | Set_varDetectedLanguage | Set variable | language from parsed response |
| 16 | Switch (output_format) | Switch | 3 cases: plain_text, srt, vtt |
| 17 | Format_Plain_Text | Compose (Case 1) | Pass-through transcript text |
| 18 | Build_SRT_Segments | Select (Case 2) | Map segments to SRT format |
| 19 | Format_SRT_Output | Compose (Case 2) | Join SRT segments |
| 20 | Set_SRT_Text | Set variable (Case 2) | Update varTranscriptText |
| 21 | Build_VTT_Segments | Select (Case 3) | Map segments to VTT format |
| 22 | Format_VTT_Output | Compose (Case 3) | Prepend WEBVTT header, join |
| 23 | Set_VTT_Text | Set variable (Case 3) | Update varTranscriptText |
| 24 | Format_Default_Plain_Text | Compose (Default) | Fallback plain text |
| 25 | Determine_File_Extension | Compose | .srt / .vtt / .txt |
| 26 | Determine_Subfolder | Compose | SRT / VTT / Plain Text |
| 27 | Save_Transcript_to_SharePoint | SharePoint Create file | Dynamic folder + filename |
| 28 | Set_Status_Completed | Set variable | "completed" |
| 29 | Respond to Copilot | Return values | transcript_text, duration, status |

## Step 4.15: Wire the Flow to the Transcription Request Topic

WHERE AM I?: Copilot Studio > Topics > Transcription Request > Node 8 (Action placeholder)

Now that the flow is built and saved, return to the Transcription Request topic to replace the placeholder with a real Action node.

1. Go back to your Copilot Studio tab. Open the Video Transcription Assistant agent.

2. Click Topics -> Custom -> click Transcription Request to open it.

3. Find the placeholder Message node (Node 8) that says "[ACTION PLACEHOLDER]...".

4. Delete this node: click the three dots (...) on the node -> Delete.

5. Click the + button where the placeholder was.

6. Select Add a tool. A panel opens showing available tools and flows.

7. Find Transcribe Audio File in the list. Click it. A new Action node appears in the topic.

8. Map each input parameter:
   - file_url: Click the dropdown -> for now, type a placeholder value like "attachment_url" (in a production implementation, you would pass the Teams attachment URL from a system variable or a preceding Question node that captures the file path).
   - language: Type: en
   - output_format: Click the dropdown -> select Topic.varOutputFormat
   - include_timestamps: Click the dropdown -> select Topic.varIncludeTimestamps

9. The Action node shows output parameters. Click each output to capture it into a topic variable:
   - transcript_text: Click -> Create a new variable -> name it varTranscriptText -> scope remains Topic
   - duration: Click -> Create a new variable -> name it varDuration -> scope remains Topic
   - status: Click -> Create a new variable -> name it varStatus -> scope remains Topic

10. Click Save.

> **VERIFY**: The Action node should show the flow name "Transcribe Audio File" with all four inputs mapped and three outputs captured into topic variables.

---

# PHASE 5: Register Transcribe Audio File -- TOOL REGISTRATION

Registering the flow as an agent-level tool allows the generative orchestrator to call it autonomously when it determines the user wants a transcription, even outside the Transcription Request topic.

## Step 5.1: Register the Transcribe Audio File Flow as a Tool

WHERE AM I?: Copilot Studio > Agent Overview > Tools section > Add a tool

1. Go back to Copilot Studio -> open your Video Transcription Assistant agent.

2. On the Overview page, find the Tools section. Click Add a tool.

3. In the tool picker, click Power Automate flows (or Flows depending on your view).

4. Find Transcribe Audio File in the list -> click it -> click Add and configure.

5. On the configuration screen:
   - Name: Transcribe Audio File
   - Description (this is what the AI orchestrator reads to decide when to call this tool): Transcribes an uploaded audio or video file using the OpenAI Whisper API. Call this tool when the user uploads a media file and wants it converted to text. Supports plain text, SRT, and VTT output formats. Does NOT handle YouTube URLs.

6. Map the inputs:
   - file_url -> Set to "From agent" (the orchestrator will fill this from conversation context)
   - language -> Set default value: en
   - output_format -> Set to "From agent" (the orchestrator will determine from context)
   - include_timestamps -> Set to "From agent"

7. Under Completion, select "Write response with generative AI" -- this lets the agent craft a natural response using the flow's output data.

8. Click Save.

> **VERIFY**: The Transcribe Audio File tool appears in the Tools section of the Overview page with the description you entered.

---

# PHASE 6: Format Selection -- TOPIC BUILD (node-by-node: 5 nodes)

This topic helps users understand and choose the optimal transcript output format based on their use case. It does not call any flows -- it is purely conversational.

## Step 6.1: Create the Format Selection Topic

WHERE AM I?: Copilot Studio > Topics tab > Custom subtab > + Add a topic > From blank

1. Click the Topics tab -> Custom subtab -> + Add a topic -> From blank.

2. Rename the topic to: Format Selection

3. Click the Description field. Type: User wants to choose or change the output format of a transcription. Route here when the user mentions SRT, VTT, subtitles, captions, plain text format, or asks about available transcript formats. Does NOT handle actual transcription processing or file downloads.

## Step 6.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Topics > Format Selection > Trigger node

1. In the Trigger node, add these trigger phrases (press Enter after each one):
   - choose transcript format
   - SRT format
   - VTT subtitles
   - plain text output
   - transcript format options
   - change output format
   - what formats are available
   - which format should I use
   - help me pick a format
   - subtitle format options

## Step 6.3: Build Node 1 -- Message -- "Format Options Explanation"

WHERE AM I?: Copilot Studio > Topics > Format Selection > Canvas (below Trigger node)

1. Click the + button below the Trigger node -> Send a message.

2. In the message text, type:

```
Here are the three transcript output formats I support:

PLAIN TEXT (.txt)
-- Clean, readable text without any timing information
-- Best for: Research analysis, meeting notes, reading, copy-pasting into documents
-- Example: "Good morning everyone. Let us start with the quarterly review."

SRT -- SubRip Subtitle (.srt)
-- Industry-standard subtitle format with sequence numbers and timestamps
-- Best for: Adding subtitles to videos in most video players (VLC, YouTube, Premiere Pro)
-- Example:
  1
  00:00:00,000 --> 00:00:05,200
  Good morning everyone.

VTT -- WebVTT Caption (.vtt)
-- Web-native caption format designed for HTML5 video elements
-- Best for: Embedding captions in web pages, online courses, streaming platforms
-- Example:
  WEBVTT
  00:00:00.000 --> 00:00:05.200
  Good morning everyone.

Which format works best for your needs?
```

3. Click Save.

## Step 6.4: Build Node 2 -- Question -- "Current Use Case"

WHERE AM I?: Copilot Studio > Topics > Format Selection > Canvas (below Message node)

1. Click the + button -> Ask a question.

2. In the question text, type: What will you be using the transcript for?

3. Under "Identify", select Multiple choice options.

4. Fill in four options:
   - Option 1: Research and analysis
   - Option 2: Video subtitles
   - Option 3: Web captions
   - Option 4: General reading

5. Click the output variable name -> in the Variable properties panel:
   - Under Variable name, change it to: varUseCase
   - Scope remains Topic.

6. Click Save.

## Step 6.5: Build Node 3 -- Condition -- "Recommend Format by Use Case"

WHERE AM I?: Copilot Studio > Topics > Format Selection > Canvas (below Question node)

1. Click the + button -> Add a condition -> Branch based on a condition.

2. In the "If" condition:
   - Select Topic.varUseCase -> is equal to -> Research and analysis

3. Click + Add else if condition (this adds another branch):
   - Select Topic.varUseCase -> is equal to -> Video subtitles

4. Click + Add else if condition again:
   - Select Topic.varUseCase -> is equal to -> Web captions

5. The "Else" branch handles "General reading" and any other value.

**Inside the "Research and analysis" branch:**

6. Click + -> Send a message. Type:

```
For research and analysis, I recommend Plain Text format.

Why: Plain text gives you clean, unformatted text that is easy to search, copy into documents, and process with text analysis tools. If you also want to reference specific moments in the audio, I recommend enabling timestamps -- they will appear as inline markers like [00:05:23] throughout the text.

Recommended settings:
-- Format: Plain Text
-- Timestamps: Yes (for citation references)
```

**Inside the "Video subtitles" branch:**

7. Click + -> Send a message. Type:

```
For video subtitles, I recommend SRT (SubRip) format.

Why: SRT is the most widely supported subtitle format. It works with virtually every video player (VLC, Windows Media Player), video editing software (Premiere Pro, DaVinci Resolve, Final Cut Pro), and online platforms (YouTube, Vimeo). Each subtitle entry includes a sequence number, start/end timestamps, and the text.

Recommended settings:
-- Format: SRT
-- Timestamps: Included automatically (required for SRT)
```

**Inside the "Web captions" branch:**

8. Click + -> Send a message. Type:

```
For web captions, I recommend VTT (WebVTT) format.

Why: WebVTT is the native caption format for HTML5 video elements. It is supported by all modern browsers and is the standard for web-based video players, online courses (Coursera, Udemy), and streaming platforms. VTT also supports styling options like text positioning and color that SRT does not.

Recommended settings:
-- Format: VTT
-- Timestamps: Included automatically (required for VTT)
```

**Inside the "Else" branch (General reading and other):**

9. Click + -> Send a message. Type:

```
For general reading, I recommend Plain Text format without timestamps.

Why: Plain text without timestamps gives you the cleanest, most readable version of the transcript. It reads like a document rather than a technical file. You can easily copy it into Word, Google Docs, or any text editor.

Recommended settings:
-- Format: Plain Text
-- Timestamps: No
```

10. Click Save.

## Step 6.6: Build Node 4 -- Message -- "Format Recommendation" (merged after condition)

WHERE AM I?: Copilot Studio > Topics > Format Selection > Canvas (after condition branches merge)

1. After the condition branches merge, click the + button -> Send a message.

2. In the message text, type:

```
Would you like to proceed with the recommended format, or would you prefer a different one?

You can also request your transcript in multiple formats -- I will generate all of them from the same transcription.

Type "transcribe" to start a new transcription with your chosen format, or type "download" to retrieve an existing transcript.
```

3. Click Save.

## Step 6.7: Build Node 5 -- Question -- "Confirm Format Choice"

WHERE AM I?: Copilot Studio > Topics > Format Selection > Canvas (below Message node)

1. Click the + button -> Ask a question.

2. In the question text, type: Which format would you like to use?

3. Under "Identify", select Multiple choice options.

4. Fill in three options:
   - Option 1: Plain Text
   - Option 2: SRT
   - Option 3: VTT

5. Click the output variable name -> in the Variable properties panel:
   - Under Variable name, change it to: varConfirmedFormat
   - Under Usage, select "Global (any topic can access)". The variable name automatically becomes Global.varConfirmedFormat. This allows the Transcription Request topic to use this format choice.

6. Click Save.

## Step 6.8: Complete YAML for Format Selection Topic

WHERE AM I?: Copilot Studio > Topics > Format Selection > (...) menu > Open code editor

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Format Selection
    triggerQueries:
      - choose transcript format
      - SRT format
      - VTT subtitles
      - plain text output
      - transcript format options
      - change output format
      - what formats are available
      - which format should I use
      - help me pick a format
      - subtitle format options
  actions:
    - kind: SendMessage
      id: formatOptionsExplanation
      message: |-
        Here are the three transcript output formats I support:

        PLAIN TEXT (.txt)
        -- Clean, readable text without any timing information
        -- Best for: Research analysis, meeting notes, reading, copy-pasting into documents
        -- Example: "Good morning everyone. Let us start with the quarterly review."

        SRT -- SubRip Subtitle (.srt)
        -- Industry-standard subtitle format with sequence numbers and timestamps
        -- Best for: Adding subtitles to videos in most video players (VLC, YouTube, Premiere Pro)
        -- Example:
          1
          00:00:00,000 --> 00:00:05,200
          Good morning everyone.

        VTT -- WebVTT Caption (.vtt)
        -- Web-native caption format designed for HTML5 video elements
        -- Best for: Embedding captions in web pages, online courses, streaming platforms
        -- Example:
          WEBVTT
          00:00:00.000 --> 00:00:05.200
          Good morning everyone.

        Which format works best for your needs?

    - kind: Question
      id: currentUseCase
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varUseCase
      prompt: "What will you be using the transcript for?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: research
              displayName: Research and analysis
            - id: subtitles
              displayName: Video subtitles
            - id: web
              displayName: Web captions
            - id: reading
              displayName: General reading

    - kind: ConditionGroup
      id: recommendFormatByUseCase
      conditions:
        - id: isResearch
          condition: =Topic.varUseCase = "research"
          actions:
            - kind: SendMessage
              id: recommendPlainTextResearch
              message: |-
                For research and analysis, I recommend Plain Text format.

                Why: Plain text gives you clean, unformatted text that is easy to search, copy into documents, and process with text analysis tools. If you also want to reference specific moments in the audio, I recommend enabling timestamps -- they will appear as inline markers like [00:05:23] throughout the text.

                Recommended settings:
                -- Format: Plain Text
                -- Timestamps: Yes (for citation references)
        - id: isSubtitles
          condition: =Topic.varUseCase = "subtitles"
          actions:
            - kind: SendMessage
              id: recommendSRT
              message: |-
                For video subtitles, I recommend SRT (SubRip) format.

                Why: SRT is the most widely supported subtitle format. It works with virtually every video player (VLC, Windows Media Player), video editing software (Premiere Pro, DaVinci Resolve, Final Cut Pro), and online platforms (YouTube, Vimeo). Each subtitle entry includes a sequence number, start/end timestamps, and the text.

                Recommended settings:
                -- Format: SRT
                -- Timestamps: Included automatically (required for SRT)
        - id: isWebCaptions
          condition: =Topic.varUseCase = "web"
          actions:
            - kind: SendMessage
              id: recommendVTT
              message: |-
                For web captions, I recommend VTT (WebVTT) format.

                Why: WebVTT is the native caption format for HTML5 video elements. It is supported by all modern browsers and is the standard for web-based video players, online courses (Coursera, Udemy), and streaming platforms. VTT also supports styling options like text positioning and color that SRT does not.

                Recommended settings:
                -- Format: VTT
                -- Timestamps: Included automatically (required for VTT)
      elseActions:
        - kind: SendMessage
          id: recommendPlainTextReading
          message: |-
            For general reading, I recommend Plain Text format without timestamps.

            Why: Plain text without timestamps gives you the cleanest, most readable version of the transcript. It reads like a document rather than a technical file. You can easily copy it into Word, Google Docs, or any text editor.

            Recommended settings:
            -- Format: Plain Text
            -- Timestamps: No

    - kind: SendMessage
      id: formatRecommendation
      message: |-
        Would you like to proceed with the recommended format, or would you prefer a different one?

        You can also request your transcript in multiple formats -- I will generate all of them from the same transcription.

        Type "transcribe" to start a new transcription with your chosen format, or type "download" to retrieve an existing transcript.

    - kind: Question
      id: confirmFormatChoice
      interruptionPolicy:
        allowInterruption: true
      variable: init:Global.varConfirmedFormat
      prompt: "Which format would you like to use?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: plain_text
              displayName: Plain Text
            - id: srt
              displayName: SRT
            - id: vtt
              displayName: VTT

    - kind: EndDialog
      id: endFormatSelection
```

---

# PHASE 7: Download Transcript -- TOPIC BUILD (node-by-node: 6 nodes)

This topic retrieves completed transcripts from SharePoint, previews the first 200 words with metadata, and offers follow-up actions like reformatting, emailing, or starting a new transcription.

## Step 7.1: Create the Download Transcript Topic

WHERE AM I?: Copilot Studio > Topics tab > Custom subtab > + Add a topic > From blank

1. Click the Topics tab -> Custom subtab -> + Add a topic -> From blank.

2. Rename the topic to: Download Transcript

3. Click the Description field. Type: User wants to download, view, or share a completed transcript. Route here when the user asks for the output file, download link, wants to save to SharePoint, or requests the transcript be sent via email. Does NOT handle new transcription requests or format selection advice.

## Step 7.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Topics > Download Transcript > Trigger node

1. In the Trigger node, add these trigger phrases:
   - download transcript
   - get transcript file
   - save transcript
   - send transcript by email
   - transcript download link
   - show my transcript
   - where is my transcript
   - retrieve completed transcript
   - view transcript results
   - get my transcription

## Step 7.3: Build Node 1 -- Message -- "Transcript Ready Notification"

WHERE AM I?: Copilot Studio > Topics > Download Transcript > Canvas (below Trigger node)

1. Click the + button below the Trigger node -> Send a message.

2. In the message text, type:

```
Let me retrieve your completed transcript from the Transcripts Library.

Your transcripts are stored in SharePoint at:
/sites/ResearchHub/Shared Documents/Transcripts/

Each transcript includes metadata such as:
-- Audio duration
-- Word count
-- Detected language
-- Output format
-- Transcription date

One moment while I look up your files.
```

3. Click Save.

## Step 7.4: Build Node 2 -- Action -- "Retrieve Transcript Files"

WHERE AM I?: Copilot Studio > Topics > Download Transcript > Canvas (below Message node)

> **BEGINNER TIP**: Since we do not have a dedicated "retrieve files" flow, we will use the agent's knowledge source (SharePoint Transcripts Library) to find transcripts. The generative orchestrator will search the knowledge source automatically when the user asks about their transcripts. For this node, we add a message that prompts the user to specify which transcript they want.

1. Click the + button -> Send a message. Type:

```
I can see the transcripts stored in the library. To help me find the right one, please tell me:

-- The name of the original audio/video file (or part of it)
-- The approximate date you submitted the transcription
-- The output format you requested (Plain Text, SRT, or VTT)

Or simply describe what the transcript is about, and I will search for it.
```

2. Click Save.

## Step 7.5: Build Node 3 -- Adaptive Card -- "Transcript Preview and Download Card"

WHERE AM I?: Copilot Studio > Topics > Download Transcript > Canvas (below Message node)

1. Click the + button -> Send a message.

2. In the message node, click the + (Add) button in the message toolbar -> select Adaptive Card.

3. The Adaptive Card editor opens. Delete any default content and paste this exact JSON:

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
          "text": "TRANSCRIPT READY",
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
          "title": "File",
          "value": "transcript_20260215_143022.txt"
        },
        {
          "title": "Duration",
          "value": "00:12:34"
        },
        {
          "title": "Word Count",
          "value": "2,340 words"
        },
        {
          "title": "Language",
          "value": "English"
        },
        {
          "title": "Format",
          "value": "Plain Text"
        },
        {
          "title": "Transcribed",
          "value": "February 15, 2026"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Preview (first 200 words):",
      "weight": "Bolder",
      "size": "Small",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Good morning everyone. Let us start with the quarterly review. As you can see from the dashboard, our Q4 numbers exceeded projections by twelve percent. The primary driver was the expansion into the European market, which contributed an additional forty-two million in revenue. Looking at the breakdown by region, North America remained our strongest market with sixty-one percent of total revenue, followed by Europe at twenty-three percent and Asia Pacific at sixteen percent. I want to highlight three key achievements this quarter. First, our customer retention rate improved to ninety-four percent, up from eighty-nine percent in Q3. Second, we successfully launched the new product line ahead of schedule. Third, our operational costs decreased by seven percent through the automation initiatives we discussed last quarter. Now let me turn to the challenges we faced...",
      "wrap": true,
      "size": "Small",
      "maxLines": 8
    },
    {
      "type": "TextBlock",
      "text": "NXT Humans | Video Transcription Assistant",
      "size": "Small",
      "isSubtle": true,
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "OPEN IN SHAREPOINT",
      "url": "https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Transcripts/"
    }
  ]
}
```

> **WATCH OUT**: This Adaptive Card uses static placeholder data for the preview. In a production implementation, you would switch to Power Fx formula mode to dynamically populate the FactSet values and preview text from topic variables. For now, this card serves as a template that shows the user what a completed transcript looks like.

> **BEGINNER TIP**: To make this card dynamic in the future: click the (...) menu on the Adaptive Card -> Properties -> click "Formula" to switch to Power Fx mode. Then replace static values with variable references like `Topic.varDuration`. Remember: once you switch to Formula mode, you CANNOT go back to JSON mode. Save a copy of the JSON first.

4. Click Save.

## Step 7.6: Build Node 4 -- Question -- "Additional Actions"

WHERE AM I?: Copilot Studio > Topics > Download Transcript > Canvas (below Adaptive Card)

1. Click the + button -> Ask a question.

2. In the question text, type: What would you like to do next?

3. Under "Identify", select Multiple choice options.

4. Fill in four options:
   - Option 1: Generate in another format
   - Option 2: Send via email
   - Option 3: Start a new transcription
   - Option 4: I am done

5. Click the output variable name -> in the Variable properties panel:
   - Under Variable name, change it to: varAdditionalAction
   - Scope remains Topic.

6. Click Save.

## Step 7.7: Build Node 5 -- Condition -- "Route Additional Action"

WHERE AM I?: Copilot Studio > Topics > Download Transcript > Canvas (below Question node)

1. Click the + button -> Add a condition -> Branch based on a condition.

2. In the "If" condition:
   - Select Topic.varAdditionalAction -> is equal to -> Generate in another format

3. Click + Add else if condition:
   - Select Topic.varAdditionalAction -> is equal to -> Send via email

4. Click + Add else if condition:
   - Select Topic.varAdditionalAction -> is equal to -> Start a new transcription

**Inside the "Generate in another format" branch:**

5. Click + -> Send a message. Type:

```
Let me help you choose a different format for your transcript. I will redirect you to the Format Selection guide.
```

6. Click + -> Topic management -> Go to another topic -> select Format Selection.

**Inside the "Send via email" branch:**

7. Click + -> Send a message. Type:

```
I will send the transcript to your email address. The file will be attached as a download along with a summary of the transcription metadata.

Please check your inbox shortly. The email will come from the Video Transcription Assistant via Microsoft 365.
```

> **BEGINNER TIP**: In a production implementation, you would add an Action node here that calls a Power Automate flow to send the email with the transcript attached. For this recipe, we use a message to confirm the intent. You can build an email delivery flow as a future enhancement.

**Inside the "Start a new transcription" branch:**

8. This is Node 6 -- the redirect. Click + -> Topic management -> Go to another topic -> select Transcription Request.

**Inside the "Else" branch (I am done):**

9. Click + -> Send a message. Type:

```
Thank you for using the Video Transcription Assistant. Your transcript is saved in SharePoint and available anytime at:
/sites/ResearchHub/Shared Documents/Transcripts/

Have a great day!
```

10. Click Save.

## Step 7.8: Complete YAML for Download Transcript Topic

WHERE AM I?: Copilot Studio > Topics > Download Transcript > (...) menu > Open code editor

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Download Transcript
    triggerQueries:
      - download transcript
      - get transcript file
      - save transcript
      - send transcript by email
      - transcript download link
      - show my transcript
      - where is my transcript
      - retrieve completed transcript
      - view transcript results
      - get my transcription
  actions:
    - kind: SendMessage
      id: transcriptReadyNotification
      message: |-
        Let me retrieve your completed transcript from the Transcripts Library.

        Your transcripts are stored in SharePoint at:
        /sites/ResearchHub/Shared Documents/Transcripts/

        Each transcript includes metadata such as:
        -- Audio duration
        -- Word count
        -- Detected language
        -- Output format
        -- Transcription date

        One moment while I look up your files.

    - kind: SendMessage
      id: retrieveTranscriptPrompt
      message: |-
        I can see the transcripts stored in the library. To help me find the right one, please tell me:

        -- The name of the original audio/video file (or part of it)
        -- The approximate date you submitted the transcription
        -- The output format you requested (Plain Text, SRT, or VTT)

        Or simply describe what the transcript is about, and I will search for it.

    - kind: SendMessage
      id: transcriptPreviewCard
      message: "Your transcript is ready. Please open the SharePoint Transcripts Library to view and download your files."

    - kind: Question
      id: additionalActions
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varAdditionalAction
      prompt: "What would you like to do next?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: reformat
              displayName: Generate in another format
            - id: email
              displayName: Send via email
            - id: new_transcription
              displayName: Start a new transcription
            - id: done
              displayName: I am done

    - kind: ConditionGroup
      id: routeAdditionalAction
      conditions:
        - id: isReformat
          condition: =Topic.varAdditionalAction = "reformat"
          actions:
            - kind: SendMessage
              id: reformatMsg
              message: "Let me help you choose a different format for your transcript. I will redirect you to the Format Selection guide."
            - kind: BeginDialog
              id: redirectToFormatSelection
              dialog: Format Selection
        - id: isEmail
          condition: =Topic.varAdditionalAction = "email"
          actions:
            - kind: SendMessage
              id: emailMsg
              message: |-
                I will send the transcript to your email address. The file will be attached as a download along with a summary of the transcription metadata.

                Please check your inbox shortly. The email will come from the Video Transcription Assistant via Microsoft 365.
        - id: isNewTranscription
          condition: =Topic.varAdditionalAction = "new_transcription"
          actions:
            - kind: BeginDialog
              id: redirectToTranscriptionRequest
              dialog: Transcription Request
      elseActions:
        - kind: SendMessage
          id: doneMsg
          message: |-
            Thank you for using the Video Transcription Assistant. Your transcript is saved in SharePoint and available anytime at:
            /sites/ResearchHub/Shared Documents/Transcripts/

            Have a great day!

    - kind: EndDialog
      id: endDownloadTranscript
```

---

# PHASE 8: Transcribe YouTube Video -- FLOW BUILD (action-by-action)

This flow attempts to retrieve existing YouTube captions via the YouTube Data API v3. If captions are available, it downloads and formats them. If not, it returns a clear message explaining the limitation. Every action is documented individually.

## Step 8.1: Create the Flow

WHERE AM I?: Power Automate > https://make.powerautomate.com > Solutions > Video Transcription Agent Solution

1. Open your Power Automate tab. Navigate to Solutions -> Video Transcription Agent Solution.

2. Click + New -> Automation -> Cloud flow -> Instant.

3. In the dialog:
   - Flow name: Transcribe YouTube Video
   - Trigger: Select "Run a flow from Copilot".

4. Click Create.

## Step 8.2: Configure the Trigger with Input Parameters

WHERE AM I?: Power Automate > Flow Editor > Trigger node

1. Click on the trigger to expand it.

2. Click + Add an input three times:

**Input 1:**
- Click + Add an input -> select Text.
- Input name: youtube_url
- Description: Full YouTube video URL to transcribe

**Input 2:**
- Click + Add an input -> select Text.
- Input name: language
- Description: Preferred language for caption retrieval (e.g., en, es)

**Input 3:**
- Click + Add an input -> select Text.
- Input name: output_format
- Description: Desired transcript format: plain_text, srt, or vtt

## Step 8.3: Initialize Variables

WHERE AM I?: Power Automate > Flow Editor > Below the trigger

1. Click + -> Add an action -> Initialize variable:
   - Name: varTranscriptText
   - Type: String
   - Value: (leave empty)
   - Rename to: Initialize_varTranscriptText

2. Click + -> Add an action -> Initialize variable:
   - Name: varVideoId
   - Type: String
   - Value: (leave empty)
   - Rename to: Initialize_varVideoId

3. Click + -> Add an action -> Initialize variable:
   - Name: varStatus
   - Type: String
   - Value: processing
   - Rename to: Initialize_varStatus

4. Click + -> Add an action -> Initialize variable:
   - Name: varDuration
   - Type: String
   - Value: unknown
   - Rename to: Initialize_varDuration

## Step 8.4: Retrieve the Google API Key

WHERE AM I?: Power Automate > Flow Editor > Below Initialize variables

1. Click + -> Add an action -> Compose.

2. In the Inputs field, paste your Google API key.

3. Secure this action: Click (...) -> Settings -> Security -> Secure Inputs: On -> Secure Outputs: On -> Done.

4. Rename to: Get_Gemini_Key

## Step 8.5: Extract the YouTube Video ID from the URL

WHERE AM I?: Power Automate > Flow Editor > Below Get_Gemini_Key

1. Click + -> Add an action -> Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
if(contains(triggerBody()?['youtube_url'], 'v='), first(split(last(split(triggerBody()?['youtube_url'], 'v=')), '&')), if(contains(triggerBody()?['youtube_url'], 'youtu.be/'), first(split(last(split(triggerBody()?['youtube_url'], 'youtu.be/')), '?')), triggerBody()?['youtube_url']))
```

3. Click OK.

4. Rename to: Extract_Video_ID

> **BEGINNER TIP**: This expression handles two common YouTube URL formats:
> - https://www.youtube.com/watch?v=dQw4w9WgXcQ -> extracts dQw4w9WgXcQ
> - https://youtu.be/dQw4w9WgXcQ -> extracts dQw4w9WgXcQ
> It splits the URL on "v=" or "youtu.be/" and takes the video ID portion.

5. Click + -> Add an action -> Set variable:
   - Name: Select varVideoId
   - Value: Click the lightning bolt -> select Outputs from Extract_Video_ID

6. Rename to: Set_varVideoId

## Step 8.6: Call the YouTube Data API v3 to List Captions

WHERE AM I?: Power Automate > Flow Editor > Below Set_varVideoId

1. Click + -> Add an action -> HTTP.

2. Configure:
   - Method: GET
   - URI: Click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=', variables('varVideoId'), '&key=', outputs('Get_Gemini_Key'))
```

3. Click OK.

   - Headers:
     - Key = Accept | Value = application/json

4. Set timeout: Click (...) -> Settings -> Networking -> Timeout: PT120S -> Done.

5. Secure this action: Click (...) -> Settings -> Security -> Secure Inputs: On -> Done.

6. Rename to: HTTP_YouTube_Captions_List

## Step 8.7: Check If Captions Are Available

WHERE AM I?: Power Automate > Flow Editor > Below HTTP_YouTube_Captions_List

1. Click + -> Add an action -> Compose.

2. In the Inputs field, click fx and paste:

**COPY-PASTE** into the Expression field:
```
length(body('HTTP_YouTube_Captions_List')?['items'])
```

3. Click OK.

4. Rename to: Count_Caption_Tracks

5. Click + -> Add an action -> search for "Condition" -> select Condition (under "Control").

6. Configure the condition:
   - Left side: Click the lightning bolt -> select Outputs from Count_Caption_Tracks
   - Operator: is greater than
   - Right side: 0

7. Rename to: Captions_Available_Check

## Step 8.8: Handle "Captions Available" Path (If Yes)

WHERE AM I?: Power Automate > Flow Editor > Captions_Available_Check > If yes branch

**Inside the "If yes" branch:**

1. Click + -> Add an action -> Compose.

2. In the Inputs field, click fx and paste:

**COPY-PASTE** into the Expression field:
```
first(body('HTTP_YouTube_Captions_List')?['items'])?['id']
```

3. Click OK.

4. Rename to: Get_Caption_Track_ID

> **WATCH OUT**: The YouTube Data API v3 captions.list endpoint returns caption track metadata, but downloading the actual caption content requires OAuth 2.0 authentication (the video owner must authorize access). The API key alone is NOT sufficient to download caption text. This is a known limitation. For videos you own, you can set up OAuth. For public videos, the caption text is not directly downloadable via the API.

5. Click + -> Add an action -> Compose.

6. In the Inputs field, type:

```
YouTube captions were found for this video, but downloading the caption text requires OAuth 2.0 authorization from the video owner. The YouTube Data API v3 does not allow caption text download with an API key alone.

Alternative approaches:
1. If you own this video, you can download captions directly from YouTube Studio (youtube.com/studio -> select video -> Subtitles -> Download).
2. You can use a third-party caption extraction service.
3. Download the audio from the video and upload it here for Whisper transcription.

Caption tracks found for this video:
```

7. Rename to: Caption_Limitation_Message

8. Click + -> Add an action -> Set variable:
   - Name: Select varTranscriptText
   - Value: Click the lightning bolt -> select Outputs from Caption_Limitation_Message

9. Rename to: Set_Caption_Limitation_Text

10. Click + -> Add an action -> Set variable:
    - Name: Select varStatus
    - Value: Type: partial

11. Rename to: Set_Status_Partial

## Step 8.9: Handle "No Captions" Path (If No)

WHERE AM I?: Power Automate > Flow Editor > Captions_Available_Check > If no branch

**Inside the "If no" branch:**

1. Click + -> Add an action -> Compose.

2. In the Inputs field, type:

```
No captions were found for this YouTube video. Unfortunately, direct audio download from YouTube is not supported in this Power Automate flow due to platform limitations.

To transcribe this video, please try one of these alternatives:
1. Download the audio from the YouTube video using a tool like yt-dlp (https://github.com/yt-dlp/yt-dlp) or an online YouTube-to-MP3 converter.
2. Save the audio file as MP3, WAV, or M4A format (max 20 MB).
3. Upload the audio file here and I will transcribe it using the Whisper API.

Type "transcribe" to start a file upload transcription.
```

3. Rename to: No_Captions_Message

4. Click + -> Add an action -> Set variable:
   - Name: Select varTranscriptText
   - Value: Click the lightning bolt -> select Outputs from No_Captions_Message

5. Rename to: Set_No_Captions_Text

6. Click + -> Add an action -> Set variable:
   - Name: Select varStatus
   - Value: Type: no_captions_found

7. Rename to: Set_Status_No_Captions

## Step 8.10: Save Results and Return to Agent

WHERE AM I?: Power Automate > Flow Editor > Below the Condition (after both branches merge)

1. Below the Condition (after both branches merge), click + -> Add an action -> search for "Create file" -> select Create file (SharePoint).

2. Configure:
   - Site Address: Select your SharePoint site.
   - Folder Path: /Shared Documents/Transcripts/Plain Text
   - File Name: Click fx and paste:

**COPY-PASTE** into the Expression field:
```
concat('youtube_', variables('varVideoId'), '_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.txt')
```

3. Click OK.

   - File Content: Click the lightning bolt -> select the variable varTranscriptText.

4. Rename to: Save_YouTube_Transcript

5. Click + -> Add an action -> Respond to Copilot.

6. Click + Add an output three times:

**Output 1:**
- Type: Text
- Name: transcript_text
- Value: Click the lightning bolt -> select the variable varTranscriptText

**Output 2:**
- Type: Text
- Name: duration
- Value: Click the lightning bolt -> select the variable varDuration

**Output 3:**
- Type: Text
- Name: status
- Value: Click the lightning bolt -> select the variable varStatus

7. Verify Asynchronous Response is OFF: Click the Respond to Copilot action -> (...) -> Settings -> Networking -> Asynchronous Response: Off -> Done.

8. Click Save.

## Step 8.11: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Initialize_varTranscriptText | Initialize variable | String, empty |
| 2 | Initialize_varVideoId | Initialize variable | String, empty |
| 3 | Initialize_varStatus | Initialize variable | String, "processing" |
| 4 | Initialize_varDuration | Initialize variable | String, "unknown" |
| 5 | Get_Gemini_Key | Compose | Google API key (Secure Inputs/Outputs ON) |
| 6 | Extract_Video_ID | Compose | Parse v= or youtu.be/ from URL |
| 7 | Set_varVideoId | Set variable | Extracted video ID |
| 8 | HTTP_YouTube_Captions_List | HTTP GET | YouTube Data API v3 captions endpoint, PT120S |
| 9 | Count_Caption_Tracks | Compose | length(items) |
| 10 | Captions_Available_Check | Condition | Count > 0 |
| 11 | Get_Caption_Track_ID | Compose (If yes) | First caption track ID |
| 12 | Caption_Limitation_Message | Compose (If yes) | OAuth limitation explanation |
| 13 | Set_Caption_Limitation_Text | Set variable (If yes) | varTranscriptText |
| 14 | Set_Status_Partial | Set variable (If yes) | "partial" |
| 15 | No_Captions_Message | Compose (If no) | No captions explanation |
| 16 | Set_No_Captions_Text | Set variable (If no) | varTranscriptText |
| 17 | Set_Status_No_Captions | Set variable (If no) | "no_captions_found" |
| 18 | Save_YouTube_Transcript | SharePoint Create file | Dynamic filename with video ID |
| 19 | Respond to Copilot | Return values | transcript_text, duration, status |

---

# PHASE 9: Transcribe YouTube Video -- TOOL REGISTRATION

## Step 9.1: Register the Transcribe YouTube Video Flow as a Tool

WHERE AM I?: Copilot Studio > Agent Overview > Tools section > Add a tool

1. Go back to Copilot Studio -> open your Video Transcription Assistant agent.

2. On the Overview page, find the Tools section. Click Add a tool.

3. Click Power Automate flows -> find Transcribe YouTube Video -> click it -> click Add and configure.

4. On the configuration screen:
   - Name: Transcribe YouTube Video
   - Description: Extracts and transcribes audio from a YouTube URL. First attempts to retrieve existing YouTube captions via the YouTube Data API. If captions are unavailable, provides alternative instructions for the user. Call this tool when the user provides a YouTube URL for transcription. Does NOT handle direct file uploads.

5. Map the inputs:
   - youtube_url -> Set to "From agent"
   - language -> Set default value: en
   - output_format -> Set to "From agent"

6. Under Completion, select "Write response with generative AI".

7. Click Save.

> **VERIFY**: Both tools (Transcribe Audio File and Transcribe YouTube Video) now appear in the Tools section of the Overview page.

---

# PHASE 10: Publish and Deploy to Teams

## Step 10.1: Publish the Agent

WHERE AM I?: Copilot Studio > Agent Overview > Publish button (top of page)

1. In Copilot Studio, click the Publish button at the top of the Overview page.

2. In the confirmation dialog, click Publish again.

3. Wait for the green "Published successfully" banner. This may take 1-2 minutes.

4. Why this matters: The agent must be published before it can be deployed to Teams. Topics and tools only become active in channels after publishing.

## Step 10.2: Deploy to Microsoft Teams

WHERE AM I?: Copilot Studio > Channels tab

1. After publishing, click the Channels tab in the top navigation.

2. Click the "Teams and Microsoft 365 Copilot" tile.

3. Click Add channel.

4. A panel opens. Click "See agent in Teams" -- this opens Microsoft Teams and prompts you to install the agent.

5. In Teams, click Add to install the agent in your chat.

6. To share with your team:
   - Click Availability options in the Copilot Studio channel panel -> Submit for admin approval.
   - Your Teams admin then goes to Teams Admin Center -> Apps -> finds your agent -> clicks Publish.
   - Optional: The admin can create an App Setup Policy to auto-install and pin the agent for specific users or groups.

## Step 10.3: Configure Email Delivery Channel

WHERE AM I?: Copilot Studio > Agent Overview

1. Email delivery is handled through the Power Automate flows (using the Office 365 Outlook connector). No additional channel configuration is needed in Copilot Studio for email -- the flows send emails directly.

2. To add email sending capability to the Transcribe Audio File flow as a future enhancement: add an "Office 365 Outlook - Send an email (V2)" action after the Save_Transcript_to_SharePoint action, with the transcript file attached.

---

# PHASE 11: Testing (5+ Scenarios)

## Step 11.1: Test Scenario 1 -- Conversation Start

WHERE AM I?: Copilot Studio > Test pane (bottom-right corner)

1. Open the Test pane by clicking the "Test your agent" button at the bottom-right of the Copilot Studio page.

2. Click the refresh icon to start a new conversation.

3. The agent should automatically display the welcome message:

**Expected result:**
```
Welcome to the Video Transcription Assistant.

I can help you convert audio and video content into accurate text transcripts.

-> Upload an audio or video file (MP4, MP3, WAV, M4A, WebM, OGG, FLAC -- max 20 MB)
-> Paste a YouTube URL to extract captions or transcribe
-> Type "formats" to learn about output options (Plain Text, SRT, VTT)
-> Type "download" to retrieve a completed transcript

What would you like to transcribe today?
```

4. Verify the Global.DefaultOutputFormat variable is set to "plain_text" and Global.IncludeTimestamps is set to "false" by checking the Variables panel.

> **VERIFY**: The welcome message appears automatically when the conversation starts. If it does not, check the Conversation Start system topic (Step 1.11).

## Step 11.2: Test Scenario 2 -- File Upload Transcription Request

WHERE AM I?: Copilot Studio > Test pane

1. Type: I need to transcribe an audio file

2. The agent should route to the Transcription Request topic and display the welcome message, then ask about input type.

**Expected result:** The agent shows the transcription welcome message and asks "How would you like to provide your content?"

3. Click or type: File Upload

**Expected result:** The agent asks you to upload your file with format and size information.

4. The agent should then ask for output format. Select: Plain Text

5. The agent should ask about timestamps. Select: Yes

6. The agent should display the processing confirmation message.

> **WATCH OUT**: In the test pane, file uploads may not work the same way as in Teams. The test pane has limited file attachment support. Full file upload testing must be done in Teams after deployment (Step 10.2).

## Step 11.3: Test Scenario 3 -- YouTube URL Transcription

WHERE AM I?: Copilot Studio > Test pane

1. Start a new conversation (click refresh).

2. Type: transcribe this YouTube video

3. Select: YouTube URL

4. When asked for the URL, type: https://www.youtube.com/watch?v=dQw4w9WgXcQ

5. The agent should acknowledge the URL and explain it will check for captions.

6. Select output format: SRT

**Expected result:** The flow runs and returns either caption data or the limitation message explaining that OAuth is required for caption download.

## Step 11.4: Test Scenario 4 -- Format Selection

WHERE AM I?: Copilot Studio > Test pane

1. Start a new conversation.

2. Type: what transcript formats are available

3. The agent should route to the Format Selection topic and display the detailed format comparison.

**Expected result:** The agent shows all three formats (Plain Text, SRT, VTT) with descriptions, examples, and use case recommendations.

4. When asked about use case, select: Video subtitles

**Expected result:** The agent recommends SRT format with an explanation of why it is best for subtitles.

5. Confirm the format choice: SRT

**Expected result:** The Global.varConfirmedFormat variable is set to "srt".

## Step 11.5: Test Scenario 5 -- Download Transcript

WHERE AM I?: Copilot Studio > Test pane

1. Start a new conversation.

2. Type: download my transcript

3. The agent should route to the Download Transcript topic.

**Expected result:** The agent displays the transcript retrieval message and asks for identifying information (file name, date, format).

4. When asked about additional actions, select: Start a new transcription

**Expected result:** The agent redirects to the Transcription Request topic.

## Step 11.6: Test Scenario 6 -- Fallback Handling

WHERE AM I?: Copilot Studio > Test pane

1. Start a new conversation.

2. Type: What is the weather today?

**Expected result:** The agent displays the fallback message explaining it specializes in transcription and listing available capabilities.

## Step 11.7: Test Scenario 7 -- Flow Execution (Manual Test)

WHERE AM I?: Power Automate > Solutions > Video Transcription Agent Solution > Transcribe Audio File

1. Open Power Automate and navigate to your solution.

2. Click on the Transcribe Audio File flow.

3. Click Test in the top-right corner -> select Manual -> click Test.

4. Fill in the trigger inputs:
   - file_url: Paste a SharePoint path to a test audio file (upload a small MP3 file to /Shared Documents/Transcripts/Audio Files/ first)
   - language: en
   - output_format: plain_text
   - include_timestamps: true

5. Click Run flow.

6. Monitor the flow run. Click on each action to verify:
   - Get_OpenAI_Key: Shows "Secure inputs" (key is hidden)
   - HTTP_Whisper: Returns 200 status code with transcript data
   - Parse_Whisper_Response: Successfully parses the JSON
   - Save_Transcript_to_SharePoint: Creates the file in the correct folder

**Expected result:** The flow completes successfully. A transcript file appears in /Shared Documents/Transcripts/Plain Text/ with the correct content.

---

# PHASE 12: Troubleshooting Reference

| Symptom | Resolution |
|---|---|
| Agent does not respond to any query | Verify generative orchestration is enabled (Step 1.7). Confirm the agent is published (Step 10.1). Check that at least one knowledge source is connected with a green checkmark. |
| Agent says "I could not find information" | Your SharePoint Transcripts Library may be empty. Upload a test transcript file. Check that the knowledge source description (Step 2.1) accurately describes the content. Verify the user has Read permissions on the SharePoint site. |
| Transcription Request topic does not trigger | Verify the topic is saved and enabled. Check that the trigger phrases include "transcribe" and "speech to text". Test by typing the exact phrase "transcribe audio" in the test pane. Check the topic description for clarity. |
| HTTP_Whisper action fails with 401 Unauthorized | Your OpenAI API key is expired or incorrect. Open the Get_OpenAI_Key Compose action and verify the key starts with sk-... Check your OpenAI account at platform.openai.com for billing issues or key expiration. |
| HTTP_Whisper action fails with 413 Request Entity Too Large | The uploaded file exceeds the 20 MB Whisper API limit. Add a file size check before the HTTP action. Instruct the user to compress the audio or split it into smaller segments. |
| HTTP_Whisper action fails with 400 Bad Request | The multipart form-data body is malformed. Verify the boundary string matches in both the Content-Type header and the body. Check that the file content is valid binary audio data. Ensure the model value is exactly "whisper-1". |
| YouTube captions flow returns empty results | The video may not have captions, or the captions may be auto-generated (which requires different API parameters). Check the YouTube video manually to confirm captions exist. Verify the Google API key has YouTube Data API v3 enabled. |
| Flow times out after 120 seconds | Large audio files take longer to process. Increase the HTTP timeout to PT120S (Step 4.7). For files over 10 minutes of audio, consider splitting into chunks. Check your OpenAI API tier for rate limits. |
| Adaptive Card renders as plain text in Teams | Ensure you are using the "Post adaptive card" action (not "Post message") if sending cards from a flow. The card JSON must be valid -- test it at https://adaptivecards.io/designer/ before pasting. Use schema version 1.5 for Teams. |
| Global variables are empty in other topics | Confirm the variable is set as Global: click the variable name -> Variable properties panel -> under Usage, verify "Global (any topic can access)" is selected. Check that the Conversation Start topic initializes default values (Step 1.11). |
| SharePoint Create file action fails | Verify the folder path exists in SharePoint. Check that the service account or user has Contribute permissions. Ensure the file name does not contain invalid characters (no colons, slashes, or question marks). |
| Agent responds with general knowledge instead of using tools | Verify general knowledge is disabled (Step 1.9). Check that tool descriptions are specific enough for the orchestrator to match user intent. Test with exact trigger phrases first. |

---

# PHASE 13: Architecture Summary and Verification Checklist

## Architecture Summary

```
USER (Teams)
    |
    v
COPILOT STUDIO AGENT: Video Transcription Assistant
    |
    +-- [Generative Orchestrator: GPT-5 Chat GA]
    |       |
    |       +-- Routes to Topics based on descriptions
    |       +-- Calls Tools based on descriptions
    |       +-- Searches Knowledge Sources
    |
    +-- TOPIC: Transcription Request
    |       |-- Collects: input type, file/URL, format, timestamps
    |       |-- Calls: Transcribe Audio File (Action node)
    |       +-- Returns: processing confirmation
    |
    +-- TOPIC: Format Selection
    |       |-- Explains: Plain Text, SRT, VTT
    |       |-- Recommends: based on use case
    |       +-- Sets: Global.varConfirmedFormat
    |
    +-- TOPIC: Download Transcript
    |       |-- Retrieves: transcript from SharePoint
    |       |-- Displays: Adaptive Card preview
    |       +-- Offers: reformat, email, new transcription
    |
    +-- TOOL: Transcribe Audio File (Power Automate Flow)
    |       |-- Input: file_url, language, output_format, timestamps
    |       |-- Calls: OpenAI Whisper API (POST multipart/form-data)
    |       |-- Formats: plain text / SRT / VTT
    |       |-- Saves: SharePoint /Transcripts/{format}/
    |       +-- Returns: transcript_text, duration, status
    |
    +-- TOOL: Transcribe YouTube Video (Power Automate Flow)
    |       |-- Input: youtube_url, language, output_format
    |       |-- Calls: YouTube Data API v3 (GET captions list)
    |       |-- Handles: caption availability check
    |       |-- Saves: SharePoint /Transcripts/Plain Text/
    |       +-- Returns: transcript_text, duration, status
    |
    +-- KNOWLEDGE: Transcripts Library (SharePoint)
            |-- /sites/ResearchHub/Shared Documents/Transcripts/
            +-- Subfolders: Audio Files, Plain Text, SRT, VTT
```

## Credit Consumption Estimate

| Action | Credits per Occurrence | Estimated Occurrences per Session | Subtotal |
|---|---|---|---|
| Generative answer (topic routing) | 2 | 3 | 6 |
| Agent action (tool call) | 5 | 1 | 5 |
| Agent flow execution (per 100 actions) | 13 | 1 | 13 |
| Knowledge source search | 2 | 1 | 2 |
| **Total per transcription session** | | | **26 credits** |

At $200/month for 25,000 credits, this supports approximately **961 transcription sessions per month**.

## Post-Build Verification Checklist

Check each item after completing the build:

| # | Item | Status |
|---|---|---|
| 1 | Agent name is "Video Transcription Assistant" | [ ] |
| 2 | Agent description is filled in (under 1,024 characters) | [ ] |
| 3 | Generative orchestration is enabled (Settings -> Generative AI -> Yes) | [ ] |
| 4 | General knowledge is disabled (Settings -> Generative AI -> Off) | [ ] |
| 5 | Authentication is set to "Authenticate with Microsoft" | [ ] |
| 6 | Agent instructions are pasted (all sections: PERSONA, CHAIN-OF-THOUGHT, OUTPUT FORMAT, CONSTRAINTS, FEW-SHOT EXAMPLE) | [ ] |
| 7 | Conversation Start system topic initializes Global.DefaultOutputFormat and Global.IncludeTimestamps | [ ] |
| 8 | Fallback system topic has custom transcription-focused message | [ ] |
| 9 | Transcripts Library knowledge source is connected with green checkmark | [ ] |
| 10 | Knowledge strictness is set to High | [ ] |
| 11 | Power Platform Solution "Video Transcription Agent Solution" exists with 2 environment variables | [ ] |
| 12 | nxth_OpenAiApiKey environment variable has a current value set | [ ] |
| 13 | nxth_GeminiApiKey environment variable has a current value set | [ ] |
| 14 | Transcription Request topic has 9 nodes and is saved | [ ] |
| 15 | Format Selection topic has 5 nodes and is saved | [ ] |
| 16 | Download Transcript topic has 6 nodes and is saved | [ ] |
| 17 | Transcribe Audio File flow is saved and published in the solution | [ ] |
| 18 | Transcribe YouTube Video flow is saved and published in the solution | [ ] |
| 19 | Transcribe Audio File is registered as a tool with description | [ ] |
| 20 | Transcribe YouTube Video is registered as a tool with description | [ ] |
| 21 | Secure Inputs/Outputs are ON for Get_OpenAI_Key Compose action | [ ] |
| 22 | Secure Inputs/Outputs are ON for Get_Gemini_Key Compose action | [ ] |
| 23 | Secure Inputs are ON for HTTP_Whisper action | [ ] |
| 24 | Secure Inputs are ON for HTTP_YouTube_Captions_List action | [ ] |
| 25 | HTTP timeout is set to PT120S on all HTTP actions | [ ] |
| 26 | Asynchronous Response is OFF on both Respond to Copilot actions | [ ] |
| 27 | SharePoint folder structure exists: Transcripts/Audio Files, Plain Text, SRT, VTT | [ ] |
| 28 | Agent is published (green "Published successfully" banner) | [ ] |
| 29 | Agent is deployed to Teams channel | [ ] |
| 30 | All 7 test scenarios pass (Phase 11) | [ ] |

---

## Conclusion

This recipe produces a functional Video Transcription Assistant agent that converts audio and video content into text using the OpenAI Whisper API called directly from Power Automate flows. The three most consequential design decisions are:

1. **Direct API integration via Power Automate HTTP actions** -- calling the Whisper API directly from Cloud Flows rather than routing through intermediary services. This keeps the architecture simple, auditable, and within the Power Platform ecosystem. The multipart/form-data body construction is the most technically complex part but ensures full control over the API interaction.

2. **YouTube caption retrieval as a best-effort approach** -- the YouTube Data API v3 can list caption tracks but requires OAuth 2.0 for text download. The flow transparently communicates this limitation and guides users to alternative approaches (manual audio download and upload). This honest handling of platform constraints builds user trust.

3. **Three-format output system (Plain Text, SRT, VTT)** -- supporting all three major transcript formats from a single Whisper API call. The verbose_json response format provides both full text and timestamped segments, enabling format conversion entirely within Power Automate expressions without additional API calls.

The agent can be extended with email delivery flows, automatic file format conversion (using Azure Functions for FFmpeg processing), and batch transcription for multiple files. The SharePoint Transcripts Library serves as both a delivery destination and a searchable knowledge source, enabling users to find and reference past transcripts through natural conversation.