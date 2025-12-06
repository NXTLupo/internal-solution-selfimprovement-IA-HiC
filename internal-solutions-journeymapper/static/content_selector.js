/**
 * content_selector.js
 * Implements content selection interface for journey map outputs
 */

class JourneyContentSelector {
    constructor() {
        this.selectedContentTypes = {
            'summary': true,
            'stages': true,
            'painPoints': true, 
            'opportunities': true,
            'insights': true,
            'recommendations': true,
            'touchpoints': true,
            'personas': true,
            'emotions': true
        };
        
        this.init();
    }
    
    init() {
        // If the document is not fully loaded, wait for it
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupSelector());
        } else {
            this.setupSelector();
        }
    }
    
    setupSelector() {
        // Create selector UI before form submission
        this.addSelectorToForm();
        
        // Add functionality to handle content selection
        this.handleFormSubmission();
    }
    
    addSelectorToForm() {
        const journeyForm = document.getElementById('journey-form');
        if (!journeyForm) return;
        
        // Find the submit button to insert our selector before it
        const submitButton = journeyForm.querySelector('.submit-button') || 
                            journeyForm.querySelector('button[type="submit"]');
        
        if (!submitButton) return;
        
        // Create the content selector UI
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'form-group content-selector-container';
        selectorContainer.innerHTML = `
            <label>Content to Include in Journey Map</label>
            <div class="content-selector-options">
                <div class="content-selector-column">
                    <div class="content-option">
                        <input type="checkbox" id="content-summary" name="content_types" value="summary" checked>
                        <label for="content-summary">Journey Summary</label>
                    </div>
                    <div class="content-option">
                        <input type="checkbox" id="content-stages" name="content_types" value="stages" checked>
                        <label for="content-stages">Journey Stages/Phases</label>
                    </div>
                    <div class="content-option">
                        <input type="checkbox" id="content-pain-points" name="content_types" value="painPoints" checked>
                        <label for="content-pain-points">Pain Points</label>
                    </div>
                </div>
                <div class="content-selector-column">
                    <div class="content-option">
                        <input type="checkbox" id="content-opportunities" name="content_types" value="opportunities" checked>
                        <label for="content-opportunities">Opportunities</label>
                    </div>
                    <div class="content-option">
                        <input type="checkbox" id="content-insights" name="content_types" value="insights" checked>
                        <label for="content-insights">Insights</label>
                    </div>
                    <div class="content-option">
                        <input type="checkbox" id="content-recommendations" name="content_types" value="recommendations" checked>
                        <label for="content-recommendations">Recommendations</label>
                    </div>
                </div>
                <div class="content-selector-column">
                    <div class="content-option">
                        <input type="checkbox" id="content-touchpoints" name="content_types" value="touchpoints" checked>
                        <label for="content-touchpoints">Touchpoints</label>
                    </div>
                    <div class="content-option">
                        <input type="checkbox" id="content-personas" name="content_types" value="personas" checked>
                        <label for="content-personas">Personas</label>
                    </div>
                    <div class="content-option">
                        <input type="checkbox" id="content-emotions" name="content_types" value="emotions" checked>
                        <label for="content-emotions">Emotion Indicators</label>
                    </div>
                </div>
            </div>
            <div class="content-selector-actions">
                <button type="button" id="select-all-content">Select All</button>
                <button type="button" id="deselect-all-content">Deselect All</button>
            </div>
        `;
        
        // Add CSS styles
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .content-selector-container {
                margin-top: 1.5rem;
                padding: 1rem;
                border: 1px solid rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                background-color: rgba(255, 255, 255, 0.05);
            }
            
            .content-selector-options {
                display: flex;
                flex-wrap: wrap;
                gap: 1.5rem;
                margin-top: 0.75rem;
            }
            
            .content-selector-column {
                flex: 1;
                min-width: 200px;
            }
            
            .content-option {
                display: flex;
                align-items: center;
                margin-bottom: 0.75rem;
            }
            
            .content-option input[type="checkbox"] {
                margin-right: 0.5rem;
            }
            
            .content-selector-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
                justify-content: flex-start;
            }
            
            .content-selector-actions button {
                background-color: rgba(66, 100, 208, 0.1);
                color: #4264D0;
                border: 1px solid #4264D0;
                padding: 0.4rem 0.8rem;
                border-radius: 4px;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .content-selector-actions button:hover {
                background-color: rgba(66, 100, 208, 0.2);
            }
            
            @media (max-width: 768px) {
                .content-selector-options {
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .content-selector-column {
                    width: 100%;
                }
            }
        `;
        
        // Insert our elements
        document.head.appendChild(styleElement);
        submitButton.parentNode.insertBefore(selectorContainer, submitButton);
        
        // Add event listeners for select/deselect all buttons
        const selectAllButton = document.getElementById('select-all-content');
        const deselectAllButton = document.getElementById('deselect-all-content');
        
        if (selectAllButton) {
            selectAllButton.addEventListener('click', () => {
                document.querySelectorAll('.content-option input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = true;
                    this.updateSelectedContent();
                });
            });
        }
        
        if (deselectAllButton) {
            deselectAllButton.addEventListener('click', () => {
                document.querySelectorAll('.content-option input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                    this.updateSelectedContent();
                });
            });
        }
        
        // Add change listeners to checkboxes
        document.querySelectorAll('.content-option input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectedContent());
        });
    }
    
    updateSelectedContent() {
        document.querySelectorAll('.content-option input[type="checkbox"]').forEach(checkbox => {
            this.selectedContentTypes[checkbox.value] = checkbox.checked;
        });
    }
    
    handleFormSubmission() {
        const journeyForm = document.getElementById('journey-form');
        if (!journeyForm) return;
        
        journeyForm.addEventListener('submit', (event) => {
            // Update the selected content types
            this.updateSelectedContent();
            
            // Add a hidden input with JSON of the selected content types
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'content_selection';
            hiddenInput.value = JSON.stringify(this.selectedContentTypes);
            journeyForm.appendChild(hiddenInput);
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new JourneyContentSelector();
});