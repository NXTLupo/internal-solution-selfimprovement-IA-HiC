/**
 * react_form_handler.js
 * Special handling for React forms to ensure content selection works properly
 */

// Wait for document to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Set up an observer to detect when React renders the form
    setupReactFormObserver();
});

function setupReactFormObserver() {
    // Create a MutationObserver to watch for when React renders the form
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                checkForReactForm();
            }
        }
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also check immediately in case the form is already rendered
    checkForReactForm();
}

function checkForReactForm() {
    const reactForm = document.querySelector('form.enterprise-form');
    
    if (reactForm && !reactForm.getAttribute('data-content-selector-patched')) {
        console.log('Found React form - patching submit handler');
        patchReactForm(reactForm);
    }
}

function patchReactForm(form) {
    // Mark the form as patched to avoid multiple patches
    form.setAttribute('data-content-selector-patched', 'true');
    
    // Find the submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        // Create content selection container before the submit button
        insertContentSelector(form, submitBtn);
        
        // Add a handler for React's form submission
        patchReactSubmitHandler(form);
    }
}

function insertContentSelector(form, beforeElement) {
    // Create content selection UI
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'form-group content-selector-container';
    
    selectorContainer.innerHTML = `
        <div class="content-selector-header">
            <i class="fas fa-layer-group" style="color: #4264D0;"></i>
            <div>
                <div class="content-selector-title">Journey Map Content Options</div>
                <div class="content-selector-description">Select which elements to include in your journey map output</div>
            </div>
        </div>
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
    
    // Insert the content selector container before the provided element
    beforeElement.parentNode.insertBefore(selectorContainer, beforeElement);
    
    // Add event listeners for select/deselect buttons
    const selectAllBtn = document.getElementById('select-all-content');
    const deselectAllBtn = document.getElementById('deselect-all-content');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.content-option input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.content-option input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }
}

function patchReactSubmitHandler(form) {
    // Find the original submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (!submitBtn) return;
    
    // Capture React's click handler
    const originalOnClick = submitBtn.onclick;
    
    // Replace it with our own that adds the content selection
    submitBtn.onclick = function(event) {
        // Get all content selection checkboxes
        const contentCheckboxes = form.querySelectorAll('.content-option input[type="checkbox"]');
        
        // Create content selection data object
        const contentSelection = {
            summary: true,
            stages: true,
            painPoints: true,
            opportunities: true,
            insights: true,
            recommendations: true,
            touchpoints: true,
            personas: true,
            emotions: true
        };
        
        // Update based on checkbox values
        contentCheckboxes.forEach(checkbox => {
            contentSelection[checkbox.value] = checkbox.checked;
        });
        
        console.log('Content selection:', contentSelection);
        
        // Add hidden input field with content selection data
        let hiddenInput = form.querySelector('input[name="content_selection"]');
        
        if (hiddenInput) {
            hiddenInput.value = JSON.stringify(contentSelection);
        } else {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'content_selection';
            hiddenInput.value = JSON.stringify(contentSelection);
            form.appendChild(hiddenInput);
        }
        
        // Call the original React handler
        if (typeof originalOnClick === 'function') {
            originalOnClick.call(this, event);
        }
    };
}

// Initialize immediately
setupReactFormObserver();