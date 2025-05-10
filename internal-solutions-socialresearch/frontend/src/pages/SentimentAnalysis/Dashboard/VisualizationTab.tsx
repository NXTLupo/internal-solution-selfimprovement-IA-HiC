import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { Category } from '../../../types/analysis';
import { SummaryVisualization } from './SummaryVisualization';
import { processWordCloudData, WordCloudWord } from './Visualization/wordCloudUtils';

// Types

interface LayoutWord {
  text: string;
  size: number; // This is the scaled font size
  sentiment: 'positive' | 'negative';
  value: number; // Original frequency * 10
  x?: number;
  y?: number;
  rotate?: number;
}

type ChartData = {
  category: string;
  positive: number;
  negative: number;
};

type StackedBarData = {
  category: string;
  positive: number;
  negative: number;
  total: number;
  positivePercentage: number;
  negativePercentage: number;
};

// Helper function to wrap text - moved outside component to be reusable
function wrap(text: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>, width: number) {
  text.each(function() {
    const text = d3.select(this);
    const words = text.text().split(/\s+|&/);
    const lineHeight = 1.1;
    const y = text.attr("y");
    const x = text.attr("x");
    const dy = parseFloat(text.attr("dy") || "0");
    
    text.text(null);
    
    let tspan = text.append("tspan")
      .attr("x", x)
      .attr("y", y)
      .attr("dy", dy + "em");
    
    let line: string[] = [];
    let lineNumber = 0;
    
    words.forEach((word) => {
      line.push(word);
      tspan.text(line.join(" "));
      
      const computedLength = tspan.node()?.getComputedTextLength() || 0;
      
      if (computedLength > width && line.length > 1) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    });
  });
}

// Constants for chart configuration
const chartConfig = {
  wordCloud: {
    defaultWidth: 800,
    defaultHeight: 400
  },
  categoryComparison: {
    width: 800,
    height: 400,
    margin: { top: 20, right: 30, bottom: 30, left: 220 }
  },
  stackedBar: {
    width: 800,
    height: 400,
    margin: { top: 20, right: 120, bottom: 60, left: 220 }
  }
};

// WordCloud Component
export const WordCloud = ({ words, width = chartConfig.wordCloud.defaultWidth, height = chartConfig.wordCloud.defaultHeight }: { words: WordCloudWord[], width?: number, height?: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [containerDimensions, setContainerDimensions] = useState({ width, height });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: Math.max(300, width),
          height: Math.max(300, height)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Filter words based on selected sentiment
  const filteredWords = useMemo(() => {
    if (filter === 'all') return words;
    return words.filter(word => word.sentiment === filter);
  }, [words, filter]);

  // Create word cloud
  useEffect(() => {
    if (!svgRef.current || !filteredWords.length) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const { width, height } = containerDimensions;
    
    // Scale word sizes based on frequency for better visual differentiation
    const fontScale = d3.scaleLog()
      .domain([
        Math.max(1, d3.min(filteredWords, d => d.value) || 1),
        Math.max(2, d3.max(filteredWords, d => d.value) || 2)
      ])
      .range([14, 60]); // Min and max font sizes
    
    const layout = cloud()
      .size([width, height])
      .words(filteredWords.map(w => ({ 
        text: w.text, 
        size: fontScale(w.value),
        sentiment: w.sentiment,
        value: w.value // Keep original value for tooltip
      })))
      .padding(3)
      .rotate(() => 0) // Set rotation to 0 for horizontal words
      .spiral("archimedean") // Use archimedean spiral for better word placement
      .fontSize(d => d.size!)
      .random(() => 0.5) // Consistent layout
      .on("end", draw);

    layout.start();

    function draw(words: LayoutWord[]) {
      const svg = d3.select(svgRef.current)
        .attr("width", width)
        .attr("height", height);

      // Add gradient definitions for cool effect
      const defs = svg.append("defs");
      
      // Add gradients for positive and negative
      const positiveGradient = defs.append("linearGradient")
        .attr("id", "positiveGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      
      positiveGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#4ade80")
        .attr("stop-opacity", 0.7);
      
      positiveGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#10b981")
        .attr("stop-opacity", 1);
      
      const negativeGradient = defs.append("linearGradient")
        .attr("id", "negativeGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      
      negativeGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#f87171")
        .attr("stop-opacity", 0.7);
      
      negativeGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#ef4444")
        .attr("stop-opacity", 1);

      // Add background rectangle for better appearance (optional)
      svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent");

      const g = svg.append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

      // Add words with transitions
      g.selectAll("text")
        .data(words)
        .enter().append("text")
        .style("font-size", "0px") // Start with 0 size for animation
        .style("font-family", "'Inter', system-ui, sans-serif") 
        .style("font-weight", d => d.size > 30 ? "bold" : d.size > 20 ? "semibold" : "normal")
        .style("fill", d => d.sentiment === 'positive' ? "url(#positiveGradient)" : "url(#negativeGradient)")
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text)
        .style("cursor", "pointer")
        .style("opacity", 0) // Start with opacity 0
        .transition() // Add transition effect
        .duration(1000)
        .delay((_, i) => i * 10) // Stagger animation
        .style("opacity", d => Math.min(1, Math.max(0.4, d.size / 40))) // Higher frequency words are more opaque
        .style("font-size", d => `${d.size}px`)
        .on("end", function() {
          // Add event listeners after transition completes
          d3.select(this)
            .on("mouseover", function(event: MouseEvent, d: unknown) {
              const wordData = d as LayoutWord;
              d3.select(this)
                .transition()
                .duration(200)
                .style("filter", "drop-shadow(0px 0px 4px rgba(255,255,255,0.3))")
                .style("opacity", 1);
                
              // Create tooltip
              const tooltip = d3.select("body").append("div")
                .attr("class", "word-cloud-tooltip")
                .style("position", "absolute")
                .style("background-color", "rgba(0,0,0,0.9)")
                .style("color", "#fff")
                .style("padding", "12px")
                .style("border-radius", "6px")
                .style("font-size", "14px")
                .style("pointer-events", "none")
                .style("z-index", "1000")
                .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.3)")
                .style("border", `1px solid ${wordData.sentiment === 'positive' ? '#4ade80' : '#f87171'}`)
                .html(`
                  <div>
                    <div style="color: ${wordData.sentiment === 'positive' ? '#4ade80' : '#f87171'}; font-weight: bold; margin-bottom: 4px;">${wordData.text}</div>
                    <div style="color: #9ca3af; display: flex; justify-content: space-between;">
                      <span>Mentions:</span> <span style="font-weight: bold;">${Math.round(wordData.value/10)}</span>
                    </div>
                    <div style="color: #9ca3af; display: flex; justify-content: space-between;">
                      <span>Sentiment:</span> <span style="color: ${wordData.sentiment === 'positive' ? '#4ade80' : '#f87171'}">${wordData.sentiment}</span>
                    </div>
                  </div>
                `);

              const tooltipNode = tooltip.node();
              if (tooltipNode) {
                const { width: tooltipWidth, height: tooltipHeight } = tooltipNode.getBoundingClientRect();
                tooltip
                  .style("left", `${event.pageX - tooltipWidth/2}px`)
                  .style("top", `${event.pageY - tooltipHeight - 10}px`);
              }
            })
            .on("mouseout", function(event: MouseEvent, d: unknown) {
              const wordData = d as LayoutWord;
              d3.select(this)
                .transition()
                .duration(200)
                .style("filter", null)
                .style("opacity", Math.min(1, Math.max(0.4, wordData.size / 40)));
              d3.selectAll(".word-cloud-tooltip").remove();
            })
            .on("click", function(event: MouseEvent, d: unknown) {
              const wordData = d as LayoutWord;
              // Highlight related words or do other interactions
              console.log("Clicked word:", wordData.text);
            });
        });
    }
  }, [filteredWords, containerDimensions]);

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <div className="flex justify-end gap-2 mb-4">
        <button 
          onClick={() => setFilter('all')} 
          className={`px-3 py-1 rounded-md text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          All
        </button>
        <button 
          onClick={() => setFilter('positive')} 
          className={`px-3 py-1 rounded-md text-sm ${filter === 'positive' ? 'bg-green-600 text-white' : 'bg-gray-700 text-green-400 hover:bg-gray-600'}`}
        >
          Positive
        </button>
        <button 
          onClick={() => setFilter('negative')} 
          className={`px-3 py-1 rounded-md text-sm ${filter === 'negative' ? 'bg-red-600 text-white' : 'bg-gray-700 text-red-400 hover:bg-gray-600'}`}
        >
          Negative
        </button>
      </div>
      
      <div className="relative flex-grow">
        <svg ref={svgRef} className="w-full h-full" />
        
        {filteredWords.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No words found with the selected filter
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Hover over words to see details. Size indicates frequency.
      </div>
    </div>
  );
};

// CategoryComparison Component
export const CategoryComparison = ({ data }: { data: { positive: Category[]; negative: Category[] } }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height, margin } = chartConfig.categoryComparison;

  useEffect(() => {
    if (!svgRef.current) return;

    const chartData: ChartData[] = [];
    const categories = new Set<string>();

    // Collect all unique categories
    [...data.positive, ...data.negative].forEach(cat => {
      categories.add(cat.category);
    });

    // Process data for chart
    categories.forEach(category => {
      const positivePoints = data.positive.find(c => c.category === category)?.points || [];
      const negativePoints = data.negative.find(c => c.category === category)?.points || [];

      chartData.push({
        category,
        positive: positivePoints.reduce((sum, p) => sum + p.frequency, 0),
        negative: negativePoints.reduce((sum, p) => sum + p.frequency, 0)
      });
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const x = d3.scaleBand()
      .range([margin.left, width - margin.right])
      .domain(chartData.map(d => d.category))
      .padding(0.3);

    const y = d3.scaleLinear()
      .range([height - margin.bottom, margin.top])
      .domain([0, d3.max(chartData, d => Math.max(d.positive, d.negative)) || 0]);

    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .style("fill", "#9ca3af");

    // Add Y axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.15em")
      .style("fill", "#9ca3af")
      .style("font-size", "12px")
      .call(wrap, margin.left - 20);

    // Add bars
    const barWidth = x.bandwidth() / 2;

    // Positive bars
    svg.selectAll(".positive-bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "positive-bar")
      .attr("x", d => (x(d.category) || 0))
      .attr("y", d => y(d.positive))
      .attr("width", barWidth)
      .attr("height", d => height - margin.bottom - y(d.positive))
      .attr("fill", "#4ade80")
      .style("opacity", 0.7)
      .on("mouseover", function() {
        d3.select(this).style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 0.7);
      });

    // Negative bars
    svg.selectAll(".negative-bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "negative-bar")
      .attr("x", d => (x(d.category) || 0) + barWidth)
      .attr("y", d => y(d.negative))
      .attr("width", barWidth)
      .attr("height", d => height - margin.bottom - y(d.negative))
      .attr("fill", "#f87171")
      .style("opacity", 0.7)
      .on("mouseover", function() {
        d3.select(this).style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).style("opacity", 0.7);
      });

  }, [data, margin.left, margin.right, margin.top, margin.bottom, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
};

// StackedBarChart Component
export const StackedBarChart = ({ data }: { data: { positive: Category[]; negative: Category[] } }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height, margin } = chartConfig.stackedBar;

  useEffect(() => {
    if (!svgRef.current) return;

    // Process data for stacked chart
    const categories = new Set<string>();
    [...data.positive, ...data.negative].forEach(cat => categories.add(cat.category));

    const stackedData: StackedBarData[] = Array.from(categories).map(category => {
      const positiveCount = data.positive
        .find(c => c.category === category)?.points
        .reduce((sum, p) => sum + p.frequency, 0) || 0;
      const negativeCount = data.negative
        .find(c => c.category === category)?.points
        .reduce((sum, p) => sum + p.frequency, 0) || 0;
      const total = positiveCount + negativeCount;

      return {
        category,
        positive: positiveCount,
        negative: negativeCount,
        total,
        positivePercentage: (positiveCount / total) * 100,
        negativePercentage: (negativeCount / total) * 100
      };
    }).sort((a, b) => b.total - a.total);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const x = d3.scaleLinear()
      .domain([0, 100])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleBand()
      .domain(stackedData.map(d => d.category))
      .range([margin.top, height - margin.bottom])
      .padding(0.3);

    // Add Y axis with longer category names
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("fill", "#9ca3af")
      .style("font-size", "12px")
      .call(wrap, margin.left - 10);

    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}%`))
      .selectAll("text")
      .style("fill", "#9ca3af");

    // Add bars
    const barGroups = svg.selectAll<SVGGElement, StackedBarData>(".bar-group")
      .data(stackedData)
      .enter()
      .append("g")
      .attr("class", "bar-group");

    // Positive bars
    barGroups.append("rect")
      .attr("class", "positive-bar")
      .attr("x", margin.left)
      .attr("y", d => y(d.category) || 0)
      .attr("width", d => (x(d.positivePercentage) - margin.left))
      .attr("height", y.bandwidth())
      .attr("fill", "#4ade80")
      .style("opacity", 0.7)
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 1);
        showTooltip(event, `Positive: ${d.positive} (${d.positivePercentage.toFixed(1)}%)`, true);
      })
      .on("mouseout", hideTooltip);

    // Negative bars
    barGroups.append("rect")
      .attr("class", "negative-bar")
      .attr("x", d => x(d.positivePercentage))
      .attr("y", d => y(d.category) || 0)
      .attr("width", d => x(d.negativePercentage) - margin.left)
      .attr("height", y.bandwidth())
      .attr("fill", "#f87171")
      .style("opacity", 0.7)
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 1);
        showTooltip(event, `Negative: ${d.negative} (${d.negativePercentage.toFixed(1)}%)`, false);
      })
      .on("mouseout", hideTooltip);

    // Add total count labels
    barGroups.append("text")
      .attr("x", width - margin.right + 10)
      .attr("y", d => (y(d.category) || 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .style("fill", "#9ca3af")
      .style("font-size", "12px")
      .text(d => `Total: ${d.total}`);

    // Helper functions for tooltips
    function showTooltip(event: MouseEvent, content: string, isPositive: boolean) {
      const tooltip = d3.select("body").append("div")
        .attr("class", "stacked-bar-tooltip")
        .style("position", "absolute")
        .style("background-color", "rgba(0,0,0,0.9)")
        .style("color", "#fff")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .html(`
          <div>
            <div class="${isPositive ? 'text-green-400' : 'text-red-400'}">${content}</div>
          </div>
        `);
      tooltip
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 10}px`);
    }

    function hideTooltip(this: d3.BaseType) {
      d3.select(this).style("opacity", 0.7);
      d3.selectAll(".stacked-bar-tooltip").remove();
    }

  }, [data, margin.left, margin.right, margin.top, margin.bottom, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
};

interface VisualizationTabProps {
  analysisData: {
    positive: Category[];
    negative: Category[];
  };
  filteredData?: {
    positive: Category[];
    negative: Category[];
  };
}

export const VisualizationTab = ({ analysisData, filteredData }: VisualizationTabProps) => {
  return (
    <div className="space-y-8">
      <SummaryVisualization 
        analysisData={analysisData} 
        filteredData={filteredData}
      />
      
      <div className="bg-gray-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-blue-400">Interactive Word Cloud</h3>
          <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
            Interactive
          </div>
        </div>
        <div className="h-[400px]">
          <WordCloud 
            words={processWordCloudData(analysisData)}
            width={800}
            height={400}
          />
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-blue-400">Sentiment Distribution by Category</h3>
          <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
            Beta
          </div>
        </div>
        <StackedBarChart data={analysisData} />
      </div>

      <div className="bg-gray-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-blue-400">Category Comparison</h3>
          <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
            Beta
          </div>
        </div>
        <CategoryComparison data={analysisData} />
      </div>
    </div>
  );
}; 