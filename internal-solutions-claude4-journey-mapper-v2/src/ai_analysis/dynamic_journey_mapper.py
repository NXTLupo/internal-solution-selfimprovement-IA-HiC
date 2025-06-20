import os
import sys
import json
import logging
import re
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional, Union

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from claude_api_wrapper import claude_api_call

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
CLAUDE_MAX_INPUT_TOKENS = 200000  # Claude 3.7 allows up to 200K tokens input
CLAUDE_MAX_OUTPUT_TOKENS = 64000  # Maximum for Claude 3.7 Sonnet
CLAUDE_MAX_DETAILED_ITEMS = 15    # Maximum number of detailed items to include in data

class DynamicJourneyMapper:
    def __init__(self, anthropic_model=None, debug_mode=True, use_rag=True):
        # Use environment variable or default to the Sonnet model
        self.anthropic_model = anthropic_model or os.environ.get("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")
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
        Generate a journey map visualization using Claude API.
        Then perform deeper analysis and generate an improved version.
        """
        try:
            # Log debugging info
            self.logger.debug("=========== STARTING JOURNEY MAP GENERATION ===========")
            print("\n========== JOURNEY MAP GENERATION PROCESS STARTED ==========")
            self.logger.info("[DEBUG] Starting journey map generation with model: " + self.anthropic_model)
            
            # Get journey info from data
            self.logger.debug("Extracting journey information from data...")
            print("📝 Step 1: Extracting journey information (title, description, type)...")
            title, description, journey_type = self._extract_journey_info(data)
            print(f"   - Journey title: {title}")
            print(f"   - Journey type: {journey_type}")
            
            # Process the data for journey mapping
            self.logger.debug("Starting data preprocessing...")
            print("📊 Step 2: Preprocessing data for journey mapping...")
            processed_data = self._preprocess_data(data)
            self.logger.info("[DEBUG] Processing dictionary data")
            print("   - Data preprocessing complete")
            
            # Extract insights from the data
            self.logger.debug("Extracting journey insights from data...")
            print("🔍 Step 3: Extracting key journey insights...")
            journey_insights = self._extract_journey_insights(processed_data)
            
            # Print some insights for debugging
            print(f"   - Identified {len(journey_insights.get('stages', []))} journey stages")
            print(f"   - Found {len(journey_insights.get('pain_points', []))} pain points")
            print(f"   - Discovered {len(journey_insights.get('opportunities', []))} opportunities")
            
            # Prepare the prompt for Claude
            self.logger.debug("Creating effective prompt for Claude...")
            print("✍️ Step 4: Creating optimized prompt for Claude 3.7...")
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
            self.logger.debug("Calling Anthropic Claude 3.7 API...")
            print("🤖 Step 5: Calling Anthropic Claude 3.7 API for first-pass journey map...")
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
            print("🔧 Step 6: Validating and fixing HTML content...")
            valid_html = self._validate_and_fix_html(html_content)
            if valid_html:
                print("   - HTML content validated successfully")
            else:
                print("   - HTML validation failed, will attempt to fix or retry")
            
            if not valid_html:
                # Retry with more explicit instructions
                self.logger.warning("Generated HTML failed validation, retrying with clearer instructions")
                print("🔄 Step 6a: First HTML validation failed, retrying with clearer instructions...")
                retry_prompt = self._create_retry_prompt(prompt, html_content)
                print("   - Created retry prompt with more explicit HTML requirements")
                print("   - Calling Anthropic API again...")
                retry_html = self._call_anthropic_api(retry_prompt)
                print("   - Received retry response from Claude API")
                valid_html = self._validate_and_fix_html(retry_html)
                print(f"   - Retry HTML validation {'succeeded' if valid_html else 'failed'}")
                
                if not valid_html:
                    self.logger.error("Generated HTML failed validation after retry")
                    print("⚠️ Step 6b: HTML validation failed after retry, using fallback template...")
                    # Use the fallback template if all else fails
                    valid_html = self._create_fallback_html(title, description, journey_type, journey_insights)
                    print("   - Created fallback HTML template")
            
            # Extract the journey stages, insights, and structure from the first journey map
            self.logger.debug("Extracting journey information from first-pass HTML...")
            print("🧩 Step 7: Extracting journey information from first-pass HTML...")
            first_journey_insights = self._extract_journey_from_html(valid_html)
            print(f"   - Extracted {len(first_journey_insights.get('stages', []))} journey stages")
            print(f"   - Found {len(first_journey_insights.get('insights', []))} key insights")
            
            # Create a second-pass prompt for deeper analysis
            self.logger.debug("Creating second-pass prompt for deeper analysis...")
            print("📝 Step 8: Creating second-pass prompt for deeper journey analysis...")
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
            print("🤖 Step 9: Calling Claude API for enhanced journey map with deeper analysis...")
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
            print("🔧 Step 10: Validating and fixing second-pass HTML...")
            second_valid_html = self._validate_and_fix_html(second_html_content)
            
            if not second_valid_html:
                self.logger.warning("Second-pass HTML failed validation, using first-pass result")
                print("   ⚠️ Second-pass HTML validation failed, falling back to first-pass result")
                second_valid_html = valid_html
            else:
                print("   - Second-pass HTML validated successfully")
            
            # Extract the summary from the second journey map
            print("📊 Step 11: Extracting journey summary from final HTML...")
            journey_summary = self._extract_summary_from_html(second_valid_html)
            print(f"   - Extracted summary of {len(journey_summary)} characters")
            
            # Create response object using the second, improved journey map
            print("✅ Step 12: Creating final journey map response object...")
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
            print(f"\n❌ ERROR: Journey map generation failed: {str(e)}")
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
        """Create an enhanced prompt for Claude 3.7 that leverages extended thinking mode
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
            
            print(f"\n🔍 API Call Details:")
            print(f"   - Model: {self.anthropic_model}")
            print(f"   - Max tokens requested: {max_tokens}")
            print(f"   - Prompt length: {len(prompt)} characters")
            
            # Call Claude API with maximum tokens and reduced temperature for more detailed output
            response = claude_api_call(
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
                    html_content = f"{html_content}\n</body>\n</html>"
            
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
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
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

        # Create journey stages based on journey type
        journey_stages = []
        
        if journey_type == "customer":
            journey_stages = ["Awareness", "Consideration", "Purchase", "Onboarding", "Usage", "Support", "Retention"]
        elif journey_type == "educational":
            journey_stages = ["Enrollment", "Orientation", "Coursework", "Assessment", "Graduation", "Alumni"]
        elif journey_type == "healthcare":
            journey_stages = ["Appointment", "Registration", "Waiting", "Examination", "Diagnosis", "Treatment", "Follow-up"]
        elif journey_type == "employee":
            journey_stages = ["Recruiting", "Hiring", "Onboarding", "Development", "Performance", "Advancement", "Exit"]
        elif journey_type == "coop":
            journey_stages = ["Preparation", "Job Search", "Application", "Interviews", "Placement", "Work Term", "Reflection"]
        else:
            journey_stages = ["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5"]
        
        # Use insights if available, otherwise use defaults
        if insights.get("stages"):
            custom_stages = insights["stages"]
            if len(custom_stages) >= 3:
                journey_stages = custom_stages
        
        # Build out the HTML for each stage
        stages_html = ""
        for i, stage in enumerate(journey_stages):
            emotion = "😐"
            if i == 0:
                emotion = "🙂"
            elif i == len(journey_stages) - 1:
                emotion = "😊"
            elif i == 1:
                emotion = "🤔"
            elif i == 2:
                emotion = "😬"
            
            # For fallback template, add an example quote
            quote_example = f"""
            <div class="quote-container">
                <blockquote class="journey-quote">
                    This is where a direct quote from the source data would appear.
                </blockquote>
                <div class="quote-citation">Source: Example</div>
            </div>
            """
            
            stages_html += f"""
            <div class="journey-stage">
                <div class="stage-header">
                    <h3>{stage}</h3>
                    <div class="stage-emotion">{emotion}</div>
                </div>
                <div class="stage-content">
                    <div class="activities">
                        <h4>Activities</h4>
                        <ul>
                            <li>Activity 1</li>
                            <li>Activity 2</li>
                        </ul>
                        {quote_example if i == 0 else ""}
                    </div>
                    <div class="pain-points">
                        <h4>Pain Points</h4>
                        <ul>
                            <li>Challenge 1</li>
                        </ul>
                    </div>
                    <div class="opportunities">
                        <h4>Opportunities</h4>
                        <ul>
                            <li>Opportunity 1</li>
                        </ul>
                    </div>
                </div>
            </div>
            """
        
        # NOTE: All single braces in CSS are now doubled to avoid Pylance f-string issues
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        :root {{
            /* Modern color palette with enhanced visuals */
            --primary-color: #5667FE;
            --primary-light: #7D83FF;
            --secondary-color: #5DFDCB;
            --secondary-light: #90FDCD;
            --gradient-start: #5667FE;
            --gradient-end: #5DFDCB;
            --accent-color: #FF6B8B;
            --text-color: #2D3047;
            --text-light: #626594;
            --background-color: #f8f9fd;
            --background-gradient: linear-gradient(135deg, #f8f9fd, #f0f2ff);
            --white: #fff;
            --gray-light: #f1f3f9;
            --gray-medium: #e5e8f5;
            --red: #FF6B6B;
            --green: #4FD1C5;
            --yellow: #FFCB47;
            --border-radius: 16px;
            --card-border-radius: 20px;
            --shadow: 0 10px 25px rgba(86, 103, 254, 0.1);
            --shadow-strong: 0 15px 35px rgba(86, 103, 254, 0.2);
            --shadow-hover: 0 15px 30px rgba(86, 103, 254, 0.25);
            --transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            --quote-background: rgba(86, 103, 254, 0.08);
            --quote-border: #5667FE;
            --quote-text: #2D3047;
            --citation-color: #626594;
            --header-color: #2D3047;
            --card-background: rgba(255, 255, 255, 0.9);
            --backdrop-blur: blur(15px);
            --timeline-height: 6px;
            --stage-marker-size: 20px;
            --glass-border: 1px solid rgba(255, 255, 255, 0.2);
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background: var(--background-gradient);
            color: var(--text-color);
            line-height: 1.6;
            padding: 0;
            margin: 0;
            min-height: 100vh;
        }}

        h1, h2, h3, h4, h5 {{
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--header-color); /* Ensure headers are dark */
        }}

        .container {{
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            padding: 2.5rem;
        }}

        .header {{
            text-align: center;
            margin-bottom: 3rem;
            position: relative;
            padding: 2rem 1.5rem;
            background: var(--card-background);
            backdrop-filter: var(--backdrop-blur);
            border-radius: var(--card-border-radius);
            box-shadow: var(--shadow);
        }}

        .header h1 {{
            font-size: 2.8rem;
            background: linear-gradient(to right, var(--gradient-start), var(--gradient-end));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
            margin-bottom: 1.5rem;
            font-weight: 700;
            position: relative;
            display: inline-block;
        }}

        .header h1::after {{
            content: '';
            position: absolute;
            bottom: -12px;
            left: 25%;
            width: 50%;
            height: 5px;
            background: linear-gradient(to right, var(--gradient-start), var(--gradient-end));
            border-radius: 5px;
        }}

        .header p {{
            font-size: 1.1rem;
            color: var(--text-color); /* Darker color for better readability */
            max-width: 800px;
            margin: 0 auto;
        }}

        .insights-panel {{
            background: var(--white);
            border-radius: var(--border-radius);
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            width: 100%;
        }}

        .insight-card {{
            background: var(--gray-light);
            padding: 1.5rem;
            border-radius: var(--border-radius);
            transition: var(--transition);
            display: flex;
            flex-direction: column;
        }}

        .insight-card:hover {{
            transform: translateY(-5px);
            box-shadow: var(--shadow-strong);
        }}

        .insight-card h3 {{
            color: var(--header-color); /* Darker color for better contrast */
            margin-bottom: 0.5rem;
            font-size: 1.2rem;
        }}

        .insight-card p {{
            font-size: 0.95rem;
            flex-grow: 1;
        }}

        .metric {{
            font-size: 1.8rem;
            font-weight: bold;
            margin-top: 0.5rem;
            color: var(--primary-color);
        }}

        .journey-map {{
            position: relative;
            overflow-x: auto;
            background: var(--card-background);
            backdrop-filter: var(--backdrop-blur);
            border-radius: var(--card-border-radius);
            padding: 2.5rem;
            box-shadow: var(--shadow-strong);
            width: 100%;
            border: var(--glass-border);
        }}
        
        .journey-map h2 {{
            color: var(--header-color);
            margin-bottom: 2rem;
            font-size: 1.8rem;
            text-align: center;
            position: relative;
            display: inline-block;
            margin-left: auto;
            margin-right: auto;
            width: 100%;
            font-weight: 700;
        }}
        
        .journey-map h2::after {{
            content: '';
            position: absolute;
            bottom: -10px;
            left: 35%;
            width: 30%;
            height: 4px;
            background: linear-gradient(to right, var(--gradient-start), var(--gradient-end));
            border-radius: 2px;
        }}

        .journey-timeline {{
            display: grid;
            grid-template-columns: repeat({len(journey_stages)}, 1fr);
            gap: 1.8rem;
            min-width: 900px;
            position: relative;
            width: 100%;
            padding-top: 1.5rem;
        }}

        .journey-timeline::before {{
            content: '';
            position: absolute;
            top: 100px;
            left: 0;
            right: 0;
            height: var(--timeline-height);
            background: linear-gradient(90deg, var(--gradient-start), var(--gradient-end));
            z-index: 1;
            border-radius: 4px;
            box-shadow: 0 0 8px rgba(93, 253, 203, 0.3);
        }}

        .journey-stage {{
            position: relative;
            z-index: 2;
            transition: var(--transition);
            width: 100%;
        }}
        
        .journey-stage::after {{
            content: '';
            position: absolute;
            top: 100px;
            left: 50%;
            transform: translate(-50%, -50%);
            width: var(--stage-marker-size);
            height: var(--stage-marker-size);
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
            border-radius: 50%;
            z-index: 3;
            box-shadow: 0 0 12px rgba(93, 253, 203, 0.5);
            transition: var(--transition);
        }}

        .journey-stage:hover {{
            transform: translateY(-8px);
        }}
        
        .journey-stage:hover::after {{
            transform: translate(-50%, -50%) scale(1.5);
            box-shadow: 0 0 20px rgba(93, 253, 203, 0.8);
        }}

        .stage-header {{
            text-align: center;
            margin-bottom: 1.5rem;
            background: var(--card-background);
            backdrop-filter: var(--backdrop-blur);
            border-radius: var(--card-border-radius) var(--card-border-radius) 0 0;
            padding: 1.2rem 1rem;
            border-bottom: 4px solid;
            border-image: linear-gradient(to right, var(--gradient-start), var(--gradient-end)) 1;
            box-shadow: var(--shadow);
        }}

        .stage-header h3 {{
            font-weight: 700;
            font-size: 1.25rem;
            background: linear-gradient(to right, var(--gradient-start), var(--gradient-end));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
            margin: 0;
        }}

        .stage-emotion {{
            font-size: 1.8rem;
            margin-top: 0.8rem;
            filter: drop-shadow(0 2px 4px rgba(86, 103, 254, 0.2));
            transition: var(--transition);
        }}
        
        .journey-stage:hover .stage-emotion {{
            transform: scale(1.2);
        }}

        .stage-content {{
            background: var(--card-background);
            backdrop-filter: var(--backdrop-blur);
            border-radius: 0 0 var(--card-border-radius) var(--card-border-radius);
            padding: 1.8rem;
            height: 100%;
            min-height: 320px;
            display: flex;
            flex-direction: column;
            box-shadow: var(--shadow);
            border: var(--glass-border);
        }}

        .activities {{
            margin-bottom: 1.5rem;
        }}

        .activities h4, .pain-points h4, .opportunities h4 {{
            color: var(--header-color);
            margin-bottom: 1rem;
            font-size: 1.1rem;
            font-weight: 600;
            position: relative;
            display: inline-block;
        }}
        
        .activities h4::after, .pain-points h4::after, .opportunities h4::after {{
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(to right, var(--gradient-start), var(--gradient-end));
            border-radius: 2px;
            opacity: 0.7;
        }}

        .activities ul {{
            padding-left: 1.5rem;
            margin-top: 0.8rem;
        }}

        .activities li {{
            margin-bottom: 0.8rem;
            font-size: 0.95rem;
            position: relative;
        }}
        
        .activities li::marker {{
            color: var(--primary-color);
        }}

        .emotion {{
            display: flex;
            align-items: center;
            margin: 1.2rem 0;
            padding: 1rem;
            border-radius: var(--card-border-radius);
            background: var(--card-background);
            backdrop-filter: var(--backdrop-blur);
            box-shadow: var(--shadow);
            border: var(--glass-border);
            transition: var(--transition);
        }}
        
        .emotion:hover {{
            transform: translateY(-3px);
            box-shadow: var(--shadow-hover);
        }}

        .emotion-icon {{
            font-size: 1.8rem;
            margin-right: 1rem;
            filter: drop-shadow(0 2px 4px rgba(86, 103, 254, 0.2));
        }}

        .emotion-text {{
            font-size: 0.95rem;
            line-height: 1.5;
        }}

        .pain-points {{
            background: rgba(255, 107, 107, 0.08);
            border-left: 4px solid var(--red);
            padding: 1rem;
            margin: 1.2rem 0;
            border-radius: 0 var(--card-border-radius) var(--card-border-radius) 0;
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.1);
            backdrop-filter: var(--backdrop-blur);
        }}

        .pain-points p {{
            font-size: 0.95rem;
            line-height: 1.6;
        }}
        
        .pain-points ul {{
            padding-left: 1.5rem;
            margin-top: 0.8rem;
        }}
        
        .pain-points li {{
            margin-bottom: 0.8rem;
            font-size: 0.95rem;
        }}
        
        .pain-points li::marker {{
            color: var(--red);
        }}

        .opportunities {{
            background: rgba(79, 209, 197, 0.08);
            border-left: 4px solid var(--green);
            padding: 1rem;
            margin: 1.2rem 0;
            border-radius: 0 var(--card-border-radius) var(--card-border-radius) 0;
            margin-top: auto;
            box-shadow: 0 4px 15px rgba(79, 209, 197, 0.1);
            backdrop-filter: var(--backdrop-blur);
        }}

        .opportunities p {{
            font-size: 0.95rem;
            line-height: 1.6;
        }}
        
        .opportunities ul {{
            padding-left: 1.5rem;
            margin-top: 0.8rem;
        }}
        
        .opportunities li {{
            margin-bottom: 0.8rem;
            font-size: 0.95rem;
        }}
        
        .opportunities li::marker {{
            color: var(--green);
        }}

        /* Quote and Citation Styles */
        .quote-container {{
            margin: 2rem 0;
            position: relative;
            transition: var(--transition);
        }}
        
        .quote-container:hover {{
            transform: translateY(-5px);
        }}
        
        .journey-quote {{
            background-color: var(--quote-background);
            border-left: 4px solid var(--quote-border);
            padding: 1.2rem 1.8rem;
            margin: 0;
            font-style: italic;
            color: var(--quote-text);
            border-radius: 0 var(--card-border-radius) var(--card-border-radius) 0;
            position: relative;
            box-shadow: var(--shadow);
            backdrop-filter: var(--backdrop-blur);
            line-height: 1.6;
            font-size: 1rem;
        }}
        
        .journey-quote::before {{
            content: '"';
            font-size: 3rem;
            color: var(--quote-border);
            opacity: 0.2;
            position: absolute;
            top: -15px;
            left: 5px;
            font-family: Georgia, serif;
            font-weight: bold;
        }}
        
        .quote-citation {{
            font-size: 0.85rem;
            color: var(--citation-color);
            text-align: right;
            margin-top: 0.7rem;
            font-style: normal;
            padding-right: 1rem;
            font-weight: 500;
        }}
        
        /* Pull Quote Style */
        .pull-quote {{
            padding: 2rem;
            margin: 2.5rem 0;
            background: linear-gradient(135deg, rgba(86, 103, 254, 0.07), rgba(93, 253, 203, 0.07));
            border-radius: var(--card-border-radius);
            position: relative;
            box-shadow: var(--shadow-strong);
            border: var(--glass-border);
            backdrop-filter: var(--backdrop-blur);
            transition: var(--transition);
        }}
        
        .pull-quote:hover {{
            transform: translateY(-5px);
            box-shadow: var(--shadow-hover);
        }}
        
        .pull-quote::before {{
            content: '"';
            position: absolute;
            top: -15px;
            left: 20px;
            font-size: 5rem;
            color: var(--primary-light);
            opacity: 0.2;
            font-family: Georgia, serif;
            line-height: 1;
        }}
        
        .pull-quote-content {{
            font-size: 1.25rem;
            font-weight: 500;
            font-style: italic;
            background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
            text-align: center;
            margin-bottom: 1rem;
            line-height: 1.6;
            position: relative;
            z-index: 1;
        }}
        
        .pull-quote-citation {{
            font-size: 0.9rem;
            color: var(--citation-color);
            text-align: right;
            font-weight: 500;
        }}

        .kpi-dashboard {{
            margin-top: 3.5rem;
            background: var(--card-background);
            backdrop-filter: var(--backdrop-blur);
            border-radius: var(--card-border-radius);
            padding: 2.5rem;
            box-shadow: var(--shadow-strong);
            width: 100%;
            border: var(--glass-border);
        }}

        .kpi-dashboard h2 {{
            margin-bottom: 2rem;
            color: var(--header-color);
            text-align: center;
            position: relative;
            font-weight: 700;
        }}
        
        .kpi-dashboard h2::after {{
            content: '';
            position: absolute;
            bottom: -10px;
            left: 35%;
            width: 30%;
            height: 4px;
            background: linear-gradient(to right, var(--gradient-start), var(--gradient-end));
            border-radius: 2px;
        }}

        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 2rem;
        }}

        .kpi-card {{
            background: var(--card-background);
            backdrop-filter: var(--backdrop-blur);
            padding: 2rem;
            border-radius: var(--card-border-radius);
            text-align: center;
            transition: var(--transition);
            box-shadow: var(--shadow);
            border: var(--glass-border);
            position: relative;
            overflow: hidden;
        }}
        
        .kpi-card::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(to right, var(--gradient-start), var(--gradient-end));
            z-index: 1;
        }}

        .kpi-card:hover {{
            transform: translateY(-8px);
            box-shadow: var(--shadow-hover);
        }}

        .kpi-value {{
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
            margin: 0.8rem 0;
            line-height: 1.2;
        }}

        .kpi-label {{
            font-size: 1rem;
            color: var(--text-color); 
            font-weight: 500;
            margin-top: 0.5rem;
        }}

        @media (max-width: 1200px) {{
            .container {{
                padding: 1.5rem;
            }}
            .header h1 {{
                font-size: 2.2rem;
            }}
            .insights-panel {{
                padding: 1.8rem;
            }}
            .journey-map {{
                padding: 2rem;
            }}
        }}

        @media (max-width: 768px) {{
            .container {{
                padding: 1rem;
            }}
            .header h1 {{
                font-size: 1.8rem;
            }}
            .header h1::after {{
                width: 70%;
                left: 15%;
            }}
            .insights-panel {{
                padding: 1.2rem;
                grid-template-columns: 1fr;
            }}
            .journey-timeline {{
                gap: 1.2rem;
            }}
            .stage-emotion {{
                font-size: 1.5rem;
            }}
            .journey-timeline::before {{
                top: 85px;
            }}
            .stage-header {{
                padding: 1rem 0.8rem;
            }}
            .stage-content {{
                padding: 1.2rem;
            }}
            .kpi-dashboard {{
                padding: 1.5rem;
            }}
            .pull-quote {{
                padding: 1.5rem;
            }}
            .pull-quote-content {{
                font-size: 1.1rem;
            }}
        }}
        
        @media (max-width: 480px) {{
            .header h1 {{
                font-size: 1.6rem;
            }}
            .header p {{
                font-size: 0.95rem;
            }}
            .journey-map h2 {{
                font-size: 1.5rem;
            }}
            .journey-map h2::after {{
                width: 50%;
                left: 25%;
            }}
            .stage-header h3 {{
                font-size: 1.1rem;
            }}
            .kpi-value {{
                font-size: 2rem;
            }}
            .journey-stage::after {{
                width: calc(var(--stage-marker-size) * 0.8);
                height: calc(var(--stage-marker-size) * 0.8);
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>{title}</h1>
            <p class="description">{description}</p>
        </header>
        
        <section class="insights-panel">
            <div class="insight-card">
                <h3>Key Insights</h3>
                <p>This journey map was created with limited data. More data would enable deeper insights.</p>
            </div>
            <div class="insight-card">
                <h3>Stages Identified</h3>
                <p>{len(journey_stages)} key stages in the {journey_type} journey</p>
                <div class="metric">{len(journey_stages)}</div>
            </div>
            <div class="insight-card">
                <h3>Pain Points</h3>
                <p>Several challenges were identified across the journey</p>
                <div class="metric">5+</div>
            </div>
            <div class="insight-card">
                <h3>Opportunities</h3>
                <p>Areas for improvement and innovation</p>
                <div class="metric">3+</div>
            </div>
        </section>
        
        <section class="journey-map">
            <h2>Journey Stages</h2>
            <div class="journey-timeline">
                {stages_html}
            </div>
        </section>
    </div>
    
    <script>
        // Simple JavaScript to enhance the journey map
        document.addEventListener('DOMContentLoaded', function() {{
            // Add click handlers to journey stages
            const stages = document.querySelectorAll('.journey-stage');
            stages.forEach(stage => {{
                stage.addEventListener('click', function() {{
                    this.classList.toggle('expanded');
                }});
            }});
        }});
    </script>
</body>
</html>"""
        
        return html
    
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
        
        # Summary section removed as requested
        
        # Add model info footer
        model_info_html = f"""
<div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 0.8em; color: #666;">
  Generated with <strong>{self.anthropic_model}</strong> on {datetime.now().strftime('%Y-%m-%d')}
</div>
"""
        
        # Extract journey ID from the URL or generate one
        import re
        import uuid
        
        # Try to extract journey ID from existing content or generate a new one
        journey_id_match = re.search(r'journey_map_([a-f0-9-]+)', html_content)
        if journey_id_match:
            journey_id = journey_id_match.group(1)
        else:
            # Generate a new journey ID if we can't find one
            journey_id = str(uuid.uuid4())
        
        # Add export and editing functionality script tags
        export_script_html = f"""
<script src="/static/journey_export.js"></script>
<script>
// Journey Map Editing Functionality
window.journeyMapId = '{journey_id}';
</script>
<script src="/static/journey_editor.js"></script>
"""
        
        # Add print media styles if not present
        print_styles = """
<style media="print">
    @page {{
        size: landscape;
        margin: 1cm;
    }}
    body {{
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }}
    .journey-map {{
        page-break-inside: avoid;
    }}
    .journey-stage {{
        page-break-inside: avoid;
    }}
    .journey-timeline {{
        overflow: visible !important;
    }}
    .container {{
        max-width: none !important;
        width: 100% !important;
        padding: 0.5cm !important;
    }}
    .export-panel {{
        display: none !important;
    }}
}
</style>
"""
        
        # No summary insertion
        
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
    .journey-timeline {{
        min-width: unset !important;
        overflow-x: visible !important;
    }}
    @media print {{
        .journey-timeline {{
            transform: none !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
        }}
    }}
</style>
"""
        
        if "</head>" in html_content:
            html_content = html_content.replace("</head>", f"{timeline_styles}</head>")
        
        return html_content
        
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