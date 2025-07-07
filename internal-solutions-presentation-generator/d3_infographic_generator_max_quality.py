"""
D3.js Infographic Generator - Maximum Quality Edition
Creates ultra-high resolution infographics with crystal-clear text rendering.
Always generates publication-grade quality suitable for print and high-DPI displays.
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

class MaxQualityD3InfographicGenerator:
    """
    Ultra-high quality infographic generator using D3.js with maximum resolution rendering.
    Always generates publication-grade output with crystal-clear text.
    """
    
    # MAXIMUM QUALITY CONSTANTS
    QUALITY_MULTIPLIER = 6  # 6x base resolution for ultra-sharp output
    DEVICE_SCALE_FACTOR = 3  # 3x device scaling for retina+ quality
    TEXT_QUALITY_BOOST = 2   # Additional text rendering enhancement
    BASE_DPI = 96           # Standard web DPI
    TARGET_DPI = 300        # Print-quality target DPI
    
    def __init__(self):
        self.output_dir = Path("generated_content/d3_infographics_max_quality")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    async def generate_infographic(
        self,
        data: Dict[str, Any],
        chart_type: str,
        title: str,
        style_config: Optional[Dict[str, Any]] = None,
        base_width: int = 1200,
        base_height: int = 800
    ) -> Tuple[str, bytes]:
        """
        Generate an ultra-high quality D3.js infographic with crystal-clear text.
        
        Args:
            data: Data to visualize
            chart_type: Type of chart (bar, line, pie, network, etc.)
            title: Chart title
            style_config: Custom styling configuration
            base_width: Base width (will be scaled up for quality)
            base_height: Base height (will be scaled up for quality)
            
        Returns:
            Tuple of (html_content, image_bytes)
        """
        
        # Calculate ultra-high resolution dimensions
        render_width = base_width * self.QUALITY_MULTIPLIER
        render_height = base_height * self.QUALITY_MULTIPLIER
        
        # Maximum quality styling optimized for text clarity
        max_quality_style = {
            "background": "transparent",
            "textColor": "#ffffff",
            "primaryColor": "#01C4C8",  # NXT Humans cyan
            "secondaryColor": "#7C3AED",  # Purple
            "accentColor": "#22c55e",   # Green
            "gridColor": "rgba(255,255,255,0.15)",
            # Ultra-sharp text rendering settings
            "fontSize": f"{16 * self.TEXT_QUALITY_BOOST}px",           # 2x larger for clarity
            "titleFontSize": f"{32 * self.TEXT_QUALITY_BOOST}px",      # 2x larger for clarity
            "labelFontSize": f"{14 * self.TEXT_QUALITY_BOOST}px",      # 2x larger for clarity
            "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
            "fontWeight": "500",        # Medium weight for better readability
            "fontSmoothing": "antialiased",
            "textRendering": "geometricPrecision",
            # Enhanced visual quality settings
            "strokeWidth": self.QUALITY_MULTIPLIER,
            "borderRadius": 4 * self.QUALITY_MULTIPLIER,
            "shadowBlur": 8 * self.QUALITY_MULTIPLIER,
            "glowIntensity": 0.6
        }
        
        # Merge with custom style config
        style = {**max_quality_style, **(style_config or {})}
        
        # Generate the HTML with ultra-high quality D3.js visualization
        html_content = self._create_max_quality_d3_html(
            data, chart_type, title, style, render_width, render_height
        )
        
        # Capture at maximum quality with enhanced text rendering
        image_bytes = await self._capture_with_max_quality_playwright(
            html_content, render_width, render_height
        )
        
        return html_content, image_bytes
    
    def _create_max_quality_d3_html(
        self,
        data: Dict[str, Any],
        chart_type: str,
        title: str,
        style: Dict[str, Any],
        width: int,
        height: int
    ) -> str:
        """Create HTML content with ultra-high quality D3.js visualization optimized for text clarity."""
        
        # Generate chart-specific D3.js code with quality enhancements
        chart_code = self._generate_max_quality_chart_code(data, chart_type, style, width, height)
        
        html_template = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
            <script src="https://d3js.org/d3.v7.min.js"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                
                * {{
                    box-sizing: border-box;
                }}
                
                body {{
                    margin: 0;
                    padding: {20 * self.QUALITY_MULTIPLIER}px;
                    background: {style['background']};
                    font-family: {style['fontFamily']};
                    color: {style['textColor']};
                    width: {width}px;
                    height: {height}px;
                    overflow: hidden;
                    /* Ultra-sharp text rendering */
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    text-rendering: geometricPrecision;
                    font-feature-settings: "liga", "kern";
                    image-rendering: -webkit-optimize-contrast;
                    image-rendering: crisp-edges;
                }}
                
                .chart-container {{
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }}
                
                .chart-title {{
                    font-size: {style['titleFontSize']};
                    font-weight: 700;
                    margin-bottom: {30 * self.QUALITY_MULTIPLIER}px;
                    text-align: center;
                    color: {style['textColor']};
                    text-shadow: 0 0 {16 * self.QUALITY_MULTIPLIER}px rgba(1, 196, 200, 0.4);
                    letter-spacing: -0.02em;
                    line-height: 1.2;
                    /* Ultra-sharp text */
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    text-rendering: geometricPrecision;
                }}
                
                .chart-svg {{
                    background: {style['background']};
                    /* Vector graphics optimization */
                    shape-rendering: geometricPrecision;
                    text-rendering: geometricPrecision;
                }}
                
                .axis {{
                    color: {style['textColor']};
                }}
                
                .axis text {{
                    fill: {style['textColor']};
                    font-size: {style['fontSize']};
                    font-weight: {style['fontWeight']};
                    font-family: {style['fontFamily']};
                    /* Ultra-sharp axis text */
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    text-rendering: geometricPrecision;
                    dominant-baseline: middle;
                }}
                
                .axis path,
                .axis line {{
                    stroke: {style['gridColor']};
                    stroke-width: {style['strokeWidth']};
                    vector-effect: non-scaling-stroke;
                }}
                
                .grid line {{
                    stroke: {style['gridColor']};
                    stroke-width: {style['strokeWidth'] / 2};
                    stroke-dasharray: {6 * self.QUALITY_MULTIPLIER},{6 * self.QUALITY_MULTIPLIER};
                    vector-effect: non-scaling-stroke;
                }}
                
                .tooltip {{
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: {style['textColor']};
                    padding: {16 * self.QUALITY_MULTIPLIER}px {20 * self.QUALITY_MULTIPLIER}px;
                    border-radius: {style['borderRadius']}px;
                    border: {2 * self.QUALITY_MULTIPLIER}px solid {style['primaryColor']};
                    font-size: {style['labelFontSize']};
                    font-weight: 500;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    backdrop-filter: blur({8 * self.QUALITY_MULTIPLIER}px);
                    box-shadow: 0 {8 * self.QUALITY_MULTIPLIER}px {32 * self.QUALITY_MULTIPLIER}px rgba(0,0,0,0.3);
                    /* Sharp tooltip text */
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    text-rendering: geometricPrecision;
                }}
                
                .value-label {{
                    font-size: {style['labelFontSize']};
                    font-weight: 600;
                    fill: {style['textColor']};
                    text-anchor: middle;
                    dominant-baseline: middle;
                    /* Ultra-sharp value labels */
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    text-rendering: geometricPrecision;
                    font-family: {style['fontFamily']};
                    text-shadow: 0 0 {8 * self.QUALITY_MULTIPLIER}px rgba(0,0,0,0.8);
                }}
                
                /* Enhanced visual elements */
                .bar, .slice path, .line, .dot {{
                    filter: drop-shadow(0 0 {style['shadowBlur']}px rgba(1, 196, 200, {style['glowIntensity']}));
                }}
                
                .bar:hover, .slice path:hover, .dot:hover {{
                    filter: drop-shadow(0 0 {style['shadowBlur'] * 1.5}px rgba(1, 196, 200, {style['glowIntensity'] * 1.2}));
                }}
            </style>
        </head>
        <body>
            <div class="chart-container">
                <div class="chart-title">{title}</div>
                <svg class="chart-svg" width="{width - 80 * self.QUALITY_MULTIPLIER}" height="{height - 120 * self.QUALITY_MULTIPLIER}"></svg>
            </div>
            
            <script>
                // Ultra-high quality rendering setup
                const QUALITY_MULTIPLIER = {self.QUALITY_MULTIPLIER};
                const TEXT_QUALITY_BOOST = {self.TEXT_QUALITY_BOOST};
                
                // Force high-quality canvas rendering
                const canvas = d3.select('body').append('canvas')
                    .style('display', 'none')
                    .attr('width', {width})
                    .attr('height', {height});
                    
                const context = canvas.node().getContext('2d');
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';
                context.textBaseline = 'middle';
                context.textAlign = 'center';
                
                {chart_code}
            </script>
        </body>
        </html>
        """
        
        return html_template
    
    def _generate_max_quality_chart_code(
        self,
        data: Dict[str, Any],
        chart_type: str,
        style: Dict[str, Any],
        width: int,
        height: int
    ) -> str:
        """Generate D3.js code with maximum quality enhancements."""
        
        chart_generators = {
            "bar": self._generate_max_quality_bar_chart,
            "line": self._generate_max_quality_line_chart,
            "pie": self._generate_max_quality_pie_chart,
            "scatter": self._generate_max_quality_scatter_chart,
            "network": self._generate_max_quality_network_chart,
            "treemap": self._generate_max_quality_treemap_chart,
            "sankey": self._generate_max_quality_sankey_chart,
            "heatmap": self._generate_max_quality_heatmap_chart
        }
        
        generator = chart_generators.get(chart_type, self._generate_max_quality_bar_chart)
        return generator(data, style, width - 80 * self.QUALITY_MULTIPLIER, height - 120 * self.QUALITY_MULTIPLIER)
    
    def _generate_max_quality_bar_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate ultra-high quality D3.js bar chart with crystal-clear text."""
        
        items = data.get('items', [])
        if not items:
            items = [{'label': 'Sample Data', 'value': 100}]
        
        data_json = json.dumps(items)
        
        return f"""
        const data = {data_json};
        const svg = d3.select('.chart-svg');
        const margin = {{
            top: {40 * self.QUALITY_MULTIPLIER}, 
            right: {60 * self.QUALITY_MULTIPLIER}, 
            bottom: {80 * self.QUALITY_MULTIPLIER}, 
            left: {100 * self.QUALITY_MULTIPLIER}
        }};
        const chartWidth = {width} - margin.left - margin.right;
        const chartHeight = {height} - margin.top - margin.bottom;
        
        // Ultra-high quality scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, chartWidth])
            .padding(0.2);
            
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value) * 1.1])
            .range([chartHeight, 0]);
        
        // Create chart group with quality settings
        const chart = svg.append('g')
            .attr('transform', `translate(${{margin.left}}, ${{margin.top}})`)
            .style('shape-rendering', 'geometricPrecision');
        
        // Ultra-high quality grid lines
        const gridLinesY = chart.selectAll('.grid-line-y')
            .data(yScale.ticks(8))
            .enter()
            .append('line')
            .attr('class', 'grid-line-y')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScale(d))
            .attr('y2', d => yScale(d))
            .style('stroke', '{style["gridColor"]}')
            .style('stroke-width', {style["strokeWidth"] / 2})
            .style('stroke-dasharray', '{6 * self.QUALITY_MULTIPLIER},{6 * self.QUALITY_MULTIPLIER}')
            .style('vector-effect', 'non-scaling-stroke');
        
        // Ultra-high quality gradients
        const defs = svg.append('defs');
        
        const gradient = defs.append('linearGradient')
            .attr('id', 'barGradientMaxQuality')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', 0).attr('y2', chartHeight);
            
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '{style["primaryColor"]}')
            .attr('stop-opacity', 0.95);
            
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '{style["secondaryColor"]}')
            .attr('stop-opacity', 0.8);
        
        // High-quality glow filter
        const glowFilter = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
            
        glowFilter.append('feGaussianBlur')
            .attr('stdDeviation', {style["shadowBlur"]})
            .attr('result', 'coloredBlur');
            
        const feMerge = glowFilter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        
        // Ultra-sharp tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip');
        
        // Create ultra-high quality bars
        const bars = chart.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.label))
            .attr('y', chartHeight)
            .attr('width', xScale.bandwidth())
            .attr('height', 0)
            .attr('fill', 'url(#barGradientMaxQuality)')
            .attr('stroke', '{style["primaryColor"]}')
            .attr('stroke-width', {style["strokeWidth"]})
            .attr('rx', {style["borderRadius"]})
            .attr('ry', {style["borderRadius"]})
            .style('filter', 'url(#glow)')
            .style('vector-effect', 'non-scaling-stroke')
            .on('mouseover', function(event, d) {{
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style('filter', 'url(#glow) brightness(1.2)');
                    
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                    
                tooltip.html(`<strong>${{d.label}}</strong><br/>Value: ${{d.value.toLocaleString()}}`)
                    .style('left', (event.pageX + {20 * self.QUALITY_MULTIPLIER}) + 'px')
                    .style('top', (event.pageY - {40 * self.QUALITY_MULTIPLIER}) + 'px');
            }})
            .on('mouseout', function(d) {{
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style('filter', 'url(#glow)');
                    
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            }});
        
        // Smooth, high-quality animation
        bars.transition()
            .duration(1500)
            .delay((d, i) => i * 150)
            .ease(d3.easeCubicOut)
            .attr('y', d => yScale(d.value))
            .attr('height', d => chartHeight - yScale(d.value));
        
        // Ultra-sharp value labels
        const valueLabels = chart.selectAll('.value-label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'value-label')
            .attr('x', d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.value) - {20 * self.QUALITY_MULTIPLIER})
            .attr('text-anchor', 'middle')
            .style('fill', '{style["textColor"]}')
            .style('font-size', '{style["labelFontSize"]}')
            .style('font-weight', '600')
            .style('font-family', '{style["fontFamily"]}')
            .style('text-shadow', '0 0 {8 * self.QUALITY_MULTIPLIER}px rgba(0,0,0,0.9)')
            .text(d => d.value.toLocaleString())
            .style('opacity', 0);
        
        // Animate value labels
        valueLabels.transition()
            .duration(1000)
            .delay((d, i) => i * 150 + 800)
            .ease(d3.easeCubicOut)
            .style('opacity', 1);
        
        // Ultra-high quality axes with sharp text
        const xAxis = d3.axisBottom(xScale)
            .tickSizeOuter(0)
            .tickPadding({15 * self.QUALITY_MULTIPLIER});
            
        const yAxis = d3.axisLeft(yScale)
            .tickSizeOuter(0)
            .tickPadding({15 * self.QUALITY_MULTIPLIER})
            .tickFormat(d => d.toLocaleString());
        
        const xAxisGroup = chart.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${{chartHeight}})`)
            .call(xAxis);
            
        const yAxisGroup = chart.append('g')
            .attr('class', 'axis')
            .call(yAxis);
        
        // Enhance axis text quality
        xAxisGroup.selectAll('text')
            .style('font-size', '{style["fontSize"]}')
            .style('font-weight', '{style["fontWeight"]}')
            .style('font-family', '{style["fontFamily"]}');
            
        yAxisGroup.selectAll('text')
            .style('font-size', '{style["fontSize"]}')
            .style('font-weight', '{style["fontWeight"]}')
            .style('font-family', '{style["fontFamily"]}');
        """
    
    def _generate_max_quality_pie_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate ultra-high quality D3.js pie chart with crystal-clear text."""
        
        items = data.get('items', [])
        if not items:
            items = [{'label': 'Sample Data', 'value': 100}]
        
        data_json = json.dumps(items)
        
        return f"""
        const data = {data_json};
        const svg = d3.select('.chart-svg');
        const radius = Math.min({width}, {height}) / 2 - {80 * self.QUALITY_MULTIPLIER};
        const centerX = {width} / 2;
        const centerY = {height} / 2;
        
        // Ultra-high quality color palette
        const colors = [
            '{style["primaryColor"]}', 
            '{style["secondaryColor"]}', 
            '{style["accentColor"]}',
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f39c12', '#e74c3c', '#9b59b6', '#2ecc71'
        ];
        const colorScale = d3.scaleOrdinal(colors);
        
        // High-quality pie and arc generators
        const pie = d3.pie()
            .value(d => d.value)
            .sort(null)
            .padAngle(0.02);
        
        const arc = d3.arc()
            .innerRadius(radius * 0.4)
            .outerRadius(radius)
            .cornerRadius({8 * self.QUALITY_MULTIPLIER});
        
        const arcHover = d3.arc()
            .innerRadius(radius * 0.4)
            .outerRadius(radius * 1.08)
            .cornerRadius({8 * self.QUALITY_MULTIPLIER});
        
        const labelArc = d3.arc()
            .innerRadius(radius * 0.7)
            .outerRadius(radius * 0.7);
        
        // Create chart group
        const chart = svg.append('g')
            .attr('transform', `translate(${{centerX}}, ${{centerY}})`)
            .style('shape-rendering', 'geometricPrecision');
        
        // High-quality gradients and filters
        const defs = svg.append('defs');
        
        data.forEach((d, i) => {{
            const gradientId = `pieGradient${{i}}`;
            const gradient = defs.append('radialGradient')
                .attr('id', gradientId)
                .attr('cx', '30%')
                .attr('cy', '30%');
                
            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', d3.color(colorScale(i)).brighter(0.3));
                
            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', colorScale(i));
        }});
        
        // Glow effect for slices
        const glowFilter = defs.append('filter')
            .attr('id', 'pieGlow')
            .attr('x', '-50%').attr('y', '-50%')
            .attr('width', '200%').attr('height', '200%');
            
        glowFilter.append('feGaussianBlur')
            .attr('stdDeviation', {style["shadowBlur"]})
            .attr('result', 'coloredBlur');
            
        const feMerge = glowFilter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        
        // Ultra-sharp tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip');
        
        // Create ultra-high quality pie slices
        const slices = chart.selectAll('.slice')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'slice');
        
        const paths = slices.append('path')
            .attr('d', arc)
            .attr('fill', (d, i) => `url(#pieGradient${{i}})`)
            .attr('stroke', '{style["textColor"]}')
            .attr('stroke-width', {style["strokeWidth"]})
            .style('filter', 'url(#pieGlow)')
            .style('vector-effect', 'non-scaling-stroke')
            .on('mouseover', function(event, d) {{
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('d', arcHover)
                    .style('filter', 'url(#pieGlow) brightness(1.15)');
                    
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                    
                const total = d3.sum(data, d => d.value);
                const percentage = ((d.value / total) * 100).toFixed(1);
                tooltip.html(`
                    <strong>${{d.data.label}}</strong><br/>
                    Value: ${{d.data.value.toLocaleString()}}<br/>
                    Percentage: ${{percentage}}%
                `)
                    .style('left', (event.pageX + {20 * self.QUALITY_MULTIPLIER}) + 'px')
                    .style('top', (event.pageY - {40 * self.QUALITY_MULTIPLIER}) + 'px');
            }})
            .on('mouseout', function(d) {{
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('d', arc)
                    .style('filter', 'url(#pieGlow)');
                    
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            }});
        
        // Smooth, high-quality animation
        paths.transition()
            .duration(1500)
            .delay((d, i) => i * 100)
            .ease(d3.easeCubicOut)
            .attrTween('d', function(d) {{
                const interpolate = d3.interpolate({{startAngle: 0, endAngle: 0}}, d);
                return function(t) {{
                    return arc(interpolate(t));
                }};
            }});
        
        // Ultra-sharp labels with intelligent positioning
        const labels = slices.append('text')
            .attr('transform', d => {{
                const centroid = labelArc.centroid(d);
                return `translate(${{centroid[0]}}, ${{centroid[1]}})`;
            }})
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('fill', '{style["textColor"]}')
            .style('font-size', '{style["labelFontSize"]}')
            .style('font-weight', '600')
            .style('font-family', '{style["fontFamily"]}')
            .style('text-shadow', '0 0 {12 * self.QUALITY_MULTIPLIER}px rgba(0,0,0,0.9)')
            .text(d => {{
                const total = d3.sum(data, d => d.value);
                const percentage = ((d.value / total) * 100);
                return percentage > 5 ? d.data.label : '';  // Only show label if slice is large enough
            }})
            .style('opacity', 0);
        
        // Animate labels
        labels.transition()
            .duration(1000)
            .delay(1200)
            .ease(d3.easeCubicOut)
            .style('opacity', 1);
        """
    
    def _generate_max_quality_line_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        """Generate ultra-high quality D3.js line chart with crystal-clear text."""
        
        items = data.get('items', [])
        if not items:
            items = [{'x': 0, 'y': 0}, {'x': 1, 'y': 1}, {'x': 2, 'y': 1.5}]
        
        data_json = json.dumps(items)
        
        return f"""
        const data = {data_json};
        const svg = d3.select('.chart-svg');
        const margin = {{
            top: {40 * self.QUALITY_MULTIPLIER}, 
            right: {60 * self.QUALITY_MULTIPLIER}, 
            bottom: {80 * self.QUALITY_MULTIPLIER}, 
            left: {100 * self.QUALITY_MULTIPLIER}
        }};
        const chartWidth = {width} - margin.left - margin.right;
        const chartHeight = {height} - margin.top - margin.bottom;
        
        // Ultra-high quality scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.x))
            .range([0, chartWidth]);
            
        const yScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.y))
            .range([chartHeight, 0]);
        
        // Create chart group
        const chart = svg.append('g')
            .attr('transform', `translate(${{margin.left}}, ${{margin.top}})`)
            .style('shape-rendering', 'geometricPrecision');
        
        // Ultra-high quality grid
        chart.selectAll('.grid-line-y')
            .data(yScale.ticks(8))
            .enter()
            .append('line')
            .attr('class', 'grid-line-y')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => yScale(d))
            .attr('y2', d => yScale(d))
            .style('stroke', '{style["gridColor"]}')
            .style('stroke-width', {style["strokeWidth"] / 2})
            .style('stroke-dasharray', '{6 * self.QUALITY_MULTIPLIER},{6 * self.QUALITY_MULTIPLIER}')
            .style('vector-effect', 'non-scaling-stroke');
        
        chart.selectAll('.grid-line-x')
            .data(xScale.ticks(6))
            .enter()
            .append('line')
            .attr('class', 'grid-line-x')
            .attr('x1', d => xScale(d))
            .attr('x2', d => xScale(d))
            .attr('y1', 0)
            .attr('y2', chartHeight)
            .style('stroke', '{style["gridColor"]}')
            .style('stroke-width', {style["strokeWidth"] / 2})
            .style('stroke-dasharray', '{6 * self.QUALITY_MULTIPLIER},{6 * self.QUALITY_MULTIPLIER}')
            .style('vector-effect', 'non-scaling-stroke');
        
        // High-quality gradient
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'lineGradientMaxQuality')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', chartWidth).attr('y2', 0);
            
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '{style["primaryColor"]}');
            
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '{style["secondaryColor"]}');
        
        // Ultra-high quality line generator
        const line = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
            .curve(d3.curveCardinal.tension(0.3));
        
        // Create ultra-sharp line
        const path = chart.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'url(#lineGradientMaxQuality)')
            .attr('stroke-width', {6 * self.QUALITY_MULTIPLIER})
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('d', line)
            .style('filter', 'drop-shadow(0 0 {style["shadowBlur"]}px rgba(1, 196, 200, {style["glowIntensity"]}))')
            .style('vector-effect', 'non-scaling-stroke')
            .style('opacity', 0);
        
        // Smooth line animation
        const totalLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', totalLength + ' ' + totalLength)
            .attr('stroke-dashoffset', totalLength)
            .style('opacity', 1)
            .transition()
            .duration(2500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);
        
        // Ultra-high quality data points
        const dots = chart.selectAll('.dot')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 0)
            .attr('fill', '{style["primaryColor"]}')
            .attr('stroke', '{style["textColor"]}')
            .attr('stroke-width', {style["strokeWidth"]})
            .style('filter', 'drop-shadow(0 0 {style["shadowBlur"]}px rgba(1, 196, 200, {style["glowIntensity"] * 1.2}))')
            .style('vector-effect', 'non-scaling-stroke');
        
        // Animate data points
        dots.transition()
            .duration(800)
            .delay((d, i) => i * 200 + 1500)
            .ease(d3.easeBounceOut)
            .attr('r', {8 * self.QUALITY_MULTIPLIER});
        
        // Ultra-high quality axes
        const xAxis = d3.axisBottom(xScale)
            .tickSizeOuter(0)
            .tickPadding({15 * self.QUALITY_MULTIPLIER});
            
        const yAxis = d3.axisLeft(yScale)
            .tickSizeOuter(0)
            .tickPadding({15 * self.QUALITY_MULTIPLIER});
        
        const xAxisGroup = chart.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${{chartHeight}})`)
            .call(xAxis);
            
        const yAxisGroup = chart.append('g')
            .attr('class', 'axis')
            .call(yAxis);
        
        // Enhance axis text
        svg.selectAll('.axis text')
            .style('font-size', '{style["fontSize"]}')
            .style('font-weight', '{style["fontWeight"]}')
            .style('font-family', '{style["fontFamily"]}');
        """
    
    # Placeholder implementations for other chart types
    def _generate_max_quality_scatter_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        return self._generate_max_quality_line_chart(data, style, width, height).replace("line", "scatter")
    
    def _generate_max_quality_network_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        return f"// Ultra-high quality network chart implementation"
    
    def _generate_max_quality_treemap_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        return f"// Ultra-high quality treemap chart implementation"
    
    def _generate_max_quality_sankey_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        return f"// Ultra-high quality Sankey diagram implementation"
    
    def _generate_max_quality_heatmap_chart(self, data: Dict[str, Any], style: Dict[str, Any], width: int, height: int) -> str:
        return f"// Ultra-high quality heatmap chart implementation"
    
    async def _capture_with_max_quality_playwright(self, html_content: str, width: int, height: int) -> bytes:
        """Capture at maximum quality with ultra-sharp text rendering."""
        
        async with async_playwright() as p:
            # Launch with maximum quality settings
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--force-device-scale-factor=3',  # Maximum device scaling
                    '--high-dpi-support=1',
                    '--force-color-profile=srgb',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-background-timer-throttling',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--disable-gpu-sandbox',
                    '--enable-gpu-rasterization',
                    '--enable-zero-copy'
                ]
            )
            
            try:
                page = await browser.new_page(
                    device_scale_factor=self.DEVICE_SCALE_FACTOR,
                    viewport={'width': width, 'height': height}
                )
                
                # Inject maximum quality CSS
                await page.add_style_tag(content=f"""
                    * {{
                        -webkit-font-smoothing: antialiased !important;
                        -moz-osx-font-smoothing: grayscale !important;
                        text-rendering: geometricPrecision !important;
                        font-feature-settings: "liga", "kern" !important;
                        image-rendering: -webkit-optimize-contrast !important;
                        image-rendering: crisp-edges !important;
                        shape-rendering: geometricPrecision !important;
                        vector-effect: non-scaling-stroke !important;
                    }}
                """)
                
                # Create temporary HTML file
                with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
                    f.write(html_content)
                    temp_file = f.name
                
                try:
                    # Load content
                    await page.goto(f"file://{temp_file}")
                    
                    # Wait for fonts to load
                    await page.evaluate("document.fonts.ready")
                    
                    # Wait for D3.js animations with intelligent detection
                    await page.wait_for_timeout(1000)  # Initial load
                    
                    # Check if animations are complete
                    try:
                        await page.wait_for_function(
                            "document.querySelectorAll('*').length > 0 && "
                            "!document.querySelector('.bar[height=\"0\"]') && "
                            "!document.querySelector('.slice path[d*=\"0,0\"]')",
                            timeout=8000
                        )
                    except:
                        # Fallback to fixed wait if detection fails
                        await page.wait_for_timeout(4000)
                    
                    # Additional wait for final render
                    await page.wait_for_timeout(2000)
                    
                    # Capture with maximum quality settings
                    screenshot_bytes = await page.screenshot(
                        type='png',
                        omit_background=True,
                        full_page=False,
                        clip={'x': 0, 'y': 0, 'width': width, 'height': height},
                        animations='disabled'  # Ensure static capture
                    )
                    
                    return screenshot_bytes
                    
                finally:
                    os.unlink(temp_file)
                    
            finally:
                await browser.close()

# Convenience function for max quality generation
async def create_max_quality_d3_infographic(
    data: Dict[str, Any],
    chart_type: str,
    title: str,
    style_config: Optional[Dict[str, Any]] = None,
    base_width: int = 1200,
    base_height: int = 800
) -> Tuple[str, bytes]:
    """
    Create an ultra-high quality D3.js infographic with crystal-clear text.
    
    Args:
        data: Data to visualize
        chart_type: Type of chart (bar, line, pie, etc.)
        title: Chart title
        style_config: Custom styling configuration
        base_width: Base width (will be scaled up)
        base_height: Base height (will be scaled up)
        
    Returns:
        Tuple of (html_content, image_bytes)
    """
    generator = MaxQualityD3InfographicGenerator()
    return await generator.generate_infographic(data, chart_type, title, style_config, base_width, base_height)