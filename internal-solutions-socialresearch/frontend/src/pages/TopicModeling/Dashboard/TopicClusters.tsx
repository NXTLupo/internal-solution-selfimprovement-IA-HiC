import React, { useState } from 'react';
import { Network, Tag, Filter, Search, ThumbsUp, ThumbsDown } from 'lucide-react';

const TopicClusters = ({ clusters = {}, onSelectTopic }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [expandedClusters, setExpandedClusters] = useState({});

  // Filter clusters based on search term and sentiment
  const getFilteredClusters = () => {
    return Object.entries(clusters).filter(([clusterName, terms]) => {
      // Check if cluster name contains search term
      const nameMatches = searchTerm ? 
        clusterName.toLowerCase().includes(searchTerm.toLowerCase()) : 
        true;
      
      // Check if any terms match search term
      const termsMatch = searchTerm ? 
        terms.some(term => term.toLowerCase().includes(searchTerm.toLowerCase())) : 
        true;
      
      // Check sentiment filter
      const sentimentMatches = filterSentiment === 'all' || 
        (filterSentiment === 'positive' && clusterName.toLowerCase().includes('positive')) ||
        (filterSentiment === 'neutral' && clusterName.toLowerCase().includes('neutral')) ||
        (filterSentiment === 'negative' && clusterName.toLowerCase().includes('negative'));
      
      return (nameMatches || termsMatch) && sentimentMatches;
    });
  };

  const toggleCluster = (clusterName) => {
    setExpandedClusters(prev => ({
      ...prev,
      [clusterName]: !prev[clusterName]
    }));
  };

  const getSentimentStyle = (clusterName) => {
    if (clusterName.toLowerCase().includes('positive')) {
      return {
        borderColor: 'border-green-500',
        bgGradient: 'bg-gradient-to-r from-green-900/20 to-transparent',
        textColor: 'text-green-400'
      };
    } else if (clusterName.toLowerCase().includes('negative')) {
      return {
        borderColor: 'border-red-500',
        bgGradient: 'bg-gradient-to-r from-red-900/20 to-transparent',
        textColor: 'text-red-400'
      };
    } else {
      return {
        borderColor: 'border-blue-500',
        bgGradient: 'bg-gradient-to-r from-blue-900/20 to-transparent',
        textColor: 'text-blue-400'
      };
    }
  };

  const getSentimentBadge = (clusterName) => {
    if (clusterName.toLowerCase().includes('positive')) {
      return (
        <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
          <ThumbsUp className="w-3 h-3 mr-1" />
          Positive
        </span>
      );
    } else if (clusterName.toLowerCase().includes('negative')) {
      return (
        <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400">
          <ThumbsDown className="w-3 h-3 mr-1" />
          Negative
        </span>
      );
    } else {
      return (
        <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400">
          <Tag className="w-3 h-3 mr-1" />
          Neutral
        </span>
      );
    }
  };

  const filteredClusters = getFilteredClusters();

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
        <Network className="w-5 h-5 mr-2 text-blue-400" />
        Topic Clusters
      </h2>

      {/* Filter controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search clusters or terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilterSentiment('all')}
            className={`px-3 py-1.5 rounded-md text-sm ${
              filterSentiment === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterSentiment('positive')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
              filterSentiment === 'positive'
                ? 'bg-green-900/50 text-green-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ThumbsUp className="w-3 h-3 mr-1" />
            Positive
          </button>
          <button
            onClick={() => setFilterSentiment('neutral')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
              filterSentiment === 'neutral'
                ? 'bg-blue-900/50 text-blue-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Tag className="w-3 h-3 mr-1" />
            Neutral
          </button>
          <button
            onClick={() => setFilterSentiment('negative')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
              filterSentiment === 'negative'
                ? 'bg-red-900/50 text-red-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ThumbsDown className="w-3 h-3 mr-1" />
            Negative
          </button>
        </div>
      </div>

      {/* Cluster grid */}
      {filteredClusters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClusters.map(([clusterName, terms]) => {
            const { borderColor, bgGradient, textColor } = getSentimentStyle(clusterName);
            const isExpanded = expandedClusters[clusterName];
            
            // Extract cluster number from name
            const clusterNumber = clusterName.match(/Cluster (\d+)/) 
              ? clusterName.match(/Cluster (\d+)/)[1] 
              : '';
            
            return (
              <div 
                key={clusterName}
                className={`border-l-4 ${borderColor} ${bgGradient} rounded-lg p-4 bg-slate-800 shadow hover:shadow-lg transition-all`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                      #{clusterNumber}
                    </span>
                    {getSentimentBadge(clusterName)}
                  </div>
                  
                  <button
                    onClick={() => toggleCluster(clusterName)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                  >
                    {isExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {terms.slice(0, isExpanded ? terms.length : 5).map((term, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 text-xs rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer transition-colors"
                      onClick={() => onSelectTopic && onSelectTopic(term)}
                    >
                      {term}
                    </span>
                  ))}
                  
                  {!isExpanded && terms.length > 5 && (
                    <span className="inline-block px-2 py-1 text-xs rounded-md bg-slate-700 text-slate-300">
                      +{terms.length - 5} more
                    </span>
                  )}
                </div>
                
                {isExpanded && (
                  <div className="mt-3 pt-2 border-t border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{terms.length} related terms</span>
                    
                    <button
                      className={`text-xs px-2 py-1 rounded ${textColor} hover:underline`}
                      onClick={() => onSelectTopic && onSelectTopic(terms[0])}
                    >
                      View Analysis
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-8 text-center border border-slate-700">
          <Filter className="w-12 h-12 text-slate-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-slate-300">No matching clusters</h3>
          <p className="text-slate-400 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
};

export default TopicClusters;