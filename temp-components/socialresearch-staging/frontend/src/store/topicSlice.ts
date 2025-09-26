import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TopicData, Topic } from '../types/TopicModeling';

// Define the state type
interface TopicState {
  selectedTopic: Topic | null;
  subreddit: string;
  topicData: TopicData | null;
  projectId: string | null; // Add project ID
  loading: boolean;
  error: string | null;
  startDate?: string; // Change to string type to match API response
  endDate?: string; // Change to string type to match API response
}

// Initial state with empty default subreddit
const initialState: TopicState = {
  selectedTopic: null,
  subreddit: "",  // Empty string as default value
  topicData: null,
  projectId: null, // Initialize project ID as null
  loading: false,
  error: null,
  startDate: undefined,
  endDate: undefined
};

// Create the slice
const topicSlice = createSlice({
  name: 'topic',
  initialState,
  reducers: {
    setSelectedTopic: (state, action: PayloadAction<Topic | null>) => {
      state.selectedTopic = action.payload;
    },
    setSubreddit: (state, action: PayloadAction<string>) => {
      state.subreddit = action.payload;
    },
    resetSubreddit: (state) => {
      state.subreddit = "";
    },
    setTopicData: (state, action: PayloadAction<TopicData | null>) => {
      state.topicData = action.payload;
    },
    // New actions for date range
    setStartDate: (state, action: PayloadAction<string | undefined>) => {
      state.startDate = action.payload;
    },
    setEndDate: (state, action: PayloadAction<string | undefined>) => {
      state.endDate = action.payload;
    },
    // New actions for project management
    setTopicProject: (state, action: PayloadAction<{id: string, data: TopicData | null}>) => {
      state.projectId = action.payload.id;
      state.topicData = action.payload.data;
      
      // Also update subreddit when it's available in the data
      if (action.payload.data?.subreddit) {
        state.subreddit = action.payload.data.subreddit;
      }
      
      // Also update startDate and endDate when they're available in the data
      if (action.payload.data?.startDate) {
        state.startDate = action.payload.data.startDate;
      }
      
      if (action.payload.data?.endDate) {
        state.endDate = action.payload.data.endDate;
      }
    },
    clearTopicProject: (state) => {
      state.topicData = null;
      state.projectId = null;
      state.subreddit = ""; // Also reset subreddit when clearing project
      state.startDate = undefined; // Reset startDate
      state.endDate = undefined; // Reset endDate
    },
    setTopicLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setTopicError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.loading = false;
      }
    }
  }
});

// Export actions and reducer
export const { 
  setSelectedTopic, 
  setSubreddit, 
  resetSubreddit,
  setTopicData,
  setTopicProject,
  clearTopicProject,
  setTopicLoading,
  setTopicError,
  setStartDate,
  setEndDate
} = topicSlice.actions;
export default topicSlice.reducer; 