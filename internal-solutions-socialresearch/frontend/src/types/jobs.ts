/**
 * API types for asynchronous backend communication
 */

export interface AsyncJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  progress?: number;
  result?: unknown;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobSubmitResponse {
  job_id: string;
  status: 'pending';
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  message: string;
  progress?: number;
  result?: unknown;
  error?: string;
  analysis_id?: string;
  created_at?: string;
  updated_at?: string;
  parameters?: {
    subreddit?: string;
    query?: string;
    limit?: number;
    sort?: string;
    time?: string;
    application_name?: string;
    filter_type?: string;
    keyword?: string;
    merge_method?: string;
    chunk_size?: number;
    analysis_model?: string;
    max_workers?: number;
    project_id?: string;
  };
} 