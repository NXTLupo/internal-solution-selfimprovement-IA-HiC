"""
Universal HTML Content Parser for Marketing Content Generation
Extracts comprehensive data from any HTML document for compelling marketing content creation.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from bs4 import BeautifulSoup, Tag, NavigableString
import json
from dataclasses import dataclass, asdict
from enum import Enum
import nltk
from textstat import flesch_reading_ease
import spacy

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Download required NLTK data if not present
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# Load spaCy model for advanced text processing
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy English model not found. Some features may be limited.")
    nlp = None

@dataclass
class ContentElement:
    """Represents a piece of extracted content with metadata."""
    text: str
    element_type: str
    confidence: float
    context: str
    position: int
    importance: float

@dataclass
class MarketingData:
    """Structured marketing data extracted from HTML content."""
    title: str
    executive_summary: str
    key_messages: List[ContentElement]
    supporting_evidence: List[ContentElement]
    quotes_testimonials: List[ContentElement]
    call_to_actions: List[ContentElement]
    value_propositions: List[ContentElement]
    target_audience_indicators: List[str]
    competitive_advantages: List[ContentElement]
    pain_points_addressed: List[ContentElement]
    benefits_outcomes: List[ContentElement]
    data_points: List[ContentElement]
    social_proof: List[ContentElement]
    urgency_indicators: List[ContentElement]
    emotional_triggers: List[ContentElement]
    document_metadata: Dict[str, Any]

class DocumentType(Enum):
    """Types of documents the parser can handle."""
    ARTICLE = "article"
    REPORT = "report"
    PRESENTATION = "presentation"
    CASE_STUDY = "case_study"
    WHITEPAPER = "whitepaper"
    BLOG_POST = "blog_post"
    PRESS_RELEASE = "press_release"
    PRODUCT_PAGE = "product_page"
    LANDING_PAGE = "landing_page"
    GENERAL = "general"

class UniversalContentParser:
    """
    Universal HTML content parser for marketing content generation.
    Extracts key marketing elements from any type of HTML document.
    """
    
    def __init__(self):
        self.marketing_keywords = {
            'value_propositions': [
                'benefit', 'advantage', 'unique', 'exclusive', 'superior', 'best-in-class',
                'industry-leading', 'revolutionary', 'innovative', 'breakthrough', 'cutting-edge',
                'state-of-the-art', 'award-winning', 'proven', 'trusted', 'reliable'
            ],
            'pain_points': [
                'problem', 'challenge', 'issue', 'difficulty', 'struggle', 'frustration',
                'bottleneck', 'obstacle', 'barrier', 'limitation', 'constraint', 'pain point',
                'inefficiency', 'waste', 'loss', 'risk', 'threat', 'concern'
            ],
            'benefits': [
                'improve', 'increase', 'enhance', 'optimize', 'maximize', 'boost',
                'accelerate', 'streamline', 'simplify', 'reduce', 'minimize', 'eliminate',
                'save', 'gain', 'achieve', 'deliver', 'generate', 'create'
            ],
            'urgency': [
                'now', 'today', 'immediately', 'urgent', 'limited time', 'deadline',
                'expires', 'hurry', 'fast', 'quick', 'instant', 'rapid', 'soon'
            ],
            'social_proof': [
                'testimonial', 'review', 'case study', 'success story', 'client',
                'customer', 'user', 'feedback', 'rating', 'award', 'certification',
                'recognition', 'endorsement', 'recommendation'
            ],
            'call_to_actions': [
                'click', 'download', 'subscribe', 'register', 'sign up', 'join',
                'buy', 'purchase', 'order', 'get started', 'learn more', 'contact',
                'schedule', 'book', 'try', 'start', 'begin', 'discover'
            ],
            'competitive': [
                'vs', 'versus', 'compared to', 'better than', 'unlike', 'alternative',
                'replacement', 'substitute', 'competition', 'competitor', 'market leader',
                'first', 'only', 'exclusive', 'patented'
            ],
            'emotional_triggers': [
                'amazing', 'incredible', 'fantastic', 'outstanding', 'exceptional',
                'remarkable', 'impressive', 'stunning', 'powerful', 'effective',
                'successful', 'profitable', 'valuable', 'essential', 'critical'
            ]
        }
        
        self.audience_indicators = [
            'ceo', 'executive', 'manager', 'director', 'leader', 'professional',
            'business', 'enterprise', 'company', 'organization', 'team', 'department',
            'startup', 'small business', 'corporation', 'industry', 'sector'
        ]
    
    def parse_html_content(self, html_path: str) -> MarketingData:
        """
        Parse HTML content and extract comprehensive marketing data.
        
        Args:
            html_path: Path to the HTML file
            
        Returns:
            MarketingData object with extracted content
        """
        try:
            with open(html_path, 'r', encoding='utf-8') as file:
                html_content = file.read()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Detect document type
            doc_type = self._detect_document_type(soup)
            
            # Extract title and create executive summary
            title = self._extract_title(soup)
            executive_summary = self._create_executive_summary(soup)
            
            # Extract key content elements
            key_messages = self._extract_key_messages(soup)
            supporting_evidence = self._extract_supporting_evidence(soup)
            quotes_testimonials = self._extract_quotes_testimonials(soup)
            call_to_actions = self._extract_call_to_actions(soup)
            value_propositions = self._extract_value_propositions(soup)
            competitive_advantages = self._extract_competitive_advantages(soup)
            pain_points_addressed = self._extract_pain_points(soup)
            benefits_outcomes = self._extract_benefits_outcomes(soup)
            data_points = self._extract_data_points(soup)
            social_proof = self._extract_social_proof(soup)
            urgency_indicators = self._extract_urgency_indicators(soup)
            emotional_triggers = self._extract_emotional_triggers(soup)
            
            # Analyze target audience
            target_audience_indicators = self._analyze_target_audience(soup)
            
            # Create metadata
            document_metadata = self._create_metadata(soup, doc_type, html_content)
            
            return MarketingData(
                title=title,
                executive_summary=executive_summary,
                key_messages=key_messages,
                supporting_evidence=supporting_evidence,
                quotes_testimonials=quotes_testimonials,
                call_to_actions=call_to_actions,
                value_propositions=value_propositions,
                target_audience_indicators=target_audience_indicators,
                competitive_advantages=competitive_advantages,
                pain_points_addressed=pain_points_addressed,
                benefits_outcomes=benefits_outcomes,
                data_points=data_points,
                social_proof=social_proof,
                urgency_indicators=urgency_indicators,
                emotional_triggers=emotional_triggers,
                document_metadata=document_metadata
            )
            
        except Exception as e:
            logger.error(f"Error parsing HTML content: {str(e)}")
            raise
    
    def _detect_document_type(self, soup: BeautifulSoup) -> DocumentType:
        """Detect the type of document based on content and structure."""
        text_content = soup.get_text().lower()
        
        # Check for specific document type indicators
        if any(word in text_content for word in ['case study', 'success story', 'client story']):
            return DocumentType.CASE_STUDY
        elif any(word in text_content for word in ['whitepaper', 'research', 'analysis', 'study']):
            return DocumentType.WHITEPAPER
        elif any(word in text_content for word in ['press release', 'announcement', 'news']):
            return DocumentType.PRESS_RELEASE
        elif soup.find('article') or 'blog' in text_content:
            return DocumentType.BLOG_POST
        elif any(word in text_content for word in ['product', 'solution', 'service', 'pricing']):
            return DocumentType.PRODUCT_PAGE
        elif soup.find('section', class_=re.compile(r'hero|landing|cta')):
            return DocumentType.LANDING_PAGE
        else:
            return DocumentType.GENERAL
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract the main title of the document."""
        # Try multiple title sources
        title_sources = [
            soup.find('title'),
            soup.find('h1'),
            soup.find('meta', {'property': 'og:title'}),
            soup.find('meta', {'name': 'title'})
        ]
        
        for source in title_sources:
            if source:
                if source.name == 'meta':
                    title = source.get('content', '')
                else:
                    title = source.get_text().strip()
                
                if title and len(title) > 3:
                    return title[:200]  # Limit title length
        
        return "Marketing Content"
    
    def _create_executive_summary(self, soup: BeautifulSoup) -> str:
        """Create an executive summary from the document content."""
        # Look for existing summary elements
        summary_selectors = [
            'meta[name="description"]',
            '.summary', '.abstract', '.overview', '.introduction',
            'meta[property="og:description"]'
        ]
        
        for selector in summary_selectors:
            element = soup.select_one(selector)
            if element:
                if element.name == 'meta':
                    summary = element.get('content', '')
                else:
                    summary = element.get_text().strip()
                
                if summary and len(summary) > 20:
                    return summary[:500]
        
        # If no summary found, create one from first paragraphs
        paragraphs = soup.find_all('p')[:3]
        if paragraphs:
            summary_text = ' '.join([p.get_text().strip() for p in paragraphs])
            return summary_text[:500] + "..."
        
        return "Professional content for marketing and business communication."
    
    def _extract_content_by_keywords(self, soup: BeautifulSoup, keywords: List[str], 
                                   element_type: str) -> List[ContentElement]:
        """Extract content elements based on keyword matching."""
        elements = []
        position = 0
        
        # Search in different HTML elements
        searchable_elements = soup.find_all(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'])
        
        for element in searchable_elements:
            text = element.get_text().strip()
            if len(text) < 10:  # Skip very short text
                continue
            
            # Check for keyword matches
            text_lower = text.lower()
            matches = [keyword for keyword in keywords if keyword in text_lower]
            
            if matches:
                # Calculate confidence based on keyword density
                confidence = min(len(matches) / len(keywords), 1.0)
                
                # Calculate importance based on element type and position
                importance = self._calculate_importance(element, position)
                
                # Get context
                context = self._get_element_context(element)
                
                elements.append(ContentElement(
                    text=text[:1000],  # Limit text length
                    element_type=element_type,
                    confidence=confidence,
                    context=context,
                    position=position,
                    importance=importance
                ))
            
            position += 1
        
        # Sort by importance and return top results
        elements.sort(key=lambda x: (x.importance, x.confidence), reverse=True)
        return elements[:10]  # Return top 10
    
    def _extract_key_messages(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract key messages from headers and emphasized text."""
        elements = []
        position = 0
        
        # Extract from headers
        for header in soup.find_all(['h1', 'h2', 'h3', 'h4']):
            text = header.get_text().strip()
            if len(text) > 5:
                importance = 0.9 if header.name in ['h1', 'h2'] else 0.7
                elements.append(ContentElement(
                    text=text,
                    element_type="header",
                    confidence=0.9,
                    context=f"{header.name} header",
                    position=position,
                    importance=importance
                ))
                position += 1
        
        # Extract from emphasized text
        for emphasis in soup.find_all(['strong', 'b', 'em', 'i']):
            text = emphasis.get_text().strip()
            if len(text) > 10:
                elements.append(ContentElement(
                    text=text,
                    element_type="emphasis",
                    confidence=0.7,
                    context="emphasized text",
                    position=position,
                    importance=0.6
                ))
                position += 1
        
        return elements[:15]
    
    def _extract_supporting_evidence(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract supporting evidence and facts."""
        evidence_keywords = [
            'research', 'study', 'data', 'statistics', 'survey', 'report',
            'analysis', 'findings', 'results', 'evidence', 'proof', 'fact'
        ]
        return self._extract_content_by_keywords(soup, evidence_keywords, "evidence")
    
    def _extract_quotes_testimonials(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract quotes and testimonials."""
        elements = []
        position = 0
        
        # Look for quote elements
        quote_selectors = ['blockquote', 'q', '.quote', '.testimonial', '.review']
        
        for selector in quote_selectors:
            for element in soup.select(selector):
                text = element.get_text().strip()
                if len(text) > 15:
                    elements.append(ContentElement(
                        text=text,
                        element_type="quote",
                        confidence=0.9,
                        context=f"quote from {selector}",
                        position=position,
                        importance=0.8
                    ))
                    position += 1
        
        # Look for quoted text patterns
        text_content = soup.get_text()
        quote_patterns = [
            r'"([^"]{20,200})"',
            r"'([^']{20,200})'",
            r'"([^"]{20,200})"'
        ]
        
        for pattern in quote_patterns:
            matches = re.findall(pattern, text_content)
            for match in matches[:5]:  # Limit to 5 quotes per pattern
                elements.append(ContentElement(
                    text=match,
                    element_type="quote_pattern",
                    confidence=0.6,
                    context="quoted text pattern",
                    position=position,
                    importance=0.6
                ))
                position += 1
        
        return elements[:10]
    
    def _extract_call_to_actions(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract call-to-action elements."""
        return self._extract_content_by_keywords(soup, self.marketing_keywords['call_to_actions'], "cta")
    
    def _extract_value_propositions(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract value propositions."""
        return self._extract_content_by_keywords(soup, self.marketing_keywords['value_propositions'], "value_prop")
    
    def _extract_competitive_advantages(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract competitive advantages."""
        return self._extract_content_by_keywords(soup, self.marketing_keywords['competitive'], "competitive")
    
    def _extract_pain_points(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract pain points addressed."""
        return self._extract_content_by_keywords(soup, self.marketing_keywords['pain_points'], "pain_point")
    
    def _extract_benefits_outcomes(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract benefits and outcomes."""
        return self._extract_content_by_keywords(soup, self.marketing_keywords['benefits'], "benefit")
    
    def _extract_data_points(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract numerical data points and statistics."""
        elements = []
        position = 0
        
        text_content = soup.get_text()
        
        # Patterns for different types of data
        data_patterns = [
            (r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?%)', "percentage"),
            (r'(\$\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:[KMB])?)', "currency"),
            (r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|thousand|M|B|K))', "large_number"),
            (r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?x|\d+(?:\.\d+)?\s*times)', "multiplier"),
            (r'(\d+(?:\.\d+)?\s*years?|\d+(?:\.\d+)?\s*months?)', "time_period")
        ]
        
        for pattern, data_type in data_patterns:
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            for match in matches[:10]:  # Limit per type
                # Get surrounding context
                match_index = text_content.find(match)
                start = max(0, match_index - 50)
                end = min(len(text_content), match_index + len(match) + 50)
                context = text_content[start:end].strip()
                
                elements.append(ContentElement(
                    text=match,
                    element_type=data_type,
                    confidence=0.9,
                    context=context,
                    position=position,
                    importance=0.7
                ))
                position += 1
        
        return elements[:15]
    
    def _extract_social_proof(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract social proof elements."""
        return self._extract_content_by_keywords(soup, self.marketing_keywords['social_proof'], "social_proof")
    
    def _extract_urgency_indicators(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract urgency indicators."""
        return self._extract_content_by_keywords(soup, self.marketing_keywords['urgency'], "urgency")
    
    def _extract_emotional_triggers(self, soup: BeautifulSoup) -> List[ContentElement]:
        """Extract emotional trigger words."""
        return self._extract_content_by_keywords(soup, self.marketing_keywords['emotional_triggers'], "emotional")
    
    def _analyze_target_audience(self, soup: BeautifulSoup) -> List[str]:
        """Analyze and identify target audience indicators."""
        text_content = soup.get_text().lower()
        audiences = []
        
        for indicator in self.audience_indicators:
            if indicator in text_content:
                audiences.append(indicator)
        
        return audiences[:10]
    
    def _calculate_importance(self, element: Tag, position: int) -> float:
        """Calculate importance score for an element."""
        importance = 0.5
        
        # Header elements are more important
        if element.name in ['h1', 'h2', 'h3']:
            importance += 0.3
        
        # Earlier elements are more important
        if position < 10:
            importance += 0.2
        elif position < 50:
            importance += 0.1
        
        # Elements with special classes
        if element.get('class'):
            classes = ' '.join(element.get('class')).lower()
            if any(word in classes for word in ['highlight', 'important', 'key', 'main']):
                importance += 0.2
        
        return min(importance, 1.0)
    
    def _get_element_context(self, element: Tag) -> str:
        """Get context information for an element."""
        contexts = []
        
        # Add tag name
        contexts.append(f"tag: {element.name}")
        
        # Add class information
        if element.get('class'):
            contexts.append(f"class: {' '.join(element.get('class'))}")
        
        # Add parent context
        if element.parent and element.parent.name != 'body':
            contexts.append(f"parent: {element.parent.name}")
        
        return ", ".join(contexts)
    
    def _create_metadata(self, soup: BeautifulSoup, doc_type: DocumentType, 
                        html_content: str) -> Dict[str, Any]:
        """Create metadata about the document."""
        text_content = soup.get_text()
        
        return {
            "document_type": doc_type.value,
            "word_count": len(text_content.split()),
            "character_count": len(text_content),
            "readability_score": flesch_reading_ease(text_content) if len(text_content) > 100 else 0,
            "html_size": len(html_content),
            "header_count": {
                "h1": len(soup.find_all('h1')),
                "h2": len(soup.find_all('h2')),
                "h3": len(soup.find_all('h3'))
            },
            "paragraph_count": len(soup.find_all('p')),
            "list_count": len(soup.find_all(['ul', 'ol'])),
            "link_count": len(soup.find_all('a')),
            "image_count": len(soup.find_all('img')),
            "has_forms": len(soup.find_all('form')) > 0,
            "has_tables": len(soup.find_all('table')) > 0
        }

def create_universal_parser() -> UniversalContentParser:
    """Factory function to create a universal content parser."""
    return UniversalContentParser()