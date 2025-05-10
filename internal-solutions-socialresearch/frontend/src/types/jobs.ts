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
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  progress?: number;
  result?: unknown;
  error?: string;
} 