"""
D3.js Infographic Generator with Playwright Integration
Creates sophisticated, customizable infographics using D3.js and captures them as images.
"""

import os
import json
import tempfile
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from playwright.async_api import async_playwright
import logging

logger = logging.getLogger(__name__)

class D3InfographicGenerator:
    """
    Advanced infographic generator using D3.js for data visualization
    with Playwright for high-quality image capture.
    """
    
    def __init__(self):
        self.output_dir = Path("generated_content/d3_infographics")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    async def generate_infographic(
        self,
        data: Dict[str, Any],
        chart_type: str,
        title: str,
        style_config: Optional[Dict[str, Any]] = None,
        width: int = 1200,
        height: int = 800
    ) -> Tuple[str, bytes]:
        """
        Generate a D3.js infographic and capture it as an image.
        
        Args:
            data: Data to visualize
            chart_type: Type of chart (bar, line, pie, network, etc.)
            title: Chart title
            style_config: Custom styling configuration
            width: Image width in pixels
            height: Image height in pixels
            
        Returns:
            Tuple of (html_content, image_bytes)
        """
        
        # Default styling for transparent, high-contrast on black
        default_style = {
            "background": "transparent",
            "textColor": "#ffffff",
            "primaryColor": "#01C4C8",  # NXT Humans cyan
            "secondaryColor": "#7C3AED",  # Purple
            "accentColor": "#22c55e",   # Green
            "gridColor": "rgba(255,255,255,0.1)",
            "fontSize": "14px",
            "titleFontSize": "24px",
            "fontFamily": "Segoe UI, Arial, sans-serif"
        }
        
        style = {**default_style, **(style_config or {})}
        
        # Generate the HTML with D3.js visualization
        html_content = self._create_d3_html(data, chart_type, title, style, width, height)
        
        # Capture the visualization as an image using Playwright
        image_bytes = await self._capture_with_playwright(html_content, width, height)
        
        return html_content, image_bytes
    
    def _create_d3_html(
        self,
        data: Dict[str, Any],
        chart_type: str,
        title: str,
        style: Dict[str, Any],
        width: int,
        height: int
    ) -> str:
        """Create HTML content with D3.js visualization."""
        
        # Generate chart-specific D3.js code
        chart_code = self._generate_chart_code(data, chart_type, style, width, height)
        
        html_template = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
            <script src="https://d3js.org/d3.v7.min.js"></script>
            <style>
                body {{
                    margin: 0;
                    padding: 20px;
                    background: {style['background']};
                    font-family: {style['fontFamily']};
                    color: {style['textColor']};
                    width: {width}px;
                    height: {height}px;
                    overflow: hidden;
                }}
                
                .chart-container {{
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }}
                
                .chart-title {{
                    font-size: {style['titleFontSize']};
                    font-weight: 600;
                    margin-bottom: 20px;
                    text-align: center;
                    color: {style['textColor']};
                    text-shadow: 0 0 10px rgba(1, 196, 200, 0.3);
                }}
                
                .chart-svg {{
                    background: {style['background']};
                }}
                
                .axis {{
                    color: {style['textColor']};
                }}
                
                .axis text {{
                    fill: {style['textColor']};
                    font-size: {style['fontSize']};
                }}
                
                .axis path,
                .axis line {{
                    stroke: {style['gridColor']};
                    stroke-width: 1;
                }}
                
                .grid line {{
                    stroke: {style['gridColor']};
                    stroke-width: 0.5;
                    stroke-dasharray: 3,3;
                }}
                
                .tooltip {{
                    position: absolute;
                    background: rgba(0, 0, 0, 0.8);
                    color: {style['textColor']};
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid {style['primaryColor']};
                    font-size: 12px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.3s;
                }}
            </style>
        </head>
        <body>
            <div class="chart-container">
                <div class="chart-title">{title}</div>
                <svg class="chart-svg" width="{width-40}" height="{height-80}"></svg>
            </div>
            
            <script>
                {chart_code}
            </script>
        </body>
        </html>
        """
        
        return html_template
    
    def _generate_chart_code(
        self,
        data: Dict[str, Any],
        chart_type: str,
        style: Dict[str, Any],
        width: int,
        height: int
    ) -> str:
        """Generate D3.js code based on chart type."""
        
        chart_generators = {
            "bar": self._generate_bar_chart,
            "line": self._generate_line_chart,
            "pie": self._generate_pie_chart,
            "scatter": self._generate_scatter_chart,
            "network": self._generate_network_chart,
            "treemap": self._generate_treemap_chart,
            "sankey": self._generate_sankey_chart,
            "heatmap": self._generate_heatmap_chart
        }
        
        generator = chart_generators.get(chart_type, self._generate_bar_chart)
        return generator(data, style, width - 40, height - 80)
    
    def _generate_bar_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate D3.js bar chart code."""
        
        # Extract data points
        items = data.get('items', [])
        if not items:
            items = [{'label': 'Sample', 'value': 100}]
        
        # Convert to JSON for JavaScript
        data_json = json.dumps(items)
        
        return f"""
        const data = {data_json};
        const svg = d3.select('.chart-svg');
        const margin = {{top: 20, right: 30, bottom: 50, left: 60}};
        const chartWidth = {width} - margin.left - margin.right;
        const chartHeight = {height} - margin.top - margin.bottom;
        
        // Create scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, chartWidth])
            .padding(0.2);
            
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .range([chartHeight, 0]);
        
        // Create chart group
        const chart = svg.append('g')
            .attr('transform', `translate(${{margin.left}}, ${{margin.top}})`);
        
        // Add grid lines
        chart.selectAll('.grid-line')
            .data(yScale.ticks())
            .enter()
            .append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScale(d))
            .attr('y2', d => yScale(d))
            .style('stroke', '{style["gridColor"]}')
            .style('stroke-width', 0.5)
            .style('stroke-dasharray', '3,3');
        
        // Create gradient for bars
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'barGradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', 0).attr('y2', chartHeight);
            
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '{style["primaryColor"]}')
            .attr('stop-opacity', 0.9);
            
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '{style["secondaryColor"]}')
            .attr('stop-opacity', 0.7);
        
        // Create tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip');
        
        // Create bars
        chart.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.label))
            .attr('y', chartHeight)
            .attr('width', xScale.bandwidth())
            .attr('height', 0)
            .attr('fill', 'url(#barGradient)')
            .attr('stroke', '{style["primaryColor"]}')
            .attr('stroke-width', 1)
            .style('filter', 'drop-shadow(0 0 8px rgba(1, 196, 200, 0.4))')
            .on('mouseover', function(event, d) {{
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style('filter', 'drop-shadow(0 0 12px rgba(1, 196, 200, 0.6))');
                    
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                    
                tooltip.html(`<strong>${{d.label}}</strong><br/>Value: ${{d.value}}`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            }})
            .on('mouseout', function(d) {{
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style('filter', 'drop-shadow(0 0 8px rgba(1, 196, 200, 0.4))');
                    
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            }})
            .transition()
            .duration(1000)
            .delay((d, i) => i * 100)
            .attr('y', d => yScale(d.value))
            .attr('height', d => chartHeight - yScale(d.value));
        
        // Add value labels on bars
        chart.selectAll('.value-label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'value-label')
            .attr('x', d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.value) - 8)
            .attr('text-anchor', 'middle')
            .style('fill', '{style["textColor"]}')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('text-shadow', '0 0 4px rgba(0,0,0,0.8)')
            .text(d => d.value)
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .delay((d, i) => i * 100 + 500)
            .style('opacity', 1);
        
        // Add axes
        const xAxis = d3.axisBottom(xScale)
            .tickSizeOuter(0);
        const yAxis = d3.axisLeft(yScale)
            .tickSizeOuter(0);
        
        chart.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${{chartHeight}})`)
            .call(xAxis);
        
        chart.append('g')
            .attr('class', 'axis')
            .call(yAxis);
        """
    
    def _generate_pie_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate D3.js pie chart code."""
        
        items = data.get('items', [])
        if not items:
            items = [{'label': 'Sample', 'value': 100}]
        
        data_json = json.dumps(items)
        
        return f"""
        const data = {data_json};
        const svg = d3.select('.chart-svg');
        const radius = Math.min({width}, {height}) / 2 - 40;
        const centerX = {width} / 2;
        const centerY = {height} / 2;
        
        // Create color scale
        const colors = ['{style["primaryColor"]}', '{style["secondaryColor"]}', '{style["accentColor"]}', 
                       '#ff6b6b', '#4ecdc4', '#45b7d1', '#f39c12', '#e74c3c'];
        const colorScale = d3.scaleOrdinal(colors);
        
        // Create pie generator
        const pie = d3.pie()
            .value(d => d.value)
            .sort(null);
        
        // Create arc generator
        const arc = d3.arc()
            .innerRadius(radius * 0.4)
            .outerRadius(radius);
        
        const arcHover = d3.arc()
            .innerRadius(radius * 0.4)
            .outerRadius(radius * 1.1);
        
        // Create chart group
        const chart = svg.append('g')
            .attr('transform', `translate(${{centerX}}, ${{centerY}})`);
        
        // Create tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip');
        
        // Create pie slices
        const slices = chart.selectAll('.slice')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'slice');
        
        slices.append('path')
            .attr('d', arc)
            .attr('fill', (d, i) => colorScale(i))
            .attr('stroke', '{style["textColor"]}')
            .attr('stroke-width', 2)
            .style('filter', 'drop-shadow(0 0 8px rgba(1, 196, 200, 0.3))')
            .on('mouseover', function(event, d) {{
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', arcHover)
                    .style('filter', 'drop-shadow(0 0 12px rgba(1, 196, 200, 0.6))');
                    
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                    
                const percentage = ((d.value / d3.sum(data, d => d.value)) * 100).toFixed(1);
                tooltip.html(`<strong>${{d.data.label}}</strong><br/>Value: ${{d.data.value}}<br/>Percentage: ${{percentage}}%`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            }})
            .on('mouseout', function(d) {{
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', arc)
                    .style('filter', 'drop-shadow(0 0 8px rgba(1, 196, 200, 0.3))');
                    
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            }})
            .transition()
            .duration(1000)
            .delay((d, i) => i * 100)
            .attrTween('d', function(d) {{
                const interpolate = d3.interpolate({{startAngle: 0, endAngle: 0}}, d);
                return function(t) {{
                    return arc(interpolate(t));
                }};
            }});
        
        // Add labels
        slices.append('text')
            .attr('transform', d => `translate(${{arc.centroid(d)}})`)
            .attr('text-anchor', 'middle')
            .style('fill', '{style["textColor"]}')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('text-shadow', '0 0 4px rgba(0,0,0,0.8)')
            .text(d => d.data.label)
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .delay(800)
            .style('opacity', 1);
        """
    
    def _generate_line_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate D3.js line chart code."""
        
        items = data.get('items', [])
        if not items:
            items = [{'x': 0, 'y': 0}, {'x': 1, 'y': 1}]
        
        data_json = json.dumps(items)
        
        return f"""
        const data = {data_json};
        const svg = d3.select('.chart-svg');
        const margin = {{top: 20, right: 30, bottom: 50, left: 60}};
        const chartWidth = {width} - margin.left - margin.right;
        const chartHeight = {height} - margin.top - margin.bottom;
        
        // Create scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.x))
            .range([0, chartWidth]);
            
        const yScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.y))
            .range([chartHeight, 0]);
        
        // Create chart group
        const chart = svg.append('g')
            .attr('transform', `translate(${{margin.left}}, ${{margin.top}})`);
        
        // Add grid lines
        chart.selectAll('.grid-line-y')
            .data(yScale.ticks())
            .enter()
            .append('line')
            .attr('class', 'grid-line-y')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScale(d))
            .attr('y2', d => yScale(d))
            .style('stroke', '{style["gridColor"]}')
            .style('stroke-width', 0.5)
            .style('stroke-dasharray', '3,3');
        
        // Create line generator
        const line = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
            .curve(d3.curveMonotoneX);
        
        // Create gradient for line
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'lineGradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', chartWidth).attr('y2', 0);
            
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '{style["primaryColor"]}');
            
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '{style["secondaryColor"]}');
        
        // Add the line
        const path = chart.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'url(#lineGradient)')
            .attr('stroke-width', 3)
            .attr('d', line)
            .style('filter', 'drop-shadow(0 0 8px rgba(1, 196, 200, 0.4))')
            .style('opacity', 0);
        
        // Animate line drawing
        const totalLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', totalLength + ' ' + totalLength)
            .attr('stroke-dashoffset', totalLength)
            .style('opacity', 1)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);
        
        // Add data points
        chart.selectAll('.dot')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 0)
            .attr('fill', '{style["primaryColor"]}')
            .attr('stroke', '{style["textColor"]}')
            .attr('stroke-width', 2)
            .style('filter', 'drop-shadow(0 0 6px rgba(1, 196, 200, 0.6))')
            .transition()
            .duration(500)
            .delay((d, i) => i * 100 + 1000)
            .attr('r', 5);
        
        // Add axes
        const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
        const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);
        
        chart.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${{chartHeight}})`)
            .call(xAxis);
        
        chart.append('g')
            .attr('class', 'axis')
            .call(yAxis);
        """
    
    def _generate_scatter_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate D3.js scatter plot code."""
        return self._generate_line_chart(data, style, width, height).replace("line", "scatter")
    
    def _generate_network_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate D3.js network diagram code."""
        return f"// Network chart implementation would go here"
    
    def _generate_treemap_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate D3.js treemap code."""
        return f"// Treemap chart implementation would go here"
    
    def _generate_sankey_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate D3.js Sankey diagram code."""
        return f"// Sankey chart implementation would go here"
    
    def _generate_heatmap_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate D3.js heatmap code."""
        return f"// Heatmap chart implementation would go here"
    
    async def _capture_with_playwright(self, html_content: str, width: int, height: int) -> bytes:
        """Capture the HTML visualization as a PNG image using Playwright."""
        
        async with async_playwright() as p:
            # Launch browser in headless mode
            browser = await p.chromium.launch(headless=True)
            
            try:
                page = await browser.new_page()
                
                # Set viewport size
                await page.set_viewport_size({"width": width, "height": height})
                
                # Create temporary HTML file
                with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
                    f.write(html_content)
                    temp_file = f.name
                
                try:
                    # Load the HTML content
                    await page.goto(f"file://{temp_file}")
                    
                    # Wait for D3.js animations to complete
                    await page.wait_for_timeout(3000)
                    
                    # Capture screenshot with transparent background
                    screenshot_bytes = await page.screenshot(
                        type='png',
                        omit_background=True,  # Transparent background
                        full_page=True
                    )
                    
                    return screenshot_bytes
                    
                finally:
                    # Clean up temporary file
                    os.unlink(temp_file)
                    
            finally:
                await browser.close()

async def create_d3_infographic(
    data: Dict[str, Any],
    chart_type: str,
    title: str,
    style_config: Optional[Dict[str, Any]] = None,
    width: int = 1200,
    height: int = 800
) -> Tuple[str, bytes]:
    """
    Convenience function to create a D3.js infographic.
    
    Args:
        data: Data to visualize
        chart_type: Type of chart (bar, line, pie, etc.)
        title: Chart title
        style_config: Custom styling configuration
        width: Image width in pixels
        height: Image height in pixels
        
    Returns:
        Tuple of (html_content, image_bytes)
    """
    generator = D3InfographicGenerator()
    return await generator.generate_infographic(data, chart_type, title, style_config, width, height)


# Chart type mapping for different data patterns
CHART_TYPE_MAPPING = {
    "comparison": "bar",
    "trend": "line", 
    "distribution": "pie",
    "correlation": "scatter",
    "hierarchy": "treemap",
    "flow": "sankey",
    "pattern": "heatmap",
    "relationship": "network"
}

def suggest_chart_type(data: Dict[str, Any]) -> str:
    """Suggest appropriate chart type based on data structure."""
    
    if 'items' in data:
        items = data['items']
        if len(items) <= 6:
            return "pie"
        else:
            return "bar"
    
    if 'nodes' in data and 'links' in data:
        return "network"
    
    if 'hierarchy' in data:
        return "treemap"
    
    return "bar"  # Default fallback