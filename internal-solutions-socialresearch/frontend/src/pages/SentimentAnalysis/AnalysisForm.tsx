import { useState, useEffect } from 'react';
import React from 'react';
import { AnalysisFormData } from '../../types/analysis';
import { Tooltip } from '../../components/Tooltip';
import { useDispatch } from 'react-redux';
import { setSubredditValue, setTopicValue, setPostLimitValue } from '../../store/sentimentAnalysisSlice';

interface AnalysisFormProps {
  onSubmit: (data: AnalysisFormData, isDebugMode?: boolean, projectId?: string) => void;
  loading: boolean;
  error: string | null;
  onClearError: () => void;
  formData: AnalysisFormData;
  setFormData: React.Dispatch<React.SetStateAction<AnalysisFormData>>;
  projectId?: string;
}

// Add this helper function at the component level
const validateWorkers = (value: string): number => {
  const num = parseInt(value);
  if (isNaN(num) || num < 1 || num > 8) {
    return 3;
  }
  return num;
};

// Add this helper function for post limit validation
const validatePostLimit = (value: string): number => {
  const num = parseInt(value);
  if (isNaN(num) || num < 1 || num > 2000) {
    return 50;
  }
  return num;
};

export const AnalysisForm = ({ 
  error, 
  onClearError,
  formData,
  setFormData,
  projectId
}: AnalysisFormProps) => {
  // Add local states to track input values
  const [tempWorkers, setTempWorkers] = useState<string>(formData.maxWorkers.toString());
  const [tempPostLimit, setTempPostLimit] = useState<string>(formData.postLimit.toString());
  // State for advanced settings visibility - initially hidden
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Get the dispatch function from Redux
  const dispatch = useDispatch();
  
  // Update local state when formData changes
  useEffect(() => {
    setTempWorkers(formData.maxWorkers.toString());
    setTempPostLimit(formData.postLimit.toString());
  }, [formData.maxWorkers, formData.postLimit]);
  
  // Function to update the subreddit in Redux
  const updateSubredditInRedux = (value: string) => {
    if (value.trim()) {
      console.log("Updating subreddit in Redux:", value);
      dispatch(setSubredditValue(value));
    }
  };
  
  // Function to update the topic in Redux
  const updateTopicInRedux = (value: string) => {
    if (value.trim()) {
      console.log("Updating topic in Redux:", value);
      dispatch(setTopicValue(value));
    }
  };
  
  // Function to update the post limit in Redux
  const updatePostLimitInRedux = (value: number) => {
    console.log("Updating post limit in Redux:", value);
    dispatch(setPostLimitValue(value));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="p-1 rounded-xl shadow-xl border border-gray-700" style={{ backgroundColor: 'rgba(34,38,43,255)' }}>
        {error && (
          <div className="mb-2 p-4 bg-red-900/50 text-red-200 rounded-lg border border-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={onClearError}
              className="ml-4 text-red-200 hover:text-red-100"
            >
              ✕
            </button>
          </div>
        )}
        <h3 className="font-semibold text-blue-400 text-lg text-center">
          {projectId ? 'Project Settings' : 'Search Options'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          
          <div className="flex flex-col">
            <label htmlFor="subreddit" className="mb-2 font-medium text-gray-300">Subreddit:</label>
            <input
              id="subreddit"
              type="text"
              value={formData.subreddit}
              onChange={(e) => setFormData((prev: AnalysisFormData) => ({ ...prev, subreddit: e.target.value }))}
              onBlur={(e) => updateSubredditInRedux(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateSubredditInRedux(e.currentTarget.value);
                }
              }}
              placeholder="Enter subreddit name"
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100 placeholder-gray-500"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="appName" className="mb-2 font-medium text-gray-300">Topic:</label>
            <input
              id="appName"
              type="text"
              value={formData.applicationName}
              onChange={(e) => setFormData((prev: AnalysisFormData) => ({ ...prev, applicationName: e.target.value }))}
              onBlur={(e) => updateTopicInRedux(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateTopicInRedux(e.currentTarget.value);
                }
              }}
              placeholder="Enter topic"
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100 placeholder-gray-500"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="postLimit" className="mb-2 font-medium text-gray-300">
              Number of Posts: <span className="text-sm text-gray-500">(1-2000)</span>
            </label>
            <input
              id="postLimit"
              value={tempPostLimit}
              onChange={(e) => setTempPostLimit(e.target.value)}
              onBlur={(e) => {
                const validValue = validatePostLimit(e.target.value);
                setTempPostLimit(validValue.toString());
                setFormData((prev: AnalysisFormData) => ({ ...prev, postLimit: validValue }));
                updatePostLimitInRedux(validValue);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const validValue = validatePostLimit(e.currentTarget.value);
                  setTempPostLimit(validValue.toString());
                  setFormData((prev: AnalysisFormData) => ({ ...prev, postLimit: validValue }));
                  updatePostLimitInRedux(validValue);
                }
              }}
              placeholder="50"
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100 placeholder-gray-500"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="sort" className="mb-2 font-medium text-gray-300">Sort By:</label>
            <select
              id="sort"
              value={formData.sort}
              onChange={(e) => setFormData((prev: AnalysisFormData) => ({ ...prev, sort: e.target.value as AnalysisFormData['sort'] }))}
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            >
              <option value="relevance">Relevance</option>
              <option value="hot">Hot</option>
              <option value="top">Top</option>
              <option value="new">New</option>
              <option value="comments">Comments</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="timeFilter" className="mb-2 font-medium text-gray-300">Time Period:</label>
            <select
              id="timeFilter"
              value={formData.timeFilter}
              onChange={(e) => setFormData((prev: AnalysisFormData) => ({ ...prev, timeFilter: e.target.value as AnalysisFormData['timeFilter'] }))}
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            >
              <option value="hour">Past Hour</option>
              <option value="day">Past Day</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
        
        {/* Advanced Settings - Collapsible */}
        <div className="mt-4">
          <button 
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className={`w-full flex justify-between items-center p-2.5 ${showAdvancedSettings ? 'rounded-t-lg border-b-0' : 'rounded-lg'} border border-gray-700 bg-gray-800/50 hover:bg-gray-700/60 focus:outline-none transition-colors`}
            aria-expanded={showAdvancedSettings}
            aria-controls="advanced-settings-panel"
          >
            <span className="font-semibold text-blue-400 flex items-center gap-2">
              <svg 
                className="w-5 h-5 text-blue-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              Advanced Settings
            </span>
            <svg 
              className={`w-5 h-5 text-blue-400 transform transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAdvancedSettings && (
            <div 
              id="advanced-settings-panel" 
              className="p-4 border border-t-0 border-gray-700 rounded-b-lg bg-gray-800/50 transition-all duration-300 ease-in-out"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="flex flex-col">
                  <label htmlFor="filterType" className="mb-2 font-medium text-gray-300">Filter Type:</label>
                  <select
                    id="filterType"
                    value={formData.filterType}
                    onChange={(e) => setFormData((prev: AnalysisFormData) => ({ 
                      ...prev, 
                      filterType: e.target.value as AnalysisFormData['filterType'],
                      keyword: e.target.value !== 'absa' ? '' : prev.keyword
                    }))}
                    className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100"
                    style={{ backgroundColor: 'rgba(34,38,43,255)' }}
                  >
                    <option value="cluster">Cluster (default)</option>
                    <option value="absa">Aspect-Based Sentiment Analysis</option>
                  </select>
                </div>

                {formData.filterType === 'absa' && (
                  <div className="flex flex-col">
                    <label htmlFor="keyword" className="mb-2 font-medium text-gray-300 group relative">
                      Filter Keyword: <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="keyword"
                      type="text"
                      value={formData.keyword}
                      onChange={(e) => setFormData((prev: AnalysisFormData) => ({ ...prev, keyword: e.target.value }))}
                      placeholder="Enter a specific aspect (e.g., battery, sleep tracking)"
                      className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100 placeholder-gray-500"
                      style={{ backgroundColor: 'rgba(34,38,43,255)' }}
                      required
                    />
                  </div>
                )}

                <div className="flex flex-col">
                  <label htmlFor="chunkSize" className="mb-2 font-medium text-gray-300 flex items-center gap-2">
                    Chunk Size: <span className="text-sm text-gray-500">(in thousands)</span>
                    <Tooltip
                      content={
                        <div className="text-xs text-gray-300">
                          Smaller chunks improve analysis precision but increase token usage and cost.
                          Larger chunks process faster but may miss nuanced details.
                        </div>
                      }
                    >
                      <svg 
                        className="w-4 h-4 text-gray-400 cursor-help hover:text-blue-400 transition-colors" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                    </Tooltip>
                  </label>
                  <select
                    id="chunkSize"
                    className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100 w-full"
                    style={{ backgroundColor: 'rgba(34,38,43,255)' }}
                    value={formData.chunkSize / 1000}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setFormData((prev: AnalysisFormData) => ({ 
                        ...prev, 
                        chunkSize: value * 1000
                      }));
                    }}
                  >
                    <option value="20">20k</option>
                    <option value="30">30k (default)</option>
                    <option value="40">40k</option>
                    <option value="60">60k</option>
                    <option value="80">80k</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label htmlFor="analysisModel" className="mb-2 font-medium text-gray-300">Analysis Model:</label>
                  <select
                    id="analysisModel"
                    value={formData.analysisModel}
                    onChange={(e) => setFormData((prev: AnalysisFormData) => ({ ...prev, analysisModel: e.target.value as AnalysisFormData['analysisModel'] }))}
                    className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100"
                    style={{ backgroundColor: 'rgba(34,38,43,255)' }}
                  >
                    <option value="deepseek-r1">DeepSeek-R1 (default)</option>
                    <option value="openai-4o">OpenAI-4o</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label htmlFor="mergeMethod" className="mb-2 font-medium text-gray-300">Merge Method:</label>
                  <select
                    id="mergeMethod"
                    value={formData.mergeMethod}
                    onChange={(e) => setFormData((prev: AnalysisFormData) => ({ ...prev, mergeMethod: e.target.value as AnalysisFormData['mergeMethod'] }))}
                    className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100"
                    style={{ backgroundColor: 'rgba(34,38,43,255)' }}
                  >
                    <option value="openai-4o">OpenAI-4o (default)</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label htmlFor="maxWorkers" className="mb-2 font-medium text-gray-300 flex items-center gap-2">
                    Number of threads: <span className="text-sm text-gray-500">(1-8)</span>
                    <Tooltip
                      content={
                        <div className="text-xs text-gray-300">
                          Higher thread count accelerates processing but may encounter LLM rate limits. 
                          Start with 3-5 threads for optimal balance.
                        </div>
                      }
                    >
                      <svg 
                        className="w-4 h-4 text-gray-400 cursor-help hover:text-blue-400 transition-colors" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      id="maxWorkers"
                      value={tempWorkers}
                      onChange={(e) => setTempWorkers(e.target.value)}
                      onBlur={(e) => {
                        const validValue = validateWorkers(e.target.value);
                        setTempWorkers(validValue.toString());
                        setFormData((prev: AnalysisFormData) => ({ ...prev, maxWorkers: validValue }));
                      }}
                      className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100 w-full"
                      style={{ backgroundColor: 'rgba(34,38,43,255)' }}
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 