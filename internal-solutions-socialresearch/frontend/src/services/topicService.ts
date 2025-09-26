import { TopicData, AnalysisFormData } from "../types/TopicModeling";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Async function that creates a job and returns the job ID
export const analyzeTopicsAsync = async (params: {
  subreddit: string;
  sort?: string;
  user_id?: string;
  project_id?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ job_id: string; status: string; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/topic-model/analyze-async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subreddit: params.subreddit,
      sort: params.sort || 'relevance',
      user_id: params.user_id || '123',
      project_id: params.project_id,
      keyword: params.keyword,
      startDate: params.startDate,
      endDate: params.endDate
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to start async topic analysis');
  }
  
  const jobData = await response.json();

  return jobData;
};

// Function to check the status of a job
export const getJobStatus = async (jobId: string | undefined): Promise<{
  job_id: string;
  status: string;
  message: string;
  progress?: number;
  analysis_id?: string;
  result?: TopicData;
  error?: string;
  created_at: string;
  updated_at: string;
}> => {
  if (!jobId) {
    throw new Error('Job ID is required');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/topic-model/job-status/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch job status: ${response.status}`);
  }
  
  const statusData = await response.json();
  
  return statusData;
};

// Function to cancel a job
export const cancelJob = async (jobId: string | undefined): Promise<{ job_id: string; status: string; message: string }> => {
  if (!jobId) {
    throw new Error('Job ID is required');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/topic-model/job/${jobId}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to cancel job: ${response.status}`);
  }
  
  const result = await response.json();
  
  return result;
};

// Function to cancel all jobs for a project
export const cancelJobsByProject = async (projectId: string | undefined): Promise<{ 
  project_id: string; 
  status: string; 
  message: string; 
  cancelled_job_count: number;
  cancelled_job_ids: string[];
}> => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/topic-model/project/${projectId}/cancel`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to cancel jobs for project: ${response.status}`);
  }
  
  const result = await response.json();
  
  return result;
};

// Function to get all jobs for a project
export const getJobsByProject = async (projectId: string | undefined): Promise<{
  project_id: string;
  jobs: Array<{
    job_id: string;
    user_id: string;
    status: string;
    message: string;
    progress?: number;
    error?: string;
    analysis_id?: string;
    created_at: string;
    updated_at: string;
    parameters: AnalysisFormData;
  }>;
  total_jobs: number;
}> => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/topic-model/jobs/project/${projectId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to get jobs for project: ${response.status}`);
  }
  
  const result = await response.json();
  
  return result;
};

export const getPostData = async (postIds: string[]) => {
  try {
    
    if (!postIds || postIds.length === 0) {
      return [];
    }
    
    const response = await fetch(`${API_BASE_URL}/api/llm-analyzer/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ post_ids: postIds }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch post data: ${response.status}`);
    }
    
    const data = await response.json();
    return data.posts || [];
  } catch {
    return [];
  }
};


