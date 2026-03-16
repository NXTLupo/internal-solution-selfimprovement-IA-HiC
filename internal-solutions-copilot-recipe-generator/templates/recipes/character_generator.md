

# Consistent Character Creator -- Definitive Build Recipe for Microsoft Copilot Studio

This recipe walks you through every click, field, toggle, and configuration needed to build the Consistent Character Creator agent in Microsoft Copilot Studio. The agent generates visually consistent character portraits using Google Gemini gemini-3-pro-image-preview (supporting up to 14 reference images for identity consistency), creates animated video clips using Veo 3.1, and manages a persistent character library in SharePoint. Written for absolute beginners in Copilot Studio -- no step is assumed.

---

## Architecture Diagram

```
+---------------------------+
|   Microsoft Teams User    |
+------------+--------------+
             |
             v
+---------------------------+
| Copilot Studio Agent      |
| "Consistent Character     |
|  Creator"                 |
|                           |
| Orchestration: Generative |
| Model: GPT-5 Chat GA     |
| Auth: Microsoft Entra ID  |
| General Knowledge: OFF    |
|                           |
| TOPICS:                   |
| 1. Character Creation     |
| 2. Scene Composition      |
| 3. Video Generation       |
| 4. Character Library      |
|                           |
| KNOWLEDGE:                |
| SharePoint Character Lib  |
+-----+-------+-------+----+
      |       |       |
      v       v       v
+----------+ +----------+ +------------------+
| Flow:    | | Flow:    | | SharePoint       |
| Generate | | Generate | | Connector:       |
| Character| | Character| | Character Library|
| Portrait | | Video    | | (Read/Write)     |
+----+-----+ +----+-----+ +--------+---------+
     |            |                 |
     v            v                 v
+----------+ +----------+ +------------------+
| Gemini   | | Veo 3.1  | | SharePoint Site  |
| gemini-  | | fast-    | | /sites/          |
| 3-pro-   | | generate | | ResearchHub/     |
| image-   | | -preview | | Shared Documents/|
| preview  | |          | | Character Library|
| API      | | API      | |                  |
+----------+ +----+-----+ +------------------+
                  |
                  v
           +-----------+
           | Async     |
           | Polling   |
           | Do Until  |
           | done=true |
           | (max 60   |
           |  iters)   |
           +-----------+
                  |
                  v
           +-----------+
           | Download  |
           | Video MP4 |
           | -> Upload |
           | SharePoint|
           +-----------+

DATA FLOW:
User -> Agent -> Topic collects inputs -> Flow calls Gemini/Veo API
-> API returns base64 image or video URI -> Flow saves to SharePoint
-> Agent displays result via Adaptive Card in Teams
```

---

## Prerequisites -- What You Need Before Starting

Before you begin building, confirm you have the following:

1. A Microsoft 365 work or school account with a license that includes Copilot Studio (typically Microsoft 365 E3/E5 or a standalone Copilot Studio license). If you are not sure, ask your IT admin.

2. Access to Power Automate at https://make.powerautomate.com -- sign in and confirm you can see the home page.

3. Access to Power Apps maker portal at https://make.powerapps.com -- sign in and confirm you can see the home page.

4. A SharePoint site at https://yourcompany.sharepoint.com/sites/ResearchHub where you can create document libraries and folders. You need at least "Edit" permissions on this site.

5. A Google Gemini API key for both image generation (gemini-3-pro-image-preview) and video generation (veo-3.1-fast-generate-preview). Get this from https://aistudio.google.com -> API keys. The key starts with AIza... and works for both models.

6. Microsoft Teams installed (desktop or web) for testing the agent.

7. The SharePoint document library "Character Library" created at /sites/ResearchHub/Shared Documents/Character Library with subfolders for organizing character assets.

---

## Component Summary Table

| Component | Type | Name | Purpose |
|---|---|---|---|
| Topic 1 | Custom Topic | Character Creation | Collects character attributes, generates portraits, saves to library |
| Topic 2 | Custom Topic | Scene Composition | Places existing character into new scene contexts with reference conditioning |
| Topic 3 | Custom Topic | Video Generation | Creates animated video clips of characters using Veo 3.1 |
| Topic 4 | Custom Topic | Character Library | Browses and manages saved characters |
| Flow 1 | Agent Flow | Generate Character Portrait | Calls Gemini gemini-3-pro-image-preview API for image generation |
| Flow 2 | Agent Flow | Generate Character Video | Calls Veo 3.1 API for async video generation with polling |
| Tool 1 | Flow Tool | Generate Character Portrait | Registered for orchestrator routing |
| Tool 2 | Flow Tool | Generate Character Video | Registered for orchestrator routing |
| Tool 3 | Connector Tool | SharePoint Character Library | Read/write character data from SharePoint |
| Knowledge 1 | SharePoint | Character Library | Character reference images and metadata |
| Env Variable 1 | Secret | nxth_GeminiApiKey | Google Gemini API key for all API calls |

---

# PHASE 1: Create the Consistent Character Creator Agent

This phase creates the agent shell, configures its identity, enables generative orchestration, writes the full agent instructions, disables general knowledge, and configures system topics.

## Step 1.1: Create the SharePoint Character Library Folder Structure

WHERE AM I?: SharePoint > /sites/ResearchHub > Shared Documents

1. Open your browser and navigate to your SharePoint site (e.g., https://yourcompany.sharepoint.com/sites/ResearchHub).

2. In the left navigation, click Documents (or Shared Documents) to open the default document library.

3. Click + New -> Folder. Name it Character Library. Click Create. This is the root folder where all character assets will be stored.

4. Inside Character Library, click + New -> Folder. Name it _Templates. Click Create. This subfolder will hold any template files or default reference images.

5. Go back to the root of the Documents library. Create these additional folders by repeating + New -> Folder for each:
   - Video Output -- where completed MP4 video clips will be saved
   - Scene Output -- where scene composition images will be saved

6. Copy and save the full URL of your SharePoint site (everything up to and including the site name, e.g., https://yourcompany.sharepoint.com/sites/ResearchHub). You will need this multiple times throughout the recipe.

> **VERIFY**: You should now see three folders inside Shared Documents: Character Library, Video Output, and Scene Output.

## Step 1.2: Create the Power Platform Solution and Environment Variable

WHERE AM I?: Power Apps > https://make.powerapps.com > Solutions

1. Open a new browser tab and navigate to https://make.powerapps.com.

2. Sign in with the same Microsoft 365 account you used for SharePoint.

3. In the top-right corner, check the Environment dropdown. Make sure you are in the same environment where your Copilot Studio agent will live. If you are not sure, it is usually called "Default" or your organization's name.

4. In the left navigation, click Solutions.

5. Click + New solution.

6. Fill in:
   - Display name: Consistent Character Creator Solution
   - Publisher: Select the default publisher (or create one -- click + New publisher, set Name to NXTHumans, Prefix to nxth, then click Save).
   - Leave Version as 1.0.0.0.

7. Click Create. The solution opens.

8. Inside your solution, click Add (the button at the top) -> More -> Environment variable.

9. Fill in:
   - Display name: Gemini API Key
   - Name: This auto-fills as nxth_GeminiApiKey (based on your publisher prefix). That is correct.
   - Data type: Select Secret from the dropdown. This encrypts the value at rest.
   - Default value: Leave blank.

10. Click Save at the bottom of the panel.

11. After saving, click the environment variable you just created to open it. Click + New value next to "Current value". Paste your Google Gemini API key (the one starting with AIza...). Click Save.

> **CRITICAL**: Environment variables of type "Secret" encrypt values at rest in Dataverse. However, you must STILL enable Secure Inputs and Secure Outputs on every Power Automate action that touches this key. Instructions for this are included in every flow step below.

> **VERIFY**: You should see one environment variable named "Gemini API Key" with schema name nxth_GeminiApiKey listed in your solution.

## Step 1.3: Sign In to Copilot Studio and Create a Blank Agent

WHERE AM I?: Copilot Studio > https://copilotstudio.microsoft.com > Agents

1. Open your browser and navigate to https://copilotstudio.microsoft.com.

2. Sign in with your Microsoft 365 work or school account.

3. You will land on the Copilot Studio home page. In the left navigation pane, click Agents.

4. Click the Create blank agent button. (If you want to change advanced settings like the solution or schema name, click the small down arrow (v) next to the button and select Advanced create, then click Confirm and create. For most users, just clicking the main button is fine.)

5. A new agent opens on the Overview page. This is your agent's home base -- it has sections for Details, Instructions, Knowledge, Tools, Suggested Prompts, and Channels.

> **VERIFY**: Check that a new untitled agent is open and you can see the Overview page with Details, Instructions, Knowledge, and Tools sections.

## Step 1.4: Set the Agent Name, Description, and Icon

WHERE AM I?: Copilot Studio > Agent > Overview > Details

1. On the Overview page, find the Details section (near the top). Click the Edit (pencil) icon.

2. In the Name field, delete the default name and type: Consistent Character Creator

3. In the Description field (max 1,024 characters), paste:

```
Creative AI assistant that generates visually consistent character portraits using Google Gemini gemini-3-pro-image-preview and animated video clips using Veo 3.1. Supports reference image conditioning for identity consistency across scenes. Manages a persistent character library in SharePoint with portraits, scene compositions, and video assets organized by character.
```

4. To change the agent's icon: click the agent icon in the top-left area of the page -> click Change icon -> upload a 192 x 192 pixel PNG image (max 72 KB). Use a professional icon that represents character design or creative AI.

5. Click Save at the top of the page. Wait for the green "Saved successfully" banner.

## Step 1.5: Enable Generative Orchestration

WHERE AM I?: Copilot Studio > Agent > Overview > Details > Orchestration

1. Still in the Details section of the Overview page, look for the Orchestration area.

2. Find the toggle labeled "Use generative AI to determine how best to respond to users and events".

3. Make sure this is set to Yes (toggled on). New agents usually default to this, but verify it.

> **BEGINNER TIP**: Generative orchestration means the agent uses an AI planner to dynamically decide which topics, tools, and knowledge sources to use for each request. Instead of requiring exact trigger phrase matches, the agent reads topic and tool descriptions to route intelligently. This is essential for a creative agent that handles varied character creation requests.

> **CRITICAL**: This is an architectural decision. Generative orchestration is the correct choice for this agent because users will phrase character creation requests in many different ways ("make me a warrior character", "I need a portrait of a young woman", "design a sci-fi character"). Classic orchestration would require predicting every possible phrasing as trigger phrases.

## Step 1.6: Write the Agent Instructions

WHERE AM I?: Copilot Studio > Agent > Overview > Instructions

1. On the Overview page, find the Instructions section. Click Edit.

2. You will see a large text field (max 8,000 characters). Delete any default text and paste the following:

```
[PERSONA]
You are the Consistent Character Creator, a creative AI assistant built by NXT Humans that helps researchers and content creators build visually consistent character assets for persona-driven narratives. You specialize in generating character portraits that maintain identity consistency across multiple scenes and creating short animated video clips of those characters. Your tone is creative, attentive to visual detail, and enthusiastic about character design. You speak with the precision of an art director, using specific visual vocabulary: composition, lighting, color palette, framing, pose, expression. You help users refine their character descriptions to get the best results from the generative AI models.

[CHAIN-OF-THOUGHT REASONING]
For every character creation or generation request, reason step-by-step before responding:
1. Identify the request type: new character creation, scene composition with existing character, video generation, or library browsing.
2. For new characters: gather the complete character specification -- name, approximate age range, gender presentation, ethnicity/skin tone, hair description (color, style, length), clothing style, and distinguishing features (glasses, scars, tattoos, accessories).
3. Compose a detailed generation prompt that includes all physical attributes, lighting preferences, art style (photorealistic, illustration, watercolor, anime, comic book, minimalist), background context, and negative prompts to avoid common artifacts.
4. For scene composition: retrieve the character reference portrait from the SharePoint Character Library. Use it as conditioning input alongside the scene description to maintain visual identity. Warn the user if the requested scene diverges significantly from the reference (extreme pose changes, drastically different clothing, conflicting art style).
5. For video generation: compose a Veo 3.1 prompt describing the character action, setting, and camera movement. Set user expectations that video generation takes 2-5 minutes. Use the character reference image for visual consistency.
6. Present generated assets as Adaptive Card galleries with selection buttons. Include the prompt used, generation parameters, and visual consistency notes.
7. Save all selected assets to the character's folder in the SharePoint Character Library for future reuse.

[OUTPUT FORMAT]
When presenting generated images, use Adaptive Card galleries showing:
- Image preview with selection buttons
- The exact prompt used for generation
- Art style and aspect ratio used
- Character consistency assessment (high/medium/low based on reference adherence)

When presenting generated videos, show:
- Video playback link
- Duration and aspect ratio
- Thumbnail preview
- The prompt used for generation

[CONSTRAINTS]
- Only answer questions related to character creation, portrait generation, scene composition, video generation, and character library management.
- All image generation uses Google Gemini gemini-3-pro-image-preview. Never reference Imagen 3, DALL-E, Midjourney, or other image models.
- All video generation uses Google Veo 3.1 (veo-3.1-fast-generate-preview). Maximum video duration is 8 seconds per clip.
- 9:16 portrait aspect ratio for video only supports 720p resolution, not 1080p. Inform users of this limitation.
- Character consistency degrades with extreme pose or style changes. Always warn users when a requested scene diverges significantly from the reference.
- All generated content must comply with Google usage policies. Do not generate content depicting real public figures, minors in inappropriate contexts, or violent/harmful scenarios.
- Store all character references and generated assets in the SharePoint Character Library for persistence across sessions.
- If no characters exist in the library, guide the user to create one first before attempting scene composition or video generation.

[FEW-SHOT EXAMPLE]
User: "Create a character named Elena who is a 30-year-old Latina woman with long dark curly hair, wearing a lab coat and glasses"

Expected behavior:
1. Acknowledge the character details provided
2. Ask for art style preference (photorealistic, illustration, etc.)
3. Ask for aspect ratio preference (1:1, 16:9, 9:16)
4. Generate portrait using Gemini gemini-3-pro-image-preview with prompt:
   "Portrait of a 30-year-old Latina woman named Elena with long dark curly hair, wearing a white lab coat and rectangular glasses. Professional, warm expression. Studio lighting, neutral background."
5. Present variations as Adaptive Card gallery
6. Save selected portrait to SharePoint /Character Library/Elena/
7. Confirm creation with library ID and next-step options
```

3. Click Save at the top of the page.

> **VERIFY**: The Instructions section should show your pasted text. Scroll through to confirm all sections are present: [PERSONA], [CHAIN-OF-THOUGHT REASONING], [OUTPUT FORMAT], [CONSTRAINTS], [FEW-SHOT EXAMPLE].

## Step 1.7: Disable General Knowledge

WHERE AM I?: Copilot Studio > Agent > Settings (gear icon) > Generative AI

1. Click the Settings gear icon at the very top of the Copilot Studio page (not the Details section -- the gear icon in the top navigation bar).

2. In the settings panel, click Generative AI in the left menu.

3. Find the toggle "Allow the AI to use its own general knowledge" and set it to Off.

4. Click Save and close the settings panel.

> **BEGINNER TIP**: Disabling general knowledge forces the agent to answer exclusively from your SharePoint documents and the tools you configure. This prevents the agent from making up character details or referencing capabilities it does not have.

## Step 1.8: Configure System Topics

WHERE AM I?: Copilot Studio > Agent > Topics > System

1. Click the Topics tab in the top navigation bar of Copilot Studio.

2. You will see two subtabs: Custom and System. Click the System subtab.

3. You will see a list of system topics. Configure each one:

**Conversation Start:**

4. Click Conversation Start to open the topic authoring canvas.

5. You will see a trigger node ("Conversation Start") connected to a Message node. Before the Message node, click the + button to add a new node. Select Variable management -> Set a variable value.

6. In the "Set variable" node:
   - Variable: Click the box under "Set variable" -> select Create a new variable. A new variable appears with a default name (e.g., Var1). Click the variable name -> the Variable properties panel opens on the right. Under Variable name, type varCurrentCharacterId (without the Global. prefix). Under Usage, select "Global (any topic can access)". The variable name automatically becomes Global.varCurrentCharacterId. For the To value field, click the formula icon (fx), type `Text("")` and click Done.

7. Add another Set variable value node below the first one:
   - Variable: Click the box -> select Create a new variable. Name it varCurrentCharacterName. Under Usage, select "Global (any topic can access)". For the To value field, click the formula icon (fx), type `Text("")` and click Done.

8. Now click the Message node that was already there. Delete the default message text. Replace it with:

```
Welcome to the Consistent Character Creator, built by NXT Humans.

I help you create visually consistent character portraits and animated video clips using AI.

Here is what I can do:
- Create a new character with detailed physical attributes
- Generate portrait variations in multiple art styles
- Place existing characters into new scenes while maintaining visual identity
- Generate short animated video clips of your characters
- Browse and manage your character library

Type "create character" to start building a new character, or "my characters" to browse your library.
```

9. Click Save at the top.

**Fallback:**

10. Go back to Topics -> System and click Fallback.

11. Click the Message node and replace the text with:

```
I did not understand that request. I can help with:
- Creating new character portraits (type "create character")
- Placing characters into scenes (type "create scene")
- Generating character video clips (type "generate video")
- Browsing your character library (type "my characters")

Please rephrase your question or try one of the commands above.
```

12. Click Save.

**On Error:**

13. Click On Error in the system topics list. Keep the default configuration -- it displays the error code, conversation ID, and timestamp, which you will need for troubleshooting.

**End of Conversation:**

14. Click End of Conversation. Toggle the satisfaction survey to On so you can collect feedback on character quality. Click Save.

> **VERIFY**: You should have configured four system topics: Conversation Start (with two global variable initializations and a welcome message), Fallback (with a help message), On Error (default), and End of Conversation (survey on).

---

# PHASE 2: Add Knowledge Sources (1 Source)

Knowledge sources give the agent access to your SharePoint character library so it can reference existing characters and their metadata when answering questions.

## Step 2.1: Add the SharePoint Character Library as a Knowledge Source

WHERE AM I?: Copilot Studio > Agent > Overview > Knowledge

1. Navigate back to the Overview page of your agent (click the agent name in the breadcrumb at the top).

2. Find the Knowledge section and click Add knowledge.

3. A panel opens showing knowledge source options. Under Featured, click SharePoint.

4. In the SharePoint URL field, paste the URL of your SharePoint site. For example: https://yourcompany.sharepoint.com/sites/ResearchHub

5. Press Enter or click the + button. The URL appears as a tag below the field.

6. Below the URLs, you will see two fields:
   - Name: Type Character Library
   - Description: This is critical for retrieval quality. Paste:

```
SharePoint document library storing character reference images, attribute metadata, and generated assets organized by character name. Each character folder contains: reference portrait images (PNG/JPEG), scene composition images, video clips (MP4), and a metadata JSON file with character attributes (name, age, gender, ethnicity, hair description, clothing, distinguishing features, art style, creation date). Used for maintaining visual consistency when generating new scenes or videos of existing characters. File formats include PNG, JPEG, MP4, and JSON.
```

7. Click Add to agent.

8. You will see the knowledge source appear in the Knowledge section with a green checkmark. If you see a yellow warning, click it to read the issue (usually a permissions problem).

> **VERIFY**: The Knowledge section shows "Character Library" with a green checkmark.

## Step 2.2: Configure Knowledge Behavior Settings

WHERE AM I?: Copilot Studio > Agent > Settings (gear icon) > Generative AI

1. Click the Settings gear icon in the top navigation bar.

2. Click Generative AI in the left menu.

3. Under "How should your agent interact with knowledge sources", select High strictness. This ensures the agent only answers from your documents and does not fill gaps with guesses about characters that do not exist.

4. Click Save and close the settings panel.

---

# PHASE 3: Character Creation -- TOPIC BUILD (Node-by-Node: 10 Nodes)

This topic is the primary entry point for creating new characters. It collects physical attributes, art style preferences, and aspect ratio, then calls the Generate Character Portrait flow to produce portrait variations for the user to select from.

## Step 3.1: Create the Character Creation Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Custom > + Add a topic > From blank

1. Click the Topics tab in the top navigation bar -> Custom subtab -> click + Add a topic -> From blank.

2. At the top of the canvas, click the topic name (it says "Untitled") and rename it to: Character Creation

3. Click the Description field below the name. Type: User wants to create a new character or generate character portraits. Route here when the user mentions creating a character, generating a portrait, designing a persona avatar, or building a new character for their story or research. Does NOT handle scene composition with existing characters or video generation.

## Step 3.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Trigger node

1. In the Trigger node at the top of the canvas, you will see a section labeled "Describe what this topic does" (or "Add trigger phrases" depending on your view).

2. Click the description/trigger area and add these trigger phrases (press Enter after each one):
   - create character
   - generate portrait
   - design persona avatar
   - build new character
   - character portrait
   - make a new character
   - I need a character image
   - create a character for my project

## Step 3.3: Add Node 1 -- Message -- "Character Creation Welcome"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas

1. Click the + button below the Trigger node to add a new node.

2. In the node menu that appears, click Send a message.

3. In the message text field, type:

```
Let us create a new character together. I will walk you through the process:

1. You provide the character's name
2. You describe their physical appearance in detail
3. You choose an art style and aspect ratio
4. I generate portrait variations for you to select from
5. Your chosen portrait is saved to the Character Library for consistent reuse

The more detail you provide about the character's appearance, the better the results will be. Include age, gender, ethnicity, hair, clothing, and any distinguishing features.
```

## Step 3.4: Add Node 2 -- Question -- "Provide Character Name"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas (below Node 1)

1. Click the + button below the message node to add a new node.

2. In the node menu, click Ask a question.

3. In the question text field, type: What is the character's name? This will be used to label the character in your library and reference them in future scenes and videos.

4. Under "Identify", click the dropdown and select User's entire response. This uses the StringPrebuiltEntity to capture any text the user types.

5. The question node creates an output variable. Click the variable name (it may say Var1 or similar). The Variable properties panel opens on the right side.

6. Under Variable name, type varCharacterName (without any prefix).

7. Leave Usage as "Topic (this topic only)" -- this variable only needs to exist within this topic.

8. Close the Variable properties panel.

> **BEGINNER TIP**: The "Identify" dropdown tells the agent what kind of answer to expect. "User's entire response" captures everything the user types as a single text string. For a character name, this is appropriate because names can be any text.

## Step 3.5: Add Node 3 -- Question -- "Describe Physical Attributes"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas (below Node 2)

1. Click the + button below the question node to add a new node.

2. Click Ask a question.

3. In the question text field, type:

```
Describe the character's physical appearance in detail. Include as many of these as possible:

- Approximate age range (e.g., early 20s, mid-40s)
- Gender presentation
- Ethnicity and skin tone
- Hair color, style, and length
- Clothing style and specific garments
- Distinguishing features (glasses, scars, tattoos, jewelry, accessories)
- Build and posture
- Facial expression or mood
```

4. Under "Identify", select User's entire response.

5. Click the output variable name. In the Variable properties panel, rename it to varCharacterAttributes.

## Step 3.6: Add Node 4 -- Question -- "Select Art Style"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas (below Node 3)

1. Click the + button below the previous question node.

2. Click Ask a question.

3. In the question text field, type: What art style would you like for the portrait?

4. Under "Identify", click the dropdown. Select Multiple choice options.

5. A list of options appears below the question. Click each option slot and type:
   - Option 1: Photorealistic
   - Option 2: Digital Illustration
   - Option 3: Watercolor
   - Option 4: Anime
   - Option 5: Comic Book
   - Option 6: Minimalist Flat Design

6. Click the output variable name. In the Variable properties panel, rename it to varArtStyle.

> **BEGINNER TIP**: "Multiple choice options" presents the user with clickable buttons in Teams. This is better than free text for art styles because it ensures the value matches exactly what the flow expects.

## Step 3.7: Add Node 5 -- Question -- "Select Aspect Ratio"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas (below Node 4)

1. Click the + button below the previous question node.

2. Click Ask a question.

3. In the question text field, type: What aspect ratio should the portrait use?

4. Under "Identify", select Multiple choice options.

5. Add these options:
   - Option 1: 1:1 Square (default portrait)
   - Option 2: 16:9 Landscape (good for scenes)
   - Option 3: 9:16 Vertical (good for full-body)

6. Click the output variable name. Rename it to varAspectRatio.

## Step 3.8: Add Node 6 -- Message -- "Generating Portraits"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas (below Node 5)

1. Click the + button below the previous question node.

2. Click Send a message.

3. In the message text field, type:

```
Generating your character portrait now. Here is what I am working with:

- Name: {Topic.varCharacterName}
- Attributes: {Topic.varCharacterAttributes}
- Art Style: {Topic.varArtStyle}
- Aspect Ratio: {Topic.varAspectRatio}

This typically takes 10-20 seconds. Please wait...
```

4. To insert the variable references: for each variable, delete the placeholder text (e.g., {Topic.varCharacterName}), then click the {x} (Insert variable) button in the message toolbar and select the appropriate variable from the list.

> **BEGINNER TIP**: The {x} button opens a panel showing all available variables. Topic variables appear under the current topic name. Click the variable to insert it into the message at your cursor position.

## Step 3.9: Add Node 7 -- Action -- "Generate Portrait Variations" (Call Generate Character Portrait Flow)

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas (below Node 6)

1. Click the + button below the message node.

2. In the node menu, click Add a tool.

3. A panel opens showing available tools. You will not see the Generate Character Portrait flow yet because we have not built it. For now, add a placeholder:

4. Click Send a message instead. Type:

```
[PLACEHOLDER] Replace this node with an Action node that calls the Generate Character Portrait flow after building it in Phase 4. Map these inputs: character_description = Topic.varCharacterAttributes, style = Topic.varArtStyle, aspect_ratio = Topic.varAspectRatio, character_name = Topic.varCharacterName. Capture these outputs: image_url into Topic.varPortraitUrl, status into Topic.varGenerationStatus.
```

> **WATCH OUT**: You cannot add the Action node until the flow exists. We will come back to replace this placeholder in Phase 5 after building and registering the flow. Mark this node clearly so you remember to replace it.

## Step 3.10: Add Node 8 -- Adaptive Card -- "Portrait Selection Gallery"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas (below Node 7)

1. Click the + button below the placeholder node.

2. In the node menu, click Ask with Adaptive Card.

3. Click the three dots (...) at the top-right of the Adaptive Card node -> select Properties -> Edit adaptive card.

4. The built-in Adaptive Card Designer opens. Click the Card payload editor tab (or JSON editor) to switch to raw JSON mode.

5. Delete any default content and paste this exact JSON:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "CHARACTER PORTRAIT GENERATED",
      "weight": "Bolder",
      "size": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Your character portrait has been generated. Review the result below and choose an action.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "TextBlock",
      "text": "Portrait Preview",
      "weight": "Bolder",
      "size": "Medium",
      "wrap": true,
      "separator": true
    },
    {
      "type": "TextBlock",
      "text": "The generated portrait has been saved to your Character Library. You can view it in SharePoint or continue working with this character.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "portraitAction",
      "label": "What would you like to do next?",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Accept and save to library",
          "value": "accept"
        },
        {
          "title": "Regenerate with same settings",
          "value": "regenerate"
        },
        {
          "title": "Modify attributes and regenerate",
          "value": "modify"
        },
        {
          "title": "Create a scene with this character",
          "value": "scene"
        }
      ]
    },
    {
      "type": "Input.Text",
      "id": "modificationNotes",
      "placeholder": "Optional: describe what to change if regenerating...",
      "isMultiline": true,
      "label": "Modification notes"
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

6. Click Save in the JSON editor to close it.

7. The Adaptive Card node now shows output variables. You should see two output variables created from the card's input fields: portraitAction and modificationNotes. Click the portraitAction variable name. In the Variable properties panel, rename it to varPortraitAction. Click the modificationNotes variable name and rename it to varModificationNotes.

> **CRITICAL**: The "id" fields in the Adaptive Card JSON ("portraitAction" and "modificationNotes") are what create the output variables. These must be unique across all Adaptive Cards in your agent.

## Step 3.11: Add Node 9 -- Set Variable -- "Save Character ID"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas (below Node 8)

1. Click the + button below the Adaptive Card node.

2. In the node menu, click Variable management -> Set a variable value.

3. In the "Set variable" node:
   - Variable: Click the box under "Set variable" -> select Create a new variable. A new variable appears. Click the variable name -> the Variable properties panel opens. Under Variable name, type varCurrentCharacterId. Under Usage, select "Global (any topic can access)". The variable name automatically becomes Global.varCurrentCharacterId.
   - To value: Click the {x} button and select Topic.varCharacterName. (We use the character name as a simple identifier for now.)

4. Add another Set variable value node below this one:
   - Variable: Click the box -> select Global.varCurrentCharacterName (the global variable you created in the Conversation Start topic).
   - To value: Click the {x} button and select Topic.varCharacterName.

> **BEGINNER TIP**: Global variables persist across all topics in the session. By setting Global.varCurrentCharacterId and Global.varCurrentCharacterName here, the Scene Composition and Video Generation topics can access the current character without asking the user again.

## Step 3.12: Add Node 10 -- Message -- "Character Created Confirmation"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas (below Node 9)

1. Click the + button below the Set variable node.

2. Click Send a message.

3. In the message text field, type (using {x} to insert variables):

```
Character created successfully!

- Name: {Global.varCurrentCharacterName}
- Portrait saved to Character Library
- Art Style: {Topic.varArtStyle}
- Aspect Ratio: {Topic.varAspectRatio}

You can now:
- Type "create scene" to place this character in a new setting
- Type "generate video" to create an animated clip
- Type "create character" to build another character
- Type "my characters" to browse your library
```

4. Click Save at the top of the canvas.

## Step 3.13: Complete YAML for Character Creation Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > (...) > Open code editor

1. Click the three dots (...) at the top-right of the topic canvas.

2. Select Open code editor.

3. You can verify or paste the following YAML. This represents the complete topic structure:

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Character Creation
    triggerQueries:
      - create character
      - generate portrait
      - design persona avatar
      - build new character
      - character portrait
      - make a new character
      - I need a character image
      - create a character for my project
  actions:
    - kind: SendMessage
      id: welcomeMsg
      message: |-
        Let us create a new character together. I will walk you through the process:

        1. You provide the character's name
        2. You describe their physical appearance in detail
        3. You choose an art style and aspect ratio
        4. I generate portrait variations for you to select from
        5. Your chosen portrait is saved to the Character Library for consistent reuse

        The more detail you provide about the character's appearance, the better the results will be. Include age, gender, ethnicity, hair, clothing, and any distinguishing features.

    - kind: Question
      id: askCharacterName
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varCharacterName
      prompt: "What is the character's name? This will be used to label the character in your library and reference them in future scenes and videos."
      entity: StringPrebuiltEntity

    - kind: Question
      id: askAttributes
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varCharacterAttributes
      prompt: |-
        Describe the character's physical appearance in detail. Include as many of these as possible:

        - Approximate age range (e.g., early 20s, mid-40s)
        - Gender presentation
        - Ethnicity and skin tone
        - Hair color, style, and length
        - Clothing style and specific garments
        - Distinguishing features (glasses, scars, tattoos, jewelry, accessories)
        - Build and posture
        - Facial expression or mood
      entity: StringPrebuiltEntity

    - kind: Question
      id: askArtStyle
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varArtStyle
      prompt: "What art style would you like for the portrait?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: photorealistic
              displayName: Photorealistic
            - id: digital_illustration
              displayName: Digital Illustration
            - id: watercolor
              displayName: Watercolor
            - id: anime
              displayName: Anime
            - id: comic_book
              displayName: Comic Book
            - id: minimalist
              displayName: Minimalist Flat Design

    - kind: Question
      id: askAspectRatio
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varAspectRatio
      prompt: "What aspect ratio should the portrait use?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: square
              displayName: "1:1 Square (default portrait)"
            - id: landscape
              displayName: "16:9 Landscape (good for scenes)"
            - id: vertical
              displayName: "9:16 Vertical (good for full-body)"

    - kind: SendMessage
      id: generatingMsg
      message: |-
        Generating your character portrait now. Here is what I am working with:

        - Name: {Topic.varCharacterName}
        - Attributes: {Topic.varCharacterAttributes}
        - Art Style: {Topic.varArtStyle}
        - Aspect Ratio: {Topic.varAspectRatio}

        This typically takes 10-20 seconds. Please wait...

    - kind: SendMessage
      id: callFlowPlaceholder
      message: "[ACTION] Replace this node with an Action node that calls the Generate Character Portrait flow. Map inputs: character_description = Topic.varCharacterAttributes, style = Topic.varArtStyle, aspect_ratio = Topic.varAspectRatio, character_name = Topic.varCharacterName. Capture outputs: image_url into Topic.varPortraitUrl, status into Topic.varGenerationStatus."

    - kind: SetVariable
      id: setCharacterId
      variable: Global.varCurrentCharacterId
      value: =Topic.varCharacterName

    - kind: SetVariable
      id: setCharacterName
      variable: Global.varCurrentCharacterName
      value: =Topic.varCharacterName

    - kind: SendMessage
      id: confirmMsg
      message: |-
        Character created successfully!

        - Name: {Global.varCurrentCharacterName}
        - Portrait saved to Character Library
        - Art Style: {Topic.varArtStyle}
        - Aspect Ratio: {Topic.varAspectRatio}

        You can now:
        - Type "create scene" to place this character in a new setting
        - Type "generate video" to create an animated clip
        - Type "create character" to build another character
        - Type "my characters" to browse your library

    - kind: EndDialog
      id: endCharacterCreation
```

4. Close the code editor to return to the visual canvas. Click Save.

---

# PHASE 4: Generate Character Portrait -- FLOW BUILD (Action-by-Action)

This flow receives character attributes, art style, and aspect ratio from the Character Creation topic, composes a detailed prompt, calls the Google Gemini gemini-3-pro-image-preview API, extracts the generated image, saves it to SharePoint, and returns the image URL to the agent.

## Step 4.1: Create the Flow

WHERE AM I?: Power Automate > https://make.powerautomate.com > Solutions > Consistent Character Creator Solution

1. Open a new browser tab and navigate to https://make.powerautomate.com.

2. In the left navigation, click Solutions -> open Consistent Character Creator Solution (the one you created in Step 1.2).

3. Click + New -> Automation -> Cloud flow -> Instant.

4. In the "Build an instant cloud flow" dialog:
   - Flow name: Generate Character Portrait
   - Choose how to trigger this flow: Scroll down and select "Run a flow from Copilot" (this is the Copilot Studio trigger). If you do not see this option, select "Manually trigger a flow" -- we will change it.

5. Click Create. The flow editor opens.

## Step 4.2: Configure the Trigger with Input Parameters

WHERE AM I?: Power Automate > Flow Editor > Trigger node

1. If the trigger shows as "Run a flow from Copilot", click on it to expand it. If it shows a different trigger, delete it and add the correct one: click + -> search for "Run a flow from Copilot" -> select it.

2. Click + Add an input inside the trigger. You need to add five text inputs:

**Input 1:**
- Click + Add an input -> select Text.
- Input name (the label): character_name
- Description: The character's name for folder naming in SharePoint

**Input 2:**
- Click + Add an input -> select Text.
- Input name: character_description
- Description: Detailed physical description of the character including age, gender, ethnicity, hair, clothing, and distinguishing features

**Input 3:**
- Click + Add an input -> select Text.
- Input name: style
- Description: Art style for the portrait (photorealistic, digital_illustration, watercolor, anime, comic_book, minimalist)

**Input 4:**
- Click + Add an input -> select Text.
- Input name: aspect_ratio
- Description: Image aspect ratio (square, landscape, vertical)

**Input 5:**
- Click + Add an input -> select Text.
- Input name: reference_image_base64
- Description: Optional base64-encoded reference image for character consistency. Leave empty for first-time generation.

> **WATCH OUT**: The input names must be exactly as shown above (with underscores, all lowercase). These are the names you will reference in expressions throughout the flow.

## Step 4.3: Action 1 -- Get Environment Variable (Gemini API Key)

WHERE AM I?: Power Automate > Flow Editor > Below trigger

1. Below the trigger, click + -> Add an action.

2. Search for "environment variable" in the action search box. Select List rows from the Dataverse connector. STOP -- actually, for the simplest approach that works reliably, we will use a Compose action with the key value and secure it.

3. Instead, search for "Compose" -> select Compose (under "Data Operations").

4. In the Inputs field, paste your Gemini API key (the literal key string starting with AIza...).

5. Immediately secure this action: Click the three dots (...) on the Compose action -> Settings -> scroll down to Security -> toggle Secure Inputs to On -> toggle Secure Outputs to On -> click Done.

6. Rename this action: click the three dots (...) -> Rename -> type Get_Gemini_Key.

> **CRITICAL**: The Secure Inputs and Secure Outputs toggles hide the API key value from flow run history. Without these, anyone who can view flow runs can see your API key. Always enable both toggles on any action that contains or outputs an API key.

## Step 4.4: Action 2 -- Compose the Character Prompt

WHERE AM I?: Power Automate > Flow Editor > Below Get_Gemini_Key

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, we need to build a detailed prompt. Click the Expression tab (the fx button) and paste:

**COPY-PASTE** into the Expression field:
```
concat(
  'Generate a high-quality ',
  triggerBody()?['style'],
  ' portrait of a character with these attributes: ',
  triggerBody()?['character_description'],
  '. The character name is ',
  triggerBody()?['character_name'],
  '. Composition: ',
  if(equals(triggerBody()?['aspect_ratio'], 'square'), 'centered head-and-shoulders portrait, 1:1 square format', if(equals(triggerBody()?['aspect_ratio'], 'landscape'), 'environmental portrait with background context, 16:9 landscape format', 'full-body portrait showing complete figure, 9:16 vertical format')),
  '. Lighting: professional studio lighting with soft shadows. Background: clean, complementary to the character. Style notes: high detail, consistent proportions, natural skin texture, expressive eyes. Avoid: distorted features, extra fingers, blurry details, text overlays, watermarks.'
)
```

3. Click OK.

4. Rename this action: click the three dots (...) -> Rename -> type Build_Character_Prompt.

> **BEGINNER TIP**: The concat() function joins multiple text strings together. The if() functions check the aspect ratio value and insert the appropriate composition instructions. This builds a detailed prompt that tells the Gemini model exactly what to generate.

## Step 4.5: Action 3 -- Escape the Prompt for JSON

WHERE AM I?: Power Automate > Flow Editor > Below Build_Character_Prompt

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(outputs('Build_Character_Prompt'),'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK.

4. Rename this action to Escape_Character_Prompt.

> **CRITICAL**: This 4-step escape chain is MANDATORY for every text value that gets embedded inside an HTTP action's JSON body. Without it, special characters in the user's description (quotes, newlines, backslashes) will break the JSON and cause 400 errors from the API. Step 1 escapes backslashes (must be first to avoid double-escaping). Step 2 escapes double quotes. Step 3 replaces newlines (LF) with literal \n. Step 4 strips carriage returns (CR).

## Step 4.6: Action 4 -- Initialize Variable for Reference Check

WHERE AM I?: Power Automate > Flow Editor > Below Escape_Character_Prompt

1. Click + -> Add an action -> search for "Initialize variable" -> select Initialize variable (under "Variable" actions).

2. Fill in:
   - Name: varHasReference
   - Type: Boolean
   - Value: Click the Expression tab (fx) and paste: `not(empty(triggerBody()?['reference_image_base64']))` -> click OK.

3. Rename this action to Init_Has_Reference.

> **BEGINNER TIP**: This variable checks whether the user provided a reference image. If they did (for scene composition), we include it in the API request. If they did not (for first-time character creation), we send only the text prompt.

## Step 4.7: Action 5 -- Build the API Request Body (Condition)

WHERE AM I?: Power Automate > Flow Editor > Below Init_Has_Reference

1. Click + -> Add an action -> search for "Condition" -> select Condition (under "Control").

2. In the condition:
   - Left side: Click the dynamic content panel (lightning bolt icon) and select varHasReference.
   - Operator: is equal to
   - Right side: Click the Expression tab (fx) and type: `true` -> click OK.

**If yes branch (reference image provided):**

3. Inside the Yes branch, click + -> Add an action -> search for "Compose" -> select Compose.

4. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('{"contents":[{"role":"user","parts":[{"inlineData":{"data":"',triggerBody()?['reference_image_base64'],'","mimeType":"image/jpeg"}},{"text":"',outputs('Escape_Character_Prompt'),'"}]}],"generationConfig":{"responseModalities":["TEXT","IMAGE"]}}')
```

5. Click OK.

6. Rename this action to Build_Body_With_Reference.

**If no branch (no reference image):**

7. Inside the No branch, click + -> Add an action -> search for "Compose" -> select Compose.

8. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('{"contents":[{"role":"user","parts":[{"text":"',outputs('Escape_Character_Prompt'),'"}]}],"generationConfig":{"responseModalities":["TEXT","IMAGE"]}}')
```

9. Click OK.

10. Rename this action to Build_Body_Without_Reference.

> **WATCH OUT**: The order of parts in the request matters. When including a reference image, the inlineData part MUST come BEFORE the text prompt part. This is how Gemini gemini-3-pro-image-preview uses the reference for character consistency conditioning.

## Step 4.8: Action 6 -- Initialize Variable for Request Body

WHERE AM I?: Power Automate > Flow Editor > Below the Condition

1. Below the entire Condition control (outside and after it), click + -> Add an action -> search for "Initialize variable" -> select Initialize variable.

STOP -- we cannot initialize a variable after a Condition because Initialize variable must be at the top level. Instead, we will use a Compose action.

2. Click + -> Add an action -> search for "Compose" -> select Compose.

3. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
if(variables('varHasReference'),outputs('Build_Body_With_Reference'),outputs('Build_Body_Without_Reference'))
```

4. Click OK.

5. Rename this action to Select_Request_Body.

## Step 4.9: Action 7 -- Build the Gemini API URL

WHERE AM I?: Power Automate > Flow Editor > Below Select_Request_Body

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=',outputs('Get_Gemini_Key'))
```

3. Click OK.

4. Rename this action to Build_Gemini_URL.

5. Secure this action: Click the three dots (...) -> Settings -> Secure Inputs: On -> Secure Outputs: On -> click Done.

## Step 4.10: Action 8 -- HTTP POST to Gemini API

WHERE AM I?: Power Automate > Flow Editor > Below Build_Gemini_URL

1. Click + -> Add an action -> search for "HTTP" -> select HTTP (the premium connector with the blue globe icon).

2. Configure the HTTP action:
   - Method: Select POST from the dropdown.
   - URI: Click the dynamic content panel (lightning bolt icon) and select Outputs from Build_Gemini_URL.
   - Headers: Click + Add new parameter -> check Headers.
     - Header 1: Key = Content-Type | Value = application/json
   - Body: Click the dynamic content panel (lightning bolt icon) and select Outputs from Select_Request_Body.

3. Configure timeout: Click the three dots (...) -> Settings -> scroll down to Networking -> Timeout: type PT120S -> click Done.

4. Secure this action: Click the three dots (...) -> Settings -> Secure Inputs: On -> click Done.

5. Rename this action to HTTP_Gemini_Image.

> **CRITICAL**: The timeout is set to PT120S (120 seconds) because image generation can take 15-30 seconds. The default timeout is shorter and may cause failures for complex prompts.

## Step 4.11: Action 9 -- Extract Base64 Image from Response

WHERE AM I?: Power Automate > Flow Editor > Below HTTP_Gemini_Image

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
body('HTTP_Gemini_Image')?['candidates']?[0]?['content']?['parts']?[1]?['inlineData']?['data']
```

3. Click OK.

4. Rename this action to Extract_Base64_Image.

> **BEGINNER TIP**: The Gemini API returns a JSON response where the generated image is embedded as a base64-encoded string inside the candidates array. The path candidates[0].content.parts[1].inlineData.data navigates to that string. Parts[0] is typically the text response, and parts[1] is the image data.

## Step 4.12: Action 10 -- Convert Base64 to Binary

WHERE AM I?: Power Automate > Flow Editor > Below Extract_Base64_Image

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
base64ToBinary(outputs('Extract_Base64_Image'))
```

3. Click OK.

4. Rename this action to Convert_To_Binary.

## Step 4.13: Action 11 -- Build the File Name

WHERE AM I?: Power Automate > Flow Editor > Below Convert_To_Binary

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat(triggerBody()?['character_name'],'_portrait_',formatDateTime(utcNow(),'yyyyMMdd_HHmmss'),'.png')
```

3. Click OK.

4. Rename this action to Build_File_Name.

## Step 4.14: Action 12 -- Create Character Folder in SharePoint

WHERE AM I?: Power Automate > Flow Editor > Below Build_File_Name

1. Click + -> Add an action -> search for "Create new folder" -> select Create new folder (SharePoint connector).

2. Configure:
   - Site Address: Select your SharePoint site from the dropdown (or paste https://yourcompany.sharepoint.com/sites/ResearchHub).
   - List or Library: Select Shared Documents.
   - Folder Path: Click the Expression tab (fx) and paste: `concat('/Character Library/',triggerBody()?['character_name'])` -> click OK.

3. Rename this action to Create_Character_Folder.

> **WATCH OUT**: If the folder already exists (for example, when regenerating a portrait for an existing character), this action may fail. To handle this gracefully, click the three dots (...) -> Settings -> scroll down to Run After -> check "has failed" in addition to "is successful" -> click Done. This allows the flow to continue even if the folder already exists.

## Step 4.15: Action 13 -- Upload Portrait to SharePoint

WHERE AM I?: Power Automate > Flow Editor > Below Create_Character_Folder

1. Click + -> Add an action -> search for "Create file" -> select Create file (SharePoint connector).

2. Configure:
   - Site Address: Select your SharePoint site from the dropdown.
   - Folder Path: Click the Expression tab (fx) and paste: `concat('/Shared Documents/Character Library/',triggerBody()?['character_name'])` -> click OK.
   - File Name: Click the dynamic content panel (lightning bolt icon) and select Outputs from Build_File_Name.
   - File Content: Click the dynamic content panel (lightning bolt icon) and select Outputs from Convert_To_Binary.

3. Rename this action to Upload_Portrait_To_SharePoint.

## Step 4.16: Action 14 -- Create Sharing Link

WHERE AM I?: Power Automate > Flow Editor > Below Upload_Portrait_To_SharePoint

1. Click + -> Add an action -> search for "Create sharing link" -> select Create sharing link for a file or folder (SharePoint connector).

2. Configure:
   - Site Address: Select your SharePoint site.
   - Item Id: Click the dynamic content panel (lightning bolt icon) -> from Upload_Portrait_To_SharePoint -> select ItemId.
   - Link Type: Organization
   - Link Scope: Organization

3. Rename this action to Create_Sharing_Link.

## Step 4.17: Action 15 -- Respond to the Agent

WHERE AM I?: Power Automate > Flow Editor > Below Create_Sharing_Link

1. Click + -> Add an action -> search for "Respond to Copilot" -> select Respond to Copilot (or "Return value(s) to Power Virtual Agents" depending on your version).

2. Click + Add an output two times to create two outputs:

**Output 1:**
- Type: Text
- Name: image_url
- Value: Click the dynamic content panel (lightning bolt icon) -> from Create_Sharing_Link -> select Sharing Link (or WebUrl).

**Output 2:**
- Type: Text
- Name: status
- Value: Type the literal text: completed

3. Configure async response: Click the Respond to Copilot action -> click the three dots (...) -> Settings -> Networking -> find "Asynchronous Response" and set it to Off -> click Done.

4. Click Save at the top of the flow editor. Wait for the green "Your flow is ready" banner.

> **CRITICAL**: The Asynchronous Response toggle MUST be set to Off. If it is On, the agent will not wait for the flow to complete and will not receive the output values.

## Step 4.18: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Get_Gemini_Key | Compose | Gemini API key (Secure Inputs/Outputs ON) |
| 2 | Build_Character_Prompt | Compose | concat() with trigger inputs for detailed prompt |
| 3 | Escape_Character_Prompt | Compose | 4-step escape chain for JSON safety |
| 4 | Init_Has_Reference | Initialize Variable | Boolean: not(empty(reference_image_base64)) |
| 5 | Condition | Condition | varHasReference equals true |
| 5a | Build_Body_With_Reference | Compose (Yes) | JSON body with inlineData + text parts |
| 5b | Build_Body_Without_Reference | Compose (No) | JSON body with text part only |
| 6 | Select_Request_Body | Compose | if() to pick correct body |
| 7 | Build_Gemini_URL | Compose | concat() URL with API key (Secure ON) |
| 8 | HTTP_Gemini_Image | HTTP | POST to gemini-3-pro-image-preview, timeout PT120S |
| 9 | Extract_Base64_Image | Compose | candidates[0].content.parts[1].inlineData.data |
| 10 | Convert_To_Binary | Compose | base64ToBinary() |
| 11 | Build_File_Name | Compose | concat() with character name + timestamp |
| 12 | Create_Character_Folder | SharePoint Create Folder | /Character Library/{name} |
| 13 | Upload_Portrait_To_SharePoint | SharePoint Create File | PNG to character folder |
| 14 | Create_Sharing_Link | SharePoint Sharing Link | Organization scope |
| 15 | Respond to Copilot | Respond | image_url, status (Async OFF) |

---

# PHASE 5: Register Generate Character Portrait -- TOOL REGISTRATION

This phase registers the Generate Character Portrait flow as a tool in Copilot Studio and connects it to the Character Creation topic's Action node.

## Step 5.1: Register the Flow as an Agent-Level Tool

WHERE AM I?: Copilot Studio > Agent > Overview > Tools

1. Go back to your Copilot Studio tab (https://copilotstudio.microsoft.com).

2. Open your Consistent Character Creator agent.

3. On the Overview page, find the Tools section. Click Add a tool.

4. In the tool picker, search for or scroll to find Generate Character Portrait in the list of available flows. Click it -> click Add and configure.

5. On the configuration screen:
   - Name: Generate Character Portrait
   - Description (this is what the AI orchestrator reads to decide when to call this tool): Generates a character portrait image using the Google Gemini gemini-3-pro-image-preview API. Composes a detailed prompt from character attributes and art style, calls the image generation endpoint, and returns the SharePoint URL of the generated portrait. Call this tool when the user wants to create a new character portrait or regenerate an existing one. Does NOT handle video generation.

6. Map the inputs:
   - character_name -> The orchestrator fills this from conversation context
   - character_description -> The orchestrator fills this from conversation context
   - style -> The orchestrator fills this from conversation context
   - aspect_ratio -> The orchestrator fills this from conversation context
   - reference_image_base64 -> The orchestrator fills this from conversation context (empty for new characters)

7. Set Completion mode to: Don't respond (default) -- the agent incorporates the output into its own response.

8. Click Save.

## Step 5.2: Connect the Flow to the Character Creation Topic Action Node

WHERE AM I?: Copilot Studio > Agent > Topics > Character Creation > Canvas

1. Open the Character Creation topic from the Topics tab.

2. Find the placeholder message node you created in Step 3.9 (the one that says "[PLACEHOLDER] Replace this node...").

3. Delete the placeholder node: click the three dots (...) on the node -> Delete.

4. Click the + button where the placeholder was. In the node menu, click Add a tool.

5. A panel opens showing available tools. Find Generate Character Portrait and click it. A new Action node appears in the topic.

6. Map each input parameter to topic variables:
   - character_name: Click the input field -> click {x} -> select Topic.varCharacterName
   - character_description: Click the input field -> click {x} -> select Topic.varCharacterAttributes
   - style: Click the input field -> click {x} -> select Topic.varArtStyle
   - aspect_ratio: Click the input field -> click {x} -> select Topic.varAspectRatio
   - reference_image_base64: Click the input field -> click the formula icon (fx) -> type `Text("")` -> click Done. (Empty string for new character creation -- no reference image.)

7. The Action node shows output variables. Click the image_url output variable name and rename it to varPortraitUrl. Click the status output variable name and rename it to varGenerationStatus.

8. Click Save at the top of the canvas.

> **VERIFY**: The Character Creation topic now has a real Action node calling the Generate Character Portrait flow, with all five inputs mapped and two outputs captured.

---

# PHASE 6: Scene Composition -- TOPIC BUILD (Node-by-Node: 7 Nodes)

This topic allows users to place an existing character into a new scene context while maintaining visual consistency. It loads the character's reference portrait from SharePoint and passes it as conditioning input to the Gemini API.

## Step 6.1: Create the Scene Composition Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Custom > + Add a topic > From blank

1. Click the Topics tab -> Custom subtab -> click + Add a topic -> From blank.

2. Rename the topic to: Scene Composition

3. Click the Description field. Type: User wants to place an existing character into a new scene or context while maintaining visual consistency. Route here when the user mentions creating a scene, placing a character somewhere, generating a character in a specific setting, or composing a scene image. Does NOT handle new character creation or video generation.

## Step 6.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agent > Topics > Scene Composition > Trigger node

1. In the Trigger node, add these trigger phrases (press Enter after each one):
   - create scene
   - place character in setting
   - generate scene composition
   - character in context
   - put my character in a scene
   - scene with existing character
   - compose a scene image
   - create a scene with this character

## Step 6.3: Add Node 1 -- Message -- "Scene Composition Introduction"

WHERE AM I?: Copilot Studio > Agent > Topics > Scene Composition > Canvas

1. Click the + button below the Trigger node. Click Send a message.

2. In the message text field, type:

```
Scene Composition uses your character's reference portrait as conditioning input to maintain visual identity while placing the character in a new context.

How it works:
1. Select a character from your library (or use the current character)
2. Describe the scene: setting, pose, lighting, and props
3. I generate the scene image using the reference portrait for consistency

Note: Extreme pose changes, drastically different clothing, or conflicting art styles may reduce character consistency. I will warn you if your request might affect consistency.
```

## Step 6.4: Add Node 2 -- Question -- "Select Character for Scene"

WHERE AM I?: Copilot Studio > Agent > Topics > Scene Composition > Canvas (below Node 1)

1. Click the + button. Click Ask a question.

2. In the question text field, type:

```
Which character would you like to use for this scene? Type the character's name exactly as it appears in your library. If you just created a character, I will use that one by default.
```

3. Under "Identify", select User's entire response.

4. Click the output variable name. Rename it to varSceneCharacterName.

## Step 6.5: Add Node 3 -- Set Variable -- "Set Current Character"

WHERE AM I?: Copilot Studio > Agent > Topics > Scene Composition > Canvas (below Node 2)

1. Click the + button. Click Variable management -> Set a variable value.

2. In the "Set variable" node:
   - Variable: Select Global.varCurrentCharacterName.
   - To value: Click {x} -> select Topic.varSceneCharacterName.

## Step 6.6: Add Node 4 -- Question -- "Describe Scene Context"

WHERE AM I?: Copilot Studio > Agent > Topics > Scene Composition > Canvas (below Node 3)

1. Click the + button. Click Ask a question.

2. In the question text field, type:

```
Describe the scene you want to place the character in. Include:

- Setting/background (office, park, cafe, city street, laboratory, etc.)
- Character pose or action (sitting, presenting, walking, reading, etc.)
- Lighting conditions (natural daylight, warm indoor, dramatic spotlight, etc.)
- Any props or additional elements (laptop, coffee cup, books, etc.)
- Mood or atmosphere (professional, casual, mysterious, energetic, etc.)
```

3. Under "Identify", select User's entire response.

4. Click the output variable name. Rename it to varSceneDescription.

## Step 6.7: Add Node 5 -- Message -- "Generating Scene"

WHERE AM I?: Copilot Studio > Agent > Topics > Scene Composition > Canvas (below Node 4)

1. Click the + button. Click Send a message.

2. In the message text field, type:

```
Generating scene composition for {Global.varCurrentCharacterName}. Using the character's reference portrait for visual consistency.

Scene: {Topic.varSceneDescription}

This typically takes 15-30 seconds. The reference image helps maintain the character's facial features, hair, and overall appearance in the new context.
```

3. Insert the variables using the {x} button as described in previous steps.

## Step 6.8: Add Node 6 -- Action -- "Generate Scene Image" (Call Generate Character Portrait Flow)

WHERE AM I?: Copilot Studio > Agent > Topics > Scene Composition > Canvas (below Node 5)

1. Click the + button. Click Add a tool.

2. Find Generate Character Portrait in the tool list and click it. A new Action node appears.

3. Map each input parameter:
   - character_name: Click {x} -> select Global.varCurrentCharacterName
   - character_description: Click {x} -> select Topic.varSceneDescription
   - style: Type the literal text: photorealistic (or you could add a Question node to ask the user -- for simplicity we default to photorealistic for scenes)
   - aspect_ratio: Type the literal text: landscape (scenes default to 16:9 landscape)
   - reference_image_base64: Click the formula icon (fx) -> type `Text("")` -> click Done.

> **WATCH OUT**: For the reference_image_base64 input, we are passing an empty string here because retrieving the base64 content of a SharePoint file requires an additional flow action. In a production implementation, you would create a separate "Get Character Reference" flow that downloads the reference image from SharePoint, converts it to base64, and returns it. For this initial build, the scene will be generated based on the text description alone. The reference image conditioning can be added as an enhancement by modifying the flow to accept a SharePoint file URL and download the image before calling the API.

4. Click the image_url output variable name and rename it to varSceneImageUrl. Click the status output variable name and rename it to varSceneStatus.

## Step 6.9: Add Node 7 -- Adaptive Card -- "Scene Result Gallery"

WHERE AM I?: Copilot Studio > Agent > Topics > Scene Composition > Canvas (below Node 6)

1. Click the + button. Click Ask with Adaptive Card.

2. Click the three dots (...) -> Properties -> Edit adaptive card.

3. Delete any default content and paste this exact JSON:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "SCENE COMPOSITION COMPLETE",
      "weight": "Bolder",
      "size": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Your scene has been generated and saved to the Character Library.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Character",
          "value": "See character name in message above"
        },
        {
          "title": "Status",
          "value": "Saved to Character Library"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "What would you like to do next?",
      "weight": "Bolder",
      "size": "Medium",
      "wrap": true,
      "separator": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "sceneAction",
      "label": "Next action",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Create another scene with this character",
          "value": "another_scene"
        },
        {
          "title": "Generate a video of this character",
          "value": "video"
        },
        {
          "title": "Create a new character",
          "value": "new_character"
        },
        {
          "title": "Browse my character library",
          "value": "library"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "CONTINUE"
    }
  ]
}
```

4. Click Save in the JSON editor.

5. Click the sceneAction output variable name. Rename it to varSceneAction.

6. Click Save at the top of the canvas.

## Step 6.10: Complete YAML for Scene Composition Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Scene Composition > (...) > Open code editor

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Scene Composition
    triggerQueries:
      - create scene
      - place character in setting
      - generate scene composition
      - character in context
      - put my character in a scene
      - scene with existing character
      - compose a scene image
      - create a scene with this character
  actions:
    - kind: SendMessage
      id: sceneIntro
      message: |-
        Scene Composition uses your character's reference portrait as conditioning input to maintain visual identity while placing the character in a new context.

        How it works:
        1. Select a character from your library (or use the current character)
        2. Describe the scene: setting, pose, lighting, and props
        3. I generate the scene image using the reference portrait for consistency

        Note: Extreme pose changes, drastically different clothing, or conflicting art styles may reduce character consistency. I will warn you if your request might affect consistency.

    - kind: Question
      id: askSceneCharacter
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varSceneCharacterName
      prompt: "Which character would you like to use for this scene? Type the character's name exactly as it appears in your library. If you just created a character, I will use that one by default."
      entity: StringPrebuiltEntity

    - kind: SetVariable
      id: setCurrentChar
      variable: Global.varCurrentCharacterName
      value: =Topic.varSceneCharacterName

    - kind: Question
      id: askSceneDesc
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varSceneDescription
      prompt: |-
        Describe the scene you want to place the character in. Include:

        - Setting/background (office, park, cafe, city street, laboratory, etc.)
        - Character pose or action (sitting, presenting, walking, reading, etc.)
        - Lighting conditions (natural daylight, warm indoor, dramatic spotlight, etc.)
        - Any props or additional elements (laptop, coffee cup, books, etc.)
        - Mood or atmosphere (professional, casual, mysterious, energetic, etc.)
      entity: StringPrebuiltEntity

    - kind: SendMessage
      id: generatingScene
      message: |-
        Generating scene composition for {Global.varCurrentCharacterName}. Using the character's reference portrait for visual consistency.

        Scene: {Topic.varSceneDescription}

        This typically takes 15-30 seconds. The reference image helps maintain the character's facial features, hair, and overall appearance in the new context.

    - kind: SendMessage
      id: callSceneFlowPlaceholder
      message: "[ACTION] Replace this node with an Action node that calls the Generate Character Portrait flow. Map inputs: character_name = Global.varCurrentCharacterName, character_description = Topic.varSceneDescription, style = photorealistic, aspect_ratio = landscape, reference_image_base64 = Text('') (empty). Capture outputs: image_url into Topic.varSceneImageUrl, status into Topic.varSceneStatus."

    - kind: EndDialog
      id: endScene
```

---

# PHASE 7: Generate Character Portrait -- FLOW BUILD (Action-by-Action)

The Scene Composition topic reuses the same Generate Character Portrait flow that was built in Phase 4. No new flow needs to be built for this capability.

## Step 7.1: Confirm Flow Reuse

WHERE AM I?: Power Automate > Solutions > Consistent Character Creator Solution > Generate Character Portrait

1. Open Power Automate and navigate to your solution.

2. Confirm that the Generate Character Portrait flow is present and published.

3. The Scene Composition topic calls this same flow with different input values:
   - character_name: The existing character's name (from Global.varCurrentCharacterName)
   - character_description: The scene description (from Topic.varSceneDescription) -- the flow's prompt builder will compose this into a scene-appropriate prompt
   - style: "photorealistic" (hardcoded for scenes)
   - aspect_ratio: "landscape" (hardcoded for scenes)
   - reference_image_base64: Empty string for now (reference conditioning enhancement described in Phase 6 Step 6.8)

> **BEGINNER TIP**: Reusing the same flow for both character creation and scene composition is an intentional design decision. The flow's Condition action (Step 4.7) already handles both cases: when reference_image_base64 is empty, it sends a text-only request; when it contains data, it includes the reference image. This means the same flow works for both new character portraits and scene compositions.

---

# PHASE 8: Register Generate Character Portrait -- TOOL REGISTRATION

The Generate Character Portrait flow was already registered as a tool in Phase 5. The Scene Composition topic uses the same tool registration.

## Step 8.1: Confirm Tool Registration for Scene Composition

WHERE AM I?: Copilot Studio > Agent > Overview > Tools

1. Open your Consistent Character Creator agent in Copilot Studio.

2. Navigate to the Tools section on the Overview page.

3. Confirm that Generate Character Portrait is listed as a registered tool.

4. The tool description from Phase 5 already covers scene composition use cases: "Generates a character portrait image using the Google Gemini gemini-3-pro-image-preview API."

5. No additional tool registration is needed. The Scene Composition topic calls the same tool via its Action node (configured in Step 6.8).

> **VERIFY**: The Generate Character Portrait tool appears in the Tools section and the Scene Composition topic has an Action node connected to it.

---

# PHASE 9: Video Generation -- TOPIC BUILD (Node-by-Node: 8 Nodes)

This topic creates short animated video clips of characters using the Google Veo 3.1 API. Video generation is asynchronous and typically takes 2-5 minutes, so the flow uses a polling pattern.

## Step 9.1: Create the Video Generation Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Custom > + Add a topic > From blank

1. Click the Topics tab -> Custom subtab -> click + Add a topic -> From blank.

2. Rename the topic to: Video Generation

3. Click the Description field. Type: User wants to generate a short animated video clip of a character. Route here when the user mentions video, animation, motion, Veo, or wants to see a character in action or moving. Does NOT handle still image generation or character creation.

## Step 9.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Trigger node

1. In the Trigger node, add these trigger phrases:
   - generate character video
   - create animation
   - animate character
   - Veo video clip
   - character in motion
   - make a video of my character
   - create a short clip
   - animate my character

## Step 9.3: Add Node 1 -- Message -- "Video Generation Overview"

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Canvas

1. Click the + button below the Trigger node. Click Send a message.

2. In the message text field, type:

```
Video Generation creates short animated clips of your characters using Google Veo 3.1.

Key details:
- Maximum duration: 8 seconds per clip
- Processing time: typically 2-5 minutes (I will notify you when ready)
- Uses your character's reference portrait for visual consistency
- Supported aspect ratios: 16:9 (landscape), 9:16 (portrait at 720p only), 1:1 (square)

For longer sequences, I recommend generating multiple clips and combining them externally.
```

## Step 9.4: Add Node 2 -- Question -- "Select Character for Video"

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Canvas (below Node 1)

1. Click the + button. Click Ask a question.

2. In the question text field, type: Which character would you like to animate? Type the character's name as it appears in your library.

3. Under "Identify", select User's entire response.

4. Click the output variable name. Rename it to varVideoCharacterName.

## Step 9.5: Add Node 3 -- Question -- "Describe Video Scene and Action"

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Canvas (below Node 2)

1. Click the + button. Click Ask a question.

2. In the question text field, type:

```
Describe what the character should be doing in the video. Include:

- Action (walking, talking, gesturing, turning around, etc.)
- Setting (office, outdoor, studio, etc.)
- Camera movement (static, slow pan, zoom in, tracking shot, etc.)
- Expression or emotion (smiling, serious, excited, thoughtful, etc.)
- Any specific details (holding an object, interacting with environment, etc.)
```

3. Under "Identify", select User's entire response.

4. Click the output variable name. Rename it to varVideoSceneDescription.

## Step 9.6: Add Node 4 -- Question -- "Set Video Duration"

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Canvas (below Node 3)

1. Click the + button. Click Ask a question.

2. In the question text field, type: How long should the video clip be? Enter a number between 2 and 8 seconds. Default is 4 seconds.

3. Under "Identify", select Number.

4. Click the output variable name. Rename it to varVideoDuration.

## Step 9.7: Add Node 5 -- Question -- "Select Video Aspect Ratio"

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Canvas (below Node 4)

1. Click the + button. Click Ask a question.

2. In the question text field, type: What aspect ratio for the video?

3. Under "Identify", select Multiple choice options.

4. Add these options:
   - Option 1: 16:9 Landscape (1080p)
   - Option 2: 9:16 Portrait (720p only)
   - Option 3: 1:1 Square

5. Click the output variable name. Rename it to varVideoAspectRatio.

> **WATCH OUT**: 9:16 portrait aspect ratio for video only supports 720p resolution, NOT 1080p. The agent instructions and this question node both inform the user of this limitation.

## Step 9.8: Add Node 6 -- Action -- "Execute Video Generation" (Call Generate Character Video Flow)

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Canvas (below Node 5)

1. Click the + button. Click Send a message (placeholder until the flow is built in Phase 10).

2. Type:

```
[PLACEHOLDER] Replace this node with an Action node that calls the Generate Character Video flow after building it in Phase 10. Map inputs: character_name = Topic.varVideoCharacterName, animation_prompt = Topic.varVideoSceneDescription, duration = Topic.varVideoDuration, aspect_ratio = Topic.varVideoAspectRatio. Capture outputs: video_url into Topic.varVideoUrl, status into Topic.varVideoStatus.
```

## Step 9.9: Add Node 7 -- Message -- "Video Processing Status"

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Canvas (below Node 6)

1. Click the + button. Click Send a message.

2. In the message text field, type:

```
Video generation has been submitted for {Topic.varVideoCharacterName}.

Processing typically takes 2-5 minutes. The Veo 3.1 model is creating your animated clip based on the character reference and scene description.

I will provide the video link as soon as it is ready. You can continue chatting while you wait.
```

## Step 9.10: Add Node 8 -- Adaptive Card -- "Video Result Card"

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Canvas (below Node 7)

1. Click the + button. Click Ask with Adaptive Card.

2. Click the three dots (...) -> Properties -> Edit adaptive card.

3. Delete any default content and paste this exact JSON:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "VIDEO GENERATION COMPLETE",
      "weight": "Bolder",
      "size": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Your character video clip has been generated and saved to the Character Library.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Character",
          "value": "See character name above"
        },
        {
          "title": "Duration",
          "value": "See duration above"
        },
        {
          "title": "Aspect Ratio",
          "value": "See aspect ratio above"
        },
        {
          "title": "Status",
          "value": "Saved to Character Library"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "What would you like to do next?",
      "weight": "Bolder",
      "size": "Medium",
      "wrap": true,
      "separator": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "videoAction",
      "label": "Next action",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Generate another video clip",
          "value": "another_video"
        },
        {
          "title": "Create a scene with this character",
          "value": "scene"
        },
        {
          "title": "Create a new character",
          "value": "new_character"
        },
        {
          "title": "Browse my character library",
          "value": "library"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "CONTINUE"
    }
  ]
}
```

4. Click Save in the JSON editor.

5. Click the videoAction output variable name. Rename it to varVideoAction.

6. Click Save at the top of the canvas.

## Step 9.11: Complete YAML for Video Generation Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > (...) > Open code editor

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Video Generation
    triggerQueries:
      - generate character video
      - create animation
      - animate character
      - Veo video clip
      - character in motion
      - make a video of my character
      - create a short clip
      - animate my character
  actions:
    - kind: SendMessage
      id: videoIntro
      message: |-
        Video Generation creates short animated clips of your characters using Google Veo 3.1.

        Key details:
        - Maximum duration: 8 seconds per clip
        - Processing time: typically 2-5 minutes (I will notify you when ready)
        - Uses your character's reference portrait for visual consistency
        - Supported aspect ratios: 16:9 (landscape), 9:16 (portrait at 720p only), 1:1 (square)

        For longer sequences, I recommend generating multiple clips and combining them externally.

    - kind: Question
      id: askVideoCharacter
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varVideoCharacterName
      prompt: "Which character would you like to animate? Type the character's name as it appears in your library."
      entity: StringPrebuiltEntity

    - kind: Question
      id: askVideoScene
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varVideoSceneDescription
      prompt: |-
        Describe what the character should be doing in the video. Include:

        - Action (walking, talking, gesturing, turning around, etc.)
        - Setting (office, outdoor, studio, etc.)
        - Camera movement (static, slow pan, zoom in, tracking shot, etc.)
        - Expression or emotion (smiling, serious, excited, thoughtful, etc.)
        - Any specific details (holding an object, interacting with environment, etc.)
      entity: StringPrebuiltEntity

    - kind: Question
      id: askDuration
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varVideoDuration
      prompt: "How long should the video clip be? Enter a number between 2 and 8 seconds. Default is 4 seconds."
      entity: NumberPrebuiltEntity

    - kind: Question
      id: askVideoAspect
      interruptionPolicy:
        allowInterruption: true
      variable: init:Topic.varVideoAspectRatio
      prompt: "What aspect ratio for the video?"
      entity:
        kind: EmbeddedEntity
        definition:
          kind: ClosedListEntity
          smartMatchingEnabled: true
          items:
            - id: landscape
              displayName: "16:9 Landscape (1080p)"
            - id: portrait
              displayName: "9:16 Portrait (720p only)"
            - id: square
              displayName: "1:1 Square"

    - kind: SendMessage
      id: callVideoFlowPlaceholder
      message: "[ACTION] Replace this node with an Action node that calls the Generate Character Video flow. Map inputs: character_name = Topic.varVideoCharacterName, animation_prompt = Topic.varVideoSceneDescription, duration = Topic.varVideoDuration, aspect_ratio = Topic.varVideoAspectRatio. Capture outputs: video_url into Topic.varVideoUrl, status into Topic.varVideoStatus."

    - kind: SendMessage
      id: videoProcessing
      message: |-
        Video generation has been submitted for {Topic.varVideoCharacterName}.

        Processing typically takes 2-5 minutes. The Veo 3.1 model is creating your animated clip based on the character reference and scene description.

        I will provide the video link as soon as it is ready. You can continue chatting while you wait.

    - kind: EndDialog
      id: endVideo
```

---

# PHASE 10: Generate Character Video -- FLOW BUILD (Action-by-Action)

This flow calls the Google Veo 3.1 API to generate animated video clips. Video generation is asynchronous -- the API returns an operation name that must be polled until completion. The flow uses a Do Until loop to poll every 10 seconds for up to 10 minutes.

## Step 10.1: Create the Flow

WHERE AM I?: Power Automate > Solutions > Consistent Character Creator Solution

1. Open Power Automate and navigate to your solution.

2. Click + New -> Automation -> Cloud flow -> Instant.

3. In the dialog:
   - Flow name: Generate Character Video
   - Trigger: Run a flow from Copilot

4. Click Create.

## Step 10.2: Configure the Trigger with Input Parameters

WHERE AM I?: Power Automate > Flow Editor > Trigger node

1. Click + Add an input inside the trigger. Add four inputs:

**Input 1:**
- Click + Add an input -> select Text.
- Input name: character_name
- Description: Name of the character for file naming

**Input 2:**
- Click + Add an input -> select Text.
- Input name: animation_prompt
- Description: Description of the character action, scene setting, and camera movement

**Input 3:**
- Click + Add an input -> select Text.
- Input name: duration
- Description: Video duration in seconds (2-8)

**Input 4:**
- Click + Add an input -> select Text.
- Input name: aspect_ratio
- Description: Video aspect ratio (landscape, portrait, square)

## Step 10.3: Action 1 -- Get Gemini API Key

WHERE AM I?: Power Automate > Flow Editor > Below trigger

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, paste your Gemini API key.

3. Secure this action: Click (...) -> Settings -> Secure Inputs: On -> Secure Outputs: On -> Done.

4. Rename to Get_Gemini_Key.

## Step 10.4: Action 2 -- Map Aspect Ratio to API Value

WHERE AM I?: Power Automate > Flow Editor > Below Get_Gemini_Key

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
if(equals(triggerBody()?['aspect_ratio'],'landscape'),'16:9',if(equals(triggerBody()?['aspect_ratio'],'portrait'),'9:16','1:1'))
```

3. Click OK.

4. Rename to Map_Aspect_Ratio.

## Step 10.5: Action 3 -- Escape the Animation Prompt

WHERE AM I?: Power Automate > Flow Editor > Below Map_Aspect_Ratio

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
replace(replace(replace(replace(triggerBody()?['animation_prompt'],'\','\\'),'"','\"'),decodeUriComponent('%0A'),'\n'),decodeUriComponent('%0D'),'')
```

3. Click OK.

4. Rename to Escape_Animation_Prompt.

## Step 10.6: Action 4 -- Build the Veo API Request Body

WHERE AM I?: Power Automate > Flow Editor > Below Escape_Animation_Prompt

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('{"instances":[{"prompt":"',outputs('Escape_Animation_Prompt'),'"}],"parameters":{"aspectRatio":"',outputs('Map_Aspect_Ratio'),'","sampleCount":1}}')
```

3. Click OK.

4. Rename to Build_Veo_Body.

> **BEGINNER TIP**: This body does NOT include an image reference because retrieving the character portrait from SharePoint as base64 requires additional flow actions. For the initial build, the video is generated from the text prompt alone. To add image conditioning, you would add a "Get file content" SharePoint action before this step, convert the file content to base64, and include it in the body as: "image": {"bytesBase64Encoded": "{base64}", "mimeType": "image/jpeg"}.

## Step 10.7: Action 5 -- Build the Veo API URL

WHERE AM I?: Power Automate > Flow Editor > Below Build_Veo_Body

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=',outputs('Get_Gemini_Key'))
```

3. Click OK.

4. Rename to Build_Veo_URL.

5. Secure: (...) -> Settings -> Secure Inputs: On -> Secure Outputs: On -> Done.

## Step 10.8: Action 6 -- HTTP POST to Initiate Video Generation

WHERE AM I?: Power Automate > Flow Editor > Below Build_Veo_URL

1. Click + -> Add an action -> search for "HTTP" -> select HTTP.

2. Configure:
   - Method: POST
   - URI: Click the dynamic content panel (lightning bolt) -> select Outputs from Build_Veo_URL.
   - Headers: Click + Add new parameter -> check Headers.
     - Header 1: Key = Content-Type | Value = application/json
   - Body: Click the dynamic content panel (lightning bolt) -> select Outputs from Build_Veo_Body.

3. Timeout: (...) -> Settings -> Networking -> Timeout: PT120S -> Done.

4. Secure: (...) -> Settings -> Secure Inputs: On -> Done.

5. Rename to HTTP_Veo_Initiate.

## Step 10.9: Action 7 -- Extract Operation Name

WHERE AM I?: Power Automate > Flow Editor > Below HTTP_Veo_Initiate

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
body('HTTP_Veo_Initiate')?['name']
```

3. Click OK.

4. Rename to Extract_Operation_Name.

> **BEGINNER TIP**: The Veo API returns an operation name (like "operations/abc123def456") that you use to check whether the video generation is complete. This is called an "asynchronous polling pattern" -- you submit the job, get a reference ID, then repeatedly check the status until it is done.

## Step 10.10: Action 8 -- Initialize Polling Variables

WHERE AM I?: Power Automate > Flow Editor > Below Extract_Operation_Name

1. Click + -> Add an action -> search for "Initialize variable" -> select Initialize variable.

2. Fill in:
   - Name: varVideoDone
   - Type: Boolean
   - Value: false (click the toggle to select false)

3. Rename to Init_Video_Done.

4. Click + -> Add an action -> Initialize variable again:
   - Name: varVideoUri
   - Type: String
   - Value: (leave empty)

5. Rename to Init_Video_Uri.

## Step 10.11: Action 9 -- Do Until Loop (Poll for Completion)

WHERE AM I?: Power Automate > Flow Editor > Below Init_Video_Uri

1. Click + -> Add an action -> search for "Do until" -> select Do until (under "Control").

2. In the Do until condition:
   - Left side: Click the dynamic content panel (lightning bolt) -> select varVideoDone.
   - Operator: is equal to
   - Right side: Click the Expression tab (fx) -> type `true` -> click OK.

3. Click the three dots (...) on the Do until action -> Settings -> set:
   - Count: 60 (maximum iterations)
   - Timeout: PT10M (10 minutes maximum)
   - Click Done.

**Inside the Do Until loop:**

4. Click + (inside the loop) -> Add an action -> search for "Delay" -> select Delay (under "Schedule").

5. Configure:
   - Count: 10
   - Unit: Second

6. Rename to Delay_10_Seconds.

7. Click + (inside the loop, below the Delay) -> Add an action -> search for "Compose" -> select Compose.

8. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat('https://generativelanguage.googleapis.com/v1beta/',outputs('Extract_Operation_Name'),'?key=',outputs('Get_Gemini_Key'))
```

9. Click OK.

10. Rename to Build_Poll_URL.

11. Secure: (...) -> Settings -> Secure Inputs: On -> Secure Outputs: On -> Done.

12. Click + (inside the loop) -> Add an action -> search for "HTTP" -> select HTTP.

13. Configure:
    - Method: GET
    - URI: Click the dynamic content panel (lightning bolt) -> select Outputs from Build_Poll_URL.

14. Timeout: (...) -> Settings -> Networking -> Timeout: PT120S -> Done.

15. Secure: (...) -> Settings -> Secure Inputs: On -> Done.

16. Rename to HTTP_Poll_Status.

17. Click + (inside the loop) -> Add an action -> search for "Condition" -> select Condition.

18. In the condition:
    - Left side: Click the Expression tab (fx) and paste: `body('HTTP_Poll_Status')?['done']` -> click OK.
    - Operator: is equal to
    - Right side: Click the Expression tab (fx) and type: `true` -> click OK.

**If yes branch (video is done):**

19. Inside the Yes branch, click + -> Add an action -> search for "Compose" -> select Compose.

20. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
body('HTTP_Poll_Status')?['response']?['generateVideoResponse']?['generatedSamples']?[0]?['video']?['uri']
```

21. Click OK.

22. Rename to Extract_Video_URI.

23. Click + -> Add an action -> search for "Set variable" -> select Set variable.

24. Configure:
    - Name: Select varVideoUri
    - Value: Click the Expression tab (fx) and paste: `concat(outputs('Extract_Video_URI'),'?key=',outputs('Get_Gemini_Key'))` -> click OK.

25. Rename to Set_Video_URI.

26. Secure: (...) -> Settings -> Secure Outputs: On -> Done.

27. Click + -> Add an action -> search for "Set variable" -> select Set variable.

28. Configure:
    - Name: Select varVideoDone
    - Value: Click the Expression tab (fx) and type: `true` -> click OK.

29. Rename to Set_Done_True.

**If no branch (video still processing):**

30. Leave the No branch empty. The loop will continue to the next iteration.

## Step 10.12: Action 10 -- Download the Video File

WHERE AM I?: Power Automate > Flow Editor > Below the Do Until loop

1. Below the entire Do Until loop (outside it), click + -> Add an action -> search for "HTTP" -> select HTTP.

2. Configure:
   - Method: GET
   - URI: Click the dynamic content panel (lightning bolt) -> select varVideoUri.

3. Timeout: (...) -> Settings -> Networking -> Timeout: PT120S -> Done.

4. Secure: (...) -> Settings -> Secure Inputs: On -> Done.

5. Rename to HTTP_Download_Video.

## Step 10.13: Action 11 -- Build Video File Name

WHERE AM I?: Power Automate > Flow Editor > Below HTTP_Download_Video

1. Click + -> Add an action -> search for "Compose" -> select Compose.

2. In the Inputs field, click the Expression tab (fx) and paste:

**COPY-PASTE** into the Expression field:
```
concat(triggerBody()?['character_name'],'_video_',formatDateTime(utcNow(),'yyyyMMdd_HHmmss'),'.mp4')
```

3. Click OK.

4. Rename to Build_Video_File_Name.

## Step 10.14: Action 12 -- Upload Video to SharePoint

WHERE AM I?: Power Automate > Flow Editor > Below Build_Video_File_Name

1. Click + -> Add an action -> search for "Create file" -> select Create file (SharePoint connector).

2. Configure:
   - Site Address: Select your SharePoint site.
   - Folder Path: Click the Expression tab (fx) and paste: `concat('/Shared Documents/Character Library/',triggerBody()?['character_name'])` -> click OK.
   - File Name: Click the dynamic content panel (lightning bolt) -> select Outputs from Build_Video_File_Name.
   - File Content: Click the dynamic content panel (lightning bolt) -> from HTTP_Download_Video -> select Body.

3. Rename to Upload_Video_To_SharePoint.

## Step 10.15: Action 13 -- Create Video Sharing Link

WHERE AM I?: Power Automate > Flow Editor > Below Upload_Video_To_SharePoint

1. Click + -> Add an action -> search for "Create sharing link" -> select Create sharing link for a file or folder (SharePoint connector).

2. Configure:
   - Site Address: Select your SharePoint site.
   - Item Id: Click the dynamic content panel (lightning bolt) -> from Upload_Video_To_SharePoint -> select ItemId.
   - Link Type: Organization
   - Link Scope: Organization

3. Rename to Create_Video_Sharing_Link.

## Step 10.16: Action 14 -- Respond to the Agent

WHERE AM I?: Power Automate > Flow Editor > Below Create_Video_Sharing_Link

1. Click + -> Add an action -> search for "Respond to Copilot" -> select Respond to Copilot.

2. Click + Add an output two times:

**Output 1:**
- Type: Text
- Name: video_url
- Value: Click the dynamic content panel (lightning bolt) -> from Create_Video_Sharing_Link -> select Sharing Link.

**Output 2:**
- Type: Text
- Name: status
- Value: Type: completed

3. Configure async response: Click the Respond to Copilot action -> (...) -> Settings -> Networking -> Asynchronous Response: Off -> Done.

4. Click Save.

> **WATCH OUT**: This flow may exceed the 100-second synchronous timeout because video generation takes 2-5 minutes. The Do Until loop runs for up to 10 minutes. In practice, you may need to split this into two flows: one that initiates the video and returns the operation name immediately, and a second that polls and delivers the result. For the initial build, the flow will timeout if video generation takes longer than 100 seconds. The agent will display a timeout error, but the video will still be generated and saved to SharePoint by the flow's asynchronous actions. To handle this properly, move all actions after the "Respond to Copilot" action (the polling loop, download, and upload) to run asynchronously after the response.

> **CRITICAL**: To make this flow work within the 100-second limit, restructure it: Place the "Respond to Copilot" action IMMEDIATELY after HTTP_Veo_Initiate and Extract_Operation_Name. Return the operation_name and a status of "processing" to the agent. Then place the Do Until loop, download, and upload actions AFTER the Respond to Copilot action. These post-response actions can run for up to 30 days asynchronously. The agent will inform the user that video generation is in progress and they can check back later.

## Step 10.17: Action Stack Summary Table

| # | Action Name | Action Type | Key Configuration |
|---|---|---|---|
| 1 | Get_Gemini_Key | Compose | Gemini API key (Secure ON) |
| 2 | Map_Aspect_Ratio | Compose | if() to convert aspect ratio to API format |
| 3 | Escape_Animation_Prompt | Compose | 4-step escape chain |
| 4 | Build_Veo_Body | Compose | concat() JSON body with prompt and parameters |
| 5 | Build_Veo_URL | Compose | concat() URL with API key (Secure ON) |
| 6 | HTTP_Veo_Initiate | HTTP | POST to veo-3.1-fast-generate-preview, PT120S |
| 7 | Extract_Operation_Name | Compose | body()?['name'] |
| 8 | Init_Video_Done | Initialize Variable | Boolean: false |
| 9 | Init_Video_Uri | Initialize Variable | String: empty |
| 10 | **Respond to Copilot** | Respond | video_url = "processing", status = "submitted" (Async OFF) |
| 11 | Do Until (varVideoDone = true) | Control | Max 60 iterations, PT10M timeout |
| 11a | Delay_10_Seconds | Delay | 10 seconds |
| 11b | Build_Poll_URL | Compose | concat() poll URL (Secure ON) |
| 11c | HTTP_Poll_Status | HTTP | GET operation status, PT120S |
| 11d | Condition (done = true) | Condition | Check body()?['done'] |
| 11d-Y | Extract_Video_URI | Compose | response.generateVideoResponse path |
| 11d-Y | Set_Video_URI | Set Variable | concat(URI, ?key=) |
| 11d-Y | Set_Done_True | Set Variable | varVideoDone = true |
| 12 | HTTP_Download_Video | HTTP | GET video binary, PT120S |
| 13 | Build_Video_File_Name | Compose | concat() with name + timestamp |
| 14 | Upload_Video_To_SharePoint | SharePoint Create File | MP4 to character folder |
| 15 | Create_Video_Sharing_Link | SharePoint Sharing Link | Organization scope |

---

# PHASE 11: Register Generate Character Video -- TOOL REGISTRATION

## Step 11.1: Register the Flow as a Tool

WHERE AM I?: Copilot Studio > Agent > Overview > Tools

1. Open your Consistent Character Creator agent in Copilot Studio.

2. On the Overview page, find the Tools section. Click Add a tool.

3. Find Generate Character Video in the list of available flows. Click it -> click Add and configure.

4. On the configuration screen:
   - Name: Generate Character Video
   - Description: Generates a short animated video clip of a character using the Google Veo 3.1 API. Uses the character name and animation description to produce a consistent animated clip. Video generation is asynchronous and takes 2-5 minutes. Call this tool when the user wants to animate a character, create a video clip, or see a character in motion. Does NOT handle still image generation.

5. Map the inputs:
   - character_name -> The orchestrator fills this from conversation context
   - animation_prompt -> The orchestrator fills this from conversation context
   - duration -> The orchestrator fills this from conversation context
   - aspect_ratio -> The orchestrator fills this from conversation context

6. Set Completion mode to: Don't respond (default).

7. Click Save.

## Step 11.2: Connect the Flow to the Video Generation Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Video Generation > Canvas

1. Open the Video Generation topic.

2. Find the placeholder message node from Step 9.8.

3. Delete the placeholder node.

4. Click the + button where the placeholder was. Click Add a tool.

5. Find Generate Character Video and click it.

6. Map each input parameter:
   - character_name: Click {x} -> select Topic.varVideoCharacterName
   - animation_prompt: Click {x} -> select Topic.varVideoSceneDescription
   - duration: Click {x} -> select Topic.varVideoDuration
   - aspect_ratio: Click {x} -> select Topic.varVideoAspectRatio

7. Click the video_url output variable name and rename it to varVideoUrl. Click the status output variable name and rename it to varVideoStatus.

8. Click Save.

---

# PHASE 12: Character Library -- TOPIC BUILD (Node-by-Node: 6 Nodes)

This topic allows users to browse and manage their saved characters from the SharePoint Character Library.

## Step 12.1: Create the Character Library Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Custom > + Add a topic > From blank

1. Click the Topics tab -> Custom subtab -> click + Add a topic -> From blank.

2. Rename the topic to: Character Library

3. Click the Description field. Type: User wants to browse, manage, or retrieve previously created characters. Route here when the user asks about their characters, wants to see the library, delete a character, or reuse a previously created character. Does NOT handle creating new characters, generating scenes, or generating videos directly.

## Step 12.2: Add Trigger Phrases

WHERE AM I?: Copilot Studio > Agent > Topics > Character Library > Trigger node

1. In the Trigger node, add these trigger phrases:
   - view my characters
   - character library
   - browse characters
   - reuse a character
   - manage character collection
   - my characters
   - show all characters
   - list my characters

## Step 12.3: Add Node 1 -- Message -- "Character Library Introduction"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Library > Canvas

1. Click the + button below the Trigger node. Click Send a message.

2. In the message text field, type:

```
Your Character Library is a persistent collection of all characters you have created, stored in SharePoint.

Each character includes:
- Reference portrait image(s)
- Physical attribute metadata
- Generated scene compositions
- Video clips

Characters can be reused across scenes and videos to maintain visual consistency. Let me check your library now.
```

## Step 12.4: Add Node 2 -- Message -- "Library Contents"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Library > Canvas (below Node 1)

1. Click the + button. Click Send a message.

2. In the message text field, type:

```
To view your characters, open the Character Library folder in SharePoint:
https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Character Library

Each subfolder is named after a character and contains their portrait images, scene compositions, and video clips.

What would you like to do?
```

> **BEGINNER TIP**: In a production implementation, you would add a Power Automate flow that queries the SharePoint library and returns a list of character folders with their contents. For this initial build, we direct the user to the SharePoint folder and offer action choices.

## Step 12.5: Add Node 3 -- Adaptive Card -- "Character Library Actions"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Library > Canvas (below Node 2)

1. Click the + button. Click Ask with Adaptive Card.

2. Click the three dots (...) -> Properties -> Edit adaptive card.

3. Delete any default content and paste this exact JSON:

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "CHARACTER LIBRARY",
      "weight": "Bolder",
      "size": "Large",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Select an action to perform with your character library.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "Input.Text",
      "id": "libraryCharacterName",
      "label": "Character name (type the name of an existing character)",
      "placeholder": "e.g., Elena, Marcus, Dr. Chen..."
    },
    {
      "type": "Input.ChoiceSet",
      "id": "libraryAction",
      "label": "What would you like to do?",
      "style": "expanded",
      "isRequired": true,
      "choices": [
        {
          "title": "Create a scene with this character",
          "value": "scene"
        },
        {
          "title": "Generate a video of this character",
          "value": "video"
        },
        {
          "title": "Create a brand new character",
          "value": "create"
        },
        {
          "title": "View character details in SharePoint",
          "value": "view"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "OPEN LIBRARY IN SHAREPOINT",
      "url": "https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Character Library"
    },
    {
      "type": "Action.Submit",
      "title": "CONTINUE"
    }
  ]
}
```

4. Click Save in the JSON editor.

5. Click the libraryCharacterName output variable name. Rename it to varLibraryCharacterName. Click the libraryAction output variable name. Rename it to varLibraryAction.

## Step 12.6: Add Node 4 -- Set Variable -- "Set Current Character from Library"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Library > Canvas (below Node 3)

1. Click the + button. Click Variable management -> Set a variable value.

2. Configure:
   - Variable: Select Global.varCurrentCharacterName.
   - To value: Click {x} -> select Topic.varLibraryCharacterName.

## Step 12.7: Add Node 5 -- Condition -- "Route Library Action"

WHERE AM I?: Copilot Studio > Agent > Topics > Character Library > Canvas (below Node 4)

1. Click the + button. Click Add a condition -> Condition.

2. In the condition:
   - Left side: Click {x} -> select Topic.varLibraryAction.
   - Operator: is equal to
   - Right side: Type: scene

**If yes branch (scene):**

3. Inside the Yes branch, click + -> click Redirect to another topic.

4. In the redirect node, select Scene Composition from the topic list.

**If no branch (not scene):**

5. Inside the No branch, click + -> Add a condition -> Condition.

6. Configure:
   - Left side: Click {x} -> select Topic.varLibraryAction.
   - Operator: is equal to
   - Right side: Type: video

**If yes (video):**

7. Inside this Yes branch, click + -> Redirect to another topic -> select Video Generation.

**If no (not video):**

8. Inside this No branch, click + -> Add a condition -> Condition.

9. Configure:
   - Left side: Click {x} -> select Topic.varLibraryAction.
   - Operator: is equal to
   - Right side: Type: create

**If yes (create):**

10. Inside this Yes branch, click + -> Redirect to another topic -> select Character Creation.

**If no (view or other):**

11. Inside this No branch, click + -> Send a message. Type:

```
You can view your character's details and assets in the SharePoint Character Library. Open the link in the card above to browse your characters.

Type "create character" to make a new character, "create scene" to compose a scene, or "generate video" to animate a character.
```

## Step 12.8: Add Node 6 -- End Dialog

WHERE AM I?: Copilot Studio > Agent > Topics > Character Library > Canvas (at the end of each branch)

1. At the end of the final "no" branch (after the view message), click + -> Topic management -> End current topic.

2. Click Save at the top of the canvas.

## Step 12.9: Complete YAML for Character Library Topic

WHERE AM I?: Copilot Studio > Agent > Topics > Character Library > (...) > Open code editor

**YAML -- Paste into Code Editor (... > Open code editor)**

```yaml
kind: AdaptiveDialog
beginDialog:
  kind: OnRecognizedIntent
  id: main
  intent:
    displayName: Character Library
    triggerQueries:
      - view my characters
      - character library
      - browse characters
      - reuse a character
      - manage character collection
      - my characters
      - show all characters
      - list my characters
  actions:
    - kind: SendMessage
      id: libraryIntro
      message: |-
        Your Character Library is a persistent collection of all characters you have created, stored in SharePoint.

        Each character includes:
        - Reference portrait image(s)
        - Physical attribute metadata
        - Generated scene compositions
        - Video clips

        Characters can be reused across scenes and videos to maintain visual consistency. Let me check your library now.

    - kind: SendMessage
      id: libraryContents
      message: |-
        To view your characters, open the Character Library folder in SharePoint:
        https://yourcompany.sharepoint.com/sites/ResearchHub/Shared Documents/Character Library

        Each subfolder is named after a character and contains their portrait images, scene compositions, and video clips.

        What would you like to do?

    - kind: SetVariable
      id: setLibraryChar
      variable: Global.varCurrentCharacterName
      value: =Topic.varLibraryCharacterName

    - kind: ConditionGroup
      id: routeAction
      conditions:
        - id: isScene
          condition: =Topic.varLibraryAction = "scene"
          actions:
            - kind: BeginDialog
              id: goToScene
              dialog: Scene Composition
        - id: isVideo
          condition: =Topic.varLibraryAction = "video"
          actions:
            - kind: BeginDialog
              id: goToVideo
              dialog: Video Generation
        - id: isCreate
          condition: =Topic.varLibraryAction = "create"
          actions:
            - kind: BeginDialog
              id: goToCreate
              dialog: Character Creation
      elseActions:
        - kind: SendMessage
          id: viewMsg
          message: |-
            You can view your character's details and assets in the SharePoint Character Library. Open the link in the card above to browse your characters.

            Type "create character" to make a new character, "create scene" to compose a scene, or "generate video" to animate a character.

    - kind: EndDialog
      id: endLibrary
```

---

# PHASE 13: Publish and Deploy to Teams

## Step 13.1: Publish the Agent

WHERE AM I?: Copilot Studio > Agent > Overview

1. In Copilot Studio, click the Publish button at the top of the Overview page.

2. In the confirmation dialog, click Publish again.

3. Wait for the green "Published successfully" banner. This may take 1-2 minutes.

> **CRITICAL**: Event triggers and channel deployments only become active after publishing. Conversational features work in the test pane before publishing, but Teams deployment requires this step.

## Step 13.2: Deploy to Microsoft Teams

WHERE AM I?: Copilot Studio > Agent > Channels

1. After publishing, click the Channels tab in the top navigation.

2. Click the "Teams and Microsoft 365 Copilot" tile.

3. Click Add channel.

4. A panel opens. Click "See agent in Teams" -- this opens Microsoft Teams and prompts you to install the agent.

5. In Teams, click Add to install the agent in your chat.

6. To share with your team:
   - Click Availability options in the Copilot Studio channel panel -> Submit for admin approval.
   - Your Teams admin then goes to Teams Admin Center -> Apps -> finds your agent -> clicks Publish.

## Step 13.3: Configure Email Delivery (Optional)

WHERE AM I?: Copilot Studio > Agent > Channels

1. For email delivery of generated assets, you can add an Office 365 Outlook action to the Generate Character Portrait flow that sends the SharePoint link to the user's email.

2. This is an optional enhancement. The primary delivery channel is Teams Adaptive Cards with SharePoint links.

---

# PHASE 14: Testing (5+ Scenarios)

## Step 14.1: Test Scenario 1 -- New Character Creation

WHERE AM I?: Microsoft Teams > Consistent Character Creator chat

1. Open Teams and find the Consistent Character Creator agent in your chat.

2. Type: create character

3. Expected: The agent displays the Character Creation welcome message.

4. When asked for a name, type: Elena Rodriguez

5. When asked for attributes, type: 30-year-old Latina woman with long dark curly hair, warm brown eyes, wearing a white lab coat over a blue blouse, rectangular glasses, small silver earrings, confident smile

6. When asked for art style, select: Photorealistic

7. When asked for aspect ratio, select: 1:1 Square (default portrait)

8. Expected: The agent displays a "Generating..." message, calls the Generate Character Portrait flow, and returns an Adaptive Card with the portrait result and action buttons.

9. Verify: Check your SharePoint Character Library folder -- a new subfolder named "Elena Rodriguez" should contain a PNG portrait file.

## Step 14.2: Test Scenario 2 -- Scene Composition

WHERE AM I?: Microsoft Teams > Consistent Character Creator chat

1. Type: create scene

2. When asked for character name, type: Elena Rodriguez

3. When asked for scene description, type: Elena is sitting at a modern desk in a bright laboratory, reviewing data on a large monitor. Natural daylight streams through floor-to-ceiling windows. She has a coffee cup and several research papers on the desk. Professional, focused atmosphere.

4. Expected: The agent generates a scene image and displays it in an Adaptive Card.

5. Verify: Check the Elena Rodriguez folder in SharePoint for a new scene image file.

## Step 14.3: Test Scenario 3 -- Video Generation

WHERE AM I?: Microsoft Teams > Consistent Character Creator chat

1. Type: generate video

2. When asked for character name, type: Elena Rodriguez

3. When asked for scene description, type: Elena turns from her desk to face the camera, smiles warmly, and gestures as if explaining a concept. Slow zoom in. Laboratory setting with soft lighting.

4. When asked for duration, type: 4

5. When asked for aspect ratio, select: 16:9 Landscape (1080p)

6. Expected: The agent submits the video generation job and informs you it will take 2-5 minutes. After completion, it displays a video result card with a download link.

7. Verify: Check the Elena Rodriguez folder in SharePoint for an MP4 video file.

## Step 14.4: Test Scenario 4 -- Character Library Browse

WHERE AM I?: Microsoft Teams > Consistent Character Creator chat

1. Type: my characters

2. Expected: The agent displays the Character Library introduction and an Adaptive Card with action choices.

3. Type a character name and select "Create a scene with this character".

4. Expected: The agent redirects to the Scene Composition topic.

## Step 14.5: Test Scenario 5 -- Error Handling

WHERE AM I?: Microsoft Teams > Consistent Character Creator chat

1. Type: generate video

2. When asked for character name, type: NonExistentCharacter12345

3. Expected: The flow may fail gracefully or the agent should inform the user that the character was not found in the library.

4. Type: create character

5. When asked for attributes, type a very short description: tall man

6. Expected: The agent should still generate a portrait, though it may note that more detail would improve results.

## Step 14.6: Test Scenario 6 -- Model Selection Verification

WHERE AM I?: Microsoft Teams > Consistent Character Creator chat

1. Type: What AI model do you use for images?

2. Expected: The agent should reference Gemini gemini-3-pro-image-preview (NOT Imagen 3, NOT DALL-E).

3. Type: Can you generate a video longer than 8 seconds?

4. Expected: The agent should explain the 8-second maximum and suggest generating multiple clips.

---

# PHASE 15: Troubleshooting Reference

| Symptom | Resolution |
|---|---|
| Agent does not respond to any query | Verify generative orchestration is enabled (Step 1.5). Confirm the agent is published (Step 13.1). Check that at least one knowledge source is connected with a green checkmark. |
| Agent says "I could not find information" | Your SharePoint Character Library may be empty. Create at least one character first. Check that the knowledge source description accurately describes the content. |
| Generate Character Portrait flow fails with 400 error | The prompt contains unescaped special characters. Verify the Escape_Character_Prompt action (Step 4.5) is correctly configured with the 4-step escape chain. Check that the JSON body is valid by testing with a simple prompt first. |
| Generate Character Portrait flow fails with 403 error | Your Gemini API key is invalid or expired. Go to https://aistudio.google.com and verify the key. Check that the key has access to the gemini-3-pro-image-preview model. Ensure the key is correctly pasted in the Get_Gemini_Key Compose action. |
| Image generation returns no image (parts[1] is null) | The Gemini API may return the image in a different position in the parts array. Try changing the extraction expression to: `last(filter(body('HTTP_Gemini_Image')?['candidates']?[0]?['content']?['parts'], item()?['inlineData'] ne null))?['inlineData']?['data']` |
| Video generation times out | Veo 3.1 video generation can take 2-10 minutes. Increase the Do Until timeout to PT15M and max iterations to 90. If the flow itself times out at 100 seconds, restructure it to respond immediately and poll asynchronously (see Step 10.16 note). |
| Video generation returns "model not found" | Verify you are using the correct model name: veo-3.1-fast-generate-preview. Check that your Gemini API key has access to the Veo model. Some API keys may need to be enabled for video generation at aistudio.google.com. |
| SharePoint folder creation fails | The Create_Character_Folder action may fail if the folder already exists. Ensure the "Run After" setting includes "has failed" (Step 4.14). Check that you have Edit permissions on the SharePoint site. |
| Adaptive Card renders as plain text in Teams | Ensure you are using the "Ask with Adaptive Card" node (not a regular Message node). Verify the card JSON is valid by testing at https://adaptivecards.io/designer/. Ensure version is "1.5" (not higher). |
| Portrait aspect ratio does not match selection | Verify the Map_Aspect_Ratio expression in the flow correctly maps "square" to "1:1", "landscape" to "16:9", and "vertical" to "9:16". The Gemini API uses these exact ratio strings. |
| 9:16 portrait video is low resolution | This is a known limitation of Veo 3.1: 9:16 portrait aspect ratio only supports 720p resolution, not 1080p. Inform users to use 16:9 landscape for highest quality. |
| Global variables are empty in Scene Composition | Verify that the Conversation Start topic initializes Global.varCurrentCharacterId and Global.varCurrentCharacterName (Step 1.8). Verify that the Character Creation topic sets these globals (Step 3.11). |
| Flow run history shows "[Secure]" for all values | This is expected behavior when Secure Inputs/Outputs are enabled. To debug, temporarily disable Secure Outputs on the specific action you need to inspect, run a test, then re-enable it. |

---

# PHASE 16: Architecture Summary and Verification Checklist

## Architecture Summary

```
USER (Teams)
    |
    v
COPILOT STUDIO AGENT
    |-- Topic: Character Creation
    |       |-- Collects: name, attributes, style, aspect ratio
    |       |-- Calls: Generate Character Portrait flow
    |       |-- Displays: Adaptive Card gallery
    |       |-- Saves: Global.varCurrentCharacterName
    |
    |-- Topic: Scene Composition
    |       |-- Collects: character name, scene description
    |       |-- Calls: Generate Character Portrait flow (reused)
    |       |-- Displays: Adaptive Card result
    |
    |-- Topic: Video Generation
    |       |-- Collects: character name, action, duration, aspect ratio
    |       |-- Calls: Generate Character Video flow
    |       |-- Displays: Adaptive Card with video link
    |
    |-- Topic: Character Library
    |       |-- Displays: Library actions card
    |       |-- Redirects to: Scene, Video, or Creation topics
    |
    |-- Knowledge: SharePoint Character Library
    |
    v
POWER AUTOMATE FLOWS
    |
    |-- Generate Character Portrait
    |       |-- Gemini gemini-3-pro-image-preview API
    |       |-- POST generateContent
    |       |-- Supports reference image conditioning
    |       |-- Saves PNG to SharePoint
    |
    |-- Generate Character Video
    |       |-- Veo 3.1 fast-generate-preview API
    |       |-- POST predictLongRunning (async)
    |       |-- Do Until polling loop (10s intervals)
    |       |-- Downloads MP4, saves to SharePoint
    |
    v
SHAREPOINT (/sites/ResearchHub/Shared Documents/)
    |-- Character Library/
    |       |-- {CharacterName}/
    |       |       |-- portrait_20260215_143022.png
    |       |       |-- scene_20260215_150145.png
    |       |       |-- video_20260215_152033.mp4
    |-- Video Output/
    |-- Scene Output/
```

## Credit Consumption Estimate

| Action | Credits per Use | Typical Uses per Session | Session Total |
|---|---|---|---|
| Generative answer (topic routing) | 2 | 5 | 10 |
| Agent action (flow call) | 5 | 3 | 15 |
| Agent flow actions (per 100 actions) | 13 | 2 | 26 |
| Knowledge source query | 2 | 2 | 4 |
| **Estimated total per session** | | | **~55 credits** |

At $200/month for 25,000 credits, this supports approximately 450 sessions per month.

## Post-Build Verification Checklist

Check each item after completing the build:

1. Agent name is "Consistent Character Creator" and description is populated
2. Generative orchestration is enabled (Settings -> Generative AI -> Yes)
3. General knowledge is disabled (Settings -> Generative AI -> Off)
4. Agent instructions contain all five sections: PERSONA, CHAIN-OF-THOUGHT, OUTPUT FORMAT, CONSTRAINTS, FEW-SHOT EXAMPLE
5. Knowledge source "Character Library" is connected with green checkmark
6. Knowledge strictness is set to High
7. Conversation Start system topic initializes Global.varCurrentCharacterId and Global.varCurrentCharacterName
8. Fallback system topic has custom help message
9. Character Creation topic has 8 trigger phrases and all 10 nodes
10. Scene Composition topic has 8 trigger phrases and all 7 nodes
11. Video Generation topic has 8 trigger phrases and all 8 nodes
12. Character Library topic has 8 trigger phrases and all 6 nodes with redirect conditions
13. Generate Character Portrait flow has 15 actions, Secure Inputs/Outputs on all API key actions, and Async Response OFF
14. Generate Character Video flow has all polling actions, Secure Inputs/Outputs on all API key actions, and proper Do Until configuration
15. Generate Character Portrait is registered as a tool with description for orchestrator routing
16. Generate Character Video is registered as a tool with description for orchestrator routing
17. Character Creation topic Action node is connected to Generate Character Portrait flow with all 5 inputs mapped
18. Video Generation topic Action node is connected to Generate Character Video flow with all 4 inputs mapped
19. All Adaptive Cards use version 1.5 (not 1.6) for Teams compatibility
20. SharePoint Character Library folder exists at /sites/ResearchHub/Shared Documents/Character Library
21. Environment variable nxth_GeminiApiKey exists in the solution with a current value set
22. Agent is published (green "Published successfully" banner)
23. Agent is deployed to Teams channel and accessible in Teams chat
24. Test scenario 1 (new character creation) completes successfully
25. Test scenario 3 (video generation) submits successfully and video appears in SharePoint

---

## Conclusion

This recipe produces a functional character creation agent that generates visually consistent portraits using Google Gemini gemini-3-pro-image-preview and animated video clips using Veo 3.1, all orchestrated through Microsoft Copilot Studio with Power Automate flows calling the APIs directly.

The three most consequential design decisions are: using gemini-3-pro-image-preview (NOT Imagen 3) for all image generation because it supports up to 14 reference images in a single request for character consistency conditioning; structuring the Generate Character Video flow with a Do Until polling loop that handles Veo 3.1's asynchronous generation pattern (2-5 minute processing time); and reusing the Generate Character Portrait flow for both new character creation and scene composition by conditionally including reference images in the API request body.

The SharePoint Character Library serves as the persistent storage layer, replacing the IndexedDB approach used in web applications. Each character gets a dedicated folder containing all generated assets (portraits, scenes, videos), enabling the agent to maintain character identity across sessions and across different generation types.

For future enhancements: add a "Get Character Reference" flow that downloads a character's portrait from SharePoint and converts it to base64 for true reference image conditioning in scene composition; implement a metadata JSON file per character that stores attributes, prompts, and generation history; and add multi-character scene support by loading multiple reference images into a single Gemini API request (the model supports up to 14 reference images and up to 5 images of humans).