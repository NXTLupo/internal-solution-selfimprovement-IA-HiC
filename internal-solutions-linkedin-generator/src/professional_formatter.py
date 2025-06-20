"""
Professional Content Formatter for Marketing Content Generator
Creates beautifully formatted, rich marketing content with professional layout and typography.
"""

import json
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ContentFormat(Enum):
    """Available content formatting styles."""
    EXECUTIVE = "executive"
    SOCIAL_MEDIA = "social_media"
    CAMPAIGN = "campaign"
    PROFESSIONAL = "professional"
    TECHNICAL = "technical"
    BLOG_POST = "blog_post"
    WHITEPAPER = "whitepaper"

class ExportFormat(Enum):
    """Available export formats."""
    HTML = "html"
    MARKDOWN = "markdown"
    PLAIN_TEXT = "plain_text"
    JSON = "json"

@dataclass
class FormattedContent:
    """Container for formatted content with metadata."""
    title: str
    content: str
    format_type: str  # ContentFormat enum value as string
    export_format: str  # ExportFormat enum value as string
    metadata: Dict[str, Any]
    timestamp: str

@dataclass
class ContentSuite:
    """Complete content suite with multiple formats and types."""
    executive_summary: FormattedContent
    social_media_content: List[FormattedContent]
    professional_content: List[FormattedContent]
    campaign_content: List[FormattedContent]
    marketing_strategy: FormattedContent
    blog_post: FormattedContent
    whitepaper: FormattedContent
    metadata: Dict[str, Any]

class ProfessionalFormatter:
    """
    Professional content formatter that creates beautifully laid out marketing content.
    Transforms raw marketing data into compelling, well-structured content.
    """
    
    def __init__(self):
        self.style_templates = self._initialize_style_templates()
        self.content_templates = self._initialize_content_templates()
    
    def format_marketing_suite(self, marketing_data: Any, style: ContentFormat = ContentFormat.EXECUTIVE) -> ContentSuite:
        """
        Format complete marketing content suite from extracted data.
        
        Args:
            marketing_data: MarketingData object from universal parser
            style: Overall styling approach
            
        Returns:
            ContentSuite with all formatted content types
        """
        try:
            # Create executive summary
            executive_summary = self._format_executive_summary(marketing_data, style)
            
            # Create social media content
            social_media_content = self._format_social_media_content(marketing_data)
            
            # Create professional content
            professional_content = self._format_professional_content(marketing_data)
            
            # Create campaign content
            campaign_content = self._format_campaign_content(marketing_data)
            
            # Create marketing strategy
            marketing_strategy = self._format_marketing_strategy(marketing_data)
            
            # Create suite metadata
            suite_metadata = {
                "generated_at": datetime.now().isoformat(),
                "source_title": marketing_data.title,
                "content_count": len(social_media_content) + len(professional_content) + len(campaign_content),
                "style": style.value,
                "document_type": marketing_data.document_metadata.get("document_type", "general")
            }
            
            return ContentSuite(
                executive_summary=executive_summary,
                social_media_content=social_media_content,
                professional_content=professional_content,
                campaign_content=campaign_content,
                marketing_strategy=marketing_strategy,
                metadata=suite_metadata
            )
            
        except Exception as e:
            logger.error(f"Error formatting marketing suite: {str(e)}")
            raise
    
    def _format_executive_summary(self, marketing_data: Any, style: ContentFormat) -> FormattedContent:
        """Format executive summary with key insights and positioning."""
        
        # Extract key information
        title = marketing_data.title
        summary_text = marketing_data.executive_summary
        key_messages = [msg.text for msg in marketing_data.key_messages[:5]]
        value_props = [vp.text for vp in marketing_data.value_propositions[:3]]
        target_audience = marketing_data.target_audience_indicators[:5]
        
        # Create formatted content
        content_sections = []
        
        # Header
        content_sections.append(self._create_section_header("📋 EXECUTIVE SUMMARY", "primary"))
        
        # Key message distillation
        content_sections.append(self._create_subsection(
            "🎯 Key Message Distillation",
            self._format_list_content(key_messages, "key_message")
        ))
        
        # Value propositions
        if value_props:
            content_sections.append(self._create_subsection(
                "💎 Core Value Propositions",
                self._format_list_content(value_props, "value_prop")
            ))
        
        # Target audience analysis
        if target_audience:
            content_sections.append(self._create_subsection(
                "🎪 Target Audience Analysis",
                f"Primary audience indicators: {', '.join(target_audience)}"
            ))
        
        # Content positioning strategy
        positioning = self._analyze_content_positioning(marketing_data)
        content_sections.append(self._create_subsection(
            "🚀 Content Positioning Strategy",
            positioning
        ))
        
        formatted_content = self._join_sections(content_sections)
        
        return FormattedContent(
            title="Executive Summary",
            content=formatted_content,
            format_type=style.value,
            export_format=ExportFormat.HTML.value,
            metadata={
                "section_count": len(content_sections),
                "key_messages_count": len(key_messages),
                "value_props_count": len(value_props)
            },
            timestamp=datetime.now().isoformat()
        )
    
    def _format_social_media_content(self, marketing_data: Any) -> List[FormattedContent]:
        """Format social media content for different platforms."""
        content_list = []
        
        # LinkedIn Executive Post
        linkedin_content = self._create_linkedin_executive_post(marketing_data)
        content_list.append(FormattedContent(
            title="LinkedIn Executive Post",
            content=linkedin_content,
            format_type=ContentFormat.SOCIAL_MEDIA.value,
            export_format=ExportFormat.PLAIN_TEXT.value,
            metadata={"platform": "linkedin", "character_count": len(linkedin_content)},
            timestamp=datetime.now().isoformat()
        ))
        
        # Twitter Thread
        twitter_thread = self._create_twitter_thread(marketing_data)
        content_list.append(FormattedContent(
            title="Twitter Thread (5-7 tweets)",
            content=twitter_thread,
            format_type=ContentFormat.SOCIAL_MEDIA.value,
            export_format=ExportFormat.PLAIN_TEXT.value,
            metadata={"platform": "twitter", "tweet_count": twitter_thread.count("🧵")},
            timestamp=datetime.now().isoformat()
        ))
        
        # Instagram Caption
        instagram_content = self._create_instagram_caption(marketing_data)
        content_list.append(FormattedContent(
            title="Instagram Caption with Hashtags",
            content=instagram_content,
            format_type=ContentFormat.SOCIAL_MEDIA.value,
            export_format=ExportFormat.PLAIN_TEXT.value,
            metadata={"platform": "instagram", "hashtag_count": instagram_content.count("#")},
            timestamp=datetime.now().isoformat()
        ))
        
        # Facebook Engagement Post
        facebook_content = self._create_facebook_engagement_post(marketing_data)
        content_list.append(FormattedContent(
            title="Facebook Engagement Post",
            content=facebook_content,
            format_type=ContentFormat.SOCIAL_MEDIA.value,
            export_format=ExportFormat.PLAIN_TEXT.value,
            metadata={"platform": "facebook", "character_count": len(facebook_content)},
            timestamp=datetime.now().isoformat()
        ))
        
        return content_list
    
    def _format_professional_content(self, marketing_data: Any) -> List[FormattedContent]:
        """Format professional business content."""
        content_list = []
        
        # Email Newsletter Section
        newsletter_content = self._create_newsletter_section(marketing_data)
        content_list.append(FormattedContent(
            title="Email Newsletter Section",
            content=newsletter_content,
            format_type=ContentFormat.PROFESSIONAL.value,
            export_format=ExportFormat.HTML.value,
            metadata={"content_type": "newsletter", "word_count": len(newsletter_content.split())},
            timestamp=datetime.now().isoformat()
        ))
        
        # Blog Post Introduction
        blog_intro = self._create_blog_introduction(marketing_data)
        content_list.append(FormattedContent(
            title="Blog Post Introduction",
            content=blog_intro,
            format_type=ContentFormat.PROFESSIONAL.value,
            export_format=ExportFormat.MARKDOWN.value,
            metadata={"content_type": "blog", "word_count": len(blog_intro.split())},
            timestamp=datetime.now().isoformat()
        ))
        
        # Press Release Draft
        press_release = self._create_press_release_draft(marketing_data)
        content_list.append(FormattedContent(
            title="Press Release Draft",
            content=press_release,
            format_type=ContentFormat.PROFESSIONAL.value,
            export_format=ExportFormat.PLAIN_TEXT.value,
            metadata={"content_type": "press_release", "word_count": len(press_release.split())},
            timestamp=datetime.now().isoformat()
        ))
        
        # Website Copy Block
        website_copy = self._create_website_copy_block(marketing_data)
        content_list.append(FormattedContent(
            title="Website Copy Block",
            content=website_copy,
            format_type=ContentFormat.PROFESSIONAL.value,
            export_format=ExportFormat.HTML.value,
            metadata={"content_type": "website_copy", "word_count": len(website_copy.split())},
            timestamp=datetime.now().isoformat()
        ))
        
        return content_list
    
    def _format_campaign_content(self, marketing_data: Any) -> List[FormattedContent]:
        """Format campaign-specific content."""
        content_list = []
        
        # Ad Copy Variations
        ad_copy = self._create_ad_copy_variations(marketing_data)
        content_list.append(FormattedContent(
            title="Ad Copy Variations (3)",
            content=ad_copy,
            format_type=ContentFormat.CAMPAIGN.value,
            export_format=ExportFormat.PLAIN_TEXT.value,
            metadata={"content_type": "ad_copy", "variations": 3},
            timestamp=datetime.now().isoformat()
        ))
        
        # Taglines & Slogans
        taglines = self._create_taglines_slogans(marketing_data)
        content_list.append(FormattedContent(
            title="Taglines & Slogans (5)",
            content=taglines,
            format_type=ContentFormat.CAMPAIGN.value,
            export_format=ExportFormat.PLAIN_TEXT.value,
            metadata={"content_type": "taglines", "count": 5},
            timestamp=datetime.now().isoformat()
        ))
        
        # Call-to-Action Phrases
        cta_phrases = self._create_cta_phrases(marketing_data)
        content_list.append(FormattedContent(
            title="Call-to-Action Phrases (10)",
            content=cta_phrases,
            format_type=ContentFormat.CAMPAIGN.value,
            export_format=ExportFormat.PLAIN_TEXT.value,
            metadata={"content_type": "cta_phrases", "count": 10},
            timestamp=datetime.now().isoformat()
        ))
        
        # Value Propositions
        value_props = self._create_value_proposition_statements(marketing_data)
        content_list.append(FormattedContent(
            title="Value Propositions (3)",
            content=value_props,
            format_type=ContentFormat.CAMPAIGN.value,
            export_format=ExportFormat.PLAIN_TEXT.value,
            metadata={"content_type": "value_propositions", "count": 3},
            timestamp=datetime.now().isoformat()
        ))
        
        return content_list
    
    def _format_marketing_strategy(self, marketing_data: Any) -> FormattedContent:
        """Format comprehensive marketing strategy recommendations."""
        
        content_sections = []
        
        # Header
        content_sections.append(self._create_section_header("🎯 MARKETING STRATEGY", "strategy"))
        
        # Content distribution plan
        distribution_plan = self._create_distribution_plan(marketing_data)
        content_sections.append(self._create_subsection(
            "📅 Content Distribution Plan",
            distribution_plan
        ))
        
        # Audience engagement tactics
        engagement_tactics = self._create_engagement_tactics(marketing_data)
        content_sections.append(self._create_subsection(
            "🎭 Audience Engagement Tactics",
            engagement_tactics
        ))
        
        # Performance optimization tips
        optimization_tips = self._create_optimization_tips(marketing_data)
        content_sections.append(self._create_subsection(
            "⚡ Performance Optimization Tips",
            optimization_tips
        ))
        
        # Follow-up content ideas
        followup_ideas = self._create_followup_content_ideas(marketing_data)
        content_sections.append(self._create_subsection(
            "🚀 Follow-up Content Ideas",
            followup_ideas
        ))
        
        formatted_content = self._join_sections(content_sections)
        
        return FormattedContent(
            title="Marketing Strategy",
            content=formatted_content,
            format_type=ContentFormat.EXECUTIVE.value,
            export_format=ExportFormat.HTML.value,
            metadata={
                "section_count": len(content_sections),
                "strategy_type": "comprehensive"
            },
            timestamp=datetime.now().isoformat()
        )
    
    # Content Creation Methods
    
    def _create_linkedin_executive_post(self, marketing_data: Any) -> str:
        """Create a LinkedIn executive-style post."""
        key_message = marketing_data.key_messages[0].text if marketing_data.key_messages else marketing_data.title
        value_prop = marketing_data.value_propositions[0].text if marketing_data.value_propositions else ""
        
        post = f"""🚀 {key_message}

{marketing_data.executive_summary[:200]}...

{value_prop}

What are your thoughts on this approach? Share your experiences in the comments.

#Leadership #Innovation #Business #Strategy #Growth"""
        
        return post
    
    def _create_twitter_thread(self, marketing_data: Any) -> str:
        """Create a Twitter thread."""
        thread_parts = []
        
        # Opening tweet
        opening = f"🧵 Thread: {marketing_data.title[:100]}..."
        thread_parts.append(f"1/ {opening}")
        
        # Key insights
        for i, message in enumerate(marketing_data.key_messages[:5], 2):
            tweet = f"{i}/ {message.text[:240]}"
            thread_parts.append(tweet)
        
        # Closing tweet
        closing = f"{len(thread_parts)+1}/ That's the thread! What's your take? Retweet if you found this valuable. 🚀"
        thread_parts.append(closing)
        
        return "\n\n".join(thread_parts)
    
    def _create_instagram_caption(self, marketing_data: Any) -> str:
        """Create an Instagram caption with hashtags."""
        caption = f"""{marketing_data.executive_summary[:300]}

✨ Key takeaways:
{chr(10).join([f"• {msg.text[:100]}" for msg in marketing_data.key_messages[:3]])}

#business #innovation #strategy #leadership #growth #success #entrepreneur #marketing #digitalmarketing #businesstips"""
        
        return caption
    
    def _create_facebook_engagement_post(self, marketing_data: Any) -> str:
        """Create a Facebook engagement post."""
        post = f"""{marketing_data.executive_summary}

What do you think about this? Have you experienced something similar?

👍 Like if you agree
💬 Comment with your thoughts
🔄 Share if others should see this

#Business #Innovation #Community"""
        
        return post
    
    def _create_newsletter_section(self, marketing_data: Any) -> str:
        """Create an email newsletter section."""
        section = f"""<div class="newsletter-section">
    <h2>{marketing_data.title}</h2>
    <p class="lead">{marketing_data.executive_summary}</p>
    
    <h3>Key Highlights:</h3>
    <ul>
        {chr(10).join([f"<li>{msg.text}</li>" for msg in marketing_data.key_messages[:5]])}
    </ul>
    
    <div class="cta-section">
        <a href="#" class="btn btn-primary">Learn More</a>
    </div>
</div>"""
        
        return section
    
    def _create_blog_introduction(self, marketing_data: Any) -> str:
        """Create a blog post introduction."""
        intro = f"""# {marketing_data.title}

{marketing_data.executive_summary}

## What You'll Learn

{chr(10).join([f"- {msg.text}" for msg in marketing_data.key_messages[:5]])}

Let's dive in...
"""
        
        return intro
    
    def _create_press_release_draft(self, marketing_data: Any) -> str:
        """Create a press release draft."""
        release = f"""FOR IMMEDIATE RELEASE

{marketing_data.title}

{marketing_data.executive_summary}

Key highlights include:
{chr(10).join([f"• {msg.text}" for msg in marketing_data.key_messages[:5]])}

For more information, contact [Company Name] at [Contact Information].

###"""
        
        return release
    
    def _create_website_copy_block(self, marketing_data: Any) -> str:
        """Create website copy block."""
        benefits_html = chr(10).join([f'<div class="benefit-item">{msg.text}</div>' for msg in marketing_data.key_messages[:3]])
        
        copy = f"""<section class="hero-section">
    <h1>{marketing_data.title}</h1>
    <p class="hero-subtitle">{marketing_data.executive_summary}</p>
    
    <div class="benefits">
        {benefits_html}
    </div>
    
    <div class="cta">
        <button class="btn-primary">Get Started Today</button>
    </div>
</section>"""
        
        return copy
    
    def _create_ad_copy_variations(self, marketing_data: Any) -> str:
        """Create ad copy variations."""
        key_message = marketing_data.key_messages[0].text if marketing_data.key_messages else marketing_data.title
        
        variations = [
            f"🚀 {key_message} - Transform your business today!",
            f"💡 Discover: {key_message} - Limited time offer!",
            f"⚡ {key_message} - Join thousands of satisfied customers!"
        ]
        
        return "\n\n".join([f"Variation {i+1}:\n{var}" for i, var in enumerate(variations)])
    
    def _create_taglines_slogans(self, marketing_data: Any) -> str:
        """Create taglines and slogans."""
        base_concepts = [concept.text[:50] for concept in marketing_data.value_propositions[:5]]
        
        taglines = [
            f"Where {base_concepts[0] if base_concepts else 'Innovation'} Meets Excellence",
            f"Your Partner in {base_concepts[1] if len(base_concepts) > 1 else 'Success'}",
            f"Transforming {base_concepts[2] if len(base_concepts) > 2 else 'Business'} Together",
            f"The Future of {base_concepts[3] if len(base_concepts) > 3 else 'Technology'} is Here",
            f"Empowering {base_concepts[4] if len(base_concepts) > 4 else 'Growth'} Through Innovation"
        ]
        
        return "\n".join([f"{i+1}. {tagline}" for i, tagline in enumerate(taglines)])
    
    def _create_cta_phrases(self, marketing_data: Any) -> str:
        """Create call-to-action phrases."""
        cta_phrases = [
            "Get Started Today",
            "Discover the Difference",
            "Transform Your Business Now",
            "Join the Revolution",
            "Unlock Your Potential",
            "Experience the Power",
            "Start Your Journey",
            "Take Action Today",
            "See Results Fast",
            "Make the Change"
        ]
        
        return "\n".join([f"{i+1}. {phrase}" for i, phrase in enumerate(cta_phrases)])
    
    def _create_value_proposition_statements(self, marketing_data: Any) -> str:
        """Create value proposition statements."""
        value_props = marketing_data.value_propositions[:3]
        
        statements = []
        for i, vp in enumerate(value_props, 1):
            statements.append(f"{i}. {vp.text}")
        
        # Add generic ones if we don't have enough
        while len(statements) < 3:
            statements.append(f"{len(statements)+1}. Delivering exceptional value through innovation and excellence.")
        
        return "\n\n".join(statements)
    
    # Strategy Methods
    
    def _analyze_content_positioning(self, marketing_data: Any) -> str:
        """Analyze content positioning strategy."""
        positioning_elements = []
        
        if marketing_data.competitive_advantages:
            positioning_elements.append("Competitive differentiation through unique advantages")
        
        if marketing_data.value_propositions:
            positioning_elements.append("Value-driven messaging focused on customer benefits")
        
        if marketing_data.target_audience_indicators:
            positioning_elements.append(f"Targeted approach for {', '.join(marketing_data.target_audience_indicators[:3])}")
        
        if not positioning_elements:
            positioning_elements.append("Professional messaging with broad market appeal")
        
        return " • ".join(positioning_elements)
    
    def _create_distribution_plan(self, marketing_data: Any) -> str:
        """Create content distribution plan."""
        plan = """📱 **Social Media**: LinkedIn (professional network), Twitter (thought leadership), Instagram (visual engagement)

📧 **Email Marketing**: Newsletter sections, drip campaigns, executive communications  

🌐 **Website**: Blog posts, landing pages, resource centers

📰 **PR & Media**: Press releases, industry publications, speaking opportunities

🤝 **Partnerships**: Collaborative content, co-marketing initiatives"""
        
        return plan
    
    def _create_engagement_tactics(self, marketing_data: Any) -> str:
        """Create audience engagement tactics."""
        tactics = """💬 **Interactive Content**: Polls, Q&A sessions, live discussions

📊 **Data-Driven Insights**: Share relevant statistics and research findings

🎯 **Personalization**: Tailor messaging to specific audience segments

🔄 **Community Building**: Foster discussions and encourage user-generated content

⚡ **Timely Responses**: Engage promptly with comments and questions"""
        
        return tactics
    
    def _create_optimization_tips(self, marketing_data: Any) -> str:
        """Create performance optimization tips."""
        tips = """📈 **A/B Testing**: Test different headlines, CTAs, and messaging approaches

⏰ **Timing Optimization**: Post when your audience is most active

🎨 **Visual Enhancement**: Use compelling images and professional design

📱 **Mobile Optimization**: Ensure all content works perfectly on mobile devices

📊 **Analytics Tracking**: Monitor performance and adjust strategy based on data"""
        
        return tips
    
    def _create_followup_content_ideas(self, marketing_data: Any) -> str:
        """Create follow-up content ideas."""
        ideas = """🔍 **Deep Dive Series**: Expand on key topics with detailed analysis

📋 **Case Studies**: Develop real-world examples and success stories

🎥 **Video Content**: Create visual explanations and presentations

📚 **Resource Guides**: Comprehensive guides and how-to content

🗣️ **Expert Interviews**: Feature industry leaders and thought partners"""
        
        return ideas
    
    # Utility Methods
    
    def _create_section_header(self, title: str, style: str = "default") -> str:
        """Create a formatted section header."""
        return f"""<div class="section-header {style}">
    <h2>{title}</h2>
    <div class="header-divider"></div>
</div>"""
    
    def _create_subsection(self, title: str, content: str) -> str:
        """Create a formatted subsection."""
        return f"""<div class="subsection">
    <h3>{title}</h3>
    <div class="subsection-content">
        {content}
    </div>
</div>"""
    
    def _format_list_content(self, items: List[str], list_type: str = "default") -> str:
        """Format a list of items."""
        if not items:
            return "<p>No items available</p>"
        
        formatted_items = [f'<li class="{list_type}-item">{item}</li>' for item in items]
        formatted_list = chr(10).join(formatted_items)
        return f'<ul class="{list_type}-list">{formatted_list}</ul>'
    
    def _join_sections(self, sections: List[str]) -> str:
        """Join sections with proper spacing."""
        return '<div class="content-container">' + "".join(sections) + '</div>'
    
    def _initialize_style_templates(self) -> Dict[str, Dict[str, str]]:
        """Initialize style templates for different content types."""
        return {
            "executive": {
                "primary_color": "#01C4C8",
                "accent_color": "#00BFFF",
                "text_color": "#ffffff",
                "background": "linear-gradient(135deg, #121B26 0%, #1E2832 50%, #2A3441 100%)"
            },
            "social_media": {
                "primary_color": "#1DA1F2",
                "accent_color": "#14171A",
                "text_color": "#14171A",
                "background": "#ffffff"
            },
            "campaign": {
                "primary_color": "#FF6B35",
                "accent_color": "#004E89",
                "text_color": "#004E89",
                "background": "#F7F7F7"
            }
        }
    
    def _initialize_content_templates(self) -> Dict[str, str]:
        """Initialize content templates."""
        return {
            "section_wrapper": "<section class=\"content-section {class}\">{content}</section>",
            "header": "<h2 class=\"section-title\">{title}</h2>",
            "subheader": "<h3 class=\"subsection-title\">{title}</h3>",
            "paragraph": "<p class=\"content-paragraph\">{content}</p>",
            "list": "<ul class=\"content-list\">{items}</ul>",
            "list_item": "<li class=\"content-item\">{content}</li>"
        }

def create_professional_formatter() -> ProfessionalFormatter:
    """Factory function to create a professional formatter."""
    return ProfessionalFormatter()