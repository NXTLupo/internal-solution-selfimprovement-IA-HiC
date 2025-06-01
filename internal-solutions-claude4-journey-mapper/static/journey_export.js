/**
 * journey_export.js
 * Enhanced client-side export functionality for AI Journey Mapper
 * Specifically improved to capture entire horizontal journey maps
 */

document.addEventListener('DOMContentLoaded', function() {
  // Create export controls if they don't exist
  if (!document.querySelector('.export-panel')) {
      createExportControls();
  }

  // Add event listeners to export buttons
  setupExportListeners();
});

/**
* Creates the export panel UI
*/
function createExportControls() {
  const exportPanel = document.createElement('div');
  exportPanel.className = 'export-panel';
  exportPanel.innerHTML = `
      <div class="export-controls">
          <button id="export-pdf" class="export-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Export as PDF
          </button>
          <button id="export-print" class="export-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print Journey Map
          </button>
          <button id="export-png" class="export-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Save as Image
          </button>
          <div id="export-feedback" class="export-feedback"></div>
      </div>
  `;

  // Add export panel styles if not already in the document
  if (!document.getElementById('export-panel-styles')) {
      const style = document.createElement('style');
      style.id = 'export-panel-styles';
      style.textContent = `
          .export-panel {
              position: fixed;
              top: 15px;
              right: 15px;
              z-index: 1000;
          }
          .export-controls {
              display: flex;
              flex-direction: column;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              padding: 12px;
              gap: 8px;
          }
          .export-btn {
              background-color: #4264D0;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 8px 12px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
          }
          .export-btn:hover {
              background-color: #3450A0;
          }
          .export-btn svg {
              margin-right: 6px;
          }
          .export-btn:disabled {
              background-color: #a0a0a0;
              cursor: not-allowed;
          }
          .export-feedback {
              font-size: 12px;
              color: #666;
              text-align: center;
              margin-top: 5px;
              min-height: 15px;
          }
          @media print {
              .export-panel {
                  display: none !important;
              }
              body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
              }
              .journey-map {
                  page-break-inside: avoid;
              }
              .journey-stage {
                  page-break-inside: avoid;
              }
          }
          .export-loading {
              display: inline-block;
              width: 16px;
              height: 16px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 50%;
              border-top-color: white;
              animation: spin 1s ease-in-out infinite;
              margin-left: 8px;
          }
          @keyframes spin {
              to { transform: rotate(360deg); }
          }
      `;
      document.head.appendChild(style);
  }

  document.body.appendChild(exportPanel);
}

/**
* Set up event listeners for export buttons
*/
function setupExportListeners() {
  // PDF Export
  const pdfButton = document.getElementById('export-pdf');
  if (pdfButton) {
      pdfButton.addEventListener('click', exportToPDF);
  }

  // Print
  const printButton = document.getElementById('export-print');
  if (printButton) {
      printButton.addEventListener('click', printJourneyMap);
  }

  // PNG Export
  const pngButton = document.getElementById('export-png');
  if (pngButton) {
      pngButton.addEventListener('click', exportToPNG);
  }
}

/**
* Export the journey map as a PDF using the server-side endpoint
*/
function exportToPDF() {
  const feedback = document.getElementById('export-feedback');
  const pdfButton = document.getElementById('export-pdf');
  
  if (feedback && pdfButton) {
      feedback.textContent = 'Generating PDF...';
      pdfButton.disabled = true;
      
      // Extract journey ID from URL
      const journeyId = extractJourneyId();
      
      if (!journeyId) {
          feedback.textContent = 'Could not determine journey ID. Try using Print instead.';
          pdfButton.disabled = false;
          return;
      }
      
      // Call the server-side PDF export endpoint
      fetch(`/api/export-pdf/${journeyId}`)
          .then(response => {
              if (!response.ok) {
                  return response.json().then(data => {
                      throw new Error(data.error || 'Failed to generate PDF');
                  });
              }
              return response.blob();
          })
          .then(blob => {
              // Create a download link for the PDF
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.style.display = 'none';
              a.href = url;
              a.download = `journey_map_${journeyId}.pdf`;
              document.body.appendChild(a);
              a.click();
              
              // Clean up
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              feedback.textContent = 'PDF downloaded successfully';
              setTimeout(() => {
                  feedback.textContent = '';
              }, 3000);
          })
          .catch(error => {
              console.error('PDF export error:', error);
              feedback.textContent = 'PDF generation failed. Try using the Print button instead.';
              
              // Offer print as fallback
              setTimeout(() => {
                  if (confirm('Server-side PDF generation failed. Would you like to use browser print dialog instead?')) {
                      printJourneyMap();
                  }
              }, 500);
          })
          .finally(() => {
              pdfButton.disabled = false;
          });
  }
}

/**
* Print the journey map using the browser's print dialog
*/
function printJourneyMap() {
  const feedback = document.getElementById('export-feedback');
  if (feedback) {
      feedback.textContent = 'Preparing print view...';
  }
  
  // Fix the journey timeline layout for printing
  prepareJourneyForPrint();
  
  // Hide the export panel during printing
  const exportPanel = document.querySelector('.export-panel');
  if (exportPanel) {
      exportPanel.style.display = 'none';
  }
  
  // Add comprehensive print styles
  if (!document.getElementById('print-styles')) {
      const printStyles = document.createElement('style');
      printStyles.id = 'print-styles';
      printStyles.textContent = `
          @page {
              size: landscape;
              margin: 0.5cm;
          }
          @media print {
              html, body {
                  width: 100%;
                  height: auto;
                  overflow: visible !important;
              }
              body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
              }
              .container {
                  max-width: 100% !important;
                  width: 100% !important;
                  padding: 0.5cm !important;
                  overflow: visible !important;
              }
              .journey-map {
                  page-break-inside: avoid;
                  width: 100% !important;
                  overflow: visible !important;
              }
              .journey-timeline {
                  display: flex !important;
                  flex-direction: row !important;
                  flex-wrap: nowrap !important;
                  justify-content: space-between !important;
                  width: 100% !important;
                  min-width: unset !important;
                  overflow: visible !important;
                  transform: none !important;
              }
              .journey-stage {
                  flex: 1 !important;
                  width: auto !important;
                  min-width: 0 !important;
                  page-break-inside: avoid;
              }
              .export-panel, .export-controls, .export-btn {
                  display: none !important;
              }
              * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
              }
          }
      `;
      document.head.appendChild(printStyles);
  }
  
  // Update feedback and open print dialog
  if (feedback) feedback.textContent = 'Opening print dialog...';
  
  // Print the page
  setTimeout(() => {
      window.print();
      
      // Show the export panel again after a delay
      setTimeout(() => {
          if (exportPanel) {
              exportPanel.style.display = 'block';
          }
          if (feedback) {
              feedback.textContent = '';
          }
          
          // Restore journey layout if needed
          restoreJourneyAfterPrint();
      }, 1000);
  }, 100);
}

/**
* Prepare the journey map for optimal printing
*/
function prepareJourneyForPrint() {
  // Store original styles
  const timeline = document.querySelector('.journey-timeline');
  if (timeline) {
      // Save original styles for restoration
      timeline.dataset.originalMinWidth = timeline.style.minWidth || '';
      timeline.dataset.originalOverflow = timeline.style.overflowX || '';
      timeline.dataset.originalDisplay = timeline.style.display || '';
      timeline.dataset.originalTransform = timeline.style.transform || '';
      
      // Apply print-friendly styles
      timeline.style.minWidth = 'unset';
      timeline.style.overflowX = 'visible';
      timeline.style.display = 'flex';
      timeline.style.flexDirection = 'row';
      timeline.style.justifyContent = 'space-between';
      timeline.style.transform = 'none';
      timeline.style.width = '100%';
      
      // Fix individual journey stages
      const stages = timeline.querySelectorAll('.journey-stage');
      stages.forEach(stage => {
          stage.dataset.originalWidth = stage.style.width || '';
          stage.dataset.originalMinWidth = stage.style.minWidth || '';
          
          stage.style.width = 'auto';
          stage.style.minWidth = '0';
          stage.style.flex = '1';
      });
  }
  
  // Fix container width if needed
  const container = document.querySelector('.container');
  if (container) {
      container.dataset.originalMaxWidth = container.style.maxWidth || '';
      container.dataset.originalWidth = container.style.width || '';
      container.dataset.originalOverflow = container.style.overflow || '';
      
      container.style.maxWidth = '100%';
      container.style.width = '100%';
      container.style.overflow = 'visible';
  }
}

/**
* Restore original styles after printing
*/
function restoreJourneyAfterPrint() {
  const timeline = document.querySelector('.journey-timeline');
  if (timeline) {
      // Restore original styles
      timeline.style.minWidth = timeline.dataset.originalMinWidth || '';
      timeline.style.overflowX = timeline.dataset.originalOverflow || '';
      timeline.style.display = timeline.dataset.originalDisplay || '';
      timeline.style.transform = timeline.dataset.originalTransform || '';
      
      // Restore stage styles
      const stages = timeline.querySelectorAll('.journey-stage');
      stages.forEach(stage => {
          stage.style.width = stage.dataset.originalWidth || '';
          stage.style.minWidth = stage.dataset.originalMinWidth || '';
          stage.style.flex = '';
      });
  }
  
  // Restore container styles
  const container = document.querySelector('.container');
  if (container) {
      container.style.maxWidth = container.dataset.originalMaxWidth || '';
      container.style.width = container.dataset.originalWidth || '';
      container.style.overflow = container.dataset.originalOverflow || '';
  }
}

/**
* Export the journey map as a PNG image
* Enhanced to capture the entire horizontal journey map
*/
function exportToPNG() {
  const feedback = document.getElementById('export-feedback');
  const pngButton = document.getElementById('export-png');
  
  if (feedback && pngButton) {
      feedback.textContent = 'Preparing image capture...';
      pngButton.disabled = true;
      
      // Check if html2canvas is available, if not load it
      if (typeof html2canvas === 'undefined') {
          feedback.textContent = 'Loading image capture library...';
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
              .then(() => {
                  feedback.textContent = 'Preparing journey map...';
                  prepareAndCaptureImage();
              })
              .catch(error => {
                  console.error('Failed to load html2canvas:', error);
                  feedback.textContent = 'Image capture failed. Could not load library.';
                  pngButton.disabled = false;
              });
      } else {
          feedback.textContent = 'Preparing journey map...';
          prepareAndCaptureImage();
      }
  }
}

/**
* Prepare the journey map for capture and then capture it
*/
function prepareAndCaptureImage() {
  const feedback = document.getElementById('export-feedback');
  const pngButton = document.getElementById('export-png');
  
  // Save original element styles for restoration
  const originalStyles = saveOriginalStyles();
  
  // Fix layout for capture - apply print-like styling
  prepareJourneyForImageCapture();
  
  // Hide export controls
  const exportPanel = document.querySelector('.export-panel');
  if (exportPanel) {
      exportPanel.style.display = 'none';
  }
  
  // Wait for layout adjustments to take effect
  setTimeout(() => {
      if (feedback) feedback.textContent = 'Capturing image...';
      
      // Determine the target element to capture
      const targetElement = document.querySelector('.container') || 
                           document.querySelector('.journey-map') || 
                           document.body;
      
      // Capture with html2canvas
      html2canvas(targetElement, {
          scale: 2, // Higher scale for better quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: targetElement.scrollWidth,
          windowHeight: targetElement.scrollHeight,
          onclone: function(clonedDoc) {
              // Further optimize the cloned document
              optimizeClonedDocument(clonedDoc);
          }
      }).then(canvas => {
          // Restore original styles
          restoreOriginalStyles(originalStyles);
          
          // Show export panel again
          if (exportPanel) {
              exportPanel.style.display = 'block';
          }
          
          // Get filename components
          const journeyId = extractJourneyId() || new Date().getTime();
          const titleElement = document.querySelector('.header h1');
          let title = titleElement ? titleElement.textContent.trim() : 'journey_map';
          title = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          
          // Save the image
          if (feedback) feedback.textContent = 'Saving image...';
          saveCanvasAsImage(canvas, title, journeyId);
          
      }).catch(error => {
          console.error('Error capturing image:', error);
          
          // Restore original styles
          restoreOriginalStyles(originalStyles);
          
          // Show export panel again
          if (exportPanel) {
              exportPanel.style.display = 'block';
          }
          
          if (feedback) {
              feedback.textContent = 'Image capture failed. Try using Print instead.';
          }
          
          if (pngButton) {
              pngButton.disabled = false;
          }
      });
  }, 300);
}

/**
* Save original styles of elements for later restoration
*/
function saveOriginalStyles() {
  const originalStyles = {
      timeline: {},
      stages: [],
      container: {}
  };
  
  // Save timeline styles
  const timeline = document.querySelector('.journey-timeline');
  if (timeline) {
      originalStyles.timeline = {
          minWidth: timeline.style.minWidth,
          overflowX: timeline.style.overflowX,
          display: timeline.style.display,
          transform: timeline.style.transform,
          width: timeline.style.width,
          flexDirection: timeline.style.flexDirection,
          justifyContent: timeline.style.justifyContent
      };
      
      // Save stage styles
      const stages = timeline.querySelectorAll('.journey-stage');
      stages.forEach((stage, index) => {
          originalStyles.stages.push({
              width: stage.style.width,
              minWidth: stage.style.minWidth,
              flex: stage.style.flex
          });
      });
  }
  
  // Save container styles
  const container = document.querySelector('.container');
  if (container) {
      originalStyles.container = {
          maxWidth: container.style.maxWidth,
          width: container.style.width,
          overflow: container.style.overflow,
          padding: container.style.padding
      };
  }
  
  return originalStyles;
}

/**
* Restore original styles after capture
*/
function restoreOriginalStyles(originalStyles) {
  // Restore timeline styles
  const timeline = document.querySelector('.journey-timeline');
  if (timeline && originalStyles.timeline) {
      timeline.style.minWidth = originalStyles.timeline.minWidth || '';
      timeline.style.overflowX = originalStyles.timeline.overflowX || '';
      timeline.style.display = originalStyles.timeline.display || '';
      timeline.style.transform = originalStyles.timeline.transform || '';
      timeline.style.width = originalStyles.timeline.width || '';
      timeline.style.flexDirection = originalStyles.timeline.flexDirection || '';
      timeline.style.justifyContent = originalStyles.timeline.justifyContent || '';
      
      // Restore stage styles
      const stages = timeline.querySelectorAll('.journey-stage');
      stages.forEach((stage, index) => {
          if (originalStyles.stages[index]) {
              stage.style.width = originalStyles.stages[index].width || '';
              stage.style.minWidth = originalStyles.stages[index].minWidth || '';
              stage.style.flex = originalStyles.stages[index].flex || '';
          }
      });
  }
  
  // Restore container styles
  const container = document.querySelector('.container');
  if (container && originalStyles.container) {
      container.style.maxWidth = originalStyles.container.maxWidth || '';
      container.style.width = originalStyles.container.width || '';
      container.style.overflow = originalStyles.container.overflow || '';
      container.style.padding = originalStyles.container.padding || '';
  }
}

/**
* Prepare the journey map for image capture
* This applies specific styles to ensure the entire journey is captured
*/
function prepareJourneyForImageCapture() {
  // Optimize the timeline element
  const timeline = document.querySelector('.journey-timeline');
  if (timeline) {
      timeline.style.minWidth = 'unset';
      timeline.style.overflowX = 'visible';
      timeline.style.display = 'flex';
      timeline.style.flexDirection = 'row';
      timeline.style.justifyContent = 'space-between';
      timeline.style.transform = 'none';
      timeline.style.width = '100%';
      
      // Fix journey stages
      const stages = timeline.querySelectorAll('.journey-stage');
      stages.forEach(stage => {
          stage.style.width = 'auto';
          stage.style.minWidth = '0';
          stage.style.flex = '1';
      });
  }
  
  // Optimize container
  const container = document.querySelector('.container');
  if (container) {
      container.style.maxWidth = '100%';
      container.style.width = '100%';
      container.style.overflow = 'visible';
      container.style.padding = '20px';
  }
  
  // Fix any overflow issues in the journey map
  const journeyMap = document.querySelector('.journey-map');
  if (journeyMap) {
      journeyMap.style.overflow = 'visible';
  }
}

/**
* Further optimize the cloned document for image capture
*/
function optimizeClonedDocument(clonedDoc) {
  // Remove export panel
  const clonedExportPanel = clonedDoc.querySelector('.export-panel');
  if (clonedExportPanel) {
      clonedExportPanel.remove();
  }
  
  // Optimize timeline display
  const timelineClone = clonedDoc.querySelector('.journey-timeline');
  if (timelineClone) {
      timelineClone.style.display = 'flex';
      timelineClone.style.flexDirection = 'row';
      timelineClone.style.justifyContent = 'space-between';
      timelineClone.style.width = '100%';
      timelineClone.style.minWidth = 'unset';
      timelineClone.style.overflowX = 'visible';
      timelineClone.style.transform = 'none';
      
      // Fix journey stages in the clone
      const stagesClone = timelineClone.querySelectorAll('.journey-stage');
      stagesClone.forEach(stage => {
          stage.style.flex = '1';
          stage.style.width = 'auto';
          stage.style.minWidth = '0';
      });
  }
  
  // Optimize container
  const containerClone = clonedDoc.querySelector('.container');
  if (containerClone) {
      containerClone.style.maxWidth = '100%';
      containerClone.style.width = '100%';
      containerClone.style.overflow = 'visible';
  }
  
  // Force all elements to have their backgrounds and colors
  const allElements = clonedDoc.querySelectorAll('*');
  allElements.forEach(el => {
      if (el.style) {
          el.style.webkitPrintColorAdjust = 'exact';
          el.style.printColorAdjust = 'exact';
          el.style.colorAdjust = 'exact';
      }
  });
}

/**
* Save canvas as an image file
*/
function saveCanvasAsImage(canvas, title, journeyId) {
  const feedback = document.getElementById('export-feedback');
  const pngButton = document.getElementById('export-png');
  
  try {
      // Primary method using toBlob
      canvas.toBlob(function(blob) {
          try {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.download = `${title}_${journeyId}.png`;
              link.href = url;
              link.click();
              
              // Clean up
              setTimeout(() => {
                  URL.revokeObjectURL(url);
              }, 1000);
              
              if (feedback) {
                  feedback.textContent = 'Image saved successfully';
                  setTimeout(() => { feedback.textContent = ''; }, 3000);
              }
              
              if (pngButton) pngButton.disabled = false;
          } catch (e) {
              console.error('Error in toBlob callback:', e);
              fallbackImageSave();
          }
      }, 'image/png', 1.0);
  } catch (error) {
      console.error('Error calling toBlob:', error);
      fallbackImageSave();
  }
  
  // Fallback method using dataURL
  function fallbackImageSave() {
      try {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `${title}_${journeyId}.png`;
          link.href = dataUrl;
          link.click();
          
          if (feedback) {
              feedback.textContent = 'Image saved (fallback method)';
              setTimeout(() => { feedback.textContent = ''; }, 3000);
          }
      } catch (fallbackError) {
          console.error('Fallback save method failed:', fallbackError);
          if (feedback) {
              feedback.textContent = 'Could not save image. Try using Print instead.';
          }
      }
      
      if (pngButton) pngButton.disabled = false;
  }
}

/**
* Load a script dynamically
* @param {string} src - The script URL
* @returns {Promise} - Resolves when the script is loaded
*/
function loadScript(src) {
  return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
  });
}

/**
* Extract journey ID from the current URL
* @returns {string|null} - The journey ID or null if not found
*/
function extractJourneyId() {
  const urlPath = window.location.pathname;
  const match = urlPath.match(/journey_map_([a-f0-9-]+)\.html/);
  return match ? match[1] : null;
}