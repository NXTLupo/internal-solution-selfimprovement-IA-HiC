/**
 * journey_export.js
 * Complete override to prevent ALL export functionality except CSV
 */

// Override any existing export functions that might be defined in the HTML
window.addEventListener('load', function() {
    // Completely override any export-related functions that might exist
    if (window.exportAsPDF) window.exportAsPDF = function() { return false; };
    if (window.exportAsPng) window.exportAsPng = function() { return false; };
    if (window.printJourney) window.printJourney = function() { return false; };
    if (window.saveAsImage) window.saveAsImage = function() { return false; };
    
    // Intercept and block functions that might create export panel
    if (window.createExportPanel) window.createExportPanel = function() { return null; };
    if (window.setupExportPanel) window.setupExportPanel = function() { return null; };
    if (window.initExportPanel) window.initExportPanel = function() { return null; };
    
    // Aggressively remove any export panels that might already exist
    function nukeExportPanels() {
        // Find and remove ANY export-related elements
        const selectors = [
            '.export-panel', '#export-panel', '[class*="export-panel"]', '[id*="export-panel"]',
            '.export-controls', '#export-controls', '[class*="export-controls"]', 
            '#export-pdf', '#export-png', '#export-print',
            'button[id*="export-pdf"]', 'button[id*="export-png"]', 'button[id*="export-print"]',
            'button.export-btn', '[class*="export-btn"]:not([id*="csv"])'
        ];
        
        // Join all selectors and find matching elements
        const elements = document.querySelectorAll(selectors.join(','));
        elements.forEach(el => {
            if (el && !el.id.includes('csv')) {
                el.remove(); // Remove the element entirely
            }
        });
        
        // Also find and remove any divs with "export" in their class or ID
        const possibleExportDivs = document.querySelectorAll('div[class*="export"], div[id*="export"]');
        possibleExportDivs.forEach(div => {
            // Keep CSV export button
            if (div && !div.id.includes('csv') && !div.className.includes('csv')) {
                div.remove();
            }
        });
    }
    
    // Run immediately
    nukeExportPanels();
    
    // Run again after short delays to catch elements added after page load
    setTimeout(nukeExportPanels, 100);
    setTimeout(nukeExportPanels, 500);
    setTimeout(nukeExportPanels, 1000);
    setTimeout(nukeExportPanels, 2000);
    
    // Set up a MutationObserver to destroy any export elements that get added
    const observer = new MutationObserver(function(mutations) {
        let needsCleanup = false;
        
        // Check if any mutations might have added export elements
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                needsCleanup = true;
            }
        });
        
        // If we found something that might need cleanup, run the nuke function
        if (needsCleanup) {
            nukeExportPanels();
        }
    });
    
    // Observe the entire document for changes
    observer.observe(document, {
        childList: true,
        subtree: true
    });
    
    // Override any future attempts to define export functions
    Object.defineProperties(window, {
        'exportAsPDF': { value: function() { return false; }, writable: false },
        'exportAsPng': { value: function() { return false; }, writable: false },
        'printJourney': { value: function() { return false; }, writable: false },
        'saveAsImage': { value: function() { return false; }, writable: false },
        'createExportPanel': { value: function() { return null; }, writable: false },
        'setupExportPanel': { value: function() { return null; }, writable: false },
        'initExportPanel': { value: function() { return null; }, writable: false }
    });
});