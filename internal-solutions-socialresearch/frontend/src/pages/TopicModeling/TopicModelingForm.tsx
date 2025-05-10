import { useEffect } from 'react';
import { AnalysisFormData, SortOption } from '../../types/TopicModeling';
import { useDispatch, useSelector } from 'react-redux';
import { setSubreddit } from '../../store/topicSlice';
import { RootState } from '../../store/store';
import { useLocation } from 'react-router-dom';

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
  const location = useLocation();
  
  // Set default end date and check for project_id in URL
  useEffect(() => {
    
    if (!formData.endDate) {
      const today = new Date().toISOString().split('T')[0]; 
      setFormData({ ...formData, endDate: today });
    }
    
    // Sync form data with Redux store if needed
    if (storeSubreddit && !formData.subreddit) {
      setFormData({ ...formData, subreddit: storeSubreddit });
    }
    
    // Check URL for project_id parameter
    const searchParams = new URLSearchParams(location.search);
    const urlProjectId = searchParams.get('project_id');
    if (urlProjectId && !formData.project_id) {
      setFormData({ ...formData, project_id: urlProjectId });
    } else if (projectId && !formData.project_id) {
      setFormData({ ...formData, project_id: projectId });
    }
  }, [location, storeSubreddit, projectId, formData, setFormData]);

  // Handle subreddit change
  const handleSubredditChange = (value: string) => {
    // Update local form state
    setFormData({ ...formData, subreddit: value });
    // Update Redux store
    console.log('Setting subreddit:', value);
    dispatch(setSubreddit(value));
  };

  return (
    <div className="flex flex-col gap-3">
      
      <div className="p-1 rounded-xl mb-3 shadow-xl border border-gray-700" style={{ backgroundColor: 'rgba(34,38,43,255)' }}>
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
        
        <h3 className="font-semibold text-blue-400 text-lg text-center">Searching Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          
          <div className="flex flex-col">
            <label htmlFor="subreddit" className="mb-2 font-medium text-gray-300">Subreddit:</label>
            <input
              id="subreddit"
              type="text"
              value={formData.subreddit}
              onChange={(e) => setFormData({...formData, subreddit: e.target.value})}
              onBlur={(e) => handleSubredditChange(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubredditChange(e.currentTarget.value);
                }
              }}
              placeholder="Enter subreddit name"
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100 placeholder-gray-500"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            />
            <small className="mt-1 text-gray-400">Choose active subreddits with sufficient posts</small>
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="keyword" className="mb-2 font-medium text-gray-300">Keyword(optional):</label>
            <input
              id="keyword"
              type="text"
              value={formData.keyword || ''}
              onChange={(e) => setFormData({...formData, keyword: e.target.value})}
              placeholder="Search for posts containing"
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100 placeholder-gray-500"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="sort" className="mb-2 font-medium text-gray-300">Sort By:</label>
            <select
              id="sort"
              value={formData.sort || 'relevance'}
              onChange={(e) => setFormData({ ...formData, sort: e.target.value as SortOption })}
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            >
              <option value="relevance">Relevance</option>
              <option value="hot">Hot</option>
              <option value="new">New</option>
            </select>
          </div>
          
          {/* Date range selection fields */}
          <div className="flex flex-col">
            <label htmlFor="startDate" className="mb-2 font-medium text-gray-300">Start Date:</label>
            <input
              id="startDate"
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="endDate" className="mb-2 font-medium text-gray-300">End Date:</label>
            <input
              id="endDate"
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="p-2 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-gray-100"
              style={{ backgroundColor: 'rgba(34,38,43,255)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 