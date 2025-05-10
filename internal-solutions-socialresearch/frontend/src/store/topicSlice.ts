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
}

// Initial state with "ouraring" as the default subreddit
const initialState: TopicState = {
  selectedTopic: null,
  subreddit: "ouraring",  // Set default value to "ouraring"
  topicData: null,
  projectId: null, // Initialize project ID as null
  loading: false,
  error: null
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
    setTopicData: (state, action: PayloadAction<TopicData | null>) => {
      console.log("Redux: setTopicData called with data:", action.payload ? "data present" : "null");
      state.topicData = action.payload;
    },
    // New actions for project management
    setTopicProject: (state, action: PayloadAction<{id: string, data: TopicData | null}>) => {
      state.projectId = action.payload.id;
      state.topicData = action.payload.data;
    },
    clearTopicProject: (state) => {
      console.log("Redux: clearTopicProject called");
      state.topicData = null;
      state.projectId = null;
      console.log("Redux: Cleared topic project data");
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
  setTopicData,
  setTopicProject,
  clearTopicProject,
  setTopicLoading,
  setTopicError
} = topicSlice.actions;
export default topicSlice.reducer; 