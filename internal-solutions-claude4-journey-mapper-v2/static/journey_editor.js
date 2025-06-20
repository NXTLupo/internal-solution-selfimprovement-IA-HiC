/**
 * Journey Map Editor - Simple and Reliable Version
 * Easy-to-use editing with clear button controls
 */

class JourneyMapEditor {
    constructor() {
        this.isEditMode = false;
        this.selectedElement = null;
        this.init();
    }

    init() {
        this.createSimpleEditingUI();
        this.attachEventListeners();
    }

    createSimpleEditingUI() {
        // Create simple edit mode toggle
        const editButton = document.createElement('button');
        editButton.id = 'edit-mode-toggle';
        editButton.innerHTML = '✏️ Edit Mode';
        editButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(editButton);

        // Create simple control panel
        const controlPanel = document.createElement('div');
        controlPanel.id = 'edit-control-panel';
        controlPanel.innerHTML = `
            <div style="margin-bottom: 15px; font-weight: bold; color: #333;">Edit Selected Text</div>
            
            <div style="margin-bottom: 15px;">
                <input type="text" id="edit-text-input" placeholder="Enter new text..." 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Text Color:</label>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;">
                    <button class="color-btn" data-color="#000000" style="background: #000000;" title="Black"></button>
                    <button class="color-btn" data-color="#ffffff" style="background: #ffffff; border: 2px solid #333;" title="White"></button>
                    <button class="color-btn" data-color="#dc2626" style="background: #dc2626;" title="Red"></button>
                    <button class="color-btn" data-color="#16a34a" style="background: #16a34a;" title="Green"></button>
                    <button class="color-btn" data-color="#2563eb" style="background: #2563eb;" title="Blue"></button>
                    <button class="color-btn" data-color="#7c3aed" style="background: #7c3aed;" title="Purple"></button>
                    <button class="color-btn" data-color="#ca8a04" style="background: #ca8a04;" title="Orange"></button>
                    <button class="color-btn" data-color="#0891b2" style="background: #0891b2;" title="Cyan"></button>
                    <button class="color-btn" data-color="#6b7280" style="background: #6b7280;" title="Gray"></button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button id="apply-changes-btn" style="background: #16a34a; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: 500;">Apply Changes</button>
                <button id="delete-element-btn" style="background: #dc2626; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: 500;">Delete Element</button>
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 4px; font-size: 13px;">
                <strong>How to edit:</strong><br>
                1. Turn on Edit Mode<br>
                2. Click any text to select it<br>
                3. Edit text and color using the controls above<br>
                4. Click "Apply Changes" or "Delete Element"
            </div>
        `;
        controlPanel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            display: none;
            width: 300px;
            max-height: 80vh;
            overflow-y: auto;
        `;
        document.body.appendChild(controlPanel);

        // Add styles for color buttons
        const style = document.createElement('style');
        style.textContent = `
            .color-btn {
                width: 30px;
                height: 30px;
                border: 2px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .color-btn:hover {
                border-color: #007bff;
                transform: scale(1.1);
            }
            .color-btn.selected {
                border-color: #007bff;
                border-width: 3px;
            }
            .editable-element {
                cursor: pointer !important;
                position: relative;
                transition: all 0.2s;
            }
            .editable-element:hover {
                background-color: rgba(0, 123, 255, 0.1) !important;
                outline: 2px solid rgba(0, 123, 255, 0.3);
                outline-offset: 2px;
            }
            .selected-element {
                background-color: rgba(0, 123, 255, 0.2) !important;
                outline: 2px solid #007bff !important;
                outline-offset: 2px;
            }
            .edit-mode-active .editable-element::after {
                content: "Click to edit";
                position: absolute;
                top: -25px;
                left: 0;
                background: #007bff;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 11px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s;
                pointer-events: none;
                z-index: 1000;
            }
            .edit-mode-active .editable-element:hover::after {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Edit mode toggle
        document.getElementById('edit-mode-toggle').addEventListener('click', () => {
            this.toggleEditMode();
        });

        // Color buttons
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Apply changes button
        document.getElementById('apply-changes-btn').addEventListener('click', () => {
            this.applyChanges();
        });

        // Delete element button
        document.getElementById('delete-element-btn').addEventListener('click', () => {
            this.deleteElement();
        });
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const button = document.getElementById('edit-mode-toggle');
        const panel = document.getElementById('edit-control-panel');
        
        if (this.isEditMode) {
            button.innerHTML = '❌ Exit Edit Mode';
            button.style.background = '#dc2626';
            panel.style.display = 'block';
            document.body.classList.add('edit-mode-active');
            this.makeElementsEditable();
            this.showMessage('Edit mode active! Click any text to select and edit it.', 'info');
        } else {
            button.innerHTML = '✏️ Edit Mode';
            button.style.background = '#007bff';
            panel.style.display = 'none';
            document.body.classList.remove('edit-mode-active');
            this.disableEditing();
            this.selectedElement = null;
            this.showMessage('Edit mode disabled.', 'success');
        }
    }

    makeElementsEditable() {
        // Find all text elements that should be editable
        const selectors = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'span', 'div', 'li', 'td', 'th',
            '.stage-title', '.stage-description', 
            '.pain-point', '.opportunity',
            '.insight-title', '.insight-description'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // Skip if already processed or if it's a container with only child elements
                if (el.classList.contains('editable-element') || 
                    el.children.length > 0 && el.textContent.trim().length === 0) {
                    return;
                }

                // Skip our UI elements
                if (el.closest('#edit-mode-toggle, #edit-control-panel')) {
                    return;
                }

                // Add unique ID if needed
                if (!el.id) {
                    el.id = 'editable-' + Math.random().toString(36).substr(2, 9);
                }

                el.classList.add('editable-element');
                
                // Simple click to select
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectElement(el);
                });
            });
        });
    }

    selectElement(element) {
        if (!this.isEditMode) return;

        // Remove previous selection
        document.querySelectorAll('.selected-element').forEach(el => {
            el.classList.remove('selected-element');
        });

        // Select new element
        element.classList.add('selected-element');
        this.selectedElement = element;

        // Populate the edit form
        const textInput = document.getElementById('edit-text-input');
        textInput.value = element.textContent.trim();
        textInput.focus();

        // Get current color and select it
        const currentColor = window.getComputedStyle(element).color;
        const rgbToHex = (rgb) => {
            const result = rgb.match(/\d+/g);
            if (result) {
                const r = parseInt(result[0]);
                const g = parseInt(result[1]);
                const b = parseInt(result[2]);
                
                // Check for white color (rgb(255, 255, 255))
                if (r === 255 && g === 255 && b === 255) {
                    return "#ffffff";
                }
                
                return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }
            return '#000000';
        };
        
        const hexColor = rgbToHex(currentColor);
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.color === hexColor || btn.dataset.color.toLowerCase() === hexColor.toLowerCase()) {
                btn.classList.add('selected');
            }
        });

        this.showMessage(`Selected: "${element.textContent.trim().substring(0, 30)}${element.textContent.length > 30 ? '...' : ''}"`, 'info');
    }

    async applyChanges() {
        if (!this.selectedElement) {
            this.showMessage('Please select an element first by clicking on it.', 'error');
            return;
        }

        const newText = document.getElementById('edit-text-input').value.trim();
        const selectedColorBtn = document.querySelector('.color-btn.selected');
        const newColor = selectedColorBtn ? selectedColorBtn.dataset.color : null;

        if (newText === '') {
            this.showMessage('Text cannot be empty.', 'error');
            return;
        }

        // Store original values for rollback if save fails
        const originalText = this.selectedElement.textContent;
        const originalColor = this.selectedElement.style.color;

        try {
            // Apply changes locally first for immediate feedback
            if (newText !== originalText) {
                this.selectedElement.textContent = newText;
            }
            
            if (newColor) {
                this.selectedElement.style.color = newColor;
            }

            this.showMessage('Saving changes...', 'info');

            // Save to server
            const success = await this.saveElementChange(this.selectedElement.id, {
                new_text: newText,
                new_color: newColor
            });

            if (success) {
                this.showMessage('Changes saved successfully!', 'success');
            } else {
                // Rollback changes if save failed
                this.selectedElement.textContent = originalText;
                this.selectedElement.style.color = originalColor;
                this.showMessage('Failed to save changes. Changes reverted.', 'error');
            }
        } catch (error) {
            // Rollback changes on error
            this.selectedElement.textContent = originalText;
            this.selectedElement.style.color = originalColor;
            this.showMessage('Error saving changes. Changes reverted.', 'error');
            console.error('Apply changes error:', error);
        }
    }

    async deleteElement() {
        if (!this.selectedElement) {
            this.showMessage('Please select an element first by clicking on it.', 'error');
            return;
        }

        const elementText = this.selectedElement.textContent.trim();
        const elementId = this.selectedElement.id;
        
        if (confirm('Are you sure you want to delete this element? This cannot be undone.')) {
            try {
                // Store reference to element for potential restore
                const elementParent = this.selectedElement.parentNode;
                const elementNextSibling = this.selectedElement.nextSibling;
                const elementClone = this.selectedElement.cloneNode(true);
                
                // Remove element immediately for visual feedback
                this.selectedElement.remove();
                this.showMessage('Deleting element...', 'info');
                
                // Save deletion to server
                const success = await this.saveElementRemoval(elementId);
                
                if (success) {
                    // Clear selection since element is gone
                    this.selectedElement = null;
                    document.getElementById('edit-text-input').value = '';
                    
                    this.showMessage(`Element "${elementText.substring(0, 30)}${elementText.length > 30 ? '...' : ''}" deleted.`, 'success');
                } else {
                    // Restore element if server save failed
                    if (elementNextSibling) {
                        elementParent.insertBefore(elementClone, elementNextSibling);
                    } else {
                        elementParent.appendChild(elementClone);
                    }
                    this.selectedElement = elementClone;
                    this.showMessage('Failed to delete element. Element restored.', 'error');
                }
            } catch (error) {
                console.error('Delete element error:', error);
                this.showMessage('Error deleting element.', 'error');
            }
        }
    }

    disableEditing() {
        document.querySelectorAll('.editable-element').forEach(el => {
            el.classList.remove('editable-element', 'selected-element');
            // Remove click listeners by cloning the element
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
        });
    }

    async saveElementChange(elementId, changes) {
        try {
            // Check if journeyMapId is available
            if (!window.journeyMapId) {
                console.warn('No journey map ID available, skipping server save');
                return true; // Return true for local-only editing
            }

            const response = await fetch(`/api/edit-journey-map/${window.journeyMapId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    element_id: elementId,
                    ...changes
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server error:', response.status, errorData);
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('Changes saved to server:', result);
            return true;

        } catch (error) {
            console.error('Error saving changes:', error);
            // Don't show message here, let the caller handle it
            return false;
        }
    }

    async saveElementRemoval(elementId) {
        try {
            // Check if journeyMapId is available
            if (!window.journeyMapId) {
                console.warn('No journey map ID available, skipping server save');
                return true; // Return true for local-only editing
            }

            const response = await fetch(`/api/remove-element/${window.journeyMapId}?element_id=${elementId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server error:', response.status, errorData);
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('Element removal saved to server:', result);
            return true;

        } catch (error) {
            console.error('Error removing element:', error);
            return false;
        }
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        document.querySelectorAll('.edit-message').forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'edit-message';
        messageDiv.textContent = message;
        
        const colors = {
            'info': '#0ea5e9',
            'success': '#16a34a',
            'error': '#dc2626'
        };
        
        messageDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10002;
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        if (!document.getElementById('message-animations')) {
            style.id = 'message-animations';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
}

// Initialize editor when page loads
let journeyEditor;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we have a journey map ID
    if (window.journeyMapId) {
        journeyEditor = new JourneyMapEditor();
    }
});