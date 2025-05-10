import { configureStore } from '@reduxjs/toolkit';
import topicReducer from './topicSlice';
import chatReducer from './chatSlice';
import sentimentAnalysisReducer from './sentimentAnalysisSlice';
import userReducer from './userSlice';

export const store = configureStore({
  reducer: {
    topic: topicReducer,
    chat: chatReducer,
    sentimentAnalysis: sentimentAnalysisReducer,
    user: userReducer
  }
});

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;