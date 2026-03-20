import { useEffect } from 'react';
import { AnalysisFormData, SortOption } from '../../types/TopicModeling';
import { useDispatch, useSelector } from 'react-redux';
import { setSubreddit, setStartDate, setEndDate } from '../../store/topicSlice';
import { RootState } from '../../store/store';
import { useLocation } from 'react-router-dom';
import { Tooltip } from '../../components/Tooltip';

type AnalysisFormProps = {
  error: string | null;
  onClearError: () => void;
  formData: AnalysisFormData;
  setFormData: (data: AnalysisFormData) => void;
  projectId?: string;
};

export const TopicModelingForm = ({ 
  error, 
  onClearError,
  formData,
  setFormData,
  projectId
}: AnalysisFormProps) => {
  
  const dispatch = useDispatch();
  const storeSubreddit = useSelector((state: RootState) => state.topic.subreddit);
  const storeStartDate = useSelector((state: RootState) => state.topic.startDate);
  const storeEndDate = useSelector((state: RootState) => state.topic.endDate);
  const location = useLocation();
  
  // Set default end date and check for project_id in URL
  useEffect(() => {
    // Sync form data with Redux store if needed - only on initial load
    const updatedFormData = { ...formData };
    let shouldUpdate = false;
    
    if (storeSubreddit && !formData.subreddit && formData.subreddit !== '') {
      updatedFormData.subreddit = storeSubreddit;
      shouldUpdate = true;
    }
    
    // Add startDate from Redux if available
    if (storeStartDate && !formData.startDate) {
      updatedFormData.startDate = storeStartDate;
      shouldUpdate = true;
    }
    
    // Add endDate from Redux if available
    if (storeEndDate && !formData.endDate) {
      updatedFormData.endDate = storeEndDate;
      shouldUpdate = true;
    } 
    // Always set default end date to current UTC date if not already set
    else if (!formData.endDate) {
      // Get current UTC date in YYYY-MM-DD format
      const now = new Date();
      const utcDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const todayUTC = utcDate.toISOString().split('T')[0]; 
      updatedFormData.endDate = todayUTC;
      shouldUpdate = true;
    }
    
    // Only update form state if we need to
    if (shouldUpdate) {
      setFormData(updatedFormData);
    }
    
    // Check URL for project_id parameter
    const searchParams = new URLSearchParams(location.search);
    const urlProjectId = searchParams.get('project_id');
    if (urlProjectId && !formData.project_id) {
      setFormData({ ...updatedFormData, project_id: urlProjectId });
    } else if (projectId && !formData.project_id) {
      setFormData({ ...updatedFormData, project_id: projectId });
    }
  }, [location, storeSubreddit, storeStartDate, storeEndDate, projectId, formData, setFormData]);

  // Handle subreddit change
  const handleSubredditChange = (value: string) => {
    // Update Redux store with the new value, even if empty
    dispatch(setSubreddit(value));
  };

  return (
    <div className="flex flex-col gap-3">
      
      <div className="p-1 rounded-xl mb-3 border border-[#e5e5e5]" style={{ backgroundColor: '#ffffff' }}>
        {error && (
          <div className="mb-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-300 flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={onClearError}
              className="ml-4 text-red-700 hover:text-red-900"
            >
              ✕
            </button>
          </div>
        )}
        
        <h3 className="font-semibold text-[#115054] text-lg text-center">Searching Options</h3>
        <form autoComplete="off">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          
          <div className="flex flex-col">
            <label htmlFor="subreddit" className="mb-2 font-medium text-[#525252] flex items-center gap-2">
              Subreddit:
              <Tooltip
                content={
                  <div className="text-xs text-[#525252]">
                    Choose active subreddits with sufficient posts
                  </div>
                }
              >
                <svg 
                  className="w-4 h-4 text-[#525252] cursor-help hover:text-[#115054] transition-colors" 
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
            <input
              id="subreddit"
              type="text"
              value={formData.subreddit}
              onChange={(e) => {
                const newValue = e.target.value;
                setFormData({...formData, subreddit: newValue});
                handleSubredditChange(newValue);
              }}
              placeholder="Enter subreddit name"
              className="p-2 border border-[#e5e5e5] rounded-lg focus:border-[#115054] focus:outline-none text-[#141414] placeholder-[#acacac] dark-theme-input"
              style={{ backgroundColor: '#ffffff' }}
              autoComplete="off"
              spellCheck="true"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="keyword" className="mb-2 font-medium text-[#525252]">Keyword(optional):</label>
                          <input
                id="keyword"
                type="text"
                value={formData.keyword || ''}
                onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                placeholder="Search for posts containing"
                className="p-2 border border-[#e5e5e5] rounded-lg focus:border-[#115054] focus:outline-none text-[#141414] placeholder-[#acacac] dark-theme-input"
                style={{ backgroundColor: '#ffffff' }}
                autoComplete="off"
                spellCheck="true"
              />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="sort" className="mb-2 font-medium text-[#525252]">Sort By:</label>
            <select
              id="sort"
              value={formData.sort || 'relevance'}
              onChange={(e) => setFormData({ ...formData, sort: e.target.value as SortOption })}
              className="p-2 border border-[#e5e5e5] rounded-lg focus:border-[#115054] focus:outline-none text-[#141414]"
              style={{ backgroundColor: '#ffffff' }}
            >
              <option value="relevance">Relevance</option>
              <option value="hot">Hot</option>
              <option value="new">New</option>
            </select>
          </div>
          
          {/* Date range selection fields */}
          <div className="flex flex-col">
            <label htmlFor="startDate" className="mb-2 font-medium text-[#525252] flex items-center gap-2">
              Start Date:
              <Tooltip
                content={
                  <div className="text-xs text-[#525252]">
                    <div className="font-semibold mb-1">UTC Date Range</div>
                    <div>Reddit API uses UTC time for filtering.</div>
                    <div>Leave empty to search from the beginning.</div>
                  </div>
                }
              >
                <svg 
                  className="w-4 h-4 text-[#525252] cursor-help hover:text-[#115054] transition-colors" 
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
            <input
              id="startDate"
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                setFormData({ ...formData, startDate: newValue });
                // Also update Redux state
                dispatch(setStartDate(newValue || undefined));
              }}
              className="p-2 border border-[#e5e5e5] rounded-lg focus:border-[#115054] focus:outline-none text-[#141414] dark-theme-input"
              style={{ backgroundColor: '#ffffff' }}
              autoComplete="off"
            />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="endDate" className="mb-2 font-medium text-[#525252] flex items-center gap-2">
              End Date:
              <Tooltip
                content={
                  <div className="text-xs text-[#525252]">
                    <div className="font-semibold mb-1">UTC Date Range</div>
                    <div>Reddit API uses UTC time for filtering.</div>
                    <div>Defaults to current UTC date.</div>
                  </div>
                }
              >
                <svg 
                  className="w-4 h-4 text-[#525252] cursor-help hover:text-[#115054] transition-colors" 
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
            <input
              id="endDate"
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                setFormData({ ...formData, endDate: newValue });
                // Also update Redux state
                dispatch(setEndDate(newValue || undefined));
              }}
              className="p-2 border border-[#e5e5e5] rounded-lg focus:border-[#115054] focus:outline-none text-[#141414] dark-theme-input"
              style={{ backgroundColor: '#ffffff' }}
              autoComplete="off"
            />
          </div>
        </div>
        </form>
      </div>
    </div>
  );
}; 