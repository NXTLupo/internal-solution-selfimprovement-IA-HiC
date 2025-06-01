# Video Analyzer Frontend Design

This document outlines the responsive UI design for the NXT Humans AI Video Analyzer frontend component.

## Design Philosophy

The Video Analyzer UI follows these key principles:

1. **Consistency with NXT Humans CX Workbench** - Maintain visual and interaction consistency with other components
2. **Responsiveness** - Function well on desktop, tablet, and mobile devices
3. **Progressive Disclosure** - Present information in a logical, sequential manner
4. **Clarity** - Use clear, readable typography and intuitive layouts
5. **Visual Hierarchy** - Emphasize the most important elements

## Color Palette

Align with NXT Humans brand guidelines:

- **Primary Color**: Cyan `#01C4C8` (rgba(1,196,200,1))
- **Dark Background**: `#121B26`
- **Secondary Colors**: Light Grey `#5A6275`, Medium Grey `#4A5165`
- **Accent Colors**: 
  - Success/Positive: `#4CAF50`
  - Warning/Attention: `#FF9800`
  - Error/Negative: `#F44336`
  - Info/Neutral: `#2196F3`

## Layout

The Video Analyzer UI consists of the following main sections:

1. **Input Section** - For entering YouTube URLs or uploading video files
2. **Progress Section** - Shows transcription and analysis progress
3. **Video Preview** - Embedded YouTube video or video player
4. **Transcript Section** - Displays the transcript with timestamps
5. **Analysis Results** - Shows summary, themes, insights, and keywords

## Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1023px
- **Desktop**: ≥ 1024px

## UI Components

### 1. Input Section

![Input Section Mockup](https://placeholder.com/ui-mockup-input-section)

```html
<div class="video-analyzer-input">
  <h2>Video Analyzer</h2>
  <div class="input-tabs">
    <button class="tab-button active" data-tab="youtube">YouTube URL</button>
    <button class="tab-button" data-tab="upload">Upload Video</button>
  </div>
  
  <div class="tab-content active" id="youtube-tab">
    <div class="url-input-container">
      <input type="text" id="youtube-url" placeholder="Enter YouTube URL" />
      <button class="analyze-button">Analyze</button>
    </div>
    <p class="hint-text">Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>
  </div>
  
  <div class="tab-content" id="upload-tab">
    <div class="upload-container">
      <div class="upload-dropzone">
        <i class="upload-icon"></i>
        <p>Drag & drop video file here or</p>
        <label for="video-upload" class="upload-button">Choose File</label>
        <input type="file" id="video-upload" accept="video/*" hidden />
      </div>
      <p class="file-info">Maximum file size: 500MB. Supported formats: MP4, AVI, MOV, MKV, WebM</p>
      <button class="analyze-button" disabled>Analyze</button>
    </div>
  </div>
</div>
```

**Responsive Behavior**:
- On mobile, the input form stacks vertically
- On tablet/desktop, elements align horizontally
- Input field expands to available width

### 2. Progress Section

![Progress Section Mockup](https://placeholder.com/ui-mockup-progress-section)

```html
<div class="progress-section" id="progress-section">
  <div class="progress-indicator">
    <div class="progress-steps">
      <div class="progress-step active" data-step="1">
        <div class="step-icon"><i class="download-icon"></i></div>
        <div class="step-label">Downloading</div>
      </div>
      <div class="progress-step" data-step="2">
        <div class="step-icon"><i class="transcribe-icon"></i></div>
        <div class="step-label">Transcribing</div>
      </div>
      <div class="progress-step" data-step="3">
        <div class="step-icon"><i class="analyze-icon"></i></div>
        <div class="step-label">Analyzing</div>
      </div>
      <div class="progress-step" data-step="4">
        <div class="step-icon"><i class="complete-icon"></i></div>
        <div class="step-label">Complete</div>
      </div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: 25%"></div>
    </div>
  </div>
  <p class="progress-message">Downloading video... (25%)</p>
  <button class="cancel-button">Cancel</button>
</div>
```

**Responsive Behavior**:
- On mobile, steps stack vertically with smaller icons
- On tablet/desktop, steps display horizontally
- Progress bar spans full width

### 3. Video Preview

![Video Preview Mockup](https://placeholder.com/ui-mockup-video-preview)

```html
<div class="video-preview-section">
  <h3>Video Preview</h3>
  <div class="video-container">
    <iframe 
      id="youtube-embed"
      src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  </div>
  <div class="video-metadata">
    <h4 id="video-title">Video Title</h4>
    <p id="video-duration">Duration: 3:32</p>
  </div>
</div>
```

**Responsive Behavior**:
- Video container maintains 16:9 aspect ratio on all screen sizes
- On mobile, video displays at full width
- On tablet/desktop, video takes up to 70% of container width

### 4. Transcript Section

![Transcript Section Mockup](https://placeholder.com/ui-mockup-transcript-section)

```html
<div class="transcript-section">
  <div class="section-header">
    <h3>Transcript</h3>
    <div class="transcript-actions">
      <button class="action-button" id="download-transcript">
        <i class="download-icon"></i> Download
      </button>
      <div class="dropdown">
        <button class="action-button" id="format-selector">
          Format: TXT <i class="dropdown-icon"></i>
        </button>
        <div class="dropdown-content">
          <a href="#" data-format="txt">TXT</a>
          <a href="#" data-format="srt">SRT</a>
          <a href="#" data-format="json">JSON</a>
        </div>
      </div>
    </div>
  </div>
  
  <div class="transcript-content">
    <div class="transcript-container">
      <div class="transcript-segment">
        <span class="timestamp">0:00</span>
        <span class="segment-text">Hello and welcome to this video about artificial intelligence.</span>
      </div>
      <div class="transcript-segment">
        <span class="timestamp">0:05</span>
        <span class="segment-text">Today we'll be discussing the latest developments in natural language processing.</span>
      </div>
      <!-- Additional segments... -->
    </div>
  </div>
</div>
```

**Responsive Behavior**:
- On mobile, action buttons stack vertically
- On tablet/desktop, buttons align horizontally
- Transcript container has fixed height with scrolling
- Timestamps maintain fixed width, text wraps as needed

### 5. Analysis Results

![Analysis Results Mockup](https://placeholder.com/ui-mockup-analysis-results)

```html
<div class="analysis-results">
  <div class="tabs-container">
    <div class="tab-buttons">
      <button class="tab-button active" data-tab="summary">Summary</button>
      <button class="tab-button" data-tab="themes">Key Themes</button>
      <button class="tab-button" data-tab="insights">Insights</button>
      <button class="tab-button" data-tab="keywords">Keywords</button>
    </div>
    
    <div class="tab-content active" id="summary-tab">
      <div class="summary-container">
        <p>This video explores the latest developments in artificial intelligence, focusing on natural language processing advancements. The presenter discusses how large language models have evolved over time, highlighting key improvements in understanding context, generating human-like responses, and solving complex problems.</p>
        <p>The discussion covers technical aspects of transformer architectures, training methodologies, and practical applications in various industries. Several examples demonstrate how these technologies are being implemented in customer service, content creation, and data analysis.</p>
        <p>The video concludes with predictions about future developments and potential ethical considerations that researchers and businesses should address as AI capabilities continue to expand.</p>
      </div>
    </div>
    
    <div class="tab-content" id="themes-tab">
      <div class="themes-container">
        <div class="theme-card">
          <h4 class="theme-title">Technological Evolution</h4>
          <p class="theme-description">The progression of AI models from simple rule-based systems to sophisticated neural networks.</p>
          <div class="theme-evidence">
            <blockquote>"We've seen exponential growth in model capabilities since the introduction of transformer architectures in 2017."</blockquote>
          </div>
        </div>
        <!-- Additional theme cards... -->
      </div>
    </div>
    
    <div class="tab-content" id="insights-tab">
      <div class="insights-container">
        <div class="insight-item">
          <h4 class="insight-title">1. Contextual Understanding is Key</h4>
          <p class="insight-description">Modern AI's ability to maintain context throughout conversations represents a fundamental shift in human-computer interaction.</p>
          <p class="insight-evidence">Evidence: The presenter demonstrates how newer models can reference information mentioned earlier in the conversation without explicit prompting, something earlier models struggled with.</p>
        </div>
        <!-- Additional insight items... -->
      </div>
    </div>
    
    <div class="tab-content" id="keywords-tab">
      <div class="keywords-container">
        <div class="keyword-tags">
          <span class="keyword-tag">Natural Language Processing</span>
          <span class="keyword-tag">Transformer Architecture</span>
          <span class="keyword-tag">Large Language Models</span>
          <span class="keyword-tag">Context Window</span>
          <span class="keyword-tag">Fine-tuning</span>
          <span class="keyword-tag">Embeddings</span>
          <span class="keyword-tag">Semantic Search</span>
          <span class="keyword-tag">Token Prediction</span>
          <span class="keyword-tag">Inference Optimization</span>
          <span class="keyword-tag">AI Ethics</span>
          <span class="keyword-tag">Multimodal Models</span>
          <span class="keyword-tag">Few-shot Learning</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Responsive Behavior**:
- On mobile, tabs stack into a dropdown or scrollable row
- On tablet/desktop, tabs display horizontally
- Content areas maintain consistent padding across screen sizes
- Theme cards and insight items stack vertically on mobile, display in grid on larger screens
- Keyword tags wrap to fit available width

## CSS Styling (Simplified)

```css
:root {
  /* Brand Colors */
  --primary-color: #01C4C8;
  --dark-bg: #121B26;
  --light-grey: #5A6275;
  --medium-grey: #4A5165;
  --success-color: #4CAF50;
  --warning-color: #FF9800;
  --error-color: #F44336;
  --info-color: #2196F3;
  
  /* Typography */
  --font-family: 'Segoe UI', system-ui, sans-serif;
  --font-size-small: 0.875rem;
  --font-size-base: 1rem;
  --font-size-large: 1.25rem;
  --font-size-xlarge: 1.5rem;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Border Radius */
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 0.75rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
  --shadow-md: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
  --shadow-lg: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);
  
  /* Transition */
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
  --transition-slow: 0.5s ease;
}

/* Base Styles */
body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: white;
  background-color: var(--dark-bg);
  margin: 0;
  padding: 0;
  line-height: 1.5;
}

.video-analyzer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

h2, h3, h4 {
  margin-top: 0;
  color: white;
}

h2 {
  font-size: var(--font-size-xlarge);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
}

h3 {
  font-size: var(--font-size-large);
  font-weight: 500;
  margin-bottom: var(--spacing-sm);
}

/* Button Styles */
.button, .analyze-button, .action-button, .tab-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.button:hover, .analyze-button:hover, .action-button:hover, .tab-button:hover {
  background-color: rgba(1, 196, 200, 0.8);
}

.button:disabled, .analyze-button:disabled {
  background-color: var(--light-grey);
  cursor: not-allowed;
}

/* Input Styles */
input[type="text"] {
  width: 100%;
  padding: var(--spacing-md);
  border: 1px solid var(--light-grey);
  border-radius: var(--border-radius-md);
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
}

input[type="text"]::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

/* Tab Styles */
.tab-buttons {
  display: flex;
  overflow-x: auto;
  margin-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--light-grey);
}

.tab-button {
  background-color: transparent;
  color: var(--light-grey);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-right: var(--spacing-sm);
  border-bottom: 2px solid transparent;
  border-radius: 0;
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom: 2px solid var(--primary-color);
}

.tab-content {
  display: none;
  padding: var(--spacing-md);
}

.tab-content.active {
  display: block;
}

/* Progress Styles */
.progress-section {
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: var(--border-radius-md);
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--light-grey);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-xs);
}

.progress-step.active .step-icon {
  background-color: var(--primary-color);
}

.progress-bar {
  height: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width var(--transition-normal);
}

/* Video Container */
.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
  margin-bottom: var(--spacing-md);
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Transcript Styles */
.transcript-container {
  max-height: 300px;
  overflow-y: auto;
  padding: var(--spacing-sm);
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: var(--border-radius-md);
}

.transcript-segment {
  display: flex;
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.timestamp {
  min-width: 60px;
  color: var(--light-grey);
  font-family: monospace;
}

.segment-text {
  flex: 1;
}

/* Theme Styles */
.themes-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-md);
}

.theme-card {
  background-color: rgba(0, 0, 0, 0.2);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
}

.theme-title {
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: var(--spacing-sm);
}

.theme-evidence blockquote {
  margin: var(--spacing-sm) 0;
  padding-left: var(--spacing-md);
  border-left: 3px solid var(--primary-color);
  font-style: italic;
}

/* Insight Styles */
.insight-item {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.insight-title {
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: var(--spacing-sm);
}

/* Keyword Styles */
.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.keyword-tag {
  background-color: rgba(1, 196, 200, 0.2);
  color: var(--primary-color);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-small);
}

/* Upload Styles */
.upload-dropzone {
  border: 2px dashed var(--light-grey);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-xl);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--transition-fast);
  margin-bottom: var(--spacing-md);
}

.upload-dropzone:hover {
  border-color: var(--primary-color);
}

.upload-icon {
  font-size: 48px;
  color: var(--light-grey);
  margin-bottom: var(--spacing-md);
}

.upload-button {
  display: inline-block;
  background-color: var(--primary-color);
  color: white;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  margin-top: var(--spacing-sm);
}

/* Responsive Styles */
@media (max-width: 767px) {
  .video-analyzer-input {
    flex-direction: column;
  }
  
  .url-input-container {
    flex-direction: column;
  }
  
  .progress-steps {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .progress-step {
    flex-direction: row;
    margin-bottom: var(--spacing-sm);
  }
  
  .step-icon {
    margin-right: var(--spacing-sm);
    margin-bottom: 0;
  }
  
  .transcript-actions {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .action-button {
    margin-bottom: var(--spacing-sm);
  }
  
  .tab-buttons {
    flex-wrap: wrap;
  }
  
  .tab-button {
    flex: 1 0 auto;
    text-align: center;
  }
  
  .themes-container {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .themes-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .video-analyzer-container {
    padding: var(--spacing-lg);
  }
  
  .url-input-container {
    display: flex;
  }
  
  .url-input-container input {
    flex: 1;
    margin-right: var(--spacing-md);
  }
  
  .transcript-section {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-md);
    align-items: start;
  }
}
```

## JavaScript Interactions

Key JavaScript functionalities:

1. **Tab Switching**
   - Switch between input methods (YouTube/Upload)
   - Switch between analysis result tabs (Summary/Themes/Insights/Keywords)

2. **Form Validation**
   - Validate YouTube URL format
   - Validate video file type and size

3. **Progress Tracking**
   - Update progress bar and status messages during processing
   - Show/hide appropriate UI sections based on current state

4. **Video Playback Control**
   - Embed YouTube video using iframe API
   - Highlight transcript segments during playback

5. **Download Options**
   - Generate downloadable transcript files in different formats

## Accessibility Considerations

1. **Keyboard Navigation**
   - All interactive elements are focusable and operable with keyboard
   - Logical tab order follows visual layout

2. **Screen Readers**
   - Appropriate ARIA labels for interactive elements
   - Alternative text for icons and visual elements
   - Semantic HTML structure for screen reader navigation

3. **Color Contrast**
   - All text meets WCAG AA contrast requirements
   - Interactive elements have visible focus states

4. **Responsive Text**
   - Text scales appropriately on different screen sizes
   - No fixed font sizes that prevent user zooming

## Implementation Notes

1. **Framework Integration**
   - Use React components for consistency with existing workbench
   - Implement as a modular component that can be embedded in the launchpad

2. **State Management**
   - Track analysis job status and results with React state/context
   - Use Redux if needed for complex state or integration with other components

3. **API Integration**
   - Connect UI to Video MCP endpoints
   - Implement WebSocket connection for real-time progress updates

4. **Performance Optimization**
   - Lazy load analysis results tabs
   - Virtualize long transcript lists
   - Use skeleton loaders during analysis

## Future Enhancements

1. **Interactive Timeline**
   - Visual timeline with markers for key moments
   - Click on timeline to jump to specific points in video

2. **Theme Visualization**
   - Visual representation of themes (e.g., word cloud, bubble chart)
   - Theme distribution across video timeline

3. **Cross-Analysis**
   - Compare insights across multiple videos
   - Aggregate themes across a collection of videos

4. **Export Integration**
   - Export analysis to PDF report
   - Share analysis with other workbench components