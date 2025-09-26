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
  // Add date range properties that come from the API
  startDate?: string;
  endDate?: string;
  // Add job-related properties
  is_processing?: boolean;
  job_status?: {
    job_id: string;
    status: string;
    message: string;
    progress?: number;
    created_at: string;
    updated_at: string;
    error?: string;
  };
  parameters?: {
    subreddit?: string;
    num_posts?: number;
    max_comments_per_post?: number;
    index_in_pgvector?: boolean;
    sort?: string;
    project_id?: string;
    keyword?: string;
    summary_limit?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    [key: string]: string | number | boolean | null | undefined; // Allow for additional parameters
  };
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