"""
AI Presentation Generator (FastAPI) - Original FastAPI-based presentation generation service
Transform journey maps and PDFs into professional presentations using dual AI analysis
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
import asyncio
from typing import Optional, Dict, Any, List
import json
from pathlib import Path
import anthropic
import openai
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
import PyPDF2
import markdown
from datetime import datetime
# Removed FLUX/replicate imports - using Claude 4 only
import requests

app = FastAPI(title="AI Presentation Generator", description="FastAPI-based presentation generation service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job tracking system
job_statuses: Dict[str, Dict[str, Any]] = {}

# Initialize AI clients
anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Create necessary directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("generated_content", exist_ok=True)
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

def extract_content_from_file(file_path: str, file_extension: str) -> str:
    """Extract text content from uploaded files"""
    try:
        print(f"Extracting content from: {file_path} (type: {file_extension})")
        
        if file_extension.lower() == 'pdf':
            # Extract PDF text using PyPDF2
            pdf_text = ""
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                print(f"PDF has {len(pdf_reader.pages)} pages")
                for i, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    pdf_text += page_text + "\n"
                    print(f"  Page {i+1}: {len(page_text)} characters")
            print(f"Total PDF content extracted: {len(pdf_text)} characters")
            return pdf_text
        
        elif file_extension.lower() == 'json':
            # Parse JSON content
            with open(file_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
                json_text = json.dumps(json_data, indent=2)
                print(f"JSON content extracted: {len(json_text)} characters")
                return json_text
        
        elif file_extension.lower() in ['md', 'markdown']:
            # Convert Markdown to plain text
            with open(file_path, 'r', encoding='utf-8') as f:
                markdown_content = f.read()
                html_content = markdown.markdown(markdown_content)
                # Simple HTML to text conversion
                import re
                text_content = re.sub('<[^<]+?>', '', html_content)
                print(f"Markdown content extracted: {len(text_content)} characters")
                return text_content
        
        else:
            # Plain text files
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                print(f"Text content extracted: {len(content)} characters")
                print(f"Content preview: {content[:200]}...")
                return content
    
    except Exception as e:
        error_msg = f"Error extracting content: {str(e)}"
        print(f"❌ {error_msg}")
        return error_msg

async def analyze_content_with_ai(content: str, file_name: str) -> Dict[str, Any]:
    """Analyze content using Claude 4 for intelligent presentation structure"""
    try:
        # Simplified Claude 4 prompt focused on content generation
        claude_prompt = """I am an expert Market Researcher and Executive Storyteller with extensive experience creating high-impact business presentations. Analyze this content from """ + file_name + """ and create a professional presentation:
        
        """ + content[:12000] + """
        
        Create a business presentation with 6-8 slides. For each slide, provide:
        - A clear, compelling title
        - 3-5 bullet points with key insights
        - Brief visual description for infographics

        Return your analysis as valid JSON with this exact structure:

        {
            "title": "Executive Presentation Title",
            "slides": [
                {
                    "title": "Slide Title",
                    "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
                    "visual_description": "Description of chart/infographic for this slide"
                }
            ]
        }

        Focus on clear, actionable content suitable for PowerPoint slides."""
        
        print(f"\n🧠 Using Claude 4 Extended Thinking Analysis...")
        print(f"📝 Prompt length: {len(claude_prompt)} characters")
        print(f"📄 Content length: {len(content)} characters")
        
        claude_response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=6000,
            messages=[{"role": "user", "content": claude_prompt}]
        )
        
        print(f"✅ Claude 4 response received: {len(claude_response.content[0].text)} characters")
        
        # Parse Claude response
        claude_analysis = claude_response.content[0].text
        print(f"Raw Claude response length: {len(claude_analysis)}")
        print(f"Claude response preview: {claude_analysis[:500]}...")
        
        # Try to extract JSON from Claude's response with robust parsing
        import re
        
        # First try to find JSON between ```json and ``` markers (non-greedy)
        json_block_match = re.search(r'```json\s*(\{.*?\})\s*```', claude_analysis, re.DOTALL)
        if json_block_match:
            json_content = json_block_match.group(1)
            print(f"✅ Found JSON in code block")
        else:
            # Try to find complete JSON object from first { to matching }
            brace_count = 0
            start_pos = claude_analysis.find('{')
            if start_pos != -1:
                for i, char in enumerate(claude_analysis[start_pos:], start_pos):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_content = claude_analysis[start_pos:i+1]
                            print(f"✅ Found complete JSON object")
                            break
                else:
                    json_content = None
                    print(f"❌ Could not find complete JSON object")
            else:
                json_content = None
                print(f"❌ No JSON found in response")
        
        if json_content:
            try:
                # Clean up common JSON issues from Claude responses
                json_content = json_content.strip()
                # Handle truncated JSON by ensuring it ends properly
                if not json_content.endswith('}'):
                    # Find the last complete object
                    last_brace = json_content.rfind('}')
                    if last_brace > 0:
                        json_content = json_content[:last_brace + 1]
                
                claude_structure = json.loads(json_content)
                print(f"✅ Successfully parsed Claude 4 JSON structure")
                print(f"Presentation title: {claude_structure.get('title', 'No title')}")
                print(f"Number of slides: {len(claude_structure.get('slides', []))}")
                
                # Debug: Print each slide's content
                for i, slide in enumerate(claude_structure.get('slides', [])):
                    print(f"  Slide {i+1}: '{slide.get('title', 'No title')}' - {len(slide.get('content', []))} content points")
                    if slide.get('visual_description'):
                        print(f"    Visual: {slide.get('visual_description', '')[:100]}...")
                        
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse Claude JSON: {e}")
                print(f"JSON content that failed: {json_content[:500]}...")
                print(f"Full JSON content length: {len(json_content) if json_content else 0}")
                # Try to fix common JSON issues
                try:
                    # Remove any trailing text after the last }
                    fixed_json = json_content[:json_content.rfind('}') + 1]
                    claude_structure = json.loads(fixed_json)
                    print(f"✅ Successfully parsed Claude JSON after cleanup")
                except:
                    print(f"❌ JSON cleanup also failed, using fallback structure")
                # Fallback structure
                claude_structure = {
                    "title": "AI-Generated Presentation",
                    "slides": [
                        {
                            "title": "Introduction",
                            "content": ["Overview of key concepts", "Main objectives", "Expected outcomes"],
                            "visual_description": "Title slide with clean design and data highlights"
                        }
                    ]
                }
        else:
            print(f"❌ No JSON found in Claude response")
            print(f"Full Claude response: {claude_analysis}")
            # Fallback structure
            claude_structure = {
                "title": f"Presentation from {file_name}",
                "slides": [
                    {
                        "title": "Content Overview", 
                        "content": ["Key information extracted", "Main points identified", "Next steps outlined"],
                        "visual_description": "Clean layout with data visualization"
                    }
                ]
            }
        
        # Return the structured content directly from Claude 4
        print(f"✅ Claude 4 analysis complete")
        
        return {
            "structure": claude_structure,
            "success": True
        }
    
    except Exception as e:
        print(f"❌ Error in Claude analysis: {str(e)}")
        return {
            "structure": {
                "title": f"Presentation from {file_name}",
                "slides": [
                    {
                        "title": "Content Overview",
                        "content": ["Key information extracted", "Main points identified", "Next steps outlined"],
                        "visual_description": "Clean bullet point layout"
                    }
                ]
            },
            "success": False,
            "error": str(e)
        }

# FLUX image generation removed - using Claude 4 only for content generation

# Visual content creation simplified - using Claude 4 content directly

def analyze_layout_capabilities(layout):
    """Analyze a layout's capabilities for content placement"""
    capabilities = {
        'has_title': False,
        'has_content': False,
        'has_chart': False,
        'has_image': False,
        'text_placeholders': [],
        'image_placeholders': [],
        'content_type': 'unknown'
    }
    
    try:
        # Check for title placeholder
        for shape in layout.placeholders:
            placeholder_type = getattr(shape.placeholder_format, 'type', None)
            
            if placeholder_type == 1:  # TITLE
                capabilities['has_title'] = True
            elif placeholder_type == 2:  # BODY/CONTENT
                capabilities['has_content'] = True
                capabilities['text_placeholders'].append(shape.placeholder_format.idx)
            elif placeholder_type == 7:  # OBJECT (can hold text or images)
                capabilities['has_content'] = True
                capabilities['text_placeholders'].append(shape.placeholder_format.idx)
            elif placeholder_type == 18:  # PICTURE
                capabilities['has_image'] = True
                capabilities['image_placeholders'].append(shape.placeholder_format.idx)
        
        # Categorize layout based on capabilities
        if capabilities['has_title'] and capabilities['has_content']:
            capabilities['content_type'] = 'title_and_content'
        elif capabilities['has_content'] and len(capabilities['text_placeholders']) > 0:
            capabilities['content_type'] = 'text_content'
        elif capabilities['has_image'] and not capabilities['has_content']:
            capabilities['content_type'] = 'image_only'
        elif layout.name.lower() == 'chart':
            capabilities['content_type'] = 'chart'
        else:
            capabilities['content_type'] = 'basic'
            
    except Exception as e:
        print(f"⚠️ Error analyzing layout {layout.name}: {e}")
    
    return capabilities

def select_optimal_layout(prs, slide_content, slide_index=0):
    """Select Layout 1 for all content slides as instructed"""
    content_points = slide_content.get('content', [])
    layout_type = slide_content.get('layout_type', 'bullet_points')
    has_data = slide_content.get('has_data', False)
    needs_images = slide_content.get('needs_images', False)
    content_analysis = slide_content.get('content_analysis', '')
    
    print(f"🤖 AI Analysis for slide '{slide_content.get('title', 'Unknown')}':")
    print(f"   Layout type: {layout_type}")
    print(f"   Has data: {has_data}")
    print(f"   Needs images: {needs_images}")
    print(f"   Analysis: {content_analysis}")
    
    # Force selection of Layout 1 for all content slides
    if len(prs.slide_layouts) > 1:
        layout_1 = prs.slide_layouts[1]
        layout_1_capabilities = analyze_layout_capabilities(layout_1)
        
        print(f"🎯 Using Layout 1 ('{layout_1.name}') as instructed")
        print(f"   Capabilities: title={layout_1_capabilities['has_title']}, text_placeholders={layout_1_capabilities['text_placeholders']}, image_placeholders={layout_1_capabilities['image_placeholders']}")
        return 1, layout_1, layout_1_capabilities
    else:
        # Fallback if Layout 1 doesn't exist
        fallback_layout = prs.slide_layouts[0]
        fallback_capabilities = analyze_layout_capabilities(fallback_layout)
        print(f"⚠️ Layout 1 not available, using fallback Layout 0 ('{fallback_layout.name}')")
        return 0, fallback_layout, fallback_capabilities

def insert_content_into_placeholder(slide, placeholder_idx, content_text, is_title=False):
    """Properly insert content into a specific placeholder element"""
    try:
        for shape in slide.placeholders:
            if shape.placeholder_format.idx == placeholder_idx:
                if hasattr(shape, 'text_frame') and shape.text_frame is not None:
                    if is_title:
                        # For titles, set directly
                        shape.text = content_text
                        if hasattr(shape.text_frame.paragraphs[0], 'font'):
                            shape.text_frame.paragraphs[0].font.size = Pt(24)
                            shape.text_frame.paragraphs[0].font.bold = True
                    else:
                        # For content, handle as bullet points preserving template colors
                        text_frame = shape.text_frame
                        text_frame.clear()
                        
                        if isinstance(content_text, list):
                            for i, point in enumerate(content_text):
                                point_text = str(point).strip()
                                if not point_text:
                                    continue
                                    
                                if i == 0:
                                    p = text_frame.paragraphs[0]
                                    p.text = point_text
                                else:
                                    p = text_frame.add_paragraph()
                                    p.text = point_text
                                
                                # Apply consistent sizing while preserving template colors
                                p.font.size = Pt(16)
                                p.level = 0
                                # Maintain bullet formatting from master layout
                                if hasattr(text_frame, 'margin_left'):
                                    text_frame.margin_left = Inches(0.25)
                        else:
                            text_frame.paragraphs[0].text = str(content_text)
                            text_frame.paragraphs[0].font.size = Pt(16)
                            # Let template colors show through by not setting color
                    
                    print(f"✅ Content inserted into placeholder {placeholder_idx}")
                    return True
                else:
                    print(f"⚠️ Placeholder {placeholder_idx} cannot hold text")
                    return False
        
        print(f"❌ Placeholder {placeholder_idx} not found")
        return False
    except Exception as e:
        print(f"❌ Error inserting content into placeholder {placeholder_idx}: {e}")
        return False

def add_placeholder_image(slide, placeholder_idx, image_text="[Image Placeholder]"):
    """Add placeholder text for image content areas"""
    try:
        for shape in slide.placeholders:
            if shape.placeholder_format.idx == placeholder_idx:
                placeholder_type = getattr(shape.placeholder_format, 'type', None)
                if placeholder_type == 18:  # PICTURE placeholder
                    # Add a text box over the image placeholder area
                    try:
                        # Get placeholder position and size
                        left = shape.left
                        top = shape.top
                        width = shape.width
                        height = shape.height
                        
                        # Add text box in the image placeholder area
                        text_box = slide.shapes.add_textbox(left, top, width, height)
                        text_frame = text_box.text_frame
                        text_frame.text = image_text
                        
                        # Style the placeholder text
                        text_frame.paragraphs[0].font.size = Pt(14)
                        text_frame.paragraphs[0].font.italic = True
                        
                        print(f"✅ Added image placeholder text at position {placeholder_idx}")
                        return True
                    except Exception as e:
                        print(f"⚠️ Could not add text to image placeholder {placeholder_idx}: {e}")
                        return False
        
        print(f"❌ Image placeholder {placeholder_idx} not found")
        return False
    except Exception as e:
        print(f"❌ Error adding image placeholder {placeholder_idx}: {e}")
        return False

def add_custom_image_to_placeholder(slide, placeholder_idx, image_path):
    """Insert a custom image (like FLUX-generated infographic) into a placeholder"""
    try:
        if not os.path.exists(image_path):
            print(f"❌ Image file not found: {image_path}")
            return False
            
        for shape in slide.placeholders:
            if shape.placeholder_format.idx == placeholder_idx:
                placeholder_type = getattr(shape.placeholder_format, 'type', None)
                
                # Handle different placeholder types that can accept images
                if placeholder_type in [18, 7]:  # PICTURE or OBJECT placeholder
                    try:
                        # Get placeholder position and dimensions
                        left = shape.left
                        top = shape.top
                        width = shape.width
                        height = shape.height
                        
                        # Add image to slide at placeholder position
                        picture = slide.shapes.add_picture(image_path, left, top, width, height)
                        
                        # Remove the original placeholder shape
                        sp = shape._element
                        sp.getparent().remove(sp)
                        
                        print(f"✅ Inserted custom image into placeholder {placeholder_idx}")
                        return True
                        
                    except Exception as e:
                        print(f"⚠️ Error inserting image into placeholder {placeholder_idx}: {e}")
                        return False
                        
                elif placeholder_type == 2:  # BODY/CONTENT placeholder - can't hold images directly
                    print(f"⚠️ Placeholder {placeholder_idx} is text-only, cannot insert image")
                    return False
                    
        print(f"❌ Placeholder {placeholder_idx} not found or not suitable for images")
        return False
        
    except Exception as e:
        print(f"❌ Error adding custom image to placeholder {placeholder_idx}: {e}")
        return False

def apply_master_layout_branding(slide, slide_number, total_slides):
    """Apply NXT Humans branding elements to slide using master layout integration"""
    try:
        from pptx.dml.color import RGBColor
        from pptx.enum.text import PP_ALIGN
        
        print(f"🎨 Applying master layout branding to slide {slide_number}")
        
        # NXT Humans brand colors
        nxt_cyan = RGBColor(1, 196, 200)      # #01C4C8
        nxt_dark_bg = RGBColor(18, 27, 38)    # #121B26
        nxt_grey = RGBColor(90, 98, 117)      # #5A6275
        
        # Add consistent footer branding (respecting existing layout)
        footer_left = Inches(0.5)
        footer_top = Inches(7.0) 
        footer_width = Inches(6.0)
        footer_height = Inches(0.4)
        
        # Check if footer area conflicts with existing placeholders
        footer_conflicts = False
        for shape in slide.placeholders:
            if hasattr(shape, 'top') and hasattr(shape, 'height'):
                shape_bottom = shape.top + shape.height
                if shape_bottom > Inches(6.8):  # Footer zone
                    footer_conflicts = True
                    break
        
        if not footer_conflicts:
            # Add footer with NXT Humans branding
            footer_box = slide.shapes.add_textbox(footer_left, footer_top, footer_width, footer_height)
            footer_frame = footer_box.text_frame
            footer_frame.text = "NXT Humans AI CX Workbench | Intelligence Augmentation Suite"
            footer_frame.paragraphs[0].font.size = Pt(10)
            footer_frame.paragraphs[0].font.color.rgb = nxt_cyan
            footer_frame.paragraphs[0].alignment = PP_ALIGN.LEFT
            
            # Add page numbering
            page_left = Inches(8.5)
            page_box = slide.shapes.add_textbox(page_left, footer_top, Inches(1.0), footer_height)
            page_frame = page_box.text_frame
            page_frame.text = f"{slide_number}/{total_slides}"
            page_frame.paragraphs[0].font.size = Pt(10)
            page_frame.paragraphs[0].font.color.rgb = nxt_grey
            page_frame.paragraphs[0].alignment = PP_ALIGN.RIGHT
            
            print(f"✅ Added NXT Humans footer branding and page {slide_number}/{total_slides}")
        else:
            print(f"⚠️ Footer area conflicts with existing placeholders - skipping footer")
        
        # Apply consistent sizing while preserving template colors (master layout integration)
        for shape in slide.placeholders:
            try:
                placeholder_type = getattr(shape.placeholder_format, 'type', None)
                if placeholder_type == 1 and hasattr(shape, 'text_frame'):  # TITLE
                    # Apply title formatting while preserving template colors
                    if shape.text_frame and shape.text_frame.paragraphs:
                        for paragraph in shape.text_frame.paragraphs:
                            if paragraph.font:
                                # Preserve template text color, only adjust size and weight
                                paragraph.font.bold = True
                                if paragraph.font.size is None or paragraph.font.size < Pt(24):
                                    paragraph.font.size = Pt(24)
                elif placeholder_type in [2, 7] and hasattr(shape, 'text_frame'):  # BODY/CONTENT
                    # Apply content formatting while preserving template colors
                    if shape.text_frame and shape.text_frame.paragraphs:
                        for paragraph in shape.text_frame.paragraphs:
                            if paragraph.font:
                                # Preserve template text color, only adjust size
                                if paragraph.font.size is None or paragraph.font.size < Pt(16):
                                    paragraph.font.size = Pt(16)
            except Exception as e:
                print(f"⚠️ Could not apply styling to placeholder: {e}")
                continue
        
        print(f"✅ Applied master layout styling to {len(slide.placeholders)} placeholders")
        return True
        
    except Exception as e:
        print(f"❌ Error applying master layout branding: {e}")
        return False

def create_powerpoint_presentation(analysis: Dict[str, Any], output_path: str) -> bool:
    """Create PowerPoint presentation from AI analysis using NXT Humans template with intelligent layout selection"""
    try:
        print(f"\n🎯 Starting PowerPoint creation...")
        print(f"📊 Analysis structure: {analysis.get('structure', {}).get('title', 'No title')}")
        print(f"📄 Number of slides to create: {len(analysis.get('structure', {}).get('slides', []))}")
        
        # Use NXT Humans template by default
        template_path = "templates/NXT_HUMANS_WORKING_TEMPLATE.pptx"
        if os.path.exists(template_path):
            prs = Presentation(template_path)
            print(f"✅ Using NXT Humans template: {template_path}")
        else:
            # Fallback to blank presentation
            prs = Presentation()
            print(f"⚠️ Template not found at {template_path}, using blank presentation")
            print(f"📁 Current working directory: {os.getcwd()}")
            print(f"📂 Available files in templates/: {os.listdir('templates') if os.path.exists('templates') else 'templates directory not found'}")
        
        print(f"\n🎨 Available slide layouts: {len(prs.slide_layouts)}")
        
        # Check if template is corrupted (0 layouts) and create fallback
        if len(prs.slide_layouts) == 0:
            print("⚠️ Template is corrupted (0 layouts)! Creating blank presentation as fallback...")
            prs = Presentation()  # Create blank presentation with default layouts
            print(f"📝 Fallback: Created blank presentation with {len(prs.slide_layouts)} default layouts")
            for i, layout in enumerate(prs.slide_layouts):
                print(f"  Layout {i}: {layout.name}")
        
        # Analyze layout capabilities
        print(f"\n🔍 Analyzing template layout capabilities...")
        title_layouts = []
        content_layouts = []
        chart_layouts = []
        
        for i, layout in enumerate(prs.slide_layouts):
            capabilities = analyze_layout_capabilities(layout)
            print(f"  Layout {i} ('{layout.name}'): {capabilities['content_type']} - title:{capabilities['has_title']}, content:{len(capabilities['text_placeholders'])}")
            
            if capabilities['content_type'] == 'title_and_content':
                title_layouts.append((i, layout))
            elif capabilities['content_type'] == 'text_content':
                content_layouts.append((i, layout))
            elif capabilities['content_type'] == 'chart':
                chart_layouts.append((i, layout))
        
        print(f"📋 Layout categories found:")
        print(f"   Title & Content layouts: {len(title_layouts)}")
        print(f"   Text Content layouts: {len(content_layouts)}")
        print(f"   Chart layouts: {len(chart_layouts)}")
        
        # When using template, clear existing slides if any
        if len(prs.slides) > 0:
            print(f"⚠️ Template has {len(prs.slides)} existing slides - will add new content slides")
        
        # Add title slide using intelligent layout selection (title slide can use any layout)
        print(f"\n📝 Creating title slide...")
        
        # Find best title slide layout (prefer "Title and Content" or simple layouts)
        # Safely determine title layout index within available layouts
        max_layout_index = len(prs.slide_layouts) - 1
        title_layout_index = min(35, max_layout_index) if max_layout_index >= 0 else 0
        print(f"📊 Template has {len(prs.slide_layouts)} layouts available (0-{max_layout_index})")
        
        # Look for better title slide options
        for i, layout in enumerate(prs.slide_layouts):
            capabilities = analyze_layout_capabilities(layout)
            if capabilities['has_title'] and (not capabilities['has_image'] or layout.name in ['Title and Content', '1', '2']):
                title_layout_index = i
                break
        
        title_layout = prs.slide_layouts[title_layout_index]
        slide = prs.slides.add_slide(title_layout)
        print(f"📝 Added title slide using layout {title_layout_index}: '{title_layout.name}' (title slides can use optimal layout)")
        print(f"📋 Note: Content slides will use Layout 1 as instructed")
        
        # Apply master layout branding to title slide
        apply_master_layout_branding(slide, 0, len(analysis["structure"]["slides"]) + 1)
        
        # Set title using the intelligent title detection
        title_set = False
        title_text = analysis["structure"]["title"]
        
        # Try standard title shape first
        if slide.shapes.title:
            try:
                slide.shapes.title.text = title_text
                print(f"✅ Set title via shapes.title: {title_text}")
                title_set = True
            except Exception as e:
                print(f"⚠️ Failed to set title via shapes.title: {e}")
        
        # Try title placeholder if standard method failed
        if not title_set:
            for shape in slide.placeholders:
                try:
                    placeholder_type = getattr(shape.placeholder_format, 'type', None)
                    if placeholder_type == 1:  # TITLE placeholder
                        shape.text = title_text
                        print(f"✅ Set title via TITLE placeholder (idx {shape.placeholder_format.idx}): {title_text}")
                        title_set = True
                        break
                except Exception as e:
                    continue
        
        # Manual title if all else fails
        if not title_set:
            print("⚠️ Creating manual title text box...")
            try:
                left = Inches(1)
                top = Inches(1)
                width = Inches(8)
                height = Inches(1.5)
                title_textbox = slide.shapes.add_textbox(left, top, width, height)
                title_frame = title_textbox.text_frame
                title_frame.text = title_text
                title_frame.paragraphs[0].font.size = Pt(36)
                title_frame.paragraphs[0].font.bold = True
                print(f"✅ Added manual title: {title_text}")
            except Exception as e:
                print(f"❌ Failed to add manual title: {e}")
        
        # Enhanced subtitle detection with multiple strategies
        subtitle_set = False
        subtitle_text = f"Generated by NXT Humans AI • {datetime.now().strftime('%B %d, %Y')}"
        print(f"🔍 Looking for subtitle placeholder...")
        
        for shape in slide.placeholders:
            try:
                placeholder_type = getattr(shape.placeholder_format, 'type', None)
                placeholder_idx = shape.placeholder_format.idx
                print(f"   - Checking placeholder idx: {placeholder_idx}, type: {placeholder_type}")
                
                # Try common subtitle placeholder types and indices
                if (placeholder_type == 2 or  # BODY
                    placeholder_type == 7 or  # OBJECT
                    placeholder_idx in [1, 2, 10, 11]):
                    
                    # Skip if this is the title placeholder
                    if placeholder_type == 1:
                        continue
                        
                    shape.text = subtitle_text
                    print(f"✅ Set subtitle at idx {placeholder_idx}: {subtitle_text}")
                    subtitle_set = True
                    break
            except Exception as e:
                print(f"   - Failed to set subtitle at idx {getattr(shape.placeholder_format, 'idx', 'unknown')}: {e}")
                continue
        
        if not subtitle_set:
            print("⚠️ No subtitle placeholder found, attempting manual text box...")
            try:
                # Add manual subtitle text box
                left = Inches(1)
                top = Inches(2.8)
                width = Inches(8)
                height = Inches(1)
                subtitle_textbox = slide.shapes.add_textbox(left, top, width, height)
                subtitle_frame = subtitle_textbox.text_frame
                subtitle_frame.text = subtitle_text
                subtitle_frame.paragraphs[0].font.size = Pt(18)
                print(f"✅ Added manual subtitle: {subtitle_text}")
            except Exception as e:
                print(f"❌ Failed to add manual subtitle: {e}")
        
        # Add content slides using intelligent layout selection
        slide_count = 0
        successful_slides = 0
        failed_slides = 0
        
        for slide_data in analysis["structure"]["slides"]:
            slide_count += 1
            print(f"\n🎯 Creating content slide {slide_count}/{len(analysis['structure']['slides'])}: '{slide_data['title']}'")
            print(f"📝 Content points: {len(slide_data.get('content', []))}")
            if slide_data.get('visual_description'):
                print(f"🎨 Visual description: {slide_data.get('visual_description', '')[:50]}...")
            
            print(f"📄 Processing slide content from Claude 4")
            
            # Use intelligent layout selection based on content type
            layout_index, selected_layout, layout_capabilities = select_optimal_layout(prs, slide_data, slide_count)
            
            slide = prs.slides.add_slide(selected_layout)
            
            # Apply master layout integration and branding
            apply_master_layout_branding(slide, slide_count, len(analysis["structure"]["slides"]))
            
            # Set title using intelligent title detection based on layout capabilities
            title_set = False
            slide_title = slide_data["title"]
            
            # Strategy 1: Use standard title shape if available
            if layout_capabilities['has_title'] and slide.shapes.title:
                try:
                    slide.shapes.title.text = slide_title
                    print(f"✅ Set slide title via shapes.title: {slide_title}")
                    title_set = True
                except Exception as e:
                    print(f"⚠️ Failed to set title via shapes.title: {e}")
            
            # Strategy 2: Use title placeholder from capabilities analysis
            if not title_set:
                for shape in slide.placeholders:
                    try:
                        placeholder_type = getattr(shape.placeholder_format, 'type', None)
                        if placeholder_type == 1:  # TITLE placeholder
                            shape.text = slide_title
                            print(f"✅ Set slide title via TITLE placeholder (idx {shape.placeholder_format.idx}): {slide_title}")
                            title_set = True
                            break
                    except Exception as e:
                        continue
            
            # Strategy 3: Use template-specific title placeholder (placeholder 11 in NXT template)
            if not title_set:
                for shape in slide.placeholders:
                    try:
                        placeholder_idx = shape.placeholder_format.idx
                        if placeholder_idx == 11:  # BODY placeholder used as title in NXT template
                            shape.text = slide_title
                            print(f"✅ Set slide title via template title placeholder (idx {placeholder_idx}): {slide_title}")
                            title_set = True
                            break
                    except Exception as e:
                        continue
            
            # Strategy 4: Manual title as final fallback
            if not title_set:
                print(f"⚠️ No title placeholder found, adding manual title...")
                try:
                    left = Inches(1)
                    top = Inches(0.5)
                    width = Inches(8)
                    height = Inches(1)
                    title_textbox = slide.shapes.add_textbox(left, top, width, height)
                    title_frame = title_textbox.text_frame
                    title_frame.text = slide_title
                    title_frame.paragraphs[0].font.size = Pt(24)
                    title_frame.paragraphs[0].font.bold = True
                    print(f"✅ Added manual title: {slide_title}")
                    title_set = True
                except Exception as e:
                    print(f"❌ Failed to add manual title: {e}")
            
            # Simplified content insertion using Claude 4's content directly
            content_added = False
            
            # Use Claude 4's content directly - simplified processing
            content_points = slide_data.get('content', [])
            visual_description = slide_data.get('visual_description', '')
            
            # Create final content array with bullet points and visual description
            final_content = content_points[:] if content_points else []
            if visual_description:
                final_content.append(f"Visual: {visual_description}")
            
            print(f"🔧 Inserting Claude 4's content:")
            print(f"   Content bullet points: {len(content_points)}")
            print(f"   Visual description: {'Yes' if visual_description else 'No'}")
            print(f"   Available placeholders: {layout_capabilities['text_placeholders']}")
            
            # Strategy 1: Use layout-specific placeholder insertion with priority for best content areas
            if layout_capabilities['text_placeholders'] and content_points:
                # Find the best text placeholder (prioritize OBJECT over BODY for better layout)
                content_placeholder_idx = None
                object_placeholder_idx = None
                body_placeholder_idx = None
                
                for placeholder_idx in layout_capabilities['text_placeholders']:
                    # Check placeholder type and suitability
                    for shape in slide.placeholders:
                        if shape.placeholder_format.idx == placeholder_idx:
                            placeholder_type = getattr(shape.placeholder_format, 'type', None)
                            if placeholder_type == 1:  # TITLE type - skip
                                break
                            elif placeholder_type == 7:  # OBJECT type - preferred for main content
                                object_placeholder_idx = placeholder_idx
                                print(f"📍 Found OBJECT placeholder {placeholder_idx} - preferred for main content")
                                break
                            elif placeholder_type == 2 and placeholder_idx != 11:  # BODY type - but not idx 11 (reserved for title)
                                body_placeholder_idx = placeholder_idx
                                print(f"📍 Found BODY placeholder {placeholder_idx} - secondary choice")
                                break
                
                # Prioritize OBJECT placeholder over BODY for better layout
                if object_placeholder_idx is not None:
                    content_placeholder_idx = object_placeholder_idx
                    print(f"🎯 Using OBJECT placeholder {content_placeholder_idx} for optimal layout")
                elif body_placeholder_idx is not None:
                    content_placeholder_idx = body_placeholder_idx
                    print(f"🎯 Using BODY placeholder {content_placeholder_idx} as fallback")
                
                if content_placeholder_idx is not None:
                    content_added = insert_content_into_placeholder(slide, content_placeholder_idx, final_content, is_title=False)
                    if content_added:
                        successful_slides += 1
                        print(f"✅ Inserted Claude 4's enhanced content ({len(final_content)} elements)")
            
            # Strategy 2: Handle image placeholders (simplified - no FLUX)
            if layout_capabilities['image_placeholders'] and visual_description:
                # Add placeholder text for visual descriptions
                for img_placeholder_idx in layout_capabilities['image_placeholders']:
                    image_text = f"[Infographic: {visual_description[:100]}...]"
                    add_placeholder_image(slide, img_placeholder_idx, image_text)
                print(f"📷 Added visual placeholder for: {visual_description[:50]}...")
            
            # Strategy 3: Fallback to manual content insertion
            if not content_added and final_content:
                print(f"🔄 Fallback: Creating manual content area...")
                try:
                    # Position text box strategically based on layout
                    if layout_capabilities['has_title']:
                        top_position = Inches(2.0)  # Below title
                    else:
                        top_position = Inches(1.0)  # From top
                    
                    left = Inches(1)
                    width = Inches(8.5)
                    height = Inches(5.0)
                    text_box = slide.shapes.add_textbox(left, top_position, width, height)
                    
                    # Use Claude 4's content directly
                    text_frame = text_box.text_frame
                    text_frame.clear()
                    
                    for i, content_element in enumerate(final_content):
                        element_text = str(content_element).strip()
                        if not element_text:
                            continue
                            
                        if i == 0:
                            p = text_frame.paragraphs[0]
                            p.text = element_text
                        else:
                            p = text_frame.add_paragraph()
                            p.text = element_text
                        
                        p.font.size = Pt(16)
                        p.level = 0
                    
                    content_added = True
                    successful_slides += 1
                    print(f"✅ Successfully added Claude 4 content to slide '{slide_data['title']}'")
                    print(f"📊 Content elements: {len(final_content)}")
                    
                except Exception as e:
                    print(f"❌ Error adding content to slide '{slide_data['title']}': {e}")
                    failed_slides += 1
            
            # Track failed slides
            if not content_added:
                print(f"❌ Could not add content to slide '{slide_data['title']}'!")
                failed_slides += 1
            
            # Summary for this slide
            print(f"📋 Slide '{slide_data['title']}' summary:")
            print(f"   ✅ Title set: {title_set}")
            print(f"   ✅ Content added: {content_added}")
            print(f"   🎨 Layout: {selected_layout.name}")
            if layout_capabilities['image_placeholders'] and visual_description:
                print(f"   📷 Visual placeholder added")
        
        print(f"\n📊 Content insertion summary:")
        print(f"   ✅ Successful slides: {successful_slides}")
        print(f"   ❌ Failed slides: {failed_slides}")
        print(f"   📄 Total slides created: {slide_count + 1} (including title slide)")
                
        # Save presentation
        try:
            prs.save(output_path)
            print(f"\n💾 Presentation saved successfully to: {output_path}")
            print(f"📁 File size: {os.path.getsize(output_path) / 1024:.1f} KB")
            return True
        except Exception as e:
            print(f"❌ Failed to save presentation: {e}")
            return False
    
    except Exception as e:
        print(f"❌ PowerPoint creation error: {e}")
        import traceback
        print(f"🔍 Full traceback: {traceback.format_exc()}")
        return False

async def process_presentation_generation(job_id: str, file_ids: list[str], options: dict):
    """Background task for presentation generation"""
    try:
        # Update job status
        job_statuses[job_id] = {
            "status": "processing",
            "progress": 10,
            "message": "Starting content extraction...",
            "steps_completed": ["Job started"],
            "steps_remaining": ["Content extraction", "AI analysis", "Presentation generation", "File export"]
        }
        
        # Extract content from files
        all_content = ""
        file_names = []
        
        for file_id in file_ids:
            # Find file in uploads directory
            upload_files = os.listdir("uploads")
            matching_file = None
            for f in upload_files:
                if f.startswith(file_id):
                    matching_file = f
                    break
            
            if matching_file:
                file_path = f"uploads/{matching_file}"
                file_extension = matching_file.split('.')[-1]
                content = extract_content_from_file(file_path, file_extension)
                all_content += f"\n\n--- Content from {matching_file} ---\n{content}"
                file_names.append(matching_file)
        
        # Update progress
        job_statuses[job_id].update({
            "progress": 30,
            "message": "Content extracted, analyzing with AI...",
            "steps_completed": ["Job started", "Content extraction"],
            "steps_remaining": ["AI analysis", "Presentation generation", "File export"]
        })
        
        # AI analysis with Claude 4 extended thinking
        analysis = await analyze_content_with_ai(all_content, ", ".join(file_names))
        
        # Update progress
        job_statuses[job_id].update({
            "progress": 50,
            "message": "AI analysis complete, preparing PowerPoint...",
            "steps_completed": ["Job started", "Content extraction", "AI analysis"],
            "steps_remaining": ["Presentation generation", "File export"]
        })
        
        # Skip visual generation - using Claude 4 content directly
        print(f"\n📝 Using Claude 4 content directly (no FLUX processing)")
        
        # Update progress - skip to PowerPoint generation
        job_statuses[job_id].update({
            "progress": 70,
            "message": "Claude 4 analysis complete, generating PowerPoint...",
            "steps_completed": ["Job started", "Content extraction", "AI analysis"],
            "steps_remaining": ["Presentation generation", "File export"]
        })
        
        # Generate PowerPoint
        output_filename = f"{job_id}.pptx"
        output_path = f"generated_content/{output_filename}"
        
        success = create_powerpoint_presentation(analysis, output_path)
        
        if success:
            job_statuses[job_id].update({
                "status": "completed",
                "progress": 100,
                "message": "Presentation generated successfully!",
                "steps_completed": ["Job started", "Content extraction", "AI analysis", "Presentation generation", "File export"],
                "steps_remaining": [],
                "download_url": f"/download/{job_id}",
                "file_path": output_path
            })
        else:
            job_statuses[job_id].update({
                "status": "failed",
                "progress": 100,
                "message": "Failed to generate PowerPoint presentation",
                "error": "PowerPoint creation failed"
            })
    
    except Exception as e:
        job_statuses[job_id].update({
            "status": "failed",
            "progress": 100,
            "message": f"Generation failed: {str(e)}",
            "error": str(e)
        })

@app.get("/", response_class=HTMLResponse)
async def home():
    """Main presentation generator interface"""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Presentation Generator (FastAPI)</title>
        <link rel="icon" type="image/svg+xml" href="/static/presentation-favicon.svg">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #121B26 0%, #1a2332 100%);
                color: white;
                min-height: 100vh;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            .title {
                font-size: 2.5rem;
                font-weight: bold;
                color: #7C3AED;
                margin-bottom: 10px;
            }
            .subtitle {
                font-size: 1.2rem;
                color: #94a3b8;
                margin-bottom: 20px;
            }
            .card {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: 12px;
                padding: 30px;
                margin: 20px 0;
            }
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 30px;
            }
            .feature {
                background: rgba(124, 58, 237, 0.1);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: 8px;
                padding: 20px;
                text-align: center;
            }
            .feature-icon {
                font-size: 2rem;
                color: #7C3AED;
                margin-bottom: 10px;
            }
            .upload-area {
                border: 2px dashed #7C3AED;
                border-radius: 8px;
                padding: 40px;
                text-align: center;
                margin: 20px 0;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .upload-area:hover {
                background: rgba(124, 58, 237, 0.1);
            }
            .btn {
                background: linear-gradient(45deg, #7C3AED, #8B5CF6);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                margin: 10px;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
            }
            .status {
                margin: 20px 0;
                padding: 15px;
                border-radius: 6px;
                display: none;
            }
            .status.success {
                background: rgba(34, 197, 94, 0.2);
                border: 1px solid #22c55e;
                color: #22c55e;
            }
            .status.error {
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid #ef4444;
                color: #ef4444;
            }
            .status.info {
                background: rgba(124, 58, 237, 0.2);
                border: 1px solid #7C3AED;
                color: #7C3AED;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="title">🎯 AI Executive Presentation Generator</h1>
                <p class="subtitle">Claude 4 Expert Market Researcher + FLUX Visual Assistant</p>
                <p style="color: #01C4C8; font-weight: 600;">Transform business data into Fortune 500-level executive presentations with AI-powered strategic analysis</p>
                <div style="background: rgba(1,196,200,0.1); border: 1px solid #01C4C8; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #01C4C8; font-weight: 600; margin: 0;">🆕 NEW: Claude 4 acts as 20+ year Market Research Expert + Executive Storyteller</p>
                </div>
            </div>

            <div class="card">
                <h2 style="color: #7C3AED; margin-bottom: 20px;">💼 Upload Business Data</h2>
                <div class="upload-area" onclick="document.getElementById('fileInput').click()">
                    <div style="font-size: 3rem; margin-bottom: 10px;">📁</div>
                    <p>Upload Business Reports, Financial Data, Market Research</p>
                    <p style="color: #94a3b8; font-size: 0.9rem;">Claude 4 expert will analyze and create executive-level presentations</p>
                </div>
                <input type="file" id="fileInput" style="display: none;" accept=".pdf,.json,.txt,.md" onchange="handleFileUpload(event)">
                
                <div class="status" id="status"></div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn" onclick="generatePresentation()">🚀 Generate Presentation</button>
                    <button class="btn" onclick="checkStatus()">📊 Check Status</button>
                </div>
            </div>

            <div class="feature-grid">
                <div class="feature">
                    <div class="feature-icon">💼</div>
                    <h3>Expert Market Researcher</h3>
                    <p>Claude 4 acts as a 20+ year Fortune 500 consultant, providing strategic analysis, competitive positioning, and executive-level insights</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🎨</div>
                    <h3>FLUX Visual Assistant</h3>
                    <p>FLUX generates specific charts, graphs, and infographics exactly as requested by Claude 4's expert visual strategy</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📈</div>
                    <h3>Strategic Business Analysis</h3>
                    <p>Deep market insights, competitive analysis, financial modeling, and strategic recommendations worthy of board presentations</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📢</div>
                    <h3>Executive Storytelling</h3>
                    <p>Sophisticated narrative structure, compelling business cases, and persuasive presentations for C-suite audiences</p>
                </div>
            </div>

            <div class="card" style="margin-top: 40px; background: linear-gradient(135deg, rgba(1,196,200,0.1) 0%, rgba(124,58,237,0.1) 100%);">
                <h2 style="color: #01C4C8; margin-bottom: 20px;">🆕 Executive AI Consultant Features</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0;">
                    <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; border-left: 4px solid #01C4C8;">
                        <h4 style="color: #01C4C8; margin-top: 0;">💼 Market Research Expert</h4>
                        <ul style="margin: 0; padding-left: 20px; color: #e2e8f0;">
                            <li>20+ years Fortune 500 experience</li>
                            <li>Strategic competitive analysis</li>
                            <li>Market positioning insights</li>
                            <li>Executive-level recommendations</li>
                        </ul>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; border-left: 4px solid #7C3AED;">
                        <h4 style="color: #7C3AED; margin-top: 0;">🎨 FLUX Visual Assistant</h4>
                        <ul style="margin: 0; padding-left: 20px; color: #e2e8f0;">
                            <li>Generates Claude 4's exact requests</li>
                            <li>Professional chart specifications</li>
                            <li>Executive dashboard designs</li>
                            <li>Board-ready infographics</li>
                        </ul>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; border-left: 4px solid #10B981;">
                        <h4 style="color: #10B981; margin-top: 0;">📢 Executive Storytelling</h4>
                        <ul style="margin: 0; padding-left: 20px; color: #e2e8f0;">
                            <li>Compelling narrative structure</li>
                            <li>C-suite presentation quality</li>
                            <li>Strategic frameworks & models</li>
                            <li>Board-ready recommendations</li>
                        </ul>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 30px; padding: 20px; background: rgba(1,196,200,0.1); border-radius: 8px;">
                    <p style="color: #01C4C8; font-weight: 600; margin: 0;">🚀 Upload business data to experience Fortune 500-level strategic analysis!</p>
                </div>
            </div>

            <div class="card" style="margin-top: 40px;">
                <h2 style="color: #01C4C8; margin-bottom: 20px;">🔗 API Endpoints</h2>
                <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 6px; font-family: monospace;">
                    <p><strong>POST /upload</strong> - Upload files for presentation generation</p>
                    <p><strong>POST /generate</strong> - Generate presentation from uploaded content</p>
                    <p><strong>GET /status/{job_id}</strong> - Check generation status</p>
                    <p><strong>GET /download/{file_id}</strong> - Download generated presentation</p>
                    <p><strong>GET /health</strong> - Service health check</p>
                </div>
            </div>
        </div>

        <script>
            let uploadedFiles = [];
            
            function handleFileUpload(event) {
                const files = event.target.files;
                const status = document.getElementById('status');
                
                if (files.length > 0) {
                    uploadedFiles = Array.from(files);
                    showStatus(`📁 Selected ${files.length} file(s): ${Array.from(files).map(f => f.name).join(', ')}`, 'info');
                }
            }
            
            function showStatus(message, type) {
                const status = document.getElementById('status');
                status.textContent = message;
                status.className = `status ${type}`;
                status.style.display = 'block';
            }
            
            async function generatePresentation() {
                if (uploadedFiles.length === 0) {
                    showStatus('❌ Please select files first', 'error');
                    return;
                }
                
                showStatus('📤 Uploading files...', 'info');
                
                try {
                    // Step 1: Upload files
                    const formData = new FormData();
                    uploadedFiles.forEach(file => {
                        formData.append('files', file);
                    });
                    
                    const uploadResponse = await fetch('/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!uploadResponse.ok) {
                        throw new Error(`Upload failed: ${uploadResponse.status}`);
                    }
                    
                    const uploadResult = await uploadResponse.json();
                    showStatus('✅ Files uploaded successfully! Starting generation...', 'info');
                    
                    // Step 2: Start generation
                    const generateResponse = await fetch('/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            file_ids: uploadResult.file_ids,
                            options: {
                                theme: 'professional',
                                template: 'default'
                            }
                        })
                    });
                    
                    if (!generateResponse.ok) {
                        throw new Error(`Generation failed: ${generateResponse.status}`);
                    }
                    
                    const generateResult = await generateResponse.json();
                    window.currentJobId = generateResult.job_id;
                    
                    showStatus(`🚀 Generation started! Job ID: ${generateResult.job_id}`, 'success');
                    
                    // Start polling for status
                    pollStatus(generateResult.job_id);
                    
                } catch (error) {
                    showStatus(`❌ Error: ${error.message}`, 'error');
                    console.error('Generation error:', error);
                }
            }
            
            async function checkStatus() {
                if (!window.currentJobId) {
                    showStatus('❌ No active generation job to check', 'error');
                    return;
                }
                
                showStatus('📊 Checking generation status...', 'info');
                
                try {
                    const response = await fetch(`/status/${window.currentJobId}`);
                    if (!response.ok) {
                        throw new Error(`Status check failed: ${response.status}`);
                    }
                    
                    const status = await response.json();
                    updateJobStatus(status);
                    
                } catch (error) {
                    showStatus(`❌ Status check failed: ${error.message}`, 'error');
                }
            }
            
            function updateJobStatus(status) {
                const message = `${status.message} (${status.progress}%)`;
                
                if (status.status === 'completed') {
                    showStatus(`✅ ${message}`, 'success');
                    // Add download button
                    const statusDiv = document.getElementById('status');
                    statusDiv.innerHTML += `<br><button class="btn" onclick="downloadPresentation('${status.job_id}')">⬇️ Download Presentation</button>`;
                } else if (status.status === 'failed') {
                    showStatus(`❌ ${message}`, 'error');
                } else {
                    showStatus(`🔄 ${message}`, 'info');
                }
            }
            
            async function pollStatus(jobId) {
                try {
                    const response = await fetch(`/status/${jobId}`);
                    if (!response.ok) {
                        throw new Error(`Status poll failed: ${response.status}`);
                    }
                    
                    const status = await response.json();
                    updateJobStatus(status);
                    
                    // Continue polling if still processing
                    if (status.status === 'processing') {
                        setTimeout(() => pollStatus(jobId), 3000); // Poll every 3 seconds
                    }
                    
                } catch (error) {
                    showStatus(`❌ Polling error: ${error.message}`, 'error');
                }
            }
            
            async function downloadPresentation(jobId) {
                try {
                    showStatus('⬇️ Starting download...', 'info');
                    
                    // Create download link and trigger download
                    const downloadUrl = `/download/${jobId}`;
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = `presentation_${jobId}.pptx`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    showStatus('✅ Download started!', 'success');
                    
                } catch (error) {
                    showStatus(`❌ Download failed: ${error.message}`, 'error');
                }
            }
        </script>
    </body>
    </html>
    """
    return html_content

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI Presentation Generator (FastAPI)",
        "version": "1.0.0",
        "features": [
            "Dual AI Analysis (Claude 3.7 + OpenAI GPT-4o)",
            "PowerPoint Generation",
            "Apple Silicon M3 Optimized",
            "Multi-format Support (PDF, JSON, TXT, MD)"
        ]
    }

@app.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    """Upload files for presentation generation"""
    try:
        uploaded_files = []
        
        for file in files:
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'txt'
            filename = f"{file_id}.{file_extension}"
            file_path = f"uploads/{filename}"
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            uploaded_files.append({
                "id": file_id,
                "original_name": file.filename,
                "stored_name": filename,
                "size": len(content),
                "type": file.content_type
            })
        
        return {
            "status": "success",
            "message": f"Uploaded {len(files)} file(s)",
            "file_ids": [f["id"] for f in uploaded_files],
            "files": uploaded_files
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

class GenerationRequest(BaseModel):
    file_ids: list[str]
    options: Optional[dict] = {}

@app.post("/generate")
async def generate_presentation(request: GenerationRequest):
    """Generate presentation from uploaded files"""
    try:
        file_ids = request.file_ids
        options = request.options
        
        if not file_ids:
            raise HTTPException(status_code=400, detail="No file IDs provided")
        
        job_id = str(uuid.uuid4())
        
        # Start background task for actual generation
        asyncio.create_task(process_presentation_generation(job_id, file_ids, options))
        
        return {
            "status": "started",
            "job_id": job_id,
            "message": "Presentation generation started",
            "estimated_time": "3-5 minutes",
            "files_processing": len(file_ids)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.get("/status/{job_id}")
async def get_generation_status(job_id: str):
    """Check presentation generation status"""
    if job_id not in job_statuses:
        raise HTTPException(status_code=404, detail="Job not found")
    
    status = job_statuses[job_id]
    return {
        "job_id": job_id,
        **status
    }

@app.get("/download/{file_id}")
async def download_presentation(file_id: str):
    """Download generated presentation"""
    file_path = f"generated_content/{file_id}.pptx"
    
    if os.path.exists(file_path):
        return FileResponse(
            file_path,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=f"presentation_{file_id}.pptx"
        )
    else:
        raise HTTPException(status_code=404, detail="Presentation not found")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5007))
    uvicorn.run(app, host="0.0.0.0", port=port)