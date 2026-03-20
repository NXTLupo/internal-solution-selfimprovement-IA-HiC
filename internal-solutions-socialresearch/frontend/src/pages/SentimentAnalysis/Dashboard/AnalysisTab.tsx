import { Category, Point, Post, Comment, Reply, AnalysisData } from '../../../types/analysis';
import { Tooltip } from '../../../components/Tooltip';
import './Date/datapicker-custome.css';
import { useState, useEffect } from 'react';
import { DateRangePicker } from './Date/DateRangePicker';

// Helper function to highlight text with context
const highlightTextWithContext = (text: string, searchTerms: string[], context: string) => {
  if (!searchTerms.length || !text) {
    return text;
  }

  let result = text;
  searchTerms.forEach(term => {
    // First try exact match
    const exactRegex = new RegExp(`(${escapeRegExp(term)}|${escapeRegExp(context)})`, 'gi');
    result = result.replace(exactRegex, match => 
      `<mark style="background-color: rgba(124, 96, 10, 0.7); color: white; font-weight: 500; padding: 0 0.25rem; margin: 0 0.125rem; border-radius: 0.25rem;">${match}</mark>`
    );

    // Then try ellipsis-separated match
    const words = term.split(' ');
    const ellipsisPattern = words
      .map(word => escapeRegExp(word))
      .join('(?:\\s*\\.{3}\\s*)');
    
    const ellipsisRegex = new RegExp(`(${ellipsisPattern}|${escapeRegExp(context)})`, 'gi');
    result = result.replace(ellipsisRegex, match => 
      `<mark style="background-color: rgba(124, 96, 10, 0.7); color: white; font-weight: 500; padding: 0 0.25rem; margin: 0 0.125rem; border-radius: 0.25rem;">${match}</mark>`
    );
  });

  return result;
};

// Helper function to escape special regex characters
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper function to format dates nicely
const formatDate = (dateString: string): string => {
  try {
    // Check if this is a numeric string (likely a Unix timestamp)
    if (/^\d+$/.test(dateString)) {
      const timestamp = parseInt(dateString);
      
      // If the timestamp is already in milliseconds (13 digits), use as is
      // If it's in seconds (10 digits), convert to milliseconds
      const milliseconds = timestamp > 10000000000 ? timestamp : timestamp * 1000;
      
      const date = new Date(milliseconds);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric', 
          month: 'short', 
          day: 'numeric'
        });
      }
    }
    
    // Try to parse as a regular date string
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    }
    
    return 'Unknown date';
  } catch {
    return 'Unknown date';
  }
};

interface AnalysisTabProps {
  analysisData: {
    positive: Category[];
    negative: Category[];
  };
  analysis: AnalysisData | null;
  isFullScreen: boolean;
  dateRange?: {
    fromYear: string | null;
    fromMonth: string | null;
    toYear: string | null;
    toMonth: string | null;
  };
  onDateRangeChange: (dates: {
    fromYear: string | null;
    fromMonth: string | null;
    toYear: string | null;
    toMonth: string | null;
  }) => void;
  showDatePicker?: boolean;
  expandedCategories?: Record<string, boolean>;
  onToggleCategory?: (sentiment: string, categoryIndex: number) => void;
  onToggleExpandAll?: (sentiment: string, expand: boolean) => void;
}

export const AnalysisTab = ({ 
  analysisData, 
  analysis, 
  isFullScreen, 
  dateRange, 
  onDateRangeChange, 
  showDatePicker = true,
  expandedCategories: externalExpandedCategories,
  onToggleCategory,
  onToggleExpandAll
}: AnalysisTabProps) => {
  // State to track expanded categories (if not provided externally)
  const [internalExpandedCategories, setInternalExpandedCategories] = useState<Record<string, boolean>>({});
  // Use externally provided or internal state
  const expandedCategories = externalExpandedCategories || internalExpandedCategories;
  
  // State to track expand all state for each sentiment
  const [expandAll, setExpandAll] = useState<Record<string, boolean>>({
    positive: false,
    negative: false
  });

  // Extract startDate and endDate from analysis data if available
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (analysis?.startDate) {
      setStartDate(analysis.startDate);
    }
    
    if (analysis?.endDate) {
      setEndDate(analysis.endDate);
    }
  }, [analysis]);

  // Toggle category expansion
  const toggleCategory = (sentiment: string, categoryIndex: number) => {
    const key = `${sentiment}-${categoryIndex}`;
    
    // If an external toggle handler is provided, use it
    if (onToggleCategory) {
      onToggleCategory(sentiment, categoryIndex);
    } else {
      // Otherwise, use internal state
      setInternalExpandedCategories(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  // Toggle expand all for a sentiment
  const toggleExpandAll = (sentiment: string) => {
    const newExpandAllState = !expandAll[sentiment];
    setExpandAll(prev => ({
      ...prev,
      [sentiment]: newExpandAllState
    }));

    // Apply the expand/collapse state using the appropriate handler
    if (onToggleExpandAll) {
      // If an external handler is provided, call it
      onToggleExpandAll(sentiment, newExpandAllState);
    } else {
      // Otherwise, update internal state (if needed, though it might become redundant)
      if (analysisData && isSentimentType(sentiment) && analysisData[sentiment]) {
        const updatedCategories = { ...internalExpandedCategories };
        analysisData[sentiment].forEach((_: Category, idx: number) => {
          updatedCategories[`${sentiment}-${idx}`] = newExpandAllState;
        });
        setInternalExpandedCategories(updatedCategories);
      }
    }
  };

  // Check if a category is expanded
  const isCategoryExpanded = (sentiment: string, categoryIndex: number) => {
    const key = `${sentiment}-${categoryIndex}`;
    return expandedCategories[key] || false;
  };

  // Helper function to convert timestamp to Date object
  const getDateFromTimestamp = (timestamp: string): Date | null => {
    try {
      // Check if it's a numeric string (likely a Unix timestamp)
      if (/^\d+$/.test(timestamp)) {
        const timestampNum = parseInt(timestamp);
        // Convert seconds to milliseconds if needed
        const milliseconds = timestampNum > 10000000000 ? timestampNum : timestampNum * 1000;
        const date = new Date(milliseconds);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Try standard date parsing as fallback
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) ? date : null;
    } catch (error) {
      console.error("Failed to parse date:", timestamp, error);
      return null;
    }
  };

  // Helper function to check if a post is within date range
  const isWithinDateRange = (timestamp: string) => {
    const postDate = getDateFromTimestamp(timestamp);
    if (!postDate) return true; // If can't parse date, include it

    // If no date range is set, show all posts
    if (!dateRange?.fromYear && !dateRange?.toYear) return true;

    // Check if post is within the date range
    let fromDate = null;
    if (dateRange.fromYear && dateRange.fromMonth) {
      fromDate = new Date(parseInt(dateRange.fromYear), parseInt(dateRange.fromMonth) - 1, 1);
      fromDate.setHours(0, 0, 0, 0); // Start of day
    }
    
    let toDate = null;
    if (dateRange.toYear && dateRange.toMonth) {
      // Get last day of month
      const lastDay = new Date(parseInt(dateRange.toYear), parseInt(dateRange.toMonth), 0).getDate();
      toDate = new Date(parseInt(dateRange.toYear), parseInt(dateRange.toMonth) - 1, lastDay);
      toDate.setHours(23, 59, 59, 999); // End of day
    }

    if (fromDate && toDate) {
      return postDate >= fromDate && postDate <= toDate;
    } else if (fromDate) {
      return postDate >= fromDate;
    } else if (toDate) {
      return postDate <= toDate;
    }

    return true;
  };

  // Function to get the latest date from the data
  const getLatestDate = (analysis: AnalysisData | null): string | undefined => {
    if (!analysis?.formatted_data?.results) return undefined;
    
    const dates = analysis.formatted_data.results
      .map((post: Post) => getDateFromTimestamp(post.created_utc))
      .filter((date: Date | null): date is Date => date !== null);
    
    if (dates.length === 0) return undefined;
    
    const latestDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
    
    // Return the raw timestamp if possible
    const latestPost = analysis.formatted_data.results.find((post: Post) => {
      const postDate = getDateFromTimestamp(post.created_utc);
      return postDate && postDate.getTime() === latestDate.getTime();
    });
    
    if (latestPost) {
      return latestPost.created_utc; // Return raw timestamp for accurate parsing
    }
    
    return latestDate.toISOString().split('T')[0]; // Fallback to ISO format
  };

  return (
    <div className="space-y-6">
      {/* Only show DateRangePicker if showDatePicker is true (which will be false when called from AnalysisResults) */}
      {showDatePicker && (
        <div className="mb-2 p-4 bg-white rounded-xl ">
          <h3 className="font-bold text-[#525252] mb-2">Filter by Date</h3>
          <DateRangePicker 
            onChange={onDateRangeChange} 
            maxDate={getLatestDate(analysis)}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      )}
      <div className={`${isFullScreen ? 'grid grid-cols-2 gap-6' : 'space-y-6'}`}>
        {['positive', 'negative'].map((sentiment) => {
          if (!analysisData || !isSentimentType(sentiment)) return null;
          
          // Filter categories and their points based on date range
          const filteredData = analysisData[sentiment]
            .map((category: Category) => ({
              ...category,
              points: category.points.map((point: Point) => ({
                ...point,
                evidence: Object.fromEntries(
                  Object.entries(point.evidence).filter(([postId]) => {
                    const posts = analysis?.formatted_data?.results || [];
                    const post = posts.find((p: Post) => `post${p.id}` === postId || `post ${p.id}` === postId);
                    return post && isWithinDateRange(post.created_utc);
                  })
                )
              })).filter((point: Point) => Object.keys(point.evidence).length > 0)
            })).filter((category: Category) => category.points.length > 0);

          return (
            <div key={sentiment} className={`${isFullScreen ? 'h-[calc(100vh-250px)] overflow-auto scrollbar-custom pr-4' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center gap-3 ${
                  isFullScreen ? (sentiment === 'positive' ? 'text-green-600' : 'text-red-600') : 'text-[#115054]'
                }`}>
                  {isFullScreen && (
                    <div className={`w-1.5 h-8 rounded-full ${sentiment === 'positive' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  )}
                  <h3 className={`${isFullScreen ? 'text-xl' : 'text-lg'} font-bold capitalize`}>
                    {sentiment} Feedback
                  </h3>
                </div>
                
                {/* Expand/Collapse All Toggle Switch */}
                <div 
                  className="flex items-center cursor-pointer group" 
                  onClick={() => toggleExpandAll(sentiment)}
                >
                  <span className="text-xs mr-2 text-[#525252] group-hover:text-[#525252] transition-colors">
                    {expandAll[sentiment] ? 'Collapse All' : 'Expand All'}
                  </span>
                  <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                    expandAll[sentiment] 
                      ? (sentiment === 'positive' ? 'bg-green-600' : 'bg-red-600') 
                      : 'bg-[#f5f5f5]'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-gray-300 opacity-80 shadow transition-transform duration-300 transform ${
                      expandAll[sentiment] ? 'translate-x-5' : ''
                    }`}></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-custom">
                {filteredData
                  .sort((a: Category, b: Category) => 
                    b.points.reduce((acc: number, p: Point) => acc + p.frequency, 0) - 
                    a.points.reduce((acc: number, p: Point) => acc + p.frequency, 0)
                  )
                  .map((category: Category, idx: number) => {
                    const totalMentions = category.points.reduce((acc: number, p: Point) => acc + p.frequency, 0);
                    const isExpanded = isCategoryExpanded(sentiment, idx);
                    const categoryId = `category-${sentiment}-${idx}`; // Define a unique ID
                    
                    return (
                      <div 
                        key={idx} 
                        id={categoryId} // Add the ID here
                        className={`rounded-lg border border-[#e5e5e5] mb-4 ${
                          isFullScreen ? 'transition-all hover:border-[#e5e5e5]' : ''
                        } ${sentiment === 'positive' ? 'hover:border-green-700' : 'hover:border-red-700'}`} 
                        style={{ backgroundColor: '#fafafa' }}
                      >
                        {/* Category Header - Always visible */}
                        <div 
                          className="p-4 cursor-pointer"
                          onClick={() => toggleCategory(sentiment, idx)}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className={`text-base font-semibold ${
                              sentiment === 'positive' ? 'text-green-600' : 'text-red-600'
                            } flex items-center`}>
                              {category.category}
                              <span className="ml-2 text-xs">
                                {isExpanded ? 
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg> : 
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                }
                              </span>
                            </h4>
                            <span className="text-xs px-3 py-1 rounded-full bg-[#f5f5f5] text-[#525252]">
                              {totalMentions} mentions
                            </span>
                          </div>
                          
                          {/* Category Preview - Show top 3 points when collapsed */}
                          {!isExpanded && (
                            <ul className="mt-3 space-y-2">
                              {category.points
                                .sort((a: Point, b: Point) => b.frequency - a.frequency)
                                .slice(0, 4)
                                .map((point: Point, pointIdx: number) => (
                                  <li key={pointIdx} className="flex items-start group">
                                    <div className="flex-1">
                                      <span className="text-sm text-[#525252] group-hover:text-[#141414] transition-colors">
                                        {point.point}
                                      </span>
                                    </div>
                                    <span className={`ml-3 px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                                      sentiment === 'positive' 
                                        ? 'bg-green-100 text-green-600' 
                                        : 'bg-red-100 text-red-600'
                                    }`}>
                                      {point.frequency}×
                                    </span>
                                  </li>
                                ))}
                              
                              {category.points.length > 4 && (
                                <li className="text-xs text-[#525252] italic">
                                  + {category.points.length - 4} more points...
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="p-6 pt-0 border-t border-[#e5e5e5]">
                            <div className="space-y-4">
                              {category.points
                                .sort((a: Point, b: Point) => b.frequency - a.frequency)
                                .map((point: Point, pointIdx: number) => (
                                  <div key={pointIdx} className={`pl-4 border-l-2 border-[#e5e5e5] ${
                                    isFullScreen ? 'hover:border-blue-400 transition-colors' : ''
                                  }`}>
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm text-[#525252]">{point.point}</p>
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#115054]/10 text-[#115054]">
                                            {point.frequency}×
                                          </span>
                                        </div>
                                        <div className="mt-2 bg-[#fafafa] rounded-lg p-3">
                                          {Object.entries(point.evidence).map(([postId, quotes]) => {
                                            const formattedPostId = `results`;  // Since the data structure has changed
                                            const posts = analysis?.formatted_data?.[formattedPostId] || [];
                                            
                                            // Find the corresponding post by matching the postId
                                            const post = Array.isArray(posts) ? 
                                              posts.find(p => `post${p.id}` === postId || `post ${p.id}` === postId) : null;
                                            
                                            const quotesArray = Array.isArray(quotes) ? quotes : [];

                                            return (
                                              <div key={postId} className="mb-2 last:mb-0">
                                                <div className="flex items-center gap-1">
                                                  <p className="text-xs text-[#525252] mb-1">
                                                    Source: {postId}
                                                    {post && (
                                                      <span className="ml-2 opacity-50" style={{ fontSize: '10px', lineHeight: '1' }}>
                                                        ({formatDate(post.created_utc)})
                                                      </span>
                                                    )}
                                                  </p>
                                                  {isFullScreen && (
                                                    <div className="group relative inline-block">
                                                      <Tooltip
                                                        content={
                                                          <div className="text-xs text-[#525252] max-w-lg max-h-[200px] overflow-y-auto scrollbar-custom">
                                                            <p className="font-semibold text-[#115054] mb-2">Post Content:</p>
                                                            {post && (
                                                              <>
                                                                {/* Main post content box */}
                                                                <div className="bg-[#f5f5f5] p-3 rounded mb-3">
                                                                  <div 
                                                                    className="whitespace-pre-wrap"
                                                                    dangerouslySetInnerHTML={{
                                                                      __html: highlightTextWithContext(
                                                                        `<strong>${post.title}</strong>\n\n${post.selftext || ''}`,
                                                                        quotesArray,
                                                                        point.point
                                                                      )
                                                                    }}
                                                                  />
                                                                </div>
                                                                
                                                                {/* Comments section box - only show if there are comments */}
                                                                {post.comments && post.comments.length > 0 && (
                                                                  <div className="mt-2">
                                                                    <p className="font-semibold text-[#115054] mb-2">Comments:</p>
                                                                    <div className="bg-[#f5f5f5] p-3 rounded">
                                                                      <div className="whitespace-pre-wrap">
                                                                        {post.comments.map((comment: Comment, commentIndex: number) => (
                                                                          <div key={commentIndex} className="mb-3 last:mb-0">
                                                                            {/* First level comment */}
                                                                            <div 
                                                                              className="border-l-2 border-blue-500 pl-3 py-1"
                                                                              dangerouslySetInnerHTML={{
                                                                                __html: highlightTextWithContext(
                                                                                  comment.body,
                                                                                  quotesArray,
                                                                                  point.point
                                                                                )
                                                                              }}
                                                                            />
                                                                            
                                                                            {/* Replies to the comment */}
                                                                            {comment.replies && comment.replies.length > 0 && (
                                                                              <div className="ml-4 mt-2">
                                                                                {comment.replies.map((reply: Reply, replyIndex: number) => (
                                                                                  <div 
                                                                                    key={replyIndex}
                                                                                    className="border-l-2 border-[#e5e5e5] pl-3 py-1 mb-2 last:mb-0"
                                                                                    dangerouslySetInnerHTML={{
                                                                                      __html: highlightTextWithContext(
                                                                                        reply.body,
                                                                                        quotesArray,
                                                                                        point.point
                                                                                      )
                                                                                    }}
                                                                                  />
                                                                                ))}
                                                                              </div>
                                                                            )}
                                                                          </div>
                                                                        ))}
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                )}
                                                              </>
                                                            )}
                                                          </div>
                                                        }
                                                        score={post?.score}
                                                      >
                                                        <div className="inline-block">
                                                          <svg 
                                                            className="w-3 h-3 text-[#525252] cursor-help hover:text-[#115054] transition-colors" 
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
                                                        </div>
                                                      </Tooltip>
                                                    </div>
                                                  )}
                                                </div>
                                                <ul className="list-disc list-inside">
                                                  {quotesArray.map((quote: string, quoteIdx: number) => {
                                                    return (
                                                      <li key={quoteIdx} className="text-xs text-[#525252] ml-2">
                                                        <span dangerouslySetInnerHTML={{
                                                          __html: highlightTextWithContext(
                                                            quote,
                                                            [point.point],
                                                            point.point
                                                          )
                                                        }} />
                                                      </li>
                                                    );
                                                  })}
                                                </ul>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Add type guard for sentiment
const isSentimentType = (sentiment: string): sentiment is 'positive' | 'negative' => {
  return sentiment === 'positive' || sentiment === 'negative';
}; 