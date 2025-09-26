import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReddit } from '../../../hooks/useReddit';

interface DatabaseSubredditsProps {
  onSelectSubreddit: (subredditName: string) => void;
}

const DatabaseSubreddits: React.FC<DatabaseSubredditsProps> = ({ onSelectSubreddit }) => {
  const { subreddits, loading, error, refetch } = useReddit();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // Add state for subreddit icons (same as Landing page)
  const [subredditIcons, setSubredditIcons] = useState<{[key: string]: string}>({});
  
  // Add state for dropdown menus
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Add ref to track pending fetches to avoid duplicate requests (same as Landing page)
  const pendingFetches = useRef<Set<string>>(new Set());

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown) {
        const target = event.target as Element;
        const dropdownElement = document.querySelector(`[data-dropdown-id="${activeDropdown}"]`);
        const buttonElement = document.querySelector(`[data-button-id="${activeDropdown}"]`);
        
        if (dropdownElement && !dropdownElement.contains(target) && 
            buttonElement && !buttonElement.contains(target)) {
          setActiveDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  // Filter subreddits based on search term
  const filteredSubreddits = subreddits.filter(subreddit =>
    subreddit.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort subreddits by post count (descending)
  const sortedSubreddits = [...filteredSubreddits].sort((a, b) => b.postCount - a.postCount);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // Handle dropdown toggle
  const handleDropdownToggle = (e: React.MouseEvent, subredditId: string) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === subredditId ? null : subredditId);
  };

  // Handle start monitoring
  const handleStartMonitoring = (e: React.MouseEvent, subredditName: string) => {
    e.stopPropagation();
    onSelectSubreddit(subredditName);
    setActiveDropdown(null);
  };

  // Handle card click - navigate to detail page
  const handleCardClick = (subredditName: string) => {
    navigate(`/reddit-browser/subreddit/${subredditName}`);
  };

  // Fetch subreddit icon function (same as Landing page)
  const fetchSubredditIcon = async (subreddit: string) => {
    if (!subreddit) return;
    
    // Extract just the subreddit name without any "r/" prefix or additional text
    const cleanSubredditName = subreddit.replace(/^r\//, '').split(' ')[0].split('-')[0].trim();
    
    // Skip API call for "Unnamed" subreddits or if we already have the icon
    // or if a fetch is already in progress
    if (cleanSubredditName === "Unnamed" || 
        cleanSubredditName === "" || 
        subredditIcons[cleanSubredditName] ||
        pendingFetches.current.has(cleanSubredditName)) {
      return;
    }
    
    // Mark this subreddit as being fetched
    pendingFetches.current.add(cleanSubredditName);
    
    try {
      const response = await fetch(`https://www.reddit.com/r/${cleanSubredditName}/about.json`);
      if (response.ok) {
        const data = await response.json();
        
        // First try to get the community icon
        if (data?.data?.community_icon) {
          // Remove any query parameters from the URL
          const iconUrl = data.data.community_icon.split('?')[0];
          setSubredditIcons(prev => ({
            ...prev,
            [cleanSubredditName]: iconUrl
          }));
          return;
        }
        
        // Fall back to icon_img if community_icon is not available
        if (data?.data?.icon_img) {
          const iconUrl = data.data.icon_img.split('?')[0];
          setSubredditIcons(prev => ({
            ...prev,
            [cleanSubredditName]: iconUrl
          }));
          return;
        }
      }
    } catch (error) {
      console.error(`Error fetching icon for r/${cleanSubredditName}:`, error);
    } finally {
      // Remove from pending set when done, whether successful or not
      pendingFetches.current.delete(cleanSubredditName);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-xl text-white font-medium mb-4">Subreddits in Database</h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400">Loading subreddits...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-xl text-white font-medium mb-4">Subreddits in Database</h2>
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-red-400">{error}</div>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-white font-medium">Subreddits in Database</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            {subreddits.length} subreddit{subreddits.length !== 1 ? 's' : ''} total
          </div>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search subreddits..."
          className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="h-80 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {sortedSubreddits.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-400">
              {searchTerm ? 'No subreddits match your search.' : 'No subreddits found in database.'}
            </div>
          ) : (
            sortedSubreddits.map((subreddit) => (
              <div
                key={subreddit.id}
                onClick={() => handleCardClick(subreddit.name)}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 hover:bg-gray-600 transition-all relative group cursor-pointer hover:shadow-lg hover:shadow-blue-500/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pointer-events-none">
                    <h3 className="text-white font-medium text-sm mb-1 truncate group-hover:text-blue-400 transition-colors">
                      r/{subreddit.name}
                    </h3>
                    <div className="flex items-center text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {formatNumber(subreddit.postCount)} posts
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pointer-events-none">
                    {/* Subreddit Icon */}
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-600 flex items-center justify-center">
                      <img 
                        src={subredditIcons[subreddit.name] || 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png'}
                        alt={`Icon for r/${subreddit.name}`}
                        className="w-full h-full object-cover"
                        onLoad={() => {
                          fetchSubredditIcon(subreddit.name);
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png';
                        }}
                      />
                    </div>
                    
                    {/* Three dots menu */}
                    <div className="relative pointer-events-auto">
                      <button
                        onClick={(e) => handleDropdownToggle(e, subreddit.id)}
                        className="text-gray-400 hover:text-white p-1 rounded transition-colors hover:bg-gray-800"
                        data-button-id={subreddit.id}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      
                      {/* Dropdown menu */}
                      {activeDropdown === subreddit.id && (
                        <div 
                          className="absolute right-0 top-8 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 min-w-[150px]"
                          data-dropdown-id={subreddit.id}
                        >
                          <button
                            onClick={(e) => handleStartMonitoring(e, subreddit.name)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center rounded-lg"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Start Monitoring
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseSubreddits; 