import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define chat message type
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Define chat state
interface ChatState {
  chatHistory: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: ChatState = {
  chatHistory: [],
  isLoading: false,
  error: null
};

// Create the slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.chatHistory.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearChatHistory: (state) => {
      state.chatHistory = [];
    }
  }
});

// Export actions and reducer
export const { addMessage, setLoading, setError, clearChatHistory } = chatSlice.actions;
export default chatSlice.reducer; 