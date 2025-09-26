import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AnalysisFormData, AnalysisData } from '../types/analysis';
import { AISummaryResponse } from '../services/llmAnalyzer'; 

// Extend the state interface to include analysis data and AI summary
interface SentimentAnalysisState extends AnalysisFormData {
  data: AnalysisData | null; 
  ai_summary: AISummaryResponse | null; 
  dateFilteredData: AnalysisData | null; 
  projectId: string | null; 
  loading: boolean;
  error: string | null;
  aiSummaryLoading: boolean;
  aiSummaryError: string | null;
  // Add job progress tracking properties
  jobProgress: number | null;
  jobStatus: string | null;
  jobMessage: string | null;
}

// Define initial state with default values
const initialState: SentimentAnalysisState = {
  subreddit: '',
  applicationName: '',
  postLimit: 800,
  sort: 'relevance',
  timeFilter: 'all',
  filterType: 'cluster',
  keyword: '',
  chunkSize: 30000,
  analysisModel: 'openai-4',
  mergeMethod: 'openai',
  maxWorkers: 3,
  // New fields
  data: null,
  ai_summary: null, 
  dateFilteredData: null, 
  projectId: null,
  loading: false,
  error: null,
  aiSummaryLoading: false,
  aiSummaryError: null,
  jobProgress: null,
  jobStatus: null,
  jobMessage: null
};

const sentimentAnalysisSlice = createSlice({
  name: 'sentimentAnalysis',
  initialState,
  reducers: {
    setSubredditValue: (state, action: PayloadAction<string>) => {
      state.subreddit = action.payload;
      console.log("Redux: Updated form subreddit to", action.payload);
    },
    resetSubreddit: (state) => {
      state.subreddit = "";
      console.log("Redux: Reset subreddit to empty string");
    },
    resetFormValues: (state) => {
      state.subreddit = "";
      state.applicationName = "";
      state.postLimit = 800;
    },
    setTopicValue: (state, action: PayloadAction<string>) => {
      state.applicationName = action.payload;
      console.log("Redux: Updated form topic to", action.payload);
    },
    setPostLimitValue: (state, action: PayloadAction<number>) => {
      state.postLimit = action.payload;
      console.log("Redux: Updated form post limit to", action.payload);
    },
    // Update the entire form data at once
    setFormData: (state, action: PayloadAction<Partial<AnalysisFormData>>) => {
      // Preserve existing data, ai_summary, projectId, loading, error, dateFilteredData
      return {
        ...state,
        ...action.payload,
        data: state.data,
        ai_summary: state.ai_summary, // Preserve ai_summary
        dateFilteredData: state.dateFilteredData,
        projectId: state.projectId,
        loading: state.loading,
        error: state.error
      };
    },
    // New actions for analysis data
    setAnalysisData: (state, action: PayloadAction<{id: string, data: AnalysisData & { ai_summary?: AISummaryResponse | null }}>) => {
      state.projectId = action.payload.id;
      state.data = action.payload.data;
      // Also set ai_summary if it exists in the loaded data
      state.ai_summary = action.payload.data?.ai_summary || null;
      state.dateFilteredData = null; // Clear date filtered data when loading new project data
    },
    // Action to set just the project ID
    setProjectId: (state, action: PayloadAction<string | null>) => {
      state.projectId = action.payload;
    },
    // Action to specifically set the AI summary
    setAISummary: (state, action: PayloadAction<AISummaryResponse | null>) => {
      state.ai_summary = action.payload;
      // Optionally update the main data object if it exists
      if (state.data) {
        // Use type assertion since ai_summary is not defined in AnalysisData
        (state.data as AnalysisData & { ai_summary?: AISummaryResponse | null }).ai_summary = action.payload;
      }
    },
    // New actions for AI summary loading state
    setAISummaryLoading: (state, action: PayloadAction<boolean>) => {
      state.aiSummaryLoading = action.payload;
    },
    // New actions for AI summary error state
    setAISummaryError: (state, action: PayloadAction<string | null>) => {
      state.aiSummaryError = action.payload;
      // Automatically set loading to false when there's an error
      if (action.payload) {
        state.aiSummaryLoading = false;
      }
    },
    clearAnalysisData: (state) => {
      state.data = null;
      state.ai_summary = null; // Clear AI summary
      state.dateFilteredData = null;
      state.projectId = null;
      state.subreddit = ""; // Reset subreddit when clearing analysis data
      state.applicationName = ""; // Reset topic when clearing analysis data
      state.postLimit = 800; // Reset post limit to default
      // Also clear AI summary loading and error states
      state.aiSummaryLoading = false;
      state.aiSummaryError = null;
      // Also clear job progress states
      state.jobProgress = null;
      state.jobStatus = null;
      state.jobMessage = null;
    },
    setAnalysisLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAnalysisError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.loading = false;
      }
    },
    // New action for setting date filtered data
    setDateFilteredData: (state, action: PayloadAction<AnalysisData>) => {
      state.dateFilteredData = action.payload;
    },
    // New actions for job progress tracking
    setJobProgress: (state, action: PayloadAction<number | null>) => {
      state.jobProgress = action.payload;
    },
    setJobStatus: (state, action: PayloadAction<string | null>) => {
      state.jobStatus = action.payload;
    },
    setJobMessage: (state, action: PayloadAction<string | null>) => {
      state.jobMessage = action.payload;
    },
    // Combined action to update job progress details
    updateJobProgress: (state, action: PayloadAction<{
      progress?: number | null;
      status?: string | null;
      message?: string | null;
    }>) => {
      if (action.payload.progress !== undefined) {
        state.jobProgress = action.payload.progress;
      }
      if (action.payload.status !== undefined) {
        state.jobStatus = action.payload.status;
      }
      if (action.payload.message !== undefined) {
        state.jobMessage = action.payload.message;
      }
    }
  }
});

export const {
  setSubredditValue,
  resetSubreddit,
  resetFormValues,
  setTopicValue,
  setPostLimitValue,
  setFormData,
  setAnalysisData,
  setProjectId,
  setAISummary,
  setAISummaryLoading,
  setAISummaryError,
  clearAnalysisData,
  setAnalysisLoading,
  setAnalysisError,
  setDateFilteredData,
  setJobProgress,
  setJobStatus,
  setJobMessage,
  updateJobProgress
} = sentimentAnalysisSlice.actions;

export default sentimentAnalysisSlice.reducer;