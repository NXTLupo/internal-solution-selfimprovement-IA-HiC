import { store } from '../store/store';
import { JobSubmitResponse, JobStatusResponse } from '../types/jobs';
import { Point, Category } from '../types/analysis';

const API_BASE_URL = 'http://localhost:8081'

interface AnalysisResponse {
  status: string;
  search_id: string;
  parameters: {
    timeframe: string;
    limit: number;
  };
}

export interface SentimentAnalysisResponse {
  merged_result: {
    positive: Category[];
    negative: Category[];
  };
  formatted_data: {
    [key: string]: string;
  };
}

export interface SearchParams {
  subreddit: string;
  query: string;
  limit?: number;
  sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}

export interface AISummaryResponse {
  summary: string;
  topPositive: string;
  topNegative: string;
  recommendations: string[];
}

export interface AnalysisOptions {
  filterType: string;
  keyword: string;
  mergeMethod: string;
  chunkSize: number;
  model: string;
  maxWorkers: number;
  projectId?: string;
  limit?: number;
  sort?: string;
  time?: string;
}

// Using the types from api.ts instead of these local interfaces
export type { JobSubmitResponse, JobStatusResponse };

export const analyzeSubreddit = async ({
  subreddit,
  query,
  limit = 5,
  sort = 'relevance',
  time = 'all'
}: SearchParams): Promise<AnalysisResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/llm-analyzer/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subreddit,
      query,
      limit,
      sort,
      time,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to search subreddit');
  }

  return response.json();
};

export const analyzeSentiment = async (
  searchId: string,
  applicationName: string,
  options: AnalysisOptions,
): Promise<JobSubmitResponse> => {
  // 2026-11-16: the search-id route (`/analyze-sentiment/<searchId>`) is a stub that never starts an analysis and
  // never creates its job row, so every status check returned "Job not found". The route below creates the job and
  // runs the analysis (it fetches the posts itself from subreddit, query, limit, sort and time).
  const endpoint = `${API_BASE_URL}/api/llm-analyzer/analyze-sentiment`;

  // Get subreddit and query from Redux store
  const state = store.getState();
  const subreddit = state.sentimentAnalysis.subreddit;
  const query = state.sentimentAnalysis.applicationName || applicationName;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        application_name: applicationName,
        subreddit: subreddit,  // ADD subreddit from Redux
        query: query,          // ADD query from Redux
        search_id: searchId,
        limit: options.limit,
        sort: options.sort,
        time: options.time,
        filter_type: options.filterType,
        keyword: options.keyword,
        merge_method: options.mergeMethod,
        chunk_size: options.chunkSize,
        analysis_model: options.model,
        max_workers: options.maxWorkers,
        user_id: '123',
        project_id: options.projectId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw error;
  }
};

export const getSentimentJobStatus = async (
  jobId: string
): Promise<JobStatusResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/llm-analyzer/job-status/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error getting job status:', error);
    throw error;
  }
};

export const getAISummary = async (
  analysisData: {
    positive: Category[];
    negative: Category[];
  }
): Promise<AISummaryResponse> => {
  try {
    // Get application name from Redux store
    const state = store.getState();
    const applicationName = state.sentimentAnalysis.applicationName;

    // Simplify data structure to only include categories and points
    const simplifiedData = {
      positive: analysisData.positive.map(category => ({
        category: category.category,
        points: category.points.map((point: Point) => ({
          point: point.point,
          frequency: point.frequency
        }))
      })),
      negative: analysisData.negative.map(category => ({
        category: category.category,
        points: category.points.map((point: Point) => ({
          point: point.point,
          frequency: point.frequency
        }))
      })),
      applicationName: applicationName // Include application name in the request
    };

    const response = await fetch(`${API_BASE_URL}/api/llm-analyzer/ai-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisData: simplifiedData
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get AI summary');
    }

    return response.json();
  } catch (error) {
    console.error('Error getting AI summary:', error);
    return {
      summary: "Unable to generate AI summary at this time.",
      topPositive: "Could not analyze positive feedback.",
      topNegative: "Could not analyze negative feedback.",
      recommendations: [
        "Try again later for AI-powered recommendations."
      ]
    };
  }
};

export const getAISummaryByProjectId = async (
  projectId: string,
  llmProvider?: 'openai' | 'claude' | 'gemini'
): Promise<AISummaryResponse> => {
  try {
    const qp = llmProvider ? `?llm_provider=${encodeURIComponent(llmProvider)}` : '';
    const url = `${API_BASE_URL}/api/llm-analyzer/ai-summary/${projectId}${qp}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[getAISummaryByProjectId] Error response: ${errorText}`);
      throw new Error(`Failed to get AI summary: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[getAISummaryByProjectId] Error:', error);
    return {
      summary: "Unable to generate AI summary at this time.",
      topPositive: "Could not analyze positive feedback.",
      topNegative: "Could not analyze negative feedback.",
      recommendations: [
        "Try again later for AI-powered recommendations."
      ]
    };
  }
};

export const regenerateAISummary = async (
  analysisData: {
    positive: Category[];
    negative: Category[];
  },
  projectId: string,
  llmProvider?: 'openai' | 'claude' | 'gemini'
): Promise<AISummaryResponse> => {
  try {
    // Get application name from Redux store
    const state = store.getState();
    const applicationName = state.sentimentAnalysis.applicationName;

    // Simplify data structure to only include categories and points
    const simplifiedData = {
      positive: analysisData.positive.map(category => ({
        category: category.category,
        points: category.points.map((point: Point) => ({
          point: point.point,
          frequency: point.frequency
        }))
      })),
      negative: analysisData.negative.map(category => ({
        category: category.category,
        points: category.points.map((point: Point) => ({
          point: point.point,
          frequency: point.frequency
        }))
      })),
      applicationName: applicationName
    };

    const qp = llmProvider ? `?llm_provider=${encodeURIComponent(llmProvider)}` : '';
    const response = await fetch(`${API_BASE_URL}/api/llm-analyzer/ai-summary${qp}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisData: simplifiedData,
        projectId: projectId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to regenerate AI summary');
    }

    return response.json();
  } catch (error) {
    console.error('Error regenerating AI summary:', error);
    return {
      summary: "Unable to generate AI summary at this time.",
      topPositive: "Could not analyze positive feedback.",
      topNegative: "Could not analyze negative feedback.",
      recommendations: [
        "Try again later for AI-powered recommendations."
      ]
    };
  }
}; 
