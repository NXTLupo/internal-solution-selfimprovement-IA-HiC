# NXT Humans Intelligence Augmentation Suite: Training Manuals

## Table of Contents

1. [Social Data Collector](#social-data-collector)
2. [Video Transcription Service](#video-transcription-service)
3. [Social Research Analysis](#social-research-analysis)
4. [Journey Mapper Opus 4.5](#journey-mapper-opus-45)
5. [Humans in Control Research](#humans-in-control-research)
6. [Miro Board Generator](#miro-board-generator)
7. [Character Generator](#character-generator)

---

# Video Transcription Service

NXT Humans: Video Transcription Service Training Manual  
Version: 3.1  
Target Audience: UX Researchers, Content Creators, Market Analysts, and Customer Experience Teams

## 1. Introduction & Philosophy

Welcome to the NXT Humans Video Transcription Service. This powerful tool transforms video and audio content into accurate, searchable text, enabling deep analysis of spoken content across multiple formats.

The Core Philosophy:
- **Every spoken word contains valuable intelligence**
- **Video content is a rich, often untapped source of customer insights**
- **Accessible transcription unlocks the full value of audiovisual research**

### The Technology Under the Hood
Understanding our transcription engine helps you maximize results:
- **OpenAI Whisper API**: State-of-the-art speech recognition with 99+ language support
- **Intelligent Chunking**: Advanced segmentation for optimal processing of large files
- **Format Conversion**: Automatic handling of various video and audio formats
- **Parallel Processing**: Multi-threaded architecture for faster results

## 2. Getting Started

### System Requirements
- **Browser**: Chrome/Firefox (recommended for video upload capabilities)
- **API Access**: Service utilizes OpenAI Whisper API (managed through NXT Humans platform)
- **Input Types**:
  - Direct file upload: MP4, AVI, MOV, WAV, MP3, etc. (up to 500MB)
  - YouTube URLs: Direct processing from video links
  - Audio files: All standard formats supported
- **Network**: Broadband connection recommended for large file transfers

### The Dashboard
1. **Source Selection**: Choose between file upload or YouTube URL
2. **Processing Options**: Configure transcription parameters
   - Language selection (auto-detect or specify)
   - Timestamp density (standard or fine-grained)
   - Speaker identification (when possible)
   - Confidence scoring (for quality assurance)
3. **Output Format**: Select desired deliverable format
   - Plain text (clean reading version)
   - Timestamped text (for reference and navigation)
   - JSON (structured data for programmatic use)
   - SRT/VTT (for caption generation)

## 3. The Transcription Workflow

The application operates in a systematic processing pipeline:

### Phase 1: Content Preparation
**Action**: Upload video/audio or enter YouTube URL
**What happens**: The system validates and prepares content for processing

**Your Job**:
- Ensure media quality is sufficient (clear audio recommended)
- For YouTube, verify the URL is publicly accessible
- For file uploads, confirm format compatibility

### Phase 2: Processing Configuration
**What happens**: The system analyzes content length and suggests optimal settings

**Your Job**:
- Review suggested language detection or manually specify language
- Determine timestamp density based on your needs
- Enable speaker diarization for multi-speaker content when needed
- Set quality parameters (higher quality = longer processing time)

### Phase 3: Transcription Processing
**What happens**: Content is processed through the Whisper API with real-time status updates

**Your Job**:
- Monitor processing progress
- Review initial samples for quality assessment
- Prepare for post-processing needs

### Phase 4: Review and Refinement
**What happens**: Complete transcript is presented with editing capabilities

**Your Job**:
- Review for accuracy, especially technical terms or proper nouns
- Make manual corrections if needed
- Apply formatting preferences
- Add speaker labels or section headers if desired

## 4. Advanced Transcription Strategies

### Maximizing Audio Quality
- **Pre-processing Audio**: Consider noise reduction before upload for better results
- **Speaker Proximity**: Closer microphone placement yields better transcription
- **Environmental Factors**: Minimize background noise and echo in original recording
- **Audio Normalization**: Balance volume levels for consistent transcription quality

### Working with Challenging Content
- **Heavy Accents**: Specify language and dialect when known
- **Technical Terminology**: Create custom dictionaries for specialized vocabulary
- **Multiple Speakers**: Enable speaker diarization and review speaker transitions
- **Background Noise**: Use the noise-resilient processing option
- **Low-Quality Recordings**: Enable enhanced processing (slower but more accurate)

### Batch Processing Strategies
- **Similar Content Grouping**: Process similar content types together for consistency
- **Priority Queuing**: Use the priority flag for urgent transcriptions
- **Scheduled Processing**: Set up overnight batch jobs for large volumes
- **Incremental Processing**: Process high-priority segments first, then background content

## 5. Export & Integration

### Text Export Options
- **Plain Text**: Clean, readable format without timestamps or metadata
- **Formatted Text**: Includes paragraph breaks, speaker labels, and section formatting
- **Annotated Text**: Includes confidence scores and alternative interpretations

### Structured Data Export
- **JSON Format**: Complete with metadata, timestamps, and confidence metrics
- **CSV Structure**: Tabular format with configurable fields
- **XML Output**: For integration with enterprise content management systems

### Caption & Subtitle Generation
- **SRT Files**: Standard subtitle format compatible with most video players
- **VTT Format**: Web-optimized caption format
- **Timestamped Markdown**: For documentation systems

### Integration with Analysis Pipeline
- **Direct to Social Research Analysis**: Transfer for sentiment and theme extraction
- **Journey Mapper Integration**: Create customer journey maps from interview transcripts
- **Research Platform Export**: Compatible with NVivo, Atlas.ti, and other research tools

## 6. Troubleshooting & Best Practices

| Issue | Cause | Solution |
|-------|------|----------|
| "Poor Transcription Quality" | Low audio quality or heavy background noise | Use audio enhancement pre-processing or manually edit |
| "Processing Timeout" | File too large or complex | Enable chunking or split file into smaller segments |
| "YouTube URL Error" | Private or restricted video | Ensure video is publicly accessible |
| "Incomplete Timestamps" | Fast speech or unclear audio transitions | Increase timestamp density in settings |

### Quality Assurance Practices
1. **Sample Review**: Check random segments throughout for consistent quality
2. **Technical Term Verification**: Pay special attention to industry-specific terminology
3. **Speaker Consistency**: Ensure speaker labels remain consistent throughout
4. **Context Awareness**: Review for contextual accuracy, not just word-by-word precision
5. **Time Alignment**: Verify timestamp accuracy for critical segments

### Golden Rules for Video Transcription
- **Garbage In = Garbage Out**: Better source audio always yields better transcripts
- **Human Verification**: While AI transcription is powerful, critical content deserves human review
- **Context Matters**: Understanding the subject matter improves your ability to catch errors
- **Iteration Improves Accuracy**: Use the feedback mechanism to improve future transcriptions
- **Timestamps Are Invaluable**: They transform a text blob into a navigable research asset

This tool converts spoken insights into actionable data. The care you take in configuration and review directly impacts the value of the resulting transcript for research and analysis.

---

# Character Generator

NXT Humans: Character Generator Training Manual  
Version: 3.0 (Veo 3.1 Integration)  
Target Audience: Content Creators, Marketing Teams, UX/CX Professionals, and Presentation Designers

## 1. Introduction & Philosophy

Welcome to the NXT Humans Character Generator. This innovative tool creates consistent, photorealistic character portraits and scenes for your content, presentations, and videos using Google's Gemini and Veo AI technologies.

### The Core Philosophy:
- **Visual storytelling requires consistent, relatable characters**
- **Character persistence creates stronger audience connection**
- **Visual consistency maintains professional brand experience**

### The AI Engine Under the Hood
Understanding the technical capabilities helps you achieve optimal results:
- **Gemini 2.5 Flash**: Powers portrait generation with consistent identity preservation
- **Imagen 3**: Creates high-quality reference images with detailed prompt understanding
- **Veo 3.1**: Transforms static images into natural video animations
- **Audio Sync**: Experimental feature for synchronizing character animations with audio

## 2. Getting Started

### System Requirements
- **Browser**: Chrome (recommended for IndexedDB and animation support)
- **API Access**: Google Gemini API key with access to Gemini 2.5 Flash, Imagen 3, and Veo 3.1
- **Storage**: Uses browser-based IndexedDB for character, scene, and video storage
- **Network**: Broadband connection recommended for video generation

### The Dashboard
1. **Character Management**: Create and organize your character library
   - Character creation interface
   - Library view with filtering and search
   - Character editing and refinement
   - Import/export capabilities

2. **Scene Composition**: Arrange characters in environmental settings
   - Scene builder with character placement
   - Environmental settings library
   - Lighting and composition controls
   - Object library for scene enhancement

3. **Video Generation**: Create animations from characters and scenes
   - Video prompt interface
   - Format controls (aspect ratio, resolution, duration)
   - Audio synchronization options
   - Video preview and download

## 3. Character Creation Workflow

The application offers multiple paths to character creation:

### Path A: Text-to-Character

#### Phase 1: Character Definition
**Action**: Enter detailed character description
**What happens**: The system generates a professional portrait matching your description

**Your Job**:
- Provide clear, specific character descriptions
- Include demographic details, personality traits, and visual characteristics
- Specify professional context if applicable
- Review generated portrait for accuracy

#### Phase 2: Character Refinement
**What happens**: Initial portrait is presented for review and refinement

**Your Job**:
- Evaluate portrait alignment with description
- Make description adjustments if needed
- Regenerate with refined prompts if necessary
- Save character to your library when satisfied

### Path B: Image-to-Characters

#### Phase 1: Reference Image Upload
**Action**: Upload an image containing people
**What happens**: System analyzes the image and identifies individual characters

**Your Job**:
- Select clear images with visible faces
- Optionally provide a style hint for character generation
- Wait for character extraction and generation

#### Phase 2: Character Selection
**What happens**: System presents individual characters extracted from the image

**Your Job**:
- Review generated characters and their descriptions
- Select characters to save to your library
- Edit descriptions if needed
- Organize characters into collections or projects

### Path C: Object Generation

#### Phase 1: Object Definition
**Action**: Define objects for your scenes
**What happens**: System generates isolated objects on neutral backgrounds

**Your Job**:
- Provide clear object descriptions
- Specify size, color, and material details
- Review generated objects for accuracy
- Save useful objects to your library

## 4. Scene Composition

### Creating Environments

#### Phase 1: Scene Definition
**Action**: Define scene environment and select characters
**What happens**: System composes characters within the defined environment

**Your Job**:
- Describe the environmental setting clearly
- Select characters to include from your library
- Arrange character placement priorities
- Define lighting and mood elements

#### Phase 2: Scene Refinement
**What happens**: Composite scene is generated with all elements

**Your Job**:
- Review character integration in the environment
- Check lighting and composition quality
- Regenerate with adjusted parameters if needed
- Save successful scenes to your library

### Advanced Scene Techniques
- **Multi-Character Interactions**: Create scenes with natural character positioning
- **Consistent Lighting**: Maintain consistent lighting across scene elements
- **Environmental Storytelling**: Use background elements to enhance narrative
- **Aspect Ratio Selection**: Choose appropriate format for intended use
- **Object Integration**: Add objects from your library to enhance scenes

## 5. Video Animation

### Standard Video Generation

#### Phase 1: Animation Prompt
**Action**: Provide video animation instructions for a scene
**What happens**: Veo 3.1 animates your scene based on your description

**Your Job**:
- Write clear animation instructions
- Describe intended movement and camera work
- Specify mood and pace of animation
- Select appropriate video settings (resolution, aspect ratio)

#### Phase 2: Video Review
**What happens**: Animated video is generated and presented for review

**Your Job**:
- Review animation quality and character movement
- Check if animation matches your instructions
- Save successful videos to your library
- Download videos for external use

### Audio-Synchronized Animation (Experimental)

#### Phase 1: Audio Upload
**Action**: Upload audio file for synchronization
**What happens**: System analyzes audio patterns (beats, intensity, speech)

**Your Job**:
- Provide clear audio files
- Review audio analysis results
- Adjust sensitivity settings if needed

#### Phase 2: Character Selection
**What happens**: System prepares characters for audio-driven animation

**Your Job**:
- Select appropriate characters for the audio
- Match character expression to audio content
- Choose scene context if applicable

#### Phase 3: Synchronization Generation
**What happens**: System creates video with movements synchronized to audio

**Your Job**:
- Review sync accuracy between audio and movement
- Check for natural movement quality
- Adjust sync parameters for refinement
- Save successful videos to your library

## 6. Character Consistency Guidelines

### Portrait Quality Optimization
- **Descriptive Precision**: More specific details yield better results
- **Natural Posing**: Avoid descriptions requiring complex poses
- **Contextual Setting**: Provide professional context for appropriate styling
- **Expression Guidance**: Describe emotional state for natural expressions

### Maintaining Identity Across Scenes
- **Character Library**: Use saved characters for consistency
- **Style Matching**: Maintain consistent visual style across scenes
- **Description Consistency**: Keep core character attributes unchanged
- **Reference Preservation**: System uses previous generations as reference

### Video Animation Best Practices
- **Natural Movement**: Request subtle, realistic movements
- **Duration Expectations**: 8-second clips are optimal
- **Motion Complexity**: Simpler movements yield better results
- **Camera Stability**: Minimal camera movement improves quality

## 7. Export & Delivery

### Character Export
- **Image Formats**: PNG with transparency (recommended)
- **Resolution Options**: Standard (1024x1024) to High (2048x2048)
- **Collection Export**: Export multiple characters as collection
- **Metadata Inclusion**: Description and creation parameters included

### Scene Export
- **Image Formats**: PNG, JPEG, WEBP
- **Resolution Options**: From 1080p to 4K (where supported)
- **Aspect Ratios**: 16:9, 9:16, 1:1 for different platforms
- **Layered Option**: Scene components as separate elements (where possible)

### Video Export
- **Video Formats**: MP4 (H.264 encoding)
- **Resolution Options**: 720p to 1080p
- **Duration**: 8-second standard (Veo 3.1 limitation)
- **Aspect Ratios**: 16:9 (standard), 9:16 (vertical for mobile)

## 8. Troubleshooting & Best Practices

| Issue | Cause | Solution |
|-------|------|----------|
| "Poor Character Integration" | Style mismatch between elements | Use consistent descriptive style across elements |
| "Unnatural Poses" | Complex positioning requests | Simplify pose descriptions to standing/sitting natural positions |
| "Video Generation Failure" | Safety filter rejection | Revise prompts to avoid potentially problematic content |
| "Audio Sync Misalignment" | Complex audio patterns | Use clearer audio with distinct patterns |

### Safe Use Guidelines
1. **Appropriate Content**: System enforces appropriate content guidelines
2. **Professional Context**: Focus on business and professional use cases
3. **Ethical Representation**: Ensure diverse and respectful character representation
4. **Attribution**: Include AI generation disclosure in public-facing content
5. **Consent Consideration**: Don't attempt to recreate specific individuals without consent

### Performance Optimization
1. **Browser Cache**: Periodically clear cache for optimal IndexedDB performance
2. **Batch Operations**: Generate similar content in batches for consistency
3. **Video Planning**: Script and storyboard before video generation
4. **Library Organization**: Use naming conventions and collections for management
5. **GPU Acceleration**: Enable hardware acceleration in browser settings

### The Golden Rules of Character Generation
- **Specificity Drives Quality**: Detailed, clear descriptions produce better results
- **Consistency Creates Professionalism**: Reuse characters across content for stronger recognition
- **Simple Animation Works Best**: Subtle movements look more natural than complex ones
- **Context Matters**: Environmental integration should support character purpose
- **Iteration Improves Results**: Use feedback from each generation to refine the next

This tool transforms abstract character concepts into visual assets for your storytelling. Your skill in description, composition, and animation direction determines how effectively characters connect with your audience.

---

# Miro Board Generator

NXT Humans: Miro Board Generator Training Manual  
Version: 2.2  
Target Audience: Design Facilitators, UX Researchers, CX Strategists, and Workshop Leaders

## 1. Introduction & Philosophy

Welcome to the NXT Humans Miro Board Generator. This specialized tool transforms your journey maps into collaborative Miro boards, allowing teams to visualize, discuss, and iterate on customer experiences in a shared workspace environment.

### The Core Philosophy:
- **Journey insights drive action through collaborative visibility**
- **Structured visualization creates shared understanding**
- **Dynamic collaboration transforms static journey maps into evolving action plans**

### The Technology Under the Hood
Understanding the technical foundation helps maximize your results:
- **HTML Parser**: Extracts journey components from Claude journey mapper outputs
- **Miro API Client**: REST API v2 integration with proper authentication and rate limiting
- **Grid Layout Engine**: Intelligent spatial positioning of journey elements
- **Element Detection**: Automatic identification of touchpoints, pain points, emotions, quotes, and channels

## 2. Getting Started

### System Requirements
- **Miro Account**: Active Miro account with API access permissions
- **API Access**: Valid Miro access token with boards:write and boards:read permissions
- **Input Types**: HTML journey maps from Claude Journey Mapper
- **CLI or Web Interface**: Command-line or web-based access options

### Initial Setup
1. **Miro API Configuration**:
   - Generate or input your Miro access token
   - Verify API connectivity with the test command
   - Configure default settings (optional)

2. **Journey Source Preparation**:
   - Export journey map from Journey Mapper as HTML
   - Ensure journey includes all desired components
   - Validate journey map structure (optional validation step)

3. **Board Configuration**:
   - Create new board or use existing Miro board
   - Set board name and description
   - Define access permissions if using new board

## 3. The Board Generation Workflow

The application operates in a systematic transformation pipeline:

### Phase 1: Journey Validation
**Action**: Validate your journey map HTML file before processing
**What happens**: The system verifies structural integrity and component availability

**Your Job**:
- Run the validate command on your journey map file
- Review validation results for potential issues
- Ensure journey map contains expected components (phases, touchpoints, emotions, etc.)
- Fix any validation issues before proceeding

### Phase 2: Generation Configuration
**What happens**: System prepares transformation settings

**Your Job**:
- Select target Miro board (new or existing)
- Choose template style (default, minimal, or colorful)
- Configure layout density and spacing
- Set custom color schemes if desired
- Specify which journey elements to include

### Phase 3: Board Generation
**What happens**: The system transforms journey map to Miro board elements

**Your Job**:
- Monitor generation progress
- Note any warnings about complex elements
- Wait for completion confirmation
- Verify board URL for access

### Phase 4: Verification & Refinement
**What happens**: Board is ready for inspection and adjustment

**Your Job**:
- Access generated Miro board via provided link
- Verify all elements transferred correctly
- Make manual adjustments as needed
- Add collaborative elements (sticky notes, comments, voting)
- Invite team members to collaborate

## 4. Advanced Generation Features

### Template Customization
- **Available Templates**:
  - Default: Standard colors and layout
  - Minimal: Reduced visual elements
  - Colorful: Vibrant color scheme
- **Creating Custom Templates**:
  - Use the template create command
  - Edit template JSON file
  - Configure colors, fonts, and spacing
  - Save and apply to future generations

### Layout Strategies
- **Grid Density**: Control spacing between elements
- **Phase Grouping**: Organize elements by journey phase
- **Hierarchical Layout**: Arrange elements by importance
- **Swim Lanes**: Organize by channel or actor
- **Connection Lines**: Visualize relationships between elements

### Element Styling
- **Color Schemes**: Custom color mapping for emotions and elements
- **Typography**: Font selection for different element types
- **Shape Styles**: Customize shapes for different element types
- **Icon Sets**: Apply consistent visual language
- **Branding**: Incorporate organizational branding elements

### Batch Processing
- **Multiple Journeys**: Process several journey maps at once
- **Automated Generation**: Scheduled board creation
- **Versioning**: Create dated versions of the same journey
- **Comparative Layouts**: Side-by-side placement of multiple journeys

## 5. Collaborative Features

### Team Enablement
- **Permission Setting**: Configure access levels during creation
- **Presentation Mode**: Ready-to-present format with logical flow
- **Comment Areas**: Dedicated zones for team input
- **Action Item Sections**: Convert insights to assignable tasks

### Workshop Preparation
- **Timer Elements**: Add timed activities for workshops
- **Voting Mechanisms**: Enable dot-voting for prioritization
- **Breakout Areas**: Create team-specific working zones
- **Facilitation Notes**: Add hidden facilitator instructions

### Integration with Workflow
- **Templates for Different Methods**: Support various workshop methodologies
- **Action Planning Framework**: From insights to accountable actions
- **Decision Documentation**: Record decision rationale
- **Project Connection**: Link to project management tools

## 6. Troubleshooting & Best Practices

| Issue | Cause | Solution |
|-------|------|----------|
| "Authentication Failed" | Invalid or expired Miro token | Regenerate token and reconfigure |
| "Parsing Failed" | Malformed journey HTML structure | Validate HTML and fix structure issues |
| "Rate Limit Exceeded" | Too many API requests | Reduce batch size or increase timeout |
| "Element Placement Issues" | Complex journey structure | Adjust layout settings or manually position |

### HTML Structure Requirements
- **Basic Structure**: Journey maps need proper HTML with semantic structure
- **Element Classes**: Elements need appropriate class names (touchpoint, pain-point, emotion, etc.)
- **Metadata**: Use data attributes for additional context (e.g., data-severity="high")
- **Nested Structure**: Maintain proper phase/section containment

### API Best Practices
- **Token Security**: Store your Miro access token securely
- **Rate Limiting**: Respect Miro's API rate limits (max 5 concurrent requests)
- **Batch Processing**: Use batch commands for multiple creations
- **Error Handling**: Check logs for detailed error information

### Board Organization Principles
1. **Logical Flow**: Ensure left-to-right or top-to-bottom narrative progression
2. **Visual Hierarchy**: Most important elements should have visual prominence
3. **Grouping Logic**: Related elements should maintain proximity
4. **Whitespace**: Maintain adequate spacing for readability
5. **Annotation Clarity**: Ensure notes and comments have clear ownership

### The Golden Rules of Miro Journey Boards
- **Clarity Trumps Comprehensiveness**: Sometimes less is more for team understanding
- **Invite Interaction**: The value comes from team engagement, not just visualization
- **Prepare for Facilitation**: Consider how you'll guide teams through the board
- **Action Orientation**: Always include space for "Now What?" planning
- **Evolution Expected**: The generated board is a starting point, not a finished product

This tool transforms static journey maps into collaborative action spaces. Your skill in configuration, facilitation, and team engagement determines how effectively insights translate to improvements.

---

# Humans in Control Research

NXT Humans: Humans-in-Control (HiC) Training Manual  
Version: 2.0 (Human-in-the-Loop Architecture)  
Target Audience: CX Researchers, Strategists, Product Managers, and Creative Directors

## 1. Introduction & Philosophy

Welcome to the NXT Humans "Humans-in-Control" Research System. Humans-in-Control Research, or HiC for short, is designed as an Augmented Research platform that puts you in charge of the AI analysis process.

### The Core Philosophy:
- **The AI does the heavy lifting, but you own the logic chain**
- **Human intervention at critical checkpoints ensures quality and accuracy**
- **Transparent AI reasoning with visible thinking process**

### The AI Engine Under the Hood
Understanding the engine helps you drive the car:
- **Logic Engine (Gemini 2.5 Flash)**: Handles the "Reasoning Stream," analyzes text, and structures data (PRDs, JSON). It is fast and context-aware.
- **Visual Engine (Gemini 3 Pro / "Nano Banana")**: Generates high-fidelity, corporate-style illustrations based on the "Laci Jordan" flat-design aesthetic.
- **Animation Engine (Veo 3.1)**: Converts static storyboards into 2D motion video.

## 2. Getting Started

### System Requirements
- **Browser**: Chrome (Recommended for optimal Audio/Video API support)
- **API Access**: You must have a valid Google GenAI API Key with access to the Gemini 3 and Veo models
- **Input Data**: The system accepts unstructured text data:
  - PDFs: Reports, whitepapers
  - TXT/MD: Interview transcripts, notes
  - CSV/JSON: Survey data
  - Note: Binary files (Word/Docx) are currently unsupported. Please convert to PDF or TXT.

### The Dashboard
1. **Research Goal**: Enter a specific objective (e.g., "Understand barriers to EV adoption in Gen Z"). The AI uses this to filter noise.
2. **Methodology**: Define your lens (e.g., "Jobs-to-be-Done" or "Behavioral Economics").
3. **Output Selection**: Toggle the assets you need.
   - Standard: Personas, Strategy Deck
   - Product: PRD, Roadmap, Tech Architecture
   - Service Design: Journey Map

## 3. The "Human-in-Control" Workflow

The application operates in a linear pipeline. You cannot skip ahead until the foundation is secure.

### Phase 1: Data Ingestion & Context
**Action**: Drag and drop your files. Click "Begin Analysis Sequence."
**What happens**: The AI reads every line of text and summarizes the "World."

**Your Job**:
- Review the Confidence Score. If it is below 70%, your data might be too sparse or irrelevant.
- Check the Key Stakeholders. Did it miss a user group?
- Intervention: If the summary is wrong, provide feedback in the text box (e.g., "Ignore the 2020 data, focus on 2024 interviews only").

### Phase 2: Pattern Recognition (Themes)
**What happens**: The AI synthesizes cross-document themes.

**Your Job (Strategic Weighting)**:
- Priority: Mark high-value insights. The AI will prioritize these for the deck.
- Skip: Mark generic or irrelevant findings (e.g., "Users like low prices").
- Edit: You can rename themes or rewrite descriptions.
- Note: Your edits here become the "Ground Truth" for the Persona generation.

### Phase 3: Archetype Synthesis (Personas)
**What happens**: The AI creates profiles using the "5 Ws" framework (Who, What, Where, When, Why).

**Your Job**:
- Verify the "Voice": Read the bio and quotes. Do they sound authentic?
- Edit the Bio: If you change the text in the "Bio" field, the system will use your new text to regenerate the persona's portrait in the next step.
- Deep Dive: Expand the persona card to see Motivations and Pain Points.

### Phase 4: Specialized Architectures (Branching)
Depending on your initial selection, you will enter specialized checkpoints:
- **Journey Map**: Review the Service Blueprint. Check "Frontstage" vs. "Backstage" actions.
- **PRD (Product Requirements)**: Review the MoSCoW prioritization (Must/Should/Could).
- **Tech Arch**: Review the system nodes and data flows.

### Phase 5: Narrative Architecture
**What happens**: The AI proposes a "Story Arc" and a list of slides.

**Your Job**:
- Drag & Drop: Reorder the slides to fix the flow.
- Add/Delete: Remove fluff slides. Add missing context.
- Rationale: Review why the AI wants to include a slide.
- Critical: This is your last chance to change the story structure before the AI generates the actual content and images.

## 4. Visual & Content Refinement (The Results View)

Once the analysis is complete, you enter the Live Research Board.

### Working with Visuals (Gemini 3 Pro)
The system automatically generates images for every slide and persona.
- **Regenerate**: If an image is weird, click the "Regen" or "Frame" button.
- **Prompt Engineering**: You have direct access to the Visual Prompt.
  - Don't just click regen.
  - Edit the text. Change "A busy office" to "A chaotic, neon-lit office, high contrast, top-down view."
  - The system enforces a "Laci Jordan / Corporate Flat" style automatically, so focus your prompt on the subject matter.

### Working with Video (Veo 3.1)
If you selected "Video Script," you will see a storyboard.
1. **Review the Scene**: Check the narration and visual description.
2. **Animate**: Click the "Play" (Animate) button.
3. **Wait**: Video generation takes 1–2 minutes. The system polls the server in the background. Do not refresh.

### The "Rewrite" Tool
On the Strategy Deck view, you will see a Magic Rewrite tool.
- **Select a specific Theme** from the dropdown.
- **Click Rewrite**.
- The AI will rewrite the slide title, bullet points, and voiceover to pivot the content specifically toward that selected theme.

## 5. Real-Time Thinking Visualization

### The Thinking Viewer
One of HiC's most powerful features is the ability to see the AI's reasoning process in real-time:
- **Reasoning Stream**: Watch as the AI analyzes your data step by step
- **Decision Points**: See how the AI weighs evidence and reaches conclusions
- **Insight Formation**: Observe the pattern recognition process unfold

### Human Feedback Integration
- **Checkpoint Controls**: Pause, approve, or redirect the analysis at any time
- **Annotation**: Add your thoughts directly to the thinking process
- **Revision Requests**: Ask the AI to reconsider specific aspects of its analysis
- **Logic Chain Verification**: Confirm that reasoning steps align with your expertise

### Thinking Modes
- **Surface Analysis**: Initial pattern recognition and obvious insights
- **Deep Analysis**: Secondary examination for hidden connections
- **Critical Thinking**: Evaluation of alternative interpretations
- **Synthesis**: Integration of multiple data points into coherent narratives

## 6. Export & Delivery

### PDF Export
- The system uses a strict 16:9 Landscape render.
- It captures the high-resolution canvas. Ensure all images have finished loading before clicking Export.

### CSV Export
- Use this for raw data analysis. It exports structured tables of your Personas, PRD features, or Roadmap items.

### Save Project
- Projects are saved to your local browser storage.
- Warning: If you clear your browser cache, you lose the projects. Export PDFs for permanent records.

## 7. Troubleshooting & Best Practices

| Issue | Cause | Solution |
|-------|------|----------|
| "Unterminated String" / JSON Error | The AI response was too long and got cut off | The system has auto-repair logic, but if it persists, try reducing the number of input files or simplifying the Research Goal |
| Images look weird/distorted | Complex prompt | Simplify the "Visual Prompt" in the edit mode. Remove abstract concepts. Focus on literal objects (e.g., "A desk with a laptop" vs "The concept of synergy") |
| Video generation hangs | Veo API latency | The system times out after 2.5 minutes. If it hangs, refresh the page and try animating that specific scene again |
| "Context" feels generic | Weak input data | The AI can only analyze what you upload. Ensure your text files contain specific quotes, interview data, or detailed notes |
| Thinking stream stops | Processing complexity | Click "Resume" to continue the analysis or "Rollback" to return to a previous checkpoint |

### Human Intervention Best Practices
- **Intervention Timing**: Don't wait until the final output to correct course
- **Specificity Matters**: Give precise feedback at checkpoints
- **Balance Control**: Too much intervention slows the process; too little risks inaccuracy
- **Evidence Assessment**: Always verify AI-suggested evidence matches your understanding
- **Save Multiple Versions**: Create variant analyses by making different choices at key checkpoints

### The Golden Rule of NXT Humans
"Garbage In, Garbage Out" applies, but "Human In, Brilliance Out" is the goal.
- The AI provides the breadth (scanning all docs, finding all patterns)
- You provide the depth (choosing what matters, refining the voice, directing the visuals)
- Use the checkpoints. Do not auto-approve. The quality of the final output is directly correlated to the number of interventions you make during the process.

## 8. Human-in-the-Loop Architecture

### Session Management
HiC preserves analysis sessions allowing you to:
- **Pause and Resume**: Stop at any point and continue later
- **Branching Analysis**: Create alternative versions from any checkpoint
- **Comparison Views**: Compare different analysis paths side-by-side
- **Collaborative Sessions**: Share checkpoints with team members

### Interactive Controls
- **Progress Tracking**: Visual indicators of completion percentage
- **Evidence Browser**: Quickly find supporting data for any insight
- **Annotation Tools**: Add comments and notes throughout the process
- **Version History**: Review all previous versions and changes

Remember: The HiC system is designed for human-AI collaboration. You remain the expert, while the AI accelerates and augments your analytical capabilities. The interventions you make at each checkpoint are critical to producing high-quality, accurate research outputs.

---

# Journey Mapper Opus 4.5

NXT Humans: Journey Mapper Opus 4.5 Training Manual  
Version: 4.5.1  
Target Audience: CX Designers, Service Designers, Researchers, Strategists, and Product Managers

## 1. Introduction & Philosophy

Welcome to the NXT Humans Journey Mapper Opus 4.5. This sophisticated AI-powered journey mapping platform leverages Claude 4.5 Opus to transform your research data into comprehensive, evidence-based customer journey visualizations with unprecedented depth and insight.

### The Core Philosophy:
- **Customer journeys reveal the true experience beyond what customers say**
- **Evidence-based journeys ground decisions in research reality**
- **Visualization clarity determines journey map impact and adoption**

### The AI Engine Under the Hood
Understanding the analytical capabilities helps you maximize results:
- **Claude 4.5 Opus**: Advanced reasoning with 200K token analysis for comprehensive data examination
- **Extended Thinking Mode**: Multi-stage systematic investigation with deep pattern recognition
- **Investigative Approach**: Data mining with sophisticated insight extraction
- **High Token Capacity**: Support for up to 500K input tokens and comprehensive analysis

## 2. Getting Started

### System Requirements
- **Browser**: Chrome/Firefox (recommended for optimal visualization rendering)
- **API Integration**: Claude 4.5 Opus API access managed through platform
- **Input Types**:
  - Research documents (PDF, DOCX, TXT)
  - Interview transcripts (from Video Transcription Service)
  - Survey data (CSV, XLSX)
  - User testing reports and recordings
  - Social research outputs (from Social Research Analysis)
- **Storage**: Cloud-based journey storage with export capabilities

### The Dashboard
1. **Project Configuration**: Define project parameters
   - Journey title and scope
   - Persona identification (optional pre-loaded personas)
   - Timeline definition (stages or phases)
   - Complexity level (simple to comprehensive)

2. **Data Upload**: Add research data sources
   - Multiple file formats supported
   - Drag-and-drop interface
   - Source management system
   - Integration with other NXT Humans tools

3. **Analysis Configuration**:
   - Analysis depth (standard or deep analysis)
   - Visualization style (various templates)
   - Evidence intensity (how much supporting data to include)
   - Custom journey stage definitions (or auto-detection)

4. **Output Controls**:
   - Format selection (HTML, PDF, PNG, CSV)
   - Sharing and collaboration settings
   - Integration with Miro (via Miro Generator)
   - Evidence linking and tracing

## 3. The Journey Mapping Workflow

The application operates with a sophisticated dual-pass analysis technique:

### Phase 1: Data Ingestion & Context Understanding
**Action**: Upload research documents and configure analysis parameters
**What happens**: Claude 4.5 Opus processes all inputs to understand the full context

**Your Job**:
- Organize research materials logically before upload
- Ensure key research is included (prioritize quality primary data)
- Define the scope clearly (customer segment, experience timeline)
- Set analysis parameters appropriate to your needs

### Phase 2: First Analysis Pass
**What happens**: System generates initial journey framework

**Your Job**:
- Review automatically identified journey stages
- Confirm persona characteristics are captured accurately
- Examine preliminary touchpoints and channels
- Verify emotional mapping aligns with research evidence

### Phase 3: Second Analysis Pass & Refinement
**What happens**: System performs deeper analysis incorporating your feedback

**Your Job**:
- Review enhanced journey with deep insights
- Examine evidence links to verify accuracy
- Adjust visualization preferences as needed
- Add custom annotations or highlights to emphasize key findings
- Configure content selection options for final output

### Phase 4: Visualization & Export
**What happens**: Final journey map is rendered with all components

**Your Job**:
- Select appropriate visualization format
- Configure export settings (resolution, content density)
- Choose which journey elements to include or exclude
- Add optional metadata and organizational context
- Select export format (HTML, PDF, PNG, or CSV data export)

## 4. Advanced Journey Mapping Features

### Content Selection Options
- **Evidence Density**: Control the amount of supporting quotes and data
- **Detail Levels**: Toggle between overview and detailed views
- **Stakeholder Views**: Create audience-specific versions (executive, design team, developer)
- **Layer Selection**: Include/exclude emotions, thoughts, pain points, opportunities
- **Channel Emphasis**: Highlight specific channels for channel-specific analysis

### Multi-Stage Journey Analysis
- **Pre-journey**: Capture awareness and expectation setting phases
- **Core Experience**: Detailed mapping of primary interactions
- **Post-experience**: Follow-through, loyalty, and advocacy stages
- **Cross-cycle Analysis**: Identify patterns across multiple journey cycles
- **Loyalty Loop Integration**: Map retention and re-engagement patterns

### Journey Map Customization
- **Template Selection**: Choose from various visual frameworks
- **Color Schemas**: Customize emotional and categorical color coding
- **Layout Controls**: Adjust density, orientation, and information hierarchy
- **Annotation Tools**: Add team notes and action items
- **Highlighting**: Emphasize critical moments and opportunities

### AI-Enhanced Analysis
- **Pattern Recognition**: Automatic identification of recurring issues
- **Insight Generation**: AI-suggested improvement opportunities
- **Competitive Comparison**: Benchmark against industry standards
- **Longitudinal Analysis**: Compare journey changes over time
- **Priority Scoring**: Automatic scoring of pain point severity

## 5. Export & Integration

### Interactive HTML Journeys
- **Interactive Elements**: Expandable sections with evidence
- **Evidence Linking**: Direct connections to research sources
- **Filtering Controls**: Dynamic content filtering by category
- **Responsive Design**: Optimized for presentations and sharing

### Presentation-Ready Outputs
- **High-resolution Images**: Publication-quality exports
- **PowerPoint Integration**: Direct export to presentation slides
- **PDF Reports**: Complete journey documentation with appendices
- **Executive Summaries**: Condensed insights for leadership

### Data Exports
- **CSV Data Export**: Structured journey data for analysis
- **Opportunity Database**: Extracted improvement opportunities
- **Evidence Library**: Organized research evidence by journey stage
- **Metrics Export**: Quantitative journey measures and scores

### Integration with Other Tools
- **Miro Board Generator**: One-click creation of collaborative Miro boards
- **Research Repository**: Archive journeys with source materials
- **Project Management**: Export action items to project tools
- **Design System Connection**: Link journey insights to design components

## 6. Troubleshooting & Best Practices

| Issue | Cause | Solution |
|-------|------|----------|
| "Insufficient Journey Detail" | Limited source research data | Add more customer interview data or primary research |
| "Misaligned Journey Stages" | Unclear stage definitions | Manually define journey stages before analysis |
| "Evidence Misattribution" | Ambiguous research statements | Review and edit evidence connections |
| "Processing Timeout" | Very large data volumes | Split analysis into logical segments |

### Research Quality Guidelines
1. **Minimum Data Threshold**: 3+ customer interviews or substantial survey data (30+ responses)
2. **Balanced Perspective**: Include diverse customer viewpoints and experience levels
3. **Channel Coverage**: Ensure research covers all relevant interaction channels
4. **Temporal Spread**: Include data from multiple time periods if applicable
5. **Contextual Factors**: Provide business context and constraints in supplemental notes

### Journey Map Effectiveness Principles
1. **Narrative Clarity**: Ensure the journey tells a coherent story
2. **Evidence Transparency**: Make supporting data easily accessible
3. **Visual Hierarchy**: Most important insights should be visually prominent
4. **Actionable Insights**: Clearly highlight improvement opportunities
5. **Emotional Impact**: Ensure emotional mapping creates empathy

### The Golden Rules of Journey Mapping
- **Evidence Trumps Assumptions**: Always prioritize what the research actually shows
- **Empathy Drives Impact**: Emotional mapping is often the most influential component
- **Context Determines Meaning**: Customer actions make sense only within their full context
- **Journey Maps Are Living Documents**: Update as new insights emerge
- **Action Orientation**: The best journey maps drive clear organizational response

This tool transforms complex customer experiences into clear, actionable visualizations. Your skill in configuration, analysis refinement, and insight communication determines how effectively your organization can respond to customer needs.

---

# Social Research Analysis

NXT Humans: Social Research Analysis Training Manual  
Version: 3.2  
Target Audience: Market Researchers, CX Strategists, Brand Managers, and Product Teams

## 1. Introduction & Philosophy

Welcome to the NXT Humans Social Research Analysis platform. This advanced analytics tool transforms social media data into actionable business intelligence through sophisticated topic modeling, sentiment analysis, and AI-powered insight generation.

### The Core Philosophy:
- **Social conversations reveal unfiltered customer truths**
- **Pattern recognition at scale surfaces insights impossible to find manually**
- **Multi-modal analysis combines quantitative trends with qualitative understanding**

### The Analysis Engine Under the Hood
Understanding our analytical capabilities helps you interpret results:
- **Topic Modeling**: BERTopic with HDBSCAN clustering and UMAP dimensionality reduction
- **Sentiment Analysis**: VADER (Valence Aware Dictionary and sEntiment Reasoner)
- **Vector Search**: pgvector extension for semantic similarity search (1.5M+ embeddings tested)
- **RAG**: Retrieval-Augmented Generation for contextual Q&A

## 2. Getting Started

### System Requirements
- **Browser**: Chrome/Firefox (recommended for visualization capabilities)
- **Data Sources**: Compatible with Social Data Collector outputs and direct uploads
- **Input Types**:
  - Raw social media data (CSV, JSON)
  - Social Data Collector exports
  - Transcripts from Video Transcription Service
  - Custom text corpora for analysis
- **Database Connectivity**: Automatic with platform; standalone PostgreSQL for enterprise deployment

### The Dashboard
1. **Analysis Selection**: Choose between Topic Modeling or Social LLM Analyzer
2. **Data Source Configuration**: Select input data and filtering parameters
   - Source platform (Reddit, TrustPilot, Play Store, or custom)
   - Content filtering options (date range, keyword, metadata)
   - Analysis scope (post count, sampling method)
3. **Analysis Parameters**: Configure analysis depth and focus
   - Topic count range (auto-detect or specified)
   - Sentiment analysis granularity
   - Custom stopwords and focus terms
4. **Visualization Controls**: Customize output visualization
   - Interactive themes map with zoom/filter
   - Sentiment distribution charts
   - Topic correlation network
   - Evidence browser with source highlighting

## 3. The Analysis Workflow

The application offers two primary analysis paths:

### A. Topic Modeling Tool

#### Phase 1: Data Ingestion & Preprocessing
**Action**: Select data source and upload/connect data
**What happens**: The system cleans, normalizes, and prepares text data for analysis

**Your Job**:
- Select appropriate data source with sufficient volume
- Review preprocessing settings (tokenization, stopwords, etc.)
- Set language parameters if multilingual content is present

#### Phase 2: Topic Extraction
**What happens**: BERTopic creates vector embeddings and clusters similar content

**Your Job**:
- Review the optimal topic count suggestion
- Adjust clustering parameters if needed (default works well for most cases)
- Monitor topic coherence scores for quality assessment

#### Phase 3: Topic Exploration
**What happens**: System generates interactive visualization of discovered topics

**Your Job**:
- Explore the interactive topic map
- Identify major themes and unexpected clusters
- Examine topic details including key terms and representative posts
- Use the similarity slider to adjust topic granularity

#### Phase 4: Sentiment Analysis
**What happens**: VADER sentiment scoring applied to each topic cluster

**Your Job**:
- Review sentiment distribution within topics
- Identify topics with polarized sentiment
- Explore sentiment drivers through evidence examples
- Compare sentiment patterns across topics

### B. Social LLM Analyzer

#### Phase 1: Topic Definition
**Action**: Define specific topic to analyze within a data source
**What happens**: System focuses analysis on content relevant to your topic

**Your Job**:
- Clearly define the topic of interest
- Provide related terms/phrases to ensure relevant content capture
- Set analysis scope (breadth vs. depth)

#### Phase 2: Content Filtering
**What happens**: System identifies and extracts content related to your topic

**Your Job**:
- Review initial content matches for relevance
- Refine search terms if necessary
- Set minimum relevance threshold

#### Phase 3: Structured Analysis
**What happens**: AI analyzes positive and negative aspects of your topic

**Your Job**:
- Review the structured analysis of positive/negative aspects
- Examine supporting evidence for each insight
- Note unexpected findings for further exploration

#### Phase 4: Interactive Q&A
**What happens**: RAG-powered chatbot provides contextual answers based on your data

**Your Job**:
- Ask specific questions about your topic
- Request evidence for any assertions
- Use conversational exploration to deepen understanding
- Save valuable insights to the analysis report

## 4. Advanced Analysis Strategies

### Topic Modeling Optimization
- **Topic Count Balancing**: Fewer topics show broad themes; more topics reveal nuanced subcategories
- **Intertopic Distance**: Adjust for clearer separation between related topics
- **Representative Documents**: Examine multiple examples to grasp full topic context
- **Hierarchical Topics**: Use nested topic modeling for complex datasets
- **Temporal Analysis**: Compare topic evolution over time periods

### Sentiment Analysis Refinement
- **Context-Aware Sentiment**: Consider domain-specific sentiment indicators
- **Intensity Scaling**: Use sentiment intensity scores for nuanced understanding
- **Sarcasm Detection**: Be aware of potential false signals in sarcastic content
- **Compound Scores**: Focus on compound sentiment for balanced assessment
- **Evidence Validation**: Always verify algorithmic sentiment with actual content

### Visualization Techniques
- **Topic Map Exploration**: Use zooming and filtering to focus analysis
- **Sentiment Heatmaps**: Identify topic-sentiment hotspots quickly
- **Word Cloud Customization**: Adjust term weighting for clearer representation
- **Network Graph Analysis**: Study topic relationships through connection patterns
- **Temporal Trend Charts**: Track topic and sentiment evolution over time

## 5. Export & Integration

### Report Generation
- **Executive Summary**: Concise overview of key findings
- **Detailed Analysis**: Complete exploration with visualizations and evidence
- **Evidence Appendix**: Source content referenced by insight
- **Custom Templates**: Brand-aligned reporting formats

### Data Export Options
- **CSV/Excel**: Structured data for further analysis
- **JSON API**: Programmatic access to analysis results
- **Interactive HTML**: Self-contained interactive visualizations
- **PDF Reports**: Print-ready formatted reports

### Visualization Exports
- **High-Resolution Images**: Publication-ready visualizations
- **Interactive Notebooks**: Jupyter notebooks with code and commentary
- **SVG/PNG**: Vector and raster graphics for presentations
- **Dashboard Embeds**: Live embeddable components for internal dashboards

### Integration with Downstream Tools
- **Journey Mapper Integration**: Direct export to customer journey mapping
- **Presentation Generator**: Automatic slide creation from insights
- **CRM Connection**: Push insights to customer relationship systems
- **Research Repository**: Archive analyses in knowledge management systems

## 6. Troubleshooting & Best Practices

| Issue | Cause | Solution |
|-------|------|----------|
| "Low Coherence Topics" | Insufficient data or too many topics | Reduce topic count or increase data volume |
| "Sentiment Mismatch" | Context-specific language or sarcasm | Review examples and adjust sentiment dictionary |
| "Processing Timeout" | Dataset too large | Enable batch processing or reduce sample size |
| "Similar Topics" | Clustering parameters too loose | Adjust intertopic distance threshold |

### Data Volume Guidelines
- **Minimum viable corpus**: 300+ documents for meaningful topics
- **Optimal performance**: 1,000-10,000 documents
- **Enterprise scale**: Tested with 1.5M+ documents
- **Topic stability**: Usually achieved at 500+ documents per major topic

### Methodological Best Practices
1. **Garbage In, Garbage Out**: Clean, relevant data is essential for quality insights
2. **Triangulate Methods**: Compare topic model results with LLM analysis
3. **Evidence Verification**: Always examine source content behind insights
4. **Iterative Refinement**: Use initial analysis to guide parameter adjustments
5. **Qualitative Validation**: Have subject matter experts review topic interpretations

### The Golden Rules of Social Analysis
- **Context Is King**: Social media requires cultural and platform-specific interpretation
- **Relative Significance Matters**: Absolute sentiment scores mean less than comparative patterns
- **Topic Labels Are Approximate**: Always examine content examples to truly understand a topic
- **Mixed Methods Win**: Combine computational and human interpretive approaches
- **Insights ≠ Decisions**: Analysis provides input to decisions, not automatic answers

This tool transforms social noise into structured intelligence. Your skill in configuration, interpretation, and communication of results determines the ultimate business value of the analysis.

---

# Social Data Collector

NXT Humans: Social Data Collector Training Manual  
Version: 2.0  
Target Audience: CX Researchers, Strategists, Social Media Analysts, and Market Researchers

## 1. Introduction & Philosophy

Welcome to the NXT Humans Social Data Collector. This tool is designed to efficiently harvest social media content from multiple platforms for comprehensive analysis of audience sentiment, behaviors, and conversations.

### The Core Philosophy:
- **Data-driven insights begin with quality data collection**
- **Breadth and depth of social media sampling matter equally**
- **Transparent data sourcing enables traceable research conclusions**

### Data Sources Under the Hood
Understanding our collection capabilities helps you plan your research:
- **Reddit**: Comprehensive subreddit content with configurable depth and time ranges
- **TrustPilot**: Consumer review aggregation with sentiment pre-classification
- **Google Play Store**: Mobile application reviews with version history

## 2. Getting Started

### System Requirements
- **Browser**: Chrome/Firefox (recommended for optimal API access)
- **API Access**: No API keys required for basic functionality (Reddit public data)
- **Advanced Access**: TrustPilot and Play Store access requires standard keys
- **Storage**: Local storage for smaller datasets, cloud export for large collections
- **Network**: Stable internet connection (data collection is connection-dependent)

### The Dashboard
1. **Source Selection**: Choose your target platform (Reddit, TrustPilot, Play Store)
2. **Search Parameters**: Define your collection scope
   - Subreddit name, brand name, or app ID
   - Time range (day, week, month, year, all time)
   - Post count and comment depth
3. **Collection Controls**:
   - Start/Pause/Resume collection
   - Real-time progress monitoring
   - Cancel in-progress jobs
4. **Export Options**:
   - PDF formatted reports
   - Raw CSV/JSON for analysis tools
   - Direct pipeline to Social Research Analysis

## 3. The Collection Workflow

The application operates with a systematic collection pipeline:

### Phase 1: Source Configuration & Validation
**Action**: Enter source details (subreddit, brand, app name) and collection parameters.
**What happens**: The system validates the source and estimates total collection size.

**Your Job**:
- Verify source exists and parameters are appropriate
- Review the estimated collection size and adjust if necessary
- Consider adjusting time range for more targeted results

### Phase 2: Initial Collection
**What happens**: The system begins harvesting top-level content (posts, reviews)

**Your Job**:
- Monitor collection progress
- Observe the real-time content sampling
- Make note of emerging themes for later analysis

### Phase 3: Comment Thread Expansion
**What happens**: The system collects nested comment threads according to your depth settings

**Your Job**:
- Decide when enough comments have been collected
- Identify potential community experts or influential voices
- Note conversation branches that warrant deeper investigation

### Phase 4: Data Processing
**What happens**: Raw content is processed into structured formats with metadata enrichment

**Your Job**:
- Select export format based on your next analysis steps
- Choose metadata fields to include in export
- Review data consistency and completeness

## 4. Advanced Collection Strategies

### Reddit-Specific Tips
- **Subreddit Selection**: Beyond obvious topic subreddits, consider:
  - Adjacent interest communities that discuss your topic
  - Critic communities where pain points are emphasized
  - Comparison subreddits where alternatives are discussed
- **Time Range Strategy**:
  - Recent (day/week): Captures current sentiment and trending issues
  - Medium (month): Balances recency with sufficient sample size
  - Extended (year/all): Reveals recurring patterns and evergreen issues
- **Sort Methods**:
  - Hot: Currently active conversations (default)
  - Top: Historically most engaged content
  - Controversial: Reveals polarizing topics
  - New: Emerging conversations without popularity bias
- **Comment Depth vs. Breadth**:
  - Deep threads (fewer posts, more comments per post): Good for narrative understanding
  - Shallow threads (more posts, fewer comments): Better for topic diversity

### TrustPilot Collection
- **Industry Selection**: Narrow results to relevant industry categories
- **Rating Segmentation**: Balance negative and positive reviews for complete perspective
- **Verified Purchase Filter**: Enable for higher quality data
- **Competitor Comparison**: Simultaneously collect competitor reviews for benchmarking

### Play Store Reviews
- **Version Filtering**: Filter by app version to isolate update-specific feedback
- **Device Segmentation**: Separate Android/iOS for platform-specific insights
- **Rating Distribution**: Ensure a balanced sample across star ratings
- **Feature Keywords**: Add specific feature keywords to target functionality feedback

## 5. Export & Delivery

### PDF Export
- Structured for readability and sharing
- Includes visualizations of basic metrics
- Contains full text with metadata for all collected items
- Preserves threaded conversations with indentation

### Raw Data Export (CSV/JSON)
- Complete with metadata fields
- Timestamp, author, vote counts, parent relationships
- Content statistics (length, sentiment score, etc.)
- Platform-specific metrics (awards, badges, etc.)

### Direct Pipeline to Analysis Tools
- One-click transfer to Social Research Analysis
- Job ID preservation for traceability
- Collection parameters included in metadata
- Filter application before transfer

## 6. Troubleshooting & Best Practices

| Issue | Cause | Solution |
|-------|-------|----------|
| "Rate Limit Exceeded" | Too many requests to Reddit API | Reduce collection size or increase collection time window |
| "Subreddit Not Found" | Misspelled or private subreddit | Verify spelling or check if logged in required |
| "Incomplete Collection" | Network issues during collection | Use resume function from last checkpoint |
| "Export Timeout" | Dataset too large for single file | Split export or use cloud storage option |

### Best Practices for Quality Data
1. **Diversify Sources**: Collect from multiple communities for balanced perspective
2. **Time Stratification**: Include both recent and historical data
3. **Regular Cadence**: Establish consistent collection intervals for trend analysis
4. **Documentation**: Record collection parameters for research reproducibility
5. **Ethical Considerations**: Respect platform TOS and user privacy expectations

### Golden Rules for Social Data Collection
- **More Data ≠ Better Insights**: Targeted, well-scoped collection often yields better analysis
- **Context Preservation**: Maintain conversation threads for proper interpretation
- **Bias Awareness**: Platform demographics influence the perspectives represented
- **Dynamic Nature**: Social conversations evolve quickly; timestamp everything
- **Collection is the Beginning**: Plan how you'll analyze before you collect

This tool gives you the raw materials for powerful social insights. The quality of your collection parameters directly impacts the validity of subsequent analysis.

---
