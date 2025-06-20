#!/bin/bash

# Create the necessary directory structure
mkdir -p static/js
mkdir -p static/css

# Copy the styles.css file to the static/css directory
cp src/styles.css static/css/styles.css

# Create necessary directories for API modules
mkdir -p src/data_ingestion src/ai_analysis src/utils src/visualization src/conversation

# Create placeholder files if they don't exist
touch src/data_ingestion/__init__.py
touch src/ai_analysis/__init__.py
touch src/utils/__init__.py
touch src/visualization/__init__.py
touch src/conversation/__init__.py

touch src/data_ingestion/processor.py
touch src/ai_analysis/analyzer.py
touch src/utils/logger.py
touch src/conversation/interface.py

# Set up basic module structure in case they're missing
if [ ! -s src/data_ingestion/processor.py ]; then
  echo 'class DataProcessor:
    def process_files(self, files):
        # Mock implementation
        return {"structured": [], "unstructured": [], "metadata": {"file_types": {}}}' > src/data_ingestion/processor.py
fi

if [ ! -s src/ai_analysis/analyzer.py ]; then
  echo 'class JourneyAnalyzer:
    def __init__(self, model="gemma:latest"):
        self.model = model
        
    def analyze(self, data):
        # Mock implementation for testing
        return {
            "journey_name": "Customer Onboarding Journey",
            "summary": "This journey follows customers from initial product research through browsing, evaluation, purchase, delivery, and post-purchase support.",
            "phases": [
                {
                    "name": "Research & Discovery",
                    "description": "Customers begin their journey by searching for products online through various channels.",
                    "touchpoints": [
                        {"type": "Search Engine", "description": "Finding the website through Google search"},
                        {"type": "Social Media", "description": "Discovering through reviews on social platforms"}
                    ],
                    "emotions": [{"type": "Optimistic", "value": 75}]
                },
                {
                    "name": "Product Browsing",
                    "description": "Customers navigate the website categories to find products matching their criteria.",
                    "touchpoints": [
                        {"type": "Category Navigation", "description": "Browsing through product categories"},
                        {"type": "Product Filtering", "description": "Using filters to narrow down products"}
                    ],
                    "emotions": [{"type": "Frustrated", "value": 40}]
                }
            ],
            "pain_points": [
                "The checkout process is a major friction point with multiple issues",
                "Product filtering and search functionality makes finding products difficult"
            ],
            "opportunities": [
                "Streamline the checkout process with guest checkout option",
                "Enhance product discovery with better filtering and search"
            ]
        }' > src/ai_analysis/analyzer.py
fi

if [ ! -s src/utils/logger.py ]; then
  echo 'import logging

def setup_logger(name="journey_mapper", level=logging.INFO):
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Create handler if none exists
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger' > src/utils/logger.py
fi

if [ ! -s src/conversation/interface.py ]; then
  echo 'class ConversationInterface:
    def __init__(self, model="gemma:latest"):
        self.model = model
    
    def process_input(self, user_input, journey_map, journey_insights):
        # Mock implementation
        return {
            "message": "I\'ve analyzed the journey map. The checkout process appears to be a significant pain point with low satisfaction scores.",
            "updated_map": journey_map  # Return unchanged for now
        }' > src/conversation/interface.py
fi

# Install dependencies
npm install

# Build the frontend
npm run build

echo "Frontend setup complete!"
echo "Run 'npm run dev' to start webpack in watch mode"
echo "Run 'python src/flask_app.py' to start the Flask server"