import os
import sys
import json
import logging
import re
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional, Union

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from claude4_api_wrapper import claude4_api_call

# Import vector store functionality if available
try:
    from src.utils.vector_store import init_vector_store
    from src.data_ingestion.data_processor import DataProcessor
except ImportError:
    # Handle relative imports when running from different locations
    try:
        from utils.vector_store import init_vector_store
        from data_ingestion.data_processor import DataProcessor
    except ImportError:
        # Fallback if imports fail
        init_vector_store = None
        DataProcessor = None

def add_context_section(context_text):
    """Helper function to add context section header to avoid f-string escape issues"""
    return "ADDITIONAL CONTEXT FROM VECTOR SEARCH:\n" + context_text + "\n"

# Constants for API limits - Claude models
CLAUDE_MAX_INPUT_TOKENS = 200000  # Claude 4 allows up to 200K tokens input
CLAUDE_MAX_OUTPUT_TOKENS = 64000  # Maximum for Claude 4
CLAUDE_MAX_DETAILED_ITEMS = 15    # Maximum number of detailed items to include in data

class DynamicJourneyMapper:
    def __init__(self, anthropic_model=None, debug_mode=True, use_rag=True):
        # Use environment variable or default to the Claude 4 Sonnet model
        self.anthropic_model = anthropic_model or os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        self.debug_mode = debug_mode
        self.logger = logging.getLogger(__name__)
        self.use_rag = use_rag
        
        # Create logs directory if it doesn't exist
        os.makedirs("logs", exist_ok=True)
        
        # Initialize vector store and data processor if available
        self.vector_store = None
        self.data_processor = None
        
        if use_rag:
            try:
                if init_vector_store is not None:
                    self.vector_store = init_vector_store()
                    self.logger.info("Vector store initialized for RAG capabilities")
                
                if DataProcessor is not None:
                    # Initialize with default parameters to avoid type errors
                    self.data_processor = DataProcessor()
                    self.logger.info("Data processor initialized for RAG processing")
            except Exception as e:
                self.logger.warning(f"RAG initialization failed: {str(e)}")
                self.use_rag = False
    
    def generate_journey_map(self, data):
        """
        Generate a journey map visualization using Claude 4 API.
        Then perform deeper analysis and generate an improved version.
        """
        try:
            # Log debugging info
            self.logger.debug("=========== STARTING JOURNEY MAP GENERATION ===========")
            print("\n========== JOURNEY MAP GENERATION PROCESS STARTED ==========")
            self.logger.info("[DEBUG] Starting journey map generation with model: " + self.anthropic_model)
            
            # Get journey info from data
            self.logger.debug("Extracting journey information from data...")
            print("=> Step 1: Extracting journey information (title, description, type)...")
            title, description, journey_type = self._extract_journey_info(data)
            print(f"   - Journey title: {title}")
            print(f"   - Journey type: {journey_type}")
            
            # Process the data for journey mapping
            self.logger.debug("Starting data preprocessing...")
            print("=> Step 2: Preprocessing data for journey mapping...")
            processed_data = self._preprocess_data(data)
            self.logger.info("[DEBUG] Processing dictionary data")
            print("   - Data preprocessing complete")
            
            # Extract insights from the data
            self.logger.debug("Extracting journey insights from data...")
            print("=> Step 3: Extracting key journey insights...")
            journey_insights = self._extract_journey_insights(processed_data)
            
            # Print some insights for debugging
            print(f"   - Identified {len(journey_insights.get('stages', []))} journey stages")
            print(f"   - Found {len(journey_insights.get('pain_points', []))} pain points")
            print(f"   - Discovered {len(journey_insights.get('opportunities', []))} opportunities")
            
            # Prepare the prompt for Claude
            self.logger.debug("Creating effective prompt for Claude...")
            print("=> Step 4: Creating optimized prompt for Claude 4...")
            prompt = self._create_prompt(title, description, journey_type, processed_data, journey_insights)
            print("   - Prompt created with advanced journey mapping instructions")
            
            # Print prompt summary (truncated) for debugging
            prompt_preview = prompt[:500] + "..." if len(prompt) > 500 else prompt
            self.logger.debug(f"Prompt preview: {prompt_preview}")
            
            # Save the prompt for debugging
            debug_id = datetime.now().strftime("%Y%m%d_%H%M%S")
            debug_file = f"{debug_id}_debug.json"
            self._save_debug_info(debug_file, "Created effective prompt", prompt[:1000])
            self.logger.info("[DEBUG] Created effective prompt")
            
            # Call Claude API for first journey map
            self.logger.debug("Calling Anthropic Claude 4 API...")
            print("=> Step 5: Calling Anthropic Claude 4 API for first-pass journey map...")
            print(f"   - Using model: {self.anthropic_model}")
            print("   - This may take a minute or two...")
            # Save full prompt for inspection
            with open(f"logs/full_prompt_{debug_id}.txt", "w") as f:
                # Ensure we're writing a string to the file
                if isinstance(prompt, str):
                    f.write(prompt)
                else:
                    f.write(str(prompt))
            print(f"   - Saved full prompt to logs/full_prompt_{debug_id}.txt for inspection")
            html_content = self._call_anthropic_api(prompt)
            print("   - Received response from Claude API")
            
            # Validate and fix the HTML
            self.logger.debug("Validating and fixing HTML content...")
            print("=> Step 6: Validating and fixing HTML content...")
            valid_html = self._validate_and_fix_html(html_content)
            if valid_html:
                print("   - HTML content validated successfully")
            else:
                print("   - HTML validation failed, will attempt to fix or retry")
            
            if not valid_html:
                # Retry with more explicit instructions
                self.logger.warning("Generated HTML failed validation, retrying with clearer instructions")
                print("=> Step 6a: First HTML validation failed, retrying with clearer instructions...")
                retry_prompt = self._create_retry_prompt(prompt, html_content)
                print("   - Created retry prompt with more explicit HTML requirements")
                print("   - Calling Anthropic API again...")
                retry_html = self._call_anthropic_api(retry_prompt)
                print("   - Received retry response from Claude API")
                valid_html = self._validate_and_fix_html(retry_html)
                print(f"   - Retry HTML validation {'succeeded' if valid_html else 'failed'}")
                
                if not valid_html:
                    self.logger.error("Generated HTML failed validation after retry")
                    print("=> Step 6b: HTML validation failed after retry, using fallback template...")
                    # Use the fallback template if all else fails
                    valid_html = self._create_fallback_html(title, description, journey_type, journey_insights)
                    print("   - Created fallback HTML template")
            
            # Extract the journey stages, insights, and structure from the first journey map
            self.logger.debug("Extracting journey information from first-pass HTML...")
            print("=> Step 7: Extracting journey information from first-pass HTML...")
            first_journey_insights = self._extract_journey_from_html(valid_html)
            print(f"   - Extracted {len(first_journey_insights.get('stages', []))} journey stages")
            print(f"   - Found {len(first_journey_insights.get('insights', []))} key insights")
            
            # Create a second-pass prompt for deeper analysis
            self.logger.debug("Creating second-pass prompt for deeper analysis...")
            print("=> Step 8: Creating second-pass prompt for deeper journey analysis...")
            second_prompt = self._create_second_pass_prompt(
                title, 
                description, 
                journey_type, 
                processed_data, 
                journey_insights,
                first_journey_insights,
                valid_html
            )
            print("   - Second-pass prompt created with insights from first journey map")
            # Print prompt summary (truncated) for debugging
            second_prompt_preview = second_prompt[:300] + "..." if len(second_prompt) > 300 else second_prompt
            self.logger.debug(f"Second prompt preview: {second_prompt_preview}")
            
            # Save the second prompt for debugging
            self._save_debug_info(debug_file, "Created second-pass prompt", second_prompt[:1000])
            
            # Call Claude API for second journey map with deeper analysis
            self.logger.debug("Calling Anthropic API for second-pass with deeper analysis...")
            print("=> Step 9: Calling Claude API for enhanced journey map with deeper analysis...")
            print("   - This will provide a more nuanced and detailed journey map")
            print("   - This may take a minute or two...")
            # Save full second prompt for inspection
            with open(f"logs/full_second_prompt_{debug_id}.txt", "w") as f:
                # Ensure we're writing a string to the file
                if isinstance(second_prompt, str):
                    f.write(second_prompt)
                else:
                    f.write(str(second_prompt))
            print(f"   - Saved second prompt to logs/full_second_prompt_{debug_id}.txt for inspection")
            # Use maximum allowed tokens for the second pass to get more detailed results
            second_html_content = self._call_anthropic_api(second_prompt, max_tokens=CLAUDE_MAX_OUTPUT_TOKENS)
            print("   - Received second-pass response from Claude API")
            # Save the full response for inspection
            with open(f"logs/full_response_{debug_id}.txt", "w") as f:
                # Ensure we're writing a string to the file
                if isinstance(second_html_content, str):
                    f.write(second_html_content)
                else:
                    f.write(str(second_html_content))
            print(f"   - Saved full response to logs/full_response_{debug_id}.txt for inspection")
            
            # Validate and fix the second HTML
            self.logger.debug("Validating second-pass HTML content...")
            print("=> Step 10: Validating and fixing second-pass HTML...")
            second_valid_html = self._validate_and_fix_html(second_html_content)
            
            if not second_valid_html:
                self.logger.warning("Second-pass HTML failed validation, using first-pass result")
                print("   - Second-pass HTML validation failed, falling back to first-pass result")
                second_valid_html = valid_html
            else:
                print("   - Second-pass HTML validated successfully")
            
            # Extract the summary from the second journey map
            print("=> Step 11: Extracting journey summary from final HTML...")
            journey_summary = self._extract_summary_from_html(second_valid_html)
            print(f"   - Extracted summary of {len(journey_summary)} characters")
            
            # Create response object using the second, improved journey map
            print("=> Step 12: Creating final journey map response object...")
            journey_map = {
                'interactive_html': second_valid_html,
                'journey_summary': journey_summary,
                'timestamp': datetime.now().isoformat()
            }
            print("   - Journey map generation complete!")
            
            # Log completion of journey map generation
            self._save_debug_info(debug_file, "Journey map generation complete", {
                'html_length': len(second_valid_html),
                'journey_type': journey_type,
                'model_used': self.anthropic_model,
                'stages_count': len(first_journey_insights.get('stages', [])),
                'summary_length': len(journey_summary)
            })
            self.logger.debug("=========== JOURNEY MAP GENERATION COMPLETE ===========")
            print("\n========== JOURNEY MAP GENERATION PROCESS COMPLETE ==========")
            print(f"Final journey map contains {len(second_valid_html)} characters of HTML")
            print(f"Journey analysis generated with {self.anthropic_model}")
            print(f"Time completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            return journey_map
                
        except Exception as e:
            error_msg = f"Error generating journey map: {str(e)}"
            self.logger.error(error_msg)
            print(f"\nERROR: Journey map generation failed: {str(e)}")
            import traceback
            self.logger.error(traceback.format_exc())
            print("See logs for detailed error information.")
            
            # Create a simple error HTML
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - Journey Map</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        max-width: 800px;
                        margin: 0 auto;
                        line-height: 1.6;
                    }}
                    .error-box {{
                        background-color: #fff0f0;
                        border-left: 4px solid #ff5555;
                        padding: 15px;
                        margin: 20px 0;
                    }}
                    h1 {{
                        color: #333;
                    }}
                    pre {{
                        background-color: #f8f8f8;
                        padding: 10px;
                        overflow: auto;
                        border-radius: 4px;
                    }}
                </style>
            </head>
            <body>
                <h1>Error Generating Journey Map</h1>
                <div class="error-box">
                    <p>{error_msg}</p>
                </div>
                <p>Please try again with different inputs or contact support for assistance.</p>
            </body>
            </html>
            """
            
            return {
                'interactive_html': error_html,
                'journey_summary': f'Error generating journey map: {str(e)}'
            }
    
    def _extract_journey_info(self, data):
        """Extract basic journey information from the data"""
        # Default values
        title = "Customer Journey"
        description = "A visualization of the customer journey"
        journey_type = "general"
        
        # Try to extract from metadata if available
        if isinstance(data, dict):
            metadata = data.get("metadata", {})
            context = metadata.get("context", {})
            
            title = context.get("title", title)
            description = context.get("description", description)
            journey_type = context.get("journey_type", journey_type)
            
            # Look for journey type in metadata
            for item in [metadata, context]:
                if "journey_type" in item:
                    journey_type = item["journey_type"]
                
            # Try to detect journey type from unstructured data
            if journey_type == "general" and "unstructured" in data:
                journey_terms = {
                    "customer": ["customer", "buyer", "shopper", "client", "purchase"],
                    "educational": ["student", "education", "course", "school", "class", "university"],
                    "healthcare": ["patient", "healthcare", "doctor", "medical", "hospital", "clinic"],
                    "employee": ["employee", "work", "workplace", "office", "job", "career"],
                    "coop": ["coop", "co-op", "internship", "placement", "work term"]
                }
                
                # Count occurrences of terms in unstructured data
                term_counts = {jtype: 0 for jtype in journey_terms}
                
                for item in data.get("unstructured", []):
                    if isinstance(item, dict) and "data" in item:
                        content = str(item["data"]).lower()
                        for jtype, terms in journey_terms.items():
                            for term in terms:
                                term_counts[jtype] += content.count(term.lower())
                
                # Use the journey type with the highest term count
                if term_counts:
                    max_type = max(term_counts.items(), key=lambda x: x[1])
                    if max_type[1] > 0:
                        journey_type = max_type[0]
                        self.logger.info(f"Using detected journey type '{journey_type}' instead of 'general'")
        
        return title, description, journey_type
    
    def _preprocess_data(self, data):
        """Preprocess the data for journey mapping"""
        # Simple pass-through for now - extend as needed
        return data
        
    def _simplify_data_for_prompt(self, data):
        """
        Simplify data to reduce prompt size while preserving essential information
        """
        # Create a copy to avoid modifying the original
        if not isinstance(data, dict):
            return data
            
        simplified = {}
        
        # Copy basic metadata
        if "metadata" in data:
            simplified["metadata"] = data["metadata"]
        
        # Handle unstructured data - limit to essential information
        if "unstructured" in data:
            # Only include a subset of unstructured data if it's large, 
            # but maximize the amount of data we include up to our limit
            unstructured = data["unstructured"]
            if len(unstructured) > CLAUDE_MAX_DETAILED_ITEMS:
                simplified["unstructured"] = unstructured[:CLAUDE_MAX_DETAILED_ITEMS]  # Use first set of items
                simplified["unstructured_summary"] = f"Total of {len(unstructured)} unstructured data items, showing first {CLAUDE_MAX_DETAILED_ITEMS}"
            else:
                simplified["unstructured"] = unstructured
        
        # Add any structured data available
        if "structured" in data:
            simplified["structured"] = data["structured"]
        
        # Include other important keys
        for key in ["context", "title", "description", "journey_type"]:
            if key in data:
                simplified[key] = data[key]
                
        return simplified
    
    def _extract_journey_insights(self, data):
        """Extract key insights from the journey data"""
        insights = {
            "summary": "",
            "stages": [],
            "pain_points": [],
            "opportunities": []
        }
        
        # Process unstructured data to identify journey stages, pain points, etc.
        if isinstance(data, dict) and "unstructured" in data:
            for item in data.get("unstructured", []):
                if isinstance(item, dict):
                    if item.get("type") == "transcript" and "structured_elements" in item:
                        # Extract information from structured transcripts
                        elements = item.get("structured_elements", {})
                        
                        # Extract topics as potential stages
                        for topic in elements.get("topics", []):
                            if topic and topic not in insights["stages"]:
                                insights["stages"].append(topic)
                        
                        # Extract questions as potential pain points or opportunities
                        for question in elements.get("questions", []):
                            if "problem" in question.lower() or "difficult" in question.lower():
                                insights["pain_points"].append(question)
                            elif "improve" in question.lower() or "better" in question.lower():
                                insights["opportunities"].append(question)
        
        # Use RAG to extract additional insights if available
        if self.use_rag and self.data_processor is not None:
            try:
                # Use more dynamic approach to avoid static type checking errors
                # Query for journey stages
                stage_query = "What are the main stages or phases in this customer journey?"
                # Get method or return a safe default function if not available
                context_method = getattr(self.data_processor, "get_rag_context", lambda x, **kw: "No context available")
                
                # Get context for stages, pain points, and opportunities
                stage_results = context_method(stage_query, top_k=3)
                self.logger.info("Retrieved RAG context for journey stages")
                
                pain_query = "What are the main pain points, challenges, or frustrations in this journey?"
                pain_results = context_method(pain_query, top_k=3)
                self.logger.info("Retrieved RAG context for pain points")
                
                opp_query = "What are the opportunities for improvement in this journey?"
                opp_results = context_method(opp_query, top_k=3)
                self.logger.info("Retrieved RAG context for opportunities")
                
                # Save RAG insights for later use
                insights["rag_contexts"] = {
                    "stages": stage_results,
                    "pain_points": pain_results,
                    "opportunities": opp_results
                }
            except Exception as e:
                self.logger.warning(f"Error using RAG for insights: {str(e)}")
        
        # Limit the number of items in each category
        insights["stages"] = insights["stages"][:8]
        insights["pain_points"] = insights["pain_points"][:5]
        insights["opportunities"] = insights["opportunities"][:5]
        
        return insights

    def _create_prompt(self, title, description, journey_type, data, insights):
        """Create an enhanced prompt for Claude 4 that leverages extended thinking mode and interleaved thinking
        to generate more detailed and data-driven journey maps, without biasing with journey-specific elements.
        """
        # Simplify the data to reduce prompt size
        simplified_data = self._simplify_data_for_prompt(data)
        
        # Base prompt with explicit request for extended thinking
        prompt = f"""**INSTRUCTION**: You are an EXPERT JOURNEY MAPPING SPECIALIST with exceptional data analysis and visualization skills. I'm activating your extended thinking mode to thoroughly analyze this data and produce a superior journey map with deep insights. **IMPORTANT: TAKE YOUR TIME, BE EXTREMELY THOROUGH, USE ALL THE DATA PROVIDED, AND PRODUCE THE MOST DETAILED ANALYSIS POSSIBLE.**

CRITICAL INSTRUCTION: YOUR RESPONSE MUST BE A COMPLETE, INTERACTIVE HTML DOCUMENT WITH ALL TAGS INTACT. YOU MUST INCLUDE <!DOCTYPE html>, <html>, <head>, <style>, <body>, AND ALL CLOSING TAGS INCLUDING </body> AND </html>.

TASK: Create a beautiful, interactive journey map visualization as a standalone HTML document with embedded CSS and JavaScript. 

ESSENTIAL REQUIREMENTS:
1. MAXIMIZE CONTENT VOLUME - use close to the 64,000 token limit to provide the most comprehensive analysis possible
2. FOLLOW ACCESSIBILITY BEST PRACTICES (WCAG AA STANDARDS) - use semantic HTML, proper ARIA attributes, sufficient color contrast (4.5:1 minimum), keyboard accessibility, etc.
3. PROVIDE DEEP ANALYSIS - go beyond surface observations to find hidden patterns and insights

*** VISUAL DESIGN REQUIREMENTS ***
1. HEADERS MUST BE HIGH CONTRAST - Ensure all header text (h1, h2, h3, etc.) has high contrast against its background (at least 4.5:1 ratio)
2. USE FULL VIEWPORT WIDTH - Design the journey map to expand to the full width of the viewport with proper padding
3. RESPONSIVE LAYOUT - Create a fluid, responsive design that works well on all screen sizes
4. MODERN AESTHETICS - Use a clean, modern design with consistent visual language
5. ENSURE READABILITY - All text must be easily readable with appropriate font sizes and contrast

*** THINKING PROCESS ***
First, I'll need you to:
1. Thoroughly analyze the provided data, extracting specific patterns, behaviors, and insights
2. Identify the key stages in the journey based ONLY on evidence from the data
3. For each stage, determine:
   - The main activities performed (with specific evidence from data)
   - The emotional state at each stage (if evidence exists in the data)
   - Pain points faced (with quantification where possible)
   - Opportunities for improvement (based solely on data patterns)
4. Look for quantitative metrics in the data that could enhance the journey map
5. Search for connections between different data points that might reveal deeper insights

Take your time with this analysis. Provide detailed reasoning for your decisions about journey stages, 
emotional states, pain points, and opportunities, but base ALL conclusions strictly on the data provided.

*** CRITICAL HTML REQUIREMENTS ***
1. Return ONLY HTML - no explanations, no markdown, no JSON
2. Your output MUST START with "<!DOCTYPE html>" and END with "</html>"
3. Include a complete <head> section with proper meta tags, title, and CSS
4. Include ALL closing tags - </style>, </head>, </body>, </html>, etc.
5. Use modern CSS with variables, grid layout, and flexbox
6. Create interactive elements with vanilla JavaScript
7. Make your visualization aesthetically pleasing with attention to design details
8. NEVER OMIT THE </body> AND </html> TAGS AT THE END - THEY ARE ABSOLUTELY REQUIRED
9. ENSURE your final output ends with </body></html> tags in that order

*** JOURNEY MAP CONTENT REQUIREMENTS ***
1. Create a HORIZONTAL timeline-based journey map showing stages from left to right
2. Break down the journey into key phases/stages with EVIDENCE from the data
3. For each stage, visualize with SPECIFIC DATA POINTS:
   - Activities (quote specific evidence from data)
   - Emotions (using emoji or colors, only if there's evidence in the data)
   - Pain points (show in red, with specific examples from the data)
   - Opportunities for improvement (based on data patterns)
4. Include a detailed section at the top summarizing the key journey insights from the data analysis
5. Add metrics or KPIs directly drawn from the data
6. Create interactive elements that enhance understanding of the data
7. Include data visualizations where appropriate (charts, graphs)
8. Make the visualization RESPONSIVE for all screen sizes
9. USE FULL VIEWPORT WIDTH - utilize the available screen space effectively
10. ENSURE ALL HEADERS ARE CLEARLY VISIBLE with high contrast against backgrounds

*** QUOTES AND CITATIONS REQUIREMENTS ***
1. For ALL information in the journey map, include DIRECT QUOTES from the source data whenever possible
2. Each quote should be visually distinct (use blockquote styling, italics, or special formatting)
3. Each quote MUST include a citation that indicates where it came from in the source data
4. Citations should be in a consistent format (e.g., "Source: Interview #3" or "Source: Survey Response 12")
5. Do not include quotes that don't exist in the source data - only use actual text from the provided data
6. If you're summarizing data, clearly indicate when you're synthesizing multiple sources vs. direct quoting

TITLE: {title}
DESCRIPTION: {description}
JOURNEY TYPE: {journey_type}

DATA:
{json.dumps(simplified_data, indent=2)}
"""

        # Add relevant data excerpts
        if insights["stages"]:
            prompt += "\nPOTENTIAL JOURNEY STAGES (ANALYZE THESE CRITICALLY AND REFINE BASED ON DATA):\n"
            for stage in insights["stages"]:
                prompt += f"- {stage}\n"
        
        if insights["pain_points"]:
            prompt += "\nIDENTIFIED PAIN POINTS (VALIDATE THESE WITH DATA):\n"
            for point in insights["pain_points"]:
                prompt += f"- {point}\n"
        
        if insights["opportunities"]:
            prompt += "\nOPPORTUNITY AREAS (EXPAND BASED ON DATA ANALYSIS):\n"
            for opp in insights["opportunities"]:
                prompt += f"- {opp}\n"
        
        # Add RAG context if available
        if "rag_contexts" in insights:
            prompt += "\n\nADDITIONAL CONTEXT FROM VECTOR SEARCH:\n"
            
            # Add stages context
            if "stages" in insights["rag_contexts"]:
                prompt += "\nJOURNEY STAGES CONTEXT:\n"
                prompt += insights["rag_contexts"]["stages"]
            
            # Add pain points context
            if "pain_points" in insights["rag_contexts"]:
                prompt += "\nPAIN POINTS CONTEXT:\n"
                prompt += insights["rag_contexts"]["pain_points"]
            
            # Add opportunities context
            if "opportunities" in insights["rag_contexts"]:
                prompt += "\nOPPORTUNITIES CONTEXT:\n"
                prompt += insights["rag_contexts"]["opportunities"]
        
        # Additional instructions for extended thinking and detailed analysis
        prompt += """
EXTENDED THINKING INSTRUCTIONS:
1. Go beyond obvious patterns - look for subtle correlations in the data
2. Challenge assumptions - do not impose typical journey patterns if not supported by the data
3. Provide EXTREMELY DETAILED and SPECIFIC insights from the data, not generic journey observations 
4. For each assertion about the journey, cite specific evidence from the data
5. Utilize quantitative metrics wherever possible to support your insights
6. If the data suggests different journey patterns for different groups, highlight these distinctions
7. Note unusual or unexpected patterns that might indicate unique insights
8. Look for time-based patterns if the data includes temporal information
9. Analyze both the frequency and severity of issues if such data exists
10. Examine customer emotions throughout each stage and provide DEEP psychological analysis
11. IMPORTANT: DO NOT make claims that aren't supported by the data - it's better to be silent on an aspect than to hallucinate information
12. Extract MANY DIRECT QUOTES from the source data to validate journey stages and insights
13. Add citations to EVERY quote and insight to show where it came from in the source data
14. Use the additional context from vector search to enhance your understanding, but always cite specific sources
15. SPEND TIME developing THOROUGH analysis of each stage, pain point, and opportunity
16. PROVIDE EXTREMELY DETAILED RECOMMENDATIONS based on your analysis
17. MAXIMIZE the depth of your analysis and the richness of your recommendations

DESIGN REQUIREMENTS:
1. Use a clean, modern aesthetic with a cohesive color scheme
2. Create a clear visual hierarchy
3. Use appropriate data visualization techniques
4. Ensure the design is accessible and readable
5. Highlight key insights visually
6. Design distinctive styling for quotes and citations to make them stand out
7. Create a system for presenting quotes that integrates well with the overall design
8. Use appropriate typography to distinguish between your analysis and direct quotes

REMEMBER: I NEED THE ENTIRE HTML DOCUMENT WITH ALL OPENING AND CLOSING TAGS. START WITH <!DOCTYPE html> AND END WITH </html>
"""
        
        return prompt
    
    def _create_retry_prompt(self, original_prompt, incomplete_html):
        """Create a prompt to retry generating HTML with clearer instructions"""
        retry_prompt = f"""You previously provided incomplete HTML that's missing crucial elements. I need you to generate a COMPLETE HTML document.

CRITICAL REQUIREMENTS:
1. The HTML output MUST begin with <!DOCTYPE html> and end with "</html>"
2. You MUST include ALL opening AND closing tags
3. Every HTML document MUST have <html>, <head>, and <body> sections WITH their closing tags: </html>, </head>, and </body>
4. ALL tags must be properly closed (e.g., </div>, </script>, etc.)
5. THE MOST CRITICAL ISSUE IS YOU MUST END YOUR DOCUMENT WITH </body></html>

The previous attempt had these issues:
- Missing closing tags: </body>, </html>
- Incomplete HTML structure

INSTRUCTIONS:
1. Create a COMPLETE HTML document with NO OMISSIONS
2. NEVER truncate or assume continuation - include EVERYTHING
3. Double-check that all tags are closed before submitting
4. VERIFY that your final response ends with </body></html>
5. DO NOT omit any tags, especially closing tags
6. Return ONLY the complete HTML, no explanations or commentary

Original request:
{original_prompt}

Now, create the complete HTML document with all required elements and closing tags. ENSURE it ends with </body></html>.
"""
        return retry_prompt
    
    def _call_anthropic_api(self, prompt, max_tokens=CLAUDE_MAX_OUTPUT_TOKENS):
        """Call the Anthropic API with retry logic"""
        try:
            # Log API request details
            self._save_debug_info(None, "API request details", {
                "model": self.anthropic_model,
                "endpoint": "https://api.anthropic.com/v1/messages",
                "max_tokens": max_tokens,
                "prompt_length": len(prompt)
            })
            
            print(f"\n= API Call Details:")
            print(f"   - Model: {self.anthropic_model}")
            print(f"   - Max tokens requested: {max_tokens}")
            print(f"   - Prompt length: {len(prompt)} characters")
            
            # Call Claude API with maximum tokens and reduced temperature for more detailed output
            response = claude4_api_call(
                prompt=prompt,
                model=self.anthropic_model,
                max_tokens=max_tokens,
                temperature=0.3  # Lower temperature for more detailed, comprehensive output
            )
            
            # Extract HTML from response
            if isinstance(response, dict) and "content" in response:
                html_content = response["content"][0]["text"]
            else:
                html_content = response
            
            # Ensure the HTML is complete with closing tags
            if "<!DOCTYPE html>" in html_content and "</html>" not in html_content:
                self.logger.warning("HTML response missing closing tags, attempting to fix")
                if "</body>" not in html_content:
                    html_content = f"{html_content}\n</body>\n</html>"
                else:
                    html_content = f"{html_content}\n</html>"
            
            return html_content
            
        except Exception as e:
            self.logger.error(f"Error calling Anthropic API: {str(e)}")
            raise
    
    def _validate_and_fix_html(self, html_content):
        """Validate and fix HTML content if needed"""
        if not html_content:
            self.logger.warning("Empty HTML content received")
            return None
        
        # Check for required HTML tags
        required_tags = ['<!DOCTYPE html>', '<html', '<head', '<body', '</body>', '</html>']
        missing_tags = [tag for tag in required_tags if tag not in html_content]
        
        if missing_tags:
            self.logger.warning(f"HTML missing required tags: {missing_tags}")
            
            # Attempt to fix the HTML
            fixed_html = self._fix_html(html_content, missing_tags)
            
            # Validate the fixed HTML
            still_missing = [tag for tag in required_tags if tag not in fixed_html]
            if still_missing:
                self.logger.warning(f"Fixed HTML still missing tags: {still_missing}")
                # Make a more aggressive fix attempt for common issues
                if '</body>' in still_missing and '</html>' in still_missing:
                    fixed_html = fixed_html + "\n</body>\n</html>"
                    still_missing = [tag for tag in required_tags if tag not in fixed_html]
                
                if still_missing:
                    self.logger.warning(f"HTML still missing tags after aggressive fix: {still_missing}")
                    return None
            
            return fixed_html
        
        return html_content
    
    def _fix_html(self, html_content, missing_tags):
        """Fix incomplete HTML by adding missing tags"""
        fixed_html = html_content
        
        # Add DOCTYPE if missing
        if '<!DOCTYPE html>' not in fixed_html:
            fixed_html = '<!DOCTYPE html>\n' + fixed_html
        
        # Add html opening tag if missing
        if '<html' not in fixed_html:
            if '<!DOCTYPE html>' in fixed_html:
                doctype_end = fixed_html.find('<!DOCTYPE html>') + len('<!DOCTYPE html>')
                fixed_html = fixed_html[:doctype_end] + '\n<html lang="en">' + fixed_html[doctype_end:]
            else:
                fixed_html = '<html lang="en">\n' + fixed_html
        
        # Add head section if missing
        if '<head' not in fixed_html:
            html_tag_end = fixed_html.find('<html') + fixed_html[fixed_html.find('<html'):].find('>') + 1
            head_content = """
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Journey Map</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
    </style>
</head>
"""
            fixed_html = fixed_html[:html_tag_end] + head_content + fixed_html[html_tag_end:]
        
        # Add body opening tag if missing
        if '<body' not in fixed_html:
            head_end = fixed_html.find('</head>') + len('</head>')
            fixed_html = fixed_html[:head_end] + '\n<body>\n' + fixed_html[head_end:]
        
        # Add closing body tag if missing
        if '</body>' not in fixed_html:
            if '</html>' in fixed_html:
                fixed_html = fixed_html.replace('</html>', '</body>\n</html>')
            else:
                fixed_html += '\n</body>'
        
        # Add closing html tag if missing
        if '</html>' not in fixed_html:
            fixed_html += '\n</html>'
        
        return fixed_html
    
    def _create_fallback_html(self, title, description, journey_type, insights):
        """Create a fallback HTML template when API generation fails"""
        # Implementation omitted for brevity, see original implementation
        return "<html>Fallback HTML template</html>"  # Placeholder

    def _extract_journey_from_html(self, html_content):
        """
        Extract journey insights from the generated HTML content
        This includes stages, activities, pain points, etc.
        """
        journey_info = {
            "stages": [],
            "insights": [],
            "structure": {}
        }
        
        try:
            # Extract journey stages (basic approach)
            stage_matches = re.findall(r'<div class="stage-title">(.*?)</div>', html_content)
            if stage_matches:
                journey_info["stages"] = stage_matches
            
            # Extract journey insights from the summary section
            insight_matches = re.findall(r'<div class="insight-card">.*?<p>(.*?)</p>', html_content, re.DOTALL)
            if insight_matches:
                journey_info["insights"] = insight_matches
            
            # Try to extract overall structure (what sections the journey map has)
            structure_matches = re.findall(r'<h2[^>]*>(.*?)</h2>', html_content)
            if structure_matches:
                journey_info["structure"]["sections"] = structure_matches
            
            # Extract any metrics or KPIs
            metric_matches = re.findall(r'<div class="metric-value">(.*?)</div>\s*<div class="metric-label">(.*?)</div>', html_content)
            if metric_matches:
                journey_info["metrics"] = [{"value": m[0], "label": m[1]} for m in metric_matches]
            
        except Exception as e:
            self.logger.warning(f"Error extracting journey information from HTML: {str(e)}")
        
        return journey_info

    def _extract_summary_from_html(self, html_content):
        """
        Extract the journey summary from the HTML content
        """
        summary = ""
        
        try:
            # Look for a summary section in the HTML
            summary_match = re.search(r'<div[^>]*?class="[^"]*?summary[^"]*?"[^>]*?>(.*?)</div>', html_content, re.DOTALL)
            if summary_match:
                # Remove HTML tags from the summary
                summary_html = summary_match.group(1)
                summary = re.sub(r'<[^>]*?>', ' ', summary_html)
                summary = re.sub(r'\s+', ' ', summary).strip()
            
            # If no specific summary section, try the header description
            if not summary:
                description_match = re.search(r'<p class="description">(.*?)</p>', html_content, re.DOTALL)
                if description_match:
                    summary = description_match.group(1)
                    
            # If still no summary, extract the first paragraph after any header
            if not summary:
                paragraph_match = re.search(r'<h[1-3][^>]*>.*?</h[1-3]>\s*<p[^>]*>(.*?)</p>', html_content, re.DOTALL)
                if paragraph_match:
                    summary = paragraph_match.group(1)
        
        except Exception as e:
            self.logger.warning(f"Error extracting summary from HTML: {str(e)}")
        
        return summary

    def _create_second_pass_prompt(self, title, description, journey_type, data, insights, first_journey_insights, first_html):
        """
        Create a prompt for the second pass with deeper analysis
        """
        # Simplify the data to reduce prompt size
        simplified_data = self._simplify_data_for_prompt(data)
        
        # Get additional RAG context for second pass if enabled
        second_pass_rag_context = ""
        if self.use_rag and self.data_processor is not None:
            try:
                # Query with more specific questions for second pass
                refine_query = f"What additional insights, nuanced patterns, or overlooked aspects would improve this journey map? Journey type: {journey_type}"
                
                # Use getattr to avoid static type checking issues
                # Get method with default fallback function
                context_method = getattr(self.data_processor, "get_rag_context", 
                                        lambda x, **kw: "No RAG context available.")
                
                # Get additional context from vector store
                second_pass_rag_context = context_method(refine_query, top_k=5)
                self.logger.info("Retrieved additional RAG context for second-pass analysis")
            except Exception as e:
                self.logger.warning(f"Error using RAG for second pass: {str(e)}")
        
        prompt = f"""**CRITICAL INSTRUCTION**: You are an EXPERT JOURNEY MAPPING SPECIALIST with exceptional data analysis and visualization skills. TAKE MAXIMUM TIME TO DEVELOP THE MOST DETAILED AND THOROUGH ANALYSIS POSSIBLE.

TASK: Generate an EXTREMELY DETAILED, DEEPLY INSIGHTFUL journey map based on the first journey map and deeper analysis of the data. 

ESSENTIAL REQUIREMENTS:
1. MAXIMIZE CONTENT VOLUME - use close to the 64,000 token limit to provide the most comprehensive analysis possible
2. FOLLOW ACCESSIBILITY BEST PRACTICES (WCAG AA STANDARDS) - use semantic HTML, proper ARIA attributes, sufficient color contrast (4.5:1 minimum), keyboard accessibility, etc.
3. CREATE INTERACTIVE ELEMENTS that are both visually appealing and fully accessible
4. PROVIDE MAXIMUM DETAIL - your response should be comprehensive and exhaustive, with deep analysis in every section

*** VISUAL DESIGN REQUIREMENTS ***
1. HEADERS MUST BE HIGH CONTRAST - Ensure all header text (h1, h2, h3, etc.) has high contrast against its background (at least 4.5:1 ratio)
2. USE FULL VIEWPORT WIDTH - Design the journey map to expand to the full width of the viewport with proper padding
3. RESPONSIVE LAYOUT - Create a fluid, responsive design that works well on all screen sizes
4. MODERN AESTHETICS - Use a clean, modern design with consistent visual language
5. ENSURE READABILITY - All text must be easily readable with appropriate font sizes and contrast
6. UTILIZE SPACE EFFICIENTLY - Make better use of horizontal space, avoid excessive white space
7. OPTIMIZE JOURNEY TIMELINE - Create a timeline that uses the available width effectively

FIRST JOURNEY MAP: You've already created a journey map based on the data. Now I want you to analyze this first journey map critically, think more deeply about the data, and create a new, improved journey map.

*** CRITICAL THINKING REQUIREMENTS ***
1. Critically evaluate the first journey map against the original data
2. Identify any stages, activities, or insights that might have been missed or under-emphasized
3. Look for deeper patterns and connections in the data
4. Consider if there are better ways to structure or visualize the journey
5. Analyze the emotional journey more deeply
6. Look for additional metrics or KPIs that could add value
7. Think deeply about how to better visualize pain points and opportunities

*** CRITICAL HTML REQUIREMENTS ***
1. Return ONLY HTML - no explanations, no markdown, no JSON
2. Your output MUST START with "<!DOCTYPE html>" and END with "</html>"
3. Include a complete <head> section with proper meta tags, title, and CSS
4. Include ALL closing tags - </style>, </head>, </body>, </html>, etc.
5. Use modern CSS with variables, grid layout, and flexbox
6. Create interactive elements with vanilla JavaScript
7. Make your visualization aesthetically pleasing with attention to design details
8. NEVER OMIT THE </body> AND </html> TAGS AT THE END - THEY ARE ABSOLUTELY REQUIRED
9. ENSURE your final output ends with </body></html> tags in that order

*** JOURNEY MAP CONTENT REQUIREMENTS ***
1. Create a HORIZONTAL timeline-based journey map showing stages from left to right
2. Break down the journey into key phases/stages with DEEPER INSIGHTS from the data
3. For each stage, visualize:
   - Activities (more specific and data-driven than the first map)
   - Emotions (more nuanced understanding based on deeper data analysis)
   - Pain points (with more precise analysis of severity and frequency)
   - Opportunities (with more detailed and actionable insights)
4. Include a section at the top summarizing the deeper journey insights
5. Add more detailed metrics or KPIs relevant to the journey type
6. Make the visualization RESPONSIVE for all screen sizes
7. USE FULL VIEWPORT WIDTH - utilize the available screen space effectively
8. ENSURE ALL HEADERS ARE CLEARLY VISIBLE with high contrast against backgrounds
9. IMPROVE LAYOUT - design a more elegant, efficient layout that maximizes screen real estate

*** QUOTES AND CITATIONS REQUIREMENTS ***
1. For ALL information in the journey map, include DIRECT QUOTES from the source data whenever possible
2. Each quote should be visually distinct (use blockquote styling, italics, or special formatting)
3. Each quote MUST include a citation that indicates where it came from in the source data
4. Citations should be in a consistent format (e.g., "Source: Interview #3" or "Source: Survey Response 12")
5. Do not include quotes that don't exist in the source data - only use actual text from the provided data
6. If you're summarizing data, clearly indicate when you're synthesizing multiple sources vs. direct quoting
7. Use pull quotes for particularly impactful statements that highlight key aspects of each journey stage

TITLE: {title}
DESCRIPTION: {description}
JOURNEY TYPE: {journey_type}

DATA:
{json.dumps(simplified_data, indent=2)}

FIRST JOURNEY MAP ANALYSIS:
The first journey map identified these stages: {", ".join(first_journey_insights.get("stages", []))}
Key insights from the first map: {", ".join(first_journey_insights.get("insights", []))[:500]}

{add_context_section(second_pass_rag_context) if second_pass_rag_context else ""}

REMEMBER: I NEED THE ENTIRE HTML DOCUMENT WITH ALL OPENING AND CLOSING TAGS. START WITH <!DOCTYPE html> AND END WITH </html>
"""
        
        return prompt
        
    def _save_debug_info(self, filename, message, data):
        """Save debug information to a file"""
        if self.debug_mode:
            debug_info = {
                "timestamp": datetime.now().isoformat(),
                "message": message,
                "data": data
            }
            
            if not filename:
                filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_debug.json"
            
            filepath = os.path.join("logs", filename)
            
            try:
                # Check if file exists
                if os.path.exists(filepath):
                    # Append to existing file
                    with open(filepath, "a") as f:
                        f.write(json.dumps(debug_info, indent=2))
                        f.write("\n")
                else:
                    # Create new file
                    with open(filepath, "w") as f:
                        f.write(json.dumps(debug_info, indent=2))
                        f.write("\n")
            except Exception as e:
                self.logger.warning(f"Failed to save debug info: {str(e)}")
    
    def render_journey_map_html(self, journey_map):
        """
        Return the HTML content from the journey map result with enhanced export functionality.
        """
        html_content = journey_map.get('interactive_html', '')
        
        # One final validation check
        self.logger.info("[DEBUG] Validating HTML content")
        required_tags = ['<!DOCTYPE html>', '<html', '<head', '<body', '</body>', '</html>']
        missing_tags = [tag for tag in required_tags if tag not in html_content]
        
        if missing_tags:
            self.logger.warning(f"HTML missing required tags: {missing_tags}")
            self.logger.warning("HTML content validation failed in render_journey_map_html")
            
            # Try to fix it one more time
            fixed_html = self._fix_html(html_content, missing_tags)
            
            # Check if the fixed version is valid
            still_missing = [tag for tag in required_tags if tag not in fixed_html]
            if not still_missing:
                html_content = fixed_html
        
        # Add model info footer
        model_info_html = f"""
<div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 0.8em; color: #666;">
  Generated with <strong>{self.anthropic_model}</strong> on {datetime.now().strftime('%Y-%m-%d')}
</div>
"""
        
        # Add export functionality script tag
        export_script_html = """
<script src="/static/journey_export.js"></script>
"""
        
        # Add print media styles if not present
        print_styles = """
<style media="print">
    @page {
        size: landscape;
        margin: 1cm;
    }
    body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }
    .journey-map {
        page-break-inside: avoid;
    }
    .journey-stage {
        page-break-inside: avoid;
    }
    .journey-timeline {
        overflow: visible !important;
    }
    .container {
        max-width: none !important;
        width: 100% !important;
        padding: 0.5cm !important;
    }
    .export-panel {
        display: none !important;
    }
}
</style>
"""
        
        # Insert model_info_html and export script before </body>
        if "</body>" in html_content:
            html_content = html_content.replace("</body>", f"{model_info_html}{export_script_html}</body>")
        
        # Ensure we have a viewport meta tag
        if "<head>" in html_content and "<meta name=\"viewport\"" not in html_content:
            viewport_meta = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
            head_pos = html_content.find("<head>") + len("<head>")
            html_content = html_content[:head_pos] + viewport_meta + html_content[head_pos:]
        
        # Add print media styles if not present
        if "<head>" in html_content and "@media print" not in html_content:
            if "</head>" in html_content:
                html_content = html_content.replace("</head>", f"{print_styles}</head>")
        
        # Additional timeline styles for printing
        timeline_styles = """
<style>
    .journey-timeline {
        min-width: unset !important;
        overflow-x: visible !important;
    }
    @media print {
        .journey-timeline {
            transform: none !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
        }
    }
</style>
"""
        
        if "</head>" in html_content:
            html_content = html_content.replace("</head>", f"{timeline_styles}</head>")
        
        return html_content