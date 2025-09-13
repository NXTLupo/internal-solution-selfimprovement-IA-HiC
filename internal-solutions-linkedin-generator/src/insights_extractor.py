"""
Insights Extractor for LinkedIn Post Generator
Advanced extraction and analysis of insights from journey data for content generation.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import nltk
from textstat import flesch_reading_ease, flesch_kincaid_grade
import spacy
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load spaCy model if available
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model not found. Some NLP features may not work.")
    nlp = None

class InsightType(Enum):
    BEHAVIORAL_PATTERN = "behavioral_pattern"
    EMOTIONAL_TRIGGER = "emotional_trigger"
    PAIN_POINT = "pain_point"
    OPPORTUNITY = "opportunity"
    TREND = "trend"
    RECOMMENDATION = "recommendation"
    STRATEGIC_IMPLICATION = "strategic_implication"

class InsightPriority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class ExtractedInsight:
    content: str
    insight_type: InsightType
    priority: InsightPriority
    confidence_score: float
    business_impact: str
    emotional_resonance: float
    uniqueness_score: float
    supporting_evidence: List[str]
    linkedin_potential: float
    thought_leadership_value: float
    audience_relevance: Dict[str, float]
    actionability_score: float

@dataclass
class InsightCluster:
    theme: str
    insights: List[ExtractedInsight]
    cluster_strength: float
    narrative_potential: float
    content_opportunities: List[str]

class InsightsExtractor:
    """
    Advanced insights extractor that identifies profound, LinkedIn-worthy insights
    from journey map data for content generation.
    """
    
    def __init__(self):
        self.business_keywords = {
            'revenue_impact': ['revenue', 'sales', 'profit', 'roi', 'conversion', 'growth'],
            'efficiency': ['efficiency', 'productivity', 'streamline', 'optimize', 'automation'],
            'customer_satisfaction': ['satisfaction', 'loyalty', 'retention', 'nps', 'feedback'],
            'competitive_advantage': ['competitive', 'advantage', 'differentiation', 'unique', 'leadership'],
            'innovation': ['innovation', 'disruption', 'transformation', 'breakthrough', 'emerging'],
            'risk_mitigation': ['risk', 'compliance', 'security', 'stability', 'protection']
        }
        
        self.emotional_indicators = {
            'high_intensity': ['frustrated', 'delighted', 'amazed', 'shocked', 'thrilled', 'devastated'],
            'medium_intensity': ['pleased', 'annoyed', 'surprised', 'concerned', 'satisfied', 'worried'],
            'low_intensity': ['content', 'okay', 'fine', 'alright', 'neutral', 'indifferent']
        }
        
        self.thought_leadership_triggers = [
            'counter-intuitive', 'unexpected', 'paradigm', 'breakthrough', 'revolutionary',
            'game-changer', 'overlooked', 'hidden', 'secret', 'proven', 'evidence-based',
            'data-driven', 'strategic', 'future', 'trend', 'prediction', 'forecast'
        ]
        
        self.audience_profiles = {
            'c_suite': ['ceo', 'cto', 'cfo', 'cmo', 'strategy', 'executive', 'leadership'],
            'managers': ['manager', 'director', 'team lead', 'supervisor', 'operations'],
            'practitioners': ['analyst', 'specialist', 'coordinator', 'associate', 'professional'],
            'entrepreneurs': ['founder', 'startup', 'entrepreneur', 'business owner', 'venture']
        }

    def extract_comprehensive_insights(self, journey_data: Dict[str, Any], 
                                     thinking_result: Dict[str, Any]) -> List[ExtractedInsight]:
        """
        Extract comprehensive insights from journey data and extended thinking results.
        
        Args:
            journey_data: Parsed journey map data
            thinking_result: Results from extended thinking analysis
            
        Returns:
            List of extracted insights with analysis metadata
        """
        logger.info("Starting comprehensive insight extraction...")
        
        extracted_insights = []
        
        # Extract insights from different data sources
        journey_insights = self._extract_from_journey_data(journey_data)
        thinking_insights = self._extract_from_thinking_results(thinking_result)
        pattern_insights = self._extract_hidden_patterns(journey_data, thinking_result)
        opportunity_insights = self._extract_strategic_opportunities(journey_data, thinking_result)
        
        # Combine all insights
        all_insights = journey_insights + thinking_insights + pattern_insights + opportunity_insights
        
        # Analyze and score insights
        scored_insights = []
        for insight in all_insights:
            scored_insight = self._analyze_insight_potential(insight, journey_data)
            if scored_insight.linkedin_potential >= 6.0:  # Only high-potential insights
                scored_insights.append(scored_insight)
        
        # Remove duplicates and rank by potential
        unique_insights = self._deduplicate_insights(scored_insights)
        ranked_insights = sorted(unique_insights, 
                               key=lambda x: (x.linkedin_potential + x.thought_leadership_value) / 2, 
                               reverse=True)
        
        logger.info(f"Extracted {len(ranked_insights)} high-potential insights")
        return ranked_insights[:20]  # Return top 20 insights

    def cluster_insights_by_theme(self, insights: List[ExtractedInsight]) -> List[InsightCluster]:
        """
        Cluster insights by thematic similarity for narrative development.
        """
        logger.info("Clustering insights by theme...")
        
        # Simple keyword-based clustering (in production, use more sophisticated NLP)
        clusters = {}
        
        for insight in insights:
            # Determine theme based on content analysis
            theme = self._determine_insight_theme(insight)
            
            if theme not in clusters:
                clusters[theme] = []
            clusters[theme].append(insight)
        
        # Create cluster objects with analysis
        insight_clusters = []
        for theme, theme_insights in clusters.items():
            if len(theme_insights) >= 2:  # Only meaningful clusters
                cluster = InsightCluster(
                    theme=theme,
                    insights=theme_insights,
                    cluster_strength=self._calculate_cluster_strength(theme_insights),
                    narrative_potential=self._assess_narrative_potential(theme_insights),
                    content_opportunities=self._identify_content_opportunities(theme, theme_insights)
                )
                insight_clusters.append(cluster)
        
        # Sort by narrative potential
        insight_clusters.sort(key=lambda x: x.narrative_potential, reverse=True)
        
        logger.info(f"Created {len(insight_clusters)} insight clusters")
        return insight_clusters

    def identify_content_hooks(self, insights: List[ExtractedInsight]) -> List[Dict[str, Any]]:
        """
        Identify the most compelling content hooks from insights.
        """
        logger.info("Identifying compelling content hooks...")
        
        hooks = []
        
        for insight in insights:
            # Calculate hook potential based on multiple factors
            hook_score = (
                insight.uniqueness_score * 0.3 +
                insight.emotional_resonance * 0.3 +
                insight.thought_leadership_value * 0.4
            )
            
            if hook_score >= 7.0:  # High hook potential
                hook = {
                    "content": insight.content,
                    "hook_type": self._classify_hook_type(insight),
                    "hook_score": hook_score,
                    "engagement_potential": insight.emotional_resonance,
                    "authority_demonstration": insight.thought_leadership_value,
                    "surprise_factor": insight.uniqueness_score,
                    "target_audience": self._identify_primary_audience(insight),
                    "supporting_evidence": insight.supporting_evidence[:2]  # Top 2 pieces of evidence
                }
                hooks.append(hook)
        
        # Sort by hook score
        hooks.sort(key=lambda x: x["hook_score"], reverse=True)
        
        logger.info(f"Identified {len(hooks)} compelling content hooks")
        return hooks[:10]  # Return top 10 hooks

    def extract_human_stories(self, journey_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract compelling human stories for authentic content.
        """
        logger.info("Extracting human stories...")
        
        stories = []
        
        # Extract from quotes
        if 'quotes' in journey_data:
            for quote_data in journey_data['quotes']:
                if hasattr(quote_data, 'content'):
                    content = quote_data.content
                elif isinstance(quote_data, dict):
                    content = quote_data.get('content', '')
                else:
                    content = str(quote_data)
                
                if len(content) > 20:  # Substantial quotes only
                    story = self._analyze_story_potential(content, quote_data)
                    if story['human_impact_score'] >= 6.0:
                        stories.append(story)
        
        # Extract from journey phases
        if 'phases' in journey_data:
            for phase in journey_data['phases']:
                if hasattr(phase, 'quotes') and phase.quotes:
                    for quote in phase.quotes:
                        story = self._analyze_story_potential(quote, phase)
                        if story['human_impact_score'] >= 6.0:
                            stories.append(story)
        
        # Sort by human impact
        stories.sort(key=lambda x: x['human_impact_score'], reverse=True)
        
        logger.info(f"Extracted {len(stories)} compelling human stories")
        return stories[:8]  # Return top 8 stories

    def assess_industry_relevance(self, insights: List[ExtractedInsight], 
                                industry_focus: str = "general") -> Dict[str, Any]:
        """
        Assess how insights relate to specific industries and trends.
        """
        logger.info(f"Assessing industry relevance for {industry_focus}...")
        
        industry_analysis = {
            "primary_industry": industry_focus,
            "relevant_insights": [],
            "cross_industry_applications": [],
            "trend_connections": [],
            "competitive_implications": [],
            "future_predictions": []
        }
        
        # Analyze each insight for industry relevance
        for insight in insights:
            relevance_score = self._calculate_industry_relevance(insight, industry_focus)
            
            if relevance_score >= 7.0:
                industry_analysis["relevant_insights"].append({
                    "insight": insight.content,
                    "relevance_score": relevance_score,
                    "application": self._suggest_industry_application(insight, industry_focus),
                    "competitive_advantage": self._assess_competitive_value(insight, industry_focus)
                })
        
        # Identify cross-industry applications
        for insight in insights:
            cross_applications = self._identify_cross_industry_applications(insight)
            if cross_applications:
                industry_analysis["cross_industry_applications"].extend(cross_applications)
        
        return industry_analysis

    # Private helper methods
    
    def _extract_from_journey_data(self, journey_data: Dict[str, Any]) -> List[ExtractedInsight]:
        """Extract insights directly from journey map data."""
        insights = []
        
        # Extract from pain points
        if 'pain_points' in journey_data:
            for pain_point in journey_data['pain_points']:
                content = self._get_content_from_object(pain_point)
                if content:
                    insight = ExtractedInsight(
                        content=content,
                        insight_type=InsightType.PAIN_POINT,
                        priority=self._assess_priority(content),
                        confidence_score=0.8,
                        business_impact=self._assess_business_impact_text(content),
                        emotional_resonance=self._calculate_emotional_resonance(content),
                        uniqueness_score=self._calculate_uniqueness(content),
                        supporting_evidence=[],
                        linkedin_potential=0.0,  # Will be calculated later
                        thought_leadership_value=0.0,  # Will be calculated later
                        audience_relevance={},  # Will be calculated later
                        actionability_score=self._calculate_actionability(content)
                    )
                    insights.append(insight)
        
        # Extract from recommendations
        if 'recommendations' in journey_data:
            for rec in journey_data['recommendations']:
                content = self._get_content_from_object(rec)
                if content:
                    insight = ExtractedInsight(
                        content=content,
                        insight_type=InsightType.RECOMMENDATION,
                        priority=self._assess_priority(content),
                        confidence_score=0.9,
                        business_impact=self._assess_business_impact_text(content),
                        emotional_resonance=self._calculate_emotional_resonance(content),
                        uniqueness_score=self._calculate_uniqueness(content),
                        supporting_evidence=[],
                        linkedin_potential=0.0,
                        thought_leadership_value=0.0,
                        audience_relevance={},
                        actionability_score=self._calculate_actionability(content)
                    )
                    insights.append(insight)
        
        return insights

    def _extract_from_thinking_results(self, thinking_result: Dict[str, Any]) -> List[ExtractedInsight]:
        """Extract insights from extended thinking analysis."""
        insights = []
        
        # Extract from strategic recommendations
        if 'strategic_recommendations' in thinking_result:
            for rec in thinking_result['strategic_recommendations']:
                content = rec if isinstance(rec, str) else str(rec)
                insight = ExtractedInsight(
                    content=content,
                    insight_type=InsightType.STRATEGIC_IMPLICATION,
                    priority=InsightPriority.HIGH,
                    confidence_score=0.95,
                    business_impact="high",
                    emotional_resonance=self._calculate_emotional_resonance(content),
                    uniqueness_score=self._calculate_uniqueness(content),
                    supporting_evidence=[],
                    linkedin_potential=0.0,
                    thought_leadership_value=0.0,
                    audience_relevance={},
                    actionability_score=self._calculate_actionability(content)
                )
                insights.append(insight)
        
        # Extract from human stories
        if 'human_stories' in thinking_result:
            for story in thinking_result['human_stories']:
                content = story if isinstance(story, str) else str(story)
                insight = ExtractedInsight(
                    content=content,
                    insight_type=InsightType.EMOTIONAL_TRIGGER,
                    priority=InsightPriority.MEDIUM,
                    confidence_score=0.85,
                    business_impact="medium",
                    emotional_resonance=self._calculate_emotional_resonance(content),
                    uniqueness_score=self._calculate_uniqueness(content),
                    supporting_evidence=[],
                    linkedin_potential=0.0,
                    thought_leadership_value=0.0,
                    audience_relevance={},
                    actionability_score=self._calculate_actionability(content)
                )
                insights.append(insight)
        
        return insights

    def _extract_hidden_patterns(self, journey_data: Dict[str, Any], 
                                thinking_result: Dict[str, Any]) -> List[ExtractedInsight]:
        """Extract hidden patterns that could be insights."""
        insights = []
        
        # Look for patterns in the data
        patterns = self._identify_data_patterns(journey_data)
        
        for pattern in patterns:
            insight = ExtractedInsight(
                content=f"Pattern identified: {pattern['description']}",
                insight_type=InsightType.BEHAVIORAL_PATTERN,
                priority=InsightPriority.MEDIUM,
                confidence_score=pattern['confidence'],
                business_impact=pattern['impact'],
                emotional_resonance=5.0,  # Neutral for patterns
                uniqueness_score=pattern['uniqueness'],
                supporting_evidence=pattern['evidence'],
                linkedin_potential=0.0,
                thought_leadership_value=0.0,
                audience_relevance={},
                actionability_score=pattern['actionability']
            )
            insights.append(insight)
        
        return insights

    def _extract_strategic_opportunities(self, journey_data: Dict[str, Any], 
                                       thinking_result: Dict[str, Any]) -> List[ExtractedInsight]:
        """Extract strategic opportunities from the analysis."""
        insights = []
        
        # Identify opportunities from pain points
        if 'pain_points' in journey_data:
            for pain_point in journey_data['pain_points']:
                content = self._get_content_from_object(pain_point)
                if content:
                    opportunity = self._convert_pain_to_opportunity(content)
                    if opportunity:
                        insight = ExtractedInsight(
                            content=opportunity,
                            insight_type=InsightType.OPPORTUNITY,
                            priority=InsightPriority.HIGH,
                            confidence_score=0.75,
                            business_impact="high",
                            emotional_resonance=6.0,
                            uniqueness_score=self._calculate_uniqueness(opportunity),
                            supporting_evidence=[content],
                            linkedin_potential=0.0,
                            thought_leadership_value=0.0,
                            audience_relevance={},
                            actionability_score=8.0
                        )
                        insights.append(insight)
        
        return insights

    def _analyze_insight_potential(self, insight: ExtractedInsight, 
                                 journey_data: Dict[str, Any]) -> ExtractedInsight:
        """Analyze and score the LinkedIn potential of an insight."""
        
        # Calculate LinkedIn potential
        content_lower = insight.content.lower()
        
        linkedin_score = 5.0  # Base score
        
        # Check for thought leadership triggers
        for trigger in self.thought_leadership_triggers:
            if trigger in content_lower:
                linkedin_score += 1.0
        
        # Check for business impact keywords
        for category, keywords in self.business_keywords.items():
            for keyword in keywords:
                if keyword in content_lower:
                    linkedin_score += 0.5
        
        # Bonus for data/numbers
        if re.search(r'\d+%|\d+\s+(?:percent|times|fold)', content_lower):
            linkedin_score += 1.5
        
        insight.linkedin_potential = min(linkedin_score, 10.0)
        
        # Calculate thought leadership value
        tl_score = insight.uniqueness_score * 0.4 + insight.confidence_score * 0.3 + linkedin_score * 0.3
        insight.thought_leadership_value = min(tl_score, 10.0)
        
        # Calculate audience relevance
        insight.audience_relevance = self._calculate_audience_relevance(insight.content)
        
        return insight

    def _deduplicate_insights(self, insights: List[ExtractedInsight]) -> List[ExtractedInsight]:
        """Remove duplicate or very similar insights."""
        unique_insights = []
        seen_content = set()
        
        for insight in insights:
            # Simple deduplication based on content similarity
            content_words = set(insight.content.lower().split())
            is_duplicate = False
            
            for seen in seen_content:
                seen_words = set(seen.lower().split())
                if len(content_words.intersection(seen_words)) / len(content_words.union(seen_words)) > 0.7:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_insights.append(insight)
                seen_content.add(insight.content)
        
        return unique_insights

    def _determine_insight_theme(self, insight: ExtractedInsight) -> str:
        """Determine the thematic category of an insight."""
        content_lower = insight.content.lower()
        
        themes = {
            "Customer Experience": ["experience", "customer", "user", "satisfaction", "journey"],
            "Business Strategy": ["strategy", "business", "competitive", "advantage", "growth"],
            "Technology & Innovation": ["technology", "innovation", "digital", "automation", "ai"],
            "Process Optimization": ["process", "efficiency", "optimization", "workflow", "productivity"],
            "Human Factors": ["human", "emotional", "psychological", "behavior", "culture"],
            "Market Trends": ["trend", "market", "industry", "future", "emerging"]
        }
        
        for theme, keywords in themes.items():
            for keyword in keywords:
                if keyword in content_lower:
                    return theme
        
        return "General Insights"

    def _calculate_cluster_strength(self, insights: List[ExtractedInsight]) -> float:
        """Calculate the strength of an insight cluster."""
        if not insights:
            return 0.0
        
        avg_potential = sum(insight.linkedin_potential for insight in insights) / len(insights)
        size_factor = min(len(insights) / 5, 1.0)  # Bonus for larger clusters
        
        return avg_potential * size_factor

    def _assess_narrative_potential(self, insights: List[ExtractedInsight]) -> float:
        """Assess the narrative potential of a cluster."""
        if not insights:
            return 0.0
        
        # Check for diverse insight types
        types = set(insight.insight_type for insight in insights)
        type_diversity = len(types) / len(InsightType)
        
        # Check for emotional range
        emotions = [insight.emotional_resonance for insight in insights]
        emotion_range = max(emotions) - min(emotions) if emotions else 0
        
        # Average confidence
        avg_confidence = sum(insight.confidence_score for insight in insights) / len(insights)
        
        narrative_score = (type_diversity * 3 + emotion_range * 0.5 + avg_confidence * 2) / 3
        return min(narrative_score * 10, 10.0)

    def _identify_content_opportunities(self, theme: str, insights: List[ExtractedInsight]) -> List[str]:
        """Identify content opportunities for a theme cluster."""
        opportunities = []
        
        # Based on theme, suggest content types
        theme_opportunities = {
            "Customer Experience": [
                "Customer journey transformation case study",
                "Experience design best practices",
                "CX metrics that matter in 2025"
            ],
            "Business Strategy": [
                "Strategic framework for digital transformation",
                "Competitive advantage through customer insights",
                "ROI calculation for experience investments"
            ],
            "Technology & Innovation": [
                "Technology adoption roadmap",
                "Innovation lab insights",
                "AI implementation lessons learned"
            ]
        }
        
        return theme_opportunities.get(theme, ["General business insights", "Industry trend analysis"])

    def _classify_hook_type(self, insight: ExtractedInsight) -> str:
        """Classify the type of content hook."""
        content_lower = insight.content.lower()
        
        if any(word in content_lower for word in ['surprising', 'unexpected', 'shocking', 'counter']):
            return "Surprise Factor"
        elif any(word in content_lower for word in ['data', 'study', 'research', 'found']):
            return "Data-Driven"
        elif any(word in content_lower for word in ['story', 'experience', 'customer']):
            return "Human Story"
        elif any(word in content_lower for word in ['future', 'trend', 'prediction']):
            return "Future-Focused"
        else:
            return "Insight-Based"

    def _identify_primary_audience(self, insight: ExtractedInsight) -> str:
        """Identify the primary audience for an insight."""
        content_lower = insight.content.lower()
        
        # Check for audience indicators
        for audience, keywords in self.audience_profiles.items():
            for keyword in keywords:
                if keyword in content_lower:
                    return audience.replace('_', ' ').title()
        
        # Default based on insight type
        if insight.insight_type == InsightType.STRATEGIC_IMPLICATION:
            return "C-Suite"
        elif insight.insight_type == InsightType.RECOMMENDATION:
            return "Managers"
        else:
            return "General Professional"

    def _analyze_story_potential(self, content: str, context: Any) -> Dict[str, Any]:
        """Analyze the human story potential of content."""
        emotional_score = self._calculate_emotional_resonance(content)
        relatability = self._calculate_relatability(content)
        
        return {
            "content": content,
            "human_impact_score": (emotional_score + relatability) / 2,
            "emotional_intensity": emotional_score,
            "relatability_score": relatability,
            "story_type": self._classify_story_type(content),
            "context": str(context) if context else "",
            "linkedin_readiness": self._assess_linkedin_story_readiness(content)
        }

    def _calculate_industry_relevance(self, insight: ExtractedInsight, industry: str) -> float:
        """Calculate how relevant an insight is to a specific industry."""
        # Simplified industry relevance calculation
        base_score = insight.linkedin_potential
        
        # Industry-specific keyword matching would go here
        # For now, return the base LinkedIn potential
        return base_score

    def _suggest_industry_application(self, insight: ExtractedInsight, industry: str) -> str:
        """Suggest how an insight applies to a specific industry."""
        return f"This insight can be applied in {industry} by focusing on customer-centric strategies and data-driven decision making."

    def _assess_competitive_value(self, insight: ExtractedInsight, industry: str) -> str:
        """Assess the competitive value of an insight for an industry."""
        if insight.uniqueness_score >= 8.0:
            return "High competitive advantage potential"
        elif insight.uniqueness_score >= 6.0:
            return "Moderate competitive advantage"
        else:
            return "Standard industry insight"

    def _identify_cross_industry_applications(self, insight: ExtractedInsight) -> List[str]:
        """Identify how an insight might apply across industries."""
        if insight.thought_leadership_value >= 8.0:
            return [
                "Technology sector customer experience",
                "Healthcare patient journey optimization",
                "Financial services user experience",
                "Retail customer engagement"
            ]
        return []

    # Utility helper methods

    def _get_content_from_object(self, obj: Any) -> str:
        """Extract content string from various object types."""
        if hasattr(obj, 'content'):
            return obj.content
        elif isinstance(obj, dict):
            return obj.get('content', str(obj))
        else:
            return str(obj)

    def _assess_priority(self, content: str) -> InsightPriority:
        """Assess the priority level of content."""
        content_lower = content.lower()
        
        if any(word in content_lower for word in ['critical', 'urgent', 'major', 'significant']):
            return InsightPriority.CRITICAL
        elif any(word in content_lower for word in ['important', 'key', 'essential']):
            return InsightPriority.HIGH
        elif any(word in content_lower for word in ['moderate', 'relevant', 'noteworthy']):
            return InsightPriority.MEDIUM
        else:
            return InsightPriority.LOW

    def _assess_business_impact_text(self, content: str) -> str:
        """Assess business impact from text content."""
        content_lower = content.lower()
        
        if any(word in content_lower for word in ['revenue', 'profit', 'cost', 'roi']):
            return "high"
        elif any(word in content_lower for word in ['efficiency', 'productivity', 'satisfaction']):
            return "medium"
        else:
            return "low"

    def _calculate_emotional_resonance(self, content: str) -> float:
        """Calculate emotional resonance score."""
        content_lower = content.lower()
        score = 5.0  # Base neutral score
        
        for intensity, words in self.emotional_indicators.items():
            for word in words:
                if word in content_lower:
                    if intensity == 'high_intensity':
                        score += 2.0
                    elif intensity == 'medium_intensity':
                        score += 1.0
                    else:
                        score += 0.5
        
        return min(score, 10.0)

    def _calculate_uniqueness(self, content: str) -> float:
        """Calculate uniqueness score of content."""
        # Simple uniqueness calculation based on uncommon words
        content_lower = content.lower()
        
        unique_score = 5.0
        
        # Check for uncommon/sophisticated words
        sophisticated_words = ['paradigm', 'leverage', 'optimize', 'unprecedented', 'innovative']
        for word in sophisticated_words:
            if word in content_lower:
                unique_score += 0.5
        
        # Check for specific data/numbers
        if re.search(r'\d+%|\d+x|\$\d+', content):
            unique_score += 1.0
        
        return min(unique_score, 10.0)

    def _calculate_actionability(self, content: str) -> float:
        """Calculate how actionable the content is."""
        content_lower = content.lower()
        score = 5.0
        
        action_words = ['implement', 'execute', 'apply', 'use', 'adopt', 'try', 'test']
        for word in action_words:
            if word in content_lower:
                score += 1.0
        
        return min(score, 10.0)

    def _calculate_audience_relevance(self, content: str) -> Dict[str, float]:
        """Calculate relevance to different audience types."""
        content_lower = content.lower()
        relevance = {}
        
        for audience, keywords in self.audience_profiles.items():
            score = 5.0  # Base relevance
            for keyword in keywords:
                if keyword in content_lower:
                    score += 1.0
            relevance[audience] = min(score, 10.0)
        
        return relevance

    def _identify_data_patterns(self, journey_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify patterns in the journey data."""
        patterns = []
        
        # Simple pattern identification
        if 'pain_points' in journey_data and len(journey_data['pain_points']) > 3:
            patterns.append({
                'description': f"Multiple pain points identified ({len(journey_data['pain_points'])})",
                'confidence': 0.8,
                'impact': 'high',
                'uniqueness': 6.0,
                'evidence': [str(pp) for pp in journey_data['pain_points'][:3]],
                'actionability': 8.0
            })
        
        return patterns

    def _convert_pain_to_opportunity(self, pain_point: str) -> Optional[str]:
        """Convert a pain point into an opportunity statement."""
        if 'difficult' in pain_point.lower():
            return pain_point.replace('difficult', 'opportunity to simplify')
        elif 'frustrating' in pain_point.lower():
            return pain_point.replace('frustrating', 'opportunity to improve')
        elif 'confusing' in pain_point.lower():
            return pain_point.replace('confusing', 'opportunity to clarify')
        else:
            return f"Opportunity to address: {pain_point}"

    def _calculate_relatability(self, content: str) -> float:
        """Calculate how relatable content is to professionals."""
        content_lower = content.lower()
        score = 5.0
        
        relatable_concepts = ['team', 'meeting', 'deadline', 'project', 'client', 'customer']
        for concept in relatable_concepts:
            if concept in content_lower:
                score += 0.8
        
        return min(score, 10.0)

    def _classify_story_type(self, content: str) -> str:
        """Classify the type of human story."""
        content_lower = content.lower()
        
        if any(word in content_lower for word in ['struggle', 'challenge', 'difficult']):
            return "Challenge Overcome"
        elif any(word in content_lower for word in ['success', 'achievement', 'breakthrough']):
            return "Success Story"
        elif any(word in content_lower for word in ['learn', 'discover', 'realize']):
            return "Learning Journey"
        else:
            return "Experience Narrative"

    def _assess_linkedin_story_readiness(self, content: str) -> float:
        """Assess how ready a story is for LinkedIn sharing."""
        score = 5.0
        
        # Professional context
        if any(word in content.lower() for word in ['business', 'work', 'professional', 'industry']):
            score += 2.0
        
        # Appropriate length
        if 50 <= len(content) <= 200:
            score += 1.0
        
        # Clear insight or lesson
        if any(word in content.lower() for word in ['learned', 'insight', 'realized', 'discovered']):
            score += 2.0
        
        return min(score, 10.0)


# Factory function
def create_insights_extractor() -> InsightsExtractor:
    """Factory function to create an insights extractor."""
    return InsightsExtractor()