"""
Chart Galaxy Integration for Presentation Generator
Advanced infographic generation using Chart Galaxy framework with Claude 4 intelligence
"""

import asyncio
import json
import os
import tempfile
import uuid
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import requests
import anthropic
from playwright.async_api import async_playwright
import logging

logger = logging.getLogger(__name__)

class ChartGalaxyGenerator:
    """
    Advanced infographic generator using Chart Galaxy framework.
    Integrates Claude 4 intelligence with Chart Galaxy's sophisticated visualization capabilities.
    """
    
    def __init__(self, anthropic_api_key: str):
        self.anthropic_client = anthropic.Anthropic(api_key=anthropic_api_key)
        self.chart_galaxy_path = Path(__file__).parent / "ChartGalaxy"
        self.output_dir = Path("generated_content/chart_galaxy_infographics")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Chart Galaxy prompt for D3.js code generation
        self.chart_galaxy_prompt = self._load_chart_galaxy_prompt()
        
    def _load_chart_galaxy_prompt(self) -> str:
        """Load the Chart Galaxy D3.js code generation prompt"""
        prompt_path = self.chart_galaxy_path / "code_generation_benchmark/prompts/chat_direct_prompt.txt"
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("Chart Galaxy prompt not found, using fallback")
            return self._get_fallback_prompt()
    
    def _get_fallback_prompt(self) -> str:
        """Fallback Chart Galaxy-style prompt if original not found"""
        return """You are an expert data‐visualization engineer and front‐end developer.

Your task is to generate a HTML file that reproduces sophisticated infographic charts exactly. The chart must be centered in the viewport.

## Constraints:
- No Explanations: Do not include comments, reasoning, or explanatory text. Output only valid HTML with JavaScript code.

## Technical Requirements
- **Charting library**: Use D3.js to implement the chart. Write the code to be clean, modular, and easy to understand and modify.
- **Single file output**: Provide one standalone HTML file that includes everything needed to render the chart.
- **Chart fidelity**: Replicate all visual elements—shapes, colors, axes, labels, legends, fonts, line weights, markers—exactly as specified.
- **No animations**: The chart must render immediately in its final state.
- **Aspect ratio & sizing**: The chart's content area must match professional presentation proportions.
- **Image**: Recreate any icon/image content using SVG <g> and shapes. Do not use <image>, base64 images, or links.
- **Text**: Place all text in <text> leaf nodes. Do not use <tspan> or nested text structures.

## Grouping Requirements
You should use following `class` names for SVG groups with specific semantics:
- title: The title area (may contain title, subtitle, and shapes)
- image: Each individual icon/image/pictogram (no annotation text, no grouped images)
- legend: Legend area
- axis: Axis area

## Output Format
Return only the following standalone HTML file:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Recreated Chart</title>
        <!-- <style> -->
    </head>
    <body>
        <div id="chart-container"></div>
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <script>
            <!-- Your D3 code here -->
        </script>
    </body>
</html>
```
Only output this file. No comments or explanation."""

    async def analyze_slide_for_infographic(self, slide_content: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Use Claude 4 to analyze slide content and determine if it needs an infographic.
        Returns Chart Galaxy-compatible data structure if infographic is needed.
        """
        try:
            analysis_prompt = f"""
            You are a professional presentation designer specializing in sophisticated infographics using Chart Galaxy framework.

            SLIDE CONTENT ANALYSIS:
            {json.dumps(slide_content, indent=2)}

            TASK: Analyze this slide content and determine what type of infographic would enhance it most effectively.

            CHART GALAXY DATA FORMAT REQUIREMENTS:
            You must output JSON in this exact format:
            {{
                "needs_infographic": true/false,
                "infographic_type": "bar_chart|pie_chart|line_chart|area_chart|scatter_plot|treemap|sankey|network|pictogram|icon_array|process_flow|comparison_matrix|timeline|geographic_map",
                "title": "Professional chart title",
                "description": "What this infographic shows and why it's valuable",
                "data": [
                    {{"category": "Label 1", "value": 100, "additional_field": "optional"}},
                    {{"category": "Label 2", "value": 150, "additional_field": "optional"}}
                ],
                "columns": [
                    {{"name": "category", "type": "categorical", "role": "x"}},
                    {{"name": "value", "type": "quantitative", "role": "y"}}
                ],
                "style_requirements": {{
                    "color_scheme": "professional|financial|growth|warning|success|neutral",
                    "emphasis": "data_driven|storytelling|comparison|trend|hierarchy",
                    "complexity": "simple|moderate|detailed"
                }}
            }}

            INFOGRAPHIC INTELLIGENCE RULES:
            1. **EVERY slide should have an infographic** unless it's purely textual (like agenda/conclusion)
            2. **Extract or infer data** from the slide content - create meaningful visualizations
            3. **Professional business context** - charts should support executive decision-making
            4. **Sophisticated design** - use Chart Galaxy's advanced capabilities for stunning visuals
            5. **Data storytelling** - charts should tell a compelling story, not just display data

            CHART TYPE SELECTION GUIDANCE:
            - **Bar/Column**: Comparisons, rankings, categorical data
            - **Pie/Donut**: Parts of whole, market share, percentages  
            - **Line/Area**: Trends over time, growth patterns, forecasts
            - **Scatter**: Correlations, performance matrices, portfolio analysis
            - **Treemap**: Hierarchical data, budget allocation, organizational structure
            - **Sankey**: Flow diagrams, process visualization, resource allocation
            - **Network**: Relationships, connections, ecosystem mapping
            - **Pictogram/Icon Array**: People statistics, unit comparisons, counts
            - **Process Flow**: Step-by-step processes, workflows, methodologies
            - **Timeline**: Project plans, historical data, milestone tracking

            Return ONLY the JSON object. If the slide doesn't need an infographic, set needs_infographic to false.
            """
            
            response = await asyncio.to_thread(
                self.anthropic_client.messages.create,
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                temperature=0.2,
                messages=[{"role": "user", "content": analysis_prompt}]
            )
            
            # Parse Claude 4's response
            json_text = response.content[0].text.strip()
            if json_text.startswith('```json'):
                json_text = json_text.split('```json')[1].split('```')[0].strip()
            elif json_text.startswith('```'):
                json_text = json_text.split('```')[1].split('```')[0].strip()
            
            analysis_result = json.loads(json_text)
            
            if analysis_result.get("needs_infographic", False):
                logger.info(f"Claude 4 determined slide needs {analysis_result.get('infographic_type')} infographic: {analysis_result.get('title')}")
                return analysis_result
            else:
                logger.info("Claude 4 determined slide doesn't need infographic")
                return None
                
        except Exception as e:
            logger.error(f"Slide analysis failed: {e}")
            return None

    async def generate_chart_galaxy_code(self, infographic_spec: Dict[str, Any]) -> str:
        """
        Use Claude 4 with Chart Galaxy prompt to generate sophisticated D3.js code.
        """
        try:
            # Prepare Chart Galaxy code generation prompt
            chart_galaxy_code_prompt = f"""
            {self.chart_galaxy_prompt}

            ## INFOGRAPHIC SPECIFICATION:
            Title: {infographic_spec.get('title', 'Data Visualization')}
            Type: {infographic_spec.get('infographic_type', 'bar_chart')}
            Description: {infographic_spec.get('description', 'Professional data visualization')}

            ## DATA TO VISUALIZE:
            ```json
            {json.dumps(infographic_spec.get('data', []), indent=2)}
            ```

            ## COLUMN SPECIFICATIONS:
            ```json
            {json.dumps(infographic_spec.get('columns', []), indent=2)}
            ```

            ## STYLE REQUIREMENTS:
            - Color Scheme: {infographic_spec.get('style_requirements', {}).get('color_scheme', 'professional')}
            - Emphasis: {infographic_spec.get('style_requirements', {}).get('emphasis', 'data_driven')}
            - Complexity: {infographic_spec.get('style_requirements', {}).get('complexity', 'moderate')}
            - Background: Transparent for PowerPoint integration
            - Text Color: High contrast white/light colors for dark backgrounds
            - Professional Design: Executive-level quality with sophisticated styling

            ## ADVANCED DESIGN REQUIREMENTS:
            1. **Sophisticated Visual Design**: Use gradients, shadows, and professional styling
            2. **Interactive Elements**: Hover effects and smooth transitions (but no animations)
            3. **Data Storytelling**: Design should guide the viewer's attention to key insights
            4. **Executive Quality**: Boardroom-ready professional appearance
            5. **Brand Consistency**: Use modern, clean design language
            6. **Accessibility**: High contrast and clear readability

            Generate the complete HTML file that creates this sophisticated infographic.
            """
            
            response = await asyncio.to_thread(
                self.anthropic_client.messages.create,
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                temperature=0.1,
                messages=[{"role": "user", "content": chart_galaxy_code_prompt}]
            )
            
            html_code = response.content[0].text.strip()
            
            # Clean up the response to extract just the HTML
            if '```html' in html_code:
                html_code = html_code.split('```html')[1].split('```')[0].strip()
            elif '```' in html_code:
                html_code = html_code.split('```')[1].split('```')[0].strip()
            
            # Ensure it starts with DOCTYPE
            if not html_code.startswith('<!DOCTYPE'):
                html_code = f"<!DOCTYPE html>\n{html_code}"
            
            logger.info(f"Generated {len(html_code)} characters of Chart Galaxy D3.js code")
            return html_code
            
        except Exception as e:
            logger.error(f"Chart Galaxy code generation failed: {e}")
            return self._generate_fallback_html(infographic_spec)

    def _generate_fallback_html(self, infographic_spec: Dict[str, Any]) -> str:
        """Generate a simple fallback HTML if Chart Galaxy generation fails"""
        title = infographic_spec.get('title', 'Data Visualization')
        data = infographic_spec.get('data', [])
        
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {{ margin: 0; padding: 20px; background: transparent; color: white; font-family: 'Segoe UI', Arial, sans-serif; }}
        .chart-container {{ text-align: center; }}
        .chart-title {{ font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #01C4C8; }}
    </style>
</head>
<body>
    <div class="chart-container">
        <div class="chart-title">{title}</div>
        <div style="color: #666; font-size: 14px;">Professional infographic rendering in progress...</div>
    </div>
</body>
</html>"""

    async def render_infographic_to_image(self, html_content: str, output_path: str, width: int = 1200, height: int = 800) -> bool:
        """
        Use Playwright to render the Chart Galaxy HTML to a high-quality transparent PNG.
        """
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                
                try:
                    page = await browser.new_page()
                    await page.set_viewport_size({"width": width, "height": height})
                    
                    # Create temporary HTML file
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
                        f.write(html_content)
                        temp_file = f.name
                    
                    try:
                        # Load the HTML content
                        await page.goto(f"file://{temp_file}")
                        
                        # Wait for D3.js rendering to complete
                        await page.wait_for_timeout(3000)
                        
                        # Capture screenshot with transparent background
                        screenshot_bytes = await page.screenshot(
                            type='png',
                            omit_background=True,
                            full_page=True
                        )
                        
                        # Save the image
                        os.makedirs(os.path.dirname(output_path), exist_ok=True)
                        with open(output_path, 'wb') as f:
                            f.write(screenshot_bytes)
                        
                        logger.info(f"Chart Galaxy infographic rendered to: {output_path}")
                        return True
                        
                    finally:
                        os.unlink(temp_file)
                        
                finally:
                    await browser.close()
                    
        except Exception as e:
            logger.error(f"Infographic rendering failed: {e}")
            return False

    async def generate_infographic_for_slide(self, slide_content: Dict[str, Any], slide_index: int) -> Optional[str]:
        """
        Complete workflow: Analyze slide -> Generate Chart Galaxy infographic -> Render to image.
        Returns the path to the generated infographic image, or None if no infographic was needed.
        """
        try:
            # Step 1: Analyze slide with Claude 4
            infographic_spec = await self.analyze_slide_for_infographic(slide_content)
            
            if not infographic_spec:
                return None
            
            # Step 2: Generate Chart Galaxy D3.js code with Claude 4
            html_content = await self.generate_chart_galaxy_code(infographic_spec)
            
            # Step 3: Render to high-quality image
            session_id = str(uuid.uuid4())[:8]
            image_filename = f"slide_{slide_index:02d}_{infographic_spec.get('infographic_type', 'chart')}_{session_id}.png"
            image_path = self.output_dir / image_filename
            
            # Save HTML for debugging
            html_filename = image_filename.replace('.png', '.html')
            html_path = self.output_dir / html_filename
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            success = await self.render_infographic_to_image(
                html_content, 
                str(image_path),
                width=1200,
                height=800
            )
            
            if success:
                logger.info(f"Chart Galaxy infographic generated for slide {slide_index}: {image_path}")
                return str(image_path)
            else:
                logger.error(f"Failed to render infographic for slide {slide_index}")
                return None
                
        except Exception as e:
            logger.error(f"Complete infographic generation failed for slide {slide_index}: {e}")
            return None

    async def generate_infographics_for_all_slides(self, slides_content: List[Dict[str, Any]]) -> Dict[int, str]:
        """
        Generate Chart Galaxy infographics for ALL slides in a presentation.
        Returns mapping of slide_index -> infographic_image_path.
        """
        infographic_paths = {}
        
        logger.info(f"Generating Chart Galaxy infographics for {len(slides_content)} slides")
        
        for i, slide_content in enumerate(slides_content):
            logger.info(f"Processing slide {i+1}/{len(slides_content)}")
            
            try:
                image_path = await self.generate_infographic_for_slide(slide_content, i+1)
                if image_path:
                    infographic_paths[i+1] = image_path
                    logger.info(f"✅ Slide {i+1}: Generated infographic")
                else:
                    logger.info(f"⏭️ Slide {i+1}: No infographic needed")
                    
            except Exception as e:
                logger.error(f"❌ Slide {i+1}: Infographic generation failed: {e}")
                continue
        
        logger.info(f"Chart Galaxy infographic generation complete: {len(infographic_paths)} infographics generated")
        return infographic_paths


async def create_chart_galaxy_generator(anthropic_api_key: str) -> ChartGalaxyGenerator:
    """Factory function to create Chart Galaxy generator"""
    return ChartGalaxyGenerator(anthropic_api_key)