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
        
        return `
            <div class="podcast-preview">
                <div class="podcast-header">
                    <div class="podcast-icon">🎙️</div>
                    <div class="podcast-info">
                        <div class="podcast-title">LinkedIn Content Podcast</div>
                        <div class="podcast-duration">${piece.podcast_audio?.duration_estimate || 'Generating...'}</div>
                    </div>
                </div>
                ${hasAudio ? `
                    <div class="podcast-player">
                        <audio controls style="width: 100%; margin: 1rem 0;">
                            <source src="${piece.podcast_audio.preview_url}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                ` : `
                    <div class="podcast-generating">
                        <div class="thinking-animation" style="width: 40px; height: 40px; margin: 1rem auto;"></div>
                        <div style="text-align: center; color: var(--light-grey);">Generating podcast audio...</div>
                    </div>
                `}
                <div class="podcast-content-preview">
                    <strong>Script Preview:</strong><br>
                    ${this.formatContentPreview(piece.content)}
                </div>
                ${hasAudio ? `
                    <div class="podcast-actions" style="margin-top: 1rem; text-align: center;">
                        <a href="${piece.podcast_audio.download_url}" 
                           class="action-button primary" 
                           style="display: inline-block; text-decoration: none; margin: 0 0.5rem;">
                            🎵 Download Audio
                        </a>
                        <button onclick="navigator.clipboard.writeText('${piece.podcast_audio.preview_url}')" 
                                class="action-button" 
                                style="margin: 0 0.5rem;">
                            🔗 Copy Audio Link
                        </button>
                    </div>
                ` : ''}
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