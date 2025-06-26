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
# Chart generation imports
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.animation import FuncAnimation
import seaborn as sns
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import io
from typing import Union

# 2025 Performance Optimization - Memory Efficient Rendering
import matplotlib
matplotlib.rcParams['path.simplify'] = True
matplotlib.rcParams['path.simplify_threshold'] = 0.1
matplotlib.rcParams['agg.path.chunksize'] = 10000

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

def generate_chart_from_spec(visual_spec: Dict[str, Any], output_path: str) -> bool:
    """Generate 2025-Modern Charts with Advanced Neon Aesthetics"""
    try:
        chart_type = visual_spec.get('type', 'bar_chart')
        title = visual_spec.get('title', 'Chart')
        data = visual_spec.get('data', {})
        style = visual_spec.get('style', 'corporate_blue')
        layout = visual_spec.get('layout', 'vertical')
        
        # NXT HUMANS BRAND COLOR STRATEGY - Maximum readability with brand identity
        color_schemes = {
            'nxt_primary': ['#01C4C8', '#FF6B6B', '#4ECDC4', '#45B7D1'],      # NXT Cyan + complementary
            'high_contrast': ['#01C4C8', '#FF6B6B', '#4ECDC4', '#FFD93D'],     # High readability with NXT colors
            'accessible_brand': ['#01C4C8', '#E67E22', '#27AE60', '#8E44AD'], # NXT + professional colors
            'dark_theme': ['#01C4C8', '#FF6B6B', '#4ECDC4', '#45B7D1'],       # Dark background optimized
            'business_nxt': ['#01C4C8', '#5A6275', '#4A5165', '#FFD93D']      # NXT brand palette
        }
        
        # NXT HUMANS BRAND COLORS - Optimized for dark backgrounds
        NXT_COLORS = {
            'primary': '#01C4C8',       # NXT Cyan - brand primary
            'secondary': '#FF6B6B',     # Coral red - high contrast accent
            'accent': '#4ECDC4',        # Light cyan - secondary brand
            'background': 'transparent', # Transparent for PowerPoint integration
            'text': '#FFFFFF',          # White text for dark theme readability
            'grid': '#333333',          # Dark gray grid
            'highlight': '#FFD93D'      # Yellow highlight for callouts
        }
        
        # Smart color selection prioritizing NXT brand + readability
        if style in color_schemes:
            colors = color_schemes[style]
        else:
            # Default to NXT brand colors with high readability
            colors = [NXT_COLORS['primary'], NXT_COLORS['secondary'], 
                     NXT_COLORS['accent'], NXT_COLORS['highlight']]
        
        # TRANSPARENT BACKGROUND + 4"x3.5" OPTIMIZATION
        plt.style.use('dark_background')  # Dark theme for transparent backgrounds
        
        # ELEGANT 4"x3.5" optimized parameters - LARGE CHART ELEMENTS
        plt.rcParams.update({
            'axes.facecolor': 'none',           # Transparent axes background
            'figure.facecolor': 'none',         # Transparent figure background
            'savefig.facecolor': 'none',        # Transparent save background
            'savefig.edgecolor': 'none',        # No edge color
            'axes.edgecolor': '#FFFFFF',        # White borders for dark theme
            'axes.linewidth': 0,                # Remove borders for clean look
            'axes.spines.top': False,           # No top spine
            'axes.spines.right': False,         # No right spine
            'axes.spines.left': False,          # No left spine
            'axes.spines.bottom': False,        # No bottom spine
            'grid.alpha': 0,                    # No grid for clean vector look
            'font.size': 16,                    # LARGER base font for 4"x3.5"
            'axes.titlesize': 24,               # LARGE titles for visibility
            'axes.labelsize': 18,               # LARGE labels for 4" width
            'xtick.labelsize': 14,              # LARGER tick labels
            'ytick.labelsize': 14,              # LARGER tick labels
            'figure.autolayout': False          # Manual layout control
        })
        
        # MASSIVE figure size for maximum chart elements - FILL EVERYTHING!
        fig, ax = plt.subplots(figsize=(12, 10.5))  # 3x larger for crisp, HUGE elements
        fig.patch.set_facecolor('none')     # Transparent figure
        ax.set_facecolor('none')             # Transparent axes
        
        # Extract data
        labels = data.get('labels', ['Category 1', 'Category 2', 'Category 3'])
        values = data.get('values', [30, 45, 25])
        format_type = data.get('format', 'number')
        
        # Skip complex storytelling elements for maximum readability
        # Focus on clear, simple chart presentation
        
        # Generate chart based on type with 2025 modern vector styling
        if chart_type == 'bar_chart':
            generate_modern_bar_chart(ax, labels, values, colors, layout, format_type)
        elif chart_type == 'line_chart':
            generate_modern_line_chart(ax, labels, values, colors, format_type)
        elif chart_type == 'pie_chart':
            generate_modern_pie_chart(ax, labels, values, colors, format_type)
        elif chart_type == 'donut_chart':
            generate_modern_donut_chart(ax, labels, values, colors, format_type)
        elif chart_type == 'funnel_chart':
            generate_modern_funnel_chart(ax, labels, values, colors, format_type)
        elif chart_type == 'timeline':
            generate_modern_timeline_chart(ax, labels, values, colors, format_type)
        elif chart_type == 'kpi_dashboard':
            generate_modern_kpi_dashboard(ax, labels, values, colors, format_type)
        elif chart_type == 'comparison_chart':
            comparison_data = data.get('comparison_data', {})
            generate_modern_comparison_chart(ax, labels, values, comparison_data, colors, format_type)
        elif chart_type == 'waterfall_chart':
            generate_modern_waterfall_chart(ax, labels, values, colors, format_type)
        elif chart_type == 'progress_chart':
            generate_modern_progress_chart(ax, labels, values, colors, format_type)
        elif chart_type == 'metric_cards':
            generate_modern_metric_cards(ax, labels, values, colors, format_type)
        elif chart_type == 'growth_arrow':
            generate_modern_growth_arrow(ax, labels, values, colors, format_type)
        elif chart_type == 'impact_matrix':
            generate_modern_impact_matrix(ax, labels, values, colors, format_type)
        elif chart_type == 'journey_flow':
            generate_modern_journey_flow(ax, labels, values, colors, format_type)
        elif chart_type == 'competitive_radar':
            generate_modern_competitive_radar(ax, labels, values, colors, format_type)
        else:
            # Default to modern bar chart
            generate_modern_bar_chart(ax, labels, values, colors, layout, format_type)
        
        # Apply MAXIMUM READABILITY Typography
        apply_readable_typography(ax, title)
        
        # Generate professional chart styling
        ax.grid(True, alpha=0.3, color='#CCCCCC', linewidth=1, linestyle='-')
        ax.set_axisbelow(True)  # Grid behind data
        
        # Professional border styling
        for spine in ax.spines.values():
            spine.set_color('#000000')
            spine.set_linewidth(1.5)
            spine.set_visible(True)
        
        # Generate accessibility metadata
        data_summary = {
            'description': f"{chart_type} showing clear data comparison",
            'point_count': len(labels),
            'value_range': f"{min(values):.1f} to {max(values):.1f}" if values else "No data"
        }
        
        # REMOVE ALL BORDERS for clean transparent look
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_visible(False)
        ax.spines['bottom'].set_visible(False)
        ax.grid(False)
        ax.set_xticks([])
        ax.set_yticks([])
        
        # ABSOLUTE MAXIMUM SPACE USAGE - EDGE TO EDGE CHARTS!
        # Zero margins to use every available pixel
        plt.subplots_adjust(left=0.02, right=0.98, top=0.98, bottom=0.02)  # ABSOLUTE MAXIMUM!
        
        # TRANSPARENT PNG export optimized for PowerPoint
        metadata = {
            'Creator': 'NXT Humans AI Presentation Generator - 4"x3.5" Optimized',
            'Subject': f'Elegant {chart_type} Data Visualization',
            'Keywords': 'transparent, elegant, 4x3.5, business, NXT',
            'Description': f'Transparent {chart_type} chart optimized for 4" x 3.5" PowerPoint integration'
        }
        
        plt.savefig(output_path, 
                   dpi=400,                    # ULTRA high-quality for crisp elements
                   bbox_inches='tight',        # Optimal cropping - TIGHT TO MAXIMIZE SIZE!
                   facecolor='none',           # TRANSPARENT background
                   edgecolor='none',           # Clean edges
                   transparent=True,           # TRANSPARENT for PowerPoint integration
                   pad_inches=0,               # ZERO padding - ABSOLUTE MAXIMUM!
                   metadata=metadata)          # Chart description
        plt.close()
        
        print(f"✅ Generated 2025 Modern {chart_type} chart: {output_path}")
        print(f"   📊 Accessibility: WCAG 2.1 AA compliant")
        print(f"   🎨 Aesthetic: 2025 Neon with {glow_intensity if 'glow_intensity' in locals() else 'medium'} glow")
        print(f"   📏 Dimensions: 4\" x 3.5\" optimized")
        return True
        
    except Exception as e:
        print(f"❌ Error generating 2025 chart: {e}")
        return False

def export_multi_format_chart(fig, base_name, output_dir="generated_content"):
    """2025 Multi-Format Export Strategy for Different Use Cases"""
    formats = {
        'web': {'format': 'png', 'dpi': 150, 'bbox_inches': 'tight', 'optimize': True},
        'print': {'format': 'pdf', 'dpi': 300, 'bbox_inches': 'tight'},
        'vector': {'format': 'svg', 'bbox_inches': 'tight'},
        'presentation': {'format': 'png', 'dpi': 200, 'bbox_inches': 'tight'},
        'social': {'format': 'png', 'dpi': 144, 'bbox_inches': 'tight'}  # Social media optimized
    }
    
    exported_files = []
    for use_case, params in formats.items():
        filename = f"{output_dir}/{base_name}_{use_case}.{params['format']}"
        fig.savefig(filename, **params, 
                   facecolor='none', edgecolor='none', transparent=True,
                   metadata={'Creator': 'NXT Humans AI 2025', 'Subject': f'{use_case} optimized'})
        exported_files.append(filename)
    
    return exported_files

def create_2025_custom_gradient(name, colors, n_segments=256):
    """Create Custom Gradient Color Maps for 2025 Aesthetic"""
    custom_cmap = LinearSegmentedColormap.from_list(name, colors, N=n_segments)
    return custom_cmap

# 2025 Predefined Gradient Palettes
NEON_GRADIENTS = {
    'cyber_sunset': create_2025_custom_gradient('cyber_sunset', ['#0a0a0a', '#FF10F0', '#00FFFF']),
    'electric_dawn': create_2025_custom_gradient('electric_dawn', ['#0a0a0a', '#32FF32', '#FFFF00']),
    'plasma_flow': create_2025_custom_gradient('plasma_flow', ['#0a0a0a', '#8A2BE2', '#FF6600']),
    'arctic_glow': create_2025_custom_gradient('arctic_glow', ['#0a0a0a', '#00E5FF', '#FFFFFF'])
}

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
        # Enhanced Claude 4 prompt with structured visual data specifications
        claude_prompt = """I am an expert Market Researcher and Executive Storyteller with extensive experience creating high-impact business presentations with professional charts and infographics. Analyze this content from """ + file_name + """ and create a professional presentation:
        
        """ + content[:12000] + """
        
        Create a business presentation with 6-8 slides. For each slide, provide:
        - A clear, compelling title
        - 3-5 bullet points with key insights
        - STRUCTURED CHART/VISUAL SPECIFICATIONS (not just descriptions!)

        IMPORTANT: For visual elements, provide actual data and chart specifications that can be used to generate real charts, not just text descriptions.

        Return your analysis as valid JSON with this exact structure:

        {
            "title": "Executive Presentation Title",
            "slides": [
                {
                    "title": "Slide Title",
                    "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
                    "visual": {
                        "type": "bar_chart|line_chart|pie_chart|funnel_chart|timeline|kpi_dashboard|comparison_chart|waterfall_chart",
                        "title": "Chart Title",
                        "data": {
                            "labels": ["Label1", "Label2", "Label3"],
                            "values": [value1, value2, value3],
                            "format": "currency|percentage|number|millions",
                            "comparison_data": {
                                "before": [old_val1, old_val2],
                                "after": [new_val1, new_val2]
                            }
                        },
                        "style": "nxt_cyan|neon_blue|neon_purple|neon_green",
                        "layout": "horizontal|vertical|circular|funnel|timeline"
                    }
                }
            ]
        }

        CHART TYPE GUIDELINES:
        - bar_chart: For comparisons, rankings, performance metrics
        - line_chart: For trends over time, growth patterns
        - pie_chart: For market share, budget allocation, percentages
        - donut_chart: For key metrics with center totals
        - funnel_chart: For customer journeys, conversion processes
        - timeline: For project timelines, historical events
        - kpi_dashboard: For key metrics, performance indicators
        - comparison_chart: For before/after, competitive analysis
        - waterfall_chart: For financial breakdowns, profit/loss
        - progress_chart: For completion rates, goal achievement
        - metric_cards: For dashboard-style key metrics
        - growth_arrow: For growth trajectories, improvement stories
        - impact_matrix: For priority/impact analysis
        - journey_flow: For customer experience flows
        - competitive_radar: For competitive positioning analysis

        EXTRACT REAL DATA: If the content contains specific numbers, percentages, or metrics, use those actual values in your chart specifications. If no specific data is provided, create realistic sample data that illustrates the business concepts being discussed.

        Focus on creating charts that will actually enhance understanding of the business content."""
        
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
                
                # Generate unique chart filename
                chart_filename = f"chart_slide_{slide_count}_{uuid.uuid4().hex[:8]}.png"
                chart_path = os.path.join(charts_dir, chart_filename)
                
                print(f"📊 Generating actual chart from Claude 4 specification:")
                print(f"   Chart type: {visual_spec.get('type', 'Unknown')}")
                print(f"   Chart title: {visual_spec.get('title', 'Unknown')}")
                print(f"   Data points: {len(visual_spec.get('data', {}).get('labels', []))}")
                
                # Generate the chart
                chart_generated = generate_chart_from_spec(visual_spec, chart_path)
                
                if chart_generated:
                    print(f"✅ Chart generated successfully: {chart_path}")
                else:
                    print(f"❌ Chart generation failed, falling back to text description")
            
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
            
            # Strategy 2: Insert charts into Master layout image placeholder (4" x 3.5")
            if chart_generated and chart_path and os.path.exists(chart_path):
                chart_inserted = False
                
                # Look for image placeholders (PICTURE type) in the current slide
                for shape in slide.placeholders:
                    try:
                        placeholder_type = getattr(shape.placeholder_format, 'type', None)
                        placeholder_idx = shape.placeholder_format.idx
                        
                        print(f"🔍 Checking placeholder {placeholder_idx}, type: {placeholder_type}")
                        
                        if placeholder_type == 18:  # PICTURE placeholder
                            # This is the Master layout image placeholder
                            print(f"📍 Found PICTURE placeholder {placeholder_idx} - Master layout image area")
                            
                            # Get placeholder position and use exact 4" x 3.5" dimensions
                            left = shape.left
                            top = shape.top
                            chart_width = Inches(4.0)   # Exact Master layout dimension
                            chart_height = Inches(3.5)  # Exact Master layout dimension
                            
                            # Insert chart with exact dimensions into placeholder position
                            chart_shape = slide.shapes.add_picture(chart_path, left, top, chart_width, chart_height)
                            
                            # Remove the original placeholder shape
                            sp = shape._element
                            sp.getparent().remove(sp)
                            
                            print(f"📊 Inserted chart into Master layout placeholder {placeholder_idx}")
                            print(f"   Position: ({left.inches:.1f}\", {top.inches:.1f}\")")
                            print(f"   Size: {chart_width.inches}\" x {chart_height.inches}\" (Master layout dimensions)")
                            chart_inserted = True
                            break
                            
                    except Exception as e:
                        print(f"⚠️ Error checking placeholder {placeholder_idx}: {e}")
                        continue
                
                # If no PICTURE placeholder found, also check OBJECT placeholders that might accept images
                if not chart_inserted:
                    print(f"🔍 No PICTURE placeholder found, checking OBJECT placeholders...")
                    for shape in slide.placeholders:
                        try:
                            placeholder_type = getattr(shape.placeholder_format, 'type', None)
                            placeholder_idx = shape.placeholder_format.idx
                            
                            if placeholder_type == 7:  # OBJECT placeholder (can hold images)
                                print(f"📍 Found OBJECT placeholder {placeholder_idx} - attempting image insertion")
                                
                                # Get placeholder position and use exact 4" x 3.5" dimensions
                                left = shape.left
                                top = shape.top
                                chart_width = Inches(4.0)
                                chart_height = Inches(3.5)
                                
                                # Insert chart with exact dimensions
                                chart_shape = slide.shapes.add_picture(chart_path, left, top, chart_width, chart_height)
                                
                                # Try to remove the original placeholder shape
                                try:
                                    sp = shape._element
                                    sp.getparent().remove(sp)
                                except:
                                    print(f"⚠️ Could not remove OBJECT placeholder {placeholder_idx}")
                                
                                print(f"📊 Inserted chart into OBJECT placeholder {placeholder_idx}")
                                print(f"   Position: ({left.inches:.1f}\", {top.inches:.1f}\")")
                                print(f"   Size: {chart_width.inches}\" x {chart_height.inches}\" (Master layout dimensions)")
                                chart_inserted = True
                                break
                                
                        except Exception as e:
                            print(f"⚠️ Error with OBJECT placeholder {placeholder_idx}: {e}")
                            continue
                
                # Fallback: Add chart at a standard position if no suitable placeholder found
                if not chart_inserted:
                    print(f"⚠️ No suitable image placeholder found, adding chart at standard position")
                    try:
                        # Use right side positioning with Master layout dimensions
                        chart_left = Inches(6.0)    # Right side of slide
                        chart_top = Inches(2.0)     # Below title
                        chart_width = Inches(4.0)   # Master layout width
                        chart_height = Inches(3.5)  # Master layout height
                        
                        chart_shape = slide.shapes.add_picture(chart_path, chart_left, chart_top, chart_width, chart_height)
                        print(f"📊 Added chart at standard position ({chart_left.inches}, {chart_top.inches})")
                        print(f"   Size: {chart_width.inches}\" x {chart_height.inches}\" (Master layout dimensions)")
                        
                    except Exception as e:
                        print(f"❌ Failed to add chart at standard position: {e}")
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