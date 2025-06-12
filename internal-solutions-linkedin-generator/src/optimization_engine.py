"""
LinkedIn Optimization Engine for Content Generator
Implements 2025 LinkedIn best practices and algorithm optimization.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OptimizationStrategy(Enum):
    REACH_MAXIMIZATION = "reach_maximization"
    ENGAGEMENT_FOCUSED = "engagement_focused"
    THOUGHT_LEADERSHIP = "thought_leadership"
    PROFESSIONAL_AUTHORITY = "professional_authority"

class ContentFormat(Enum):
    TEXT_POST = "text_post"
    CAROUSEL = "carousel"
    VIDEO = "video"
    DOCUMENT = "document"
    POLL = "poll"

@dataclass
class LinkedInMetrics:
    expected_reach: int
    engagement_rate: float
    comment_likelihood: float
    share_probability: float
    thought_leadership_score: float
    algorithm_score: float
    professional_relevance: float

@dataclass
class OptimizationResult:
    optimized_content: str
    original_score: float
    optimized_score: float
    improvements: List[str]
    metrics: LinkedInMetrics
    posting_recommendations: Dict[str, Any]
    hashtag_strategy: Dict[str, Any]
    engagement_strategy: Dict[str, Any]

class LinkedInOptimizationEngine:
    """
    Advanced optimization engine for LinkedIn content based on 2025 best practices
    and algorithm behavior analysis.
    """
    
    def __init__(self):
        # LinkedIn 2025 Algorithm Factors
        self.algorithm_factors = {
            "engagement_velocity": 0.25,  # How quickly engagement happens
            "content_quality": 0.20,     # LinkedIn's quality assessment
            "relationship_strength": 0.15,  # Poster's network strength
            "content_type": 0.15,        # Format optimization
            "timing": 0.10,              # Posting time optimization
            "hashtag_strategy": 0.08,    # Strategic hashtag use
            "professional_relevance": 0.07  # Industry/professional focus
        }
        
        # Engagement triggers for 2025
        self.engagement_triggers = {
            "question_endings": ["What's your experience?", "How do you handle this?", "Thoughts?"],
            "controversial_starters": ["Unpopular opinion:", "Here's what most people get wrong:", "The truth is..."],
            "data_hooks": ["New research shows", "I analyzed 1000+", "The data reveals"],
            "story_openers": ["Last week, something happened", "A client just told me", "I made a mistake"],
            "future_focused": ["The future of", "In 2025, we'll see", "What's coming next"]
        }
        
        # Optimal content characteristics
        self.optimal_characteristics = {
            "post_length": {"min": 150, "max": 1300, "sweet_spot": (400, 800)},
            "paragraph_length": {"max": 3, "recommended": 2},
            "sentences_per_paragraph": {"max": 3, "recommended": 2},
            "hashtags": {"min": 3, "max": 8, "optimal": 5},
            "mentions": {"max": 3, "strategic_only": True},
            "emojis": {"max": 5, "professional_only": True}
        }
        
        # Professional industries and their characteristics
        self.industry_profiles = {
            "technology": {
                "keywords": ["AI", "machine learning", "automation", "digital transformation"],
                "tone": "innovative_forward_thinking",
                "trending_topics": ["AI adoption", "cybersecurity", "remote work tech"],
                "audience_level": "technical_and_executive"
            },
            "consulting": {
                "keywords": ["strategy", "transformation", "optimization", "ROI"],
                "tone": "authoritative_analytical",
                "trending_topics": ["business transformation", "operational excellence"],
                "audience_level": "executive_decision_makers"
            },
            "healthcare": {
                "keywords": ["patient experience", "healthcare innovation", "digital health"],
                "tone": "professional_empathetic",
                "trending_topics": ["telemedicine", "patient engagement", "health tech"],
                "audience_level": "healthcare_professionals"
            }
        }
        
        # Posting time optimization (based on 2025 data)
        self.optimal_posting_times = {
            "general": {
                "best_days": ["Tuesday", "Wednesday", "Thursday"],
                "best_times": ["9:00 AM", "10:00 AM", "2:00 PM"],
                "time_zones": ["EST", "PST", "GMT"]
            },
            "executive_audience": {
                "best_days": ["Tuesday", "Wednesday"],
                "best_times": ["7:00 AM", "12:00 PM", "6:00 PM"],
                "time_zones": ["EST", "GMT"]
            },
            "technical_audience": {
                "best_days": ["Wednesday", "Thursday", "Friday"],
                "best_times": ["10:00 AM", "2:00 PM", "4:00 PM"],
                "time_zones": ["PST", "EST", "GMT"]
            }
        }

    def optimize_content_comprehensive(self, content: str, content_type: str,
                                     target_audience: str = "general",
                                     optimization_strategy: OptimizationStrategy = OptimizationStrategy.THOUGHT_LEADERSHIP,
                                     industry: str = "general") -> OptimizationResult:
        """
        Comprehensively optimize content for LinkedIn 2025 best practices.
        
        Args:
            content: Original content to optimize
            content_type: Type of content (post, carousel, etc.)
            target_audience: Target professional audience
            optimization_strategy: Primary optimization focus
            industry: Industry vertical for specialized optimization
            
        Returns:
            OptimizationResult with optimized content and analytics
        """
        logger.info(f"Starting comprehensive optimization for {content_type}")
        
        # Analyze original content
        original_score = self._calculate_content_score(content, content_type)
        
        # Apply optimization strategies
        optimized_content = content
        improvements = []
        
        # 1. Structure optimization
        optimized_content, structure_improvements = self._optimize_structure(optimized_content, content_type)
        improvements.extend(structure_improvements)
        
        # 2. Hook optimization
        optimized_content, hook_improvements = self._optimize_hook(optimized_content, optimization_strategy)
        improvements.extend(hook_improvements)
        
        # 3. Engagement optimization
        optimized_content, engagement_improvements = self._optimize_engagement_triggers(optimized_content, target_audience)
        improvements.extend(engagement_improvements)
        
        # 4. Professional tone optimization
        optimized_content, tone_improvements = self._optimize_professional_tone(optimized_content, industry)
        improvements.extend(tone_improvements)
        
        # 5. Algorithm optimization
        optimized_content, algorithm_improvements = self._optimize_for_algorithm(optimized_content, content_type)
        improvements.extend(algorithm_improvements)
        
        # Calculate optimized score
        optimized_score = self._calculate_content_score(optimized_content, content_type)
        
        # Generate comprehensive metrics
        metrics = self._generate_performance_metrics(optimized_content, content_type, target_audience, industry)
        
        # Generate recommendations
        posting_recommendations = self._generate_posting_recommendations(target_audience, industry)
        hashtag_strategy = self._generate_hashtag_strategy(optimized_content, industry)
        engagement_strategy = self._generate_engagement_strategy(optimized_content, target_audience)
        
        result = OptimizationResult(
            optimized_content=optimized_content,
            original_score=original_score,
            optimized_score=optimized_score,
            improvements=improvements,
            metrics=metrics,
            posting_recommendations=posting_recommendations,
            hashtag_strategy=hashtag_strategy,
            engagement_strategy=engagement_strategy
        )
        
        logger.info(f"Optimization completed. Score improved from {original_score:.1f} to {optimized_score:.1f}")
        return result

    def optimize_for_algorithm_2025(self, content: str) -> Tuple[str, List[str]]:
        """
        Optimize content specifically for LinkedIn's 2025 algorithm.
        """
        optimized_content = content
        improvements = []
        
        # 1. Optimize for early engagement
        if not self._has_engagement_hook_early(content):
            optimized_content = self._add_early_engagement_hook(optimized_content)
            improvements.append("Added early engagement hook for algorithm boost")
        
        # 2. Optimize content structure for readability
        if self._needs_structure_improvement(content):
            optimized_content = self._improve_content_structure(optimized_content)
            improvements.append("Improved content structure for better algorithm parsing")
        
        # 3. Add strategic line breaks
        optimized_content = self._optimize_line_breaks(optimized_content)
        improvements.append("Optimized line breaks for mobile readability")
        
        # 4. Optimize for professional keywords
        optimized_content, keyword_improvements = self._add_professional_keywords(optimized_content)
        improvements.extend(keyword_improvements)
        
        return optimized_content, improvements

    def generate_hashtag_strategy_2025(self, content: str, industry: str = "general") -> Dict[str, Any]:
        """
        Generate optimal hashtag strategy for 2025 LinkedIn algorithm.
        """
        strategy = {
            "primary_hashtags": [],
            "secondary_hashtags": [],
            "industry_specific": [],
            "trending_professional": [],
            "niche_authority": [],
            "total_recommended": 5,
            "placement_strategy": "end_of_post",
            "rationale": {}
        }
        
        # Extract key topics from content
        key_topics = self._extract_key_topics(content)
        
        # Generate primary hashtags (2-3)
        strategy["primary_hashtags"] = self._generate_primary_hashtags(key_topics, industry)
        
        # Generate secondary hashtags (2-3)
        strategy["secondary_hashtags"] = self._generate_secondary_hashtags(content, industry)
        
        # Industry-specific hashtags
        if industry != "general":
            strategy["industry_specific"] = self._get_industry_hashtags(industry)
        
        # Trending professional hashtags
        strategy["trending_professional"] = self._get_trending_professional_hashtags()
        
        # Niche authority hashtags
        strategy["niche_authority"] = self._generate_niche_hashtags(content)
        
        # Build final recommendation
        final_hashtags = (
            strategy["primary_hashtags"][:2] +
            strategy["secondary_hashtags"][:2] +
            strategy["trending_professional"][:1]
        )
        
        strategy["final_recommendation"] = final_hashtags
        strategy["hashtag_string"] = " ".join([f"#{tag}" for tag in final_hashtags])
        
        return strategy

    def optimize_posting_timing(self, target_audience: str, industry: str = "general") -> Dict[str, Any]:
        """
        Optimize posting timing for maximum reach and engagement.
        """
        timing_profile = self.optimal_posting_times.get(target_audience, self.optimal_posting_times["general"])
        
        recommendations = {
            "optimal_days": timing_profile["best_days"],
            "optimal_times": timing_profile["best_times"],
            "time_zones": timing_profile["time_zones"],
            "frequency_recommendation": "3-5 posts per week",
            "content_spacing": "minimum 4 hours between posts",
            "industry_adjustments": self._get_industry_timing_adjustments(industry),
            "seasonal_considerations": self._get_seasonal_timing_factors(),
            "audience_activity_insights": self._get_audience_activity_insights(target_audience)
        }
        
        return recommendations

    # Private optimization methods
    
    def _optimize_structure(self, content: str, content_type: str) -> Tuple[str, List[str]]:
        """Optimize content structure for readability and engagement."""
        improvements = []
        
        # Break up long paragraphs
        paragraphs = content.split('\n\n')
        optimized_paragraphs = []
        
        for paragraph in paragraphs:
            if len(paragraph) > 200:  # Long paragraph
                # Split into smaller chunks
                sentences = paragraph.split('. ')
                current_chunk = ""
                
                for sentence in sentences:
                    if len(current_chunk + sentence) > 150:
                        optimized_paragraphs.append(current_chunk.strip())
                        current_chunk = sentence + ". "
                    else:
                        current_chunk += sentence + ". "
                
                if current_chunk.strip():
                    optimized_paragraphs.append(current_chunk.strip())
                
                improvements.append("Broke up long paragraphs for better readability")
            else:
                optimized_paragraphs.append(paragraph)
        
        optimized_content = '\n\n'.join(optimized_paragraphs)
        
        # Add strategic line breaks
        if content_type == "text_post":
            optimized_content = self._add_strategic_line_breaks(optimized_content)
            improvements.append("Added strategic line breaks for mobile optimization")
        
        return optimized_content, improvements

    def _optimize_hook(self, content: str, strategy: OptimizationStrategy) -> Tuple[str, List[str]]:
        """Optimize the opening hook based on strategy."""
        improvements = []
        lines = content.split('\n')
        first_line = lines[0] if lines else ""
        
        # Check if first line is engaging enough
        if len(first_line) < 50 or not self._is_engaging_hook(first_line):
            # Generate new hook based on strategy
            new_hook = self._generate_hook_by_strategy(first_line, strategy)
            lines[0] = new_hook
            improvements.append(f"Enhanced opening hook for {strategy.value if hasattr(strategy, 'value') else strategy} optimization")
        
        return '\n'.join(lines), improvements

    def _optimize_engagement_triggers(self, content: str, target_audience: str) -> Tuple[str, List[str]]:
        """Add engagement triggers appropriate for target audience."""
        improvements = []
        
        # Check if content ends with engagement trigger
        if not self._ends_with_engagement_trigger(content):
            trigger = self._select_engagement_trigger(content, target_audience)
            content += f"\n\n{trigger}"
            improvements.append("Added audience-appropriate engagement trigger")
        
        # Check for mid-content engagement elements
        if not self._has_mid_content_engagement(content):
            content = self._add_mid_content_engagement(content, target_audience)
            improvements.append("Added mid-content engagement element")
        
        return content, improvements

    def _optimize_professional_tone(self, content: str, industry: str) -> Tuple[str, List[str]]:
        """Optimize tone for professional credibility."""
        improvements = []
        
        # Industry-specific tone adjustments
        if industry in self.industry_profiles:
            profile = self.industry_profiles[industry]
            
            # Add industry keywords if missing
            content, keyword_added = self._enhance_with_industry_keywords(content, profile["keywords"])
            if keyword_added:
                improvements.append(f"Enhanced with {industry} industry terminology")
            
            # Adjust tone
            content = self._adjust_tone_for_industry(content, profile["tone"])
            improvements.append(f"Optimized tone for {industry} professionals")
        
        return content, improvements

    def _optimize_for_algorithm(self, content: str, content_type: str) -> Tuple[str, List[str]]:
        """Optimize for LinkedIn algorithm preferences."""
        improvements = []
        
        # Ensure optimal length
        if content_type == "text_post":
            if len(content) < self.optimal_characteristics["post_length"]["min"]:
                content = self._expand_content_strategically(content)
                improvements.append("Expanded content to optimal length for algorithm")
            elif len(content) > self.optimal_characteristics["post_length"]["max"]:
                content = self._condense_content_strategically(content)
                improvements.append("Condensed content to optimal length for algorithm")
        
        # Add professional context markers
        if not self._has_professional_context_markers(content):
            content = self._add_professional_context_markers(content)
            improvements.append("Added professional context markers for algorithm")
        
        return content, improvements

    def _calculate_content_score(self, content: str, content_type: str) -> float:
        """Calculate comprehensive content quality score."""
        score = 0.0
        max_score = 100.0
        
        # Structure score (20 points)
        structure_score = self._score_content_structure(content)
        score += structure_score * 0.20
        
        # Engagement potential (25 points)
        engagement_score = self._score_engagement_potential(content)
        score += engagement_score * 0.25
        
        # Professional relevance (20 points)
        professional_score = self._score_professional_relevance(content)
        score += professional_score * 0.20
        
        # Algorithm compatibility (20 points)
        algorithm_score = self._score_algorithm_compatibility(content, content_type)
        score += algorithm_score * 0.20
        
        # Readability (15 points)
        readability_score = self._score_readability(content)
        score += readability_score * 0.15
        
        return min(score, max_score)

    def _generate_performance_metrics(self, content: str, content_type: str, 
                                    target_audience: str, industry: str) -> LinkedInMetrics:
        """Generate predicted performance metrics."""
        
        # Base metrics calculation
        content_score = self._calculate_content_score(content, content_type)
        
        # Estimate reach based on content quality and format
        base_reach = 1000  # Base reach
        format_multiplier = {"text_post": 1.0, "carousel": 1.5, "video": 2.0, "document": 1.2}.get(content_type, 1.0)
        expected_reach = int(base_reach * (content_score / 100) * format_multiplier)
        
        # Estimate engagement rate
        engagement_rate = (content_score / 100) * 0.05  # 5% max engagement rate
        
        # Other metrics
        comment_likelihood = min(content_score / 100 * 0.8, 0.8)
        share_probability = min(content_score / 100 * 0.3, 0.3)
        thought_leadership_score = self._calculate_thought_leadership_score(content)
        algorithm_score = self._score_algorithm_compatibility(content, content_type)
        professional_relevance = self._score_professional_relevance(content)
        
        return LinkedInMetrics(
            expected_reach=expected_reach,
            engagement_rate=engagement_rate,
            comment_likelihood=comment_likelihood,
            share_probability=share_probability,
            thought_leadership_score=thought_leadership_score,
            algorithm_score=algorithm_score,
            professional_relevance=professional_relevance
        )

    def _generate_posting_recommendations(self, target_audience: str, industry: str) -> Dict[str, Any]:
        """Generate comprehensive posting recommendations."""
        timing = self.optimize_posting_timing(target_audience, industry)
        
        return {
            "optimal_timing": timing,
            "content_cadence": "3-5 posts per week for thought leadership",
            "engagement_window": "First 2 hours critical for algorithm boost",
            "cross_promotion": "Share to relevant LinkedIn groups after 4 hours",
            "follow_up_strategy": "Respond to comments within 1 hour when possible",
            "content_mix": "70% value-driven, 20% personal insights, 10% promotional",
            "audience_building": "Engage with 10-15 relevant posts daily in your industry"
        }

    def _generate_engagement_strategy(self, content: str, target_audience: str) -> Dict[str, Any]:
        """Generate engagement strategy for the content."""
        return {
            "pre_posting": [
                "Warm up network with engagement on others' posts 30 mins before",
                "Prepare 3-5 thoughtful responses for expected comments",
                "Identify 5-10 key people to mention or tag strategically"
            ],
            "during_peak": [
                "Respond to comments within 30 minutes",
                "Ask follow-up questions to commenters",
                "Share in relevant professional groups",
                "Engage with commenters' recent posts"
            ],
            "extended_engagement": [
                "Continue responding to comments for 24-48 hours",
                "Create follow-up content based on comment themes",
                "Connect with high-value commenters",
                "Use insights for next content creation"
            ],
            "comment_starters": self._generate_comment_starters(content, target_audience)
        }

    # Helper methods for optimization

    def _has_engagement_hook_early(self, content: str) -> bool:
        """Check if content has engaging element in first 2 lines."""
        lines = content.split('\n')[:2]
        first_part = '\n'.join(lines).lower()
        
        engagement_indicators = ['question', '?', 'surprising', 'unexpected', 'data', 'study', 'research']
        return any(indicator in first_part for indicator in engagement_indicators)

    def _add_early_engagement_hook(self, content: str) -> str:
        """Add an engagement hook early in the content."""
        lines = content.split('\n')
        
        # Insert after first line if it's substantial
        if len(lines) > 1 and len(lines[0]) > 50:
            lines.insert(1, "\nHere's what surprised me:")
        else:
            lines[0] = "Here's something interesting: " + lines[0]
        
        return '\n'.join(lines)

    def _needs_structure_improvement(self, content: str) -> bool:
        """Check if content structure needs improvement."""
        paragraphs = content.split('\n\n')
        
        # Check for overly long paragraphs
        for paragraph in paragraphs:
            if len(paragraph) > 300:
                return True
        
        # Check for lack of breaks
        if len(paragraphs) < 3 and len(content) > 500:
            return True
        
        return False

    def _improve_content_structure(self, content: str) -> str:
        """Improve content structure for better readability."""
        # Add line breaks at natural pause points
        content = re.sub(r'([.!?])\s+([A-Z])', r'\1\n\n\2', content)
        
        # Ensure no more than 3 sentences per paragraph
        paragraphs = content.split('\n\n')
        improved_paragraphs = []
        
        for paragraph in paragraphs:
            sentences = paragraph.split('. ')
            if len(sentences) > 3:
                # Split into smaller paragraphs
                for i in range(0, len(sentences), 2):
                    chunk = '. '.join(sentences[i:i+2])
                    if not chunk.endswith('.'):
                        chunk += '.'
                    improved_paragraphs.append(chunk)
            else:
                improved_paragraphs.append(paragraph)
        
        return '\n\n'.join(improved_paragraphs)

    def _optimize_line_breaks(self, content: str) -> str:
        """Optimize line breaks for mobile readability."""
        # Ensure maximum 2-3 sentences per paragraph
        paragraphs = content.split('\n\n')
        optimized_paragraphs = []
        
        for paragraph in paragraphs:
            # Split long paragraphs
            if len(paragraph) > 200:
                sentences = paragraph.split('. ')
                current_para = ""
                
                for sentence in sentences:
                    if len(current_para + sentence) > 150:
                        optimized_paragraphs.append(current_para.strip())
                        current_para = sentence + ". "
                    else:
                        current_para += sentence + ". "
                
                if current_para.strip():
                    optimized_paragraphs.append(current_para.strip())
            else:
                optimized_paragraphs.append(paragraph)
        
        return '\n\n'.join(optimized_paragraphs)

    def _add_professional_keywords(self, content: str) -> Tuple[str, List[str]]:
        """Add strategic professional keywords."""
        improvements = []
        
        professional_terms = {
            "impact": ["business impact", "strategic impact", "measurable impact"],
            "insights": ["key insights", "data-driven insights", "actionable insights"],
            "strategy": ["strategic approach", "business strategy", "growth strategy"],
            "innovation": ["innovative solutions", "breakthrough innovation", "transformative innovation"]
        }
        
        # Check if content lacks professional terminology
        content_lower = content.lower()
        for category, terms in professional_terms.items():
            if not any(term.split()[0] in content_lower for term in terms):
                # Add a relevant term
                best_term = terms[0]  # Use first term as default
                if category == "impact" and "result" in content_lower:
                    content = content.replace("result", best_term, 1)
                    improvements.append(f"Enhanced with professional terminology: {best_term}")
        
        return content, improvements

    def _is_engaging_hook(self, text: str) -> bool:
        """Check if text is an engaging hook."""
        text_lower = text.lower()
        
        engaging_patterns = [
            r'\?',  # Questions
            r'\b(surprising|unexpected|shocking|amazing)\b',
            r'\b(data|study|research|analysis)\b',
            r'\b(mistake|wrong|truth|secret)\b',
            r'\b(future|trend|prediction)\b'
        ]
        
        return any(re.search(pattern, text_lower) for pattern in engaging_patterns)

    def _generate_hook_by_strategy(self, original_hook: str, strategy: OptimizationStrategy) -> str:
        """Generate an improved hook based on optimization strategy."""
        if strategy == OptimizationStrategy.THOUGHT_LEADERSHIP:
            return f"Here's a perspective that's reshaping our industry: {original_hook}"
        elif strategy == OptimizationStrategy.ENGAGEMENT_FOCUSED:
            return f"Something happened recently that got me thinking... {original_hook}"
        elif strategy == OptimizationStrategy.PROFESSIONAL_AUTHORITY:
            return f"After working with 100+ organizations, I've learned: {original_hook}"
        else:
            return f"The data tells a compelling story: {original_hook}"

    def _ends_with_engagement_trigger(self, content: str) -> bool:
        """Check if content ends with an engagement trigger."""
        last_lines = content.split('\n')[-2:]
        last_text = '\n'.join(last_lines).lower()
        
        triggers = ['?', 'thoughts?', 'experience?', 'agree?', 'think?', 'perspective?']
        return any(trigger in last_text for trigger in triggers)

    def _select_engagement_trigger(self, content: str, target_audience: str) -> str:
        """Select appropriate engagement trigger for audience."""
        if target_audience == "executive":
            return "What's been your experience with this challenge?"
        elif target_audience == "technical":
            return "How have you approached this in your organization?"
        else:
            return "What's your take on this?"

    def _has_mid_content_engagement(self, content: str) -> bool:
        """Check if content has mid-content engagement elements."""
        mid_content = content.split('\n\n')[1:-1]  # Exclude first and last paragraphs
        
        for paragraph in mid_content:
            if '?' in paragraph or any(word in paragraph.lower() for word in ['question', 'challenge', 'interesting']):
                return True
        
        return False

    def _add_mid_content_engagement(self, content: str, target_audience: str) -> str:
        """Add engagement element in middle of content."""
        paragraphs = content.split('\n\n')
        
        if len(paragraphs) >= 3:
            # Insert engagement element in middle
            mid_point = len(paragraphs) // 2
            engagement_line = "Here's where it gets interesting:"
            paragraphs.insert(mid_point, engagement_line)
        
        return '\n\n'.join(paragraphs)

    def _enhance_with_industry_keywords(self, content: str, keywords: List[str]) -> Tuple[str, bool]:
        """Enhance content with industry-specific keywords."""
        content_lower = content.lower()
        added = False
        
        # Check if industry keywords are missing
        missing_keywords = [kw for kw in keywords if kw.lower() not in content_lower]
        
        if missing_keywords and len(missing_keywords) > len(keywords) / 2:
            # Add most relevant keyword
            keyword = missing_keywords[0]
            content = content.replace(content.split('.')[0], content.split('.')[0] + f" in {keyword}", 1)
            added = True
        
        return content, added

    def _adjust_tone_for_industry(self, content: str, tone_style: str) -> str:
        """Adjust content tone for industry."""
        # Simple tone adjustments based on style
        if tone_style == "innovative_forward_thinking":
            content = re.sub(r'\bwe should\b', 'we must innovate to', content, flags=re.IGNORECASE)
        elif tone_style == "authoritative_analytical":
            content = re.sub(r'\bI think\b', 'Analysis shows', content, flags=re.IGNORECASE)
        
        return content

    def _has_professional_context_markers(self, content: str) -> bool:
        """Check if content has professional context markers."""
        markers = ['business', 'organization', 'team', 'strategy', 'professional', 'industry', 'leadership']
        content_lower = content.lower()
        
        return any(marker in content_lower for marker in markers)

    def _add_professional_context_markers(self, content: str) -> str:
        """Add professional context markers to content."""
        # Add professional context to first sentence if missing
        first_sentence = content.split('.')[0]
        if not self._has_professional_context_markers(first_sentence):
            content = content.replace(first_sentence, f"In today's business environment, {first_sentence.lower()}", 1)
        
        return content

    def _expand_content_strategically(self, content: str) -> str:
        """Strategically expand short content."""
        # Add context or elaboration
        paragraphs = content.split('\n\n')
        
        # Add context to first paragraph
        if len(paragraphs) > 0:
            paragraphs[0] += " This observation comes from analyzing patterns across multiple organizations."
        
        # Add implication to last paragraph
        if len(paragraphs) > 1:
            paragraphs[-1] += " The implications for business strategy are significant."
        
        return '\n\n'.join(paragraphs)

    def _condense_content_strategically(self, content: str) -> str:
        """Strategically condense long content."""
        # Remove redundant phrases and condense sentences
        content = re.sub(r'\s+', ' ', content)  # Remove extra whitespace
        content = re.sub(r'\b(very|really|quite|pretty)\s+', '', content)  # Remove weak modifiers
        
        return content

    # Scoring methods

    def _score_content_structure(self, content: str) -> float:
        """Score content structure quality."""
        score = 50.0  # Base score
        
        paragraphs = content.split('\n\n')
        
        # Reward good paragraph count
        if 3 <= len(paragraphs) <= 6:
            score += 20
        
        # Reward appropriate paragraph length
        avg_para_length = sum(len(p) for p in paragraphs) / len(paragraphs)
        if 100 <= avg_para_length <= 200:
            score += 15
        
        # Reward line breaks
        if content.count('\n') >= len(paragraphs):
            score += 15
        
        return min(score, 100)

    def _score_engagement_potential(self, content: str) -> float:
        """Score engagement potential of content."""
        score = 30.0  # Base score
        content_lower = content.lower()
        
        # Check for questions
        if '?' in content:
            score += 25
        
        # Check for engagement triggers
        triggers = ['thoughts', 'experience', 'agree', 'opinion', 'perspective']
        for trigger in triggers:
            if trigger in content_lower:
                score += 10
                break
        
        # Check for emotional words
        emotional_words = ['amazing', 'surprising', 'shocking', 'incredible', 'fascinating']
        for word in emotional_words:
            if word in content_lower:
                score += 15
                break
        
        # Check for story elements
        story_words = ['story', 'happened', 'experience', 'learned', 'discovered']
        for word in story_words:
            if word in content_lower:
                score += 15
                break
        
        return min(score, 100)

    def _score_professional_relevance(self, content: str) -> float:
        """Score professional relevance of content."""
        score = 40.0  # Base score
        content_lower = content.lower()
        
        # Professional keywords
        professional_keywords = [
            'business', 'strategy', 'leadership', 'management', 'organization',
            'team', 'professional', 'industry', 'market', 'customer', 'client'
        ]
        
        for keyword in professional_keywords:
            if keyword in content_lower:
                score += 8
        
        return min(score, 100)

    def _score_algorithm_compatibility(self, content: str, content_type: str) -> float:
        """Score compatibility with LinkedIn algorithm."""
        score = 50.0  # Base score
        
        # Length optimization
        length = len(content)
        optimal_range = self.optimal_characteristics["post_length"]
        
        if optimal_range["sweet_spot"][0] <= length <= optimal_range["sweet_spot"][1]:
            score += 25
        elif optimal_range["min"] <= length <= optimal_range["max"]:
            score += 15
        
        # Engagement elements
        if self._has_engagement_hook_early(content):
            score += 15
        
        if self._ends_with_engagement_trigger(content):
            score += 10
        
        return min(score, 100)

    def _score_readability(self, content: str) -> float:
        """Score content readability."""
        # Simple readability scoring
        sentences = content.count('.') + content.count('!') + content.count('?')
        words = len(content.split())
        
        if sentences == 0:
            return 50.0
        
        avg_sentence_length = words / sentences
        
        # Optimal sentence length: 15-20 words
        if 15 <= avg_sentence_length <= 20:
            return 100.0
        elif 10 <= avg_sentence_length <= 25:
            return 80.0
        else:
            return 60.0

    def _calculate_thought_leadership_score(self, content: str) -> float:
        """Calculate thought leadership potential score."""
        score = 40.0  # Base score
        content_lower = content.lower()
        
        # Thought leadership indicators
        tl_indicators = [
            'insight', 'analysis', 'research', 'data', 'trend', 'future',
            'prediction', 'strategy', 'innovation', 'transformation',
            'paradigm', 'breakthrough', 'framework', 'methodology'
        ]
        
        for indicator in tl_indicators:
            if indicator in content_lower:
                score += 6
        
        # Authority markers
        authority_markers = ['research shows', 'data reveals', 'analysis indicates', 'study found']
        for marker in authority_markers:
            if marker in content_lower:
                score += 10
        
        return min(score, 100)

    # Utility methods

    def _extract_key_topics(self, content: str) -> List[str]:
        """Extract key topics from content for hashtag generation."""
        # Simple keyword extraction
        words = re.findall(r'\b[A-Za-z]{4,}\b', content.lower())
        
        # Professional topics
        professional_topics = [
            'strategy', 'leadership', 'innovation', 'transformation', 'analytics',
            'customer', 'experience', 'business', 'technology', 'digital'
        ]
        
        found_topics = [topic for topic in professional_topics if topic in words]
        return found_topics[:3]  # Return top 3

    def _generate_primary_hashtags(self, topics: List[str], industry: str) -> List[str]:
        """Generate primary hashtags based on content topics."""
        hashtags = []
        
        # Convert topics to hashtags
        for topic in topics:
            hashtag = topic.title().replace(' ', '')
            hashtags.append(hashtag)
        
        # Add industry-specific primary hashtag
        if industry != "general":
            industry_tags = {
                "technology": "TechLeadership",
                "consulting": "BusinessStrategy", 
                "healthcare": "HealthcareInnovation"
            }
            if industry in industry_tags:
                hashtags.append(industry_tags[industry])
        
        return hashtags[:2]  # Return top 2

    def _generate_secondary_hashtags(self, content: str, industry: str) -> List[str]:
        """Generate secondary hashtags for broader reach."""
        secondary = ["ProfessionalDevelopment", "BusinessInsights", "ThoughtLeadership"]
        
        # Industry-specific secondary hashtags
        if industry == "technology":
            secondary.extend(["DigitalTransformation", "Innovation"])
        elif industry == "consulting":
            secondary.extend(["Strategy", "BusinessGrowth"])
        
        return secondary[:2]

    def _get_industry_hashtags(self, industry: str) -> List[str]:
        """Get industry-specific hashtags."""
        industry_hashtags = {
            "technology": ["TechTrends", "DigitalInnovation", "TechStrategy"],
            "consulting": ["Consulting", "BusinessTransformation", "StrategyConsulting"],
            "healthcare": ["Healthcare", "HealthTech", "PatientExperience"]
        }
        
        return industry_hashtags.get(industry, [])

    def _get_trending_professional_hashtags(self) -> List[str]:
        """Get currently trending professional hashtags."""
        # These would be dynamically updated in a real system
        return ["FutureOfWork", "Leadership2025", "BusinessInnovation", "ProfessionalGrowth"]

    def _generate_niche_hashtags(self, content: str) -> List[str]:
        """Generate niche hashtags for authority building."""
        content_lower = content.lower()
        
        niche_mapping = {
            "customer experience": ["CXStrategy", "CustomerSuccess", "ExperienceDesign"],
            "data": ["DataDriven", "Analytics", "BusinessIntelligence"],
            "leadership": ["LeadershipDevelopment", "ExecutiveInsights", "TeamLeadership"]
        }
        
        for topic, hashtags in niche_mapping.items():
            if topic in content_lower:
                return hashtags[:1]
        
        return []

    def _get_industry_timing_adjustments(self, industry: str) -> Dict[str, str]:
        """Get industry-specific timing adjustments."""
        adjustments = {
            "technology": "Post earlier (8-9 AM) to catch global tech community",
            "healthcare": "Post during lunch hours (12-1 PM) when professionals check LinkedIn",
            "consulting": "Post Tuesday-Thursday for maximum B2B engagement"
        }
        
        return {"recommendation": adjustments.get(industry, "Follow general best practices")}

    def _get_seasonal_timing_factors(self) -> Dict[str, str]:
        """Get seasonal timing considerations."""
        current_month = datetime.now().month
        
        if current_month in [1, 2]:
            return {"factor": "Q1 planning season - strategy content performs well"}
        elif current_month in [9, 10]:
            return {"factor": "Q4 planning season - budget and strategy content peaks"}
        else:
            return {"factor": "Standard seasonal patterns apply"}

    def _get_audience_activity_insights(self, target_audience: str) -> Dict[str, str]:
        """Get audience activity insights."""
        insights = {
            "executive": "Most active early morning (7-9 AM) and evening (6-8 PM)",
            "technical": "Most active mid-morning (10 AM-12 PM) and afternoon (2-4 PM)",
            "general": "Peak activity Tuesday-Thursday, 9 AM-12 PM"
        }
        
        return {"insight": insights.get(target_audience, insights["general"])}

    def _generate_comment_starters(self, content: str, target_audience: str) -> List[str]:
        """Generate comment starters for engagement."""
        generic_starters = [
            "I'd love to hear your perspective on this...",
            "How has this played out in your experience?",
            "What's been your approach to this challenge?"
        ]
        
        audience_specific = {
            "executive": [
                "From a strategic standpoint, how do you see this evolving?",
                "What's been the ROI impact in your organization?",
                "How are you positioning your team for this shift?"
            ],
            "technical": [
                "What tools or methodologies have you found most effective?",
                "How are you implementing this in your current projects?",
                "What technical challenges have you encountered?"
            ]
        }
        
        return audience_specific.get(target_audience, generic_starters)

    def _add_strategic_line_breaks(self, content: str) -> str:
        """Add strategic line breaks for mobile optimization."""
        # Add line breaks before key transition words
        transition_words = ['However', 'Therefore', 'Additionally', 'Moreover', 'Furthermore']
        
        for word in transition_words:
            content = content.replace(f' {word}', f'\n\n{word}')
        
        return content


# Factory function
def create_optimization_engine() -> LinkedInOptimizationEngine:
    """Factory function to create an optimization engine."""
    return LinkedInOptimizationEngine()