import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Category, Point, SummaryVisualizationProps } from '../../../types/analysis';

export const SummaryVisualization = ({ analysisData, filteredData }: SummaryVisualizationProps) => {
  const sentimentDonutRef = useRef<SVGSVGElement>(null);
  const categoryChartRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Use filtered data if available, otherwise use the original data
  const dataToVisualize = filteredData || analysisData;

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate total frequencies for each sentiment and category
  // Wrap in useCallback to prevent recreation on every render
  const calculateTotals = useCallback(() => {
    const totals = {
      positive: 0,
      negative: 0,
      categories: {} as Record<string, { positive: number, negative: number }>
    };

    // Process positive categories
    if (dataToVisualize?.positive) {
      dataToVisualize.positive.forEach((category: Category) => {
        if (!category.points) return;
        
        const categoryTotal = category.points.reduce((sum: number, point: Point) => sum + (point.frequency || 0), 0);
        totals.positive += categoryTotal;
        
        if (!totals.categories[category.category]) {
          totals.categories[category.category] = { positive: 0, negative: 0 };
        }
        totals.categories[category.category].positive = categoryTotal;
      });
    }
    
    // Process negative categories
    if (dataToVisualize?.negative) {
      dataToVisualize.negative.forEach((category: Category) => {
        if (!category.points) return;
        
        const categoryTotal = category.points.reduce((sum: number, point: Point) => sum + (point.frequency || 0), 0);
        totals.negative += categoryTotal;
        
        if (!totals.categories[category.category]) {
          totals.categories[category.category] = { positive: 0, negative: 0 };
        }
        totals.categories[category.category].negative = categoryTotal;
      });
    }

    return totals;
  }, [dataToVisualize]);

  // Create simple donut chart for sentiment distribution
  useEffect(() => {
    if (!sentimentDonutRef.current || !dataToVisualize || containerWidth === 0) return;
    
    const totals = calculateTotals();
    const data = [
      { name: 'Positive', value: totals.positive, color: '#4ade80' },
      { name: 'Negative', value: totals.negative, color: '#f87171' }
    ];
    
    // Clear previous chart
    d3.select(sentimentDonutRef.current).selectAll("*").remove();
    
    // Simple fixed dimensions
    const width = 220;
    const height = 220;
    const radius = Math.min(width, height) / 2 - 20;
    
    const svg = d3.select(sentimentDonutRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);
    
    // Create donut chart
    const pie = d3.pie<{name: string; value: number; color: string}>()
      .value(d => d.value)
      .sort(null);
    
    const arc = d3.arc<d3.PieArcDatum<{name: string; value: number; color: string}>>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);
    
    // Add arcs
    svg.selectAll("path")
      .data(pie(data))
      .join("path")
      .attr("d", arc)
      .attr("fill", d => d.data.color)
      .attr("stroke", "#1e293b")
      .style("stroke-width", "2px")
      .style("opacity", 0.9);
    
    // Add total in center
    const total = totals.positive + totals.negative;
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .style("font-size", "14px")
      .style("fill", "#e5e7eb")
      .text("Total");
    
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .style("font-size", "18px")
      .style("fill", "#e5e7eb")
      .style("font-weight", "bold")
      .text(total);
    
    // Add percentage labels
    const arcLabel = d3.arc<d3.PieArcDatum<{name: string; value: number; color: string}>>()
      .innerRadius(radius * 0.8)
      .outerRadius(radius * 0.8);
    
    svg.selectAll("text.percentage")
      .data(pie(data))
      .join("text")
      .attr("class", "percentage")
      .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#ffffff")
      .style("font-weight", "bold")
      .text(d => `${Math.round((d.data.value / total) * 100)}%`);
    
    // Add simple legend
    const legend = svg.append("g")
      .attr("transform", `translate(0, ${radius + 30})`);
    
    const legendItems = [
      { label: "Positive", color: "#4ade80", x: -radius/2 - 20 },
      { label: "Negative", color: "#f87171", x: 10 }
    ];
    
    legendItems.forEach(item => {
      const g = legend.append("g")
        .attr("transform", `translate(${item.x}, 0)`);
      
      g.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", item.color);
      
      g.append("text")
        .attr("x", 18)
        .attr("y", 7)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "#e5e7eb")
        .text(item.label);
    });
  }, [dataToVisualize, containerWidth, calculateTotals]);

  // Create simplified category comparison chart
  useEffect(() => {
    if (!categoryChartRef.current || !dataToVisualize || containerWidth === 0) return;
    
    // Process data
    const totals = calculateTotals();
    
    // Create bar chart data
    const categories = Object.entries(totals.categories)
      .map(([name, values]) => ({
        name,
        positive: values.positive || 0,
        negative: values.negative || 0,
        total: (values.positive || 0) + (values.negative || 0)
      }))
      .filter(cat => cat.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6); // Only show top 6 categories
    d3.select(categoryChartRef.current).selectAll("*").remove();
    
    if (categories.length === 0) {
      const svg = d3.select(categoryChartRef.current)
        .attr("width", containerWidth * 0.9)
        .attr("height", 200);
      
      svg.append("text")
        .attr("x", containerWidth * 0.45)
        .attr("y", 100)
        .attr("text-anchor", "middle")
        .style("fill", "#9ca3af")
        .text("No category data available");
      
      return;
    }
    
    // Set up dimensions
    const width = Math.min(800, containerWidth - 40);
    const barHeight = 20;
    const height = categories.length * barHeight * 2 + 80;
    const margin = { top: 30, right: 60, bottom: 50, left: 180 };
    
    // Create SVG
    const svg = d3.select(categoryChartRef.current)
      .attr("width", width)
      .attr("height", height);
    
    // Find maximum value for scale
    const maxValue = Math.max(
      ...categories.map(d => Math.max(d.positive, d.negative))
    );
    
    // Create scales
    const x = d3.scaleLinear()
      .domain([0, maxValue * 1.1])
      .range([margin.left, width - margin.right]);
    
    const y = d3.scaleBand()
      .domain(categories.map(d => d.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.4);
    
    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(x.ticks(5))
      .join("line")
      .attr("x1", d => x(d))
      .attr("x2", d => x(d))
      .attr("y1", margin.top - 5)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "rgba(255, 255, 255, 0.1)")
      .attr("stroke-dasharray", "2,2");
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5))
      .call(g => {
        g.select(".domain").remove();
        g.selectAll(".tick")
          .each(function() {
            const label = d3.select(this).select("text").text();
            if (label === "0") {
              d3.select(this).select("text").remove();
            }
          });
      })
      .selectAll(".tick text")
      .style("fill", "#d1d5db");
    
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call(g => {
        g.select(".domain").remove();
        g.selectAll(".tick")
          .each(function() {
            const label = d3.select(this).select("text").text();
            if (label === "0") {
              d3.select(this).select("text").remove();
            }
          });
      })
      .selectAll(".tick text")
      .style("fill", "#d1d5db")
      .style("font-size", "12px")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/);
        const lineHeight = 1.1;
        const y = text.attr("y");
        
        text.text(null);
        
        let tspan = text.append("tspan")
          .attr("x", -10)
          .attr("y", y)
          .attr("dy", "0");
        
        let line: string[] = [];
        for (const word of words) {
          line.push(word);
          tspan.text(line.join(" "));
          
          if (tspan.node() && tspan.node()!.getComputedTextLength() > margin.left - 20) {
            if (line.length > 1) {
              line.pop();
              tspan.text(line.join(" "));
              line = [word];
            } else {
              line = [];
            }
            
            if (line.length > 0) {
              tspan = text.append("tspan")
                .attr("x", -10)
                .attr("y", y)
                .attr("dy", `${lineHeight}em`)
                .text(line.join(" "));
            }
          }
        }
      });
    
    // Add bars for each category
    categories.forEach(category => {
      // Add background for row
      svg.append("rect")
        .attr("x", margin.left)
        .attr("y", (y(category.name) || 0) - 10)
        .attr("width", width - margin.left - margin.right)
        .attr("height", y.bandwidth() + 20)
        .attr("fill", "rgba(255, 255, 255, 0.03)")
        .attr("rx", 4);
      
      // Add positive bar
      svg.append("rect")
        .attr("x", margin.left)
        .attr("y", (y(category.name) || 0))
        .attr("width", x(category.positive) - margin.left)
        .attr("height", y.bandwidth() / 2 - 2)
        .attr("fill", "#4ade80")
        .attr("rx", 3);
      
      // Add negative bar
      svg.append("rect")
        .attr("x", margin.left)
        .attr("y", (y(category.name) || 0) + y.bandwidth() / 2 + 2)
        .attr("width", x(category.negative) - margin.left)
        .attr("height", y.bandwidth() / 2 - 2)
        .attr("fill", "#f87171")
        .attr("rx", 3);
      
      // Add count labels - only show if value is greater than 0
      if (category.positive > 0) {
        svg.append("text")
          .attr("x", x(category.positive) + 5)
          .attr("y", (y(category.name) || 0) + y.bandwidth() / 4)
          .attr("dy", "0.35em")
          .style("fill", "#4ade80")
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .text(category.positive);
      }
      
      if (category.negative > 0) {
        svg.append("text")
          .attr("x", x(category.negative) + 5)
          .attr("y", (y(category.name) || 0) + y.bandwidth() * 3/4)
          .attr("dy", "0.35em")
          .style("fill", "#f87171")
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .text(category.negative);
      }
    });
    
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${height - 25})`);
    
    // Positive legend
    legend.append("rect")
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", "#4ade80");
    
    legend.append("text")
      .attr("x", 18)
      .attr("y", 7)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("fill", "#e5e7eb")
      .text("Positive");
    
    // Negative legend
    legend.append("rect")
      .attr("x", 100)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", "#f87171");
    
    legend.append("text")
      .attr("x", 118)
      .attr("y", 7)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("fill", "#e5e7eb")
      .text("Negative");
    
  }, [dataToVisualize, containerWidth, calculateTotals]);

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#fafafa] rounded-xl p-6">
          <h3 className="text-lg font-bold text-[#115054] mb-4 text-center">Sentiment Distribution</h3>
          <div className="flex justify-center">
            <svg ref={sentimentDonutRef} />
          </div>
        </div>
        
        <div className="bg-[#fafafa] rounded-xl p-6 md:col-span-2">
          <h3 className="text-lg font-bold text-[#115054] mb-4 text-center">Top Categories Comparison</h3>
          <div className="overflow-x-auto">
            <svg ref={categoryChartRef} className="min-w-[500px]" />
          </div>
        </div>
      </div>
    </div>
  );
}; 