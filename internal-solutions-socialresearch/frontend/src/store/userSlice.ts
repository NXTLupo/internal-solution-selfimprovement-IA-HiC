import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Project, User, UserState } from '../types/user';

const initialState: UserState = {
  currentUser: {
    id: '123',
    username: 'liheng',
    projects: []
  },
  loading: false,
  error: null
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    addProject: (state, action: PayloadAction<Project>) => {
      if (state.currentUser) {
        // Check if project with this ID already exists
        const existingProjectIndex = state.currentUser.projects.findIndex(p => p.id === action.payload.id);
        if (existingProjectIndex !== -1) {
          // Update existing project instead of adding duplicate
          state.currentUser.projects[existingProjectIndex] = action.payload;
        } else {
          // Add new project
          state.currentUser.projects.push(action.payload);
        }
      }
    },
    updateProject: (state, action: PayloadAction<{id: string, updates: Partial<Project>}>) => {
      if (state.currentUser) {
        const { id, updates } = action.payload;
        const projectIndex = state.currentUser.projects.findIndex(p => p.id === id);
        if (projectIndex !== -1) {
          state.currentUser.projects[projectIndex] = {
            ...state.currentUser.projects[projectIndex],
            ...updates
          };
        }
      }
    },
    removeProject: (state, action: PayloadAction<string>) => {
      if (state.currentUser) {
        state.currentUser.projects = state.currentUser.projects.filter(
          project => project.id !== action.payload
        );
      }
    },
    clearProjects: (state) => {
      if (state.currentUser) {
        state.currentUser.projects = [];
      }
    }
  }
});

export const { 
  setUser, 
  setLoading, 
  setError, 
  addProject, 
  updateProject, 
  removeProject,
  clearProjects 
} = userSlice.actions;

export default userSlice.reducer; 