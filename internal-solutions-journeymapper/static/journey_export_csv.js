/**
 * journey_export_csv.js
 * CSV-only export functionality for AI Journey Mapper
 * FigJam-compatible format where each CSV cell becomes a sticky note
 */

class JourneyCSVExport {
    constructor() {
        this.init();
    }

    init() {
        // If the document is not fully loaded, wait for it
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupExport());
        } else {
            this.setupExport();
        }
    }
    
    setupExport() {
        // Wait a moment for the editor to initialize
        setTimeout(() => {
            // Check if the editor's control container exists
            const editorControlContainer = document.getElementById('journey-controls-container');
            
            if (editorControlContainer) {
                // If the editor is loaded, integrate with it
                this.integrateWithEditor(editorControlContainer);
            } else {
                // If the editor is not loaded, create a standalone button
                this.createStandaloneButton();
            }
        }, 500);
    }

    integrateWithEditor(controlContainer) {
        // Remove any existing export button in the editor
        const existingButton = document.getElementById('export-csv-btn');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Create export button
        const exportButton = document.createElement('button');
        exportButton.id = 'export-csv-btn';
        exportButton.className = 'journey-control-btn journey-csv-btn';
        exportButton.innerHTML = '📋 Export CSV';
        exportButton.style.cssText = `
            background: #16a34a;
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
        
        // Make the export button more prominent by placing it as the first child
        controlContainer.prepend(exportButton);
        
        // Add event listener
        exportButton.addEventListener('click', () => {
            this.exportJourneyToCSV();
        });
    }
    
    createStandaloneButton() {
        // If standalone export button already exists, don't add another
        if (document.getElementById('standalone-export-csv-btn')) {
            return;
        }
        
        // Create a floating export button
        const exportButton = document.createElement('button');
        exportButton.id = 'standalone-export-csv-btn';
        exportButton.className = 'journey-export-btn';
        exportButton.innerHTML = '📋 Export CSV';
        exportButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: #16a34a;
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
        document.body.appendChild(exportButton);

        // Add style for notification
        const style = document.createElement('style');
        style.id = 'journey-export-styles';
        style.textContent = `
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

        // Add event listener
        exportButton.addEventListener('click', () => {
            this.exportJourneyToCSV();
        });
    }

    /**
     * Export the journey map to CSV format for FigJam integration
     * Following the same pattern as HiC Research system
     */
    exportJourneyToCSV() {
        try {
            // Extract journey map data
            const journeyData = this.extractJourneyData();
            
            if (!journeyData) {
                this.showNotification('Could not extract journey data', 'error');
                return;
            }
            
            // Generate CSV content
            const csvContent = this.formatJourneyAsCSV(journeyData);
            
            // Download the CSV file
            this.downloadCSV(csvContent, `journey_map_${window.journeyMapId || 'export'}.csv`);
            
            this.showNotification('Journey map exported as CSV');
            
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            this.showNotification('Error exporting to CSV', 'error');
        }
    }

    extractJourneyData() {
        const journeyData = {
            title: document.querySelector('h1, .journey-title')?.textContent?.trim() || 'Journey Map',
            stages: [],
            insights: [],
            painPoints: [],
            opportunities: [],
            recommendations: [],
            themes: [],
            touchpoints: [],
            personas: [],
            quotes: [],
            keyConcepts: []
        };
        
        // Extract stages
        const stageElements = document.querySelectorAll('.journey-stage, .stage-card');
        stageElements.forEach((stage, index) => {
            const stageTitle = stage.querySelector('.stage-title, .stage-header h3')?.textContent?.trim() || `Stage ${index + 1}`;
            const stageDescription = stage.querySelector('.stage-description')?.textContent?.trim() || '';
            
            // Extract pain points from this stage
            const painPoints = [];
            const painPointElements = stage.querySelectorAll('.pain-point, .pain-point-item');
            painPointElements.forEach(pp => {
                const text = pp.textContent.trim();
                if (text) {
                    painPoints.push({
                        stage: stageTitle,
                        text: text,
                        type: 'Pain Point'
                    });
                }
            });
            
            // Extract opportunities from this stage
            const opportunities = [];
            const opportunityElements = stage.querySelectorAll('.opportunity, .opportunity-item');
            opportunityElements.forEach(op => {
                const text = op.textContent.trim();
                if (text) {
                    opportunities.push({
                        stage: stageTitle,
                        text: text,
                        type: 'Opportunity'
                    });
                }
            });
            
            // Add stage to the list
            journeyData.stages.push({
                title: stageTitle,
                description: stageDescription,
                index: index + 1
            });
            
            // Add to the master lists
            journeyData.painPoints = journeyData.painPoints.concat(painPoints);
            journeyData.opportunities = journeyData.opportunities.concat(opportunities);
        });
        
        // Extract insights (both from insight panels and insight cards)
        const insightElements = document.querySelectorAll('.insight-card, .insight');
        insightElements.forEach((insight, index) => {
            const insightTitle = insight.querySelector('.insight-title')?.textContent?.trim() || `Insight ${index + 1}`;
            const insightDescription = insight.querySelector('.insight-description')?.textContent?.trim() || '';
            const insightLabel = insight.querySelector('.insight-label')?.textContent?.trim() || '';
            const insightQuote = insight.querySelector('.quote-text')?.textContent?.trim() || '';
            const insightCitation = insight.querySelector('.quote-citation')?.textContent?.trim() || '';
            
            journeyData.insights.push({
                title: insightTitle,
                description: insightDescription,
                label: insightLabel,
                quote: insightQuote,
                citation: insightCitation,
                index: index + 1
            });
            
            // Add quotes if they exist
            if (insightQuote) {
                journeyData.quotes.push({
                    text: insightQuote,
                    citation: insightCitation,
                    context: insightTitle
                });
            }
        });
        
        // Extract recommendations from recommendation lists
        const recommendationElements = document.querySelectorAll('.recommendation, .recommendation-item');
        recommendationElements.forEach((rec, index) => {
            const text = rec.textContent.trim();
            if (text) {
                journeyData.recommendations.push({
                    text: text,
                    index: index + 1
                });
            }
        });
        
        // Extract themes
        const themeElements = document.querySelectorAll('.theme, .theme-card, .key-theme');
        themeElements.forEach((theme, index) => {
            const themeTitle = theme.querySelector('h3, h4')?.textContent?.trim() || theme.textContent.trim() || `Theme ${index + 1}`;
            const themeDescription = theme.querySelector('p')?.textContent?.trim() || '';
            
            journeyData.themes.push({
                title: themeTitle,
                description: themeDescription,
                index: index + 1
            });
        });
        
        // Extract touchpoints
        const touchpointElements = document.querySelectorAll('.touchpoint, .touchpoint-item');
        touchpointElements.forEach((touchpoint, index) => {
            const text = touchpoint.textContent.trim();
            if (text) {
                journeyData.touchpoints.push({
                    text: text,
                    index: index + 1
                });
            }
        });
        
        // Extract personas or user profiles
        const personaElements = document.querySelectorAll('.persona, .persona-card, .user-profile');
        personaElements.forEach((persona, index) => {
            const personaTitle = persona.querySelector('h3, h4')?.textContent?.trim() || `Persona ${index + 1}`;
            const personaDescription = persona.querySelector('p')?.textContent?.trim() || '';
            
            journeyData.personas.push({
                title: personaTitle,
                description: personaDescription,
                index: index + 1
            });
        });
        
        // Extract key concepts or findings
        const conceptElements = document.querySelectorAll('.key-concept, .finding, .key-finding');
        conceptElements.forEach((concept, index) => {
            const conceptTitle = concept.querySelector('h3, h4')?.textContent?.trim() || concept.textContent.trim() || `Key Concept ${index + 1}`;
            const conceptDescription = concept.querySelector('p')?.textContent?.trim() || '';
            
            journeyData.keyConcepts.push({
                title: conceptTitle,
                description: conceptDescription,
                index: index + 1
            });
        });
        
        // Handle any standalone pain points or opportunities not in stages
        document.querySelectorAll('.pain-point, .pain-point-item').forEach(pp => {
            // Skip if already counted within a stage
            const isInStage = pp.closest('.journey-stage, .stage-card');
            if (!isInStage) {
                const text = pp.textContent.trim();
                if (text) {
                    journeyData.painPoints.push({
                        stage: 'General',
                        text: text,
                        type: 'Pain Point'
                    });
                }
            }
        });
        
        document.querySelectorAll('.opportunity, .opportunity-item').forEach(op => {
            // Skip if already counted within a stage
            const isInStage = op.closest('.journey-stage, .stage-card');
            if (!isInStage) {
                const text = op.textContent.trim();
                if (text) {
                    journeyData.opportunities.push({
                        stage: 'General',
                        text: text,
                        type: 'Opportunity'
                    });
                }
            }
        });
        
        return journeyData;
    }

    formatJourneyAsCSV(journeyData) {
        // Following FigJam-compatible format
        
        // Create CSV headers
        const headers = [
            'Type',
            'Title/Name',
            'Description/Content',
            'Stage/Category',
            'Priority'
        ];
        
        // Create rows for each data type
        const rows = [];
        
        // Journey title
        rows.push([
            'Journey Map',
            journeyData.title,
            'Created with AI Journey Mapper',
            '',
            'High'
        ]);
        
        // Stages
        journeyData.stages.forEach(stage => {
            rows.push([
                'Stage',
                stage.title,
                stage.description,
                `Stage ${stage.index}`,
                'High'
            ]);
        });
        
        // Insights (more detailed now with quotes)
        journeyData.insights.forEach(insight => {
            let description = insight.description;
            if (insight.quote) {
                description += '\n\nQuote: "' + insight.quote + '"';
                if (insight.citation) {
                    description += '\nSource: ' + insight.citation;
                }
            }
            
            rows.push([
                insight.label || 'Insight',
                insight.title,
                description,
                '',
                'Medium'
            ]);
        });
        
        // Key Themes
        journeyData.themes.forEach(theme => {
            rows.push([
                'Theme',
                theme.title,
                theme.description,
                '',
                'High'
            ]);
        });
        
        // Key Concepts/Findings
        journeyData.keyConcepts.forEach(concept => {
            rows.push([
                'Key Finding',
                concept.title,
                concept.description,
                '',
                'High'
            ]);
        });
        
        // Pain Points
        journeyData.painPoints.forEach(point => {
            rows.push([
                'Pain Point',
                point.text,
                '',
                point.stage,
                'High'
            ]);
        });
        
        // Opportunities
        journeyData.opportunities.forEach(opp => {
            rows.push([
                'Opportunity',
                opp.text,
                '',
                opp.stage,
                'Medium'
            ]);
        });
        
        // Recommendations
        journeyData.recommendations.forEach(rec => {
            rows.push([
                'Recommendation',
                rec.text,
                '',
                '',
                'High'
            ]);
        });
        
        // Touchpoints
        journeyData.touchpoints.forEach(touchpoint => {
            rows.push([
                'Touchpoint',
                touchpoint.text,
                '',
                '',
                'Medium'
            ]);
        });
        
        // Personas
        journeyData.personas.forEach(persona => {
            rows.push([
                'Persona',
                persona.title,
                persona.description,
                '',
                'Medium'
            ]);
        });
        
        // Quotes (standalone)
        journeyData.quotes.forEach(quote => {
            if (quote.text && !rows.some(row => row[1] === quote.text)) {
                rows.push([
                    'Quote',
                    quote.text,
                    quote.citation || '',
                    quote.context || '',
                    'Low'
                ]);
            }
        });
        
        // Convert to CSV string
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
            .join('\n');
        
        return csvContent;
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            this.showNotification('Browser does not support direct download', 'error');
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
}

// Initialize exporter immediately
const journeyExporter = new JourneyCSVExport();