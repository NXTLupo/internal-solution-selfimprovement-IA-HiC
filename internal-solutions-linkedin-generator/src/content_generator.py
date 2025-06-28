"""
LinkedIn Content Generator with Extended Thinking Integration
Generates 4 types of LinkedIn content using extended thinking for deep, professional content.
"""

import os
import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json
from anthropic import Anthropic
from dataclasses import asdict, is_dataclass
from .extended_thinking import ExtendedThinkingEngine, AnalysisResult, ThinkingMetrics, truncate_journey_data
from .html_parser import ParsedJourneyData

# Custom JSON serializer for complex objects
def serialize_for_json(obj):
    """Convert complex objects to JSON-serializable format."""
    if is_dataclass(obj):
        # Convert dataclass to dict and recursively serialize all values
        data_dict = asdict(obj)
        return {k: serialize_for_json(v) for k, v in data_dict.items()}
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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ContentType(Enum):
    SHORT_FORM = "short_form"
    CAROUSEL = "carousel"
    LONG_FORM = "long_form"
    ENGAGEMENT_TACTICS = "engagement_tactics"
    PODCAST = "podcast"

class LinkedInOptimization(Enum):
    ALGORITHM_FRIENDLY = "algorithm_friendly"
    ENGAGEMENT_FOCUSED = "engagement_focused"
    THOUGHT_LEADERSHIP = "thought_leadership"
    PROFESSIONAL_AUTHORITY = "professional_authority"

@dataclass
class ContentPiece:
    content_type: ContentType
    title: str
    content: str
    hook: str
    call_to_action: str
    hashtags: List[str]
    engagement_triggers: List[str]
    thought_leadership_score: float
    professional_authority_score: float
    human_authenticity_score: float
    estimated_reach: str
    target_audience: str
    posting_time_recommendation: str
    follow_up_suggestions: List[str]

@dataclass
class CarouselSlide:
    slide_number: int
    title: str
    content: str
    visual_suggestion: str
    key_insight: str

@dataclass
class GeneratedContent:
    content_pieces: List[ContentPiece]
    overall_quality_score: float
    thought_leadership_positioning: str
    brand_voice_consistency: float
    engagement_prediction: str
    recommendations: List[str]
    extended_thinking_insights: str
    processing_metrics: ThinkingMetrics

class LinkedInContentGenerator:
    """
    Advanced content generator that creates sophisticated LinkedIn content
    using extended thinking mode for profound professional insights.
    """
    
    def __init__(self, extended_thinking_engine: ExtendedThinkingEngine = None):
        self.extended_thinking_engine = extended_thinking_engine
        self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        
        # LinkedIn 2025 best practices
        self.linkedin_best_practices = {
            "optimal_length": {
                "short_form": {"min": 900, "max": 1200, "ideal": 1050},
                "carousel": {"slides": 5, "chars_per_slide": 200},
                "long_form": {"min": 1200, "max": 2000, "ideal": 1600}
            },
            "engagement_triggers": [
                "Ask thought-provoking questions",
                "Share counter-intuitive insights",
                "Use data-driven storytelling",
                "Include personal/professional anecdotes",
                "Challenge conventional wisdom",
                "Provide actionable takeaways",
                "Use emotional storytelling",
                "Include industry predictions"
            ],
            "hashtag_strategy": {
                "total_count": {"min": 3, "max": 8},
                "mix": {
                    "industry_specific": 2,
                    "trending_professional": 2,
                    "company_branded": 1,
                    "location_based": 1
                }
            },
            "posting_optimization": {
                "best_times": ["Tuesday 9AM", "Wednesday 10AM", "Thursday 2PM"],
                "frequency": "3-5 posts per week",
                "content_mix": "70% value, 20% personal, 10% promotional"
            }
        }

    async def generate_comprehensive_content(self, journey_data: ParsedJourneyData, 
                                           content_types: List[ContentType] = None,
                                           optimization_focus: LinkedInOptimization = LinkedInOptimization.THOUGHT_LEADERSHIP) -> GeneratedContent:
        """
        Generate comprehensive LinkedIn content using extended thinking analysis.
        
        Args:
            journey_data: Parsed journey map data
            content_types: Types of content to generate (default: all 4 types)
            optimization_focus: LinkedIn optimization strategy
            
        Returns:
            GeneratedContent with all requested content types and analytics
        """
        if content_types is None:
            content_types = list(ContentType)
        
        logger.info("Starting comprehensive LinkedIn content generation with extended thinking...")
        
        try:
            # Step 1: Run extended thinking analysis
            thinking_result = await self.extended_thinking_engine.run_extended_thinking(
                serialize_for_json(journey_data), "comprehensive"
            )
            
            # Step 2: Generate each content type
            content_pieces = []
            
            for content_type in content_types:
                logger.info(f"Generating {content_type.value if hasattr(content_type, 'value') else content_type} content...")
                
                if content_type == ContentType.SHORT_FORM:
                    piece = await self._generate_short_form_post(journey_data, thinking_result, optimization_focus)
                elif content_type == ContentType.CAROUSEL:
                    piece = await self._generate_carousel_content(journey_data, thinking_result, optimization_focus)
                elif content_type == ContentType.LONG_FORM:
                    piece = await self._generate_long_form_article(journey_data, thinking_result, optimization_focus)
                elif content_type == ContentType.ENGAGEMENT_TACTICS:
                    piece = await self._generate_engagement_tactics(journey_data, thinking_result, optimization_focus)
                elif content_type == ContentType.PODCAST:
                    piece = await self._generate_podcast_script(journey_data, thinking_result, optimization_focus)
                
                content_pieces.append(piece)
            
            # Step 3: Calculate overall metrics and recommendations
            overall_quality = self._calculate_overall_quality(content_pieces, thinking_result)
            thought_leadership_pos = self._assess_thought_leadership_positioning(content_pieces, thinking_result)
            brand_consistency = self._assess_brand_voice_consistency(content_pieces)
            engagement_pred = self._predict_engagement_performance(content_pieces)
            recommendations = self._generate_strategic_recommendations(content_pieces, thinking_result)
            
            result = GeneratedContent(
                content_pieces=content_pieces,
                overall_quality_score=overall_quality,
                thought_leadership_positioning=thought_leadership_pos,
                brand_voice_consistency=brand_consistency,
                engagement_prediction=engagement_pred,
                recommendations=recommendations,
                extended_thinking_insights=self._summarize_thinking_insights(thinking_result),
                processing_metrics=thinking_result.metrics
            )
            
            logger.info(f"Content generation completed. Quality score: {overall_quality:.1f}")
            return result
            
        except Exception as e:
            logger.error(f"Content generation failed: {str(e)}")
            raise

    async def _generate_short_form_post(self, journey_data: ParsedJourneyData, 
                                      thinking_result: AnalysisResult,
                                      optimization: LinkedInOptimization) -> ContentPiece:
        """
        Generate compelling short-form posts that blend authority with accessibility.
        """
        # Extract key insights from the journey data
        key_quotes = [quote.content for quote in journey_data.quotes[:2]]
        key_insights = [insight.content for insight in journey_data.insights[:2]]
        pain_points = [pp.content for pp in journey_data.pain_points[:2]]
        
        # Extract thinking insights safely
        def safe_extract(items, default=""):
            if not items:
                return default
            item = items[0]
            if isinstance(item, dict):
                return item.get('insight', item.get('story', item.get('content', str(item))))
            return str(item)
        
        thinking_insight = safe_extract(thinking_result.insights, "Strategic insights emerging")
        
        prompt = f"""
        Create compelling LinkedIn content that captures attention with unexpected business intelligence.

        Context:
        Subject: {journey_data.title}
        Background: {journey_data.summary[:400]}

        Evidence Base:
        • Customer perspectives: {'; '.join(key_quotes) if key_quotes else 'Direct customer feedback'}
        • Business intelligence: {'; '.join(key_insights) if key_insights else 'Strategic patterns'}
        • Critical challenges: {'; '.join(pain_points) if pain_points else 'Operational barriers'}
        • Strategic insight: {thinking_insight}

        Writing Standards:
        1. Start with a surprising business truth that challenges conventional thinking
        2. NO cliche openings - avoid "In today's competitive landscape," "In the rapidly changing world," "In this digital age," or similar overused phrases
        3. Write with the authority of a Fortune 500 executive sharing hard-won insights
        4. Be unexpectedly human - show vulnerability, admit surprises, share what changed your thinking
        5. NO self-referential language - never mention "this analysis," "our research," "this study," or "findings"
        6. Present insights as lived business intelligence, not academic observations
        7. End with a provocative question that makes executives think differently
        8. Write with the confidence of someone who has actually solved these problems

        Voice: Write as a seasoned business leader sharing breakthrough insights with peers. Be bold, authentic, and intellectually provocative.

        Include 3-5 strategic hashtags.
        """
        
        response = await self._call_anthropic(prompt)
        
        # Clean up any JSON or markdown formatting that might appear
        clean_content = self._clean_content_formatting(response)
        
        # Add simple text formatting header
        text_header = self._create_simple_text_header(ContentType.SHORT_FORM, journey_data)
        final_content = f"{text_header}\n\n{clean_content}"
        
        return ContentPiece(
            content_type=ContentType.SHORT_FORM,
            title="Strategic Business Insight",
            content=final_content,
            hook=clean_content.split('\n')[0],  # First line as hook (without ASCII)
            call_to_action=clean_content.split('\n')[-2] if '\n' in clean_content else "What's your perspective?",
            hashtags=self._extract_hashtags(clean_content),
            engagement_triggers=["strategic insights", "business intelligence"],
            thought_leadership_score=9.0,
            professional_authority_score=8.5,
            human_authenticity_score=8.8,
            estimated_reach="High - authoritative content drives quality engagement",
            target_audience="Senior business leaders and strategic decision makers",
            posting_time_recommendation="Tuesday 9AM or Wednesday 10AM",
            follow_up_suggestions=["Deep-dive analysis", "Implementation framework", "Industry comparison"]
        )

    async def _generate_carousel_content(self, journey_data: ParsedJourneyData,
                                       thinking_result: AnalysisResult,
                                       optimization: LinkedInOptimization) -> ContentPiece:
        """
        Generate compelling carousel content that tells a cohesive story across slides.
        """
        # Extract key insights from the journey data
        key_quotes = [quote.content for quote in journey_data.quotes[:3]]
        key_insights = [insight.content for insight in journey_data.insights[:3]]
        pain_points = [pp.content for pp in journey_data.pain_points[:3]]
        recommendations = [rec.content for rec in journey_data.recommendations[:3]]
        
        # Extract thinking insights safely
        def safe_extract(items, default=""):
            if not items:
                return default
            item = items[0]
            if isinstance(item, dict):
                return item.get('insight', item.get('story', item.get('content', str(item))))
            return str(item)
        
        strategic_insight = safe_extract(thinking_result.insights, "Strategic patterns identified")
        human_story = safe_extract(thinking_result.human_stories, "Customer experiences reveal")
        
        prompt = f"""
        Create a LinkedIn carousel that breaks through the noise with counterintuitive business intelligence.

        Context:
        Subject: {journey_data.title}
        Background: {journey_data.summary[:400]}

        Intelligence Base:
        Business patterns: {'; '.join(key_insights) if key_insights else 'Strategic patterns identified'}
        Customer reality: {'; '.join(key_quotes) if key_quotes else 'Direct customer perspectives'}
        Operational challenges: {'; '.join(pain_points) if pain_points else 'Critical business barriers'}
        Strategic breakthrough: {strategic_insight}

        Carousel Standards:
        1. Hook: Start with a business truth that makes executives stop scrolling
        2. NO corporate speak - avoid "leverage," "synergies," "best practices," "digital transformation journey"
        3. NO cliche openings - never start with "In today's landscape" or similar tired phrases
        4. Write like you just discovered something that will change how business gets done
        5. Be specific and actionable - give executives something they can implement Monday morning
        6. NO academic references - present insights as battlefield intelligence
        7. End with a question that challenges how they currently operate
        8. Show, don't tell - use concrete examples over abstract concepts

        Voice: Write as a CEO sharing breakthrough insights at a private executive dinner. Be direct, surprising, and immediately valuable.

        Format as 5 distinct slides with clear headers. Include strategic hashtags.
        """
        
        response = await self._call_anthropic(prompt)
        
        # Clean up any JSON or markdown formatting that might appear
        clean_content = self._clean_content_formatting(response)
        
        # Add simple text formatting header
        text_header = self._create_simple_text_header(ContentType.CAROUSEL, journey_data)
        final_content = f"{text_header}\n\n{clean_content}"
        
        # Extract title from first line
        lines = clean_content.split('\n')
        title = lines[0].strip('[]') if lines else "Strategic Business Carousel"
        
        return ContentPiece(
            content_type=ContentType.CAROUSEL,
            title=title,
            content=final_content,
            hook=lines[2] if len(lines) > 2 else "Strategic business insights ahead",
            call_to_action=lines[-3] if len(lines) > 3 else "What's your perspective on this trend?",
            hashtags=self._extract_hashtags(clean_content),
            engagement_triggers=["strategic business insights", "executive dialogue"],
            thought_leadership_score=9.2,
            professional_authority_score=9.0,
            human_authenticity_score=8.5,
            estimated_reach="High (carousel format with compelling narrative)",
            target_audience="Senior executives and strategic decision makers",
            posting_time_recommendation="Tuesday 9AM or Wednesday 10AM (optimal for carousel engagement)",
            follow_up_suggestions=["Implementation guide", "Detailed case study", "Industry benchmark comparison"]
        )

    async def _generate_long_form_article(self, journey_data: ParsedJourneyData,
                                        thinking_result: AnalysisResult,
                                        optimization: LinkedInOptimization) -> ContentPiece:
        """
        Generate authoritative long-form articles with strategic depth and accessibility.
        """
        # Extract comprehensive insights from the journey data
        all_quotes = [quote.content for quote in journey_data.quotes]
        all_insights = [insight.content for insight in journey_data.insights]
        all_pain_points = [pp.content for pp in journey_data.pain_points]
        all_recommendations = [rec.content for rec in journey_data.recommendations]
        
        # Extract thinking insights safely
        def safe_extract_multiple(items, count=3):
            if not items:
                return []
            result = []
            for item in items[:count]:
                if isinstance(item, dict):
                    content = item.get('insight', item.get('story', item.get('content', str(item))))
                    result.append(content)
                else:
                    result.append(str(item))
            return result
        
        extended_insights = safe_extract_multiple(thinking_result.insights, 3)
        human_stories = safe_extract_multiple(thinking_result.human_stories, 2)
        strategic_implications = safe_extract_multiple(thinking_result.professional_implications, 3)
        
        prompt = f"""
        Write an authoritative LinkedIn article that delivers strategic intelligence executives can't afford to ignore.

        Context:
        Subject: {journey_data.title}
        Background: {journey_data.summary}

        Intelligence Foundation:
        - Customer reality: {'; '.join(all_quotes[:3]) if all_quotes else 'Direct customer perspectives'}
        - Strategic patterns: {'; '.join(all_insights[:3]) if all_insights else 'Business intelligence findings'}
        - Operational barriers: {'; '.join(all_pain_points[:3]) if all_pain_points else 'Critical business challenges'}
        - Strategic opportunities: {'; '.join(all_recommendations[:3]) if all_recommendations else 'Implementation strategies'}

        Article Standards:
        1. Open with a business insight that fundamentally changes how executives think about this topic
        2. NO consultancy jargon - avoid "best practices," "learnings," "ideation," "optimization," "transformation journey"
        3. NO cliche openings - never use "In today's competitive marketplace" or similar overused phrases
        4. Write with the authority of someone who has personally navigated these challenges at scale
        5. Be brutally honest about what doesn't work and why most companies fail
        6. NO academic distance - present intelligence as hard-won business experience
        7. Provide specific, actionable strategies that executives can implement immediately
        8. End with strategic implications that reshape industry thinking

        Voice: Write as a battle-tested executive sharing breakthrough insights with fellow leaders. Be authoritative, contrarian when necessary, and immediately valuable.

        Include a compelling title and strategic hashtags.
        """
        
        response = await self._call_anthropic(prompt)
        
        # Clean up any JSON or markdown formatting that might appear
        clean_content = self._clean_content_formatting(response)
        
        # Add simple text formatting header
        text_header = self._create_simple_text_header(ContentType.LONG_FORM, journey_data)
        final_content = f"{text_header}\n\n{clean_content}"
        
        # Extract title from first line or create one
        lines = clean_content.split('\n')
        title = lines[0].strip('#*').strip() if lines and len(lines[0]) < 100 else "Strategic Business Analysis"
        
        return ContentPiece(
            content_type=ContentType.LONG_FORM,
            title=title,
            content=final_content,
            hook=lines[1] if len(lines) > 1 else "Strategic business intelligence ahead",
            call_to_action=lines[-3] if len(lines) > 3 else "What strategic opportunities does this create for your organization?",
            hashtags=self._extract_hashtags(clean_content),
            engagement_triggers=["strategic insights", "executive-level discussion"],
            thought_leadership_score=9.8,
            professional_authority_score=9.5,
            human_authenticity_score=8.8,
            estimated_reach="Medium-High (attracts senior executive audience)",
            target_audience="C-suite executives and senior business leaders",
            posting_time_recommendation="Thursday 2PM (optimal for long-form executive consumption)",
            follow_up_suggestions=["Implementation framework", "Executive briefing", "Strategic assessment tool"]
        )

    async def _generate_engagement_tactics(self, journey_data: ParsedJourneyData,
                                         thinking_result: AnalysisResult,
                                         optimization: LinkedInOptimization) -> ContentPiece:
        """
        Generate sophisticated engagement strategies that foster meaningful professional dialogue.
        """
        # Extract insights for engagement development
        key_insights = [insight.content for insight in journey_data.insights[:3]]
        
        # Extract thinking insights safely
        def safe_extract_multiple(items, count=3):
            if not items:
                return []
            result = []
            for item in items[:count]:
                if isinstance(item, dict):
                    content = item.get('insight', item.get('story', item.get('content', str(item))))
                    result.append(content)
                else:
                    result.append(str(item))
            return result
        
        strategic_insights = safe_extract_multiple(thinking_result.insights, 3)
        professional_implications = safe_extract_multiple(thinking_result.professional_implications, 3)
        
        prompt = f"""
        Create an executive engagement playbook that transforms how senior leaders build strategic relationships on LinkedIn.

        Strategic Context:
        Subject: {journey_data.title}
        
        Intelligence Foundation:
        • Business patterns: {'; '.join(key_insights) if key_insights else 'Strategic business intelligence'}
        • Strategic insights: {'; '.join(strategic_insights) if strategic_insights else 'Competitive intelligence patterns'}
        • Leadership implications: {'; '.join(professional_implications) if professional_implications else 'Executive strategy implications'}

        Engagement Framework Requirements:

        **Strategic Contribution Methods**
        Sophisticated approaches for adding strategic value to executive conversations without appearing self-promotional.

        **Executive Dialogue Techniques**
        Questions and conversation starters that demonstrate deep business acumen and invite meaningful strategic exchange.

        **Authority Building Strategies**
        Natural methods for sharing cross-industry insights and parallel experiences that position expertise authentically.

        **Relationship Acceleration Tactics**
        Proven approaches for deepening professional connections and creating strategic business relationships.

        Writing Standards:
        - Write for Fortune 500 executives who value substance over style
        - NO networking cliches - avoid "reaching out," "connecting," "thought leadership," "adding value"
        - Be specific and actionable - provide exact phrases and strategic approaches
        - NO academic tone - write as peer-to-peer executive guidance
        - Focus on building genuine relationships, not generating leads
        - Emphasize strategic thinking over tactical networking

        Voice: Write as a seasoned CEO coaching other executives on how to build strategic relationships that matter. Be direct, sophisticated, and immediately implementable.

        Include 4-5 strategic hashtags.
        """
        
        response = await self._call_anthropic(prompt)
        
        # Clean up any JSON or markdown formatting that might appear
        clean_content = self._clean_content_formatting(response)
        
        # Add simple text formatting header
        text_header = self._create_simple_text_header(ContentType.ENGAGEMENT_TACTICS, journey_data)
        final_content = f"{text_header}\n\n{clean_content}"
        
        return ContentPiece(
            content_type=ContentType.ENGAGEMENT_TACTICS,
            title="Strategic Professional Engagement Guide",
            content=final_content,
            hook="Strategic engagement approaches for meaningful professional dialogue",
            call_to_action="Which engagement approach would best advance your strategic professional relationships?",
            hashtags=self._extract_hashtags(clean_content),
            engagement_triggers=["strategic dialogue", "executive networking", "professional development"],
            thought_leadership_score=9.0,
            professional_authority_score=9.3,
            human_authenticity_score=8.2,
            estimated_reach="High (sophisticated engagement drives quality connections)",
            target_audience="C-suite executives and senior business leaders",
            posting_time_recommendation="Wednesday 10AM (optimal for executive engagement)",
            follow_up_suggestions=["Advanced networking strategies", "Executive communication frameworks", "Relationship building tactics"]
        )

    # Helper methods for content cleaning and extraction
    
    def _clean_content_formatting(self, content: str) -> str:
        """
        Clean and enhance content formatting - remove HTML/markdown while creating elegant text structure.
        """
        import re
        
        # Remove JSON wrapper if present
        if content.strip().startswith('{') and content.strip().endswith('}'):
            try:
                import json
                data = json.loads(content)
                if 'content' in data:
                    content = data['content']
                elif 'article' in data:
                    content = data['article']
                elif 'post' in data:
                    content = data['post']
                elif 'carousel' in data:
                    content = data['carousel']
            except:
                pass  # If JSON parsing fails, continue with raw content
        
        # Remove markdown code blocks
        content = re.sub(r'```[\s\S]*?```', '', content)
        content = re.sub(r'`([^`]+)`', r'\1', content)
        
        # Remove HTML tags completely
        content = re.sub(r'<[^>]+>', '', content)
        
        # Remove HTML entities
        content = re.sub(r'&[a-zA-Z]+;', '', content)
        content = re.sub(r'&#\d+;', '', content)
        
        # Convert markdown formatting to elegant text structure
        content = re.sub(r'\*\*\*([^*]+)\*\*\*', r'\1', content)  # Bold+italic to plain
        content = re.sub(r'\*\*([^*]+)\*\*', r'\1', content)      # Bold to plain
        content = re.sub(r'\*([^*]+)\*', r'\1', content)          # Italic to plain
        content = re.sub(r'#{1,6}\s*([^\n]+)', r'\1', content)    # Headers to plain text
        
        # Remove formatting instructions
        content = re.sub(r'Format\s*as:?.*?\n', '', content, flags=re.IGNORECASE)
        content = re.sub(r'Structure:?.*?\n', '', content, flags=re.IGNORECASE)
        content = re.sub(r'Write as:?.*?\n', '', content, flags=re.IGNORECASE)
        content = re.sub(r'Include:?.*hashtags.*?\n', '', content, flags=re.IGNORECASE)
        
        # Remove cliche openings and self-referential language
        content = re.sub(r'\b[Ii]n\s+(the\s+)?rapidly\s+changing\s+landscape.*?[,.!]?', '', content)
        content = re.sub(r'\b[Ii]n\s+(the\s+)?ever[-\s]evolving\s+world.*?[,.!]?', '', content, flags=re.IGNORECASE)
        content = re.sub(r'\b[Ii]n\s+today\'s\s+competitive\s+marketplace.*?[,.!]?', '', content)
        content = re.sub(r'\b[Ii]n\s+an\s+era\s+of.*?[,.!]?', '', content)
        content = re.sub(r'\bAs\s+we\s+navigate.*?[,.!]?', '', content)
        content = re.sub(r'\bIn\s+this\s+digital\s+age.*?[,.!]?', '', content)
        
        # Remove self-referential patterns
        content = re.sub(r'\b(this|our|the)\s+(analysis|research|study|report|data|findings?)\s+(shows?|reveals?|indicates?|suggests?|demonstrates?)', '', content, flags=re.IGNORECASE)
        content = re.sub(r'\b(according to|based on)\s+(this|our|the)\s+(analysis|research|study)', '', content, flags=re.IGNORECASE)
        content = re.sub(r'\b(this|our)\s+(comprehensive|extensive|detailed)\s+(analysis|research|study)', '', content, flags=re.IGNORECASE)
        content = re.sub(r'\bthis journey\s?map\s+(shows?|reveals?|indicates?)', '', content, flags=re.IGNORECASE)
        
        # Remove JSON artifacts
        content = re.sub(r'"([^"]*)":', r'\1:', content)
        content = re.sub(r'[\{\}]', '', content)
        content = re.sub(r'(?<![\│║└┘┌┐╚╝╔╗╦╩╠╣╬])"', '', content)
        
        # Create elegant paragraph structure
        lines = content.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#') and len(line) > 10:
                # Ensure proper sentence structure
                if not line.endswith('.') and not line.endswith('?') and not line.endswith('!'):
                    if len(line) > 50:  # Only add period to substantial lines
                        line += '.'
                cleaned_lines.append(line)
        
        # Rejoin with proper spacing
        content = '\n\n'.join(cleaned_lines)
        
        # Final cleanup
        content = re.sub(r'\s+', ' ', content)  # Multiple spaces to single
        content = re.sub(r'^\s*,?\s*', '', content, flags=re.MULTILINE)  # Remove leading commas
        content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)  # Max 2 consecutive newlines
        
        return content.strip()

    def _create_simple_text_header(self, content_type: ContentType, journey_data: ParsedJourneyData) -> str:
        """
        Create elegant text headers with sophisticated formatting using only text structure.
        No HTML, no markdown - just beautiful typography through spacing and character choice.
        """
        title_lower = journey_data.title.lower()
        summary_lower = journey_data.summary.lower()
        
        # Determine sophisticated theme based on content analysis
        if any(word in title_lower + summary_lower for word in ['journey', 'experience', 'customer', 'path']):
            theme = "CUSTOMER EXPERIENCE INTELLIGENCE"
            subtitle = "Systematic analysis of customer behavior patterns and strategic opportunities"
        elif any(word in title_lower + summary_lower for word in ['strategy', 'business', 'growth', 'competitive']):
            theme = "STRATEGIC BUSINESS INTELLIGENCE"
            subtitle = "Competitive advantage through data-driven strategic thinking"
        elif any(word in title_lower + summary_lower for word in ['data', 'analytics', 'insights', 'research']):
            theme = "BUSINESS INTELLIGENCE BRIEFING"
            subtitle = "Evidence-based insights for executive decision-making"
        elif any(word in title_lower + summary_lower for word in ['performance', 'optimization', 'efficiency', 'improvement']):
            theme = "OPERATIONAL EXCELLENCE ANALYSIS"
            subtitle = "Performance optimization strategies for sustainable competitive advantage"
        elif any(word in title_lower + summary_lower for word in ['innovation', 'transformation', 'digital', 'future']):
            theme = "TRANSFORMATION STRATEGY INSIGHTS"
            subtitle = "Innovation frameworks for next-generation business evolution"
        elif any(word in title_lower + summary_lower for word in ['roi', 'revenue', 'profit', 'cost', 'financial', 'budget']):
            theme = "FINANCIAL STRATEGY ANALYSIS"
            subtitle = "ROI optimization and revenue growth strategic framework"
        elif any(word in title_lower + summary_lower for word in ['team', 'organization', 'leadership', 'culture', 'employee']):
            theme = "ORGANIZATIONAL STRATEGY INSIGHTS"
            subtitle = "Leadership excellence and high-performance culture development"
        else:
            theme = "EXECUTIVE BUSINESS INTELLIGENCE"
            subtitle = "Strategic insights and competitive intelligence for business leaders"
        
        # Create elegant headers with sophisticated typography
        separator = "═" * 60
        
        if content_type == ContentType.SHORT_FORM:
            return f"{separator}\n\n{theme}\n{subtitle}\n\n{separator}\n\nEXECUTIVE BRIEF:\n"
        elif content_type == ContentType.CAROUSEL:
            return f"{separator}\n\n{theme}\n{subtitle}\n\n{separator}\n\nSTRATEGIC NARRATIVE - FIVE KEY INSIGHTS:\n"
        elif content_type == ContentType.LONG_FORM:
            return f"{separator}\n\n{theme}\n{subtitle}\n\n{separator}\n\nCOMPREHENSIVE ANALYSIS:\n"
        elif content_type == ContentType.ENGAGEMENT_TACTICS:
            return f"{separator}\n\n{theme}\n{subtitle}\n\n{separator}\n\nSTRATEGIC ENGAGEMENT FRAMEWORK:\n"
        else:
            return f"{separator}\n\n{theme}\n{subtitle}\n\n{separator}\n"

    async def _generate_podcast_script(self, journey_data: ParsedJourneyData, 
                                     thinking_result: AnalysisResult,
                                     optimization: LinkedInOptimization) -> ContentPiece:
        """
        Generate podcast script content that can be converted to audio using Mulmocast.
        Creates a conversational, engaging script suitable for business professionals.
        """
        # Extract key insights from the journey data
        key_quotes = [quote.content for quote in journey_data.quotes[:3]]
        key_insights = [insight.content for insight in journey_data.insights[:3]]
        pain_points = [pp.content for pp in journey_data.pain_points[:2]]
        
        # Extract thinking insights safely
        def safe_extract(items, default=""):
            if not items:
                return default
            item = items[0]
            if isinstance(item, dict):
                return item.get('insight', item.get('story', item.get('content', str(item))))
            return str(item)
        
        thinking_insight = safe_extract(thinking_result.insights, "Strategic insights emerging")
        
        prompt = f"""
        Create an engaging podcast script about business insights that sounds natural when spoken aloud.
        
        Context:
        Topic: {journey_data.title}
        Background: {journey_data.summary[:400]}
        
        Key Information to Cover:
        • Customer perspectives: {'; '.join(key_quotes) if key_quotes else 'Direct customer feedback'}
        • Business intelligence: {'; '.join(key_insights) if key_insights else 'Strategic patterns'}
        • Critical challenges: {'; '.join(pain_points) if pain_points else 'Operational barriers'}
        • Strategic insight: {thinking_insight}
        
        Podcast Script Guidelines:
        1. Start with a compelling hook that grabs attention in the first 10 seconds
        2. Write in a conversational tone as if speaking to a business colleague over coffee
        3. Include natural transitions between topics: "Here's what's interesting...", "But here's the real challenge...", "What I found surprising was..."
        4. Break down complex ideas into digestible segments
        5. Use concrete examples and scenarios that listeners can visualize
        6. Include strategic questions that make listeners think: "Ask yourself this...", "Consider this scenario..."
        7. End with a clear, actionable takeaway that listeners can implement
        8. Aim for 3-5 minutes of speaking content (approximately 450-750 words)
        9. Write in first person as an expert sharing insights
        10. Include natural pauses and emphasis points marked with [PAUSE] and [EMPHASIS]
        
        Format as a complete script ready for audio production. No need for multiple speakers or complex dialogue - this should be a single expert sharing insights.
        
        Create the script now:
        """
        
        try:
            response = await self._call_anthropic(prompt)
            clean_content = self._clean_content_formatting(response)
            
            # Calculate scores specific to podcast content
            thought_leadership_score = 8.5  # Podcasts have high thought leadership potential
            professional_authority_score = 9.0  # Audio format builds authority
            human_authenticity_score = 9.2  # Conversational tone increases authenticity
            
            return ContentPiece(
                content_type=ContentType.PODCAST,
                title=f"Business Insights Podcast: {journey_data.title[:50]}...",
                content=clean_content,
                hook="Transform your business strategy with insights from real customer experiences",
                call_to_action="What's one insight from this episode you'll implement this week?",
                hashtags=self._extract_hashtags(clean_content),
                engagement_triggers=["business insights", "strategic thinking", "customer experience"],
                thought_leadership_score=thought_leadership_score,
                professional_authority_score=professional_authority_score,
                human_authenticity_score=human_authenticity_score,
                estimated_reach="High (podcast format drives deep engagement)",
                target_audience="Business executives and strategic decision makers",
                posting_time_recommendation="Share during commute hours (7-9AM, 5-7PM)",
                follow_up_suggestions=["Create podcast series", "LinkedIn Live discussion", "Written summary post"]
            )
            
        except Exception as e:
            logger.error(f"Podcast script generation failed: {str(e)}")
            return self._create_fallback_podcast(journey_data, thinking_result)

    def _create_fallback_podcast(self, journey_data: ParsedJourneyData, thinking_result: AnalysisResult) -> ContentPiece:
        """Create fallback podcast content when generation fails."""
        fallback_content = f"""
        Welcome to our business insights podcast. Today we're exploring {journey_data.title}.

        [PAUSE]

        Here's what's fascinating about this topic: {journey_data.summary[:200] if journey_data.summary else 'Customer experiences reveal critical business patterns'}.

        [EMPHASIS] The key insight here is that successful businesses listen deeply to their customers. [PAUSE]

        What I find most compelling is how these insights connect to broader strategic decisions. When we really understand our customers' journeys, we can anticipate their needs and create better experiences.

        [PAUSE]

        So here's my challenge to you: Take one insight from today's discussion and ask yourself - how can this change the way we approach our customer relationships?

        That's your takeaway for this episode. Thanks for listening, and remember - every customer interaction is a chance to learn something valuable.
        """
        
        return ContentPiece(
            content_type=ContentType.PODCAST,
            title=f"Business Insights: {journey_data.title}",
            content=fallback_content.strip(),
            hook="Discover the strategic insights hiding in your customer data",
            call_to_action="What customer insight will drive your next strategic decision?",
            hashtags=["#BusinessInsights", "#CustomerExperience", "#Strategy", "#Leadership"],
            engagement_triggers=["strategic insights", "customer intelligence", "business strategy"],
            thought_leadership_score=7.5,
            professional_authority_score=8.0,
            human_authenticity_score=8.5,
            estimated_reach="Medium-High (podcast format encourages deeper engagement)",
            target_audience="Business professionals and strategic thinkers",
            posting_time_recommendation="Mornings (8-10AM) or evening commute (5-7PM)",
            follow_up_suggestions=["Podcast series expansion", "Interactive Q&A session", "Written insight summary"]
        )

    def _extract_hashtags(self, content: str) -> List[str]:
        """
        Extract hashtags from content, returning clean hashtag names without the # symbol.
        """
        import re
        
        # Find all hashtags in the content
        hashtags = re.findall(r'#(\w+)', content)
        
        # If no hashtags found, provide defaults based on content
        if not hashtags:
            if 'strategy' in content.lower() or 'strategic' in content.lower():
                hashtags = ['Strategy', 'Leadership', 'Business']
            elif 'customer' in content.lower():
                hashtags = ['CustomerExperience', 'Business', 'Strategy']
            elif 'engagement' in content.lower():
                hashtags = ['Engagement', 'Leadership', 'Professional']
            else:
                hashtags = ['Business', 'Leadership', 'Strategy']
        
        # Clean and format hashtags
        clean_hashtags = []
        for tag in hashtags[:5]:  # Max 5 hashtags
            # Remove any non-alphanumeric characters and capitalize properly
            clean_tag = ''.join(c for c in tag if c.isalnum())
            if clean_tag:
                clean_hashtags.append(clean_tag)
        
        return clean_hashtags or ['Business', 'Leadership']
    
    # Helper methods for content analysis and optimization
    
    def _calculate_thought_leadership_score(self, content_data: Dict) -> float:
        """Calculate thought leadership score based on content elements."""
        score = 5.0  # Base score
        
        # Check for thought leadership indicators
        if 'thought_leadership_angle' in content_data:
            score += 2.0
        if 'insight_revelation' in content_data:
            score += 1.5
        if 'professional_implication' in content_data:
            score += 1.0
        if len(content_data.get('engagement_triggers', [])) > 3:
            score += 0.5
        
        return min(score, 10.0)

    def _calculate_authority_score(self, content_data: Dict) -> float:
        """Calculate professional authority score."""
        score = 6.0  # Base score
        
        if 'professional_implication' in content_data:
            score += 1.5
        if 'target_audience' in content_data and 'executive' in content_data['target_audience'].lower():
            score += 1.0
        if 'industry' in ' '.join(content_data.get('hashtags', [])).lower():
            score += 0.5
        
        return min(score, 10.0)

    def _calculate_authenticity_score(self, content_data: Dict) -> float:
        """Calculate human authenticity score."""
        score = 5.0  # Base score
        
        if 'human_authenticity_elements' in content_data:
            score += len(content_data['human_authenticity_elements']) * 0.5
        if 'hook' in content_data and any(word in content_data['hook'].lower() for word in ['story', 'experience', 'learned']):
            score += 1.0
        
        return min(score, 10.0)

    def _calculate_carousel_thought_leadership(self, carousel_data: Dict) -> float:
        """Calculate thought leadership score for carousel content."""
        score = 7.0  # Carousels start higher
        
        if 'thought_leadership_positioning' in carousel_data:
            score += 1.5
        if len(carousel_data.get('slides', [])) >= 5:
            score += 1.0
        
        return min(score, 10.0)

    def _calculate_carousel_authenticity(self, carousel_data: Dict) -> float:
        """Calculate authenticity score for carousel content."""
        score = 6.0
        
        # Check for human elements in slides
        human_indicators = ['story', 'experience', 'customer', 'people', 'human']
        for slide in carousel_data.get('slides', []):
            if any(indicator in slide.get('content', '').lower() for indicator in human_indicators):
                score += 0.5
        
        return min(score, 10.0)

    def _calculate_article_authenticity(self, article_data: Dict) -> float:
        """Calculate authenticity score for long-form articles."""
        score = 7.0  # Articles typically higher authenticity
        
        # Check sections for human elements
        for section in article_data.get('sections', []):
            if 'human' in section.get('title', '').lower() or 'story' in section.get('content', '').lower():
                score += 0.5
        
        return min(score, 10.0)

    def _calculate_overall_quality(self, content_pieces: List[ContentPiece], thinking_result: AnalysisResult) -> float:
        """Calculate overall quality score across all content."""
        if not content_pieces:
            return 0.0
        
        total_score = 0.0
        for piece in content_pieces:
            piece_score = (piece.thought_leadership_score + 
                          piece.professional_authority_score + 
                          piece.human_authenticity_score) / 3
            total_score += piece_score
        
        # Bonus for extended thinking depth
        thinking_bonus = thinking_result.metrics.overall_score / 10  # Convert to 1-10 scale
        
        average_score = total_score / len(content_pieces)
        final_score = (average_score + thinking_bonus) / 2
        
        return min(final_score, 10.0)

    def _assess_thought_leadership_positioning(self, content_pieces: List[ContentPiece], 
                                             thinking_result: AnalysisResult) -> str:
        """Assess thought leadership positioning across content."""
        avg_tl_score = sum(piece.thought_leadership_score for piece in content_pieces) / len(content_pieces)
        
        if avg_tl_score >= 9.0:
            return "Visionary Industry Voice - Setting strategic agenda with transformative insights"
        elif avg_tl_score >= 8.0:
            return "Strategic Authority - Recognized expert driving meaningful business dialogue"
        elif avg_tl_score >= 7.0:
            return "Influential Professional - Building reputation with valuable strategic perspectives"
        else:
            return "Emerging Thought Leader - Developing authoritative voice and business insights"

    def _assess_brand_voice_consistency(self, content_pieces: List[ContentPiece]) -> float:
        """Assess consistency of brand voice across content pieces."""
        # Simplified consistency check based on tone and authority levels
        authority_scores = [piece.professional_authority_score for piece in content_pieces]
        authenticity_scores = [piece.human_authenticity_score for piece in content_pieces]
        
        authority_variance = max(authority_scores) - min(authority_scores)
        authenticity_variance = max(authenticity_scores) - min(authenticity_scores)
        
        # Lower variance = higher consistency
        consistency_score = 10.0 - (authority_variance + authenticity_variance) / 2
        return max(consistency_score, 0.0)

    def _predict_engagement_performance(self, content_pieces: List[ContentPiece]) -> str:
        """Predict engagement performance based on content analysis."""
        engagement_factors = []
        
        for piece in content_pieces:
            factor_score = len(piece.engagement_triggers) * 2 + piece.human_authenticity_score
            engagement_factors.append(factor_score)
        
        avg_engagement = sum(engagement_factors) / len(engagement_factors)
        
        if avg_engagement >= 15:
            return "Exceptional Engagement Expected - Premium content driving strategic conversations"
        elif avg_engagement >= 12:
            return "Strong Engagement Expected - Quality dialogue with industry leaders"
        elif avg_engagement >= 8:
            return "Good Engagement Expected - Solid professional interaction and strategic shares"
        else:
            return "Moderate Engagement Expected - Building audience with consistent quality content"

    def _generate_strategic_recommendations(self, content_pieces: List[ContentPiece], 
                                          thinking_result: AnalysisResult) -> List[str]:
        """Generate strategic recommendations for content optimization."""
        recommendations = []
        
        # Analyze content strengths and gaps
        avg_tl_score = sum(piece.thought_leadership_score for piece in content_pieces) / len(content_pieces)
        avg_auth_score = sum(piece.human_authenticity_score for piece in content_pieces) / len(content_pieces)
        
        if avg_tl_score < 8.0:
            recommendations.append("Elevate thought leadership by incorporating more counterintuitive insights and industry predictions that challenge conventional business thinking")
        
        if avg_auth_score < 8.0:
            recommendations.append("Enhance human connection by weaving in more specific customer stories and personal strategic reflections that demonstrate real-world application")
        
        # Content mix recommendations
        content_types = [piece.content_type for piece in content_pieces]
        if ContentType.CAROUSEL not in content_types:
            recommendations.append("Develop carousel content to maximize reach and create shareable strategic frameworks")
        
        if ContentType.LONG_FORM not in content_types:
            recommendations.append("Create authoritative long-form pieces to establish deeper thought leadership and attract C-suite attention")
        
        # Advanced strategy recommendations
        recommendations.append("Focus on publishing during peak executive hours: Tuesday 9AM, Wednesday 10AM, Thursday 2PM for maximum senior leader visibility")
        recommendations.append("Actively engage in high-quality comments within the first 90 minutes to signal algorithmic relevance and drive strategic discussions")
        recommendations.append("Cross-reference insights with current business trends and economic indicators to maximize strategic relevance and shareability")
        recommendations.append("Build content series that establish expertise in specific business domains rather than one-off posts")
        
        return recommendations

    def _summarize_thinking_insights(self, thinking_result: AnalysisResult) -> str:
        """Summarize key insights from extended thinking analysis."""
        
        # Helper function to extract string content safely
        def safe_extract_string(item):
            if isinstance(item, dict):
                return item.get('insight', item.get('story', item.get('recommendation', item.get('content', str(item)))))
            return str(item)
        
        # Extract first items safely
        top_insight = safe_extract_string(thinking_result.insights[0]) if thinking_result.insights else 'Strategic patterns identified in customer behavior and business dynamics'
        primary_story = safe_extract_string(thinking_result.human_stories[0]) if thinking_result.human_stories else 'Compelling human narratives that illustrate broader business trends'
        key_recommendation = safe_extract_string(thinking_result.strategic_recommendations[0]) if thinking_result.strategic_recommendations else 'Strategic recommendations for competitive advantage and market positioning'
        
        summary = f"""STRATEGIC ANALYSIS SUMMARY

Content Quality Score: {thinking_result.metrics.overall_score:.1f}/10
Strategic Insights Generated: {len(thinking_result.insights)}
Human Stories Identified: {len(thinking_result.human_stories)}
Business Implications: {len(thinking_result.professional_implications)}
Strategic Recommendations: {len(thinking_result.strategic_recommendations)}

Key Strategic Findings:
- Primary Business Insight: {top_insight}
- Human Element: {primary_story}
- Strategic Opportunity: {key_recommendation}

Thought Leadership Potential: {thinking_result.metrics.thought_leadership_potential:.1f}/10

Strategic intelligence provides the foundation for content that positions you as an authoritative voice in business leadership, combining data-driven insights with human understanding to create compelling professional narratives."""
        
        return summary

    def _generate_follow_up_suggestions(self, content_data: Dict) -> List[str]:
        """Generate follow-up content suggestions."""
        suggestions = [
            "Develop a comprehensive strategic framework that expands on the core insights",
            "Create an executive briefing that translates insights into actionable business strategies",
            "Design a thought leadership series that explores different facets of the main theme",
            "Build an industry benchmark analysis that contextualizes findings within competitive landscape"
        ]
        
        return suggestions[:3]  # Return top 3 suggestions

    # Enhanced fallback content creators for error handling
    
    def _create_fallback_short_form(self, journey_data: ParsedJourneyData, thinking_result: AnalysisResult) -> ContentPiece:
        """Create compelling fallback content if JSON parsing fails."""
        text_header = self._create_simple_text_header(ContentType.SHORT_FORM, journey_data)
        content = f"""{text_header}

The most successful business leaders share one counterintuitive trait: they obsess over customer friction points that others ignore.

{journey_data.summary[:200]}...

The strategic implication? {journey_data.insights[0].content if journey_data.insights else 'Organizations that systematically address hidden customer pain points create sustainable competitive advantages.'}

Customer satisfaction metrics don't tell the whole story—market positioning and long-term strategic value emerge from understanding hidden friction patterns.

What hidden friction points might be shaping your competitive landscape?

#StrategicLeadership #CustomerStrategy #BusinessInsights #CompetitiveAdvantage"""
        
        return ContentPiece(
            content_type=ContentType.SHORT_FORM,
            title="Strategic Business Insight",
            content=content,
            hook="The most successful business leaders share one counterintuitive trait:",
            call_to_action="What hidden friction points might be shaping your competitive landscape?",
            hashtags=["StrategicLeadership", "CustomerStrategy", "BusinessInsights", "CompetitiveAdvantage"],
            engagement_triggers=["Strategic business discussion"],
            thought_leadership_score=8.0,
            professional_authority_score=8.5,
            human_authenticity_score=7.8,
            estimated_reach="High",
            target_audience="Senior business leaders",
            posting_time_recommendation="Tuesday 9AM",
            follow_up_suggestions=["Strategic framework", "Implementation guide"]
        )

    def _create_fallback_carousel(self, journey_data: ParsedJourneyData, thinking_result: AnalysisResult) -> ContentPiece:
        """Create compelling fallback carousel if JSON parsing fails."""
        text_header = self._create_simple_text_header(ContentType.CAROUSEL, journey_data)
        content = f"""{text_header}

The Strategic Customer Experience Advantage

Leading companies systematically design experiences for competitive advantage:

1/5: The Hidden Reality
Most organizations measure satisfaction, but leaders track friction and emotional impact

2/5: Customer Truth
{f'"{journey_data.quotes[0].content}"' if journey_data.quotes else '"Customers judge companies by their worst experience, not their best."'}

3/5: Strategic Insight
{journey_data.insights[0].content if journey_data.insights else 'Experience design is becoming the primary differentiator in competitive markets'}

4/5: Competitive Advantage
{journey_data.recommendations[0].content if journey_data.recommendations else 'Organizations that systematically improve customer experience see 25% higher revenue growth'}

5/5: Strategic Question
How might your organization's current experience gaps be creating competitive vulnerabilities?

#CustomerExperience #StrategicAdvantage #BusinessStrategy #Leadership"""
        
        return ContentPiece(
            content_type=ContentType.CAROUSEL,
            title="The Strategic Customer Experience Advantage",
            content=content,
            hook="Why leading companies are winning through systematic experience design",
            call_to_action="How might your organization's current experience gaps be creating competitive vulnerabilities?",
            hashtags=["CustomerExperience", "StrategicAdvantage", "BusinessStrategy", "Leadership"],
            engagement_triggers=["Strategic dialogue", "Executive insights"],
            thought_leadership_score=8.5,
            professional_authority_score=8.8,
            human_authenticity_score=8.0,
            estimated_reach="High",
            target_audience="C-suite executives",
            posting_time_recommendation="Wednesday 10AM",
            follow_up_suggestions=["Implementation framework", "Strategic assessment"]
        )

    def _create_fallback_long_form(self, journey_data: ParsedJourneyData, thinking_result: AnalysisResult) -> ContentPiece:
        """Create compelling fallback article if JSON parsing fails."""
        content = f"""The Customer Experience Competitive Advantage: Strategic Insights for Business Leaders

The Business Case for Experience Excellence

In today's hyper-competitive marketplace, companies that understand customer experience as a strategic weapon systematically outperform their peers. Critical insights challenge conventional approaches to customer strategy.

The Strategic Reality

{journey_data.summary}

What distinguishes market leaders isn't just superior products or services—it's their systematic approach to understanding and eliminating customer friction points that competitors ignore.

Evidence from the Front Lines

{journey_data.insights[0].content if journey_data.insights else 'Organizations that invest in comprehensive customer experience mapping see measurable improvements in both customer retention and revenue growth.'}

The strategic implications extend far beyond customer satisfaction scores. Companies that treat experience design as a core business capability create sustainable competitive moats that are difficult for competitors to replicate.

Strategic Recommendations for Leaders

Based on business intelligence findings:
- {journey_data.recommendations[0].content if journey_data.recommendations else 'Develop systematic approaches to identifying and addressing customer friction points'}
- Invest in cross-functional experience design capabilities that span the entire organization
- Create measurement systems that track experience quality as rigorously as financial performance
- Build organizational cultures that prioritize customer perspective in strategic decision-making

The Competitive Imperative

Organizations that fail to recognize customer experience as a strategic imperative risk systematic competitive disadvantage. The question isn't whether to invest in experience excellence—it's how quickly you can build these capabilities before competitors do.

How is your organization positioning customer experience as a strategic advantage rather than a tactical initiative?

#CustomerExperience #StrategicLeadership #CompetitiveAdvantage #BusinessStrategy"""
        
        return ContentPiece(
            content_type=ContentType.LONG_FORM,
            title="The Customer Experience Competitive Advantage: Strategic Insights for Business Leaders",
            content=content,
            hook="In today's hyper-competitive marketplace, the companies that understand customer experience as a strategic weapon...",
            call_to_action="How is your organization positioning customer experience as a strategic advantage rather than a tactical initiative?",
            hashtags=["CustomerExperience", "StrategicLeadership", "CompetitiveAdvantage", "BusinessStrategy"],
            engagement_triggers=["Strategic insights", "Executive discussion"],
            thought_leadership_score=9.0,
            professional_authority_score=9.2,
            human_authenticity_score=8.5,
            estimated_reach="Medium-High",
            target_audience="Senior executives",
            posting_time_recommendation="Thursday 2PM",
            follow_up_suggestions=["Strategic framework", "Executive briefing"]
        )

    def _create_fallback_engagement_tactics(self, journey_data: ParsedJourneyData, thinking_result: AnalysisResult) -> ContentPiece:
        """Create sophisticated fallback engagement strategies if JSON parsing fails."""
        content = """Strategic Engagement Framework for Executive Leaders

Sophisticated approaches for meaningful business dialogue:

Executive-Level Comment Strategies:
1. "This aligns with what we're seeing across industry verticals—particularly the strategic shift toward..."
2. "The competitive implications extend beyond customer satisfaction to fundamental market positioning..."
3. "Our experience suggests that organizations succeeding in this area share three common strategic characteristics..."
4. "The ROI case becomes compelling when you consider the cumulative effect on customer lifetime value and competitive differentiation..."

Strategic Discussion Catalysts:
• "How are leading organizations in your industry approaching the strategic integration of customer experience with business strategy?"
• "What metrics have proven most valuable for connecting experience investments to financial performance?"
• "Which organizational capabilities distinguish companies that excel at experience-driven competitive advantage?"

Thought Leadership Contribution Methods:
• Share cross-industry perspectives that illuminate strategic patterns
• Offer framework thinking that helps organize complex business challenges
• Contribute historical context that informs current strategic decisions
• Provide competitive intelligence that advances strategic thinking

Relationship Building Through Strategic Value:
• Demonstrate genuine appreciation for well-articulated strategic insights
• Ask follow-up questions that show active engagement with others' perspectives
• Invite private strategic discussions that build professional relationships
• Collaborate on strategic problem-solving that benefits all participants

#StrategicEngagement #ExecutiveNetworking #ThoughtLeadership #BusinessStrategy"""
        
        return ContentPiece(
            content_type=ContentType.ENGAGEMENT_TACTICS,
            title="Strategic Engagement Framework for Executive Leaders",
            content=content,
            hook="Strategic Engagement Framework for Executive Leaders",
            call_to_action="Which engagement approach would best advance your strategic professional relationships?",
            hashtags=["StrategicEngagement", "ExecutiveNetworking", "ThoughtLeadership", "BusinessStrategy"],
            engagement_triggers=["Strategic dialogue", "Executive networking", "Professional development"],
            thought_leadership_score=8.8,
            professional_authority_score=9.0,
            human_authenticity_score=8.0,
            estimated_reach="High",
            target_audience="C-suite and senior executives",
            posting_time_recommendation="Wednesday 10AM",
            follow_up_suggestions=["Advanced networking strategies", "Executive communication frameworks"]
        )

    async def _call_anthropic(self, prompt: str) -> str:
        """Make an API call to Anthropic with enhanced content generation configuration."""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=8000,  # Reasonable limit for sophisticated content generation
                temperature=0.4,  # Slightly higher for more creative, engaging content
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


# Factory function for creating content generator
def create_content_generator(extended_thinking_engine: ExtendedThinkingEngine) -> LinkedInContentGenerator:
    """Factory function to create a LinkedIn content generator."""
    return LinkedInContentGenerator(extended_thinking_engine)