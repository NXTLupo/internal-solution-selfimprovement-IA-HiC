"""
AI Presentation Generator (FastAPI) - Original FastAPI-based presentation generation service
Transform journey maps and PDFs into professional presentations using dual AI analysis
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
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
# SVG generation imports - Claude 4 powered
import base64
import io
from typing import Union
import xml.etree.ElementTree as ET
import subprocess
import tempfile
# Import the maximum quality D3 infographic generator
from d3_infographic_generator_max_quality import MaxQualityD3InfographicGenerator, create_max_quality_d3_infographic

app = FastAPI(title="AI Presentation Generator", description="FastAPI-based presentation generation service with maximum quality graphics")

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

# Templates setup
templates = Jinja2Templates(directory="templates")

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
        error_msg = f"2025 Content Extraction Error: {str(e)}"
        print(f"❌ {error_msg}")
        return error_msg

def create_interactive_storytelling_elements(ax, data_points, story_progression):
    """2025 Interactive Data Storytelling Framework"""
    class DataStoryBuilder:
        def __init__(self, ax, data_points):
            self.ax = ax
            self.data_points = data_points
            self.story_elements = []
            self.current_frame = 0
        
        def add_context_panel(self, text, position='top-right', style='modern'):
            """Add contextual information panel"""
            if position == 'top-right':
                x, y = 0.98, 0.95
                ha, va = 'right', 'top'
            elif position == 'bottom-left':
                x, y = 0.02, 0.05
                ha, va = 'left', 'bottom'
            else:
                x, y = 0.5, 0.95
                ha, va = 'center', 'top'
            
            # Modern 2025 context panel with neon outline
            self.ax.text(x, y, text, transform=self.ax.transAxes,
                        ha=ha, va=va, fontsize=9, fontweight='500',
                        color='#FFFFFF', alpha=0.9,
                        bbox=dict(boxstyle="round,pad=0.5", 
                                 facecolor='none', 
                                 edgecolor='#00E5FF', 
                                 linewidth=1.5, 
                                 alpha=0.8))
        
        def add_insight_highlight(self, data_index, insight_text, color='#FFFF00'):
            """Highlight specific data points with insights"""
            if data_index < len(self.data_points):
                point = self.data_points[data_index]
                
                # Pulsing highlight effect
                for radius in [0.15, 0.12, 0.09]:
                    highlight = patches.Circle(point, radius, 
                                             facecolor='none', 
                                             edgecolor=color, 
                                             linewidth=2, 
                                             alpha=0.3)
                    self.ax.add_patch(highlight)
                
                # Insight callout
                self.ax.annotate(insight_text, point, 
                               xytext=(10, 10), textcoords='offset points',
                               fontsize=8, fontweight='600', color='#FFFFFF',
                               bbox=dict(boxstyle="round,pad=0.3", 
                                        facecolor=color, alpha=0.2,
                                        edgecolor=color, linewidth=1))
        
        def create_progressive_reveal(self, frames=5):
            """Create animated progressive data revelation"""
            reveal_sequence = []
            points_per_frame = len(self.data_points) // frames
            
            for frame in range(frames):
                start_idx = frame * points_per_frame
                end_idx = min((frame + 1) * points_per_frame, len(self.data_points))
                frame_data = self.data_points[start_idx:end_idx]
                reveal_sequence.append(frame_data)
            
            return reveal_sequence
    
    return DataStoryBuilder(ax, data_points)

def add_modern_glow_effect(ax, element, glow_color, glow_intensity='medium'):
    """2025 Advanced Neon Glow System with Multiple Layers"""
    glow_configs = {
        'subtle': [(4, 0.05), (2, 0.15), (1, 0.4)],
        'medium': [(8, 0.08), (5, 0.2), (2, 0.6)],
        'intense': [(12, 0.1), (8, 0.25), (4, 0.7), (2, 0.9)],
        'cyberpunk': [(15, 0.05), (10, 0.15), (6, 0.3), (3, 0.7), (1, 1.0)]
    }
    
    layers = glow_configs.get(glow_intensity, glow_configs['medium'])
    
    # Apply multi-layer glow effect
    if hasattr(element, 'get_linewidth'):
        base_width = element.get_linewidth()
        for width_mult, alpha in layers:
            glow_width = base_width * width_mult
            # Create glow layer
            if hasattr(element, 'get_path'):
                glow_element = type(element)(element.get_path().vertices,
                                           facecolor='none', 
                                           edgecolor=glow_color,
                                           linewidth=glow_width,
                                           alpha=alpha,
                                           zorder=element.get_zorder()-1)
                ax.add_patch(glow_element)

def apply_2025_typography_hierarchy(ax, title, subtitle=None, caption=None):
    """Professional Typography Strategy for 2025"""
    TYPOGRAPHY_2025 = {
        'title': {'size': 16, 'weight': 'bold', 'color': '#FFFFFF', 'alpha': 1.0},
        'subtitle': {'size': 12, 'weight': '600', 'color': '#CCCCCC', 'alpha': 0.9},
        'caption': {'size': 8, 'weight': 'normal', 'color': '#999999', 'alpha': 0.8},
        'accent': {'size': 14, 'weight': 'bold', 'color': '#00E5FF', 'alpha': 1.0}
    }
    
    # Apply title with glow effect for 2025 aesthetic
    for offset in [(2, 2), (1, 1), (0, 0)]:
        alpha = 0.2 if offset != (0, 0) else TYPOGRAPHY_2025['title']['alpha']
        ax.text(0.5, 0.95 + offset[1]*0.002, title, transform=ax.transAxes,
               ha='center', va='top', 
               fontsize=TYPOGRAPHY_2025['title']['size'],
               fontweight=TYPOGRAPHY_2025['title']['weight'],
               color=TYPOGRAPHY_2025['title']['color'],
               alpha=alpha, fontfamily='sans-serif')
    
    if subtitle:
        ax.text(0.5, 0.88, subtitle, transform=ax.transAxes,
               ha='center', va='top', **TYPOGRAPHY_2025['subtitle'])
    
    if caption:
        ax.text(0.5, 0.02, caption, transform=ax.transAxes,
               ha='center', va='bottom', **TYPOGRAPHY_2025['caption'])

def create_accessibility_features(ax, chart_type, data_summary):
    """WCAG 2.1 AA Compliance Features for 2025"""
    # Add alternative text equivalent as metadata
    alt_text = f"{chart_type} showing {data_summary['description']} with {data_summary['point_count']} data points"
    
    # High contrast indicators for colorblind accessibility
    if hasattr(ax, 'accessibility_markers'):
        for i, marker in enumerate(ax.accessibility_markers):
            # Add pattern indicators alongside color
            patterns = ['///', '\\\\', '|||', '---', '+++', 'xxx']
            if hasattr(marker, 'set_hatch'):
                marker.set_hatch(patterns[i % len(patterns)])
    
    return alt_text

def convert_svg_to_max_quality_png(svg_path: str, png_path: str) -> bool:
    """
    Convert SVG to ultra-high quality PNG with maximum resolution and text clarity.
    Uses multiple conversion methods to ensure the highest possible quality.
    """
    try:
        print(f"🎯 MAXIMUM QUALITY SVG-to-PNG conversion...")
        
        # MAXIMUM QUALITY SETTINGS
        QUALITY_MULTIPLIER = 6  # 6x base resolution
        BASE_WIDTH = 1200      # Base width for presentation graphics
        BASE_HEIGHT = 800      # Base height for presentation graphics
        
        # Calculate ultra-high resolution
        target_width = BASE_WIDTH * QUALITY_MULTIPLIER   # 7200px
        target_height = BASE_HEIGHT * QUALITY_MULTIPLIER # 4800px
        target_dpi = 300 * QUALITY_MULTIPLIER             # 1800 DPI
        
        print(f"   Target resolution: {target_width}×{target_height}px @ {target_dpi} DPI")
        print(f"   Quality multiplier: {QUALITY_MULTIPLIER}x")
        
        # Method 1: Try CairoSVG with maximum quality settings
        try:
            import cairosvg
            print(f"   Using CairoSVG for maximum quality conversion...")
            
            cairosvg.svg2png(
                url=svg_path,
                write_to=png_path,
                output_width=target_width,
                output_height=target_height,
                dpi=target_dpi,
                # Maximum quality settings
                background_color='transparent'
            )
            
            if os.path.exists(png_path):
                png_size = os.path.getsize(png_path)
                print(f"✅ CairoSVG conversion successful: {png_size:,} bytes")
                return True
        except ImportError:
            print(f"   CairoSVG not available, trying alternative methods...")
        except Exception as e:
            print(f"   CairoSVG failed: {e}")
        
        # Method 2: Try Playwright with maximum quality rendering
        try:
            print(f"   Using Playwright for ultra-high quality rendering...")
            
            # Use the max quality D3 generator's Playwright setup for SVG conversion
            import asyncio
            from playwright.async_api import async_playwright
            
            async def convert_with_playwright():
                async with async_playwright() as p:
                    browser = await p.chromium.launch(
                        headless=True,
                        args=[
                            '--disable-web-security',
                            '--disable-features=VizDisplayCompositor',
                            f'--force-device-scale-factor={QUALITY_MULTIPLIER}',
                            '--high-dpi-support=1',
                            '--force-color-profile=srgb',
                            '--enable-gpu-rasterization',
                            '--disable-background-timer-throttling'
                        ]
                    )
                    
                    try:
                        page = await browser.new_page(
                            device_scale_factor=QUALITY_MULTIPLIER,
                            viewport={'width': target_width, 'height': target_height}
                        )
                        
                        # Load SVG file
                        await page.goto(f"file://{svg_path}")
                        
                        # Wait for fonts and rendering
                        await page.evaluate("document.fonts.ready")
                        await page.wait_for_timeout(2000)
                        
                        # Screenshot with maximum quality
                        screenshot_bytes = await page.screenshot(
                            type='png',
                            omit_background=True,
                            full_page=True,
                            animations='disabled'
                        )
                        
                        # Save to file
                        with open(png_path, 'wb') as f:
                            f.write(screenshot_bytes)
                        
                        return True
                        
                    finally:
                        await browser.close()
            
            # Run async conversion
            success = asyncio.run(convert_with_playwright())
            if success and os.path.exists(png_path):
                png_size = os.path.getsize(png_path)
                print(f"✅ Playwright conversion successful: {png_size:,} bytes")
                return True
                
        except Exception as e:
            print(f"   Playwright conversion failed: {e}")
        
        # Method 3: Try ImageMagick/Wand with maximum quality
        try:
            from wand.image import Image as WandImage
            print(f"   Using Wand/ImageMagick for maximum quality conversion...")
            
            with WandImage(filename=svg_path) as img:
                # Set maximum quality parameters
                img.format = 'png'
                img.background_color = 'transparent'
                img.resolution = (target_dpi, target_dpi)
                
                # Resize to target dimensions with high-quality resampling
                img.resize(target_width, target_height)
                
                # Apply maximum quality filters
                img.unsharp_mask(radius=0, sigma=0.5, amount=1, threshold=0)
                
                # Save with maximum compression quality
                img.compression_quality = 100
                img.save(filename=png_path)
            
            if os.path.exists(png_path):
                png_size = os.path.getsize(png_path)
                print(f"✅ Wand conversion successful: {png_size:,} bytes")
                return True
                
        except ImportError:
            print(f"   Wand not available")
        except Exception as e:
            print(f"   Wand conversion failed: {e}")
        
        # Method 4: Fallback with subprocess (Inkscape if available)
        try:
            print(f"   Trying Inkscape command-line conversion...")
            
            cmd = [
                'inkscape',
                f'--export-filename={png_path}',
                f'--export-width={target_width}',
                f'--export-height={target_height}',
                f'--export-dpi={target_dpi}',
                '--export-background-opacity=0',
                svg_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and os.path.exists(png_path):
                png_size = os.path.getsize(png_path)
                print(f"✅ Inkscape conversion successful: {png_size:,} bytes")
                return True
            else:
                print(f"   Inkscape failed: {result.stderr}")
                
        except (subprocess.SubprocessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
            print(f"   Inkscape not available or failed: {e}")
        
        print(f"❌ All conversion methods failed")
        return False
        
    except Exception as e:
        print(f"❌ Maximum quality PNG conversion error: {e}")
        return False

def generate_chart_from_spec(visual_spec: Dict[str, Any], output_path: str) -> bool:
    """Generate elegant minimalist SVG infographics using Claude 4 with dual-pass chain-of-thought refinement"""
    try:
        # Extract visual parameters with detailed debugging
        chart_type = visual_spec.get('type', 'conceptual_diagram')
        title = visual_spec.get('title', 'Visual Element')
        data = visual_spec.get('data', {})
        context = visual_spec.get('context', '')
        concept = visual_spec.get('concept', 'business strategy')
        
        # NEW: Extract actual slide content for relevancy
        slide_content = visual_spec.get('slide_content', {})
        slide_title = slide_content.get('title', '')
        content_points = slide_content.get('content_points', [])
        source_quote = slide_content.get('source_quote', '')
        slide_number = slide_content.get('slide_number', 1)
        
        # Debug output to understand what we're receiving
        print(f"🔍 DEBUG - Enhanced Visual Spec Received:")
        print(f"  Chart Type: {chart_type}")
        print(f"  Visual Title: {title}")
        print(f"  Slide Title: {slide_title}")
        print(f"  Content Points: {len(content_points)}")
        print(f"  Source Quote: {source_quote[:100] if source_quote else 'None'}...")
        print(f"  Context: {context}")
        print(f"  Concept: {concept}")
        print(f"  Data: {data}")
        
        # Extract specific data elements ONLY from actual user content - NO PLACEHOLDERS
        elements = data.get('elements', [])  # Empty if no actual elements found
        metrics = data.get('metrics', [])    # Empty if no actual metrics found  
        relationships = data.get('relationships', [])  # Empty if no actual relationships found
        
        # Extract quote and emphasis from visual spec
        strategic_quote = visual_spec.get('strategic_quote', '')
        emphasis_elements = data.get('emphasis', '')
        human_insights = visual_spec.get('human_insights', {})
        
        # Claude 4 prompt as World Class Infographic Designer following Dieter Rams + Apple watchOS guidelines
        claude_prompt = f"""You are a World Class Infographic Designer following Dieter Rams's "less but better" ethos coupled with Apple's Human Interface Guidelines for watchOS. You will create ultra-minimal, highly legible infographics on pure black backgrounds that exceed accessibility standards.

🎯 WATCHOS DESIGN PRINCIPLES FOR FIRST PASS:

**TYPOGRAPHY FOUNDATION** (Apple Human Interface Guidelines for watchOS):
- **Minimum Size**: 11px (never smaller) - critical for readability at small scale
- **Scaling Factor**: 1.2× minimum between sizes (11px → 13px → 16px → 19px → 23px)
- **Font Family**: Use a neutral geometric sans-serif (e.g., Helvetica Neue, San Francisco) to maximize clarity at small sizes
- **Line Height**: 1.2× font size for optimal readability on small displays
- **Letter Spacing**: +0.05em for headlines, +0.1em for all-caps labels to enhance legibility

**GRID & SPACING** (4px Base Grid System):
- **Base Unit**: 4 px increments (1 pt ≈ 1 px on @2× Retina); aligns all elements to multiples of 4 px
- **Touch Targets**: Minimum 28px (7 grid units) for any interactive elements
- **Margins**: 16px (4 grid units) from edges, 12px (3 grid units) between major elements
- **Vertical Rhythm**: All text baselines align to 4px grid multiples

**COLOR PALETTE** (Pure Black Theme with High Contrast):
- **Background**: Pure black (#000000) - provides maximum contrast and battery efficiency
- **Primary Text**: Pure white (#FFFFFF) - ensures 21:1 contrast ratio
- **Secondary Text**: Light gray (#CCCCCC) - maintains 12.6:1 contrast ratio
- **Tertiary Text**: Medium gray (#999999) - provides 5.6:1 contrast ratio
- **Accent Color**: Cyan (#44CDDB) - aligns with NXT Humans branding, 6.1:1 contrast on black
- **Data Visualization**: Single accent color only - additional colors: warning orange (#FF9500), success green (#34C759), error red (#FF3B30)
- **Borders/Lines**: Dark gray (#333333) - subtle definition without breaking continuity

**ACCESSIBILITY STANDARDS** (WCAG AAA Compliance):
- **Contrast Ratio**: Ensure all elements (text/icons/charts) have contrast ≥ 4.5:1 against black background (AAA: ≥ 7:1)
- **Font Weight**: Use 400 (regular) minimum, 600+ for emphasis - avoid thin weights (100-300) that disappear on small screens
- **Focus Indicators**: Any interactive elements need 2px visible borders
- **Text Scaling**: Design must work when text is scaled 200% (iOS accessibility)

**VISUAL HIERARCHY** (Information Architecture):
- **Primary**: Largest element, highest contrast (white on black), single focal point
- **Secondary**: 0.85× primary size, secondary contrast (light gray)
- **Tertiary**: 0.7× primary size, tertiary contrast (medium gray)
- **Maximum 3 Hierarchy Levels**: Never exceed 3 levels to maintain clarity
- **Progressive Disclosure**: Most critical information immediately visible

**LAYOUT PRINCIPLES** (Spatial Organization):
- **Visual Weight**: Use size, color, and spacing to guide attention - not decoration
- **Breathing Room**: Minimum 60% negative space for cognitive clarity
- **Alignment**: Strong left/center alignment - avoid justified text
- **Grouping**: Related elements within 8px proximity, unrelated elements 16px+ apart
- **Content Priority**: Top-left to bottom-right reading pattern optimization

**COMPONENT DESIGN** (Functional Elements):
- **Cards**: 1px solid border (#333333), 8px corner radius, 16px internal padding
- **Charts**: Minimum 2px stroke width, clean geometric shapes only
- **Icons**: 16px × 16px minimum, 24px preferred for recognition
- **Buttons**: 32px minimum height, 16px horizontal padding
- **Lists**: 8px vertical spacing between items, left-aligned text

**MOTION & INTERACTION** (If Applicable):
- **Animation Duration**: 0.3s standard, 0.15s for micro-interactions
- **Easing**: system spring animations (iOS native feel)
- **Feedback**: Immediate visual confirmation for all interactions

NARRATIVE CONCEPT: {concept}
STRATEGIC CONTEXT: {context}
EXECUTIVE TITLE: {title}
VISUAL TYPE: {chart_type}

🎯 **ACTUAL SLIDE CONTENT TO VISUALIZE** (SLIDE #{slide_number}):
**SLIDE TITLE**: "{slide_title}"

**SLIDE CONTENT POINTS**:
{chr(10).join([f"• {point}" for point in content_points]) if content_points else "• No specific content points provided"}

**SOURCE QUOTE**: "{source_quote if source_quote else 'No quote provided'}"

**LEGACY DATA** (use only if relevant to slide content):
- ELEMENTS: {elements}
- METRICS: {metrics}  
- RELATIONSHIPS: {relationships}
- STRATEGIC QUOTE: "{strategic_quote}"
- EMPHASIS FOCUS: {emphasis_elements}

🚨 **CRITICAL CONTENT RELEVANCY REQUIREMENTS**:
- **VISUALIZE THE SLIDE CONTENT**: Create an infographic that directly represents the slide title and content points above
- **NEVER IGNORE SLIDE CONTENT**: The infographic must reflect what this specific slide is about
- **AUTHENTIC REPRESENTATION**: Use the actual slide content points as the foundation for your visualization
- **NO GENERIC PLACEHOLDERS**: Don't create generic business graphics - make it specific to this slide's message
- **CONTENT-FIRST DESIGN**: Let the slide content drive the visual concept, not the chart type
- **VERIFY RELEVANCE**: Every visual element must relate to the slide title or content points

CONTENT-DRIVEN ANALYSIS PHASE - THINK LIKE DIETER RAMS:
Before generating any SVG, you must THINK HARD and analyze:

1. **SLIDE CONTENT ANALYSIS**: What is the core message of "{slide_title}"? What are the key concepts in the content points?

2. **RAMS CONCEPTUAL APPROACH**: How would Dieter Rams visually represent these concepts? What would he reduce this complex information down to?

3. **VISUAL CONCEPT DESIGN**: What specific abstract or geometric shapes, minimalist charts, graphs, icons, BOLD words, and/or block quotes would effectively and elegantly convey the essence of these concepts?

4. **BRUTALLY MINIMALIST REDUCTION**: Strip away everything non-essential. What is the single most important visual relationship or concept that needs to be shown?

5. **MODERN VISUAL LANGUAGE**: What geometric forms, precise typography, and strategic use of space would create a beautifully simple visualization?

EXAMPLE CONCEPTUAL THINKING:
- If showing customer journey: Think "timeline with key needs, tasks, and pain points" → horizontal line with precise milestone markers
- If showing performance data: Think "comparative values" → clean bar comparison or progress indicators  
- If showing framework: Think "relationship matrix" → geometric grid with clear quadrant labels
- If showing process: Think "sequential flow" → connected geometric shapes with directional clarity

CONTENT-SPECIFIC VISUAL REQUIREMENTS:
You MUST create a functional infographic that directly represents the slide content above. Design what Dieter Rams would create to visualize "{slide_title}" and its content points.

CONTENT-DRIVEN DESIGN APPROACH:
- **Slide Title Integration**: The slide title "{slide_title}" should be prominently featured
- **Content Point Visualization**: Each content point should be visually represented through icons, shapes, or text
- **Quote Integration**: If a source quote exists, incorporate it meaningfully into the design
- **Conceptual Representation**: Create visual metaphors that relate to the actual content meaning
- **Relevant Visual Elements**: Every shape, icon, or graphic element must relate to the slide's message

INCORPORATE TYPOGRAPHY ENHANCEMENTS:
- Use BOLD text with font-weight="700" for the slide title and key content points
- Include source quotes with proper text elements and stroke borders
- Add minimalist geometric shapes that represent the content concepts
- Apply clean typographic hierarchy that prioritizes the slide content

🎨 DIETER RAMS DESIGN ANALYSIS FROM REFERENCE IMAGES:

RAMS CORE PRINCIPLES OBSERVED:
1. **Functional Clarity**: Every element serves a clear purpose - no decoration for decoration's sake
2. **Systematic Grid Structure**: Precise mathematical alignment and spacing throughout
3. **Pure Typography Hierarchy**: Clean sans-serif fonts with deliberate weight variations
4. **Restrained Color Palette**: Predominantly monochromatic with strategic accent colors
5. **Breathing Space**: Generous white/negative space that enhances comprehension
6. **Honest Materials**: Clean geometric forms without artificial embellishment

RAMS COLOR SYSTEM ANALYSIS:
- **Primary Background**: Pure black (#000000) for maximum contrast
- **Primary Text**: Clean white (#FFFFFF) for ultimate readability
- **Accent Colors**: Strategic use of bright yellow (#FFD700), blue (#0080FF), red (#FF0000) 
- **Secondary Text**: Medium gray (#888888) for hierarchy
- **Structural Elements**: Light gray lines (#333333) for organization

RAMS TYPOGRAPHY SYSTEM WITH EMPHASIS:
- **Primary Headlines**: 16-18px, weight 400, generous letter-spacing (0.05em)
- **Bold Emphasis Text**: 14-16px, weight 700, for key insights and impact statements
- **Data Values**: 24-32px, weight 300, ultra-clean numerical display  
- **Quote Text**: 12-14px, weight 400, italic, with clean quotation marks
- **Labels**: 10-12px, weight 400, all-caps with letter-spacing (0.1em)
- **Secondary Info**: 9-10px, weight 300, muted gray color
- **Font Choice**: System sans-serif (Helvetica-inspired) - never decorative

RAMS LAYOUT MATHEMATICS:
- **Grid System**: 8px base unit with 16px, 24px, 32px multiples
- **Alignment**: Everything aligns to invisible grid lines - perfect registration
- **Spacing**: Consistent 16px minimum between unrelated elements
- **Proportions**: Classic ratios (2:3, 3:5) rather than arbitrary sizing
- **Safe Margins**: 24px minimum from edges

RAMS GEOMETRIC LANGUAGE:
- **Perfect Rectangles**: No rounded corners unless functionally necessary
- **Precise Lines**: 1px or 2px stroke weights only - never decorative thickness
- **Circle Precision**: Perfect circles for data visualization (progress rings, pie charts)
- **Right Angles**: 90-degree relationships throughout - no arbitrary angles
- **Minimal Depth**: Flat design with occasional 1-2px shadow for functional separation

RAMS MINIMALIST ICONOGRAPHY SYSTEM:
- **Geometric Icons**: Pure geometric forms - circles, squares, triangles, lines
- **Functional Symbols**: Arrow (→), Plus (+), Minus (−), Check (✓), Cross (×)
- **Scale Consistency**: All icons 12px, 16px, or 24px - never arbitrary sizes
- **Stroke Weight**: 1.5px stroke weight for all line-based icons
- **Visual Hierarchy**: Icons serve function, never decoration
- **Symbol Examples**:
  * Growth: Simple upward arrow (↗)
  * Process: Right arrow (→) 
  * Success: Clean checkmark (✓)
  * Attention: Exclamation (!)
  * Time: Simple clock outline
  * People: Geometric circle
  * Data: Simple bar chart outline

RAMS QUOTE TREATMENT SYSTEM:
- **Quote Marks**: Clean typographic quotes (" ") - 18px, weight 700, accent color
- **Quote Container**: Minimal left border (3px) in accent color (#FFD700)
- **Quote Typography**: 12-14px, weight 400, italic, line-height 1.4
- **Attribution**: 9px, weight 300, all-caps, letter-spacing 0.1em
- **Quote Positioning**: Left-aligned with 16px padding from border
- **Background**: Subtle 2% opacity background rectangle (optional)

RAMS INFORMATION HIERARCHY:
- **Single Focus Point**: One dominant element per composition
- **Progressive Disclosure**: Information revealed in logical reading order
- **Functional Grouping**: Related items clustered with consistent spacing
- **Visual Weight Distribution**: Size and contrast create clear priority
- **Scannable Structure**: Grid-based organization enables rapid comprehension

CANVAS SPECIFICATIONS:
- **Unrestricted Dimensions**: Use optimal dimensions for best visual impact
- **Safe Margins**: 24px top, 20px left/right, 16px bottom
- **Grid Foundation**: 8px base grid system throughout
- **CRITICAL: Transparent Background**: NO background elements - SVGs will sit on pure black slides
- **Black Slide Optimization**: Design for pure black (#000000) slide backgrounds with transparent SVG canvas

🚀 RAMS-INSPIRED VISUAL EXECUTION:

CUSTOMER EXPERIENCE DASHBOARD (RAMS STYLE):
- Clean rectangular cards with 1px border (#333333)
- Perfect circular progress indicators (stroke-width: 2px)
- Systematic grid alignment on 16px intervals
- Single accent color for priority data (#FFD700)

TRANSFORMATION JOURNEY MAP (RAMS STYLE):
- Horizontal timeline with precise tick marks
- Perfect geometric milestones (8px squares or 12px circles)
- Clean typography hierarchy for stage labels
- Minimal connecting lines (1px stroke, #888888)

EXECUTIVE INSIGHT FRAMEWORK (RAMS STYLE):
- Perfect 2x2 grid with mathematical proportions
- Clean quadrant labels in all-caps (letter-spacing: 0.1em)
- Single focal point with size hierarchy
- Functional borders only (1px, #333333)

STATIC SVG FONT REQUIREMENTS:
- Use explicit font attributes: font-family="system-ui" font-size="16" font-weight="400"
- Headlines: font-size="16" font-weight="400" fill="#FFFFFF"
- Bold text: font-size="14" font-weight="700" fill="#FFFFFF"
- Data values: font-size="28" font-weight="300" fill="#FFFFFF"
- Quotes: font-size="13" font-weight="400" fill="#FFFFFF"
- Labels: font-size="11" font-weight="400" fill="#888888"
- NO CSS classes - only static SVG attributes

RAMS EXECUTION PRINCIPLES:
- **Single Visual Focus**: One dominant element that drives comprehension
- **Mathematical Precision**: Everything aligns to 8px grid system
- **Functional Color**: Accent colors only for data emphasis, never decoration
- **Perfect Geometry**: Circles are perfect circles, rectangles have clean edges
- **Typography Discipline**: Maximum 3 font sizes, consistent letter-spacing
- **Breathing Space**: 60%+ negative space for visual clarity

CONTENT-DRIVEN VISUAL INSTRUCTIONS:

📋 **PRIMARY INSTRUCTION - READ THE SLIDE CONTENT**:
Analyze the slide title "{slide_title}" and content points to determine the most appropriate visual representation:

IF the slide content involves NUMBERS, METRICS, or PERFORMANCE:
- Create data cards representing the specific metrics mentioned in the content points
- Use rectangular cards with stroke="#333333" stroke-width="1"
- Display actual numbers/percentages from the slide content with font-weight="700"
- Add progress bars only if the content mentions progress or comparisons
- Include the slide title prominently at the top
- Add the source quote if available using text elements with stroke borders

IF the slide content involves FRAMEWORKS, COMPARISONS, or CATEGORIES:
- Create a grid layout that organizes the content points into logical groups
- Label each section with text from the actual content points using font-size="12"
- Bold key insights from the slide content using font-weight="700"
- Add minimal connecting lines only if the content implies relationships
- Include geometric icons that represent the content concepts
- Position the slide title prominently and source quote below

IF the slide content involves PROCESS, JOURNEY, or SEQUENCE:
- Create a timeline or flow that represents the sequence mentioned in content points
- Use the actual content points as milestone/step labels
- Add connecting lines with directional arrows only if content implies progression
- Bold key stage names from the slide content using font-weight="700"
- Include the slide title as the main heading
- Incorporate source quote meaningfully

IF the slide content involves CONCEPTS, IDEAS, or INSIGHTS:
- Create a conceptual visualization using geometric shapes and typography
- Feature the slide title as the central element
- Arrange content points around the central theme using clean typography
- Use minimalist icons that represent the specific concepts mentioned
- Include source quote as supporting evidence

🎯 **FINAL CONTENT-DRIVEN INSTRUCTION**:
Ignore the generic chart_type suggestion. Instead, read the slide content above and create a Dieter Rams-inspired infographic that accurately visualizes:
1. The slide title: "{slide_title}"
2. The specific content points listed above
3. The source quote (if provided)

Make it relevant to what THIS SPECIFIC SLIDE is actually about.

CRITICAL INSTRUCTIONS:
- DO NOT create generic business graphics or placeholder content
- DO NOT ignore the slide content in favor of the chart type
- First analyze what "{slide_title}" and its content points are specifically about
- Then design the exact infographic that represents this slide's unique message
- Use the actual slide content as labels, data points, and visual elements
- Apply Dieter Rams minimalism while staying true to the slide content

CONTENT-FIRST DESIGN PROCESS:
1. Read the slide title and content points carefully
2. Identify the key concepts and relationships in this specific content
3. Design visual elements that represent these specific concepts
4. Create THAT content-specific visualization

CRITICAL SVG REQUIREMENTS:
- **UNRESTRICTED DIMENSIONS**: Use optimal width and height for best visual impact - NO size restrictions
- **NATURAL PROPORTIONS**: Design with ideal aspect ratios and spacing for the content type
- **LAYOUT FREEDOM**: Let content determine the optimal canvas size and arrangement
- **MANDATORY TRANSPARENT**: NO background rectangles or fills - SVG must be completely transparent
- **BLACK SLIDE READY**: Design assumes pure black (#000000) slide background - NO SVG background elements
- Generate PURE SVG code only - NO JavaScript, NO variables, NO external references
- Use only static text elements with hardcoded font properties (font-family, font-size, font-weight)
- NO CSS variables, NO JavaScript functions, NO undefined references
- All text must use explicit font attributes: font-family="system-ui" font-size="16" font-weight="400"
- Use only static colors like fill="#FFFFFF" or fill="#01C4C8"

DELIVERABLE PROCESS:
1. Think through your conceptual analysis (don't show this thinking)
2. Return ONLY complete STATIC SVG code that implements your Rams-inspired concept
3. The SVG must show the actual data and relationships provided
4. Use hardcoded font properties - NO CSS classes or variables
5. Follow the exact Dieter Rams design system with static SVG elements only

DELIVERABLE: Return ONLY complete STATIC SVG code (no JavaScript/variables) that implements your conceptual vision of what Dieter Rams would create for this specific slide content."""

        print(f"🎨 Generating Claude 4 minimalist SVG: {chart_type}")
        print(f"📊 Concept: {concept}")
        print(f"🔍 DEBUG: Starting Claude 4 API call...")
        
        # Generate SVG with Claude 4
        try:
            claude_response = anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                temperature=0.3,  # More deterministic SVG generation
                messages=[{"role": "user", "content": claude_prompt}]
            )
            print(f"✅ DEBUG: Claude 4 API call successful")
        except Exception as e:
            print(f"❌ DEBUG: Claude 4 API call failed: {e}")
            raise e
        
        svg_content = claude_response.content[0].text
        print(f"✅ Claude 4 SVG response received: {len(svg_content)} characters")
        print(f"🔍 RAW RESPONSE PREVIEW: {svg_content[:500]}...")
        
        # Save the raw response for debugging
        debug_path = output_path.replace('.svg', '_debug_response.txt')
        with open(debug_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        print(f"🔍 DEBUG: Saved raw Claude response to {debug_path}")
        
        # Extract SVG from response (handle code blocks)
        if '```svg' in svg_content:
            svg_start = svg_content.find('```svg') + 6
            svg_end = svg_content.find('```', svg_start)
            svg_content = svg_content[svg_start:svg_end].strip()
            print(f"✅ Extracted SVG from code block")
        elif '<svg' in svg_content:
            svg_start = svg_content.find('<svg')
            svg_end = svg_content.rfind('</svg>') + 6
            svg_content = svg_content[svg_start:svg_end]
            print(f"✅ Extracted SVG from direct content")
        else:
            print(f"❌ NO SVG FOUND IN RESPONSE! Creating emergency fallback...")
            # Create a simple test SVG instead of green circle
            svg_content = f'''<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
                <rect x="24" y="24" width="552" height="352" fill="none" stroke="#333333" stroke-width="1"/>
                <text x="300" y="190" text-anchor="middle" fill="#FFFFFF" font-family="system-ui" font-size="16">DEBUG: No SVG Generated</text>
                <text x="300" y="210" text-anchor="middle" fill="#888888" font-family="system-ui" font-size="12">Chart Type: {chart_type}</text>
                <text x="300" y="230" text-anchor="middle" fill="#888888" font-family="system-ui" font-size="12">Concept: {concept}</text>
            </svg>'''
        
        print(f"🔍 FIRST PASS SVG PREVIEW: {svg_content[:300]}...")
        
        # DUAL-PASS CHAIN-OF-THOUGHT REFINEMENT
        print(f"🧠 Starting DUAL-PASS chain-of-thought refinement...")
        
        # Create second pass prompt for self-evaluation and improvement
        refinement_prompt = f"""You are a World Class Infographic Designer reviewing your own work for refinement. 

ORIGINAL SVG CODE:
{svg_content}

UNRESTRICTED LAYOUT APPROACH: Design with optimal dimensions and layout freedom
VISUAL TYPE: {chart_type}
TITLE: {title}
CONCEPT: {concept}

CHAIN-OF-THOUGHT EVALUATION:
Please analyze your SVG design with these critical questions:

1. **CRITICAL DATA AUTHENTICITY ISSUES**:
   - **MANDATORY FIX**: Are there ANY statistics, percentages, or numbers (like 25%, 50%, 75%) that were NOT in the original source material?
   - **MANDATORY FIX**: Remove ALL invented data points, fake metrics, and placeholder statistics
   - **MANDATORY FIX**: Verify every data point in the infographic comes from the actual user content
   - **MANDATORY FIX**: If no real metrics exist, create conceptual visuals without fake numbers
   - **MANDATORY FIX**: Never show percentages like 25%, 50%, 75% unless they appear in the original content

2. **CRITICAL TRANSPARENCY ISSUES**:
   - **MANDATORY FIX**: Does the SVG have ANY background rectangles, fills, or background elements?
   - **MANDATORY FIX**: Remove ALL background rectangles (especially black #000000 or white #FFFFFF backgrounds)
   - **MANDATORY FIX**: Ensure the SVG has NO <rect> elements that cover the entire canvas
   - **MANDATORY FIX**: The SVG must be completely transparent - it will sit on a pure black slide
   - **MANDATORY FIX**: Check for any fill="black", fill="#000000", or similar background elements and REMOVE them

3. **CRITICAL TEXT-SHAPE FITTING ISSUES**:
   - **MANDATORY FIX**: Is any text or numbers extending outside the borders of shapes they sit inside?
   - **MANDATORY FIX**: If text doesn't fit inside shapes, either REMOVE the text or ENLARGE the shapes
   - **MANDATORY FIX**: Are there cut-off words that must be shortened or repositioned?
   - **MANDATORY FIX**: Is any text overlapping other text that needs cleaner spacing?
   - Are text elements positioned optimally for the natural flow and hierarchy of the content?

4. **CRITICAL OVERLAPPING OBJECTS ISSUES**:
   - **MANDATORY FIX**: Are any visual elements (shapes, text, lines, icons) overlapping each other?
   - **MANDATORY FIX**: Space overlapping objects further apart with minimum 8px gaps
   - **MANDATORY FIX**: Ensure no visual elements accidentally intersect or cover each other
   - **MANDATORY FIX**: Check that all elements have clear visual boundaries and breathing room
   - Could elements be repositioned for better visual hierarchy while maintaining proper spacing?

5. **VISUAL COMPLEXITY**:
   - Is the infographic overly complex and could be simplified?
   - Are there redundant visual elements that could be removed?
   - Does every element serve a clear communicative purpose?

6. **OPTIMAL LAYOUT DESIGN**:
   - Does the design use its natural optimal dimensions for best visual impact?
   - Are font sizes and elements sized appropriately for clear readability?
   - Is the visual hierarchy clear and effective with unrestricted layout freedom?
   - Does the design take advantage of optimal proportions and spacing?

7. **DIETER RAMS PRINCIPLES**:
   - Does the design embody "less but better"?
   - Is the visual communication as clear and direct as possible?
   - Could the design be more functionally elegant?

REFINEMENT PROCESS:
Based on your analysis above, create an IMPROVED version of the SVG that addresses any issues identified. **MANDATORY REQUIREMENTS**:

🚨 **CRITICAL FIXES REQUIRED (IN ORDER OF PRIORITY)**:
1. **DATA AUTHENTICITY MANDATORY**: Remove ALL invented statistics, percentages, and fake data points that don't exist in source material
2. **NO HALLUCINATED NUMBERS**: Delete any 25%, 50%, 75% or similar placeholder metrics not from original content
3. **VERIFY ALL DATA**: Ensure every statistic and number comes directly from the user's uploaded content
4. **TRANSPARENCY MANDATORY**: Remove ALL background rectangles, fills, or background elements - SVG must be completely transparent
5. **NO BACKGROUND ELEMENTS**: Delete any <rect> elements that cover the entire canvas or create backgrounds
6. **BLACK SLIDE READY**: Ensure no fill="black", fill="#000000", fill="white", or fill="#FFFFFF" background elements
7. **Text-Shape Fitting**: Remove any text that extends outside shape boundaries OR enlarge shapes to contain text properly
8. **Overlapping Objects**: Space all visual elements apart with minimum 8px gaps - NO overlapping allowed
9. **Clean Boundaries**: Every text element and shape must have clear, non-intersecting boundaries
10. **Proper Containment**: All text inside shapes (rectangles, circles, cards) must fit completely within those shapes

📐 **DATA AUTHENTICITY & TRANSPARENCY STANDARDS**:
- **ABSOLUTE PRIORITY**: Verify all data points come from source material - NO invented statistics
- **DATA VERIFICATION**: Remove any 25%, 50%, 75% or similar placeholder percentages
- **AUTHENTICITY CHECK**: Ensure no hallucinated metrics or fake numbers appear
- **TRANSPARENCY CHECK**: Remove all background rectangles and background fills
- **NO CANVAS BACKGROUNDS**: Ensure SVG has no canvas-covering elements
- Minimum 8px between any two visual elements
- Text inside shapes: minimum 4px padding from shape edges
- Overlapping elements must be repositioned with proper spacing
- If spacing creates overcrowding, remove less critical elements

🎯 **ADDITIONAL FOCUS AREAS**:
- **DATA AUTHENTICITY VERIFICATION**: Triple-check that no fake statistics remain
- **TRANSPARENCY VERIFICATION**: Double-check that no background elements remain
- Cleaner text placement and sizing that respects shape boundaries
- Optimal use of space with natural proportions and proper element separation
- Simplified but more effective visual communication with unrestricted layout freedom
- Perfect adherence to Dieter Rams minimalist principles

DELIVERABLE: Return ONLY the refined SVG code that implements your improvements."""

        try:
            print(f"🔍 DEBUG: Starting second pass Claude 4 API call...")
            refinement_response = anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                temperature=0.2,  # Even more deterministic for refinement consistency
                messages=[{"role": "user", "content": refinement_prompt}]
            )
            print(f"✅ DEBUG: Second pass Claude 4 API call successful")
            
            refined_svg_content = refinement_response.content[0].text
            print(f"✅ Claude 4 refinement response received: {len(refined_svg_content)} characters")
            
            # Save the refinement response for debugging
            refinement_debug_path = output_path.replace('.svg', '_refinement_response.txt')
            with open(refinement_debug_path, 'w', encoding='utf-8') as f:
                f.write(refined_svg_content)
            print(f"🔍 DEBUG: Saved refinement response to {refinement_debug_path}")
            
            # Extract refined SVG from response
            if '```svg' in refined_svg_content:
                svg_start = refined_svg_content.find('```svg') + 6
                svg_end = refined_svg_content.find('```', svg_start)
                refined_svg_content = refined_svg_content[svg_start:svg_end].strip()
                print(f"✅ Extracted refined SVG from code block")
            elif '<svg' in refined_svg_content:
                svg_start = refined_svg_content.find('<svg')
                svg_end = refined_svg_content.rfind('</svg>') + 6
                refined_svg_content = refined_svg_content[svg_start:svg_end]
                print(f"✅ Extracted refined SVG from direct content")
            else:
                print(f"⚠️ No refined SVG found, using original SVG")
                refined_svg_content = svg_content
            
            # Use refined SVG if it's valid, otherwise fall back to original
            if '<svg' in refined_svg_content and '</svg>' in refined_svg_content:
                svg_content = refined_svg_content
                print(f"🎯 Using REFINED SVG after dual-pass evaluation")
            else:
                print(f"⚠️ Refined SVG invalid, using original SVG")
                
        except Exception as e:
            print(f"⚠️ Second pass refinement failed: {e}")
            print(f"🔄 Continuing with original SVG from first pass")
        
        print(f"🔍 FINAL SVG PREVIEW: {svg_content[:300]}...")
        
        # Ensure proper SVG structure and dimensions
        if not svg_content.startswith('<?xml'):
            svg_content = '<?xml version="1.0" encoding="UTF-8"?>\n' + svg_content
        
        # Allow natural SVG dimensions - no forced sizing
        
        # Ensure completely transparent background for black slides
        if 'style="background:transparent"' not in svg_content:
            svg_content = svg_content.replace('<svg', '<svg style="background:transparent"', 1)
        
        # Remove any background rectangles that might interfere with transparency
        import re
        # Remove black backgrounds
        svg_content = re.sub(r'<rect[^>]*fill="#000000"[^>]*></rect>', '', svg_content)
        svg_content = re.sub(r'<rect[^>]*fill="black"[^>]*></rect>', '', svg_content)
        # Remove white backgrounds  
        svg_content = re.sub(r'<rect[^>]*fill="#FFFFFF"[^>]*></rect>', '', svg_content)
        svg_content = re.sub(r'<rect[^>]*fill="white"[^>]*></rect>', '', svg_content)
        # Remove full canvas backgrounds
        svg_content = re.sub(r'<rect[^>]*width="100%"[^>]*height="100%"[^>]*></rect>', '', svg_content)
        svg_content = re.sub(r'<rect[^>]*width="[0-9]+"[^>]*height="[0-9]+"[^>]*x="0"[^>]*y="0"[^>]*></rect>', '', svg_content)
        # Remove any rect that spans the full canvas dimensions
        svg_content = re.sub(r'<rect[^>]*x="0"[^>]*y="0"[^>]*width="[0-9]+"[^>]*height="[0-9]+"[^>]*fill[^>]*></rect>', '', svg_content)
        
        print(f"🔍 TRANSPARENCY CHECK: Removed background elements from SVG")
        
        # Save SVG file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        
        print(f"✅ Generated Claude 4 DUAL-PASS refined SVG: {output_path}")
        print(f"   🎨 Style: Apple minimalist with chain-of-thought refinement")
        print(f"   📏 Dimensions: Optimal unrestricted layout")
        print(f"   💎 Quality: Executive-level conceptual design")
        print(f"   🧠 Process: Dual-pass chain-of-thought evaluation & improvement")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR generating Claude 4 SVG: {e}")
        print(f"❌ EXCEPTION TYPE: {type(e).__name__}")
        print(f"❌ FULL TRACEBACK:")
        import traceback
        traceback.print_exc()
        print(f"❌ Falling back to simple geometric SVG")
        
        # Fallback: Create a simple geometric SVG with optimal dimensions
        fallback_svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" style="background:transparent">
  <defs>
    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#01C4C8;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#4ECDC4;stop-opacity:0.6" />
    </linearGradient>
  </defs>
  <circle cx="300" cy="200" r="120" fill="url(#gradient1)" opacity="0.7"/>
  <text x="300" y="210" text-anchor="middle" fill="white" font-family="SF Pro Display, Helvetica, Arial, sans-serif" font-size="24" font-weight="300">{title}</text>
</svg>'''
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(fallback_svg)
        
        return True

# Removed matplotlib-based chart generation functions
# Now using Claude 4 for SVG generation instead

def apply_readable_typography(ax, title, subtitle=None, caption=None):
    """MASSIVE WHITE HEADERS Typography - HUGE text for 4"x3.5" visibility"""
    MASSIVE_TYPOGRAPHY = {
        'title': {'size': 48, 'weight': 'bold', 'color': '#FFFFFF'},      # HUGE WHITE titles!
        'subtitle': {'size': 36, 'weight': '600', 'color': '#FFFFFF'},    # LARGE WHITE subtitles!
        'caption': {'size': 28, 'weight': 'normal', 'color': '#01C4C8'}   # BIG NXT cyan captions
    }
    
    # MASSIVE WHITE title - dominates the top of chart
    ax.text(0.5, 0.92, title, transform=ax.transAxes,
           ha='center', va='top', 
           fontsize=MASSIVE_TYPOGRAPHY['title']['size'],
           fontweight=MASSIVE_TYPOGRAPHY['title']['weight'],
           color=MASSIVE_TYPOGRAPHY['title']['color'],
           fontfamily='sans-serif')  # HUGE, bold font
    
    if subtitle:
        ax.text(0.5, 0.82, subtitle, transform=ax.transAxes,
               ha='center', va='top', **MASSIVE_TYPOGRAPHY['subtitle'])
    
    if caption:
        ax.text(0.5, 0.08, caption, transform=ax.transAxes,
               ha='center', va='bottom', **MASSIVE_TYPOGRAPHY['caption'])

def generate_modern_bar_chart(ax, labels, values, colors, layout, format_type):
    """MASSIVE CHART ELEMENTS for 4" x 3.5" - EXPANDED TO FILL SPACE!"""
    max_val = max(values) if values else 1
    
    # EXPAND chart to use ENTIRE 4"x3.5" area - BIGGER IS BETTER!
    # Remove all margins and maximize chart element size
    ax.set_xlim(-0.1, 1.1)  # Use full width
    ax.set_ylim(-0.1, 1.1)  # Use full height
    
    # Smart layout selection for MAXIMUM impact
    if len(labels) > 4 or max(len(str(label)) for label in labels) > 8:
        layout = 'horizontal'  # Horizontal for better 4" width usage
    elif len(labels) <= 3:
        layout = 'vertical'    # Vertical for fewer items
    
    if layout == 'horizontal':
        # MASSIVE HORIZONTAL BARS - FILL THE ENTIRE 4" WIDTH!
        y_positions = np.linspace(0.15, 0.85, len(labels))  # Better spacing from edges
        
        # MAXIMUM bar height with IMPROVED SPACING between bars
        bar_height = 0.6 / len(labels)  # Share 60% of space for better separation
        bar_height = max(bar_height, 0.06)  # Minimum visibility
        bar_height = min(bar_height, 0.15)  # Maximum for good spacing
        
        # Normalize values to use FULL width (0.1 to 0.9)
        normalized_values = [(val / max_val) * 0.8 + 0.1 for val in values]
        
        # Create LARGE filled bars that dominate the space
        for i, (y_pos, norm_val, orig_val) in enumerate(zip(y_positions, normalized_values, values)):
            bar_color = colors[i % len(colors)]
            
            # MASSIVE bars with strong colors - USE MORE SPACE!
            bar_rect = patches.Rectangle((0.05, y_pos - bar_height/2), norm_val - 0.05, bar_height,
                                       facecolor=bar_color, 
                                       edgecolor='#FFFFFF', linewidth=2, alpha=0.9)
            ax.add_patch(bar_rect)
            
            # SMART label colors - use bar color for values, white for categories
            value_color = bar_color if norm_val < 0.7 else '#FFFFFF'  # Bar color unless bar is too wide
            
            # MASSIVE value labels with smart color - HUGE TEXT!
            ax.text(norm_val + 0.02, y_pos, format_value(orig_val, format_type),
                   ha='left', va='center', fontsize=32, fontweight='bold', color=value_color)
            
            # MASSIVE category labels with brand color - HUGE TEXT!
            label_text = str(labels[i])[:10] + '...' if len(str(labels[i])) > 10 else str(labels[i])
            ax.text(0.02, y_pos, label_text,
                   ha='right', va='center', fontsize=28, fontweight='600', color='#01C4C8')
        
        # Optimized value labels - positioned for 4" width
        for i, (bar, value) in enumerate(zip(bars, values)):
            width = bar.get_width()
            # Smart positioning based on bar length
            label_x = width + max_val * 0.03 if width < max_val * 0.8 else width * 0.95
            label_color = '#000000' if width < max_val * 0.8 else '#FFFFFF'
            
            ax.text(label_x, bar.get_y() + bar.get_height()/2, 
                   format_value(value, format_type), 
                   ha='left' if width < max_val * 0.8 else 'right', 
                   va='center', fontweight='bold', 
                   color=label_color, fontsize=12)  # Scaled for 4" width
        
        # Optimize label display for 4" width
        ax.set_yticks(y_positions)
        # Truncate long labels to fit elegantly
        truncated_labels = [label[:12] + '...' if len(str(label)) > 12 else str(label) for label in labels]
        ax.set_yticklabels(truncated_labels, fontsize=11, color='#000000', fontweight='500')
        
        # Add subtle x-axis label
        ax.set_xlabel('Value', fontsize=10, fontweight='600', color='#666666')
        
        # Optimize x-axis for 4" width
        ax.set_xlim(0, max_val * 1.15)  # Tight but with room for labels
        
    else:
        # MASSIVE VERTICAL BARS - FILL THE ENTIRE 3.5" HEIGHT!
        x_positions = np.linspace(0.2, 0.8, len(labels))  # Better spacing from edges
        
        # MAXIMUM bar width with IMPROVED SPACING between bars
        bar_width = 0.5 / len(labels)  # Share 50% of width for better separation
        bar_width = max(bar_width, 0.06)  # Minimum visibility
        bar_width = min(bar_width, 0.12)  # Maximum for good spacing
        
        # Normalize values to use FULL height (0.1 to 0.9)
        normalized_values = [(val / max_val) * 0.8 + 0.1 for val in values]
        
        # Create LARGE filled bars that dominate the space
        for i, (x_pos, norm_val, orig_val) in enumerate(zip(x_positions, normalized_values, values)):
            bar_color = colors[i % len(colors)]
            
            # MASSIVE bars with strong colors - USE MORE SPACE!
            bar_rect = patches.Rectangle((x_pos - bar_width/2, 0.05), bar_width, norm_val - 0.05,
                                       facecolor=bar_color, 
                                       edgecolor='#FFFFFF', linewidth=2, alpha=0.9)
            ax.add_patch(bar_rect)
            
            # SMART label colors - use bar color for values, brand color for categories
            value_color = bar_color if norm_val < 0.7 else '#FFFFFF'  # Bar color unless bar is too tall
            
            # MASSIVE value labels with smart color - HUGE TEXT!
            ax.text(x_pos, norm_val + 0.04, format_value(orig_val, format_type),
                   ha='center', va='bottom', fontsize=32, fontweight='bold', color=value_color)
            
            # MASSIVE category labels with brand color - HUGE TEXT!
            label_text = str(labels[i])[:5] + '...' if len(str(labels[i])) > 5 else str(labels[i])
            ax.text(x_pos, 0.01, label_text,
                   ha='center', va='bottom', fontsize=28, fontweight='600', color='#01C4C8',
                   rotation=35 if len(str(labels[i])) > 3 else 0)  # Rotate for space
        
        # Smart value label positioning for 3.5" height
        for i, (bar, value) in enumerate(zip(bars, values)):
            height = bar.get_height()
            # Position based on available height
            if height < max_val * 0.8:  # Room above bar
                ax.text(bar.get_x() + bar.get_width()/2, height + max_val * 0.03,
                       format_value(value, format_type),
                       ha='center', va='bottom', fontweight='bold',
                       color='#000000', fontsize=12)
            else:  # Place inside bar for tall bars
                ax.text(bar.get_x() + bar.get_width()/2, height * 0.9,
                       format_value(value, format_type),
                       ha='center', va='center', fontweight='bold',
                       color='#FFFFFF', fontsize=12)
        
        # Optimize labels for 4" width - smart rotation
        ax.set_xticks(x_positions)
        if max(len(str(label)) for label in labels) > 6:  # Long labels need rotation
            ax.set_xticklabels(labels, fontsize=10, color='#000000', fontweight='500', 
                              rotation=35, ha='right')  # Elegant angle
        else:  # Short labels can be horizontal
            ax.set_xticklabels(labels, fontsize=11, color='#000000', fontweight='500')
        
        # Add subtle y-axis label
        ax.set_ylabel('Value', fontsize=10, fontweight='600', color='#666666')
        
        # Optimize y-axis for 3.5" height
        ax.set_ylim(0, max_val * 1.12)  # Tight but with room for labels
    
    # NO GRID OR SPINES - Pure chart elements only!
    ax.grid(False)
    ax.set_xticks([])
    ax.set_yticks([])
    
    # Remove all spines for clean look
    for spine in ax.spines.values():
        spine.set_visible(False)
    
    # No tick marks - clean presentation
    ax.tick_params(length=0, width=0, labelsize=0)

def generate_modern_line_chart(ax, labels, values, colors, format_type):
    """MASSIVE LINE CHART for 4" x 3.5" - EXPANDED ELEMENTS!"""
    max_val = max(values) if values else 1
    min_val = min(values) if values else 0
    value_range = max_val - min_val
    
    # EXPAND chart to use ENTIRE space
    ax.set_xlim(-0.1, 1.1)
    ax.set_ylim(-0.1, 1.1)
    
    # Normalize positions and values to use full space
    x_positions = np.linspace(0.1, 0.9, len(labels))
    normalized_values = [(val - min_val) / value_range * 0.8 + 0.1 for val in values] if value_range > 0 else [0.5] * len(values)
    
    # MASSIVE line with ENORMOUS markers for 4"x3.5" impact
    ax.plot(x_positions, normalized_values, 
           linewidth=12,           # EXTREMELY THICK line for visibility
           color=colors[0], 
           marker='o',             # Large circle markers
           markersize=25,          # ENORMOUS markers for 4"x3.5"!
           markerfacecolor=colors[0],
           markeredgecolor='#FFFFFF',
           markeredgewidth=4,
           alpha=0.9, zorder=3)
    
    # LARGE value labels with SMART positioning and colors
    for i, (x_pos, norm_val, value) in enumerate(zip(x_positions, normalized_values, values)):
        # Smart color - alternate between line color and brand color
        label_color = colors[i % len(colors)] if len(colors) > 1 else colors[0]
        
        # MASSIVE value labels positioned optimally - HUGE TEXT!
        label_y = norm_val + 0.12 if norm_val < 0.7 else norm_val - 0.12  # More spacing from edges
        ax.text(x_pos, label_y, format_value(value, format_type), 
               ha='center', va='center', fontweight='bold', 
               color=label_color, fontsize=30,  # MASSIVE font for 4"x3.5" visibility!
               bbox=dict(boxstyle="round,pad=0.5", facecolor='#000000', alpha=0.8, edgecolor='none'))
    
    # MASSIVE category labels positioned at bottom with SMART COLORS
    for i, (x_pos, label) in enumerate(zip(x_positions, labels)):
        label_text = str(label)[:6] + '...' if len(str(label)) > 6 else str(label)
        label_color = '#01C4C8'  # NXT brand color for categories
        
        ax.text(x_pos, 0.05, label_text, 
               ha='center', va='bottom', fontweight='600',
               color=label_color, fontsize=26,  # MASSIVE category labels for 4"x3.5"!
               rotation=30 if len(str(label)) > 4 else 0)  # Rotate long labels for space
    
    # NO GRID, SPINES, OR TICKS - Pure chart elements
    ax.grid(False)
    ax.set_xticks([])
    ax.set_yticks([])
    
    # Remove all spines for clean look
    for spine in ax.spines.values():
        spine.set_visible(False)
    
    # No tick marks
    ax.tick_params(length=0, width=0, labelsize=0)

def generate_modern_pie_chart(ax, labels, values, colors, format_type):
    """MASSIVE PIE CHART for 4" x 3.5" - FILL THE ENTIRE SPACE!"""
    # Calculate total for percentages
    total = sum(values)
    
    # EXPAND chart to use ENTIRE 4"x3.5" area
    ax.set_xlim(-1.2, 1.2)
    ax.set_ylim(-1.2, 1.2)
    
    # MASSIVE pie positioned to use maximum space
    pie_center = (-0.2, 0)  # Slightly left for legend space
    pie_radius = 0.9        # HUGE pie - use most of the space!
    
    # Create LARGE filled pie with bold edges
    wedges, texts, autotexts = ax.pie(values, labels=None, colors=colors, 
                                     autopct='', startangle=90, center=pie_center,
                                     radius=pie_radius,
                                     wedgeprops=dict(edgecolor='#FFFFFF', linewidth=4, alpha=0.9))
    
    # MASSIVE legend with HUGE text positioned to maximize readability
    legend_x = 0.75  # Optimal position for maximum pie + legend space
    max_items = min(len(labels), 5)  # Limit for better spacing
    
    for i in range(max_items):
        if i >= len(labels):
            break
            
        label, value = labels[i], values[i]
        percentage = (value / total * 100) if total > 0 else 0
        
        # EXTRA WIDE vertical spacing for MASSIVE text
        y_pos = 0.7 - (i * 0.35)  # MASSIVE spacing for huge text
        
        # MASSIVE color indicator - extremely visible
        indicator_size = 0.12  # HUGE indicator for 4"x3.5" viewing
        indicator = patches.Rectangle((legend_x - 0.18, y_pos - indicator_size/2), 
                                    indicator_size*2, indicator_size, 
                                    facecolor=colors[i % len(colors)], 
                                    edgecolor='#FFFFFF', linewidth=3, alpha=0.9)
        ax.add_patch(indicator)
        
        # MASSIVE label text with SMART COLORS for maximum contrast
        label_text = label[:8] + '...' if len(str(label)) > 8 else str(label)
        legend_color = colors[i % len(colors)]  # Use the slice color
        
        ax.text(legend_x, y_pos, f"{label_text}\n{percentage:.0f}%", 
               ha='left', va='center', fontweight='bold', 
               color=legend_color, fontsize=24)  # MASSIVE legend text for 4"x3.5"!
    
    # Handle overflow labels for many items
    if len(labels) > max_items:
        ax.text(legend_x, y_pos - 0.25, f"...+{len(labels) - max_items} more", 
               ha='left', va='center', fontweight='400', 
               color='#CCCCCC', fontsize=12)
    
    # MAXIMIZE SPACE USAGE - push pie and legend to edges
    ax.set_xlim(-1.1, 1.3)  # Extend further for more space
    ax.set_ylim(-1.1, 1.1)  # Use full height
    ax.axis('off')

def generate_modern_donut_chart(ax, labels, values, colors, format_type):
    """Generate outlined vector donut chart - labels positioned completely outside"""
    # Create donut with outlined wedges, positioned left to make room for labels
    wedges, texts = ax.pie(values, labels=None, colors='none', 
                          startangle=90, center=(-0.3, 0),
                          wedgeprops=dict(width=0.4, edgecolor='white', linewidth=0.5))
    
    # Apply neon outlines to each wedge
    for i, wedge in enumerate(wedges):
        wedge.set_edgecolor(colors[i % len(colors)])
        wedge.set_linewidth(4)
        wedge.set_alpha(0.8)
        wedge.set_facecolor('none')
    
    # Neon center text with glow effect (positioned with the donut)
    total = sum(values)
    for offset in [(2, 2), (1, 1), (0, 0)]:
        ax.text(-0.3 + offset[0]*0.02, offset[1]*0.02, f"{format_value(total, format_type)}\nTotal", 
               ha='center', va='center', fontsize=12, fontweight='700', 
               color=colors[0], alpha=0.3 if offset != (0, 0) else 1.0)
    
    # Position labels completely to the right side (no overlap)
    for i, (label, value) in enumerate(zip(labels, values)):
        y_pos = 0.4 - (i * 0.2)  # Vertical spacing for labels
        
        # Color indicator circle
        indicator = patches.Circle((0.4, y_pos), 0.03, facecolor='none', 
                                 edgecolor=colors[i % len(colors)], linewidth=3, alpha=0.9)
        ax.add_patch(indicator)
        
        # Label text positioned to the right
        ax.text(0.5, y_pos, f"{label}: {format_value(value, format_type)}", 
               ha='left', va='center', fontweight='500', 
               color='#FFFFFF', fontsize=9)
    
    # Set limits to accommodate both donut and labels
    ax.set_xlim(-1.0, 1.5)
    ax.set_ylim(-0.8, 0.8)

def generate_modern_funnel_chart(ax, labels, values, colors, format_type):
    """MASSIVE FUNNEL CHART for 4" x 3.5" - MAXIMUM SPACE USAGE!"""
    # Sort values in descending order for funnel effect
    sorted_data = sorted(zip(labels, values), key=lambda x: x[1], reverse=True)
    labels, values = zip(*sorted_data)
    
    max_value = max(values) if values else 1
    num_items = len(values)
    
    # EXPAND chart to use ENTIRE 4"x3.5" area
    ax.set_xlim(-0.05, 1.05)
    ax.set_ylim(-0.05, 1.05)
    
    # MAXIMIZE space usage for funnel
    funnel_width = 0.8   # Use 80% of width for funnel bars
    x_center = 0.1       # Start funnel from left edge
    
    for i, (label, value) in enumerate(zip(labels, values)):
        y_pos = (num_items - 1 - i) * (bar_height + 0.1)  # Stack from top
        
        # Calculate funnel width (narrowing effect)
        width_ratio = (value / max_value) * 0.9 + 0.1  # Min 10% width
        bar_width = funnel_width * width_ratio
        
        # Create filled funnel segments
        rect = patches.Rectangle((x_center, y_pos), bar_width, bar_height, 
                               facecolor=colors[i % len(colors)], 
                               edgecolor='#000000', 
                               linewidth=1.5, alpha=0.85)
        ax.add_patch(rect)
        
        # Optimized labels for 4" width - truncate if needed
        label_text = label[:12] + '...' if len(str(label)) > 12 else str(label)
        
        # MASSIVE label positioning with HUGE text and better colors
        label_text = label[:8] + '...' if len(str(label)) > 8 else str(label)
        
        # Position labels to the left with NXT brand color - MASSIVE TEXT!
        ax.text(x_center - 0.03, y_pos + bar_height/2, label_text, 
               ha='right', va='center', 
               fontweight='600', color='#01C4C8', fontsize=28)  # HUGE NXT cyan labels!
        
        # MASSIVE values - always visible with smart color choice
        value_color = bar_color if bar_width < funnel_width * 0.4 else '#FFFFFF'  # Smart contrast
        
        if bar_width > funnel_width * 0.2:  # Wide enough for internal label
            ax.text(x_center + bar_width/2, y_pos + bar_height/2, 
                   format_value(value, format_type), 
                   ha='center', va='center', fontweight='bold', 
                   color='#FFFFFF', fontsize=32)  # HUGE white internal labels!
        else:  # Place value to the right for narrow bars
            ax.text(x_center + bar_width + 0.05, y_pos + bar_height/2, 
                   format_value(value, format_type), 
                   ha='left', va='center', fontweight='bold', 
                   color=value_color, fontsize=32)  # HUGE external labels!
    
    # NO GRID OR SPINES - clean funnel presentation
    ax.axis('off')

def generate_modern_timeline_chart(ax, labels, values, colors, format_type):
    """MASSIVE TIMELINE CHART for 4" x 3.5" - HUGE ELEMENTS!"""
    num_items = len(labels)
    
    # EXPAND chart to use ENTIRE 4"x3.5" area
    ax.set_xlim(-0.1, 1.1)
    ax.set_ylim(-0.1, 1.1)
    
    # Optimize timeline layout for MAXIMUM impact
    if num_items <= 5:
        # Horizontal timeline with MASSIVE elements
        positions = np.linspace(0.15, 0.85, num_items)  # Better spacing
        timeline_y = 0.5
        
        # Clean timeline line
        ax.plot([positions[0]-0.05, positions[-1]+0.05], [timeline_y, timeline_y], 
               color=colors[0], linewidth=3, alpha=0.8)
        
        for i, (pos, label, value) in enumerate(zip(positions, labels, values)):
            # MASSIVE timeline point - highly visible
            circle = patches.Circle((pos, timeline_y), 0.08, 
                                  facecolor=colors[i % len(colors)], 
                                  edgecolor='#FFFFFF', linewidth=4, alpha=0.9)
            ax.add_patch(circle)
            
            # Smart label positioning with WIDE spacing
            label_y = 0.8 if i % 2 == 0 else 0.2
            
            # THICK connection line
            ax.plot([pos, pos], [timeline_y + 0.08, label_y - 0.08], 
                   color=colors[i % len(colors)], linewidth=4, alpha=0.8)
            
            # Truncate labels for space
            display_label = label[:6] + '...' if len(str(label)) > 6 else str(label)
            
            # MASSIVE label text - NXT CYAN
            ax.text(pos, label_y, display_label, ha='center', va='center', 
                   fontweight='600', color='#01C4C8', fontsize=24)
            
            # MASSIVE value text
            ax.text(pos, label_y - 0.12 if i % 2 == 0 else label_y + 0.12, 
                   format_value(value, format_type), ha='center', va='center', 
                   fontsize=28, color=colors[i % len(colors)], fontweight='bold')
        
        ax.set_xlim(0, 1)
        ax.set_ylim(0.1, 0.9)
        
    else:
        # Vertical timeline for >5 items to fit 3.5" height
        available_height = 3.5 * 0.8
        item_spacing = min(0.15, available_height / num_items)
        positions = np.linspace(0.1, 0.1 + (num_items-1) * item_spacing, num_items)
        timeline_x = 0.3
        
        # Vertical timeline line
        ax.plot([timeline_x, timeline_x], [positions[0]-0.05, positions[-1]+0.05], 
               color=colors[0], linewidth=3, alpha=0.8)
        
        for i, (pos, label, value) in enumerate(zip(positions, labels, values)):
            # Timeline point
            circle = patches.Circle((timeline_x, pos), 0.03, 
                                  facecolor=colors[i % len(colors)], 
                                  edgecolor='#000000', linewidth=2, alpha=0.85)
            ax.add_patch(circle)
            
            # Labels to the right with proper spacing for 4" width
            ax.text(timeline_x + 0.1, pos, 
                   label[:15] + '...' if len(str(label)) > 15 else str(label), 
                   ha='left', va='center', 
                   fontweight='600', color='#000000', fontsize=9)
            
            # Values aligned below labels
            ax.text(timeline_x + 0.1, pos - 0.03, format_value(value, format_type), 
                   ha='left', va='center', 
                   fontsize=8, color=colors[i % len(colors)], fontweight='600')
        
        ax.set_xlim(0, 1)
        ax.set_ylim(0, positions[-1] + 0.15)
    
    ax.axis('off')

def generate_modern_kpi_dashboard(ax, labels, values, colors, format_type):
    """MASSIVE KPI Dashboard for 4" x 3.5" - HUGE ELEMENTS!"""
    num_items = len(labels)
    
    # EXPAND chart to use ENTIRE 4"x3.5" area
    ax.set_xlim(-0.05, 1.05)
    ax.set_ylim(-0.05, 1.05)
    
    # Smart grid layout optimized for 4"x3.5" dimensions
    if num_items <= 2:
        cols, rows = 1, num_items  # Stack vertically for 1-2 items
        card_width, card_height = 0.7, 0.35
    elif num_items <= 4:
        cols, rows = 2, 2  # 2x2 grid for 3-4 items
        card_width, card_height = 0.35, 0.3
    elif num_items <= 6:
        cols, rows = 3, 2  # 3x2 grid for 5-6 items
        card_width, card_height = 0.25, 0.25
    else:
        cols, rows = 3, 3  # 3x3 grid for 7+ items
        card_width, card_height = 0.25, 0.2
    
    # Calculate spacing for elegant layout
    h_spacing = 0.9 / cols if cols > 1 else 0.5
    v_spacing = 0.8 / rows if rows > 1 else 0.5
    
    for i, (label, value) in enumerate(zip(labels, values)):
        if i >= 9:  # Limit to 9 items for 4"x3.5" viewing
            break
            
        row = i // cols
        col = i % cols
        
        # Calculate elegant position
        x = 0.1 + col * h_spacing + h_spacing/2
        y = 0.9 - row * v_spacing - v_spacing/2
        
        # Create filled KPI cards with clean styling
        rect = patches.FancyBboxPatch((x - card_width/2, y - card_height/2), 
                                     card_width, card_height, 
                                     boxstyle="round,pad=0.02", 
                                     facecolor=colors[i % len(colors)], 
                                     edgecolor='#000000', linewidth=1.5, alpha=0.85)
        ax.add_patch(rect)
        
        # Optimized text sizing for card dimensions
        value_font_size = min(12, max(8, int(card_width * 30)))  # Scale with card size
        label_font_size = min(9, max(7, int(card_width * 20)))
        
        # Truncate label if needed for card width
        max_chars = max(6, int(card_width * 20))
        display_label = label[:max_chars] + '...' if len(str(label)) > max_chars else str(label)
        
        # Value text - prominent and readable
        ax.text(x, y + card_height/6, format_value(value, format_type), 
               ha='center', va='center', 
               fontsize=value_font_size, fontweight='bold', color='#FFFFFF')
        
        # Label text - clean and legible
        ax.text(x, y - card_height/6, display_label, 
               ha='center', va='center', 
               fontsize=label_font_size, color='#FFFFFF', fontweight='500')
    
    # Handle overflow indication
    if num_items > 9:
        ax.text(0.5, 0.05, f"Showing 9 of {num_items} metrics", 
               ha='center', va='bottom', 
               fontsize=8, color='#666666', fontweight='400')
    
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')

def generate_modern_comparison_chart(ax, labels, values, comparison_data, colors, format_type):
    """Generate pure outline stroke before/after comparison chart - modern & creative"""
    before_values = comparison_data.get('before', values)
    after_values = comparison_data.get('after', values)
    
    x = np.arange(len(labels))
    width = 0.3
    
    # Create pure outline bars (no fills)
    for i, (x_pos, before_val, after_val) in enumerate(zip(x, before_values, after_values)):
        # Before bars - outline only
        before_rect = patches.Rectangle((x_pos - width/2, 0), width, before_val, 
                                      facecolor='none', 
                                      edgecolor=colors[0], linewidth=3, alpha=0.9)
        ax.add_patch(before_rect)
        
        # After bars - outline only  
        after_rect = patches.Rectangle((x_pos + width/2, 0), width, after_val, 
                                     facecolor='none', 
                                     edgecolor=colors[1], linewidth=3, alpha=0.9)
        ax.add_patch(after_rect)
        
        # Creative connection lines between bars
        if before_val != after_val:
            ax.plot([x_pos - width/2 + width, x_pos + width/2], [before_val, after_val], 
                   color='#FFFFFF', linewidth=1, alpha=0.3, linestyle='--')
        
        # Modern floating value labels
        ax.text(x_pos - width/2 + width/2, before_val + max(max(before_values), max(after_values)) * 0.02,
               format_value(before_val, format_type), ha='center', va='bottom', 
               fontweight='600', color=colors[0], fontsize=10)
        
        ax.text(x_pos + width/2 + width/2, after_val + max(max(before_values), max(after_values)) * 0.02,
               format_value(after_val, format_type), ha='center', va='bottom', 
               fontweight='600', color=colors[1], fontsize=10)
    
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=0, ha='center', color='#FFFFFF', fontweight='500')
    ax.set_yticks([])
    ax.tick_params(length=0, colors='#FFFFFF')
    
    # Neon legend with outlined markers
    legend_elements = [patches.Rectangle((0,0),1,1, facecolor='none', edgecolor=colors[0], linewidth=3, label='Before'),
                      patches.Rectangle((0,0),1,1, facecolor='none', edgecolor=colors[1], linewidth=3, label='After')]
    ax.legend(handles=legend_elements, loc='upper right', frameon=False, labelcolor='#FFFFFF', fontweight='500')

def generate_modern_waterfall_chart(ax, labels, values, colors, format_type):
    """Generate pure outline stroke waterfall chart - modern & creative"""
    cumulative = [0]
    for value in values[:-1]:
        cumulative.append(cumulative[-1] + value)
    
    final_total = cumulative[-1] + values[-1]
    
    for i, (label, value) in enumerate(zip(labels, values)):
        bar_color = colors[0] if value >= 0 else colors[2] if len(colors) > 2 else '#FF6B6B'
        
        if i == 0:
            # Starting value - outline only
            rect = patches.Rectangle((i - 0.3, 0), 0.6, value, 
                                   facecolor='none', 
                                   edgecolor=bar_color, linewidth=4, alpha=0.9)
            ax.add_patch(rect)
            bottom = 0
        elif i == len(labels) - 1:
            # Final total - outline only
            rect = patches.Rectangle((i - 0.3, 0), 0.6, final_total, 
                                   facecolor='none', 
                                   edgecolor=colors[1], linewidth=4, alpha=0.9)
            ax.add_patch(rect)
            bottom = 0
            value = final_total  # For label positioning
        else:
            # Incremental values - outline only
            bottom = cumulative[i]
            rect = patches.Rectangle((i - 0.3, bottom), 0.6, value, 
                                   facecolor='none', 
                                   edgecolor=bar_color, linewidth=4, alpha=0.9)
            ax.add_patch(rect)
        
        # Add creative inner accent lines
        if abs(value) > 0:
            accent_rect = patches.Rectangle((i - 0.25, bottom + 0.02), 0.5, abs(value) - 0.04, 
                                         facecolor='none', 
                                         edgecolor=bar_color, linewidth=1, alpha=0.3)
            ax.add_patch(accent_rect)
        
        # Add neon connecting flow lines
        if i < len(labels) - 1 and i > 0:
            next_bottom = cumulative[i + 1] if i + 1 < len(cumulative) else final_total
            # Create flowing connection with glow effect
            for lw, alpha in [(3, 0.2), (1, 0.8)]:
                ax.plot([i + 0.3, i + 0.7], [bottom + value, next_bottom], 
                       color=colors[0], linewidth=lw, alpha=alpha, linestyle='--')
        
        # Modern floating value labels
        y_pos = (bottom + value/2) if i != len(labels) - 1 else final_total/2
        ax.text(i, y_pos, format_value(value if i != len(labels) - 1 else final_total, format_type), 
               ha='center', va='center', fontweight='600', color=bar_color, fontsize=11)
    
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=0, ha='center', color='#FFFFFF', fontweight='500')
    ax.set_yticks([])
    ax.tick_params(length=0, colors='#FFFFFF')

def generate_modern_progress_chart(ax, labels, values, colors, format_type):
    """ELEGANTLY OPTIMIZED Progress Chart for 4" x 3.5" - Perfect Proportions"""
    max_val = 100 if format_type == 'percentage' else max(values)
    num_items = len(labels)
    
    # Optimize layout for 3.5" height
    available_height = 3.5 * 0.8
    bar_height = min(0.3, available_height / num_items * 0.7)  # Dynamic bar height
    spacing = bar_height + 0.1
    
    # Calculate progress bar area optimized for 4" width
    progress_width = 2.0  # Use about half width for progress bars
    label_width = 1.5     # Space for labels
    value_width = 0.8     # Space for values
    
    for i, (label, value) in enumerate(zip(labels, values)):
        y_pos = (num_items - i - 1) * spacing + 0.2
        progress = min(1.0, value / max_val) if max_val > 0 else 0
        
        # Background track - light gray filled
        bg_rect = patches.Rectangle((label_width, y_pos - bar_height/2), 
                                  progress_width, bar_height, 
                                  facecolor='#EEEEEE', edgecolor='#CCCCCC', 
                                  linewidth=1, alpha=0.8)
        ax.add_patch(bg_rect)
        
        # Progress bar - filled with color for clear visibility
        if progress > 0:
            prog_rect = patches.Rectangle((label_width, y_pos - bar_height/2), 
                                        progress_width * progress, bar_height, 
                                        facecolor=colors[i % len(colors)], 
                                        edgecolor='#000000', linewidth=1.5, alpha=0.85)
            ax.add_patch(prog_rect)
        
        # Truncate label for available space
        max_label_chars = int(label_width * 8)  # Estimate chars that fit
        display_label = label[:max_label_chars] + '...' if len(str(label)) > max_label_chars else str(label)
        
        # MASSIVE label text - NXT CYAN
        ax.text(label_width - 0.1, y_pos, display_label, 
               ha='right', va='center', 
               fontweight='600', color='#01C4C8', fontsize=24)
        
        # MASSIVE value text - smart colors
        ax.text(label_width + progress_width + 0.1, y_pos, 
               format_value(value, format_type), 
               ha='left', va='center', 
               fontweight='bold', color=colors[i % len(colors)], fontsize=28)
        
        # LARGE percentage inside bar if wide enough
        if progress > 0.3:  # Only if bar is wide enough for large text
            percentage = f"{progress * 100:.0f}%" if format_type == 'percentage' else f"{progress * 100:.0f}%"
            ax.text(label_width + (progress_width * progress) / 2, y_pos, percentage, 
                   ha='center', va='center', 
                   fontweight='bold', color='#FFFFFF', fontsize=20)
    
    # EXPAND to use ENTIRE 4"x3.5" space
    ax.set_xlim(-0.05, 1.05)
    ax.set_ylim(-0.05, 1.05)
    ax.axis('off')

def generate_modern_metric_cards(ax, labels, values, colors, format_type):
    """Generate pure outline stroke metric cards - modern & creative"""
    if len(labels) <= 2:
        # Large cards for 1-2 metrics
        cols, rows = 1, len(labels)
        card_size = 0.4
    elif len(labels) <= 4:
        # Medium cards for 3-4 metrics
        cols, rows = 2, 2
        card_size = 0.3
    else:
        # Small cards for 5+ metrics
        cols, rows = 3, (len(labels) + 2) // 3
        card_size = 0.2
    
    for i, (label, value) in enumerate(zip(labels, values)):
        if i >= cols * rows:
            break
            
        row = i // cols
        col = i % cols
        
        x = 0.1 + col * 0.8 / cols + 0.4 / cols
        y = 0.9 - row * 0.8 / rows - 0.4 / rows
        
        # Outer card outline (no fill)
        rect = patches.FancyBboxPatch((x - card_size/2, y - card_size/2), card_size, card_size, 
                                     boxstyle="round,pad=0.02", 
                                     facecolor='none', 
                                     edgecolor=colors[i % len(colors)], linewidth=4, alpha=0.9)
        ax.add_patch(rect)
        
        # Inner glow outline
        inner_rect = patches.FancyBboxPatch((x - card_size/2 + 0.01, y - card_size/2 + 0.01), 
                                          card_size - 0.02, card_size - 0.02, 
                                          boxstyle="round,pad=0.01", 
                                          facecolor='none', 
                                          edgecolor=colors[i % len(colors)], linewidth=2, alpha=0.3)
        ax.add_patch(inner_rect)
        
        # Creative corner accent circles
        corner_circle = patches.Circle((x + card_size/2 - 0.03, y + card_size/2 - 0.03), 0.02, 
                                     facecolor='none', 
                                     edgecolor=colors[i % len(colors)], linewidth=3, alpha=0.7)
        ax.add_patch(corner_circle)
        
        # Modern floating metric value - optimized for 4" x 3.5" dimensions
        ax.text(x, y + card_size/6, format_value(value, format_type), 
               ha='center', va='center', fontsize=14, fontweight='700', color=colors[i % len(colors)])
        
        # Neon metric label
        ax.text(x, y - card_size/6, label, ha='center', va='center', 
               fontsize=8, color='#FFFFFF', fontweight='500')
    
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')

def generate_modern_growth_arrow(ax, labels, values, colors, format_type):
    """Generate pure outline stroke growth trajectory - modern & creative"""
    if len(values) < 2:
        values = [values[0] * 0.7, values[0]] if values else [70, 100]
    
    # Create smooth growth curve
    x_pos = np.linspace(0, 1, len(values))
    
    # Main arrow path with neon glow effect
    for width, alpha in [(6, 0.1), (4, 0.3), (2, 0.9)]:
        ax.plot(x_pos, values, color=colors[0], linewidth=width, alpha=alpha)
    
    # Neon arrow head
    if len(values) >= 2:
        dx = x_pos[-1] - x_pos[-2]
        dy = values[-1] - values[-2]
        # Multiple arrow layers for glow effect
        for lw, alpha in [(6, 0.2), (3, 0.9)]:
            ax.annotate('', xy=(x_pos[-1], values[-1]), 
                       xytext=(x_pos[-1] - dx * 0.1, values[-1] - dy * 0.1),
                       arrowprops=dict(arrowstyle='->', color=colors[0], lw=lw, alpha=alpha))
    
    # Pure outline stroke data points (no fills)
    for i, (x, y, label) in enumerate(zip(x_pos, values, labels)):
        # Outer circle stroke
        circle = patches.Circle((x, y), 0.12, facecolor='none', 
                              edgecolor=colors[i % len(colors)], linewidth=4, alpha=0.9, zorder=5)
        ax.add_patch(circle)
        
        # Inner circle stroke for modern accent
        inner_circle = patches.Circle((x, y), 0.06, facecolor='none', 
                                    edgecolor='#FFFFFF', linewidth=2, alpha=0.7, zorder=6)
        ax.add_patch(inner_circle)
        
        # Modern floating value labels
        ax.text(x, y + (max(values) - min(values)) * 0.1, format_value(y, format_type), 
               ha='center', va='bottom', fontweight='700', color=colors[i % len(colors)], fontsize=11)
        if i < len(labels):
            ax.text(x, y - (max(values) - min(values)) * 0.15, label, 
                   ha='center', va='top', fontweight='500', color='#FFFFFF', fontsize=10)
    
    ax.set_xlim(-0.1, 1.1)
    ax.set_ylim(min(values) * 0.9, max(values) * 1.2)
    ax.axis('off')

def generate_modern_impact_matrix(ax, labels, values, colors, format_type):
    """Generate pure outline stroke impact/effort matrix - labels positioned to the side"""
    # Assume values are impact scores, create effort scores
    efforts = [abs(hash(label)) % 100 for label in labels]
    max_effort, max_impact = max(efforts), max(values)
    
    # Adjust plot area to leave space for side labels
    ax.set_xlim(0, max_effort * 1.8)
    ax.set_ylim(0, max_impact * 1.4)
    
    # Pure outline stroke scatter points (no fills)
    for i, (effort, impact) in enumerate(zip(efforts, values)):
        # Large outer circle stroke
        circle = patches.Circle((effort, impact), max_effort * 0.03, facecolor='none', 
                              edgecolor=colors[i % len(colors)], linewidth=4, alpha=0.9)
        ax.add_patch(circle)
        
        # Inner circle stroke for modern accent
        inner_circle = patches.Circle((effort, impact), max_effort * 0.015, facecolor='none', 
                                    edgecolor='#FFFFFF', linewidth=2, alpha=0.6)
        ax.add_patch(inner_circle)
    
    # Neon quadrant lines with glow effect
    mean_effort, mean_impact = np.mean(efforts), np.mean(values)
    for lw, alpha in [(3, 0.2), (1, 0.8)]:
        ax.axhline(y=mean_impact, color=colors[0], linestyle='--', linewidth=lw, alpha=alpha)
        ax.axvline(x=mean_effort, color=colors[0], linestyle='--', linewidth=lw, alpha=alpha)
    
    # Position labels completely to the right side (no overlap)
    for i, (effort, impact, label) in enumerate(zip(efforts, values, labels)):
        y_pos = max_impact * (0.9 - i * 0.15)  # Vertical spacing
        
        # Color indicator
        indicator = patches.Circle((max_effort * 1.3, y_pos), max_effort * 0.02, facecolor='none', 
                                 edgecolor=colors[i % len(colors)], linewidth=3, alpha=0.9)
        ax.add_patch(indicator)
        
        # Label text
        ax.text(max_effort * 1.4, y_pos, label, ha='left', va='center', 
               fontweight='500', color='#FFFFFF', fontsize=8)
    
    # Neon axis labels
    ax.text(mean_effort, max_impact * 1.2, 'High Impact', 
           ha='center', va='bottom', color='#FFFFFF', fontweight='600', fontsize=9)
    ax.text(max_effort * 1.1, mean_impact, 'High Effort', 
           ha='left', va='center', color='#FFFFFF', fontweight='600', rotation=90, fontsize=9)
    
    ax.set_xticks([])
    ax.set_yticks([])
    ax.axis('off')

def generate_modern_journey_flow(ax, labels, values, colors, format_type):
    """Generate pure outline stroke customer journey flow - labels positioned off to the side"""
    # Create flowing path, positioned to leave room for labels
    x_positions = np.linspace(0.1, 0.6, len(labels))  # Reduced width for labels
    
    # Adjust plot area to accommodate side labels
    ax.set_xlim(0, 1.2)
    ax.set_ylim(0.2, 0.8)
    
    for i, (x, label, value) in enumerate(zip(x_positions, labels, values)):
        # Pure outline flow nodes (no fills)
        circle = patches.Circle((x, 0.5), 0.08, facecolor='none', 
                              edgecolor=colors[i % len(colors)], linewidth=4, alpha=0.9)
        ax.add_patch(circle)
        
        # Inner circle stroke for modern accent
        inner_circle = patches.Circle((x, 0.5), 0.04, facecolor='none', 
                                    edgecolor='#FFFFFF', linewidth=2, alpha=0.6)
        ax.add_patch(inner_circle)
        
        # Neon connecting arrows with glow
        if i < len(labels) - 1:
            next_x = x_positions[i + 1]
            # Multiple arrow layers for glow effect
            for lw, alpha in [(4, 0.2), (2, 0.8)]:
                ax.annotate('', xy=(next_x - 0.08, 0.5), xytext=(x + 0.08, 0.5),
                           arrowprops=dict(arrowstyle='->', color=colors[i % len(colors)], lw=lw, alpha=alpha))
    
    # Position all labels to the right side (no overlap with flow)
    for i, (label, value) in enumerate(zip(labels, values)):
        y_pos = 0.7 - (i * 0.1)  # Vertical spacing for labels
        
        # Color indicator
        indicator = patches.Circle((0.8, y_pos), 0.02, facecolor='none', 
                                 edgecolor=colors[i % len(colors)], linewidth=2, alpha=0.9)
        ax.add_patch(indicator)
        
        # Label text
        ax.text(0.85, y_pos, f"{label}: {format_value(value, format_type)}", 
               ha='left', va='center', fontweight='500', 
               color='#FFFFFF', fontsize=8)
    
    ax.axis('off')

def generate_modern_competitive_radar(ax, labels, values, colors, format_type):
    """Generate pure outline stroke competitive radar - modern & creative"""
    import math
    
    # Number of variables
    N = len(labels)
    
    # Compute angle for each axis
    angles = [n / float(N) * 2 * math.pi for n in range(N)]
    angles += angles[:1]  # Complete the circle
    
    # Close the plot
    values += values[:1]
    
    # Pure outline stroke plot (no fill)
    for lw, alpha in [(4, 0.2), (2, 0.9)]:
        ax.plot(angles, values, linewidth=lw, color=colors[0], alpha=alpha)
    
    # Pure outline stroke data points
    for i, (angle, value) in enumerate(zip(angles[:-1], values[:-1])):
        x_pos = value * math.cos(angle)
        y_pos = value * math.sin(angle)
        
        # Outer circle stroke
        circle = patches.Circle((x_pos, y_pos), max(values[:-1])*0.05, facecolor='none', 
                              edgecolor=colors[i % len(colors)], linewidth=3, alpha=0.9)
        ax.add_patch(circle)
        
        # Inner circle stroke accent
        inner_circle = patches.Circle((x_pos, y_pos), max(values[:-1])*0.02, facecolor='none', 
                                    edgecolor='#FFFFFF', linewidth=2, alpha=0.6)
        ax.add_patch(inner_circle)
    
    # Neon axis lines
    max_val = max(values[:-1]) if values[:-1] else 100
    for angle in angles[:-1]:
        x_end = max_val * math.cos(angle)
        y_end = max_val * math.sin(angle)
        ax.plot([0, x_end], [0, y_end], color='#FFFFFF', linewidth=1, alpha=0.3)
    
    # Modern floating labels
    for angle, label, value in zip(angles[:-1], labels, values[:-1]):
        x = (max_val * 1.2) * math.cos(angle)
        y = (max_val * 1.2) * math.sin(angle)
        ax.text(x, y, label, ha='center', va='center', 
               fontweight='600', color='#FFFFFF', fontsize=9)
    
    # Set limits and remove axes
    ax.set_xlim(-max_val * 1.3, max_val * 1.3)
    ax.set_ylim(-max_val * 1.3, max_val * 1.3)
    ax.axis('off')

def format_value(value, format_type):
    """Format values according to specified format type"""
    try:
        if format_type == 'currency':
            return f"${value:,.0f}"
        elif format_type == 'percentage':
            return f"{value:.1f}%"
        elif format_type == 'millions':
            return f"{value/1000000:.1f}M"
        else:
            return f"{value:,.0f}"
    except:
        return str(value)

def get_format_label(format_type):
    """Get axis label based on format type"""
    if format_type == 'currency':
        return 'Value ($)'
    elif format_type == 'percentage':
        return 'Percentage (%)'
    elif format_type == 'millions':
        return 'Value (Millions)'
    else:
        return 'Value'

async def analyze_content_with_ai(content: str, file_name: str) -> Dict[str, Any]:
    """Analyze content using Claude 4 for intelligent presentation structure"""
    try:
        # Claude 4 Content Analysis prompt focused on faithful interpretation
        claude_prompt = """You are an expert Content Analyst specializing in objective data interpretation and faithful representation of source material.

ANALYSIS MISSION: Analyze this content from """ + file_name + """ and create a comprehensive presentation that accurately represents the information:

CONTENT TO ANALYZE:
""" + content[:15000] + """

OBJECTIVE ANALYSIS APPROACH:
1. **Faithful Content Interpretation**: Present what the data actually shows, not what it might imply
2. **Source-Driven Insights**: Base all conclusions directly on evidence present in the content
3. **Balanced Perspective**: Present multiple viewpoints when they exist in the source material
4. **Evidence-Based Structure**: Support every point with specific references to the source content

CONTENT FIDELITY PRINCIPLES:
- Stay true to the original context and meaning of the source material
- Distinguish clearly between what the data shows versus potential interpretations
- Preserve the author's original intent and perspective when identifiable
- Present findings objectively without adding external assumptions
- Use direct quotes and specific data points from the source when possible
- Avoid overinterpreting limited data or extrapolating beyond what's supported

ANALYTICAL FRAMEWORK:
- Content Overview: What does this material actually contain and discuss?
- Key Findings: What specific information, data, or conclusions are presented?
- Supporting Evidence: What concrete details support the main points?
- Source Context: What is the original purpose and scope of this content?
- Objective Summary: What can be concluded based solely on the provided information?

Create a comprehensive presentation with 12-15 slides (minimum 12, target 12-15) that faithfully represents the source content:
- Maximum 3 key points per slide based directly on source material
- Clear, objective information structure
- Strategic use of direct quotes and specific data from the source
- Advanced SVG visualizations that accurately represent the information
- Professional presentation aesthetics with clear visual hierarchy
- REQUIRED: One data-driven visual element for EVERY slide using advanced SVG capabilities

Return your analysis as valid JSON with this exact structure:

{
    "title": "Objective Content Analysis Title",
    "executive_summary": "3-sentence summary of key findings from the source material",
    "slides": [
        {
            "title": "Clear, Factual Slide Title",
            "content": ["Specific finding from source", "Supporting data point", "Direct conclusion from content"],
            "source_quote": "Direct quote from the source material for emphasis",
            "visual": {
                "type": "kpi_dashboard|gauge_chart|progress_ring|performance_scorecard|executive_dashboard|automation_rate_display|advanced_bar_comparison|split_comparison|benchmark_chart|competitive_positioning|before_after_comparison|ranking_visualization|strategic_matrix_2x2|swot_analysis_grid|bcg_matrix|porter_five_forces|value_chain_diagram|business_model_canvas|process_flow_advanced|customer_journey_map|timeline_advanced|strategic_roadmap|conversion_funnel|organizational_hierarchy|stakeholder_map|network_relationship|business_ecosystem|influence_diagram|financial_waterfall|revenue_breakdown|roi_visualization|trend_analysis_advanced|forecast_visualization|growth_trajectory|distribution_analysis|correlation_matrix|risk_assessment_matrix|risk_heatmap|compliance_scorecard|innovation_pipeline|portfolio_analysis|customer_segmentation|satisfaction_analysis|market_share_analysis|executive_quote_display|key_insight_highlight|testimonial_layout|fact_sheet_display|executive_summary_visual|conclusion_highlight|pie_chart_advanced|bar_chart_professional|line_chart_executive|scatter_analysis|heatmap_professional|treemap_hierarchy|capacity_utilization|resource_allocation|operational_efficiency|quality_metrics|employee_metrics",
                "title": "Clear Visual Title (1-3 words)",
                "concept": "concept that accurately represents the data",
                "context": "How this visual clearly communicates the source information",
                "design_approach": "ultra_minimal|executive_professional|strategic_clarity|data_focused|insight_driven",
                "advanced_svg_features": {
                    "visual_effects": "multi_layered_glow|glass_morphism_blur|gradient_mesh_depth",
                    "color_palette": "gold_metallic|sapphire_premium|platinum_elite|neon_accents", 
                    "typography": "executive_minimal|high_contrast|strategic_spacing",
                    "layout_system": "golden_ratio|8px_grid|safe_margins|negative_space_60_percent"
                },
                "source_insights": {
                    "content_elements": ["Key data point from source", "Supporting evidence", "Factual conclusion"],
                    "information_flow": "How this visual represents the source content",
                    "practical_relevance": "What this information means based on the source",
                    "objective_focus": "Single most important fact to convey from the source material"
                }
            }
        }
    ]
}

COMPREHENSIVE VISUAL CLARITY SYSTEM - NO OVERLAPPING ELEMENTS:

**CRITICAL VISUAL CLARITY REQUIREMENTS:**
1. **Perfect Element Spacing**: Minimum 16px between any two elements - NEVER allow overlapping
2. **Mathematical Grid System**: All elements align to 8px grid - perfect registration required
3. **Clear Reading Hierarchy**: Primary → Secondary → Tertiary with size ratios of 1.0 → 0.85 → 0.7
4. **Safe Margins**: 24px minimum from all edges, 32px for important elements
5. **Text Readability**: Minimum 12px font size, maximum 70 characters per line
6. **Touch-Safe Spacing**: Minimum 28px between interactive elements
7. **Contrast Verification**: All text must have 7:1+ contrast ratio against background

**ADVANCED LAYOUT PRECISION SYSTEM:**
- **Bounding Box Calculation**: Every element must have defined x,y,width,height boundaries
- **Collision Detection Logic**: Elements cannot occupy overlapping coordinates
- **Intelligent Positioning**: Auto-adjust placement to prevent visual conflicts
- **Responsive Spacing**: Scale spacing proportionally with content density
- **Visual Weight Distribution**: Balance heavy elements across the composition

**PROFESSIONAL CHART TYPE SPECIFICATIONS:**

**PERFORMANCE & KPI VISUALIZATIONS:**
- gauge_chart: Circular progress with clear percentage display, min 120px diameter
- kpi_dashboard: Card-based layout with 16px padding, max 4 cards per row
- progress_ring: Donut chart with center text, stroke-width proportional to size
- performance_scorecard: Table layout with alternating row colors, clear headers
- automation_rate_display: Large percentage with context bars, clear numerical hierarchy

**STRATEGIC FRAMEWORKS:**
- strategic_matrix_2x2: Perfect quadrants with equal spacing, clear axis labels
- swot_analysis_grid: Four-section layout with color-coded categories
- porter_five_forces: Pentagon layout with force arrows, balanced positioning
- value_chain_diagram: Horizontal flow with activity boxes, clear connections
- business_model_canvas: Nine-section grid with consistent spacing and typography

**COMPARISON & BENCHMARKING:**
- advanced_bar_comparison: Horizontal bars with clear labels, value indicators
- split_comparison: Two-column layout with central divider, mirrored elements
- benchmark_chart: Reference line with performance indicators, clear thresholds
- before_after_comparison: Side-by-side panels with clear temporal indicators

**PROCESS & JOURNEY VISUALIZATIONS:**
- process_flow_advanced: Step-by-step with directional arrows, consistent spacing
- customer_journey_map: Timeline with touchpoints, emotional indicators
- timeline_advanced: Horizontal or vertical with milestone markers, date clarity
- conversion_funnel: Decreasing width sections with conversion rates

**RISK & COMPLIANCE:**
- risk_assessment_matrix: Impact vs Probability grid with color-coded zones
- risk_heatmap: Color intensity mapping with clear legends
- compliance_scorecard: Status indicators with red/yellow/green system

**FINANCIAL & BUSINESS METRICS:**
- financial_waterfall: Sequential bars showing cumulative changes
- revenue_breakdown: Segmented visualization with clear category labels
- roi_visualization: Return metrics with time-based comparisons

**TEXTUAL & INSIGHT DISPLAYS:**
- executive_quote_display: Large quote with attribution, visual emphasis
- key_insight_highlight: Callout box with accent colors, clear typography
- fact_sheet_display: Organized data points with consistent formatting

DESIGN SYSTEM REQUIREMENTS:
1. **Systematic Visual Hierarchy**: Apply 8px spacing system and typography scales consistently across all visuals
2. **Strategic Color Application**: Use Gold for primary emphasis, Sapphire for secondary data, Emerald for growth, Platinum for supporting elements
3. **Sophisticated Layout**: Grid-based designs with mathematical proportions and professional breathing room
4. **Executive Polish**: Premium visual effects, metallic gradients, and sophisticated information organization
5. **Information Architecture**: Clear dominant/subdominant/subordinate element relationships
6. **Technical Excellence**: Precise SVG execution with high contrast and accessibility considerations

Focus on creating visuals that accurately represent the source material and provide clear, objective information display."""
        
        print(f"\n🧠 Using Claude 4 Extended Thinking Analysis...")
        print(f"📝 Prompt length: {len(claude_prompt)} characters")
        print(f"📄 Content length: {len(content)} characters")
        
        claude_response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=6000,
            temperature=0.3,  # More deterministic output for consistent results
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
    """Select optimal layout with preference for layouts that have image placeholders when charts are needed"""
    content_points = slide_content.get('content', [])
    layout_type = slide_content.get('layout_type', 'bullet_points')
    has_data = slide_content.get('has_data', False)
    needs_images = slide_content.get('needs_images', False)
    content_analysis = slide_content.get('content_analysis', '')
    has_visual_spec = bool(slide_content.get('visual', {}))
    
    print(f"🤖 Layout selection for slide '{slide_content.get('title', 'Unknown')}':")
    print(f"   Layout type: {layout_type}")
    print(f"   Has data: {has_data}")
    print(f"   Needs images: {needs_images}")
    print(f"   Has chart specification: {has_visual_spec}")
    
    # If slide has chart specification, prefer layouts with image placeholders
    if has_visual_spec:
        print(f"📊 Chart detected - searching for layouts with image placeholders...")
        
        # Look for layouts with PICTURE placeholders first
        for i, layout in enumerate(prs.slide_layouts):
            capabilities = analyze_layout_capabilities(layout)
            if capabilities['image_placeholders'] and capabilities['has_title']:
                print(f"✅ Found layout {i} ('{layout.name}') with image placeholders: {capabilities['image_placeholders']}")
                print(f"   Capabilities: title={capabilities['has_title']}, text_placeholders={capabilities['text_placeholders']}, image_placeholders={capabilities['image_placeholders']}")
                return i, layout, capabilities
        
        print(f"⚠️ No layouts with dedicated image placeholders found")
    
    # Fallback to Layout 1 if available and suitable
    if len(prs.slide_layouts) > 1:
        layout_1 = prs.slide_layouts[1]
        layout_1_capabilities = analyze_layout_capabilities(layout_1)
        
        print(f"🎯 Using Layout 1 ('{layout_1.name}') as fallback")
        print(f"   Capabilities: title={layout_1_capabilities['has_title']}, text_placeholders={layout_1_capabilities['text_placeholders']}, image_placeholders={layout_1_capabilities['image_placeholders']}")
        return 1, layout_1, layout_1_capabilities
    else:
        # Final fallback if Layout 1 doesn't exist
        fallback_layout = prs.slide_layouts[0]
        fallback_capabilities = analyze_layout_capabilities(fallback_layout)
        print(f"⚠️ Layout 1 not available, using fallback Layout 0 ('{fallback_layout.name}')")
        print(f"   Capabilities: title={fallback_capabilities['has_title']}, text_placeholders={fallback_capabilities['text_placeholders']}, image_placeholders={fallback_capabilities['image_placeholders']}")
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
        
        # Use Layout 0 (first master layout) for title slide as specified by user
        # The user has manually added a title slide master layout with title placeholder to Layout 0
        max_layout_index = len(prs.slide_layouts) - 1
        title_layout_index = 0  # Use Layout 0 specifically for title slides
        print(f"📊 Template has {len(prs.slide_layouts)} layouts available (0-{max_layout_index})")
        print(f"🎯 Using Layout 0 for title slide as configured by user")
        
        title_layout = prs.slide_layouts[title_layout_index]
        slide = prs.slides.add_slide(title_layout)
        print(f"📝 Added title slide using layout {title_layout_index}: '{title_layout.name}' (title slides can use optimal layout)")
        print(f"📋 Note: Content slides will use Layout 1 as instructed")
        
        # Apply master layout branding to title slide
        apply_master_layout_branding(slide, 0, len(analysis["structure"]["slides"]) + 1)
        
        # Enhanced title detection - ensuring title is properly inserted into first slide master layout
        title_set = False
        title_text = analysis["structure"]["title"]
        print(f"🎯 Setting title slide title: {title_text}")
        print(f"📋 Available placeholders on title slide:")
        
        # Log all available placeholders for debugging
        for shape in slide.placeholders:
            try:
                placeholder_type = getattr(shape.placeholder_format, 'type', None)
                placeholder_idx = shape.placeholder_format.idx
                print(f"   - Placeholder idx: {placeholder_idx}, type: {placeholder_type}")
            except Exception as e:
                print(f"   - Placeholder inspection failed: {e}")
        
        # Strategy 1: Try standard title shape first (most reliable)
        if slide.shapes.title:
            try:
                slide.shapes.title.text = title_text
                print(f"✅ Set title via shapes.title: {title_text}")
                title_set = True
            except Exception as e:
                print(f"⚠️ Failed to set title via shapes.title: {e}")
        
        # Strategy 2: Find and use the actual TITLE placeholder (type 1) in master layout
        if not title_set:
            print(f"🔍 Searching for TITLE placeholder (type 1) in master layout...")
            for shape in slide.placeholders:
                try:
                    placeholder_type = getattr(shape.placeholder_format, 'type', None)
                    placeholder_idx = shape.placeholder_format.idx
                    
                    if placeholder_type == 1:  # TITLE placeholder
                        shape.text = title_text
                        print(f"✅ Set title via TITLE placeholder (idx {placeholder_idx}): {title_text}")
                        title_set = True
                        break
                except Exception as e:
                    print(f"   - Failed to set title at placeholder idx {getattr(shape.placeholder_format, 'idx', 'unknown')}: {e}")
                    continue
        
        # Strategy 3: Try all text placeholders if title placeholder not found
        if not title_set:
            print(f"🔍 TITLE placeholder not found, trying all text placeholders...")
            for shape in slide.placeholders:
                try:
                    placeholder_type = getattr(shape.placeholder_format, 'type', None)
                    placeholder_idx = shape.placeholder_format.idx
                    
                    # Try common text placeholder types that might serve as title
                    if placeholder_type in [2, 7, 13]:  # BODY, OBJECT, CONTENT
                        shape.text = title_text
                        print(f"✅ Set title via text placeholder (idx {placeholder_idx}, type {placeholder_type}): {title_text}")
                        title_set = True
                        break
                except Exception as e:
                    continue
        
        # Strategy 4: Manual title as final fallback
        if not title_set:
            print("⚠️ No suitable placeholder found, creating manual title text box...")
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
                title_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
                print(f"✅ Added manual title text box: {title_text}")
                title_set = True
            except Exception as e:
                print(f"❌ Failed to add manual title: {e}")
        
        if not title_set:
            print(f"❌ WARNING: Title could not be set on title slide!")
        
        # Skip subtitle generation - no longer adding "Generated by NXT Humans AI" text
        print(f"🔍 Skipping subtitle generation per user request...")
        
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
            
            # Create final content array with bullet points - NO visual description text
            final_content = content_points[:] if content_points else []
            
            # Generate actual chart if visual specification is provided
            chart_generated = False
            chart_path = None
            visual_spec = slide_data.get('visual', {})
            
            if visual_spec and isinstance(visual_spec, dict):
                # Create charts directory if it doesn't exist
                charts_dir = "generated_content/charts"
                os.makedirs(charts_dir, exist_ok=True)
                
                # Generate unique SVG filename
                chart_filename = f"infographic_slide_{slide_count}_{uuid.uuid4().hex[:8]}.svg"
                chart_path = os.path.join(charts_dir, chart_filename)
                
                print(f"🔍 DEBUG: Visual spec found for slide {slide_count}:")
                print(f"   Visual spec keys: {list(visual_spec.keys())}")
                print(f"   Visual spec content: {visual_spec}")
                
                # ENHANCE: Add actual slide content to the visual spec for better relevancy
                enhanced_visual_spec = visual_spec.copy()
                enhanced_visual_spec['slide_content'] = {
                    'title': slide_data.get('title', ''),
                    'content_points': slide_data.get('content', []),
                    'source_quote': slide_data.get('source_quote', ''),
                    'slide_number': slide_count,
                    'total_slides': len(analysis["structure"]["slides"])
                }
                
                print(f"📊 Generating CONTENT-RELEVANT Claude 4 SVG infographic:")
                print(f"   Chart type: {enhanced_visual_spec.get('type', 'Unknown')}")
                print(f"   Chart title: {enhanced_visual_spec.get('title', 'Unknown')}")
                print(f"   Slide title: {enhanced_visual_spec['slide_content']['title']}")
                print(f"   Content points: {len(enhanced_visual_spec['slide_content']['content_points'])}")
                print(f"   Output path: {chart_path}")
                
                # Generate the SVG infographic using Claude 4 with enhanced content relevancy
                chart_generated = generate_chart_from_spec(enhanced_visual_spec, chart_path)
                
                if chart_generated:
                    print(f"✅ SVG infographic generated successfully: {chart_path}")
                    # Verify file was actually created
                    if os.path.exists(chart_path):
                        file_size = os.path.getsize(chart_path)
                        print(f"   📁 File confirmed: {file_size} bytes")
                    else:
                        print(f"❌ ERROR: File was not created despite success return")
                        chart_generated = False
                else:
                    print(f"❌ SVG infographic generation failed, falling back to text description")
            else:
                print(f"⚠️ DEBUG: No visual spec found for slide {slide_count}")
            
            print(f"🔧 Inserting Claude 4's content:")
            print(f"   Content bullet points: {len(content_points)}")
            print(f"   Chart generated: {'Yes' if chart_generated else 'No'}")
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
            
            # Strategy 2: Convert SVG to PNG and insert into PowerPoint template image placeholders
            if chart_generated and chart_path and os.path.exists(chart_path):
                print(f"🎨 Converting Claude 4 SVG to PNG and inserting into PowerPoint template")
                try:
                    # Convert SVG to PNG for PowerPoint compatibility
                    png_path = chart_path.replace('.svg', '.png')
                    print(f"🎯 MAXIMUM QUALITY SVG to PNG conversion (7200×4800px @ 1800 DPI)...")
                    print(f"   SVG: {chart_path}")
                    print(f"   PNG: {png_path}")
                    
                    # MAXIMUM QUALITY SVG to PNG conversion
                    conversion_success = convert_svg_to_max_quality_png(chart_path, png_path)
                    
                    if conversion_success and os.path.exists(png_path):
                        png_size = os.path.getsize(png_path)
                        print(f"✅ MAXIMUM QUALITY SVG converted to PNG: {png_size:,} bytes")
                        
                        # Insert into PowerPoint template image placeholder
                        image_inserted = False
                        
                        # Look for PICTURE placeholder in the slide
                        for shape in slide.placeholders:
                            try:
                                placeholder_type = getattr(shape.placeholder_format, 'type', None)
                                placeholder_idx = shape.placeholder_format.idx
                                
                                if placeholder_type == 18:  # PICTURE placeholder
                                    print(f"📍 Found PICTURE placeholder {placeholder_idx} - inserting PNG")
                                    
                                    # Get placeholder position and size
                                    left = shape.left
                                    top = shape.top
                                    width = shape.width
                                    height = shape.height
                                    
                                    # Insert PNG image into placeholder position
                                    chart_shape = slide.shapes.add_picture(png_path, left, top, width, height)
                                    
                                    # Remove the original placeholder
                                    sp = shape._element
                                    sp.getparent().remove(sp)
                                    
                                    print(f"✅ MAXIMUM QUALITY Claude 4 infographic inserted into PICTURE placeholder {placeholder_idx}")
                                    print(f"   📍 Position: ({left.inches:.1f}\", {top.inches:.1f}\")")
                                    print(f"   📐 Size: {width.inches:.1f}\" x {height.inches:.1f}\"")
                                    image_inserted = True
                                    break
                                    
                            except Exception as e:
                                print(f"⚠️ Error with placeholder {placeholder_idx}: {e}")
                                continue
                            
                            # Fallback to left side positioning if no PICTURE placeholder
                            if not image_inserted:
                                print(f"⚠️ No PICTURE placeholder found, adding to left side")
                                chart_left = Inches(0.5)
                                chart_top = Inches(1.5)
                                chart_width = Inches(4.0)
                                chart_height = Inches(3.5)
                                
                                chart_shape = slide.shapes.add_picture(png_path, chart_left, chart_top, chart_width, chart_height)
                                print(f"✅ Added to left side: {chart_left.inches}\" x {chart_top.inches}\"")
                        
                    else:
                        print(f"❌ MAXIMUM QUALITY PNG conversion failed")
                        print(f"   All conversion methods (CairoSVG, Playwright, Wand, Inkscape) failed")
                        print(f"   Consider installing: cairosvg, playwright, wand, or inkscape")
                    
                except Exception as e:
                    print(f"❌ Failed to convert and insert SVG: {e}")
                    print(f"   📂 SVG path: {chart_path}")
                    print(f"   📁 File exists: {os.path.exists(chart_path)}")
            else:
                if visual_spec:
                    print(f"📷 Chart was specified but not generated - skipping image insertion")
                else:
                    print(f"📷 No chart specification provided for this slide")
            
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
                padding: 0;
                background: linear-gradient(135deg, #000000 0%, #0a0a0a 25%, #000000 50%, #0a0a0a 75%, #000000 100%);
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
            
            /* Intelligence Augmentation Header */
            .intelligence-augmentation-header {
                background: #000000;
                height: 240px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                position: relative;
                z-index: 100;
                overflow: hidden;
                margin-bottom: 20px;
            }

            .intelligence-augmentation-header::before {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 40%;
                height: 100%;
                background: linear-gradient(45deg, transparent 0%, rgba(124, 58, 237, 0.15) 30%, rgba(124, 58, 237, 0.25) 60%, rgba(139, 92, 246, 0.3) 100%);
                transform: skewX(-20deg) translateX(20%);
                z-index: 1;
            }

            .ia-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 2rem;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                z-index: 2;
            }

            .ia-content {
                display: flex;
                align-items: center;
                gap: 3rem;
                width: 100%;
                justify-content: center;
            }

            .ia-logo-section {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .ia-logo-image {
                width: 140px;
                height: auto;
                opacity: 1;
                filter: brightness(1.1);
                object-fit: contain;
            }

            .ia-text-section {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }

            .ia-introducing {
                font-size: 1.6rem;
                font-weight: 300;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: 0.4rem;
                letter-spacing: 0.5px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .ia-main-text {
                display: flex;
                flex-direction: column;
                gap: 0;
            }

            .ia-intelligence,
            .ia-augmentation {
                font-size: 4rem;
                font-weight: 700;
                line-height: 0.9;
                letter-spacing: -1.5px;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 0;
            }

            .ia-augmentation {
                background: linear-gradient(135deg, rgba(124, 58, 237, 0.9) 0%, rgba(139, 92, 246, 1) 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                color: transparent;
            }

            .ia-intelligence {
                margin-bottom: -0.3rem;
            }
            .title {
                font-size: 2.5rem;
                font-weight: bold;
                background: linear-gradient(135deg, #01C4C8 0%, #00D4AA 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 10px;
            }
            .subtitle {
                font-size: 1.2rem;
                color: #01C4C8;
                margin-bottom: 20px;
                font-weight: 600;
            }
            .card {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: 12px;
                padding: 30px;
                margin: 20px 0;
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
                <div class="intelligence-augmentation-header">
                    <div class="ia-container">
                        <div class="ia-content">
                            <div class="ia-logo-section">
                                <img src="/static/nxt-humans-logo.png" alt="NXT HUMANS Logo" class="ia-logo-image">
                            </div>
                            <div class="ia-text-section">
                                <div class="ia-introducing">Intelligence Augmentation</div>
                                <div class="ia-main-text">
                                    <div class="ia-intelligence">Presentation</div>
                                    <div class="ia-augmentation">Generator</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2 style="color: #7C3AED; margin-bottom: 20px;">💼 Upload Business Data</h2>
                <div class="upload-area" onclick="document.getElementById('fileInput').click()">
                    <div style="font-size: 3rem; margin-bottom: 10px;">📁</div>
                    <p>Upload PDF, JSON, Markdown, or Text files</p>
                    <p style="color: #94a3b8; font-size: 0.9rem;">Supported formats: .pdf, .json, .txt, .md</p>
                </div>
                <input type="file" id="fileInput" style="display: none;" accept=".pdf,.json,.txt,.md" onchange="handleFileUpload(event)">
                
                <div class="status" id="status"></div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn" onclick="generatePresentation()">🚀 Generate Presentation</button>
                    <button class="btn" onclick="checkStatus()">📊 Check Status</button>
                </div>
            </div>


            <div class="card" style="margin-top: 40px;">
                <h2 style="color: #7C3AED; margin-bottom: 20px;">🔗 API Endpoints</h2>
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
    return FileResponse('templates/index.html')

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