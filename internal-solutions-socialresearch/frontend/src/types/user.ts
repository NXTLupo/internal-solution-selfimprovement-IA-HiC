//define all user types here
import { TopicData } from './TopicModeling';
import { AnalysisData } from './analysis';

export interface Project {
  id: string;
  name: string;
  type: 'sentiment' | 'topic';
  created_at: string;
  sources: number;
  data?: TopicData | AnalysisData | Record<string, unknown>;
  // Add properties from backend RedditAnalysisResult model
  subreddit?: string;
  topic?: string;
  post_count?: number;
  sort_by?: string;
  time_period?: string;
}

export interface User {
  id: string;
  username: string;
  projects: Project[];
}

export interface UserState {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}