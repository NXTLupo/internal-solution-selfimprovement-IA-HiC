import requests
import json
import logging
from typing import Dict, Any, List, Optional
import re
import os
import sys

# Add the project directory to the Python path to ensure imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
project_dir = os.path.dirname(parent_dir)

if project_dir not in sys.path:
    sys.path.insert(0, project_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from ..utils.prompts import CONVERSATION_PROMPT
except ImportError:
    try:
        from src.utils.prompts import CONVERSATION_PROMPT
    except ImportError:
        from utils.prompts import CONVERSATION_PROMPT

class ConversationInterface:
    """
    Provide conversational interface for interacting with the journey map
    """
    
    def __init__(self, model: str = "gemma:latest"):
        self.logger = logging.getLogger(__name__)
        self.model = model
        self.api_url = "http://localhost:11434/api/generate"
        # Log the API URL and model being used
        self.logger.info(f"Using model {self.model} at {self.api_url}")
    
    def process_input(self, user_input: str, journey_map: str, 
                     journey_insights: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process user input and generate a response
        
        Args:
            user_input: User's query or request
            journey_map: Current journey map HTML
            journey_insights: Journey insights data
            
        Returns:
            Dictionary containing response message and updated map if applicable
        """
        self.logger.info(f"Processing user input: {user_input}")
        
        # Extract journey data for context
        journey_name = journey_insights.get("journey_name", "Customer Journey")
        phases = journey_insights.get("phases", [])
        pain_points = journey_insights.get("pain_points", [])
        opportunities = journey_insights.get("opportunities", [])
        
        # Prepare journey data for LLM context
        journey_data = self._format_journey_data(journey_name, phases, pain_points, opportunities)
        
        # Create prompt for the LLM
        prompt = CONVERSATION_PROMPT.format(
            user_input=user_input,
            journey_data=journey_data
        )
        
        # Get LLM response
        response = self._get_llm_response(prompt)
        
        # Parse the response to check for visualization updates
        result = self._parse_response(response, journey_map, journey_insights)
        
        return result
    
    def _format_journey_data(self, journey_name: str, phases: List[Dict], 
                           pain_points: List[str], opportunities: List[str]) -> str:
        """Format journey data for LLM context"""
        
        data = f"Journey Name: {journey_name}\n\n"
        
        # Add phases
        data += "Phases:\n"
        for i, phase in enumerate(phases):
            phase_name = phase.get("name", f"Phase {i+1}")
            phase_desc = phase.get("description", "").strip()
            touchpoints = phase.get("touchpoints", [])
            
            data += f"{i+1}. {phase_name}\n"
            if phase_desc:
                data += f"   Description: {phase_desc}\n"
            
            if touchpoints:
                data += "   Touchpoints:\n"
                for tp in touchpoints:
                    tp_type = tp.get("type", "")
                    tp_desc = tp.get("description", "")
                    data += f"   - {tp_type}: {tp_desc}\n"
            
            data += "\n"
        
        # Add pain points
        if pain_points:
            data += "Pain Points:\n"
            for point in pain_points:
                data += f"- {point}\n"
            data += "\n"
        
        # Add opportunities
        if opportunities:
            data += "Opportunities:\n"
            for opp in opportunities:
                data += f"- {opp}\n"
            data += "\n"
        
        return data
    
    def _get_llm_response(self, prompt: str) -> str:
        """Send prompt to Ollama API and get response"""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }
        
        try:
            response = requests.post(self.api_url, json=payload)
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error calling Ollama API: {str(e)}")
            return f"Sorry, I encountered an error: {str(e)}"
    
    def _parse_response(self, response: str, journey_map: str, 
                       journey_insights: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse LLM response to extract message and check for visualization updates
        
        Returns a dictionary with:
        - message: The text response to show the user
        - updated_map: Modified journey map HTML if applicable
        """
        # Default result
        result = {
            "message": response,
            "updated_map": None
        }
        
        # Check if the response contains visualization update commands
        # These would be in a format like: [VISUALIZE: zoom-phase-2]
        visualization_commands = re.findall(r'\[VISUALIZE:\s*([^\]]+)\]', response)
        
        if visualization_commands:
            # Extract the plain text message (without visualization commands)
            result["message"] = re.sub(r'\[VISUALIZE:\s*[^\]]+\]', '', response).strip()
            
            # Process visualization commands
            updated_map = journey_map
            
            for command in visualization_commands:
                command = command.strip().lower()
                
                # Handle different commands - these modify the HTML/JS
                if command.startswith("zoom-phase-"):
                    try:
                        phase_num = int(command.split("-")[-1])
                        # Add JavaScript to zoom to specific phase
                        zoom_script = f"""
                        <script>
                            document.addEventListener('DOMContentLoaded', function() {{
                                // Highlight the requested phase
                                const phases = document.querySelectorAll('.phase');
                                phases.forEach(p => p.style.opacity = '0.5');
                                const selectedPhase = document.querySelector('.phase[data-phase="{phase_num-1}"]');
                                if (selectedPhase) {{
                                    selectedPhase.style.opacity = '1';
                                    selectedPhase.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
                                }}
                            }});
                        </script>
                        </body>
                        """
                        # Replace closing body tag with our script
                        updated_map = updated_map.replace("</body>", zoom_script)
                    except:
                        self.logger.error(f"Failed to process zoom command: {command}")
                
                elif command == "highlight-pain-points":
                    # Add JavaScript to highlight pain points
                    highlight_script = """
                    <script>
                        document.addEventListener('DOMContentLoaded', function() {
                            // Highlight pain points
                            const painPoints = document.querySelector('.pain-points');
                            if (painPoints) {
                                painPoints.style.animation = 'highlight 2s';
                                painPoints.style.backgroundColor = '#fff0f0';
                                painPoints.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        });
                    </script>
                    <style>
                        @keyframes highlight {
                            0% { background-color: #fff; }
                            50% { background-color: #ffe6e6; }
                            100% { background-color: #fff0f0; }
                        }
                    </style>
                    </body>
                    """
                    updated_map = updated_map.replace("</body>", highlight_script)
                
                elif command == "highlight-opportunities":
                    # Add JavaScript to highlight opportunities
                    highlight_script = """
                    <script>
                        document.addEventListener('DOMContentLoaded', function() {
                            // Highlight opportunities
                            const opportunities = document.querySelector('.opportunities');
                            if (opportunities) {
                                opportunities.style.animation = 'highlight 2s';
                                opportunities.style.backgroundColor = '#f0fff0';
                                opportunities.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        });
                    </script>
                    <style>
                        @keyframes highlight {
                            0% { background-color: #fff; }
                            50% { background-color: #e6ffe6; }
                            100% { background-color: #f0fff0; }
                        }
                    </style>
                    </body>
                    """
                    updated_map = updated_map.replace("</body>", highlight_script)
            
            result["updated_map"] = updated_map
        
        return result