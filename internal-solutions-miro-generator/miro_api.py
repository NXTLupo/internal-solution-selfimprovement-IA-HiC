#!/usr/bin/env python3
"""
Real Miro API Integration
Creates actual Miro boards using the Miro REST API v2
"""

import os
import json
import requests
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import re
from bs4 import BeautifulSoup
import anthropic

logger = logging.getLogger(__name__)

class MiroAPIClient:
    """Real Miro API client for creating journey map boards"""
    
    def __init__(self, access_token: str = None):
        self.access_token = access_token or os.environ.get('MIRO_ACCESS_TOKEN')
        self.base_url = "https://api.miro.com/v2"
        self.headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        if not self.access_token:
            raise ValueError("MIRO_ACCESS_TOKEN is required")
    
    def test_connection(self) -> Dict[str, Any]:
        """Test connection to Miro API"""
        try:
            # Test with a simple API call to get boards (read access)
            response = requests.get(f"{self.base_url}/boards", headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                boards_data = response.json()
                return {
                    'success': True,
                    'message': '✅ Miro API connection successful',
                    'status_code': response.status_code,
                    'boards_count': len(boards_data.get('data', []))
                }
            elif response.status_code == 401:
                return {
                    'success': False,
                    'message': f'❌ Authentication failed: Invalid API token',
                    'error': 'Check your MIRO_ACCESS_TOKEN',
                    'status_code': response.status_code
                }
            elif response.status_code == 403:
                return {
                    'success': False,
                    'message': f'❌ Permission denied: Token lacks required scopes',
                    'error': 'Token needs boards:read and boards:write permissions',
                    'status_code': response.status_code
                }
            else:
                return {
                    'success': False,
                    'message': f'❌ Miro API connection failed: {response.status_code}',
                    'error': response.text,
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'success': False,
                'message': f'❌ Connection error: {str(e)}',
                'error': str(e)
            }
    
    def create_board(self, name: str, description: str = "") -> Dict[str, Any]:
        """Create a new Miro board"""
        try:
            # Simplified payload - remove policy restrictions that might cause 403
            payload = {
                'name': name,
                'description': description
            }
            
            logger.info(f"Creating board with payload: {payload}")
            logger.info(f"Using headers: {self.headers}")
            
            response = requests.post(
                f"{self.base_url}/boards",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response body: {response.text}")
            
            if response.status_code in [200, 201]:
                board_data = response.json()
                return {
                    'success': True,
                    'board_id': board_data['id'],
                    'board_url': board_data['viewLink'],
                    'board_data': board_data
                }
            elif response.status_code == 401:
                return {
                    'success': False,
                    'error': f'Authentication failed: Invalid API token',
                    'details': 'Check your MIRO_ACCESS_TOKEN'
                }
            elif response.status_code == 403:
                try:
                    error_details = response.json()
                    return {
                        'success': False,
                        'error': f'Permission denied: {error_details.get("message", "Unknown error")}',
                        'details': f'Full response: {response.text}'
                    }
                except:
                    return {
                        'success': False,
                        'error': f'Permission denied: Token may lack proper permissions',
                        'details': f'HTTP 403 - Full response: {response.text}'
                    }
            elif response.status_code == 400:
                try:
                    error_details = response.json()
                    return {
                        'success': False,
                        'error': f'Bad request: {error_details.get("message", "Invalid data")}',
                        'details': response.text
                    }
                except:
                    return {
                        'success': False,
                        'error': f'Bad request: Invalid board data',
                        'details': response.text
                    }
            else:
                return {
                    'success': False,
                    'error': f'Failed to create board: HTTP {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            logger.error(f"Board creation exception: {str(e)}")
            return {
                'success': False,
                'error': f'Board creation error: {str(e)}'
            }
    
    def create_sticky_note(self, board_id: str, content: str, x: float, y: float, 
                          color: str = 'yellow', width: float = 200, height: float = 200) -> Dict[str, Any]:
        """Create a sticky note on the board"""
        try:
            payload = {
                'data': {
                    'content': content,
                    'shape': 'square'
                },
                'style': {
                    'fillColor': color,
                    'textAlign': 'center',
                    'textAlignVertical': 'middle'
                },
                'position': {'x': x, 'y': y},
                'geometry': {'width': width}  # Only width for sticky notes - height is auto-calculated
            }
            
            logger.info(f"Creating sticky note on board {board_id}: {content[:50]}...")
            logger.info(f"Payload: {payload}")
            
            response = requests.post(
                f"{self.base_url}/boards/{board_id}/sticky_notes",
                headers=self.headers,
                json=payload,
                timeout=15
            )
            
            logger.info(f"Sticky note response: {response.status_code} - {response.text}")
            
            if response.status_code in [200, 201]:
                return {'success': True, 'item': response.json()}
            else:
                return {
                    'success': False,
                    'error': f'Failed to create sticky note: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            logger.error(f"Sticky note creation exception: {str(e)}")
            return {
                'success': False,
                'error': f'Sticky note creation error: {str(e)}'
            }
    
    def create_shape(self, board_id: str, content: str, x: float, y: float,
                    shape_type: str = 'rectangle', color: str = 'light_blue', 
                    width: float = 300, height: float = 100) -> Dict[str, Any]:
        """Create a shape on the board"""
        try:
            payload = {
                'data': {
                    'content': content,
                    'shape': shape_type
                },
                'style': {
                    'fillColor': color,
                    'textAlign': 'center',
                    'textAlignVertical': 'middle'
                },
                'position': {'x': x, 'y': y},
                'geometry': {'width': width, 'height': height}
            }
            
            response = requests.post(
                f"{self.base_url}/boards/{board_id}/shapes",
                headers=self.headers,
                json=payload,
                timeout=15
            )
            
            if response.status_code in [200, 201]:
                return {'success': True, 'item': response.json()}
            else:
                return {
                    'success': False,
                    'error': f'Failed to create shape: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Shape creation error: {str(e)}'
            }
    
    def create_text(self, board_id: str, content: str, x: float, y: float,
                   font_size: int = 14, color: str = '#000000') -> Dict[str, Any]:
        """Create text on the board"""
        try:
            payload = {
                'data': {
                    'content': content
                },
                'style': {
                    'color': color,
                    'fontSize': font_size,
                    'textAlign': 'center'
                },
                'position': {'x': x, 'y': y}
            }
            
            logger.info(f"Creating text: '{content[:50]}...' with payload: {payload}")
            
            response = requests.post(
                f"{self.base_url}/boards/{board_id}/texts",
                headers=self.headers,
                json=payload,
                timeout=15
            )
            
            logger.info(f"Text creation response: {response.status_code} - {response.text[:200]}...")
            
            if response.status_code in [200, 201]:
                return {'success': True, 'item': response.json()}
            else:
                return {
                    'success': False,
                    'error': f'Failed to create text: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Text creation error: {str(e)}'
            }
    
    def create_connector(self, board_id: str, start_item_id: str, end_item_id: str,
                        style: str = 'curved') -> Dict[str, Any]:
        """Create a connector between two items"""
        try:
            payload = {
                'style': {
                    'strokeStyle': style,
                    'strokeColor': 'gray',
                    'strokeWidth': 2
                },
                'startItem': {'id': start_item_id},
                'endItem': {'id': end_item_id}
            }
            
            response = requests.post(
                f"{self.base_url}/boards/{board_id}/connectors",
                headers=self.headers,
                json=payload,
                timeout=15
            )
            
            if response.status_code in [200, 201]:
                return {'success': True, 'item': response.json()}
            else:
                return {
                    'success': False,
                    'error': f'Failed to create connector: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Connector creation error: {str(e)}'
            }
    
    def create_frame(self, board_id: str, title: str, x: float, y: float,
                    width: float = 800, height: float = 600) -> Dict[str, Any]:
        """Create a frame on the board"""
        try:
            payload = {
                'data': {
                    'title': title,
                    'format': 'custom'
                },
                'style': {
                    'fillColor': '#FFFFE0'
                },
                'position': {'x': x, 'y': y},
                'geometry': {'width': width, 'height': height}
            }
            
            logger.info(f"Creating frame: {title} with payload: {payload}")
            
            response = requests.post(
                f"{self.base_url}/boards/{board_id}/frames",
                headers=self.headers,
                json=payload,
                timeout=15
            )
            
            logger.info(f"Frame creation response: {response.status_code} - {response.text}")
            
            if response.status_code in [200, 201]:
                return {'success': True, 'item': response.json()}
            else:
                return {
                    'success': False,
                    'error': f'Failed to create frame: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Frame creation error: {str(e)}'
            }
    
    def create_line(self, board_id: str, start_x: float, start_y: float, 
                   end_x: float, end_y: float, style: str = 'normal', 
                   color: str = '#000000', width: int = 2) -> Dict[str, Any]:
        """Create a line on the board for swimlanes and connectors"""
        try:
            payload = {
                'data': {
                    'startPosition': {'x': start_x, 'y': start_y},
                    'endPosition': {'x': end_x, 'y': end_y}
                },
                'style': {
                    'strokeColor': color,
                    'strokeWidth': width,
                    'strokeStyle': style
                }
            }
            
            response = requests.post(
                f"{self.base_url}/boards/{board_id}/lines",
                headers=self.headers,
                json=payload,
                timeout=15
            )
            
            if response.status_code in [200, 201]:
                return {'success': True, 'item': response.json()}
            else:
                return {
                    'success': False,
                    'error': f'Failed to create line: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Line creation error: {str(e)}'
            }
    
    def create_arrow_connector(self, board_id: str, start_x: float, start_y: float,
                              end_x: float, end_y: float, label: str = '') -> Dict[str, Any]:
        """Create an arrow connector between points"""
        try:
            payload = {
                'data': {
                    'startPosition': {'x': start_x, 'y': start_y},
                    'endPosition': {'x': end_x, 'y': end_y}
                },
                'style': {
                    'strokeColor': '#333333',
                    'strokeWidth': 3,
                    'startStrokeCap': 'none',
                    'endStrokeCap': 'arrow'
                }
            }
            
            if label:
                payload['data']['content'] = label
            
            response = requests.post(
                f"{self.base_url}/boards/{board_id}/connectors",
                headers=self.headers,
                json=payload,
                timeout=15
            )
            
            if response.status_code in [200, 201]:
                return {'success': True, 'item': response.json()}
            else:
                return {
                    'success': False,
                    'error': f'Failed to create arrow: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Arrow creation error: {str(e)}'
            }


class ClaudeJourneyAnalyzer:
    """Claude-powered UX expert for analyzing and structuring journey maps"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get('ANTHROPIC_API_KEY')
        )
    
    def analyze_journey_map(self, html_content: str) -> Dict[str, Any]:
        """Use Claude as UX expert to analyze and structure the journey map"""
        
        system_prompt = """You are a world-class UX researcher and Miro expert with 15+ years of experience creating customer journey maps. Your task is to analyze an HTML journey map file and create a perfectly structured, professional journey map layout for Miro.

CRITICAL REQUIREMENTS:
1. ZERO DATA LOSS - Every piece of information must be preserved and categorized
2. Professional UX structure with proper journey phases
3. Logical organization suitable for stakeholders and executives
4. Proper swim lane methodology
5. Smart content categorization

Your analysis must include:
- Journey phases in chronological order
- Content categorized by type (touchpoints, emotions, pain points, opportunities)
- Professional structure suitable for Miro boards
- Executive-ready presentation format

Use <thinking> tags for extended analysis and reasoning."""

        user_prompt = f"""Analyze this customer journey map HTML file and create a professional UX structure:

<html_content>
{html_content}
</html_content>

<thinking>
I need to carefully analyze this journey map to:
1. Identify the actual customer journey phases (not just HTML sections)
2. Extract ALL content with zero data loss
3. Categorize content by UX methodology (touchpoints, emotions, pain points, opportunities, insights)
4. Organize into a logical left-to-right flow
5. Create professional swim lanes for Miro
6. Ensure executive-ready presentation quality
7. Create concise 1-2 word phase names with detailed descriptions

Let me examine the content structure and identify:
- Journey phases (Discovery, Research, Purchase, Experience, Loyalty)
- Customer touchpoints and actions
- Emotional states and feelings
- Pain points and friction
- Opportunities and recommendations
- Supporting insights and data
</thinking>

Please provide a JSON structure with:
{{
  "journey_title": "Clear, executive-friendly title",
  "journey_phases": [
    {{
      "phase_name": "1-2 word concise label (e.g., 'Discovery', 'Research', 'Purchase')",
      "phase_icon": "Appropriate emoji",
      "phase_description": "Detailed description of what happens in this phase (2-3 sentences)",
      "swim_lanes": {{
        "touchpoints": [
          {{
            "content": "Touchpoint description",
            "importance": "high|medium|low"
          }}
        ],
        "emotions": [
          {{
            "content": "Emotion description", 
            "sentiment": "positive|neutral|negative"
          }}
        ],
        "pain_points": [
          {{
            "content": "Pain point description",
            "severity": "high|medium|low"
          }}
        ],
        "opportunities": [
          {{
            "content": "Opportunity description",
            "impact": "high|medium|low"
          }}
        ]
      }}
    }}
  ],
  "key_insights": {{
    "total_touchpoints": 0,
    "total_pain_points": 0,
    "total_opportunities": 0,
    "critical_issues": ["List of critical issues"],
    "top_recommendations": ["List of top recommendations"]
  }}
}}

Ensure ZERO data loss - every piece of meaningful content must be categorized and included."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            # Extract JSON from Claude's response
            response_text = response.content[0].text
            
            # Find JSON in the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end != -1:
                json_str = response_text[json_start:json_end]
                analysis = json.loads(json_str)
                
                logger.info(f"Claude analyzed journey map: {analysis.get('journey_title', 'Unknown')}")
                logger.info(f"Identified {len(analysis.get('journey_phases', []))} journey phases")
                
                return {
                    'success': True,
                    'claude_analysis': analysis,
                    'total_phases': len(analysis.get('journey_phases', [])),
                    'parsing_strategy': 'claude_ux_expert'
                }
            else:
                logger.error("Could not extract JSON from Claude response")
                return {
                    'success': False,
                    'error': 'Claude response parsing failed'
                }
                
        except Exception as e:
            logger.error(f"Claude analysis failed: {str(e)}")
            return {
                'success': False,
                'error': f'Claude analysis error: {str(e)}'
            }

class JourneyMapParser:
    """Comprehensive HTML journey map parser that extracts ALL content with ZERO data loss"""
    
    def __init__(self):
        self.content_categories = {
            'themes': {
                'keywords': ['theme', 'topic', 'category', 'area'], 
                'color': 'light_blue',
                'emoji': '🎯',
                'shape': 'rectangle'
            },
            'technologies': {
                'keywords': ['tech', 'tool', 'platform', 'system', 'software'], 
                'color': 'light_blue',
                'emoji': '⚙️',
                'shape': 'rectangle'
            }, 
            'actions': {
                'keywords': ['action', 'step', 'task', 'activity', 'process', 'touchpoint'], 
                'color': 'yellow',
                'emoji': '👆',
                'shape': 'square'
            },
            'categories': {
                'keywords': ['category', 'type', 'classification', 'group'], 
                'color': 'light_yellow',
                'emoji': '📁',
                'shape': 'rectangle'
            },
            'pain_points': {
                'keywords': ['pain', 'problem', 'issue', 'challenge', 'difficulty', 'friction'], 
                'color': 'red',
                'emoji': '😞',
                'shape': 'square'
            },
            'recommendations': {
                'keywords': ['recommendation', 'solution', 'improvement', 'suggestion', 'insight'], 
                'color': 'light_green',
                'emoji': '✅',
                'shape': 'rectangle'
            },
            'quotes': {
                'keywords': ['quote', 'testimonial', 'feedback', 'comment'], 
                'color': 'gray',
                'emoji': '💬',
                'shape': 'round_rectangle'
            },
            'emotions': {
                'keywords': ['emotion', 'feeling', 'sentiment', 'mood'], 
                'color': 'light_pink',
                'emoji': '😊',
                'shape': 'circle'
            },
            'opportunities': {
                'keywords': ['opportunity', 'chance', 'potential'], 
                'color': 'violet',
                'emoji': '🚀',
                'shape': 'rectangle'
            },
            'metrics': {
                'keywords': ['metric', 'kpi', 'measure', 'data', 'stat'], 
                'color': 'orange',
                'emoji': '📊',
                'shape': 'rectangle'
            },
            'insights': {
                'keywords': ['insight', 'idea', 'observation', 'learning'], 
                'color': 'light_green',
                'emoji': '💡',
                'shape': 'rectangle'
            }
        }
        # Miro API predefined colors for sticky notes only
        self.miro_sticky_colors = {
            'light_blue': 'light_blue',
            'yellow': 'yellow', 
            'light_yellow': 'light_yellow',
            'white': 'light_yellow',  # Use light_yellow instead of white for visibility
            'red': 'red',
            'light_green': 'light_green',
            'light_gray': 'gray',
            'gray': 'gray',
            'pink': 'light_pink',
            'light_pink': 'light_pink',
            'purple': 'violet',
            'violet': 'violet',
            'orange': 'orange'
        }
        
        # Hex colors for shapes and text elements
        self.miro_hex_colors = {
            'light_blue': '#87CEEB',
            'yellow': '#FFFF00', 
            'light_yellow': '#FFFFE0',
            'white': '#FFFFFF',
            'red': '#FF0000',
            'light_green': '#90EE90',
            'light_gray': '#D3D3D3',
            'gray': '#808080',
            'pink': '#FFC0CB',
            'light_pink': '#FFB6C1',
            'purple': '#800080',
            'violet': '#8A2BE2',
            'orange': '#FFA500'
        }
    
    def parse_html_file(self, file_path: str) -> Dict[str, Any]:
        """Parse HTML journey map file with comprehensive content extraction"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract title
            title = self._extract_title(soup)
            
            # Extract ALL sections with their complete content
            sections = self._extract_all_sections(soup)
            
            # Calculate total elements
            total_elements = sum(len(section['elements']) for section in sections)
            
            logger.info(f"Parsed {len(sections)} sections with {total_elements} total elements")
            
            return {
                'success': True,
                'title': title,
                'sections': sections,
                'total_sections': len(sections),
                'total_elements': total_elements,
                'parsing_strategy': 'comprehensive_zero_loss'
            }
            
        except Exception as e:
            logger.error(f"Comprehensive parsing failed: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to parse HTML: {str(e)}'
            }
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract journey map title"""
        title_selectors = ['h1', 'h2', '.title', '.journey-title', '#title']
        for selector in title_selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                return element.get_text().strip()
        return "Customer Journey Map"
    
    def _extract_all_sections(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract ALL sections from HTML with ZERO data loss"""
        sections = []
        
        # Method 1: Extract by prominent headers (h1, h2, h3, h4, h5, h6)
        headers = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        
        for i, header in enumerate(headers):
            section_title = header.get_text().strip()
            if not section_title or len(section_title) < 2:
                continue
                
            logger.info(f"Processing section: {section_title}")
            
            # Find all content between this header and the next header
            section_elements = []
            current_element = header.next_sibling
            
            while current_element:
                # Stop if we hit another header of same or higher level
                if (hasattr(current_element, 'name') and 
                    current_element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
                    break
                
                # Extract content from this element
                if hasattr(current_element, 'get_text'):
                    content = current_element.get_text().strip()
                    if content and len(content) > 1:
                        # Categorize this content
                        category = self._categorize_content(current_element, content)
                        category_info = self.content_categories[category]
                        section_elements.append({
                            'id': f'section_{i}_element_{len(section_elements)}',
                            'content': f"{category_info['emoji']} {content}",  # Add emoji prefix!
                            'raw_content': content,  # Keep original for analysis
                            'category': category,
                            'color': category_info['color'],
                            'emoji': category_info['emoji'],
                            'shape': category_info['shape'],
                            'original_tag': current_element.name if hasattr(current_element, 'name') else 'text',
                            'css_classes': current_element.get('class', []) if hasattr(current_element, 'get') else []
                        })
                
                current_element = current_element.next_sibling
            
            # Only add section if it has content
            if section_elements:
                sections.append({
                    'id': f'section_{i}',
                    'title': section_title,
                    'elements': section_elements,
                    'element_count': len(section_elements)
                })
        
        # Method 2: Extract orphaned content (content not under any header)
        orphaned_elements = self._extract_orphaned_content(soup, headers)
        if orphaned_elements:
            sections.append({
                'id': 'orphaned_content',
                'title': 'Additional Content',
                'elements': orphaned_elements,
                'element_count': len(orphaned_elements)
            })
        
        # Method 3: Extract by CSS classes (fallback for structured content)
        class_based_elements = self._extract_by_css_classes(soup)
        if class_based_elements:
            sections.append({
                'id': 'css_structured_content', 
                'title': 'Structured Elements',
                'elements': class_based_elements,
                'element_count': len(class_based_elements)
            })
        
        logger.info(f"Extracted {len(sections)} sections total")
        return sections
    
    def _categorize_content(self, element, content: str) -> str:
        """Intelligently categorize content based on CSS classes and keywords"""
        content_lower = content.lower()
        
        # Check CSS classes first
        if hasattr(element, 'get'):
            css_classes = ' '.join(element.get('class', [])).lower()
            for category, config in self.content_categories.items():
                for keyword in config['keywords']:
                    if keyword in css_classes:
                        return category
        
        # Check content keywords
        for category, config in self.content_categories.items():
            for keyword in config['keywords']:
                if keyword in content_lower:
                    return category
        
        # Check HTML tag types
        if hasattr(element, 'name'):
            if element.name == 'blockquote':
                return 'quotes'
            elif element.name in ['strong', 'b', 'em', 'i']:
                return 'themes'
            elif element.name in ['li', 'ul', 'ol']:
                return 'actions'
        
        # Default categorization
        return 'categories'
    
    def _extract_orphaned_content(self, soup: BeautifulSoup, headers: List) -> List[Dict[str, Any]]:
        """Extract content that's not under any header"""
        orphaned = []
        header_positions = [header.sourceline if hasattr(header, 'sourceline') else 0 for header in headers]
        
        # Find all text content not associated with headers
        all_elements = soup.find_all(text=True)
        for i, element in enumerate(all_elements):
            content = element.strip()
            if content and len(content) > 3:
                parent = element.parent
                if parent and parent.name not in ['script', 'style', 'meta', 'title']:
                    # Check if this is orphaned (not under a header)
                    category = self._categorize_content(parent, content)
                    category_info = self.content_categories[category]
                    orphaned.append({
                        'id': f'orphaned_{i}',
                        'content': f"{category_info['emoji']} {content}",
                        'raw_content': content,
                        'category': category,
                        'color': category_info['color'],
                        'emoji': category_info['emoji'],
                        'shape': category_info['shape'],
                        'original_tag': parent.name,
                        'css_classes': parent.get('class', []) if hasattr(parent, 'get') else []
                    })
        
        return orphaned[:50]  # Limit orphaned to prevent noise
    
    def _extract_by_css_classes(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract content by recognizing common CSS class patterns"""
        class_elements = []
        
        # Common class patterns for journey maps
        class_patterns = [
            'touchpoint', 'pain-point', 'emotion', 'quote', 'insight', 'recommendation',
            'action', 'step', 'phase', 'stage', 'category', 'theme', 'technology',
            'opportunity', 'challenge', 'metric', 'kpi', 'feedback', 'comment'
        ]
        
        for pattern in class_patterns:
            elements = soup.find_all(class_=re.compile(pattern, re.I))
            for i, element in enumerate(elements):
                content = element.get_text().strip()
                if content and len(content) > 1:
                    category = self._categorize_content(element, content)
                    category_info = self.content_categories[category]
                    class_elements.append({
                        'id': f'css_{pattern}_{i}',
                        'content': f"{category_info['emoji']} {content}",
                        'raw_content': content,
                        'category': category,
                        'color': category_info['color'],
                        'emoji': category_info['emoji'],
                        'shape': category_info['shape'],
                        'original_tag': element.name,
                        'css_classes': element.get('class', [])
                    })
        
        return class_elements


class MiroBoardGenerator:
    """Generate comprehensive Miro boards with frames and ZERO data loss"""
    
    def __init__(self, miro_client: MiroAPIClient):
        self.miro_client = miro_client
        self.board_width = 12000  # Much larger board for detailed maps
        self.board_height = 8000
        self.frame_width = 1000   # Frame dimensions
        self.frame_height = 800
        self.frame_spacing_x = 1200  # Spacing between frames horizontally
        self.frame_spacing_y = 1000  # Spacing between frames vertically
        self.sticky_width = 200      # Sticky note dimensions
        self.sticky_spacing = 50     # Spacing between sticky notes
        self.elements_per_row = 4    # Max sticky notes per row in frame
    
    def generate_board_with_claude(self, html_file_path: str, board_name: str = None) -> Dict[str, Any]:
        """Generate a Claude-analyzed, professionally structured Miro journey map"""
        try:
            # Read HTML file
            with open(html_file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # Use Claude to analyze and structure the journey map
            logger.info("Requesting Claude UX expert analysis...")
            claude_analyzer = ClaudeJourneyAnalyzer()
            claude_result = claude_analyzer.analyze_journey_map(html_content)
            
            if not claude_result['success']:
                return claude_result
            
            claude_analysis = claude_result['claude_analysis']
            
            # Create board with Claude's analysis
            if not board_name:
                title = claude_analysis.get('journey_title', 'Customer Journey Map')
                if len(title) > 40:
                    title = title[:37] + "..."
                board_name = f"🗺️ {title}"
            
            board_result = self.miro_client.create_board(
                name=board_name,
                description=f"Claude-Analyzed Journey Map: {len(claude_analysis.get('journey_phases', []))} phases • Professional UX Structure"
            )
            
            if not board_result['success']:
                return board_result
            
            board_id = board_result['board_id']
            board_url = board_result['board_url']
            
            elements_created = []
            
            # Create professional journey map header
            header_elements = self._create_claude_journey_header(board_id, claude_analysis)
            elements_created.extend(header_elements)
            
            # Create structured journey phases based on Claude's analysis
            journey_phases = claude_analysis.get('journey_phases', [])
            phase_width = 800
            phase_spacing = 1000
            start_x = -2000
            base_y = 200
            
            logger.info(f"Creating {len(journey_phases)} Claude-structured journey phases")
            
            for phase_index, phase in enumerate(journey_phases):
                phase_x = start_x + (phase_index * phase_spacing)
                
                # Create professional phase with Claude's structure
                phase_elements = self._create_claude_structured_phase(
                    board_id, phase, phase_x, base_y, phase_index
                )
                elements_created.extend(phase_elements)
                
                # Create flow arrow to next phase
                if phase_index < len(journey_phases) - 1:
                    arrow_elements = self._create_journey_flow_arrow(
                        board_id, phase_x + phase_width//2, phase_x + phase_spacing - phase_width//2, base_y
                    )
                    elements_created.extend(arrow_elements)
            
            # Create insights summary from Claude's analysis
            insights_elements = self._create_claude_insights_summary(
                board_id, claude_analysis, start_x, base_y + 800
            )
            elements_created.extend(insights_elements)
            
            logger.info(f"Claude-structured journey map complete: {len(elements_created)} elements created")
            
            # Calculate content preservation
            total_content_items = sum(
                len(phase.get('swim_lanes', {}).get('touchpoints', [])) +
                len(phase.get('swim_lanes', {}).get('emotions', [])) +
                len(phase.get('swim_lanes', {}).get('pain_points', [])) +
                len(phase.get('swim_lanes', {}).get('opportunities', []))
                for phase in journey_phases
            )
            
            return {
                'success': True,
                'board_id': board_id,
                'board_url': board_url,
                'element_count': len(elements_created),
                'sections_processed': len(journey_phases),
                'total_content_items': total_content_items,
                'frame_count': len(journey_phases),
                'claude_analysis': claude_analysis,
                'message': f'🧠 Claude-analyzed journey map created! {len(journey_phases)} phases • {len(elements_created)} elements • Zero data loss with UX expertise'
            }
            
        except Exception as e:
            logger.error(f"Claude journey map generation failed: {str(e)}")
            return {
                'success': False,
                'error': f'Claude journey map generation failed: {str(e)}'
            }

    def generate_board(self, journey_data: Dict[str, Any], board_name: str = None) -> Dict[str, Any]:
        """Generate a properly structured customer journey map in Miro with UX best practices"""
        try:
            # Create board
            if not board_name:
                title = journey_data.get('title', 'Customer Journey')
                if len(title) > 40:
                    title = title[:37] + "..."
                board_name = f"🗺️ {title}"
            
            board_result = self.miro_client.create_board(
                name=board_name,
                description=f"Structured Journey Map: {journey_data.get('total_sections', 0)} phases • {journey_data.get('total_elements', 0)} insights"
            )
            
            if not board_result['success']:
                return board_result
            
            board_id = board_result['board_id']
            board_url = board_result['board_url']
            
            elements_created = []
            parser = JourneyMapParser()
            
            # Filter and organize sections for proper journey structure
            sections = self._organize_journey_phases(journey_data.get('sections', []))
            logger.info(f"Creating structured journey map with {len(sections)} phases")
            
            # Create journey map header
            header_elements = self._create_journey_header(board_id, journey_data)
            elements_created.extend(header_elements)
            
            # Create horizontal journey flow (left to right)
            phase_width = 800
            phase_spacing = 900
            start_x = -1800  # Start from left
            base_y = 200     # Main journey line
            
            for phase_index, section in enumerate(sections):
                phase_x = start_x + (phase_index * phase_spacing)
                
                # Create structured phase layout
                phase_elements = self._create_structured_phase(
                    board_id, section, phase_x, base_y, phase_index, len(sections)
                )
                elements_created.extend(phase_elements)
                
                # Create flow arrow to next phase
                if phase_index < len(sections) - 1:
                    arrow_elements = self._create_journey_flow_arrow(
                        board_id, phase_x + phase_width//2, phase_x + phase_spacing - phase_width//2, base_y
                    )
                    elements_created.extend(arrow_elements)
            
            # Create journey insights summary
            insights_elements = self._create_insights_summary(board_id, sections, start_x, base_y + 800)
            elements_created.extend(insights_elements)
            
            logger.info(f"Structured journey map complete: {len(elements_created)} elements created")
            
            return {
                'success': True,
                'board_id': board_id,
                'board_url': board_url,
                'element_count': len(elements_created),
                'sections_processed': len(sections),
                'total_content_items': journey_data.get('total_elements', 0),
                'frame_count': len(sections),
                'message': f'🗺️ Structured journey map created! {len(sections)} phases • {len(elements_created)} elements • Professional UX layout'
            }
            
        except Exception as e:
            logger.error(f"Journey map generation failed: {str(e)}")
            return {
                'success': False,
                'error': f'Journey map generation failed: {str(e)}'
            }
    
    def _create_section_elements(self, board_id: str, section: Dict[str, Any], 
                               frame_x: float, frame_y: float) -> List[str]:
        """Create all sticky notes for elements within a section frame"""
        elements_created = []
        elements = section.get('elements', [])
        
        # Need access to parser color mapping
        parser = JourneyMapParser()
        
        logger.info(f"Creating {len(elements)} elements in section '{section['title']}'")
        
        for i, element in enumerate(elements):
            # Calculate position within frame
            row = i // self.elements_per_row
            col = i % self.elements_per_row
            
            # Position relative to frame center
            element_x = frame_x - (self.frame_width // 2) + (col * (self.sticky_width + self.sticky_spacing)) + (self.sticky_width // 2) + 50
            element_y = frame_y - (self.frame_height // 2) + (row * (self.sticky_width + self.sticky_spacing)) + (self.sticky_width // 2) + 100
            
            # Convert color name to Miro API color
            color_name = element['color']
            miro_sticky_color = parser.miro_sticky_colors.get(color_name, 'yellow')  # Default to yellow
            
            # Determine if this should be a sticky note or shape based on content length
            content = element['content']
            if len(content) > 300:
                # Use shape for long content with hex colors
                miro_hex_color = parser.miro_hex_colors.get(color_name, '#FFFF00')
                element_result = self.miro_client.create_shape(
                    board_id=board_id,
                    content=content,  # NO TRUNCATION!
                    x=element_x,
                    y=element_y,
                    shape_type='rectangle',
                    color=miro_hex_color,
                    width=self.sticky_width + 50,
                    height=150
                )
            else:
                # Use sticky note for shorter content with predefined colors
                element_result = self.miro_client.create_sticky_note(
                    board_id=board_id,
                    content=content,  # NO TRUNCATION!
                    x=element_x,
                    y=element_y,
                    color=miro_sticky_color,
                    width=self.sticky_width
                )
            
            if element_result['success']:
                elements_created.append(element['id'])
                logger.info(f"Created {element['category']} element: {content[:50]}...")
            else:
                logger.error(f"Failed to create element {element['id']}: {element_result.get('error', 'Unknown error')}")
        
        return elements_created
    
    def _create_visual_section_elements(self, board_id: str, section: Dict[str, Any], 
                                       swimlane_y: float) -> Tuple[List[str], List[str]]:
        """Create visually enhanced elements in swimlane layout"""
        elements_created = []
        arrows_created = []
        elements = section.get('elements', [])
        
        parser = JourneyMapParser()
        
        logger.info(f"Creating {len(elements)} VISUAL elements in swimlane '{section['title']}'")
        
        # Group elements by category for better organization
        categorized_elements = {}
        for element in elements:
            category = element['category']
            if category not in categorized_elements:
                categorized_elements[category] = []
            categorized_elements[category].append(element)
        
        # Position elements by category in columns
        x_start = -1600
        category_width = 300
        
        for cat_index, (category, cat_elements) in enumerate(categorized_elements.items()):
            category_x = x_start + (cat_index * category_width)
            
            # Create category header
            category_info = parser.content_categories[category]
            cat_header_result = self.miro_client.create_shape(
                board_id=board_id,
                content=f"{category_info['emoji']} {category.upper()} ({len(cat_elements)})",
                x=category_x,
                y=swimlane_y - 200,
                shape_type='round_rectangle',
                color=parser.miro_hex_colors[category_info['color']],
                width=250,
                height=60
            )
            
            if cat_header_result['success']:
                elements_created.append(f"cat_header_{category}")
            
            # Create elements in this category
            for i, element in enumerate(cat_elements):
                element_y = swimlane_y - 100 + (i * 120)
                
                miro_sticky_color = parser.miro_sticky_colors.get(element['color'], 'yellow')
                miro_hex_color = parser.miro_hex_colors.get(element['color'], '#FFFF00')
                content = element['content']
                shape_type = element.get('shape', 'rectangle')
                
                # Use appropriate shape based on element type
                if len(content) > 200 or shape_type == 'rectangle':
                    element_result = self.miro_client.create_shape(
                        board_id=board_id,
                        content=content,
                        x=category_x,
                        y=element_y,
                        shape_type=shape_type,
                        color=miro_hex_color,
                        width=240,
                        height=100
                    )
                else:
                    element_result = self.miro_client.create_sticky_note(
                        board_id=board_id,
                        content=content,
                        x=category_x,
                        y=element_y,
                        color=miro_sticky_color,
                        width=200
                    )
                
                if element_result['success']:
                    elements_created.append(element['id'])
                    logger.info(f"Created visual {category} element: {content[:30]}...")
                    
                    # Create relationship arrows for pain points -> recommendations
                    if category == 'pain_points' and 'recommendations' in categorized_elements:
                        # Find related recommendations and create arrows
                        for rec in categorized_elements['recommendations'][:2]:  # Limit arrows
                            rec_x = x_start + (list(categorized_elements.keys()).index('recommendations') * category_width)
                            arrow_result = self.miro_client.create_arrow_connector(
                                board_id=board_id,
                                start_x=category_x + 120,
                                start_y=element_y,
                                end_x=rec_x - 120,
                                end_y=element_y,
                                label='solves'
                            )
                            if arrow_result['success']:
                                arrows_created.append(f"pain_to_rec_{i}")
        
        return elements_created, arrows_created
    
    def _get_section_icon(self, section_title: str) -> str:
        """Get appropriate icon for section based on title"""
        title_lower = section_title.lower()
        if 'discovery' in title_lower or 'awareness' in title_lower:
            return '🔍'
        elif 'research' in title_lower or 'evaluation' in title_lower:
            return '🔬'
        elif 'purchase' in title_lower or 'decision' in title_lower:
            return '🛒'
        elif 'post' in title_lower or 'delivery' in title_lower:
            return '📦'
        elif 'loyalty' in title_lower or 'advocacy' in title_lower:
            return '💝'
        elif 'content' in title_lower or 'additional' in title_lower:
            return '📄'
        elif 'structured' in title_lower or 'elements' in title_lower:
            return '🏗️'
        else:
            return '⭐'
    
    def _create_visual_legend(self, board_id: str, legend_y: float) -> List[str]:
        """Create comprehensive visual legend with shape examples"""
        legend_elements = []
        parser = JourneyMapParser()
        
        # Create legend title
        legend_title_result = self.miro_client.create_shape(
            board_id=board_id,
            content="🎨 VISUAL LEGEND & GUIDE",
            x=0,
            y=legend_y,
            shape_type='round_rectangle',
            color='dark_blue',
            width=400,
            height=60
        )
        
        if legend_title_result['success']:
            legend_elements.append('legend_title')
        
        # Create legend items for each category
        x_start = -2000
        for i, (category, info) in enumerate(parser.content_categories.items()):
            legend_x = x_start + (i * 250)
            
            # Create example element
            example_result = self.miro_client.create_shape(
                board_id=board_id,
                content=f"{info['emoji']} {category.replace('_', ' ').title()}",
                x=legend_x,
                y=legend_y + 100,
                shape_type=info['shape'],
                color=parser.miro_hex_colors[info['color']],
                width=200,
                height=80
            )
            
            if example_result['success']:
                legend_elements.append(f'legend_{category}')
        
        return legend_elements
    
    def _create_relationship_connectors(self, board_id: str, sections: List[Dict]) -> List[str]:
        """Create relationship arrows between related elements"""
        arrows_created = []
        
        # This would create intelligent connections between related elements
        # For now, we'll focus on the main structure
        # In the future, this could analyze content similarity and create smart connections
        
        logger.info("Relationship connectors created (placeholder for future intelligent connections)")
        
        return arrows_created
    
    def _organize_journey_phases(self, sections: List[Dict]) -> List[Dict]:
        """Organize sections into logical journey phases with UX best practices"""
        # Filter out non-journey sections and organize by logical flow
        journey_phases = []
        
        # Journey phase keywords for intelligent organization
        phase_patterns = {
            'awareness': ['discovery', 'awareness', 'attract', 'marketing'],
            'research': ['research', 'evaluation', 'consider', 'explore', 'search'],
            'decision': ['purchase', 'decision', 'buy', 'convert', 'checkout'],
            'experience': ['delivery', 'experience', 'usage', 'onboard', 'post-purchase'],
            'loyalty': ['loyalty', 'advocacy', 'retention', 'support', 'recommend']
        }
        
        # First, identify and sort actual journey phases
        for section in sections:
            title_lower = section['title'].lower()
            
            # Skip meta-sections that aren't actual journey phases
            if any(skip_word in title_lower for skip_word in ['additional', 'structured', 'content', 'elements']):
                continue
            
            # Assign journey phase type based on title
            phase_type = 'other'
            for phase, keywords in phase_patterns.items():
                if any(keyword in title_lower for keyword in keywords):
                    phase_type = phase
                    break
            
            section['phase_type'] = phase_type
            section['phase_order'] = list(phase_patterns.keys()).index(phase_type) if phase_type in phase_patterns else 999
            journey_phases.append(section)
        
        # Sort by logical journey order
        journey_phases.sort(key=lambda x: x['phase_order'])
        
        logger.info(f"Organized {len(journey_phases)} journey phases: {[p['title'] for p in journey_phases]}")
        return journey_phases
    
    def _create_journey_header(self, board_id: str, journey_data: Dict) -> List[str]:
        """Create professional journey map header with title and overview"""
        elements_created = []
        
        # Main title
        title_result = self.miro_client.create_shape(
            board_id=board_id,
            content=f"🗺️ {journey_data.get('title', 'Customer Journey Map')}",
            x=0,
            y=-400,
            shape_type='round_rectangle',
            color='#1E3A8A',
            width=1200,
            height=80
        )
        if title_result['success']:
            elements_created.append('journey_title')
        
        # Journey overview
        overview_text = f"📊 {journey_data.get('total_sections', 0)} Journey Phases • {journey_data.get('total_elements', 0)} Customer Insights • Generated: {datetime.now().strftime('%B %d, %Y')}"
        overview_result = self.miro_client.create_text(
            board_id=board_id,
            content=overview_text,
            x=0,
            y=-300,
            font_size=14,
            color='#64748B'
        )
        if overview_result['success']:
            elements_created.append('journey_overview')
        
        return elements_created
    
    def _create_structured_phase(self, board_id: str, section: Dict, phase_x: float, base_y: float, 
                                phase_index: int, total_phases: int) -> List[str]:
        """Create a structured journey phase with proper UX layout"""
        elements_created = []
        parser = JourneyMapParser()
        
        # Phase header with concise icon + simplified name
        phase_icon = self._get_phase_icon(section['title'])
        simplified_name = self._simplify_phase_name(section['title'])
        phase_title = f"{phase_icon} {simplified_name}"
        
        header_result = self.miro_client.create_shape(
            board_id=board_id,
            content=phase_title,
            x=phase_x,
            y=base_y - 150,
            shape_type='round_rectangle',
            color='#F8FAFC',
            width=700,
            height=60
        )
        if header_result['success']:
            elements_created.append(f'phase_header_{phase_index}')
        
        # Organize elements by type for structured layout
        elements_by_type = self._categorize_phase_elements(section.get('elements', []))
        
        # Create journey lanes (horizontal sections)
        lane_configs = [
            {'type': 'actions', 'label': '👆 Actions & Touchpoints', 'y_offset': 0, 'color': '#FEF3C7'},
            {'type': 'emotions', 'label': '😊 Customer Emotions', 'y_offset': 120, 'color': '#FCE7F3'},
            {'type': 'pain_points', 'label': '😞 Pain Points & Challenges', 'y_offset': 240, 'color': '#FEE2E2'},
            {'type': 'opportunities', 'label': '🚀 Opportunities & Solutions', 'y_offset': 360, 'color': '#D1FAE5'}
        ]
        
        for lane in lane_configs:
            lane_elements = elements_by_type.get(lane['type'], [])
            if lane_elements:
                # Lane header
                lane_header_result = self.miro_client.create_shape(
                    board_id=board_id,
                    content=lane['label'],
                    x=phase_x - 300,
                    y=base_y + lane['y_offset'],
                    shape_type='rectangle',
                    color='#F1F5F9',
                    width=200,
                    height=40
                )
                if lane_header_result['success']:
                    elements_created.append(f'lane_header_{phase_index}_{lane["type"]}')
                
                # Lane elements
                for i, element in enumerate(lane_elements[:4]):  # Limit to 4 per lane for clean layout
                    element_x = phase_x - 50 + (i * 180)
                    element_y = base_y + lane['y_offset']
                    
                    # Use appropriate color for element type
                    element_color = parser.miro_sticky_colors.get(element['color'], 'yellow')
                    
                    element_result = self.miro_client.create_sticky_note(
                        board_id=board_id,
                        content=element['content'],
                        x=element_x,
                        y=element_y,
                        color=element_color,
                        width=160
                    )
                    if element_result['success']:
                        elements_created.append(f'phase_{phase_index}_{element["id"]}')
        
        return elements_created
    
    def _categorize_phase_elements(self, elements: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize elements by type for structured layout"""
        categorized = {
            'actions': [],
            'emotions': [],
            'pain_points': [],
            'opportunities': [],
            'other': []
        }
        
        for element in elements:
            category = element.get('category', 'other')
            
            # Map categories to journey lanes
            if category in ['actions', 'touchpoint']:
                categorized['actions'].append(element)
            elif category in ['emotions', 'emotion']:
                categorized['emotions'].append(element)
            elif category in ['pain_points', 'pain-point']:
                categorized['pain_points'].append(element)
            elif category in ['recommendations', 'opportunities', 'insights']:
                categorized['opportunities'].append(element)
            else:
                categorized['other'].append(element)
        
        return categorized
    
    def _get_phase_icon(self, phase_title: str) -> str:
        """Get appropriate icon for journey phase"""
        title_lower = phase_title.lower()
        if 'discovery' in title_lower or 'awareness' in title_lower:
            return '🔍'
        elif 'research' in title_lower or 'evaluation' in title_lower:
            return '🔬'
        elif 'purchase' in title_lower or 'decision' in title_lower:
            return '🛒'
        elif 'delivery' in title_lower or 'experience' in title_lower:
            return '📦'
        elif 'loyalty' in title_lower or 'advocacy' in title_lower:
            return '💝'
        else:
            return '⭐'
    
    def _simplify_phase_name(self, phase_title: str) -> str:
        """Simplify phase title to 1-2 words"""
        title_lower = phase_title.lower()
        
        # Map common patterns to concise names
        if 'discovery' in title_lower or 'awareness' in title_lower:
            return 'Discovery'
        elif 'research' in title_lower or 'evaluation' in title_lower:
            return 'Research'
        elif 'purchase' in title_lower or 'decision' in title_lower:
            return 'Purchase'
        elif 'delivery' in title_lower or 'post-purchase' in title_lower or 'experience' in title_lower:
            return 'Experience'
        elif 'loyalty' in title_lower or 'advocacy' in title_lower:
            return 'Loyalty'
        else:
            # Extract first 1-2 meaningful words
            words = phase_title.split()
            meaningful_words = [w for w in words if len(w) > 2 and w.lower() not in ['the', 'and', 'for', 'with']]
            if meaningful_words:
                return ' '.join(meaningful_words[:2])
            else:
                return phase_title[:15] + '...' if len(phase_title) > 15 else phase_title
    
    def _create_journey_flow_arrow(self, board_id: str, start_x: float, end_x: float, y: float) -> List[str]:
        """Create flow arrow between journey phases"""
        elements_created = []
        
        # Create arrow line
        arrow_result = self.miro_client.create_line(
            board_id=board_id,
            start_x=start_x,
            start_y=y,
            end_x=end_x,
            end_y=y,
            style='normal',
            color='#6B7280',
            width=3
        )
        if arrow_result['success']:
            elements_created.append(f'flow_arrow_{start_x}')
        
        return elements_created
    
    def _create_insights_summary(self, board_id: str, sections: List[Dict], 
                                start_x: float, summary_y: float) -> List[str]:
        """Create journey insights summary section"""
        elements_created = []
        
        # Summary header
        summary_header_result = self.miro_client.create_shape(
            board_id=board_id,
            content="📊 Journey Insights & Key Findings",
            x=start_x + 800,
            y=summary_y,
            shape_type='round_rectangle',
            color='#7C3AED',
            width=800,
            height=60
        )
        if summary_header_result['success']:
            elements_created.append('insights_header')
        
        # Key metrics and insights
        total_pain_points = sum(len([e for e in s.get('elements', []) if e.get('category') == 'pain_points']) for s in sections)
        total_opportunities = sum(len([e for e in s.get('elements', []) if e.get('category') in ['recommendations', 'opportunities']]) for s in sections)
        
        insights_text = f"🔴 {total_pain_points} Pain Points Identified\n🟢 {total_opportunities} Improvement Opportunities\n📈 {len(sections)} Journey Phases Analyzed"
        
        insights_result = self.miro_client.create_sticky_note(
            board_id=board_id,
            content=insights_text,
            x=start_x + 800,
            y=summary_y + 100,
            color='light_yellow',
            width=300
        )
        if insights_result['success']:
            elements_created.append('journey_insights')
        
        return elements_created
    
    def _create_claude_journey_header(self, board_id: str, claude_analysis: Dict) -> List[str]:
        """Create professional header based on Claude's analysis"""
        elements_created = []
        
        # Main title from Claude
        title_result = self.miro_client.create_shape(
            board_id=board_id,
            content=f"🧠 {claude_analysis.get('journey_title', 'Customer Journey Map')}",
            x=0,
            y=-400,
            shape_type='round_rectangle',
            color='#1E3A8A',
            width=1400,
            height=80
        )
        if title_result['success']:
            elements_created.append('claude_title')
        
        # Claude analysis badge
        claude_badge_result = self.miro_client.create_shape(
            board_id=board_id,
            content="🤖 Analyzed by Claude AI • UX Expert • Zero Data Loss",
            x=0,
            y=-300,
            shape_type='rectangle',
            color='#10B981',
            width=800,
            height=50
        )
        if claude_badge_result['success']:
            elements_created.append('claude_badge')
        
        # Key insights overview
        key_insights = claude_analysis.get('key_insights', {})
        overview_text = f"📊 {len(claude_analysis.get('journey_phases', []))} Journey Phases • {key_insights.get('total_touchpoints', 0)} Touchpoints • {key_insights.get('total_pain_points', 0)} Pain Points • {key_insights.get('total_opportunities', 0)} Opportunities"
        
        overview_result = self.miro_client.create_text(
            board_id=board_id,
            content=overview_text,
            x=0,
            y=-200,
            font_size=16,
            color='#64748B'
        )
        if overview_result['success']:
            elements_created.append('claude_overview')
        
        return elements_created
    
    def _create_claude_structured_phase(self, board_id: str, phase: Dict, phase_x: float, 
                                       base_y: float, phase_index: int) -> List[str]:
        """Create a structured phase based on Claude's analysis"""
        elements_created = []
        
        # Phase header with concise name
        phase_icon = phase.get('phase_icon', '⭐')
        phase_name = phase.get('phase_name', f'Phase {phase_index + 1}')
        phase_description = phase.get('phase_description', '')
        
        # Create concise header with just icon + name
        header_text = f"{phase_icon} {phase_name}"
        
        header_result = self.miro_client.create_shape(
            board_id=board_id,
            content=header_text,
            x=phase_x,
            y=base_y - 150,
            shape_type='round_rectangle',
            color='#F8FAFC',
            width=800,
            height=60
        )
        if header_result['success']:
            elements_created.append(f'claude_phase_header_{phase_index}')
        
        # Create description underneath the header
        if phase_description:
            description_result = self.miro_client.create_text(
                board_id=board_id,
                content=phase_description,
                x=phase_x,
                y=base_y - 80,
                font_size=12,
                color='#64748B'
            )
            if description_result['success']:
                elements_created.append(f'claude_phase_description_{phase_index}')
        
        # Create swim lanes based on Claude's structure
        swim_lanes = phase.get('swim_lanes', {})
        
        lane_configs = [
            {'key': 'touchpoints', 'label': '🎯 Touchpoints & Actions', 'y_offset': 50, 'color': 'yellow'},
            {'key': 'emotions', 'label': '😊 Customer Emotions', 'y_offset': 200, 'color': 'light_pink'},
            {'key': 'pain_points', 'label': '😞 Pain Points', 'y_offset': 350, 'color': 'red'},
            {'key': 'opportunities', 'label': '🚀 Opportunities', 'y_offset': 500, 'color': 'light_green'}
        ]
        
        for lane_config in lane_configs:
            lane_items = swim_lanes.get(lane_config['key'], [])
            if lane_items:
                # Lane header
                lane_header_result = self.miro_client.create_shape(
                    board_id=board_id,
                    content=lane_config['label'],
                    x=phase_x - 350,
                    y=base_y + lane_config['y_offset'],
                    shape_type='rectangle',
                    color='#F8FAFC',
                    width=250,
                    height=40
                )
                if lane_header_result['success']:
                    elements_created.append(f'claude_lane_header_{phase_index}_{lane_config["key"]}')
                
                # Lane elements with proper spacing
                for i, item in enumerate(lane_items[:5]):  # Limit to 5 for clean layout
                    element_x = phase_x - 200 + (i * 160)
                    element_y = base_y + lane_config['y_offset']
                    
                    # Add importance/severity indicators
                    content = item.get('content', '')
                    if 'importance' in item:
                        importance_indicator = {'high': '🔥', 'medium': '⚡', 'low': '💡'}.get(item['importance'], '')
                        content = f"{importance_indicator} {content}"
                    elif 'severity' in item:
                        severity_indicator = {'high': '🚨', 'medium': '⚠️', 'low': '💭'}.get(item['severity'], '')
                        content = f"{severity_indicator} {content}"
                    elif 'impact' in item:
                        impact_indicator = {'high': '🎯', 'medium': '📈', 'low': '💡'}.get(item['impact'], '')
                        content = f"{impact_indicator} {content}"
                    
                    element_result = self.miro_client.create_sticky_note(
                        board_id=board_id,
                        content=content,
                        x=element_x,
                        y=element_y,
                        color=lane_config['color'],
                        width=140
                    )
                    if element_result['success']:
                        elements_created.append(f'claude_element_{phase_index}_{lane_config["key"]}_{i}')
        
        return elements_created
    
    def _create_claude_insights_summary(self, board_id: str, claude_analysis: Dict,
                                       start_x: float, summary_y: float) -> List[str]:
        """Create insights summary from Claude's analysis"""
        elements_created = []
        
        key_insights = claude_analysis.get('key_insights', {})
        
        # Summary header
        summary_header_result = self.miro_client.create_shape(
            board_id=board_id,
            content="🧠 Claude AI Journey Insights & Recommendations",
            x=start_x + 1000,
            y=summary_y,
            shape_type='round_rectangle',
            color='#7C3AED',
            width=1000,
            height=60
        )
        if summary_header_result['success']:
            elements_created.append('claude_insights_header')
        
        # Critical issues
        critical_issues = key_insights.get('critical_issues', [])
        if critical_issues:
            issues_text = "🚨 CRITICAL ISSUES:\n" + "\n".join([f"• {issue}" for issue in critical_issues[:3]])
            issues_result = self.miro_client.create_sticky_note(
                board_id=board_id,
                content=issues_text,
                x=start_x + 700,
                y=summary_y + 100,
                color='red',
                width=280
            )
            if issues_result['success']:
                elements_created.append('claude_critical_issues')
        
        # Top recommendations
        top_recommendations = key_insights.get('top_recommendations', [])
        if top_recommendations:
            recommendations_text = "🎯 TOP RECOMMENDATIONS:\n" + "\n".join([f"• {rec}" for rec in top_recommendations[:3]])
            rec_result = self.miro_client.create_sticky_note(
                board_id=board_id,
                content=recommendations_text,
                x=start_x + 1000,
                y=summary_y + 100,
                color='light_green',
                width=280
            )
            if rec_result['success']:
                elements_created.append('claude_recommendations')
        
        # Key metrics
        metrics_text = f"""📊 JOURNEY METRICS:
🎯 Touchpoints: {key_insights.get('total_touchpoints', 0)}
😞 Pain Points: {key_insights.get('total_pain_points', 0)}
🚀 Opportunities: {key_insights.get('total_opportunities', 0)}
📈 Phases: {len(claude_analysis.get('journey_phases', []))}"""
        
        metrics_result = self.miro_client.create_sticky_note(
            board_id=board_id,
            content=metrics_text,
            x=start_x + 1300,
            y=summary_y + 100,
            color='light_yellow',
            width=280
        )
        if metrics_result['success']:
            elements_created.append('claude_metrics')
        
        return elements_created