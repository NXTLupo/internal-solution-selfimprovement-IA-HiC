import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Network, ThumbsUp, ThumbsDown, Tag, Info, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Topic } from '../../../types/TopicModeling';

interface TopicSimilarity {
  source: number;
  target: number;
  weight: number;
}

// Enhanced Theme Mindmap component that visualizes themes as connected networks with filtering capabilities
const ThemeMindmap = ({ 
  topics = [], 
  topicSimilarities = [],
  onTopicSelect 
}: { 
  topics: Topic[],
  topicSimilarities?: TopicSimilarity[],
  onTopicSelect: (topic: Topic) => void 
}) => {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedSentiment, setSelectedSentiment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [minMentions, setMinMentions] = useState(0);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [linkThicknessMultiplier, setLinkThicknessMultiplier] = useState(3);

  // Add detailed logging of topic similarities
  console.log("Raw topicSimilarities:", topicSimilarities);

  console.log("topics", topics);
  // Filter topics based on search term, sentiment, and minimum mentions
  const filteredTopics = topics.filter(topic => {
    // Check if it matches search term
    const matchesTerm = !searchTerm || 
      topic.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (topic.related_terms && topic.related_terms.some((term: string) => 
        term.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    
    // Check if it meets minimum mentions
    const meetsMinMentions = topic.count >= minMentions;
    
    // Check if it matches selected sentiment
    const matchesSentiment = selectedSentiment === 'all' || topic.sentiment === selectedSentiment;
    
    return matchesTerm && meetsMinMentions && matchesSentiment;
  });

  // Update dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      const svgElement = svgRef.current as SVGSVGElement | null;
      const containerWidth = svgElement?.parentElement?.clientWidth || 800;
      setDimensions({
        width: containerWidth,
        height: Math.max(600, containerWidth * 0.6)
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle topic selection or sentiment change
  const handleAction = useCallback((action: Topic | { action: string; sentiment: string }) => {
    if ('action' in action && action.action === 'changeSentiment') {
      setSelectedSentiment(action.sentiment);
    } else {
      onTopicSelect(action as Topic);
    }
  }, [onTopicSelect, setSelectedSentiment]);
  
  // Calculate theme statistics
  const themeStats = {
    total: topics.length,
    positive: topics.filter(t => t.sentiment === 'positive').length,
    neutral: topics.filter(t => t.sentiment === 'neutral').length,
    negative: topics.filter(t => t.sentiment === 'negative').length,
    filtered: filteredTopics.length
  };
  
  // Calculate max mentions for scaling
  const maxMentions = Math.max(...topics.map(t => t.count), 1);

  // Get sentiment tab style
  const getSentimentTabStyle = (sentiment: string) => {
    return `px-3 py-2 text-sm font-medium flex items-center ${
      selectedSentiment === sentiment
        ? 'text-[#141414] border-b-2 border-blue-500'
        : 'text-[#525252] hover:text-[#141414] hover:border-b-2 hover:border-[#e5e5e5]'
    }`;
  };

  // Create the mindmap visualization
  useEffect(() => {
    if (!svgRef.current || filteredTopics.length === 0) return;

    // Clear previous svg content
    d3.select(svgRef.current).selectAll("*").remove();

    // Prepare data for visualization
    const nodes = filteredTopics.map((topic, i) => ({
      id: topic.id || i,
      name: topic.topic,
      count: topic.count,
      score: topic.score,
      sentiment: topic.sentiment,
      relatedTerms: topic.related_terms || [],
      originalData: topic,
      // Add x and y properties to satisfy TypeScript
      x: 0,
      y: 0
    }));

    console.log("Nodes created:", nodes.map(n => ({ id: n.id, name: n.name })));

    // Create a map of topic IDs to array indices
    const topicIdToIndex: Record<number | string, number> = {};
    nodes.forEach((node, index) => {
      topicIdToIndex[node.id] = index;
    });
    
    console.log("Topic ID to index mapping:", topicIdToIndex);

    // Create links between nodes based on topic similarities from backend
    const links: Array<{
      source: number;
      target: number;
      strength: number;
    }> = [];
    
    console.log("Starting to process similarities, threshold:", similarityThreshold);
    
    // Use backend-provided topic similarities
    if (topicSimilarities && topicSimilarities.length > 0) {
      topicSimilarities.forEach(similarity => {
        if (topicIdToIndex[similarity.source] !== undefined && 
            topicIdToIndex[similarity.target] !== undefined && 
            similarity.weight >= similarityThreshold) {
          
          const sourceIndex = topicIdToIndex[similarity.source];
          const targetIndex = topicIdToIndex[similarity.target];
          
          console.log(`  Adding link: source=${sourceIndex}, target=${targetIndex}, strength=${similarity.weight}`);
          
          links.push({
            source: sourceIndex,
            target: targetIndex,
            strength: similarity.weight
          });
        }
      });
    }
    
    console.log("Final links array:", links);

    // Check if we have any nodes to display
    if (nodes.length === 0) {
      // Display a message when no nodes are available
      d3.select(svgRef.current)
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)
        .append("text")
        .attr("x", dimensions.width / 2)
        .attr("y", dimensions.height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text("No themes match the current filters");
      return;
    }

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("viewBox", [0, 0, dimensions.width, dimensions.height]);

    // Define color scheme based on sentiment
    const getSentimentColor = (sentiment: string) => {
      switch (sentiment) {
        case 'positive': return '#10b981'; // green
        case 'negative': return '#ef4444'; // red
        default: return '#3b82f6'; // blue
      }
    };

    // Create a gradient defs
    const defs = svg.append("defs");
    
    // Add a gradient for each sentiment
    const sentiments = ['positive', 'neutral', 'negative'];
    sentiments.forEach(sent => {
      const gradient = defs.append("radialGradient")
        .attr("id", `node-gradient-${sent}`)
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");
      
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", `${getSentimentColor(sent)}`)
        .attr("stop-opacity", 0.8);
      
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", `${getSentimentColor(sent)}`)
        .attr("stop-opacity", 0.3);
    });

    // Create a zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    // Apply zoom to svg
    // @ts-expect-error: D3 typing issue - svg.call expects a specific function signature
    svg.call(zoom);

    // Create a container group for all elements
    const g = svg.append("g");

    // Define node type for simulation
    interface SimNode extends d3.SimulationNodeDatum {
      id: number | string;
      name: string;
      count: number;
      score: number;
      sentiment: string;
      relatedTerms: string[];
      originalData: Topic;
      x: number;
      y: number;
      fx?: number | null;
      fy?: number | null;
      vx?: number;
      vy?: number;
      index?: number;
    }

    interface SimLink {
      source: SimNode;
      target: SimNode;
      strength: number;
    }

    // Create a simulation with forces
    const simulation = d3.forceSimulation<SimNode>(nodes as SimNode[])
      .force("link", d3.forceLink<SimNode, SimLink>(links as unknown as SimLink[])
        .id((_d, i) => i)
        .strength(d => {
          if (!d || typeof d.strength === 'undefined') return 0.1;
          return d.strength;
        }))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2).strength(0.1))
      .force("collision", d3.forceCollide().radius(function(d) {
        return Math.sqrt((d as SimNode).count) * 6 + 55;
      }))
      // Add a boundary force to keep nodes within the visible area
      .force("x", d3.forceX(dimensions.width / 2).strength(0.05))
      .force("y", d3.forceY(dimensions.height / 2).strength(0.05));

    // Create a drag behavior
    const drag = (simulation: d3.Simulation<SimNode, undefined>) => {
      function dragstarted(event: d3.D3DragEvent<Element, SimNode, SimNode>) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: d3.D3DragEvent<Element, SimNode, SimNode>) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: d3.D3DragEvent<Element, SimNode, SimNode>) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag<Element, SimNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    };

    // Create links
    const link = g.append("g")
      .attr("stroke", "#374151")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => {
        // Apply a non-linear (exponential) scaling to emphasize differences
        const scaledStrength = Math.pow(d.strength, 1) * linkThicknessMultiplier * 5;
        return Math.max(1, scaledStrength);
      })
      .attr("stroke", d => {
        if (d.strength > 0.7) return "#f59e0b";
        if (d.strength > 0.5) return "#60a5fa";
        return "#374151";
      })
      .attr("stroke-opacity", d => 0.3 + (d.strength * 0.7));

    // Create node containers
    const node = g.append("g")
      .attr("class", "node")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      // @ts-expect-error: D3 typing issue - call expects a specific function signature
      .call(drag(simulation))
      .on("click", (event, d) => {
        event.stopPropagation();
        console.log("Node clicked:", d);
        handleAction(d.originalData);
      });

    // Add circles to nodes with sentiment color
    node.append("circle")
      .attr("r", d => Math.sqrt(Math.pow(d.count, 1.5)) * 3 + 15)
      .attr("fill", d => `url(#node-gradient-${d.sentiment})`)
      .attr("stroke", d => getSentimentColor(d.sentiment))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.8)
      .style("pointer-events", "all"); // Ensure clicks are detected

    // Add invisible larger circle for better click detection
    node.append("circle")
      .attr("r", d => Math.sqrt(Math.pow(d.count, 1.5)) * 3 + 20)
      .attr("fill", "transparent")
      .style("pointer-events", "all"); // Ensure clicks are detected

    // Add topic labels
    node.append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-weight", "bold")
      .style("font-size", "12px")
      .style("pointer-events", "none") // Don't block clicks on the node
      .style("user-select", "none")
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.7)")
      .text(d => {
        // Use short_summary if available, otherwise fall back to name
        const displayText = d.originalData.short_summary || d.name;
        const words = displayText.split(/\s+/);
        if (words.length <= 3) return displayText;
        return words.slice(0, 3).join(" ") + "...";
      });

    // Add count labels
    node.append("text")
      .attr("dy", "1.3em")
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-size", "10px")
      .style("pointer-events", "none") // Don't block clicks on the node
      .style("user-select", "none")
      .style("opacity", 0.9)
      .text(d => `${d.count} mentions`);

    // Update positions on each tick of the simulation
    simulation.on("tick", () => {
      link
        .attr("x1", d => {
          const source = d.source as unknown as SimNode;
          return source.x || 0;
        })
        .attr("y1", d => {
          const source = d.source as unknown as SimNode;
          return source.y || 0;
        })
        .attr("x2", d => {
          const target = d.target as unknown as SimNode;
          return target.x || 0;
        })
        .attr("y2", d => {
          const target = d.target as unknown as SimNode;
          return target.y || 0;
        });

      node.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Add click handler to clear selection when clicking on background
    svg.on("click", () => {
      // Background click handler can be used for future functionality
    });

  }, [filteredTopics, dimensions, topicSimilarities, similarityThreshold, linkThicknessMultiplier, handleAction]);

  return (
    <div className="text-[#141414] bg-[#fafafa] p-4 rounded-lg border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <Network className="h-5 w-5 mr-2 text-blue-400" />
          Theme Mindmap Analysis
        </h2>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#525252]" />
            </div>
            <input
              type="text"
              placeholder="Search themes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#fafafa] border border-[#e5e5e5] text-[#141414] rounded-md py-1 pl-9 pr-3 w-48 focus:outline-none focus:ring-1 focus:ring-[#115054] text-sm"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-[#fafafa] border border-[#e5e5e5] text-[#141414] rounded-md py-1 px-3 flex items-center hover:bg-[#f5f5f5] transition-colors text-sm"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {showFilters ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </button>
        </div>
      </div>
      
      {/* Theme Statistics */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <div className="bg-[#fafafa] p-2 rounded-lg text-center border border-[#e5e5e5]">
          <div className="text-2xl font-bold text-[#141414]">{themeStats.total}</div>
          <div className="text-xs text-[#525252]">Total Themes</div>
        </div>
        <div className="bg-[#fafafa] p-2 rounded-lg text-center border-l-4 border border-[#e5e5e5] border-l-green-500">
          <div className="text-2xl font-bold text-[#141414]">{themeStats.positive}</div>
          <div className="text-xs text-[#525252]">Positive</div>
        </div>
        <div className="bg-[#fafafa] p-2 rounded-lg text-center border-l-4 border border-[#e5e5e5] border-l-blue-500">
          <div className="text-2xl font-bold text-[#141414]">{themeStats.neutral}</div>
          <div className="text-xs text-[#525252]">Neutral</div>
        </div>
        <div className="bg-[#fafafa] p-2 rounded-lg text-center border-l-4 border border-[#e5e5e5] border-l-red-500">
          <div className="text-2xl font-bold text-[#141414]">{themeStats.negative}</div>
          <div className="text-xs text-[#525252]">Negative</div>
        </div>
        <div className="bg-[#fafafa] p-2 rounded-lg text-center border border-[#e5e5e5]">
          <div className="text-2xl font-bold text-[#141414]">{themeStats.filtered}</div>
          <div className="text-xs text-[#525252]">Filtered</div>
        </div>
      </div>
      
      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-[#fafafa] p-2 rounded-lg border border-[#e5e5e5] mb-2 animate-slideUp">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[#525252] mb-1 text-xs">Minimum Mentions</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="0"
                  max={Math.max(20, maxMentions / 2)}
                  value={minMentions}
                  onChange={(e) => setMinMentions(parseInt(e.target.value))}
                  className="w-full mr-1"
                />
                <span className="text-[#525252] text-xs min-w-[1.5rem] text-right">{minMentions}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-[#525252] mb-1 text-xs">Similarity Threshold</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                  className="w-full mr-1"
                />
                <span className="text-[#525252] text-xs min-w-[1.5rem] text-right">{similarityThreshold.toFixed(2)}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-[#525252] mb-1 text-xs">Link Thickness</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={linkThicknessMultiplier}
                  onChange={(e) => setLinkThicknessMultiplier(parseInt(e.target.value))}
                  className="w-full mr-1"
                />
                <span className="text-[#525252] text-xs min-w-[1.5rem] text-right">{linkThicknessMultiplier}×</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-2">
            <button
              onClick={() => {
                setMinMentions(0);
                setSearchTerm('');
                setSelectedSentiment('all');
                setSimilarityThreshold(0.25);
                setLinkThicknessMultiplier(5);
              }}
              className="px-2 py-0.5 bg-[#f5f5f5] text-[#525252] rounded-md text-xs hover:bg-[#e5e5e5] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
      
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold text-[#141414] flex items-center">
            <Network className="w-4 h-4 mr-2 text-blue-400" />
            Visualization
          </h3>
          
          <div className="flex items-center gap-1 text-xs">
            <Info className="w-3 h-3 text-[#525252]" />
            <span className="text-[#525252]">
              Related themes are connected. Click on a theme for details.
            </span>
          </div>
        </div>
      
        {/* Sentiment Tabs */}
        <div className="flex border-b border-grey-700 mb-3">
          <button
            className={getSentimentTabStyle('all')}
            onClick={() => setSelectedSentiment('all')}
          >
            <Network className="w-3 h-3 mr-1" />
            All Themes
          </button>
          <button
            className={getSentimentTabStyle('positive')}
            onClick={() => setSelectedSentiment('positive')}
          >
            <ThumbsUp className="w-3 h-3 mr-1" />
            Positive
          </button>
          <button
            className={getSentimentTabStyle('neutral')}
            onClick={() => setSelectedSentiment('neutral')}
          >
            <Tag className="w-3 h-3 mr-1" />
            Neutral
          </button>
          <button
            className={getSentimentTabStyle('negative')}
            onClick={() => setSelectedSentiment('negative')}
          >
            <ThumbsDown className="w-3 h-3 mr-1" />
            Negative
          </button>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs mb-2">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span className="text-[#525252]">Positive themes</span>
          </div>
          <div className="flex items-center ml-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span className="text-[#525252]">Neutral themes</span>
          </div>
          <div className="flex items-center ml-2">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span className="text-[#525252]">Negative themes</span>
          </div>
          <div className="flex items-center ml-2">
            <div className="w-2 h-2 border border-gray-400 mr-1"></div>
            <span className="text-[#525252]">Node size = Mention count</span>
          </div>
          <div className="flex items-center ml-2">
            <div className="h-3 w-6 bg-amber-500 mr-1" style={{ height: "7px", backgroundColor: "#f59e0b" }}></div>
            <span className="text-[#525252]">Strong connection (0.7-1.0)</span>
          </div>
          <div className="flex items-center ml-2">
            <div className="h-3 w-6 bg-blue-400 mr-1" style={{ height: "7px" }}></div>
            <span className="text-[#525252]">Medium connection (0.5-0.7)</span>
          </div>
          <div className="flex items-center ml-2"> 
            <div className="h-3 w-6 bg-gray-500 mr-1" style={{ height: "7px" }}></div>
            <span className="text-[#525252]">Weak connection (0.2-0.5)</span>
          </div>
        </div>
                
        {/* D3 Visualization */}
        <div className="bg-[#fafafa] rounded-lg overflow-hidden border border-[#e5e5e5]">
          {filteredTopics.length > 0 ? (
            <svg 
              ref={svgRef} 
              className="w-full" 
              style={{ minHeight: '400px', background: '#111827' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[#525252]">
              <Network className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg">No themes to display for selected sentiment</p>
              <p className="text-sm mt-2">Try selecting a different sentiment filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeMindmap;