#!/usr/bin/env python3
"""Dynamic Journey Mapper – **OpenAI Edition**

A fully‑functional, production‑ready replacement for the original Anthropic/
Claude implementation.  It preserves the public interface while swapping the
LLM backend for **OpenAI GPT‑4o** (or any model set in `OPENAI_MODEL`).

Key highlights
--------------
* **OpenAI SDK** – uses the official `openai` package instead of a custom
  Anthropic wrapper.
* **Model selection** – controlled via environment (`OPENAI_MODEL`, default
  `gpt-4o-2025-05-13`).
* **Token budgets** – updated to GPT‑4o limits (128 k context / 4 096 output).
* **All helper methods** from the original codebase are carried over *verbatim*
  (save for naming tweaks) so behaviour outside the LLM layer remains
  unchanged.

Usage
-----
```bash
pip install --upgrade openai pydub ffmpeg-python
export OPENAI_API_KEY="sk‑…"
python dynamic_journey_mapper_openai.py
```
"""
from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydub import AudioSegment  # For optional data‑prep helpers

# Import the custom OpenAI API wrapper
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from openai_api_wrapper import openai_api_call

# ---------------------------------------------------------------------------
# Dynamic import paths for optional RAG helpers
# ---------------------------------------------------------------------------

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from src.utils.vector_store import init_vector_store
    from src.data_ingestion.data_processor import DataProcessor
except ImportError:  # Fallback for different run‑paths
    try:
        from utils.vector_store import init_vector_store
        from data_ingestion.data_processor import DataProcessor
    except ImportError:
        init_vector_store = None  # type: ignore
        DataProcessor = None  # type: ignore

# ---------------------------------------------------------------------------
# OpenAI configuration & constants
# ---------------------------------------------------------------------------

# API key validation is handled by the openai_api_wrapper module

# Use o3 - OpenAI's specialized reasoning model for complex tasks
# Options if o3 is not available: "gpt-4o", "gpt-4-turbo", "gpt-4"
DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "o3")

# Token limits for o3 model
OPENAI_MAX_INPUT_TOKENS = 128_000  # Maximum context window
OPENAI_MAX_OUTPUT_TOKENS = 4_096   # Maximum output tokens
DEFAULT_REASONING_EFFORT = os.getenv("REASONING_EFFORT", "high")  # Options: low, medium, high
OPENAI_MAX_DETAILED_ITEMS = 15     # Same heuristic as Claude version

# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def add_context_section(context_text: str) -> str:
    """Return a consistently‑named section header used in RAG prompts."""
    return "ADDITIONAL CONTEXT FROM VECTOR SEARCH:\n" + context_text + "\n"


class DynamicJourneyMapper:
    """Generate accessible, interactive journey maps powered by OpenAI GPT‑4o."""

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    def __init__(self, openai_model: Optional[str] = None, *, debug_mode: bool = True, use_rag: bool = True,
                 reasoning_effort: Optional[str] = None) -> None:
        self.openai_model = openai_model or DEFAULT_OPENAI_MODEL
        self.debug_mode = debug_mode
        self.use_rag = use_rag
        self.reasoning_effort = reasoning_effort or DEFAULT_REASONING_EFFORT
        self.logger = logging.getLogger(self.__class__.__name__)
        os.makedirs("logs", exist_ok=True)
        
        # Log initialization - using safer string concatenation
        self.logger.info("Initializing Journey Mapper with model: " + str(self.openai_model) + 
                         ", reasoning effort: " + str(self.reasoning_effort))

        # Optional RAG tooling
        self.vector_store = None
        self.data_processor = None
        if use_rag and init_vector_store is not None and DataProcessor is not None:
            try:
                self.vector_store = init_vector_store()
                self.data_processor = DataProcessor()
                self.logger.info("Vector store and DataProcessor initialized for RAG 🔍")
            except Exception as exc:  # pragma: no cover – safe degradation
                self.logger.warning("RAG initialization failed: %s", exc)
                self.use_rag = False

    # ------------------------------------------------------------------
    # Public entry‑point
    # ------------------------------------------------------------------

    def generate_journey_map(self, data: Dict[str, Any]) -> Dict[str, str]:
        """High‑level orchestration of the journey‑map generation pipeline with complex chain-of-thought."""
        try:
            self.logger.info("🛫 Journey‑map generation started (%s)", self.openai_model)
            self.logger.info("📊 Step 1: Data extraction and preprocessing")
            title, description, journey_type = self._extract_journey_info(data)
            processed = self._preprocess_data(data)
            insights = self._extract_journey_insights(processed)
            
            # STEP 1: First chain-of-thought step - Deep analysis phase
            self.logger.info("🧠 Step 2: Executing deep analysis phase (first chain-of-thought step)")
            analysis_prompt = self._create_analysis_prompt(title, description, journey_type, processed, insights)
            
            analysis_result = self._call_openai_api(analysis_prompt)
            structured_analysis = self._extract_structured_analysis(analysis_result)
            self.logger.info("📝 Analysis phase complete: " + str(len(structured_analysis.get('journey_stages', []))) + " stages, " + str(len(structured_analysis.get('pain_points', []))) + " pain points identified")
            
            # Save the analysis for debugging
            debug_id = datetime.now().strftime("%Y%m%d_%H%M%S")
            self._save_debug_info("analysis_" + debug_id + ".json", "Chain-of-thought analysis", structured_analysis)
            
            # STEP 2: Second chain-of-thought step - Visualization phase
            self.logger.info("🎨 Step 3: Executing visualization phase (second chain-of-thought step)")
            visualization_prompt = self._create_visualization_prompt(title, description, journey_type, processed, insights, structured_analysis)
            
            first_html = self._validate_and_fix_html(self._call_openai_api(visualization_prompt)) or ""
            if not first_html:
                # Retry with explicit instructions if validation failed
                self.logger.warning("HTML validation failed, retrying with more explicit instructions")
                first_html = self._validate_and_fix_html(
                    self._call_openai_api(self._create_retry_prompt(visualization_prompt, "HTML validation failed"))
                ) or self._create_fallback_html(title, description, journey_type, insights)

            # STEP 3: Refinement phase - Similar to original approach but now with enhanced context
            self.logger.info("✨ Step 4: Executing refinement phase with enhanced context")
            first_pass_info = self._extract_journey_from_html(first_html)
            
            # Combine the structured analysis with first pass info for better context
            enhanced_context = {
                "structured_analysis": structured_analysis,
                "first_pass_info": first_pass_info
            }
            
            second_prompt = self._create_enhanced_second_pass_prompt(
                title,
                description,
                journey_type,
                processed,
                insights,
                enhanced_context,
                first_html,
            )
            
            second_html = self._validate_and_fix_html(
                self._call_openai_api(second_prompt, max_tokens=OPENAI_MAX_OUTPUT_TOKENS)
            ) or first_html

            summary = self._extract_summary_from_html(second_html)
            self.logger.info("✅ Journey‑map generation complete (%s chars)", len(second_html))
            return {
                "interactive_html": second_html,
                "journey_summary": summary,
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as exc:  # pragma: no cover – global safety net
            self.logger.error("Journey‑map generation failed", exc_info=True)
            
            # Store error message for model display
            if self.openai_model.startswith("o"):
                self._o3_error_message = str(exc)
            
            # Create a more detailed error HTML with full error message
            error_message = str(exc)
            
            # Check if it's an API error related to model availability
            if "not available" in error_message.lower() or "model_not_found" in error_message.lower():
                error_header = f"Model {self.openai_model} Not Available"
                error_description = "The selected model is not available with your current API key. Please try a different model."
            elif "unauthorized" in error_message.lower() or "not authorized" in error_message.lower():
                error_header = f"Not Authorized for {self.openai_model}"
                error_description = "Your API key is not authorized to use this model. Please try a different model."
            elif "parameter" in error_message.lower() and "not supported" in error_message.lower():
                error_header = f"Parameter Incompatibility with {self.openai_model}"
                error_description = "One or more parameters are not supported with this model."
            else:
                error_header = "Journey Map Generation Failed"
                error_description = "An error occurred while generating the journey map:"
            
            # Create error HTML without using f-strings to avoid format string issues
            html_start = """<!DOCTYPE html>
<html>
<head>
    <title>Error - """
            
            html_title = error_header
            
            html_head = """</title>
    <meta charset='utf-8'>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .error-container { background-color: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); padding: 30px; border-top: 4px solid #e74c3c; }
        h1 { color: #e74c3c; margin-bottom: 10px; }
        .error-message { background-color: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; }
        .back-link { margin-top: 20px; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>"""
            
            html_body_middle = """</h1>
        <p>"""
            
            html_description = error_description
            
            html_message_start = """</p>
        <div class="error-message">"""
            
            html_error = error_message
            
            html_end = """</div>
        <p class="back-link"><a href="/">← Go back and try again with a different model</a></p>
    </div>
</body>
</html>"""

            # Concatenate all parts to create the error HTML
            error_html = html_start + html_title + html_head + html_title + html_body_middle + html_description + html_message_start + html_error + html_end
            
            # Safely store error information without using f-strings
            error_model_display = str(self.openai_model)
            error_summary = "Error with " + error_model_display + ": " + error_message
            
            return {
                "interactive_html": error_html,
                "journey_summary": error_summary,
                "model_used": error_model_display + " (Error)",
            }

    # ------------------------------------------------------------------
    # PRIVATE HELPERS (ported unchanged except Claude→OpenAI renames)
    # ------------------------------------------------------------------

    # --- Data extraction & preprocessing --------------------------------

    def _extract_journey_info(self, data: Dict[str, Any]):
        title = "Customer Journey"
        description = "A visualization of the customer journey"
        journey_type = "general"
        if isinstance(data, dict):
            metadata = data.get("metadata", {})
            context = metadata.get("context", {})
            title = context.get("title", title)
            description = context.get("description", description)
            journey_type = context.get("journey_type", journey_type)
            # Basic keyword detection if type still general
            if journey_type == "general" and "unstructured" in data:
                term_map = {
                    "customer": ["customer", "buyer", "shopper", "client"],
                    "educational": ["student", "course", "school", "class"],
                    "healthcare": ["patient", "doctor", "hospital", "clinic"],
                    "employee": ["employee", "work", "job", "career"],
                    "coop": ["coop", "internship", "placement"],
                }
                counts = {k: 0 for k in term_map}
                for item in data.get("unstructured", []):
                    if isinstance(item, dict):
                        text = str(item.get("data", "")).lower()
                        for jtype, terms in term_map.items():
                            counts[jtype] += sum(text.count(t) for t in terms)
                if counts and max(counts.values()):
                    journey_type = max(counts, key=counts.get)
        return title, description, journey_type

    def _preprocess_data(self, data: Dict[str, Any]):
        return data  # Stub – extend later if needed

    def _simplify_data_for_prompt(self, data: Dict[str, Any]):
        if not isinstance(data, dict):
            return data
        simplified: Dict[str, Any] = {}
        if "metadata" in data:
            simplified["metadata"] = data["metadata"]
        if "unstructured" in data:
            unstructured = data["unstructured"]
            if len(unstructured) > OPENAI_MAX_DETAILED_ITEMS:
                simplified["unstructured"] = unstructured[:OPENAI_MAX_DETAILED_ITEMS]
                simplified["unstructured_summary"] = (
                    "Total of " + str(len(unstructured)) + " items, showing first " + str(OPENAI_MAX_DETAILED_ITEMS)
                )
            else:
                simplified["unstructured"] = unstructured
        if "structured" in data:
            simplified["structured"] = data["structured"]
        for key in ("context", "title", "description", "journey_type"):
            if key in data:
                simplified[key] = data[key]
        return simplified

    def _extract_journey_insights(self, data: Dict[str, Any]):
        insights: Dict[str, Any] = {
            "summary": "",
            "stages": [],
            "pain_points": [],
            "opportunities": [],
        }
        # Simple heuristic extraction from transcripts
        if "unstructured" in data:
            for item in data.get("unstructured", []):
                if isinstance(item, dict) and item.get("type") == "transcript":
                    elements = item.get("structured_elements", {})
                    insights["stages"].extend(elements.get("topics", []))
                    for q in elements.get("questions", []):
                        q_lower = q.lower()
                        if any(k in q_lower for k in ("problem", "difficult")):
                            insights["pain_points"].append(q)
                        elif any(k in q_lower for k in ("improve", "better")):
                            insights["opportunities"].append(q)
        # RAG enrichment
        if self.use_rag and self.data_processor is not None:
            try:
                ctx = self.data_processor.get_rag_context  # type: ignore[attr-defined]
                insights["rag_contexts"] = {
                    "stages": ctx("Main stages in this customer journey", top_k=3),
                    "pain_points": ctx("Key pain points in this journey", top_k=3),
                    "opportunities": ctx("Opportunities for improvement", top_k=3),
                }
            except Exception as exc:
                self.logger.warning("RAG enrichment failed: %s", exc)
        # Truncate lists
        insights["stages"] = insights["stages"][:8]
        insights["pain_points"] = insights["pain_points"][:5]
        insights["opportunities"] = insights["opportunities"][:5]
        return insights

    # --- Prompt builders -------------------------------------------------

    # ---- Original prompt methods (kept for compatibility) ----
    
    def _create_prompt(self, title, description, journey_type, data, insights):
        simplified = self._simplify_data_for_prompt(data)
        prompt = f"""**INSTRUCTION**: You are an EXPERT JOURNEY MAPPING SPECIALIST.\n\nTITLE: {title}\nDESCRIPTION: {description}\nJOURNEY_TYPE: {journey_type}\n\nDATA:\n{json.dumps(simplified, indent=2)}\n"""
        # Append detected insights for transparency
        if insights["stages"]:
            prompt += "\nPOTENTIAL JOURNEY STAGES:\n" + "\n".join(f"- {s}" for s in insights["stages"])
        if insights["pain_points"]:
            prompt += "\nIDENTIFIED PAIN POINTS:\n" + "\n".join(f"- {p}" for p in insights["pain_points"])
        if insights["opportunities"]:
            prompt += "\nOPPORTUNITIES:\n" + "\n".join(f"- {o}" for o in insights["opportunities"])
        if "rag_contexts" in insights:
            prompt += "\n" + add_context_section(json.dumps(insights["rag_contexts"], indent=2))
        prompt += """\n\nCRITICAL REQUIREMENT: RETURN ONLY COMPLETE HTML, STARTING WITH <!DOCTYPE html> AND ENDING WITH </html>.\n"""
        return prompt

    def _create_retry_prompt(self, original_prompt, issue):
        return (
            "The previous HTML was invalid (" + issue +"). "
            "Please output a **complete** HTML document with all opening and closing tags.\n\n" + original_prompt
        )

    def _create_second_pass_prompt(
        self,
        title,
        description,
        journey_type,
        data,
        insights,
        first_pass_info,
        first_html,
    ):
        simplified = self._simplify_data_for_prompt(data)
        return f"""You previously created a journey map. Analyse it critically and produce a *more detailed*
HTML journey map.\n\nFIRST_MAP_STAGES: {', '.join(first_pass_info.get('stages', []))}\n\nDATA:\n{json.dumps(simplified, indent=2)}\n\nCRITICAL: Return only complete HTML (<!DOCTYPE html> … </html>)."""

    # ---- New Chain-of-Thought prompt methods ----
    
    def _create_analysis_prompt(self, title, description, journey_type, data, insights):
        """
        First chain-of-thought step: Create a prompt that focuses on deep analysis
        of the journey without visualization concerns. This allows the model to think
        deeply about the journey structure, stages, and key insights.
        """
        simplified = self._simplify_data_for_prompt(data)
        # Use safe string concatenation instead of f-strings to avoid format specifier errors
        prompt = """**INSTRUCTION**: You are an EXPERT JOURNEY MAPPING SPECIALIST conducting a detailed analysis phase.

TITLE: """ + str(title) + """
DESCRIPTION: """ + str(description) + """
JOURNEY_TYPE: """ + str(journey_type) + """

DATA:
""" + json.dumps(simplified, indent=2) + """

I want you to perform a deep chain-of-thought analysis of this customer journey. 
Break this into clear steps:

1. Identify the key stages in this journey (typically 5-8 stages)
2. For each stage, identify:
   - Main user actions and touchpoints
   - User emotions and sentiment at this stage
   - Key pain points or friction points
   - Opportunities for improvement
   - Important metrics or KPIs for this stage

3. Analyze the overall journey for:
   - Major transition points
   - Critical moments that influence satisfaction/conversion
   - Systemic issues that affect multiple stages
   - Root causes of identified problems
   - Potential quick wins vs. strategic improvements

**IMPORTANT**: Return your analysis as structured JSON that I can parse programmatically.
Use the following format:

```json
{
  "journey_stages": [
    {
      "name": "Stage Name",
      "description": "Brief description",
      "user_actions": ["action 1", "action 2"],
      "emotions": ["emotion1", "emotion2"],
      "pain_points": ["pain point 1", "pain point 2"],
      "opportunities": ["opportunity 1", "opportunity 2"],
      "metrics": ["metric 1", "metric 2"]
    }
    // additional stages
  ],
  "pain_points": ["Major pain point 1", "Major pain point 2"],
  "opportunities": ["Major opportunity 1", "Major opportunity 2"],
  "critical_moments": ["Moment 1", "Moment 2"],
  "journey_summary": "Overall analysis of the journey in 2-3 paragraphs"
}
```

Do not include anything else in your response besides this JSON.
"""
        # Append detected insights for transparency
        if insights["stages"]:
            stage_lines = ""
            for s in insights["stages"]:
                stage_lines += "- " + str(s) + "\n"
            prompt += "\n\nPOTENTIAL JOURNEY STAGES FROM INITIAL ANALYSIS:\n" + stage_lines.rstrip()
            
        if insights["pain_points"]:
            pain_point_lines = ""
            for p in insights["pain_points"]:
                pain_point_lines += "- " + str(p) + "\n"
            prompt += "\n\nIDENTIFIED PAIN POINTS FROM INITIAL ANALYSIS:\n" + pain_point_lines.rstrip()
            
        if insights["opportunities"]:
            opportunity_lines = ""
            for o in insights["opportunities"]:
                opportunity_lines += "- " + str(o) + "\n"
            prompt += "\n\nOPPORTUNITIES FROM INITIAL ANALYSIS:\n" + opportunity_lines.rstrip()
        if "rag_contexts" in insights:
            prompt += "\n\n" + add_context_section(json.dumps(insights["rag_contexts"], indent=2))
        
        return prompt

    def _extract_structured_analysis(self, analysis_result: str) -> Dict[str, Any]:
        """
        Extract the structured JSON analysis from the model's response.
        """
        try:
            # Try to find JSON between triple backticks
            json_match = re.search(r'```json\s*(.*?)\s*```', analysis_result, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                return json.loads(json_str)
            
            # If not found, try to find any JSON-like structure
            json_match = re.search(r'(\{.*\})', analysis_result, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                return json.loads(json_str)
                
            # If still not found, try to parse the entire response as JSON
            return json.loads(analysis_result)
        except Exception as e:
            self.logger.warning(f"Failed to extract structured analysis: {str(e)}")
            # Return a minimal structure if parsing fails
            return {
                "journey_stages": [],
                "pain_points": [],
                "opportunities": [],
                "critical_moments": [],
                "journey_summary": "Analysis extraction failed. Please check the logs."
            }

    def _create_visualization_prompt(self, title, description, journey_type, data, insights, structured_analysis):
        """
        Second chain-of-thought step: Create a prompt for generating the visualization
        based on the structured analysis from the first step.
        """
        simplified = self._simplify_data_for_prompt(data)
        
        # Format the structured analysis for inclusion in the prompt
        stages_text = ""
        for i, stage in enumerate(structured_analysis.get("journey_stages", [])):
            stages_text += f"\n\nSTAGE {i+1}: {stage.get('name', 'Unnamed Stage')}\n"
            stages_text += f"Description: {stage.get('description', '')}\n"
            
            if stage.get("user_actions"):
                stages_text += "User Actions: " + ", ".join(stage.get("user_actions", [])) + "\n"
            
            if stage.get("emotions"):
                stages_text += "Emotions: " + ", ".join(stage.get("emotions", [])) + "\n"
                
            if stage.get("pain_points"):
                stages_text += "Pain Points: " + ", ".join(stage.get("pain_points", [])) + "\n"
                
            if stage.get("opportunities"):
                stages_text += "Opportunities: " + ", ".join(stage.get("opportunities", [])) + "\n"
                
            if stage.get("metrics"):
                stages_text += "Metrics: " + ", ".join(stage.get("metrics", [])) + "\n"
        
        # Extract key insights
        pain_points_text = "\n".join(f"- {p}" for p in structured_analysis.get("pain_points", []))
        opportunities_text = "\n".join(f"- {o}" for o in structured_analysis.get("opportunities", []))
        critical_moments_text = "\n".join(f"- {m}" for m in structured_analysis.get("critical_moments", []))
        journey_summary = structured_analysis.get("journey_summary", "")
        
        prompt = f"""**INSTRUCTION**: You are an EXPERT JOURNEY MAPPING SPECIALIST creating an interactive HTML visualization.

TITLE: {title}
DESCRIPTION: {description}
JOURNEY_TYPE: {journey_type}

JOURNEY SUMMARY:
{journey_summary}

JOURNEY STAGES:
{stages_text}

KEY PAIN POINTS:
{pain_points_text}

KEY OPPORTUNITIES:
{opportunities_text}

CRITICAL MOMENTS:
{critical_moments_text}

Now create a beautiful, interactive HTML journey map visualization that represents this journey.

The journey map should:
1. Be visually engaging with appropriate colors and icons
2. Include all the journey stages with DETAILED descriptions and metrics
3. Show emotions, pain points, and opportunities for each stage with specific examples
4. Use a timeline or flow representation that's easy to understand
5. Include a comprehensive summary of key insights that includes detailed recommendations
6. Be responsive and well-structured with interactive elements (hover effects, expandable sections)
7. Use modern HTML, CSS, and JavaScript for interactivity
8. IMPORTANT: Include ALL the details from the analysis - don't simplify or omit important information
9. Create a rich, detailed visualization that fully represents the deep analysis you performed

Remember to go DEEP rather than broad - each stage should have substantial detail and specific examples.

CRITICAL REQUIREMENT: RETURN ONLY COMPLETE HTML, STARTING WITH <!DOCTYPE html> AND ENDING WITH </html>.
"""
        return prompt
        
    def _create_enhanced_second_pass_prompt(
        self,
        title,
        description,
        journey_type,
        data,
        insights,
        enhanced_context,
        first_html,
    ):
        """
        Create an enhanced second-pass prompt that includes the structured analysis
        from the first chain-of-thought step as well as the first visualization.
        """
        simplified = self._simplify_data_for_prompt(data)
        structured_analysis = enhanced_context.get("structured_analysis", {})
        first_pass_info = enhanced_context.get("first_pass_info", {})
        
        # Extract key elements from the structured analysis
        journey_summary = structured_analysis.get("journey_summary", "")
        
        # Format the journey stages from the first pass
        first_stages = first_pass_info.get('stages', [])
        stages_text = ", ".join(first_stages) if first_stages else "No stages identified"
        
        # Extract insights from the first pass
        first_insights = first_pass_info.get('insights', [])
        insights_text = "\n".join(f"- {i}" for i in first_insights) if first_insights else "No insights identified"
        
        return f"""You previously created a journey map visualization. Now, I want you to refine and enhance it using additional insights.

TITLE: {title}
DESCRIPTION: {description}
JOURNEY_TYPE: {journey_type}

JOURNEY SUMMARY FROM ANALYSIS:
{journey_summary}

CURRENT JOURNEY STAGES: 
{stages_text}

INSIGHTS FROM FIRST VISUALIZATION:
{insights_text}

Based on the additional analysis and the first visualization, create an enhanced HTML journey map that:
1. Has MUCH more detailed and nuanced content with specific examples and quotes
2. Includes comprehensive, actionable recommendations for each pain point
3. Better highlights critical moments and pain points with explanations of their impact
4. Has significantly improved visual design and extensive interactivity (hover states, tooltips, expandable sections)
5. Presents detailed metrics and KPIs for each stage with business impact
6. Adds richer emotional context and user perspectives at each stage
7. Incorporates visualizations of user flows and decision points
8. Expands the analysis section with deeper insights

CRITICAL: Do NOT simplify or remove ANY content - this should be a major enhancement of the first map with SUBSTANTIALLY MORE detail and depth. Use all available space to provide the richest, most detailed journey map possible.

Remember to go DEEP rather than broad - each stage should have substantial detail and specific examples. The final journey map should be comprehensive and professional-quality.

CRITICAL: Return only complete HTML (<!DOCTYPE html> … </html>).
"""

    # --- OpenAI call ------------------------------------------------------

    def _call_openai_api(self, prompt: str, *, max_tokens: int = OPENAI_MAX_OUTPUT_TOKENS) -> str:
        system_message = "You are an expert journey‑mapping specialist. Output only HTML."
        try:
            # Log the request to help with debugging
            self.logger.info("Calling o3 API for journey mapping with model: " + str(self.openai_model))
            
            # No verification - just use the model directly and let any errors be visible
            # This will be caught in the except block if the model is not available
            if self.openai_model.startswith("o"):
                self.logger.info(f"Using {self.openai_model} model directly as requested (no fallbacks)")
                
                # For logging purposes only - we don't change the model
                from openai_api_wrapper import check_organization_verification
                is_verified = check_organization_verification(model=self.openai_model)
                if not is_verified:
                    error_msg = "Note: " + str(self.openai_model) + " may not be available, but will try anyway as requested."
                    self.logger.warning(error_msg)
            
            # Use the custom openai_api_call wrapper from openai_api_wrapper.py
            # Different models support different parameter combinations
            api_params = {
                "prompt": prompt,
                "model": self.openai_model,
                "system_message": system_message,
                "reasoning_effort": DEFAULT_REASONING_EFFORT
            }
            
            # Add temperature only for models that support it
            disable_temp_for_o = os.environ.get("DISABLE_O_SERIES_TEMPERATURE", "").lower() == "true"
            if not (disable_temp_for_o and self.openai_model.startswith("o")):
                api_params["temperature"] = 0.2
                
            # Add max_tokens - will be handled by the wrapper if not supported
            if max_tokens:
                api_params["max_tokens"] = max_tokens
                
            # Call with the appropriate parameters for this model
            resp = openai_api_call(**api_params)
            
            # Extract content from the response
            # The wrapper returns a dict with 'content' key for compatibility
            if isinstance(resp, dict) and "content" in resp:
                content = resp["content"]
                
                # Log token usage statistics if available for cost management
                if "usage" in resp:
                    usage = resp["usage"]
                    self.logger.info("Token usage: " + str(usage))
                    
                    # Save debug information about token usage
                    if self.debug_mode:
                        # Convert usage object to dictionary to ensure it's JSON serializable
                        usage_dict = {}
                        
                        # Special handling for o-series models (o1, o3, etc.)
                        # which have different usage attributes compared to GPT models
                        if self.openai_model.startswith('o'):
                            # For o-series models, safely extract available attributes
                            # These models may not have completion_tokens attribute
                            try:
                                if hasattr(usage, 'prompt_tokens'):
                                    usage_dict['prompt_tokens'] = getattr(usage, 'prompt_tokens', 0)
                                if hasattr(usage, 'total_tokens'):
                                    usage_dict['total_tokens'] = getattr(usage, 'total_tokens', 0)
                                if hasattr(usage, 'completion_tokens'):
                                    usage_dict['completion_tokens'] = getattr(usage, 'completion_tokens', 0)
                                
                                # O-series models might have reasoning tokens instead
                                if hasattr(usage, 'completion_tokens_details'):
                                    completion_details = getattr(usage, 'completion_tokens_details', None)
                                    if completion_details:
                                        if hasattr(completion_details, 'reasoning_tokens'):
                                            usage_dict['reasoning_tokens'] = getattr(completion_details, 'reasoning_tokens', 0)
                            except Exception as e:
                                self.logger.warning(f"Error extracting o-series usage stats: {str(e)}")
                        else:
                            # Standard GPT models have consistent attributes
                            if hasattr(usage, 'completion_tokens'):
                                usage_dict['completion_tokens'] = getattr(usage, 'completion_tokens', 0)
                            if hasattr(usage, 'prompt_tokens'):
                                usage_dict['prompt_tokens'] = getattr(usage, 'prompt_tokens', 0)
                            if hasattr(usage, 'total_tokens'):
                                usage_dict['total_tokens'] = getattr(usage, 'total_tokens', 0)
                            
                        # Add a string representation for any other properties
                        usage_dict['usage_string'] = str(usage)
                            
                        self._save_debug_info(
                            None, 
                            "Token usage statistics", 
                            {"usage": usage_dict, "model": self.openai_model}
                        )
            else:
                content = str(resp)
                
            # Add closing tags if they're missing
            if "<!DOCTYPE html" in content and "</html>" not in content:
                content += "\n</body></html>"
                
            return content
        except Exception as exc:
            self.logger.error("OpenAI API error: %s", exc)
            raise

    # --- HTML validation & repair ----------------------------------------

    def _validate_and_fix_html(self, html: str | None):
        if not html:
            return None
        required = ["<!DOCTYPE html", "<html", "<head", "<body", "</body>", "</html>"]
        missing = [t for t in required if t not in html]
        if not missing:
            return html
        self.logger.warning("HTML missing tags: %s", missing)
        return self._fix_html(html, missing)

    def _fix_html(self, html: str, missing: List[str]):
        fixed = html
        if "<!DOCTYPE html" not in fixed:
            fixed = "<!DOCTYPE html>\n" + fixed
        if "<html" not in fixed:
            fixed = fixed.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n<html lang='en'>", 1)
        if "<head" not in fixed:
            fixed = fixed.replace("<html lang='en'>", "<html lang='en'>\n<head><meta charset='utf-8'><title>Journey Map</title></head>")
        if "<body" not in fixed:
            fixed = fixed.replace("</head>", "</head>\n<body>")
        if "</body>" not in fixed:
            fixed += "\n</body>"
        if "</html>" not in fixed:
            fixed += "\n</html>"
        return fixed

    # --- Fallback HTML ----------------------------------------------------

    def _create_fallback_html(self, title, description, journey_type, insights):
        stages = insights.get("stages") or ["Stage 1", "Stage 2", "Stage 3"]
        bullets = ""
        for s in stages:
            bullets += "<li>" + str(s) + "</li>"
        return (
            "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Fallback Journey Map</title></head><body>"
            "<h1>" + str(title) + "</h1><p>" + str(description) + "</p><h2>Fallback Journey Stages</h2><ul>" + str(bullets) + "</ul></body></html>"
        )

    # --- Debug utilities --------------------------------------------------

    def _save_debug_info(self, fname: Optional[str], message: str, data: Any):
        if not self.debug_mode:
            return
        # Handle the case where fname is None
        if fname is None:
            date_str = datetime.now().strftime('%Y%m%d_%H%M%S')
            fname = "debug_" + date_str + ".log"
        path = os.path.join("logs", fname)
        
        # Create a custom JSON encoder to handle non-serializable objects
        class CustomJSONEncoder(json.JSONEncoder):
            def default(self, obj):
                try:
                    return super().default(obj)
                except TypeError:
                    return str(obj)
        
        payload = {
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "data": data,
        }
        
        # Use the custom encoder
        mode = "a" if os.path.exists(path) else "w"
        try:
            with open(path, mode) as fh:
                fh.write(json.dumps(payload, indent=2, cls=CustomJSONEncoder) + "\n")
        except Exception as e:
            self.logger.error("Failed to save debug info: " + str(e))
            # Fallback to simpler logging with stringified data
            with open(path, mode) as fh:
                simple_payload = {
                    "timestamp": datetime.now().isoformat(),
                    "message": message,
                    "data": str(data),
                }
                fh.write(json.dumps(simple_payload, indent=2) + "\n")

    # --- HTML analysis helpers -------------------------------------------

    def _extract_journey_from_html(self, html: str):
        info = {"stages": [], "insights": []}
        info["stages"] = re.findall(r"<div class=\"stage-title\">(.*?)</div>", html)
        info["insights"] = re.findall(r"<div class=\"insight-card\">.*?<p>(.*?)</p>", html, re.DOTALL)
        return info

    def _extract_summary_from_html(self, html: str):
        match = re.search(r"<p class=\"description\">(.*?)</p>", html)
        return match.group(1).strip() if match else ""

    def render_journey_map_html(self, journey_map):
        """
        Return the HTML content from the journey map result with enhanced export functionality.
        """
        html_content = journey_map.get('interactive_html', '')
        
        # One final validation check
        self.logger.info("Validating HTML content")
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
        
        # Get actual model used - check if we were forced to use a fallback model
        actual_model = getattr(self, "openai_model", self.openai_model)
        
        # Check if we're using any o-series model
        requested_model = self.openai_model
        
        # No fallback scenarios - just use the actual model and provide transparency
        try:
            # We'll always use the exact model that was requested
            actual_model = requested_model
            self.logger.info(f"Using {requested_model} model directly as requested")
            
            # Check if we attempted to use o3 but got an error message about it
            if hasattr(self, "_o3_error_message") and requested_model == "o3":
                actual_model = f"{requested_model} (Error: {self._o3_error_message})"
                self.logger.warning(f"Error using {requested_model}: {self._o3_error_message}")
                
        except Exception as e:
            self.logger.warning(f"Error checking model status: {str(e)}")
            # Keep using the originally requested model regardless
            actual_model = requested_model
            
        # Store the actual model used in journey_map for reference in other components
        journey_map['model_used'] = actual_model
        
        # Add model info footer with correct model information
        # Only show reasoning effort for o-series models where it applies
        is_o_series = actual_model.startswith("o") and "not available" not in actual_model
        
        # Build reasoning label without f-string to avoid potential format issues
        reasoning_label = ""
        if is_o_series:
            reasoning_label = "with " + str(self.reasoning_effort) + " reasoning effort"
            
        date_display = datetime.now().strftime('%Y-%m-%d')
        
        # Use string concatenation instead of f-strings to avoid potential format string issues
        model_info_html = """
<div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 0.8em; color: #666;">
  Generated with <strong>OpenAI """ + actual_model + """</strong> """ + (reasoning_label if reasoning_label else "") + """ on """ + date_display + """
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

    # ------------------------------------------------------------------
    # End of class
    # ------------------------------------------------------------------


if __name__ == "__main__":  # Simple CLI demo
    logging.basicConfig(level=logging.INFO)
    mapper = DynamicJourneyMapper(debug_mode=False, use_rag=False)
    sample_data = {
        "metadata": {"context": {"title": "Website Purchase Journey", "description": "Sample", "journey_type": "customer"}},
        "unstructured": [
            {"type": "transcript", "structured_elements": {"topics": ["Browse", "Checkout"], "questions": ["Why is payment difficult?"]}},
        ],
    }
    result = mapper.generate_journey_map(sample_data)
    with open("journey_map.html", "w", encoding="utf-8") as f:
        f.write(result["interactive_html"])
    print("Journey map saved to journey_map.html")