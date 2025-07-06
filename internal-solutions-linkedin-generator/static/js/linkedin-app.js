/**
 * LinkedIn Post Generator Frontend Application
 * Handles file upload, extended thinking options, and content generation
 */

class LinkedInPostGenerator {
    constructor() {
        this.sessionId = null;
        this.processingInterval = null;
        this.results = null;
        this.isProcessingFile = false;
        this.lastFileProcessTime = 0;
        this.fileProcessDebounceMs = 1000; // 1 second debounce
        
        this.initializeEventListeners();
        this.setupDragAndDrop();
    }

    initializeEventListeners() {
        // File input change - store reference to prevent double processing
        const fileInput = document.getElementById('fileInput');
        this.fileChangeListener = (e) => this.handleFileSelect(e);
        fileInput.addEventListener('change', this.fileChangeListener);

        // Generate button click
        const generateButton = document.getElementById('generateMarketingButton');
        generateButton.addEventListener('click', () => this.startGeneration());

        // Upload section click - only allow if not currently processing
        const uploadSection = document.getElementById('uploadSection');
        uploadSection.addEventListener('click', () => {
            if (!this.isProcessingFile && !fileInput.files.length) {
                fileInput.click();
            }
        });
    }

    setupDragAndDrop() {
        const uploadSection = document.getElementById('uploadSection');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadSection.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadSection.addEventListener(eventName, () => {
                uploadSection.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadSection.addEventListener(eventName, () => {
                uploadSection.classList.remove('dragover');
            }, false);
        });

        uploadSection.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file && !this.isProcessingFile) {
            this.processSelectedFile(file);
        }
    }

    handleDrop(event) {
        const files = event.dataTransfer.files;
        if (files.length > 0 && !this.isProcessingFile) {
            const file = files[0];
            
            // Clear the file input first to avoid conflicts
            const fileInput = document.getElementById('fileInput');
            fileInput.value = '';
            
            // Process the dropped file directly without setting the input
            this.processSelectedFile(file);
        }
    }

    processSelectedFile(file) {
        // Prevent double processing with debounce
        const currentTime = Date.now();
        if (this.isProcessingFile || (currentTime - this.lastFileProcessTime) < this.fileProcessDebounceMs) {
            console.log('File processing already in progress or too recent, skipping...');
            return;
        }
        
        console.log('Starting file processing for:', file.name);
        this.isProcessingFile = true;
        this.lastFileProcessTime = currentTime;
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) {
            this.showError('Please select an HTML file (.html or .htm)');
            this.resetProcessingState();
            return;
        }

        // Display file name
        const fileName = document.getElementById('fileName');
        fileName.textContent = `Selected: ${file.name}`;

        // Show marketing options
        const marketingOptions = document.getElementById('marketingOptions');
        marketingOptions.style.display = 'block';
        marketingOptions.scrollIntoView({ behavior: 'smooth' });

        // Upload file
        this.uploadFile(file);
    }
    
    resetProcessingState() {
        this.isProcessingFile = false;
        console.log('File processing state reset');
    }

    async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/upload-journey-map', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            this.sessionId = result.session_id;
            
            console.log('File uploaded successfully:', result);
            this.resetProcessingState(); // Reset flag on success
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`Upload failed: ${error.message}`);
            this.resetProcessingState(); // Reset flag on error
        }
    }

    async startGeneration() {
        if (!this.sessionId) {
            this.showError('Please upload a file first');
            return;
        }

        // Get configuration options
        const config = this.getGenerationConfig();
        
        // Show processing section
        this.showProcessingSection();

        try {
            // Start content generation
            const formData = new FormData();
            formData.append('session_id', this.sessionId);
            formData.append('marketing_objective', config.marketingObjective);
            formData.append('target_audience', config.targetAudience);
            formData.append('content_tone', config.contentTone);
            formData.append('industry_focus', config.industryFocus);
            formData.append('competitive_angle', config.competitiveAngle);
            formData.append('include_data_points', config.includeDataPoints);
            
            // Explicitly request podcast content along with other LinkedIn content types
            formData.append('content_types', 'short_form,carousel,long_form,engagement_tactics,podcast');
            formData.append('depth_level', 'comprehensive');
            formData.append('sophistication', 'expert');
            formData.append('optimization_focus', 'thought_leadership');

            const response = await fetch('/generate-extended', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Generation failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Generation started:', result);

            // Start polling for progress
            this.startProgressPolling();

        } catch (error) {
            console.error('Generation error:', error);
            this.showError(`Generation failed: ${error.message}`);
            this.hideProcessingSection();
        }
    }

    getGenerationConfig() {
        const marketingObjective = document.getElementById('marketingObjective').value;
        const targetAudience = document.getElementById('targetAudience').value;
        const contentTone = document.getElementById('contentTone').value;
        const industryFocus = document.getElementById('industryFocus').value;

        // Get checkbox settings
        const competitiveAngle = document.getElementById('competitiveAngle').checked;
        const includeDataPoints = document.getElementById('includeDataPoints').checked;

        return {
            marketingObjective,
            targetAudience,
            contentTone,
            industryFocus,
            competitiveAngle,
            includeDataPoints
        };
    }

    showProcessingSection() {
        const processingSection = document.getElementById('processingSection');
        processingSection.classList.add('active');
        processingSection.scrollIntoView({ behavior: 'smooth' });

        // Hide marketing options
        const marketingOptions = document.getElementById('marketingOptions');
        marketingOptions.style.display = 'none';

        // Initialize thinking stages
        this.initializeThinkingStages();
    }

    hideProcessingSection() {
        const processingSection = document.getElementById('processingSection');
        processingSection.classList.remove('active');
    }

    initializeThinkingStages() {
        const stages = [
            { id: 'parsing', name: 'Parsing Journey Map', icon: '📄' },
            { id: 'thinking', name: 'Extended Thinking', icon: '🧠' },
            { id: 'generating', name: 'Content Generation', icon: '✍️' },
            { id: 'optimizing', name: 'LinkedIn Optimization', icon: '🚀' }
        ];

        // Create thinking stages visualization if it doesn't exist
        let stagesContainer = document.querySelector('.thinking-stages');
        if (!stagesContainer) {
            stagesContainer = document.createElement('div');
            stagesContainer.className = 'thinking-stages';
            
            stages.forEach(stage => {
                const stageElement = document.createElement('div');
                stageElement.className = 'thinking-stage';
                stageElement.id = `stage-${stage.id}`;
                
                stageElement.innerHTML = `
                    <div class="thinking-stage-icon">${stage.icon}</div>
                    <div class="thinking-stage-label">${stage.name}</div>
                `;
                
                stagesContainer.appendChild(stageElement);
            });

            const processingSection = document.getElementById('processingSection');
            processingSection.appendChild(stagesContainer);
        }
    }

    updateThinkingStage(currentStage) {
        const stageMapping = {
            'parsing_journey_map': 'parsing',
            'extended_thinking': 'thinking',
            'content_generation': 'generating',
            'finalizing': 'optimizing'
        };

        const mappedStage = stageMapping[currentStage] || currentStage;
        
        // Reset all stages
        document.querySelectorAll('.thinking-stage').forEach(stage => {
            stage.classList.remove('active', 'completed');
        });

        // Mark completed and active stages
        const stages = ['parsing', 'thinking', 'generating', 'optimizing'];
        const currentIndex = stages.indexOf(mappedStage);
        
        stages.forEach((stage, index) => {
            const stageElement = document.getElementById(`stage-${stage}`);
            if (stageElement) {
                if (index < currentIndex) {
                    stageElement.classList.add('completed');
                } else if (index === currentIndex) {
                    stageElement.classList.add('active');
                }
            }
        });
    }

    startProgressPolling() {
        this.processingInterval = setInterval(async () => {
            try {
                const response = await fetch(`/generation-progress/${this.sessionId}`);
                
                if (!response.ok) {
                    throw new Error(`Progress check failed: ${response.statusText}`);
                }

                const progress = await response.json();
                this.updateProgress(progress);

                // Check if generation is complete
                if (progress.progress >= 100) {
                    clearInterval(this.processingInterval);
                    this.processingInterval = null;
                    
                    // Wait a moment then fetch results
                    setTimeout(() => this.fetchResults(), 1000);
                }

            } catch (error) {
                console.error('Progress polling error:', error);
                clearInterval(this.processingInterval);
                this.processingInterval = null;
                this.showError(`Progress check failed: ${error.message}`);
            }
        }, 2000); // Poll every 2 seconds
    }

    updateProgress(progress) {
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = `${progress.progress}%`;

        // Update stage description
        const processingStage = document.getElementById('processingStage');
        processingStage.textContent = progress.description;

        // Update estimated time
        const estimatedTime = document.getElementById('estimatedTime');
        estimatedTime.textContent = `Estimated time remaining: ${progress.estimated_time} seconds`;

        // Update thinking stages
        this.updateThinkingStage(progress.stage);
    }

    async fetchResults() {
        try {
            const response = await fetch(`/generation-results/${this.sessionId}`);
            
            if (!response.ok) {
                throw new Error(`Results fetch failed: ${response.statusText}`);
            }

            const results = await response.json();
            
            if (results.status === 'processing') {
                // Still processing, continue polling
                this.startProgressPolling();
                return;
            }

            if (results.status === 'error') {
                throw new Error(results.message);
            }

            this.results = results;
            this.displayResults(results);

        } catch (error) {
            console.error('Results fetch error:', error);
            this.showError(`Failed to fetch results: ${error.message}`);
        }
    }

    displayResults(results) {
        // Hide processing section
        this.hideProcessingSection();

        // Show results section
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.classList.add('active');
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        // Display analytics
        this.displayAnalytics(results.quality_metrics, results.extended_thinking_insights);

        // Display content pieces
        this.displayContentPieces(results.content_pieces);

        // Load ElevenLabs voices for enhanced podcast generation if podcast content exists
        const hasPodcastContent = results.content_pieces && 
                                 results.content_pieces.some(piece => piece.content_type === 'podcast');
        if (hasPodcastContent) {
            // Load voices after a short delay to ensure DOM is ready
            setTimeout(() => this.loadElevenLabsVoices(), 500);
        }

        // Show success message
        this.showSuccess('Content generation completed successfully! 🎉');
    }

    displayAnalytics(metrics, insights) {
        const analyticsGrid = document.getElementById('analyticsGrid');
        
        // Create analytics cards
        const analyticsData = [
            { label: 'Overall Quality', value: `${metrics.overall_quality.toFixed(1)}/10`, icon: '⭐' },
            { label: 'Thought Leadership', value: this.formatScoreLabel(metrics.overall_quality), icon: '🎯' },
            { label: 'Brand Consistency', value: `${metrics.brand_consistency.toFixed(1)}/10`, icon: '🏢' },
            { label: 'Engagement Prediction', value: metrics.engagement_prediction.split(' ')[0], icon: '📈' }
        ];

        analyticsGrid.innerHTML = analyticsData.map(item => `
            <div class="analytics-card">
                <div class="analytics-value">${item.icon} ${item.value}</div>
                <div class="analytics-label">${item.label}</div>
            </div>
        `).join('');

        // Display thinking insights
        const thinkingInsights = document.getElementById('thinkingInsights');
        thinkingInsights.innerHTML = `
            <h4 style="color: var(--primary-purple); margin-bottom: 0.5rem;">🧠 Extended Thinking Analysis</h4>
            <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; color: #ffffff;">${insights}</pre>
        `;
    }

    displayContentPieces(contentPieces) {
        const contentGrid = document.getElementById('contentGrid');
        
        contentGrid.innerHTML = contentPieces.map(piece => {
            const typeConfig = this.getContentTypeConfig(piece.content_type);
            
            return `
                <div class="content-card" data-type="${piece.content_type}">
                    <div class="content-header">
                        <div class="content-type">
                            <div class="content-type-icon ${piece.content_type}">${typeConfig.icon}</div>
                            ${typeConfig.name}
                        </div>
                        <div class="quality-score">${this.formatQualityScore(piece.thought_leadership_score)}</div>
                    </div>
                    
                    <div class="content-preview">
                        ${piece.content_type === 'podcast' ? this.renderPodcastPreview(piece) : this.renderPostPreview(piece)}
                    </div>
                    
                    <div class="content-metrics">
                        <div class="metric">
                            <span class="metric-label">Authority Score</span>
                            <span class="metric-value">${piece.professional_authority_score.toFixed(1)}/10</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Authenticity</span>
                            <span class="metric-value">${piece.human_authenticity_score.toFixed(1)}/10</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Target Audience</span>
                            <span class="metric-value">${piece.target_audience}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Estimated Reach</span>
                            <span class="metric-value">${piece.estimated_reach}</span>
                        </div>
                    </div>
                    
                    <div class="content-actions">
                        <button class="action-button primary" onclick="linkedInGenerator.copyContent('${piece.content_type}')">
                            📋 Copy
                        </button>
                        <button class="action-button" onclick="linkedInGenerator.downloadContent('${piece.content_type}')">
                            💾 Download
                        </button>
                        <button class="action-button" onclick="linkedInGenerator.viewFullContent('${piece.content_type}')">
                            👁️ View Full
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getContentTypeConfig(type) {
        const configs = {
            'short_form': { icon: '📝', name: 'Short-Form Post' },
            'carousel': { icon: '🎠', name: 'Carousel Content' },
            'long_form': { icon: '📄', name: 'Long-Form Article' },
            'engagement_tactics': { icon: '🎯', name: 'Engagement Tactics' },
            'podcast': { icon: '🎙️', name: 'Podcast Episode' }
        };
        return configs[type] || { icon: '📄', name: 'Content' };
    }

    formatQualityScore(score) {
        if (score >= 8.5) return `⭐ ${score.toFixed(1)}`;
        if (score >= 7.0) return `🟢 ${score.toFixed(1)}`;
        if (score >= 5.5) return `🟡 ${score.toFixed(1)}`;
        return `🔴 ${score.toFixed(1)}`;
    }

    formatScoreLabel(score) {
        if (score >= 8.5) return 'Industry Visionary';
        if (score >= 7.0) return 'Strategic Authority';
        if (score >= 5.5) return 'Professional Contributor';
        return 'Emerging Voice';
    }

    formatContentPreview(content) {
        // Remove markdown and limit length for preview
        const plainText = content.replace(/[#*_]/g, '').replace(/\n{2,}/g, '\n\n');
        if (plainText.length > 300) {
            return plainText.substring(0, 300) + '...';
        }
        return plainText;
    }

    renderPostPreview(piece) {
        return `
            <div class="linkedin-post">
                <div class="post-header">
                    <div class="author-avatar">YN</div>
                    <div class="author-info">
                        <div class="author-name">Your Name</div>
                        <div class="author-title">Your Professional Title</div>
                    </div>
                </div>
                <div class="post-content">${this.formatContentPreview(piece.content)}</div>
            </div>
        `;
    }

    renderPodcastPreview(piece) {
        const hasAudio = piece.podcast_audio && piece.podcast_audio.preview_url;
        const hasEnhancedAudio = piece.enhanced_podcast && piece.enhanced_podcast.file_name;
        
        return `
            <div class="podcast-preview">
                <div class="podcast-header">
                    <div class="podcast-icon">🎙️</div>
                    <div class="podcast-info">
                        <div class="podcast-title">LinkedIn Content Podcast</div>
                        <div class="podcast-duration">${piece.podcast_audio?.duration_estimate || 'Ready for generation'}</div>
                    </div>
                </div>
                
                <!-- Enhanced Podcast Generation Controls -->
                <div class="enhanced-podcast-controls" style="background: rgba(0,0,0,0.1); border-radius: 8px; padding: 1rem; margin: 1rem 0; border: 2px solid var(--primary-purple);">
                    <h4 style="margin: 0 0 1rem 0; color: var(--primary-purple); display: flex; align-items: center; gap: 0.5rem;">
                        <span>🎤</span> Enhanced Voice Generation
                    </h4>
                    
                    <div class="voice-controls-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group">
                            <label style="color: white; font-weight: 500;">Voice Selection:</label>
                            <select id="voice-select-${this.sessionId}" class="select-input" style="width: 100%;">
                                <option value="">Loading voices...</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label style="color: white; font-weight: 500;">Audio Quality:</label>
                            <select id="quality-select-${this.sessionId}" class="select-input" style="width: 100%;">
                                <option value="mp3_22050_32" selected>Standard (32kbps)</option>
                                <option value="mp3_44100_32">Enhanced (32kbps, 44kHz)</option>
                                <option value="pcm_16000">Raw PCM (16kHz)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label style="color: white; font-weight: 500;">Voice Speed:</label>
                            <select id="speed-select-${this.sessionId}" class="select-input" style="width: 100%;">
                                <option value="0.8">0.8 - Slower</option>
                                <option value="0.9">0.9 - Slightly Slow</option>
                                <option value="1.0" selected>1.0 - Normal</option>
                                <option value="1.1">1.1 - Slightly Fast</option>
                                <option value="1.2">1.2 - Fast</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label style="color: white; font-weight: 500;">Voice Stability:</label>
                            <select id="stability-select-${this.sessionId}" class="select-input" style="width: 100%;">
                                <option value="0.3">0.3 - Very Expressive</option>
                                <option value="0.4">0.4 - Expressive</option>
                                <option value="0.5" selected>0.5 - Balanced</option>
                                <option value="0.6">0.6 - Stable</option>
                                <option value="0.7">0.7 - Very Stable</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <button onclick="linkedInGenerator.generateEnhancedPodcast()" 
                                id="generate-enhanced-btn-${this.sessionId}"
                                class="action-button primary" 
                                style="background: linear-gradient(135deg, var(--primary-purple), var(--secondary-purple)); padding: 0.75rem 2rem; font-weight: 600;">
                            🎤 Generate Enhanced Podcast
                        </button>
                    </div>
                </div>

                <!-- Traditional Audio Player (if available) -->
                ${hasAudio ? `
                    <div class="podcast-player">
                        <h5 style="color: var(--light-grey); margin: 0.5rem 0;">Traditional Podcast:</h5>
                        <audio controls style="width: 100%; margin: 0.5rem 0;">
                            <source src="${piece.podcast_audio.preview_url}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                ` : ''}

                <!-- Enhanced Audio Player (if available) -->
                ${hasEnhancedAudio ? `
                    <div class="enhanced-podcast-player" style="background: rgba(139, 69, 19, 0.2); border-radius: 8px; padding: 1rem; margin: 1rem 0;">
                        <h5 style="color: var(--primary-purple); margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🎤</span> Enhanced ElevenLabs Podcast:
                        </h5>
                        <audio controls style="width: 100%; margin: 0.5rem 0;">
                            <source src="${piece.enhanced_podcast.download_url}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                        <div style="font-size: 0.9rem; color: var(--light-grey); margin-top: 0.5rem;">
                            Voice: ${piece.enhanced_podcast.voice_id} | Quality: ${piece.enhanced_podcast.output_quality} | 
                            Size: ${(piece.enhanced_podcast.file_size / 1024 / 1024).toFixed(2)} MB
                        </div>
                    </div>
                ` : ''}
                
                <div class="podcast-content-preview">
                    <strong>Script Preview:</strong><br>
                    ${this.formatContentPreview(piece.content)}
                </div>
                
                <!-- Action Buttons -->
                <div class="podcast-actions" style="margin-top: 1rem; text-align: center; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem;">
                    ${hasAudio ? `
                        <a href="${piece.podcast_audio.download_url}" 
                           class="action-button" 
                           style="display: inline-block; text-decoration: none;">
                            🎵 Download Basic Audio
                        </a>
                    ` : ''}
                    ${hasEnhancedAudio ? `
                        <a href="${piece.enhanced_podcast.download_url}" 
                           class="action-button primary" 
                           style="display: inline-block; text-decoration: none;">
                            🎤 Download Enhanced Audio
                        </a>
                    ` : ''}
                    <button onclick="linkedInGenerator.copyContent('podcast')" 
                            class="action-button">
                        📋 Copy Script
                    </button>
                </div>
            </div>
        `;
    }

    // Action Methods

    async copyContent(contentType) {
        if (!this.results || !this.results.content_pieces) {
            this.showError('No content available to copy');
            return;
        }

        const piece = this.results.content_pieces.find(p => p.content_type === contentType);
        if (!piece) {
            this.showError('Content piece not found');
            return;
        }

        try {
            await navigator.clipboard.writeText(piece.content);
            this.showSuccess('Content copied to clipboard! 📋');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showError('Failed to copy content to clipboard');
        }
    }

    async downloadContent(contentType) {
        try {
            const response = await fetch(`/download/${this.sessionId}/${contentType}`);
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `linkedin_${contentType}_${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showSuccess('Content downloaded successfully! 💾');

        } catch (error) {
            console.error('Download error:', error);
            this.showError(`Download failed: ${error.message}`);
        }
    }

    viewFullContent(contentType) {
        if (!this.results || !this.results.content_pieces) {
            this.showError('No content available');
            return;
        }

        const piece = this.results.content_pieces.find(p => p.content_type === contentType);
        if (!piece) {
            this.showError('Content piece not found');
            return;
        }

        // Create modal to show full content
        this.showContentModal(piece);
    }

    showContentModal(piece) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        const typeConfig = this.getContentTypeConfig(piece.content_type);

        modal.innerHTML = `
            <div style="
                background: var(--dark-bg);
                border: 1px solid var(--primary-purple);
                border-radius: 12px;
                padding: 2rem;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
                width: 100%;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 style="color: var(--primary-purple); margin: 0;">${typeConfig.icon} ${typeConfig.name}</h2>
                    <button onclick="this.closest('div').parentElement.remove()" style="
                        background: transparent;
                        border: none;
                        color: var(--light-grey);
                        font-size: 1.5rem;
                        cursor: pointer;
                    ">✕</button>
                </div>
                <div style="
                    background: rgba(0, 0, 0, 0.3);
                    padding: 1.5rem;
                    border-radius: 8px;
                    white-space: pre-wrap;
                    line-height: 1.6;
                    font-family: 'Segoe UI', sans-serif;
                    color: #ffffff;
                ">${piece.content}</div>
                <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                    <button onclick="linkedInGenerator.copyContent('${piece.content_type}')" class="action-button primary">
                        📋 Copy to Clipboard
                    </button>
                    <button onclick="linkedInGenerator.downloadContent('${piece.content_type}')" class="action-button">
                        💾 Download
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Enhanced Podcast Generation Methods

    async loadElevenLabsVoices() {
        try {
            const response = await fetch('/enhanced-podcast/voices');
            if (!response.ok) {
                console.warn('ElevenLabs voices not available:', await response.text());
                return;
            }
            
            const data = await response.json();
            if (data.success && data.voices) {
                const voiceSelect = document.getElementById(`voice-select-${this.sessionId}`);
                if (voiceSelect) {
                    voiceSelect.innerHTML = '<option value="">Choose a voice...</option>';
                    
                    data.voices.forEach(voice => {
                        const option = document.createElement('option');
                        option.value = voice.voice_id;
                        option.textContent = `${voice.name} (${voice.gender}, ${voice.accent})`;
                        option.title = voice.description;
                        voiceSelect.appendChild(option);
                    });
                    
                    // Pre-select a good default voice
                    const defaultVoice = data.voices.find(v => v.name.includes('Rachel')) || 
                                       data.voices.find(v => v.gender === 'Female') || 
                                       data.voices[0];
                    if (defaultVoice) {
                        voiceSelect.value = defaultVoice.voice_id;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load ElevenLabs voices:', error);
        }
    }

    async generateEnhancedPodcast() {
        if (!this.sessionId) {
            this.showError('No session available. Please upload content first.');
            return;
        }

        const voiceSelect = document.getElementById(`voice-select-${this.sessionId}`);
        const qualitySelect = document.getElementById(`quality-select-${this.sessionId}`);
        const speedSelect = document.getElementById(`speed-select-${this.sessionId}`);
        const stabilitySelect = document.getElementById(`stability-select-${this.sessionId}`);
        const generateBtn = document.getElementById(`generate-enhanced-btn-${this.sessionId}`);

        if (!voiceSelect.value) {
            this.showError('Please select a voice for podcast generation.');
            return;
        }

        // Store original button state outside try block
        const originalText = generateBtn.innerHTML;

        try {
            // Update button state
            generateBtn.innerHTML = '🎤 Generating Enhanced Podcast...';
            generateBtn.disabled = true;

            // Prepare form data
            const formData = new FormData();
            formData.append('voice_id', voiceSelect.value);
            formData.append('voice_speed', speedSelect.value);
            formData.append('voice_stability', stabilitySelect.value);
            formData.append('output_quality', qualitySelect.value);

            // Generate enhanced podcast
            const response = await fetch(`/enhanced-podcast/generate/${this.sessionId}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Enhanced podcast generation failed');
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(`🎤 Enhanced podcast generated successfully! File: ${result.file_name}`);
                
                // Refresh the results by fetching them again
                await this.fetchResults();
            } else {
                throw new Error('Enhanced podcast generation was not successful');
            }

        } catch (error) {
            console.error('Enhanced podcast generation error:', error);
            this.showError(`Enhanced podcast generation failed: ${error.message}`);
        } finally {
            // Restore button state
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    }

    // Utility Methods

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.success-message, .error-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        
        const icon = type === 'success' ? '✅' : '❌';
        messageDiv.innerHTML = `
            <span class="${type}-icon">${icon}</span>
            ${message}
        `;

        // Insert at top of main content
        const mainContent = document.querySelector('.main-content .container');
        mainContent.insertBefore(messageDiv, mainContent.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);

        // Scroll to message
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Initialize the application when DOM is loaded
let linkedInGenerator;

document.addEventListener('DOMContentLoaded', () => {
    linkedInGenerator = new LinkedInPostGenerator();
    console.log('LinkedIn Post Generator initialized');
});

// Make functions available globally for onclick handlers
window.linkedInGenerator = linkedInGenerator;