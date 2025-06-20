# AI Journey Mapper

An advanced tool for generating interactive customer journey maps from various data sources using Anthropic's Claude 3.7 Sonnet LLM with sophisticated chain-of-thought processing.

## Update! 

### ✨ **New Claude Sonnet 4 Integration**
- **🆕 Claude 4 Journey Mapper**: Complete new service utilizing Claude Sonnet 4's advanced reasoning capabilities
- **🔍 Extended Thinking Mode**: 200K token analysis for comprehensive data examination and pattern recognition
- **📊 Enhanced Journey Analysis**: Multi-stage systematic investigation with evidence-based insights
- **🎯 Investigative Approach**: Deep data mining and sophisticated insight extraction

## Features

- **Data Processing**: Upload and analyze multiple data formats (PDF, CSV, TXT, JSON)
- **AI-Powered Analysis**: Deep data analysis using Anthropic Claude 3.7 Sonnet
- **Multi-Pass Journey Mapping**: Two-stage analysis for more accurate journey maps
- **Interactive Visualizations**: HTML-based dynamic journey maps
- **Chain of Thought**: Explicit reasoning and evidence-based journey insights
- **Direct Evidence Capture**: Quotes and citations from source data
- **Export Options**: Export journey maps to PDF and PNG
- **Responsive Design**: Works across desktop and mobile devices

## Technology Stack

- **Backend**: Python with FastAPI framework
- **Frontend**: React/JavaScript for the UI
- **AI**: Anthropic Claude 3.7 Sonnet API integration
- **Data Processing**: pandas, pypdf, scikit-learn, spacy
- **Visualization**: HTML/CSS/JavaScript with responsive design

## Chain of Thought Processing

The application uses a sophisticated dual-pass analysis technique:

1. **First Analysis Pass**:
   - Processes input data across formats
   - Identifies journey stages from evidence
   - Maps emotions, activities, pain points and opportunities
   - Creates an initial journey map

2. **Second Analysis Pass**:
   - Analyzes the first map output critically
   - Refines journey stages with deeper insights
   - Enhances visualization with more specific metrics
   - Generates improved HTML visualization with evidence

3. **Evidence Collection**:
   - Extracts direct quotes from source data
   - Includes citations for all insights
   - Uses formatted blockquotes to distinguish evidence

## Quick Start

### Prerequisites

- Python 3.9+
- Anthropic API key (for Claude 3.7)
- wkhtmltopdf (optional, for PDF export)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/internal-solutions-journeymapper.git
cd internal-solutions-journeymapper
```

2. Set up a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

### Starting the Application

The app provides multiple startup methods:

**Using run.py (Recommended)**:
```bash
python run.py
```
This script will:
- Find an available port (tries 8080, 5000, 3000, 9000)
- Prompt for Anthropic API key if not set
- Create necessary directories
- Start the FastAPI server

**Using start.sh (Unix/Mac)**:
```bash
./start.sh
```
Features more robust port management and dependency checking.

Once started, open your browser and navigate to `http://localhost:<PORT>` where `<PORT>` is the port displayed in the console.

## Implementation Details

### AI Analysis Engine

The `DynamicJourneyMapper` class in `src/ai_analysis/dynamic_journey_mapper.py` is the core of the application:

- Uses explicit prompting for Claude 3.7's extended thinking mode
- Implements a two-pass analysis approach to deepen insights
- Handles HTML generation, validation, and fallback options
- Extracts journey insights from source data with evidence
- Creates responsive, interactive HTML visualizations

### Data Ingestion

The application processes multiple data formats:
- PDFs (academic papers, reports)
- CSV files (survey data, metrics)
- Text files (interview transcripts)
- JSON data (structured data)

### Visualization

Journey maps are generated as standalone HTML documents with:
- Responsive design with CSS Grid and Flexbox
- Interactive elements with vanilla JavaScript
- Evidence-based insights with direct quotes
- Visualization of emotional states, pain points, and opportunities

## Troubleshooting

- **API Key Issues**: Ensure your Anthropic API key is correctly set
- **Port Conflicts**: Use `force_kill_ports.sh` to free up ports if needed
- **Missing Dependencies**: Run `pip install -r requirements.txt` to install all dependencies
- **Export Problems**: Install wkhtmltopdf for PDF functionality

## Extending the Application

You can extend the application by:
1. Adding new data processors in `src/data_ingestion/`
2. Creating custom journey map templates
3. Enhancing the prompt templates for specific industries
4. Adding new visualization options

## License

MIT

## Acknowledgments

This project uses:
- Anthropic's Claude 3.7 Sonnet for AI-powered journey analysis
- FastAPI for the backend framework
- React for the frontend components
- Various open-source libraries and tools
