/**
 * Journey Map Editor - Improved Non-Intrusive Version
 * This editor preserves all interactive functionality of the journey map
 */

class JourneyMapEditor {
    constructor() {
        this.isEditMode = false;
        this.selectedElement = null;
        this.originalStyles = {};
        this.eventHandlers = {};
        this.init();
    }

    init() {
        this.createMinimalisticUI();
        this.attachEventListeners();
    }

    createMinimalisticUI() {
        // Create a floating control panel container that is collapsible
        const controlContainer = document.createElement('div');
        controlContainer.id = 'journey-controls-container';
        controlContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(controlContainer);

        // Create edit toggle button
        const editButton = document.createElement('button');
        editButton.id = 'edit-mode-toggle';
        editButton.className = 'journey-control-btn';
        editButton.innerHTML = '✏️ Edit';
        editButton.style.cssText = `
            background: #4264D0;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 15px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 6px;
            margin: 0;
            transition: all 0.2s ease;
        `;
        controlContainer.appendChild(editButton);

        // Create a minimal edit control panel
        const controlPanel = document.createElement('div');
        controlPanel.id = 'edit-control-panel';
        controlPanel.innerHTML = `
            <div class="edit-panel-header">
                <div class="edit-panel-title">Edit Selection</div>
                <button id="close-edit-panel" class="edit-panel-close">×</button>
            </div>
            
            <div class="edit-panel-body">
                <input type="text" id="edit-text-input" placeholder="Enter new text...">
                
                <div class="edit-color-options">
                    <label class="edit-label">Color:</label>
                    <div class="color-buttons">
                        <button class="color-btn" data-color="#000000" style="background: #000000;" title="Black"></button>
                        <button class="color-btn" data-color="#ffffff" style="background: #ffffff; border: 1px solid #ddd;" title="White"></button>
                        <button class="color-btn" data-color="#dc2626" style="background: #dc2626;" title="Red"></button>
                        <button class="color-btn" data-color="#16a34a" style="background: #16a34a;" title="Green"></button>
                        <button class="color-btn" data-color="#2563eb" style="background: #2563eb;" title="Blue"></button>
                    </div>
                </div>
                
                <div class="edit-actions">
                    <button id="apply-changes-btn">Apply</button>
                    <button id="delete-element-btn">Delete</button>
                </div>
            </div>
        `;
        controlPanel.style.cssText = `
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            width: 280px;
            overflow: hidden;
            display: none;
            border: 1px solid #eaeaea;
        `;
        controlContainer.appendChild(controlPanel);

        // Add styles for the control panel
        const style = document.createElement('style');
        style.textContent = `
            .edit-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: #f5f7fa;
                border-bottom: 1px solid #eaeaea;
            }
            
            .edit-panel-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
            }
            
            .edit-panel-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            
            .edit-panel-close:hover {
                background: rgba(0,0,0,0.05);
                color: #333;
            }
            
            .edit-panel-body {
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            #edit-text-input {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .edit-label {
                font-size: 12px;
                font-weight: 500;
                margin-bottom: 5px;
                color: #555;
                display: block;
            }
            
            .edit-color-options {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .color-buttons {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }
            
            .color-btn {
                width: 24px;
                height: 24px;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                padding: 0;
                transition: transform 0.15s ease;
            }
            
            .color-btn:hover {
                transform: scale(1.1);
                border-color: #aaa;
            }
            
            .color-btn.selected {
                border: 2px solid #4264D0;
                box-shadow: 0 0 0 1px white inset;
            }
            
            .edit-actions {
                display: flex;
                gap: 8px;
                margin-top: 5px;
            }
            
            .edit-actions button {
                flex: 1;
                padding: 6px;
                border: none;
                border-radius: 4px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
            }
            
            #apply-changes-btn {
                background: #4264D0;
                color: white;
            }
            
            #delete-element-btn {
                background: #f43f5e;
                color: white;
            }
            
            .journey-highlight {
                outline: 2px dashed rgba(66, 100, 208, 0.5) !important;
                outline-offset: 2px;
                transition: outline 0.2s ease;
            }
            
            .journey-selected {
                outline: 2px solid #4264D0 !important;
                outline-offset: 2px;
                background-color: rgba(66, 100, 208, 0.1);
            }
            
            .journey-highlight-tooltip {
                position: absolute;
                background: #4264D0;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 10001;
                white-space: nowrap;
                top: -20px;
                left: 0;
            }
            
            .journey-export-controls {
                display: flex;
                gap: 10px;
            }
            
            .journey-control-btn {
                background: #4264D0;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 15px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                gap: 6px;
                margin: 0;
                transition: all 0.2s ease;
            }
            
            .journey-csv-btn {
                background: #16a34a;
            }
            
            .journey-notification {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 20px;
                background: #4264D0;
                color: white;
                border-radius: 8px;
                font-size: 14px;
                z-index: 10002;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: fadeInUp 0.3s ease, fadeOut 0.3s ease 2.7s;
                pointer-events: none;
            }
            
            @keyframes fadeInUp {
                from { transform: translate(-50%, 20px); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        // Note: Export button is now handled by journey_export_csv.js
    }

    attachEventListeners() {
        // Edit mode toggle
        const editButton = document.getElementById('edit-mode-toggle');
        if (editButton) {
            editButton.addEventListener('click', () => {
                this.toggleEditMode();
            });
        }

        // Close edit panel button
        const closeButton = document.getElementById('close-edit-panel');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideControlPanel();
                if (this.selectedElement) {
                    this.deselectElement();
                }
            });
        }

        // Color buttons
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Apply changes button
        const applyButton = document.getElementById('apply-changes-btn');
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                this.applyChanges();
            });
        }

        // Delete element button
        const deleteButton = document.getElementById('delete-element-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                this.deleteElement();
            });
        }

        // CSV Export button is now handled by journey_export_csv.js
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const button = document.getElementById('edit-mode-toggle');
        
        if (this.isEditMode) {
            button.innerHTML = '✏️ Exit Edit';
            button.style.background = '#f43f5e';
            this.showNotification('Edit mode activated. Click on text to edit.');
            this.setupEditableElements();
        } else {
            button.innerHTML = '✏️ Edit';
            button.style.background = '#4264D0';
            this.showNotification('Edit mode disabled.');
            this.teardownEditableElements();
            this.hideControlPanel();
            
            if (this.selectedElement) {
                this.deselectElement();
            }
        }
    }

    setupEditableElements() {
        // Find all text elements that should be editable without breaking interactivity
        const selectors = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'span', 'div:not(.journey-stage, .stage-content)', 'li', 'td', 'th',
            '.stage-title', '.stage-description', 
            '.pain-point', '.opportunity',
            '.insight-title', '.insight-description'
        ];
        
        // We'll use a delegated click handler on the document
        // This preserves existing click events while allowing us to handle edits
        this.handleDocumentClick = (e) => {
            if (!this.isEditMode) return;
            
            // Check if the click target or any of its parents match our selectors
            let element = e.target;
            let matched = false;
            
            // Skip our UI elements
            if (element.closest('#journey-controls-container')) {
                return;
            }
            
            // Skip elements that are just containers with many children
            if (element.children.length > 3 && element.textContent.trim().length > 0) {
                return;
            }
            
            // Check if the element or any parent matches our selectors
            while (element && element !== document.body) {
                // Check if element matches any of our selectors
                for (const selector of selectors) {
                    if (element.matches(selector)) {
                        // Skip if it's a container with only child elements
                        if (element.children.length > 0 && element.textContent.trim().length === 0) {
                            break;
                        }
                        
                        matched = true;
                        break;
                    }
                }
                
                if (matched) break;
                element = element.parentElement;
            }
            
            if (matched && element) {
                // Don't interfere with existing interactivity
                // Only handle selection and prevent defaults if shift key is pressed
                if (e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                this.selectElement(element);
            }
        };
        
        document.addEventListener('click', this.handleDocumentClick, true);
        
        // Add highlight effect on mouseover for editable elements
        this.handleDocumentMouseover = (e) => {
            if (!this.isEditMode) return;
            
            // Similar logic as click handler to find editable elements
            let element = e.target;
            let matched = false;
            
            if (element.closest('#journey-controls-container')) {
                return;
            }
            
            if (element.children.length > 3 && element.textContent.trim().length > 0) {
                return;
            }
            
            while (element && element !== document.body) {
                for (const selector of selectors) {
                    if (element.matches(selector)) {
                        if (element.children.length > 0 && element.textContent.trim().length === 0) {
                            break;
                        }
                        matched = true;
                        break;
                    }
                }
                
                if (matched) break;
                element = element.parentElement;
            }
            
            if (matched && element) {
                // Add highlight class
                element.classList.add('journey-highlight');
                
                // Add tooltip if not already present
                if (!element.querySelector('.journey-highlight-tooltip')) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'journey-highlight-tooltip';
                    tooltip.textContent = 'Shift+Click to edit';
                    tooltip.style.opacity = '1';
                    element.style.position = 'relative';
                    element.appendChild(tooltip);
                }
            }
        };
        
        document.addEventListener('mouseover', this.handleDocumentMouseover, true);
        
        this.handleDocumentMouseout = (e) => {
            if (!this.isEditMode) return;
            
            // Remove highlight from all elements when mouse leaves
            document.querySelectorAll('.journey-highlight').forEach(el => {
                el.classList.remove('journey-highlight');
                const tooltip = el.querySelector('.journey-highlight-tooltip');
                if (tooltip) {
                    tooltip.remove();
                }
            });
        };
        
        document.addEventListener('mouseout', this.handleDocumentMouseout, true);
    }

    teardownEditableElements() {
        // Remove event listeners when exiting edit mode
        document.removeEventListener('click', this.handleDocumentClick, true);
        document.removeEventListener('mouseover', this.handleDocumentMouseover, true);
        document.removeEventListener('mouseout', this.handleDocumentMouseout, true);
        
        // Remove any highlight styling
        document.querySelectorAll('.journey-highlight, .journey-selected').forEach(el => {
            el.classList.remove('journey-highlight', 'journey-selected');
            const tooltip = el.querySelector('.journey-highlight-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    }

    selectElement(element) {
        // Deselect previous element if any
        if (this.selectedElement) {
            this.deselectElement();
        }
        
        // Select new element
        this.selectedElement = element;
        element.classList.add('journey-selected');
        
        // Show control panel with element's current text
        const controlPanel = document.getElementById('edit-control-panel');
        if (controlPanel) {
            controlPanel.style.display = 'block';
            
            // Populate text input
            const textInput = document.getElementById('edit-text-input');
            if (textInput) {
                textInput.value = element.textContent.trim();
                textInput.focus();
            }
            
            // Find current color and select matching button if any
            const currentColor = window.getComputedStyle(element).color;
            const rgbToHex = (rgb) => {
                const values = rgb.match(/\d+/g);
                if (values) {
                    return "#" + values.slice(0, 3).map(x => {
                        const hex = parseInt(x).toString(16);
                        return hex.length === 1 ? "0" + hex : hex;
                    }).join("");
                }
                return "#000000";
            };
            
            const hexColor = rgbToHex(currentColor);
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.dataset.color.toLowerCase() === hexColor.toLowerCase()) {
                    btn.classList.add('selected');
                }
            });
        }
        
        this.showNotification(`Selected: "${element.textContent.trim().substring(0, 30)}${element.textContent.length > 30 ? '...' : ''}"`);
    }

    deselectElement() {
        if (this.selectedElement) {
            this.selectedElement.classList.remove('journey-selected');
            this.selectedElement = null;
        }
    }

    hideControlPanel() {
        const controlPanel = document.getElementById('edit-control-panel');
        if (controlPanel) {
            controlPanel.style.display = 'none';
        }
    }

    applyChanges() {
        if (!this.selectedElement) {
            this.showNotification('Please select an element to edit first.', 'error');
            return;
        }
        
        const newText = document.getElementById('edit-text-input').value.trim();
        const selectedColorBtn = document.querySelector('.color-btn.selected');
        const newColor = selectedColorBtn ? selectedColorBtn.dataset.color : null;
        
        // Store original values for rollback
        const originalText = this.selectedElement.textContent;
        const originalColor = this.selectedElement.style.color;
        
        try {
            // Apply changes locally
            if (newText !== originalText) {
                this.selectedElement.textContent = newText;
            }
            
            if (newColor) {
                this.selectedElement.style.color = newColor;
            }
            
            this.showNotification('Changes applied successfully');
            
            // Save to server if journey ID available
            if (window.journeyMapId) {
                this.saveChanges(this.selectedElement, newText, newColor);
            }
            
            // Deselect after editing
            this.deselectElement();
            this.hideControlPanel();
            
        } catch (error) {
            console.error('Error applying changes:', error);
            // Rollback changes
            this.selectedElement.textContent = originalText;
            this.selectedElement.style.color = originalColor;
            this.showNotification('Error applying changes', 'error');
        }
    }

    deleteElement() {
        if (!this.selectedElement) {
            this.showNotification('Please select an element to delete first.', 'error');
            return;
        }
        
        // Confirm deletion
        if (confirm('Are you sure you want to delete this element? This cannot be undone.')) {
            // Store reference for potential restoration
            const elementParent = this.selectedElement.parentNode;
            const elementNextSibling = this.selectedElement.nextSibling;
            const elementClone = this.selectedElement.cloneNode(true);
            
            // Remove the element
            this.selectedElement.remove();
            
            // Save to server if journey ID available
            if (window.journeyMapId) {
                this.deleteElementFromServer(this.selectedElement.id)
                    .catch(error => {
                        console.error('Error deleting element:', error);
                        // Restore element on error
                        if (elementNextSibling) {
                            elementParent.insertBefore(elementClone, elementNextSibling);
                        } else {
                            elementParent.appendChild(elementClone);
                        }
                        this.showNotification('Error deleting element', 'error');
                    });
            }
            
            this.selectedElement = null;
            this.hideControlPanel();
            this.showNotification('Element deleted successfully');
        }
    }

    async saveChanges(element, newText, newColor) {
        try {
            if (!window.journeyMapId) {
                return true; // No server save needed
            }
            
            // Generate an ID if the element doesn't have one
            if (!element.id) {
                element.id = 'element-' + Math.random().toString(36).substring(2, 15);
            }
            
            const response = await fetch(`/api/edit-journey-map/${window.journeyMapId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    element_id: element.id,
                    new_text: newText,
                    new_color: newColor
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving changes:', error);
            return false;
        }
    }

    async deleteElementFromServer(elementId) {
        try {
            if (!window.journeyMapId) {
                return true; // No server save needed
            }
            
            const response = await fetch(`/api/remove-element/${window.journeyMapId}?element_id=${elementId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting element:', error);
            throw error;
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.journey-notification').forEach(el => el.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'journey-notification';
        notification.textContent = message;
        
        if (type === 'error') {
            notification.style.background = '#f43f5e';
        }
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Export functionality now handled by journey_export_csv.js
}

// Initialize editor when page loads
let journeyEditor;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we have a journey map ID
    if (window.journeyMapId) {
        journeyEditor = new JourneyMapEditor();
    }
});