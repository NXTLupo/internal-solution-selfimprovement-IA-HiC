import { TopicData } from "../hooks/useTopicModeling";

const API_BASE_URL = 'http://localhost:8081';

// Async function that creates a job and returns the job ID
export const analyzeTopicsAsync = async (params: {
  subreddit: string;
  sort?: string;
  user_id?: string;
  project_id?: string;
  keyword?: string;
}): Promise<{ job_id: string; status: string; message: string }> => {
  console.log("topicService.analyzeTopicsAsync called with params:", params);
  console.log("Project ID being sent to backend:", params.project_id);
  
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
      keyword: params.keyword
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to start async topic analysis');
  }
  
  const jobData = await response.json();
  console.log("topicService received job data:", jobData);

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
}> => {
  if (!jobId) {
    throw new Error('Job ID is required');
  }
  
  console.log(`Checking status for job: ${jobId}`);
  
  const response = await fetch(`${API_BASE_URL}/api/topic-model/job-status/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch job status: ${response.status}`);
  }
  
  const statusData = await response.json();
  console.log(`Job status for ${jobId}:`, statusData);
  
  return statusData;
};

// Function to cancel a job
export const cancelJob = async (jobId: string | undefined): Promise<{ job_id: string; status: string; message: string }> => {
  if (!jobId) {
    throw new Error('Job ID is required');
  }
  
  console.log(`Cancelling job: ${jobId}`);
  
  const response = await fetch(`${API_BASE_URL}/api/topic-model/job/${jobId}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to cancel job: ${response.status}`);
  }
  
  const result = await response.json();
  console.log(`Cancel job result for ${jobId}:`, result);
  
  return result;
};

export const getSubredditStats = async (subreddit: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/llm-analyzer/subreddit-stats/${subreddit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch subreddit stats: ${response.status}`);
    }
    
    const data = await response.json();
    // console.log('Received stats:', data);
    return data;
  } catch (error) {
    console.error('Error fetching subreddit stats:', error);
    return { total_posts: 0, total_comments: 0 };
  }
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
  } catch (error) {
    console.error('Error fetching post data:', error);
    return [];
  }
};



