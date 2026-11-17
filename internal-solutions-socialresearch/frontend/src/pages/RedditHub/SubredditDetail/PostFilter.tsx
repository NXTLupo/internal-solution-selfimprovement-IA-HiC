import { useState, useEffect } from 'react';

// CSS to hide number input spinners
const numberInputStyles = `
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;

export interface PostFilterData {
  searchTerm: string;
  sortBy: 'newest' | 'oldest' | 'most_upvoted' | 'most_commented';
  minUpvotes: number;
  maxUpvotes: number;
  minComments: number;
  maxComments: number;
  startDate: string; // YYYY-MM-DD (UTC), '' = no lower bound
  endDate: string;   // YYYY-MM-DD (UTC), inclusive, '' = no upper bound
}

interface PostFilterProps {
  onFilterChange: (filterData: PostFilterData) => void;
  filterData: PostFilterData;
}

export const defaultFilterData: PostFilterData = {
  searchTerm: '',
  sortBy: 'newest',
  minUpvotes: 0,
  maxUpvotes: 10000,
  minComments: 0,
  maxComments: 1000,
  startDate: '',
  endDate: '',
};

export const PostFilter = ({ 
  onFilterChange,
  filterData,
}: PostFilterProps) => {
  const [tempMinUpvotes, setTempMinUpvotes] = useState<string>(filterData.minUpvotes.toString());
  const [tempMaxUpvotes, setTempMaxUpvotes] = useState<string>(filterData.maxUpvotes.toString());
  const [tempMinComments, setTempMinComments] = useState<string>(filterData.minComments.toString());
  const [tempMaxComments, setTempMaxComments] = useState<string>(filterData.maxComments.toString());

  // Update local state when filterData changes
  useEffect(() => {
    setTempMinUpvotes(filterData.minUpvotes.toString());
    setTempMaxUpvotes(filterData.maxUpvotes.toString());
    setTempMinComments(filterData.minComments.toString());
    setTempMaxComments(filterData.maxComments.toString());
  }, [filterData]);

  const updateFilter = (updates: Partial<PostFilterData>) => {
    const newFilterData = { ...filterData, ...updates };
    onFilterChange(newFilterData);
  };

  const validateNumber = (value: string, min: number, max: number, defaultVal: number): number => {
    const num = parseInt(value);
    if (isNaN(num) || num < min || num > max) {
      return defaultVal;
    }
    return num;
  };

  const resetFilters = () => {
    onFilterChange(defaultFilterData);
  };

  const hasActiveFilters = () => {
    return filterData.searchTerm !== '' ||
           filterData.sortBy !== 'newest' ||
           filterData.minUpvotes !== 0 ||
           filterData.maxUpvotes !== 10000 ||
           filterData.minComments !== 0 ||
           filterData.maxComments !== 1000 ||
           filterData.startDate !== '' ||
           filterData.endDate !== '';
  };

  return (
    <div className="flex flex-col gap-3">
      <style>{numberInputStyles}</style>
      <div className="p-4 rounded-xl  border border-[#e5e5e5]" style={{ backgroundColor: '#ffffff' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#115054] text-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Post Filters
          </h3>
          <div className="flex items-center gap-3">
            {hasActiveFilters() && (
              <button
                onClick={resetFilters}
                className="px-3 py-1 text-xs bg-[#f5f5f5] text-[#141414] rounded hover:bg-[#e5e5e5] transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {/* Search Term */}
          <div className="flex flex-col">
            <label htmlFor="searchTerm" className="mb-2 font-medium text-[#525252]">
              Keyword:
            </label>
            <input
              id="searchTerm"
              type="text"
              value={filterData.searchTerm}
              onChange={(e) => updateFilter({ searchTerm: e.target.value })}
              placeholder="Whole word, in titles, posts and comments"
              title="Whole-word match: 'AI' finds AI or ai, not 'said' or 'email'"
              className="p-2 border border-[#e5e5e5] rounded-lg focus:border-[#115054] focus:outline-none text-[#141414] placeholder-[#acacac]"
              style={{ backgroundColor: '#ffffff' }}
              autoComplete="off"
            />
          </div>

          {/* Sort By */}
          <div className="flex flex-col">
            <label htmlFor="sortBy" className="mb-2 font-medium text-[#525252]">Sort By:</label>
            <select
              id="sortBy"
              value={filterData.sortBy}
              onChange={(e) => updateFilter({ sortBy: e.target.value as PostFilterData['sortBy'] })}
              className="p-2 border border-[#e5e5e5] rounded-lg focus:border-[#115054] focus:outline-none text-[#141414]"
              style={{ backgroundColor: '#ffffff' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="most_upvoted">Most Upvoted</option>
              <option value="most_commented">Most Commented</option>
            </select>
          </div>

          {/* Upvotes Range */}
          <div className="flex flex-col">
            <label className="mb-2 font-medium text-[#525252]">
              Upvotes Range:
            </label>
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#525252]">From</span>
                  <input
                    type="number"
                    value={tempMinUpvotes}
                    onChange={(e) => setTempMinUpvotes(e.target.value)}
                    onBlur={(e) => {
                      const validValue = validateNumber(e.target.value, 0, 100000, 0);
                      setTempMinUpvotes(validValue.toString());
                      updateFilter({ minUpvotes: validValue });
                    }}
                    placeholder="0"
                    className="w-16 p-1 text-sm border border-[#e5e5e5] rounded focus:border-[#115054] focus:outline-none text-[#141414] placeholder-[#acacac] text-center"
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </div>
                
                <svg className="w-3 h-3 text-[#acacac] mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#525252]">To</span>
                  <input
                    type="number"
                    value={tempMaxUpvotes}
                    onChange={(e) => setTempMaxUpvotes(e.target.value)}
                    onBlur={(e) => {
                      const validValue = validateNumber(e.target.value, 0, 100000, 10000);
                      setTempMaxUpvotes(validValue.toString());
                      updateFilter({ maxUpvotes: validValue });
                    }}
                    placeholder="10000"
                    className="w-16 p-1 text-sm border border-[#e5e5e5] rounded focus:border-[#115054] focus:outline-none text-[#141414] placeholder-[#acacac] text-center"
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>
          </div>

          {/* Comments Range */}
          <div className="flex flex-col">
            <label className="mb-2 font-medium text-[#525252]">
              Comments Range:
            </label>
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#525252]">From</span>
                  <input
                    type="number"
                    value={tempMinComments}
                    onChange={(e) => setTempMinComments(e.target.value)}
                    onBlur={(e) => {
                      const validValue = validateNumber(e.target.value, 0, 10000, 0);
                      setTempMinComments(validValue.toString());
                      updateFilter({ minComments: validValue });
                    }}
                    placeholder="0"
                    className="w-16 p-1 text-sm border border-[#e5e5e5] rounded focus:border-[#115054] focus:outline-none text-[#141414] placeholder-[#acacac] text-center"
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </div>
                
                <svg className="w-3 h-3 text-[#acacac] mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#525252]">To</span>
                  <input
                    type="number"
                    value={tempMaxComments}
                    onChange={(e) => setTempMaxComments(e.target.value)}
                    onBlur={(e) => {
                      const validValue = validateNumber(e.target.value, 0, 10000, 1000);
                      setTempMaxComments(validValue.toString());
                      updateFilter({ maxComments: validValue });
                    }}
                    placeholder="1000"
                    className="w-16 p-1 text-sm border border-[#e5e5e5] rounded focus:border-[#115054] focus:outline-none text-[#141414] placeholder-[#acacac] text-center"
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Date Range */}
          <div className="flex flex-col">
            <label htmlFor="startDate" className="mb-2 font-medium text-[#525252]">From Date:</label>
            <input
              id="startDate"
              type="date"
              value={filterData.startDate}
              max={filterData.endDate || undefined}
              onChange={(e) => updateFilter({ startDate: e.target.value })}
              className="p-2 border border-[#e5e5e5] rounded-lg focus:border-[#115054] focus:outline-none text-[#141414]"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="endDate" className="mb-2 font-medium text-[#525252]">To Date:</label>
            <input
              id="endDate"
              type="date"
              value={filterData.endDate}
              min={filterData.startDate || undefined}
              onChange={(e) => updateFilter({ endDate: e.target.value })}
              className="p-2 border border-[#e5e5e5] rounded-lg focus:border-[#115054] focus:outline-none text-[#141414]"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostFilter; 