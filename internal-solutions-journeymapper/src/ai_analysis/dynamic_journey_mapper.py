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
    from src.ai_analysis.content_selector import remove_section_from_html
except ImportError:
    # Handle relative imports when running from different locations
    try:
        from utils.vector_store import init_vector_store
        from data_ingestion.data_processor import DataProcessor
        from ai_analysis.content_selector import remove_section_from_html
    except ImportError:
        # Fallback if imports fail
        init_vector_store = None
        DataProcessor = None
        
        # Define remove_section_from_html inline if import fails
        def remove_section_from_html(html_content, class_name, tag_types=["div", "section"]):
            """Remove sections from HTML based on CSS class names"""
            import re
            modified_html = html_content
            
            # Process for each tag type
            for tag_type in tag_types:
                pattern = rf'<{tag_type}[^>]*class="[^"]*\b{re.escape(class_name)}\b[^"]*"[^>]*>.*?</{tag_type}>'
                modified_html = re.sub(pattern, '', modified_html, flags=re.DOTALL)
                
                pattern_single = rf"<{tag_type}[^>]*class='[^']*\b{re.escape(class_name)}\b[^']*'[^>]*>.*?</{tag_type}>"
                modified_html = re.sub(pattern_single, '', modified_html, flags=re.DOTALL)
            
            return modified_html

def add_context_section(context_text):
    """Helper function to add context section header to avoid f-string escape issues"""
    return "ADDITIONAL CONTEXT FROM VECTOR SEARCH:\n" + context_text + "\n"

# Constants for API limits - Claude models
CLAUDE_MAX_INPUT_TOKENS = 200000  # Claude 4.5 allows up to 200K tokens input
CLAUDE_MAX_OUTPUT_TOKENS = 64000  # Maximum for Claude 4.5 Opus
CLAUDE_MAX_DETAILED_ITEMS = 15    # Maximum number of detailed items to include in data

class DynamicJourneyMapper:
    def __init__(self, anthropic_model=None, debug_mode=True, use_rag=True, brand=None, artifact_type=None, render_mode=None, include_metrics=False):
        # Use environment variable or default to the Sonnet model
        # 2026-06-03 — fallback bumped off the RETIRED claude-3-7-sonnet (officially
        # retired) to claude-sonnet-4-6 (current, non-deprecated, 1M-token, fast).
        # HiC journey/blueprint generation passes llm_model explicitly (e.g.
        # gemini-3.5-flash); this is the safety default when none is provided.
        self.anthropic_model = anthropic_model or os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")
        self.debug_mode = debug_mode
        self.logger = logging.getLogger(__name__)
        self.use_rag = use_rag
        # 2026-05-26 — Artifact type ('journey' | 'blueprint' | 'competitive' |
        # 'tech-arch' | 'personas' | ...). The journey-mapper is now a UNIVERSAL
        # branded artifact renderer: the shared brand + quality bar (stark white,
        # WCAG contrast, no meta, no broken graphics, single header) applies to
        # every artifact; only the STRUCTURE contract differs per type. See
        # _artifact_contract(). Defaults to 'journey' for backward compat.
        self.artifact_type = (artifact_type or "journey").lower()
        # 2026-05-26 — Render mode ('document' | 'slides'). 'document' is the
        # continuous single-page artifact (default). 'slides' lays the SAME
        # content out as a full-viewport slide deck, one element per slide, with
        # the same brand/quality bar (the user's #artifact #slides request).
        # Set via the render_mode param; see _slide_layout_contract().
        self.render_mode = (render_mode or "document").lower()
        # 2026-05-26 — KPI/metrics dashboard is OPT-IN. Big-number stat tiles
        # (e.g. "68%", "200:1", "4/60") read as fabricated and are suspect by
        # default, even with a source label. Only include the dashboard when the
        # user explicitly requests a metrics treatment. Numbers otherwise appear
        # ONLY inside verbatim cited quotes.
        self.include_metrics = bool(include_metrics) if not isinstance(include_metrics, str) else include_metrics.lower() in ("1", "true", "yes", "on")
        # 2026-05-26 — Brand identity ('nu' | 'nxt' | None). When set, the
        # generation prompt receives a hard BRAND STYLING block so the model
        # produces an on-brand journey from the start (NU Huskies red +
        # Roboto, or NXT teal/chartreuse + Archivo/Bebas) instead of
        # inventing a generic blue palette that a post-hoc recolor can't
        # fully fix. This is the single injection the user asked for.
        self.brand = (brand or "").lower() if brand else None
        # 2026-05-26 — Single-pass by default. The two-pass (draft → deepen)
        # pipeline doubled latency (each pass is a full 64k-token generation).
        # The reasoning models (Claude Sonnet/Opus, Gemini Pro) produce a
        # complete, deep journey in ONE pass, so the second pass is now
        # opt-in via JOURNEY_TWO_PASS=1. Default off cuts wall-clock ~50%.
        self.two_pass = os.environ.get("JOURNEY_TWO_PASS", "0") == "1"
        
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
            print("✍️ Step 4: Creating optimized prompt for Claude 4.5...")
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
            self.logger.debug("Calling Anthropic Claude 4.5 API...")
            print("🤖 Step 5: Calling Anthropic Claude 4.5 API for first-pass journey map...")
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

            # 2026-05-26 — SINGLE-PASS short-circuit. The reasoning models
            # produce a complete, deep journey in one pass; the second pass
            # doubled latency for marginal gain. Return the first-pass result
            # unless JOURNEY_TWO_PASS=1 is explicitly set.
            if not self.two_pass:
                journey_summary = self._extract_summary_from_html(valid_html)
                print("✅ Single-pass complete (JOURNEY_TWO_PASS not set). Returning first-pass journey map.")
                self._save_debug_info(debug_file, "Single-pass journey map complete", {
                    'html_length': len(valid_html),
                    'journey_type': journey_type,
                    'model_used': self.anthropic_model,
                    'brand': self.brand,
                    'stages_count': len(first_journey_insights.get('stages', [])),
                })
                print(f"Final journey map contains {len(valid_html)} characters of HTML")
                print(f"Journey analysis generated with {self.anthropic_model} (single-pass)")
                return {
                    'interactive_html': valid_html,
                    'journey_summary': journey_summary,
                    'timestamp': datetime.now().isoformat(),
                }

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
        
        # Default content selection settings (show all)
        self.content_selection = {
            "summary": True,
            "stages": True,
            "painPoints": True,
            "opportunities": True,
            "insights": True,
            "recommendations": True,
            "touchpoints": True,
            "personas": True,
            "emotions": True
        }
        
        # Try to extract from metadata if available
        if isinstance(data, dict):
            metadata = data.get("metadata", {})
            context = metadata.get("context", {})
            
            title = context.get("title", title)
            description = context.get("description", description)
            journey_type = context.get("journey_type", journey_type)
            
            # Extract content selection settings if available
            if "content_selection" in data:
                self.content_selection.update(data["content_selection"])
                self.logger.info(f"Using content selection from data: {self.content_selection}")
            
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

    def _brand_style_block(self):
        """2026-05-26 — Hard brand-token block injected into the generation
        prompt. Returns '' when no brand is set (default modern aesthetic).
        NU = Northeastern Huskies red; NXT = teal + chartreuse. Fonts loaded
        via Google Fonts <link> in the <head> the model emits."""
        if self.brand == "nu":
            return """
*** MANDATORY BRAND STYLING — NORTHEASTERN UNIVERSITY (NU), STARK-WHITE EDITORIAL ***
This is a STARK WHITE editorial layout, NOT a dark dashboard. Do NOT invent a different
palette. Do NOT use blue. Match the Northeastern artifact system exactly:

SURFACES (this is the most important rule):
- PAGE BACKGROUND: #FFFFFF (pure white). The dominant surface of the ENTIRE document is white.
- SECTION/CARD SURFACE: #FFFFFF on a #F8FAFC (near-white) canvas. Cards are white with a thin #E2E8F0 (1px) border, NOT dark fills.
- DARK BANDS ARE RARE: use the dark band (#0B1326) for AT MOST the top masthead strip and the bottom footer/source-index band. NEVER render the hero summary, the pain-points section, the opportunities section, or the phase cards as large dark panels. Those are WHITE sections with dark text.

TEXT COLOR — CONTRAST IS NON-NEGOTIABLE (WCAG AA, 4.5:1 minimum):
- BODY TEXT ON WHITE: #141D30 (near-black ink). This is the default for nearly all text.
- HEADINGS ON WHITE: #0B1326.
- MUTED/CAPTION ON WHITE: #475569 (still 4.5:1+ on white). NEVER lighter than #64748B on white.
- ON ANY DARK BAND: every word is pure #FFFFFF or #F5F5F5. ABSOLUTELY FORBIDDEN: grey, ink, or dark-on-dark text on a dark band. The single worst failure is a dark hero where connecting words ("applies to", "waits", "for an offer") are dark grey and invisible. If a band is dark, 100% of its text including connective words is white.

ACCENT:
- Huskies Red #C8102E: focal numbers, the emotion line/curve, eyebrow labels, pull-quote rules, active markers, emphasis. Use red as INK on white, never as a giant red fill behind body text.
- Pale red tint #FCEAEC only for small chips/badges, never large panels.

FONTS:
- DISPLAY / HEADINGS: 'Spectral', serif (300 weight for large display, 600 for emphasis).
- BODY: 'Roboto', sans-serif (400-500).
- MONO / LABELS: 'Roboto Mono', monospace, uppercase, 10-12px, letter-spacing 2px, color #C8102E for eyebrows.
- Load in <head>: <link href="https://fonts.googleapis.com/css2?family=Spectral:wght@300;400;600&family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">

NU LAYOUT CONTRACT (fixes known failure modes):
- HEADER: lead DIRECTLY with the diagnostic action-title in Spectral on white, then one short standfirst paragraph in #141D30. NO eyebrow metadata strip, NO slash-separated mono-label row, NO duplicate summary band. A tiny plain "Northeastern" wordmark is optional; nothing else above the title.
- NO EMOTION CURVE / NO GRAPHS: do NOT draw an emotion curve, stress line, sparkline, SVG arc, or any line/area chart. The emotional arc never renders usefully and is BANNED. Emotion appears only as a short text label inside each phase card.
- ONLY ONE DARK ELEMENT: the single thin top masthead strip may be dark navy (#0B1326) with small white mono labels. EVERY OTHER SECTION is white/near-white with dark ink. Do NOT render the source index, the footer, the synthesis, or any large content band as a dark panel. The repeated failure is a dark source-index/footer band with dark ink text on it (invisible). FIX: the SOURCE INDEX is a WHITE section, dark ink (#141D30) body, red mono eyebrows; never dark-on-dark. If you ever do place text on a dark surface, 100% of that text including headings and body is pure #FFFFFF.
- PAIN / OPPORTUNITY SYNTHESIS: white cards on white canvas, dark ink text, red eyebrow for pains and a dark-green (#276749) eyebrow for opportunities. NOT a dark section.
- NO SELF-REFERENTIAL / META LANGUAGE: section headings and standfirsts describe the JOURNEY and its EVIDENCE, never the artifact itself. FORBIDDEN phrasings: "Every quote, every number, traceable", "This map traces", "This journey shows", "this analysis", "this report", or any sentence describing the document's own properties, traceability, or how it was generated. Name the source index "Source Index" with NO editorial tagline.
- Generous whitespace, thin 1px #E2E8F0 dividers, 2-4px corners, no drop shadows.
- NEVER emit em-dash characters (U+2014). Use comma, semicolon, period.
"""
        if self.brand == "nxt":
            return """
*** MANDATORY: BUILD WITH THE NXT ARTIFACT DESIGN SYSTEM (2026), STARK-WHITE ***
A complete stark-white component stylesheet, an icon sprite, the real NXT HUMANS
wordmark, and a working-tabs script are AUTOMATICALLY INJECTED into this document.
Your job is to emit semantic HTML that USES these exact classes. Do NOT write your
own <style> theme, do NOT set background colors in inline styles, do NOT load your
own fonts. The system already handles all visual styling. If you fight it with your
own dark CSS it will be stripped.

SURFACE RULE (non-negotiable): the ENTIRE document is WHITE (#FFFFFF) with near-black
ink (#141414). There is NO dark dashboard, NO dark cards, NO dark panels. Dark appears
ONLY through the intentional block classes below (which carry white text automatically).
NEVER place dark text on a dark background. NEVER invent a tiny "N" or "NXT" box logo.

BRAND TOKENS (already in the CSS, do not redeclare): teal #115054, lime #CACA20,
ink #141414, paper #FAFAFA, hairline #EAEAEA. Display font Saira Condensed (the
Agency FB substitute), body font Archivo (Light/ExtraLight), mono JetBrains Mono.

REQUIRED DOCUMENT SHELL:
<header class="nxt-masthead"><span class="nxt-logo">NXT HUMANS</span><span class="nxt-masthead__label">ARTIFACT TYPE</span></header>
(The .nxt-logo span renders the real wordmark via the injected CSS. Always use it; never an SVG or text substitute.)
Then, if the artifact has sections/views, a tab bar:
<nav class="nxt-tabs" data-tabs><button class="nxt-tab" data-tab="x" aria-selected="true">Label</button>...</nav>
<div data-tabs-scope><section class="nxt-panel" data-panel="x" data-active="true">...</section>...</div>
(The injected JS makes these tabs work. Match each data-tab to a data-panel. Tabs are
only for artifacts with real distinct views, e.g. tech-audit, architecture, org, meta-themes.)
Then a hero: <section class="nxt-hero nxt-wrap"><p class="nxt-eyebrow">LABEL</p><h1 class="nxt-hero__title">Action title</h1><p class="nxt-hero__standfirst">One standfirst sentence.</p></section>
Wrap content sections in <section class="nxt-section nxt-wrap">...</section>.
End with <section class="nxt-section nxt-wrap nxt-source-index"><ul><li><span class="sname">Source.</span> note</li>...</ul></section>
and <footer class="nxt-footer"><span class="nxt-logo nxt-logo--sm">NXT HUMANS</span><span>Artifact type</span></footer>.

COMPONENT VOCABULARY (use these classes, do not invent dark equivalents):
- Headings: .nxt-h2, .nxt-h3, eyebrow .nxt-eyebrow, display caps .nxt-display, prose .nxt-prose
- Cards/grid: .nxt-card (.nxt-card__label/.nxt-card__title/.nxt-card__body) inside .nxt-grid.nxt-grid--2|3|4
- Stats (opt-in only): .nxt-stat (.nxt-stat__fig/.nxt-stat__label/.nxt-stat__src)
- Quote: .nxt-quote (.nxt-quote__text/.nxt-quote__cite)
- Chips: .nxt-chip, .nxt-chip--status, .nxt-chip--accent, .nxt-chip--source
- Table: .nxt-table (light header, NEVER a black header bar)
- Intentional color blocks (ONLY way to use dark/color): .nxt-block.nxt-block--teal | --ink | --lime
- Icons: <svg class="nxt-ico"><use href="#i-NAME"></use></svg> where NAME is one of
  user team building data gear network chart search target flow shield idea calendar doc chat arrow check layers clock alert grid
- Infographics: .nxt-process (numbered steps), .nxt-quadrant, .nxt-bars/.nxt-bar, .nxt-donut, .nxt-funnel, .nxt-tiers, .nxt-iconstat, .nxt-compare, .nxt-numlist
- Tech diagrams: .nxt-flow + .nxt-flow__node/.nxt-flow__arrow, .nxt-hub + .nxt-hub__center/.nxt-hub__spoke, .nxt-layer + .nxt-component
- Artifact modules: .nxt-timeline/.nxt-phase, .nxt-swimlane, .nxt-matrix/.nxt-strength, .nxt-persona, .nxt-userstory, .nxt-horizons/.nxt-horizon, .nxt-gap, .nxt-org, .nxt-kernel, .nxt-rec, .nxt-callout, .nxt-dialog/.nxt-bubble, .nxt-theme
- Slides (#slide/#slides): .nxt-slide (+ --title/--divider/--closing/--quote/--image/--split), .nxt-slide__kicker/__title/__body/__logo

NO GRAPHS drawn as SVG arcs/curves; use the infographic primitives above. Sharp 2px
corners, generous whitespace, no shadows. NEVER emit em-dash (U+2014). NO emoji.
NO metadata chrome (no Plan Hash, Version, HUMAN CHECKPOINT, "N selected from M",
methodology names). Lead with the insight; describe the EVIDENCE, never the document.
"""
        return ""

    def _writing_quality_contract(self):
        """Shared writing-quality rules applied to EVERY artifact, regardless of
        brand or type. Fixes the AI-slop the user flagged 2026-05-26: quant-
        crammed action titles and self-referential preview standfirsts."""
        if self.include_metrics:
            metrics_policy = """
*** METRICS POLICY: DASHBOARD REQUESTED (opt-in is ON) ***
A metrics treatment was explicitly requested, so you MAY include a KPI/stat dashboard. Even so:
every numeric tile must be a REAL figure that a named source stated, rendered with that source
attribution on the tile (e.g. "11 weeks, Source: 2025 Customer Benchmark Survey"). Never invent or compute
a stat. Prefer 3-4 tiles. If a figure was not actually stated by a source, use a qualitative tile instead.
"""
        else:
            metrics_policy = """
*** METRICS POLICY: NO DASHBOARD (default) ***
Do NOT create a KPI/stat dashboard or big-number tiles (e.g. "68%", "200:1", "4/60", "11 wks").
Big hoisted numbers read as fabricated and are suspect, even with a source label. OMIT the metrics
dashboard entirely. Quantitative facts appear ONLY inside verbatim cited quotes in the evidence
sections, never as headline stat tiles. (A metrics dashboard is opt-in and was NOT requested here.)
"""
        return metrics_policy + """
*** WRITING QUALITY CONTRACT (APPLIES TO ALL TEXT, NON-NEGOTIABLE) ***
Write like a senior consultant briefing a partner: clear, concise, specific, no decoration.
- ACTION TITLE: ONE plain declarative sentence stating the single most important conclusion (a
  judgment), with NO standalone number in it. The Partner Test: a reader seeing only the title
  grasps the finding without effort.
  BAD (quant-crammed): "A 200:1 support ratio is being patched by an LLM triage layer in front of the help desk, where 60 tickets return 4 resolutions."
  BAD (naked number): "One support rep for every 200 accounts leaves new customers to navigate setup alone."
  GOOD (qualitative judgment): "One overstretched support rep cannot carry a new customer through setup alone."

*** QUANTITATIVE CLAIM RULE (CRITICAL, applies to ALL text) ***
Do NOT state standalone quantitative claims (percentages, ratios, counts, dollar figures,
durations-as-metrics, "Nx", "N%", "N-to-M") as YOUR OWN assertion anywhere: titles, headings,
prose, KPI/metric tiles, pain or opportunity statements, captions, synthesis. A naked number
reads as fabricated and is the worst AI-slop tell.
- A number may appear ONLY inside a VERBATIM quote with inline source attribution. If a real
  source said it, show it in that quote's context. Allowed: a pull quote "I sent 60 follow-ups
  and heard back from 4." with "Source: Customer Forum". FORBIDDEN: the same "60-to-4" as a title,
  heading, KPI tile, or narrative sentence.
- Default to QUALITATIVE language everywhere else: name the pattern (FRAGMENTED, PERSISTENT,
  SCARCE, ONE-TO-MANY), the system, or the proper noun, never the statistic.
- THIS INCLUDES NUMBERS BURIED IN SYNTHESIS / STANDFIRST PROSE, not just titles and tiles.
  BAD (naked ratio in prose): "the system produces a poorly timed webinar, a thousand-item feed, and a 200-to-1 support ratio."
  GOOD (qualitative): "the system produces a badly timed webinar, an unfilterable feed, and a support team stretched across far too many accounts."
  If a specific number matters, move it into a cited verbatim quote; do not assert it in your own sentence.
- When a contract below says "with a number" or "KPI tiles with real numbers", OVERRIDE it: use a
  qualitative descriptor, OR render the number only as a cited verbatim quote.
- FINAL SELF-SCAN before emitting: re-read every sentence that is NOT inside a quotation-marked,
  source-attributed quote. If it contains a digit, %, ratio (N:M or N-to-M), or $ figure, REWRITE
  it qualitatively. Numbers survive ONLY inside cited quotes. This scan is mandatory.

*** CITATION INTEGRITY (CRITICAL) ***
Every "Source:" attribution MUST name a REAL EXTERNAL source that appears in the supplied evidence
(a named publication, platform, subreddit, report, or document). NEVER cite the analysis pipeline's
own internal passes or prior deliverables as a source. ABSOLUTELY FORBIDDEN as a citation, anywhere:
"Tri-Model Synthesis", "Tri-Model", "Synthesis", "Highlights", "Gaps section", "Pre-Analysis",
"the corpus", "the record", "the material", "Themes", "Personas", "Prior Findings", "intelligence_sources".
A block labeled "INTERNAL PRE-ANALYSIS" or "PRIOR FINDINGS (context only)" is orientation, NOT a source:
you may USE it to understand the material, but you must trace every quote and claim back to the named
EXTERNAL source it actually came from. If a claim cannot be traced to a real external source, OMIT it
rather than invent a citation or cite an internal pass.
Quotes must be VERBATIM voice from a real source with a complete sentence. NEVER render an LLM artifact
as a quote (e.g. "please provide the content of Part N/M", "as an AI", "continue the analysis", a label
dump like "Pre-Built Agents Prompt Library Governance Tools"). If the only available "quote" is a
fragment or a label dump, do not render a quote block for that point.

*** NO METADATA CHROME (CRITICAL) ***
The reader sees a finished consulting artifact, never a build trace. Do NOT render ANY micro-metadata
strip, eyebrow row, masthead field, or footer field that exposes the artifact's inputs, scoring, or
internal structure counts. SPECIFICALLY FORBIDDEN anywhere in the document:
- input/corpus filenames or labels: "CORPUS / hic-corpus.txt", "hic-corpus.txt", "Corpus:", "Input file:", "N = 1 CORPUS"
- model-generated scores: "OVERALL RATING / 78%", "OVERALL SENTIMENT 78%", "Sentiment score", any rating/score
- structure/evidence-count metadata: "PERSONA COUNT / 4 DISTINCT TYPES", "N DISTINCT TYPES", "PHASE COUNT", "STEP COUNT", "EVIDENCE BASE / 11 PARAGRAPHS", "5 EVIDENCE PARAGRAPHS", "N SOURCE CHANNELS", "WINDOW MONTHS 1, 7"
- run/pipeline stamps: "Run ID", "Pipeline version", "Generated with <model>", confidence labels.

*** NO EYEBROW METADATA STRIP ***
Do NOT render the slash-separated mono-label "eyebrow" strip across the top (e.g.
"ACME CORP / EXPERIENCE RESEARCH | PERSONA SET / NEW CUSTOMER | N = 1 CORPUS / 5 EVIDENCE PARAGRAPHS").
No one reads it and it reads as AI chrome. The document LEADS with the action title. A header, if any,
is at most a small plain brand wordmark on its own; it carries NO slash-separated category labels, NO
artifact-type tag, NO corpus/evidence counts. The named sources live ONLY in the SOURCE INDEX at the end.
- STANDFIRST / INTRO PROSE: state a SUBSTANTIVE FINDING, never a table of contents. It must NOT
  preview or describe the artifact's own structure or sourcing.
  BANNED openers and phrases (and anything like them): "Below is...", "Here is...", "The following...",
  "This map/blueprint/analysis/architecture...", "evidenced in the corpus", "from the corpus",
  "drawn from the sources", "the sections below", "as shown", "this document".
  ABSOLUTELY BANNED, self-referential sourcing language (the reader must NEVER see the model's
  awareness of its own inputs): "the corpus suggests", "the corpus shows", "the corpus reveals",
  "the corpus indicates", "what the corpus suggests", "the corpus already suggests", "the data
  shows/suggests", "the research suggests", "the evidence suggests", "the findings show",
  "the sources indicate", "according to the corpus/data/research", "based on the corpus".
  Write the CLAIM directly. "What the corpus already suggests will work" becomes "What will work".
  "The corpus shows churn is the core failure" becomes "Churn is the core failure".
  If you catch yourself listing what the artifact contains or naming where a claim came from in
  the body prose, delete that framing and state the finding plainly. (Inline source attribution on
  a specific quote, e.g. "Source: Customer Forum", is fine; sentence-level "the corpus suggests" is not.)
- VERBS: use plain verbs. BANNED purple/copula-avoidance verbs: threads, weaves, knits, patches together,
  serves as, stands as, marks, represents (a/the), embodies, leverages, harnesses, orchestrates, underpins.
  Say "is/are/has" plainly. "The stack has four layers" not "The stack threads four layers".
- Cut hedges, filler, and AI-slop (delve, robust, comprehensive, pivotal, seamless, holistic, tapestry,
  landscape, navigate). Every sentence earns its place. Prefer the short word and the active voice.
- NO EMOJI, ANYWHERE (HARD BAN). Never emit emoji or pictographic characters (faces, arrows-as-emoji,
  checkmarks, stars, flags, hourglasses, warning signs, etc.) in any title, label, card, bullet, KPI,
  emotion indicator, or body text. Use plain words and brand-color cues instead. This is absolute.
"""

    def _artifact_contract(self):
        """Return the per-artifact STRUCTURE + richness contract for
        self.artifact_type. The shared brand/quality bar lives in
        _brand_style_block(); this defines what the artifact IS (its sections,
        its required counts, its layout) so one renderer can produce a journey,
        a service blueprint, a competitive matrix, etc. with equal depth."""
        at = self.artifact_type

        journey_contract = """
*** COMBINED SINGLE-PASS DEPTH CONTRACT (NON-NEGOTIABLE) ***
This ONE pass replaces the legacy two-pass pipeline: you must do internally what the
old generate-then-deepen flow did across two calls. A thin journey is a failure.

STEP A (draft, internal): map the obvious journey from the data.
STEP B (critique, internal): interrogate your own draft. Which stages did you miss or
under-emphasize? Which pains are stated generically instead of with severity AND
frequency? Which phases have a weak or missing voice-of-user quote? Where is the
emotional read shallow? Fix all of it.
STEP C (emit): output ONLY the improved journey as a single complete HTML document.
Never show Step A or Step B; the reader sees only the deepened result.

RICHNESS FLOORS, meet ALL of them:
- PHASES: 4 to 6 phases. Each phase is a concrete behavioral event (e.g. "Application submission", "Interview cycle"), NEVER a gerund category.
- ACTIVITIES PER PHASE: at least 3 specific activities per phase, each a complete sentence (subject + verb + outcome).
- PAIN POINTS: at least 1 named pain per phase carrying BOTH severity (how much it hurts) and frequency (how often / how many it affects), anchored to a number, a system name, or a proper noun. No generic "poor UX". Aim for 6+ distinct pains across the journey.
- EVIDENCE QUOTES, PLENTY PER PHASE: 2 to 3 VERBATIM voice-of-user quotes in EVERY phase, pulled word-for-word from the corpus, each with inline source attribution (e.g. "Source: Customer Forum"). NEVER fabricate, paraphrase, or stitch a quote. If the corpus genuinely offers only one usable quote for a phase, use one; never drop below one when the corpus has material. Aim for 12+ verbatim quotes across the journey. Additionally, surface 1 PULL QUOTE per phase: the single most impactful line, rendered large and visually distinct.
- TOUCHPOINTS: name the specific system/channel at each phase (the actual named systems the corpus references).
- EMOTION (NO GRAPH): give one emotion word + a one-clause psychological reason per phase, rendered as a small inline label inside that phase's card. DO NOT plot an emotion/stress curve, line chart, sparkline, or SVG arc anywhere. The emotional arc as a graphic is BANNED; it never renders usefully. Emotion lives as text in the phase, nothing more.
- KPI DASHBOARD: (see METRICS POLICY: a KPI/stat dashboard is OFF by default and omitted entirely unless a metrics treatment was explicitly requested). If a number would be invented, use a qualitative display word (FRAGMENTED, MULTIPLE, PERSISTENT) instead.
- OVERALL PAIN POINTS + STRATEGIC OPPORTUNITIES: 3-5 journey-level entries each (cross-cutting, not per-phase), each opportunity actionable and tied to a named pain.
- ONE diagnostic action-title naming the central tension as a QUALITATIVE judgment (no standalone number in the title; any figure rides only in a cited body quote), optionally anchored to a named entity from the corpus.
LAYOUT: use the full viewport width efficiently, avoid large empty bands, and keep the
timeline horizontal so phases read left to right.
Final self-check: if any floor is unmet, EXPAND before returning. Use close to the full token budget.
"""

        blueprint_contract = """
*** SERVICE BLUEPRINT DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a SERVICE BLUEPRINT, NOT a timeline journey map. IGNORE any instruction below that
mentions an emotion curve, a single emotion track, or a phase-by-phase emotional arc. A
service blueprint is a LAYERED GRID: columns are sequential service steps, rows are the
service layers stacked across the LINE OF VISIBILITY and the LINE OF INTERNAL INTERACTION.

STEP A (draft, internal): lay out the service steps and the layer for each.
STEP B (critique, internal): which backstage actions or support systems did you omit?
Which cells are vague instead of naming a real actor, system, or number? Which fail points
lack evidence? Fix all of it before emitting.
STEP C (emit): output ONLY the improved blueprint as one complete HTML document.

STRUCTURE (build as a CSS-GRID table, columns = steps, rows = layers; never SVG with
absolute coordinates):
- COLUMNS: 5 to 7 sequential SERVICE STEPS (concrete events, left to right).
- ROW 1 PHYSICAL EVIDENCE / CHANNEL: the tangible touchpoint at each step (portal, email, office).
- ROW 2 CUSTOMER ACTIONS: what the user does at each step (complete sentence).
- ===== LINE OF VISIBILITY (render as a labelled divider rule) =====
- ROW 3 FRONTSTAGE (visible staff / interface actions): who/what the user interacts with.
- ===== LINE OF INTERNAL INTERACTION =====
- ROW 4 BACKSTAGE (employee actions the user never sees).
- ROW 5 SUPPORT PROCESSES / SYSTEMS: the systems and teams enabling each step (name them).
RICHNESS FLOORS:
- Every cell is concrete: a named actor, system, or number, never a generic verb.
- FAIL POINTS: mark at least 4 fail points / bottlenecks on the grid (rust/red marker) with a one-line evidenced reason (severity + frequency).
- EVIDENCE QUOTES: 4+ VERBATIM corpus quotes total with inline source attribution, placed against the step they evidence. Never fabricate.
- METRICS: (see METRICS POLICY: a KPI/stat dashboard is OFF by default and omitted entirely unless a metrics treatment was explicitly requested) (or a qualitative word if no number exists).
- ONE diagnostic action-title naming the central service-delivery tension as a QUALITATIVE judgment (no standalone number in the title; any figure rides only in a cited body quote), optionally anchored to a named entity.
- A short "where it breaks + what to fix" synthesis: 3-5 fail points paired with 3-5 redesign moves, each move tied by name to a fail point.
Final self-check: if any layer or floor is empty, EXPAND before returning. Use close to the full token budget.
"""

        competitive_contract = """
*** COMPETITIVE ANALYSIS DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a COMPETITIVE ANALYSIS, NOT a timeline journey. IGNORE any instruction about an
emotion curve, phases, or an emotional arc. Build a COMPARISON MATRIX plus a positioning read.

STEP A (draft, internal): identify the real players and the dimensions that decide the market.
STEP B (critique, internal): which players or dimensions did you omit? Which cells are vague
instead of an evidenced capability or gap? Where is the "so what" missing? Fix it.
STEP C (emit): output ONLY the improved analysis as one complete HTML document.

STRUCTURE (use .nxt-matrix; never SVG with absolute coordinates):
- COMPETITORS / ALTERNATIVES: 4 to 7 REAL, SPECIFICALLY NAMED players from the corpus
  as the matrix ROW HEADERS (the actual named organizations, products, vendors, or
  programs the corpus mentions). NAMING IS MANDATORY: a competitive
  analysis with zero named competitors is an OUTRIGHT FAILURE, re-scan the corpus for every
  organization, program, vendor, or alternative it names and use them. NEVER use generic
  placeholders ("Competitor A", "Vendor X", "Other programs"). The rivals are whatever the
  corpus and the research objective actually name as alternatives to the subject.
  Use the .nxt-strength bars (leader/parity/gap) for cell encoding.
- EVALUATION DIMENSIONS: 4 to 6 dimensions that actually decide buyer choice (columns).
- Each cell: a concrete, evidenced capability or gap (a feature, a number, a named limitation), never a generic "strong/weak".
- Optionally encode each cell with a strength marker (leader / parity / gap) using brand-accent intensity, never red-vs-green only (accessibility).
RICHNESS FLOORS:
- POSITIONING READ: one paragraph naming where the subject WINS and where it LOSES, each tied to a dimension and evidence.
- WHITE SPACE / OPPORTUNITY: 3-5 unmet needs no player serves well, each evidenced.
- EVIDENCE QUOTES: 4+ VERBATIM corpus quotes with inline source attribution, placed against the claim they support. Never fabricate.
- METRICS: (see METRICS POLICY: a KPI/stat dashboard is OFF by default and omitted entirely unless a metrics treatment was explicitly requested) (or a qualitative word if none exists).
- ONE diagnostic action-title naming the competitive tension as a QUALITATIVE judgment (no standalone number in the title; any figure rides only in a cited body quote), optionally anchored to a named entity or named rival.
Final self-check: if the matrix is thin or the positioning read is generic, EXPAND before returning.
"""

        tech_arch_contract = """
*** TECHNICAL ARCHITECTURE DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a TECHNICAL ARCHITECTURE, NOT a timeline journey. IGNORE any instruction about an
emotion curve, phases, or an emotional arc. Build a LAYERED ARCHITECTURE as STACKED CSS-GRID
BANDS, never an SVG node-graph with absolute coordinates (those collide and fail to render).

STEP A (draft, internal): identify the layers and the real components in each.
STEP B (critique, internal): which components, data flows, or integration points did you omit?
Which boxes are generic instead of a named system? Where are the risks unstated? Fix it.
STEP C (emit): output ONLY the improved architecture as one complete HTML document.

STRUCTURE (stacked horizontal layer bands, top to bottom):
- 4 to 6 LAYERS (e.g. Experience / Presentation, Application & Services, Data & Integration, Infrastructure & Platform, Security & Governance as a cross-cutting rail).
- Each layer is a full-width band containing 3+ COMPONENT CARDS naming REAL systems/services from the corpus.
- DATA FLOW: describe how data moves between ADJACENT layers in TEXT or with short labeled connectors that terminate at box edges (16px exclusion zone, no line crossing a box). Prefer top-to-bottom reading order over drawn arrows.
RICHNESS FLOORS:
- INTEGRATION POINTS: name 3-5 real integrations / interfaces between systems.
- RISKS / CONSTRAINTS: 3-5 architectural risks or constraints, each evidenced (a bottleneck, a single point of failure, a scaling limit) with severity.
- EVIDENCE QUOTES: 3+ VERBATIM corpus quotes with source attribution where the corpus supports a technical claim. Never fabricate.
- METRICS: (see METRICS POLICY: a KPI/stat dashboard is OFF by default and omitted entirely unless a metrics treatment was explicitly requested) (or a qualitative word).
- ONE diagnostic action-title naming the central architectural tension as a QUALITATIVE judgment (no standalone number in the title; any figure rides only in a cited body quote), optionally anchored to a named entity or named system.
Final self-check: if any layer is empty or components are generic, EXPAND before returning.
"""

        personas_contract = """
*** PERSONAS DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a PERSONA SET, NOT a timeline journey. IGNORE any instruction about an emotion curve,
phases, or a single emotional arc. Build a set of PERSONA CARDS.

STEP A (draft, internal): identify the distinct user types the corpus actually evidences.
STEP B (critique, internal): are these real distinct segments or one persona split in two?
Which goals/pains are generic instead of evidenced? Are the quotes verbatim? Fix it.
STEP C (emit): output ONLY the improved persona set as one complete HTML document.

STRUCTURE (use the .nxt-persona module, one card per persona):
- 2 to 4 PERSONAS, each a distinct, evidenced user type. Lead with GOALS, not demographics.
- Emit each as: <div class="nxt-persona"><div class="nxt-persona__avatar">INITIALS</div><div>... card body ...</div></div>
  The avatar is a flat MONOGRAM (the persona's two initials) rendered by the system CSS.
  Do NOT use a generated photo, an emoji, a stock avatar, a 3D/gradient icon, or any
  decorative illustration. The monogram is the only avatar. (The previous AI-photo
  approach read as slop and is REMOVED.)
- Inside the card body: <div class="nxt-persona__name">Goals-first name</div>
  <div class="nxt-persona__arch">Archetype label</div>, then labeled blocks using
  <div class="nxt-persona__k">GOALS</div><p class="nxt-card__body">...</p> for each of:
  CONTEXT (one sentence), GOALS (2-3), BEHAVIORS (2-3), PAIN POINTS (2-3 named, severity+frequency), NEEDS (2-3).
- NO persona NUMBERING or index label ("PERSONA 01", "Persona type: Primary"). Name only.
- NO SEGMENT-SIZE STAT ("SEGMENT ~ 68%", "N%"). Fabricated metadata, BANNED. Describe in words.
RICHNESS FLOORS:
- VERBATIM QUOTES: each persona carries 2 to 3 VERBATIM voice-of-user quotes pulled word-for-word from the corpus with inline source attribution, plus ONE large PULL QUOTE that defines the persona. NEVER fabricate, paraphrase, or composite a quote. (This is the single most important persona rule.)
- CROSS-PERSONA INSIGHT: one paragraph on what unites or divides the personas and the design implication.
- METRICS: (see METRICS POLICY: a KPI/stat dashboard is OFF by default and omitted entirely unless a metrics treatment was explicitly requested) (segment size, frequency) or a qualitative word if none exists.
- ONE diagnostic action-title naming the central user tension as a QUALITATIVE judgment (no standalone number in the title; any figure rides only in a cited body quote), optionally anchored to a named entity.
Final self-check: if a persona lacks verbatim quotes or reads generic, EXPAND or merge before returning.
"""

        prd_contract = """
*** PRODUCT REQUIREMENTS (PRD) DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a PRD, NOT a journey, an essay, or a slide of themes. A PRD without user
stories and testable requirements is an OUTRIGHT FAILURE. Build a real PRD.
STRUCTURE:
- PROBLEM + OBJECTIVE: 2-3 sentences naming the user problem and the product objective.
- USER STORIES: 5 to 8, each as a .nxt-userstory block in the exact form
  "As a <specific role>, I want <capability>, so that <outcome>", each with a
  <div class="nxt-userstory__ac">Acceptance: <testable criterion></div>.
- REQUIREMENTS TABLE: a .nxt-table with columns Requirement | Priority (P0/P1/P2 as
  .nxt-chip) | Acceptance criteria. 8+ functional requirements, concrete and testable.
- NON-FUNCTIONAL: 3-5 (performance, accessibility, privacy, scale) as cards.
- OUT OF SCOPE: 3-4 explicit exclusions.
- DEPENDENCIES / RISKS: 3-4, each named.
Every requirement is specific and verifiable. NO vague "the system should be good".
"""
        org_contract = """
*** ORG / OPERATING-MODEL DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is an ORG CHART / operating model. It MUST actually RENDER the hierarchy as boxes
and connectors, not describe it in prose. An org artifact without a visible chart is an
OUTRIGHT FAILURE. Use the .nxt-org module (collision-free CSS grid, never absolute SVG):
STRUCTURE:
- A clear hierarchy: a top sponsor/owner row, then 2-4 levels below it.
- Each node: <div class="nxt-org__node"><div class="nxt-org__name">Role/Team</div><div class="nxt-org__role">Mandate</div></div>
- Group sibling nodes in <div class="nxt-org__row">...</div>; connect levels with <div class="nxt-org__connector"></div>.
- 8-14 real nodes drawn from the corpus (teams, roles, functions the corpus names).
- RACI / OWNERSHIP: for the 4-6 key functions, name who is Responsible and Accountable (a small .nxt-table is fine).
- GAPS: 2-3 capability or ownership gaps in the current structure, each evidenced.
"""
        gap_contract = """
*** GAP ANALYSIS DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a GAP ANALYSIS (current vs target). Use .nxt-gap rows (current | target) plus impact.
STRUCTURE:
- 5 to 8 GAPS. For each: a .nxt-gap block with .nxt-gap__cur (current state) and .nxt-gap__tgt (target state).
- GAP IMPACT (mandatory, per learned constraint): for each gap, name the AFFECTED SYSTEM,
  TEAM, or STAKEHOLDER and the concrete OPERATIONAL CONSEQUENCE. Any figure appears ONLY
  inside a cited verbatim quote, never as a bare number.
- PRIORITY: tag each gap effort/impact with a .nxt-chip; optionally place gaps on a .nxt-quadrant.
- CLOSURE MOVES: 3-5, each tied by name to a specific gap.
"""
        tech_audit_contract = """
*** TECHNOLOGY AUDIT DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a SYSTEMS / TECH AUDIT. Use WORKING TABS (.nxt-tabs + data-tabs + .nxt-panel) for the
views and a LIGHT-HEADER .nxt-table (never a black header bar).
VIEWS (tabs): Systems Inventory | Integration Map | Capability Matrix | Consolidation & Actions.
- SYSTEMS INVENTORY: .nxt-table of 6+ named systems (System | Role | Owner | State chip Legacy/Active/At-risk).
- INTEGRATION MAP: a .nxt-flow or .nxt-hub diagram of how the named systems connect (collision-free).
- CAPABILITY MATRIX: .nxt-bars or .nxt-matrix scoring capabilities (qualitative: Leading/Strong/Emerging/Gap).
- CONSOLIDATION & ACTIONS: 4-6 consolidation moves, each naming the systems it affects.
- RISKS: 3-5 named (single points of failure, legacy lock-in), each evidenced.
"""
        roadmap_contract = """
*** ROADMAP DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a ROADMAP. Use the .nxt-horizons module (Now | Next | Later columns).
- 3 HORIZONS, each with 3-5 .nxt-horizon__item cards.
- Per learned constraint, EVERY item carries a specific SUCCESS METRIC with a NAMED BASELINE
  and a TIMEFRAME (the measurement four-tuple), so each is verifiable, not aspirational.
  Numbers ride only inside cited quotes; otherwise describe the metric qualitatively with its baseline named.
- DEPENDENCIES: note what each later item depends on from an earlier one.
- One diagnostic action-title naming the sequencing logic.
"""
        strategy_contract = """
*** STRATEGY DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a STRATEGY built on Rumelt's kernel. Use the .nxt-kernel module.
- DIAGNOSIS: .nxt-kernel__step naming THE central challenge with specific evidence.
- GUIDING POLICY: .nxt-kernel__step stating the approach as a DECISION (not a goal).
- COHERENT ACTIONS: .nxt-kernel__step with 5-7 actions that reinforce each other.
- EVIDENCE: 3+ verbatim cited quotes anchoring the diagnosis.
- TRADE-OFFS: 2-3 things this strategy explicitly chooses NOT to do.
"""
        recommendation_contract = """
*** RECOMMENDATIONS DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a PRIORITIZED RECOMMENDATION SET. Use .nxt-rec cards.
- 4 to 6 recommendations, each .nxt-rec with a number, a title (action), a rationale,
  an impact .nxt-chip--accent, and the named evidence/pain it resolves.
- Sequence them; note quick wins vs structural moves.
- Each recommendation is concrete enough to assign an owner.
"""
        meta_themes_contract = """
*** META-THEMES DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a CROSS-ENGAGEMENT THEME SYNTHESIS. Use .nxt-theme cards in a .nxt-grid.
- 5 to 8 themes, each a .nxt-theme with a .nxt-theme__tag (Convergent / Divergent / Emerging)
  and an evidenced description.
- EXECUTIVE SYNTHESIS: lead with a 2-3 sentence synthesis of the meta-pattern.
- EVIDENCE: each theme cites the named sources that converge on it.
"""
        research_plan_contract = """
*** RESEARCH PLAN DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a RESEARCH PLAN. Stark-white, no dark tiles. Use .nxt-card / .nxt-table.
- SUB-QUESTIONS: 5-8, each a card with the question and what answering it unlocks (type chip + priority chip).
- SOURCE STRATEGY: which source types answer which questions (a .nxt-table).
- EXECUTION: sequence + method per question.
- NO pipeline chrome (no Plan Hash, Version, checkpoint banners).
"""
        mindmap_contract = """
*** MINDMAP DEPTH CONTRACT (NON-NEGOTIABLE) ***
This is a MINDMAP. A central theme with branches. Use a .nxt-hub for the center+branches OR a
.nxt-grid of .nxt-callout tiles (LIGHT tiles, dark text, NEVER dark-on-dark).
- 1 central idea, 4-6 branches, each branch with 2-4 .nxt-callout leaf tiles.
- Each leaf is a concrete, evidenced point. No decorative-only nodes.
"""
        brief_contract = """
*** STRATEGIC BRIEF DEPTH CONTRACT (NON-NEGOTIABLE) ***
A strategic brief FRAMES THE SPACE, not just lists logistics. It must do real synthesis work, not a
thin one-card-per-field summary. REQUIRED structure (each a substantive section, not a label):
1. DIAGNOSIS / ACTION TITLE: one declarative sentence naming the central tension or shift (qualitative,
   no naked number).
2. FRAME THE SPACE (3-5 sentences + supporting cards): what this domain looks like right now, the
   forces at play, where it is heading. This is the "where the field is" framing.
3. KEY FINDINGS: 4-6 evidenced findings, EACH with a one-sentence claim + 2-3 sentences of substance +
   at least one VERBATIM cited quote from a named external source. Not bullets, real analysis.
4. OPPORTUNITIES: 3-5 concrete opportunities, each tied to a named finding/pain it answers.
5. CHALLENGES / RISKS: 3-5 real obstacles with why they bite, each anchored to evidence.
6. RECOMMENDED MOVES: 3-5 actions that reinforce each other (Rumelt coherence), each with the
   stakeholder/system it touches.
EVIDENCE FLOOR: at least 8 VERBATIM cited quotes across the brief, from at least 5 distinct named
external sources. Lead every section with the insight, corroborate with external evidence, then
contextualize with client docs.
SELF-CHECK BEFORE RETURNING: if any section is a stub (under ~3 substantive sentences), if the space
is not framed, or if the evidence floor is unmet, EXPAND before returning. A thin brief is a failure.
For brief-dialog: use .nxt-dialog / .nxt-bubble (light bubbles, dark text on white); 6-10 Q/A
exchanges that progressively scope the engagement, each answer substantive and evidenced.
"""

        contracts = {
            "journey": journey_contract,
            "blueprint": blueprint_contract,
            "competitive": competitive_contract,
            "tech-arch": tech_arch_contract,
            "arch": tech_arch_contract,
            "personas": personas_contract,
            "persona": personas_contract,
            "prd": prd_contract,
            "org": org_contract,
            "gap-analysis": gap_contract,
            "gap_analysis": gap_contract,
            "gap": gap_contract,
            "tech-audit": tech_audit_contract,
            "tech_audit": tech_audit_contract,
            "roadmap": roadmap_contract,
            "strategy": strategy_contract,
            "strategy-slide": strategy_contract,
            "recommendation": recommendation_contract,
            "recommendations": recommendation_contract,
            "meta-themes": meta_themes_contract,
            "meta_themes": meta_themes_contract,
            "research-plan": research_plan_contract,
            "research_plan": research_plan_contract,
            "mindmap": mindmap_contract,
            "brief": brief_contract,
            "brief-dialog": brief_contract,
            "brief_dialog": brief_contract,
        }
        key = (at or "journey").lower().strip()
        return contracts.get(key, contracts.get(key.replace("_", "-"), journey_contract))

    def _slide_layout_contract(self):
        """When render_mode == 'slides', return a layout contract that turns the
        SAME artifact content into a full-viewport slide deck (one element per
        slide) instead of one continuous page. Empty string in document mode."""
        if self.render_mode != "slides":
            return ""
        # NXT brand uses the design-system .nxt-slide frames (injected CSS styles
        # them, and each fixed 16:9 frame exports 1:1 to an editable PPTX slide).
        if self.brand == "nxt":
            return """
*** SLIDE-DECK MODE (OVERRIDES THE CONTINUOUS-PAGE LAYOUT) ***
Render this artifact as a SLIDE DECK using the design-system .nxt-slide frames, NOT one scrolling
page. Same depth, quotes, and evidence floors, SUMMARIZED to slide density, ONE idea per frame.

EACH FRAME is <section class="nxt-slide ...">...</section> (a fixed 16:9 box; the injected CSS
styles it). Do NOT write your own slide CSS or scroll-snap. Frame templates:
- Title: <section class="nxt-slide nxt-slide--title"><span class="nxt-logo nxt-logo--white nxt-slide__logo">NXT HUMANS</span><p class="nxt-slide__kicker">CONTEXT</p><h2 class="nxt-slide__title">Action title</h2><p class="nxt-slide__body">Standfirst.</p></section>
- Section divider: <section class="nxt-slide nxt-slide--divider"><p class="nxt-slide__kicker">Section</p><h2 class="nxt-slide__title">Movement</h2></section>
- Content/phase: <section class="nxt-slide"><span class="nxt-logo nxt-slide__logo">NXT HUMANS</span><p class="nxt-slide__kicker">PHASE</p><h2 class="nxt-slide__title">Point</h2><p class="nxt-slide__body">Tight paragraph.</p></section> plus the phase's named pain + emotion label + a .nxt-quote for the verbatim voice-of-user.
- Evidence: <section class="nxt-slide nxt-slide--quote"> with a large .nxt-quote.
- Lists .nxt-numlist; steps .nxt-process; stats .nxt-grid of .nxt-iconstat; data .nxt-table; cards .nxt-grid of .nxt-card. Vary templates per frame.
- Closing: <section class="nxt-slide nxt-slide--closing"><span class="nxt-logo nxt-logo--white nxt-slide__logo">NXT HUMANS</span><p class="nxt-slide__kicker">What's NXT</p><h2 class="nxt-slide__title">Next step</h2></section>

SEQUENCE (journey artifact_type):
  1. Title frame (action title only).
  2. *** JOURNEY OVERVIEW DIAGRAM frame — MANDATORY for artifact_type=journey ***
     A SINGLE frame that lays out ALL phases at once as a horizontal phase strip
     (left-to-right, one column per phase). Each column shows: phase number + name,
     a one-line phase summary, the dominant pain label, and the emotion label
     (qualitative word, not a curve). Use the .nxt-process class for the strip; if
     >5 phases, use the .nxt-grid layout instead. This frame is the READER'S MAP —
     they see the whole journey before drilling in. DO NOT skip this frame.
  3. ONE frame per phase, each with that phase's pains + 2-3 verbatim quotes +
     emotion label.
  4. A synthesis frame pairing pains with opportunities.
  5. A final source-index frame.

SEQUENCE (blueprint / other artifact_types): title; ONE frame per primary element
(per step/layer for a blueprint), each with its pains + 2-3 verbatim quotes;
synthesis; source index.

ONE idea per frame, never overfill (split if it would overflow). Titles are
judgments. Numbers ONLY inside cited quotes. NO emotion curve/chart, NO document
chrome, NO em-dashes, NO emoji. NO meta-commentary frames (no "How to read this",
no "One frame per phase", no "evidenced by student voices" structure descriptions).
NO metaphors in titles (no clock-running, no road-ahead, no foundation-laying,
no clock-is-ticking; plain language only).
"""
        return """
*** SLIDE DECK LAYOUT (OVERRIDES ANY CONTINUOUS-PAGE LAYOUT ABOVE) ***
Render this artifact as a SLIDE DECK, not one scrolling page. OVERRIDE any earlier
instruction about a single horizontal timeline or one continuous grid: present the SAME
content (same depth, same quotes, same evidence floors) as a sequence of full-viewport
slides, ONE element per slide.

MECHANICS:
- The <body> uses: height:100vh; overflow-y:scroll; scroll-snap-type:y mandatory; margin:0.
- Each slide is <section class="slide"> with: min-height:100vh; width:100%; scroll-snap-align:start; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; padding:6vh 7vw.
- ONE idea per slide. Do NOT cram. Generous margins, large type (slide titles 36-56px, body 18-22px).
- Include a tiny vanilla-JS handler: ArrowDown/ArrowRight/Space -> next slide, ArrowUp/ArrowLeft -> previous (scrollIntoView smooth). No external libraries.
- Each slide carries a small slide number (e.g. 03 / 11) and a persistent thin brand footer rule.

SLIDE SEQUENCE:
  1. COVER slide: the diagnostic action-title (large display) and the persona/standfirst line. A tiny plain brand wordmark is optional; NO eyebrow metadata strip, NO corpus/evidence counts.
  2. *** JOURNEY OVERVIEW DIAGRAM slide — MANDATORY when artifact_type=journey ***
     A SINGLE slide showing ALL phases at once as a horizontal phase strip (one column
     per phase, left-to-right). Each column carries: phase number + phase name, a
     one-line phase summary, the dominant pain label, and the qualitative emotion
     label (one word, not a curve). This is the READER'S MAP of the whole journey
     before drilling into individual phases. SKIP THIS SLIDE = SLIDE DECK IS INVALID.
  3. METRICS slide: the 3-4 KPI tiles, large.
  4. ONE slide PER primary element (per phase for a journey; per service step OR per layer for a blueprint). Each carries that element's activities, named pains (severity + frequency), 2-3 VERBATIM quotes with source attribution, touchpoint, and (journey) the emotion label.
  5. SYNTHESIS slide(s): cross-cutting pains paired by name with opportunities / redesign moves.
  6. SOURCE INDEX slide: the named sources.
- Every slide obeys the brand contract: stark-white surface, WCAG-AA contrast, NO dark-on-dark, NO emotion curve or chart, NO meta/self-referential language, NO em-dashes.
- NO meta-commentary slides ("How to read this", "One frame per phase", structure descriptions).
- NO metaphors in slide titles (no clock-running, no road-ahead, no foundation-laying).
"""

    def _create_prompt(self, title, description, journey_type, data, insights):
        """Create an enhanced prompt for Claude 4.5 that leverages extended thinking mode
        to generate more detailed and data-driven journey maps, without biasing with journey-specific elements.
        """
        # Simplify the data to reduce prompt size
        simplified_data = self._simplify_data_for_prompt(data)
        # 2026-05-26 — Brand styling block (empty string when no brand set).
        brand_block = self._brand_style_block()
        # 2026-05-26 — Per-artifact STRUCTURE contract. The journey-mapper is a
        # universal renderer now; this dispatches to the right richness/structure
        # floor for self.artifact_type (journey, blueprint, ...). The brand +
        # quality bar (brand_block) is shared across all artifact types.
        depth_contract = self._artifact_contract()
        # 2026-05-26 — Shared writing-quality contract (clear/concise titles,
        # no quant-cramming, no self-referential sourcing) applies to ALL artifacts.
        depth_contract = self._writing_quality_contract() + "\n" + depth_contract
        # 2026-05-26 — Source Index content rule: a CLEAN citation list, never the
        # model's process notes about each source.
        depth_contract = depth_contract + """
*** SOURCE INDEX CONTENT RULE ***
The source index is a clean citation list for the reader. Each entry = the SOURCE NAME
(e.g. "G2 Reviews", "2025 Industry Benchmark Survey") plus a one-line FACTUAL description of what
that source IS or what it reports. NOTHING ELSE. ABSOLUTELY FORBIDDEN in the source index:
- internal corpus indices ("PARAGRAPH 3", "CHUNK_017", "Document 2")
- sentiment readouts ("Sentiment, positive", "Sentiment: neutral")
- cross-references to the artifact's own internals ("Anchors Persona 02", "Anchors Phase 04", "Used in Step 03")
- role-in-document framing ("Source of the 6.7% figure", "Backs the matching claim")
Good entry: "Customer Forum. New customers describing the onboarding and setup experience."
"""
        # 2026-05-26 — Slide-deck layout override (empty in document mode).
        slide_contract = self._slide_layout_contract()
        if slide_contract:
            depth_contract = depth_contract + "\n" + slide_contract

        # Base prompt with explicit request for extended thinking
        prompt = f"""**INSTRUCTION**: You are an EXPERT JOURNEY MAPPING SPECIALIST with exceptional data analysis and visualization skills. I'm activating your extended thinking mode to thoroughly analyze this data and produce a superior journey map with deep insights. **IMPORTANT: TAKE YOUR TIME, BE EXTREMELY THOROUGH, USE ALL THE DATA PROVIDED, AND PRODUCE THE MOST DETAILED ANALYSIS POSSIBLE.**
{depth_contract}

CRITICAL INSTRUCTION: YOUR RESPONSE MUST BE A COMPLETE, INTERACTIVE HTML DOCUMENT WITH ALL TAGS INTACT. YOU MUST INCLUDE <!DOCTYPE html>, <html>, <head>, <style>, <body>, AND ALL CLOSING TAGS INCLUDING </body> AND </html>.

TASK: Create a beautiful, interactive journey map visualization as a standalone HTML document with embedded CSS and JavaScript. 

ESSENTIAL REQUIREMENTS:
1. MAXIMIZE CONTENT VOLUME - use close to the 64,000 token limit to provide the most comprehensive analysis possible
2. FOLLOW ACCESSIBILITY BEST PRACTICES (WCAG AA STANDARDS) - use semantic HTML, proper ARIA attributes, sufficient color contrast (4.5:1 minimum), keyboard accessibility, etc.
3. PROVIDE DEEP ANALYSIS - go beyond surface observations to find hidden patterns and insights

*** ACCESSIBILITY AND VISUAL DESIGN REQUIREMENTS ***
1. STRICT COLOR CONTRAST ENFORCEMENT - ALL text must have a minimum 7:1 contrast ratio against its background (exceeding WCAG AAA standards)
2. NEVER USE SAME OR SIMILAR COLORS for text and background - ensure stark visible difference between text and its background
3. HEADERS MUST BE ULTRA HIGH CONTRAST - All header text (h1, h2, h3, etc.) must have extremely high contrast (minimum 7:1 ratio)
4. TEXT BACKGROUNDS MUST CONTRAST WITH TILES - When text is on a colored tile/card, ensure both the text AND its background have sufficient contrast with the tile
5. ENFORCE TEXT VISIBILITY - All text must be easily readable against ANY background element it appears over
6. USE FULL VIEWPORT WIDTH - Design the journey map to expand to the full width of the viewport with proper padding
7. RESPONSIVE LAYOUT - Create a fluid, responsive design that works well on all screen sizes
8. MODERN AESTHETICS - Use a clean, modern design with consistent visual language
9. OPTIMIZE READABILITY - Use appropriate font sizes (minimum 16px for body text, 24px+ for headings)
{brand_block}

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
   - Emotions (as a short text label and brand-color cue ONLY, never an emoji, and only if there's evidence in the data)
   - Pain points (show in red, with specific examples from the data)
   - Opportunities for improvement (based on data patterns)
4. Include a detailed section at the top summarizing the key journey insights from the data analysis
5. (Removed 2026-05-31) Do NOT add a KPI/metrics dashboard or hoisted big numbers — the metrics policy
   and Quantitative Claim Rule above govern; numbers appear ONLY inside cited verbatim quotes.
6. Create interactive elements that enhance understanding of the data
7. (Removed 2026-05-31) Do NOT add decorative charts/graphs or an emotion curve — they are banned by
   the graphic-collision and no-emotion-graph rules above. Use the prose + card + quote modules.
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
7. Put 2 to 3 verbatim quotes inside EVERY phase, and elevate the single most impactful line per phase as a large, visually distinct PULL QUOTE
8. Quotes are the spine of the journey, not decoration: each phase's pains and emotions must be evidenced by its quotes

*** OBJECTIVE FIDELITY (SUPREME) ***
The journey MUST be about the subject named in TITLE/DESCRIPTION below and nothing else. If some DATA
items are about a different topic than this objective, treat them as background and DO NOT let them
define the journey's phases, actors, or domain. Never substitute a different domain's journey (for
example a generic job-search, co-op, or enrollment journey) when the objective is about something
else. The phases, actors, activities, pains, and opportunities must all serve THIS objective.

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

*** CRITICAL ACCESSIBILITY AND COLOR CONTRAST REQUIREMENTS ***
1. ABSOLUTELY NEVER use text color that is the same as or similar to its background color
2. MANDATORY: All text must maintain a MINIMUM 7:1 contrast ratio with its background
3. REQUIRED: Headers must use dark colors on light backgrounds or light colors on dark backgrounds (never similar shades)
4. CRITICAL: When using colored sections/cards, ensure that ALL text has high contrast with the element it's placed on
5. FORBIDDEN: No low-contrast text/background combinations under any circumstances

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
        """Call the LLM API with retry logic.

        2026-05-26 — Renamed-in-place dispatcher. The function is still named
        _call_anthropic_api so all 100+ existing call sites keep working, but
        the body now routes to Gemini when self.anthropic_model starts with
        'gemini-'. Gemini Flash returns a journey in ~5-30s vs Claude Sonnet's
        10-15 min two-pass. Chat-driven HiC #journey requests pass
        llm_model=gemini-3.5-flash; legacy upload UI keeps the Claude default.
        """
        model = self.anthropic_model or ""
        if model.lower().startswith("gemini-"):
            return self._call_gemini_api(prompt, max_tokens)
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

    def _call_gemini_api(self, prompt, max_tokens=CLAUDE_MAX_OUTPUT_TOKENS):
        """Call Google Gemini API for journey HTML generation.

        2026-05-26 — Added so the journey-mapper service supports the same
        two-pass pipeline with Gemini Flash. The model identity comes from
        self.anthropic_model (route-misnamed; kept for backward-compat).
        GEMINI_API_KEY must be in env (wired in docker-compose-all.yml).
        """
        try:
            from google import genai as _genai
        except Exception as imp_err:
            self.logger.error(f"google-genai not installed: {imp_err}")
            raise

        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY missing in journey-mapper container env")

        print(f"\n🔍 Gemini API Call Details:")
        print(f"   - Model: {self.anthropic_model}")
        print(f"   - Max tokens requested: {max_tokens}")
        print(f"   - Prompt length: {len(prompt)} characters")

        self._save_debug_info(None, "Gemini API request details", {
            "model": self.anthropic_model,
            "endpoint": "https://generativelanguage.googleapis.com/v1beta/models",
            "max_tokens": max_tokens,
            "prompt_length": len(prompt),
        })

        client = _genai.Client(api_key=api_key)
        try:
            response = client.models.generate_content(
                model=self.anthropic_model,
                contents=prompt,
                config={
                    "max_output_tokens": max_tokens,
                    "temperature": 0.3,
                },
            )
        except Exception as gen_err:
            self.logger.error(f"Error calling Gemini API: {gen_err}")
            raise

        html_content = getattr(response, "text", None) or ""
        if not html_content:
            # SDK shape varies — fall through to candidates -> parts -> text
            try:
                cand = response.candidates[0]
                parts = getattr(cand.content, "parts", []) or []
                html_content = "".join(getattr(p, "text", "") for p in parts)
            except Exception:
                html_content = ""

        if not html_content:
            raise RuntimeError("Gemini returned empty response (no .text and no candidates parts)")

        # Defensive HTML closing-tag fix — same logic as the Claude path so
        # downstream validators see consistent output regardless of model.
        if "<!DOCTYPE html>" in html_content and "</html>" not in html_content:
            self.logger.warning("HTML response missing closing tags, attempting to fix")
            if "</body>" not in html_content:
                html_content = f"{html_content}\n</body>\n</html>"
            else:
                html_content = f"{html_content}\n</body>\n</html>"

        print(f"   - Response length: {len(html_content)} characters")
        return html_content
    
    def _validate_and_fix_html(self, html_content):
        """Validate and fix HTML content if needed"""
        if not html_content:
            self.logger.warning("Empty HTML content received")
            return None

        # Hard em-dash ban (repo-wide rule). The model is instructed not to emit
        # U+2014, but em-dashes can still leak by being echoed from source-label
        # text in the corpus. Strip them deterministically: a spaced em-dash
        # becomes a comma, a tight one becomes a colon-ish separator.
        if "—" in html_content:
            html_content = re.sub(r"\s*—\s*", ", ", html_content)

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
    
    def _remove_section_from_html(self, html_content, class_name, tag_types=["div", "section"]):
        """Remove sections from HTML based on CSS class names"""
        return remove_section_from_html(html_content, class_name, tag_types)
    
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
        Applies content selection to show/hide selected journey map elements.
        """
        html_content = journey_map.get('interactive_html', '')
        
        # Apply content selection to the HTML content if available
        if hasattr(self, 'content_selection'):
            # Only apply if we have content selection settings
            if not self.content_selection.get("summary", True):
                # Remove journey summary section
                html_content = self._remove_section_from_html(html_content, "journey-summary")
            
            if not self.content_selection.get("stages", True):
                # Remove journey stages
                html_content = self._remove_section_from_html(html_content, "journey-stage")
            
            if not self.content_selection.get("painPoints", True):
                # Remove pain points
                html_content = self._remove_section_from_html(html_content, "pain-point")
                html_content = self._remove_section_from_html(html_content, "pain-points")
            
            if not self.content_selection.get("opportunities", True):
                # Remove opportunities
                html_content = self._remove_section_from_html(html_content, "opportunity")
                html_content = self._remove_section_from_html(html_content, "opportunities")
            
            if not self.content_selection.get("insights", True):
                # Remove insights
                html_content = self._remove_section_from_html(html_content, "insight")
                html_content = self._remove_section_from_html(html_content, "insights")
            
            if not self.content_selection.get("recommendations", True):
                # Remove recommendations
                html_content = self._remove_section_from_html(html_content, "recommendation")
                html_content = self._remove_section_from_html(html_content, "recommendations")
            
            if not self.content_selection.get("touchpoints", True):
                # Remove touchpoints
                html_content = self._remove_section_from_html(html_content, "touchpoint")
                html_content = self._remove_section_from_html(html_content, "touchpoints")
            
            if not self.content_selection.get("personas", True):
                # Remove personas
                html_content = self._remove_section_from_html(html_content, "persona")
                html_content = self._remove_section_from_html(html_content, "user-profile")
            
            if not self.content_selection.get("emotions", True):
                # Remove emotion indicators
                html_content = self._remove_section_from_html(html_content, "emotion")
        
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
        
        # Add model info footer — but NOT on the branded path. "Generated with
        # <model> on <date>" is banned reporting-depth metadata in branded
        # deliverables (it leaks the generation process to the reader). The
        # legacy upload UI keeps it; the HiC branded path suppresses it.
        model_info_html = ""
        if not self.brand:
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
        
        # Set up for journey map editing only - no export panel
        # Using improved editor without export functionality
        export_script_html = f"""
<script>
// Journey Map Configuration - ID only, no export functionality
window.journeyMapId = '{journey_id}';
</script>
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
        # 2026-05-26 — Carry brand styling into the second pass too, so the
        # deepening pass doesn't revert to a generic palette.
        brand_block = self._brand_style_block()
        
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

*** ACCESSIBILITY AND VISUAL DESIGN REQUIREMENTS ***
1. STRICT COLOR CONTRAST ENFORCEMENT - ALL text must have a minimum 7:1 contrast ratio against its background (exceeding WCAG AAA standards)
2. NEVER USE SAME OR SIMILAR COLORS for text and background - ensure stark visible difference between text and its background
3. HEADERS MUST BE ULTRA HIGH CONTRAST - All header text (h1, h2, h3, etc.) must have extremely high contrast (minimum 7:1 ratio)
4. TEXT BACKGROUNDS MUST CONTRAST WITH TILES - When text is on a colored tile/card, ensure both the text AND its background have sufficient contrast with the tile
5. ENFORCE TEXT VISIBILITY - All text must be easily readable against ANY background element it appears over
6. USE FULL VIEWPORT WIDTH - Design the journey map to expand to the full width of the viewport with proper padding
7. RESPONSIVE LAYOUT - Create a fluid, responsive design that works well on all screen sizes
8. MODERN AESTHETICS - Use a clean, modern design with consistent visual language
9. OPTIMIZE READABILITY - Use appropriate font sizes (minimum 16px for body text, 24px+ for headings)
{brand_block}
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