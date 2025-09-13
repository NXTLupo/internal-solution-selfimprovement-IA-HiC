"""
Extended Thinking Engine for LinkedIn Post Generator
Implements deep analysis mode with 64K token processing for profound content generation.
"""

import os
import asyncio
import time
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
from anthropic import Anthropic
import json
from dataclasses import asdict, is_dataclass

# Custom JSON serializer for complex objects
def serialize_for_json(obj):
    """Convert complex objects to JSON-serializable format."""
    if is_dataclass(obj):
        return asdict(obj)
    elif isinstance(obj, Enum):
        return obj.value  # Convert enum to its value
    elif hasattr(obj, '__dict__'):
        return {k: serialize_for_json(v) for k, v in obj.__dict__.items()}
    elif isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    else:
        # For any other complex objects, convert to string representation
        return str(obj)

def safe_json_dumps(obj, indent=2):
    """Safely serialize objects to JSON string."""
    return json.dumps(serialize_for_json(obj), indent=indent)

def truncate_journey_data(journey_data: Dict[str, Any], max_length: int = 50000) -> Dict[str, Any]:
    """Truncate journey data to fit within context limits while preserving key information."""
    # Create a truncated version with the most important data
    truncated = {
        "title": journey_data.get("title", "")[:500],
        "summary": journey_data.get("summary", "")[:1000],
    }
    
    # Limit arrays to most important items
    if "pain_points" in journey_data:
        truncated["pain_points"] = journey_data["pain_points"][:10]  # Top 10 pain points
    
    if "quotes" in journey_data:
        truncated["quotes"] = journey_data["quotes"][:8]  # Top 8 quotes
    
    if "insights" in journey_data:
        truncated["insights"] = journey_data["insights"][:8]  # Top 8 insights
    
    if "recommendations" in journey_data:
        truncated["recommendations"] = journey_data["recommendations"][:6]  # Top 6 recommendations
    
    if "data_points" in journey_data:
        truncated["data_points"] = journey_data["data_points"][:5]  # Top 5 data points
    
    if "phases" in journey_data:
        truncated["phases"] = journey_data["phases"][:5]  # Top 5 phases
    
    # Include emotional journey but truncated
    if "emotional_journey" in journey_data:
        ej = journey_data["emotional_journey"]
        truncated["emotional_journey"] = {
            "overall_sentiment": ej.get("overall_sentiment", 0),
            "key_emotional_moments": ej.get("key_emotional_moments", [])[:5],
            "emotional_triggers": ej.get("emotional_triggers", [])[:5]
        }
    
    # Check if we're still too long and truncate further if needed
    serialized = safe_json_dumps(truncated)
    if len(serialized) > max_length:
        # Further truncation - keep only the essentials
        essential = {
            "title": truncated["title"][:200],
            "summary": truncated["summary"][:500],
            "pain_points": truncated.get("pain_points", [])[:5],
            "quotes": truncated.get("quotes", [])[:4],
            "insights": truncated.get("insights", [])[:4],
            "recommendations": truncated.get("recommendations", [])[:3]
        }
        return essential
    
    return truncated

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ThinkingDepth(Enum):
    STANDARD = "standard"
    DEEP = "deep"
    COMPREHENSIVE = "comprehensive"

class ContentSophistication(Enum):
    PROFESSIONAL = "professional"
    EXPERT = "expert"
    THOUGHT_LEADER = "thought_leader"

@dataclass
class ExtendedThinkingConfig:
    max_output_tokens: int = 8000  # Reduced from 64000 to fit within context limits
    temperature: float = 0.3
    depth_level: ThinkingDepth = ThinkingDepth.COMPREHENSIVE
    sophistication: ContentSophistication = ContentSophistication.EXPERT
    timeout: int = 300
    model: str = "claude-3-7-sonnet-20250219"

@dataclass
class ThinkingMetrics:
    insight_complexity: float = 0.0
    human_story_integration: float = 0.0
    professional_authority: float = 0.0
    industry_relevance: float = 0.0
    thought_leadership_potential: float = 0.0
    overall_score: float = 0.0
    processing_time: float = 0.0

@dataclass
class AnalysisResult:
    stage: str
    insights: List[str]
    patterns: List[str]
    human_stories: List[str]
    professional_implications: List[str]
    emotional_journey: Dict[str, Any]
    strategic_recommendations: List[str]
    metrics: ThinkingMetrics

class ExtendedThinkingEngine:
    """
    Core engine for extended thinking mode with deep analysis capabilities.
    Implements multi-stage analysis process for profound LinkedIn content generation.
    """
    
    def __init__(self, config: ExtendedThinkingConfig = None):
        self.config = config or ExtendedThinkingConfig()
        self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        self.analysis_stages = [
            "deep_data_analysis",
            "psychological_insight_development", 
            "professional_context_mapping",
            "linkedin_content_strategy"
        ]
        
    async def run_extended_thinking(self, journey_data: Dict[str, Any], 
                                  content_type: str = "comprehensive") -> AnalysisResult:
        """
        Execute the full extended thinking process with multi-stage analysis.
        
        Args:
            journey_data: Extracted data from journey map HTML
            content_type: Type of content to generate
            
        Returns:
            AnalysisResult with comprehensive insights and metrics
        """
        start_time = time.time()
        logger.info("Starting extended thinking process...")
        
        try:
            # Stage 1: Deep Data Analysis
            stage1_result = await self._stage1_deep_data_analysis(journey_data)
            
            # Stage 2: Psychological Insight Development
            stage2_result = await self._stage2_psychological_insights(journey_data, stage1_result)
            
            # Stage 3: Professional Context Mapping
            stage3_result = await self._stage3_professional_context(journey_data, stage1_result, stage2_result)
            
            # Stage 4: LinkedIn Content Strategy
            stage4_result = await self._stage4_content_strategy(journey_data, stage1_result, stage2_result, stage3_result, content_type)
            
            # Calculate comprehensive metrics
            metrics = await self._calculate_thinking_metrics(stage1_result, stage2_result, stage3_result, stage4_result)
            metrics.processing_time = time.time() - start_time
            
            # Combine all results
            final_result = AnalysisResult(
                stage="complete",
                insights=stage1_result.get("insights", []) + stage2_result.get("insights", []) + stage3_result.get("insights", []),
                patterns=stage1_result.get("patterns", []) + stage2_result.get("patterns", []),
                human_stories=stage2_result.get("human_stories", []),
                professional_implications=stage3_result.get("professional_implications", []),
                emotional_journey=stage2_result.get("emotional_journey", {}),
                strategic_recommendations=stage3_result.get("strategic_recommendations", []) + stage4_result.get("recommendations", []),
                metrics=metrics
            )
            
            logger.info(f"Extended thinking completed in {metrics.processing_time:.2f} seconds")
            return final_result
            
        except Exception as e:
            logger.error(f"Extended thinking failed: {str(e)}")
            raise

    async def _stage1_deep_data_analysis(self, journey_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Stage 1: Comprehensive extraction of all insights from HTML data.
        Identifies patterns, pain points, emotional triggers, and data trends.
        """
        logger.info("Stage 1: Deep Data Analysis")
        
        prompt = f"""
        Conduct a comprehensive analysis of customer journey data to extract deep insights and patterns.

        You're performing the first stage of extended thinking analysis, focusing on comprehensive data extraction and pattern identification.

        JOURNEY DATA TO ANALYZE:
        {safe_json_dumps(truncate_journey_data(journey_data))}

        Perform this deep analysis:

        **Extract Key Insights**
        - Identify all significant pain points, emotional moments, and data trends
        - Look for surprising or counterintuitive findings
        - Categorize insights by human impact level and business implications
        - Note specific supporting data for each insight

        **Identify Patterns**
        - Find recurring themes that connect individual experiences
        - Assess frequency and impact of identified patterns
        - Map connections between different patterns

        **Map Emotional Journey**
        - Track emotional states across journey phases
        - Identify intensity levels and emotional triggers
        - Note how emotions transition between phases

        **Analyze Data Trends**
        - Identify key trends and their directions
        - Assess business implications of each trend
        - Note supporting evidence for trends

        Provide your analysis in a structured way that captures the depth and complexity of the customer journey while highlighting the most strategically important findings.
        """
        
        response = await self._call_anthropic(prompt)
        
        # Parse the response into structured data
        return self._parse_stage1_response(response)

    async def _stage2_psychological_insights(self, journey_data: Dict[str, Any], 
                                           stage1_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Stage 2: Develop psychological insights and human story extraction.
        Understands the human experience behind the data.
        """
        logger.info("Stage 2: Psychological Insight Development")
        
        prompt = f"""
        Develop profound psychological insights and extract compelling human stories from the customer journey analysis.

        Building on the previous data analysis, now focus on understanding the human experience behind the data and extracting authentic stories that will resonate with business professionals.

        STAGE 1 ANALYSIS RESULTS:
        {safe_json_dumps(stage1_result)}

        ORIGINAL JOURNEY DATA:
        {safe_json_dumps(truncate_journey_data(journey_data))}

        Develop psychological insights by:

        **Understanding Human Experience**
        - Identify the real human struggles, triumphs, and revelations in the journey
        - Look for surprising or counterintuitive findings about human behavior
        - Analyze emotional triggers and underlying motivations
        - Connect individual experiences to universal human themes

        **Extracting Human Stories**
        - Find authentic moments that reveal deeper psychological truths
        - Extract compelling quotes that showcase genuine human experience
        - Identify universal themes that business professionals can relate to
        - Develop empathy-driven narratives that maintain professional relevance

        **Identifying Psychological Patterns**
        - Map recurring human behavior patterns and their psychological explanations
        - Understand what triggers these patterns and their implications
        - Assess how common and universal these patterns are

        **Mapping Emotional Journey**
        - Describe the overall emotional progression through the journey
        - Identify key emotional moments and their intensity
        - Understand psychological barriers and potential resolutions

        Provide insights that reveal the deeper human truths behind the customer experience data, making it relatable and actionable for business leaders.
        """
        
        response = await self._call_anthropic(prompt)
        
        # Parse the response into structured data
        return self._parse_stage2_response(response)

    async def _stage3_professional_context(self, journey_data: Dict[str, Any],
                                         stage1_result: Dict[str, Any],
                                         stage2_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Stage 3: Map professional context and develop strategic business insights.
        Transforms human experiences into strategic business intelligence.
        """
        logger.info("Stage 3: Professional Context Mapping")
        
        prompt = f"""
        EXTENDED THINKING MODE - STAGE 3: PROFESSIONAL CONTEXT MAPPING
        
        Transform the human experiences and psychological insights into strategic business intelligence
        that demonstrates professional authority and industry expertise.
        
        PREVIOUS ANALYSIS:
        Stage 1 - Data Analysis: {safe_json_dumps(stage1_result)}
        Stage 2 - Psychological Insights: {safe_json_dumps(stage2_result)}
        
        ORIGINAL JOURNEY DATA:
        {safe_json_dumps(truncate_journey_data(journey_data))}
        
        PROFESSIONAL CONTEXT FRAMEWORK:
        1. Industry implications of the findings
        2. Business impact calculations and projections
        3. Strategic recommendations development
        4. Competitive advantage identification
        5. Market trend connections
        6. Executive-level insights
        
        STRATEGIC ANALYSIS FOCUS:
        - Calculate potential business impact (revenue, cost, efficiency)
        - Identify competitive advantages from insights
        - Connect findings to broader industry trends
        - Develop C-suite level recommendations
        - Position insights as thought leadership opportunities
        - Create actionable intelligence for business leaders
        
        CRITICAL: RESPOND WITH ONLY VALID JSON. NO MARKDOWN, NO EXPLANATIONS, NO TEXT OUTSIDE JSON.
        
        OUTPUT FORMAT (JSON ONLY):
        {{
            "professional_implications": [
                {{
                    "implication": "strategic business implication",
                    "impact_category": "revenue|cost|efficiency|risk|opportunity",
                    "potential_value": "quantified impact when possible",
                    "urgency": "low|medium|high|critical",
                    "industry_relevance": "which industries this affects",
                    "competitive_advantage": "how this creates advantage",
                    "implementation_complexity": "easy|moderate|complex"
                }}
            ],
            "strategic_recommendations": [
                {{
                    "recommendation": "strategic recommendation",
                    "rationale": "why this recommendation makes sense",
                    "expected_outcome": "what success looks like",
                    "resource_requirements": "what's needed to implement",
                    "timeline": "implementation timeframe",
                    "risk_assessment": "potential risks and mitigation",
                    "thought_leadership_angle": "how this positions as industry leader"
                }}
            ],
            "industry_insights": [
                {{
                    "insight": "industry-level insight",
                    "trend_connection": "how this connects to market trends",
                    "disruption_potential": "potential for industry disruption",
                    "stakeholder_impact": "who this affects and how",
                    "future_implications": "what this means long-term"
                }}
            ],
            "business_intelligence": [
                {{
                    "intelligence": "actionable business intelligence",
                    "evidence": "data that supports this intelligence",
                    "confidence_level": "1-10 scale",
                    "application": "how businesses can use this",
                    "measurement": "how to measure success"
                }}
            ],
            "thought_leadership_opportunities": [
                {{
                    "opportunity": "thought leadership positioning",
                    "unique_angle": "what makes this perspective unique",
                    "audience": "who would find this valuable",
                    "platform": "where to share this insight",
                    "timing": "when to share for maximum impact"
                }}
            ]
        }}
        
        RESPOND WITH JSON ONLY. NO MARKDOWN, NO EXPLANATIONS, JUST THE JSON OBJECT.
        """
        
        try:
            response = await self._call_anthropic(prompt)
            return json.loads(response)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse JSON, returning structured response. Claude response was: {response[:500]}...")
            return {"professional_implications": [], "strategic_recommendations": [], "industry_insights": [], "business_intelligence": [], "thought_leadership_opportunities": []}

    async def _stage4_content_strategy(self, journey_data: Dict[str, Any],
                                     stage1_result: Dict[str, Any],
                                     stage2_result: Dict[str, Any],
                                     stage3_result: Dict[str, Any],
                                     content_type: str) -> Dict[str, Any]:
        """
        Stage 4: Develop LinkedIn content strategy based on all previous analysis.
        Creates the strategic framework for content generation.
        """
        logger.info("Stage 4: LinkedIn Content Strategy")
        
        prompt = f"""
        EXTENDED THINKING MODE - STAGE 4: LINKEDIN CONTENT STRATEGY
        
        Using all previous analysis, develop a sophisticated LinkedIn content strategy
        that balances professional authority with human authenticity for maximum engagement.
        
        COMPREHENSIVE ANALYSIS:
        Data Analysis: {safe_json_dumps(stage1_result)}
        Psychological Insights: {safe_json_dumps(stage2_result)}
        Professional Context: {safe_json_dumps(stage3_result)}
        
        CONTENT TYPE: {content_type}
        
        LINKEDIN CONTENT STRATEGY FRAMEWORK:
        1. Hook development based on most compelling insights
        2. Narrative arc creation for engagement
        3. Professional tone with human authenticity
        4. Data storytelling optimization
        5. Engagement trigger implementation
        6. Thought leadership positioning
        
        STRATEGY DEVELOPMENT FOCUS:
        - Identify the most compelling hook from all insights
        - Create narrative arcs that maintain engagement
        - Balance professional authority with human stories
        - Optimize for LinkedIn algorithm and engagement
        - Position content for thought leadership
        - Design engagement triggers for meaningful dialogue
        
        CRITICAL: RESPOND WITH ONLY VALID JSON. NO MARKDOWN, NO EXPLANATIONS, NO TEXT OUTSIDE JSON.
        
        OUTPUT FORMAT (JSON ONLY):
        {{
            "content_hooks": [
                {{
                    "hook": "compelling opening statement",
                    "insight_basis": "which insight this hook is based on",
                    "engagement_potential": "1-10 scale",
                    "surprise_factor": "what makes this surprising",
                    "professional_relevance": "why professionals care",
                    "emotional_trigger": "what emotion this evokes"
                }}
            ],
            "narrative_strategies": [
                {{
                    "strategy": "narrative approach",
                    "structure": "how to structure the content",
                    "emotional_arc": "emotional progression",
                    "professional_value": "business value delivered",
                    "engagement_points": "where to trigger engagement",
                    "call_to_action": "how to encourage interaction"
                }}
            ],
            "thought_leadership_angles": [
                {{
                    "angle": "thought leadership positioning",
                    "unique_perspective": "what makes this view unique",
                    "authority_demonstration": "how this shows expertise",
                    "industry_relevance": "industry connection",
                    "future_focus": "forward-looking element",
                    "actionability": "how readers can apply this"
                }}
            ],
            "engagement_optimization": {{
                "algorithm_factors": [
                    "factors that boost LinkedIn algorithm reach"
                ],
                "engagement_triggers": [
                    "specific elements that encourage comments/shares"
                ],
                "timing_recommendations": "optimal posting times",
                "hashtag_strategy": "strategic hashtag approach",
                "mention_strategy": "who to mention and why"
            }},
            "recommendations": [
                {{
                    "recommendation": "content strategy recommendation",
                    "rationale": "why this approach works",
                    "implementation": "how to implement this",
                    "expected_outcome": "what results to expect"
                }}
            ]
        }}
        
        RESPOND WITH JSON ONLY. NO MARKDOWN, NO EXPLANATIONS, JUST THE JSON OBJECT.
        """
        
        try:
            response = await self._call_anthropic(prompt)
            return json.loads(response)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse JSON, returning structured response. Claude response was: {response[:500]}...")
            return {"content_hooks": [], "narrative_strategies": [], "thought_leadership_angles": [], "engagement_optimization": {}, "recommendations": []}

    async def _calculate_thinking_metrics(self, stage1: Dict, stage2: Dict, 
                                        stage3: Dict, stage4: Dict) -> ThinkingMetrics:
        """
        Calculate comprehensive metrics for the extended thinking process.
        """
        metrics = ThinkingMetrics()
        
        # Insight complexity (based on depth and uniqueness of insights)
        total_insights = len(stage1.get("insights", [])) + len(stage2.get("insights", [])) + len(stage3.get("professional_implications", []))
        metrics.insight_complexity = min(total_insights / 10 * 10, 10.0)
        
        # Human story integration (based on quality of human narratives)
        human_stories = len(stage2.get("human_stories", []))
        metrics.human_story_integration = min(human_stories / 5 * 10, 10.0)
        
        # Professional authority (based on strategic recommendations and business insights)
        strategic_recs = len(stage3.get("strategic_recommendations", []))
        business_intelligence = len(stage3.get("business_intelligence", []))
        metrics.professional_authority = min((strategic_recs + business_intelligence) / 8 * 10, 10.0)
        
        # Industry relevance (based on industry insights and trends)
        industry_insights = len(stage3.get("industry_insights", []))
        thought_leadership = len(stage3.get("thought_leadership_opportunities", []))
        metrics.industry_relevance = min((industry_insights + thought_leadership) / 6 * 10, 10.0)
        
        # Thought leadership potential (based on unique perspectives and strategic value)
        content_hooks = len(stage4.get("content_hooks", []))
        leadership_angles = len(stage4.get("thought_leadership_angles", []))
        metrics.thought_leadership_potential = min((content_hooks + leadership_angles) / 6 * 10, 10.0)
        
        # Overall score (weighted average)
        metrics.overall_score = (
            metrics.insight_complexity * 0.2 +
            metrics.human_story_integration * 0.2 +
            metrics.professional_authority * 0.25 +
            metrics.industry_relevance * 0.15 +
            metrics.thought_leadership_potential * 0.2
        )
        
        return metrics

    def _parse_stage1_response(self, response: str) -> Dict[str, Any]:
        """Parse Stage 1 response into structured data."""
        # Extract insights, patterns, etc. from natural language response
        insights = []
        patterns = []
        emotional_arc = {}
        data_trends = []
        
        # Simple parsing based on structure and keywords
        lines = response.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Identify sections
            if 'insight' in line.lower() and ('key' in line.lower() or 'extract' in line.lower()):
                current_section = 'insights'
                continue
            elif 'pattern' in line.lower():
                current_section = 'patterns'
                continue
            elif 'emotional' in line.lower() or 'emotion' in line.lower():
                current_section = 'emotional'
                continue
            elif 'trend' in line.lower():
                current_section = 'trends'
                continue
            
            # Extract content based on current section
            if current_section == 'insights' and line.startswith('-'):
                insights.append({
                    "insight": line[1:].strip(),
                    "category": "general",
                    "human_impact": "medium",
                    "business_implication": "strategic consideration",
                    "supporting_data": "from journey analysis",
                    "surprise_factor": "analytical finding",
                    "emotional_intensity": 5
                })
            elif current_section == 'patterns' and line.startswith('-'):
                patterns.append({
                    "pattern": line[1:].strip(),
                    "frequency": "regular",
                    "impact": "moderate",
                    "connections": "links to other findings"
                })
            elif current_section == 'trends' and line.startswith('-'):
                data_trends.append({
                    "trend": line[1:].strip(),
                    "direction": "evolving",
                    "implications": "business consideration",
                    "supporting_evidence": "journey data"
                })
        
        # Default emotional arc
        emotional_arc = {
            "journey_phases": [
                {
                    "phase": "discovery",
                    "emotional_state": "curious",
                    "intensity": 6,
                    "triggers": ["initial contact"],
                    "transitions": "from awareness to consideration"
                }
            ]
        }
        
        return {
            "insights": insights or [{"insight": "Customer journey reveals strategic opportunities", "category": "general", "human_impact": "medium", "business_implication": "strategic growth", "supporting_data": "journey analysis", "surprise_factor": "opportunity identification", "emotional_intensity": 6}],
            "patterns": patterns or [{"pattern": "Customer experience patterns emerge", "frequency": "consistent", "impact": "significant", "connections": "strategic implications"}],
            "emotional_arc": emotional_arc,
            "data_trends": data_trends or [{"trend": "Customer behavior evolution", "direction": "positive", "implications": "business opportunities", "supporting_evidence": "journey data"}]
        }

    def _parse_stage2_response(self, response: str) -> Dict[str, Any]:
        """Parse Stage 2 response into structured psychological insights."""
        human_stories = []
        psychological_patterns = []
        emotional_journey = {}
        insights = []
        
        # Simple parsing based on structure and keywords
        lines = response.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Identify sections
            if 'human' in line.lower() and ('story' in line.lower() or 'experience' in line.lower()):
                current_section = 'stories'
                continue
            elif 'pattern' in line.lower() and 'psychological' in line.lower():
                current_section = 'patterns'
                continue
            elif 'emotional' in line.lower() and 'journey' in line.lower():
                current_section = 'emotional'
                continue
            elif 'insight' in line.lower():
                current_section = 'insights'
                continue
            
            # Extract content based on current section
            if current_section == 'stories' and line.startswith('-'):
                human_stories.append({
                    "story": line[1:].strip(),
                    "psychological_insight": "reveals human behavior patterns",
                    "universal_theme": "common human experience",
                    "professional_relevance": "applicable to business context",
                    "emotional_resonance": 7,
                    "authenticity_score": 8,
                    "supporting_quote": "authentic customer voice"
                })
            elif current_section == 'patterns' and line.startswith('-'):
                psychological_patterns.append({
                    "pattern": line[1:].strip(),
                    "psychology": "underlying psychological drivers",
                    "triggers": "behavioral triggers identified",
                    "implications": "business design implications",
                    "universality": "broadly applicable"
                })
            elif current_section == 'insights' and line.startswith('-'):
                insights.append({
                    "insight": line[1:].strip(),
                    "depth": "profound understanding",
                    "implications": "professional applications",
                    "human_element": "authentic human truth"
                })
        
        # Default emotional journey
        emotional_journey = {
            "overall_arc": "journey through stages of engagement and resolution",
            "key_moments": [
                {
                    "moment": "initial contact",
                    "emotion": "curiosity",
                    "intensity": 6,
                    "cause": "new opportunity discovered",
                    "impact": "sets expectations",
                    "recovery": "moves to exploration"
                }
            ],
            "psychological_barriers": [
                {
                    "barrier": "uncertainty about process",
                    "root_cause": "lack of clear information",
                    "manifestation": "hesitation to proceed",
                    "resolution": "provide clear guidance"
                }
            ]
        }
        
        return {
            "human_stories": human_stories or [{"story": "Customer discovers unexpected value in the experience", "psychological_insight": "people seek authentic connection", "universal_theme": "desire for understanding", "professional_relevance": "builds trust and loyalty", "emotional_resonance": 8, "authenticity_score": 9, "supporting_quote": "authentic customer feedback"}],
            "psychological_patterns": psychological_patterns or [{"pattern": "customers value transparency", "psychology": "trust-building through openness", "triggers": "clear communication", "implications": "design for transparency", "universality": "universal human need"}],
            "emotional_journey": emotional_journey,
            "insights": insights or [{"insight": "authentic experiences create lasting impressions", "depth": "deep human truth", "implications": "focus on genuine interactions", "human_element": "emotional connection"}]
        }

    async def _call_anthropic(self, prompt: str) -> str:
        """
        Make an API call to Anthropic with extended thinking configuration.
        """
        try:
            response = self.anthropic_client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_output_tokens,
                temperature=self.config.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic API call failed: {str(e)}")
            raise

    def get_thinking_progress(self, stage: str) -> Dict[str, Any]:
        """
        Get progress information for the current thinking stage.
        """
        stage_info = {
            "deep_data_analysis": {
                "name": "Analyzing journey data for deep insights...",
                "progress": 25,
                "description": "Extracting comprehensive insights and identifying patterns"
            },
            "psychological_insight_development": {
                "name": "Identifying profound patterns and human stories...",
                "progress": 50,
                "description": "Developing psychological insights and human narratives"
            },
            "professional_context_mapping": {
                "name": "Developing strategic business implications...",
                "progress": 75,
                "description": "Mapping professional context and strategic opportunities"
            },
            "linkedin_content_strategy": {
                "name": "Crafting thought leadership content strategy...",
                "progress": 100,
                "description": "Optimizing for LinkedIn engagement and authority"
            }
        }
        
        return stage_info.get(stage, {
            "name": "Processing...",
            "progress": 0,
            "description": "Preparing analysis"
        })

# Factory function for creating extended thinking engine
def create_extended_thinking_engine(depth: str = "comprehensive", 
                                  sophistication: str = "expert") -> ExtendedThinkingEngine:
    """
    Factory function to create an extended thinking engine with specified configuration.
    """
    config = ExtendedThinkingConfig(
        depth_level=ThinkingDepth(depth),
        sophistication=ContentSophistication(sophistication)
    )
    return ExtendedThinkingEngine(config)