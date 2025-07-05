// AI Soundtrack Generator - Frontend JavaScript
// NXT Humans Intelligence Augmentation Suite

class SoundtrackGenerator {
    constructor() {
        this.currentJobId = null;
        this.processingInterval = null;
        this.availableVoices = [];
        
        this.initializeEventListeners();
        this.loadAvailableVoices();
        this.initializeFaders();
    }

    initializeEventListeners() {
        // Form submissions
        document.getElementById('text-soundtrack-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTextSoundtrackGeneration();
        });

        // Action buttons
        document.getElementById('download-btn').addEventListener('click', this.downloadSoundtrack.bind(this));
        document.getElementById('new-generation-btn').addEventListener('click', this.resetInterface.bind(this));
        document.getElementById('retry-btn').addEventListener('click', this.retryGeneration.bind(this));
        
        // Fader controls
        document.querySelectorAll('.fader-slider').forEach(slider => {
            slider.addEventListener('input', this.handleFaderChange.bind(this));
        });
        
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', this.handlePresetClick.bind(this));
        });
    }

    async loadAvailableVoices() {
        try {
            const response = await fetch('/api/voices');
            const data = await response.json();
            
            this.availableVoices = data.voices || [];
            this.populateVoiceSelect();
        } catch (error) {
            console.error('Error loading voices:', error);
            this.availableVoices = [{ voice_id: 'default', name: 'Default Voice' }];
            this.populateVoiceSelect();
        }
    }

    populateVoiceSelect() {
        const voiceSelect = document.getElementById('voice-select');
        voiceSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a voice...';
        voiceSelect.appendChild(defaultOption);
        
        this.availableVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voice_id;
            option.textContent = voice.name;
            
            // Store voice data for description display
            option.dataset.description = voice.description || '';
            option.dataset.category = voice.category || 'custom';
            
            voiceSelect.appendChild(option);
        });
        
        // Set default selection and update display
        if (this.availableVoices.length > 0) {
            voiceSelect.value = this.availableVoices[0].voice_id;
            this.updateVoiceDescription(this.availableVoices[0]);
        } else {
            this.updateVoiceDescription(null);
        }
        
        // Add event listener for voice selection changes
        voiceSelect.addEventListener('change', (event) => {
            const selectedOption = event.target.selectedOptions[0];
            if (selectedOption && selectedOption.value) {
                const voiceData = this.availableVoices.find(v => v.voice_id === selectedOption.value);
                this.updateVoiceDescription(voiceData);
            } else {
                this.updateVoiceDescription(null);
            }
        });
    }
    
    updateVoiceDescription(voiceData) {
        const descriptionElement = document.getElementById('voice-description');
        const characteristicsElement = document.getElementById('voice-characteristics');
        const voiceInfo = document.getElementById('voice-info');
        
        // Add updating animation
        voiceInfo.classList.add('updating');
        
        setTimeout(() => {
            if (!voiceData) {
                descriptionElement.textContent = 'Select a voice to see details';
                characteristicsElement.innerHTML = `
                    <span class="voice-tag">Category</span>
                    <span class="voice-tag">Gender</span>
                    <span class="voice-tag">Accent</span>
                `;
                voiceInfo.classList.remove('updating');
                return;
            }
            
            // Extract characteristics from description
            const description = voiceData.description || '';
            const characteristicsMatch = description.match(/\((.*?)\)/);
            let cleanDescription = description;
            let characteristics = [];
            
            if (characteristicsMatch) {
                characteristics = characteristicsMatch[1].split(',').map(c => c.trim());
                cleanDescription = description.replace(characteristicsMatch[0], '').trim();
            }
            
            // Update description
            descriptionElement.textContent = cleanDescription || 'Professional voice option';
            
            // Create characteristic tags
            const tags = [];
            
            // Add category tag
            if (voiceData.category) {
                tags.push(`<span class="voice-tag category-${voiceData.category}">${voiceData.category}</span>`);
            }
            
            // Add characteristic tags
            characteristics.forEach(char => {
                if (char && char !== 'unknown' && char !== '') {
                    tags.push(`<span class="voice-tag">${char}</span>`);
                }
            });
            
            characteristicsElement.innerHTML = tags.join('');
            
            // Remove updating animation
            voiceInfo.classList.remove('updating');
        }, 150);
    }


    async handleTextSoundtrackGeneration() {
        const formData = new FormData(document.getElementById('text-soundtrack-form'));
        
        // Get all component inputs - all are completely optional
        const dialogueText = formData.get('dialogue_text');
        const effectsDescription = formData.get('effects_description');
        const musicDescription = formData.get('music_description');
        
        // Check that at least one component is requested
        const hasDialogue = dialogueText && dialogueText.trim().length > 0;
        const hasEffects = effectsDescription && effectsDescription.trim().length > 0;
        const hasMusic = musicDescription && musicDescription.trim().length > 0;
        
        if (!hasDialogue && !hasEffects && !hasMusic) {
            this.showError('Please specify at least one component: dialogue text, sound effects description, or music description.');
            return;
        }

        // Validate dialogue length if provided
        if (hasDialogue && dialogueText.trim().length < 5) {
            this.showError('Dialogue text must be at least 5 characters if provided.');
            return;
        }
        
        console.log('Generating soundtrack with:', {
            hasDialogue,
            hasEffects,
            hasMusic,
            dialogue: hasDialogue ? dialogueText.substring(0, 50) + '...' : 'None',
            effects: hasEffects ? effectsDescription.substring(0, 30) + '...' : 'None',
            music: hasMusic ? musicDescription.substring(0, 30) + '...' : 'None'
        });

        this.showProcessingScreen();
        
        try {
            const response = await fetch('/api/generate-text-soundtrack', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.currentJobId = result.job_id;
            this.startProgressTracking();
            
        } catch (error) {
            console.error('Error generating text soundtrack:', error);
            this.showError('Failed to start soundtrack generation. Please try again.');
        }
    }


    showProcessingScreen() {
        document.getElementById('text-mode').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('error-section').style.display = 'none';
        document.getElementById('processing-status').style.display = 'block';
        
        // Reset progress
        this.updateProgress(0, 'Initializing...');
        this.resetSteps();
    }

    showResultsScreen(audioUrl) {
        document.getElementById('processing-status').style.display = 'none';
        document.getElementById('error-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'block';
        
        // Set audio source
        const audioElement = document.getElementById('generated-audio');
        audioElement.src = audioUrl;
    }

    showError(message) {
        document.getElementById('text-mode').style.display = 'none';
        document.getElementById('processing-status').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('error-section').style.display = 'block';
        
        document.getElementById('error-message').textContent = message;
    }

    startProgressTracking() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }

        this.processingInterval = setInterval(async () => {
            await this.checkJobStatus();
        }, 2000); // Check every 2 seconds
    }

    async checkJobStatus() {
        if (!this.currentJobId) return;

        try {
            const response = await fetch(`/api/job-status/${this.currentJobId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const status = await response.json();
            
            this.updateProgress(status.progress || 0, status.status || 'Processing...');
            this.updateSteps(status.progress || 0);

            if (status.status === 'completed') {
                clearInterval(this.processingInterval);
                this.processingInterval = null;
                
                const audioUrl = `/api/download/${this.currentJobId}`;
                this.showResultsScreen(audioUrl);
                
            } else if (status.status === 'error') {
                clearInterval(this.processingInterval);
                this.processingInterval = null;
                
                this.showError(status.error || 'An error occurred during generation.');
            }
            
        } catch (error) {
            console.error('Error checking job status:', error);
            clearInterval(this.processingInterval);
            this.processingInterval = null;
            this.showError('Lost connection to server. Please try again.');
        }
    }

    updateProgress(percentage, statusText) {
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressStatus = document.getElementById('progress-status');
        
        progressFill.style.width = `${percentage}%`;
        progressPercentage.textContent = `${Math.round(percentage)}%`;
        progressStatus.textContent = statusText;
    }

    updateSteps(percentage) {
        const steps = document.querySelectorAll('.step');
        
        steps.forEach((step, index) => {
            const stepPercentage = (index + 1) * 25; // 4 steps, 25% each
            
            step.classList.remove('active', 'completed');
            
            if (percentage >= stepPercentage) {
                step.classList.add('completed');
            } else if (percentage >= stepPercentage - 25 && percentage < stepPercentage) {
                step.classList.add('active');
            }
        });
    }

    resetSteps() {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
    }

    async downloadSoundtrack() {
        if (!this.currentJobId) return;
        
        try {
            const downloadUrl = `/api/download/${this.currentJobId}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `soundtrack_${this.currentJobId}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Error downloading soundtrack:', error);
            this.showError('Failed to download soundtrack. Please try again.');
        }
    }

    resetInterface() {
        // Clear processing state
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        this.currentJobId = null;
        
        // Reset forms
        document.getElementById('text-soundtrack-form').reset();
        
        // Show text mode
        document.getElementById('processing-status').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('error-section').style.display = 'none';
        document.getElementById('text-mode').style.display = 'block';
    }

    retryGeneration() {
        this.resetInterface();
    }


    // Audio Fader Control Methods
    initializeFaders() {
        // Initialize fader values display
        this.updateFaderDisplays();
    }

    handleFaderChange(event) {
        const slider = event.target;
        const value = parseInt(slider.value);
        const faderId = slider.id;
        
        // Update display value
        const valueElement = document.getElementById(faderId.replace('-level', '-value'));
        if (valueElement) {
            valueElement.textContent = value + 'dB';
        }
        
        // Visual feedback
        slider.style.opacity = '1';
        setTimeout(() => {
            slider.style.opacity = '0.8';
        }, 150);
        
        console.log(`Audio level adjusted: ${faderId} = ${value}dB`);
    }

    handlePresetClick(event) {
        const preset = event.target.dataset.preset;
        
        // Remove active class from all presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked preset
        event.target.classList.add('active');
        
        // Apply preset values
        this.applyMixingPreset(preset);
    }

    applyMixingPreset(preset) {
        const presets = {
            'dialogue-focus': {
                dialogue: 2,   // Boost dialogue
                effects: -15,  // Quiet effects
                music: -20     // Very quiet music
            },
            'balanced': {
                dialogue: 0,   // Normal dialogue
                effects: -8,   // Moderate effects
                music: -12     // Background music
            },
            'atmospheric': {
                dialogue: -3,  // Slightly quieter dialogue
                effects: -3,   // Prominent effects
                music: -6      // More prominent music
            },
            'cinematic': {
                dialogue: -2,  // Slightly quieter dialogue
                effects: -2,   // Prominent effects
                music: -4      // Cinematic music
            }
        };
        
        const values = presets[preset];
        if (!values) return;
        
        // Apply values to sliders
        document.getElementById('dialogue-level').value = values.dialogue;
        document.getElementById('effects-level').value = values.effects;
        document.getElementById('music-level').value = values.music;
        
        // Update displays
        this.updateFaderDisplays();
        
        console.log(`Applied mixing preset: ${preset}`, values);
    }

    updateFaderDisplays() {
        const faders = [
            { slider: 'dialogue-level', value: 'dialogue-value' },
            { slider: 'effects-level', value: 'effects-value' },
            { slider: 'music-level', value: 'music-value' }
        ];
        
        faders.forEach(fader => {
            const slider = document.getElementById(fader.slider);
            const valueElement = document.getElementById(fader.value);
            
            if (slider && valueElement) {
                valueElement.textContent = slider.value + 'dB';
            }
        });
    }
}


// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.soundtrackGenerator = new SoundtrackGenerator();
    
    // Add some visual enhancements
    addVisualEnhancements();
});

function addVisualEnhancements() {
    // Add floating animation to cards
    const cards = document.querySelectorAll('.input-section, .processing-section, .results-section');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
        card.classList.add('fade-in');
    });
    
    // Add hover effects to buttons
    const buttons = document.querySelectorAll('.generate-btn, .action-btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    .fade-in {
        animation: fadeInUp 0.6s ease-out forwards;
        opacity: 0;
        transform: translateY(30px);
    }
    
    @keyframes fadeInUp {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .pulse {
        animation: pulseAnimation 1.5s infinite;
    }
    
    @keyframes pulseAnimation {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }
    
    .scale-in {
        animation: scaleIn 0.3s ease-out;
    }
    
    @keyframes scaleIn {
        0% {
            transform: scale(0.9);
        }
        100% {
            transform: scale(1);
        }
    }
`;
document.head.appendChild(style);