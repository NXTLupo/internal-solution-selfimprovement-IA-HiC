"""
HTML Journey Map Parser for LinkedIn Post Generator
Extracts comprehensive data from journey map HTML files without assumptions about journey type.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from bs4 import BeautifulSoup, Tag, NavigableString
import json
from dataclasses import dataclass, asdict, is_dataclass
from enum import Enum
import nltk
from textstat import flesch_reading_ease
import spacy

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

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model not found. Some advanced NLP features may not work.")
    nlp = None

class DataType(Enum):
    PAIN_POINT = "pain_point"
    QUOTE = "quote"
    INSIGHT = "insight"
    RECOMMENDATION = "recommendation"
    EMOTIONAL_MOMENT = "emotional_moment"
    DATA_POINT = "data_point"
    PHASE = "phase"
    TOUCHPOINT = "touchpoint"

@dataclass
class ExtractedElement:
    content: str
    data_type: DataType
    context: str
    emotional_intensity: float = 0.0
    business_impact: str = "unknown"
    frequency: int = 1
    confidence: float = 0.0
    source_section: str = ""
    supporting_data: List[str] = None

    def __post_init__(self):
        if self.supporting_data is None:
            self.supporting_data = []

@dataclass
class JourneyPhase:
    name: str
    description: str
    emotions: List[str]
    pain_points: List[str]
    touchpoints: List[str]
    quotes: List[str]
    insights: List[str]
    emotional_intensity: float = 0.0
    business_impact: str = "unknown"

@dataclass
class ParsedJourneyData:
    title: str
    summary: str
    phases: List[JourneyPhase]
    pain_points: List[ExtractedElement]
    quotes: List[ExtractedElement]
    insights: List[ExtractedElement]
    recommendations: List[ExtractedElement]
    emotional_journey: Dict[str, Any]
    data_points: List[ExtractedElement]
    metadata: Dict[str, Any]
    quality_score: float = 0.0

class JourneyMapHTMLParser:
    """
    Advanced HTML parser for journey map files with comprehensive data extraction.
    Adapts to any journey type without assumptions.
    """
    
    def __init__(self):
        self.emotional_keywords = {
            'frustration': ['frustrated', 'annoying', 'difficult', 'problem', 'issue', 'struggle'],
            'satisfaction': ['satisfied', 'happy', 'pleased', 'good', 'great', 'excellent'],
            'confusion': ['confused', 'unclear', 'uncertain', 'don\'t understand', 'complicated'],
            'delight': ['delighted', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect'],
            'anxiety': ['worried', 'anxious', 'concerned', 'nervous', 'stressed', 'uncertain'],
            'relief': ['relieved', 'better', 'resolved', 'fixed', 'solved', 'cleared']
        }
        
        self.business_impact_indicators = {
            'high': ['critical', 'major', 'significant', 'substantial', 'severe', 'urgent'],
            'medium': ['moderate', 'noticeable', 'important', 'concerning', 'relevant'],
            'low': ['minor', 'small', 'slight', 'minimal', 'insignificant']
        }

    def parse_journey_html_deep(self, file_path: str) -> ParsedJourneyData:
        """
        Main parsing function that extracts comprehensive data from journey map HTML.
        
        Args:
            file_path: Path to the HTML journey map file
            
        Returns:
            ParsedJourneyData with comprehensive extracted information
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                html_content = file.read()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract basic information
            title = self._extract_title(soup)
            summary = self._extract_summary(soup)
            
            # Extract journey phases
            phases = self._extract_journey_phases(soup)
            
            # Extract all data elements
            pain_points = self._extract_pain_points(soup)
            quotes = self._extract_quotes(soup)
            insights = self._extract_insights(soup)
            recommendations = self._extract_recommendations(soup)
            data_points = self._extract_data_points(soup)
            
            # Analyze emotional journey
            emotional_journey = self._analyze_emotional_journey(soup, quotes, phases)
            
            # Extract metadata
            metadata = self._extract_metadata(soup)
            
            # Calculate quality score
            parsed_data = ParsedJourneyData(
                title=title,
                summary=summary,
                phases=phases,
                pain_points=pain_points,
                quotes=quotes,
                insights=insights,
                recommendations=recommendations,
                emotional_journey=emotional_journey,
                data_points=data_points,
                metadata=metadata
            )
            
            parsed_data.quality_score = self._calculate_quality_score(parsed_data)
            
            logger.info(f"Successfully parsed journey map: {title}")
            logger.info(f"Extracted: {len(pain_points)} pain points, {len(quotes)} quotes, {len(insights)} insights")
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"Failed to parse journey map HTML: {str(e)}")
            raise

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract the title of the uploaded document."""
        # Try multiple selectors for title
        title_selectors = ['h1', 'title', '.title', '.journey-title', '.header h1', '.main-title']
        
        for selector in title_selectors:
            element = soup.select_one(selector)
            if element and element.get_text(strip=True):
                return element.get_text(strip=True)
        
        return "Journey Map Analysis"

    def _extract_summary(self, soup: BeautifulSoup) -> str:
        """Extract summary or description of the journey."""
        summary_selectors = [
            '.summary', '.description', '.overview', '.executive-summary',
            'p:first-of-type', '.intro', '.journey-summary'
        ]
        
        for selector in summary_selectors:
            element = soup.select_one(selector)
            if element and len(element.get_text(strip=True)) > 50:
                return element.get_text(strip=True)
        
        # Fallback: get first substantial paragraph
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            text = p.get_text(strip=True)
            if len(text) > 50:
                return text
        
        return "Comprehensive journey analysis"

    def _extract_journey_phases(self, soup: BeautifulSoup) -> List[JourneyPhase]:
        """Extract journey phases with associated data."""
        phases = []
        
        # Multiple strategies to find phases
        phase_strategies = [
            self._extract_phases_by_headers,
            self._extract_phases_by_sections,
            self._extract_phases_by_divs,
            self._extract_phases_by_lists
        ]
        
        for strategy in phase_strategies:
            try:
                extracted_phases = strategy(soup)
                if extracted_phases:
                    phases.extend(extracted_phases)
                    break
            except Exception as e:
                logger.debug(f"Phase extraction strategy failed: {str(e)}")
                continue
        
        # If no phases found, create a single phase with all content
        if not phases:
            phases.append(JourneyPhase(
                name="Complete Journey",
                description="Full customer journey analysis",
                emotions=self._extract_emotions_from_element(soup),
                pain_points=self._extract_text_by_keywords(soup, ['pain', 'problem', 'issue', 'difficulty']),
                touchpoints=self._extract_text_by_keywords(soup, ['touchpoint', 'interaction', 'contact']),
                quotes=self._extract_text_by_patterns(soup, [r'"([^"]*)"', r"'([^']*)'", r"says?[:\s]+([^.!?]*)"]),
                insights=self._extract_text_by_keywords(soup, ['insight', 'finding', 'discovery', 'learn'])
            ))
        
        return phases

    def _extract_phases_by_headers(self, soup: BeautifulSoup) -> List[JourneyPhase]:
        """Extract phases using header structure."""
        phases = []
        headers = soup.find_all(['h1', 'h2', 'h3', 'h4'])
        
        for i, header in enumerate(headers):
            header_text = header.get_text(strip=True)
            
            # Skip if header doesn't look like a phase
            if len(header_text) < 3 or len(header_text) > 50:
                continue
            
            # Get content until next header
            content_elements = []
            current = header.next_sibling
            
            while current and current != headers[i + 1] if i + 1 < len(headers) else True:
                if hasattr(current, 'get_text'):
                    content_elements.append(current)
                current = current.next_sibling
                
                if isinstance(current, Tag) and current.name in ['h1', 'h2', 'h3', 'h4']:
                    break
            
            # Extract data from this phase's content
            phase_soup = BeautifulSoup(''.join(str(elem) for elem in content_elements), 'html.parser')
            
            phase = JourneyPhase(
                name=header_text,
                description=self._get_first_paragraph(phase_soup),
                emotions=self._extract_emotions_from_element(phase_soup),
                pain_points=self._extract_text_by_keywords(phase_soup, ['pain', 'problem', 'issue']),
                touchpoints=self._extract_text_by_keywords(phase_soup, ['touchpoint', 'interaction']),
                quotes=self._extract_text_by_patterns(phase_soup, [r'"([^"]*)"', r"'([^']*)''"]),
                insights=self._extract_text_by_keywords(phase_soup, ['insight', 'finding'])
            )
            
            phases.append(phase)
        
        return phases

    def _extract_phases_by_sections(self, soup: BeautifulSoup) -> List[JourneyPhase]:
        """Extract phases using section elements."""
        phases = []
        sections = soup.find_all(['section', 'div'], class_=re.compile(r'phase|step|stage', re.I))
        
        for section in sections:
            title_elem = section.find(['h1', 'h2', 'h3', 'h4', '.title', '.phase-title'])
            title = title_elem.get_text(strip=True) if title_elem else f"Phase {len(phases) + 1}"
            
            phase = JourneyPhase(
                name=title,
                description=self._get_first_paragraph(section),
                emotions=self._extract_emotions_from_element(section),
                pain_points=self._extract_text_by_keywords(section, ['pain', 'problem', 'issue']),
                touchpoints=self._extract_text_by_keywords(section, ['touchpoint', 'interaction']),
                quotes=self._extract_text_by_patterns(section, [r'"([^"]*)"']),
                insights=self._extract_text_by_keywords(section, ['insight', 'finding'])
            )
            
            phases.append(phase)
        
        return phases

    def _extract_phases_by_divs(self, soup: BeautifulSoup) -> List[JourneyPhase]:
        """Extract phases from div structures."""
        phases = []
        divs = soup.find_all('div', class_=re.compile(r'journey|phase|step|stage', re.I))
        
        for div in divs:
            if len(div.get_text(strip=True)) < 100:  # Skip small divs
                continue
                
            title_elem = div.find(['h1', 'h2', 'h3', 'h4']) or div.find(class_=re.compile(r'title|header', re.I))
            title = title_elem.get_text(strip=True) if title_elem else f"Section {len(phases) + 1}"
            
            phase = JourneyPhase(
                name=title,
                description=self._get_first_paragraph(div),
                emotions=self._extract_emotions_from_element(div),
                pain_points=self._extract_text_by_keywords(div, ['pain', 'problem']),
                touchpoints=self._extract_text_by_keywords(div, ['touchpoint', 'interaction']),
                quotes=self._extract_text_by_patterns(div, [r'"([^"]*)"']),
                insights=self._extract_text_by_keywords(div, ['insight', 'finding'])
            )
            
            phases.append(phase)
        
        return phases

    def _extract_phases_by_lists(self, soup: BeautifulSoup) -> List[JourneyPhase]:
        """Extract phases from list structures."""
        phases = []
        lists = soup.find_all(['ol', 'ul'])
        
        for list_elem in lists:
            items = list_elem.find_all('li')
            if len(items) < 2:  # Skip small lists
                continue
            
            for i, item in enumerate(items):
                if len(item.get_text(strip=True)) < 50:  # Skip small items
                    continue
                
                phase = JourneyPhase(
                    name=f"Step {i + 1}",
                    description=item.get_text(strip=True)[:200],
                    emotions=self._extract_emotions_from_element(item),
                    pain_points=self._extract_text_by_keywords(item, ['pain', 'problem']),
                    touchpoints=self._extract_text_by_keywords(item, ['touchpoint']),
                    quotes=self._extract_text_by_patterns(item, [r'"([^"]*)"']),
                    insights=self._extract_text_by_keywords(item, ['insight'])
                )
                
                phases.append(phase)
        
        return phases

    def _extract_pain_points(self, soup: BeautifulSoup) -> List[ExtractedElement]:
        """Extract pain points with context and metadata."""
        pain_points = []
        
        # Keywords that indicate pain points
        pain_keywords = [
            'pain', 'problem', 'issue', 'difficulty', 'challenge', 'frustration',
            'complaint', 'concern', 'obstacle', 'barrier', 'struggle', 'friction'
        ]
        
        # Search for pain points in various ways
        pain_elements = self._extract_elements_by_keywords(soup, pain_keywords, DataType.PAIN_POINT)
        pain_points.extend(pain_elements)
        
        # Look for negative sentiment patterns
        negative_patterns = [
            r"can['']?t\s+\w+",
            r"unable\s+to\s+\w+",
            r"difficult\s+to\s+\w+",
            r"hard\s+to\s+\w+",
            r"impossible\s+to\s+\w+"
        ]
        
        for pattern in negative_patterns:
            matches = soup.find_all(text=re.compile(pattern, re.I))
            for match in matches:
                if isinstance(match, NavigableString):
                    parent = match.parent
                    context = parent.get_text(strip=True) if parent else str(match)
                    
                    pain_point = ExtractedElement(
                        content=str(match).strip(),
                        data_type=DataType.PAIN_POINT,
                        context=context,
                        emotional_intensity=self._calculate_emotional_intensity(context),
                        business_impact=self._assess_business_impact(context),
                        source_section=self._get_section_context(parent)
                    )
                    pain_points.append(pain_point)
        
        return pain_points

    def _extract_quotes(self, soup: BeautifulSoup) -> List[ExtractedElement]:
        """Extract quotes with emotional context."""
        quotes = []
        
        # Patterns for finding quotes
        quote_patterns = [
            r'"([^"]{10,200})"',  # Text in double quotes
            r"'([^']{10,200})'",  # Text in single quotes
            r"says?[:\s]+([^.!?]{10,200})[.!?]",  # Following "says:" or "said:"
            r"commented?[:\s]+([^.!?]{10,200})[.!?]",  # Following "commented:"
            r"mentioned[:\s]+([^.!?]{10,200})[.!?]",  # Following "mentioned:"
        ]
        
        for pattern in quote_patterns:
            matches = re.finditer(pattern, soup.get_text(), re.I | re.DOTALL)
            for match in matches:
                quote_text = match.group(1).strip()
                
                if len(quote_text) < 10:  # Skip very short quotes
                    continue
                
                # Find the element containing this quote
                containing_elements = soup.find_all(text=re.compile(re.escape(quote_text)))
                context_element = containing_elements[0].parent if containing_elements else None
                context = context_element.get_text(strip=True) if context_element else quote_text
                
                quote = ExtractedElement(
                    content=quote_text,
                    data_type=DataType.QUOTE,
                    context=context,
                    emotional_intensity=self._calculate_emotional_intensity(quote_text),
                    business_impact=self._assess_business_impact(quote_text),
                    source_section=self._get_section_context(context_element)
                )
                quotes.append(quote)
        
        return quotes

    def _extract_insights(self, soup: BeautifulSoup) -> List[ExtractedElement]:
        """Extract insights and findings."""
        insight_keywords = [
            'insight', 'finding', 'discovery', 'learn', 'revealed', 'showed',
            'demonstrated', 'indicated', 'suggested', 'conclusion', 'result'
        ]
        
        return self._extract_elements_by_keywords(soup, insight_keywords, DataType.INSIGHT)

    def _extract_recommendations(self, soup: BeautifulSoup) -> List[ExtractedElement]:
        """Extract recommendations and action items."""
        rec_keywords = [
            'recommend', 'suggest', 'should', 'must', 'need to', 'action',
            'improve', 'enhance', 'solution', 'fix', 'address', 'opportunity'
        ]
        
        return self._extract_elements_by_keywords(soup, rec_keywords, DataType.RECOMMENDATION)

    def _extract_data_points(self, soup: BeautifulSoup) -> List[ExtractedElement]:
        """Extract numerical data points and statistics."""
        data_points = []
        
        # Patterns for numerical data
        number_patterns = [
            r'(\d+(?:\.\d+)?%)',  # Percentages
            r'(\d+(?:,\d{3})*)',  # Large numbers with commas
            r'(\$\d+(?:,\d{3})*(?:\.\d{2})?)',  # Currency
            r'(\d+(?:\.\d+)?\s*(?:seconds?|minutes?|hours?|days?|weeks?|months?))',  # Time
            r'(\d+(?:\.\d+)?\s*(?:users?|customers?|people))',  # People counts
        ]
        
        for pattern in number_patterns:
            matches = re.finditer(pattern, soup.get_text(), re.I)
            for match in matches:
                data_value = match.group(1)
                
                # Find context around the number
                start = max(0, match.start() - 100)
                end = min(len(soup.get_text()), match.end() + 100)
                context = soup.get_text()[start:end].strip()
                
                data_point = ExtractedElement(
                    content=data_value,
                    data_type=DataType.DATA_POINT,
                    context=context,
                    business_impact=self._assess_business_impact(context),
                    confidence=self._calculate_data_confidence(data_value, context)
                )
                data_points.append(data_point)
        
        return data_points

    def _extract_elements_by_keywords(self, soup: BeautifulSoup, keywords: List[str], 
                                    data_type: DataType) -> List[ExtractedElement]:
        """Generic method to extract elements based on keywords."""
        elements = []
        
        for keyword in keywords:
            # Find elements containing the keyword
            matching_elements = soup.find_all(text=re.compile(keyword, re.I))
            
            for match in matching_elements:
                if isinstance(match, NavigableString):
                    parent = match.parent
                    if parent:
                        content = parent.get_text(strip=True)
                        if len(content) > 20:  # Skip very short content
                            element = ExtractedElement(
                                content=content,
                                data_type=data_type,
                                context=content,
                                emotional_intensity=self._calculate_emotional_intensity(content),
                                business_impact=self._assess_business_impact(content),
                                source_section=self._get_section_context(parent)
                            )
                            elements.append(element)
        
        return elements

    def _analyze_emotional_journey(self, soup: BeautifulSoup, quotes: List[ExtractedElement], 
                                 phases: List[JourneyPhase]) -> Dict[str, Any]:
        """Analyze the emotional arc of the journey."""
        emotional_journey = {
            "overall_sentiment": self._calculate_overall_sentiment(soup),
            "emotional_phases": [],
            "key_emotional_moments": [],
            "emotional_triggers": [],
            "recovery_points": []
        }
        
        # Analyze emotional progression through phases
        for i, phase in enumerate(phases):
            phase_sentiment = self._calculate_sentiment_for_phase(phase)
            emotional_phases_data = {
                "phase": phase.name,
                "sentiment_score": phase_sentiment,
                "dominant_emotions": self._identify_dominant_emotions(phase),
                "emotional_intensity": self._calculate_phase_emotional_intensity(phase),
                "transition": self._analyze_emotional_transition(phases, i) if i > 0 else "starting_point"
            }
            emotional_journey["emotional_phases"].append(emotional_phases_data)
        
        # Extract key emotional moments from quotes
        for quote in quotes:
            if quote.emotional_intensity > 7.0:  # High emotional intensity
                emotional_journey["key_emotional_moments"].append({
                    "moment": quote.content,
                    "intensity": quote.emotional_intensity,
                    "emotion_type": self._classify_emotion_type(quote.content),
                    "context": quote.context
                })
        
        return emotional_journey

    def _extract_metadata(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract metadata about the uploaded document."""
        metadata = {
            "word_count": len(soup.get_text().split()),
            "readability_score": self._calculate_readability(soup.get_text()),
            "complexity_score": self._calculate_complexity_score(soup),
            "data_richness": self._assess_data_richness(soup),
            "emotional_depth": self._assess_emotional_depth(soup),
            "structure_quality": self._assess_structure_quality(soup)
        }
        
        return metadata

    def _calculate_quality_score(self, parsed_data: ParsedJourneyData) -> float:
        """Calculate an overall quality score for the parsed data."""
        scores = []
        
        # Content richness (0-100)
        content_score = min(100, len(parsed_data.pain_points) * 5 + 
                          len(parsed_data.quotes) * 8 + 
                          len(parsed_data.insights) * 10 + 
                          len(parsed_data.recommendations) * 12)
        scores.append(content_score)
        
        # Emotional depth (0-100)
        emotional_score = min(100, len(parsed_data.emotional_journey.get("key_emotional_moments", [])) * 20)
        scores.append(emotional_score)
        
        # Structure quality (0-100)
        structure_score = min(100, len(parsed_data.phases) * 25)
        scores.append(structure_score)
        
        # Data richness (0-100)
        data_score = min(100, len(parsed_data.data_points) * 15)
        scores.append(data_score)
        
        return sum(scores) / len(scores) if scores else 0.0

    # Helper methods for analysis
    
    def _extract_emotions_from_element(self, element) -> List[str]:
        """Extract emotional keywords from an element."""
        text = element.get_text().lower() if hasattr(element, 'get_text') else str(element).lower()
        emotions = []
        
        for emotion, keywords in self.emotional_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    emotions.append(emotion)
                    break
        
        return list(set(emotions))

    def _extract_text_by_keywords(self, element, keywords: List[str]) -> List[str]:
        """Extract text segments containing specific keywords."""
        text = element.get_text() if hasattr(element, 'get_text') else str(element)
        results = []
        
        for keyword in keywords:
            pattern = r'[^.!?]*' + re.escape(keyword) + r'[^.!?]*[.!?]'
            matches = re.findall(pattern, text, re.I)
            results.extend([match.strip() for match in matches])
        
        return results

    def _extract_text_by_patterns(self, element, patterns: List[str]) -> List[str]:
        """Extract text using regex patterns."""
        text = element.get_text() if hasattr(element, 'get_text') else str(element)
        results = []
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.I)
            results.extend(matches)
        
        return results

    def _get_first_paragraph(self, element) -> str:
        """Get the first substantial paragraph from an element."""
        if hasattr(element, 'find'):
            p = element.find('p')
            if p and len(p.get_text(strip=True)) > 20:
                return p.get_text(strip=True)
        
        text = element.get_text(strip=True) if hasattr(element, 'get_text') else str(element)
        return text[:200] + "..." if len(text) > 200 else text

    def _calculate_emotional_intensity(self, text: str) -> float:
        """Calculate emotional intensity of text (0-10 scale)."""
        if not text:
            return 0.0
        
        text_lower = text.lower()
        intensity = 0.0
        
        # Check for emotional keywords
        for emotion, keywords in self.emotional_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    intensity += 1.0
        
        # Check for intensity modifiers
        intensity_modifiers = {
            'very': 1.5, 'extremely': 2.0, 'incredibly': 2.0, 'absolutely': 1.8,
            'completely': 1.7, 'totally': 1.6, 'really': 1.3, 'quite': 1.2,
            'somewhat': 0.8, 'slightly': 0.6, 'a bit': 0.7
        }
        
        for modifier, multiplier in intensity_modifiers.items():
            if modifier in text_lower:
                intensity *= multiplier
                break
        
        # Punctuation intensity
        intensity += text.count('!') * 0.5
        intensity += text.count('?') * 0.3
        
        return min(intensity, 10.0)

    def _assess_business_impact(self, text: str) -> str:
        """Assess business impact level based on text content."""
        text_lower = text.lower()
        
        for impact_level, keywords in self.business_impact_indicators.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return impact_level
        
        # Default assessment based on content
        if any(word in text_lower for word in ['revenue', 'cost', 'profit', 'loss', 'customer']):
            return 'high'
        elif any(word in text_lower for word in ['process', 'efficiency', 'time', 'quality']):
            return 'medium'
        else:
            return 'low'

    def _get_section_context(self, element) -> str:
        """Get the section context for an element."""
        if not element:
            return "unknown"
        
        # Look for parent section headers
        current = element
        while current and current.parent:
            # Check for header elements
            for header_tag in ['h1', 'h2', 'h3', 'h4']:
                header = current.find_previous(header_tag)
                if header:
                    return header.get_text(strip=True)
            
            # Check for section with class
            if hasattr(current, 'get') and current.get('class'):
                classes = ' '.join(current.get('class'))
                if any(keyword in classes.lower() for keyword in ['phase', 'section', 'step']):
                    title = current.find(['h1', 'h2', 'h3', 'h4'])
                    return title.get_text(strip=True) if title else classes
            
            current = current.parent
        
        return "general"

    def _calculate_overall_sentiment(self, soup: BeautifulSoup) -> float:
        """Calculate overall sentiment score (-1 to 1)."""
        # This is a simplified sentiment calculation
        # In a production system, you might use more sophisticated NLP
        text = soup.get_text().lower()
        
        positive_words = ['good', 'great', 'excellent', 'satisfied', 'happy', 'love', 'amazing']
        negative_words = ['bad', 'terrible', 'frustrated', 'angry', 'hate', 'awful', 'problem']
        
        positive_count = sum(text.count(word) for word in positive_words)
        negative_count = sum(text.count(word) for word in negative_words)
        
        total_words = len(text.split())
        if total_words == 0:
            return 0.0
        
        sentiment = (positive_count - negative_count) / total_words * 100
        return max(-1.0, min(1.0, sentiment))

    def _calculate_sentiment_for_phase(self, phase: JourneyPhase) -> float:
        """Calculate sentiment for a specific phase."""
        # Combine all text from the phase
        all_text = f"{phase.description} {' '.join(phase.quotes)} {' '.join(phase.insights)}"
        return self._calculate_overall_sentiment(BeautifulSoup(all_text, 'html.parser'))

    def _identify_dominant_emotions(self, phase: JourneyPhase) -> List[str]:
        """Identify the dominant emotions in a phase."""
        return phase.emotions[:3]  # Return top 3 emotions

    def _calculate_phase_emotional_intensity(self, phase: JourneyPhase) -> float:
        """Calculate emotional intensity for a phase."""
        all_text = f"{phase.description} {' '.join(phase.quotes)}"
        return self._calculate_emotional_intensity(all_text)

    def _analyze_emotional_transition(self, phases: List[JourneyPhase], current_index: int) -> str:
        """Analyze emotional transition between phases."""
        if current_index == 0:
            return "starting_point"
        
        prev_sentiment = self._calculate_sentiment_for_phase(phases[current_index - 1])
        curr_sentiment = self._calculate_sentiment_for_phase(phases[current_index])
        
        diff = curr_sentiment - prev_sentiment
        
        if diff > 0.2:
            return "improving"
        elif diff < -0.2:
            return "declining"
        else:
            return "stable"

    def _classify_emotion_type(self, text: str) -> str:
        """Classify the primary emotion type in text."""
        text_lower = text.lower()
        
        for emotion, keywords in self.emotional_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return emotion
        
        return "neutral"

    def _calculate_readability(self, text: str) -> float:
        """Calculate readability score."""
        try:
            return flesch_reading_ease(text)
        except:
            return 50.0  # Default moderate readability

    def _calculate_complexity_score(self, soup: BeautifulSoup) -> float:
        """Calculate complexity score based on structure."""
        elements_count = len(soup.find_all())
        text_length = len(soup.get_text())
        
        if text_length == 0:
            return 0.0
        
        complexity = (elements_count / text_length) * 1000
        return min(complexity, 100.0)

    def _assess_data_richness(self, soup: BeautifulSoup) -> float:
        """Assess how data-rich the content is."""
        text = soup.get_text()
        
        # Count numbers, percentages, and data indicators
        numbers = len(re.findall(r'\d+', text))
        percentages = len(re.findall(r'\d+%', text))
        data_words = len(re.findall(r'\b(data|metric|statistic|result|finding)\b', text, re.I))
        
        richness = (numbers + percentages * 2 + data_words * 3) / len(text.split()) * 100
        return min(richness, 100.0)

    def _assess_emotional_depth(self, soup: BeautifulSoup) -> float:
        """Assess emotional depth of the content."""
        text = soup.get_text().lower()
        
        emotional_word_count = 0
        for keywords in self.emotional_keywords.values():
            for keyword in keywords:
                emotional_word_count += text.count(keyword)
        
        depth = (emotional_word_count / len(text.split())) * 100
        return min(depth, 100.0)

    def _assess_structure_quality(self, soup: BeautifulSoup) -> float:
        """Assess the structural quality of the HTML."""
        headers = len(soup.find_all(['h1', 'h2', 'h3', 'h4']))
        paragraphs = len(soup.find_all('p'))
        lists = len(soup.find_all(['ul', 'ol']))
        sections = len(soup.find_all(['section', 'div']))
        
        structure_score = (headers * 5 + paragraphs * 2 + lists * 3 + sections) / 10
        return min(structure_score, 100.0)

    def _calculate_data_confidence(self, data_value: str, context: str) -> float:
        """Calculate confidence level for a data point."""
        confidence = 0.5  # Base confidence
        
        # Increase confidence for specific formats
        if '%' in data_value:
            confidence += 0.2
        if '$' in data_value:
            confidence += 0.2
        if re.match(r'\d+,\d{3}', data_value):  # Properly formatted large numbers
            confidence += 0.1
        
        # Increase confidence based on context
        confidence_indicators = ['study', 'research', 'survey', 'analysis', 'found', 'measured']
        for indicator in confidence_indicators:
            if indicator in context.lower():
                confidence += 0.1
                break
        
        return min(confidence, 1.0)


# Factory function for creating the parser
def create_html_parser() -> JourneyMapHTMLParser:
    """Factory function to create an HTML parser instance."""
    return JourneyMapHTMLParser()