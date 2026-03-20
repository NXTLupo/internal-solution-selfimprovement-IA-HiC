import { useParams, useNavigate } from 'react-router-dom';
import { useSubredditDetail } from '../../../hooks/useReddit';
import PostCard from './PostCard.tsx';
import { PostFilter, PostFilterData } from './PostFilter.tsx';
import { useState, useEffect, useRef } from 'react';
import { DatabasePost, DatabaseComment } from '../../../types/reddit';
import {
  ExportData,
  exportPostsAsText,
  exportPostsAsPDF,
  exportPostsAsJSON,
  exportPostsAsXML,
  exportPostsAsCSV,
  exportPostsAsMarkdown
} from './exportUtils.ts';

function SubredditDetail() {
  const { subredditName } = useParams<{ subredditName: string }>();
  const navigate = useNavigate();
  const { 
    subredditDetail, 
    loading, 
    error, 
    refetch 
  } = useSubredditDetail(subredditName || null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize filter data with default values
  const [filterData, setFilterData] = useState<PostFilterData>({
    searchTerm: '',
    sortBy: 'newest',
    minUpvotes: 0,
    maxUpvotes: 10000,
    minComments: 0,
    maxComments: 1000,
  });

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function to recursively count all comments including nested replies
  const getTotalCommentCount = (post: DatabasePost): number => {
    if (!post.comments || !Array.isArray(post.comments)) {
      return post.num_comments || 0; // Fallback to the original count if no detailed comments
    }

    let totalCount = 0;

    const countReplies = (comment: DatabaseComment): number => {
      let count = 1; // Count the comment itself
      
      if (comment.replies && Array.isArray(comment.replies)) {
        comment.replies.forEach((reply: DatabaseComment) => {
          count += countReplies(reply); // Recursively count replies
        });
      }
      
      return count;
    };

    // Count all top-level comments and their nested replies
    post.comments.forEach((comment: DatabaseComment) => {
      totalCount += countReplies(comment);
    });

    return totalCount;
  };

  // Enhanced filtering logic
  const filteredPosts = subredditDetail?.posts.filter(post => {
    // Search term filter
    if (filterData.searchTerm && !post.title.toLowerCase().includes(filterData.searchTerm.toLowerCase()) &&
        !post.content?.toLowerCase().includes(filterData.searchTerm.toLowerCase()) &&
        !post.author?.toLowerCase().includes(filterData.searchTerm.toLowerCase())) {
      return false;
    }

    // Upvotes filter
    const upvotes = post.score || 0;
    if (upvotes < filterData.minUpvotes || upvotes > filterData.maxUpvotes) {
      return false;
    }

    // Comments filter
    const commentCount = getTotalCommentCount(post);
    if (commentCount < filterData.minComments || commentCount > filterData.maxComments) {
      return false;
    }

    return true;
  }) || [];

  // Enhanced sorting logic
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (filterData.sortBy) {
      case 'newest':
        return (b.created_utc || 0) - (a.created_utc || 0);
      case 'oldest':
        return (a.created_utc || 0) - (b.created_utc || 0);
      case 'most_upvoted':
        return (b.score || 0) - (a.score || 0);
      case 'most_commented':
        return getTotalCommentCount(b) - getTotalCommentCount(a);
      default:
        return (b.created_utc || 0) - (a.created_utc || 0);
    }
  });

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // Toggle all comments
  const toggleAllComments = () => {
    setShowAllComments(!showAllComments);
  };

  // Handle export option selection
  const handleExportOption = (format: 'txt' | 'pdf' | 'json' | 'xml' | 'csv' | 'md') => {
    setShowExportDropdown(false);
    
    if (!sortedPosts || sortedPosts.length === 0 || !subredditDetail) {
      return;
    }

    const exportData: ExportData = {
      sortedPosts,
      subredditDetail,
      filterData
    };
    
    switch (format) {
      case 'txt':
        exportPostsAsText(exportData);
        break;
      case 'pdf':
        exportPostsAsPDF(exportData);
        break;
      case 'json':
        exportPostsAsJSON(exportData);
        break;
      case 'xml':
        exportPostsAsXML(exportData);
        break;
      case 'csv':
        exportPostsAsCSV(exportData);
        break;
      case 'md':
        exportPostsAsMarkdown(exportData);
        break;
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilterData: PostFilterData) => {
    setFilterData(newFilterData);
  };

  // Handle back navigation
  const handleBackNavigation = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-[#141414] p-3 px-6">
        <div className="flex items-center">
          <img 
            src="/nxt-humans-logo.png" 
            alt="NXT Humans Logo" 
            className="h-12 cursor-pointer" 
            onClick={() => navigate('/')}
          />
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackNavigation}
                  className="flex items-center text-[#525252] hover:text-[#141414] transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-xs text-[#525252]">Comments</span>
                  <div className="relative w-8 h-4 rounded-full bg-[#f5f5f5]">
                    <div className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow"></div>
                  </div>
                </div>
                
                <button
                  disabled
                  className="px-4 py-2 bg-[#f5f5f5] text-[#525252] rounded text-sm flex items-center opacity-50 cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-[#e5e5e5] animate-pulse">
              <div className="h-8 bg-[#fafafa] rounded w-48 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-[#fafafa] rounded-lg p-4">
                  <div className="h-8 bg-[#f5f5f5] rounded w-16 mb-2"></div>
                  <div className="h-4 bg-[#f5f5f5] rounded w-24"></div>
                </div>
                <div className="bg-[#fafafa] rounded-lg p-4">
                  <div className="h-8 bg-[#f5f5f5] rounded w-16 mb-2"></div>
                  <div className="h-4 bg-[#f5f5f5] rounded w-24"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading PostFilter Component */}
          <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] mb-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="h-4 bg-[#fafafa] rounded w-16 mb-2"></div>
                <div className="h-10 bg-[#fafafa] rounded"></div>
              </div>
              <div>
                <div className="h-4 bg-[#fafafa] rounded w-12 mb-2"></div>
                <div className="h-10 bg-[#fafafa] rounded"></div>
              </div>
              <div>
                <div className="h-4 bg-[#fafafa] rounded w-20 mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-10 bg-[#fafafa] rounded flex-1"></div>
                  <div className="h-10 bg-[#fafafa] rounded flex-1"></div>
                </div>
              </div>
              <div>
                <div className="h-4 bg-[#fafafa] rounded w-20 mb-2"></div>
                <div className="flex gap-2">
                  <div className="h-10 bg-[#fafafa] rounded flex-1"></div>
                  <div className="h-10 bg-[#fafafa] rounded flex-1"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Posts */}
          <div className="space-y-6 mt-6">
            {[1, 2, 3].map((index) => (
              <div key={index} className="bg-white rounded-lg p-6 border border-[#e5e5e5] animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="h-6 bg-[#fafafa] rounded w-3/4 mb-2"></div>
                    <div className="flex items-center gap-4 text-sm text-[#525252]">
                      <div className="h-4 bg-[#fafafa] rounded w-20"></div>
                      <div className="h-4 bg-[#fafafa] rounded w-16"></div>
                      <div className="h-4 bg-[#fafafa] rounded w-24"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 bg-[#fafafa] rounded w-12"></div>
                    <div className="h-8 bg-[#fafafa] rounded w-12"></div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="h-4 bg-[#fafafa] rounded w-full mb-2"></div>
                  <div className="h-4 bg-[#fafafa] rounded w-4/5 mb-2"></div>
                  <div className="h-4 bg-[#fafafa] rounded w-3/5"></div>
                </div>

                <div className="border-t border-[#e5e5e5] pt-4">
                  <div className="h-4 bg-[#fafafa] rounded w-32 mb-3"></div>
                  <div className="space-y-3">
                    <div className="bg-[#fafafa] rounded-lg p-3">
                      <div className="h-4 bg-[#f5f5f5] rounded w-24 mb-2"></div>
                      <div className="h-3 bg-[#f5f5f5] rounded w-full mb-1"></div>
                      <div className="h-3 bg-[#f5f5f5] rounded w-3/4"></div>
                    </div>
                    <div className="bg-[#fafafa] rounded-lg p-3">
                      <div className="h-4 bg-[#f5f5f5] rounded w-28 mb-2"></div>
                      <div className="h-3 bg-[#f5f5f5] rounded w-full mb-1"></div>
                      <div className="h-3 bg-[#f5f5f5] rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-[#141414] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-300 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="text-red-600">{error}</div>
              <button
                onClick={refetch}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subredditDetail) {
    return (
      <div className="min-h-screen bg-white text-[#141414] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-[#525252]">No data found for this subreddit.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#141414] p-3 px-6">
      <div className="flex items-center">
        <img 
          src="/nxt-humans-logo.png" 
          alt="NXT Humans Logo" 
          className="h-12 cursor-pointer" 
          onClick={() => navigate('/')}
        />
      </div>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackNavigation}
                className="flex items-center text-[#525252] hover:text-[#141414] transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#525252]">Comments</span>
                <div 
                  className="flex items-center cursor-pointer group" 
                  onClick={toggleAllComments}
                >
                  <div className={`relative w-8 h-4 rounded-full transition-colors duration-300 ${
                    showAllComments ? 'bg-[#115054]' : 'bg-[#f5f5f5]'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-300 transform ${
                      showAllComments ? 'translate-x-4' : ''
                    }`}></div>
                  </div>
                </div>
              </div>
              
              {/* Export Dropdown */}
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="px-4 py-2 bg-[#f5f5f5] text-[#141414] rounded hover:bg-[#f5f5f5] transition-colors text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showExportDropdown && (
                  <div className="absolute right-1 mt-2 w-48 bg-white border border-[#e5e5e5] rounded-lg  z-50">
                    <div className="py-1">
                      <button
                        onClick={() => handleExportOption('txt')}
                        className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export as TXT
                      </button>
                      <button
                        onClick={() => handleExportOption('pdf')}
                        className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export as PDF
                      </button>
                      <button
                        onClick={() => handleExportOption('json')}
                        className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707L16.414 6.293A1 1 0 0015.586 6H7a2 2 0 00-2 2v11a2 2 0 002 2z" />
                        </svg>
                        Export as JSON
                      </button>
                      <button
                        onClick={() => handleExportOption('xml')}
                        className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Export as XML
                      </button>
                      <div className="relative group">
                        <button
                          onClick={() => handleExportOption('csv')}
                          className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Export as CSV
                        </button>
                        {/* Tooltip */}
                        <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-[#fafafa] text-[#141414] text-xs rounded-lg  opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          <div className="flex flex-col">
                            <div className="font-medium mb-1">CSV Export Info:</div>
                            <div>• Comments are flattened into single field</div>
                            <div>• Contact dev if you need more data structure</div>
                          </div>
                          {/* Tooltip arrow */}
                          <div className="absolute right-full top-3 border-4 border-transparent border-r-[#e5e5e5]"></div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleExportOption('md')}
                        className="w-full px-4 py-2 text-left text-sm text-[#141414] hover:bg-[#f5f5f5] flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export as Markdown
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-[#e5e5e5]">
            <h1 className="text-3xl font-bold mb-4 text-[#115054]">r/{subredditDetail.subreddit}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#fafafa] rounded-lg p-4">
                <div className="text-2xl font-bold text-[#141414]">{formatNumber(subredditDetail.totalPosts)}</div>
                <div className="text-[#525252] text-sm">Total Posts</div>
              </div>
              <div className="bg-[#fafafa] rounded-lg p-4">
                <div className="text-2xl font-bold text-[#141414]">{formatNumber(subredditDetail.totalComments)}</div>
                <div className="text-[#525252] text-sm">Total Comments</div>
              </div>
            </div>
          </div>
        </div>

        {/* Post Filter Component */}
        <PostFilter
          onFilterChange={handleFilterChange}
          filterData={filterData}
        />

        {/* Posts */}
        <div className="space-y-6 mt-6">
          {sortedPosts.length === 0 ? (
            <div className="bg-white rounded-lg p-8 border border-[#e5e5e5] text-center">
              <div className="text-[#525252]">
                {filterData.searchTerm || 
                 filterData.sortBy !== 'newest' || filterData.minUpvotes > 0 || filterData.maxUpvotes < 10000 ||
                 filterData.minComments > 0 || filterData.maxComments < 1000
                  ? 'No posts match your filter criteria.' 
                  : 'No posts found for this subreddit.'}
              </div>
            </div>
          ) : (
            <>
              {sortedPosts.map((post) => (
                <PostCard key={post.id} post={post} showComments={showAllComments} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubredditDetail; 