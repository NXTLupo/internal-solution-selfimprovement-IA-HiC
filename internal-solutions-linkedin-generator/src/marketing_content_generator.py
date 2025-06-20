"""
Universal Marketing Content Generator with Extended Thinking Integration
Generates compelling marketing content from any HTML document using advanced AI analysis.
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
from .universal_content_parser import MarketingData, ContentElement
from .professional_formatter import ProfessionalFormatter, ContentSuite, ContentFormat

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MarketingObjective(Enum):
    """Marketing objectives for content generation."""
    THOUGHT_LEADERSHIP = "thought_leadership"
    BRAND_AWARENESS = "brand_awareness"
    LEAD_GENERATION = "lead_generation"
    ENGAGEMENT = "engagement"
    EDUCATION = "education"
    SALES_ENABLEMENT = "sales_enablement"

class TargetAudience(Enum):
    """Target audience types."""
    EXECUTIVES = "executives"
    PROFESSIONALS = "professionals"
    TECHNICAL = "technical"
    GENERAL_BUSINESS = "general_business"
    INDUSTRY_SPECIFIC = "industry_specific"

class ContentTone(Enum):
    """Content tone options."""
    PROFESSIONAL = "professional"
    CONVERSATIONAL = "conversational"
    AUTHORITATIVE = "authoritative"
    INSPIRATIONAL = "inspirational"
    EDUCATIONAL = "educational"

@dataclass
class MarketingConfig:
    """Configuration for marketing content generation."""
    objective: MarketingObjective
    target_audience: TargetAudience
    tone: ContentTone
    industry_focus: str
    competitive_angle: bool
    include_data_points: bool
    urgency_level: float  # 0-1 scale

@dataclass
class AnalysisStage:
    """Results from a specific analysis stage."""
    stage_name: str
    insights: List[str]
    key_findings: List[str]
    confidence_score: float
    processing_time: float

@dataclass
class MarketingIntelligence:
    """Comprehensive marketing intelligence from AI analysis."""
    content_comprehension: AnalysisStage
    message_extraction: AnalysisStage
    audience_analysis: AnalysisStage
    marketing_angles: AnalysisStage
    competitive_positioning: AnalysisStage
    overall_score: float
    recommendations: List[str]

class UniversalMarketingGenerator:
    """
    Universal marketing content generator that creates compelling content
    from any HTML document using 5-stage AI intelligence pipeline.
    """
    
    def __init__(self):
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            logger.error("ANTHROPIC_API_KEY not found in environment variables!")
            raise ValueError("ANTHROPIC_API_KEY must be set")
        
        logger.info(f"Initializing Claude Sonnet 4 client with API key (length: {len(api_key)})")
        self.anthropic_client = Anthropic(api_key=api_key)
        self.formatter = ProfessionalFormatter()
        
        # INVESTIGATIVE BUSINESS INTELLIGENCE PROMPTS - UNCOVER HIDDEN INSIGHTS
        self.analysis_prompts = {
            "content_comprehension": """
            <extended_thinking>
            I must conduct an exhaustive investigation of EVERY detail in the source material. This requires:

            COMPREHENSIVE DOCUMENT EXAMINATION:
            - Systematically analyze every section, subsection, paragraph, and sentence
            - Extract insights from headings, subheadings, formatting, and document structure
            - Examine every data point, statistic, quote, and reference
            - Look for patterns that emerge across different sections of the document
            - Identify evolution of themes and concepts throughout the entire material
            - Note inconsistencies, contradictions, or gaps in the presented information

            DEEP ANALYTICAL METHODOLOGY:
            - Apply multiple investigative frameworks to the same content segments
            - Cross-reference information across different parts of the document
            - Look for cause-and-effect relationships spanning the entire source
            - Identify stakeholders, processes, and systems mentioned throughout
            - Extract operational details that reveal strategic opportunities
            - Connect tactical observations to strategic implications

            COMPREHENSIVE INSIGHT EXTRACTION:
            - Catalog every significant finding, regardless of how minor it may seem
            - Identify transformation opportunities embedded in problem descriptions
            - Extract competitive intelligence from organizational commentary
            - Find strategic advantages hidden in operational inefficiencies
            - Uncover market opportunities implicit in customer pain points
            - Detect innovation possibilities in process descriptions
            
            I will examine EVERY detail of the source material to ensure no insight is missed.
            </extended_thinking>

            COMPREHENSIVE INVESTIGATIVE ANALYSIS - EXHAUSTIVE SOURCE EXAMINATION

            Conduct a thorough, systematic investigation of the ENTIRE source material, examining every detail to uncover strategic insights:

            COMPLETE SOURCE MATERIAL: {content}

            EXHAUSTIVE ANALYSIS FRAMEWORK:

            1. SYSTEMATIC CONTENT AUDIT: Examine every section, paragraph, data point, and detail in the source material. What specific insights emerge from each part of the document?

            2. PATTERN ANALYSIS ACROSS ENTIRE DOCUMENT: What patterns, themes, and connections span the complete source material? How do insights from different sections reinforce or contradict each other?

            3. COMPREHENSIVE STAKEHOLDER MAPPING: Identify every person, role, organization, and entity mentioned throughout the entire document. What does this reveal about decision-making structures and influence networks?

            4. OPERATIONAL INTELLIGENCE EXTRACTION: Catalog every process, system, inefficiency, and operational detail mentioned. What transformation opportunities are embedded in these descriptions?

            5. STRATEGIC OPPORTUNITY IDENTIFICATION: What competitive advantages, market opportunities, and strategic insights can be extracted from the complete analysis of all available information?

            6. COMPREHENSIVE EVIDENCE CATALOGING: Extract every quote, statistic, example, and piece of evidence. What story do these details tell when analyzed collectively?

            INVESTIGATIVE REQUIREMENTS:
            - Leave no detail unexamined in the source material
            - Extract insights from seemingly mundane operational descriptions
            - Connect micro-details to macro-strategic implications
            - Identify opportunities hidden in problem descriptions
            - Find competitive intelligence in organizational commentary
            - Generate comprehensive insights that utilize the full scope of available information
            """,
            
            "message_extraction": """
            <extended_thinking>
            I must systematically extract EVERY message, theme, and insight from the complete source material. This requires:

            COMPREHENSIVE MESSAGE AUDIT:
            - Examine every paragraph for explicit and implicit messages
            - Extract themes that evolve throughout the entire document
            - Identify contradictions or tensions between different sections
            - Catalog every value proposition, benefit claim, and strategic assertion
            - Note tone shifts and emphasis changes across the complete material
            - Extract the underlying narrative arc that spans the entire document

            DEEP THEMATIC ANALYSIS:
            - Look for recurring themes that appear in multiple sections
            - Identify messages that are reinforced through repetition or emphasis
            - Extract implicit messages embedded in operational descriptions
            - Find strategic messages hidden in problem descriptions and pain points
            - Uncover transformation themes embedded in inefficiency discussions
            - Identify competitive positioning messages throughout the content

            COMPREHENSIVE INSIGHT MINING:
            - Extract every specific example, case study, and illustration
            - Catalog all quantitative evidence and qualitative insights
            - Identify proof points and validation examples throughout the material
            - Extract success stories and failure analysis from the complete source
            - Find transformation opportunities embedded in operational commentary
            - Uncover strategic implications from seemingly tactical descriptions
            </extended_thinking>

            COMPREHENSIVE MESSAGE INTELLIGENCE - SYSTEMATIC THEME EXTRACTION

            Conduct exhaustive extraction of every message, theme, and insight from the complete source material:

            COMPLETE SOURCE INTELLIGENCE: {content}

            SYSTEMATIC MESSAGE EXTRACTION:

            1. COMPLETE THEMATIC AUDIT: Examine every section of the source material for explicit and implicit messages. What themes emerge from each part of the document and how do they connect?

            2. NARRATIVE ARC ANALYSIS: What overarching story does the complete source material tell? How do messages evolve and develop throughout the entire document?

            3. COMPREHENSIVE VALUE PROPOSITION EXTRACTION: Catalog every benefit, advantage, and value claim mentioned throughout the source. What value story emerges from the complete analysis?

            4. OPERATIONAL MESSAGE MINING: What strategic messages are embedded in operational descriptions, process commentary, and system discussions throughout the material?

            5. COMPETITIVE INTELLIGENCE EXTRACTION: What competitive positioning, market dynamics, and strategic advantages are revealed across the entire source?

            6. TRANSFORMATION OPPORTUNITY IDENTIFICATION: What change opportunities, improvement possibilities, and innovation potential are embedded throughout the complete material?

            7. STAKEHOLDER MESSAGE ANALYSIS: What messages emerge about different stakeholders, their priorities, challenges, and opportunities across the entire document?

            EXTRACTION REQUIREMENTS:
            - Examine every section for both explicit and implicit messages
            - Extract themes that span multiple parts of the source material
            - Identify contradictions or evolutions in messaging throughout the document
            - Catalog every example, proof point, and validation case
            - Connect tactical messages to strategic implications
            - Generate comprehensive insights from the complete source analysis
            """,
            
            "audience_analysis": """
            <extended_thinking>
            I need to profile the real people behind this content like an investigative journalist building a story. Who are the actual decision-makers? What are their hidden motivations, fears, and pressures? What evidence reveals their true decision-making psychology and readiness for change?
            </extended_thinking>

            INVESTIGATIVE STAKEHOLDER PROFILING - WHO ARE THE REAL PLAYERS?

            I'm profiling the key stakeholders to understand their hidden motivations and decision triggers:

            STAKEHOLDER EVIDENCE: {content}

            INVESTIGATIVE PROFILING:
            1. POWER PLAYERS: Who actually makes the decisions, and what evidence reveals their true priorities?
            2. HIDDEN INFLUENCERS: What behind-the-scenes stakeholders shape outcomes but aren't obviously visible?
            3. DECISION PSYCHOLOGY: What specific pressures, fears, or ambitions drive their choices?
            4. CHANGE READINESS SIGNALS: What evidence suggests openness to transformation vs. resistance?
            5. COMPETITIVE ANXIETIES: What threats or FOMO factors could accelerate decision-making?

            INVESTIGATIVE TECHNIQUE:
            - Identify specific quotes that reveal stakeholder frustrations or aspirations
            - Look for evidence of budget pressures, competitive threats, or performance gaps
            - Find clues about technology adoption experience and digital maturity
            - Uncover signs of organizational change readiness or resistance
            - Detect specific catalysts that could trigger transformation initiatives
            - Profile decision-making authority and influence networks
            """,
            
            "marketing_angles": """
            <extended_thinking>
            As an AI transformation expert, I need to identify compelling angles that reveal both the hard realities of current challenges AND the transformational potential of AI/digital solutions. This means finding authentic stories about operational pain that can become digital transformation opportunities.
            </extended_thinking>

            AI TRANSFORMATION ANGLE IDENTIFICATION - TURNING PAIN INTO DIGITAL OPPORTUNITY

            Identify compelling transformation angles based on documented challenges:

            1. DIGITAL TRANSFORMATION URGENCY: What documented inefficiencies or competitive pressures create urgency for AI adoption?
            2. AUTOMATION OPPORTUNITY GAPS: What manual processes or operational bottlenecks represent clear AI/automation wins?
            3. DATA-DRIVEN INSIGHTS: What metrics or patterns reveal untapped potential for AI-powered optimization?
            4. TRANSFORMATION SUCCESS INDICATORS: What organizational factors suggest readiness for successful digital transformation?
            5. COMPETITIVE AI ADVANTAGES: What industry-specific challenges could be solved through AI to create competitive differentiation?

            SOURCE ANALYSIS: {content}

            AI CONSULTANCY ANGLE DEVELOPMENT:
            - Connect documented operational pain to specific AI/automation solutions
            - Identify industry transformation trends that align with documented challenges
            - Extract quotes that reveal manual work crying out for AI optimization
            - Highlight data availability that could power AI/ML initiatives
            - Note cultural or organizational factors that enable or hinder transformation
            - Position documented challenges as strategic transformation opportunities
            - Connect current pain points to future competitive advantages through AI
            """,
            
            "competitive_positioning": """
            <extended_thinking>
            As an AI consultancy expert, I need to analyze competitive positioning through the lens of digital transformation maturity. This means identifying where AI/digital solutions could create competitive advantages while being honest about current limitations and competitive threats.
            </extended_thinking>

            AI TRANSFORMATION COMPETITIVE ANALYSIS - DIGITAL DIFFERENTIATION OPPORTUNITIES

            Analyze competitive positioning through AI/digital transformation lens:

            1. DIGITAL MATURITY GAPS: What technology limitations or digital capabilities gaps create competitive vulnerabilities?
            2. AI TRANSFORMATION ADVANTAGES: What operational efficiencies or data assets could be leveraged for competitive differentiation through AI?
            3. AUTOMATION COMPETITIVE MOATS: What processes or capabilities, if automated, would create difficult-to-replicate advantages?
            4. TRANSFORMATION READINESS FACTORS: What organizational strengths position for successful AI adoption vs. competitors?
            5. DIGITAL DISRUPTION THREATS: What AI-native competitors or digital business models pose threats to traditional approaches?

            SOURCE INFORMATION: {content}

            AI CONSULTANCY COMPETITIVE ASSESSMENT:
            - Identify manual processes that, if automated, would create competitive advantages
            - Extract mentions of competitor digital capabilities or AI adoption
            - Note data quality, infrastructure, or talent advantages that enable AI transformation
            - Assess organizational change readiness vs. typical industry transformation challenges
            - Highlight specific inefficiencies that AI could eliminate for competitive edge
            - Connect documented strengths to potential AI/digital transformation amplifiers
            - Recognize where digital transformation gaps create market opportunity vulnerabilities
            """
        }
        
        # STRATEGIC CONTENT GENERATION - EXTRACT VALUE FROM AVAILABLE MATERIAL
        self.content_prompts = {
            "executive_summary": """
            <extended_thinking>
            I need to write an authoritative executive briefing that properly attributes insights to source research rather than claiming original investigation. This should synthesize and analyze existing research with compelling business journalism style while maintaining proper attribution throughout.
            </extended_thinking>

            STRATEGIC EXECUTIVE BRIEFING - RESEARCH-DRIVEN BUSINESS INTELLIGENCE

            Write a compelling executive briefing that synthesizes source research into actionable business intelligence:

            SOURCE RESEARCH MATERIAL: {intelligence}
            CONTENT FOUNDATION: {content}

            RESEARCH-BASED BRIEFING STRUCTURE:

            KEY RESEARCH FINDINGS (120-180 words): Open with the most provocative findings from the source material. Use language like "Recent research reveals..." "According to industry analysis..." "The data shows..." Include specific statistics and quotes with proper attribution. Create immediate impact with properly sourced insights.

            RESEARCH SYNTHESIS (250-350 words): Synthesize the key findings from source material using authoritative language. Phrases like "The research demonstrates..." "According to [Source]..." "Industry data indicates..." Weave specific findings and quotes with proper attribution. Build a compelling case based on existing evidence.

            STRATEGIC IMPLICATIONS (180-250 words): Analyze what the research means for competitive advantage. Use language like "The research suggests..." "Based on industry analysis..." "Data indicates that organizations..." Paint a vivid picture of strategic opportunities grounded in source material.

            RESEARCH-BASED RECOMMENDATIONS (120-180 words): Present specific actions based on research evidence. Use phrases like "The evidence supports..." "Research indicates that successful organizations..." "Based on industry best practices..." Ground recommendations in source material.

            ATTRIBUTION REQUIREMENTS:

            PROPER SOURCING: Always attribute insights to original research and sources

            RESEARCH LANGUAGE: Use phrases like "According to [Study]," "Research by [Author] shows," "Industry data reveals"

            SPECIFIC EVIDENCE: Include exact quotes and statistics with proper source attribution

            SYNTHESIS APPROACH: Present analysis as synthesis of existing research, not original investigation

            Write this as a strategic briefing that synthesizes research into actionable intelligence while properly crediting all sources and authors.
            """,
            
            "social_content": """
            <extended_thinking>
            As an AI transformation expert creating social content, I need to extract authentic insights from source material AND interpret them through AI/digital transformation opportunities. This creates compelling content that shows how real operational challenges become digital transformation opportunities.
            </extended_thinking>

            AI TRANSFORMATION SOCIAL CONTENT - REAL CHALLENGES TO DIGITAL SOLUTIONS

            Create {platform} content that reveals transformation opportunities from actual source material:

            EXTRACTED AI TRANSFORMATION INTELLIGENCE:
            {intelligence}

            OBJECTIVE: {objective}

            NXT HUMANS AI CONSULTANCY CONTENT REQUIREMENTS:

            1. OPERATIONAL REALITY HOOK: Start with actual operational challenge, inefficiency, or pain point from source
            2. AI TRANSFORMATION INSIGHT: Connect documented problem to specific AI/automation opportunity
            3. STRATEGIC CONTEXT: Explain why this transformation opportunity matters competitively
            4. INDUSTRY RELEVANCE: Position insight within broader digital transformation trends
            5. ACTIONABLE NEXT STEP: Suggest concrete evaluation or implementation approach

            AI TRANSFORMATION CONTENT STRUCTURE:
            - OPENING: "I analyzed [specific operational challenge from source] and saw a massive AI opportunity..."
            - EVIDENCE: "[Direct quote about manual process/inefficiency] from [source context]"
            - TRANSFORMATION: "This inefficiency screams automation opportunity - imagine if [specific AI solution]..."
            - STRATEGIC IMPACT: "Organizations solving this with AI will [competitive advantage based on source findings]"
            - ENGAGEMENT: "What manual processes in your [industry] are crying out for AI transformation?"

            AI TRANSFORMATION HOOKS:
            - "Most [industry] companies are still doing [manual process from source] manually. Here's the AI opportunity they're missing..."
            - "[Specific inefficiency quote] reveals a $[calculated impact] automation opportunity..."
            - "While analyzing [source], I discovered [process] that AI could optimize by [specific improvement]..."

            TRANSFORMATION AUTHENTICITY REQUIREMENTS:
            - Base every AI recommendation on actual inefficiencies documented in source
            - Connect transformation opportunities to real competitive pressures mentioned
            - Use specific examples of manual work that could be automated
            - Reference actual organizational readiness factors from source analysis
            - Position AI solutions as responses to documented business challenges

            STRATEGIC ENGAGEMENT APPROACH:
            Generate discussion about transformation opportunities while staying grounded in real operational challenges.
            """,
            
            "professional_content": """
            <extended_thinking>
            As an AI transformation expert creating professional content, I need to combine thorough analysis of source material with strategic AI/digital transformation insights. This means presenting both current operational realities AND transformation opportunities based on documented evidence.
            </extended_thinking>

            AI TRANSFORMATION PROFESSIONAL ANALYSIS - FROM OPERATIONAL REALITY TO DIGITAL OPPORTUNITY

            Create professional {content_type} that combines evidence-based analysis with AI transformation strategy:

            CONTENT TYPE: {content_type}
            TARGET AUDIENCE: {audience}

            AI TRANSFORMATION INTELLIGENCE:
            {intelligence}

            NXT HUMANS AI CONSULTANCY ANALYSIS STRUCTURE:

            1. OPERATIONAL ASSESSMENT: What specific operational challenges, inefficiencies, and pain points are documented?
            2. AI TRANSFORMATION POTENTIAL: How could AI/automation address the documented operational challenges?
            3. DIGITAL MATURITY EVALUATION: What organizational factors enable or hinder AI transformation success?
            4. COMPETITIVE TRANSFORMATION IMPLICATIONS: How could AI adoption address documented competitive pressures?
            5. IMPLEMENTATION ROADMAP: What concrete steps could transform documented challenges into AI-powered advantages?
            6. TRANSFORMATION RISKS: What limitations or barriers to AI adoption are evident in the analysis?

            AI CONSULTANCY PROFESSIONAL REQUIREMENTS:

            - OPERATIONAL FOUNDATION: Ground every AI recommendation in actual inefficiencies documented in source
            - TRANSFORMATION STRATEGY: Connect documented pain points to specific AI/automation solutions
            - CHANGE READINESS: Assess organizational factors that impact AI transformation success
            - COMPETITIVE CONTEXT: Position AI initiatives within industry transformation trends
            - IMPLEMENTATION REALISM: Acknowledge both opportunities and constraints for AI adoption
            - ROI PROJECTION: Estimate transformation impact based on documented operational metrics

            AI TRANSFORMATION PROFESSIONAL TONE:
            - Strategic consultant presenting digital transformation opportunities
            - Evidence-based but forward-thinking about AI potential
            - Honest about implementation challenges while emphasizing opportunity
            - Expertise-driven analysis that sees patterns others miss
            - Confident about AI solutions while realistic about change management

            PROFESSIONAL ANALYSIS STRUCTURE:
            - Lead with most significant operational challenge that represents AI opportunity
            - Present documented evidence of manual processes ripe for automation
            - Connect operational pain to specific AI transformation solutions
            - Address implementation considerations based on organizational readiness factors
            - Conclude with strategic recommendations for digital transformation initiatives

            Write as an AI-native consultancy expert analyzing transformation opportunities for strategic decision-makers.
            """,
            
            "campaign_content": """
            <extended_thinking>
            As an AI transformation expert creating campaign content, I need to build on actual operational challenges from source material and position them as AI transformation opportunities. This creates authentic urgency based on real competitive pressures and documented inefficiencies.
            </extended_thinking>

            AI TRANSFORMATION CAMPAIGN DEVELOPMENT - REAL CHALLENGES TO COMPETITIVE ADVANTAGES

            Create {campaign_type} content that transforms documented operational challenges into AI opportunity campaigns:

            CAMPAIGN TYPE: {campaign_type}
            MARKETING OBJECTIVE: {objective}

            AI TRANSFORMATION SOURCE INTELLIGENCE:
            {intelligence}

            NXT HUMANS AI TRANSFORMATION CAMPAIGN REQUIREMENTS:

            1. OPERATIONAL CHALLENGE FOUNDATION: What documented inefficiencies or competitive pressures create genuine AI transformation urgency?
            2. AUTOMATION OPPORTUNITY VALUE: What specific operational improvements could AI/automation deliver based on source evidence?
            3. COMPETITIVE TRANSFORMATION TIMING: What market dynamics or competitive threats make AI adoption strategically critical?
            4. IMPLEMENTATION READINESS FACTORS: What organizational strengths or barriers influence AI transformation success?
            5. TRANSFORMATION ROI POTENTIAL: What measurable impacts could be achieved through AI adoption?

            AI TRANSFORMATION CAMPAIGN THEMES:
            - "Manual Processes Holding You Back" - Transform documented inefficiencies into automation opportunities
            - "AI Competitive Advantage Playbook" - Address documented competitive pressures through AI transformation
            - "Digital Transformation Assessment" - Evaluate organizational readiness based on source analysis patterns
            - "Operational AI Opportunities" - Connect specific documented challenges to AI solutions

            AI CONSULTANCY CAMPAIGN DEVELOPMENT:

            TRANSFORMATION OPPORTUNITY APPROACH:
            - Lead with documented operational challenges that represent clear AI opportunities
            - Use real quotes about manual processes or competitive pressures
            - Position AI solutions as responses to actual business pain documented in source
            - Create urgency based on competitive dynamics rather than artificial scarcity

            AI SOLUTION POSITIONING:
            - Connect specific AI/automation technologies to documented operational challenges
            - Reference transformation success patterns from similar organizational contexts
            - Provide realistic implementation timelines based on readiness assessment
            - Address change management considerations evident in source analysis

            STRATEGIC VALUE PROPOSITION:
            - Base transformation benefits on operational metrics and competitive context from source
            - Include both efficiency gains and competitive advantage opportunities
            - Present AI adoption as strategic response to documented market pressures
            - Provide framework for evaluating transformation ROI potential

            AI TRANSFORMATION CALLS-TO-ACTION:
            - Invite operational assessment to identify specific AI opportunities
            - Offer transformation readiness evaluation based on organizational factors
            - Suggest pilot program development for highest-impact automation opportunities
            - Provide AI transformation strategy consultation

            Write campaign content that positions AI transformation as strategic response to documented operational challenges.
            """,
            
            "blog_post": """
            <extended_thinking>
            I need to write an engaging business blog post that synthesizes source research into compelling insights. This should read like premium business journalism that properly attributes all findings to original sources while maintaining narrative engagement. I must avoid false first-person claims and properly credit research authors.
            </extended_thinking>

            RESEARCH-DRIVEN BUSINESS ANALYSIS - SYNTHESIZING STRATEGIC INTELLIGENCE

            Write an engaging business blog post that synthesizes source research into compelling strategic insights:

            SOURCE RESEARCH: {intelligence}
            TARGET READERSHIP: {audience}

            RESEARCH SYNTHESIS STRUCTURE (2000-2500 words):

            COMPELLING OPENING (200-300 words): Begin with the most striking findings from the source research. Use language like "Recent industry research reveals..." "According to new analysis..." "Emerging data shows..." Include specific statistics and quotes with proper attribution. Create immediate engagement with properly sourced insights.

            RESEARCH NARRATIVE (400-600 words): Tell the story revealed by the source material using compelling narrative. Use phrases like "The research demonstrates..." "According to [Study/Author]..." "Industry analysis shows..." Build narrative tension while systematically revealing research findings. Include specific evidence and quotes with proper attribution.

            KEY RESEARCH INSIGHTS (300-400 words): Present the most significant findings from source material. Use clear attribution: "Research by [Author/Organization] reveals..." "The study found..." Include the most compelling evidence from source material and explain its significance.

            STRATEGIC IMPLICATIONS (400-500 words): Analyze what the research means for business strategy. Use language like "The research suggests..." "Based on industry analysis..." "Data indicates..." Connect research findings to broader business trends and competitive dynamics.

            PRACTICAL APPLICATIONS (300-400 words): Show how organizations can apply the research insights. Use specific examples from source material and reference successful implementations documented in the research.

            FUTURE OUTLOOK (200-300 words): Present forward-looking analysis based on research trends and projections. Use phrases like "The research trajectory suggests..." "Based on current data trends..." "Industry forecasts indicate..."

            RESEARCH-BASED REQUIREMENTS:

            PROPER ATTRIBUTION: Always credit original research sources and authors

            SOURCE LANGUAGE: Use phrases like "According to [Research]," "Study by [Author] shows," "Industry data reveals"

            EVIDENCE-BASED CLAIMS: Support every major point with specific data or quotes from source material

            SYNTHESIS APPROACH: Present analysis as synthesis of existing research, not original investigation

            NARRATIVE ENGAGEMENT: Maintain compelling storytelling while preserving research integrity

            Write this as a business journalist synthesizing research into actionable insights while properly crediting all sources and maintaining reader engagement.
            """,
            
            "whitepaper": """
            <extended_thinking>
            I need to write a complete, comprehensive whitepaper that properly attributes research to original sources rather than claiming first-person analysis. This should read like authoritative business journalism that synthesizes and analyzes existing research. I must write the ENTIRE whitepaper from start to finish without stopping or asking questions. All claims must be properly sourced to the original research and authors.
            </extended_thinking>

            COMPREHENSIVE STRATEGIC WHITEPAPER - COMPLETE RESEARCH SYNTHESIS

            Write a complete 4000-5000 word strategic whitepaper that properly cites and synthesizes source research:

            SOURCE RESEARCH INTELLIGENCE: {intelligence}
            TARGET AUDIENCE: {audience}

            CRITICAL REQUIREMENTS:
            - Write the COMPLETE whitepaper from introduction to conclusion without stopping
            - Properly attribute all findings to original research sources and authors
            - Use phrases like "According to the research..." "The study reveals..." "Source data indicates..."
            - Include specific citations and references to original authors when available
            - Synthesize and analyze the research rather than claiming original investigation
            - Provide comprehensive strategic analysis based on the source material

            COMPLETE WHITEPAPER STRUCTURE (4000-5000 words total):

            EXECUTIVE SUMMARY (400-500 words): Synthesize the key findings from the source research. Use language like "Recent research reveals..." "According to industry analysis..." "The data shows..." Properly attribute insights to original sources.

            INTRODUCTION: THE STRATEGIC LANDSCAPE (500-600 words): Set the context using source research. Reference specific studies, reports, or data sources. Use phrases like "Industry research indicates..." "According to [Source]..." "The evidence from multiple studies suggests..."

            RESEARCH SYNTHESIS: KEY FINDINGS (800-1000 words): Present the core findings from the source material with proper attribution. Use section headers and cite specific research throughout. Include direct quotes and statistics with proper sourcing.

            COMPETITIVE ANALYSIS: MARKET IMPLICATIONS (700-900 words): Analyze competitive dynamics based on the source research. Reference specific data points and studies. Use language like "The research demonstrates..." "Data from [Source] reveals..."

            STRATEGIC FRAMEWORK: IMPLEMENTATION ROADMAP (800-1000 words): Develop strategic recommendations based on synthesized research findings. Properly cite supporting evidence for each recommendation.

            CASE STUDIES AND EVIDENCE (600-800 words): Present real-world examples and validation from the source material. Include specific examples with proper attribution.

            FUTURE OUTLOOK: STRATEGIC IMPLICATIONS (400-600 words): Analyze future trends based on source research and data projections. Cite predictive analysis and forecasting from original sources.

            RECOMMENDATIONS AND NEXT STEPS (400-500 words): Provide specific, actionable recommendations grounded in the research evidence. Reference supporting data and studies.

            CONCLUSION (200-300 words): Synthesize key insights and reinforce strategic imperatives based on the research analysis.

            ATTRIBUTION REQUIREMENTS:
            - Use proper research attribution language throughout
            - Reference original authors and sources when available
            - Include direct quotes with attribution
            - Use phrases like "Research by [Author/Organization] shows..." "According to [Study]..."
            - Cite specific statistics and data points with sources
            - Present analysis as synthesis of existing research, not original investigation

            Write the complete whitepaper from start to finish. Do not stop mid-way or ask clarifying questions. Provide comprehensive strategic analysis while properly crediting all source material and research.
            """
        }
        
        # Test the Claude API connection
        logger.info("Testing Claude API connection...")
    
    async def _test_claude_connection(self):
        """Test Claude API connection."""
        try:
            test_response = await self._call_claude_api("Say 'Claude connection successful!'", max_tokens=50)
            logger.info(f"Claude API test result: {test_response}")
        except Exception as e:
            logger.error(f"Claude API test failed: {str(e)}")
    
    async def generate_marketing_content(self, marketing_data: MarketingData, 
                                       config: MarketingConfig = None) -> ContentSuite:
        """
        Generate comprehensive marketing content from universal HTML data.
        
        Args:
            marketing_data: Parsed marketing data from any HTML document
            config: Marketing configuration and preferences
            
        Returns:
            ContentSuite with professionally formatted marketing content
        """
        try:
            # Set default config if none provided
            if config is None:
                config = MarketingConfig(
                    objective=MarketingObjective.THOUGHT_LEADERSHIP,
                    target_audience=TargetAudience.PROFESSIONALS,
                    tone=ContentTone.PROFESSIONAL,
                    industry_focus="general",
                    competitive_angle=True,
                    include_data_points=True,
                    urgency_level=0.5
                )
            
            logger.info("Starting 5-stage marketing intelligence analysis...")
            
            # Stage 1: Content Comprehension
            comprehension = await self._analyze_content_comprehension(marketing_data)
            
            # Stage 2: Message Extraction
            message_extraction = await self._extract_core_messages(marketing_data)
            
            # Stage 3: Audience Analysis
            audience_analysis = await self._analyze_target_audience(marketing_data, config)
            
            # Stage 4: Marketing Angles
            marketing_angles = await self._identify_marketing_angles(marketing_data, config)
            
            # Stage 5: Competitive Positioning
            competitive_positioning = await self._analyze_competitive_positioning(marketing_data)
            
            # Combine intelligence
            marketing_intelligence = MarketingIntelligence(
                content_comprehension=comprehension,
                message_extraction=message_extraction,
                audience_analysis=audience_analysis,
                marketing_angles=marketing_angles,
                competitive_positioning=competitive_positioning,
                overall_score=self._calculate_overall_score([
                    comprehension, message_extraction, audience_analysis, 
                    marketing_angles, competitive_positioning
                ]),
                recommendations=self._generate_strategic_recommendations(marketing_data, config)
            )
            
            logger.info(f"Marketing intelligence analysis complete. Overall score: {marketing_intelligence.overall_score:.2f}")
            
            # Log intelligence summary for debugging
            intelligence_summary = self._create_intelligence_summary(marketing_intelligence)
            logger.info(f"Intelligence summary created (length: {len(intelligence_summary)})")
            logger.info(f"First 200 chars of intelligence summary: {intelligence_summary[:200]}")
            
            # Generate content using intelligence
            logger.info("Starting content suite generation with Claude API...")
            content_suite = await self._generate_content_suite(marketing_data, marketing_intelligence, config)
            logger.info(f"Content suite generation completed. Executive summary length: {len(content_suite.executive_summary.content) if content_suite.executive_summary else 0}")
            
            return content_suite
            
        except Exception as e:
            logger.error(f"Error generating marketing content: {str(e)}")
            raise
    
    async def _analyze_content_comprehension(self, marketing_data: MarketingData) -> AnalysisStage:
        """Stage 1: Comprehensive content understanding."""
        start_time = asyncio.get_event_loop().time()
        
        # Prepare content summary for analysis
        content_summary = {
            "title": marketing_data.title,
            "summary": marketing_data.executive_summary,
            "key_messages": [msg.text for msg in marketing_data.key_messages[:10]],
            "value_propositions": [vp.text for vp in marketing_data.value_propositions[:5]],
            "document_type": marketing_data.document_metadata.get("document_type", "general")
        }
        
        prompt = self.analysis_prompts["content_comprehension"].format(
            content=json.dumps(content_summary, indent=2)
        )
        
        response = await self._call_claude_api(prompt, max_tokens=1500)
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        # Parse response into insights
        insights = self._extract_insights_from_response(response)
        key_findings = self._extract_key_findings(response)
        
        return AnalysisStage(
            stage_name="Content Comprehension",
            insights=insights,
            key_findings=key_findings,
            confidence_score=0.9,
            processing_time=processing_time
        )
    
    async def _extract_core_messages(self, marketing_data: MarketingData) -> AnalysisStage:
        """Stage 2: Core message extraction."""
        start_time = asyncio.get_event_loop().time()
        
        # Prepare message-focused data
        message_data = {
            "value_propositions": [vp.text for vp in marketing_data.value_propositions],
            "benefits": [benefit.text for benefit in marketing_data.benefits_outcomes],
            "competitive_advantages": [ca.text for ca in marketing_data.competitive_advantages],
            "pain_points_addressed": [pp.text for pp in marketing_data.pain_points_addressed],
            "supporting_evidence": [se.text for se in marketing_data.supporting_evidence[:5]]
        }
        
        prompt = self.analysis_prompts["message_extraction"].format(
            content=json.dumps(message_data, indent=2)
        )
        
        response = await self._call_claude_api(prompt, max_tokens=1500)
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        insights = self._extract_insights_from_response(response)
        key_findings = self._extract_key_findings(response)
        
        return AnalysisStage(
            stage_name="Message Extraction",
            insights=insights,
            key_findings=key_findings,
            confidence_score=0.85,
            processing_time=processing_time
        )
    
    async def _analyze_target_audience(self, marketing_data: MarketingData, config: MarketingConfig) -> AnalysisStage:
        """Stage 3: Target audience analysis."""
        start_time = asyncio.get_event_loop().time()
        
        audience_data = {
            "target_audience_indicators": marketing_data.target_audience_indicators,
            "content_tone": config.tone.value,
            "industry_focus": config.industry_focus,
            "document_metadata": marketing_data.document_metadata
        }
        
        prompt = self.analysis_prompts["audience_analysis"].format(
            content=json.dumps(audience_data, indent=2)
        )
        
        response = await self._call_claude_api(prompt, max_tokens=1500)
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        insights = self._extract_insights_from_response(response)
        key_findings = self._extract_key_findings(response)
        
        return AnalysisStage(
            stage_name="Audience Analysis",
            insights=insights,
            key_findings=key_findings,
            confidence_score=0.8,
            processing_time=processing_time
        )
    
    async def _identify_marketing_angles(self, marketing_data: MarketingData, config: MarketingConfig) -> AnalysisStage:
        """Stage 4: Marketing angle identification."""
        start_time = asyncio.get_event_loop().time()
        
        angle_data = {
            "emotional_triggers": [et.text for et in marketing_data.emotional_triggers],
            "urgency_indicators": [ui.text for ui in marketing_data.urgency_indicators],
            "social_proof": [sp.text for sp in marketing_data.social_proof],
            "call_to_actions": [cta.text for cta in marketing_data.call_to_actions],
            "objective": config.objective.value
        }
        
        prompt = self.analysis_prompts["marketing_angles"].format(
            content=json.dumps(angle_data, indent=2)
        )
        
        response = await self._call_claude_api(prompt, max_tokens=1500)
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        insights = self._extract_insights_from_response(response)
        key_findings = self._extract_key_findings(response)
        
        return AnalysisStage(
            stage_name="Marketing Angles",
            insights=insights,
            key_findings=key_findings,
            confidence_score=0.8,
            processing_time=processing_time
        )
    
    async def _analyze_competitive_positioning(self, marketing_data: MarketingData) -> AnalysisStage:
        """Stage 5: Competitive positioning analysis."""
        start_time = asyncio.get_event_loop().time()
        
        positioning_data = {
            "competitive_advantages": [ca.text for ca in marketing_data.competitive_advantages],
            "value_propositions": [vp.text for vp in marketing_data.value_propositions],
            "unique_elements": [msg.text for msg in marketing_data.key_messages if "unique" in msg.text.lower() or "first" in msg.text.lower()],
            "data_points": [dp.text for dp in marketing_data.data_points]
        }
        
        prompt = self.analysis_prompts["competitive_positioning"].format(
            content=json.dumps(positioning_data, indent=2)
        )
        
        response = await self._call_claude_api(prompt, max_tokens=1500)
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        insights = self._extract_insights_from_response(response)
        key_findings = self._extract_key_findings(response)
        
        return AnalysisStage(
            stage_name="Competitive Positioning",
            insights=insights,
            key_findings=key_findings,
            confidence_score=0.75,
            processing_time=processing_time
        )
    
    async def _generate_content_suite(self, marketing_data: MarketingData, 
                                     intelligence: MarketingIntelligence, 
                                     config: MarketingConfig) -> ContentSuite:
        """Generate complete content suite using marketing intelligence."""
        
        # Prepare intelligence summary for content generation
        intelligence_summary = self._create_intelligence_summary(intelligence)
        
        # Generate AI-powered content using the intelligence
        logger.info("Generating executive summary...")
        executive_summary = await self._generate_executive_summary(intelligence_summary, marketing_data)
        logger.info(f"Executive summary generated: {len(executive_summary)} chars")
        
        logger.info("Generating social media content...")
        social_media_content = await self._generate_social_media_content(intelligence_summary, config)
        logger.info(f"Social media content generated: {len(social_media_content)} pieces")
        
        logger.info("Generating professional content...")
        professional_content = await self._generate_professional_content(intelligence_summary, config)
        logger.info(f"Professional content generated: {len(professional_content)} pieces")
        
        logger.info("Generating campaign content...")
        campaign_content = await self._generate_campaign_content(intelligence_summary, config)
        logger.info(f"Campaign content generated: {len(campaign_content)} pieces")
        
        logger.info("Generating marketing strategy...")
        marketing_strategy = await self._generate_marketing_strategy(intelligence_summary, marketing_data)
        logger.info(f"Marketing strategy generated: {len(marketing_strategy)} chars")
        
        logger.info("Generating blog post...")
        blog_post = await self._generate_blog_post(intelligence_summary, config)
        logger.info(f"Blog post generated: {len(blog_post)} chars")
        
        logger.info("Generating whitepaper...")
        whitepaper = await self._generate_whitepaper(intelligence_summary, config)
        logger.info(f"Whitepaper generated: {len(whitepaper)} chars")
        
        # Create ContentSuite with generated content
        from .professional_formatter import ContentSuite, FormattedContent, ContentFormat, ExportFormat
        from datetime import datetime
        
        return ContentSuite(
            executive_summary=FormattedContent(
                title="Executive Summary",
                content=executive_summary,
                format_type=ContentFormat.EXECUTIVE.value,
                export_format=ExportFormat.HTML.value,
                metadata={"generated_by": "ai", "intelligence_score": intelligence.overall_score},
                timestamp=datetime.now().isoformat()
            ),
            social_media_content=[
                FormattedContent(
                    title=f"Social Media Post {i+1}",
                    content=content,
                    format_type=ContentFormat.SOCIAL_MEDIA.value,
                    export_format=ExportFormat.PLAIN_TEXT.value,
                    metadata={"platform": "linkedin", "generated_by": "ai"},
                    timestamp=datetime.now().isoformat()
                ) for i, content in enumerate(social_media_content)
            ],
            professional_content=[
                FormattedContent(
                    title=f"Professional Content {i+1}",
                    content=content,
                    format_type=ContentFormat.PROFESSIONAL.value,
                    export_format=ExportFormat.MARKDOWN.value,
                    metadata={"content_type": "professional", "generated_by": "ai"},
                    timestamp=datetime.now().isoformat()
                ) for i, content in enumerate(professional_content)
            ],
            campaign_content=[
                FormattedContent(
                    title=f"Campaign Content {i+1}",
                    content=content,
                    format_type=ContentFormat.CAMPAIGN.value,
                    export_format=ExportFormat.HTML.value,
                    metadata={"campaign_type": "marketing", "generated_by": "ai"},
                    timestamp=datetime.now().isoformat()
                ) for i, content in enumerate(campaign_content)
            ],
            marketing_strategy=FormattedContent(
                title="Marketing Strategy",
                content=marketing_strategy,
                format_type=ContentFormat.EXECUTIVE.value,
                export_format=ExportFormat.HTML.value,
                metadata={"strategy_type": "comprehensive", "generated_by": "ai"},
                timestamp=datetime.now().isoformat()
            ),
            blog_post=FormattedContent(
                title="Strategic Business Blog Post",
                content=blog_post,
                format_type=ContentFormat.BLOG_POST.value,
                export_format=ExportFormat.HTML.value,
                metadata={"content_type": "blog_post", "word_count": len(blog_post.split()), "generated_by": "ai"},
                timestamp=datetime.now().isoformat()
            ),
            whitepaper=FormattedContent(
                title="Comprehensive Strategic Whitepaper",
                content=whitepaper,
                format_type=ContentFormat.WHITEPAPER.value,
                export_format=ExportFormat.HTML.value,
                metadata={"content_type": "whitepaper", "word_count": len(whitepaper.split()), "generated_by": "ai"},
                timestamp=datetime.now().isoformat()
            ),
            metadata={
                "generated_at": datetime.now().isoformat(),
                "source_title": marketing_data.title,
                "intelligence_score": intelligence.overall_score,
                "content_count": len(social_media_content) + len(professional_content) + len(campaign_content) + 4
            }
        )
    
    def _create_intelligence_summary(self, intelligence: MarketingIntelligence) -> str:
        """Create a comprehensive summary of marketing intelligence for content generation."""
        summary = f"""
MARKETING INTELLIGENCE ANALYSIS SUMMARY
Overall Intelligence Score: {intelligence.overall_score:.2f}/10

CONTENT COMPREHENSION INSIGHTS:
{chr(10).join([f"• {insight}" for insight in intelligence.content_comprehension.insights[:5]])}

MESSAGE EXTRACTION FINDINGS:
{chr(10).join([f"• {finding}" for finding in intelligence.message_extraction.key_findings[:5]])}

AUDIENCE ANALYSIS:
{chr(10).join([f"• {insight}" for insight in intelligence.audience_analysis.insights[:5]])}

MARKETING ANGLES:
{chr(10).join([f"• {angle}" for angle in intelligence.marketing_angles.insights[:5]])}

COMPETITIVE POSITIONING:
{chr(10).join([f"• {position}" for position in intelligence.competitive_positioning.insights[:5]])}

STRATEGIC RECOMMENDATIONS:
{chr(10).join([f"• {rec}" for rec in intelligence.recommendations])}
"""
        return summary
    
    async def _generate_executive_summary(self, intelligence_summary: str, marketing_data: MarketingData) -> str:
        """Generate AI-powered executive summary using Ultimate LinkedIn Framework."""
        prompt = self.content_prompts["executive_summary"].format(
            intelligence=intelligence_summary,
            content=f"Title: {marketing_data.title}\nSummary: {marketing_data.executive_summary}"
        )
        return await self._call_claude_api(prompt, max_tokens=1500)
    
    async def _generate_social_media_content(self, intelligence_summary: str, config: MarketingConfig) -> List[str]:
        """Generate multiple social media posts."""
        content_list = []
        
        platforms = ["LinkedIn", "Twitter", "Instagram"]
        
        for platform in platforms:
            prompt = self.content_prompts["social_content"].format(
                platform=platform,
                objective=config.objective.value,
                intelligence=intelligence_summary
            )
            content = await self._call_claude_api(prompt, max_tokens=1200)
            content_list.append(content)
        
        return content_list
    
    async def _generate_professional_content(self, intelligence_summary: str, config: MarketingConfig) -> List[str]:
        """Generate professional business content."""
        content_list = []
        
        content_types = ["Newsletter Section", "Blog Post Introduction", "Press Release Draft"]
        
        for content_type in content_types:
            prompt = self.content_prompts["professional_content"].format(
                content_type=content_type,
                audience=config.target_audience.value,
                intelligence=intelligence_summary
            )
            content = await self._call_claude_api(prompt, max_tokens=1500)
            content_list.append(content)
        
        return content_list
    
    async def _generate_campaign_content(self, intelligence_summary: str, config: MarketingConfig) -> List[str]:
        """Generate marketing campaign content."""
        content_list = []
        
        campaign_types = ["Email Campaign", "Landing Page Copy", "Advertisement Copy"]
        
        for campaign_type in campaign_types:
            prompt = self.content_prompts["campaign_content"].format(
                campaign_type=campaign_type,
                objective=config.objective.value,
                intelligence=intelligence_summary
            )
            content = await self._call_claude_api(prompt, max_tokens=1500)
            content_list.append(content)
        
        return content_list
    
    async def _generate_marketing_strategy(self, intelligence_summary: str, marketing_data: MarketingData) -> str:
        """Generate comprehensive marketing strategy using Ultimate LinkedIn Framework."""
        prompt = f"""
THE ULTIMATE LINKEDIN CONTENT TRANSFORMATION FRAMEWORK - MARKETING STRATEGY

PHASE 4: VALUE PROPOSITION DEVELOPMENT & STRATEGIC EXECUTION

INTELLIGENCE TO STRATEGIZE:
{intelligence_summary}

SOURCE CONTENT CONTEXT:
Title: {marketing_data.title}
Core Focus: {marketing_data.executive_summary}

STRATEGIC FRAMEWORK APPLICATION:

PHASE 1: DATA INTELLIGENCE & INSIGHT EXTRACTION
- Transform insights into strategic content themes
- Identify storytelling opportunities within data patterns
- Catalog competitive differentiators for content positioning

PHASE 2: CONTENT STRATEGY ARCHITECTURE
Apply the 4-Pillar Strategic Approach:

PILLAR 1: THOUGHT LEADERSHIP STRATEGY
- Transform intelligence into industry predictions and forecasts
- Create contrarian takes that challenge conventional wisdom
- Position insights as future-focused intelligence for market leadership

PILLAR 2: EDUCATIONAL VALUE STRATEGY  
- Break complex insights into digestible frameworks and models
- Create "how-to" content series from analytical findings
- Develop step-by-step implementation guides from intelligence

PILLAR 3: EMOTIONAL RESONANCE STRATEGY
- Connect data points to real business transformation stories
- Craft narratives that make insights personally relevant to executives
- Humanize statistics through case studies and success stories

PILLAR 4: COMMUNITY ENGAGEMENT STRATEGY
- Generate discussion-worthy questions from findings
- Create polls and interactive content from data insights
- Spark industry debates around controversial or surprising findings

PHASE 3: CONTENT FORMAT OPTIMIZATION STRATEGY

📱 Social Media Distribution Plan:
- LinkedIn: Professional thought leadership with data-driven insights
- Twitter: Real-time commentary on industry trends from intelligence
- Instagram: Visual storytelling of business transformations

📧 Professional Content Strategy:
- Newsletter series featuring "Hidden Insights" from analysis
- Blog content with "Numbers Don't Lie" myth-busting approach
- White papers using "Future-Proofing" predictive frameworks

🎯 Campaign Content Strategy:
- "Behind the Data" human story campaigns
- Competitive advantage positioning based on unique insights
- Transformation case studies from intelligence findings

PHASE 5: HUMANIZATION & STORYTELLING STRATEGY

Narrative Techniques for Intelligence Communication:
- Use analogies that relate complex data to everyday business experiences
- Include before/after scenarios that demonstrate transformation potential
- Share underdog stories hidden within statistical findings
- Connect insights to emotional business outcomes and personal career impact

PHASE 6: ENGAGEMENT & OPTIMIZATION STRATEGY

Content Series Development:
📊 "Weekly Intelligence Briefings" - regular insight updates
📈 "Market Disruption Alerts" - trend analysis with future implications  
🎯 "Executive Decision Frameworks" - actionable guidance from intelligence
💡 "Innovation Opportunities" - competitive advantage identification

Hashtag Strategy Framework:
TIER 1: #ThoughtLeadership #DataDriven #BusinessIntelligence #ExecutiveInsights
TIER 2: [Industry-specific tags derived from source content]
TIER 3: [Trending hashtags aligned with intelligence themes]

EXECUTION ROADMAP:

Week 1-2: Foundation Building
- Launch "Intelligence Insights" content series
- Establish thought leadership positioning
- Begin community engagement with provocative questions

Week 3-4: Authority Establishment  
- Release comprehensive analysis pieces
- Share contrarian viewpoints backed by data
- Develop strategic partnerships for content amplification

Week 5-8: Market Leadership
- Position as go-to source for industry intelligence
- Create exclusive content for engaged community
- Develop speaking opportunities and media features

Success Metrics & Optimization:
- Engagement rates on thought leadership content
- Download rates for strategic frameworks
- Inbound consultation requests from content
- Industry recognition and speaking invitations

Format this as a professional strategy document with clear sections, actionable recommendations, and specific tactics. Use emoji icons for visual appeal and make it comprehensive yet immediately implementable.

Focus on extracting the most powerful strategic opportunities from the intelligence and positioning them as essential competitive advantages. Create urgency around implementation while providing clear step-by-step execution guidance.
"""
        return await self._call_claude_api(prompt, max_tokens=3000)
    
    async def _generate_blog_post(self, intelligence_summary: str, config: MarketingConfig) -> str:
        """Generate comprehensive blog post using strategic intelligence."""
        prompt = self.content_prompts["blog_post"].format(
            content_type="Strategic Business Analysis",
            audience=config.target_audience.value,
            intelligence=intelligence_summary
        )
        return await self._call_claude_api(prompt, max_tokens=4000)
    
    async def _generate_whitepaper(self, intelligence_summary: str, config: MarketingConfig) -> str:
        """Generate comprehensive whitepaper using strategic intelligence."""
        prompt = self.content_prompts["whitepaper"].format(
            content_type="Strategic Business Analysis",
            audience=config.target_audience.value,
            intelligence=intelligence_summary
        )
        return await self._call_claude_api(prompt, max_tokens=8000)
    
    async def _call_claude_api(self, prompt: str, max_tokens: int = 2000) -> str:
        """Call Claude API with investigative journalism instructions."""
        try:
            # Check if API key exists
            api_key = os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                error_msg = "ANTHROPIC_API_KEY not found in environment variables"
                logger.error(error_msg)
                return f"ERROR: {error_msg}"
            
            logger.info(f"Making Claude Sonnet 4 API call with {max_tokens} max tokens...")
            
            # Enhanced prompt with comprehensive extended thinking for Claude 4
            extended_prompt = f"""
<extended_thinking>
I am conducting a comprehensive, deep-dive analysis that must examine EVERY detail of the provided source material. As an expert investigative business analyst using Claude 4's advanced reasoning capabilities, I need to:

COMPREHENSIVE FILE ANALYSIS:
- Systematically examine every section, paragraph, data point, quote, and detail in the source material
- Look for patterns, connections, and insights that span the entire document
- Identify subtle implications and hidden meanings in the text
- Cross-reference different sections to find contradictions, confirmations, or evolving themes
- Extract insights from metadata, document structure, formatting, and organizational patterns
- Analyze not just what is said, but what is implied, omitted, or suggested between the lines

DEEP INVESTIGATIVE METHODOLOGY:
- Apply multiple analytical frameworks to the same content to uncover different perspectives
- Look for cause-and-effect relationships, systemic patterns, and emerging trends
- Identify specific stakeholders, decision-makers, and influencers mentioned throughout
- Extract quantitative data, qualitative insights, and strategic implications from every section
- Connect micro-details to macro-implications and strategic consequences
- Challenge assumptions and conventional interpretations of the data

THOROUGH EVIDENCE EXTRACTION:
- Catalog every statistic, quote, case study, and example in the source material
- Note specific language choices, tone shifts, and emphasis patterns throughout the document
- Identify author biases, perspective limitations, and potential gaps in the research
- Extract actionable intelligence from seemingly mundane operational details
- Find competitive advantages hidden in process descriptions and organizational commentary
- Uncover transformation opportunities embedded in problem descriptions and pain points

COMPREHENSIVE SYNTHESIS:
- Weave insights from the entire document into a cohesive narrative
- Connect early insights with later revelations to show evolution of understanding
- Use the full breadth of source material to support every major conclusion
- Create multi-layered analysis that operates on tactical, operational, and strategic levels
- Ensure no significant detail or insight from the source material is overlooked
- Build comprehensive frameworks that incorporate the full scope of available evidence

INVESTIGATIVE RIGOR:
- Apply investigative journalism standards to verify claims and cross-check information
- Look for corroborating evidence across different sections of the source material
- Identify potential inconsistencies or areas requiring deeper examination
- Extract maximum strategic value from every piece of available information
- Create authoritative analysis grounded in comprehensive examination of all available evidence

I will conduct a thorough, systematic analysis of the ENTIRE source material, leaving no detail unexamined, and synthesize these findings into compelling strategic intelligence.
</extended_thinking>

COMPREHENSIVE ANALYSIS MANDATE: You are conducting an exhaustive investigative analysis using Claude 4's advanced reasoning capabilities. You must thoroughly examine EVERY detail of the provided source material.

CRITICAL REQUIREMENTS:
- Conduct systematic analysis of the ENTIRE uploaded file, section by section
- Extract insights from every paragraph, data point, quote, and detail
- Look for patterns, connections, and implications across the complete document
- Generate comprehensive content without asking clarifying questions
- Use the full breadth of source material to support your analysis
- Apply multiple analytical frameworks to uncover maximum strategic value
- Connect micro-details to macro-implications throughout your analysis

{prompt}

METHODOLOGY: Conduct thorough investigative analysis that examines every detail of the source material and synthesizes findings into comprehensive strategic intelligence. Use the complete scope of available information to create authoritative content that demonstrates deep understanding of the entire document.
"""
            
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",  # Latest Claude Sonnet 4
                max_tokens=max_tokens,
                temperature=0.8,  # Higher temperature for investigative creativity
                messages=[{"role": "user", "content": extended_prompt}]
            )
            
            generated_content = response.content[0].text
            logger.info(f"Claude API call successful. Generated {len(generated_content)} characters of content.")
            
            return generated_content
            
        except Exception as e:
            error_msg = f"Claude API call failed: {str(e)}"
            logger.error(error_msg)
            logger.error(f"API Key present: {'Yes' if os.getenv('ANTHROPIC_API_KEY') else 'No'}")
            logger.error(f"API Key length: {len(os.getenv('ANTHROPIC_API_KEY', ''))}")
            return f"ERROR: Claude API failed - {str(e)}"
    
    def _extract_insights_from_response(self, response: str) -> List[str]:
        """Extract insights from Claude's response."""
        insights = []
        
        # Look for numbered lists or bullet points
        lines = response.split('\n')
        for line in lines:
            line = line.strip()
            if line and (line.startswith(('1.', '2.', '3.', '4.', '5.', '-', '•', '*'))):
                # Clean up the insight
                insight = line[2:].strip() if line[1:2] == '.' else line[1:].strip()
                if len(insight) > 10:  # Only include substantial insights
                    insights.append(insight)
        
        # If no structured insights found, extract sentences
        if not insights:
            sentences = response.split('.')
            for sentence in sentences[:5]:
                if len(sentence.strip()) > 20:
                    insights.append(sentence.strip())
        
        return insights[:10]  # Limit to top 10 insights
    
    def _extract_key_findings(self, response: str) -> List[str]:
        """Extract key findings from response."""
        findings = []
        
        # Look for key findings indicators
        finding_indicators = ['key finding', 'important', 'significant', 'critical', 'essential', 'primary']
        
        sentences = response.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if any(indicator in sentence.lower() for indicator in finding_indicators):
                if len(sentence) > 15:
                    findings.append(sentence)
        
        # If no specific findings, use first few insights
        if not findings:
            lines = response.split('\n')
            for line in lines[:3]:
                line = line.strip()
                if len(line) > 20:
                    findings.append(line)
        
        return findings[:5]  # Limit to top 5 findings
    
    def _calculate_overall_score(self, stages: List[AnalysisStage]) -> float:
        """Calculate overall intelligence score from all stages."""
        if not stages:
            return 0.0
        
        total_score = sum(stage.confidence_score for stage in stages)
        return total_score / len(stages)
    
    def _generate_strategic_recommendations(self, marketing_data: MarketingData, config: MarketingConfig) -> List[str]:
        """Generate strategic recommendations based on analysis."""
        recommendations = []
        
        # Audience-based recommendations
        if config.target_audience == TargetAudience.EXECUTIVES:
            recommendations.append("Focus on high-level strategic insights and business impact")
            recommendations.append("Use data-driven arguments and ROI projections")
        
        # Objective-based recommendations
        if config.objective == MarketingObjective.THOUGHT_LEADERSHIP:
            recommendations.append("Emphasize industry insights and forward-thinking perspectives")
            recommendations.append("Share contrarian viewpoints and innovative approaches")
        
        # Content-based recommendations
        if marketing_data.data_points:
            recommendations.append("Leverage statistical evidence to strengthen credibility")
        
        if marketing_data.social_proof:
            recommendations.append("Highlight testimonials and success stories prominently")
        
        if marketing_data.competitive_advantages:
            recommendations.append("Position unique differentiators as key value propositions")
        
        return recommendations[:5]  # Limit to top 5 recommendations
    
    def _enhance_marketing_data_with_intelligence(self, marketing_data: MarketingData, 
                                                intelligence: MarketingIntelligence) -> MarketingData:
        """Enhance marketing data with intelligence insights."""
        # Create enhanced summary combining original and intelligence
        enhanced_summary = f"{marketing_data.executive_summary}\n\nKey Intelligence Insights:\n"
        enhanced_summary += "\n".join([f"• {insight}" for insight in intelligence.content_comprehension.insights[:3]])
        
        # Update the marketing data with enhanced information
        marketing_data.executive_summary = enhanced_summary
        
        # Add intelligence recommendations as additional value propositions
        from .universal_content_parser import ContentElement
        for recommendation in intelligence.recommendations:
            marketing_data.value_propositions.append(
                ContentElement(
                    text=recommendation,
                    element_type="intelligence_recommendation",
                    confidence=intelligence.overall_score,
                    context="AI marketing intelligence",
                    position=len(marketing_data.value_propositions),
                    importance=0.8
                )
            )
        
        return marketing_data

def create_marketing_generator() -> UniversalMarketingGenerator:
    """Factory function to create a universal marketing generator."""
    return UniversalMarketingGenerator()